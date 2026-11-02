/**
 * **La bajada del tercer capítulo, en la mesa**: el JAZ 110 con el modelo de
 * Guyrami, su tripulación y el plan de verdad, del crucero a tocar, sobre un
 * suelo plano y sin navegador. Es lo mismo que vuela el banco
 * `scripts/verificar-inicio-4.mjs` en el mundo de verdad, y tarda un segundo en
 * vez de veinte minutos.
 *
 * Existe porque esto se rompió sin ruido: con el atajo del automático para no
 * picar —ver `POR_DELANTE` en `ruta.ts`— el avión se quedaba colgado por encima
 * de la senda desde el primer minuto, bajando a setecientos pies por minuto, y
 * llegaba a la pista a treinta mil pies.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { dondeCae } from "../world/entre-aerodromos";
import { PARAGUAY } from "../world/procedimientos-paraguay";
import { AIRCRAFT } from "./aircraft";
import { ArcadeFlightModel } from "./arcade";
import { temperaturaExterior, velocidadDelSonido } from "./atmosphere";
import { masaConCombustible, quemaPorSegundo, reservaEnKilos } from "./combustible";
import { neutralControls } from "./model";
import { laRecogidaDe } from "./recogida";
import { rutaDe, Seguimiento, type Fijo } from "./ruta";
import { dondeVa, entradaDeLaLlegada, horarioDelDia, perfilDelVuelo, PETTIROSSI } from "./ruta-larga";
import { caminoEnElMundo, cargaDelVueloLargo, DEJA_LA_ORTODROMICA, enElMundo, estadoDelSalto, quemadoEnElVuelo, resistenciaEnVuelo } from "./salto-bajo-tapa";
import { EMPUJE, empujeQueSeQuema, enLosMandosDeLinea, VueloDeLinea, type LecturaDeLinea } from "./vuelo-de-linea";

const DT = 1 / 30;
const GRADO = Math.PI / 180;
const PIE = 0.3048;
const NUDO = 1852 / 3600;
/** Desde dónde se mira que la velocidad sea la pedida, m hasta la pista. */
const DESDE_PARA_LA_VELOCIDAD = 25_000;
const AVION = AIRCRAFT.find((x) => x.id === "jaz-110")!;
const CRUCERO = 40_000 * PIE;
const COTA = PETTIROSSI.elevacion;
/** La cabecera de la 02 y su eje, del aeródromo del juego. */
const UMBRAL = { x: -351, z: 1603.8 };
const EJE = 12.37 * GRADO;

interface Muestra {
  readonly t: number;
  readonly falta: number;
  readonly altitud: number;
  readonly senda: number | null;
  readonly vertical: number;
  readonly velocidad: number;
}

/** Lo que le falta a la velocidad para la pedida en lo peor del tramo, y dónde. */
interface LoPeor {
  readonly falta: number;
  readonly velocidad: number;
  readonly pedida: number;
}

function volar(masa?: number): {
  readonly muestras: readonly Muestra[];
  readonly bajaEn: number | null;
  readonly toque: { readonly t: number; readonly caida: number; readonly pasado: number; readonly lado: number } | null;
  /** Lo que queda en los depósitos al tocar, o al acabarse el vuelo sin tocar, kg. */
  readonly kilos: number;
  /** Lo que faltaba hasta la pista cuando se pararon los motores, m, o `null` si no se pararon. */
  readonly paradosA: number | null;
  /** Lo más por debajo de la velocidad pedida que se fue desde `DESDE_PARA_LA_VELOCIDAD`. */
  readonly loPeor: LoPeor | null;
  /** Lo que se quemó de media volando el crucero, kg/s, o `null` si no se contó. */
  readonly quemaEnCrucero: number | null;
} {
  const perfil = perfilDelVuelo(horarioDelDia(new Date("2026-12-15T12:00:00Z")));
  const entrada = entradaDeLaLlegada(perfil);
  const d = dondeVa(perfil, entrada);
  const origen = { lat: PETTIROSSI.lat, lon: PETTIROSSI.lon };
  const inicio = enElMundo(perfil, origen, d.recorrido);
  const camino = caminoEnElMundo(perfil, origen, d.recorrido)
    .filter((q, i) => i === 0 || q.recorrido < perfil.ruta.distancia - DEJA_LA_ORTODROMICA)
    .map((q): Fijo => ({ x: q.x, z: q.z, nombre: "", papel: "ruta", minima: null }));
  // MULSO, que es por donde acaba la llegada publicada a la 02.
  const rama = PARAGUAY.SGAS!.aproximaciones["02"]!.ramas[1]!.map((f): Fijo => ({
    ...dondeCae(origen, f),
    nombre: f.nombre,
    papel: f.papel,
    minima: f.minimaPies === null ? null : f.minimaPies * PIE,
  }));
  const umbral: Fijo = { ...UMBRAL, nombre: "RW02", papel: "umbral", minima: null };
  const ruta = rutaDe([...camino, ...rama, umbral], COTA);
  const plan = new Seguimiento();
  plan.poner(ruta, CRUCERO, AVION);
  const m = new ArcadeFlightModel({ aircraft: AVION, ground: () => COTA });
  m.reset({ position: new Vector3(inicio.x, d.altitud, inicio.z), heading: inicio.rumbo, airspeed: d.velocidad, equilibrado: true });
  /*
   * **El depósito, el de la cuenta del vuelo**, como `entrarEnElPerfil` en `game.ts`.
   * Con una masa pedida se mira la toma de un avión que pesa eso, y el depósito no
   * pinta: esa prueba no va de lo que queda.
   */
  let kilos = estadoDelSalto(perfil, entrada, AVION, { en: 0, kilos: cargaDelVueloLargo(AVION, perfil) }).combustible;
  m.ponerMasa(masa ?? masaConCombustible(AVION, kilos));
  const c = { ...neutralControls(), engineOn: true, throttle: m.gasPara(d.velocidad, { flaps: 0, tren: 0 }), tren: 0, flaps: 0 };
  const tripulacion = new VueloDeLinea({
    vr: AVION.rotationSpeed,
    vref: AVION.approachSpeed,
    alturaDeLaRecogida: laRecogidaDe(AVION).nariz,
    alturaDelGas: laRecogidaDe(AVION).gas,
    reversa: true,
    trenQueSeMete: true,
  });
  tripulacion.ponerEnCrucero(d.velocidad, d.altitud);
  const [ux, uz] = [Math.sin(EJE), -Math.cos(EJE)];
  const muestras: Muestra[] = [];
  let bajaEn: number | null = null;
  let paradosA: number | null = null;
  let loPeor: LoPeor | null = null;
  const enCruceroMedido = { kilos: 0, tiempo: 0 };
  for (let t = 0, siguiente = 0; t < 3600; t += DT) {
    const s = m.state;
    const lectura = {
      x: s.position.x,
      z: s.position.z,
      altitud: s.position.y,
      vertical: s.velocity.y,
      aire: Math.max(s.airspeed, 1),
      enTierra: s.onGround,
      viento: null,
    };
    if (plan.paso(lectura).descenso) bajaEn = t;
    const [dx, dz] = [s.position.x - UMBRAL.x, s.position.z - UMBRAL.z];
    const pasado = dx * ux + dz * uz;
    const lado = dx * -uz + dz * ux;
    m.setOnRunway(pasado > 0 && pasado < 3400 && Math.abs(lado) < 25);
    const enLaFinal = !s.onGround && plan.enElTramoFinal(lectura);
    // Lo mismo que `lecturaDeLaTripulacion` en `game.ts`: la senda de verdad, sin el atajo.
    const desvio = plan.bajando ? plan.desvioDeLaSenda(lectura) : null;
    const senda = !plan.bajando ? null : desvio ? s.position.y - desvio.metros : plan.alturaParaElAutomatico(lectura);
    const hasta = ruta.fijos[plan.indice];
    const desde = ruta.fijos[plan.indice - 1];
    const l: LecturaDeLinea = {
      enTierra: s.onGround,
      enPista: false,
      x: s.position.x,
      z: s.position.z,
      rumbo: s.heading,
      velocidad: s.airspeed,
      porElSuelo: s.groundSpeed,
      altitud: s.position.y,
      altura: Math.max(0, s.heightAboveGround - AVION.gearHeight),
      vertical: s.verticalSpeed,
      motor: true,
      flaps: c.flaps,
      tren: c.tren,
      fase: "en-vuelo",
      autorizado: false,
      raya: [],
      pista: { rumbo: EJE, lado, queda: 3400 - pasado },
      tramo: desde && hasta ? { desde, hasta, recta: false } : null,
      alturaPedida: senda ?? CRUCERO,
      ritmoPedido: senda !== null ? (plan.ritmoParaElAutomatico(lectura) ?? 0) : 0,
      faltaParaTocar: plan.progreso?.restante ?? Infinity,
      enLaFinal,
      localizador: enLaFinal ? EJE + Math.max(-Math.PI / 6, Math.min(Math.PI / 6, -Math.atan(lado / 1500))) : null,
      senda: enLaFinal
        ? { altitud: COTA + Math.max(0, 300 - pasado) * Math.tan(3 * GRADO), ritmo: -s.groundSpeed * Math.tan(3 * GRADO) }
        : null,
      cotaDelCampo: COTA,
    };
    const manos = tripulacion.paso(DT, l, { arrancar: true, rodar: true, entrar: true, despegar: true });
    const mandos = enLosMandosDeLinea(manos, m, { porElSuelo: s.groundSpeed, sacado: { flaps: c.flaps, tren: c.tren } });
    c.throttle = mandos.throttle;
    c.elevator = mandos.elevator ?? 0;
    c.aileron = mandos.aileron ?? 0;
    c.rudder = mandos.rudder ?? 0;
    c.brakes = mandos.brakes;
    c.reversa = mandos.reversa;
    c.flaps += Math.max(-DT / 9, Math.min(DT / 9, manos.flaps - c.flaps));
    c.tren += Math.max(-DT / 8, Math.min(DT / 8, (manos.tren ? 1 : 0) - c.tren));
    /*
     * Hasta la recogida: ahí el gas sale con la altura —ver `fraccion`— y la
     * velocidad pedida deja de ser lo que se lleva. Lo que se pierde al recoger es
     * de la toma, no de este fallo.
     */
    if (
      !s.onGround &&
      tripulacion.estado.tramo !== "recogida" &&
      l.faltaParaTocar < DESDE_PARA_LA_VELOCIDAD &&
      (!loPeor || s.airspeed - manos.velocidad < loPeor.velocidad - loPeor.pedida)
    )
      loPeor = { falta: l.faltaParaTocar, velocidad: s.airspeed, pedida: manos.velocidad };
    m.step(DT, c);
    /*
     * **Lo que se quema**, con lo mismo que `quemarCombustible` en `game.ts`: y sin
     * combustible, el motor se para. Esto es lo que faltaba aquí para ver el fallo:
     * con el depósito sin contar, esta prueba volaba bien lo que en el banco era
     * un planeo sin motores desde los veintiséis kilómetros.
     */
    if (masa === undefined) {
      const q = m.state;
      const enCrucero = tripulacion.estado.tramo === "crucero";
      const antes = kilos;
      if (c.engineOn)
        kilos = Math.max(
          0,
          kilos -
            quemaPorSegundo(AVION, empujeQueSeQuema(m, manos, enCrucero ? resistenciaEnVuelo(AVION, q.position.y, q.airspeed, kilos) : null), {
              mach: q.airspeed / velocidadDelSonido(q.position.y),
              theta: (temperaturaExterior(q.position.y) + 273.15) / 288.15,
            }) *
              DT,
        );
      if (enCrucero) {
        enCruceroMedido.kilos += antes - kilos;
        enCruceroMedido.tiempo += DT;
      }
      m.ponerMasa(masaConCombustible(AVION, kilos));
      if (kilos <= 0 && c.engineOn) {
        c.engineOn = false;
        paradosA = l.faltaParaTocar;
      }
    }
    if (t >= siguiente) {
      siguiente = t + 30;
      muestras.push({ t, falta: l.faltaParaTocar, altitud: s.position.y, senda, vertical: s.verticalSpeed, velocidad: s.airspeed });
    }
    const e = tripulacion.estado;
    const quemaEnCrucero = (): number | null => (enCruceroMedido.tiempo > 0 ? enCruceroMedido.kilos / enCruceroMedido.tiempo : null);
    if (e.tocado)
      return { muestras, bajaEn, toque: { t, caida: e.caidaAlTocar ?? Infinity, pasado, lado }, kilos, paradosA, loPeor, quemaEnCrucero: quemaEnCrucero() };
  }
  return { muestras, bajaEn, toque: null, kilos, paradosA, loPeor, quemaEnCrucero: null };
}

describe("la bajada desde cuarenta mil pies", () => {
  const vuelo = volar();

  it("empieza a bajar sola, en su punto de descenso", () => {
    expect(vuelo.bajaEn).not.toBeNull();
    expect(vuelo.bajaEn!).toBeGreaterThan(10 * 60);
    expect(vuelo.bajaEn!).toBeLessThan(18 * 60);
  });

  it("baja de verdad: de lo alto a los diez mil pies, a más de mil quinientos pies por minuto", () => {
    const arriba = vuelo.muestras.filter((x) => x.senda !== null && x.altitud > 12_000 * PIE && x.altitud < 38_000 * PIE);
    expect(arriba.length).toBeGreaterThan(10);
    for (const x of arriba) expect(x.vertical / PIE).toBeLessThan(-1500 / 60);
  });

  it("no frena de golpe al empezar a bajar: pierde la velocidad con la altura", () => {
    const b = vuelo.muestras.find((x) => x.senda !== null && x.altitud < 36_000 * PIE);
    expect(b!.velocidad).toBeGreaterThan(200);
  });

  it("encuentra la senda antes de la aproximación: a unos cuarenta kilómetros ya va por ella", () => {
    const cerca = vuelo.muestras.find((x) => x.falta < 40_000);
    expect(Math.abs(cerca!.altitud - cerca!.senda!)).toBeLessThan(200);
  });

  it("y toca en la pista, a menos de tres metros por segundo", () => {
    const t = vuelo.toque;
    expect(t).not.toBeNull();
    expect(t!.caida).toBeLessThan(3);
    expect(t!.pasado).toBeGreaterThan(0);
    expect(t!.pasado).toBeLessThan(1000);
    expect(Math.abs(t!.lado)).toBeLessThan(10);
  });

  it("llega con los motores en marcha y por encima de la reserva", () => {
    console.log(`al tocar: ${vuelo.kilos.toFixed(0)} kg · reserva ${reservaEnKilos(AVION).toFixed(0)} kg · parados a ${vuelo.paradosA}`);
    expect(vuelo.paradosA).toBeNull();
    expect(vuelo.kilos).toBeGreaterThan(reservaEnKilos(AVION));
  });

  it("y desde los veinticinco kilómetros hasta la recogida no baja de la velocidad pedida menos diez nudos", () => {
    const p = vuelo.loPeor!;
    console.log(`lo peor: ${(p.velocidad / NUDO).toFixed(1)} kt pidiendo ${(p.pedida / NUDO).toFixed(1)} kt a ${(p.falta / 1000).toFixed(2)} km`);
    expect(p.velocidad - p.pedida).toBeGreaterThan(-10 * NUDO);
  });

  it("con los tanques casi vacíos, que es como llega de verdad, lo mismo", () => {
    const ligero = volar(150_000);
    console.log(ligero.muestras.slice(-8).map((x) => `${(x.falta / 1000).toFixed(1)} km ${(x.velocidad / 0.5144).toFixed(0)} kt`).join(" · "));
    expect(ligero.toque).not.toBeNull();
    expect(ligero.toque!.caida).toBeLessThan(3);
    expect(ligero.toque!.pasado).toBeGreaterThan(0);
  });
});

/**
 * **Lo que quema el crucero**, con la cuenta que vuela `game.ts` y contra la que
 * cuenta el plan, `quemadoEnElVuelo`. Sale de los dos extremos del capítulo 2 y del
 * 3: el nivel 360, cargado, al pasar por Canarias, y el 400, ligero, ya sobre el
 * Paraguay.
 */
describe("lo que quema el crucero", () => {
  const perfil = perfilDelVuelo(horarioDelDia(new Date("2026-12-15T12:00:00Z")));
  const carga = cargaDelVueloLargo(AVION, perfil);
  const DIEZ_MINUTOS = 600;
  const quemaAqui = (t: number, conLaResistencia: boolean): { readonly vuelo: number; readonly plan: number } => {
    const d = dondeVa(perfil, t);
    const kilos = carga - quemadoEnElVuelo(AVION, perfil, 0, t, carga);
    const m = new ArcadeFlightModel({ aircraft: AVION, ground: () => 0 });
    m.reset({ position: new Vector3(0, d.altitud, 0), heading: d.rumbo, airspeed: d.velocidad, equilibrado: true });
    m.ponerMasa(masaConCombustible(AVION, kilos));
    const s = m.state;
    const empuje = empujeQueSeQuema(
      m,
      { empuje: EMPUJE.subida },
      conLaResistencia ? resistenciaEnVuelo(AVION, s.position.y, s.airspeed, kilos) : null,
    );
    return {
      vuelo: quemaPorSegundo(AVION, empuje, {
        mach: s.airspeed / velocidadDelSonido(s.position.y),
        theta: (temperaturaExterior(s.position.y) + 273.15) / 288.15,
      }),
      plan: quemadoEnElVuelo(AVION, perfil, t, t + DIEZ_MINUTOS, kilos) / DIEZ_MINUTOS,
    };
  };

  it.each([
    ["el nivel 360, sobre Canarias", 2.2 * 3600],
    ["el nivel 400, sobre el Paraguay", entradaDeLaLlegada(perfil)],
  ])("en %s, lo que cuenta el plan, ±15 %%", (_que, t) => {
    const { vuelo, plan } = quemaAqui(t, true);
    console.log(`${_que}: ${(vuelo * 3.6).toFixed(2)} t/h volando · ${(plan * 3.6).toFixed(2)} t/h en el plan`);
    expect(vuelo / plan).toBeGreaterThan(0.85);
    expect(vuelo / plan).toBeLessThan(1.15);
  });

  // El instrumento, antes de fiarse de él: con el escalón de lo que se oye, se ve de más.
  it("y con el escalón de subida de lo que se oye, que es lo de antes, se pasaba", () => {
    const { vuelo, plan } = quemaAqui(entradaDeLaLlegada(perfil), false);
    expect(vuelo / plan).toBeGreaterThan(1.5);
  });

  it("volando de verdad el crucero del tercer capítulo, también", () => {
    const { quemaEnCrucero } = volar();
    const kilos = carga - quemadoEnElVuelo(AVION, perfil, 0, entradaDeLaLlegada(perfil), carga);
    const plan = quemadoEnElVuelo(AVION, perfil, entradaDeLaLlegada(perfil), entradaDeLaLlegada(perfil) + DIEZ_MINUTOS, kilos) / DIEZ_MINUTOS;
    expect(quemaEnCrucero).not.toBeNull();
    expect(quemaEnCrucero! / plan).toBeGreaterThan(0.85);
    expect(quemaEnCrucero! / plan).toBeLessThan(1.15);
  });
});

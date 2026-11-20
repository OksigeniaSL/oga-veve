/**
 * **El salto de Los Rodeos a La Palma, con crucero** (H38h): el JAZ 90 con su
 * tripulación de línea, el modelo sencillo y el plan que traza el juego sobre el
 * relieve de verdad, de la pista de salida a la final, sin navegador. Es el vuelo
 * de la tercera escena del modo inicio —`scripts/verificar-inicio-3.mjs`—, que
 * tarda cuarenta minutos; aquí, unos segundos.
 *
 * Existe porque esto se rompió sin ruido: el plan contaba la subida a dos millas
 * por cada mil pies, y desde que la tripulación sube a la indicada de su tipo
 * (H38f y H38g) cada mil pies se come dos y media. Con el nivel que salía —FL190,
 * elegido con una subida de cinco mil pies por minuto que nadie vuela— el punto de
 * descenso llegaba antes que el nivel, y la escena se quedaba sin el «ya estamos
 * arriba», sin el servicio y sin lo que cuelga de ellos.
 *
 * **Lo que la escena necesita arriba**, contado en su guion
 * (`guion-tenerife-la-palma.ts` y `motor-del-pasaje.ts`): dos segundos nivelado
 * antes del «ya estamos arriba» (`ARRIBA_Y_NIVELADO`), los cinco que dura, tres
 * hasta el servicio (`HASTA_EL_SERVICIO`) y, para que Ara pueda ir al baño con la
 * luz apagada, veinticinco de crucero por delante (`LO_QUE_PIDE_EL_BANO`): unos
 * treinta y cinco segundos, lo que daba el banco cuando pasaba. Sin margen
 * ninguno: cualquier frase que espere su turno lo tira. Aquí se pide un minuto,
 * que es lo que el guion cuenta que dura un crucero entre islas.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT } from "./aircraft";
import { ArcadeFlightModel } from "./arcade";
import { indicadaDe, velocidadDelSonido } from "./atmosphere";
import { neutralControls } from "./model";
import { distanciaDeSubida } from "./nivel-que-ahorra";
import { laRecogidaDe } from "./recogida";
import { finalDeLaRuta, perfilDeLaBajada, Seguimiento, velocidadesDeLaBajada, type Ruta } from "./ruta";
import { arribaDe, enLosMandosDeLinea, VueloDeLinea, type LecturaDeLinea, type TramoDeLinea } from "./vuelo-de-linea";
import { distanciaDelPerfil } from "./ruta";
import { desplazarAerodromo } from "../world/aerodromo-desplazado";
import { campoDeCasa, campoVecino, enLaPistaDe, type CampoEnElMundo } from "../world/campo-del-vuelo";
import { dondeCae } from "../world/entre-aerodromos";
import { TIEMPO_DE_CASA, type Meteo } from "../world/meteo";
import { relieveDe } from "../world/relieve-en-disco";
import { cruceroDelTramo, rutaDelTramo, type DelJuego } from "../world/ruta-del-tramo";
import { conViento, SCENARIOS, type Scenario } from "../world/scenarios";
import { cabeceraEnUso } from "../world/terrain";

const DT = 1 / 30;
const PIE = 0.3048;
const MILLA = 1852;
const GRADO = Math.PI / 180;
const JAZ_90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;
/** Lo que la escena necesita de crucero, s. Ver la cabecera. */
const CRUCERO_QUE_HACE_FALTA = 60;
/** Lo que se sale por encima de la senda bajando, como mucho, m. */
const POR_ENCIMA_DE_LA_SENDA = 120;
/** Y desde dónde se mira, m hasta el umbral: lo de antes es coger la senda. */
const MIRA_LA_SENDA_DESDE = 40_000;

const por = (id: string): Scenario => SCENARIOS.find((e) => e.id === id)!;

/** El viento que pone en uso esa cabecera: de frente a ella, quince nudos. Como `rutas-de-canarias.test.ts`. */
function vientoPara(e: Scenario, cabecera: string): Meteo {
  const pista = e.aerodrome!.runways[0]!;
  const u = pista.thresholds[cabecera]!.xy!;
  const otro = Object.entries(pista.thresholds).find(([n, v]) => n !== cabecera && v?.xy)![1]!.xy!;
  const rumbo = ((Math.atan2(otro[0] - u[0], otro[1] - u[1]) / GRADO) + 360) % 360;
  return { ...TIEMPO_DE_CASA, vientoDe: Math.round(rumbo), vientoKt: 15 };
}

interface Tramo {
  readonly salida: CampoEnElMundo;
  readonly llegada: CampoEnElMundo;
  readonly ruta: Ruta;
  readonly crucero: number;
}

/** El plan de Los Rodeos a La Palma por esas cabeceras, como lo traza el juego. */
function tramo(cs: string, cl: string): Tramo {
  const sal = por("tenerife-norte");
  const lle = por("la-palma");
  const origen = sal.aerodrome!.origin;
  const salida = campoDeCasa(conViento(sal, vientoPara(sal, cs)));
  const d = dondeCae(origen, lle.aerodrome!.origin);
  const llegada = campoVecino(lle, d, desplazarAerodromo(lle.aerodrome!, d.x, d.z), vientoPara(lle, cl));
  expect(cabeceraEnUso(salida.escenario)).toBe(cs);
  expect(cabeceraEnUso(llegada.escenario)).toBe(cl);
  const juego: DelJuego = {
    origen,
    enElAire: null,
    cotaDePista: (campo) => campo.escenario.aerodrome?.elevationM ?? 0,
    cota: relieveDe(["tenerife-norte", "la-palma", "la-gomera"], origen),
    techo: JAZ_90.alturaDeCrucero,
    ficha: JAZ_90,
  };
  const ruta = rutaDelTramo(salida, llegada, juego);
  return { salida, llegada, ruta, crucero: cruceroDelTramo(ruta, salida, juego) };
}

interface Vuelo {
  /** Cuándo pasó la tripulación a cada tramo, s. */
  readonly tramos: ReadonlyArray<{ readonly tramo: TramoDeLinea; readonly t: number }>;
  /** La altitud al nivelar, m, y lo recorrido por el aire hasta ahí, m. */
  readonly nivela: { readonly altitud: number; readonly recorrido: number } | null;
  /** Lo que el plan contaba recorrer hasta su T/C al empezar, m. */
  readonly tcDelPlan: number | null;
  /** Cuándo saltó el punto de descenso del plan, s, y a cuánto del umbral, m. */
  readonly td: { readonly t: number; readonly falta: number } | null;
  /** Lo más por encima de la senda bajando, desde `MIRA_LA_SENDA_DESDE`, m. */
  readonly porEncima: number;
  /** Lo más por debajo, m. */
  readonly porDebajo: number;
}

/** Vuela el plan con la tripulación de línea, desde el final de la pista de salida. */
function volar(t0: Tramo): Vuelo {
  const { ruta, crucero, salida, llegada } = t0;
  const avion = JAZ_90;
  const cotaSalida = salida.escenario.aerodrome!.elevationM ?? 0;
  const cotaLlegada = llegada.escenario.aerodrome!.elevationM ?? 0;
  const plan = new Seguimiento();
  plan.poner(ruta, crucero, avion);
  const [sx, sz] = enLaPistaDe(salida, 0);
  // Llano a la cota de cada campo: lo que mira la tripulación es la altura sobre su pista.
  const suelo = (x: number, z: number): number => (Math.hypot(x - sx, z - sz) < 20_000 ? cotaSalida : cotaLlegada);
  const m = new ArcadeFlightModel({ aircraft: avion, ground: suelo });
  const a = ruta.fijos[0]!;
  const b = ruta.fijos[1]!;
  const rumbo = Math.atan2(b.x - a.x, -(b.z - a.z));
  const v0 = avion.rotationSpeed + 20 * (1852 / 3600);
  m.reset({ position: new Vector3(a.x, cotaSalida + 120, a.z), heading: rumbo, airspeed: v0, equilibrado: true });
  const c = { ...neutralControls(), engineOn: true, throttle: 1, tren: 0, flaps: 0 };
  const tripulacion = new VueloDeLinea({
    vr: avion.rotationSpeed,
    vref: avion.approachSpeed,
    alturaDeLaRecogida: laRecogidaDe(avion).nariz,
    alturaDelGas: laRecogidaDe(avion).gas,
    reversa: true,
    trenQueSeMete: true,
    arriba: arribaDe(avion),
  });
  (tripulacion as unknown as { pasarA(t: TramoDeLinea): void }).pasarA("subida");
  const tramos: Array<{ tramo: TramoDeLinea; t: number }> = [{ tramo: "subida", t: 0 }];
  let nivela: Vuelo["nivela"] = null;
  let tcDelPlan: number | null = null;
  let td: Vuelo["td"] = null;
  let porEncima = -Infinity;
  let porDebajo = Infinity;
  let recorrido = 0;
  const [ux, uz] = [Math.sin(llegada.pista.heading * GRADO), -Math.cos(llegada.pista.heading * GRADO)];
  const umbral = ruta.fijos[ruta.fijos.length - 1]!;
  for (let t = 0; t < 3000; t += DT) {
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
    if (plan.paso(lectura).descenso) td = { t, falta: plan.progreso!.restante };
    /*
     * El T/C del plan, en lo que se recorre hasta él: el avión no vuela las
     * esquinas de la ruta —saliendo por la 12 da la vuelta entera hacia el oeste,
     * y el viraje se come unos kilómetros que la ruta no cuenta—, pero lo que
     * recorre por el aire subiendo es lo que cuenta el plan.
     */
    if (t === 0 && plan.progreso?.puntoDeSubida) tcDelPlan = distanciaDeSubida(avion, s.position.y, crucero);
    const enLaFinal = !s.onGround && plan.enElTramoFinal(lectura);
    const desvio = plan.bajando ? plan.desvioDeLaSenda(lectura) : null;
    const senda = !plan.bajando ? null : desvio ? s.position.y - desvio.metros : plan.alturaParaElAutomatico(lectura);
    const [dx, dz] = [s.position.x - umbral.x, s.position.z - umbral.z];
    const pasado = dx * ux + dz * uz;
    const lado = dx * -uz + dz * ux;
    const hasta = ruta.fijos[plan.indice];
    const desde = ruta.fijos[plan.indice - 1];
    const l: LecturaDeLinea = {
      enTierra: s.onGround,
      enPista: false,
      x: s.position.x,
      z: s.position.z,
      rumbo: s.heading,
      velocidad: s.airspeed,
      indicada: indicadaDe(s, m.aireDelDia()),
      mach: s.airspeed / velocidadDelSonido(s.position.y, m.aireDelDia()),
      porElSuelo: s.groundSpeed,
      altitud: s.position.y,
      altura: Math.max(0, s.heightAboveGround - avion.gearHeight),
      vertical: s.verticalSpeed,
      motor: true,
      flaps: c.flaps,
      tren: c.tren,
      fase: "en-vuelo",
      autorizado: false,
      raya: [],
      pista: { rumbo: llegada.pista.heading * GRADO, lado, queda: llegada.pista.length - pasado },
      tramo: desde && hasta ? { desde, hasta, recta: false } : null,
      alturaPedida: senda ?? crucero,
      ritmoPedido: senda !== null ? (plan.ritmoParaElAutomatico(lectura) ?? 0) : 0,
      faltaParaTocar: plan.progreso?.restante ?? Infinity,
      enLaFinal,
      localizador: null,
      senda: null,
      cotaDelCampo: cotaLlegada,
    };
    if (desvio && l.faltaParaTocar < MIRA_LA_SENDA_DESDE && !enLaFinal) {
      porEncima = Math.max(porEncima, desvio.metros);
      porDebajo = Math.min(porDebajo, desvio.metros);
    }
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
    m.step(DT, c);
    recorrido += m.state.airspeed * DT;
    const ahora = tripulacion.estado.tramo;
    if (ahora !== tramos.at(-1)!.tramo) {
      tramos.push({ tramo: ahora, t });
      if (ahora === "crucero") nivela = { altitud: m.state.position.y, recorrido };
    }
    // Hasta la final: lo de abajo es de otras pruebas.
    if (enLaFinal || ahora === "final" || l.faltaParaTocar < 12_000) break;
  }
  return { tramos, nivela, tcDelPlan, td, porEncima, porDebajo };
}

const cuando = (v: Vuelo, tramo: TramoDeLinea): number | null => v.tramos.find((x) => x.tramo === tramo)?.t ?? null;

describe.each([
  { cs: "12", cl: "36" },
  { cs: "30", cl: "36" },
  { cs: "12", cl: "18" },
  { cs: "30", cl: "18" },
])("de Los Rodeos $cs a La Palma $cl con el JAZ 90", ({ cs, cl }) => {
  const t = tramo(cs, cl);
  const v = volar(t);

  it("el nivel es uno bajo, de salto entre islas, y por encima del Teide", () => {
    expect(t.crucero / PIE).toBeGreaterThanOrEqual(13_000);
    expect(t.crucero / PIE).toBeLessThanOrEqual(20_000);
  });

  it("la tripulación nivela en el crucero del plan", () => {
    expect(cuando(v, "crucero"), JSON.stringify(v.tramos)).not.toBeNull();
    expect(Math.abs(v.nivela!.altitud - t.crucero)).toBeLessThan(40);
  });

  it(`y va nivelada lo que la escena necesita: ${CRUCERO_QUE_HACE_FALTA} s como poco`, () => {
    const arriba = cuando(v, "crucero")!;
    const baja = cuando(v, "bajada");
    expect(baja, JSON.stringify(v.tramos)).not.toBeNull();
    expect(baja! - arriba).toBeGreaterThanOrEqual(CRUCERO_QUE_HACE_FALTA);
  });

  it("nivela donde el plan dice que nivela: el T/C del plan es el del avión", () => {
    expect(v.tcDelPlan).not.toBeNull();
    // A una milla: lo que se acelera al empezar, que el plan cuenta ya a la velocidad de la escalera.
    expect(Math.abs(v.tcDelPlan! - v.nivela!.recorrido)).toBeLessThan(MILLA);
  });

  it("y empieza a bajar en el punto de descenso del plan, el de su perfil", () => {
    expect(v.td).not.toBeNull();
    const perfil = perfilDeLaBajada(t.ruta.cotaDelUmbral, velocidadesDeLaBajada(JAZ_90), finalDeLaRuta(t.ruta));
    expect(Math.abs(v.td!.falta - distanciaDelPerfil(perfil, t.crucero))).toBeLessThan(0.5 * MILLA);
    expect(Math.abs(cuando(v, "bajada")! - v.td!.t)).toBeLessThan(5);
  });

  /*
   * A la 18 no: su RNP A pide tres mil pies hasta LA505 y de ahí se entra a la
   * vista, así que el avión va por encima de la senda de tres grados —unos
   * trescientos metros en LA505— hasta pasar el punto, como manda la carta.
   * Es de la llegada, y no cambia con el nivel.
   */
  it.runIf(cl === "36")("y baja por la senda", () => {
    expect(v.porEncima).toBeLessThan(POR_ENCIMA_DE_LA_SENDA);
    expect(v.porDebajo).toBeGreaterThan(-POR_ENCIMA_DE_LA_SENDA);
  });

  it("y la subida del plan es la que se vuela, no dos millas por cada mil pies", () => {
    const cota = t.salida.escenario.aerodrome!.elevationM ?? 0;
    const pies = (t.crucero - cota) / PIE / 1000;
    const millas = distanciaDeSubida(JAZ_90, cota, t.crucero) / MILLA;
    // Con la indicada del tipo arriba, más de dos por cada mil pies.
    expect(millas / pies).toBeGreaterThan(2);
  });
});

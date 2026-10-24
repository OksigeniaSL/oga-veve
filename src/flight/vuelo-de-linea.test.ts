/**
 * La tripulación del vuelo de pasaje —ver `flight/vuelo-de-linea.ts`— volando
 * el JAZ 90 con el modelo de Guyrami, del puesto al puesto, sobre un mundo de
 * mentira: dos pistas en la misma línea, una raya de ida y otra de vuelta, y
 * una ruta recta entre las dos con su senda de tres grados. Lo que se mira es
 * lo que se nota desde un asiento de pasaje: que rueda despacio y por la
 * raya, que no entra en pista sin permiso, que despega en la Vr y por el eje,
 * que no vira pegado al suelo, que sube, cruza y baja como un avión de línea,
 * y que toca suave, en la zona de toma, y para.
 *
 * El vuelo en el navegador, sobre el mundo de verdad, lo mira
 * `scripts/verificar-inicio-3.mjs`.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { ArcadeFlightModel } from "./arcade";
import { AIRCRAFT } from "./aircraft";
import { neutralControls } from "./model";
import { laRecogidaDe } from "./recogida";
import { bankAngleOf } from "../ui/actitud";
import { avanzar, restante, rutaDe, type Fijo } from "./ruta";
import type { Fase } from "./vuelo";
import {
  CONFIGURA,
  EMPUJE,
  enLosMandosDeLinea,
  REDUCE_EL_GAS,
  RODAJE_EN_RECTA,
  SeguirLaRaya,
  SUBE_ABAJO,
  VueloDeLinea,
  type LecturaDeLinea,
  type PotenciaDeLinea,
  type PuntoXZ,
  type TramoDeLinea,
} from "./vuelo-de-linea";

const DT = 1 / 30;
const GRADO = Math.PI / 180;
const TAN = Math.tan(3 * GRADO);
const ARAI = AIRCRAFT.find((a) => a.id === "jaz-90")!;

/** La pista de salida: el umbral en el origen y hacia el norte, 2.500 m. */
const SALIDA = { z0: 0, largo: 2500 };
/** Y la de llegada, en la misma línea, ciento ochenta kilómetros al norte. */
const LLEGADA = { z0: -180000, largo: 2200 };
const enLaPista = (p: { x: number; z: number }, q: typeof SALIDA): boolean =>
  Math.abs(p.x) < 22 && p.z <= q.z0 && p.z >= q.z0 - q.largo;

const PUESTO = { x: 200, z: 300 };
const ESPERA = { x: 80, z: 40 };
const RAYA_IDA: PuntoXZ[] = [PUESTO, { x: 200, z: 110 }, { x: 150, z: 40 }, ESPERA];
const RAYA_ENTRA: PuntoXZ[] = [ESPERA, { x: 40, z: 25 }, { x: 0, z: -15 }, { x: 0, z: -70 }];
const PUESTO_DE_LLEGADA = { x: 190, z: LLEGADA.z0 - 1360 };

const fijo = (nombre: string, papel: Fijo["papel"], z: number): Fijo => ({ nombre, papel, x: 0, z, minima: null });
const RUTA = rutaDe(
  [
    fijo("RW36", "despegue", -2500),
    fijo("UNO", "ruta", -30000),
    fijo("IF", "if", LLEGADA.z0 + 16000),
    fijo("FAF", "faf", LLEGADA.z0 + 9000),
    fijo("RW36", "umbral", LLEGADA.z0),
  ],
  0,
);
const CRUCERO = 4300;

interface Vuelo {
  readonly tramos: { tramo: TramoDeLinea; t: number }[];
  readonly toque: { z: number; x: number; caida: number; velocidad: number } | null;
  readonly despegue: { z: number; velocidad: number; x: number } | null;
  readonly maxRodando: number;
  readonly maxLadoDeLaRaya: number;
  readonly maxAlabeoBajo: number;
  readonly maxAlabeo: number;
  readonly maxSubida: number;
  readonly maxBajada: number;
  readonly crucero: number;
  readonly entroSinPermiso: boolean;
  /** Cuándo se alineó, y lo que rodó alineada antes de tener el permiso de dar gas, m. */
  readonly alineadoA: number;
  readonly rodoAlineada: number;
  readonly maxLadoEnFinal: number;
  readonly parado: { x: number; z: number } | null;
  readonly t: number;
  readonly final: TramoDeLinea;
  /** Los cambios de potencia, con su hora, y cómo iba el avión en cada uno. */
  readonly potencias: { potencia: PotenciaDeLinea; t: number; sobreElCampo: number; tren: number; tramo: TramoDeLinea }[];
  /** Lo que se oye en cada paso: el empuje de la tripulación, o el gas si no lo pone. */
  readonly oido: { t: number; empuje: number | undefined; gas: number; enTierra: boolean }[];
}

/** Vuela el vuelo entero con el JAZ 90 de Guyrami. */
function volar(): Vuelo {
  const m = new ArcadeFlightModel({ aircraft: ARAI, ground: () => 0 });
  m.reset({ position: new Vector3(PUESTO.x, ARAI.gearHeight, PUESTO.z), heading: 0, airspeed: 0 });
  const c = { ...neutralControls(), engineOn: false, throttle: 0, tren: 1, flaps: 0 };
  const tripulacion = new VueloDeLinea({
    vr: ARAI.rotationSpeed,
    vref: ARAI.approachSpeed,
    alturaDeLaRecogida: laRecogidaDe(ARAI).nariz,
    reversa: true,
    trenQueSeMete: true,
  });
  const tramos: Vuelo["tramos"] = [];
  let fase: Fase = "estacionado";
  let enLaEspera = 0;
  let autorizado = false;
  let raya: readonly PuntoXZ[] = RAYA_IDA;
  let rayaDeVuelta: PuntoXZ[] | null = null;
  let activo = 1;
  let bajando = false;
  let toque: Vuelo["toque"] = null;
  let despegue: Vuelo["despegue"] = null;
  let maxRodando = 0;
  let maxLadoDeLaRaya = 0;
  let maxAlabeoBajo = 0;
  let maxAlabeo = 0;
  let maxSubida = 0;
  let maxBajada = 0;
  let crucero = 0;
  let entroSinPermiso = false;
  let maxLadoEnFinal = 0;
  let volo = false;
  let frenosDeTierra = 0;
  let alineadoA = Infinity;
  let rodoAlineada = 0;
  const potencias: Vuelo["potencias"] = [];
  const oido: Vuelo["oido"] = [];
  let t = 0;
  for (; t < 3600; t += DT) {
    const s = m.state;
    const p = { x: s.position.x, z: s.position.z };
    const enPista = enLaPista(p, SALIDA) || enLaPista(p, LLEGADA);
    m.setOnRunway(enPista);
    const altura = Math.max(0, s.heightAboveGround - ARAI.gearHeight);
    if (!s.onGround) volo = true;
    // ── La máquina de fases, la justa ──
    if (!volo) {
      if (!c.engineOn) fase = "estacionado";
      else if (enPista) fase = s.groundSpeed > 30 ? "despegando" : "alineando";
      else if (Math.hypot(p.x - ESPERA.x, p.z - ESPERA.z) < 6 && s.groundSpeed < 0.5) {
        enLaEspera += DT;
        if (enLaEspera > 6) autorizado = true;
        fase = autorizado ? "autorizado" : "esperando";
      } else fase = s.groundSpeed > 0.5 ? "rodando" : fase === "estacionado" ? "arrancando" : fase;
    } else if (!s.onGround) fase = s.position.z < LLEGADA.z0 + 12000 ? "final" : "en-vuelo";
    else fase = enPista ? (s.groundSpeed > 15 ? "aterrizado" : "abandonando") : "a-plataforma";
    if (autorizado && raya === RAYA_IDA) raya = RAYA_ENTRA;
    if (volo && s.onGround && s.groundSpeed < 25 && !rayaDeVuelta) {
      rayaDeVuelta = [p, { x: 0, z: LLEGADA.z0 - 1300 }, { x: 60, z: LLEGADA.z0 - 1360 }, PUESTO_DE_LLEGADA];
      raya = rayaDeVuelta;
    }
    if (volo && !s.onGround) raya = [];
    if (rayaDeVuelta && Math.hypot(p.x - PUESTO_DE_LLEGADA.x, p.z - PUESTO_DE_LLEGADA.z) < 4 && s.groundSpeed < 0.4)
      fase = "en-puesto";
    // ── El plan, en el aire ──
    if (!s.onGround) activo = avanzar(RUTA, activo, p.x, p.z);
    const falta = restante(RUTA, activo, p.x, p.z);
    const senda = 15 + TAN * falta;
    // El punto de descenso, como el del plan: donde la senda corta el crucero.
    if (volo && !bajando && senda < CRUCERO) bajando = true;
    // Lo que falta hasta el umbral por el eje, positivo antes de llegar.
    const alUmbral = p.z - LLEGADA.z0;
    const enLaFinal = volo && alUmbral > -100 && alUmbral < 15000 && Math.abs(p.x) < 2500;
    const l: LecturaDeLinea = {
      enTierra: s.onGround,
      enPista,
      x: p.x,
      z: p.z,
      rumbo: s.heading,
      velocidad: s.airspeed,
      porElSuelo: s.groundSpeed,
      altitud: s.position.y,
      altura,
      vertical: s.verticalSpeed,
      motor: c.engineOn,
      flaps: c.flaps,
      tren: c.tren,
      fase,
      autorizado,
      raya,
      pista: {
        rumbo: 0,
        lado: p.x,
        queda: volo ? p.z - (LLEGADA.z0 - LLEGADA.largo) : p.z - (SALIDA.z0 - SALIDA.largo),
      },
      tramo: volo
        ? { desde: RUTA.fijos[activo - 1]!, hasta: RUTA.fijos[activo]!, recta: false }
        : { desde: RUTA.fijos[0]!, hasta: RUTA.fijos[1]!, recta: false },
      alturaPedida: bajando ? senda : CRUCERO,
      ritmoPedido: bajando ? -s.groundSpeed * TAN : 0,
      faltaParaTocar: volo ? falta : RUTA.total,
      enLaFinal,
      localizador: enLaFinal ? -Math.max(-0.5, Math.min(0.5, Math.atan(p.x / 1500))) : null,
      senda: enLaFinal ? { altitud: TAN * Math.max(0, alUmbral + 300), ritmo: -s.groundSpeed * TAN } : null,
      cotaDelCampo: 0,
    };
    const permisos = { arrancar: t > 2, rodar: true, entrar: autorizado && enLaEspera > 9, despegar: t > alineadoA + 4 };
    if (tripulacion.estado.alineado && alineadoA === Infinity) alineadoA = t;
    if (tripulacion.estado.alineado && !permisos.despegar) rodoAlineada += s.groundSpeed * DT;
    const manos = tripulacion.paso(DT, l, permisos);
    const e = tripulacion.estado;
    if (tramos[tramos.length - 1]?.tramo !== e.tramo) tramos.push({ tramo: e.tramo, t });
    if (potencias[potencias.length - 1]?.potencia !== e.potencia)
      potencias.push({ potencia: e.potencia, t, sobreElCampo: s.position.y, tren: c.tren, tramo: e.tramo });
    // ── Las manos, en los mandos ──
    if (manos.motor !== c.engineOn) c.engineOn = manos.motor;
    const mandos = enLosMandosDeLinea(manos, m, {
      porElSuelo: s.groundSpeed,
      sacado: { flaps: c.flaps, tren: c.tren },
    });
    c.throttle = mandos.throttle;
    c.elevator = mandos.elevator ?? 0;
    c.aileron = mandos.aileron ?? 0;
    c.rudder = mandos.rudder ?? 0;
    c.brakes = mandos.brakes;
    c.reversa = mandos.reversa;
    // Los flaps y el tren van detrás de su palanca, a su paso.
    c.flaps += Math.max(-DT / 9, Math.min(DT / 9, manos.flaps - c.flaps));
    c.tren += Math.max(-DT / 8, Math.min(DT / 8, (manos.tren ? 1 : 0) - c.tren));
    if (manos.armados && s.onGround && volo) frenosDeTierra = 1;
    c.frenosDeTierra = frenosDeTierra;
    c.autofreno = manos.autofreno === 2 ? 2.4 : manos.autofreno === 1 ? 1.5 : 0;
    oido.push({ t, empuje: manos.empuje, gas: c.throttle, enTierra: s.onGround });
    m.step(DT, c);
    // ── Lo que se mide ──
    const d = m.state;
    const alabeo = Math.abs(bankAngleOf(d.orientation));
    if (!volo && d.onGround && !enLaPista({ x: d.position.x, z: d.position.z }, SALIDA)) {
      maxRodando = Math.max(maxRodando, d.groundSpeed);
      maxLadoDeLaRaya = Math.max(maxLadoDeLaRaya, distanciaALaRaya(raya, d.position.x, d.position.z));
    }
    if (!autorizado && enLaPista({ x: d.position.x, z: d.position.z }, SALIDA)) entroSinPermiso = true;
    if (!despegue && !d.onGround) despegue = { z: d.position.z, velocidad: d.airspeed, x: d.position.x };
    if (!d.onGround) {
      const h = d.heightAboveGround - ARAI.gearHeight;
      if (h < 100 && volo) maxAlabeoBajo = Math.max(maxAlabeoBajo, alabeo);
      maxAlabeo = Math.max(maxAlabeo, alabeo);
      maxSubida = Math.max(maxSubida, d.verticalSpeed);
      maxBajada = Math.min(maxBajada, d.verticalSpeed);
      crucero = Math.max(crucero, d.position.y);
      if (d.position.z < LLEGADA.z0 + 3000 && d.position.z > LLEGADA.z0)
        maxLadoEnFinal = Math.max(maxLadoEnFinal, Math.abs(d.position.x));
    }
    if (volo && d.onGround && !toque)
      toque = { z: d.position.z, x: d.position.x, caida: d.touchdownSinkRate, velocidad: d.airspeed };
    if (e.tramo === "apagado") break;
  }
  const s = m.state;
  return {
    tramos,
    toque,
    despegue,
    maxRodando,
    maxLadoDeLaRaya,
    maxAlabeoBajo,
    maxAlabeo,
    maxSubida,
    maxBajada,
    crucero,
    entroSinPermiso,
    alineadoA,
    rodoAlineada,
    maxLadoEnFinal,
    parado: s.groundSpeed < 0.5 ? { x: s.position.x, z: s.position.z } : null,
    t,
    final: tripulacion.estado.tramo,
    potencias,
    oido,
  };
}

function distanciaALaRaya(r: readonly PuntoXZ[], x: number, z: number): number {
  let mejor = Infinity;
  for (let i = 1; i < r.length; i++) {
    const a = r[i - 1]!;
    const b = r[i]!;
    const l2 = (b.x - a.x) ** 2 + (b.z - a.z) ** 2;
    const k = l2 > 0 ? Math.max(0, Math.min(1, ((x - a.x) * (b.x - a.x) + (z - a.z) * (b.z - a.z)) / l2)) : 0;
    mejor = Math.min(mejor, Math.hypot(a.x + (b.x - a.x) * k - x, a.z + (b.z - a.z) * k - z));
  }
  return mejor;
}

describe("la raya del suelo", () => {
  it("apunta por delante sobre la raya y dice lo que queda", () => {
    const r = new SeguirLaRaya();
    const raya = [{ x: 0, z: 0 }, { x: 0, z: -100 }, { x: 100, z: -100 }];
    r.poner(raya, 0, 0);
    const a = r.paso(0, -10, 20)!;
    expect(a.objetivo.x).toBeCloseTo(0, 5);
    expect(a.objetivo.z).toBeCloseTo(-30, 5);
    expect(a.queda).toBeCloseTo(190, 5);
    // Y la curva de delante se ve venir.
    const b = r.paso(0, -80, 20)!;
    expect(b.giro).toBeGreaterThan(80 * GRADO);
  });

  it("no vuelve atrás por una raya que da la vuelta sobre sí misma", () => {
    const r = new SeguirLaRaya();
    // Por la pista hacia el sur, la vuelta, y hacia el norte por el mismo sitio.
    const raya = [{ x: 0, z: 0 }, { x: 0, z: 200 }, { x: 10, z: 210 }, { x: 0, z: 220 }, { x: 0, z: -200 }];
    r.poner(raya, 0, 0);
    for (let z = 0; z <= 200; z += 5) r.paso(0, z, 10);
    r.paso(5, 210, 10);
    const ya = r.paso(0, 215, 10)!;
    // Ya de vuelta: lo que queda es la recta del norte, no la del sur.
    expect(ya.queda).toBeLessThan(440);
    expect(ya.objetivo.z).toBeLessThan(215);
  });
});

const entorno = (
  globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

describe("del puesto al puesto con el JAZ 90 de Guyrami", () => {
  const vuelo = volar();
  // Con `OGA_LINEA=1`, lo medido: cuándo empezó cada cosa y cómo se tocó.
  if (entorno?.OGA_LINEA)
    console.log(
      vuelo.tramos.map((x) => `${x.tramo} ${x.t.toFixed(0)} s`).join(" · "),
      JSON.stringify({ toque: vuelo.toque, despegue: vuelo.despegue, rodando: vuelo.maxRodando, raya: vuelo.maxLadoDeLaRaya }),
    );
  const orden = vuelo.tramos.map((x) => x.tramo);

  it("pasa por cada cosa en su orden, y acaba con los motores fuera", () => {
    const esperado: TramoDeLinea[] = [
      "puerta",
      "arrancando",
      "rodando",
      "esperando",
      "entrando",
      "carrera",
      "subida",
      "crucero",
      "bajada",
      "final",
      "recogida",
      "frenando",
      "al-puesto",
      "aparcado",
      "apagado",
    ];
    expect(orden).toEqual(esperado);
    expect(vuelo.final).toBe("apagado");
  });

  it("rueda despacio y por la raya", () => {
    expect(vuelo.maxRodando).toBeLessThanOrEqual(RODAJE_EN_RECTA + 0.8);
    expect(vuelo.maxLadoDeLaRaya).toBeLessThan(6);
  });

  it("no entra en la pista sin el permiso de la torre", () => {
    expect(vuelo.entroSinPermiso).toBe(false);
  });

  it("y alineada, espera parada a la cabina para dar gas", () => {
    const carrera = vuelo.tramos.find((x) => x.tramo === "carrera")!;
    expect(vuelo.alineadoA).toBeLessThan(Infinity);
    expect(carrera.t).toBeGreaterThanOrEqual(vuelo.alineadoA + 4);
    expect(vuelo.rodoAlineada).toBeLessThan(3);
  });

  it("despega en la Vr, por el eje y con pista de sobra", () => {
    const d = vuelo.despegue!;
    expect(d.velocidad).toBeGreaterThanOrEqual(ARAI.rotationSpeed - 1);
    expect(Math.abs(d.x)).toBeLessThan(4);
    expect(-d.z).toBeLessThan(SALIDA.largo * 0.8);
  });

  it("no vira pegado al suelo, ni más de veinticinco grados", () => {
    expect(vuelo.maxAlabeoBajo).toBeLessThan(9 * GRADO);
    expect(vuelo.maxAlabeo).toBeLessThan(26 * GRADO);
  });

  it("sube y baja como un avión de línea, y cruza a su altura", () => {
    expect(vuelo.maxSubida).toBeLessThan(SUBE_ABAJO + 0.5);
    expect(vuelo.maxBajada).toBeGreaterThan(-12);
    expect(vuelo.crucero).toBeGreaterThan(CRUCERO - 60);
    expect(vuelo.crucero).toBeLessThan(CRUCERO + 60);
  });

  it("llega a la final por el eje", () => {
    expect(vuelo.maxLadoEnFinal).toBeLessThan(8);
  });

  /*
   * **Firme y en su sitio** (punto 299): esto decía «toca suave», con la zona
   * hasta los novecientos metros, y lo que hace buena una toma es el sitio —de
   * 300 a 450 m del umbral, dentro de la zona de toma de `toma-larga.ts`— y
   * una caída de toma de avión de línea, de dos a cuatro pies por segundo.
   */
  it("toca firme, en su sitio y a su velocidad", () => {
    const t = vuelo.toque!;
    const pasado = LLEGADA.z0 - t.z;
    expect(pasado).toBeGreaterThan(300);
    expect(pasado).toBeLessThan(450);
    expect(Math.abs(t.x)).toBeLessThan(5);
    expect(t.caida).toBeGreaterThan(2 * 0.3048);
    expect(t.caida).toBeLessThan(4 * 0.3048);
    expect(t.velocidad).toBeLessThan(ARAI.approachSpeed + 3);
  });

  it("y para en su puesto", () => {
    const p = vuelo.parado!;
    expect(Math.hypot(p.x - PUESTO_DE_LLEGADA.x, p.z - PUESTO_DE_LLEGADA.z)).toBeLessThan(5);
  });

  /*
   * **Los motores suenan como en un vuelo de verdad** (punto 297): toda la
   * fuerza para despegar, la de subida a los mil quinientos pies sobre el
   * campo, el ralentí desde el punto de descenso y la de aproximación con el
   * tren fuera, que sale al tocar. Es lo que se oye desde el asiento, y en
   * el peldaño de la escena el gas no lo dice: es una palanca de velocidad,
   * y con él el despegue se acababa a quince metros del suelo y la bajada
   * sonaba igual que el crucero.
   */
  it("y los motores suenan como en un vuelo de verdad: despegue, subida, ralentí y aproximación", () => {
    expect(vuelo.potencias.map((p) => p.potencia)).toEqual([
      "tierra",
      "despegue",
      "subida",
      "ralenti",
      "aproximacion",
      "tierra",
    ]);
    const de = (p: PotenciaDeLinea) => vuelo.potencias.find((x) => x.potencia === p)!;
    // El gas de subida, a los mil quinientos pies sobre el campo, subiendo.
    expect(de("subida").tramo).toBe("subida");
    expect(de("subida").sobreElCampo).toBeGreaterThanOrEqual(REDUCE_EL_GAS);
    expect(de("subida").sobreElCampo).toBeLessThan(REDUCE_EL_GAS + 30);
    // El ralentí, en cuanto empieza a bajar; y la aproximación, con el tren fuera.
    expect(de("ralenti").tramo).toBe("bajada");
    expect(de("aproximacion").tren).toBeGreaterThan(0.99);
    // Y cada uno suena a lo suyo: de más a menos, y la aproximación por encima del ralentí.
    expect(EMPUJE.despegue).toBeGreaterThan(EMPUJE.subida);
    expect(EMPUJE.subida).toBeGreaterThan(EMPUJE.aproximacion);
    expect(EMPUJE.aproximacion).toBeGreaterThan(EMPUJE.ralenti * 5);
  });

  it("los motores suben y bajan de vueltas en unos segundos, no de golpe; y en el suelo suena el gas", () => {
    let mayor = 0;
    for (let i = 1; i < vuelo.oido.length; i++) {
      const a = vuelo.oido[i - 1]!;
      const b = vuelo.oido[i]!;
      if (a.empuje !== undefined && b.empuje !== undefined) mayor = Math.max(mayor, Math.abs(b.empuje - a.empuje) / DT);
    }
    expect(mayor).toBeLessThanOrEqual(0.1 + 1e-9);
    // En el suelo, sin empuje propio: lo que se oye es el gas, rodando y con la reversa.
    expect(vuelo.oido.filter((x) => x.enTierra).every((x) => x.empuje === undefined)).toBe(true);
    // Y arriba, en el crucero, el de subida, aunque el gas de la palanca de velocidad sea otro.
    const subida = vuelo.tramos.find((x) => x.tramo === "crucero")!.t;
    const arriba = vuelo.oido.find((x) => x.t > subida + 30)!;
    expect(arriba.empuje).toBeCloseTo(EMPUJE.subida, 5);
  });

  it("y se configura para aterrizar donde se configura", () => {
    // Los números, en orden: frenar, flaps, tren y lo demás, de lejos a cerca.
    expect(CONFIGURA.frena).toBeGreaterThan(CONFIGURA.flaps1);
    expect(CONFIGURA.flaps1).toBeGreaterThan(CONFIGURA.flaps2);
    expect(CONFIGURA.flaps2).toBeGreaterThan(CONFIGURA.tren);
    expect(CONFIGURA.tren).toBeGreaterThan(CONFIGURA.flapsTodos);
    expect(CONFIGURA.flapsTodos).toBeGreaterThan(CONFIGURA.estabilizado);
  });
});

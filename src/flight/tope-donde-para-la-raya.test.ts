/**
 * **Donde la raya pide parar, el tope no deja acelerar.**
 *
 * En los peldaños donde el juego lleva la velocidad por el suelo —Guyrami y
 * Tukã—, el tope de rodaje cierra el gas a lo que sugiere el plan. Y tomaba la
 * de rodaje, nueve metros por segundo y su holgura, cuando la sugerida era
 * cero (`velocidadSugerida || RODAJE`), que es justo cuando la raya pide
 * parar. Desde H22b eso pasa con la rueda de morro en el punto del puesto, y
 * siempre había pasado en la doble raya sin la verde: con el gas a fondo, el
 * avión se iba del puesto o cruzaba la doble raya.
 *
 * Aquí se rueda la raya con el gas a fondo, como lo deja un crío que no lo
 * suelta, con el modelo de vuelo de cada peldaño y el tope del juego, y el
 * avión puesto sobre la raya a lo que le deja avanzar el modelo —pasado el
 * final, sigue recto, que es lo que se quiere ver—:
 *
 * - **la salida del puesto**: arranca y rueda, nadie se queda clavado;
 * - **la doble raya sin la verde**: se para antes de ella y ahí se queda;
 * - **la doble raya con la verde**: se para, y con la verde sigue a la pista;
 * - **la llegada al puesto**: se para con la rueda de morro en el punto, sin
 *   pasarse;
 * - **y ya en el puesto**, con el gas a fondo: donde el juego lleva la
 *   velocidad, quieto; donde no, se va, y el señalero cruza los bastones y se
 *   oye «te pasaste»; quien se paró antes de su sitio llega a él, y del
 *   puesto se vuelve a salir.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { aircraftById, type AircraftConfig } from "./aircraft";
import { ArcadeFlightModel } from "./arcade";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls, type FlightModel } from "./model";
import { laVelocidadEsDelJuego, limitarElRodaje } from "./tope-de-rodaje";
import { GUYRAMI, TAGUATO, TUKA, type Tier } from "./tiers";
import type { Gesto } from "./senalero";
import type { Aerodrome, Punto } from "../world/aerodrome";
import { PlanDeVuelo } from "../world/plan-de-vuelo";
import { morroDe, ruedaDeMorroEn } from "../world/rueda-de-morro";
import { Senalero } from "../world/senalero";
import { enEjesDePista } from "../world/rumbo";
import { SCENARIOS } from "../world/scenarios";

const PASO = 1 / 20;

/**
 * `MEDIR=<fichero>` apunta en él lo medido de cada caso, para el ADR: la consola de
 * las pruebas que pasan no se ve.
 */
const proceso = (globalThis as unknown as {
  process?: { env: Record<string, string | undefined>; getBuiltinModule(nombre: string): unknown };
}).process;
const MEDIR = proceso?.env.MEDIR;
const apuntar = (caso: string, r: Rodado) => {
  if (!MEDIR || !proceso) return;
  const fs = proceso.getBuiltinModule("node:fs") as { appendFileSync(ruta: string, texto: string): void };
  fs.appendFileSync(
    MEDIR,
    `${caso}: lo más pasado del final ${r.loMasPasado.toFixed(1)} m, rueda a ${r.rueda.toFixed(1)} m, ` +
      `al acabar a ${r.final.toFixed(2)} m/s, lo más ${r.maxima.toFixed(1)} m/s · ${r.fases.slice(0, 8).join(" → ")}\n`,
  );
};

/** El modelo de vuelo de cada peldaño, parado en el suelo y mirando al norte. */
function modelo(a: AircraftConfig, tier: Tier): FlightModel {
  const m =
    tier.model === "simple"
      ? new ArcadeFlightModel({ aircraft: a, ground: () => 0 })
      : new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: tier.assists });
  m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: 0, airspeed: 0 });
  return m;
}

interface Rodado {
  /** Lo más rápido que fue, m/s. */
  maxima: number;
  /** Los metros que se pasó del final de la raya, con su signo: negativo es antes. */
  pasado: number;
  /** Lo más que se pasó del final de la raya en algún momento, m. */
  loMasPasado: number;
  /** La velocidad al acabar, m/s. */
  final: number;
  /** Las fases por las que pasó, en su orden y sin repetir seguidas. */
  fases: string[];
  /** Si llegó a pisar la pista. */
  pisoLaPista: boolean;
  /** Lo que tardó en pasar de un metro por segundo desde que empezó, s, o null. */
  arranco: number | null;
  /** De la rueda de morro al final de la raya al acabar, m. */
  rueda: number;
  /** Dónde y hacia dónde quedó el avión al acabar. */
  donde: Punto;
  rumbo: number;
  /** El final de la última raya que hubo y su `ultimoPaso`, que es lo que mira el señalero. */
  fin: Punto | null;
  porDonde: Punto | null;
}

/** El punto a `s` metros de una polilínea y su rumbo; pasado el final, recto por su último tramo. */
function enLaRaya(ruta: readonly Punto[], s: number): { p: Punto; rumbo: number; total: number } {
  const largos = ruta.slice(1).map((r, i) => Math.hypot(r[0] - ruta[i]![0], r[1] - ruta[i]![1]));
  const total = largos.reduce((x, y) => x + y, 0);
  let anda = 0;
  for (let i = 0; i < largos.length; i++) {
    const largo = largos[i]!;
    const ultimo = i === largos.length - 1;
    if (anda + largo >= s || ultimo) {
      const q = ruta[i]!;
      const r = ruta[i + 1]!;
      const u = largo > 0 ? Math.max(0, (s - anda) / largo) : 0;
      return {
        p: [q[0] + (r[0] - q[0]) * u, q[1] + (r[1] - q[1]) * u],
        rumbo: Math.atan2(r[0] - q[0], -(r[1] - q[1])),
        total,
      };
    }
    anda += largo;
  }
  return { p: ruta[0]!, rumbo: 0, total };
}

/**
 * Rueda durante `segundos`, o hasta `hasta`: a lo que pide la raya hasta
 * `aFondoDesde`, y desde ahí con el gas a fondo y el tope del juego. El avión
 * va sobre la raya de cada paso, a lo que le deja avanzar su modelo; pasado su
 * final, sigue recto por su último tramo.
 */
function rodarAFondo(
  plan: PlanDeVuelo,
  esc: (typeof SCENARIOS)[number],
  a: AircraftConfig,
  tier: Tier,
  segundos: number,
  {
    desde,
    hasta,
    aFondoDesde = () => true,
    pistaDeOtros = false,
    paraAntes,
  }: {
    desde: { p: Punto; rumbo: number; v: number };
    hasta?: (fase: string) => boolean;
    aFondoDesde?: (fase: string) => boolean;
    pistaDeOtros?: boolean;
    /** Rodando a lo que pide la raya, se para con la rueda de morro a estos metros del final. */
    paraAntes?: number;
  },
): Rodado {
  const pista = esc.runway;
  const m = modelo(a, tier);
  let p: Punto = desde.p;
  let rumbo = desde.rumbo;
  let v = desde.v;
  let maxima = 0;
  let loMasPasado = -Infinity;
  let pasado = -Infinity;
  let pisoLaPista = false;
  let arranco: number | null = null;
  let aFondo = false;
  const fases: string[] = [];
  let rueda = Infinity;
  let rutaDeAntes: readonly Punto[] | null = null;
  let s = 0;
  let fin: Punto | null = null;
  let porDonde: Punto | null = null;
  const rueda0 = morroDe(a).rueda;
  for (let t = 0; t < segundos; t += PASO) {
    const e = enEjesDePista(p[0], p[1], pista.x, pista.z, pista.heading);
    const enPista = Math.abs(e.across) < pista.width / 2 && Math.abs(e.along) < pista.length / 2;
    pisoLaPista ||= enPista;
    plan.pistaDeOtros = pistaDeOtros;
    const vista = plan.paso(
      {
        position: { x: p[0], y: 0, z: p[1] },
        velocity: { x: Math.sin(rumbo) * v, y: 0, z: -Math.cos(rumbo) * v },
        heading: rumbo,
        airspeed: v,
        groundSpeed: v,
        verticalSpeed: 0,
        yawRate: 0,
        onGround: true,
        onRunway: enPista,
      } as never,
      0,
      true,
      PASO,
    );
    if (fases.at(-1) !== vista.fase) fases.push(vista.fase);
    if (hasta?.(vista.fase)) break;
    aFondo ||= aFondoDesde(vista.fase);
    if (aFondo) {
      // El crío, con el gas a fondo; el tope, encima, como en el juego.
      const mandos = { ...neutralControls(), engineOn: true, throttle: 1, brakes: 0 };
      m.setOnRunway(enPista);
      limitarElRodaje(m.state, mandos, (x, d) => m.gasParaRodar(x, d), tier, vista, Infinity);
      m.step(PASO, mandos);
      v = Math.hypot(m.state.velocity.x, m.state.velocity.z);
    } else {
      // Hasta entonces, a lo que pide la raya, y el modelo a esa velocidad.
      v = Math.min(v + PASO, Math.max(0, vista.velocidadSugerida));
      if (paraAntes !== undefined && -pasado - rueda0 < paraAntes) v = 0;
      m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: 0, airspeed: v });
    }
    maxima = Math.max(maxima, v);
    if (arranco === null && v > 1) arranco = t;
    const ruta = plan.rutaVisible();
    if (ruta.length < 2) continue;
    fin = ruta[ruta.length - 1]!;
    porDonde = plan.ultimoPaso();
    // Con raya nueva, lo recorrido es lo que mide el plan sobre ella.
    if (ruta !== rutaDeAntes) {
      rutaDeAntes = ruta;
      s = plan.avanceEnLaRuta;
    }
    s += v * PASO;
    const aqui = enLaRaya(ruta, s);
    p = aqui.p;
    rumbo = aqui.rumbo;
    pasado = s - aqui.total;
    loMasPasado = Math.max(loMasPasado, pasado);
    const r = ruedaDeMorroEn({ x: p[0], z: p[1] }, rumbo, morroDe(a));
    rueda = Math.hypot(r.x - fin[0], r.z - fin[1]);
  }
  return { maxima, pasado, loMasPasado, final: v, fases, pisoLaPista, arranco, rueda, donde: p, rumbo, fin, porDonde };
}

/** Un plan de salida desde el puesto, y el avión en el principio de su raya. */
function deSalida(campo: string, avionId: string) {
  const esc = SCENARIOS.find((s) => s.id === campo)!;
  const a = aircraftById(avionId);
  const plan = new PlanDeVuelo(esc.aerodrome as Aerodrome, esc.runway, () => 0, a);
  plan.reiniciar();
  const ruta = plan.rutaVisible();
  const p0 = ruta[0]!;
  const p1 = ruta[1]!;
  return { esc, a, plan, desde: { p: p0, rumbo: Math.atan2(p1[0] - p0[0], -(p1[1] - p0[1])), v: 0 } };
}

/** Un plan de vuelta, aterrizado y frenado a paso de rodaje sobre el eje. */
function deVuelta(campo: string, avionId: string) {
  const esc = SCENARIOS.find((s) => s.id === campo)!;
  const a = aircraftById(avionId);
  const pista = esc.runway;
  const plan = new PlanDeVuelo(esc.aerodrome as Aerodrome, pista, () => 0, a);
  plan.reiniciar();
  const h = (pista.heading * Math.PI) / 180;
  const enElEje = (along: number): Punto => [pista.x + Math.sin(h) * along, pista.z - Math.cos(h) * along];
  const estado = (q: Punto, v: number, alto: number) =>
    ({
      position: { x: q[0], y: alto, z: q[1] },
      velocity: { x: Math.sin(h) * v, y: 0, z: -Math.cos(h) * v },
      heading: h,
      airspeed: v,
      groundSpeed: v,
      verticalSpeed: 0,
      yawRate: 0,
      onGround: alto < 1,
      onRunway: alto < 1,
    }) as never;
  // Volado de verdad, alto un buen rato, y posado pasado el umbral.
  const lejos = enElEje(-pista.length / 2 - 3000);
  for (let t = 0; t < 20; t += 0.1) plan.paso(estado(lejos, 60, 400), 400, true, 0.1);
  const toma = enElEje(-pista.length / 2 + 300);
  plan.paso(estado(toma, 30, 0), 0, true, 0.1);
  return { esc, a, plan, desde: { p: toma, rumbo: h, v: 12 } };
}

describe("donde la raya pide parar, el tope no deja acelerar", () => {
  for (const tier of [GUYRAMI, TUKA]) {
    it(`${tier.id}: del puesto se sale, y sin la verde se para en la doble raya y ahí se queda`, () => {
      const { esc, a, plan, desde } = deSalida("tenerife-norte", "jaz-20");
      const r = rodarAFondo(plan, esc, a, tier, 240, { desde, pistaDeOtros: true });
      apuntar(`${tier.id} sin la verde`, r);
      // Nadie clavado en el puesto: con el gas a fondo, rueda enseguida.
      expect(r.arranco, `fases ${r.fases.join(" → ")}`).not.toBeNull();
      expect(r.arranco!).toBeLessThan(10);
      expect(r.fases).toContain("esperando");
      // La doble raya no se cruza: lo más pasado, menos de un metro.
      expect(r.loMasPasado, `fases ${r.fases.join(" → ")}`).toBeLessThan(1);
      expect(r.pisoLaPista).toBe(false);
      expect(r.final).toBeLessThan(0.3);
    }, 120_000);

    it(`${tier.id}: con la verde, de la doble raya a la pista`, () => {
      const { esc, a, plan, desde } = deSalida("tenerife-norte", "jaz-20");
      const r = rodarAFondo(plan, esc, a, tier, 300, {
        desde,
        hasta: (f) => f === "alineando" || f === "despegando",
      });
      expect(r.fases, r.fases.join(" → ")).toContain("esperando");
      expect(r.fases, r.fases.join(" → ")).toContain("autorizado");
      // Y en la pista, que es cuando el plan pasa a «alineando».
      expect(r.fases.at(-1), r.fases.join(" → ")).toBe("alineando");
    }, 120_000);

    for (const [campo, avion] of [
      ["tenerife-norte", "jaz-50"],
      ["tenerife-norte", "jaz-90"],
    ] as const)
      it(`${tier.id}: en ${campo} con el ${avion}, para con la rueda de morro en el punto del puesto`, () => {
        const { esc, a, plan, desde } = deVuelta(campo, avion);
        // Fuera de la pista, con el gas a fondo, hasta que el plan lo da por llegado.
        const llega = rodarAFondo(plan, esc, a, tier, 900, {
          desde,
          aFondoDesde: (f) => f === "a-plataforma",
          hasta: (f) => f === "en-puesto",
        });
        apuntar(`${tier.id} ${avion} al puesto`, llega);
        expect(llega.fases.at(-1), llega.fases.join(" → ")).toBe("en-puesto");
        expect(llega.loMasPasado, `pasado ${llega.loMasPasado.toFixed(1)} m`).toBeLessThan(1);
        expect(llega.rueda, `rueda a ${llega.rueda.toFixed(1)} m del punto`).toBeLessThan(1.5);
      }, 120_000);
  }
});

/** Lo que pasa ya en el puesto, con el gas a fondo. */
interface EnElPuesto {
  /** Lo más que se apartó el avión de donde paró, m. */
  movido: number;
  maxima: number;
  final: number;
  fases: string[];
  /** Lo más que se pasó la rueda de morro del punto, a lo largo de la entrada, m; negativo, antes. */
  loMasPasado: number;
  /** De la rueda de morro al punto al acabar, a lo largo de la entrada, m; negativo, pasado. */
  queda: number;
  /** Si en todo el rato la velocidad la llevó el juego (`laVelocidadEsDelJuego`). */
  delJuego: boolean;
  /** Los gestos del señalero, en su orden y sin repetir seguidos. */
  gestos: Gesto[];
  /**
   * Si se dio lo que hace sonar «te pasaste, frená y volvé» en `atenderAlSenalero`
   * (`game.ts`): más de `SE_PASO_DEL_PUESTO`, diez metros, pasado, a más de dos metros por
   * segundo y con la velocidad de quien juega.
   */
  teLoPasaste: boolean;
  donde: Punto;
  rumbo: number;
}

/**
 * **Ya en el puesto, el gas a fondo durante `segundos`**, con el tope del juego y el
 * señalero plantado como lo planta el juego: en el final de la raya y mirando por donde
 * entraba (`senaleroAlPuestoDeLlegada`), y que lo vio venir. Sin raya, el avión sigue recto
 * hacia donde mira; si la raya vuelve, por ella, salvo con `recto`, que es quien no toca el
 * volante.
 */
function aFondoEnElPuesto(
  plan: PlanDeVuelo,
  a: AircraftConfig,
  tier: Tier,
  llegada: Rodado,
  segundos: number,
  recto = false,
): EnElPuesto {
  const m = modelo(a, tier);
  const punto = llegada.fin!;
  const porDonde = llegada.porDonde!;
  const largo = Math.hypot(punto[0] - porDonde[0], punto[1] - porDonde[1]);
  const hacia: Punto = [(punto[0] - porDonde[0]) / largo, (punto[1] - porDonde[1]) / largo];
  const senalero = new Senalero();
  senalero.colocar(punto, porDonde, () => 0);
  // Lo vio venir por su raya de entrada, como en el juego: es lo que le deja decir «pasado».
  senalero.paso(
    PASO,
    { x: punto[0] - hacia[0] * 30, z: punto[1] - hacia[1] * 30, velocidad: 3, enElSuelo: true, motor: true },
    true,
  );
  let p = llegada.donde;
  let rumbo = llegada.rumbo;
  let v = 0;
  let s = 0;
  let rutaDeAntes = plan.rutaVisible();
  let movido = 0;
  let maxima = 0;
  let loMasPasado = -Infinity;
  let queda = Infinity;
  let delJuego = true;
  let teLoPasaste = false;
  const fases: string[] = [];
  const gestos: Gesto[] = [];
  for (let t = 0; t < segundos; t += PASO) {
    const vista = plan.paso(
      {
        position: { x: p[0], y: 0, z: p[1] },
        velocity: { x: Math.sin(rumbo) * v, y: 0, z: -Math.cos(rumbo) * v },
        heading: rumbo,
        airspeed: v,
        groundSpeed: v,
        verticalSpeed: 0,
        yawRate: 0,
        onGround: true,
        onRunway: false,
      } as never,
      0,
      true,
      PASO,
    );
    if (fases.at(-1) !== vista.fase) fases.push(vista.fase);
    const mandos = { ...neutralControls(), engineOn: true, throttle: 1, brakes: 0 };
    m.setOnRunway(false);
    delJuego &&= laVelocidadEsDelJuego(m.state, tier, vista);
    limitarElRodaje(m.state, mandos, (x, d) => m.gasParaRodar(x, d), tier, vista, Infinity);
    m.step(PASO, mandos);
    v = Math.hypot(m.state.velocity.x, m.state.velocity.z);
    maxima = Math.max(maxima, v);
    const ruta = plan.rutaVisible();
    if (ruta.length < 2 || recto) {
      p = [p[0] + Math.sin(rumbo) * v * PASO, p[1] - Math.cos(rumbo) * v * PASO];
    } else {
      if (ruta !== rutaDeAntes) {
        rutaDeAntes = ruta;
        s = plan.avanceEnLaRuta;
      }
      s += v * PASO;
      const aqui = enLaRaya(ruta, s);
      p = aqui.p;
      rumbo = aqui.rumbo;
    }
    movido = Math.max(movido, Math.hypot(p[0] - llegada.donde[0], p[1] - llegada.donde[1]));
    const r = ruedaDeMorroEn({ x: p[0], z: p[1] }, rumbo, morroDe(a));
    queda = (punto[0] - r.x) * hacia[0] + (punto[1] - r.z) * hacia[1];
    loMasPasado = Math.max(loMasPasado, -queda);
    const volviendo = vista.fase === "abandonando" || vista.fase === "a-plataforma" || vista.fase === "en-puesto";
    const gesto = senalero.paso(PASO, { x: r.x, z: r.z, velocidad: v, enElSuelo: true, motor: true }, volviendo);
    if (gestos.at(-1) !== gesto) gestos.push(gesto);
    if (volviendo && senalero.pasado > 10 && v > 2 && !laVelocidadEsDelJuego(m.state, tier, vista)) teLoPasaste = true;
  }
  return { movido, maxima, final: v, fases, loMasPasado, queda, delJuego, gestos, teLoPasaste, donde: p, rumbo };
}

const apuntarPuesto = (caso: string, r: EnElPuesto) => {
  if (!MEDIR || !proceso) return;
  const fs = proceso.getBuiltinModule("node:fs") as { appendFileSync(ruta: string, texto: string): void };
  fs.appendFileSync(
    MEDIR,
    `${caso}: se movió ${r.movido.toFixed(2)} m, lo más ${r.maxima.toFixed(2)} m/s, al acabar ${r.final.toFixed(2)} m/s, ` +
      `rueda a ${r.queda.toFixed(2)} m del punto (lo más pasada ${r.loMasPasado.toFixed(1)}), ` +
      `del juego ${r.delJuego}, te lo pasaste ${r.teLoPasaste} · ${r.fases.join(" → ")} · señalero ${r.gestos.join(", ")}\n`,
  );
};

/** Al puesto: a fondo donde el juego lleva la velocidad, y donde no, a lo que pide la raya. */
function alPuesto(tier: Tier, avion: string, paraAntes?: number) {
  const { esc, a, plan, desde } = deVuelta("tenerife-norte", avion);
  const conTope = tier !== TAGUATO && paraAntes === undefined;
  const llegada = rodarAFondo(plan, esc, a, tier, 900, {
    desde,
    aFondoDesde: (f) => conTope && f === "a-plataforma",
    hasta: (f) => f === "en-puesto",
    paraAntes,
  });
  return { esc, a, plan, llegada };
}

describe("ya en el puesto, el gas a fondo no saca al avión de él", () => {
  for (const tier of [GUYRAMI, TUKA])
    for (const avion of ["jaz-50", "jaz-90"])
      it(`${tier.id}: con el ${avion}, quieto un minuto en el puesto, y después se sale`, () => {
        const { esc, a, plan, llegada } = alPuesto(tier, avion);
        expect(llegada.fases.at(-1), llegada.fases.join(" → ")).toBe("en-puesto");
        const quieto = aFondoEnElPuesto(plan, a, tier, llegada, 60);
        apuntarPuesto(`${tier.id} ${avion} en el puesto`, quieto);
        // Lo lleva el juego, y no lo deja ir: ni un palmo, ni fuera de «en el puesto».
        expect(quieto.delJuego).toBe(true);
        expect(quieto.movido, quieto.fases.join(" → ")).toBeLessThan(0.3);
        expect(quieto.fases).toEqual(["en-puesto"]);
        expect(quieto.final).toBeLessThan(0.1);
        // Y el señalero, que lo ve parado, sigue con lo suyo hasta cortar motores.
        expect(quieto.gestos.filter((g) => g !== null).at(-1)).toBe("cortar");
        expect(quieto.gestos).not.toContain("alto");
        expect(quieto.gestos).not.toContain("adelante");

        // Apagado y otro tramo desde aquí, como `empezarOtroTramo`: del puesto se sale.
        plan.paso(
          {
            position: { x: quieto.donde[0], y: 0, z: quieto.donde[1] },
            velocity: { x: 0, y: 0, z: 0 },
            heading: quieto.rumbo,
            airspeed: 0,
            groundSpeed: 0,
            verticalSpeed: 0,
            yawRate: 0,
            onGround: true,
            onRunway: false,
          } as never,
          0,
          false,
          PASO,
        );
        expect(plan.otroTramoDesde([quieto.donde[0], -quieto.donde[1]])).toBe(true);
        const ruta = plan.rutaVisible();
        const p0 = ruta[0]!;
        const p1 = ruta[1]!;
        const sale = rodarAFondo(plan, esc, a, tier, 60, {
          desde: { p: p0, rumbo: Math.atan2(p1[0] - p0[0], -(p1[1] - p0[1])), v: 0 },
        });
        apuntar(`${tier.id} ${avion} sale otra vez`, sale);
        expect(sale.arranco, sale.fases.join(" → ")).not.toBeNull();
        expect(sale.arranco!).toBeLessThan(10);
        expect(sale.fases, sale.fases.join(" → ")).toContain("rodando");
        expect(sale.maxima).toBeGreaterThan(3);
      }, 120_000);

  for (const tier of [GUYRAMI, TUKA])
    it(`${tier.id}: quien se paró antes de su sitio llega a él con el gas a fondo`, () => {
      const { a, plan, llegada } = alPuesto(tier, "jaz-50", 20);
      expect(llegada.fases.at(-1), llegada.fases.join(" → ")).toBe("en-puesto");
      const sigue = aFondoEnElPuesto(plan, a, tier, llegada, 90);
      apuntarPuesto(`${tier.id} jaz-50 parado a 20 m`, sigue);
      // El señalero lo llama, y el juego lo lleva hasta el punto, sin pasarse.
      expect(sigue.gestos).toContain("adelante");
      expect(sigue.movido).toBeGreaterThan(15);
      expect(sigue.fases.at(-1), sigue.fases.join(" → ")).toBe("en-puesto");
      expect(Math.abs(sigue.queda), `la rueda a ${sigue.queda.toFixed(2)} m del punto`).toBeLessThan(1.5);
      expect(sigue.loMasPasado).toBeLessThan(1.5);
    }, 120_000);

  for (const avion of ["jaz-50", "jaz-90"])
    it(`taguato: con el ${avion} la velocidad es de quien juega, y el señalero y la instructora lo dicen`, () => {
      const { a, plan, llegada } = alPuesto(TAGUATO, avion);
      expect(llegada.fases.at(-1), llegada.fases.join(" → ")).toBe("en-puesto");
      const sevan = aFondoEnElPuesto(plan, a, TAGUATO, llegada, 20, true);
      apuntarPuesto(`taguato ${avion} en el puesto`, sevan);
      // No se impone: el gas a fondo lo saca del puesto.
      expect(sevan.delJuego).toBe(false);
      expect(sevan.movido).toBeGreaterThan(10);
      // Pero el señalero cruza los bastones y suena «te pasaste, frená y volvé».
      expect(sevan.gestos).toContain("alto");
      expect(sevan.teLoPasaste).toBe(true);
      // Y la raya vuelve, hacia el mismo puesto.
      expect(sevan.fases).toContain("a-plataforma");
    }, 120_000);
});

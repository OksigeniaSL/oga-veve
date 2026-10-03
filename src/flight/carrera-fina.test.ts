/**
 * **El control fino en la carrera de aterrizaje**: lo que hacen el timón (Q/E)
 * y las flechas por la pista, deprisa y despacio, con el teclado.
 *
 * Con `OGA_MEDIR=1` saca la tabla.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { CoefficientFlightModel } from "./fdm";
import { ArcadeFlightModel } from "./arcade";
import { neutralControls, type ControlInputs, type FlightModel } from "./model";
import { GUYRAMI, TAGUATO_RUVICHA, TUKA, type Tier } from "./tiers";
import { DEPRISA_EN_TIERRA, PulsoDeTecla } from "./palanca-de-teclado";

const DT = 1 / 60;
const NUDO = 0.514444;
const EN_GRADOS = 180 / Math.PI;

/** Las rampas de la tecla en `input.ts`: al apretar y al soltar, por segundo. */
const KEY_RAMP = 2.6;
const KEY_CENTRE = 3.4;
function rampa(actual: number, meta: number): number {
  const ritmo = Math.abs(meta) > Math.abs(actual) ? KEY_RAMP : KEY_CENTRE;
  const d = meta - actual;
  return Math.abs(d) <= ritmo * DT ? meta : actual + Math.sign(d) * ritmo * DT;
}

interface EnPista {
  modelo: FlightModel;
  a: AircraftConfig;
  mandos: ControlInputs;
  v0: number;
  /** Las teclas pasan por su toque de pie, como en `input.ts`. */
  pedal: PulsoDeTecla;
  volante: PulsoDeTecla;
  reloj: number;
}

/** Rodando por el eje a `kt` nudos, con flaps de aterrizar, rumbo norte. */
function enPista(a: AircraftConfig, tier: Tier, kt: number): EnPista {
  const v0 = kt * NUDO;
  let modelo: FlightModel;
  if (tier.model === "simple") {
    const m = new ArcadeFlightModel({ aircraft: a, ground: () => 0 });
    m.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: v0 });
    modelo = m;
  } else {
    const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: tier.assists });
    const s = m.state;
    s.onGround = true;
    s.position.set(0, a.gearHeight, 0);
    s.velocity.set(0, 0, -v0);
    s.heading = 0;
    modelo = m;
  }
  const mandos = { ...neutralControls(), flaps: 1 };
  const p = { modelo, a, mandos, v0, pedal: new PulsoDeTecla(), volante: new PulsoDeTecla(), reloj: 0 };
  rueda(p, 1, () => ({}));
  return p;
}

/** La diferencia de dos rumbos, rad, entre −π y π. */
const dif = (a: number, b: number): number => {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
};

/** Hacia dónde va, rad: rumbo cero es −z. */
const rumboDe = (p: EnPista): number => {
  const v = p.modelo.state.velocity;
  if (Math.hypot(v.x, v.z) < 0.5) return p.modelo.state.heading;
  return Math.atan2(v.x, -v.z);
};
const proaDe = (p: EnPista): number => p.modelo.state.heading;

/**
 * Rueda `segundos` con la velocidad sostenida —como si la carrera fuera más
 * larga— y las teclas de `pide(t)`: `timon` es Q/E y `flecha` las flechas, −1,
 * 0 o 1, con las rampas de `input.ts`.
 */
function rueda(
  p: EnPista,
  segundos: number,
  pide: (t: number) => { timon?: number; flecha?: number },
  medir?: (t: number) => void,
): void {
  for (let t = 0; t < segundos - 1e-9; t += DT) {
    const k = pide(t);
    const s = p.modelo.state;
    const v = s.groundSpeed;
    p.mandos.throttle = Math.max(0, Math.min(1, 0.3 + 0.3 * (p.v0 - v)));
    const carrera = !sinPulso && s.onGround && v > DEPRISA_EN_TIERRA;
    p.mandos.rudder = rampa(p.mandos.rudder, p.pedal.paso(k.timon ?? 0, p.reloj, carrera));
    p.mandos.aileron = rampa(p.mandos.aileron, p.volante.paso(k.flecha ?? 0, p.reloj, carrera));
    p.modelo.step(DT, p.mandos);
    p.reloj += DT;
    medir?.(t + DT);
  }
}

interface DelToque {
  /** Lo que cambia la proa con un toque de una décima, ° a los 3 s. */
  rumbo: number;
  /** Lo más deprisa que gira, °/s, y cuándo empieza a moverse 0,1°, s. */
  pico: number;
  arranca: number;
  /** Lo que cambia la proa manteniendo la tecla un segundo, °. */
  unSegundo: number;
  /** Lo más de lado que tira mantenida, g. */
  g: number;
}

function delToque(a: AircraftConfig, tier: Tier, kt: number, eje: "timon" | "flecha"): DelToque {
  const p = enPista(a, tier, kt);
  const r0 = proaDe(p);
  let pico = 0;
  let arranca = Infinity;
  let antes = r0;
  rueda(
    p,
    3,
    (t) => ({ [eje]: t < 0.1 ? 1 : 0 }),
    (t) => {
      const r = proaDe(p);
      pico = Math.max(pico, Math.abs(dif(r, antes) / DT) * EN_GRADOS);
      antes = r;
      if (arranca === Infinity && Math.abs(dif(r, r0)) * EN_GRADOS >= 0.1) arranca = t;
    },
  );
  const rumbo = dif(proaDe(p), r0) * EN_GRADOS;
  const q = enPista(a, tier, kt);
  const q0 = proaDe(q);
  let g = 0;
  let qAntes = rumboDe(q);
  rueda(q, 3, (t) => ({ [eje]: t < 1 ? 1 : 0 }), () => {
    const r = rumboDe(q);
    g = Math.max(g, (Math.abs(dif(r, qAntes) / DT) * q.modelo.state.groundSpeed) / 9.81);
    qAntes = r;
  });
  return { rumbo, pico, arranca, unSegundo: dif(proaDe(q), q0) * EN_GRADOS, g };
}

interface AlEje {
  dentro: number;
  cruces: number;
  fuera: number;
  toques: number;
  picoDeGiro: number;
}

/**
 * **Un piloto que vuelve al eje a toques** de Q/E desde `desvio` metros, a
 * `kt` nudos sostenidos, con tres décimas de retraso. Quiere volver en unos
 * tres segundos, sin pasar de dos grados de rumbo respecto a la pista, y da
 * un toque cuando su rumbo se aparta del que quiere más de tres décimas de
 * grado; con medio metro y recto, está contento.
 */
function alEje(
  a: AircraftConfig,
  tier: Tier,
  kt: number,
  desvio = 5,
  eje: "timon" | "flecha" = "timon",
): AlEje {
  const p = enPista(a, tier, kt);
  let toqueEnCurso = 0;
  p.modelo.state.position.x += desvio;
  const atras = Math.round(0.3 / DT);
  const visto: { x: number; r: number }[] = [];
  let ultimo = -Infinity;
  let toques = 0;
  let dentro = 0;
  let cruces = 0;
  let fuera = 0;
  let lado = Math.sign(desvio);
  let picoDeGiro = 0;
  let antes = proaDe(p);
  rueda(
    p,
    20,
    (t) => {
      visto.push({ x: p.modelo.state.position.x, r: rumboDe(p) });
      const ve = visto.length > atras ? visto[visto.length - 1 - atras]! : visto[0]!;
      if (t - ultimo < 0.1) return { [eje]: Math.sign(toqueEnCurso) };
      if (t - ultimo < 0.8) return {};
      const V = Math.max(p.modelo.state.groundSpeed, 1);
      const quiere = Math.max(-2 / EN_GRADOS, Math.min(2 / EN_GRADOS, -ve.x / (3 * V)));
      const falta = quiere - dif(ve.r, 0);
      const contento = Math.abs(ve.x) < 0.5 && Math.abs(dif(ve.r, 0)) < 0.3 / EN_GRADOS;
      if (Math.abs(falta) > 0.3 / EN_GRADOS && !contento) {
        ultimo = t;
        toqueEnCurso = Math.sign(falta);
        toques++;
        return { [eje]: toqueEnCurso };
      }
      return {};
    },
    (t) => {
      const x = p.modelo.state.position.x;
      if (Math.abs(x) >= 1) dentro = t;
      if (x * lado < -0.5) {
        cruces++;
        lado = Math.sign(x);
      }
      fuera = Math.max(fuera, Math.abs(x));
      const r = proaDe(p);
      picoDeGiro = Math.max(picoDeGiro, Math.abs(dif(r, antes) / DT) * EN_GRADOS);
      antes = r;
    },
  );
  return { dentro, cruces, fuera, toques, picoDeGiro };
}

const entorno =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const medir = import.meta.env.OGA_MEDIR || entorno.OGA_MEDIR;
/** Para medir el antes: las teclas sin el toque de pie. */
const sinPulso = Boolean(entorno.OGA_SIN_PULSO);
const f1 = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : "∞").padStart(6);
const avion = (id: string): AircraftConfig => AIRCRAFT.find((a) => a.id === id)!;
const AVIONES = ["jaz-120", "jaz-90", "jaz-60"];
/** Recién tocado: 130 nudos, o cinco menos que su Vref el que va más despacio. */
const deprisa = (a: AircraftConfig): number => Math.round(Math.min(130, a.approachSpeed / NUDO - 5));
const PELDANOS: readonly Tier[] = [GUYRAMI, TUKA, TAGUATO_RUVICHA];

describe.runIf(medir)("la carrera, medida", () => {
  it("toques y tecla mantenida", () => {
    const filas = [
      "\navión    peldaño          kt  eje    | toque: rumbo ° · pico °/s · arranca s | 1 s: rumbo ° · g de lado",
    ];
    for (const id of AVIONES)
      for (const tier of PELDANOS)
        for (const kt of [deprisa(avion(id)), 80, 30])
          for (const eje of ["timon", "flecha"] as const) {
            const r = delToque(avion(id), tier, kt, eje);
            filas.push(
              `${id.padEnd(8)} ${tier.id.padEnd(16)} ${String(kt).padStart(3)} ${eje.padEnd(6)} |${f1(r.rumbo, 2)} ·${f1(r.pico, 1)} ·${f1(r.arranca, 2)}         |${f1(r.unSegundo, 1)} ·${f1(r.g, 2)}`,
            );
          }
    console.log(filas.join("\n"));
  });

  it("al eje desde 5 m", () => {
    const filas = ["\navión    peldaño          kt  eje    | dentro s · cruces · lo más lejos m · toques · pico de giro °/s"];
    for (const id of AVIONES)
      for (const tier of PELDANOS)
        for (const kt of [deprisa(avion(id)), 80])
          for (const eje of ["timon", "flecha"] as const) {
            const r = alEje(avion(id), tier, kt, 5, eje);
            filas.push(
              `${id.padEnd(8)} ${tier.id.padEnd(16)} ${String(kt).padStart(3)} ${eje.padEnd(6)} |${f1(r.dentro, 1)} · ${r.cruces} ·${f1(r.fuera, 1)} · ${String(r.toques).padStart(3)} ·${f1(r.picoDeGiro, 1)}`,
            );
          }
    console.log(filas.join("\n"));
  });
});

// ── Las pruebas ─────────────────────────────────────────────────────────────

describe("el pedal en la carrera", () => {
  const casos = AVIONES.flatMap((id) =>
    PELDANOS.flatMap((tier) => [deprisa(avion(id)), 80].map((kt) => ({ a: avion(id), tier, kt }))),
  );
  const donde = (c: { a: AircraftConfig; tier: Tier; kt: number }): string =>
    `${c.a.id} en ${c.tier.id} a ${c.kt} kt`;

  it("un toque de Q o E corrige poco y se nota, también en Guyrami", () => {
    for (const c of casos) {
      const r = delToque(c.a, c.tier, c.kt, "timon");
      expect(r.rumbo, donde(c)).toBeGreaterThan(0.3);
      expect(r.rumbo, donde(c)).toBeLessThan(1.5);
    }
  });

  it("mantenida gira con decisión, sin tirar de lado más de medio g", () => {
    for (const c of casos) {
      const r = delToque(c.a, c.tier, c.kt, "timon");
      expect(r.unSegundo, donde(c)).toBeGreaterThan(2.5 * r.rumbo);
      expect(r.unSegundo, donde(c)).toBeLessThan(6);
      expect(r.g, donde(c)).toBeLessThan(0.5);
    }
  });

  it("desviado 5 m, un piloto a toques de pie vuelve al eje sin bandazos", () => {
    for (const c of casos) {
      const r = alEje(c.a, c.tier, c.kt);
      expect(r.dentro, donde(c)).toBeLessThan(8);
      expect(r.cruces, donde(c)).toBeLessThanOrEqual(1);
      // Sin apartarse del eje más de lo que empezó.
      expect(r.fuera, donde(c)).toBeLessThan(5.5);
    }
  });

  it("en Guyrami las flechas llevan el eje como el pedal", () => {
    for (const c of casos.filter((x) => x.tier === GUYRAMI)) {
      const r = alEje(c.a, c.tier, c.kt, 5, "flecha");
      expect(r.dentro, donde(c)).toBeLessThan(8);
      expect(r.cruces, donde(c)).toBeLessThanOrEqual(1);
    }
  });
});

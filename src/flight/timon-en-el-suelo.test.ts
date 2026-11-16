/**
 * **El timón automático con las ruedas en el suelo** (#196).
 *
 * En el aire la ayuda centra la bola, que es lo que hace un viraje coordinado.
 * En el suelo centrar la bola es llevar el morro al viento —lo mismo que ya
 * hace la veleta—, y en la 12 de Los Rodeos con el viento de casa el banco del
 * vuelo entero veía el JAZ 90 irse 28 m del eje. Aquí se mide, en la mesa y
 * sin el piloto del banco: la carrera con viento cruzado sin tocar nada y con
 * un crío que solo tiene el volante, una curva despacio por las calles, la
 * carrera de la toma y un viraje en el aire, que no tiene que cambiar.
 *
 * Con `OGA_MEDIR=1` saca la tabla.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { CoefficientFlightModel } from "./fdm";
import { flapsDeDespegue } from "./flaps";
import { neutralControls, type ControlInputs } from "./model";
import { TAGUATO, TAGUATO_RUVICHA, TUKA, type Tier } from "./tiers";

const DT = 1 / 60;
const KT = 0.514444;
const EN_GRADOS = 180 / Math.PI;
/** La 12 de Los Rodeos y su viento de casa: 12 kt del 040. Ver `scenarios.ts`. */
const PISTA = (120 * Math.PI) / 180;
const VIENTO_DE = 40;
const VIENTO_KT = 12;

const avion = (id: string): AircraftConfig => AIRCRAFT.find((a) => a.id === id)!;

/** El viento que viene de `deDonde` grados, hacia donde va: norte es −Z. */
function viento(deDonde: number, nudos: number): { x: number; z: number } {
  const rad = (deDonde * Math.PI) / 180;
  return { x: -Math.sin(rad) * nudos * KT, z: Math.cos(rad) * nudos * KT };
}

/** La diferencia de dos rumbos, rad, entre −π y π. */
function dif(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/** Del eje de la pista que pasa por el origen con rumbo `PISTA`, m: positivo a la derecha. */
function delEje(p: Vector3): number {
  // Rumbo cero es −Z; la derecha del rumbo `r` es (cos r, sin r) en (x, z).
  return p.x * Math.cos(PISTA) + p.z * Math.sin(PISTA);
}

function enLaPista(
  a: AircraftConfig,
  tier: Tier,
  conViento: boolean,
  rumbo = PISTA,
): CoefficientFlightModel {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: tier.assists });
  if (conViento) {
    const w = viento(VIENTO_DE, VIENTO_KT);
    m.ponerViento(w.x, w.z);
  }
  m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: rumbo, airspeed: 0 });
  return m;
}

interface Carrera {
  /** Lo más lejos del eje hasta la Vr, m, con signo: negativo es a la izquierda, al viento. */
  eje: number;
  /** El rumbo a la Vr respecto a la pista, °: negativo es al viento. */
  rumbo: number;
  /** Lo más que se ha torcido la proa en la carrera, °. */
  torcido: number;
  /** Segundos hasta la Vr; infinito si no llega. */
  segundos: number;
  /** Las veces que el modelo da las ruedas por despegadas antes de la Vr. */
  despegadas: number;
  /** Con el piloto del banco: lo más de pedal que pisa, y lo que lleva acumulado a la Vr. */
  pie: number;
  acumulado: number;
}

/**
 * **La carrera de despegue hasta la Vr**, gas a fondo y los flaps de despegue.
 *
 * `volante` es lo que hace quien juega con el mando de alabeo, que en el suelo
 * es la rueda de morro: nada, o un crío que lo gira hacia el eje —hacia donde
 * ve la raya, y más cuanto más torcido va—, que es lo único que tiene.
 *
 * Y `banco`, el piloto del banco del vuelo entero en la carrera, con sus pies:
 * los tres términos del timón y el alerón al viento a partir de los veintiocho
 * metros por segundo, copiados de `scripts/verificar-vuelo-entero.mjs`. Es para
 * saber si con la ayuda nueva ese pie le sobra o se queda corto.
 */
function carrera(
  a: AircraftConfig,
  tier: Tier,
  volante: "nada" | "al-eje" | "banco" | "banco-sin-aleron",
  conViento = true,
): Carrera {
  const m = enLaPista(a, tier, conViento);
  const c: ControlInputs = { ...neutralControls(), throttle: 1, flaps: flapsDeDespegue(a) };
  let eje = 0;
  let torcido = 0;
  let despegadas = 0;
  let pie = 0;
  let acumulado = 0;
  for (let t = 0; t < 90; t += DT) {
    const s = m.state;
    if ((volante === "banco" || volante === "banco-sin-aleron") && s.onGround) {
      const lejos = delEje(s.position);
      const mira = Math.max(60, 3 * s.groundSpeed);
      const falta = dif(PISTA - Math.atan2(lejos, mira), s.heading);
      const pide = falta * 3 + acumulado - s.yawRate;
      if (Math.abs(pide) < 1 || Math.sign(falta) !== Math.sign(pide))
        acumulado = Math.max(-0.8, Math.min(0.8, acumulado + falta * 2.5 * DT));
      c.rudder = Math.max(-1, Math.min(1, pide));
      c.aileron =
        s.groundSpeed <= 28
          ? Math.max(-1, Math.min(1, falta * 1.2))
          : volante === "banco"
            ? Math.max(-0.5, Math.min(0.5, s.beta * 3))
            : 0;
      pie = Math.max(pie, Math.abs(c.rudder));
    } else if (volante === "al-eje") {
      const lejos = delEje(s.position);
      const proa = dif(s.heading, PISTA);
      // A la raya que se ve unos cien metros por delante, como mira un crío.
      const quiere = -Math.atan2(lejos, 100);
      c.aileron = Math.max(-1, Math.min(1, (quiere - proa) * 4));
    }
    const enTierra = s.onGround;
    m.step(DT, c);
    if (enTierra && !s.onGround) despegadas++;
    const lejos = delEje(s.position);
    if (Math.abs(lejos) > Math.abs(eje)) eje = lejos;
    torcido = Math.max(torcido, Math.abs(dif(s.heading, PISTA)) * EN_GRADOS);
    if (s.airspeed >= a.rotationSpeed)
      return {
        eje,
        rumbo: dif(s.heading, PISTA) * EN_GRADOS,
        torcido,
        segundos: t,
        despegadas,
        pie,
        acumulado,
      };
  }
  return {
    eje,
    rumbo: dif(m.state.heading, PISTA) * EN_GRADOS,
    torcido,
    segundos: Infinity,
    despegadas,
    pie,
    acumulado,
  };
}

/**
 * **La carrera de la toma**: recién tocado a la Vref por el eje, con el viento
 * cruzado, gas fuera y freno a medio; hasta pararse, sin tocar el volante.
 *
 * Con `cangrejo`, tocando con el morro al viento lo que hace falta para volar
 * por el eje sin derrape, que es como llega quien no quita el cangrejo con el
 * pie antes de tocar —en los peldaños con ayuda, todos—; sin él, ya alineado.
 */
function toma(
  a: AircraftConfig,
  tier: Tier,
  cangrejo: boolean,
): { eje: number; rumbo: number; torcido: number; despegadas: number } {
  const cruzado = VIENTO_KT * KT * Math.sin(((VIENTO_DE - 120) * Math.PI) / 180);
  const angulo = cangrejo ? Math.asin(cruzado / a.approachSpeed) : 0;
  const m = enLaPista(a, tier, true, PISTA + angulo);
  const s = m.state;
  s.velocity.set(Math.sin(PISTA) * a.approachSpeed, 0, -Math.cos(PISTA) * a.approachSpeed);
  s.onGround = true;
  // Con el morro abajo, que es como se sujeta la rueda de morro en el suelo
  // después de tocar: sin eso, a la Vref y con los flaps fuera el ala lo
  // vuelve a levantar.
  const c: ControlInputs = {
    ...neutralControls(),
    throttle: 0,
    flaps: 1,
    brakes: 0.5,
    elevator: -0.3,
  };
  let eje = 0;
  let torcido = 0;
  let despegadas = 0;
  for (let t = 0; t < 120; t += DT) {
    const enTierra = s.onGround;
    m.step(DT, c);
    if (enTierra && !s.onGround) despegadas++;
    const lejos = delEje(s.position);
    if (Math.abs(lejos) > Math.abs(eje)) eje = lejos;
    if (t > 3) torcido = Math.max(torcido, Math.abs(dif(s.heading, PISTA)) * EN_GRADOS);
    if (s.groundSpeed < 1) break;
  }
  return { eje, rumbo: dif(s.heading, PISTA) * EN_GRADOS, torcido, despegadas };
}

/**
 * **Una curva de noventa grados por las calles**, a paso de rodaje (6 m/s) y
 * con el volante entero: cuánto tarda y qué radio sale. Sin viento es lo que
 * mide si la ayuda se mete con la rueda; con él, rodando hacia el norte, entra
 * por la derecha y la curva es hacia él.
 */
function curva(
  a: AircraftConfig,
  tier: Tier,
  conViento = false,
): { segundos: number; radio: number } {
  const m = enLaPista(a, tier, conViento, 0);
  const s = m.state;
  const c: ControlInputs = { ...neutralControls(), throttle: 0 };
  // Rodando recto a 6 m/s antes de girar.
  s.velocity.set(0, 0, -6);
  const sostener = (): void => {
    const v = s.groundSpeed;
    c.throttle = Math.max(0, Math.min(1, 0.15 + 0.3 * (6 - v)));
    c.brakes = v > 7 ? 0.5 : 0;
  };
  for (let t = 0; t < 2; t += DT) {
    sostener();
    m.step(DT, c);
  }
  const desde = s.position.clone();
  const r0 = s.heading;
  c.aileron = 1;
  for (let t = 0; t < 60; t += DT) {
    sostener();
    m.step(DT, c);
    if (dif(s.heading, r0) >= Math.PI / 2) {
      // Noventa grados: el radio es lo que se ha desplazado de lado, de media.
      const d = s.position.clone().sub(desde);
      return { segundos: t, radio: (Math.abs(d.x) + Math.abs(d.z)) / 2 };
    }
  }
  return { segundos: Infinity, radio: Infinity };
}

/**
 * **El volante en la carrera, donde la rueda ya no manda**: rodando por la
 * pista sin viento a 40 m/s —o un poco por debajo de la Vr, el que la tiene
 * antes—, el volante entero un segundo; lo que gira la proa en tres, °.
 */
function volanteDeprisa(a: AircraftConfig, tier: Tier): number {
  const v0 = Math.min(40, 0.95 * a.rotationSpeed);
  const m = enLaPista(a, tier, false, 0);
  const s = m.state;
  s.velocity.set(0, 0, -v0);
  const c: ControlInputs = { ...neutralControls(), throttle: 0.5, elevator: -0.2 };
  const sostener = (): void => {
    c.throttle = Math.max(0, Math.min(1, 0.5 + 0.3 * (v0 - s.groundSpeed)));
  };
  for (let t = 0; t < 1; t += DT) {
    sostener();
    m.step(DT, c);
  }
  const r0 = s.heading;
  for (let t = 0; t < 3; t += DT) {
    sostener();
    c.aileron = t < 1 ? 1 : 0;
    m.step(DT, c);
  }
  return dif(s.heading, r0) * EN_GRADOS;
}

/**
 * **Un viraje en el aire, para ver que ahí no cambia nada**: treinta grados de
 * inclinación sostenida con el alerón y cuánto derrape queda a los diez
 * segundos.
 */
function viraje(a: AircraftConfig, tier: Tier): number {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: tier.assists });
  m.reset({ position: new Vector3(0, 1500, 0), heading: 0, airspeed: a.cruiseSpeed * 0.8 });
  const c: ControlInputs = { ...neutralControls(), throttle: 0.7 };
  let derrape = 0;
  for (let t = 0; t < 12; t += DT) {
    const s = m.state;
    // Inclinación por la orientación: el ala derecha abajo es positivo.
    const q = s.orientation;
    const derecha = new Vector3(1, 0, 0).applyQuaternion(q);
    const abajo = new Vector3(0, -1, 0).applyQuaternion(q);
    const banco = Math.atan2(-derecha.y, -abajo.y);
    c.aileron = Math.max(-1, Math.min(1, (0.52 - banco) * 2 - s.rollRate * 0.5));
    c.elevator = 0.15;
    m.step(DT, c);
    if (t > 10) derrape = Math.max(derrape, Math.abs(s.beta) * EN_GRADOS);
  }
  return derrape;
}

const entorno =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const medir = import.meta.env.OGA_MEDIR || entorno.OGA_MEDIR;
const f1 = (n: number, d = 1): string => (Number.isFinite(n) ? n.toFixed(d) : "∞").padStart(6);
const AVIONES = ["jaz-20", "jaz-25", "jaz-40", "jaz-50", "jaz-60", "jaz-90", "jaz-120"];
const PELDANOS: readonly Tier[] = [TUKA, TAGUATO, TAGUATO_RUVICHA];

/** El mismo peldaño sin el timón automático: lo que la ayuda no tiene que cambiar. */
const sinTimon = (tier: Tier): Tier => ({ ...tier, assists: { ...tier.assists, autoRudder: 0 } });

describe.runIf(medir)("el timón en el suelo, medido", () => {
  it("la carrera de despegue con viento cruzado", () => {
    const filas = [
      "\navión    peldaño          | nada: eje m · rumbo ° · s · desp | crío al volante: eje m · torcido ° | sin viento: eje m | piloto del banco: eje m · pie · acumulado | sin alerón al viento: eje m · pie",
    ];
    for (const id of AVIONES)
      for (const tier of PELDANOS) {
        const a = avion(id);
        const n = carrera(a, tier, "nada");
        const v = carrera(a, tier, "al-eje");
        const sv = carrera(a, tier, "nada", false);
        const b = carrera(a, tier, "banco");
        const bs = carrera(a, tier, "banco-sin-aleron");
        filas.push(
          `${id.padEnd(8)} ${tier.id.padEnd(16)} |${f1(n.eje)} ·${f1(n.rumbo)} ·${f1(n.segundos, 0)} ·${String(n.despegadas).padStart(3)} |${f1(v.eje)} ·${f1(v.torcido)}    |${f1(sv.eje, 2)}       |${f1(b.eje)} ·${f1(b.pie, 2)} ·${f1(b.acumulado, 2)} |${f1(bs.eje)} ·${f1(bs.pie, 2)}`,
        );
      }
    console.log(filas.join("\n"));
  });

  it("la toma, la curva, el volante deprisa y el viraje", () => {
    const filas = [
      "\navión    peldaño          | toma: eje m · rumbo ° | en cangrejo: eje m · torcido ° · desp | curva: s · radio m | con viento: s · radio m | volante a 40 m/s: ° | aire: derrape °",
    ];
    for (const id of AVIONES)
      for (const tier of PELDANOS) {
        const a = avion(id);
        const tm = toma(a, tier, false);
        const tc = toma(a, tier, true);
        const cu = curva(a, tier);
        const cv = curva(a, tier, true);
        filas.push(
          `${id.padEnd(8)} ${tier.id.padEnd(16)} |${f1(tm.eje)} ·${f1(tm.rumbo)}  |${f1(tc.eje)} ·${f1(tc.torcido)} ·${String(tm.despegadas + tc.despegadas).padStart(3)}  |${f1(cu.segundos, 2)} ·${f1(cu.radio)}  |${f1(cv.segundos, 2)} ·${f1(cv.radio)}  |${f1(volanteDeprisa(a, tier))}  |${f1(viraje(a, tier), 2)}`,
        );
      }
    console.log(filas.join("\n"));
  });
});

// ── Las pruebas ─────────────────────────────────────────────────────────────

describe("el timón automático en el suelo", () => {
  const CON_AYUDA: readonly Tier[] = [TUKA, TAGUATO];
  const casos = AVIONES.flatMap((id) => CON_AYUDA.map((tier) => ({ a: avion(id), tier })));
  const donde = (c: { a: AircraftConfig; tier: Tier }): string => `${c.a.id} en ${c.tier.id}`;

  it("sin tocar nada, la carrera con viento cruzado va por el eje", () => {
    for (const c of casos) {
      const r = carrera(c.a, c.tier, "nada");
      expect(Math.abs(r.eje), donde(c)).toBeLessThan(4);
      expect(Math.abs(r.rumbo), donde(c)).toBeLessThan(1.5);
    }
  });

  it("y no empuja hacia el viento: se aparta menos que sin ayuda", () => {
    for (const c of casos) {
      const con = carrera(c.a, c.tier, "nada");
      const sin = carrera(c.a, sinTimon(c.tier), "nada");
      expect(Math.abs(con.eje), donde(c)).toBeLessThan(Math.abs(sin.eje));
    }
  });

  it("un crío que solo tiene el volante lleva el eje hasta la Vr", () => {
    for (const c of casos) {
      const r = carrera(c.a, c.tier, "al-eje");
      expect(Math.abs(r.eje), donde(c)).toBeLessThan(6);
      expect(r.torcido, donde(c)).toBeLessThan(3);
    }
  });

  it("donde la rueda ya no manda, el volante sigue girando con el timón", () => {
    for (const c of casos) {
      const con = volanteDeprisa(c.a, c.tier);
      const sin = volanteDeprisa(c.a, sinTimon(c.tier));
      expect(con - sin, donde(c)).toBeGreaterThan(1);
    }
  });

  it("rodando despacio por las calles, la curva sale igual que sin la ayuda", () => {
    for (const c of casos) {
      const con = curva(c.a, c.tier);
      const sin = curva(c.a, sinTimon(c.tier));
      expect(con.segundos, donde(c)).toBeCloseTo(sin.segundos, 2);
      expect(con.radio, donde(c)).toBeCloseTo(sin.radio, 1);
      // Y con viento, casi: el pie que se quedó puesto contra la veleta antes
      // de la curva sigue puesto, que es lo que hace quien lo pisa.
      const conV = curva(c.a, c.tier, true);
      const sinV = curva(c.a, sinTimon(c.tier), true);
      expect(Math.abs(conV.segundos - sinV.segundos), donde(c)).toBeLessThan(0.15);
    }
  });

  it("al tocar en cangrejo con viento cruzado, quita el cangrejo y sigue en la pista", () => {
    for (const c of casos) {
      const r = toma(c.a, c.tier, true);
      // La pista más estrecha de un avión de pasaje tiene treinta metros:
      // quince a cada lado del eje.
      expect(Math.abs(r.eje), donde(c)).toBeLessThan(15);
      expect(Math.abs(r.rumbo), donde(c)).toBeLessThan(3);
    }
  });

  it("y en la carrera de la toma ya alineado, por el eje", () => {
    for (const c of casos) {
      const r = toma(c.a, c.tier, false);
      expect(Math.abs(r.eje), donde(c)).toBeLessThan(3);
    }
  });
});

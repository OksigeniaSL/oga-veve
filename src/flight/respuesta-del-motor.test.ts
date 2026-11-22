import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "./fdm";
import {
  AIRCRAFT,
  ARAI,
  ARASUNU,
  JAZ_50,
  MAINUMBY,
  PANAMBI,
  PYKASU,
  TIJERETA,
  YVAGA,
  type AircraftConfig,
} from "./aircraft";
import { NO_ASSISTS } from "./assists";
import { neutralControls } from "./model";
import { avanzarGiro, gasQueDa, giroAsentado } from "./respuesta-del-motor";

const DT = 1 / 120;

/** Lo que tarda el motor en cruzar `umbral` con el gas de golpe en `hacia`, s. */
function tarda(a: AircraftConfig, desde: number, hacia: number, umbral: number): number {
  const giro = giroAsentado(a, desde);
  const cruza = (g: number): boolean => (hacia > desde ? g >= umbral : g <= umbral);
  for (let t = 0; t < 30; t += DT) {
    avanzarGiro(giro, a, hacia, DT);
    if (cruza(gasQueDa(giro, a))) return t + DT;
  }
  return Infinity;
}

/** Lo que da el motor a los `t` segundos de meter el gas de golpe desde el ralentí. */
function daA(a: AircraftConfig, t: number): number {
  const giro = giroAsentado(a, 0);
  for (let s = 0; s < t - 1e-9; s += DT) avanzarGiro(giro, a, 1, DT);
  return gasQueDa(giro, a);
}

const REACTORES = [ARAI, YVAGA, TIJERETA];
const TURBOHELICES = [JAZ_50, ARASUNU];
const PISTONES = [PYKASU, MAINUMBY, PANAMBI];

describe("el motor tarda lo que tarda", () => {
  it("cada avión de la flota dice en su ficha cuánto tarda su motor", () => {
    for (const a of AIRCRAFT) {
      expect(a.respuestaDelMotor.subida, a.id).toBeGreaterThanOrEqual(0);
      expect(a.respuestaDelMotor.bajada, a.id).toBeGreaterThanOrEqual(0);
    }
    expect([...REACTORES, ...TURBOHELICES, ...PISTONES].map((a) => a.id).sort()).toEqual(
      AIRCRAFT.map((a) => a.id).sort(),
    );
  });

  it("el reactor va del ralentí al 95 % del empuje de despegue en lo que dice su ficha, y nunca en más de lo que admite la norma", () => {
    // 14 CFR 33.73(b): cinco segundos; el JT9D del JAZ 120, seis (AMC E 745).
    expect(tarda(ARAI, 0, 1, 0.95)).toBeCloseTo(5, 1);
    expect(tarda(TIJERETA, 0, 1, 0.95)).toBeCloseTo(5, 1);
    expect(tarda(YVAGA, 0, 1, 0.95)).toBeCloseTo(6, 1);
  });

  it("y la subida del reactor es lenta al principio y rápida al final: la curva del motor de turbina", () => {
    for (const a of REACTORES) {
      const total = a.respuestaDelMotor.subida;
      // El primer quinto del tiempo casi no empuja…
      expect(daA(a, total * 0.2), a.id).toBeLessThan(0.1);
      // …y el último quinto da mucho más empuje por segundo que el primero.
      const primero = daA(a, total * 0.2) - daA(a, 0);
      const penultimo = daA(a, total * 0.6) - daA(a, total * 0.4);
      expect(penultimo, a.id).toBeGreaterThan(primero * 4);
    }
  });

  it("la ida al aire se certifica con el empuje de los ocho segundos (14 CFR 25.119), y con las palancas llevadas en dos ya está ahí", () => {
    for (const a of REACTORES) {
      const giro = giroAsentado(a, 0);
      for (let t = 0; t < 8 - 1e-9; t += DT) avanzarGiro(giro, a, Math.min(1, (t + DT) / 2), DT);
      expect(gasQueDa(giro, a), a.id).toBeGreaterThan(0.95);
    }
  });

  it("el turbohélice tarda unos segundos, menos que el reactor", () => {
    for (const a of TURBOHELICES) {
      expect(tarda(a, 0, 1, 0.95), a.id).toBeCloseTo(4, 1);
      expect(daA(a, 1), a.id).toBeLessThan(0.5);
    }
  });

  it("al bajar el gas también tarda, y el empuje del reactor se va antes de lo que tardó en llegar", () => {
    for (const a of [...REACTORES, ...TURBOHELICES]) {
      expect(tarda(a, 1, 0, 0.05), a.id).toBeCloseTo(a.respuestaDelMotor.bajada, 1);
    }
    for (const a of REACTORES)
      expect(tarda(a, 1, 0, 0.05), a.id).toBeLessThan(tarda(a, 0, 1, 0.95));
  });

  it("el pistón responde como antes: en el mismo paso", () => {
    for (const a of PISTONES) {
      const giro = giroAsentado(a, 0);
      avanzarGiro(giro, a, 0.7, DT);
      expect(gasQueDa(giro, a), a.id).toBeCloseTo(0.7, 9);
      avanzarGiro(giro, a, 0.2, DT);
      expect(gasQueDa(giro, a), a.id).toBeCloseTo(0.2, 9);
    }
  });

  it("un motor recién colocado ya da lo que pide su gas: no se hunde la final colocada", () => {
    for (const a of [...REACTORES, ...TURBOHELICES]) {
      const giro = giroAsentado(a, 0.45);
      avanzarGiro(giro, a, 0.45, DT);
      expect(gasQueDa(giro, a), a.id).toBeCloseTo(0.45, 9);
    }
  });

  describe("en el modelo de vuelo", () => {
    function enVuelo(a: AircraftConfig, gas: number): CoefficientFlightModel {
      const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: NO_ASSISTS });
      m.reset({
        position: new Vector3(0, 900, 0),
        heading: 0,
        airspeed: a.approachSpeed * 1.3,
        equilibrado: true,
      });
      m.step(DT, { ...neutralControls(), throttle: gas });
      return m;
    }

    it("el reactor empuja segundos después de meter el gas, y el sonido y la aguja siguen a eso", () => {
      const m = enVuelo(ARAI, 0);
      const enRalenti = m.empujeAhora();
      m.step(DT, { ...neutralControls(), throttle: 1 });
      // En el primer paso el empuje no se ha movido…
      expect(m.empujeAhora()).toBeLessThan(enRalenti + 0.01 * ARAI.maxThrust);
      expect(m.gasDelMotor()).toBeLessThan(0.01);
      for (let t = 0; t < 5; t += DT) m.step(DT, { ...neutralControls(), throttle: 1 });
      // …y a los cinco segundos da el 95 % de lo que pide.
      expect(m.gasDelMotor()).toBeGreaterThan(0.94);
    });

    it("la avioneta empuja en el mismo paso, como antes", () => {
      const m = enVuelo(PYKASU, 0);
      m.step(DT, { ...neutralControls(), throttle: 1 });
      expect(m.gasDelMotor()).toBeCloseTo(1, 9);
      expect(m.empujeAhora()).toBeGreaterThan(0.5 * PYKASU.maxThrust);
    });

    it("colocado en vuelo con un gas, el primer paso ya lo da", () => {
      const m = enVuelo(YVAGA, 0.6);
      expect(m.gasDelMotor()).toBeCloseTo(0.6, 6);
    });
  });
});

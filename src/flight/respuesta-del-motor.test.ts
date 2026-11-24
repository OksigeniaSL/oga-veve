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
import { airDensity, SEA_LEVEL_DENSITY } from "./atmosphere";
import {
  avanzarGiro,
  constantesHasta,
  DENSIDAD_QUE_BASTA,
  gasQueDa,
  giroAsentado,
  masLentoArriba,
} from "./respuesta-del-motor";

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

  describe("y arriba tarda más, con el aire fino (H78)", () => {
    const PIE = 0.3048;
    const sigma = (pies: number): number => airDensity(pies * PIE) / SEA_LEVEL_DENSITY;

    /** Lo mismo que `tarda`, con el aire de esa altura. */
    function tardaA(a: AircraftConfig, pies: number, desde: number, hacia: number, umbral: number): number {
      const giro = giroAsentado(a, desde);
      const cruza = (g: number): boolean => (hacia > desde ? g >= umbral : g <= umbral);
      for (let t = 0; t < 60; t += DT) {
        avanzarGiro(giro, a, hacia, DT, sigma(pies));
        if (cruza(gasQueDa(giro, a))) return t + DT;
      }
      return Infinity;
    }

    it("donde hay densidad de sobra es la ficha, bit a bit: todas las finales y carreras del juego", () => {
      // Hasta los seis mil pies de la estándar, que es el doble de alto que Los
      // Rodeos más su final, y con una tarde de calor en el campo más alto.
      for (const s of [1.1, 1, sigma(2000), sigma(5500), 0.85]) {
        expect(masLentoArriba(s), `${s}`).toEqual({ sube: 1, baja: 1 });
        for (const a of [...REACTORES, ...TURBOHELICES]) {
          const con = giroAsentado(a, 0.1);
          const sin = giroAsentado(a, 0.1);
          for (let i = 0; i < 600; i++) {
            const gas = i < 300 ? 0.9 : 0.05;
            avanzarGiro(con, a, gas, DT, s);
            avanzarGiro(sin, a, gas, DT);
            expect(con.fan).toBe(sin.fan);
            expect(con.nucleo).toBe(sin.nucleo);
          }
        }
      }
    });

    it("sale de la tabla de la NASA: sus tres tiempos, pasados a las dos etapas, entre los del nivel del mar", () => {
      /*
       * TM-2009-215668, tabla 1: altura, hasta el 50 %, del 10 al 90 % y hasta
       * asentarse en el 2 %, s. Acelerando y decelerando.
       */
      const TABLA = {
        sube: [
          [0, 0.72, 1.13, 2.02],
          [10000, 0.78, 1.25, 2.41],
          [25000, 0.94, 1.95, 2.51],
          [42000, 1.63, 3.66, 6.27],
        ],
        baja: [
          [0, 0.7, 0.68, 2.1],
          [10000, 0.76, 0.93, 1.63],
          [25000, 1.0, 1.83, 4.48],
          [42000, 1.6, 4.52, 9.63],
        ],
      } as const;
      const mitad = constantesHasta(0.5);
      const subida = constantesHasta(0.1) - constantesHasta(0.9);
      const asentado = constantesHasta(0.02);
      const media = (f: readonly number[]): number =>
        (f[1]! / mitad + f[2]! / subida + f[3]! / asentado) / 3;
      for (const que of ["sube", "baja"] as const) {
        const abajo = media(TABLA[que][0]!);
        for (const fila of TABLA[que].slice(1)) {
          const tabla = media(fila) / abajo;
          const ley = masLentoArriba(sigma(fila[0]!))[que];
          // Dentro de un octavo en las seis filas, y clavado arriba subiendo.
          expect(Math.abs(Math.log(ley / tabla)), `${que} ${fila[0]}: ${ley} y ${tabla}`).toBeLessThan(0.125);
        }
      }
      const arriba = masLentoArriba(sigma(42000)).sube;
      expect(arriba).toBeGreaterThan(2.7);
      expect(arriba).toBeLessThan(2.95);
    });

    it("y de 5.000 a 25.000 pies, lo que midió la NACA en el J47: de 5,5 a 8 segundos", () => {
      const ley = masLentoArriba(sigma(25000)).sube / masLentoArriba(sigma(5000)).sube;
      expect(ley / (8 / 5.5)).toBeGreaterThan(0.9);
      expect(ley / (8 / 5.5)).toBeLessThan(1.1);
    });

    it("el reactor en su crucero tarda más del doble, el turbohélice en el suyo casi la mitad más, y el pistón nada", () => {
      expect(tardaA(ARAI, 37000, 0, 1, 0.95)).toBeCloseTo(5 * masLentoArriba(sigma(37000)).sube, 1);
      expect(tardaA(ARAI, 37000, 0, 1, 0.95)).toBeGreaterThan(10);
      expect(tardaA(YVAGA, 35000, 0, 1, 0.95)).toBeGreaterThan(12);
      expect(tardaA(ARASUNU, 25000, 0, 1, 0.95)).toBeCloseTo(4 * 1.41, 1);
      expect(tardaA(ARAI, 37000, 1, 0, 0.05)).toBeGreaterThan(2.1 * 2.5);
      for (const a of PISTONES) expect(tardaA(a, 12000, 0, 1, 0.95), a.id).toBeLessThanOrEqual(DT + 1e-9);
    });

    it("crece con la altura sin saltos y con un aire absurdo no se va a infinito", () => {
      let antes = masLentoArriba(1);
      for (let p = 0; p <= 45000; p += 250) {
        const ahora = masLentoArriba(sigma(p));
        expect(ahora.sube).toBeGreaterThanOrEqual(antes.sube);
        expect(ahora.baja).toBeGreaterThanOrEqual(antes.baja);
        expect(ahora.sube - antes.sube).toBeLessThan(0.05);
        expect(ahora.baja).toBeGreaterThanOrEqual(ahora.sube);
        antes = ahora;
      }
      for (const s of [0, -1, NaN]) expect(Number.isFinite(masLentoArriba(s).sube)).toBe(true);
      expect(DENSIDAD_QUE_BASTA.baja).toBeLessThan(sigma(5500));
    });
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

    it("y el modelo le da su densidad: a once mil metros, a los cinco segundos el JAZ 90 aún va a medias", () => {
      const m = new CoefficientFlightModel({ aircraft: ARAI, ground: () => 0, assist: NO_ASSISTS });
      m.reset({
        position: new Vector3(0, 11000, 0),
        heading: 0,
        airspeed: ARAI.cruiseSpeed,
        equilibrado: true,
      });
      m.step(DT, { ...neutralControls(), throttle: 0 });
      for (let t = 0; t < 5; t += DT) m.step(DT, { ...neutralControls(), throttle: 1 });
      expect(m.gasDelMotor()).toBeLessThan(0.65);
      for (let t = 0; t < 6; t += DT) m.step(DT, { ...neutralControls(), throttle: 1 });
      expect(m.gasDelMotor()).toBeGreaterThan(0.9);
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

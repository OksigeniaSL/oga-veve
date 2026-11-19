/**
 * **El techo de servicio de cada avión de hélice**: la altura a la que, a
 * tope de gas, limpio y a su mejor velocidad, ya no sube cien pies por minuto
 * (ADR 0027, enmienda H37d).
 *
 * Se cuenta con lo mismo que vuela el modelo —`empujeLleno` contra
 * `resistenciaNivelado`, el exceso de potencia partido por el peso— y se
 * comprueba volando con el modelo de coeficientes una vez, a dos mil pies del
 * techo, porque una cuenta que no vuela lo mismo que el avión no prueba nada.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel, empujeLleno, timonQueSostiene } from "./fdm";
import {
  ARASUNU,
  conMasa,
  JAZ_50,
  loQueDaElMotor,
  masaDe,
  PANAMBI,
  type AircraftConfig,
} from "./aircraft";
import { neutralControls } from "./model";
import { airDensity, GRAVITY, indicatedAirspeed, SEA_LEVEL_DENSITY } from "./atmosphere";
import { resistenciaNivelado } from "./nivel-que-ahorra";
import { DE_SU_CLASE } from "./ficha-tecnica";

const KT = 0.514444;
const PIE = 0.3048;
const LIBRA = 0.45359237;
const DT = 1 / 120;
/** Cien pies por minuto, m/s: la definición del techo de servicio. */
const CIEN_PIES_POR_MINUTO = (100 * PIE) / 60;

/** Lo más que sube a esa altura, m/s, y a qué verdadera. */
function loMasQueSube(a: AircraftConfig, altura: number): { subida: number; verdadera: number } {
  let mejor = { subida: -Infinity, verdadera: 0 };
  for (let v = 20; v < 160; v += 0.5) {
    const sobra = empujeLleno(a, airDensity(altura), v) - resistenciaNivelado(a, altura, v);
    const subida = (sobra * v) / (masaDe(a) * GRAVITY);
    if (subida > mejor.subida) mejor = { subida, verdadera: v };
  }
  return mejor;
}

/** El techo de servicio, ft, de cien en cien. */
function techo(a: AircraftConfig): number {
  for (let pies = 0; pies < 50000; pies += 100) {
    if (loMasQueSube(a, pies * PIE).subida < CIEN_PIES_POR_MINUTO) return pies;
  }
  return 50000;
}

/** Lo de `helice-de-cada-avion.test.ts`: la indicada sostenida con el timón. */
function timonPara(a: AircraftConfig, m: CoefficientFlightModel, indicada: number, quiere: number): number {
  const e = timonQueSostiene(a, quiere * KT, 0) + (indicada - quiere) * KT * 0.05 - m.state.pitchRate * 1.2;
  return Math.max(-1, Math.min(1, e));
}

/** Volando, a tope, limpio y a esa indicada a esa altura: lo que sube, m/s. */
function subidaVolando(a: AircraftConfig, altura: number, kt: number): number {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
  const verdadera = (kt * KT) / Math.sqrt(airDensity(altura) / SEA_LEVEL_DENSITY);
  m.reset({ position: new Vector3(0, altura, 0), heading: 0, airspeed: verdadera, equilibrado: true });
  const paso = (): void => {
    const indicada = indicatedAirspeed(m.state.airspeed, m.state.position.y, m.aireDelDia()) / KT;
    m.step(DT, { ...neutralControls(), tren: 0, engineOn: true, throttle: 1, flaps: 0, elevator: timonPara(a, m, indicada, kt) });
  };
  for (let k = 0; k < Math.round(30 / DT); k++) paso();
  const desde = m.state.position.y;
  for (let k = 0; k < Math.round(20 / DT); k++) paso();
  return (m.state.position.y - desde) / 20;
}

describe("el techo del JAZ 50", () => {
  /*
   * **7.620 m, 25.000 ft, a 14.000 lb**: «Service Ceiling (rate of climb 100
   * ft/min., both engines at max. climb power)» (Viking, *Twin Otter Guardian
   * 400*, 2018). Subía a 28.900, y a su peso de la hoja, a 32.000.
   */
  it("a 14.000 lb, el de Viking, a un 5 %", () => {
    const t = techo(conMasa(JAZ_50, 14000 * LIBRA));
    expect(t).toBeGreaterThan(25000 * 0.95);
    expect(t).toBeLessThan(25000 * 1.05);
  });

  // A las 12.500 lb de su hoja de tipo sube algo más, y no los 32.000 de antes.
  it("a su peso máximo de la hoja, un poco más arriba, y lejos de los 32.000", () => {
    const t = techo(conMasa(JAZ_50, DE_SU_CLASE["jaz-50"]!.mtow!));
    expect(t).toBeGreaterThan(25000);
    expect(t).toBeLessThan(28000);
  });

  it("y la cuenta es lo que vuela el modelo: a dos mil pies del techo sube cerca de lo que dice", () => {
    const a = conMasa(JAZ_50, 14000 * LIBRA);
    const altura = (techo(a) - 2000) * PIE;
    const cuenta = loMasQueSube(a, altura);
    const indicada = (cuenta.verdadera / KT) * Math.sqrt(airDensity(altura) / SEA_LEVEL_DENSITY);
    const volando = subidaVolando(a, altura, indicada);
    expect(volando).toBeGreaterThan(cuenta.subida * 0.85);
    expect(volando).toBeLessThan(cuenta.subida * 1.15);
  });

  /*
   * Lo de abajo no se toca: su régimen plano sigue dando lo de nivel del mar
   * hasta nueve mil pies, así que su subida y sus cruceros de 170 y 181 nudos
   * son los de antes. Ver `helice-de-cada-avion.test.ts`.
   */
  it("hasta nueve mil pies, el motor da lo de nivel del mar", () => {
    for (const pies of [0, 5000, 8900]) {
      expect(loQueDaElMotor(JAZ_50, airDensity(pies * PIE) / SEA_LEVEL_DENSITY), `${pies} ft`).toBe(1);
    }
  });
});

describe("los que tienen el techo en la norma y no en el motor", () => {
  /*
   * El Seneca II y el 1900D tienen escrito 25.000 ft, y no es lo que sube su
   * motor: es lo que se aprueba. «Flight above 25,000 feet is not approved»
   * (Piper, manual del Seneca III, PA-34-220T, § 2.27; el que se ha podido
   * leer) y «Maximum Operating Pressure-Altitude Limit for normal operation
   * is 25,000 ft» (CAA de Nueva Zelanda, sobre el 1900D). Lo que se comprueba
   * es que su motor llegue a ella a su peso máximo.
   */
  for (const a of [PANAMBI, ARASUNU]) {
    it(`el ${a.id} llega a los 25.000 ft de su norma a su peso máximo`, () => {
      expect(techo(conMasa(a, DE_SU_CLASE[a.id]!.mtow!))).toBeGreaterThan(25000);
    });
  }
});

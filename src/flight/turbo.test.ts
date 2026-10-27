/**
 * **El turbo del JAZ 40**: sus dos Continental TSIO-360-E sostienen los 200 hp
 * de nivel del mar hasta los 12.000 pies, y por encima caen como en las curvas
 * de su fabricante (Continental, X30583, figura 2). Ver `loQueDaElMotor`.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, loQueDaElMotor, PANAMBI, PYKASU } from "./aircraft";
import { airDensity, SEA_LEVEL_DENSITY } from "./atmosphere";

const PIE = 0.3048;
const sigma = (pies: number) => airDensity(pies * PIE) / SEA_LEVEL_DENSITY;

describe("el motor con turbo", () => {
  it("lo lleva el bimotor de pistón, y solo él", () => {
    expect(AIRCRAFT.filter((a) => a.alturaCritica !== null).map((a) => a.id)).toEqual(["jaz-40"]);
    expect(PANAMBI.alturaCritica! / PIE).toBeCloseTo(12000, 6);
  });

  it("da lo de nivel del mar hasta su altitud crítica", () => {
    for (const pies of [0, 3000, 6000, 9000, 11900]) expect(loQueDaElMotor(PANAMBI, sigma(pies)), `${pies} ft`).toBe(1);
  });

  it("y por encima cae, como en las curvas de Continental: dos tercios a 25.000 pies", () => {
    // La figura 2 da unos 133 hp a fondo a 25.000 pies: dos tercios de los 200 de nivel del mar.
    expect(loQueDaElMotor(PANAMBI, sigma(25000))).toBeGreaterThan(0.6);
    expect(loQueDaElMotor(PANAMBI, sigma(25000))).toBeLessThan(0.7);
    // Y cada vez menos, sin saltos al pasar la crítica.
    let antes = loQueDaElMotor(PANAMBI, sigma(12000));
    expect(antes).toBeCloseTo(1, 3);
    for (let pies = 13000; pies <= 25000; pies += 1000) {
      const ahora = loQueDaElMotor(PANAMBI, sigma(pies));
      expect(ahora, `${pies} ft`).toBeLessThan(antes);
      antes = ahora;
    }
  });

  it("a la altura de su crucero da más que un atmosférico, que es para lo que lo lleva", () => {
    const crucero = airDensity(PANAMBI.alturaDeCrucero) / SEA_LEVEL_DENSITY;
    expect(loQueDaElMotor(PANAMBI, crucero)).toBeGreaterThan(loQueDaElMotor(PYKASU, crucero));
  });

  it("y los demás, con la ley de siempre", () => {
    expect(loQueDaElMotor(PYKASU, sigma(10000))).toBeCloseTo(Math.pow(sigma(10000), 0.7), 9);
  });
});

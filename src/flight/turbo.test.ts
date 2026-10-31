/**
 * **El turbo del JAZ 40**: sus dos Continental TSIO-360-E sostienen los 200 hp
 * de nivel del mar hasta los 12.000 pies, y por encima caen como en las curvas
 * de su fabricante (Continental, X30583, figura 2). Ver `loQueDaElMotor`.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, loQueDaElMotor, PANAMBI, PYKASU } from "./aircraft";
import { airDensity, SEA_LEVEL_DENSITY } from "./atmosphere";
import { empujeLleno } from "./fdm";
import { resistenciaNivelado } from "./nivel-que-ahorra";

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

  /*
   * **Y va a fondo y al 75 % a lo que va el Seneca II, a la vez**: «Top mph
   * 226» y el 75 % a 218 mph (*Plane & Pilot*, «Seneca II»), 196 y 189 nudos.
   * Con una sola cifra no salían los dos: con el crucero de verdad, a fondo
   * iba a 211. Ver `heliceSinEmpujeA`.
   *
   * Se mide donde el empuje y la resistencia se igualan. El tope, a 12.000
   * pies, la altitud crítica, que es donde un motor con turbo corre más; y en
   * ningún otro sitio más deprisa. El 75 %, **de potencia y no de palanca**,
   * que es lo que dice la cifra: arriba el turbo ya no da los 200 hp, y tres
   * cuartos de palanca son ahí menos de tres cuartos de potencia.
   */
  it("y va a fondo y al 75 % a lo que va el Seneca II: 196 y 189 nudos", () => {
    const NUDO = 0.514444;
    const nivelado = (alto: number, gas: number) => {
      let v = 50;
      while (v < 150 && empujeLleno(PANAMBI, airDensity(alto), v) * gas > resistenciaNivelado(PANAMBI, alto, v)) v += 0.05;
      return v / NUDO;
    };
    expect(PANAMBI.cruiseSpeed / NUDO).toBeCloseTo(189, 0);
    const tope = nivelado(12000 * PIE, 1);
    expect(tope).toBeGreaterThan(196 * 0.98);
    expect(tope).toBeLessThan(196 * 1.02);
    for (const pies of [0, 6000, 16000, 20000, 24000]) expect(nivelado(pies * PIE, 1), `${pies} ft`).toBeLessThan(tope);
    const alto = PANAMBI.alturaDeCrucero;
    const tresCuartos = 0.75 / loQueDaElMotor(PANAMBI, airDensity(alto) / SEA_LEVEL_DENSITY);
    expect(tresCuartos).toBeLessThan(1);
    const crucero = nivelado(alto, tresCuartos);
    expect(crucero).toBeGreaterThan(189 * 0.97);
    expect(crucero).toBeLessThan(189 * 1.02);
  });
});


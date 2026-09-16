/**
 * La atmósfera, que es de donde salen dos cifras que se ven en la cabina: la
 * velocidad indicada y el número de Mach.
 */

import { describe, expect, it } from "vitest";
import {
  SEA_LEVEL_DENSITY,
  airDensity,
  indicatedAirspeed,
  velocidadDelSonido,
} from "./atmosphere";

describe("la densidad del aire", () => {
  it("al nivel del mar es la de tablas", () => {
    expect(airDensity(0)).toBeCloseTo(SEA_LEVEL_DENSITY, 6);
  });

  it("y baja con la altura, que es por lo que un avión despega más largo arriba", () => {
    expect(airDensity(3000)).toBeLessThan(airDensity(0));
    expect(airDensity(3000)).toBeCloseTo(0.909, 2);
  });
});

describe("la velocidad indicada", () => {
  it("al nivel del mar es la de verdad", () => {
    expect(indicatedAirspeed(60, 0)).toBeCloseTo(60, 6);
  });

  it("y arriba marca menos de la que se lleva", () => {
    expect(indicatedAirspeed(200, 10000)).toBeLessThan(200 * 0.65);
  });
});

describe("la velocidad del sonido", () => {
  it("al nivel del mar, los 340 de siempre", () => {
    expect(velocidadDelSonido(0)).toBeCloseTo(340.3, 1);
  });

  it("a once mil, los 295 de la tropopausa", () => {
    expect(velocidadDelSonido(11000)).toBeCloseTo(295.1, 1);
  });

  it("y por encima ya no baja más: la temperatura se queda quieta", () => {
    expect(velocidadDelSonido(14000)).toBe(velocidadDelSonido(11000));
  });

  it("baja siempre, nunca sube", () => {
    let antes = velocidadDelSonido(0);
    for (let h = 500; h <= 11000; h += 500) {
      const ahora = velocidadDelSonido(h);
      expect(ahora).toBeLessThanOrEqual(antes);
      antes = ahora;
    }
  });

  it("y el Mach de crucero de un reactor sale creíble", () => {
    // Doscientos treinta metros por segundo a diez mil: eso es Mach 0,78, que
    // es exactamente donde cruza un avión de línea. Si esta cuenta se tuerce,
    // el único decimal del juego dice una mentira.
    expect(230 / velocidadDelSonido(10000)).toBeCloseTo(0.77, 2);
  });
});

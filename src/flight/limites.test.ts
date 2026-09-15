/**
 * Los dos topes de velocidad, y el punto donde se relevan.
 *
 * Sale de medir la flota buscando otra cosa: **ningún avión tenía velocidad
 * máxima**. El JAZ 90 daba 1.054 km/h a quinientos metros —Mach 0,86 a ras de
 * suelo— porque el empuje peleaba contra la resistencia y donde se cruzaban ahí
 * se quedaba. Era el #159.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, aircraftById } from "./aircraft";
import {
  alturaDelCruce,
  machDe,
  NUDO,
  topeDeVelocidad,
  velocidadDelSonido,
  verdaderaDesdeIndicada,
} from "./limites";

describe("la atmósfera de los topes", () => {
  it("el sonido va más despacio arriba, que es por lo que el Mach manda allí", () => {
    expect(velocidadDelSonido(0)).toBeCloseTo(340.3, 0);
    expect(velocidadDelSonido(11000)).toBeCloseTo(295.1, 0);
    expect(velocidadDelSonido(11000)).toBeLessThan(velocidadDelSonido(0));
  });

  it("y la misma indicada es más velocidad real cuanto más alto", () => {
    // Es la otra mitad: el anemómetro mide presión dinámica, no velocidad.
    const abajo = verdaderaDesdeIndicada(100, 0);
    const arriba = verdaderaDesdeIndicada(100, 10000);
    expect(abajo).toBeCloseTo(100, 6);
    expect(arriba).toBeGreaterThan(160);
  });
});

describe("quién pone el tope", () => {
  const grande = aircraftById("jaz-120");

  it("abajo manda la estructura y arriba el aire", () => {
    expect(topeDeVelocidad(grande, 0).manda).toBe("estructura");
    expect(topeDeVelocidad(grande, 11000).manda).toBe("aire");
  });

  it("y en el cruce valen lo mismo", () => {
    const h = alturaDelCruce(grande)!;
    expect(h).toBeGreaterThan(0);
    const justo = topeDeVelocidad(grande, h).verdadera;
    // A un metro para arriba y para abajo, la diferencia es despreciable.
    expect(topeDeVelocidad(grande, h - 1).verdadera).toBeCloseTo(justo, 1);
    expect(topeDeVelocidad(grande, h + 1).verdadera).toBeCloseTo(justo, 1);
  });

  it("el cruce del de fuselaje ancho cae donde cae el de verdad", () => {
    // Un 747 clásico releva sobre los veintiséis mil pies, que son ocho mil
    // metros largos. Si esto se mueve mucho, alguien tocó Vmo o Mmo.
    const h = alturaDelCruce(grande)!;
    expect(h).toBeGreaterThan(6500);
    expect(h).toBeLessThan(9500);
  });

  it("el tope sube con la altura mientras mande la estructura", () => {
    // Misma indicada, más velocidad real: por eso se vuela alto.
    expect(topeDeVelocidad(grande, 6000).verdadera).toBeGreaterThan(
      topeDeVelocidad(grande, 0).verdadera,
    );
  });
});

describe("la flota entera", () => {
  it("todos tienen tope, y ninguno absurdo", () => {
    for (const a of AIRCRAFT) {
      const abajo = topeDeVelocidad(a, 500).verdadera;
      // Por encima de su crucero —un tope por debajo del crucero sería un
      // avión que no puede volar como dice su ficha— y por debajo del sonido.
      expect(abajo, a.id).toBeGreaterThan(a.cruiseSpeed * 0.7);
      expect(machDe(abajo, 500), a.id).toBeLessThan(1);
    }
  });

  it("y el grande aguanta más que la avioneta, abajo y arriba", () => {
    const pequeno = aircraftById("jaz-20");
    const grande = aircraftById("jaz-120");
    for (const h of [0, 3000, 9000])
      expect(topeDeVelocidad(grande, h).verdadera).toBeGreaterThan(
        topeDeVelocidad(pequeno, h).verdadera,
      );
  });

  it("Vmo en nudos es un número de nudos, no de metros por segundo", () => {
    // La trampa de siempre en este proyecto. 365 nudos son 188 m/s, no 365.
    const grande = aircraftById("jaz-120");
    expect(grande.vmoKt * NUDO).toBeCloseTo(187.8, 0);
    expect(topeDeVelocidad(grande, 0).verdadera).toBeCloseTo(187.8, 0);
  });
});

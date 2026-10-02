/**
 * La capa de nubes en lo que se puede medir sin tarjeta: dónde llueve, cuánto
 * tapa y cuánta nube hay en cada punto.
 *
 * Lo que se ve al atravesarla hay que mirarlo con la GPU —ver
 * `scripts/ver-lluvia-y-nubes.mjs`—; aquí está la aritmética que lo decide,
 * que es donde se equivoca: un signo y la lluvia cae encima de las nubes, un
 * recorte y la capa cubierta sale con agujeros.
 */

import { describe, expect, it } from "vitest";
import {
  alfaDeNube,
  BORDE_DE_LA_CAPA,
  capaDelParte,
  cuantoDentro,
  densidadEnLaCapa,
  type DibujoDeLaCapa,
  grosorDeLaCapa,
  lluviaALaAltura,
  ruidoDeNube,
  umbralDeLaNube,
} from "./capa-de-nubes";

const capa = { base: 1000, techo: 1800, tapadura: 0.75 };

describe("dónde llueve", () => {
  it("debajo de la base, toda la del parte", () => {
    expect(lluviaALaAltura(0, capa)).toBe(1);
    expect(lluviaALaAltura(999, capa)).toBe(1);
  });

  it("encima del techo, nada: sobre las nubes no llueve", () => {
    // «Me atrevo a afirmar que sobre las nubes no llueve.»
    expect(lluviaALaAltura(1800, capa)).toBe(0);
    expect(lluviaALaAltura(3000, capa)).toBe(0);
    expect(lluviaALaAltura(11000, capa)).toBe(0);
  });

  it("y dentro de la capa va menguando al subir", () => {
    const abajo = lluviaALaAltura(1100, capa);
    const medio = lluviaALaAltura(1400, capa);
    const arriba = lluviaALaAltura(1700, capa);
    expect(abajo).toBeLessThan(1);
    expect(medio).toBeLessThan(abajo);
    expect(arriba).toBeLessThan(medio);
    expect(arriba).toBeGreaterThan(0);
  });

  it("salvo dentro de un cumulonimbo, que es una torre y llueve a cualquier altura", () => {
    expect(lluviaALaAltura(6000, capa, true)).toBe(1);
  });

  it("y sin capa no se sabe de dónde cae: llueve a cualquier altura, como antes", () => {
    expect(lluviaALaAltura(6000, null)).toBe(1);
  });
});

describe("el grosor de la capa", () => {
  it("una nube que llueve es más gorda que el mar de nubes", () => {
    expect(grosorDeLaCapa("lluvia")).toBeGreaterThan(grosorDeLaCapa("nada"));
    expect(grosorDeLaCapa("tormenta")).toBeGreaterThan(grosorDeLaCapa("nada"));
  });

  it("y el techo es la base más el grosor", () => {
    const c = capaDelParte(900, 1, "lluvia")!;
    expect(c.techo - c.base).toBe(grosorDeLaCapa("lluvia"));
    expect(capaDelParte(null, 1, "lluvia")).toBeNull();
  });
});

/** El ruido de las cinco láminas, como las pinta el cielo. */
const ruidos = [0, 1, 2, 3, 4].map((i) => ruidoDeNube(0xc10d + i * 977));

/** Qué parte de los píxeles de las cinco láminas es nube con esta tapadura. */
function cubierto(tapadura: number): number {
  const u = umbralDeLaNube(tapadura);
  let si = 0;
  let todos = 0;
  for (const r of ruidos)
    for (const n of r) {
      todos++;
      if (alfaDeNube(n, u) > 0) si++;
    }
  return si / todos;
}

describe("lo que tapa cada parte", () => {
  it("cuanto más tapa el parte, más nube hay en el dibujo", () => {
    expect(cubierto(1)).toBeGreaterThan(cubierto(0.75));
    expect(cubierto(0.75)).toBeGreaterThan(cubierto(0.45));
  });

  it("y la tapadura es la parte del cielo que se cubre", () => {
    // BKN es de cinco a siete octavos; unas nubes sueltas, menos de la mitad.
    expect(cubierto(0.75)).toBeGreaterThan(0.62);
    expect(cubierto(0.75)).toBeLessThan(0.88);
    expect(cubierto(0.45)).toBeGreaterThan(0.35);
    expect(cubierto(0.45)).toBeLessThan(0.55);
  });

  it("y una capa cubierta no tiene huecos", () => {
    // OVC son ocho octavos: era el mismo dibujo agujereado que unas nubes
    // sueltas, solo que más opaco.
    expect(cubierto(1)).toBeGreaterThan(0.95);
  });
});

/** La capa dibujada, como la pone `ponerNubes`. */
function dibujo(tapadura: number): DibujoDeLaCapa {
  return {
    base: 1000,
    separacion: 200,
    ruidos,
    desfases: ruidos.map((_, i) => [i * 0.17, i * 0.31] as const),
    paso: 6000,
    umbral: umbralDeLaNube(tapadura),
  };
}

describe("cuánta nube hay en un punto", () => {
  it("fuera de la capa, ninguna", () => {
    const d = dibujo(1);
    for (const [x, z] of [
      [0, 0],
      [1234, -987],
      [-5000, 4400],
    ] as const) {
      expect(densidadEnLaCapa(d, x, 1000 - BORDE_DE_LA_CAPA - 1, z)).toBe(0);
      expect(densidadEnLaCapa(d, x, 1800 + BORDE_DE_LA_CAPA + 1, z)).toBe(0);
    }
  });

  it("y dentro de una capa cubierta se está dentro de la nube casi siempre", () => {
    const d = dibujo(1);
    let dentro = 0;
    const n = 400;
    for (let i = 0; i < n; i++) {
      const x = (i * 7919) % 6000;
      const z = (i * 104729) % 6000;
      const y = 1050 + ((i * 31) % 700);
      if (cuantoDentro(densidadEnLaCapa(d, x, y, z)) > 0.5) dentro++;
    }
    expect(dentro / n).toBeGreaterThan(0.85);
  });

  it("y en una capa rota hay huecos por los que se sube sin entrar", () => {
    const d = dibujo(0.45);
    let hueco = 0;
    const n = 400;
    for (let i = 0; i < n; i++) {
      const x = (i * 7919) % 6000;
      const z = (i * 104729) % 6000;
      if (densidadEnLaCapa(d, x, 1000, z) === 0) hueco++;
    }
    expect(hueco / n).toBeGreaterThan(0.3);
  });

  it("y el dibujo se repite cada paso, que es lo que deja mover el banco a saltos", () => {
    const d = dibujo(0.75);
    for (const [x, y, z] of [
      [123, 1100, 456],
      [-2500, 1450, 3100],
    ] as const)
      expect(densidadEnLaCapa(d, x + 6000, y, z - 12000)).toBeCloseTo(
        densidadEnLaCapa(d, x, y, z),
        5,
      );
  });

  it("y entre dos láminas, la mezcla de las dos", () => {
    const d = dibujo(0.75);
    const x = 777;
    const z = -1311;
    const abajo = densidadEnLaCapa(d, x, 1200, z);
    const arriba = densidadEnLaCapa(d, x, 1400, z);
    expect(densidadEnLaCapa(d, x, 1300, z)).toBeCloseTo((abajo + arriba) / 2, 5);
  });
});

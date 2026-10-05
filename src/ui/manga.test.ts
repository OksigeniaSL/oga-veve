/**
 * La manga: las barras del grado, y nunca más de cuatro.
 *
 * Llegó a dibujar hasta seis —una por cada galón de un vuelo—, y seis barras
 * no las lleva ningún uniforme. Ahora lleva las del grado de quien juega, con
 * el esquema de las líneas de Latinoamérica y de Europa: una, tres, cuatro y
 * cuatro en los cuatro grados del juego. Ver `barrasDe`.
 */

import { describe, expect, it } from "vitest";
import { manga, barrasDeLaManga, BARRAS_MAXIMAS, MANGA_ALTO } from "./manga";
import { barrasDe, GRADOS } from "../flight/cuaderno";

/** Las barras que lleva un SVG de manga. */
const barras = (svg: string): number => svg.match(/class="manga__barra/g)?.length ?? 0;

/** La tela va de `y = 2` a `y = 30`, y el puño empieza en 24. */
const TELA = { arriba: 2, puno: 24 };

describe("la manga del grado", () => {
  it.each(GRADOS)("la de %s lleva las barras de su grado", (g) => {
    expect(barras(manga(barrasDe(g), MANGA_ALTO, g))).toBe(barrasDe(g));
  });

  it("las del esquema de las líneas: cadete 1, primer oficial 3, comandante 4", () => {
    expect(GRADOS.map(barrasDe)).toEqual([1, 3, 4, 4]);
  });

  it("y nunca más de cuatro, se le pase lo que se le pase", () => {
    expect(BARRAS_MAXIMAS).toBe(4);
    for (const n of [5, 6, 12, Infinity]) {
      expect(barras(manga(n, MANGA_ALTO, "manga")), `${n}`).toBeLessThanOrEqual(4);
    }
    expect(barras(manga(-1, MANGA_ALTO, "manga"))).toBe(0);
    expect(barras(manga(Number.NaN, MANGA_ALTO, "manga"))).toBe(0);
    expect(barrasDeLaManga(2.4)).toBe(2);
  });

  it("todas caben en la tela, por encima del puño", () => {
    const svg = manga(4, MANGA_ALTO, "manga");
    for (const m of svg.matchAll(/class="manga__barra[^"]*" x="9" y="([\d.]+)" width="30" height="([\d.]+)"/g)) {
      const y = Number(m[1]);
      expect(y).toBeGreaterThanOrEqual(TELA.arriba);
      expect(y + Number(m[2])).toBeLessThanOrEqual(TELA.puno + 0.6);
    }
  });

  it("y en el ascenso, las que ya estaban salen sin animación", () => {
    const svg = manga(4, MANGA_ALTO, "manga", 3);
    expect(svg.match(/manga__barra--ya/g)?.length).toBe(3);
  });
});

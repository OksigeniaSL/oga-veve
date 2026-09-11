/**
 * La manga: que las barras quepan en la tela.
 *
 * Hay seis galones —aproximación, frustrada, toma, aros, velocidad y rodaje—
 * y la manga estaba dibujada para cuatro: la quinta salía partida por el borde
 * de la tela y la sexta caía fuera del lienzo y no se dibujaba. O sea que un
 * vuelo redondo no se podía enseñar. Se vio en vídeo antes que en una prueba.
 */

import { describe, expect, it } from "vitest";
import { manga, repartoDeBarras, MANGA_ALTO } from "./manga";
import { GALONES } from "../flight/galones";

/** La tela va de `y = 2` a `y = 30`, y el puño empieza en 24. */
const TELA = { arriba: 2, puno: 24 };

describe("la manga y sus barras", () => {
  it("hay seis galones, así que seis barras tienen que caber", () => {
    expect(GALONES.length).toBe(6);
  });

  it.each([1, 2, 3, 4, 5, 6])("con %i barras, todas van en la tela", (n) => {
    const { paso, alto } = repartoDeBarras(n);
    for (let i = 0; i < n; i++) {
      const y = 21 - i * paso;
      expect(y, `barra ${i} por arriba`).toBeGreaterThanOrEqual(TELA.arriba);
      expect(y + alto, `barra ${i} por abajo`).toBeLessThanOrEqual(
        TELA.puno + 3.6,
      );
    }
  });

  it("y no se pisan entre ellas", () => {
    for (let n = 2; n <= 6; n++) {
      const { paso, alto } = repartoDeBarras(n);
      expect(paso, `${n} barras`).toBeGreaterThan(alto);
    }
  });

  it("con cuatro o menos, el dibujo de siempre no cambia", () => {
    // Es el caso normal y no tiene por qué verse distinto: barras de 3,6 de
    // gordo cada 5,5. Lo que cambia es de la quinta en adelante.
    for (const n of [1, 2, 3, 4]) {
      expect(repartoDeBarras(n)).toEqual({ paso: 5.5, alto: 3.6 });
    }
  });

  it("dibuja tantos rectángulos de barra como galones", () => {
    for (let n = 0; n <= 6; n++) {
      const svg = manga(n, MANGA_ALTO, "manga");
      expect(svg.match(/class="manga__barra/g)?.length ?? 0, `${n}`).toBe(n);
    }
  });

  it("y las que ya estaban salen sin animación", () => {
    const svg = manga(4, MANGA_ALTO, "manga", 3);
    expect(svg.match(/manga__barra--ya/g)?.length).toBe(3);
  });
});

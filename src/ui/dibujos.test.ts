/**
 * Los dibujos de la señal, y la regla que tienen todos.
 *
 * Cada uno es un `<svg>` entero y no un puñado de trazos: un navegador no
 * dibuja un `<path>` suelto fuera de un `<svg>`, y la tarjeta lo que hace es
 * meterlo tal cual con `innerHTML`. Cuando eso falla no hay error en ningún
 * sitio —la tarjeta sale, con su color y su sombra— y lo único que pasa es que
 * **dentro no hay nada**.
 *
 * Pasó: `TIRAR`, la señal de levantar el morro, era la única sin envolver, y
 * el recuadro salía vacío los dos segundos que dura. Se vio en vídeo antes que
 * en ninguna prueba.
 */

import { describe, expect, it } from "vitest";
import { DIBUJOS, dibujoDelCdi, type ComoVaLaBarra } from "./senal";
import { GUION, guionAfis, guionSinTorre, type Fase } from "../flight/vuelo";

describe("los dibujos de la señal", () => {
  it.each(Object.keys(DIBUJOS))("«%s» es un svg entero", (nombre) => {
    const d = DIBUJOS[nombre as keyof typeof DIBUJOS];
    expect(d.trimStart().startsWith("<svg")).toBe(true);
    expect(d.trimEnd().endsWith("</svg>")).toBe(true);
  });

  it("y ninguno está vacío por dentro", () => {
    for (const [nombre, d] of Object.entries(DIBUJOS))
      expect(
        d
          .replace(/<svg[^>]*>/, "")
          .replace("</svg>", "")
          .trim().length,
        nombre,
      ).toBeGreaterThan(20);
  });

  it("y todas las fases del vuelo tienen el suyo", () => {
    // Una fase con un nombre de dibujo que no existe también sale en blanco:
    // `DIBUJOS[nombre] ?? ""`. Ver `mostrar`.
    for (const [fase, guion] of Object.entries(GUION))
      expect(Object.keys(DIBUJOS), fase).toContain(guion.icono);
  });

  it("y también en la pista de casa, con bici y sin ella", () => {
    for (const fase of Object.keys(GUION) as Fase[])
      for (const conBici of [true, false])
        expect(Object.keys(DIBUJOS), fase).toContain(
          guionSinTorre(fase, conBici).icono,
        );
  });

  it("y donde contesta un AFIS", () => {
    for (const fase of Object.keys(GUION) as Fase[])
      expect(Object.keys(DIBUJOS), fase).toContain(guionAfis(fase).icono);
  });
});

/**
 * **El CDI de la tarjeta lleva la barra del lado en que está la de verdad**
 * (H26f). Había un solo dibujo a tope, con la barra a la izquierda, y en
 * Fuerteventura con el alisio la barra de verdad salía a la derecha (28,5°):
 * la tarjeta decía «el radial queda de ese lado» señalando el otro.
 */
describe("el CDI de la tarjeta, del lado de la barra", () => {
  /** Dónde pinta la barra un dibujo del CDI: lo que se aparta del centro, en unidades del dibujo. */
  const barraDe = (svg: string): number => {
    const m = /<path d="M([\d.]+) 8\.8 H/.exec(svg);
    if (!m) throw new Error("sin barra");
    return Number(m[1]) + 1 - 12;
  };
  /** Hacia dónde apunta la flecha de debajo de la barra: 1, a la derecha; 0, sin flecha. */
  const flechaDe = (svg: string): number => {
    const m = /<path d="M([\d.]+) 18\.6 L([\d.]+) 17 V20\.2 Z"/.exec(svg);
    return m ? Math.sign(Number(m[1]) - Number(m[2])) : 0;
  };

  for (const como of ["a-tope", "viniendo", "pasada"] as ComoVaLaBarra[])
    for (const desviacion of [28.5, -28.7, 6, -6, 0.4, -0.4])
      it(`${como}, con la barra a ${desviacion}°: dibujada de ese lado`, () => {
        const svg = DIBUJOS[dibujoDelCdi(como, desviacion)];
        expect(Math.sign(barraDe(svg))).toBe(Math.sign(desviacion));
      });

  it("viniendo, la flecha va hacia el centro; pasada, se aleja de él; a tope, sin flecha", () => {
    for (const desviacion of [5, -5]) {
      const lado = Math.sign(desviacion);
      expect(flechaDe(DIBUJOS[dibujoDelCdi("viniendo", desviacion)])).toBe(-lado);
      expect(flechaDe(DIBUJOS[dibujoDelCdi("pasada", desviacion)])).toBe(lado);
      expect(flechaDe(DIBUJOS[dibujoDelCdi("a-tope", desviacion)])).toBe(0);
    }
  });
});

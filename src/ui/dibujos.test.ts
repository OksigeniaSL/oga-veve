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
import { DIBUJOS } from "./senal";
import { GUION } from "../flight/vuelo";

describe("los dibujos de la señal", () => {
  it.each(Object.keys(DIBUJOS))("«%s» es un svg entero", (nombre) => {
    const d = DIBUJOS[nombre]!;
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
});

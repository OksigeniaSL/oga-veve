/**
 * El color de las fachadas.
 *
 * Las casas toman el color de la fotografía que pisan, y la fotografía tiene
 * sombras: donde el barrio salió en sombra, la caja salía casi negra. Grabado
 * en vuelo, un suburbio entero de losas negras al atardecer — que no se lee
 * como casas, se lee como agujeros.
 *
 * Lo que se comprueba es que **ninguna casa puede quedar negra** y que
 * arreglarlo no le cambia el tono: un tejado rojo oscuro tiene que seguir
 * saliendo rojizo, no gris.
 */

import { describe, expect, it } from "vitest";
import { tinteDeFachada } from "./ciudad";

/** Luz percibida, que es lo que decide si algo se lee como pared o como hueco. */
const luz = (c: { r: number; g: number; b: number }): number =>
  0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

describe("el tinte de las fachadas", () => {
  it("aclara respecto al suelo, que si no la casa se camufla", () => {
    const suelo = { r: 0.5, g: 0.5, b: 0.5 };
    expect(luz(tinteDeFachada(suelo.r, suelo.g, suelo.b, 1.2))).toBeGreaterThan(
      luz(suelo),
    );
  });

  it("y una sombra de la foto no da una casa negra", () => {
    const c = tinteDeFachada(0.03, 0.03, 0.04, 1.2);
    expect(luz(c)).toBeGreaterThan(0.3);
  });

  it("ni el negro puro, que en una foto existe", () => {
    const c = tinteDeFachada(0, 0, 0, 1.2);
    expect(luz(c)).toBeGreaterThan(0.3);
  });

  it("al aclarar no le cambia el tono: lo rojo sigue rojo", () => {
    // Un tejado rojo oscuro, de los que salían negros.
    const c = tinteDeFachada(0.12, 0.05, 0.04, 1.2);
    expect(c.r).toBeGreaterThan(c.g);
    expect(c.g).toBeGreaterThan(c.b);
  });

  it("y lo que ya estaba claro no se toca más de lo suyo", () => {
    const c = tinteDeFachada(0.8, 0.78, 0.7, 1.2);
    // Solo el realce, sin empujón de mínimo: 0,8 × 1,2 topado en uno.
    expect(c.r).toBeCloseTo(0.96, 2);
  });

  it("nunca se sale del uno, que es lo que sabe pintar una pantalla", () => {
    const c = tinteDeFachada(0.95, 0.95, 0.95, 1.3);
    expect(Math.max(c.r, c.g, c.b)).toBeLessThanOrEqual(1);
  });
});

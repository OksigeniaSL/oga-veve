/**
 * Los aviones de ruta vuelan el corredor del tramo que se vuela.
 *
 * El corredor se fijaba al cargar, entre casa y el primer destino de la
 * lista. Volando de Gran Canaria a Lanzarote todo el tráfico iba por el
 * corredor de Los Rodeos, a decenas de kilómetros, y no se cruzaba a nadie:
 * se perdía la lección de la regla semicircular justo en la ruta elegida.
 */

import { describe, expect, it } from "vitest";
import { crearAvionesDeRuta } from "./aviones-de-ruta";

/** El rumbo de compás de un punto a otro, en grados. */
const rumbo = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  ((Math.atan2(b.x - a.x, -(b.z - a.z)) * 180) / Math.PI + 360) % 360;

/** Cuánto se aparta un rumbo de otro, o de su contrario, en grados. */
const aparte = (r: number, eje: number) => {
  const d = Math.abs(((r - eje + 540) % 360) - 180);
  return Math.min(d, 180 - d);
};

describe("el corredor de los aviones de ruta", () => {
  const casa = { x: 0, z: 0 };
  const alNorte = { x: 0, z: -100_000 };
  const alEste = { x: 100_000, z: 0 };

  it("vuela el corredor que se le da al crearlo", () => {
    const ruta = crearAvionesDeRuta(casa, alNorte);
    ruta.paso(600, { x: 0, z: 0 });
    for (const a of ruta.quienes())
      expect(aparte(a.rumbo, rumbo(casa, alNorte))).toBeLessThan(5);
    ruta.dispose();
  });

  it("y se muda al corredor nuevo cuando cambia el tramo", () => {
    const ruta = crearAvionesDeRuta(casa, alNorte);
    ruta.paso(600, { x: 0, z: 0 });
    ruta.ponerCorredor(casa, alEste);
    ruta.paso(601, { x: 0, z: 0 });
    expect(ruta.quienes().length).toBeGreaterThan(0);
    for (const a of ruta.quienes())
      expect(aparte(a.rumbo, rumbo(casa, alEste))).toBeLessThan(5);
    ruta.dispose();
  });
});

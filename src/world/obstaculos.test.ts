/**
 * El índice de bultos.
 *
 * Lo que se comprueba es sobre todo **lo que no puede chocar**: pasar por
 * encima del tejado, rozar el canto, y volar por un descampado. Un obstáculo
 * que se dispara donde no hay nada es peor que no tener obstáculos, porque el
 * avión se rompe contra el aire.
 */

import { describe, expect, it } from "vitest";
import { Obstaculos } from "./obstaculos";

/** Un bloque de veinte por veinte y treinta de alto, con la base a cero. */
function bloque(): Obstaculos {
  const o = new Obstaculos();
  o.anadir(0, 0, 10, 10, 0, 30);
  return o;
}

describe("los obstáculos", () => {
  it("un mundo vacío no choca con nada", () => {
    expect(new Obstaculos().choca(0, 10, 0)).toBe(false);
  });

  it("meterse en el edificio choca", () => {
    expect(bloque().choca(0, 15, 0)).toBe(true);
  });

  it("por encima del tejado se pasa", () => {
    expect(bloque().choca(0, 31, 0)).toBe(false);
  });

  it("y al lado, también", () => {
    expect(bloque().choca(20, 15, 0)).toBe(false);
    expect(bloque().choca(0, 15, 20)).toBe(false);
  });

  it("rozar el canto no cuenta: hay margen a propósito", () => {
    // A nueve metros del centro se está dentro de la caja de veinte de lado,
    // pero dentro del margen. Ver `MARGEN`.
    expect(bloque().choca(9, 15, 0)).toBe(false);
    expect(bloque().choca(7, 15, 0)).toBe(true);
  });

  it("una casucha más estrecha que el margen no estorba", () => {
    const o = new Obstaculos();
    o.anadir(0, 0, 1, 1, 0, 4);
    expect(o.choca(0, 2, 0)).toBe(false);
    expect(o.cuantos).toBe(0);
  });

  it("un edificio en un cerro no choca a la cota del valle", () => {
    const o = new Obstaculos();
    o.anadir(0, 0, 10, 10, 400, 420);
    expect(o.choca(0, 20, 0)).toBe(false);
    expect(o.choca(0, 410, 0)).toBe(true);
  });

  it("funciona lejos del origen, que es donde está media ciudad", () => {
    const o = new Obstaculos();
    o.anadir(-4300, 2750, 10, 10, 0, 30);
    expect(o.choca(-4300, 15, 2750)).toBe(true);
    expect(o.choca(-4300, 15, 2700)).toBe(false);
  });

  it("una nave más larga que la celda se encuentra por sus dos puntas", () => {
    const o = new Obstaculos();
    // Ciento sesenta metros de largo: más que el lado de la celda.
    o.anadir(0, 0, 80, 10, 0, 12);
    expect(o.choca(-70, 6, 0)).toBe(true);
    expect(o.choca(70, 6, 0)).toBe(true);
  });

  it("el camino de un fotograma al siguiente atraviesa la casa estrecha", () => {
    const o = new Obstaculos();
    // Seis metros de fondo: a un salto de diez metros ningún extremo cae dentro.
    o.anadir(0, 0, 20, 5, 0, 20);
    expect(o.choca(0, 10, -12)).toBe(false);
    expect(o.choca(0, 10, 12)).toBe(false);
    expect(o.chocaEnElCamino(0, 10, -12, 0, 10, 12)).toBe(true);
  });

  it("y un camino que pasa de largo sigue sin chocar", () => {
    const o = bloque();
    expect(o.chocaEnElCamino(-200, 40, 0, 200, 40, 0)).toBe(false);
  });

  it("bajar sobre un tejado choca en cuanto se mete", () => {
    const o = bloque();
    expect(o.chocaEnElCamino(0, 40, 0, 0, 25, 0)).toBe(true);
  });
});

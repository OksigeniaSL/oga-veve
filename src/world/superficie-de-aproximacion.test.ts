/**
 * Las superficies limitadoras de obstáculos.
 *
 * Lo que se comprueba es que **el techo baja según te acercás al umbral**, que
 * es lo que hace que la aproximación quede libre, y que fuera del cono no
 * limita nada — un aeropuerto no puede prohibir construir en toda la isla.
 */

import { describe, expect, it } from "vitest";
import {
  techoSobreLaPista,
  type Pista,
} from "./superficie-de-aproximacion";

/** Una pista de dos kilómetros orientada al norte, para no pelearse con senos. */
const PISTA: Pista = { x: 0, z: 0, heading: 0, length: 2000, width: 45 };

/** El umbral de esa pista queda mil metros al sur: la Z crece hacia el sur. */
const umbral = 1000;

describe("las superficies de aproximación", () => {
  it("en la propia franja de pista no cabe nada", () => {
    expect(techoSobreLaPista(0, 0, PISTA)).toBe(0);
    expect(techoSobreLaPista(60, 0, PISTA)).toBe(0);
  });

  it("a los lados, la transición sube uno de cada siete", () => {
    // A ciento veinte metros del eje: cuarenta y cinco pasado el borde.
    expect(techoSobreLaPista(120, 0, PISTA)).toBeCloseTo(45 / 7, 5);
  });

  it("y más allá de la transición ya no manda nadie", () => {
    expect(techoSobreLaPista(400, 0, PISTA)).toBe(Infinity);
  });

  it("por delante del umbral el techo sube al dos por ciento", () => {
    // Mil metros más allá del umbral, en el eje.
    expect(techoSobreLaPista(0, umbral + 1000, PISTA)).toBeCloseTo(20, 5);
    expect(techoSobreLaPista(0, umbral + 200, PISTA)).toBeCloseTo(4, 5);
  });

  it("y vale para los dos umbrales, que una pista se usa en los dos sentidos", () => {
    expect(techoSobreLaPista(0, -(umbral + 1000), PISTA)).toBeCloseTo(20, 5);
  });

  it("el cono se abre: lo que estorba cerca, lejos ya no", () => {
    // A doscientos metros del umbral el cono mide ciento cinco de semiancho.
    expect(techoSobreLaPista(100, umbral + 200, PISTA)).toBeCloseTo(4, 5);
    expect(techoSobreLaPista(110, umbral + 200, PISTA)).toBe(Infinity);
    // Y a dos kilómetros, trescientos setenta y cinco.
    expect(techoSobreLaPista(300, umbral + 2000, PISTA)).toBeCloseTo(40, 5);
  });

  it("pasados tres kilómetros del umbral se acabó la superficie", () => {
    expect(techoSobreLaPista(0, umbral + 3100, PISTA)).toBe(Infinity);
  });

  it("con la pista girada, el cono gira con ella", () => {
    const oblicua: Pista = { ...PISTA, heading: 90 };
    // Con rumbo 90 el delante es el este, así que el umbral queda al oeste.
    expect(techoSobreLaPista(-(umbral + 1000), 0, oblicua)).toBeCloseTo(20, 5);
    // Y lo que antes limitaba, ahora no.
    expect(techoSobreLaPista(0, umbral + 1000, oblicua)).toBe(Infinity);
  });
});

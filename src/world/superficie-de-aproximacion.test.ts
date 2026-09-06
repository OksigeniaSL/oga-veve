/**
 * Las superficies limitadoras de obstáculos.
 *
 * Lo que se comprueba es que **el techo baja según te acercás al umbral**, que
 * es lo que hace que la aproximación quede libre, y que fuera del cono no
 * limita nada — un aeropuerto no puede prohibir construir en toda la isla.
 */

import { describe, expect, it } from "vitest";
import {
  techoDeLoQueSeConstruye,
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
    expect(techoSobreLaPista(120, 0, PISTA)).toBe(0);
  });

  it("a los lados, la transición sube uno de cada siete", () => {
    // A doscientos diez metros del eje: setenta pasado el borde de la franja.
    expect(techoSobreLaPista(210, 0, PISTA)).toBeCloseTo(70 / 7, 5);
  });

  it("y sube hasta los cuarenta y cinco metros, que es donde deja de mandar", () => {
    // Trescientos quince pasado el borde: uno de cada siete, cuarenta y cinco.
    expect(techoSobreLaPista(140 + 315, 0, PISTA)).toBeCloseTo(45, 5);
  });

  it("y más allá de la transición ya no manda nadie", () => {
    expect(techoSobreLaPista(600, 0, PISTA)).toBe(Infinity);
  });

  it("por delante del umbral el techo sube al dos por ciento", () => {
    // Mil metros más allá del umbral, en el eje.
    expect(techoSobreLaPista(0, umbral + 1000, PISTA)).toBeCloseTo(20, 5);
    expect(techoSobreLaPista(0, umbral + 200, PISTA)).toBeCloseTo(4, 5);
  });

  it("y vale para los dos umbrales, que una pista se usa en los dos sentidos", () => {
    expect(techoSobreLaPista(0, -(umbral + 1000), PISTA)).toBeCloseTo(20, 5);
  });

  it("el cono se abre, y a su lado sigue habiendo transición", () => {
    // A doscientos metros del umbral el cono mide ciento setenta de semiancho.
    expect(techoSobreLaPista(150, umbral + 200, PISTA)).toBeCloseTo(4, 5);
    // Justo fuera del cono no se acaba el mundo: la transición sube desde ahí.
    expect(techoSobreLaPista(180, umbral + 200, PISTA)).toBeCloseTo(
      4 + 10 / 7,
      5,
    );
    // Y lejos del cono, ya no manda nadie.
    expect(techoSobreLaPista(600, umbral + 200, PISTA)).toBe(Infinity);
    // A dos kilómetros el cono mide cuatrocientos cuarenta.
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

/**
 * El barrio del aeropuerto: dos plantas y no más.
 *
 * «Hay hasta prismas que representan edificaciones altas llegando a la cabecera
 * de pista, eso no ocurre en un aeropuerto. Al menos no existe en el de
 * Tenerife: está prohibido subir de dos plantas de altura en esa zona de
 * influencia del aeródromo.»
 */
describe("la zona de influencia del aeródromo", () => {
  it("no deja pasar de dos plantas cerca del umbral", () => {
    // Quinientos metros por delante de la cabecera y en el eje: por las
    // superficies de OACI cabrían diez metros, que es legal y es falso.
    const alto = techoDeLoQueSeConstruye(0, -(PISTA.length / 2 + 500), PISTA);
    expect(alto).toBeLessThanOrEqual(8);
  });

  it("pero al costado de la pista manda la transición, que ahí hay hangares", () => {
    // Y torres, y terminales, y son de verdad: el barrio bajo es lo que se
    // ve por delante de la cabecera, no lo que hay al lado del asfalto.
    expect(techoDeLoQueSeConstruye(300, 0, PISTA)).toBeGreaterThan(8);
  });

  it("y lejos del aeródromo no manda nadie", () => {
    // Una ciudad de dos plantas hasta el horizonte sería el error contrario.
    expect(techoDeLoQueSeConstruye(0, -(PISTA.length / 2 + 4000), PISTA)).toBe(
      Infinity,
    );
  });
});

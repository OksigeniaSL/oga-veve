/**
 * Lo que se construye delante de una cabecera: nada.
 *
 * Se dijo jugando dos veces, y la segunda con razón: «había edificios en la
 * ruta de aproximación que en realidad no están… si sabré yo que está
 * prohibidísimo construir más de tres pisos de altura en zona de aeropuerto, al
 * menos es así en Tenerife».
 *
 * La primera vez se arregló **bajándolos** a dos plantas —ver `DOS_PLANTAS`— y
 * siguieron estando, porque el recorte de altura nunca podía borrar una casa:
 * la aplastaba a tres metros y la dejaba puesta. Una casa de tres metros en la
 * prolongación del eje es tan falsa como una de diez: lo que está mal no es lo
 * que mide, es que esté.
 *
 * Medido en Los Rodeos: el sorteo había plantado una de 12×16 m en el eje
 * exacto, a 730 m de la cabecera, y el bimotor se la llevaba por delante al
 * rotar.
 */

import { describe, expect, it } from "vitest";
import { techoDeLoQueSeConstruye } from "./superficie-de-aproximacion";

/** Una pista de tres kilómetros mirando al norte, centrada en el origen. */
const PISTA = { x: 0, z: 0, heading: 0, width: 45, length: 3000 };

describe("el corredor de delante de la cabecera va vacío", () => {
  it("en el eje, justo pasada la cabecera, no se construye", () => {
    // 200 m más allá del umbral, en el eje.
    expect(techoDeLoQueSeConstruye(0, -1700, PISTA)).toBe(-Infinity);
  });

  it("y a setecientos treinta metros tampoco, que es donde estaba la casa", () => {
    expect(techoDeLoQueSeConstruye(0, -2230, PISTA)).toBe(-Infinity);
  });

  it("y por el otro extremo igual, que una pista tiene dos cabeceras", () => {
    expect(techoDeLoQueSeConstruye(0, 2230, PISTA)).toBe(-Infinity);
  });

  /*
   * Y **fuera del corredor sí se construye**, que si no esto no sería una
   * franja despejada: sería un agujero en el mapa. A los costados hay hangares,
   * torres y terminales, y son de verdad.
   */
  it("pero a trescientos metros del eje ya no manda el corredor", () => {
    expect(techoDeLoQueSeConstruye(300, -1700, PISTA)).toBeGreaterThan(0);
  });

  it("y pasado el corredor vuelve el límite de dos plantas", () => {
    const techo = techoDeLoQueSeConstruye(0, -2600, PISTA);
    expect(techo).toBeGreaterThan(0);
    expect(techo).toBeLessThanOrEqual(8);
  });

  /*
   * Y sobre la propia pista manda la superficie de siempre, no el corredor:
   * ahí no hay nada que construir y la cuenta es otra.
   */
  it("y encima de la pista no decide el corredor", () => {
    expect(techoDeLoQueSeConstruye(0, 0, PISTA)).toBeGreaterThan(-Infinity);
  });
});

/**
 * Lo que la ayuda de rodaje se niega a hacer: dar media vuelta al avión.
 *
 * La ayuda corrige un rumbo; no gira un avión sobre sí mismo. Pero «corregir un
 * rumbo» y «media vuelta» hay que saber distinguirlos, y el número que los
 * separaba estaba puesto donde no era: en setenta grados, cuando **la salida de
 * un puesto a su calle es una esquina de noventa grados largos**. Medida en
 * Pettirossi: noventa y seis. O sea que el guardia contra las medias vueltas se
 * disparaba en la primera curva del rodaje y dejaba al avión sin ayuda justo
 * donde hacía falta.
 *
 * Con la ayuda callada ahí, el peldaño de cuatro a seis años —cuya promesa
 * entera es llevarte— hacía cuarenta y tres metros de los quinientos cuarenta
 * del rodaje de Pettirossi y se iba a la hierba. Lo mide
 * `verificar-asistencia`; lo que se fija aquí es la regla, sin navegador.
 */

import { describe, expect, it } from "vitest";
import { errorDeRumbo, VUELTA_EN_U } from "./plan-de-vuelo";
import type { Punto } from "./aerodrome";

/** Grados a radianes, que es como se lee esto. */
const grados = (g: number) => (g * Math.PI) / 180;

describe("una curva de calle de rodaje no es media vuelta", () => {
  /*
   * El avión sale del puesto al norte y la calle se va al oeste: noventa
   * grados clavados, que es la esquina más corriente que hay en un aeropuerto.
   */
  it("la esquina de noventa grados cabe dentro de la ayuda", () => {
    const yo: Punto = [0, 0];
    // Rumbo norte. El eje Z crece al sur, así que el norte es la −Z.
    const alOeste: Punto = [-20, 0];
    expect(Math.abs(errorDeRumbo(yo, 0, alOeste))).toBeCloseTo(grados(90), 5);
    expect(Math.abs(errorDeRumbo(yo, 0, alOeste))).toBeLessThan(VUELTA_EN_U);
  });

  it("y la de noventa y seis, que es la de Pettirossi, también", () => {
    const yo: Punto = [0, 0];
    const esquina: Punto = [
      -20 * Math.cos(grados(6)),
      20 * Math.sin(grados(6)),
    ];
    expect(Math.abs(errorDeRumbo(yo, 0, esquina))).toBeCloseTo(grados(96), 4);
    expect(Math.abs(errorDeRumbo(yo, 0, esquina))).toBeLessThan(VUELTA_EN_U);
  });

  /*
   * Y lo de verdad: pasada la boca de la salida, el punto de la ruta que toca
   * queda **a la espalda**. Ahí la ayuda tiene que callarse, porque tirar hacia
   * él es dar la vuelta al avión — medido en su día, alerón 0,63 sostenido y
   * sesenta y tres grados por segundo, con el avión retrocediendo por la pista.
   */
  it("pero el punto que ha quedado detrás sí lo es", () => {
    const yo: Punto = [0, 0];
    // Justo a la espalda: ciento ochenta grados.
    expect(Math.abs(errorDeRumbo(yo, 0, [0, 20]))).toBeCloseTo(Math.PI, 5);
    expect(Math.abs(errorDeRumbo(yo, 0, [0, 20]))).toBeGreaterThan(VUELTA_EN_U);
    // Y también de refilón, a ciento treinta y cinco.
    expect(Math.abs(errorDeRumbo(yo, 0, [-20, 20]))).toBeGreaterThan(
      VUELTA_EN_U,
    );
  });

  /*
   * El umbral, entre las dos cosas. Sin esto se puede subir hasta casi ciento
   * ochenta «para que ayude más» y quedarse sin guardia, o bajarlo otra vez a
   * setenta y repetir el fallo.
   */
  it("y el umbral se queda entre una cosa y la otra", () => {
    expect(VUELTA_EN_U).toBeGreaterThan(grados(100));
    expect(VUELTA_EN_U).toBeLessThan(grados(160));
  });
});

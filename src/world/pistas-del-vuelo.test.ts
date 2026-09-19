/**
 * Las pistas de este vuelo.
 *
 * Lo que se comprueba es el fallo tal cual se vio: **una toma buena en la pista
 * del otro aeropuerto no puede ser un percance**. Y el otro lado, que se olvida
 * solo: que seguir mirando solo la de casa no vuelva a pasar inadvertido.
 */

import { describe, expect, it } from "vitest";
import { laMasCerca, sobreAlguna, type Pista } from "./pistas-del-vuelo";

/** La de casa, en el origen, orientada al norte. */
const CASA: Pista = { x: 0, z: 0, heading: 0, length: 3000, width: 45 };
/** Y la del otro aeropuerto, a cincuenta y cuatro kilómetros al sursuroeste. */
const OTRA: Pista = {
  x: -22800,
  z: 48700,
  heading: 70,
  length: 3200,
  width: 45,
};

describe("sobre qué pista estoy", () => {
  it("en medio de la de casa, sí", () => {
    expect(sobreAlguna([CASA], 0, 0)).toBe(true);
    expect(sobreAlguna([CASA], 0, 1400)).toBe(true);
  });

  it("y en el campo, no", () => {
    expect(sobreAlguna([CASA], 500, 0)).toBe(false);
    expect(sobreAlguna([CASA], 0, 2000)).toBe(false);
  });

  it("**y en la del otro aeropuerto, sí** — que es lo que rompía el avión", () => {
    /*
     * Con una sola pista en la lista esto da `false`, el veredicto sale «fuera
     * de pista» y el juego rompe el avión de alguien que acaba de aterrizar
     * perfectamente. Es lo que se contó: «tomé tierra y se rompió, no lo
     * considera un aterrizaje».
     */
    expect(sobreAlguna([CASA], OTRA.x, OTRA.z)).toBe(false);
    expect(sobreAlguna([CASA, OTRA], OTRA.x, OTRA.z)).toBe(true);
  });

  it("y la franja de antes del umbral cuenta, si se pide margen", () => {
    const justoAntes = CASA.length / 2 + 40;
    expect(sobreAlguna([CASA], 0, justoAntes)).toBe(false);
    expect(sobreAlguna([CASA], 0, justoAntes, 80)).toBe(true);
  });

  it("y el rumbo de cada pista es el suyo, no el de la primera", () => {
    // La otra está girada setenta grados. Un punto a lo largo de **su** eje
    // tiene que contar, y el mismo punto medido con el eje de casa, no.
    const rad = (OTRA.heading * Math.PI) / 180;
    const p = {
      x: OTRA.x + Math.sin(rad) * 1200,
      z: OTRA.z - Math.cos(rad) * 1200,
    };
    expect(sobreAlguna([OTRA], p.x, p.z)).toBe(true);
    expect(sobreAlguna([{ ...OTRA, heading: 0 }], p.x, p.z)).toBe(false);
  });

  it("y sin ninguna pista no se está sobre ninguna", () => {
    expect(sobreAlguna([], 0, 0)).toBe(false);
  });
});

describe("y en cuál estoy aterrizando", () => {
  it("la de más cerca, que es la que manda", () => {
    expect(laMasCerca([CASA, OTRA], 100, 100)).toBe(CASA);
    expect(laMasCerca([CASA, OTRA], OTRA.x, OTRA.z + 300)).toBe(OTRA);
  });

  it("y a mitad de camino gana la que se tiene más cerca", () => {
    const medio = { x: OTRA.x / 2, z: OTRA.z / 2 };
    expect(laMasCerca([CASA, OTRA], medio.x - 1000, medio.z - 1000)).toBe(CASA);
    expect(laMasCerca([CASA, OTRA], medio.x + 1000, medio.z + 1000)).toBe(OTRA);
  });

  it("y sin pistas, nada", () => {
    expect(laMasCerca([], 0, 0)).toBeNull();
  });
});

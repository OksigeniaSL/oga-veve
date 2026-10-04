/**
 * **La senda de la final, con su referencia y su signo, medidos.**
 *
 * La pidió Enrique bajando a Gando: «un poco bajo para la pista» y al
 * momento «estás por encima de la senda». Lo de la pista se dice solo en su
 * cono (T10a), y aquí se comprueba lo otro: que alto es alto y bajo es bajo,
 * desde dónde se mide, y que el `G/S` del automático vuela la misma senda que
 * pinta el rombo —antes era otra, la del plan hasta el umbral mismo y
 * estirada con el viento, unos quince metros más baja al llegar—.
 */

import { describe, expect, it } from "vitest";
import {
  alturaDeLaSendaDeLaFinal,
  desvioEnLaFinal,
  FINAL_ENTRA,
  juzgarLaSenda,
  SENDA_DE_LA_FINAL,
} from "./perfil-vertical";

const MILLA = 1852;

describe("la senda de la final", () => {
  it("el automático en su senda deja el rombo en el medio, a cualquier distancia", () => {
    for (const millas of [0.5, 1, 3, 5, 8, 10]) {
      const suelo = millas * MILLA;
      const d = desvioEnLaFinal(alturaDeLaSendaDeLaFinal(suelo), suelo, 70);
      expect(Math.abs(d.grados ?? 1), `${millas} NM`).toBeLessThan(1e-9);
      expect(Math.abs(d.metros), `${millas} NM`).toBeLessThan(1e-6);
    }
  });

  it("son tres grados: a cinco millas, unos mil quinientos noventa pies sobre la pista", () => {
    const pies = alturaDeLaSendaDeLaFinal(5 * MILLA) / 0.3048;
    expect(pies).toBeGreaterThan(1580);
    expect(pies).toBeLessThan(1600);
    expect(SENDA_DE_LA_FINAL).toBe(3);
  });

  it("por encima es alto, por debajo es bajo, y el signo no se da la vuelta", () => {
    const suelo = 4 * MILLA;
    const en = alturaDeLaSendaDeLaFinal(suelo);
    const arriba = desvioEnLaFinal(en + 60, suelo, 70);
    const abajo = desvioEnLaFinal(en - 60, suelo, 70);
    expect(arriba.metros).toBeCloseTo(60, 6);
    expect(abajo.metros).toBeCloseTo(-60, 6);
    expect(arriba.puntos).toBeGreaterThan(0);
    expect(abajo.puntos).toBeLessThan(0);
    expect(juzgarLaSenda(arriba, null)).toBe("alto");
    expect(juzgarLaSenda(abajo, null)).toBe("bajo");
  });

  it("y se mide en ángulo, como el PAPI: diez metros cerca es más que diez metros lejos", () => {
    const cerca = desvioEnLaFinal(alturaDeLaSendaDeLaFinal(800) + 10, 800, 70);
    const lejos = desvioEnLaFinal(alturaDeLaSendaDeLaFinal(15000) + 10, 15000, 70);
    expect(cerca.grados!).toBeGreaterThan(FINAL_ENTRA);
    expect(lejos.grados!).toBeLessThan(FINAL_ENTRA);
  });
});

/**
 * Los avioncitos de las horas voladas.
 *
 * Lo que se comprueba es la cuenta, que es donde se puede mentir sin querer:
 * marcar como nuevo un avioncito que ya estaba —«esto lo acabo de ganar»
 * cuando no— es peor que no marcarlo, porque el premio deja de significar
 * nada en cuanto se nota.
 */

import { describe, expect, it } from "vitest";

import { AVIONES_MAXIMOS, MEDIA_HORA, dibujarReloj, relojDe } from "./reloj";

describe("el reloj de horas", () => {
  it("un avioncito por media hora", () => {
    expect(relojDe(0).aviones).toBe(0);
    expect(relojDe(MEDIA_HORA - 1).aviones).toBe(0);
    expect(relojDe(MEDIA_HORA).aviones).toBe(1);
    expect(relojDe(MEDIA_HORA * 5.9).aviones).toBe(5);
  });

  it("el arco es lo que va de la media hora en curso", () => {
    expect(relojDe(MEDIA_HORA / 2).fraccion).toBeCloseTo(0.5, 6);
    expect(relojDe(MEDIA_HORA * 3.25).fraccion).toBeCloseTo(0.25, 6);
  });

  it("marca como nuevo solo lo ganado en este vuelo", () => {
    // Se llevaban 55 minutos y este vuelo duró 10: se cruzó la hora, así que
    // hay un avioncito nuevo y solo uno.
    const r = relojDe(65 * 60, 10 * 60);
    expect(r.aviones).toBe(2);
    expect(r.nuevos).toBe(1);
  });

  it("y no marca ninguno si el vuelo no llegó a completar media hora", () => {
    // Catorce minutos sobre una hora clavada: la fila no cambia. Encender uno
    // aquí sería regalar un premio que no se ganó.
    const r = relojDe(60 * 60 + 14 * 60, 14 * 60);
    expect(r.aviones).toBe(2);
    expect(r.nuevos).toBe(0);
    // Pero el arco sí se mueve, que es justo para lo que está.
    expect(r.fraccion).toBeGreaterThan(0.4);
  });

  it("un vuelo larguísimo puede traer varios de golpe", () => {
    expect(relojDe(MEDIA_HORA * 3, MEDIA_HORA * 3).nuevos).toBe(3);
  });

  it("pasado el tope, la fila deja de crecer y lo demás va en cifra", () => {
    const r = relojDe(MEDIA_HORA * (AVIONES_MAXIMOS + 4));
    expect(r.aviones).toBe(AVIONES_MAXIMOS);
    expect(r.demas).toBe(4);
  });

  it("y ahí ya no se enciende nada, porque no se vería", () => {
    const r = relojDe(MEDIA_HORA * (AVIONES_MAXIMOS + 4), MEDIA_HORA * 2);
    expect(r.nuevos).toBe(0);
  });

  it("aguanta un cuaderno raro sin inventarse nada", () => {
    expect(relojDe(-500).aviones).toBe(0);
    expect(relojDe(-500).fraccion).toBe(0);
    expect(relojDe(MEDIA_HORA, 99999).nuevos).toBe(1);
  });
});

describe("el reloj dibujado", () => {
  it("sin nada volado, no dibuja nada", () => {
    expect(dibujarReloj(relojDe(0), "horas")).toBe("");
  });

  it("dibuja un avioncito por cada media hora, y su etiqueta", () => {
    const svg = dibujarReloj(relojDe(MEDIA_HORA * 3), "Lo que llevás volado");
    expect(svg.match(/reloj__avion/g)).toHaveLength(3);
    expect(svg).toContain('aria-label="Lo que llevás volado"');
  });

  it("y marca los nuevos, que son los últimos de la fila", () => {
    const svg = dibujarReloj(relojDe(MEDIA_HORA * 3, MEDIA_HORA), "horas");
    expect(svg.match(/reloj__avion--nuevo/g)).toHaveLength(1);
  });

  it("con el arco a cero sigue dibujando la fila", () => {
    expect(dibujarReloj(relojDe(MEDIA_HORA * 2), "horas")).toContain("reloj__avion");
  });
});

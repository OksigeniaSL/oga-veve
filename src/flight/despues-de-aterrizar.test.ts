/**
 * Los flaps, arriba al dejar la pista y no en la carrera. Ver
 * `despues-de-aterrizar.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  NADA_DICHO,
  flapsTrasLaToma,
  type LoDicho,
} from "./despues-de-aterrizar";
import type { Fase } from "./vuelo";

/** Recorre una secuencia de fases con su palanca y devuelve lo que tocó. */
function recorrer(pasos: readonly (readonly [Fase, number])[]): string[] {
  let dicho: LoDicho = NADA_DICHO;
  let antes: { fase: Fase | ""; palanca: number } = { fase: "", palanca: 0 };
  const dichos: string[] = [];
  for (const [fase, palanca] of pasos) {
    const r = flapsTrasLaToma(antes, { fase, palanca }, dicho);
    if (r.toca) dichos.push(r.toca);
    dicho = r.dicho;
    antes = { fase, palanca };
  }
  return dichos;
}

describe("después de tocar", () => {
  it("al salir de la pista con los flaps fuera, se recuerda subirlos", () => {
    expect(
      recorrer([
        ["final", 1],
        ["aterrizado", 1],
        ["abandonando", 1],
        ["a-plataforma", 1],
      ]),
    ).toEqual(["alSalir"]);
  });

  it("y si ya se subieron al salir, no se dice nada", () => {
    expect(
      recorrer([
        ["final", 1],
        ["aterrizado", 1],
        ["abandonando", 1],
        ["a-plataforma", 1],
        ["a-plataforma", 0],
        ["en-puesto", 0],
      ]),
    ).toEqual(["alSalir"]);
  });

  it("subirlos corriendo por la pista tiene su porqué, una vez", () => {
    expect(
      recorrer([
        ["final", 1],
        ["aterrizado", 1],
        ["aterrizado", 0],
        ["aterrizado", 1 / 3],
        ["aterrizado", 0],
        ["abandonando", 0],
        ["a-plataforma", 0],
      ]),
    ).toEqual(["enLaCarrera"]);
  });

  it("y llegar al puesto con ellos fuera se nota, sin castigo y una vez", () => {
    expect(
      recorrer([
        ["final", 1],
        ["aterrizado", 1],
        ["abandonando", 1],
        ["a-plataforma", 1],
        ["a-plataforma", 1],
        ["en-puesto", 1],
        ["en-puesto", 1],
      ]),
    ).toEqual(["alSalir", "alPuesto"]);
  });

  it("si se llega al puesto directo desde la pista, no se dicen dos seguidas", () => {
    expect(
      recorrer([
        ["aterrizado", 1],
        ["abandonando", 1],
        ["en-puesto", 1],
      ]),
    ).toEqual(["alSalir"]);
  });

  it("una toma nueva empieza de cero", () => {
    expect(
      recorrer([
        ["aterrizado", 1],
        ["abandonando", 1],
        ["a-plataforma", 1],
        ["rodando", 1],
        ["en-vuelo", 1],
        ["final", 1],
        ["aterrizado", 1],
        ["abandonando", 1],
        ["a-plataforma", 1],
      ]),
    ).toEqual(["alSalir", "alSalir"]);
  });

  it("sin flaps fuera no hay nada que recordar", () => {
    expect(
      recorrer([
        ["aterrizado", 0],
        ["abandonando", 0],
        ["a-plataforma", 0],
        ["en-puesto", 0],
      ]),
    ).toEqual([]);
  });
});

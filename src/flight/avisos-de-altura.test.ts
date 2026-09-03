/**
 * La cuenta atrás de la toma.
 *
 * Lo que se comprueba no son los números —esos están en la lista— sino **las
 * tres reglas que hacen que la cuenta enseñe en vez de estorbar**: se canta
 * bajando y no subiendo, no se repite, y una caída grande no suelta cuatro
 * palabras de golpe.
 */

import { describe, expect, it } from "vitest";
import { AvisosDeAltura } from "./avisos-de-altura";

/** Baja de una altura a otra de metro en metro y anota lo que se canta. */
const bajarDe = (a: AvisosDeAltura, desde: number, hasta: number): string[] => {
  const dichos: string[] = [];
  for (let h = desde; h >= hasta; h -= 1) {
    const aviso = a.paso(h, true);
    if (aviso) dichos.push(aviso.dice);
  }
  return dichos;
};

describe("los avisos de altura", () => {
  it("cantan la cuenta entera al bajar", () => {
    expect(bajarDe(new AvisosDeAltura(), 120, 0)).toEqual([
      "one hundred",
      "fifty",
      "thirty",
      "twenty",
      "ten",
      "five",
    ]);
  });

  it("no repiten un escalón por quedarse rondándolo", () => {
    const a = new AvisosDeAltura();
    bajarDe(a, 60, 45);
    // Arriba y abajo alrededor de los cincuenta, sin subir lo bastante.
    const otra: string[] = [];
    for (const h of [48, 52, 47, 53, 46]) {
      const aviso = a.paso(h, true);
      if (aviso) otra.push(aviso.dice);
    }
    expect(otra).toEqual([]);
  });

  it("se rearman si de verdad se vuelve a subir", () => {
    const a = new AvisosDeAltura();
    bajarDe(a, 60, 45);
    a.paso(70, true);
    expect(a.paso(45, true)?.dice).toBe("fifty");
  });

  it("una caída de golpe no suelta cuatro palabras a la vez", () => {
    const a = new AvisosDeAltura();
    a.paso(120, true);
    // De ciento veinte a ocho en un solo fotograma: se canta uno, el más alto.
    expect(a.paso(8, true)?.dice).toBe("one hundred");
  });

  it("rodando no se canta nada, por bajo que se vaya", () => {
    const a = new AvisosDeAltura();
    expect(a.paso(1, false)).toBeNull();
    expect(a.paso(0.5, false)).toBeNull();
  });

  it("tras tomar tierra la cuenta empieza de cero", () => {
    const a = new AvisosDeAltura();
    bajarDe(a, 120, 0);
    a.paso(0.5, false);
    expect(bajarDe(a, 120, 0).length).toBe(6);
  });
});

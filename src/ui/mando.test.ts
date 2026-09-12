/**
 * Lo que se puede comprobar del mando sin un mando enchufado.
 *
 * Que son dos cosas, y las dos son las que se notan al usarlo: cuándo repite
 * un botón que se mantiene, y a quién le toca el foco al dar un paso.
 */
import { describe, expect, it } from "vitest";
import {
  ANTES_DE_REPETIR,
  CADA_CUANTO_REPITE,
  elDeAlLado,
  tocaOtroPaso,
} from "./mando";

describe("cuándo repite un botón sostenido", () => {
  it("el primer paso va al pulsar, sin esperar", () => {
    expect(tocaOtroPaso(0, 0)).toBe(true);
  });

  it("y el segundo no llega hasta pasada la espera", () => {
    expect(tocaOtroPaso(ANTES_DE_REPETIR - 0.01, 1)).toBe(false);
    expect(tocaOtroPaso(ANTES_DE_REPETIR, 1)).toBe(true);
  });

  it("a partir de ahí anda solo, a su ritmo", () => {
    const tras = (pasos: number) =>
      ANTES_DE_REPETIR + (pasos - 1) * CADA_CUANTO_REPITE;
    expect(tocaOtroPaso(tras(2) - 0.01, 2)).toBe(false);
    expect(tocaOtroPaso(tras(2), 2)).toBe(true);
    expect(tocaOtroPaso(tras(9), 9)).toBe(true);
  });

  /*
   * Sostener medio segundo no puede llevarse media lista por delante. Con la
   * pantalla de mandos abierta —veintiséis paradas— un segundo entero tiene
   * que quedarse a mitad de camino, no dar la vuelta cuatro veces.
   */
  it("un segundo sostenido no recorre una lista larga entera", () => {
    let pasos = 0;
    while (tocaOtroPaso(1, pasos)) pasos++;
    expect(pasos).toBeLessThan(10);
    expect(pasos).toBeGreaterThan(2);
  });
});

describe("a quién le toca el foco con el mando", () => {
  const lista = ["a", "b", "c"];

  it("da la vuelta por los dos extremos", () => {
    expect(elDeAlLado(lista, "c", false)).toBe("a");
    expect(elDeAlLado(lista, "a", true)).toBe("c");
  });

  it("y en medio avanza, que es donde se distingue del tabulador", () => {
    // `aQuienLeToca` devuelve `null` aquí porque el navegador sigue solo. El
    // mando no tiene quien le siga: siempre hay respuesta.
    expect(elDeAlLado(lista, "b", false)).toBe("c");
    expect(elDeAlLado(lista, "b", true)).toBe("a");
  });

  it("si el foco se había escapado, vuelve a entrar por el extremo", () => {
    expect(elDeAlLado(lista, null, false)).toBe("a");
    expect(elDeAlLado(lista, null, true)).toBe("c");
    expect(elDeAlLado(lista, "z", false)).toBe("a");
  });

  it("con un solo mando se queda donde está", () => {
    expect(elDeAlLado(["a"], "a", false)).toBe("a");
  });

  it("y sin nada que enfocar no hay a dónde ir", () => {
    expect(elDeAlLado([], null, false)).toBeNull();
  });
});

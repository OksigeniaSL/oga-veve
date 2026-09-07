/**
 * El tabulador que da la vuelta, que es la mitad de un panel modal.
 *
 * Lo demás de `panel.ts` es enfocar y escuchar, y eso lo mide el banco de
 * accesibilidad con un navegador de verdad. Lo que se puede comprobar aquí es
 * la cuenta: a quién le toca cuando el foco está en un extremo.
 */

import { describe, expect, it } from "vitest";

import { aQuienLeToca } from "./panel";

const LISTA = ["cerrar", "idioma", "aceptar"];

describe("a quién le toca el foco", () => {
  it("en medio no interviene: que siga el navegador", () => {
    expect(aQuienLeToca(LISTA, "idioma", false)).toBeNull();
    expect(aQuienLeToca(LISTA, "idioma", true)).toBeNull();
  });

  it("del último salta al primero", () => {
    expect(aQuienLeToca(LISTA, "aceptar", false)).toBe("cerrar");
  });

  it("y hacia atrás desde el primero, al último", () => {
    expect(aQuienLeToca(LISTA, "cerrar", true)).toBe("aceptar");
  });

  it("si el foco ya se había escapado, lo mete de vuelta", () => {
    // Es el caso que se midió jugando: seis tabuladores dentro de los
    // créditos y el foco estaba en el botón del sonido, detrás del panel.
    expect(aQuienLeToca(LISTA, "sonido-de-atras", false)).toBe("cerrar");
    expect(aQuienLeToca(LISTA, "sonido-de-atras", true)).toBe("aceptar");
    expect(aQuienLeToca(LISTA, null, false)).toBe("cerrar");
  });

  it("con un solo control, se queda en él", () => {
    expect(aQuienLeToca(["cerrar"], "cerrar", false)).toBe("cerrar");
    expect(aQuienLeToca(["cerrar"], "cerrar", true)).toBe("cerrar");
  });

  it("y un panel sin nada que enfocar no atrapa a nadie", () => {
    expect(aQuienLeToca([], null, false)).toBeNull();
  });
});

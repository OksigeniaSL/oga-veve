import { describe, expect, it } from "vitest";
import { t, type TranslationKey } from "../i18n";
import { AIRCRAFT } from "./aircraft";
import { comoSeAterriza, loQueSeJuzga } from "./como-se-aterriza";
import { PELDANOS } from "./escalera";
import { claseDeRecogida } from "./recogida";

const texto = (clave: string): string => t(clave as TranslationKey);

describe("lo que se cuenta antes de la final dice lo mismo que la nota de después", () => {
  it("abajo, en sencillo: despacito, sin empujar la nariz y cerca de las rayas blancas grandes", () => {
    for (const peldano of ["dibujo", "palabra"] as const) {
      for (const a of AIRCRAFT) {
        const antes = texto(comoSeAterriza(peldano, claseDeRecogida(a))!);
        expect(antes).toContain("sin empujar la nariz para abajo");
        expect(texto(loQueSeJuzga(peldano, "duro"))).toContain("sin empujar la nariz para abajo");
        expect(antes).toContain("rayas blancas grandes");
        expect(texto(loQueSeJuzga(peldano, "largo"))).toContain("rayas blancas grandes");
      }
    }
  });

  it("en Taguató, la recogida de cada clase y la misma frase de la toma larga", () => {
    for (const a of AIRCRAFT) {
      const clase = claseDeRecogida(a);
      const antes = texto(comoSeAterriza("cifra", clase)!);
      expect(antes, a.id).toContain("la nariz un poquito arriba");
      expect(antes, a.id).toContain("mejor firme y en su sitio que suave y lejos");
      expect(texto(loQueSeJuzga("cifra", "largo")).toLowerCase()).toContain(
        "mejor firme y en su sitio que suave y lejos",
      );
      // La duro pide recoger: lo de antes dice cuándo, con la recogida de su manual.
      expect(texto(loQueSeJuzga("cifra", "duro"))).toContain("recogé");
      if (clase === "electricos") expect(antes).toContain("retard");
      if (clase === "helice") expect(antes).toContain("juntos");
    }
  });

  it("y en el de cabina no se explica, como todo lo demás", () => {
    expect(comoSeAterriza("cabina", "helice")).toBeNull();
    // Los tres de abajo, siempre algo.
    for (const p of PELDANOS.filter((p) => p !== "cabina"))
      expect(comoSeAterriza(p, "cables")).not.toBeNull();
  });
});

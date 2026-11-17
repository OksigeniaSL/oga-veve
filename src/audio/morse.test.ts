import { describe, expect, it } from "vitest";
import { morseDe } from "../world/radioayudas-publicadas";
import { ESPERA_DEL_MORSE, golpesDelMorse, TurnoDelMorse, unidadDelMorse } from "./morse";

describe("el morse de una radioayuda", () => {
  it("a siete palabras por minuto, la unidad es de 171 ms (PARIS, 1,2 / ppm)", () => {
    expect(unidadDelMorse()).toBeCloseTo(0.1714, 3);
  });

  it("FV son ··–· ···–: ocho tonos por vez, la raya tres veces el punto", () => {
    const u = unidadDelMorse();
    const { golpes } = golpesDelMorse(morseDe("FV"), 1);
    expect(golpes.map((g) => Math.round(g.dura / u))).toEqual([1, 1, 3, 1, 1, 1, 1, 3]);
    // Dentro de la letra, un hueco de una unidad; entre letras, de tres.
    expect((golpes[1]!.en - golpes[0]!.en - golpes[0]!.dura) / u).toBeCloseTo(1);
    expect((golpes[4]!.en - golpes[3]!.en - golpes[3]!.dura) / u).toBeCloseTo(3);
  });

  it("dos veces, con el hueco de una palabra (siete unidades) entre las dos", () => {
    const u = unidadDelMorse();
    const una = golpesDelMorse(morseDe("FV"), 1);
    const dos = golpesDelMorse(morseDe("FV"), 2);
    expect(dos.golpes).toHaveLength(16);
    expect(dos.dura / u).toBeCloseTo((2 * una.dura) / u + 7);
    // FV dos veces dura unos siete segundos y medio: se oye entero sin hacerse largo.
    expect(dos.dura).toBeGreaterThan(6);
    expect(dos.dura).toBeLessThan(9);
  });
});

describe("el turno del morse", () => {
  it("espera a que la boca quede libre, suena entero y acaba", () => {
    const t = new TurnoDelMorse();
    t.pedir("FV", morseDe("FV"), 0);
    expect(t.paso(0.1, true)).toBeNull();
    const empieza = t.paso(2, false);
    expect(empieza?.que).toBe("empieza");
    const dura = empieza?.que === "empieza" ? empieza.dura : 0;
    expect(t.paso(2 + dura / 2, false)).toBeNull();
    expect(t.paso(2 + dura + 0.01, false)).toEqual({ que: "acaba", id: "FV" });
    expect(t.paso(20, false)).toBeNull();
  });

  it("si empieza a hablar alguien, se corta y vuelve a sonar una vez cuando calla", () => {
    const t = new TurnoDelMorse();
    t.pedir("FV", morseDe("FV"), 0);
    // Primero el respiro para quien diga qué se tocó.
    expect(t.paso(0.1, false)).toBeNull();
    expect(t.paso(0.7, false)?.que).toBe("empieza");
    expect(t.paso(1, true)).toEqual({ que: "corta", id: "FV" });
    expect(t.paso(2, true)).toBeNull();
    expect(t.paso(3, false)?.que).toBe("empieza");
    // La segunda vez que se corta ya no se vuelve a pedir.
    expect(t.paso(4, true)).toEqual({ que: "corta", id: "FV" });
    expect(t.paso(5, false)).toBeNull();
  });

  it("lo que espera demasiado se cae: una espera sin salida es un candado", () => {
    const t = new TurnoDelMorse();
    t.pedir("FV", morseDe("FV"), 0);
    expect(t.paso(ESPERA_DEL_MORSE - 1, true)).toBeNull();
    expect(t.paso(ESPERA_DEL_MORSE + 0.1, true)).toEqual({ que: "caduca", id: "FV" });
    expect(t.paso(ESPERA_DEL_MORSE + 1, false)).toBeNull();
  });

  it("sintonizar otra estación corta la que suena y pone la nueva", () => {
    const t = new TurnoDelMorse();
    t.pedir("FV", morseDe("FV"), 0);
    expect(t.paso(0.7, false)?.que).toBe("empieza");
    t.pedir("FTV", morseDe("FTV"), 1);
    expect(t.paso(1, false)).toEqual({ que: "corta", id: "FV" });
    const nueva = t.paso(1.7, false);
    expect(nueva?.que === "empieza" && nueva.id).toBe("FTV");
  });
});

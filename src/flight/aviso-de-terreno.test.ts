/**
 * El aviso de terreno.
 *
 * Lo que se comprueba, como siempre con los avisos, es **cuándo se calla**:
 * volar bajo no es malo —se vuela bajo para aterrizar y para seguir un río—,
 * y un aviso que suena cuando no toca se aprende a no oír.
 */

import { describe, expect, it } from "vitest";
import { avisoDeTerreno, type Cerca } from "./aviso-de-terreno";

const volando = (c: Partial<Cerca> = {}): Cerca => ({
  sobreElSuelo: 400,
  vertical: 0,
  enElSuelo: false,
  enFinal: false,
  ...c,
});

describe("el aviso de terreno", () => {
  it("en crucero no dice nada", () => {
    expect(avisoDeTerreno(volando())).toBeNull();
  });

  it("bajo y bajando fuera de la aproximación, manda subir", () => {
    expect(avisoDeTerreno(volando({ sobreElSuelo: 80, vertical: -3 }))).toBe(
      "sube",
    );
  });

  it("bajo pero nivelado, solo pide atención", () => {
    expect(avisoDeTerreno(volando({ sobreElSuelo: 80, vertical: -0.5 }))).toBe(
      "bajo",
    );
  });

  it("se calla en la aproximación: ahí estar bajo es lo que toca", () => {
    expect(
      avisoDeTerreno(
        volando({ sobreElSuelo: 40, vertical: -4, enFinal: true }),
      ),
    ).toBeNull();
  });

  it("se calla subiendo: quien sube ya está resolviendo el problema", () => {
    expect(
      avisoDeTerreno(volando({ sobreElSuelo: 40, vertical: 3 })),
    ).toBeNull();
  });

  it("se calla en el suelo", () => {
    expect(
      avisoDeTerreno(
        volando({ sobreElSuelo: 0, vertical: -2, enElSuelo: true }),
      ),
    ).toBeNull();
  });

  it("rozando el suelo y bajando es lo más urgente que hay", () => {
    expect(avisoDeTerreno(volando({ sobreElSuelo: 25, vertical: -2 }))).toBe(
      "sube",
    );
  });
});

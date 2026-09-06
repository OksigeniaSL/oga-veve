/**
 * El aviso de terreno.
 *
 * Lo que se comprueba, como siempre con los avisos, es **cuándo se calla**:
 * volar bajo no es malo —se vuela bajo para aterrizar y para seguir un río—,
 * y un aviso que suena cuando no toca se aprende a no oír.
 */

import { describe, expect, it } from "vitest";
import { avisoDeTerreno, fueraDeLaSenda, type Cerca } from "./aviso-de-terreno";

const volando = (c: Partial<Cerca> = {}): Cerca => ({
  sobreElSuelo: 400,
  vertical: 0,
  enElSuelo: false,
  enFinal: false,
  sobreLaPista: false,
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

/*
 * **Y cuándo deja de valer «final» como excusa.**
 *
 * Grabado volando: aproximación larga sobre la ciudad, el avión bajando entre
 * los edificios y la pantalla muda hasta que se posó en un descampado. La
 * máquina de fases decía «final» —alineado, por delante del umbral, bajando—
 * y con eso el aviso de terreno se callaba justo cuando era el único que
 * quedaba. Ver `fueraDeLaSenda`.
 */
describe("cuándo «final» deja de explicar lo que se está haciendo", () => {
  /** Tres grados, que es la senda de este juego. */
  const TRES = Math.tan((3 * Math.PI) / 180);

  it("en la senda, no pasa nada", () => {
    // A dos kilómetros la senda va por ciento cinco metros.
    expect(fueraDeLaSenda(2000, 105, TRES)).toBe(false);
  });

  it("un poco bajo tampoco: una senda no es un raíl", () => {
    expect(fueraDeLaSenda(2000, 70, TRES)).toBe(false);
  });

  it("pero a diez metros y a dos kilómetros, eso ya no es una senda", () => {
    expect(fueraDeLaSenda(2000, 10, TRES)).toBe(true);
  });

  it("y cerca del umbral no se juzga, que ahí hay que estar bajo", () => {
    expect(fueraDeLaSenda(200, 2, TRES)).toBe(false);
  });

  it("sin distancia conocida, no se opina", () => {
    expect(fueraDeLaSenda(Infinity, 0, TRES)).toBe(false);
  });
});

describe("sobre la pista", () => {
  it("no se avisa, aunque se vaya bajo y bajando", () => {
    // «Eso de que me avise que voy a terrain cuando ya estoy sobre la cabecera
    // de la pista.» Ahí ir bajo no es un peligro: es el plan.
    expect(
      avisoDeTerreno(
        volando({ sobreElSuelo: 20, vertical: -3, sobreLaPista: true }),
      ),
    ).toBe(null);
  });

  it("y fuera de ella el mismo caso sí avisa", () => {
    expect(
      avisoDeTerreno(volando({ sobreElSuelo: 20, vertical: -3 })),
    ).not.toBe(null);
  });
});

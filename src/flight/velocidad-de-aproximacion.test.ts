/**
 * La banda de velocidad de la aproximación.
 *
 * Lo que se comprueba es **cuándo se calla**, que es la mitad del diseño: una
 * señal que está siempre encendida deja de ser una señal.
 */

import { describe, expect, it } from "vitest";
import {
  bandaDeRodaje,
  bandaDeVelocidad,
  type Aproximando,
} from "./velocidad-de-aproximacion";

const VREF = 33;
const bajando = (cambios: Partial<Aproximando> = {}): Aproximando => ({
  sobreElSuelo: 120,
  enElSuelo: false,
  vertical: -3,
  velocidad: VREF,
  ...cambios,
});

describe("la banda de velocidad", () => {
  it("en la senda y a su velocidad, va bien", () => {
    expect(bandaDeVelocidad(bajando(), VREF)).toBe("bien");
  });

  it("avisa de lento antes que de rápido, que es lo que mata", () => {
    // Un cinco por ciento por debajo ya avisa; un cinco por encima todavía no.
    expect(bandaDeVelocidad(bajando({ velocidad: VREF * 0.95 }), VREF)).toBe(
      "lento",
    );
    expect(bandaDeVelocidad(bajando({ velocidad: VREF * 1.05 }), VREF)).toBe(
      "bien",
    );
    expect(bandaDeVelocidad(bajando({ velocidad: VREF * 1.2 }), VREF)).toBe(
      "rapido",
    );
  });

  it("se calla en crucero, por deprisa que se vaya", () => {
    expect(
      bandaDeVelocidad(bajando({ sobreElSuelo: 1200, velocidad: 70 }), VREF),
    ).toBeNull();
  });

  it("se calla volando bajo y nivelado: eso no es aproximar", () => {
    expect(bandaDeVelocidad(bajando({ vertical: 0 }), VREF)).toBeNull();
  });

  it("se calla en el suelo y en la recogida", () => {
    expect(bandaDeVelocidad(bajando({ enElSuelo: true }), VREF)).toBeNull();
    expect(bandaDeVelocidad(bajando({ sobreElSuelo: 2 }), VREF)).toBeNull();
  });

  it("cada avión con la suya: lo que es bien para uno es rápido para otro", () => {
    expect(bandaDeVelocidad(bajando({ velocidad: 33 }), 33)).toBe("bien");
    expect(bandaDeVelocidad(bajando({ velocidad: 33 }), 29)).toBe("rapido");
  });
});

describe("la banda de rodaje", () => {
  it("a paso de rodaje, bien", () => {
    expect(bandaDeRodaje(9, true, false)).toBe("bien");
  });

  it("pasado de vueltas, aviso", () => {
    expect(bandaDeRodaje(20, true, false)).toBe("rapido");
  });

  it("no hay banda de lento: ir despacio rodando no tiene nada de malo", () => {
    expect(bandaDeRodaje(4, true, false)).toBe("bien");
  });

  it("se calla en la pista, que es donde toca correr", () => {
    expect(bandaDeRodaje(60, true, true)).toBeNull();
  });

  it("se calla en el aire y estando parado", () => {
    expect(bandaDeRodaje(60, false, false)).toBeNull();
    expect(bandaDeRodaje(0.5, true, false)).toBeNull();
  });
});

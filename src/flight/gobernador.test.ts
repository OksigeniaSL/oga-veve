/**
 * El tope de velocidad en tierra.
 *
 * «No hay control de velocidad en pista, mil veces dicho.» Lo que se comprueba
 * es que el tope **existe** y que no molesta: que a velocidad de rodaje no
 * toca nada, que se puede seguir al coche del sígame sin que meta mano, y que
 * pasarse de verdad sí cuesta.
 */

import { describe, expect, it } from "vitest";
import { topeDeRodaje } from "./gobernador";

/** La velocidad de rodaje de este juego. */
const RODAJE = 9;

const a = (velocidad: number) => topeDeRodaje({ velocidad, rodaje: RODAJE });

describe("el tope de rodaje", () => {
  it("a velocidad de rodaje no toca nada", () => {
    expect(a(RODAJE)).toEqual({ gas: 1, freno: 0 });
    expect(a(4).gas).toBe(1);
    expect(a(0).freno).toBe(0);
  });

  it("y deja seguir al coche del sígame sin estorbar", () => {
    // El coche va a once. Si el tope mordiera ahí, seguirle sería imposible.
    expect(a(10.3).gas).toBe(1);
    expect(a(10.3).freno).toBe(0);
  });

  it("pasándose, el gas se va cerrando", () => {
    expect(a(12).gas).toBeLessThan(1);
    expect(a(14).gas).toBeLessThan(a(12).gas);
  });

  it("y pasándose mucho, ya no queda gas", () => {
    expect(a(16).gas).toBe(0);
    expect(a(30).gas).toBe(0);
  });

  it("el freno entra después del gas, no a la vez", () => {
    // Un frenazo automático nada más pasarse se siente como un fallo.
    expect(a(12).freno).toBe(0);
    expect(a(20).freno).toBeGreaterThan(0);
  });

  it("y nunca clava el avión", () => {
    expect(a(60).freno).toBeLessThanOrEqual(0.6);
  });

  it("se va cerrando, no es un interruptor", () => {
    // Entre el rodaje y el tope duro hay una rampa: si fuera un escalón, el
    // avión daría un tirón y eso se lee como un fallo del juego.
    const rampa = [11, 12, 13, 14, 15].map((v) => a(v).gas);
    for (let i = 1; i < rampa.length; i++) {
      expect(rampa[i]!).toBeLessThanOrEqual(rampa[i - 1]!);
    }
    expect(new Set(rampa).size).toBeGreaterThan(2);
  });
});

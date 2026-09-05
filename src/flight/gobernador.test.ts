/**
 * El tope de velocidad en tierra.
 *
 * «No hay control de velocidad en pista, mil veces dicho.» Lo que se comprueba
 * es que el tope **existe**, que no molesta a quien rueda como se debe, y que
 * no se pasa de listo: es un techo de velocidad y nada más.
 */

import { describe, expect, it } from "vitest";
import { topeDeRodaje } from "./gobernador";

/** La velocidad de rodaje de este juego. */
const RODAJE = 9;

const a = (velocidad: number) => topeDeRodaje({ velocidad, rodaje: RODAJE });

describe("el tope de rodaje", () => {
  it("es un techo de velocidad, no un mando", () => {
    // Se contesta en metros por segundo porque «medio gas» no significa lo
    // mismo en los dos modelos de vuelo, y la velocidad sí.
    expect(a(RODAJE).velocidad).toBeGreaterThan(RODAJE);
  });

  it("y deja seguir al coche del sígame sin estorbar", () => {
    // El coche va a once. Si el tope mordiera ahí, seguirle sería imposible.
    expect(a(10.3).velocidad).toBeGreaterThanOrEqual(10.3);
  });

  it("no cambia por ir más rápido: el techo es el mismo", () => {
    // Un techo que baja según te pasas es un frenazo con otro nombre, y el
    // avión acababa clavado en cero por su cuenta.
    for (const v of [4, 12, 20, 60]) {
      expect(a(v).velocidad).toBe(a(RODAJE).velocidad);
    }
  });

  it("y nunca deja el avión parado", () => {
    // «Que deje el avión a 0 y siga diciendo que frene es una exageración.»
    expect(a(60).velocidad).toBeGreaterThan(RODAJE);
  });

  it("sale de la velocidad de rodaje del sitio, no de un número suelto", () => {
    expect(a(4).velocidad).toBeLessThan(
      topeDeRodaje({
        velocidad: 4,
        rodaje: RODAJE * 2,
      }).velocidad,
    );
  });
});

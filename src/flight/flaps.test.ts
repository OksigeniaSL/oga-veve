/**
 * La palanca de flaps: **por muescas, no de todo a nada**.
 *
 * Era un interruptor de dos posiciones y se notó jugando: «¿por qué los flaps
 * se ponen todo o nada?». La palanca de un avión tiene topes y se baja de uno
 * en uno, y cada tope hace una cosa distinta — el primero es para despegar y el
 * último para aterrizar. El cuadro de mandos lleva dibujadas las cuatro muescas
 * desde el primer día; lo que faltaba era que el mando se parara en ellas.
 */

import { describe, expect, it } from "vitest";
import { DETENTES, siguienteDetente } from "./input";

describe("las muescas de la palanca", () => {
  it("son cuatro, de cero a todo", () => {
    expect(DETENTES).toHaveLength(4);
    expect(DETENTES[0]).toBe(0);
    expect(DETENTES[DETENTES.length - 1]).toBe(1);
  });

  it("y van en orden, sin repetirse", () => {
    for (let i = 1; i < DETENTES.length; i++) {
      expect(DETENTES[i]!).toBeGreaterThan(DETENTES[i - 1]!);
    }
  });

  it("bajan de una en una", () => {
    expect(siguienteDetente(0)).toBe(1);
    expect(siguienteDetente(DETENTES[1]!)).toBe(2);
    expect(siguienteDetente(DETENTES[2]!)).toBe(3);
  });

  it("y desde abajo del todo se vuelve a arriba", () => {
    expect(siguienteDetente(1)).toBe(0);
  });

  it("un valor que no es ninguna muesca cae en la más cercana", () => {
    // Puede venir de un guion, de un banco o de una partida vieja: un
    // `indexOf` sobre coma flotante devuelve −1 el día menos pensado.
    expect(siguienteDetente(0.34)).toBe(2);
    expect(siguienteDetente(0.98)).toBe(0);
  });

  it("dar cuatro toques devuelve la palanca a su sitio", () => {
    let cual = 0;
    for (let i = 0; i < DETENTES.length; i++)
      cual = siguienteDetente(DETENTES[cual]!);
    expect(DETENTES[cual]).toBe(0);
  });
});

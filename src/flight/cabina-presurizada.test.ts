/**
 * La altitud de cabina: el número que dice si dentro se puede respirar.
 *
 * Preguntado jugando a diecisiete mil pies: «¿qué pasa si tengo una
 * despresurización a mucha altitud? Tengo pocos minutos para ponerme a altura
 * de aire respirable». La avería todavía no está; lo que sí está es el número
 * que la haría entenderse, y lo que se comprueba aquí es que dice la verdad.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, PYKASU, YVAGA } from "./aircraft";
import { altitudDeCabina, TOPE_DE_CABINA } from "./cabina-presurizada";

describe("la cabina de un presurizado", () => {
  it("en el suelo está en el suelo", () => {
    expect(altitudDeCabina(0, YVAGA)).toBe(0);
  });

  it("sube, pero mucho menos que el avión", () => {
    const avion = 8000;
    const cabina = altitudDeCabina(avion, YVAGA);
    expect(cabina).toBeGreaterThan(0);
    expect(cabina).toBeLessThan(avion / 2);
  });

  it("y se para en los ocho mil pies, por muy arriba que se vaya", () => {
    // Es el tope que fija la normativa y el que llevan todos.
    expect(altitudDeCabina(11000, YVAGA)).toBeCloseTo(TOPE_DE_CABINA, 6);
    expect(altitudDeCabina(20000, YVAGA)).toBeCloseTo(TOPE_DE_CABINA, 6);
  });

  it("y nunca va por encima del avión", () => {
    // Al principio de la subida el reparto lineal podría pasarse; no lo hace.
    for (let y = 0; y <= 12000; y += 250)
      expect(altitudDeCabina(y, YVAGA)).toBeLessThanOrEqual(y + 1e-9);
  });
});

describe("y la de uno sin presurizar", () => {
  it("está donde está el avión, que es la verdad", () => {
    expect(altitudDeCabina(2500, PYKASU)).toBe(2500);
    expect(altitudDeCabina(6000, PYKASU)).toBe(6000);
  });
});

describe("y la flota lo dice cada una de su manera", () => {
  it("los que cruzan alto van presurizados y los que no, no", () => {
    /*
     * No es un detalle de ficha: es **por eso** por lo que sus alturas de
     * crucero son las que son. Un avión sin presurizar no sube por encima de
     * unos tres mil metros porque allí el aire ya no da.
     */
    for (const a of AIRCRAFT) {
      if (a.alturaDeCrucero > 6000) expect(a.presurizada).toBe(true);
      if (a.alturaDeCrucero <= 3000) expect(a.presurizada).toBe(false);
    }
  });
});

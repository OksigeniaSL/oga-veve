/**
 * **La ventanilla ALT en la final**: la altitud de la frustrada, solo donde
 * se entiende y solo cuando la manda la senda.
 *
 * Gran Canaria, de noche, con el JAZ 120 en Guyrami: bajando, la ventanilla
 * decía 2.100 —la altitud del punto de final— y al pasarlo saltó a 3.000.
 * «Ningún sentido que, descendiendo, cuando me dice 2100 ahora me sube a 3000
 * si estoy llegando a la pista.» Y tenía razón dos veces:
 *
 * - En una cabina de verdad la altitud de la frustrada se pone en la
 *   ventanilla **con el automático bajando por la senda**: la bajada la
 *   manda el `G/S` y la ventanilla queda lista por si hay que irse. Sin ese
 *   modo puesto y escrito en el FMA, un 3.000 en magenta encima de quien baja
 *   a la pista no es «por si acaso»: es un objetivo que sube.
 * - Y en los dos peldaños de abajo, donde no se leen cifras, no se explica:
 *   la frase que lo contaba está sin grabar. Un número que sube sin que nadie
 *   diga por qué enseña lo contrario de lo que se quiere.
 *
 * Los números son los de Gando: el punto de final a 2.100 ft y el campo a 78.
 */

import { describe, expect, it } from "vitest";
import { ventanillaEnLaFinal } from "./altitud-seleccionada";
import { canalesDe } from "./escalera";
import { GUYRAMI, TAGUATO, TAGUATO_RUVICHA, TUKA, type Tier } from "./tiers";

const GANDO = { delFinal: 2100, campo: 78, tope: 39000 };

const enLaFinal = (tramo: Tier, enAproximacion: boolean): number | null =>
  ventanillaEnLaFinal({
    ...GANDO,
    conCifras: canalesDe(tramo.avisos).cifra,
    enAproximacion,
  });

describe("la ventanilla en la final", () => {
  it("en Guyrami y en Tukã no cambia: ni a mano ni con el automático", () => {
    for (const tramo of [GUYRAMI, TUKA]) {
      expect(enLaFinal(tramo, false), tramo.id).toBeNull();
      expect(enLaFinal(tramo, true), tramo.id).toBeNull();
    }
  });

  it("de Taguato para arriba, a mano tampoco: sin el G/S puesto, la ventanilla no sube", () => {
    for (const tramo of [TAGUATO, TAGUATO_RUVICHA])
      expect(enLaFinal(tramo, false), tramo.id).toBeNull();
  });

  it("y con el automático bajando por la senda, la de la frustrada: 3.000 en Gando", () => {
    for (const tramo of [TAGUATO, TAGUATO_RUVICHA])
      expect(enLaFinal(tramo, true), tramo.id).toBe(3000);
  });

  it("nunca menos de mil quinientos pies sobre el campo, ni más allá del tope de la rueda", () => {
    const alta = { conCifras: true, enAproximacion: true, delFinal: 1200, campo: 1500, tope: 39000 };
    expect(ventanillaEnLaFinal(alta)).toBe(4000);
    expect(ventanillaEnLaFinal({ ...alta, tope: 3000 })).toBe(3000);
  });
});

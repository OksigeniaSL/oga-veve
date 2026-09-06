/**
 * El listón de «esto ya no es aterrizar» y la velocidad de rodaje.
 *
 * **No son dos números independientes**, y aprenderlo costó un vuelo entero.
 * Se subió la velocidad de rodaje a trece —para que el rodaje no durase cuatro
 * minutos— y los listones de la carrera de aterrizaje se quedaron en doce y
 * nueve. Resultado: el avión volvía a casa a once o doce, por encima del
 * listón, y la máquina de fases se quedaba clavada en «aterrizado» todo el
 * camino: sin «salí de la pista», sin señalero, sin «volvé a tu lugar» y con
 * la tarjeta del freno puesta hasta el puesto.
 *
 * Ninguna prueba por trozos podía verlo. Esta sí, y es una línea.
 */

import { describe, expect, it } from "vitest";
import { AÚN_ATERRIZANDO, YA_ES_RODAJE } from "./vuelo";
import { CRUCERO } from "../world/plan-de-vuelo";

/** Lo que el tope de rodaje deja ir por encima del crucero. Ver `gobernador`. */
const HOLGURA = 1.15;

describe("aterrizar y rodar", () => {
  it("rodando a velocidad de rodaje, el juego ya no cree que aterrizas", () => {
    expect(YA_ES_RODAJE).toBeGreaterThan(CRUCERO * HOLGURA);
  });

  it("y entre los dos listones queda banda muerta", () => {
    // Si no, la fase parpadea: «frená», «salí», «frená»…
    expect(AÚN_ATERRIZANDO).toBeGreaterThan(YA_ES_RODAJE + 2);
  });
});

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
import { AÚN_ATERRIZANDO, YA_ES_RODAJE, dejaDeAterrizar } from "./vuelo";
import {
  DE_CERCANIAS,
  DE_TRANSPORTE,
  LIGERO,
} from "./velocidades-en-tierra";

/** Lo que el tope de rodaje deja ir por encima del crucero. Ver `gobernador`. */
const HOLGURA = 1.15;

describe("aterrizar y rodar", () => {
  it("rodando a velocidad de rodaje, el juego ya no cree que aterrizas", () => {
    /*
     * La de **cualquier** avión, y en la recta larga, que es lo más que se
     * rueda: un avión de línea a treinta nudos por la pista hacia su salida
     * no está aterrizando.
     */
    for (const t of [DE_TRANSPORTE, DE_CERCANIAS, LIGERO])
      expect(YA_ES_RODAJE).toBeGreaterThan(t.rectaLarga * HOLGURA);
  });

  it("y por una salida rápida se deja de aterrizar a su velocidad", () => {
    // Cincuenta nudos: tomándola a eso, ya no se pide «frená».
    expect(dejaDeAterrizar(DE_TRANSPORTE.salidaRapida)).toBe(DE_TRANSPORTE.salidaRapida);
    // Y por una en ángulo, a la de rodaje de siempre.
    expect(dejaDeAterrizar(DE_TRANSPORTE.viraje)).toBe(YA_ES_RODAJE);
    expect(dejaDeAterrizar()).toBe(YA_ES_RODAJE);
  });

  it("y entre los dos listones queda banda muerta", () => {
    // Si no, la fase parpadea: «frená», «salí», «frená»…
    expect(AÚN_ATERRIZANDO).toBeGreaterThan(YA_ES_RODAJE + 2);
  });
});

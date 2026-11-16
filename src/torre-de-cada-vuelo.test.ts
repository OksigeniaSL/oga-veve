/**
 * **Cada vuelo nuevo empieza con la torre limpia**, venga del camino que
 * venga: el reinicio (`resetFlight`, y `reiniciarEnFinal` que sale de él) u
 * otro tramo desde donde está el avión (`empezarOtroTramo`).
 *
 * Otro tramo reiniciaba solo la frecuencia —`radio.reiniciar`— y dejaba en el
 * turno de pista lo del tramo de antes: el número dos, el permiso de aterrizar
 * pedido y sin dar, si estabas en final, los retenidos con su reloj, la orden
 * de tu salida y sus cuentas para el banco, y en la boca las frases de una
 * frecuencia que ya no existe. Lo que deja todo eso a cero es
 * `TurnoDePista.reiniciar`, que reinicia también la frecuencia.
 *
 * `game.ts` no se puede montar sin el navegador, así que se mira su texto: que
 * los dos caminos pasen por el turno y que ninguno reinicie solo la frecuencia.
 * Lo que hace `TurnoDePista.reiniciar` lo prueban las del turno; ver
 * `roja-de-verdad.test.ts`.
 */
import { describe, expect, it } from "vitest";
import juego from "./game.ts?raw";

/** El cuerpo de un método de `game.ts`, de su firma a la llave que lo cierra. */
function cuerpoDe(firma: RegExp): string {
  const m = firma.exec(juego);
  if (!m) return "";
  let hondo = 0;
  const desde = juego.indexOf("{", m.index + m[0].length - 1);
  for (let i = desde; i < juego.length; i++) {
    if (juego[i] === "{") hondo++;
    else if (juego[i] === "}" && --hondo === 0) return juego.slice(desde, i + 1);
  }
  return "";
}

describe("la torre, limpia en cada vuelo", () => {
  for (const [nombre, firma] of [
    ["resetFlight", /\n {2}resetFlight\(\): void \{/],
    ["empezarOtroTramo", /\n {2}private empezarOtroTramo\(\): void \{/],
  ] as const)
    it(`${nombre} reinicia el turno de pista entero, no solo la frecuencia`, () => {
      const cuerpo = cuerpoDe(firma);
      expect(cuerpo, `no se encontró ${nombre} en game.ts`).not.toBe("");
      expect(cuerpo).toMatch(/this\.turno\.reiniciar\(/);
      expect(cuerpo).not.toMatch(/this\.radio\.reiniciar\(/);
    });
});

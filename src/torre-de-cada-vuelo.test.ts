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
 * **Y su tráfico dibujado, con ella** (H23b). Otro tramo reiniciaba el turno y
 * dejaba el dibujo: el tráfico que se vio al llegar seguía en el campo, con
 * matrículas que la frecuencia nueva ya no nombraba. Lo de verdad es que un
 * vuelo nuevo empieza con la gente del campo de ahora, y la de antes no se
 * queda: lo hacía `resetFlight` y no otro tramo. Ahora los dos pasan por
 * `laTorreYSuTraficoDeCero`, que reinicia el turno y vacía el tráfico.
 *
 * `game.ts` no se puede montar sin el navegador, así que se mira su texto: que
 * los dos caminos pasen por ahí, que eso reinicie el turno entero y vacíe el
 * dibujo, y que ninguno reinicie solo la frecuencia. Lo que hacen
 * `TurnoDePista.reiniciar` y `Trafico.vaciar` —del vuelo de antes no queda
 * nadie, ni dibujado ni en la frecuencia— lo prueba `roja-de-verdad.test.ts`.
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
    ["empezarOtroTramo", /\n {2}private empezarOtroTramo\([^)]*\): void \{/],
  ] as const)
    it(`${nombre} reinicia el turno de pista entero y vacía su tráfico, no solo la frecuencia`, () => {
      const cuerpo = cuerpoDe(firma);
      expect(cuerpo, `no se encontró ${nombre} en game.ts`).not.toBe("");
      expect(cuerpo).toMatch(/this\.laTorreYSuTraficoDeCero\(/);
      expect(cuerpo).not.toMatch(/this\.radio\.reiniciar\(/);
    });

  it("y lo de cero es el turno entero y el tráfico dibujado, juntos", () => {
    const cuerpo = cuerpoDe(/\n {2}private laTorreYSuTraficoDeCero\([^)]*\): void \{/);
    expect(cuerpo, "no se encontró laTorreYSuTraficoDeCero en game.ts").not.toBe("");
    expect(cuerpo).toMatch(/this\.turno\.reiniciar\(/);
    expect(cuerpo).toMatch(/this\.trafico\?\.vaciar\(\)/);
  });
});

/**
 * Quién tiene la palabra, probado sin navegador.
 *
 * `Boca` no sabe hablar: recibe una función que habla y un `listo` que hay que
 * llamar al terminar. Así que aquí se habla con cadenas y se termina a mano,
 * que es exactamente lo que hace falta para probar una política de turnos.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { Boca, CADUCA } from "./boca";

let reloj = 0;
let cortes = 0;
const boca = () => {
  reloj = 0;
  cortes = 0;
  return new Boca({ ahora: () => reloj, cancelar: () => void cortes++ });
};

/** Lo que se va diciendo, y cómo terminar cada frase. */
function coro() {
  const dicho: string[] = [];
  const acabar: Record<string, () => void> = {};
  const frase = (texto: string) => (listo: () => void) => {
    dicho.push(texto);
    acabar[texto] = listo;
  };
  return { dicho, acabar, frase };
}

beforeEach(() => {
  reloj = 0;
  cortes = 0;
});

describe("la boca", () => {
  it("con nadie hablando, se habla", () => {
    const b = boca();
    const { dicho, frase } = coro();
    b.pedir("normal", frase("uno"));
    expect(dicho).toEqual(["uno"]);
    expect(b.ocupada).toBe(true);
  });

  /*
   * **Éste es el fallo que se vino a arreglar.**
   *
   * «En V1 te avisa con una exclamación y enseguida dice lo siguiente, y el
   * audio se medio corta para dar paso al otro.» V1 y rotar son dos cantos
   * separados por un segundo: el segundo no puede llevarse por delante al
   * primero, tiene que esperar a que acabe.
   */
  it("lo que no es más urgente espera su turno, no corta", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("V one"));
    b.pedir("normal", frase("rotate"));
    expect(dicho).toEqual(["V one"]);
    expect(cortes).toBe(0);
    acabar["V one"]!();
    expect(dicho).toEqual(["V one", "rotate"]);
  });

  it("y lo más urgente sí corta", () => {
    const b = boca();
    const { dicho, frase } = coro();
    b.pedir("normal", frase("vas bajo para la pista"));
    b.pedir("urgente", frase("¡Subí!"));
    expect(dicho).toEqual(["vas bajo para la pista", "¡Subí!"]);
    expect(cortes).toBe(1);
  });

  it("pero un elogio no corta nada", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("vas bajo"));
    b.pedir("baja", frase("¡bien!"));
    expect(dicho).toEqual(["vas bajo"]);
    acabar["vas bajo"]!();
    expect(dicho).toEqual(["vas bajo", "¡bien!"]);
  });

  /*
   * Una plaza y nada más. Es lo que el comentario de `voz.ts` pedía desde
   * siempre para la cuenta atrás de altura: si todavía suena «twenty» cuando
   * toca «ten», lo que hay que oír es «ten» — no los dos.
   */
  it("solo guarda una, y manda la última", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("thirty"));
    b.pedir("normal", frase("twenty"));
    b.pedir("normal", frase("ten"));
    acabar["thirty"]!();
    expect(dicho).toEqual(["thirty", "ten"]);
  });

  /*
   * **Y lo que espera demasiado no se dice.**
   *
   * Un aviso de vuelo habla del avión de ahora. «Vas bajo para la pista»
   * dicho cuatro segundos después, cuando ya has corregido, no llega tarde:
   * llega mintiendo.
   */
  it("lo que caduca no se dice", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("larga"));
    b.pedir("normal", frase("vas bajo"));
    reloj += CADUCA + 1;
    acabar["larga"]!();
    expect(dicho).toEqual(["larga"]);
    expect(b.ocupada).toBe(false);
  });

  it("y justo antes de caducar sí se dice", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("larga"));
    b.pedir("normal", frase("vas bajo"));
    reloj += CADUCA - 1;
    acabar["larga"]!();
    expect(dicho).toEqual(["larga", "vas bajo"]);
  });

  it("callar corta y olvida lo que esperaba", () => {
    const b = boca();
    const { dicho, frase } = coro();
    b.pedir("normal", frase("uno"));
    b.pedir("normal", frase("dos"));
    b.callar();
    expect(cortes).toBe(1);
    expect(b.ocupada).toBe(false);
    expect(dicho).toEqual(["uno"]);
  });

  /*
   * **Y un `listo` que llega tarde no arranca nada.**
   *
   * `speechSynthesis` avisa del final de frases que ya se cortaron, y a veces
   * con retraso. Atender ese aviso pondría a hablar a la siguiente **encima**
   * de la que está sonando, que es el fallo que se vino a arreglar, otra vez y
   * por la puerta de atrás.
   */
  it("el final de una frase ya cortada no cuenta", () => {
    const b = boca();
    const { dicho, acabar, frase } = coro();
    b.pedir("normal", frase("la cortada"));
    b.pedir("urgente", frase("¡Subí!"));
    b.pedir("normal", frase("la que espera"));
    // Llega, tarde, el final de la que se cortó.
    acabar["la cortada"]!();
    expect(dicho).toEqual(["la cortada", "¡Subí!"]);
    // Y cuando acaba la que de verdad estaba sonando, entonces sí.
    acabar["¡Subí!"]!();
    expect(dicho).toEqual(["la cortada", "¡Subí!", "la que espera"]);
  });
});

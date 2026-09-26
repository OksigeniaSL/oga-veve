/**
 * Qué frases son la lámpara de la torre hablándote a vos.
 *
 * Es lo que se retira de la cola cuando la luz cambia de color: lo que decía
 * la de antes ya no es verdad. Lo que la torre les dice a los demás aviones no
 * se toca, y lo que no es de la lámpara —la autorización de la ruta, los
 * cantos de cabina— tampoco. Ver `luzDeTorre` en `game.ts`.
 */

import { describe, expect, it } from "vitest";
import { esDeLaLampara } from "./torre";

describe("la lámpara de la torre", () => {
  it("son sus luces y sus órdenes de pista, con tu matrícula", () => {
    for (const clave of [
      "torre.canario.roja@fonetico.zulu-fonetico.papa",
      "torre.roja",
      "torre.verde@fonetico.zulu",
      "torre.canario.holdShort@fonetico.zulu",
      "torre.canario.clearedTakeoff.L@fonetico.zulu-cifra.0-cifra.3",
      "torre.clearedLand@fonetico.zulu-cifra.1-cifra.2",
      "torre.canario.goAround@fonetico.zulu",
      "palabra.alAire@fonetico.zulu",
      "palabra.canario.alAire",
    ])
      expect(esDeLaLampara(clave, "mando"), clave).toBe(true);
  });

  it("pero no lo que la torre les dice a los demás", () => {
    expect(
      esDeLaLampara("torre.canario.holdShort@fonetico.echo", "baja"),
    ).toBe(false);
  });

  it("ni lo que no es de la pista", () => {
    for (const clave of [
      "torre.canario.clearedTo@fonetico.zulu",
      "torre.canario.destino",
      "vuelo.alineando",
      "cabina.v1",
      undefined,
    ])
      expect(esDeLaLampara(clave, "mando"), String(clave)).toBe(false);
  });
});

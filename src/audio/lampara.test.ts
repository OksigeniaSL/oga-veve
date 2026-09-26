/**
 * Qué frases son la lámpara de la torre hablándote a vos.
 *
 * Es lo que se retira de la cola cuando la luz cambia de color: lo que decía
 * la de antes ya no es verdad. Lo que la torre les dice a los demás aviones no
 * se toca, y lo que no es de la lámpara —la autorización de la ruta, los
 * cantos de cabina— tampoco. Ver `luzDeTorre` en `game.ts`.
 */

import { describe, expect, it } from "vitest";
import { Boca } from "./boca";
import { daLaPistaAOtro, esDeLaFrecuencia, esDeLaLampara } from "./torre";

/** Tu matrícula como va en la clave, detrás de la arroba. */
const YO = "fonetico.zulu-fonetico.papa";

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

describe("y a quién va, cuando se sabe", () => {
  /*
   * La torre le quita la pista a otro en `mando`, justo antes de dártela, y en
   * el mismo fotograma en que tu luz se pone verde. Por el peso solo, la
   * lámpara lo tomaba por suyo y lo retiraba.
   */
  it("lo que va a tu matrícula es de tu lámpara", () => {
    expect(
      esDeLaLampara(`torre.canario.clearedTakeoff.L@${YO}-cifra.0-cifra.3`, "mando", YO),
    ).toBe(true);
    expect(esDeLaLampara(`torre.canario.verde@${YO}`, "mando", YO)).toBe(true);
    // Sin pack de voz la clave no lleva a quién: se decide por el peso.
    expect(esDeLaLampara("torre.canario.verde", "mando", YO)).toBe(true);
  });

  it("y lo que va a otra, no, aunque vaya en mando", () => {
    expect(
      esDeLaLampara(
        "torre.canario.clearedTakeoff.L@fonetico.echo-fonetico.kilo-cifra.0-cifra.3",
        "mando",
        YO,
      ),
    ).toBe(false);
    expect(
      esDeLaLampara("torre.canario.goAround@fonetico.echo-fonetico.kilo", "mando", YO),
    ).toBe(false);
  });
});

describe("la pista que la torre les dio a los demás", () => {
  it("son sus tres órdenes de pista, en baja, con el habla y el lado", () => {
    for (const clave of [
      "torre.lineUpWait@fonetico.echo-cifra.0-cifra.2",
      "torre.canario.clearedTakeoff.L@fonetico.echo-cifra.0-cifra.3",
      "torre.canario.clearedLand@fonetico.echo-cifra.1-cifra.2",
      "torre.clearedLand",
    ])
      expect(daLaPistaAOtro(clave, "baja"), clave).toBe(true);
  });

  it("pero no lo tuyo, ni lo que se la quita, ni lo que no es de la pista", () => {
    // Lo tuyo va en mando: tu propia autorización no se retira.
    expect(daLaPistaAOtro("torre.clearedLand@yo", "mando")).toBe(false);
    for (const clave of [
      "torre.holdShort@fonetico.echo",
      "torre.canario.goAround@fonetico.echo",
      "otro.pistaLibre@fonetico.echo",
      "otro.enCola@fonetico.echo",
      undefined,
    ])
      expect(daLaPistaAOtro(clave, "baja"), String(clave)).toBe(false);
  });

  it("y la frecuencia entera es la torre y los demás, en baja", () => {
    expect(esDeLaFrecuencia("otro.enCola@fonetico.echo", "baja")).toBe(true);
    expect(esDeLaFrecuencia("torre.canario.clearedLand@fonetico.echo", "baja")).toBe(true);
    // La tuya no: esa va con el campo al que vas.
    expect(esDeLaFrecuencia("torre.canario.clearedLand@yo", "mando")).toBe(false);
    // Y lo que señala la comandante tampoco, que va en baja y no es radio.
    expect(esDeLaFrecuencia("hito.teide", "baja")).toBe(false);
  });
});

describe("tu autorización, y lo que se oye detrás", () => {
  /** Una boca con reloj de mentira, y lo que va diciendo. */
  function montar() {
    const reloj = { t: 0 };
    const b = new Boca({ ahora: () => reloj.t, cancelar: () => {} });
    const dicho: string[] = [];
    const acabar: Record<string, () => void> = {};
    const frase = (texto: string) => (listo: () => void) => {
      dicho.push(texto);
      acabar[texto] = listo;
    };
    return { reloj, b, dicho, acabar, frase };
  }

  /*
   * El caso de Pettirossi, en la boca: otro avión pide aterrizar y mientras
   * habla la torre ya le ha contestado «line up and wait» a un tercero, que
   * espera turno en baja. En ese momento la pista pasa a ser tuya, con la
   * boca ocupada: lo de los demás se retira y no se les dice nada en voz alta.
   */
  it("lo que se les dio a los demás no suena detrás de tu «cleared to land»", () => {
    const { reloj, b, dicho, acabar, frase } = montar();
    b.pedir("baja", frase("en cola"), "otro.enCola@fonetico.hotel");
    b.pedir(
      "baja",
      frase("line up (otro)"),
      "torre.lineUpWait@fonetico.kilo-cifra.0-cifra.2",
    );
    b.retirar(daLaPistaAOtro);
    b.retirar((c, u) => esDeLaLampara(c, u, YO));
    b.pedir(
      "mando",
      frase("cleared to land (yo)"),
      `torre.clearedLand@${YO}-cifra.0-cifra.2`,
    );
    reloj.t += 4000;
    acabar["en cola"]!();
    reloj.t += 6000;
    acabar["cleared to land (yo)"]!();
    expect(dicho).toEqual(["en cola", "cleared to land (yo)"]);
  });

  /*
   * Y con la boca libre, la orden al que tenía la pista suena ya y la tuya
   * detrás. Una frase de torre con matrícula y pista son unos seis segundos
   * —medido en el volcado de Pettirossi, de una a la siguiente—, lejos de los
   * doce que aguanta tu autorización esperando.
   */
  it("y con la boca libre, primero se la quitan al otro y después te la dan", () => {
    const { reloj, b, dicho, acabar, frase } = montar();
    b.pedir("mando", frase("go around (otro)"), "torre.goAround@fonetico.echo");
    b.retirar((c, u) => esDeLaLampara(c, u, YO));
    b.pedir(
      "mando",
      frase("cleared to land (yo)"),
      `torre.clearedLand@${YO}-cifra.0-cifra.2`,
    );
    reloj.t += 6000;
    acabar["go around (otro)"]!();
    expect(dicho).toEqual(["go around (otro)", "cleared to land (yo)"]);
  });
});

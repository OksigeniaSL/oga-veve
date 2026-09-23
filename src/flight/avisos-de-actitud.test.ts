/**
 * Los avisos de cómo se vuela.
 *
 * Lo que se comprueba no son los umbrales —esos están escritos con su
 * derivación al lado— sino las tres cosas que, mal hechas, convierten un aviso
 * en ruido: que **no salte volando normal**, que sea **más exigente cuanto más
 * bajo**, y que **calle en la recogida**, porque un aterrizaje se hace bajando
 * a propósito.
 */

import { describe, expect, it } from "vitest";
import {
  ALABEO_QUE_SOBRA,
  avisoDeActitud,
  DEMASIADO_ALTO,
  RECOGIDA,
  ritmoQueSobra,
} from "./avisos-de-actitud";

/** Un avión volando, al que se le cambia lo que haga falta. */
const volando = (cambios: Partial<Parameters<typeof avisoDeActitud>[0]>) => ({
  enSuelo: false,
  altura: 200,
  vertical: -2,
  alabeo: 0,
  ...cambios,
});

const grados = (g: number) => (g * Math.PI) / 180;

describe("el ritmo de bajada que sobra", () => {
  it("es más exigente cuanto más bajo, que es lo que lo hace real", () => {
    // Un número fijo diría que bajar a seis por segundo está igual de mal a
    // trescientos metros que a treinta, y no: a trescientos es un descenso.
    expect(ritmoQueSobra(61)).toBeLessThan(ritmoQueSobra(305));
  });

  it("y cuadra con lo que dispara un GPWS de verdad", () => {
    /*
     * Los tres puntos del modo 1, pasados a m/s:
     *   200 ft → 1000 ft/min = 5,0    500 ft → 1500 = 7,6    1000 ft → 2500 = 12,7
     * Si alguien toca la recta, esto lo dice.
     */
    expect(ritmoQueSobra(61)).toBeCloseTo(5.0, 1);
    expect(ritmoQueSobra(152)).toBeCloseTo(7.9, 1);
    expect(ritmoQueSobra(305)).toBeCloseTo(12.7, 1);
  });
});

describe("sink rate", () => {
  it("no salta en una aproximación normal", () => {
    /*
     * La que más importa de todas. Una senda de tres grados a la velocidad de
     * aproximación de una avioneta baja a unos tres metros y medio por
     * segundo: si el aviso saltara ahí, saltaría en **todos** los aterrizajes
     * y se aprendería a no oírlo.
     */
    expect(avisoDeActitud(volando({ altura: 150, vertical: -3.5 }))).toBe(null);
    expect(avisoDeActitud(volando({ altura: 60, vertical: -3.5 }))).toBe(null);
    expect(avisoDeActitud(volando({ altura: 30, vertical: -3 }))).toBe(null);
  });

  it("y sí cuando se baja de más para lo bajo que se está", () => {
    expect(avisoDeActitud(volando({ altura: 60, vertical: -8 }))).toBe(
      "sink rate",
    );
  });

  it("y el mismo ritmo, alto, no es nada", () => {
    // Ocho por segundo a sesenta metros es un problema; a doscientos ochenta
    // es un avión bajando. El aviso mira los dos números, no uno.
    expect(avisoDeActitud(volando({ altura: 280, vertical: -8 }))).toBe(null);
  });

  it("calla en la recogida, porque un aterrizaje se hace bajando", () => {
    /*
     * Por debajo de quince metros el avión se está posando a propósito y el
     * aviso no avisa de nada: solo tapa lo que sí importa. Es la misma
     * decisión que el canto de pérdida, y por el mismo motivo — aterrizar no
     * se dramatiza.
     */
    expect(avisoDeActitud(volando({ altura: RECOGIDA - 1, vertical: -9 }))).toBe(
      null,
    );
  });

  it("y por encima de mil pies tampoco, que ahí bajar es bajar", () => {
    expect(
      avisoDeActitud(volando({ altura: DEMASIADO_ALTO + 10, vertical: -20 })),
    ).toBe(null);
  });

  it("y subiendo, jamás", () => {
    expect(avisoDeActitud(volando({ altura: 60, vertical: 9 }))).toBe(null);
  });
});

describe("bank angle", () => {
  it("no salta en un viraje bien hecho", () => {
    // Treinta grados es un viraje de manual y el automático de este juego se
    // para en veinticinco. Un aviso que salte ahí enseña a no hacer caso.
    expect(avisoDeActitud(volando({ alabeo: grados(30) }))).toBe(null);
  });

  it("y sí cuando el avión va de lado", () => {
    expect(avisoDeActitud(volando({ alabeo: grados(50) }))).toBe("bank angle");
  });

  it("y da igual hacia qué lado", () => {
    expect(avisoDeActitud(volando({ alabeo: -grados(50) }))).toBe("bank angle");
  });

  it("y a cualquier altura, porque un mal viraje es un mal viraje", () => {
    expect(
      avisoDeActitud(volando({ altura: 2000, alabeo: grados(60) })),
    ).toBe("bank angle");
  });

  it("y el tope está donde el ala empieza a pedir vez y media su peso", () => {
    // A 45° el factor de carga es 1/cos(45) = 1,41. Es el número del que sale
    // la pérdida en viraje, y por eso el aviso va ahí y no en treinta y cinco.
    expect(1 / Math.cos(ALABEO_QUE_SOBRA)).toBeCloseTo(1.41, 2);
  });
});

describe("y los dos a la vez", () => {
  it("manda el de bajar, que es el que tiene suelo debajo", () => {
    // Dos frases pisándose son dos frases perdidas. Quien va de lado bajando
    // deprisa tiene un problema, no dos.
    expect(
      avisoDeActitud(
        volando({ altura: 60, vertical: -9, alabeo: grados(60) }),
      ),
    ).toBe("sink rate");
  });
});

describe("y en el suelo", () => {
  it("no se avisa de nada, por torcido que esté", () => {
    // Rodando con una rueda en la hierba el alabeo puede ser cualquier cosa.
    expect(
      avisoDeActitud({
        enSuelo: true,
        altura: 0,
        vertical: -12,
        alabeo: grados(70),
      }),
    ).toBe(null);
  });
});

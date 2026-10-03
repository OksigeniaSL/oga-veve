/**
 * «Salí de la pista, que viene otro», una y otra vez: «es una pesada». Lo
 * que se dice en la pista se dice una vez por toma, y lo que insiste es la
 * torre. Ver `lo-dicho-en-la-pista.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  DEJA_DE_PEDIR,
  NADA_DICHO_EN_LA_PISTA,
  PIDE_FRENAR,
  hayQueFrenarEnLaPista,
  laTorreMetePrisa,
  seDiceEnLaPista,
  type LoDichoEnLaPista,
} from "./lo-dicho-en-la-pista";

describe("una vez por toma", () => {
  it("la primera vez se dice, y la segunda no", () => {
    let dicho: LoDichoEnLaPista = NADA_DICHO_EN_LA_PISTA;
    const a = seDiceEnLaPista(dicho, "salir");
    expect(a.dice).toBe(true);
    dicho = a.dicho;
    // Acelera hacia la salida, vuelve a la carrera, frena: otra vez «salí».
    expect(seDiceEnLaPista(dicho, "salir").dice).toBe(false);
  });

  it("y cada frase lleva su cuenta", () => {
    const a = seDiceEnLaPista(NADA_DICHO_EN_LA_PISTA, "frena");
    expect(seDiceEnLaPista(a.dicho, "salir").dice).toBe(true);
    expect(seDiceEnLaPista(a.dicho, "frena").dice).toBe(false);
  });

  it("el vaivén entre la carrera y salir, diez veces, son dos frases", () => {
    let dicho: LoDichoEnLaPista = NADA_DICHO_EN_LA_PISTA;
    let dichas = 0;
    for (let i = 0; i < 10; i++) {
      for (const que of ["frena", "salir"] as const) {
        const r = seDiceEnLaPista(dicho, que);
        dicho = r.dicho;
        if (r.dice) dichas++;
      }
    }
    expect(dichas).toBe(2);
  });
});

describe("la torre mete prisa a quien se para en la pista", () => {
  const parado = {
    abandonando: true,
    enLaPista: true,
    porElSuelo: 0.2,
    parado: 0.6,
    hayTorre: true,
  };
  const yaDicho = seDiceEnLaPista(NADA_DICHO_EN_LA_PISTA, "salir").dicho;

  it("parado en la pista después de oír que había que dejarla", () => {
    expect(laTorreMetePrisa(yaDicho, parado)).toBe(true);
  });

  it("una vez: si se vuelve a parar, ya lo sabe", () => {
    expect(laTorreMetePrisa({ ...yaDicho, prisa: true }, parado)).toBe(false);
  });

  it("rodando hacia la salida, no", () => {
    expect(laTorreMetePrisa(yaDicho, { ...parado, porElSuelo: 8 })).toBe(false);
  });

  it("fuera de la pista, tampoco", () => {
    expect(laTorreMetePrisa(yaDicho, { ...parado, enLaPista: false })).toBe(false);
  });

  it("ni donde no hay torre que mande: en casa o con un AFIS", () => {
    expect(laTorreMetePrisa(yaDicho, { ...parado, hayTorre: false })).toBe(false);
  });

  it("ni antes de que se dijera que había que salir", () => {
    expect(laTorreMetePrisa(NADA_DICHO_EN_LA_PISTA, parado)).toBe(false);
  });
});

describe("frená, hasta la velocidad de la salida", () => {
  const enLaCarrera = (porElSuelo: number, toca: number, yaSePedia = false) =>
    hayQueFrenarEnLaPista({
      fase: "aterrizado",
      enLaPista: true,
      porElSuelo,
      toca,
      yaSePedia,
    });

  it("al tocar, sí", () => {
    expect(enLaCarrera(70, 25.7)).toBe(true);
  });

  it("a la velocidad de una salida rápida, ya no: a esa se toma", () => {
    expect(enLaCarrera(25.7, 25.7)).toBe(false);
  });

  it("con su banda muerta: se pide pasada la de arriba y se deja bajo la de abajo", () => {
    expect(enLaCarrera(25.7 + PIDE_FRENAR - 0.1, 25.7)).toBe(false);
    expect(enLaCarrera(25.7 + PIDE_FRENAR - 0.1, 25.7, true)).toBe(true);
    expect(enLaCarrera(25.7 + DEJA_DE_PEDIR - 0.1, 25.7, true)).toBe(false);
  });

  it("y fuera de la pista, o volando, no lo pide la pista", () => {
    expect(
      hayQueFrenarEnLaPista({
        fase: "abandonando",
        enLaPista: false,
        porElSuelo: 30,
        toca: 5,
        yaSePedia: false,
      }),
    ).toBe(false);
    expect(
      hayQueFrenarEnLaPista({
        fase: "final",
        enLaPista: true,
        porElSuelo: 70,
        toca: 5,
        yaSePedia: false,
      }),
    ).toBe(false);
  });
});

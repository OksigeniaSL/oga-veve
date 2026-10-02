/**
 * La regla de turnos, en su orden. Ver la cabecera de `turnos.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  CALMA,
  ENTRE_DOS,
  Huecos,
  TRAS_LA_MEGAFONIA,
  esDeLaMegafonia,
  pesoDe,
} from "./turnos";

describe("quién habla primero", () => {
  it("lo urgente, lo tuyo, la instructora, la megafonía y la frecuencia, en ese orden", () => {
    const orden = [
      pesoDe("vuelo.terrenoSube", "urgente"),
      pesoDe("torre.aterrizar@z-p", "mando"),
      pesoDe("vuelo.final", "normal"),
      pesoDe("comandante.descenso", "baja"),
      pesoDe("otro.final@c-a", "baja"),
    ];
    expect([...orden].sort((a, b) => b - a)).toEqual(orden);
    expect(new Set(orden).size).toBe(orden.length);
  });

  it("la megafonía se reconoce por su clave, y la ventanilla de la avioneta no es suya", () => {
    expect(esDeLaMegafonia("comandante.crosscheck")).toBe(true);
    expect(esDeLaMegafonia("tripulacion.canario.servicio@mani")).toBe(true);
    expect(esDeLaMegafonia("ventanilla@saludo-teide")).toBe(true);
    expect(esDeLaMegafonia("ventanilla")).toBe(true);
    expect(esDeLaMegafonia("ventanilla.vos@teide")).toBe(false);
    expect(esDeLaMegafonia("vuelo.aire.oidos")).toBe(false);
    expect(esDeLaMegafonia(undefined)).toBe(false);
  });
});

describe("lo que espera su hueco se reparte", () => {
  const callado = { alguienHabla: false, megafoniaHabla: false };
  const anuncio = { alguienHabla: true, megafoniaHabla: true };

  it("no se cuenta encima de nadie ni en el primer segundo de silencio", () => {
    const r = new Huecos();
    r.paso(1, { alguienHabla: true, megafoniaHabla: false });
    expect(r.hayHueco).toBe(false);
    r.paso(CALMA - 0.5, callado);
    expect(r.hayHueco).toBe(false);
    r.paso(1, callado);
    expect(r.hayHueco).toBe(true);
  });

  it("y la de los oídos, un rato después del anuncio de la bajada, no encima", () => {
    const r = new Huecos();
    // El azafato anuncia la bajada durante seis segundos.
    for (let t = 0; t < 6; t++) r.paso(1, anuncio);
    r.paso(CALMA, callado);
    expect(r.hayHueco).toBe(false);
    r.paso(TRAS_LA_MEGAFONIA - CALMA, callado);
    expect(r.hayHueco).toBe(true);
  });

  it("y dos cosas que esperaban no van una detrás de otra", () => {
    const r = new Huecos();
    r.paso(CALMA, callado);
    expect(r.hayHueco).toBe(true);
    r.usar();
    // La lección suena y acaba: aunque haya silencio, la siguiente espera.
    for (let t = 0; t < 5; t++) r.paso(1, { alguienHabla: true, megafoniaHabla: false });
    r.paso(CALMA + 1, callado);
    expect(r.hayHueco).toBe(false);
    r.paso(ENTRE_DOS, callado);
    expect(r.hayHueco).toBe(true);
  });
});

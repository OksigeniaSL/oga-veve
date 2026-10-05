/**
 * A qué velocidad se rueda: lo del manual, por clase, y no un número para
 * los seis. Ver `velocidades-en-tierra.ts`.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, aircraftById } from "./aircraft";
import {
  DE_TRANSPORTE,
  FONDO_DE_LA_BARRA,
  GIRO_DE_UNA_SALIDA_RAPIDA,
  LIGERO,
  barraDeRodaje,
  parteDeLaBarra,
  velocidadDeLaSalida,
  velocidadesEnTierra,
} from "./velocidades-en-tierra";

const NUDO = 0.514444;
const enNudos = (v: number) => Math.round(v / NUDO);

describe("rodando, lo del manual", () => {
  it("un avión de línea: veinte en recta, treinta en las largas, diez en los virajes", () => {
    const t = velocidadesEnTierra(aircraftById("jaz-120"));
    expect(enNudos(t.recta)).toBe(20);
    expect(enNudos(t.rectaLarga)).toBe(30);
    expect(enNudos(t.viraje)).toBe(10);
  });

  it("y su salida rápida, a cincuenta: la de la clave 3 o 4 del Anexo 14", () => {
    expect(enNudos(velocidadesEnTierra(aircraftById("jaz-90")).salidaRapida)).toBe(50);
  });

  it("el turbohélice rueda como uno de línea, y sale por la rápida a la de su clave", () => {
    const t = velocidadesEnTierra(aircraftById("jaz-60"));
    expect(t.recta).toBe(DE_TRANSPORTE.recta);
    expect(enNudos(t.salidaRapida)).toBe(35);
  });

  it("y una avioneta, más despacio en todo", () => {
    for (const id of ["jaz-20", "jaz-25", "jaz-40"]) {
      const t = velocidadesEnTierra(aircraftById(id));
      expect(t, id).toBe(LIGERO);
      expect(t.recta).toBeLessThan(DE_TRANSPORTE.recta);
      expect(t.viraje).toBeLessThan(DE_TRANSPORTE.viraje);
    }
  });

  it("en todos, el viraje por debajo de la recta y la recta por debajo de la larga", () => {
    for (const a of AIRCRAFT) {
      const t = velocidadesEnTierra(a);
      expect(t.viraje, a.id).toBeLessThan(t.recta);
      expect(t.recta, a.id).toBeLessThan(t.rectaLarga);
      expect(t.rectaLarga, a.id).toBeLessThan(t.salidaRapida);
    }
  });
});

describe("saliendo de la pista, a la velocidad de la salida", () => {
  it("una rápida, a la suya; una en ángulo, a la de viraje", () => {
    const t = DE_TRANSPORTE;
    expect(velocidadDeLaSalida(t, 30)).toBe(t.salidaRapida);
    expect(velocidadDeLaSalida(t, GIRO_DE_UNA_SALIDA_RAPIDA)).toBe(t.salidaRapida);
    expect(velocidadDeLaSalida(t, 90)).toBe(t.viraje);
    expect(velocidadDeLaSalida(t, 60)).toBe(t.viraje);
  });
});

/*
 * **La marca de la barra de la GS, tramo a tramo.** «¿Qué es esa barra verde
 * en el radar?»: una barra que se llena sin decir hasta dónde. La marca es la
 * velocidad que toca en el tramo que se rueda, y cambia al llegar a la curva o
 * a la salida. Ver `barraDeRodaje`.
 */
describe("la marca de la barra de rodar", () => {
  it("va donde toca en cada tramo, y cambia de uno a otro", () => {
    for (const a of AIRCRAFT) {
      const t = velocidadesEnTierra(a);
      const maxima = Math.max(t.rectaLarga, t.salidaRapida);
      const marca = (toca: number) => {
        const b = barraDeRodaje(t.recta, toca, maxima);
        return parteDeLaBarra(b.toca, b.escala);
      };
      // Antes de la curva, la marca baja; en la recta larga, sube; en la boca
      // de la salida rápida, más todavía; y en la que sale en ángulo, a la de
      // viraje.
      expect(marca(t.viraje), a.id).toBeLessThan(marca(t.recta));
      expect(marca(t.recta), a.id).toBeLessThan(marca(t.rectaLarga));
      expect(marca(t.rectaLarga), a.id).toBeLessThan(marca(velocidadDeLaSalida(t, 30)));
      expect(marca(velocidadDeLaSalida(t, 90)), a.id).toBe(marca(t.viraje));
      // Y la que toca, en nudos y redonda: la de la tabla.
      expect(barraDeRodaje(0, t.recta, maxima).toca, a.id).toBe(enNudos(t.recta));
    }
  });

  it("y la barra tiene sitio por encima de lo más que se rueda, para verse pasada", () => {
    const t = DE_TRANSPORTE;
    const b = barraDeRodaje(t.salidaRapida, t.salidaRapida, t.salidaRapida);
    expect(b.escala).toBeCloseTo(enNudos(t.salidaRapida) * FONDO_DE_LA_BARRA, 0);
    expect(parteDeLaBarra(b.nudos, b.escala)).toBeLessThan(1);
    // Y pasado del todo, llena y no más.
    expect(parteDeLaBarra(b.escala * 2, b.escala)).toBe(1);
  });

  it("con la raya acabando en la doble raya, la marca va a cero: parar", () => {
    const b = barraDeRodaje(3, 0, DE_TRANSPORTE.rectaLarga);
    expect(b.toca).toBe(0);
    expect(b.nudos).toBeGreaterThan(b.toca);
  });

  it("y no tiembla: medio nudo es lo más fino que se mueve", () => {
    const una = barraDeRodaje(5, 10.01 * NUDO, DE_TRANSPORTE.rectaLarga).toca;
    const otra = barraDeRodaje(5, 10.12 * NUDO, DE_TRANSPORTE.rectaLarga).toca;
    expect(una).toBe(otra);
  });
});

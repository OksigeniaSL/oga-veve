/**
 * A qué velocidad se rueda: lo del manual, por clase, y no un número para
 * los seis. Ver `velocidades-en-tierra.ts`.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, aircraftById } from "./aircraft";
import {
  DE_TRANSPORTE,
  GIRO_DE_UNA_SALIDA_RAPIDA,
  LIGERO,
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

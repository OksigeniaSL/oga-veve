/**
 * La salida de pista se toma hacia donde se va, no dando media vuelta.
 *
 * Aterrizando por la 12 de Los Rodeos, la raya elegía la E2, que sale de la
 * pista a ciento setenta grados del sentido de la carrera: ahorraba metros de
 * calle, y a cambio el avión rodaba pista adelante, daba media vuelta sobre
 * el asfalto y deshacía doscientos metros hacia atrás, alejándose del coche
 * del sígame que lo esperaba. El banco no lo veía porque no contaba la
 * distancia al coche mientras se pisaba pista.
 */

import { describe, expect, it } from "vitest";
import gcxo from "../../data/aerodromes/gcxo.aero.json";
import type { Aerodrome, Punto } from "./aerodrome";
import { construirGrafo } from "./rodaje";
import { enEjesDePista } from "./rumbo";
import { TENERIFE_NORTE } from "./scenarios";
import { haciaDondeSale, saleHaciaDelante } from "./plan-de-vuelo";

const NORTE = gcxo as unknown as Aerodrome;

/** Las calles que cuelgan de la pista, con dónde nacen y hacia dónde van. */
function salidasDeLaPista(): {
  ref: string | null;
  along: number;
  haciaDelante: boolean;
}[] {
  const grafo = construirGrafo(NORTE);
  const r = TENERIFE_NORTE.runway;
  const salidas: { ref: string | null; along: number; haciaDelante: boolean }[] =
    [];
  grafo.nudos.forEach((nudo: Punto, i) => {
    const { along, across } = enEjesDePista(
      nudo[0],
      -nudo[1],
      r.x,
      r.z,
      r.heading,
    );
    if (Math.abs(across) > r.width / 2) return;
    for (const t of grafo.desde[i] ?? []) {
      const tramo = grafo.tramos[t]!;
      if (tramo.pista) continue;
      const d = haciaDondeSale(tramo, nudo);
      if (!d) continue;
      salidas.push({
        ref: tramo.ref,
        along,
        haciaDelante: saleHaciaDelante(d, r.heading),
      });
    }
  });
  return salidas;
}

describe("por dónde se deja la pista en Los Rodeos, aterrizando por la 12", () => {
  it("la 12 es la preferente, que es la del caso", () => {
    expect(TENERIFE_NORTE.runway.heading).toBeCloseTo(110.7, 0);
  });

  it("la E2 sale hacia atrás y no cuenta como salida por delante", () => {
    const e2 = salidasDeLaPista().filter((s) => s.ref === "E2");
    expect(e2.length).toBeGreaterThan(0);
    for (const s of e2) expect(s.haciaDelante).toBe(false);
  });

  it("y la E4 sí, que es la rápida de la 12", () => {
    const e4 = salidasDeLaPista().filter((s) => s.ref === "E4");
    expect(e4.some((s) => s.haciaDelante)).toBe(true);
  });

  it("un ángulo recto vale, y media vuelta no", () => {
    // Rumbo 90: hacia delante es el este, (1, 0) en el fichero.
    expect(saleHaciaDelante([1, 0], 90)).toBe(true);
    expect(saleHaciaDelante([0, 1], 90)).toBe(true);
    expect(saleHaciaDelante([0, -1], 90)).toBe(true);
    expect(saleHaciaDelante([-1, 0], 90)).toBe(false);
    expect(saleHaciaDelante([-0.98, 0.17], 90)).toBe(false);
  });
});

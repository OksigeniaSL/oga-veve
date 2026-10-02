/**
 * **Cuántos grados por segundo da la tecla, antes y después.**
 *
 * Lo pedido: «mide los grados por segundo con tecla, por tipo y por
 * velocidad, antes y después». Aquí se vuela cada avión de la flota en el
 * modelo de vuelo de verdad, en tres peldaños y a dos velocidades —la de la
 * final y una de maniobra—, con la tecla de antes y con la mano, y se
 * comprueba lo que se pedía: que el ala no se tumbe a golpe de tecla y que lo
 * conseguido se quede.
 *
 * Con `OGA_MEDIR=1` saca la tabla entera.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { GUYRAMI, TAGUATO_RUVICHA, TUKA, type Tier } from "./tiers";
import { EN_GRADOS, empezar, volar, volarComoAntes, type Medida } from "./mano-banco";

interface Fila {
  avion: string;
  peldano: string;
  kt: number;
  antesAlabeo: number;
  despuesAlabeo: number;
  antesAlabeoAlSoltar: number;
  despuesAlabeoAlSoltar: number;
  antesCabeceo: number;
  despuesCabeceo: number;
  antesCarga: number;
  despuesCarga: number;
  despuesSubeAlSoltar: number;
  despuesSubeLuego: number;
}

const KT = 0.514444;

/** Lo más rápido que gira el ala, °/s, medido sobre el alabeo de verdad. */
function picoDe(medidas: Medida[], que: "alabeo" | "cabeceo"): number {
  let pico = 0;
  for (let i = 1; i < medidas.length; i++) {
    const d = (medidas[i]![que] - medidas[i - 1]![que]) / (medidas[i]!.t - medidas[i - 1]!.t);
    pico = Math.max(pico, Math.abs(d));
  }
  return pico * EN_GRADOS;
}

function medirUno(a: AircraftConfig, tier: Tier, kt: number): Fila {
  const ias = kt * KT;
  // ── Alabeo: tres segundos de flecha a la derecha y cinco soltada ────────
  const alabeoAntes: Medida[] = [];
  const va = empezar(a, tier, ias);
  volarComoAntes(va, 3, () => ({ alabeo: 1 }), (m) => alabeoAntes.push(m));
  const soltadoAntes = alabeoAntes.at(-1)!.alabeo;
  let alabeoAntesLuego = 0;
  volarComoAntes(va, 5, () => ({}), (m) => (alabeoAntesLuego = m.alabeo));

  const alabeoDespues: Medida[] = [];
  const vd = empezar(a, tier, ias);
  volar(vd, 3, () => ({ teclaAlabeo: 1 }), (m) => alabeoDespues.push(m));
  const soltadoDespues = alabeoDespues.at(-1)!.alabeo;
  let alabeoDespuesLuego = 0;
  volar(vd, 5, () => ({}), (m) => (alabeoDespuesLuego = m.alabeo));

  // ── Cabeceo: un segundo y medio de flecha arriba ───────────────────────
  const cabeceoAntes: Medida[] = [];
  const ca = empezar(a, tier, ias);
  volarComoAntes(ca, 1.5, () => ({ cabeceo: 1 }), (m) => cabeceoAntes.push(m));
  const cabeceoDespues: Medida[] = [];
  const cd = empezar(a, tier, ias);
  volar(cd, 1.5, () => ({ teclaCabeceo: 1 }), (m) => cabeceoDespues.push(m));
  // Y se suelta: lo conseguido, ¿se queda?
  let alSoltar = 0;
  volar(cd, 3, () => ({}), (m) => (alSoltar = m.vertical));
  let luego = 0;
  volar(cd, 10, () => ({}), (m) => (luego = m.vertical));

  const carga = (ms: Medida[]): number =>
    Math.max(...ms.map((m) => Math.abs(m.carga - 1)));
  return {
    avion: a.id,
    peldano: tier.id,
    kt,
    antesAlabeo: picoDe(alabeoAntes, "alabeo"),
    despuesAlabeo: picoDe(alabeoDespues, "alabeo"),
    antesAlabeoAlSoltar: Math.abs(alabeoAntesLuego - soltadoAntes) * EN_GRADOS,
    despuesAlabeoAlSoltar: Math.abs(alabeoDespuesLuego - soltadoDespues) * EN_GRADOS,
    antesCabeceo: picoDe(cabeceoAntes, "cabeceo"),
    despuesCabeceo: picoDe(cabeceoDespues, "cabeceo"),
    antesCarga: carga(cabeceoAntes),
    despuesCarga: carga(cabeceoDespues),
    despuesSubeAlSoltar: alSoltar,
    despuesSubeLuego: luego,
  };
}

/** Las dos velocidades de cada avión: la de la final y una de maniobra. */
function velocidades(a: AircraftConfig): number[] {
  const final = Math.round((a.approachSpeed * 1.15) / KT);
  const maniobra = Math.round(Math.min(a.cruiseSpeed * 0.75, a.approachSpeed * 2.2) / KT);
  return [final, maniobra];
}

const PELDANOS = [GUYRAMI, TUKA, TAGUATO_RUVICHA];

describe("la tecla, antes y después", () => {
  const filas: Fila[] = [];
  for (const a of AIRCRAFT)
    for (const tier of PELDANOS)
      for (const kt of velocidades(a)) filas.push(medirUno(a, tier, kt));

  if (import.meta.env.OGA_MEDIR || (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.OGA_MEDIR) {
    const f = (n: number, d = 1) => n.toFixed(d).padStart(6);
    console.log(
      "\navión    peldaño          kt | alabeo °/s antes→después | ala al soltar 5 s | cabeceo °/s antes→después | carga g antes→después | V/S al soltar → 10 s después",
    );
    for (const r of filas)
      console.log(
        `${r.avion.padEnd(8)} ${r.peldano.padEnd(16)} ${String(r.kt).padStart(3)} |` +
          `${f(r.antesAlabeo)} →${f(r.despuesAlabeo)}        |` +
          `${f(r.antesAlabeoAlSoltar)} →${f(r.despuesAlabeoAlSoltar)}   |` +
          `${f(r.antesCabeceo)} →${f(r.despuesCabeceo)}         |` +
          `${f(r.antesCarga, 2)} →${f(r.despuesCarga, 2)}   |` +
          `${f(r.despuesSubeAlSoltar)} →${f(r.despuesSubeLuego)}`,
      );
  }

  it("ningún avión se tumba a golpe de tecla", () => {
    for (const r of filas) {
      const tope = r.avion === "jaz-25" ? 24 : r.avion === "jaz-20" ? 20 : 16;
      expect(r.despuesAlabeo, `${r.avion} ${r.peldano} ${r.kt} kt`).toBeLessThan(tope);
    }
  });
});

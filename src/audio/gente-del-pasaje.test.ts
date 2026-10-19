/**
 * La gente de la cabina al llegar al puesto (punto 303): los impacientes con
 * la luz encendida, pocos y bajito; todos cuando se apaga; y nada sentados.
 */

import { describe, expect, it } from "vitest";
import {
  GenteQueSeLevanta,
  muestraDeHebilla,
  muestraDeLevantarse,
  PRIMER_CLIC,
  RITMO,
  SE_ACABA,
  type GenteDeLaCabina,
  type RuidoDeLaGente,
} from "./gente-del-pasaje";

/** Un azar con semilla, para que la prueba diga siempre lo mismo. */
function azar(semilla = 7): () => number {
  // mulberry32: con enteros de 32 bits, que un generador con multiplicaciones en coma flotante pierde bits.
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lo que suena en `segundos`, con su hora. */
function oir(
  gente: GenteDeLaCabina,
  segundos: number,
  g = new GenteQueSeLevanta(),
  a: () => number = azar(),
): (RuidoDeLaGente & { t: number })[] {
  const oido: (RuidoDeLaGente & { t: number })[] = [];
  const dt = 1 / 60;
  for (let t = 0; t < segundos; t += dt) for (const r of g.paso(dt, gente, a)) oido.push({ ...r, t });
  return oido;
}

describe("la gente de la cabina, en el puesto", () => {
  it("sentada, no suena nada", () => {
    expect(oir("sentada", 30)).toEqual([]);
  });

  it("los impacientes: el primer clic enseguida, y después unos pocos, sueltos y bajito", () => {
    const o = oir("impacientes", 20);
    expect(o[0]?.que).toBe("hebilla");
    expect(o[0]!.t).toBeGreaterThanOrEqual(PRIMER_CLIC - 0.02);
    expect(o[0]!.t).toBeLessThan(PRIMER_CLIC + 0.1);
    const hebillas = o.filter((r) => r.que === "hebilla").length;
    // Unos pocos: ni uno solo, ni el pasaje entero.
    expect(hebillas).toBeGreaterThanOrEqual(4);
    expect(hebillas).toBeLessThanOrEqual(16);
    expect(o.some((r) => r.que === "levantarse")).toBe(true);
    for (const r of o) expect(r.fuerza).toBeLessThanOrEqual(RITMO.impacientes.fuerza[1]);
  });

  it("y al apagarse la luz, el clic-clic de todos a la vez, que se va apagando", () => {
    // Con varias semillas, que es un azar y una sola puede salir rara.
    let primeros = 0;
    let despues = 0;
    for (const semilla of [1, 2, 3, 7, 11]) {
      const g = new GenteQueSeLevanta();
      const a = azar(semilla);
      oir("impacientes", 10, g, a);
      const o = oir("de-pie", SE_ACABA + 10, g, a);
      primeros += o.filter((r) => r.que === "hebilla" && r.t < 3).length;
      despues += o.filter((r) => r.que === "hebilla" && r.t >= 3 && r.t < 6).length;
      // Y acaba: todo el mundo de pie.
      expect(o.filter((r) => r.t > SE_ACABA)).toEqual([]);
    }
    // El clic-clic de todo el pasaje: muchos en los tres primeros segundos, y después pocos.
    expect(primeros / 5).toBeGreaterThanOrEqual(6);
    expect(despues).toBeLessThan(primeros / 2);
  });

  it("un fotograma atascado no suelta una ráfaga", () => {
    const g = new GenteQueSeLevanta();
    const a = azar(3);
    g.paso(0.5, "impacientes", a);
    let juntos = 0;
    for (let i = 0; i < 50; i++) juntos = Math.max(juntos, g.paso(30, "impacientes", a).length);
    expect(juntos).toBeLessThanOrEqual(2);
  });

  it("las muestras: una hebilla de medio segundo y alguien que se levanta, con sonido y sin pasarse", () => {
    for (const [m, dura] of [
      [muestraDeHebilla(48000, azar(1)), 0.42],
      [muestraDeLevantarse(48000, azar(2)), 0.95],
    ] as const) {
      expect(m.length).toBe(Math.round(48000 * dura));
      let pico = 0;
      let energia = 0;
      for (const v of m) {
        expect(Number.isFinite(v)).toBe(true);
        pico = Math.max(pico, Math.abs(v));
        energia += v * v;
      }
      expect(pico).toBeLessThanOrEqual(0.9 + 1e-6);
      expect(pico).toBeGreaterThan(0.5);
      expect(Math.sqrt(energia / m.length)).toBeGreaterThan(0.01);
    }
  });
});

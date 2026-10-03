/**
 * La cuenta de los granos, comprobada contra el ruido de verdad.
 *
 * Los nodos no se pueden probar sin un navegador —eso lo hace
 * `scripts/verificar-sonidos.mjs`—, pero la ganancia que se pone delante del
 * umbral sí: se genera ruido blanco, se le pasa el mismo filtro que en el
 * grafo, se sube lo que dice `gananciaDeGranos` y se cuentan las veces que
 * cruza el umbral. Si la fórmula de Rice está bien aplicada, salen las que se
 * pidieron, a la buena de un factor de dos.
 */

import { describe, expect, it } from "vitest";
import { gananciaDeGranos, UMBRAL_DE_GRANOS } from "./ruidos-en-el-aire";

/** Un paso bajo de Butterworth de segundo orden, como el de Web Audio. */
function pasoBajo(x: Float32Array, corte: number, fs: number): Float32Array {
  const w = (2 * Math.PI * corte) / fs;
  const alfa = Math.sin(w) / (2 * Math.SQRT1_2);
  const c = Math.cos(w);
  const a0 = 1 + alfa;
  const b0 = (1 - c) / 2 / a0;
  const b1 = (1 - c) / a0;
  const b2 = b0;
  const a1 = (-2 * c) / a0;
  const a2 = (1 - alfa) / a0;
  const y = new Float32Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b0 * x[i]! + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x[i]!;
    y2 = y1;
    y1 = v;
    y[i] = v;
  }
  return y;
}

/** Cuántas veces por segundo sale del umbral, por arriba o por abajo. */
function granosPorSegundo(porSegundo: number, corte: number): number {
  const fs = 48000;
  const segundos = 4;
  // Un azar con semilla, de enteros de 32 bits: sin él la prueba no se repite.
  let semilla = 12345;
  const azar = (): number => {
    semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ruido = new Float32Array(fs * segundos);
  for (let i = 0; i < ruido.length; i++) ruido[i] = azar() * 2 - 1;
  const suave = pasoBajo(ruido, corte, fs);
  const g = gananciaDeGranos(porSegundo, corte, fs);
  let cruces = 0;
  let dentro = true;
  for (const v of suave) {
    const fuera = Math.abs(v * g) > UMBRAL_DE_GRANOS;
    if (fuera && dentro) cruces++;
    dentro = !fuera;
  }
  return cruces / segundos;
}

describe("los granos", () => {
  it("la lluvia contra el parabrisas: los que se piden, a la buena de un factor de dos", () => {
    for (const pedidos of [20, 100, 400]) {
      const salen = granosPorSegundo(pedidos, 1200);
      expect(salen).toBeGreaterThan(pedidos / 2);
      expect(salen).toBeLessThan(pedidos * 2);
    }
  });

  it("y el granizo, más gordo y menos", () => {
    for (const pedidos of [20, 120]) {
      const salen = granosPorSegundo(pedidos, 600);
      expect(salen).toBeGreaterThan(pedidos / 2);
      expect(salen).toBeLessThan(pedidos * 2);
    }
  });

  it("sin granos pedidos, ganancia cero", () => {
    expect(gananciaDeGranos(0, 1200, 48000)).toBe(0);
  });
});

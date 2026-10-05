/**
 * Que el horizonte junte lo llano sin romper nada.
 *
 * Lo que se puede romper al juntar cuadros es poco y se ve mucho: una grieta
 * entre un bloque grande y sus vecinos pequeños —el cielo asomando por una
 * raya en mitad de la isla—, una cara al revés, un agujero, o una montaña
 * aplanada. Y la costa, que tiene que seguir cuadro a cuadro porque el agua
 * mira dónde cruza la malla su lámina con la cuenta de esos dos triángulos.
 * Ver `world/malla-lejana.ts`.
 */

import { describe, expect, it } from "vitest";
import { mallarConDetalle } from "./malla-lejana";

interface Rejilla {
  readonly lado: number;
  cota(f: number, c: number): number;
  va(f: number, c: number): boolean;
  costa(f: number, c: number): boolean;
}

/** Cuántos nudos usados caen dentro de una arista, sin contar sus puntas. */
function nudosDentro(lado: number, usados: Set<number>, i: number, j: number): number {
  const f0 = Math.floor(i / lado);
  const c0 = i % lado;
  const f1 = Math.floor(j / lado);
  const c1 = j % lado;
  const mcd = (a: number, b: number): number => (b ? mcd(b, a % b) : Math.abs(a));
  const pasos = mcd(Math.abs(f1 - f0), Math.abs(c1 - c0));
  let n = 0;
  for (let k = 1; k < pasos; k++) {
    const f = f0 + ((f1 - f0) / pasos) * k;
    const c = c0 + ((c1 - c0) / pasos) * k;
    if (usados.has(f * lado + c)) n++;
  }
  return n;
}

/** Comprueba la malla entera y devuelve cuántos triángulos tiene. */
function comprobar(r: Rejilla, tolerancia: number, bloque: number): number {
  const { lado } = r;
  const ind = mallarConDetalle(lado, r.cota, r.va, r.costa, tolerancia, bloque);
  expect(ind.length % 3).toBe(0);
  const usados = new Set(ind);
  const fc = (i: number): [number, number] => [Math.floor(i / lado), i % lado];

  let area = 0;
  const aristas = new Map<string, number>();
  for (let k = 0; k < ind.length; k += 3) {
    const [a, b, c] = [ind[k]!, ind[k + 1]!, ind[k + 2]!];
    const [fa, ca] = fc(a);
    const [fb, cb] = fc(b);
    const [fC, cC] = fc(c);
    // La cara hacia arriba: con x por las columnas y z por las filas, la y
    // del producto vectorial de (b − a) y (c − a).
    const y = (fb - fa) * (cC - ca) - (cb - ca) * (fC - fa);
    expect(y, `triángulo ${a} ${b} ${c}`).toBeGreaterThan(0);
    area += y / 2;
    // Sin nudos de otro en mitad de ninguna arista: es lo que sería una grieta.
    for (const [p, q] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      expect(nudosDentro(lado, usados, p, q), `arista ${p}–${q}`).toBe(0);
      const llave = p < q ? `${p}-${q}` : `${q}-${p}`;
      aristas.set(llave, (aristas.get(llave) ?? 0) + 1);
    }
  }
  // Ninguna arista en más de dos caras: nada se pisa.
  for (const n of aristas.values()) expect(n).toBeLessThanOrEqual(2);

  // Y cubre justo los cuadros que van, ni uno más: un cuadro mide uno.
  let van = 0;
  for (let f = 0; f < lado - 1; f++) for (let c = 0; c < lado - 1; c++) if (r.va(f, c)) van++;
  expect(area).toBeCloseTo(van, 6);

  // La forma: en cada nudo de un cuadro que va, la malla a menos del doble de
  // la tolerancia de su muestra (los nudos de más en el borde de un bloque
  // son muestras exactas y, como mucho, doblan el error).
  for (let k = 0; k < ind.length; k += 3) {
    const v = [ind[k]!, ind[k + 1]!, ind[k + 2]!].map(fc);
    const fs = v.map((p) => p[0]);
    const cs = v.map((p) => p[1]);
    const h = v.map(([f, c]) => r.cota(f, c));
    const det = (fs[1]! - fs[0]!) * (cs[2]! - cs[0]!) - (cs[1]! - cs[0]!) * (fs[2]! - fs[0]!);
    for (let f = Math.min(...fs); f <= Math.max(...fs); f++)
      for (let c = Math.min(...cs); c <= Math.max(...cs); c++) {
        const w1 = ((f - fs[0]!) * (cs[2]! - cs[0]!) - (c - cs[0]!) * (fs[2]! - fs[0]!)) / det;
        const w2 = ((fs[1]! - fs[0]!) * (c - cs[0]!) - (cs[1]! - cs[0]!) * (f - fs[0]!)) / det;
        const w0 = 1 - w1 - w2;
        if (w0 < -1e-9 || w1 < -1e-9 || w2 < -1e-9) continue;
        const enLaMalla = w0 * h[0]! + w1 * h[1]! + w2 * h[2]!;
        expect(Math.abs(enLaMalla - r.cota(f, c))).toBeLessThanOrEqual(2 * tolerancia + 1e-9);
      }
  }

  // La costa y lo que linda con lo que no va, cuadro a cuadro y con la
  // diagonal de siempre: la que sigue el agua.
  const caras = new Set<string>();
  for (let k = 0; k < ind.length; k += 3) caras.add(`${ind[k]},${ind[k + 1]},${ind[k + 2]}`);
  for (let f = 0; f < lado - 1; f++)
    for (let c = 0; c < lado - 1; c++) {
      if (!r.va(f, c)) continue;
      let suelto = r.costa(f, c);
      for (let df = -1; df <= 1; df++)
        for (let dc = -1; dc <= 1; dc++) {
          const ff = f + df;
          const cc = c + dc;
          // Fuera de la rejilla se acaba el mundo: no hay con quién casar.
          if (ff < 0 || cc < 0 || ff >= lado - 1 || cc >= lado - 1) continue;
          if (!r.va(ff, cc)) suelto = true;
        }
      if (!suelto) continue;
      const a = f * lado + c;
      expect(caras.has(`${a},${a + lado},${a + 1}`), `cuadro ${f}, ${c}`).toBe(true);
      expect(caras.has(`${a + 1},${a + lado},${a + lado + 1}`), `cuadro ${f}, ${c}`).toBe(true);
    }
  return ind.length / 3;
}

/** Ruido determinista, para tener relieve que no se deja juntar. */
function ruido(f: number, c: number): number {
  const s = Math.sin(f * 12.9898 + c * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

describe("el horizonte, con los triángulos donde hay relieve", () => {
  it("un llano entero cabe en un puñado de bloques", () => {
    const lado = 65;
    const r: Rejilla = {
      lado,
      cota: (f, c) => 100 + 0.5 * f - 0.25 * c,
      va: () => true,
      costa: () => false,
    };
    const n = comprobar(r, 2, 16);
    // Cuadro a cuadro serían 8.192.
    expect(n).toBeLessThan(400);
  });

  it("una montaña de verdad no pierde nada: cuadro a cuadro, como siempre", () => {
    const lado = 33;
    const r: Rejilla = {
      lado,
      cota: (f, c) => 500 + 300 * ruido(f, c),
      va: () => true,
      costa: () => false,
    };
    expect(comprobar(r, 4, 16)).toBe(2 * 32 * 32);
  });

  it("y lo llano junto a lo abrupto, sin grietas entre bloques de distinto lado", () => {
    // Una meseta con un cerro escarpado en una esquina y una isla de cuadros
    // que no van —el mapa fino de casa— en medio.
    const lado = 97;
    const r: Rejilla = {
      lado,
      cota: (f, c) => {
        const d = Math.hypot(f - 70, c - 75);
        return 200 + 0.3 * c + (d < 12 ? (12 - d) * 40 * (0.5 + ruido(f, c)) : 0);
      },
      va: (f, c) => !(Math.abs(f - 40) < 9 && Math.abs(c - 30) < 9),
      costa: () => false,
    };
    const n = comprobar(r, 3, 16);
    expect(n).toBeLessThan(2 * 96 * 96 * 0.3);
  });

  it("y la costa, cuadro a cuadro: el agua la mira con esos dos triángulos", () => {
    // Una isla llana con su costa redonda, y el mar sin mallar.
    const lado = 81;
    const nivel = 2;
    const cota = (f: number, c: number): number =>
      Math.hypot(f - 40, c - 40) < 30 ? 20 + 0.1 * f : -28;
    const bajo = (f: number, c: number): boolean => cota(f, c) <= -28;
    const r: Rejilla = {
      lado,
      cota,
      va: (f, c) => !(bajo(f, c) && bajo(f + 1, c) && bajo(f, c + 1) && bajo(f + 1, c + 1)),
      costa: (f, c) =>
        cota(f, c) <= nivel || cota(f + 1, c) <= nivel || cota(f, c + 1) <= nivel || cota(f + 1, c + 1) <= nivel,
    };
    const n = comprobar(r, 4, 16);
    let van = 0;
    for (let f = 0; f < lado - 1; f++) for (let c = 0; c < lado - 1; c++) if (r.va(f, c)) van++;
    expect(n).toBeLessThan(van);
  });

  it("y con una rejilla que no es potencia de dos, como la de 640 de La Gomera", () => {
    const lado = 41;
    const r: Rejilla = {
      lado,
      cota: (f, c) => 50 + 0.2 * f + (c > 30 ? 80 * ruido(f, c) : 0),
      va: (f) => f !== 7,
      costa: () => false,
    };
    comprobar(r, 2, 16);
  });
});

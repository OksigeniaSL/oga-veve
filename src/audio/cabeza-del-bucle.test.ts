/**
 * El bucle de la rodadura, sorteado a cada golpe y no a cada fotograma.
 *
 * Sin navegador: una fuente en bucle como la de Chrome —avanza a trozos de 128
 * muestras, da la vuelta al pasar de `loopEnd` y salta al principio si se le
 * pone por detrás de la cabeza—, y encima, a sesenta fotogramas, lo que hace
 * `RuidosEnElAire.aplicar`. La contraprueba es el sorteo de antes, que en esta
 * fuente da lo mismo que se midió en Chrome con un contexto sin altavoz
 * (26-11-2026): los baches de las losas gastadas a 13 m/s, pedidos cada
 * 1,13 s, sonando cada 0,57.
 */

import { describe, expect, it } from "vitest";
import { CabezaDelBucle, sortearBucle } from "./cabeza-del-bucle";

const FS = 48000;
const TROZO = 128 / FS;

/** Un azar con semilla, para que la prueba dé siempre lo mismo. */
function azar(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Una fuente en bucle con el chasquido al principio, como la de Chrome. Apunta cuándo suena. */
class FuenteDePrueba {
  readonly golpes: number[] = [];
  private t = 0;
  constructor(
    private pos: number,
    private fin: number,
  ) {}
  /** Lo que hace `loopEnd = fin`: si queda por detrás de la cabeza, salta al principio, y suena. */
  ponerFin(fin: number): void {
    this.fin = fin;
    if (this.pos >= fin) {
      this.pos = 0;
      this.golpes.push(this.t);
    }
  }
  /** Corre trozo a trozo hasta `hasta`. */
  correr(hasta: number): void {
    while (this.t + TROZO <= hasta + 1e-12) {
      let p = this.pos + TROZO;
      while (p >= this.fin) {
        this.golpes.push(this.t + (this.fin - this.pos));
        p -= this.fin;
        this.pos = 0;
      }
      this.pos = p;
      this.t += TROZO;
    }
  }
}

/** Los intervalos entre golpes, ordenados, y su media. */
function intervalos(golpes: readonly number[]): { media: number; q: (f: number) => number } {
  const iv = golpes
    .slice(1)
    .map((t, i) => t - golpes[i]!)
    .sort((a, b) => a - b);
  return {
    media: iv.reduce((a, b) => a + b, 0) / iv.length,
    q: (f) => iv[Math.min(iv.length - 1, Math.floor(f * iv.length))]!,
  };
}

/** Lo de los baches de `aplicar`, a `fps`, durante `segundos`, con la media que pida `media(t)`. */
function baches(
  media: (t: number) => number,
  segundos: number,
  modo: "a cada golpe" | "a cada fotograma",
  semilla = 7,
  fps = 60,
): { fuente: FuenteDePrueba; vueltas: number } {
  const r = azar(semilla);
  const acotar = (s: number) => Math.min(2.5, Math.max(0.02, s));
  const fuente = new FuenteDePrueba(0.5, 2.5);
  const cabeza = new CabezaDelBucle(0, 0.5, 2.5);
  let vueltas = 0;
  for (let k = 1; k / fps < segundos; k++) {
    // El reloj del contexto avanza a trozos: lo que ve el hilo del juego es el último trozo hecho.
    const ahora = Math.floor(k / fps / TROZO) * TROZO;
    fuente.correr(ahora);
    const m = media(ahora);
    if (modo === "a cada fotograma") {
      fuente.ponerFin(acotar(m * (0.35 + 1.3 * r())));
      continue;
    }
    const fin = sortearBucle(cabeza, ahora, acotar(m * 0.35), acotar(m * 1.65), () => acotar(m * (0.35 + 1.3 * r())));
    if (fin !== null) {
      vueltas++;
      fuente.ponerFin(fin);
    }
  }
  return { fuente, vueltas };
}

describe("el bucle de la rodadura", () => {
  const LOSAS_GASTADAS = 15 / 13.3;

  it("la contraprueba: sorteado a cada fotograma, suena el doble de a menudo y casi a compás, como en Chrome", () => {
    const { fuente } = baches(() => LOSAS_GASTADAS, 120, "a cada fotograma");
    const { media, q } = intervalos(fuente.golpes);
    // En Chrome: 0,57 de media, del 0,44 al 0,75 el ochenta por ciento.
    expect(media).toBeGreaterThan(0.45);
    expect(media).toBeLessThan(0.65);
    expect(q(0.9) - q(0.1)).toBeLessThan(0.45);
  });

  it("sorteado a cada golpe, los baches caen con la media de su firme y sin compás", () => {
    const { fuente } = baches(() => LOSAS_GASTADAS, 600, "a cada golpe");
    const { media, q } = intervalos(fuente.golpes);
    expect(media / LOSAS_GASTADAS).toBeGreaterThan(0.93);
    expect(media / LOSAS_GASTADAS).toBeLessThan(1.07);
    // Repartidos de 0,35 a 1,65 veces la media: el diez y el noventa por ciento, en 0,48 y 1,52.
    expect(q(0.1) / LOSAS_GASTADAS).toBeGreaterThan(0.4);
    expect(q(0.1) / LOSAS_GASTADAS).toBeLessThan(0.56);
    expect(q(0.9) / LOSAS_GASTADAS).toBeGreaterThan(1.44);
    expect(q(0.9) / LOSAS_GASTADAS).toBeLessThan(1.6);
  });

  it("y la cuenta va con la fuente: cada vuelta que ve la cabeza es un golpe de verdad", () => {
    const { fuente, vueltas } = baches(() => LOSAS_GASTADAS, 300, "a cada golpe");
    // Cada sorteo es una vuelta, menos el primero, que cambia el largo de arrancar por el de la media:
    // de ahí el uno de holgura.
    expect(Math.abs(fuente.golpes.length - vueltas)).toBeLessThanOrEqual(1);
  });

  it("acelerando en la carrera no espera a la vuelta de cuando iba despacio", () => {
    // Despacio, un bache cada dos segundos; a los 20 s, uno cada 0,3.
    const { fuente } = baches((t) => (t < 20 ? 2 : 0.3), 40, "a cada golpe");
    const despues = fuente.golpes.filter((t) => t >= 20);
    // El primero, en cuanto se ve el cambio; y desde ahí, con la media nueva.
    expect(despues[0]! - 20).toBeLessThan(0.3 * 1.65 + 0.05);
    const { media } = intervalos(despues);
    expect(media / 0.3).toBeGreaterThan(0.9);
    expect(media / 0.3).toBeLessThan(1.1);
  });

  it("las juntas del firme gastado, a su compás y torcidas un poco cada vez", () => {
    const cada = 1.15;
    const irregular = 0.35;
    const r = azar(11);
    const fuente = new FuenteDePrueba(0, 2.5);
    const cabeza = new CabezaDelBucle(0, 0, 2.5);
    const tuerce = irregular * 0.125;
    for (let k = 1; k / 60 < 300; k++) {
      const ahora = Math.floor(k / 60 / TROZO) * TROZO;
      fuente.correr(ahora);
      const fin = sortearBucle(cabeza, ahora, cada * (1 - tuerce), cada * (1 + tuerce), () =>
        cada * (1 + irregular * 0.25 * (r() - 0.5)),
      );
      if (fin !== null) fuente.ponerFin(fin);
    }
    const { media, q } = intervalos(fuente.golpes);
    expect(Math.abs(media / cada - 1)).toBeLessThan(0.01);
    // Uniforme en ±4,4 %: el diez y el noventa por ciento, en ±3,5 %.
    expect(q(0.1) / cada).toBeLessThan(0.975);
    expect(q(0.9) / cada).toBeGreaterThan(1.025);
  });
});

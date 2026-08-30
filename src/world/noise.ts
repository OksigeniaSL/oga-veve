/**
 * Ruido de valor con semilla, y su suma fractal.
 *
 * Hace falta que sea determinista: el mismo escenario tiene que generar
 * exactamente el mismo terreno en la tablet de un chico y en el portátil de
 * su profesora, porque si no, un aterrizaje que uno consigue el otro no lo
 * reconoce. `Math.random()` no vale para esto.
 *
 * Es ruido de valor y no Perlin a propósito: para relieve visto desde el
 * aire la diferencia no se aprecia y esto es la mitad de código.
 */

/** Generador congruencial pequeño y rápido, suficiente para sembrar el ruido. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class ValueNoise2D {
  private readonly permutation: Float32Array;
  private static readonly SIZE = 256;

  constructor(seed: number) {
    const random = mulberry32(seed);
    const size = ValueNoise2D.SIZE;
    this.permutation = new Float32Array(size * size);
    for (let i = 0; i < this.permutation.length; i++) this.permutation[i] = random();
  }

  private lattice(ix: number, iy: number): number {
    const size = ValueNoise2D.SIZE;
    const x = ((ix % size) + size) % size;
    const y = ((iy % size) + size) % size;
    return this.permutation[y * size + x] ?? 0;
  }

  /** Ruido en [0, 1], con interpolación suave (smoothstep de quinto orden). */
  noise(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = smootherstep(x - ix);
    const fy = smootherstep(y - iy);

    const a = this.lattice(ix, iy);
    const b = this.lattice(ix + 1, iy);
    const c = this.lattice(ix, iy + 1);
    const d = this.lattice(ix + 1, iy + 1);

    return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
  }

  /**
   * Suma de octavas. Cada octava dobla el detalle y reduce la amplitud, que
   * es lo que hace que una montaña tenga a la vez ladera grande y textura
   * pequeña. Devuelve valores en [0, 1] aproximadamente.
   */
  fbm(x: number, y: number, octaves: number, lacunarity = 2.0, gain = 0.5): number {
    let amplitude = 1;
    let frequency = 1;
    let sum = 0;
    let normalisation = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amplitude * this.noise(x * frequency, y * frequency);
      normalisation += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return normalisation > 0 ? sum / normalisation : 0;
  }

  /**
   * Ruido con pliegue en valor absoluto: produce crestas afiladas en vez de
   * lomas redondas. Es lo que hace que una cordillera parezca una cordillera.
   */
  ridged(x: number, y: number, octaves: number): number {
    let amplitude = 1;
    let frequency = 1;
    let sum = 0;
    let normalisation = 0;
    for (let i = 0; i < octaves; i++) {
      const n = 1 - Math.abs(this.noise(x * frequency, y * frequency) * 2 - 1);
      sum += amplitude * n * n;
      normalisation += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return normalisation > 0 ? sum / normalisation : 0;
  }
}

function smootherstep(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

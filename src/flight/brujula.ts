/**
 * **La brújula que baila**: la del parabrisas, con sus errores de verdad
 * (#51, ADR 0031, enmienda H26q).
 *
 * Hasta hoy la brújula del parabrisas llevaba la cara del direccional y
 * marcaba lo mismo que él: el rumbo magnético, quieto y exacto en cualquier
 * viraje. Eso es justo lo que una brújula **no** hace, y es la razón de que
 * exista el giróscopo. Aquí se le da la física que tiene:
 *
 * - **El imán va en un flotador pendular**: cuelga como un péndulo y se
 *   alinea con la gravedad **aparente** —la de verdad más lo que acelera el
 *   avión—, no con la vertical del sitio. En un viraje coordinado esa gravedad
 *   va por el eje vertical del avión, así que el flotador se inclina con el
 *   ala; al acelerar se va hacia atrás.
 * - **Y el campo de la Tierra no es horizontal**: se mete bajo el horizonte lo
 *   que diga la inclinación del sitio —ver `inclinacion` en
 *   `ui/carta/declinacion.ts`, el WMM2025—. Con el flotador derecho, esa
 *   parte vertical no tuerce nada; con el flotador inclinado, una parte de ella
 *   cae en el plano por el que gira el imán y lo arrastra. **Ese es todo el
 *   error**: el de viraje y el de aceleración salen de la misma cuenta.
 * - **Y el imán tiene inercia y va en líquido**: no se pone en su sitio de
 *   golpe, oscila y el líquido lo frena. Es lo que se ve al salir de un
 *   viraje: la tarjeta pasa de largo, vuelve y tarda unos segundos en
 *   quedarse quieta.
 *
 * ## Lo que sale, y en cada hemisferio
 *
 * Con la inclinación hacia abajo —el hemisferio magnético norte, Canarias a
 * unos 36°—, salen las reglas de los manuales: **virando desde el norte la
 * brújula se atrasa** —al principio marca el viraje al revés— y **desde el
 * sur se adelanta**; y en rumbos este u oeste, **al acelerar marca un viraje
 * hacia el norte y al frenar hacia el sur** (la ANDS inglesa, *accelerate
 * north, decelerate south*). Con la inclinación hacia arriba —el sur
 * magnético, Asunción a unos −33°— **todo se da la vuelta**: desde el norte
 * se adelanta, desde el sur se atrasa, y al acelerar marca hacia el sur. No
 * hay una regla para cada sitio escrita aquí: sale sola del signo de la
 * inclinación, y la prueba de mesa (`brujula.test.ts`) la compara con la
 * regla de cada hemisferio.
 *
 * ## De dónde salen los números
 *
 * - La inclinación, del WMM2025 en el sitio del campo.
 * - **Los 18° que puede inclinarse el flotador** respecto a la caja, del
 *   *Pilot's Handbook of Aeronautical Knowledge* de la FAA (FAA-H-8083-25C,
 *   capítulo 8, «Magnetic compass»): con más, el flotador toca y deja de
 *   seguir a la gravedad aparente. En un viraje coordinado no llega nunca,
 *   porque ahí la gravedad aparente va con la caja.
 * - **El periodo y el amortiguamiento del imán** no son de una norma:
 *   `PERIODO` y `AMORTIGUA` están puestos para que, al salir de un viraje, la
 *   tarjeta pase de largo un cuarto o un tercio de lo que vuelve y se quede a
 *   un grado en unos seis segundos, que es
 *   lo que describe el mismo manual —«la tarjeta oscila y hay que esperar a
 *   que se asiente»— sin dar cifra. Es lo único apurado, y se dice.
 *
 * Lo que **no** lleva: el desvío propio del avión (la tablilla de
 * compensación, *compass card*, que corrige lo que tuerce el hierro y la
 * electricidad de cada avión): aquí el avión no tiene hierro.
 *
 * Solo la aguja de la brújula baila. Lo que lee el rumbo para el juego —los
 * pilotos de banco, los ejercicios, el direccional, las pantallas— sigue
 * leyendo el rumbo verdadero del modelo o el magnético exacto, como antes.
 *
 * Sin three.js, sin audio y sin DOM: unidades SI y grados donde se lee.
 */

const GRADO = Math.PI / 180;
/** La gravedad, m/s². */
const G = 9.80665;

/** Lo que puede inclinarse el flotador respecto a la caja, grados. FAA-H-8083-25C, cap. 8. */
export const INCLINA_COMO_MUCHO = 18;
/** El periodo propio del imán en su líquido, s. Ver la cabecera. */
export const PERIODO = 4;
/**
 * Su amortiguamiento, de cero a uno. Con 0,25 y el periodo de cuatro
 * segundos, saliendo de un viraje de 20° al norte la tarjeta pasa de largo
 * unos cuatro grados, vuelve dos y se queda a uno en unos seis segundos.
 * Ver la cabecera.
 */
export const AMORTIGUA = 0.25;
/**
 * Lo que tarda el flotador en seguir a la gravedad aparente, s: es un péndulo
 * en líquido, y además así no sigue el ruido de cada fotograma.
 */
const TARDA_EL_PENDULO = 0.35;
/** Un acelerón más fuerte que esto no es vuelo: es un salto de sitio (reiniciar, colocar). m/s². */
const SALTO = 40;
/** El paso de la cuenta, s: con el periodo de dos segundos y medio, de sobra. */
const PASO = 1 / 120;

/** Un cuaternión, `{x, y, z, w}`: el del avión, el morro por −Z y el ala derecha por +X. */
export interface Orientacion {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

export interface Vec {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Lo que la brújula siente en cada paso. */
export interface LoQueSiente {
  /** La actitud del avión. */
  readonly orientacion: Orientacion;
  /** La velocidad en el mundo, m/s. El mundo: x al este, y arriba, −z al norte. */
  readonly velocidad: Vec;
  /** Lo que se suma al rumbo verdadero para leer el magnético, grados: la del escenario. */
  readonly variacion: number;
}

/** Un eje del avión girado con el cuaternión: `(lx, ly, lz)` en ejes del avión. */
function girar(q: Orientacion, lx: number, ly: number, lz: number): [number, number, number] {
  // v' = v + 2w(q×v) + 2q×(q×v)
  const tx = 2 * (q.y * lz - q.z * ly);
  const ty = 2 * (q.z * lx - q.x * lz);
  const tz = 2 * (q.x * ly - q.y * lx);
  return [
    lx + q.w * tx + (q.y * tz - q.z * ty),
    ly + q.w * ty + (q.z * tx - q.x * tz),
    lz + q.w * tz + (q.x * ty - q.y * tx),
  ];
}

const punto = (a: readonly number[], b: readonly number[]): number => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const cruz = (a: readonly number[], b: readonly number[]): [number, number, number] => [
  a[1]! * b[2]! - a[2]! * b[1]!,
  a[2]! * b[0]! - a[0]! * b[2]!,
  a[0]! * b[1]! - a[1]! * b[0]!,
];
const unitario = (a: readonly number[]): [number, number, number] => {
  const l = Math.hypot(a[0]!, a[1]!, a[2]!) || 1;
  return [a[0]! / l, a[1]! / l, a[2]! / l];
};

/** Un ángulo entre −180 y 180. */
export function centrado(grados: number): number {
  return ((((grados + 180) % 360) + 360) % 360) - 180;
}

/** Un ángulo entre 0 y 360. */
export function vuelta(grados: number): number {
  return ((grados % 360) + 360) % 360;
}

/** El rumbo del morro, grados verdaderos: el del modelo (`heading`). */
export function rumboDelMorro(q: Orientacion): number {
  const m = girar(q, 0, 0, -1);
  return vuelta(Math.atan2(m[0], -m[2]) / GRADO);
}

/**
 * **Lo que marcaría la brújula quieta**, grados magnéticos: con el flotador
 * derecho sobre `arriba` —la gravedad aparente, hacia arriba—, el imán por
 * lo que el campo deja en su plano, y el morro leído contra él. Pura: es lo
 * que la prueba de mesa compara con la regla de cada hemisferio.
 */
export function marcaQuieta(
  q: Orientacion,
  arriba: readonly [number, number, number],
  inclinacion: number,
  variacion: number,
): number {
  const u = unitario(arriba);
  // El norte magnético está `variacion` grados a la izquierda del verdadero cuando se suma.
  const nm = -variacion * GRADO;
  const ci = Math.cos(inclinacion * GRADO);
  const si = Math.sin(inclinacion * GRADO);
  // El campo: hacia el norte magnético y, con la inclinación positiva, hacia abajo.
  const b: [number, number, number] = [ci * Math.sin(nm), -si, -ci * Math.cos(nm)];
  const nariz = girar(q, 0, 0, -1);
  const bu = punto(b, u);
  const nu = punto(nariz, u);
  const bp: [number, number, number] = [b[0] - bu * u[0], b[1] - bu * u[1], b[2] - bu * u[2]];
  const np: [number, number, number] = [nariz[0] - nu * u[0], nariz[1] - nu * u[1], nariz[2] - nu * u[2]];
  // Con el este por x, arriba por y y el norte por −z, este × norte es arriba: el sentido de las agujas visto desde arriba.
  const seno = punto(cruz(np, bp), u);
  const coseno = punto(np, bp);
  return vuelta(Math.atan2(seno, coseno) / GRADO);
}

/**
 * **La gravedad aparente que puede seguir el flotador**: la que hay, o, si se
 * aparta más de `INCLINA_COMO_MUCHO` de la vertical de la caja, la que queda
 * en el tope. Hacia arriba, unitaria.
 */
export function arribaDelFlotador(
  q: Orientacion,
  sentida: readonly [number, number, number],
): [number, number, number] {
  const caja = girar(q, 0, 1, 0);
  const f = unitario(sentida);
  const c = Math.max(-1, Math.min(1, punto(f, caja)));
  const angulo = Math.acos(c);
  const tope = INCLINA_COMO_MUCHO * GRADO;
  if (angulo <= tope) return f;
  // En el tope: girada desde la caja hacia la gravedad aparente, solo hasta él.
  const lado = unitario([f[0] - c * caja[0], f[1] - c * caja[1], f[2] - c * caja[2]]);
  return [
    Math.cos(tope) * caja[0] + Math.sin(tope) * lado[0],
    Math.cos(tope) * caja[1] + Math.sin(tope) * lado[1],
    Math.cos(tope) * caja[2] + Math.sin(tope) * lado[2],
  ];
}

export class Brujula {
  /** La gravedad aparente que siente el flotador, ya con su retraso, hacia arriba, m/s². */
  private sentida: [number, number, number] | null = null;
  private velocidadAntes: Vec | null = null;
  /** El ángulo del imán en el mundo respecto a su sitio de reposo, grados; y su ritmo, grados/s. */
  private imanAngulo = 0;
  private imanRitmo = 0;
  private rumboAntes: number | null = null;
  private marca = 0;
  private quietaAhora = 0;
  private giroAntes = 0;

  constructor(
    /** La inclinación del campo en el sitio, grados: positiva hacia abajo. */
    private inclinacionDelSitio: number,
  ) {}

  get inclinacion(): number {
    return this.inclinacionDelSitio;
  }

  /** Otro sitio: otro campo. La tarjeta se queda donde está y se va sola a su sitio. */
  ponerInclinacion(grados: number): void {
    this.inclinacionDelSitio = grados;
  }

  /** **Lo que marca la tarjeta**, grados magnéticos, de 0 a 360. */
  get lectura(): number {
    return this.marca;
  }

  /** Lo que marcaría quieta en este instante, grados: para el banco. */
  get enReposo(): number {
    return this.quietaAhora;
  }

  /** Lo rápido que se mueve la tarjeta respecto a la caja, grados/s: para saber si baila. */
  get ritmo(): number {
    return this.giroAntes - this.imanRitmo;
  }

  /**
   * **Quieta y en su sitio**: después de colocar el avión, de reiniciar o de
   * cambiar de avión. Lo siguiente que se mida empieza en reposo.
   */
  reiniciar(): void {
    this.sentida = null;
    this.velocidadAntes = null;
    this.imanAngulo = 0;
    this.imanRitmo = 0;
    this.rumboAntes = null;
    this.giroAntes = 0;
  }

  /** Un paso: lo que siente y lo que ha pasado, s. Devuelve lo que marca. */
  paso(s: LoQueSiente, dt: number): number {
    const magnetico = vuelta(rumboDelMorro(s.orientacion) + s.variacion);
    if (!(dt > 0)) {
      if (this.rumboAntes === null) this.marca = magnetico;
      return this.marca;
    }
    // La gravedad aparente: lo que acelera el avión, más la de verdad hacia arriba.
    const v = s.velocidad;
    const a = this.velocidadAntes;
    this.velocidadAntes = { x: v.x, y: v.y, z: v.z };
    let ax = 0;
    let ay = 0;
    let az = 0;
    if (a) {
      ax = (v.x - a.x) / dt;
      ay = (v.y - a.y) / dt;
      az = (v.z - a.z) / dt;
    }
    if (!a || Math.hypot(ax, ay, az) > SALTO) {
      // Recién puesta o el avión cambió de sitio de golpe: de nuevo, en reposo.
      ax = ay = az = 0;
      this.sentida = null;
      this.rumboAntes = null;
    }
    const ahora: [number, number, number] = [ax, ay + G, az];
    if (!this.sentida) this.sentida = ahora;
    else {
      const k = 1 - Math.exp(-dt / TARDA_EL_PENDULO);
      for (let i = 0; i < 3; i++) this.sentida[i] = this.sentida[i]! + (ahora[i]! - this.sentida[i]!) * k;
    }
    const quieta = marcaQuieta(s.orientacion, arribaDelFlotador(s.orientacion, this.sentida), this.inclinacionDelSitio, s.variacion);
    this.quietaAhora = quieta;
    // Dónde querría estar el imán en el mundo, respecto a su reposo: lo que la marca quieta se aparta del rumbo.
    const sitio = centrado(magnetico - quieta);
    if (this.rumboAntes === null) {
      this.imanAngulo = sitio;
      this.imanRitmo = 0;
      this.rumboAntes = magnetico;
      this.marca = quieta;
      return this.marca;
    }
    // Lo que gira la caja, grados/s: el líquido va con ella y frena al imán respecto a ella.
    const giro = centrado(magnetico - this.rumboAntes) / dt;
    this.rumboAntes = magnetico;
    this.giroAntes = giro;
    const w = (2 * Math.PI) / PERIODO;
    let falta = dt;
    while (falta > 1e-9) {
      const h = Math.min(PASO, falta);
      falta -= h;
      const acel = -w * w * centrado(this.imanAngulo - sitio) - 2 * AMORTIGUA * w * (this.imanRitmo - giro);
      this.imanRitmo += acel * h;
      this.imanAngulo += this.imanRitmo * h;
    }
    this.imanAngulo = centrado(this.imanAngulo);
    // La tarjeta: el morro leído contra el imán.
    this.marca = vuelta(magnetico - this.imanAngulo);
    return this.marca;
  }
}

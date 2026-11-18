/**
 * **«El altímetro miente»**: el altímetro barométrico de #51 (ADR 0031,
 * enmienda H26p).
 *
 * «Altímetro barométrico con QNH ajustable —y la misión "el altímetro miente"
 * al volar de alta a baja presión, con el cerro creciendo delante—.» Un
 * altímetro no mide altura: mide presión, y la traduce a altura con el día
 * que se le pone en la ventanilla. Se llega de un sitio de presión alta con su
 * reglaje puesto a uno de presión más baja, y la aguja marca de más: cada
 * hectopascal, veintisiete pies (`METROS_POR_HPA`). No avisa, no se rompe:
 * miente. La lección es la regla que se enseña en toda escuela del mundo,
 * *de alta a baja, ojo con la caja*, y se vive antes de decirla.
 *
 * Los pasos:
 *
 * 1. **Venís de lejos**: se empieza sobre el mar, con el reglaje del campo de
 *    donde se salió, hacia una ladera de verdad. La instructora pide la aguja
 *    en una altura: la cima de la ladera **más mil pies**, el margen de la
 *    ruta sobre un obstáculo. Con la aguja ahí, de verdad se va más bajo.
 * 2. **La presión de acá**: a los `DAR_EL_QNH` segundos llega el QNH del
 *    sitio, el que da la torre o el METAR, y se pide girar la rueda hasta él.
 * 3. **Puesta**: con la rueda en el QNH, la aguja baja lo que mentía y dice la
 *    verdad. La instructora lo hace ver y pide volver a la altura pedida.
 * 4. **Cerca**: si a `CERCA` metros de la cima la rueda sigue sin poner, la
 *    instructora hace ver que el suelo está más cerca de lo que dice la
 *    aguja. Una vez; ni alarma ni rojo.
 * 5. **La cima**: al pasarla se mide el margen de verdad y el que decía la
 *    aguja. Con la rueda puesta, hecho; sin ponerla, se ve la diferencia y se
 *    vuelve a intentar. Nadie suspende.
 *
 * ## Lo que es de verdad, y de dónde sale
 *
 * - **La ladera** es la del relieve del juego, medida: en La Palma, la
 *   Cumbre Nueva, que sube del mar a mil trescientos metros en siete
 *   kilómetros al oeste del aeropuerto (`data/terrain/la-palma.bin`, PNOA-LiDAR
 *   del IGN). La cima no se escribe a mano: se mide sobre el camino al
 *   colocar (`colocacionDelAltimetro`).
 * - **La diferencia de presión**, diez hectopascales entre Lanzarote y La
 *   Palma: cuatrocientos treinta kilómetros, dos hectopascales y poco por cada
 *   cien. Es el gradiente de un día corriente de invierno con una borrasca
 *   atlántica al noroeste, de los que vacían el alisio; nada de un temporal.
 *   La presión de La Palma es la del parte del día —el METAR o el tiempo de
 *   casa—, y la de Lanzarote, esa más diez.
 * - **El error**, diez por veintisiete: doscientos setenta pies, ochenta y dos
 *   metros. Es la cuenta de `alturaIndicada`, la misma que mueve la aguja en
 *   todos los vuelos.
 *
 * Sin three.js, sin audio y sin DOM: lo prueba un piloto de cinemática
 * (`el-altimetro-miente.test.ts`).
 */

import type { Ejercicio } from "./ejercicios";
import type { PuntoDelMundo } from "./seguir-la-aguja";
import { bienPuesta, girarRueda, METROS_POR_HPA } from "./altimetro";

const PIE = 0.3048;

// ── Dónde vale ───────────────────────────────────────────────────────────

/**
 * **Una ladera que se vuela de alta a baja**: de dónde se viene, por dónde se
 * entra y hacia dónde, en el mundo del escenario.
 */
export interface LaderaDelAltimetro {
  /** Dónde empieza, m del mundo: lejos de la ladera, sobre llano o mar. */
  readonly salida: PuntoDelMundo;
  /** **Hacia dónde**, m del mundo: un punto pasada la cima, en la recta de la salida. */
  readonly hacia: PuntoDelMundo;
  /** El campo de donde se viene, el de la presión alta: su nombre se escribe, no se dice. */
  readonly deDonde: string;
  /** **Lo que tiene de más su presión**, hPa. Ver «La diferencia de presión» arriba. */
  readonly diferencia: number;
}

/**
 * **Las laderas de cada campo**, por su indicativo OACI. Se vende al mundo:
 * un campo con una ladera alta dentro de su mundo, y un campo de presión más
 * alta a un día de vuelo, entra con una línea aquí.
 *
 * - **GCLA, La Palma**: se entra desde el mar, un kilómetro al norte del
 *   aeropuerto y cinco mar adentro, al oeste derecho hacia la Cumbre Nueva.
 *   La ladera sube del agua a mil trescientos metros en siete kilómetros
 *   (medido: 21 m en la costa, 598 a cuatro kilómetros, 1282 a siete).
 */
export const LADERAS_DEL_ALTIMETRO: Readonly<Record<string, LaderaDelAltimetro>> = {
  GCLA: {
    salida: { x: 5000, z: -1000 },
    hacia: { x: -7600, z: -1000 },
    deDonde: "Lanzarote",
    diferencia: 10,
  },
};

export function laderaDelAltimetro(oaci: string | null): LaderaDelAltimetro | null {
  return (oaci && LADERAS_DEL_ALTIMETRO[oaci]) || null;
}

// ── Dónde empieza ────────────────────────────────────────────────────────

/** **El margen sobre la cima**, m: mil pies, el de una ruta sobre un obstáculo. */
export const MARGEN = 1000 * PIE;

export interface ColocacionDelAltimetro {
  readonly x: number;
  readonly z: number;
  /** **La altitud de verdad** al empezar, m sobre el mar. */
  readonly altitud: number;
  /** Rumbo del morro, rad verdaderos: de la salida hacia la ladera. */
  readonly rumbo: number;
  /** **La altura pedida en la aguja**, pies: la cima más el margen, redondeada a cien hacia arriba. */
  readonly pedida: number;
  /** Lo que lleva la ventanilla al empezar, hPa: la presión de donde se viene. */
  readonly puesta: number;
  /** La presión de aquí, hPa, cuando se colocó. */
  readonly delSitio: number;
  /** **Lo que miente la aguja** con la ventanilla sin tocar, m. */
  readonly miente: number;
  /** **La cima** del camino: dónde y a qué cota, m. */
  readonly cima: { readonly x: number; readonly z: number; readonly cota: number };
}

/**
 * **Dónde empieza y a qué altura**: en la salida, con el morro a la ladera y
 * la aguja ya en la altura pedida con el reglaje de donde se viene —es decir,
 * de verdad, `miente` metros más abajo—. La cima se mide sobre el camino con
 * `cota`, cada cincuenta metros, que es el paso de la malla del relieve.
 */
export function colocacionDelAltimetro(o: {
  readonly ladera: LaderaDelAltimetro;
  /** La presión del sitio hoy, hPa. */
  readonly qnh: number;
  readonly cota: (x: number, z: number) => number;
}): ColocacionDelAltimetro {
  const { salida, hacia, diferencia } = o.ladera;
  const dx = hacia.x - salida.x;
  const dz = hacia.z - salida.z;
  const largo = Math.hypot(dx, dz) || 1;
  let cima = { x: salida.x, z: salida.z, cota: o.cota(salida.x, salida.z) };
  for (let d = 0; d <= largo; d += 50) {
    const x = salida.x + (dx * d) / largo;
    const z = salida.z + (dz * d) / largo;
    const c = o.cota(x, z);
    if (c > cima.cota) cima = { x, z, cota: c };
  }
  const delSitio = Math.round(o.qnh);
  const puesta = girarRueda(delSitio, diferencia);
  const miente = (puesta - delSitio) * METROS_POR_HPA;
  const pedida = Math.ceil((cima.cota + MARGEN) / PIE / 100) * 100;
  return {
    x: salida.x,
    z: salida.z,
    altitud: pedida * PIE - miente,
    rumbo: Math.atan2(dx, -dz),
    pedida,
    puesta,
    delSitio,
    miente,
    cima,
  };
}

// ── El ejercicio ─────────────────────────────────────────────────────────

/** Lo que el ejercicio mira del vuelo en cada paso. */
export interface LecturaDelAltimetro {
  readonly x: number;
  readonly z: number;
  /** La altitud de verdad, m sobre el mar: la que sabe el modelo de vuelo. */
  readonly altitud: number;
  /** **La que enseña la aguja**, m: la de verdad corregida por el reglaje. */
  readonly indicada: number;
  /** Lo que lleva la ventanilla, hPa. */
  readonly puesta: number;
  /** La presión de verdad aquí, hPa. */
  readonly delSitio: number;
  readonly enElSuelo: boolean;
  readonly parado: boolean;
  readonly percance: boolean;
}

/**
 * Cómo acaba: `hecho`, pasada la cima con la rueda puesta; `sinPoner`, pasada
 * sin ponerla —se ve la diferencia y se vuelve a intentar—; `otraVez`, en el
 * suelo o con percance, que lo cuentan ellos.
 */
export type CierreDelAltimetro = "hecho" | "sinPoner" | "otraVez";

export type SucesoDelAltimetro =
  /** Se viene de lejos con su presión: la aguja en la altura pedida, hacia la ladera. */
  | { readonly que: "presentar" }
  /** La presión de acá, hPa: girar la rueda hasta ella. */
  | { readonly que: "qnh"; readonly qnh: number }
  /** La rueda en la presión de acá: la aguja bajó `bajo` metros y dice la verdad. */
  | { readonly que: "puesto"; readonly bajo: number }
  /** Cerca de la cima y sin poner: el suelo está más cerca de lo que dice la aguja, m sobre la cima. */
  | { readonly que: "cerca"; readonly deVerdad: number; readonly dice: number }
  /**
   * Pasada la cima: el margen de verdad y el que decía la aguja, m; y si la
   * rueda estaba puesta.
   */
  | { readonly que: "pasaste"; readonly margen: number; readonly creido: number; readonly puesta: boolean }
  | { readonly que: "cerrar"; readonly como: CierreDelAltimetro };

export type FaseDelAltimetro = "llegando" | "conQnh" | "cerrada";

/**
 * **Cuándo llega la presión de acá**, s: a los veinte. Lo que tarda la
 * presentación en decirse y un rato de volar con la aguja mintiendo, que es
 * lo que se ve después al ponerla. A ciento diez nudos son más de mil metros:
 * la cima queda todavía a nueve kilómetros.
 */
export const DAR_EL_QNH = 20;
/**
 * **Cerca**, m: a dos kilómetros y medio de la cima. Con una avioneta, minuto
 * y medio de vuelo: tiempo de mirarla crecer delante, y de girar la rueda.
 */
export const CERCA = 2500;
/** Lo que se deja alejarse del camino antes de darlo por pasado, m. */
const PERDIDO = 3000;

export class ElAltimetroMiente {
  private faseActual: FaseDelAltimetro = "llegando";
  private presentada = false;
  private comoCerro: CierreDelAltimetro | null = null;
  private colocacionPuesta: ColocacionDelAltimetro | null = null;
  private reloj = 0;
  private qnhDado: number | null = null;
  private yaPuesta = false;
  private dijoCerca = false;
  private margenAlPasar: number | null = null;
  private creidoAlPasar: number | null = null;
  private puestaAlPasar: boolean | null = null;
  private puestaA: number | null = null;

  constructor(
    readonly ejercicio: Ejercicio,
    readonly ladera: LaderaDelAltimetro,
  ) {}

  colocar(c: ColocacionDelAltimetro): void {
    this.colocacionPuesta = c;
  }

  get colocacion(): ColocacionDelAltimetro | null {
    return this.colocacionPuesta;
  }

  get fase(): FaseDelAltimetro {
    return this.faseActual;
  }

  get cierre(): CierreDelAltimetro | null {
    return this.comoCerro;
  }

  /** La presión de acá, hPa, desde que se dio. */
  get qnh(): number | null {
    return this.qnhDado;
  }

  /** Si la rueda llegó a la presión de acá, y a los cuántos segundos. */
  get puestaEn(): number | null {
    return this.puestaA;
  }

  /** El margen de verdad sobre la cima al pasarla, m. */
  get margen(): number | null {
    return this.margenAlPasar;
  }

  /** El margen que decía la aguja al pasar la cima, m. */
  get creido(): number | null {
    return this.creidoAlPasar;
  }

  get conLaRuedaPuesta(): boolean | null {
    return this.puestaAlPasar;
  }

  reiniciar(): void {
    this.faseActual = "llegando";
    this.presentada = false;
    this.comoCerro = null;
    this.reloj = 0;
    this.qnhDado = null;
    this.yaPuesta = false;
    this.dijoCerca = false;
    this.margenAlPasar = null;
    this.creidoAlPasar = null;
    this.puestaAlPasar = null;
    this.puestaA = null;
  }

  paso(l: LecturaDelAltimetro, dt: number): SucesoDelAltimetro[] {
    const sucesos: SucesoDelAltimetro[] = [];
    const c = this.colocacionPuesta;
    if (this.faseActual === "cerrada" || !c) return sucesos;
    if (!this.presentada) {
      this.presentada = true;
      sucesos.push({ que: "presentar" });
    }
    if (l.percance || (l.enElSuelo && l.parado)) {
      this.cerrar("otraVez", sucesos);
      return sucesos;
    }
    this.reloj += dt;

    // ── La presión de acá ──
    if (this.faseActual === "llegando" && this.reloj >= DAR_EL_QNH) {
      this.faseActual = "conQnh";
      this.qnhDado = Math.round(l.delSitio);
      sucesos.push({ que: "qnh", qnh: this.qnhDado });
    }
    const puesta = bienPuesta(l.puesta, l.delSitio);
    /*
     * **Puesta**: una vez, la primera que la rueda llega a la presión de acá
     * después de darla. Lo que bajó la aguja es lo que mentía, y se cuenta
     * con la cuenta de la ventanilla, no con lo que subió o bajó el avión.
     */
    if (this.faseActual === "conQnh" && puesta && !this.yaPuesta) {
      this.yaPuesta = true;
      this.puestaA = this.reloj;
      sucesos.push({ que: "puesto", bajo: (c.puesta - l.puesta) * METROS_POR_HPA });
    }

    const { salida, hacia } = this.ladera;
    const dx = hacia.x - salida.x;
    const dz = hacia.z - salida.z;
    const largo = Math.hypot(dx, dz) || 1;
    const hastaLaCima = ((c.cima.x - salida.x) * dx + (c.cima.z - salida.z) * dz) / largo;
    const avanzado = ((l.x - salida.x) * dx + (l.z - salida.z) * dz) / largo;
    const aLaCima = Math.hypot(c.cima.x - l.x, c.cima.z - l.z);

    // ── Cerca, sin poner: una vez ──
    if (!puesta && !this.dijoCerca && aLaCima < CERCA && avanzado < hastaLaCima) {
      this.dijoCerca = true;
      sucesos.push({ que: "cerca", deVerdad: l.altitud - c.cima.cota, dice: l.indicada - c.cima.cota });
    }

    /*
     * **La cima**: al pasar su perpendicular en el camino, o al alejarse de
     * más. El margen es sobre la cima medida al colocar, que es la del
     * camino: quien se apartó del camino pasa por otro sitio, y se le cuenta
     * igual lo que llevaba.
     */
    const lado = Math.abs(((l.x - salida.x) * dz - (l.z - salida.z) * dx) / largo);
    if (avanzado >= hastaLaCima || lado > PERDIDO || avanzado < -PERDIDO) {
      this.margenAlPasar = l.altitud - c.cima.cota;
      this.creidoAlPasar = l.indicada - c.cima.cota;
      this.puestaAlPasar = puesta;
      sucesos.push({ que: "pasaste", margen: this.margenAlPasar, creido: this.creidoAlPasar, puesta });
      this.cerrar(puesta ? "hecho" : "sinPoner", sucesos);
    }
    return sucesos;
  }

  private cerrar(como: CierreDelAltimetro, sucesos: SucesoDelAltimetro[]): void {
    this.faseActual = "cerrada";
    this.comoCerro = como;
    sucesos.push({ que: "cerrar", como });
  }
}

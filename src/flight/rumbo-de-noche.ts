/**
 * **«Rumbo de noche»**: el primer peldaño de la navegación de #51 (ADR 0031,
 * enmienda H26o).
 *
 * «Cae la noche a mitad del "sigue el río" y solo queda el HDG.» Es el método
 * entero de la escalera: **cada instrumento aparece cuando el ojo ya no
 * basta**, degradando la vista, que es exactamente por qué se inventó cada
 * uno. Se sigue el río con la última luz de la tarde; cuando el sol baja de
 * los seis grados bajo el horizonte —el ocaso civil, el de `esDeNoche`— es de
 * noche, y el río se va oscureciendo: el agua todavía refleja el crepúsculo,
 * como de verdad, pero cada minuto menos. Lo que no se oscurece es el rumbo.
 * La instructora pide uno, la marca de la rosa se va a él, y se mide cuánto
 * se aparta el morro hasta llegar a donde el río sigue.
 *
 * Los pasos:
 *
 * 1. **El río**: se empieza encima del cauce, con el sol recién puesto. Se
 *    pide seguirlo. No se juzga: es mirar por la ventana, como en «Seguir el
 *    río».
 * 2. **Anochece**: el sol cruza los seis grados bajo el horizonte. El rumbo
 *    pedido es el que lleva de donde se está al punto donde el río sigue,
 *    redondeado a cinco grados, en **magnético**, que es lo que marca la rosa.
 * 3. **El rumbo**: se mide lo que el morro se aparta de él, cada paso, desde
 *    que llega a la marca (`PARA_LLEGAR_A_LA_MARCA`). Si se
 *    va más de `SE_VA` grados unos segundos, la instructora lo dice una vez;
 *    vuelve a poder decirlo cuando el morro ha vuelto a la marca, no cuando
 *    pasa un rato.
 * 4. **Llegar**: encima del río, donde sigue. O, si el rumbo se fue, al pasar
 *    a su altura: nadie suspende, y se le cuenta por dónde pasó.
 *
 * ## Lo que es de verdad, y lo que se apura
 *
 * - **El río** es el del relieve del juego: el cauce medido en
 *   `data/terrain/pettirossi.bin` por debajo de la lámina de los 56 metros,
 *   igual que las misiones de Asunción (`content/missions.ts`).
 * - **El sol** es el de verdad, en el sitio y el día del vuelo: el mismo
 *   `solALaHora` que mueve el cielo. Se pone donde se pone —en noviembre, en
 *   Asunción, al oesuroeste— y la hora de salida es la hora solar en que está
 *   a la altura que toca hoy.
 * - **Lo que se apura es el reloj del cielo**: `PRISA` veces. En Asunción, del
 *   ocaso al final del crepúsculo civil pasan veinticinco minutos largos, y
 *   el mundo del escenario son veintidós kilómetros: a la velocidad de un
 *   avión, la noche no caería nunca dentro de él. Se dice en el panel del
 *   final, que se lee: de verdad tarda media hora.
 *
 * Sin three.js, sin audio y sin DOM: lo prueba un piloto de cinemática
 * (`rumbo-de-noche.test.ts`).
 */

import type { Ejercicio } from "./ejercicios";
import { centrado } from "./radio-de-navegacion";
import type { PuntoDelMundo } from "./seguir-la-aguja";
import { solALaHora } from "../world/cielo-de-noche";

const GRADO = Math.PI / 180;

// ── Dónde vale ───────────────────────────────────────────────────────────

/**
 * **Un río que se sigue y se pierde de noche**: el cauce, de donde se empieza
 * a donde sigue, en el mundo del escenario; dónde se quiere que caiga la
 * noche, y el campo.
 */
export interface RioDeNoche {
  /** El cauce, del principio al final, m del mundo. El primero es la salida. */
  readonly cauce: readonly PuntoDelMundo[];
  /**
   * **Dónde cae la noche**, el índice del punto del cauce: hasta él se sigue
   * el río con luz, y de él al último se vuela con el rumbo. Tiene que ser un
   * tramo derecho, porque el rumbo es una recta.
   */
  readonly anochece: number;
  /** El sitio del campo, grados: para el sol. */
  readonly lat: number;
  readonly lon: number;
}

/**
 * **Los ríos de cada campo**, por su indicativo OACI. Asunción es donde se
 * pensó: el «Seguí el río» de #38 es el río Paraguay, y #51 empieza donde
 * acaba. Se vende al mundo: un campo con un río ancho y un tramo derecho
 * dentro de su mundo entra con una línea aquí.
 *
 * - **SGAS, el río Paraguay**: se entra por el norte, encima del cauce a
 *   nueve kilómetros y medio del campo, río abajo hacia el puente Remanso;
 *   allí el río tuerce al suroeste y va **casi derecho siete kilómetros y
 *   medio** —ningún punto medido se aparta de la recta más de ciento diez
 *   metros, con un cauce de ochocientos de ancho—, que es el tramo del rumbo. El sol de noviembre se pone delante y
 *   a la derecha.
 */
export const RIOS_DE_NOCHE: Readonly<Record<string, RioDeNoche>> = {
  SGAS: {
    cauce: [
      { x: -2292, z: -9625 },
      { x: -2005, z: -8937 },
      { x: -1747, z: -8250 },
      { x: -1862, z: -7562 },
      { x: -2206, z: -6875 },
      // El puente Remanso, sobre el cauce (`data/sitios`, en el mundo de SGAS).
      { x: -2910, z: -6353 },
      { x: -4411, z: -4125 },
      { x: -5414, z: -2750 },
      { x: -6503, z: -1375 },
      { x: -7333, z: 0 },
    ],
    anochece: 5,
    lat: -25.240156,
    lon: -57.519227,
  },
};

export function rioDeNoche(oaci: string | null): RioDeNoche | null {
  return (oaci && RIOS_DE_NOCHE[oaci]) || null;
}

// ── El sol ───────────────────────────────────────────────────────────────

/**
 * **La noche**, grados del sol bajo el horizonte: el ocaso civil, el mismo
 * de `esDeNoche` en `world/hora.ts` y el de las luces del juego.
 */
export const NOCHE = -6;
/**
 * **Lo que se apura el reloj del cielo** mientras dura: diez veces. En
 * Asunción el sol baja un quinto de grado por minuto al ponerse; a diez, dos
 * grados por minuto, y el tramo con luz —un minuto largo con la avioneta—
 * cabe entre el sol recién puesto y la noche.
 */
export const PRISA = 10;

/** La altura del sol, grados, a una hora solar de ese día en ese sitio. */
export function alturaDelSol(fecha: Date, hora: number, lat: number, lon: number): number {
  const v = solALaHora(fecha, hora, lat, lon);
  return Math.asin(Math.max(-1, Math.min(1, v[1]))) / GRADO;
}

/**
 * **A qué hora solar de la tarde está el sol a `altura` grados**, bajando:
 * por bisección entre el mediodía y la medianoche, con la misma cuenta que el
 * cielo. Al minuto y medio de segundo no hace falta más.
 */
export function horaConElSolA(altura: number, fecha: Date, lat: number, lon: number): number {
  let a = 12;
  let b = 24;
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2;
    if (alturaDelSol(fecha, m, lat, lon) > altura) a = m;
    else b = m;
  }
  return (a + b) / 2;
}

/** Lo que baja el sol por segundo de reloj de verdad, grados, a esa hora. */
export function bajadaDelSol(fecha: Date, hora: number, lat: number, lon: number): number {
  const h = 60 / 3600;
  return (alturaDelSol(fecha, hora - h, lat, lon) - alturaDelSol(fecha, hora + h, lat, lon)) / 120;
}

// ── Dónde empieza ────────────────────────────────────────────────────────

/** Altura sobre la pista, m: mil quinientos pies, como la deriva. */
export const ALTURA_DEL_RUMBO = 1500 * 0.3048;

export interface ColocacionDelRumbo {
  readonly x: number;
  readonly z: number;
  /** Altura sobre la pista, m. */
  readonly alto: number;
  /** Rumbo del morro, rad verdaderos: por el primer tramo del cauce. */
  readonly rumbo: number;
  /** **La hora solar de salida**: la del sol a `solDeSalida` grados, hoy, aquí. */
  readonly hora: number;
  /** La altura del sol al salir, grados. */
  readonly solDeSalida: number;
  /** El camino con luz, de la salida a donde cae la noche, m. */
  readonly conLuz: number;
}

/** El largo del cauce entre dos de sus puntos, m. */
export function largoDelCauce(cauce: readonly PuntoDelMundo[], desde: number, hasta: number): number {
  let l = 0;
  for (let i = desde + 1; i <= hasta; i++) l += Math.hypot(cauce[i]!.x - cauce[i - 1]!.x, cauce[i]!.z - cauce[i - 1]!.z);
  return l;
}

/**
 * **Dónde empieza y a qué hora**: encima del primer punto del cauce, con el
 * morro por el río, a mil quinientos pies; y a la hora solar en que, con el
 * reloj del cielo apurado `PRISA` veces, el sol llega a la noche cuando el
 * avión llega a `rio.anochece` siguiendo el cauce a `velocidad`. Es decir:
 * **la noche cae en el puente**, vuele lo que vuele. Lo que cambia con el
 * avión es lo alto que está el sol al salir, que es la hora de verdad de hoy.
 */
export function colocacionDelRumbo(o: {
  readonly rio: RioDeNoche;
  readonly velocidad: number;
  readonly fecha: Date;
  /** Hacia dónde va el aire, m/s, como lo usa el modelo (`vientoComoVector`): con él, lo que tarda de verdad. */
  readonly viento?: PuntoDelMundo;
}): ColocacionDelRumbo {
  const { rio } = o;
  const a = rio.cauce[0]!;
  const b = rio.cauce[1]!;
  const conLuz = largoDelCauce(rio.cauce, 0, rio.anochece);
  // Tramo a tramo, a la velocidad sobre el suelo: el viento de cola adelanta el puente.
  let tarda = 0;
  for (let i = 1; i <= rio.anochece; i++) {
    const p = rio.cauce[i - 1]!;
    const q = rio.cauce[i]!;
    const l = Math.hypot(q.x - p.x, q.z - p.z) || 1;
    const aFavor = o.viento ? (o.viento.x * (q.x - p.x) + o.viento.z * (q.z - p.z)) / l : 0;
    tarda += l / Math.max(1, o.velocidad + aFavor);
  }
  // Con la bajada de alrededor del ocaso: en un minuto de reloj apurado el ritmo casi no cambia.
  const ocaso = horaConElSolA(NOCHE, o.fecha, rio.lat, rio.lon);
  const hora = ocaso - (tarda * PRISA) / 3600;
  return {
    x: a.x,
    z: a.z,
    alto: ALTURA_DEL_RUMBO,
    rumbo: Math.atan2(b.x - a.x, -(b.z - a.z)),
    hora,
    solDeSalida: alturaDelSol(o.fecha, hora, rio.lat, rio.lon),
    conLuz,
  };
}

// ── El ejercicio ─────────────────────────────────────────────────────────

/** Lo que el ejercicio mira del vuelo en cada paso. */
export interface LecturaDelRumbo {
  readonly x: number;
  readonly z: number;
  /** El rumbo **verdadero** del morro, grados. */
  readonly rumbo: number;
  /** **La altura del sol que pinta el cielo**, grados: la de verdad, no una cuenta aparte. */
  readonly sol: number;
  readonly enElSuelo: boolean;
  readonly parado: boolean;
  readonly percance: boolean;
}

export type CierreDelRumbo = "hecho" | "otraVez";

/** Cómo se llegó: encima de donde el río sigue, o pasando a su lado. */
export type ComoSeLlegoDeNoche = "encima" | "alLado";

export type SucesoDelRumbo =
  /** El río con la última luz: seguirlo. */
  | { readonly que: "presentar" }
  /** El sol cruzó la noche: el rumbo pedido, magnético, grados. */
  | { readonly que: "anochece"; readonly rumbo: number }
  /** El morro se fue de la marca: 1, a la derecha de ella; −1, a la izquierda. */
  | { readonly que: "seVa"; readonly lado: 1 | -1 }
  /** El morro quieto en la marca un buen rato: una vez. */
  | { readonly que: "enLaMarca" }
  /**
   * Llegó. `desvio`, lo que el morro se apartó de media, grados; `apartado`,
   * lo que pasó al lado del punto, m.
   */
  | { readonly que: "llegaste"; readonly como: ComoSeLlegoDeNoche; readonly desvio: number; readonly apartado: number }
  | { readonly que: "cerrar"; readonly como: CierreDelRumbo };

export type FaseDelRumbo = "rio" | "rumbo" | "cerrada";

/**
 * **Se va**, grados: el morro a diez de la marca. Con la rosa de la avioneta
 * es una raya larga y se ve sin leer.
 */
export const SE_VA = 10;
/** Lo que tiene que durar fuera para decirlo, s: un bache no es irse. */
const FUERA_UN_RATO = 3;
/** **En la marca**, grados: a cinco o menos. Es también lo que rearma el «se va». */
export const EN_LA_MARCA = 5;
/** Lo que tiene que durar en la marca para celebrarlo, s. */
export const QUIETO_UN_RATO = 20;
/**
 * **Lo que se da para llegar a la marca**, s, si no se llega antes: veinte.
 * El rumbo se pide con el morro donde lo tenía el río, y el viraje hasta la
 * marca no es apartarse de ella. Lo que se mide empieza al llegar a la marca
 * por primera vez —a `EN_LA_MARCA`— o, si no se llega, a los veinte segundos:
 * un viraje de treinta grados a la mitad del régimen normal dura veinte.
 * Salió del primer vuelo del banco, que pidió el 225 con el morro en el 243
 * y la instructora dijo «se fue de la marca» antes de que llegara a ella.
 */
export const PARA_LLEGAR_A_LA_MARCA = 20;
/**
 * **Encima del río, donde sigue**: a menos de seiscientos metros en planta.
 * El cauce es de ochocientos de ancho, y con el rumbo redondeado a cinco
 * grados en siete kilómetros y medio el error de la cuenta es de trescientos.
 */
export const LLEGADA = 600;
/** Lo que se deja alejarse de más antes de darlo por pasado, m. */
const PERDIDO = 3000;

export class RumboDeNoche {
  private faseActual: FaseDelRumbo = "rio";
  private presentada = false;
  private comoCerro: CierreDelRumbo | null = null;
  private colocacionPuesta: ColocacionDelRumbo | null = null;
  private reloj = 0;
  private pedido: number | null = null;
  private desde: PuntoDelMundo | null = null;
  private fuera = 0;
  private desdeQueSePidio = 0;
  private enLaMarcaYa = false;
  private puedeDecirSeVa = true;
  private quieto = 0;
  private dijoEnLaMarca = false;
  private enRumbo = 0;
  private desvioSumado = 0;
  private desvioMaximo = 0;
  private comoLlego: ComoSeLlegoDeNoche | null = null;
  private apartadoAlLlegar: number | null = null;
  private solAlAnochecer: number | null = null;

  constructor(
    readonly ejercicio: Ejercicio,
    readonly rio: RioDeNoche,
    /** Lo que hay que sumar al rumbo verdadero para leerlo en la rosa, grados. */
    readonly variacion: number,
  ) {}

  colocar(c: ColocacionDelRumbo): void {
    this.colocacionPuesta = c;
  }

  get colocacion(): ColocacionDelRumbo | null {
    return this.colocacionPuesta;
  }

  get fase(): FaseDelRumbo {
    return this.faseActual;
  }

  get cierre(): CierreDelRumbo | null {
    return this.comoCerro;
  }

  /**
   * **La hora del cielo ahora**: la de salida más lo volado, apurado `PRISA`
   * veces. Sin colocar, nada.
   */
  get hora(): number | null {
    const c = this.colocacionPuesta;
    return c ? c.hora + (this.reloj * PRISA) / 3600 : null;
  }

  /** El rumbo pedido, magnético, grados; antes de anochecer, nada. */
  get rumboPedido(): number | null {
    return this.pedido;
  }

  /** **Adónde se va** de noche: donde el río sigue. */
  get destino(): PuntoDelMundo {
    return this.rio.cauce[this.rio.cauce.length - 1]!;
  }

  /** Lo que el morro se apartó de media desde que llegó a la marca, grados. */
  get desvioMedio(): number | null {
    return this.enRumbo > 0 ? this.desvioSumado / this.enRumbo : null;
  }

  get desvioMasGrande(): number {
    return this.desvioMaximo;
  }

  get llegada(): ComoSeLlegoDeNoche | null {
    return this.comoLlego;
  }

  get apartado(): number | null {
    return this.apartadoAlLlegar;
  }

  /** La altura del sol cuando se pidió el rumbo, grados: lo mira el banco. */
  get solCuandoAnochecio(): number | null {
    return this.solAlAnochecer;
  }

  reiniciar(): void {
    this.faseActual = "rio";
    this.presentada = false;
    this.comoCerro = null;
    this.reloj = 0;
    this.pedido = null;
    this.desde = null;
    this.fuera = 0;
    this.desdeQueSePidio = 0;
    this.enLaMarcaYa = false;
    this.puedeDecirSeVa = true;
    this.quieto = 0;
    this.dijoEnLaMarca = false;
    this.enRumbo = 0;
    this.desvioSumado = 0;
    this.desvioMaximo = 0;
    this.comoLlego = null;
    this.apartadoAlLlegar = null;
    this.solAlAnochecer = null;
  }

  paso(l: LecturaDelRumbo, dt: number): SucesoDelRumbo[] {
    const sucesos: SucesoDelRumbo[] = [];
    if (this.faseActual === "cerrada" || !this.colocacionPuesta) return sucesos;
    if (!this.presentada) {
      this.presentada = true;
      sucesos.push({ que: "presentar" });
    }
    if (l.percance || (l.enElSuelo && l.parado)) {
      this.cerrar("otraVez", sucesos);
      return sucesos;
    }
    this.reloj += dt;

    if (this.faseActual === "rio") {
      if (l.sol > NOCHE) return sucesos;
      /*
       * **Anochece**: el rumbo de aquí a donde el río sigue, en lo que marca
       * la rosa —el magnético— y redondeado a cinco, como lo diría quien va
       * sentado al lado. Se pide desde donde se está, y no desde el puente:
       * quien se apartó del río con luz tiene que llegar igual.
       */
      const g = this.destino;
      const verdadero = Math.atan2(g.x - l.x, -(g.z - l.z)) / GRADO;
      const magnetico = (((verdadero + this.variacion) % 360) + 360) % 360;
      const pedido = ((Math.round(magnetico / 5) * 5) % 360) || 360;
      this.pedido = pedido;
      this.desde = { x: l.x, z: l.z };
      this.solAlAnochecer = l.sol;
      this.faseActual = "rumbo";
      sucesos.push({ que: "anochece", rumbo: pedido });
      return sucesos;
    }

    // ── El rumbo ──
    const pedido = this.pedido!;
    const desde = this.desde!;
    const g = this.destino;
    const desvio = centrado(l.rumbo + this.variacion - pedido);
    const cuanto = Math.abs(desvio);
    // El viraje hasta la marca no cuenta: se empieza a medir al llegar a ella. Ver `PARA_LLEGAR_A_LA_MARCA`.
    this.desdeQueSePidio += dt;
    if (cuanto <= EN_LA_MARCA || this.desdeQueSePidio >= PARA_LLEGAR_A_LA_MARCA) this.enLaMarcaYa = true;
    if (this.enLaMarcaYa) {
      this.enRumbo += dt;
      this.desvioSumado += cuanto * dt;
      this.desvioMaximo = Math.max(this.desvioMaximo, cuanto);

      // **Se va**: una vez, y otra solo cuando el morro haya vuelto a la marca.
      if (cuanto > SE_VA) this.fuera += dt;
      else this.fuera = 0;
      if (cuanto <= EN_LA_MARCA) this.puedeDecirSeVa = true;
      if (this.puedeDecirSeVa && this.fuera >= FUERA_UN_RATO) {
        this.puedeDecirSeVa = false;
        sucesos.push({ que: "seVa", lado: desvio > 0 ? 1 : -1 });
      }
      // **En la marca**: quieto un buen rato, una vez.
      this.quieto = cuanto <= EN_LA_MARCA ? this.quieto + dt : 0;
      if (!this.dijoEnLaMarca && this.quieto >= QUIETO_UN_RATO) {
        this.dijoEnLaMarca = true;
        sucesos.push({ que: "enLaMarca" });
      }
    }

    /*
     * **Llegar**: encima de donde el río sigue; o, si el rumbo se fue, al
     * pasarlo a su altura —la perpendicular por el punto, en la recta de
     * donde anocheció— o al alejarse de más. Nadie suspende: se cuenta por
     * dónde pasó.
     */
    const falta = Math.hypot(g.x - l.x, g.z - l.z);
    const dx = g.x - desde.x;
    const dz = g.z - desde.z;
    const largo = Math.hypot(dx, dz) || 1;
    const avanzado = ((l.x - desde.x) * dx + (l.z - desde.z) * dz) / largo;
    let como: ComoSeLlegoDeNoche | null = null;
    if (falta < LLEGADA) como = "encima";
    else if (avanzado >= largo || falta > largo + PERDIDO) como = "alLado";
    if (como) {
      this.comoLlego = como;
      this.apartadoAlLlegar = falta;
      sucesos.push({ que: "llegaste", como, desvio: this.desvioMedio ?? 0, apartado: falta });
      this.cerrar("hecho", sucesos);
    }
    return sucesos;
  }

  private cerrar(como: CierreDelRumbo, sucesos: SucesoDelRumbo[]): void {
    this.faseActual = "cerrada";
    this.comoCerro = como;
    sucesos.push({ que: "cerrar", como });
  }
}

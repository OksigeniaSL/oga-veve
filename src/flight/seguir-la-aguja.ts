/**
 * **«Seguí la aguja»**: el primer ejercicio de la radio de navegación, el del
 * peldaño del NDB (#51, peldaño 4; ADR 0030, enmienda H26b).
 *
 * Se sintoniza la radio del campo en el ADF, se identifica por su morse y se
 * vuela hacia ella siguiendo la aguja: «que apunte arriba, al morro». Es lo
 * más sencillo que hace un instrumento de radio, y con viento cruzado enseña
 * algo que no se olvida: **la aguja dice dónde está la estación, no por dónde
 * se va**. Quien la sigue con el morro clavado en ella se va escurriendo con
 * el viento, la aguja se le va a un lado, gira para centrarla, y así hasta la
 * estación: la estela sobre el suelo no es una recta, es una curva que acaba
 * llegando de cara al viento. Es **la curva del perro** —*homing* en los
 * manuales—, la del perro que corre siempre hacia su amo mientras el amo
 * camina. Con el viento en calma, la estela sale recta.
 *
 * La solución es la de toda la navegación con viento: **apuntar un poco al
 * viento**. Con el morro unos grados hacia donde viene el aire, la aguja se
 * queda quieta a un lado —del lado al que empuja el viento— y la estela sale
 * recta: eso ya es seguir un rumbo a la estación (*tracking*), y es lo que el
 * #51 llama el triángulo de vientos vivido antes que dibujado.
 *
 * Y se acaba **al pasar por encima**: la aguja da la vuelta y apunta atrás,
 * que es como se sabe en una cabina que se ha llegado a la estación.
 *
 * ## Lo que es de verdad, y de dónde sale
 *
 * - **La aguja del ADF es la marcación relativa** y no sabe de viento:
 *   `leerAdf` en `radio-de-navegacion.ts`. La curva no la pinta este fichero:
 *   sale de volar con el viento que ya sopla en el modelo de vuelo.
 * - **Identificar antes de seguir**: el morse de la estación (UIT-R M.1677) a
 *   1.020 Hz; ver `audio/morse.ts`. Sin identificarla, la aguja no se sigue, y
 *   el ejercicio no pide seguirla hasta que ha sonado.
 * - **El viento del sitio, el de siempre**: el alisio de Fuerteventura, del
 *   treinta a veinte nudos (`vientoDominante` del escenario). El ejercicio se
 *   coloca con ese viento de costado: ver `colocacionDeLaAguja`.
 * - **El NDB del campo**: FV en Fuerteventura, que es el campo para el que se
 *   pensó porque tiene NDB y VOR y alisio de sobra. Pero vale en cualquier
 *   campo con NDB —El Hierro, La Palma, Cuatro Vientos, Pedro Juan Caballero,
 *   Concepción—: ver `ndbDelCampo`.
 *
 * ## Nadie suspende
 *
 * Si se sigue la aguja sin corregir, se llega igual: la curva del perro llega
 * siempre, solo que más larga. No hay castigo: se ve la estela, se cuenta por
 * qué es curva, y la próxima vez se apunta al viento. Si algo sale mal, se
 * repite, como en un simulador.
 *
 * Sin three.js, sin audio y sin DOM: se prueba solo, con un piloto de prueba
 * que sigue la aguja (`seguir-la-aguja.test.ts`).
 */

import type { Ejercicio } from "./ejercicios";
import { centrado, emisorasEn, radioDeSalida, type Emisora } from "./radio-de-navegacion";

/** Una milla náutica, m. */
const MILLA = 1852;

/** Un punto del mundo, m: x al este, z al sur. */
export interface PuntoDelMundo {
  readonly x: number;
  readonly z: number;
}

/**
 * **El NDB del campo**, el que se sigue: el que la radio pone al salir en el
 * ADF. `null` si el campo no tiene, y entonces el ejercicio no se ofrece.
 */
export function ndbDelCampo(oaci: string | null): Emisora | null {
  return radioDeSalida(oaci).adf;
}

// ── Dónde empieza ────────────────────────────────────────────────────────

/** Lo que se tarda en llegar a la estación volando recto, s: seis minutos. */
export const MINUTOS_HASTA_LA_ESTACION = 6 * 60;
/** Lo más cerca y lo más lejos que se empieza, m: ocho y veinticinco millas. */
export const LEJOS = { min: 8 * MILLA, max: 25 * MILLA } as const;
/**
 * **La velocidad del ejercicio**, m/s: la de crucero del avión, y como mucho
 * doscientos cincuenta nudos, que es el tope por debajo de diez mil pies.
 */
export const TOPE_POR_DEBAJO_DE_DIEZ_MIL = 250 * 0.514444;
/** La altura del ejercicio sobre la pista, m: tres mil pies. */
export const ALTURA_DE_LA_AGUJA = 3000 * 0.3048;
/** Lo que se deja por encima del suelo más alto del camino, m: mil pies. */
const POR_ENCIMA_DEL_CAMINO = 1000 * 0.3048;
/**
 * **Lo que el morro empieza apartado de la estación**, rad: treinta grados.
 * Al sintonizar, la aguja sale a un lado y lo primero es girar hasta ponerla
 * arriba: así se ve que la aguja apunta a la radio y no al morro.
 */
export const APARTADO_AL_EMPEZAR = (30 * Math.PI) / 180;

export interface ColocacionDeLaAguja {
  readonly x: number;
  readonly z: number;
  /** Altura sobre la pista, m. */
  readonly alto: number;
  /** Rumbo del morro, rad: cero al norte, positivo hacia el este. */
  readonly rumbo: number;
  /** De la salida a la estación, m. */
  readonly lejos: number;
}

/** El rumbo, rad, de `a` a `b` en el mundo: cero al norte (−z), positivo al este. */
export function rumboEnElMundo(a: PuntoDelMundo, b: PuntoDelMundo): number {
  return Math.atan2(b.x - a.x, -(b.z - a.z));
}

/**
 * **Dónde empieza**: a seis minutos de la estación, con el viento **de
 * costado** —a noventa grados del camino—, que es el que dibuja la curva. De
 * los dos costados, el del camino más bajo: en Fuerteventura, el del mar, al
 * sudeste de FV, y no el de la isla. A tres mil pies sobre la pista, o mil por
 * encima de lo más alto del camino si eso es más. Y con el morro treinta
 * grados apartado de la estación, del lado al que va el viento.
 *
 * `viento` es hacia dónde va el aire, m/s, como lo usa el modelo de vuelo
 * (`vientoComoVector`). En calma, el camino va de oeste a este, que da igual.
 */
export function colocacionDeLaAguja(o: {
  readonly estacion: PuntoDelMundo;
  readonly viento: PuntoDelMundo;
  readonly velocidad: number;
  /** El suelo, m sobre el mar, en un punto del mundo; el agua, cero. */
  readonly suelo: (x: number, z: number) => number;
  readonly cotaDeLaPista: number;
}): ColocacionDeLaAguja {
  const lejos = Math.min(LEJOS.max, Math.max(LEJOS.min, o.velocidad * MINUTOS_HASTA_LA_ESTACION));
  const fuerza = Math.hypot(o.viento.x, o.viento.z);
  const va = fuerza > 0.1 ? { x: o.viento.x / fuerza, z: o.viento.z / fuerza } : { x: 0, z: -1 };
  // Los dos costados del viento.
  const costados = [
    { x: -va.z, z: va.x },
    { x: va.z, z: -va.x },
  ];
  const masAlto = (c: PuntoDelMundo): number => {
    let alto = 0;
    for (let i = 0; i <= 12; i++) {
      const f = i / 12;
      alto = Math.max(alto, o.suelo(o.estacion.x + c.x * lejos * f, o.estacion.z + c.z * lejos * f));
    }
    return alto;
  };
  const conSuelo = costados.map((c) => ({ c, alto: masAlto(c) }));
  const elegido = conSuelo[1]!.alto < conSuelo[0]!.alto - 1 ? conSuelo[1]! : conSuelo[0]!;
  const x = o.estacion.x + elegido.c.x * lejos;
  const z = o.estacion.z + elegido.c.z * lejos;
  const hacia = rumboEnElMundo({ x, z }, o.estacion);
  // El lado al que va el viento, mirando a la estación: a la derecha si su producto sale positivo.
  const derecha = { x: Math.cos(hacia), z: Math.sin(hacia) };
  const lado = va.x * derecha.x + va.z * derecha.z >= 0 ? 1 : -1;
  return {
    x,
    z,
    alto: Math.max(ALTURA_DE_LA_AGUJA, elegido.alto + POR_ENCIMA_DEL_CAMINO - o.cotaDeLaPista),
    rumbo: hacia + lado * APARTADO_AL_EMPEZAR,
    lejos,
  };
}

// ── El ejercicio ─────────────────────────────────────────────────────────

/** De qué lado: del camino, del morro o de la aguja. */
export type Lado = "izquierda" | "derecha";

/** Lo que el ejercicio necesita mirar del vuelo en cada paso. */
export interface LecturaDeLaAguja {
  readonly x: number;
  readonly z: number;
  readonly enElSuelo: boolean;
  /** Quieto en el suelo. */
  readonly parado: boolean;
  /** Si el vuelo acaba de terminar en un percance. */
  readonly percance: boolean;
  /** Si el ADF tiene puesta la estación del ejercicio. */
  readonly sintonizada: boolean;
  /** Si su morse ya sonó entero desde que se puso. */
  readonly identificada: boolean;
  /** La marcación relativa del ADF, grados de 0 a 360; `null` sin señal o sin la estación. */
  readonly relativa: number | null;
}

export type CierreDeLaAguja =
  /** Se llegó a la estación y se pasó por encima: lo que se practicaba. */
  | "hecho"
  /** Algo salió mal, o se aterrizó antes: se repite, como en el simulador. */
  | "otraVez";

export type SucesoDeLaAguja =
  /** Qué se va a hacer, antes de nada. */
  | { readonly que: "presentar" }
  /** Poner la estación en el ADF: tocándola en la carta o con su tecla. */
  | { readonly que: "sintonizar" }
  /** Sonó su morse: es la que se quería; ahora, la aguja arriba. */
  | { readonly que: "identificada" }
  /** La estela se curva: el viento empuja hacia `lado`. */
  | { readonly que: "curva"; readonly lado: Lado; readonly desvio: number }
  /** Apuntar un poco al viento, que viene de `lado`. */
  | { readonly que: "corregir"; readonly lado: Lado }
  /** La aguja quieta a un lado y la estela recta: así se corrige. */
  | { readonly que: "asiVa" }
  /** La aguja dio la vuelta: se pasó por encima de la estación. */
  | { readonly que: "pasada"; readonly desvio: number }
  | { readonly que: "cerrar"; readonly como: CierreDeLaAguja };

export type FaseDeLaAguja = "sintonizar" | "identificar" | "seguir" | "cerrada";

/** Cuándo se pide sintonizar, s: detrás de la presentación, que se oiga entera. */
export const PIDE_SINTONIZAR = 12;
/** Con la aguja a menos de esto del morro, se la está siguiendo, grados. */
export const ARRIBA = 12;
/**
 * **Cuánto tiene que apartarse la estela de la recta** para decir que se
 * curva, en fracción de lo que había hasta la estación: un dos por ciento, y
 * como poco cuatrocientos metros.
 *
 * Medido con el piloto de prueba y el alisio de Fuerteventura: la curva se
 * aparta de la recta **unos mil trescientos metros a cualquier velocidad**,
 * porque son seis minutos de viento empujando —un 7,5 % del camino a cien
 * nudos y un 3 % a doscientos cincuenta—; en calma, de veinte a cincuenta
 * metros. Con un cuatro por ciento, a partir de unos ciento noventa nudos la
 * curva no se decía nunca, y la lección es la misma en un reactor.
 */
export const SE_CURVA = 0.02;
const SE_CURVA_COMO_POCO = 400;
/** Cuánto tiempo siguiendo la aguja antes de mirar la estela, s: que haya estela que mirar. */
const SIGUIENDO_ANTES = 20;
/** Lo que se deja desde «mirá la estela» hasta «apuntá al viento», s: lo que se tarda en decir lo primero. */
export const CORRIGE_TRAS = 14;
/** La aguja quieta: lo que puede moverse, grados, en `QUIETA_DURANTE` segundos. */
const QUIETA = 2.5;
const QUIETA_DURANTE = 10;
/** Y a un lado: entre estos grados del morro, del lado al que va el viento. */
const A_UN_LADO = { min: 3, max: 40 } as const;
/**
 * **Cerca de la estación**, m: tres millas. Pasar por encima es que la aguja
 * cruce los noventa grados aquí dentro; más lejos, la aguja que se va atrás es
 * haberse dado la vuelta, no haber llegado.
 */
export const ENCIMA = 3 * MILLA;

export class SeguirLaAguja {
  private faseActual: FaseDeLaAguja = "sintonizar";
  private segundos = 0;
  private presentada = false;
  private pedidaLaSintonia = false;
  private estabaSintonizada = false;
  /** Dónde empezó a seguir la aguja: la recta de la que se mide la curva. */
  private desde: PuntoDelMundo | null = null;
  private siguiendo = 0;
  private desvioMax = 0;
  private curvaDicha: Lado | null = null;
  private desdeLaCurva = 0;
  private corregirDicho = false;
  private asiDicho = false;
  /** Las marcaciones de los últimos segundos, para ver si la aguja está quieta. */
  private marcas: { t: number; c: number }[] = [];
  private anterior: number | null = null;
  private comoCerro: CierreDeLaAguja | null = null;

  constructor(
    readonly ejercicio: Ejercicio,
    /** La estación que se sigue: su frecuencia, su identificador y dónde está en el mundo. */
    readonly estacion: { readonly emisora: Emisora; readonly x: number; readonly z: number },
  ) {}

  get fase(): FaseDeLaAguja {
    return this.faseActual;
  }

  get cierre(): CierreDeLaAguja | null {
    return this.comoCerro;
  }

  /** Lo más que se apartó la estela de la recta, m. Es la curva del perro. */
  get desvio(): number {
    return this.desvioMax;
  }

  /** Lo que había hasta la estación al empezar a seguir la aguja, m. */
  get lejosAlEmpezar(): number | null {
    const d = this.desde;
    return d ? Math.hypot(this.estacion.x - d.x, this.estacion.z - d.z) : null;
  }

  /** Si esta frecuencia es la de la estación del ejercicio. */
  esLaEstacion(mhz: number | null): boolean {
    return mhz !== null && emisorasEn("adf", mhz, [this.estacion.emisora]).length > 0;
  }

  /** Otra vez desde el principio, como en el simulador. */
  reiniciar(): void {
    this.faseActual = "sintonizar";
    this.segundos = 0;
    this.presentada = false;
    this.pedidaLaSintonia = false;
    this.estabaSintonizada = false;
    this.desde = null;
    this.siguiendo = 0;
    this.desvioMax = 0;
    this.curvaDicha = null;
    this.desdeLaCurva = 0;
    this.corregirDicho = false;
    this.asiDicho = false;
    this.marcas = [];
    this.anterior = null;
    this.comoCerro = null;
  }

  paso(l: LecturaDeLaAguja, dt: number): SucesoDeLaAguja[] {
    const sucesos: SucesoDeLaAguja[] = [];
    if (this.faseActual === "cerrada") return sucesos;
    this.segundos += dt;
    if (!this.presentada) {
      this.presentada = true;
      sucesos.push({ que: "presentar" });
    }
    if (l.percance) {
      this.cerrar("otraVez", sucesos);
      return sucesos;
    }
    // Posado sin haber pasado: se repite. Sin decir nada: el suelo ya lo dice.
    if (l.enElSuelo && l.parado) {
      this.cerrar("otraVez", sucesos);
      return sucesos;
    }

    /*
     * **Sintonizar**: se pide una vez, detrás de la presentación, y otra solo
     * si se quita después de haberla puesto. Un aviso vuelve cuando cambia
     * algo que pasa, no cuando pasa un rato.
     */
    const quitada = this.estabaSintonizada && !l.sintonizada;
    this.estabaSintonizada = l.sintonizada;
    if (!l.sintonizada) {
      if (this.faseActual !== "sintonizar") this.faseActual = "sintonizar";
      if ((!this.pedidaLaSintonia && this.segundos >= PIDE_SINTONIZAR) || quitada) {
        this.pedidaLaSintonia = true;
        sucesos.push({ que: "sintonizar" });
      }
      return sucesos;
    }
    if (this.faseActual === "sintonizar") this.faseActual = l.identificada ? "seguir" : "identificar";
    if (this.faseActual === "identificar") {
      if (!l.identificada) return sucesos;
      this.faseActual = "seguir";
      sucesos.push({ que: "identificada" });
    }

    // ── Siguiendo la aguja ────────────────────────────────────────────────
    const rel = l.relativa === null ? null : centrado(l.relativa);
    const distancia = Math.hypot(this.estacion.x - l.x, this.estacion.z - l.z);
    if (rel !== null) {
      /*
       * **Pasar por encima**: la aguja cruza los noventa grados cerca de la
       * estación. Va de delante a detrás de golpe, que es lo que hace un ADF
       * de verdad al pasar por la vertical.
       */
      if (this.anterior !== null && Math.abs(this.anterior) < 90 && Math.abs(rel) >= 90 && distancia < ENCIMA) {
        sucesos.push({ que: "pasada", desvio: this.desvioMax });
        this.cerrar("hecho", sucesos);
        return sucesos;
      }
      this.anterior = rel;
      this.marcas.push({ t: this.segundos, c: rel });
      while (this.marcas.length && this.segundos - this.marcas[0]!.t > QUIETA_DURANTE) this.marcas.shift();
    }

    // La recta de la que se mide: desde donde la aguja quedó arriba por primera vez.
    if (!this.desde && rel !== null && Math.abs(rel) < ARRIBA) this.desde = { x: l.x, z: l.z };
    const d = this.desde;
    if (!d || rel === null) return sucesos;
    if (Math.abs(rel) < ARRIBA) this.siguiendo += dt;

    /*
     * **Cuánto se aparta la estela de la recta** de `desde` a la estación, y
     * hacia qué lado: el producto con la normal de la recta. A la derecha de
     * quien va hacia la estación es positivo.
     */
    const rx = this.estacion.x - d.x;
    const rz = this.estacion.z - d.z;
    const largo = Math.hypot(rx, rz) || 1;
    const aLaDerecha = ((l.x - d.x) * -rz + (l.z - d.z) * rx) / largo;
    this.desvioMax = Math.max(this.desvioMax, Math.abs(aLaDerecha));

    if (
      !this.curvaDicha &&
      this.siguiendo >= SIGUIENDO_ANTES &&
      Math.abs(aLaDerecha) >= Math.max(SE_CURVA_COMO_POCO, SE_CURVA * largo)
    ) {
      this.curvaDicha = aLaDerecha > 0 ? "derecha" : "izquierda";
      sucesos.push({ que: "curva", lado: this.curvaDicha, desvio: Math.abs(aLaDerecha) });
    }
    if (this.curvaDicha) {
      this.desdeLaCurva += dt;
      // El viento viene del otro lado del que empuja.
      const alViento: Lado = this.curvaDicha === "derecha" ? "izquierda" : "derecha";
      if (!this.corregirDicho && this.desdeLaCurva >= CORRIGE_TRAS) {
        this.corregirDicho = true;
        sucesos.push({ que: "corregir", lado: alViento });
      }
      /*
       * **Así va**: la aguja quieta del lado al que empuja el viento —con el
       * morro hacia el viento, la estación queda del otro lado— y quieta de
       * verdad, diez segundos sin moverse más de dos grados y medio.
       */
      if (this.corregirDicho && !this.asiDicho && this.marcas.length > 1) {
        const lleva = this.marcas[this.marcas.length - 1]!.t - this.marcas[0]!.t;
        const cs = this.marcas.map((m) => m.c);
        const quieta = lleva >= QUIETA_DURANTE - 0.5 && Math.max(...cs) - Math.min(...cs) <= QUIETA;
        const delLado = this.curvaDicha === "derecha" ? rel > 0 : rel < 0;
        if (quieta && delLado && Math.abs(rel) >= A_UN_LADO.min && Math.abs(rel) <= A_UN_LADO.max) {
          this.asiDicho = true;
          sucesos.push({ que: "asiVa" });
        }
      }
    }
    return sucesos;
  }

  private cerrar(como: CierreDeLaAguja, sucesos: SucesoDeLaAguja[]): void {
    this.faseActual = "cerrada";
    this.comoCerro = como;
    sucesos.push({ que: "cerrar", como });
  }
}

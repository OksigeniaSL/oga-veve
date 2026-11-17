/**
 * **«¿En qué radial estoy?»**: el segundo ejercicio de la radio de
 * navegación, el del peldaño del VOR (#51, peldaño 5; ADR 0030, enmienda
 * H26c).
 *
 * Es el salto conceptual del VOR, y por eso va solo. La aguja del ADF dice
 * dónde está la radio mirando desde el morro; **el VOR no dice hacia dónde
 * ir: dice en qué radial estás**, mires a donde mires. Un VOR emite un radial
 * por cada grado alrededor, como los rayos de una rueda, y el receptor sabe en
 * cuál está el avión. El curso del OBS elige uno, y la barra dice a qué lado
 * queda; la ventanilla TO/FROM, si ese curso lleva a la radio o se aleja.
 *
 * Los pasos, como en una escuela de vuelo:
 *
 * 1. **Sintonizar e identificar**: la NAV empieza vacía; se pone el VOR del
 *    campo y se oye su morse, que es la mitad de usar un instrumento de radio.
 * 2. **Girar el OBS hasta centrar la barra con FROM**: ese número es el radial
 *    en que se está. El juego lo sabe —`leerNav`—, y se lo deja encontrar.
 * 3. **Girar el avión noventa grados**: la rosa da un cuarto de vuelta y la
 *    barra casi no se mueve. **Es el momento de la lección**: el radial es un
 *    sitio, no un rumbo. Lo poco que se mueve es lo que el avión avanza
 *    mientras gira, no lo que gira; por eso se empieza lejos (ver `LEJOS`).
 * 4. **A la radio por ese radial**: el OBS media vuelta, hasta que diga TO, y
 *    volar con la barra en el centro. Con el viento de costado, otra vez
 *    apuntar un poco al viento, ahora con una barra que dice si se acierta.
 * 5. **Pasar por encima**: sale la bandera —encima de la estación el
 *    receptor no sabe qué decir, el cono de confusión— y al otro lado TO y
 *    FROM se dan la vuelta. Ahí se acaba.
 *
 * ## Lo que es de verdad, y de dónde sale
 *
 * - **El radial, la barra, el TO/FROM y la bandera** son los de
 *   `radio-de-navegacion.ts` (`leerNav`): gran círculo, el norte de la
 *   estación con la declinación que publica el AIP, el cono de cincuenta
 *   grados y la bandera de través. Este fichero no calcula ninguno: mira lo
 *   que marca el instrumento, como quien vuela.
 * - **El VOR del campo**, el que la radio pone al salir en la NAV
 *   (`radioDeSalida`): FTV en Fuerteventura, TFN en Los Rodeos, TFS en
 *   Tenerife Sur, VAS en Asunción… Vale en todo campo que tenga uno.
 * - **El viento del sitio**, como en la aguja: el `vientoDominante` del
 *   campo, a mano (ver `main.ts`). El radial se elige **de costado al viento**
 *   para que la vuelta a la radio pida corregirlo.
 *
 * ## Nadie suspende
 *
 * Si no se centra la barra, o no se gira, o se va a la radio con FROM, se
 * llega igual y se pasa igual: la bandera y el cambio de TO/FROM salen siempre
 * al pasar. No hay castigo; se ve, se cuenta, y otra vez.
 *
 * Sin three.js, sin audio y sin DOM: lo prueba un piloto de prueba con la
 * radio de verdad (`en-que-radial-estoy.test.ts`).
 */

import type { Ejercicio } from "./ejercicios";
import { centrado, emisorasEn, radioDeSalida, vuelta, type Emisora } from "./radio-de-navegacion";
import { rumboEnElMundo, type PuntoDelMundo } from "./seguir-la-aguja";

const GRADO = Math.PI / 180;
/** Una milla náutica, m. */
const MILLA = 1852;

/**
 * **El VOR del campo**, el del ejercicio: el que la radio pone al salir en la
 * NAV. `null` si el campo no tiene, y entonces el ejercicio no se ofrece.
 */
export function vorDelCampo(oaci: string | null): Emisora | null {
  return radioDeSalida(oaci).nav;
}

// ── Dónde empieza ────────────────────────────────────────────────────────

/** Lo que se tarda en llegar a la radio volando recto, s: ocho minutos. */
export const MINUTOS_HASTA_LA_RADIO = 8 * 60;
/**
 * **Lo más cerca y lo más lejos que se empieza**, m: doce y treinta millas.
 *
 * Lejos a propósito, y es la lección: al girar noventa grados el avión no
 * gira en el sitio, describe un cuarto de círculo, y se mueve de lado lo que
 * mide el radio de su viraje —un kilómetro largo la avioneta a régimen
 * estándar—. Visto desde la radio, eso es un cambio de radial de ese radio
 * partido por la distancia: a seis minutos serían tres grados, más de lo que
 * se tiene por centrada; a ocho, poco más de dos. La barra tiene que quedarse
 * casi quieta para que se vea que el rumbo no la mueve.
 */
export const LEJOS = { min: 12 * MILLA, max: 30 * MILLA } as const;
/** La altura del ejercicio sobre la pista, m: tres mil pies, como la aguja. */
export const ALTURA_DEL_RADIAL = 3000 * 0.3048;
/** Lo que se deja por encima del suelo más alto del camino, m: mil pies. */
const POR_ENCIMA_DEL_CAMINO = 1000 * 0.3048;
/** De cuánto en cuánto es un radial redondo, grados: el «060» de la propuesta. */
export const REDONDO = 10;
/**
 * **Lo que el OBS empieza apartado del radial**, grados: veinte. La barra
 * sale a tope a un lado —el VOR la lleva a tope a diez grados— con FROM, y
 * veinte toques la traen al centro. Más sería girar una rueda por girarla.
 */
export const OBS_APARTADO = 20;

export interface ColocacionDelRadial {
  readonly x: number;
  readonly z: number;
  /** Altura sobre la pista, m. */
  readonly alto: number;
  /** Rumbo del morro, rad: cero al norte, positivo hacia el este. */
  readonly rumbo: number;
  /** El radial donde empieza, magnético con el norte de la estación, redondo. */
  readonly radial: number;
  /** Lo que lleva el OBS al empezar, de 1 a 360. */
  readonly curso: number;
  /** De la salida a la radio, m. */
  readonly lejos: number;
}

/** Un rumbo de 0 a 360 escrito como en un OBS: el norte es 360, no 0. */
export const comoEnElObs = (g: number): number => Math.round(vuelta(g)) % 360 || 360;

/**
 * **Dónde empieza**: en un radial redondo **de costado al viento**, a ocho
 * minutos de la radio, y del lado más bajo de los dos —en Fuerteventura, el
 * mar al sudeste de FTV—. A tres mil pies sobre la pista o mil por encima de
 * lo más alto del camino. **Con el morro de través al radial**, del lado que
 * mira al viento: así el avión se aparta despacio del radial mientras se
 * gira el OBS, y al girar noventa grados queda sobre él. Y con el OBS veinte
 * grados apartado, con FROM y la barra a tope.
 *
 * `viento` es hacia dónde va el aire, m/s, como lo usa el modelo de vuelo
 * (`vientoComoVector`). En calma, el radial mira al este.
 * `declinacion` es la de la estación, que se suma al verdadero para el
 * magnético (`Emisora.declinacion`).
 */
export function colocacionDelRadial(o: {
  readonly estacion: PuntoDelMundo;
  readonly declinacion: number;
  readonly viento: PuntoDelMundo;
  readonly velocidad: number;
  /** El suelo, m sobre el mar, en un punto del mundo; el agua, cero. */
  readonly suelo: (x: number, z: number) => number;
  readonly cotaDeLaPista: number;
}): ColocacionDelRadial {
  const lejos = Math.min(LEJOS.max, Math.max(LEJOS.min, o.velocidad * MINUTOS_HASTA_LA_RADIO));
  const fuerza = Math.hypot(o.viento.x, o.viento.z);
  const va = fuerza > 0.1 ? { x: o.viento.x / fuerza, z: o.viento.z / fuerza } : { x: 0, z: -1 };
  /*
   * Los dos radiales de costado al viento, redondeados: el radial es
   * magnético y el mundo es verdadero, así que se pasa al magnético, se
   * redondea allí —el número que se lee en el OBS— y se vuelve.
   */
  const deCostado = [
    { x: -va.z, z: va.x },
    { x: va.z, z: -va.x },
  ].map((c) => {
    const verdadero = Math.atan2(c.x, -c.z) / GRADO;
    const radial = comoEnElObs(Math.round((verdadero + o.declinacion) / REDONDO) * REDONDO);
    const r = (radial - o.declinacion) * GRADO;
    return { radial, d: { x: Math.sin(r), z: -Math.cos(r) } };
  });
  const masAlto = (d: PuntoDelMundo): number => {
    let alto = 0;
    for (let i = 0; i <= 12; i++) {
      const f = i / 12;
      alto = Math.max(alto, o.suelo(o.estacion.x + d.x * lejos * f, o.estacion.z + d.z * lejos * f));
    }
    return alto;
  };
  const conSuelo = deCostado.map((c) => ({ ...c, alto: masAlto(c.d) }));
  const elegido = conSuelo[1]!.alto < conSuelo[0]!.alto - 1 ? conSuelo[1]! : conSuelo[0]!;
  const x = o.estacion.x + elegido.d.x * lejos;
  const z = o.estacion.z + elegido.d.z * lejos;
  /*
   * El morro de través al radial, de los dos lados el que va contra el
   * viento: con menos velocidad sobre el suelo, el avión cruza los radiales
   * más despacio mientras se busca el bueno. En calma, el de la derecha.
   */
  const haciaFuera = rumboEnElMundo(o.estacion, { x, z });
  const travesA = haciaFuera + Math.PI / 2;
  const contraElViento = -(va.x * Math.sin(travesA) - va.z * Math.cos(travesA));
  const rumbo = fuerza > 0.1 && contraElViento < 0 ? haciaFuera - Math.PI / 2 : travesA;
  return {
    x,
    z,
    alto: Math.max(ALTURA_DEL_RADIAL, elegido.alto + POR_ENCIMA_DEL_CAMINO - o.cotaDeLaPista),
    rumbo,
    radial: elegido.radial,
    curso: comoEnElObs(elegido.radial - OBS_APARTADO),
    lejos,
  };
}

// ── El ejercicio ─────────────────────────────────────────────────────────

/** Lo que el ejercicio necesita mirar del vuelo en cada paso. */
export interface LecturaDelRadial {
  readonly x: number;
  readonly z: number;
  readonly enElSuelo: boolean;
  /** Quieto en el suelo. */
  readonly parado: boolean;
  /** Si el vuelo acaba de terminar en un percance. */
  readonly percance: boolean;
  /** Si la NAV tiene puesta la estación del ejercicio y se oye. */
  readonly sintonizada: boolean;
  /** Si su morse ya sonó entero desde que se puso. */
  readonly identificada: boolean;
  /** El rumbo del avión, grados. Solo se mira cuánto cambia. */
  readonly rumbo: number;
  /** El curso del OBS, grados. */
  readonly curso: number;
  /** Lo que marca la NAV: `leerNav` con ese curso. */
  readonly desviacion: number | null;
  readonly toFrom: "TO" | "FROM" | null;
  readonly bandera: boolean;
}

export type CierreDelRadial =
  /** Se pasó por encima de la radio: lo que se practicaba. */
  | "hecho"
  /** Algo salió mal, o se aterrizó antes: se repite, como en el simulador. */
  | "otraVez";

export type SucesoDelRadial =
  /** Qué se va a hacer, antes de nada. */
  | { readonly que: "presentar" }
  /** Poner la estación en la NAV: tocándola en la carta o con su tecla. */
  | { readonly que: "sintonizar" }
  /** Sonó su morse: es la que se quería; ahora, el OBS. */
  | { readonly que: "identificada" }
  /** La barra centrada con FROM: el curso del OBS es el radial en que se está. */
  | { readonly que: "centrada"; readonly radial: number }
  /**
   * El avión giró noventa grados y la barra casi no se movió. `giro`, lo que
   * giró el morro; `seMovio`, lo que se movió la barra, grados.
   */
  | { readonly que: "giro"; readonly giro: number; readonly seMovio: number }
  /** A la radio por ese radial: el OBS media vuelta, TO, y la barra al centro. */
  | { readonly que: "haciaLaRadio" }
  /** Se pasó por encima: la bandera y TO y FROM al revés. */
  | { readonly que: "pasada"; readonly de: "TO" | "FROM"; readonly a: "TO" | "FROM" }
  | { readonly que: "cerrar"; readonly como: CierreDelRadial };

export type FaseDelRadial = "sintonizar" | "identificar" | "centrar" | "girar" | "aLaRadio" | "cerrada";

/** Cuándo se pide sintonizar, s: detrás de la presentación, que se oiga entera. */
export const PIDE_SINTONIZAR = 14;
/**
 * **Centrada**: la barra a menos de un grado del centro, con FROM y sin
 * bandera. Es una décima de la escala —el VOR va a tope a diez grados, dos
 * puntos de cinco—, que en la pantalla ya es el centro; y con el OBS de grado
 * en grado siempre hay un número que cae dentro, también con el avión
 * cruzando radiales, que a ocho minutos de la radio se mueven un grado cada
 * diez segundos. Con dos, el piloto de prueba se paraba en el borde, grado y
 * medio antes del radial de verdad.
 */
export const CENTRADA = 1;
/** **Girado**: lo que tiene que haber girado el morro desde que se centró, grados. */
export const GIRADO = 80;
/** Lo que se deja desde «¿viste?» hasta pedir la vuelta a la radio, s: lo que se tarda en decirlo. */
export const HACIA_LA_RADIO_TRAS = 9;
/**
 * **Cerca de la radio**, m: tres millas. Pasar por encima es que TO y FROM
 * se den la vuelta aquí dentro; más lejos, es cruzar de través la recta que
 * pasa por la radio, no haber llegado.
 */
export const ENCIMA = 3 * MILLA;

export class EnQueRadialEstoy {
  private faseActual: FaseDelRadial = "sintonizar";
  private segundos = 0;
  private presentada = false;
  private pedidaLaSintonia = false;
  private estabaSintonizada = false;
  /** El rumbo y la barra cuando se centró: de ahí se mide el giro. */
  private alCentrar: { rumbo: number; desviacion: number; radial: number } | null = null;
  private desdeElGiro = 0;
  /** El último TO o FROM que se vio, y si desde entonces salió la bandera cerca de la radio. */
  private ultimo: "TO" | "FROM" | null = null;
  private banderaEncima = false;
  private comoCerro: CierreDelRadial | null = null;

  constructor(
    readonly ejercicio: Ejercicio,
    /** La estación: su frecuencia, su identificador y dónde está en el mundo. */
    readonly estacion: { readonly emisora: Emisora; readonly x: number; readonly z: number },
  ) {}

  get fase(): FaseDelRadial {
    return this.faseActual;
  }

  get cierre(): CierreDelRadial | null {
    return this.comoCerro;
  }

  /** El radial que se encontró centrando la barra, si ya se encontró. */
  get radialEncontrado(): number | null {
    return this.alCentrar?.radial ?? null;
  }

  /** Si esta frecuencia es la de la estación del ejercicio. */
  esLaEstacion(mhz: number | null): boolean {
    return mhz !== null && emisorasEn("nav", mhz, [this.estacion.emisora]).length > 0;
  }

  /** Otra vez desde el principio, como en el simulador. */
  reiniciar(): void {
    this.faseActual = "sintonizar";
    this.segundos = 0;
    this.presentada = false;
    this.pedidaLaSintonia = false;
    this.estabaSintonizada = false;
    this.alCentrar = null;
    this.desdeElGiro = 0;
    this.ultimo = null;
    this.banderaEncima = false;
    this.comoCerro = null;
  }

  paso(l: LecturaDelRadial, dt: number): SucesoDelRadial[] {
    const sucesos: SucesoDelRadial[] = [];
    if (this.faseActual === "cerrada") return sucesos;
    this.segundos += dt;
    if (!this.presentada) {
      this.presentada = true;
      sucesos.push({ que: "presentar" });
    }
    if (l.percance || (l.enElSuelo && l.parado)) {
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
      if ((!this.pedidaLaSintonia && this.segundos >= PIDE_SINTONIZAR) || quitada) {
        this.pedidaLaSintonia = true;
        sucesos.push({ que: "sintonizar" });
      }
      if (this.faseActual === "identificar") this.faseActual = "sintonizar";
      return sucesos;
    }
    if (this.faseActual === "sintonizar") this.faseActual = "identificar";
    if (this.faseActual === "identificar") {
      if (!l.identificada) return sucesos;
      this.faseActual = "centrar";
      sucesos.push({ que: "identificada" });
    }

    const distancia = Math.hypot(this.estacion.x - l.x, this.estacion.z - l.z);
    /*
     * **Pasar por encima**, en cualquier fase: TO y FROM se dan la vuelta
     * cerca de la radio. Antes sale la bandera —el cono de encima, o la de
     * través si se pasa a un lado—, y se cuenta como parte del paso. Quien va
     * con FROM hacia la radio también pasa, y también se le dice: nadie
     * suspende.
     */
    if (l.bandera && distancia < ENCIMA && this.ultimo) this.banderaEncima = true;
    if (l.toFrom) {
      if (this.ultimo && l.toFrom !== this.ultimo && distancia < ENCIMA) {
        sucesos.push({ que: "pasada", de: this.ultimo, a: l.toFrom });
        this.cerrar("hecho", sucesos);
        return sucesos;
      }
      this.ultimo = l.toFrom;
      if (distancia >= ENCIMA) this.banderaEncima = false;
    }

    if (this.faseActual === "centrar") {
      if (l.toFrom === "FROM" && !l.bandera && l.desviacion !== null && Math.abs(l.desviacion) < CENTRADA) {
        this.alCentrar = { rumbo: l.rumbo, desviacion: l.desviacion, radial: l.curso };
        this.faseActual = "girar";
        sucesos.push({ que: "centrada", radial: l.curso });
      }
      return sucesos;
    }
    const c = this.alCentrar;
    if (this.faseActual === "girar" && c) {
      const giro = Math.abs(centrado(l.rumbo - c.rumbo));
      if (giro >= GIRADO) {
        const seMovio = l.desviacion === null ? Infinity : Math.abs(l.desviacion - c.desviacion);
        this.faseActual = "aLaRadio";
        this.desdeElGiro = 0;
        sucesos.push({ que: "giro", giro, seMovio });
      }
      return sucesos;
    }
    if (this.faseActual === "aLaRadio") {
      const antes = this.desdeElGiro;
      this.desdeElGiro += dt;
      if (antes < HACIA_LA_RADIO_TRAS && this.desdeElGiro >= HACIA_LA_RADIO_TRAS) sucesos.push({ que: "haciaLaRadio" });
    }
    return sucesos;
  }

  /** Si al pasar salió la bandera cerca de la radio: lo mira el banco. */
  get vioLaBandera(): boolean {
    return this.banderaEncima;
  }

  private cerrar(como: CierreDelRadial, sucesos: SucesoDelRadial[]): void {
    this.faseActual = "cerrada";
    this.comoCerro = como;
    sucesos.push({ que: "cerrar", como });
  }
}

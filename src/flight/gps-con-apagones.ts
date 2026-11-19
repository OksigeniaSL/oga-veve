/**
 * **El GPS con apagones**, y «Se apaga el GPS»: el último peldaño de la
 * navegación de #51 (ADR 0031, enmienda H26v).
 *
 * «GPS, el último y a propósito. Con apagones en misiones avanzadas, para que
 * la estima y el VOR sigan valiendo. La lección de fondo: el buen piloto
 * siempre tiene un plan B.» El GPS es lo más cómodo de la cabina y lo único
 * que depende de algo que no está en el avión: unas señales que llegan de
 * veinte mil kilómetros con la potencia de una bombilla. Cuando se va, lo que
 * deja de funcionar es lo que depende de él, y lo demás sigue: la radio —VOR,
 * ADF, ILS—, la brújula, el direccional y el reloj. Por eso el plan B se deja
 * puesto antes de salir, y no se busca cuando hace falta.
 *
 * ## Por qué se va, de verdad
 *
 * Tres causas, las tres de los manuales (ver `CausaDelApagon`):
 *
 * - **La integridad (RAIM)**: el receptor comprueba él mismo que los
 *   satélites no mienten, y para eso necesita al menos cinco a la vista, o
 *   cuatro y el altímetro. Con menos, sigue dando una posición pero ya no
 *   puede garantizarla, y la avisa: «Loss of Integrity Monitoring – GPS
 *   integrity is insufficient for the current phase of flight» (Garmin, G1000
 *   *Pilot's Guide*, tabla 2-3; AIM 1-1-17 de la FAA, *RAIM*).
 * - **La interferencia**, que se publica por NOTAM: los ensayos de
 *   interferencia del GPS de los militares, durante los cuales «the GPS
 *   signal is either on or off», y el control avisa de que el GPS puede no
 *   estar disponible hasta que acaba el ensayo (FAA, interpretación de los
 *   NOTAM de *GPS testing*; EASA, SIB 2022-02, por la que se ve hoy en el
 *   Báltico y el Mediterráneo oriental). Con la señal tapada el receptor no
 *   ve ningún satélite: no hay posición.
 * - **La antena**: un fallo del avión, sin aviso previo. Tampoco hay
 *   posición.
 *
 * **El ejercicio es el segundo**, y no por gusto: la primera regla de los
 * ejercicios es que nada falla por sorpresa en un vuelo tranquilo (cabecera
 * de `ejercicios.ts`), y la interferencia es la que se sabe antes de salir,
 * porque la publica un NOTAM. Es el mismo trato que la avería avisada.
 *
 * ## Cómo lo anuncia cada cabina
 *
 * - **Los de esferas** (la avioneta y el bimotor de pistón) llevan un GPS de
 *   panel, de la clase del GNS 430 de Garmin, cuyo mapa móvil es el plano: el
 *   avión dibujado encima de la carta sale de la posición del GPS. Sin
 *   posición, **el plano deja de saber dónde está el avión**: se queda donde
 *   lo supo por última vez, sin la flecha ni la estela, como `Mapa.ponerSinGps`
 *   ya hace en «Rumbo y reloj». La tarjeta de casa pierde su aguja y su
 *   distancia, que son el «directo a» del GPS. Lo que no se toca es la NAV:
 *   su CDI recibe el VOR por la antena de VHF, y es el plan B.
 * - **Los de cristal con un G1000** (los turbohélices): el ámbar «LOI» junto
 *   al avioncito del HSI y, sin posición, el modo «DR»: «System is using
 *   projected position rather than GPS position to compute navigation data»,
 *   con el CDI del GPS quitado de la pantalla (G1000, tabla 2-3).
 * - **Los de línea**: llevan plataforma inercial. Sin GPS el ordenador de
 *   vuelo sigue sabiendo dónde está con la inercial corregida por la radio
 *   (DME/DME) y lo dice en su pantalla —en el 737, «GPS-L INVALID» y «GPS-R
 *   INVALID» y, sin radio que lo corrija, «IRS NAV ONLY»—; el mapa sigue.
 *
 * Los dos últimos quedan escritos y no hechos: el ejercicio va en los de
 * esferas (ver la enmienda H26v, «Lo que queda»).
 *
 * ## El ejercicio
 *
 * 1. **Presentar**: se vuela hacia el VOR del campo con el GPS, y la
 *    instructora cuenta el NOTAM y el plan B, que ya está puesto: el VOR de
 *    casa en la NAV.
 * 2. **Se va el GPS** a mitad de camino: el plano se queda sin el avión, y
 *    ella lo cuenta con calma. No es una emergencia: el avión vuela igual.
 * 3. **El plan B**: girar el OBS hasta que la barra quede al medio con TO, y
 *    seguirla. Si alguien quitó el VOR de la NAV, se pide ponerlo otra vez.
 * 4. **Pasar por encima de la radio**: TO y FROM se dan la vuelta. Se llegó
 *    con la radio, el GPS vuelve —se acabó el ensayo del NOTAM— y el plano
 *    sabe otra vez dónde está.
 *
 * Nadie suspende: con la barra centrada o sin centrar, se llega igual y se
 * dice igual. Lo de la radio lo lee el ejercicio como quien vuela, por lo que
 * marca el instrumento (`leerNav`); el sitio de verdad del avión no se toca
 * nunca —lo leen los bancos y los demás ejercicios—: solo dejan de saberlo
 * las pantallas que dependen del GPS.
 *
 * Sin three.js, sin audio y sin DOM: lo prueba un piloto de cinemática con la
 * radio de verdad (`gps-con-apagones.test.ts`).
 */

import type { Ejercicio } from "./ejercicios";
import { radialDeCostadoAlViento, comoEnElObs } from "./en-que-radial-estoy";
import { rumboEnElMundo, type PuntoDelMundo } from "./seguir-la-aguja";

/** Una milla náutica, m. */
const MILLA = 1852;

// ── Lo que falla ─────────────────────────────────────────────────────────

/**
 * **Por qué se va el GPS**: la integridad que el receptor ya no puede
 * comprobar, la interferencia publicada por NOTAM o la antena. Ver la
 * cabecera.
 */
export type CausaDelApagon = "raim" | "interferencia" | "antena";

/**
 * **La del ejercicio**: la interferencia del NOTAM, la que se sabe antes de
 * salir. Con ella el receptor no ve ningún satélite y no queda posición; sin
 * integridad quedaría una que no se garantiza, y con la antena rota, ninguna.
 */
export const CAUSA_DEL_EJERCICIO: CausaDelApagon = "interferencia";

// ── Dónde empieza ────────────────────────────────────────────────────────

/** Lo que se tarda en llegar a la radio volando recto, s: siete minutos, la mitad con GPS. */
export const MINUTOS_HASTA_LA_RADIO = 7 * 60;
/** Lo más cerca y lo más lejos que se empieza, m: diez y veinte millas. */
export const LEJOS = { min: 10 * MILLA, max: 20 * MILLA } as const;
/** La altura sobre la pista, m: tres mil pies, como los del VOR. */
export const ALTURA_DEL_GPS = 3000 * 0.3048;
/** Lo que se deja por encima del suelo más alto del camino, m: mil pies. */
const POR_ENCIMA_DEL_CAMINO = 1000 * 0.3048;
/**
 * **Lo que el OBS lleva apartado del curso a la radio**, grados: veinte. Es
 * el plan B puesto a medias, como se deja en un vuelo con GPS: la estación
 * puesta e identificada, y el curso, el de la salida. Veinte toques lo traen.
 */
export const OBS_APARTADO = 20;

export interface ColocacionDelGps {
  readonly x: number;
  readonly z: number;
  /** Altura sobre la pista, m. */
  readonly alto: number;
  /** El morro, rad: derecho a la radio, que es el «directo a» del GPS. */
  readonly rumbo: number;
  /** El radial en que se empieza, magnético con el norte de la estación. */
  readonly radial: number;
  /** **El curso a la radio**, el que centra la barra con TO: el radial dado la vuelta. */
  readonly alaRadio: number;
  /** Lo que lleva el OBS al empezar, de 1 a 360. */
  readonly obs: number;
  /** De la salida a la radio, m. */
  readonly lejos: number;
}

/**
 * **Dónde empieza**: en un radial redondo de costado al viento, como «¿En qué
 * radial estoy?» —así la vuelta a la radio pide corregir el viento—, a siete
 * minutos de la radio y con el morro derecho a ella.
 *
 * `viento` es hacia dónde va el aire, m/s (`vientoComoVector`); `declinacion`,
 * la de la estación (`Emisora.declinacion`).
 */
export function colocacionDelGps(o: {
  readonly estacion: PuntoDelMundo;
  readonly declinacion: number;
  readonly viento: PuntoDelMundo;
  readonly velocidad: number;
  readonly suelo: (x: number, z: number) => number;
  readonly cotaDeLaPista: number;
}): ColocacionDelGps {
  const lejos = Math.min(LEJOS.max, Math.max(LEJOS.min, o.velocidad * MINUTOS_HASTA_LA_RADIO));
  const elegido = radialDeCostadoAlViento({ ...o, lejos });
  const x = o.estacion.x + elegido.d.x * lejos;
  const z = o.estacion.z + elegido.d.z * lejos;
  const alaRadio = comoEnElObs(elegido.radial + 180);
  return {
    x,
    z,
    alto: Math.max(ALTURA_DEL_GPS, elegido.alto + POR_ENCIMA_DEL_CAMINO - o.cotaDeLaPista),
    rumbo: rumboEnElMundo({ x, z }, o.estacion),
    radial: elegido.radial,
    alaRadio,
    obs: comoEnElObs(alaRadio - OBS_APARTADO),
    lejos,
  };
}

// ── El ejercicio ─────────────────────────────────────────────────────────

/** Lo que el ejercicio mira del vuelo en cada paso. */
export interface LecturaDelGps {
  /** El sitio de verdad: lo mide el ejercicio, no se enseña. */
  readonly x: number;
  readonly z: number;
  readonly enElSuelo: boolean;
  readonly parado: boolean;
  readonly percance: boolean;
  /** Si la NAV tiene puesta la frecuencia del VOR del ejercicio. */
  readonly sintonizada: boolean;
  /** Lo que marca la NAV con el curso del OBS: `leerNav`. */
  readonly desviacion: number | null;
  readonly toFrom: "TO" | "FROM" | null;
  readonly bandera: boolean;
}

export type CierreDelGps = "hecho" | "otraVez";

export type SucesoDelGps =
  /** El NOTAM y el plan B, puesto antes de que haga falta. */
  | { readonly que: "presentar" }
  /** Se fue el GPS: el plano ya no sabe dónde está el avión. */
  | { readonly que: "seFue" }
  /** El plan B: el OBS hasta la barra al medio con TO, y seguirla. */
  | { readonly que: "planB" }
  /** La NAV sin el VOR: ponerlo otra vez. */
  | { readonly que: "sintonizar" }
  /** La barra al medio con TO: derecho a la radio. */
  | { readonly que: "centrada" }
  /** Encima de la radio, TO y FROM al revés: se llegó con la radio, y el GPS vuelve. */
  | { readonly que: "pasada" }
  | { readonly que: "cerrar"; readonly como: CierreDelGps };

export type FaseDelGps = "conGps" | "sinGps" | "cerrada";

/**
 * **Cuándo se va el GPS**: a mitad del camino a la radio, medido con el sitio
 * de verdad; pero no antes de `ANTES_DEL_APAGON` segundos, que la
 * presentación se oiga entera, ni después de `TOPE_DEL_APAGON`, por si se
 * vuela hacia otro lado.
 */
export const A_MITAD = 0.5;
export const ANTES_DEL_APAGON = 30;
export const TOPE_DEL_APAGON = 240;
/** Lo que se deja entre «se fue» y pedir el plan B, s: que se vea el plano sin el avión. */
export const ANTES_DEL_PLAN_B = 6;
/** **Centrada**: la barra a menos de dos grados con TO y sin bandera, un punto de la escala de cinco. */
export const CENTRADA = 2;
/** Cerca de la radio, m: pasar por encima es que TO y FROM se den la vuelta aquí dentro. */
export const ENCIMA = 3 * MILLA;

export class SeApagaElGps {
  private faseActual: FaseDelGps = "conGps";
  private presentada = false;
  private comoCerro: CierreDelGps | null = null;
  private reloj = 0;
  private desdeQueSeFue = 0;
  private pedidoElPlanB = false;
  private dijoCentrada = false;
  private estabaSintonizada = true;
  private ultimo: "TO" | "FROM" | null = null;
  private lejosAlEmpezar: number | null = null;
  /** Dónde lo supo el plano por última vez: ahí se queda. */
  private ultimoSitio: PuntoDelMundo | null = null;
  private colocacionPuesta: ColocacionDelGps | null = null;

  constructor(
    readonly ejercicio: Ejercicio,
    /** El VOR del campo, donde está en el mundo. */
    readonly estacion: PuntoDelMundo & { readonly id: string },
  ) {}

  /** La colocación, que necesita el terreno y llega después. */
  colocar(c: ColocacionDelGps): void {
    this.colocacionPuesta = c;
  }

  get colocacion(): ColocacionDelGps | null {
    return this.colocacionPuesta;
  }

  get fase(): FaseDelGps {
    return this.faseActual;
  }

  get cierre(): CierreDelGps | null {
    return this.comoCerro;
  }

  /**
   * **Dónde se quedó el GPS**, mientras está apagado: el último sitio que
   * supo, que es donde se queda el plano. `null` con GPS.
   */
  get sinGps(): PuntoDelMundo | null {
    return this.faseActual === "sinGps" ? this.ultimoSitio : null;
  }

  reiniciar(): void {
    this.faseActual = "conGps";
    this.presentada = false;
    this.comoCerro = null;
    this.reloj = 0;
    this.desdeQueSeFue = 0;
    this.pedidoElPlanB = false;
    this.dijoCentrada = false;
    this.estabaSintonizada = true;
    this.ultimo = null;
    this.lejosAlEmpezar = null;
    this.ultimoSitio = null;
  }

  paso(l: LecturaDelGps, dt: number): SucesoDelGps[] {
    const sucesos: SucesoDelGps[] = [];
    if (this.faseActual === "cerrada") return sucesos;
    if (!this.presentada) {
      this.presentada = true;
      sucesos.push({ que: "presentar" });
    }
    if (l.percance || (l.enElSuelo && l.parado)) {
      this.cerrar("otraVez", sucesos);
      return sucesos;
    }
    this.reloj += dt;
    const lejos = Math.hypot(this.estacion.x - l.x, this.estacion.z - l.z);
    this.lejosAlEmpezar ??= lejos;

    if (this.faseActual === "conGps") {
      this.ultimoSitio = { x: l.x, z: l.z };
      const aMitad = lejos <= A_MITAD * this.lejosAlEmpezar;
      if ((aMitad && this.reloj >= ANTES_DEL_APAGON) || this.reloj >= TOPE_DEL_APAGON) {
        this.faseActual = "sinGps";
        this.desdeQueSeFue = 0;
        sucesos.push({ que: "seFue" });
      }
      // Con GPS también se pasa por encima: entonces se llega sin necesitar el plan B, y se dice igual.
    } else {
      this.desdeQueSeFue += dt;
      if (!this.pedidoElPlanB && this.desdeQueSeFue >= ANTES_DEL_PLAN_B) {
        this.pedidoElPlanB = true;
        sucesos.push({ que: "planB" });
      }
      /*
       * **Sin el VOR en la NAV**, una vez por cada vez que se quita: un aviso
       * vuelve cuando cambia algo que pasa, no cuando pasa un rato.
       */
      if (this.estabaSintonizada && !l.sintonizada && this.pedidoElPlanB) sucesos.push({ que: "sintonizar" });
      if (
        this.pedidoElPlanB &&
        !this.dijoCentrada &&
        l.sintonizada &&
        l.toFrom === "TO" &&
        !l.bandera &&
        l.desviacion !== null &&
        Math.abs(l.desviacion) < CENTRADA
      ) {
        this.dijoCentrada = true;
        sucesos.push({ que: "centrada" });
      }
    }
    this.estabaSintonizada = l.sintonizada;

    /*
     * **Pasar por encima**: TO y FROM se dan la vuelta cerca de la radio. Con
     * o sin la barra centrada, se llega igual: nadie suspende.
     */
    if (l.sintonizada && l.toFrom) {
      if (this.ultimo && l.toFrom !== this.ultimo && lejos < ENCIMA) {
        sucesos.push({ que: "pasada" });
        this.cerrar("hecho", sucesos);
        return sucesos;
      }
      this.ultimo = l.toFrom;
    }
    return sucesos;
  }

  private cerrar(como: CierreDelGps, sucesos: SucesoDelGps[]): void {
    this.faseActual = "cerrada";
    this.comoCerro = como;
    sucesos.push({ que: "cerrar", como });
  }
}

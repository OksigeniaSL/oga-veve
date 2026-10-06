/**
 * **Los tonos de la cabina de pasaje**: qué suena, cuándo y desde qué vista.
 *
 * El juego tocaba dos notas para el cartel del cinturón, y eso no es lo que
 * suena en ningún avión: el *ding-dong* de dos notas es otra cosa. La flota
 * JAZ sigue el esquema común de Boeing y de Airbus, que es el que se oye en
 * cualquier avión de línea:
 *
 * - **El cartel del cinturón, al encenderse o apagarse: una nota grave.**
 *   Boeing 737 NG, *Communications*: «low chimes operate when the no smoking
 *   or fasten seat belts signs come on»; los altavoces del pasaje dan el tono
 *   «whenever the NO SMOKING or FASTEN SEAT BELT signs illuminate or
 *   extinguish». Airbus A320 (FlyByWire, *Signs panel*): «a low tone chime is
 *   played in the passenger compartment», y desde la cabina de mando, con la
 *   puerta cerrada, apenas se oye.
 * - **Un pasajero que llama a la tripulación: una nota aguda**, con su luz
 *   encima del asiento. 737 NG: «high chimes operate when there is an
 *   attendant call signal from a passenger service unit».
 * - **Una llamada entre la cabina de mando y la tripulación, o entre
 *   tripulantes: aguda y grave.** 737 NG: «high/low chimes operate when there
 *   is an attendant call from the flight compartment or another attendant
 *   station».
 * - **La llamada de emergencia de la cabina de mando: aguda y grave, tres
 *   veces.** Es la del botón EMER de la familia de Airbus.
 *
 * Fuentes: B737 NG Communications
 * (slideshare.net/slideshow/b737-ng-communications/29381095) y FlyByWire
 * (docs.flybywiresim.com/pilots-corner/a32nx/a32nx-briefing/flight-deck/ovhd/signs/).
 *
 * ## Desde dónde se oye
 *
 * Suenan por los altavoces del techo del pasaje: ahí a tope. **En la cabina de
 * mando** se oyen el del cinturón y las llamadas de la tripulación —por la
 * puerta, más flojos—, y el de un pasajero no, que es una luz y un tono para
 * la tripulación de cabina. Desde fuera, el del cinturón y las llamadas
 * acompañan lo que ya está en pantalla —el cartel, la tira de la megafonía—, y
 * quitarlos sería quitar un canal sin ganar nada. Ver `fuerzaDelCinturon` en
 * `audio/ruidos.ts`.
 *
 * Sin audio ni three.js, para poder comprobarlo sin navegador.
 */

import type { Fase } from "../flight/vuelo";
import { fuerzaDelCinturon, type Oido } from "./ruidos";

/** Los cuatro tonos de la cabina. */
export type TonoDeCabina =
  | "cinturon"
  | "llamadaPasajero"
  | "llamadaTripulacion"
  | "llamadaEmergencia";

export const TONOS_DE_CABINA: readonly TonoDeCabina[] = [
  "cinturon",
  "llamadaPasajero",
  "llamadaTripulacion",
  "llamadaEmergencia",
];

/** La nota aguda y la grave de los tonos, Hz: do y sol, una cuarta abajo. */
export const AGUDA = 1046.5;
export const GRAVE = 783.99;

/** Si un motivo del idioma sonoro es un tono de la cabina de pasaje. */
export function esTonoDeCabina(motivo: string): motivo is TonoDeCabina {
  return (TONOS_DE_CABINA as readonly string[]).includes(motivo);
}

/**
 * **Lo que pega cada tono desde cada vista**, de 0 a 1; cero es que desde ahí
 * no suena. Ver la cabecera.
 */
export function fuerzaDelTono(tono: TonoDeCabina, oido: Oido): number {
  if (tono === "llamadaPasajero") return oido === "pasaje" ? 1 : 0;
  return fuerzaDelCinturon(oido);
}

/**
 * **Cómo llega la voz de la tripulación de cabina a cada vista**: cuánto pega,
 * de 0 a 1, y dónde corta los agudos, Hz.
 *
 * La tripulación habla desde el micrófono de la cabina de pasaje, y lo suyo
 * suena por los altavoces del techo: en el pasaje, a tope. **En la cabina de
 * mando, con la puerta cerrada, llega de lejos** —más flojo y sin agudos, que
 * es lo que una puerta le quita a una voz—, igual que los tonos de arriba.
 * Desde fuera, como hasta ahora: acompaña lo que ya está en pantalla, que es
 * la tira de la megafonía.
 *
 * La comandante no pasa por aquí: habla desde la cabina de mando, sentada al
 * lado, y desde ahí no está lejos de nadie.
 */
export function comoSeOyeLaTripulacion(oido: Oido): {
  readonly fuerza: number;
  readonly corte: number;
} {
  return oido === "cabina"
    ? { fuerza: TRAS_LA_PUERTA, corte: CORTE_DE_LA_PUERTA }
    : { fuerza: 1, corte: SIN_CORTE };
}

/**
 * **Si una voz suena por el altavoz del techo, y desde dónde habla**: `false`
 * es al lado o por radio; `true`, la megafonía dicha desde la cabina de mando
 * —la comandante—; `"desde-el-pasaje"`, la tripulación de cabina, con la
 * puerta delante según la vista.
 */
export type PorAltavoz = boolean | "desde-el-pasaje";

/** Lo que deja pasar la puerta de la cabina de mando de una voz del pasaje. */
export const TRAS_LA_PUERTA = 0.5;
/** Y por encima de qué se lleva los agudos, Hz. */
export const CORTE_DE_LA_PUERTA = 2000;
/** Un corte por encima de lo que se oye: abierto. */
export const SIN_CORTE = 20000;

/**
 * **Qué llamada va delante de un anuncio de la megafonía**, o `null` si
 * ninguna.
 *
 * Los que se le dicen a la tripulación —«Tripulación, …»— van detrás de la
 * llamada aguda y grave: es como se le avisa de que lo que viene es para
 * ella. Y el descenso de emergencia, detrás de la de emergencia. Lo que se le
 * dice al pasaje no lleva llamada: lo lleva el cartel. Se reconoce por la
 * clave, con sus formas y su habla detrás.
 *
 * **Menos el de después de aterrizar**, que es del pasaje y va detrás de la
 * aguda y grave. Ahí el cartel no cambia —sigue encendido hasta el puesto— y
 * no hay tono suyo que anuncie nada; y el sistema de cabina deja que cada
 * compañía ponga un tono delante de los anuncios al pasaje, que es lo que se
 * oye en muchos aviones antes de «señoras y señores, bienvenidos a…». La
 * flota JAZ lo pone en éste: llega con el avión rodando y con medio pasaje
 * pensando ya en levantarse, que es cuando más hace falta pedir atención.
 */
export function llamadaAntesDe(clave: string): TonoDeCabina | null {
  const base = clave.replace(/[@~].*$/, "");
  if (base === "comandante.descensoDeEmergencia") return "llamadaEmergencia";
  return A_LA_TRIPULACION.has(base) || AL_PASAJE_CON_LLAMADA.has(base)
    ? "llamadaTripulacion"
    : null;
}

/** Los anuncios al pasaje que llevan la llamada delante. Ver `llamadaAntesDe`. */
const AL_PASAJE_CON_LLAMADA: ReadonlySet<string> = new Set([
  "tripulacion.llegada",
  "tripulacion.canario.llegada",
]);

/** Los anuncios que se le dicen a la tripulación de cabina. */
const A_LA_TRIPULACION: ReadonlySet<string> = new Set([
  "comandante.crosscheck",
  "comandante.despegue",
  "comandante.aproximacion",
  "comandante.alturaSegura",
]);

/**
 * **Lo que va de la llamada a la voz**, s: lo que dura el tono y un respiro,
 * lo que tarda quien la oye en saber que lo que viene es para ella. Una voz
 * encima de su propio tono no se entiende como dos cosas.
 */
export const DE_LA_LLAMADA_A_LA_VOZ = 1.6;

/**
 * Y la de emergencia, más larga: son tres llamadas seguidas.
 */
export const DE_LA_EMERGENCIA_A_LA_VOZ = 3.2;

/** Lo que espera la voz detrás de cada llamada, s. */
export function esperaTrasLaLlamada(tono: TonoDeCabina): number {
  return tono === "llamadaEmergencia" ? DE_LA_EMERGENCIA_A_LA_VOZ : DE_LA_LLAMADA_A_LA_VOZ;
}

// ── Los pasajeros que llaman ──────────────────────────────────────────

/**
 * **Un pasajero que llama, alguna vez, durante el servicio.** Es lo que pasa
 * en cualquier vuelo con el carrito en el pasillo: alguien pide otra botella
 * de agua. Suena la nota aguda, se enciende la luz encima de su asiento y se
 * apaga cuando la tripulación llega a atenderle.
 *
 * Alguna vez y no siempre: una o ninguna por vuelo, en un momento al azar del
 * servicio. Siempre a la misma hora sería un reloj, y una cosa que pasa en
 * todos los vuelos igual deja de ser algo que pasa.
 */
export interface MomentoDelPasaje {
  readonly fase: Fase;
  /** Si el cartel del cinturón está apagado: la gente anda suelta. */
  readonly pasajeSuelto: boolean;
  /** Si ya se anunció el servicio en este vuelo. */
  readonly servicioDicho: boolean;
  /** Si ya se empezó a bajar al destino: el servicio se recoge. */
  readonly bajando: boolean;
  readonly dt: number;
}

/** Cuánto después del anuncio del servicio puede llamar alguien, s: de… */
export const LLAMA_DESDE = 25;
/** …a esto. */
export const LLAMA_HASTA = 110;
/** Cuántos vuelos de cada diez llama alguien. */
export const LLAMAN_DE_CADA_DIEZ = 7;
/**
 * Lo que tarda la tripulación en llegar a atender, s: lo que la luz se queda
 * encendida. Medio minuto con el carrito en el pasillo.
 */
export const HASTA_QUE_LLEGAN = 30;

export class LlamadasDelPasaje {
  /** Cuándo llama alguien en este vuelo, s desde el servicio, o `null`. */
  private cuando: number | null = null;
  private desdeElServicio = 0;
  private sorteado = false;
  private llamo = false;
  private luz = 0;

  constructor(private readonly azar: () => number = Math.random) {}

  /** Vuelo nuevo. */
  reiniciar(): void {
    this.cuando = null;
    this.desdeElServicio = 0;
    this.sorteado = false;
    this.llamo = false;
    this.luz = 0;
  }

  /** Si la luz de llamada está encendida ahora. */
  get luzEncendida(): boolean {
    return this.luz > 0;
  }

  /** Un paso. Devuelve `true` en el instante en que alguien llama. */
  paso(m: MomentoDelPasaje): boolean {
    this.luz = Math.max(0, this.luz - m.dt);
    // Con el cartel puesto o bajando, la gente está sentada y el carrito
    // recogido: si alguien tenía la luz puesta, la tripulación ya pasó.
    if (!m.pasajeSuelto || m.bajando || m.fase !== "en-vuelo") {
      if (m.bajando || m.fase !== "en-vuelo") this.luz = 0;
      return false;
    }
    if (!m.servicioDicho) return false;
    if (!this.sorteado) {
      this.sorteado = true;
      this.cuando =
        this.azar() * 10 < LLAMAN_DE_CADA_DIEZ
          ? LLAMA_DESDE + this.azar() * (LLAMA_HASTA - LLAMA_DESDE)
          : null;
    }
    this.desdeElServicio += m.dt;
    if (this.llamo || this.cuando === null || this.desdeElServicio < this.cuando) return false;
    this.llamo = true;
    this.luz = HASTA_QUE_LLEGAN;
    return true;
  }
}

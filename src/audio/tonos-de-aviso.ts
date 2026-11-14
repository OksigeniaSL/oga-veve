/**
 * **Los avisos de a bordo que no hablan**: cómo suena cada uno, en números.
 *
 * Un avión de transporte no lo dice todo con voz. El automático de un Boeing
 * se suelta con una sirena, la pérdida se anuncia con el sacudidor de palanca
 * —un motor con una masa descentrada que hace temblar los cuernos y traquetea
 * en toda la cabina— y una precaución, con un pitido. Aquí están las
 * formas de esos sonidos, sin Web Audio, para poder comprobarlas sin
 * navegador; los toca `audio.ts`.
 *
 * Se sintetizan como todo el sonido del juego que no es una voz —«ni una
 * muestra grabada», `CREDITOS.md`—, y por eso son **formas y no copias**: lo
 * que se tiene que reconocer el día que se oiga uno de verdad es la clase de
 * sonido —una sirena que arranca una y otra vez, un traqueteo, unos pitidos—, y eso es
 * lo que fijan las cifras. De dónde sale cada una, al lado. Qué avión lleva
 * cuál, en `AvisosDeABordo` de `flight/aircraft.ts`.
 */

/** Los tonos de una vez. Ver `TONO_DE_A_BORDO` en `audio/cabina.ts`. */
export type TonoDeABordo = "tono.sirenaDelAutomatico" | "tono.pitidoDePrecaucion";

/**
 * Un tono de una vez: notas que se suceden, cada una con su principio, su
 * duración y su frecuencia, y si la frecuencia se desliza hasta otra.
 */
export interface FormaDeTono {
  readonly notas: readonly {
    /** Desde el principio del tono, s. */
    readonly en: number;
    readonly dura: number;
    /** Hz al empezar la nota. */
    readonly desde: number;
    /** Y al acabar, si se desliza; si no, la misma. */
    readonly hasta: number;
  }[];
  /** La forma de onda del oscilador. */
  readonly onda: OscillatorType;
  /** Cuánto pega, de 0 a 1, antes del bus de avisos. */
  readonly fuerza: number;
}

/** Lo que dura un tono entero, s: hasta que acaba su última nota. */
export function duracionDe(f: FormaDeTono): number {
  return f.notas.reduce((fin, n) => Math.max(fin, n.en + n.dura), 0);
}

/**
 * **La sirena de desconexión del automático de Boeing**: ráfagas que suben de
 * tono, dos y media por segundo.
 *
 * Es la única de estas formas que está medida. R. D. Patterson analizó los
 * avisos de un simulador de 747 para la CAA británica (*Guidelines for
 * auditory warning systems on civil aircraft*, CAA Paper 82017, 1982, tabla
 * B1): «Disconnected autopilot | 747 | 2.5-Hz repetition rate. 260-ms bursts
 * separated by 140-ms gaps. | Broad line-spectrum with rising frequency. |
 * Siren being started repeatedly». Y en el texto: el espectro tiene muchos
 * armónicos y «they glide up in frequency throughout the burst of sound».
 * Así que aquí son ráfagas de 260 ms cada 400, de un diente de sierra —un
 * espectro de rayas ancho— que sube de tono en cada una. Las frecuencias no
 * están en el informe: se eligen en la banda en la que suena una sirena.
 *
 * Cinco ráfagas, dos segundos: en el 747-400 suena «for a minimum of one
 * second» y hasta que se vuelve a apretar el botón (FCOM D6-30151-400,
 * 4.10.17), que es lo que tarda quien vuela en callarla.
 */
const SIRENA: FormaDeTono = {
  onda: "sawtooth",
  fuerza: 0.16,
  notas: Array.from({ length: 5 }, (_, i) => ({ en: i * 0.4, dura: 0.26, desde: 450, hasta: 950 })),
};

/**
 * **El pitido de precaución de Boeing**: el *beeper* que acompaña a un mensaje
 * ámbar de EICAS, como AIRSPEED LOW. «Beeper | Master CAUTION lights | New
 * EICAS caution message» (FCOM del 747-400, 15.20.6, y el del 787, 15.20).
 * Cómo suena no está publicado: aquí es lo que dice su nombre, unos pitidos
 * cortos de la misma nota, que no se confunden con la sirena ni con una
 * campanada de la cabina de pasaje.
 */
const PITIDO: FormaDeTono = {
  onda: "square",
  fuerza: 0.1,
  notas: [0, 0.2, 0.4, 0.6].map((en) => ({ en, dura: 0.1, desde: 1100, hasta: 1100 })),
};

export const FORMAS: Readonly<Record<TonoDeABordo, FormaDeTono>> = {
  "tono.sirenaDelAutomatico": SIRENA,
  "tono.pitidoDePrecaucion": PITIDO,
};

/**
 * **El sacudidor de palanca**, que suena mientras dura la pérdida y no de una
 * vez.
 *
 * Es un motor pequeño con una masa descentrada atornillado a la columna: hace
 * temblar los cuernos y suena a traqueteo seco por toda la cabina —«Sound of
 * stick shaker», tres segundos y luego dos, en el registrador del 747-400 de
 * Japan Airlines 356 (JTSB, AA2006-1, apéndice 1)—. Sus cifras no están
 * publicadas como sonido; lo que lo hace reconocible es que no es un
 * tono sino un golpeteo grave y rápido. Por eso aquí es un diente de sierra
 * grave —la vuelta del motor— recortado y pasado por un filtro de banda, que
 * es lo que deja de él la chapa de la cabina.
 */
export const SACUDIDOR = {
  /** Las vueltas del motor, Hz: el golpeteo. */
  golpeteo: 24,
  /** Y lo que deja oír la cabina de él, Hz: un traqueteo, no un zumbido. */
  banda: 320,
  /** Cuánto pega a fondo, de 0 a 1. */
  fuerza: 0.22,
} as const;

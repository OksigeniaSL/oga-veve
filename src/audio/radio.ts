/**
 * El chasquido de la radio: lo que hace que una voz suene a radio.
 *
 * ## Por qué no es un filtro
 *
 * La forma de manual de hacer que algo suene a walkie es pasarlo por un filtro
 * de banda estrecha y distorsionarlo un poco. Aquí no se puede: **la voz del
 * navegador no pasa por Web Audio**. `speechSynthesis` habla directamente a la
 * tarjeta de sonido y no hay forma de capturarla para filtrarla — es la misma
 * limitación por la que la mezcla tiene que enterarse por eventos de que hay
 * alguien hablando, en vez de oírlo. Ver `audio/voz.ts`.
 *
 * Y resulta que el filtro tampoco es lo que de verdad identifica a una radio.
 * Lo que identifica a una radio es **el chasquido**: el «clac» del pulsador al
 * abrir y el «kshh» de la portadora al cerrar. Eso sí se puede sintetizar, sí
 * pasa por Web Audio, y es lo que un niño reconoce sin que nadie se lo
 * explique — es el sonido de los walkies de juguete, de las películas y del
 * micrófono del supermercado.
 *
 * Así que la radio de este juego son dos ruidos cortos alrededor de la frase.
 * Cuando existan las grabaciones —que sí pasan por el bus de voz, ver
 * `encadenarVoz`— se les podrá poner además el filtro de verdad, y el guion de
 * la torre ya está escrito contando con eso: «va con efecto de radio, y por
 * eso se graba **limpia**: el filtro se pone después». Ver `docs/voces/LEEME.md`.
 *
 * ## Por qué hace falta
 *
 * Porque la torre no hablaba. Era una lámpara verde o roja con una palabra
 * escrita debajo, y quien juega tiene cuatro años:
 *
 * > «Una lámpara con texto no lo lee un niño… un niño (ni yo) leemos esas
 * > etiquetitas de arriba ni por asomo.»
 *
 * Una orden de la torre que solo existe como texto en una esquina no existe.
 *
 * ## Cómo se conecta
 *
 * Igual que la mezcla: el juego enchufa aquí quien sabe hacer ruido, y si no
 * hay nadie enchufado —una prueba, un guion— esto no hace nada y se habla
 * igual. Nada de lo que hay aquí puede dejar a nadie sin volar.
 */

/** Qué momento de la transmisión es. */
export type Chasquido = "abre" | "cierra";

/** Quien sabe hacer el ruido. Lo enchufa el juego. Ver `Audio.chasquido`. */
export interface Emisora {
  chasquido(cual: Chasquido): void;
}

let emisora: Emisora | null = null;

export function conectarLaRadio(quien: Emisora | null): void {
  emisora = quien;
}

/**
 * Suena el pulsador.
 *
 * Falla en silencio a propósito: sin contexto de audio —el navegador no trae
 * Web Audio, o nadie ha tocado la pantalla todavía— la torre sigue hablando,
 * solo que sin el chasquido.
 */
export function chasquidoDeRadio(cual: Chasquido): void {
  try {
    emisora?.chasquido(cual);
  } catch {
    // Un ruido que no suena no puede romper una transmisión.
  }
}

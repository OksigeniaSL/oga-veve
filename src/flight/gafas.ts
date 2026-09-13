/**
 * Las gafas de sol.
 *
 * > «Quiero ser piloto **con las gafas de sol**.»
 *
 * Esa frase es de donde sale este proyecto, y hasta hoy era lo único de él que
 * no estaba dentro del juego. Es el issue número dos y lleva abierto desde el
 * principio, que ya dice bastante: lo primero que se pide y lo último que se
 * hace, porque no arregla nada y no lo pide ningún banco.
 *
 * ## Se ganan, no se compran ni se eligen
 *
 * Con **el primer aterrizaje que cuenta**: en la pista, suave o firme, que es
 * exactamente lo que el juego ya llama posarse bien —el galón de la toma—. No
 * hay una segunda regla que aprender.
 *
 * Y con el primero, no con el décimo. Quien tiene cuatro años tiene que poder
 * llevárselas el primer día; lo que cuesta no es el premio, es volver mañana.
 *
 * ## Y son una cosa que se pone y se quita
 *
 * No un icono en una pantalla de recompensas: un botón en el HUD, al lado del
 * de la cámara, que aparece **el día que se ganan** y ya no se va. Ponérselas y
 * quitárselas se nota en el acto y sin leer nada, que es la definición de que
 * el premio es de verdad.
 *
 * ## Lo que hacen
 *
 * Dos cosas, y las dos son las que hacen unas gafas de sol:
 *
 * - **Tiñen lo que se ve por la ventanilla**, de ámbar, que es el cristal de
 *   las gafas de aviador de toda la vida.
 * - **Quitan el deslumbre.** El halo del sol se cierra y se apaga —ver
 *   `world/sky.ts`—, que es justo la molestia contra la que uno se pone unas
 *   gafas. Volar de cara al sol de la tarde deja de costar.
 *
 * **Y no tocan el panel.** El tinte va por debajo del HUD, sobre el lienzo y
 * nada más, porque unas gafas se llevan mirando afuera y los instrumentos
 * están a la sombra. Que además es lo que impide que un premio estropee el
 * contraste de todo lo que hay que leer: `npm run acceso` mide ocho pantallas
 * y ninguna se entera de esto.
 */

import { leerProgreso, ponerProgreso } from "../datos/guardado";
import type { Aterrizaje } from "./aterrizaje";

/** Dónde viven, dentro del progreso del perfil. */
const GANADAS = "gafas.ganadas";
const PUESTAS = "gafas.puestas";

export interface Gafas {
  /** Si ya se han ganado. Una vez ganadas, para siempre. */
  readonly ganadas: boolean;
  /** Y si se llevan puestas ahora mismo. */
  readonly puestas: boolean;
}

export const SIN_GAFAS: Gafas = { ganadas: false, puestas: false };

/**
 * Lo guardado, o nada.
 *
 * `puestas` solo puede ser verdad si están ganadas: un guardado a medio
 * escribir, o traído de otro perfil, no puede dejar a alguien con el mundo
 * teñido y sin botón para quitárselo.
 */
export function leerGafas(): Gafas {
  const ganadas = leerProgreso(GANADAS) === true;
  return { ganadas, puestas: ganadas && leerProgreso(PUESTAS) === true };
}

/**
 * Ganarlas. Devuelve `true` **solo la primera vez**.
 *
 * Es lo que distingue el momento del estado, y hace falta: el momento se
 * celebra —suena, se dice, sale su dibujo— y el estado no se celebra nunca
 * más. Sin esto, cada aterrizaje bueno del resto de la vida sería una fiesta
 * por unas gafas que ya se tienen puestas.
 */
export function ganarGafas(): boolean {
  if (leerProgreso(GANADAS) === true) return false;
  ponerProgreso(GANADAS, true);
  /*
   * **Y se ponen solas al ganarlas.**
   *
   * Un premio que hay que ir a activar a un menú no es un premio. Se ganan y
   * el mundo cambia de color en ese momento, que es la parte que se recuerda;
   * quitárselas es un botón, y quien quiera quitárselas ya sabrá.
   */
  ponerProgreso(PUESTAS, true);
  return true;
}

export function ponerseLasGafas(puestas: boolean): void {
  ponerProgreso(PUESTAS, puestas);
}

/**
 * ¿Este aterrizaje las gana?
 *
 * La misma regla que el galón de la toma, a propósito: suave y firme valen las
 * dos —firme es como se posa un avión, no un fallo— y fuera de la pista o
 * llegando rápido, no. Tener dos definiciones de «aterrizar bien» sería tener
 * una equivocada.
 */
export function lasGana(toma: Aterrizaje): boolean {
  return toma === "suave" || toma === "firme";
}

/**
 * Cuánto deslumbra el sol con y sin ellas, de cero a uno.
 *
 * Multiplica la fuerza del halo del cielo. Un tercio es bastante: las gafas se
 * notan mirando al sol y no apagan la hora del día, que es la mitad de lo que
 * el cielo está contando.
 */
export const DESLUMBRE = { sin: 1, con: 0.33 } as const;

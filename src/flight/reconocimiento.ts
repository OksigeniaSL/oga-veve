/**
 * Lo que se dice al final de un vuelo, según los galones que se llevó.
 *
 * «Se echa en falta un reconocimiento en función de los galones logrados.» Y
 * es verdad: se ganan uno a uno durante el vuelo, con su sonido y su barra
 * apareciendo en la manga, y al apagar el motor no pasaba **nada**. El vuelo
 * terminaba como termina una pestaña que se cierra.
 *
 * ## La regla, que es toda la lógica que hay aquí
 *
 * **Ningún final es un reproche.** No hay «dos de seis», no hay huecos vacíos
 * y no hay una cara triste. Es la misma regla que ya gobierna los galones —lo
 * que no se ha ganado no se enseña apagado— llevada al final del vuelo, y aquí
 * importa más que en ningún otro sitio: el último cuadro de una partida es lo
 * que uno se lleva puesto hasta la siguiente.
 *
 * Así que hay cuatro finales y los cuatro están bien. Lo que cambia es
 * **cuánto** se celebra, no si se celebra.
 *
 * Y sin galones no se enseña la manga. Una manga sin barras sería exactamente
 * el hueco vacío que este juego no dibuja en ninguna parte; ahí lo que se
 * enseña es que el avión llegó, que ya es algo — y a los cuatro años, mucho.
 *
 * Esto no dibuja ni suena: dice qué toca decir. Quien lo use decide cómo.
 */

import type { Galon } from "./galones";

/** Los cuatro finales. Ninguno es malo. */
export type Reconocimiento = "llegaste" | "bien" | "muyBien" | "redondo";

export interface Final {
  readonly nivel: Reconocimiento;
  /** Cuántos galones se llevó, para dibujarlos. */
  readonly galones: number;
  /**
   * Si se enseña la manga.
   *
   * Sin barras, no: una manga vacía es el reproche que aquí no se dibuja.
   */
  readonly manga: boolean;
}

/** El final que merece un vuelo con estos galones. */
export function reconocer(galones: readonly Galon[]): Final {
  const n = galones.length;
  const nivel: Reconocimiento =
    n >= 5 ? "redondo" : n >= 3 ? "muyBien" : n >= 1 ? "bien" : "llegaste";
  return { nivel, galones: n, manga: n > 0 };
}

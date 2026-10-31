/**
 * **Las cuatro aves de los tramos**, el retrato con el que se elige cada uno.
 *
 * `flight/tiers.ts` lo pide desde el principio —nadie quiere elegir «el modo
 * de pequeños», todo el mundo elige el pajarito— y el hangar llevaba el panel
 * de instrumentos en su sitio porque los dos primeros intentos de dibujarlas
 * salieron huevos con pico y libélulas (#123). Éstas son del director de arte:
 * el chingolo, el tucán grande, el taguató común y la harpía, en un medallón
 * de papel de carta, cada una con sus colores de verdad y los ojos de su
 * tamaño. De dónde salen, en `CREDITOS.md`.
 *
 * **Van como imagen y no en línea**: pesan de 25 a 88 KB (de 4 a 16 KB con
 * gzip) y solo hacen falta en la pantalla de elegir tramo, así que entran por
 * URL con la huella en el nombre y se bajan al abrirla. No van en la precarga
 * del trabajador de servicio: sin red y sin copia, la ficha se queda con el
 * panel, los peldaños y el nombre, que ya dicen cuál es.
 */

import type { TierId } from "../flight/tiers";
import guyrami from "../assets/aves/guyrami.svg";
import tuka from "../assets/aves/tuka.svg";
import taguato from "../assets/aves/taguato.svg";
import ruvicha from "../assets/aves/taguato-ruvicha.svg";

export const AVES: Readonly<Record<TierId, string>> = {
  guyrami,
  tuka,
  taguato,
  "taguato-ruvicha": ruvicha,
};

/** El lado del dibujo, en su `viewBox`: los cuatro son de 120 × 120. */
export const LADO_DEL_AVE = 120;

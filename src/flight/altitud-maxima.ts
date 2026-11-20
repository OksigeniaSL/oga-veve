/**
 * **Hasta dónde está aprobado un avión**: su altitud máxima de operación.
 *
 * No es lo que sube su motor. El Seneca II, el Twin Otter y el 1900D tienen
 * escritos 25.000 ft, y el motor de los dos últimos daría para algo más: lo
 * que no da es el avión certificado. En el Seneca, el oxígeno de botella y la
 * estructura; en el 1900D, sus cinco psi de presurización, que a esa altura
 * ya llevan la cabina a nueve mil pies. Lo prohíbe su manual, en la sección
 * de limitaciones, y no hay más.
 *
 * ## Lo que hace el juego con ella, que es lo que hace el avión
 *
 * - **El plan no la elige nunca**: el crucero del plan sale de la altura de
 *   crucero de la ficha (`alturaDeCrucero`), y esa altura queda por debajo de
 *   ésta en todos. Lo comprueba `altitud-maxima.test.ts`.
 * - **La ventanilla del automático no pasa de ahí**: gira hasta la altura de
 *   crucero, que es más baja (`topeDeLaVentanilla`). El JAZ 40 no lleva
 *   ventanilla, y su automático sostiene la altura que llevaba.
 * - **Volando a mano, ninguna pared**: el modelo de vuelo no la conoce. Un
 *   avión de verdad tampoco tiene nada que le impida subir; lo que tiene es a
 *   quien lo vuela y, en el presurizado, la cabina que sube: por encima, la
 *   luz CABIN ALT al pasar la cabina de los diez mil pies
 *   (`cabina-presurizada.ts`). Ninguno lleva una caja que avise de haber
 *   pasado su altitud máxima, así que **lo cuenta la instructora**, en los
 *   tres peldaños de abajo, como toda explicación (`laInstructoraLoExplica`).
 *   En el de cabina se vuela como en el avión: con el altímetro.
 *
 * Los reactores siguen la misma regla: su altura de crucero va por debajo de
 * su techo, y por encima los avisa su cabina.
 *
 * Sin three.js ni DOM: se comprueba sin volar. ADR 0027, enmienda H37j.
 */

import type { AircraftConfig } from "./aircraft";

const PIE = 0.3048;

/**
 * **La altitud máxima de operación de cada tipo**, m de altitud de presión,
 * con su fuente. Sin cifra leída, no está: el 747-100 tiene la suya en la
 * ficha FAA A20WE, que no se ha leído, y el 172R y el Ag Cat solo tienen
 * techo de servicio, que es de lo que sube su motor y no de lo que se aprueba.
 */
export const ALTITUD_MAXIMA: Readonly<Record<string, number>> = Object.freeze({
  // «Flight above 25,000 feet is not approved» (Piper, manual del Seneca III,
  // PA-34-220T, § 2.27, el que se ha podido leer); la del Seneca II, la misma.
  "jaz-40": 25000 * PIE,
  // 25.000 ft, la altitud máxima de operación (EASA.IM.A.575, A.III.10).
  "jaz-50": 25000 * PIE,
  // «Maximum Operating Pressure-Altitude Limit for normal operation is
  // 25,000 ft» (CAA de Nueva Zelanda, TAR 98/07, sobre la sección 2 del manual).
  "jaz-60": 25000 * PIE,
  // 41.000 ft, la altitud máxima de la ficha EASA del E-170.
  "jaz-90": 41000 * PIE,
  // 43.100 ft, la de la hoja de tipo EASA IM.A.115 del 787-9.
  "jaz-110": 43100 * PIE,
});

/** La altitud máxima de operación de este avión, m, o `null` si no se sabe con fuente. */
export function altitudMaximaDe(a: Pick<AircraftConfig, "id">): number | null {
  return ALTITUD_MAXIMA[a.id] ?? null;
}

/**
 * **Lo que hay que bajar para que vuelva a contarse**, m: mil pies por debajo.
 *
 * Un aviso vuelve cuando cambia algo que pasa, no cuando pasa un rato: aquí,
 * cuando el avión ha vuelto de verdad por debajo de su altitud. Con mil pies
 * de hueco, quien vuela pegado a la raya no la oye cada vez que la aguja la
 * cruza.
 */
export const VUELVE_A_CONTARSE = 1000 * PIE;

/** **«Ya pasamos lo más alto de este avión»**, una vez por cada vez que se pasa. */
export class AvisoDeLaAltitudMaxima {
  private armado = true;

  /**
   * Si toca contarlo ahora: por encima de la máxima, en el aire y armado.
   * `altitud` es la de presión, m, y `maxima` la de `altitudMaximaDe`. Sigue
   * diciendo que sí hasta que se dice. Ver `dicho`.
   */
  toca(altitud: number, maxima: number | null, enTierra: boolean): boolean {
    if (maxima === null || enTierra) return false;
    if (altitud < maxima - VUELVE_A_CONTARSE) this.armado = true;
    return this.armado && altitud > maxima;
  }

  /** Contado: hasta que baje mil pies y vuelva a pasarla, no toca. */
  dicho(): void {
    this.armado = false;
  }

  /** Vuelo nuevo. */
  reiniciar(): void {
    this.armado = true;
  }
}

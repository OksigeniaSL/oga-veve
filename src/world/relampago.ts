/**
 * **La luz de un relámpago**: cuánto alumbra, y cuándo puede volver a
 * alumbrar.
 *
 * El rayo ya caía —`tocaRelampago` en `lluvia.ts`, con su trueno— y la luz
 * se le pedía al cielo por `ponerDeslumbre`, que es el halo del sol y se
 * recorta a uno: un rayo nunca pasaba de «lo normal», así que no alumbraba
 * nada. Y al apagarse dejaba el deslumbre en uno, que es quitarle a quien
 * lleva las gafas de sol lo que las gafas le quitan.
 *
 * Ahora tiene su propia luz, y la forma de esa luz es lo que se decide aquí:
 *
 * - **Deslumbra un instante.** Sube en un par de fotogramas y se apaga en
 *   menos de medio segundo, en curva: el suelo y las nubes encendiéndose y
 *   volviendo a su gris. Es lo que se ve de un rayo que cae a unos
 *   kilómetros.
 * - **Sin quemar la imagen.** Lo que pone el cielo con esto —ver
 *   `ponerRelampago` en `sky.ts`— es luz de relleno, la que llega de toda la
 *   nube, y no un velo blanco delante: el mundo se alumbra con sus colores y
 *   nada se vuelve blanco entero.
 * - **Y sin parpadeo.** Un rayo de verdad son varias descargas por el mismo
 *   canal en medio segundo, y ese titileo es justo lo que no puede ver quien
 *   es sensible a los destellos: aquí es **un solo pulso**, y entre uno y
 *   otro pasa al menos `ENTRE_RAYOS`. Las pautas de accesibilidad piden no
 *   pasar de tres destellos por segundo; esto no pasa de uno.
 * - **Y con el movimiento reducido**, ni pulso: un resplandor suave que sube
 *   y baja en más de un segundo y no llega a la tercera parte. El trueno
 *   sigue sonando con él: el rayo se entiende por los dos canales.
 */

/** Lo que dura la luz de un rayo, s. */
export const DURA = 0.45;

/** Lo que tarda en subir: un par de fotogramas, que si no es un salto. */
const SUBE = 0.035;

/** Con el movimiento reducido: lo que dura, lo que tarda en subir y su pico. */
export const DURA_SUAVE = 1.4;
const SUBE_SUAVE = 0.35;
export const PICO_SUAVE = 0.3;

/**
 * Lo que pasa como poco entre dos rayos que alumbran, s.
 *
 * `tocaRelampago` los saca al azar —de uno cada nueve segundos a uno cada
 * dos y medio— y el azar a veces los junta. Uno por segundo y pico es lo que
 * deja la luz apagarse del todo antes de la siguiente.
 */
export const ENTRE_RAYOS = 1.2;

const suave = (u: number): number => u * u * (3 - 2 * u);

/**
 * Cuánto alumbra un rayo a los `t` segundos de caer, de cero a uno.
 *
 * `reducido` es el movimiento reducido del sistema o de los ajustes del
 * juego: ver `conMovimientoReducido`.
 */
export function luzDelRelampago(t: number, reducido: boolean): number {
  if (!(t >= 0)) return 0;
  if (reducido) {
    if (t >= DURA_SUAVE) return 0;
    if (t < SUBE_SUAVE) return PICO_SUAVE * suave(t / SUBE_SUAVE);
    return PICO_SUAVE * (1 - suave((t - SUBE_SUAVE) / (DURA_SUAVE - SUBE_SUAVE)));
  }
  if (t >= DURA) return 0;
  if (t < SUBE) return t / SUBE;
  const u = (t - SUBE) / (DURA - SUBE);
  return (1 - u) * (1 - u);
}

/**
 * Los rayos de una tormenta, con su espera entre uno y otro.
 *
 * `cae` se llama cuando la lluvia dice que ha caído uno, y dice si ése
 * alumbra —y truena— o llega pegado al anterior y se queda en él. `paso`
 * dice cuánto alumbra ahora.
 */
export class Relampagos {
  /** Segundos desde el último que alumbró. */
  private desde = Number.POSITIVE_INFINITY;

  cae(): boolean {
    if (this.desde < ENTRE_RAYOS) return false;
    this.desde = 0;
    return true;
  }

  paso(dt: number, reducido: boolean): number {
    if (dt > 0) this.desde += dt;
    return luzDelRelampago(this.desde, reducido);
  }
}

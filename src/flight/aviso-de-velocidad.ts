/**
 * **«Andá más despacio»**, una vez por cada vez que se pasa.
 *
 * Se decía cada seis segundos mientras se rodara deprisa, por reloj —el mismo
 * `if (… < 6) return` que tenía «volvé a la raya verde»—, y la norma de la
 * casa es otra: un aviso se rearma cuando cambia algo que pasa. Ahora se dice
 * al pasar del límite de rodaje, y vuelve solo **después de haber bajado
 * claramente por debajo** —del setenta por ciento de la velocidad que toca, o
 * parado— y haberlo vuelto a pasar. Con esa banda muerta, una velocidad que
 * baila alrededor del límite no lo rearma: hay que frenar de verdad.
 *
 * Qué es ir deprisa lo dice el plan (`vaRapido` en `plan-de-vuelo.ts`); esto
 * solo dice cuándo se cuenta. Ver `Game` donde se avisa de `vista.rapido`, y
 * `aviso-de-la-raya.ts`, que es lo mismo con la raya.
 */

/** **Qué es bajar claramente**: por debajo del setenta por ciento de la velocidad que toca. */
export const POR_DEBAJO = 0.7;

/** Y parado siempre lo es, m/s, aunque el plan no sugiera ninguna velocidad. */
const PARADO = 0.5;

export class AvisoDeVelocidad {
  private armado = true;

  /**
   * **Si toca decirlo ahora**: deprisa y armado. Se pregunta en cada fotograma, que es lo
   * que lo rearma; `velocidad` es la del suelo y `sugerida` la que pide el plan, m/s.
   * Sigue diciendo que sí hasta que se dice, para que otro aviso del mismo fotograma no
   * se lo coma. Ver `dicho`.
   */
  toca(rapido: boolean, velocidad: number, sugerida: number): boolean {
    if (!this.armado && !rapido && (velocidad < POR_DEBAJO * sugerida || velocidad < PARADO)) this.armado = true;
    return rapido && this.armado;
  }

  /** Dicho: hasta que se baje claramente y se vuelva a pasar, no toca. */
  dicho(): void {
    this.armado = false;
  }

  /** Vuelo nuevo. */
  reiniciar(): void {
    this.armado = true;
  }
}

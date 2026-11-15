/**
 * **«Volvé a la raya verde»**, una vez por salida.
 *
 * Se decía cada seis segundos mientras el avión siguiera lejos de la raya
 * —un `if (… < 6) return` en `PlanDeVuelo.avisarDeSalida`—, y eso es justo lo
 * que la casa no hace: un aviso se rearma cuando cambia algo que pasa, nunca
 * por reloj. Quien se queda un minuto en la hierba oía la misma frase diez
 * veces sin que pasara nada nuevo, y a la tercera se aprende a no escuchar.
 *
 * Ahora se dice **al salirse**, y vuelve solo **después de haber vuelto a la
 * raya y haberse salido otra vez**. El rearme mira lo cerca que está el avión
 * de la raya, con holgura: salirse es pasar de `FUERA_DE_RUTA` —treinta
 * metros, ver `plan-de-vuelo.ts`—, y volver es estar a menos de `DE_VUELTA`.
 * Entre los dos hay veinte metros, así que quien rueda por el borde de los
 * treinta no lo rearma a cada fotograma: es una posición, que no tiembla.
 *
 * Lo que se dice lo decide quien llama; esto solo dice cuándo. Ver
 * `Game` donde se avisa de `vista.fuera`.
 */

/**
 * **A cuántos metros de la raya se da por vuelto a ella**, m: diez, la mitad
 * de una calle de rodaje con su margen. Más cerca que eso se va por la raya
 * aunque sea torcido.
 */
export const DE_VUELTA = 10;

export class AvisoDeLaRaya {
  private armado = true;

  /**
   * **Si toca decirlo ahora**: fuera de la raya y armado. Hay que preguntarlo
   * en cada fotograma, que es lo que rearma: `fuera` es lo que dice la vista
   * —ya mira la fase y lo lejos que se está— y `aLaRaya`, los metros a ella.
   * Sigue diciendo que sí hasta que se dice: lo que se ha tapado con otro
   * aviso en el mismo fotograma no se pierde. Ver `dicho`.
   */
  toca(fuera: boolean, aLaRaya: number): boolean {
    if (!this.armado && !fuera && aLaRaya < DE_VUELTA) this.armado = true;
    return fuera && this.armado;
  }

  /** Dicho: hasta que vuelva a la raya y se salga otra vez, no toca. */
  dicho(): void {
    this.armado = false;
  }

  /** Vuelo nuevo. */
  reiniciar(): void {
    this.armado = true;
  }
}

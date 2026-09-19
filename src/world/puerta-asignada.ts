/**
 * La puerta de una llegada: se asigna una vez y ya no cambia.
 *
 * A un avión que llega se le asigna una puerta, y esa es la suya hasta que
 * apague. Nadie se la cambia mientras rueda. Parece obvio dicho así, y sin
 * embargo aquí se la cambiaban **en cada fotograma**.
 *
 * ## De dónde sale esto
 *
 * `puestoDeLlegada` elige «el más cercano rodando **desde donde estás**», que
 * es la regla buena. Pero se llamaba cada vez que había que retrazar la ruta, y
 * la ruta se retrazaba en todos los fotogramas del tramo de abandonar la pista.
 * Al avanzar el avión, el ganador cambiaba: la ruta saltaba de un puesto a
 * otro, la raya verde con ella, y el avión iba detrás.
 *
 * Contado jugando: «estoy paseando por el aeropuerto y ni coche, ni señor de
 * las balizas, ni rayas verdes». Medido en el barrido de vuelo entero: Tenerife
 * Sur, 1682 metros rodados para una ruta de 1098 —×1,53— y La Palma ×1,40,
 * cuando en seis campos distintos lo normal es ×0,9 a ×1,1.
 *
 * ## Por qué vive aquí y no dentro del plan de vuelo
 *
 * Porque **así se puede probar sin volar**. La primera comprobación que escribí
 * de esto fue una del banco, y con el arreglo deshecho a propósito el banco
 * pasó en verde una tirada y falló otra: la varianza de un vuelo entero se come
 * la prueba. Esta regla no necesita un aeropuerto para comprobarse —es «una vez
 * elegido, no se vuelve a elegir»— y comprobada aquí no depende de la suerte.
 *
 * ## Provisional y en firme
 *
 * Hay dos momentos, y los dos hacen falta:
 *
 * - **Provisional**, al saltar «aterrizado», que ocurre con el avión todavía en
 *   el aire —a doce metros del suelo y treinta y seis antes del umbral—. Se
 *   elige con lo que se sabe, que es poco, y sirve para que haya raya que
 *   seguir desde el instante en que se toca: «al aterrizar no tuve línea de
 *   regreso al hangar».
 * - **En firme**, al dejar la pista, que es cuando se sabe de verdad por dónde
 *   se ha salido. Ésta sustituye a la provisional **una vez**, y a partir de
 *   ahí no se toca.
 */

export class PuertaAsignada<T> {
  private puerta: T | null = null;
  private firme = false;

  /**
   * La puerta de esta llegada, eligiéndola si todavía no hay ninguna en firme.
   *
   * `elegir` solo se llama cuando hace falta — es una tanda de búsquedas de
   * camino sobre el grafo del aeropuerto, y llamarla en todos los fotogramas
   * costaba fotogramas además de marear al avión.
   */
  pedir(enFirme: boolean, elegir: () => T | null): T | null {
    if (this.firme && this.puerta !== null) return this.puerta;
    const elegida = elegir();
    if (elegida !== null) {
      this.puerta = elegida;
      this.firme = enFirme;
    }
    return elegida;
  }

  /** Al irse al aire no hay puerta: la siguiente llegada se asigna sola. */
  olvidar(): void {
    this.puerta = null;
    this.firme = false;
  }

  /**
   * La puerta en firme, o `null` si todavía es la provisional.
   *
   * Es lo que mira el banco: lo que no puede cambiar es ésta. Que la
   * provisional se sustituya una vez es a propósito.
   */
  get enFirme(): T | null {
    return this.firme ? this.puerta : null;
  }
}

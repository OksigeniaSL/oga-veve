/**
 * **Lo que dice la fase después de irse al aire** (H26j, ADR 0030).
 *
 * Volando «Aterrizar con las agujas», tras la frustrada se oyó «andá a la
 * pista» (`vuelo.enVueloAterrizando`) y, detrás, «bajá suavecito»
 * (`vuelo.final`), con el avión subiendo por encima de la pista. Las dos
 * venían de la fase del plan, que sale de la final por arriba al subir veinte
 * metros —ver `SUBIDA_QUE_SACA_DE_FINAL` en `flight/vuelo.ts`— y vuelve a
 * entrar en cuanto el avión baja un poco antes del centro de la pista: en la
 * subida de una frustrada, nivelando para coger velocidad, eso pasa.
 *
 * Ninguna de las dos decía nada nuevo:
 *
 * - **Salir de la final subiendo es la frustrada**, y la frustrada ya tiene su
 *   voz y su tarjeta (`vuelo.frustrada`, con el sonido del logro): un suceso,
 *   una voz. La tarjeta de la fase sale igual, que no habla; la voz no.
 * - **Y la final no se vuelve a contar hasta que haya otra final**: la que ve
 *   la torre (`flight/final-de-la-torre.ts`), que se pierde al irse y se
 *   vuelve a coger viniendo otra vez hacia la pista por su lado de
 *   aproximación. Un parpadeo de la fase del plan subiendo sobre la pista no
 *   es otra aproximación, y un aviso no vuelve por el reloj, sino cuando
 *   cambia algo que pasa.
 *
 * En tierra se olvida todo: el vuelo siguiente empieza de cero.
 *
 * Sin three.js, sin audio y sin DOM.
 */

/** Lo que se hace con el anuncio de una fase. */
export type AnuncioTrasIrse =
  /** Como siempre: su tarjeta, su voz y su rótulo. */
  | "entero"
  /** Su tarjeta, sin voz ni rótulo: lo dice otro. */
  | "solo la tarjeta"
  /** Nada: se apunta la fase y no se anuncia. */
  | "nada";

/** Subiendo de verdad, m/s: un bache no es irse. El de `flight/final-de-la-torre.ts`. */
export const SUBIENDO = 1;

export class LaFinalTrasIrse {
  /** Desde que se salió de la final subiendo, hasta que se coge otra. */
  private porCoger = false;
  /** Y si desde entonces se ha estado fuera de la final de la torre. */
  private fueraDeLaDeLaTorre = false;
  /** Si en esta vuelta ya salió la tarjeta de «en vuelo». */
  private tarjetaPuesta = false;

  /** Si ahora se está entre irse y la final siguiente. Lo mira el banco. */
  get yendose(): boolean {
    return this.porCoger;
  }

  /**
   * **Cada paso**, con lo que dice la torre: la final siguiente empieza al
   * volver a entrar en la suya después de haber salido. En tierra, de cero.
   */
  mirar(enLaFinalDeLaTorre: boolean, enElAire: boolean): void {
    if (!enElAire) {
      this.porCoger = false;
      this.fueraDeLaDeLaTorre = false;
      this.tarjetaPuesta = false;
      return;
    }
    if (!this.porCoger) return;
    if (!enLaFinalDeLaTorre) this.fueraDeLaDeLaTorre = true;
    else if (this.fueraDeLaDeLaTorre) {
      this.porCoger = false;
      this.fueraDeLaDeLaTorre = false;
      this.tarjetaPuesta = false;
    }
  }

  /**
   * **Al cambiar la fase anunciada**, qué se anuncia de la nueva. `vertical`,
   * m/s, positiva subiendo.
   */
  alCambiar(antes: string, ahora: string, enElAire: boolean, vertical: number): AnuncioTrasIrse {
    if (!enElAire) return "entero";
    if (antes === "final" && ahora === "en-vuelo" && vertical > SUBIENDO && !this.porCoger) {
      this.porCoger = true;
      this.fueraDeLaDeLaTorre = false;
      this.tarjetaPuesta = true;
      return "solo la tarjeta";
    }
    if (!this.porCoger) return "entero";
    if (ahora === "en-vuelo" && !this.tarjetaPuesta) {
      this.tarjetaPuesta = true;
      return "solo la tarjeta";
    }
    return "nada";
  }
}

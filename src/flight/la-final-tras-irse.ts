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
 *   Subiendo quiere decir lo subido desde lo más bajo de esa final, no el
 *   variómetro de ese instante: quien se va con una avioneta sube a tirones,
 *   nivelando cada vez que la velocidad se le cae, y en el banco salía de la
 *   final justo en uno de esos tirones.
 * - **Y la final no se vuelve a contar hasta que haya otra final**: la que ve
 *   la torre (`flight/final-de-la-torre.ts`), cogida otra vez **por delante
 *   del umbral**, viniendo hacia la pista por su lado de aproximación, después
 *   de haber estado fuera de ese lado. La de la torre sola no basta: cuenta
 *   siempre la fase «final» del plan, y el parpadeo de esa fase subiendo
 *   encima de la pista la encendía, que es justo lo que no es otra
 *   aproximación. Un aviso vuelve cuando cambia algo que pasa, no por el
 *   reloj.
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

/**
 * **Lo que hay que haber subido desde lo más bajo de la final para que salir
 * de ella sea irse al aire**, m: quince, los de irse con el gas de despegue
 * en `flight/final-de-la-torre.ts` (`SUBIDA_CON_GAS`). La fase del plan sale
 * por arriba a los veinte; quien pasa la pista de largo sin subir, con nada.
 */
export const SUBIDA_DE_IRSE = 15;

/** Lo que el juego le dice en cada paso. */
export interface LoQueSeVeTrasIrse {
  readonly enElAire: boolean;
  /** Si la torre te ve en final. */
  readonly enLaFinalDeLaTorre: boolean;
  /**
   * Si se está **por delante del umbral**, dentro del cono de la aproximación
   * de esa pista (`alUmbralEnLaAproximacion` no es `null`).
   */
  readonly delanteDelUmbral: boolean;
  /** Si la fase anunciada ahora es la final del plan. */
  readonly enLaFinal: boolean;
  /** Altura sobre la pista, m. */
  readonly altura: number;
}

export class LaFinalTrasIrse {
  /** Desde que se salió de la final subiendo, hasta que se coge otra. */
  private porCoger = false;
  /** Y si desde entonces se ha estado fuera del lado de la aproximación. */
  private haSalido = false;
  /** Si en esta vuelta ya salió la tarjeta de «en vuelo». */
  private tarjetaPuesta = false;
  /** Lo más bajo de la final anunciada, m sobre la pista. */
  private masBajo = Infinity;
  /** La altura del último paso, m. */
  private altura = 0;

  /** Si ahora se está entre irse y la final siguiente. Lo mira el banco. */
  get yendose(): boolean {
    return this.porCoger;
  }

  /**
   * **Cada paso**, antes de anunciar nada: lo más bajo de la final, y la
   * final siguiente, que empieza al volver a la de la torre por delante del
   * umbral después de haber salido de ese lado. En tierra, de cero.
   */
  mirar(v: LoQueSeVeTrasIrse): void {
    this.altura = v.altura;
    if (!v.enElAire) {
      this.porCoger = false;
      this.haSalido = false;
      this.tarjetaPuesta = false;
      this.masBajo = Infinity;
      return;
    }
    if (v.enLaFinal) this.masBajo = Math.min(this.masBajo, v.altura);
    if (!this.porCoger) return;
    if (!v.delanteDelUmbral) this.haSalido = true;
    else if (this.haSalido && v.enLaFinalDeLaTorre) {
      this.porCoger = false;
      this.haSalido = false;
      this.tarjetaPuesta = false;
    }
  }

  /** **Al cambiar la fase anunciada**, qué se anuncia de la nueva. */
  alCambiar(antes: string, ahora: string, enElAire: boolean): AnuncioTrasIrse {
    if (!enElAire) return "entero";
    const subido = this.altura - this.masBajo;
    if (antes === "final") this.masBajo = Infinity;
    if (antes === "final" && ahora === "en-vuelo" && subido >= SUBIDA_DE_IRSE && !this.porCoger) {
      this.porCoger = true;
      this.haSalido = false;
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

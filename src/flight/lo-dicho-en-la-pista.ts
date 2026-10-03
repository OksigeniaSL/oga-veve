/**
 * **Lo que se dice en la pista después de tocar, y cuántas veces.**
 *
 * «"Salí de la pista, que viene otro", una y otra vez. Está bien que lo diga,
 * pero no necesito que me lo repita: es una pesada.» Contado aterrizando en
 * Tenerife Sur con el JAZ 120.
 *
 * ## Por qué se repetía
 *
 * Porque la voz colgaba de **entrar** en la fase, y en la pista se entra más
 * de una vez: quien frena hasta paso de calle está «abandonando»; si acelera
 * para llegar a su salida —que es lo que se hace, y lo que el juego pedía
 * mal— vuelve a la carrera, «frená»; frena otra vez, «salí de la pista». Cada
 * vuelta, las dos frases. Nada nuevo había pasado entre una y otra: la misma
 * pista, la misma salida, el mismo avión detrás.
 *
 * ## Lo que lo rearma
 *
 * **Una toma nueva.** Lo que cuenta cada frase —frená, dejá la pista— es
 * verdad desde que las ruedas tocan hasta que se deja la pista, y se dice una
 * vez. La tarjeta, en cambio, se queda o vuelve cada vez que hace falta: es lo
 * que se mira, y mirarla no cansa. Un aviso vuelve cuando cambia algo que
 * pasa, no cuando la fase tiembla.
 *
 * ## Y si de verdad hace falta insistir
 *
 * No insiste la instructora: insiste **la torre**, una vez y con prisa, que es
 * lo que se oye en una frecuencia de verdad —«expedite vacating»— cuando el
 * avión se queda parado en la pista con otro detrás. Pararse ahí es lo que ha
 * pasado de nuevo, y por eso se dice.
 *
 * Función pura: `Game` le dice qué toca y qué se dijo, y pone la voz.
 */

/** Lo ya dicho en esta toma. */
export interface LoDichoEnLaPista {
  /** «Frená»: en la carrera, o al volver a ella. */
  readonly frena: boolean;
  /** «Salí de la pista, que viene otro», con sus variantes sin torre. */
  readonly salir: boolean;
  /** Y la torre, con prisa, a quien se queda parado en la pista. */
  readonly prisa: boolean;
}

/** Una toma nueva: nada dicho todavía. */
export const NADA_DICHO_EN_LA_PISTA: LoDichoEnLaPista = {
  frena: false,
  salir: false,
  prisa: false,
};

export type QueSeDice = "frena" | "salir";

/**
 * Si la frase se dice ahora, y lo dicho después. La segunda vez en la misma
 * toma, no: la tarjeta basta.
 */
export function seDiceEnLaPista(
  dicho: LoDichoEnLaPista,
  que: QueSeDice,
): { readonly dice: boolean; readonly dicho: LoDichoEnLaPista } {
  if (dicho[que]) return { dice: false, dicho };
  return { dice: true, dicho: { ...dicho, [que]: true } };
}

/** Lo que mira la torre para meter prisa. */
export interface ParadoEnLaPista {
  /** La fase es la de dejar la pista. */
  readonly abandonando: boolean;
  /** Y sigue con las ruedas sobre ella. */
  readonly enLaPista: boolean;
  /** Parado: por debajo de esto, m/s. Ver `PARADO` en `vuelo.ts`. */
  readonly porElSuelo: number;
  readonly parado: number;
  /** Hay una torre que manda en este campo: ni un AFIS ni la pista de casa. */
  readonly hayTorre: boolean;
}

/**
 * **Si la torre mete prisa ahora**: ya se dijo que había que dejar la pista,
 * el avión se ha parado encima de ella y la torre no lo ha dicho todavía en
 * esta toma. Una vez: si se vuelve a parar, ya lo sabe.
 */
export function laTorreMetePrisa(
  dicho: LoDichoEnLaPista,
  s: ParadoEnLaPista,
): boolean {
  return (
    s.hayTorre &&
    dicho.salir &&
    !dicho.prisa &&
    s.abandonando &&
    s.enLaPista &&
    s.porElSuelo < s.parado
  );
}

/**
 * **Cuánto por encima de lo que toca hay que ir para que se pida frenar**, y
 * cuánto para dejar de pedirlo, m/s: cinco nudos y dos. Con la misma cifra en
 * los dos sentidos la tarjeta parpadea en el filo; con dos, se pone y se
 * quita una vez.
 */
export const PIDE_FRENAR = 2.5;
export const DEJA_DE_PEDIR = 1;

/** Lo que mira «frená» en la pista. */
export interface FrenandoEnLaPista {
  /** La fase, de la máquina de fases. */
  readonly fase: string;
  /** Las ruedas, sobre la pista. */
  readonly enLaPista: boolean;
  /** Lo que se avanza por el suelo, m/s. */
  readonly porElSuelo: number;
  /**
   * Lo que toca aquí, m/s: lo que pide el plan en este punto de la ruta de
   * vuelta, que por la pista es frenar para llegar a la boca de la salida a
   * la velocidad de esa salida. Ver `calcularVelocidades` en el plan.
   */
  readonly toca: number;
  /** Si ya se estaba pidiendo, para la banda muerta. */
  readonly yaSePedia: boolean;
}

/**
 * **Si hay que pedir frenar en la pista**, después de tocar.
 *
 * «En la pista se frena hasta la velocidad de la salida que se va a tomar, no
 * hasta paso de hombre.» Aquí se pedía frenar hasta doce metros por segundo en
 * la carrera y hasta dieciséis después, fuera cual fuera la salida: por una
 * rápida, que se toma a cincuenta nudos, quien frenaba lo que se pedía
 * llegaba a ella a paso de calle; y con una en ángulo delante, nadie avisaba
 * de que a treinta nudos no se gira. Ahora se pide frenar mientras se vaya
 * más deprisa de lo que toca aquí: lo que deja llegar a la boca a la
 * velocidad de esa salida, frenando como se frena.
 */
export function hayQueFrenarEnLaPista(s: FrenandoEnLaPista): boolean {
  if (s.fase !== "aterrizado" && s.fase !== "abandonando") return false;
  if (!s.enLaPista) return false;
  const margen = s.yaSePedia ? DEJA_DE_PEDIR : PIDE_FRENAR;
  return s.porElSuelo > s.toca + margen;
}

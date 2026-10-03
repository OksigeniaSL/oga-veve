/**
 * La altura de decisión, y la regla que se aplica al llegar a ella.
 *
 * «Lo importante es la decisión, no la maniobra: **hay un punto en el que hay
 * que decidir**, y pasado ese punto ya no se decide.» Eso es lo que en una
 * cabina se canta como *minimums*, y es la mitad de la lección de la
 * frustrada — la otra mitad, saber irse al aire, el juego ya la reconoce y la
 * premia desde `flight/frustrada.ts`.
 *
 * ## Por qué una altura y no un criterio continuo
 *
 * Porque la lección es que **hay un momento**. Un aviso que va apareciendo y
 * desapareciendo según cómo vaya la aproximación enseña a negociar; una altura
 * fija enseña lo que enseña la aviación de verdad: se baja hasta ahí, se mira,
 * y se decide una vez. A los cuatro años eso es «cuando suene, mirá si ves la
 * pista»; a los cuarenta es una carta de aproximación.
 *
 * ## Y por qué se mira lo que se mira
 *
 * Una aproximación estabilizada es un puñado de condiciones simultáneas, y las
 * de verdad son las de aquí: velocidad, senda, alineación y motor. La regla
 * real —la que usan las compañías— es del tipo «si a esta altura no estás como
 * debes, no sigas»: no se corrige, se va uno y se vuelve a empezar. Eso es lo
 * que hace que sea una regla y no un consejo.
 *
 * Esto no dibuja, no suena y no puntúa: dice qué pasa a los mínimos y por qué.
 * Quien lo use decide cómo se cuenta.
 */

/**
 * A qué altura sobre la pista se decide, en metros.
 *
 * Sesenta metros son doscientos pies, que es la altura de decisión de una
 * aproximación de precisión de verdad y el número que aparece en todas las
 * cartas. No es una cifra bonita: es **la** cifra.
 */
export const ALTURA_DE_DECISION = 60;

/**
 * Y la ventana en la que se canta, en metros.
 *
 * Se canta al cruzar hacia abajo, no mientras se está por debajo. Sin ventana,
 * un avión que baila alrededor de los sesenta metros cantaría mínimos cinco
 * veces y la palabra dejaría de significar un momento.
 */
export const VENTANA = 12;

/** Qué se mira para decir que una aproximación está estabilizada. */
export interface Aproximacion {
  /** Velocidad respecto al aire, m/s. */
  readonly velocidad: number;
  /** La de referencia de esta aeronave, m/s. */
  readonly referencia: number;
  /** Velocidad vertical, m/s. Negativa bajando. */
  readonly vertical: number;
  /** Cuánto se aparta del eje de la pista, m. */
  readonly delEje: number;
  /** Y cuántos grados torcido respecto al rumbo de la pista. */
  readonly torcido: number;
}

/** Por qué no se puede seguir, o `null` si se puede. */
export type Motivo =
  /** Ni siquiera se ve la pista: se llegó a mínimos dentro de la nube. */
  "sinPista" | "rapido" | "lento" | "cayendo" | "torcido" | "descolocado";

/**
 * ¿Se ve la pista desde la altura de decisión?
 *
 * `techoM` es la base de las nubes **sobre el aeródromo**, que es como se mide
 * en un parte meteorológico de verdad y como ya venía del METAR. Si esa base
 * está por debajo de la altura de decisión, al llegar ahí todavía se está
 * dentro de la nube: no hay pista que ver, y entonces no hay nada que decidir
 * — se sube y se acabó. Eso es literalmente para lo que existe una altura de
 * decisión, y es la razón de que un aeropuerto pueda estar «por debajo de
 * mínimos» y cerrado con el cielo perfectamente azul mil metros más arriba.
 *
 * Tenerife Norte es el ejemplo de manual: está a 632 metros, que es justo
 * donde se asienta el mar de nubes del alisio. El aeropuerto **está a la
 * altura de las nubes**, no debajo.
 */
export function seVeLaPista(techoM: number | null): boolean {
  return techoM === null || techoM > ALTURA_DE_DECISION;
}

/**
 * Los márgenes, y de dónde salen.
 *
 * Los de una compañía son más estrechos —del +10 al −5 % de la velocidad de
 * referencia, mil pies por minuto de caída—, y aquí serían un examen. Estos
 * son los que dejan pasar una aproximación hecha con cuidado por alguien de
 * cinco años y paran la que se está yendo de las manos: es el mismo criterio
 * con el que se pusieron los listones de los galones.
 */
export const MARGENES = {
  /** Cuánto por encima de la de referencia se tolera. */
  rapido: 1.35,
  /** Y cuánto por debajo: pasarse de lento es peor que pasarse de rápido. */
  lento: 0.82,
  /** Lo más que se puede estar cayendo a esa altura, m/s. */
  cayendo: -6,
  /** Lo que se puede estar apartado del eje, m. */
  delEje: 60,
  /** Y lo torcido que se puede ir, en grados. */
  torcido: 20,
} as const;

/**
 * ¿Se puede seguir bajando?
 *
 * Devuelve el primer motivo por el que no, o `null` si sí. **El orden importa**
 * y no es alfabético: es el orden en que un instructor lo diría, de lo que más
 * mata a lo que menos. Ir lento en aproximación es lo que pone un avión en
 * pérdida a cien metros del suelo, y por eso va antes que ir rápido.
 */
export function porQueNoSeSigue(
  a: Aproximacion,
  techoM: number | null = null,
): Motivo | null {
  // Lo primero de todo: si no se ve la pista, lo demás da igual. Se puede
  // llegar perfectamente estabilizado a una nube, y sigue sin haber pista.
  if (!seVeLaPista(techoM)) return "sinPista";
  if (a.velocidad < a.referencia * MARGENES.lento) return "lento";
  if (a.vertical < MARGENES.cayendo) return "cayendo";
  if (a.velocidad > a.referencia * MARGENES.rapido) return "rapido";
  if (Math.abs(a.torcido) > MARGENES.torcido) return "torcido";
  if (Math.abs(a.delEje) > MARGENES.delEje) return "descolocado";
  return null;
}

/** ¿Está estabilizada? Lo mismo del revés, para leerlo bien donde toque. */
export const estabilizada = (a: Aproximacion): boolean =>
  porQueNoSeSigue(a) === null;

/**
 * El cantor de mínimos: dice una vez cuándo se cruza la altura de decisión.
 *
 * Lleva la cuenta él porque el momento es un cruce y no un estado: hay que
 * recordar por dónde se venía. Se rearma al subir por encima de la ventana,
 * que es lo que pasa en una frustrada y en la vuelta al circuito.
 */
export class Minimos {
  private cantado = false;

  /**
   * Un fotograma. Devuelve `true` **el fotograma en que se cruza**.
   *
   * `alto` es la altura sobre la pista, en metros.
   */
  paso(alto: number, acercandose: boolean): boolean {
    if (alto > ALTURA_DE_DECISION + VENTANA) {
      this.cantado = false;
      return false;
    }
    if (this.cantado || !acercandose) return false;
    if (alto > ALTURA_DE_DECISION) return false;
    this.cantado = true;
    return true;
  }

  /** Otro vuelo, otros mínimos. */
  reiniciar(): void {
    this.cantado = false;
  }
}

/**
 * **Por qué se mandó irse al aire**: solo por lo que es de quien manda.
 *
 * - `pistaOcupada`: la torre, porque hay alguien en la pista —o, en un campo
 *   sin torre, la vaca en la zona de toma—.
 * - `otraCabecera`: la torre, porque se viene por la punta que no está en
 *   uso. Ver `flight/la-otra-cabecera.ts`.
 *
 * Había dos más y se quitaron, porque ninguna torre las da:
 *
 * - `noEstabilizada`, ir alto, bajo, rápido o torcido a los mínimos. Esa
 *   decisión es de quien vuela —en una compañía, de la tripulación—, no de la
 *   torre: la torre manda al aire por la pista, por el tráfico o por la
 *   separación (OACI, Doc 4444, capítulo 7). Ahora la instructora lo
 *   propone, con calma y a los quinientos pies: ver `porQueNoEstaEstabilizada`.
 * - `sinPermiso`, llegar a los mínimos sin el permiso oído **con la pista
 *   libre**: era la torre mandándote al aire por su propio retraso. Ver
 *   `paso` en `flight/turno-de-pista.ts`.
 */
export type PorQueMandaron = "pistaOcupada" | "otraCabecera" | null;

// ── La puerta de la aproximación estabilizada ──────────────────────────

/**
 * **A qué altura sobre la pista se mira si la aproximación está
 * estabilizada**, m: quinientos pies.
 *
 * Es la puerta de una aproximación visual en la regla de la Flight Safety
 * Foundation —ALAR, nota 7.1, «Stabilized Approach»: a mil pies en
 * instrumentos y a quinientos en visual— y en la circular de la FAA sobre la
 * aproximación estabilizada (AC 120-71B). Por encima de ella se corrige; a
 * partir de ella, si no se está, lo que se hace es irse al aire.
 *
 * Aquí es la visual, quinientos, que es como se vuela este juego.
 */
export const PUERTA_ESTABILIZADA = 500 * 0.3048;

/**
 * **Los márgenes de la puerta**, que son los de la regla de verdad:
 *
 * - **la velocidad**, de cinco nudos por debajo de la de referencia a quince
 *   por encima;
 * - **la senda**, a menos de un punto de su escala, arriba o abajo;
 * - **el ritmo de bajada**, no más de mil pies por minuto;
 * - **alineado**: dentro del eje —los mismos sesenta metros y veinte grados
 *   de los mínimos, `MARGENES`— y configurado para aterrizar.
 */
export const PUERTA = {
  lentoKt: 5,
  rapidoKt: 15,
  puntos: 1,
  /** Mil pies por minuto, m/s, negativo bajando. */
  cayendo: -1000 * 0.3048 / 60,
} as const;

/** Lo que se mira en la puerta. Unidades del modelo, menos donde se dice. */
export interface AproximacionEnLaPuerta {
  /** Indicada, nudos. */
  readonly kt: number;
  /** La de referencia de este avión, nudos. */
  readonly referenciaKt: number;
  /** Velocidad vertical, m/s, negativa bajando. */
  readonly vertical: number;
  /** Cuánto se aparta del eje, m. */
  readonly delEje: number;
  /** Cuántos grados torcido respecto al rumbo de la pista. */
  readonly torcido: number;
  /** El desvío de la senda en puntos, + por encima; `null` si no se sabe. */
  readonly puntos: number | null;
  /** Tren abajo y flaps de aterrizar, en el avión que los lleva. */
  readonly configurado: boolean;
}

/** Por qué no está estabilizada en la puerta. */
export type MotivoDeLaPuerta =
  | "lento"
  | "cayendo"
  | "sinConfigurar"
  | "rapido"
  | "torcido"
  | "descolocado"
  | "bajo"
  | "alto";

/**
 * **¿Está estabilizada a los quinientos pies?** El primer motivo por el que
 * no, o `null` si sí, en el orden de los mínimos: de lo que más mata a lo que
 * menos. Ver `PUERTA`.
 */
export function porQueNoEstaEstabilizada(
  a: AproximacionEnLaPuerta,
): MotivoDeLaPuerta | null {
  if (a.kt < a.referenciaKt - PUERTA.lentoKt) return "lento";
  if (a.vertical < PUERTA.cayendo) return "cayendo";
  if (!a.configurado) return "sinConfigurar";
  if (a.kt > a.referenciaKt + PUERTA.rapidoKt) return "rapido";
  if (Math.abs(a.torcido) > MARGENES.torcido) return "torcido";
  if (Math.abs(a.delEje) > MARGENES.delEje) return "descolocado";
  if (a.puntos !== null && a.puntos < -PUERTA.puntos) return "bajo";
  if (a.puntos !== null && a.puntos > PUERTA.puntos) return "alto";
  return null;
}

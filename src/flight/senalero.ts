/**
 * El señor de los bastones: qué gesto toca en cada momento.
 *
 * En el puesto de estacionamiento hay una persona con dos bastones que te dice
 * exactamente dónde parar, y **sus gestos son un código internacional**, igual
 * que las marcas de la pista: seguí adelante, girá a la izquierda, más
 * despacio, **alto**, frenos puestos. Están en el Anexo 2 de OACI y son los
 * mismos en Asunción que en Tenerife.
 *
 * Es de lo mejor que puede tener este juego, por tres motivos:
 *
 * 1. **Se entiende sin idioma.** A los cuatro años se lee «alto» en unos
 *    brazos cruzados mucho antes que en una palabra.
 * 2. **Es de verdad.** No es una invención pedagógica: es lo que pasa cuando
 *    un avión llega a su puesto.
 * 3. **Es lo único que hace un aeropuerto cuando el avión ya no vuela**, y sin
 *    esto la llegada se queda a medias — se rodaba hasta el puesto y allí no
 *    había nadie ni nada, solo un sitio donde el juego dejaba de hablar.
 *
 * Aquí solo se decide **qué gesto toca**. Cómo se dibuja y cómo se mueven los
 * brazos es de `world/senalero.ts`, y así esto se puede comprobar sin montar
 * un aeropuerto entero.
 */

/**
 * Los gestos, que son los de verdad.
 *
 * `null` es que no hay nada que señalar: o el avión todavía no viene, o esto
 * no es una llegada. Un señalero que gesticula sin avión delante enseñaría que
 * los gestos son adorno.
 */
export type Gesto =
  | "adelante"
  | "izquierda"
  | "derecha"
  | "despacio"
  | "alto"
  | "frenos"
  | "calzos"
  | "cortar"
  | null;

/**
 * **Lo que se hace con el avión ya parado en su sitio, y en este orden**, que
 * es el del Anexo 2 de la OACI, apéndice 1: frenos puestos, calzos puestos y
 * cortar motores. Ver `gestoDeSenalero`.
 */
export const YA_PARADO: readonly Exclude<Gesto, null>[] = ["frenos", "calzos", "cortar"];

/**
 * Lo que dura cada seña con el avión parado antes de la siguiente, s: lo que
 * tarda quien pilota en poner el freno y quien está abajo en meter los calzos.
 * La de cortar motores se queda hasta que se apagan.
 */
export const DURA_LA_SENA = 2.5;

/** Lo que hace falta saber para elegir el gesto. */
export interface Llegada {
  /**
   * Metros que faltan hasta el punto de parada, a lo largo de la raya.
   *
   * Negativo si el avión se ha pasado. Pasarse también tiene su gesto —el
   * mismo «alto», porque lo que hay que hacer es parar— y no un reproche.
   */
  readonly restante: number;
  /** Metros a la derecha de la raya de entrada. Negativo, a la izquierda. */
  readonly lateral: number;
  readonly velocidad: number;
  readonly enElSuelo: boolean;
  /** Si esto es una llegada al puesto. Lo sabe el plan de vuelo, no esto. */
  readonly volviendo: boolean;
  /**
   * Segundos que lleva parado en su sitio, con las señas de ya parado. Ver
   * `YA_PARADO`. Sin esto, cero.
   */
  readonly parado?: number;
  /** Si el motor sigue en marcha. Sin esto, que sí. */
  readonly motor?: boolean;
}

/**
 * Desde dónde empieza a señalar, m.
 *
 * Un señalero de verdad empieza cuando el avión ya viene por la calle y lo
 * puede ver. Antes de eso está esperando con los bastones abajo, que es
 * exactamente lo que hay que dibujar: **estar ahí quieto también es una
 * señal**, dice «este es tu sitio».
 */
export const ALCANCE = 90;

/**
 * Lo más apartado de su raya de entrada que puede venir un avión para que le
 * señale, m.
 *
 * Treinta: más que la envergadura del mayor de la flota y que el ancho de
 * una calle con su margen —ahí sí hay que decirle hacia dónde corregir—, y
 * menos que lo que separa dos calles paralelas. Más allá no viene hacia él:
 * pasa por otra calle.
 */
export const DE_LADO = 30;

/** A partir de aquí ya se está parando: el gesto es de parar, m. */
const PARADA = 2.5;

/** Cuánto se puede ir desviado de la raya antes de corregir, m. */
const DESVIADO = 2.2;

/** Dónde empieza a importar la velocidad, m del puesto. */
const CERCA = 35;

/** Y a partir de qué velocidad se pide ir más despacio ahí, m/s. */
const DEPRISA = 3.5;

/** Por debajo de esto, el avión está parado. */
const QUIETO = 0.4;

/**
 * Y a partir de qué velocidad se da por hecho que se ha vuelto a mover, m/s.
 *
 * **Uno y medio, y no los mismos cuatro décimos.** Con un solo listón, un avión
 * parado en el puesto con el motor en marcha cruza la raya en los dos sentidos
 * cada pocos fotogramas —el ralentí lo empuja, el freno lo retiene— y el gesto
 * salta entre «frenos puestos» y «alto» sin parar. En pantalla eso es la
 * tarjeta de apagar el motor y la del señalero turnándose, medido en vídeo
 * durante los quince segundos que el avión llevaba ya aparcado.
 *
 * Es la misma histéresis que usa la máquina de fases para entrar y salir de
 * «aterrizado»: para **llegar** hace falta estar parado de verdad; para dejar
 * de haber llegado, moverse de verdad.
 */
const SE_MUEVE_OTRA_VEZ = 1.5;

/**
 * Qué gesto toca, o `null` si no toca ninguno.
 *
 * El orden importa y es el de un señalero de verdad: **primero parar**, que es
 * lo único urgente; luego la velocidad, porque llegar deprisa estropea el
 * resto; luego la dirección; y adelante es lo que se dice cuando no hay nada
 * que corregir.
 */
export function gestoDeSenalero(s: Llegada, antes: Gesto = null): Gesto {
  if (!s.volviendo || !s.enElSuelo) return null;
  // Todavía viene de lejos: el señalero espera con los bastones abajo.
  if (s.restante > ALCANCE) return null;
  /*
   * **Y a su alcance es delante de él, no a su altura.**
   *
   * `restante` es lo que falta **a lo largo** de la raya de entrada, así que
   * un avión que rodaba por una calle paralela, a doscientos metros de lado,
   * contaba como llegando: el señalero mandaba «a la izquierda» y la tarjeta
   * lo repetía, con el muñeco fuera de la pantalla o a cien píxeles de
   * tamaño. «Sale la tarjeta del señalero dando indicaciones pero el muñeco
   * no aparece nunca, y no estaba tapado.» Un señalero de verdad no le hace
   * señas a un avión que no viene hacia él: empieza cuando lo tiene de cara.
   */
  if (Math.abs(s.lateral) > DE_LADO) return null;

  /*
   * **Parado en el sitio: frenos, calzos y cortar motores, por ese orden.**
   *
   * Aquí acababa en «frenos», y lo que venía después lo decía el juego por su
   * cuenta: «llegaste, apagá el motor» y la tarjeta del final, tapándole,
   * antes incluso de que el señalero cruzara los bastones. En un aeropuerto
   * de verdad nadie apaga hasta que se lo dicen: el señalero para el avión,
   * pide el freno de estacionamiento, avisa de que ya tiene los calzos puestos
   * y solo entonces hace la seña de cortar motores, el bastón pasando por
   * delante del cuello. Apagados, baja los bastones: ya no hay nada que
   * señalar, y entonces sí se acaba el vuelo. Ver `YA_PARADO`.
   */
  const liston =
    antes !== null && YA_PARADO.includes(antes) ? SE_MUEVE_OTRA_VEZ : QUIETO;
  if (s.velocidad < liston && Math.abs(s.restante) < PARADA * 2) {
    if (s.motor === false) return null;
    const parado = s.parado ?? 0;
    return YA_PARADO[Math.min(YA_PARADO.length - 1, Math.floor(parado / DURA_LA_SENA))]!;
  }

  if (s.restante < PARADA) return "alto";
  if (s.restante < CERCA && s.velocidad > DEPRISA) return "despacio";

  /*
   * **Y la dirección se dice hacia dónde hay que girar, no dónde estás.**
   *
   * Si el avión va por la derecha de la raya, lo que hay que hacer es girar a
   * la izquierda. Parece obvio escrito y es la clase de signo que se pone al
   * revés: el primer intento señalaba el lado en el que estabas, que es
   * información y no instrucción.
   */
  if (s.lateral > DESVIADO) return "izquierda";
  if (s.lateral < -DESVIADO) return "derecha";

  return "adelante";
}

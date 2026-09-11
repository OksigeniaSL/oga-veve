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
  "adelante" | "izquierda" | "derecha" | "despacio" | "alto" | "frenos" | null;

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
}

/**
 * Desde dónde empieza a señalar, m.
 *
 * Un señalero de verdad empieza cuando el avión ya viene por la calle y lo
 * puede ver. Antes de eso está esperando con los bastones abajo, que es
 * exactamente lo que hay que dibujar: **estar ahí quieto también es una
 * señal**, dice «este es tu sitio».
 */
const ALCANCE = 90;

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
   * **Parado en el sitio: frenos.**
   *
   * Es el final del vuelo y por eso tiene gesto propio. «Alto» dice «no te
   * muevas más»; «frenos puestos» dice «ya está, llegaste». Un juego que
   * termina sin decir que ha terminado deja a quien juega mirando la pantalla
   * a ver si falta algo.
   */
  const liston = antes === "frenos" ? SE_MUEVE_OTRA_VEZ : QUIETO;
  if (s.velocidad < liston && Math.abs(s.restante) < PARADA * 2) {
    return "frenos";
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

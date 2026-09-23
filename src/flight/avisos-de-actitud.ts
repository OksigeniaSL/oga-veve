/**
 * Los dos avisos que miran cómo se vuela, no dónde se está.
 *
 * La cuenta de altura dice **dónde** estás y el aviso de terreno dice qué
 * tienes debajo. Estos dos dicen otra cosa: que lo que estás haciendo con el
 * avión no da para lo que queda.
 *
 * - **Sink rate** — bajás más deprisa de lo que esa altura aguanta.
 * - **Bank angle** — estás demasiado inclinado.
 *
 * Los dos los calcula el avión desde siempre —velocidad vertical, altura sobre
 * el suelo, ángulo de alabeo— y ninguno de los dos se decía. Y son de los que
 * enseñan: no regañan, describen. «Vas bajando muy rápido para lo bajo que
 * estás» es una frase que un niño entiende a la primera y que, dicha a tiempo,
 * es la diferencia entre una toma dura y una normal.
 *
 * Van aparte de `game.ts` por lo de siempre: aquí se pueden probar sin montar
 * un navegador, y las dos cuentas que llevan son justo las que se escriben
 * mal solas.
 */

/**
 * El ritmo de bajada que empieza a ser demasiado para esta altura, m/s.
 *
 * No es un número fijo, y eso es lo que lo hace real: **cuanto más bajo, menos
 * se puede bajar**. A trescientos metros ir a diez por segundo es un descenso
 * normal; a sesenta metros es un accidente.
 *
 * La recta sale de los puntos que dispara un GPWS de verdad en su modo 1:
 *
 *     a  200 ft (61 m)    1000 ft/min   →   5,0 m/s
 *     a  500 ft (152 m)   1500 ft/min   →   7,6 m/s
 *     a 1000 ft (305 m)   2500 ft/min   →  12,7 m/s
 *
 * Que da una pendiente de 0,0316 por metro y una ordenada de 3,1. No es una
 * aproximación cómoda: es la de las cartas, pasada a unidades del modelo.
 */
export function ritmoQueSobra(alturaM: number): number {
  return 3.1 + 0.0316 * alturaM;
}

/**
 * Por debajo de esto no se avisa: es la recogida, m.
 *
 * Quince metros. Ahí ya se está posando el avión a propósito y el aviso no
 * avisa de nada — solo tapa lo que sí importa. Un GPWS de verdad hace lo mismo
 * por el mismo motivo, y encaja con la regla de la casa: aterrizar no se
 * dramatiza.
 */
export const RECOGIDA = 15;

/**
 * Y por encima de esto tampoco: a esa altura bajar deprisa es bajar, m.
 *
 * Trescientos cinco metros, que son los mil pies del modo 1. Por encima, un
 * descenso rápido es lo normal de un crucero que baja.
 */
export const DEMASIADO_ALTO = 305;

/**
 * Cuánto alabeo es demasiado, rad.
 *
 * Cuarenta y cinco grados. Un viraje normal va a treinta; el piloto automático
 * de este juego se para en veinticinco. A cuarenta y cinco ya no es un viraje,
 * es un avión de lado — y el ala tiene que dar vez y media su peso para
 * sostenerlo, que es de donde sale la pérdida en viraje.
 *
 * Y no en treinta y cinco, que es donde lo pone alguna cabina: aquí se está
 * aprendiendo a virar, y un aviso que salta en un viraje bien hecho enseña a
 * no hacer caso de los avisos.
 */
export const ALABEO_QUE_SOBRA = (45 * Math.PI) / 180;

/** Lo que hay que decir ahora, o nada. */
export type AvisoDeActitud = "sink rate" | "bank angle" | null;

/**
 * Qué toca avisar, mirando cómo se vuela ahora mismo.
 *
 * Devuelve uno o ninguno, nunca dos: dos avisos a la vez son dos frases
 * pisándose, y quien va demasiado inclinado bajando deprisa tiene un problema
 * solo. Manda el ritmo de bajada, que es el que tiene suelo debajo.
 */
export function avisoDeActitud(e: {
  readonly enSuelo: boolean;
  /** Metros sobre el terreno. */
  readonly altura: number;
  /** Velocidad vertical, m/s. Negativa es bajar. */
  readonly vertical: number;
  /** Alabeo, rad. El signo da igual: inclinarse es inclinarse. */
  readonly alabeo: number;
}): AvisoDeActitud {
  if (e.enSuelo) return null;
  const bajando = -e.vertical;
  if (
    e.altura > RECOGIDA &&
    e.altura < DEMASIADO_ALTO &&
    bajando > ritmoQueSobra(e.altura)
  ) {
    return "sink rate";
  }
  /*
   * El alabeo sí vale a cualquier altura: ponerse de lado a mil metros es tan
   * mal viraje como a cien. Lo que cambia es lo que hay debajo, y de eso ya
   * avisa el otro.
   */
  if (Math.abs(e.alabeo) > ALABEO_QUE_SOBRA) return "bank angle";
  return null;
}

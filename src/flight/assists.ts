/**
 * Las ayudas de pilotaje, como capas independientes.
 *
 * Antes había un solo número, `assist`, esparcido por el modelo de vuelo y
 * multiplicando media docena de cosas a la vez. Con dos modos —Arcade y
 * Piloto— eso bastaba. Con una escalera de cuatro tramos no: lo que separa a
 * un niño de siete años de uno de doce no es «más o menos ayuda», son ayudas
 * **distintas**. A los siete se le lleva el motor y se le impide la pérdida;
 * a los doce se le avisa de la pérdida pero se le deja entrar en ella, y el
 * motor lo lleva él.
 *
 * Así que cada ayuda es una capa con nombre, que vale entre 0 y 1, y los
 * tramos son combinaciones concretas de esas capas. Añadir un tramo nuevo es
 * añadir una fila, no otro `if` dentro de la aerodinámica.
 */

export interface AssistLayers {
  /** Devuelve las alas a la horizontal al soltar los alerones. */
  wingLeveller: number;
  /** Timón automático: mantiene el viraje coordinado. */
  autoRudder: number;
  /** Sostiene el ritmo de ascenso al soltar el cabeceo. */
  climbHold: number;
  /** Resta autoridad al elevador cerca del ángulo de pérdida. */
  stallProtection: number;
  /** Amortiguamiento extra en los tres ejes: el avión responde más calmado. */
  extraDamping: number;
  /** Cuánto aguanta el avión antes de romperse en una toma. */
  crashTolerance: number;
  /**
   * Cuánto empuja el juego hacia la raya verde mientras se rueda, 0 a 1.
   *
   * Es el *Smart Steering* de Mario Kart, y Nintendo lo puso ahí exactamente
   * para los niños que no consiguen mantenerse en la pista. **No es hacer
   * trampa**: es la misma idea que gobierna toda esta escalera —lo que cambia
   * de un peldaño al siguiente no es el mundo ni el avión, es cuánta física se
   * te confía—, y la dirección en tierra es física.
   *
   * Y solo actúa cuando hace falta: quien va por la raya no nota nada, porque
   * no hay nada que corregir. Ver el issue de los patrones de conducción.
   */
  taxiAssist: number;
}

export const NO_ASSISTS: AssistLayers = {
  wingLeveller: 0,
  autoRudder: 0,
  climbHold: 0,
  stallProtection: 0,
  extraDamping: 0,
  crashTolerance: 0,
  taxiAssist: 0,
};

/** Todas las capas al máximo. Es lo que era el viejo `assist = 1`. */
export const FULL_ASSISTS: AssistLayers = {
  wingLeveller: 1,
  autoRudder: 1,
  climbHold: 1,
  stallProtection: 1,
  extraDamping: 1,
  crashTolerance: 1,
  taxiAssist: 1,
};

/** Un solo número para todas las capas, que es como se pedía antes. */
export function uniformAssists(level: number): AssistLayers {
  const value = Math.max(0, Math.min(1, level));
  return {
    wingLeveller: value,
    autoRudder: value,
    climbHold: value,
    stallProtection: value,
    extraDamping: value,
    crashTolerance: value,
    taxiAssist: value,
  };
}

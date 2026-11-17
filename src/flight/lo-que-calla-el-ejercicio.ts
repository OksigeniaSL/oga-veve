/**
 * **Lo que calla un ejercicio que no acaba en la pista** (H26f, ADR 0030).
 *
 * Volando «Interceptar un radial» salía todo el rato «Andá a la pista», y la
 * torre contaba el tráfico de otros —«hold short», «go around, runway
 * occupied»— mientras la instructora pedía mirar la barra. Ni una cosa ni otra
 * eran del ejercicio. Los demás ejercicios en el aire no tienen ese problema
 * porque **acaban en la pista**: el planeo, el de un motor, la tormenta y la
 * autorrotación terminan aterrizando, y ahí «andá a la pista», la torre y su
 * frecuencia son parte de lo que se practica. Los de radio no: se cierran en
 * el aire, lejos de ella, con la aguja que dio la vuelta o la barra quieta en
 * el centro.
 *
 * Así que, mientras dura uno de esos, se calla lo que es de la pista y de su
 * gente, y lo que se cuenta por la ventanilla:
 *
 * - **La fase del plan**: su tarjeta, su voz y su rótulo. «Andá a la pista»
 *   manda al sitio contrario al que pide el ejercicio, y dos instrucciones a
 *   la vez es peor que ninguna (ver `MANDA_EL_PLAN` en `guion-de-fases.ts`).
 * - **La frecuencia del campo**: la torre hablándole a otros y los otros. Es
 *   lo mismo que se hizo con el modo inicio, que partía la conversación; aquí
 *   además cortaba el morse, que espera a que no hable nadie y se corta si
 *   empieza alguien (`TurnoDelMorse`), y oír el identificador es la mitad del
 *   ejercicio. El tráfico sigue volando su circuito: solo deja de oírse.
 * - **La torre hablándote a vos**: el relevo de frecuencia, los permisos, la
 *   pista ocupada. En un ejercicio la torre contesta porque una emergencia se
 *   declara a ella, y en estos no se declara nada.
 * - **Lo que se ve por la ventanilla**: «a la izquierda, la Isla de Lobos» le
 *   tapó la tarjeta del ejercicio a quien estaba virando para coger el radial.
 *   Como con la tormenta del ejercicio por delante (`tormentaPorDelante`), no
 *   se señala: no es esperar a que el ejercicio calle, porque el ejercicio
 *   sigue mirando la barra aunque no hable, y su tarjeta es lo que hay que
 *   tener delante.
 *
 * **Lo que no se calla nunca** es la seguridad: la máquina del avión
 * (*traffic*, *terrain*, la pérdida), los avisos del cuadro y la información
 * de tráfico, que sin torre la da la instructora (`comoSeDiceElTrafico`). Y al
 * cerrarse el ejercicio vuelve todo, que lo que se vuele después ya es un
 * vuelo.
 */

import type { Ejercicio } from "./ejercicios";

export interface LoQueCalla {
  /** La tarjeta, la voz y el rótulo de la fase del plan: «andá a la pista». */
  readonly laFase: boolean;
  /** La frecuencia del campo: la torre hablándole a otros y los otros aviones. */
  readonly laFrecuencia: boolean;
  /** La torre hablándote a vos: el relevo, los permisos, la pista ocupada. */
  readonly laTorre: boolean;
  /** Lo que se señala por la ventanilla. */
  readonly laVentanilla: boolean;
}

/** Sin ejercicio, o con uno que acaba en la pista: no se calla nada. */
export const NO_CALLA_NADA: LoQueCalla = {
  laFase: false,
  laFrecuencia: false,
  laTorre: false,
  laVentanilla: false,
};

/**
 * **Lo que calla el ejercicio de hoy**: todo eso mientras dura uno que acaba
 * en el aire (`Ejercicio.acabaEnElAire`), y nada en cuanto se cierra.
 */
export function loQueCallaElEjercicio(
  ejercicio: Pick<Ejercicio, "acabaEnElAire"> | null,
  cerrado: boolean,
): LoQueCalla {
  if (!ejercicio?.acabaEnElAire || cerrado) return NO_CALLA_NADA;
  return { laFase: true, laFrecuencia: true, laTorre: true, laVentanilla: true };
}

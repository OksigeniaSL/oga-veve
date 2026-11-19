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
 * - **La megafonía de la cabina** (H26u): la comandante y la tripulación
 *   contándole al pasaje un vuelo de línea —«ya llegamos a nuestra altura, se
 *   apagó la señal del cinturón»— y lo que cuenta la comandante en crucero.
 *   Volando «Rumbo de noche» con el JAZ 90, la comandante anunció el crucero a
 *   mil quinientos pies encima del río, y su tira tapó la radio del ejercicio.
 *   No es de la pista, y por eso H26f no la había visto: salía solo en los
 *   aviones con pasaje, y los bancos de radio volaban la avioneta.
 * - **Lo que la instructora explica una vez de la cabina** (H26u): la
 *   palanca de los gases automáticos que se mueve sola al poner el
 *   automático, o que se queda al soltarse; y qué es el rombo del TCAS en el
 *   mapa, con calma y en vuelo tranquilo (`explicarElTrafico`). Las dos se
 *   explican una vez, y en estos ejercicios caen en mitad de lo que se
 *   practica: no se gastan aquí, y quedan para el vuelo siguiente. El aviso
 *   de tráfico de verdad, «mirá: hay otro avión cerca», no pasa por aquí: es
 *   seguridad, y sigue.
 *
 * **Y el que lleva su propia final** (H32c): la final con viento cruzado,
 * el cangrejo y el ala baja (`escena: "cruzado"`), es una lección de cómo se
 * aterriza, y la cuenta ella —cómo se pone el avión, si va así, el pie—.
 * Mientras dura se calla lo que la final dice por su cuenta de lo mismo:
 *
 * - **Cómo se aterriza en este avión** (`contarComoSeAterriza` en
 *   `game.ts`), la explicación de la toma que se cuenta una vez por tramo y
 *   espera a que la tarjeta quede libre. Es otra explicación de lo mismo a la
 *   vez, y el ejercicio ocupa la tarjeta toda la final: salía en el primer
 *   hueco, que en la corta es justo cuando toca el pie. No se gasta: queda
 *   para el tramo siguiente.
 * - **Y desde que pide el pie, «ya podés tocar» y las luces del PAPI.** El
 *   pie y el morro a la pista ya dicen cuándo y cómo se toca con el viento de
 *   costado, y las dos tarjetas son tan importantes como la suya: la última
 *   que llega tapa a la anterior. Volado con el JAZ 90 en Los Rodeos, a los
 *   quince metros salió «pie derecho» y en el mismo fotograma «ya podés
 *   tocar» encima, y a los trece, el PAPI. Quien vuela un reactor no veía el
 *   pie justo cuando tenía que pisar. Lo que sigue saliendo encima es la
 *   recogida —«un poco de nariz»—, que es la otra mitad de la misma maniobra y
 *   llega segundo y medio después. En el ala baja no se pide nada en la
 *   corta, y ahí «ya podés tocar» sigue.
 *
 * Y las dos cosas se callan también en los que acaban en el aire, que son de
 * la pista y no de su lección.
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
  /** La megafonía de la cabina: los anuncios al pasaje y lo que cuenta la comandante en crucero. */
  readonly laMegafonia: boolean;
  /** La instructora explicando la cabina una vez: los gases automáticos y el rombo del TCAS. */
  readonly lasExplicaciones: boolean;
  /** Cómo se aterriza en este avión, que se cuenta una vez por tramo antes de la final. */
  readonly comoSeAterriza: boolean;
  /** Lo que la final dice por su cuenta en la corta: «ya podés tocar» y las luces del PAPI. */
  readonly laCorta: boolean;
}

/** Sin ejercicio, o con uno que acaba en la pista: no se calla nada. */
export const NO_CALLA_NADA: LoQueCalla = {
  laFase: false,
  laFrecuencia: false,
  laTorre: false,
  laVentanilla: false,
  laMegafonia: false,
  lasExplicaciones: false,
  comoSeAterriza: false,
  laCorta: false,
};

/**
 * **Y el que acaba en la pista, desde que pide irse al aire**: la fase del plan
 * y nada más. El ILS acaba en la pista o en la frustrada encima de ella, y
 * desde los mínimos con las agujas fuera lo que manda es su «frustrada: gas a
 * fondo y arriba». Quien se va nivelado o subiendo poco sale de la final sin
 * los quince metros de `SUBIDA_DE_IRSE`, y la fase decía «andá a la pista»
 * justo detrás: dos órdenes contrarias en el mismo momento (ADR 0030, H26m).
 * La torre y su frecuencia siguen, que mandar al aire y despejar la pista es
 * suyo y es parte de la aproximación.
 */
export const SOLO_LA_FASE: LoQueCalla = { ...NO_CALLA_NADA, laFase: true };

/**
 * **Lo que calla el ejercicio de hoy**: todo eso mientras dura uno que acaba
 * en el aire (`Ejercicio.acabaEnElAire`); la fase, mientras uno que acaba en
 * la pista está pidiendo irse al aire (`seVaAlAire`); en la final con viento
 * cruzado, cómo se aterriza, y desde que pide el pie (`pideElPie`), la corta;
 * y nada en cuanto se cierra.
 */
export function loQueCallaElEjercicio(
  ejercicio: Pick<Ejercicio, "acabaEnElAire" | "escena"> | null,
  cerrado: boolean,
  seVaAlAire = false,
  pideElPie = false,
): LoQueCalla {
  if (!ejercicio || cerrado) return NO_CALLA_NADA;
  if (ejercicio.acabaEnElAire)
    return {
      laFase: true,
      laFrecuencia: true,
      laTorre: true,
      laVentanilla: true,
      laMegafonia: true,
      lasExplicaciones: true,
      comoSeAterriza: true,
      laCorta: true,
    };
  if (ejercicio.escena === "cruzado") return { ...NO_CALLA_NADA, comoSeAterriza: true, laCorta: pideElPie };
  /*
   * **En la pista corta, la fase y lo que se explica de la cabina**, hasta que
   * se cierra: la subida de después de los frenos la cuenta la instructora
   * —la de mejor ángulo hasta el monte, la de mejor régimen después—, y la
   * fase del plan pidiendo su subida de siempre encima sería otra voz para el
   * mismo suceso (H35a). La pista y su gente sí son de la lección: se sale de
   * ella.
   */
  if (ejercicio.escena === "pista-corta") return { ...NO_CALLA_NADA, laFase: true, lasExplicaciones: true };
  return seVaAlAire ? SOLO_LA_FASE : NO_CALLA_NADA;
}

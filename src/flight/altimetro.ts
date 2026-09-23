/**
 * El reglaje del altímetro: la ventanilla de presión.
 *
 * **Es la información que le faltaba a esta cabina.** El juego ya leía la
 * presión del METAR —`meteo.ts` la guarda como `qnh`— y no la usaba en
 * ninguna parte: el altímetro enseñaba la altitud verdadera, la que sabe el
 * motor de vuelo, que es justo la que un altímetro de verdad no sabe.
 *
 * Un altímetro no mide altura: **mide presión** y la traduce a altura
 * suponiendo un día concreto. Cuál es ese día se lo dice el piloto girando la
 * rueda hasta que en la ventanilla aparece la presión del sitio. Si se pone
 * mal, el instrumento no se rompe ni avisa: sigue funcionando, y miente.
 *
 * Por eso está aquí y no en la capa de pintura. Es aeronáutica de verdad, es
 * de las primeras cosas que se aprenden y es de las que se recuerdan porque
 * tiene consecuencia: en un día de borrasca, con el reglaje estándar puesto,
 * un avión cree ir más alto de lo que va. La regla nemotécnica que se enseña
 * en toda escuela del mundo dice justo eso:
 *
 * > *De alta a baja, ojo con la caja.*
 *
 * ## Y la cuenta
 *
 * Cerca del suelo, un hectopascal es **veintisiete pies**, unos ocho metros y
 * cuarto. Es la pendiente de la atmósfera estándar al nivel del mar y es la
 * que usan las cartas y los exámenes; la escala real cambia con la altura,
 * pero dentro de lo que vuela este juego la diferencia no llega al pelo de la
 * aguja.
 *
 * Aquí se trabaja en **metros**, como todo lo que hay dentro del modelo, y la
 * conversión a pies se hace al pintar. Ver la regla de la casa sobre
 * unidades.
 */

/** Lo que sube la aguja por cada hectopascal de más en la ventanilla, m. */
export const METROS_POR_HPA = 8.23;

/**
 * El reglaje estándar, hPa.
 *
 * Es el que lleva puesto un altímetro que nadie ha tocado, y el que se pone
 * de verdad por encima de la altitud de transición para que todos los aviones
 * midan con la misma vara — aunque ninguno sepa entonces su altura sobre el
 * mar. Volar en nivel es exactamente eso: ponerse todos de acuerdo en una
 * mentira común, que es más seguro que veinte verdades distintas.
 */
export const QNH_ESTANDAR = 1013;

/** Los topes de la rueda, hPa. Los mismos que tiene un altímetro de verdad. */
export const QNH_MINIMO = 950;
export const QNH_MAXIMO = 1050;

/**
 * La altura que enseña el altímetro, en metros.
 *
 * Con el reglaje puesto en la presión del sitio, dice la verdad. Con el
 * reglaje por encima, dice de más; por debajo, de menos. Y no avisa: eso es
 * lo que hay que aprender.
 *
 * @param altitudReal la que sabe el modelo de vuelo, m sobre el nivel del mar
 * @param puesta lo que se lee en la ventanilla, hPa
 * @param delSitio la presión que de verdad hay hoy aquí, hPa
 */
export function alturaIndicada(
  altitudReal: number,
  puesta: number,
  delSitio: number,
): number {
  return altitudReal + (puesta - delSitio) * METROS_POR_HPA;
}

/**
 * Gira la rueda un paso, sin salirse de los topes.
 *
 * De hectopascal en hectopascal, que es como está graduada. Un paso más fino
 * no existe en el instrumento y uno más grueso se salta el valor correcto.
 */
export function girarRueda(puesta: number, pasos: number): number {
  return Math.max(QNH_MINIMO, Math.min(QNH_MAXIMO, Math.round(puesta + pasos)));
}

/**
 * Si el reglaje puesto es el del sitio, con la holgura de la rueda.
 *
 * Un hectopascal son ocho metros: dentro de eso nadie diría que está mal
 * puesto, y el instrumento tampoco podría distinguirlo. Sirve para
 * **enseñarlo**, no para castigarlo — en este juego las normas se muestran.
 */
export function bienPuesta(puesta: number, delSitio: number): boolean {
  return Math.abs(puesta - delSitio) <= 1;
}

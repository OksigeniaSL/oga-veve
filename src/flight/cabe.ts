/**
 * Si este avión cabe en este campo.
 *
 * > «Si un avión no [cabe] en una pista, no se ofrece. El que sí, se ofrece con
 * > sus condiciones de vuelo.»
 *
 * El hangar ofrecía **los seis aviones en los once campos**, sin mirar el sitio
 * ni una sola vez, y el sitio se podía cambiar después sin que nadie revisara el
 * avión. Medido con las cuentas del propio juego: el JAZ 120 necesita 2.562
 * metros y La Palma tiene 2.202, así que el juego lo colocaba, la torre lo
 * autorizaba y el avión se salía por el final. Está en el banco: percance
 * «fuera», y quien lo jugó lo dijo con otras palabras — «vaya locos».
 *
 * ## Qué es caber
 *
 * Tres cosas, y las tres tienen que darse:
 *
 * - **La pista es bastante larga.** La mayor de la distancia de despegue y la
 *   de aterrizaje, que son distintas y no siempre manda la misma: el JAZ 120
 *   necesita más para salir y el JAZ 20 más para pararse. Ver `pistaQueNecesita`.
 * - **La pista es bastante ancha.** Una pista tiene que dar para maniobrar con
 *   la envergadura que se lleva. Las anchuras normalizadas de OACI van por
 *   clave de referencia, y la regla de andar por casa que sale de ellas es que
 *   el ancho de pista no baja de un tercio de la envergadura.
 * - **Se puede dar la vuelta al final.** Un avión que entra en pista por la
 *   mitad tiene que poder volver a la cabecera, y eso es un giro de ciento
 *   ochenta grados cuyo radio sale de su batalla. En una pista más estrecha que
 *   ese giro, el avión no cabe aunque la longitud le sobre.
 *
 * ## Y lo que no se comprueba aquí
 *
 * La altitud del campo, la temperatura, el viento y la pendiente. Las cuatro
 * mueven la cuenta de verdad —es la lección de «pesado, caliente, alto y
 * corto»— y ninguna está todavía en el motor de vuelo. Cuando estén, entran
 * aquí y no en otro sitio.
 */

import type { AircraftConfig } from "./aircraft";
import { pistaQueNecesita } from "./carrera";
import { GIRO_DE_MORRO } from "./fdm";
import type { Superficie } from "../world/superficie";

/** Lo que hace falta saber de un campo para decidir. */
export interface Campo {
  /** Lo que mide la pista más larga, en metros. */
  readonly largo: number;
  /** Y lo que mide de ancho. */
  readonly ancho: number;
  readonly superficie: Superficie;
}

/** Por qué no cabe, si no cabe. */
export type PorQueNo = "corta" | "estrecha" | "no-da-la-vuelta";

export interface Veredicto {
  readonly cabe: boolean;
  readonly porQueNo: PorQueNo | null;
  /** Lo que necesita y lo que hay, para poder enseñarlo sin palabras. */
  readonly necesita: number;
  readonly hay: number;
}

/**
 * El radio más cerrado que puede dar este avión, en metros.
 *
 * La geometría es la de un coche: `R = batalla / tan δ`. El ángulo de la rueda
 * de morro se **importa** del motor de vuelo y no se copia aquí, que si no esto
 * diría que cabe y el avión no daría la vuelta.
 */
export function radioDeGiro(a: AircraftConfig): number {
  return a.batalla / Math.tan(GIRO_DE_MORRO);
}

export function cabeEn(a: AircraftConfig, campo: Campo): Veredicto {
  const necesita = pistaQueNecesita(a, campo.superficie);
  if (necesita > campo.largo)
    return { cabe: false, porQueNo: "corta", necesita, hay: campo.largo };

  const anchoQuePide = a.wingSpan / 3;
  if (anchoQuePide > campo.ancho)
    return {
      cabe: false,
      porQueNo: "estrecha",
      necesita: anchoQuePide,
      hay: campo.ancho,
    };

  /*
   * Y la media vuelta: dos radios de giro tienen que caber en el ancho de la
   * pista, con un par de metros de borde a cada lado para las ruedas de fuera.
   * Ver `esteGiro` en `fdm.ts`, que es de donde sale el radio.
   */
  const laVuelta = 2 * radioDeGiro(a) + 8;
  if (laVuelta > campo.ancho)
    return {
      cabe: false,
      porQueNo: "no-da-la-vuelta",
      necesita: laVuelta,
      hay: campo.ancho,
    };

  return { cabe: true, porQueNo: null, necesita, hay: campo.largo };
}

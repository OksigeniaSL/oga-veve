/**
 * **Qué les pasa a los flaps cuando se va más rápido de lo que aguantan.**
 *
 * Preguntado jugando, con el aviso de «muy rápido con los flaps» delante:
 * «debería haber alguna señal de alarma para que no rompa el avión o algo
 * así». La señal ya estaba; lo que faltaba era **la consecuencia**, y la de
 * verdad no es la misma en todos los aviones:
 *
 * - **En un reactor de línea**, el avión se protege solo. Con los flaps de
 *   aterrizaje y la velocidad por encima de su placa, el alivio de carga
 *   —*flap load relief*— los sube a la muesca anterior sin tocar la palanca,
 *   y los vuelve a bajar en cuanto la velocidad cae. El 737 lo hace un nudo
 *   por encima de la placa. No se rompe nada: el avión deja de hacer lo que
 *   se le pidió hasta que se le pide bien. Ver `alivioDeFlaps`.
 * - **En una avioneta** no hay nada que vigile: ni aviso, ni alivio, solo el
 *   arco blanco del anemómetro. Y si se abusa, el flap sufre. Aquí quedan
 *   **tocados**: el aire los empuja hasta la primera muesca y de ahí no bajan
 *   hasta volver a tierra, donde los mira el mecánico. Aterrizar se puede
 *   igual —con menos flaps, un poco más rápido—, que es lo que se hace de
 *   verdad con unos flaps que no bajan.
 *
 * **Y ninguna de las dos castiga.** No se pierde nada, no hay pantalla roja ni
 * vuelo terminado: se ve lo que pasa y se vuelve a intentar. Es la regla de la
 * casa, y es también lo real: un avión no le pone nota a nadie.
 *
 * Este módulo no dibuja ni habla. Dice dónde pueden estar los flaps ahora, y
 * `Game` cuenta lo que cambia. Todo en nudos indicados, que es como están
 * escritas las placas —ver `vfePorMuesca`—: la velocidad en el modelo sigue en
 * metros por segundo, y la conversión la hace quien llama.
 */

import { DETENTES, muescaMasCercana } from "./flaps";
import { vfeDeLaMuesca, vfeEn } from "./limites";

/** Lo que se recuerda de un fotograma al siguiente. */
export interface CargaDeFlaps {
  /** El alivio de carga está teniendo arriba los de aterrizaje. */
  readonly aliviados: boolean;
  /** Segundos de abuso sumados en este vuelo. Ver `ABUSO`. */
  readonly abuso: number;
  /** Quedaron tocados: no bajan de la primera muesca hasta volver a tierra. */
  readonly tocados: boolean;
}

/** Unos flaps sanos y sin alivio: los de un avión en su puesto. */
export const FLAPS_SANOS: CargaDeFlaps = {
  aliviados: false,
  abuso: 0,
  tocados: false,
};

/**
 * Cuántos nudos por encima de la placa salta el alivio: **uno**.
 *
 * Es el del 737: con los flaps treinta, placa de 175, suben a 176. No se deja
 * más margen porque la placa ya es el margen.
 */
export const SALTA_EL_ALIVIO = 1;

/**
 * Y cuántos por debajo hay que bajar para que vuelvan: **cinco**.
 *
 * Con el mismo número para irse y volver, una ráfaga en la raya los subiría y
 * los bajaría cada segundo. Cinco nudos es lo que se mueve la aguja en un aire
 * normal de aproximación, y el 737 tampoco los devuelve en la misma raya.
 */
export const VUELVE_EL_ALIVIO = 5;

/**
 * **Cuánto por encima de la placa es abusar**: un quince por ciento.
 *
 * Una placa lleva margen —la estructura se calcula para una vez y media la
 * carga límite—, así que rozarla no dobla nada, y un aviso que rompe algo por
 * un nudo enseña a tenerle miedo al instrumento. Un quince por ciento de
 * velocidad es un tercio más de presión sobre el flap, y eso ya no es rozar.
 */
export const ABUSO = 1.15;

/**
 * **Y cuánto rato**: cuatro segundos, sumados en el vuelo.
 *
 * Sumados y no seguidos, porque el flap no se recupera entre una vez y la
 * siguiente; y cuatro porque una ráfaga pasa en uno y un picado con los flaps
 * fuera no.
 */
export const AGUANTAN = 4;

/** Hasta dónde bajan unos flaps tocados: la primera muesca. */
export const TOPE_DE_TOCADOS = DETENTES[1];

/** La muesca de aterrizaje: la última. */
const ATERRIZAJE = DETENTES.length - 1;

/** Lo que hace falta saber del avión. Todo sale de su ficha. */
export interface FichaDeFlaps {
  readonly llevaFlaps: boolean;
  readonly vfePorMuesca: readonly number[];
  readonly alivioDeFlaps: boolean;
}

/** Lo que hace falta saber de este instante. */
export interface AhoraMismo {
  /** Velocidad indicada, nudos. */
  readonly kt: number;
  /** Dónde están los flaps, de 0 a 1. */
  readonly flaps: number;
  /** Dónde está la palanca, de 0 a 1. */
  readonly palanca: number;
  /**
   * Si el avión está en tierra y parado, que es cuando se le puede mirar.
   * Ver `tocados`.
   */
  readonly paradoEnTierra: boolean;
  readonly dt: number;
}

/**
 * Un paso: cómo quedan los flaps con lo que está pasando ahora.
 *
 * Función pura y sin memoria propia: recibe lo de antes y devuelve lo de
 * ahora, que es lo que deja probar el alivio y el abuso sin navegador.
 */
export function cuidarLosFlaps(
  a: FichaDeFlaps,
  antes: CargaDeFlaps,
  ahora: AhoraMismo,
): CargaDeFlaps {
  if (!a.llevaFlaps) return FLAPS_SANOS;
  const placa = a.vfePorMuesca;

  /*
   * **El alivio mira la palanca, no los flaps.** Mientras está puesto, los
   * flaps están subiendo o ya arriba, y lo que decide si sigue es que la
   * palanca siga pidiendo los de aterrizaje: en cuanto se sube, ya no hay
   * nada que aliviar.
   */
  let aliviados = false;
  if (a.alivioDeFlaps && muescaMasCercana(ahora.palanca) === ATERRIZAJE) {
    const tope = vfeDeLaMuesca(placa, ATERRIZAJE);
    aliviados = antes.aliviados
      ? ahora.kt >= tope - VUELVE_EL_ALIVIO
      : ahora.kt > tope + SALTA_EL_ALIVIO;
  }

  /*
   * **Y el abuso, en los que no se protegen solos.** Donde hay alivio, el
   * avión ya se ha encargado de lo que más se fuerza; donde no lo hay, el
   * flap se lleva lo que le echen. Parado en tierra, el mecánico los ha
   * mirado: vuelven a estar sanos.
   */
  if (ahora.paradoEnTierra)
    return { aliviados: false, abuso: 0, tocados: false };
  let abuso = antes.abuso;
  let tocados = antes.tocados;
  if (!a.alivioDeFlaps && !tocados) {
    if (ahora.kt > vfeEn(placa, ahora.flaps) * ABUSO)
      abuso += Math.max(0, ahora.dt);
    if (abuso >= AGUANTAN) tocados = true;
  }
  return { aliviados, abuso, tocados };
}

/**
 * Hasta dónde pueden bajar los flaps ahora, de 0 a 1.
 *
 * Es lo que se le pasa a la palanca como techo: los flaps van hacia lo que
 * pide la palanca **o hasta aquí**, lo que sea menos. La palanca no se mueve,
 * que es exactamente lo que pasa en la cabina: el alivio y un flap tocado no
 * mueven el mando, mueven el flap. Ver `topeDeFlaps` en `input.ts`.
 */
export function hastaDondeBajan(c: CargaDeFlaps): number {
  let tope = 1;
  // Aliviados, a la muesca de antes de la de aterrizaje.
  if (c.aliviados) tope = Math.min(tope, DETENTES[2]);
  if (c.tocados) tope = Math.min(tope, TOPE_DE_TOCADOS);
  return tope;
}

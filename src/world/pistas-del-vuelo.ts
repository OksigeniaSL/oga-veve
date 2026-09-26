/**
 * Las pistas de este vuelo: la de casa y la del sitio al que se va.
 *
 * Todo el juego preguntaba «¿estoy sobre la pista?» mirando **una**, la del
 * escenario. Mientras solo había un aeropuerto por mundo eso era exacto. Desde
 * que se puede volar a otro, es falso de la peor manera:
 *
 * > «No me dejó aterrizar, tomé tierra con estos parámetros y "se rompió", no
 * > lo considera un aterrizaje.»
 *
 * Tomó tierra en la pista de Tenerife Sur, que existe, está dibujada y tiene
 * sus luces encendidas — y el juego, que solo sabía de la de Tenerife Norte,
 * dictaminó «fuera de pista» y rompió el avión. Aterrizar bien no puede ser un
 * percance.
 *
 * Aquí no hay física ni escena: son rectángulos y un punto. Por eso se puede
 * comprobar sin volar, que es lo que hacía falta para no volver a descubrir
 * esto aterrizando.
 */

import { enEjesDePista } from "./rumbo";

/** Una pista en coordenadas del mundo en el que se está volando. */
export interface Pista {
  readonly x: number;
  readonly z: number;
  /** Rumbo **verdadero**, en grados. */
  readonly heading: number;
  readonly length: number;
  readonly width: number;
  /** Asfalto antes del umbral de aterrizaje en uso, m. Ver `umbral-desplazado.ts`. */
  readonly desplazado?: number;
  /** Y el de la otra punta. */
  readonly desplazadoEnfrente?: number;
}

/**
 * Si un punto cae sobre alguna de estas pistas, con el margen que se pida.
 *
 * `margen` se suma a lo largo —la franja de antes del umbral— y el ancho se
 * toma doble, que es lo que ya hacía la comprobación de siempre: la franja de
 * una pista es asfalto suyo a efectos de posarse.
 */
export function sobreAlguna(
  pistas: readonly Pista[],
  x: number,
  z: number,
  margen = 0,
): boolean {
  return pistas.some((r) => {
    const { along, across } = enEjesDePista(x, z, r.x, r.z, r.heading);
    return (
      Math.abs(across) < r.width && Math.abs(along) < r.length / 2 + margen
    );
  });
}

/**
 * Cuál de estas pistas es la de más cerca, o `null` si no hay ninguna.
 *
 * Sirve para saber **en cuál** se está aterrizando, que es distinto de si se
 * está sobre alguna: la torre que habla, el número que se canta y el sitio al
 * que se rueda después salen de ésta.
 */
export function laMasCerca(
  pistas: readonly Pista[],
  x: number,
  z: number,
): Pista | null {
  let mejor: Pista | null = null;
  let corto = Infinity;
  for (const r of pistas) {
    const d = Math.hypot(r.x - x, r.z - z);
    if (d < corto) {
      corto = d;
      mejor = r;
    }
  }
  return mejor;
}

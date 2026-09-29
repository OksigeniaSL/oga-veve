/**
 * **Lo que merece contarse por la ventanilla**, puesto en el mundo del vuelo.
 *
 * La lista vive en `data/hitos/destacados.json` y es corta a propósito: lo que
 * una comandante de verdad señalaría en esa ruta —el Teide, Anaga, la Caldera
 * de Taburiente, el río Paraguay, Yacyretá—, cada cosa con su frase escrita a
 * mano en el diccionario, `ventanilla.<clave>`. Dónde está cada una no se
 * escribe a mano: sale de OpenStreetMap, con su identificador anotado al lado,
 * y los ríos de la línea de Natural Earth que dibuja el plano. Ver el ADR 0013.
 *
 * Se proyectan con `dondeCae` desde el origen del campo de casa, que es la
 * misma cuenta que coloca a los aeródromos vecinos: así el Teide cae donde el
 * relieve tiene el Teide.
 */

import FICHA from "../../data/hitos/destacados.json";
import { dondeCae, type Sitio } from "./entre-aerodromos";
import type { ClaseDeHito, Hito } from "./hitos";

/** Un punto del fichero: latitud, longitud y, si la tiene, su cota. */
type PuntoEnBruto = readonly [number, number, number?] | readonly number[];

/** Cómo viene cada uno en el fichero. */
export interface Destacado {
  /** La frase que lo cuenta: `ventanilla.<clave>` y `ventanilla.vos.<clave>`. */
  readonly clave: string;
  readonly nombre: string;
  readonly clase: ClaseDeHito;
  readonly zona: "canarias" | "paraguay";
  readonly peso: number;
  readonly alcance: number;
  readonly ele: number | null;
  /** De dónde salen las coordenadas: el elemento de OpenStreetMap o la fuente. */
  readonly de: string;
  readonly puntos: readonly PuntoEnBruto[];
}

/** La lista entera, tal cual está en el fichero. */
export const DESTACADOS: readonly Destacado[] = (
  FICHA as unknown as { destacados: readonly Destacado[] }
).destacados;

/**
 * Hasta dónde del campo de casa se ponen en el mundo, m.
 *
 * Cuatrocientos kilómetros: de Los Rodeos llega a Lanzarote y de Asunción a
 * las Cataratas, que son los vuelos más largos de cada sitio. Más allá no hay
 * ruta que pase cerca, y en Paraguay no se ponen los hitos de Canarias.
 */
const HASTA = 400_000;

/** Los destacados que caen cerca de este origen, en sus metros. */
export function destacadosDesde(origen: Sitio): Hito[] {
  const salida: Hito[] = [];
  for (const d of DESTACADOS) {
    const [primero, ...resto] = d.puntos.map((p) => {
      const { x, z } = dondeCae(origen, { lat: p[0]!, lon: p[1]! });
      return { x, z, ele: p[2] ?? d.ele };
    });
    if (!primero) continue;
    if (Math.hypot(primero.x, primero.z) > HASTA) continue;
    salida.push({
      nombre: d.nombre,
      clase: d.clase,
      x: primero.x,
      z: primero.z,
      ele: primero.ele,
      alcance: d.alcance,
      clave: d.clave,
      peso: d.peso,
      ...(resto.length ? { otros: resto } : {}),
    });
  }
  return salida;
}

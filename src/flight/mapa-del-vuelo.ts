/**
 * **El mapa del vuelo**, sin dibujo: dónde cae cada cosa en el mapa plano de la
 * pantalla del respaldo. Lo pinta `world/pantalla-del-respaldo.ts`.
 *
 * ## La proyección, a mano
 *
 * Longitud y latitud tal cual, a la misma escala las dos: la plate carrée, la
 * más simple que hay, y por eso una línea de cuenta y ninguna dependencia. Se
 * eligió mirando el camino, no por comodidad: es **lo que enseña el mapa**, que
 * la ortodrómica —el camino más corto sobre una pelota— en un mapa plano sale
 * curva. Con la de Mercator, la de casi todas las pantallas de avión, se aparta
 * de la recta un 2,5 % de lo que mide; con ésta, un 3,9 %, y siempre hacia el
 * mismo lado. Son unos veinticinco píxeles de barriga a mil de ancho: se ve sin
 * tener que buscarla.
 *
 * El encuadre está centrado en el camino y deja ver lo que lo sitúa: la
 * península y Canarias, África, el Atlántico entero, Brasil y el Paraguay.
 */

import type { Sitio } from "../world/entre-aerodromos";
import { DE_MADRID_A_ASUNCION, dondeVa, puntosDelCamino, puntoEn, type Ortodromica, type PerfilDelVuelo } from "./ruta-larga";

/** **Lo que abarca el mapa**, grados: 144 de ancho por 90 de alto, que es el 16:10 de la pantalla. */
export const ENCUADRE = { oeste: -103, este: 41, norte: 52, sur: -38 } as const;

/** Ancho entre alto de la pantalla y del mapa. */
export const PROPORCION_DEL_MAPA = (ENCUADRE.este - ENCUADRE.oeste) / (ENCUADRE.norte - ENCUADRE.sur);

/** Un punto del mapa, en fracciones: x de 0 a 1 hacia el este e y de 0 a 1 hacia el sur. */
export interface EnElMapa {
  readonly x: number;
  readonly y: number;
}

/** **La proyección**. Ver la cabecera. */
export function enElMapa(lon: number, lat: number): EnElMapa {
  return {
    x: (lon - ENCUADRE.oeste) / (ENCUADRE.este - ENCUADRE.oeste),
    y: (ENCUADRE.norte - lat) / (ENCUADRE.norte - ENCUADRE.sur),
  };
}

/** El mapa de un sitio. */
export const sitioEnElMapa = (s: Sitio): EnElMapa => enElMapa(s.lon, s.lat);

/**
 * **El camino en el mapa**, con lo recorrido de cada punto: la ortodrómica, cada
 * cien kilómetros, que a esta escala son seis píxeles y la curva no se quiebra.
 */
export function caminoEnElMapa(ruta: Ortodromica = DE_MADRID_A_ASUNCION): readonly (EnElMapa & { readonly recorrido: number })[] {
  return puntosDelCamino(ruta).map((p) => ({ ...sitioEnElMapa(p.sitio), recorrido: p.recorrido }));
}

/** El avión en el mapa: dónde, por dónde va del camino y hacia dónde apunta. */
export interface AvionEnElMapa extends EnElMapa {
  /** Lo recorrido, m. */
  readonly recorrido: number;
  /**
   * **Hacia dónde apunta en el mapa**, rad: cero hacia arriba y creciendo a la
   * derecha, como un rumbo. **No es el rumbo de verdad**: es la tangente del
   * camino ya dibujado, que un mapa plano tuerce, y un avión pintado de lado
   * respecto a su camino se lee mal.
   */
  readonly apunta: number;
}

/**
 * **Dónde va el avión** a `t` segundos del despegue. Sale de `dondeVa`: es el
 * mismo sitio que usa el salto bajo tapa, y el mapa no puede decir otra cosa.
 */
export function avionEnElMapa(perfil: PerfilDelVuelo, t: number): AvionEnElMapa {
  const donde = dondeVa(perfil, t);
  const ruta = perfil.ruta;
  const aqui = sitioEnElMapa(donde.sitio);
  // Veinte kilómetros a cada lado, sin salirse del camino: basta para la tangente.
  const a = sitioEnElMapa(puntoEn(ruta, Math.max(0, donde.recorrido - 20_000)));
  const b = sitioEnElMapa(puntoEn(ruta, Math.min(ruta.distancia, donde.recorrido + 20_000)));
  return {
    ...aqui,
    recorrido: donde.recorrido,
    apunta: Math.atan2((b.x - a.x) * PROPORCION_DEL_MAPA, a.y - b.y),
  };
}

/**
 * **Cuánto se aparta el camino de la recta** entre sus dos extremos, en
 * fracciones de lo que mide esa recta y con su signo. Es la cuenta de la cabecera,
 * y lo que comprueba la prueba: un camino recto en este mapa sería un mapa que no
 * enseña lo que dice.
 */
export function barrigaDelCamino(camino: readonly EnElMapa[] = caminoEnElMapa()): number {
  const a = camino[0]!;
  const b = camino[camino.length - 1]!;
  const dx = (b.x - a.x) * PROPORCION_DEL_MAPA;
  const dy = b.y - a.y;
  const largo = Math.hypot(dx, dy);
  let peor = 0;
  for (const p of camino) {
    const d = (dx * (p.y - a.y) - (p.x - a.x) * PROPORCION_DEL_MAPA * dy) / largo;
    if (Math.abs(d) > Math.abs(peor)) peor = d;
  }
  return peor / largo;
}

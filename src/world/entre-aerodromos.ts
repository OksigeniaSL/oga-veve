/**
 * Dónde cae un aeródromo visto desde otro.
 *
 * Hasta ahora todos los vuelos empiezan y acaban en el mismo sitio, y el mundo
 * de un escenario tiene un solo aeropuerto. Para poder ir a otro hace falta,
 * antes que nada, saber **dónde está** en las coordenadas del mundo en el que
 * se está volando. Eso es lo que hay aquí, y nada más: geometría, sin three.js,
 * sin escenario y sin terreno.
 *
 * ## La misma proyección que el extractor, y eso importa
 *
 * Los aeródromos vienen de `scripts/osm-a-aerodromo.mjs`, que proyecta cada
 * campo con una equirrectangular local centrada en el propio campo: el este en
 * metros y el norte en metros. Si aquí se usara otra —una Mercator, por
 * ejemplo— el segundo aeropuerto caería en un sitio ligeramente distinto del
 * que dice su propia geometría, y la pista no coincidiría con su umbral.
 *
 * Así que se repite la de allí, con las mismas diez líneas y el mismo radio.
 * Su error en la esquina de un escenario de catorce kilómetros son unos cuatro
 * metros; a setenta kilómetros crece, y por eso se centra en el **punto medio**
 * de los dos campos y no en el de salida. Ver `dondeCae`.
 *
 * ## Y el eje Z va al revés
 *
 * En el mundo del juego `x` es el este y `z` es el **sur**: `z = -norte`. Es la
 * convención de three.js con la cámara mirando a -Z, y la que ya usa el resto
 * del mundo. Meter el signo aquí y no en cada sitio que lo use es lo que evita
 * que aparezca a veces sí y a veces no.
 */

/** Radio terrestre medio, m. El mismo que usa el extractor de aeródromos. */
const R = 6371008;

const enRadianes = (grados: number): number => (grados * Math.PI) / 180;

export interface Sitio {
  readonly lat: number;
  readonly lon: number;
}

/**
 * Dónde cae `destino` en el mundo cuyo origen es `salida`, en metros.
 *
 * El factor de la longitud se toma en la **latitud media de los dos**, no en la
 * de salida. Con los dos campos encima no se nota, pero a setenta kilómetros de
 * distancia norte-sur la diferencia de coseno ya vale decenas de metros, y un
 * umbral de pista desplazado decenas de metros es un umbral en el sitio
 * equivocado.
 */
export function dondeCae(
  salida: Sitio,
  destino: Sitio,
): { x: number; z: number } {
  const k = Math.cos(enRadianes((salida.lat + destino.lat) / 2));
  return {
    x: R * enRadianes(destino.lon - salida.lon) * k,
    z: -R * enRadianes(destino.lat - salida.lat),
  };
}

/** Los metros que hay entre dos campos, por esa misma proyección. */
export function distanciaEntre(a: Sitio, b: Sitio): number {
  const { x, z } = dondeCae(a, b);
  return Math.hypot(x, z);
}

/**
 * El rumbo **verdadero** de `salida` a `destino`, en grados de 0 a 360.
 *
 * Verdadero y no magnético: el magnético es cosa de quien lo pinte, que es
 * quien sabe la declinación del sitio. Ver `magneticVariation` en
 * `scenarios.ts`.
 *
 * Cero es el norte y noventa el este, como en cualquier compás — y no como el
 * `Math.atan2` de la trigonometría, que empieza en el este y gira al revés.
 * Esa conversión es la que se equivoca sola si se escribe en cada sitio.
 */
export function rumboHacia(salida: Sitio, destino: Sitio): number {
  const { x, z } = dondeCae(salida, destino);
  const grados = (Math.atan2(x, -z) * 180) / Math.PI;
  return (grados + 360) % 360;
}

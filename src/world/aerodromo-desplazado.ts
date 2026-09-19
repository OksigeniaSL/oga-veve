/**
 * El mismo aeródromo, corrido hasta donde cae en el mundo en el que se vuela.
 *
 * Volar a otro aeropuerto ya funcionaba —`MundoVecino` instancia su escenario
 * entero y lo cuelga de la escena a su distancia— pero **el plan de tierra se
 * quedaba en casa**. Contado jugando después de aterrizar fuera: «así se ve el
 * aeropuerto: no hay coche, no sé la ruta a mi hangar». Y era exacto: la raya
 * verde, el coche del sígame y el señalero salen del grafo de rodaje del
 * aeródromo de salida, que a sesenta kilómetros de allí no tiene nada que
 * decir.
 *
 * Lo que falta para arreglarlo es poco y es esto: el aeródromo del vecino con
 * sus coordenadas puestas en el mundo de salida. A partir de ahí el grafo, los
 * puestos, los puntos de espera y el dibujo de la ruta valen tal cual, porque
 * todo eso ya sabe trabajar con un aeródromo cualquiera.
 *
 * ## El cambio de signo, que no es un descuido
 *
 * En el fichero del aeródromo la Y apunta al **norte**; en la escena el norte
 * es la Z **negativa**. Así que un desplazamiento de mundo `(dx, dz)` se
 * aplica a los puntos del aeródromo como `(dx, -dz)`. Es la misma conversión
 * que hace el terreno al colocar los umbrales, escrita aquí una vez más porque
 * es justo donde se equivoca uno.
 */

import type { Aerodrome, Punto } from "./aerodrome";

/**
 * El aeródromo con todos sus puntos corridos `(dx, dz)` en coordenadas de
 * mundo.
 *
 * No toca `origin`: esas son latitud y longitud, y siguen siendo las de allí.
 * Lo que cambia es dónde cae todo eso visto desde el campo de salida.
 */
export function desplazarAerodromo(
  aero: Aerodrome,
  dx: number,
  dz: number,
): Aerodrome {
  // Ver la nota de arriba sobre el signo de la Y.
  const dy = -dz;
  const p = (q: Punto): Punto => [q[0] + dx, q[1] + dy];
  const lista = (qs: readonly Punto[]): Punto[] => qs.map(p);
  return {
    ...aero,
    runways: aero.runways.map((r) => ({
      ...r,
      centerline: lista(r.centerline),
      thresholds: Object.fromEntries(
        Object.entries(r.thresholds).map(([k, u]) => [
          k,
          u ? { ...u, xy: u.xy ? p(u.xy) : null } : null,
        ]),
      ),
    })),
    taxiways: aero.taxiways.map((t) => ({ ...t, path: lista(t.path) })),
    aprons: aero.aprons.map((a) => ({ ...a, polygon: lista(a.polygon) })),
    buildings: aero.buildings.map((b) => ({ ...b, polygon: lista(b.polygon) })),
    windsocks: lista(aero.windsocks),
    holdingPositions: aero.holdingPositions.map((h) => ({
      ...h,
      xy: p(h.xy),
    })),
    parkingPositions: aero.parkingPositions?.map((k) => ({
      ...k,
      xy: p(k.xy),
    })),
    visualAids: aero.visualAids?.map((v) => ({ ...v, xy: p(v.xy) })),
  };
}

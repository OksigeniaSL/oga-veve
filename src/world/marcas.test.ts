/**
 * Que la pintura de la pista llegue de punta a punta.
 *
 * Se mide **sobre la geometría que se dibuja**, no sobre la fórmula que la
 * genera. Un comprobador que repite la cuenta que quiere comprobar da siempre
 * el visto bueno, y eso ya nos ha pasado.
 *
 * Lo que destapó esta prueba: en Tenerife Norte el eje discontinuo se quedaba
 * a 413 metros del extremo de la 30, que es por donde se despega. Las
 * distancias de las marcas se cuentan desde el umbral y `sobreElEje` las
 * contaba desde donde empieza la polilínea de OpenStreetMap — y en Tenerife
 * esas dos cosas se llevan 86 metros por un lado y 223 por el otro.
 */

import { describe, expect, it } from 'vitest';
import { Mesh } from 'three';
import { createAerodrome, type Aerodrome } from './aerodrome';
import gcxo from '../../data/aerodromes/gcxo.aero.json';
import sgas from '../../data/aerodromes/sgas.aero.json';

/** Hasta dónde llega la pintura a lo largo del eje, medido desde cada umbral. */
function alcanceDeLaPintura(aero: Aerodrome): {
  largo: number;
  desdeUnUmbral: number;
  desdeElOtro: number;
} {
  const grupo = createAerodrome(aero, 0);
  const pintura: number[] = [];
  grupo.traverse((o) => {
    if (o instanceof Mesh && o.name === 'pintura') {
      const pos = o.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) pintura.push(pos.getX(i), pos.getZ(i));
    }
  });
  expect(pintura.length).toBeGreaterThan(0);

  const pista = aero.runways[0]!;
  const umbrales = Object.values(pista.thresholds).flatMap((t) => (t?.xy ? [t.xy] : []));
  const [a, b] = umbrales as [readonly [number, number], readonly [number, number]];
  // Del fichero al mundo: el norte del fichero es la Z negativa del mundo.
  const ax = a[0];
  const az = -a[1];
  const largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / largo;
  const uz = (-b[1] - az) / largo;

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < pintura.length; i += 2) {
    const d = (pintura[i]! - ax) * ux + (pintura[i + 1]! - az) * uz;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { largo, desdeUnUmbral: min, desdeElOtro: largo - max };
}

describe('la pintura de la pista', () => {
  for (const [nombre, aero] of [
    ['Tenerife Norte', gcxo],
    ['Silvio Pettirossi', sgas],
  ] as const) {
    it(`${nombre}: llega a las dos cabeceras`, () => {
      const r = alcanceDeLaPintura(aero as unknown as Aerodrome);
      // Las teclas de piano se pintan a dieciséis metros del umbral, así que la
      // pintura tiene que empezar ahí o antes por los dos lados. Con el fallo,
      // por un extremo empezaba a más de cuatrocientos.
      expect(r.desdeUnUmbral).toBeLessThan(40);
      expect(r.desdeElOtro).toBeLessThan(40);
    });

    it(`${nombre}: y no se sale del asfalto`, () => {
      const r = alcanceDeLaPintura(aero as unknown as Aerodrome);
      // Las líneas de borde **siguen al asfalto**, y el asfalto es más largo
      // que la distancia entre umbrales: en Tenerife, 3.390 metros contra
      // 3.168. Esos 223 de más son apartaderos y accesos que OpenStreetMap
      // mapea como parte de la pista, y pintarles su línea de borde es lo
      // correcto — lo que no lo era es pintar allí el eje discontinuo.
      expect(r.desdeUnUmbral).toBeGreaterThan(-260);
      expect(r.desdeElOtro).toBeGreaterThan(-260);
    });
  }
});

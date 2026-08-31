/**
 * El grafo de rodaje, con los aeropuertos de verdad.
 *
 * Se prueba con Silvio Pettirossi y Tenerife Norte y no con un caso de
 * juguete, porque todo lo que puede salir mal aquí sale mal por culpa de los
 * datos reales: empalmes dibujados con medio metro de diferencia, calles que
 * se cruzan por el medio sin terminar ahí, y trozos sueltos que no llevan a
 * ninguna parte. Un grafo que funciona con dos rectas perfectas no demuestra
 * nada.
 */

import { describe, expect, it } from 'vitest';
import sgas from '../../data/aerodromes/sgas.aero.json';
import gcxo from '../../data/aerodromes/gcxo.aero.json';
import { construirGrafo, nudoCercano, rodajeEntre, rutaEntre } from './rodaje';
import type { Aerodrome } from './aerodrome';

const AERODROMOS = [
  ['Silvio Pettirossi', sgas as unknown as Aerodrome],
  ['Tenerife Norte', gcxo as unknown as Aerodrome],
] as const;

describe.each(AERODROMOS)('el grafo de %s', (_nombre, aero) => {
  const grafo = construirGrafo(aero);

  it('tiene nudos y tramos', () => {
    expect(grafo.nudos.length).toBeGreaterThan(10);
    expect(grafo.tramos.length).toBeGreaterThan(10);
  });

  it('no tiene tramos que empiecen y acaben en el mismo nudo', () => {
    expect(grafo.tramos.filter((t) => t.a === t.b)).toEqual([]);
  });

  it('es una sola pieza: desde cualquier nudo se llega a todos', () => {
    // Este es el test que importa de todo el fichero. Antes del nodado en T,
    // Tenerife Norte salía en diecinueve trozos incomunicados y el mayor tenía
    // siete nudos de cuarenta y cinco. Con el grafo así, ninguna ruta de
    // rodaje existe y toda la lección de rodar se cae.
    let alcanzados = 0;
    for (let i = 0; i < grafo.nudos.length; i++) {
      if (rutaEntre(grafo, 0, i)) alcanzados++;
    }
    expect(alcanzados).toBe(grafo.nudos.length);
  });

  it('lleva de un estacionamiento a un punto de espera', () => {
    // Es la ruta del juego: salir del puesto y llegar a la doble raya.
    const puesto = aero.parkingPositions?.[0];
    const espera = aero.holdingPositions[0];
    expect(puesto).toBeTruthy();
    expect(espera).toBeTruthy();
    const ruta = rodajeEntre(grafo, puesto!.xy, espera!.xy);
    expect(ruta).not.toBeNull();
    expect(ruta!.largo).toBeGreaterThan(50);

    // **Empieza en el puesto y acaba en la doble raya**, no en los nudos más
    // cercanos a cada uno. Un puesto puede estar a cien metros de la calle más
    // próxima, y con la ruta naciendo en el nudo, el juego decía «volvé a la
    // raya verde» antes de que nadie se hubiera movido.
    const cerca = (a: readonly number[], b: readonly number[]) =>
      Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!);
    expect(cerca(ruta!.puntos[0]!, puesto!.xy)).toBeLessThan(1);
    expect(cerca(ruta!.puntos[ruta!.puntos.length - 1]!, espera!.xy)).toBeLessThan(1);
    // Y el nudo por el que se entra a la red sigue estando cerca del puesto:
    // si no, es que se ha enganchado a una calle del otro lado del aeropuerto.
    expect(nudoCercano(grafo, puesto!.xy).distancia).toBeLessThan(220);
  });

  it('la ruta se puede recorrer: cada tramo empieza donde acabó el anterior', () => {
    // No vale medir la distancia entre vértices consecutivos: una calle
    // paralela simplificada es un solo segmento recto de setecientos ochenta y
    // cuatro metros, y eso es correcto. Lo que no puede pasar es que un tramo
    // empiece lejos de donde terminó el anterior — eso sí sería el avión
    // teletransportándose.
    const puesto = aero.parkingPositions![0]!;
    const espera = aero.holdingPositions[0]!;
    const ruta = rodajeEntre(grafo, puesto.xy, espera.xy)!;
    const costuras: number[] = [];
    for (let i = 0; i < ruta.tramos.length - 1; i++) {
      const fin = ruta.tramos[i]!.puntos[ruta.tramos[i]!.puntos.length - 1]!;
      const inicio = ruta.tramos[i + 1]!.puntos[0]!;
      costuras.push(Math.hypot(fin[0] - inicio[0], fin[1] - inicio[1]));
    }
    for (const c of costuras) expect(c).toBeLessThan(13);
  });

});

describe('la ruta', () => {
  const grafo = construirGrafo(sgas as unknown as Aerodrome);

  it('de un sitio a sí mismo no va a ninguna parte', () => {
    const r = rutaEntre(grafo, 3, 3);
    expect(r).toEqual({ tramos: [], puntos: [], largo: 0, letras: [] });
  });

  it('no inventa camino desde un punto que está lejos de todo', () => {
    const espera = (sgas as unknown as Aerodrome).holdingPositions[0]!;
    expect(rodajeEntre(grafo, [90000, 90000], espera.xy)).toBeNull();
  });

  it('dice las letras por las que se pasa, sin repetir seguidas', () => {
    const aero = sgas as unknown as Aerodrome;
    const r = rodajeEntre(grafo, aero.parkingPositions![0]!.xy, aero.holdingPositions[0]!.xy)!;
    expect(r.letras.length).toBeGreaterThan(0);
    for (let i = 1; i < r.letras.length; i++) {
      expect(r.letras[i]).not.toBe(r.letras[i - 1]);
    }
  });
});

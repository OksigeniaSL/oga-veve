/**
 * El PAPI tiene que decir la verdad, y la verdad es un ángulo.
 *
 * Es el único instrumento del juego que se lee sin saber leer, así que si
 * miente miente a un niño que se está fiando de un color. Estas pruebas ponen
 * el avión alto, bajo y en la senda, y miran de qué color se ven las cuatro.
 */

import { describe, expect, it } from 'vitest';
import { Color, type InstancedMesh } from 'three';
import { crearAproximacion } from './aproximacion';
import type { Pista, Umbral } from './aerodrome';

const umbral = (xy: [number, number], headingTrue: number): Umbral => ({
  elevM: 0,
  headingTrue,
  displacedM: 0,
  xy,
});

/** Una pista recta de tres kilómetros, con el umbral 09 en el origen. */
const PISTA: Pista = {
  ref: '09/27',
  widthM: 45,
  surface: 'asphalt',
  lit: true,
  centerline: [
    [0, 0],
    [3000, 0],
  ],
  thresholds: { '09': umbral([0, 0], 90), '27': umbral([3000, 0], 270) },
  magneticVariation: 0,
};

/** Cuántas de las cuatro se ven blancas, mirando desde ese punto. */
function blancas(x: number, y: number, z: number): number {
  const a = crearAproximacion(PISTA, '09', () => 0);
  if (!a) throw new Error('no se montó la aproximación');
  a.mirarDesde(x, y, z);
  const papi = a.grupo.getObjectByName('papi') as InstancedMesh;
  const c = new Color();
  let n = 0;
  for (let k = 0; k < 4; k++) {
    papi.getColorAt(k, c);
    // El blanco de luz es cálido pero sigue teniendo mucho azul; el rojo, poco.
    if (c.b > 0.5) n++;
  }
  return n;
}

/**
 * A qué altura hay que estar para ver la pista bajo un ángulo dado.
 *
 * El PAPI está trescientos metros pista adentro, así que desde `d` metros por
 * delante del umbral la distancia a las luces es `d + 300`.
 */
const alturaPara = (grados: number, d: number): number =>
  Math.tan((grados * Math.PI) / 180) * (d + 300) + 1;

describe('el PAPI', () => {
  it('en la senda de tres grados se ven dos blancas y dos rojas', () => {
    // El eje de la pista va hacia +x, y el mundo tiene la Z al revés que la Y
    // del aeródromo, así que el avión en final está en x negativa y z cero.
    expect(blancas(-2000, alturaPara(3, 2000), 0)).toBe(2);
  });

  it('viniendo alto se ven las cuatro blancas', () => {
    expect(blancas(-2000, alturaPara(5, 2000), 0)).toBe(4);
  });

  it('viniendo bajo se ven las cuatro rojas', () => {
    expect(blancas(-2000, alturaPara(1.5, 2000), 0)).toBe(0);
  });

  it('un poco alto es tres blancas, y un poco bajo es una', () => {
    expect(blancas(-2000, alturaPara(3.3, 2000), 0)).toBe(3);
    expect(blancas(-2000, alturaPara(2.7, 2000), 0)).toBe(1);
  });

  it('la senda es un ángulo, no una altura: vale igual de cerca que de lejos', () => {
    expect(blancas(-800, alturaPara(3, 800), 0)).toBe(2);
    expect(blancas(-5000, alturaPara(3, 5000), 0)).toBe(2);
  });
});

describe('las luces de aproximación', () => {
  it('van por delante del umbral por el que se entra, no por el otro', () => {
    const a = crearAproximacion(PISTA, '09', () => 0);
    const fila = a!.grupo.getObjectByName('luces-aproximacion') as InstancedMesh;
    // Todas en x negativa: fuera de la pista, que empieza en cero y va a +3000.
    let dentro = 0;
    for (let k = 0; k < fila.count; k++) {
      const m = fila.instanceMatrix.array as Float32Array;
      if (m[k * 16 + 12]! > 0) dentro++;
    }
    expect(dentro).toBe(0);
  });

  it('se mudan al otro extremo cuando cambia la cabecera en uso', () => {
    const a = crearAproximacion(PISTA, '27', () => 0);
    const fila = a!.grupo.getObjectByName('luces-aproximacion') as InstancedMesh;
    let antes = 0;
    for (let k = 0; k < fila.count; k++) {
      const m = fila.instanceMatrix.array as Float32Array;
      if (m[k * 16 + 12]! < 3000) antes++;
    }
    expect(antes).toBe(0);
  });

  it('llegan a los cuatrocientos veinte metros, que es lo que mide una fila', () => {
    const a = crearAproximacion(PISTA, '09', () => 0);
    const fila = a!.grupo.getObjectByName('luces-aproximacion') as InstancedMesh;
    let masLejos = 0;
    for (let k = 0; k < fila.count; k++) {
      const m = fila.instanceMatrix.array as Float32Array;
      masLejos = Math.min(masLejos, m[k * 16 + 12]!);
    }
    expect(masLejos).toBeCloseTo(-420, 0);
  });
});

/**
 * Y dónde se plantan las cuatro luces, que hasta hoy era una suposición.
 *
 * Estas pruebas van contra los ficheros de verdad y no contra una pista de
 * mentira, porque lo que se comprueba es precisamente que se lea bien lo que
 * OpenStreetMap trae — y lo que trae es distinto en cada aeródromo:
 *
 * | aeródromo | nodos `navigationaid` | con valor |
 * |---|---|---|
 * | La Palma | 16 | los 16, `papi`, a los dos costados |
 * | Cuatro Vientos | 1 | `papi`, a 162 m del umbral |
 * | Tenerife Norte | 16 | **ninguno**: son luces de aproximación |
 * | Asunción | 0 | — |
 */
import GCLA from '../../data/aerodromes/gcla.aero.json';
import GCXO from '../../data/aerodromes/gcxo.aero.json';
import LECU from '../../data/aerodromes/lecu.aero.json';
import { sitiarPapi, type AyudaVisual } from './aproximacion';
import type { Aerodrome, Punto } from './aerodrome';

/** El umbral, el eje hacia dentro y el largo de una pista de un fichero. */
function pistaDe(aero: Aerodrome, cabecera: string) {
  const pista = aero.runways.find((p) => p.thresholds[cabecera]?.xy)!;
  const nombres = Object.keys(pista.thresholds).filter(
    (n) => pista.thresholds[n]?.xy,
  );
  const entrada = pista.thresholds[cabecera]!.xy!;
  const otro = pista.thresholds[nombres.find((n) => n !== cabecera)!]!.xy!;
  const largo = Math.hypot(otro[0] - entrada[0], otro[1] - entrada[1]);
  const eje: [number, number] = [
    (otro[0] - entrada[0]) / largo,
    (otro[1] - entrada[1]) / largo,
  ];
  return { entrada, eje, largo, ancho: pista.widthM ?? 45 };
}

/** Cada luz, en metros pista adentro y a qué costado. Positivo es izquierda. */
const enPista = (
  luces: readonly Punto[],
  entrada: Punto,
  eje: readonly [number, number],
) =>
  luces.map((l) => {
    const px = l[0] - entrada[0];
    const py = l[1] - entrada[1];
    return {
      adentro: px * eje[0] + py * eje[1],
      lado: -eje[1] * px + eje[0] * py,
    };
  });

describe('dónde se planta el PAPI', () => {
  it('sin ayudas en el fichero, se calcula: trescientos metros y a la izquierda', () => {
    const s = sitiarPapi([0, 0], [1, 0], 45, 3000);
    expect(s.origen).toBe('calculado');
    expect(s.luces).toHaveLength(4);
    const p = enPista(s.luces, [0, 0], [1, 0]);
    expect(p.every((l) => Math.abs(l.adentro - 300) < 0.001)).toBe(true);
    // A la izquierda, y las cuatro separadas nueve metros hacia fuera. Sale
    // a menos de metro y medio de lo que hay medido en La Palma.
    expect(p.map((l) => Math.round(l.lado))).toEqual([38, 47, 56, 65]);
  });

  it('en La Palma coge las cuatro luces medidas, no las calculadas', () => {
    const aero = GCLA as unknown as Aerodrome;
    const { entrada, eje, largo, ancho } = pistaDe(aero, '18');
    const s = sitiarPapi(entrada, eje, ancho, largo, aero.visualAids);
    expect(s.origen).toBe('osm');
    const p = enPista(s.luces, entrada, eje);
    // A 297 m del umbral, que no son los trescientos de la cuenta.
    expect(p.every((l) => Math.abs(l.adentro - 297) < 2)).toBe(true);
    // Y al costado izquierdo, que es el que se mira desde la aproximación.
    expect(p.every((l) => l.lado > 0)).toBe(true);
    expect(p.map((l) => Math.round(l.lado))).toEqual([37, 46, 55, 63]);
  });

  it('y no se lleva por delante el PAPI del umbral contrario', () => {
    const aero = GCLA as unknown as Aerodrome;
    const { entrada, eje, largo, ancho } = pistaDe(aero, '18');
    const s = sitiarPapi(entrada, eje, ancho, largo, aero.visualAids);
    // El del 36 está a mil novecientos metros y mirando al revés. Sin el tope
    // de media pista entraría en la cuenta y saldrían luces por todos lados.
    expect(
      enPista(s.luces, entrada, eje).every((l) => l.adentro < 900),
    ).toBe(true);
  });

  it('en Cuatro Vientos un solo nodo ya dice el costado y la distancia', () => {
    const aero = LECU as unknown as Aerodrome;
    const { entrada, eje, largo, ancho } = pistaDe(aero, '27');
    const s = sitiarPapi(entrada, eje, ancho, largo, aero.visualAids);
    expect(s.origen).toBe('osm');
    const p = enPista(s.luces, entrada, eje);
    // Ciento sesenta y dos, no trescientos: la mitad de cerca de lo que
    // suponíamos, en una pista que además es más corta.
    expect(p[0]!.adentro).toBeCloseTo(162, 0);
    expect(p.every((l) => l.lado > 0)).toBe(true);
    expect(p.map((l) => Math.round(l.lado))).toEqual([29, 38, 47, 56]);
  });

  it('en Tenerife Norte los nodos no dicen qué son, así que no se tocan', () => {
    const aero = GCXO as unknown as Aerodrome;
    const { entrada, eje, largo, ancho } = pistaDe(aero, '12');
    expect(aero.visualAids).toHaveLength(16);
    expect(aero.visualAids!.every((a) => a.tipo === null)).toBe(true);
    // Son una barra cruzada de luces de aproximación a 225 m del umbral 30.
    // Tomarlas por PAPI sería enseñar una senda de planeo inventada.
    const s = sitiarPapi(entrada, eje, ancho, largo, aero.visualAids);
    expect(s.origen).toBe('calculado');
  });

  it('un nodo pegado al eje o fuera del campo no cuenta', () => {
    const fuera: AyudaVisual[] = [
      { tipo: 'papi', xy: [300, 5] },
      { tipo: 'papi', xy: [300, 900] },
      { tipo: 'papi', xy: [10, 40] },
    ];
    expect(sitiarPapi([0, 0], [1, 0], 45, 3000, fuera).origen).toBe(
      'calculado',
    );
  });
});

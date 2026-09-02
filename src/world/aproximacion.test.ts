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

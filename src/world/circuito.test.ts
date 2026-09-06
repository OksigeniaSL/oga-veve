/**
 * El circuito, medido.
 *
 * Es una figura con cuatro esquinas y todas las cuentas de un circuito salen
 * de dos vectores —hacia dónde se despega y qué es la izquierda desde ahí—,
 * que es exactamente la clase de cuenta que sale del revés sin que nadie se
 * entere: un signo cambiado pone el viento en cola al otro lado y el juego
 * enseña a dar la vuelta por donde no se da.
 */

import { describe, expect, it } from 'vitest';
import {
  ALTURA_DE_CIRCUITO,
  crearCircuito,
  verticesDelCircuito,
} from './circuito';

/** Una pista mirando al este, centrada en el origen y a cota cero. */
const PISTA = { x: 0, z: 0, heading: 90, length: 1000 };

describe('el circuito de tráfico', () => {
  it('da la vuelta por la izquierda', () => {
    const v = verticesDelCircuito(PISTA, 0);
    // Despegando hacia el este, la izquierda es el norte, y el norte es la Z
    // negativa. Las dos esquinas de allá tienen que estar ahí.
    expect(v[2]!.z).toBeLessThan(-500);
    expect(v[3]!.z).toBeLessThan(-500);
  });

  it('sube, se mantiene y baja', () => {
    const v = verticesDelCircuito(PISTA, 140);
    // Empieza en la pista y llega a la altura de circuito antes de girar.
    expect(v[0]!.y).toBe(140);
    expect(v[1]!.y).toBe(140 + ALTURA_DE_CIRCUITO);
    expect(v[2]!.y).toBe(140 + ALTURA_DE_CIRCUITO);
    expect(v[3]!.y).toBe(140 + ALTURA_DE_CIRCUITO);
    // Y la base baja hasta engancharse con la senda de los aros.
    expect(v[4]!.y).toBeGreaterThan(140 + 80);
    expect(v[4]!.y).toBeLessThan(140 + 110);
  });

  it('acaba en el eje de la pista, no al lado', () => {
    const v = verticesDelCircuito(PISTA, 0);
    // Volando al este, el eje es Z = 0.
    expect(Math.abs(v[4]!.z)).toBeLessThan(1);
    // Y por delante de la cabecera de salida, o sea al oeste de ella.
    expect(v[4]!.x).toBeLessThan(-PISTA.length / 2);
  });

  it('el viento en cola va al revés que el despegue', () => {
    const v = verticesDelCircuito(PISTA, 0);
    // Se despega hacia el este; en cola se vuela hacia el oeste.
    expect(v[3]!.x).toBeLessThan(v[2]!.x);
  });

  it('dice en qué tramo estás', () => {
    const c = crearCircuito(PISTA, 0);
    const [, subida, esquina, base] = c.vertices;
    // A media subida, sobre el eje y pasada la pista.
    expect(c.tramoEn(subida!.x - 200, subida!.z)).toBe('subida');
    // A mitad del viento en cola.
    expect(
      c.tramoEn((esquina!.x + base!.x) / 2, (esquina!.z + base!.z) / 2),
    ).toBe('encola');
    c.dispose();
  });

  it('y calla si andás lejos', () => {
    const c = crearCircuito(PISTA, 0);
    expect(c.tramoEn(20000, 20000)).toBeNull();
    c.dispose();
  });
});

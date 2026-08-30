/**
 * Tests de la entrada por teclado.
 *
 * Existen por un fallo concreto: el cabeceo estaba invertido y la flecha
 * arriba clavaba el avión contra la pista. Se coló porque las teclas se
 * pasaban por posición a una función genérica, el táctil y el mando sí
 * estaban bien, y nada de esto se probaba sin navegador.
 */

import { describe, expect, it } from 'vitest';
import { axisFromKeys } from './input';

const PITCH_UP = ['ArrowUp', 'KeyW'];
const PITCH_DOWN = ['ArrowDown', 'KeyS'];

describe('ejes de teclado', () => {
  it('flecha arriba sube el morro', () => {
    expect(axisFromKeys(new Set(['ArrowUp']), PITCH_UP, PITCH_DOWN)).toBe(1);
    expect(axisFromKeys(new Set(['KeyW']), PITCH_UP, PITCH_DOWN)).toBe(1);
  });

  it('flecha abajo baja el morro', () => {
    expect(axisFromKeys(new Set(['ArrowDown']), PITCH_UP, PITCH_DOWN)).toBe(-1);
    expect(axisFromKeys(new Set(['KeyS']), PITCH_UP, PITCH_DOWN)).toBe(-1);
  });

  it('sin teclas, el eje está centrado', () => {
    expect(axisFromKeys(new Set(), PITCH_UP, PITCH_DOWN)).toBe(0);
  });

  it('las dos direcciones a la vez se anulan', () => {
    expect(axisFromKeys(new Set(['ArrowUp', 'ArrowDown']), PITCH_UP, PITCH_DOWN)).toBe(0);
  });

  it('teclas ajenas no mueven nada', () => {
    expect(axisFromKeys(new Set(['KeyZ', 'Space']), PITCH_UP, PITCH_DOWN)).toBe(0);
  });
});

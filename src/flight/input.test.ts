/**
 * Tests de la entrada por teclado.
 *
 * Existen por un fallo concreto: el cabeceo estaba invertido y la flecha
 * arriba clavaba el avión contra la pista. Se coló porque las teclas se
 * pasaban por posición a una función genérica, el táctil y el mando sí
 * estaban bien, y nada de esto se probaba sin navegador.
 */

import { describe, expect, it } from 'vitest';
import { axisFromKeys, releasesTouchThrottle } from './input';

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

describe('el motor no se queda agarrado', () => {
  it('el teclado le quita el mando a la palanca táctil', () => {
    expect(releasesTouchThrottle(1, 0)).toBe(true);
    expect(releasesTouchThrottle(-1, 0)).toBe(true);
  });

  it('los botones de pantalla también', () => {
    expect(releasesTouchThrottle(0, 1)).toBe(true);
    expect(releasesTouchThrottle(0, -1)).toBe(true);
  });

  /**
   * Y sin tocar nada, la palanca se queda donde la dejaste. Es lo que la
   * hace una palanca de gases y no un botón, y es la razón por la que no
   * basta con soltarla siempre.
   */
  it('sin tocar nada, la palanca sigue mandando', () => {
    expect(releasesTouchThrottle(0, 0)).toBe(false);
  });
});

describe('el motor se maneja en cualquier teclado', () => {
  /**
   * El fallo que lo motivó: `event.code` nombra la tecla del teclado
   * americano. En un teclado español el «−» está donde el americano tiene la
   * barra, así que reportaba `Slash` y no coincidía con nada. Y el «+»
   * parecía funcionar de casualidad, porque se escribe con Mayúsculas y
   * Mayúsculas sube gas. Resultado: en media Europa se podía acelerar y no
   * se podía frenar el motor.
   */
  const SUBE = ['Equal', 'NumpadAdd', 'ShiftLeft', 'ShiftRight', '+'];
  const BAJA = ['Minus', 'NumpadSubtract', 'ControlLeft', 'ControlRight', '-'];

  it('baja con el carácter, esté donde esté la tecla', () => {
    expect(axisFromKeys(new Set(['Slash', '-']), SUBE, BAJA)).toBe(-1);
  });

  it('sube con el carácter', () => {
    expect(axisFromKeys(new Set(['BracketRight', '+']), SUBE, BAJA)).toBe(1);
  });

  it('sigue funcionando con la tecla física del teclado americano', () => {
    expect(axisFromKeys(new Set(['Minus']), SUBE, BAJA)).toBe(-1);
    expect(axisFromKeys(new Set(['Equal']), SUBE, BAJA)).toBe(1);
  });
});

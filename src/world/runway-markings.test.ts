/**
 * El número de una pista es su rumbo magnético en decenas. Es de las cosas
 * más bonitas que tiene la aviación —un número pintado en el suelo que *es*
 * un rumbo— y una de las que este juego puede enseñar sin decir nada: al
 * alinearse, el HDG del HUD coincide con lo que hay pintado delante.
 */

import { describe, expect, it } from 'vitest';
import { designator } from './runway-markings';

describe('designador de pista', () => {
  it('son las decenas del rumbo, con cero a la izquierda', () => {
    expect(designator(90)).toBe('09');
    expect(designator(270)).toBe('27');
    expect(designator(40)).toBe('04');
  });

  it('redondea a la decena más cercana, como en la realidad', () => {
    expect(designator(275)).toBe('28');
    expect(designator(274)).toBe('27');
  });

  it('el norte es la 36 y no la 00', () => {
    expect(designator(0)).toBe('36');
    expect(designator(360)).toBe('36');
    expect(designator(358)).toBe('36');
  });

  it('las dos cabeceras de una pista se diferencian en dieciocho', () => {
    for (const heading of [0, 45, 90, 173, 240]) {
      const one = Number(designator(heading));
      const other = Number(designator((heading + 180) % 360));
      expect(Math.abs(one - other)).toBe(18);
    }
  });
});

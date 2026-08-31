/**
 * El número de una pista es su rumbo magnético en decenas. Es de las cosas
 * más bonitas que tiene la aviación —un número pintado en el suelo que *es*
 * un rumbo— y una de las que este juego puede enseñar sin decir nada: al
 * alinearse, el HDG del HUD coincide con lo que hay pintado delante.
 */

import { describe, expect, it } from 'vitest';
import { SCENARIOS } from './scenarios';
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

describe('el designador y el norte magnético', () => {
  /**
   * La trampa que destapó una pregunta mientras se volaba: «¿090° se
   * corresponde con una pista 60-27?». No: 090 es la 09, y su otra cabecera
   * la 27. Pero al comprobarlo apareció algo peor — nuestro cálculo usaba el
   * rumbo verdadero, y el número de una pista es su rumbo **magnético**.
   */
  it('las dos cabeceras se diferencian siempre en 18', () => {
    for (const rumbo of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const a = Number(designator(rumbo));
      const b = Number(designator(rumbo + 180));
      expect(Math.abs(a - b)).toBe(18);
    }
  });

  it('no hay pistas por encima de 36', () => {
    for (let r = 0; r < 360; r += 7) {
      const n = Number(designator(r));
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(36);
    }
  });

  it('con el rumbo verdadero de Asunción daría el número equivocado', () => {
    // El umbral 02 de Silvio Pettirossi apunta a 10° verdaderos. Sin sumarle
    // la declinación, saldría «01». Es la razón de que el designador de un
    // aeródromo real venga del fichero y no de esta función.
    expect(designator(10)).toBe('01');
    expect(designator(10 + 10)).toBe('02');
  });
});

describe('todos los escenarios pintan números posibles', () => {
  /**
   * La regla vale para los aeródromos reales y para los inventados. Un
   * escenario sin declinación enseñaría una relación entre rumbo y número que
   * no se cumple en ningún sitio del mundo, y quien la aprendiera aquí
   * tendría que desaprenderla.
   */
  const magnetico = (s: (typeof SCENARIOS)[number], verdadero: number) =>
    (verdadero + s.magneticVariation + 360) % 360;

  for (const escenario of SCENARIOS) {
    it(`${escenario.id}: declara declinación y sus dos cabeceras se diferencian en 18`, () => {
      expect(Number.isFinite(escenario.magneticVariation)).toBe(true);
      const a = Number(designator(magnetico(escenario, escenario.runway.heading)));
      const b = Number(designator(magnetico(escenario, escenario.runway.heading + 180)));
      expect(Math.abs(a - b)).toBe(18);
      for (const n of [a, b]) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(36);
      }
    });
  }
});

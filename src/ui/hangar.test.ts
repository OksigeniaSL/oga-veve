/**
 * El plano de la tarjeta.
 *
 * Se prueba la geometría y no el dibujo, porque la geometría es donde hemos
 * metido la pata diez veces: medir desde el punto de referencia del aeropuerto
 * en vez de desde lo que hay dibujado, que son dos cosas distintas y en Silvio
 * Pettirossi se llevan casi trescientos metros.
 */

import { describe, expect, it } from 'vitest';
import { caja, designador } from './hangar';
import { PETTIROSSI, SCENARIOS, TENERIFE_NORTE, VALLE_CORDILLERA } from '../world/scenarios';

describe('la caja de un escenario', () => {
  it('encierra la pista de Silvio Pettirossi, que mide 3,4 km', () => {
    const { lado } = caja(PETTIROSSI);
    // El lado es el mayor de los dos lados más un diez por ciento de margen.
    expect(lado).toBeGreaterThan(3300);
    expect(lado).toBeLessThan(4600);
  });

  it('está centrada en lo dibujado, no en el punto de referencia', () => {
    // El origen del fichero es el punto de referencia del aeropuerto, y en
    // Silvio Pettirossi no está ni en el centro de la pista ni en el de las
    // plataformas. Si el centro de la caja saliera en (0, 0), es que se está
    // midiendo desde donde no se debe.
    const { cx, cy } = caja(PETTIROSSI);
    expect(Math.hypot(cx, cy)).toBeGreaterThan(50);
  });

  it('deja el aeródromo mayor más grande que el menor', () => {
    // Es la única razón de que todas compartan escala: que se vea de un
    // vistazo cuál es la pista larga sin saber leer «3,4 km».
    expect(caja(PETTIROSSI).lado).toBeGreaterThan(caja(VALLE_CORDILLERA).lado);
  });

  it('no devuelve nada infinito para ningún escenario', () => {
    for (const escenario of SCENARIOS) {
      const c = caja(escenario);
      expect(Number.isFinite(c.cx)).toBe(true);
      expect(Number.isFinite(c.cy)).toBe(true);
      expect(c.lado).toBeGreaterThan(0);
    }
  });
});

describe('el designador de la tarjeta', () => {
  it('sale del fichero cuando el aeródromo es real', () => {
    // No se calcula: en Tenerife Norte el asfalto corre a 110,7° y la cabecera
    // pone 12, que no es lo que daría redondear el rumbo verdadero.
    expect(designador(TENERIFE_NORTE)).toBe('12/30');
    expect(designador(PETTIROSSI)).toBe('20/02');
  });

  it('en una pista inventada son dos números opuestos', () => {
    const [a, b] = designador(VALLE_CORDILLERA).split('/').map(Number);
    expect(Math.abs(((a! - b! + 36) % 36) - 18)).toBeLessThanOrEqual(1);
  });
});

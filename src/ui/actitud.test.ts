import { describe, expect, it } from 'vitest';
import { Quaternion, Euler, MathUtils } from 'three';
import { bankAngleOf, pitchAngleOf } from './actitud';

/** Cuaternión desde rumbo, cabeceo y alabeo en grados. */
function actitud(headingDeg: number, pitchDeg: number, bankDeg: number): Quaternion {
  return new Quaternion().setFromEuler(
    new Euler(
      MathUtils.degToRad(pitchDeg),
      MathUtils.degToRad(headingDeg),
      MathUtils.degToRad(bankDeg),
      'YXZ',
    ),
  );
}

const grados = (rad: number): number => (rad * 180) / Math.PI;

describe('actitud', () => {
  it('lee el cabeceo con el avión nivelado y al norte', () => {
    expect(grados(pitchAngleOf(actitud(0, 12, 0)))).toBeCloseTo(12, 4);
    expect(grados(pitchAngleOf(actitud(0, -8, 0)))).toBeCloseTo(-8, 4);
  });

  /**
   * La regresión que motivó este fichero. Con la fórmula anterior el cabeceo
   * salía multiplicado por el coseno del rumbo: cero al este y al oeste,
   * invertido al sur. Se detectó volando en un navegador de verdad, con el
   * horizonte marcando vuelo horizontal en pleno ascenso.
   */
  it('lee el mismo cabeceo mire adonde mire el avión', () => {
    for (const rumbo of [0, 45, 90, 135, 180, 225, 270, 315]) {
      expect(grados(pitchAngleOf(actitud(rumbo, 12, 0)))).toBeCloseTo(12, 4);
    }
  });

  it('lee el alabeo, positivo a la derecha, con cualquier rumbo', () => {
    for (const rumbo of [0, 90, 180, 270]) {
      expect(grados(bankAngleOf(actitud(rumbo, 0, -25)))).toBeCloseTo(25, 4);
      expect(grados(bankAngleOf(actitud(rumbo, 0, 25)))).toBeCloseTo(-25, 4);
    }
  });

  it('no confunde alabeo con cabeceo', () => {
    expect(grados(bankAngleOf(actitud(0, 20, 0)))).toBeCloseTo(0, 4);
    expect(grados(pitchAngleOf(actitud(0, 0, 20)))).toBeCloseTo(0, 4);
  });
});

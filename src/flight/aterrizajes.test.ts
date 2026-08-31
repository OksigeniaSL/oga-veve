/**
 * Tests de tomas y roturas.
 *
 * Existen por una frase de la primera persona que probó el juego: "para ser
 * el Arcade, ya me estrellé". Y tenía razón — los umbrales de rotura eran
 * constantes y no miraban la ayuda de vuelo, así que en Arcade se rompía
 * exactamente igual que en Piloto y el modo no significaba nada.
 *
 * Lo que se fija aquí no son cifras exactas sino la relación entre los dos
 * modos: Arcade tiene que perdonar de forma medible lo que Piloto no.
 */

import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { CoefficientFlightModel } from './fdm';
import { OGA_172 } from './aircraft';
import { neutralControls } from './model';

/** Suelta el avión desde cierta altura y devuelve cómo acabó la toma. */
function drop(height: number, assist: number, bankDegrees = 0) {
  const model = new CoefficientFlightModel({ aircraft: OGA_172, ground: () => 0, assist });
  model.reset({
    position: new Vector3(0, OGA_172.gearHeight + height, 0),
    heading: 0,
    airspeed: 34,
  });
  if (bankDegrees) {
    model.state.orientation.multiply(
      new Quaternion().setFromAxisAngle(new Vector3(0, 0, -1), (bankDegrees * Math.PI) / 180),
    );
  }

  const dt = 1 / 120;
  for (let i = 0; i < 1800; i++) {
    model.step(dt, { ...neutralControls(), throttle: 0 });
    if (model.state.onGround) break;
  }
  return model.state;
}

describe('el modo Arcade perdona y el modo Piloto no', () => {
  it('una caída larga rompe en Piloto y se aguanta en Arcade', () => {
    expect(drop(30, 0).crashed).toBe(true);
    expect(drop(30, 1).crashed).toBe(false);
  });

  it('un alabeo moderado en la toma rompe en Piloto y se aguanta en Arcade', () => {
    expect(drop(0.6, 0, 35).crashed).toBe(true);
    expect(drop(0.6, 1, 35).crashed).toBe(false);
  });

  it('hasta un alabeo fuerte se aguanta en Arcade', () => {
    // En Arcade el alabeo dejó de romper a propósito: apoyar una punta de
    // ala es un bote y un susto, no el final de la partida. Quien quiera que
    // eso importe, tiene el modo Piloto.
    expect(drop(0.6, 0, 70).crashed).toBe(true);
    expect(drop(0.6, 1, 70).crashed).toBe(false);
  });

  it('llegar boca abajo rompe también en Arcade', () => {
    // El límite de Arcade no es "nunca se rompe" sino "solo con una
    // barbaridad". Aterrizar invertido lo es.
    expect(drop(0.6, 1, 170).crashed).toBe(true);
  });

  it('una toma suave no rompe en ningún modo', () => {
    for (const assist of [0, 1]) {
      const state = drop(0.4, assist);
      expect(state.crashed).toBe(false);
      expect(state.touchdownSinkRate).toBeLessThan(3);
    }
  });
});

describe('registro de la toma', () => {
  it('una toma normalmente firme se queda en el suelo', () => {
    const state = drop(5, 1);
    expect(state.crashed).toBe(false);
    expect(state.velocity.y).toBeLessThan(0.1);
  });

  it('registra la velocidad de descenso de la toma', () => {
    // La necesita el sonido, que hace sonar distinto una llegada dura, y la
    // necesitará una misión que puntúe el aterrizaje.
    expect(drop(12, 0).touchdownSinkRate).toBeGreaterThan(drop(0.4, 0).touchdownSinkRate);
  });
});

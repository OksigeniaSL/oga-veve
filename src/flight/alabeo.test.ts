/**
 * Tests de respuesta en alabeo y guiñada.
 *
 * Existen por esto: "como pulse una de las dos derecha/izquierda aunque sea
 * un poquito, ya se descontrola y no hay manera de mantenerlo en su
 * horizontal". Tenía razón, y la causa era un error de unidades.
 *
 * Los coeficientes de mando publicados van **por radián de deflexión**, pero
 * el juego pasa un mando normalizado de -1 a 1. Usar el valor tabulado tal
 * cual multiplica la autoridad por el recorrido máximo en radianes, unas
 * tres veces. Ya había pasado con el elevador y se corrigió; en alerón y
 * timón se quedó sin revisar.
 *
 * Lo que se fija aquí es el ritmo de alabeo, que es lo que se siente al
 * pilotar y lo que hace que un avión sea manejable o no.
 */

import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { CoefficientFlightModel } from './fdm';
import { MAINUMBY, OGA_172, type AircraftConfig } from './aircraft';
import { neutralControls, type ControlInputs } from './model';

/** Ritmo de alabeo estabilizado, en grados por segundo, con mando a fondo. */
function steadyRollRate(aircraft: AircraftConfig, assist: number, aileron = 1): number {
  const model = new CoefficientFlightModel({ aircraft, ground: () => 0, assist });
  model.reset({ position: new Vector3(0, 1500, 0), heading: 0, airspeed: 45 });
  const controls: ControlInputs = { ...neutralControls(), throttle: 0.7, aileron };
  const dt = 1 / 240;
  // Tres segundos bastan para que el amortiguamiento equilibre al mando.
  for (let i = 0; i < 3 * 240; i++) model.step(dt, controls);
  return (Math.abs(model.state.rollRate) * 180) / Math.PI;
}

describe('ritmo de alabeo', () => {
  it('la avioneta escuela rueda como una avioneta, no como un caza', () => {
    const rate = steadyRollRate(OGA_172, 0);
    // Una ligera de verdad ronda los 60-75 grados por segundo a fondo. Antes
    // de corregir las unidades, este número daba por encima de 190.
    expect(rate).toBeGreaterThan(45);
    expect(rate).toBeLessThan(95);
  });

  it('el biplano es más ágil que la avioneta, pero no el doble', () => {
    const escuela = steadyRollRate(OGA_172, 0);
    const biplano = steadyRollRate(MAINUMBY, 0);
    expect(biplano).toBeGreaterThan(escuela);
    expect(biplano).toBeLessThan(escuela * 1.8);
  });

  it('el modo Arcade rueda más despacio y por tanto más manejable', () => {
    expect(steadyRollRate(OGA_172, 1)).toBeLessThan(steadyRollRate(OGA_172, 0));
  });

  it('medio mando da aproximadamente medio ritmo', () => {
    const lleno = steadyRollRate(OGA_172, 0, 1);
    const medio = steadyRollRate(OGA_172, 0, 0.5);
    expect(medio).toBeGreaterThan(lleno * 0.35);
    expect(medio).toBeLessThan(lleno * 0.65);
  });
});

describe('recuperación de la horizontal en Arcade', () => {
  it('soltando los mandos, las alas vuelven solas', () => {
    const model = new CoefficientFlightModel({ aircraft: OGA_172, ground: () => 0, assist: 1 });
    model.reset({ position: new Vector3(0, 1500, 0), heading: 0, airspeed: 45 });

    const dt = 1 / 240;
    // Un toque de alerón, como el que se da sin querer.
    for (let i = 0; i < 240; i++) {
      model.step(dt, { ...neutralControls(), throttle: 0.7, aileron: 0.6 });
    }
    const bankAfterInput = bankOf(model);
    expect(bankAfterInput).toBeGreaterThan(8);

    // Y ahora se suelta todo. En Arcade tiene que enderezarse solo, y no
    // "un poco menos que antes": alas niveladas de verdad.
    for (let i = 0; i < 4 * 240; i++) {
      model.step(dt, { ...neutralControls(), throttle: 0.7 });
    }
    expect(bankOf(model)).toBeLessThan(4);
  });

  it('en modo Piloto no se endereza solo: eso lo hace el piloto', () => {
    const model = new CoefficientFlightModel({ aircraft: OGA_172, ground: () => 0, assist: 0 });
    model.reset({ position: new Vector3(0, 1500, 0), heading: 0, airspeed: 45 });
    const dt = 1 / 240;
    for (let i = 0; i < 240; i++) {
      model.step(dt, { ...neutralControls(), throttle: 0.7, aileron: 0.6 });
    }
    for (let i = 0; i < 4 * 240; i++) {
      model.step(dt, { ...neutralControls(), throttle: 0.7 });
    }
    expect(bankOf(model)).toBeGreaterThan(10);
  });
});

/** Alabeo en grados, positivo hacia cualquier lado. */
function bankOf(model: CoefficientFlightModel): number {
  const q = model.state.orientation;
  const rightY = 2 * (q.x * q.y + q.w * q.z);
  return Math.abs((Math.asin(Math.max(-1, Math.min(1, rightY))) * 180) / Math.PI);
}

describe('virar de verdad', () => {
  /** Rumbo ganado, en grados, tras mantener el alerón y soltarlo. */
  function headingGained(holdSeconds: number): number {
    const model = new CoefficientFlightModel({ aircraft: OGA_172, ground: () => 0, assist: 1 });
    model.reset({ position: new Vector3(0, 1200, 0), heading: Math.PI, airspeed: 50 });
    const start = model.state.heading;
    const dt = 1 / 240;
    for (let i = 0; i < holdSeconds * 240; i++) {
      model.step(dt, { ...neutralControls(), throttle: 0.7, aileron: 1 });
    }
    for (let i = 0; i < 8 * 240; i++) {
      model.step(dt, { ...neutralControls(), throttle: 0.7 });
    }
    let delta = ((model.state.heading - start) * 180) / Math.PI;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    return Math.abs(delta);
  }

  it('mantener el alerón tres segundos gira de verdad', () => {
    // Guarda el reverso del arreglo del nivelado: con la ayuda demasiado
    // fuerte el avión se enderezaba en cuanto se soltaba la tecla y no
    // giraba nada, así que no había forma de volver a la pista.
    expect(headingGained(3)).toBeGreaterThan(35);
  });

  it('mantener más tiempo gira más', () => {
    expect(headingGained(3)).toBeGreaterThan(headingGained(1) * 1.5);
  });
});

describe('convención de signos', () => {
  // Este test existe porque el signo del alabeo estaba invertido respecto al
  // del mando, y eso volvía el nivelado automático en un antinivelado.
  // Mientras estas tres cosas apunten al mismo lado, no puede repetirse.
  it('alerón a la derecha, ritmo a la derecha, ala derecha abajo', () => {
    const model = new CoefficientFlightModel({ aircraft: OGA_172, ground: () => 0, assist: 0 });
    model.reset({ position: new Vector3(0, 1500, 0), heading: 0, airspeed: 45 });

    const dt = 1 / 240;
    for (let i = 0; i < 240; i++) {
      model.step(dt, { ...neutralControls(), throttle: 0.7, aileron: 1 });
    }

    expect(model.state.rollRate).toBeGreaterThan(0);
    // El eje transversal del avión apunta hacia abajo: el ala derecha ha
    // bajado, que es lo que significa alabear a la derecha.
    const right = new Vector3(1, 0, 0).applyQuaternion(model.state.orientation);
    expect(right.y).toBeLessThan(0);
  });
});

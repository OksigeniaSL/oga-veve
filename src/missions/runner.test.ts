/**
 * Tests del motor de misiones.
 *
 * Es lógica pura a propósito, así que se prueba entera sin navegador: se le
 * dan estados de vuelo inventados y se comprueba qué decide. Los casos que
 * importan no son los felices sino los tramposos — arrancar en la pista y
 * que cuente como aterrizaje, tocar y seguir rodando, cumplir objetivos
 * fuera de orden.
 */

import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { MissionRunner } from './runner';
import type { Mission } from './types';
import type { FlightState } from '../flight/model';

function state(partial: Partial<FlightState>): FlightState {
  return {
    position: new Vector3(),
    velocity: new Vector3(),
    orientation: new Quaternion(),
    rollRate: 0,
    pitchRate: 0,
    yawRate: 0,
    airspeed: 0,
    alpha: 0,
    beta: 0,
    heightAboveGround: 0,
    verticalSpeed: 0,
    loadFactor: 1,
    heading: 0,
    onGround: true,
    stalled: false,
    crashed: false,
    secondsToImpact: Number.POSITIVE_INFINITY,
    touchdownSinkRate: 0,
    ...partial,
  };
}

const MISSION: Mission = {
  id: 'prueba',
  nameKey: 'mission.first.name',
  scenario: 'valle-cordillera',
  objectives: [
    { kind: 'takeoff' },
    { kind: 'reach', x: 1000, z: 0, radius: 200 },
    { kind: 'land', gentle: 3 },
  ],
};

describe('avance de una misión', () => {
  it('cumple los objetivos en orden', () => {
    const runner = new MissionRunner();
    runner.start(MISSION);
    expect(runner.current?.kind).toBe('takeoff');

    runner.update(state({ onGround: false, heightAboveGround: 40 }));
    expect(runner.current?.kind).toBe('reach');

    runner.update(state({ onGround: false, heightAboveGround: 200, position: new Vector3(1050, 300, 0) }));
    expect(runner.current?.kind).toBe('land');
    expect(runner.progress).toEqual({ done: 2, total: 3 });
  });

  it('no cuenta un objetivo lejano por mucho que se vuele', () => {
    const runner = new MissionRunner();
    runner.start(MISSION);
    runner.update(state({ onGround: false, heightAboveGround: 40 }));
    runner.update(state({ onGround: false, heightAboveGround: 200, position: new Vector3(400, 300, 0) }));
    expect(runner.current?.kind).toBe('reach');
  });

  it('avisa cuando termina', () => {
    const runner = new MissionRunner();
    runner.start(MISSION);
    runner.update(state({ onGround: false, heightAboveGround: 40 }));
    runner.update(state({ onGround: false, heightAboveGround: 200, position: new Vector3(1000, 300, 0) }));
    const event = runner.update(state({ onGround: true, airspeed: 4, touchdownSinkRate: 1.2 }));
    expect(event).toEqual({ completed: true, finished: true });
    expect(runner.finished).toBe(true);
    expect(runner.current).toBeNull();
  });
});

describe('lo que no cuela', () => {
  it('estar parado en la pista no es haber aterrizado', () => {
    const runner = new MissionRunner();
    runner.start({ ...MISSION, objectives: [{ kind: 'land' }] });
    // Sin haber volado nunca, tocar el suelo no vale.
    expect(runner.update(state({ onGround: true, airspeed: 0 })).completed).toBe(false);
  });

  it('tocar y seguir rodando deprisa tampoco', () => {
    const runner = new MissionRunner();
    runner.start({ ...MISSION, objectives: [{ kind: 'land' }] });
    runner.update(state({ onGround: false, heightAboveGround: 200 }));
    expect(runner.update(state({ onGround: true, airspeed: 34 })).completed).toBe(false);
    expect(runner.update(state({ onGround: true, airspeed: 5 })).completed).toBe(true);
  });

  it('una llegada dura no cuenta como aterrizaje suave', () => {
    const runner = new MissionRunner();
    runner.start({ ...MISSION, objectives: [{ kind: 'land', gentle: 2 }] });
    runner.update(state({ onGround: false, heightAboveGround: 200 }));
    expect(
      runner.update(state({ onGround: true, airspeed: 4, touchdownSinkRate: 5.5 })).completed,
    ).toBe(false);
  });

  it('un objetivo con techo no cuenta si se pasa por encima', () => {
    const runner = new MissionRunner();
    runner.start({
      ...MISSION,
      objectives: [{ kind: 'reach', x: 0, z: 0, radius: 300, maxHeight: 120 }],
    });
    runner.update(state({ onGround: false, heightAboveGround: 400 }));
    expect(runner.progress.done).toBe(0);
    runner.update(state({ onGround: false, heightAboveGround: 80 }));
    expect(runner.progress.done).toBe(1);
  });

  it('despegar exige separarse de verdad, no dar un bote', () => {
    const runner = new MissionRunner();
    runner.start(MISSION);
    expect(runner.update(state({ onGround: false, heightAboveGround: 3 })).completed).toBe(false);
    expect(runner.update(state({ onGround: false, heightAboveGround: 30 })).completed).toBe(true);
  });
});

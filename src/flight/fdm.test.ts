/**
 * Tests del modelo de vuelo.
 *
 * No comprueban que los números coincidan con una avioneta real —para eso
 * haría falta validar contra datos de ensayo—, sino que el modelo se
 * comporta como un avión: acelera, despega, planea, entra en pérdida y no se
 * va a infinito. Son las propiedades que se rompen cuando alguien cambia un
 * signo, que es el fallo que de verdad ocurre.
 */

import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { CoefficientFlightModel, liftCoefficient } from './fdm';
import { OGA_172 } from './aircraft';
import { neutralControls, type ControlInputs } from './model';

const FLAT_GROUND = () => 0;

function makeModel(assist = 0): CoefficientFlightModel {
  return new CoefficientFlightModel({ aircraft: OGA_172, ground: FLAT_GROUND, assist });
}

function fly(
  model: CoefficientFlightModel,
  seconds: number,
  controls: Partial<ControlInputs>,
): void {
  const input = { ...neutralControls(), ...controls };
  const dt = 1 / 60;
  for (let i = 0; i < Math.round(seconds / dt); i++) model.step(dt, input);
}

describe('curva de sustentación', () => {
  const aero = { cl0: OGA_172.aero.cl0, clAlpha: OGA_172.aero.clAlpha };
  const stall = OGA_172.aero.alphaStall;

  it('crece linealmente antes de la pérdida', () => {
    const low = liftCoefficient(0.05, aero, stall);
    const high = liftCoefficient(0.15, aero, stall);
    expect(high).toBeGreaterThan(low);
    // Pendiente constante: la diferencia debe ser clAlpha por el incremento.
    expect(high - low).toBeCloseTo(aero.clAlpha * 0.1, 5);
  });

  it('cae después de la pérdida', () => {
    const atStall = liftCoefficient(stall, aero, stall);
    const deepStall = liftCoefficient(stall + 0.35, aero, stall);
    expect(deepStall).toBeLessThan(atStall);
  });

  it('es simétrica en signo', () => {
    expect(liftCoefficient(-0.1, aero, stall)).toBeLessThan(liftCoefficient(0, aero, stall));
  });
});

describe('carrera de despegue', () => {
  it('acelera con motor a tope y acaba despegando', () => {
    const model = makeModel();
    model.reset({ position: new Vector3(0, OGA_172.gearHeight, 0), heading: 0, airspeed: 0 });
    expect(model.state.onGround).toBe(true);

    fly(model, 12, { throttle: 1 });
    expect(model.state.airspeed).toBeGreaterThan(20);

    // Rotación: se tira del elevador y el avión tiene que separarse.
    fly(model, 10, { throttle: 1, elevator: 0.45 });
    expect(model.state.onGround).toBe(false);
    expect(model.state.position.y).toBeGreaterThan(OGA_172.gearHeight + 8);
  });

  it('no despega tirando de la palanca desde parado', () => {
    const model = makeModel();
    model.reset({ position: new Vector3(0, OGA_172.gearHeight, 0), heading: 0, airspeed: 0 });

    // Elevador a fondo pero sin motor: el tren impone el cabeceo máximo y
    // sin velocidad no hay sustentación. Tiene que quedarse en la pista.
    fly(model, 8, { throttle: 0, elevator: 1 });

    expect(model.state.onGround).toBe(true);
    expect(model.state.alpha).toBeLessThanOrEqual(OGA_172.maxGroundPitch + 1e-6);
  });
});

describe('vuelo en el aire', () => {
  it('planea y desciende con el motor al ralentí', () => {
    const model = makeModel();
    model.reset({ position: new Vector3(0, 1000, 0), heading: 0, airspeed: 55 });
    const startHeight = model.state.position.y;

    // Cuarenta segundos y no diez: soltado a una velocidad distinta de la de
    // equilibrio, el avión oscila en fugoide —cambia altura por velocidad y
    // vuelta— y en los primeros segundos puede estar subiendo. La oscilación
    // es correcta; lo que no puede es no perder altura a la larga.
    fly(model, 40, { throttle: 0 });

    expect(model.state.position.y).toBeLessThan(startHeight);
    // Un planeo, no una caída a plomo: la avioneta debe recorrer bastante
    // más en horizontal que lo que pierde en vertical.
    const dropped = startHeight - model.state.position.y;
    const travelled = Math.hypot(model.state.position.x, model.state.position.z);
    expect(travelled).toBeGreaterThan(dropped * 2);
  });

  it('sin motor, la energía total solo puede bajar', () => {
    const model = makeModel();
    model.reset({ position: new Vector3(0, 1000, 0), heading: 0, airspeed: 55 });

    // Altura más energía cinética por unidad de peso. Sin empuje, la
    // resistencia solo puede restar. Si algún signo se invierte, esto sube:
    // es el test que detecta un avión que se propulsa solo.
    const energy = (): number =>
      model.state.position.y + model.state.airspeed ** 2 / (2 * 9.80665);

    let previous = energy();
    for (let i = 0; i < 20; i++) {
      fly(model, 2, { throttle: 0 });
      const current = energy();
      expect(current).toBeLessThan(previous);
      previous = current;
    }
  });

  it('mantiene todos los valores finitos tras un vuelo largo y brusco', () => {
    const model = makeModel();
    model.reset({ position: new Vector3(0, 800, 0), heading: 1.2, airspeed: 60 });

    fly(model, 20, { throttle: 0.8, elevator: 0.9, aileron: 0.7, rudder: -0.5 });

    const s = model.state;
    for (const value of [s.position.x, s.position.y, s.position.z, s.airspeed, s.alpha, s.beta]) {
      expect(Number.isFinite(value)).toBe(true);
    }
    expect(Math.abs(s.orientation.length() - 1)).toBeLessThan(1e-3);
  });

  it('entra en pérdida cuando se tira demasiado', () => {
    const model = makeModel();
    model.reset({ position: new Vector3(0, 1200, 0), heading: 0, airspeed: 42 });

    fly(model, 8, { throttle: 0, elevator: 1 });

    expect(model.state.stalled).toBe(true);
  });
});

describe('ayudas de pilotaje', () => {
  it('el modo arcade retrasa la entrada en pérdida', () => {
    const controls = { throttle: 0, elevator: 1 };
    const initial = { position: new Vector3(0, 1200, 0), heading: 0, airspeed: 42 };

    const pilot = makeModel(0);
    pilot.reset({ ...initial, position: initial.position.clone() });
    fly(pilot, 5, controls);

    const arcade = makeModel(1);
    arcade.reset({ ...initial, position: initial.position.clone() });
    fly(arcade, 5, controls);

    expect(Math.abs(arcade.state.alpha)).toBeLessThan(Math.abs(pilot.state.alpha));
  });
});

describe('vuelo con los mandos sueltos', () => {
  /**
   * Cuántas veces cambia de signo la velocidad vertical en un minuto sin
   * tocar nada.
   *
   * Se mide esto y no la diferencia entre altura máxima y mínima, que era lo
   * que medía la versión anterior de este test. Desde que el compensador
   * automático sostiene el ritmo de ascenso en vez de nivelar el morro, un
   * vuelo perfectamente sano puede subir cien metros seguidos, y esa
   * diferencia no dice nada. Lo que queremos saber es si **oscila**: el
   * fugoide es un vaivén, y un vaivén cambia de signo.
   */
  function oscillations(assist: number): number {
    const model = makeModel(assist);
    model.reset({ position: new Vector3(0, 1000, 0), heading: 0, airspeed: 62 });

    let changes = 0;
    let previous = 0;
    for (let second = 0; second < 60; second++) {
      fly(model, 1, { throttle: 0.65 });
      const sign = Math.sign(model.state.verticalSpeed);
      if (previous !== 0 && sign !== 0 && sign !== previous) changes++;
      if (sign !== 0) previous = sign;
    }
    return changes;
  }

  it('en Arcade el vuelo es estable: no da vaivenes', () => {
    // Soltar los mandos dejaba al avión en fugoide, un vaivén larguísimo de
    // altura contra velocidad. Es lo que hace un avión de verdad, pero para
    // quien está aprendiendo significa que el avión sube y baja solo y se
    // siente raro. En Arcade se sostiene el ritmo de ascenso que había.
    expect(oscillations(1)).toBeLessThanOrEqual(1);
  });

  it('en modo Piloto el fugoide sigue ahí, que para eso es el modo', () => {
    expect(oscillations(0)).toBeGreaterThan(1);
  });
});

describe('determinismo', () => {
  it('dos simulaciones idénticas dan el mismo resultado', () => {
    const run = (): number[] => {
      const model = makeModel(1);
      model.reset({ position: new Vector3(0, 600, 0), heading: 0.7, airspeed: 58 });
      fly(model, 6, { throttle: 0.7, elevator: 0.2, aileron: 0.3 });
      const s = model.state;
      return [s.position.x, s.position.y, s.position.z, s.airspeed];
    };
    expect(run()).toEqual(run());
  });
});

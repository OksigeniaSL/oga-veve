/**
 * Tests de la escalera de tramos.
 *
 * Lo que se comprueba no son cifras concretas sino que **los cuatro peldaños
 * se distinguen de verdad**. Un tramo que se comporta igual que el siguiente
 * no es un peldaño, es una etiqueta.
 */

import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { ArcadeFlightModel } from './arcade';
import { CoefficientFlightModel } from './fdm';
import { OGA_172 } from './aircraft';
import { neutralControls, type ControlInputs, type FlightModel } from './model';
import { GUYRAMI, TAGUATO, TAGUATO_RUVICHA, TIERS, TUKA } from './tiers';

function build(tier: (typeof TIERS)[number]): FlightModel {
  const ground = () => 0;
  return tier.model === 'simple'
    ? new ArcadeFlightModel({ aircraft: OGA_172, ground })
    : new CoefficientFlightModel({ aircraft: OGA_172, ground, assist: tier.assists });
}

function fly(model: FlightModel, seconds: number, controls: Partial<ControlInputs>): void {
  const input = { ...neutralControls(), ...controls };
  const dt = 1 / 120;
  for (let i = 0; i < Math.round(seconds * 120); i++) model.step(dt, input);
}

describe('el primer peldaño usa otro modelo', () => {
  it('Mainumby no entra en pérdida por mucho que se tire', () => {
    const model = build(GUYRAMI);
    model.reset({ position: new Vector3(0, 400, 0), heading: 0, airspeed: 30 });
    fly(model, 25, { throttle: 0.3, elevator: 1 });
    expect(model.state.stalled).toBe(false);
    expect(model.state.crashed).toBe(false);
  });

  it('a partir de Taguato sí se entra en pérdida: ya es física de verdad', () => {
    // En Tukã no, y eso es lo correcto: ese peldaño lleva protección de
    // pérdida completa. La pérdida aparece cuando se retira la protección,
    // que es justo lo que distingue a Taguato del peldaño anterior.
    const protegido = build(TUKA);
    protegido.reset({ position: new Vector3(0, 1200, 0), heading: 0, airspeed: 42 });
    fly(protegido, 10, { throttle: 0, elevator: 1 });
    expect(protegido.state.stalled).toBe(false);

    const expuesto = build(TAGUATO);
    expuesto.reset({ position: new Vector3(0, 1200, 0), heading: 0, airspeed: 42 });
    fly(expuesto, 10, { throttle: 0, elevator: 1 });
    expect(expuesto.state.stalled).toBe(true);
  });

  it('en Mainumby hay que coger velocidad para despegar', () => {
    const model = build(GUYRAMI);
    model.reset({ position: new Vector3(0, OGA_172.gearHeight, 0), heading: 0, airspeed: 0 });
    fly(model, 2, { throttle: 1, elevator: 1 });
    expect(model.state.onGround).toBe(true);
    fly(model, 12, { throttle: 1, elevator: 1 });
    expect(model.state.onGround).toBe(false);
  });

  it('los mandos van en el mismo sentido que en el modelo de verdad', () => {
    for (const tier of [GUYRAMI, TAGUATO_RUVICHA]) {
      const model = build(tier);
      model.reset({ position: new Vector3(0, 900, 0), heading: 0, airspeed: 45 });
      // Un segundo y no tres: sin ayudas, tres segundos de alerón a fondo dan
      // más de dos vueltas y el avión acaba invertido, con el ala derecha
      // otra vez arriba. Lo que se comprueba es el sentido, no la cantidad.
      fly(model, 1, { throttle: 0.8, aileron: 1 });
      // Alerón a la derecha: el ala derecha baja, en los dos modelos.
      const right = new Vector3(1, 0, 0).applyQuaternion(model.state.orientation);
      expect(right.y, tier.name).toBeLessThan(0);
    }
  });
});

describe('los peldaños intermedios se distinguen', () => {
  /** Alabeo que queda cuatro segundos después de soltar los alerones. */
  function bankAfterRelease(tier: (typeof TIERS)[number]): number {
    const model = build(tier);
    model.reset({ position: new Vector3(0, 1200, 0), heading: 0, airspeed: 48 });
    fly(model, 1.2, { throttle: 0.7, aileron: 0.7 });
    fly(model, 4, { throttle: 0.7 });
    const right = new Vector3(1, 0, 0).applyQuaternion(model.state.orientation);
    return Math.abs((Math.asin(Math.max(-1, Math.min(1, -right.y))) * 180) / Math.PI);
  }

  it('a Tukã se le enderezan las alas solas y a Taguato no', () => {
    expect(bankAfterRelease(TUKA)).toBeLessThan(5);
    expect(bankAfterRelease(TAGUATO)).toBeGreaterThan(10);
  });

  it('Taguato aguanta menos que Tukã en la toma, y Taguato Ruvicha menos aún', () => {
    expect(TUKA.assists.crashTolerance).toBeGreaterThan(TAGUATO.assists.crashTolerance);
    expect(TAGUATO.assists.crashTolerance).toBeGreaterThan(TAGUATO_RUVICHA.assists.crashTolerance);
  });

  it('la protección de pérdida solo existe en los dos primeros peldaños', () => {
    expect(TUKA.assists.stallProtection).toBeGreaterThan(0);
    expect(TAGUATO.assists.stallProtection).toBe(0);
    expect(TAGUATO_RUVICHA.assists.stallProtection).toBe(0);
  });

  it('cada peldaño enseña más instrumentos que el anterior', () => {
    const order = ['none', 'pictorial', 'numeric', 'full'];
    const shown = TIERS.map((tier) => order.indexOf(tier.instruments));
    for (let i = 1; i < shown.length; i++) expect(shown[i]!).toBeGreaterThan(shown[i - 1]!);
  });
});

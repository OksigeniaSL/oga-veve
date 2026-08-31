/**
 * Los frenos paran el avión. En los cuatro peldaños.
 *
 * Nació de un aterrizaje real en el nivel más fácil: el avión tocaba, rodaba
 * y no había forma de detenerlo. El freno estaba conectado y multiplicaba la
 * velocidad de convergencia, pero el objetivo al que convergía era la
 * velocidad de ralentí, no cero. Así que frenar solo servía para llegar
 * antes a rodar para siempre.
 *
 * Es la clase de fallo que ninguna prueba de vuelo detecta, porque todas
 * miran lo que pasa en el aire.
 */

import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { ArcadeFlightModel } from './arcade';
import { CoefficientFlightModel } from './fdm';
import { OGA_172 } from './aircraft';
import { neutralControls, type FlightModel } from './model';
import { TIERS } from './tiers';

function enPista(tier: (typeof TIERS)[number]): FlightModel {
  const ground = () => 0;
  const model =
    tier.model === 'simple'
      ? new ArcadeFlightModel({ aircraft: OGA_172, ground })
      : new CoefficientFlightModel({ aircraft: OGA_172, ground, assist: tier.assists });
  // Recién tomado: en el suelo y rodando deprisa.
  model.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: 30 });
  return model;
}

function rodar(model: FlightModel, seconds: number, brakes: number, throttle = 0): void {
  const input = { ...neutralControls(), throttle, brakes };
  const dt = 1 / 120;
  for (let i = 0; i < Math.round(seconds * 120); i++) model.step(dt, input);
}

describe('los frenos', () => {
  for (const tier of TIERS) {
    it(`paran el avión en ${tier.name}`, () => {
      const model = enPista(tier);
      rodar(model, 20, 1);
      expect(model.state.onGround).toBe(true);
      // Parado del todo, no «casi parado». Sin rozamiento estático el avión
      // se acercaba a cero exponencialmente y en pantalla reptaba para
      // siempre, que es como lo describió quien lo probó.
      expect(model.state.airspeed).toBeLessThan(0.05);
    });

    it(`con motor y sin freno, en ${tier.name} el avión rueda`, () => {
      const model = enPista(tier);
      rodar(model, 20, 0, 0.5);
      // El contraste es lo que prueba que el freno hace algo. Sin él, la
      // prueba de arriba pasaría también con un avión que se para solo.
      //
      // Antes esta prueba iba con el motor a cero, y pasaba porque el
      // modelo sencillo empujaba el avión aunque no le pidieras nada. Al
      // arreglar aquello, la prueba se quedó comprobando el fallo. Con
      // motor es como debe medirse: **frenar es poder parar el avión
      // mientras el motor tira**, no mientras no tira nadie.
      expect(model.state.airspeed).toBeGreaterThan(1);
    });

    it(`en ${tier.name} el freno aguanta contra el motor, para soltarlo de golpe`, () => {
      // El punto de espera: se sube potencia con el avión quieto y se suelta
      // el freno. Es lo que hace un avión de verdad antes de despegar, y
      // aquí sale solo si el freno manda sobre el gas.
      const model = enPista(tier);
      rodar(model, 12, 1, 0);
      rodar(model, 6, 1, 1);
      const quieto = model.state.airspeed;
      rodar(model, 5, 0, 1);
      expect(quieto).toBeLessThan(3);
      expect(model.state.airspeed).toBeGreaterThan(quieto + 5);
    });
  }
});

describe('con el motor a cero', () => {
  it('el avión no se pasea solo por la pista', () => {
    // Sin frenar siquiera: gas a cero es gas a cero. El modelo sencillo
    // tenía un suelo de velocidad pensado para el vuelo y lo aplicaba
    // también rodando, así que el avión se iba caminando él solo.
    const model = enPista(TIERS[0]!);
    rodar(model, 30, 0);
    expect(model.state.airspeed).toBeLessThan(0.5);
  });
});

describe('rodar por la pista', () => {
  for (const tier of TIERS) {
    it(`en ${tier.name} el avión gira parado o rodando despacio`, () => {
      const model = enPista(tier);
      model.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: 3 });
      const input = { ...neutralControls(), throttle: 0.12, aileron: 1 };
      for (let i = 0; i < 8 * 120; i++) model.step(1 / 120, input);
      // Ocho segundos girando a tope tienen que dar una vuelta apreciable.
      // Antes daban cero: el viraje se calculaba con la cuenta del vuelo, y
      // esa cuenta se apoya en la velocidad, así que en tierra no giraba.
      expect(Math.abs(model.state.heading)).toBeGreaterThan(0.5);
    });

    it(`en ${tier.name} la carrera de despegue sale casi recta`, () => {
      const model = enPista(tier);
      model.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: 0 });
      const input = { ...neutralControls(), throttle: 1 };
      for (let i = 0; i < 12 * 120; i++) model.step(1 / 120, input);
      // Sin tocar nada, el avión no se va solo de la pista.
      expect(Math.abs(model.state.heading)).toBeLessThan(0.08);
    });
  }
});

describe('quitar gas', () => {
  it('el avión pierde velocidad pronto, no diez segundos después', () => {
    const model = enPista(TIERS[0]!);
    model.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: 0 });
    rodar(model, 25, 0, 1);
    const rapido = model.state.airspeed;
    // Tres segundos a ralentí. Antes seguía casi igual de rápido, porque
    // subir y bajar iban al mismo ritmo lento y quien lo probaba creía que
    // el avión aceleraba solo.
    rodar(model, 3, 0, 0);
    expect(model.state.airspeed).toBeLessThan(rapido * 0.45);
  });
});

describe('la alarma de pérdida', () => {
  /**
   * Reportado volando: la alarma cantaba «¡pérdida!» en cuanto se levantaba
   * un poco el morro, y también subiendo justo después de despegar. Se
   * marcaba pérdida en el instante en que el ángulo rozaba el umbral, sin
   * histéresis y sin exigir que se mantuviera, así que parpadeaba.
   */
  function volar(elevator: number, seconds: number, throttle = 1) {
    const model = new CoefficientFlightModel({
      aircraft: OGA_172,
      ground: () => 0,
      assist: TIERS[2]!.assists,
    });
    model.reset({ position: new Vector3(0, 500, 0), heading: 0, airspeed: 40 });
    const input = { ...neutralControls(), throttle, elevator };
    let avisos = 0;
    let antes = false;
    for (let i = 0; i < seconds * 120; i++) {
      model.step(1 / 120, input);
      if (model.state.stalled && !antes) avisos++;
      antes = model.state.stalled;
    }
    return { avisos, model };
  }

  it('no salta en un ascenso normal', () => {
    // Motor de ascenso y un tirón moderado, que es lo que hace cualquiera
    // después de despegar. Tirar a fondo veinte segundos seguidos sí acaba en
    // pérdida, y debe: eso no es un ascenso, es forzar el ala.
    const { avisos } = volar(0.3, 12);
    expect(avisos).toBe(0);
  });

  it('sí salta si de verdad se tira a tope, y una sola vez', () => {
    const { avisos, model } = volar(1, 20, 0.2);
    expect(model.state.stalled || avisos > 0).toBe(true);
    // Una entrada, no un parpadeo: antes daba decenas.
    expect(avisos).toBeLessThan(4);
  });
});

/**
 * **El gas de rodaje da la velocidad de rodaje**, en toda la flota y en los
 * dos modelos de vuelo.
 *
 * `gasParaRodar` es la cuenta con la que el juego pasa de metros por segundo
 * a gas en tierra: la marca de rodaje de la palanca táctil y el tope de rodaje
 * de Guyrami y Tukã la usan. En el modelo completo era una recta a ojo y con
 * suelo: al JAZ 20 le daba 0,30 para nueve metros por segundo, y con 0,30 el
 * JAZ 20 no se queda en nueve: sigue acelerando, pasa de catorce y acaba en
 * treinta y tres. La marca prometía rodar y llevaba a correr, y el tope solo
 * sujetaba el avión a fuerza de freno.
 *
 * Aquí no se mira la cuenta: se pone ese gas y se mide a qué velocidad rueda
 * **el modelo entero**, con su rodadura, su aire y su motor. Dos preguntas,
 * porque rodando no son la misma:
 *
 * - **Sostener**: con el gas de nueve, un avión que va a nueve sigue a nueve.
 * - **Llegar**: con el gas de llegar —el que pide el tope, preguntando cada
 *   paso desde lo que se lleva—, un avión parado se pone a nueve en unos
 *   segundos y sin pasarse.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { ArcadeFlightModel } from "./arcade";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls } from "./model";
import { RODAJE } from "./tope-de-rodaje";
import type { Superficie } from "../world/superficie";

type Modelo = CoefficientFlightModel | ArcadeFlightModel;

/** Lo que rueda ahora, por el suelo, m/s. */
const porElSuelo = (m: Modelo): number =>
  Math.hypot(m.state.velocity.x, m.state.velocity.z);

/** Pone el avión en el suelo, mirando al norte y rodando a `v`. */
function enElSuelo(m: Modelo, a: AircraftConfig, v: number, cota: number) {
  const s = m.state;
  s.onGround = true;
  s.position.set(0, cota + a.gearHeight, 0);
  s.velocity.set(0, 0, -v);
  s.heading = 0;
}

const dt = 1 / 60;

/** Sostener: rueda un minuto con el gas de `v` y dice a cuánto acaba. */
function sostiene(m: Modelo, a: AircraftConfig, v: number, cota = 0): number {
  enElSuelo(m, a, v, cota);
  const mandos = {
    ...neutralControls(),
    engineOn: true,
    throttle: m.gasParaRodar(v),
  };
  for (let t = 0; t < 60; t += dt) m.step(dt, mandos);
  expect(m.state.onGround, `${a.id}: se fue del suelo`).toBe(true);
  return porElSuelo(m);
}

/**
 * Llegar: parado, con el gas de llegar preguntado cada paso como hace el
 * tope. Dice cuándo entra en el tres por ciento y lo más que se pasa.
 */
function llega(m: Modelo, a: AircraftConfig, v: number, segundos = 60) {
  enElSuelo(m, a, 0, 0);
  const mandos = { ...neutralControls(), engineOn: true, throttle: 0 };
  let dentro: number | null = null;
  let maximo = 0;
  for (let t = 0; t < segundos; t += dt) {
    mandos.throttle = m.gasParaRodar(v, porElSuelo(m));
    m.step(dt, mandos);
    const ahora = porElSuelo(m);
    maximo = Math.max(maximo, ahora);
    if (dentro === null && Math.abs(ahora - v) < v * 0.03) dentro = t;
  }
  return { dentro, maximo, final: porElSuelo(m) };
}

const completo = (a: AircraftConfig, cota = 0, suelo?: Superficie) => {
  const m = new CoefficientFlightModel({
    aircraft: a,
    ground: () => cota,
    assist: 0,
  });
  if (suelo) m.ponerSuperficie(suelo);
  return m;
};

const cerca = (v: number, quiero: number, que: string) => {
  expect(v, `${que}: ${v.toFixed(2)} m/s`).toBeGreaterThan(quiero * 0.97);
  expect(v, `${que}: ${v.toFixed(2)} m/s`).toBeLessThan(quiero * 1.03);
};

describe("el gas de rodaje da la velocidad de rodaje", () => {
  for (const a of AIRCRAFT) {
    it(`${a.id}, modelo completo: el gas de nueve sostiene nueve`, () => {
      cerca(sostiene(completo(a), a, RODAJE), RODAJE, a.id);
      for (const v of [4, 12]) cerca(sostiene(completo(a), a, v), v, `${a.id} a ${v}`);
    });

    it(`${a.id}, modelo completo: en la hierba y a la cota de Los Rodeos, también`, () => {
      /*
       * La hierba frena más y el aire de arriba empuja menos: el gas de rodaje
       * no es un número del avión, es el de ese avión **en ese suelo**.
       */
      cerca(sostiene(completo(a, 0, "hierba"), a, RODAJE), RODAJE, `${a.id} en hierba`);
      cerca(sostiene(completo(a, 632), a, RODAJE, 632), RODAJE, `${a.id} arriba`);
      expect(completo(a, 0, "hierba").gasParaRodar(RODAJE)).toBeGreaterThan(
        completo(a).gasParaRodar(RODAJE),
      );
    });

    it(`${a.id}, modelo completo: parado, el gas de llegar lo pone a nueve sin pasarse`, () => {
      const r = llega(completo(a), a, RODAJE);
      expect(r.dentro, `${a.id}: no llegó`).not.toBeNull();
      expect(r.dentro!, `${a.id}: tardó ${r.dentro!.toFixed(1)} s`).toBeLessThan(30);
      expect(r.maximo, `${a.id}: se pasó a ${r.maximo.toFixed(2)}`).toBeLessThan(RODAJE * 1.05);
      cerca(r.final, RODAJE, `${a.id} al final`);
    });

    it(`${a.id}, modelo sencillo: el gas de nueve lo pone a nueve`, () => {
      /*
       * Aquí el gas **es** la velocidad y el modelo la alcanza al ritmo que
       * le da su carrera de despegue: un avión de doscientas cincuenta
       * toneladas tarda más en ponerse a rodar que una avioneta, y eso es
       * verdad. Por eso se le dan tres minutos, y lo que se pide es que llegue
       * a la que se le pidió y no a otra.
       */
      const m = new ArcadeFlightModel({ aircraft: a, ground: () => 0 });
      const r = llega(m, a, RODAJE, 180);
      cerca(r.final, RODAJE, `${a.id} sencillo, desde parado`);
      expect(r.maximo).toBeLessThan(RODAJE * 1.05);
    });
  }
});

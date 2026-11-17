/**
 * **La ayuda que sostiene la subida, recién despegado.**
 *
 * Por debajo de su velocidad segura, el compensador automático de los
 * peldaños con ayuda (`climbHold`) bajaba el morro en proporción a lo que
 * faltaba, sin mirar el suelo. Recién despegado se va por debajo de ella, así
 * que soltando la palanca la ayuda llevaba el avión a la pista: el JAZ 20 en
 * Taguato, a −2,6 m/s y cuatro metros; el JAZ 40, en Tukã y en Taguato, la
 * tocaba. Lo real es acelerar a la de subida con una actitud de subida, sin
 * dejar caer el morro (FAA-H-8083-3C, pp. 6-4 y 6-5). Ver `leyDelSuelo` en
 * `fdm.ts` y la nota H21d del ADR 0002.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { MEDIDOS, type AircraftConfig } from "./aircraft";
import { compensadorDeDespegue } from "./compensador-de-despegue";
import { CoefficientFlightModel } from "./fdm";
import { flapsDeDespegue, muescaDeAterrizaje, muescasDeLaPalanca } from "./flaps";
import { neutralControls, type ControlInputs } from "./model";
import { TIERS, type Tier } from "./tiers";
import { perdidaCon } from "./velocidades-de-despegue";

const DE_ALA = MEDIDOS.filter((a) => !a.helicoptero);
/** Los peldaños que llevan esta ayuda: Tukã y Taguato. */
const CON_AYUDA = TIERS.filter((t) => t.model === "coefficient" && t.assists.climbHold > 0);
const DT = 1 / 60;
const NUDO = 0.514444;

interface Vuelo {
  readonly m: CoefficientFlightModel;
  readonly c: ControlInputs;
}

/**
 * Como sale de la rotación: con los flaps y el compensador de despegue, el
 * gas a tope, subiendo y tirando un poco, y a los quince metros se suelta.
 */
function recienDespegado(
  a: AircraftConfig,
  tier: Tier,
  velocidad: number,
  /** Dónde está el suelo: más abajo, la misma altitud lejos de él. */
  suelo = 0,
): Vuelo {
  const flaps = a.llevaFlaps ? flapsDeDespegue(a) : 0;
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => suelo, assist: tier.assists });
  m.reset({
    position: new Vector3(0, a.gearHeight + 15, 0),
    heading: 0,
    airspeed: velocidad,
    equilibrado: true,
  });
  m.state.velocity.y = 2;
  const c = {
    ...neutralControls(),
    engineOn: true,
    throttle: 1,
    flaps,
    trim: compensadorDeDespegue(a).marca,
    elevator: 0.15,
  };
  for (let i = 0; i < 30; i++) m.step(DT, c);
  c.elevator = 0;
  return { m, c };
}

/** Las dos de recién despegado: la de un despegue tirado de más —la del banco
 * del navegador, por debajo de la Vr— y la del manual. */
function velocidadesDeSalida(a: AircraftConfig): number[] {
  const perdida = perdidaCon(a, a.llevaFlaps ? flapsDeDespegue(a) : 0);
  return [perdida * 1.07, Math.max(a.rotationSpeed * 1.02, perdida * 1.2)];
}

describe("soltado recién despegado, con la ayuda que sostiene la subida", () => {
  for (const tier of CON_AYUDA)
    it(`en ${tier.name}, sigue subiendo y acelera hacia la de subida, en todos`, () => {
      expect(CON_AYUDA.length).toBeGreaterThanOrEqual(2);
      for (const a of DE_ALA)
        for (const v of velocidadesDeSalida(a)) {
          const { m, c } = recienDespegado(a, tier, v);
          const donde = `${a.id} soltado a ${(v / NUDO).toFixed(0)} kt`;
          const alSoltar = m.state.airspeed;
          let masBajando = Infinity;
          for (let i = 0; i < 60 * 30; i++) {
            m.step(DT, c);
            if (i >= 30) masBajando = Math.min(masBajando, m.state.verticalSpeed);
            if (i === 60 * 10) expect(m.state.verticalSpeed, `${donde}, a los 10 s`).toBeGreaterThan(0.5);
          }
          // No baja hacia la pista ni un momento: antes, a −15 m/s.
          expect(masBajando, donde).toBeGreaterThan(0);
          // Y la velocidad sube: lo que sobra de empuje no se va todo en subir.
          expect(m.state.airspeed, donde).toBeGreaterThan(alSoltar + NUDO);
        }
    });
});

/**
 * El mismo vuelo a la misma altitud —el mismo aire—, con el suelo a quince
 * metros o a un kilómetro: lo único que cambia es lo lejos que está el suelo.
 */
const LEJOS = -1000;

describe("lo que no cambia", () => {
  /*
   * **Lejos del suelo sigue protegiendo de la pérdida como siempre**: con
   * altura de sobra, por debajo de la segura baja el morro para coger
   * velocidad, y nunca sostiene más subida que cerca del suelo.
   */
  it("lejos del suelo, lento y con el gas a tope, baja el morro a coger velocidad", () => {
    for (const tier of CON_AYUDA)
      for (const a of DE_ALA) {
        const v = perdidaCon(a, a.llevaFlaps ? flapsDeDespegue(a) : 0) * 1.07;
        const masBajando = (suelo: number): number => {
          const { m, c } = recienDespegado(a, tier, v, suelo);
          let menos = Infinity;
          for (let i = 0; i < 60 * 10; i++) {
            m.step(DT, c);
            menos = Math.min(menos, m.state.verticalSpeed);
          }
          return menos;
        };
        const lejos = masBajando(LEJOS);
        expect(lejos, `${a.id} en ${tier.name}`).toBeLessThanOrEqual(masBajando(0) + 1e-6);
        // El JAZ 20, que sale muy por debajo de su segura, a buscarla bajando.
        if (a.id === "jaz-20") expect(lejos, `${a.id} en ${tier.name}`).toBeLessThan(-1);
      }
  });

  /*
   * **Y con el gas quitado no sobra nada**: bajando a la toma la ayuda es la de
   * siempre, cerca del suelo o lejos de él. Lo que cambia es solo con empuje de
   * sobra.
   */
  it("con el gas quitado, el suelo cerca no cambia nada", () => {
    for (const tier of CON_AYUDA)
      for (const a of DE_ALA) {
        const flaps = a.llevaFlaps ? (muescasDeLaPalanca(a)[muescaDeAterrizaje(a)] ?? 1) : 0;
        const vuela = (suelo: number): number[] => {
          const m = new CoefficientFlightModel({ aircraft: a, ground: () => suelo, assist: tier.assists });
          m.reset({
            position: new Vector3(0, a.gearHeight + 60, 0),
            heading: 0,
            airspeed: a.approachSpeed,
            equilibrado: true,
          });
          const c = { ...neutralControls(), engineOn: true, throttle: 0, flaps };
          const traza: number[] = [];
          for (let i = 0; i < 60 * 6; i++) {
            m.step(DT, c);
            if (i % 30 === 0) traza.push(m.state.verticalSpeed, m.state.airspeed);
          }
          return traza;
        };
        const cerca = vuela(0);
        const lejos = vuela(LEJOS);
        cerca.forEach((x, i) => expect(x, `${a.id} en ${tier.name}`).toBeCloseTo(lejos[i]!, 9));
      }
  });
});

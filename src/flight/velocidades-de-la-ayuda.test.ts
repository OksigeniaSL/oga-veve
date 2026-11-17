/**
 * **Las dos velocidades de la ayuda que sostiene la subida, con los flaps que
 * lleva el avión.**
 *
 * La segura y la lenta de `climbHold` salían solo de la ficha, atadas a la Vref,
 * que es de los flaps de aterrizar. Con los flaps recogidos la segura de los
 * reactores quedaba por debajo de su pérdida —124 nudos en el JAZ 90, con la
 * limpia en 135— y ahí solo protegía el tope de ángulo de ataque. Ahora cada una
 * es la mayor entre la de la ficha y una que sale de `perdidaCon` con los flaps
 * de ahora, sin tocar la toma. Ver `velocidadesDeLaAyuda` en `fdm.ts` y la nota
 * H22b del ADR 0002.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { MEDIDOS, type AircraftConfig } from "./aircraft";
import { airDensity, SEA_LEVEL_DENSITY } from "./atmosphere";
import { CoefficientFlightModel, timonQueSostiene, velocidadesDeLaAyuda } from "./fdm";
import { flapsDeDespegue, muescaDeAterrizaje, muescasDeLaPalanca } from "./flaps";
import { neutralControls } from "./model";
import { TUKA } from "./tiers";
import { perdidaCon, V2_SOBRE_LA_PERDIDA } from "./velocidades-de-despegue";

const DE_ALA = MEDIDOS.filter((a) => !a.helicoptero);
const NUDO = 0.514444;
const DT = 1 / 60;

/** Las de la ficha, que son las que se afinaron para la toma. */
const deLaFicha = (a: AircraftConfig) => ({
  lenta: Math.min(a.cruiseSpeed * 0.42, a.approachSpeed * 0.8),
  segura: Math.min(a.cruiseSpeed * 0.58, a.approachSpeed * 1.05),
});

/** Los flaps de cada muesca de la palanca, de recogidos a los de aterrizar. */
function muescas(a: AircraftConfig): number[] {
  if (!a.llevaFlaps) return [0];
  const todas = muescasDeLaPalanca(a);
  return todas.slice(0, muescaDeAterrizaje(a) + 1);
}

/** La densidad del aire de los campos, del nivel del mar a mil metros. */
const DENSIDADES = [0, 300, 700, 1000].map((h) => airDensity(h));

describe("las velocidades de la ayuda que sostiene la subida", () => {
  it("con los flaps de aterrizar son las de siempre: la toma no cambia", () => {
    for (const a of DE_ALA) {
      const flaps = muescas(a).at(-1)!;
      for (const rho of DENSIDADES) {
        const v = velocidadesDeLaAyuda(a, flaps, rho);
        expect(v, `${a.id} a densidad ${rho.toFixed(3)}`).toEqual(deLaFicha(a));
      }
    }
  });

  it("con cualquier muesca, la segura no queda nunca por debajo de la pérdida con esos flaps", () => {
    for (const a of DE_ALA)
      for (const flaps of muescas(a))
        for (const rho of DENSIDADES) {
          const perdida = perdidaCon(a, flaps) * Math.sqrt(SEA_LEVEL_DENSITY / rho);
          const v = velocidadesDeLaAyuda(a, flaps, rho);
          expect(v.segura, `${a.id} con flaps ${flaps}`).toBeGreaterThanOrEqual(V2_SOBRE_LA_PERDIDA * perdida - 1e-9);
          expect(v.lenta, `${a.id} con flaps ${flaps}`).toBeLessThan(v.segura);
        }
  });

  it("en el JAZ 90 limpio, la segura pasa de 124 nudos a más de su pérdida, 135", () => {
    const a = DE_ALA.find((x) => x.id === "jaz-90")!;
    expect(deLaFicha(a).segura / NUDO).toBeLessThan(125);
    expect(perdidaCon(a, 0) / NUDO).toBeGreaterThan(134);
    const v = velocidadesDeLaAyuda(a, 0, SEA_LEVEL_DENSITY);
    expect(v.segura).toBeGreaterThan(1.1 * perdidaCon(a, 0));
  });

  /*
   * Y en vuelo: en Tukã, que lleva la ayuda entera, soltado a 1,3 veces la
   * pérdida con el gas quitado, la ayuda sostiene la altura mientras puede y
   * luego cambia altura por velocidad. Antes, limpio, el JAZ 90 se iba a 0,95
   * veces su pérdida limpia, el JAZ 120 a 0,94 y el JAZ 50 a 0,96; con los
   * flaps de despegue, el JAZ 90 a 0,93.
   */
  it("en Tukã, soltado lento y sin gas, con los flaps recogidos o los de despegue, no baja de la pérdida", () => {
    const alto = 1500;
    const sigma = Math.sqrt(airDensity(alto) / SEA_LEVEL_DENSITY);
    for (const a of DE_ALA)
      for (const flaps of a.llevaFlaps ? [0, flapsDeDespegue(a)] : [0]) {
        const perdida = perdidaCon(a, flaps);
        const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: TUKA.assists });
        m.reset({ position: new Vector3(0, alto, 0), heading: 0, airspeed: (1.3 * perdida) / sigma, equilibrado: true });
        const c = {
          ...neutralControls(),
          engineOn: true,
          throttle: 0,
          flaps,
          tren: 0,
          trim: timonQueSostiene(a, 1.3 * perdida, flaps),
        };
        let lo = Infinity;
        for (let i = 0; i < 60 * 60; i++) {
          m.step(DT, c);
          const s = m.state;
          lo = Math.min(lo, s.airspeed * Math.sqrt(airDensity(s.position.y) / SEA_LEVEL_DENSITY));
        }
        expect(lo / perdida, `${a.id} con flaps ${flaps}: ${(lo / NUDO).toFixed(0)} nudos`).toBeGreaterThanOrEqual(1);
      }
  });
});

/**
 * **Las V de un manual se leen en la aguja**: V1, Vr, V2 y Vref son indicadas,
 * y el juego las mira con `indicadaDe`, no con la verdadera del estado.
 *
 * El caso que lo destapó: La Gomera a 40 °C con el JAZ 90 lleno. V1 se miraba
 * contra la verdadera y salía con la aguja un 6 % por debajo; Vr, contra la
 * indicada, y el avión se iba al aire antes de que la aguja llegara (enmienda
 * H38d del ADR 0019). Aquí, con Los Rodeos —632 m, el campo alto de la flota—
 * y el mismo calor: a nivel del mar da igual mirar una que otra, y arriba y
 * con calor, V1 y Vr salen cuando la aguja llega a la suya, rodando todavía.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT } from "./aircraft";
import { AIRE_ESTANDAR, airDensity, aireDelParte, indicadaDe, type Aire } from "./atmosphere";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls } from "./model";
import { velocidadesDeDespegue } from "./velocidades-de-despegue";

/** Los Rodeos: la cota de su pista y su TORA, la de la 30. */
const LOS_RODEOS = 632;
const TORA = 3171;

const JAZ_90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;

interface Momento {
  readonly aguja: number;
  readonly verdadera: number;
  readonly enTierra: boolean;
  readonly t: number;
}

/**
 * Una carrera a todo gas sin tirar, y cuándo pasa la aguja cada V del día: con
 * la misma regla que el destello del HUD —V1 al pasarla, Vr al llegar—, y con
 * la verdadera para ver lo que hacía antes.
 */
function carrera(cota: number, aire: Aire) {
  const v = velocidadesDeDespegue(JAZ_90, TORA, airDensity(cota, aire));
  const m = new CoefficientFlightModel({ aircraft: JAZ_90, ground: () => cota, assist: 0 });
  m.ponerAire(aire);
  m.reset({ position: new Vector3(0, cota + JAZ_90.gearHeight, 0), heading: 0, airspeed: 0 });
  m.setOnRunway(true);
  const s = m.state;
  const momento = (t: number): Momento => ({
    aguja: indicadaDe(s, m.aireDelDia()),
    verdadera: s.airspeed,
    enTierra: s.onGround,
    t,
  });
  let v1: Momento | null = null;
  let vr: Momento | null = null;
  let v1EnVerdadera: Momento | null = null;
  for (let t = 0; t < 120 && !vr; t += 1 / 60) {
    m.step(1 / 60, { ...neutralControls(), throttle: 1, engineOn: true });
    const ahora = momento(t);
    if (!v1EnVerdadera && v.v1 !== null && ahora.verdadera > v.v1) v1EnVerdadera = ahora;
    if (!v1 && v.v1 !== null && ahora.aguja > v.v1) v1 = ahora;
    if (v1 && ahora.aguja >= v.vr) vr = ahora;
  }
  return { v, v1, vr, v1EnVerdadera };
}

describe("la indicada de un avión que vuela", () => {
  it("a nivel del mar, en un día estándar, es la verdadera", () => {
    const s = { airspeed: 66.4, position: { y: 0 } };
    expect(indicadaDe(s, AIRE_ESTANDAR)).toBeCloseTo(66.4, 9);
  });

  it("arriba y con calor marca menos que la verdadera: en Los Rodeos a 40 °C, más de un 6 %", () => {
    const s = { airspeed: 70, position: { y: LOS_RODEOS } };
    expect(indicadaDe(s, aireDelParte(40, LOS_RODEOS))).toBeLessThan(70 * 0.94);
  });
});

describe("V1 y Vr salen a su indicada", () => {
  it("a nivel del mar da igual: la aguja y la verdadera pasan V1 a la vez", () => {
    const c = carrera(0, AIRE_ESTANDAR);
    expect(c.v1 && c.v1EnVerdadera).toBeTruthy();
    expect(c.v1!.verdadera).toBeCloseTo(c.v1EnVerdadera!.verdadera, 0);
    expect(c.v1!.t - c.v1EnVerdadera!.t).toBeLessThan(0.1);
  });

  it("a 40 °C en Los Rodeos, V1 sale con la aguja en la V1, no con la verdadera", () => {
    const c = carrera(LOS_RODEOS, aireDelParte(40, LOS_RODEOS));
    const v1 = c.v.v1!;
    expect(c.v1, "la aguja no llegó a V1").not.toBeNull();
    expect(c.v1!.aguja).toBeGreaterThan(v1);
    expect(c.v1!.aguja).toBeLessThan(v1 + 0.3);
    // La verdadera va más de un 6 % por encima, y por la verdadera habría salido antes.
    expect(c.v1!.verdadera).toBeGreaterThan(v1 * 1.06);
    expect(c.v1EnVerdadera!.t).toBeLessThan(c.v1!.t - 1);
  });

  it("y Vr detrás, con la aguja en la Vr y las ruedas todavía en la pista", () => {
    const c = carrera(LOS_RODEOS, aireDelParte(40, LOS_RODEOS));
    expect(c.vr, "la aguja no llegó a la Vr").not.toBeNull();
    expect(c.vr!.aguja).toBeGreaterThanOrEqual(c.v.vr);
    expect(c.vr!.aguja).toBeLessThan(c.v.vr + 0.3);
    expect(c.vr!.t).toBeGreaterThanOrEqual(c.v1!.t);
    expect(c.v1!.enTierra).toBe(true);
    expect(c.vr!.enTierra).toBe(true);
  });
});

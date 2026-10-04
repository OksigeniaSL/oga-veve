/**
 * **Los aerofrenos también en el peldaño sencillo.**
 *
 * La instructora los pide cuando se baja por encima del perfil y el avión ya
 * no baja más deprisa —el «DRAG REQUIRED» del ordenador de un Boeing—, y en
 * Guyrami no hacían nada en el aire: pedirlos era mentir. Aquí cuestan lo que
 * cuestan en el modelo completo, por la misma cuenta que el tren y los flaps:
 * con el mismo gas, se baja más empinado y más despacio.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { ArcadeFlightModel } from "./arcade";
import { ARAI, YVAGA, type AircraftConfig } from "./aircraft";
import { neutralControls } from "./model";

/** Treinta segundos a seis mil metros con el gas y la palanca dados. */
function bajando(avion: AircraftConfig, aerofrenos: number) {
  const m = new ArcadeFlightModel({ aircraft: avion, ground: () => 0 });
  m.reset({
    position: new Vector3(0, 4000, 0),
    heading: 0,
    airspeed: avion.cruiseSpeed * 0.7,
  });
  const mandos = {
    ...neutralControls(),
    engineOn: true,
    throttle: 0.8,
    elevator: -1,
    tren: 0,
    aerofrenos,
  };
  for (let t = 0; t < 30; t += 0.05) m.step(0.05, mandos);
  return { vertical: m.state.verticalSpeed, velocidad: m.state.airspeed };
}

describe("los aerofrenos en el modelo sencillo", () => {
  for (const avion of [ARAI, YVAGA])
    it(`${avion.id}: con el mismo gas, se baja más empinado y más despacio`, () => {
      const sin = bajando(avion, 0);
      const con = bajando(avion, 1);
      expect(con.vertical).toBeLessThan(sin.vertical - 1);
      expect(con.velocidad).toBeLessThan(sin.velocidad);
    });

  it("y recogidos no cambian nada", () => {
    const a = bajando(YVAGA, 0);
    const m = new ArcadeFlightModel({ aircraft: YVAGA, ground: () => 0 });
    m.reset({ position: new Vector3(0, 4000, 0), heading: 0, airspeed: YVAGA.cruiseSpeed * 0.7 });
    const mandos = { ...neutralControls(), engineOn: true, throttle: 0.8, elevator: -1, tren: 0 };
    for (let t = 0; t < 30; t += 0.05) m.step(0.05, mandos);
    expect(m.state.verticalSpeed).toBeCloseTo(a.vertical, 6);
  });
});

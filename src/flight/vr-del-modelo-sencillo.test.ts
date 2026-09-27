/**
 * En el peldaño de Guyrami cada avión se va del suelo **a la velocidad de su
 * tipo**, y la carrera pasa por sus dos momentos: V1 y rotar.
 *
 * El modelo sencillo dejaba subir a partir del ochenta y cinco por ciento de la
 * velocidad de aproximación. En los de hélice eso cae en su Vr y nadie lo vio;
 * en los reactores no: el JAZ 120 se iba a 124 nudos, por debajo de su V1 de
 * 155, así que la fase «comprometido» no llegaba nunca y no se cantaban ni
 * «V one» ni «rotate». Medido en Pettirossi y visto jugando en Lanzarote.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { ArcadeFlightModel } from "./arcade";
import { AIRCRAFT } from "./aircraft";
import { neutralControls } from "./model";

describe.each(AIRCRAFT.map((a) => [a.id, a] as const))(
  "el %s en el modelo sencillo",
  (_id, a) => {
    it("se va del suelo a su Vr, y pasa V1 con las ruedas en la pista", () => {
      const m = new ArcadeFlightModel({ aircraft: a, ground: () => 0 });
      m.reset({
        position: new Vector3(0, a.gearHeight, 0),
        heading: 0,
        airspeed: 0,
      });
      m.state.onRunway = true;
      let v1EnElSuelo = false;
      let seVa = 0;
      for (let t = 0; t < 240; t += 0.02) {
        // Tirando desde el principio, que es lo que hace quien tiene prisa.
        m.step(0.02, {
          ...neutralControls(),
          engineOn: true,
          throttle: 1,
          elevator: 1,
        });
        m.state.onRunway = true;
        if (m.state.onGround && m.state.airspeed >= a.decisionSpeed)
          v1EnElSuelo = true;
        if (!m.state.onGround) {
          seVa = m.state.airspeed;
          break;
        }
      }
      expect(seVa).toBeGreaterThanOrEqual(a.rotationSpeed * 0.99);
      expect(v1EnElSuelo).toBe(true);
    });
  },
);

it("el JAZ 120 ya no se va a ciento veinte nudos", () => {
  const a = AIRCRAFT.find((x) => x.id === "jaz-120")!;
  // Su Vr de reactor grande: ciento sesenta y siete nudos.
  expect(a.rotationSpeed / 0.514444).toBeGreaterThan(160);
});

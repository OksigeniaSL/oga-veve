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
import { AIRCRAFT, MEDIDOS } from "./aircraft";
import { neutralControls } from "./model";

describe.each(MEDIDOS.map((a) => [a.id, a] as const))(
  "el %s en el modelo sencillo",
  (_id, a) => {
    it("se va del suelo a su Vr, y pasa V1 con las ruedas en la pista o al dejarla", () => {
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
      /*
       * **Y la V1 llega antes de dejar el suelo, o a la vez**: la Vr no puede
       * ser menor que la V1 (CS 25.107(e)(2)), así que un avión no se va del
       * suelo sin haber pasado la decisión. Donde la V1 va por debajo de la Vr,
       * se pasa rodando, con unos segundos de «ya no paro y todavía no vuelo».
       * Donde las dos son la misma —el Twin Otter, «Rotation speeds (VR = V1)»
       * en la figura 4-1 de su manual—, la decisión y la rotación son el mismo
       * instante, el último con las ruedas en la pista, y en este modelo, que
       * se va del suelo en cuanto llega a la Vr, el mismo paso. El canto no
       * depende de eso: el HUD dice «V one» al pasar la V1 en la carrera, con
       * las ruedas en el suelo o recién dejándolo. Ver `Hud`.
       */
      expect(seVa).toBeGreaterThanOrEqual(a.decisionSpeed);
      if (a.decisionSpeed < a.rotationSpeed) expect(v1EnElSuelo).toBe(true);
    });
  },
);

it("el JAZ 120 ya no se va a ciento veinte nudos", () => {
  const a = AIRCRAFT.find((x) => x.id === "jaz-120")!;
  // Su Vr de reactor grande a la masa de su ficha: ciento cuarenta y cinco
  // nudos. Eran 167, la de su peso máximo al despegar (ADR 0027).
  expect(a.rotationSpeed / 0.514444).toBeGreaterThan(140);
});

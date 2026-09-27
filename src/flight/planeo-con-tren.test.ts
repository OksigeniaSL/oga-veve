/**
 * El planeo, con el tren dentro y con el tren fuera: #170.
 *
 * Meter el tren restaba veinte milésimas a un `cd0` que ya era el del avión
 * limpio, así que el JAZ 90 volaba con resistencia parásita cero y el JAZ 120
 * con −0,003, y planeaban de más. Aquí se mide **en el motor de vuelo** —no en
 * la cuenta— la fineza de cada retráctil en su punto de mejor planeo, con el
 * tren dentro y fuera: dentro tiene que ser la de su polar limpia, y fuera,
 * peor.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "./fdm";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { neutralControls } from "./model";
import { planeoDe } from "./sin-motor";
import { airDensity } from "./atmosphere";

const G = 9.80665;
const ALTO = 1500;

/**
 * La fineza que da el motor de vuelo en este punto: se le pone al avión el
 * ángulo de ataque de mejor planeo, se le deja un instante sin motor y se
 * leen la sustentación y la resistencia de lo que cambia su velocidad.
 */
function finezaMedida(a: AircraftConfig, tren: number): number {
  const m = new CoefficientFlightModel({
    aircraft: a,
    ground: () => 0,
    assist: 0,
  });
  const polar = planeoDe(a);
  const v = polar.velocidad * Math.sqrt(1.225 / airDensity(ALTO));
  m.reset({ position: new Vector3(0, ALTO, 0), heading: 0, airspeed: v });
  // El ángulo que da el CL de mejor planeo: `(CL − cl0)/clα`.
  const alargamiento = (a.wingSpan * a.wingSpan) / a.wingArea;
  const cl = Math.sqrt(a.aero.cd0 * Math.PI * alargamiento * a.aero.oswald);
  const alfa = (cl - a.aero.cl0) / a.aero.clAlpha;
  m.state.orientation.setFromAxisAngle(new Vector3(1, 0, 0), alfa);
  const antes = m.state.velocity.clone();
  const dt = 1 / 240;
  m.step(dt, { ...neutralControls(), engineOn: false, throttle: 0, tren });
  const acel = m.state.velocity.clone().sub(antes).divideScalar(dt);
  acel.y += G;
  const hacia = antes.clone().normalize();
  const resistencia = -acel.dot(hacia);
  const sustentacion = acel.clone().sub(hacia.multiplyScalar(-resistencia)).length();
  return sustentacion / resistencia;
}

const retractiles = AIRCRAFT.filter((a) => a.trenRetractil);

describe.each(retractiles.map((a) => [a.id, a] as const))(
  "el planeo del %s",
  (_id, a) => {
    it("con el tren dentro planea lo que dice su polar limpia", () => {
      const polar = planeoDe(a);
      const medida = finezaMedida(a, 0);
      expect(medida).toBeGreaterThan(polar.fineza * 0.95);
      expect(medida).toBeLessThan(polar.fineza * 1.05);
    });

    it("y con el tren fuera planea peor, por lo que cuesta su tren", () => {
      const dentro = finezaMedida(a, 0);
      const fuera = finezaMedida(a, 1);
      expect(fuera).toBeLessThan(dentro * 0.9);
      expect(fuera).toBeGreaterThan(dentro * 0.5);
    });
  },
);

/*
 * **Lo que pasaba antes**: con el `cd0` a cero, la fineza de un reactor sin
 * tren solo la limita la resistencia inducida, y en su punto de mejor planeo
 * salía por encima de cincuenta. Un reactor de línea planea diecisiete.
 */
it("ningún reactor planea como un velero con el tren dentro", () => {
  for (const a of retractiles)
    expect(finezaMedida(a, 0), a.id).toBeLessThan(25);
});

/**
 * **Los pies del piloto del banco en la carrera, contra el modelo del juego**
 * (H44b). Ver `el-eje-de-la-carrera.mjs`.
 *
 * El banco de despegue voló por primera vez Taguató Ruvichá con el JAZ 90 en
 * Los Rodeos y no despegó: empezó la carrera siete grados torcido y veintisiete
 * metros fuera del eje, con el mando de alabeo como único volante —que en ese
 * peldaño, pasados los veintiocho metros por segundo, no gira nada— y acabó a
 * doscientos cincuenta metros de la pista. Aquí, la carrera del JAZ 90 en la
 * mesa, en la 12 de Los Rodeos y con su viento de casa, 12 kt del 040: desde
 * el eje, y desde donde el juego da a uno por alineado, que es lo más lejos
 * que el banco suelta frenos. Con `OGA_MEDIR=1` dice dónde llega a la Vr.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel } from "../src/flight/fdm";
import { ARAI } from "../src/flight/aircraft";
import { flapsDeDespegue } from "../src/flight/flaps";
import { neutralControls } from "../src/flight/model";
import { TAGUATO_RUVICHA } from "../src/flight/tiers";
import { elEjeDeLaCarrera } from "./el-eje-de-la-carrera.mjs";

const DT = 1 / 60;
const KT = 0.514444;
const PISTA = (120 * Math.PI) / 180;

/** Del eje de la pista que pasa por el origen, m: positivo a la derecha. */
const delEje = (p) => p.x * Math.cos(PISTA) + p.z * Math.sin(PISTA);

/** La carrera hasta la Vr, gas a fondo y flaps de despegue, desde `lejos` m del eje y `torcido` rad. */
function carrera(lejos, torcido) {
  const m = new CoefficientFlightModel({ aircraft: ARAI, ground: () => 0, assist: TAGUATO_RUVICHA.assists });
  // Del 040, hacia donde va: norte es −Z.
  const de = (40 * Math.PI) / 180;
  m.ponerViento(-Math.sin(de) * 12 * KT, Math.cos(de) * 12 * KT);
  const x = Math.cos(PISTA) * lejos;
  const z = Math.sin(PISTA) * lejos;
  m.reset({ position: new Vector3(x, ARAI.gearHeight, z), heading: PISTA + torcido, airspeed: 0 });
  m.setOnRunway(true);
  const c = { ...neutralControls(), throttle: 1, flaps: flapsDeDespegue(ARAI) };
  let acumulado = 0;
  // Lo más lejos del eje pasados diez segundos, m: lo de antes es volver a él.
  let peor = 0;
  for (let t = 0; t < 90; t += DT) {
    const s = m.state;
    const pies = elEjeDeLaCarrera({
      rumboPista: PISTA,
      rumbo: s.heading,
      desvio: delEje(s.position),
      porElSuelo: Math.hypot(s.velocity.x, s.velocity.z),
      giro: s.yawRate,
      derrape: s.beta,
      acumulado,
      paso: DT,
      conAyudaEnTierra: TAGUATO_RUVICHA.assists.autoRudder > 0,
    });
    acumulado = pies.acumulado;
    c.rudder = pies.rudder;
    c.aileron = pies.aileron;
    m.step(DT, c);
    if (t > 10) peor = Math.max(peor, Math.abs(delEje(s.position)));
    if (s.airspeed >= ARAI.rotationSpeed) {
      if (process.env.OGA_MEDIR) console.log(`${lejos} m: a la Vr en ${t.toFixed(1)} s, a ${delEje(s.position).toFixed(1)} m del eje, lo peor ${peor.toFixed(1)}`);
      return { eje: delEje(s.position), peor, llega: true };
    }
  }
  return { eje: delEje(m.state.position), peor, llega: false };
}

describe("los pies del piloto del banco en la carrera del JAZ 90, en Ruvichá", () => {
  it("desde el eje, llega a la Vr por el eje con el viento de casa de Los Rodeos", () => {
    const r = carrera(0, 0);
    expect(r.llega).toBe(true);
    expect(Math.abs(r.eje)).toBeLessThan(2);
  });

  it("y desde donde el juego ya lo da por alineado, a doce metros y ocho grados, vuelve al eje", () => {
    for (const [lejos, torcido] of [
      [12, (-8 * Math.PI) / 180],
      [-12, (8 * Math.PI) / 180],
    ]) {
      const r = carrera(lejos, torcido);
      expect(r.llega, `${lejos} m`).toBe(true);
      // Medido: a 0,7 y 0,4 m del eje en la Vr, y pasados diez segundos a 3,4 m como mucho.
      expect(r.peor, `${lejos} m`).toBeLessThan(6);
      expect(Math.abs(r.eje), `${lejos} m`).toBeLessThan(2);
    }
  });
});

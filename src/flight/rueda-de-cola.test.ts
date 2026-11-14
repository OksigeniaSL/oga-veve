/**
 * **El JAZ 25 se sienta en su rueda de cola, y la levanta al correr** (#187,
 * enmienda H10b del ADR 0027).
 *
 * Es el único de la flota con rueda atrás, y descansaba a nivel con ella casi
 * un metro en el aire: el modelo de vuelo lo trataba como un triciclo, y su
 * dibujo llevaba las principales detrás del centro de gravedad, como uno.
 *
 * Lo que se mira:
 *
 * - parado, en los dos modelos, en su actitud en tres puntos y con las ruedas
 *   en el suelo;
 * - en la carrera, con la palanca adelante, la cola se levanta a la velocidad
 *   a la que la levanta el de su tipo —«Raise Tail — 40 MPH», *Ag-Cat Pilot's
 *   Handbook*, Grumman American, 1977—, y con la palanca suelta, mucho más
 *   tarde;
 * - el modelo sencillo rueda con la cola arriba lo que el de coeficientes con
 *   la palanca adelante (`actitudEnTierra`);
 * - y el brazo del peso de cada uno, el de su tren.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, aircraftById } from "./aircraft";
import { actitudEnTierra, alturaSobreLasRuedas, brazoDelTren, COLA_ARRIBA, COLA_EMPIEZA } from "./apoyo";
import { ArcadeFlightModel } from "./arcade";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls, type FlightModel } from "./model";

const GRADO = Math.PI / 180;
const MILLA = 0.44704;
const DT = 1 / 120;

const cabeceoDe = (m: FlightModel): number =>
  Math.asin(new Vector3(0, 0, -1).applyQuaternion(m.state.orientation).y);

describe("el de rueda de cola, parado", () => {
  const a = aircraftById("jaz-25");

  it("es el único de la flota, y lleva las principales delante del centro", () => {
    const conRuedaDeCola = AIRCRAFT.filter((x) => x.actitudEnTresPuntos !== undefined);
    expect(conRuedaDeCola.map((x) => x.id)).toEqual(["jaz-25"]);
    expect(a.mainWheelsAft).toBeLessThan(0);
    // Su tope de cola es su actitud en tres puntos: más allá, la cola no baja.
    expect(a.maxGroundPitch).toBeCloseTo(a.actitudEnTresPuntos!, 6);
  });

  it("se sienta en sus tres puntos, en los dos modelos, sin moverse", () => {
    for (const m of [
      new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 }),
      new ArcadeFlightModel({ aircraft: a, ground: () => 0 }),
    ] as FlightModel[]) {
      m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: 0, airspeed: 0 });
      for (let k = 0; k < 3 / DT; k++) m.step(DT, { ...neutralControls(), engineOn: false, brakes: 1 });
      expect(m.state.onGround).toBe(true);
      expect(Math.abs(cabeceoDe(m) - a.actitudEnTresPuntos!)).toBeLessThan(0.2 * GRADO);
      // Las principales en el suelo: el centro, a su altura con ese cabeceo.
      expect(m.state.position.y).toBeCloseTo(alturaSobreLasRuedas(a, cabeceoDe(m)), 2);
    }
  });
});

/** Todo el gas con la palanca quieta: a qué velocidad deja el suelo la rueda de cola, m/s. */
function levantaLaCola(palanca: number): number {
  const a = aircraftById("jaz-25");
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
  m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: 0, airspeed: 0 });
  // La ballesta se estira poco más de un grado antes de que la rueda deje de tocar.
  const fuera = a.actitudEnTresPuntos! - 1.2 * GRADO;
  for (let k = 0; k < 60 / DT; k++) {
    m.step(DT, { ...neutralControls(), engineOn: true, throttle: 1, elevator: palanca });
    if (cabeceoDe(m) < fuera) return m.state.airspeed;
    if (m.state.airspeed > a.rotationSpeed) break;
  }
  return Infinity;
}

describe("el de rueda de cola, corriendo", () => {
  const a = aircraftById("jaz-25");

  it("con la palanca adelante, levanta la cola a las cuarenta millas de su tipo", () => {
    const v = levantaLaCola(-1);
    // Entre 35 y 45 millas por hora: el manual dice cuarenta.
    expect(v / MILLA).toBeGreaterThan(35);
    expect(v / MILLA).toBeLessThan(45);
  });

  it("con la palanca suelta, mucho más tarde, pero antes de la Vr", () => {
    const v = levantaLaCola(0);
    expect(v).toBeGreaterThan(levantaLaCola(-1) * 1.2);
    expect(v).toBeLessThan(a.rotationSpeed);
  });

  it("el modelo sencillo levanta la cola cuando la puede levantar el de coeficientes", () => {
    // La cuenta empieza a subir la cola donde el de verdad ya puede, no antes.
    expect(COLA_EMPIEZA * a.rotationSpeed).toBeGreaterThanOrEqual(levantaLaCola(-1));
    expect(actitudEnTierra(a, 0)).toBeCloseTo(a.actitudEnTresPuntos!, 9);
    expect(actitudEnTierra(a, COLA_ARRIBA * a.rotationSpeed)).toBe(0);
    // Y un triciclo rueda a nivel siempre.
    expect(actitudEnTierra(aircraftById("jaz-20"), 0)).toBe(0);

    const m = new ArcadeFlightModel({ aircraft: a, ground: () => 0 });
    m.reset({ position: new Vector3(0, a.gearHeight, 0), heading: 0, airspeed: 0 });
    let colaArribaA = Infinity;
    for (let k = 0; k < 60 / DT && m.state.onGround; k++) {
      m.step(DT, { ...neutralControls(), engineOn: true, throttle: 1 });
      if (!Number.isFinite(colaArribaA) && cabeceoDe(m) < GRADO) colaArribaA = m.state.airspeed;
      // Las principales nunca dentro del suelo, y la cola tampoco.
      expect(cabeceoDe(m)).toBeLessThanOrEqual(a.maxGroundPitch + 1e-6);
    }
    expect(colaArribaA).toBeLessThan(a.rotationSpeed);
  });
});

describe("el brazo del peso, el de cada tren", () => {
  it("a nivel, la distancia del centro al centro de su tren principal", () => {
    for (const a of AIRCRAFT) {
      if (a.helicoptero) continue;
      expect(brazoDelTren(a, 0), a.id).toBeCloseTo(a.mainGearAft ?? a.mainWheelsAft, 9);
    }
    // En los de bogie, el peso carga en el centro de las patas y no en el eje de atrás.
    for (const id of ["jaz-110", "jaz-120"]) {
      const a = aircraftById(id);
      expect(a.mainGearAft!, id).toBeLessThan(a.mainWheelsAft);
      // Y la rueda de morro carga entre el 5 y el 10 % del peso.
      expect(a.mainGearAft! / a.batalla, id).toBeGreaterThan(0.05);
      expect(a.mainGearAft! / a.batalla, id).toBeLessThan(0.1);
    }
  });

  it("al levantar el morro, el apoyo se acerca a la vertical del centro en un triciclo", () => {
    const a = aircraftById("jaz-90");
    expect(brazoDelTren(a, 10 * GRADO)).toBeLessThan(brazoDelTren(a, 0));
    // Y en el de rueda de cola se aleja: con la cola baja, tira más de ella.
    const b = aircraftById("jaz-25");
    expect(brazoDelTren(b, b.actitudEnTresPuntos!)).toBeLessThan(brazoDelTren(b, 0));
  });
});

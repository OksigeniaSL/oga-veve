/**
 * La reversa, que no existía.
 *
 * Se echó de menos jugando, y con razón: «cuando tomo tierra no tengo reversa».
 * En un avión de línea es la mitad de la parada — el chorro se desvía hacia
 * delante y frena sin gastar frenos ni neumáticos, que es lo que se cuida en una
 * pista mojada o corta.
 *
 * Y **no la tienen todos**: los turbofanes y los turbohélices sí, los de pistón
 * no. Una avioneta para con los frenos y con la pista que tenga, y esa es
 * justamente la lección de por qué necesita menos pista y por qué un 747 no
 * puede aterrizar donde ella.
 */

import { describe, expect, it } from "vitest";
import { ArcadeFlightModel } from "./arcade";
import { CoefficientFlightModel } from "./fdm";
import { AIRCRAFT, PYKASU, tieneReversa } from "./aircraft";
import { neutralControls } from "./model";
import { Vector3 } from "three";

/** Mete el avión en la pista a su velocidad de toma y lo frena. Devuelve metros. */
function paraEn(
  Modelo: typeof ArcadeFlightModel | typeof CoefficientFlightModel,
  avion: (typeof AIRCRAFT)[number],
  reversa: number,
) {
  const m = new Modelo({ aircraft: avion, ground: () => 0 });
  m.reset({
    position: new Vector3(0, 0, 0),
    heading: 0,
    airspeed: avion.approachSpeed,
  });
  m.setOnRunway(true);
  const mandos = {
    ...neutralControls(),
    engineOn: true,
    throttle: 0,
    brakes: 1,
    reversa,
  };
  let metros = 0;
  for (let t = 0; t < 90; t += 0.02) {
    const antes = m.state.position.clone();
    m.step(0.02, mandos);
    metros += m.state.position.distanceTo(antes);
    if (m.state.airspeed < 0.5) break;
  }
  return metros;
}

describe("la reversa acorta la parada", () => {
  for (const Modelo of [ArcadeFlightModel, CoefficientFlightModel]) {
    const cual = Modelo === ArcadeFlightModel ? "sencillo" : "coeficientes";

    it(`en el ${cual}, el cuatrimotor para antes con reversa`, () => {
      const jumbo = AIRCRAFT.find((a) => a.id === "jaz-120")!;
      expect(paraEn(Modelo, jumbo, 1)).toBeLessThan(paraEn(Modelo, jumbo, 0));
    });

    /*
     * Y **la avioneta no la tiene**: apretar no puede hacer nada. Si hiciera
     * algo, el juego estaría enseñando un avión que no existe.
     */
    it(`en el ${cual}, la avioneta de pistón no tiene`, () => {
      expect(paraEn(Modelo, PYKASU, 1)).toBeCloseTo(
        paraEn(Modelo, PYKASU, 0),
        0,
      );
    });
  }

  it("y la lleva quien la lleva, por su motor y no por una lista", () => {
    const conReversa = AIRCRAFT.filter(tieneReversa).map((a) => a.id);
    expect(conReversa).toEqual(["jaz-60", "jaz-90", "jaz-120"]);
  });

  /*
   * Y **se apaga sola despacio**, como en un avión de verdad: por debajo de unos
   * treinta nudos la reversa deja de frenar y empieza a levantar del suelo lo
   * que haya y a metérselo al motor. Así que no puede usarse de marcha atrás.
   */
  it("y no sirve de marcha atrás", () => {
    const jumbo = AIRCRAFT.find((a) => a.id === "jaz-120")!;
    const m = new ArcadeFlightModel({ aircraft: jumbo, ground: () => 0 });
    m.reset({ position: new Vector3(0, 0, 0), heading: 0, airspeed: 0 });
    m.setOnRunway(true);
    const mandos = {
      ...neutralControls(),
      engineOn: true,
      throttle: 0,
      reversa: 1,
    };
    for (let t = 0; t < 20; t += 0.02) m.step(0.02, mandos);
    /*
     * Ni coge velocidad ni se mueve apenas. Los cinco metros que anda en veinte
     * segundos no son la reversa empujando: son el **ralentí arrastrando**, que
     * es lo que hace un avión parado con los motores en marcha y sin freno. La
     * reversa está apagada, como debe, porque va a menos de treinta nudos.
     */
    expect(m.state.airspeed).toBeLessThan(1);
    expect(m.state.position.length()).toBeLessThan(15);
  });
});

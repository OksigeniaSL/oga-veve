/**
 * **La marca del motor dice la verdad**: con el gas en la marca, el avión va
 * a la velocidad de la marca rosa y se queda en ella.
 *
 * Es la prueba de que la cuenta de `gas-que-toca.ts` y el modelo de vuelo
 * dicen lo mismo: se pone el gas que ella da, se sostiene la altura con la ley
 * del automático —sin gases: el gas no lo toca nadie— y se mira la velocidad
 * dos minutos. Si la marca mintiera, el avión se iría acelerando o frenando
 * con el gas «bien puesto», que es justo lo que Enrique hacía a mano: bajar
 * el gas «hasta encontrar el equilibrio que el juego da».
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls } from "./model";
import { indicatedAirspeed, trueFromIndicated } from "./atmosphere";
import { bankAngleOf, pitchAngleOf } from "../ui/actitud";
import { mandosPara, memoriaNueva } from "./piloto-automatico";
import { NUDO, velocidadQueToca } from "./escalera-de-velocidades";
import { gasQueSostiene, marcaDelGas, NIVELADO } from "./gas-que-toca";
import { MOTOR_QUE_SOSTIENE } from "./arcade";
import { TAGUATO } from "./tiers";

const PIE = 0.3048;
const DT = 1 / 60;
const de = (id: string): AircraftConfig => AIRCRAFT.find((a) => a.id === id)!;

/**
 * Vuela nivelado `segundos` con el gas quieto en la marca y devuelve la
 * indicada del principio y la del final, nudos.
 */
function nivelado(a: AircraftConfig, pies: number, kt: number, segundos: number) {
  const altura = pies * PIE;
  const modelo = new CoefficientFlightModel({
    aircraft: a,
    ground: () => 0,
    assist: TAGUATO.assists,
  });
  const verdadera = trueFromIndicated(kt * NUDO, altura);
  modelo.reset({
    position: new Vector3(0, altura, 0),
    heading: 0,
    airspeed: verdadera,
    equilibrado: true,
  });
  const gas = gasQueSostiene(a, {
    altura,
    verdadera,
    flaps: 0,
    tren: a.trenRetractil ? 0 : 1,
    pendiente: 0,
  });
  expect(gas, a.id).not.toBeNull();
  const s = modelo.state;
  const memoria = memoriaNueva();
  const trim = modelo.timonDeEquilibrio?.() ?? 0;
  for (let t = 0; t < segundos; t += DT) {
    const m = mandosPara(
      {
        heading: s.heading,
        alabeo: bankAngleOf(s.orientation),
        cabeceo: pitchAngleOf(s.orientation),
        altitud: s.position.y,
        vertical: s.velocity.y,
        velocidad: indicatedAirspeed(s.airspeed, s.position.y),
        gas: gas!,
        verdadera: s.airspeed,
        ritmoDeCabeceo: s.pitchRate,
        timon: t === 0 ? trim : modelo.timonAhora(),
      },
      { rumbo: 0, altitud: altura, velocidad: null, gases: null },
      DT,
      memoria,
    );
    modelo.step(DT, {
      ...neutralControls(),
      tren: a.trenRetractil ? 0 : 1,
      throttle: gas!,
      aileron: m.aileron,
      elevator: m.elevator,
      automatico: true,
    });
  }
  return {
    gas: gas!,
    kt: indicatedAirspeed(s.airspeed, s.position.y) / NUDO,
    altura: s.position.y,
  };
}

describe("la marca del motor", () => {
  it.each(["jaz-120", "jaz-90", "jaz-60", "jaz-40", "jaz-20"])(
    "con el gas en la marca, el %s se queda en la velocidad de la marca rosa",
    (id) => {
      const a = de(id);
      // A su crucero, como lo pondría la escalera: los reactores a quince
      // mil pies, los de hélice a la altura de su ficha.
      const pies = a.sound.engine === "turbofan" ? 15000 : Math.min(8000, a.alturaDeCrucero / PIE);
      const kt = velocidadQueToca(a, {
        altitud: pies * PIE,
        restante: null,
        bajando: false,
        enFinal: false,
        subiendo: false,
      }).kt;
      const r = nivelado(a, pies, kt, 120);
      expect(r.gas, id).toBeGreaterThan(0.05);
      expect(r.gas, id).toBeLessThan(1);
      // Cinco nudos en dos minutos es la aguja quieta a la vista.
      expect(Math.abs(r.kt - kt), `${id}: ${kt} → ${r.kt.toFixed(1)} kt con gas ${r.gas.toFixed(3)}`).toBeLessThan(5);
      expect(Math.abs(r.altura - pies * PIE), id).toBeLessThan(30);
    },
  );

  it("bajando por la senda hace falta menos gas que nivelado, y con flaps y tren, más", () => {
    const a = de("jaz-90");
    const comun = { altura: 600, verdadera: 70, flaps: 1, tren: 1 };
    const llano = gasQueSostiene(a, { ...comun, pendiente: 0 })!;
    const senda = gasQueSostiene(a, { ...comun, pendiente: (-3 * Math.PI) / 180 })!;
    const limpio = gasQueSostiene(a, { ...comun, flaps: 0, tren: 0, pendiente: 0, verdadera: 110 })!;
    expect(senda).toBeLessThan(llano);
    expect(senda).toBeGreaterThan(0);
    // Con todo fuera se frena: a la misma velocidad, con flaps y tren hace
    // falta más gas que limpio.
    const sucio = gasQueSostiene(a, { ...comun, verdadera: 110, pendiente: 0 })!;
    expect(sucio).toBeGreaterThan(limpio);
  });

  it("y ni a fondo, no hay marca", () => {
    // Un reactor a mach y pico: la onda no se pasa con el gas.
    expect(gasQueSostiene(de("jaz-90"), { altura: 3000, verdadera: 330, flaps: 0, tren: 0, pendiente: 0 })).toBeNull();
  });

  it("en el modelo sencillo, la de siempre mientras quien vuela lleva la altura; la de la velocidad, si la sostiene otro", () => {
    const base = {
      sencillo: true,
      enTierra: false,
      alturaSostenida: false,
      vertical: 3,
      enLaFinal: false,
      gasDeLaMarca: 0.9,
    };
    expect(marcaDelGas(base)).toBe(MOTOR_QUE_SOSTIENE);
    expect(marcaDelGas({ ...base, alturaSostenida: true })).toBe(0.9);
    expect(marcaDelGas({ ...base, enLaFinal: true, gasDeLaMarca: 0.25 })).toBe(0.25);
    expect(marcaDelGas({ ...base, enTierra: true })).toBe(MOTOR_QUE_SOSTIENE);
  });

  it("en el completo, nivelado o en la final; subiendo o bajando, ninguna", () => {
    const base = {
      sencillo: false,
      enTierra: false,
      alturaSostenida: false,
      vertical: 0,
      enLaFinal: false,
      gasDeLaMarca: 0.62,
    };
    expect(marcaDelGas(base)).toBe(0.62);
    expect(marcaDelGas({ ...base, vertical: NIVELADO * 4 })).toBeNull();
    expect(marcaDelGas({ ...base, vertical: -NIVELADO * 4, enLaFinal: true })).toBe(0.62);
    expect(marcaDelGas({ ...base, enTierra: true })).toBeNull();
  });
});

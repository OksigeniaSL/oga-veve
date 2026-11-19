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
import { gasQueSostiene, marcaDelGas, NIVELADO, velocidadDeCrucero } from "./gas-que-toca";
import { MOTOR_QUE_SOSTIENE } from "./arcade";
import { TAGUATO } from "./tiers";
import { topeConMargen, topeDeVelocidad } from "./limites";

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

/*
 * **La velocidad de la tabla de crucero**, la que se usa para planear una
 * estima (ADR 0031, enmienda H26t): con la de la ficha, el JAZ 40 empezaba a
 * 189 nudos a dos mil pies, que ahí no sostiene, frenaba a 166 y la cuenta del
 * plan contaba con 189: el sitio quedaba ocho kilómetros por delante.
 */
describe("la velocidad de la tabla de crucero", () => {
  const sostiene = (a: AircraftConfig, altura: number, v: number) =>
    gasQueSostiene(a, { altura, verdadera: v, flaps: 0, tren: a.trenRetractil ? 0 : 1, pendiente: 0 });

  it("el JAZ 40 abajo va más despacio que su ficha, y a su altura de crucero va a la de la ficha", () => {
    const a = de("jaz-40");
    const abajo = velocidadDeCrucero(a, { altura: 2000 * PIE, tren: 0 });
    expect(abajo / NUDO).toBeGreaterThan(150);
    expect(abajo / NUDO).toBeLessThan(165);
    // La ficha, ni a fondo: por eso no se puede planear con ella aquí.
    expect(sostiene(a, 2000 * PIE, a.cruiseSpeed)).toBeNull();
    // Arriba, la de la ficha: es la de su altura de crucero, con el 75 %.
    expect(velocidadDeCrucero(a, { altura: a.alturaDeCrucero, tren: 0 }) / NUDO).toBeGreaterThan(189 * 0.97);
  });

  it("en ningún avión pasa de la de la ficha, y siempre se sostiene con gas de sobra", () => {
    for (const a of AIRCRAFT.filter((x) => !x.helicoptero)) {
      for (const pies of [0, 2000, 5000, 9000]) {
        const v = velocidadDeCrucero(a, { altura: pies * PIE, tren: a.trenRetractil ? 0 : 1 });
        expect(v, `${a.id} a ${pies} ft`).toBeLessThanOrEqual(a.cruiseSpeed);
        expect(sostiene(a, pies * PIE, v), `${a.id} a ${pies} ft`).not.toBeNull();
      }
    }
  });

  /*
   * **Y nunca por encima de su tope** (ADR 0031, enmienda H39a). El JAZ 50
   * empezaba los ejercicios de radio a la de su ficha, 182 nudos verdaderos,
   * que son los de diez mil pies: a tres mil, su Vmo de 166 indicados son 174
   * verdaderos, y nacía con el aviso de sobrevelocidad. Un manual no escribe
   * en su tabla de crucero una velocidad por encima de su Vmo.
   */
  it("en ningún avión ni a ninguna altura pasa de su tope, con diez nudos y dos centésimas de margen", () => {
    for (const a of AIRCRAFT.filter((x) => !x.helicoptero)) {
      for (const altura of [0, 1000 * PIE, 3000 * PIE, 5000 * PIE, 9000 * PIE, 6000, a.alturaDeCrucero]) {
        const v = velocidadDeCrucero(a, { altura, tren: a.trenRetractil ? 0 : 1 });
        const que = `${a.id} a ${Math.round(altura)} m`;
        expect(v, que).toBeLessThanOrEqual(topeConMargen(a, altura) + 1e-9);
        expect(v, que).toBeLessThan(topeDeVelocidad(a, altura).verdadera);
        expect(indicatedAirspeed(v, altura) / NUDO, que).toBeLessThanOrEqual(a.vmoKt - 10 + 1e-6);
      }
    }
  });

  it("el JAZ 50 a tres mil pies va por debajo de su Vmo y la sostiene; a su altura de crucero, cerca de la ficha", () => {
    const a = de("jaz-50");
    const abajo = velocidadDeCrucero(a, { altura: 3000 * PIE, tren: 0 });
    // Su ficha, ahí, pasa del tope: es lo que hacía saltar el aviso al empezar.
    expect(a.cruiseSpeed).toBeGreaterThan(topeDeVelocidad(a, 3000 * PIE).verdadera);
    expect(indicatedAirspeed(abajo, 3000 * PIE) / NUDO).toBeLessThanOrEqual(156);
    expect(abajo / NUDO).toBeGreaterThan(150);
    expect(sostiene(a, 3000 * PIE, abajo)).not.toBeNull();
    // Arriba, entre la de la tabla y la ficha.
    const arriba = velocidadDeCrucero(a, { altura: a.alturaDeCrucero, tren: 0 });
    expect(arriba / NUDO).toBeGreaterThan(160);
    expect(arriba).toBeLessThanOrEqual(a.cruiseSpeed);
  });

  it("un reactor abajo no da la de su ficha, que es la de arriba: se queda bajo su Vmo", () => {
    for (const id of ["jaz-90", "jaz-110", "jaz-120"]) {
      const a = de(id);
      const abajo = velocidadDeCrucero(a, { altura: 1000, tren: 0 });
      expect(abajo, id).toBeLessThan(a.cruiseSpeed);
      expect(indicatedAirspeed(abajo, 1000) / NUDO, id).toBeCloseTo(a.vmoKt - 10, 0);
      // Y arriba, a su altura de crucero, la de la ficha.
      expect(velocidadDeCrucero(a, { altura: a.alturaDeCrucero, tren: 0 }), id).toBeCloseTo(a.cruiseSpeed, 6);
    }
  });

  it("y volada con el gas que la sostiene, se queda en ella: es la que lleva el plan", () => {
    const a = de("jaz-40");
    const altura = 2000 * PIE;
    const v = velocidadDeCrucero(a, { altura, tren: 0 });
    const kt = indicatedAirspeed(v, altura) / NUDO;
    const r = nivelado(a, 2000, kt, 120);
    expect(Math.abs(r.kt - kt)).toBeLessThan(2);
  });
});

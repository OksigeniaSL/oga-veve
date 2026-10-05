/**
 * **El avión pesa lo que lleva**: su masa sin combustible más lo que hay en
 * los depósitos, y baja al quemarlo.
 *
 * Pedido por Enrique, sobre cuánta pista hace falta: «como se hace en el mundo
 * real, según tipo de avión, peso, viento, etc., en cada momento». La masa era
 * la de la ficha y no bajaba al quemar (#91). Ver el ADR 0019.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, aircraftById, conMasa, masaDe } from "./aircraft";
import { cargaParaElPlan, masaConCombustible } from "./combustible";
import { camposDeLaRuta, tramosDelPlan } from "./alterno";
import { cabeEn, campoDe, destinosParaEsteAvion } from "./cabe";
import { carreraHastaVr, DIA_DE_TABLAS, pistaNecesariaHoy } from "./carrera";
import { DE_SU_CLASE } from "./ficha-tecnica";
import { CoefficientFlightModel } from "./fdm";
import { ArcadeFlightModel } from "./arcade";
import { neutralControls } from "./model";
import { destinosDe, SCENARIOS } from "../world/scenarios";

/** Lo que se carga en cada ruta que este avión tiene en el juego, kg. */
function cargasDe(a: (typeof AIRCRAFT)[number]): number[] {
  const cargas: number[] = [];
  for (const salida of SCENARIOS) {
    if (!cabeEn(a, campoDe(salida)).cabe) continue;
    const destinos = destinosParaEsteAvion(
      a,
      destinosDe(salida)
        .map((id) => SCENARIOS.find((s) => s.id === id))
        .filter((s): s is NonNullable<typeof s> => !!s),
    );
    const campos = camposDeLaRuta(salida, destinos);
    for (const c of campos) cargas.push(cargaParaElPlan(a, tramosDelPlan(campos[0]!, c, campos)));
  }
  return cargas.sort((x, y) => x - y);
}

describe("la masa sin combustible de cada ficha", () => {
  it.each(AIRCRAFT.map((a) => [a.id, a] as const))(
    "el %s nunca despega por encima del peso máximo de su clase",
    (_id, a) => {
      const mtow = DE_SU_CLASE[a.id]?.mtow;
      expect(mtow, a.id).toBeTruthy();
      const cargas = cargasDe(a);
      expect(cargas.length, a.id).toBeGreaterThan(0);
      // Con el kilo de redondeo de la ficha técnica, que va en kilos enteros.
      expect(masaConCombustible(a, cargas[cargas.length - 1]!), a.id).toBeLessThanOrEqual(
        mtow! + 1,
      );
    },
  );

  it.each(AIRCRAFT.map((a) => [a.id, a] as const))(
    "y su vuelo típico sale cerca de la masa de la ficha, que es con la que se midió todo",
    (_id, a) => {
      const cargas = cargasDe(a);
      const tipico = masaConCombustible(a, cargas[Math.floor(cargas.length / 2)]!);
      // El JAZ 20 se queda un 7 % por debajo: con la gente de una clase, y no
      // con cuatro adultos, que en un 172 no caben con los depósitos llenos.
      expect(tipico / a.mass, a.id).toBeGreaterThan(0.9);
      expect(tipico / a.mass, a.id).toBeLessThan(1.03);
    },
  );

  it("el Seneca II no pasa de las 4.000 lb sin combustible de su ficha de tipo", () => {
    expect(aircraftById("jaz-40").masaSinCombustible).toBeLessThanOrEqual(4000 * 0.45359237);
  });

  it("ni el regional de los 30.140 kg del Embraer 170", () => {
    expect(aircraftById("jaz-90").masaSinCombustible).toBeLessThanOrEqual(30140);
  });
});

describe("pesa lo que lleva", () => {
  const yvaga = aircraftById("jaz-120");

  it("sin combustible, lo de sin combustible; con él, eso más los kilos", () => {
    expect(masaConCombustible(yvaga, 0)).toBe(yvaga.masaSinCombustible);
    expect(masaConCombustible(yvaga, 20000)).toBe(yvaga.masaSinCombustible + 20000);
    expect(masaConCombustible(yvaga, -5)).toBe(yvaga.masaSinCombustible);
  });

  it("la copia con peso pesa eso, y la ficha sigue siendo la ficha", () => {
    const pesado = conMasa(yvaga, 270000);
    expect(masaDe(pesado)).toBe(270000);
    expect(pesado.mass).toBe(yvaga.mass);
    expect(masaDe(yvaga)).toBe(yvaga.mass);
    // Con la masa de la ficha, la ficha misma: se puede comparar por identidad.
    expect(conMasa(yvaga, yvaga.mass)).toBe(yvaga);
  });
});

describe("y la pista de hoy va con ese peso", () => {
  it("un vuelo largo sale más pesado y necesita más pista", () => {
    for (const a of AIRCRAFT) {
      const cargas = cargasDe(a);
      const corto = pistaNecesariaHoy(a, {
        ...DIA_DE_TABLAS,
        masa: masaConCombustible(a, cargas[0]!),
      });
      const largo = pistaNecesariaHoy(a, {
        ...DIA_DE_TABLAS,
        masa: masaConCombustible(a, cargas[cargas.length - 1]!),
      });
      expect(largo, a.id).toBeGreaterThan(corto);
    }
  });

  it("y sin peso en el día, la de la ficha", () => {
    const a = aircraftById("jaz-90");
    expect(pistaNecesariaHoy(a, { ...DIA_DE_TABLAS, masa: a.mass })).toBeCloseTo(
      pistaNecesariaHoy(a),
      6,
    );
  });

  it("la carrera hasta Vr crece con la masa: con la Vr de la ficha, en proporción", () => {
    const a = aircraftById("jaz-120");
    const ligera = carreraHastaVr(conMasa(a, 240000));
    const pesada = carreraHastaVr(conMasa(a, 270000));
    expect(pesada / ligera).toBeGreaterThan(270000 / 240000);
    expect(pesada / ligera).toBeLessThan((270000 / 240000) ** 2);
  });
});

describe("y los dos modelos de vuelo vuelan con ella", () => {
  /** Lo que corre en diez segundos a fondo desde parado, m. */
  function enDiezSegundos(
    modelo: CoefficientFlightModel | ArcadeFlightModel,
    a: (typeof AIRCRAFT)[number],
  ): number {
    modelo.reset({ position: new Vector3(0, a.gearHeight, 0), heading: 0, airspeed: 0 });
    modelo.setOnRunway(true);
    for (let k = 0; k < 600; k++)
      modelo.step(1 / 60, { ...neutralControls(), engineOn: true, throttle: 1 });
    return Math.hypot(modelo.state.position.x, modelo.state.position.z);
  }

  it.each([
    ["coeficientes", (a: (typeof AIRCRAFT)[number]) => new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 })],
    ["Guyrami", (a: (typeof AIRCRAFT)[number]) => new ArcadeFlightModel({ aircraft: a, ground: () => 0 })],
  ] as const)("en el de %s, el pesado acelera menos que el ligero", (_nombre, crear) => {
    const a = aircraftById("jaz-90");
    const ligero = crear(a);
    ligero.ponerMasa(a.masaSinCombustible);
    const pesado = crear(a);
    pesado.ponerMasa(a.masaSinCombustible + 9000);
    expect(pesado.masaAhora()).toBe(a.masaSinCombustible + 9000);
    expect(enDiezSegundos(pesado, a)).toBeLessThan(enDiezSegundos(ligero, a));
  });
});

/**
 * La despresurización y el descenso de emergencia, medidos.
 *
 * Lo que importa comprobar es lo que se enseña: que el aviso y las máscaras
 * llegan cuando llegan en un avión de verdad, que el número de «primero la
 * tuya» es el de la tabla, y sobre todo que **el descenso de emergencia tarda
 * lo que tarda en uno de verdad**. Un avión de este juego que bajara de once
 * mil metros a diez mil pies en quince minutos enseñaría que esto no corre
 * prisa, y corre.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { ARAI, ARASUNU, PANAMBI, YVAGA, type AircraftConfig } from "./aircraft";
import { NO_ASSISTS } from "./assists";
import { SEA_LEVEL_DENSITY, airDensity, indicatedAirspeed, velocidadDelSonido } from "./atmosphere";
import { CabinaPresurizada } from "./cabina-presurizada";
import {
  AVISO_DE_CABINA,
  CAEN_LAS_MASCARAS,
  DescensoDeEmergencia,
  EJERCICIO_DE_DESPRESURIZACION,
  PilotoDelDescenso,
  alturaSegura,
  comoSeDiceLaConciencia,
  concienciaUtil,
  velocidadDelDescenso,
} from "./despresurizacion";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls } from "./model";
import { bankAngleOf, pitchAngleOf } from "../ui/actitud";

const PIE = 0.3048;
const GRAVITY = 9.80665;

describe("el tiempo de conciencia útil, que es el porqué de la máscara", () => {
  it("es el de la tabla de la FAA después de una despresurización rápida", () => {
    // AC 61-107B, figura 2-3: a 35 000 ft, de 15 a 30 segundos.
    const a35 = concienciaUtil(35000 * PIE);
    expect(a35.min).toBeCloseTo(15, 6);
    expect(a35.max).toBeCloseTo(30, 6);
    // A 25 000, de minuto y medio a tres y medio.
    const a25 = concienciaUtil(25000 * PIE);
    expect(a25.min).toBeCloseTo(90, 6);
    expect(a25.max).toBeCloseTo(210, 6);
  });

  it("y en el crucero de cada presurizado se dice lo que es", () => {
    // Los reactores, medio minuto o menos: segundos, no minutos.
    expect(comoSeDiceLaConciencia(ARAI.alturaDeCrucero)).toBe("segundos");
    expect(comoSeDiceLaConciencia(YVAGA.alturaDeCrucero)).toBe("segundos");
    expect(concienciaUtil(ARAI.alturaDeCrucero).max).toBeLessThanOrEqual(30);
    // El turbohélice, a veinticinco mil, unos pocos minutos.
    expect(comoSeDiceLaConciencia(ARASUNU.alturaDeCrucero)).toBe("minutos");
  });
});

describe("hasta dónde se baja", () => {
  it("diez mil pies, o la mínima del sector si es más alta", () => {
    expect(alturaSegura(null) / PIE).toBeCloseTo(10000, 3);
    expect(alturaSegura(1200) / PIE).toBeCloseTo(10000, 3);
    // Entre las islas del oeste: el Teide y sus seiscientos metros.
    expect(alturaSegura(3718 + 600) / PIE).toBeCloseTo(14200, 3);
  });
});

describe("a qué velocidad se baja", () => {
  it("la máxima: el Mmo arriba y la Vmo abajo, con un margen", () => {
    const arriba = velocidadDelDescenso(ARAI, 11000);
    const mach = (arriba / Math.sqrt(airDensity(11000) / SEA_LEVEL_DENSITY)) / velocidadDelSonido(11000);
    expect(mach).toBeCloseTo(ARAI.mmo - 0.02, 2);
    const abajo = velocidadDelDescenso(ARAI, 4000);
    expect(abajo / 0.514444).toBeCloseTo(ARAI.vmoKt - 10, 3);
  });

  it("y el que no lleva aerofrenos baja con el tren fuera, a su tope", () => {
    expect(velocidadDelDescenso(ARASUNU, 5000) / 0.514444).toBeCloseTo(ARASUNU.vleKt - 10, 3);
  });
});

describe("lo que pasa, en su orden", () => {
  it("el aviso, las máscaras y la llegada, una vez cada uno", () => {
    const c = new CabinaPresurizada(ARAI);
    c.reiniciar(11000, false);
    const d = new DescensoDeEmergencia({ t: 0, altura: 11000, objetivo: alturaSegura(null) });
    c.despresurizar();
    const vistos: string[] = [];
    let h = 11000;
    for (let t = 0; t < 600; t += 0.1) {
      if (t > 10) h = Math.max(2000, h - 30 * 0.1);
      c.paso(0.1, { altura: h, enTierra: false });
      const s = d.paso({ t, cabina: c.altitud, altura: h });
      if (s) vistos.push(s);
    }
    expect(vistos).toEqual(["aviso", "mascaras", "abajo"]);
    expect(d.avisoEn!).toBeLessThan(2);
    expect(d.mascarasEn!).toBeLessThan(5);
    expect(d.terminado).toBe(true);
  });

  it("y sin aviso no hay nada más: con el avión bajo, la cabina no pasa de diez mil", () => {
    const d = new DescensoDeEmergencia({ t: 0, altura: 2500, objetivo: alturaSegura(null) });
    expect(d.paso({ t: 1, cabina: 2500, altura: 2500 })).toBeNull();
    expect(AVISO_DE_CABINA).toBeLessThan(CAEN_LAS_MASCARAS);
  });
});

/**
 * **El descenso de emergencia en el motor de vuelo**, como lo vuela una
 * tripulación: gas al ralentí, aerofrenos fuera y el morro abajo hasta la
 * velocidad máxima, sostenida hasta diez mil pies.
 *
 * El morro lo lleva `PilotoDelDescenso`: la velocidad con el morro, como un
 * automático de verdad en un cambio de nivel.
 *
 * Devuelve lo que tardó en llegar a diez mil pies, s, y lo más deprisa que
 * fue en indicada y en Mach.
 */
function descenso(
  a: AircraftConfig,
  aerofrenos: boolean,
): { segundos: number; iasMax: number; machMax: number; cargaMin: number } {
  const alto = a.alturaDeCrucero;
  const modelo = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: NO_ASSISTS });
  const s = modelo.state;
  // En crucero, nivelado y compensado, a su velocidad de crucero.
  const tas = a.cruiseSpeed;
  const q = 0.5 * airDensity(alto) * tas * tas;
  const alfa = ((a.mass * GRAVITY) / (q * a.wingArea) - a.aero.cl0) / a.aero.clAlpha;
  s.onGround = false;
  s.position.set(0, alto, 0);
  s.velocity.set(0, 0, -tas);
  s.orientation.setFromAxisAngle(new Vector3(1, 0, 0), alfa);
  const timon = -(a.aero.cm0 + a.aero.cmAlpha * alfa) / a.aero.cmElevator;

  const dt = 1 / 60;
  const piloto = new PilotoDelDescenso(a);
  const rumbo = s.heading;
  let iasMax = 0;
  let machMax = 0;
  let cargaMin = 9;
  for (let t = 0; t < 20 * 60; t += dt) {
    const r = piloto.mandos(
      {
        heading: s.heading,
        alabeo: bankAngleOf(s.orientation),
        cabeceo: pitchAngleOf(s.orientation),
        altitud: s.position.y,
        vertical: s.velocity.y,
        velocidad: indicatedAirspeed(s.airspeed, s.position.y),
        gas: 0,
        verdadera: s.airspeed,
        ritmoDeCabeceo: s.pitchRate,
        timon: t === 0 ? timon : modelo.timonAhora(),
      },
      rumbo,
      dt,
    );
    modelo.step(dt, {
      ...neutralControls(),
      throttle: 0,
      tren: a.aerofrenos === null && a.trenRetractil ? 1 : 0,
      aerofrenos: aerofrenos ? 1 : 0,
      aileron: r.aileron,
      elevator: r.elevator,
      automatico: true,
    });
    iasMax = Math.max(iasMax, indicatedAirspeed(s.airspeed, s.position.y));
    machMax = Math.max(machMax, s.airspeed / velocidadDelSonido(s.position.y));
    cargaMin = Math.min(cargaMin, s.loadFactor);
    if (s.position.y <= 10000 * PIE) return { segundos: t, iasMax, machMax, cargaMin };
  }
  return { segundos: Infinity, iasMax, machMax, cargaMin };
}

describe("el descenso de emergencia, con el JAZ 90 desde su crucero", () => {
  const conAerofrenos = descenso(ARAI, true);

  it("llega a diez mil pies en lo que tarda uno de verdad: unos cuatro minutos", () => {
    /*
     * Un birreactor de pasillo único, con el gas al ralentí, los aerofrenos
     * fuera y a su velocidad máxima, baja a una media de seis a siete mil pies
     * por minuto: de 39 000 a 10 000 pies en unos cuatro minutos. De los
     * 36 000 de este crucero, entre tres minutos y medio y cinco.
     */
    const minutos = conAerofrenos.segundos / 60;
    expect(minutos, `${minutos.toFixed(2)} min`).toBeGreaterThan(3.5);
    expect(minutos, `${minutos.toFixed(2)} min`).toBeLessThan(5);
  });

  it("sin pasarse de sus topes y sin despegar a nadie del asiento", () => {
    expect(conAerofrenos.iasMax / 0.514444).toBeLessThan(ARAI.vmoKt);
    expect(conAerofrenos.machMax).toBeLessThan(ARAI.mmo);
    // Un descenso de emergencia no es un picado: la carga no baja de medio g.
    expect(conAerofrenos.cargaMin).toBeGreaterThan(0.5);
  });

  it("y sin aerofrenos tarda bastante más, que es para lo que están", () => {
    const sin = descenso(ARAI, false);
    expect(sin.segundos).toBeGreaterThan(conAerofrenos.segundos * 1.3);
  });
});

describe("y los otros dos presurizados, cada uno con lo suyo", () => {
  it("el JAZ 120, con sus aerofrenos, en tiempos de avión de línea", () => {
    const d = descenso(YVAGA, true);
    expect(d.segundos / 60).toBeGreaterThan(3);
    expect(d.segundos / 60).toBeLessThan(6);
  });

  it("y el turbohélice, con el tren fuera, desde sus veinticinco mil", () => {
    const d = descenso(ARASUNU, false);
    expect(d.segundos / 60).toBeLessThan(8);
    expect(d.iasMax / 0.514444).toBeLessThan(ARASUNU.vleKt);
  });
});

describe("el ejercicio, listo para el marco de ejercicios", () => {
  it("solo en los presurizados y en los dos peldaños de arriba", () => {
    expect(EJERCICIO_DE_DESPRESURIZACION.sirveEn(ARAI)).toBe(true);
    expect(EJERCICIO_DE_DESPRESURIZACION.sirveEn(PANAMBI)).toBe(false);
    expect(EJERCICIO_DE_DESPRESURIZACION.peldanos).toEqual(["taguato", "taguato-ruvicha"]);
  });

  it("y solo arriba y en vuelo", () => {
    expect(EJERCICIO_DE_DESPRESURIZACION.sePuedeDisparar({ enTierra: false, altura: 11000 })).toBe(true);
    expect(EJERCICIO_DE_DESPRESURIZACION.sePuedeDisparar({ enTierra: false, altura: 3000 })).toBe(false);
    expect(EJERCICIO_DE_DESPRESURIZACION.sePuedeDisparar({ enTierra: true, altura: 11000 })).toBe(false);
  });
});

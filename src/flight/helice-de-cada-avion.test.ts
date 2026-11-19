/**
 * **La hélice y el motor de cada avión de hélice que no es el JAZ 40** (ADR
 * 0027, enmienda H37c): el fumigador pasa a la ley de su hélice de velocidad
 * constante, y el Twin Otter se queda con la recta pero gana su régimen plano.
 *
 * Volando y no despejando ecuaciones donde lo que se mide es la subida, con el
 * modelo de coeficientes sin una sola ayuda, como en `pista-corta.test.ts`.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel, empujeLleno, timonQueSostiene } from "./fdm";
import { conMasa, JAZ_50, loQueDaElMotor, MAINUMBY, type AircraftConfig } from "./aircraft";
import { neutralControls } from "./model";
import { airDensity, indicatedAirspeed, SEA_LEVEL_DENSITY } from "./atmosphere";
import { resistenciaNivelado } from "./nivel-que-ahorra";
import { carreraHastaVr } from "./carrera";

const KT = 0.514444;
const PIE = 0.3048;
const DT = 1 / 120;

/** Lo de `pista-corta.test.ts`: la indicada sostenida con el timón. */
function timonPara(a: AircraftConfig, m: CoefficientFlightModel, indicada: number, quiere: number): number {
  const e = timonQueSostiene(a, quiere * KT, 0) + (indicada - quiere) * KT * 0.05 - m.state.pitchRate * 1.2;
  return Math.max(-1, Math.min(1, e));
}

/** A tope, limpio y a esa indicada, a quinientos metros: lo que sube, m/s. */
function subidaA(a: AircraftConfig, kt: number): number {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
  m.reset({ position: new Vector3(0, 500, 0), heading: 0, airspeed: kt * KT, equilibrado: true });
  const paso = (): void => {
    const indicada = indicatedAirspeed(m.state.airspeed, m.state.position.y, m.aireDelDia()) / KT;
    m.step(DT, { ...neutralControls(), tren: 0, engineOn: true, throttle: 1, flaps: 0, elevator: timonPara(a, m, indicada, kt) });
  };
  for (let k = 0; k < Math.round(30 / DT); k++) paso();
  const desde = m.state.position.y;
  for (let k = 0; k < Math.round(20 / DT); k++) paso();
  return (m.state.position.y - desde) / 20;
}

/** A fondo y nivelado a esa altura, nudos verdaderos. */
function aFondo(a: AircraftConfig, pies: number): number {
  const alto = pies * PIE;
  let v = 120;
  while (v > 20 && empujeLleno(a, airDensity(alto), v) < resistenciaNivelado(a, alto, v)) v -= 0.05;
  return v / KT;
}

describe("el JAZ 50, su régimen plano", () => {
  /*
   * **620 shp hasta los 42 °C al nivel del mar** (EASA.IM.A.575, issue 6, p.
   * 7), y la misma placa para el crucero máximo: con ellos va a 170, 181 y
   * 182 nudos verdaderos al nivel del mar, a 5.000 y a 10.000 ft (Viking,
   * 2018; De Havilland, 2025). Sin el régimen plano, la ley de la casa le
   * quitaba potencia desde el suelo e iba a 170 a cualquier altura.
   */
  it("da lo de nivel del mar hasta ocho mil pies, y por encima cae", () => {
    const sigma = (pies: number): number => airDensity(pies * PIE) / SEA_LEVEL_DENSITY;
    for (const pies of [0, 3000, 6000, 7900]) expect(loQueDaElMotor(JAZ_50, sigma(pies)), `${pies} ft`).toBe(1);
    expect(loQueDaElMotor(JAZ_50, sigma(15000))).toBeLessThan(0.85);
  });

  /*
   * A un 4 %: 170, 175,5 y 178 nudos. Lo que le falta arriba no es el motor
   * sino la recta, que le quita empuje cuanto más corre; ver la ficha.
   */
  it("y va a fondo a lo que va el suyo arriba, a un 4 %", () => {
    const abajo = aFondo(JAZ_50, 0);
    const a5 = aFondo(JAZ_50, 5000);
    const a10 = aFondo(JAZ_50, 10000);
    expect(abajo).toBeGreaterThan(170 * 0.97);
    expect(abajo).toBeLessThan(170 * 1.03);
    expect(a5).toBeGreaterThan(181 * 0.96);
    expect(a10).toBeGreaterThan(182 * 0.96);
    expect(a10).toBeLessThan(182 * 1.03);
    // Arriba corre más que abajo, que es lo que no hacía.
    expect(a10).toBeGreaterThan(abajo + 5);
  });

  /*
   * **Y se queda con la recta, aunque su hélice sea de velocidad constante.**
   * Su manual pone la Vy en 100 nudos (PSM 1-64-1A, placa del § 2.18). Con la
   * recta, a esos 100 sube casi lo mismo que a la mejor del modelo, 94; con la
   * ley de potencia constante del JAZ 40 la mejor bajaba a 82, y a 100 subía
   * el 92 %. La hélice de 2,59 m con 620 shp rinde menos a 80 nudos que a
   * 100, y esa ley no lo cuenta.
   */
  it("a los 100 nudos de su Vy sube lo que puede, y con la ley de potencia constante no", () => {
    const curva = (a: AircraftConfig): Map<number, number> => {
      const c = new Map<number, number>();
      for (let kt = 74; kt <= 114; kt += 4) c.set(kt, subidaA(a, kt));
      c.set(100, subidaA(a, 100));
      return c;
    };
    const mejor = (c: Map<number, number>): number => Math.max(...c.values());
    const recta = curva(JAZ_50);
    expect(recta.get(100)!).toBeGreaterThan(mejor(recta) * 0.98);
    const potenciaConstante: AircraftConfig = {
      ...JAZ_50,
      heliceSinEmpujeA: undefined,
      potenciaUtil: 0.75 * 2 * 620 * 745.7,
      maxThrust: 20000,
    };
    const otra = curva(potenciaConstante);
    expect(otra.get(100)!).toBeLessThan(mejor(otra) * 0.95);
  });
});

describe("el JAZ 25, su hélice de velocidad constante", () => {
  /*
   * La Hamilton Standard 2D30 del R-985 del Ag Cat G-164A: sostiene las
   * vueltas, y el radial da sus 450 hp a cualquier velocidad.
   */
  it("lleva la ley de la hélice de paso variable", () => {
    expect(MAINUMBY.potenciaUtil).toBeGreaterThan(0);
    expect(MAINUMBY.heliceSinEmpujeA).toBeUndefined();
  });

  it("va a fondo cerca de los 128 nudos del Ag Cat de 450 hp, y por debajo de su Vmo", () => {
    const abajo = aFondo(MAINUMBY, 0);
    expect(abajo).toBeGreaterThan(128 * 0.95);
    expect(abajo).toBeLessThan(MAINUMBY.vmoKt);
  });

  it("y rueda lo de su manual a 4.500 lb: 615 ft, a un 5 %", () => {
    const r = carreraHastaVr(conMasa(MAINUMBY, 4500 * 0.45359237)) / (615 * PIE);
    expect(r).toBeGreaterThan(0.95);
    expect(r).toBeLessThan(1.05);
  });

  it("y sube más deprisa que con la recta, y más deprisa a la Vy que despacio", () => {
    const recta: AircraftConfig = { ...MAINUMBY, potenciaUtil: undefined, maxThrust: 5200 };
    expect(subidaA(MAINUMBY, 76)).toBeGreaterThan(subidaA(recta, 68) * 1.25);
    expect(subidaA(MAINUMBY, 76)).toBeGreaterThan(subidaA(MAINUMBY, 60));
  });
});

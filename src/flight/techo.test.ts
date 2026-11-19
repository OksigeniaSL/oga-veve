/**
 * **El techo de servicio de cada avión de hélice**: la altura a la que, a
 * tope de gas, limpio y a su mejor velocidad, ya no sube cien pies por minuto
 * (ADR 0027, enmienda H37d).
 *
 * Se cuenta con lo mismo que vuela el modelo —`empujeLleno` contra
 * `resistenciaNivelado`, el exceso de potencia partido por el peso— y se
 * comprueba volando con el modelo de coeficientes una vez, a dos mil pies del
 * techo, porque una cuenta que no vuela lo mismo que el avión no prueba nada.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CoefficientFlightModel, empujeLleno, timonQueSostiene } from "./fdm";
import {
  AIRCRAFT,
  ARASUNU,
  conMasa,
  JAZ_50,
  loQueDaElMotor,
  MAINUMBY,
  masaDe,
  PANAMBI,
  PYKASU,
  type AircraftConfig,
} from "./aircraft";
import { neutralControls } from "./model";
import {
  airDensity,
  aireDelParte,
  GRAVITY,
  indicatedAirspeed,
  QNH_DE_TABLAS,
  SEA_LEVEL_DENSITY,
} from "./atmosphere";
import { carreraHastaVr } from "./carrera";
import { resistenciaNivelado } from "./nivel-que-ahorra";
import { DE_SU_CLASE } from "./ficha-tecnica";

const KT = 0.514444;
const PIE = 0.3048;
const LIBRA = 0.45359237;
const DT = 1 / 120;
/** Cien pies por minuto, m/s: la definición del techo de servicio. */
const CIEN_PIES_POR_MINUTO = (100 * PIE) / 60;

/** Lo más que sube a esa altura, m/s, y a qué verdadera. */
function loMasQueSube(a: AircraftConfig, altura: number): { subida: number; verdadera: number } {
  let mejor = { subida: -Infinity, verdadera: 0 };
  for (let v = 20; v < 160; v += 0.5) {
    const sobra = empujeLleno(a, airDensity(altura), v) - resistenciaNivelado(a, altura, v);
    const subida = (sobra * v) / (masaDe(a) * GRAVITY);
    if (subida > mejor.subida) mejor = { subida, verdadera: v };
  }
  return mejor;
}

/** El techo de servicio, ft, de cien en cien. */
function techo(a: AircraftConfig): number {
  for (let pies = 0; pies < 50000; pies += 100) {
    if (loMasQueSube(a, pies * PIE).subida < CIEN_PIES_POR_MINUTO) return pies;
  }
  return 50000;
}

/** Lo de `helice-de-cada-avion.test.ts`: la indicada sostenida con el timón. */
function timonPara(a: AircraftConfig, m: CoefficientFlightModel, indicada: number, quiere: number): number {
  const e = timonQueSostiene(a, quiere * KT, 0) + (indicada - quiere) * KT * 0.05 - m.state.pitchRate * 1.2;
  return Math.max(-1, Math.min(1, e));
}

/** Volando, a tope, limpio y a esa indicada a esa altura: lo que sube, m/s. */
function subidaVolando(a: AircraftConfig, altura: number, kt: number): number {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
  const verdadera = (kt * KT) / Math.sqrt(airDensity(altura) / SEA_LEVEL_DENSITY);
  m.reset({ position: new Vector3(0, altura, 0), heading: 0, airspeed: verdadera, equilibrado: true });
  const paso = (): void => {
    const indicada = indicatedAirspeed(m.state.airspeed, m.state.position.y, m.aireDelDia()) / KT;
    m.step(DT, { ...neutralControls(), tren: 0, engineOn: true, throttle: 1, flaps: 0, elevator: timonPara(a, m, indicada, kt) });
  };
  for (let k = 0; k < Math.round(30 / DT); k++) paso();
  const desde = m.state.position.y;
  for (let k = 0; k < Math.round(20 / DT); k++) paso();
  return (m.state.position.y - desde) / 20;
}

describe("el techo del JAZ 50", () => {
  /*
   * **7.620 m, 25.000 ft, a 14.000 lb**: «Service Ceiling (rate of climb 100
   * ft/min., both engines at max. climb power)» (Viking, *Twin Otter Guardian
   * 400*, 2018). Subía a 28.900, y a su peso de la hoja, a 32.000.
   */
  it("a 14.000 lb, el de Viking, a un 5 %", () => {
    const t = techo(conMasa(JAZ_50, 14000 * LIBRA));
    expect(t).toBeGreaterThan(25000 * 0.95);
    expect(t).toBeLessThan(25000 * 1.05);
  });

  // A las 12.500 lb de su hoja de tipo sube algo más, y no los 32.000 de antes.
  it("a su peso máximo de la hoja, un poco más arriba, y lejos de los 32.000", () => {
    const t = techo(conMasa(JAZ_50, DE_SU_CLASE["jaz-50"]!.mtow!));
    expect(t).toBeGreaterThan(25000);
    expect(t).toBeLessThan(28000);
  });

  it("y la cuenta es lo que vuela el modelo: a dos mil pies del techo sube cerca de lo que dice", () => {
    const a = conMasa(JAZ_50, 14000 * LIBRA);
    const altura = (techo(a) - 2000) * PIE;
    const cuenta = loMasQueSube(a, altura);
    const indicada = (cuenta.verdadera / KT) * Math.sqrt(airDensity(altura) / SEA_LEVEL_DENSITY);
    const volando = subidaVolando(a, altura, indicada);
    expect(volando).toBeGreaterThan(cuenta.subida * 0.85);
    expect(volando).toBeLessThan(cuenta.subida * 1.15);
  });

  /*
   * Lo de abajo no se toca: su régimen plano sigue dando lo de nivel del mar
   * hasta nueve mil pies, así que su subida y sus cruceros de 170 y 181 nudos
   * son los de antes. Ver `helice-de-cada-avion.test.ts`.
   */
  it("hasta nueve mil pies, el motor da lo de nivel del mar", () => {
    for (const pies of [0, 5000, 8900]) {
      expect(loQueDaElMotor(JAZ_50, airDensity(pies * PIE) / SEA_LEVEL_DENSITY), `${pies} ft`).toBe(1);
    }
  });
});

describe("los que tienen el techo en la norma y no en el motor", () => {
  /*
   * El Seneca II y el 1900D tienen escrito 25.000 ft, y no es lo que sube su
   * motor: es lo que se aprueba. «Flight above 25,000 feet is not approved»
   * (Piper, manual del Seneca III, PA-34-220T, § 2.27; el que se ha podido
   * leer) y «Maximum Operating Pressure-Altitude Limit for normal operation
   * is 25,000 ft» (CAA de Nueva Zelanda, sobre el 1900D). Lo que se comprueba
   * es que su motor llegue a ella a su peso máximo.
   */
  for (const a of [PANAMBI, ARASUNU]) {
    it(`el ${a.id} llega a los 25.000 ft de su norma a su peso máximo`, () => {
      expect(techo(conMasa(a, DE_SU_CLASE[a.id]!.mtow!))).toBeGreaterThan(25000);
    });
  }
});

describe("los de pistón sin turbo, con la ley de Gagg y Farrar", () => {
  /*
   * **13.500 ft**: «SERVICE CEILING . . . 13,500 FT» (Cessna, *Model 172R
   * Information Manual*, 1996, «Performance - Specifications»). Con la ley de
   * las turbinas subía a 22.400; con la del atmosférico, a 15.000: queda un
   * 11 % por encima, y no es el motor —arriba el manual le da más potencia
   * que esta ley, ver abajo—. ADR 0027, enmienda H37g.
   */
  const JAZ_20 = conMasa(PYKASU, 2450 * LIBRA);

  it("el JAZ 20, a 2.450 lb, cerca de los 13.500 ft de su manual y lejos de los 22.400", () => {
    const t = techo(JAZ_20);
    expect(t).toBeGreaterThan(13500);
    expect(t).toBeLessThan(13500 * 1.12);
  });

  /*
   * **La subida de su manual a cada altura**, ft/min: «Maximum Rate-of-Climb
   * at 2450 Pounds», a tope, sin flaps (figura 5-6), leída a la temperatura
   * estándar de cada altura entre las columnas de −20, 0 y 20 °C.
   */
  const SUBIDA_DEL_172R: ReadonlyArray<[number, number]> = [
    [0, 721],
    [2000, 622],
    [4000, 564],
    [6000, 466],
    [8000, 367],
    [10000, 268],
    [12000, 169],
  ];
  it("y sube a cada altura lo de su manual, a menos de 45 ft/min", () => {
    for (const [pies, suya] of SUBIDA_DEL_172R) {
      const fpm = (loMasQueSube(JAZ_20, pies * PIE).subida * 60) / PIE;
      expect(Math.abs(fpm - suya), `${pies} ft: ${fpm.toFixed(0)} contra ${suya}`).toBeLessThan(45);
    }
  });

  it("y la cuenta es lo que vuela el modelo: a dos mil pies del techo sube cerca de lo que dice", () => {
    const altura = (techo(JAZ_20) - 2000) * PIE;
    const cuenta = loMasQueSube(JAZ_20, altura);
    const indicada = (cuenta.verdadera / KT) * Math.sqrt(airDensity(altura) / SEA_LEVEL_DENSITY);
    const volando = subidaVolando(JAZ_20, altura, indicada);
    expect(volando).toBeGreaterThan(cuenta.subida * 0.85);
    expect(volando).toBeLessThan(cuenta.subida * 1.15);
  });

  /*
   * **Lo que da el motor arriba**, contra la tabla de crucero del 172R
   * (figura 5-8, a la temperatura estándar): a diez mil pies su fila más alta
   * es el 72 %, con 2.350 vueltas, y a doce mil el 69 %. No hay fila del 75 %
   * a diez mil pies porque ahí ya no llega: el crucero de una avioneta así, a
   * esa altura, es a fondo. La ley de las turbinas le daba el 81 y el 77.
   */
  it("a diez y doce mil pies, el motor da un poco menos que la fila más alta de su tabla", () => {
    const sigma = (pies: number): number => airDensity(pies * PIE) / SEA_LEVEL_DENSITY;
    expect(loQueDaElMotor(PYKASU, sigma(10000))).toBeLessThan(0.72);
    expect(loQueDaElMotor(PYKASU, sigma(10000))).toBeGreaterThan(0.68);
    expect(loQueDaElMotor(PYKASU, sigma(12000))).toBeLessThan(0.69);
    expect(loQueDaElMotor(PYKASU, sigma(12000))).toBeGreaterThan(0.63);
  });

  /*
   * **Y corre lo de esa tabla**: al 75 %, 112 y 117 nudos verdaderos a dos mil
   * y a seis mil pies, y a diez mil, a fondo, entre 116 y 118 —«Cruise speeds
   * are shown for an airplane equipped with speed fairings. Without speed
   * fairings, decrease speeds shown by 2 knots»—. Los 117 de su ficha a tres
   * mil metros son esa fila: se llegan a fondo, como en el suyo.
   */
  it("y corre al 75 % y a fondo lo de su tabla de crucero, a dos nudos y medio", () => {
    const nivelada = (pies: number, potencia: number): number => {
      const altura = pies * PIE;
      const gas = Math.min(1, potencia / loQueDaElMotor(JAZ_20, airDensity(altura) / SEA_LEVEL_DENSITY));
      let v = 40;
      while (v < 80 && gas * empujeLleno(JAZ_20, airDensity(altura), v) > resistenciaNivelado(JAZ_20, altura, v)) v += 0.05;
      return v / KT;
    };
    for (const [pies, potencia, suya] of [
      [2000, 0.75, 112.6],
      [6000, 0.75, 117],
      [10000, 1, 117],
    ] as const) {
      expect(Math.abs(nivelada(pies, potencia) - suya), `${pies} ft`).toBeLessThan(2.5);
    }
    expect(nivelada(10000, 1)).toBeGreaterThan(PYKASU.cruiseSpeed / KT - 0.5);
  });

  /*
   * **Y abajo, en la pista: lo que se alarga la carrera con la altura del
   * campo y con el calor**, como parte de la de nivel del mar en un día
   * estándar, contra la rodadura de su manual a 2.450 lb —«Short Field
   * Takeoff Distance», figura 5-5: 945 ft a nivel del mar y a 15 °C, y a cada
   * altura, a su temperatura estándar entre las columnas de cada diez grados—.
   * Es lo mismo que el techo visto desde el suelo: con la ley de las turbinas
   * a ocho mil pies rodaba 1,60 veces lo de abajo, donde el suyo rueda 1,93.
   */
  const RODADURA_DEL_172R: ReadonlyArray<[number, number | null, number]> = [
    [2000, null, 1104 / 945],
    [4000, null, 1301 / 945],
    [6000, null, 1539 / 945],
    [8000, null, 1827 / 945],
    [0, 40, 1135 / 945],
    [2000, 30, 1275 / 945],
  ];
  it("y rueda arriba y con calor lo que su tabla de despegue, a un 6 %", () => {
    const abajo = carreraHastaVr(JAZ_20, "asfalto", airDensity(0));
    for (const [pies, grados, suya] of RODADURA_DEL_172R) {
      const cota = pies * PIE;
      const rho = grados === null ? airDensity(cota) : airDensity(cota, aireDelParte(grados, cota, QNH_DE_TABLAS));
      const veces = carreraHastaVr(JAZ_20, "asfalto", rho) / abajo;
      expect(Math.abs(veces / suya - 1), `${pies} ft, ${grados ?? "estándar"}: ${veces.toFixed(3)} contra ${suya.toFixed(3)}`).toBeLessThan(0.06);
    }
  });

  /*
   * **El Ag Cat de 450 hp, entre trece y catorce mil**: «Ceiling 14,000»
   * (*Plane & Pilot*, «Gulfstream American Super Ag-Cat», 2010, la misma
   * ficha de la que sale su velocidad a fondo) y 13.000 ft en las fichas de
   * segunda mano del G-164A. El manual del G-164A que se ha leído no lo da.
   * Con la ley de las turbinas subía a 20.000.
   *
   * **Y se queda 500 ft por debajo de la más baja**, 12.500, con los 4.500 N
   * de parado con los que rueda los 615 ft de su manual. Con los 4.700 que
   * llevó mientras el combustible se contó con el empuje parado llegaba a
   * 13.100; ese parche se deshizo en cuanto el combustible pasó a la potencia
   * (ADR 0027, enmienda H37h), y entre la carrera de su manual y el techo de
   * una revista gana el manual.
   */
  it("el JAZ 25, a 4.500 lb, a un 5 % de los 13.000 ft de su clase y por debajo de los 14.000", () => {
    const t = techo(conMasa(MAINUMBY, 4500 * LIBRA));
    expect(t).toBeGreaterThan(13000 * 0.95);
    expect(t).toBeLessThan(14000);
  });
});

describe("los de turbina, con la de siempre", () => {
  it("el turbohélice sin régimen plano y el turbofán pierden con la densidad a la 0,7", () => {
    const sigma = airDensity(10000 * PIE) / SEA_LEVEL_DENSITY;
    const deTurbina = AIRCRAFT.filter((a) => a.alturaCritica === null && (a.sound.engine === "turboprop" || a.sound.engine === "turbofan"));
    expect(deTurbina.length).toBeGreaterThan(3);
    for (const a of deTurbina) expect(loQueDaElMotor(a, sigma), a.id).toBeCloseTo(Math.pow(sigma, 0.7), 9);
  });
});

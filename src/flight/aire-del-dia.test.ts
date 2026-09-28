/**
 * **El aire del día**: que la temperatura del parte mueva la densidad, y con
 * ella todo lo que vuela y todo lo que se lee.
 *
 * El caso de la lección es el de siempre: una tarde de 38 °C en Asunción, a
 * noventa metros sobre el mar. Es veinticuatro grados más caliente que el día
 * estándar, y los libros dicen lo que tiene que pasar: la densidad baja un
 * 7,5 %, la altitud de densidad se va a unos novecientos metros, un reactor
 * necesita en torno a un 14 % más de carrera y la pérdida llega a la misma
 * indicada pero a más velocidad real. Ver `atmosphere.ts` y el ADR 0012.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import {
  AIRE_ESTANDAR,
  airDensity,
  aireDelParte,
  alturaDeDensidad,
  indicatedAirspeed,
  temperaturaExterior,
  trueFromIndicated,
  velocidadDelSonido,
  type Aire,
} from "./atmosphere";
import { AIRCRAFT } from "./aircraft";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls } from "./model";
import { machDe, topeDeVelocidad } from "./limites";
import { carreraHastaVr } from "./carrera";
import {
  CALOR_QUE_SE_CUENTA,
  calorQuePesa,
} from "./caliente-y-alto";
import { tiempoEntreCampos, vientoDeCasa } from "../world/meteo";
import { mandosPara, memoriaNueva } from "./piloto-automatico";
import { bankAngleOf, pitchAngleOf } from "../ui/actitud";

/** Asunción: la cota de su pista. */
const ASUNCION = 89;
const tarde = aireDelParte(38, ASUNCION);
/** El mismo campo en un día estándar: 15 °C en el mar, 14,4 a noventa metros. */
const estandar = aireDelParte(15 - 0.0065 * ASUNCION, ASUNCION);

describe("la densidad del día", () => {
  it("en un día estándar es la de las tablas, con el parte o sin él", () => {
    expect(airDensity(0, estandar)).toBeCloseTo(1.225, 3);
    expect(airDensity(3000, AIRE_ESTANDAR)).toBeCloseTo(0.909, 3);
    expect(estandar.desviacion).toBeCloseTo(0, 6);
  });

  it("una tarde de 38 °C en Asunción pesa un 7,5 % menos", () => {
    const cuanto = airDensity(ASUNCION, tarde) / airDensity(ASUNCION, estandar);
    expect(cuanto).toBeCloseTo(0.925, 2);
  });

  it("y su altitud de densidad se va a unos novecientos metros", () => {
    expect(alturaDeDensidad(ASUNCION, estandar)).toBeCloseTo(ASUNCION, 0);
    const alta = alturaDeDensidad(ASUNCION, tarde);
    expect(alta).toBeGreaterThan(850);
    expect(alta).toBeLessThan(950);
  });

  it("y con presión baja pesa menos todavía: la presión también cuenta", () => {
    const borrasca = aireDelParte(38, ASUNCION, 1000);
    expect(airDensity(ASUNCION, borrasca)).toBeLessThan(airDensity(ASUNCION, tarde));
  });
});

describe("la temperatura con la altura", () => {
  it("en el campo es la del parte", () => {
    expect(temperaturaExterior(ASUNCION, tarde)).toBeCloseTo(38, 6);
  });

  it("y el calor de más se va acabando hasta la tropopausa", () => {
    // La desviación sobre la estándar a cada altura: baja siempre, y a once
    // kilómetros es cero.
    let antes = Infinity;
    for (let h = ASUNCION; h <= 11000; h += 500) {
      const sobre =
        temperaturaExterior(h, tarde) - temperaturaExterior(h, AIRE_ESTANDAR);
      expect(sobre).toBeLessThan(antes);
      expect(sobre).toBeGreaterThanOrEqual(-1e-9);
      antes = sobre;
    }
    expect(temperaturaExterior(11000, tarde)).toBeCloseTo(-56.5, 6);
    expect(temperaturaExterior(14000, tarde)).toBeCloseTo(-56.5, 6);
  });

  it("con un gradiente entre el estándar y el del aire seco que sube", () => {
    // 6,5 °C por kilómetro el estándar, 9,8 el adiabático seco: una tarde de
    // verano está entre los dos, y ese es el que sale.
    const porKm = temperaturaExterior(1000, tarde) - temperaturaExterior(2000, tarde);
    expect(porKm).toBeGreaterThan(6.5);
    expect(porKm).toBeLessThan(9.8);
  });

  it("y por encima de la tropopausa la densidad sigue bajando", () => {
    expect(airDensity(13000)).toBeLessThan(airDensity(11000) * 0.8);
  });
});

describe("la indicada, la verdadera y el Mach", () => {
  it("con calor, la misma verdadera marca menos", () => {
    expect(indicatedAirspeed(100, ASUNCION, tarde)).toBeLessThan(
      indicatedAirspeed(100, ASUNCION, estandar) - 3,
    );
  });

  it("y para marcar lo mismo hay que ir más deprisa", () => {
    const v = trueFromIndicated(60, ASUNCION, tarde);
    expect(indicatedAirspeed(v, ASUNCION, tarde)).toBeCloseTo(60, 6);
    expect(v / trueFromIndicated(60, ASUNCION, estandar)).toBeCloseTo(
      1 / Math.sqrt(0.925),
      2,
    );
  });

  it("el sonido va más deprisa en aire caliente, y el mismo avión va a menos Mach", () => {
    expect(velocidadDelSonido(ASUNCION, tarde)).toBeGreaterThan(
      velocidadDelSonido(ASUNCION, estandar),
    );
    expect(machDe(200, ASUNCION, tarde)).toBeLessThan(machDe(200, ASUNCION, estandar));
  });

  it("y la Vmo, que es indicada, se vuela más deprisa sobre el suelo", () => {
    const jaz90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;
    expect(topeDeVelocidad(jaz90, ASUNCION, tarde).verdadera).toBeGreaterThan(
      topeDeVelocidad(jaz90, ASUNCION, estandar).verdadera * 1.03,
    );
  });
});

/** Un avión parado en la cabecera, a todo gas, hasta su Vr **indicada**. */
function carrera(id: string, aire: Aire) {
  const a = AIRCRAFT.find((x) => x.id === id)!;
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => ASUNCION, assist: 0 });
  m.ponerAire(aire);
  m.reset({
    position: new Vector3(0, ASUNCION + a.gearHeight, 0),
    heading: 0,
    airspeed: 0,
  });
  m.setOnRunway(true);
  const s = m.state;
  for (let t = 0; t < 200; t += 1 / 60) {
    m.step(1 / 60, { ...neutralControls(), throttle: 1, engineOn: true });
    if (indicatedAirspeed(s.airspeed, s.position.y, aire) >= a.rotationSpeed)
      return { metros: Math.hypot(s.position.x, s.position.z), verdadera: s.airspeed };
  }
  return { metros: NaN, verdadera: NaN };
}

describe("y el avión lo vuela", () => {
  it("un reactor necesita en torno a un 14 % más de carrera", () => {
    const fresco = carrera("jaz-90", estandar);
    const caliente = carrera("jaz-90", tarde);
    const mas = caliente.metros / fresco.metros - 1;
    expect(mas, `${Math.round(fresco.metros)} → ${Math.round(caliente.metros)} m`).toBeGreaterThan(0.12);
    expect(mas).toBeLessThan(0.18);
  });

  it("y rota a la misma indicada, a más velocidad real", () => {
    const fresco = carrera("jaz-120", estandar);
    const caliente = carrera("jaz-120", tarde);
    expect(caliente.verdadera / fresco.verdadera).toBeCloseTo(1 / Math.sqrt(0.925), 2);
  });

  it("y la cuenta de la carrera dice lo mismo que el avión", () => {
    for (const id of ["jaz-20", "jaz-60", "jaz-90"]) {
      const a = AIRCRAFT.find((x) => x.id === id)!;
      const cuenta =
        carreraHastaVr(a, "asfalto", airDensity(ASUNCION, tarde)) /
        carreraHastaVr(a, "asfalto", airDensity(ASUNCION, estandar));
      const vuelo = carrera(id, tarde).metros / carrera(id, estandar).metros;
      expect(cuenta, id).toBeCloseTo(vuelo, 1);
    }
  });

  /*
   * **La pérdida llega a la misma indicada**, que es lo que la hace una regla
   * de oro: el ala vuela con la presión dinámica, y eso es lo que mide el
   * anemómetro. Así que nivelado a la misma indicada, con frío o con calor, el
   * ala va al mismo ángulo de ataque —y entra en pérdida al mismo—, aunque
   * sobre el suelo vaya más deprisa. Se mide sosteniendo el avión con el
   * piloto automático, a la misma indicada en los dos días.
   */
  it("y vuela a la misma indicada con el mismo ángulo: la pérdida es la misma", () => {
    const a = AIRCRAFT.find((x) => x.id === "jaz-20")!;
    const volar = (aire: Aire) => {
      const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: 0 });
      m.ponerAire(aire);
      const s = m.state;
      s.onGround = false;
      s.position.set(0, 1000, 0);
      s.velocity.set(0, 0, -trueFromIndicated(40, 1000, aire));
      s.heading = 0;
      const memoria = memoriaNueva();
      let gas = 0.6;
      for (let t = 0; t < 240; t += 1 / 60) {
        const r = mandosPara(
          {
            heading: s.heading,
            alabeo: bankAngleOf(s.orientation),
            cabeceo: pitchAngleOf(s.orientation),
            altitud: s.position.y,
            vertical: s.velocity.y,
            velocidad: indicatedAirspeed(s.airspeed, s.position.y, aire),
            gas,
            verdadera: s.airspeed,
            ritmoDeCabeceo: s.pitchRate,
          },
          { rumbo: 0, altitud: 1000, velocidad: 40 },
          1 / 60,
          memoria,
        );
        if (r.throttle !== null) gas = r.throttle;
        m.step(1 / 60, {
          ...neutralControls(),
          throttle: gas,
          aileron: r.aileron,
          elevator: r.elevator,
          automatico: true,
        });
      }
      return {
        indicada: indicatedAirspeed(s.airspeed, s.position.y, aire),
        verdadera: s.airspeed,
        alfa: s.alpha,
      };
    };
    const fresco = volar(aireDelParte(15 - 6.5, 1000));
    const caliente = volar(aireDelParte(38, 1000));
    /*
     * Lo que el ala pide para sostener el peso es sustentación por presión
     * dinámica, `cl·indicada²`: si sale igual con frío y con calor, a la misma
     * indicada va al mismo ángulo, y la pérdida —que es un ángulo— llega a la
     * misma indicada. El automático no las deja clavadas al decimal, así que
     * se compara eso y no el ángulo suelto.
     */
    const pide = (v: { alfa: number; indicada: number }) =>
      (a.aero.cl0 + a.aero.clAlpha * v.alfa) * v.indicada ** 2;
    expect(pide(caliente) / pide(fresco)).toBeCloseTo(1, 1);
    expect(Math.abs(caliente.indicada - fresco.indicada)).toBeLessThan(3);
    // Y cada nudo indicado es más velocidad sobre el suelo con calor.
    expect(caliente.verdadera / caliente.indicada).toBeGreaterThan(
      (fresco.verdadera / fresco.indicada) * 1.04,
    );
  });
});

describe("el aire entre dos campos", () => {
  it("encima de cada campo, el de su parte, y la cota cuenta", () => {
    // Los mismos 21 °C en la costa y en un campo a seiscientos metros no son
    // el mismo día: arriba es más caliente que su estándar.
    const costa = { x: 0, z: 0, cota: 0, meteo: { ...vientoDeCasa(undefined), temp: 21 } };
    const monte = { x: 100000, z: 0, cota: 632, meteo: { ...vientoDeCasa(undefined), temp: 21 } };
    const enCosta = tiempoEntreCampos([costa, monte], 0, 0).delDia;
    const enMonte = tiempoEntreCampos([costa, monte], 100000, 0).delDia;
    expect(temperaturaExterior(0, enCosta)).toBeCloseTo(21, 0);
    expect(temperaturaExterior(632, enMonte)).toBeCloseTo(21, 0);
    expect(enMonte.desviacion).toBeGreaterThan(enCosta.desviacion + 3);
    // Y entre medias, sin saltos: en medio, entre los dos.
    const enMedio = tiempoEntreCampos([costa, monte], 50000, 0).delDia;
    expect(enMedio.desviacion).toBeGreaterThan(enCosta.desviacion);
    expect(enMedio.desviacion).toBeLessThan(enMonte.desviacion);
  });
});

describe("«hace calor: vamos a necesitar más pista», cuando pesa", () => {
  const jaz90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;
  const jaz20 = AIRCRAFT.find((a) => a.id === "jaz-20")!;

  it("una tarde de 38 °C en Asunción, sí, con sus números", () => {
    const calor = calorQuePesa(jaz90, { temp: 38, qnh: 1013 }, ASUNCION);
    expect(calor).not.toBeNull();
    expect(calor!.grados).toBe(38);
    expect(calor!.masLarga).toBeGreaterThan(0.12);
    expect(calor!.masLarga).toBeLessThan(0.18);
    expect(calor!.alturaDeDensidad).toBeGreaterThan(850);
    expect(calorQuePesa(jaz20, { temp: 38, qnh: 1013 }, ASUNCION)).not.toBeNull();
  });

  it("una tarde normal de 28 °C, no: el avión la vuela, pero no se avisa", () => {
    expect(calorQuePesa(jaz90, { temp: 28, qnh: 1013 }, ASUNCION)).toBeNull();
    expect(calorQuePesa(jaz20, { temp: 28, qnh: 1013 }, ASUNCION)).toBeNull();
  });

  it("y se cuenta el calor, no la altura: en Los Rodeos con su día estándar, no", () => {
    // Seiscientos treinta y dos metros de campo ya alargan la carrera todos
    // los días; eso es otra lección y no se avisa como calor.
    const estandarAlli = 15 - 0.0065 * 632;
    expect(calorQuePesa(jaz90, { temp: estandarAlli, qnh: 1013 }, 632)).toBeNull();
    expect(
      calorQuePesa(jaz90, { temp: estandarAlli + CALOR_QUE_SE_CUENTA + 5, qnh: 1013 }, 632),
    ).not.toBeNull();
  });
});

/**
 * **El automático por la senda, sin columpio, en cada avión.**
 *
 * Existe por el JAZ 110: entró en la flota y nadie le vio una toma limpia. No
 * era el freno —ver la última prueba— ni, del todo, el piloto del banco: su morro
 * responde despacio, y el automático, afinado con los que responden deprisa, lo
 * columpiaba en el circuito y en la final. Ver `AUTORIDAD_SUFICIENTE` en
 * `piloto-automatico.ts` y `aero` en la ficha del JAZ 110.
 *
 * Se vuela el modelo de verdad, configurado y con el gas que sostiene la senda, se
 * le da un golpe de aire de cuatro metros por segundo y se mira cuánto queda. Sin
 * viento y sin nada más que lo vuelva a mover: si esto no se apaga, en una final
 * de verdad no se apaga nunca.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, TIJERETA, type AircraftConfig } from "./aircraft";
import { CoefficientFlightModel, empujeLleno, empujeQueSostiene } from "./fdm";
import { neutralControls } from "./model";
import {
  AUTORIDAD_SUFICIENTE,
  autoridadDelTimon,
  mandosPara,
  memoriaNueva,
} from "./piloto-automatico";
import { airDensity, GRAVITY, SEA_LEVEL_DENSITY } from "./atmosphere";
import { bankAngleOf, pitchAngleOf } from "../ui/actitud";
import { NO_ASSISTS } from "./assists";

const NUDO = 0.514444;
const TRES_GRADOS = (3 * Math.PI) / 180;
const DT = 1 / 60;
const ALTO = 800;
const GOLPE = 30;

/** Lo que queda del golpe, m/s: lo más que se aparta de la senda en cada tramo. */
function golpeEnLaSenda(
  a: AircraftConfig,
  ias: number,
  flaps: number,
  rampa: number,
  conAutoridad: boolean,
): { aLosVeinte: number; aLosCuarenta: number; elevador: number[] } {
  const rho = airDensity(ALTO);
  const tas = ias * Math.sqrt(SEA_LEVEL_DENSITY / rho);
  const modelo = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: NO_ASSISTS });
  const s = modelo.state;
  const q = 0.5 * rho * tas * tas;
  const cl = (a.mass * GRAVITY * Math.cos(rampa)) / (q * a.wingArea);
  const alfa = (cl - a.aero.cl0 - a.flapsLift * flaps) / a.aero.clAlpha;
  s.onGround = false;
  s.position.set(0, ALTO, 0);
  s.velocity.set(0, -tas * Math.sin(rampa), -tas * Math.cos(rampa));
  s.orientation.setFromAxisAngle(new Vector3(1, 0, 0), alfa - rampa);
  const gas =
    empujeQueSostiene(a, { altura: ALTO, verdadera: tas, flaps, tren: 1, pendiente: -rampa }) /
    empujeLleno(a, rho, tas);
  const baja = -tas * Math.sin(rampa);
  const memoria = memoriaNueva();
  let timon: number | undefined = -(a.aero.cm0 + a.aero.cmAlpha * alfa) / a.aero.cmElevator;
  let aLosVeinte = 0;
  let aLosCuarenta = 0;
  let golpeado = false;
  const elevador: number[] = [];
  for (let t = 0; t < GOLPE + 60; t += DT) {
    if (t >= GOLPE && !golpeado) {
      golpeado = true;
      s.velocity.y += 4;
    }
    const r = mandosPara(
      {
        heading: s.heading,
        alabeo: bankAngleOf(s.orientation),
        cabeceo: pitchAngleOf(s.orientation),
        altitud: s.position.y,
        vertical: s.velocity.y,
        velocidad: s.airspeed * Math.sqrt(airDensity(s.position.y) / SEA_LEVEL_DENSITY),
        gas,
        verdadera: s.airspeed,
        ritmoDeCabeceo: s.pitchRate,
        ...(timon !== undefined ? { timon } : {}),
        ...(conAutoridad
          ? { autoridadDelTimon: autoridadDelTimon(a, airDensity(s.position.y), s.airspeed) }
          : {}),
      },
      { rumbo: null, altitud: ALTO + baja * t, ritmo: baja, velocidad: null },
      DT,
      memoria,
    );
    timon = undefined;
    elevador.push(r.elevator);
    modelo.step(DT, {
      ...neutralControls(),
      elevator: r.elevator,
      throttle: gas,
      flaps,
      tren: 1,
      automatico: true,
    });
    const aparte = Math.abs(s.velocity.y - baja);
    if (t >= GOLPE + 20 && t < GOLPE + 40) aLosVeinte = Math.max(aLosVeinte, aparte);
    if (t >= GOLPE + 40) aLosCuarenta = Math.max(aLosCuarenta, aparte);
  }
  return { aLosVeinte, aLosCuarenta, elevador };
}

const retractiles = AIRCRAFT.filter((a) => a.llevaFlaps && a.trenRetractil);

describe("el automático apaga un golpe de aire en la senda", () => {
  for (const a of retractiles) {
    it(`${a.id}, con todo fuera, en la final`, () => {
      const r = golpeEnLaSenda(a, a.approachSpeed + 5 * NUDO, 1, TRES_GRADOS, true);
      /*
       * Medido sin el refuerzo: el JAZ 110, 2,07 y 1,28 m/s —3,78 y 3,80 con el
       * cabeceo de antes: no se apagaba nunca— y el JAZ 120, 5,35 y 6,24: crecía.
       */
      expect(r.aLosVeinte, `${r.aLosVeinte.toFixed(2)} m/s`).toBeLessThan(0.5);
      expect(r.aLosCuarenta, `${r.aLosCuarenta.toFixed(2)} m/s`).toBeLessThan(0.1);
    });
    it(`${a.id}, nivelado a su velocidad de circuito`, () => {
      const r = golpeEnLaSenda(a, a.velocidadDeCircuito, 2 / 3, 0, true);
      expect(r.aLosVeinte, `${r.aLosVeinte.toFixed(2)} m/s`).toBeLessThan(0.5);
      expect(r.aLosCuarenta, `${r.aLosCuarenta.toFixed(2)} m/s`).toBeLessThan(0.1);
    });
  }
});

describe("y no le cambia nada a quien ya respondía deprisa", () => {
  /*
   * El refuerzo es para los que no llegan, y por encima de esa autoridad las
   * ganancias son las de siempre, las mismas al milímetro. Lo que vuela el JAZ 90
   * se afinó con ellas: si esto cambia, hay que volver a volarlo.
   */
  const rapidos = AIRCRAFT.filter(
    (a) =>
      autoridadDelTimon(a, airDensity(ALTO), a.approachSpeed) >= AUTORIDAD_SUFICIENTE &&
      a.llevaFlaps &&
      a.trenRetractil,
  );
  it("son del JAZ 90 para abajo", () => {
    expect(rapidos.map((a) => a.id)).toContain("jaz-90");
    expect(rapidos.map((a) => a.id)).not.toContain("jaz-110");
    expect(rapidos.map((a) => a.id)).not.toContain("jaz-120");
  });
  for (const a of rapidos)
    it(`${a.id}: con su autoridad y sin ella, el mismo timón`, () => {
      const v = a.approachSpeed + 5 * NUDO;
      const con = golpeEnLaSenda(a, v, 1, TRES_GRADOS, true);
      const sin = golpeEnLaSenda(a, v, 1, TRES_GRADOS, false);
      expect(con.elevador).toEqual(sin.elevador);
    });
});

describe("y no era cosa del freno", () => {
  /*
   * **La pregunta que se hizo antes de tocar nada**: nivelado, al ralentí, con el
   * tren y todos los flaps. Medido en el modelo, de 200 a 144 nudos en 23
   * segundos: unos dos nudos y medio por segundo, y en la ficha, 7,6 de fineza a
   * 165 nudos, donde el 747 de la CR-2144 lleva 10,9. Un avión que no frena no era
   * el problema; que un día lo sea se ve aquí antes que en un banco de diez
   * minutos.
   */
  it("el JAZ 110 frena nivelado unos dos nudos y medio por segundo, con todo fuera", () => {
    const a = TIJERETA;
    const empuje = empujeQueSostiene(a, {
      altura: 0,
      verdadera: a.approachSpeed,
      flaps: 1,
      tren: 1,
      pendiente: 0,
    });
    const frena = empuje / a.mass / NUDO;
    expect(frena).toBeGreaterThan(2);
    expect(frena).toBeLessThan(3);
  });
});

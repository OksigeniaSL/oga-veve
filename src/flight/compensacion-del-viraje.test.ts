/**
 * **El automático sube el morro al inclinar el ala**, como uno de verdad: la
 * compensación del viraje del canal de cabeceo. Ver `porElViraje` en
 * `piloto-automatico.ts`.
 *
 * Nace del #192 (H29g, H29h): en el arco del viraje a final de Los Rodeos, con
 * 4,57 m/s pedidos, el JAZ 90 llegaba a bajar 6,05 inclinado veinticinco
 * grados. Al inclinar, lo que el ala sostiene en vertical es el coseno de lo
 * que sostenía, la carga bajaba a 0,92 mientras entraba el alabeo, y el lazo
 * del medio solo lo veía cuando el variómetro ya lo contaba.
 *
 * Tres cosas: que en el arco ya no se pasa de mil pies por minuto; que un
 * viraje de treinta grados sosteniendo la altura no se aparta más de lo que se
 * le pide a un automático de verdad, en los ocho aviones de ala fija; y que
 * con las alas a nivel no pide nada, ni un bit.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, aircraftById, type AircraftConfig } from "./aircraft";
import { airDensity, SEA_LEVEL_DENSITY } from "./atmosphere";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls } from "./model";
import { autoridadDelTimon, mandosPara, memoriaNueva, type Objetivos } from "./piloto-automatico";
import { TAGUATO } from "./tiers";
import { bankAngleOf, pitchAngleOf } from "../ui/actitud";

const DT = 1 / 60;
const NUDO = 0.514444;
const PIE = 0.3048;
const GRADO = Math.PI / 180;
const SENDA = Math.tan(3 * GRADO);
/** La cota de Los Rodeos, m. */
const COTA = 632;
/** Mil pies por minuto, m/s: el tope de la aproximación estabilizada. */
const MIL_PIES_POR_MINUTO = (1000 * PIE) / 60;
const raiz = (y: number): number => Math.sqrt(airDensity(y) / SEA_LEVEL_DENSITY);
const ALA_FIJA = AIRCRAFT.filter((a) => !a.helicoptero);

function avion(id: string): AircraftConfig {
  const a = aircraftById(id);
  if (!a) throw new Error(`no está el ${id}`);
  return a;
}

/** El alerón del banco, que lleva el ala al alabeo pedido. */
function alAlabeo(pedido: number, alabeo: number, ritmo: number): number {
  return Math.max(-1, Math.min(1, 2.2 * (pedido - alabeo) - 0.4 * ritmo));
}

/**
 * **El arco de H29g**: el avión con todo fuera a la Vref más cinco nudos sobre
 * la cota de Los Rodeos, el automático por una senda de tres grados que
 * empieza cuarenta y cinco metros por debajo y pidiendo como mucho lo de la
 * final recta del banco, 4,57 m/s; el ala entra a veintisiete grados a cinco
 * por segundo y endereza a grado y medio por segundo desde los veinte. Lo más
 * que baja con el ala inclinada, m/s.
 */
function picoEnElArco(a: AircraftConfig, compensa: boolean): number {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => COTA, assist: TAGUATO.assists });
  const inicio = COTA + a.gearHeight + 320;
  const v0 = (a.approachSpeed + 5 * NUDO) / raiz(inicio);
  m.reset({ position: new Vector3(0, inicio, 0), heading: 0, airspeed: v0, equilibrado: true, flapsDelEquilibrio: 1 });
  const c = neutralControls();
  c.flaps = 1;
  c.tren = 1;
  c.trim = 0;
  c.automatico = true;
  c.throttle = Math.max(0, Math.min(1, m.gasPara(v0)));
  const memoria = memoriaNueva();
  let errorAntes: number | null = null;
  let senda = inicio - 45;
  let alabeoPedido = 0;
  let pico = 0;
  for (let i = 0, t = 0; i < 60 * 40; i++, t += DT) {
    const s = m.state;
    const phi = bankAngleOf(s.orientation);
    const gs = Math.hypot(s.velocity.x, s.velocity.z);
    const quiere = t < 20 ? 27 * GRADO : Math.max(0, 27 * GRADO - 1.5 * GRADO * (t - 20));
    alabeoPedido += Math.max(-5 * GRADO * DT, Math.min(5 * GRADO * DT, quiere - alabeoPedido));
    c.aileron = alAlabeo(alabeoPedido, phi, s.rollRate);
    const ritmo = -gs * SENDA;
    senda += ritmo * DT;
    const pedida = Math.max(senda, s.position.y + (-4.57 - ritmo) * 10);
    const r = mandosPara(
      {
        heading: s.heading,
        alabeo: phi,
        cabeceo: pitchAngleOf(s.orientation),
        altitud: s.position.y,
        vertical: s.velocity.y,
        velocidad: s.airspeed * raiz(s.position.y),
        gas: c.throttle,
        verdadera: s.airspeed,
        ritmoDeCabeceo: s.pitchRate,
        ...(i === 0 ? { timon: c.elevator } : {}),
        autoridadDelTimon: autoridadDelTimon(a, airDensity(s.position.y), s.airspeed),
        subeElAire: 0,
        ...(compensa ? { anguloSinSustentacion: m.anguloSinSustentacion() } : {}),
      },
      { rumbo: null, altitud: pedida, ritmo, velocidad: null },
      DT,
      memoria,
    );
    c.elevator = r.elevator;
    const error = (a.approachSpeed + 5 * NUDO) / raiz(s.position.y) - s.airspeed;
    c.throttle = Math.max(0, Math.min(1, c.throttle + (error - (errorAntes ?? error)) * 0.04 + error * 0.01 * DT));
    errorAntes = error;
    if (t > 5 && t < 20) pico = Math.max(pico, -s.velocity.y);
    m.step(DT, c);
  }
  return pico;
}

/**
 * **Un viraje de treinta grados en `ALT`**: nivelado, el banco inclina el ala
 * a cinco grados por segundo, la sostiene un minuto y la endereza; el
 * automático lleva la altura y sus gases, la velocidad. Lo más que se aparta
 * de la altura, ft.
 */
function apartaEnElViraje(a: AircraftConfig, caso: "circuito" | "crucero", compensa: boolean): number {
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: TAGUATO.assists });
  const altura = caso === "circuito" ? 1500 : a.alturaDeCrucero * 0.9;
  const indicada = caso === "circuito" ? a.velocidadDeCircuito : a.cruiseSpeed * raiz(altura);
  const verdadera = indicada / raiz(altura);
  m.reset({ position: new Vector3(0, altura, 0), heading: 0, airspeed: verdadera, equilibrado: true });
  const c = neutralControls();
  c.throttle = Math.max(0, Math.min(1, m.gasPara(verdadera)));
  c.automatico = true;
  const memoria = memoriaNueva();
  let alabeoPedido = 0;
  let peor = 0;
  for (let i = 0, t = 0; i < 60 * 150; i++, t += DT) {
    const s = m.state;
    const phi = bankAngleOf(s.orientation);
    const quiere = t >= 20 && t < 85 ? 30 * GRADO : 0;
    alabeoPedido += Math.max(-5 * GRADO * DT, Math.min(5 * GRADO * DT, quiere - alabeoPedido));
    c.aileron = alAlabeo(alabeoPedido, phi, s.rollRate);
    const r = mandosPara(
      {
        heading: s.heading,
        alabeo: phi,
        cabeceo: pitchAngleOf(s.orientation),
        altitud: s.position.y,
        vertical: s.velocity.y,
        velocidad: s.airspeed * raiz(s.position.y),
        gas: c.throttle,
        verdadera: s.airspeed,
        ritmoDeCabeceo: s.pitchRate,
        ...(i === 0 ? { timon: m.timonAhora() } : {}),
        autoridadDelTimon: autoridadDelTimon(a, airDensity(s.position.y), s.airspeed),
        subeElAire: 0,
        ...(compensa ? { anguloSinSustentacion: m.anguloSinSustentacion() } : {}),
      },
      { rumbo: null, altitud: altura, velocidad: indicada, gases: "SPD" },
      DT,
      memoria,
    );
    c.elevator = r.elevator;
    if (r.throttle !== null) c.throttle = r.throttle;
    if (t > 5) peor = Math.max(peor, Math.abs(s.position.y - altura) / PIE);
    m.step(DT, c);
  }
  return peor;
}

describe("la compensación del viraje del automático", () => {
  it("en el arco a final, el JAZ 90 ya no baja a más de mil pies por minuto virando", () => {
    /*
     * Medido (H29g, H29h): 6,05 m/s sin compensar y 4,98 compensando, con
     * 4,57 pedidos. Es la puerta de una aproximación estabilizada, mil pies
     * por minuto (FSF ALAR, Briefing Note 7.1).
     */
    const a = avion("jaz-90");
    const sin = picoEnElArco(a, false);
    const con = picoEnElArco(a, true);
    expect(sin, `${sin.toFixed(2)} m/s sin compensar`).toBeGreaterThan(MIL_PIES_POR_MINUTO);
    expect(con, `${con.toFixed(2)} m/s compensando`).toBeLessThan(MIL_PIES_POR_MINUTO);
  });

  it("y en ninguno de los ocho de ala fija baja más que sin ella", () => {
    for (const a of ALA_FIJA) {
      const sin = picoEnElArco(a, false);
      const con = picoEnElArco(a, true);
      expect(con, `${a.id}: ${con.toFixed(2)} m/s compensando, ${sin.toFixed(2)} sin`).toBeLessThanOrEqual(sin + 0.01);
    }
  });

  it.each(["circuito", "crucero"] as const)(
    "un viraje de treinta grados en ALT no se aparta de la altura más que uno de verdad (%s)",
    (caso) => {
      /*
       * MIL-C-18244A(WEP), 3.1.1.5.2.6.1: un automático sostiene la altura a
       * ±30 ft con las alas a nivel y a ±60 ft hasta treinta grados de alabeo.
       * Medido (H29h): de 8 a 28 ft compensando, y de 12 a 47 sin compensar; el
       * peor, el JAZ 110 en crucero.
       */
      for (const a of ALA_FIJA) {
        const con = apartaEnElViraje(a, caso, true);
        const sin = apartaEnElViraje(a, caso, false);
        expect(con, `${a.id}: ${con.toFixed(0)} ft compensando`).toBeLessThan(60);
        expect(con, `${a.id}: ${con.toFixed(0)} ft compensando, ${sin.toFixed(0)} sin`).toBeLessThanOrEqual(sin);
      }
    },
  );

  it("y con las alas a nivel no pide morro ninguno, ni un bit", () => {
    /*
     * Sostener, bajar por una senda con flaps, cambiar de nivel en FLCH SPD y
     * en V/S con la mínima, sin rumbo: lo que pide el ala inclinada es cero
     * exacto. Hasta H89 se comparaban los mandos del automático que recibe el
     * ángulo de sustentación nula con los del que no; desde entonces el que lo
     * recibe cuenta además con lo que tarda el camino (`loQueTardaElCamino`) y
     * vuela distinto, así que aquí se mira lo que pone el viraje y nada más.
     */
    for (const a of ALA_FIJA) {
      const m = new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: TAGUATO.assists });
      m.reset({ position: new Vector3(0, 1500, 0), heading: 0, airspeed: a.velocidadDeCircuito / raiz(1500), equilibrado: true });
      const c = neutralControls();
      c.throttle = 0.5;
      c.automatico = true;
      const con = memoriaNueva();
      let distintos = 0;
      for (let i = 0, t = 0; i < 60 * 120; i++, t += DT) {
        const s = m.state;
        const fase = Math.floor(t / 30);
        c.flaps = fase === 1 ? 0.5 : 0;
        const o: Objetivos =
          fase === 0
            ? { rumbo: null, altitud: 1500, velocidad: a.velocidadDeCircuito }
            : fase === 1
              ? { rumbo: null, altitud: 1500 - 3 * (t - 30), ritmo: -3, velocidad: a.velocidadDeCircuito * 0.85 }
              : fase === 2
                ? { rumbo: null, altitud: 1600, velocidad: a.velocidadDeCircuito, modo: "FLCH SPD", gases: "THR" }
                : { rumbo: null, altitud: 1400, velocidad: a.velocidadDeCircuito * 0.9, modo: "V/S", minima: a.approachSpeed };
        const e = {
          heading: s.heading,
          alabeo: bankAngleOf(s.orientation),
          cabeceo: pitchAngleOf(s.orientation),
          altitud: s.position.y,
          vertical: s.velocity.y,
          velocidad: s.airspeed * raiz(s.position.y),
          gas: c.throttle,
          verdadera: s.airspeed,
          ritmoDeCabeceo: s.pitchRate,
          subeElAire: 0,
          ...(i === 0 ? { timon: 0 } : {}),
        };
        const rc = mandosPara({ ...e, anguloSinSustentacion: m.anguloSinSustentacion() }, o, DT, con);
        if (con.viraje !== 0) distintos++;
        c.elevator = rc.elevator;
        c.aileron = rc.aileron;
        if (rc.throttle !== null) c.throttle = rc.throttle;
        m.step(DT, c);
      }
      expect(distintos, a.id).toBe(0);
    }
  });
});

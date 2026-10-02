/**
 * **Los gases automáticos, y el N1 quieto en crucero.**
 *
 * Enrique, nivelado a veintinueve mil pies con el JAZ 120 y el automático:
 * «el N1 va y viene entre 51 y 79 todo el rato». Medido en el juego antes del
 * arreglo, cinco minutos de crucero en calma: del 56 al 78 en el JAZ 120 y del
 * 26 al 85 en el JAZ 90, en los tres peldaños de modelo completo; en Guyrami,
 * clavado al cien por un automático escondido. Ver `scripts/verificar-crucero.mjs`.
 *
 * Lo de verdad: en crucero tranquilo el N1 casi no se mueve. Aquí se vuela el
 * automático —con sus gases en el avión que los lleva y con el gas quieto de
 * quien vuela en los demás— cinco minutos en calma, en **toda la flota y en
 * los cuatro peldaños**, y el N1 no puede apartarse más de un punto de su
 * media. Y de paso, que el avión siga a su altura y a la velocidad que toca.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { ArcadeFlightModel } from "./arcade";
import { CoefficientFlightModel, empujeLleno } from "./fdm";
import { neutralControls, type FlightModel } from "./model";
import {
  airDensity,
  indicatedAirspeed,
  SEA_LEVEL_DENSITY,
  trueFromIndicated,
} from "./atmosphere";
import { bankAngleOf, pitchAngleOf } from "../ui/actitud";
import { regimen } from "../ui/cuadro";
import { TIERS, type Tier } from "./tiers";
import {
  aCuantoCaptura,
  mandosPara,
  memoriaNueva,
  modoVertical,
  type ModoVertical,
} from "./piloto-automatico";
import {
  GAS_DE_SUBIDA,
  llevaGasesAutomaticos,
  llevaPilotoAutomatico,
} from "./gases-automaticos";
import { NUDO, velocidadQueToca } from "./escalera-de-velocidades";
import { resistenciaNivelado } from "./nivel-que-ahorra";
import { quemaPorSegundo } from "./combustible";
import { machDe } from "./limites";
import { temperaturaExterior } from "./atmosphere";

const PIE = 0.3048;
const DT = 1 / 60;

/** El modelo de vuelo de un peldaño, como lo construye el juego. */
function modeloDe(a: AircraftConfig, tier: Tier): FlightModel {
  return tier.model === "simple"
    ? new ArcadeFlightModel({ aircraft: a, ground: () => 0 })
    : new CoefficientFlightModel({ aircraft: a, ground: () => 0, assist: tier.assists });
}

/**
 * **La velocidad a la que se le pide ir**, en nudos indicados: la de la
 * escalera, y en el modelo sencillo nunca más de lo que da a esa altura. Es la
 * misma cuenta que hace el juego. Ver `laVelocidadQueToca` en `game.ts`.
 */
function pedida(a: AircraftConfig, modelo: FlightModel, altura: number): number {
  const kt = velocidadQueToca(a, {
    altitud: altura,
    restante: null,
    bajando: false,
    enFinal: false,
    subiendo: false,
  }).kt;
  if (!(modelo instanceof ArcadeFlightModel)) return kt;
  const punta = indicatedAirspeed(modelo.velocidadMaxima(), altura) / NUDO;
  return Math.min(kt, Math.floor(punta * 0.97));
}

interface Volado {
  readonly n1: number[];
  readonly kt: number[];
  readonly altura: number[];
  readonly modos: ModoVertical[];
  readonly gas: number[];
}

/**
 * Vuela el automático `segundos` con el avión puesto a `desde` y la ventanilla
 * en `hasta`, y apunta lo de los `ultimos` segundos.
 */
function volar(
  a: AircraftConfig,
  tier: Tier,
  desde: number,
  hasta: number,
  segundos: number,
  ultimos: number,
): Volado {
  const modelo = modeloDe(a, tier);
  modelo.reset({ position: new Vector3(0, desde, 0), heading: 0, airspeed: 100 });
  const kt0 = pedida(a, modelo, desde);
  modelo.reset({
    position: new Vector3(0, desde, 0),
    heading: 0,
    airspeed: trueFromIndicated(kt0 * NUDO, desde),
    equilibrado: true,
  });
  const s = modelo.state;
  const gases = llevaGasesAutomaticos(a);
  /*
   * El gas de partida: el que sostiene esa velocidad, como lo dejaría quien
   * vuela antes de engancharlo. En el completo, la resistencia entre el
   * empuje lleno; en el sencillo, su cuenta.
   */
  let gas =
    modelo instanceof ArcadeFlightModel
      ? modelo.gasPara(s.airspeed)
      : Math.min(
          1,
          resistenciaNivelado(a, desde, s.airspeed) /
            empujeLleno(a, airDensity(desde), s.airspeed),
        );
  const trim = modelo.timonDeEquilibrio?.() ?? 0;
  const memoria = memoriaNueva();
  let modo: ModoVertical = "ALT";
  let antesHasta = desde;
  const r: Volado = { n1: [], kt: [], altura: [], modos: [], gas: [] };
  for (let t = 0; t < segundos; t += DT) {
    const ias = indicatedAirspeed(s.airspeed, s.position.y);
    modo = modoVertical(modo, {
      falta: hasta - s.position.y,
      vertical: s.velocity.y,
      nueva: hasta !== antesHasta,
      conGases: gases && tier.model !== "simple",
    });
    antesHasta = hasta;
    const objetivoKt = pedida(a, modelo, s.position.y);
    const m = mandosPara(
      {
        heading: s.heading,
        alabeo: bankAngleOf(s.orientation),
        cabeceo: pitchAngleOf(s.orientation),
        altitud: s.position.y,
        vertical: s.velocity.y,
        velocidad: ias,
        gas,
        verdadera: s.airspeed,
        ritmoDeCabeceo: s.pitchRate,
        timon: t === 0 ? trim : modelo.timonAhora(),
        empujeAFondo: empujeLleno(a, airDensity(s.position.y), s.airspeed),
        masa: a.mass,
        ...(modelo instanceof ArcadeFlightModel
          ? {
              subirCon: (ritmo: number) => modelo.mandoParaSubir(ritmo),
              equilibrio: modelo.gasPara(trueFromIndicated(objetivoKt * NUDO, s.position.y)),
            }
          : {}),
      },
      {
        rumbo: 0,
        altitud: hasta,
        velocidad: objetivoKt * NUDO,
        modo,
        gases: gases
          ? modo === "FLCH SPD"
            ? hasta > s.position.y
              ? "THR"
              : "IDLE"
            : "SPD"
          : null,
        // La del juego: ninguna en el sencillo. Ver `velocidadMinimaDelAutomatico`.
        ...(modelo instanceof ArcadeFlightModel ? {} : { minima: a.approachSpeed * 1.1 }),
      },
      DT,
      memoria,
    );
    if (m.throttle !== null) gas = m.throttle;
    modelo.step(DT, {
      ...neutralControls(),
      tren: a.trenRetractil ? 0 : 1,
      throttle: gas,
      aileron: m.aileron,
      elevator: m.elevator,
      automatico: true,
    });
    if (t >= segundos - ultimos) {
      r.n1.push(100 * regimen(a, gas, true));
      r.kt.push(indicatedAirspeed(s.airspeed, s.position.y) / NUDO);
      r.altura.push(s.position.y);
      r.modos.push(modo);
      r.gas.push(gas);
    }
  }
  return r;
}

const media = (l: number[]) => l.reduce((x, y) => x + y, 0) / Math.max(1, l.length);
const aparta = (l: number[]) => {
  const m = media(l);
  return Math.max(...l.map((x) => Math.abs(x - m)));
};

/** Dónde cruza cada uno: su crucero, sin pasar de FL290. */
const cruceroDe = (a: AircraftConfig) => Math.min(a.alturaDeCrucero * 0.9, 29000 * PIE);

describe("quién lleva gases automáticos y quién automático", () => {
  it("los gases, solo los reactores", () => {
    for (const a of AIRCRAFT)
      expect(llevaGasesAutomaticos(a), a.id).toBe(a.sound.engine === "turbofan");
  });

  it("y el automático, todos menos el fumigador", () => {
    for (const a of AIRCRAFT)
      expect(llevaPilotoAutomatico(a), a.id).toBe(a.id !== "jaz-25");
  });
});

describe("en crucero tranquilo, el N1 quieto: toda la flota, los cuatro peldaños", () => {
  for (const a of AIRCRAFT.filter(llevaPilotoAutomatico))
    for (const tier of TIERS)
      it(`${a.id} en ${tier.id}: cinco minutos sin mover el N1 más de un punto`, () => {
        const h = cruceroDe(a);
        const r = volar(a, tier, h, h, 360, 300);
        const otro = modeloDe(a, tier);
        otro.reset({ position: new Vector3(0, h, 0), heading: 0, airspeed: 100 });
        const ktPedida = pedida(a, otro, h);
        expect(aparta(r.n1), `N1 ${Math.min(...r.n1).toFixed(1)}–${Math.max(...r.n1).toFixed(1)}`).toBeLessThanOrEqual(1);
        expect(aparta(r.altura), "altura").toBeLessThan(30);
        if (llevaGasesAutomaticos(a))
          expect(Math.abs(media(r.kt) - ktPedida), `${media(r.kt).toFixed(1)} kt para ${ktPedida}`).toBeLessThan(3);
      });
});

describe("y cambiando de nivel, como uno de línea", () => {
  for (const id of ["jaz-90", "jaz-120"])
    it(`${id}: sube con empuje de subida y la velocidad en el morro, y captura sin pasarse`, () => {
      const a = AIRCRAFT.find((x) => x.id === id)!;
      const tier = TIERS.find((t) => t.id === "taguato-ruvicha")!;
      const desde = 12000 * PIE;
      const hasta = 24000 * PIE;
      const r = volar(a, tier, desde, hasta, 420, 420);
      // Subiendo: FLCH, gases como mucho a la de subida y la velocidad cerca de la que toca.
      const subiendo = r.modos.map((m, i) => ({ m, i })).filter((x) => x.m === "FLCH SPD");
      expect(subiendo.length).toBeGreaterThan(60 * 30);
      const enMedio = subiendo.slice(subiendo.length / 4, (3 * subiendo.length) / 4);
      for (const { i } of enMedio) {
        expect(r.gas[i]!).toBeLessThanOrEqual(GAS_DE_SUBIDA + 1e-9);
        const pide = velocidadQueToca(a, {
          altitud: r.altura[i]!,
          restante: null,
          bajando: false,
          enFinal: false,
          subiendo: true,
        }).kt;
        expect(Math.abs(r.kt[i]! - pide), `${r.kt[i]!.toFixed(0)} kt para ${pide}`).toBeLessThan(8);
      }
      // Y arriba, nivelado sin pasarse de cien pies, en ALT.
      expect(Math.max(...r.altura) - hasta).toBeLessThan(100 * PIE);
      expect(r.modos.at(-1)).toBe("ALT");
      expect(Math.abs(r.altura.at(-1)! - hasta)).toBeLessThan(30);
    });

  it("la captura empieza antes cuanto más deprisa se llega", () => {
    expect(aCuantoCaptura(15)).toBeGreaterThan(aCuantoCaptura(5));
    expect(aCuantoCaptura(0)).toBeGreaterThan(0);
  });

  it("y ya nivelado, un bache no lo saca de ALT: lo saca una altura nueva", () => {
    expect(modoVertical("ALT", { falta: 60, vertical: 0, nueva: false, conGases: true })).toBe("ALT");
    expect(modoVertical("ALT", { falta: 900, vertical: 0, nueva: true, conGases: true })).toBe(
      "FLCH SPD",
    );
    expect(modoVertical("ALT", { falta: 900, vertical: 0, nueva: true, conGases: false })).toBe(
      "V/S",
    );
  });
});

describe("el consumo con la altura, como en uno de verdad", () => {
  /*
   * Enrique: «a mayor altitud, mejor desempeño, menos consumo y mayor
   * velocidad; ¿se calcula y se refleja?». Aquí se mira volando: el reactor
   * nivelado con su automático a la velocidad de la escalera, a diez, veinte
   * y veintinueve mil pies, y lo que quema por hora y por milla.
   */
  for (const id of ["jaz-90", "jaz-120"])
    it(`${id}: arriba quema menos por milla, y con el mismo gas, menos por hora`, () => {
      const a = AIRCRAFT.find((x) => x.id === id)!;
      const tier = TIERS.find((t) => t.id === "taguato-ruvicha")!;
      const porMilla: number[] = [];
      for (const pies of [10000, 20000, 29000]) {
        const h = pies * PIE;
        const modelo = modeloDe(a, tier) as CoefficientFlightModel;
        const r = volar(a, tier, h, h, 120, 30);
        const gas = media(r.gas);
        const kt = media(r.kt);
        const tas = trueFromIndicated(kt * NUDO, h);
        void modelo;
        const empuje = gas * empujeLleno(a, airDensity(h), tas);
        const donde = {
          mach: machDe(tas, h),
          theta: (temperaturaExterior(h) + 273.15) / 288.15,
        };
        const kgHora = quemaPorSegundo(a, empuje, donde) * 3600;
        porMilla.push(kgHora / (tas / NUDO));
      }
      expect(porMilla[1]!).toBeLessThan(porMilla[0]!);
      expect(porMilla[2]!).toBeLessThan(porMilla[1]!);
      // Y con el mismo gas, arriba empuja menos y quema menos.
      const quema = (pies: number) => {
        const h = pies * PIE;
        const v = 230;
        return quemaPorSegundo(a, 0.6 * empujeLleno(a, airDensity(h), v), {
          mach: machDe(v, h),
          theta: (temperaturaExterior(h) + 273.15) / 288.15,
        });
      };
      expect(quema(29000)).toBeLessThan(quema(20000));
      expect(quema(20000)).toBeLessThan(quema(10000));
      void SEA_LEVEL_DENSITY;
    });
});

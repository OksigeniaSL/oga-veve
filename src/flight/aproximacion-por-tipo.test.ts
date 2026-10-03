/**
 * **El gas y el morro en la aproximación, por tipo.**
 *
 * Existe por dos quejas de Enrique en la final, las dos de la misma familia:
 *
 * - Con la avioneta de ala alta, en final a un campo de hierba: «esta avioneta
 *   casi no baja». Quitaba gas y la mano del teclado sostenía el nivel con el
 *   morro —como la ley normal de un Airbus— hasta que la velocidad se iba a 45
 *   nudos. Un avión de cables, compensado, baja el morro solo al quitarle gas
 *   y desciende a la velocidad a la que se compensó: 14 CFR 23.173 y 25.173.
 *   Ver `sostieneLaVelocidad` en `mano.ts`.
 * - Con el JAZ 60 en Guyrami, flaps en el segundo punto, tren fuera y los dos
 *   motores a cien: «me pide 98, pero no paso de 89». El modelo sencillo
 *   restaba lo sacado de una punta que en los de hélice ya era su velocidad de
 *   subir. Ver `puntaConLoSacado` en `arcade.ts`.
 *
 * Con `OGA_MEDIR=1` saca las tablas: qué pasa al quitar gas en la final, en
 * cada avión y cada peldaño, y qué da el gas a fondo con tren y flaps.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { airDensity, indicatedAirspeed, SEA_LEVEL_DENSITY, trueFromIndicated } from "./atmosphere";
import { GUYRAMI, TAGUATO, TAGUATO_RUVICHA, TUKA, type Tier } from "./tiers";
import { DT, empezar, volar, type VueloDeBanco } from "./mano-banco";
import { gasDeLosAutomaticos, memoriaDeGasesNueva, type MemoriaDeGases } from "./gases-automaticos";
import { empujeLleno } from "./fdm";
import { gasQueSostiene } from "./gas-que-toca";
import { NUDO, velocidadQueToca, vrefKt } from "./escalera-de-velocidades";
import { ArcadeFlightModel } from "./arcade";
import { neutralControls } from "./model";
import { topeDeLoSacado } from "./limites";
import { DETENTES } from "./flaps";
import type { LoQuePide } from "./mano";

const RAD = Math.PI / 180;
const PIE = 0.3048;
/** Mil quinientos pies: la altura de la queja del JAZ 60 llegando a Pettirossi. */
const ALTO = 1500 * PIE;
const avion = (id: string): AircraftConfig => AIRCRAFT.find((a) => a.id === id)!;

function iasDe(v: VueloDeBanco): number {
  const s = v.modelo.state;
  return s.airspeed * Math.sqrt(airDensity(s.position.y) / SEA_LEVEL_DENSITY);
}

/** La marca de la final: la Vref y cinco, m/s. Ver `escalera-de-velocidades.ts`. */
const marcaDeLaFinal = (a: AircraftConfig): number => (vrefKt(a) + 5) * NUDO;

/** Los flaps de aterrizar, en el que los lleva. */
const flapsDeAterrizar = (a: AircraftConfig): number => (a.llevaFlaps ? 1 : 0);

/** Un toque de tecla, como llega de `input.ts`: una décima y su paso al soltar. */
function toque(t: number, signo: number): Partial<LoQuePide> {
  if (t < 0.1 - 1e-9) return { teclaCabeceo: signo };
  if (t < 0.1 + DT - 1e-9) return { toqueCabeceo: signo };
  return {};
}

/**
 * **En la final**: a la marca, con tren y flaps de aterrizar, a 1.500 pies. La
 * mano coge el avión nivelado con el dedo en el centro mientras unos gases
 * llevan la velocidad —los de la final de Guyrami—, y se deja un minuto para
 * que se asiente. Después, **quien vuela coge el gas**: los gases se sueltan, y
 * con el dedo en el centro la mano está suelta, así que se queda con lo que
 * sostiene ese avión suelto.
 */
function enLaFinal(a: AircraftConfig, tier: Tier): VueloDeBanco {
  const ias = marcaDeLaFinal(a);
  const v = empezar(a, tier, ias, ALTO, flapsDeAterrizar(a));
  v.gasLlevaLaVelocidad = true;
  const m: MemoriaDeGases = memoriaDeGasesNueva();
  volar(v, 0.1, () => ({}));
  v.mano.ponerPalanca(0, 0);
  volar(v, 60, () => {
    const s = v.modelo.state;
    v.gas = gasDeLosAutomaticos(
      {
        velocidad: iasDe(v),
        gas: v.gas,
        empujeAFondo: empujeLleno(a, airDensity(s.position.y), s.airspeed),
        masa: a.mass,
        ...(tier.model === "simple"
          ? { equilibrio: v.modelo.gasPara(trueFromIndicated(ias, s.position.y)) }
          : {}),
      },
      "SPD",
      ias,
      DT,
      m,
    );
    return {};
  });
  v.gasLlevaLaVelocidad = false;
  // Un fotograma para que la mano lo vea, con el gas quieto.
  volar(v, DT, () => ({}));
  return v;
}

/** Lo que pasa en `segundos` sin tocar el morro. */
interface SinTocarElMorro {
  /** La V/S al final, m/s. */
  vs: number;
  /** Lo más que se aparta la indicada de la marca, kt. */
  lejos: number;
  /** Y pasados diez segundos, con el avión ya bajando, kt. */
  lejosAsentado: number;
  /** La indicada al final, kt. */
  ias: number;
  /** Lo más que cambia la V/S en los primeros diez segundos, m/s. */
  cambiaLaVs: number;
  /** Si cantó el avisador de pérdida. */
  canto: boolean;
}

function sinTocarElMorro(v: VueloDeBanco, segundos: number, marca: number): SinTocarElMorro {
  let lejos = 0;
  let lejosAsentado = 0;
  let canto = false;
  let t = 0;
  const vs0 = v.modelo.state.verticalSpeed;
  let cambiaLaVs = 0;
  volar(v, segundos, () => ({}), () => {
    t += DT;
    const aparte = Math.abs(iasDe(v) - marca) / NUDO;
    lejos = Math.max(lejos, aparte);
    if (t > 10) lejosAsentado = Math.max(lejosAsentado, aparte);
    if (t < 10) cambiaLaVs = Math.max(cambiaLaVs, Math.abs(v.modelo.state.verticalSpeed - vs0));
    canto = canto || v.modelo.state.stallWarning;
  });
  return {
    vs: v.modelo.state.verticalSpeed,
    lejos,
    lejosAsentado,
    ias: iasDe(v) / NUDO,
    cambiaLaVs,
    canto,
  };
}

/** El gas de la senda de tres grados a esa velocidad, con tren y flaps, en el modelo completo. */
function gasDeLaSenda(v: VueloDeBanco): number {
  const s = v.modelo.state;
  return (
    gasQueSostiene(v.aircraft, {
      altura: s.position.y,
      verdadera: s.airspeed,
      flaps: v.flaps,
      tren: 1,
      pendiente: -3 * RAD,
    }) ?? 0
  );
}

/**
 * **Lo que da el modelo sencillo con un gas**, nivelado, con lo sacado, a
 * 1.500 pies: indicada, m/s. La palanca la pone el propio modelo para no
 * subir ni bajar —`mandoParaSubir`—, que la altura cambia la punta.
 */
function sencilloNivelado(a: AircraftConfig, gas: number, flaps: number, tren: number): number {
  const m = new ArcadeFlightModel({ aircraft: a, ground: () => 0 });
  m.reset({ position: new Vector3(0, ALTO, 0), heading: 0, airspeed: a.approachSpeed * 1.3 });
  const c = { ...neutralControls(), throttle: gas, flaps, tren, engineOn: true };
  for (let t = 0; t < 90; t += DT) {
    c.elevator = m.mandoParaSubir(0);
    m.step(DT, c);
  }
  return indicatedAirspeed(m.state.airspeed, m.state.position.y);
}

const CONVENCIONALES_DE_HELICE = ["jaz-20", "jaz-25", "jaz-40", "jaz-60"];
const COMPLETOS: readonly Tier[] = [TUKA, TAGUATO, TAGUATO_RUVICHA];

// ── Las pruebas ─────────────────────────────────────────────────────────────

describe("la avioneta en la final: quitar gas la baja, a su velocidad", () => {
  /*
   * «Esta avioneta casi no baja.» Con el gas de la senda —el de bajar tres
   * grados a la marca, que es lo que se pone en una final— y con el gas al
   * ralentí, sin tocar el morro: baja, y la indicada se queda en la marca a
   * menos de cinco nudos. Antes se quedaba nivelada y la velocidad se iba a
   * 40–48 nudos.
   *
   * Quitar de golpe todo el gas del bimotor o del turbohélice —de casi nueve
   * décimas a cero— le quita dos metros por segundo cada segundo hasta que el
   * morro baja lo que hace falta, y en esos segundos se pierden seis o siete
   * nudos, como en el avión de verdad si no se empuja; luego vuelve a su
   * velocidad. La cifra de la norma, que la velocidad vuelva a su sitio, se
   * mira asentado.
   */
  for (const id of CONVENCIONALES_DE_HELICE)
    for (const tier of COMPLETOS)
      for (const gas of ["senda", "ralenti"] as const)
        it(`${id} en ${tier.id}, gas ${gas}`, () => {
          const a = avion(id);
          const v = enLaFinal(a, tier);
          expect(v.mano.velocidadCompensada, "suelta, compensa la velocidad").not.toBeNull();
          v.gas = gas === "senda" ? gasDeLaSenda(v) : 0;
          const r = sinTocarElMorro(v, 40, marcaDeLaFinal(a));
          expect(r.vs, "baja").toBeLessThan(gas === "senda" ? -1 : -2.5);
          expect(r.lejosAsentado, "a su velocidad, kt").toBeLessThan(5);
          expect(r.lejos, "y sin irse de ella al quitar el gas, kt").toBeLessThan(gas === "senda" ? 5 : 8);
          expect(r.canto, "sin acercarse al avisador").toBe(false);
        });

  it("y el JAZ 120, que es un 747 clásico de cables, igual", () => {
    for (const tier of COMPLETOS) {
      const a = avion("jaz-120");
      const v = enLaFinal(a, tier);
      v.gas = gasDeLaSenda(v);
      const r = sinTocarElMorro(v, 60, marcaDeLaFinal(a));
      expect(r.vs, tier.id).toBeLessThan(-1.5);
      expect(r.lejosAsentado, `${tier.id}, kt`).toBeLessThan(5);
      expect(r.lejos, `${tier.id}, kt`).toBeLessThan(8);
    }
  });

  it("y en Guyrami también baja, aunque allí la velocidad la lleve el gas", () => {
    /*
     * En el modelo sencillo el gas **es** la velocidad —la regla de ese
     * peldaño—, así que la indicada baja con él; lo que tiene que pasar es que
     * baje el avión: la palanca compensada se queda, y por debajo del gas que
     * ni sube ni baja con tren y flaps, se baja. Antes se quedaba nivelado.
     */
    for (const id of CONVENCIONALES_DE_HELICE) {
      const a = avion(id);
      const v = enLaFinal(a, GUYRAMI);
      v.gas = Math.max(0, v.gas - 0.3);
      const r = sinTocarElMorro(v, 30, marcaDeLaFinal(a));
      expect(r.vs, id).toBeLessThan(-1);
    }
  });
});

describe("la tecla de morro, en el avión compensado, mueve la velocidad", () => {
  it("un toque son dos nudos, y el avión los sigue", () => {
    for (const id of ["jaz-20", "jaz-60"]) {
      const a = avion(id);
      const v = enLaFinal(a, TAGUATO_RUVICHA);
      v.gas = gasDeLaSenda(v);
      volar(v, 20, () => ({}));
      const antes = v.mano.velocidadCompensada!;
      // Dos toques de morro abajo: cuatro nudos más.
      volar(v, 1, (t) => toque(t, -1));
      volar(v, 1, (t) => toque(t, -1));
      expect((v.mano.velocidadCompensada! - antes) / NUDO, id).toBeCloseTo(4, 1);
      volar(v, 40, () => ({}));
      expect(Math.abs(iasDe(v) - v.mano.velocidadCompensada!) / NUDO, id).toBeLessThan(1.5);
    }
  });

  it("y soltada la tecla, se compensa a la velocidad que quedó", () => {
    const a = avion("jaz-20");
    const v = enLaFinal(a, TAGUATO_RUVICHA);
    volar(v, 2, () => ({ teclaCabeceo: 1 }));
    volar(v, 4, () => ({}));
    const compensada = v.mano.velocidadCompensada;
    expect(compensada).not.toBeNull();
    let lejos = 0;
    volar(v, 30, () => ({}), () => (lejos = Math.max(lejos, Math.abs(iasDe(v) - compensada!))));
    expect(lejos / NUDO).toBeLessThan(2);
  });
});

describe("el JAZ 90, de mandos eléctricos, sigue sosteniendo la trayectoria", () => {
  /*
   * Como la ley normal de un Airbus: soltado, quitar gas no le baja el morro.
   * La trayectoria se queda y la velocidad se va —hasta que la protección del
   * ángulo cede—, que es lo que hace ese avión de verdad.
   */
  for (const tier of COMPLETOS)
    it(`en ${tier.id}`, () => {
      const a = avion("jaz-90");
      const v = enLaFinal(a, tier);
      expect(v.mano.velocidadCompensada).toBeNull();
      v.gas = gasDeLaSenda(v);
      const marca = marcaDeLaFinal(a);
      const r = sinTocarElMorro(v, 10, marca);
      expect(r.cambiaLaVs, "la V/S se queda, m/s").toBeLessThan(0.5);
      expect(marca / NUDO - r.ias, "y la velocidad se va, kt").toBeGreaterThan(5);
    });
});

describe("el modelo sencillo con tren y flaps: el gas a fondo pasa de la marca", () => {
  it("el JAZ 60 con flaps en el segundo punto, tren fuera y gas a fondo pasa de 98", () => {
    // «Me pide 98, pero no paso de 89.» Antes: 92 a 1.500 pies.
    const a = avion("jaz-60");
    const ias = sencilloNivelado(a, 1, DETENTES[2], 1);
    expect(ias / NUDO).toBeGreaterThan(marcaDeLaFinal(a) / NUDO + 5);
  });

  it("en todos, con los de aterrizar: a fondo pasa de la marca, y la marca sale con gas de sobra", () => {
    for (const a of AIRCRAFT) {
      const flaps = flapsDeAterrizar(a);
      const marca = marcaDeLaFinal(a);
      expect(sencilloNivelado(a, 1, flaps, 1) / NUDO, `${a.id} a fondo`).toBeGreaterThan(marca / NUDO + 3);
      const m = new ArcadeFlightModel({ aircraft: a, ground: () => 0 });
      m.reset({ position: new Vector3(0, ALTO, 0), heading: 0, airspeed: a.approachSpeed });
      const gas = m.gasPara(trueFromIndicated(marca, ALTO), { flaps, tren: 1 });
      expect(gas, `${a.id}: el gas de la marca`).toBeLessThan(0.9);
    }
  });

  it("y la ayuda de la final de Guyrami lleva la velocidad de verdad", () => {
    /*
     * Los gases de la final de Guyrami van derechos a `gasPara`, y `gasPara`
     * contaba el avión limpio: con tren y flaps el avión se quedaba muy por
     * debajo de la marca —el JAZ 120, a ochenta nudos para una de 151—.
     */
    for (const a of AIRCRAFT) {
      const v = enLaFinal(a, GUYRAMI);
      expect(Math.abs(iasDe(v) - marcaDeLaFinal(a)) / NUDO, a.id).toBeLessThan(3);
    }
  });
});

// ── La medida ───────────────────────────────────────────────────────────────

const entorno =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const medir = import.meta.env.OGA_MEDIR || entorno.OGA_MEDIR;
const kt = (x: number) => (x / NUDO).toFixed(0).padStart(4);

describe.runIf(medir)("la aproximación, medida", () => {
  it("quitar gas en la final, sin tocar el morro", () => {
    const filas = [
      "\navión    peldaño          gas      | IAS antes | gas → | IAS a 40 s · lejos kt (asentado) | V/S fpm · senda °",
    ];
    for (const a of AIRCRAFT)
      for (const tier of [GUYRAMI, ...COMPLETOS])
        for (const cual of ["senda", "ralenti"] as const) {
          const v = enLaFinal(a, tier);
          const antes = iasDe(v);
          v.gas = cual === "ralenti" ? 0 : tier.model === "simple" ? Math.max(0, v.gas - 0.2) : gasDeLaSenda(v);
          const r = sinTocarElMorro(v, 40, antes);
          const s = v.modelo.state;
          filas.push(
            `${a.id.padEnd(8)} ${tier.id.padEnd(16)} ${cual.padEnd(8)} |${kt(antes)}      | ${v.gas.toFixed(2)} |${kt(iasDe(v))} · ${r.lejos.toFixed(1).padStart(5)} (${r.lejosAsentado.toFixed(1)})     | ${((s.verticalSpeed / PIE) * 60).toFixed(0).padStart(6)} · ${(Math.asin(s.verticalSpeed / s.airspeed) / RAD).toFixed(1).padStart(5)}`,
          );
        }
    console.log(filas.join("\n"));
  });

  it("el gas a fondo con tren y flaps, y la marca", () => {
    const filas = ["\navión    | flaps  tren | sencillo a fondo kt | marca kt (peldaño) | gas de la marca"];
    for (const a of AIRCRAFT)
      for (const f of a.llevaFlaps ? DETENTES : [0]) {
        const tren = a.trenRetractil ? (f >= DETENTES[2] - 1e-6 ? 1 : 0) : 1;
        const peldano = f === 1 || !a.llevaFlaps ? "final" : f > 0 ? "aproximación" : "terminal";
        const restante = { final: 3, aproximación: 10, terminal: 20 }[peldano] * 1852;
        const toca = velocidadQueToca(a, {
          altitud: ALTO,
          restante,
          bajando: true,
          enFinal: peldano === "final",
          subiendo: false,
          topeKt: topeDeLoSacado(a, { tren, flaps: f }),
        });
        const m = new ArcadeFlightModel({ aircraft: a, ground: () => 0 });
        m.reset({ position: new Vector3(0, ALTO, 0), heading: 0, airspeed: a.approachSpeed });
        const gas = m.gasPara(trueFromIndicated(toca.kt * NUDO, ALTO), { flaps: f, tren });
        filas.push(
          `${a.id.padEnd(8)} | ${f.toFixed(2)}  ${tren}    | ${kt(sencilloNivelado(a, 1, f, tren))}               | ${String(toca.kt).padStart(4)} (${toca.peldano}) | ${gas >= 0.999 ? "no llega" : gas.toFixed(2)}`,
        );
      }
    console.log(filas.join("\n"));
  });
});

/**
 * La velocidad mínima del automático: que cuente la pérdida de los flaps que
 * lleva, y no solo la Vref.
 *
 * Nace de lo que vio la enmienda H25c del ADR 0027: la mínima era la Vref por
 * `1,1 − 0,15 · flaps`, y con la Vref del E170 de la FAA, en el JAZ 90 limpio
 * eran 129 nudos con la pérdida limpia en 135. Ver `minimaDelAutomatico` en
 * `velocidades-de-despegue.ts`.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, aircraftById, conMasa, type AircraftConfig } from "./aircraft";
import { MARGEN_DEL_AVISADOR } from "./avisos-de-actitud";
import { flapsQuePide, velocidadQueToca } from "./escalera-de-velocidades";
import { muescaDeAterrizaje, muescasDeLaPalanca } from "./flaps";
import {
  ALABEO_MAXIMO,
  mandosPara,
  memoriaNueva,
  type Estado,
} from "./piloto-automatico";
import {
  MINIMA_DEL_AUTOMATICO_SOBRE_LA_PERDIDA,
  minimaDelAutomatico,
  perdidaCon,
} from "./velocidades-de-despegue";

const NUDO = 0.514444;
const AVIONES = AIRCRAFT.filter((a) => !a.helicoptero);
const muescasDe = (a: AircraftConfig): readonly number[] =>
  a.llevaFlaps ? muescasDeLaPalanca(a) : [0];
/** La de siempre, con la limpia del avión sin flaps contada como la de aterrizar. */
const deSiempre = (a: AircraftConfig, f: number) =>
  a.approachSpeed * (1.1 - 0.15 * (a.llevaFlaps ? f : 1));

/** Lo más que se puede inclinar a esta velocidad sin que suene el avisador, grados. */
const loQueSeVira = (a: AircraftConfig, flaps: number, v: number): number => {
  const carga = (v / perdidaCon(a, flaps)) ** 2 / MARGEN_DEL_AVISADOR ** 2;
  return carga <= 1 ? 0 : (Math.acos(1 / carga) * 180) / Math.PI;
};

describe("la mínima del automático cuenta la pérdida de los flaps que lleva", () => {
  it("son todos los aviones, con y sin flaps", () => {
    expect(AVIONES.length).toBeGreaterThanOrEqual(8);
  });

  it.each(AVIONES.map((a) => [a.id, a] as const))(
    "%s: con cada muesca, a la masa de la ficha y a dos tercios de ella",
    (_id, a) => {
      for (const avion of [a, conMasa(a, a.mass * (2 / 3))]) {
        for (const f of muescasDe(avion)) {
          const minima = minimaDelAutomatico(avion, f);
          // Por encima de la franja ámbar y nunca en pérdida: 1,2 veces la de esos flaps.
          expect(minima).toBeGreaterThanOrEqual(
            MINIMA_DEL_AUTOMATICO_SOBRE_LA_PERDIDA * perdidaCon(avion, f) - 1e-9,
          );
          // Y nunca por debajo de la de siempre: donde ya protegía, no se mueve.
          expect(minima).toBeGreaterThanOrEqual(deSiempre(avion, f) - 1e-9);
          // A su mínima, virando a lo más que vira el automático, el avisador no suena.
          expect(loQueSeVira(avion, f, minima)).toBeGreaterThan((ALABEO_MAXIMO * 180) / Math.PI);
        }
      }
    },
  );

  it.each(AVIONES.map((a) => [a.id, a] as const))(
    "%s: con los de aterrizar, por debajo de la Vref: la final a su velocidad no la toca",
    (_id, a) => {
      const f = a.llevaFlaps ? (muescasDeLaPalanca(a)[muescaDeAterrizaje(a)] ?? 1) : 0;
      expect(minimaDelAutomatico(a, f)).toBeLessThan(a.approachSpeed);
    },
  );

  it("el JAZ 90 limpio: la de siempre quedaba por debajo de su pérdida, y esta no", () => {
    const a = aircraftById("jaz-90");
    expect(deSiempre(a, 0)).toBeLessThan(perdidaCon(a, 0));
    expect(minimaDelAutomatico(a, 0) / NUDO).toBeGreaterThan(160);
    // Y con los de aterrizar, la que cambia es poca: tres nudos sobre la de siempre.
    const f = muescasDeLaPalanca(a)[muescaDeAterrizaje(a)]!;
    expect((minimaDelAutomatico(a, f) - deSiempre(a, f)) / NUDO).toBeLessThan(4);
  });

  it("el avión sin flaps: la Vref y un diez le quedaba por encima de su final, y ya no", () => {
    const sin = AVIONES.filter((a) => !a.llevaFlaps);
    expect(sin.length).toBeGreaterThan(0);
    for (const a of sin) {
      const final = a.approachSpeed + 5 * NUDO;
      expect(a.approachSpeed * 1.1).toBeGreaterThan(final);
      expect(minimaDelAutomatico(a, 0)).toBeLessThan(a.approachSpeed);
    }
  });

  /*
   * Lo que pide la escalera de la llegada con los flaps que pide queda por
   * encima de la mínima con esos flaps: el automático no protege contra su
   * propia marca.
   */
  it.each(AVIONES.map((a) => [a.id, a] as const))(
    "%s: la escalera de la llegada no pide nada por debajo de la mínima del automático",
    (_id, a) => {
      const MILLA = 1852;
      for (const millas of [20, 10, 6, 3]) {
        const v = velocidadQueToca(a, {
          altitud: 600,
          restante: millas * MILLA,
          bajando: true,
          enFinal: false,
          subiendo: false,
        });
        const f = muescasDeLaPalanca(a)[flapsQuePide(a, v.peldano)] ?? 0;
        expect(v.kt + 0.5).toBeGreaterThanOrEqual(minimaDelAutomatico(a, f) / NUDO);
      }
    },
  );
});

describe("los gases no piden menos que la mínima", () => {
  const nivelado: Estado = {
    heading: 0,
    alabeo: 0,
    cabeceo: 0,
    altitud: 1000,
    vertical: 0,
    velocidad: 70,
    gas: 0.5,
    verdadera: 72,
    ritmoDeCabeceo: 0,
  };

  it("con la marca por debajo de la mínima, el gas es el de ir a la mínima", () => {
    const base = { rumbo: null, altitud: 1000, gases: "SPD" as const };
    const conMarcaBaja = mandosPara(
      nivelado,
      { ...base, velocidad: 60, minima: 75 },
      1 / 60,
      memoriaNueva(),
    );
    const aLaMinima = mandosPara(
      nivelado,
      { ...base, velocidad: 75, minima: 75 },
      1 / 60,
      memoriaNueva(),
    );
    const sinMinima = mandosPara(nivelado, { ...base, velocidad: 60 }, 1 / 60, memoriaNueva());
    expect(conMarcaBaja.throttle).toBe(aLaMinima.throttle);
    // Y sin mínima, a la marca: frena.
    expect(sinMinima.throttle!).toBeLessThan(aLaMinima.throttle!);
  });
});

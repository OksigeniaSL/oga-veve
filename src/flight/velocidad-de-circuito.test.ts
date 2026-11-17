/**
 * La velocidad de circuito: que cada avión tenga la suya, que sea de verdad,
 * que el pasillo contra el terreno se mida con ella y que el juego la pida.
 *
 * Nace de un banco: el JAZ 90 volaba el viento en cola de Los Rodeos a
 * doscientos treinta nudos —tres kilómetros de radio de viraje— y tocaba las
 * estribaciones de Anaga. Ver `velocidadDeCircuito` en `aircraft.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  AIRCRAFT,
  MEDIDOS,
  aircraftById,
  vrefDeSuCategoria,
  type AircraftConfig,
} from "./aircraft";
import { MARGEN_DEL_AVISADOR } from "./avisos-de-actitud";
import { muescaDeAproximacion, muescaDeAterrizaje, muescasDeLaPalanca } from "./flaps";
import { vfeDeAterrizaje } from "./limites";
import {
  MARGEN_DE_CIRCUITO,
  bandaDeAhora,
  bandaDeCircuito,
} from "./velocidad-de-aproximacion";
import {
  escalaDeCircuito,
  pasilloDelCircuito,
  radioDeViraje,
} from "../world/circuito";
import { maniobraCon, minimaConFlaps, perdidaCon } from "./velocidades-de-despegue";
import { flapsQuePide, velocidadQueToca } from "./escalera-de-velocidades";

const NUDO = 0.514444;

/**
 * La categoría PANS-OPS de un avión por la velocidad a la que cruza el
 * umbral, y lo más que se vuela un circuito visual en ella, en nudos (OACI,
 * Doc 8168, vol. I).
 */
function topeDeSuCategoria(vrefKt: number): number {
  if (vrefKt < 91) return 100; // A
  if (vrefKt <= 120) return 135; // B
  if (vrefKt <= 140) return 180; // C
  if (vrefKt <= 165) return 205; // D
  return 240; // E
}

const volando = (velocidad: number, vertical = 0, sobreElSuelo = 300) => ({
  sobreElSuelo,
  enElSuelo: false,
  vertical,
  velocidad,
});

describe("cada avión tiene su velocidad de circuito, y es de verdad", () => {
  it.each(MEDIDOS.map((a) => [a.id, a] as const))(
    "%s: por encima de su Vref, dentro de su categoría y con los flaps fuera",
    (_id, a) => {
      const kt = a.velocidadDeCircuito / NUDO;
      // Un circuito no se vuela a la de cruzar el umbral: se vuela con margen.
      expect(a.velocidadDeCircuito).toBeGreaterThan(a.approachSpeed * 1.1);
      // Ni por encima de lo que permite su categoría, que se cuenta con la
      // Vref a su masa máxima al aterrizar: el E170 de la ficha cruza a 117,7
      // nudos y es de la C (enmienda H20e del ADR 0027).
      expect(kt).toBeLessThanOrEqual(topeDeSuCategoria(vrefDeSuCategoria(a) / NUDO));
      // Y configurado: si lleva flaps, a esa velocidad se pueden sacar.
      // Con los de aterrizaje, que es la placa más baja.
      if (a.llevaFlaps)
        expect(kt).toBeLessThanOrEqual(vfeDeAterrizaje(a.vfePorMuesca));
    },
  );

  it("y ningún avión vuela su circuito a la velocidad del banco que se estrellaba", () => {
    // 122 m/s: la del viento en cola medido en Los Rodeos con el JAZ 90.
    for (const a of MEDIDOS) expect(a.velocidadDeCircuito).toBeLessThan(100);
  });
});

describe("el pasillo contra el terreno se mide a la velocidad del circuito", () => {
  it("con el reactor, más ancho que el que salía de la de aproximación", () => {
    const jaz90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;
    const escala = escalaDeCircuito(jaz90.approachSpeed);
    const antes = pasilloDelCircuito(escala);
    const ahora = pasilloDelCircuito(escala, jaz90.velocidadDeCircuito);
    expect(ahora).toBeCloseTo(radioDeViraje(jaz90.velocidadDeCircuito), 6);
    expect(ahora).toBeGreaterThan(antes * 1.4);
  });

  it("y con la avioneta siguen mandando los seiscientos metros", () => {
    const jaz20 = AIRCRAFT.find((a) => a.id === "jaz-20")!;
    expect(pasilloDelCircuito(1, jaz20.velocidadDeCircuito)).toBe(600);
  });

  it("el margen de la banda es lo que se recupera virando a treinta en vez de a veinticinco", () => {
    const v = 87;
    const a25 = radioDeViraje(v);
    const a30 = radioDeViraje(v * (1 + MARGEN_DE_CIRCUITO), (30 * Math.PI) / 180);
    expect(a30).toBeCloseTo(a25, 6);
    expect(MARGEN_DE_CIRCUITO).toBeGreaterThan(0.1);
    expect(MARGEN_DE_CIRCUITO).toBeLessThan(0.12);
  });
});

describe("y el juego la pide volando el circuito", () => {
  const VREF = 68;
  const CIRCUITO = { velocidad: 87.5, minima: VREF };

  it("rápido pasado el margen, bien entre la mínima y él, y nada por debajo", () => {
    expect(bandaDeCircuito(volando(122), CIRCUITO)).toBe("rapido");
    expect(bandaDeCircuito(volando(CIRCUITO.velocidad * 1.1), CIRCUITO)).toBe("bien");
    expect(bandaDeCircuito(volando(VREF), CIRCUITO)).toBe("bien");
    // Lento lo juzgan la aproximación y el avisador de pérdida, no esto.
    expect(bandaDeCircuito(volando(VREF - 5), CIRCUITO)).toBeNull();
  });

  it("en el suelo no hay circuito que juzgar", () => {
    expect(
      bandaDeCircuito({ ...volando(122), enElSuelo: true }, CIRCUITO),
    ).toBeNull();
  });

  it("fuera del circuito se calla, como antes", () => {
    const s = { ...volando(122), enLaPista: false };
    expect(bandaDeAhora(s, VREF, false)).toBeNull();
    expect(bandaDeAhora(s, VREF, false, null)).toBeNull();
    expect(bandaDeAhora(s, VREF, false, CIRCUITO)).toBe("rapido");
  });

  it("y bajando hacia la pista manda la de aproximación, que es la que decide la toma", () => {
    // A 95 m/s bajando a cien metros: para el circuito va bien, para la toma
    // va rápido. Gana la toma.
    const s = { ...volando(95, -4, 100), enLaPista: false };
    expect(bandaDeAhora(s, VREF, false, CIRCUITO)).toBe("rapido");
    const bien = { ...volando(70, -4, 100), enLaPista: false };
    expect(bandaDeAhora(bien, VREF, false, CIRCUITO)).toBe("bien");
  });
});

/*
 * **Y el verde cuenta la muesca** (ADR 0027, enmienda H25c).
 *
 * La banda pintaba «bien» desde la Vref con cualquier muesca, y la Vref es de
 * los flaps de aterrizar: con la segunda del JAZ 90 son 1,13 veces su
 * pérdida, y virando a veinticinco grados ahí suena el avisador. Lo de verdad
 * es el punto verde del E-Jet: con unos flaps se va a su de maniobra, 1,3 veces
 * su pérdida, y para ir más despacio se sacan los siguientes (C. Regli,
 * *Embraer EMB190 – Summary*, 2025, pp. 1-38 y 2-19). Aquí, al nivel del mar,
 * donde la indicada y la verdadera son la misma.
 */
describe("el verde del circuito, desde la de maniobra de los flaps que lleva", () => {
  const CON_FLAPS = AIRCRAFT.filter((a) => a.llevaFlaps && !a.helicoptero);
  const circuitoCon = (a: AircraftConfig, flaps: number) => ({
    velocidad: a.velocidadDeCircuito,
    minima: minimaConFlaps(a, flaps),
  });
  /** Lo más que se puede inclinar a esta velocidad sin que suene el avisador, grados. */
  const loQueSeVira = (a: AircraftConfig, flaps: number, v: number): number => {
    const carga = (v / perdidaCon(a, flaps)) ** 2 / MARGEN_DEL_AVISADOR ** 2;
    return carga <= 1 ? 0 : (Math.acos(1 / carga) * 180) / Math.PI;
  };

  it("son todos los aviones con flaps", () => {
    expect(CON_FLAPS.length).toBeGreaterThanOrEqual(6);
  });

  it.each(CON_FLAPS.map((a) => [a.id, a] as const))(
    "%s: con cada muesca menos la de aterrizar, la mínima es su de maniobra; con la de aterrizar, la Vref",
    (_id, a) => {
      const muescas = muescasDeLaPalanca(a);
      const ultima = muescaDeAterrizaje(a);
      muescas.forEach((f, i) => {
        const minima = minimaConFlaps(a, f);
        if (i === ultima) expect(minima).toBe(a.approachSpeed);
        else expect(minima).toBeCloseTo(Math.max(a.approachSpeed, maniobraCon(a, f)), 9);
        // A la mínima se pinta verde, y un nudo por debajo ya no.
        expect(bandaDeCircuito(volando(minima), circuitoCon(a, f))).toBe("bien");
        expect(bandaDeCircuito(volando(minima - NUDO), circuitoCon(a, f))).toBeNull();
        // Y lo que se pinta de verde se vira a treinta grados sin que suene.
        expect(loQueSeVira(a, f, minima)).toBeGreaterThan(30);
      });
    },
  );

  it.each(CON_FLAPS.map((a) => [a.id, a] as const))(
    "%s: con los flaps de en medio, la Vref ya no se pinta de verde",
    (_id, a) => {
      const f = muescasDeLaPalanca(a)[muescaDeAproximacion(a)]!;
      // Solo donde la de maniobra queda por encima, que es en todos con su
      // palanca: si un día no, esta prueba lo dice.
      expect(maniobraCon(a, f)).toBeGreaterThan(a.approachSpeed);
      expect(bandaDeCircuito(volando(a.approachSpeed), circuitoCon(a, f))).toBeNull();
    },
  );

  it("el JAZ 90 con la segunda muesca: a la Vref, 1,13 veces su pérdida y el avisador antes de treinta grados", () => {
    const a = aircraftById("jaz-90");
    const f = muescasDeLaPalanca(a)[muescaDeAproximacion(a)]!;
    expect(a.approachSpeed / perdidaCon(a, f)).toBeCloseTo(1.13, 2);
    expect(loQueSeVira(a, f, a.approachSpeed)).toBeLessThan(30);
    // Antes era verde; ahora no, y a la de maniobra sí, con cuarenta grados de margen.
    expect(bandaDeCircuito(volando(a.approachSpeed), circuitoCon(a, f))).toBeNull();
    expect(loQueSeVira(a, f, minimaConFlaps(a, f))).toBeGreaterThan(40);
  });

  /*
   * Y lo demás que pide una velocidad con unos flaps, la escalera de la
   * llegada: cada peldaño pide unos flaps y una velocidad, y la velocidad no
   * puede quedar por debajo de la de maniobra de esos flaps. Ya era así —la
   * Vref y veinte con la segunda muesca del JAZ 90 son 138 nudos, y su de
   * maniobra, 136—; esto lo deja escrito, para que una Vref o unos flaps
   * nuevos no lo rompan sin que se vea.
   */
  it.each(CON_FLAPS.map((a) => [a.id, a] as const))(
    "%s: la escalera de la llegada no pide nada por debajo de la de maniobra de los flaps que pide",
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
        // Medio nudo de redondeo: la escalera da nudos enteros.
        expect(v.kt + 0.5).toBeGreaterThanOrEqual(minimaConFlaps(a, f) / NUDO);
      }
    },
  );

  it("y el avión sin flaps, desde su Vref como antes", () => {
    const sin = AIRCRAFT.filter((a) => !a.llevaFlaps && !a.helicoptero);
    for (const a of sin) {
      expect(minimaConFlaps(a, 0)).toBe(a.approachSpeed);
      expect(bandaDeCircuito(volando(a.approachSpeed), circuitoCon(a, 0))).toBe("bien");
    }
  });
});

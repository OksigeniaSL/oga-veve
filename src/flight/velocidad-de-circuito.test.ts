/**
 * La velocidad de circuito: que cada avión tenga la suya, que sea de verdad,
 * que el pasillo contra el terreno se mida con ella y que el juego la pida.
 *
 * Nace de un banco: el JAZ 90 volaba el viento en cola de Los Rodeos a
 * doscientos treinta nudos —tres kilómetros de radio de viraje— y tocaba las
 * estribaciones de Anaga. Ver `velocidadDeCircuito` en `aircraft.ts`.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "./aircraft";
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
  it.each(AIRCRAFT.map((a) => [a.id, a] as const))(
    "%s: por encima de su Vref, dentro de su categoría y con los flaps fuera",
    (_id, a) => {
      const kt = a.velocidadDeCircuito / NUDO;
      // Un circuito no se vuela a la de cruzar el umbral: se vuela con margen.
      expect(a.velocidadDeCircuito).toBeGreaterThan(a.approachSpeed * 1.1);
      // Ni por encima de lo que permite su categoría.
      expect(kt).toBeLessThanOrEqual(topeDeSuCategoria(a.approachSpeed / NUDO));
      // Y configurado: si lleva flaps, a esa velocidad se pueden sacar.
      // Con los de aterrizaje, que es la placa más baja.
      if (a.llevaFlaps)
        expect(kt).toBeLessThanOrEqual(vfeDeAterrizaje(a.vfePorMuesca));
    },
  );

  it("y ningún avión vuela su circuito a la velocidad del banco que se estrellaba", () => {
    // 122 m/s: la del viento en cola medido en Los Rodeos con el JAZ 90.
    for (const a of AIRCRAFT) expect(a.velocidadDeCircuito).toBeLessThan(100);
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
  const CIRCUITO = 87.5;

  it("rápido pasado el margen, bien entre la Vref y él, y nada por debajo", () => {
    expect(bandaDeCircuito(volando(122), VREF, CIRCUITO)).toBe("rapido");
    expect(bandaDeCircuito(volando(CIRCUITO * 1.1), VREF, CIRCUITO)).toBe("bien");
    expect(bandaDeCircuito(volando(VREF), VREF, CIRCUITO)).toBe("bien");
    // Lento lo juzgan la aproximación y el avisador de pérdida, no esto.
    expect(bandaDeCircuito(volando(VREF - 5), VREF, CIRCUITO)).toBeNull();
  });

  it("en el suelo no hay circuito que juzgar", () => {
    expect(
      bandaDeCircuito({ ...volando(122), enElSuelo: true }, VREF, CIRCUITO),
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

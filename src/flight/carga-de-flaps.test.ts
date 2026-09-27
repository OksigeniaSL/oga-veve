/**
 * Lo que les pasa a los flaps por pasarse, avión por avión.
 *
 * Preguntado jugando: «debería haber alguna señal de alarma para que no rompa
 * el avión o algo así». La consecuencia de verdad no es la misma en un
 * reactor que en una avioneta, y eso es lo que se comprueba: el reactor sube
 * solo los de aterrizaje y los devuelve al frenar; la avioneta, si se abusa,
 * se queda con los flaps tocados hasta volver a tierra. Ver
 * `carga-de-flaps.ts`.
 */

import { describe, expect, it } from "vitest";
import { aircraftById } from "./aircraft";
import { DETENTES } from "./flaps";
import {
  AGUANTAN,
  FLAPS_SANOS,
  TOPE_DE_TOCADOS,
  cuidarLosFlaps,
  hastaDondeBajan,
  type AhoraMismo,
  type CargaDeFlaps,
} from "./carga-de-flaps";

const ARAI = aircraftById("jaz-90");
const PYKASU = aircraftById("jaz-20");
const DT = 1 / 60;

/** Unos segundos seguidos con lo mismo. */
function durante(
  a: Parameters<typeof cuidarLosFlaps>[0],
  segundos: number,
  ahora: Omit<AhoraMismo, "dt">,
  desde: CargaDeFlaps = FLAPS_SANOS,
): CargaDeFlaps {
  let c = desde;
  for (let t = 0; t < segundos; t += DT) c = cuidarLosFlaps(a, c, { ...ahora, dt: DT });
  return c;
}

const EN_EL_AIRE = { paradoEnTierra: false } as const;

describe("el alivio de carga de un reactor", () => {
  it("con los de aterrizaje y pasado de su placa, los sube a la muesca de antes", () => {
    // 175 es la placa de los de aterrizaje del JAZ 90; salta un nudo por
    // encima, como el 737.
    const c = durante(ARAI, 0.5, {
      ...EN_EL_AIRE,
      kt: 180,
      flaps: 1,
      palanca: 1,
    });
    expect(c.aliviados).toBe(true);
    expect(hastaDondeBajan(c)).toBe(DETENTES[2]);
  });

  it("y la palanca no se toca: es el flap el que sube", () => {
    // Lo que devuelve es un techo para los flaps, no una palanca nueva. Ver
    // `topeDeFlaps` en `input.ts`.
    const c = durante(ARAI, 0.5, {
      ...EN_EL_AIRE,
      kt: 180,
      flaps: 1,
      palanca: 1,
    });
    expect(hastaDondeBajan(c)).toBeLessThan(1);
  });

  it("vuelven al frenar, pero no en la misma raya", () => {
    const aliviados = durante(ARAI, 0.5, {
      ...EN_EL_AIRE,
      kt: 180,
      flaps: 1,
      palanca: 1,
    });
    // Justo por debajo de la placa todavía no: una ráfaga los haría ir y
    // venir cada segundo.
    const casi = cuidarLosFlaps(ARAI, aliviados, {
      ...EN_EL_AIRE,
      kt: 173,
      flaps: 2 / 3,
      palanca: 1,
      dt: DT,
    });
    expect(casi.aliviados).toBe(true);
    const frenado = cuidarLosFlaps(ARAI, aliviados, {
      ...EN_EL_AIRE,
      kt: 165,
      flaps: 2 / 3,
      palanca: 1,
      dt: DT,
    });
    expect(frenado.aliviados).toBe(false);
    expect(hastaDondeBajan(frenado)).toBe(1);
  });

  it("por debajo de la placa no hace nada", () => {
    const c = durante(ARAI, 5, { ...EN_EL_AIRE, kt: 170, flaps: 1, palanca: 1 });
    expect(c).toEqual(FLAPS_SANOS);
  });

  it("y solo cuida los de aterrizaje: con la primera muesca a 173 nudos, nada", () => {
    // El caso de la captura: la primera muesca aguanta 250.
    const c = durante(ARAI, 5, {
      ...EN_EL_AIRE,
      kt: 173,
      flaps: 1 / 3,
      palanca: 1 / 3,
    });
    expect(c).toEqual(FLAPS_SANOS);
  });

  it("un reactor no se queda con los flaps tocados: se protege solo", () => {
    const c = durante(ARAI, 20, {
      ...EN_EL_AIRE,
      kt: 280,
      flaps: 1 / 3,
      palanca: 1 / 3,
    });
    expect(c.tocados).toBe(false);
  });
});

describe("una avioneta que abusa", () => {
  it("rozar la placa no rompe nada", () => {
    // 85 es la placa de los de aterrizaje del JAZ 20. Noventa es rozarla.
    const c = durante(PYKASU, 30, {
      ...EN_EL_AIRE,
      kt: 90,
      flaps: 1,
      palanca: 1,
    });
    expect(c.tocados).toBe(false);
  });

  it("pero pasarse de largo un rato los deja tocados, hasta la primera muesca", () => {
    const c = durante(PYKASU, AGUANTAN + 0.5, {
      ...EN_EL_AIRE,
      kt: 105,
      flaps: 1,
      palanca: 1,
    });
    expect(c.tocados).toBe(true);
    expect(hastaDondeBajan(c)).toBe(TOPE_DE_TOCADOS);
  });

  it("y el abuso se suma: dos veces un poco cuentan como una vez mucho", () => {
    const mitad = AGUANTAN / 2 + 0.2;
    const primera = durante(PYKASU, mitad, {
      ...EN_EL_AIRE,
      kt: 105,
      flaps: 1,
      palanca: 1,
    });
    const entreMedias = durante(
      PYKASU,
      10,
      { ...EN_EL_AIRE, kt: 70, flaps: 1, palanca: 1 },
      primera,
    );
    expect(entreMedias.tocados).toBe(false);
    const segunda = durante(
      PYKASU,
      mitad,
      { ...EN_EL_AIRE, kt: 105, flaps: 1, palanca: 1 },
      entreMedias,
    );
    expect(segunda.tocados).toBe(true);
  });

  it("no hay alivio: la avioneta no sube nada sola", () => {
    const c = durante(PYKASU, 1, { ...EN_EL_AIRE, kt: 100, flaps: 1, palanca: 1 });
    expect(c.aliviados).toBe(false);
  });

  it("y en tierra y parado, los mira el mecánico y vuelven a estar sanos", () => {
    const tocados = durante(PYKASU, AGUANTAN + 1, {
      ...EN_EL_AIRE,
      kt: 105,
      flaps: 1,
      palanca: 1,
    });
    // Rodando por la pista, todavía no: volver a tierra es pararse.
    const rodando = cuidarLosFlaps(PYKASU, tocados, {
      kt: 40,
      flaps: 1 / 3,
      palanca: 1,
      paradoEnTierra: false,
      dt: DT,
    });
    expect(rodando.tocados).toBe(true);
    const parado = cuidarLosFlaps(PYKASU, tocados, {
      kt: 0,
      flaps: 1 / 3,
      palanca: 1,
      paradoEnTierra: true,
      dt: DT,
    });
    expect(parado).toEqual(FLAPS_SANOS);
  });
});

describe("el que no lleva flaps", () => {
  it("no tiene nada que cuidar", () => {
    const fumigador = aircraftById("jaz-25");
    const c = durante(fumigador, 10, {
      ...EN_EL_AIRE,
      kt: 200,
      flaps: 1,
      palanca: 1,
    });
    expect(c).toEqual(FLAPS_SANOS);
  });
});

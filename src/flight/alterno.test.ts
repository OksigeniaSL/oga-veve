/**
 * El alternativo y la carga para un destino con nombre.
 *
 * Lo que se comprueba es lo que haría un despacho de verdad con los campos de
 * Canarias puestos donde están: que el alternativo es el vecino más cercano al
 * destino, que puede ser el de salida, y que la carga crece con la ruta que se
 * elige y no con la más lejana que se pudiera elegir.
 */

import { describe, expect, it } from "vitest";
import {
  aDondeConLaReserva,
  camposDeLaRuta,
  elAlterno,
  elMasCercano,
  tramosDelPlan,
  type CampoDelVuelo,
} from "./alterno";
import {
  cargaParaElPlan,
  cargaParaLaRuta,
  loQueCabe,
  quemaPorSegundo,
  RESERVA_SEGUNDOS,
} from "./combustible";
import { aircraftById } from "./aircraft";
import { dondeCae } from "../world/entre-aerodromos";
import { scenarioById, destinosDe } from "../world/scenarios";

/** Los campos de un vuelo que sale de `id`, puestos en metros de su mundo. */
function camposDesde(id: string): CampoDelVuelo[] {
  const casa = scenarioById(id);
  return camposDeLaRuta(casa, destinosDe(casa).map(scenarioById));
}

const porId = (campos: readonly CampoDelVuelo[], id: string) =>
  campos.find((c) => c.id === id)!;

describe("el alternativo", () => {
  const campos = camposDesde("gran-canaria");

  it("de Gran Canaria a Fuerteventura, es Lanzarote", () => {
    expect(elAlterno(porId(campos, "fuerteventura"), campos)?.id).toBe(
      "lanzarote",
    );
  });

  it("y de Gran Canaria a Tenerife Norte, es Tenerife Sur", () => {
    expect(elAlterno(porId(campos, "tenerife-norte"), campos)?.id).toBe(
      "tenerife-sur",
    );
  });

  it("nunca es el propio destino", () => {
    for (const c of campos) expect(elAlterno(c, campos)?.id).not.toBe(c.id);
  });

  it("puede ser el campo de salida", () => {
    // Desde Tenerife Sur el único destino es el Norte, y el campo más
    // cercano a él es el Sur: se vuelve a casa, que es lo que se haría.
    const desdeElSur = camposDesde("tenerife-sur");
    expect(elAlterno(porId(desdeElSur, "tenerife-norte"), desdeElSur)?.id).toBe(
      "tenerife-sur",
    );
  });

  it("y sin otro campo en el vuelo, no hay", () => {
    const solo = [{ id: "valle-cordillera", x: 0, z: 0 }];
    expect(elAlterno(solo[0]!, solo)).toBeNull();
  });
});

describe("la carga para un destino", () => {
  const PYKASU = aircraftById("jaz-20");
  const ARASUNU = aircraftById("jaz-60");
  const campos = camposDesde("gran-canaria");
  const casa = porId(campos, "gran-canaria");
  const crucero = (a: typeof PYKASU) => quemaPorSegundo(a, a.maxThrust / 3);

  it("son los dos tramos, la maniobra y la reserva, y nada más", () => {
    const tramos = tramosDelPlan(casa, porId(campos, "fuerteventura"), campos);
    const segundos =
      (tramos.alDestino + tramos.alAlterno) / ARASUNU.cruiseSpeed +
      30 * 60 +
      RESERVA_SEGUNDOS;
    expect(cargaParaElPlan(ARASUNU, tramos)).toBeCloseTo(
      Math.min(loQueCabe(ARASUNU), crucero(ARASUNU) * segundos),
      3,
    );
  });

  it("ir más lejos carga más: Lanzarote pesa más que Tenerife Norte", () => {
    const aLanzarote = cargaParaElPlan(
      ARASUNU,
      tramosDelPlan(casa, porId(campos, "lanzarote"), campos),
    );
    const aTenerife = cargaParaElPlan(
      ARASUNU,
      tramosDelPlan(casa, porId(campos, "tenerife-norte"), campos),
    );
    expect(aLanzarote).toBeGreaterThan(aTenerife);
  });

  it("y la vuelta al campo es la carga de un vuelo local", () => {
    const local = tramosDelPlan(casa, casa, campos);
    expect(local).toEqual({ alDestino: 0, alAlterno: 0, alterno: null });
    expect(cargaParaElPlan(PYKASU, local)).toBe(cargaParaLaRuta(PYKASU, 0));
  });

  it("con el tope de lo que cabe", () => {
    const lejisimos = { alDestino: 5e6, alAlterno: 1e6 };
    expect(cargaParaElPlan(PYKASU, lejisimos)).toBe(loQueCabe(PYKASU));
  });

  it("y cargar para el destino es menos que el ida y vuelta al más lejano", () => {
    // Lo que se cargaba antes: ida y vuelta al vecino más lejano, fuera cual
    // fuera el elegido. A Tenerife Norte eso eran trescientos kilómetros de
    // más para una ruta de noventa.
    let lejos = 0;
    for (const c of campos)
      lejos = Math.max(lejos, Math.hypot(c.x - casa.x, c.z - casa.z));
    const antes = cargaParaLaRuta(ARASUNU, lejos * 2);
    const ahora = cargaParaElPlan(
      ARASUNU,
      tramosDelPlan(casa, porId(campos, "tenerife-norte"), campos),
    );
    expect(ahora).toBeLessThan(antes);
  });
});

describe("con la reserva empezada", () => {
  const campos: CampoDelVuelo[] = [
    { id: "casa", x: 0, z: 0 },
    { id: "destino", x: 100000, z: 0 },
    { id: "alterno", x: 100000, z: 40000 },
  ];
  const alterno = porId(campos, "alterno");

  it("se va al alternativo si es lo más cercano", () => {
    expect(aDondeConLaReserva(95000, 30000, alterno, campos)?.id).toBe(
      "alterno",
    );
  });

  it("pero si el destino está más cerca, se sigue al destino", () => {
    expect(aDondeConLaReserva(97000, 0, alterno, campos)?.id).toBe("destino");
  });

  it("y a mitad de camino de vuelta, a casa", () => {
    expect(aDondeConLaReserva(10000, 0, alterno, campos)?.id).toBe("casa");
  });

  it("y sin alternativo, el más cercano", () => {
    expect(aDondeConLaReserva(10000, 0, null, campos)?.id).toBe(
      elMasCercano(10000, 0, campos)?.id,
    );
  });
});

describe("los campos de la ruta", () => {
  it("caen donde los pone el mundo vecino", () => {
    // La misma cuenta que `MundoVecino.desplazamiento`: el origen de cada
    // aeródromo, corrido, más la pista de su escenario.
    const casa = scenarioById("gran-canaria");
    const norte = scenarioById("tenerife-norte");
    const o = dondeCae(casa.aerodrome!.origin, norte.aerodrome!.origin);
    const campo = camposDeLaRuta(casa, [norte])[1]!;
    expect(campo.x).toBeCloseTo(o.x + norte.runway.x, 6);
    expect(campo.z).toBeCloseTo(o.z + norte.runway.z, 6);
  });

  it("y el primero es siempre el de salida", () => {
    const casa = scenarioById("valle-cordillera");
    expect(camposDeLaRuta(casa, []).map((c) => c.id)).toEqual([
      "valle-cordillera",
    ]);
  });
});

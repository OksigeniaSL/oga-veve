/**
 * La tarjeta de un vuelo a otro campo dibuja los dos aeródromos.
 *
 * El plano del final y el de la bitácora dibujaban solo el aeródromo de casa,
 * así que un vuelo de Gran Canaria a Los Rodeos salía como Gando y una raya
 * que se acababa en blanco donde tenía que estar el aeropuerto de llegada.
 */

import { describe, expect, it } from "vitest";
import { losOtrosCampos } from "./cuaderno";
import { plano } from "./hangar";
import { GRAN_CANARIA } from "../world/scenarios";
import type { Vuelo } from "../flight/bitacora";

const ida: Vuelo = {
  fecha: "2026-09-26T10:00:00.000Z",
  escenario: "gran-canaria",
  llegada: "tenerife-norte",
  leccion: "despegue",
  tramo: "guyrami",
  segundos: 900,
  galones: [],
  traza: [
    [0, 0],
    [-95000, 61800],
  ],
};

describe("los otros campos de un vuelo", () => {
  it("el de llegada, corrido hasta donde cae visto desde casa", () => {
    const otros = losOtrosCampos(ida);
    expect(otros).toHaveLength(1);
    const pista = otros[0]!.runways[0]!.centerline[0]!;
    // Los Rodeos cae a unos ciento trece kilómetros al oeste-noroeste de
    // Gando: en el fichero, la X negativa y la Y positiva (al norte).
    expect(pista[0]).toBeLessThan(-90_000);
    expect(pista[1]).toBeGreaterThan(55_000);
  });

  it("un vuelo en casa no trae ninguno", () => {
    expect(losOtrosCampos({ ...ida, llegada: undefined })).toEqual([]);
    expect(losOtrosCampos({ ...ida, llegada: "gran-canaria" })).toEqual([]);
  });

  it("y el plano los dibuja: más pistas que las de casa", () => {
    const solo = plano(GRAN_CANARIA, 0, ida.traza);
    const con = plano(GRAN_CANARIA, 0, ida.traza, losOtrosCampos(ida));
    const pistas = (svg: string) => svg.split('class="plano__pista"').length - 1;
    expect(pistas(con)).toBeGreaterThan(pistas(solo));
  });
});

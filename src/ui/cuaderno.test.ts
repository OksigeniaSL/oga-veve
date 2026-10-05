/**
 * La tarjeta de un vuelo a otro campo dibuja los dos aeródromos.
 *
 * El plano del final y el de la bitácora dibujaban solo el aeródromo de casa,
 * así que un vuelo de Gran Canaria a Los Rodeos salía como Gando y una raya
 * que se acababa en blanco donde tenía que estar el aeropuerto de llegada.
 */

import { describe, expect, it } from "vitest";
import { enPuntos, losOtrosCampos } from "./cuaderno";
import { dibujarRelojEnFilas } from "./reloj";
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

/*
 * **Las cuentas y las horas, sin cifras** para el peldaño que no lee: puntos
 * que se cuentan con el dedo y avioncitos en filas. Ver el 131 de la lista.
 */
describe("el cuaderno sin letras", () => {
  it("una cuenta en puntos: uno por cada una y una estrella por cada diez", () => {
    expect(enPuntos(0)).toBe("");
    const doce = enPuntos(12);
    expect(doce.split("puntos__estrella").length - 1).toBe(1);
    expect(doce.split('class="puntos__punto"').length - 1).toBe(2);
    // Y ni una cifra dentro del dibujo: los números de los atributos no se ven.
    expect(doce.replace(/<[^>]*>/g, "").trim()).toBe("");
  });

  it("lo que falta, en puntos vacíos", () => {
    expect(enPuntos(3, true)).toContain("puntos__punto--hueco");
  });

  it("las horas, en avioncitos y sin un número escrito", () => {
    const svg = dibujarRelojEnFilas(3 * 3600 + 600, "horas");
    expect(svg.split('class="reloj__avion"').length - 1).toBe(6);
    expect(svg).not.toContain("<text");
    // Más de lo que cabe: un «más» dibujado, no una cifra.
    const muchas = dibujarRelojEnFilas(40 * 3600, "horas");
    expect(muchas).toContain("reloj__mas");
    expect(muchas).not.toContain("<text");
  });
});

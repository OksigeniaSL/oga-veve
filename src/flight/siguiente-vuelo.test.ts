/**
 * El vuelo siguiente: una ruta de verdad, a la que el avión llega, y sin volver
 * por donde se vino mientras haya otra. Ver `siguiente-vuelo.ts`.
 */
import { describe, expect, it } from "vitest";
import { aircraftById } from "./aircraft";
import { SCENARIOS } from "../world/scenarios";
import { cabeEn, campoDe } from "./cabe";
import { elSiguienteVuelo, rutasDesdeAqui } from "./siguiente-vuelo";

const esc = (id: string) => SCENARIOS.find((e) => e.id === id)!;
const JAZ_60 = aircraftById("jaz-60");
const JAZ_120 = aircraftById("jaz-120");

describe("el vuelo siguiente", () => {
  it("de El Hierro a La Gomera con el JAZ 60, se sigue hacia Tenerife y no se vuelve", () => {
    for (let hora = 0; hora < 24; hora++) {
      const s = elSiguienteVuelo({
        aqui: esc("la-gomera"),
        vinoDe: "el-hierro",
        avion: JAZ_60,
        escenarios: SCENARIOS,
        hora,
        ultimo: null,
      });
      expect(["tenerife-norte", "tenerife-sur"]).toContain(s?.id);
    }
  });

  it("no propone lo mismo que la última vez, si hay otra ruta", () => {
    for (let hora = 0; hora < 24; hora++) {
      const p = {
        aqui: esc("la-gomera"),
        vinoDe: "el-hierro",
        avion: JAZ_60,
        escenarios: SCENARIOS,
        hora,
      };
      const primero = elSiguienteVuelo({ ...p, ultimo: null })!;
      const segundo = elSiguienteVuelo({ ...p, ultimo: primero.id })!;
      expect(segundo.id).not.toBe(primero.id);
    }
  });

  it("la ruta y la hora cambian la propuesta: no es siempre la misma", () => {
    const vistas = new Set<string>();
    for (let hora = 0; hora < 24; hora++)
      vistas.add(
        elSiguienteVuelo({
          aqui: esc("la-gomera"),
          vinoDe: "el-hierro",
          avion: JAZ_60,
          escenarios: SCENARIOS,
          hora,
          ultimo: null,
        })!.id,
      );
    expect(vistas.size).toBeGreaterThan(1);
  });

  it("con una sola ruta, se ofrece aunque sea volver", () => {
    const s = elSiguienteVuelo({
      aqui: esc("el-hierro"),
      vinoDe: "la-palma",
      avion: JAZ_60,
      escenarios: SCENARIOS,
      hora: 10,
      ultimo: "la-gomera",
    });
    // Desde El Hierro salen La Gomera y La Palma: sin volver, solo La Gomera,
    // aunque fuera lo de la última vez. Mejor repetir que callar.
    expect(s?.id).toBe("la-gomera");
  });

  it("solo ofrece campos donde el avión cabe, en todo el mapa y con toda la flota", () => {
    for (const aqui of SCENARIOS) {
      for (const avion of [JAZ_60, JAZ_120]) {
        for (const destino of rutasDesdeAqui({ aqui, avion, escenarios: SCENARIOS }))
          expect(cabeEn(avion, campoDe(destino)).cabe).toBe(true);
      }
    }
  });

  it("y si de aquí no sale ninguna ruta para este avión, no propone nada", () => {
    // El JAZ 120 no cabe en las pistas de El Hierro, La Gomera ni La Palma.
    expect(
      elSiguienteVuelo({
        aqui: esc("el-hierro"),
        vinoDe: null,
        avion: JAZ_120,
        escenarios: SCENARIOS,
        hora: 12,
        ultimo: null,
      }),
    ).toBeNull();
  });
});

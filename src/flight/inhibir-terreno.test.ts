import { describe, expect, it } from "vitest";
import {
  DESDE_LA_ALTURA,
  fueraDeLaBase,
  MK_VI,
  queToca,
  RADIO_DEL_PROCEDIMIENTO,
  type LecturaDelInhibidor,
} from "./inhibir-terreno";
import { AIRCRAFT } from "./aircraft";
import { loHaceQuienVaAlLado, PELDANOS } from "./escalera";

/** Una pista recta de este largo, como la escribe el fichero del aeródromo. */
const pista = (largo: number) => ({
  ref: "15/33",
  widthM: 18,
  surface: "grass",
  lit: false,
  centerline: [
    [0, 0],
    [0, -largo],
  ] as [number, number][],
  thresholds: {},
  magneticVariation: null,
});

const volando: LecturaDelInhibidor = {
  inhibido: false,
  enVuelo: true,
  sobreElSuelo: 300,
  llegadaFueraDeLaBase: 10_000,
  delCampoApagado: null,
};

describe("TERR INHIBIT", () => {
  it("la base del MK VI lleva las pistas de dos mil pies o más", () => {
    expect(MK_VI.pistaMasCortaDeLaBase).toBeCloseTo(609.6, 1);
  });

  it("un campo privado está fuera de la base, aunque su pista sea larga", () => {
    expect(fueraDeLaBase({ privado: true, runways: [pista(900)] }, MK_VI)).toBe(true);
  });

  it("uno publicado, dentro si alguna pista llega al mínimo de la base", () => {
    expect(fueraDeLaBase({ runways: [pista(900)] }, MK_VI)).toBe(false);
    expect(fueraDeLaBase({ runways: [pista(400), pista(1800)] }, MK_VI)).toBe(false);
    expect(fueraDeLaBase({ runways: [pista(500)] }, MK_VI)).toBe(true);
  });

  it("sin el fichero del aeródromo no se sabe, y no se enseña", () => {
    expect(fueraDeLaBase(null, MK_VI)).toBe(false);
    expect(fueraDeLaBase(undefined, MK_VI)).toBe(false);
  });

  it("se apaga volando dentro de las quince millas de un campo fuera de la base", () => {
    expect(queToca(volando)).toBe("inhibir");
    expect(queToca({ ...volando, llegadaFueraDeLaBase: RADIO_DEL_PROCEDIMIENTO + 1 })).toBeNull();
  });

  it("y nunca en un campo que el equipo conoce", () => {
    expect(queToca({ ...volando, llegadaFueraDeLaBase: null })).toBeNull();
  });

  it("ni en tierra, ni despegando: por debajo de quinientos pies, nada", () => {
    expect(queToca({ ...volando, enVuelo: false })).toBeNull();
    expect(queToca({ ...volando, sobreElSuelo: DESDE_LA_ALTURA - 1 })).toBeNull();
  });

  it("apagado, se queda así en el circuito, y se enciende al salir de las quince millas", () => {
    const apagado = { ...volando, inhibido: true, delCampoApagado: 5_000 };
    expect(queToca(apagado)).toBeNull();
    // Rodando o en la toma de la granja, también: se enciende a mano.
    expect(queToca({ ...apagado, enVuelo: false, sobreElSuelo: 0 })).toBeNull();
    expect(queToca({ ...apagado, delCampoApagado: RADIO_DEL_PROCEDIMIENTO + 1 })).toBe("restablecer");
  });

  it("lo lleva el Tujuju, con su MK VI, y ningún otro sin fuente", () => {
    const con = AIRCRAFT.filter((a) => a.terrInhibit).map((a) => a.id);
    expect(con).toEqual(["jaz-50"]);
    // Y solo un avión con avisador que habla puede tener su botón.
    for (const a of AIRCRAFT.filter((x) => x.terrInhibit)) expect(a.avisosHablados, a.id).toBe(true);
  });

  it("en los tres peldaños de abajo lo pulsa quien va al lado; en el de cabina, quien vuela", () => {
    expect(PELDANOS.map(loHaceQuienVaAlLado)).toEqual([true, true, true, false]);
  });
});

/**
 * Las gafas de sol, comprobadas donde se pueden estropear.
 *
 * Que es en dos sitios: al ganarlas —una vez y no cada vez— y al leerlas de un
 * guardado que puede decir cualquier cosa.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { olvidar, ponerProgreso } from "../datos/guardado";
import {
  DESLUMBRE,
  ganarGafas,
  lasGana,
  leerGafas,
  ponerseLasGafas,
  SIN_GAFAS,
} from "./gafas";

const memoria = new Map<string, string>();
const almacen: Storage = {
  getItem: (k) => memoria.get(k) ?? null,
  setItem: (k, v) => void memoria.set(k, String(v)),
  removeItem: (k) => void memoria.delete(k),
  clear: () => memoria.clear(),
  key: (i) => [...memoria.keys()][i] ?? null,
  get length() {
    return memoria.size;
  },
};
vi.stubGlobal("localStorage", almacen);

beforeEach(() => {
  memoria.clear();
  olvidar();
});

describe("ganarlas", () => {
  it("de entrada no se tienen", () => {
    expect(leerGafas()).toEqual(SIN_GAFAS);
  });

  /*
   * **Una vez, y no cada vez.**
   *
   * Es lo que separa el momento del estado. El momento se celebra —suena, se
   * dice, sale su dibujo— y el estado no se celebra nunca más: sin esto, cada
   * aterrizaje bueno del resto de la vida sería una fiesta por unas gafas que
   * ya se llevan puestas.
   */
  it("se ganan una sola vez", () => {
    expect(ganarGafas()).toBe(true);
    expect(ganarGafas()).toBe(false);
    expect(ganarGafas()).toBe(false);
  });

  it("y al ganarlas ya vienen puestas", () => {
    // Un premio que hay que ir a activar a un menú no es un premio.
    ganarGafas();
    expect(leerGafas()).toEqual({ ganadas: true, puestas: true });
  });

  it("se quitan y se vuelven a poner, y eso se recuerda", () => {
    ganarGafas();
    ponerseLasGafas(false);
    expect(leerGafas()).toEqual({ ganadas: true, puestas: false });
    ponerseLasGafas(true);
    expect(leerGafas().puestas).toBe(true);
  });

  /*
   * **Y no se pueden llevar sin tenerlas.**
   *
   * Un guardado a medio escribir, o traído de otro perfil, no puede dejar a
   * alguien con el mundo teñido de ámbar y sin botón para quitárselo — porque
   * el botón no sale hasta que están ganadas.
   */
  it("puestas sin ganar no cuenta como puestas", () => {
    ponerProgreso("gafas.puestas", true);
    expect(leerGafas()).toEqual(SIN_GAFAS);
  });
});

describe("qué aterrizaje las gana", () => {
  /*
   * La misma regla que el galón de la toma, a propósito: firme es como se
   * posa un avión, no un fallo. Tener dos definiciones de «aterrizar bien»
   * sería tener una equivocada.
   */
  it("suave y firme sí; rápido, fuera y ninguno, no", () => {
    expect(lasGana("suave")).toBe(true);
    expect(lasGana("firme")).toBe(true);
    expect(lasGana("rapido")).toBe(false);
    expect(lasGana("fuera")).toBe(false);
    expect(lasGana(null)).toBe(false);
  });
});

describe("el deslumbre", () => {
  it("las gafas lo bajan, pero no lo apagan", () => {
    // Apagarlo del todo quitaría la hora del día, que es la mitad de lo que
    // el cielo está contando. Ver `world/sky.ts`.
    expect(DESLUMBRE.sin).toBe(1);
    expect(DESLUMBRE.con).toBeGreaterThan(0);
    expect(DESLUMBRE.con).toBeLessThan(0.6);
  });
});

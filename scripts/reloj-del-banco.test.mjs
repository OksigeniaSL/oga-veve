/**
 * **El banco vuela a tiempo real donde las voces tienen una ventana**: la
 * carrera, siempre, y el rodaje de salida donde hay megafonía. Ver
 * `reloj-del-banco.mjs`.
 */
import { describe, expect, it } from "vitest";
import { aTiempoReal, fasesATiempoReal } from "./reloj-del-banco.mjs";

describe("el reloj del banco del vuelo entero", () => {
  it("la carrera de despegue, a tiempo real en cualquier avión", () => {
    for (const fase of ["autorizado", "back-taxi", "alineando", "despegando", "comprometido"]) {
      expect(aTiempoReal(fase, false)).toBe(true);
      expect(aTiempoReal(fase, true)).toBe(true);
    }
  });

  /*
   * De Gran Canaria a Los Rodeos con el JAZ 90, a ×3: sesenta y cuatro
   * segundos de rodaje en veintiuno de pared, y la bienvenida de Jazlyn se
   * quedó detrás de la torre hasta retirarse en la carrera.
   */
  it("y con megafonía, también del puesto a la doble raya: la ventana de Jazlyn", () => {
    for (const fase of ["estacionado", "arrancando", "rodando", "esperando"])
      expect(aTiempoReal(fase, true)).toBe(true);
  });

  it("sin megafonía el rodaje sigue acelerado, y en el aire nadie va a uno", () => {
    expect(aTiempoReal("rodando", false)).toBe(false);
    expect(aTiempoReal("esperando", false)).toBe(false);
    for (const fase of ["en-vuelo", "final", "aterrizado", "abandonando", "a-plataforma"]) {
      expect(aTiempoReal(fase, true)).toBe(false);
      expect(aTiempoReal(fase, false)).toBe(false);
    }
  });

  it("y la tabla que va a la página dice lo mismo", () => {
    expect(fasesATiempoReal(true)).toContain("rodando");
    expect(fasesATiempoReal(false)).not.toContain("rodando");
    expect(fasesATiempoReal(false)).toContain("despegando");
  });
});

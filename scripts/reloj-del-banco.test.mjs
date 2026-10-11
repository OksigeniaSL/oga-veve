/**
 * **El banco vuela a tiempo real donde las voces tienen una ventana**: la
 * carrera, siempre, y donde hay megafonía, el rodaje de salida y el de
 * llegada. Ver `reloj-del-banco.mjs`.
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

  /*
   * De Los Rodeos a Gando con el JAZ 90, a ×3: cuarenta segundos de rodaje de
   * vuelta en trece de pared, con los dos anuncios de la llegada ocupando
   * unos veinte. La lista de después del aterrizaje no leyó ningún punto y la
   * frecuencia de Gando no encontró el canal libre.
   */
  it("y con megafonía, también de dejar la pista al puesto: la ventana de la llegada", () => {
    for (const fase of ["abandonando", "a-plataforma", "en-puesto"]) {
      expect(aTiempoReal(fase, true)).toBe(true);
      expect(aTiempoReal(fase, false)).toBe(false);
    }
  });

  it("sin megafonía el rodaje sigue acelerado, y en el aire nadie va a uno", () => {
    expect(aTiempoReal("rodando", false)).toBe(false);
    expect(aTiempoReal("esperando", false)).toBe(false);
    for (const fase of ["en-vuelo", "final", "aterrizado"]) {
      expect(aTiempoReal(fase, true)).toBe(false);
      expect(aTiempoReal(fase, false)).toBe(false);
    }
  });

  it("y la tabla que va a la página dice lo mismo", () => {
    expect(fasesATiempoReal(true)).toContain("rodando");
    expect(fasesATiempoReal(true)).toContain("a-plataforma");
    expect(fasesATiempoReal(false)).not.toContain("a-plataforma");
    expect(fasesATiempoReal(false)).not.toContain("rodando");
    expect(fasesATiempoReal(false)).toContain("despegando");
  });
});

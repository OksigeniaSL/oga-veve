/**
 * Que la radio que se oye sea la de la dependencia en la que se está. Ver
 * `flight/dependencia.ts`.
 */
import { describe, expect, it } from "vitest";
import {
  dependenciaDe,
  seOyeElCampo,
  SALIR_DE_LA_ZONA,
  ZONA_DE_LA_TORRE,
  type DondeEscucha,
} from "./dependencia";

const AQUI: DondeEscucha = {
  fase: "en-vuelo",
  enTierra: false,
  millas: 2,
  pies: 1500,
  esElDeSalida: true,
};

describe("la dependencia de cada momento del vuelo", () => {
  it("rodando por la plataforma, tierra; del punto de espera a la pista, torre", () => {
    for (const fase of ["estacionado", "arrancando", "rodando", "abandonando", "a-plataforma"])
      expect(dependenciaDe({ ...AQUI, fase, enTierra: true, millas: 0, pies: 0 })).toBe("tierra");
    for (const fase of ["esperando", "autorizado", "alineando", "despegando", "aterrizado"])
      expect(dependenciaDe({ ...AQUI, fase, enTierra: true, millas: 0, pies: 0 })).toBe("torre");
  });

  it("en el circuito y en la final, torre", () => {
    expect(dependenciaDe(AQUI)).toBe("torre");
    expect(dependenciaDe({ ...AQUI, fase: "final", millas: 6, pies: 1900 })).toBe("torre");
  });

  it("saliendo de la zona: salida; lejos: control; llegando al otro: aproximación", () => {
    expect(dependenciaDe({ ...AQUI, millas: 14, pies: 6000 })).toBe("salida");
    expect(dependenciaDe({ ...AQUI, millas: 45, pies: 24000 })).toBe("control");
    expect(
      dependenciaDe({ ...AQUI, millas: 20, pies: 8000, esElDeSalida: false }),
    ).toBe("aproximacion");
    // Y de vuelta a la zona del campo de llegada, otra vez torre.
    expect(
      dependenciaDe({ ...AQUI, millas: 8, pies: 2500, esElDeSalida: false }),
    ).toBe("torre");
  });

  it("a veinticuatro mil pies no se oye la torre de salida (la 132)", () => {
    const d = dependenciaDe({ ...AQUI, millas: 25, pies: 24000 });
    expect(seOyeElCampo(d)).toBe(false);
  });

  it("y en el borde no salta: para salir hay que pasar de once millas o de 4500 ft", () => {
    const enElBorde = { ...AQUI, millas: ZONA_DE_LA_TORRE.millas + 0.5 };
    // Viniendo de fuera, a diez millas y media, todavía no se entra.
    expect(dependenciaDe(enElBorde, "salida")).toBe("salida");
    // Y viniendo de dentro, a diez y media, todavía no se sale.
    expect(dependenciaDe(enElBorde, "torre")).toBe("torre");
    expect(
      dependenciaDe({ ...AQUI, millas: SALIR_DE_LA_ZONA.millas + 0.1 }, "torre"),
    ).toBe("salida");
    expect(
      dependenciaDe({ ...AQUI, pies: SALIR_DE_LA_ZONA.pies + 10 }, "torre"),
    ).toBe("salida");
  });

  it("solo en tierra y en torre se oye el campo", () => {
    expect(["tierra", "torre", "salida", "control", "aproximacion"].map((d) =>
      seOyeElCampo(d as Parameters<typeof seOyeElCampo>[0]),
    )).toEqual([true, true, false, false, false]);
  });
});

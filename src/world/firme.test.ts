/**
 * El firme de cada campo, comprobado: de qué está hecho lo que se rueda según
 * su fichero, y cómo de gastado según la regla —que es una regla, dicha en la
 * cabecera de `firme.ts`, y no un dato inventado de ningún sitio—.
 */

import { describe, expect, it } from "vitest";
import { estadoDe, firmeEn, FIRMES, materialDe } from "./firme";
import { SCENARIOS, scenarioById } from "./scenarios";
import type { Pavimento } from "./vegetation";

describe("de lo que dice el fichero a lo que suena", () => {
  it("el hormigón son losas, como lo escriba quien lo escriba", () => {
    for (const s of ["concrete", "CON", "Concrete", "cement"]) expect(materialDe(s)).toBe("losas");
  });

  it("el asfalto es asfalto, y lo que no dice nada también", () => {
    for (const s of ["asphalt", "ASP", "paved", null, undefined]) expect(materialDe(s)).toBe("asfalto");
  });

  it("la hierba es hierba, y la tierra y lo compactado, tierra", () => {
    expect(materialDe("grass")).toBe("hierba");
    for (const s of ["unpaved", "compacted", "dirt", "gravel"]) expect(materialDe(s)).toBe("tierra");
  });

  it("cada superficie de los ficheros del juego cae en un material conocido", () => {
    for (const e of SCENARIOS) {
      const a = e.aerodrome;
      if (!a) continue;
      for (const p of a.runways) expect(FIRMES[materialDe(p.surface)]).toBeDefined();
      for (const p of a.aprons) expect(FIRMES[materialDe(p.surface)]).toBeDefined();
    }
  });
});

describe("cuidado o gastado, por el servicio del campo", () => {
  it("con torre, cuidado; con AFIS, sin torre o privado, gastado", () => {
    expect(estadoDe({})).toBe("cuidado");
    expect(estadoDe({ afis: true })).toBe("gastado");
    expect(estadoDe({ sinTorre: true })).toBe("gastado");
    expect(estadoDe({ privado: true })).toBe("gastado");
    expect(estadoDe(null)).toBe("cuidado");
  });

  it("y lo dice el fichero de cada campo, no una lista aparte", () => {
    expect(estadoDe(scenarioById("tenerife-norte").aerodrome)).toBe("cuidado");
    expect(estadoDe(scenarioById("pettirossi").aerodrome)).toBe("cuidado");
    expect(estadoDe(scenarioById("la-gomera").aerodrome)).toBe("gastado");
    expect(estadoDe(scenarioById("ayolas").aerodrome)).toBe("gastado");
  });
});

describe("el firme debajo de las ruedas", () => {
  it("la pista de Tenerife Norte es asfalto cuidado: sin juntas", () => {
    const e = scenarioById("tenerife-norte");
    const f = firmeEn(e, null, e.runway.x, e.runway.z);
    expect(f.material).toBe("asfalto");
    expect(f.juntas).toBe(0);
  });

  it("la de Pilar es de hormigón: suena a juntas, y gastadas", () => {
    const e = scenarioById("pilar");
    const f = firmeEn(e, null, e.runway.x, e.runway.z);
    expect(f.material).toBe("losas");
    expect(f).toBe(FIRMES.losas.gastado);
  });

  it("la plataforma de Tenerife Sur es de losas aunque la pista sea de asfalto", () => {
    const e = scenarioById("tenerife-sur");
    // Fuera de la pista y sobre pavimento: lo que dice su plataforma.
    const todoPavimento = { hay: () => true } as unknown as Pavimento;
    const f = firmeEn(e, todoPavimento, e.runway.x + 3000, e.runway.z + 3000);
    expect(f.material).toBe("losas");
    expect(firmeEn(e, todoPavimento, e.runway.x, e.runway.z).material).toBe("asfalto");
  });

  it("la de Yvytu Rape es hierba, y lejos de todo es campo", () => {
    const e = scenarioById("yvytu-rape");
    expect(firmeEn(e, null, e.runway.x, e.runway.z).material).toBe("hierba");
    expect(firmeEn(e, null, e.runway.x + 5000, e.runway.z + 5000).material).toBe("campo");
  });
});

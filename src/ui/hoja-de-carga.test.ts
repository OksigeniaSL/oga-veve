/**
 * **La hoja de carga, dibujada**: lo que dice cuando el plan no cabe en los
 * depósitos. Ver `ui/hoja-de-carga.ts` y el ADR 0019, enmienda H38c.
 */

import { beforeAll, describe, expect, it, vi } from "vitest";
import { aircraftById } from "../flight/aircraft";
import { loQueCabe } from "../flight/combustible";
import { hojaDeSuFicha } from "../flight/hoja-de-carga";
import { setLocale } from "../i18n";
import { veredicto, vistaDeLaHoja, type VueloDeLaHoja } from "./hoja-de-carga";

const vuelo = (id: string, delPlan: number, peldano: VueloDeLaHoja["peldano"]): VueloDeLaHoja => {
  const avion = aircraftById(id);
  return {
    avion,
    hoja: hojaDeSuFicha(avion),
    delPlan,
    tora: 3000,
    aire: { temp: 15, qnh: 1013, cota: 0, superficie: "asfalto" },
    peldano,
  };
};

/*
 * `setLocale` le pone el idioma a la página, y aquí no hay página: se le da una
 * de mentira para ponerlo, como en `pie-de-oksigenia.test.ts`.
 */
beforeAll(() => {
  vi.stubGlobal("document", { documentElement: {} });
  setLocale("es-PY");
  vi.unstubAllGlobals();
});

describe("cuando el plan no cabe en los depósitos", () => {
  it("no sale: el sello ámbar y el arreglo es otro destino, en todos los peldaños", () => {
    const a = aircraftById("jaz-40");
    for (const peldano of ["dibujo", "palabra", "cifra", "cabina"] as const) {
      const v = vuelo("jaz-40", loQueCabe(a) + 35, peldano);
      expect(veredicto(v).pesada.llega).toBe(false);
      const html = vistaDeLaHoja(v);
      expect(html, peldano).toContain("hoja__veredicto--no");
      expect(html, peldano).toContain('data-pantalla="adonde"');
      // Ni bajar gente ni dejar de llenar lo arreglan.
      expect(html, peldano).not.toContain("data-hoja-quitar");
      expect(html, peldano).not.toContain('data-hoja-llenos="0"');
    }
  });

  it("y lo dice como lo que es: no llega con la reserva", () => {
    const a = aircraftById("jaz-40");
    expect(vistaDeLaHoja(vuelo("jaz-40", loQueCabe(a) + 35, "palabra"))).toContain("No llega");
    expect(vistaDeLaHoja(vuelo("jaz-40", loQueCabe(a) + 35, "cifra"))).toContain("No llega con la reserva");
  });

  it("con lo que cabe, como siempre", () => {
    const a = aircraftById("jaz-40");
    const v = vuelo("jaz-40", loQueCabe(a) - 60, "cifra");
    expect(veredicto(v).pesada.llega).toBe(true);
    expect(vistaDeLaHoja(v)).not.toContain("No llega");
  });
});

/**
 * El aviso de aves en la final: solo arriba, una vez por cosa, y la maniobra
 * que no parece. Ver `aviso-de-aves.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  AvesEnLaFinal,
  avisoDeLaTorre,
  deFrente,
  hayAvesEnLaFinal,
  sitioEnLaFinal,
  type MomentoDeAves,
} from "./aviso-de-aves";

const PIE = 0.3048;

function momento(cambios: Partial<MomentoDeAves> = {}): MomentoDeAves {
  return {
    tramo: "taguato",
    campo: "tenerife-norte",
    hayTorre: true,
    enFinal: true,
    enElSuelo: false,
    alUmbral: 8000,
    velocidad: 70,
    dado: 0,
    bandadas: [],
    avion: { x: 0, y: 400, z: 0, rumbo: 0 },
    ...cambios,
  };
}

describe("las aves en la final", () => {
  it("solo en los dos peldaños de arriba: nunca en Guyrami ni en Tukã", () => {
    expect(hayAvesEnLaFinal("guyrami")).toBe(false);
    expect(hayAvesEnLaFinal("tuka")).toBe(false);
    expect(hayAvesEnLaFinal("taguato")).toBe(true);
    expect(hayAvesEnLaFinal("taguato-ruvicha")).toBe(true);
    for (const tramo of ["guyrami", "tuka"] as const)
      expect(new AvesEnLaFinal().paso(momento({ tramo }))).toBeNull();
  });

  it("sin torre ni AFIS que avise no hay aviso, ni bandada que avisar", () => {
    expect(new AvesEnLaFinal().paso(momento({ hayTorre: false }))).toBeNull();
  });

  /*
   * Donde de verdad se juntan aves y aviones: cerca del campo y por debajo de
   * mil pies. Y por delante del avión lo bastante para verlas venir.
   */
  it("se ponen cerca del umbral, bajo los mil pies y por delante del avión", () => {
    for (const [alUmbral, velocidad] of [
      [2000, 33],
      [3400, 40],
      [5000, 70],
      [9000, 70],
      [20000, 120],
    ] as const) {
      const sitio = sitioEnLaFinal(alUmbral, velocidad)!;
      expect(sitio).not.toBeNull();
      expect(sitio.distancia).toBeLessThanOrEqual(3200);
      // Medio minuto de vuelo por delante, o un kilómetro como poco.
      expect(alUmbral - sitio.distancia).toBeGreaterThanOrEqual(
        Math.min(3000, Math.max(1000, velocidad * 30)) - 1,
      );
      expect(sitio.altura).toBeLessThan(1000 * PIE);
      // Un poco por debajo de la senda de 3°: subiendo, se pasa por encima.
      const senda = sitio.distancia * Math.tan((3 * Math.PI) / 180) + 15;
      expect(sitio.altura).toBeLessThan(senda);
      expect(sitio.altura).toBeGreaterThan(senda - 30);
    }
    // Ya muy cerca no hay sitio: no se sacan de la manga delante del morro.
    expect(sitioEnLaFinal(1500, 33)).toBeNull();
    expect(sitioEnLaFinal(2600, 70)).toBeNull();
  });

  it("el dado se tira una vez por campo, al entrar en final", () => {
    const aviso = new AvesEnLaFinal();
    expect(aviso.paso(momento({ dado: 0.9 }))).toBeNull();
    // La segunda vez ya no se tira, aunque ahora saliera.
    expect(aviso.paso(momento({ dado: 0 }))).toBeNull();
    expect(new AvesEnLaFinal().paso(momento({ dado: 0.1 }))?.que).toBe("poner");
  });

  it("la torre avisa una vez por bandada, y el «subí» una vez por pasada", () => {
    const aviso = new AvesEnLaFinal();
    const bandada = { id: "b", x: 0, y: 400, z: -600 };
    expect(aviso.paso(momento()))?.toBeTruthy();
    expect(aviso.paso(momento({ bandadas: [bandada] }))).toEqual({
      que: "torre",
      bandada: "b",
    });
    expect(aviso.paso(momento({ bandadas: [bandada] }))).toEqual({
      que: "deFrente",
      bandada: "b",
    });
    expect(aviso.paso(momento({ bandadas: [bandada] }))).toBeNull();
  });

  it("de frente es por delante, en el cono del morro y a una altura parecida", () => {
    const avion = { x: 0, y: 300, z: 0, rumbo: 0 };
    // Al norte es −Z.
    expect(deFrente(avion, { x: 0, y: 300, z: -500 })).toBe(true);
    expect(deFrente(avion, { x: 0, y: 300, z: 500 })).toBe(false);
    expect(deFrente(avion, { x: 400, y: 300, z: -200 })).toBe(false);
    expect(deFrente(avion, { x: 0, y: 450, z: -500 })).toBe(false);
    expect(deFrente(avion, { x: 0, y: 300, z: -1500 })).toBe(false);
  });

  /*
   * «Caution» y el motivo, como da la OACI la información esencial de
   * aeródromo, y dónde y a qué altura, que es lo que pide el Doc 9137: un
   * «birds in the vicinity» a secas no le sirve a nadie.
   */
  it("la torre dice dónde y a cuántos pies, con las cifras que tiene grabadas", () => {
    const a = avisoDeLaTorre(160, "paraguayo");
    expect(a.texto).toBe("caution, flock of birds on final, 500 feet");
    expect(a.altura).toBe("trafico.pies.5");
    expect(avisoDeLaTorre(160, "canario").texto).toBe("caution, birds on final, 500 feet");
    // Por debajo de trescientos y por encima de mil doscientos no hay pieza.
    expect(avisoDeLaTorre(40, "paraguayo").altura).toBe("trafico.pies.3");
    expect(avisoDeLaTorre(900, "paraguayo").altura).toBe("trafico.pies.12");
  });
});

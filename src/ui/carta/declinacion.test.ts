/**
 * La declinación de la rosa, contra los valores de prueba que publica el
 * propio WMM2025 (`WMM2025_TestValues.txt`, del mismo paquete que los
 * coeficientes): si la cuenta se tuerce, la rosa apunta a otro norte.
 */

import { describe, expect, it } from "vitest";
import { anoDecimal, campoMagnetico, declinacion, inclinacion, varEscrita } from "./declinacion";

describe("la declinación del WMM2025", () => {
  it("da los valores de prueba del modelo", () => {
    // Año, altura (km), latitud, longitud y declinación, tal cual.
    const prueba: readonly (readonly [number, number, number, number, number])[] = [
      [2025.0, 28, 89, -121, -99.77],
      [2025.0, 48, 80, -96, -29.91],
      [2025.0, 65, 43, 93, 0.5],
      [2025.0, 51, -33, 109, -5.49],
      [2025.0, 39, -59, -8, -15.75],
      [2025.5, 63, 26, 81, 0.51],
      [2025.5, 8, -52, -75, 14.91],
      [2026.0, 74, -57, 3, -22.51],
      [2026.0, 46, -24, -122, 14.01],
    ];
    for (const [ano, h, lat, lon, d] of prueba)
      expect(declinacion(lat, lon, ano, h), `${lat}, ${lon}`).toBeCloseTo(d, 2);
  });

  it("y en Canarias, entre 3 y 4° al oeste, como las isógonas de la hoja GC", () => {
    const ano = anoDecimal(new Date(Date.UTC(2026, 9, 26)));
    for (const [lat, lon] of [
      [28.4827, -16.3417],
      [27.9319, -15.3866],
      [28.9455, -13.6052],
    ] as const) {
      const d = declinacion(lat, lon, ano);
      expect(d).toBeLessThan(-2.4);
      expect(d).toBeGreaterThan(-4.5);
    }
  });

  it("y la inclinación y la Z, los de la otra hoja de prueba (`WMM2025testvalues.pdf`, NCEI, enero de 2025)", () => {
    // Año, altura (km), latitud, longitud, Z (nT) e inclinación, tal cual.
    const prueba: readonly (readonly [number, number, number, number, number, number])[] = [
      [2025.0, 0, 80, 0, 54791.5, 83.21],
      [2025.0, 0, 0, 120, -10580.2, -14.93],
      [2025.0, 0, -80, 240, -52022.5, -72.0],
      [2025.0, 100, 80, 0, 52598.8, 83.26],
      [2027.5, 0, 0, 120, -10381.8, -14.65],
      [2027.5, 100, -80, 240, -49317.7, -72.1],
    ];
    for (const [ano, h, lat, lon, z, i] of prueba) {
      expect(campoMagnetico(lat, lon, ano, h).abajo, `Z en ${lat}, ${lon}`).toBeCloseTo(z, 0);
      expect(inclinacion(lat, lon, ano, h), `I en ${lat}, ${lon}`).toBeCloseTo(i, 1);
    }
  });

  it("y la brújula de cada hemisferio: hacia abajo en Canarias, hacia arriba en Asunción", () => {
    const ano = anoDecimal(new Date(Date.UTC(2026, 10, 18)));
    expect(inclinacion(28.4827, -16.3417, ano)).toBeGreaterThan(35);
    expect(inclinacion(28.4827, -16.3417, ano)).toBeLessThan(38);
    expect(inclinacion(-25.240156, -57.519227, ano)).toBeLessThan(-31);
    expect(inclinacion(-25.240156, -57.519227, ano)).toBeGreaterThan(-35);
  });

  it("se escribe como en la carta", () => {
    expect(varEscrita(-3.51)).toBe("VAR 4°W");
    expect(varEscrita(-15.68)).toBe("VAR 16°W");
    expect(varEscrita(0.64)).toBe("VAR 0.6°E");
  });
});

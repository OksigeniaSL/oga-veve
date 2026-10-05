/**
 * **Cada pista con la senda que publica su AIP** (punto 237 de la lista): el
 * PAPI dibujado, el rombo de la final y el perfil del automático, por ella.
 * Ver `sendas-publicadas.ts`.
 */
import { describe, expect, it } from "vitest";
import { Color, type InstancedMesh } from "three";
import { angulosDelPapi, blancasDePapi, crearAproximacion } from "./aproximacion";
import { SCENARIOS, oaciDe } from "./scenarios";
import { SENDAS, SENDA_DE_SIEMPRE, sendaDeLaCabecera } from "./sendas-publicadas";
import { alturaDeLaSendaDeLaFinal, desvioEnLaFinal, ritmoDeLaSenda } from "../flight/perfil-vertical";
import { altitudDelPerfil, MILLA, perfilDeLaBajada } from "../flight/ruta";
import type { Pista, Umbral } from "./aerodrome";

describe("la senda de cada cabecera, la de su AIP", () => {
  it("la 21 de Lanzarote, a 3,7°; la 19 de Fuerteventura, a 3,45°; la 09 de Cuatro Vientos, a 2,8°", () => {
    expect(sendaDeLaCabecera("GCRR", "21")).toBe(3.7);
    expect(sendaDeLaCabecera("GCFV", "19")).toBe(3.45);
    expect(sendaDeLaCabecera("LECU", "09")).toBe(2.8);
  });

  it("y las demás de Canarias, a tres", () => {
    for (const [oaci, cab] of [
      ["GCXO", "12"],
      ["GCXO", "30"],
      ["GCTS", "07"],
      ["GCLP", "03L"],
      ["GCRR", "03"],
      ["GCFV", "01"],
      ["GCLA", "18"],
      ["GCHI", "34"],
      ["GCGM", "09"],
    ] as const)
      expect(sendaDeLaCabecera(oaci, cab), `${oaci} ${cab}`).toBe(3);
  });

  it("y lo que no se sabe, a tres", () => {
    expect(sendaDeLaCabecera("SGPI", "20")).toBe(SENDA_DE_SIEMPRE);
    expect(sendaDeLaCabecera(null, null)).toBe(SENDA_DE_SIEMPRE);
  });

  it("cada cabecera de la tabla existe en el aeródromo del juego, con ese nombre", () => {
    for (const [oaci, cabeceras] of Object.entries(SENDAS)) {
      const esc = SCENARIOS.find((e) => oaciDe(e) === oaci);
      expect(esc, oaci).toBeDefined();
      const todas = new Set(
        esc!.aerodrome!.runways.flatMap((r) => Object.keys(r.thresholds)),
      );
      for (const cab of Object.keys(cabeceras)) expect(todas.has(cab), `${oaci} ${cab}`).toBe(true);
    }
  });
});

describe("el PAPI reglado a la senda de su pista", () => {
  const umbral = (xy: [number, number], headingTrue: number): Umbral => ({
    elevM: 0,
    headingTrue,
    displacedM: 0,
    xy,
  });
  const PISTA: Pista = {
    ref: "03/21",
    widthM: 45,
    surface: "asphalt",
    lit: true,
    centerline: [
      [0, 0],
      [2400, 0],
    ],
    thresholds: { "21": umbral([0, 0], 90), "03": umbral([2400, 0], 270) },
    magneticVariation: 0,
  };
  const blancas = (senda: number, grados: number): number => {
    const a = crearAproximacion(PISTA, "21", () => 0, [], senda)!;
    const d = 2000 + a.papiAdentro;
    a.mirarDesde(-2000, Math.tan((grados * Math.PI) / 180) * d + 1, 0);
    const papi = a.grupo.getObjectByName("papi") as InstancedMesh;
    const c = new Color();
    let n = 0;
    for (let k = 0; k < 4; k++) {
      papi.getColorAt(k, c);
      if (c.b > 0.5) n++;
    }
    return n;
  };

  it("los cuatro ángulos, treinta y diez minutos a cada lado de la senda", () => {
    const a = angulosDelPapi(3);
    expect(a[0]).toBeCloseTo(2.5, 6);
    expect(a[1]).toBeCloseTo(2 + 50 / 60, 6);
    expect(a[2]).toBeCloseTo(3 + 10 / 60, 6);
    expect(a[3]).toBeCloseTo(3.5, 6);
  });

  it("en la 21 de Lanzarote, a 3,7° dos y dos; y por tres grados, cuatro rojas", () => {
    expect(blancas(3.7, 3.7)).toBe(2);
    expect(blancas(3.7, 3)).toBe(0);
    expect(blancasDePapi(3.7, 3.7)).toBe(2);
    expect(blancasDePapi(3, 3.7)).toBe(0);
  });

  it("y en una de tres grados, como siempre", () => {
    expect(blancas(3, 3)).toBe(2);
    expect(blancasDePapi(3)).toBe(2);
  });
});

describe("el rombo de la final y el perfil, por la misma senda", () => {
  it("a 3,7° el rombo queda en el medio, y la senda baja más deprisa", () => {
    const d = 3000;
    const alto = d * Math.tan((3.7 * Math.PI) / 180);
    expect(desvioEnLaFinal(alto, d, 70, 3.7).puntos).toBeCloseTo(0, 6);
    expect(desvioEnLaFinal(alto, d, 70).grados!).toBeCloseTo(0.7, 6);
    expect(alturaDeLaSendaDeLaFinal(d, 3.7)).toBeCloseTo(alto, 6);
    expect(ritmoDeLaSenda(70, 3.7)).toBeLessThan(ritmoDeLaSenda(70));
  });

  it("y la final del perfil de la bajada va por ella", () => {
    const p = perfilDeLaBajada(14, null, 5 * MILLA, 3.7);
    expect(altitudDelPerfil(p, 2 * MILLA) - 14).toBeCloseTo(
      2 * MILLA * Math.tan((3.7 * Math.PI) / 180),
      6,
    );
  });
});

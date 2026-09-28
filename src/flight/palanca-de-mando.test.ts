/**
 * La palanca de mando con el pulgar: el punto va donde está el dedo, y el
 * mando llega a fondo donde se para el punto. Ver `flight/palanca-de-mando.ts`.
 */

import { describe, expect, it } from "vitest";
import hoja from "../style.css?raw";
import {
  MARGEN_DEL_PUNTO,
  mandoDelDedo,
  PUNTO_DEL_MANDO,
} from "./palanca-de-mando";

/** El mando de alabeo y cabeceo: ciento cincuenta con dos de filo. */
const LADO = 150 - 2 * 2;
const RECORRIDO = LADO / 2 - MARGEN_DEL_PUNTO - PUNTO_DEL_MANDO / 2;
/** Y el timón: doscientos veinte por cincuenta y seis. */
const TIMON = { ancho: 220 - 4, alto: 56 - 4 };

describe("la palanca de mando con el dedo", () => {
  it("en el centro no manda nada y el punto se queda en medio", () => {
    expect(mandoDelDedo(0, 0, LADO, LADO, true)).toEqual({
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
    });
  });

  it("el punto va debajo del dedo en todo su recorrido", () => {
    for (let ang = 0; ang < 360; ang += 15)
      for (const lejos of [5, 20, 35, RECORRIDO]) {
        const a = (ang * Math.PI) / 180;
        const dx = Math.cos(a) * lejos;
        const dy = Math.sin(a) * lejos;
        const d = mandoDelDedo(dx, dy, LADO, LADO, true);
        expect(d.dx).toBeCloseTo(dx, 6);
        expect(d.dy).toBeCloseTo(dy, 6);
      }
  });

  it("y a fondo el punto recorre casi todo el mando, no once píxeles", () => {
    /*
     * El defecto: `translate(calc(var(--x) * 34%))` es un tercio del punto,
     * once píxeles y medio. Ahora, con el dedo en el borde, el punto se
     * aparta lo que le deja el mando: más de cincuenta.
     */
    const d = mandoDelDedo(LADO / 2, 0, LADO, LADO, true);
    expect(d.x).toBe(1);
    expect(d.dx).toBeCloseTo(RECORRIDO, 6);
    expect(d.dx).toBeGreaterThan(50);
    // Y cabe dentro del mando, con su margen.
    expect(d.dx + PUNTO_DEL_MANDO / 2).toBeLessThanOrEqual(LADO / 2);
  });

  it("el mando llega a fondo justo donde se para el punto", () => {
    expect(mandoDelDedo(RECORRIDO, 0, LADO, LADO, true).x).toBeCloseTo(1, 6);
    expect(mandoDelDedo(0, -RECORRIDO, LADO, LADO, true).y).toBeCloseTo(-1, 6);
    expect(mandoDelDedo(RECORRIDO / 2, 0, LADO, LADO, true).x).toBeCloseTo(0.5, 6);
    // Más allá, el mando ya no crece y el punto tampoco.
    const fuera = mandoDelDedo(RECORRIDO + 30, 0, LADO, LADO, true);
    expect(fuera.x).toBe(1);
    expect(fuera.dx).toBeCloseTo(RECORRIDO, 6);
  });

  it("en diagonal, fuera del círculo, se tira y se ladea a fondo con el punto en el borde", () => {
    const d = mandoDelDedo(RECORRIDO, RECORRIDO, LADO, LADO, true);
    expect(d.x).toBe(1);
    expect(d.y).toBe(1);
    expect(Math.hypot(d.dx, d.dy)).toBeCloseTo(RECORRIDO, 6);
    // Apuntando hacia el dedo.
    expect(d.dx).toBeCloseTo(d.dy, 6);
  });

  it("el timón solo va de lado, y también llega hasta su tope", () => {
    const r = TIMON.ancho / 2 - MARGEN_DEL_PUNTO - PUNTO_DEL_MANDO / 2;
    const d = mandoDelDedo(r, 20, TIMON.ancho, TIMON.alto, false);
    expect(d.x).toBeCloseTo(1, 6);
    expect(d.y).toBe(0);
    expect(d.dx).toBeCloseTo(r, 6);
    expect(d.dy).toBe(0);
    expect(mandoDelDedo(-r / 2, 0, TIMON.ancho, TIMON.alto, false).dx).toBeCloseTo(
      -r / 2,
      6,
    );
  });

  it("y la hoja pinta el punto con esta cuenta y de este tamaño", () => {
    const regla = /\.pad__punto\s*\{([^}]*)\}/.exec(hoja)?.[1] ?? "";
    expect(regla).toContain(`width: ${PUNTO_DEL_MANDO}px`);
    expect(regla).toContain("translate(var(--dx, 0px), var(--dy, 0px))");
  });
});

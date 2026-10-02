/**
 * La palanca de mando con el pulgar: el punto va donde está el dedo, y el
 * mando llega a fondo donde se para el punto. Ver `flight/palanca-de-mando.ts`.
 */

import { describe, expect, it } from "vitest";
import hoja from "../style.css?raw";
import {
  CERCA_DEL_OTRO,
  DobleToque,
  ENTRE_TOQUES,
  MARGEN_DEL_PUNTO,
  mandoDelDedo,
  PUNTO_DEL_MANDO,
  puntoDelMando,
  RECORRIDO_ABAJO,
  separarEjes,
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
        // Abajo, hasta su tope, que llega antes. Ver `RECORRIDO_ABAJO`.
        expect(d.dy).toBeCloseTo(Math.min(dy, RECORRIDO * RECORRIDO_ABAJO), 6);
      }
  });

  it("abajo llega a fondo antes del borde, para que el pulgar no choque con el marco", () => {
    const abajo = RECORRIDO * RECORRIDO_ABAJO;
    expect(mandoDelDedo(0, abajo, LADO, LADO, true).y).toBeCloseTo(1, 6);
    expect(mandoDelDedo(0, abajo / 2, LADO, LADO, true).y).toBeCloseTo(0.5, 6);
    // Y arriba sigue llegando al borde de su recorrido, como siempre.
    expect(mandoDelDedo(0, -abajo, LADO, LADO, true).y).toBeCloseTo(-RECORRIDO_ABAJO, 6);
    // El punto se queda en su tope de abajo aunque el dedo baje más.
    expect(mandoDelDedo(0, RECORRIDO + 20, LADO, LADO, true).dy).toBeCloseTo(abajo, 6);
  });

  it("y sin dedo, el punto se pinta donde lo pondría el dedo", () => {
    for (const [x, y] of [
      [0, 0],
      [0.5, -0.5],
      [-1, 0],
      [0.3, 0.8],
      [0, 1],
    ] as const) {
      const p = puntoDelMando(x, y, LADO, LADO);
      const d = mandoDelDedo(p.dx, p.dy, LADO, LADO, true);
      expect(d.x).toBeCloseTo(x, 6);
      expect(d.y).toBeCloseTo(y, 6);
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
    const d = mandoDelDedo(RECORRIDO, -RECORRIDO, LADO, LADO, true);
    expect(d.x).toBe(1);
    expect(d.y).toBe(-1);
    expect(Math.hypot(d.dx, d.dy)).toBeCloseTo(RECORRIDO, 6);
    // Apuntando hacia el dedo.
    expect(d.dx).toBeCloseTo(-d.dy, 6);
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

describe("los ejes separados", () => {
  it("bajando, lo que el pulgar se escapa de lado no inclina el ala", () => {
    const r = separarEjes({ x: 0, y: 0 }, { x: 0.15, y: -0.6 });
    expect(r.x).toBe(0);
    expect(r.y).toBe(-0.6);
  });

  it("y ladeando, lo que se escapa arriba o abajo no sube ni baja", () => {
    const r = separarEjes({ x: 0, y: 0.3 }, { x: 0.7, y: 0.45 });
    expect(r.x).toBe(0.7);
    expect(r.y).toBe(0.3);
  });

  it("en diagonal de verdad pasan los dos", () => {
    const r = separarEjes({ x: 0, y: 0 }, { x: 0.6, y: 0.7 });
    expect(r.x).toBeGreaterThan(0.3);
    expect(r.y).toBe(0.7);
  });

  it("y desde donde estaba la palanca, no desde el centro", () => {
    const r = separarEjes({ x: 0.5, y: -0.4 }, { x: 0.58, y: 0.1 });
    expect(r.x).toBe(0.5);
    expect(r.y).toBe(0.1);
  });
});

describe("el doble toque", () => {
  it("dos golpecitos seguidos y cerca son un doble toque", () => {
    const d = new DobleToque();
    expect(d.bajar(10, 100, 100)).toBe(false);
    d.subir(10.08);
    expect(d.bajar(10.25, 104, 98)).toBe(true);
  });

  it("si tardan, no", () => {
    const d = new DobleToque();
    d.bajar(10, 100, 100);
    d.subir(10.08);
    expect(d.bajar(10.08 + ENTRE_TOQUES + 0.05, 100, 100)).toBe(false);
  });

  it("si el primero arrastró la palanca, no fue un golpecito", () => {
    const d = new DobleToque();
    d.bajar(10, 100, 100);
    d.mover(100, 140);
    d.subir(10.1);
    expect(d.bajar(10.2, 100, 140)).toBe(false);
  });

  it("si el segundo cae lejos del primero, no", () => {
    const d = new DobleToque();
    d.bajar(10, 100, 100);
    d.subir(10.08);
    expect(d.bajar(10.2, 100 + CERCA_DEL_OTRO + 10, 100)).toBe(false);
  });

  it("y un tercero seguido no es otro doble toque", () => {
    const d = new DobleToque();
    d.bajar(10, 100, 100);
    d.subir(10.05);
    expect(d.bajar(10.15, 100, 100)).toBe(true);
    d.subir(10.2);
    expect(d.bajar(10.3, 100, 100)).toBe(false);
  });
});

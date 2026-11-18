/**
 * **La raya del camino en el suelo**: que crece una muestra cada cincuenta
 * metros, que sigue el suelo y que no pasa de lo reservado, que es lo que la
 * hace barata. Ver `raya-del-camino.ts`.
 */

import { describe, expect, it } from "vitest";
import type { BufferAttribute } from "three";
import { CAPACIDAD, CintaEnElSuelo, PASO, SOBRE_EL_SUELO } from "./raya-del-camino";

const LOMA = (x: number): number => 100 + x * 0.01;

describe("la raya del camino en el suelo", () => {
  it("una muestra cada cincuenta metros, y no una por imagen", () => {
    const c = new CintaEnElSuelo(LOMA, 0xffffff, 16);
    for (let x = 0; x <= 1000; x += 5) c.anadir(x, 0);
    expect(c.muestras).toBe(1000 / PASO + 1);
    // Seis índices por tramo, y nada más.
    expect(c.malla.geometry.drawRange.count).toBe((c.muestras - 1) * 6);
  });

  it("sigue el suelo, a su altura y con su ancho", () => {
    const c = new CintaEnElSuelo(LOMA, 0xffffff, 16);
    c.anadir(0, 0);
    c.anadir(500, 0);
    const p = c.malla.geometry.getAttribute("position") as BufferAttribute;
    expect(p.getY(2)).toBeCloseTo(LOMA(500) + SOBRE_EL_SUELO, 5);
    // Yendo hacia el este, los dos bordes a ocho metros al norte y al sur.
    expect(Math.abs(p.getZ(2) - p.getZ(3))).toBeCloseTo(16, 5);
    expect(p.getX(2)).toBeCloseTo(500, 5);
  });

  it("la recta entera, muestreada; y llena, deja de crecer", () => {
    const c = new CintaEnElSuelo(LOMA, 0xffffff, 10);
    c.recta({ x: 0, z: 0 }, { x: 0, z: -7700 });
    expect(c.muestras).toBe(Math.ceil(7700 / PASO) + 1);
    for (let i = 0; i < CAPACIDAD + 50; i++) c.anadir(10_000 + i * PASO, 0);
    expect(c.muestras).toBe(CAPACIDAD);
    c.vaciar();
    expect(c.muestras).toBe(0);
    expect(c.malla.geometry.drawRange.count).toBe(0);
  });
});

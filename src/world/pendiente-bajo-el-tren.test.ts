/**
 * El avión dibujado se inclina con el suelo que pisa: ver
 * `pendiente-bajo-el-tren.ts`.
 */
import { describe, expect, it } from "vitest";
import { INCLINACION_MAXIMA, pendienteBajoElTren } from "./pendiente-bajo-el-tren";

describe("la pendiente del suelo bajo el tren", () => {
  it("en llano, nada", () => {
    const p = pendienteBajoElTren(() => 624, 10, 20, 1.2, 12, 4);
    expect(p.cabeceo).toBeCloseTo(0, 9);
    expect(p.alabeo).toBeCloseTo(0, 9);
  });

  /*
   * El puesto de Los Rodeos con viento del nordeste: el hormigón sube 6,2 cm
   * en los catorce metros del JAZ 90 hacia el morro, que miraba al este.
   */
  it("con el suelo subiendo hacia el morro, el morro arriba; y de lado, nada", () => {
    const pendiente = 0.062 / 14;
    // Rumbo este (π/2): delante es la x positiva del mundo.
    const suelo = (x: number) => 624 + x * pendiente;
    const p = pendienteBajoElTren(suelo, 0, 0, Math.PI / 2, 14, 4);
    expect(p.cabeceo).toBeCloseTo(Math.atan(pendiente), 6);
    expect(p.alabeo).toBeCloseTo(0, 9);
    // Y mirando al oeste, el morro abajo.
    expect(pendienteBajoElTren(suelo, 0, 0, -Math.PI / 2, 14, 4).cabeceo).toBeCloseTo(
      -Math.atan(pendiente),
      6,
    );
  });

  it("con el suelo subiendo a la derecha, el ala derecha arriba", () => {
    // Rumbo norte (0): delante es la z negativa, y la derecha la x positiva.
    const suelo = (x: number) => 624 + x * 0.01;
    const p = pendienteBajoElTren(suelo, 0, 0, 0, 14, 4);
    expect(p.alabeo).toBeCloseTo(Math.atan(0.01), 6);
    expect(p.cabeceo).toBeCloseTo(0, 9);
  });

  it("y un bache no pone el avión de canto", () => {
    const suelo = (x: number) => (x > 0 ? 630 : 624);
    const p = pendienteBajoElTren(suelo, 0, 0, Math.PI / 2, 4, 2);
    expect(p.cabeceo).toBe(INCLINACION_MAXIMA);
  });
});

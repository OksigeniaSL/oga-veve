/**
 * Los mandos de verdad, leídos con su reparto. Ver `flight/mandos-fisicos.ts`.
 *
 * El HOTAS X se prueba aquí con mandos de mentira que dicen lo que diría el
 * de verdad según su manual y según cómo numera cada navegador: **no se ha
 * podido probar con el aparato**, y por eso estas pruebas dicen exactamente
 * qué se ha supuesto.
 */

import { describe, expect, it } from "vitest";
import { GasDelHotas, esHotasX, leerMando, type MandoLeible } from "./mandos-fisicos";

const suelto = { pressed: false, value: 0 };
const apretado = { pressed: true, value: 1 };

function mando(id: string, ejes: number[], apretados: number[] = [], mapping = ""): MandoLeible {
  return {
    id,
    mapping,
    axes: ejes,
    buttons: Array.from({ length: 17 }, (_, i) => (apretados.includes(i) ? apretado : suelto)),
  };
}

const LINUX = "Thrustmaster T.Flight Hotas X (STANDARD GAMEPAD Vendor: 044f Product: b108)";
const WINDOWS = "T.Flight Hotas X (Vendor: 044f Product: b108)";

describe("quién es quién", () => {
  it("el HOTAS X se reconoce por su nombre o por su número USB", () => {
    expect(esHotasX(LINUX)).toBe(true);
    expect(esHotasX(WINDOWS)).toBe(true);
    expect(esHotasX("044f-b108-T.Flight Hotas X")).toBe(true);
    expect(esHotasX("Xbox Wireless Controller (STANDARD GAMEPAD)")).toBe(false);
  });
});

describe("el mando de consola", () => {
  it("palanca izquierda alabeo y cabeceo, y arriba es morro arriba", () => {
    const l = leerMando(mando("Xbox", [0.5, -0.8, 0, 0], [], "standard"));
    expect(l.aparato).toBe("consola");
    expect(l.roll).toBeGreaterThan(0.3);
    expect(l.pitch).toBeGreaterThan(0.6);
  });

  it("LB y RB los flaps, Y el tren y X los aerofrenos", () => {
    const l = leerMando(mando("Xbox", [0, 0, 0, 0], [4, 3, 2], "standard"));
    expect(l.flapsArriba).toBe(true);
    expect(l.flapsAbajo).toBe(false);
    expect(l.tren).toBe(true);
    expect(l.aerofrenos).toBe(true);
  });
});

describe("el HOTAS X en Linux: siete ejes, la seta en el 5 y el 6", () => {
  it("palanca, giro del mango y gas, cada uno en su eje", () => {
    // Gas atrás (al ralentí, +1 si delante es −1) y el balancín al centro.
    const l = leerMando(mando(LINUX, [0.6, 0.5, 1, -0.7, 0, 0, 0]));
    expect(l.aparato).toBe("hotas-x");
    expect(l.roll).toBeGreaterThan(0.5);
    expect(l.pitch).toBeLessThan(-0.4);
    expect(l.rudder).toBeLessThan(-0.5);
    expect(l.throttle).toBeCloseTo(0, 6);
  });

  it("y a fondo hacia delante, todo el gas", () => {
    const l = leerMando(mando(LINUX, [0, 0, -1, 0, 0, 0, 0]));
    expect(l.throttle).toBeCloseTo(1, 6);
  });

  it("la palanca de gases se distingue del balancín porque no vuelve al centro", () => {
    const gas = new GasDelHotas();
    // El gas en el deslizador, a medias, y Z —el balancín— al centro.
    const l = leerMando(mando(LINUX, [0, 0, 0, 0, 0.6, 0, 0]), gas);
    expect(l.throttle).toBeCloseTo(0.2, 6);
    // Y ya decidido, mover el balancín es timón, no gas.
    const m = leerMando(mando(LINUX, [0, 0, 0.8, 0, 0.6, 0, 0]), gas);
    expect(m.throttle).toBeCloseTo(0.2, 6);
    expect(m.rudder).toBeGreaterThan(0.7);
  });

  it("la seta arriba y abajo es el compensador", () => {
    expect(leerMando(mando(LINUX, [0, 0, 1, 0, 0, 0, -1])).trimArriba).toBe(true);
    expect(leerMando(mando(LINUX, [0, 0, 1, 0, 0, 0, 1])).trimAbajo).toBe(true);
  });

  it("los botones: gatillo freno, 5 y 6 flaps, 7 tren, 8 reversa", () => {
    const l = leerMando(mando(LINUX, [0, 0, 1, 0, 0, 0, 0], [0, 4, 6, 7]));
    expect(l.brakes).toBe(true);
    expect(l.flapsArriba).toBe(true);
    expect(l.tren).toBe(true);
    expect(l.reversa).toBe(true);
    expect(l.flapsAbajo).toBe(false);
  });
});

describe("el HOTAS X en Chrome de Windows: diez ejes por su código", () => {
  it("el giro en el 5, el gas en Z o en el 6 y la seta en un solo número, el 9", () => {
    const ejes = [0, 0, 0, 0, 0, 0.9, 0.8, 0, 0, -1];
    const l = leerMando(mando(WINDOWS, ejes));
    expect(l.rudder).toBeGreaterThan(0.8);
    expect(l.throttle).toBeCloseTo(0.1, 6);
    expect(l.trimArriba).toBe(true);
    // Sin tocar la seta, el número se va por encima de uno: ni arriba ni abajo.
    const quieta = leerMando(mando(WINDOWS, [0, 0, 0, 0, 0, 0, 0.8, 0, 0, 1.2857]));
    expect(quieta.trimArriba || quieta.trimAbajo).toBe(false);
    // Abajo es el 0,14.
    expect(leerMando(mando(WINDOWS, [0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0.1429])).trimAbajo).toBe(true);
  });
});

/**
 * Que el rayo alumbre, un instante, y sin parpadear.
 *
 * La luz se pedía por el deslumbre del sol, que se recorta a uno: el rayo
 * caía, tronaba y no alumbraba nada. Ver `relampago.ts`.
 */
import { describe, expect, it } from "vitest";
import {
  DURA,
  DURA_SUAVE,
  ENTRE_RAYOS,
  luzDelRelampago,
  PICO_SUAVE,
  Relampagos,
} from "./relampago";

/** La luz de un rayo a sesenta fotogramas, de cuando cae a que se apaga. */
function fotogramas(reducido: boolean, segundos = 2): number[] {
  const r = new Relampagos();
  r.cae();
  const luz: number[] = [];
  for (let t = 0; t < segundos; t += 1 / 60) luz.push(r.paso(1 / 60, reducido));
  return luz;
}

describe("la luz de un relámpago", () => {
  it("alumbra de verdad: llega a casi todo en un par de fotogramas", () => {
    const luz = fotogramas(false);
    expect(Math.max(...luz.slice(0, 3))).toBeGreaterThan(0.9);
  });

  it("y se apaga sola en menos de medio segundo", () => {
    expect(luzDelRelampago(DURA, false)).toBe(0);
    expect(DURA).toBeLessThanOrEqual(0.5);
    expect(luzDelRelampago(DURA * 0.5, false)).toBeLessThan(0.35);
  });

  it("es un solo pulso: sube una vez y baja una vez, sin titileo", () => {
    for (const reducido of [false, true]) {
      const luz = fotogramas(reducido);
      let cambios = 0;
      for (let i = 2; i < luz.length; i++) {
        const antes = Math.sign(luz[i - 1]! - luz[i - 2]!);
        const ahora = Math.sign(luz[i]! - luz[i - 1]!);
        if (antes !== 0 && ahora !== 0 && antes !== ahora) cambios++;
      }
      expect(cambios, reducido ? "suave" : "normal").toBeLessThanOrEqual(1);
    }
  });

  it("con el movimiento reducido no hay destello: sube despacio y no pasa de un tercio", () => {
    const luz = fotogramas(true);
    expect(Math.max(...luz)).toBeLessThanOrEqual(PICO_SUAVE + 1e-9);
    expect(PICO_SUAVE).toBeLessThanOrEqual(1 / 3);
    // Ningún salto de un fotograma al siguiente de más de un cinco por ciento.
    for (let i = 1; i < luz.length; i++)
      expect(Math.abs(luz[i]! - luz[i - 1]!)).toBeLessThan(0.05);
    expect(luzDelRelampago(DURA_SUAVE, true)).toBe(0);
  });
});

describe("entre rayo y rayo", () => {
  it("el que cae pegado al anterior no vuelve a alumbrar", () => {
    const r = new Relampagos();
    expect(r.cae()).toBe(true);
    r.paso(0.3, false);
    expect(r.cae()).toBe(false);
    r.paso(ENTRE_RAYOS, false);
    expect(r.cae()).toBe(true);
  });

  it("nunca más de uno por segundo, aunque el azar los junte", () => {
    // El peor azar: un rayo pedido en cada fotograma durante diez segundos.
    const r = new Relampagos();
    const cuando: number[] = [];
    for (let i = 0; i < 600; i++) {
      if (r.cae()) cuando.push(i / 60);
      r.paso(1 / 60, false);
    }
    for (let i = 1; i < cuando.length; i++)
      expect(cuando[i]! - cuando[i - 1]!).toBeGreaterThanOrEqual(1);
    expect(cuando.length).toBeGreaterThan(5);
  });

  it("sin rayo, a oscuras", () => {
    expect(new Relampagos().paso(1 / 60, false)).toBe(0);
  });
});

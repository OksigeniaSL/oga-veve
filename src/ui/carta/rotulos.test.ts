/**
 * La colocación de los rótulos de la carta: que ninguno pise a otro.
 */

import { describe, expect, it } from "vitest";
import { colocar, cruza, envolvente, sePisan, sitiosAlrededor, type Caja } from "./rotulos";

describe("las cajas", () => {
  it("dos cajas derechas se pisan si se solapan, y no si solo se tocan", () => {
    const a: Caja = { cx: 0, cy: 0, w: 10, h: 10 };
    expect(sePisan(a, { cx: 9, cy: 0, w: 10, h: 10 })).toBe(true);
    expect(sePisan(a, { cx: 10, cy: 0, w: 10, h: 10 })).toBe(false);
    // Con holgura, tocarse ya cuenta.
    expect(sePisan(a, { cx: 10, cy: 0, w: 10, h: 10 }, 1)).toBe(true);
  });

  it("y una girada se mide girada: en diagonal no pisa lo que pisaría su caja envolvente", () => {
    const larga: Caja = { cx: 0, cy: 0, w: 100, h: 10, giro: Math.PI / 4 };
    const e = envolvente(larga);
    // En la esquina de su envolvente, lejos de la raya en diagonal.
    const esquina: Caja = { cx: e.x1 - 6, cy: e.y0 + 6, w: 8, h: 8 };
    expect(sePisan(larga, esquina)).toBe(false);
    expect(sePisan(larga, { cx: 0, cy: 0, w: 8, h: 8 })).toBe(true);
  });

  it("una raya cruza la caja que atraviesa, y no la que solo bordea", () => {
    const c: Caja = { cx: 50, cy: 50, w: 20, h: 10 };
    expect(cruza(c, { a: [0, 50], b: [100, 50] })).toBe(true);
    expect(cruza(c, { a: [0, 60], b: [100, 60] })).toBe(false);
    expect(cruza(c, { a: [55, 0], b: [45, 100] })).toBe(true);
  });
});

describe("colocar", () => {
  it("pone el segundo donde no pisa al primero, y si no cabe en ningún sitio, no lo pone", () => {
    const sitios = sitiosAlrededor(100, 100, 9, [60, 16]);
    const r = colocar(400, 400, [{ cx: 100, cy: 100, w: 18, h: 18 }], [], [{ formas: [sitios] }, { formas: [sitios] }]);
    expect(r[0]).not.toBeNull();
    expect(r[1]).not.toBeNull();
    expect(sePisan(r[0]!.caja, r[1]!.caja)).toBe(false);
    // Un rótulo más grande que la carta no cabe en ningún sitio.
    const grande = colocar(50, 50, [], [], [{ formas: [sitiosAlrededor(25, 25, 9, [200, 16])] }]);
    expect(grande[0]).toBeNull();
  });

  it("si la forma entera no cabe, prueba la corta", () => {
    const r = colocar(120, 60, [], [], [
      { formas: [sitiosAlrededor(20, 30, 9, [200, 40]), sitiosAlrededor(20, 30, 9, [60, 14])] },
    ]);
    expect(r[0]?.forma).toBe(1);
  });

  it("entre dos sitios libres, el que no tapa una ruta", () => {
    const sitios = sitiosAlrededor(100, 100, 9, [60, 16]);
    // Una ruta que sale hacia la derecha: el rótulo se va a la izquierda.
    const r = colocar(400, 400, [], [{ a: [100, 100], b: [300, 100] }], [{ formas: [sitios] }]);
    expect(r[0]!.caja.cx).toBeLessThan(100);
  });
});

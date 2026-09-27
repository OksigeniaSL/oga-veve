/**
 * El agua de casa, junto a casa: el mar es mar hasta el fondo, y un río es
 * agua a su altura y no en los valles de doscientos kilómetros más abajo. Ver
 * `esAguaDeCasa`.
 */

import { describe, expect, it } from "vitest";
import { esAguaDeCasa } from "./agua-de-casa";
import { SCENARIOS } from "./scenarios";

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
  existsSync(ruta: string): boolean;
};

function alturas(ruta: string): Int16Array | null {
  if (!fs.existsSync(ruta)) return null;
  const b = fs.readFileSync(ruta);
  return new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}

describe("el agua de casa", () => {
  it("el mar es mar hasta el fondo, y la costa no", () => {
    expect(esAguaDeCasa(0, 2)).toBe(true);
    expect(esAguaDeCasa(-59, 2)).toBe(true);
    expect(esAguaDeCasa(3, 2)).toBe(false);
  });

  it("el Paraná de Ciudad del Este es agua a su altura y aguas abajo en la garganta", () => {
    expect(esAguaDeCasa(105, 105)).toBe(true);
    // «En el anillo lejano baja hasta 97: la garganta aguas abajo de Itaipú.»
    expect(esAguaDeCasa(97, 105)).toBe(true);
  });

  it("pero los valles de doscientos kilómetros más allá no se inundan con él", () => {
    // Las tierras del horizonte de Guaraní bajan a 47 m.
    expect(esAguaDeCasa(47, 105)).toBe(false);
    expect(esAguaDeCasa(80, 105)).toBe(false);
  });

  it("y junto a casa no cambia nada: los mapas finos caen enteros en la banda", () => {
    let mirados = 0;
    for (const esc of SCENARIOS) {
      const h = alturas(`data/terrain/${esc.id}.bin`);
      if (!h) continue;
      mirados++;
      for (const v of h)
        if (v <= esc.waterLevel)
          expect(esAguaDeCasa(v, esc.waterLevel), `${esc.id}: ${v} m`).toBe(true);
    }
    expect(mirados).toBeGreaterThan(10);
  });

  it("y en el horizonte de Guaraní hay tierra baja que ya no sale inundada", () => {
    const h = alturas("data/terrain/guarani-lejos.bin");
    expect(h).not.toBeNull();
    let secas = 0;
    for (const v of h!) if (v <= 105 && !esAguaDeCasa(v, 105)) secas++;
    expect(secas).toBeGreaterThan(100);
  });
});

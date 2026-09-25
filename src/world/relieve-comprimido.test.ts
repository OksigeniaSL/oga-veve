import { describe, expect, it } from "vitest";
import { descomprimir } from "./relieve";

/** Un relieve como los de verdad: casi todo mar a cota cero y una isla. */
function relieveDePrueba(): Int16Array {
  const n = 256;
  const r = new Int16Array(n * n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const d = Math.hypot(i - n / 2, j - n / 2);
      r[i * n + j] = d < 60 ? Math.round(3700 * (1 - d / 60)) : 0;
    }
  return r;
}

async function gzip(bytes: ArrayBuffer): Promise<ArrayBuffer> {
  const flujo = new Blob([bytes])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return new Response(flujo).arrayBuffer();
}

describe("relieve comprimido al empaquetar", () => {
  it("devuelve los mismos enteros que el crudo", async () => {
    const crudo = relieveDePrueba();
    const comprimido = await gzip(crudo.buffer as ArrayBuffer);
    expect(comprimido.byteLength).toBeLessThan(crudo.byteLength / 4);
    expect(new Int16Array(await descomprimir(comprimido))).toEqual(crudo);
  });

  it("deja pasar el crudo, que es lo que llega en desarrollo", async () => {
    const b = relieveDePrueba().buffer as ArrayBuffer;
    expect(await descomprimir(b)).toBe(b);
  });
});

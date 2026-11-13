/**
 * **La rejilla horneada es la rejilla.** Ver `pavimento-horneado.ts` y el ADR
 * 0028.
 *
 * Lo que se mira aquí es lo que se puede mirar sin montar el mundo: que el
 * fichero devuelve la misma rejilla celda a celda, que la huella cambia con
 * un milímetro de cualquier cosa de la que sale la rejilla, y que los
 * ficheros de `data/aerodromes/` se leen enteros. Que lo horneado sea lo que
 * hace el navegador con cada aeródromo de verdad lo compara
 * `npm run pavimento -- --comprobar`, que necesita el juego montado.
 */
import { describe, expect, it } from "vitest";
import { BufferGeometry, Float32BufferAttribute, Mesh } from "three";
import {
  mapaDelPavimento,
  mapaDesdeRejilla,
  NADA_EN_LA_REJILLA,
  rejillaDelPavimento,
} from "./mapa-del-pavimento";
import {
  codificarRejilla,
  descodificarRejilla,
  ficheroDelPavimento,
  huellaDeLaRejilla,
  huellaDelPavimento,
  VERSION_DEL_HORNEADO,
} from "./pavimento-horneado";

/*
 * **El `fs` y el `zlib` de Node pedidos en marcha**, como en
 * `compilacion.test.ts`: importarlos por su nombre obligaría a meter los
 * tipos de Node en el `tsconfig`.
 */
const nodo = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown; cwd(): string };
  }
).process;
const { readdirSync, readFileSync } = nodo.getBuiltinModule("node:fs") as {
  readdirSync(ruta: string): string[];
  readFileSync(ruta: string): Uint8Array;
};
const { gunzipSync } = nodo.getBuiltinModule("node:zlib") as {
  gunzipSync(b: Uint8Array): Uint8Array;
};
const leerTexto = (ruta: string): string => new TextDecoder().decode(readFileSync(ruta));
const igual = (a: Int8Array, b: Int8Array): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/** Un asfalto de juguete: una pista inclinada y una plataforma torcida que la pisa. */
function mallas(mover = 0): Mesh[] {
  const pista = new BufferGeometry();
  pista.setAttribute(
    "position",
    new Float32BufferAttribute(
      [-300, 10.35, -20, 300, 12.35 + mover, -20, 300, 12.35, 20, -300, 10.35, -20, 300, 12.35, 20, -300, 10.35, 20],
      3,
    ),
  );
  const plataforma = new BufferGeometry();
  plataforma.setAttribute(
    "position",
    new Float32BufferAttribute([-80, 11, 15, 40, 11.6, 33, -60, 11.1, 90, 40, 11.6, 33, 70, 11.7, 110, -60, 11.1, 90], 3),
  );
  return [new Mesh(pista), new Mesh(plataforma)];
}

/** Un suelo que no es un plano, para que el alzado cambie de celda en celda. */
const suelo = (x: number, z: number): number => 10 + x / 300 + Math.sin(x / 37) * 0.08 + Math.cos(z / 23) * 0.05;

describe("la rejilla horneada", () => {
  const r = rejillaDelPavimento(mallas(), suelo)!;
  const huella = huellaDelPavimento(mallas(), [new Float32Array([1, 2, 3]), 385, 67.7]);

  it("sale del fichero igual, celda a celda y con la esquina en los mismos bits", () => {
    expect(r.alzado.some((v) => v !== NADA_EN_LA_REJILLA)).toBe(true);
    const leida = descodificarRejilla(codificarRejilla(r, huella))!;
    expect(leida.celda).toBe(r.celda);
    expect(Object.is(leida.x0, r.x0) && Object.is(leida.z0, r.z0)).toBe(true);
    expect([leida.nx, leida.nz]).toEqual([r.nx, r.nz]);
    expect(igual(leida.alzado, r.alzado)).toBe(true);
    expect(huellaDeLaRejilla(codificarRejilla(r, huella))).toBe(huella);
  });

  it("y contesta lo mismo que la cuenta hecha aquí, en cualquier punto", () => {
    const viva = mapaDelPavimento(mallas(), suelo);
    const horneada = mapaDesdeRejilla(descodificarRejilla(codificarRejilla(r, huella)));
    for (let x = -320; x <= 320; x += 3.7)
      for (let z = -40; z <= 130; z += 1.3) expect(horneada.alzadoEn(x, z)).toBe(viva.alzadoEn(x, z));
  });

  it("con carreras de más de 127 celdas, que van en varios bytes", () => {
    const alzado = new Int8Array(70000).fill(NADA_EN_LA_REJILLA);
    alzado.fill(35, 1000, 50000);
    alzado[123] = -3;
    const grande = { celda: 2, x0: -1.5, z0: 7.25, nx: 700, nz: 100, alzado };
    const leida = descodificarRejilla(codificarRejilla(grande, huella))!;
    expect(igual(leida.alzado, alzado)).toBe(true);
  });

  it("un fichero cortado no es una rejilla", () => {
    const bytes = codificarRejilla(r, huella);
    expect(descodificarRejilla(bytes.subarray(0, bytes.length - 1))).toBeNull();
    expect(descodificarRejilla(bytes.subarray(0, 20))).toBeNull();
  });
});

describe("la huella", () => {
  const base = huellaDelPavimento(mallas(), [new Float32Array([600.25, 601.5]), 385, 67.7, 13000]);

  it("es la misma con lo mismo", () => {
    expect(huellaDelPavimento(mallas(), [new Float32Array([600.25, 601.5]), 385, 67.7, 13000])).toBe(base);
    expect(base).toMatch(/^[0-9a-f]{16}$/);
  });

  it("y cambia con un milímetro del asfalto, del suelo o del paso", () => {
    expect(huellaDelPavimento(mallas(0.001), [new Float32Array([600.25, 601.5]), 385, 67.7, 13000])).not.toBe(base);
    expect(huellaDelPavimento(mallas(), [new Float32Array([600.25, 601.501]), 385, 67.7, 13000])).not.toBe(base);
    expect(huellaDelPavimento(mallas(), [new Float32Array([600.25, 601.5]), 385, 67.71, 13000])).not.toBe(base);
    expect(huellaDelPavimento(mallas().reverse(), [new Float32Array([600.25, 601.5]), 385, 67.7, 13000])).not.toBe(base);
  });
});

describe("los ficheros horneados", () => {
  // Vitest corre desde la raíz del proyecto.
  const carpeta = `${nodo.cwd()}/data/aerodromes`;
  const horneados = readdirSync(carpeta).filter((f) => f.endsWith(".pavimento.bin"));

  it("hay, y cada uno es de un aeródromo que existe", () => {
    expect(horneados.length).toBeGreaterThan(0);
    // Por el `id` de dentro y no por el nombre: el de Yvytu Rape es `yvytu.aero.json` y su id, SGOG.
    const ids = readdirSync(carpeta)
      .filter((f) => f.endsWith(".aero.json"))
      .map((f) => ficheroDelPavimento(JSON.parse(leerTexto(`${carpeta}/${f}`)).id));
    for (const f of horneados) expect(ids).toContain(f);
  });

  it("se leen enteros y son de esta versión", () => {
    for (const f of horneados) {
      const bytes = new Uint8Array(gunzipSync(readFileSync(`${carpeta}/${f}`)));
      expect(huellaDeLaRejilla(bytes), f).not.toBeNull();
      const r = descodificarRejilla(bytes);
      expect(r, f).not.toBeNull();
      expect(r!.nx * r!.nz, f).toBe(r!.alzado.length);
      expect(new DataView(bytes.buffer, bytes.byteOffset).getUint32(4, true)).toBe(VERSION_DEL_HORNEADO);
    }
  });
});

/**
 * **La pintura escrita de seguido es la de pieza a pieza, al bit.** Ver
 * `Pintura` en `aerodrome.ts` y la enmienda H23c del ADR 0028.
 *
 * La pintura de las pistas y de las calles se hacía trozo a trozo, cada uno
 * con su geometría de three, y se juntaba al final con `mergeGeometries`.
 * Ahora se escribe en un solo arreglo y la cota de cada esquina se pregunta
 * una vez. El cambio es solo de cómo se hace, así que lo que sale tiene que
 * ser **lo mismo byte a byte**: las mismas posiciones y normales, en el mismo
 * orden y con los mismos atributos.
 *
 * Aquí se monta el aeródromo de cada campo, se apunta cada trozo de pintura
 * que se le da a cada `Pintura` y con qué suelo, y se rehace con la cuenta de
 * antes —la de abajo, que es la de `d94094e2`— para comparar. No compara con
 * un fichero: si alguien cambia a propósito dónde va una raya, las dos
 * cuentas la ponen en el mismo sitio y la prueba sigue en pie; lo que no puede
 * es cambiarla el atajo.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { BufferGeometry, Float32BufferAttribute } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  createAerodrome,
  desdePoligono,
  LADO_DE_PINTURA,
  Pintura,
  PINTURA_ALTURA,
} from "./aerodrome";
import { conSuAerodromo, SCENARIOS, type Scenario } from "./scenarios";
import { Terrain } from "./terrain";

type Punto = readonly [number, number];

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
  existsSync(ruta: string): boolean;
};

/** El relieve de un fichero de `data/terrain/`, como lo deja `cargarRelieve`. */
function relieve(id: string): Scenario["relieve"] {
  const ruta = `data/terrain/${id}.bin`;
  if (!fs.existsSync(ruta)) return undefined;
  const b = fs.readFileSync(ruta);
  const datos = new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  return { datos, resolucion: Math.round(Math.sqrt(datos.length)) };
}

/** Un trozo de pintura como se hacía antes: su propia geometría. */
function piezaAPieza(
  contorno: readonly Punto[],
  suelo: (p: Punto) => number,
): BufferGeometry | null {
  if (contorno.length !== 4) {
    const geo = desdePoligono(contorno, (q) => suelo(q) + PINTURA_ALTURA);
    if (!geo) return null;
    const suelta = geo.toNonIndexed();
    suelta.deleteAttribute("uv");
    return suelta;
  }
  const [a, b, c, d] = contorno as [Punto, Punto, Punto, Punto];
  const largo = Math.max(Math.hypot(b[0] - a[0], b[1] - a[1]), Math.hypot(c[0] - d[0], c[1] - d[1]));
  const corto = Math.max(Math.hypot(d[0] - a[0], d[1] - a[1]), Math.hypot(c[0] - b[0], c[1] - b[1]));
  const n = Math.max(1, Math.ceil(largo / LADO_DE_PINTURA));
  const m = Math.max(1, Math.ceil(corto / LADO_DE_PINTURA));
  const en = (i: number, j: number): Punto => {
    const s = i / n;
    const t = j / m;
    const ab: Punto = [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s];
    const dc: Punto = [d[0] + (c[0] - d[0]) * s, d[1] + (c[1] - d[1]) * s];
    return [ab[0] + (dc[0] - ab[0]) * t, ab[1] + (dc[1] - ab[1]) * t];
  };
  const pos: number[] = [];
  const vertice = (q: Punto) => pos.push(q[0], suelo(q) + PINTURA_ALTURA, -q[1]);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) {
      const p00 = en(i, j);
      const p10 = en(i + 1, j);
      const p11 = en(i + 1, j + 1);
      const p01 = en(i, j + 1);
      for (const q of [p00, p10, p11, p00, p11, p01]) vertice(q);
    }
  const arriba =
    (pos[5]! - pos[2]!) * (pos[6]! - pos[0]!) -
    (pos[3]! - pos[0]!) * (pos[8]! - pos[2]!);
  if (arriba < 0)
    for (let t = 0; t < pos.length; t += 9)
      for (let k = 0; k < 3; k++) {
        const x = pos[t + 3 + k]!;
        pos[t + 3 + k] = pos[t + 6 + k]!;
        pos[t + 6 + k] = x;
      }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Cuántos bytes difieren entre dos arreglos con tipo. */
function bytesDistintos(a: ArrayBufferView, b: ArrayBufferView): number {
  const x = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  const y = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
  if (x.length !== y.length) return Math.max(x.length, y.length);
  let distintos = 0;
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) distintos++;
  return distintos;
}

describe("la pintura de seguido, contra la de pieza a pieza", async () => {
  const poner = vi.spyOn(Pintura.prototype, "poner");
  const geometria = vi.spyOn(Pintura.prototype, "geometria");
  afterAll(() => vi.restoreAllMocks());

  const vistos = new Set<string>();
  const campos: Scenario[] = [];
  for (const e of SCENARIOS) {
    const s = await conSuAerodromo(e);
    if (!s.aerodrome || vistos.has(s.aerodrome.id)) continue;
    vistos.add(s.aerodrome.id);
    const fino = relieve(e.id);
    campos.push({ ...s, ...(fino ? { relieve: fino } : {}) });
  }
  /** Lo que se ha visto en todos los campos, para saber que se miró de todo. */
  const visto = { mallas: 0, cuatro: 0, figuras: 0 };

  it("hay campos que mirar", () => {
    expect(campos.length).toBeGreaterThanOrEqual(19);
  });

  it.each(campos.map((c) => [c.aerodrome!.id, c] as const))(
    "%s: cada malla de pintura, byte a byte",
    (_id, campo) => {
      poner.mockClear();
      geometria.mockClear();
      const terreno = new Terrain(campo);
      createAerodrome(campo.aerodrome!, terreno.runwayElevation, { de: null, kt: 0 });

      const trozos = new Map<Pintura, (readonly Punto[])[]>();
      poner.mock.calls.forEach(([contorno], i) => {
        const p = poner.mock.contexts[i] as Pintura;
        const lista = trozos.get(p) ?? [];
        lista.push(contorno);
        trozos.set(p, lista);
      });
      geometria.mock.results.forEach((r, i) => {
        const p = geometria.mock.contexts[i] as Pintura;
        const hecha = r.value as BufferGeometry | null;
        const lista = trozos.get(p) ?? [];
        const piezas = lista.flatMap((c) => {
          if (c.length === 4) visto.cuatro++;
          else visto.figuras++;
          const g = piezaAPieza(c, p.suelo);
          return g ? [g] : [];
        });
        const antes = piezas.length ? mergeGeometries(piezas, false) : null;
        if (!antes) {
          expect(hecha, "sin piezas no hay malla").toBeNull();
          return;
        }
        expect(hecha).not.toBeNull();
        visto.mallas++;
        expect(Object.keys(hecha!.attributes)).toEqual(Object.keys(antes.attributes));
        expect(hecha!.index).toBeNull();
        for (const nombre of Object.keys(antes.attributes)) {
          const a = antes.getAttribute(nombre)!;
          const h = hecha!.getAttribute(nombre)!;
          expect(h.itemSize, nombre).toBe(a.itemSize);
          expect(h.normalized, nombre).toBe(a.normalized);
          expect(h.array.constructor, nombre).toBe(a.array.constructor);
          expect(h.count, nombre).toBe(a.count);
          expect(bytesDistintos(h.array, a.array), `${nombre}: bytes distintos`).toBe(0);
        }
      });
    },
    60_000,
  );

  it("se han mirado las dos clases de pieza: rejilla y figura", () => {
    expect(visto.mallas).toBeGreaterThan(19);
    expect(visto.cuatro).toBeGreaterThan(10_000);
    // Las flechas de los umbrales desplazados, que van por `desdePoligono`.
    expect(visto.figuras).toBeGreaterThan(0);
  });
});

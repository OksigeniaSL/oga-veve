/**
 * **Que cada modelo entregado cumpla el contrato** de `data/sitios/README.md`.
 *
 * El catálogo ya se comprueba en `sitios-con-modelo.test.ts`: que cada sitio
 * tenga su fichero, su línea en CREDITOS.md y su fuente. Aquí se abre cada
 * `.glb` de verdad y se mira lo que el juego da por hecho al cargarlo: que
 * sus lados no pasan de 250 m —la curva de la Tierra se dibuja doblando cada
 * vértice, y un lado más largo se quedaría recto—, que lleva el color en los
 * vértices y ninguna textura, que trae bultos con los que chocar y que no se
 * pasa del tope de triángulos de su ficha.
 *
 * Y lo que cada sitio necesita del mundo para no quedarse colgando ni
 * enterrado, contra el relieve que de verdad se carga.
 */

import { describe, expect, it } from "vitest";
import { Box3, type BufferGeometry, type Mesh, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SITIOS } from "./sitios-con-modelo";

const fs = () =>
  (
    globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }
  ).process.getBuiltinModule("node:fs") as {
    readFileSync(ruta: string): Uint8Array;
  };

/** El tope de triángulos de cada ficha (las «Fichas para Gaudí»). */
const TOPE: Record<string, number> = {
  itaipu: 12_000,
  "puente-encarnacion": 8_000,
  "puente-remanso": 3_000,
  auditorio: 6_000,
  "palacio-lopez": 4_000,
  trinidad: 4_000,
  agando: 3_000,
  nublo: 3_000,
  "puente-amistad": 3_000,
  "saltos-monday": 2_500,
  "observatorio-teide": 4_000,
  "roque-muchachos": 3_000,
};

async function abrir(id: string): Promise<Object3D> {
  const b = fs().readFileSync(`public/assets/sitios/${id}.glb`);
  const buf = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  return (await new GLTFLoader().parseAsync(buf, "")).scene;
}

describe("los modelos entregados", () => {
  for (const s of SITIOS) {
    it(`${s.id}: lados, color, bultos y tope`, async () => {
      const escena = await abrir(s.id);
      escena.updateMatrixWorld(true);
      let triangulos = 0;
      let bultos = 0;
      let peor = 0;
      let conTextura = false;
      let sinColor = 0;
      escena.traverse((o) => {
        const m = o as Mesh;
        if (!m.isMesh) return;
        if (/^bulto/i.test(m.name) || /^bulto/i.test(m.parent?.name ?? "")) {
          bultos++;
          return;
        }
        const geo = m.geometry as BufferGeometry;
        const pos = geo.getAttribute("position");
        const idx = geo.getIndex();
        const n = idx ? idx.count : pos.count;
        triangulos += n / 3;
        if (!geo.getAttribute("color")) sinColor++;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        conTextura ||= mats.some((x) => (x as { map?: unknown }).map != null);
        // Los lados, en metros del mundo: con la escala del nudo, por si la hay.
        const e = m.matrixWorld.elements;
        const escala = Math.max(Math.hypot(e[0]!, e[1]!, e[2]!), Math.hypot(e[8]!, e[9]!, e[10]!));
        const v = (i: number): number => (idx ? idx.getX(i) : i);
        for (let t = 0; t < n; t += 3)
          for (let k = 0; k < 3; k++) {
            const a = v(t + k);
            const b = v(t + ((k + 1) % 3));
            const d = Math.hypot(pos.getX(a) - pos.getX(b), pos.getY(a) - pos.getY(b), pos.getZ(a) - pos.getZ(b));
            if (d * escala > peor) peor = d * escala;
          }
      });
      expect(triangulos, s.id).toBeGreaterThan(0);
      expect(triangulos, s.id).toBeLessThanOrEqual(TOPE[s.id] ?? 12_000);
      expect(peor, `${s.id}: el lado más largo`).toBeLessThanOrEqual(250);
      expect(bultos, `${s.id}: bultos`).toBeGreaterThan(0);
      expect(sinColor, `${s.id}: mallas sin color en los vértices`).toBe(0);
      expect(conTextura, `${s.id}: con textura`).toBe(false);
      // Y de su tamaño: ni un milímetro ni un continente (escala aplicada).
      const caja = new Box3().setFromObject(escena);
      const largo = Math.max(caja.max.x - caja.min.x, caja.max.z - caja.min.z);
      expect(largo, s.id).toBeGreaterThan(50);
      expect(largo, s.id).toBeLessThan(10_000);
    });
  }
});

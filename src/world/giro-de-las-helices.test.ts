/**
 * **Cada hélice gira hacia donde gira la suya, y sus palas van hechas para
 * ese giro.** Giraban todas a la izquierda vistas desde el asiento, y las de
 * la flota giran a la derecha; el bimotor de pistón lleva la de la derecha al
 * revés. Ver `world/giro-de-las-helices.ts`.
 */

import { describe, expect, it } from "vitest";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Mesh, Vector3, type Object3D } from "three";
import { AIRCRAFT, PANAMBI, PYKASU } from "../flight/aircraft";
import { colocarModelo, ejesDeHelice } from "./aeronave-modelo";
import { signoDelGiro } from "./giro-de-las-helices";

const fs = (
  globalThis as unknown as { process: { getBuiltinModule(nombre: string): unknown } }
).process.getBuiltinModule("node:fs") as { readFileSync(ruta: string): Uint8Array };

async function modelo(id: string): Promise<Object3D> {
  const b = fs.readFileSync(`public/assets/aeronaves/${id}.glb`);
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const m = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
  m.scene.updateWorldMatrix(true, true);
  return m.scene;
}

/**
 * **Hacia dónde está hecha una hélice**, con el signo de `rotation.z`: su
 * borde de ataque va delante —hacia el morro— y del lado hacia el que gira, así
 * que en cada pala lo que se adelanta hacia el morro se aparta hacia ese lado.
 * Se mide pala a pala, sección a sección.
 */
function haciaDondeEstaHecha(eje: Object3D): number {
  const centro = new Vector3().setFromMatrixPosition(eje.matrixWorld);
  let suma = 0;
  eje.traverse((o) => {
    if (!(o instanceof Mesh) || !o.name.toLowerCase().includes("pala")) return;
    const pos = o.geometry.getAttribute("position");
    const v = new Vector3();
    // Las secciones, agrupadas por el ángulo de cada punto alrededor del eje.
    const grupos = new Map<number, Vector3[]>();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).sub(centro);
      if (Math.hypot(v.x, v.y) < 0.35) continue;
      const k = Math.round((Math.atan2(v.y, v.x) / (2 * Math.PI)) * 12);
      const g = grupos.get(k) ?? [];
      g.push(v.clone());
      grupos.set(k, g);
    }
    for (const g of grupos.values()) {
      if (g.length < 6) continue;
      const m = g.reduce((a, p) => a.add(p), new Vector3()).divideScalar(g.length);
      const radial = new Vector3(m.x, m.y, 0).normalize();
      // El sentido del giro positivo alrededor de +Z, que mira a la cola.
      const tangente = new Vector3(-radial.y, radial.x, 0);
      // Lo que se adelanta hacia el morro (−Z) y hacia dónde se aparta.
      for (const p of g) {
        const d = p.clone().sub(m);
        suma += d.dot(tangente) * -d.z;
      }
    }
  });
  return Math.sign(suma);
}

describe("hacia dónde gira cada hélice", () => {
  it("a la derecha vista desde el asiento, que es el giro convencional", () => {
    // El eje del dibujo mira a la cola: girar a la derecha desde el asiento es en negativo.
    expect(signoDelGiro(PYKASU, 0)).toBe(-1);
    for (const a of AIRCRAFT.filter((x) => !x.helicesContrarrotativas))
      for (const x of a.motoresA) expect(signoDelGiro(a, x), `${a.id} ${x}`).toBe(-1);
  });

  it("y en el bimotor de pistón, la de la derecha al revés, como un LTSIO-360", () => {
    expect(PANAMBI.helicesContrarrotativas).toBe(true);
    expect(signoDelGiro(PANAMBI, -2.45)).toBe(-1);
    expect(signoDelGiro(PANAMBI, 2.45)).toBe(1);
    // Es el único de la flota.
    expect(AIRCRAFT.filter((a) => a.helicesContrarrotativas).map((a) => a.id)).toEqual(["jaz-40"]);
  });

  /*
   * **Y las palas del dibujo, hechas para ese giro.** Una hélice que gira con
   * el borde de salida delante se ve, al ralentí, girando al revés de lo que
   * dicen sus palas, y quien la mire de cerca aprende algo que no es.
   */
  for (const id of ["jaz-20", "jaz-25", "jaz-40", "jaz-60"]) {
    it(`${id}: sus palas, hechas para el giro con el que se mueven`, async () => {
      const a = AIRCRAFT.find((x) => x.id === id)!;
      const raiz = await modelo(id);
      colocarModelo(raiz, a).updateWorldMatrix(true, true);
      const ejes = ejesDeHelice(raiz);
      expect(ejes.length, id).toBe(a.motoresA.length);
      for (const eje of ejes) {
        // El eje mira a la cola, que es lo que da el signo de `signoDelGiro`.
        expect(new Vector3(0, 0, 1).transformDirection(eje.matrixWorld).z, id).toBeGreaterThan(0.99);
        expect(haciaDondeEstaHecha(eje), `${id} ${eje.name}`).toBe(signoDelGiro(a, eje.position.x));
      }
    });
  }
});

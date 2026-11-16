/**
 * **La rueda de morro, la puerta y la punta de cada avión, contra su dibujo.**
 * Ver `rueda-de-morro.ts`: la ficha dice dónde va la rueda de morro y aquí se
 * mira que el `.glb` la tiene ahí, con la puerta y la punta donde las da la
 * tabla. Es lo que pone la rueda de morro en el punto del puesto (#191).
 */
import { describe, expect, it } from "vitest";
import { Box3, Vector3, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT } from "../flight/aircraft";
import { MODELO_DEL_TIPO } from "./cuerpos-del-trafico";
import { conLaRuedaEn, MORRO_DEL_TRAFICO, morroDe, ruedaDeMorroEn } from "./rueda-de-morro";
import { TIPOS } from "./trafico";

/* El `fs` de Node pedido en marcha, como en `apoyo.test.ts`. */
const fs = (
  globalThis as unknown as { process: { getBuiltinModule(nombre: string): unknown } }
).process.getBuiltinModule("node:fs") as { readFileSync(ruta: string): Uint8Array };

/** Lo medido en el `.glb`, con la Z hacia la cola y en sus metros. */
interface Medido {
  /** El centro de gravedad, o el de la caja si no lo trae. */
  readonly cdg: number | null;
  readonly centroDeLaCaja: number;
  readonly envergadura: number;
  readonly rueda: number;
  readonly punta: number;
  /** La puerta de más adelante, si tiene. */
  readonly puerta: number | null;
}

async function medir(id: string): Promise<Medido> {
  const b = fs.readFileSync(`public/assets/aeronaves/${id}.glb`);
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const raiz = (await new GLTFLoader().parseAsync(datos as ArrayBuffer, "")).scene;
  raiz.updateWorldMatrix(true, true);
  const caja = new Box3().setFromObject(raiz);
  const centro = (o: Object3D): Vector3 => new Box3().setFromObject(o).getCenter(new Vector3());
  // La de morro; en el de rueda de cola, las principales, que son las de delante.
  const rueda =
    raiz.getObjectByName("rueda-morro") ?? raiz.getObjectByName("rueda-de-morro") ?? raiz.getObjectByName("rueda-principal");
  let puerta: number | null = null;
  raiz.traverse((o) => {
    if (/^puerta-\d/.test(o.name)) puerta = Math.min(puerta ?? Infinity, centro(o).z);
  });
  return {
    cdg: raiz.getObjectByName("centro-de-gravedad")?.getWorldPosition(new Vector3()).z ?? null,
    centroDeLaCaja: (caja.min.z + caja.max.z) / 2,
    envergadura: caja.max.x - caja.min.x,
    rueda: centro(rueda!).z,
    punta: caja.min.z,
    puerta,
  };
}

describe("la rueda de morro, donde la tiene su dibujo", () => {
  for (const a of AIRCRAFT) {
    it(`${a.id}: la rueda por delante del centro, la puerta y la punta`, async () => {
      const m = await medir(a.id);
      const morro = morroDe(a);
      // Del centro de gravedad a la rueda: lo de la ficha, a un palmo.
      expect(Math.abs(m.cdg! - m.rueda - morro.rueda), a.id).toBeLessThan(0.15);
      expect(Math.abs(m.rueda - m.punta - morro.punta), a.id).toBeLessThan(0.15);
      if (m.puerta !== null) expect(Math.abs(m.rueda - m.puerta - morro.puerta), a.id).toBeLessThan(0.15);
    });
  }

  for (const t of Object.values(TIPOS)) {
    it(`el ${t.id} del tráfico, a su envergadura`, async () => {
      const m = await medir(MODELO_DEL_TIPO[t.id]!);
      const k = t.envergadura / m.envergadura;
      const morro = MORRO_DEL_TRAFICO[t.id];
      expect(Math.abs((m.centroDeLaCaja - m.rueda) * k - morro.rueda), t.id).toBeLessThan(0.2);
      expect(Math.abs((m.rueda - m.punta) * k - morro.punta), t.id).toBeLessThan(0.2);
      if (m.puerta !== null && morro.puerta !== 0)
        expect(Math.abs((m.rueda - m.puerta) * k - morro.puerta), t.id).toBeLessThan(0.2);
    });
  }

  it("poner la rueda en un punto y volver a leerla da el mismo punto", () => {
    const morro = { rueda: 10 };
    for (const rumbo of [0, 1, 2.5, -2]) {
      const p = { x: 3, z: -7 };
      const r = ruedaDeMorroEn(conLaRuedaEn(p, rumbo, morro), rumbo, morro);
      expect(r.x).toBeCloseTo(p.x, 9);
      expect(r.z).toBeCloseTo(p.z, 9);
    }
    // Mirando al norte, la referencia queda al sur de la rueda: diez metros más de `z`.
    expect(conLaRuedaEn({ x: 0, z: 0 }, 0, morro).z).toBeCloseTo(10, 9);
  });
});

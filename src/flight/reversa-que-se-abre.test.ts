/**
 * **La reversa que se abre, con su tiempo** (punto 254): en el modelo de
 * cada turbofán, el manguito que se va hacia la cola; y en la cuenta, que
 * tarda en abrirse y que no empuja hasta estar abierta.
 *
 * `reversa.test.ts` mira lo que frena; esto, lo que se ve y cuándo.
 */

import { describe, expect, it } from "vitest";
import { Box3, Vector3, type Mesh, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT, tieneReversa } from "./aircraft";
import { Reversa, TIEMPO_DE_REVERSA, tiempoDeReversa } from "./reversa";
import { prepararReversas, REVERSA } from "../world/reversas";

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

async function modelo(id: string): Promise<Object3D> {
  const b = fs.readFileSync(`public/assets/aeronaves/${id}.glb`);
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const m = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
  m.scene.updateWorldMatrix(true, true);
  return m.scene;
}

/** Simula `segundos` con la palanca puesta y devuelve cuándo empezó a empujar. */
function abrir(r: Reversa, segundos: number, palanca = 1, dt = 1 / 60) {
  let empujaDesde: number | null = null;
  for (let t = 0; t < segundos; t += dt) {
    const e = r.paso(dt, palanca);
    if (e > 0 && empujaDesde === null) empujaDesde = t + dt;
  }
  return empujaDesde;
}

describe("lo que tarda en abrirse", () => {
  it("dos segundos el manguito de un turbofán, uno las palas de un turbohélice", () => {
    expect(TIEMPO_DE_REVERSA.turbofan).toBe(2);
    expect(TIEMPO_DE_REVERSA.turboprop).toBe(1);
    for (const a of AIRCRAFT) {
      const t = tiempoDeReversa(a);
      if (!tieneReversa(a)) expect(t, a.id).toBeNull();
      else expect(t, a.id).toBe(a.sound.engine === "turbofan" ? 2 : 1);
    }
  });

  it("se abre a su paso: a medio tiempo, a medias", () => {
    const r = new Reversa(2);
    abrir(r, 1);
    expect(r.abierta).toBeCloseTo(0.5, 1);
    abrir(r, 1.1);
    expect(r.abierta).toBe(1);
  });

  it("y no empuja hasta estar abierta del todo, que es el cerrojo de la palanca", () => {
    const r = new Reversa(2);
    const desde = abrir(r, 3);
    expect(desde).not.toBeNull();
    expect(desde!).toBeGreaterThanOrEqual(1.99);
    expect(desde!).toBeLessThan(2.1);
    expect(r.empuje).toBe(1);
  });

  it("al soltarla deja de empujar en el acto, y se cierra en lo mismo que tardó", () => {
    const r = new Reversa(2);
    abrir(r, 3);
    expect(r.paso(1 / 60, 0)).toBe(0);
    abrir(r, 1, 0);
    expect(r.abierta).toBeGreaterThan(0.4);
    expect(r.abierta).toBeLessThan(0.55);
    abrir(r, 1.1, 0);
    expect(r.abierta).toBe(0);
  });

  it("y en un avión sin reversa, nada", () => {
    const r = new Reversa(null);
    expect(abrir(r, 3)).toBeNull();
    expect(r.abierta).toBe(0);
  });
});

describe("el manguito en el modelo", () => {
  const TURBOFANES = AIRCRAFT.filter((a) => a.sound.engine === "turbofan");

  it("son los dos reactores", () => {
    expect(TURBOFANES.map((a) => a.id)).toEqual(["jaz-90", "jaz-120"]);
  });

  for (const a of TURBOFANES) {
    it(`${a.id}: un vacío por estación de motor, con su manguito y su cascada`, async () => {
      const raiz = await modelo(a.id);
      const vacios: Object3D[] = [];
      raiz.traverse((o) => {
        if (REVERSA.test(o.name)) vacios.push(o);
      });
      // El JAZ 90, uno; el JAZ 120, el de dentro y el de fuera. Los de la
      // otra banda van en la misma malla, por simetría.
      expect(vacios.length).toBe(a.id === "jaz-120" ? 2 : 1);
      for (const v of vacios) {
        const motor = v.name.replace(REVERSA, "");
        let manguito: Mesh | null = null;
        v.traverse((h) => {
          if (h.name.startsWith(`${motor}-manguito`) && (h as Mesh).isMesh) manguito = h as Mesh;
        });
        expect(manguito, `${v.name} sin su manguito`).not.toBeNull();
        expect(raiz.getObjectByName(`${motor}-cascada`), `${motor} sin su cascada`).toBeTruthy();
      }
    });

    it(`${a.id}: abierta, el manguito se va hacia la cola lo que dice el modelo`, async () => {
      const raiz = await modelo(a.id);
      const reversas = prepararReversas(raiz)!;
      expect(reversas).not.toBeNull();
      const caja = (n: string) => {
        raiz.updateWorldMatrix(true, true);
        return new Box3().setFromObject(raiz.getObjectByName(n)!);
      };
      const nombre = raiz.getObjectByName(
        a.id === "jaz-120" ? "reversa-motor-0" : "reversa-motor",
      )!.name.replace(REVERSA, "");
      const cerrada = caja(`${nombre}-manguito`).getCenter(new Vector3());
      reversas.poner(1);
      const abierta = caja(`${nombre}-manguito`).getCenter(new Vector3());
      const se = abierta.clone().sub(cerrada);
      // Hacia la cola —la z positiva, en los ejes del avión— y nada de lado.
      expect(se.z).toBeCloseTo(reversas.recorridos[0]!, 2);
      expect(Math.abs(se.x)).toBeLessThan(1e-3);
      expect(Math.abs(se.y)).toBeLessThan(1e-3);
      // Y una pizca de la góndola: casi medio metro en el regional, casi uno
      // en el cuatrimotor, que es lo que se ve desde la ventanilla.
      expect(reversas.recorridos[0]!).toBeGreaterThan(a.id === "jaz-120" ? 0.7 : 0.35);
      reversas.poner(0);
      const otraVez = caja(`${nombre}-manguito`).getCenter(new Vector3());
      expect(otraVez.distanceTo(cerrada)).toBeLessThan(1e-4);
    });
  }

  it("y los de hélice y pistón no traen ninguno", async () => {
    for (const a of AIRCRAFT.filter((x) => x.sound.engine !== "turbofan")) {
      expect(prepararReversas(await modelo(a.id)), a.id).toBeNull();
    }
  });
});

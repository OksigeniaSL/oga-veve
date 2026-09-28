/**
 * **Cada tipo del tráfico, con un modelo de verdad**, y el turbohélice con el
 * suyo, que es de ala alta.
 *
 * Esperando en la cola de Los Rodeos, los turbohélices del tráfico eran el
 * dibujo de las islas —cuatrocientos triángulos, un tubo con dos tablas— a
 * treinta metros del morro de quien juega: «esos aviones se ven feos». Ver
 * «El turbohélice» en `cuerpos-del-trafico.ts`.
 */
import { describe, expect, it } from "vitest";
import { Box3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { hornear, MODELO_DEL_TIPO } from "./cuerpos-del-trafico";
import { TIPOS } from "./trafico";

/** El `fs` de Node, pedido en marcha: ver `flaps-del-modelo.test.ts`. */
const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
  existsSync(ruta: string): boolean;
};

const ruta = (id: string) => `public/assets/aeronaves/${id}.glb`;

async function cargar(id: string) {
  const b = fs.readFileSync(ruta(id));
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const modelo = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
  modelo.scene.updateWorldMatrix(true, true);
  return modelo.scene;
}

describe("los cuerpos del tráfico", () => {
  it("cada tipo tiene su modelo, y el fichero está", () => {
    for (const id of Object.keys(TIPOS)) {
      const modelo = MODELO_DEL_TIPO[id];
      expect(modelo, `${id} sin modelo`).toBeDefined();
      expect(fs.existsSync(ruta(modelo!)), `${modelo}.glb`).toBe(true);
    }
  });

  it("el turbohélice es de ala alta: el ala pasa por encima del fuselaje", async () => {
    const escena = await cargar(MODELO_DEL_TIPO.turbohelice!);
    const ala = escena.getObjectByName("ala");
    const fuselaje = escena.getObjectByName("fuselaje");
    expect(ala && fuselaje).toBeTruthy();
    const a = new Box3().setFromObject(ala!);
    const f = new Box3().setFromObject(fuselaje!);
    // Lo más bajo del ala, por encima del eje del fuselaje; de ala baja
    // quedaría por debajo.
    expect(a.min.y).toBeGreaterThan((f.min.y + f.max.y) / 2);
  });

  it("y se hornea a su envergadura, con lo que cuesta uno de la flota", async () => {
    const escena = await cargar(MODELO_DEL_TIPO.turbohelice!);
    const hecho = hornear(escena, TIPOS.turbohelice.envergadura, 1.5);
    expect(hecho).not.toBeNull();
    const caja = new Box3();
    hecho!.fijo.computeBoundingBox();
    caja.copy(hecho!.fijo.boundingBox!);
    hecho!.pintado.computeBoundingBox();
    if (hecho!.pintado.boundingBox) caja.union(hecho!.pintado.boundingBox);
    expect(caja.max.x - caja.min.x).toBeCloseTo(TIPOS.turbohelice.envergadura, 1);
    // Las ruedas, en el suelo del tráfico.
    expect(caja.min.y).toBeCloseTo(-1.5, 2);
    // Entre la avioneta y el reactor de la flota: ver «Lo que cuesta».
    expect(hecho!.triangulos).toBeGreaterThan(5000);
    expect(hecho!.triangulos).toBeLessThan(30000);
  });
});

/**
 * La vuelta al avión, medida en cada modelo que carga el juego: que cada cosa
 * que se mira en su clase tenga dónde mirarse, que las fundas estén donde van
 * —una bajo el ala en la avioneta, dos en el morro del de línea— y que medirlo
 * no cueste un arranque. Se mide una vez por avión, al cargar el modelo.
 */
import { describe, expect, it } from "vitest";
import type { Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT } from "../flight/aircraft";
import { modeloPorId } from "../flight/flota";
import { claseDeVuelta, LO_QUE_SE_MIRA } from "../flight/vuelta-al-avion";
import { colocarModelo } from "./aeronave-modelo";
import { puntosDelAvion } from "./puntos-del-avion";
import { puntosDeLaVuelta } from "./puntos-de-la-vuelta";

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

async function escenaDe(id: string): Promise<Object3D> {
  const b = fs.readFileSync(`public/assets/aeronaves/${id}.glb`);
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const modelo = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
  return modelo.scene;
}

describe("la vuelta al avión en cada modelo", () => {
  for (const a of AIRCRAFT) {
    it(`${a.id}: lo que se mira en su clase tiene dónde mirarse`, async () => {
      const raiz = await escenaDe(a.id);
      const grupo = colocarModelo(raiz, a);
      const t0 = performance.now();
      const v = puntosDeLaVuelta(raiz, grupo, a, puntosDelAvion(raiz, grupo, a));
      const ms = performance.now() - t0;
      // Medido en el portátil: de 2 a 8 ms por avión (el primero calienta). Una vez por carga.
      expect(ms).toBeLessThan(400);
      const silueta = modeloPorId(a.id)?.silueta;
      const clase = claseDeVuelta(silueta);
      for (const c of LO_QUE_SE_MIRA[clase]) {
        // El biplano no lleva punto de pitot: ver `sitioDelPitot`.
        if (c === "pitot" && silueta === "biplano") {
          expect(v.puntos.has(c)).toBe(false);
          continue;
        }
        expect(v.puntos.has(c), c).toBe(true);
      }
      expect(v.rueda).not.toBeNull();
      if (clase === "linea") {
        // Una a cada lado del morro, delante del ala.
        expect(v.fundas).toHaveLength(2);
        expect(v.fundas[0]!.x).toBeCloseTo(-v.fundas[1]!.x, 5);
      } else if (silueta !== "biplano") {
        // Una sola, bajo el ala izquierda.
        expect(v.fundas).toHaveLength(1);
        expect(v.fundas[0]!.x).toBeLessThan(0);
      }
      // La boca del combustible, encima del ala.
      const boca = v.puntos.get("combustible");
      if (clase === "avioneta") expect(boca!.donde.y).toBeGreaterThan(v.rueda!.max.y);
    });
  }
});

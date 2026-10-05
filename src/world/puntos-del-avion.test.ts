/**
 * Los puntos de la tarjeta, medidos en cada modelo que carga el juego.
 *
 * Es un contrato entre tres sitios: la ficha del avión dice qué lleva —flaps,
 * aerofrenos, tren que se guarda—, el guion de Blender pone las piezas con su
 * nombre y `puntos-del-avion.ts` las encuentra. Si un día se separan, la
 * tarjeta enseñaría un punto de flaps en un avión sin flaps, o ninguno donde
 * los hay. Esto lo caza sin abrir el juego.
 */
import { describe, expect, it } from "vitest";
import { Box3, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT } from "../flight/aircraft";
import { montarModeloDeLaTarjeta } from "./modelo-de-la-tarjeta";
import { explicacionDe } from "../ui/explicaciones-del-avion";
import { ES_PY } from "../i18n/es-PY";
import { EN } from "../i18n/en";

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

describe("los puntos de la tarjeta en cada modelo", () => {
  for (const a of AIRCRAFT) {
    it(`${a.id}: cada pieza que lleva tiene su punto, y ninguna que no lleva`, async () => {
      const raiz = await escenaDe(a.id);
      let antes = 0;
      raiz.traverse((o) => {
        if ((o as { isMesh?: boolean }).isMesh) antes += 1;
      });
      const m = montarModeloDeLaTarjeta(raiz, a);
      const piezas = m.puntos.map((p) => p.pieza);

      // Los mandos de todos y lo que todos llevan.
      for (const pieza of ["alerones", "profundidad", "timon", "motor", "tren", "luces"] as const)
        expect(piezas, pieza).toContain(pieza);
      // Y lo que no todos llevan, según su ficha.
      expect(piezas.includes("flaps")).toBe(a.llevaFlaps);
      expect(piezas.includes("aerofrenos")).toBe(a.aerofrenos !== null);
      // El pitot, menos en el biplano: ver `sitioDelPitot`.
      expect(piezas.includes("pitot")).toBe(a.id !== "jaz-25");
      // Ninguna dos veces.
      expect(new Set(piezas).size).toBe(piezas.length);

      // Encima del avión, no flotando lejos de él.
      m.grupo.updateWorldMatrix(true, true);
      const caja = new Box3().setFromObject(m.grupo).expandByScalar(0.6);
      for (const p of m.puntos) {
        expect(caja.containsPoint(p.donde), p.pieza).toBe(true);
        // Y del lado izquierdo, que es el que se refleja. Ver `PuntoDelAvion`.
        expect(p.donde.x, p.pieza).toBeLessThanOrEqual(0.01);
      }

      // Lo de dentro, escondido: menos mallas que dibujar.
      expect(m.mallas).toBeLessThan(antes);
    });
  }

  /*
   * Y cada punto tiene qué contar, en los dos idiomas: el globo y la voz.
   */
  it("cada punto de cada avión tiene su explicación escrita", () => {
    for (const a of AIRCRAFT)
      for (const pieza of [
        "alerones",
        "profundidad",
        "timon",
        "flaps",
        "aerofrenos",
        "pitot",
        "motor",
        "tren",
        "luces",
      ] as const) {
        const e = explicacionDe(pieza, a);
        expect(ES_PY[e.texto], e.id).toBeTruthy();
        expect(ES_PY[e.voz], e.id).toBeTruthy();
        expect(EN[e.texto], e.id).toBeTruthy();
        expect(EN[e.voz], e.id).toBeTruthy();
      }
  });

  it("cada avión explica su motor, no el de otro", () => {
    const motor = (id: string) => explicacionDe("motor", AIRCRAFT.find((a) => a.id === id)!).id;
    expect(motor("jaz-20")).toBe("avion.motor-piston");
    expect(motor("jaz-25")).toBe("avion.motor-radial");
    expect(motor("jaz-60")).toBe("avion.turbohelice");
    expect(motor("jaz-120")).toBe("avion.reactor");
    const tren = (id: string) => explicacionDe("tren", AIRCRAFT.find((a) => a.id === id)!).id;
    expect(tren("jaz-20")).toBe("avion.tren-fijo");
    expect(tren("jaz-90")).toBe("avion.tren");
  });
});

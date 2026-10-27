/**
 * **Que la ciudad sorteada deje libre la manzana de un sitio, y nada más.**
 *
 * - En el hueco no hay ni una caja, ni pegada a su borde.
 * - Fuera, la ciudad es la misma caja a caja: el sorteo no se corre.
 * - Y el hueco del Palacio de López cae donde está el palacio.
 */

import { describe, expect, it } from "vitest";
import { InstancedMesh, Matrix4, Vector3 } from "three";
import { crearCiudad, enUnHueco, huecosDeLaCiudad, type Ciudad, type HuecoDeCiudad } from "./ciudad";

const fs = () =>
  (
    globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }
  ).process.getBuiltinModule("node:fs") as { readFileSync(ruta: string, cod: string): string };

/** Una ciudad de prueba: cuatro por cuatro celdas, todas llenas. */
function ciudadLlena(): Ciudad {
  const lado = 4;
  return {
    id: "prueba",
    tamanoM: 800,
    rejilla: { lado, clase: new Uint8Array(lado * lado).fill(1), densidad: new Uint8Array(lado * lado).fill(255) },
    vias: [],
  };
}

/** Los centros de todas las cajas, en el plano. */
function centros(ciudad: ReturnType<typeof crearCiudad>): { x: number; z: number }[] {
  const salida: { x: number; z: number }[] = [];
  const m = new Matrix4();
  const p = new Vector3();
  ciudad.traverse((o) => {
    if (!(o instanceof InstancedMesh)) return;
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m);
      p.setFromMatrixPosition(m);
      salida.push({ x: p.x, z: p.z });
    }
  });
  return salida;
}

describe("los huecos de la ciudad", () => {
  // Un cuadrado de doscientos metros en el centro.
  const hueco: HuecoDeCiudad = [
    { x: -100, z: -100 },
    { x: 100, z: -100 },
    { x: 100, z: 100 },
    { x: -100, z: 100 },
  ];
  const hacer = (huecos: HuecoDeCiudad[]) =>
    crearCiudad(ciudadLlena(), () => 10, () => false, 0, false, undefined, undefined, undefined, huecos);

  it("dentro y pegado al borde, nada", () => {
    expect(enUnHueco([hueco], 0, 0, 5)).toBe(true);
    expect(enUnHueco([hueco], 105, 0, 10)).toBe(true);
    expect(enUnHueco([hueco], 130, 0, 10)).toBe(false);
    const cajas = centros(hacer([hueco]));
    expect(cajas.length).toBeGreaterThan(20);
    for (const c of cajas) expect(Math.max(Math.abs(c.x), Math.abs(c.z))).toBeGreaterThan(100);
  });

  it("fuera, la misma ciudad caja a caja", () => {
    const sin = centros(hacer([]));
    const con = centros(hacer([hueco]));
    const clave = (c: { x: number; z: number }) => `${c.x.toFixed(3)},${c.z.toFixed(3)}`;
    const deCon = new Set(con.map(clave));
    const fuera = sin.filter((c) => !enUnHueco([hueco], c.x, c.z, 0));
    // Todas las de fuera siguen donde estaban, salvo las pegadas al borde.
    const lejos = fuera.filter((c) => !enUnHueco([hueco], c.x, c.z, 40));
    expect(lejos.length).toBeGreaterThan(10);
    for (const c of lejos) expect(deCon.has(clave(c))).toBe(true);
    expect(con.length).toBeLessThan(sin.length);
  });

  it("el del Palacio de López, sobre el palacio y en el mundo de Asunción", () => {
    const datos = JSON.parse(fs().readFileSync("data/cities/huecos.json", "utf8"));
    const origen = { lat: -25.240156, lon: -57.519227 };
    const huecos = huecosDeLaCiudad(origen, datos, 30_000);
    expect(huecos.length).toBeGreaterThanOrEqual(2);
    // El centro del palacio en OpenStreetMap (way/957263953).
    const k = Math.cos((origen.lat * Math.PI) / 180);
    const x = ((-57.637324 - origen.lon) * 6371000 * Math.PI * k) / 180;
    const z = -((-25.277381 - origen.lat) * 6371000 * Math.PI) / 180;
    expect(enUnHueco(huecos, x, z, 0)).toBe(true);
    // Y a un kilómetro, ciudad.
    expect(enUnHueco(huecos, x + 1000, z, 0)).toBe(false);
  });
});

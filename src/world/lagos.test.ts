/**
 * **Que los lagos sean agua donde lo son, y a su cota.**
 *
 * - Dentro del contorno, agua; en una isla, no; fuera, tampoco.
 * - La lámina cubre el lago entero y nada más, con los triángulos cortos
 *   para que se doble con la Tierra como el suelo.
 * - Y los de verdad: el Ypacaraí a 63 m y el embalse de Itaipú a 220, con
 *   su contorno de OpenStreetMap.
 */

import { describe, expect, it } from "vitest";
import { MeshLambertMaterial, ShaderMaterial } from "three";
import { AguaDeLosLagos, cajaDelLago, laminaDelLago, materialDelLago, type Lago } from "./lagos";

const R = 6371008;
const RAD = Math.PI / 180;

/** Un lago cuadrado de diez kilómetros con una isla de dos en medio. */
function lagoDePrueba(): Lago {
  const d = 5000 / (R * RAD);
  const i = 1000 / (R * RAD);
  return {
    id: "prueba",
    nombre: "Prueba",
    cota: 100,
    de: "prueba",
    exteriores: [
      [
        [-d, -d],
        [-d, d],
        [d, d],
        [d, -d],
        [-d, -d],
      ],
    ],
    interiores: [
      [
        [-i, -i],
        [i, -i],
        [i, i],
        [-i, i],
        [-i, -i],
      ],
    ],
  };
}

const aMetros = (lat: number, lon: number) => ({ x: lon * R * RAD, z: -lat * R * RAD });

describe("los lagos", () => {
  const lago = lagoDePrueba();
  const agua = new AguaDeLosLagos([lago]);
  const grados = (m: number) => m / (R * RAD);

  it("dentro es agua a su cota; en la isla y fuera, no", () => {
    expect(agua.cotaEn(grados(3000), grados(-3000))).toBe(100);
    expect(agua.cotaEn(0, 0)).toBeNull();
    expect(agua.cotaEn(grados(6000), 0)).toBeNull();
    // Y la misma fila dos veces seguidas, que es como se pregunta.
    expect(agua.cotaEn(grados(3000), grados(3000))).toBe(100);
  });

  it("la lámina cubre el lago sin la isla, con triángulos cortos", () => {
    const geo = laminaDelLago(lago, aMetros);
    const p = geo.getAttribute("position");
    let area = 0;
    let lado = 0;
    for (let t = 0; t < p.count; t += 3) {
      const ax = p.getX(t);
      const az = p.getZ(t);
      const bx = p.getX(t + 1);
      const bz = p.getZ(t + 1);
      const cx = p.getX(t + 2);
      const cz = p.getZ(t + 2);
      const cruz = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
      // Hacia arriba: en x-z con la z al sur, el sentido de las agujas.
      expect(cruz).toBeLessThanOrEqual(0);
      area += Math.abs(cruz) / 2;
      lado = Math.max(lado, Math.hypot(bx - ax, bz - az), Math.hypot(cx - bx, cz - bz), Math.hypot(ax - cx, az - cz));
    }
    expect(area).toBeCloseTo(10000 * 10000 - 2000 * 2000, -4);
    expect(lado).toBeLessThanOrEqual(3000);
  });

  it("toma el agua del mar sin preguntar a sus orillas", () => {
    const mar = new ShaderMaterial({
      uniforms: { conOrillas: { value: 1 }, sol: { value: 1 } },
      vertexShader: "void main(){}",
      fragmentShader: "void main(){}",
      transparent: true,
    });
    const delLago = materialDelLago(mar) as ShaderMaterial;
    expect(delLago.uniforms.conOrillas!.value).toBe(0);
    expect(mar.uniforms.conOrillas!.value).toBe(1);
    // El resto, compartido: se mueve con el del mar.
    expect(delLago.uniforms.sol).toBe(mar.uniforms.sol);
    // Y sin material del cielo, el que haya.
    const lambert = new MeshLambertMaterial();
    expect(materialDelLago(lambert)).toBe(lambert);
  });
});

const fs = () =>
  (
    globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }
  ).process.getBuiltinModule("node:fs") as { readFileSync(ruta: string, cod: string): string };

describe("los lagos de verdad", () => {
  const { lagos } = JSON.parse(fs().readFileSync("data/terrain/lagos.json", "utf8")) as { lagos: Lago[] };
  const agua = new AguaDeLosLagos(lagos);

  it("el Ypacaraí, a 63 m, con San Bernardino en la orilla y el lago en medio", () => {
    const y = lagos.find((l) => l.id === "ypacarai")!;
    expect(y.cota).toBe(63);
    expect(y.de).toMatch(/^osm relation\//);
    expect(agua.cotaEn(-25.3, -57.35)).toBe(63);
    // San Bernardino, en la orilla este: tierra.
    expect(agua.cotaEn(-25.311, -57.297)).toBeNull();
  });

  it("el embalse de Itaipú, a 220 m, aguas arriba de la presa y no aguas abajo", () => {
    const i = lagos.find((l) => l.id === "itaipu")!;
    expect(i.cota).toBe(220);
    expect(agua.cotaEn(-25.38, -54.57)).toBe(220);
    // El río al pie de la central, a ciento y pico: no es el embalse.
    expect(agua.cotaEn(-25.4095, -54.5878)).toBeNull();
    const caja = cajaDelLago(i);
    // Llega a Guaíra, ciento setenta kilómetros al norte.
    expect(caja.norte).toBeGreaterThan(-24.3);
  });
});

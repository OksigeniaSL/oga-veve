/**
 * **Lo que se dice que se ve, se ve**: desde el asiento de Ara, en el JAZ 90
 * de verdad, el ala y el motor. «¡Me tocó la ventanilla! Desde acá se ve el
 * ala del avión, y el motor» se dice pegada al cristal —el plano
 * `asomado-motor`—, y con rayos por el cristal se cuenta lo que se ve. Ver
 * `world/asiento-de-ara.ts`.
 *
 * Y el porqué del asiento: desde el de siempre, sentado, el motor no asoma
 * —es lo que vio Enrique—. Si algún día cambia el modelo y deja de verse, esto
 * salta antes que nadie lo note en una captura.
 */
import { describe, expect, it } from "vitest";
import type { Group } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT } from "../flight/aircraft";
import { AVION_DEL_PASAJE, LADO_DE_ARA } from "../flight/inicio-pasaje";
import { colocarModelo } from "./aeronave-modelo";
import { loQueSeVeDesde, mallasDeFuera, POSES_DE_ARA } from "./asiento-de-ara";
import { medirElPasaje, OJOS_A, type Pasaje } from "./asiento-de-pasaje";

const fs = (
  globalThis as unknown as { process: { getBuiltinModule(nombre: string): unknown } }
).process.getBuiltinModule("node:fs") as { readFileSync(ruta: string): Uint8Array };

async function montar(id: string): Promise<{ grupo: Group; pasaje: Pasaje; raiz: Group }> {
  const a = AIRCRAFT.find((x) => x.id === id)!;
  const b = fs.readFileSync(`public/assets/aeronaves/${a.id}.glb`);
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const modelo = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
  const grupo = colocarModelo(modelo.scene, a);
  return { grupo, pasaje: medirElPasaje(modelo.scene, grupo)!, raiz: modelo.scene as unknown as Group };
}

describe("el asiento de Ara, en el avión de la escena", () => {
  it("existe, de los dos lados, sobre el motor y dentro del avión", async () => {
    const { pasaje } = await montar(AVION_DEL_PASAJE);
    for (const lado of ["izquierda", "derecha"] as const) {
      const ara = pasaje.deAra[lado];
      expect(ara, lado).not.toBeNull();
      const v = ara!.ventanilla;
      // La ventanilla, la de su lado; y los ojos, dentro, también pegada al cristal.
      expect(Math.sign(v.centro.x)).toBe(lado === "izquierda" ? -1 : 1);
      for (const pose of Object.values(ara!.poses)) {
        expect(Math.abs(pose.ojo.x)).toBeLessThan(Math.abs(v.centro.x) - 0.12);
        expect(Math.sign(pose.guinada)).toBe(lado === "izquierda" ? 1 : -1);
        // Y sin su asiento vacío detrás, que en él va Ara. Ver `conLaPose`.
        expect(pose.sentado).toBeFalsy();
      }
    }
  });

  it("pegada al cristal, se ven el motor y el ala: lo que dice Ara", async () => {
    const { pasaje, grupo, raiz } = await montar(AVION_DEL_PASAJE);
    const ara = pasaje.deAra[LADO_DE_ARA]!;
    const ve = loQueSeVeDesde(ara.poses.motor, mallasDeFuera(raiz), grupo);
    // Medido: un 6 % de la imagen es motor y un 7 % ala. Con margen.
    expect(ve.motor, `motor ${(ve.motor * 100).toFixed(1)} %`).toBeGreaterThan(0.03);
    expect(ve.ala, `ala ${(ve.ala * 100).toFixed(1)} %`).toBeGreaterThan(0.03);
    // Y el cristal se lleva buena parte de la pantalla: es la cara pegada a él.
    expect(ve.cristal).toBeGreaterThan(0.25);
  });

  it("sentada, el paisaje con su horizonte; y mirando abajo, mucho suelo", async () => {
    const { pasaje, grupo, raiz } = await montar(AVION_DEL_PASAJE);
    const ara = pasaje.deAra[LADO_DE_ARA]!;
    const mallas = mallasDeFuera(raiz);
    const sentada = loQueSeVeDesde(ara.poses.sentada, mallas, grupo);
    expect(sentada.cielo).toBeGreaterThan(0.02);
    expect(sentada.suelo).toBeGreaterThan(0.02);
    const abajo = loQueSeVeDesde(ara.poses.abajo, mallas, grupo);
    expect(abajo.suelo).toBeGreaterThan(abajo.cielo);
    expect(abajo.suelo).toBeGreaterThan(sentada.suelo);
  });

  it("y por qué ese asiento: desde el de siempre, sentado, el motor no asoma", async () => {
    const { pasaje, grupo, raiz } = await montar(AVION_DEL_PASAJE);
    const deSiempre = pasaje[LADO_DE_ARA];
    const ve = loQueSeVeDesde(deSiempre, mallasDeFuera(raiz), grupo);
    expect(ve.motor).toBeLessThan(0.005);
    // Y el de Ara está por delante de él, encima del motor.
    expect(pasaje.deAra[LADO_DE_ARA]!.ventanilla.centro.z).toBeLessThan(deSiempre.ventanilla.centro.z);
  });

  it("las poses, más cerca del cristal que el respaldo, y pegada mucho más", () => {
    expect(POSES_DE_ARA.sentada.ojosA).toBeLessThan(OJOS_A);
    expect(POSES_DE_ARA.motor.ojosA).toBeLessThan(0.3);
    expect(POSES_DE_ARA.abajo.abajo).toBeGreaterThan(POSES_DE_ARA.motor.abajo);
  });

  it("y en otro avión, si lo hay, es porque desde él se ve su motor", async () => {
    // El JAZ 60, turbohélice de ala alta: el motor va encima, en la góndola.
    const { pasaje } = await montar("jaz-60");
    const ara = pasaje.deAra[LADO_DE_ARA];
    if (ara) expect(ara.delMotor.motor).toBeGreaterThan(0);
  });
});

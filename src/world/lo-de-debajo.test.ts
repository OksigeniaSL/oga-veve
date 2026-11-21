/**
 * **Lo de debajo, medido por la vista y no por un punto** (H59b), en el JAZ 90
 * de verdad: con la cara contra el cristal mirando abajo, los ojos llegan a la
 * góndola del motor y el mar llena la mitad de arriba de la ventanilla. La
 * escena —`seVeLoDeDebajo`— y el banco —`loDeDebajoEnLaVista`— lo dan por
 * visto; y siguen viendo un fallo: tapado del todo por el avión, o el mar
 * nombrado sobre tierra, no.
 */
import { describe, expect, it } from "vitest";
import { MathUtils, PerspectiveCamera, Quaternion, Raycaster, Vector3, type Group, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT } from "../flight/aircraft";
import { AVION_DEL_PASAJE, LADO_DE_ARA } from "../flight/inicio-pasaje";
import { FOV_DE_PASAJE } from "../cameras/pasaje";
import { loDeDebajoEnLaVista, type ElMundoDelBanco } from "../dev/vista-para-banco";
import { colocarModelo } from "./aeronave-modelo";
import { loTapaElAvionDesde, mallasDeFuera } from "./asiento-de-ara";
import { asientoAnteVentanilla, medirElPasaje, type AsientoDePasaje, type Pasaje } from "./asiento-de-pasaje";
import { seVePorLaVentanilla } from "./marco-de-ventanilla";
import {
  cuantoSeVeLoDeDebajo,
  miradaDe,
  ojosEnElMundo,
  PEGADA_AL_CRISTAL,
  POR_LA_VENTANILLA,
  SE_VE_LO_DE_DEBAJO,
  seVeDesdeElAsiento,
  type ElMundoQueSeMira,
  type Punto,
} from "./se-ve-desde-el-pasaje";

const fs = (
  globalThis as unknown as { process: { getBuiltinModule(nombre: string): unknown } }
).process.getBuiltinModule("node:fs") as { readFileSync(ruta: string): Uint8Array };

async function montar(): Promise<{ grupo: Group; pasaje: Pasaje; mallas: Object3D[] }> {
  const a = AIRCRAFT.find((x) => x.id === AVION_DEL_PASAJE)!;
  const b = fs.readFileSync(`public/assets/aeronaves/${a.id}.glb`);
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const modelo = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
  const grupo = colocarModelo(modelo.scene, a);
  return { grupo, pasaje: medirElPasaje(modelo.scene, grupo)!, mallas: mallasDeFuera(modelo.scene) };
}

/** Un mundo sin nube ni bruma: todo mar, o todo tierra a ras del agua. */
function mundoLlano(): ElMundoQueSeMira {
  return { suelo: () => 0, nubes: () => 1, dentro: () => 0, bruma: () => 0 };
}

/** El avión, en vuelo recto a esa altura y con ese rumbo, y su malla colocada ahí. */
function enVuelo(grupo: Group, altura: number, rumbo = 0): { position: Vector3; orientation: Quaternion; largo: number } {
  const avion = {
    position: new Vector3(0, altura, 0),
    orientation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -rumbo * MathUtils.DEG2RAD),
    largo: 40,
  };
  grupo.position.copy(avion.position);
  grupo.quaternion.copy(avion.orientation);
  grupo.updateMatrixWorld(true);
  return avion;
}

/** Adonde llegan los ojos sobre el agua, a ras de cero. */
function dondeMiran(pose: AsientoDePasaje, avion: { position: Vector3; orientation: Quaternion; largo: number }): Punto {
  const ojo = ojosEnElMundo(pose, avion);
  const d = miradaDe(pose, avion);
  const t = -ojo.y / d.y;
  return { x: ojo.x + d.x * t, y: 5, z: ojo.z + d.z * t };
}

/** La cuenta de la escena, como la hace `mirarElSitio` en `game.ts`, con lo que hay debajo dicho por `esMar`. */
function laEscena(
  pose: AsientoDePasaje,
  avion: { position: Vector3; orientation: Quaternion; largo: number },
  grupo: Group,
  mallas: Object3D[],
  quiereMar: boolean,
  esMar: (q: Punto) => boolean,
): number | null {
  const mundo = mundoLlano();
  const ojo = ojosEnElMundo(pose, avion);
  return cuantoSeVeLoDeDebajo(
    ojo,
    dondeMiran(pose, avion),
    mundo.suelo,
    (q) => seVePorLaVentanilla(ojo, q, avion, pose.ventanilla),
    (q) =>
      esMar(q) === quiereMar &&
      seVeDesdeElAsiento(pose, q, avion, mundo, POR_LA_VENTANILLA) &&
      !loTapaElAvionDesde(pose, q, avion, mallas, grupo),
  );
}

/**
 * La cuenta del banco, con una cámara puesta en la pose como la de pasaje:
 * por los ojos, mirando adonde miran y un poco más arriba —en el banco, lo
 * mirado cae en (0,00, −0,32) de la imagen—, a 1280×800.
 */
function elBanco(
  pose: AsientoDePasaje,
  avion: { position: Vector3; orientation: Quaternion; largo: number },
  mallas: Object3D[],
  esLoDicho: (q: Punto) => boolean,
  arriba = Math.atan(0.32 * Math.tan(((pose.fov ?? FOV_DE_PASAJE) / 2) * MathUtils.DEG2RAD)),
): number | null {
  const camara = new PerspectiveCamera(pose.fov ?? FOV_DE_PASAJE, 1280 / 800, 0.05, 60_000);
  camara.position.copy(ojosEnElMundo(pose, avion));
  camara.quaternion
    .copy(avion.orientation)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), pose.guinada))
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), pose.cabeceo + arriba));
  camara.updateMatrixWorld(true);
  const mirado = new Vector3().copy(dondeMiran(pose, avion)).project(camara);
  const rayo = new Raycaster();
  const mundo: ElMundoDelBanco = {
    llega: (ojo, dir) => (dir.y < -0.01 ? { x: ojo.x - (dir.x * ojo.y) / dir.y, y: 0, z: ojo.z - (dir.z * ojo.y) / dir.y } : null),
    porElCristal: (ojo, dir, fin) =>
      seVePorLaVentanilla(ojo, fin ?? { x: ojo.x + dir.x * 1e5, y: ojo.y + dir.y * 1e5, z: ojo.z + dir.z * 1e5 }, avion, pose.ventanilla),
    tapaElAvion: (ojo, dir, lejos) => {
      rayo.set(ojo, dir);
      rayo.far = Math.min(lejos, 120);
      return rayo.intersectObjects(mallas, false).length > 0;
    },
    esLoDicho,
    nubeDensa: () => 0,
  };
  return loDeDebajoEnLaVista(camara, mirado.x, mirado.y, mundo);
}

const todoMar = (): boolean => true;
const todoTierra = (): boolean => false;

describe("lo de debajo, por la vista y no por un punto (H59b)", () => {
  it("con la cara contra el cristal mirando abajo, los ojos llegan a la góndola, y el mar se ve igual", async () => {
    const { grupo, pasaje, mallas } = await montar();
    const pose = pasaje.deAra[LADO_DE_ARA]!.poses.abajo;
    for (const altura of [300, 1000, 3000])
      for (const rumbo of [0, 77, 250]) {
        const avion = enVuelo(grupo, altura, rumbo);
        // Es lo que vio el banco de H59: el punto adonde llegan los ojos, detrás del motor.
        expect(loTapaElAvionDesde(pose, dondeMiran(pose, avion), avion, mallas, grupo), `${altura} m`).toBe(true);
        // Medido: la escena, de 0,50 a 0,63 de la vista por el cristal; el banco, de 0,48 a 0,50.
        const escena = laEscena(pose, avion, grupo, mallas, true, todoMar)!;
        expect(escena, `escena a ${altura} m, rumbo ${rumbo}`).toBeGreaterThanOrEqual(SE_VE_LO_DE_DEBAJO);
        expect(escena).toBeLessThan(0.8);
        const banco = elBanco(pose, avion, mallas, todoMar)!;
        expect(banco, `banco a ${altura} m, rumbo ${rumbo}`).toBeGreaterThanOrEqual(0.4);
        expect(banco).toBeLessThan(0.8);
      }
  });

  it("sentada, la tierra de debajo se ve, con el ala abajo de la ventanilla", async () => {
    const { grupo, pasaje, mallas } = await montar();
    const pose = pasaje.deAra[LADO_DE_ARA]!.poses.sentada;
    const avion = enVuelo(grupo, 300, 120);
    expect(laEscena(pose, avion, grupo, mallas, false, todoTierra)).toBeGreaterThan(0.9);
    // El banco cuenta también el cielo de arriba de la ventanilla, que no es la tierra: 0,73.
    expect(elBanco(pose, avion, mallas, () => true)).toBeGreaterThan(0.6);
  });

  it("el mar nombrado sobre tierra, o la tierra sobre el mar, no se ve", async () => {
    const { grupo, pasaje, mallas } = await montar();
    const ara = pasaje.deAra[LADO_DE_ARA]!;
    const avion = enVuelo(grupo, 1000, 0);
    for (const pose of [ara.poses.abajo, ara.poses.sentada]) {
      expect(laEscena(pose, avion, grupo, mallas, true, todoTierra)).toBe(0);
      expect(laEscena(pose, avion, grupo, mallas, false, todoMar)).toBe(0);
      expect(elBanco(pose, avion, mallas, todoTierra)).toBe(0);
    }
  });

  it("tapado del todo por el ala, no se ve: mirando abajo y hacia el ala, hasta donde da el cuello", async () => {
    const { grupo, pasaje, mallas } = await montar();
    const ara = pasaje.deAra[LADO_DE_ARA]!;
    // Cuarenta grados abajo —el tope del cuello— y treinta hacia atrás: por el cristal, ala y motor.
    const pose = asientoAnteVentanilla(ara.ventanilla, LADO_DE_ARA, 30 * MathUtils.DEG2RAD, 40 * MathUtils.DEG2RAD, PEGADA_AL_CRISTAL);
    const avion = enVuelo(grupo, 1000, 0);
    expect(loTapaElAvionDesde(pose, dondeMiran(pose, avion), avion, mallas, grupo)).toBe(true);
    // Hay vista —algo cae por el cristal—, y en toda ella está el avión.
    expect(laEscena(pose, avion, grupo, mallas, true, todoMar)).toBe(0);
    expect(elBanco(pose, avion, mallas, todoMar, 0)).toBe(0);
  });

  it("lo escondido no tapa: con el ala oculta, el mismo cuello lo ve todo", async () => {
    const { grupo, pasaje, mallas } = await montar();
    const ara = pasaje.deAra[LADO_DE_ARA]!;
    const pose = asientoAnteVentanilla(ara.ventanilla, LADO_DE_ARA, 30 * MathUtils.DEG2RAD, 40 * MathUtils.DEG2RAD, PEGADA_AL_CRISTAL);
    const avion = enVuelo(grupo, 1000, 0);
    const ocultas = mallas.filter((m) => /^(ala|flap|aleron|aerofreno|motor|pilon|gondola|toma)/.test(m.name));
    for (const m of ocultas) m.visible = false;
    try {
      expect(laEscena(pose, avion, grupo, mallas, true, todoMar)).toBe(1);
    } finally {
      for (const m of ocultas) m.visible = true;
    }
  });
});

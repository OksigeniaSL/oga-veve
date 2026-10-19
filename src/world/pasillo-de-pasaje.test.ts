/**
 * **Lo que ve Ara asomada al pasillo**, en el JAZ 90 de verdad (punto 312):
 * la salida más cercana con su letrero encendido, a la vista y sin nada
 * delante, y las tiras del suelo que llevan a ella. Y que las puertas del
 * modelo son las salidas que dice la demostración: dos delante y dos detrás.
 * Ver `world/pasillo-de-pasaje.ts` y `SALIDAS_DEL_PASAJE`.
 */
import { describe, expect, it } from "vitest";
import { Euler, PerspectiveCamera, Quaternion, Raycaster, Vector3, type Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT } from "../flight/aircraft";
import { AVION_DEL_PASAJE, LADO_DE_ARA, SALIDAS_DEL_PASAJE } from "../flight/inicio-pasaje";
import { colocarModelo } from "./aeronave-modelo";
import { medirElPasaje, type Pasaje } from "./asiento-de-pasaje";
import { ASOMADA_AL_PASILLO, montarElPasillo, type PasilloDePasaje } from "./pasillo-de-pasaje";

const fs = (
  globalThis as unknown as { process: { getBuiltinModule(nombre: string): unknown } }
).process.getBuiltinModule("node:fs") as { readFileSync(ruta: string): Uint8Array };

async function montar(): Promise<{ pasaje: Pasaje; pasillo: PasilloDePasaje }> {
  const a = AIRCRAFT.find((x) => x.id === AVION_DEL_PASAJE)!;
  const b = fs.readFileSync(`public/assets/aeronaves/${a.id}.glb`);
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const modelo = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
  const grupo = colocarModelo(modelo.scene, a);
  const pasaje = medirElPasaje(modelo.scene, grupo)!;
  const ara = pasaje.deAra[LADO_DE_ARA]!;
  const pasillo = montarElPasillo(ara, LADO_DE_ARA, pasaje.filas, pasaje.puertas, 0xbe5d38)!;
  // Suelto, en coordenadas del avión: así la cámara y los rayos van en las mismas.
  pasillo.grupo.updateMatrixWorld(true);
  return { pasaje, pasillo };
}

/** La cámara de Ara asomada al pasillo, en 16:9, como la pone la vista de pasaje. */
function camaraDe(p: PasilloDePasaje): PerspectiveCamera {
  const c = new PerspectiveCamera(p.pose.fov, 16 / 9, 0.05, 200);
  c.position.set(p.pose.ojo.x, p.pose.ojo.y, p.pose.ojo.z);
  c.quaternion.copy(new Quaternion().setFromEuler(new Euler(p.pose.cabeceo, p.pose.guinada, 0, "YXZ")));
  c.updateMatrixWorld(true);
  return c;
}

/** Si un punto cae en la imagen y no lo tapa nada de la cabina. */
function seVe(c: PerspectiveCamera, p: PasilloDePasaje, q: Vector3): boolean {
  const v = q.clone().project(c);
  const delante = q.clone().applyMatrix4(c.matrixWorldInverse).z < 0;
  if (!delante || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) return false;
  const d = q.clone().sub(c.position);
  const rayo = new Raycaster(c.position, d.clone().normalize(), 0, d.length() - 0.01);
  return rayo.intersectObjects(p.mallas as Mesh[], false).length === 0;
}

describe("Ara asomada al pasillo, en el avión de la escena", () => {
  it("las puertas del modelo son las salidas que dice la demostración: dos delante de Ara y dos detrás", async () => {
    const { pasaje } = await montar();
    const ara = pasaje.deAra[LADO_DE_ARA]!.poses.sentada.ojo.z;
    // Cada puerta del modelo es una fila: la de pasaje a la izquierda y la de servicio a la derecha.
    expect(pasaje.puertas).toHaveLength(2);
    const delante = pasaje.puertas.filter((p) => p.zMax < ara).length * 2;
    const detras = pasaje.puertas.filter((p) => p.zMin > ara).length * 2;
    expect({ delante, detras }).toEqual({ delante: SALIDAS_DEL_PASAJE.delante, detras: SALIDAS_DEL_PASAJE.detras });
    // Y la de delante es la más cercana a Ara: es la que se mira.
    const [d, t] = pasaje.puertas as [(typeof pasaje.puertas)[number], (typeof pasaje.puertas)[number]];
    expect(ara - d.zMax).toBeLessThan(t.zMin - ara);
  });

  it("monta la cabina dentro del avión, y Ara mira desde el borde del pasillo", async () => {
    const { pasaje, pasillo } = await montar();
    const ventanilla = pasaje.deAra[LADO_DE_ARA]!.ventanilla;
    expect(Math.abs(pasillo.pose.ojo.x)).toBeCloseTo(ASOMADA_AL_PASILLO.x, 5);
    expect(Math.sign(pasillo.pose.ojo.x)).toBe(Math.sign(ventanilla.centro.x));
    expect(pasillo.pose.ojo.y - pasillo.suelo).toBeCloseTo(ASOMADA_AL_PASILLO.ojosSobreElSuelo, 5);
    // Mirando hacia delante, casi recto por el pasillo.
    expect(Math.abs(pasillo.pose.guinada)).toBeLessThan(0.1);
    expect(pasillo.desde).toBeLessThan(pasaje.puertas[0]!.zMin);
    // Y barata: cuatro mallas y pocos triángulos.
    let triangulos = 0;
    for (const m of pasillo.mallas) triangulos += (m.geometry.getAttribute("position").count ?? 0) / 3;
    expect(triangulos).toBeLessThan(15000);
  });

  it("se ve el letrero de la salida más cercana, entero y sin nada delante, y las tiras del suelo que llevan a ella", async () => {
    const { pasillo } = await montar();
    const c = camaraDe(pasillo);
    const l = pasillo.letreros[0]!;
    const { ancho, alto } = pasillo.tamanoDelLetrero;
    for (const [a, b] of [
      [0, 0],
      [-0.45, -0.4],
      [0.45, -0.4],
      [-0.45, 0.4],
      [0.45, 0.4],
    ] as const)
      expect(seVe(c, pasillo, new Vector3(l.x + a * ancho, l.y + b * alto, l.z)), `${a} ${b}`).toBe(true);
    // Y el del techo, sobre el pasillo.
    const techo = pasillo.letreros[pasillo.letreros.length - 1]!;
    expect(seVe(c, pasillo, new Vector3(techo.x, techo.y, techo.z))).toBe(true);
    const vistas = pasillo.tiras.filter((t) => seVe(c, pasillo, new Vector3(t.x, t.y, t.z))).length;
    expect(vistas / pasillo.tiras.length).toBeGreaterThan(0.3);
  });

  it("y el letrero cae por debajo de la tarjeta de quien habla, también en un teléfono apaisado", async () => {
    const { pasillo } = await montar();
    // La tarjeta, con las cuatro líneas de la frase de las salidas, llega a un tercio del alto en un teléfono de 412.
    for (const aspecto of [16 / 10, 915 / 412]) {
      const c = camaraDe(pasillo);
      c.aspect = aspecto;
      c.updateProjectionMatrix();
      for (const l of pasillo.letreros) {
        const v = new Vector3(l.x, l.y + pasillo.tamanoDelLetrero.alto / 2, l.z).project(c);
        // De arriba abajo, en fracción del alto: por debajo del 38 %.
        expect((1 - v.y) / 2, `${aspecto.toFixed(2)}`).toBeGreaterThan(0.38);
        expect(Math.abs(v.x)).toBeLessThan(0.9);
      }
    }
  });
});

/**
 * El asiento de ventanilla, **en los modelos que carga el juego**.
 *
 * Lo que se pidió fue «una vista de pasajero desde ventanilla derecha e
 * izquierda», y lo que la hace valer es lo que se ve desde ahí: el ala, el
 * motor y el paisaje, por el cristal. Así que esto no mira números sueltos:
 * se sienta en cada avión con pasaje y **lanza rayos por su ventanilla**, con
 * el `Raycaster` de three.js, que descarta las caras de atrás igual que la
 * tarjeta. Si desde el asiento se viera el fuselaje por dentro, o el ala no
 * asomara por ningún lado, aquí salta.
 */
import { describe, expect, it } from "vitest";
import { Group, Raycaster, Vector3, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import { conPasaje } from "../audio/megafonia";
import { colocarModelo } from "./aeronave-modelo";
import {
  asientoAnteVentanilla,
  medirElPasaje,
  OJOS_A,
  type AsientoDePasaje,
  type Pasaje,
} from "./asiento-de-pasaje";

/* El `fs` de Node pedido en marcha. Ver `flaps-del-modelo.test.ts`. */
const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

async function montar(a: AircraftConfig): Promise<{ grupo: Group; pasaje: Pasaje | null }> {
  const b = fs.readFileSync(`public/assets/aeronaves/${a.id}.glb`);
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const modelo = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
  const grupo = colocarModelo(modelo.scene, a);
  return { grupo, pasaje: medirElPasaje(modelo.scene, grupo) };
}

/**
 * Lo que se ve desde el asiento por el cristal: el nombre de lo primero que
 * corta cada rayo, o `""` si va al cielo. Una rejilla de rayos por todo el
 * cristal, de los ojos a cada punto.
 */
function porLaVentanilla(grupo: Object3D, asiento: AsientoDePasaje): string[] {
  const v = asiento.ventanilla;
  const n = new Vector3(v.normal.x, v.normal.y, v.normal.z);
  const arriba = new Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
  const largo = new Vector3().crossVectors(arriba, n);
  const ojo = new Vector3(asiento.ojo.x, asiento.ojo.y, asiento.ojo.z);
  const lo: string[] = [];
  for (let i = -3; i <= 3; i++)
    for (let j = -3; j <= 3; j++) {
      const p = new Vector3(v.centro.x, v.centro.y, v.centro.z)
        .addScaledVector(largo, (i / 3) * v.ancho * 0.42)
        .addScaledVector(arriba, (j / 3) * v.alto * 0.42);
      const dir = p.sub(ojo).normalize();
      const corte = new Raycaster(ojo, dir, 0.01, 400)
        .intersectObject(grupo, true)
        .find((c) => c.object.visible);
      lo.push(corte?.object.name ?? "");
    }
  return lo;
}

const CON_PASAJE = AIRCRAFT.filter((a) => conPasaje(a.mass));

describe("el asiento de ventanilla", () => {
  it("hay aviones con pasaje, que si no esto no mira nada", () => {
    expect(CON_PASAJE.length).toBeGreaterThanOrEqual(3);
  });

  for (const a of CON_PASAJE) {
    describe(a.id, () => {
      it("tiene asiento a los dos lados, dentro del avión", async () => {
        const { pasaje } = await montar(a);
        expect(pasaje).not.toBeNull();
        for (const lado of ["izquierda", "derecha"] as const) {
          const s = pasaje![lado];
          const piel = Math.abs(s.ventanilla.centro.x);
          // Dentro del fuselaje y a medio metro largo de la pared, no con la
          // cara en el cristal ni en el pasillo.
          expect(Math.abs(s.ojo.x)).toBeLessThan(piel - 0.35);
          expect(Math.abs(s.ojo.x)).toBeGreaterThan(0.15);
          // Y mirando hacia su lado.
          expect(Math.sign(s.guinada)).toBe(lado === "izquierda" ? 1 : -1);
        }
        // Los dos asientos, uno enfrente del otro.
        expect(pasaje!.izquierda.ojo.z).toBeCloseTo(pasaje!.derecha.ojo.z, 1);
        expect(pasaje!.izquierda.ojo.x).toBeCloseTo(-pasaje!.derecha.ojo.x, 1);
      });

      it("y por la ventanilla se ve el ala, y nada del fuselaje", async () => {
        const { grupo, pasaje } = await montar(a);
        // Mirando desde dentro, la losa de las ventanillas se esconde: es lo
        // que hace el juego. Ver `Pasaje.ventanillas`.
        pasaje!.ventanillas.visible = false;
        for (const lado of ["izquierda", "derecha"] as const) {
          const visto = porLaVentanilla(grupo, pasaje![lado]);
          // El ala —o lo que va colgado de ella: flaps, motor, hélice—.
          const ala = visto.filter((n) => /ala|flap|motor|helice|gondola|toma/.test(n));
          expect(ala.length, `${a.id} ${lado}: ${[...new Set(visto)]}`).toBeGreaterThan(3);
          // Y nada de la piel ni de dentro: el fuselaje por dentro no se pinta.
          const piel = visto.filter((n) => /fuselaje|cintura|franja|puerta|asiento|suelo/.test(n));
          expect(piel, `${a.id} ${lado}`).toEqual([]);
          // Y cielo o paisaje, que se ha venido a mirar fuera.
          expect(visto.filter((n) => n === "").length).toBeGreaterThan(10);
        }
      });
    });
  }

  it("los ojos quedan a su distancia de la pared, mire hacia donde mire", () => {
    const v = {
      centro: { x: -1.5, y: 0.5, z: 0 },
      normal: { x: -Math.cos(0.2), y: Math.sin(0.2), z: 0 },
      ancho: 0.27,
      alto: 0.4,
    };
    const s = asientoAnteVentanilla(v, "izquierda");
    const n = new Vector3(v.normal.x, v.normal.y, v.normal.z);
    const desdeLaPared = new Vector3(v.centro.x, v.centro.y, v.centro.z)
      .sub(new Vector3(s.ojo.x, s.ojo.y, s.ojo.z))
      .dot(n);
    expect(desdeLaPared).toBeCloseTo(OJOS_A, 5);
    // Y la mirada pasa por el centro del cristal.
    const mira = new Vector3(
      -Math.sin(s.guinada) * Math.cos(s.cabeceo),
      Math.sin(s.cabeceo),
      -Math.cos(s.guinada) * Math.cos(s.cabeceo),
    );
    const alCentro = new Vector3(v.centro.x, v.centro.y, v.centro.z)
      .sub(new Vector3(s.ojo.x, s.ojo.y, s.ojo.z))
      .normalize();
    expect(mira.dot(alCentro)).toBeGreaterThan(0.9999);
  });
});

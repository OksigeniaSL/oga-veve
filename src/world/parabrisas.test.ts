/**
 * **El parabrisas y el guardasol, vistos desde el asiento**, en los modelos
 * que carga el juego.
 *
 * Vino con una captura del JAZ 120 rodando en Tenerife Sur al atardecer: los
 * montantes, «planchas grises lisas y gruesas»; el guardasol, una mancha negra
 * que tapaba media pantalla. «Una de las cosas a mejorar es el parabrisas de
 * los aviones, se ven feos.» Ver `parabrisas_por_dentro` y `_visera` en
 * `modelos/comun.py`.
 *
 * Lo que se mide aquí es **lo que tapan desde los ojos**, que es lo que se veía
 * mal, con rayos del `Raycaster` de three.js —que se salta las caras de
 * atrás igual que la tarjeta—:
 *
 * - cada montante, en un abanico de rayos a la altura de la vista, no tapa
 *   más de lo que mide su cara; los de antes tapaban su cara y un costado;
 * - por encima del morro se ve lo que se ve en su avión: en los de línea, lo
 *   que dicen sus manuales de aeropuertos; en los demás, lo de antes;
 * - y el guardasol está justo debajo de esa raya, no un palmo más arriba.
 */
import { describe, expect, it } from "vitest";
import { Raycaster, Vector3, type Group, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import { colocarModelo, ojoDelModelo } from "./aeronave-modelo";

/* El `fs` de Node pedido en marcha. Ver `flaps-del-modelo.test.ts`. */
const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

const GRADO = Math.PI / 180;

/**
 * Cuánto se ve por encima del morro, en grados, mirando al frente.
 *
 * - **JAZ 120**: 18° 26′, el 747-400 (Boeing D6-58326-1, *747-400 Airplane
 *   Characteristics for Airport Planning*, rev. F, apartado 4.4).
 * - **JAZ 90**: 15°, el E-170/175 (Embraer, *Airport Planning Manual* del
 *   175, figura 4.5).
 * - **Los de hélice**: los once grados y medio de antes, que es donde ahora
 *   acaba el lomo del morro —el capó, en el entrenador—. Su clase no los
 *   publica.
 */
const SOBRE_EL_MORRO: Record<string, number> = {
  "jaz-120": 18.43,
  "jaz-90": 15,
};
const DE_HELICE = 11.5;

/** Lo que es de la cabina: lo que no debe tapar por encima de esa raya. */
const DE_LA_CABINA =
  /^(visera|panel|mcp|efis|aviso|panel-de-avisos|montantes-parabrisas|juntas-parabrisas|tornillos|capota|brujula|reloj|pantalla|boton|forro|alfeizar)/;

async function montar(
  a: AircraftConfig,
): Promise<{ grupo: Group; ojo: Vector3; visera: number }> {
  const b = fs.readFileSync(`public/assets/aeronaves/${a.id}.glb`);
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const modelo = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
  const grupo = colocarModelo(modelo.scene, a);
  const ojo = ojoDelModelo(modelo.scene, grupo);
  if (!ojo?.encuadre) throw new Error(`${a.id}: sin ojo o sin visera`);
  grupo.updateWorldMatrix(true, true);
  return {
    grupo,
    ojo: new Vector3(ojo.x, ojo.y, ojo.z),
    visera: ojo.encuadre.visera,
  };
}

/**
 * Lo primero visible que corta un rayo desde los ojos, en los ejes del avión:
 * `azimut` a la derecha y `elevacion` hacia arriba, en grados.
 */
function primero(
  grupo: Object3D,
  ojo: Vector3,
  azimut: number,
  elevacion: number,
  hasta = 4,
): { nombre: string; distancia: number } | null {
  const dir = new Vector3(
    Math.sin(azimut * GRADO) * Math.cos(elevacion * GRADO),
    Math.sin(elevacion * GRADO),
    -Math.cos(azimut * GRADO) * Math.cos(elevacion * GRADO),
  );
  const corte = new Raycaster(ojo.clone(), dir, 0.05, hasta)
    .intersectObject(grupo, true)
    .find((c) => c.object.visible && !/limpia-parabrisas/.test(c.object.name));
  return corte ? { nombre: corte.object.name, distancia: corte.distance } : null;
}

const CON_MODELO = AIRCRAFT.filter((a) => {
  try {
    fs.readFileSync(`public/assets/aeronaves/${a.id}.glb`);
    return true;
  } catch {
    return false;
  }
});

describe("el parabrisas visto desde el asiento", () => {
  it("están los seis", () => {
    expect(CON_MODELO.map((a) => a.id)).toEqual([
      "jaz-20",
      "jaz-25",
      "jaz-40",
      "jaz-60",
      "jaz-90",
      "jaz-120",
    ]);
  });

  for (const a of CON_MODELO) {
    describe(a.id, () => {
      it("cada montante tapa su cara y no más: menos de cuatro grados", async () => {
        const { grupo, ojo } = await montar(a);
        // Un abanico a la altura de la vista, de décima en décima de grado.
        const tramos: { desde: number; hasta: number }[] = [];
        let abierto: number | null = null;
        for (let az = -60; az <= 60; az += 0.1) {
          const c = primero(grupo, ojo, az, 2);
          const esMontante = c?.nombre === "montantes-parabrisas";
          if (esMontante && abierto === null) abierto = az;
          if (!esMontante && abierto !== null) {
            tramos.push({ desde: abierto, hasta: az });
            abierto = null;
          }
        }
        // Al menos los dos del puesto, a los dos lados de la cara.
        expect(tramos.filter((t) => t.hasta < 0).length).toBeGreaterThanOrEqual(1);
        expect(tramos.filter((t) => t.desde > 0).length).toBeGreaterThanOrEqual(1);
        for (const t of tramos) expect(t.hasta - t.desde).toBeLessThan(4);
      });

      it("por encima del morro se ve lo de su clase, y el guardasol no lo tapa", async () => {
        const { grupo, ojo } = await montar(a);
        const raya = SOBRE_EL_MORRO[a.id] ?? DE_HELICE;
        // Medio grado por encima de la raya, al frente: ni el guardasol, ni
        // el panel, ni el lomo del morro.
        const encima = primero(grupo, ojo, 0, -(raya - 0.5));
        expect(encima === null || !DE_LA_CABINA.test(encima.nombre), encima?.nombre).toBe(true);
      });

      it("y el guardasol está justo debajo, no un palmo más arriba", async () => {
        const { grupo, ojo, visera } = await montar(a);
        const raya = SOBRE_EL_MORRO[a.id];
        if (raya !== undefined) {
          // En los de línea el labio **es** la raya: grado y medio por
          // debajo, al frente, ya está el guardasol con lo que lleva encima.
          const debajo = primero(grupo, ojo, 0, -(raya + 1.5));
          expect(debajo?.nombre ?? "nada").toMatch(/^(visera|mcp|efis|aviso)/);
          // Y el encuadre lo mide donde está: entre la raya y grado y pico
          // por encima, que es lo que suben los extremos del arco.
          expect(visera / GRADO).toBeGreaterThan(raya - 1.2);
          expect(visera / GRADO).toBeLessThan(raya + 0.2);
        } else {
          // En los de hélice, por debajo del lomo del morro.
          expect(visera / GRADO).toBeGreaterThan(DE_HELICE);
        }
      });
    });
  }
});

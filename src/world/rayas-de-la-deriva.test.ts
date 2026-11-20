/**
 * **Las rayas de la deriva, con el ejercicio volado**: la de delante sigue
 * tendida mientras dura y se quita en el mismo paso que lo cierra (H50). El
 * banco de la deriva la leía tendida con el ejercicio ya cerrado cuando su
 * lectura caía entre el paso que cerraba y el siguiente: aquí se lee
 * justo ahí, en cada paso, sin navegador.
 */

import { describe, expect, it } from "vitest";
import { ejercicioPorId } from "../flight/ejercicios";
import { colocacionDeLaDeriva, Deriva, sitioDeLaDeriva, type LecturaDeLaDeriva } from "../flight/deriva";
import { dondeCae } from "./entre-aerodromos";
import { SCENARIOS, oaciDe } from "./scenarios";
import { RayasDeLaDeriva } from "./rayas-de-la-deriva";

const DERIVA = ejercicioPorId("deriva")!;
const ASUNCION = SCENARIOS.find((s) => oaciDe(s) === "SGAS")!;
const REMANSO = sitioDeLaDeriva("SGAS")!;
const SITIO = { ...REMANSO, ...dondeCae(ASUNCION.aerodrome!.origin, REMANSO) };
const LLANO = (): number => 60;
/** La avioneta a su crucero, m/s, en calma: derecha al sitio. */
const VERDADERA = 51;

/**
 * Vuela en calma, recto al sitio, a pasos de `dt`, y mira la de delante
 * después de cada paso, que es donde puede caer la lectura del banco.
 */
function volar(dt: number): { antes: number[]; alCerrar: number | null; cierre: string | null; pasos: number } {
  const c = colocacionDeLaDeriva({
    sitio: SITIO,
    campo: { x: 0, z: 0 },
    viento: { x: 0, z: 0 },
    velocidad: VERDADERA,
    suelo: LLANO,
    cotaDeLaPista: 89,
  });
  const d = new Deriva(DERIVA, SITIO);
  d.colocar(c);
  const rayas = new RayasDeLaDeriva(LLANO);
  const rumbo = c.rumbo;
  const vx = VERDADERA * Math.sin(rumbo);
  const vz = -VERDADERA * Math.cos(rumbo);
  let x = c.x;
  let z = c.z;
  const antes: number[] = [];
  let alCerrar: number | null = null;
  let pasos = 0;
  for (; pasos < 10_000 && d.fase !== "cerrada"; pasos++) {
    x += vx * dt;
    z += vz * dt;
    const l: LecturaDeLaDeriva = {
      x,
      z,
      vx,
      vz,
      rumbo: (rumbo * 180) / Math.PI,
      enElSuelo: false,
      parado: false,
      percance: false,
    };
    const sucesos = rayas.paso(d, l, dt);
    if (sucesos.some((s) => s.que === "cerrar")) alCerrar = rayas.delante.muestras;
    else antes.push(rayas.delante.muestras);
  }
  return { antes, alCerrar, cierre: d.cierre, pasos };
}

describe("las rayas de la deriva", () => {
  it("la de delante, tendida mientras dura el ejercicio", () => {
    const v = volar(1 / 60);
    expect(v.cierre).toBe("hecho");
    // Desde el primer paso, y hasta el último antes de cerrar.
    expect(Math.min(...v.antes)).toBeGreaterThan(10);
  });

  it("y quitada en el mismo paso que lo cierra, a cualquier paso", () => {
    // A sesenta por segundo, a treinta y con un paso que justo la vuelve a tender.
    for (const dt of [1 / 60, 1 / 30, 0.25]) {
      const v = volar(dt);
      expect(v.cierre, `dt ${dt}`).toBe("hecho");
      expect(v.alCerrar, `dt ${dt}`).toBe(0);
    }
  });

  it("vaciar la deja como al principio, con la recta puesta", () => {
    const rayas = new RayasDeLaDeriva(LLANO);
    const c = colocacionDeLaDeriva({
      sitio: SITIO,
      campo: { x: 0, z: 0 },
      viento: { x: 0, z: 0 },
      velocidad: VERDADERA,
      suelo: LLANO,
      cotaDeLaPista: 89,
    });
    const d = new Deriva(DERIVA, SITIO);
    d.colocar(c);
    const l: LecturaDeLaDeriva = { x: c.x, z: c.z, vx: 0, vz: -VERDADERA, rumbo: 0, enElSuelo: false, parado: false, percance: false };
    rayas.paso(d, l, 0.1);
    expect(rayas.delante.muestras).toBeGreaterThan(10);
    rayas.vaciar();
    expect(rayas.delante.muestras).toBe(0);
    expect(rayas.camino.muestras).toBe(0);
    expect(rayas.recta.muestras).toBeGreaterThan(10);
  });
});

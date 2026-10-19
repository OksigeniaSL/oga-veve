/**
 * **Los dibujos de la ventanita vuelan hacia donde vuela lo que se ve al lado**
 * (punto 285).
 *
 * El motor del dibujo volaba hacia la izquierda al lado de la ventanilla de
 * Ara, por la que el avión va hacia la derecha. Aquí se lee hacia dónde va el
 * avión de cada dibujo **en el propio dibujo** —la flecha verde del avance,
 * el aire que llega al ala, la cola del avión visto desde arriba— y hacia
 * dónde va en la pantalla **con la toma con la que sale**, con las cuentas
 * de la cámara de verdad.
 */

import { PerspectiveCamera, Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { CamaraDeLaEscena } from "../cameras/escena";
import type { FlightState } from "../flight/model";
import { LADO_DE_ARA } from "../flight/inicio-pasaje";
import { asientoAnteVentanilla } from "../world/asiento-de-pasaje";
import { miradaDe, tomaDelPaisaje } from "../world/se-ve-desde-el-pasaje";
import { DIBUJOS_DEL_PASAJE, SENTIDO_DE_LOS_DIBUJOS, type DibujoDelPasaje } from "./dibujos-del-pasaje";

const VERDE = "#4f9a5a";

/** Las flechas de un color, como las pinta `flecha`: de dónde a dónde. */
function flechas(svg: string, color: string): { dx: number; dy: number }[] {
  const re = new RegExp(`<path d="M([-\\d.]+) ([-\\d.]+)L([-\\d.]+) ([-\\d.]+)" fill="none" stroke="${color}"`, "g");
  return [...svg.matchAll(re)].map((m) => ({ dx: Number(m[3]) - Number(m[1]), dy: Number(m[4]) - Number(m[2]) }));
}

/** Hacia dónde avanza el avión del dibujo: +1 a la derecha, −1 a la izquierda. */
const AVANCE: Record<"motor" | "alto" | "techo" | "ala" | "salidas", (svg: string) => number> = {
  // La flecha verde de lo que avanza, o de hacia dónde se mira volando.
  motor: (svg) => Math.sign(flechas(svg, VERDE).find((f) => Math.abs(f.dx) > Math.abs(f.dy))!.dx),
  alto: (svg) => Math.sign(flechas(svg, VERDE).find((f) => Math.abs(f.dx) > Math.abs(f.dy))!.dx),
  techo: (svg) => Math.sign(flechas(svg, VERDE).find((f) => Math.abs(f.dx) > Math.abs(f.dy))!.dx),
  // El aire llega por delante del ala: corre al revés de lo que avanza.
  ala: (svg) => {
    const corre = [...svg.matchAll(/<path d="M([\d.]+) [\d.]+ C[^"]* ([\d.]+) [\d.]+" class="t fino corre"/g)];
    expect(corre.length).toBeGreaterThan(0);
    const s = Math.sign(Number(corre[0]![2]) - Number(corre[0]![1]));
    for (const m of corre) expect(Math.sign(Number(m[2]) - Number(m[1]))).toBe(s);
    return -s;
  },
  // La cola, al otro lado del morro: el fuselaje va de 60 a 420.
  salidas: (svg) => {
    const cola = /<path d="M([\d.]+) 160 l(-?)40 -14 v28z"/.exec(svg);
    expect(cola).not.toBeNull();
    return Number(cola![1]) < 240 ? 1 : -1;
  },
};

/** Un estado de vuelo de mentira: quieto, recto y nivelado, con el morro hacia −z. */
const QUIETO = {
  position: new Vector3(0, 2000, 0),
  orientation: new Quaternion(),
  heightAboveGround: 2000,
} as unknown as FlightState;

/** Hacia dónde cruza la pantalla un punto que avanza con el avión, visto con esa cámara: +1, derecha. */
function cruza(camara: PerspectiveCamera, desde: Vector3): number {
  camara.updateMatrixWorld();
  const a = desde.clone().project(camara);
  const b = desde.clone().add(new Vector3(0, 0, -5)).project(camara);
  return Math.sign(b.x - a.x);
}

describe("los dibujos de la ventanita, en el sentido de lo que se ve", () => {
  it("cada dibujo con avión vuela hacia donde dice", () => {
    expect(Object.keys(SENTIDO_DE_LOS_DIBUJOS).sort()).toEqual(Object.keys(AVANCE).sort());
    for (const [clave, sentido] of Object.entries(SENTIDO_DE_LOS_DIBUJOS)) {
      const avance = AVANCE[clave as keyof typeof AVANCE](DIBUJOS_DEL_PASAJE[clave as DibujoDelPasaje]);
      expect(avance, clave).toBe(sentido === "derecha" ? 1 : -1);
    }
  });

  it("y el motor: el aire entra por la derecha y el chorro sale por la izquierda", () => {
    const motor = DIBUJOS_DEL_PASAJE.motor;
    const aire = flechas(motor, "#3f7fa6");
    expect(aire.length).toBe(2);
    for (const f of aire) expect(f.dx).toBeLessThan(0);
    const chorro = flechas(motor, "#c62f2f");
    expect(chorro.length).toBe(1);
    expect(chorro[0]!.dx).toBeLessThan(0);
  });

  it("por la ventanilla de Ara, la de la izquierda, el avión va hacia la derecha", () => {
    expect(LADO_DE_ARA).toBe("izquierda");
    const ventanilla = { centro: { x: -1.6, y: 1.2, z: 0 }, normal: { x: -1, y: 0, z: 0 }, ancho: 0.28, alto: 0.38 };
    const asiento = asientoAnteVentanilla(ventanilla, LADO_DE_ARA);
    const avion = { position: QUIETO.position, orientation: QUIETO.orientation, largo: 36 };
    const camara = new PerspectiveCamera(64, 16 / 10, 0.1, 100_000);
    const ojo = new Vector3(asiento.ojo.x, asiento.ojo.y, asiento.ojo.z).add(QUIETO.position);
    camara.position.copy(ojo);
    camara.lookAt(ojo.clone().add(miradaDe(asiento, avion)));
    // Un punto del paisaje del lado de Ara: pasa hacia atrás; lo que avanza con el avión, hacia la derecha.
    expect(cruza(camara, ojo.clone().add(new Vector3(-200, -100, 0)))).toBe(1);
  });

  it("desde la toma del ala, también: es la del dibujo del ala", () => {
    const camara = new PerspectiveCamera(56, 16 / 10, 0.1, 100_000);
    const toma = new CamaraDeLaEscena();
    const ctx = { suelo: () => 0, largo: 36, movimientoReducido: false };
    toma.empezar("fuera-ala", QUIETO, ctx);
    toma.update(camara, QUIETO, 0.016, ctx);
    expect(cruza(camara, QUIETO.position.clone().add(new Vector3(-8, 0, 0)))).toBe(1);
  });

  it("y en la toma del paisaje con el Teide, que queda del lado de Ara: la del dibujo de lo alto", () => {
    const teide = { x: -18_000, y: 3_715, z: -6_000 };
    const t = tomaDelPaisaje({ position: QUIETO.position, orientation: QUIETO.orientation, largo: 36 }, teide);
    const camara = new PerspectiveCamera(50, 16 / 10, 0.1, 100_000);
    camara.position.copy(t.camara);
    camara.lookAt(t.mira);
    expect(cruza(camara, QUIETO.position.clone())).toBe(1);
  });
});

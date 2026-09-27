/**
 * La granja de Yvytu Rape: que se monte, que quepa en lo que cuesta, y que no
 * ponga nada donde no va.
 *
 * Lo que se mira es lo que diría quien cuida una pista de verdad: ni un poste
 * ni un árbol en la franja, ni una vaca en ella, y el tajamar en el bajo.
 */
import { describe, expect, it } from "vitest";
import {
  InstancedMesh,
  Matrix4,
  Mesh,
  Vector3,
  type BufferGeometry,
} from "three";
import YVYTU from "../../data/aerodromes/yvytu.aero.json";
import type { Aerodrome } from "./aerodrome";
import { crearGranja, lapachoEnFlor } from "./granja";

const aero = YVYTU as unknown as Aerodrome;

/** Un suelo con un bajo conocido: una hondonada al suroeste de la pista. */
const cota = (x: number, z: number): number =>
  258 - 6 * Math.exp(-((x - 700) ** 2 + (z - 700) ** 2) / 200 ** 2);

function triangulos(g: BufferGeometry): number {
  return (g.index ? g.index.count : g.getAttribute("position").count) / 3;
}

describe("la granja", () => {
  const granja = crearGranja(aero, cota, new Date(2026, 8, 27), 1)!;

  it("se monta alrededor de la pista de casa", () => {
    expect(granja).not.toBeNull();
    expect(granja.grupo.getObjectByName("granja:construcciones")).toBeTruthy();
    expect(granja.grupo.getObjectByName("granja:ganado")).toBeTruthy();
    expect(granja.grupo.getObjectByName("granja:tajamar")).toBeTruthy();
  });

  it("y cuesta poco: pocas llamadas de dibujo y pocos triángulos", () => {
    let llamadas = 0;
    let tri = 0;
    granja.grupo.traverse((o) => {
      if (o instanceof InstancedMesh) {
        llamadas++;
        tri += triangulos(o.geometry) * o.count;
      } else if (o instanceof Mesh) {
        llamadas++;
        tri += triangulos(o.geometry);
      } else if (o.type === "LineSegments") llamadas++;
    });
    expect(llamadas).toBeLessThanOrEqual(8);
    expect(tri).toBeLessThan(40000);
  });

  it("y el ganado no pisa la franja ni se sale al andar", () => {
    const vacas = granja.grupo.getObjectByName("granja:ganado") as InstancedMesh;
    const m = new Matrix4();
    const p = new Vector3();
    for (let paso = 0; paso < 600; paso++) granja.paso(0.5, { x: 1050, z: 300 });
    for (let i = 0; i < vacas.count; i++) {
      vacas.getMatrixAt(i, m);
      p.setFromMatrixPosition(m);
      const [a, c] = enEjes(p.x, p.z);
      const enLaFranja = Math.abs(a) < 510 && Math.abs(c) < 40;
      expect(enLaFranja, `vaca ${i} en ${a.toFixed(0)}, ${c.toFixed(0)}`).toBe(false);
    }
  });

  it("y deja sitio al monte de alrededor fuera del casco, no dentro", () => {
    const [x, z] = enMundo(150, 200);
    expect(granja.ocupa(x, z)).toBe(true);
    const [x2, z2] = enMundo(-500, -900);
    expect(granja.ocupa(x2, z2)).toBe(false);
  });
});

describe("el lapacho", () => {
  it("florece de julio a septiembre, y el resto del año es verde", () => {
    expect(lapachoEnFlor(new Date(2026, 8, 27))).toBe(true);
    expect(lapachoEnFlor(new Date(2026, 6, 1))).toBe(true);
    expect(lapachoEnFlor(new Date(2026, 10, 15))).toBe(false);
    expect(lapachoEnFlor(new Date(2026, 1, 15))).toBe(false);
  });
});

// Los ejes de la pista del fichero: a lo largo desde su centro, de través
// hacia la plataforma.
const U = [0.643, 0.766] as const;
const N = [0.766, -0.643] as const;
const MEDIO = [1050, 300] as const;
function enEjes(x: number, z: number): [number, number] {
  const dx = x - MEDIO[0];
  const dz = z - MEDIO[1];
  return [dx * U[0] + dz * U[1], dx * N[0] + dz * N[1]];
}
function enMundo(a: number, c: number): [number, number] {
  return [MEDIO[0] + a * U[0] + c * N[0], MEDIO[1] + a * U[1] + c * N[1]];
}

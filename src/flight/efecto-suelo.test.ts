/**
 * **El efecto suelo**: la fórmula da lo del manual, la altura del ala de cada
 * ficha es la de su dibujo, y el avión lo nota cerca del suelo y no lejos de
 * él. Ver `flight/efecto-suelo.ts` y la nota H29c del ADR 0002.
 */
import { describe, expect, it } from "vitest";
import { Vector3, type Mesh, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { alivioDeLaInducida, efectoSuelo } from "./efecto-suelo";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls } from "./model";

/* El fichero, leído con el `fs` de Node pedido en marcha, como en `apoyo.test.ts`. */
const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

describe("la fórmula, contra el manual de la FAA", () => {
  /*
   * FAA-H-8083-25C, cap. 5, «Ground Effect»: a una envergadura, 1,4 % menos de
   * inducida; a un cuarto, 23,5 %; a una décima, 47,6 %. Wieselsberger da los
   * dos de abajo con un punto de diferencia, y cero en el de arriba.
   */
  it("a una décima de la envergadura, casi la mitad de inducida", () => {
    expect(alivioDeLaInducida(0.1, 1)).toBeCloseTo(0.476, 1);
    expect(Math.abs(alivioDeLaInducida(0.1, 1) - 0.476)).toBeLessThan(0.015);
  });

  it("a un cuarto, menos de una cuarta parte", () => {
    expect(Math.abs(alivioDeLaInducida(0.25, 1) - 0.235)).toBeLessThan(0.01);
  });

  it("a una envergadura, nada que se note", () => {
    expect(alivioDeLaInducida(1, 1)).toBeGreaterThanOrEqual(0);
    expect(alivioDeLaInducida(1, 1)).toBeLessThanOrEqual(0.014);
  });

  it("y cuanto más cerca, más, sin saltos", () => {
    // Un centímetro de altura por cada metro de envergadura: lo más que se
    // mueve en un paso es un 8 %, con el ala pegada al suelo.
    let antes = alivioDeLaInducida(0, 1);
    for (let x = 0.01; x <= 1.2; x += 0.01) {
      const ahora = alivioDeLaInducida(x, 1);
      expect(ahora).toBeLessThanOrEqual(antes);
      expect(antes - ahora).toBeLessThan(0.08);
      antes = ahora;
    }
  });

  it("la sustentación sube con la misma proporción del ángulo inducido", () => {
    for (const a of AIRCRAFT) {
      const e = efectoSuelo(a, 0.1 * a.wingSpan);
      // A una décima, entre un 5 % y un 15 % más: el que más, el biplano,
      // que tiene el ala más corta para su superficie.
      expect(e.sustentacion, a.id).toBeGreaterThan(1.05);
      expect(e.sustentacion, a.id).toBeLessThan(1.15);
      expect(e.inducida, a.id).toBeCloseTo(1 - alivioDeLaInducida(0.1, 1), 9);
    }
  });
});

/**
 * La altura media del ala sobre el centro de gravedad en el `.glb`, pesada por
 * la planta de cada triángulo: la cuenta de `alturaDelAla` en la ficha.
 */
async function alaDelDibujo(a: AircraftConfig): Promise<number> {
  const b = fs.readFileSync(`public/assets/aeronaves/${a.id}.glb`);
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const raiz = (await new GLTFLoader().parseAsync(datos as ArrayBuffer, "")).scene;
  raiz.updateWorldMatrix(true, true);
  const cdg = raiz.getObjectByName("centro-de-gravedad")!.getWorldPosition(new Vector3());
  const esAla = (o: Object3D | null): boolean => /^ala(-alta|-baja)?$/.test(o?.name ?? "");
  let suma = 0;
  let planta = 0;
  const p = [new Vector3(), new Vector3(), new Vector3()] as const;
  raiz.traverse((o) => {
    const malla = o as Mesh;
    if (!malla.isMesh || !(esAla(o) || esAla(o.parent))) return;
    const pos = malla.geometry.getAttribute("position");
    const indice = malla.geometry.getIndex();
    const n = indice ? indice.count : pos.count;
    for (let t = 0; t + 2 < n; t += 3) {
      for (let k = 0; k < 3; k++)
        p[k]!.fromBufferAttribute(pos, indice ? indice.getX(t + k) : t + k).applyMatrix4(malla.matrixWorld);
      const [A, B, C] = p;
      const area = Math.abs((B.x - A.x) * (C.z - A.z) - (C.x - A.x) * (B.z - A.z)) / 2;
      suma += (area * (A.y + B.y + C.y)) / 3;
      planta += area;
    }
  });
  expect(planta, `${a.id}: sin ala en el dibujo`).toBeGreaterThan(0);
  return suma / planta - cdg.y;
}

describe("el ala de cada ficha va donde la dibuja su modelo", () => {
  for (const a of AIRCRAFT) {
    it(`${a.id}: ${a.alturaDelAla} m sobre el centro de gravedad`, async () => {
      expect(Math.abs((await alaDelDibujo(a)) - a.alturaDelAla)).toBeLessThan(0.03);
    });
  }
});

describe("el avión lo nota cerca del suelo, y lejos no", () => {
  const DT = 1 / 240;
  /** Un paso, con el mismo aire y el suelo a `debajo` m de las ruedas. */
  function unPaso(a: AircraftConfig, debajo: number): CoefficientFlightModel {
    const y = 600;
    const m = new CoefficientFlightModel({
      aircraft: a,
      ground: () => y - a.gearHeight - debajo,
      assist: 0,
    });
    m.reset({ position: new Vector3(0, y, 0), heading: 0, airspeed: a.approachSpeed });
    m.step(DT, { ...neutralControls(), engineOn: true, throttle: 0, flaps: 1, tren: 1 });
    return m;
  }

  for (const a of AIRCRAFT) {
    it(`${a.id}: a un metro de la pista sustenta más y frena menos, como dice la cuenta`, () => {
      const cerca = unPaso(a, 1);
      const lejos = unPaso(a, 400);
      const k = efectoSuelo(a, 1 + a.gearHeight + a.alturaDelAla).sustentacion;
      // Con el mismo ángulo, la carga sube lo que sube la sustentación (la
      // resistencia por el seno del ángulo, que es poco, no cuenta).
      expect(cerca.state.loadFactor / lejos.state.loadFactor, a.id).toBeCloseTo(k, 1);
      expect(cerca.state.loadFactor, a.id).toBeGreaterThan(lejos.state.loadFactor);
      expect(cerca.state.airspeed, a.id).toBeGreaterThan(lejos.state.airspeed);
    });

    it(`${a.id}: a más de una envergadura vuela igual que a cuatrocientos metros`, () => {
      const alto = unPaso(a, a.wingSpan);
      const lejos = unPaso(a, 400);
      expect(alto.state.loadFactor).toBe(lejos.state.loadFactor);
      expect(alto.state.airspeed).toBe(lejos.state.airspeed);
    });
  }
});

/**
 * **El efecto suelo**: la fórmula da lo del manual, la altura del ala de cada
 * ficha es la de su dibujo, y el avión lo nota cerca del suelo y no lejos de
 * él. Ver `flight/efecto-suelo.ts` y la nota H29c del ADR 0002.
 */
import { describe, expect, it } from "vitest";
import { Vector3, type Mesh, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import {
  PICADO_DEL_747,
  alivioDeLaInducida,
  efectoSuelo,
  efectoSueloRodando,
  momentoDelSuelo,
} from "./efecto-suelo";
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

/*
 * **El picado del suelo** (enmienda H56 del ADR 0027): la tabla del modelo de
 * Boeing del 747 (Hanke y Nordwall, NASA CR-114494, 1970, p. 4.0-35, por 0,7
 * como lo dejó Boeing en la p. 14.2-2), llevada a cada avión con su colchón y
 * su cola. Ver `momentoDelSuelo`.
 */
describe("el picado del suelo, contra el modelo de Boeing del 747", () => {
  const GRADO = Math.PI / 180;
  const yvaga = AIRCRAFT.find((a) => a.id === "jaz-120")!;
  const rodando747 = efectoSueloRodando(yvaga);
  /** El ΔCm del 747 con las ruedas en la pista, a un ángulo del ala, rad. */
  const del747 = (flaps: number, alaGrados: number) =>
    momentoDelSuelo(yvaga, rodando747, flaps, alaGrados * GRADO - PICADO_DEL_747.incidencia);

  it("las cifras de la tabla son las del 747 de la flota", () => {
    // Si la ficha del JAZ 120 cambia, la tabla deja de estar leída en su ala.
    expect(yvaga.aero.cmElevator).toBe(PICADO_DEL_747.cmElevator);
    expect(rodando747.sustentacion - 1).toBeCloseTo(PICADO_DEL_747.colchon, 10);
    expect(PICADO_DEL_747.incidencia / GRADO).toBeCloseTo(2, 10);
  });

  it("con los flaps de aterrizar, la curva de flaps 30 por 0,7", () => {
    expect(del747(1, 0)).toBeCloseTo(-0.092 * 0.7, 6);
    expect(del747(1, 4)).toBeCloseTo(-0.128 * 0.7, 6);
    expect(del747(1, 8)).toBeCloseTo(-0.14 * 0.7, 6);
    expect(del747(1, 12)).toBeCloseTo(-0.165 * 0.7, 6);
    // Entre dos lecturas, en recta; fuera de ellas, la última.
    expect(del747(1, 6)).toBeCloseTo(((-0.128 - 0.14) / 2) * 0.7, 6);
    expect(del747(1, 16)).toBeCloseTo(-0.165 * 0.7, 6);
  });

  it("al tocar con los de aterrizar, de −0,09 a −0,10: casi un cuarto de palanca", () => {
    // La recogida del 747 toca con 3 a 6 grados de ángulo del fuselaje.
    for (const alfa of [3, 4.5, 6]) {
      const cm = momentoDelSuelo(yvaga, rodando747, 1, alfa * GRADO);
      expect(cm).toBeLessThan(-0.088);
      expect(cm).toBeGreaterThan(-0.101);
      expect(-cm / yvaga.aero.cmElevator).toBeGreaterThan(0.2);
      expect(-cm / yvaga.aero.cmElevator).toBeLessThan(0.25);
    }
  });

  it("los flaps 5 y 10 son una curva, y los 20 la suya", () => {
    // El 747 de la flota: muescas de 0, 5, 20 y 30 grados, palanca a tercios.
    expect(del747(1 / 3, 4)).toBeCloseTo(-0.027 * 0.7, 6);
    expect(del747(2 / 3, 8)).toBeCloseTo(-0.113 * 0.7, 6);
    // Recogidos y a poco ángulo, el suelo levanta el morro: así es la gráfica.
    expect(del747(0, 0)).toBeCloseTo(0.038 * 0.7, 6);
    expect(del747(0, 12)).toBeCloseTo(-0.085 * 0.7, 6);
  });

  it("se va con el colchón: del todo rodando, menos arriba y nada a una envergadura", () => {
    const a = yvaga;
    const a6 = 6 * GRADO;
    const en = (ruedas: number) =>
      momentoDelSuelo(a, efectoSuelo(a, ruedas + a.gearHeight + a.alturaDelAla), 1, a6);
    let antes = en(0);
    for (const ruedas of [1, 3, 6, 10, 15, 20, 30]) {
      const ahora = en(ruedas);
      expect(ahora).toBeGreaterThan(antes);
      antes = ahora;
    }
    // Lo mismo que la sustentación de más: la mitad del picado donde la mitad del colchón.
    const k = efectoSuelo(a, 10 + a.gearHeight + a.alturaDelAla).sustentacion - 1;
    expect(en(10) / en(0)).toBeCloseTo(k / (rodando747.sustentacion - 1), 2);
    expect(en(a.wingSpan)).toBe(0);
  });

  for (const a of AIRCRAFT) {
    it(`${a.id}: la palanca que pide al tocar es la del 747 por su colchón`, () => {
      const rodando = efectoSueloRodando(a);
      const alfa = 6 * GRADO;
      const flaps = a.llevaFlaps ? 1 : 0;
      const palanca = -momentoDelSuelo(a, rodando, flaps, alfa) / a.aero.cmElevator;
      const del747 =
        -momentoDelSuelo(yvaga, rodando747, a.llevaFlaps ? 1 : 0, alfa) / yvaga.aero.cmElevator;
      expect(palanca).toBeCloseTo(
        (del747 * (rodando.sustentacion - 1)) / (rodando747.sustentacion - 1),
        6,
      );
      // Algo que se nota y se sostiene: de una vigésima a un cuarto de palanca.
      expect(palanca, a.id).toBeGreaterThan(a.llevaFlaps ? 0.09 : 0.02);
      expect(palanca, a.id).toBeLessThan(0.25);
    });
  }

  // Con flaps: el que no los lleva lee la fila de recogidos, que a poco
  // ángulo levanta el morro (arriba).
  for (const a of AIRCRAFT.filter((x) => x.llevaFlaps)) {
    it(`${a.id}: en el modelo, a un metro de la pista el morro cae, y lejos no`, () => {
      const y = 600;
      const paso = (debajo: number) => {
        const m = new CoefficientFlightModel({
          aircraft: a,
          ground: () => y - a.gearHeight - debajo,
          assist: 0,
        });
        m.reset({ position: new Vector3(0, y, 0), heading: 0, airspeed: a.approachSpeed });
        m.step(1 / 240, { ...neutralControls(), engineOn: true, throttle: 0, flaps: 1, tren: 1 });
        return m;
      };
      const cerca = paso(1);
      const lejos = paso(400);
      expect(cerca.palancaDelSuelo(), a.id).toBeGreaterThan(0);
      expect(Math.abs(lejos.palancaDelSuelo())).toBe(0);
      expect(cerca.state.pitchRate, a.id).toBeLessThan(lejos.state.pitchRate);
    });
  }
});

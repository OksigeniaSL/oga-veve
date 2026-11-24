/**
 * **La reversa de cada motor, en lo que se ve y se oye** (H82): la pieza del
 * parado no se abre, su REV no sale, no golpea ni ruge, y su hélice no se embala.
 * Con todos en marcha, lo de siempre.
 *
 * `reversa-con-un-motor.test.ts` mira lo que frena; esto, lo demás.
 */

import { describe, expect, it } from "vitest";
import { Vector3, type Mesh, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT, ARAI, ARASUNU, JAZ_50, TIJERETA, tieneReversa, YVAGA } from "./aircraft";
import { NO_ASSISTS } from "./assists";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls } from "./model";
import type { EstadoDelMotor } from "./motores";
import { GAS_DE_REVERSA, parteDeLaReversa, parteDeLasPiezas, Reversa } from "./reversa";
import { familiaDe } from "../ui/familia";
import { Tablero } from "../ui/tablero";
import { discoDeHelice, colocarModelo, ejesDeHelice } from "../world/aeronave-modelo";
import { acercarElRitmo, GirosDeHelice, ritmoDeLaHelice } from "../world/giro-de-las-helices";
import { prepararReversas, REVERSA } from "../world/reversas";

const DT = 1 / 60;
const CON_REVERSA = [JAZ_50, ARASUNU, ARAI, TIJERETA, YVAGA] as const;
const TURBOFANES = [ARAI, TIJERETA, YVAGA] as const;

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

async function modelo(id: string): Promise<Object3D> {
  const b = fs.readFileSync(`public/assets/aeronaves/${id}.glb`);
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const m = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
  m.scene.updateWorldMatrix(true, true);
  return m.scene;
}

/** Cómo van los motores, con esos parados. */
const con = (n: number, ...parados: number[]): EstadoDelMotor[] =>
  Array.from({ length: n }, (_, i) => (parados.includes(i) ? "molinete" : "marcha"));

describe("la pieza de cada motor", () => {
  for (const a of CON_REVERSA) {
    const n = a.motoresA.length;
    it(`${a.id}: con todos en marcha, las de todos son la de siempre, paso a paso`, () => {
      const suelta = new Reversa(a);
      const r = new Reversa(a);
      let distintos = 0;
      for (let t = 0; t < 14; t += DT) {
        const palanca = t > 1 && t < 8 ? 1 : 0;
        const e = suelta.paso(DT, palanca, true, 0.1);
        if (r.paso(DT, palanca, true, 0.1, con(n)) !== e) distintos++;
        if (r.abierta !== suelta.abierta || r.gasDelMotor !== suelta.gasDelMotor) distintos++;
        for (let i = 0; i < n; i++)
          if (r.piezas[i] !== r.abierta || r.estados[i] !== r.estado) distintos++;
        if (parteDeLaReversa(con(n), null, e) !== 1 || parteDeLasPiezas(con(n)) !== 1) distintos++;
      }
      expect(distintos).toBe(0);
    });

    it(`${a.id}: con uno parado, la suya no se abre y las demás sí; y al modelo le llega lo mismo`, () => {
      let distintos = 0;
      for (let parado = 0; parado < n; parado++) {
        const suelta = new Reversa(a);
        const r = new Reversa(a);
        for (let t = 0; t < 10; t += DT) {
          const palanca = t < 6 ? 1 : 0;
          if (r.paso(DT, palanca, true, 0, con(n, parado)) !== suelta.paso(DT, palanca, true, 0))
            distintos++;
          for (let i = 0; i < n; i++) {
            if (r.piezas[i] !== (i === parado ? 0 : suelta.abierta)) distintos++;
            if (r.estados[i] !== (i === parado ? "recogida" : suelta.estado)) distintos++;
          }
          // El avión entero dice la de los que van, que es la de la palanca.
          if (r.estado !== suelta.estado || r.todasFuera) distintos++;
        }
      }
      expect(distintos).toBe(0);
    });
  }

  it("parado con ella fuera, se queda donde está hasta que la palanca la recoge", () => {
    const r = new Reversa(ARAI);
    for (let t = 0; t < 3; t += DT) r.paso(DT, 1, true, 0, con(2));
    expect(r.todasFuera).toBe(true);
    for (let t = 0; t < 3; t += DT) r.paso(DT, 1, true, 0, con(2, 1));
    expect(r.estados).toEqual(["fuera", "fuera"]);
    for (let t = 0; t < 1; t += DT) r.paso(DT, 0, true, 0, con(2, 1));
    expect(r.estados).toEqual(["moviendose", "moviendose"]);
    for (let t = 0; t < 3; t += DT) r.paso(DT, 0, true, 0, con(2, 1));
    expect(r.estados).toEqual(["recogida", "recogida"]);
    // Y la segunda vez ya no sale.
    for (let t = 0; t < 3; t += DT) r.paso(DT, 1, true, 0, con(2, 1));
    expect(r.estados).toEqual(["fuera", "recogida"]);
  });

  it("con todos parados no se abre ninguna ni lo dice el avión", () => {
    const r = new Reversa(YVAGA);
    for (let t = 0; t < 5; t += DT) r.paso(DT, 1, true, 0, con(4, 0, 1, 2, 3));
    expect(r.estados).toEqual(["recogida", "recogida", "recogida", "recogida"]);
    expect(r.estado).toBe("recogida");
    expect(r.laMasAbierta).toBe(0);
  });

  it("otro vuelo, recogidas; y en el que no la lleva, siempre", () => {
    const r = new Reversa(ARAI);
    for (let t = 0; t < 3; t += DT) r.paso(DT, 1);
    r.reiniciar();
    expect(r.piezas).toEqual([0, 0]);
    expect(r.estados).toEqual(["recogida", "recogida"]);
    for (const a of AIRCRAFT.filter((x) => !tieneReversa(x))) {
      const s = new Reversa(a);
      for (let t = 0; t < 3; t += DT) s.paso(DT, 1);
      expect(s.estados.every((e) => e === "recogida"), a.id).toBe(true);
    }
  });
});

describe("lo que se oye", () => {
  it("la parte de los que van: la mitad con uno de dos, tres cuartos con uno de cuatro", () => {
    expect(parteDeLaReversa(con(2, 0), null, 1)).toBe(0.5);
    expect(parteDeLaReversa(con(4, 3), null, 0.4)).toBe(0.75);
    expect(parteDeLaReversa(con(2, 0, 1), null, 1)).toBe(0);
    expect(parteDeLasPiezas(con(2, 1))).toBe(0.5);
    // El modelo sencillo no lleva motores sueltos: todos.
    expect(parteDeLaReversa(undefined, null, 1)).toBe(1);
    expect(parteDeLasPiezas(undefined)).toBe(1);
  });

  it("y la del ave, lo que le deja su palanca: la misma parte que frena", () => {
    for (const [tope, empuje] of [[0, 1], [0.6, 1], [0.6, 0.5], [1, 1]] as const) {
      const enReversa = Math.min(GAS_DE_REVERSA, tope);
      const suena = parteDeLaReversa(con(2), { motor: 0, enReversa, empuje }, 1);
      expect(suena).toBeCloseTo((1 + (enReversa / GAS_DE_REVERSA) * empuje) / 2, 9);
    }
    // Su pieza se abre, que va en marcha; lo que le falta es gas.
    expect(parteDeLasPiezas(con(2))).toBe(1);
  });

  it("lo dice el modelo de vuelo del motor del ave", () => {
    const m = new CoefficientFlightModel({ aircraft: ARAI, ground: () => 0, assist: NO_ASSISTS });
    m.reset({ position: new Vector3(0, ARAI.gearHeight, 0), heading: 0, airspeed: ARAI.approachSpeed });
    m.ponerMotorTocado({ motor: 0, tope: 0.6, umbral: 1 });
    for (let i = 0; i < 12; i++) m.step(1 / 120, { ...neutralControls(), reversa: 1 });
    expect(m.motorTocado!.enReversa).toBeCloseTo(0.6, 9);
    expect(m.motorTocado!.da).toBeGreaterThanOrEqual(m.motorTocado!.enReversa);
    // Seis décimas de tres cuartos: ocho de cada diez de la suya.
    expect(parteDeLaReversa(m.motoresAhora(), m.motorTocado, 1)).toBeCloseTo(0.9, 9);
  });
});

/** Los vértices de los manguitos, en los ejes del avión: lo que se ve. */
function verticesDe(raiz: Object3D): { x: number; z: number }[] {
  const v = new Vector3();
  const salen: { x: number; z: number }[] = [];
  raiz.updateWorldMatrix(true, true);
  raiz.traverse((o) => {
    if (!REVERSA.test(o.name)) return;
    o.traverse((h) => {
      const m = h as Mesh;
      if (!m.isMesh) return;
      const pos = m.geometry.getAttribute("position");
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        m.localToWorld(v);
        salen.push({ x: v.x, z: v.z });
      }
    });
  });
  return salen;
}

function geometrias(raiz: Object3D): unknown[] {
  const g: unknown[] = [];
  raiz.traverse((o) => {
    if (REVERSA.test(o.name)) o.traverse((h) => (h as Mesh).isMesh && g.push((h as Mesh).geometry));
  });
  return g;
}

describe("el manguito de cada motor, en el modelo", () => {
  for (const a of TURBOFANES) {
    const n = a.motoresA.length;
    const deQuien = (x: number) =>
      a.motoresA.reduce((m, y, i) => (Math.abs(x - y) < Math.abs(x - a.motoresA[m]!) ? i : m), 0);

    it(`${a.id}: con todas iguales no se toca la malla, que se desliza entera`, async () => {
      const raiz = await modelo(a.id);
      const antes = geometrias(raiz);
      const r = prepararReversas(raiz, a.motoresA)!;
      const cerradas = verticesDe(raiz);
      for (const k of [0.3, 1, 0.5]) {
        r.poner(Array.from({ length: n }, () => k));
        const peor = Math.max(
          ...verticesDe(raiz).map((v, i) => Math.abs(v.z - cerradas[i]!.z - k * r.recorridos[0]!)),
        );
        expect(peor).toBeLessThan(1e-3);
      }
      expect(geometrias(raiz).every((g, i) => g === antes[i])).toBe(true);
    });

    for (let parado = 0; parado < n; parado++) {
      it(`${a.id}: parado el ${parado + 1}, el suyo quieto y los demás hacia la cola`, async () => {
        const raiz = await modelo(a.id);
        const r = prepararReversas(raiz, a.motoresA)!;
        const cerradas = verticesDe(raiz);
        const cuantos = Array.from({ length: n }, () => 0);
        for (const k of [0.4, 1]) {
          r.poner(Array.from({ length: n }, (_, i) => (i === parado ? 0 : k)));
          let peor = 0;
          verticesDe(raiz).forEach((v, i) => {
            const m = deQuien(cerradas[i]!.x);
            cuantos[m]!++;
            const toca = m === parado ? 0 : k * r.recorridos[0]!;
            peor = Math.max(
              peor,
              Math.abs(v.z - cerradas[i]!.z - toca),
              Math.abs(v.x - cerradas[i]!.x),
            );
          });
          expect(peor).toBeLessThan(1e-3);
        }
        // Los mismos vértices cada uno: el reparto no deja a nadie sin los suyos.
        expect(new Set(cuantos).size).toBe(1);
        // Y cerradas otra vez, en su sitio.
        r.poner(Array.from({ length: n }, () => 0));
        const otraVez = verticesDe(raiz);
        expect(
          Math.max(...otraVez.map((v, i) => Math.abs(v.z - cerradas[i]!.z))),
        ).toBeLessThan(1e-4);
      });
    }
  }
});

describe("la marca REV, en el instrumento de cada motor", () => {
  for (const a of AIRCRAFT) {
    it(a.id, () => {
      const svg = new Tablero().markup(a);
      const marcas = [...svg.matchAll(/data-motor-reversa="(\d)"/g)].map((m) => Number(m[1]));
      const lleva = tieneReversa(a) ? a.motores : 0;
      expect(marcas).toEqual(Array.from({ length: lleva }, (_, i) => i));
      // Cada una dentro del instrumento de su motor, y ninguna suelta.
      expect(svg).not.toContain('data-cristal="reversa"');
      for (let i = 0; i < lleva; i++) {
        const desde = svg.indexOf(`<g data-motor="${i}">`);
        const marca = svg.indexOf(`data-motor-reversa="${i}"`);
        expect(desde).toBeGreaterThan(-1);
        expect(marca).toBeGreaterThan(desde);
        if (i + 1 < lleva) expect(marca).toBeLessThan(svg.indexOf(`<g data-motor="${i + 1}">`));
      }
      if (lleva) expect(["linea", "cristal"]).toContain(familiaDe(a));
    });
  }
});

describe("la hélice de cada motor", () => {
  interface Como {
    motores: EstadoDelMotor[];
    reversa?: number;
    tocado?: { motor: number; da: number };
    avante?: number;
  }
  /** Un paso del de siempre y del de cada una, como los da `syncAircraftMesh`. */
  const paso = (g: GirosDeHelice, s: { giro: number; angulo: number }, o: Como) => {
    const avante = o.avante ?? 0;
    const quiere = ritmoDeLaHelice(true, Math.max(avante, o.reversa ?? 0));
    const antes = s.giro;
    const angulo = s.angulo;
    s.giro = acercarElRitmo(s.giro, quiere, DT);
    s.angulo += DT * s.giro;
    const t = o.tocado
      ? { ...o.tocado, enReversa: o.tocado.da, empuje: 1, vueltas: 1, estallidos: 0 }
      : null;
    g.paso(DT, s.giro, quiere, antes, angulo, o.motores, t, true, avante);
  };
  const BANDERA: EstadoDelMotor[] = ["bandera", "marcha"];

  it("con todos en marcha, la de siempre", () => {
    const g = new GirosDeHelice();
    const s = { giro: 0, angulo: 0 };
    for (let i = 0; i < 600; i++) paso(g, s, { motores: con(2), avante: 0.5 });
    expect(g.porSeparado).toBe(false);
  });

  it("en bandera se para, y con la reversa solo se embala la del que va", () => {
    const g = new GirosDeHelice();
    const s = { giro: 0, angulo: 0 };
    for (let i = 0; i < 600; i++) paso(g, s, { motores: con(2), avante: 0.3 });
    const yendo = s.giro;
    for (let i = 0; i < 900; i++) paso(g, s, { motores: BANDERA, avante: 0.3 });
    expect(g.giro(0)).toBeLessThan(0.2);
    expect(g.giro(1)).toBeCloseTo(yendo, 2);
    for (let i = 0; i < 600; i++) paso(g, s, { motores: BANDERA, reversa: GAS_DE_REVERSA });
    expect(g.giro(0)).toBeLessThan(0.1);
    expect(g.giro(1)).toBeCloseTo(s.giro, 6);
    expect(g.giro(1)).toBeGreaterThan(yendo);
  });

  it("en molinete, con las demás, pero sin la reversa; y la del ave, lo suyo", () => {
    const g = new GirosDeHelice();
    const s = { giro: 0, angulo: 0 };
    for (let i = 0; i < 900; i++)
      paso(g, s, { motores: ["molinete", "marcha"], reversa: GAS_DE_REVERSA });
    expect(g.giro(0)).toBeCloseTo(ritmoDeLaHelice(true, 0), 1);
    const h = new GirosDeHelice();
    const t = { giro: 0, angulo: 0 };
    for (let i = 0; i < 900; i++)
      paso(h, t, { motores: con(2), tocado: { motor: 1, da: 0.2 }, reversa: GAS_DE_REVERSA });
    expect(h.giro(1)).toBeCloseTo(ritmoDeLaHelice(true, 0.2), 1);
    expect(h.giro(0)).toBeGreaterThan(h.giro(1));
  });

  it("y al volver todas a lo mismo, otra vez la de siempre", () => {
    const g = new GirosDeHelice();
    const s = { giro: 0, angulo: 0 };
    for (let i = 0; i < 600; i++) paso(g, s, { motores: BANDERA, avante: 0.5 });
    expect(g.porSeparado).toBe(true);
    for (let i = 0; i < 1200; i++) paso(g, s, { motores: con(2), avante: 0.5 });
    expect(g.porSeparado).toBe(false);
  });

  for (const a of [JAZ_50, ARASUNU]) {
    it(`${a.id}: sus hélices van de izquierda a derecha, como sus motores, y cada una con su disco`, async () => {
      const raiz = await modelo(a.id);
      colocarModelo(raiz, a).updateWorldMatrix(true, true);
      const ejes = ejesDeHelice(raiz);
      expect(ejes.length).toBe(a.motoresA.length);
      ejes.forEach((e, i) =>
        expect(Math.sign(new Vector3().setFromMatrixPosition(e.matrixWorld).x)).toBe(
          Math.sign(a.motoresA[i]!),
        ),
      );
      const borrar = discoDeHelice(ejes)!;
      const discos = ejes.map((e) => e.children.find((h) => h.name === "disco-de-helice")!);
      borrar([0, 1]);
      expect(discos.map((d) => d.visible)).toEqual([false, true]);
      borrar(0.5);
      expect(discos.map((d) => d.visible)).toEqual([true, true]);
    });
  }
});

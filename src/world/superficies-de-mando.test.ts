/**
 * Los alerones, la profundidad y el timón de dirección de cada modelo, leídos
 * del `.glb` que carga el juego y movidos como los mueve.
 *
 * Es un contrato entre tres sitios: el guion de Blender los corta del ala y
 * de la cola —`mando` en `modelos/exterior.py`—, la ficha dice cuánto giran
 * —`flight/recorrido-de-mandos.ts`, con su fuente— y
 * `world/superficies-de-mando.ts` los mueve. Si un día dicen cosas distintas,
 * el alerón gira lo que no gira el de verdad, o choca en su tope con algo que
 * el guion no vio. Esto lo caza sin abrir el juego.
 */
import { describe, expect, it } from "vitest";
import { Box3, Matrix4, Quaternion, Vector3, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT } from "../flight/aircraft";
import { RECORRIDO_DE_MANDOS, recorridoDeMandos } from "../flight/recorrido-de-mandos";
import {
  MANDOS_AL_CENTRO,
  RITMO_DE_LAS_SUPERFICIES,
  SUPERFICIE_DE_MANDO,
  acercarLosMandos,
  ejeDeLaPieza,
  gradosDelMando,
  prepararMandos,
} from "./superficies-de-mando";

interface Nodo {
  name?: string;
  children?: number[];
  translation?: number[];
  rotation?: number[];
  matrix?: number[];
  extras?: Record<string, unknown>;
}

/*
 * El fichero, leído con el `fs` de Node pedido en marcha, como en
 * `flaps-del-modelo.test.ts` y por lo mismo.
 */
const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

function nodosDe(id: string): Nodo[] {
  const b = fs.readFileSync(`public/assets/aeronaves/${id}.glb`);
  const vista = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const largo = vista.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(b.subarray(20, 20 + largo))) as {
    nodes: Nodo[];
  };
  return json.nodes;
}

async function escenaDe(id: string): Promise<Object3D> {
  const b = fs.readFileSync(`public/assets/aeronaves/${id}.glb`);
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const modelo = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
  modelo.scene.updateWorldMatrix(true, true);
  return modelo.scene;
}

const numeros = (v: unknown): number[] => (v as number[]).map(Number);

/** La caja de una malla en los ejes del avión, que son los de la raíz. */
function caja(raiz: Object3D, malla: Object3D): Box3 {
  raiz.updateWorldMatrix(true, true);
  const aRaiz = new Matrix4().copy(raiz.matrixWorld).invert();
  return new Box3().setFromObject(malla).applyMatrix4(aRaiz);
}

describe("cuánto giran: la ficha", () => {
  it("cada avión de la flota tiene sus topes y de dónde salen", () => {
    for (const a of AIRCRAFT) {
      const r = RECORRIDO_DE_MANDOS[a.id];
      expect(r, a.id).toBeDefined();
      expect(r!.fuente.length, a.id).toBeGreaterThan(10);
      for (const t of [r!.alerones, r!.profundidad, r!.timon]) {
        // Entre diez y cuarenta grados: lo que mueve cualquier superficie de
        // mando de verdad, de avioneta a avión de línea.
        expect(t.arriba).toBeGreaterThanOrEqual(10);
        expect(t.arriba).toBeLessThanOrEqual(40);
        expect(t.abajo).toBeGreaterThanOrEqual(10);
        expect(t.abajo).toBeLessThanOrEqual(40);
      }
      // Un alerón nunca baja más de lo que sube: el que baja frena más.
      expect(r!.alerones.abajo).toBeLessThanOrEqual(r!.alerones.arriba);
    }
  });

  it("el mando lleva cada lado a su tope, con su signo", () => {
    const topes = { arriba: 20, abajo: 15 };
    expect(gradosDelMando(1, 1, topes)).toBe(20);
    expect(gradosDelMando(-1, 1, topes)).toBe(-15);
    // El alerón izquierdo, con el volante a la derecha, baja.
    expect(gradosDelMando(1, -1, topes)).toBe(-15);
    expect(gradosDelMando(0.5, 1, topes)).toBe(10);
    expect(gradosDelMando(3, 1, topes)).toBe(20);
    expect(gradosDelMando(Number.NaN, 1, topes)).toBe(0);
  });

  it("los que se ven van a su ritmo, sin saltos", () => {
    const pide = { alabeo: 1, cabeceo: -1, guinada: 0.02 };
    const un = acercarLosMandos(MANDOS_AL_CENTRO, pide, 0.1);
    expect(un.alabeo).toBeCloseTo(RITMO_DE_LAS_SUPERFICIES * 0.1, 9);
    expect(un.cabeceo).toBeCloseTo(-RITMO_DE_LAS_SUPERFICIES * 0.1, 9);
    expect(un.guinada).toBeCloseTo(0.02, 9);
    let ya = MANDOS_AL_CENTRO;
    for (let i = 0; i < 60; i++) ya = acercarLosMandos(ya, pide, 1 / 60);
    expect(ya).toEqual(pide);
  });

  it("de quién es cada pieza, para tocarla en la vuelta al avión", () => {
    expect(ejeDeLaPieza("aleron-izquierda-piel")).toBe("alabeo");
    expect(ejeDeLaPieza("aleron-alto-derecha")).toBe("alabeo");
    expect(ejeDeLaPieza("profundidad-derecha-tapas")).toBe("cabeceo");
    expect(ejeDeLaPieza("timon-de-direccion")).toBe("guinada");
    expect(ejeDeLaPieza("hueco-aleron-derecha")).toBeNull();
    expect(ejeDeLaPieza("ala")).toBeNull();
  });
});

describe("las superficies de mando de cada modelo", () => {
  for (const a of AIRCRAFT) {
    const nodos = nodosDe(a.id);
    const vacios = nodos.filter(
      (n) => SUPERFICIE_DE_MANDO.test(n.name ?? "") && n.extras?.["bisagra"],
    );
    const r = recorridoDeMandos(a.id)!;
    const de = (re: RegExp) => vacios.filter((n) => re.test(n.name ?? ""));

    it(`${a.id}: alerones de dos en dos, dos profundidades y un timón`, () => {
      const alerones = de(/^aleron-/);
      // El biplano, en las dos alas.
      expect(alerones.length).toBe(a.id === "jaz-25" ? 4 : 2);
      expect(de(/^profundidad-/).map((n) => n.name).sort()).toEqual([
        "profundidad-derecha",
        "profundidad-izquierda",
      ]);
      expect(de(/^timon-/).map((n) => n.name)).toEqual(["timon-de-direccion"]);
    });

    it(`${a.id}: cada uno con su piel, sus tapas y la cala que deja`, () => {
      for (const v of vacios) {
        const hijos = (v.children ?? []).map((i) => nodos[i]!.name ?? "");
        expect(hijos).toContain(`${v.name}-piel`);
        expect(hijos).toContain(`${v.name}-tapas`);
        expect(nodos.some((n) => n.name === `hueco-${v.name}`), v.name).toBe(true);
      }
    });

    it(`${a.id}: el vacío en el origen, para que en el centro sea el ala tal cual`, () => {
      for (const v of vacios) {
        expect(v.translation ?? [0, 0, 0]).toEqual([0, 0, 0]);
        expect(v.rotation ?? [0, 0, 0, 1]).toEqual([0, 0, 0, 1]);
        expect(v.matrix).toBeUndefined();
      }
    });

    it(`${a.id}: el modelo gira lo que dice su ficha`, () => {
      for (const v of vacios) {
        const eje = v.extras!["mando"];
        const t =
          eje === "alabeo" ? r.alerones : eje === "cabeceo" ? r.profundidad : r.timon;
        expect(Number(v.extras!["positivo"]), v.name).toBeCloseTo(t.arriba, 6);
        expect(Number(v.extras!["negativo"]), v.name).toBeCloseTo(t.abajo, 6);
        expect(eje).toBe(ejeDeLaPieza(v.name!));
      }
    });

    it(`${a.id}: el de la izquierda es el reflejo del de la derecha`, () => {
      for (const d of vacios.filter((v) => v.name!.endsWith("-derecha"))) {
        const i = vacios.find((v) => v.name === d.name!.replace(/-derecha$/, "-izquierda"));
        expect(i, `${d.name} sin su gemelo`).toBeDefined();
        const [bd, bi] = [numeros(d.extras!["bisagra"]), numeros(i!.extras!["bisagra"])];
        const [ed, ei] = [numeros(d.extras!["eje"]), numeros(i!.extras!["eje"])];
        expect(bi[0]).toBeCloseTo(-bd[0]!, 4);
        expect(bi[1]).toBeCloseTo(bd[1]!, 4);
        expect(bi[2]).toBeCloseTo(bd[2]!, 4);
        // El eje es axial: bajo el reflejo cambian la y y la z, y los dos
        // giran hacia arriba en positivo.
        expect(ei[0]).toBeCloseTo(ed[0]!, 4);
        expect(ei[1]).toBeCloseTo(-ed[1]!, 4);
        expect(ei[2]).toBeCloseTo(-ed[2]!, 4);
        // Y el volante a la derecha sube uno y baja el otro; la profundidad,
        // las dos a la vez.
        const [sd, si] = [Number(d.extras!["signo"]), Number(i!.extras!["signo"])];
        if (d.extras!["mando"] === "alabeo") expect(si).toBe(-sd);
        else expect(si).toBe(sd);
      }
    });

    it(`${a.id}: giran por su bisagra, hacia donde toca y lo que dice la ficha`, async () => {
      const raiz = await escenaDe(a.id);
      const mandos = prepararMandos(raiz, r)!;
      expect(mandos).not.toBeNull();
      expect(mandos.piezas.length).toBe(vacios.length);
      const seVe = (o: Object3D | undefined): boolean => {
        for (let p: Object3D | null | undefined = o; p; p = p.parent)
          if (!p.visible) return false;
        return !!o;
      };

      for (const p of mandos.piezas) {
        const piel = p.nodo.getObjectByName(`${p.nombre}-piel`)!;
        expect(piel, `${p.nombre} sin piel`).toBeDefined();
        const d = p.nodo.userData;
        // Dos puntos de la bisagra, en el mundo, quietos.
        const b = new Vector3(...numeros(d["bisagra"]));
        const e = new Vector3(...numeros(d["eje"])).normalize();
        const enLaBisagra = [b.clone(), b.clone().addScaledVector(e, 0.5)].map((q) =>
          q.applyMatrix4(raiz.matrixWorld),
        );
        piel.updateWorldMatrix(true, false);
        const local = enLaBisagra.map((q) =>
          q.clone().applyMatrix4(new Matrix4().copy(piel.matrixWorld).invert()),
        );
        const antes = caja(raiz, piel);
        const giroAntes = new Quaternion();
        piel.getWorldQuaternion(giroAntes);
        const matriz = p.nodo.matrix.clone();
        expect(seVe(raiz.getObjectByName(`${p.nombre}-tapas`))).toBe(false);
        expect(seVe(raiz.getObjectByName(`hueco-${p.nombre}`))).toBe(false);

        // El mando a fondo en positivo: el volante a la derecha, tirar, el pie
        // derecho.
        mandos.poner({ alabeo: 1, cabeceo: 1, guinada: 1 });
        raiz.updateWorldMatrix(true, true);
        const signo = Number(d["signo"]);
        const esperado = signo > 0 ? p.topes.arriba : -p.topes.abajo;
        expect(mandos.grados(p.nombre), p.nombre).toBeCloseTo(esperado, 9);

        // Lo que ha girado de verdad la pieza, en el mundo.
        const giroDespues = new Quaternion();
        piel.getWorldQuaternion(giroDespues);
        const cambio = giroDespues.clone().multiply(giroAntes.clone().invert());
        const angulo = (2 * Math.acos(Math.min(1, Math.abs(cambio.w))) * 180) / Math.PI;
        expect(angulo, `${p.nombre} gira`).toBeCloseTo(Math.abs(esperado), 3);

        // Y por su bisagra: los puntos de la bisagra no se han movido.
        local.forEach((q, k) => {
          const ahora = q.clone().applyMatrix4(piel.matrixWorld);
          expect(ahora.distanceTo(enLaBisagra[k]!), `${p.nombre} bisagra`).toBeLessThan(1e-4);
        });

        // Hacia donde toca: el borde de salida sube —o va a la derecha, el
        // timón— con el ángulo en positivo.
        const despues = caja(raiz, piel);
        if (p.eje === "guinada") {
          // En los ejes del avión la derecha es la +x.
          expect(despues.max.x - antes.max.x, `${p.nombre} a la derecha`).toBeGreaterThan(0.02);
        } else if (esperado > 0) {
          expect(despues.max.y - antes.max.y, `${p.nombre} sube`).toBeGreaterThan(0.02);
        } else {
          expect(despues.min.y - antes.min.y, `${p.nombre} baja`).toBeLessThan(-0.02);
        }
        expect(seVe(raiz.getObjectByName(`${p.nombre}-tapas`))).toBe(true);
        expect(seVe(raiz.getObjectByName(`hueco-${p.nombre}`))).toBe(true);

        // Y en el centro, exactamente como vino.
        mandos.poner(MANDOS_AL_CENTRO);
        p.nodo.updateMatrix();
        expect(p.nodo.matrix.equals(matriz), `${p.nombre} vuelve`).toBe(true);
        expect(seVe(raiz.getObjectByName(`${p.nombre}-tapas`))).toBe(false);
        expect(seVe(raiz.getObjectByName(`hueco-${p.nombre}`))).toBe(false);
      }
    });
  }
});

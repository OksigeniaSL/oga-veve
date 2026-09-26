/**
 * Los flaps que trae cada modelo, leídos del `.glb` que carga el juego.
 *
 * Es un contrato entre dos lenguajes —`flaps_moviles` en
 * `modelos/exterior.py` escribe, `world/flaps.ts` lee— y la ficha de cada
 * avión en un tercero: los grados de cada muesca están en `aircraft.ts`, que
 * es lo que rotula la regla del cuadro, y en el modelo, que es lo que baja el
 * ala. Si un día dicen cosas distintas, la aguja marca quince y el ala baja
 * veinte. Esto lo caza sin abrir el juego.
 */
import { describe, expect, it } from "vitest";
import type { Points } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT } from "../flight/aircraft";
import { DETENTES } from "../flight/flaps";
import { crearLucesDePosicion } from "./luces-de-posicion";

interface Nodo {
  name?: string;
  children?: number[];
  mesh?: number;
  translation?: number[];
  rotation?: number[];
  scale?: number[];
  matrix?: number[];
  extras?: Record<string, unknown>;
}

/*
 * **El fichero, leído con el `fs` de Node pedido en marcha.** Importarlo por su
 * nombre obligaría a meter los tipos de Node en el `tsconfig` —ver
 * `style.test.ts`—, y un `.glb` no se deja traer con `?raw` ni con
 * `?inline`: son megas de binario. Vitest corre en Node, así que el módulo
 * está; solo se le pide sin que el compilador tenga que conocerlo.
 */
const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

/** El JSON de un `.glb`: su primer trozo, sin tocar los binarios. */
function nodosDe(id: string): Nodo[] {
  const b = fs.readFileSync(`public/assets/aeronaves/${id}.glb`);
  const vista = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const largo = vista.getUint32(12, true);
  const tipo = new TextDecoder().decode(b.subarray(16, 20));
  if (tipo !== "JSON") throw new Error(`${id}.glb sin trozo JSON`);
  const json = JSON.parse(
    new TextDecoder().decode(b.subarray(20, 20 + largo)),
  ) as { nodes: Nodo[] };
  return json.nodes;
}

const numeros = (v: unknown): number[] => (v as number[]).map(Number);

describe("los flaps de cada modelo", () => {
  for (const a of AIRCRAFT) {
    const nodos = nodosDe(a.id);
    const flaps = nodos.filter(
      (n) => /^flap-/.test(n.name ?? "") && n.extras?.["muescas"],
    );

    if (!a.llevaFlaps) {
      it(`${a.id}: no los lleva, y su modelo no trae ninguno`, () => {
        expect(flaps).toHaveLength(0);
      });
      /*
       * Ni el reloj ni el botón de la cabina: los dos encendían una palanca
       * que el ala no tiene. Ver `cabina` en `modelos/comun.py`.
       */
      it(`${a.id}: ni reloj ni botón de flaps en la cabina`, () => {
        const nombres = nodos.map((n) => n.name ?? "");
        expect(nombres).not.toContain("reloj-flaps");
        expect(nombres).not.toContain("boton-flaps");
      });
      continue;
    }

    it(`${a.id}: los trae, de dos en dos, uno por lado`, () => {
      expect(flaps.length).toBeGreaterThanOrEqual(2);
      expect(flaps.length % 2).toBe(0);
    });

    it(`${a.id}: con los grados de su ficha en cada muesca`, () => {
      for (const f of flaps) {
        expect(numeros(f.extras!["muescas"])).toEqual([...a.muescasDeFlaps]);
        expect(numeros(f.extras!["recorrido"])).toHaveLength(DETENTES.length);
      }
    });

    it(`${a.id}: el vacío en el origen, para que recogido sea el ala tal cual`, () => {
      for (const f of flaps) {
        expect(f.translation ?? [0, 0, 0]).toEqual([0, 0, 0]);
        expect(f.rotation ?? [0, 0, 0, 1]).toEqual([0, 0, 0, 1]);
        expect(f.matrix).toBeUndefined();
      }
    });

    it(`${a.id}: con su piel, sus tapas y el hueco que deja en el ala`, () => {
      for (const f of flaps) {
        const hijos = (f.children ?? []).map((i) => nodos[i]!.name ?? "");
        expect(hijos).toContain(`${f.name}-piel`);
        expect(hijos).toContain(`${f.name}-tapas`);
        expect(nodos.some((n) => n.name === `hueco-${f.name}`)).toBe(true);
      }
    });

    it(`${a.id}: el de la izquierda es el reflejo del de la derecha`, () => {
      for (const d of flaps.filter((f) => f.name!.endsWith("-derecha"))) {
        const i = flaps.find(
          (f) => f.name === d.name!.replace(/-derecha$/, "-izquierda"),
        );
        expect(i, `${d.name} sin su gemelo`).toBeDefined();
        const [bd, bi] = [numeros(d.extras!["bisagra"]), numeros(i!.extras!["bisagra"])];
        const [ed, ei] = [numeros(d.extras!["eje"]), numeros(i!.extras!["eje"])];
        const [cd, ci] = [numeros(d.extras!["carril"]), numeros(i!.extras!["carril"])];
        // Un punto y el carril cambian la x; el eje, que es axial, la y y la z.
        expect(bi[0]).toBeCloseTo(-bd[0]!, 4);
        expect(bi[1]).toBeCloseTo(bd[1]!, 4);
        expect(bi[2]).toBeCloseTo(bd[2]!, 4);
        expect(ei[0]).toBeCloseTo(ed[0]!, 4);
        expect(ei[1]).toBeCloseTo(-ed[1]!, 4);
        expect(ei[2]).toBeCloseTo(-ed[2]!, 4);
        expect(ci[0]).toBeCloseTo(-cd[0]!, 4);
        expect(ci[1]).toBeCloseTo(cd[1]!, 4);
        expect(ci[2]).toBeCloseTo(cd[2]!, 4);
        expect(numeros(i!.extras!["recorrido"])).toEqual(numeros(d.extras!["recorrido"]));
      }
    });

    /*
     * **Y las colas de las canoas, en su plano.** Colgadas del flap giraban
     * con su bisagra en flecha y se torcían de lado: medio metro hacia fuera
     * en el Yvága. Ahora cada una trae su vacío, con el eje a lo ancho y el
     * carril, el recorrido y los grados de su flap. Ver `canoas_con_flap` en
     * `modelos/exterior.py`.
     */
    const colas = nodos.filter(
      (n) => /^cola-/.test(n.name ?? "") && n.extras?.["muescas"],
    );
    if (colas.length) {
      it(`${a.id}: la cola de cada canoa baja en su plano, con su flap`, () => {
        for (const c of colas) {
          const e = c.extras!;
          const f = flaps.find((x) => x.name === e["flap"]);
          expect(f, `${c.name} sin su flap`).toBeDefined();
          expect(numeros(e["eje"])).toEqual([1, 0, 0]);
          expect(numeros(e["carril"])).toEqual(numeros(f!.extras!["carril"]));
          expect(numeros(e["recorrido"])).toEqual(
            numeros(f!.extras!["recorrido"]),
          );
          expect(numeros(e["muescas"])).toEqual([...a.muescasDeFlaps]);
          const hijos = (c.children ?? []).map((i) => nodos[i]!.name ?? "");
          expect(hijos.some((h) => h.endsWith("-cola"))).toBe(true);
          expect(hijos.some((h) => h.endsWith("-cola-tapas"))).toBe(true);
          const nombres = nodos.map((n) => n.name ?? "");
          expect(nombres).toContain(`hueco-${c.name}`);
          expect(nombres).toContain(`hueco-${c.name}-carril`);
        }
      });
    }

    it(`${a.id}: la bisagra, a lo largo del ala y girando hacia abajo`, () => {
      for (const f of flaps) {
        const e = numeros(f.extras!["eje"]);
        const c = numeros(f.extras!["carril"]);
        /*
         * A lo ancho, no a lo largo —una bisagra de flap va por el ala—, y
         * con la x positiva a los dos lados: girando en positivo, lo que está
         * detrás de la bisagra va hacia `eje × (0, 0, 1) = (ey, −ex, 0)`, o
         * sea hacia abajo. Es lo que hace que en los dos lados «más grados»
         * sea «más abajo».
         */
        expect(e[0]!).toBeGreaterThan(0.7);
        // Y el carril, hacia la cola.
        expect(c[2]!).toBeGreaterThan(0.9);
      }
    });
  }

  /*
   * **Todos salen por sus carriles, y los de los reactores mucho más.**
   *
   * Los de las avionetas giraban sobre una bisagra colgada bajo el ala, sin
   * herrajes que la sujetaran y abriendo una ranura del diez por ciento de la
   * cuerda: una placa suelta detrás del ala. Ahora salen un poco por carriles
   * cortos —ranurados— y los reactores, cuatro quintos de su cuerda —Fowler,
   * que alarga el ala—. Ver `ranurado` y `fowler` en `modelos/exterior.py`.
   */
  it("salen por sus carriles, siempre a más; los Fowler de los reactores, más lejos", () => {
    // Lo que sale al final, en cuerdas medias del ala: un avión grande saca
    // más metros por ser grande, y eso no es lo que se mide aquí.
    const sale = (id: string) => {
      const a = AIRCRAFT.find((x) => x.id === id)!;
      return nodosDe(id)
        .filter((n) => /^flap-/.test(n.name ?? "") && n.extras?.["muescas"])
        .map((f) => {
          const r = numeros(f.extras!["recorrido"]);
          return r[r.length - 1]! / (a.wingArea / a.wingSpan);
        });
    };
    for (const a of AIRCRAFT) {
      if (!a.llevaFlaps) continue;
      const flaps = nodosDe(a.id).filter(
        (n) => /^flap-/.test(n.name ?? "") && n.extras?.["muescas"],
      );
      for (const f of flaps) {
        const r = numeros(f.extras!["recorrido"]);
        expect(r[0]).toBe(0);
        for (let i = 1; i < r.length; i++) expect(r[i]!).toBeGreaterThan(r[i - 1]!);
      }
    }
    for (const reactor of ["jaz-90", "jaz-120"])
      for (const avioneta of ["jaz-20", "jaz-40", "jaz-60"])
        expect(Math.min(...sale(reactor))).toBeGreaterThan(
          Math.max(...sale(avioneta)),
        );
  });
});

/*
 * **Y el ala, la de antes: el foco de aterrizaje donde estaba.**
 *
 * Para partir un flap junto a una góndola hace falta un anillo nuevo en el
 * ala, y el juego pone el foco en el vértice más adelantado del ala entre el
 * 7 y el 18 % de la envergadura —ver `puntasDe`—. El anillo nuevo del Panambi
 * y del Arasunu caía en esa franja y su vértice del borde de ataque ganaba:
 * el del Panambi quedaba metido en la góndola, y en vuelo el avión se quedaba
 * sin focos a la vista. Ahora el ala conserva los vértices que tenía y lo del
 * anillo va aparte, en `franja-fija`. Ver `_franja_fija` en
 * `modelos/exterior.py`.
 *
 * Las cifras son las del foco con los modelos de antes de que los flaps se
 * movieran, medidas con el mismo `crearLucesDePosicion` que usa el juego.
 */
describe("el foco de aterrizaje, donde estaba antes de los flaps", () => {
  const ANTES: Record<string, readonly [number, number, number]> = {
    "jaz-20": [1.3201, 0.1919, 0.162],
    "jaz-25": [1.4993, -0.0426, -1.593],
    "jaz-40": [1.4268, 0.0754, -0.7475],
    "jaz-60": [3.1, -0.1968, -1.0479],
    "jaz-90": [3.9753, -0.7022, -1.7613],
    "jaz-120": [9.3855, -0.9135, -7.1082],
  };
  for (const a of AIRCRAFT) {
    const antes = ANTES[a.id];
    if (!antes) continue;
    it(`${a.id}: el foco, en el mismo sitio`, async () => {
      const b = fs.readFileSync(`public/assets/aeronaves/${a.id}.glb`);
      const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
      const modelo = await new GLTFLoader().parseAsync(
        datos as ArrayBuffer,
        "",
      );
      modelo.scene.updateWorldMatrix(true, true);
      const foco = crearLucesDePosicion(a, modelo.scene).grupo
        .children[2] as Points;
      const p = foco.geometry.getAttribute("position");
      expect(p.getX(0)).toBeCloseTo(antes[0], 3);
      expect(p.getY(0)).toBeCloseTo(antes[1], 3);
      expect(p.getZ(0)).toBeCloseTo(antes[2], 3);
    });
  }
});

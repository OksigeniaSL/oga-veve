/**
 * Los aerofrenos de cada modelo, leídos del `.glb` que carga el juego, y
 * movidos como los mueve.
 *
 * Es un contrato entre tres sitios: la ficha del avión dice si los lleva
 * —`aerofrenos` en `aircraft.ts`—, el guion de Blender los saca del ala
 * —`aerofreno` en `modelos/exterior.py`— y `world/aerofrenos.ts` los sube. Si
 * un día dicen cosas distintas, el modelo de vuelo frena con unos paneles que
 * no se ven, o se ven subir en un avión que no los tiene. Esto lo caza sin
 * abrir el juego.
 */
import { describe, expect, it } from "vitest";
import { Box3, Matrix4, Vector3, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT } from "../flight/aircraft";
import { AEROFRENO, anguloDelPanel, prepararAerofrenos } from "./aerofrenos";
import {
  POSICIONES,
  prepararPalancaDeAerofrenos,
} from "./palanca-de-aerofrenos";
import { prepararPatas } from "./patas";

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
  const json = JSON.parse(
    new TextDecoder().decode(b.subarray(20, 20 + largo)),
  ) as { nodes: Nodo[] };
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

/** Lo alto que llega una malla en los ejes del avión, que son los de la raíz. */
function techo(raiz: Object3D, malla: Object3D): number {
  raiz.updateWorldMatrix(true, true);
  const aRaiz = new Matrix4().copy(raiz.matrixWorld).invert();
  const caja = new Box3().setFromObject(malla);
  return caja.applyMatrix4(aRaiz).max.y;
}

describe("los aerofrenos de cada modelo", () => {
  for (const a of AIRCRAFT) {
    const nodos = nodosDe(a.id);
    const paneles = nodos.filter(
      (n) => AEROFRENO.test(n.name ?? "") && n.extras?.["bisagra"],
    );

    if (a.aerofrenos === null) {
      /*
       * Los de hélice y las avionetas no los llevan, y es verdad de su clase:
       * el JAZ 60 es de la del Beech 1900D, que no tiene ni uno. Ni paneles
       * ni palanca.
       */
      it(`${a.id}: no los lleva, y su modelo no trae ninguno`, () => {
        expect(paneles).toHaveLength(0);
        expect(nodos.map((n) => n.name)).not.toContain("palanca-aerofrenos");
      });
      continue;
    }

    it(`${a.id}: los trae, de dos en dos, con su piel, sus tapas y su hueco`, () => {
      expect(paneles.length).toBeGreaterThanOrEqual(4);
      expect(paneles.length % 2).toBe(0);
      for (const p of paneles) {
        const hijos = (p.children ?? []).map((i) => nodos[i]!.name ?? "");
        expect(hijos).toContain(`${p.name}-piel`);
        expect(hijos).toContain(`${p.name}-tapas`);
        expect(nodos.some((n) => n.name === `hueco-${p.name}`)).toBe(true);
      }
    });

    it(`${a.id}: el vacío en el origen, para que recogido sea el ala tal cual`, () => {
      for (const p of paneles) {
        expect(p.translation ?? [0, 0, 0]).toEqual([0, 0, 0]);
        expect(p.rotation ?? [0, 0, 0, 1]).toEqual([0, 0, 0, 1]);
        expect(p.matrix).toBeUndefined();
      }
    });

    it(`${a.id}: unos suben en vuelo y todos en tierra, más o igual que en vuelo`, () => {
      const vuelo = paneles.map((p) => Number(p.extras!["vuelo"]));
      const tierra = paneles.map((p) => Number(p.extras!["tierra"]));
      expect(vuelo.some((g) => g > 0)).toBe(true);
      expect(vuelo.some((g) => g === 0)).toBe(true);
      for (let i = 0; i < paneles.length; i++) {
        expect(tierra[i]!).toBeGreaterThanOrEqual(vuelo[i]!);
        // Entre cuarenta y sesenta, que es lo que suben en tierra los de un
        // avión de línea; y en vuelo, nunca más.
        expect(tierra[i]!).toBeGreaterThanOrEqual(40);
        expect(tierra[i]!).toBeLessThanOrEqual(60);
      }
    });

    it(`${a.id}: la bisagra, a lo ancho y subiendo el borde de atrás`, () => {
      for (const p of paneles) {
        const e = numeros(p.extras!["eje"]);
        /*
         * Girando en positivo, lo que está detrás de la bisagra —hacia la
         * cola, la z— va hacia `eje × (0, 0, 1) = (ey, −ex, 0)`: con la x del
         * eje negativa, hacia arriba. En los dos lados.
         */
        expect(e[0]!).toBeLessThan(-0.7);
      }
    });

    it(`${a.id}: el de la izquierda es el reflejo del de la derecha`, () => {
      for (const d of paneles.filter((p) => p.name!.endsWith("-derecha"))) {
        const i = paneles.find(
          (p) => p.name === d.name!.replace(/-derecha$/, "-izquierda"),
        );
        expect(i, `${d.name} sin su gemelo`).toBeDefined();
        const [bd, bi] = [
          numeros(d.extras!["bisagra"]),
          numeros(i!.extras!["bisagra"]),
        ];
        const [ed, ei] = [numeros(d.extras!["eje"]), numeros(i!.extras!["eje"])];
        expect(bi[0]).toBeCloseTo(-bd[0]!, 4);
        expect(bi[1]).toBeCloseTo(bd[1]!, 4);
        expect(bi[2]).toBeCloseTo(bd[2]!, 4);
        // El eje es axial: bajo el reflejo cambian la y y la z.
        expect(ei[0]).toBeCloseTo(ed[0]!, 4);
        expect(ei[1]).toBeCloseTo(-ed[1]!, 4);
        expect(ei[2]).toBeCloseTo(-ed[2]!, 4);
        expect(i!.extras!["vuelo"]).toBe(d.extras!["vuelo"]);
        expect(i!.extras!["tierra"]).toBe(d.extras!["tierra"]);
      }
    });

    it(`${a.id}: suben de verdad, y recogidos vuelven exactamente a su sitio`, async () => {
      const raiz = await escenaDe(a.id);
      const af = prepararAerofrenos(raiz)!;
      expect(af).not.toBeNull();
      expect(af.cuantos).toBe(paneles.length);
      const pieles: Object3D[] = [];
      const vacios: Object3D[] = [];
      raiz.traverse((o) => {
        if (AEROFRENO.test(o.name) && o.userData["bisagra"]) vacios.push(o);
      });
      for (const v of vacios) {
        const piel = v.getObjectByName(`${v.name}-piel`);
        expect(piel, `${v.name} sin piel`).toBeDefined();
        pieles.push(piel!);
      }
      const antes = vacios.map((v) => v.matrix.clone());
      const altos = pieles.map((p) => techo(raiz, p));
      /*
       * Lo que se ve de verdad: la pieza y todo lo que tiene encima
       * encendido. El hueco lleva dos materiales —fondo y paredes—, y el
       * cargador lo trae como un grupo con dos mallas dentro: se apaga el
       * grupo, y las de dentro siguen diciendo que sí.
       */
      const seVe = (o: Object3D | undefined): boolean => {
        for (let p: Object3D | null | undefined = o; p; p = p.parent)
          if (!p.visible) return false;
        return !!o;
      };
      const cierres = () =>
        vacios.reduce(
          (n, v) =>
            n +
            Number(seVe(raiz.getObjectByName(`${v.name}-tapas`))) +
            Number(seVe(raiz.getObjectByName(`hueco-${v.name}`))),
          0,
        );
      // Recogidos, como llegan: nada de lo que solo se ve con ellos arriba.
      expect(cierres()).toBe(0);

      // En tierra, todos arriba: el borde de atrás, varios centímetros.
      af.poner(0, 1);
      pieles.forEach((p, k) => {
        expect(
          techo(raiz, p) - altos[k]!,
          `${vacios[k]!.name} en tierra`,
        ).toBeGreaterThan(0.1);
      });
      expect(cierres()).toBe(2 * vacios.length);

      // En vuelo, solo los de vuelo; los de tierra se quedan en su sitio.
      af.poner(1, 0);
      vacios.forEach((v, k) => {
        const deVuelo = Number(v.userData["vuelo"]) > 0;
        const sube = techo(raiz, pieles[k]!) - altos[k]!;
        if (deVuelo) expect(sube, `${v.name} en vuelo`).toBeGreaterThan(0.1);
        else expect(v.matrix.equals(antes[k]!), `${v.name} en vuelo`).toBe(true);
      });
      expect(af.deVuelo).toBe(
        vacios.filter((v) => Number(v.userData["vuelo"]) > 0).length,
      );

      // Y recogidos otra vez: la misma matriz, no una parecida.
      af.poner(0, 0);
      vacios.forEach((v, k) => {
        v.updateMatrix();
        expect(v.matrix.equals(antes[k]!), v.name).toBe(true);
      });
      expect(cierres()).toBe(0);
    });

    it(`${a.id}: la palanca de la cabina va hacia atrás al sacarlos, y el tren no la toma por suya`, async () => {
      const raiz = await escenaDe(a.id);
      const palanca = prepararPalancaDeAerofrenos(raiz);
      expect(palanca).not.toBeNull();
      const pomo = raiz.getObjectByName("pomo-frenos")!;
      expect(pomo).toBeDefined();
      const aRaiz = new Matrix4().copy(raiz.matrixWorld).invert();
      const donde = (): Vector3 => {
        raiz.updateWorldMatrix(true, true);
        return new Box3()
          .setFromObject(pomo)
          .applyMatrix4(aRaiz)
          .getCenter(new Vector3());
      };
      palanca!.poner(POSICIONES.recogida);
      const abajo = donde();
      palanca!.poner(POSICIONES.armada);
      const armada = donde();
      palanca!.poner(POSICIONES.arriba);
      const arriba = donde();
      // Hacia la cola, que es hacia el piloto: la z crece.
      expect(armada.z).toBeGreaterThan(abajo.z);
      expect(arriba.z - abajo.z).toBeGreaterThan(0.05);
      // Y va a la izquierda del pedestal, donde la lleva la mano del
      // comandante; los flaps, a la derecha.
      const flaps = new Box3()
        .setFromObject(raiz.getObjectByName("pomo-flaps")!)
        .applyMatrix4(aRaiz)
        .getCenter(new Vector3());
      expect(abajo.x).toBeLessThan(flaps.x);
      // Las patas buscan `bisagra-…`: la palanca no puede acabar en el pozo.
      const patas = prepararPatas(raiz);
      patas?.poner(0);
      palanca!.poner(POSICIONES.recogida);
      expect(donde().distanceTo(abajo)).toBeLessThan(1e-6);
    });
  }
});

describe("a qué ángulo va cada panel", () => {
  it("se queda con lo que más lo sube, y nunca pasa de su tope", () => {
    // Uno de vuelo a medio sacar, en el aire.
    expect(anguloDelPanel(40, 50, 0.5, 0)).toBe(20);
    // Al tocar con los de tierra fuera, del todo.
    expect(anguloDelPanel(40, 50, 0.5, 1)).toBe(50);
    // Uno solo de tierra no sube en vuelo por mucho que se saque la palanca.
    expect(anguloDelPanel(0, 50, 1, 0)).toBe(0);
    // Y lo que venga fuera de 0 a 1 no lo pasa de su tope.
    expect(anguloDelPanel(40, 50, 3, 2)).toBe(50);
    expect(anguloDelPanel(40, 50, Number.NaN, -1)).toBe(0);
  });
});

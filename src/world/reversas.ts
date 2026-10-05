/**
 * Las reversas que se abren, en el modelo (punto 254).
 *
 * Son la mitad visible de la reversa: la otra —el chorro que frena— la lleva
 * el modelo de vuelo, y lo que tarda en abrirse, `flight/reversa.ts`. Estaba
 * solo esa otra mitad, y desde la ventanilla de un avión de verdad la reversa
 * es de lo primero que se ve al tocar: la cubierta del motor se parte, la
 * parte de atrás se va hacia la cola y entre las dos aparece una corona de
 * rejillas oscuras, la cascada, por la que sale el aire hacia delante.
 *
 * ## El modelo dice cómo, el juego solo mueve
 *
 * Cada manguito cuelga de un vacío `reversa-…` puesto en el origen, con, en
 * los ejes del avión —x a la derecha, y arriba, z a la cola—:
 *
 * - `eje`: hacia dónde se desliza;
 * - `recorrido`: cuántos metros, abierto del todo.
 *
 * Los dos motores de un lado y su gemelo del otro van en la misma malla, por
 * simetría, así que un vacío por estación de motor. Ver `reversa` en
 * `modelos/exterior.py`.
 */

import { Matrix3, Vector3, type Object3D } from "three";

/**
 * Cómo se llaman los vacíos de los manguitos. Es un contrato entre dos
 * lenguajes —`reversa` en `modelos/exterior.py`— y por eso está en un solo
 * sitio.
 */
export const REVERSA = /^reversa-/;

interface Manguito {
  readonly nodo: Object3D;
  readonly reposo: Vector3;
  /** El desplazamiento abierto del todo, ya en el marco del padre. */
  readonly abierto: Vector3;
  cuanto: number;
}

export interface Reversas {
  /** Cuántas estaciones de motor llevan manguito, sin contar el gemelo. */
  readonly cuantas: number;
  /** El recorrido de cada una abierta del todo, m. Para las pruebas. */
  readonly recorridos: readonly number[];
  /** Las pone abiertas `cuanto`, de 0 a 1. */
  poner(cuanto: number): void;
}

function vector(v: unknown): Vector3 | null {
  if (!Array.isArray(v) || v.length !== 3) return null;
  const [x, y, z] = v.map(Number);
  if (![x, y, z].every((n) => Number.isFinite(n))) return null;
  return new Vector3(x, y, z);
}

/**
 * Prepara las reversas de un modelo para poder abrirlas.
 *
 * Devuelve `null` si el modelo no trae ninguna: los de pistón no la llevan,
 * los de hélice la llevan en las palas —ver `flight/reversa.ts`— y el
 * respaldo de cajas tampoco. Que falte un recurso no deja a nadie sin volar.
 */
export function prepararReversas(raiz: Object3D): Reversas | null {
  raiz.updateWorldMatrix(true, true);
  const manguitos: Manguito[] = [];
  const recorridos: number[] = [];
  raiz.traverse((o) => {
    if (!REVERSA.test(o.name) || !o.parent) return;
    const eje = vector(o.userData["eje"]);
    const recorrido = Number(o.userData["recorrido"]);
    if (!eje || !Number.isFinite(recorrido) || recorrido <= 0) return;
    /*
     * De los ejes del avión al marco del padre del vacío, como los
     * aerofrenos: en estos modelos es el nodo `avion`, con su cuarto de
     * vuelta para Blender. Un desplazamiento es un vector, así que va sin la
     * traslación y con la escala, si la hubiera.
     */
    const aPadre = o.parent.matrixWorld.clone().invert().multiply(raiz.matrixWorld);
    const abierto = eje
      .normalize()
      .multiplyScalar(recorrido)
      .applyMatrix3(new Matrix3().setFromMatrix4(aPadre));
    manguitos.push({ nodo: o, reposo: o.position.clone(), abierto, cuanto: 0 });
    recorridos.push(recorrido);
  });
  if (!manguitos.length) return null;
  return {
    cuantas: manguitos.length,
    recorridos,
    poner(cuanto: number) {
      const k = Number.isFinite(cuanto) ? Math.max(0, Math.min(1, cuanto)) : 0;
      for (const m of manguitos) {
        if (m.cuanto === k) continue;
        m.cuanto = k;
        m.nodo.position.copy(m.reposo).addScaledVector(m.abierto, k);
      }
    },
  };
}

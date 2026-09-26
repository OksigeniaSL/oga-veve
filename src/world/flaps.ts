/**
 * Los flaps que se mueven, en el modelo.
 *
 * Son la mitad visible de la palanca: la otra —lo que sustentan y lo que
 * frenan— se siente en el modelo de vuelo. Hacen falta por lo mismo que las
 * patas del tren (`patas.ts`): un mando que no cambia nada en la pantalla no
 * parece un mando. Y porque un niño que ve bajar los flaps de verdad desde la
 * ventanilla, el día que vuele, tiene que reconocer lo que está viendo.
 *
 * ## El modelo dice cómo, el juego solo mueve
 *
 * Cada flap cuelga en el modelo de un vacío `flap-…` con, en los ejes del
 * avión —x a la derecha, y arriba, z a la cola—:
 *
 * - `bisagra` y `eje`: por dónde gira —el eje de las ruedas de su carro, que
 *   va dentro de la nariz—; en positivo, el borde de salida baja.
 * - `muescas`: los grados en cada tope de la palanca.
 * - `carril` y `recorrido`: hacia dónde sale y cuántos metros en cada tope.
 *   Un flap ranurado de avioneta sale poco por unos carriles cortos; un
 *   Fowler de avión de línea, cuatro quintos de su cuerda.
 *
 * Aquí no hay nada de cada avión: se pasa todo eso al marco del padre del
 * vacío —que en estos modelos es el nodo `avion`, con su cuarto de vuelta
 * para Blender; es el error de marco que hizo ir el tren hacia atrás, y no
 * puede volver por aquí— y se mueve. Ver `flaps_moviles` en
 * `modelos/exterior.py`.
 *
 * ## Recogidos, exactamente como estaban
 *
 * El vacío está en el origen y no en la bisagra, y con los flaps arriba se le
 * devuelve **la misma** posición y el mismo giro que traía, copiados, no
 * recalculados: el flap recogido cuelga de la misma matriz que el ala.
 *
 * Y lo que cierra el corte —las tapas del flap y el hueco oscuro que deja en
 * el ala— **no se dibuja con el flap recogido**. Va por dentro y no se ve,
 * pero su borde cae en el borde de la chapa, a la misma profundidad, y los
 * dos se peleaban: medido con la GPU, quince píxeles sueltos por vista en la
 * junta. Apagado, el avión recogido es exactamente las caras que tenía antes
 * de que el flap se pudiera mover. En cuanto sale, se enciende.
 */

import { Matrix4, Quaternion, Vector3, type Object3D } from "three";
import { enLaMuesca } from "../flight/flaps";

/**
 * Cómo se llaman los vacíos de los flaps en los modelos. Es un contrato entre
 * dos lenguajes —`flaps_moviles` en `modelos/exterior.py`— y por eso está en
 * un solo sitio.
 */
export const FLAP = /^flap-/;

/**
 * Y las colas de las canoas, que bajan con los flaps pero no son flaps.
 *
 * La parte de atrás del carenado de un carril va sujeta al carro del flap:
 * sale con él por el carril y baja, **en su plano**, que es el de la dirección
 * del vuelo. Colgada del flap giraba con su bisagra en flecha y se torcía de
 * lado. Su vacío trae los mismos datos que el de un flap —el carril, el
 * recorrido y los grados del suyo, y un eje a lo ancho— y se mueve con la
 * misma cuenta. Ver `canoas_con_flap` en `modelos/exterior.py`.
 */
export const COLA_DE_CANOA = /^cola-/;

/** Un flap: su vacío, cómo estaba y cómo se mueve, ya en el marco del padre. */
interface Flap {
  readonly nodo: Object3D;
  readonly posicion: Vector3;
  readonly giro: Quaternion;
  readonly escala: Vector3;
  readonly reposo: Matrix4;
  readonly bisagra: Vector3;
  readonly eje: Vector3;
  readonly carril: Vector3;
  /** Radianes en cada muesca. */
  readonly muescas: readonly number[];
  /** Metros en cada muesca, en las unidades del padre. */
  readonly recorrido: readonly number[];
  /** Lo que cierra el corte, que solo se dibuja con el flap fuera. */
  readonly cierres: readonly Object3D[];
}

export interface Flaps {
  /** Cuántos flaps se mueven: dos por semiala en los que tienen dos. */
  readonly cuantos: number;
  /** Y cuántas colas de canoa bajan con ellos. */
  readonly colas: number;
  /** Los pone donde toca. `donde` es 0 recogidos y 1 abajo del todo. */
  poner(donde: number): void;
}

function vector(v: unknown): Vector3 | null {
  if (!Array.isArray(v) || v.length !== 3) return null;
  const [x, y, z] = v.map(Number);
  if (![x, y, z].every((n) => Number.isFinite(n))) return null;
  return new Vector3(x, y, z);
}

function cifras(v: unknown): number[] | null {
  if (!Array.isArray(v) || v.length < 2) return null;
  const n = v.map(Number);
  return n.every((x) => Number.isFinite(x)) ? n : null;
}

/**
 * Prepara los flaps de un modelo para poder moverlos.
 *
 * Devuelve `null` si el modelo no trae ninguno, que es lo que pasa con el
 * respaldo de cajas y con el biplano fumigador, que no los tiene: vuelan
 * igual. Que falte un recurso no deja a nadie sin volar.
 */
export function prepararFlaps(raiz: Object3D): Flaps | null {
  raiz.updateWorldMatrix(true, true);
  const flaps: Flap[] = [];
  let colas = 0;
  raiz.traverse((o) => {
    const esCola = COLA_DE_CANOA.test(o.name);
    if ((!FLAP.test(o.name) && !esCola) || !o.parent) return;
    const d = o.userData;
    const bisagra = vector(d["bisagra"]);
    const eje = vector(d["eje"]);
    const carril = vector(d["carril"]);
    const muescas = cifras(d["muescas"]);
    const recorrido = cifras(d["recorrido"]);
    if (!bisagra || !eje || !carril || !muescas || !recorrido) return;
    if (recorrido.length !== muescas.length) return;
    /*
     * De los ejes del avión —los de la raíz del glTF— al marco del padre del
     * vacío. Lo que haya por encima de la raíz —la escala a la envergadura de
     * la ficha, el sitio en el mundo— se cancela en el producto.
     */
    const aPadre = o.parent.matrixWorld
      .clone()
      .invert()
      .multiply(raiz.matrixWorld);
    const escala = aPadre.getMaxScaleOnAxis();
    o.updateMatrix();
    /*
     * Las tapas cuelgan del vacío —las del flap, o la boca de la cola de una
     * canoa—, y los huecos que deja son del ala o de la canoa fija, y se
     * llaman como él: `hueco-flap-dentro-derecha`, o
     * `hueco-cola-canoa-0-derecha` y su carril.
     */
    const cierres: Object3D[] = [];
    o.traverse((h) => {
      if (h !== o && /-tapas$/.test(h.name)) cierres.push(h);
    });
    const hueco = `hueco-${o.name}`;
    raiz.traverse((h) => {
      if (h.name === hueco || h.name.startsWith(`${hueco}-`)) cierres.push(h);
    });
    if (esCola) colas++;
    flaps.push({
      nodo: o,
      posicion: o.position.clone(),
      giro: o.quaternion.clone(),
      escala: o.scale.clone(),
      reposo: o.matrix.clone(),
      bisagra: bisagra.applyMatrix4(aPadre),
      eje: eje.transformDirection(aPadre),
      carril: carril.transformDirection(aPadre),
      muescas: muescas.map((g) => (g * Math.PI) / 180),
      recorrido: recorrido.map((m) => m * escala),
      cierres,
    });
  });
  if (flaps.length === colas) return null;
  // Recogidos, que es como llega el modelo: sin tapas ni hueco a la vista.
  for (const f of flaps) for (const c of f.cierres) c.visible = false;

  const giro = new Quaternion();
  const mover = new Matrix4();
  const girada = new Vector3();
  return {
    cuantos: flaps.length - colas,
    colas,
    poner(donde: number) {
      const fuera = Math.max(0, Math.min(1, Number.isFinite(donde) ? donde : 0));
      for (const f of flaps) {
        for (const c of f.cierres) c.visible = fuera > 0;
        if (fuera <= 0) {
          // Recogidos: lo que traía el modelo, copiado. Ver la cabecera.
          f.nodo.position.copy(f.posicion);
          f.nodo.quaternion.copy(f.giro);
          f.nodo.scale.copy(f.escala);
          continue;
        }
        /*
         * Sale por el carril y gira sobre la bisagra ya desplazada: primero
         * atrás, luego abajo, que es lo que hace un Fowler; el ranurado no
         * tiene carril y solo gira.
         *
         *     x' = R (x − bisagra) + bisagra + carril · recorrido
         */
        giro.setFromAxisAngle(f.eje, enLaMuesca(f.muescas, fuera));
        girada.copy(f.bisagra).applyQuaternion(giro);
        mover
          .makeRotationFromQuaternion(giro)
          .setPosition(
            f.bisagra.x - girada.x + f.carril.x * enLaMuesca(f.recorrido, fuera),
            f.bisagra.y - girada.y + f.carril.y * enLaMuesca(f.recorrido, fuera),
            f.bisagra.z - girada.z + f.carril.z * enLaMuesca(f.recorrido, fuera),
          );
        mover.multiply(f.reposo);
        mover.decompose(f.nodo.position, f.nodo.quaternion, f.nodo.scale);
      }
    },
  };
}

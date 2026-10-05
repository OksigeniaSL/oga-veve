/**
 * **Los alerones, la profundidad y el timón de dirección**, que se mueven.
 *
 * Estaban pintados en el ala y en la cola —la raya oscura de la junta— y
 * nada más: se giraba el volante y fuera no pasaba nada, ni en el mundo ni en
 * la tarjeta del avión. «Los alerones, el timón y la profundidad no se
 * mueven», apuntó Enrique. Y un mando que no mueve nada fuera enseña que los
 * mandos son decoración; el alerón que sube cuando se gira el volante es lo
 * primero que se mira en la vuelta al avión de cualquier escuela, y lo que se
 * ve desde la ventanilla en cada viraje.
 *
 * ## El modelo dice cómo, la ficha dice cuánto, el juego solo mueve
 *
 * Cada superficie cuelga de un vacío —`aleron-derecha`, `aleron-izquierda`,
 * `profundidad-derecha`, `profundidad-izquierda`, `timon-de-direccion`; en el
 * biplano, `aleron-alto-…` y `aleron-bajo-…`— puesto en el origen, con, en
 * los ejes del avión —x a la derecha, y arriba, z a la cola—:
 *
 * - `bisagra` y `eje`: por dónde gira. En positivo, el borde de salida sube
 *   —o va a la derecha, en el timón—.
 * - `mando`: quién lo mueve, `alabeo`, `cabeceo` o `guinada`.
 * - `signo`: hacia dónde, con el mando en positivo. El volante a la derecha
 *   sube el alerón derecho y baja el izquierdo.
 *
 * **Los grados salen de la ficha**, `flight/recorrido-de-mandos.ts`, con la
 * fuente de cada uno; el modelo trae una copia para comprobar al exportar
 * que nada choca en los topes. Ver `mando` en `modelos/exterior.py`.
 *
 * ## Quieto, exactamente como estaba
 *
 * En el centro el vacío vuelve a **la misma** posición y el mismo giro que
 * traía, copiados, y lo que cierra el corte —la nariz y los costados de la
 * superficie, y la cala oscura del ala— no se dibuja: su borde cae en el de
 * la chapa y se pelearían. Es lo que hacen los flaps; ver `world/flaps.ts`.
 *
 * ## Para quien quiera moverlos
 *
 * La vuelta al avión los mueve al tocarlos, como se comprueba un alerón en el
 * suelo: `piezas` dice cuáles hay, de quién es cada malla con
 * `ejeDeLaPieza`, y se ponen a mano con `aMano`: mientras no sea `null`, el
 * juego los lleva ahí, a su ritmo, en vez de adonde dicen los mandos. Ver
 * `mandosQueSeVen` en `game.ts`.
 */

import { Matrix4, Quaternion, Vector3, type Object3D } from "three";
import type { RecorridoDeMandos, Topes } from "../flight/recorrido-de-mandos";

/**
 * Cómo se llaman los vacíos de las superficies. Es un contrato entre dos
 * lenguajes —`mando` en `modelos/exterior.py`— y por eso está en un solo
 * sitio. Las mallas de dentro se llaman igual con `-piel` o `-tapas` detrás;
 * la cala del ala, `hueco-` delante.
 */
export const SUPERFICIE_DE_MANDO = /^(aleron|profundidad|timon)-/;

/** Quién mueve cada superficie. */
export type EjeDeMando = "alabeo" | "cabeceo" | "guinada";

/**
 * Los mandos, en intención de piloto, de −1 a 1: el volante a la derecha,
 * tirar y el pie derecho, en positivo. Los mismos que `ControlInputs`.
 */
export interface PosicionDeLosMandos {
  readonly alabeo: number;
  readonly cabeceo: number;
  readonly guinada: number;
}

export const MANDOS_AL_CENTRO: PosicionDeLosMandos = { alabeo: 0, cabeceo: 0, guinada: 0 };

/**
 * **De quién es una pieza**, por su nombre o el de lo que cuelga: el vacío,
 * su piel o sus tapas. `null` si no es de una superficie de mando —la cala
 * del ala no lo es: es del ala—. Para tocarlas en la vuelta al avión.
 */
export function ejeDeLaPieza(nombre: string): EjeDeMando | null {
  if (/^aleron-/.test(nombre)) return "alabeo";
  if (/^profundidad-/.test(nombre)) return "cabeceo";
  if (/^timon-/.test(nombre)) return "guinada";
  return null;
}

/** Una superficie que se mueve: su vacío y de quién es. */
export interface SuperficieDeMando {
  /** El nombre del vacío, p. ej. `aleron-izquierda`. */
  readonly nombre: string;
  readonly eje: EjeDeMando;
  /** El vacío del que cuelgan su piel y sus tapas. */
  readonly nodo: Object3D;
  /** Sus topes, en grados, los de la ficha. */
  readonly topes: Topes;
}

export interface SuperficiesDeMando {
  /** Las que trae el modelo. */
  readonly piezas: readonly SuperficieDeMando[];
  /**
   * Las pone donde dicen los mandos, de golpe. Para que vayan a su ritmo y no
   * salten, se les da lo que devuelve `acercarLosMandos`.
   */
  poner(mandos: PosicionDeLosMandos): void;
  /** Los grados a los que está ahora cada una, por nombre. Para las pruebas. */
  grados(nombre: string): number;
  /**
   * **Movidos a mano**, desde fuera: la vuelta al avión, al tocar un alerón,
   * lo sube y lo baja como se comprueba en el suelo. Mientras no sea `null`,
   * el juego los pone aquí y no donde dicen los mandos; con `null`, vuelven.
   */
  aMano: PosicionDeLosMandos | null;
}

/**
 * **Lo deprisa que van**, en medios recorridos por segundo: del centro a un
 * tope en cuatro décimas. Es el orden del de un actuador hidráulico de avión
 * de línea —sesenta grados por segundo— y algo más lento que la mano en una
 * avioneta, que no se nota: lo que hace es que
 * un salto del mando —el automático que se suelta, el avión que despega—
 * no mueva la pieza de un fotograma a otro, que ninguna pieza de verdad lo
 * hace.
 */
export const RITMO_DE_LAS_SUPERFICIES = 2.5;

/**
 * **Los mandos que se ven, un paso más cerca de los que se piden**, a
 * `RITMO_DE_LAS_SUPERFICIES`. Aparte de las piezas para que el mundo y la
 * tarjeta del avión enseñen exactamente lo mismo.
 */
export function acercarLosMandos(
  de: PosicionDeLosMandos,
  a: PosicionDeLosMandos,
  dt: number,
): PosicionDeLosMandos {
  const paso = RITMO_DE_LAS_SUPERFICIES * Math.max(0, Number.isFinite(dt) ? dt : 0);
  const uno = (x: number, y: number): number => {
    const quiere = Math.max(-1, Math.min(1, Number.isFinite(y) ? y : 0));
    return x + Math.max(-paso, Math.min(paso, quiere - x));
  };
  return {
    alabeo: uno(de.alabeo, a.alabeo),
    cabeceo: uno(de.cabeceo, a.cabeceo),
    guinada: uno(de.guinada, a.guinada),
  };
}

/**
 * **A qué ángulo va una superficie**, en grados, con el mando de −1 a 1: su
 * signo dice hacia dónde, y cada lado tiene su tope. Un alerón sube más de lo
 * que baja —el que baja frena más, y eso guiña el avión hacia el lado que
 * no es—, y eso es lo que llevan las fichas.
 */
export function gradosDelMando(mando: number, signo: number, topes: Topes): number {
  const k = Math.max(-1, Math.min(1, Number.isFinite(mando) ? mando : 0)) * signo;
  return k >= 0 ? k * topes.arriba : k * topes.abajo;
}

function vector(v: unknown): Vector3 | null {
  if (!Array.isArray(v) || v.length !== 3) return null;
  const [x, y, z] = v.map(Number);
  if (![x, y, z].every((n) => Number.isFinite(n))) return null;
  return new Vector3(x, y, z);
}

interface Pieza extends SuperficieDeMando {
  readonly posicion: Vector3;
  readonly giro: Quaternion;
  readonly escala: Vector3;
  readonly reposo: Matrix4;
  readonly bisagra: Vector3;
  readonly ejeDeGiro: Vector3;
  readonly signo: number;
  readonly cierres: readonly Object3D[];
  /** Los grados a los que está puesto. */
  grados: number;
}

/** Por debajo de esto está en el centro: sin tapas, y como vino. */
const EN_EL_CENTRO = 0.05;

/**
 * Prepara las superficies de mando de un modelo para poder moverlas.
 *
 * Devuelve `null` si el modelo no trae ninguna —el respaldo de cajas, el
 * tráfico—: vuelan igual. Que falte un recurso no deja a nadie sin volar.
 *
 * `recorrido` es el de la ficha del avión; sin él se usan los grados que trae
 * el modelo, que son los mismos —lo comprueba la prueba—.
 */
export function prepararMandos(
  raiz: Object3D,
  recorrido: RecorridoDeMandos | null,
): SuperficiesDeMando | null {
  raiz.updateWorldMatrix(true, true);
  const piezas: Pieza[] = [];
  raiz.traverse((o) => {
    if (!SUPERFICIE_DE_MANDO.test(o.name) || !o.parent) return;
    const d = o.userData;
    const eje = d["mando"];
    if (eje !== "alabeo" && eje !== "cabeceo" && eje !== "guinada") return;
    const bisagra = vector(d["bisagra"]);
    const ejeDeGiro = vector(d["eje"]);
    const signo = Number(d["signo"]);
    if (!bisagra || !ejeDeGiro || !(signo === 1 || signo === -1)) return;
    const delModelo: Topes = {
      arriba: Number(d["positivo"]) || 0,
      abajo: Number(d["negativo"]) || 0,
    };
    const topes = recorrido
      ? eje === "alabeo"
        ? recorrido.alerones
        : eje === "cabeceo"
          ? recorrido.profundidad
          : recorrido.timon
      : delModelo;
    /*
     * De los ejes del avión —los de la raíz del glTF— al marco del padre del
     * vacío, que en estos modelos es el nodo `avion` con su cuarto de vuelta
     * para Blender. El mismo paso que los flaps y los aerofrenos, y por lo
     * mismo: el error de marco que hizo ir el tren hacia atrás no vuelve.
     */
    const aPadre = o.parent.matrixWorld.clone().invert().multiply(raiz.matrixWorld);
    o.updateMatrix();
    const cierres: Object3D[] = [];
    o.traverse((h) => {
      if (h !== o && /-tapas$/.test(h.name)) cierres.push(h);
    });
    const hueco = `hueco-${o.name}`;
    raiz.traverse((h) => {
      if (h.name === hueco) cierres.push(h);
    });
    piezas.push({
      nombre: o.name,
      eje,
      nodo: o,
      topes,
      posicion: o.position.clone(),
      giro: o.quaternion.clone(),
      escala: o.scale.clone(),
      reposo: o.matrix.clone(),
      bisagra: bisagra.applyMatrix4(aPadre),
      ejeDeGiro: ejeDeGiro.transformDirection(aPadre),
      signo,
      cierres,
      grados: 0,
    });
  });
  if (!piezas.length) return null;
  // En el centro, que es como llega el modelo: sin tapas ni cala a la vista.
  for (const p of piezas) for (const c of p.cierres) c.visible = false;

  const giro = new Quaternion();
  const mover = new Matrix4();
  const girada = new Vector3();
  const colocar = (p: Pieza, grados: number): void => {
    if (grados === p.grados) return;
    p.grados = grados;
    const fuera = Math.abs(grados) > EN_EL_CENTRO;
    for (const c of p.cierres) c.visible = fuera;
    if (!fuera) {
      // En el centro: lo que traía el modelo, copiado. Ver la cabecera.
      p.nodo.position.copy(p.posicion);
      p.nodo.quaternion.copy(p.giro);
      p.nodo.scale.copy(p.escala);
      return;
    }
    // Gira sobre su bisagra: x' = R (x − bisagra) + bisagra.
    giro.setFromAxisAngle(p.ejeDeGiro, (grados * Math.PI) / 180);
    girada.copy(p.bisagra).applyQuaternion(giro);
    mover
      .makeRotationFromQuaternion(giro)
      .setPosition(p.bisagra.x - girada.x, p.bisagra.y - girada.y, p.bisagra.z - girada.z);
    mover.multiply(p.reposo);
    mover.decompose(p.nodo.position, p.nodo.quaternion, p.nodo.scale);
  };

  return {
    piezas,
    poner(mandos: PosicionDeLosMandos) {
      for (const p of piezas)
        colocar(p, gradosDelMando(Number(mandos[p.eje]) || 0, p.signo, p.topes));
    },
    grados(nombre: string) {
      return piezas.find((p) => p.nombre === nombre)?.grados ?? 0;
    },
    aMano: null,
  };
}

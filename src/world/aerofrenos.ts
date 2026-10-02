/**
 * Los aerofrenos que se levantan, en el modelo.
 *
 * Son la mitad visible de la palanca: la otra —lo que frenan en el aire y la
 * sustentación que matan en tierra para que frenen las ruedas— la lleva el
 * modelo de vuelo. Hacían falta por lo que se dijo mirando la captura de un
 * aterrizaje: los paneles no salían, y desde la ventanilla de un avión de
 * verdad es de lo primero que se ve al tocar —«parecen de papel»—. Aquí tienen
 * grosor y bisagra, y quien los vea subir el día que vuele tiene que
 * reconocerlos.
 *
 * ## Dos cosas con la misma chapa
 *
 * Cada panel sube por una de dos razones, y hasta un ángulo distinto en cada
 * una:
 *
 * - **En vuelo**, con la palanca sacada: solo los de vuelo, y como mucho hasta
 *   su tope de vuelo. Los hay solo de tierra —su ángulo en vuelo es cero—,
 *   que es lo que tiene cada tipo: en el JAZ 90 los dos de dentro del motor,
 *   en el JAZ 120 los dos de más afuera.
 * - **En tierra**, al tocar con la palanca armada: todos, y del todo.
 *
 * Así que `poner` recibe las dos cosas, cada una de 0 a 1, y cada panel se
 * queda con la que más lo sube. Lo que valen las dos lo decide la física; aquí
 * solo se mueve. Ver `anguloDelPanel`.
 *
 * ## El modelo dice cómo, el juego solo mueve
 *
 * Cada panel cuelga de un vacío `aerofreno-…` puesto en el origen —recogido,
 * el panel cuelga de la misma matriz que el ala, como un flap—, con, en los
 * ejes del avión —x a la derecha, y arriba, z a la cola—:
 *
 * - `bisagra` y `eje`: por dónde gira; en positivo, el borde de atrás sube.
 * - `vuelo` y `tierra`: los grados de su tope en cada caso.
 *
 * Y lo que solo existe con el panel arriba —su grosor por debajo, las tapas,
 * y el hueco oscuro que deja en el ala— no se dibuja recogido: su borde cae
 * en el borde de la chapa, a la misma profundidad, y se pelearían. Es lo que
 * hacen los flaps; ver `world/flaps.ts` y `aerofreno` en
 * `modelos/exterior.py`.
 */

import { Matrix4, Quaternion, Vector3, type Object3D } from "three";

/**
 * Cómo se llaman los vacíos de los paneles. Es un contrato entre dos
 * lenguajes —`_panel_de_aerofreno` en `modelos/exterior.py`— y por eso está en
 * un solo sitio. Las mallas de dentro se llaman igual con `-piel` o `-tapas`
 * detrás; el vacío es el que trae los datos.
 */
export const AEROFRENO = /^aerofreno-/;

/** Un panel: su vacío, cómo estaba y cómo se mueve, ya en el marco del padre. */
interface Panel {
  readonly nodo: Object3D;
  readonly posicion: Vector3;
  readonly giro: Quaternion;
  readonly escala: Vector3;
  readonly reposo: Matrix4;
  readonly bisagra: Vector3;
  readonly eje: Vector3;
  /** Radianes de su tope en vuelo; cero en uno solo de tierra. */
  readonly vuelo: number;
  /** Y en tierra, que es todo arriba. */
  readonly tierra: number;
  /** Lo que solo se dibuja con el panel arriba. */
  readonly cierres: readonly Object3D[];
  /** El ángulo al que está ahora, para no rehacer la matriz si no cambia. */
  angulo: number;
}

export interface Aerofrenos {
  /** Cuántos paneles se mueven, contando los dos lados. */
  readonly cuantos: number;
  /** Y cuántos de ellos suben también en vuelo. */
  readonly deVuelo: number;
  /**
   * Los pone donde toca. `enVuelo` es la palanca entre recogida y su tope de
   * vuelo, de 0 a 1; `enTierra`, los frenos de tierra, de 0 a 1.
   */
  poner(enVuelo: number, enTierra: number): void;
}

function entre0y1(x: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
}

/**
 * **A qué ángulo va un panel**: el que más lo suba de los dos, el de vuelo o
 * el de tierra. En tierra con los frenos de tierra fuera suben todos del todo;
 * en vuelo, solo los de vuelo y hasta su tope.
 */
export function anguloDelPanel(
  vuelo: number,
  tierra: number,
  enVuelo: number,
  enTierra: number,
): number {
  return Math.max(entre0y1(enVuelo) * vuelo, entre0y1(enTierra) * tierra);
}

function vector(v: unknown): Vector3 | null {
  if (!Array.isArray(v) || v.length !== 3) return null;
  const [x, y, z] = v.map(Number);
  if (![x, y, z].every((n) => Number.isFinite(n))) return null;
  return new Vector3(x, y, z);
}

/**
 * Prepara los aerofrenos de un modelo para poder moverlos.
 *
 * Devuelve `null` si el modelo no trae ninguno: los de hélice y las avionetas
 * no los llevan —es verdad de su clase—, y el respaldo de cajas tampoco. Que
 * falte un recurso no deja a nadie sin volar.
 */
export function prepararAerofrenos(raiz: Object3D): Aerofrenos | null {
  raiz.updateWorldMatrix(true, true);
  const paneles: Panel[] = [];
  raiz.traverse((o) => {
    if (!AEROFRENO.test(o.name) || !o.parent) return;
    const d = o.userData;
    const bisagra = vector(d["bisagra"]);
    const eje = vector(d["eje"]);
    const vuelo = Number(d["vuelo"]);
    const tierra = Number(d["tierra"]);
    if (!bisagra || !eje || !Number.isFinite(vuelo) || !Number.isFinite(tierra))
      return;
    /*
     * De los ejes del avión —los de la raíz del glTF— al marco del padre del
     * vacío, que en estos modelos es el nodo `avion` con su cuarto de vuelta
     * para Blender. Es el mismo paso que el de los flaps, y por lo mismo: el
     * error de marco que hizo ir el tren hacia atrás no puede volver aquí.
     */
    const aPadre = o.parent.matrixWorld
      .clone()
      .invert()
      .multiply(raiz.matrixWorld);
    o.updateMatrix();
    const cierres: Object3D[] = [];
    o.traverse((h) => {
      if (h !== o && /-tapas$/.test(h.name)) cierres.push(h);
    });
    const hueco = `hueco-${o.name}`;
    raiz.traverse((h) => {
      if (h.name === hueco) cierres.push(h);
    });
    paneles.push({
      nodo: o,
      posicion: o.position.clone(),
      giro: o.quaternion.clone(),
      escala: o.scale.clone(),
      reposo: o.matrix.clone(),
      bisagra: bisagra.applyMatrix4(aPadre),
      eje: eje.transformDirection(aPadre),
      vuelo: (vuelo * Math.PI) / 180,
      tierra: (tierra * Math.PI) / 180,
      cierres,
      angulo: 0,
    });
  });
  if (!paneles.length) return null;
  // Recogidos, que es como llega el modelo: sin tapas ni hueco a la vista.
  for (const p of paneles) for (const c of p.cierres) c.visible = false;

  const giro = new Quaternion();
  const mover = new Matrix4();
  const girada = new Vector3();
  return {
    cuantos: paneles.length,
    deVuelo: paneles.filter((p) => p.vuelo > 0).length,
    poner(enVuelo: number, enTierra: number) {
      for (const p of paneles) {
        const angulo = anguloDelPanel(p.vuelo, p.tierra, enVuelo, enTierra);
        if (angulo === p.angulo) continue;
        p.angulo = angulo;
        for (const c of p.cierres) c.visible = angulo > 0;
        if (angulo <= 0) {
          // Recogido: lo que traía el modelo, copiado. Ver la cabecera.
          p.nodo.position.copy(p.posicion);
          p.nodo.quaternion.copy(p.giro);
          p.nodo.scale.copy(p.escala);
          continue;
        }
        // Gira sobre su bisagra: x' = R (x − bisagra) + bisagra.
        giro.setFromAxisAngle(p.eje, angulo);
        girada.copy(p.bisagra).applyQuaternion(giro);
        mover
          .makeRotationFromQuaternion(giro)
          .setPosition(
            p.bisagra.x - girada.x,
            p.bisagra.y - girada.y,
            p.bisagra.z - girada.z,
          );
        mover.multiply(p.reposo);
        mover.decompose(p.nodo.position, p.nodo.quaternion, p.nodo.scale);
      }
    },
  };
}

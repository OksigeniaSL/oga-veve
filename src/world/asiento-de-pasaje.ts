/**
 * **El asiento de ventanilla**: dónde se sienta quien mira por ella.
 *
 * Pedido así: «me gustaría tener una vista de pasajero desde ventanilla
 * derecha e izquierda». Es la vista desde la que de verdad se ve lo que cuenta
 * la comandante —«a la izquierda, el Teide»— y la que un niño va a tener el
 * día que se suba a un avión: la cara pegada al cristal, el ala debajo y el
 * paisaje pasando.
 *
 * Los modelos no tienen cabina de pasaje por dentro —ni falta que hace: no se
 * mira el pasillo, se mira fuera—, pero sí traen **sus ventanillas** con
 * nombre, una fila por costado (`ventanas("ventanillas", …)` en
 * `modelos/exterior.py`), y el ala. Con eso basta para sentarse donde hay que
 * sentarse, sin inventarse nada:
 *
 * - **La ventanilla de sobre el ala**, la que todo el mundo pide o evita: la
 *   que cae a un tercio de la cuerda de la raíz. Desde ahí se ve el ala
 *   entera hacia fuera y hacia atrás, el motor y los flaps cuando bajan.
 * - **Sentado, no con la cara en el cristal**: los ojos a medio metro de la
 *   ventanilla, que es donde quedan con la espalda en el respaldo. Más cerca
 *   la ventanilla llena la pantalla y no se ve el marco, que es justo lo que
 *   dice «estás dentro de un avión».
 * - **Mirando un poco hacia atrás y algo hacia abajo**, que es como se mira
 *   por una ventanilla: el ala va detrás y abajo.
 *
 * El marco que rodea la ventanilla lo pinta `marco-de-ventanilla.ts`, con las
 * medidas del cristal que se miden aquí.
 */

import { Box3, Matrix4, Vector3, type Mesh, type Object3D } from "three";

type Punto = { readonly x: number; readonly y: number; readonly z: number };

/** Una ventanilla del pasaje, en coordenadas del avión. */
export interface VentanillaDePasaje {
  /** El centro del cristal, sobre la piel. */
  readonly centro: Punto;
  /** Hacia fuera, unitario: la ventanilla se inclina con la pared. */
  readonly normal: Punto;
  /** Lo que mide el cristal a lo largo del avión y de alto, m. */
  readonly ancho: number;
  readonly alto: number;
}

/** El asiento de ventanilla de un costado. */
export interface AsientoDePasaje {
  /** Dónde están los ojos, en coordenadas del avión. */
  readonly ojo: Punto;
  /**
   * Hacia dónde se mira sentado, rad, en el marco del avión: guiñada positiva
   * a la izquierda y cabeceo positivo hacia arriba. Ver `cameras/mirada.ts`.
   */
  readonly guinada: number;
  readonly cabeceo: number;
  readonly ventanilla: VentanillaDePasaje;
}

export interface Pasaje {
  readonly izquierda: AsientoDePasaje;
  readonly derecha: AsientoDePasaje;
  /**
   * Las ventanillas del modelo, para **esconderlas** mirando desde dentro.
   *
   * Son una losa oscura pegada a la piel —ver `ventanas` en
   * `modelos/exterior.py`—, y su cara de dentro mira hacia el asiento: desde
   * el pasaje, lo primero que habría delante de los ojos sería un cristal
   * opaco tapando el mundo. El fuselaje no estorba —sus caras de atrás no se
   * pintan—, la losa sí.
   */
  readonly ventanillas: Object3D;
}

const GRADO = Math.PI / 180;

/**
 * A cuánto de la ventanilla quedan los ojos, m: sentado con la espalda en el
 * respaldo de un asiento de ventanilla. Ver la cabecera.
 */
export const OJOS_A = 0.55;

/** Cuánto se mira hacia la cola, rad: el ala va detrás. */
export const HACIA_ATRAS = 12 * GRADO;

/**
 * Y cuánto hacia abajo, rad: poco. Con diez, el Teide —que en crucero va casi
 * a la altura de los ojos— quedaba pegado al borde de arriba del cristal, y
 * detrás de la barra de botones. Con seis se ve el horizonte con lo alto
 * encima y el ala abajo, que es lo que se ve sentado sin agacharse.
 */
export const HACIA_ABAJO = 6 * GRADO;

/**
 * Dónde cae la ventanilla de sobre el ala: a qué fracción de la cuerda de la
 * raíz, desde el borde de ataque. Un tercio: el ala se ve entera hacia fuera
 * y hacia atrás, y el borde de ataque, por delante del hombro.
 */
export const SOBRE_EL_ALA = 0.35;

/**
 * Lo más que se inclina la pared, rad. Un fuselaje redondo inclina la
 * ventanilla tanto como alta va sobre su eje, y la de un avión de pasillo
 * ancho se tumbaría veinte grados; la pared de dentro no se inclina tanto.
 */
const INCLINACION_MAXIMA = 16 * GRADO;

/** Una ventanilla medida: el contorno de su grupo de vértices. */
interface Medida {
  zMin: number;
  zMax: number;
  yMin: number;
  yMax: number;
  x: number;
}

/**
 * Los vértices de una malla, en coordenadas del grupo del avión.
 *
 * Los del modelo vienen en las de Blender, colgados de un vacío girado —ver
 * `aBlender` en `modelos/comun.py`—, así que se pasan por la matriz del mundo
 * de la malla y se traen al grupo.
 */
function verticesEnElGrupo(malla: Mesh, aGrupo: Matrix4): Vector3[] {
  const pos = malla.geometry?.getAttribute("position");
  if (!pos) return [];
  const m = new Matrix4().multiplyMatrices(aGrupo, malla.matrixWorld);
  const salida: Vector3[] = [];
  for (let i = 0; i < pos.count; i++)
    salida.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(m));
  return salida;
}

/** Todas las mallas de un objeto y sus hijos, con sus vértices. */
function verticesDe(o: Object3D, aGrupo: Matrix4): Vector3[] {
  const todos: Vector3[] = [];
  o.traverse((h) => {
    if ((h as Mesh).isMesh) todos.push(...verticesEnElGrupo(h as Mesh, aGrupo));
  });
  return todos;
}

/**
 * Las ventanillas de un costado, una a una.
 *
 * Están todas en una malla, así que se separan por huecos: ordenadas de morro
 * a cola, donde entre un vértice y el siguiente hay más de un palmo empieza
 * otra. Entre dos ventanillas siempre hay chapa —un avión no lleva cristales
 * pegados—, y dentro de una no hay huecos de ese tamaño.
 */
function separar(vertices: readonly Vector3[]): Medida[] {
  const orden = [...vertices].sort((a, b) => a.z - b.z);
  const salida: Medida[] = [];
  let actual: Medida | null = null;
  let antes = -Infinity;
  for (const v of orden) {
    if (!actual || v.z - antes > 0.08) {
      actual = { zMin: v.z, zMax: v.z, yMin: v.y, yMax: v.y, x: Math.abs(v.x) };
      salida.push(actual);
    }
    actual.zMax = v.z;
    actual.yMin = Math.min(actual.yMin, v.y);
    actual.yMax = Math.max(actual.yMax, v.y);
    actual.x = Math.max(actual.x, Math.abs(v.x));
    antes = v.z;
  }
  // Las de verdad: un vértice suelto o una astilla no son una ventanilla.
  return salida.filter((m) => m.zMax - m.zMin > 0.1 && m.yMax - m.yMin > 0.1);
}

/**
 * **Dónde quedan los ojos y hacia dónde miran**, para una ventanilla.
 *
 * Se mira con la dirección de sentado —un poco hacia la cola y un poco hacia
 * abajo— **a través del centro del cristal**, y los ojos se ponen a
 * `OJOS_A` de la pared en esa dirección. Así la ventanilla queda en el centro
 * de la mirada en cualquier avión, sea cual sea lo alta que vaya.
 */
export function asientoAnteVentanilla(
  v: VentanillaDePasaje,
  lado: "izquierda" | "derecha",
): AsientoDePasaje {
  const s = lado === "izquierda" ? -1 : 1;
  const dir = new Vector3(
    s * Math.cos(HACIA_ABAJO) * Math.cos(HACIA_ATRAS),
    -Math.sin(HACIA_ABAJO),
    Math.cos(HACIA_ABAJO) * Math.sin(HACIA_ATRAS),
  );
  const n = new Vector3(v.normal.x, v.normal.y, v.normal.z);
  const largo = OJOS_A / Math.max(0.3, dir.dot(n));
  const ojo = new Vector3(v.centro.x, v.centro.y, v.centro.z).addScaledVector(dir, -largo);
  return {
    ojo: { x: ojo.x, y: ojo.y, z: ojo.z },
    guinada: Math.atan2(-dir.x, -dir.z),
    cabeceo: Math.asin(dir.y),
    ventanilla: v,
  };
}

/**
 * **Mide el pasaje de un modelo ya colocado**, o `null` si no lo lleva.
 *
 * `null` también para las avionetas, que no llevan fila de ventanillas sino
 * dos o tres cristales grandes —y quien va detrás va en la cabina, no en un
 * pasaje—. Ver `conPasaje` en `audio/megafonia.ts`, que es quien decide si un
 * avión lleva gente detrás; esto solo dice dónde se sienta.
 */
export function medirElPasaje(raiz: Object3D, grupo: Object3D): Pasaje | null {
  const ventanillas = raiz.getObjectByName("ventanillas");
  if (!ventanillas) return null;
  grupo.updateWorldMatrix(true, true);
  const aGrupo = new Matrix4().copy(grupo.matrixWorld).invert();
  const vertices = verticesDe(ventanillas, aGrupo);
  if (vertices.length < 8) return null;

  /*
   * **El eje del fuselaje**, para saber cuánto se inclina la pared. Del
   * fuselaje si viene con nombre; si no, del propio grupo de ventanillas.
   */
  const fuselaje = raiz.getObjectByName("fuselaje");
  const eje = fuselaje
    ? new Box3().setFromPoints(verticesDe(fuselaje, aGrupo)).getCenter(new Vector3()).y
    : null;

  /*
   * **La raíz del ala**: lo que hay del ala junto al fuselaje, de borde de
   * ataque a borde de salida. Sin ala con nombre, la ventanilla del medio.
   */
  let medioAncho = 0;
  for (const v of vertices) medioAncho = Math.max(medioAncho, Math.abs(v.x));
  const ala = raiz.getObjectByName("ala");
  const raizDelAla = ala
    ? verticesDe(ala, aGrupo).filter((v) => Math.abs(v.x) < medioAncho + 0.6)
    : [];

  const lado = (cual: "izquierda" | "derecha"): AsientoDePasaje | null => {
    const s = cual === "izquierda" ? -1 : 1;
    const fila = separar(vertices.filter((v) => s * v.x > 0));
    if (!fila.length) return null;
    const centroZ = (m: Medida): number => (m.zMin + m.zMax) / 2;
    let buscada: number;
    if (raizDelAla.length) {
      let ataque = Infinity;
      let salida = -Infinity;
      for (const v of raizDelAla) {
        ataque = Math.min(ataque, v.z);
        salida = Math.max(salida, v.z);
      }
      buscada = ataque + SOBRE_EL_ALA * (salida - ataque);
    } else {
      buscada = (centroZ(fila[0]!) + centroZ(fila[fila.length - 1]!)) / 2;
    }
    const m = fila.reduce((a, b) =>
      Math.abs(centroZ(b) - buscada) < Math.abs(centroZ(a) - buscada) ? b : a,
    );
    const yc = (m.yMin + m.yMax) / 2;
    const inclinacion =
      eje === null
        ? 0
        : Math.max(
            -INCLINACION_MAXIMA,
            Math.min(INCLINACION_MAXIMA, Math.atan2(yc - eje, m.x)),
          );
    return asientoAnteVentanilla(
      {
        centro: { x: s * m.x, y: yc, z: centroZ(m) },
        normal: { x: s * Math.cos(inclinacion), y: Math.sin(inclinacion), z: 0 },
        ancho: m.zMax - m.zMin,
        alto: m.yMax - m.yMin,
      },
      cual,
    );
  };

  const izquierda = lado("izquierda");
  const derecha = lado("derecha");
  if (!izquierda || !derecha) return null;
  return { izquierda, derecha, ventanillas };
}

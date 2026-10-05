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
 *   **Y que deje ver**: si el ala se come el cristal —un ala alta, con la
 *   ventanilla debajo de la raíz—, la de al lado. Ver `cuantoTapa`.
 * - **Sentado, no con la cara en el cristal**: los ojos a medio metro de la
 *   ventanilla, que es donde quedan con la espalda en el respaldo. Más cerca
 *   la ventanilla llena la pantalla y no se ve el marco, que es justo lo que
 *   dice «estás dentro de un avión».
 * - **Mirando un poco hacia atrás y algo hacia abajo**, que es como se mira
 *   por una ventanilla: el ala va detrás y abajo.
 *
 * El marco que rodea la ventanilla lo pinta `marco-de-ventanilla.ts`, con las
 * medidas del cristal que se miden aquí.
 *
 * ## Y el asiento de encima del ala, en los que llevan frenos de tierra
 *
 * Desde esa primera ventanilla, sentado y mirando como se mira, se ve el borde
 * de ataque y el motor, y lo que se mueve en el ala queda detrás del hombro.
 * Enrique, que ha volado de pasajero, recuerda los paneles que se levantan al
 * tocar —«parecen de papel»—, y pidió el asiento desde el que se ven: **justo
 * encima del ala o un poco detrás**, con el extradós, los paneles subiendo al
 * tocar y los flaps bajando en la aproximación. En el JAZ 120 es otro asiento,
 * seis metros más atrás; en el JAZ 90, **el de la fila de la salida**, mirando
 * por la ventanilla de la trampilla. Ver `asientoSobreElAla`.
 */

import {
  Box3,
  Euler,
  Matrix4,
  Quaternion,
  Raycaster,
  Vector3,
  type Mesh,
  type Object3D,
} from "three";
import { FOV_DE_PASAJE } from "../cameras/pasaje";
import {
  elCantoDeLaTrampilla,
  elCristalEntero,
  elMarcoEntero,
  loQueAsomaDeLaSalida,
  seVePorLaVentanilla,
} from "./marco-de-ventanilla";

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
  /**
   * La salida de emergencia sobre el ala, si este asiento es el de la fila de
   * al lado. Ver `SalidaDeAlLado`.
   */
  readonly salida?: SalidaDeAlLado | null;
  /**
   * **Dónde quedan los ojos sentado del todo**, con la espalda en el respaldo,
   * si para mirar uno se ha despegado de él y asomado al cristal; si no, son
   * `ojo`. Es lo que dice dónde está el asiento —el de uno y el de delante—,
   * que no se mueven cuando uno se asoma. Ver `asientoSobreElAla`.
   */
  readonly sentado?: Punto | null;
  /**
   * **El ángulo de la vista desde aquí**, grados, si no es el de siempre: el
   * de la fila de la salida del JAZ 90. Ver `ANGULOS_EN_LA_SALIDA`.
   */
  readonly fov?: number;
}

/**
 * **La salida de emergencia de la fila de al lado**, medida en el modelo: dónde
 * cae respecto del cristal de uno y lo que mide la trampilla.
 *
 * En los de pasillo único —la clase del JAZ 90— la salida sobre el ala es una
 * trampilla con su ventanilla, y desde la fila de al lado se ve asomar su marco
 * y el letrero de «EXIT» encima. Lo pinta `marco-de-ventanilla.ts`.
 */
export interface SalidaDeAlLado {
  /**
   * Del centro del cristal de uno al de la trampilla, m, a lo largo del
   * avión: positivo hacia la cola, como la z del avión.
   */
  readonly haciaLaCola: number;
  /** Y de arriba abajo, m, por la pared: positivo hacia arriba. */
  readonly arriba: number;
  /** Lo que mide la trampilla, m: a lo largo y de alto. */
  readonly ancho: number;
  readonly alto: number;
  /**
   * **Si la ventanilla de uno es la de la trampilla**: el asiento es el de la
   * fila de la salida, y la trampilla va alrededor del cristal de uno, no al
   * lado. Ver `asientoSobreElAla`.
   */
  readonly enLaTrampilla?: boolean;
}

/** Los dos asientos de una fila, uno a cada lado. */
export interface ParDeAsientos {
  readonly izquierda: AsientoDePasaje;
  readonly derecha: AsientoDePasaje;
}

export interface Pasaje extends ParDeAsientos {
  /**
   * **Los asientos de encima del ala**, en el avión que lleva frenos de tierra
   * en el modelo; `null` en los demás. Ver `asientoSobreElAla`.
   */
  readonly sobreElAla: ParDeAsientos | null;
  /**
   * Las ventanillas del modelo, para **esconderlas** mirando desde dentro.
   *
   * Son una losa oscura pegada a la piel —ver `ventanas` en
   * `modelos/exterior.py`—, y su cara de dentro mira hacia el asiento: desde
   * el pasaje, lo primero que habría delante de los ojos sería un cristal
   * opaco tapando el mundo. El fuselaje no estorba —sus caras de atrás no se
   * pintan—, la losa sí.
   *
   * Y con ellas **la de la trampilla de la salida**, que es otra malla y es por
   * la que se mira desde la fila de la salida: se esconden y se enseñan juntas.
   */
  readonly ventanillas: { visible: boolean };
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

/** Cuántas ventanillas se prueban, de la más cercana a la buscada hacia fuera. */
const CANDIDATAS = 6;

/**
 * Cuánto del cristal puede tapar el avión, de 0 a 1: un tercio. Con el ala a
 * la vista y dos tercios de paisaje, que es la foto de la ventanilla de sobre
 * el ala de cualquier vuelo.
 */
export const TAPA_COMO_MUCHO = 1 / 3;

/** Y lo menos: que el ala se vea, que es media razón de sentarse ahí. */
export const TAPA_COMO_POCO = 0.08;

/**
 * Las piezas que tapan el cristal: el ala, sus flaps y sus alerones —que son
 * la punta del borde de salida, sacada a su pieza para que se mueva—,
 * góndolas y motores.
 */
const LO_QUE_TAPA = /^(ala|flap|aleron|gondola|motor|toma|carenado|escapes)/;

/**
 * **Cuánto del cristal tapa el avión**, de 0 a 1, desde los ojos de un
 * asiento: una rejilla de rayos por el cristal contra las piezas del ala.
 */
export function cuantoTapa(
  asiento: AsientoDePasaje,
  piezas: readonly Object3D[],
  grupo: Object3D,
): number {
  const v = asiento.ventanilla;
  const n = new Vector3(v.normal.x, v.normal.y, v.normal.z);
  const arriba = new Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
  const largo = new Vector3().crossVectors(arriba, n);
  const ojo = new Vector3(asiento.ojo.x, asiento.ojo.y, asiento.ojo.z).applyMatrix4(
    grupo.matrixWorld,
  );
  const rayo = new Raycaster();
  rayo.far = 400;
  let tapados = 0;
  let total = 0;
  for (let i = -2; i <= 2; i++)
    for (let j = -2; j <= 2; j++) {
      const p = new Vector3(v.centro.x, v.centro.y, v.centro.z)
        .addScaledVector(largo, (i / 2) * v.ancho * 0.4)
        .addScaledVector(arriba, (j / 2) * v.alto * 0.4)
        .applyMatrix4(grupo.matrixWorld);
      rayo.set(ojo, p.sub(ojo).normalize());
      total++;
      if (rayo.intersectObjects(piezas as Object3D[], false).length) tapados++;
    }
  return tapados / total;
}

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
 *
 * `atras` y `abajo` son hacia dónde se mira, rad, y `ojosA`, a cuánto del
 * cristal: los de sentado si no se dicen. El asiento de encima del ala mira
 * hacia sus paneles, asomado, y a veces `encima` del centro del cristal, m,
 * por la pared.
 */
export function asientoAnteVentanilla(
  v: VentanillaDePasaje,
  lado: "izquierda" | "derecha",
  atras = HACIA_ATRAS,
  abajo = HACIA_ABAJO,
  ojosA = OJOS_A,
  encima = 0,
): AsientoDePasaje {
  const s = lado === "izquierda" ? -1 : 1;
  const dir = new Vector3(
    s * Math.cos(abajo) * Math.cos(atras),
    -Math.sin(abajo),
    Math.cos(abajo) * Math.sin(atras),
  );
  const n = new Vector3(v.normal.x, v.normal.y, v.normal.z);
  const largo = ojosA / Math.max(0.3, dir.dot(n));
  const arriba = new Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
  const ojo = new Vector3(v.centro.x, v.centro.y, v.centro.z)
    .addScaledVector(arriba, encima)
    .addScaledVector(dir, -largo);
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
  // Lo que puede tapar el cristal: el ala y lo que cuelga de ella. Las palas
  // no, que una hélice en marcha es un disco que se ve a través.
  const piezasDelAla: Object3D[] = [];
  raiz.traverse((o) => {
    if ((o as Mesh).isMesh && LO_QUE_TAPA.test(o.name)) piezasDelAla.push(o);
  });

  const filas = {
    izquierda: separar(vertices.filter((v) => v.x < 0)),
    derecha: separar(vertices.filter((v) => v.x > 0)),
  };
  if (!filas.izquierda.length || !filas.derecha.length) return null;

  const centroZ = (m: Medida): number => (m.zMin + m.zMax) / 2;
  // La salida sobre el ala de cada lado, si la lleva: ver `conSuSalida`.
  const salidas = salidasSobreElAla(raiz, aGrupo);
  /** La ventanilla de una medida, con su pared inclinada. */
  const ventanillaDe = (m: Medida, cual: "izquierda" | "derecha"): VentanillaDePasaje => {
    const s = cual === "izquierda" ? -1 : 1;
    const yc = (m.yMin + m.yMax) / 2;
    const inclinacion =
      eje === null
        ? 0
        : Math.max(-INCLINACION_MAXIMA, Math.min(INCLINACION_MAXIMA, Math.atan2(yc - eje, m.x)));
    return {
      centro: { x: s * m.x, y: yc, z: centroZ(m) },
      normal: { x: s * Math.cos(inclinacion), y: Math.sin(inclinacion), z: 0 },
      ancho: m.zMax - m.zMin,
      alto: m.yMax - m.yMin,
    };
  };

  const lado = (cual: "izquierda" | "derecha"): AsientoDePasaje =>
    conSuSalida(elDeSiempre(cual), filas[cual], salidas[cual]);

  const elDeSiempre = (cual: "izquierda" | "derecha"): AsientoDePasaje => {
    const fila = filas[cual];
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
    /*
     * **Y la que deje ver.** La de la cuerda buscada es la buena en un avión
     * de ala baja; en el de ala alta, debajo de la raíz, el ala y la góndola
     * se comían tres cuartos del cristal —medido en la primera captura del
     * JAZ 60—, y se viene a mirar el paisaje. Así que de las más cercanas a
     * la buscada se mira **cuánto tapa el avión**, con rayos por el cristal,
     * y se queda la primera en la que el ala se ve sin quitar la vista.
     */
    const cercanas = [...fila]
      .sort((a, b) => Math.abs(centroZ(a) - buscada) - Math.abs(centroZ(b) - buscada))
      .slice(0, CANDIDATAS);
    const asientos = cercanas.map((m) => asientoAnteVentanilla(ventanillaDe(m, cual), cual));
    if (!piezasDelAla.length) return asientos[0]!;
    // Ni tanta que tape, ni ninguna: el ala se tiene que ver. Si ninguna cae
    // en medio, la que más cerca se quede.
    let mejor = asientos[0]!;
    let mejorFuera = Infinity;
    for (const a of asientos) {
      const tapa = cuantoTapa(a, piezasDelAla, grupo);
      const fuera = Math.max(0, TAPA_COMO_POCO - tapa, tapa - TAPA_COMO_MUCHO);
      if (fuera === 0) return a;
      if (fuera < mejorFuera) {
        mejor = a;
        mejorFuera = fuera;
      }
    }
    return mejor;
  };

  /*
   * **Lo que se mueve en el ala y la salida de al lado**, medidos ahora, con
   * el modelo recién colocado y los paneles recogidos: lo que se mida después
   * puede pillarlos levantados. Son unas pocas mallas pequeñas; los rayos, que
   * son lo caro, van luego. Ver `asientoSobreElAla`.
   */
  const paneles = loQueSeMueveEnElAla(raiz, aGrupo, PIEL_DE_AEROFRENO);
  const flaps = loQueSeMueveEnElAla(raiz, aGrupo, PIEL_DE_FLAP);
  const conPaneles = paneles.izquierda.length > 0 && paneles.derecha.length > 0;
  // La ventanilla de la trampilla de cada lado, si la lleva: es otra malla.
  const ventanita = raiz.getObjectByName(VENTANITA_DE_LA_SALIDA);
  const trampillas = {
    izquierda: laDeLaTrampilla(ventanita, salidas.izquierda, aGrupo, -1),
    derecha: laDeLaTrampilla(ventanita, salidas.derecha, aGrupo, 1),
  };

  const sobreElAla = (cual: "izquierda" | "derecha"): AsientoDePasaje =>
    asientoSobreElAla(
      filas[cual],
      [...paneles[cual], ...flaps[cual]],
      salidas[cual],
      trampillas[cual],
      cual,
      ventanillaDe,
      (desde, hasta) => tapadoPorElAla(desde, hasta, piezasDelAla, grupo),
    );

  /*
   * **Y se elige la primera vez que se mira, no al cargar.** Los rayos cuestan
   * unas decenas de milisegundos —cincuenta en el JAZ 60, que prueba varias
   * ventanillas—, y en una tablet eso es un tirón en mitad de la carga del
   * avión para una vista que a lo mejor no se pide nunca. Medido aquí, con el
   * modelo ya en su sitio: los rayos van en coordenadas del mundo.
   */
  let izquierda: AsientoDePasaje | undefined;
  let derecha: AsientoDePasaje | undefined;
  let alaIzquierda: AsientoDePasaje | undefined;
  let alaDerecha: AsientoDePasaje | undefined;
  return {
    get izquierda() {
      return (izquierda ??= lado("izquierda"));
    },
    get derecha() {
      return (derecha ??= lado("derecha"));
    },
    sobreElAla: conPaneles
      ? {
          get izquierda() {
            return (alaIzquierda ??= sobreElAla("izquierda"));
          },
          get derecha() {
            return (alaDerecha ??= sobreElAla("derecha"));
          },
        }
      : null,
    ventanillas: lasLosas([ventanillas, ventanita]),
  };
}

/** Las losas de cristal del modelo, como una sola: se esconden y se enseñan juntas. */
function lasLosas(losas: readonly (Object3D | undefined)[]): { visible: boolean } {
  const todas = losas.filter((o): o is Object3D => !!o);
  return {
    get visible() {
      return todas.every((o) => o.visible);
    },
    set visible(si: boolean) {
      for (const o of todas) o.visible = si;
    },
  };
}

/**
 * Cómo se llaman las chapas de los frenos de tierra en el modelo: el vacío
 * `aerofreno-N-lado` con su piel dentro. Ver `world/aerofrenos.ts`.
 */
const PIEL_DE_AEROFRENO = /^aerofreno-\d+-(izquierda|derecha)-piel$/;

/** Y las de los flaps, que también se quieren ver bajar: ver `world/flaps.ts`. */
const PIEL_DE_FLAP = /^flap-[^-]+-(izquierda|derecha)-piel$/;

/** Y la salida sobre el ala, una raya en la chapa: `contorno` en `modelos/exterior.py`. */
const SALIDA_SOBRE_EL_ALA = "salida-de-emergencia";

/**
 * Y la ventanilla de su trampilla, que es otra malla —ver `ventanita-salida` en
 * `modelos/jaz-90-arai.py`—: la fila de ventanillas deja ahí un hueco.
 */
const VENTANITA_DE_LA_SALIDA = "ventanita-salida";

/**
 * Cuánto por encima de su chapa se mira una pieza, m: un panel levantado sube
 * más que eso, y así el rayo no roza el ala de al lado ni la propia pieza.
 */
const SOBRE_LA_CHAPA = 0.12;

/**
 * Hasta cuántos metros por delante del primer panel se busca asiento: desde
 * un poco por delante se ven bien, y más adelante ya es el asiento de siempre.
 */
const DELANTE_DE_LOS_PANELES = 4;

/**
 * **Hacia dónde se prueba a mirar** desde el asiento de encima del ala, grados:
 * hacia la cola, de cinco hacia delante a cuarenta y cinco hacia atrás —el
 * cuello, sentado; más hacia delante se mira el respaldo de la fila de
 * delante, que se comía media pantalla en el JAZ 120—; y hacia abajo, de dos a
 * dieciséis. Más abajo el horizonte se sale por arriba del cristal, y un ala
 * sin horizonte no dice dónde está.
 */
const MIRAR_ATRAS = { desde: -5, hasta: 45, paso: 2.5 };
const MIRAR_ABAJO = { desde: 2, hasta: 16, paso: 2 };

/**
 * **Asomado al cristal**: a cuánto de él se prueban los ojos desde el asiento
 * de encima del ala, m, de más cerca a sentado del todo.
 *
 * Enrique, con la primera versión de esta vista, sentado a `OJOS_A` y mirando
 * casi cuarenta grados hacia la cola: «tiene pinta de avión de carga: detrás no
 * hay asiento ni nada, está vacío». Casi toda la pantalla era pared en
 * perspectiva y el cristal, una rendija. Y es que quien quiere ver el ala no se
 * queda con la espalda en el respaldo: **se despega de él y se acerca a la
 * ventanilla**. Así que se prueba de cerca a lejos y gana el más cerca que
 * todavía deja ver lo que se viene a ver —los paneles, la salida y el marco
 * entero alrededor del cristal—: el cristal crece y la pared deja de mandar.
 * Más cerca de un tercio de metro ya es la frente en el cristal, y desde ahí no
 * se ve el marco.
 */
const ASOMADO = [0.34, 0.38, 0.42, 0.46, 0.5, OJOS_A];

/**
 * Cuánto por encima del centro del cristal se prueba a apuntar, en altos de
 * cristal: asomado, el letrero de la salida queda alto, y mirando un poco más
 * arriba entra en la pantalla sin perder el ala, que va por la parte de abajo.
 */
const APUNTAR_ENCIMA = [0, 0.15, 0.3];

/**
 * **Lo que se ve sentado**, para que asome la salida: el ángulo de la vista
 * de pasaje en la pantalla más estrecha que se juega, una tablet de 4:3, y un
 * margen —más arriba, donde va la barra de botones—. Grados. El ángulo, el del
 * asiento si trae el suyo.
 */
const MARGEN = { lados: 3, arriba: 6, abajo: 3 };

/** Medio ángulo de alto y de ancho de la vista desde un asiento, grados, en 4:3. */
function medioAngulo(asiento: AsientoDePasaje): { alto: number; ancho: number } {
  const alto = (asiento.fov ?? FOV_DE_PASAJE) / 2;
  const ancho = (Math.atan((4 / 3) * Math.tan((alto * Math.PI) / 180)) * 180) / Math.PI;
  return { alto, ancho };
}

/**
 * **Lo que tapa el HUD** en una tablet de 4:3, que es donde más pantalla se
 * come: rectángulos en coordenadas de pantalla, de −1 a 1 y con y hacia
 * arriba, medidos en la captura de 1024 × 768 con un margen. La fila de
 * botones de arriba; la segunda, con el subtítulo, y la tercera, a la que
 * bajan los botones cuando el subtítulo ocupa la segunda; la columna de la
 * izquierda; la tarjeta, el gas y los bloques de la derecha, y la columna de
 * más a la derecha; el volumen y la palanca de abajo a la izquierda, y la
 * barra de instrumentos de abajo con los pedales.
 *
 * Con la vista de la fila de la salida del JAZ 90 a sesenta y cuatro grados,
 * el asa y el letrero cabían, pero la mitad de abajo del cristal —el ala, a lo
 * que se viene— quedaba debajo de la barra de abajo. Lo que se pidió ver tiene
 * que caer donde no hay HUD, no solo dentro de la pantalla.
 *
 * **Y medido otra vez** (punto 254), con el HUD de ahora en una tablet con
 * dedo: el borde de abajo del cristal pisaba la barra, que con los pedales
 * debajo empieza bastante más arriba de lo que decía —a un 81 % del alto y no
 * a un 90 %—, y el letrero del lado derecho quedaba debajo de los botones de
 * arriba. Ésos son dos filas, y una tercera mientras hay subtítulo, que se
 * lleva la segunda: esa va aparte, en `HUD_DE_PASO`.
 */
const HUD: readonly { x0: number; x1: number; y0: number; y1: number }[] = [
  { x0: -1, x1: 1, y0: 0.82, y1: 1 },
  { x0: -0.52, x1: 0.4, y0: 0.66, y1: 1 },
  { x0: -1, x1: -0.6, y0: 0.5, y1: 1 },
  { x0: 0.33, x1: 1, y0: -0.15, y1: 1 },
  { x0: 0.48, x1: 1, y0: -1, y1: -0.15 },
  { x0: -1, x1: -0.58, y0: -1, y1: -0.33 },
  { x0: -1, x1: 1, y0: -1, y1: -0.6 },
];

/**
 * **Y la tercera fila de botones**, la que solo está mientras habla alguien:
 * el subtítulo ocupa la segunda y los botones que no caben bajan. Lo de debajo
 * se ve casi siempre, así que no manda como el resto del HUD: entre dos
 * miradas que enseñan lo mismo, gana la que tampoco queda debajo de ella.
 */
const HUD_DE_PASO: readonly { x0: number; x1: number; y0: number; y1: number }[] = [
  { x0: -0.44, x1: 0.32, y0: 0.51, y1: 1 },
];

/** Dónde cae un punto en la pantalla de 4:3, de −1 a 1, o `null` si detrás. */
function enLaPantalla(asiento: AsientoDePasaje, p: Vector3): { x: number; y: number } | null {
  const giro = new Quaternion().setFromEuler(
    new Euler(asiento.cabeceo, asiento.guinada, 0, "YXZ"),
  );
  const d = new Vector3(p.x - asiento.ojo.x, p.y - asiento.ojo.y, p.z - asiento.ojo.z)
    .applyQuaternion(giro.invert());
  if (d.z >= 0) return null;
  const t = Math.tan((((asiento.fov ?? FOV_DE_PASAJE) / 2) * Math.PI) / 180);
  return { x: d.x / -d.z / ((4 / 3) * t), y: d.y / -d.z / t };
}

/**
 * Si un punto se ve desde un asiento **sin nada del HUD encima**, en una
 * tablet de 4:3. Ver `HUD`.
 *
 * **Y con el HUD en espejo**: los dos asientos de una fila van uno enfrente
 * del otro y miran igual, y el HUD no es simétrico —los botones grandes van a
 * la derecha—. Lo que vale desde un lado tiene que valer desde el otro.
 */
export function libreDelHud(
  asiento: AsientoDePasaje,
  p: Vector3,
  tambienLoDePaso = false,
): boolean {
  const e = enLaPantalla(asiento, p);
  if (!e || Math.abs(e.x) > 0.97 || Math.abs(e.y) > 0.97) return false;
  const rectangulos = tambienLoDePaso ? [...HUD, ...HUD_DE_PASO] : HUD;
  const tapa = (x: number): boolean =>
    rectangulos.some((r) => x > r.x0 && x < r.x1 && e.y > r.y0 && e.y < r.y1);
  return !tapa(e.x) && !tapa(-e.x);
}

/**
 * **Desde la fila de la salida**, en el de pasillo único: hacia dónde se
 * prueba a mirar, grados, cuánto por encima del centro del cristal, m, y con
 * qué ángulo de vista, grados.
 *
 * Lo que pidió Enrique: quien se sienta en la fila de la salida tiene de
 * frente el ala, el asa roja de la trampilla justo encima de la ventanilla y
 * el letrero «EXIT» encima, todo sin girar la cabeza hacia la cola, o
 * girándola poco. El letrero va medio metro por encima del centro del
 * cristal, y con los sesenta y cuatro grados de la vista de pasaje no cabían
 * los dos: mirando hacia arriba para que entrara el letrero, la mitad de abajo
 * del cristal —el ala— quedaba debajo de la barra de instrumentos, y mirando
 * treinta grados hacia la cola. Así que **en esta fila se abre la vista**,
 * como abre uno los ojos para abarcar la trampilla entera: de setenta y cuatro
 * a ochenta grados, el cristal entero por encima de la barra y el asa y el
 * letrero encima, sin HUD. Solo aquí: las demás vistas de pasaje siguen a
 * sesenta y cuatro. Ver `FOV_DE_PASAJE`.
 *
 * Girar menos hacia la cola no cabe, medido con rayos: los tres paneles por el
 * cristal piden, con menos de treinta grados, mirar hacia abajo, y entonces el
 * letrero se va debajo de la fila de botones de arriba. Salía setenta y siete
 * grados y treinta hacia la cola, mirando ocho hacia arriba.
 *
 * **Y con el HUD medido de nuevo** (punto 254) no cabía: en una tablet con
 * dedo, entre las dos filas de botones de arriba y la barra con los pedales
 * de abajo queda el 58 % del alto, y el letrero, el asa, el cristal y el
 * horizonte piden sesenta y tres grados de alto. Sale noventa y dos y treinta
 * y dos y medio hacia la cola, a la misma altura de ojos. Abierto así se
 * nota en las esquinas, pero es la única vista que lo hace y lo que se
 * pidió ver queda donde no hay HUD; más cerrado, o el cristal pisaba la barra
 * o el letrero quedaba debajo de los botones.
 */
const MIRAR_ABAJO_EN_LA_SALIDA = { desde: -14, hasta: 16, paso: 2 };
const APUNTAR_ENCIMA_EN_LA_SALIDA = [0, 0.06, 0.12, 0.18, 0.24, 0.3];
export const ANGULOS_EN_LA_SALIDA = [74, 77, 80, 84, 88, 92];

/**
 * **Cuántos paneles bastan**: con tres levantados a la vista ya se ve lo que
 * hacen —la fila entera subiendo a la vez—, y a partir de ahí manda que asome
 * la salida. Por debajo, el ala manda sobre la salida: se pidió verla, pero no
 * a cambio de no ver los paneles, que son a lo que se viene.
 */
const PANELES_QUE_BASTAN = 3;

/** Si un punto cae dentro de lo que se ve desde un asiento, con su margen. */
export function seVeSentado(asiento: AsientoDePasaje, p: Vector3): boolean {
  const giro = new Quaternion().setFromEuler(
    new Euler(asiento.cabeceo, asiento.guinada, 0, "YXZ"),
  );
  const d = new Vector3(p.x - asiento.ojo.x, p.y - asiento.ojo.y, p.z - asiento.ojo.z)
    .applyQuaternion(giro.invert());
  if (d.z >= 0) return false;
  const lado = (Math.atan2(d.x, -d.z) * 180) / Math.PI;
  const alto = (Math.atan2(d.y, -d.z) * 180) / Math.PI;
  const medio = medioAngulo(asiento);
  return (
    Math.abs(lado) < medio.ancho - MARGEN.lados &&
    alto < medio.alto - MARGEN.arriba &&
    alto > -medio.alto + MARGEN.abajo
  );
}

/**
 * **La salida de al lado de un asiento**, si su ventanilla es la de justo
 * delante o justo detrás de la salida sobre el ala: ninguna otra ventanilla
 * de la fila entre medias, y a menos de metro y medio. Para cualquier asiento,
 * el de siempre también: si se sienta ahí, ahí está la salida.
 */
function conSuSalida(
  asiento: AsientoDePasaje,
  fila: readonly Medida[],
  salida: Box3 | null,
): AsientoDePasaje {
  if (!salida) return asiento;
  const v = asiento.ventanilla;
  const zSalida = (salida.min.z + salida.max.z) / 2;
  const desde = Math.min(v.centro.z, zSalida);
  const hasta = Math.max(v.centro.z, zSalida);
  const entreMedias = fila.some((m) => {
    const z = (m.zMin + m.zMax) / 2;
    return z > desde + 0.05 && z < hasta - 0.05;
  });
  if (entreMedias || hasta - desde > 1.5) return asiento;
  /*
   * La trampilla, en los ejes de la pared de uno: a lo largo, la z; y de alto,
   * por la pared inclinada, que es por donde sube el marco.
   */
  const n = new Vector3(v.normal.x, v.normal.y, v.normal.z);
  const arriba = new Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
  const centro = salida.getCenter(new Vector3());
  centro.x = Math.sign(v.centro.x) * Math.max(Math.abs(salida.min.x), Math.abs(salida.max.x));
  const d = centro.sub(new Vector3(v.centro.x, v.centro.y, v.centro.z));
  const ancho = salida.max.z - salida.min.z;
  return {
    ...asiento,
    salida: {
      haciaLaCola: d.z,
      arriba: d.dot(arriba),
      ancho,
      alto: salida.max.y - salida.min.y,
      // El cristal de uno, dentro de la trampilla: es su ventanilla.
      enLaTrampilla: Math.abs(d.z) < ancho / 2,
    },
  };
}

/**
 * **La ventanilla de la trampilla de un lado**, medida como las de la fila, o
 * `null` si el modelo no la trae: la de la malla de las ventanitas que cae
 * dentro de la trampilla de ese lado.
 */
function laDeLaTrampilla(
  ventanita: Object3D | undefined,
  salida: Box3 | null,
  aGrupo: Matrix4,
  s: number,
): Medida | null {
  if (!ventanita || !salida) return null;
  const suyas = separar(verticesDe(ventanita, aGrupo).filter((v) => Math.sign(v.x) === s));
  return (
    suyas.find((m) => {
      const z = (m.zMin + m.zMax) / 2;
      return z > salida.min.z && z < salida.max.z;
    }) ?? null
  );
}

/** El avión quieto en su sitio: para preguntar por el cristal en sus ejes. */
const QUIETO = { position: new Vector3(), orientation: new Quaternion() };

/**
 * **Lo que se quiere ver de cada pieza que se mueve en el ala**, por lado.
 *
 * - De un panel, **levantado**: su centro y su borde de atrás girados sobre su
 *   bisagra hasta su tope de tierra, con los datos que trae su vacío —ver
 *   `world/aerofrenos.ts`—. Es como se mira al tocar, y un panel levantado no
 *   está donde estaba recogido: medido recogido, el asiento elegido veía tres
 *   y levantados se veían dos.
 * - De un flap, lo mismo **salido del todo**: por su carril y girado hasta
 *   su última muesca, como lo pone `world/flaps.ts`. Es como se mira en la
 *   aproximación.
 */
interface PiezaDelAla {
  readonly puntos: readonly Vector3[];
  /** Si es un panel de los frenos de tierra; si no, un flap. */
  readonly panel: boolean;
}

function loQueSeMueveEnElAla(
  raiz: Object3D,
  aGrupo: Matrix4,
  patron: RegExp,
): Record<"izquierda" | "derecha", PiezaDelAla[]> {
  const salida = { izquierda: [] as PiezaDelAla[], derecha: [] as PiezaDelAla[] };
  const panel = patron === PIEL_DE_AEROFRENO;
  // De la raíz del modelo al grupo del avión: los datos del vacío vienen ahí.
  const aDeLaRaiz = new Matrix4().multiplyMatrices(aGrupo, raiz.matrixWorld);
  raiz.traverse((o) => {
    const m = patron.exec(o.name);
    if (!m) return;
    let vertices = verticesDe(o, aGrupo);
    const mover = abajoDelTodo(o.parent, aDeLaRaiz, panel);
    if (mover) vertices = vertices.map(mover);
    const caja = new Box3().setFromPoints(vertices);
    if (caja.isEmpty()) return;
    // Su centro, por encima de su chapa; y su borde de atrás: el más alto si es
    // un panel, que es adonde sube, y el de más atrás si es un flap.
    const centro = caja.getCenter(new Vector3());
    centro.y = caja.max.y + SOBRE_LA_CHAPA;
    let atras = centro.clone().setZ(caja.max.z);
    for (const v of vertices)
      if (panel ? v.y >= caja.max.y - 1e-6 : v.z >= caja.max.z - 1e-6) atras = v.clone();
    atras.y += SOBRE_LA_CHAPA;
    salida[m[1] as "izquierda" | "derecha"].push({ puntos: [centro, atras], panel });
  });
  return salida;
}

/**
 * **Cómo queda una pieza del todo abajo**, en coordenadas del avión, con lo
 * que dice su vacío; `null` si no lo dice. Un panel, levantado hasta su tope de
 * tierra sobre su bisagra —ver `prepararAerofrenos`—; un flap, salido por su
 * carril y girado hasta su última muesca —ver `prepararFlaps`—:
 *
 *     x' = R (x − bisagra) + bisagra + carril · recorrido
 */
function abajoDelTodo(
  vacio: Object3D | null,
  aDeLaRaiz: Matrix4,
  panel: boolean,
): ((v: Vector3) => Vector3) | null {
  const d = vacio?.userData ?? {};
  const tres = (x: unknown): Vector3 | null =>
    Array.isArray(x) && x.length === 3 && x.every((n) => Number.isFinite(Number(n)))
      ? new Vector3(Number(x[0]), Number(x[1]), Number(x[2]))
      : null;
  const ultima = (x: unknown): number => (Array.isArray(x) ? Number(x[x.length - 1]) : NaN);
  const bisagra = tres(d["bisagra"]);
  const eje = tres(d["eje"]);
  const grados = panel ? Number(d["tierra"]) : ultima(d["muescas"]);
  const carril = panel ? new Vector3() : tres(d["carril"]);
  const recorrido = panel ? 0 : ultima(d["recorrido"]);
  if (!bisagra || !eje || !carril || !Number.isFinite(grados) || !Number.isFinite(recorrido))
    return null;
  const b = bisagra.applyMatrix4(aDeLaRaiz);
  const e = eje.transformDirection(aDeLaRaiz);
  const sale = carril.transformDirection(aDeLaRaiz).multiplyScalar(
    recorrido * aDeLaRaiz.getMaxScaleOnAxis(),
  );
  const giro = new Quaternion().setFromAxisAngle(e, (grados * Math.PI) / 180);
  return (v) => v.clone().sub(b).applyQuaternion(giro).add(b).add(sale);
}

/** La salida sobre el ala de cada lado, si el modelo la lleva. */
function salidasSobreElAla(
  raiz: Object3D,
  aGrupo: Matrix4,
): Record<"izquierda" | "derecha", Box3 | null> {
  const salida = raiz.getObjectByName(SALIDA_SOBRE_EL_ALA);
  const vertices = salida ? verticesDe(salida, aGrupo) : [];
  const deUnLado = (s: number): Box3 | null => {
    const suyos = vertices.filter((v) => Math.sign(v.x) === s);
    return suyos.length >= 4 ? new Box3().setFromPoints(suyos) : null;
  };
  return { izquierda: deUnLado(-1), derecha: deUnLado(1) };
}

/** Si algo del ala se cruza entre dos puntos del avión. */
function tapadoPorElAla(
  desde: Vector3,
  hasta: Vector3,
  piezas: readonly Object3D[],
  grupo: Object3D,
): boolean {
  if (!piezas.length) return false;
  const a = desde.clone().applyMatrix4(grupo.matrixWorld);
  const b = hasta.clone().applyMatrix4(grupo.matrixWorld);
  const dir = b.sub(a);
  const largo = dir.length();
  const rayo = new Raycaster(a, dir.normalize(), 0.05, Math.max(0.05, largo - 0.05));
  return rayo.intersectObjects(piezas as Object3D[], false).length > 0;
}

/**
 * **El asiento de encima del ala**: el que deja ver los frenos de tierra.
 *
 * - **En los de pasillo único, la fila de la salida sobre el ala**, mirando
 *   por la ventanilla de la trampilla. Primero fue la fila de delante, con la
 *   trampilla asomando por el borde, y Enrique la vio así en el JAZ 90: la
 *   ventanilla de uno cortada y enorme en un borde, el ala de refilón por la
 *   siguiente, la trampilla torcida al fondo y mucha pared, «y el ojo no sabe
 *   adónde mirar». En la clase del A320 y del 737 la trampilla lleva su
 *   ventanilla, y quien se sienta en esa fila tiene de frente el ala, el asa
 *   roja justo encima del cristal y el letrero «EXIT» encima. Así que ése es
 *   el asiento, mirando de lado y lo menos que se pueda hacia la cola —ver
 *   `MIRAR_ABAJO_EN_LA_SALIDA`—, sentado del todo: asomado, el letrero se sale
 *   de la pantalla por arriba. Si el modelo no trae la ventanilla de la
 *   trampilla, la fila de delante, que deja la trampilla del lado al que se
 *   mira. El de fuselaje ancho no lleva salidas sobre el ala sino puertas, y
 *   ahí se busca la ventanilla.
 * - **Y que se vean**: de cada ventanilla candidata se prueba hacia dónde mirar
 *   —a la cola o un poco al morro, y hacia abajo— y se cuenta lo que se ve
 *   **por el cristal**, con la misma cuenta que el marco hace con cada píxel y
 *   sin nada del ala por medio. Gana, por este orden: la que ve más paneles
 *   hasta `PANELES_QUE_BASTAN`; la que deja asomar la salida —el letrero y el
 *   canto de la trampilla dentro de la pantalla, en una tablet de 4:3—; la que
 *   ve más piezas, paneles y flaps, que también se pidieron; y la que mira más
 *   derecho a ellas. **Desde la fila de la salida**, después de los paneles y
 *   del asa y el letrero enteros: que se vea el horizonte por el cristal, que
 *   asome el flap, la que gira menos la cabeza hacia la cola, la que ve más
 *   canto de la trampilla y la que tiene los ojos más bajos, que son los de
 *   quien está sentado, y más los de un niño.
 * - **Y asomado**: elegida la ventanilla, los ojos se acercan al cristal todo lo
 *   que deje seguir viendo lo mismo con el marco entero. Ver `ASOMADO`. En la
 *   fila de la salida, no.
 *
 * `ventanillaDe` pone una medida de la fila en la pared; `tapado` dice si algo
 * se cruza entre dos puntos.
 */
function asientoSobreElAla(
  fila: readonly Medida[],
  piezas: readonly PiezaDelAla[],
  salida: Box3 | null,
  trampilla: Medida | null,
  cual: "izquierda" | "derecha",
  ventanillaDe: (m: Medida, cual: "izquierda" | "derecha") => VentanillaDePasaje,
  tapado: (desde: Vector3, hasta: Vector3) => boolean,
): AsientoDePasaje {
  const centroZ = (m: Medida): number => (m.zMin + m.zMax) / 2;
  const centroide = new Vector3();
  for (const p of piezas) centroide.add(p.puntos[0]!);
  centroide.divideScalar(Math.max(1, piezas.length));

  let candidatas: Medida[];
  const zSalida = salida ? (salida.min.z + salida.max.z) / 2 : 0;
  const delante = salida
    ? [...fila].filter((m) => centroZ(m) < zSalida).sort((a, b) => centroZ(b) - centroZ(a))[0]
    : undefined;
  // La fila de la salida, si su trampilla trae ventanilla. Ver la cabecera.
  const enLaSalida = !!(salida && trampilla);
  if (salida && trampilla) {
    candidatas = [trampilla];
  } else if (delante) {
    candidatas = [delante];
  } else {
    let desde = Infinity;
    let hasta = -Infinity;
    for (const p of piezas) {
      desde = Math.min(desde, p.puntos[0]!.z - DELANTE_DE_LOS_PANELES);
      hasta = Math.max(hasta, p.puntos[0]!.z);
    }
    candidatas = fila.filter((m) => centroZ(m) >= desde && centroZ(m) <= hasta);
    if (!candidatas.length) candidatas = [...fila];
  }

  /**
   * Lo que cuenta de una mirada, por orden: los paneles, que asome la salida y
   * lo demás, que cambia con el asiento. Ver la cabecera.
   */
  type Nota = readonly [paneles: number, asoma: number, ...resto: number[]];
  const mejorQue = (a: Nota, b: Nota): boolean => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! > b[i]!;
    return false;
  };
  type Mirada = { asiento: AsientoDePasaje; nota: Nota; entero: boolean };
  const ojo = new Vector3();
  const mira = new Vector3();
  const alCentro = new Vector3();
  const lejos = new Vector3();

  /*
   * Lo que no depende de cómo se mire, una vez por ventanilla: los rayos contra
   * el ala son lo caro, y asomado se mira varias veces por la misma.
   */
  const deCada = new Map<
    VentanillaDePasaje,
    {
      asomar: Vector3[];
      canto: Vector3[];
      cristal: Vector3;
      libres: PiezaDelAla[];
      marco: Vector3[];
    }
  >();
  const preparar = (v: VentanillaDePasaje) => {
    let p = deCada.get(v);
    if (!p) {
      const conSalida = conSuSalida(asientoAnteVentanilla(v, cual), fila, salida).salida;
      const cristal = new Vector3(v.centro.x, v.centro.y, v.centro.z);
      p = {
        asomar: conSalida ? loQueAsomaDeLaSalida(v, conSalida) : [],
        canto: conSalida?.enLaTrampilla ? elCantoDeLaTrampilla(v, conSalida) : [],
        cristal,
        // De cada pieza, los puntos que no tapa nada del ala.
        libres: piezas
          .map((q) => ({ panel: q.panel, puntos: q.puntos.filter((x) => !tapado(cristal, x)) }))
          .filter((q) => q.puntos.length > 0),
        marco: enLaSalida ? elCristalEntero(v) : elMarcoEntero(v),
      };
      deCada.set(v, p);
    }
    return p;
  };

  /** Cada manera de mirar por una ventanilla, desde `ojosA` y apuntando `encima`. */
  const mirar = (
    v: VentanillaDePasaje,
    ojosA: number,
    encima: number,
    cada: (m: Mirada) => void,
  ): void => {
    const { asomar, canto, cristal, libres, marco } = preparar(v);
    if (!libres.length) return;
    const abajos = enLaSalida ? MIRAR_ABAJO_EN_LA_SALIDA : MIRAR_ABAJO;
    for (let atras = MIRAR_ATRAS.desde; atras <= MIRAR_ATRAS.hasta; atras += MIRAR_ATRAS.paso)
      for (let abajo = abajos.desde; abajo <= abajos.hasta; abajo += abajos.paso)
        for (const fov of enLaSalida ? ANGULOS_EN_LA_SALIDA : [undefined]) {
          const recto = asientoAnteVentanilla(
            v,
            cual,
            atras * GRADO,
            abajo * GRADO,
            ojosA,
            encima,
          );
          const a: AsientoDePasaje = fov === undefined ? recto : { ...recto, fov };
          ojo.set(a.ojo.x, a.ojo.y, a.ojo.z);
          let paneles = 0;
          let vistas = 0;
          for (const p of libres)
            if (p.puntos.some((q) => seVePorLaVentanilla(ojo, q, QUIETO, v))) {
              vistas++;
              if (p.panel) paneles++;
            }
          const bastan = Math.min(paneles, PANELES_QUE_BASTAN);
          let nota: Nota;
          let entero: boolean;
          if (enLaSalida) {
            /*
             * Todo lo que se pidió ver, donde no tapa el HUD: el asa y el
             * letrero, el cristal entero —por encima de la barra de abajo— y el
             * horizonte de frente, por el cristal, que un ala sin horizonte no
             * dice dónde está. Ver `HUD`.
             */
            const asoma = asomar.length > 0 && asomar.every((p) => libreDelHud(a, p)) ? 1 : 0;
            entero = marco.every((p) => libreDelHud(a, p));
            const s = cual === "izquierda" ? -1 : 1;
            lejos.set(s * Math.cos(atras * GRADO), 0, Math.sin(atras * GRADO));
            lejos.multiplyScalar(1000).add(ojo);
            const horizonte = seVePorLaVentanilla(ojo, lejos, QUIETO, v) && libreDelHud(a, lejos);
            const flap = vistas > paneles ? 1 : 0;
            const deCanto = canto.filter((p) => libreDelHud(a, p)).length;
            // Y que la salida asome también con el subtítulo puesto.
            const conSubtitulo =
              asoma && asomar.every((p) => libreDelHud(a, p, true)) ? 1 : 0;
            // Y luego, lo menos girado hacia la cola, con la vista menos
            // abierta, más canto de la trampilla y los ojos más bajos.
            nota = [
              bastan,
              asoma,
              entero ? 1 : 0,
              horizonte ? 1 : 0,
              flap,
              conSubtitulo,
              -atras,
              -(fov ?? FOV_DE_PASAJE),
              deCanto,
              -(a.ojo.y - v.centro.y),
            ];
          } else {
            const asoma = asomar.length > 0 && asomar.every((p) => seVeSentado(a, p)) ? 1 : 0;
            entero = marco.every((p) => seVeSentado(a, p));
            mira.subVectors(cristal, ojo).normalize();
            const desvio = mira.angleTo(alCentro.subVectors(centroide, ojo));
            nota = [bastan, asoma, vistas, -desvio];
          }
          cada({ asiento: a, nota, entero });
        }
  };

  // Primero, la ventanilla y hacia dónde, sentado del todo; y en la fila de la
  // salida, apuntando también por encima del cristal.
  let mejor: Mirada | null = null;
  for (const m of candidatas)
    for (const encima of enLaSalida ? APUNTAR_ENCIMA_EN_LA_SALIDA : [0])
      mirar(ventanillaDe(m, cual), OJOS_A, encima, (x) => {
        if (!mejor || mejorQue(x.nota, mejor.nota)) mejor = x;
      });

  /*
   * **Y luego, asomado**: en esa misma ventanilla, lo más cerca del cristal que
   * deje ver lo mismo —tantos paneles, la salida si asomaba— con el marco
   * entero alrededor. Ver `ASOMADO`. Y mirando un poco por encima del centro
   * del cristal si hace falta, que de cerca el letrero de la salida se va por
   * arriba de la pantalla. La ventanilla, la de antes: acercarse no es
   * cambiarse de asiento. Y en la fila de la salida no se asoma uno: lo que se
   * viene a ver llega hasta el letrero, medio metro por encima del cristal, y
   * asomado no cabe —medido—.
   */
  const elegida: Mirada | null = enLaSalida ? null : mejor;
  if (elegida) {
    const [paneles, asoma] = (elegida as Mirada).nota;
    const v = (elegida as Mirada).asiento.ventanilla;
    /*
     * Y mirando hacia lo mismo: girando la cabeza, al acercarse, los paneles se
     * tapan unos a otros —medido con rayos en el JAZ 120, de seis a uno—; y
     * sin agacharse más que sentado, que más abajo se pierde el horizonte, y
     * un ala sin horizonte no dice dónde está.
     */
    const cabeceo = (elegida as Mirada).asiento.cabeceo - 2 * GRADO;
    const guinada = (elegida as Mirada).asiento.guinada;
    for (const ojosA of ASOMADO) {
      if (ojosA >= OJOS_A) break;
      let cerca: Mirada | null = null;
      for (const encima of APUNTAR_ENCIMA)
        mirar(v, ojosA, encima * v.alto, (x) => {
          if (!x.entero || x.nota[0] < paneles || x.nota[1] < asoma) return;
          if (x.asiento.cabeceo < cabeceo) return;
          if (Math.abs(x.asiento.guinada - guinada) > 2 * MIRAR_ATRAS.paso * GRADO * 1.01) return;
          if (!cerca || mejorQue(x.nota, cerca.nota)) cerca = x;
        });
      if (cerca) {
        mejor = cerca;
        break;
      }
    }
  }

  const asiento =
    (mejor as Mirada | null)?.asiento ??
    asientoAnteVentanilla(
      ventanillaDe(
        [...fila].sort(
          (a, b) => Math.abs(centroZ(a) - centroide.z) - Math.abs(centroZ(b) - centroide.z),
        )[0]!,
        cual,
      ),
      cual,
    );
  // Y dónde se sentaría con la espalda en el respaldo, ante esa misma
  // ventanilla: es donde está el asiento, el de uno y el de delante.
  const sentado = asientoAnteVentanilla(asiento.ventanilla, cual).ojo;
  return { ...conSuSalida(asiento, fila, salida), sentado };
}

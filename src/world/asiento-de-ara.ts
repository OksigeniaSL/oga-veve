/**
 * **El asiento de Ara**, en la escena de pasaje: el de la ventanilla desde la
 * que **se ven el ala y el motor**, que es lo primero que dice.
 *
 * «¡Me tocó la ventanilla! Desde acá se ve el ala del avión, y el motor.»
 * Enrique, en la primera versión: «la vista de ventanilla del JAZ 90 no
 * muestra el motor». Y no lo mostraba: el asiento de siempre —ver
 * `asiento-de-pasaje.ts`— va a un tercio de la cuerda del ala, mirando un
 * poco hacia la cola, y el motor del JAZ 90 cuelga **debajo del ala y por
 * delante de ella**, con la boca tres metros por delante del borde de ataque.
 * Desde ahí, sentado, no asoma ni un píxel. Medido con rayos por el cristal.
 *
 * Lo que sí hace cualquiera que se sienta ahí —y más un niño— es **pegarse a
 * la ventanilla**: con la cara cerca del cristal la ventanilla deja de ser un
 * ojo de buey y se ve hacia abajo, que es donde está el motor. Así que Ara
 * tiene tres maneras de mirar desde su asiento:
 *
 * - **Sentada**, algo más cerca del cristal que un adulto con la espalda en
 *   el respaldo —los pies no le llegan al suelo y se sienta en el borde—, con
 *   el horizonte y el paisaje.
 * - **Pegada al cristal, mirando el motor**: la boca del motor y el ala.
 * - **Pegada al cristal, mirando abajo**: el mar o las nubes de debajo.
 *
 * Y la ventanilla es la que mejor deja ver el motor y el ala a la vez con la
 * cara en el cristal, de las que caen encima del motor: en el JAZ 90, una fila
 * por delante de la de siempre. Se elige con la misma cuenta que se usa para
 * comprobarlo: una rejilla de rayos por la imagen, de los que pasan por el
 * cristal, y lo primero que corta cada uno. Ver `loQueSeVeDesde`.
 *
 * Lo que va **detrás** —los flaps del borde de salida— no se ve desde aquí ni
 * pegada al cristal: se ve por fuera. Ver el plano `fuera-ala` en
 * `flight/inicio-pasaje.ts`.
 */

import { Box3, Euler, Quaternion, Raycaster, Vector3, type Object3D } from "three";
import { FOV_DE_PASAJE } from "../cameras/pasaje";
import { seVePorLaVentanilla } from "./marco-de-ventanilla";
import {
  asientoAnteVentanilla,
  type AsientoDePasaje,
  type VentanillaDePasaje,
} from "./asiento-de-pasaje";

const GRADO = Math.PI / 180;

/** Cómo mira Ara: hacia la cola y hacia abajo, rad, y a cuánto del cristal, m. */
export interface Pose {
  readonly atras: number;
  readonly abajo: number;
  readonly ojosA: number;
}

/**
 * **Las tres maneras de mirar de Ara**, medidas en el JAZ 90:
 *
 * - Sentada a cuarenta centímetros, mirando un poco hacia abajo: el horizonte
 *   en medio y el borde del ala abajo.
 * - Pegada a veintiún centímetros —la frente casi en el cristal— y veinticuatro
 *   grados hacia abajo: el motor y el ala, con un poco de horizonte arriba.
 *   Medido: un 6 % de la imagen es motor y un 7 % ala.
 * - Pegada, mirando treinta grados hacia abajo y algo hacia delante, por
 *   delante del ala y del motor: el mar. Mirando hacia atrás, el ala y el
 *   motor se comían la vista de abajo —medido en la primera captura—.
 */
export const POSES_DE_ARA = {
  sentada: { atras: 8 * GRADO, abajo: 10 * GRADO, ojosA: 0.4 },
  motor: { atras: 4 * GRADO, abajo: 24 * GRADO, ojosA: 0.21 },
  abajo: { atras: -12 * GRADO, abajo: 30 * GRADO, ojosA: 0.21 },
} as const satisfies Readonly<Record<string, Pose>>;

export type ComoMiraAra = keyof typeof POSES_DE_ARA;

/** El asiento de Ara: su ventanilla y cómo se mira desde ella. */
export interface AsientoDeAra {
  readonly ventanilla: VentanillaDePasaje;
  /** Cada manera de mirar, como un asiento: los ojos y hacia dónde. */
  readonly poses: Readonly<Record<ComoMiraAra, AsientoDePasaje>>;
  /** Lo que se ve pegada al cristal mirando el motor: fracciones de la imagen. */
  readonly delMotor: LoQueSeVe;
}

/** Lo que se ve desde un asiento, en fracciones de la imagen. */
export interface LoQueSeVe {
  /** Lo que es cristal: lo demás es la pared, el marco y el asiento. */
  readonly cristal: number;
  readonly motor: number;
  readonly ala: number;
  readonly cielo: number;
  readonly suelo: number;
}

/** Las piezas que son el motor y las que son el ala, por su nombre en el modelo. */
const ES_MOTOR = /^(motor|pilon|gondola|toma)/;
const ES_ALA = /^(ala|flap|aleron|aerofreno)/;

/**
 * Un asiento de Ara con una pose. **Sin `sentado`**: el marco pinta el asiento
 * propio, vacío, a quien se despega de él —ver `uPropio` en
 * `marco-de-ventanilla.ts`—, y el de Ara no está vacío, que está Ara en él.
 * La primera captura lo enseñó: un respaldo verde y vacío asomando abajo a la
 * izquierda, donde va su espalda.
 */
export function conLaPose(
  v: VentanillaDePasaje,
  lado: "izquierda" | "derecha",
  pose: Pose,
): AsientoDePasaje {
  return asientoAnteVentanilla(v, lado, pose.atras, pose.abajo, pose.ojosA);
}

/**
 * **Lo que se ve desde un asiento**: una rejilla de rayos por la imagen, en
 * un apaisado de 16:9 con el ángulo de la vista de pasaje; de los que pasan
 * por el cristal —con la misma cuenta que pinta el marco—, lo primero que
 * corta cada uno: motor, ala, o nada, y entonces cielo o suelo según vaya.
 * `mallas`, las del avión; `grupo`, el del avión colocado.
 */
export function loQueSeVeDesde(
  asiento: AsientoDePasaje,
  mallas: readonly Object3D[],
  grupo: Object3D,
  rejilla: { readonly ancho: number; readonly alto: number } = { ancho: 32, alto: 18 },
): LoQueSeVe {
  grupo.updateWorldMatrix(true, false);
  const giro = new Quaternion().setFromEuler(new Euler(asiento.cabeceo, asiento.guinada, 0, "YXZ"));
  const ojo = new Vector3(asiento.ojo.x, asiento.ojo.y, asiento.ojo.z);
  const enElMundo = ojo.clone().applyMatrix4(grupo.matrixWorld);
  const quieto = { position: new Vector3(), orientation: new Quaternion() };
  const t = Math.tan(((asiento.fov ?? FOV_DE_PASAJE) / 2) * GRADO);
  const aspecto = 16 / 9;
  const rayo = new Raycaster();
  rayo.far = 300;
  const d = new Vector3();
  const lejos = new Vector3();
  const cuenta = { cristal: 0, motor: 0, ala: 0, cielo: 0, suelo: 0 };
  let n = 0;
  for (let i = 0; i < rejilla.ancho; i++)
    for (let j = 0; j < rejilla.alto; j++) {
      n++;
      const x = ((i + 0.5) / rejilla.ancho) * 2 - 1;
      const y = ((j + 0.5) / rejilla.alto) * 2 - 1;
      d.set(x * aspecto * t, y * t, -1).normalize().applyQuaternion(giro);
      lejos.copy(ojo).addScaledVector(d, 50);
      if (!seVePorLaVentanilla(ojo, lejos, quieto, asiento.ventanilla)) continue;
      cuenta.cristal++;
      rayo.set(enElMundo, d.clone().transformDirection(grupo.matrixWorld));
      const corte = rayo.intersectObjects(mallas as Object3D[], false)[0];
      const nombre = corte?.object.name ?? "";
      if (ES_MOTOR.test(nombre)) cuenta.motor++;
      else if (ES_ALA.test(nombre)) cuenta.ala++;
      else if (!corte) {
        if (d.y > 0) cuenta.cielo++;
        else cuenta.suelo++;
      }
    }
  return {
    cristal: cuenta.cristal / n,
    motor: cuenta.motor / n,
    ala: cuenta.ala / n,
    cielo: cuenta.cielo / n,
    suelo: cuenta.suelo / n,
  };
}

/**
 * **Las mallas que pueden estar delante del cristal**: todo lo de fuera del
 * avión. Lo de dentro —la cabina de mando, los asientos— y las losas de las
 * ventanillas, no: desde el asiento no se cruzan.
 */
export function mallasDeFuera(raiz: Object3D): Object3D[] {
  const salida: Object3D[] = [];
  raiz.traverse((o) => {
    if (!(o as { isMesh?: boolean }).isMesh) return;
    if (/^(ventan|fuselaje_1$|forro|alfeizar|asiento$|suelo-cabina|panel|pantalla|boton|efis|mcp|pedestal|palanca|pomo|cuerno|bastidor|interruptores|rotulos|visera|parabrisas|montantes|juntas|limpia)/.test(o.name))
      return;
    salida.push(o);
  });
  return salida;
}

/**
 * **El asiento de Ara de un costado**: de las ventanillas que caen encima del
 * motor —de su boca a su tobera—, la que pegada al cristal deja ver a la vez
 * más motor y más ala; o `null` si el avión no tiene motor debajo del ala que
 * ver. Las demás poses, desde la misma ventanilla: es el mismo asiento.
 */
export function asientoDeAra(
  fila: readonly VentanillaDePasaje[],
  lado: "izquierda" | "derecha",
  raiz: Object3D,
  grupo: Object3D,
): AsientoDeAra | null {
  grupo.updateWorldMatrix(true, true);
  const aGrupo = grupo.matrixWorld.clone().invert();
  const s = lado === "izquierda" ? -1 : 1;
  // El motor de este lado, en los ejes del avión.
  const motor = new Box3();
  raiz.traverse((o) => {
    if (!(o as { isMesh?: boolean }).isMesh || !ES_MOTOR.test(o.name)) return;
    const caja = new Box3().setFromObject(o).applyMatrix4(aGrupo);
    // Una malla puede llevar los dos motores: se queda la mitad de este lado.
    if (Math.sign(caja.max.x) === s || Math.sign(caja.min.x) === s) {
      if (s < 0) caja.max.x = Math.min(caja.max.x, 0);
      else caja.min.x = Math.max(caja.min.x, 0);
      motor.union(caja);
    }
  });
  if (motor.isEmpty()) return null;
  const candidatas = fila.filter((v) => v.centro.z > motor.min.z - 0.6 && v.centro.z < motor.max.z + 0.6);
  if (!candidatas.length) return null;
  const mallas = mallasDeFuera(raiz);
  let mejor: { v: VentanillaDePasaje; ve: LoQueSeVe; nota: number } | null = null;
  for (const v of candidatas) {
    const ve = loQueSeVeDesde(conLaPose(v, lado, POSES_DE_ARA.motor), mallas, grupo, { ancho: 20, alto: 12 });
    // Que se vean los dos: manda el que menos se ve.
    const nota = Math.min(ve.motor, ve.ala) + 0.1 * (ve.motor + ve.ala);
    if (!mejor || nota > mejor.nota) mejor = { v, ve, nota };
  }
  if (!mejor || mejor.ve.motor <= 0) return null;
  const v = mejor.v;
  return {
    ventanilla: v,
    poses: {
      sentada: conLaPose(v, lado, POSES_DE_ARA.sentada),
      motor: conLaPose(v, lado, POSES_DE_ARA.motor),
      abajo: conLaPose(v, lado, POSES_DE_ARA.abajo),
    },
    delMotor: mejor.ve,
  };
}

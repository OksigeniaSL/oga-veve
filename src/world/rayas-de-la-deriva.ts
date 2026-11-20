/**
 * **Las rayas de «Apuntá al viento» en el suelo**, con el ejercicio que las
 * pide: la magenta, la recta al sitio; la blanca, por donde va el avión; y la
 * blanca que sigue por delante, la línea de trayectoria. Ver
 * `flight/deriva.ts` y `raya-del-camino.ts`.
 *
 * Vive aquí, y no suelta en `game.ts`, por el orden del paso (H50): la de
 * delante se quita al cerrar el ejercicio, y el ejercicio se cierra dentro de
 * su paso. Si las rayas se miran antes del paso, en el paso que cierra la de
 * delante se queda tendida hasta el siguiente: un fotograma pintado con la
 * línea de un ejercicio ya cerrado, y el banco de la deriva la leía ahí
 * cuando su lectura caía justo entre ese paso y el siguiente. Con el paso
 * dentro de esta clase, el orden lo fija ella y lo mira una prueba.
 */

import type { Object3D } from "three";
import type { Deriva, LecturaDeLaDeriva, SucesoDeLaDeriva } from "../flight/deriva";
import { BLANCO, CintaEnElSuelo, MAGENTA, PASO } from "./raya-del-camino";
import type { GroundSampler } from "./runway-guide";

/**
 * **Lo largo de la línea de trayectoria**, m: cuatro kilómetros, que desde
 * fuera, detrás del avión, se ven enteros; cerca del sitio, hasta un poco más
 * allá de él.
 */
export const LINEA_DE_TRAYECTORIA = 4000;
/** Lo que pasa más allá del sitio la línea de delante, m. */
const MAS_ALLA = 600;
/** Cada cuánto se vuelve a tender la de delante, s: cuatro veces por segundo. */
export const CADA = 0.25;

export class RayasDeLaDeriva {
  readonly camino: CintaEnElSuelo;
  readonly recta: CintaEnElSuelo;
  readonly delante: CintaEnElSuelo;
  /** Lo que falta para volver a tender la de delante, s. */
  private hastaLaDeDelante = 0;

  constructor(suelo: GroundSampler) {
    this.camino = new CintaEnElSuelo(suelo, BLANCO, 16);
    this.recta = new CintaEnElSuelo(suelo, MAGENTA, 10);
    this.delante = new CintaEnElSuelo(suelo, BLANCO, 10, LINEA_DE_TRAYECTORIA / PASO + 2);
  }

  /**
   * **Un paso del ejercicio y sus rayas**: la recta, una vez; el camino, una
   * muestra cada cincuenta metros; y la de delante. Con `quieto` el ejercicio
   * no da el paso —la tarjeta del tiempo está abierta— pero las rayas sí.
   * Devuelve lo que dijo el ejercicio.
   *
   * **Primero el ejercicio, luego la de delante**, que así ve la fase en que
   * queda el paso: la del paso que cierra ya es «cerrada». Ver la cabecera.
   */
  paso(d: Deriva, l: LecturaDeLaDeriva, dt: number, quieto = false): SucesoDeLaDeriva[] {
    const c = d.colocacion;
    if (!c) return [];
    if (this.recta.muestras === 0) this.recta.recta(c, c.sitio);
    // El camino, antes: en el paso que llega, su última muestra es la de encima del sitio.
    if (!l.enElSuelo && d.fase !== "cerrada") this.camino.anadir(l.x, l.z);
    const sucesos = quieto ? [] : d.paso(l, dt);
    this.tenderLaDeDelante(d, l, dt);
    return sucesos;
  }

  /**
   * **Y hacia dónde se va de verdad**, delante: la raya del camino que va
   * dejando el avión queda detrás, y desde la cabina o desde fuera se mira
   * hacia delante. Así que la blanca sigue también por delante del avión, por
   * donde lo lleva el camino de ahora —la velocidad sobre el suelo, con el
   * viento dentro—, como la línea de trayectoria de una pantalla de
   * navegación o de un GPS. Con viento de costado se ve ir al lado del puente
   * aunque el morro apunte a él; corrigiendo, acaba en él. Se tiende cuatro
   * veces por segundo; cerrado el ejercicio, se quita.
   */
  private tenderLaDeDelante(d: Deriva, l: LecturaDeLaDeriva, dt: number): void {
    const c = d.colocacion;
    this.hastaLaDeDelante -= dt;
    if (!c || d.fase === "cerrada" || l.enElSuelo) {
      this.delante.vaciar();
      return;
    }
    if (this.hastaLaDeDelante > 0) return;
    this.hastaLaDeDelante = CADA;
    const v = Math.hypot(l.vx, l.vz);
    if (v <= 1) return;
    const lejos = Math.min(LINEA_DE_TRAYECTORIA, Math.hypot(c.sitio.x - l.x, c.sitio.z - l.z) + MAS_ALLA);
    this.delante.recta({ x: l.x, z: l.z }, { x: l.x + (l.vx / v) * lejos, z: l.z + (l.vz / v) * lejos });
  }

  /** Las tres, en la escena; si ya están, no hace nada. */
  ponerEn(escena: Object3D): void {
    this.recta.ponerEn(escena);
    this.camino.ponerEn(escena);
    this.delante.ponerEn(escena);
  }

  /** Otra vez desde el principio: la recta se queda, que el sitio es el mismo. */
  vaciar(): void {
    this.camino.vaciar();
    this.delante.vaciar();
    this.hastaLaDeDelante = 0;
  }
}

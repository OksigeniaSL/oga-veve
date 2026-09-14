/**
 * La vista de dentro: la cabina, y la de pájaro.
 *
 * Son la misma cámara con el avión visible o no. **Desde dentro no hay
 * suavizado ninguno**: la cámara es la cabeza del piloto y va rígidamente
 * unida al avión, así que copia su posición y su orientación sin filtrar
 * nada. Cualquier retardo aquí se lee como que la cabeza va suelta.
 */

import { Vector3, type PerspectiveCamera } from "three";
import type { FlightState } from "../flight/model";
import {
  FOV_DE_CABINA,
  fovConVelocidad,
  type CameraRig,
  type Contexto,
} from "./tipos";

/**
 * Cuánto se inclina la vista de cabina hacia el panel, en radianes.
 *
 * Doce grados. Ver `update`.
 */
const MIRANDO_AL_PANEL = (12 * Math.PI) / 180;

export class CamaraDeDentro implements CameraRig {
  readonly muestraElAvion: boolean;
  private readonly offset = new Vector3();
  /** Si esta vista cierra el ángulo como una cabina o lo abre con la velocidad. */
  private readonly comoCabina: boolean;

  constructor(muestraElAvion: boolean, comoCabina: boolean) {
    this.muestraElAvion = muestraElAvion;
    this.comoCabina = comoCabina;
  }

  update(
    camera: PerspectiveCamera,
    state: FlightState,
    _dt: number,
    ctx: Contexto,
  ): void {
    /*
     * Si la aeronave es un modelo de verdad, el sitio lo dice él: su asiento
     * delantero. La fórmula sobre la cuerda del ala es para las cajas, donde
     * no hay cabina y da igual dónde te pongas.
     */
    const ojo = ctx.ojo;
    if (ojo) this.offset.set(ojo.x, ojo.y, ojo.z);
    else
      this.offset.set(0, ctx.aircraft.chord * 0.55, -ctx.aircraft.chord * 0.4);
    this.offset.applyQuaternion(state.orientation);
    camera.position.copy(state.position).add(this.offset);
    camera.quaternion.copy(state.orientation);
    /*
     * **Y en cabina se mira un poco hacia abajo, por encima de la visera.**
     *
     * Un piloto sentado no mira al infinito: mira por encima del borde del
     * panel, y en el campo de visión le entra la fila de arriba de los
     * instrumentos. Copiando la actitud del avión tal cual, la cámara miraba
     * derecha al horizonte y **el panel se quedaba fuera de la pantalla**: en
     * el turbohélice no se veía un solo reloj, y en el entrenador solo la mitad
     * de una pantalla. Se vio en las seis capturas de cabina, una por avión.
     *
     * Doce grados es lo que hace falta para que en todos entre la visera y la
     * primera fila, sin comerse el mundo por delante — que es lo que se está
     * mirando de verdad.
     */
    if (this.comoCabina) camera.rotateX(-MIRANDO_AL_PANEL);
  }

  /**
   * En la cabina, fijo y cerrado; de pájaro, el de fuera.
   *
   * No es una inconsistencia: la de pájaro es la cabina **sin el avión
   * delante**, o sea una vista de fuera puesta en el sitio de dentro, y ahí el
   * ángulo que estira con la velocidad sigue diciendo lo que tiene que decir.
   */
  fovDeseado(state: FlightState, ctx: Contexto): number {
    return this.comoCabina ? FOV_DE_CABINA : fovConVelocidad(state, ctx);
  }
}

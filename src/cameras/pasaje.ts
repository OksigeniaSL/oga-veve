/**
 * **La vista de pasajero**, desde la ventanilla de un costado.
 *
 * Pedida así: «me gustaría tener una vista de pasajero desde ventanilla
 * derecha e izquierda». Es desde donde se ve lo que cuenta la comandante, y
 * desde donde lo va a ver quien juega el día que se suba a un avión.
 *
 * Es una vista de dentro, y como la cabina va **rígida con el avión**: el
 * asiento no se mueve respecto al fuselaje, solo el cuello en un bache. Dónde
 * está el asiento y hacia dónde se mira sentado lo mide el modelo —ver
 * `world/asiento-de-pasaje.ts`—, y el marco de la ventanilla lo pinta
 * `world/marco-de-ventanilla.ts` encima de lo que se ve.
 *
 * Sin asiento medido —el avión de cajas, o uno sin ventanillas— no hay vista
 * de pasaje: el juego no la ofrece. Ver `vistasDe` en `index.ts`.
 */

import { Quaternion, Vector3, type PerspectiveCamera } from "three";
import type { FlightState } from "../flight/model";
import { Cuello } from "./dentro";
import type { CameraRig, Contexto } from "./tipos";

/**
 * El ángulo de la vista de pasaje, grados.
 *
 * Sesenta y cuatro, fijo: desde el asiento no se estira nada con la velocidad
 * —ese truco es de las vistas de fuera— y con este ángulo, sentado a medio
 * metro, el cristal ocupa algo más de la mitad del alto de la pantalla y el
 * marco se ve entero alrededor. Más cerrado, la ventanilla se come la
 * pantalla y se pierde el marco, que es lo que dice «estás dentro».
 */
export const FOV_DE_PASAJE = 64;

const Y = new Vector3(0, 1, 0);
const X = new Vector3(1, 0, 0);

export class CamaraDePasaje implements CameraRig {
  readonly muestraElAvion = true;
  private readonly offset = new Vector3();
  private readonly cuello = new Cuello();
  private readonly giro = new Quaternion();
  private readonly arriba = new Quaternion();

  constructor(readonly lado: "izquierda" | "derecha") {}

  update(
    camera: PerspectiveCamera,
    state: FlightState,
    dt: number,
    ctx: Contexto,
  ): void {
    const asiento = ctx.pasaje?.[this.lado];
    const cabeza = this.cuello.paso(state, dt, ctx, true);
    if (asiento) {
      this.offset.set(asiento.ojo.x, asiento.ojo.y + cabeza, asiento.ojo.z);
      this.giro.setFromAxisAngle(Y, asiento.guinada);
      this.arriba.setFromAxisAngle(X, asiento.cabeceo);
    } else {
      // Sin asiento medido, los ojos del piloto mirando por su costado: no
      // es una vista que se ofrezca así, pero un fotograma sin modelo
      // cargado todavía no puede dejar la cámara en ninguna parte.
      const ojo = ctx.ojo;
      if (ojo) this.offset.set(ojo.x, ojo.y + cabeza, ojo.z);
      else this.offset.set(0, ctx.aircraft.chord * 0.55, 0);
      this.giro.setFromAxisAngle(Y, this.lado === "izquierda" ? Math.PI / 2 : -Math.PI / 2);
      this.arriba.identity();
    }
    this.offset.applyQuaternion(state.orientation);
    camera.position.copy(state.position).add(this.offset);
    camera.quaternion
      .copy(state.orientation)
      .multiply(this.giro)
      .multiply(this.arriba);
  }

  fovDeseado(): number {
    return FOV_DE_PASAJE;
  }
}

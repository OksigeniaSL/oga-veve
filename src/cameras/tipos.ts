/**
 * Qué es una cámara aquí, y qué se le da para que haga su trabajo.
 *
 * Había tres vistas mezcladas con `if` dentro de un método de cien líneas de
 * `game.ts`, y funcionaban. El problema no era ese: era que **la cuarta no
 * cabía**. La cámara de la torre, la repetición de un aterrizaje bueno, una
 * cinemática de bienvenida y el multimonitor son cuatro vistas más, y todas
 * pedían otro `if` en el mismo sitio y otra variable de estado suelta en la
 * clase del juego, que ya lleva bastante.
 *
 * Así que una vista es un objeto con dos preguntas: **dónde pongo la cámara
 * este fotograma** y **con qué ángulo**. Lo que necesita saber viene en el
 * contexto, y nada de aquí conoce el juego: ni el HUD, ni las lecciones, ni el
 * escenario. Una vista nueva es un fichero nuevo y una línea en `index.ts`.
 */

import type { PerspectiveCamera } from "three";
import type { FlightState } from "../flight/model";

/** Lo que una vista necesita del mundo, y no puede sacar del estado del avión. */
export interface Contexto {
  /** Las medidas del avión: lo que separa una vista de ala de una de cola. */
  readonly aircraft: { readonly wingSpan: number; readonly chord: number };
  /**
   * Dónde tiene los ojos el piloto en este modelo, si el modelo lo dice.
   *
   * Sale del asiento delantero de la malla. Cuando no hay malla —una caja— se
   * calcula sobre la cuerda del ala, que es lo que había antes.
   */
  readonly ojo: { readonly x: number; readonly y: number; readonly z: number } | null;
  /** La cota del terreno, para que la cámara no se meta debajo. */
  readonly suelo: (x: number, z: number) => number;
  /** Si el sistema pide movimiento reducido. Apaga traqueteo y zoom. */
  readonly movimientoReducido: boolean;
  /** Cuánto traquetea el suelo de debajo: asfalto 1, hierba 1,8, campo 3. */
  readonly traqueteo: number;
}

export interface CameraRig {
  /** ¿Se ve el avión desde aquí? Desde dentro, no. */
  readonly muestraElAvion: boolean;
  /** Coloca la cámara para este fotograma. */
  update(
    camera: PerspectiveCamera,
    state: FlightState,
    dt: number,
    ctx: Contexto,
  ): void;
  /**
   * El ángulo que pide esta vista, en grados.
   *
   * Es el **deseado**: quien llama lo suaviza. Un salto de ángulo al cambiar
   * de vista se ve como un tirón, y el suavizado es el mismo para todas.
   */
  fovDeseado(state: FlightState, ctx: Contexto): number;
}

/** Campo de visión en reposo y cuánto se abre a velocidad máxima, en grados. */
export const BASE_FOV = 62;

/**
 * Y el de la cabina, que es más cerrado.
 *
 * Sesenta y dos grados son los que hacen falta volando por fuera, y dentro de
 * la cabina meten en el cuadro el techo, los montantes y los dos respaldos: el
 * mundo se ve por una rendija rodeada de avión. Cincuenta —un objetivo un poco
 * más largo— dejan el parabrisas ocupando lo que ocupa cuando uno va sentado
 * ahí de verdad.
 */
export const FOV_DE_CABINA = 50;
export const FOV_STRETCH = 9;

/**
 * Velocidad, en m/s, a la que el campo de visión llega a su tope.
 *
 * Baja a propósito. Con la referencia en setenta, a velocidad de rotación
 * —treinta— solo se había abierto el cuarenta por ciento, así que toda la
 * carrera por pista transcurría con el ángulo casi quieto y no se apreciaba
 * acelerar. Lo que tiene que leerse es el **cambio**, y el cambio importa
 * justo donde se acelera de verdad, no en crucero.
 */
export const FOV_REFERENCE = 44;

/**
 * El ángulo que se abre con la velocidad.
 *
 * Estirar la periferia da sensación de ir más rápido, que es el truco más
 * barato que existe. No pasa de setenta y un grados: más distorsiona y marea.
 * Con movimiento reducido se queda fijo.
 */
export function fovConVelocidad(state: FlightState, ctx: Contexto): number {
  if (ctx.movimientoReducido) return BASE_FOV;
  return BASE_FOV + FOV_STRETCH * Math.min(1, state.airspeed / FOV_REFERENCE);
}

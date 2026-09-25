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
 * Cuánto se inclina la vista de cabina hacia el panel cuando no se sabe dónde
 * está la visera, en radianes: las cajas de respaldo. Ver `encuadreDeCabina`.
 */
const MIRANDO_AL_PANEL = (12 * Math.PI) / 180;

/**
 * A qué altura de la pantalla cae el borde de la visera, desde arriba.
 *
 * **El cuarenta y dos por ciento, en todos los aviones y en todas las
 * pantallas.** Estaba en el treinta y tres, y no por decisión: salía de doce
 * grados puestos a mano, iguales para los seis aviones, que con la visera a
 * la altura de los ojos la subían a un tercio de la pantalla. En una tablet,
 * encima de ese tercio van dos filas de botones; en un teléfono, la quinta
 * parte de la pantalla. Lo que quedaba de parabrisas era una rendija, que es
 * la queja que ya se había arreglado una vez moviendo el asiento y volvió:
 * «cuando estás dentro de la cabina solo se ven los mandos, no veo por dónde
 * estoy volando».
 *
 * Con la raya en el 42 % el parabrisas casi dobla en el teléfono, y los
 * relojes —que empiezan justo debajo de la visera— siguen entrando enteros,
 * medido con `enPantalla` en los seis.
 */
const VISERA_EN_PANTALLA = 0.42;

/** Hasta dónde se abre el ángulo para que quepan los instrumentos, grados. */
const FOV_MAXIMO = 78;

/**
 * Qué parte de la pantalla puede ocupar el grupo de instrumentos: lo que
 * queda al quitar un margen del tres por ciento a cada lado y abajo, para que
 * nada se lea cortado contra el borde.
 */
const HASTA_EL_BORDE = 0.97;

/**
 * El encuadre de la cabina: cuánto bajar la vista y con qué ángulo mirar.
 *
 * **Es la regla del anclaje del cuadro, traída a la cabina de tres
 * dimensiones**: el grupo de lo que se lee y se toca se ve entero, y si no
 * cabe **se encoge**, nunca se corta ni se descentra. Aquí encoger es abrir
 * el ángulo de visión. Antes era un ángulo fijo de cincuenta y ocho grados
 * para todos, y en una tablet los dos reactores dejaban media pantalla de
 * cada piloto fuera por los lados; y el turbohélice, su columna de motor y
 * sus botones fuera por abajo.
 *
 * La inclinación es geometría: la visera está `visera` radianes por debajo de
 * los ojos, y un punto que se ve a una fracción `s` de la pantalla desde
 * arriba está `atan((1 − 2s)·tan(fov/2))` por encima del centro. Mirando hacia
 * abajo la suma de los dos, la visera cae donde se quiere en cualquier avión.
 *
 * Sin encuadre —las cajas de respaldo, que no tienen cabina— lo de siempre.
 */
export function encuadreDeCabina(
  e: { visera: number; lados: number; abajo: number } | undefined,
  aspecto: number,
): { inclinacion: number; fov: number } {
  if (!e) return { inclinacion: MIRANDO_AL_PANEL, fov: FOV_DE_CABINA };
  let salida = { inclinacion: MIRANDO_AL_PANEL, fov: FOV_DE_CABINA };
  for (let fov = FOV_DE_CABINA; fov <= FOV_MAXIMO; fov += 0.5) {
    const t = Math.tan(((fov / 2) * Math.PI) / 180);
    const inclinacion =
      e.visera + Math.atan((1 - 2 * VISERA_EN_PANTALLA) * t);
    salida = { inclinacion, fov };
    const abajo = 0.5 + Math.tan(e.abajo - inclinacion) / (2 * t);
    const cabeAbajo = abajo <= HASTA_EL_BORDE;
    const cabeALosLados = e.lados <= HASTA_EL_BORDE * aspecto * t;
    if (cabeAbajo && cabeALosLados) break;
  }
  return salida;
}

export class CamaraDeDentro implements CameraRig {
  readonly muestraElAvion: boolean;
  private readonly offset = new Vector3();
  /** Si esta vista cierra el ángulo como una cabina o lo abre con la velocidad. */
  private readonly comoCabina: boolean;
  /** El último encuadre, para que el ángulo pedido sea el mismo que se usó. */
  private encuadre = { inclinacion: MIRANDO_AL_PANEL, fov: FOV_DE_CABINA };

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
     * Cuánto, lo dice la visera de cada avión: ver `encuadreDeCabina`.
     */
    if (this.comoCabina) {
      this.encuadre = encuadreDeCabina(ojo?.encuadre, camera.aspect);
      camera.rotateX(-this.encuadre.inclinacion);
    }
  }

  /**
   * En la cabina, fijo y cerrado; de pájaro, el de fuera.
   *
   * No es una inconsistencia: la de pájaro es la cabina **sin el avión
   * delante**, o sea una vista de fuera puesta en el sitio de dentro, y ahí el
   * ángulo que estira con la velocidad sigue diciendo lo que tiene que decir.
   */
  fovDeseado(state: FlightState, ctx: Contexto): number {
    return this.comoCabina ? this.encuadre.fov : fovConVelocidad(state, ctx);
  }
}

/**
 * Las vistas que hay, y cómo se pide una.
 *
 * Añadir la de la torre, la repetición de un aterrizaje o una cinemática es
 * escribir un fichero al lado y una línea en este mapa. Ver `tipos.ts`.
 */

import { CamaraDeDentro } from "./dentro";
import { CamaraDeFuera } from "./fuera";
import type { CameraRig } from "./tipos";

export type { CameraRig, Contexto } from "./tipos";
export { BASE_FOV, FOV_DE_CABINA } from "./tipos";

/**
 * Vistas disponibles, en el orden en que rota la tecla C.
 *
 * `pajaro` es la cabina **sin avión**: la cámara va donde los ojos del piloto
 * y la aeronave no se dibuja, así que lo único que hay delante es el mundo.
 * «En algunos juegos recuerdo que había una opción para ocultar la aeronave,
 * era como si tú fueras el pájaro.»
 *
 * Va la última del ciclo a propósito. Es la vista más bonita y la que menos
 * enseña —sin panel, sin morro, sin nada que diga cómo va el avión—, así que
 * se llega a ella después de las que sí enseñan.
 *
 * `wing` mira desde el ala derecha e `izquierda` desde la otra, y las dos
 * están porque se pidieron: desde el costado se ve **a la vez** el avión y
 * hacia dónde va, que es justo lo que la cámara de detrás no deja ver. La
 * izquierda es además el lado desde el que se mira en un avión de verdad —el
 * comandante se sienta a la izquierda—, y es la que enseña la pista en el
 * circuito, que se vuela con las vueltas a la izquierda.
 */
export const CAMERA_MODES = [
  "chase",
  "cockpit",
  "wing",
  "izquierda",
  "pajaro",
] as const;

export type CameraMode = (typeof CAMERA_MODES)[number];

/**
 * Una vista por modo, y **cada una con su estado**.
 *
 * Se construyen todas de una vez y se guardan: el traqueteo y el filtro de
 * aceleración son historia acumulada, y tirarlos y rehacerlos en cada pulsación
 * de la tecla haría que cambiar de vista sacudiera la cámara.
 */
export function construirCamaras(): Readonly<Record<CameraMode, CameraRig>> {
  return {
    chase: new CamaraDeFuera("cola"),
    wing: new CamaraDeFuera("derecha"),
    izquierda: new CamaraDeFuera("izquierda"),
    cockpit: new CamaraDeDentro(true, true),
    // La de pájaro es la cabina sin el avión delante.
    pajaro: new CamaraDeDentro(false, false),
  };
}

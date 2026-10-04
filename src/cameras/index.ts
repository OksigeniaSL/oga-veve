/**
 * Las vistas que hay, y cómo se pide una.
 *
 * Añadir la de la torre, la repetición de un aterrizaje o una cinemática es
 * escribir un fichero al lado y una línea en este mapa. Ver `tipos.ts`.
 */

import { CamaraDeDentro } from "./dentro";
import { CamaraDeFuera } from "./fuera";
import { TOPES, type ComoSeMira, type Topes } from "./mirada";
import { CamaraDePasaje } from "./pasaje";
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
  /*
   * **Y las dos ventanillas del pasaje**, justo detrás de la cabina: de la
   * cabina se pasa al pasaje, que es el orden en que se recorre un avión.
   * Solo en los aviones que llevan pasaje y sus ventanillas en el modelo; en
   * los demás la tecla se las salta. Ver `vistasDe`.
   */
  "pasaje-izquierda",
  "pasaje-derecha",
  /*
   * **Y las dos de encima del ala**, en los que llevan frenos de tierra: el
   * asiento desde el que se ven levantarse los paneles al tocar y bajar los
   * flaps. Detrás de las otras dos, que es como se recorre el pasaje: hacia la
   * cola. Pedidas por Enrique, que los recuerda desde la ventanilla —«parecen
   * de papel»—. Ver `asientoSobreElAla` en `world/asiento-de-pasaje.ts`.
   */
  "pasaje-ala-izquierda",
  "pasaje-ala-derecha",
  "wing",
  "izquierda",
  /*
   * Y `morro`, de frente. Pedida así: «un POV para ver el avión de frente,
   * podría quedar bonito». Y de paso enseña: de frente es donde se lee el
   * diedro del ala y **de qué lado viene** el avión por sus luces, que es la
   * mitad de para qué están.
   */
  "morro",
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
    morro: new CamaraDeFuera("morro"),
    cockpit: new CamaraDeDentro(true, true),
    // La de pájaro es la cabina sin el avión delante.
    pajaro: new CamaraDeDentro(false, false),
    "pasaje-izquierda": new CamaraDePasaje("izquierda"),
    "pasaje-derecha": new CamaraDePasaje("derecha"),
    "pasaje-ala-izquierda": new CamaraDePasaje("izquierda", true),
    "pasaje-ala-derecha": new CamaraDePasaje("derecha", true),
  };
}

/** Las de pasaje: las dos de siempre y las dos de encima del ala. */
export const VISTAS_DE_PASAJE: readonly CameraMode[] = [
  "pasaje-izquierda",
  "pasaje-derecha",
  "pasaje-ala-izquierda",
  "pasaje-ala-derecha",
];

/** Una vista de ventanilla del pasaje. */
export type VistaDePasaje =
  | "pasaje-izquierda"
  | "pasaje-derecha"
  | "pasaje-ala-izquierda"
  | "pasaje-ala-derecha";

/** Si es una vista de ventanilla del pasaje, también las de encima del ala. */
export function esDePasaje(modo: CameraMode): modo is VistaDePasaje {
  return VISTAS_DE_PASAJE.includes(modo);
}

/** Si es una de las dos de encima del ala. */
export function esSobreElAla(modo: CameraMode): modo is "pasaje-ala-izquierda" | "pasaje-ala-derecha" {
  return modo === "pasaje-ala-izquierda" || modo === "pasaje-ala-derecha";
}

/** De qué lado mira una vista de pasaje. */
export function ladoDelPasaje(modo: VistaDePasaje): "izquierda" | "derecha" {
  return modo.endsWith("izquierda") ? "izquierda" : "derecha";
}

/** La vista de pasaje de un lado, de la misma fila que `como`. */
export function vistaDePasaje(lado: "izquierda" | "derecha", como: CameraMode): VistaDePasaje {
  return esSobreElAla(como) ? `pasaje-ala-${lado}` : `pasaje-${lado}`;
}

/**
 * **Las vistas que tiene este avión**, en el orden de la tecla.
 *
 * Las del pasaje, solo si hay pasaje que mirar: en una avioneta quien va
 * detrás va en la cabina, y ofrecer una ventanilla de pasaje sería enseñar un
 * avión que no es. Ver `world/asiento-de-pasaje.ts`.
 *
 * Y las de encima del ala, solo en el que lleva frenos de tierra que mirar
 * —`sobreElAla`—: en los demás serían la misma ventanilla otra vez.
 */
export function vistasDe(conPasaje: boolean, sobreElAla = false): readonly CameraMode[] {
  return CAMERA_MODES.filter(
    (m) => !esDePasaje(m) || (conPasaje && (!esSobreElAla(m) || sobreElAla)),
  );
}

/** La que viene detrás de `actual` al pulsar la tecla. */
export function siguienteVista(
  actual: CameraMode,
  conPasaje: boolean,
  sobreElAla = false,
): CameraMode {
  const lista = vistasDe(conPasaje, sobreElAla);
  const i = lista.indexOf(actual);
  // Desde una que este avión no tiene —la de pasaje recordada de otro—, se
  // sigue desde donde caería en la lista entera.
  if (i < 0) {
    const j = CAMERA_MODES.indexOf(actual);
    return lista.find((m) => CAMERA_MODES.indexOf(m) > j) ?? lista[0] ?? "chase";
  }
  return lista[(i + 1) % lista.length] ?? "chase";
}

/**
 * Cómo se mira libre desde cada vista: girando la cabeza desde dentro o
 * dando la vuelta al avión desde fuera, y hasta dónde. Ver `mirada.ts`.
 */
export function comoSeMiraDesde(modo: CameraMode): { como: ComoSeMira; topes: Topes } {
  if (modo === "cockpit") return { como: "cabeza", topes: TOPES.cabina };
  if (modo === "pajaro") return { como: "cabeza", topes: TOPES.pajaro };
  if (esDePasaje(modo)) return { como: "cabeza", topes: TOPES.pasaje };
  return { como: "orbita", topes: TOPES.fuera };
}

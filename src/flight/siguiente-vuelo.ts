/**
 * **El vuelo siguiente**: adónde se podría ir después desde donde se acaba.
 *
 * Pedido así, con la dirección que Enrique dio para todo el juego: «que el
 * juego se sienta juego y que el usuario se quiera quedar, que el avión lo
 * lleve de la mano a seguir y seguir». Un vuelo que acaba en La Gomera no
 * acaba en una pantalla con una flecha de volver a empezar en El Hierro: acaba
 * en un aeropuerto del que salen otras rutas, y eso es lo que se ofrece.
 *
 * ## Lo que se ofrece es de verdad
 *
 * - **Una ruta que sale de aquí**: la de los destinos de este campo, la misma
 *   lista que da el hangar. Ver `destinosDe` en `world/scenarios.ts`.
 * - **A la que este avión llega**: la pista de allí le cabe. Un avión que no
 *   cabe en un campo no se ofrece en ningún camino de entrada, y este es uno.
 *   Ver `destinosParaEsteAvion` en `cabe.ts`.
 *
 * ## Y es una invitación
 *
 * Una sola propuesta, sin rachas, sin cuenta atrás y sin nada que se pierda
 * por no seguir: quien prefiere volver a empezar, o irse al hangar, tiene sus
 * botones al lado como siempre.
 *
 * ## Diversidad, con su orden
 *
 * Primero, **no volver por donde se vino** mientras haya otra ruta: de El
 * Hierro a La Gomera, lo que se ofrece es seguir hacia Tenerife, que es lo que
 * hace de verdad un avión de las islas; la vuelta es el último recurso. Entre
 * las que quedan manda la ruta y la hora —la misma llegada por la mañana y
 * por la tarde no propone lo mismo— y nunca lo mismo que la última vez que
 * se acabó aquí, que se recuerda en el navegador como el producto del servicio:
 * una preferencia del juego, no un dato de nadie.
 *
 * Sin three.js ni audio, para poder comprobarlo sin navegador.
 */

import type { Scenario } from "../world/scenarios";
import { destinosDe } from "../world/scenarios";
import type { AircraftConfig } from "./aircraft";
import { destinosParaEsteAvion } from "./cabe";

/** Lo que hace falta saber para proponer el vuelo siguiente. */
export interface ParaElSiguiente {
  /** El campo donde acabó el vuelo. */
  readonly aqui: Scenario;
  /** De dónde salió este vuelo, o `null` si no se sabe. */
  readonly vinoDe: string | null;
  readonly avion: AircraftConfig;
  /** Todos los escenarios, para encontrar los destinos por su nombre. */
  readonly escenarios: readonly Scenario[];
  /** La hora solar de aquí, 0–24. */
  readonly hora: number;
  /** Lo que se propuso la última vez que se acabó aquí, o `null`. */
  readonly ultimo: string | null;
}

/**
 * **Cada cuántas horas cambia la propuesta** a igualdad de todo lo demás.
 * Tres: la mañana, el mediodía, la tarde y la noche no proponen lo mismo.
 */
export const HORAS_POR_TURNO = 3;

/** Un número estable para una cadena: la misma ruta y hora, la misma cuenta. */
function huella(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Los destinos que salen de aquí y a los que este avión llega. */
export function rutasDesdeAqui(p: Omit<ParaElSiguiente, "hora" | "ultimo" | "vinoDe">): Scenario[] {
  const de = destinosDe(p.aqui)
    .filter((id) => id !== p.aqui.id)
    .map((id) => p.escenarios.find((e) => e.id === id))
    .filter((e): e is Scenario => e !== undefined && !!e.aerodrome);
  return [...destinosParaEsteAvion(p.avion, de)];
}

/**
 * **El vuelo que se propone desde aquí**, o `null` si de aquí no sale ninguna
 * ruta para este avión.
 */
export function elSiguienteVuelo(p: ParaElSiguiente): Scenario | null {
  const todas = rutasDesdeAqui(p);
  if (todas.length === 0) return null;
  const sinVolver = todas.filter((e) => e.id !== p.vinoDe);
  const hay = sinVolver.length ? sinVolver : todas;
  const sinRepetir = hay.length > 1 ? hay.filter((e) => e.id !== p.ultimo) : hay;
  const turno = Math.floor((((p.hora % 24) + 24) % 24) / HORAS_POR_TURNO);
  const i = huella(`${p.vinoDe ?? ""}>${p.aqui.id}@${turno}`) % sinRepetir.length;
  return sinRepetir[i] ?? null;
}

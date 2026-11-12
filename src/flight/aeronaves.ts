/**
 * **Todo lo que se vuela**: los aviones y el helicóptero, por número.
 *
 * `AIRCRAFT` son los de ala fija, y así se quedan: es la lista que recorren
 * las lecciones, los ejercicios, la cuenta de la pista que pide cada uno y
 * los bancos de prestaciones, y nada de eso es de un helicóptero. Lo que
 * elige con qué se vuela —el hangar, el arranque y la tecla de cambiar— mira
 * esta, que es la flota entera tal como la recorre quien juega: de pequeño a
 * grande, con el JAZ 70 Kirikiri'i entre el 60 y el 90.
 *
 * Y la regla de dónde se ofrece cada uno vive aquí y no en tres sitios: un
 * avión, donde cabe su pista (`cabeEn`); el helicóptero, donde tiene su
 * helipuerto, que hoy es Tenerife Norte. **Cada aparato va solo donde puede
 * ir.**
 */

import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { cabeEn, campoDe, elQueQuepa } from "./cabe";
import { modeloPorId } from "./flota";
import {
  ESCENARIO_DEL_HELICOPTERO,
  esHelicoptero,
  SUPER_PUMA_EN_EL_JUEGO,
} from "./helicoptero-en-el-juego";
import type { Scenario } from "../world/scenarios";

const numeroDe = (a: AircraftConfig): number => modeloPorId(a.id)?.numero ?? 0;

/** Los aviones y el helicóptero, por número, que es por tamaño. */
export const AERONAVES: readonly AircraftConfig[] = [...AIRCRAFT, SUPER_PUMA_EN_EL_JUEGO].sort(
  (a, b) => numeroDe(a) - numeroDe(b),
);

/** La aeronave con ese identificador, sea avión o helicóptero. */
export function aeronavePorId(id: string | null | undefined): AircraftConfig | undefined {
  return id ? AERONAVES.find((a) => a.id === id) : undefined;
}

/**
 * **Si esta aeronave se ofrece en este sitio.** Un avión, si cabe en su pista;
 * el helicóptero, si es el campo de su helipuerto. Un helicóptero no necesita
 * pista, pero sí un sitio de donde salir con su gente y su mantenimiento: el
 * del juego es el del batallón de helicópteros del Ejército en Los Rodeos.
 * Ver `ESCENARIO_DEL_HELICOPTERO`.
 */
export function seVuelaEn(a: AircraftConfig, sitio: Scenario): boolean {
  if (esHelicoptero(a)) return sitio.id === ESCENARIO_DEL_HELICOPTERO;
  return cabeEn(a, campoDe(sitio)).cabe;
}

/**
 * **La que se vuela de verdad en ese sitio**: la pedida si se ofrece allí. Si
 * no, un avión que quepa: el mayor de los que caben, como siempre; o, si lo
 * pedido era el helicóptero fuera de su campo, el avión de `respaldo` —el
 * último que se eligió— o el mayor que quepa en su lugar. Ver `elQueQuepa`.
 */
export function laQueSeVuelaEn(
  pedida: AircraftConfig,
  sitio: Scenario,
  respaldo: AircraftConfig = AIRCRAFT[0]!,
): AircraftConfig {
  if (esHelicoptero(pedida))
    return seVuelaEn(pedida, sitio) ? pedida : elQueQuepa(respaldo, campoDe(sitio), AIRCRAFT);
  return elQueQuepa(pedida, campoDe(sitio), AIRCRAFT);
}

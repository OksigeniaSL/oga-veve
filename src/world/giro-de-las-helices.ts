/**
 * **Hacia dónde gira cada hélice en el dibujo.**
 *
 * Giraban todas a la izquierda vistas desde el asiento, y las de la flota
 * giran a la derecha: es el giro «convencional», el de los motores de su
 * clase —«conventional, clockwise rotation as viewed from the pilot's seat»
 * (FAA, *Airplane Flying Handbook*, FAA-H-8083-3C, p. 13-23)—. Y el bimotor de
 * pistón, de la clase del Seneca II, lleva la de la derecha al revés: un
 * Continental LTSIO-360, que gira «counterclockwise» visto desde atrás
 * (Continental, *TSIO-360 Series Engine Operator's Manual*, X30583, sección
 * II). Ver `helicesContrarrotativas` en la ficha.
 *
 * El eje de cada hélice del dibujo mira a la cola —la Z positiva; el morro va
 * en la negativa—, así que girarla en positivo es girarla a la izquierda vista
 * desde el asiento. De ahí el signo.
 */

import type { AircraftConfig } from "../flight/aircraft";

/**
 * El signo con el que se gira la hélice que está en `x`, m a lo ancho del
 * avión —negativo a la izquierda—: `-1` a la derecha vista desde el asiento.
 */
export function signoDelGiro(
  a: Pick<AircraftConfig, "helicesContrarrotativas">,
  x: number,
): 1 | -1 {
  return a.helicesContrarrotativas && x > 0 ? 1 : -1;
}

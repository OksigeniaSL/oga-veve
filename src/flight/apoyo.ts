/**
 * **Dónde apoya el avión en el suelo**: a qué altura va su centro de gravedad
 * con las ruedas principales en la pista y el morro donde esté.
 *
 * El modelo de vuelo mantenía el centro de gravedad a `gearHeight` del suelo
 * fuera cual fuera el cabeceo, y el avión gira sobre ese centro. Con el morro a
 * nivel da igual; al rotar, no: las ruedas principales van por detrás del
 * centro, así que al levantar el morro bajaban, y se metían en el asfalto lo
 * que el morro subía por su distancia. En el tope de cola de cada uno: el 787 a
 * sus 9,7°, 0,38 m, medido en el juego; el 747 a sus 12,5°, 0,77 sobre su
 * dibujo colocado como lo coloca el juego, porque apoya en el bogie de la
 * panza, cuatro metros por detrás.
 *
 * Un avión de verdad hace lo contrario: las ruedas se quedan en la pista, giran
 * sobre su eje, y es **el centro de gravedad el que sube**. Por eso un avión
 * largo pega la cola: no es que baje, es que gira sobre un punto que tiene
 * muy cerca.
 *
 * Con la pata de morro comprimiéndose, morro abajo, la cuenta es la misma: las
 * principales siguen en el suelo y es la de morro la que se hunde en su
 * amortiguador. Ver `minGroundPitch`.
 */
import type { AircraftConfig } from "./aircraft";

/**
 * La altura del centro de gravedad sobre el suelo con las ruedas principales
 * apoyadas y el morro a `cabeceo` (rad, positivo arriba), m.
 *
 * El eje de esas ruedas va `gearHeight` por debajo del centro y
 * `mainWheelsAft` por detrás; girado el avión, esos dos brazos suben el
 * centro `gearHeight·cos θ + mainWheelsAft·sen θ` por encima del punto en
 * el que tocan. A nivel es `gearHeight`, como siempre.
 *
 * Se mide desde el punto que toca con el avión nivelado, y no desde el eje con
 * el radio de la rueda, que es lo exacto: la diferencia es el radio por
 * `1 − cos θ`, un centímetro con la rueda de un 787 en su tope.
 */
export function alturaSobreLasRuedas(
  ac: Pick<AircraftConfig, "gearHeight" | "mainWheelsAft">,
  cabeceo: number,
): number {
  return ac.gearHeight * Math.cos(cabeceo) + ac.mainWheelsAft * Math.sin(cabeceo);
}

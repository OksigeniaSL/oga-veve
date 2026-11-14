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
 *
 * Y en el de rueda de cola, al revés: sus principales van **por delante** del
 * centro —`mainWheelsAft` negativo—, así que al bajar la cola el centro baja,
 * y en tres puntos va más cerca del suelo que con la cola arriba.
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

/**
 * **El brazo con el que el peso que cargan las principales hace girar el
 * avión**, m: lo que va por detrás del centro de gravedad el punto en el que
 * tocan, medido en horizontal con el morro a `cabeceo`. Positivo detrás —el
 * triciclo, morro abajo—; negativo delante —el de rueda de cola, morro
 * arriba—. Ver `momentoDelTren` en `fdm.ts`.
 *
 * Es el centro del tren principal, `mainGearAft`, y no el eje de atrás: el
 * peso se reparte por todas sus ruedas. Al levantar el morro, el punto que
 * toca se acerca a la vertical del centro un `gearHeight·sen θ`.
 */
export function brazoDelTren(
  ac: Pick<AircraftConfig, "gearHeight" | "mainWheelsAft" | "mainGearAft">,
  cabeceo: number,
): number {
  const d = ac.mainGearAft ?? ac.mainWheelsAft;
  return d * Math.cos(cabeceo) - ac.gearHeight * Math.sin(cabeceo);
}

/**
 * **La actitud con la que rueda el avión**, rad, en el modelo sencillo, que no
 * tiene momentos que la decidan. A nivel el triciclo; el de rueda de cola, en
 * tres puntos parado y con la cola levantándose según corre.
 *
 * La cola sube entre un tercio y dos tercios de su Vr, que es lo que hace en
 * el modelo de coeficientes con el piloto del banco empujando la palanca
 * hasta que se levanta: ver `rueda-de-cola.test.ts`. Así se ve igual en los
 * dos peldaños.
 */
export function actitudEnTierra(
  ac: Pick<AircraftConfig, "actitudEnTresPuntos" | "rotationSpeed">,
  velocidad: number,
): number {
  const tresPuntos = ac.actitudEnTresPuntos;
  if (tresPuntos === undefined) return 0;
  const t = Math.min(1, Math.max(0, (velocidad / ac.rotationSpeed - COLA_EMPIEZA) / (COLA_ARRIBA - COLA_EMPIEZA)));
  return tresPuntos * (1 - t * t * (3 - 2 * t));
}

/** Por encima de esta fracción de la Vr empieza a subir la cola. */
export const COLA_EMPIEZA = 0.7;
/** Y a esta fracción ya va arriba. */
export const COLA_ARRIBA = 0.85;

/**
 * **Lo que hace con la palanca quien rueda un avión de rueda de cola**, de −1
 * a 1: llevarlo a la actitud de `actitudEnTierra` —la cola abajo despacio,
 * arriba según corre— con el cabeceo y el ritmo de ahora (rad, rad/s). Cero
 * en un triciclo, que rueda con la palanca suelta.
 *
 * Es el piloto de los bancos de mesa, que despegan y frenan el avión en el
 * modelo de coeficientes para compararlo con la cuenta del hangar: la cuenta
 * rueda con `actitudEnTierra`, y el avión volado tiene que rodar igual.
 */
export function palancaParaRodar(
  ac: Pick<AircraftConfig, "actitudEnTresPuntos" | "rotationSpeed">,
  velocidad: number,
  cabeceo: number,
  ritmo: number,
): number {
  if (ac.actitudEnTresPuntos === undefined) return 0;
  const quiere = actitudEnTierra(ac, velocidad);
  return Math.max(-1, Math.min(1, (quiere - cabeceo) * 40 - ritmo * 4));
}

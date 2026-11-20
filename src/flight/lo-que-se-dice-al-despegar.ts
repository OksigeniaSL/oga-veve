/**
 * **Lo que se dice en el despegue de cada tipo**: «ya despegamos: seguí»
 * donde de verdad ya se sigue, y en ningún otro sitio.
 *
 * El destello de V1 sale en todos los aviones, que así se pidió (ver
 * `hud.ts`): marca un momento, como el de un aro. Lo que se **dice** en ese
 * momento tiene que ser verdad en el avión que lo oye, y la frase cuenta una
 * decisión ya tomada —«pase lo que pase, se vuela»—. Esa decisión no está en
 * el mismo sitio en todos:
 *
 * - **Los multimotores de turbina** la toman en V1, que su manual calcula
 *   para cada despegue: antes se para, después se sigue con un motor. Ahí se
 *   dice, como siempre. Ver `conV1` en `decide-con-v1.ts`.
 * - **Los monomotores no la tienen.** No hay otro motor con el que seguir: si
 *   el suyo falla rodando se para, y recién despegado se aterriza más o menos
 *   recto por delante (Cessna 172S, manual de vuelo, sección 3: *Engine
 *   Failure During Takeoff Roll* —gas al ralentí y frenos— y *Engine Failure
 *   Immediately After Takeoff* —«Land STRAIGHT AHEAD»—). V1 es una velocidad
 *   de la norma de transporte (14 CFR 1.2 y 25.107; CS-25.107), y su manual
 *   no la lleva. En el despegue de una avioneta se canta la Vr y nada más.
 * - **El bimotor de pistón no la tiene en V1.** Su V1 del juego es su Vmc,
 *   66 nudos, y a esa velocidad su manual manda parar: «If engine failure
 *   occurs during takeoff and 85 KIAS has not been attained: Throttles —
 *   CLOSE both immediately. Stop straight ahead», y por encima de 85 con el
 *   tren todavía fuera, parar si queda pista (Piper, PA-34-220T Seneca III,
 *   VB-1110, sección 3). La FAA lo dice con el tren: «if the landing gear has
 *   not been selected up, the takeoff should be rejected, even if airborne»
 *   (FAA-H-8083-3C, p. 13-12). Así que en él la decisión se toma **con el tren
 *   pedido arriba, en el aire y a 85 nudos o más**, y es entonces cuando se
 *   dice. Los 85 son además la velocidad mínima a la que su manual deja parar
 *   un motor a propósito y la que pide sostener al asegurarlo («Maintain
 *   direction and airspeed above 85 KIAS», *Engine Securing Procedure*).
 *
 * Lo dice la instructora, en los peldaños de abajo. En el de cabina no se
 * canta nada: la tripulación de un Seneca no tiene canto para eso —ya ha
 * dicho «positive rate, gear up»— y uno inventado habría que desaprenderlo.
 * Ver el ADR 0014, enmienda H37i.
 */

import type { AircraftConfig } from "./aircraft";
import { conV1 } from "./decide-con-v1";

/** Un nudo, en m/s. */
const NUDO = 0.514444;

/**
 * **La velocidad desde la que el bimotor de pistón ya sigue**, m/s indicados:
 * 85 nudos, la de su manual. Por debajo, con el tren fuera, se para. Ver la
 * cabecera.
 */
export const SIGUE_DESDE = 85 * NUDO;

/**
 * **Hasta qué altura sobre el campo es todavía la salida**, m: mil
 * quinientos pies. Quien mete el tren más arriba ya no está despegando, y
 * «ya despegamos» dicho entonces llega tarde: un aviso que ya no puede sonar
 * a su altura no se dice.
 */
export const SE_DICE_HASTA = 1500 * 0.3048;

type ElTipo = Pick<AircraftConfig, "motores" | "sound">;

/** Si en V1 se dice «ya despegamos: seguí»: solo donde su manual decide con ella. */
export const seSigueEnV1 = (a: ElTipo): boolean => conV1(a);

/**
 * Si este avión dice «ya despegamos: seguí» al meter el tren, y no en V1: el
 * bimotor de pistón. Ver la cabecera.
 */
export const seSigueConElTren = (a: ElTipo): boolean => a.motores > 1 && !conV1(a);

/** Cómo va la salida, lo que hace falta mirar. Todo en m y m/s. */
export interface ComoVaLaSalida {
  readonly enElAire: boolean;
  /** Si el tren está pedido arriba, haya llegado o no. */
  readonly trenPedidoArriba: boolean;
  readonly indicada: number;
  readonly sobreElCampo: number;
}

/**
 * **Si ya se sigue**: en el bimotor de pistón, en el aire, con el tren pedido
 * arriba, a su velocidad y todavía en la salida. Una vez por despegue: quien
 * llama lleva la cuenta.
 */
export function yaSeSigue(a: ElTipo, l: ComoVaLaSalida): boolean {
  return (
    seSigueConElTren(a) &&
    l.enElAire &&
    l.trenPedidoArriba &&
    l.indicada >= SIGUE_DESDE &&
    l.sobreElCampo <= SE_DICE_HASTA
  );
}

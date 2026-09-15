/**
 * Los dos topes de velocidad de un avión, y el punto donde se relevan.
 *
 * Sale de medir la flota contra el modelo de coeficientes buscando otra cosa:
 * **ningún avión del juego tenía velocidad máxima**. El empuje pelea contra la
 * resistencia y donde se cruzan, ahí se queda; en un avión limpio con motores
 * de sobra eso cae muy por encima de donde se rompe. Medido en vuelo nivelado a
 * tope de gas, sin asistencia: el JAZ 90 daba **1.054 km/h a quinientos
 * metros**, o sea Mach 0,86 a ras de suelo, con una presión dinámica que no
 * aguanta ningún fuselaje de esa clase. El avión no se rompía porque el juego
 * no sabía que eso se rompe.
 *
 * ## Por qué son dos y no uno
 *
 * - **Vmo** es la velocidad **indicada** máxima, y es un límite de
 *   **estructura**: lo que aguanta el fuselaje es presión dinámica, y la
 *   presión dinámica es justo lo que mide el anemómetro. Manda **abajo**, donde
 *   el aire es denso.
 * - **Mmo** es el Mach máximo, y es un límite **aerodinámico**: por encima de
 *   él el aire empieza a comprimirse sobre el ala y el avión hace cosas feas.
 *   Manda **arriba**, donde el aire es frío y la velocidad del sonido baja.
 *
 * Y de los dos juntos sale una de las cosas bonitas de la aviación, que además
 * se puede enseñar sin una palabra: **subiendo, el límite cambia de dueño**.
 * Abajo te frena la estructura; arriba, el aire. En medio hay una altura donde
 * los dos coinciden, y esa altura es de cada avión.
 */

import type { AircraftConfig } from "./aircraft";
import { airDensity, SEA_LEVEL_DENSITY } from "./atmosphere";

/** Un nudo en metros por segundo. */
export const NUDO = 0.514444;

/**
 * La velocidad del sonido a esa altura, m/s.
 *
 * Baja con la temperatura, no con la presión: a once kilómetros el aire está a
 * cincuenta y seis bajo cero y el sonido va a 295 m/s contra los 340 de abajo.
 * Es exactamente por eso por lo que el Mach manda arriba — el mismo avión a la
 * misma velocidad real está más cerca de Mach uno cuanto más alto va.
 */
export function velocidadDelSonido(alturaM: number): number {
  // Troposfera ISA: 15 °C abajo y seis grados y medio menos por kilómetro.
  const tempK = 288.15 - 0.0065 * Math.max(0, Math.min(alturaM, 11000));
  return 20.0468 * Math.sqrt(tempK);
}

/** La velocidad real que corresponde a esa indicada a esa altura, m/s. */
export function verdaderaDesdeIndicada(
  indicada: number,
  alturaM: number,
): number {
  return indicada / Math.sqrt(airDensity(alturaM) / SEA_LEVEL_DENSITY);
}

/** A qué Mach va un avión que lleva esa velocidad real a esa altura. */
export function machDe(verdadera: number, alturaM: number): number {
  return verdadera / velocidadDelSonido(alturaM);
}

/** Cuál de los dos topes manda a esa altura. */
export type QuienManda = "estructura" | "aire";

/**
 * El tope de velocidad **real** de este avión a esa altura, m/s, y quién lo
 * pone.
 *
 * Es el menor de los dos, que es la definición de los dos topes: por debajo del
 * cruce manda Vmo y por encima manda Mmo. Devuelve también cuál para poder
 * enseñarlo — el cartel de sobrevelocidad no dice lo mismo si te frena la
 * estructura que si te frena el aire.
 */
export function topeDeVelocidad(
  a: AircraftConfig,
  alturaM: number,
): { verdadera: number; manda: QuienManda } {
  const porEstructura = verdaderaDesdeIndicada(a.vmoKt * NUDO, alturaM);
  const porElAire = a.mmo * velocidadDelSonido(alturaM);
  return porEstructura <= porElAire
    ? { verdadera: porEstructura, manda: "estructura" }
    : { verdadera: porElAire, manda: "aire" };
}

/**
 * La altura a la que los dos topes valen lo mismo, m.
 *
 * Es el número que un piloto de línea se sabe de memoria de su avión, y en este
 * juego es lo que hace que el cartel cambie de dibujo a media subida sin que
 * nadie lo anuncie. Se busca partiendo el intervalo porque la ecuación no se
 * despeja bonito —densidad y temperatura van con exponentes distintos— y
 * partir once kilómetros en cuarenta pasos da el metro.
 *
 * `null` si no se cruzan dentro de la troposfera: le pasa a los aviones lentos,
 * donde la estructura manda de arriba abajo y el Mach no llega a importar
 * nunca. Eso también es verdad y hay que poder decirlo.
 */
export function alturaDelCruce(a: AircraftConfig): number | null {
  const gana = (h: number): QuienManda => topeDeVelocidad(a, h).manda;
  if (gana(0) === gana(11000)) return null;
  let bajo = 0;
  let alto = 11000;
  for (let i = 0; i < 40; i++) {
    const medio = (bajo + alto) / 2;
    if (gana(medio) === gana(0)) bajo = medio;
    else alto = medio;
  }
  return Math.round((bajo + alto) / 2);
}

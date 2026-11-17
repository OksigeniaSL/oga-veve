/**
 * Las pistas de este vuelo: la de casa y la del sitio al que se va.
 *
 * Todo el juego preguntaba «¿estoy sobre la pista?» mirando **una**, la del
 * escenario. Mientras solo había un aeropuerto por mundo eso era exacto. Desde
 * que se puede volar a otro, es falso de la peor manera:
 *
 * > «No me dejó aterrizar, tomé tierra con estos parámetros y "se rompió", no
 * > lo considera un aterrizaje.»
 *
 * Tomó tierra en la pista de Tenerife Sur, que existe, está dibujada y tiene
 * sus luces encendidas — y el juego, que solo sabía de la de Tenerife Norte,
 * dictaminó «fuera de pista» y rompió el avión. Aterrizar bien no puede ser un
 * percance.
 *
 * Aquí no hay física ni escena: son rectángulos y un punto. Por eso se puede
 * comprobar sin volar, que es lo que hacía falta para no volver a descubrir
 * esto aterrizando.
 */

import { finDeLaZonaDeToma } from "../flight/toma-larga";
import { delante, enEjesDePista } from "./rumbo";
import {
  antesDelUmbralDeToma,
  hastaElUmbralDeToma,
  paraAterrizarDe,
  sobreDondeSeToca,
  vistaDesdeLaOtraCabecera,
} from "./umbral-desplazado";

/** Una pista en coordenadas del mundo en el que se está volando. */
export interface Pista {
  readonly x: number;
  readonly z: number;
  /** Rumbo **verdadero**, en grados. */
  readonly heading: number;
  readonly length: number;
  readonly width: number;
  /** Asfalto antes del umbral de aterrizaje en uso, m. Ver `umbral-desplazado.ts`. */
  readonly desplazado?: number;
  /** Y el de la otra punta. */
  readonly desplazadoEnfrente?: number;
  /**
   * Si la pista para aterrizar acaba en el umbral de enfrente, y lo mismo por
   * la otra punta. Ver `umbrales-publicados.ts`.
   */
  readonly acabaEnElOtroUmbral?: boolean;
  readonly acabaEnElOtroUmbralEnfrente?: boolean;
}

/**
 * Si un punto cae sobre alguna de estas pistas, con el margen que se pida.
 *
 * `margen` se suma a lo largo —la franja de antes del umbral— y el ancho se
 * toma doble, que es lo que ya hacía la comprobación de siempre: la franja de
 * una pista es asfalto suyo a efectos de posarse.
 */
export function sobreAlguna(
  pistas: readonly Pista[],
  x: number,
  z: number,
  margen = 0,
): boolean {
  return pistas.some((r) => {
    const { along, across } = enEjesDePista(x, z, r.x, r.z, r.heading);
    return (
      Math.abs(across) < r.width && Math.abs(along) < r.length / 2 + margen
    );
  });
}

/**
 * Cuál de estas pistas es la de más cerca, o `null` si no hay ninguna.
 *
 * Sirve para saber **en cuál** se está aterrizando, que es distinto de si se
 * está sobre alguna: la torre que habla, el número que se canta y el sitio al
 * que se rueda después salen de ésta.
 */
export function laMasCerca(
  pistas: readonly Pista[],
  x: number,
  z: number,
): Pista | null {
  let mejor: Pista | null = null;
  let corto = Infinity;
  for (const r of pistas) {
    const d = Math.hypot(r.x - x, r.z - z);
    if (d < corto) {
      corto = d;
      mejor = r;
    }
  }
  return mejor;
}

// ── Dónde está el avión en la pista de ahora ────────────────────────────
//
// Cinco preguntas que `game.ts` hacía sobre la pista del campo de ahora, cada
// una con su `enEjesDePista` y su cuenta a mano dentro de un método que solo
// leía la posición y el rumbo. Son rectángulos y un punto, como lo de arriba,
// y se prueban igual: sin volar. Repaso del 12-09 de #30, corte 2. En todas,
// `x` y `z` son del mundo y `rumbo` es el del avión, en radianes, como lo da
// `FlightState.heading`.

/**
 * Cuánto antes de la pista se deja de avisar del terreno, m.
 *
 * Trescientos: el umbral se cruza a quince metros, y un avión que viene bien a
 * esa altura está, visto por el aviso de terreno, bajísimo. Esto es **solo**
 * para callar ese aviso; dónde se dice «ya podés tocar» no lleva margen. Ver
 * `sobreDondeSeToca`.
 */
export const ANTES_DEL_UMBRAL = 300;

/**
 * Cuánto se perdona de desvío lateral para seguir «sobre la pista», m.
 *
 * Cuarenta a cada lado del asfalto: quien cruza el umbral un poco descentrado
 * sigue aterrizando, no sobrevolando el campo.
 */
export const A_UN_LADO_DEL_EJE = 40;

/** El rumbo del avión en grados, que es como lo quieren las cuentas de la pista. */
function enGrados(rumbo: number): number {
  return (rumbo * 180) / Math.PI;
}

/**
 * Cuántos metros de pista quedan por delante, o infinito si no se está en
 * ella.
 *
 * Se mide **hacia donde apunta el avión**, no en línea recta al final: si
 * uno rueda hacia atrás por la pista, lo que queda es lo que tiene delante.
 * Y solo cuenta si está dentro del ancho, porque fuera de la pista no hay
 * pista que se acabe.
 */
export function pistaPorDelante(r: Pista, x: number, z: number, rumbo: number): number {
  const { along, across } = enEjesDePista(x, z, r.x, r.z, r.heading);
  if (Math.abs(across) > r.width) return Infinity;
  if (Math.abs(along) > r.length / 2) return Infinity;
  // Hacia dónde va el avión respecto al eje de la pista.
  const [fx, fz] = delante(enGrados(rumbo));
  const [rx, rz] = delante(r.heading);
  const hacia = fx * rx + fz * rz;
  return hacia >= 0 ? r.length / 2 - along : r.length / 2 + along;
}

/**
 * Si se está sobre la pista **con su margen**: cuarenta metros a cada lado
 * del asfalto y trescientos antes de cada punta. Es lo que mira el aviso de
 * terreno para callarse, que sobre asfalto no hay terreno que avisar.
 */
export function sobreLaPistaConMargen(r: Pista, x: number, z: number): boolean {
  const { along, across } = enEjesDePista(x, z, r.x, r.z, r.heading);
  return (
    Math.abs(across) < r.width / 2 + A_UN_LADO_DEL_EJE &&
    Math.abs(along) < r.length / 2 + ANTES_DEL_UMBRAL
  );
}

/**
 * Lo mismo, pero **donde se puede tocar**: del umbral de aterrizaje en
 * adelante, sin margen por delante.
 *
 * Contaba desde la barra pero con los trescientos metros de margen de
 * `sobreLaPistaConMargen`, así que en la 01 de Fuerteventura el «ya podés
 * tocar» seguía saliendo sobre los últimos trescientos metros de flechas —el
 * único sitio de la pista donde no se puede—. Ver `sobreDondeSeToca`.
 */
export function sobreLaZonaDeToma(r: Pista, x: number, z: number, rumbo: number): boolean {
  const { along, across } = enEjesDePista(x, z, r.x, r.z, r.heading);
  return (
    Math.abs(across) < r.width / 2 + A_UN_LADO_DEL_EJE &&
    sobreDondeSeToca(r, along, enGrados(rumbo))
  );
}

/**
 * Cuánto se adelanta, como mucho, «ya podés tocar» al umbral de aterrizaje, s.
 * Ver `llegandoALaZonaDeToma`.
 *
 * Segundo y medio: lo que necesita una tarjeta para verse antes de que la tape
 * la de la recogida, que en un reactor sale a treinta pies.
 */
export const LA_TOMA_SE_ADELANTA = 1.5;

/** Lo que sale de la cuenta de la llegada, para `llegandoALaZonaDeToma`. */
export interface Llegada {
  /** Velocidad sobre el suelo, m/s. */
  readonly suelo: number;
  /** Altura de las ruedas sobre la cota de la pista, m. */
  readonly ruedas: number;
  /** Lo que se baja, m/s, positivo bajando. */
  readonly bajando: number;
}

/**
 * **Donde se puede tocar, o a punto de llegar a ella sin poder tocar antes.**
 * Es lo que mira «ya podés tocar»; ver `puedeTocar` en `game.ts`.
 *
 * Sobre la zona de toma, sí, que es lo de siempre. Y también **justo antes del
 * umbral**, a menos de `LA_TOMA_SE_ADELANTA` de cruzarlo, si bajando como se
 * baja —y aun bajando el doble— las ruedas llegan al suelo pasado el umbral:
 * dicho ahí sigue siendo verdad, porque desde ahí ya no se puede tocar antes.
 *
 * Hacía falta porque **cruzar el umbral bajo junta las dos tarjetas**. Sin
 * margen, «ya podés tocar» salía al cruzarlo, y quien lo cruza a la altura de
 * la recogida tiene la tarjeta de la nariz encima en el mismo instante: medido
 * en el vuelo entero del JAZ 90 en Los Rodeos (H29d, antes del arreglo de la
 * torre), la de tocar se decidió a los 12 m sobre el umbral, que son los
 * treinta pies de ruedas a los que ese avión pide la recogida, y la de la
 * nariz la tapó en el paso siguiente. El banco no llegó a verla, y jugando
 * habría durado lo que se tarda en bajar de una altura a la otra: décimas.
 * Cruzándolo a los quince metros de la senda sale como siempre, en el umbral.
 *
 * Lo que **no** vuelve es el margen de trescientos metros: con él, en la 01
 * de Fuerteventura salía sobre las flechas, donde se podía tocar antes del
 * umbral. Aquí se adelanta por tiempo y solo si no da para tocar antes. Ver
 * `sobreLaZonaDeToma`.
 */
export function llegandoALaZonaDeToma(
  r: Pista,
  x: number,
  z: number,
  rumbo: number,
  llegada: Llegada,
): boolean {
  if (sobreLaZonaDeToma(r, x, z, rumbo)) return true;
  const { across } = enEjesDePista(x, z, r.x, r.z, r.heading);
  if (Math.abs(across) >= r.width / 2 + A_UN_LADO_DEL_EJE) return false;
  const d = dondeSeToca(r, x, z, rumbo);
  if (!d || d.pasado >= 0) return false;
  const hastaElUmbral = -d.pasado / Math.max(llegada.suelo, 1);
  if (hastaElUmbral > LA_TOMA_SE_ADELANTA) return false;
  const hastaElSuelo = llegada.ruedas / Math.max(2 * llegada.bajando, 0.01);
  return hastaElSuelo > hastaElUmbral;
}

/**
 * **Dónde está el avión en la pista**, por la cabecera por la que se llega:
 * lo pasado de su umbral de aterrizaje y dónde acaba su zona de toma, m.
 * `null` fuera de la pista. Es lo que hace larga una toma: ver `Aterrizaje`.
 */
export function dondeSeToca(
  r: Pista,
  x: number,
  z: number,
  rumbo: number,
): { readonly pasado: number; readonly zona: number } | null {
  const { along, across } = enEjesDePista(x, z, r.x, r.z, r.heading);
  if (Math.abs(across) > r.width) return null;
  const deFrente = Math.cos(rumbo - (r.heading * Math.PI) / 180) >= 0;
  const pista = deFrente ? r : vistaDesdeLaOtraCabecera(r);
  return {
    pasado: (deFrente ? along : -along) + hastaElUmbralDeToma(pista),
    zona: finDeLaZonaDeToma(paraAterrizarDe(pista)),
  };
}

/**
 * Si las ruedas están en la pista **antes de su umbral de aterrizaje**, en
 * la zona de las flechas. Es lo que convierte una toma en «corta». Ver
 * `Aterrizaje`.
 */
export function enLaZonaDeLasFlechas(r: Pista, x: number, z: number, rumbo: number): boolean {
  const { along, across } = enEjesDePista(x, z, r.x, r.z, r.heading);
  return Math.abs(across) < r.width && antesDelUmbralDeToma(r, along, enGrados(rumbo));
}

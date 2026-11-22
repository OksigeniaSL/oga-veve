/**
 * **El motor tarda lo que tarda**: la inercia del empuje.
 *
 * Hasta aquí el empuje seguía al gas en el mismo paso. En una avioneta eso es
 * casi verdad —un motor de pistón responde a la mariposa en lo que tarda la
 * mezcla en llegar al cilindro—, pero un reactor no: para dar empuje tiene que
 * acelerar sus compresores, y para no ahogarse —entrar en *surge*— el regulador
 * le mete el combustible poco a poco. La norma de certificación le deja hasta
 * cinco segundos para pasar del ralentí de vuelo al 95 % del empuje de
 * despegue (14 CFR 33.73(b); CS-E 745). Por eso en la final de un avión de
 * línea el gas no se quita antes de tiempo, y por eso una frustrada empieza con
 * unos segundos en los que el avión todavía no empuja. Quien aprendiera aquí
 * que el reactor responde al instante tendría que desaprenderlo.
 *
 * **La forma también es la de verdad: lenta al principio y rápida al final.**
 * Se cuenta en las vueltas, que es lo que acelera, con dos etapas en fila —el
 * núcleo, que sigue a la palanca, y el fan o la hélice, que sigue al núcleo—:
 * la subida arranca sin pendiente, como la de un motor de turbina, y en el
 * turbofán el empuje va además con la potencia 2,5 de las vueltas (ver
 * `vueltasDelMotor`), así que los dos primeros segundos casi no empujan y los
 * dos últimos dan casi todo. En el turbohélice la cuenta es la misma con el
 * empuje en proporción a las vueltas, que es como las cuenta el juego.
 *
 * **Y lo que tarda sale de la ficha de cada avión** (`respuestaDelMotor`), no
 * de una constante para todos: un JT9D de los setenta no es un GEnx, un PT6 no
 * es un turbofán y un pistón responde ya. Lo que dice cada número y de dónde
 * sale está en su ficha y en el ADR 0034.
 *
 * Aquí está la cuenta sin three.js, para poder comprobarla; quien la usa es
 * `fdm.ts`, en cada paso.
 */

import type { AircraftConfig, AircraftSound } from "./aircraft";

/**
 * **Cuánto tarda el motor**, s, con la palanca movida de golpe de un extremo
 * al otro. Cero: al instante.
 */
export interface RespuestaDelMotor {
  /** Del ralentí al 95 % del empuje de despegue. */
  readonly subida: number;
  /** Del empuje de despegue a que le quede el 5 %. */
  readonly bajada: number;
}

/** La respuesta de un motor de pistón: la del gas. */
export const AL_INSTANTE: RespuestaDelMotor = { subida: 0, bajada: 0 };

/**
 * **El exponente con que crece el empuje con las vueltas**: 2,5 en el
 * turbofán, el de `vueltasDelMotor`, y uno en los demás. Tiene que ser el
 * mismo que el de la aguja: si no, la aguja y el empuje dirían cosas
 * distintas.
 */
export function exponenteDelEmpuje(s: Pick<AircraftSound, "engine">): number {
  return s.engine === "turbofan" ? 2.5 : 1;
}

/** Cómo va el motor: las vueltas de sus dos etapas, de 0 (ralentí) a 1. */
export interface GiroDelMotor {
  /** La etapa que sigue a la palanca: el núcleo. */
  nucleo: number;
  /** La que sigue al núcleo y empuja: el fan o la hélice. */
  fan: number;
}

type Ficha = Pick<AircraftConfig, "respuestaDelMotor"> & {
  readonly sound: Pick<AircraftSound, "engine">;
};

const acotar01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Las vueltas que dan esta parte del empuje, de 0 a 1. */
function vueltasDe(a: Ficha, gas: number): number {
  return Math.pow(acotar01(gas), 1 / exponenteDelEmpuje(a.sound));
}

/** **Un motor ya asentado en este gas**: lo que se coloca al empezar un vuelo. */
export function giroAsentado(a: Ficha, gas: number): GiroDelMotor {
  const v = vueltasDe(a, gas);
  return { nucleo: v, fan: v };
}

/**
 * **Cuántas constantes de tiempo tarda la segunda etapa en quedarse a
 * `queda` del final**: la `x` de `(1 + x)·e^(−x) = queda`, que es la
 * respuesta de dos etapas iguales en fila a un escalón. Por bisección: es
 * monótona y se pregunta una vez por avión.
 */
export function constantesHasta(queda: number): number {
  const q = Math.max(1e-9, Math.min(1 - 1e-9, queda));
  let lo = 0;
  let hi = 60;
  for (let i = 0; i < 80; i++) {
    const x = (lo + hi) / 2;
    if ((1 + x) * Math.exp(-x) > q) lo = x;
    else hi = x;
  }
  return (lo + hi) / 2;
}

/**
 * **Las constantes de tiempo de cada etapa**, s, subiendo y bajando, para que
 * el escalón entero tarde lo que dice la ficha. Se guardan por ficha: la cuenta
 * no cambia en vuelo.
 */
const constantes = new WeakMap<object, Map<number, { sube: number; baja: number }>>();
export function constantesDelMotor(a: Ficha): { sube: number; baja: number } {
  const r = a.respuestaDelMotor;
  const k = exponenteDelEmpuje(a.sound);
  let porExponente = constantes.get(r);
  if (!porExponente) constantes.set(r, (porExponente = new Map()));
  const hay = porExponente.get(k);
  if (hay) return hay;
  // Subiendo, del ralentí a las vueltas del 95 %; bajando, de las de despegue
  // a las del 5 %. Con la potencia 2,5 del fan, el 5 % del empuje son todavía
  // el 30 % de las vueltas: el empuje se va antes que el ruido.
  const sube = r.subida > 0 ? r.subida / constantesHasta(1 - Math.pow(0.95, 1 / k)) : 0;
  const baja = r.bajada > 0 ? r.bajada / constantesHasta(Math.pow(0.05, 1 / k)) : 0;
  const c = { sube, baja };
  porExponente.set(k, c);
  return c;
}

/** Una etapa que sigue a otra, exacta para cualquier paso: sin oscilar con un paso largo. */
function seguir(va: number, hacia: number, sube: number, baja: number, dt: number): number {
  const tau = hacia > va ? sube : baja;
  if (!(tau > 0)) return hacia;
  return hacia + (va - hacia) * Math.exp(-dt / tau);
}

/**
 * **Un paso del motor**: las dos etapas siguen al gas pedido, cada una con lo
 * que tarda subiendo o bajando. Cambia `giro`.
 */
export function avanzarGiro(giro: GiroDelMotor, a: Ficha, gas: number, dt: number): void {
  const { sube, baja } = constantesDelMotor(a);
  const pedido = vueltasDe(a, gas);
  giro.nucleo = seguir(giro.nucleo, pedido, sube, baja, dt);
  giro.fan = seguir(giro.fan, giro.nucleo, sube, baja, dt);
}

/**
 * **Lo que da el motor ahora**, como parte del empuje que daría con el gas a
 * fondo, de 0 a 1: el gas que tendría que estar puesto para que un motor sin
 * inercia diera lo mismo. Es lo que empuja, lo que suena y lo que marca la
 * aguja.
 */
export function gasQueDa(giro: GiroDelMotor, a: Ficha): number {
  return Math.pow(acotar01(giro.fan), exponenteDelEmpuje(a.sound));
}

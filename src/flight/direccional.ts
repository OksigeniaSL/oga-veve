/**
 * **El direccional que se va**: el giróscopo del panel de esferas, que no
 * está esclavizado a nada y se aparta solo del rumbo (#51, ADR 0031,
 * enmienda H26r).
 *
 * El issue lo pide en una línea: la brújula «que baila en los virajes, lo que
 * justifica el giróscopo y su ritual de resincronizar cada diez minutos». La
 * brújula ya baila (`flight/brujula.ts`). Esto es la otra mitad: **el
 * giróscopo no siente el viraje, pero tampoco sabe dónde está el norte**. Se
 * pone con la brújula antes de salir y desde ahí se aparta poco a poco, por
 * dos motivos que suman:
 *
 * - **La Tierra gira debajo de él.** Un giróscopo libre se queda quieto en el
 *   espacio, y el suelo gira 15,04° por hora; lo que se nota en el plano del
 *   horizonte es esa vuelta por el seno de la latitud. **En el hemisferio
 *   norte el número del direccional baja** —el eje se va hacia el este
 *   respecto al norte de aquí, y el morro se lee contra él—, y **en el sur
 *   sube**: es la misma cuenta con el seno negativo. En Tenerife Norte son
 *   unos 7° por hora; en Asunción, unos 6 hacia el otro lado.
 * - **El rozamiento de sus cojinetes** lo tuerce (precesión), y eso depende
 *   de cada instrumento: cuánto y hacia dónde. Aquí cada modelo de avión
 *   lleva el suyo, fijo, entre medio grado y dos por hora (`friccionDe`), para
 *   que el total quede dentro de lo que se acepta en un instrumento sano.
 *
 * ## De dónde salen los números
 *
 * - **La vuelta de la Tierra**, 15,041° por hora (el día sidéreo), por el seno
 *   de la latitud: la «deriva aparente» de cualquier libro de giróscopos, y la
 *   del *Pilot's Handbook of Aeronautical Knowledge* de la FAA
 *   (FAA-H-8083-25C, capítulo 8, *Heading Indicator*): el giróscopo está
 *   orientado en el espacio y la Tierra gira 15° por hora, así que, aparte del
 *   rozamiento, puede llegar a 15° de error por hora de vuelo, que es lo que
 *   da en el polo.
 * - **El mismo capítulo** dice que el rozamiento lo hace arrastrarse del rumbo
 *   en que se puso, que cuánto depende del estado del instrumento, y que hay
 *   que comprobarlo a menudo y ponerlo con la brújula. El *Instrument Flying
 *   Handbook* (FAA-H-8083-15B, capítulo 5) lo concreta en el ritual: **cada
 *   quince minutos**, en vuelo recto y sin acelerar, que es cuando la brújula
 *   dice la verdad (enmienda H26q). La cifra de «no más de 3° cada quince
 *   minutos» que repite toda escuela es una costumbre del oficio, no una
 *   norma escrita: aquí sirve de tope, y con la Tierra y el rozamiento no se
 *   pasa en ningún campo del juego (Madrid, el más al norte, da 9,8° por hora
 *   de la Tierra más dos como mucho del rozamiento: 2,9° cada quince minutos).
 * - **Lo que no lleva**: el error de transporte, que es lo que gira el norte
 *   de aquí al volar hacia el este o el oeste sobre una Tierra redonda. El
 *   mundo del juego es un plano tangente, su norte no gira al moverse, y a la
 *   velocidad de una avioneta es un grado por hora, menos que el rozamiento.
 *   Ni la tuerca de latitud de algunos direccionales, que compensa la vuelta
 *   de la Tierra en una latitud fija: el de una avioneta no la suele llevar.
 *
 * ## Lo que no se toca
 *
 * **Solo se aparta la tarjeta del direccional.** Los pilotos de banco, los
 * ejercicios, la estima, el rumbo de noche, la brújula y las pantallas siguen
 * leyendo el rumbo de verdad del modelo, como antes. Lo que aquí se guarda es
 * un número: cuánto marca de más la tarjeta (`error`), que se suma al rumbo
 * solo al pintarla.
 *
 * ## En qué avión y en qué peldaño
 *
 * En los de esferas, que llevan un direccional de vacío sin esclavizar. Los de
 * cristal llevan un AHRS con su magnetómetro (o la válvula de flujo de los de
 * línea) que lo corrige solo, y no se van: ver `seVa`. Y desde Taguató: ver
 * `PELDANOS_QUE_LO_PONEN` y la enmienda H26r.
 *
 * Sin three.js, sin audio y sin DOM.
 */

import type { Peldano } from "./escalera";

/** Lo que gira la Tierra en una hora, grados: 360 en un día sidéreo de 23 h 56 min. */
export const VUELTA_DE_LA_TIERRA = 15.041;

/**
 * **Lo que se aparta el direccional por la vuelta de la Tierra**, grados por
 * hora, con el signo de lo que hace **el número de la tarjeta**: negativo
 * (baja) en el hemisferio norte, positivo (sube) en el sur. `latitud` en
 * grados, positiva al norte.
 */
export function derivaDeLaTierra(latitud: number): number {
  return -VUELTA_DE_LA_TIERRA * Math.sin((latitud * Math.PI) / 180);
}

/** Lo que tuerce el rozamiento como mucho, grados por hora. Ver la cabecera. */
export const FRICCION_COMO_MUCHO = 2;
/** Y como poco: todo instrumento de verdad tiene algo. */
export const FRICCION_COMO_POCO = 0.5;

/**
 * **El rozamiento de este instrumento**, grados por hora, con su signo. Fijo
 * por modelo de avión —salido de su nombre, para que una avioneta nueva
 * tenga el suyo sin escribir una tabla— y entre `FRICCION_COMO_POCO` y
 * `FRICCION_COMO_MUCHO` hacia un lado o hacia el otro, que es lo que tiene de
 * verdad: cada direccional se va a su manera.
 */
export function friccionDe(modelo: string): number {
  let h = 2166136261;
  for (let i = 0; i < modelo.length; i++) {
    h ^= modelo.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const cuanto = FRICCION_COMO_POCO + ((h % 1000) / 999) * (FRICCION_COMO_MUCHO - FRICCION_COMO_POCO);
  return ((h >>> 16) & 1) === 0 ? cuanto : -cuanto;
}

/**
 * **Lo que se va de verdad este direccional**, grados por hora: la Tierra
 * más el rozamiento. Lo que se suma a `Direccional.error` por cada hora.
 */
export function derivaDelDireccional(latitud: number, modelo: string): number {
  return derivaDeLaTierra(latitud) + friccionDe(modelo);
}

/**
 * **Los peldaños en que el direccional se va**: desde Taguató.
 *
 * Abajo no: el direccional lo pone la instructora, como la rueda del
 * altímetro (`seguirElViento`), y no se aparta nunca. Un niño de Guyrami o de
 * Tukã que sigue la marca de la rosa tiene que poder fiarse de ella: un
 * instrumento que miente sin que nadie lo explique enseña a no creer en los
 * instrumentos. El ritual es un trabajo de cabina con un número —el rumbo de
 * la brújula contra el del direccional—, y los números entran en la escalera
 * en Taguató (`escalera.ts`, el canal de la cifra), que es también donde la
 * rueda del altímetro pasa a ser de quien vuela. Y es donde se enseña: el
 * ejercicio «Poné en hora el giróscopo» es desde Taguató, el mismo peldaño en
 * que empieza a hacer falta.
 */
export const PELDANOS_QUE_LO_PONEN: readonly Peldano[] = ["cifra", "cabina"];

/** Si en este avión y este peldaño el direccional se va. */
export function seVa(o: { readonly esferas: boolean; readonly peldano: Peldano }): boolean {
  return o.esferas && PELDANOS_QUE_LO_PONEN.includes(o.peldano);
}

/**
 * **Lo que se tiene que ir para que la instructora lo diga** en un vuelo
 * cualquiera, grados: el «no más de tres cada quince minutos» de toda
 * escuela. Con la deriva de los campos del juego llega en veinte minutos a
 * una hora de vuelo, que es cuando de verdad tocaba ponerlo.
 */
export const RECORDAR = 3;

/** Lo que gira la tarjeta una muesca del mando, grados. */
export const MUESCA = 1;

/** Un ángulo entre −180 y 180. */
function centrado(grados: number): number {
  return ((((grados + 180) % 360) + 360) % 360) - 180;
}

/**
 * **El direccional**: cuánto marca de más su tarjeta respecto al rumbo
 * magnético de verdad. Empieza puesto —como si se hubiera puesto con la
 * brújula en la revisión antes de arrancar—, se aparta con `paso` y se pone
 * con el mando, `girar`.
 */
export class Direccional {
  private apartado = 0;

  /** **Lo que marca de más la tarjeta**, grados, entre −180 y 180. */
  get error(): number {
    return this.apartado;
  }

  /** Lo que marca, grados de 0 a 360, con el rumbo magnético de verdad. */
  marca(magnetico: number): number {
    return (((magnetico + this.apartado) % 360) + 360) % 360;
  }

  /**
   * Un paso: `dt` segundos con la deriva de este instrumento, grados por
   * hora. `apuro` es el reloj del giróscopo apurado de un ejercicio: uno, el
   * de verdad.
   */
  paso(deriva: number, dt: number, apuro = 1): void {
    if (!(dt > 0)) return;
    this.apartado = centrado(this.apartado + (deriva * dt * apuro) / 3600);
  }

  /** **El mando**: `pasos` muescas, positivas hacia los números que suben. */
  girar(pasos: number): void {
    this.apartado = centrado(this.apartado + pasos * MUESCA);
  }

  /** Puesto con la brújula, exacto: al colocar, reiniciar o cambiar de avión. */
  poner(): void {
    this.apartado = 0;
  }

  /** Para un ejercicio o una prueba: la tarjeta apartada tantos grados. */
  ponerApartado(grados: number): void {
    this.apartado = centrado(grados);
  }
}

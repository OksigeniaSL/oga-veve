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
import {
  AIRE_ESTANDAR,
  type Aire,
  trueFromIndicated,
  velocidadDelSonido,
} from "./atmosphere";

/** Un nudo en metros por segundo. */
export const NUDO = 0.514444;

/*
 * La velocidad del sonido vivía también aquí, con su propia cuenta de la
 * temperatura: el mismo número en dos sitios, y el día que la temperatura
 * dejó de ser la estándar, uno de los dos se habría quedado atrás. Ahora es
 * la de `atmosphere.ts`, con el aire del día.
 */
export { velocidadDelSonido };

/**
 * La velocidad real que corresponde a esa indicada a esa altura, m/s.
 *
 * **Con el aire del día**: con calor, la misma indicada es más velocidad real,
 * y por eso la Vmo, que es indicada, se vuela más deprisa sobre el suelo.
 */
export function verdaderaDesdeIndicada(
  indicada: number,
  alturaM: number,
  aire: Aire = AIRE_ESTANDAR,
): number {
  return trueFromIndicated(indicada, alturaM, aire);
}

/** A qué Mach va un avión que lleva esa velocidad real a esa altura. */
export function machDe(
  verdadera: number,
  alturaM: number,
  aire: Aire = AIRE_ESTANDAR,
): number {
  return verdadera / velocidadDelSonido(alturaM, aire);
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
  /** El aire del día: la Vmo y el Mmo en real se mueven con él. */
  aire: Aire = AIRE_ESTANDAR,
): { verdadera: number; manda: QuienManda } {
  const porEstructura = verdaderaDesdeIndicada(a.vmoKt * NUDO, alturaM, aire);
  const porElAire = a.mmo * velocidadDelSonido(alturaM, aire);
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

/**
 * A qué Mach empieza a dispararse la resistencia, como fracción del Mmo.
 *
 * El Mach crítico de un ala es donde el aire que la rodea llega a la velocidad
 * del sonido aunque el avión no; de ahí para arriba se forma una onda de
 * choque sobre el extradós y la resistencia sube a plomo. En un avión de línea
 * ese punto queda un poco por debajo de su Mmo —el Mmo se fija con margen,
 * precisamente para no vivir ahí— así que sale del propio Mmo de la ficha en
 * vez de ser un número más que mantener.
 */
const EMPIEZA_LA_ONDA = 0.94;

/**
 * Cuánto multiplica la resistencia al llegar a Mach uno.
 *
 * Doce veces el `cd0` limpio, que es el orden de magnitud que miden los
 * túneles para un perfil de línea: la barrera del sonido no es una pared, pero
 * cuesta como si lo fuera, y por eso un avión de pasaje no la cruza aunque le
 * sobre empuje.
 */
const LO_QUE_CUESTA = 12;

/**
 * Lo que **suma** la resistencia de onda a ese Mach. Cero por debajo del
 * crítico.
 *
 * ## Por qué hace falta
 *
 * Sin esto, empuje y resistencia se igualan donde les da la gana: medido en el
 * juego, el de fuselaje ancho nivelado y con gas a fondo llegaba a **706
 * nudos** a tres mil metros, o sea Mach 1,06. Ningún avión de pasaje hace eso
 * ni de lejos, y el juego lo contaba como normal —«¿por qué a cinco mil metros
 * no pasa de 302?» era la pregunta buena, y la respuesta fea era que por
 * arriba no había nada que lo parara—.
 *
 * Y no es solo verosimilitud. El aviso de sobrevelocidad avisa de pasar un
 * límite que luego no tiene ninguna consecuencia, y un aviso así se aprende a
 * desoír. Con la onda puesta, pasarse **cuesta**: el avión deja de acelerar
 * solo, que es exactamente lo que enseña por qué existe el límite.
 *
 * La subida va con la cuarta potencia, que es la forma que tiene la curva de
 * verdad: casi plana hasta el codo y vertical después. Ver `MMO` en la ficha
 * de cada aeronave y `topeDeVelocidad`.
 */
export function resistenciaDeOnda(
  mach: number,
  mmo: number,
  cd0: number,
): number {
  const critico = mmo * EMPIEZA_LA_ONDA;
  if (!Number.isFinite(mach) || mach <= critico) return 0;
  const pasado = (mach - critico) / Math.max(0.01, 1 - critico);
  return cd0 * LO_QUE_CUESTA * Math.min(1, pasado) ** 4;
}

/**
 * La VFE de una muesca de la palanca, en nudos indicados: `0` son los
 * recogidos, que no tienen tope de flaps, y de ahí para abajo la placa de
 * `vfePorMuesca`.
 */
export function vfeDeLaMuesca(
  placa: readonly number[],
  muesca: number,
): number {
  if (muesca <= 0) return Infinity;
  return placa[Math.min(muesca, placa.length) - 1] ?? Infinity;
}

/**
 * La VFE **de donde están los flaps ahora**, en nudos indicados.
 *
 * Los flaps no están siempre en una muesca: tardan en ir de una a otra, y a
 * medio camino ya han pasado de la anterior. Así que manda la placa de la
 * primera muesca que no han dejado atrás —con los flaps entre la primera y la
 * segunda, la de la segunda—, que es como se leen las placas de verdad, por
 * grados: «de diez a treinta, ochenta y cinco». Ver `vfePorMuesca`.
 *
 * Recogidos, o casi, no hay tope: `Infinity`. Y el avión sin flaps tampoco lo
 * tiene, porque no hay nada que forzar.
 */
export function vfeEn(placa: readonly number[], flaps: number): number {
  if (!placa.length || !(flaps > FLAPS_QUE_CUENTAN)) return Infinity;
  const n = placa.length;
  const muesca = Math.min(n, Math.max(1, Math.ceil(flaps * n - 1e-6)));
  return vfeDeLaMuesca(placa, muesca);
}

/** La de los flaps de aterrizaje: la última de la placa, y la más baja. */
export function vfeDeAterrizaje(placa: readonly number[]): number {
  return placa.length ? placa[placa.length - 1]! : Infinity;
}

/**
 * Por debajo de esto los flaps no cuentan como sacados.
 *
 * Es la holgura de siempre: unos flaps que acaban de llegar arriba o que
 * apenas empiezan a moverse no se están forzando contra nada.
 */
const FLAPS_QUE_CUENTAN = 0.05;

/** Qué se está forzando, o `null` si nada. */
export type LoQueSePasa = "tren" | "flaps" | null;

/**
 * Si se va demasiado rápido para lo que se lleva sacado.
 *
 * ## Por qué es otro límite y no el de siempre
 *
 * El aviso de sobrevelocidad mira lo que aguanta **el avión**: Vmo abajo y Mmo
 * arriba. Pero un avión con las patas fuera no es el mismo avión: unas
 * compuertas y unas patas metidas en la corriente aguantan bastante menos que
 * el fuselaje —doscientos setenta nudos contra trescientos sesenta y cinco en
 * uno de línea— y un flap, menos todavía.
 *
 * Y sin esto el juego enseñaba media lección. Ya contaba que el tren frena; le
 * faltaba que **el tren también se rompe**. Preguntado jugando, con el de
 * fuselaje ancho a trescientos dos nudos y las patas fuera: «¿por qué a cinco
 * mil metros no pasa de 302?». La respuesta honesta tenía dos partes, y la
 * segunda es que a esa velocidad ya estaba por encima de lo que aguanta su
 * tren.
 *
 * ## El orden importa
 *
 * Primero los flaps y después el tren, porque el de los flaps siempre es el
 * más bajo: si se están pasando los dos, lo que hay que recoger antes es lo
 * que antes se rompe. Es el mismo criterio que ordena `porQueNoSeSigue` en
 * `minimos.ts`: de lo que más mata a lo que menos.
 *
 * Se mide en **nudos indicados**, que es lo que marca la cinta y lo que dicen
 * los manuales: un límite estructural es de presión dinámica, no de velocidad
 * real, y por eso no cambia con la altura.
 *
 * **Y el de los flaps es el de su posición**, no uno para todas: ver
 * `vfeEn`. Con uno solo, el JAZ 90 a ciento setenta y tres nudos con la
 * primera muesca se estaba «pasando», y la primera de un reactor aguanta
 * doscientos cincuenta.
 */
export function loQueSePasa(
  indicadaKt: number,
  a: {
    readonly vleKt: number;
    readonly vfePorMuesca: readonly number[];
    readonly trenRetractil: boolean;
  },
  sacado: { readonly tren: number; readonly flaps: number },
): LoQueSePasa {
  if (indicadaKt > vfeEn(a.vfePorMuesca, sacado.flaps)) return "flaps";
  // En los que no lo meten no hay límite que dar: sus patas están calculadas
  // para todo su rango de velocidades. Ver `trenRetractil`.
  if (a.trenRetractil && sacado.tren > 0.05 && indicadaKt > a.vleKt)
    return "tren";
  return null;
}

/**
 * **Lo más rápido que se puede ir con lo que se lleva sacado**, en nudos
 * indicados, o `Infinity` si no se lleva nada.
 *
 * Es el número que pinta la banda roja de la cinta de velocidad de un avión
 * de línea: en una cabina de verdad esa banda no está quieta en la Vmo, sino
 * que **baja** en cuanto salen el tren o los flaps, hasta el tope de lo que
 * esté fuera. Mirándola se sabe, sin leer ninguna placa, cuánto se puede
 * acelerar ahora mismo. Sale de lo mismo que `loQueSePasa`, para que la
 * banda y el aviso no puedan discrepar.
 */
export function topeDeLoSacado(
  a: {
    readonly vleKt: number;
    readonly vfePorMuesca: readonly number[];
    readonly trenRetractil: boolean;
  },
  sacado: { readonly tren: number; readonly flaps: number },
): number {
  const tren =
    a.trenRetractil && sacado.tren > 0.05 ? a.vleKt : Infinity;
  return Math.min(tren, vfeEn(a.vfePorMuesca, sacado.flaps));
}

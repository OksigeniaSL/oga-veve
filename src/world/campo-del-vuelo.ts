/**
 * El campo en el que se está: una sola respuesta a «¿dónde estoy?».
 *
 * Hasta que hubo rutas, «el escenario» y «el sitio donde se está» eran lo
 * mismo, y medio juego se escribió preguntando por el escenario: la pista de
 * casa, la cota de casa, el aeródromo de casa, la cabecera en uso de casa.
 * Desde que se puede volar a otro aeropuerto esas preguntas contestan mal en
 * cuanto se llega, y contestan mal **sin romper nada**: la final a Los Rodeos
 * medía la distancia al umbral de Gando —ciento trece kilómetros—, así que el
 * aviso de terreno no se callaba nunca en final, los mínimos no se cantaban,
 * la torre autorizaba en la 03L y la aguja señalaba al mar.
 *
 * Se fue arreglando pieza a pieza —el señalero, la raya, el suelo, la cota— y
 * cada arreglo sacaba la respuesta de un sitio un poco distinto. Esto es el
 * sitio: un campo del vuelo con todo lo que hace falta para contestar, ya
 * corrido a las coordenadas del mundo en el que se vuela y **con el viento de
 * hoy**, que es el que elige la cabecera. Quien pregunte por la pista, el
 * umbral o el aeródromo de donde está el avión pregunta aquí.
 *
 * Aquí no hay escena ni estado: son cuentas sobre un escenario y un
 * desplazamiento. Por eso se pueden comprobar sin volar.
 */

import { arranqueEnPista, type Aerodrome } from "./aerodrome";
import type { Meteo } from "./meteo";
import type { Pista } from "./pistas-del-vuelo";
import { puntoDePista } from "./rumbo";
import { conViento, type Scenario } from "./scenarios";
import { hastaElUmbralDeToma } from "./umbral-desplazado";

/** Un campo del vuelo, ya puesto en el mundo en el que se vuela. */
export interface CampoEnElMundo {
  /** El identificador de su escenario. */
  readonly id: string;
  /** Si es el campo de salida del mundo, el que no está corrido. */
  readonly esCasa: boolean;
  /**
   * Su escenario **sin correr** y con el viento de hoy: es el que sabe por qué
   * cabecera se opera (`cabeceraEnUso`), cómo se llama y cuánta declinación
   * lleva. Las coordenadas de dentro son las de su propio mapa.
   */
  readonly escenario: Scenario;
  /**
   * El mismo escenario con la pista y el aeródromo corridos a este mundo, que
   * es como lo necesita quien pregunta con la posición del avión en la mano.
   */
  readonly comoCampo: Scenario;
  /** Su pista en coordenadas de este mundo, con la cabecera en uso. */
  readonly pista: Pista;
  /** Su aeródromo en coordenadas de este mundo, si está extraído. */
  readonly aerodromo: Aerodrome | null;
  /** Dónde cae su mapa respecto al de casa. Cero en casa. */
  readonly desplazamiento: { readonly x: number; readonly z: number };
}

/** El campo de casa, tal cual: su mundo es este y no hay nada que correr. */
export function campoDeCasa(escenario: Scenario): CampoEnElMundo {
  return {
    id: escenario.id,
    esCasa: true,
    escenario,
    comoCampo: escenario,
    pista: escenario.runway,
    aerodromo: escenario.aerodrome ?? null,
    desplazamiento: { x: 0, z: 0 },
  };
}

/**
 * Otro campo del vuelo, con el tiempo de hoy y corrido hasta donde cae.
 *
 * **Con el viento, que era lo que faltaba.** El viento del modelo de vuelo es
 * uno para todo el mundo, y la cabecera en uso solo se elegía con él en casa:
 * con 300/15 Los Rodeos operaba por la 30 si se salía de allí y por la 12 si
 * se llegaba, o sea aterrizando con quince nudos de cola por la pista que
 * pintaba la raya. Lo contrario de lo que enseña la manga.
 *
 * El aeródromo corrido se pasa hecho: son miles de puntos y no dependen del
 * viento, así que se calcula una vez al cargar el vecino.
 */
export function campoVecino(
  base: Scenario,
  desplazamiento: { readonly x: number; readonly z: number },
  aerodromo: Aerodrome | null,
  meteo?: Meteo | null,
): CampoEnElMundo {
  const escenario = meteo ? conViento(base, meteo) : base;
  const pista: Pista = {
    ...escenario.runway,
    x: desplazamiento.x + escenario.runway.x,
    z: desplazamiento.z + escenario.runway.z,
  };
  return {
    id: base.id,
    esCasa: false,
    escenario,
    comoCampo: {
      ...escenario,
      runway: pista,
      ...(aerodromo ? { aerodrome: aerodromo } : {}),
    },
    pista,
    aerodromo,
    desplazamiento,
  };
}

/**
 * Un punto del eje de su pista a tantos metros por detrás del centro, hacia la
 * cabecera en uso. Con media longitud, su umbral.
 *
 * Es la cuenta de siempre de `enLaPista` —el umbral medido si el aeródromo es
 * real, la cuenta desde el centro si la pista es inventada— hecha sobre el
 * campo que se diga y no sobre el de casa.
 */
export function enLaPistaDe(
  campo: CampoEnElMundo,
  atras: number,
): readonly [number, number] {
  const { pista, aerodromo } = campo;
  const suya = aerodromo?.runways[0];
  if (suya) {
    const p = arranqueEnPista(suya, pista.heading, pista.length * 0.5 - atras);
    if (p) return p;
  }
  return puntoDePista(pista, atras);
}

/**
 * El umbral en uso, en coordenadas de este mundo: por donde se entra.
 *
 * Se guarda por campo: se pregunta varias veces por fotograma —la distancia
 * de la final, la aguja, la aproximación— y un campo no cambia; con otro
 * viento es otro campo. Ver `campoVecino`.
 *
 * **Y el de aterrizar, que no siempre es la punta.** Con el umbral
 * desplazado, lo que se mide en final —los mínimos, el aviso de terreno, la
 * senda— se mide hasta donde se puede tocar: en la 01 de Fuerteventura, mil
 * metros pista adentro. Medido hasta la punta, una final bien volada a su
 * umbral de verdad iba cincuenta metros «alta» durante toda la
 * aproximación. Ver `umbral-desplazado.ts`.
 */
export function umbralEnUso(campo: CampoEnElMundo): readonly [number, number] {
  let u = umbrales.get(campo);
  if (!u) {
    u = enLaPistaDe(campo, hastaElUmbralDeToma(campo.pista));
    umbrales.set(campo, u);
  }
  return u;
}

const umbrales = new WeakMap<CampoEnElMundo, readonly [number, number]>();

/** Cuánto hay desde un punto del mundo hasta su umbral en uso, m. */
export function distanciaAlUmbral(
  campo: CampoEnElMundo,
  x: number,
  z: number,
): number {
  const [ux, uz] = umbralEnUso(campo);
  return Math.hypot(ux - x, uz - z);
}

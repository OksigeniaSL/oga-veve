/**
 * Las salidas y las aproximaciones publicadas, por aeropuerto y cabecera.
 *
 * Es el otro medio del plan de vuelo: `flight/ruta.ts` sabe elegir y seguir
 * una ruta; aquí está **por dónde se va de verdad**, sacado de las cartas
 * oficiales. Los puntos llevan su nombre publicado —CANDE, BUNIX, XO69E— y su
 * posición tal cual la da la carta, porque la regla 4 aquí es literal: quien
 * aprenda a llegar a Los Rodeos por BUNIX tiene que encontrarse BUNIX el día
 * que abra la carta de verdad.
 *
 * ## De dónde sale cada cosa
 *
 * Canarias, del AIP de España que publica ENAIRE: la ficha de cada
 * aeródromo (AD 2) con sus cartas de aproximación (IAC) y de salida (SID), y
 * la lista de puntos significativos (ENR 4.4) y radioayudas (ENR 4.1). La
 * enmienda y la fecha van en `procedimientos-canarias.ts`, junto a los datos,
 * y en `CREDITOS.md`. Son hechos —dónde está un punto, por dónde pasa una
 * aproximación— y se citan como se cita un hecho.
 *
 * Paraguay, del AIP que publica la DINAC: la ficha AD 2 de cada aeródromo
 * con sus tablas de codificación, y las listas de radioayudas (ENR 4.1) y de
 * puntos significativos (ENR 4.3). La enmienda va en
 * `procedimientos-paraguay.ts`, con lo que entra y lo que no.
 *
 * Donde no hay nada publicado —los campos de vuelo visual, o una cabecera
 * cuya aproximación no acaba alineada con la pista— el plan hace lo único
 * honesto: calcular la aproximación sobre el eje de la pista con las
 * distancias de manual. Ver `aproximacionCalculada`.
 *
 * ## Lo que se simplifica, que es la presentación
 *
 * - De cada cabecera, **una** aproximación: la de navegación de área (RNP)
 *   cuando la hay, que es la que vuela hoy la línea, y si no la de
 *   instrumentos que haya. Con todas sus ramas de entrada, que es lo que deja
 *   llegar desde cualquier lado.
 * - De cada salida, **los puntos**: los tramos de solo rumbo o solo altura se
 *   quedan en la carta. Y la salida se recorta donde deja de ir hacia el
 *   destino; ver `trazar` en `flight/ruta.ts`.
 * - Las altitudes: solo las «a o por encima de», que son las que libran el
 *   terreno y las que importan para bajar.
 */

import type { Papel } from "../flight/ruta";
import { CANARIAS } from "./procedimientos-canarias";
import { PARAGUAY } from "./procedimientos-paraguay";

/** Un punto publicado, en coordenadas geográficas. */
export interface Publicado {
  /** Su nombre en la carta. */
  readonly nombre: string;
  readonly lat: number;
  readonly lon: number;
  /** Qué es en el procedimiento. Ver `Papel`. */
  readonly papel: Papel;
  /** La altitud mínima publicada para cruzarlo, en pies, o `null`. */
  readonly minimaPies: number | null;
}

/** Lo publicado de un aeropuerto, por cabecera. */
export interface Procedimientos {
  /** De dónde sale, para citarlo: la enmienda y su fecha. */
  readonly fuente: string;
  /**
   * Las ramas de la aproximación a cada cabecera: cada una empieza en su
   * punto de inicio y acaba en el de final. El umbral no va: lo pone el
   * aeródromo del juego, que es donde se toca.
   */
  readonly aproximaciones: Readonly<
    Record<string, { readonly carta: string; readonly ramas: readonly (readonly Publicado[])[] }>
  >;
  /** Las salidas de cada cabecera, con sus puntos en orden. */
  readonly salidas: Readonly<
    Record<string, readonly { readonly nombre: string; readonly carta: string; readonly fijos: readonly Publicado[] }[]>
  >;
}

/** Lo que hay publicado de un aeropuerto, por su indicativo OACI. */
export function procedimientosDe(oaci: string | null): Procedimientos | null {
  if (!oaci) return null;
  const clave = oaci.toUpperCase();
  return CANARIAS[clave] ?? PARAGUAY[clave] ?? null;
}

/** Las ramas de la aproximación publicada a esa cabecera, o ninguna. */
export function ramasDe(
  oaci: string | null,
  cabecera: string | null,
): readonly (readonly Publicado[])[] {
  if (!cabecera) return [];
  return procedimientosDe(oaci)?.aproximaciones[cabecera]?.ramas ?? [];
}

/** Las salidas publicadas desde esa cabecera, o ninguna. */
export function salidasDe(
  oaci: string | null,
  cabecera: string | null,
): readonly (readonly Publicado[])[] {
  if (!cabecera) return [];
  return (procedimientosDe(oaci)?.salidas[cabecera] ?? []).map((s) => s.fijos);
}

/** Una milla náutica, m. */
const MILLA = 1852;

/**
 * Dónde van los puntos de una aproximación **sin carta**, en millas del
 * umbral, por el eje de la pista.
 *
 * Los valores de diseño de la OACI (PANS-OPS, Doc 8168): el tramo final mide
 * de óptimo cinco millas, y el intermedio otras cinco, así que el punto
 * intermedio queda a diez. Es lo que tendría una aproximación de manual a esa
 * pista; no es la de ningún sitio concreto, y por eso sus puntos no llevan
 * nombre de punto publicado sino el que les pone un ordenador de vuelo a los
 * puntos sin nombre de una aproximación: «CF» y «FF» con el número de la
 * pista, del ARINC 424.
 */
export const INTERMEDIO_SIN_CARTA = 10;
export const FINAL_SIN_CARTA = 5;

/**
 * La aproximación calculada a una cabecera sin nada publicado aquí: el punto
 * intermedio y el de final, sobre el eje y por detrás del umbral.
 *
 * `umbral` y `rumbo` en coordenadas del mundo: el rumbo de aterrizaje, en
 * grados verdaderos, que es el de la pista en uso.
 */
export function aproximacionCalculada(
  cabecera: string,
  umbral: { readonly x: number; readonly z: number },
  rumbo: number,
): { nombre: string; x: number; z: number; papel: Papel }[] {
  const h = (rumbo * Math.PI) / 180;
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  const atras = (millas: number) => ({
    x: umbral.x - fx * millas * MILLA,
    z: umbral.z - fz * millas * MILLA,
  });
  return [
    { nombre: `CF${cabecera}`, ...atras(INTERMEDIO_SIN_CARTA), papel: "if" },
    { nombre: `FF${cabecera}`, ...atras(FINAL_SIN_CARTA), papel: "faf" },
  ];
}

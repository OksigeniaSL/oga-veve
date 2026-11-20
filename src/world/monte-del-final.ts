/**
 * **El monte de la pista corta, puesto en el campo**: dónde van sus árboles y
 * qué hace el campo mientras está (H35d; ADR 0027, «El monte de la pista
 * corta, en la final de la 33»).
 *
 * El monte es del ejercicio «Despegar de una pista corta» (`flight/pista-corta.ts`):
 * se planta al montar el vuelo, a lo que diga el campo pasado el final de la
 * pista por la que se sale, y no se quita. Así que, desde que se ve el campo,
 * **el campo es así**: tiene un monte de quince metros a ciento veinte del
 * final de una pista de novecientos. Y eso es justo lo que queda en la
 * aproximación de la cabecera de enfrente.
 *
 * Un aeródromo de verdad con un obstáculo así en la aproximación, si no lo
 * puede quitar, **desplaza el umbral** de esa cabecera hasta que la superficie
 * de aproximación —que nace del umbral— pasa por encima (Anexo 14 de OACI,
 * volumen I, adjunto A, «Location of threshold»), lo pinta con sus flechas y
 * publica más corta la distancia de aterrizaje. Es lo que se hace aquí, con la
 * superficie de la pista visual de número de clave 1 —la de un avión que pide
 * menos de ochocientos metros de campo, como el 172—: empieza treinta metros
 * antes del umbral, con un borde de sesenta que se abre un diez por ciento a
 * cada lado, y sube al cinco por ciento (tabla 4-1). En Estados Unidos es la
 * misma pendiente, 20:1, en la superficie de emplazamiento del umbral de la
 * FAA (AC 150/5300-13B, *Threshold Siting Surfaces*).
 *
 * Con eso, todo lo que dice «por aquí se aterriza» lo sabe solo: la senda nace
 * del umbral nuevo, el veredicto de la toma y el «ya podés tocar» miden desde
 * él, y las balizas lo enseñan como en un campo de hierba de verdad. Ver
 * `world/umbral-desplazado.ts`.
 */

import type { ArbolDeLaArboleda } from "./arboleda";

/** El final de la pista por el que se sale hacia el monte: el punto y hacia dónde se sale, en el mundo. */
export interface FinDeLaPista {
  readonly x: number;
  readonly z: number;
  /** Hacia dónde se sale, unitario (x al este, z al sur). */
  readonly dx: number;
  readonly dz: number;
}

/** Lo que hace falta del monte para plantarlo. Ver `MonteDelFinal` en `flight/pista-corta.ts`. */
export interface ElMonte {
  readonly pasadaLaPista: number;
  readonly alto: number;
}

/** Un pie de árbol en el mundo, m. */
export interface PieDeArbol {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * **Dónde va cada árbol del monte**: tres filas de lapachos de través, a nueve
 * metros una de otra y a once entre árboles, la segunda corrida media
 * separación; el primero de todos sobre el eje, que es el que mide `alto`
 * justo (ver `filaDeArboles`). Con el suelo debajo de cada uno.
 *
 * Estaba dentro del juego; está aquí para que la prueba de los árboles de la
 * senda plante el mismo monte que el juego, árbol por árbol.
 */
export function arbolesDelMonte(
  fin: FinDeLaPista,
  monte: ElMonte,
  suelo: (x: number, z: number) => number,
): PieDeArbol[] {
  // De través: a la derecha de quien sale.
  const tx = -fin.dz;
  const tz = fin.dx;
  const pies: PieDeArbol[] = [];
  for (let fila = 0; fila < 3; fila++) {
    const d = monte.pasadaLaPista + fila * 9;
    for (let k = 0; k <= 36; k++) {
      const lado = (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * 11 + (fila % 2) * 5.5;
      const x = fin.x + fin.dx * d + tx * lado;
      const z = fin.z + fin.dz * d + tz * lado;
      pies.push({ x, y: suelo(x, z), z });
    }
  }
  return pies;
}

/**
 * **La superficie de aproximación de una pista visual de número de clave 1**,
 * Anexo 14, volumen I, tabla 4-1. Distancias en metros; pendiente y
 * divergencia, en tanto por uno.
 */
export const APROXIMACION_CLAVE_1 = Object.freeze({
  /** A cuánto antes del umbral empieza su borde interior. */
  desdeElUmbral: 30,
  /** Lo que mide ese borde, de lado a lado. */
  bordeInterior: 60,
  /** Lo que se abre a cada lado por cada metro hacia fuera. */
  divergencia: 0.1,
  /** Lo que sube por cada metro hacia fuera. */
  pendiente: 0.05,
  /** Hasta dónde llega, medido desde el borde interior. */
  largo: 1600,
});

/**
 * **La altura de la superficie de aproximación** sobre la cota del umbral, a
 * `antes` metros antes del umbral y `lado` metros del eje; `null` donde no
 * hay superficie (en la franja, a los lados o más allá de su largo).
 */
export function superficieDeAproximacion(antes: number, lado: number): number | null {
  const s = APROXIMACION_CLAVE_1;
  const fuera = antes - s.desdeElUmbral;
  if (fuera < 0 || fuera > s.largo) return null;
  if (Math.abs(lado) > s.bordeInterior / 2 + s.divergencia * fuera) return null;
  return s.pendiente * fuera;
}

/**
 * **Cuánto hay que desplazar el umbral** de la cabecera que entra por encima
 * del monte para que ninguna copa asome por su superficie de aproximación, m
 * enteros: el primero que la deja limpia. Cero si ya lo está.
 *
 * Cada copa se mide por su punta —la del octaedro, que es lo más alto— y por
 * su borde de lado, que es lo que entra antes en una superficie que se abre.
 * `cotaDelUmbral` es la de la pista, que en la granja es llana; `largo`, el de
 * la pista: el umbral no se lleva más allá de la mitad, como en
 * `desplazadoDe`.
 */
export function desplazadoPorElMonte(
  arboles: readonly ArbolDeLaArboleda[],
  fin: FinDeLaPista,
  cotaDelUmbral: number,
  largo: number,
): number {
  const copas = arboles.map((a) => ({
    pasado: (a.x - fin.x) * fin.dx + (a.z - fin.z) * fin.dz,
    lado: Math.max(0, Math.abs((a.x - fin.x) * -fin.dz + (a.z - fin.z) * fin.dx) - a.radio),
    punta: a.y + a.centro + a.semialto - cotaDelUmbral,
  }));
  const limpia = (d: number): boolean =>
    copas.every((c) => {
      const techo = superficieDeAproximacion(c.pasado + d, c.lado);
      return techo === null || c.punta <= techo;
    });
  for (let d = 0; d < largo / 2; d++) if (limpia(d)) return d;
  return Math.floor(largo / 2);
}

/** Lo que hace falta de un umbral del fichero del aeródromo. */
interface UmbralDelFichero {
  readonly xy: readonly [number, number] | null;
  readonly displacedM: number;
}

/** Lo que hace falta de un escenario para desplazarle un umbral. */
export interface ConPistaYAerodromo {
  readonly runway: {
    readonly x: number;
    readonly z: number;
    readonly heading: number;
    readonly desplazado?: number;
    readonly desplazadoEnfrente?: number;
  };
  readonly aerodrome?: {
    readonly runways: readonly {
      readonly thresholds: Readonly<Record<string, UmbralDelFichero | null | undefined>>;
    }[];
  };
}

/**
 * **El mismo escenario con el umbral de la punta `fin` desplazado `d`
 * metros**: en el fichero del aeródromo —de donde lo leen el dibujo y
 * `conViento`, que vuelve a sacar la pista si el viento cambia de cabecera— y
 * en la pista del escenario, de donde lo lee todo lo demás. Nunca acerca un
 * umbral que ya estuviera más dentro.
 *
 * No toca el escenario de entrada: es el del módulo y lo comparten todos los
 * vuelos de la página, y el monte es solo de este.
 */
export function conElUmbralDelMonte<E extends ConPistaYAerodromo>(escenario: E, fin: FinDeLaPista, d: number): E {
  const aero = escenario.aerodrome;
  const pista = aero?.runways[0];
  if (!aero || !pista || d <= 0) return escenario;
  // La cabecera de esa punta: la del umbral más cerca de ella. En el fichero la Y apunta al norte, y en el mundo el norte es la Z negativa.
  let nombre: string | null = null;
  let cerca = Infinity;
  for (const [n, u] of Object.entries(pista.thresholds)) {
    if (!u?.xy) continue;
    const lejos = Math.hypot(u.xy[0] - fin.x, -u.xy[1] - fin.z);
    if (lejos < cerca) {
      cerca = lejos;
      nombre = n;
    }
  }
  const umbral = nombre ? pista.thresholds[nombre] : null;
  if (!nombre || !umbral) return escenario;
  const desplazado = Math.max(umbral.displacedM ?? 0, d);
  const aerodrome = {
    ...aero,
    runways: aero.runways.map((r, i) =>
      i === 0 ? { ...r, thresholds: { ...r.thresholds, [nombre]: { ...umbral, displacedM: desplazado } } } : r,
    ),
  };
  // Y en la pista del escenario: la punta de delante, si el monte queda hacia donde apunta su rumbo.
  const r = escenario.runway;
  const h = (r.heading * Math.PI) / 180;
  const delante = (fin.x - r.x) * Math.sin(h) - (fin.z - r.z) * Math.cos(h) > 0;
  const runway = delante
    ? { ...r, desplazadoEnfrente: Math.max(r.desplazadoEnfrente ?? 0, desplazado) }
    : { ...r, desplazado: Math.max(r.desplazado ?? 0, desplazado) };
  return { ...escenario, aerodrome, runway };
}

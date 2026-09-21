/**
 * Las tormentas, y el radar que las pinta.
 *
 * ## Por qué esto es una lección y no un efecto
 *
 * A una tormenta **no se entra**. Se rodea. Es de las cosas que un piloto
 * aprende antes que casi cualquier otra, y es la regla de las tres eses dicha
 * en meteorología: el avión aguanta, pero dentro de una célula hay granizo,
 * corrientes que suben y bajan a treinta metros por segundo y rayos, y nada de
 * eso se pilotea — se evita.
 *
 * Y se evita **porque se ve venir**. El radar de a bordo pinta delante lo que
 * hay, con tiempo para decidir. Enseñar eso es enseñar a decidir con
 * antelación, que es lo mismo que enseña la frustrada.
 *
 * ## Los colores no son de adorno
 *
 * Son la escala de verdad de cualquier radar meteorológico, y quien la aprenda
 * aquí la va a reconocer en la pantalla de un avión:
 *
 *   verde    lluvia floja, se pasa
 *   ámbar    lluvia fuerte, se nota
 *   rojo     no se entra
 *   magenta  granizo o giro; ni acercarse
 *
 * No se traduce ni se cambia por «bajo, medio, alto»: el que pilote de verdad
 * va a ver verde, amarillo, rojo y magenta.
 *
 * ## Y solo hay células si el tiempo las trae
 *
 * El parte meteorológico del sitio dice si hay tormenta —ver `Lluvia`— y de
 * ahí salen. Con buen tiempo el radar está encendido y no pinta nada, que es
 * lo que hace un radar el noventa por ciento de los días. Inventar una
 * tormenta en un cielo despejado sería mentir dos veces: sobre el tiempo y
 * sobre el instrumento.
 */

import type { Lluvia } from "../world/meteo";

/** Una célula: dónde está, cuánto ocupa y cuánto pega. */
export interface Celda {
  readonly x: number;
  readonly z: number;
  /** Radio en metros. */
  readonly radio: number;
  /** Lo fuerte que es en su centro, de 0 a 1. */
  readonly fuerza: number;
}

/** Lo que pinta el radar en un punto, en la escala de siempre. */
export type Eco = "nada" | "verde" | "ambar" | "rojo" | "magenta";

/**
 * De cuánto eco a qué color.
 *
 * Los cortes son los de la escala de verdad —cada escalón es un salto de unos
 * diez decibelios de reflectividad— y por eso no están repartidos a partes
 * iguales: de verde a ámbar hay mucho menos que de nada a verde.
 */
export function colorDelEco(eco: number): Eco {
  if (eco < 0.18) return "nada";
  if (eco < 0.45) return "verde";
  if (eco < 0.68) return "ambar";
  if (eco < 0.88) return "rojo";
  return "magenta";
}

/**
 * Cuántas células trae cada clase de tiempo, y cómo de fuertes.
 *
 * La llovizna no sale en el radar de nadie: es una capa, no una célula. La
 * lluvia sí, floja y ancha. La tormenta es lo que trae núcleos.
 */
const SEGUN_EL_TIEMPO: Record<Lluvia, { cuantas: number; pega: number }> = {
  nada: { cuantas: 0, pega: 0 },
  llovizna: { cuantas: 0, pega: 0 },
  lluvia: { cuantas: 2, pega: 0.45 },
  tormenta: { cuantas: 4, pega: 1 },
};

/** Un número entre 0 y 1 a partir de dos enteros. Sin estado y repetible. */
function sorteo(semilla: number, i: number): number {
  const x = Math.sin(semilla * 45.164 + i * 21.42) * 28001.3;
  return x - Math.floor(x);
}

/**
 * Las células que hay hoy en este mundo.
 *
 * `lado` es el ancho del mundo en metros; se reparten por él con una semilla,
 * así que el mismo vuelo tiene la misma tormenta en el mismo sitio. Sin eso no
 * se puede ni medir ni aprender: una tormenta que cambia de sitio cada vez es
 * un enemigo, no un fenómeno.
 */
export function celdasDe(
  lluvia: Lluvia,
  fuerza: number,
  lado: number,
  semilla = 1,
): Celda[] {
  const { cuantas, pega } = SEGUN_EL_TIEMPO[lluvia];
  const celdas: Celda[] = [];
  for (let i = 0; i < cuantas; i++) {
    /*
     * **No se ponen alrededor del aeropuerto, sino por el mundo.**
     *
     * Con el aeropuerto en el centro, poner células en un disco centrado en él
     * las deja siempre encima de la pista. Se reparten por el cuadrado entero
     * y se deja un hueco alrededor del campo: despegar dentro de una célula no
     * es una lección, es una encerrona.
     */
    const a = sorteo(semilla, i * 3) * Math.PI * 2;
    /*
     * Entre el cuarenta y cinco y el noventa y cinco por ciento del radio del
     * mundo. El mínimo era un veinticinco y dejaba células a dos kilómetros del
     * campo, o sea encima del circuito de tráfico: se ve en `tormentas.test.ts`,
     * que pedía más hueco que el que daba el código.
     */
    const d = (0.45 + sorteo(semilla, i * 3 + 1) * 0.5) * (lado / 2);
    celdas.push({
      x: Math.cos(a) * d,
      z: Math.sin(a) * d,
      radio: 2500 + sorteo(semilla, i * 3 + 2) * 5500,
      fuerza: Math.min(1, pega * (0.55 + fuerza * 0.6)),
    });
  }
  return celdas;
}

/** Los cortes de la escala, en el mismo orden que `colorDelEco`. */
const CORTES: readonly [number, Exclude<Eco, "nada">][] = [
  [0.18, "verde"],
  [0.45, "ambar"],
  [0.68, "rojo"],
  [0.88, "magenta"],
];

/**
 * Los anillos con los que se pinta una célula: qué parte del radio y de qué
 * color, de fuera hacia dentro.
 *
 * **Y el radio de cada anillo se despeja, no se estima.** El eco cae con
 * `fuerza·(1−d/r)²`, así que el borde del color que empieza en `u` está donde
 * esa cuenta vale `u`: a `r·(1−√(u/fuerza))`. El primer intento repartía los
 * anillos a ojo —uno, dos tercios, dos quintos, un quinto del radio— y con eso
 * **el rojo y el magenta no se pintaban jamás**, ni con la célula a tope: el
 * anillo de dos quintos caía en 0,16 de eco, justo por debajo del corte del
 * verde. Se vio pintándolo con una tormenta de verdad puesta en el METAR.
 *
 * Vive aquí y no en cada pantalla porque las dos superficies tienen que pintar
 * la misma tormenta. Ver `ui/carta.ts`.
 */
export function anillosDe(
  fuerza: number,
): { parte: number; color: Exclude<Eco, "nada"> }[] {
  const anillos: { parte: number; color: Exclude<Eco, "nada"> }[] = [];
  for (const [umbral, color] of CORTES) {
    if (fuerza <= umbral) break;
    anillos.push({ parte: 1 - Math.sqrt(umbral / fuerza), color });
  }
  return anillos;
}

/**
 * Cuánto eco hay en un punto, de 0 a 1.
 *
 * Una célula no tiene borde: pega en el centro y se va apagando hacia fuera.
 * Por eso el radar pinta anillos de colores y no manchas planas, y por eso se
 * puede pasar **cerca** de una tormenta sin pasar por dentro.
 */
export function ecoEn(celdas: readonly Celda[], x: number, z: number): number {
  let eco = 0;
  for (const c of celdas) {
    const d = Math.hypot(x - c.x, z - c.z);
    if (d >= c.radio) continue;
    // Cae con el cuadrado: el núcleo es pequeño y el halo, ancho.
    const t = 1 - d / c.radio;
    eco = Math.max(eco, c.fuerza * t * t);
  }
  return eco;
}

/**
 * Y cuánto sacude ahí dentro, de 0 a 1.
 *
 * Lo mismo que el eco, porque es lo mismo: lo que el radar ve es el agua que
 * sube y baja, y lo que sacude es esa agua subiendo y bajando. Que el
 * instrumento y la sensación vengan del mismo número es lo que hace que se
 * aprenda a creerle al instrumento.
 */
export function cuantoSacude(
  celdas: readonly Celda[],
  x: number,
  z: number,
): number {
  return ecoEn(celdas, x, z);
}

/**
 * La célula que se tiene delante, si hay alguna, y a qué distancia.
 *
 * Existe porque **los círculos del radar no los nombraba nadie**. Se preguntó
 * con una foto delante: «¿qué son esos círculos?». Y ahí está el fallo: en
 * este juego lo esencial se entiende sin leer, y un color en una pantalla no
 * es un canal — hace falta que alguien lo diga la primera vez.
 *
 * «Delante» es delante de verdad: dentro de un cono por el morro. Una célula
 * que queda a la espalda o a noventa grados no se rodea, se ignora, y avisar
 * de ella enseñaría a no hacer caso de los avisos.
 *
 * Pura y con el rumbo en radianes, como todo lo que decide algo en vuelo.
 */
export function laQueVieneDelante(
  celdas: readonly Celda[],
  x: number,
  z: number,
  rumbo: number,
  /** Hasta dónde se mira, en metros. Quince kilómetros: dos minutos de vuelo. */
  alcance = 15000,
): { readonly celda: Celda; readonly distancia: number } | null {
  // En el marco del juego el morro mira a −Z, que es de donde sale este seno.
  const fx = Math.sin(rumbo);
  const fz = -Math.cos(rumbo);
  let mejor: { celda: Celda; distancia: number } | null = null;
  for (const c of celdas) {
    const dx = c.x - x;
    const dz = c.z - z;
    const d = Math.hypot(dx, dz);
    // Ya dentro de ella no hay nada que anunciar: se anuncia lo que viene.
    if (d < c.radio || d > alcance) continue;
    /*
     * Treinta grados a cada lado. Es el cono en el que un radar de a bordo
     * de verdad enseña lo que importa, y es también lo que se ve por el
     * parabrisas sin girar la cabeza.
     */
    if ((dx * fx + dz * fz) / d < Math.cos((30 * Math.PI) / 180)) continue;
    if (!mejor || d < mejor.distancia) mejor = { celda: c, distancia: d };
  }
  return mejor;
}

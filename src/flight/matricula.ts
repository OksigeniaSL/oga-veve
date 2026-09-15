/**
 * El indicativo del otro avión, y por qué cambia.
 *
 * La radio del circuito decía siempre lo mismo: «Zulu Papa Alfa Bravo Charlie»
 * escrito a mano en las cinco frases, vuelo tras vuelo y aeropuerto tras
 * aeropuerto. Quien juega lo nota enseguida —«hay unas pocas frases y en cada
 * vuelo dice lo mismo»— y lo que aprende de ahí son cinco palabras sueltas, no
 * una fraseología.
 *
 * Y había algo peor escondido dentro: **ZP- es la matrícula de Paraguay**. En
 * Tenerife, en La Palma o en Lanzarote el que hacía circuitos contigo era
 * siempre el mismo avión paraguayo.
 *
 * ## Lo que hace que esto enseñe algo
 *
 * El indicativo se sortea por vuelo y se **monta** con el alfabeto fonético,
 * letra a letra. Así el alfabeto se oye una y otra vez y siempre en contexto,
 * que es como se aprende de verdad: no hay que estudiarlo, se pega. Con
 * veintiséis piezas de una sílaba salen todos los indicativos posibles, que es
 * exactamente lo que hace un GPS con el nombre de la calle. Ver `recetaDe` en
 * `audio/banco-de-voz.ts`.
 *
 * ## Y el prefijo es el del país de verdad
 *
 * Por el indicativo OACI del aeródromo, que es un dato y no una opinión
 * nuestra: la misma regla con la que se decide si la torre vosea. `SG` es
 * Paraguay y su matrícula es **ZP-**; `GC` son Canarias y `LE` la península, y
 * las dos son España, o sea **EC-**. Ver `i18n/habla.ts`.
 *
 * Así, en Asunción te acompaña un ZP- y en Tenerife un EC-, y eso es cierto.
 */

/** Las letras del alfabeto aeronáutico, en orden. */
export const FONETICO = [
  "alfa",
  "bravo",
  "charlie",
  "delta",
  "echo",
  "foxtrot",
  "golf",
  "hotel",
  "india",
  "juliett",
  "kilo",
  "lima",
  "mike",
  "november",
  "oscar",
  "papa",
  "quebec",
  "romeo",
  "sierra",
  "tango",
  "uniform",
  "victor",
  "whiskey",
  "xray",
  "yankee",
  "zulu",
] as const;

export type Letra = (typeof FONETICO)[number];

/** Cómo se escribe cada una en la tarjeta. */
const ESCRITA: Record<Letra, string> = {
  alfa: "Alfa",
  bravo: "Bravo",
  charlie: "Charlie",
  delta: "Delta",
  echo: "Echo",
  foxtrot: "Foxtrot",
  golf: "Golf",
  hotel: "Hotel",
  india: "India",
  juliett: "Juliett",
  kilo: "Kilo",
  lima: "Lima",
  mike: "Mike",
  november: "November",
  oscar: "Oscar",
  papa: "Papa",
  quebec: "Quebec",
  romeo: "Romeo",
  sierra: "Sierra",
  tango: "Tango",
  uniform: "Uniform",
  victor: "Victor",
  whiskey: "Whiskey",
  xray: "X-ray",
  yankee: "Yankee",
  zulu: "Zulu",
};

/** De la letra escrita a su palabra: `Z` es `zulu`. */
const POR_INICIAL = new Map<string, Letra>(
  FONETICO.map((l) => [ESCRITA[l][0]!.toUpperCase(), l]),
);
// La equis del alfabeto se dice «x-ray», así que su inicial escrita es la X.
POR_INICIAL.set("X", "xray");

/**
 * El prefijo de matrícula que le toca a un aeródromo, en letras.
 *
 * `SGAS` → `ZP`. `GCXO` y `LECU` → `EC`. Sin indicativo, el del juego.
 */
export function prefijoDe(id: string | null | undefined): string {
  const oaci = id?.toUpperCase() ?? "";
  if (oaci.startsWith("GC") || oaci.startsWith("LE")) return "EC";
  return "ZP";
}

/** Un indicativo montado: lo que se oye, lo que se lee y de dónde es. */
export interface Indicativo {
  /** Las cinco letras, como palabras del alfabeto: piezas de audio. */
  readonly letras: readonly Letra[];
  /** Lo que se escribe en la tarjeta: «Zulu Papa Alfa Bravo Charlie». */
  readonly dicho: string;
  /** Y la matrícula de verdad, que es lo que lleva pintado: «ZP-ABC». */
  readonly matricula: string;
}

/**
 * Sortea un indicativo para este aeródromo.
 *
 * Tres letras libres detrás del prefijo del país, que es como se matriculan
 * los aviones de verdad. `azar` se recibe de fuera para que el banco de
 * pruebas pueda pedir siempre el mismo y comprobar lo que monta.
 */
export function sortearIndicativo(
  id: string | null | undefined,
  azar: () => number = Math.random,
): Indicativo {
  const prefijo = prefijoDe(id);
  const letras: Letra[] = [];
  for (const c of prefijo) letras.push(POR_INICIAL.get(c)!);
  const sueltas: string[] = [];
  for (let i = 0; i < 3; i++) {
    const cual = FONETICO[Math.floor(azar() * FONETICO.length)] ?? "alfa";
    letras.push(cual);
    sueltas.push(ESCRITA[cual][0]!.toUpperCase());
  }
  return {
    letras,
    dicho: letras.map((l) => ESCRITA[l]).join(" "),
    matricula: `${prefijo}-${sueltas.join("")}`,
  };
}

/**
 * El relleno de la receta grabada: `{c1}`…`{c5}` a sus piezas.
 *
 * Las piezas del alfabeto se llaman `fonetico.<letra>` y las graba cualquier
 * voz que tenga que decir un indicativo. Ver `frases-para-grabar.mjs`.
 */
export function rellenoDe(i: Indicativo): Record<string, string> {
  const r: Record<string, string> = {};
  i.letras.forEach((l, n) => {
    r[`c${n + 1}`] = `fonetico.${l}`;
  });
  return r;
}

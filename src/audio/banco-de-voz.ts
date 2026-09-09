/**
 * El banco de voz: trozos grabados que se montan, como los GPS.
 *
 * Un GPS no graba «gire a la derecha en doscientos metros hacia la calle
 * Mayor». Graba **piezas** y las monta: `[gire a la derecha]` + `[en
 * doscientos metros]` + `[hacia]` + `[calle Mayor]`. Con unas pocas decenas de
 * trozos dice miles de frases distintas, y todas suenan a la misma persona
 * porque lo son.
 *
 * Aquí sale redondo, porque las frases del vuelo son justo así: `[seguí]` +
 * `[la raya verde]`, `[seguí]` + `[la calle]` + `[A]`, `[pará]` + `[en la
 * doble raya]`. Las piezas variables son pocas y acotadas —las letras de calle
 * y los números de pista— y con menos de cien trozos cortos se cubre el vuelo
 * entero. Ver #126.
 *
 * ## Esto es la parte que no toca el audio
 *
 * Aquí no hay Web Audio, ni `fetch`, ni DOM: entra un manifiesto y sale la
 * lista de piezas que hay que tocar, o la decisión de que no hay grabación y
 * habla el navegador. Todo lo que se puede equivocar sin un altavoz delante
 * está aquí y se comprueba sin navegador.
 *
 * ## Dos formatos, y no es por gusto
 *
 * Opus a 24 kbps es la mitad de peso que cualquier otra cosa y suena bien en
 * voz. **Safari no lo decodifica de forma fiable**, así que hay gemelo en AAC
 * y se elige el que el navegador diga que puede tocar. Es el mismo pack
 * horneado dos veces, no dos grabaciones. Ver #65.
 *
 * ## Y si falta la mitad, se usa la mitad
 *
 * El pack va a llegar por partes: primero el instructor en castellano, luego
 * el guaraní, luego la cabina. Una frase sin receta **no calla el juego**: cae
 * a la voz del navegador, que es lo que hay hoy. Así se puede grabar de diez
 * en diez y oír el resultado el mismo día, en vez de esperar a tenerlo todo.
 */

/** Los dos horneados del mismo pack. */
export type Formato = "opus" | "aac";

/** Qué se le pregunta al navegador para saber si puede con cada uno. */
export const MIMES: Readonly<Record<Formato, string>> = {
  opus: 'audio/ogg; codecs="opus"',
  aac: 'audio/mp4; codecs="mp4a.40.2"',
};

/** Y cómo se llaman los ficheros de cada uno. */
export const EXTENSIONES: Readonly<Record<Formato, string>> = {
  opus: "ogg",
  aac: "m4a",
};

/**
 * Qué formato se baja en este navegador.
 *
 * Opus primero **siempre que el navegador diga que sí de verdad**:
 * `canPlayType` contesta `""`, `"maybe"` o `"probably"`, y `"maybe"` de Opus
 * es justo lo que contesta Safari antes de no poder. Con `"maybe"` se baja el
 * gemelo en AAC, que pesa el doble y suena igual: mejor doscientos kilobytes
 * de más que una voz muda en la mitad de las tablets de un aula.
 */
export function elegirFormato(puede: (mime: string) => string): Formato | null {
  const di = (f: Formato): string => {
    try {
      return puede(MIMES[f]) ?? "";
    } catch {
      return "";
    }
  };
  if (di("opus") === "probably") return "opus";
  if (di("aac") === "probably" || di("aac") === "maybe") return "aac";
  if (di("opus") === "maybe") return "opus";
  return null;
}

/** Una pieza grabada: un trozo corto de voz con su duración. */
export interface Pieza {
  /** Cuánto dura, en milisegundos. Sirve para saber cuándo acaba la frase. */
  readonly ms: number;
}

/**
 * Lo que trae el pack: qué piezas hay y qué frase monta cada una.
 *
 * Las recetas van por **clave del diccionario**, no por texto: el texto cambia
 * con el idioma y con cualquier retoque de redacción, y una receta que dependa
 * de la redacción se rompe el día que alguien arregle una tilde.
 */
export interface Manifiesto {
  readonly version: number;
  readonly voz: string;
  readonly idioma: string;
  readonly piezas: Readonly<Record<string, Pieza>>;
  readonly recetas: Readonly<Record<string, readonly string[]>>;
}

/** Dónde vive el pack, y en qué caché se guarda una vez bajado. */
export const BASE = "data/voces";
export const CACHE = "oga-veve-voz-v1";

/** El fichero de una pieza, con el formato de este navegador. */
export function ficheroDe(
  pieza: string,
  formato: Formato,
  voz: string,
  base = BASE,
): string {
  return `${base}/${voz}/${pieza}.${EXTENSIONES[formato]}`;
}

/**
 * El hueco que rellena una pieza variable dentro de una receta.
 *
 * `{letra}` en la receta de «seguí la calle» se cambia por la pieza de la A,
 * de la B o de la que toque. Es exactamente lo que hace un GPS con el nombre
 * de la calle, y es lo que permite que veintiséis piezas de una sílaba cubran
 * todas las calles de rodaje de todos los aeropuertos del juego.
 */
const HUECO = /^\{(\w+)\}$/;

/**
 * Qué piezas hay que tocar para decir esta clave, o `null` si no hay receta.
 *
 * `null` no es un fallo: es «esta frase todavía no está grabada», y quien
 * llama sabe qué hacer con eso —hablar con la voz del navegador—. Ver
 * `queSuena`.
 */
export function recetaDe(
  manifiesto: Manifiesto | null,
  clave: string,
  relleno: Readonly<Record<string, string>> = {},
): readonly string[] | null {
  const receta = manifiesto?.recetas[clave];
  if (!receta || receta.length === 0) return null;
  const salida: string[] = [];
  for (const trozo of receta) {
    const hueco = HUECO.exec(trozo);
    if (!hueco) {
      // Una pieza que la receta nombra y el pack no trae deja la frase
      // coja, y media frase es peor que ninguna: se cae al navegador.
      if (!manifiesto?.piezas[trozo]) return null;
      salida.push(trozo);
      continue;
    }
    const puesto = relleno[hueco[1]!];
    if (!puesto || !manifiesto?.piezas[puesto]) return null;
    salida.push(puesto);
  }
  return salida;
}

/** Cuánto dura la frase montada, en milisegundos. */
export function cuantoDura(
  manifiesto: Manifiesto | null,
  piezas: readonly string[],
): number {
  let total = 0;
  for (const p of piezas) total += manifiesto?.piezas[p]?.ms ?? 0;
  return total;
}

/** Qué va a sonar cuando se pide una frase. */
export type Suena =
  | { readonly como: "grabado"; readonly piezas: readonly string[] }
  | { readonly como: "navegador" }
  | { readonly como: "callado" };

/**
 * La decisión, y está aquí para poder comprobarla sin altavoz.
 *
 * Tres caminos, en este orden: si hay receta suena la persona grabada; si no,
 * habla el navegador; y si el navegador tampoco puede —en guaraní no puede
 * nadie, porque no existe voz de guaraní en ningún sintetizador— se calla y
 * queda el dibujo, que es lo honesto.
 */
export function queSuena(
  manifiesto: Manifiesto | null,
  clave: string | null,
  hayNavegador: boolean,
  relleno: Readonly<Record<string, string>> = {},
): Suena {
  const piezas = clave ? recetaDe(manifiesto, clave, relleno) : null;
  if (piezas) return { como: "grabado", piezas };
  return hayNavegador ? { como: "navegador" } : { como: "callado" };
}

/**
 * Comprueba que un manifiesto es lo que dice ser.
 *
 * Lo que llega por la red no es de fiar aunque lo hayamos escrito nosotros: un
 * pack a medio subir, un JSON cortado o un `index.html` de un 404 disfrazado
 * dan un objeto que casi vale, y «casi» aquí significa que el instructor se
 * queda mudo sin decir por qué. Devuelve `null` en vez de lanzar: quedarse sin
 * grabaciones no puede romper un vuelo.
 */
export function leerManifiesto(crudo: unknown): Manifiesto | null {
  if (!crudo || typeof crudo !== "object") return null;
  const m = crudo as Partial<Manifiesto>;
  if (typeof m.version !== "number" || m.version < 1) return null;
  if (typeof m.voz !== "string" || !m.voz) return null;
  if (typeof m.idioma !== "string" || !m.idioma) return null;
  if (!m.piezas || typeof m.piezas !== "object") return null;
  if (!m.recetas || typeof m.recetas !== "object") return null;
  for (const [nombre, pieza] of Object.entries(m.piezas)) {
    if (!nombre || typeof pieza?.ms !== "number" || pieza.ms <= 0) return null;
  }
  for (const receta of Object.values(m.recetas)) {
    if (!Array.isArray(receta) || receta.some((t) => typeof t !== "string")) {
      return null;
    }
  }
  return m as Manifiesto;
}

/**
 * Qué piezas hace falta bajar para un manifiesto.
 *
 * Todas las que nombra alguna receta, sin repetir. No es lo mismo que «todas
 * las del pack»: un pack puede traer piezas de más —las veintiséis letras
 * aunque este aeropuerto solo use cuatro— y bajarlas todas es bajar de balde.
 */
export function loQueHaceFalta(manifiesto: Manifiesto): readonly string[] {
  const salida = new Set<string>();
  for (const receta of Object.values(manifiesto.recetas)) {
    for (const trozo of receta) {
      if (HUECO.test(trozo)) continue;
      if (manifiesto.piezas[trozo]) salida.add(trozo);
    }
  }
  // Y las piezas de hueco: no las nombra ninguna receta por su nombre, pero
  // sin ellas las recetas con hueco no se pueden montar nunca.
  for (const nombre of Object.keys(manifiesto.piezas)) {
    if (nombre.startsWith("hueco.")) salida.add(nombre);
  }
  return [...salida];
}

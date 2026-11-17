/**
 * **Las radioayudas en la carta**: el símbolo de cada una, del Anexo 4 de la
 * OACI, Apéndice 2 —el hexágono del VOR, el cuadrado del DME, los dos juntos
 * del VOR/DME, el punto con sus anillos de puntos del NDB y la pluma del
 * localizador del ILS—, y su caja al lado: identificador, frecuencia, canal y
 * morse, como en una carta de verdad. Los datos, del AD 2.19 de cada campo
 * (`world/radioayudas-publicadas.ts`).
 *
 * Van solo en el calco de la radio, el de Taguato Ruvicha, y no como dibujo
 * mudo en los de abajo: una radioayuda no se ve por la ventanilla, como el
 * monte o la costa, y un hexágono sin su caja no enseña nada —en una carta el
 * símbolo y la caja son una sola cosa—. Es el quinto escalón de #78, «las
 * balizas invisibles», que ya es para quien lee. Ver `calcosDe` en
 * `flight/escalera.ts` y la enmienda H22c del ADR 0021.
 *
 * Los símbolos son ficheros de `simbolos/`, como los demás, y el plano en
 * vuelo los pinta en su lienzo con los mismos trazados (`Path2D`): cambiar
 * el dibujo es cambiar su fichero.
 */

import VOR from "./simbolos/radioayuda-vor.svg?raw";
import VOR_DME from "./simbolos/radioayuda-vor-dme.svg?raw";
import DME from "./simbolos/radioayuda-dme.svg?raw";
import NDB from "./simbolos/radioayuda-ndb.svg?raw";
import ILS from "./simbolos/radioayuda-ils.svg?raw";
import type { ClaseDeEstacion, Estacion } from "../../world/radioayudas-publicadas";

const FICHEROS: Readonly<Record<ClaseDeEstacion, string>> = {
  VOR,
  "VOR/DME": VOR_DME,
  DME,
  NDB,
  ILS,
};

/** El SVG sin su papel de imagen suelta, para ir dentro de un texto que ya lo dice. */
const mudo = (svg: string): string =>
  svg.replace(/ role="img"/, ' aria-hidden="true" focusable="false"').replace(/ aria-label="[^"]*"/, "");

/** **El símbolo de una radioayuda**, en línea, para la ficha del campo. */
export function simboloDeRadioayuda(clase: ClaseDeEstacion): string {
  return mudo(FICHEROS[clase]);
}

/** La caja del símbolo en su fichero: `[x, y, ancho, alto]`. */
const cajaDe = (svg: string): [number, number, number, number] => {
  const v = svg.match(/viewBox="([^"]+)"/)?.[1]?.split(/\s+/).map(Number) ?? [-8, -8, 16, 16];
  return [v[0] ?? -8, v[1] ?? -8, v[2] ?? 16, v[3] ?? 16];
};

/** Los trazados de un fichero, para pintarlos en un lienzo. */
interface Trazo {
  readonly d: string;
  readonly relleno: string | null;
  readonly linea: string | null;
  readonly grosor: number;
}
const trazosDe = (svg: string): Trazo[] =>
  [...svg.matchAll(/<path d="([^"]+)"([^>]*)\/>/g)].map(([, d, attrs]) => {
    const a = (n: string): string | null => attrs!.match(new RegExp(` ${n}="([^"]+)"`))?.[1] ?? null;
    const relleno = a("fill");
    return {
      d: d!,
      relleno: relleno === "none" ? null : relleno,
      linea: a("stroke"),
      grosor: Number(a("stroke-width") ?? 1),
    };
  });

const TRAZOS: Readonly<Record<ClaseDeEstacion, Trazo[]>> = {
  VOR: trazosDe(VOR),
  "VOR/DME": trazosDe(VOR_DME),
  DME: trazosDe(DME),
  NDB: trazosDe(NDB),
  ILS: trazosDe(ILS),
};

/** Lo que mide el lado mayor de cada símbolo en su fichero, para escalarlo. */
const LADO: Readonly<Record<ClaseDeEstacion, number>> = Object.fromEntries(
  (Object.keys(FICHEROS) as ClaseDeEstacion[]).map((c) => {
    const [, , w, h] = cajaDe(FICHEROS[c]);
    return [c, Math.max(w, h)];
  }),
) as Record<ClaseDeEstacion, number>;

/** Los `Path2D` se hacen al pintar por primera vez: fuera del navegador no existen. */
const caminos = new Map<string, Path2D>();
const camino = (d: string): Path2D => {
  let p = caminos.get(d);
  if (!p) {
    p = new Path2D(d);
    caminos.set(d, p);
  }
  return p;
};

/** Pinta los trazados de un fichero con el halo de papel debajo, centrado en el origen del lienzo. */
function pintarTrazos(g: CanvasRenderingContext2D, trazos: readonly Trazo[], papel: string, halo: number): void {
  // El halo, debajo de todo: un símbolo azul sobre monte verde oscuro no está.
  g.lineJoin = "round";
  for (const t of trazos) {
    g.strokeStyle = papel;
    g.lineWidth = t.grosor + halo;
    g.stroke(camino(t.d));
  }
  for (const t of trazos) {
    if (t.relleno) {
      g.fillStyle = t.relleno;
      g.fill(camino(t.d));
    }
    if (t.linea) {
      g.strokeStyle = t.linea;
      g.lineWidth = t.grosor;
      g.stroke(camino(t.d));
    }
  }
}

/**
 * **Pinta el símbolo de una estación** en un lienzo, centrado en `(x, y)` y
 * con `lado` píxeles de lado mayor. El ILS no va por aquí: es una pluma
 * sobre la pista, ver `pintarPluma`.
 */
export function pintarRadioayuda(
  g: CanvasRenderingContext2D,
  clase: Exclude<ClaseDeEstacion, "ILS">,
  x: number,
  y: number,
  lado: number,
  papel: string,
): void {
  const k = lado / LADO[clase];
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  pintarTrazos(g, TRAZOS[clase], papel, 2.4 / k);
  g.restore();
}

/** Lo que mide de largo la pluma en su fichero, de la punta a la cola. */
export const LARGO_DE_LA_PLUMA = 60;

/**
 * **Pinta la pluma del localizador**: la punta en el umbral, `(x, y)`, y la
 * cola hacia fuera, por donde se llega, `largo` píxeles. `rumbo` es hacia
 * dónde apunta la cola en la pantalla, en radianes desde arriba y en el
 * sentido del reloj.
 */
export function pintarPluma(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  rumbo: number,
  largo: number,
  papel: string,
): void {
  const k = largo / LARGO_DE_LA_PLUMA;
  g.save();
  g.translate(x, y);
  // El fichero va con la cola hacia abajo (+y): se gira lo que falte.
  g.rotate(rumbo + Math.PI);
  g.scale(k, k);
  pintarTrazos(g, TRAZOS.ILS, papel, 2 / k);
  g.restore();
}

/**
 * **La pluma en SVG**, para el dibujo de la ficha: la punta en `(x, y)` y la
 * cola hacia `rumbo` grados (en el dibujo, desde arriba y con el reloj),
 * `largo` unidades del dibujo.
 */
export function plumaEnSvg(x: number, y: number, rumbo: number, largo: number): string {
  const k = largo / LARGO_DE_LA_PLUMA;
  const cuerpo = ILS.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const r = (n: number): string => (Math.round(n * 1000) / 1000).toString();
  return `<g class="pistas__pluma" transform="translate(${r(x)} ${r(y)}) rotate(${r(rumbo + 180)}) scale(${r(k)})">${cuerpo}</g>`;
}

/** El símbolo de una estación en SVG, para el dibujo de la ficha: centrado en `(x, y)`, `lado` unidades. */
export function simboloEnSvg(clase: Exclude<ClaseDeEstacion, "ILS">, x: number, y: number, lado: number): string {
  const k = lado / LADO[clase];
  const cuerpo = FICHEROS[clase].replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const r = (n: number): string => (Math.round(n * 1000) / 1000).toString();
  return `<g class="pistas__radioayuda" transform="translate(${r(x)} ${r(y)}) scale(${r(k)})">${cuerpo}</g>`;
}

/**
 * **La caja de una radioayuda**, renglón a renglón, como en una carta: el
 * identificador con su frecuencia; el canal DME, si lo tiene; y el morse,
 * letra a letra. El ILS lleva delante su pista: «ILS 12 INOR 108.700».
 *
 * Las cifras van como las imprime el AIP de cada país —«117.700» en España,
 * «115.9» en Paraguay—, y el NDB lleva su «kHz» para que no se lea como una
 * frecuencia de VHF.
 */
export function cajaDeRadioayuda(e: Estacion): { readonly titulo: string; readonly canal: string | null; readonly morse: string } {
  const frecuencia = e.cifra ? ` ${e.cifra}${e.unidad === "kHz" ? " kHz" : ""}` : "";
  const titulo = e.clase === "ILS" ? `ILS ${e.pista} ${e.id}${frecuencia}` : `${e.id}${frecuencia}`;
  const canal = e.canal ? (e.idDme ? `DME ${e.idDme} ${e.canal}` : e.canal) : null;
  return { titulo, canal, morse: morseEscrito(e.morse) };
}

/**
 * **El morse escrito**, como en la caja de una carta: el punto gordo (•) y la
 * raya (–), con un hueco fino entre los elementos de una letra —dos rayas
 * pegadas se leían como una sola larga— y uno ancho entre letra y letra, como
 * se oye la pausa entre ellas. El punto medio de la tabla (·) era, en la
 * letra estrecha de la carta, un puntito que no se veía.
 */
export const morseEscrito = (letras: readonly string[]): string =>
  letras.map((l) => [...l].map((c) => (c === "·" ? "•" : "–")).join("\u2009")).join("\u2003");

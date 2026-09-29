/**
 * **El volumen, fino y a mano**, y el silencio de un toque.
 *
 * Eran tres pasos —normal, bajo, mudo— recorridos pulsando el altavoz, y la
 * decisión estaba escrita con su porqué: un deslizador exige precisión con el
 * dedo y no dice de un vistazo dónde está. Sigue siendo verdad para el gesto
 * de los pequeños, y por eso **el altavoz se queda**: un toque calla, otro
 * toque devuelve lo que había. Lo que no cubrían tres pasos es lo otro, dicho
 * jugando: «un control de volumen en el juego, abajo, porque tengo música de
 * fondo y a la vez el juego». Con música puesta el volumen bueno no es normal
 * ni bajo: es el que deja oír las dos cosas, y ése solo lo encuentra una mano
 * sobre un deslizador.
 *
 * Así que son dos mandos sobre **un** estado —dónde está el deslizador y si
 * está callado—, y los tres pasos de antes siguen existiendo como lectura de
 * ese estado: el dibujo del altavoz y la fila de los ajustes los necesitan, y
 * quien tenía el juego guardado en «bajo» lo encuentra en bajo.
 *
 * ## El deslizador va en posición, y el oído en decibelios
 *
 * La ganancia es la posición al cuadrado. Con una recta, casi todo el
 * recorrido se oye igual de alto y todo el cambio se amontona en el último
 * dedo de abajo, porque el oído no oye amplitudes: oye proporciones. El
 * cuadrado es la aproximación de siempre, sin tablas, y deja los dos pasos de
 * antes donde estaban: el normal (0,85) a nueve décimas del recorrido y el
 * bajo (0,3) a poco más de la mitad.
 *
 * ## Se recuerda en el guardado, con lo demás
 *
 * En el mismo perfil y la misma clave de siempre —`volumen`, con el paso— y
 * una nueva al lado con la posición fina. `datos/guardado.ts` ya envuelve el
 * `localStorage` entero en su `try/catch` y frena las escrituras, que es justo
 * lo que pide un deslizador: arrastrarlo son treinta cambios en un segundo.
 */

import { leerAjuste, leerTexto, ponerAjuste, ponerTexto } from "../datos/guardado";
import type { Volumen as Paso } from "../ui/ajustes";

export interface Volumen {
  /** Dónde está el deslizador, de 0 a 1. Se conserva callado. */
  readonly posicion: number;
  /** Si está callado. El deslizador a cero también lo está. */
  readonly mudo: boolean;
}

/** Dónde caen en el deslizador los dos pasos que suenan. */
export const POSICION: Readonly<Record<"normal" | "bajo", number>> = {
  normal: Math.sqrt(0.85),
  bajo: Math.sqrt(0.3),
};

export const DE_FABRICA: Volumen = { posicion: POSICION.normal, mudo: false };

const acotar = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** La ganancia del maestro que toca con este volumen. */
export function gananciaDe(v: Volumen): number {
  return v.mudo ? 0 : v.posicion * v.posicion;
}

/**
 * El paso de antes que mejor describe este volumen.
 *
 * Lo leen el dibujo del altavoz —dos ondas, una o el aspa— y la fila de los
 * ajustes. La raya está a medio camino entre los dos pasos.
 */
export function pasoDe(v: Volumen): Paso {
  if (v.mudo || v.posicion <= 0) return "mudo";
  return v.posicion >= (POSICION.normal + POSICION.bajo) / 2 ? "normal" : "bajo";
}

/** El volumen que pone uno de los tres pasos, sin perder la posición al callar. */
export function conPaso(paso: Paso, antes: Volumen): Volumen {
  if (paso === "mudo") return { posicion: antes.posicion, mudo: true };
  return { posicion: POSICION[paso], mudo: false };
}

/** El deslizador en una posición. A cero es callar: ahí no suena nada. */
export function conPosicion(posicion: number): Volumen {
  const p = Number.isFinite(posicion) ? acotar(posicion) : POSICION.normal;
  return { posicion: p, mudo: p <= 0 };
}

/**
 * **El toque del altavoz**: callar, o devolver lo que había.
 *
 * Si se calló bajando el deslizador del todo no hay «lo que había» al que
 * volver, y un altavoz que se destacha y sigue sin sonar es un botón roto:
 * vuelve al normal.
 */
export function alternar(v: Volumen): Volumen {
  if (!v.mudo && v.posicion > 0) return { posicion: v.posicion, mudo: true };
  return {
    posicion: v.posicion > 0 ? v.posicion : POSICION.normal,
    mudo: false,
  };
}

/** Lo que el deslizador enseña: callado, abajo del todo. */
export function enElMando(v: Volumen): number {
  return v.mudo ? 0 : v.posicion;
}

/** La clave de la posición fina, al lado de la de siempre. */
const CLAVE_FINA = "volumen.nivel";

/**
 * El volumen guardado.
 *
 * Sin la posición fina —un guardado de antes de que existiera— manda el paso,
 * que es lo que había: quien lo dejó en «bajo» lo encuentra en bajo.
 */
export function leerVolumen(): Volumen {
  try {
    const paso = leerTexto("volumen");
    const fina = leerAjuste(CLAVE_FINA);
    const mudo = paso === "mudo";
    if (typeof fina === "number" && Number.isFinite(fina)) {
      const posicion = acotar(fina);
      return { posicion, mudo: mudo || posicion <= 0 };
    }
    if (paso === "bajo") return { posicion: POSICION.bajo, mudo: false };
    return { posicion: POSICION.normal, mudo };
  } catch {
    // Sin almacenamiento se arranca con el de fábrica. Se juega igual.
    return DE_FABRICA;
  }
}

/** Y guardarlo: el paso en su clave de siempre y la posición en la suya. */
export function guardarVolumen(v: Volumen): void {
  try {
    ponerTexto("volumen", pasoDe(v));
    ponerAjuste(CLAVE_FINA, Math.round(v.posicion * 1000) / 1000);
  } catch {
    // No poder recordarlo no puede romper nada.
  }
}

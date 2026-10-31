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
 * cuadrado es la aproximación de siempre, sin tablas: el normal (0,85) cae a
 * nueve décimas del recorrido y el bajo (0,25), en la mitad.
 *
 * ## Bajo de partida, porque en un aula hay veintiocho
 *
 * Visto en aulas de verdad (`oksigenia-hq/shared/diseno-por-edades.md`, «la
 * voz empieza baja» y «el volumen, regulable y bajo de partida»): veintiocho
 * Chromebooks hablando a la vez dieron risas y ruido y rompieron el trabajo, y
 * en la pizarra de un primero una voz que sale de golpe muy alta asustó a los
 * pequeños. Así que la primera vez **suena a un cuarto**: una ganancia de
 * 0,25, que es lo que ponen las ayudas con voz de Oksigenia
 * (`audio.volume = 0.25`, que es amplitud y no recorrido). Aquí el deslizador
 * va en posición y la ganancia es su cuadrado, así que un cuarto de ganancia
 * es el deslizador **a medio recorrido**: −12 dB del tope, que el oído oye
 * como algo menos de la mitad de fuerte. Un cuarto del recorrido serían
 * −24 dB, y en el altavoz de una tablet con el aula hablando eso es no oír a
 * la instructora, que a los cuatro años es el único canal que no se lee. Y
 * el paso «bajo» de los ajustes es ese mismo cuarto: un solo bajo en todo el
 * juego, y el que sale de fábrica.
 *
 * ## Se recuerda en el aparato, no en el perfil
 *
 * El volumen es de la sala y no de quien juega: se ajusta una vez en la
 * pizarra y vale para todos. Guardado en el perfil, cada piloto nuevo de la
 * tablet del aula volvía a arrancar con el de fábrica, y cambiar de piloto
 * cambiaba el volumen. Así que va **fuera del guardado de los perfiles**, en
 * dos claves del aparato:
 *
 * - `oks-volumen`, la ganancia de 0 a 1. Es la clave que ya usan las ayudas
 *   con voz de Oksigenia —«uno para todos los juegos del aparato»—, con el
 *   mismo significado: donde compartan origen, lo que se ajustó en uno vale
 *   en el otro.
 * - `oga-veve:mudo`, si está callado. El silencio es de este juego: callar la
 *   pizarra aquí no tiene por qué callar la ayuda de otra página.
 *
 * Quien ya tenía un volumen elegido en su perfil lo encuentra igual: la
 * primera vez que se lee sin nada en el aparato se adopta el del perfil que
 * esté jugando y se pasa al aparato. Se escribe solo al soltar el deslizador o
 * al tocar el altavoz, así que no hace falta el freno del guardado.
 */

import { leerAjuste, leerTexto } from "../datos/guardado";
import type { Volumen as Paso } from "../ui/ajustes";

export interface Volumen {
  /** Dónde está el deslizador, de 0 a 1. Se conserva callado. */
  readonly posicion: number;
  /** Si está callado. El deslizador a cero también lo está. */
  readonly mudo: boolean;
}

/**
 * Dónde caen en el deslizador los dos pasos que suenan. El bajo es el cuarto
 * de ganancia del aula, a medio recorrido: ver arriba.
 */
export const POSICION: Readonly<Record<"normal" | "bajo", number>> = {
  normal: Math.sqrt(0.85),
  bajo: Math.sqrt(0.25),
};

/** **El de fábrica, bajo**: lo que suena la primera vez en un aparato. */
export const DE_FABRICA: Volumen = { posicion: POSICION.bajo, mudo: false };

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
  const p = Number.isFinite(posicion) ? acotar(posicion) : DE_FABRICA.posicion;
  return { posicion: p, mudo: p <= 0 };
}

/**
 * **El toque del altavoz**: callar, o devolver lo que había.
 *
 * Si se calló bajando el deslizador del todo no hay «lo que había» al que
 * volver, y un altavoz que se destacha y sigue sin sonar es un botón roto:
 * vuelve al de fábrica, que es bajo. Volver a tope en un aula sería el susto
 * que esto quiere evitar.
 */
export function alternar(v: Volumen): Volumen {
  if (!v.mudo && v.posicion > 0) return { posicion: v.posicion, mudo: true };
  return {
    posicion: v.posicion > 0 ? v.posicion : DE_FABRICA.posicion,
    mudo: false,
  };
}

/** Lo que el deslizador enseña: callado, abajo del todo. */
export function enElMando(v: Volumen): number {
  return v.mudo ? 0 : v.posicion;
}

/** Las dos claves del aparato: la ganancia, compartida, y el silencio, nuestro. */
export const CLAVE_DEL_APARATO = "oks-volumen";
export const CLAVE_DEL_SILENCIO = "oga-veve:mudo";

/** La de antes, en el perfil: la posición fina al lado del paso. */
const CLAVE_FINA_DEL_PERFIL = "volumen.nivel";

const almacen = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

/**
 * El volumen que había en el perfil que juega, de antes de que fuera del
 * aparato, o `null` si nunca se tocó. Sin la posición fina manda el paso:
 * quien lo dejó en «bajo» con los tres pasos lo encuentra en bajo.
 */
function delPerfil(): Volumen | null {
  const paso = leerTexto("volumen");
  const fina = leerAjuste(CLAVE_FINA_DEL_PERFIL);
  const mudo = paso === "mudo";
  if (typeof fina === "number" && Number.isFinite(fina)) {
    const posicion = acotar(fina);
    return { posicion, mudo: mudo || posicion <= 0 };
  }
  if (paso === "bajo") return { posicion: POSICION.bajo, mudo: false };
  if (paso === "normal" || paso === "mudo") return { posicion: POSICION.normal, mudo };
  return null;
}

/**
 * El volumen de este aparato.
 *
 * Sin nada en el aparato, el del perfil que juega si alguna vez se tocó —y se
 * pasa al aparato, para que cambiar de piloto ya no lo mueva—, y si no, el de
 * fábrica, que es bajo.
 */
export function leerVolumen(): Volumen {
  const s = almacen();
  if (!s) return DE_FABRICA;
  try {
    const crudo = s.getItem(CLAVE_DEL_APARATO);
    const ganancia = crudo === null ? NaN : Number.parseFloat(crudo);
    if (Number.isFinite(ganancia)) {
      const posicion = Math.sqrt(acotar(ganancia));
      return { posicion, mudo: s.getItem(CLAVE_DEL_SILENCIO) === "1" || posicion <= 0 };
    }
    const antes = delPerfil();
    if (antes) {
      guardarVolumen(antes);
      return antes;
    }
    return DE_FABRICA;
  } catch {
    // Sin almacenamiento se arranca con el de fábrica. Se juega igual.
    return DE_FABRICA;
  }
}

/** Y guardarlo en el aparato: la ganancia y si está callado. */
export function guardarVolumen(v: Volumen): void {
  const s = almacen();
  if (!s) return;
  try {
    s.setItem(CLAVE_DEL_APARATO, String(Math.round(v.posicion * v.posicion * 1000) / 1000));
    s.setItem(CLAVE_DEL_SILENCIO, v.mudo ? "1" : "0");
  } catch {
    // No poder recordarlo no puede romper nada.
  }
}

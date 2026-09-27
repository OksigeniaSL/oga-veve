/**
 * La información de tráfico: «traffic, two o'clock, one thousand feet above».
 *
 * Se vio un rombo con su «+13» en la pantalla del TCAS y nada por la
 * ventanilla, y nadie dijo nada. En un cielo de verdad no pasa así: cuando otro
 * avión se te acerca, **la torre o el control te lo cuentan por radio antes de
 * que el TCAS tenga nada que avisar**, con la hora del reloj a la que mirar,
 * a cuántas millas y a qué altura. Es de las frases que más se oyen en una
 * frecuencia, y es la que enseña a buscar a otro avión con los ojos: primero
 * te dicen dónde, después lo encuentras.
 *
 * ## Cuándo se da
 *
 * Cuando el otro pasa a ser **tráfico próximo**, que es lo que el TCAS pinta
 * con el rombo relleno: dentro de seis millas y de mil doscientos pies —ver
 * `CERCA_MILLAS` en `tcas.ts`—. La cuenta es la misma para que la radio y la
 * pantalla digan lo mismo del mismo avión.
 *
 * **Y a todos, lleven TCAS o no.** La información de tráfico es un servicio
 * del control, no del avión: el controlador la da mirando su radar, y la
 * recibe igual el reactor que la avioneta de escuela. Por eso esto no mira el
 * equipo del avión, mira dónde están los dos.
 *
 * ## Una vez por pasada
 *
 * Se cuenta **una vez** mientras el otro siga cerca, y vuelve a contarse solo
 * si se aleja de verdad —más de ocho millas o de dos mil pies— y vuelve a
 * acercarse: lo que rearma una información es que cambie lo que pasa, no que
 * pase un rato. Un «traffic» repetido cada medio minuto por el mismo avión
 * que sigue ahí no informa de nada.
 *
 * Y de uno en uno: si dos se acercan a la vez, el segundo espera un rato para
 * no pisar al primero. No es un reloj que rearme a nadie: es cola.
 *
 * ## Cuándo no
 *
 * En tierra no —los que ruedan los cuenta la torre de otra manera—, ni contra
 * quien está posado, ni por debajo de quinientos pies, que es donde se calla
 * también la voz del TCAS: despegando o en la toma la cabeza está en otra
 * cosa. Ni con el terreno avisando, que manda sobre todo.
 */

import {
  CERCA_MILLAS,
  CERCA_PIES,
  horaDelReloj,
  type AvisoDeTrafico,
  type Intruso,
} from "./tcas";

const PIE = 0.3048;
const MILLA = 1852;

/** Pasado esto, el que se contó se olvida: si vuelve, es otra pasada. NM. */
export const SE_OLVIDA_MILLAS = 8;
/** Y en altura, ft. */
export const SE_OLVIDA_PIES = 2000;

/**
 * Por debajo de esto sobre el suelo no se da, m: quinientos pies, el mismo
 * listón que la voz del TCAS. Ver `CALLADO_POR_DEBAJO` en `tcas.ts`.
 */
export const DESDE_ALTURA = 152;

/** Entre dos informaciones de dos tráficos distintos, s. Ver la cabecera. */
export const ENTRE_DOS = 15;

/** Por debajo de esto, m, el otro va «a tu misma altura»: trescientos pies. */
export const A_LA_MISMA_ALTURA = 91;

/** Lo que hace falta saber de quien recibe la información. */
export interface QuienEscucha {
  readonly x: number;
  /** Altitud, m. */
  readonly y: number;
  readonly z: number;
  /** Rumbo verdadero, grados. */
  readonly rumbo: number;
  /** Sobre el suelo, m. */
  readonly sobreElSuelo: number;
  readonly enElSuelo: boolean;
  /** Si hay algo que manda más: el aviso de terreno. */
  readonly callado: boolean;
}

export class InformacionDeTrafico {
  private readonly contados = new Set<string>();
  private desdeLaUltima = Infinity;

  /** Los que ya se contaron en esta pasada. */
  get yaContados(): ReadonlySet<string> {
    return this.contados;
  }

  /** Vuelo nuevo: nadie está contado. */
  reiniciar(): void {
    this.contados.clear();
    this.desdeLaUltima = Infinity;
  }

  /**
   * Ese ya se contó por otro lado —el aviso del TCAS, la instructora
   * señalándolo por la ventanilla—: un suceso, una sola voz.
   */
  darPorContado(id: string): void {
    this.contados.add(id);
  }

  /**
   * Un fotograma. Devuelve el tráfico del que toca informar ahora, o `null`,
   * que es lo normal.
   */
  paso(
    dt: number,
    yo: QuienEscucha,
    intrusos: readonly Intruso[],
  ): AvisoDeTrafico | null {
    this.desdeLaUltima += dt;
    /*
     * Primero se olvida a los que se fueron de verdad, y se mira siempre,
     * también en tierra: si no, uno contado antes de aterrizar seguiría
     * contado en el vuelo siguiente.
     */
    for (const id of [...this.contados]) {
      const i = intrusos.find((q) => q.id === id);
      if (
        !i ||
        i.enElSuelo ||
        Math.hypot(i.x - yo.x, i.y - yo.y, i.z - yo.z) / MILLA >
          SE_OLVIDA_MILLAS ||
        Math.abs(i.y - yo.y) / PIE > SE_OLVIDA_PIES
      )
        this.contados.delete(id);
    }
    if (yo.enElSuelo || yo.callado || yo.sobreElSuelo < DESDE_ALTURA)
      return null;
    if (this.desdeLaUltima < ENTRE_DOS) return null;

    let mejor: { i: Intruso; r: number } | null = null;
    for (const i of intrusos) {
      if (i.enElSuelo || this.contados.has(i.id)) continue;
      const r = Math.hypot(i.x - yo.x, i.y - yo.y, i.z - yo.z) / MILLA;
      if (r > CERCA_MILLAS || Math.abs(i.y - yo.y) / PIE > CERCA_PIES) continue;
      if (!mejor || r < mejor.r) mejor = { i, r };
    }
    if (!mejor) return null;
    const { i } = mejor;
    this.contados.add(i.id);
    this.desdeLaUltima = 0;
    const dx = i.x - yo.x;
    const dz = i.z - yo.z;
    return {
      id: i.id,
      hora: horaDelReloj((Math.atan2(dx, -dz) * 180) / Math.PI, yo.rumbo),
      relativa: i.y - yo.y,
      distancia: Math.hypot(dx, dz),
    };
  }
}

/** De qué lado queda algo a esa hora del reloj, para decirlo en casa. */
export function ladoDeLaHora(
  hora: number,
): "delante" | "derecha" | "detras" | "izquierda" {
  return hora >= 11 || hora <= 1
    ? "delante"
    : hora <= 4
      ? "derecha"
      : hora <= 7
        ? "detras"
        : "izquierda";
}

/** Si va por encima, por debajo o a tu altura. */
export function alturaDelOtro(relativa: number): "arriba" | "nivel" | "abajo" {
  return Math.abs(relativa) < A_LA_MISMA_ALTURA
    ? "nivel"
    : relativa > 0
      ? "arriba"
      : "abajo";
}

/**
 * La frase de radio, en inglés aeronáutico: indicativo, «traffic», la hora,
 * la distancia y la altura relativa.
 *
 * Es el orden del Doc 4444 de la OACI para la información de tráfico —«TRAFFIC
 * (number) O'CLOCK (distance) … (level)»— con la altura dicha respecto a quien
 * escucha, que es como la da un controlador cuando conoce las dos: «one
 * thousand feet above». En millas y en pies aunque la cabina vaya en metros:
 * en la radio el tráfico se da así en todo el mundo.
 */
export function informacionEnRadio(
  indicativo: string,
  a: Pick<AvisoDeTrafico, "hora" | "relativa" | "distancia">,
): string {
  const millas = Math.max(1, Math.round(a.distancia / MILLA));
  const distancia = `${millas} ${millas === 1 ? "mile" : "miles"}`;
  const pies = Math.round(Math.abs(a.relativa) / PIE / 100) * 100;
  const altura =
    alturaDelOtro(a.relativa) === "nivel"
      ? "same altitude"
      : `${pies} feet ${a.relativa > 0 ? "above" : "below"}`;
  return `${indicativo}, traffic, ${a.hora} o'clock, ${distancia}, ${altura}`;
}

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
 *
 * ## Y con la boca ocupada, pide turno
 *
 * Esperaba a que nadie hablara ni esperara turno, y en una final —la torre
 * con tu permiso, la instructora con los aros, la megafonía en el mismo
 * turno— eso no llega: camino de Tenerife Sur, el del circuito a doscientos
 * pies en tu final y ni una palabra. Ahora se pide en cuanto toca, con el peso
 * de lo que es para ti, y espera su turno. Mientras espera, se mira en cada
 * paso si sigue siendo verdad —ver `revisar`—: si el otro se fue, se retira;
 * si lo que habría que decir ya es otro —otra hora del reloj, otras millas—,
 * se pide con lo de ahora. Y **contada quiere decir oída**: si se cae sin
 * sonar, no cuenta, y se vuelve a dar si sigue cerca.
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

/**
 * **Cómo se diría esta información**: la clave con la que espera turno en la
 * boca, que lleva dentro lo que dice —la hora, las millas, la altura—. Dos
 * informaciones del mismo avión que se dicen igual son la misma frase.
 */
export type ComoSeDice = (a: AvisoDeTrafico) => string;

/** La que espera turno en la boca. Ver `InformacionDeTrafico.esperando`. */
export interface EnLaCola {
  /** Su número, para saber de cuál habla quien avisa. Ver `seOyo`. */
  readonly n: number;
  readonly id: string;
  /** Con qué clave espera turno. Ver `ComoSeDice`. */
  readonly dice: string;
}

/**
 * Lo que hay que hacer con la que espera turno, según `revisar`: retirarla y,
 * si sigue siendo verdad pero ya se diría de otra forma, pedirla con lo de
 * ahora.
 */
export interface Revision {
  /** La clave de turno que se retira de la boca. */
  readonly retirar: string;
  /** Y la información de ahora, si se vuelve a pedir, con su número. */
  readonly otra?: { readonly aviso: AvisoDeTrafico; readonly n: number };
}

export class InformacionDeTrafico {
  private readonly contados = new Set<string>();
  private desdeLaUltima = Infinity;
  /**
   * **Por qué no se informó en el último paso**, para el banco: un cercano
   * del que nadie dice nada se puede deber a cinco cosas distintas, y sin
   * esto solo se podía adivinar cuál. `null` es que se informó o que no había
   * nadie cerca.
   */
  porQueCalla: string | null = null;
  /**
   * La que espera turno, y cuánto hacía de la anterior cuando se pidió: si no
   * llega a sonar, no cuenta como la última. Ver `noSono`.
   */
  private pendiente: (EnLaCola & { anterior: number }) | null = null;
  /** Cuántas se han pedido, para numerarlas. */
  private pedidas = 0;
  /** Cuánto hacía de la anterior cuando `paso` dio la última. */
  private anterior = Infinity;

  /** Los que ya se contaron en esta pasada, o esperan turno para contarse. */
  get yaContados(): ReadonlySet<string> {
    return this.contados;
  }

  /**
   * **Si a ese ya se le informó de verdad**: contado y no esperando turno. Lo
   * pregunta el aviso del TCAS para saber si se explica o solo canta la caja:
   * una información que todavía no ha sonado no ha explicado nada.
   */
  yaInformado(id: string): boolean {
    return this.contados.has(id) && this.pendiente?.id !== id;
  }

  /** La que espera turno en la boca, si hay una. */
  get esperando(): EnLaCola | null {
    return this.pendiente;
  }

  /** Vuelo nuevo: nadie está contado. */
  reiniciar(): void {
    this.contados.clear();
    this.desdeLaUltima = Infinity;
    this.pendiente = null;
    this.anterior = Infinity;
  }

  /**
   * Ese ya se contó por otro lado —el aviso del TCAS, la instructora
   * señalándolo por la ventanilla—: un suceso, una sola voz.
   *
   * Devuelve la clave de turno de la información de ese mismo avión que
   * esperaba en la boca, si había una, para que se retire: lo cuenta otro.
   */
  darPorContado(id: string): string | null {
    this.contados.add(id);
    const p = this.pendiente;
    if (p?.id !== id) return null;
    this.pendiente = null;
    return p.dice;
  }

  /**
   * **Se pidió en la boca** la que acaba de dar `paso`, con esta clave de
   * turno. Devuelve su número, que es con lo que se avisa de lo que le pase.
   */
  pedida(id: string, dice: string): number {
    const n = ++this.pedidas;
    this.pendiente = { n, id, dice, anterior: this.anterior };
    return n;
  }

  /**
   * **Sonó**: empezó a decirse, o no tenía con qué y su tarjeta ya se vio.
   * Desde aquí cuenta como dicha.
   */
  seOyo(n: number): void {
    if (this.pendiente?.n === n) this.pendiente = null;
  }

  /**
   * **Se cayó de la cola sin sonar**: no está dicha. Se descuenta, y si sigue
   * cerca se vuelve a dar en el paso siguiente, sin esperar el rato que va
   * entre dos: ese rato es para que no se pisen dos que se oyen.
   */
  seCayo(n: number): void {
    const p = this.pendiente;
    if (p?.n === n) this.noSono(p);
  }

  private noSono(p: EnLaCola & { anterior: number }): void {
    this.pendiente = null;
    this.contados.delete(p.id);
    this.desdeLaUltima = p.anterior + this.desdeLaUltima;
  }

  /**
   * **Si la que espera turno sigue siendo verdad**, mirando dónde está el
   * otro ahora. Se mira en cada paso, antes de `paso`.
   *
   * - Si ya no se daría —se alejó, se posó, bajaste de quinientos pies o
   *   avisa el terreno—, se retira, y no cuenta como dicha.
   * - Si se daría, pero **diciendo otra cosa** —otra hora del reloj, otras
   *   millas, otra altura—, se retira y se pide con lo de ahora: una
   *   información que espera turno diez segundos no puede decir dónde estaba
   *   el otro, tiene que decir dónde está.
   */
  revisar(
    yo: QuienEscucha,
    intrusos: readonly Intruso[],
    comoSeDice: ComoSeDice,
  ): Revision | null {
    const p = this.pendiente;
    if (!p) return null;
    const i = intrusos.find((q) => q.id === p.id);
    const sigue =
      !!i &&
      !i.enElSuelo &&
      !yo.enElSuelo &&
      !yo.callado &&
      yo.sobreElSuelo >= DESDE_ALTURA &&
      Math.hypot(i.x - yo.x, i.y - yo.y, i.z - yo.z) / MILLA <= CERCA_MILLAS &&
      Math.abs(i.y - yo.y) / PIE <= CERCA_PIES;
    if (!sigue || !i) {
      this.noSono(p);
      return { retirar: p.dice };
    }
    const aviso = avisoDe(i, yo);
    const dice = comoSeDice(aviso);
    if (dice === p.dice) return null;
    const n = ++this.pedidas;
    this.pendiente = { ...p, n, dice };
    return { retirar: p.dice, otra: { aviso, n } };
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
    this.porQueCalla = yo.enElSuelo
      ? "en el suelo"
      : yo.callado
        ? "callado"
        : yo.sobreElSuelo < DESDE_ALTURA
          ? "bajo"
          : // Y de una en una: la que espera turno, primero.
            this.pendiente
            ? "esperando turno"
            : this.desdeLaUltima < ENTRE_DOS
              ? "entre dos"
              : null;
    if (this.porQueCalla) return null;

    let mejor: { i: Intruso; r: number } | null = null;
    for (const i of intrusos) {
      if (i.enElSuelo || this.contados.has(i.id)) continue;
      const r = Math.hypot(i.x - yo.x, i.y - yo.y, i.z - yo.z) / MILLA;
      if (r > CERCA_MILLAS || Math.abs(i.y - yo.y) / PIE > CERCA_PIES) continue;
      if (!mejor || r < mejor.r) mejor = { i, r };
    }
    if (!mejor) {
      this.porQueCalla = this.contados.size ? "ya contado" : "nadie cerca";
      return null;
    }
    const { i } = mejor;
    this.contados.add(i.id);
    this.anterior = this.desdeLaUltima;
    this.desdeLaUltima = 0;
    return avisoDe(i, yo);
  }
}

/** Dónde está el otro visto desde quien escucha: la hora, la altura, la distancia. */
function avisoDe(i: Intruso, yo: QuienEscucha): AvisoDeTrafico {
  const dx = i.x - yo.x;
  const dz = i.z - yo.z;
  return {
    id: i.id,
    hora: horaDelReloj((Math.atan2(dx, -dz) * 180) / Math.PI, yo.rumbo),
    relativa: i.y - yo.y,
    distancia: Math.hypot(dx, dz),
  };
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
 * Lo que se dice del otro, ya en las unidades de la radio: la hora del reloj,
 * las millas y los cientos de pies de diferencia —`null` a la misma altura—.
 *
 * Una sola cuenta para lo que se lee y lo que se oye. La frase escrita y la
 * receta grabada se montaban por separado, y el día que una redondeara
 * distinto que la otra la tira de la radio diría «2 miles» con la voz
 * diciendo «three miles».
 *
 * Las millas van de una a seis, que es hasta donde mira el TCAS —ver
 * `CERCA_MILLAS`—, y los pies de trescientos a mil doscientos: por debajo de
 * trescientos es la misma altura y por encima de mil doscientos no se avisa.
 * Se sujetan a esos topes porque cada cifra es una grabación, y una cifra
 * sin grabación deja la frase entera en la voz del navegador.
 */
export function cifrasDelTrafico(
  a: Pick<AvisoDeTrafico, "hora" | "relativa" | "distancia">,
): {
  readonly hora: number;
  readonly millas: number;
  readonly cientos: number | null;
  readonly arriba: boolean;
} {
  const millas = Math.min(6, Math.max(1, Math.round(a.distancia / MILLA)));
  const cientos =
    alturaDelOtro(a.relativa) === "nivel"
      ? null
      : Math.min(12, Math.max(3, Math.round(Math.abs(a.relativa) / PIE / 100)));
  return { hora: a.hora, millas, cientos, arriba: a.relativa > 0 };
}

/**
 * La frase de radio, en inglés aeronáutico: indicativo, «traffic», la hora,
 * la distancia y la altura relativa.
 *
 * Es el orden del Doc 4444 de la OACI para la información de tráfico —«TRAFFIC
 * (number) O'CLOCK (distance) … (level)»— con la altura dicha respecto a quien
 * escucha, que es como la da un controlador cuando conoce las dos: «one
 * thousand feet above», o «same level» si van a la misma. En millas y en pies
 * aunque la cabina vaya en metros: en la radio el tráfico se da así en todo
 * el mundo.
 */
export function informacionEnRadio(
  indicativo: string,
  a: Pick<AvisoDeTrafico, "hora" | "relativa" | "distancia">,
): string {
  const c = cifrasDelTrafico(a);
  const distancia = `${c.millas} ${c.millas === 1 ? "mile" : "miles"}`;
  const altura =
    c.cientos === null
      ? "same level"
      : `${c.cientos * 100} feet ${c.arriba ? "above" : "below"}`;
  return `${indicativo}, traffic, ${c.hora} o'clock, ${distancia}, ${altura}`;
}

/**
 * **Y la misma frase, en piezas grabadas**: los huecos de la receta
 * `torre.trafico` —la hora, las millas y la altura— con el nombre de su
 * grabación. El indicativo lo pone `rellenoDe`, como en todas las de la torre.
 *
 * Se decía con la voz del navegador, y en Brave para Linux esa voz es muda:
 * la información de tráfico, de Taguató para arriba, no sonaba. Las piezas
 * no llevan el habla en el nombre —`trafico.*` y no `torre.canario.*`—
 * porque cada torre tiene su pack y las dos las graban con el mismo nombre,
 * como el viento y las cifras. Ver `frases-para-grabar.mjs`.
 */
export function informacionEnPiezas(
  a: Pick<AvisoDeTrafico, "hora" | "relativa" | "distancia">,
): Record<"hora" | "millas" | "altura", string> {
  const c = cifrasDelTrafico(a);
  return {
    hora: `trafico.hora.${c.hora}`,
    millas: `trafico.millas.${c.millas}`,
    altura:
      c.cientos === null
        ? "trafico.sameLevel"
        : `trafico.pies.${c.cientos} trafico.${c.arriba ? "above" : "below"}`,
  };
}

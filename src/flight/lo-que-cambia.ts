/**
 * **Lo que cambia en el cuadro, para que se vea y se oiga en su sitio.**
 *
 * Enrique, volando el JAZ 90: «cuando hay un cambio de altitud o velocidad
 * estaría bien alguna señal acústica y otra visual en el elemento que cambia,
 * para yo verlo. Estar escuchando a la instructora diciendo "bajá el motor" es
 * un medio coñazo a veces».
 *
 * Lo real en que se apoya:
 *
 * - **El FMA recuadra cada modo nuevo unos diez segundos.** Boeing (737 NG
 *   FCOM, «Flight Mode Annunciations»: el *mode change highlight*, un
 *   rectángulo alrededor del modo recién puesto durante diez segundos) y
 *   Airbus (FCOM A320, el FMA encuadra en blanco el modo que se engancha,
 *   diez segundos). Es como una cabina dice «esto acaba de cambiar» sin una
 *   palabra.
 * - **Un cambio de SPD o de ALT en el panel del automático se ve en su
 *   ventanilla**, y la marca magenta de la cinta se va a su sitio nuevo.
 *
 * Aquí se lleva eso al juego: la ventanilla que cambia —SPD, ALT— y su marca en
 * la cinta parpadean un momento, con una flecha que dice si la marca subió o
 * bajó, y el modo nuevo del FMA se recuadra sus diez segundos. Y suena un tono
 * suave y corto, distinto de los avisos y de los tonos de cabina: ver `cambio`
 * en `audio/audio.ts`.
 *
 * **Lo que mueve la mano no suena.** Girar la rueda de la ventanilla ALT ya se
 * oye —el clic de cada diente— y se ve en el dedo: avisar de lo que uno acaba
 * de hacer es ruido. El modo que se engancha con el botón sí se recuadra,
 * porque eso lo hace el FMA de verdad, pero sin tono.
 *
 * **Y la marca de la velocidad cambia cuando cambia de peldaño**, no cuando se
 * mueve. La escalera de velocidades da la marca por tramos —el despegue, los
 * 250 nudos bajo los diez mil pies, la de maniobra, la de cada muesca de
 * flaps, la de final— y dentro de un tramo la cifra puede ir y venir un nudo
 * con la altura o con lo que se lleva sacado. Eso no es un cambio que avisar.
 * Ver `flight/escalera-de-velocidades.ts`.
 *
 * Este módulo no dibuja ni suena: dice qué acaba de cambiar y cuánto hace que
 * cambió cada cosa. Lo pinta el cuadro —`Tablero.resaltar`— y suena en `Game`.
 */

/** Lo que se puede resaltar al cambiar. */
export type QueCambia = "spd" | "alt" | "fma-gases" | "fma-lateral" | "fma-vertical";

/** Las tres columnas del FMA, en el orden en que se leen. */
export const COLUMNAS_DEL_FMA = ["gases", "lateral", "vertical"] as const;

/** Un resalte vivo. */
export interface Resalte {
  /** Segundos desde que cambió. */
  readonly edad: number;
  /** Hacia dónde se fue la marca —arriba o abajo en su cinta—, si se sabe. */
  readonly hacia: "sube" | "baja" | null;
}

/** Los resaltes vivos ahora mismo, por lo que cambió. */
export type Resaltes = Readonly<Partial<Record<QueCambia, Resalte>>>;

/**
 * **Cuánto dura un resalte**, s: los diez del FMA de Boeing y de Airbus. La
 * ventanilla y la marca parpadean al principio —ver `PARPADEA_AL_CAMBIAR`— y
 * la flecha y el recuadro del modo se quedan hasta aquí.
 */
export const DURA_EL_RESALTE = 10;

/**
 * **Cuánto parpadea la ventanilla que cambia**, s. Tres: tres latidos llaman
 * la atención sin convertirse en una alerta, que parpadea cinco y se queda
 * fija. Ver `parpadeo` en `ui/cinta.ts`.
 */
export const PARPADEA_AL_CAMBIAR = 3;

/**
 * **Lo mínimo entre dos tonos de cambio**, s. Al llegar a la final cambian a
 * la vez la marca y un modo, y a veces la ventanilla: es un suceso, y suena
 * una vez. Un suceso, una voz; y lo mismo para los tonos.
 */
export const ENTRE_TONOS = 1.5;

/** Lo que mira este módulo del cuadro, en cada paso. */
export interface LecturaDeCambios {
  /**
   * La velocidad que toca, `null` con la ventanilla apagada: el peldaño de
   * la escalera, lo que escribe la ventanilla —«250», «.78»— y los nudos.
   */
  readonly spd: { readonly peldano: string; readonly texto: string; readonly kt: number } | null;
  /** La ventanilla ALT, pies, o `null` sin ninguna puesta. */
  readonly alt: number | null;
  /** Si la ventanilla ALT la acaba de girar la mano. */
  readonly altPorLaMano: boolean;
  /** Lo que escribe el FMA, o `null` sin automático. */
  readonly fma: { readonly gases: string; readonly lateral: string; readonly vertical: string } | null;
  /** Si el automático lo acaba de tocar la mano. */
  readonly fmaPorLaMano: boolean;
  /**
   * **Si el tono se calla ahora**, aunque el cambio se resalte: en la carrera
   * de despegue y en los últimos mil pies de la final, que son de los cantos
   * —*V one*, *rotate*, la cuenta del radioaltímetro— y de nadie más. Un
   * suceso, una voz; y un tono encima de *thirty* es una voz encima de otra.
   */
  readonly callado?: boolean;
  /** El paso, s. */
  readonly dt: number;
}

/** Lo que pasó en un paso: lo que cambió y si hay que tocar el tono. */
export interface CambiosDelPaso {
  readonly nuevos: readonly QueCambia[];
  readonly suena: boolean;
}

const NADA: CambiosDelPaso = { nuevos: [], suena: false };

/** El FMA sin automático: las tres columnas en blanco. */
const FMA_EN_BLANCO = { gases: "", lateral: "", vertical: "" } as const;

export class LoQueCambia {
  private spd: { peldano: string; texto: string; kt: number } | null = null;
  private alt: number | null = null;
  /**
   * Lo que escribía el FMA: en blanco sin automático, que también es lo que
   * escribe. Poner el automático con el FMA en blanco es un cambio de modo
   * como cualquier otro, y se recuadra.
   */
  private fma: Record<(typeof COLUMNAS_DEL_FMA)[number], string> = { ...FMA_EN_BLANCO };
  /** Si ya se leyó el cuadro una vez: lo de la primera lectura llega, no cambia. */
  private leido = false;
  private readonly vivos = new Map<QueCambia, { edad: number; hacia: Resalte["hacia"] }>();
  private desdeElTono = Infinity;

  /** Vuelo nuevo, o avión nuevo: se olvida lo que había y lo que lucía. */
  reiniciar(): void {
    this.spd = null;
    this.alt = null;
    this.fma = { ...FMA_EN_BLANCO };
    this.leido = false;
    this.vivos.clear();
    this.desdeElTono = Infinity;
  }

  /** Los resaltes vivos, con su edad. */
  get resaltes(): Resaltes {
    const r: Partial<Record<QueCambia, Resalte>> = {};
    for (const [que, v] of this.vivos) r[que] = { edad: v.edad, hacia: v.hacia };
    return r;
  }

  /** Si eso está resaltado ahora. */
  vivo(que: QueCambia): boolean {
    return this.vivos.has(que);
  }

  paso(l: LecturaDeCambios): CambiosDelPaso {
    this.desdeElTono += l.dt;
    for (const [que, v] of this.vivos) {
      v.edad += l.dt;
      if (v.edad >= DURA_EL_RESALTE) this.vivos.delete(que);
    }
    const nuevos: QueCambia[] = [];
    let conMano = false;
    let sinMano = false;
    const cambia = (que: QueCambia, hacia: Resalte["hacia"], mano: boolean): void => {
      this.vivos.set(que, { edad: 0, hacia });
      nuevos.push(que);
      if (mano) conMano = true;
      else sinMano = true;
    };

    /*
     * **La velocidad, por peldaño y con la cifra cambiada.** Las dos cosas:
     * un peldaño nuevo con la misma cifra no se ve en ningún sitio, y una
     * cifra que se mueve dentro del peldaño no es un cambio de nadie. Lo que
     * aparece o se apaga —la ventanilla recién encendida en el puesto— no se
     * avisa: no ha cambiado, ha llegado.
     */
    const antesSpd = this.spd;
    if (l.spd && antesSpd && l.spd.peldano !== antesSpd.peldano && l.spd.texto !== antesSpd.texto)
      cambia("spd", l.spd.kt > antesSpd.kt ? "sube" : "baja", false);
    this.spd = l.spd ? { ...l.spd } : null;

    // La altitud: cualquier cifra nueva que no venga de la rueda.
    if (l.alt !== null && this.alt !== null && l.alt !== this.alt && !l.altPorLaMano)
      cambia("alt", l.alt > this.alt ? "sube" : "baja", false);
    this.alt = l.alt;

    /*
     * El FMA: cada columna que pasa a escribir algo nuevo. La que se queda en
     * blanco no se recuadra —un hueco no se encuadra—, y la que cambia por el
     * botón se recuadra igual, que es lo que hace el de verdad.
     */
    const fma = l.fma ?? FMA_EN_BLANCO;
    if (this.leido)
      for (const col of COLUMNAS_DEL_FMA) {
        const ahora = fma[col];
        if (ahora && ahora !== this.fma[col]) cambia(`fma-${col}`, null, l.fmaPorLaMano);
      }
    this.fma = { gases: fma.gases, lateral: fma.lateral, vertical: fma.vertical };
    this.leido = true;

    if (!nuevos.length) return NADA;
    // Con la mano en algo, lo que cambia a la vez es por ella: no suena.
    const suena = sinMano && !conMano && !l.callado && this.desdeElTono >= ENTRE_TONOS;
    if (suena) this.desdeElTono = 0;
    return { nuevos, suena };
  }
}

/**
 * **Si la ventanilla que cambió luce en este instante**: parpadea a un hercio
 * los primeros `PARPADEA_AL_CAMBIAR` segundos y se apaga. Con «Movimiento:
 * reducido», se queda encendida esos mismos segundos sin parpadear: el ajuste
 * quita el movimiento, no la información. Lo que parpadea es el marco, nunca
 * la cifra.
 */
export function luceLaVentanilla(r: Resalte | undefined, quieto: boolean): boolean {
  if (!r || r.edad >= PARPADEA_AL_CAMBIAR) return false;
  return quieto || r.edad % 1 < 0.5;
}

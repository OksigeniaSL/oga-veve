/**
 * El cartel del cinturón: cuándo se enciende y quién lo manda.
 *
 * ## Lo que estaba mal
 *
 * Se encendía por **altura sobre el terreno**: por debajo de novecientos
 * metros, encendido. Volando cerca de esa cota sobre unas islas de barrancos,
 * el suelo sube y baja con cada pliegue y el cartel iba detrás, con su *ding*
 * cada vez. Contado jugando: «la señal de cinturón se quita y se pone con
 * mucha facilidad».
 *
 * Y había algo peor, que se vio al oír a la comandante: **decía «pueden
 * soltarse el cinturón» con el cartel apagado desde hacía rato**. El anuncio y
 * el cartel contaban cosas distintas del mismo vuelo.
 *
 * ## Lo que hace ahora, que es lo que pasa de verdad
 *
 * El cartel no es un instrumento del terreno: es una **decisión**, y en un
 * avión de verdad la toma el comandante. Así que aquí:
 *
 * - Se enciende al arrancar y **no se apaga hasta que la comandante lo dice**.
 *   Esa es la frase que ya existía —«ya estamos arriba, pueden soltarse el
 *   cinturón»— y ahora el cartel se apaga **con ella**, no por su cuenta. Los
 *   dos cuentan lo mismo porque son lo mismo.
 * - Vuelve a encenderse al empezar la aproximación, que es cuando se enciende
 *   en cualquier vuelo del mundo.
 * - Y con turbulencia de verdad, venga cuando venga.
 * - **Y lo puede mandar quien vuela.** Pedido tal cual: «es una decisión del
 *   piloto mandar a ponerlo (turbulencia, inicio de aproximación, etc.)». Un
 *   mando puesto a mano manda sobre todo lo demás mientras esté puesto —
 *   porque eso es exactamente lo que hace el interruptor de una cabina.
 *
 * Nada de esto mira la altura sobre el terreno, así que ningún barranco puede
 * volver a encenderlo.
 */

import type { Fase } from "./vuelo";

/**
 * Cuánto movimiento del aire cuenta como turbulencia de encender el cartel.
 *
 * De 0 a 1. Nueve décimas: sacude de verdad. Y con banda muerta para apagarlo
 * —seis décimas— porque si el mismo número enciende y apaga, una racha justo
 * en el umbral lo hace parpadear, que es de donde venía la queja.
 */
export const SACUDE = 0.9;
export const YA_NO_SACUDE = 0.6;

/** Lo que el cartel necesita saber del vuelo. */
export interface Momento {
  readonly fase: Fase;
  /** Si este avión lleva pasaje: una avioneta de escuela no tiene a quién avisar. */
  readonly conPasaje: boolean;
  /** Cuánto se mueve el aire, de 0 a 1. */
  readonly movimiento: number;
  /**
   * Si la comandante acaba de decir que ya se pueden soltar.
   *
   * Es un **suceso**, no un estado: llega una vez, en el fotograma en que se
   * dice. Ver `megafonia.ts`.
   */
  readonly loDijoLaComandante: boolean;
}

/** Lo que el piloto ha decidido, si ha decidido algo. */
export type Mando = "auto" | "puesto" | "quitado";

/**
 * Las fases en las que el cartel está encendido pase lo que pase.
 *
 * Todo lo que no es crucero: en tierra, en el despegue, en la subida y en toda
 * la aproximación. Es la regla de un vuelo de verdad dicha en fases.
 */
const SIEMPRE_ENCENDIDO: readonly Fase[] = [
  "estacionado",
  "arrancando",
  "rodando",
  "esperando",
  "autorizado",
  "back-taxi",
  "alineando",
  "despegando",
  "comprometido",
  "final",
  "aterrizado",
  "abandonando",
  "a-plataforma",
  "en-puesto",
  "apagado",
];

export class Cinturon {
  /**
   * Si la comandante ya dijo que se pueden soltar.
   *
   * Es lo que decide el **fondo** del asunto en crucero. La turbulencia y las
   * fases mandan por encima mientras duran, pero al calmarse el aire lo que
   * queda es esto — y no lo último que pasó, que era el fallo: una sola
   * sacudida dejaba el cartel puesto el resto del vuelo.
   */
  private soltado = false;
  private mando: Mando = "auto";
  /** Si el aire ya venía sacudiendo, para la banda muerta. Ver `SACUDE`. */
  private sacudiendo = false;

  /** Vuelo nuevo: como empieza un vuelo, con el cartel puesto. */
  reiniciar(): void {
    this.soltado = false;
    this.mando = "auto";
    this.sacudiendo = false;
  }

  /** Lo que ha decidido quien vuela. Ver `Mando`. */
  ponerMando(mando: Mando): void {
    this.mando = mando;
  }

  get comoEsta(): Mando {
    return this.mando;
  }

  /**
   * Un paso. Devuelve si el cartel está encendido **ahora**.
   *
   * Quien llama compara con lo de antes para saber si suena el *ding*: aquí no
   * se guarda nada de eso, porque un cartel no sabe de sonidos.
   */
  paso(m: Momento): boolean {
    if (!m.conPasaje) return false;
    // Lo que diga la comandante se apunta siempre, aunque ahora mande otra
    // cosa: el anuncio pasa una vez y no vuelve.
    if (m.loDijoLaComandante) this.soltado = true;
    if (this.mando === "puesto") return true;
    if (this.mando === "quitado") return false;

    // La turbulencia, con su banda muerta: enciende alto y suelta bajo.
    if (m.movimiento >= SACUDE) this.sacudiendo = true;
    else if (m.movimiento < YA_NO_SACUDE) this.sacudiendo = false;

    if (SIEMPRE_ENCENDIDO.includes(m.fase) || this.sacudiendo) return true;

    // Y en crucero manda el anuncio: hasta que se dice, puesto. La turbulencia
    // lo pone por encima mientras dura, y al calmarse **vuelve a esto** — que
    // es lo que faltaba: una sacudida dejaba el cartel puesto el resto del
    // vuelo.
    return !this.soltado;
  }
}

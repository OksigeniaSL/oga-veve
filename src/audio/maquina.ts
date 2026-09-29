/**
 * La voz de la máquina: lo que dicen las cajas del avión.
 *
 * El radioaltímetro con su cuenta, el avisador de proximidad al terreno con su
 * *terrain* y su *sink rate*, el de pérdida, el TCAS con su *traffic,
 * traffic*. No son personas y no hablan por la radio: suenan por el altavoz de
 * la cabina, **por encima de lo que diga la radio**, y en cuanto pasa lo que
 * avisan. Por eso no pasan por `audio/boca.ts`, que es el turno de palabra de
 * las personas —la instructora, la torre, el otro avión—.
 *
 * ## Por qué tiene su propia vía
 *
 * Porque metida en la cola de la boca, la cuenta de la toma esperaba detrás de
 * la torre y salía cuando le tocaba, no cuando se cruzaba el número. Contado
 * así: «un buen rato después me dice 100 sin que cuadre con lo que realmente
 * estoy haciendo… y cuando estoy ya en tierra rodando y frenando me dice 5».
 * En un avión de verdad eso no puede pasar: la caja no pide la palabra.
 *
 * ## Las reglas, que son las de las cajas
 *
 * - **Lo que llega, suena ya.** Si no puede sonar ahora —sin toma grabada, sin
 *   audio—, quien lo pidió se entera y decide.
 * - **Un número de la cuenta no espera nunca.** Si suena otro número, lo corta:
 *   el siguiente sustituye al anterior. Si suena un aviso, el número se pierde:
 *   un número dicho tarde es una mentira, y un aviso de peligro cortado por un
 *   número sería justo lo contrario de la regla de las tres eses.
 * - **Entre avisos, manda el más importante**, en el orden de las cajas de
 *   verdad: la pérdida, el terreno, los mínimos, el ritmo de bajada, el
 *   alabeo, el tráfico. El que manda más corta al que suena; el que manda
 *   menos espera **una plaza** y poco rato, porque un aviso que describe algo
 *   de hace tres segundos ya no describe nada. Ver `PRIORIDAD` y `CADUCA`.
 *
 * ## Y detrás, la instructora
 *
 * Quien pide un canto puede pasar qué hacer **cuando termine entero**: es lo
 * que usa el juego para que, en los peldaños de abajo, la instructora explique
 * con calma lo que acaba de sonar. Detrás y no a la vez, que un suceso lo
 * cuenta una voz cada vez. Si al canto lo corta otro, la explicación no llega:
 * explicaría algo que ya no es lo que está pasando. Ver `laInstructoraLoExplica`
 * en `flight/escalera.ts`.
 */

import { DE_LA_CUENTA } from "./cabina";

/**
 * Lo que manda cada aviso sobre los demás. Más es más.
 *
 * Es el orden de las cajas de verdad, con la pérdida delante —el vibrador de
 * palanca no espera a nadie— y el TCAS detrás del avisador de terreno, que es
 * como se prioriza en cualquier avión que lleve los dos. Lo que no está en la
 * lista manda poco, pero más que un número: es un aviso.
 */
export const PRIORIDAD: Readonly<Record<string, number>> = {
  "cabina.stall": 90,
  "cabina.terrainPullUp": 80,
  // La cabina sin aire, justo detrás del terreno: los dos son de ahora mismo.
  "cabina.cabin": 75,
  "cabina.tooLow": 70,
  "cabina.minimums": 60,
  "cabina.sinkRate": 50,
  "cabina.airspeedLow": 45,
  "cabina.bankAngle": 40,
  "cabina.autopilotDisconnect": 30,
  "cabina.traffic": 20,
};

/** Lo que manda un número de la cuenta: nada. Ver la cabecera. */
const DE_LA_CUENTA_MANDA = 0;

export function prioridadDe(clave: string): number {
  if (DE_LA_CUENTA.has(clave)) return DE_LA_CUENTA_MANDA;
  return PRIORIDAD[clave] ?? 10;
}

/**
 * Lo más que espera un aviso a que termine otro, ms.
 *
 * Tres segundos: lo que dura un aviso de caja y un respiro. Más allá, el
 * avión ya está en otro sitio.
 */
export const CADUCA = 3000;

/** Lo que la voz de la máquina necesita de fuera. */
export interface Caja {
  ahora(): number;
  /**
   * Toca ya la grabación de esta clave. Devuelve con qué cortarla, o `null` si
   * ahora no puede sonar. `alAcabar` se llama al terminar, también si se
   * corta: de distinguir las dos cosas se encarga esto.
   */
  tocar(clave: string, alAcabar: () => void): (() => void) | null;
}

/** Qué pasó con lo que se pidió. */
export type ComoFue = "suena" | "espera" | "no";

interface Sonando {
  readonly clave: string;
  readonly prioridad: number;
  readonly cual: number;
  readonly cortar: () => void;
  readonly despues?: () => void;
}

interface Esperando {
  readonly clave: string;
  readonly prioridad: number;
  readonly desde: number;
  readonly despues?: () => void;
}

export class VozDeLaMaquina {
  private sonando: Sonando | null = null;
  private esperando: Esperando | null = null;
  /** Un número que sube a cada canto, para no atender el final de otro. */
  private cual = 0;

  /**
   * Lo que se le pidió y qué fue de ello, con su hora. Para los bancos, que
   * sin esto no distinguen «no se pidió» de «se pidió y no sonó».
   */
  readonly oidas: { t: number; clave: string; que: string }[] = [];

  constructor(private readonly caja: Caja) {}

  /** Si está sonando algo ahora mismo. */
  get ocupada(): boolean {
    return this.sonando !== null;
  }

  /**
   * Pide que suene esto. `despues` se llama si termina entero; ver la
   * cabecera.
   */
  decir(clave: string, despues?: () => void): ComoFue {
    const prioridad = prioridadDe(clave);
    const suena = this.sonando;
    if (!suena) return this.tocarYa(clave, prioridad, despues);
    /*
     * Lo que manda más corta. Y un número corta a otro número: el siguiente de
     * la cuenta sustituye al anterior, que ya no describe dónde se está.
     */
    const pisaUnNumero =
      prioridad === DE_LA_CUENTA_MANDA && suena.prioridad === DE_LA_CUENTA_MANDA;
    if (prioridad > suena.prioridad || pisaUnNumero) {
      this.cortar(`lo cortó ${clave}`);
      return this.tocarYa(clave, prioridad, despues);
    }
    if (prioridad === DE_LA_CUENTA_MANDA) {
      this.apuntar(clave, `no cabía: sonaba ${suena.clave}`);
      return "no";
    }
    const espera = this.esperando;
    if (espera && espera.prioridad > prioridad) {
      this.apuntar(clave, `no cabía: esperaba ${espera.clave}`);
      return "no";
    }
    if (espera) this.apuntar(espera.clave, `lo pisó ${clave}`);
    this.esperando = { clave, prioridad, desde: this.caja.ahora(), despues };
    this.apuntar(clave, `espera a ${suena.clave}`);
    return "espera";
  }

  /** Vuelo nuevo: se calla y se olvida de lo que esperaba. */
  callar(): void {
    if (this.esperando) this.apuntar(this.esperando.clave, "se calló todo");
    this.esperando = null;
    this.cortar("se calló todo");
  }

  private tocarYa(
    clave: string,
    prioridad: number,
    despues?: () => void,
  ): ComoFue {
    const cual = ++this.cual;
    const cortar = this.caja.tocar(clave, () => this.acabo(cual));
    if (!cortar) {
      this.apuntar(clave, "no pudo sonar");
      return "no";
    }
    this.sonando = { clave, prioridad, cual, cortar, despues };
    this.apuntar(clave, "sonó");
    return "suena";
  }

  private cortar(porque: string): void {
    const suena = this.sonando;
    if (!suena) return;
    // Primero se suelta y después se corta: el aviso de final que llega al
    // cortar ya no es de nadie, y así no se toma por un final de verdad.
    this.sonando = null;
    this.apuntar(suena.clave, porque);
    suena.cortar();
  }

  private acabo(cual: number): void {
    const suena = this.sonando;
    if (!suena || suena.cual !== cual) return;
    this.sonando = null;
    const espera = this.esperando;
    this.esperando = null;
    if (espera && this.caja.ahora() - espera.desde <= CADUCA) {
      /*
       * **Y si detrás esperaba otro aviso, la explicación del primero no
       * llega**: la instructora contaría una cosa mientras la caja dice otra,
       * y lo que importa ahora es lo último que ha pasado.
       */
      this.tocarYa(espera.clave, espera.prioridad, espera.despues);
      return;
    }
    if (espera) this.apuntar(espera.clave, "caducó esperando");
    suena.despues?.();
  }

  private apuntar(clave: string, que: string): void {
    this.oidas.push({ t: this.caja.ahora(), clave, que });
    if (this.oidas.length > 400) this.oidas.shift();
  }
}

/**
 * **La toma larga**: si no se toca en la zona de toma, al aire (punto 206 de
 * la lista).
 *
 * Con el JAZ 120 y teclado, en una final sin estabilizar: se posó tarde, no
 * le dio la pista y se salió por el final. Nadie le propuso irse. Lo que se
 * decía en una toma así era lo de siempre —el veredicto, «frená» y, al
 * final, el percance de pasarse la pista—: el juego dejaba llegar al final
 * del asfalto sin que nadie dijera que había otra salida, que es la buena.
 *
 * ## Lo real
 *
 * - **Se toca en la zona de toma, o se va al aire.** La zona acaba, como
 *   mucho, en el primer tercio de la pista (FAA, AC 91-79A, *Mitigating the
 *   Risks of a Runway Overrun Upon Landing*), y en la práctica poco después
 *   del punto de visada que pinta la pista: 150, 250, 300 o 400 m del umbral
 *   según su largo (OACI, Anexo 14, vol. I, tabla 5-2). Aquí, el punto de
 *   visada y doscientos metros, sin pasar del tercio: de 300 a 600 m.
 * - **Y también después de tocar**, mientras haya velocidad, pista y no se
 *   hayan puesto las reversas: el FCTM del 737 lo llama *go-around after
 *   touchdown*, y una vez puesta la reversa la toma se termina parando.
 * - **Y si con lo que queda no se para**, lo mismo: con freno a fondo y lo
 *   que lleve, la cuenta de `rodaduraDeFrenada` en `carrera.ts`.
 *
 * ## En el juego
 *
 * En los peldaños de abajo la instructora lo propone **a tiempo y en calma**
 * —«así no, nos vamos al aire y lo volvemos a intentar»—, una vez por toma:
 * flotando pasada la zona, al tocar pasada la zona, o rodando sin pista para
 * parar mientras todavía se puede subir. Y si se hace, se felicita como
 * cualquier frustrada: ver `idaTrasTocar`, que es lo que deja al detector de
 * frustradas contar la que sale después de tocar. Renunciar es ganar.
 *
 * Función de estado sin pantalla ni voz: `Game` le dice dónde está el avión y
 * pone la tarjeta. Unidades del modelo: metros y m/s.
 */

/** Por qué se propone irse al aire en la toma. */
export type PorQueIrseEnLaToma = "largo" | "noPara";

/**
 * **El punto de visada**, m del umbral de aterrizaje, según lo que mide la
 * pista para aterrizar (OACI, Anexo 14, vol. I, tabla 5-2).
 */
export function puntoDeVisada(paraAterrizar: number): number {
  if (paraAterrizar < 800) return 150;
  if (paraAterrizar < 1200) return 250;
  if (paraAterrizar < 2400) return 300;
  return 400;
}

/** Lo que se deja pasado el punto de visada para tocar, m. */
const PASADO_EL_PUNTO = 200;

/**
 * **Dónde acaba la zona de toma**, m del umbral de aterrizaje: el punto de
 * visada y doscientos metros, sin pasar del primer tercio de la pista.
 */
export function finDeLaZonaDeToma(paraAterrizar: number): number {
  return Math.min(paraAterrizar / 3, puntoDeVisada(paraAterrizar) + PASADO_EL_PUNTO);
}

/**
 * **La altura de la recogida**, m sobre la pista: los cincuenta pies a los
 * que se cruza el umbral. Por debajo, flotando pasada la zona, ya es una toma
 * larga.
 */
export const ALTURA_DE_LA_RECOGIDA = 15;

/**
 * **Hasta qué velocidad sobre el suelo vale irse después de tocar**, en
 * fracción de la de aproximación. Por encima, el avión vuelve a volar en
 * cuanto se le mete gas; por debajo, ya es una carrera de despegue nueva.
 */
export const VELOCIDAD_PARA_IRSE = 0.8;

/** Y la pista que tiene que quedar por delante para irse, m. */
export const PISTA_PARA_IRSE = 400;

/**
 * **Lo que se deja de más al mirar si se para**: la cuenta es la del freno a
 * fondo, y de verdad no se frena así desde el primer metro.
 */
export const MARGEN_PARA_PARAR = 1.15;

/** Lo que mira la toma larga, cada paso. */
export interface EnLaToma {
  /** Si se viene a aterrizar en esta pista: volando su final. */
  readonly enFinal: boolean;
  readonly enElSuelo: boolean;
  /** Si las ruedas están en la pista. */
  readonly enLaPista: boolean;
  /** Altura sobre la pista, m. */
  readonly sobreLaPista: number;
  /** Lo recorrido pasado el umbral de aterrizaje, m: negativo antes de él. */
  readonly pasado: number;
  /** La pista que queda por delante, m. */
  readonly queda: number;
  /** Lo que mide la pista para aterrizar, del umbral de aterrizaje al final, m. */
  readonly paraAterrizar: number;
  /** Velocidad sobre el suelo, m/s. */
  readonly porElSuelo: number;
  /** La de aproximación del avión, m/s. */
  readonly aproximacion: number;
  /** Si la reversa está puesta. */
  readonly reversa: boolean;
  /**
   * Lo que hace falta para parar desde esta velocidad con todo, m. Solo se
   * pregunta rodando por la pista. Ver `rodaduraDeFrenada` en `carrera.ts`.
   */
  readonly paraParar: (desde: number) => number;
}

/** Lejos de la pista y por encima de esto, ya es otra aproximación, m. */
const OTRA_APROXIMACION = 100;

export class TomaLarga {
  private tocado = false;
  /** Si tocó pasada la zona de toma. */
  private largo = false;
  private conReversa = false;
  private propuesta = false;
  /** Si todavía se puede ir uno al aire después de tocar. */
  private sePuede = false;

  /**
   * Un paso. Devuelve por qué proponer irse al aire **en el instante en que
   * toca proponerlo**, una vez por toma, o `null`.
   */
  paso(e: EnLaToma): PorQueIrseEnLaToma | null {
    if (!e.enElSuelo) {
      // Arriba otra vez y lejos de la pista: otra aproximación, otra toma.
      if (!e.enFinal && e.sobreLaPista > OTRA_APROXIMACION) this.reiniciar();
      if (
        e.enFinal &&
        !this.tocado &&
        !this.propuesta &&
        e.sobreLaPista < ALTURA_DE_LA_RECOGIDA &&
        e.pasado > finDeLaZonaDeToma(e.paraAterrizar) &&
        e.queda > PISTA_PARA_IRSE
      ) {
        this.propuesta = true;
        return "largo";
      }
      return null;
    }
    if (!e.enLaPista) {
      this.sePuede = false;
      return null;
    }
    if (!this.tocado) {
      this.tocado = true;
      this.largo = e.pasado > finDeLaZonaDeToma(e.paraAterrizar);
    }
    if (e.reversa) this.conReversa = true;
    this.sePuede =
      !this.conReversa &&
      e.porElSuelo > VELOCIDAD_PARA_IRSE * e.aproximacion &&
      e.queda > PISTA_PARA_IRSE;
    if (this.propuesta || !this.sePuede) return null;
    if (this.largo) {
      this.propuesta = true;
      return "largo";
    }
    if (e.queda < e.paraParar(e.porElSuelo) * MARGEN_PARA_PARAR) {
      this.propuesta = true;
      return "noPara";
    }
    return null;
  }

  /**
   * **Si irse al aire ahora, después de tocar, es una frustrada**: se tocó
   * largo o se propuso irse, y todavía se puede —sin reversa, con velocidad
   * y con pista—. Es lo que deja al detector de frustradas contar la que sale
   * después de tocar; un rebote sin más sigue sin contar. Ver `Frustrada`.
   */
  get idaTrasTocar(): boolean {
    return this.tocado && this.sePuede && (this.propuesta || this.largo);
  }

  /**
   * Si se propuso irse y todavía se puede: mientras tanto no se pide frenar,
   * que serían dos cosas contrarias a la vez.
   */
  get propuestaAbierta(): boolean {
    return this.propuesta && this.sePuede;
  }

  /** Otro vuelo u otra aproximación. */
  reiniciar(): void {
    this.tocado = false;
    this.largo = false;
    this.conReversa = false;
    this.propuesta = false;
    this.sePuede = false;
  }
}

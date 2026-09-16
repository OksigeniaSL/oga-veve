/**
 * El otro avión de la frecuencia.
 *
 * Un aeropuerto donde la radio está muerta es un decorado. Con cinco frases
 * sueltas y bien puestas deja de serlo: **se oye a alguien más ahí fuera**, y
 * eso cuenta —sin explicarlo— que uno no está solo en el mundo, que hay que
 * esperar turno y que la pista es de todos. Todavía no hay tráfico dibujado
 * —eso es #118—, pero esto vale desde hoy y no depende de aquello.
 *
 * ## Es una historia, no cinco frases al azar
 *
 * Zulu Papa Alfa Bravo Charlie hace su propio vuelo detrás del tuyo, y lo
 * cuenta en orden: saluda, rueda a la cabecera, entra en viento en cola,
 * anuncia final y deja la pista libre. Sueltas y barajadas serían ruido; en
 * orden son otro avión. Cuando acaba, se calla un buen rato y vuelve a
 * empezar, que es lo que pasa en un aeródromo pequeño.
 *
 * ## Y se calla cuando hay que callarse
 *
 * Dos reglas, y las dos por el mismo motivo: **la radio es ambiente y el
 * instructor es la lección**. Si hablan a la vez, la que se pierde es la que
 * hacía falta.
 *
 * - Nunca en final ni en la toma. Ahí quien habla es el instructor y quien
 *   escucha tiene las manos ocupadas.
 * - Nunca encima de otra frase, ni antes de que pase un silencio decente.
 *
 * Y «buenos días» solo de día, que decirlo a las ocho de la tarde es de las
 * cosas que un chico nota antes que nadie.
 */

/**
 * Las cuatro, en el orden en que las dice.
 *
 * **El saludo ya no va solo.** Era «Buenos días» y cinco letras, y así sonaba:
 * «eco charli lima lima… ¿y ya está, no dice nada después, sólo unas letras?».
 * Un avión que abre la frecuencia dice quién es **y a qué viene**, y ahora lo
 * dice en la misma llamada: «Buenos días, Echo Charlie Lima Lima Alfa, rodando
 * a la cabecera». No hizo falta grabar nada: la receta junta el saludo, el
 * indicativo y el mensaje que ya existían por separado.
 */
export const LLAMADAS = [
  "otro.rodando",
  "otro.enCola",
  "otro.final",
  "otro.pistaLibre",
] as const;

/**
 * Y **el saludo no es una llamada: es cómo se dice la primera.**
 *
 * Estaba en la lista como una más, así que de noche —que no se saluda— se
 * saltaba **la llamada entera** y el otro avión no anunciaba que salía. Con el
 * saludo dentro de la misma frase eso pasó de ser un detalle a ser un agujero:
 * media hora de frecuencia sin que nadie diga que está rodando.
 *
 * Ahora la primera llamada es siempre «rodando a la cabecera», y de día se dice
 * con los buenos días delante. Es la misma frase con una pieza más. Ver la
 * receta en `crudo/otro/recetas.json`.
 */
export const CON_SALUDO = "otro.buenosDias";

export type Llamada = (typeof LLAMADAS)[number] | typeof CON_SALUDO;

/** Lo que la radio mira del vuelo para saber si puede hablar. */
export interface Momento {
  /** La fase del juego. En final y en la toma, la radio calla. */
  readonly fase: string;
  /** Si hay luz. «Buenos días» de noche no. */
  readonly deDia: boolean;
  /** Si el instructor está diciendo algo ahora mismo. */
  readonly instructorHablando: boolean;
}

/** Las fases en las que no se habla por encima de nadie. */
const CALLADAS = new Set(["final", "aterrizado", "comprometido", "percance"]);

/** Segundos hasta la primera frase, y entre una y la siguiente. */
export const ESPERA_PRIMERA = 12;
export const ESPERA_MINIMA = 35;
export const ESPERA_MAXIMA = 75;
/** Y el silencio largo cuando el otro avión termina su vuelo. */
export const ESPERA_ENTRE_VUELOS = 150;

export class Radio {
  private readonly azar: () => number;
  private siguiente = 0;
  private falta = ESPERA_PRIMERA;
  /** Lo último que se oyó, para que la pantalla lo pueda enseñar. */
  private dicho: Llamada | null = null;

  constructor(azar: () => number = Math.random) {
    this.azar = azar;
  }

  /** Lo último que dijo el otro avión, o `null` si todavía no dijo nada. */
  get ultima(): Llamada | null {
    return this.dicho;
  }

  /**
   * Pasa el tiempo y devuelve qué se oye ahora, o `null`.
   *
   * Cuando toca hablar pero el momento no es bueno **no se pierde el turno**:
   * se espera. Una frase que se salta deja el relato cojo, y el relato es lo
   * único que hace que esto suene a otro avión y no a un altavoz.
   */
  update(dt: number, m: Momento): Llamada | null {
    this.falta -= dt;
    if (this.falta > 0) return null;
    if (CALLADAS.has(m.fase) || m.instructorHablando) return null;

    /*
     * Y «buenos días» solo de día. No se salta la llamada —eso dejaba al otro
     * avión sin anunciar que salía durante toda la noche—: se dice la misma
     * frase sin el saludo delante. Ver `CON_SALUDO`.
     */
    const cual = LLAMADAS[this.siguiente]!;
    const dice: Llamada =
      cual === "otro.rodando" && m.deDia ? CON_SALUDO : cual;
    this.avanzar();
    this.dicho = dice;
    return dice;
  }

  private avanzar(): void {
    const eraLaUltima = this.siguiente === LLAMADAS.length - 1;
    this.siguiente = (this.siguiente + 1) % LLAMADAS.length;
    this.falta = eraLaUltima
      ? ESPERA_ENTRE_VUELOS
      : ESPERA_MINIMA + this.azar() * (ESPERA_MAXIMA - ESPERA_MINIMA);
  }

  /** Vuelve al principio. Al reiniciar el vuelo, el otro avión también. */
  reiniciar(): void {
    this.siguiente = 0;
    this.falta = ESPERA_PRIMERA;
    this.dicho = null;
  }
}

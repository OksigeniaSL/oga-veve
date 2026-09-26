/**
 * La frecuencia: **los otros que están ahí fuera, y la torre contestándoles**.
 *
 * Un aeropuerto donde la radio está muerta es un decorado. Pero una radio con
 * un solo avión que hace siempre lo mismo también acaba siéndolo, y se oyó
 * jugando: «hay unas pocas frases y en cada vuelo dice lo mismo: charlie,
 * papa, zulú… viento de cola». El diagnóstico era exacto. Había **un** avión,
 * con **un** guion de cuatro llamadas, dichas siempre en el mismo orden.
 *
 * Lo que hace que una frecuencia suene a frecuencia son tres cosas, y ninguna
 * es tener más frases sueltas:
 *
 * 1. **Hay más de uno.** Dos aviones con su propia matrícula, cada uno en un
 *    punto distinto de su propio vuelo, turnándose el canal. Oís a uno rodar
 *    mientras el otro va en final, que es lo que pasa de verdad.
 * 2. **Alguien contesta.** Una radio en la que todos anuncian y nadie
 *    responde es una megafonía. Cuando la torre dice una matrícula que no es
 *    la tuya y otro le contesta, el mundo tiene gente dentro — y cuando dice
 *    la tuya, **te está hablando a vos**, que es lo que hace que valga la pena
 *    escuchar.
 * 3. **No todos hacen lo mismo.** Uno sale, otro llega, a otro lo paran en el
 *    punto de espera, y a otro lo mandan al aire porque la pista está ocupada.
 *
 * ## Y sale a coste cero de grabación
 *
 * Esa es la parte bonita del asunto. Las frases de la torre **ya estaban
 * grabadas con un hueco para el indicativo** —se hicieron así para poder
 * llamar al jugador por su matrícula—, y un hueco no sabe de quién es: la
 * misma grabación que dice «Zulu Papa Yankee Victor Alfa, runway zero three,
 * cleared for take-off» dice cualquier otra matrícula sin tocar nada. O sea
 * que la torre podía llevar todo este tiempo hablando con los demás y lo único
 * que faltaba era pedírselo. Ver `audio/torre.ts` y `flight/matricula.ts`.
 *
 * ## Y se calla cuando hay que callarse
 *
 * Tres reglas, y las tres por el mismo motivo: **la radio es ambiente y el
 * instructor es la lección**. Si hablan a la vez, la que se pierde es la que
 * hacía falta.
 *
 * - Nunca en final ni en la toma. Ahí quien habla es el instructor y quien
 *   escucha tiene las manos ocupadas.
 * - Nunca encima del instructor.
 * - Nunca dos a la vez, y con un silencio decente entre transmisiones. Una
 *   frecuencia en la que se pisan no es realismo, es ruido.
 *
 * Y «buenos días» solo de día, que decirlo a las ocho de la tarde es de las
 * cosas que un chico nota antes que nadie.
 */

import { sortearIndicativo, type Indicativo } from "./matricula";

/** Quién habla: otro avión de la frecuencia, o la torre. */
export type Voz = "otro" | "torre";

/** Un paso del guion: quién dice qué, y si viene pegado a lo anterior. */
export interface Paso {
  readonly voz: Voz;
  readonly clave: string;
  /**
   * Si es una **respuesta** y por tanto llega en segundos, no en minutos.
   *
   * Es el detalle que separa una conversación de dos monólogos. Una torre que
   * contesta cuarenta segundos después no está contestando: está diciendo otra
   * cosa por su cuenta, y se nota aunque nadie sepa decir por qué.
   */
  readonly seguido?: boolean;
}

/**
 * Lo que hace cada uno de los que están en la frecuencia.
 *
 * Son vuelos enteros contados por radio, no frases sueltas barajadas: sueltas
 * serían ruido; en orden son un avión. Y usan **solo lo que ya está grabado**,
 * que es lo que permitió hacer esto sin pisar el estudio.
 */
export const GUIONES = {
  /** Uno que sale sin esperar a nadie: rueda, le paran, le autorizan. */
  sale: [
    { voz: "otro", clave: "otro.rodando" },
    { voz: "torre", clave: "torre.holdShort", seguido: true },
    { voz: "torre", clave: "torre.clearedTakeoff" },
  ],
  /**
   * Y uno al que **le toca esperar**, que es la lección entera de la radio:
   * la pista es de todos y hay turnos. Entra en el eje, se queda ahí, y hasta
   * que no despega el de delante no le autorizan.
   */
  espera: [
    { voz: "otro", clave: "otro.rodando" },
    { voz: "torre", clave: "torre.holdShort", seguido: true },
    { voz: "torre", clave: "torre.lineUpWait" },
    { voz: "torre", clave: "torre.clearedTakeoff" },
  ],
  /** Uno que llega: viento en cola, autorizado, final, y deja la pista. */
  llega: [
    { voz: "otro", clave: "otro.enCola" },
    { voz: "torre", clave: "torre.clearedLand", seguido: true },
    { voz: "otro", clave: "otro.final" },
    { voz: "otro", clave: "otro.pistaLibre" },
  ],
  /**
   * Y uno al que mandan al aire con la pista ocupada.
   *
   * Está aquí porque es **lo mismo que el juego te hace a vos** cuando te
   * manda una frustrada, y oírselo hacer a otro antes de que te pase a vos
   * vale más que cualquier explicación: no es un castigo, es lo normal.
   */
  frustrada: [
    { voz: "otro", clave: "otro.enCola" },
    { voz: "otro", clave: "otro.final" },
    { voz: "torre", clave: "torre.goAround", seguido: true },
    { voz: "otro", clave: "otro.enCola" },
    { voz: "torre", clave: "torre.clearedLand", seguido: true },
    { voz: "otro", clave: "otro.pistaLibre" },
  ],
} satisfies Record<string, readonly Paso[]>;

export type Guion = keyof typeof GUIONES;

/** Los guiones, en el orden en que se sortean. */
export const CUALES = Object.keys(GUIONES) as Guion[];

/**
 * Y **el saludo no es una llamada: es cómo se dice la primera.**
 *
 * Estaba en la lista como una más, así que de noche —que no se saluda— se
 * saltaba **la llamada entera** y el otro avión no anunciaba que salía. Ahora
 * la primera llamada de quien sale es siempre «rodando a la cabecera», y de
 * día se dice con los buenos días delante: es la misma frase con una pieza
 * más. Ver la receta en `crudo/otro/recetas.json`.
 */
export const CON_SALUDO = "otro.buenosDias";
const SE_SALUDA_EN = "otro.rodando";

/** Lo que la frecuencia mira del vuelo para saber si puede hablar. */
export interface Momento {
  /** La fase del juego. En final y en la toma, la radio calla. */
  readonly fase: string;
  /** Si hay luz. «Buenos días» de noche no. */
  readonly deDia: boolean;
  /** Si el instructor está diciendo algo ahora mismo. */
  readonly instructorHablando: boolean;
}

/** Lo que se oye: quién, qué, y de quién es la matrícula que se nombra. */
export interface Transmision {
  readonly voz: Voz;
  readonly clave: string;
  /** A quién nombra la frase. En una respuesta es el avión, no la torre. */
  readonly de: Indicativo;
  /**
   * Si esto **contesta** a lo anterior o abre un asunto nuevo.
   *
   * Lo dice el guion y sale hacia fuera porque es lo que hay que poder
   * comprobar: una respuesta llega en segundos y una llamada nueva en
   * decenas, y esa diferencia es toda la diferencia entre una conversación y
   * dos monólogos que casualmente se turnan.
   */
  readonly respuesta: boolean;
}

/**
 * Las fases en las que no se habla por encima de nadie.
 *
 * Estaban las cuatro de abajo y **faltaban las dos del despegue**, que es donde
 * más se nota: alineado y rodando por la pista es cuando hablan a la vez la
 * instructora —«ya no se puede seguir, volá»—, la comandante, los cantos de
 * cabina y el otro avión deletreando su matrícula. Contado jugando: «todos a
 * la vez, como el camarote de los Hermanos Marx pero en versión aeronave».
 *
 * Y no es solo ruido: es que **ahí no se atiende una radio**. Entre alinearse
 * y tener las ruedas en el aire, un piloto no contesta ni escucha charla; la
 * frecuencia existe, pero lo que se hace es volar el avión. Callarla en esos
 * dos momentos no le quita nada al juego y le devuelve el momento entero a
 * quien está despegando.
 *
 * `comprometido` ya estaba —pasada la V1— y `despegando` es lo de antes: la
 * carrera. Que una estuviera y la otra no era lo que dejaba entrar la charla
 * justo en la mitad ruidosa.
 */
const CALLADAS = new Set([
  /*
   * **Y en el punto de espera, que es cuando la torre habla contigo.** Ahí
   * se dicen cuatro cosas en diez segundos —la lámpara roja y su «hold
   * short», la verde y su autorización—, y si el otro avión llamaba en ese
   * momento la cola se llenaba y lo que se caía era **tu autorización de
   * despegue**: medido en La Palma jugando a velocidad normal, «cleared for
   * take-off» caducó esperando detrás de la charla. La frecuencia puede
   * esperar diez segundos; tu permiso no.
   */
  "esperando",
  "autorizado",
  "alineando",
  "despegando",
  "comprometido",
  "final",
  "aterrizado",
  "percance",
]);

/**
 * Las fases en las que la pista es **tuya**: te la han dado o la estás usando.
 *
 * Desde que te autorizan a entrar hasta que despegas, y desde que te
 * autorizan a aterrizar hasta que la dejas libre. Mientras tanto la torre no
 * se la da a nadie más, que es lo único que una torre no hace nunca: en una
 * final corta a Los Rodeos, con tu «cleared to land» ya dicho, autorizaba a
 * otro a despegar; y con tu avión rodando por la pista, a otro a entrar en
 * ella. La radio es ambiente, pero **lo que cuenta tiene que poder pasar**.
 */
export const PISTA_TUYA: ReadonlySet<string> = new Set([
  "autorizado",
  "alineando",
  "back-taxi",
  "despegando",
  "comprometido",
  "final",
  "aterrizado",
  "abandonando",
]);

/** Las órdenes de la torre que le dan la pista a alguien. */
const DAN_LA_PISTA: ReadonlySet<string> = new Set([
  "torre.lineUpWait",
  "torre.clearedTakeoff",
  "torre.clearedLand",
]);

/** Cuántos comparten la frecuencia. */
export const CUANTOS = 2;

/** Segundos hasta la primera frase, y entre una llamada y la siguiente. */
export const ESPERA_PRIMERA = 12;
export const ESPERA_MINIMA = 35;
export const ESPERA_MAXIMA = 75;
/** Lo que tarda en contestar quien contesta. Segundos, no decenas. */
export const RESPUESTA_MINIMA = 2.5;
export const RESPUESTA_MAXIMA = 5;
/** Y el silencio largo cuando uno termina su vuelo y se va otro en su sitio. */
export const ESPERA_ENTRE_VUELOS = 150;
/**
 * El hueco mínimo entre dos transmisiones **de cualquiera**.
 *
 * Sin esto, dos aviones con los relojes cerca sueltan sus frases en el mismo
 * segundo y lo que se oye no es una frecuencia concurrida: es un atasco. En
 * una radio de verdad se espera a que el otro suelte el pulsador.
 */
export const HUECO_DEL_CANAL = 4;

/** Cuántas veces se vuelve a sortear una matrícula que ya está sonando. */
const INTENTOS = 8;

interface EnLaFrecuencia {
  indicativo: Indicativo;
  guion: Guion;
  paso: number;
  falta: number;
  /** Si todavía no ha dicho nada: es quien puede dar los buenos días. */
  estrena: boolean;
}

export class Frecuencia {
  private readonly azar: () => number;
  private aviones: EnLaFrecuencia[] = [];
  /** Lo que queda de silencio obligatorio en el canal. */
  private canal = 0;
  /** Lo último que se oyó, para que la pantalla lo pueda enseñar. */
  private dicho: Transmision | null = null;
  private aerodromo: string | null = null;

  constructor(azar: () => number = Math.random, aerodromo?: string | null) {
    this.azar = azar;
    this.reiniciar(aerodromo ?? null);
  }

  /** Lo último que se dijo en la frecuencia, o `null` si todavía nada. */
  get ultima(): Transmision | null {
    return this.dicho;
  }

  /** Quiénes están hoy en la frecuencia. */
  get quienes(): readonly Indicativo[] {
    return this.aviones.map((a) => a.indicativo);
  }

  /** Y sus matrículas escritas, que es lo que mira el banco de pruebas. */
  get matriculas(): readonly string[] {
    return this.aviones.map((a) => a.indicativo.matricula);
  }

  /**
   * Vuelve a empezar, con el prefijo de matrícula del aeródromo de hoy.
   *
   * Los indicativos se sortean por vuelo: en Tenerife los otros son EC- y en
   * Asunción ZP-, porque un avión que anda por ahí es de ahí. El tuyo no se
   * sortea nunca — ése lo lleva pintado. Ver `matriculaDe`.
   */
  reiniciar(aerodromo: string | null | undefined = this.aerodromo): void {
    this.aerodromo = aerodromo ?? null;
    this.canal = 0;
    this.dicho = null;
    /*
     * Escalonados a propósito: si los dos arrancan con la misma espera, el
     * primer minuto de cada vuelo suena igual que el anterior, que es
     * exactamente la queja de la que sale todo esto.
     */
    this.aviones = [];
    for (let i = 0; i < CUANTOS; i++) {
      this.aviones.push({
        ...this.nuevo(),
        falta: ESPERA_PRIMERA + i * (ESPERA_MINIMA / 2 + this.azar() * 20),
      });
    }
  }

  /**
   * Pasa el tiempo y devuelve qué se oye ahora, o `null`.
   *
   * Cuando toca hablar pero el momento no es bueno **no se pierde el turno**:
   * se espera. Una frase que se salta deja el relato cojo, y el relato es lo
   * único que hace que esto suene a otros aviones y no a un altavoz.
   */
  update(dt: number, m: Momento): Transmision | null {
    this.canal -= dt;
    for (const a of this.aviones) a.falta -= dt;
    if (this.canal > 0) return null;
    if (CALLADAS.has(m.fase) || m.instructorHablando) return null;

    /*
     * Habla el que lleva más rato esperando, no el primero de la lista. Con lo
     * segundo, el avión de arriba se come el canal siempre que los dos estén
     * listos y el de abajo no llega a decir nunca la suya.
     */
    /*
     * **Y la pista que es tuya no se le da a nadie.** Quien espera una de esas
     * órdenes sigue esperando —no pierde el turno, igual que arriba— y
     * mientras tanto puede hablar el otro. Ver `PISTA_TUYA`.
     */
    const pistaTuya = PISTA_TUYA.has(m.fase);
    let quien: EnLaFrecuencia | null = null;
    for (const a of this.aviones) {
      if (a.falta > 0) continue;
      if (pistaTuya && DAN_LA_PISTA.has(GUIONES[a.guion][a.paso]!.clave))
        continue;
      if (!quien || a.falta < quien.falta) quien = a;
    }
    if (!quien) return null;

    const paso = GUIONES[quien.guion][quien.paso]!;
    /*
     * Y «buenos días» solo de día, y solo de quien abre la frecuencia. No se
     * salta la llamada —eso dejaba al otro avión sin anunciar que salía
     * durante toda la noche—: se dice la misma frase sin el saludo delante.
     */
    const clave =
      paso.clave === SE_SALUDA_EN && m.deDia && quien.estrena
        ? CON_SALUDO
        : paso.clave;
    const dice: Transmision = {
      voz: paso.voz,
      clave,
      de: quien.indicativo,
      respuesta: paso.seguido === true,
    };
    quien.estrena = false;
    this.avanzar(quien);
    this.canal = HUECO_DEL_CANAL;
    this.dicho = dice;
    return dice;
  }

  /** Pasa al siguiente paso, o empieza otro vuelo con otra matrícula. */
  private avanzar(a: EnLaFrecuencia): void {
    const guion = GUIONES[a.guion];
    a.paso += 1;
    if (a.paso >= guion.length) {
      /*
       * Se acabó su vuelo: se va y en su sitio aparece otro, con otra
       * matrícula y otro asunto. Reciclar el mismo indicativo es lo que hacía
       * que la frecuencia sonara a un bucle en vez de a un aeropuerto.
       */
      Object.assign(a, this.nuevo(), { falta: ESPERA_ENTRE_VUELOS });
      return;
    }
    const siguiente = guion[a.paso]!;
    a.falta = siguiente.seguido
      ? RESPUESTA_MINIMA + this.azar() * (RESPUESTA_MAXIMA - RESPUESTA_MINIMA)
      : ESPERA_MINIMA + this.azar() * (ESPERA_MAXIMA - ESPERA_MINIMA);
  }

  /**
   * Un recién llegado a la frecuencia: matrícula nueva y asunto nuevo.
   *
   * Y **una matrícula que no esté ya sonando**. Dos aviones con el mismo
   * indicativo en la misma frecuencia no es un detalle estético: es la única
   * cosa que de verdad no puede pasar en una radio, porque una instrucción
   * deja de saberse para quién es. Con tres letras libres el choque es raro,
   * pero raro no es nunca y esto cuesta tres intentos.
   */
  private nuevo(): EnLaFrecuencia {
    const puestas = new Set(this.aviones?.map((a) => a.indicativo.matricula));
    let indicativo = sortearIndicativo(this.aerodromo, this.azar);
    for (let i = 0; i < INTENTOS && puestas.has(indicativo.matricula); i++) {
      indicativo = sortearIndicativo(this.aerodromo, this.azar);
    }
    return {
      indicativo,
      guion: CUALES[Math.floor(this.azar() * CUALES.length)] ?? "sale",
      paso: 0,
      falta: 0,
      estrena: true,
    };
  }
}

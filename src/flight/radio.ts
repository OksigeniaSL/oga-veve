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
  /**
   * Si estás **esperando a que te den la pista**: parado en el punto de espera
   * con la lámpara roja, o en final detrás de uno que aterriza antes que vos.
   *
   * Entonces hablan los que la ocupan, aunque la fase sea de las que callan.
   * Lo que se espera es justo lo que ellos van a decir —«pista libre», «go
   * around»—, y con la frecuencia callada no lo decía nadie: el que tenía la
   * pista no la soltaba nunca mientras esperabas, y la torre acababa
   * mandándolo al aire para dártela a vos. Ver `ocupanLaPista`.
   */
  readonly esperandoLaPista?: boolean;
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
  /**
   * Si esta orden **le quita a alguien una pista que se le dio de viva voz**:
   * al alineado, la salida; al autorizado a aterrizar, que se vaya al aire.
   *
   * Es la que no puede faltar cuando la pista pasa a ser tuya. Un «cleared to
   * land» a otro, oído y nunca anulado, seguido del tuyo por la misma pista,
   * es la torre dándosela a dos. Ver `laQueSeDice`.
   */
  readonly quitaPermiso?: boolean;
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
export const CALLADAS: ReadonlySet<string> = new Set([
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
 *
 * Y no dársela a nadie es la mitad. La otra es **quitársela antes a quien la
 * tuviera**, que es lo que hace una torre antes de dártela: ver
 * `despejarLaPista`. Seis de estas ocho fases ya callaban la frecuencia
 * entera —ver `CALLADAS`—, así que callar no bastaba: el que estaba alineado
 * seguía en el eje durante toda tu toma, porque la orden que lo sacaba de ahí
 * era justo una de las que no se podían decir.
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
export const DAN_LA_PISTA: ReadonlySet<string> = new Set([
  "torre.lineUpWait",
  "torre.clearedTakeoff",
  "torre.clearedLand",
]);

/**
 * Las que además la **sujetan**: dicha una, ese avión tiene la pista hasta
 * que la suelta. El que entra en el eje la tiene hasta que despega; el que
 * está autorizado a aterrizar, hasta que la deja libre.
 *
 * «Cleared for take-off» da la pista y no la sujeta: el que la recibe sale
 * del eje a velocidad de vuelo —ver `caminosDe` en `world/trafico.ts`— y en
 * unos segundos ya no está en ella.
 */
const LA_SUJETAN: ReadonlySet<string> = new Set([
  "torre.lineUpWait",
  "torre.clearedLand",
]);

/** Y lo que la suelta: despegar, irse al aire o salir de ella. */
const LA_SUELTAN: ReadonlySet<string> = new Set([
  "torre.clearedTakeoff",
  "torre.goAround",
  "otro.pistaLibre",
]);

/**
 * Con qué orden tiene la pista un avión que va por `paso` de su `guion`, o
 * `null` si no la tiene: la última que la sujetó sin nada detrás que la
 * soltara.
 */
export function laPistaQueTiene(guion: Guion, paso: number): string | null {
  const pasos = GUIONES[guion];
  for (let i = Math.min(paso, pasos.length) - 1; i >= 0; i--) {
    const clave = pasos[i]!.clave;
    if (LA_SUELTAN.has(clave)) return null;
    if (LA_SUJETAN.has(clave)) return clave;
  }
  return null;
}

/**
 * Con qué **ocupa** la pista un avión: la que tiene —ver `laPistaQueTiene`—
 * o, si no tiene permiso, `otro.final` si ha cantado final sin él y viene
 * hacia ella. `null` si ni una cosa ni la otra.
 *
 * «Tener la pista» contaba solo autorizaciones, y el que viene en final sin
 * ninguna también va a usarla: el de la frustrada canta «en final» y espera
 * su «go around». Con la pista pasando a ser tuya justo entonces, la torre no
 * le decía nada —la frecuencia calla en final— y seguía bajando delante de ti
 * hasta once metros sobre tu pista. Medido en Gando con el JAZ 20.
 */
export function laPistaQueOcupa(guion: Guion, paso: number): string | null {
  const tiene = laPistaQueTiene(guion, paso);
  if (tiene) return tiene;
  const pasos = GUIONES[guion];
  for (let i = Math.min(paso, pasos.length) - 1; i >= 0; i--) {
    const clave = pasos[i]!.clave;
    if (LA_SUELTAN.has(clave)) return null;
    if (clave === "otro.final") return clave;
  }
  return null;
}

/**
 * Si un avión **va delante en final con su permiso**: autorizado a aterrizar
 * y con su «en final» ya cantado después.
 *
 * Es al único al que no se le quita la pista para dártela. Llegando detrás
 * de él, una torre de verdad no manda al aire al que ya está a punto de
 * tocar: te deja de número dos, aterriza él, y te autoriza cuando la deja
 * libre. Ver `quitarleLaPistaALosDemas` en `game.ts`.
 */
export function vaDelanteEnFinal(guion: Guion, paso: number): boolean {
  if (laPistaQueTiene(guion, paso) !== "torre.clearedLand") return false;
  const pasos = GUIONES[guion];
  for (let i = Math.min(paso, pasos.length) - 1; i >= 0; i--) {
    const clave = pasos[i]!.clave;
    if (clave === "otro.final") return true;
    if (clave === "torre.clearedLand") return false;
  }
  return false;
}

/**
 * Si un avión **viene a aterrizar**: ha cantado viento en cola o final y
 * todavía no ha soltado la pista —ni se fue al aire ni la dejó libre—, con
 * permiso o sin él. Es el que se ve volando el circuito hacia la pista.
 */
function vieneAAterrizar(guion: Guion, paso: number): boolean {
  const pasos = GUIONES[guion];
  for (let i = Math.min(paso, pasos.length) - 1; i >= 0; i--) {
    const clave = pasos[i]!.clave;
    if (LA_SUELTAN.has(clave)) return false;
    if (clave === "otro.enCola" || clave === "otro.final") return true;
  }
  return false;
}

/**
 * Lo que la torre le dice a quien ocupa la pista para quitársela: al que
 * espera en el eje, que despegue; al que viene a aterrizar, con permiso o
 * cantando final sin él, que se vaya al aire. Son las dos cosas que hace una
 * torre de verdad, y las dos están grabadas.
 */
export const PARA_QUITARSELA: Readonly<Record<string, string>> = {
  "torre.lineUpWait": "torre.clearedTakeoff",
  "torre.clearedLand": "torre.goAround",
  "otro.final": "torre.goAround",
};

/**
 * De lo que se le dice a los que tenían la pista, **cuál se dice en voz alta**.
 *
 * Una, y **la que anula un permiso que se oyó**: si la torre le dijo a otro
 * «cleared to land» o «line up and wait», eso sonó, y tu autorización por la
 * misma pista no puede sonar sin que antes suene lo que lo anula. Con la boca
 * ocupada esto no se decía, y se oía «Echo Charlie Golf Papa Golf, cleared to
 * land» y después el tuyo, sin nada entre medias. Permisos a la vez solo
 * puede haber uno —la frecuencia no le da la pista a nadie mientras la tiene
 * otro—, así que la que anula es como mucho una.
 *
 * Si no la hay, la del que está en el eje, y si no, la primera. Las demás
 * pasan igual —el avión se va al aire y se ve— pero calladas, como pasa todo
 * lo de la frecuencia en final. Con dos dichas delante, tu «cleared to land»
 * esperaba dieciséis segundos y caducaba sin sonar: medido entrando en final
 * en Gando con uno alineado y otro autorizado a la vez.
 */
export function laQueSeDice(dichas: readonly Transmision[]): Transmision | null {
  return (
    dichas.find((d) => d.quitaPermiso) ??
    dichas.find((d) => d.clave === "torre.clearedTakeoff") ??
    dichas[0] ??
    null
  );
}

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

  /** Quién tiene la pista ahora mismo, y con qué orden. Ver `laPistaQueTiene`. */
  get conLaPista(): readonly { matricula: string; orden: string }[] {
    return this.aviones.flatMap((a) => {
      const orden = laPistaQueTiene(a.guion, a.paso);
      return orden ? [{ matricula: a.indicativo.matricula, orden }] : [];
    });
  }

  /**
   * Quién **ocupa** la pista: la tiene, o viene en final sin permiso. Ver
   * `laPistaQueOcupa`.
   *
   * Es lo que mira la torre antes de ponerte la lámpara en verde en el punto
   * de espera. La verde no miraba la frecuencia: con otro autorizado a
   * aterrizar —a veces ya en final corta—, la torre lo mandaba al aire para
   * dártela a vos, cuando lo que hace una torre de verdad es dejarte en la
   * roja y que aterrice el que viene. Es la lección del guion de la espera.
   */
  get ocupanLaPista(): readonly { matricula: string; orden: string }[] {
    return this.aviones.flatMap((a) => {
      const orden = laPistaQueOcupa(a.guion, a.paso);
      return orden ? [{ matricula: a.indicativo.matricula, orden }] : [];
    });
  }

  /** Si alguien ocupa la pista, sin hacer la lista. Ver `ocupanLaPista`. */
  get pistaOcupada(): boolean {
    return this.aviones.some((a) => laPistaQueOcupa(a.guion, a.paso) !== null);
  }

  /**
   * La matrícula del que **va delante en final con su permiso**, o `null`.
   *
   * El permiso lo sabe la frecuencia, que es quien lo dio; **dónde está lo
   * sabe el dibujo**, y es `delante`: si el avión dibujado de esa matrícula
   * vuela la final por delante de ti. Esto se decidía solo por el guion —con
   * su «en final» cantado—, y la marca de esa frase caía en la base, justo
   * donde gira a final quien vuela el circuito del juego: la torre te dejaba
   * de número dos detrás de un avión que se veía a tu lado o detrás, y te
   * mandaba al aire en la decisión para dejarle aterrizar a él.
   *
   * Sin dibujo que mirar, lo dice el guion: ver `vaDelanteEnFinal`.
   */
  vaDelante(delante?: (matricula: string) => boolean): string | null {
    for (const a of this.aviones) {
      if (laPistaQueTiene(a.guion, a.paso) !== "torre.clearedLand") continue;
      const matricula = a.indicativo.matricula;
      if (delante ? delante(matricula) : vaDelanteEnFinal(a.guion, a.paso))
        return matricula;
    }
    return null;
  }

  /** Si ese avión tiene todavía la pista. Ver `laPistaQueTiene`. */
  laTiene(matricula: string): boolean {
    const a = this.aviones.find((x) => x.indicativo.matricula === matricula);
    return !!a && laPistaQueTiene(a.guion, a.paso) !== null;
  }

  /**
   * Si ese avión **está autorizado a aterrizar**. Es lo que decide si el
   * dibujado puede tocar la pista o tiene que irse al aire al llegar a la
   * altura de decisión. Ver `anuncia` en `world/trafico.ts`.
   */
  puedeAterrizar(matricula: string): boolean {
    const a = this.aviones.find((x) => x.indicativo.matricula === matricula);
    return !!a && laPistaQueTiene(a.guion, a.paso) === "torre.clearedLand";
  }

  /**
   * **Si el avión dibujado de esa matrícula todavía no está donde dice esa
   * llamada.** Lo pone el juego, que es quien lo dibuja; sin nadie dibujado,
   * cada uno está donde diga. Ver `todaviaNo` en `world/trafico.ts`.
   *
   * «Pista libre» se decía a su hora de radio, y el avión dibujado la cantaba
   * al tocar tierra y se quedaba minuto y medio rodando por el asfalto que
   * acababa de dejar libre. Con la torre esperando a esa frase para ponerte
   * en verde, entrabas a una pista con otro avión encima. Y «en final» se
   * decía con el avión todavía en la base. Ahora quien las dice espera a
   * estar donde dicen, y no pierde el turno: habla en cuanto llega.
   */
  todaviaNo: (matricula: string, clave: string) => boolean = () => false;

  /**
   * **Te van a dar la pista: antes se le quita a quien la tenga.**
   *
   * Lo llama el juego en cuanto la pista pasa a ser tuya, y **antes** de que
   * la torre te la dé a vos, que es el orden en que lo haría una torre de
   * verdad: «Echo Charlie Kilo, cleared for take-off» y después tu «cleared
   * to land». Al revés sería autorizarte a aterrizar con otro plantado en el
   * eje, que es de lo poco que en una torre no se hace nunca.
   *
   * Hacía falta porque `PISTA_TUYA` solo impedía **darla**: el que ya la
   * tenía se quedaba con ella. Con 400 frecuencias sorteadas y un aterrizaje
   * encima, en 132 había un avión alineado en el eje durante toda la toma y
   * en 268 uno autorizado a aterrizar seguía cantando su final; al que venía
   * detrás no lo mandaba al aire nadie.
   *
   * Devuelve lo que la torre les dice, en orden; quien pregunta lo dibuja
   * todo y dice como mucho una. Ver `laQueSeDice`.
   *
   * **Y a quien la ocupa, no solo a quien la tiene.** El que canta final sin
   * permiso también va a tu pista, y se le dice lo que su guion ya esperaba:
   * que se vaya al aire. Ver `laPistaQueOcupa`.
   *
   * `respetar` es la matrícula del que va delante en final con su permiso,
   * si lo hay: a ése no se le quita, aterriza él primero. Ver `vaDelante`.
   */
  despejarLaPista(respetar: string | null = null): Transmision[] {
    const dichas: Transmision[] = [];
    for (const a of this.aviones) {
      if (a.indicativo.matricula === respetar) continue;
      const ocupa = laPistaQueOcupa(a.guion, a.paso);
      const clave = ocupa ? PARA_QUITARSELA[ocupa] : undefined;
      if (!clave) continue;
      dichas.push({
        voz: "torre",
        clave,
        de: a.indicativo,
        respuesta: false,
        quitaPermiso: ocupa !== "otro.final",
      });
      a.estrena = false;
      if (clave === "torre.clearedTakeoff") {
        /*
         * Lo que le tocaba después del eje era justo esto, así que se da por
         * dicho y sigue su guion: despega, y en su sitio llega otro.
         */
        const i = GUIONES[a.guion].findIndex(
          (p, j) => j >= a.paso && p.clave === clave,
        );
        if (i >= 0) a.paso = i;
      } else {
        /*
         * Y al que se va al aire le queda lo mismo que al del guion de la
         * frustrada a partir de ahí: vuelve al viento en cola, pide otra vez,
         * y aterriza cuando la pista ya no es tuya.
         */
        a.guion = "frustrada";
        a.paso = GUIONES.frustrada.findIndex((p) => p.clave === clave);
      }
      this.avanzar(a);
    }
    const ultima = dichas[dichas.length - 1];
    if (ultima) {
      this.canal = HUECO_DEL_CANAL;
      this.dicho = ultima;
    }
    return dichas;
  }

  /**
   * **Uno que venía a aterrizar sin permiso llegó a la altura de decisión, y
   * se fue al aire.** Lo dice el juego, que es quien lo ve: ver `paso` en
   * `world/trafico.ts`.
   *
   * Sin permiso no se toca la pista, y eso es lo único que el avión dibujado
   * no sabía: volaba el circuito entero y se posaba, autorizado o no. Con la
   * pista tuya la frecuencia no autoriza a nadie, así que el que había cantado
   * viento en cola se quedaba esperando su «cleared to land» y su avión bajaba
   * igual, delante o detrás de ti, hasta veintitrés metros sobre tu pista.
   *
   * Aquí se apunta lo que ha pasado: desde ahora va por la frustrada, con la
   * vuelta al circuito por delante, y **no** se le dice después un «go
   * around» a destiempo ni un «cleared to land» que ya no vale. Si la
   * frecuencia puede hablar ahora mismo, la torre se lo dice —es lo que haría
   * con la pista ocupada, y está grabado—; si no, pasa callado, como todo lo
   * de la frecuencia en final, y se ve.
   */
  seFueAlAire(matricula: string, m: Momento): Transmision | null {
    const a = this.aviones.find((x) => x.indicativo.matricula === matricula);
    if (!a || laPistaQueTiene(a.guion, a.paso) || !vieneAAterrizar(a.guion, a.paso))
      return null;
    a.guion = "frustrada";
    a.paso = GUIONES.frustrada.findIndex((p) => p.clave === "torre.goAround");
    a.estrena = false;
    this.avanzar(a);
    if (this.canal > 0 || m.instructorHablando || CALLADAS.has(m.fase)) return null;
    const dice: Transmision = {
      voz: "torre",
      clave: "torre.goAround",
      de: a.indicativo,
      respuesta: false,
    };
    this.canal = HUECO_DEL_CANAL;
    this.dicho = dice;
    return dice;
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
    if (m.instructorHablando) return null;
    /*
     * **Y esperando la pista, hablan los que la ocupan.** Solo ellos: lo que
     * se espera es lo suyo, y el resto de la frecuencia sigue callada, que la
     * fase lo pide igual. Ver `Momento.esperandoLaPista`.
     */
    const soloLosDeLaPista = CALLADAS.has(m.fase);
    if (soloLosDeLaPista && !m.esperandoLaPista) return null;

    /*
     * Habla el que lleva más rato esperando, no el primero de la lista. Con lo
     * segundo, el avión de arriba se come el canal siempre que los dos estén
     * listos y el de abajo no llega a decir nunca la suya.
     */
    /*
     * **Y la pista que es tuya no se le da a nadie.** Quien espera una de esas
     * órdenes sigue esperando —no pierde el turno, igual que arriba— y
     * mientras tanto puede hablar el otro. Ver `PISTA_TUYA`.
     *
     * Esto solo se nota en las dos fases de la pista que no están calladas:
     * el back-taxi y el rato de dejarla libre. En las otras seis ya no habla
     * nadie.
     *
     * **Y la que tiene otro de la frecuencia, tampoco.** Es la misma regla
     * entre ellos: con dos aviones sorteados, en 338 de 400 frecuencias de
     * veinte minutos había un rato con dos a la vez en la pista —los dos
     * alineados en el mismo eje, o uno en el eje y otro autorizado a
     * aterrizar encima—. El que la tiene sigue su guion y la suelta; el otro
     * espera, que es la lección del guion de la espera.
     */
    const pistaTuya = PISTA_TUYA.has(m.fase);
    let quien: EnLaFrecuencia | null = null;
    for (const a of this.aviones) {
      if (a.falta > 0) continue;
      if (soloLosDeLaPista && !laPistaQueOcupa(a.guion, a.paso)) continue;
      const toca = GUIONES[a.guion][a.paso]!.clave;
      // «Pista libre» fuera de la pista, y «en final» en final. Ver `todaviaNo`.
      if (this.todaviaNo(a.indicativo.matricula, toca)) continue;
      if (
        DAN_LA_PISTA.has(toca) &&
        (pistaTuya ||
          this.aviones.some(
            (b) => b !== a && laPistaQueTiene(b.guion, b.paso) !== null,
          ))
      )
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

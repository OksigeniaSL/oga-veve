/**
 * Lo que dice la torre por radio, y **qué grabación le toca a cada cosa**.
 *
 * La torre del juego tenía **siete frases grabadas y decía dos**. Las otras
 * cinco —«cleared for take-off», «cleared to land», «go around, runway
 * occupied», «hold short of the runway», «line up and wait»— estaban grabadas,
 * horneadas, publicadas y bajadas a cada tablet **sin que nada en `src/` las
 * nombrara**: solo aparecían en el guion que las generó. Se oyó jugando: «las
 * voces de torre y radio parece que se oyen, pero hay unas pocas frases».
 *
 * Es el mismo agujero que ya se tapó con los cantos de cabina, y por el mismo
 * motivo: esas frases se piden **por su texto en inglés** —que es como se
 * escriben en una radio de verdad— y el pack de voz busca **por clave**. Sin
 * nada que una las dos cosas, la grabación no suena y nadie se entera.
 *
 * ## Y son en inglés a propósito
 *
 * `i18n/habla.ts` ya lo tenía escrito: «lo que **no** cambia es el inglés
 * aeronáutico: `cleared for take-off` se dice igual en Tenerife, en Asunción y
 * en cualquier torre del mundo. Esa es media lección del juego». Las dos
 * frases en castellano que ya sonaban —«Podés entrar», «Esperá acá»— son la
 * **lámpara** hablando, que es la instrucción para quien tiene cuatro años y
 * no lee. Estas son la radio, que es el mundo.
 *
 * La tabla va aquí y no dentro de `game.ts` para que una prueba pueda
 * comprobar lo único que importa: que no sobre ninguna grabación.
 */

/** De lo que dice la torre a la clave con la que está grabado. */
export const CLAVE_DE_TORRE: Readonly<Record<string, string>> = {
  /*
   * La autorización, antes de rodar: «cleared to» y el límite, que en un
   * vuelo a otro aeródromo es ese aeródromo. Es la única de la tabla con el
   * sitio en un hueco —`{destino}`—, y solo se da a los aviones de línea, que
   * son los que vuelan con plan instrumental. Ver `autorizarLaRuta`.
   */
  "cleared to": "torre.clearedTo",
  // La secuencia de salida, en el orden en que se oye.
  "hold short of the runway": "torre.holdShort",
  /*
   * **Y ésta todavía no la dice nadie, y se dice aquí para que se vea.**
   *
   * «Line up and wait» es entrar en pista y esperar ahí al permiso de
   * despegue, y en el juego **ese momento no existe**: la luz verde ya
   * significa que podés despegar, así que se entra y se va. Ponerla por
   * ponerla sería decir algo que no está pasando.
   *
   * Se queda en la tabla a propósito, en vez de borrarla de la lista o quitar
   * la grabación: existe, está grabada, y el día que la torre pueda parar a
   * alguien en el eje —con tráfico de verdad, que es el #118— ya está. Lo que
   * no puede pasar es que se quede escondida otra vez, y por eso está escrito.
   */
  "line up and wait": "torre.lineUpWait",
  "cleared for take-off": "torre.clearedTakeoff",
  // Y la de llegada.
  "cleared to land": "torre.clearedLand",
  "go around, runway occupied": "torre.goAround",
};

/**
 * Cuáles de esas órdenes **nombran la pista**, y por tanto llevan su lado.
 *
 * «Cleared for take-off» se dice con la pista delante —«runway zero three
 * left, cleared for take-off»— porque en un aeropuerto con dos paralelas decir
 * «zero three» a secas es no decir cuál. «Hold short» y «go around» no la
 * nombran: paras donde estás, o te vas al aire.
 *
 * Hace falta escrito porque el lado se le pegaba **a todas**, y una clave con
 * lado que no tiene receta no se monta: la frase se caía a la voz del
 * navegador sin que nadie se enterara. Medido en Gran Canaria:
 * `torre.holdShort.L`, que no existe.
 */
export const NOMBRA_LA_PISTA: ReadonlySet<string> = new Set([
  "torre.clearedTakeoff",
  "torre.clearedLand",
  "torre.lineUpWait",
]);

/**
 * La clave de una frase de torre, o `null` si esa frase no está grabada.
 *
 * Se compara en minúsculas y sin puntuación final, que es como se pide desde
 * el juego y como se escribe en una lista de llamadas.
 */
export function claveDeTorre(dice: string): string | null {
  const limpio = dice
    .trim()
    .toLowerCase()
    .replace(/[.!]+$/, "");
  for (const [suyo, clave] of Object.entries(CLAVE_DE_TORRE)) {
    if (limpio === suyo.toLowerCase()) return clave;
  }
  return null;
}

/**
 * Y al revés: de la clave grabada a lo que se dice.
 *
 * Hace falta desde que la torre habla **con los demás aviones de la
 * frecuencia** y no solo con vos: allí la orden nace ya como clave —la elige
 * el guion de la radio— y lo que falta es el texto, que es lo que dice la voz
 * del navegador cuando no hay pack y lo que se lee en la tira de la pantalla.
 *
 * Se deriva de la tabla de arriba en vez de escribirse a mano, que es la
 * diferencia entre una tabla y dos tablas que un día dejan de coincidir.
 */
export const DICE_LA_TORRE: Readonly<Record<string, string>> =
  Object.fromEntries(
    Object.entries(CLAVE_DE_TORRE).map(([dice, clave]) => [clave, dice]),
  );

/**
 * Si esta frase, pedida a la boca, es **la lámpara hablándote a vos**: la luz
 * en castellano o la orden de pista en fraseología, con tu matrícula.
 *
 * Es lo que se retira de la cola cuando la lámpara cambia de color, porque lo
 * que decía la de antes ya no es verdad. Se reconoce por la clave —con el
 * habla y el lado que lleve— y por el peso: lo que la torre dice a los demás
 * aviones va en `baja`, y lo tuyo nunca. Así vale también sin pack de voz,
 * donde la clave no lleva la matrícula detrás. Ver `luzDeTorre` en `game.ts`.
 *
 * **Y por a quién va, cuando se sabe.** Hay dos órdenes a los demás que no van
 * en `baja`: las que les quitan la pista justo antes de dártela a vos —ver
 * `despejarLaPista` en `flight/radio.ts`—, que son la mitad de tu autorización
 * y no se pueden quedar detrás de ella. Llegan en el mismo fotograma en que la
 * luz se pone verde, y sin esto la lámpara las retiraba de la cola como si
 * fueran suyas. `mia` es tu matrícula tal como va en la clave, detrás de la
 * arroba: lo que va a otra matrícula no es de tu lámpara.
 */
export function esDeLaLampara(
  clave: string | undefined,
  urgencia: string,
  mia?: string,
): boolean {
  if (!clave || urgencia === "baja") return false;
  const a = clave.indexOf("@");
  if (mia && a >= 0 && !clave.startsWith(mia, a + 1)) return false;
  return DE_LA_LAMPARA.test(clave);
}

const DE_LA_LAMPARA =
  /^(?:torre|palabra)\.(?:[a-z]+\.)?(?:roja|verde|aterrizar|alAire|holdShort|lineUpWait|clearedTakeoff|clearedLand|goAround)(?:\.[LCR])?(?:@|$)/;

/**
 * Si esta frase es **la torre dándole la pista a otro avión**, todavía en la
 * cola: «line up and wait», «cleared for take-off» o «cleared to land» a una
 * matrícula de la frecuencia.
 *
 * Es lo que se retira de la cola en cuanto la pista pasa a ser tuya. La
 * frecuencia ya no da la pista a nadie mientras es tuya —ver `PISTA_TUYA`—,
 * pero lo que dio un momento antes podía estar esperando turno en la boca
 * hasta doce segundos —`CADUCA_LA_ORDEN`—, y tu autorización, que va en
 * `mando`, se le colaba delante: se oía tu «cleared to land» y detrás un «line
 * up and wait» a otro. Medido en Pettirossi y en Gran Canaria. Lo de los
 * demás va en `baja`; lo que no va en `baja` es tuyo o les quita la pista, y
 * eso se queda.
 */
export function daLaPistaAOtro(
  clave: string | undefined,
  urgencia: string,
): boolean {
  return !!clave && urgencia === "baja" && DA_LA_PISTA.test(clave);
}

const DA_LA_PISTA =
  /^torre\.(?:[a-z]+\.)?(?:lineUpWait|clearedTakeoff|clearedLand)(?:\.[LCR])?(?:@|$)/;

/**
 * Si esta frase es **la frecuencia de un campo**: la torre hablándoles a los
 * demás, o los demás hablando. Todo eso va en `baja`.
 *
 * Es lo que se retira de la cola al cambiar de campo, porque es la gente de
 * allí: la frecuencia se vuelve a empezar con la de aquí, y lo que la de allí
 * dejó esperando turno se oía ya en el campo nuevo —en Gando, un «cleared to
 * land» a un avión de Los Rodeos, con la 12 de Los Rodeos—.
 */
export function esDeLaFrecuencia(
  clave: string | undefined,
  urgencia: string,
): boolean {
  return !!clave && urgencia === "baja" && /^(?:torre|otro)\./.test(clave);
}

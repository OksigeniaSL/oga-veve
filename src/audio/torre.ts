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
 * frases en castellano que ya sonaban —«autorizado a despegar», «mantenga
 * fuera de pista»— son la **lámpara** hablando, que es la instrucción para
 * quien tiene cuatro años y no lee. Estas son la radio, que es el mundo.
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
   * **Y con el porqué, cuando se espera por alguien.** Es la información de
   * tráfico que da una torre de verdad a quien deja en el punto de espera:
   * uno que viene a aterrizar, o uno alineado que sale antes. Sin ella, la
   * roja podía durar tres minutos con un «hold short» a secas. Ver
   * `porQueEsperas` en `flight/turno-de-pista.ts`.
   */
  "hold short of the runway, landing traffic": "torre.holdShortLanding",
  "hold short of the runway, departing traffic": "torre.holdShortDeparting",
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
  /*
   * **Y las de quien viene por la otra punta.** Primero la pista en uso, con
   * su número detrás —«runway in use zero three», como se dice en un ATIS—,
   * y si se sigue, la orden de irse al aire con el mismo porqué. No es «runway
   * occupied»: la pista está libre, lo que está mal es el sentido. Ver
   * `flight/la-otra-cabecera.ts`.
   */
  "runway in use": "torre.pistaEnUso",
  "go around, runway in use": "torre.goAroundEnUso",
  /*
   * **Y la respuesta a un MAYDAY**: el indicativo y «roger MAYDAY», que es
   * como una torre dice que ha oído la llamada de socorro y que desde ahí
   * manda ella en la frecuencia. La pista, después, en la autorización de
   * siempre: la que pida quien no tiene motor. Ver `flight/sin-motor.ts`.
   */
  "roger MAYDAY": "torre.mayday",
  /*
   * Y a quien se pasó la salida: abandone por la próxima disponible. Ver
   * `decirSalPorLaSiguiente` en `game.ts`.
   */
  "vacate next available": "torre.vacateNext",
};

/**
 * **Lo que dice un AFIS**, que no es una torre. Ver `Aerodrome.afis`.
 *
 * Un AFIS da información y quien vuela decide: la pista en uso, el viento y el
 * tráfico que conoce. Ni «cleared for take-off», ni «cleared to land», ni «go
 * around» —no manda—. La fraseología es la de la IFISA (la asociación
 * internacional de los AFIS, su guía de 2016): «RUNWAY IN USE», «NO REPORTED
 * TRAFFIC», «RUNWAY (number) FREE» y «RUNWAY (number) OCCUPIED», que es lo
 * que se dice a quien está listo para salir o va en final.
 *
 * Por qué hay **dos «free»** que suenan igual: la frecuencia distingue por la
 * clave lo que le da la pista a otro y se la deja —el que va a aterrizar— de
 * lo que se la da y se la quita en el mismo instante —el que despega—, y la
 * boca retira lo primero cuando la pista pasa a ser tuya.
 * Ver `DA_LA_PISTA`. Lo que se graba es una pieza; lo que cambia es el nombre.
 */
export const DICE_UN_AFIS: Readonly<Record<string, string>> = {
  "torre.afisFree": "free",
  "torre.afisFreeTakeoff": "free",
  "torre.afisOccupied": "occupied",
  "torre.afisNoTraffic": "no reported traffic",
  "torre.afisInUseLanding": "landing traffic",
  "torre.afisInUseDeparting": "departing traffic",
};

/**
 * **Y lo que diría un AFIS donde la frecuencia pide una orden de torre.**
 *
 * La frecuencia —los demás aviones, quién tiene la pista, a quién se le
 * quita— sigue pensando en órdenes de torre, porque es lo que hace que la
 * pista sea de uno por vez; en un AFIS esa misma cuenta la hacen los pilotos
 * con lo que oyen. Lo que cambia es **lo que se dice**, y se traduce al
 * decirlo:
 *
 * - «hold short» es «runway in use», con el tráfico si lo hay;
 * - «line up and wait», «cleared for take-off» y «cleared to land» son
 *   «runway free»;
 * - «go around, runway occupied» es «runway occupied»: se informa y el
 *   piloto se va;
 * - y lo que un AFIS no dice —la autorización de ruta de una torre, el
 *   «vacate next available»— no se dice: `null`.
 *
 * Lo que no está aquí se dice igual: la pista en uso, el tráfico, el MAYDAY.
 */
export const EN_UN_AFIS: Readonly<Record<string, string | null>> = {
  "torre.holdShort": "torre.pistaEnUso",
  "torre.holdShortLanding": "torre.afisInUseLanding",
  "torre.holdShortDeparting": "torre.afisInUseDeparting",
  /*
   * **Y «line up and wait» no se dice: un AFIS no hace esperar a nadie en el
   * eje.** Se traducía por «runway free», y el despegue de ese mismo avión
   * se callaba —ya le habían dicho que estaba libre—, así que en la
   * frecuencia quedaba oído un «runway free» a otro que nadie anulaba nunca:
   * en La Gomera sonaba después tu «pista libre», y para quien escuchaba la
   * pista estaba libre para dos. Ahora el que entra al eje lo hace callado,
   * y su «runway free» suena al salir, que es cuando se le da y se le quita
   * en el mismo instante. Ver `enUnAfis`.
   */
  "torre.lineUpWait": null,
  "torre.clearedLand": "torre.afisFree",
  "torre.clearedTakeoff": "torre.afisFreeTakeoff",
  "torre.goAround": "torre.afisOccupied",
  "torre.goAroundEnUso": "torre.pistaEnUso",
  "torre.vacateNext": null,
  "torre.clearedTo": null,
};

/**
 * Lo que dice un AFIS en vez de esta orden de torre, o `null` si no dice
 * nada.
 *
 * Aquí se miraba también lo último que se le había dicho a ese avión: a quien
 * ya había oído «runway free» al entrar al eje, su despegue se callaba. Era
 * justo lo que dejaba ese «runway free» sin anular; desde que entrar al eje no
 * se dice —ver `EN_UN_AFIS`—, cada orden se traduce sola.
 */
export function enUnAfis(base: string): string | null {
  return base in EN_UN_AFIS ? EN_UN_AFIS[base]! : base;
}

/**
 * Cómo se coloca la pista en lo que dice un AFIS: detrás de «runway» y antes
 * de lo que se dice —«runway zero two free»—, o detrás de «runway in use» y
 * con lo que se dice al final —«runway in use zero two, no reported
 * traffic»—. Ver `deTorre` en `game.ts`.
 */
export const PISTA_EN_MEDIO: ReadonlySet<string> = new Set([
  "torre.afisFree",
  "torre.afisFreeTakeoff",
  "torre.afisOccupied",
]);
export const PISTA_EN_USO_DELANTE: ReadonlySet<string> = new Set([
  "torre.afisNoTraffic",
  "torre.afisInUseLanding",
  "torre.afisInUseDeparting",
]);

/**
 * Las que llevan el número de pista **detrás** de la orden, y no delante.
 *
 * «Runway zero three, cleared to land» nombra la pista para dar un permiso;
 * «runway in use zero three» la nombra para informar, y en la radio eso se
 * dice al revés. Solo cambia el texto de respaldo: el orden de verdad lo
 * lleva cada receta. Ver `deTorre` en `game.ts`.
 */
export const PISTA_DETRAS: ReadonlySet<string> = new Set([
  "torre.pistaEnUso",
  "torre.goAroundEnUso",
]);

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
  ...PISTA_DETRAS,
  /*
   * Y las de un AFIS, que nombran la pista para informar. **Sin lado**: los
   * AFIS de este juego tienen una sola pista, y una frase con lado que no
   * tiene receta no se monta. Si algún día hay un AFIS con paralelas, van sus
   * `.L` y `.R` como las de arriba.
   */
  ...PISTA_EN_MEDIO,
  ...PISTA_EN_USO_DELANTE,
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
export const DICE_LA_TORRE: Readonly<Record<string, string>> = {
  ...Object.fromEntries(
    Object.entries(CLAVE_DE_TORRE).map(([dice, clave]) => [clave, dice]),
  ),
  ...DICE_UN_AFIS,
};

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

/*
 * Y lo que dice un AFIS en su lugar, en castellano —`afisLibre`,
 * `afisSinTrafico`…— y en fraseología —`afisFree`, `afisNoTraffic`…—: es lo
 * mismo que la lámpara, dicho como lo dice quien informa. Ver `DICE_UN_AFIS`.
 */
const DE_LA_LAMPARA =
  /^(?:torre|palabra)\.(?:[a-z]+\.)?(?:roja|verde|aterrizar|alAire|holdShort(?:Landing|Departing)?|lineUpWait|clearedTakeoff|clearedLand|goAround(?:EnUso)?|afis(?:Libre(?:EnFinal)?|Ocupada|SinTrafico|Trafico(?:Aterriza|Despega)|Free(?:Takeoff)?|Occupied|NoTraffic|InUse(?:Landing|Departing)))(?:\.[LCR])?(?:@|$)/;

/**
 * Si esta frase es **la torre dándole la pista a otro avión para que se quede
 * en ella**, todavía en la cola: «line up and wait» o «cleared to land» a una
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
 *
 * **Y «cleared for take-off» no está, aunque también dé la pista.** La da y
 * la suelta en el mismo instante —ver `LA_SUELTAN` en `flight/radio.ts`—: el
 * que la recibe ya está corriendo por ella mientras la frase espera turno,
 * porque el avión dibujado se mueve al pedirla y no al oírla. Retirarla no le
 * devuelve la pista a nadie; lo único que hace es que no se oiga. Y estaba
 * aquí, así que al entrar en final se retiraba el despegue de quien llevaba un
 * rato alineado: se había oído su «line up and wait», no se oía nunca su
 * «cleared for take-off», y detrás sonaba tu «cleared to land» con él todavía
 * en el eje para quien escuchaba. Salía en el banco del vuelo entero en las
 * tiradas con frustrada, y en trescientos vuelos sin navegador con la boca de
 * verdad las dos veces que pasó fueron esta. Lo que suelta la pista la boca
 * ya no lo tira nunca, ni por viejo ni por falta de sitio —ver
 * `sueltaLaPista`—; esto era la única puerta que le quedaba abierta.
 */
export function daLaPistaAOtro(
  clave: string | undefined,
  urgencia: string,
): boolean {
  return !!clave && urgencia === "baja" && DA_LA_PISTA.test(clave);
}

/**
 * Si esta frase es **tu permiso para aterrizar**: el «cleared to land» o la
 * verde en vuelo. Lo tuyo va en `mando`; lo de los demás, en `baja`.
 *
 * Es lo que se retira al dejar la final. Ver `paso` en
 * `flight/turno-de-pista.ts`.
 */
export function esTuPermisoDeAterrizar(
  clave: string | undefined,
  urgencia: string,
): boolean {
  return !!clave && urgencia !== "baja" && PERMISO_DE_ATERRIZAR.test(clave);
}

/*
 * En un AFIS no hay permiso, pero lo que ocupa su sitio se retira igual: el
 * «pista libre» dicho en final no vale para una final que ya no existe.
 */
const PERMISO_DE_ATERRIZAR =
  /^(?:torre|palabra)\.(?:[a-z]+\.)?(?:clearedLand|aterrizar|afisLibreEnFinal|afisFree)(?:\.[LCR])?(?:@|$)/;

const DA_LA_PISTA =
  /^torre\.(?:[a-z]+\.)?(?:lineUpWait|clearedLand|afisFree)(?:\.[LCR])?(?:@|$)/;

/**
 * **Lo que no se pierde esperando turno en la boca**: lo que la torre te da
 * o te manda a ti —la lámpara, sus permisos y su fraseología, la ruta— y lo
 * que le quita la pista a otro para dártela. Ni caduca, ni se cae de la cola,
 * ni lo barre un aviso urgente. Ver `cuantoAguanta` en `audio/boca.ts`.
 *
 * La frecuencia es de uno en uno, y lo que es para ti y es una autorización
 * no se pierde: si no se pudo decir, se dice en cuanto se pueda. Caducaba a
 * los doce segundos como cualquier orden, y con la boca llena se oía la luz
 * verde en la pantalla y ningún «cleared to land» —medido en Lanzarote con el
 * JAZ 20—. Y lo de quitarle la pista a otro, igual: caducado, su «cleared to
 * land» se quedaba oído y sin anular, y el tuyo sonaba detrás.
 *
 * Se reconoce por el peso: lo de los demás va en `baja` y esto nunca. Lo que
 * deja de ser verdad lo retira quien lo sabe —la luz que cambia, la final que
 * se deja—, no un reloj. Ver `alCambiarLaLuz` y `paso` en
 * `flight/turno-de-pista.ts`.
 */
export function noSePierde(
  clave: string | undefined,
  urgencia: string,
): boolean {
  if (!clave || urgencia === "baja") return false;
  return DE_LA_LAMPARA.test(clave) || LA_RUTA.test(clave);
}

/** La autorización de la ruta, antes de rodar. Ver `autorizarLaRuta` en `game.ts`. */
const LA_RUTA = /^torre\.(?:[a-z]+\.)?(?:destino|clearedTo)(?:@|$)/;

/**
 * **El aviso de aves en la final**: la torre informando de una bandada por
 * delante. Ver `flight/aviso-de-aves.ts`.
 *
 * Tampoco caduca con el reloj. Se da al entrar en final, que es justo cuando
 * la torre da la pista y la instructora cuenta la fase, y con los doce
 * segundos de una orden se caía esperando detrás de ellas: camino de Tenerife
 * Norte con el JAZ 90, «torre.canario.aves: caducó esperando», y la tira de la
 * radio lo escribía sin que nadie lo dijera. Lo que dice sigue siendo verdad
 * mientras las aves estén por delante, así que espera; y lo retira quien sabe
 * que ya no vale —se dejó la final, se tocó tierra o ya se pasó la bandada—.
 * Ver `vigilarLasAves` en `game.ts`.
 */
export function esElAvisoDeAves(clave: string | undefined): boolean {
  return !!clave && AVISO_DE_AVES.test(clave);
}

const AVISO_DE_AVES = /^torre\.(?:[a-z]+\.)?aves(?:@|$)/;

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

import { MARGENES } from "./minimos";
import { DE_TRANSPORTE } from "./velocidades-en-tierra";
import { RECOGIDA } from "./avisos-de-actitud";

/**
 * La velocidad de la aproximación: rápido, bien o lento.
 *
 * Es el número que más veces estropea un aterrizaje y el que menos se dice.
 * Rápido, el avión no quiere posarse y se come la pista; lento, se cae los
 * últimos metros. Y hasta hoy el juego no lo mencionaba en ninguna parte: se
 * aprendía por prueba y error, sin que nadie dijera por qué salió mal.
 *
 * ## Solo en la aproximación
 *
 * Fuera de ella la velocidad no tiene un valor «bueno» —en crucero se va a lo
 * que se va, y en la carrera de despegue se va subiendo— así que pintarla de
 * colores sería mentir. Esto solo habla cuando está bajando hacia el suelo, y
 * entonces sí hay una respuesta correcta.
 *
 * ## La banda, y por qué es asimétrica
 *
 * De Vref menos un pelo a Vref más un poco: **por debajo se avisa antes**. Ir
 * lento en final es lo que mata y hay que decirlo enseguida; ir rápido es
 * incómodo, se come pista y rara vez es grave. Las bandas de un avión de
 * verdad tienen la misma forma y por el mismo motivo.
 */

/** A partir de esta altura sobre el suelo ya no es una aproximación, m. */
const TECHO = 400;

/*
 * **Y por debajo de la recogida no hay banda.** Estaba en cuatro metros, y
 * entre cuatro y quince la banda seguía juzgando una velocidad que en la
 * recogida se pierde a propósito: con el mínimo de velocidad bajando se oía
 * «venís lento: metéle gas», se metía gas y la siguiente frase era de ir
 * rápido. «Si estoy tomando tierra, ¿qué se supone que tengo que hacer?» Ahí
 * abajo lo único que se dice es «quitá el gas»: ver `acompanarLaRecogida` en
 * `game.ts`. Y la altura es la de las ruedas, que es la que mide el
 * radioaltímetro: con la del centro del avión, al de seis metros de tren le
 * quedaba la mitad de la recogida por juzgar.
 */

/** Bajando de verdad, m/s. Volar bajo y nivelado no es aproximar. */
const DESCENSO = -0.6;

/**
 * Cuánto se puede ir por debajo de Vref antes de avisar.
 *
 * Poco, y a propósito: ir lento es lo que pone un avión en pérdida a cien
 * metros del suelo. En esta dirección el aviso llega pronto.
 */
const MARGEN_LENTO = 0.04;

/**
 * Y cuánto por encima antes de decir nada.
 *
 * **Sale del listón con el que el juego juzga**, no de un número aparte. Era
 * doce por ciento mientras `MARGENES.rapido` —lo que de verdad hace que una
 * aproximación no valga— está en el treinta y cinco: o sea que la voz regañaba
 * durante veintitrés puntos de velocidad que el propio juego daba por buenos.
 * Y no es un detalle de tono: un aviso que salta donde no pasa nada se aprende
 * a no oír, y entonces tampoco se oye el día que sí pasa.
 *
 * Se avisa **diez puntos antes** del listón, que es sitio de sobra para
 * corregir bajando por la senda. Ir rápido es incómodo y se come pista; no es
 * lo que mata. Ver `MARGENES` en `minimos.ts`.
 */
const MARGEN_RAPIDO = MARGENES.rapido - 1 - 0.1;

/*
 * ## Y los dos umbrales tienen dos caras
 *
 * Con un solo umbral por lado, una aguja que ronda el borde entra y sale de la
 * banda a cada momento, y cada salida es un aviso nuevo. Así que se entra por
 * un sitio y se sale por otro, más adentro: lo que un avión de verdad llama
 * volar Vref más un margen, con una tolerancia que no tiembla.
 */

/** Se deja de ir lento al volver a un uno por ciento de Vref. */
const SALE_DE_LENTO = 0.01;

/** Y de ir rápido, cinco puntos por debajo de donde se entró. */
const SALE_DE_RAPIDO = MARGEN_RAPIDO - 0.05;

/**
 * **Lo que ya se está corrigiendo no se avisa**, m/s².
 *
 * Tres décimas de metro por segundo cada segundo —algo más de medio nudo por
 * segundo— es una aguja que se mueve de verdad, no un bache. Si va lento y
 * ya acelera, alguien ya metió gas: decírselo es regañar por lo que acaba de
 * hacer bien. Ver `yaLoEstaCorrigiendo`.
 */
export const CORRIGIENDO = 0.3;

/**
 * Si la velocidad ya va hacia dentro de la banda, y con ganas.
 *
 * Es la tendencia que faltaba: el aviso miraba dónde estaba la aguja y no
 * hacia dónde iba, y con el gas recién metido el avión todavía va lento un
 * par de segundos. `tendencia` en m/s², positiva acelerando.
 */
export function yaLoEstaCorrigiendo(
  banda: BandaDeVelocidad,
  tendencia: number,
): boolean {
  if (banda === "lento") return tendencia > CORRIGIENDO;
  if (banda === "rapido") return tendencia < -CORRIGIENDO;
  return false;
}

export type BandaDeVelocidad = "lento" | "bien" | "rapido" | null;

export interface Aproximando {
  readonly sobreElSuelo: number;
  readonly enElSuelo: boolean;
  readonly vertical: number;
  readonly velocidad: number;
}

/**
 * En qué banda va la velocidad, o `null` si esto no es una aproximación.
 *
 * `vref` es la velocidad de aproximación de **esa** aeronave: sale de su ficha
 * y no de una constante, porque una avioneta y un avión grande no se parecen
 * en nada aquí.
 */
export function bandaDeVelocidad(
  s: Aproximando,
  vref: number,
  /** La banda de antes, para salir por el otro umbral. Ver `SALE_DE_LENTO`. */
  antes: BandaDeVelocidad = null,
): BandaDeVelocidad {
  if (s.enElSuelo) return null;
  if (s.sobreElSuelo > TECHO || s.sobreElSuelo < RECOGIDA) return null;
  if (s.vertical > DESCENSO) return null;
  const lento = antes === "lento" ? SALE_DE_LENTO : MARGEN_LENTO;
  if (s.velocidad < vref * (1 - lento)) return "lento";
  const rapido = antes === "rapido" ? SALE_DE_RAPIDO : MARGEN_RAPIDO;
  if (s.velocidad > vref * (1 + rapido)) return "rapido";
  return "bien";
}

/*
 * ## Y la del circuito
 *
 * Entre despegar y volver a bajar hay una vuelta entera, y ahí sí hay una
 * velocidad correcta: la de circuito del avión, que es la de ir despacio y
 * configurado alrededor de la pista. Ver `velocidadDeCircuito` en
 * `aircraft.ts`. Nadie la pedía, y lo que se ve cuando nadie la pide es un
 * reactor haciendo el viento en cola a doscientos treinta nudos, con tres
 * kilómetros de radio de viraje, y metiéndose en el monte al girar.
 *
 * **Y la dice la instructora, no el avión.** Ningún avión lleva un aviso para
 * «vas rápido para el circuito»; lo que lleva es el tope de sus flaps y de su
 * tren, y de eso ya se ocupa `atenderALaSobrevelocidad`. Esta banda solo
 * existe donde el circuito va dibujado —ver `Tier.circuito`—, que son los
 * peldaños en los que el canto de cabina todavía no suena y quien habla es
 * ella. Ver `Game.cantar`.
 */

/**
 * Cuánto se puede pasar de la de circuito antes de avisar.
 *
 * **Lo que se recupera virando un poco más cerrado.** El pasillo del circuito
 * contra el terreno se mide con el radio de viraje a la de circuito y a
 * veinticinco grados —ver `pasilloDelCircuito`—, y treinta grados es lo más
 * que se inclina un avión en un circuito sin que deje de ser un viraje
 * normal. El radio va con el cuadrado de la velocidad y con la inversa de la
 * tangente del alabeo, así que lo que cabe en el mismo radio virando a
 * treinta es `√(tan 30° / tan 25°)`: un once por ciento más. Por encima de
 * eso, el avión ya no cabe en el pasillo que el juego le ha mirado.
 */
export const MARGEN_DE_CIRCUITO =
  Math.sqrt(Math.tan((30 * Math.PI) / 180) / Math.tan((25 * Math.PI) / 180)) -
  1;

/**
 * En qué banda va la velocidad **volando el circuito**, o `null` si no hay
 * nada que juzgar.
 *
 * Solo el lado rápido. Por abajo manda lo de siempre: la banda de
 * aproximación en cuanto se baja hacia la pista, y el avisador de pérdida en
 * cualquier sitio. Ir a Vref en el viento en cola no es ir mal; ir por debajo
 * sí, y por eso ahí esta banda se calla y no pinta nada de verde.
 */
export function bandaDeCircuito(
  s: Aproximando,
  vref: number,
  circuito: number,
): BandaDeVelocidad {
  if (s.enElSuelo) return null;
  if (s.velocidad > circuito * (1 + MARGEN_DE_CIRCUITO)) return "rapido";
  return s.velocidad >= vref ? "bien" : null;
}

/*
 * ## Y la de rodaje
 *
 * El mismo problema en el otro extremo del vuelo: los mandos están —gas y
 * freno— pero nadie dice a qué velocidad se rueda, así que se rueda a la que
 * sea. «No tengo control de velocidad en tierra.»
 *
 * Rodar deprisa es de las cosas que peor salen y que menos se avisan: no hay
 * nada que te frene, la calle parece ancha, y la curva llega cuando llega. En
 * un aeropuerto de verdad se rueda a paso de bicicleta y se sale de la curva
 * más despacio todavía.
 *
 * **Y no es una constante, como se creyó.** Aquí ponía que la velocidad de
 * rodaje «no es del avión: es de la calle», y que una avioneta y un reactor
 * ruedan igual. No ruedan igual: un avión de línea va a veinte nudos en recta
 * y hasta treinta en las rectas largas —lo dice su manual—, y una avioneta,
 * menos. Con nueve metros por segundo para todos, esta banda decía «más
 * despacio» a los veintitrés nudos a quien rodaba como se rueda. Lo que se
 * pasa de lo que rueda **ese** avión en una recta larga es ir rápido en
 * cualquier calle; lo de cada curva lo dice la raya. Ver
 * `flight/velocidades-en-tierra.ts`.
 */

/**
 * Lo que se rueda si no se dice el avión, m/s: lo más de un avión de línea,
 * treinta nudos.
 */
const RODAJE = DE_TRANSPORTE.rectaLarga;

/** Por debajo de esto no se está rodando, se está saliendo o llegando. */
const APENAS_SE_MUEVE = 2;

/**
 * Y por encima de esto tampoco se está rodando: se está aterrizando.
 *
 * **Veintidós metros y medio por segundo**, cuarenta y cuatro nudos: por
 * encima de cualquier margen que esta banda vaya a avisar, y por debajo de lo
 * que se posa el avión más lento de la flota —el fumigador toca a cincuenta y
 * cuatro—. Entre las dos cosas no hay nada que confundir. Eran dos veces y
 * media la de rodaje de entonces, y se queda en su número: lo que separa
 * rodar de aterrizar no se mueve con lo que rueda cada avión.
 *
 * Hace falta porque callar la banda «en la pista» no basta, y está medido:
 * tocando un metro fuera del asfalto, el juego soltaba «más despacio»
 * **aterrizando a ciento treinta y dos nudos**. La pregunta de quien lo sufría
 * era la correcta: «vas muy bajo, vas muy rápido, deja el aterrizaje ¿se puede
 * saber sobre qué tortuga tengo que volar?».
 *
 * El sitio es un dato que se puede equivocar —el borde de una pista es un
 * polígono, y las ruedas caen donde caen—; la velocidad no. Un avión a ciento
 * treinta nudos no está rodando por ninguna calle del mundo.
 */
const YA_NO_ES_RODAJE = 22.5;

/**
 * Cuánto se puede pasar de la recta larga antes de avisar: un quince por
 * ciento, lo mismo que deja el tope de Guyrami. Era un tercio largo sobre los
 * nueve de entonces, que no eran lo más que se rueda sino lo de cada día.
 */
const MARGEN_RODAJE = 0.15;

/**
 * En qué banda va la velocidad rodando, o `null` si esto no es rodar.
 *
 * No hay banda de «lento»: rodar despacio no tiene nada de malo, y a los
 * cuatro años ir despacio es exactamente lo que hay que poder hacer sin que
 * nadie te riña. Solo se avisa de ir pasado.
 */
export function bandaDeRodaje(
  velocidad: number,
  enElSuelo: boolean,
  corriendo: boolean,
  /** Lo más que rueda este avión, m/s: su recta larga. */
  rodaje: number = RODAJE,
): BandaDeVelocidad {
  /*
   * **Lo que calla la banda es la maniobra, no el sitio.**
   *
   * El primer intento se callaba «en la pista», pensando en el despegue y en
   * la toma. Pero por la pista también se **rueda** —para ir a la cabecera,
   * para salir por una calle del otro extremo— y ahí quedaba mudo justo
   * donde más deprisa se puede ir: «a todo gas, y nadie me detiene».
   *
   * Así que lo pregunta el juego, que es quien sabe en qué fase va: correr es
   * despegar o aterrizar; todo lo demás en el suelo es rodar.
   */
  if (!enElSuelo || corriendo) return null;
  if (velocidad < APENAS_SE_MUEVE) return null;
  // Y ni aterrizando ni despegando, lo diga la fase o no. Ver `YA_NO_ES_RODAJE`.
  if (velocidad > YA_NO_ES_RODAJE) return null;
  return velocidad > rodaje * (1 + MARGEN_RODAJE) ? "rapido" : "bien";
}

/**
 * La banda que manda ahora mismo, mirando las tres a la vez.
 *
 * ## Por qué es una función y no tres llamadas encadenadas
 *
 * Porque encadenadas se rompen por la mitad. Había dos bandas —la de rodar y
 * la de aproximar— y una regla encima: **en la pista no se habla de
 * velocidad**. La regla se aplicó a la voz y no a lo que se pinta, así que el
 * avión callaba y la tortuga se ponía en rojo igual; y en los peldaños de los
 * pequeños la tortuga *es* el aviso. Dicho jugando, con el de fuselaje ancho
 * en la cabecera a ochenta y dos nudos: «¿voy muy rápido? ¡¿en serio!?».
 *
 * Con un solo sitio del que sale el veredicto no hay dos sitios que puedan
 * discrepar. La voz y el color beben del mismo vaso.
 *
 * ## Y por qué la pista calla
 *
 * Una pista es el único trozo de suelo donde la velocidad es el asunto: se
 * corre para despegar y se frena después de tocar, y las dos cosas son
 * justamente lo que hay que hacer. La banda de rodaje, que no sabe de fases,
 * ve ochenta nudos y dice lo que diría en una calle de rodaje —«más
 * despacio»— porque a ochenta nudos por una calle uno se sale en la primera
 * curva. Pero eso no era una calle: era una toma.
 */
export function bandaDeAhora(
  s: Aproximando & { readonly enLaPista: boolean },
  vref: number,
  corriendo: boolean,
  /**
   * La de circuito de este avión si se está volando el circuito, o `null`.
   * Va la última: bajando hacia la pista manda la de aproximación, que es
   * más estrecha y es la que decide la toma. Ver `bandaDeCircuito`.
   */
  circuito: number | null = null,
  /** La banda del fotograma anterior. Ver `bandaDeVelocidad`. */
  antes: BandaDeVelocidad = null,
  /** Lo más que rueda este avión, m/s. Ver `bandaDeRodaje`. */
  rodaje: number = RODAJE,
): BandaDeVelocidad {
  if (s.enElSuelo && s.enLaPista) return null;
  return (
    bandaDeRodaje(s.velocidad, s.enElSuelo, corriendo, rodaje) ??
    bandaDeVelocidad(s, vref, antes) ??
    (circuito === null ? null : bandaDeCircuito(s, vref, circuito))
  );
}

/**
 * Qué hay que decir en cada banda, volando o en el suelo.
 *
 * ## Por qué es una función y no un ternario en el sitio
 *
 * Porque en el sitio era un ternario, y el ternario no miraba la banda:
 *
 * ```ts
 * const suave = enElSuelo ? "vuelo.despacio" : "vuelo.rapido";
 * ```
 *
 * Entraba con las dos bandas —`lento` y `rapido`— y solo preguntaba dónde
 * estaban las ruedas. Así que a quien venía **despacio** el juego le decía
 * «vas muy rápido», y quien obedecía bajaba el gas: que es exactamente cómo se
 * entra en pérdida a cien metros del suelo. Dicho jugando con el de fuselaje
 * ancho a ciento dieciséis nudos sobre una Vref de ciento cuarenta y seis:
 * «¿es serio, esto es ir muy rápido?», y después: «me hace ir tan lento que me
 * caigo al agua».
 *
 * Con la decisión aquí, la prueba puede recorrer las cuatro combinaciones y
 * ninguna puede volver a salir cambiada. Un aviso que dice lo contrario de lo
 * que pasa no es un aviso mal redactado: es el consejo que mata.
 *
 * En el suelo no hay «lento» —la banda de rodaje no lo tiene, porque rodar
 * despacio no tiene nada de malo— y por eso ahí solo cabe pedir calma.
 */
export function queSeDice(
  banda: BandaDeVelocidad,
  enElSuelo: boolean,
): "vuelo.rapido" | "vuelo.despacio" | "vuelo.lentoYBajo" | null {
  if (banda !== "lento" && banda !== "rapido") return null;
  /*
   * **Y en el suelo, «lento» se calla.**
   *
   * No llega nunca —la banda de rodaje no devuelve «lento», porque rodar
   * despacio no tiene nada de malo— pero la primera versión de esto contestaba
   * «más despacio» a cualquier cosa que llegara en tierra, y eso es el mismo
   * fallo que esta función existe para impedir, escrito otra vez. Lo cazó su
   * propia prueba: ninguna banda puede compartir frase con su contraria.
   */
  if (enElSuelo) return banda === "rapido" ? "vuelo.despacio" : null;
  return banda === "lento" ? "vuelo.lentoYBajo" : "vuelo.rapido";
}

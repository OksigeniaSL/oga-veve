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

/** Y por debajo de esta ya estás posando: la velocidad la manda la recogida. */
const SUELO = 4;

/** Bajando de verdad, m/s. Volar bajo y nivelado no es aproximar. */
const DESCENSO = -0.6;

/** Cuánto se puede ir por debajo de Vref antes de avisar. */
const MARGEN_LENTO = 0.04;

/** Y cuánto por encima. Más ancho a propósito. Ver la cabecera. */
const MARGEN_RAPIDO = 0.12;

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
): BandaDeVelocidad {
  if (s.enElSuelo) return null;
  if (s.sobreElSuelo > TECHO || s.sobreElSuelo < SUELO) return null;
  if (s.vertical > DESCENSO) return null;
  if (s.velocidad < vref * (1 - MARGEN_LENTO)) return "lento";
  if (s.velocidad > vref * (1 + MARGEN_RAPIDO)) return "rapido";
  return "bien";
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
 * **Y aquí sí es una constante, a diferencia de la de aproximación.** La
 * velocidad de rodaje no es del avión: es de la calle. Una avioneta y un
 * reactor ruedan a la misma velocidad porque el ancho de la calle, el radio de
 * la curva y el tiempo de reacción de quien va a los mandos son los mismos.
 * Lo que cambia entre ellos es lo que cuesta parar, y de eso ya avisa el
 * freno.
 */

/** A lo que se rueda, m/s. Nueve metros por segundo son treinta y dos por hora. */
const RODAJE = 9;

/** Por debajo de esto no se está rodando, se está saliendo o llegando. */
const APENAS_SE_MUEVE = 2;

/** Cuánto se puede pasar de la de rodaje antes de avisar. */
const MARGEN_RODAJE = 0.35;

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
  return velocidad > RODAJE * (1 + MARGEN_RODAJE) ? "rapido" : "bien";
}

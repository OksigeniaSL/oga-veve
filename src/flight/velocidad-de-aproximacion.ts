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

/**
 * **A qué velocidad se rueda**, por clase de avión: en recta, en las rectas
 * largas, en los virajes y saliendo de la pista.
 *
 * ## Lo que había
 *
 * Cinco números sueltos en cuatro sitios, y ninguno de ellos era de ningún
 * avión: trece metros por segundo de «crucero» en el plan, nueve de «rodaje»
 * en el tope de Guyrami, nueve con un tercio en el aviso de «más despacio»,
 * doce y dieciséis para decir «frená» en la pista, y ocho para tomar
 * cualquier salida, fuera rápida o en ángulo recto. Los seis aviones rodaban
 * igual, y la pista se dejaba a paso de calle aunque la salida estuviera
 * hecha para cincuenta nudos. Contado en Tenerife Sur con el JAZ 120: «frená,
 * pretende que me mueva por la pista a cuatro nudos pero que salga ya porque
 * viene otro; los aviones en pista van rapidito, que lo he vivido».
 *
 * ## Lo que es de verdad
 *
 * - **Rodando**, el manual de entrenamiento de Boeing (737 FCTM, «Taxi Speed
 *   and Braking»): «normal taxi speed is approximately 20 knots […] on long
 *   straight taxi routes, speeds up to 30 knots are acceptable», y antes de
 *   cualquier viraje de más de treinta grados, «10 knots or less». Es lo que
 *   hace un avión de transporte, de turbina; un turbohélice de línea rueda
 *   con las mismas reglas.
 * - **Saliendo de la pista**, se frena hasta la velocidad de la salida que se
 *   va a tomar, no hasta parar. Una salida rápida está hecha para dejar la
 *   pista deprisa: el Anexo 14 de la OACI (3.8.15) pide que su curva permita
 *   salir a 93 km/h —cincuenta nudos— con la pista mojada donde operan los
 *   aviones de clave 3 o 4, y a 65 —treinta y cinco— donde operan los de
 *   clave 1 o 2. Una salida en ángulo recto es un viraje como cualquier otro:
 *   diez nudos.
 * - **Una avioneta rueda más despacio.** El manual de vuelo de la FAA
 *   (Airplane Flying Handbook, cap. 2, «Taxiing») no da una cifra: pide la
 *   velocidad a la que el avión se mueve con el gas y se para enseguida al
 *   quitarlo, y frenar antes de cada viraje. En un entrenador de su clase eso
 *   son unos quince nudos en recta y la mitad en las curvas; y su salida
 *   rápida, la de clave 1.
 *
 * Unidades del modelo: metros por segundo. Los nudos se quedan en los
 * comentarios y en la pantalla.
 */

/** Un nudo, en metros por segundo. */
const NUDO = 0.514444;

export interface VelocidadesEnTierra {
  /** Rodando en recta, m/s. */
  readonly recta: number;
  /** Y en una recta larga, m/s: lo más que se rueda. Ver `RECTA_LARGA`. */
  readonly rectaLarga: number;
  /** En un viraje, y al tomar una salida en ángulo, m/s. */
  readonly viraje: number;
  /** Al tomar una salida rápida, m/s. */
  readonly salidaRapida: number;
}

/**
 * **Un avión de transporte**, de turbina: lo del manual de Boeing, y la
 * salida rápida de la clave 3 o 4.
 */
export const DE_TRANSPORTE: VelocidadesEnTierra = {
  recta: 20 * NUDO,
  rectaLarga: 30 * NUDO,
  viraje: 10 * NUDO,
  salidaRapida: 50 * NUDO,
};

/**
 * **Una avioneta**, de pistón: quince en recta, veinte en las rectas largas,
 * ocho en las curvas y la salida rápida de la clave 1 o 2.
 */
export const LIGERO: VelocidadesEnTierra = {
  recta: 15 * NUDO,
  rectaLarga: 20 * NUDO,
  viraje: 8 * NUDO,
  salidaRapida: 35 * NUDO,
};

/**
 * **Y el turbohélice de cercanías**, que rueda como uno de línea —es una
 * operación de línea, con su tripulación y sus reglas— pero opera donde
 * operan los de clave 2: su salida rápida es la de los pequeños.
 */
export const DE_CERCANIAS: VelocidadesEnTierra = {
  ...DE_TRANSPORTE,
  salidaRapida: LIGERO.salidaRapida,
};

/**
 * Lo que mide una recta para ser larga, m.
 *
 * El manual no lo dice; lo deja a quien rueda. Aquí son quinientos metros:
 * medio minuto largo a treinta nudos, lo que hace que merezca la pena
 * acelerar y volver a frenar antes de la curva. En una plataforma con codos
 * cada cien metros no se pasa nunca de los veinte.
 */
export const RECTA_LARGA = 500;

/**
 * Lo más que se aparta una salida del eje de la pista para ser rápida,
 * grados.
 *
 * Las rápidas salen a treinta grados —el Anexo 14 da de veinticinco a
 * cuarenta y cinco—; más allá es una salida en ángulo, y se toma girando.
 */
export const GIRO_DE_UNA_SALIDA_RAPIDA = 45;

/** Lo mínimo de un avión que hace falta para saber cómo rueda. */
export interface ClaseEnTierra {
  readonly sound: { readonly engine: string };
}

/**
 * Las velocidades en tierra de este avión.
 *
 * Lo decide el motor, que es lo que decide la familia de cabina y el oficio:
 * de pistón, avioneta; turbohélice, cercanías; reactor, transporte.
 */
export function velocidadesEnTierra(a: ClaseEnTierra): VelocidadesEnTierra {
  switch (a.sound.engine) {
    case "turbofan":
      return DE_TRANSPORTE;
    case "turboprop":
      return DE_CERCANIAS;
    default:
      return LIGERO;
  }
}

/**
 * **A qué velocidad se toma una salida** que se aparta `giro` grados del eje
 * de la pista, m/s: la rápida, a la suya; la que sale en ángulo, a la de
 * viraje.
 */
export function velocidadDeLaSalida(
  t: VelocidadesEnTierra,
  giro: number,
): number {
  return Math.abs(giro) <= GIRO_DE_UNA_SALIDA_RAPIDA ? t.salidaRapida : t.viraje;
}

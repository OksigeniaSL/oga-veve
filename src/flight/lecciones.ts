/**
 * Las lecciones: a qué se juega hoy.
 *
 * Nació de mirar el juego con ojos limpios: «las señales de aterrizaje (aros,
 * etc.) en principio no se sabe para qué está eso ahí, habría que presentarlo
 * como misión elegible».
 *
 * Y es que **hasta ahora el juego siempre estaba dando una clase y nunca la
 * había ofrecido**. Arrancabas y ya había una raya verde, una diana, una doble
 * raya y una lámpara de torre. Si lo que querías era dar una vuelta, todo eso
 * eran cosas raras en el suelo.
 *
 * La guía no está de más. Lo que estaba de más es que fuera obligatoria y muda.
 *
 * ## Por qué esto no son las «misiones» que ya había
 *
 * Las de `src/content/missions.ts` son **viajes**: puntos de paso, ir a un
 * sitio y volver. Esto es otra cosa: qué se está enseñando. Son dos ejes y
 * hasta ahora estaban enredados en uno solo con la escalera de tramos — el
 * peldaño de abajo traía ayudas de vuelo *y* guía de rodaje, y no había forma
 * de querer una sin la otra.
 *
 * Separarlos es lo que permite «Taguato Ruvicha, pero enseñame a aterrizar»,
 * que es exactamente lo que pide un adulto que sabe volar y no se sabe este
 * aeropuerto.
 */

export type LeccionId = 'vuelta' | 'rodaje' | 'despegue' | 'aterrizaje';

export interface Leccion {
  readonly id: LeccionId;
  /**
   * Dónde empieza el avión.
   *
   * - `puesto`: en su plaza de estacionamiento, con el motor parado. Es donde
   *   empieza un vuelo de verdad y donde empiezan las lecciones de aeropuerto.
   * - `pista`: alineado en la cabecera y con el motor en marcha. Tres segundos
   *   y estás volando.
   * - `aire`: ya volando, en viento en cola, que es de donde se empieza a
   *   aterrizar. Empezar en el puesto para practicar aterrizajes significaría
   *   rodar dos kilómetros antes de cada intento.
   */
  readonly arranque: 'puesto' | 'pista' | 'aire';
  /** La raya verde, las letras y las señales del rodaje. */
  readonly guiaEnTierra: boolean;
  /** La lámpara de la torre y el permiso de entrar en pista. */
  readonly torre: boolean;
  /**
   * Si la torre **nunca** da verde.
   *
   * Es lo que convierte «rodar» en una lección con final: del puesto a la doble
   * raya, parar encima, y ya está. Sin esto, aprender a rodar no se acaba nunca
   * — o se acaba despegando, que es otra cosa.
   */
  readonly acabaEnLaEspera: boolean;
}

/** Dar una vuelta. Sin nada. */
export const VUELTA: Leccion = {
  id: 'vuelta',
  arranque: 'pista',
  guiaEnTierra: false,
  torre: false,
  acabaEnLaEspera: false,
};

/** Aprender a rodar: del puesto a la doble raya, y parar. */
export const RODAJE: Leccion = {
  id: 'rodaje',
  arranque: 'puesto',
  guiaEnTierra: true,
  torre: true,
  acabaEnLaEspera: true,
};

/** Aprender a despegar: lo anterior, más el permiso y la carrera. */
export const DESPEGUE: Leccion = {
  id: 'despegue',
  arranque: 'puesto',
  guiaEnTierra: true,
  torre: true,
  acabaEnLaEspera: false,
};

/** Aprender a aterrizar: se empieza en el aire, que es donde empieza esto. */
export const ATERRIZAJE: Leccion = {
  id: 'aterrizaje',
  arranque: 'aire',
  guiaEnTierra: true,
  torre: false,
  acabaEnLaEspera: false,
};

export const LECCIONES: readonly Leccion[] = [VUELTA, RODAJE, DESPEGUE, ATERRIZAJE];

/** La de siempre, para quien llega sin elegir. */
export const LECCION_POR_DEFECTO = DESPEGUE;

export function leccionPorId(id: string | null): Leccion {
  return LECCIONES.find((l) => l.id === id) ?? LECCION_POR_DEFECTO;
}

const LLAVE = 'oga-veve:leccion';

/**
 * Qué lección se eligió la última vez.
 *
 * Se recuerda por lo mismo que el tramo: quien está aprendiendo a aterrizar
 * quiere volver a intentarlo, no volver a elegirlo.
 */
export function leccionRecordada(): Leccion {
  try {
    return leccionPorId(localStorage.getItem(LLAVE));
  } catch {
    return LECCION_POR_DEFECTO;
  }
}

export function recordarLeccion(leccion: Leccion): void {
  try {
    localStorage.setItem(LLAVE, leccion.id);
  } catch {
    // No poder recordarlo no puede romper nada.
  }
}

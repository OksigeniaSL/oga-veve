/**
 * El piloto automático: mantener rumbo y altura sin las manos.
 *
 * ## Por qué, y por qué ahora
 *
 * Porque los vuelos se han hecho largos. Desde que se puede ir a otro
 * aeropuerto, el salto más corto son cincuenta y cuatro kilómetros —quince
 * minutos— y los que vienen detrás son de cuarenta. Pilotar a mano una recta de
 * cuarenta minutos no enseña nada y cansa a cualquiera, y menos a quien tiene
 * cuatro años.
 *
 * Y porque **es lo que se hace de verdad**: ningún vuelo de línea se vuela a
 * mano en crucero. El piloto automático no es una ayuda del juego ni una
 * trampa; es un instrumento de la cabina, y saber qué hace —y qué **no** hace—
 * es parte de lo que hay que aprender aquí.
 *
 * ## Lo que hace, que es poco a propósito
 *
 * Dos cosas, las dos primeras que aprende cualquiera: **mantener un rumbo** y
 * **mantener una altura**. Ni navega a un punto, ni gestiona el motor, ni
 * aterriza. Un piloto automático que lo hace todo convierte el juego en un
 * vídeo; éste te quita las dos manos de la recta y te las devuelve para lo que
 * importa, que es despegar, virar y aterrizar.
 *
 * ## Cómo manda, y por qué en dos pisos
 *
 * No mueve el avión: mueve **los mandos**, igual que una mano. Y lo hace en dos
 * pisos encadenados, que es como se hace de verdad y como se explica solo:
 *
 * - Para ir a un rumbo hay que **inclinar el ala**, así que el error de rumbo
 *   pide un ángulo de alabeo, y el error de alabeo pide alerón.
 * - Para ir a una altura hay que **subir o bajar a un ritmo**, así que el error
 *   de altura pide una velocidad vertical, y el error de velocidad vertical
 *   pide timón de profundidad.
 *
 * Los dos pisos llevan tope. Un piloto automático de verdad no pone el avión de
 * canto para corregir diez grados ni sube a tres mil pies por minuto para
 * ganar cien pies: se nota más el tope que la ganancia, y por eso el tope es lo
 * que hay que escribir con cuidado.
 *
 * ## Y se desconecta solo
 *
 * En cuanto quien vuela toca los mandos. No hay nada más desconcertante que un
 * avión que se resiste, y en un avión de verdad pasa lo mismo: se aprieta el
 * botón o se fuerza la palanca, y el automático se va con un aviso. Aquí el
 * aviso lo da quien lo use; este módulo solo dice que se ha soltado.
 */

/** Hasta cuánto alabeo pide para virar, en radianes. Veinticinco grados. */
export const ALABEO_MAXIMO = (25 * Math.PI) / 180;

/** Y a cuánto sube o baja como mucho, en metros por segundo. */
export const RITMO_MAXIMO = 7.5;

/**
 * Y cuánto morro pide como mucho, en radianes. Doce grados.
 *
 * Es el tope del piso de dentro del canal de altura, y hace el mismo trabajo
 * que `ALABEO_MAXIMO` en el de rumbo: sin él, una diferencia de altura grande
 * pide un morro imposible y el avión entra en pérdida corrigiendo.
 */
export const CABECEO_MAXIMO = (12 * Math.PI) / 180;

/**
 * Cuánto hay que mover un mando para que cuente como que lo tocaste.
 *
 * Una décima. Por debajo de eso es el centrado del teclado o el temblor de un
 * dedo apoyado, y desconectar el piloto automático por eso sería peor que no
 * tenerlo.
 */
export const TOQUE = 0.1;

/**
 * Cuánto **por segundo** se mueve la palanca por cada metro por segundo que
 * falte de velocidad.
 *
 * Cinco centésimas: diez nudos de error mueven la palanca un cuarto por
 * segundo, o sea que la recorre entera en cuatro. Es lo que tarda una mano, y
 * es lo que separa una corrección de un tirón.
 */
export const POR_NUDO = 0.05;

export interface Estado {
  /** Rumbo verdadero, en radianes. */
  readonly heading: number;
  /** Ángulo de alabeo, en radianes. Positivo a la derecha. */
  readonly alabeo: number;
  /** Ángulo de cabeceo, en radianes. Positivo con el morro arriba. */
  readonly cabeceo: number;
  /** Altitud sobre el nivel del mar, en metros. */
  readonly altitud: number;
  /** Velocidad vertical, en metros por segundo. */
  readonly vertical: number;
  /** Velocidad indicada de ahora, m/s. Para el canal de gas. */
  readonly velocidad: number;
  /** Y cuánto gas lleva puesto, de 0 a 1: se corrige sobre lo que hay. */
  readonly gas: number;
}

/** A dónde se le manda ir. `null` en uno de los dos es no mandarle nada. */
export interface Objetivos {
  /** Rumbo verdadero pedido, en radianes, o `null`. */
  readonly rumbo: number | null;
  /** Altitud pedida, en metros, o `null`. */
  readonly altitud: number | null;
  /**
   * La velocidad indicada que hay que sostener, m/s, o `null`.
   *
   * **Sin esto el canal de altura no puede funcionar, y no es una opinión:
   * es aritmética.** Un reactor de línea con el gas a tope tiene empuje de
   * sobra para subir a siete metros por segundo; mandarle mantener la altura
   * con el morro y dejarle el gas donde estaba es pedirle que se coma toda esa
   * energía picando, y eso acaba en sobrevelocidad. Luego el aviso, luego la
   * corrección, y vuelta a empezar.
   *
   * Contado jugando, y con razón: «me sube a la estratosfera y ahora me baja,
   * hice un bucle y todo», «sube mucho, baja en barrena, *too fast*, vuelve a
   * subir mucho…». Eso no era el fugoide del avión: era **este** piloto
   * automático alimentándolo, porque le faltaba la mitad.
   *
   * Un piloto automático de verdad lleva las dos manos: una en el morro y otra
   * en las palancas. La altura la sostiene el morro y la velocidad, el gas.
   */
  readonly velocidad: number | null;
}

/** Lo que el piloto automático pide a los mandos. */
export interface Mandos {
  readonly aileron: number;
  readonly elevator: number;
  /**
   * El gas que pide, de 0 a 1, o `null` si no gobierna la velocidad.
   *
   * `null` y no cero: cero **es** una orden —quitar motor— y dejar el eje en
   * manos de quien vuela es otra cosa. Es la misma distinción que ya tenían
   * los otros dos ejes con sus objetivos en nulo.
   */
  readonly throttle: number | null;
}

/**
 * La diferencia entre dos rumbos, en radianes, por el lado corto.
 *
 * Es la cuenta que se escribe mal sola: de 350° a 10° hay veinte grados a la
 * derecha y no trescientos cuarenta a la izquierda, y un piloto automático que
 * se equivoque aquí da la vuelta entera para corregir diez grados.
 */
export function porElLadoCorto(desde: number, hasta: number): number {
  let d = (hasta - desde) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

const acotar = (v: number, tope: number): number =>
  Math.max(-tope, Math.min(tope, v));

/**
 * Lo que el piloto automático pide a los mandos en este fotograma.
 *
 * Devuelve cero en el mando que no esté gobernando, para que quien llame pueda
 * dejar ese eje en manos de quien vuela: con el rumbo puesto y la altura no, el
 * avión mantiene el rumbo y sube y baja a gusto de uno.
 */
export function mandosPara(
  e: Estado,
  o: Objetivos,
  /**
   * Cuánto ha pasado desde el fotograma anterior, s.
   *
   * Solo lo usa el canal de gas, y por un motivo: los otros dos son
   * proporcionales —piden una actitud y la persiguen— y el del gas **corrige
   * sobre el gas que ya hay**, o sea que integra. Un integrador sin reloj va
   * a la velocidad del ordenador: medido a sesenta por segundo, la palanca
   * saltaba de 0,01 a 1,00 y de vuelta. Con el reloj delante se mueve como una
   * palanca de verdad.
   */
  dt = 1 / 60,
): Mandos {
  let aileron = 0;
  let elevator = 0;
  let throttle: number | null = null;

  if (o.rumbo !== null) {
    /*
     * Tres grados de error piden un grado de alabeo... o dicho al derecho: el
     * alabeo que se pide es un tercio del error, hasta el tope. Con ganancia
     * uno el avión llega al rumbo de canto y se pasa; con un tercio entra
     * suave y no oscila, que es lo que se nota desde el asiento.
     */
    const error = porElLadoCorto(e.heading, o.rumbo);
    const alabeoPedido = acotar(error / 3, ALABEO_MAXIMO);
    aileron = acotar((alabeoPedido - e.alabeo) * 2.2, 1);
  }

  if (o.altitud !== null) {
    /*
     * **Y la altura va en tres pisos, no en dos. Aquí estaba el fallo.**
     *
     * El primer intento iba directo del ritmo al timón de profundidad: cada
     * diez metros de error pedían un metro por segundo, y el error de ritmo
     * pedía palanca. Medido pilotando el motor de vuelo de verdad, el avión
     * **perdía mil metros** dando un viraje: un avión no compensado oscila en
     * cabeceo —el fugoide de toda la vida— y una ley de un solo piso no lo
     * amortigua, lo alimenta.
     *
     * Lo que sí lo amortigua es lo mismo que ya hacía funcionar el canal de
     * rumbo: pedir una **actitud** y perseguirla. El morro no persigue el
     * ritmo, lo sostiene; el ritmo sale solo.
     *
     *   diez metros de error  → un metro por segundo (tope 7,5)
     *   un metro por segundo  → menos de dos grados de morro (tope 12°)
     *   el morro que falta    → palanca
     */
    const error = o.altitud - e.altitud;
    const ritmoPedido = acotar(error / 10, RITMO_MAXIMO);
    const cabeceoPedido = acotar(
      (ritmoPedido - e.vertical) * 0.03,
      CABECEO_MAXIMO,
    );
    elevator = acotar((cabeceoPedido - e.cabeceo) * 3, 1);
  }

  if (o.velocidad !== null) {
    /*
     * **Y la otra mano, la del gas.**
     *
     * Una ley proporcional sobre el gas que ya se llevaba, no sobre cero: el
     * automático coge el avión como está y lo corrige, que es lo que hace que
     * no dé un tirón al engancharse — el mismo criterio que el resto de este
     * módulo.
     *
     * `POR_NUDO` es suave a propósito. El gas de un reactor mueve mucha
     * energía y tarda segundos en dar lo que se le pide; una ganancia viva
     * aquí es exactamente lo que convierte una corrección en un vaivén, que es
     * de lo que se venía.
     */
    const falta = o.velocidad - e.velocidad;
    throttle = Math.max(0, Math.min(1, e.gas + falta * POR_NUDO * dt));
  }

  return { aileron, elevator, throttle };
}

/**
 * Si quien vuela ha tocado los mandos lo bastante como para soltar el piloto.
 *
 * Se mira **el mando que el automático gobierna**, y no todos: con solo el
 * rumbo puesto, tirar de la palanca para subir no tiene por qué desconectar
 * nada — el avión no estaba llevando la altura.
 */
export function loSolto(
  o: Objetivos,
  mandos: { readonly aileron: number; readonly elevator: number },
): boolean {
  if (o.rumbo !== null && Math.abs(mandos.aileron) > TOQUE) return true;
  if (o.altitud !== null && Math.abs(mandos.elevator) > TOQUE) return true;
  return false;
}

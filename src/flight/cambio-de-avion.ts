/**
 * Cambiar de avión es empezar otro vuelo.
 *
 * ## Lo que pasaba
 *
 * La tecla montaba el avión nuevo donde estaba el anterior y seguía volando.
 * Pero un vuelo no es solo el avión: **a dónde se puede ir y con cuánto
 * combustible se sale se deciden al arrancar, y se deciden para ese avión**.
 * Los destinos se filtran por lo que cabe en cada pista y se cargan con su
 * relieve; el depósito se llena para la ruta y el alternativo de ese aparato.
 * Cambiar de avión por encima dejaba todo eso con el de antes.
 *
 * Contado jugando: se salió de Pettirossi con el cuatrimotor —que no cabe en
 * ninguno de los dos destinos de allí, así que no tenía ninguno— y se cambió a
 * la avioneta. La avioneta se quedó sin destinos —«no me deja elegir otro
 * aeropuerto»— y con **veinte mil ochocientos cuarenta y dos kilos** de
 * combustible, que es lo que lleva un reactor de cuatro motores y no cabe ni
 * diez veces en su ala.
 *
 * ## Lo que hace
 *
 * Lo mismo que el hangar: se guarda el avión elegido y se **vuelve a
 * arrancar**, por el mismo camino y con las mismas reglas. No hay una segunda
 * forma de montar un vuelo que pueda olvidarse de algo. Se arranca en el campo
 * donde se está —el de salida o el de llegada—, sin volver a preguntar quién
 * vuela ni dónde, que eso ya se sabe.
 *
 * ## Y solo en tierra y parado
 *
 * En el aire no se cambia de avión: no es real, y enseñarlo como si lo fuera
 * es enseñar algo que habrá que desaprender. En un aeropuerto sí se cambia, y
 * se hace como en cualquiera: parado. Rodando tampoco, que sería bajarse de un
 * avión en marcha.
 */

/**
 * Hasta qué velocidad sobre el suelo se cuenta como parado, m/s.
 *
 * Medio metro por segundo: un avión frenado en la plataforma se queda en
 * centésimas, y rodando al paso más lento ya va a tres o cuatro.
 */
export const PARADO = 0.5;

/** Si se puede cambiar de avión ahora mismo. */
export function sePuedeCambiarDeAvion(estado: {
  readonly enTierra: boolean;
  /** Velocidad sobre el suelo, m/s. */
  readonly velocidad: number;
}): boolean {
  return estado.enTierra && estado.velocidad <= PARADO;
}

/**
 * Lo que el vuelo que termina le deja dicho al que empieza.
 *
 * Una vez y nada más: se lee y se borra al arrancar. Si se quedara, cada
 * recarga de la página —el botón del hangar, una conexión que se corta—
 * volvería a saltarse la pantalla de quién vuela y el hangar.
 */
export interface Rearranque {
  /** El escenario donde se estaba, que es donde empieza el vuelo nuevo. */
  readonly escenario: string;
  /** El avión con el que se empieza. */
  readonly avion: string;
}

const CLAVE = "oga-veve:rearranque";

/**
 * Deja dicho con qué avión y dónde empezar.
 *
 * En la sesión de la pestaña y no en el guardado del perfil: es un recado
 * entre dos cargas de la misma página, no una preferencia. La preferencia —el
 * avión— se guarda aparte, en el perfil, como la guarda el hangar.
 */
export function pedirRearranque(
  almacen: Pick<Storage, "setItem"> | null,
  r: Rearranque,
): boolean {
  try {
    almacen?.setItem(CLAVE, JSON.stringify(r));
    return !!almacen;
  } catch {
    return false;
  }
}

/** Lee el recado, si lo hay, y lo borra. Ver `Rearranque`. */
export function leerRearranque(
  almacen: Pick<Storage, "getItem" | "removeItem"> | null,
): Rearranque | null {
  try {
    const crudo = almacen?.getItem(CLAVE) ?? null;
    if (crudo === null) return null;
    almacen?.removeItem(CLAVE);
    const r = JSON.parse(crudo) as Partial<Rearranque>;
    return typeof r.escenario === "string" && typeof r.avion === "string"
      ? { escenario: r.escenario, avion: r.avion }
      : null;
  } catch {
    return null;
  }
}

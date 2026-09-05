/**
 * La frustrada: irse al aire cuando la aproximación no está saliendo.
 *
 * Es **la regla número uno de este proyecto** y hasta hoy el juego no la
 * conocía: no había una sola línea que la detectara. Y sin detectarla no se
 * puede celebrar, que es de lo que se trata.
 *
 * ## Por qué importa tanto aquí
 *
 * En un simulador de entretenimiento, irse al aire es fracasar: no conseguiste
 * aterrizar. En la aviación de verdad es exactamente lo contrario — **la
 * frustrada es la maniobra que salva**, y el accidente casi siempre lo tiene
 * quien se empeñó en meter el avión en una pista donde no cabía. Todo piloto
 * la practica y todo piloto sabe que renunciar a tiempo es la decisión buena.
 *
 * Así que aquí se felicita, y se felicita igual o más que un aterrizaje. Un
 * niño de cuatro años que aprende que **irse y volver a intentarlo está bien**
 * ha aprendido algo que le sirve fuera de este juego.
 *
 * ## Cómo se reconoce
 *
 * No hace falta preguntar nada ni poner un botón: se deduce del vuelo. Se
 * arma cuando la aproximación va en serio —bajando hacia la pista y ya
 * cerca del suelo— y salta cuando se sube de verdad **sin haber tocado**.
 *
 * Lo que no puede pasar, y por eso hay dos números y no uno:
 *
 * - Que la dé por buena **un rebote**. Quien toca y se separa cinco metros ha
 *   aterrizado mal, no ha renunciado. Por eso tocar la desarma del todo.
 * - Que la dé por buena **un bache**. Bajando a ras de suelo, medio segundo de
 *   ascenso no es una decisión: es aire. Por eso hace falta ganar altura de
 *   verdad sobre lo más bajo que se estuvo.
 *
 * Esto no dibuja, no suena y no puntúa. Dice cuándo ha pasado, y quien lo use
 * decide cómo se celebra.
 */

/** Por debajo de esta altura sobre el suelo, la aproximación ya va en serio, m. */
const APROXIMANDO = 200;

/**
 * Cuánto hay que subir sobre lo más bajo que se estuvo para que cuente, m.
 *
 * Cuarenta metros. Es bastante más que un bache y bastante menos que un
 * circuito: cuando alguien ha subido cuarenta metros con la pista debajo, ha
 * decidido no aterrizar ahí. Y es la altura a la que el aviso llega a tiempo
 * de servir para algo.
 */
const SUBIDA_QUE_CUENTA = 40;

/** Subiendo de verdad, m/s. Un tirón suave no es una decisión. */
const SUBIENDO = 1;

/**
 * Y bajando de verdad, m/s, que es lo que arma esto.
 *
 * **Hace falta que el requisito sea bajar y no solo estar bajo.** Sin esto, la
 * propia subida de la frustrada volvía a armar el detector al pasar por dentro
 * de los doscientos metros, y entonces contaban como frustradas dos cosas que
 * no lo son: el rebote de una toma mala y el despegue de todos los días. Lo
 * encontraron las pruebas; volando no se habría visto nunca, porque desde la
 * cabina una celebración de más parece un acierto.
 */
const BAJANDO = -0.5;

export interface EnAproximacion {
  /** Si el juego considera que esto es una aproximación final. */
  readonly enFinal: boolean;
  readonly sobreElSuelo: number;
  readonly vertical: number;
  readonly enElSuelo: boolean;
}

/**
 * Mira una aproximación y avisa si acabó en frustrada.
 *
 * Devuelve `true` **en el fotograma en que se reconoce**, una sola vez por
 * aproximación. Después hay que volver a bajar para que vuelva a armarse, que
 * es justamente lo que se quiere que pase: se va uno al aire, da la vuelta y
 * lo intenta otra vez.
 */
export class Frustrada {
  /** Si hay una aproximación en curso a la que seguirle la pista. */
  private siguiendo = false;
  /** Lo más bajo que se ha estado en ella, m sobre el suelo. */
  private loMasBajo = Infinity;

  paso(s: EnAproximacion): boolean {
    /*
     * **Tocar tierra la desarma, y no se rearma hasta la próxima.**
     *
     * Quien toca y se va no ha renunciado: ha aterrizado mal y ha vuelto a
     * despegar. Eso tiene su propio nombre y no es este.
     */
    if (s.enElSuelo) {
      this.siguiendo = false;
      this.loMasBajo = Infinity;
      return false;
    }

    // Se arma bajando hacia la pista y ya cerca del suelo.
    if (s.enFinal && s.sobreElSuelo < APROXIMANDO && s.vertical < BAJANDO)
      this.siguiendo = true;
    if (!this.siguiendo) return false;

    this.loMasBajo = Math.min(this.loMasBajo, s.sobreElSuelo);

    const subido = s.sobreElSuelo - this.loMasBajo;
    if (s.vertical > SUBIENDO && subido > SUBIDA_QUE_CUENTA) {
      // Se cuenta una vez: a partir de aquí ya es un vuelo, no una renuncia.
      this.siguiendo = false;
      this.loMasBajo = Infinity;
      return true;
    }
    return false;
  }

  /** Vuelta a empezar: otro vuelo. */
  reiniciar(): void {
    this.siguiendo = false;
    this.loMasBajo = Infinity;
  }
}

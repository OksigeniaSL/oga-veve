/**
 * ¿Ha aterrizado, y qué tal?
 *
 * Hasta que existió esto, aterrizar no decía nada: si no había una misión con
 * objetivo de aterrizaje, el avión tocaba, rodaba, se paraba y el juego se
 * quedaba callado. Y es al revés de lo que hace falta — **el aterrizaje es lo
 * difícil**, y es lo que hay que celebrar.
 *
 * Va aparte del juego y no dentro porque es una pequeña máquina de estados con
 * tres condiciones encadenadas, y esas se comprueban con pruebas y no volando
 * a mano veinte veces.
 */

/** Qué clase de aterrizaje fue, o `null` si todavía no hay veredicto. */
export type Aterrizaje = "suave" | "firme" | "rapido" | "fuera" | null;

/** Por debajo de este régimen de descenso al tocar, se considera suave (m/s). */
const SUAVE = 1.2;

/**
 * A qué velocidad se felicita (m/s).
 *
 * Se felicita a paso de rodaje, no en seco. Con el umbral en tres metros por
 * segundo había que esperar a la parada total, y una pista de tres kilómetros
 * sin frenar es un minuto largo de silencio justo después de lo único que
 * había que celebrar.
 */
const YA_FRENADO = 12;

/**
 * Cuánto se puede pasar de la velocidad de aproximación y seguir contando.
 *
 * Un cuarto por encima. Por encima de eso el avión no quiere posarse: rebota,
 * flota y se come la pista, y da igual lo suave que fuera el contacto —de
 * hecho **cuanto más rápido, más suave sale**, que es justo la trampa.
 *
 * Hasta hoy el veredicto solo miraba el régimen de descenso, así que aterrizar
 * a doscientos por hora con el motor a tope daba «suave» y quedaba tan bien
 * como una toma buena. «He hecho ambos aterrizajes y siempre con éxito; algo
 * tiene que avisar o saberse.»
 */
const DEMASIADO_RAPIDO = 1.25;

export class LandingWatcher {
  private volando = false;
  private pendiente = false;
  private enPista = false;
  private descenso = 0;
  /** A qué velocidad se tocó. Al frenar ya no se sabría. */
  private velocidadAlTocar = 0;

  /**
   * @param onGround si las ruedas tocan
   * @param airspeed velocidad, m/s
   * @param sinkRate régimen de descenso en el momento del contacto, m/s
   * @param crashed si se rompió
   * @param onRunway si el contacto fue sobre el asfalto
   * @param vref velocidad de aproximación de **esta** aeronave, m/s. De ella
   * sale si la toma fue rápida, y por eso no puede ser una constante: lo que
   * es rápido para una avioneta es lento para un reactor. Va por llamada y no
   * por constructor porque en el juego se puede cambiar de avión en marcha.
   */
  update(
    onGround: boolean,
    airspeed: number,
    sinkRate: number,
    crashed: boolean,
    onRunway: boolean,
    vref: number,
  ): Aterrizaje {
    if (!onGround) {
      this.volando = true;
      return null;
    }

    if (this.volando) {
      // Acaba de tocar: se guarda cómo, porque al frenar ya no se sabrá.
      this.volando = false;
      this.pendiente = true;
      this.descenso = sinkRate;
      this.velocidadAlTocar = airspeed;
      this.enPista = onRunway;
      return null;
    }

    if (!this.pendiente || crashed || airspeed > YA_FRENADO) return null;
    this.pendiente = false;
    if (!this.enPista) return "fuera";
    /*
     * **La velocidad manda sobre la suavidad.**
     *
     * Y no es un capricho de orden: una toma rápida sale suave *porque* es
     * rápida —el avión llega con sustentación de sobra y se posa como una
     * pluma— y luego se come dos kilómetros de pista. Premiar la suavidad ahí
     * sería enseñar exactamente lo contrario de lo que hay que aprender.
     */
    if (this.velocidadAlTocar > vref * DEMASIADO_RAPIDO) return "rapido";
    return this.descenso < SUAVE ? "suave" : "firme";
  }

  reset(): void {
    this.volando = false;
    this.pendiente = false;
  }
}

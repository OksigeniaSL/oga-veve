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
export type Aterrizaje = 'suave' | 'firme' | 'fuera' | null;

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

export class LandingWatcher {
  private volando = false;
  private pendiente = false;
  private enPista = false;
  private descenso = 0;

  /**
   * @param onGround si las ruedas tocan
   * @param airspeed velocidad, m/s
   * @param sinkRate régimen de descenso en el momento del contacto, m/s
   * @param crashed si se rompió
   * @param onRunway si el contacto fue sobre el asfalto
   */
  update(
    onGround: boolean,
    airspeed: number,
    sinkRate: number,
    crashed: boolean,
    onRunway: boolean,
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
      this.enPista = onRunway;
      return null;
    }

    if (!this.pendiente || crashed || airspeed > YA_FRENADO) return null;
    this.pendiente = false;
    if (!this.enPista) return 'fuera';
    return this.descenso < SUAVE ? 'suave' : 'firme';
  }

  reset(): void {
    this.volando = false;
    this.pendiente = false;
  }
}

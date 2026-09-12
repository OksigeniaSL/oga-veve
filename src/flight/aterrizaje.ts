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
 * Cuánto se espera desde el contacto para dar el veredicto, s.
 *
 * **Se esperaba a bajar de velocidad de rodaje, y eso puede tardar un minuto.**
 * Medido: sin frenar, en una pista de tres kilómetros, el veredicto salía
 * cincuenta y cuatro segundos y mil ciento veintinueve metros después de tocar
 * tierra. Para entonces ya nadie lo relaciona con la toma, que es lo único que
 * el veredicto juzga.
 *
 * Dos segundos: lo que tarda el avión en asentarse sobre el tren y lo que dura
 * la sensación de haber tocado. Se dice cuando todavía se está hablando de
 * eso.
 */
const DESDE_EL_CONTACTO = 2;

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

/**
 * Y qué parte de lo que el modelo puede volar ya es demasiado para posarse.
 *
 * Noventa y tres centésimas: si llegás casi al tope de lo que el avión sabe
 * hacer, no estás aterrizando, estás pasando por encima de la pista.
 */
const CASI_A_TOPE = 0.93;

/**
 * Cuánto hay que llevar en el aire para que el contacto siguiente sea un
 * aterrizaje, s.
 *
 * Tres segundos. **Un bote no es un vuelo**, y hasta hoy lo era: bastaba un
 * fotograma con las ruedas despegadas para armar el detector, así que rodar
 * por una plataforma con un badén a trece metros por segundo daba un salto
 * corto y, al volver a tocar, «aterrizaste fuera de la pista» — con su
 * percance, su pantalla y el vuelo terminado. Pasó en Guaraní, rodando de
 * vuelta al puesto, con el vuelo ya hecho y el aterrizaje ya celebrado.
 *
 * Tres segundos separa las dos cosas sin discusión: una aproximación pasa
 * minutos en el aire y un badén, décimas. Y de paso arregla el otro lado de lo
 * mismo — un rebote en la toma tampoco vuelve a armar el detector, así que ya
 * no puede haber dos veredictos para un solo aterrizaje.
 */
const ALGO_MAS_QUE_UN_BOTE = 3;

export class LandingWatcher {
  private volando = false;
  private pendiente = false;
  private enPista = false;
  private descenso = 0;
  /** Segundos desde que las ruedas tocaron. */
  private desdeQueToco = 0;
  /** Segundos que se lleva en el aire. Ver `ALGO_MAS_QUE_UN_BOTE`. */
  private enElAire = 0;
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
    dt = 0,
    /**
     * Lo más rápido que sabe volar el modelo de hoy.
     *
     * Sin esto, el umbral de toma rápida —vez y cuarto la de aproximación— era
     * inalcanzable en el peldaño de los pequeños, cuyo modelo no pasa de
     * treinta y siete metros por segundo. La toma rápida no existía ahí, y se
     * podía llegar a tope de gas y oír «suave». Ver `velocidadMaxima`.
     */
    vmax = Infinity,
  ): Aterrizaje {
    if (!onGround) {
      this.enElAire += dt;
      if (this.enElAire >= ALGO_MAS_QUE_UN_BOTE) this.volando = true;
      return null;
    }
    this.enElAire = 0;

    if (this.volando) {
      // Acaba de tocar: se guarda cómo, porque al frenar ya no se sabrá.
      this.volando = false;
      this.pendiente = true;
      this.descenso = sinkRate;
      this.velocidadAlTocar = airspeed;
      this.enPista = onRunway;
      this.desdeQueToco = 0;
      return null;
    }

    this.desdeQueToco += dt;
    if (!this.pendiente || crashed || this.desdeQueToco < DESDE_EL_CONTACTO)
      return null;
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
    const listón = Math.min(vref * DEMASIADO_RAPIDO, vmax * CASI_A_TOPE);
    if (this.velocidadAlTocar > listón) return "rapido";
    return this.descenso < SUAVE ? "suave" : "firme";
  }

  /**
   * A qué régimen de descenso se tocó, m/s.
   *
   * Lo guarda al tocar, que es el único instante en que se sabe: dos segundos
   * después el avión ya rueda y su caída es cero. Lo pregunta el juego para
   * decidir si aquello fue un aterrizaje o un golpe — y preguntarle al estado
   * del vuelo en ese momento devuelve otra cosa, que es exactamente el fallo
   * que hacía saltar el percance en tomas buenas: «pero si aterricé al mínimo
   * de velocidad».
   */
  get caidaAlTocar(): number {
    return this.descenso;
  }

  reset(): void {
    this.volando = false;
    this.pendiente = false;
    this.desdeQueToco = 0;
    this.enElAire = 0;
  }
}

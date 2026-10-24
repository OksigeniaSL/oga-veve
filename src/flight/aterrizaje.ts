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

/**
 * Qué clase de aterrizaje fue, o `null` si todavía no hay veredicto.
 *
 * `corto` es tocar **en la pista pero antes de su umbral de aterrizaje**: en
 * la zona de las flechas de un umbral desplazado, que es asfalto para rodar y
 * despegar y no para posarse. Ver `world/umbral-desplazado.ts`.
 *
 * `largo` es tocar **pasada la zona de toma**, flotando: el avión se come la
 * pista que necesitaba para parar. Y `duro`, tocar con más caída de la que
 * aguanta el tren sin que haya que revisarlo. Ver la cuenta de `SUAVE` y
 * `DURO`, más abajo.
 */
export type Aterrizaje =
  | "suave"
  | "firme"
  | "rapido"
  | "largo"
  | "duro"
  | "corto"
  | "fuera"
  | null;

/*
 * ## Lo que hace bueno un aterrizaje: el sitio, no la suavidad
 *
 * Se dice mucho que «un aterrizaje firme es mejor que uno suave», y es verdad
 * a medias (punto 299). Lo que manda es **tocar en su sitio** —en la zona de
 * toma, a unos trescientos metros del umbral— y a la velocidad buena. Un toque
 * de pluma flotando seiscientos metros más allá es peor aterrizaje que uno
 * firme en su sitio, porque se come la pista: es la toma larga, una de las
 * causas que más se repiten en las salidas de pista por el final (FAA, AC
 * 91-79A, *Mitigating the Risks of a Runway Overrun Upon Landing*). Ver `flight/toma-larga.ts`, que
 * dice dónde acaba la zona.
 *
 * Y en pista mojada o corta se toca **firme a propósito**: la rueda rompe la
 * capa de agua y gira enseguida, y así entran el antideslizante y los frenos
 * de tierra, que esperan a notar el peso y el giro (Boeing, *737 Flight Crew
 * Training Manual*, «Landing on Wet or Slippery Runways»; FAA, *Airplane
 * Flying Handbook*, FAA-H-8083-3C, cap. 9 —el texto exacto, por verificar—).
 * No tiene nada que ver con el combustible.
 *
 * Firme no es duro. Así que las dos tomas en su sitio valen lo mismo —el
 * galón, las gafas y la celebración—, y lo que las separa es solo cómo se
 * llaman:
 *
 * - **Suave**, por debajo de dos pies por segundo, unos ciento veinte pies por
 *   minuto: un toque que casi no se nota, por debajo de lo habitual de un
 *   reactor de línea en las series de cargas en servicio de la FAA (DOT/FAA/AR,
 *   *Statistical Loads Data for … in Commercial Operations*; la cifra de cada
 *   avión, por verificar).
 * - **Firme**, de ahí a diez: lo normal de un avión de línea son dos a cuatro.
 * - **Duro**, por encima de diez pies por segundo, seiscientos pies por
 *   minuto: el régimen de descenso con el que se certifica el tren de un avión
 *   de transporte a su peso de aterrizaje (EASA CS 25.473 y FAA 14 CFR 25.473,
 *   «limit descent velocity» de 10 ft/s), y por encima del cual el manual de
 *   mantenimiento manda apuntar un aterrizaje duro e inspeccionar el avión
 *   (Airbus, AMM 05-51-11, *Inspection after Hard/Overweight Landing*; Boeing,
 *   AMM 05-51-01 —los números de tarea, por verificar—). En las avionetas el
 *   tren se certifica entre siete y diez pies por segundo según su carga alar
 *   (14 CFR 23.473(d), en la redacción anterior a la enmienda 64), así que
 *   diez es lo más que aguanta cualquiera de la flota sin revisar.
 *
 * Duro no es un percance: el avión está entero en la pista. Se dice, se ve y
 * la próxima vez se recoge un poco más. El golpe que rompe el tren es otra
 * cosa y lo pone el modelo de vuelo; ver `limiteDeCaida`.
 */

/** Pie por segundo, en m/s. */
const PIE_POR_SEGUNDO = 0.3048;

/** Por debajo de este régimen de descenso al tocar, se considera suave (m/s). */
const SUAVE = 2 * PIE_POR_SEGUNDO;

/** Y por encima de este, duro: se apunta y se revisa el avión (m/s). */
const DURO = 10 * PIE_POR_SEGUNDO;

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
  private trenPuestoAlTocar = true;
  /** Si se tocó antes del umbral de aterrizaje. Ver `Aterrizaje`. */
  private antesDelUmbralAlTocar = false;
  /** Si se tocó pasada la zona de toma. Ver `Aterrizaje`. */
  private largoAlTocar = false;
  /**
   * **Si las ruedas acaban de tocar viniendo del aire, en este paso.**
   *
   * El veredicto llega dos segundos después, y hay contactos que no pueden
   * esperar a él: el que roza el monte a velocidad de vuelo rebota y sigue
   * volando, y dos segundos con las ruedas apoyadas no llegan nunca. Quien
   * tenga que juzgar el instante del contacto lo mira aquí. Ver
   * `percanceAlTocar` en `percance.ts`.
   */
  private tocoAhora = false;

  get acabaDeTocar(): boolean {
    return this.tocoAhora;
  }

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
    /**
     * Si el tren estaba fuera **en el momento del contacto**.
     *
     * Se guarda igual que el régimen de descenso y por el mismo motivo: dos
     * segundos después ya no se sabe, porque a nadie le cuesta bajarlo una
     * vez que va rodando sobre la panza.
     */
    trenFuera = true,
    /**
     * Si el contacto fue en la pista pero **antes de su umbral de
     * aterrizaje**, en la zona desplazada. Se guarda al tocar, como todo lo
     * demás: rodando ya se ha salido de ella.
     */
    antesDelUmbral = false,
    /**
     * Si el contacto fue **pasada la zona de toma**: la toma larga. Lo dice
     * quien sabe dónde acaba esa zona —ver `finDeLaZonaDeToma` en
     * `toma-larga.ts`— y se guarda al tocar, que rodando ya se ha pasado.
     */
    largo = false,
  ): Aterrizaje {
    this.tocoAhora = false;
    if (!onGround) {
      this.enElAire += dt;
      if (this.enElAire >= ALGO_MAS_QUE_UN_BOTE) this.volando = true;
      return null;
    }
    this.enElAire = 0;

    if (this.volando) {
      // Acaba de tocar: se guarda cómo, porque al frenar ya no se sabrá.
      this.volando = false;
      this.tocoAhora = true;
      this.pendiente = true;
      this.descenso = sinkRate;
      this.velocidadAlTocar = airspeed;
      this.trenPuestoAlTocar = trenFuera;
      this.antesDelUmbralAlTocar = antesDelUmbral;
      this.largoAlTocar = largo;
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
     * **Y en la pista, pero donde no se toca.**
     *
     * Con el umbral desplazado, el asfalto de antes de la barra blanca es
     * pista —se rueda y se despega por él— y no es sitio para posarse: en la
     * 01 de Fuerteventura son mil metros. El avión del banco tocaba a ciento
     * cincuenta de la punta y el juego lo daba por un aterrizaje bueno, que
     * es enseñar a hacer justo lo que ese trozo de pista existe para impedir.
     * Va antes que la velocidad porque es lo mismo que «fuera»: **dónde** se
     * tocó. No se rompe nada ni se termina el vuelo; se dice, se ve, y la
     * próxima vez se toca pasada la barra.
     */
    if (this.antesDelUmbralAlTocar) return "corto";
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
    /*
     * **Y el golpe que obliga a revisar el avión**, antes que el sitio: es lo
     * único de una toma que deja trabajo detrás —el aterrizaje duro se apunta
     * y se inspecciona—, aunque haya sido en su sitio.
     */
    if (this.descenso > DURO) return "duro";
    /*
     * **Y el sitio manda sobre la suavidad** (punto 299). Una toma larga sale
     * suave casi siempre —flotar es justo no dejar que el avión se pose—, y
     * hasta hoy daba «¡qué aterrizaje!», que es premiar comerse la pista. Ver
     * la cuenta de `SUAVE` y `DURO`.
     */
    if (this.largoAlTocar) return "largo";
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

  /**
   * Y si llevaba el tren puesto al tocar.
   *
   * Se guarda por lo mismo que la caída: al preguntar ya es tarde. Contado
   * jugando, con la toma dada por buena: «me está dando por válida la toma
   * sin que me diga nada acerca del tren de aterrizaje, no lo había sacado».
   */
  get trenAlTocar(): boolean {
    return this.trenPuestoAlTocar;
  }

  reset(): void {
    this.tocoAhora = false;
    this.trenPuestoAlTocar = true;
    this.antesDelUmbralAlTocar = false;
    this.largoAlTocar = false;
    this.volando = false;
    this.pendiente = false;
    this.desdeQueToco = 0;
    this.enElAire = 0;
  }
}

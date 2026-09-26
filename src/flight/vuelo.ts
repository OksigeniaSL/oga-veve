/**
 * Un vuelo, de principio a fin.
 *
 * Hasta ahora el juego empezaba con el avión ya alineado en la pista y
 * terminaba cuando las ruedas tocaban. Eso no es un vuelo: es el trozo del
 * medio. Lo que pasa antes y después es la mitad de lo que hace un piloto y
 * **es la parte que se puede enseñar sin saber volar**.
 *
 * ── Lo que esto NO es ────────────────────────────────────────────────────
 *
 * La primera versión era una lista de comprobación: catorce fases y cada una
 * daba paso a la siguiente. Duró exactamente hasta que alguien jugó:
 *
 *   «Nada me impide salirme, despegar de manera transversal, y al volver ya
 *    no puedo aterrizar para retomar la guía por la calle de rodadura, ya
 *    estoy en vuelo.»
 *
 * Y era verdad. Una lista tacha pasos en orden y **no sabe qué hacer si te
 * saltas uno**: quien se salía del guion se quedaba fuera para siempre.
 *
 * ── Lo que es ────────────────────────────────────────────────────────────
 *
 * Un navegador. Un GPS de coche no se queda colgado cuando te pasas la
 * salida: **recalcula**. Así que la fase no se avanza, **se deduce**: cada
 * fotograma se mira dónde está el avión, si vuela, si ha volado ya, si está
 * en la pista y si tiene permiso, y de ahí sale qué toca ahora. Despegar en
 * travesía desde una calle de rodaje es algo que se puede hacer, y al volver
 * se retoma por donde se esté.
 *
 * Lo que llevó a la lista era un problema real —deducir cada fotograma hace
 * parpadear la fase en los límites— y se resuelve como se resuelve siempre,
 * igual que con la alarma de pérdida: **una fase nueva tiene que sostenerse
 * un tiempo antes de sustituir a la vieja**. No hace falta prohibir el
 * retroceso; hace falta que no tiemble.
 *
 * ── Y la torre ───────────────────────────────────────────────────────────
 *
 * **La torre habla con luces.** Verde autoriza, rojo manda parar. No es un
 * apaño para quien no lee: es la lámpara de señales de verdad, la que usa una
 * torre con un avión sin radio, y está en el Anexo 2 de OACI desde siempre.
 * Un niño de cuatro años entiende un semáforo, y resulta que un semáforo es
 * exactamente lo que hay.
 *
 * Y saltársela **se nota**. No se castiga —aquí se aprende haciendo y nadie
 * va a reiniciar un vuelo por eso—, pero queda dicho, que es distinto de que
 * no se pueda.
 *
 * Esto es lógica pura: no sabe de three.js, ni del DOM, ni de sonido. Recibe
 * dónde está el avión y devuelve en qué fase va.
 */

import type { FlightState } from "./model";

export type Fase =
  | "estacionado"
  | "arrancando"
  | "rodando"
  | "esperando"
  | "autorizado"
  | "back-taxi"
  | "alineando"
  | "despegando"
  | "comprometido"
  | "en-vuelo"
  | "final"
  | "aterrizado"
  | "abandonando"
  | "a-plataforma"
  | "en-puesto"
  | "apagado";

/** Lo que el juego le cuenta a la máquina en cada fotograma. */
export interface Situacion {
  readonly estado: FlightState;
  /** Metros del avión al eje de la ruta que le toca ahora. */
  readonly alaRuta: number;
  /** Metros que faltan hasta el final de la ruta actual. */
  readonly restante: number;
  /** Metros del avión al eje de la pista. */
  readonly alEjeDePista: number;
  /**
   * Metros a lo largo de la pista desde su centro. Negativo antes de la
   * cabecera de salida, positivo pasado el otro extremo.
   *
   * Hace falta para saber si se está **entrando o saliendo**. Sin esto, un
   * avión cuatro kilómetros pasado el extremo contrario, alejándose y bajando,
   * cumplía las tres condiciones de aproximación final —alineado, descendiendo
   * y cerca del eje prolongado— y el juego decía «bajá suavecito» mientras se
   * iba al monte.
   */
  readonly alLargoDePista: number;
  /** ¿Está el avión sobre el asfalto de la pista? */
  readonly enPista: boolean;
  /**
   * ¿Está haciendo el back-taxi, o sea rodando por la pista hacia la cabecera?
   *
   * Lo dice el plan de vuelo, que es quien ha trazado la ruta y sabe si esta
   * entrada en pista es «cruzo el borde y ya estoy» o «tengo que irme al fondo
   * y dar la vuelta». Desde aquí no se puede deducir: un avión en el eje
   * apuntando al revés puede estar haciendo el back-taxi o puede haberse
   * metido al revés, y lo que hay que decirle es distinto.
   */
  readonly backTaxi: boolean;
  /**
   * Metros de pista que quedan por delante. Cero pasado el final.
   *
   * Es lo que decide el punto de no retorno del despegue. Ver `yaNoSePuedeParar`.
   */
  readonly pistaRestante: number;
  /**
   * Y cuánta pista necesita **este** avión para despegar entero, en metros.
   *
   * El mínimo de verdad —`pistaQueNecesita`, el que decide si un avión cabe en
   * un campo—, no el que uno querría tener. Son dos preguntas distintas y el
   * juego tiene las dos: aquélla dice cuánta pista se **quiere** teniéndola y
   * es la que traza el punto de giro del back-taxi; ésta dice cuándo ya no hay
   * alternativa. Para reconocer que alguien está despegando de verdad manda la
   * segunda. Ver `flight/carrera.ts`.
   */
  readonly pistaQueNecesita: number;
  /** Metros de altura sobre el terreno. */
  readonly sobreElSuelo: number;
  /** ¿Está el motor en marcha? */
  readonly motor: boolean;
  /** Diferencia entre el rumbo del avión y el de la pista, grados, −180..180. */
  readonly desalineado: number;
}

export interface Paso {
  readonly fase: Fase;
  /** Se acaba de cambiar de fase en este fotograma. */
  readonly cambio: boolean;
  /** La torre tiene el semáforo en verde. */
  readonly luzVerde: boolean;
  /**
   * Se ha entrado en la pista sin permiso, y se acaba de detectar.
   *
   * Es la respuesta a «¿y qué pasa si me salto la luz?»: pasa que **se nota**.
   * Ni muro invisible ni vuelo reiniciado — eso sería enseñar que no se puede,
   * cuando lo que hay que enseñar es que no se hace.
   */
  readonly saltoLaLuz: boolean;
  /**
   * La lección de rodar está hecha: se ha parado sobre la doble raya.
   *
   * Solo en esa lección. Ver `acabaEnLaEspera`.
   */
  readonly leccionHecha: boolean;
}

/*
 * ## El punto de no retorno del despegue
 *
 * En aviación se llama V1, y es la velocidad pasada la cual ya no se aborta:
 * si algo va mal a partir de ahí, se despega y se resuelve en el aire, porque
 * frenando no cabes en lo que queda de pista.
 *
 * **No es un número fijo, y ese es justo el interés.** Depende de lo que
 * pesas, de lo rápido que vas y de la pista que te queda — «en avioneta,
 * además, esto ocurre más tarde, supongo; depende del tamaño del avión». Así
 * que aquí no se pone un número: se calcula lo que se tarda en parar y se
 * compara con lo que queda de asfalto. En los tres kilómetros y medio de
 * Tenerife Norte una avioneta no llega a comprometerse casi nunca, y eso es
 * verdad y está bien que se note; en una pista corta llega enseguida.
 *
 * La frenada es la de un avión ligero frenando fuerte en asfalto seco. El
 * margen es lo que se deja de sobra, porque el punto de no retorno se cruza
 * antes de que la cuenta salga justa: cuando ya no sobra, es que era tarde.
 */
const FRENADA = 2.5;
const MARGEN_DE_PARADA = 1.4;
/**
 * Lo que se tarda en decidir, en segundos.
 *
 * Va en la cuenta porque va en la de verdad: entre que algo falla y que el pie
 * está en el freno pasa tiempo, y a cien por hora ese tiempo son treinta
 * metros. Tres segundos es generoso para un piloto y corto para un niño de
 * cuatro años, que es quien va a estar mirando.
 */
const REACCION = 3;

function yaNoSePuedeParar(s: Situacion): boolean {
  const v = s.estado.airspeed;
  if (v < RODANDO_YA) return false;
  const paraParar = (v * REACCION + (v * v) / (2 * FRENADA)) * MARGEN_DE_PARADA;
  return paraParar > Math.max(0, s.pistaRestante);
}

/** Quieto de verdad, m/s. Por debajo de esto un avión está parado. */
const PARADO = 0.6;

/** Velocidad a la que se considera que ya rueda y no está parado, m/s. */
const RODANDO_YA = 2;

/** Altura a la que se da por despegado, m. */
const EN_EL_AIRE = 12;

/** Altura que hay que alcanzar antes de poder volver a aterrizar, m. */
const ALTURA_DE_CIRCUITO = 120;

/** Y tiempo mínimo en el aire, s. Ver la nota de la fase «en-vuelo». */
const TIEMPO_MINIMO_EN_VUELO = 15;

/**
 * A cuántos metros del final de la ruta se considera que ya se ha llegado.
 *
 * Cuarenta y cinco, no veinticinco. Con veinticinco, alguien que frena un poco
 * antes de la doble raya —que es lo prudente— se quedaba fuera de la ventana:
 * el avión parado, la ruta terminada delante de las ruedas, y el juego sin
 * pasar de fase ni encender la luz. Un punto de espera de verdad se marca con
 * una raya de treinta centímetros y nadie para al centímetro. La generosidad
 * va en la distancia; lo que no se perdona es no pararse.
 */
const LLEGADA = 45;

/** Cuánto hay que estar quieto en la doble raya antes de que la torre mire, s. */
const ESPERA_MINIMA = 1.5;

/** Cuánto tarda la torre en contestar una vez te ha visto parado, s. */
const TORRE_TARDA = 2.2;

/**
 * A cuánto del eje de pista se considera que ya la has abandonado, m.
 *
 * No vale con salirse del asfalto: la pista tiene una franja de seguridad a los
 * lados y un avión ahí sigue estorbando al que viene detrás. Los setenta y
 * cinco metros son la distancia real a la que está el punto de espera al otro
 * lado, que es donde se considera libre la pista.
 */
const PISTA_LIBRE = 75;

/**
 * A cuánto del eje deja de ser una carrera de despegue, m.
 *
 * Trescientos. Irse un poco de lado en la carrera es normal —el de fuselaje
 * ancho se va treinta y ocho metros en una pista de cuarenta y cinco, ver el
 * #158— y por eso el pestillo de la carrera no mira el rectángulo de la pista.
 * Pero a trescientos metros del eje ya no se está despegando de esa pista.
 */
const FUERA_DE_LA_CARRERA = 300;

/**
 * La velocidad a la que se deja de estar aterrizando, m/s. **Dos números.**
 *
 * Era uno solo, doce, y con un solo número la fase se pone a parpadear: en la
 * carrera de aterrizaje el avión frena y se queda un buen rato rondando
 * justo ese valor, así que cruzaba la raya arriba y abajo cada pocos
 * segundos. Grabado y contado sobre el vídeo: **treinta segundos alternando**
 * entre «frená» y «salí por E4», una orden distinta cada vez. Quien lo mira
 * no ve una duda del juego: ve dos órdenes que se contradicen.
 *
 * Con dos números la cosa se lee sola y además significa algo:
 *
 * - **Se sigue aterrizando** mientras se vaya más rápido de lo que se rueda.
 * - **Se empieza a salir** cuando ya se va a velocidad de rodaje, que es
 *   justo cuando se puede girar hacia una calle sin salirse.
 *
 * Y entre los dos hay una banda muerta: una vez que el juego ha dicho «salí»,
 * no vuelve a decir «frená» porque el avión rebote un metro por segundo.
 *
 * ## Y los dos van por encima de la velocidad de rodaje, siempre
 *
 * Estaban en doce y nueve, calibrados cuando se rodaba a nueve. Al subir el
 * rodaje a trece —«es aburrido pasarse cuatro minutos en una pista»— el avión
 * volvía a casa a once o doce, o sea **por encima del listón**, y la máquina
 * se quedaba clavada en «aterrizado» todo el camino de vuelta: ni «salí de la
 * pista», ni señalero, ni «volvé a tu lugar», y la tarjeta del freno puesta
 * hasta el puesto. Lo cazó el banco del vuelo entero a la primera; ninguna de
 * las pruebas por trozos podía verlo, porque ninguna rodaba de vuelta después
 * de haber aterrizado de verdad.
 *
 * Así que estos dos números **no son independientes** de la velocidad de
 * rodaje: tienen que quedar por encima de ella con holgura, y hay una prueba
 * que lo sujeta. Ver `vuelo-y-rodaje.test.ts`.
 */
export const AÚN_ATERRIZANDO = 20;

/** Y por debajo de esto ya se rueda, así que toca dejar la pista. */
export const YA_ES_RODAJE = 16;

/**
 * Cuánto hay que subir en final para dejar de estar en final, m.
 *
 * «Final» pedía ir bajando, y con eso la fase se iba a «en vuelo» cada vez que
 * el variómetro pasaba por cero: quien corrige la senda baja, se nivela, sube
 * un pelo y vuelve a bajar, y cada nivelada era salir de final y volver. En
 * una final recta a Los Rodeos, treinta y cinco segundos alternando —«estás
 * en final», «estás volando»—, la autorización de aterrizar pedida en cada
 * vuelta y un tramo de circuito cantado a cuatro kilómetros del umbral con el
 * avión alineado. Y cada pieza que se tapaba por su lado —el aviso de
 * terreno, el circuito— volvía a salir por otro, porque todas colgaban del
 * mismo parpadeo.
 *
 * Para **entrar** en final hace falta ir bajando, como siempre. Para **salir**
 * por arriba hace falta subir de verdad: veinte metros por encima de lo más
 * bajo que se estuvo en esta final. Una corrección de senda —«subí suave»—
 * son unos pocos metros, y el vaivén del variómetro de quien está cogiendo la
 * senda, dos o tres; una frustrada pasa los veinte en cuatro o cinco
 * segundos. Salir por los lados —desalinearse, pasar del centro de la pista,
 * subir por encima de los trescientos— sigue siendo inmediato.
 */
const SUBIDA_QUE_SACA_DE_FINAL = 20;

/**
 * Cuánto tiene que sostenerse una fase nueva para sustituir a la vieja, s.
 *
 * Es lo que permite deducir la fase cada fotograma sin que parpadee. Sin esto,
 * un avión oscilando en el filo de un umbral —parado y no parado, dentro y
 * fuera de la pista— hace que el juego se contradiga varias veces por segundo,
 * que fue exactamente el motivo por el que la primera versión solo avanzaba.
 *
 * Medio segundo basta: lo justo para filtrar el temblor y lo bastante poco
 * para que la respuesta se sienta inmediata.
 */
const HISTERESIS = 0.5;

/** Las fases que no esperan: cuando pasan, pasan. */
/*
 * Las fases que no esperan a la histéresis.
 *
 * La histéresis existe para que el juego no cambie de cartel cada vez que una
 * medida tiembla medio segundo. Pero hay fases que no son una medida: son un
 * interruptor. **El motor está en marcha o no lo está**, y hacer que la tarjeta
 * de «arrancá el motor» siga ahí medio segundo después de arrancarlo es decirle
 * a quien acaba de acertar que no ha pasado nada.
 *
 * Se vio jugando: «pulso la I y no se quita de la pantalla el icono». La I sí
 * arrancaba el motor —está medido— y el cartel se quedaba. Lo que falla en un
 * juego para prelectores no es que la respuesta llegue tarde: es que quien
 * pulsó no sepa si ha hecho algo.
 */
const INMEDIATAS: ReadonlySet<Fase> = new Set<Fase>([
  "arrancando",
  "en-vuelo",
  "apagado",
  "aterrizado",
]);

export class Vuelo {
  private fase: Fase = "estacionado";
  private desde = 0;
  /** La fase que el mundo está pidiendo, y desde cuándo. */
  private candidato: Fase = "estacionado";
  private candidatoDesde = 0;
  /** Segundos parado en la doble raya. */
  private quieto = 0;
  /** Segundos desde que la torre te vio parado. */
  private mirando = 0;
  private verde = false;
  /** Ha estado en el aire alguna vez, aunque sea un salto. */
  private despego = false;
  /** Lo más alto que se ha estado, m sobre el suelo. */
  private techo = 0;
  /**
   * Cuánto se ha subido en esta final sobre lo más bajo que se estuvo, m.
   * Sale del variómetro y no de la altura sobre el suelo, que en una final
   * sobre lomas sube y baja sin que el avión haga nada. Ver
   * `SUBIDA_QUE_SACA_DE_FINAL`.
   */
  private subidoEnFinal = 0;
  /** Segundos en el aire desde el despegue. */
  private enElAire = 0;
  /** Ya se ha avisado de que se saltó la luz. Se avisa una vez por vuelo. */
  private avisadoDeLaLuz = false;
  /** Ha usado un permiso. Entrar en pista después de eso no es saltarse nada. */
  private uso = false;

  /**
   * Si la torre no autoriza nunca. Lo pone la lección de rodar.
   *
   * Ver `flight/lecciones.ts`: es lo que convierte «rodar» en una lección con
   * principio y final.
   */
  acabaEnLaEspera = false;

  /** Si ya se paró en la doble raya con la lección de rodar. Ver `Paso`. */
  private rodajeHecho = false;

  /** Empieza un vuelo. `desdePista` arranca ya alineado, para el modo de siempre. */
  reiniciar(desdePista = false): void {
    this.fase = desdePista ? "despegando" : "estacionado";
    this.rodajeHecho = false;
    this.candidato = this.fase;
    this.desde = 0;
    this.candidatoDesde = 0;
    this.quieto = 0;
    this.mirando = 0;
    this.verde = desdePista;
    this.despego = false;
    this.techo = 0;
    this.subidoEnFinal = 0;
    this.enElAire = 0;
    this.avisadoDeLaLuz = false;
    // Y a «todavía no se ha mirado», que es lo que hace que empezar dentro de
    // la pista no cuente como haber entrado. Ver `vigilarLaLuz`.
    this.estabaEnPista = null;
    this.uso = desdePista;
  }

  get actual(): Fase {
    return this.fase;
  }

  get autorizado(): boolean {
    return this.verde;
  }

  /**
   * ¿Va hacia la pista o vuelve de volar?
   *
   * **Un salto de rana no cuenta.** Que las ruedas se despeguen doce metros no
   * significa haber volado: con eso bastando, un rebote en la carrera de
   * despegue metía al juego en modo de vuelta —«salí de la pista, volvé a tu
   * lugar»— en mitad del despegue. Para haberse ido hay que haber subido a
   * altura de circuito **y** haber estado un rato arriba; uno solo se engaña,
   * porque se puede subir mucho en poco rato y se puede estar mucho rato a ras
   * de suelo.
   */
  get vuelve(): boolean {
    return this.haVolado;
  }

  private get haVolado(): boolean {
    return (
      this.techo >= ALTURA_DE_CIRCUITO &&
      this.enElAire >= TIEMPO_MINIMO_EN_VUELO
    );
  }

  /** Segundos que se lleva en la fase actual. Sirve para no atosigar con avisos. */
  get enFase(): number {
    return this.desde;
  }

  paso(s: Situacion, dt: number): Paso {
    this.desde += dt;
    if (s.sobreElSuelo > EN_EL_AIRE) {
      this.despego = true;
      this.enElAire += dt;
    }
    this.techo = Math.max(this.techo, s.sobreElSuelo);
    // Lo subido en esta final, que nunca baja de cero: bajar deja el suelo
    // de la cuenta donde se esté. Ver `SUBIDA_QUE_SACA_DE_FINAL`.
    this.subidoEnFinal =
      this.fase === "final"
        ? Math.max(0, this.subidoEnFinal + s.estado.verticalSpeed * dt)
        : 0;

    this.atenderALaTorre(s, dt);
    const saltoLaLuz = this.vigilarLaLuz(s);

    // ── Deducir, no avanzar ────────────────────────────────────────────────
    const pedida = this.deducir(s);
    if (pedida !== this.candidato) {
      this.candidato = pedida;
      this.candidatoDesde = 0;
    } else {
      this.candidatoDesde += dt;
    }

    const antes = this.fase;
    const yaVale = INMEDIATAS.has(pedida) || this.candidatoDesde >= HISTERESIS;
    if (pedida !== this.fase && yaVale) {
      this.fase = pedida;
      this.desde = 0;
      // El permiso se gasta al usarlo: sirve para una entrada en pista y no
      // para todo el rato. Sin esto, quien abandona la pista y vuelve a entrar
      // lo hace con un verde de hace diez minutos.
      //
      // **Y también al verse volando**, aunque no se haya pasado por despegar.
      // Quien se salta la pista y despega de la calle de rodaje no pasa por esa
      // fase, así que el permiso no se gastaba nunca y la lámpara de la torre se
      // quedaba encendida el resto del vuelo: «despegué, pero esa flecha verde
      // sigue ahí… como no lo hice en pista está despistado».
      if (
        pedida === "despegando" ||
        pedida === "comprometido" ||
        pedida === "en-vuelo"
      ) {
        this.verde = false;
        this.uso = true;
      }
    }

    return {
      fase: this.fase,
      cambio: this.fase !== antes,
      luzVerde: this.verde,
      saltoLaLuz,
      leccionHecha: this.rodajeHecho,
    };
  }

  /**
   * Qué fase pide el mundo ahora mismo.
   *
   * Se lee de arriba abajo y la primera que encaja gana. El orden es el de la
   * realidad: primero si vuela, después si el motor está parado, y solo al
   * final las distinciones finas de lo que pasa rodando.
   */
  private deducir(s: Situacion): Fase {
    const parado = s.estado.groundSpeed < PARADO;
    const enTierra = s.sobreElSuelo <= EN_EL_AIRE;

    // ── En el aire ───────────────────────────────────────────────────────
    if (!enTierra) {
      // **Un salto de rana no es un vuelo.** Ver `vuelve`.
      const enFinal =
        this.haVolado &&
        // Antes del centro de la pista: quien la ha pasado ya no está
        // entrando, está yéndose.
        s.alLargoDePista < 0 &&
        s.sobreElSuelo < 300 &&
        // Se entra bajando y se sale subiendo de verdad, no al nivelarse.
        (this.fase === "final"
          ? this.subidoEnFinal < SUBIDA_QUE_SACA_DE_FINAL
          : s.estado.verticalSpeed < 0) &&
        Math.abs(s.desalineado) < 30 &&
        s.alEjeDePista < 400;
      return enFinal ? "final" : "en-vuelo";
    }

    // ── En el suelo, con el motor parado ─────────────────────────────────
    if (!s.motor) {
      /*
       * Apagar el motor en el suelo termina el vuelo, se esté donde se esté.
       * Es a propósito: «ya aterricé y esto gasta queroseno» es una razón
       * perfectamente válida para terminar, y obligar a rodar hasta el puesto
       * sería un juego, no un simulador.
       *
       * **Menos en la pista.** Ahí no es terminar: es dejar la pista
       * bloqueada con el avión apagado encima, que es de las cosas más graves
       * que pueden pasar en un aeropuerto. Contado jugando: «apago el motor en
       * mitad de la pista y "vuelo terminado", y gano hasta galones, vaya por
       * dios».
       *
       * Y no se castiga —aquí nunca se castiga—: no se da por terminado, se
       * sigue pidiendo lo mismo que se venía pidiendo, que es dejarla libre. El
       * motor se vuelve a arrancar con la misma tecla con la que se apagó, así
       * que no es una trampa sin salida; es la consecuencia, que es lo que
       * este juego enseña en vez de un castigo.
       */
      if (s.enPista && this.despego) return "abandonando";
      return this.despego ? "apagado" : "estacionado";
    }

    // ── En el suelo, volviendo de volar ──────────────────────────────────
    if (this.haVolado) {
      /*
       * Mientras corra a velocidad de carrera, sigue aterrizando. Con
       * histéresis: para **entrar** hace falta ir deprisa y para **salir**
       * hace falta bajar a velocidad de rodaje. Ver `AÚN_ATERRIZANDO`.
       */
      const liston =
        this.fase === "aterrizado" ? YA_ES_RODAJE : AÚN_ATERRIZANDO;
      /*
       * **Y una vez rodando, se vuelve a la carrera por el suelo, no por el
       * aire.**
       *
       * Los dos listones se escribieron cuando el modelo no conocía el viento
       * y las dos velocidades eran la misma. Con viento de cara no lo son: con
       * veinte nudos, rodar por la pista a los trece que pide el juego marca
       * veintitrés en el anemómetro, por encima de `AÚN_ATERRIZANDO`. Medido
       * en Fuerteventura: el avión volvía a «aterrizado» cada vez que
       * aceleraba hacia su salida y a «abandonando» cada vez que frenaba para
       * tomarla —«frená», «salí», «frená»—, y cada vuelta a «abandonando»
       * rehacía la raya hacia la salida siguiente, hasta el final de la pista.
       *
       * La toma se sigue mirando por el aire, porque viene volando; lo que ya
       * rueda, por el suelo, que es lo que mide el tope de rodaje y lo que
       * dice si se puede girar hacia una calle. Acelerar por la pista como en
       * una carrera sigue siendo volver a ella, que es lo que impide llevarse
       * una velocidad de pista a la salida.
       *
       * **Y la carrera también se deja por el suelo**, con el mismo número en
       * los dos sentidos. Si se saliera de «aterrizado» mirando el aire y se
       * volviera mirando el suelo, con viento de cola el vaivén volvería por el
       * otro lado: con ocho metros por segundo de cola, bajar de dieciséis en
       * el anemómetro es ir a veinticuatro por el suelo, por encima de
       * `AÚN_ATERRIZANDO`, y al fotograma siguiente otra vez a la carrera. Una
       * histéresis solo es una banda muerta si los dos bordes miden lo mismo.
       * Lo único que mira el aire es la toma: la que llega volando.
       */
      const vieneVolando = this.fase === "final" || this.fase === "en-vuelo";
      const velocidad = vieneVolando
        ? s.estado.airspeed
        : s.estado.groundSpeed;
      /*
       * **Y aterrizando se está en la pista. Fuera de ella, ya se rueda.**
       *
       * Esto solo miraba la velocidad, así que un avión que salía del asfalto
       * todavía deprisa seguía «aterrizado» **por toda la plataforma**, y en
       * esa fase el tope de rodaje es un trinquete: impide acelerar y no
       * frena. Resultado medido en Tenerife Norte, dos vuelos de cada seis:
       * el avión dejaba la pista a **veintisiete metros por segundo**
       * —noventa y siete por hora—, cruzaba la plataforma a esa velocidad y se
       * metía dentro de la terminal. Percance «edificio», y con toda la razón.
       *
       * Es la misma queja que ya se oyó con otras palabras: «a toda leche me
       * pasé E5 y nada me avisó, puedo ir a la velocidad que me da la gana por
       * la pista después de un aterrizaje».
       *
       * Fuera del rectángulo de la pista no se aterriza: se rueda, y rodando
       * hay un tope que sí frena. La histéresis de la velocidad se queda para
       * lo suyo, que es no salirse de la carrera por un bote.
       *
       * **Y no es lo contrario del despegue**, aunque lo parezca. Allí salirse
       * del rectángulo **no** deshace la carrera, porque lo que hace falta en
       * una carrera de despegue es que nadie te quite el gas. Aquí lo que hace
       * falta es lo otro: que nadie te deje llevarte a la plataforma una
       * velocidad de pista. Una regla protege lo que necesitás; la otra te
       * quita lo que ya no te toca.
       */
      if (s.enPista && velocidad >= liston) return "aterrizado";
      /*
       * **Y haber llegado gana a estar saliendo.**
       *
       * Esto preguntaba primero por la pista, y con eso un avión que ya está
       * parado en su puesto seguía «abandonando» si el puesto cae a menos de
       * setenta y cinco metros del eje. En La Gomera cae a sesenta y nueve: la
       * plataforma está pegada a la pista porque el campo mide lo que mide.
       *
       * Y no era solo una etiqueta equivocada: el juego le pedía **las dos
       * cosas a la vez** —«frená» y «salí de la pista»— alternándolas, con el
       * avión quieto, hasta que se acababa el tiempo. Cuatrocientos noventa y
       * seis segundos para recorrer doscientos noventa y seis metros. Es la
       * contradicción que ya se oyó en otro sitio: «"salí de la pista, viene
       * otro", "más despacio" — o salgo de la pista o me doy prisa».
       *
       * Un puesto está donde está el puesto. Si el aeropuerto lo puso a
       * sesenta y nueve metros del eje, llegar ahí es llegar.
       */
      /*
       * **Y parado en la pista no es haber llegado.**
       *
       * Faltaba `!s.enPista`, y sin eso pararse sobre el asfalto para dar la
       * vuelta contaba como estacionar: «llegaste, apagá el motor — pero si
       * estoy en la pista todavía». Es un error gordo y de los que enseñan lo
       * contrario de lo que hay que enseñar, porque **la pista se deja libre**:
       * hay otro detrás, y ese es el motivo por el que existe el punto de
       * espera y la doble raya.
       *
       * No vale exigir además que esté lejos del eje: un puesto está donde
       * está el puesto, y en La Gomera cae a sesenta y nueve metros porque el
       * campo mide lo que mide. Lo que no puede caer nunca dentro del
       * rectángulo de la pista es un puesto de estacionamiento.
       */
      if (parado && !s.enPista && s.restante < LLEGADA) return "en-puesto";
      // La pista hay que dejarla libre: hay otro detrás.
      if (s.alEjeDePista <= PISTA_LIBRE) return "abandonando";
      return "a-plataforma";
    }

    /*
     * ── En el suelo, con la carrera de despegue ya empezada ──────────────
     *
     * **Una carrera empezada no se deshace por salirse un poco del eje.**
     *
     * Todo lo de abajo cuelga de `s.enPista`, que es un rectángulo con su
     * margen; en cuanto el avión se sale de él, esta función caía hasta el
     * final y devolvía «rodando». Y «rodando» es una de las fases en las que el
     * tope de rodaje **cierra el gas**, así que un avión a cincuenta y siete
     * metros por segundo con el gas a fondo se encontraba con que el juego se
     * lo quitaba, y ya no volvía a subir: no llegaba a la velocidad de
     * rotación y no despegaba nunca.
     *
     * Es el #158 —«el turbohélice no despega con ayudas puestas: se come 3.400
     * m de pista»— y por eso solo le pasaba a los grandes: son los que se van
     * del eje en la carrera. Medido en Tenerife Sur con el JAZ 120: 38 m de
     * desvío máximo en una pista de 45, punta 57 m/s y Vr en 86.
     *
     * A cincuenta y siete metros por segundo por el suelo nadie está rodando.
     * Se sale de la carrera **por abajo** —frenando hasta velocidad de rodaje—
     * o **por arriba**, volando; no por irse de lado. Es la misma histéresis
     * que ya tenía la carrera de aterrizaje, en el otro extremo del vuelo.
     */
    const enLaCarrera =
      this.fase === "despegando" || this.fase === "comprometido";
    /*
     * **Y una carrera se hace en la pista o cerca de ella.**
     *
     * El pestillo de arriba sostiene la carrera mientras se corra, y eso está
     * bien mientras se corra **por donde se corre**. En Fuerteventura —cuyo
     * grafo de calles se va del campo, ver #163— el avión salía del puesto, no
     * llegaba nunca a la pista y acababa dando vueltas a tres kilómetros al
     * norte del aeropuerto, a treinta y un metros por segundo y en fase
     * «comprometido», con la tarjeta de «ya no podés parar» puesta, hasta que
     * se acababa el tiempo.
     *
     * Un avión a trescientos metros del eje no está despegando de esa pista,
     * esté a la velocidad que esté. Y trescientos son de sobra: el de fuselaje
     * ancho se va treinta y ocho metros de lado en la carrera —era el #158— y
     * eso tiene que seguir contando como carrera.
     */
    if (
      enLaCarrera &&
      s.alEjeDePista < FUERA_DE_LA_CARRERA &&
      s.estado.airspeed >= YA_ES_RODAJE
    )
      return yaNoSePuedeParar(s) ? "comprometido" : "despegando";

    // ── En el suelo, yendo hacia la pista ────────────────────────────────
    if (s.enPista) {
      /*
       * **Ir hasta el fondo por la propia pista no es alinearse.**
       *
       * Cuando la plataforma está en un extremo y hay que despegar por el
       * otro, la única forma de llegar a la cabecera es rodar por la pista y
       * dar la vuelta al final: el back-taxi. Durante todo ese trecho el avión
       * está sobre el asfalto y con el morro apuntando justo al revés que la
       * pista, que es exactamente la señal que esta función usaba para decir
       * «ponete derechito en el eje». Y ponerse derechito ahí es lo que **no**
       * hay que hacer: lo que hay que hacer es seguir hasta el fondo.
       *
       * En cuanto se pasa el punto donde toca girar, el plan baja la bandera y
       * esto vuelve a ser lo de siempre: alinearse y despegar.
       */
      const alineado = Math.abs(s.desalineado) < 8 && s.alEjeDePista < 12;
      /*
       * **Pero despegar es un hecho, y el back-taxi solo un plan.**
       *
       * Esto devolvía «back-taxi» sin mirar nada más, dando por supuesto que se
       * rueda hasta el punto de giro que trazó el plan. Y ese punto se calcula
       * con la pista que uno **querría** tener —`pistaQueHaceFalta`, casi cinco
       * veces la carrera de despegue: sitio para el despegue, para uno mal
       * hecho y para arrepentirse a mitad—, que en una pista larga queda muy
       * atrás. En Pettirossi, con 3359 m, el Pykasu tiene que volver 920 metros
       * para ganar los 1200 que el plan le quiere dejar delante.
       *
       * Nadie hace eso. Quien tiene tres kilómetros por delante se alinea y se
       * va, y hace bien. Pero como la bandera seguía puesta, el juego pensaba
       * que aquello era rodaje: **ni V1, ni Vr, ni la flecha de tirar**, que son
       * las tres cosas que marcan ese medio minuto. Se ve en el banco: en
       * Pettirossi las fases de un vuelo entero van «autorizado → back-taxi →
       * en vuelo» y no pasan por ninguna de las tres de despegue.
       *
       * Así que el hecho gana al plan: derecho en el eje y más rápido de lo que
       * rueda nadie, esto es un despegue lo diga quien lo diga. La misma regla
       * que ya hizo falta para que un cuatrimotor no volviera a «rodando» a
       * mitad de carrera por irse un poco del eje.
       */
      /*
       * **Y con pista suficiente por delante, que si no esto es una trampa.**
       *
       * Sin esta condición, el hecho ganaba al plan en cuanto alguien se
       * alineaba y aceleraba — y con ello se levantaba el tope de velocidad de
       * rodaje, que era lo único que impedía despegar desde donde no se puede.
       * Medido: el bimotor en Tenerife Norte empezaba la carrera a mitad del
       * back-taxi, rotaba justo encima de un edificio y se lo llevaba por
       * delante a cuarenta y seis metros por segundo.
       *
       * Así que el hecho gana al plan, pero no a la pista: sin el mínimo
       * delante, esto sigue siendo rodaje y el tope sigue puesto.
       */
      const despegandoYa =
        alineado &&
        s.estado.airspeed >= YA_ES_RODAJE &&
        s.pistaRestante >= s.pistaQueNecesita;
      if (s.backTaxi && !despegandoYa) return "back-taxi";
      if (!alineado) return "alineando";
      return yaNoSePuedeParar(s) ? "comprometido" : "despegando";
    }
    if (parado && s.restante < LLEGADA)
      return this.verde ? "autorizado" : "esperando";
    if (this.verde) return "autorizado";
    if (s.estado.groundSpeed > RODANDO_YA) return "rodando";
    // Motor en marcha, quieto y lejos de la doble raya: acaba de arrancar. Y
    // si ya venía rodando, sigue rodando: un semáforo en rojo a mitad de calle
    // no te devuelve al puesto.
    return this.fase === "rodando" ? "rodando" : "arrancando";
  }

  /**
   * La torre mira, y contesta.
   *
   * **Mira si estás parado, no si has llegado.** Lo primero que se probó fue
   * autorizar al llegar a la raya, y entonces no hacía falta parar: se cruzaba
   * a toda velocidad y la lección desaparecía.
   */
  private atenderALaTorre(s: Situacion, dt: number): void {
    // En la lección de rodar la torre no autoriza nunca, y eso es lo que le da
    // final: del puesto a la doble raya, parar encima, y ya está. Sin esto,
    // aprender a rodar no se acaba nunca — o se acaba despegando, que es otra
    // lección.
    //
    // **Y ese final tiene que llegar a verse.** La torre callaba y ahí se
    // acababa todo: el avión parado en la raya con la mano roja para siempre,
    // sin panel ni galón, y quien lo hizo bien sin enterarse de que lo había
    // hecho bien. Parar encima el mismo rato que la torre pide para mirarte
    // es terminar la lección.
    if (this.haVolado || this.verde) return;
    const enLaRaya =
      s.restante < LLEGADA && !s.enPista && s.sobreElSuelo <= EN_EL_AIRE;
    if (!enLaRaya) {
      this.quieto = 0;
      this.mirando = 0;
      return;
    }
    this.quieto = s.estado.groundSpeed < PARADO ? this.quieto + dt : 0;
    if (this.acabaEnLaEspera) {
      if (this.quieto > ESPERA_MINIMA) this.rodajeHecho = true;
      return;
    }
    if (this.quieto > ESPERA_MINIMA) this.mirando += dt;
    if (this.mirando > TORRE_TARDA) this.verde = true;
  }

  /**
   * ¿Se ha metido en la pista sin permiso? Se avisa una vez por vuelo.
   *
   * Hay que mirar también si **ya usó un permiso**, no solo si lo tiene ahora:
   * el verde se gasta al entrar en pista, así que un fotograma después de
   * usarlo legítimamente el avión está en la pista y sin permiso, que es
   * exactamente la pinta de habérselo saltado. Sin esto, quien hacía las cosas
   * bien recibía la reprimenda.
   */
  /**
   * Si se acaba de **entrar** en la pista sin la luz verde.
   *
   * ## Entrar, no estar
   *
   * Esto miraba `s.enPista` a secas, así que saltaba con solo **estar** en la
   * pista. Y media flota empieza ahí: la lección de despegue coloca el avión
   * en la cabecera, alineado y listo. O sea que meter gas rompía el avión por
   * incursión en pista y el vuelo volvía a empezar — medido volando un
   * despegue entero en Lanzarote con el de fuselaje ancho: **tres veces en un
   * minuto**, con el mismo percance cada vez.
   *
   * Una incursión es cruzar la doble raya viniendo de fuera. Si el avión ya
   * estaba dentro cuando empezó el vuelo, no ha cruzado nada: sólo se mira el
   * **canto de subida** de `enPista`, y la primera lectura se toma como punto
   * de partida y no como cruce.
   *
   * La lámpara, la doble raya y el punto de espera siguen sirviendo para lo
   * que servían, y quien de verdad se salte el rojo rodando desde la calle lo
   * sigue pagando. Ver `sinpermiso` en `game.ts`.
   */
  private vigilarLaLuz(s: Situacion): boolean {
    const entra = s.enPista && this.estabaEnPista === false;
    // Se apunta siempre, incluso cuando lo de abajo corta: lo que interesa es
    // el canto, y un canto se pierde si se deja de mirar un fotograma.
    this.estabaEnPista = s.enPista;
    if (this.haVolado || this.verde || this.uso || this.avisadoDeLaLuz)
      return false;
    if (!entra || s.sobreElSuelo > EN_EL_AIRE) return false;
    this.avisadoDeLaLuz = true;
    return true;
  }

  /**
   * Si en la lectura anterior estaba en la pista. `null` es «todavía no se ha
   * mirado», y por eso un vuelo que **empieza** en la pista no cuenta como
   * entrada: no hay lectura anterior desde fuera.
   */
  private estabaEnPista: boolean | null = null;
}

/**
 * Qué le toca hacer ahora, en una clave de traducción y un icono.
 *
 * Va aquí y no en el HUD porque **es parte de la lección, no de la pintura**:
 * la frase que se le dice a alguien en cada momento del vuelo es contenido, y
 * tenerla junto a la máquina de estados evita que las dos se separen.
 */
/**
 * Las fases cuya tarjeta **espera a que alguien haga algo**, y por eso no
 * caduca: arrancar, parar en la doble raya, frenar, salir de la pista, apagar.
 *
 * Hace falta en dos sitios: para ponerlas con `Infinity` y para
 * **devolverlas** cuando un aviso de paso se las lleva por delante.
 *
 * Y vive aquí, junto al `GUION` y a la máquina de fases, por lo mismo que el
 * guión: **cuánto dura una orden es parte de la orden**, no de la pintura.
 * Estaba en el juego, donde no se podía probar sin montar three.js entero, y
 * por eso los huecos se descubrían de uno en uno y con el banco de vuelo.
 */
export const SE_QUEDAN: ReadonlySet<Fase> = new Set<Fase>([
  "estacionado",
  "en-puesto",
  "esperando",
  "aterrizado",
  "abandonando",
  /*
   * **Y rodar también se queda puesto**, que costó verlo.
   *
   * «Seguí la raya verde» y «volvé a tu lugar» duraban seis segundos y después
   * la pantalla se quedaba en blanco: en el banco del vuelo entero, **sesenta
   * y ocho segundos seguidos** rodando hacia la plataforma sin una sola
   * tarjeta. No es una fase de paso como despegar o virar: es una orden que
   * sigue siendo verdad durante todo el rato que dura, igual que «frená».
   */
  "rodando",
  "a-plataforma",
  /*
   * Y las dos de entrar en pista: «luz verde, entrá» y «ponete derechito en el
   * eje» duran lo que tarde quien juega en hacerlo, que es la maniobra más
   * delicada del rodaje. También se quedaban en blanco a los seis segundos.
   */
  "autorizado",
  "alineando",
  /*
   * **Y la carrera de despegue, que era el último hueco.**
   *
   * «Motor a fondo» y «¡Ya no se puede frenar, volá!» son órdenes que siguen
   * siendo verdad todo el rato que dura la carrera, igual que «seguí la raya»
   * — y duraban seis segundos. Medido en el banco del vuelo entero, en Yvytu
   * Rape: **nueve segundos seguidos con la pantalla en blanco**, corriendo por
   * el asfalto a treinta y cuatro metros por segundo, entre que se apagaba la
   * tarjeta del gas y aparecía la flecha de tirar.
   *
   * Son justo los segundos que el comentario de las dos velocidades llama «la
   * lección»: ya no puedo parar y todavía no vuelo. Enseñarlos en blanco es no
   * enseñarlos.
   */
  "despegando",
  "comprometido",
  /*
   * Y el back-taxi, que es el trecho más largo que se rueda de una vez: se
   * entra por el borde, se va hasta el fondo de la pista y se da la vuelta.
   * En Encarnación y en Mariscal Estigarribia es la operación normal del
   * campo. «Andá hasta el fondo y date la vuelta» sigue siendo verdad todo
   * ese rato.
   */
  "back-taxi",
]);

export const GUION: Record<
  Fase,
  { readonly clave: string; readonly icono: string }
> = {
  estacionado: { clave: "vuelo.estacionado", icono: "llave" },
  arrancando: { clave: "vuelo.arrancando", icono: "helice" },
  rodando: { clave: "vuelo.rodando", icono: "amarillo" },
  esperando: { clave: "vuelo.esperando", icono: "mano" },
  autorizado: { clave: "vuelo.autorizado", icono: "verde" },
  "back-taxi": { clave: "vuelo.backTaxi", icono: "media-vuelta" },
  alineando: { clave: "vuelo.alineando", icono: "eje" },
  despegando: { clave: "vuelo.despegando", icono: "motor" },
  comprometido: { clave: "vuelo.comprometido", icono: "nopara" },
  "en-vuelo": { clave: "vuelo.enVuelo", icono: "ala" },
  final: { clave: "vuelo.final", icono: "senda" },
  aterrizado: { clave: "vuelo.aterrizado", icono: "freno" },
  abandonando: { clave: "vuelo.abandonando", icono: "salida" },
  "a-plataforma": { clave: "vuelo.aPlataforma", icono: "acasa" },
  "en-puesto": { clave: "vuelo.enPuesto", icono: "llave" },
  apagado: { clave: "vuelo.apagado", icono: "llave" },
};

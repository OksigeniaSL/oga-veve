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

import type { FlightState } from './model';

export type Fase =
  | 'estacionado'
  | 'arrancando'
  | 'rodando'
  | 'esperando'
  | 'autorizado'
  | 'alineando'
  | 'despegando'
  | 'en-vuelo'
  | 'final'
  | 'aterrizado'
  | 'abandonando'
  | 'a-plataforma'
  | 'en-puesto'
  | 'apagado';

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
  'arrancando',
  'en-vuelo',
  'apagado',
  'aterrizado',
]);

export class Vuelo {
  private fase: Fase = 'estacionado';
  private desde = 0;
  /** La fase que el mundo está pidiendo, y desde cuándo. */
  private candidato: Fase = 'estacionado';
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

  /** Empieza un vuelo. `desdePista` arranca ya alineado, para el modo de siempre. */
  reiniciar(desdePista = false): void {
    this.fase = desdePista ? 'despegando' : 'estacionado';
    this.candidato = this.fase;
    this.desde = 0;
    this.candidatoDesde = 0;
    this.quieto = 0;
    this.mirando = 0;
    this.verde = desdePista;
    this.despego = false;
    this.techo = 0;
    this.enElAire = 0;
    this.avisadoDeLaLuz = false;
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
    return this.techo >= ALTURA_DE_CIRCUITO && this.enElAire >= TIEMPO_MINIMO_EN_VUELO;
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
      if (pedida === 'despegando' || pedida === 'en-vuelo') {
        this.verde = false;
        this.uso = true;
      }
    }

    return { fase: this.fase, cambio: this.fase !== antes, luzVerde: this.verde, saltoLaLuz };
  }

  /**
   * Qué fase pide el mundo ahora mismo.
   *
   * Se lee de arriba abajo y la primera que encaja gana. El orden es el de la
   * realidad: primero si vuela, después si el motor está parado, y solo al
   * final las distinciones finas de lo que pasa rodando.
   */
  private deducir(s: Situacion): Fase {
    const parado = s.estado.airspeed < PARADO;
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
        s.estado.verticalSpeed < 0 &&
        Math.abs(s.desalineado) < 30 &&
        s.alEjeDePista < 400;
      return enFinal ? 'final' : 'en-vuelo';
    }

    // ── En el suelo, con el motor parado ─────────────────────────────────
    if (!s.motor) {
      // Apagar el motor en el suelo termina el vuelo, se esté donde se esté.
      // Es a propósito: «ya aterricé y esto gasta queroseno» es una razón
      // perfectamente válida para terminar, y obligar a rodar hasta el puesto
      // sería un juego, no un simulador.
      return this.despego ? 'apagado' : 'estacionado';
    }

    // ── En el suelo, volviendo de volar ──────────────────────────────────
    if (this.haVolado) {
      // Mientras corra a velocidad de carrera, sigue aterrizando.
      if (s.estado.airspeed >= 12) return 'aterrizado';
      // La pista hay que dejarla libre: hay otro detrás.
      if (s.alEjeDePista <= PISTA_LIBRE) return 'abandonando';
      if (parado && s.restante < LLEGADA) return 'en-puesto';
      return 'a-plataforma';
    }

    // ── En el suelo, yendo hacia la pista ────────────────────────────────
    if (s.enPista) {
      const alineado = Math.abs(s.desalineado) < 8 && s.alEjeDePista < 12;
      return alineado ? 'despegando' : 'alineando';
    }
    if (parado && s.restante < LLEGADA) return this.verde ? 'autorizado' : 'esperando';
    if (this.verde) return 'autorizado';
    if (s.estado.airspeed > RODANDO_YA) return 'rodando';
    // Motor en marcha, quieto y lejos de la doble raya: acaba de arrancar. Y
    // si ya venía rodando, sigue rodando: un semáforo en rojo a mitad de calle
    // no te devuelve al puesto.
    return this.fase === 'rodando' ? 'rodando' : 'arrancando';
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
    if (this.acabaEnLaEspera) return;
    if (this.haVolado || this.verde) return;
    const enLaRaya = s.restante < LLEGADA && !s.enPista && s.sobreElSuelo <= EN_EL_AIRE;
    if (!enLaRaya) {
      this.quieto = 0;
      this.mirando = 0;
      return;
    }
    this.quieto = s.estado.airspeed < PARADO ? this.quieto + dt : 0;
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
  private vigilarLaLuz(s: Situacion): boolean {
    if (this.haVolado || this.verde || this.uso || this.avisadoDeLaLuz) return false;
    if (!s.enPista || s.sobreElSuelo > EN_EL_AIRE) return false;
    this.avisadoDeLaLuz = true;
    return true;
  }
}

/**
 * Qué le toca hacer ahora, en una clave de traducción y un icono.
 *
 * Va aquí y no en el HUD porque **es parte de la lección, no de la pintura**:
 * la frase que se le dice a alguien en cada momento del vuelo es contenido, y
 * tenerla junto a la máquina de estados evita que las dos se separen.
 */
export const GUION: Record<Fase, { readonly clave: string; readonly icono: string }> = {
  estacionado: { clave: 'vuelo.estacionado', icono: 'llave' },
  arrancando: { clave: 'vuelo.arrancando', icono: 'helice' },
  rodando: { clave: 'vuelo.rodando', icono: 'amarillo' },
  esperando: { clave: 'vuelo.esperando', icono: 'mano' },
  autorizado: { clave: 'vuelo.autorizado', icono: 'verde' },
  alineando: { clave: 'vuelo.alineando', icono: 'eje' },
  despegando: { clave: 'vuelo.despegando', icono: 'motor' },
  'en-vuelo': { clave: 'vuelo.enVuelo', icono: 'ala' },
  final: { clave: 'vuelo.final', icono: 'senda' },
  aterrizado: { clave: 'vuelo.aterrizado', icono: 'freno' },
  abandonando: { clave: 'vuelo.abandonando', icono: 'salida' },
  'a-plataforma': { clave: 'vuelo.aPlataforma', icono: 'amarillo' },
  'en-puesto': { clave: 'vuelo.enPuesto', icono: 'llave' },
  apagado: { clave: 'vuelo.apagado', icono: 'llave' },
};

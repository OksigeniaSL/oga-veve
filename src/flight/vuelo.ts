/**
 * Un vuelo, de principio a fin.
 *
 * Hasta ahora el juego empezaba con el avión ya alineado en la pista y
 * terminaba cuando las ruedas tocaban. Eso no es un vuelo: es el trozo del
 * medio. Lo que pasa antes y después es la mitad de lo que hace un piloto y
 * **es la parte que se puede enseñar sin saber volar**.
 *
 * Doce fases. Cada una sabe tres cosas: qué hay que hacer, cuándo se ha hecho,
 * y qué pasa si te la saltas.
 *
 *     ESTACIONADO   el avión está en su puesto, con el motor parado
 *     ARRANCANDO    se enciende el motor
 *     RODANDO       se sigue la línea amarilla hasta la doble raya
 *     ESPERANDO     se para en la doble raya y se pide permiso
 *     AUTORIZADO    la torre da luz verde
 *     ALINEANDO     se entra en la pista y se pone recto
 *     DESPEGANDO    motor a tope
 *     EN_VUELO      lo de siempre
 *     FINAL         alineado con la pista y bajando
 *     ATERRIZADO    ruedas en el suelo, frenando
 *     ABANDONANDO   se sale de la pista, que hay otro detrás
 *     A_PLATAFORMA  se vuelve al puesto
 *     EN_PUESTO     ya está en su sitio, con el motor todavía en marcha
 *     APAGADO       se para el motor. Fin.
 *
 * **La torre habla con luces, no con palabras.** Verde autoriza, rojo manda
 * parar. No es un apaño para quien no lee: es la lámpara de señales de verdad,
 * la que usa una torre con un avión sin radio, y está en el Anexo 2 de OACI
 * desde siempre. Un niño de cuatro años entiende un semáforo, y resulta que un
 * semáforo es exactamente lo que hay.
 *
 * Esto es lógica pura: no sabe de three.js, ni del DOM, ni de sonido. Recibe
 * dónde está el avión y devuelve en qué fase va. Así se prueba entera sin
 * navegador.
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
  /**
   * La torre tiene el semáforo en verde.
   *
   * Está aquí y no en el juego porque **quién manda es la fase**: la luz no se
   * enciende porque haya pasado un tiempo, se enciende cuando el avión ha
   * hecho lo que tenía que hacer, que es pararse del todo antes de la raya.
   */
  readonly luzVerde: boolean;
}

/** Quieto de verdad, m/s. Por debajo de esto un avión está parado. */
const PARADO = 0.6;

/** Velocidad a la que se considera que ya rueda y no está parado, m/s. */
const RODANDO_YA = 2;

/** Altura a la que se da por despegado, m. */
const EN_EL_AIRE = 12;

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

export class Vuelo {
  private fase: Fase = 'estacionado';
  private desde = 0;
  /** Segundos parado en la doble raya. */
  private quieto = 0;
  /** Segundos desde que la torre te vio parado. */
  private mirando = 0;
  private verde = false;
  /** Hace falta recordar si voló para no dar por aterrizado al que no despegó. */
  private volo = false;

  /** Empieza un vuelo. `enPista` arranca ya alineado, para el modo de siempre. */
  reiniciar(desdePista = false): void {
    this.fase = desdePista ? 'despegando' : 'estacionado';
    this.desde = 0;
    this.quieto = 0;
    this.mirando = 0;
    this.verde = desdePista;
    this.volo = false;
  }

  get actual(): Fase {
    return this.fase;
  }

  get autorizado(): boolean {
    return this.verde;
  }

  /** Segundos que se lleva en la fase actual. Sirve para no atosigar con avisos. */
  get enFase(): number {
    return this.desde;
  }

  /**
   * Avanza un fotograma.
   *
   * Las fases solo van hacia delante. Se probó a dejarlas volver —que rodar
   * hacia atrás desde la doble raya devolviera a «rodando»— y el resultado fue
   * un tutor que se contradecía cada dos segundos en cuanto el avión oscilaba
   * en el límite. Si alguien se sale de la ruta, la fase no cambia: cambia lo
   * que le dice el tutor, que para eso está.
   */
  paso(s: Situacion, dt: number): Paso {
    const antes = this.fase;
    this.desde += dt;
    if (s.sobreElSuelo > EN_EL_AIRE) this.volo = true;

    switch (this.fase) {
      case 'estacionado':
        if (s.motor) this.ir('arrancando');
        break;

      case 'arrancando':
        // Basta con que empiece a moverse: arrancar y soltar el freno es una
        // sola cosa para quien juega.
        if (s.estado.airspeed > RODANDO_YA) this.ir('rodando');
        break;

      case 'rodando':
        if (s.restante < 25 && s.estado.airspeed < RODANDO_YA) this.ir('esperando');
        break;

      case 'esperando': {
        // **La torre mira si estás parado, no si has llegado.** Lo primero que
        // se probó fue autorizar al llegar a la raya, y entonces no hacía falta
        // parar: se cruzaba a toda velocidad y la lección desaparecía.
        this.quieto = s.estado.airspeed < PARADO ? this.quieto + dt : 0;
        if (this.quieto > ESPERA_MINIMA) this.mirando += dt;
        if (this.mirando > TORRE_TARDA) {
          this.verde = true;
          this.ir('autorizado');
        }
        break;
      }

      case 'autorizado':
        if (s.enPista) this.ir('alineando');
        break;

      case 'alineando':
        if (Math.abs(s.desalineado) < 8 && s.alEjeDePista < 12) this.ir('despegando');
        break;

      case 'despegando':
        if (s.sobreElSuelo > EN_EL_AIRE) this.ir('en-vuelo');
        break;

      case 'en-vuelo':
        // Final: bajando, alineado con la pista y por debajo de trescientos.
        if (
          s.sobreElSuelo < 300 &&
          s.estado.verticalSpeed < 0 &&
          Math.abs(s.desalineado) < 30 &&
          s.alEjeDePista < 400
        ) {
          this.ir('final');
        }
        break;

      case 'final':
        if (this.volo && s.sobreElSuelo < 3 && s.estado.airspeed < 40) this.ir('aterrizado');
        else if (s.sobreElSuelo > 400) this.ir('en-vuelo');
        break;

      case 'aterrizado':
        // Se abandona la pista cuando se rueda despacio: mientras vaya a
        // velocidad de carrera, sigue aterrizando.
        if (s.estado.airspeed < 12) this.ir('abandonando');
        break;

      case 'abandonando':
        if (s.alEjeDePista > PISTA_LIBRE) this.ir('a-plataforma');
        break;

      case 'a-plataforma':
        if (s.restante < 25 && s.estado.airspeed < PARADO) this.ir('en-puesto');
        break;

      case 'en-puesto':
        // Aquí no se hace nada más que apagar, y de eso se encarga la regla de
        // abajo. Se queda como fase propia porque **decirle a alguien «ya
        // llegaste, ahora apagá» es un paso**, y sin él el vuelo termina sin
        // que nadie sepa que terminó.
        break;

      default:
        break;
    }

    // Apagar el motor en el suelo termina el vuelo, se esté donde se esté. Es
    // la única transición que no sigue el orden, y es a propósito: «ya aterricé
    // y esto gasta queroseno» es una razón perfectamente válida para terminar,
    // y castigarla obligando a rodar hasta el puesto sería un juego, no un
    // simulador.
    if (!s.motor && this.fase !== 'estacionado' && s.sobreElSuelo < 3 && this.volo) {
      this.ir('apagado');
    }

    return { fase: this.fase, cambio: this.fase !== antes, luzVerde: this.verde };
  }

  private ir(fase: Fase): void {
    this.fase = fase;
    this.desde = 0;
    // El permiso se gasta al usarlo: sirve para una entrada en pista y no para
    // todo el rato. Sin esto, quien abandona la pista y vuelve a entrar lo hace
    // con un verde de hace diez minutos.
    if (fase === 'alineando') this.verde = false;
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

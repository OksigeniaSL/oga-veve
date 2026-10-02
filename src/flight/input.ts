/**
 * Entrada del jugador: teclado, mando y táctil, unificados.
 *
 * Los tres caminos escriben sobre el mismo `ControlInputs`. El teclado no da
 * valores continuos, así que sus ejes se suavizan hacia el objetivo: sin eso
 * el avión pega tirones y se siente barato.
 *
 * **Y en el aire, el teclado y el dedo no mueven los mandos: se los dan a una
 * mano** que inclina el ala y cambia de trayectoria a un ritmo tranquilo y
 * sostiene lo conseguido al soltar. Ver `flight/mano.ts`. El mando de juego y
 * el joystick, que tienen muelle de verdad, siguen moviendo los mandos tal
 * cual; su reparto está en `flight/mandos-fisicos.ts`.
 *
 * El táctil no es un añadido: media de las partidas van a ser en la tablet
 * de alguien. Ver AGENTS.md, regla del test Ña Emy.
 */

import { neutralControls, type ControlInputs } from "./model";
import { mueveElTren, sePuedeMeter } from "./tren";
import {
  DobleToque,
  mandoDelDedo,
  PUNTO_DEL_MANDO,
  puntoDelMando,
  separarEjes,
} from "./palanca-de-mando";
import { ManoQueSostiene, type LoQuePide, type LoQueVeLaMano } from "./mano";
import { GasDelHotas, leerMando, type LecturaDelMando } from "./mandos-fisicos";
import {
  DETENTES,
  TARDAN_LOS_FLAPS,
  muescaMasCercana,
  mueveLosFlaps,
  siguienteDetente,
} from "./flaps";
import { Keymap, type Accion } from "./keymap";
import {
  CrucetaDelCompensador,
  ToquesDeCabeceo,
  palancaEnLaDuda,
} from "./palanca-de-teclado";
import {
  MANTENER,
  alIman,
  cruzaMarca,
  gasALaAltura,
  marcasDeGas,
  siguientePaso,
} from "./palanca-de-gas";

/** Velocidad a la que un eje de teclado alcanza el tope, por segundo. */
const KEY_RAMP = 2.6;
/** Velocidad a la que un eje suelto vuelve al centro, por segundo. */
const KEY_CENTRE = 3.4;
/**
 * Lo que sube o baja el gas por segundo con una tecla o un botón mantenido:
 * de ralentí a despegue en un segundo y dos tercios.
 */
const RITMO_DEL_GAS = 0.6;

/** Lo que tardan los aerofrenos en abrirse del todo, s. */
const TARDAN_LOS_AEROFRENOS = 2;
/**
 * Por encima de este gas los aerofrenos se cierran solos. Ver `update`: la
 * mitad del recorrido, como los cincuenta grados de palanca de Embraer.
 */
export const GAS_QUE_CIERRA_LOS_AEROFRENOS = 0.5;

/**
 * Teclas por eje, declaradas por intención y no por posición.
 *
 * Están así porque la versión anterior pasaba las teclas como argumentos
 * posicionales de una función `keyAxis(positive, negative, ...)` y se
 * colaron invertidas: la flecha arriba bajaba el morro y el avión se
 * clavaba contra la pista. El táctil y el mando estaban bien, así que solo
 * fallaba el teclado y no se veía en ninguna prueba.
 *
 * Flecha arriba sube. En un simulador de verdad la palanca se empuja hacia
 * delante para bajar, pero quien tiene cinco años espera que arriba sea
 * arriba, y ese es el público. Un ajuste para invertirlo puede venir después.
 */

/**
 * Valor de un eje a partir de las teclas pulsadas: +1, 0 o -1.
 *
 * Función pura y exportada para poder probarla sin navegador, que es lo que
 * faltaba cuando se invirtió el cabeceo.
 */
/**
 * Cuánto se mueve el compensador por segundo con la tecla apretada.
 *
 * Medio recorrido por segundo, o sea cuatro segundos de tope a tope. Sale de
 * lo que tarda en girarse una rueda de compensador de verdad, y sobre todo de
 * que con menos no se afina: lo que se pide de este mando son pasos pequeños.
 */
export const PASO_DE_TRIM = 0.25;

/**
 * Lo mínimo que mueve un golpe de cruceta, para distinguirlo de la rueda
 * mantenida, que mueve mucho menos en cada fotograma. Ver `compensar`.
 */
const PASO_MINIMO_QUE_SE_OYE = 0.01;

/** El reloj de los toques, en segundos. Ver `ToquesDeCabeceo`. */
function ahoraEnSegundos(): number {
  return performance.now() / 1000;
}

export function axisFromKeys(
  held: ReadonlySet<string>,
  positive: readonly string[],
  negative: readonly string[],
): number {
  const up = positive.some((code) => held.has(code)) ? 1 : 0;
  const down = negative.some((code) => held.has(code)) ? 1 : 0;
  return up - down;
}

export interface InputActions {
  toggleCamera: () => void;
  toggleAssist: () => void;
  resetFlight: () => void;
  toggleKeys: () => void;
  /** Baja o sube el cuadro de mandos. Ver la acción `cuadro` del teclado. */
  toggleCuadro: () => void;
  togglePausa: () => void;
  toggleEngine: () => void;
  toggleCredits: () => void;
  cycleAircraft: () => void;
  cycleMission: () => void;
  /** Pasar al siguiente aeropuerto de destino. Ver `siguienteDestino`. */
  cycleDestino: () => void;
  /** Girar la rueda del altímetro un hectopascal. Ver `flight/altimetro.ts`. */
  girarAltimetro: (pasos: number) => void;
  /**
   * Girar la rueda de la ventanilla ALT, de millar en millar. Ver
   * `flight/altitud-seleccionada.ts`. Opcional: sin ella la tecla no hace nada.
   */
  girarVentanillaAlt?: (pasos: number) => void;
  cycleLanguage: () => void;
  toggleSound: () => void;
  /** Se llama en el primer gesto: los navegadores no dejan sonar antes. */
  firstGesture: () => void;
  /**
   * Se pidió meter el tren con el avión apoyado, y no se meterá. Para que se
   * note que el mando **está trabado** y no roto. Ver `alternarTren`.
   */
  trenTrabado?: () => void;
  /**
   * Un paso del compensador, con su signo: +1 morro arriba. Para que se oiga
   * el clic de la rueda y se vea saltar la aguja, que es como se aprende sin
   * leer que el toque ha hecho algo. Ver `flight/palanca-de-teclado.ts`.
   */
  pasoDelCompensador?: (sentido: number) => void;
}

/*
 * Las muescas de la palanca viven con los flaps, en `flight/flaps.ts`, que es
 * donde está también lo que tardan en llegar a ellas. Se reexportan aquí
 * porque la palanca es de este fichero y quien la busca, la busca aquí.
 */
export { DETENTES, siguienteDetente } from "./flaps";

export class InputManager {
  readonly controls: ControlInputs = { ...neutralControls(), throttle: 0 };

  /**
   * Qué ejes está moviendo alguien **en este fotograma**: tecla, dedo o mando.
   *
   * No se puede deducir de `controls`, que vuelven al centro poco a poco: un
   * alerón a 0,2 puede ser alguien virando suave o una tecla soltada hace un
   * instante. Esto es la petición, que es lo que decide quién manda. Lo mira
   * el vuelo recto de los instrumentos: ver `flight/vuelo-recto.ts`.
   */
  readonly mueve = { cabeceo: false, alabeo: false, timon: false };

  /**
   * **Y cuánto**, de −1 a 1: la petición de este fotograma en cada eje, antes
   * de que el mando vaya hacia ella. Lo mira la ayuda de rodaje para saber si
   * quien juega está girando el volante: ver `asistirRodaje` en `game.ts`.
   */
  readonly pide = { alabeo: 0, timon: 0 };

  /**
   * **Qué ejes sostiene la mano** del teclado o del dedo: el avión se queda
   * como se dejó. Lo miran los que antes se fiaban de ver los mandos en el
   * centro para saber que nadie pilotaba —la nivelada de los peldaños de
   * abajo, el vuelo recto con un instrumento abierto—: con la mano puesta,
   * alguien pilota aunque no apriete nada. Ver `flight/mano.ts`.
   */
  readonly sostiene = { alabeo: false, cabeceo: false };

  /** La mano que sostiene. Ver `flight/mano.ts`. */
  readonly mano = new ManoQueSostiene();

  /**
   * Lo que la mano ve del avión, puesto por el juego en cada fotograma. Sin
   * él —un banco que pilota escribiendo en los mandos— no hay mano.
   */
  private avion: LoQueVeLaMano | null = null;

  /** Lo que se le pide a la mano en este fotograma. Uno, para no reservar. */
  private readonly pideALaMano: LoQuePide = {
    teclaAlabeo: 0,
    teclaCabeceo: 0,
    toqueAlabeo: 0,
    toqueCabeceo: 0,
    mandoAlabeo: false,
    mandoCabeceo: false,
  };

  /** Los toques cortos que llegaron entre dos fotogramas, con su signo. */
  private toquesPendientes = { alabeo: 0, cabeceo: 0 };

  /** Si la mano llevaba cada eje en el fotograma anterior. */
  private manoAntes = { alabeo: false, cabeceo: false };

  /** Qué reparto tiene el mando conectado y cuál es su palanca de gases. */
  private readonly gasDelHotas = new GasDelHotas();
  /** Los botones del mando en el fotograma anterior, para ver el golpe. */
  private botonesAntes = { flapsArriba: false, flapsAbajo: false, tren: false, aerofrenos: false };
  /** El mando de juego de este fotograma, si hay. */
  private mandoDeAhora: LecturaDelMando | null = null;

  private readonly keys = new Set<string>();
  private readonly actions: InputActions;
  /** Ejes del stick táctil, -1 a 1. */
  private touchPitch = 0;
  private touchRoll = 0;
  private touchRudder = 0;
  /**
   * La palanca de gases de la pantalla, si se ha tocado: se queda donde se
   * deja, como una de verdad. `null` mientras mandan el teclado o el mando.
   */
  private touchThrottle: number | null = null;
  /**
   * Sus marcas —ralentí, rodaje y despegue de este avión— y el elemento en
   * el que se pinta. Ver `flight/palanca-de-gas.ts` y `ponerMarcasDeGas`.
   */
  private marcasDeGas: readonly number[] = marcasDeGas(0.3);
  private palancaEl: HTMLElement | null = null;
  /** Lo último pintado en la palanca, para no tocar el estilo por nada. */
  private gasPintado = -1;
  /**
   * Si en este aparato se juega con la palanca de la pantalla: con el dedo,
   * que es cuando la hoja de estilos la enseña.
   */
  private conPalanca = false;
  /** Cuánto lleva apretado un botón de motor, s. Ver `MANTENER`. */
  private botonMantenido = 0;
  /** Si quien vuela movió el gas en este fotograma. Ver `mueveElGas`. */
  private gasMovido = false;
  /** Si el dedo o un botón lo tocaron desde el último `update`. */
  private gasTocado = false;
  /** Lo último que dio la palanca del mando, para saber si se movió. */
  private gasDelMando: number | null = null;
  /** −1 si el cabeceo va invertido. Lo pone el juego desde los ajustes. */
  private signoDeCabeceo = 1;

  /** Qué carácter dio cada tecla física al pulsarla. Ver `onKeyUp`. */
  private readonly chars = new Map<string, string>();

  /** Qué tecla hace qué. Se puede cambiar desde la pantalla de teclas. */
  readonly keymap = new Keymap();

  private touchBrakes = false;

  /** Dirección pedida por los botones de motor de la pantalla. */
  private buttonThrottle = 0;

  /**
   * Freno desde un botón de la interfaz, no del teclado ni del mando.
   *
   * Existe porque el freno del primer peldaño es un botón rojo grande y no
   * una tecla: a los cuatro años, y en una tablet, un rótulo que pone
   * «espacio» no sirve de nada.
   */
  setTouchBrakes(pressed: boolean): void {
    this.touchBrakes = pressed;
  }

  /**
   * Los flaps, de detente en detente.
   *
   * Existe porque el mando de los flaps de la cabina se pulsa con el dedo —ver
   * `world/botones-cabina.ts`— y los flaps son un conmutador que lleva
   * `onKeyDown`: sin esto habría que fingir una pulsación de teclado, que es la
   * clase de atajo que se paga dos veces.
   *
   * **Y va por muescas, no de todo a nada.** Era un interruptor de dos
   * posiciones —cero o todo— y eso no es una palanca de flaps de ningún avión:
   * «¿por qué los flaps se ponen todo o nada?». La palanca de verdad tiene
   * topes y se baja de uno en uno, y cada tope hace algo distinto — el primero
   * es para despegar y el último para aterrizar. Es la diferencia entre un
   * mando y un botón, y la regla del cuadro de mandos ya dibujaba las cuatro
   * muescas desde el primer día. Ver `reglaDeFlaps`.
   *
   * **Y mueve la palanca, no los flaps.** Los flaps van detrás, a su paso, y
   * los lleva `update`. Ver `flight/flaps.ts`.
   */
  alternarFlaps(): void {
    // En el avión que no los lleva no hay palanca que mover. Ver
    // `ponerAeronave`.
    if (!this.flapsQueSeMueven) return;
    this.flapsPedidos = DETENTES[siguienteDetente(this.flapsPedidos)]!;
  }

  /**
   * **Una muesca abajo, o arriba**, sin dar la vuelta: los botones de flaps de
   * un joystick o de un mando, que van de dos en dos como la palanca de
   * verdad. La tecla y el botón de la pantalla siguen siendo uno solo que da
   * la vuelta —ver `alternarFlaps`—, porque son una sola tecla.
   */
  flapsUnaMuesca(sentido: 1 | -1): void {
    if (!this.flapsQueSeMueven) return;
    const i = Math.max(0, Math.min(DETENTES.length - 1, muescaMasCercana(this.flapsPedidos) + sentido));
    this.flapsPedidos = DETENTES[i]!;
  }

  /**
   * **Lo que la mano ve del avión**, cada fotograma, antes de `update`. Lo pone
   * el juego —ver `loQueVeLaMano` en `game.ts`—; con `null`, no hay mano y los
   * mandos son los de siempre.
   */
  ponerAvion(ve: LoQueVeLaMano | null): void {
    this.avion = ve;
  }

  /**
   * Dónde está la palanca de flaps: lo pedido, en una de sus cuatro muescas.
   *
   * No es dónde están los flaps —eso es `controls.flaps`, que tarda en
   * llegar—, y por eso lo miran los que hablan de lo que se ha hecho y no de
   * lo que ha pasado: el tutor que pide flaps no los vuelve a pedir mientras
   * están saliendo. Es la misma regla que el aviso del tren.
   */
  get palancaDeFlaps(): number {
    return this.flapsPedidos;
  }

  /**
   * Poner la palanca en la muesca más cercana a este valor.
   *
   * Para quien configura el avión sin pasar por el dedo: la final que empieza
   * ya configurada, y el banco que vuela como un piloto. La palanca solo sabe
   * estar en sus muescas, así que un valor suelto cae en la más cercana.
   */
  ponerPalancaDeFlaps(donde: number): void {
    if (!this.flapsQueSeMueven) return;
    this.flapsPedidos = DETENTES[muescaMasCercana(donde)]!;
  }

  /** Si este avión tiene palanca de flaps. Ver `ponerAeronave`. */
  get hayPalancaDeFlaps(): boolean {
    return this.flapsQueSeMueven;
  }

  /**
   * **Hasta dónde pueden bajar los flaps ahora**, de 0 a 1, diga lo que diga
   * la palanca.
   *
   * Lo pone el juego en cada fotograma: el alivio de carga de un reactor, o
   * unos flaps de avioneta que quedaron tocados por pasarse. La palanca no se
   * mueve —en la cabina tampoco—; los flaps van a lo que pida ella o hasta
   * aquí, lo que sea menos. Ver `flight/carga-de-flaps.ts`.
   */
  topeDeFlaps = 1;

  /**
   * Si el compensador compensa algo en el modelo de vuelo de hoy.
   *
   * En el peldaño del dibujo el cabeceo no es un timón sino cuánto sube el
   * avión —ver `flight/arcade.ts`—, y ahí un toque que moviera el compensador
   * lo dejaría puesto sin que se notara, para aparecer de golpe al cambiar de
   * peldaño. Lo pone el juego al construir el modelo.
   */
  compensadorVivo = true;

  /** Los toques de las flechas. Ver `flight/palanca-de-teclado.ts`. */
  private readonly toques = new ToquesDeCabeceo();
  /** Y los de las flechas de alabeo, que con la mano puesta dan su paso. */
  private readonly toquesDeAlabeo = new ToquesDeCabeceo();
  /** Y la cruceta del mando, que hace de interruptor del compensador. */
  private readonly cruceta = new CrucetaDelCompensador();

  /** Si la mano puede llevar este eje ahora: en el aire y sin otra mano. */
  private laManoPuede(eje: "alabeo" | "cabeceo"): boolean {
    const ve = this.avion;
    if (!ve || !this.mano.puedeCoger) return false;
    return eje === "alabeo" ? !ve.otraManoAlabeo : !ve.otraManoCabeceo;
  }

  /** La palanca de flaps. Empieza arriba, como está un avión en su puesto. */
  private flapsPedidos = 0;
  /** Y si este avión los lleva siquiera. Ver `ponerAeronave`. */
  private flapsQueSeMueven = true;
  /** Y lo que tardan de arriba abajo en este avión. Ver `ponerAeronave`. */
  private tardanLosFlaps = TARDAN_LOS_FLAPS;

  /**
   * Y el tren, que es lo otro que se pide y tarda.
   *
   * **Se guarda la orden, no la posición**: entre pedirlo y tenerlo pasan diez
   * segundos, y ese rato es medio mando. Quien lo pide tarde aterriza sin él.
   * Ver `flight/tren.ts`.
   *
   * **Y con el peso encima no se mete.** Parado en la pista con el JAZ 120 se
   * podía recoger el tren: «¿cómo es posible que pueda quitar el tren si
   * estoy en la pista?». En un avión de verdad no se puede: un interruptor
   * en la pata —el de tierra/aire— bloquea la palanca mientras el avión está
   * apoyado, porque la alternativa es sentarse sobre la panza. La orden ni
   * se guarda: no se queda esperando a despegar para meterlo sola, que sería
   * otra sorpresa. Sacarlo, en cambio, se puede siempre.
   *
   * Todos los caminos pasan por aquí —la tecla, el botón del HUD, el de la
   * cabina—, y por eso el cerrojo está aquí y no en cada botón. Devuelve si
   * la orden se aceptó.
   *
   * **Y en el avión de tren fijo no hay palanca que mover.** La tecla le daba
   * la vuelta igual a la orden, y las patas seguían fuera: el mando decía
   * «dentro» y el tren «fuera», que es exactamente el desacuerdo que enciende
   * la luz roja en un avión que ni siquiera la lleva. Ver `luzRojaDelTren`.
   */
  alternarTren(): boolean {
    if (!this.trenQueSeMete) return false;
    if (this.trenPedido && !sePuedeMeter(this.pesoEnLasRuedas)) {
      this.actions.trenTrabado?.();
      return false;
    }
    this.trenPedido = !this.trenPedido;
    return true;
  }

  /**
   * Si el avión está apoyado en el suelo: el interruptor de tierra/aire.
   *
   * Lo pone el juego en cada fotograma con lo que dice el modelo de vuelo; el
   * mando no sabe de física y no debe saber. Ver `alternarTren`.
   */
  pesoEnLasRuedas = false;

  /** Si se ha pedido el tren fuera. Empieza fuera, como está en su puesto. */
  private trenPedido = true;
  /** Y si este avión lo mete siquiera. Lo pone el juego al cambiar de avión. */
  private trenQueSeMete = false;

  /**
   * Qué avión se vuela hoy, para los mandos que no todos llevan.
   *
   * El del tren es el primero: en un entrenador de escuela la palanca no
   * existe, y fingir que sí —que el mando se pulse y no pase nada— sería
   * enseñar un avión que no es. Ver `trenRetractil` en `aircraft.ts`.
   *
   * Y el de los flaps, por lo mismo: el fumigador no los lleva, y ahí la
   * palanca se queda arriba diga lo que diga la tecla. Ver `llevaFlaps`.
   */
  ponerAeronave(
    trenRetractil: boolean,
    tardanLosFlaps: number = TARDAN_LOS_FLAPS,
    llevaFlaps = true,
    /** Y si lleva aerofrenos. Ver `aerofrenos` en la ficha. */
    llevaAerofrenos = false,
  ): void {
    this.aerofrenosQueHay = llevaAerofrenos;
    this.recogerAerofrenos();
    this.tardanLosFlaps = tardanLosFlaps;
    this.flapsQueSeMueven = llevaFlaps;
    if (!llevaFlaps) {
      this.flapsPedidos = 0;
      this.controls.flaps = 0;
    }
    this.trenQueSeMete = trenRetractil;
    if (!trenRetractil) this.ponerElTrenFuera();
  }

  /**
   * **Los aerofrenos: se abren o se cierran.** Devuelve si la orden se
   * aceptó; en el avión que no los lleva no hay palanca que mover.
   *
   * Como el tren, se guarda la orden y los paneles tardan un momento en
   * llegar: un par de segundos en subir del todo. Ver `update`.
   */
  alternarAerofrenos(): boolean {
    if (!this.aerofrenosQueHay) return false;
    this.aerofrenosPedidos = !this.aerofrenosPedidos;
    return true;
  }

  /** Si este avión lleva aerofrenos. Lo mira el HUD. */
  get hayAerofrenos(): boolean {
    return this.aerofrenosQueHay;
  }

  /** Si se han pedido abiertos. */
  get aerofrenosAbiertos(): boolean {
    return this.aerofrenosPedidos;
  }

  /** Cerrados y con la palanca arriba, de golpe: un vuelo nuevo o otro avión. */
  recogerAerofrenos(): void {
    this.aerofrenosPedidos = false;
    this.controls.aerofrenos = 0;
  }

  private aerofrenosPedidos = false;
  private aerofrenosQueHay = false;

  /** Si este avión tiene palanca de tren. Lo miran el HUD y la cabina. */
  get hayPalancaDeTren(): boolean {
    return this.trenQueSeMete;
  }

  /** Lo que se le ha pedido al tren, para el cuadro. */
  get trenQueSePide(): boolean {
    return this.trenPedido;
  }

  /**
   * El tren fuera y la palanca abajo, de golpe: **un vuelo nuevo**.
   *
   * Es lo único que puede teletransportar el tren, porque no es un mando: es
   * el avión en su puesto, que está con las patas fuera. Sin esto, meter el
   * tren volando y reiniciar dejaba el avión apoyado en la pista con el tren
   * dentro, la palanca arriba y las luces del cuadro apagadas — y el cerrojo
   * de tierra no lo podía impedir, porque la orden se había dado en el aire.
   */
  ponerElTrenFuera(): void {
    this.trenPedido = true;
    this.controls.tren = 1;
  }

  /**
   * Y un toque de freno desde la cabina.
   *
   * Medio segundo, que es lo que dura pisar y soltar: el mando de la cabina es
   * un botón y no un pedal, así que no se puede «mantener».
   */
  pisarElFreno(): void {
    this.touchBrakes = true;
    setTimeout(() => {
      this.touchBrakes = false;
    }, 500);
  }

  /**
   * Motor desde los botones de la pantalla: -1 baja, +1 sube, 0 suelta.
   *
   * No fija un valor: empuja en una dirección, exactamente igual que las
   * teclas. Así el botón y la tecla hacen lo mismo y no se pelean.
   */
  /**
   * Suelta todos los mandos pegajosos y pone el motor a cero.
   *
   * Se llama al reiniciar el vuelo. Antes se ponía a cero `controls.throttle`
   * y nada más, así que si la palanca táctil estaba agarrada volvía a imponer
   * su valor en el fotograma siguiente y el avión reaparecía en la pista con
   * el motor a tope y sin forma de bajarlo.
   */
  /**
   * Qué tecla enseñar cuando hay que enseñar un mando.
   *
   * **La última que usó esta persona**, y si todavía no ha usado ninguna, la
   * primera de fábrica. Cada mando tiene teclas a los dos lados del teclado
   * para que cada mano tenga la suya, y enseñar las dos a la vez sale mal:
   * puestas una al lado de otra se leen como una pareja —«esta sube y esta
   * baja»— cuando en realidad son dos maneras de hacer lo mismo. A los
   * cuatro años eso no se aclara con una «o» pequeñita.
   *
   * Así que se enseña una, y se enseña la suya. Quien vuela con la
   * izquierda ve la X; quien vuela con la derecha ve el más.
   */
  preferredKey(accion: Accion): string {
    return this.keymap.shownKey(accion);
  }

  /** Eje a partir de dos acciones: +1, 0 o -1. */
  private axis(mas: Accion, menos: Accion): number {
    return axisFromKeys(
      this.keys,
      this.keymap.keys(mas),
      this.keymap.keys(menos),
    );
  }

  /** ¿Está pulsada alguna tecla de esta acción? */
  private held(accion: Accion): boolean {
    return this.keymap.keys(accion).some((k) => this.keys.has(k));
  }

  releaseAll(): void {
    this.touchThrottle = null;
    this.buttonThrottle = 0;
    this.botonMantenido = 0;
    this.touchBrakes = false;
    this.controls.throttle = 0;
    /*
     * Y el compensador al centro, que es como se encuentra un avión al
     * subirse a él. Dejarlo puesto del vuelo anterior es empezar el siguiente
     * con el morro tirando para arriba sin que nadie haya tocado nada — el
     * mismo fallo que el gas clavado, y más difícil de ver.
     */
    this.controls.trim = 0;
    // Y la mano, que empieza un vuelo sin coger nada: ni inclinación ni
    // trayectoria del vuelo anterior. La palanca del dedo, al centro.
    this.mano.soltar();
    this.toquesPendientes = { alabeo: 0, cabeceo: 0 };
    this.palancaDelDedo = { x: 0, y: 0 };
  }

  /**
   * **Un toque es un paso, y mantenido empuja.**
   *
   * Los botones empujaban a razón del sesenta por ciento por segundo mientras
   * se apretaban, y nada más: un toque de dedo —un octavo de segundo— movía
   * siete centésimas que no se veían en la palanca ni se oían en el motor, y
   * parecía que el botón no iba. Ahora el toque mueve una décima —o hasta la
   * marca de rodaje, si cae antes— y, pasado `MANTENER`, sigue empujando como
   * antes. Ver `siguientePaso` en `flight/palanca-de-gas.ts`.
   *
   * **Y mueven la palanca de la pantalla, no la sueltan.** Antes tocar un botón
   * soltaba la palanca y seguía desde el gas que hubiera: la palanca se
   * quedaba dibujada en un sitio y el motor iba por otro. Con el dedo, los
   * botones y la palanca son el mismo mando y se ve dónde está.
   */
  setButtonThrottle(direction: number): void {
    if (direction !== 0) this.gasTocado = true;
    if (direction !== 0 && direction !== this.buttonThrottle) {
      this.botonMantenido = 0;
      this.moverPalanca(
        siguientePaso(this.palancaDeGas, direction, this.marcasDeGas),
      );
    }
    this.buttonThrottle = direction;
  }

  /**
   * Dónde está el gas pedido: la palanca de la pantalla si se ha tocado, y si
   * no, el gas que hay. Es lo que se pinta en la palanca.
   */
  get palancaDeGas(): number {
    return this.touchThrottle ?? this.controls.throttle;
  }

  /** Lleva el gas pedido a un sitio, por el camino de quien manda ahora. */
  private moverPalanca(valor: number): void {
    const v = clamp(valor, 0, 1);
    if (this.touchThrottle !== null || this.conPalanca) this.touchThrottle = v;
    else this.controls.throttle = v;
  }

  /**
   * **El gas a ralentí, palanca incluida.**
   *
   * Lo pide la llave: no se arranca con gas, y si lo hay, lo cierra ella —ver
   * `toggleEngine` en `game.ts`—. Cerraba solo el gas del modelo, y la palanca
   * de la pantalla lo volvía a abrir en el fotograma siguiente: con el dedo, un
   * gas del cuatro por ciento puesto sin querer dejaba la llave sin responder
   * nunca, que es justo el callejón que esa regla quería quitar.
   */
  cerrarGas(): void {
    this.controls.throttle = 0;
    if (this.touchThrottle !== null) this.touchThrottle = 0;
  }

  /**
   * Las marcas de la palanca de este avión: el gas que sostiene la velocidad
   * de rodaje, que cambia con el avión y con el modelo de vuelo. Lo pone el
   * juego al cambiar de una cosa o de otra.
   */
  ponerMarcasDeGas(gasDeRodaje: number): void {
    this.marcasDeGas = marcasDeGas(gasDeRodaje);
    this.palancaEl?.style.setProperty(
      "--marca-rodaje",
      this.marcasDeGas[1]!.toFixed(3),
    );
  }

  /** Las marcas de ahora, para quien las necesite medir. */
  get marcasDeLaPalanca(): readonly number[] {
    return this.marcasDeGas;
  }
  /** Solo se avisa del primer gesto una vez. */
  private gestured = false;

  constructor(target: HTMLElement, actions: InputActions) {
    this.actions = actions;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    this.bindTouch(target);
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  }

  update(dt: number): void {
    const gamepad = this.readGamepad();
    const ahora = ahoraEnSegundos();
    const teclaAlabeo = this.axis("rollRight", "rollLeft");
    const teclaCabeceo = this.axis("pitchUp", "pitchDown");
    const teclaTrim = this.axis("trimUp", "trimDown");

    /*
     * **La mano, primero.** En el aire, el teclado y el dedo no mueven los
     * mandos: le piden a la mano un ritmo o un sitio, y ella los mueve. Ver
     * `flight/mano.ts`. El compensador, con la mano puesta, mueve lo que ella
     * sostiene —la trayectoria—, que es lo que movía la rueda: el punto en el
     * que el avión vuela solo.
     */
    if (this.avion) {
      const p = this.pideALaMano;
      p.teclaAlabeo = teclaAlabeo;
      p.teclaCabeceo =
        this.signoDeCabeceo * (teclaCabeceo !== 0 ? teclaCabeceo : this.mano.llevaCabeceo ? teclaTrim : 0);
      p.toqueAlabeo = this.toquesPendientes.alabeo;
      p.toqueCabeceo = this.toquesPendientes.cabeceo;
      p.mandoAlabeo = (gamepad?.roll ?? 0) !== 0;
      p.mandoCabeceo = (gamepad?.pitch ?? 0) !== 0;
      this.mano.paso(dt, this.avion, p);
    } else if (this.mano.llevaAlabeo || this.mano.llevaCabeceo) this.mano.soltar();
    this.toquesPendientes.alabeo = 0;
    this.toquesPendientes.cabeceo = 0;
    this.cambiarDeModoLaPalanca(ahora);
    const manoAlabeo = this.mano.llevaAlabeo;
    const manoCabeceo = this.mano.llevaCabeceo;

    /*
     * La flecha, **corta mientras todavía puede ser un toque**: ver
     * `palancaEnLaDuda`. El dedo y el mando no pasan por aquí, que no dan
     * toques: dan la posición que tienen.
     */
    const teclasDeCabeceo = palancaEnLaDuda(teclaCabeceo, this.toques.enDuda(ahora));
    /*
     * Y el cabeceo, con su signo.
     *
     * Quien ha volado con un mando o con otro simulador lo tiene al revés en
     * la cabeza, y eso no se aprende: se tiene. Media hora de frustración
     * contra una casilla. Ver `ui/ajustes.ts`.
     */
    const pitchTarget =
      this.signoDeCabeceo *
      mandaQuienSeMueve(this.touchPitch + teclasDeCabeceo, gamepad?.pitch);
    const rollTarget = mandaQuienSeMueve(this.touchRoll + teclaAlabeo, gamepad?.roll);
    const rudderTarget = mandaQuienSeMueve(
      this.touchRudder + this.axis("yawRight", "yawLeft"),
      gamepad?.rudder,
    );
    /*
     * **Quién se mueve**: tecla, dedo en tierra, mando, y en el aire el dedo
     * que acaba de mover la palanca —que se queda puesta, así que quieta no
     * cuenta como moverse—. Ver `mueve`.
     */
    this.mueve.cabeceo = pitchTarget !== 0 || ahora - this.dedoMovio.cabeceo < MUEVE_UN_RATO;
    this.mueve.alabeo = rollTarget !== 0 || ahora - this.dedoMovio.alabeo < MUEVE_UN_RATO;
    this.mueve.timon = rudderTarget !== 0;
    this.pide.alabeo = clamp(rollTarget, -1, 1);
    this.pide.timon = clamp(rudderTarget, -1, 1);
    this.sostiene.alabeo = manoAlabeo;
    this.sostiene.cabeceo = manoCabeceo;
    this.controls.manoEnElAlabeo = manoAlabeo;
    this.controls.manoEnElCabeceo = manoCabeceo;

    if (manoCabeceo) {
      // La mano lleva el compensador y la profundidad: ver `flight/mano.ts`.
      this.controls.elevator = this.mano.elevator;
      // En el modelo sencillo no hay compensador que llevar: ver `compensadorVivo`.
      if (this.compensadorVivo) this.controls.trim = this.mano.trim;
    } else {
      /*
       * Y si la mano acaba de soltarlo —el automático o la nivelada lo cogen—,
       * la profundidad suya se va **de golpe**: la de la mano no es de quien
       * vuela, y el automático se suelta si ve los mandos movidos. Ver
       * `loSolto`.
       */
      if (this.manoAntes.cabeceo) this.controls.elevator = 0;
      this.controls.elevator = approach(
        this.controls.elevator,
        clamp(pitchTarget, -1, 1),
        dt,
      );

      /*
       * **Y el compensador, que no es un muelle.**
       *
       * El cabeceo vuelve al centro en cuanto se suelta la tecla —eso es un
       * mando— y por eso volar nivelado a mano obligaba a tener la tecla medio
       * pulsada para siempre. El compensador se mueve mientras se aprieta y
       * **se queda donde se suelte**, que es lo que hace la rueda de cualquier
       * cabina. Ver `ControlInputs.trim`.
       *
       * Despacio a propósito: `PASO_DE_TRIM` por segundo son unos cuatro
       * segundos de recorrido de tope a tope. Un compensador rápido es un
       * compensador con el que no se puede afinar, y afinar es para lo único
       * que sirve.
       */
      if (teclaTrim !== 0)
        this.controls.trim = clamp(
          this.controls.trim + teclaTrim * PASO_DE_TRIM * dt,
          -1,
          1,
        );
    }
    /*
     * Y la cruceta del mando, que es su interruptor de compensador: un golpe,
     * un paso; mantenida, la rueda. Con el signo del cabeceo, como la flecha:
     * quien vuela invertido lo tiene invertido todo. Con la mano puesta, cada
     * golpe es un toque de los suyos.
     */
    if (gamepad) {
      const pide = this.cruceta.paso(
        gamepad.trimArriba,
        gamepad.trimAbajo,
        dt,
        PASO_DE_TRIM,
      );
      if (pide !== 0) {
        if (manoCabeceo) {
          if (Math.abs(pide) >= PASO_MINIMO_QUE_SE_OYE) {
            this.toquesPendientes.cabeceo += this.signoDeCabeceo * Math.sign(pide);
            this.actions.pasoDelCompensador?.(this.signoDeCabeceo * Math.sign(pide));
          }
        } else this.compensar(this.signoDeCabeceo * pide, true);
      }
      this.botonesDelMando(gamepad);
    }
    if (manoAlabeo) this.controls.aileron = this.mano.aileron;
    else {
      if (this.manoAntes.alabeo) this.controls.aileron = 0;
      this.controls.aileron = approach(
        this.controls.aileron,
        clamp(rollTarget, -1, 1),
        dt,
      );
    }
    this.manoAntes.alabeo = manoAlabeo;
    this.manoAntes.cabeceo = manoCabeceo;
    this.controls.rudder = approach(
      this.controls.rudder,
      clamp(rudderTarget, -1, 1),
      dt,
    );
    this.pintarLaPalancaDeMando();

    // Tocar el motor con el teclado o con los botones **suelta la palanca
    // táctil antes de leer nada**, no después. Yendo después, la palanca
    // seguía mandando ese fotograma; y si se quedaba agarrada —por ejemplo
    // porque un botón encima de ella se llevó el `pointerdown` y no el
    // `pointerup`—, el teclado quedaba anulado del todo y el motor clavado
    // donde estuviera. Con el gas a tope eso es un avión que no se para.
    const teclado = this.axis("throttleUp", "throttleDown");
    if (releasesTouchThrottle(teclado)) this.touchThrottle = null;
    /*
     * **Y si quien vuela ha movido el gas en este fotograma**: tecla, botón,
     * dedo o la palanca del mando. Lo mira el juego para soltar los gases
     * automáticos, que es lo que pasa en un avión de verdad al empujar las
     * palancas con el automático puesto. Ver `mueveElGas`.
     */
    this.gasMovido =
      this.gasTocado || teclado !== 0 || this.buttonThrottle !== 0;
    this.gasTocado = false;

    // El botón mantenido empuja; el toque ya dio su paso al apretarse. Ver
    // `setButtonThrottle`.
    let empuje = 0;
    if (this.buttonThrottle !== 0) {
      this.botonMantenido += dt;
      if (this.botonMantenido >= MANTENER) empuje = this.buttonThrottle;
    }
    if (this.touchThrottle !== null) {
      if (empuje !== 0)
        this.touchThrottle = clamp(
          this.touchThrottle + empuje * dt * RITMO_DEL_GAS,
          0,
          1,
        );
      this.controls.throttle = this.touchThrottle;
    } else if (gamepad?.throttle !== undefined) {
      /*
       * La palanca del mando manda **cuando se mueve**. Leída sin más en cada
       * fotograma, los gases automáticos no podían mover un gas que la palanca
       * física devolvía a su sitio al instante; ahora el servo lo lleva hasta
       * que alguien la toque, que es lo que hace un simulador con palancas sin
       * motor.
       */
      if (
        this.gasDelMando === null ||
        Math.abs(gamepad.throttle - this.gasDelMando) > 0.01
      ) {
        if (this.gasDelMando !== null) this.gasMovido = true;
        this.gasDelMando = gamepad.throttle;
        this.controls.throttle = gamepad.throttle;
      }
    } else {
      const delta = clamp(teclado + empuje, -1, 1);
      this.controls.throttle = clamp(
        this.controls.throttle + delta * dt * RITMO_DEL_GAS,
        0,
        1,
      );
    }
    this.pintarPalanca();

    const braking =
      this.touchBrakes || this.held("brakes") || (gamepad?.brakes ?? false);
    /*
     * **Y la reversa.** Solo tiene efecto en tierra y en el avión que la lleva
     * —ver `tieneReversa`—, así que aquí no se filtra nada: se pasa lo que se
     * pide y el modelo de vuelo decide si eso hace algo. Quien no la tiene,
     * aprieta y no pasa nada, que es exactamente lo que le pasaría de verdad.
     */
    this.controls.reversa = this.held("reversa") || (gamepad?.reversa ?? false) ? 1 : 0;
    /*
     * **Los aerofrenos, a su paso, y cerrados si se mete gas.**
     *
     * Suben en un par de segundos, que es lo que tarda el hidráulico. Y se
     * cierran solos con el gas por encima de la mitad, como en la familia de
     * Embraer —solo se abren con las palancas por debajo de cincuenta grados—:
     * volar con gas y frenando a la vez es quemar combustible para nada, y el
     * avión no deja.
     */
    if (this.aerofrenosPedidos && this.controls.throttle > GAS_QUE_CIERRA_LOS_AEROFRENOS)
      this.aerofrenosPedidos = false;
    const aerofrenos = this.controls.aerofrenos ?? 0;
    const meta = this.aerofrenosPedidos ? 1 : 0;
    const paso = dt / TARDAN_LOS_AEROFRENOS;
    this.controls.aerofrenos =
      Math.abs(meta - aerofrenos) <= paso ? meta : aerofrenos + Math.sign(meta - aerofrenos) * paso;
    this.controls.brakes = approach(
      this.controls.brakes,
      braking ? 1 : 0,
      dt * 2,
    );
    /*
     * **Los flaps, que también se mueven solos.**
     *
     * La tecla no se lee aquí —la palanca es un conmutador y la lleva
     * `onKeyDown`; forzarla desde el bucle impedía subirla sin soltar la
     * tecla—, pero los flaps sí: van de donde están a donde está la palanca, a
     * su paso, cada fotograma. Ver `flight/flaps.ts`.
     */
    this.controls.flaps = mueveLosFlaps(
      this.controls.flaps,
      Math.min(this.flapsPedidos, this.topeDeFlaps),
      dt,
      this.tardanLosFlaps,
    );

    /*
     * **El tren sí, porque se mueve solo.**
     *
     * Los demás mandos están donde los dejás; éste tarda diez segundos en ir
     * de un sitio a otro, así que entre la orden y la posición hay un camino
     * que alguien tiene que recorrer cada fotograma. Y en el avión que no lo
     * mete se queda fuera, que es la verdad de sus patas.
     */
    this.controls.tren = this.trenQueSeMete
      ? mueveElTren({ donde: this.controls.tren, quiero: this.trenPedido }, dt)
      : 1;
  }

  /** Invertir o no el cabeceo. Ver `ui/ajustes.ts`. */
  ponerSignoDeCabeceo(signo: number): void {
    this.signoDeCabeceo = signo < 0 ? -1 : 1;
  }

  /**
   * Mover el compensador desde un toque o desde la cruceta.
   *
   * Solo si hay compensador que compense —ver `compensadorVivo`—, y avisando
   * de cada paso suelto, que es lo que se oye y se ve. La rueda mantenida no
   * avisa en cada fotograma: sonaría como una carraca, no como una rueda.
   */
  private compensar(cuanto: number, desdeLaCruceta = false): void {
    if (!this.compensadorVivo || cuanto === 0) return;
    this.controls.trim = clamp(this.controls.trim + cuanto, -1, 1);
    const esUnPaso = !desdeLaCruceta || Math.abs(cuanto) >= PASO_MINIMO_QUE_SE_OYE;
    if (esUnPaso) this.actions.pasoDelCompensador?.(Math.sign(cuanto));
  }

  // ── Teclado ───────────────────────────────────────────────────────────

  private onKeyDown = (event: KeyboardEvent): void => {
    this.noteGesture();
    /*
     * **Y si la tecla es para un mando de la pantalla, el avión no la toca.**
     *
     * Esto escucha en `window`, así que hasta hoy se quedaba con **todas** las
     * teclas, estuviera el foco donde estuviera. Con los dos tiradores del
     * esquema del ala abiertos, una flecha no movía el tirador: la paraba el
     * `preventDefault` de aquí abajo —puesto para que las flechas no hagan
     * scroll de la página— y el deslizador se quedaba clavado. Es decir, el
     * único modo de usarlo sin ratón.
     *
     * La regla es la de siempre en cualquier aplicación: quien tiene el foco
     * manda. Un deslizador, una lista o una caja de texto usan las flechas
     * para lo suyo; el avión, para volar, y volando no hay nada de eso
     * enfocado.
     */
    if (leTocaAlDeLaPantalla(event.target)) return;
    // Las flechas hacen scroll de la página si no se les para los pies.
    if (event.code.startsWith("Arrow") || event.code === "Space")
      event.preventDefault();
    if (event.repeat) return;
    this.keys.add(event.code);
    // El carácter también: ver la nota de KEYS sobre los teclados que no son
    // el americano.
    if (event.key.length === 1) {
      this.keys.add(event.key);
      // Se apunta qué carácter dio esta tecla física, porque al soltarla
      // puede dar otro: si se suelta Mayúsculas antes que el «+», el
      // `keyup` llega con «=» y el «+» se quedaría pegado para siempre —con
      // el motor subiendo solo, que es de los peores fallos posibles.
      this.chars.set(event.code, event.key);
    }

    // Las acciones puntuales salen del mapa de teclas, no de una lista de
    // códigos escrita a mano: así se pueden cambiar todas, y así la pantalla
    // de teclas dice la verdad sobre lo que hace cada una.
    const accion =
      this.keymap.actionFor(event.code) ?? this.keymap.actionFor(event.key);
    switch (accion) {
      case "camera":
        this.actions.toggleCamera();
        break;
      case "assist":
        this.actions.toggleAssist();
        break;
      case "reset":
        this.actions.resetFlight();
        break;
      case "language":
        this.actions.cycleLanguage();
        break;
      case "sound":
        this.actions.toggleSound();
        break;
      case "aircraft":
        this.actions.cycleAircraft();
        break;
      case "mission":
        this.actions.cycleMission();
        break;
      case "destino":
        this.actions.cycleDestino();
        break;
      case "qnhUp":
        this.actions.girarAltimetro(1);
        break;
      case "qnhDown":
        this.actions.girarAltimetro(-1);
        break;
      case "altUp":
        this.actions.girarVentanillaAlt?.(1);
        break;
      case "altDown":
        this.actions.girarVentanillaAlt?.(-1);
        break;
      case "credits":
        event.preventDefault();
        this.actions.toggleCredits();
        break;
      case "engine":
        this.actions.toggleEngine();
        break;
      case "keys":
        this.actions.toggleKeys();
        break;
      case "cuadro":
        this.actions.toggleCuadro();
        break;
      case "pausa":
        // Sin `preventDefault`: Escape no hace nada raro en un navegador, y
        // los paneles que se abren encima ya se lo quedan antes de llegar
        // aquí mientras están abiertos. Ver `ui/panel.ts`.
        this.actions.togglePausa();
        break;
      case "flaps":
        // La misma palanca que el botón de la cabina, y por el mismo camino:
        // dos sitios que bajaban flaps con dos cuentas distintas era la vía
        // rápida a que un día dijeran cosas distintas.
        this.alternarFlaps();
        break;
      case "tren":
        this.alternarTren();
        break;
      case "aerofrenos":
        this.alternarAerofrenos();
        break;
      /*
       * **Y las flechas de cabeceo, que ahora también tienen toque.** Se
       * apunta cuándo se apretó, y al soltar se sabe si fue palanca o un toque
       * que mueve el compensador. Ver `flight/palanca-de-teclado.ts`.
       */
      case "pitchUp":
        this.toques.apretar(event.code, 1, ahoraEnSegundos());
        break;
      case "pitchDown":
        this.toques.apretar(event.code, -1, ahoraEnSegundos());
        break;
      // Y las de alabeo, que con la mano puesta también dan su paso.
      case "rollRight":
        this.toquesDeAlabeo.apretar(event.code, 1, ahoraEnSegundos());
        break;
      case "rollLeft":
        this.toquesDeAlabeo.apretar(event.code, -1, ahoraEnSegundos());
        break;
      default:
        break;
    }
  };

  /**
   * Primer gesto del jugador.
   *
   * Los navegadores no dejan que suene nada hasta que alguien toca algo. En
   * vez de una pantalla de «activa el sonido», que es fea y que hay que leer,
   * se aprovecha el primer gesto que este juego recibe de todos modos: la
   * tecla del motor o el dedo en la palanca.
   */
  private noteGesture(): void {
    if (this.gestured) return;
    this.gestured = true;
    this.actions.firstGesture();
  }

  private onKeyUp = (event: KeyboardEvent): void => {
    /*
     * El toque se cierra al soltar: si duró poco, da un paso. Con la mano
     * puesta, el paso es de la trayectoria que sostiene —medio grado—, con
     * el mismo clic; sin ella, del compensador, como siempre.
     */
    const ahora = ahoraEnSegundos();
    const toque = this.toques.soltar(event.code, ahora);
    if (toque !== 0) {
      if (this.laManoPuede("cabeceo")) {
        this.toquesPendientes.cabeceo += this.signoDeCabeceo * Math.sign(toque);
        this.actions.pasoDelCompensador?.(this.signoDeCabeceo * Math.sign(toque));
      } else this.compensar(this.signoDeCabeceo * toque);
    }
    const toqueDeAlabeo = this.toquesDeAlabeo.soltar(event.code, ahora);
    if (toqueDeAlabeo !== 0 && this.laManoPuede("alabeo"))
      this.toquesPendientes.alabeo += Math.sign(toqueDeAlabeo);
    this.keys.delete(event.code);
    if (event.key.length === 1) this.keys.delete(event.key);
    const anotado = this.chars.get(event.code);
    if (anotado !== undefined) {
      this.keys.delete(anotado);
      this.chars.delete(event.code);
    }
  };

  /** Al perder el foco se sueltan todas las teclas: si no, se quedan pegadas. */
  private onBlur = (): void => {
    this.keys.clear();
    this.chars.clear();
    this.toques.olvidar();
    this.toquesDeAlabeo.olvidar();
  };

  // ── Mando ─────────────────────────────────────────────────────────────

  /**
   * El mando de juego o el joystick, con el reparto de su aparato. Ver
   * `flight/mandos-fisicos.ts`, que dice cuál es cuál y qué hace cada botón.
   */
  private readGamepad(): LecturaDelMando | null {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = Array.from(pads).find(
      (p): p is Gamepad => p !== null && p.connected,
    );
    if (!pad) {
      this.gasDelHotas.olvidar();
      this.mandoDeAhora = null;
      return null;
    }
    this.mandoDeAhora = leerMando(pad, this.gasDelHotas);
    return this.mandoDeAhora;
  }

  /**
   * **Los botones del mando que se pulsan**: flaps, tren y aerofrenos, al
   * apretarlos —no mientras—, que son palancas de un golpe como sus teclas.
   */
  private botonesDelMando(m: LecturaDelMando): void {
    const antes = this.botonesAntes;
    if (m.flapsArriba && !antes.flapsArriba) this.flapsUnaMuesca(-1);
    if (m.flapsAbajo && !antes.flapsAbajo) this.flapsUnaMuesca(1);
    if (m.tren && !antes.tren) this.alternarTren();
    if (m.aerofrenos && !antes.aerofrenos) this.alternarAerofrenos();
    antes.flapsArriba = m.flapsArriba;
    antes.flapsAbajo = m.flapsAbajo;
    antes.tren = m.tren;
    antes.aerofrenos = m.aerofrenos;
  }

  /** Qué mando de juego hay puesto, si hay: lo mira la pantalla de teclas. */
  get aparatoDelMando(): LecturaDelMando["aparato"] | null {
    return this.mandoDeAhora?.aparato ?? null;
  }

  // ── Táctil ────────────────────────────────────────────────────────────

  private bindTouch(target: HTMLElement): void {
    const stick = target.querySelector<HTMLElement>('[data-touch="stick"]');
    const throttle = target.querySelector<HTMLElement>(
      '[data-touch="throttle"]',
    );
    const rudder = target.querySelector<HTMLElement>('[data-touch="rudder"]');
    /*
     * El freno táctil **no vive aquí**: es el botón rojo con la mano del HUD.
     * Había dos a la vez —aquel y un botón con la palabra «Frenos» escrita a
     * pelo en castellano— y de los dos ganaba la mano, que además es un dibujo
     * y no una palabra. Se quedó uno.
     */

    window.addEventListener("pointerdown", () => this.noteGesture(), {
      passive: true,
    });

    if (stick) this.bindPalancaDeMando(stick);
    if (rudder)
      bindPad(
        rudder,
        (x) => {
          this.touchRudder = x;
        },
        { redondo: false },
      );
    if (throttle) {
      // Con memoria: la palanca se queda donde la dejas al levantar el dedo,
      // como una palanca de gases de verdad. Antes compartía el
      // comportamiento de la palanca de mando, que vuelve al centro al
      // soltarla, y eso dejaba el motor clavado al 50 % cada vez que
      // levantabas el dedo. En una tablet era imposible aterrizar.
      this.palancaEl = throttle;
      this.conPalanca =
        typeof matchMedia === "function" &&
        matchMedia("(pointer: coarse)").matches;
      throttle.style.setProperty(
        "--marca-rodaje",
        this.marcasDeGas[1]!.toFixed(3),
      );
      bindPalanca(
        throttle,
        () => this.palancaDeGas,
        (gas) => {
          this.touchThrottle = gas;
          this.gasTocado = true;
          this.pintarPalanca();
        },
        () => this.marcasDeGas,
      );
    }
  }

  // ── La palanca de mando con el dedo ───────────────────────────────────

  /** El mando de alabeo y cabeceo de la pantalla, si lo hay. */
  private mandoEl: HTMLElement | null = null;
  /** El dedo que lo lleva: uno solo, el que lo tocó primero. */
  private dedoDelMando: number | null = null;
  /** Si el gesto de ahora es de palanca que se queda —en el aire— o de volante. */
  private palancaEnElAire = false;
  /**
   * Dónde ha dejado el dedo la palanca, −1 a 1, `y` positivo **abajo** como
   * el dedo. En el aire se queda puesta al levantarlo; ver `flight/mano.ts`.
   */
  private palancaDelDedo = { x: 0, y: 0 };
  /** Dónde estaba al empezar el gesto, para separar los ejes. */
  private anclaDelGesto = { x: 0, y: 0 };
  /** Lo que hay del dedo al punto si se agarró el punto, px. */
  private agarreDelMando = { dx: 0, dy: 0 };
  private readonly dobleToque = new DobleToque();
  /** Si el gesto de ahora fue el segundo golpecito de un doble toque. */
  private gestoDoble = false;
  /** Cuándo movió el dedo cada eje de la palanca por última vez, s. */
  private readonly dedoMovio = { alabeo: -Infinity, cabeceo: -Infinity };
  /** El tamaño de dentro del mando, px, para no medirlo en cada fotograma. */
  private tamanoDelMando: { ancho: number; alto: number } | null = null;
  /** Lo último pintado, para no tocar el estilo por nada. */
  private pintadoDelMando = { dx: Number.NaN, dy: Number.NaN };

  /**
   * **La palanca de mando con el pulgar.**
   *
   * En tierra, el volante y la profundidad de siempre, con muelle: lo que da
   * el dedo, y al centro al soltarlo. En el aire, **una palanca que se queda
   * donde se deja** y que dice cuánto se inclina y cuánto se sube o se baja;
   * la mano del avión lo sostiene. Ver `flight/mano.ts` y
   * `flight/palanca-de-mando.ts`, que cuentan el porqué de cada cosa:
   *
   * - Si el dedo cae **encima del punto**, lo agarra: arrastrar lo mueve
   *   desde donde estaba, sin tirón. Si cae en otro sitio del mando, la
   *   palanca va ahí, como siempre —un niño toca donde quiere ir—.
   * - **Ejes separados**: lo que el pulgar se escapa de lado al bajar no
   *   inclina el ala.
   * - **Dos golpecitos la centran**: alas niveladas y vuelo nivelado, despacio.
   */
  private bindPalancaDeMando(element: HTMLElement): void {
    this.mandoEl = element;
    window.addEventListener("resize", () => (this.tamanoDelMando = null));

    element.addEventListener("pointerdown", (event) => {
      if (this.dedoDelMando !== null) return;
      this.dedoDelMando = event.pointerId;
      element.setPointerCapture(event.pointerId);
      this.tamanoDelMando = null;
      this.palancaEnElAire = this.mano.puedeCoger && this.avion !== null;
      const doble = this.dobleToque.bajar(ahoraEnSegundos(), event.clientX, event.clientY);
      if (!this.palancaEnElAire) {
        this.gestoDoble = false;
        this.moverElVolante(event);
        return;
      }
      if (doble) {
        // El segundo golpecito: al centro, despacio. La palanca se pinta
        // donde va la mano, que vuelve con su ritmo. Ver `ManoQueSostiene.centrar`.
        this.gestoDoble = true;
        this.mano.centrar();
        return;
      }
      this.gestoDoble = false;
      const pintado = this.palancaPintada();
      this.anclaDelGesto = { ...pintado };
      // ¿El dedo cayó encima del punto? Entonces lo agarra.
      const punto = this.puntoEnPantalla(pintado.x, pintado.y);
      const dedo = this.dedoEnElMando(event);
      const lejos = Math.hypot(dedo.dx - punto.dx, dedo.dy - punto.dy);
      this.agarreDelMando =
        lejos <= AGARRE_DEL_MANDO
          ? { dx: punto.dx - dedo.dx, dy: punto.dy - dedo.dy }
          : { dx: 0, dy: 0 };
      this.moverLaPalanca(event);
    });
    element.addEventListener("pointermove", (event) => {
      if (event.pointerId !== this.dedoDelMando) return;
      this.dobleToque.mover(event.clientX, event.clientY);
      if (this.gestoDoble) return;
      if (this.palancaEnElAire) this.moverLaPalanca(event);
      else this.moverElVolante(event);
    });
    const soltar = (event: PointerEvent): void => {
      if (event.pointerId !== this.dedoDelMando) return;
      this.dedoDelMando = null;
      this.dobleToque.subir(ahoraEnSegundos());
      // El volante, con muelle; la palanca del aire, se queda.
      if (!this.palancaEnElAire) {
        this.touchRoll = 0;
        this.touchPitch = 0;
        this.palancaDelDedo = { x: 0, y: 0 };
      }
    };
    element.addEventListener("pointerup", soltar);
    element.addEventListener("pointercancel", soltar);
  }

  /** Dónde estaba el dedo la última vez, px del mando desde su centro. */
  private ultimoDedo = { dx: 0, dy: 0 };

  /** El dedo, en píxeles del mando desde su centro. */
  private dedoEnElMando(event: PointerEvent): { dx: number; dy: number } {
    const el = this.mandoEl!;
    const rect = el.getBoundingClientRect();
    /*
     * En píxeles del mando y no de la pantalla: si algo por encima lo
     * escalara, el punto se pintaría con otra regla que la del dedo. Ver
     * `aPxDelHud` en `ui/escala.ts`, que resuelve lo mismo para el HUD.
     */
    const escala = el.offsetWidth > 0 ? rect.width / el.offsetWidth : 1;
    this.ultimoDedo = {
      dx: (event.clientX - (rect.left + rect.width / 2)) / escala,
      dy: (event.clientY - (rect.top + rect.height / 2)) / escala,
    };
    return this.ultimoDedo;
  }

  private tamano(): { ancho: number; alto: number } {
    if (!this.tamanoDelMando && this.mandoEl)
      this.tamanoDelMando = { ancho: this.mandoEl.clientWidth, alto: this.mandoEl.clientHeight };
    return this.tamanoDelMando ?? { ancho: 0, alto: 0 };
  }

  /** Dónde se pinta el punto para una palanca `x`, `y`, px del centro. */
  private puntoEnPantalla(x: number, y: number): { dx: number; dy: number } {
    const { ancho, alto } = this.tamano();
    return puntoDelMando(x, y, ancho, alto);
  }

  /** En tierra: el volante y la profundidad, lo que da el dedo. */
  private moverElVolante(event: PointerEvent): void {
    const { dx, dy } = this.dedoEnElMando(event);
    const { ancho, alto } = this.tamano();
    const d = mandoDelDedo(dx, dy, ancho, alto, true);
    this.palancaDelDedo = { x: d.x, y: d.y };
    this.touchRoll = d.x;
    this.touchPitch = -d.y;
  }

  /** En el aire: la palanca que se queda, con los ejes separados. */
  private moverLaPalanca(event: PointerEvent): void {
    const dedo = this.dedoEnElMando(event);
    const { ancho, alto } = this.tamano();
    const d = mandoDelDedo(
      dedo.dx + this.agarreDelMando.dx,
      dedo.dy + this.agarreDelMando.dy,
      ancho,
      alto,
      true,
    );
    this.ponerLaPalanca(separarEjes(this.anclaDelGesto, { x: d.x, y: d.y }));
  }

  /** La palanca del dedo va aquí, y se lo dice a la mano eje por eje. */
  private ponerLaPalanca(v: { x: number; y: number }): void {
    const ahora = ahoraEnSegundos();
    const antes = this.palancaDelDedo;
    const cambiaX = !(Math.abs(v.x - antes.x) <= 1e-3);
    const cambiaY = !(Math.abs(v.y - antes.y) <= 1e-3);
    this.palancaDelDedo = { x: v.x, y: v.y };
    if (cambiaX) this.dedoMovio.alabeo = ahora;
    if (cambiaY) this.dedoMovio.cabeceo = ahora;
    if (!cambiaX && !cambiaY) return;
    // Arriba es morro arriba, salvo con el cabeceo invertido.
    this.mano.ponerPalanca(cambiaX ? v.x : null, cambiaY ? -v.y * this.signoDeCabeceo : null);
  }

  /**
   * **Del volante a la palanca, y al revés, con el dedo puesto.**
   *
   * Al despegar con el pulgar arriba —rotando—, en cuanto la mano puede coger
   * el avión, **lo coge como va**: con la subida que dio la rotación, no con
   * la que diría el pulgar en la palanca del aire, que con la curva suave es
   * poca —media palanca son un par de grados— y el avión se habría quedado
   * casi sin subir justo después de despegar. El punto salta a lo que la mano
   * sostiene y el pulgar queda agarrándolo: de ahí en adelante, lo que mueva
   * lo mueve desde ahí. Y al tocar el suelo, vuelve a ser la profundidad.
   *
   * Y si el dedo está en la palanca y la mano no lleva un eje porque lo
   * llevaba otra —el automático, la nivelada— y ya lo ha soltado, se le da
   * lo que pide el dedo sin esperar a que se mueva.
   */
  private cambiarDeModoLaPalanca(ahora: number): void {
    if (this.dedoDelMando === null) {
      // Sin dedo y en tierra, la palanca vuelve al centro: la del aire era de
      // la mano, y la mano ya no lleva nada.
      if (!this.mano.puedeCoger) this.palancaDelDedo = { x: 0, y: 0 };
      return;
    }
    const aire = this.mano.puedeCoger && this.avion !== null;
    if (aire === this.palancaEnElAire) {
      if (aire && !this.gestoDoble) this.darleLoQueFalta();
      return;
    }
    this.palancaEnElAire = aire;
    this.agarreDelMando = { dx: 0, dy: 0 };
    if (aire) {
      this.touchRoll = 0;
      this.touchPitch = 0;
      this.gestoDoble = false;
      // Coge los dos ejes como van, sin metas: ver `ponerPalanca`.
      this.mano.ponerPalanca(null, null);
      const m = this.mano.palanca();
      const v = { x: m.x, y: -m.y * this.signoDeCabeceo };
      const punto = this.puntoEnPantalla(v.x, v.y);
      const dedo = this.ultimoDedo;
      this.agarreDelMando = { dx: punto.dx - dedo.dx, dy: punto.dy - dedo.dy };
      this.palancaDelDedo = v;
      this.anclaDelGesto = { ...v };
      this.dedoMovio.alabeo = this.dedoMovio.cabeceo = ahora - MUEVE_UN_RATO;
    } else {
      this.touchRoll = this.palancaDelDedo.x;
      this.touchPitch = -this.palancaDelDedo.y;
    }
  }

  /** Lo que pide el dedo, a los ejes que la mano todavía no lleva. */
  private darleLoQueFalta(): void {
    const sinAlabeo = !this.mano.llevaAlabeo && this.laManoPuede("alabeo");
    const sinCabeceo = !this.mano.llevaCabeceo && this.laManoPuede("cabeceo");
    if (!sinAlabeo && !sinCabeceo) return;
    const v = this.palancaDelDedo;
    this.mano.ponerPalanca(
      sinAlabeo ? v.x : null,
      sinCabeceo ? -v.y * this.signoDeCabeceo : null,
    );
  }

  /**
   * Dónde se pinta la palanca, `y` abajo como el dedo: debajo del dedo si lo
   * hay; si no, en el aire, donde dice la mano —que es donde la dejó el dedo,
   * o donde la lleva la tecla, o volviendo al centro tras el doble toque—; y
   * en tierra, en el centro.
   */
  private palancaPintada(): { x: number; y: number } {
    if (this.dedoDelMando !== null && !this.gestoDoble) return this.palancaDelDedo;
    if (!this.mano.puedeCoger) return { x: 0, y: 0 };
    const m = this.mano.palanca();
    return { x: m.x, y: -m.y * this.signoDeCabeceo };
  }

  /** Pinta el punto de la palanca de mando, si se ha movido. */
  private pintarLaPalancaDeMando(): void {
    const el = this.mandoEl;
    if (!el) return;
    const p = this.palancaPintada();
    const { dx, dy } = this.puntoEnPantalla(p.x, p.y);
    const antes = this.pintadoDelMando;
    if (Math.abs(dx - antes.dx) < 0.25 && Math.abs(dy - antes.dy) < 0.25) return;
    this.pintadoDelMando = { dx, dy };
    el.style.setProperty("--dx", `${dx.toFixed(1)}px`);
    el.style.setProperty("--dy", `${dy.toFixed(1)}px`);
  }

  /**
   * **Si quien vuela movió el gas en el último `update`.** Ver arriba.
   */
  get mueveElGas(): boolean {
    return this.gasMovido;
  }

  /**
   * **El servo de los gases automáticos**: mueve la palanca como la movería
   * el motor de las palancas de un avión de línea —el gas y, si se vuela con
   * el dedo, la palanca de la pantalla—, sin contarlo como un toque de quien
   * vuela. Ver `flight/gases-automaticos.ts`.
   */
  servoDelGas(gas: number): void {
    const v = clamp(gas, 0, 1);
    this.controls.throttle = v;
    if (this.touchThrottle !== null) this.touchThrottle = v;
    this.pintarPalanca();
  }

  /** Pinta la palanca donde está el gas pedido, si ha cambiado. */
  private pintarPalanca(): void {
    if (!this.palancaEl) return;
    const gas = this.palancaDeGas;
    if (Math.abs(gas - this.gasPintado) < 0.002) return;
    this.gasPintado = gas;
    this.palancaEl.style.setProperty("--gas", gas.toFixed(3));
  }
}

/**
 * La geometría de la palanca de gases, que tiene que decir lo mismo que la
 * hoja de estilos: el punto mide `PUNTO` y se queda a `BORDE` de cada punta.
 * Ver `.pad--throttle` en `style.css`.
 */
const PUNTO = 34;
const BORDE = 10;
/**
 * Hasta dónde del centro del punto cuenta como agarrarlo: su radio y un
 * margen de yema.
 *
 * Era el punto entero —treinta y cuatro— y era demasiado: en un iPhone la
 * marca de rodaje queda a cuarenta y un píxeles del ralentí, así que tocarla
 * desde abajo con el dedo un poco corto caía «encima del punto» y no movía
 * nada. Y al revés, lo mismo: bajar a ralentí desde el rodaje tocando cerca
 * del fondo dejaba el gas en rodaje, y al soltar el freno el avión se iba.
 * Lo midió `verificar-dedo.mjs`.
 */
const AGARRE = PUNTO / 2 + 4;

/**
 * Hasta dónde del centro del punto de la palanca de mando cuenta como
 * agarrarlo, px: su radio y un margen de yema algo más ancho que el de la de
 * gases, porque aquí el punto se mueve en dos ejes y se busca con el pulgar.
 */
const AGARRE_DEL_MANDO = PUNTO_DEL_MANDO / 2 + 6;

/**
 * Lo que sigue contando como «mueve» la palanca de mando después de que el
 * dedo la mueva, s. Quieta no cuenta: se queda puesta, y si contara, el piloto
 * automático no se podría poner con el pulgar apoyado. Ver `mueve`.
 */
const MUEVE_UN_RATO = 0.25;

/**
 * **La palanca de gases con el pulgar**: se agarra el punto o se toca el
 * sitio, y en las marcas se pega.
 *
 * Era la cuenta de la palanca de mando —el dedo en tal altura, el gas en
 * tal proporción— con el punto dibujado a un tercio de su propio tamaño del
 * centro. Lo que se ha cambiado, y por qué:
 *
 * - **Agarrar el punto no lo mueve.** Si el dedo cae encima del punto, lo que
 *   cuenta es cuánto se desliza, no dónde cayó: tocar la palanca para bajarla
 *   un poco no puede darle un tirón de un cuarto de recorrido porque la yema
 *   cayó un poco más arriba que el centro del punto.
 * - **Tocar en otro sitio de la palanca la lleva ahí**, como cualquier
 *   deslizador: tocar arriba es despegue y tocar abajo es ralentí, que es lo
 *   que entiende quien tiene cuatro años.
 * - **Las marcas tiran del dedo.** Ralentí, rodaje y despegue se cogen sin
 *   puntería; ver `alIman`. Y al pasar por una, un golpecito en la mano, que
 *   es como se nota una muesca sin mirarla.
 */
function bindPalanca(
  element: HTMLElement,
  leer: () => number,
  poner: (gas: number) => void,
  marcas: () => readonly number[],
): void {
  let pointerId: number | null = null;
  let agarre = 0;
  let ultimo = 0;

  const medidas = (): { fondo: number; recorrido: number } => {
    const caja = element.getBoundingClientRect();
    const filo = element.clientTop;
    return {
      fondo: caja.bottom - filo - BORDE - PUNTO / 2,
      recorrido: caja.height - 2 * filo - 2 * BORDE - PUNTO,
    };
  };

  const mover = (event: PointerEvent): void => {
    const { fondo, recorrido } = medidas();
    const gas = alIman(
      gasALaAltura(fondo - (event.clientY - agarre), recorrido),
      marcas(),
    );
    if (gas === ultimo) return;
    if (cruzaMarca(ultimo, gas, marcas())) notarLaMuesca();
    ultimo = gas;
    poner(gas);
  };

  element.addEventListener("pointerdown", (event) => {
    if (pointerId !== null) return;
    pointerId = event.pointerId;
    element.setPointerCapture(event.pointerId);
    const { fondo, recorrido } = medidas();
    ultimo = leer();
    const punto = fondo - ultimo * recorrido;
    agarre =
      Math.abs(event.clientY - punto) <= AGARRE ? event.clientY - punto : 0;
    mover(event);
  });
  element.addEventListener("pointermove", (event) => {
    if (event.pointerId === pointerId) mover(event);
  });
  const soltar = (event: PointerEvent): void => {
    if (event.pointerId === pointerId) pointerId = null;
  };
  element.addEventListener("pointerup", soltar);
  element.addEventListener("pointercancel", soltar);
}

/**
 * El golpecito de la muesca, donde el aparato lo da. En el iPhone no hay
 * vibración para las páginas, y ahí se queda en el imán y en lo que se ve.
 */
function notarLaMuesca(): void {
  try {
    navigator.vibrate?.(8);
  } catch {
    // Sin permiso o sin motor de vibración: la marca se ve igual.
  }
}

/**
 * Si la tecla es de un mando de la pantalla y no del avión.
 *
 * Ver la nota de `onKeyDown`. Aparte y exportada porque es una regla, no un
 * detalle: **quien tiene el foco manda**.
 */
export function leTocaAlDeLaPantalla(quien: EventTarget | null): boolean {
  return !!(quien as Element | null)?.closest?.(
    "input, select, textarea, [contenteditable='true']",
  );
}

/**
 * **Manda quien se mueve**: el teclado o el dedo, y si no, el mando de juego.
 *
 * Con un mando conectado, sus ejes mandaban siempre —`gamepad?.pitch ?? …`—,
 * y un mando quieto da cero, no «nada»: el cabeceo, el alabeo y el timón
 * dejaban de escuchar al teclado y a la pantalla. Basta un mando emparejado
 * por Bluetooth y olvidado encima de la mesa para que las flechas no hagan
 * nada. Es la misma regla que ya tiene el motor —ver
 * `releasesTouchThrottle`—: si alguien toca el teclado o la pantalla, manda.
 */
export function mandaQuienSeMueve(
  tecladoODedo: number,
  mando: number | undefined,
): number {
  return tecladoODedo !== 0 ? tecladoODedo : (mando ?? 0);
}

/**
 * ¿Sueltan el mando del motor la palanca táctil?
 *
 * Función aparte y probada porque **es la segunda vez** que la palanca
 * táctil se queda agarrada y deja el teclado sin efecto: la primera dejaba
 * el motor clavado al cincuenta por ciento, y la segunda al cien, con un
 * avión que no había forma de parar. La regla es simple y no admite matices:
 * **si alguien toca el teclado o los botones, mandan ellos.**
 *
 * **Los botones ya no la sueltan: la mueven**, que es otra forma de mandar y
 * la que se ve. La palanca atascada no puede volver por ahí —cada toque de
 * botón escribe en ella—, así que lo que queda que soltar es el teclado, que
 * lleva su propia cuenta. Ver `setButtonThrottle`.
 */
export function releasesTouchThrottle(keyboard: number): boolean {
  return keyboard !== 0;
}

/**
 * Convierte un elemento en un pad analógico: la palanca de mando o el timón.
 * Da el mando de −1 a 1 y pinta el punto **debajo del dedo**, con la cuenta
 * de `mandoDelDedo`; al levantar el dedo, los dos vuelven al centro.
 */
function bindPad(
  element: HTMLElement,
  onMove: (x: number, y: number) => void,
  options: { springLoaded?: boolean; redondo: boolean },
): void {
  const springLoaded = options.springLoaded ?? true;
  let pointerId: number | null = null;

  const pintar = (dx: number, dy: number): void => {
    element.style.setProperty("--dx", `${dx.toFixed(1)}px`);
    element.style.setProperty("--dy", `${dy.toFixed(1)}px`);
  };

  const emit = (event: PointerEvent): void => {
    const rect = element.getBoundingClientRect();
    /*
     * En píxeles del mando y no de la pantalla: si algo por encima lo
     * escalara, el punto se pintaría con otra regla que la del dedo. Ver
     * `aPxDelHud` en `ui/escala.ts`, que resuelve lo mismo para el HUD.
     */
    const escala = element.offsetWidth > 0 ? rect.width / element.offsetWidth : 1;
    const d = mandoDelDedo(
      (event.clientX - (rect.left + rect.width / 2)) / escala,
      (event.clientY - (rect.top + rect.height / 2)) / escala,
      element.clientWidth,
      element.clientHeight,
      options.redondo,
    );
    onMove(d.x, d.y);
    pintar(d.dx, d.dy);
  };

  element.addEventListener("pointerdown", (event) => {
    pointerId = event.pointerId;
    element.setPointerCapture(event.pointerId);
    emit(event);
  });
  element.addEventListener("pointermove", (event) => {
    if (event.pointerId === pointerId) emit(event);
  });
  const release = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    // Los mandos con muelle —palanca y timón— vuelven al centro al soltarlos.
    // El acelerador no: se queda donde estaba.
    if (!springLoaded) return;
    onMove(0, 0);
    pintar(0, 0);
  };
  element.addEventListener("pointerup", release);
  element.addEventListener("pointercancel", release);
}

function approach(current: number, target: number, dt: number): number {
  const rate = Math.abs(target) > Math.abs(current) ? KEY_RAMP : KEY_CENTRE;
  const delta = target - current;
  const step = rate * dt;
  return Math.abs(delta) <= step ? target : current + Math.sign(delta) * step;
}


function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

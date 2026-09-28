/**
 * El piloto automático: mantener rumbo y altura sin las manos.
 *
 * ## Por qué, y por qué ahora
 *
 * Porque los vuelos se han hecho largos. Desde que se puede ir a otro
 * aeropuerto, el salto más corto son cincuenta y cuatro kilómetros —quince
 * minutos— y los que vienen detrás son de cuarenta. Pilotar a mano una recta de
 * cuarenta minutos no enseña nada y cansa a cualquiera, y menos a quien tiene
 * cuatro años.
 *
 * Y porque **es lo que se hace de verdad**: ningún vuelo de línea se vuela a
 * mano en crucero. El piloto automático no es una ayuda del juego ni una
 * trampa; es un instrumento de la cabina, y saber qué hace —y qué **no** hace—
 * es parte de lo que hay que aprender aquí.
 *
 * ## Lo que hace, que es poco a propósito
 *
 * Dos cosas, las dos primeras que aprende cualquiera: **mantener un rumbo** y
 * **mantener una altura**. Ni navega a un punto, ni gestiona el motor, ni
 * aterriza. Un piloto automático que lo hace todo convierte el juego en un
 * vídeo; éste te quita las dos manos de la recta y te las devuelve para lo que
 * importa, que es despegar, virar y aterrizar.
 *
 * ## Cómo manda, y por qué en pisos
 *
 * No mueve el avión: mueve **los mandos**, igual que una mano. Y lo hace en
 * pisos encadenados, que es como se hace de verdad y como se explica solo:
 *
 * - Para ir a un rumbo hay que **virar a un ritmo**, y para virar a un ritmo
 *   hay que **inclinar el ala**: el error de rumbo pide un ritmo de viraje, el
 *   ritmo pide un alabeo y el alabeo que falta pide alerón.
 * - Para ir a una altura hay que **subir o bajar a un ritmo**, y para subir a
 *   un ritmo hay que **levantar el morro**: el error de altura pide un ritmo de
 *   subida, el ritmo que falta pide girar el morro, y el giro que falta pide
 *   timón de profundidad.
 *
 * ## Y los topes son los de un automático de verdad
 *
 * Un piloto automático de verdad no pone el avión de canto para corregir diez
 * grados ni sube a tres mil pies por minuto para ganar cien pies. Y sobre todo
 * **no sacude a nadie**: lleva un pasaje que va leyendo o durmiendo, y por eso
 * se limita en lo que se nota desde el asiento, que es la carga —cuánto te
 * aprieta o te despega del asiento— y lo deprisa que gira el morro. Aquí, lo
 * mismo:
 *
 * - **La carga**: pide como mucho una décima de g para cambiar de ritmo de
 *   subida, y ni en el peor momento pasa de dos décimas. El cinturón no se
 *   entera.
 * - **El morro**: gira como mucho dos grados y medio por segundo, y menos
 *   cuanto más deprisa se vuela, porque a la misma rotación un avión rápido
 *   aprieta más.
 * - **El alabeo**: entra y sale del viraje a cinco grados por segundo, y
 *   vira como mucho al ritmo estándar —tres grados por segundo, la vuelta
 *   entera en dos minutos— sin pasar de veinticinco grados de alabeo.
 *
 * Esto se escribió después de medirlo mal. La primera ley pedía el morro
 * directamente con el error de ritmo, sin mirar lo deprisa que ya giraba, y en
 * un avión pesado eso no amortigua nada: el JAZ 90, **ya nivelado** y
 * manteniendo dos mil metros, cabeceaba sin parar entre −2,2 g y 3,6 g, con el
 * morro girando a sesenta grados por segundo. Eso no es un piloto automático:
 * es un pasaje entero en el techo. Ver `piloto-automatico.test.ts`, que
 * comprueba los topes en toda la flota.
 *
 * ## Y se desconecta solo
 *
 * En cuanto quien vuela toca los mandos. No hay nada más desconcertante que un
 * avión que se resiste, y en un avión de verdad pasa lo mismo: se aprieta el
 * botón o se fuerza la palanca, y el automático se va con un aviso. Aquí el
 * aviso lo da quien lo use; este módulo solo dice que se ha soltado.
 */

import { GRAVITY } from "./atmosphere";

/** Hasta cuánto alabeo pide para virar, en radianes. Veinticinco grados. */
export const ALABEO_MAXIMO = (25 * Math.PI) / 180;

/**
 * El ritmo de viraje más rápido que pide, rad/s: tres grados por segundo.
 *
 * Es el **viraje estándar** —la vuelta entera en dos minutos—, el de las
 * cartas de procedimientos, el que marca la raya del coordinador de viraje de
 * cualquier avioneta y el que usa un automático para cambiar de rumbo. En una
 * avioneta sale con unos quince grados de alabeo; en un reactor rápido pediría
 * más de veinticinco, y ahí manda `ALABEO_MAXIMO`.
 */
export const VIRAJE_MAXIMO = (3 * Math.PI) / 180;

/**
 * Lo deprisa que se acerca al rumbo pedido, s.
 *
 * El ritmo de viraje pedido es el error de rumbo entre esto: a treinta grados
 * del rumbo vira al ritmo estándar, y a tres, a una décima. Así llega
 * frenando, sin pasarse, y a la misma manera en la avioneta y en el reactor.
 * La ley de antes pedía el alabeo en proporción al error, y un reactor a ciento
 * cuarenta metros por segundo con cinco grados de alabeo casi no vira: se
 * quedaba a seis grados del rumbo después de dos minutos.
 */
const PARA_EL_RUMBO = 10;

/**
 * Cuánto alabeo gana o pierde por segundo, rad/s: cinco grados.
 *
 * Entrar en el viraje de golpe es lo primero que nota el pasaje. Cinco grados
 * por segundo ponen el ala a veinticinco en cinco segundos, que se ve pero no
 * se siente.
 */
export const ALABEO_POR_SEGUNDO = (5 * Math.PI) / 180;

/** Y a cuánto sube o baja como mucho, en metros por segundo. */
export const RITMO_MAXIMO = 7.5;

/**
 * Lo deprisa que se acerca a la altura pedida, s.
 *
 * El ritmo de subida pedido es la diferencia de altura entre esto: a setenta y
 * cinco metros de la altura, el tope; a diez, un metro por segundo. Es la
 * captura de altitud de cualquier automático: llega frenando.
 */
const PARA_LA_ALTURA = 10;

/**
 * Y cuánto morro pide como mucho, en radianes. Doce grados.
 *
 * Es el tope del morro que se persigue, y hace el mismo trabajo que
 * `ALABEO_MAXIMO` en el rumbo: sin él, una diferencia de altura grande pide un
 * morro imposible y el avión entra en pérdida corrigiendo.
 */
export const CABECEO_MAXIMO = (12 * Math.PI) / 180;

/**
 * La carga con la que cambia de ritmo de subida, en g: una décima.
 *
 * Es lo que se nota desde el asiento al empezar a subir o al nivelar, y es lo
 * que un automático de línea se permite para no despertar a nadie: el ritmo
 * pedido no cambia más deprisa que esto por la gravedad. Pasar de siete metros
 * y medio por segundo subiendo a nivelado lleva así ocho segundos, y es
 * justo lo que se ve hacer a uno de verdad al llegar a su altura.
 */
export const CARGA_QUE_PIDE = 0.1;

/**
 * La carga que no se pasa **nunca**, en g: dos décimas.
 *
 * Es el tope del giro del morro: girar el morro a `q` radianes por segundo
 * volando a `V` aprieta `q·V/g` ges, así que el giro se acota a
 * `CARGA_TOPE·g/V`. Dos décimas por encima de lo que pide, y una por debajo de
 * las tres que no pasa un automático: el hueco es para lo que tarda el avión
 * en obedecer.
 */
export const CARGA_TOPE = 0.2;

/**
 * Lo más deprisa que gira el morro, rad/s: dos grados y medio por segundo.
 *
 * En un avión lento es este el que manda; en uno rápido, `CARGA_TOPE`, que a
 * doscientos metros por segundo lo deja en poco más de medio grado.
 */
export const GIRO_MAXIMO = (2.5 * Math.PI) / 180;

/**
 * Cuánto giro de morro pide cada radián de trayectoria que falta, 1/s.
 *
 * Un cuarto. La trayectoria va por detrás del morro —un avión tarda en
 * cambiar de camino cuando cambia de actitud, de medio segundo la avioneta a
 * dos el reactor en altura—, y con más ganancia el morro llegaría antes que el
 * camino y se pasaría.
 */
const POR_TRAYECTORIA = 0.25;

/**
 * Cuánto se deja apartar el morro que se persigue del que hay, rad.
 *
 * Cuatro grados. Si el avión no puede seguir lo que se le pide —porque le
 * falta velocidad, porque va con todo el timón—, el morro pedido no se va
 * lejos a esperarlo: se queda cerca, y en cuanto puede, lo alcanza sin tirón.
 */
const HOLGURA_DEL_MORRO = (4 * Math.PI) / 180;

/**
 * Cuánto giro de morro pide cada radián que falte de morro, 1/s.
 *
 * Es lo que corrige lo que el giro no alcanza: un bache, un avión que tarda.
 */
const POR_MORRO = 0.8;

/**
 * El timón que mueve cada radián por segundo de giro que falta, **por
 * segundo**: el servo.
 *
 * Un automático de verdad no pone el timón: lo mueve, con un motor que va a su
 * ritmo. Aquí es lo mismo: el timón **se acumula** con lo que falta de giro, y
 * así encuentra solo el que sostiene el avión —el compensado— sin saber de qué
 * avión se trata. Es la pieza que faltaba: la ley de antes ponía el timón
 * proporcional al morro que faltaba y nada más, de modo que para sostener el
 * avión tenía que faltarle morro siempre.
 */
const SERVO = 1.2;

/**
 * El timón que se añade de golpe por cada radián por segundo de giro que
 * falta: el amortiguador.
 *
 * Es lo que **no** tenía la ley de antes. Mirar lo deprisa que gira ya el
 * morro y frenarlo antes de llegar es lo que separa un automático de un
 * columpio.
 */
const AMORTIGUA = 0.4;

/**
 * Cuánto hay que mover un mando para que cuente como que lo tocaste.
 *
 * Una décima. Por debajo de eso es el centrado del teclado o el temblor de un
 * dedo apoyado, y desconectar el piloto automático por eso sería peor que no
 * tenerlo.
 */
export const TOQUE = 0.1;

/**
 * Cuánto **por segundo** se mueve la palanca por cada metro por segundo que
 * falte de velocidad.
 *
 * Cinco centésimas: diez nudos de error mueven la palanca un cuarto por
 * segundo, o sea que la recorre entera en cuatro. Es lo que tarda una mano, y
 * es lo que separa una corrección de un tirón.
 */
export const POR_NUDO = 0.05;

export interface Estado {
  /** Rumbo verdadero, en radianes. */
  readonly heading: number;
  /** Ángulo de alabeo, en radianes. Positivo a la derecha. */
  readonly alabeo: number;
  /** Ángulo de cabeceo, en radianes. Positivo con el morro arriba. */
  readonly cabeceo: number;
  /** Altitud sobre el nivel del mar, en metros. */
  readonly altitud: number;
  /** Velocidad vertical, en metros por segundo. */
  readonly vertical: number;
  /** Velocidad indicada de ahora, m/s. Para el canal de gas. */
  readonly velocidad: number;
  /** Y cuánto gas lleva puesto, de 0 a 1: se corrige sobre lo que hay. */
  readonly gas: number;
  /**
   * La velocidad verdadera, m/s: la del avión respecto al aire.
   *
   * Hace falta para dos cuentas que son de verdadera y no de indicada: el
   * ángulo de la trayectoria —subir cinco metros por segundo es mucho ángulo a
   * cincuenta y poco a doscientos— y la carga de girar el morro.
   */
  readonly verdadera: number;
  /**
   * Lo deprisa que gira el morro en ejes del avión, rad/s: lo que mide el
   * giróscopo de cabeceo. Es lo que se amortigua. Ver `AMORTIGUA`.
   */
  readonly ritmoDeCabeceo: number;
  /**
   * El timón que sostiene el avión al engancharse, en unidades de mando. Ver
   * `timonAhora` en `model.ts`. Solo se mira al coger el avión; sin él, cero.
   */
  readonly timon?: number;
}

/** A dónde se le manda ir. `null` en uno de los dos es no mandarle nada. */
export interface Objetivos {
  /** Rumbo verdadero pedido, en radianes, o `null`. */
  readonly rumbo: number | null;
  /** Altitud pedida, en metros, o `null`. */
  readonly altitud: number | null;
  /**
   * La velocidad indicada que hay que sostener, m/s, o `null`.
   *
   * **Sin esto el canal de altura no puede funcionar, y no es una opinión:
   * es aritmética.** Un reactor de línea con el gas a tope tiene empuje de
   * sobra para subir a siete metros por segundo; mandarle mantener la altura
   * con el morro y dejarle el gas donde estaba es pedirle que se coma toda esa
   * energía picando, y eso acaba en sobrevelocidad. Luego el aviso, luego la
   * corrección, y vuelta a empezar.
   *
   * Contado jugando, y con razón: «me sube a la estratosfera y ahora me baja,
   * hice un bucle y todo», «sube mucho, baja en barrena, *too fast*, vuelve a
   * subir mucho…». Eso no era el fugoide del avión: era **este** piloto
   * automático alimentándolo, porque le faltaba la mitad.
   *
   * Un piloto automático de verdad lleva las dos manos: una en el morro y otra
   * en las palancas. La altura la sostiene el morro y la velocidad, el gas.
   */
  readonly velocidad: number | null;
  /**
   * A qué ritmo se mueve la altitud pedida, m/s, si se mueve.
   *
   * Lo pone el plan al bajar por su senda: la altitud pedida baja sin parar, y
   * un automático que solo ve la altitud va siempre por detrás de ella. Con el
   * ritmo, lo pide de entrada y el error de altura solo tiene que corregir lo
   * que quede. Ver `Seguimiento.ritmoParaElAutomatico`.
   */
  readonly ritmo?: number;
}

/** Lo que el piloto automático pide a los mandos. */
export interface Mandos {
  readonly aileron: number;
  readonly elevator: number;
  /**
   * El gas que pide, de 0 a 1, o `null` si no gobierna la velocidad.
   *
   * `null` y no cero: cero **es** una orden —quitar motor— y dejar el eje en
   * manos de quien vuela es otra cosa. Es la misma distinción que ya tenían
   * los otros dos ejes con sus objetivos en nulo.
   */
  readonly throttle: number | null;
}

/**
 * **Lo que el automático recuerda de un fotograma al siguiente.**
 *
 * La ley de antes no recordaba nada y por eso no podía tener topes de ritmo:
 * para no cambiar algo más deprisa de un tanto por segundo hay que saber
 * dónde estaba. Se crea al engancharlo —`memoriaNueva`— y lo primero que hace
 * es **coger el avión como está**: el ritmo de subida, el morro, el alabeo y
 * el timón de ese instante. Así no da ningún tirón al engancharse.
 */
export interface Memoria {
  /** Si ya cogió el avión. */
  cogido: boolean;
  /** El ritmo de subida que va pidiendo, m/s. Ver `CARGA_QUE_PIDE`. */
  ritmo: number;
  /** El morro que persigue, rad. */
  morro: number;
  /** El timón que lleva el servo, en unidades de mando. Ver `SERVO`. */
  timon: number;
  /** El alabeo que va pidiendo, rad. Ver `ALABEO_POR_SEGUNDO`. */
  alabeo: number;
}

/** La memoria de un automático recién enganchado: aún no ha cogido nada. */
export function memoriaNueva(): Memoria {
  return { cogido: false, ritmo: 0, morro: 0, timon: 0, alabeo: 0 };
}

/**
 * La diferencia entre dos rumbos, en radianes, por el lado corto.
 *
 * Es la cuenta que se escribe mal sola: de 350° a 10° hay veinte grados a la
 * derecha y no trescientos cuarenta a la izquierda, y un piloto automático que
 * se equivoque aquí da la vuelta entera para corregir diez grados.
 */
export function porElLadoCorto(desde: number, hasta: number): number {
  let d = (hasta - desde) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

const acotar = (v: number, tope: number): number =>
  Math.max(-tope, Math.min(tope, v));

/**
 * Lo que el piloto automático pide a los mandos en este fotograma.
 *
 * Devuelve cero en el mando que no esté gobernando, para que quien llame pueda
 * dejar ese eje en manos de quien vuela: con el rumbo puesto y la altura no, el
 * avión mantiene el rumbo y sube y baja a gusto de uno.
 *
 * Sin `memoria` es un automático que se engancha en este mismo fotograma: vale
 * para ver hacia dónde tira, no para volar. Para volar, la misma memoria en
 * cada fotograma, y una nueva cada vez que se engancha.
 */
export function mandosPara(
  e: Estado,
  o: Objetivos,
  /**
   * Cuánto ha pasado desde el fotograma anterior, s.
   *
   * Todo lo que tiene tope de ritmo lo necesita, y el gas también: corrige
   * sobre el gas que ya hay, o sea que integra. Un integrador sin reloj va a
   * la velocidad del ordenador: medido a sesenta por segundo, la palanca
   * saltaba de 0,01 a 1,00 y de vuelta.
   */
  dt = 1 / 60,
  m: Memoria = memoriaNueva(),
): Mandos {
  if (!m.cogido) {
    m.cogido = true;
    m.ritmo = e.vertical;
    m.morro = e.cabeceo;
    m.timon = acotar(e.timon ?? 0, 1);
    m.alabeo = e.alabeo;
  }
  const v = Math.max(e.verdadera, 1);
  let aileron = 0;
  let elevator = 0;
  let throttle: number | null = null;

  if (o.rumbo !== null) {
    /*
     * El error de rumbo pide un ritmo de viraje, y el ritmo, el alabeo que lo
     * da en un viraje coordinado: `tan φ = ω·V/g`. Es la cuenta que hace que
     * la avioneta y el reactor viren igual de deprisa con alabeos distintos.
     */
    const error = porElLadoCorto(e.heading, o.rumbo);
    const viraje = acotar(error / PARA_EL_RUMBO, VIRAJE_MAXIMO);
    const quiere = acotar(Math.atan((viraje * v) / GRAVITY), ALABEO_MAXIMO);
    m.alabeo += acotar(quiere - m.alabeo, ALABEO_POR_SEGUNDO * dt);
    aileron = acotar((m.alabeo - e.alabeo) * 2.2, 1);
  } else {
    m.alabeo = e.alabeo;
  }

  if (o.altitud !== null) {
    /*
     * **El piso de fuera: la altura pide un ritmo**, y el ritmo pedido no
     * cambia más deprisa que una décima de g. Ver `CARGA_QUE_PIDE`.
     *
     * Si la altura pedida se mueve —bajando por el plan—, su ritmo va de
     * entrada, y el error solo corrige lo que falte. Ver `Objetivos.ritmo`.
     */
    const error = o.altitud - e.altitud;
    const seMueve = o.ritmo ?? 0;
    const quiere = seMueve + acotar(error / PARA_LA_ALTURA, RITMO_MAXIMO);
    m.ritmo += acotar(quiere - m.ritmo, CARGA_QUE_PIDE * GRAVITY * dt);
    /*
     * **El del medio: el ritmo que falta pide girar el morro.** En ángulo de
     * trayectoria, que es lo que el morro cambia, y con el giro acotado por lo
     * que aprieta: `q ≤ CARGA_TOPE·g/V`. Ver `CARGA_TOPE` y `GIRO_MAXIMO`.
     */
    const trayectoriaPedida = Math.asin(acotar(m.ritmo / v, 0.5));
    const trayectoria = Math.asin(acotar(e.vertical / v, 1));
    const tope = Math.min(GIRO_MAXIMO, (CARGA_TOPE * GRAVITY) / v);
    const giro = acotar(POR_TRAYECTORIA * (trayectoriaPedida - trayectoria), tope);
    m.morro = Math.max(
      e.cabeceo - HOLGURA_DEL_MORRO,
      Math.min(
        e.cabeceo + HOLGURA_DEL_MORRO,
        acotar(m.morro + giro * dt, CABECEO_MAXIMO),
      ),
    );
    /*
     * **Y el de dentro: el giro que falta mueve el timón**, con servo y con
     * amortiguador. Ver `SERVO` y `AMORTIGUA`.
     *
     * El giro que se pide va en ejes del avión, y en un viraje eso no es lo
     * mismo que el del horizonte: para virar nivelado el morro gira sobre el
     * ala a `(g/V)·tan φ·sen φ` sin que el cabeceo cambie nada. Si no se
     * contara, el automático frenaría ese giro en cada viraje y saldría de él
     * con el morro caído.
     */
    const phi = acotar(e.alabeo, Math.PI / 3);
    const delViraje =
      (GRAVITY / v) * Math.tan(phi) * Math.sin(phi) * Math.cos(e.cabeceo);
    const pedido =
      giro / Math.cos(phi) + delViraje + POR_MORRO * (m.morro - e.cabeceo);
    const falta = pedido - e.ritmoDeCabeceo;
    m.timon = acotar(m.timon + SERVO * falta * dt, 1);
    elevator = acotar(m.timon + AMORTIGUA * falta, 1);
  } else {
    m.ritmo = e.vertical;
    m.morro = e.cabeceo;
  }

  if (o.velocidad !== null) {
    /*
     * **Y la otra mano, la del gas.**
     *
     * Una ley proporcional sobre el gas que ya se llevaba, no sobre cero: el
     * automático coge el avión como está y lo corrige, que es lo que hace que
     * no dé un tirón al engancharse — el mismo criterio que el resto de este
     * módulo.
     *
     * `POR_NUDO` es suave a propósito. El gas de un reactor mueve mucha
     * energía y tarda segundos en dar lo que se le pide; una ganancia viva
     * aquí es exactamente lo que convierte una corrección en un vaivén, que es
     * de lo que se venía.
     */
    const falta = o.velocidad - e.velocidad;
    throttle = Math.max(0, Math.min(1, e.gas + falta * POR_NUDO * dt));
  }

  return { aileron, elevator, throttle };
}

/**
 * Si el piloto automático se puede conectar ahora.
 *
 * **En tierra, no.** Es lo que tiene cualquier piloto automático de verdad: un
 * enclavamiento con el interruptor de peso en las ruedas, y el botón apretado
 * en la plataforma no engancha nada. Aquí sí enganchaba: cogía el rumbo y la
 * altura de la plataforma, y al fotograma siguiente la regla de «en tierra se
 * suelta» lo soltaba **cantando la desconexión**. Contado jugando, rodando en
 * Pettirossi con el reactor de cuatro motores: «alarma de piloto automático
 * desconectado. Pues claro, estoy en tierra».
 *
 * Y la alarma de desconexión es la que hay que proteger, no la que hay que
 * callar: en una cabina de verdad suena solo cuando un piloto automático **que
 * estaba conectado** se suelta, a mano o por sí mismo. Si sonara también por
 * apretar el botón en tierra, dejaría de querer decir «te acabás de quedar a
 * los mandos», que es lo único que dice.
 */
export function sePuedeConectar(estado: { readonly enTierra: boolean }): boolean {
  return !estado.enTierra;
}

/**
 * Si quien vuela ha tocado los mandos lo bastante como para soltar el piloto.
 *
 * Se mira **el mando que el automático gobierna**, y no todos: con solo el
 * rumbo puesto, tirar de la palanca para subir no tiene por qué desconectar
 * nada — el avión no estaba llevando la altura.
 */
export function loSolto(
  o: Objetivos,
  mandos: { readonly aileron: number; readonly elevator: number },
): boolean {
  if (o.rumbo !== null && Math.abs(mandos.aileron) > TOQUE) return true;
  if (o.altitud !== null && Math.abs(mandos.elevator) > TOQUE) return true;
  return false;
}

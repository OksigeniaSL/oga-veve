/**
 * **La palanca en el teclado: un toque se queda, apretar es palanca.**
 *
 * Contado dos veces, y la segunda con otras palabras: «con las teclas del
 * laptop o subo o bajo, y si lo dejo quieto con la propia velocidad sube o
 * tiende a subir; estaría bien que funcionara como un joystick de vuelo, que
 * si lo pongo a bajar lo deje fijo hasta que toque otra tecla, por pequeños
 * tramos».
 *
 * La primera vez se contestó con el compensador —ver `ControlInputs.trim`—, y
 * era la respuesta buena puesta en el sitio malo: en Re Pág y Av Pág, que en
 * un portátil van con la tecla Fn o no están, y en el ocho y el dos del
 * teclado numérico, que un portátil no tiene. Nadie los encontró. **Una queja
 * que vuelve dice que el arreglo fue en otro sitio**, y el sitio es la tecla
 * que ya se está usando: la flecha.
 *
 * ## Qué hace ahora la flecha
 *
 * - **Un toque corto** mueve el compensador un paso y **se queda**: el morro
 *   queda un poquito más arriba o más abajo hasta que se toque otra vez. Es
 *   el «pequeño tramo que se queda fijo» que se pedía.
 * - **Apretada**, es la palanca de siempre: se mueve mientras se aprieta y
 *   vuelve al centro al soltar. Rotar, recoger la toma o virar fuerte siguen
 *   siendo gestos de palanca.
 *
 * ## Por qué es real y no un apaño
 *
 * Es exactamente lo que hace un piloto de verdad con el pulgar. En el cuerno
 * de cualquier avión con compensador eléctrico hay un interruptor de dos
 * posiciones —el *trim switch*— que se toca a golpecitos: cada golpe, un poco
 * de compensador, y la mano sigue en el mando. La palanca se mueve para
 * maniobrar y **el compensador guarda la posición**, que es la única forma
 * honesta de que un mando «se quede puesto»: una palanca sin muelle no existe
 * en ningún avión, y enseñarla sería enseñar algo que habría que desaprender.
 *
 * El mando de juego lo tiene en la cruceta, que es donde un simulador lleva
 * el interruptor del cuerno: arriba y abajo, a golpecitos o mantenida.
 *
 * ## Y en el aire, la mano
 *
 * Desde la tanda de los mandos, **en el aire la flecha ya no es la palanca a
 * fondo**: le pide a una mano un ritmo de alabeo o de cabeceo, con rampa al
 * apretar y al soltar, y lo conseguido se queda —el morro y la inclinación
 * donde se dejan—. El toque corto sigue siendo un tramo pequeño que se queda,
 * medio grado de trayectoria, y la mano lo sostiene con el compensador. Ver
 * `flight/mano.ts`. Lo de aquí abajo sigue mandando **en tierra**: rotar y
 * rodar son gestos de palanca, y ahí el toque mueve el compensador.
 *
 * ## La duda del principio
 *
 * Al apretar no se sabe todavía si va a ser un toque o palanca, y el timón no
 * puede esperar a saberlo sin que el mando se note tonto. Así que durante esa
 * duda la palanca se mueve **poco**, lo justo para que se note que responde, y
 * pasada la duda va a fondo como siempre. Un toque así no mete en el timón
 * nada que la ayuda del peldaño tome por un mando —ver `climbHold` en
 * `fdm.ts`—, y un gesto de palanca solo llega una décima de segundo tarde.
 */

/**
 * Lo que dura como mucho un toque, en segundos.
 *
 * Una pulsación normal de dedo, sin querer mantenerla, dura entre cinco y
 * quince centésimas. Dos décimas dejan sitio a quien pulsa despacio sin que
 * un gesto de palanca corto —una corrección de un momento— se confunda con
 * un toque.
 */
export const DURA_UN_TOQUE = 0.2;

/**
 * **Cuánto compensador mueve un toque**: dos centésimas del recorrido.
 *
 * Sale de lo que cambia en el aire. El compensador de este juego tiene la
 * autoridad del timón entero, y lo que se usa volando son unas décimas: del
 * crucero a la final con los flaps fuera, el JAZ 90 va de −0,02 a +0,3 y la
 * avioneta de −0,09 a +0,07. Un paso de dos centésimas mueve el ángulo de
 * equilibrio del ala medio grado largo, que en velocidad son cuatro o cinco
 * nudos: un tramo pequeño, que es lo que se pedía, y que con diez toques
 * cruza de un extremo al otro de lo que se usa.
 */
export const PASO_DE_UN_TOQUE = 0.02;

/**
 * Hasta dónde va la palanca mientras dura la duda.
 *
 * Por debajo de las ocho centésimas con las que la ayuda de los peldaños de
 * abajo decide que alguien lleva el mando —ver `fdm.ts`—: un toque no le quita
 * el avión a la ayuda, solo le mueve el compensador.
 */
export const RECORRIDO_EN_LA_DUDA = 0.07;

/**
 * Y lo que se tarda, mantenida la cruceta del mando, en pasar de golpecitos a
 * rueda continua.
 */
export const LA_CRUCETA_SE_MANTIENE = 0.4;

/** Una tecla de cabeceo apretada: cuál, hacia dónde y desde cuándo. */
interface Apretada {
  readonly tecla: string;
  readonly sentido: 1 | -1;
  readonly desde: number;
}

/**
 * Los toques de las teclas de cabeceo.
 *
 * Con memoria de **una** tecla: si se aprieta la otra antes de soltar la
 * primera, ya no es un toque de nada — es alguien moviendo la palanca, y no se
 * compensa. Los tiempos van en segundos y los pone quien llama, para poder
 * probarlo sin reloj.
 */
export class ToquesDeCabeceo {
  private apretada: Apretada | null = null;

  /** Se aprieta una tecla de cabeceo. `sentido` +1 es morro arriba. */
  apretar(tecla: string, sentido: 1 | -1, ahora: number): void {
    // Dos a la vez no es un toque: la segunda anula la duda de la primera.
    this.apretada =
      this.apretada && this.apretada.tecla !== tecla
        ? null
        : { tecla, sentido, desde: ahora };
  }

  /**
   * Se suelta una tecla. Devuelve **cuánto compensador pide**: un paso con su
   * signo si fue un toque, y cero si fue palanca o si no era la de la duda.
   */
  soltar(tecla: string, ahora: number): number {
    const a = this.apretada;
    if (!a || a.tecla !== tecla) return 0;
    this.apretada = null;
    return ahora - a.desde <= DURA_UN_TOQUE ? a.sentido * PASO_DE_UN_TOQUE : 0;
  }

  /** Si la tecla apretada todavía puede acabar siendo un toque. */
  enDuda(ahora: number): boolean {
    return this.apretada !== null && ahora - this.apretada.desde < DURA_UN_TOQUE;
  }

  /** Al perder el foco se sueltan todas, y ninguna ha sido un toque. */
  olvidar(): void {
    this.apretada = null;
  }
}

/**
 * La palanca del teclado durante la duda: la misma dirección, pero corta.
 *
 * Pura y aparte porque es la parte que se nota en la mano, y la que no puede
 * cambiar sin que alguien lo decida.
 */
export function palancaEnLaDuda(teclado: number, enDuda: boolean): number {
  if (!enDuda) return teclado;
  return Math.max(-RECORRIDO_EN_LA_DUDA, Math.min(RECORRIDO_EN_LA_DUDA, teclado));
}

/**
 * La cruceta del mando de juego, que hace de interruptor del compensador.
 *
 * Un golpecito, un paso, igual que el toque de la flecha. Mantenida, al rato
 * pasa a mover el compensador de continuo, como la rueda: así se puede
 * compensar mucho sin dar cuarenta golpes.
 */
export class CrucetaDelCompensador {
  private sentido: 1 | -1 | 0 = 0;
  private mantenida = 0;

  /**
   * Un fotograma con la cruceta así. Devuelve cuánto compensador pide en este
   * fotograma. `continuo` es lo que mueve por segundo la rueda mantenida.
   */
  paso(arriba: boolean, abajo: boolean, dt: number, continuo: number): number {
    const ahora: 1 | -1 | 0 = arriba === abajo ? 0 : arriba ? 1 : -1;
    if (ahora === 0) {
      this.sentido = 0;
      this.mantenida = 0;
      return 0;
    }
    if (ahora !== this.sentido) {
      this.sentido = ahora;
      this.mantenida = 0;
      return ahora * PASO_DE_UN_TOQUE;
    }
    this.mantenida += Math.max(0, dt);
    return this.mantenida > LA_CRUCETA_SE_MANTIENE
      ? ahora * continuo * Math.max(0, dt)
      : 0;
  }
}

/**
 * **Lo menos que dura una tecla en la carrera**, s: tres décimas.
 *
 * Por la pista y deprisa, el pedal —Q y E— y, en el peldaño de abajo, las
 * flechas giran con el agarre de las ruedas, que es poco: un quinto de g. Ver
 * `AGARRE_DEL_PEDAL` en `fdm.ts`. Con la rampa de la tecla, un toque de una
 * décima no pasaba de un cuarto de pedal y giraba la proa cinco centésimas de
 * grado a 130 nudos: nada. Y para que se notara había que mantenerla, y
 * entonces se iba de largo: «casi voy a por el martillo a ver si el timón se
 * enteraba de que estaba moviendo fino el avión para estabilizarlo».
 *
 * Así que en la carrera un toque **dura lo que dura un toque de pie**: tres
 * décimas aunque el dedo se levante antes. Es medio grado de proa a 130
 * nudos, algo más despacio, que es la corrección pequeña con la que se lleva
 * el eje; y mantenida, la tecla sigue girando con decisión. Es la misma regla
 * que en el aire: apretar poco no deja menos que un toque. Ver `alMinimo` en
 * `mano.ts` y `carrera-fina.test.ts`.
 */
export const PULSO_EN_LA_CARRERA = 0.3;

/**
 * A partir de qué velocidad sobre el suelo se está en la carrera, m/s: treinta
 * nudos, donde el agarre de rodar empieza a dejar paso al del pedal. Rodando,
 * la tecla es el volante de siempre y un toque gira lo que gira.
 */
export const DEPRISA_EN_TIERRA = 15;

/**
 * **Una tecla de dirección con su toque de pie**: devuelve la tecla que manda
 * en este fotograma, −1, 0 o 1. Con `alarga` —en la carrera—, la tecla que se
 * suelta antes de `PULSO_EN_LA_CARRERA` sigue apretada hasta cumplirlo.
 */
export class PulsoDeTecla {
  private signo = 0;
  private desde = 0;

  paso(tecla: number, ahora: number, alarga: boolean): number {
    const t = Math.sign(tecla);
    if (t !== 0) {
      if (t !== this.signo) {
        this.signo = t;
        this.desde = ahora;
      }
      return t;
    }
    if (this.signo !== 0 && alarga && ahora - this.desde < PULSO_EN_LA_CARRERA) return this.signo;
    this.signo = 0;
    return 0;
  }
}

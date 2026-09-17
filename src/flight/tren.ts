/**
 * El tren de aterrizaje: **el que se mete y el que no.**
 *
 * Pedido jugando: «¿por qué no guardo el tren de aterrizaje o lo saco? ¿por qué
 * no puedo ponerlo o quitarlo con los botones en los aviones donde eso se
 * hace?». Y la respuesta era que no existía: las luces verdes del cuadro
 * estaban siempre encendidas porque el tren siempre estaba fuera.
 *
 * ## Por qué merece la pena y no es un adorno
 *
 * Porque es el primer mando del juego que **cuesta algo**. Todo lo demás que se
 * toca —el gas, los flaps, el timón— hace lo que promete y ya. El tren enseña
 * la idea que hay detrás de media aviación: *una cosa que te hace falta para
 * aterrizar te estorba para volar*. Fuera, frena; dentro, no. Así que se saca
 * tarde y se mete pronto, y esa decisión es pilotar.
 *
 * Y enseña otra, que es la que hace sonreír: **no todos los aviones lo tienen**.
 * Un entrenador de escuela y un fumigador llevan las patas al aire porque
 * meterlas cuesta peso, piezas y averías, y a ciento cincuenta por hora no
 * compensa. Cambiar de avión cambia el oficio, otra vez.
 *
 * ## Y tarda
 *
 * Un tren no es un interruptor: son unos segundos de motores hidráulicos y
 * compuertas. Ese rato es justo lo que hay que aprender a dejar —«pedilo antes
 * de necesitarlo»— y por eso el cuadro tiene tres estados y no dos: dentro,
 * **moviéndose** y fuera y trabado. El de en medio es el que enseña.
 */

/**
 * Lo que tarda el tren en salir o en meterse, en segundos.
 *
 * Diez, que es lo que tarda el de un avión de línea; los de una avioneta
 * retráctil van por los seis. Se deja uno solo y largo a propósito: lo que hay
 * que aprender es que **tarda**, y con cuatro segundos eso no se nota.
 */
export const TARDA_EL_TREN = 10;

/**
 * Lo que cuesta llevarlo fuera, en coeficiente de resistencia.
 *
 * Veinte milésimas: es lo que miden las tablas para un tren de avioneta
 * retráctil, y del mismo orden que el `cd0` limpio de casi toda la flota — o
 * sea que **el tren pesa casi tanto como el avión entero**, que es exactamente
 * la sensación que hay que transmitir. En un reactor pesa relativamente menos
 * porque su avión ya es mucho más limpio, y eso también sale solo de la cuenta.
 */
export const CUESTA_EL_TREN = 0.02;

/** Dónde está el tren y qué se le ha pedido. */
export interface Tren {
  /** 0 dentro, 1 fuera y trabado. Lo de en medio es que se está moviendo. */
  readonly donde: number;
  /** Lo que se le ha pedido: `true` fuera. */
  readonly quiero: boolean;
}

/**
 * Adónde llega el tren en este paso de tiempo.
 *
 * No se le pregunta si puede: eso lo decide quien llama —ver `sePuedeMeter`—,
 * porque la regla de «con el avión en el suelo no» no es del tren, es del
 * avión que está apoyado encima.
 */
export function mueveElTren(t: Tren, dt: number): number {
  const paso = dt / TARDA_EL_TREN;
  return t.quiero ? Math.min(1, t.donde + paso) : Math.max(0, t.donde - paso);
}

/**
 * Si se puede meter el tren ahora mismo.
 *
 * **Con el peso encima, no.** En un avión de verdad hay un interruptor en la
 * pata que lo impide, y existe porque la alternativa es sentarse sobre la
 * panza en mitad de la pista. Aquí vale de lección en el mismo sentido: el
 * mando está, se pulsa, y no pasa nada — y eso enseña que hay un porqué.
 */
export function sePuedeMeter(enElSuelo: boolean): boolean {
  return !enElSuelo;
}

/**
 * Lo que **cambia** la resistencia del avión al mover el tren. Cero o negativo.
 *
 * Y el signo es lo importante. Con el tren fuera devuelve cero: las fichas de
 * este juego están medidas con el avión como vuela hoy —con las patas fuera,
 * que es como ha volado siempre— y sumarle resistencia encima cambiaría todas
 * las carreras de despegue, todas las distancias de aterrizaje y la cuenta de
 * cuánta pista hace falta. Nada de eso está mal; lo que faltaba era el
 * **premio de meterlo**.
 *
 * Así que meter el tren *quita* dos centésimas, que en una avioneta retráctil
 * es casi tanto como el avión entero limpio. La lección es la misma y llega por
 * donde tiene que llegar: por lo que hace quien juega. Metés el tren y el avión
 * corre más.
 */
export function loQueCambiaElTren(donde: number): number {
  const fuera = Math.max(0, Math.min(1, donde));
  // El `|| 0` no es cosmético: `-0.02 * 0` da **menos cero**, y menos cero se
  // arrastra por toda la suma de coeficientes hasta salir en un banco como una
  // diferencia que no existe.
  return -(CUESTA_EL_TREN * (1 - fuera)) || 0;
}

/** Los tres estados que enseña el cuadro. */
export type LuzDeTren = "fuera" | "moviendose" | "dentro";

/**
 * En qué estado está, para las luces.
 *
 * Verde solo cuando está **fuera y trabado**: una luz verde con el tren a
 * medio camino es la clase de mentira que en un avión de verdad se paga cara.
 */
export function luzDeTren(donde: number): LuzDeTren {
  if (donde >= 1) return "fuera";
  if (donde <= 0) return "dentro";
  return "moviendose";
}

/**
 * Si hace falta avisar de que se va a aterrizar sin tren.
 *
 * Bajo, bajando y con el tren que no está fuera. Es el aviso que lleva toda
 * cabina de avión retráctil desde hace setenta años, y suena por lo mismo que
 * aquí: porque **se olvida**, y a quien se le olvida no es a los novatos.
 */
export function avisaDelTren(
  donde: number,
  alturaSobreElSuelo: number,
  bajando: boolean,
): boolean {
  return donde < 1 && bajando && alturaSobreElSuelo < AVISA_DESDE;
}

/** Desde qué altura sobre el suelo se avisa, en metros. */
export const AVISA_DESDE = 250;

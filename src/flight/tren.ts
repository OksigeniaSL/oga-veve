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
 * El `K_uc` de la correlación de Mair y Birdsall, con los flaps recogidos y con
 * los flaps a tope. Ver `resistenciaDelTren`.
 *
 * Son dos porque **los flaps le quitan resistencia al tren**: bajados, frenan
 * el aire que pasa por debajo del ala, y las patas, que cuelgan justo ahí,
 * reciben menos corriente. Por eso el tren fuera cuesta casi el doble
 * despegando limpio que aterrizando con todo abajo.
 */
const K_UC_LIMPIO = 5.81e-5;
const K_UC_CON_FLAPS = 3.16e-5;

/**
 * Lo que cuesta llevar el tren fuera, en coeficiente de resistencia referido a
 * la superficie alar. **Cero o positivo, nunca negativo.**
 *
 * ## Lo que había, y por qué salía un avión sin rozamiento
 *
 * Aquí había una constante de veinte milésimas que **se restaba** al meter el
 * tren, con la idea de que las fichas estaban medidas «con las patas fuera».
 * No lo estaban: el `cd0` de los retráctiles es el del avión limpio —lo dice
 * la ficha del bimotor, y es lo que publica la polar de cualquier reactor—, así
 * que meter el tren dejaba el JAZ 90 con un `cd0` de **cero** y el JAZ 120 en
 * **−0,003**, un avión al que el aire empuja. Planeaban de más justo donde el
 * planeo es la lección (#170).
 *
 * Ahora es como es: el `cd0` de la ficha es el limpio y **el tren fuera se
 * suma**. Los de tren fijo lo llevan ya dentro de su `cd0` —son las patas con
 * las que vuelan siempre— y aquí dan cero, para no contarlas dos veces.
 *
 * ## De dónde sale el número de cada uno
 *
 * De la correlación de **Mair y Birdsall**, *Aircraft Performance* (Cambridge
 * University Press, 1992), ecuación 6.1, ajustada a los datos de tren de la
 * ESDU:
 *
 *     ΔCD0 = (W/S) · K_uc · m^−0,215      W/S en N/m², m en kg
 *
 * con `K_uc` de 5,81·10⁻⁵ con los flaps recogidos a 3,16·10⁻⁵ con los flaps a
 * tope. Con la masa y el ala de cada ficha salen, recogidos y a tope:
 *
 *     JAZ 40   0,012 → 0,006        JAZ 90    0,026 → 0,014
 *     JAZ 60   0,013 → 0,007        JAZ 120   0,020 → 0,011
 *
 * Y cuadran con la tabla de primeras estimaciones de **Roskam**, *Airplane
 * Design, Part I*, tabla 3.6: tren fuera, de 0,015 a 0,025. El reactor
 * regional sale arriba —patas largas para un ala pequeña— y los dos de hélice,
 * con sus ruedas pequeñas bajo un ala baja, por debajo, que es el lado que
 * Roskam da a los de ala baja.
 *
 * **Por qué una cuenta y no un número en cada ficha**: el tren crece con el
 * peso que tiene que aguantar y el ala con el que tiene que sostener, y de la
 * proporción entre los dos sale lo que pesa uno contra la otra. Escribir la
 * cifra a mano en seis fichas es la manera de que un día no cuadre con su masa.
 *
 * `flapsFuera` es la fracción de la deflexión máxima, de 0 a 1: la de
 * `fraccionDeLosFlaps` en `flaps.ts`, no la de la palanca.
 */
export function resistenciaDelTren(
  a: {
    readonly mass: number;
    readonly wingArea: number;
    readonly trenRetractil: boolean;
  },
  donde: number,
  flapsFuera = 0,
): number {
  if (!a.trenRetractil) return 0;
  const fuera = Math.max(0, Math.min(1, Number.isFinite(donde) ? donde : 1));
  if (fuera === 0) return 0;
  const conFlaps = Math.max(0, Math.min(1, flapsFuera || 0));
  const k = K_UC_LIMPIO + (K_UC_CON_FLAPS - K_UC_LIMPIO) * conFlaps;
  const cargaAlar = (a.mass * GRAVEDAD) / a.wingArea;
  return fuera * cargaAlar * k * Math.pow(a.mass, -0.215);
}

/** La de la atmósfera estándar; se repite para no atar este fichero a ella. */
const GRAVEDAD = 9.80665;

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
 * Si la luz roja del tren —la GEAR del panel de avisos— está encendida.
 *
 * ## Qué dice la de verdad
 *
 * Tres verdes es abajo y blocado; nada encendido es arriba y blocado; y el
 * rojo sale cuando **el tren no está donde dice la palanca**: mientras viaja
 * de un sitio a otro, o si se ha quedado a medias. En cuanto llega, se apaga.
 * Y se enciende también con la otra condición que la enciende en cualquier
 * reactor —la del manual del 737 lo dice así: tren no abajo y blocado, gases
 * atrás y cerca del suelo—, que aquí es el mismo aviso de «sacá el tren» que
 * ya dicen la voz y la tarjeta viniendo en final. Ver `avisaDelTren`.
 *
 * ## Lo que decía antes, y por qué estaba mal
 *
 * Miraba «tren dentro, por debajo de trescientos metros y más lento que vez y
 * media la de aproximación». Eso es **toda la subida inicial** de quien hace
 * lo correcto: se despega, se mete el tren y el avión trepa despacio durante
 * minutos por debajo de esa altura. Contado jugando, con el JAZ 60 subiendo
 * por mil cuatrocientos pies a ciento veinte nudos y la luz roja encendida:
 * «¿qué tiene de malo mi tren de aterrizaje?». Nada: la luz castigaba haber
 * metido el tren, que es justo lo que había que hacer. Y al revés, con el
 * tren saliendo seguía apagada la primera mitad del camino, que es cuando el
 * rojo de verdad está encendido.
 *
 * `pedido` es la palanca —ver `trenQueSePide` en `flight/input.ts`—, y en el
 * suelo nunca queda en desacuerdo con el tren por culpa de la tecla: con el
 * peso encima la palanca no se mueve. Ver `sePuedeMeter`.
 */
export function luzRojaDelTren(
  donde: number,
  pedido: boolean,
  aterrizandoSinTren = false,
): boolean {
  const llego = pedido ? donde >= 1 : donde <= 0;
  return !llego || aterrizandoSinTren;
}

/**
 * Si hace falta avisar de que se va a aterrizar sin tren.
 *
 * Bajo, bajando y con el tren que no está fuera. Es el aviso que lleva toda
 * cabina de avión retráctil desde hace setenta años, y suena por lo mismo que
 * aquí: porque **se olvida**, y a quien se le olvida no es a los novatos.
 *
 * ## Y no se avisa de lo que ya se ha hecho
 *
 * `sePide` es lo que el piloto **ya ha pedido**, que no es lo mismo que dónde
 * está el tren: tarda diez segundos en salir. Mirando solo la posición, quien
 * bajaba el tren a trescientos metros y seguía descendiendo cruzaba los
 * doscientos cincuenta con el tren a medio camino y se llevaba la bronca por
 * algo que acababa de hacer. Dicho jugando: «si ya bajé el tren en la
 * aproximación, ¿para qué me dice "sacá el tren"?».
 *
 * Un aviso que salta por lo que todavía no ha terminado de pasar no avisa de
 * nada: enseña a no hacer caso de los avisos.
 *
 * ## Y solo viniendo a aterrizar
 *
 * «Bajo y bajando» describe también **el despegue**: se mete el tren, el avión
 * pega la sacudida de quedarse limpio, baja medio metro por segundo un par de
 * segundos, y como sigue por debajo de los doscientos cincuenta el aviso
 * salta. Contado jugando: «me ha vuelto a poner el icono del tren cuando ya lo
 * había guardado».
 *
 * Un tren se saca **para aterrizar**, así que el aviso solo tiene sentido
 * viniendo en final. `enFinal` lo dice el juego, que es quien sabe dónde está
 * la pista — el mismo embudo que ya usan los mínimos y la orden de frustrar,
 * y por la misma razón escrita allí: «cerca del umbral y acercándose» no
 * distingue una aproximación de un tramo del circuito.
 */
export function avisaDelTren(
  donde: number,
  alturaSobreElSuelo: number,
  bajando: boolean,
  sePide = false,
  enFinal = true,
): boolean {
  if (sePide || !enFinal) return false;
  return donde < 1 && bajando && alturaSobreElSuelo < AVISA_DESDE;
}

/** Desde qué altura sobre el suelo se avisa, en metros. */
export const AVISA_DESDE = 250;

/**
 * Lo último que se avisó del tren, para no repetirlo.
 *
 * `pedido` es lo que estaba pedido el mando cuando se dijo —no dónde estaba el
 * tren, que tarda diez segundos en llegar.
 */
export interface LoDichoDelTren {
  readonly que: "mete" | "saca";
  readonly pedido: boolean;
}

/**
 * Si el aviso del tren se vuelve a decir, o ya está dicho.
 *
 * ## El reloj no es el motivo
 *
 * Antes esto era un tiempo de espera: dicho el aviso, treinta segundos callado
 * y vuelta a empezar. Y como subir hasta la altura de crucero lleva minutos,
 * «metélo, el tren» salía **ocho veces en una misma subida** —medido, de
 * trescientos a novecientos metros— sin que hubiera pasado nada nuevo entre
 * una vez y la siguiente. Contado jugando: «me dice que meta el tren, luego
 * que lo saque, luego que lo vuelva a meter, joder».
 *
 * Un aviso que se repite solo porque ha pasado el rato no informa de nada: la
 * segunda vez ya no dice nada que no dijera la primera, y a la tercera se
 * aprende a no escuchar los avisos — justo lo contrario de lo que están para
 * enseñar.
 *
 * ## Lo que sí lo rearma
 *
 * **Tocar el mando.** Si el tren sigue pedido igual que cuando se avisó, el
 * aviso sigue siendo el mismo y ya está dado; en cuanto se mueve —se mete, se
 * saca— la situación es otra y vuelve a tener sentido decirlo. Así el aviso
 * sale una vez por cada decisión, que es cuando sirve.
 *
 * Y no puede oscilar: el mando tiene dos posiciones y las pone quien juega, no
 * un número que tiembla. La velocidad vertical, que es lo que mira la
 * condición de meterlo, sube y baja del metro por segundo sola en cualquier
 * subida; rearmar con ella sería el mismo fallo con otro nombre.
 */
export function seVuelveADecir(
  dicho: LoDichoDelTren | null,
  que: "mete" | "saca",
  pedido: boolean,
): boolean {
  if (!dicho) return true;
  if (dicho.pedido !== pedido) return true;
  return dicho.que !== que;
}

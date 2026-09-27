/**
 * Los dos avisos que miran cómo se vuela, no dónde se está.
 *
 * La cuenta de altura dice **dónde** estás y el aviso de terreno dice qué
 * tienes debajo. Estos dos dicen otra cosa: que lo que estás haciendo con el
 * avión no da para lo que queda.
 *
 * - **Sink rate** — bajás más deprisa de lo que esa altura aguanta.
 * - **Bank angle** — estás demasiado inclinado.
 *
 * Los dos los calcula el avión desde siempre —velocidad vertical, altura sobre
 * el suelo, ángulo de alabeo— y ninguno de los dos se decía. Y son de los que
 * enseñan: no regañan, describen. «Vas bajando muy rápido para lo bajo que
 * estás» es una frase que un niño entiende a la primera y que, dicha a tiempo,
 * es la diferencia entre una toma dura y una normal.
 *
 * Van aparte de `game.ts` por lo de siempre: aquí se pueden probar sin montar
 * un navegador, y las dos cuentas que llevan son justo las que se escriben
 * mal solas.
 */

/**
 * El ritmo de bajada que empieza a ser demasiado para esta altura, m/s.
 *
 * No es un número fijo, y eso es lo que lo hace real: **cuanto más bajo, menos
 * se puede bajar**. A trescientos metros ir a diez por segundo es un descenso
 * normal; a sesenta metros es un accidente.
 *
 * La recta sale de los puntos que dispara un GPWS de verdad en su modo 1:
 *
 *     a  200 ft (61 m)    1000 ft/min   →   5,0 m/s
 *     a  500 ft (152 m)   1500 ft/min   →   7,6 m/s
 *     a 1000 ft (305 m)   2500 ft/min   →  12,7 m/s
 *
 * Que da una pendiente de 0,0316 por metro y una ordenada de 3,1. No es una
 * aproximación cómoda: es la de las cartas, pasada a unidades del modelo.
 *
 * **Y por debajo de doscientos pies no baja de mil pies por minuto.** La recta
 * seguía hacia abajo y a cincuenta pies pedía menos de setecientos: menos de
 * lo que baja un reactor por una senda de tres grados a su velocidad de
 * aproximación. Así que la final bien volada de un JAZ 90 soltaba *sink rate*
 * cerca del suelo, justo detrás de un «metéle gas». La caja de verdad no hace
 * eso: su envolvente se queda en torno a los mil pies por minuto abajo, que es
 * además el tope de una aproximación estabilizada.
 */
export const RITMO_MINIMO_QUE_SOBRA = 5.0;

export function ritmoQueSobra(alturaM: number): number {
  return Math.max(RITMO_MINIMO_QUE_SOBRA, 3.1 + 0.0316 * alturaM);
}

/**
 * Por debajo de esto no se avisa: es la recogida, m.
 *
 * Quince metros —cincuenta pies— **de radioaltímetro**: las ruedas sobre el
 * suelo. Ahí ya se está posando el avión a propósito y el aviso no avisa de
 * nada — solo tapa lo que sí importa, que en el avión que la lleva es la
 * cuenta. Un GPWS de verdad hace lo mismo por el mismo motivo, y encaja con
 * la regla de la casa: aterrizar no se dramatiza. Es también donde se calla
 * la banda de velocidad: ver `bandaDeVelocidad`.
 */
export const RECOGIDA = 15;

/**
 * Y por encima de esto tampoco: a esa altura bajar deprisa es bajar, m.
 *
 * Trescientos cinco metros, que son los mil pies del modo 1. Por encima, un
 * descenso rápido es lo normal de un crucero que baja.
 */
export const DEMASIADO_ALTO = 305;

/**
 * Cuánto alabeo es demasiado, rad.
 *
 * Cuarenta y cinco grados. Un viraje normal va a treinta; el piloto automático
 * de este juego se para en veinticinco. A cuarenta y cinco ya no es un viraje,
 * es un avión de lado — y el ala tiene que dar vez y media su peso para
 * sostenerlo, que es de donde sale la pérdida en viraje.
 *
 * Y no en treinta y cinco, que es donde lo pone alguna cabina: aquí se está
 * aprendiendo a virar, y un aviso que salta en un viraje bien hecho enseña a
 * no hacer caso de los avisos.
 */
export const ALABEO_QUE_SOBRA = (45 * Math.PI) / 180;

/** Lo que hay que decir ahora, o nada. */
export type AvisoDeActitud = "sink rate" | "bank angle" | null;

/**
 * Qué toca avisar, mirando cómo se vuela ahora mismo.
 *
 * Devuelve uno o ninguno, nunca dos: dos avisos a la vez son dos frases
 * pisándose, y quien va demasiado inclinado bajando deprisa tiene un problema
 * solo. Manda el ritmo de bajada, que es el que tiene suelo debajo.
 */
export function avisoDeActitud(
  e: {
    readonly enSuelo: boolean;
    /** Metros sobre el terreno. */
    readonly altura: number;
    /** Velocidad vertical, m/s. Negativa es bajar. */
    readonly vertical: number;
    /** Alabeo, rad. El signo da igual: inclinarse es inclinarse. */
    readonly alabeo: number;
  },
  /**
   * El aviso de antes, para que se quite por un umbral más adentro del que
   * lo puso. Ver `SE_QUITA`.
   */
  antes: AvisoDeActitud = null,
): AvisoDeActitud {
  if (e.enSuelo) return null;
  const bajando = -e.vertical;
  const sobra =
    ritmoQueSobra(e.altura) * (antes === "sink rate" ? SE_QUITA : 1);
  if (e.altura > RECOGIDA && e.altura < DEMASIADO_ALTO && bajando > sobra) {
    return "sink rate";
  }
  /*
   * El alabeo sí vale a cualquier altura: ponerse de lado a mil metros es tan
   * mal viraje como a cien. Lo que cambia es lo que hay debajo, y de eso ya
   * avisa el otro.
   */
  const inclinado = ALABEO_QUE_SOBRA * (antes === "bank angle" ? SE_QUITA : 1);
  if (Math.abs(e.alabeo) > inclinado) return "bank angle";
  return null;
}

/**
 * **Por dónde se quita un aviso que ya está puesto**, en veces su umbral.
 *
 * Un ochenta y cinco por ciento. Con el mismo umbral para ponerse y para
 * quitarse, un avión que baja rondando el borde entra y sale del aviso a cada
 * momento, y cada entrada es un canto nuevo: medido en Los Rodeos con el JAZ
 * 90 en Taguató, tres *sink rate* en cinco segundos, y el último se llevó por
 * delante el «one hundred» de la cuenta. Rearmar con un número que tiembla es
 * rearmar con un reloj con otro nombre; con dos umbrales, el aviso vuelve
 * cuando de verdad se salió y se volvió a entrar.
 */
export const SE_QUITA = 0.85;

/**
 * Si hay que avisar de pérdida: **en pérdida y en el aire**.
 *
 * El modelo marca `stalled` mirando el ángulo de ataque, y con el avión
 * aparcado y el viento entrando por la cola ese ángulo ronda los ciento
 * setenta grados: pérdida, para la cuenta. Así que en La Palma, con el motor
 * apagado en el puesto, parpadeaba «¡Pérdida! Bajá el morro», sonaba el aviso
 * y se encendía la luz del panel. Estuvo meses tapado por el cuadro de mandos,
 * y salió en cuanto el aviso se puso por delante.
 *
 * En un avión de verdad el avisador de pérdida **no suena en tierra**: lo
 * inhibe el contacto del tren, el «peso en ruedas». Es lo que se hace aquí, y
 * en un solo sitio porque eran tres —el cartel, el sonido y la luz— y solo la
 * voz lo filtraba.
 *
 * **Y mira el avisador, no la pérdida.** Miraba `stalled`, que es el ala ya
 * sin sustentar: un aviso que llega cuando ya ha pasado lo que avisa. El de
 * un avión de verdad suena **antes**, y es otra cosa con otro umbral. Ver
 * `anguloDeAviso`.
 */
export function avisaLaPerdida(e: {
  readonly stallWarning: boolean;
  readonly onGround: boolean;
}): boolean {
  return e.stallWarning && !e.onGround;
}

/**
 * Cuánto por encima de su velocidad de pérdida avisa un avión, en veces.
 *
 * Un siete por ciento. La norma pide que el aviso empiece con margen
 * suficiente para evitar la pérdida sin querer —no menos de cinco nudos o un
 * cinco por ciento por encima de ella, CS 25.207 y 14 CFR 25.207—, y los
 * vibradores de palanca de los aviones de línea se ajustan hacia un siete.
 */
export const MARGEN_DEL_AVISADOR = 1.07;

/**
 * **El ángulo de ataque al que suena el avisador de pérdida**, rad.
 *
 * Un avisador de verdad no mira la velocidad: mira el ángulo con el que el ala
 * ataca el aire —una veleta en el costado del morro— y lo compara con un
 * umbral **que depende de los flaps que se lleven**. Por eso avisa a ciento
 * ochenta nudos si se tira lo bastante, y no avisa a ciento veinte con todo
 * fuera y el ala tranquila.
 *
 * El umbral sale de la definición del margen, no de un número a ojo: el
 * aviso suena cuando el ala da la sustentación que daría volando recto a un
 * siete por ciento por encima de la pérdida, o sea `CLmax / 1,07²`. Con los
 * flaps fuera, `CLmax` crece con lo que ellos suman y el ala limpia tiene que
 * aportar menos: **el umbral baja con los flaps**, que es lo que hace el de
 * cualquier avión de línea. Medido con el JAZ 90: 12,7° limpio y 11,1° con
 * todo fuera, para una pérdida a 14,9°.
 *
 * `anguloDePerdida` es el del modelo —con la protección de pérdida del
 * peldaño ya aplicada—, porque el aviso tiene que ir por delante de la pérdida
 * que de verdad va a haber, no de otra.
 */
export function anguloDeAviso(
  anguloDePerdida: number,
  aero: { readonly cl0: number; readonly clAlpha: number },
  /** Lo que suman los flaps a la sustentación ahora mismo. */
  conLosFlaps: number,
): number {
  const clMax = aero.cl0 + aero.clAlpha * anguloDePerdida + conLosFlaps;
  const deAviso = clMax / (MARGEN_DEL_AVISADOR * MARGEN_DEL_AVISADOR);
  return (deAviso - aero.cl0 - conLosFlaps) / aero.clAlpha;
}

/**
 * Cuánto hay que bajar del umbral para que el avisador se calle, rad (~2°).
 *
 * Sin holgura, un ala que ronda el umbral lo cruzaría arriba y abajo con cada
 * racha, y cada cruce sería un «stall, stall» nuevo.
 */
export const SE_CALLA_EL_AVISADOR = 0.035;

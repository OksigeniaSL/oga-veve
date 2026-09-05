/**
 * El límite de velocidad en tierra: un avión no rueda a cien por hora.
 *
 * «La velocidad en tierra por pista de rodadura la puedo acelerar a tope.» «No
 * hay control de velocidad en pista, mil veces dicho.» «Con el avión puedo
 * adelantar al coche del sígame, le paso por encima.» Y era verdad: en el
 * suelo el gas no tenía techo, así que se podía rodar a treinta metros por
 * segundo, adelantar al coche que viene a llevarte y pasarte la salida.
 *
 * ## Por qué un tope y no solo un aviso
 *
 * Ya había un aviso —«más despacio», con su dibujo y su voz— y no bastaba,
 * porque un aviso que se puede ignorar sin consecuencia no es una regla: es
 * una opinión. Y aquí la consecuencia de rodar a cien no puede ser romper el
 * avión, que en el peldaño de los cuatro años no se rompe nada.
 *
 * Así que la consecuencia es la de verdad: **el avión no va más rápido**. Es
 * exactamente la misma clase de regla que ya tiene el modelo sencillo para no
 * dejar despegar fuera de la pista —«no es física, es la regla del juego»— y
 * se lee igual de bien desde la cabina: pisás el gas y el avión se planta.
 *
 * ## Y por qué solo abajo
 *
 * Porque es la escalera de siempre. Donde el juego conduce —Guyrami, y Tukã
 * con red— el tope existe y no hay forma de hacerlo mal. De Taguató para
 * arriba se retira, y entonces la velocidad de rodaje es cosa tuya: ahí están
 * el aviso, la raya que se pone ámbar y el señalero pidiendo despacio, que es
 * lo que hay en un aeropuerto de verdad.
 *
 * ## Lo que este tope **no** toca
 *
 * La carrera de despegue y la de aterrizaje. Ahí un avión va rápido en el
 * suelo porque tiene que ir rápido, y un tope ahí sería impedir volar. Quien
 * llama a esto decide en qué fase está; aquí solo se contesta cuánto gas cabe.
 */

/**
 * Lo más rápido que se rueda, m/s.
 *
 * Nueve, que es la misma velocidad de rodaje que usan la banda de velocidad y
 * el plan de vuelo. No es un número nuevo: es **el** número, y por eso se
 * recibe de fuera en vez de escribirlo otra vez aquí.
 */
export interface Rodaje {
  /** Velocidad actual, m/s. */
  readonly velocidad: number;
  /** La velocidad de rodaje de este sitio, m/s. */
  readonly rodaje: number;
}

/**
 * Cuánto se pasa del rodaje antes de que el tope empiece a actuar.
 *
 * Un quince por ciento. Deja sitio para seguir al coche del «sígame» —que va a
 * once— sin que el tope esté todo el rato metiendo mano, y corta mucho antes
 * de que la cosa se parezca a una carrera.
 */
const HOLGURA = 1.15;

/** Y a partir de cuánto exceso se frena del todo. */
const YA_ES_DEMASIADO = 1.6;

export interface Tope {
  /** Lo más que puede pedir el gas, de 0 a 1. */
  readonly gas: number;
  /** Y cuánto freno pone el juego por su cuenta, de 0 a 1. */
  readonly freno: number;
}

/**
 * El tope de gas y el freno que toca, rodando.
 *
 * Devuelve **límites**, no mandos: quien llama compara con lo que pide quien
 * juega y se queda con lo más restrictivo. Así el tope nunca acelera a nadie.
 *
 * No es un interruptor: el gas se va cerrando según se pasa del rodaje, y el
 * freno entra después. Un tope de golpe se siente como un fallo del juego;
 * este se siente como un avión que no da más de sí, que es lo que es.
 */
export function topeDeRodaje(s: Rodaje): Tope {
  const limite = s.rodaje * HOLGURA;
  if (s.velocidad <= limite) return { gas: 1, freno: 0 };

  const exceso =
    (s.velocidad - limite) / (s.rodaje * (YA_ES_DEMASIADO - HOLGURA));
  return {
    gas: Math.max(0, 1 - exceso * 2),
    /*
     * El freno entra **cuando cerrar el gas ya no basta**, no a la vez: el gas
     * llega a cero en la mitad de la rampa y de ahí en adelante empieza a
     * frenar. Y nunca a fondo — esto sujeta, no clava; un frenazo automático
     * tira de morro y se lee como un fallo del juego.
     */
    freno: Math.max(0, Math.min(0.6, (exceso - 0.5) * 1.2)),
  };
}

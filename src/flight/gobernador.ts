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
 * Lo que este tope **no hace** es frenar. Se probó y estaba mal: el avión se
 * paraba solo mientras la pantalla seguía pidiendo el freno. Frenar es de
 * quien juega —ver abajo—, y un juego que se para solo no enseña a parar.
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
/**
 * A partir de cuánta ayuda de rodaje se considera que el juego conduce.
 *
 * Tres décimas. Por debajo —Taguató y Taguató Ruvicha— la ayuda solo evita que
 * te salgas, y ahí la velocidad es cosa tuya. Sale de la misma escalera de
 * `tiers.ts` para no añadir otro mando que se pueda desafinar por su cuenta.
 *
 * **Estaba en medio, y medio dejaba fuera a Tukã**, que tiene 0,35. O sea que
 * el segundo peldaño no llevaba tope de velocidad en tierra mientras tres
 * sitios daban por hecho que sí: el comentario de `limitarElRodaje` («Guyrami
 * y Tukã llevan tope»), la prosa de esta misma constante —que nombra a
 * Taguató y Taguató Ruvicha como los de abajo, no a Tukã— y el banco de vuelo,
 * que comprueba el tope en los dos. Nadie lo vio porque **Tukã no se ejecuta
 * en ningún banco con veredicto**. Lo vigila ahora `tiers.test.ts`.
 */
export const CONDUCE_EL_JUEGO = 0.3;

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

export interface Tope {
  /** Lo más rápido que el juego deja ir ahora mismo, m/s. */
  readonly velocidad: number;
}

/**
 * Lo más rápido que se puede ir rodando, m/s.
 *
 * Devuelve un **límite**, no un mando: quien llama compara con lo que pide
 * quien juega y se queda con lo más restrictivo. Así el tope nunca acelera a
 * nadie, y sobre todo **nunca frena por su cuenta**.
 *
 * ## Por qué un tope de velocidad y no un tope de gas
 *
 * El primer intento devolvía cuánto gas cabía, con su rampa: el gas se iba
 * cerrando según se pasaba del rodaje y llegaba a cero a mitad de camino. En
 * el modelo del peldaño de abajo **el gas es la velocidad**, así que cerrar el
 * gas del todo no es «no aceleres más»: es «pará». Y como además entraba el
 * freno, el avión se clavaba en cero solo. «Que deje el avión a 0 y siga
 * diciendo que frene es una exageración.»
 *
 * Lo que hay que decir es lo que se quería decir desde el principio —**no vas
 * más rápido que esto**— y eso se dice en metros por segundo. Quien llama lo
 * traduce a gas con `gasPara`, que es la pregunta que cada modelo sabe
 * contestar a su manera. El avión se planta a la velocidad de rodaje en vez de
 * pararse, que es exactamente lo que hace un avión al que no le das más.
 *
 * ## Y por qué el freno se fue de aquí
 *
 * Porque frenar es la lección, y el juego no puede dar la lección por vos.
 * «Si durante todo el rato del aterrizaje el juego está moviendo y controlando
 * la velocidad de la aeronave, ahora el niño cree que se va a parar sola. Y si
 * todo se hace solo, vaya aburrimiento.»
 *
 * El tope se queda porque es una **regla del sitio** —en un aeropuerto no se
 * rueda a cien, igual que no se despega fuera de la pista— y las reglas del
 * sitio las pone el mundo. Parar el avión no es una regla del sitio: es lo que
 * tiene que aprender a hacer quien juega, con el freno, y por eso lo pide la
 * tarjeta, lo pide la voz y lo pide el señor de los bastones.
 */
export function topeDeRodaje(s: Rodaje): Tope {
  return { velocidad: s.rodaje * HOLGURA };
}

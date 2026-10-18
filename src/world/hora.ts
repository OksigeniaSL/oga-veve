/**
 * Qué hora es donde se está volando.
 *
 * Hasta ahora era siempre la misma —las cuatro de la tarde— y por eso todos
 * los vuelos tenían el mismo cielo. Contado jugando: «no aprecio el cambio de
 * clima, parece como que siempre esté igual el cielo en todas las pruebas que
 * hago».
 *
 * El tiempo **sí** estaba conectado y sí es de verdad: el METAR llega, con su
 * viento, sus nubes y su temperatura. Lo que no cambiaba era la luz, y la luz
 * es la mitad de la pantalla.
 *
 * ## Hora solar, y no husos horarios
 *
 * Lo que se calcula es la **hora solar media** del sitio: la que marca el sol,
 * no la que marca el reloj de la pared. Es una cuenta de una línea —cada quince
 * grados de longitud es una hora— y no necesita ninguna tabla de husos, que
 * cambian con la política y no con el cielo.
 *
 * Y es la buena para lo que hace falta aquí, que es **dónde está el sol**. El
 * huso horario de Canarias es UTC+0 en invierno y UTC+1 en verano, pero el sol
 * de Tenerife sale a la hora que sale porque la isla está a dieciséis grados al
 * oeste, y eso no lo cambia ningún decreto.
 *
 * Diferencia práctica: a las 08:30 UTC en Tenerife son las 08:30 de reloj y las
 * 07:25 de sol. Poco más de una hora, y del lado bueno — el cielo es el que se
 * ve por la ventana.
 *
 * ## Y no se hace de noche a traición
 *
 * Esto devuelve la hora que es, incluida la de las tres de la mañana. Que se
 * pueda jugar a esa hora es cosa de las luces, no de mentir con la hora: un
 * aeropuerto de noche está iluminado, y aprender a mirar sus luces es
 * exactamente el tipo de cosa que este juego quiere enseñar.
 */

/**
 * La hora solar media en una longitud dada, de 0 a 24.
 *
 * `ahora` es un instante cualquiera; lo que se lee de él es la hora UTC. Se
 * pasa desde fuera para que esto se pueda probar: una función que mira el reloj
 * por su cuenta no se puede comprobar dos veces seguidas.
 */
export function horaSolarEn(lonGrados: number, ahora: Date): number {
  const utc =
    ahora.getUTCHours() +
    ahora.getUTCMinutes() / 60 +
    ahora.getUTCSeconds() / 3600;
  return (((utc + lonGrados / 15) % 24) + 24) % 24;
}

/**
 * Si con el sol a `altura` grados hay que encender las luces.
 *
 * El criterio es el de verdad y tiene nombre: **el ocaso civil**, que es cuando
 * el sol está a seis grados por debajo del horizonte y deja de poder leerse un
 * papel a la intemperie. Se aproximaba por la hora —de siete a siete—, porque
 * el sol salía a las seis y se ponía a las dieciocho en todos los sitios y
 * todos los días. Desde que el sol es el de verdad (#50), en Asunción en junio
 * a las siete ya es de noche cerrada y en Tenerife todavía hay luz: la hora no
 * lo dice, la altura del sol sí.
 */
export function esDeNoche(altura: number): boolean {
  return altura < -6;
}

/**
 * Cuánta luz hay fuera, de 0 a 1, con el sol a `altura` grados, para graduar
 * lo que se enciende.
 *
 * No es un interruptor porque el anochecer no lo es: el cuadro de un avión se
 * va encendiendo según cae la tarde, y un cuadro que salta de apagado a
 * encendido de un fotograma a otro se ve falso. Va de la luz entera con el sol
 * a seis grados sobre el horizonte, cuando la tarde empieza a caer, a nada en
 * el ocaso civil, seis por debajo: media hora larga en estas latitudes, que
 * es lo que dura el crepúsculo.
 */
export function cuantaLuz(altura: number): number {
  return Math.max(0, Math.min(1, (altura + 6) / 12));
}

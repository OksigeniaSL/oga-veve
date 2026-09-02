/**
 * Qué mundo se vuela: la fotografía o el dibujado.
 *
 * **Son dos juegos distintos y los dos están bien**, que es lo que costó ver.
 * La fotografía es espectacular en el aire —sobrevolar Asunción de verdad, ver
 * el Teide al fondo— y a ras de suelo es una ortofoto borrosa. El dibujado no
 * pretende ser una foto: tiene su color, sus árboles de cuatro caras y su
 * pista limpia, y a dos metros del suelo se lee mejor que la foto.
 *
 * Durante un tiempo esto se decidía por nosotros, con un `?teselas=0` que solo
 * conocía quien había leído el código. Ahora lo elige quien juega, y se queda
 * elegido: es de las cosas que se deciden una vez.
 *
 * Y no es solo estética. El mundo dibujado **no necesita clave de Google, ni
 * cuota, ni conexión a un servicio de pago**. Si un día no hay teselas, el
 * juego no se queda sin mundo: se queda con el otro.
 */

const ALMACEN = 'oga-veve:mundo';

export type Mundo = 'foto' | 'dibujado';

/** El mundo elegido, o la fotografía si nadie ha elegido todavía. */
export function mundoElegido(): Mundo {
  try {
    return localStorage.getItem(ALMACEN) === 'dibujado' ? 'dibujado' : 'foto';
  } catch {
    // Sin almacén —ventana privada, permisos— se vuela la foto, que es el
    // que enseña el planeta. Perder la preferencia no puede impedir jugar.
    return 'foto';
  }
}

/** Guarda la elección. Se aplica al empezar la siguiente partida. */
export function elegirMundo(mundo: Mundo): void {
  try {
    localStorage.setItem(ALMACEN, mundo);
  } catch {
    // Vale para esta partida.
  }
}

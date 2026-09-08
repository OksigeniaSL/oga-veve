/**
 * Las horas voladas, contadas en avioncitos.
 *
 * «Se vuela, sale mejor o peor, y no queda nada.» Los galones dicen qué tal
 * salió **este** vuelo y se olvidan al siguiente; esto dice lo otro, que es lo
 * que hace volver mañana: **cuánto llevas**. Y hay una razón para que no sea
 * una cifra: a los cuatro años «2 h 45 min» no es nada, y una fila de
 * avioncitos que ayer tenía cinco y hoy tiene seis se entiende sola.
 *
 * Un avioncito por media hora. Media hora es lo que dura un vuelo largo de
 * los de aquí —rodar, despegar, un circuito y volver—, así que casi cada
 * sesión añade uno: lo bastante seguido para que se note y lo bastante lento
 * para que valga algo. Con la hora entera se volaría dos tardes sin ver
 * cambiar nada.
 *
 * Y el arco es la media hora en curso: enseña que **esto de ahora también
 * cuenta**, aunque todavía no complete un avioncito. Sin él, un vuelo de
 * catorce minutos deja la fila igual que estaba y parece que no ha servido.
 */

/** Lo que vale un avioncito, en segundos. */
export const MEDIA_HORA = 1800;

/**
 * Cuántos se dibujan como mucho.
 *
 * A partir de ahí la fila se lee peor que una cifra, y además no cabe. Los
 * que sobran salen como número al lado, que a esas alturas ya se lee.
 */
export const AVIONES_MAXIMOS = 12;

export interface Reloj {
  /** Cuántos avioncitos se dibujan. */
  readonly aviones: number;
  /** De esos, cuántos se acaban de ganar en este vuelo. */
  readonly nuevos: number;
  /** Y cuántos no caben en la fila. */
  readonly demas: number;
  /** Lo que va de la media hora en curso, de 0 a 1. */
  readonly fraccion: number;
}

/**
 * El reloj a partir de los segundos del cuaderno.
 *
 * `deEsteVuelo` son los segundos del vuelo que acaba de terminar, y sirve para
 * saber **cuáles de los avioncitos son nuevos**: los que aparecen encendidos.
 * Un premio que no se ve llegar no es un premio.
 */
export function relojDe(segundos: number, deEsteVuelo = 0): Reloj {
  const total = Math.max(0, Math.floor(segundos));
  const ganados = Math.floor(total / MEDIA_HORA);
  const antes = Math.floor(
    Math.max(0, total - Math.max(0, deEsteVuelo)) / MEDIA_HORA,
  );
  const aviones = Math.min(ganados, AVIONES_MAXIMOS);
  return {
    aviones,
    // Los nuevos solo se marcan si de verdad se ven: pasado el tope, la fila
    // ya no cambia y encender uno sería mentir.
    nuevos: Math.max(0, Math.min(aviones, ganados) - Math.max(antes, ganados - aviones)),
    demas: Math.max(0, ganados - AVIONES_MAXIMOS),
    fraccion: (total % MEDIA_HORA) / MEDIA_HORA,
  };
}

/** El perfil de un avioncito, visto desde arriba. Cabe en catorce píxeles. */
const AVION =
  "M7 1 L8 5.6 L13 7.4 v1.2 L8 7.8 v2.9 L9.8 12 v1 L7 12.3 L4.2 13 v-1 " +
  "L6 10.7 V7.8 L1 8.6 V7.4 L6 5.6 Z";

/** El radio del arco, y su circunferencia, para el trazo discontinuo. */
const RADIO = 9;
const VUELTA = 2 * Math.PI * RADIO;

/**
 * El reloj, dibujado.
 *
 * Devuelve SVG y no toca el DOM: así se puede comprobar sin navegador, que es
 * lo único de esta pantalla que se podía comprobar de verdad.
 */
export function dibujarReloj(r: Reloj, etiqueta: string): string {
  if (r.aviones === 0 && r.fraccion === 0) return "";
  const ancho = 26 + r.aviones * 15 + (r.demas ? 28 : 0);
  /*
   * Cada avioncito va dentro de su propio grupo, y el grupo es quien lo pone
   * en su sitio. No es un adorno de marcado: la animación de entrada mueve y
   * encoge, y una `transform` de CSS **pisa** al atributo `transform` del SVG.
   * Con los dos en el mismo elemento, los avioncitos nuevos entraban desde la
   * esquina de arriba a la izquierda en vez de desde su hueco.
   */
  const aviones = Array.from({ length: r.aviones }, (_, i) => {
    const nuevo = i >= r.aviones - r.nuevos;
    return `<g transform="translate(${24 + i * 15} 4)"><path
      class="reloj__avion${nuevo ? " reloj__avion--nuevo" : ""}"
      style="--turno:${i}" d="${AVION}" /></g>`;
  }).join("");
  return `
    <svg class="reloj" viewBox="0 0 ${ancho} 22" role="img" aria-label="${etiqueta}">
      <circle class="reloj__pista" cx="11" cy="11" r="${RADIO}" />
      <circle class="reloj__arco" cx="11" cy="11" r="${RADIO}"
              stroke-dasharray="${(r.fraccion * VUELTA).toFixed(2)} ${VUELTA.toFixed(2)}"
              transform="rotate(-90 11 11)" />
      ${aviones}
      ${r.demas ? `<text class="reloj__demas" x="${ancho - 24}" y="15">+${r.demas}</text>` : ""}
    </svg>
  `;
}

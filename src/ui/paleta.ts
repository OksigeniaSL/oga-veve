/**
 * Los colores del cuadro de mandos, y **qué significa cada uno**.
 *
 * La regla, que es de cabina de verdad y no de gusto: *ningún color significa
 * dos cosas, y ninguna cosa tiene dos colores*. Se aprende una vez, en la
 * avioneta, y vale en los seis aviones y en los cuatro peldaños.
 *
 *   blanco  → lo que tengo
 *   magenta → lo que quiero
 *   verde   → dentro de lo normal, o activo
 *   ámbar   → me acerco al límite
 *   rojo    → el límite
 *   cian    → dato auxiliar
 *   gris    → apagado, no disponible
 *
 * Eso obliga a una decisión que en la aviación real no está cerrada: el
 * **magenta único para todo objetivo**. Un Boeing y un Garmin no se ponen de
 * acuerdo en el color de los *bugs*, y cada fabricante tiene sus motivos; aquí
 * quien mira tiene cuatro años, así que gana la regla sobre la fidelidad.
 *
 * Están aquí y no sueltos por el CSS porque hay tres sitios que pintan los
 * mismos instrumentos —el cuadro del HUD, las pantallas de la cabina en tres
 * dimensiones y los relojes del panel— y tenerlos escritos tres veces es la
 * forma segura de que acaben siendo tres paletas.
 */

/** Lo que significa cada color. El nombre es el significado, no el tono. */
export const PALETA = {
  /** Fondo de pantalla de cristal. */
  pantalla: "#0B0D10",
  /** Fondo de esfera. Un punto más claro que el cristal: no es lo mismo. */
  esfera: "#101214",
  /** La fascia donde van empotrados los instrumentos. */
  fascia: "#23262B",
  /** Y su sombra, abajo, que es lo que le da bulto. */
  fasciaHonda: "#1A1D21",
  /** La visera de encima del cuadro. */
  visera: "#141517",
  /** El bisel mecanizado de cada esfera. */
  bisel: "#0E1013",
  /** El filo de luz del bisel, arriba. */
  filo: "#3A3F45",
  /** Lo que tengo: el valor de ahora. */
  valor: "#F2F5F7",
  /** El cielo del horizonte. */
  cielo: "#1F9AD6",
  /** Y la tierra. */
  tierra: "#8A5A2B",
  /** El avioncito símbolo. Amarillo porque tiene que verse sobre los dos. */
  simbolo: "#FFC933",
  /** Dentro de lo normal. */
  normal: "#35C759",
  /** Me acerco al límite. */
  precaucion: "#FFB02E",
  /** El límite. */
  limite: "#FF3B30",
  /** Lo que quiero: objetivos y ruta. */
  objetivo: "#E14FD8",
  /** Dato auxiliar: viento, velocidad respecto al suelo, Mach. */
  auxiliar: "#3FD6E0",
  /** Apagado. */
  apagado: "#6B7178",
} as const;

export type Color = keyof typeof PALETA;

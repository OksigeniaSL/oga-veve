/**
 * A dónde se va, **dicho en voz alta**.
 *
 * El destino se elegía en el hangar —con su dibujo, su carga y su
 * alternativo— y a partir de ahí no lo nombraba nadie hasta aterrizar. En un
 * vuelo de verdad se dice dos veces antes de despegar, y por dos bocas
 * distintas:
 *
 * - **La torre**, en la autorización. Su primer elemento es el límite, que en
 *   un vuelo a otro aeródromo es el propio aeródromo: «cleared to Tenerife
 *   Norte». Es lo que convierte un despegue en un viaje.
 * - **La comandante**, al pasaje: «bienvenidos a bordo de este vuelo a…». Es
 *   la frase que confirma a cada uno que se subió al avión que era.
 *
 * Aquí está lo que no necesita el juego para decidirse: qué clave toca, qué
 * pieza rellena el hueco y cómo se escribe el respaldo. Sin three.js ni
 * audio, para poder comprobarlo sin navegador.
 */

import { hayTexto, t, type TranslationKey } from "../i18n";

/**
 * La bienvenida de la comandante para este tramo.
 *
 * Tres casos, y ninguno calla:
 *
 * - **Vuelta al campo** —sin destino, o con el destino igual a la salida—:
 *   se dice que se vuelve aquí. Volver al mismo sitio es un plan y se nombra
 *   igual que cualquier otro.
 * - **Un destino con su frase**: la grabación entera de ese destino.
 * - **Un destino nuevo sin frase todavía**: la bienvenida de siempre, que no
 *   nombra el sitio pero está grabada. Mejor eso que una clave inventada
 *   leída por el navegador.
 */
export function bienvenidaPara(
  salidaId: string,
  destinoId: string | null,
): TranslationKey {
  if (!destinoId || destinoId === salidaId) return "comandante.bienvenida.local";
  const suya = `comandante.bienvenida.${destinoId}`;
  return hayTexto(suya) ? suya : "comandante.bienvenida";
}

/** La pieza grabada con el nombre de un campo, para el hueco `{destino}`. */
export function piezaDelLugar(id: string): string {
  return `destino.${id}`;
}

/**
 * Cómo nombra la torre un campo, o `null` si no tiene nombre de radio.
 *
 * Sin nombre no hay autorización que dar: una torre que dice «cleared to» y
 * se calla, o que lee el identificador de un fichero, enseña peor que una
 * torre que no dice nada.
 */
export function nombreEnRadio(id: string): string | null {
  const clave = `lugar.${id}`;
  return hayTexto(clave) ? t(clave) : null;
}

/** Lo que hace falta para que la torre diga a dónde se va. */
export interface DestinoEnRadio {
  /** El nombre dicho, para el texto y para la voz del navegador. */
  readonly dicho: string;
  /** Y la pieza grabada que lo dice, para el hueco de la receta. */
  readonly pieza: string;
}

/** El destino listo para una receta de torre, o `null` si no se puede. */
export function destinoEnRadio(id: string): DestinoEnRadio | null {
  const dicho = nombreEnRadio(id);
  return dicho ? { dicho, pieza: piezaDelLugar(id) } : null;
}

/**
 * La voz de cabina, con lo que ya trae el navegador.
 *
 * Los avisos de la toma —*one hundred… fifty, thirty, twenty, ten*— hay que
 * decirlos, y decirlos sin arrastrar ficheros de audio: son seis palabras hoy
 * y serán treinta mañana, y grabarlas obliga a una voz, un idioma y medio mega
 * por juego de avisos.
 *
 * `speechSynthesis` está en todos los navegadores desde hace años, va sin red
 * y no pesa nada. A cambio la voz es la del sistema y no suena a cabina, que
 * es un precio razonable por poder decir cualquier cosa desde el primer día.
 *
 * ## Y si no hay voz, no pasa nada
 *
 * Puede no haberla: un sistema sin voces instaladas, un navegador que la
 * bloquea, alguien con la pestaña muteada, alguien que no oye. Por eso **cada
 * aviso hablado tiene su gemelo en pantalla** y esto no es más que un extra.
 * Aquí eso se nota en que todo falla en silencio: si no se puede hablar, se
 * calla y el juego sigue igual.
 */

/** Los avisos son de cabina, y una cabina habla en inglés aeronáutico. */
const IDIOMA = "en-US";

let permitido = true;

/** Apaga o enciende la voz. La usa el botón de sonido del HUD. */
export function permitirVoz(si: boolean): void {
  permitido = si;
  if (!si) callar();
}

/**
 * Dice una frase corta, o no dice nada si no se puede.
 *
 * `cancelar` corta lo que se estuviera diciendo, que es lo que hace falta en
 * una cuenta atrás: si todavía está sonando «twenty» cuando toca «ten», lo que
 * hay que oír es «ten». Una cola de avisos de altura es peor que ninguno,
 * porque la altura que anuncia ya no es la que hay.
 */
export function decir(frase: string): void {
  if (!permitido) return;
  try {
    const sintesis = globalThis.speechSynthesis;
    if (!sintesis) return;
    sintesis.cancel();
    const dicho = new SpeechSynthesisUtterance(frase);
    dicho.lang = IDIOMA;
    // Un punto por encima de lo normal: los avisos de cabina son secos y
    // rápidos, y a los cuatro años una voz lenta se pierde antes de acabar.
    dicho.rate = 1.15;
    dicho.volume = 0.9;
    sintesis.speak(dicho);
  } catch {
    // Sin voz se juega igual. Ver la cabecera de este fichero.
  }
}

/** Corta lo que se esté diciendo. Al reiniciar el vuelo, por ejemplo. */
export function callar(): void {
  try {
    globalThis.speechSynthesis?.cancel();
  } catch {
    // Igual que arriba.
  }
}

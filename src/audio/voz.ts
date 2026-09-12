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

/**
 * Lo alto que habla la voz del navegador, de 0 a 1.
 *
 * **La voz no pasa por Web Audio**, así que el volumen maestro del juego no la
 * toca: el botón del altavoz la callaba en mudo y la dejaba **igual de alta en
 * «bajo»**. En un aula con veinte tablets a medio volumen, el instructor
 * seguía a tope en las veinte, que es justo el aparato y el sitio para los que
 * ese peldaño existe.
 *
 * Un punto por debajo de lo normal, como estaba: los avisos de cabina son
 * secos y a los cuatro años una voz baja se pierde.
 */
let volumen = 0.9;

/** Lo pone el botón del altavoz, con la ganancia del peldaño que toque. */
export function ponerVolumenDeVoz(deLaMezcla: number): void {
  // La ganancia normal de la mezcla es 0,85; se traduce a la escala de la voz
  // para que «normal» siga sonando como sonaba.
  volumen = Math.max(0, Math.min(1, (deLaMezcla / 0.85) * 0.9));
}

/**
 * Quién se entera de que hay alguien hablando.
 *
 * **La voz del navegador no pasa por Web Audio**, así que la mezcla no puede
 * oírla para agacharse: hay que avisarla. Se conecta desde el juego, y si no
 * hay nadie conectado —una prueba, un guion— esto no hace nada y se habla
 * igual. Ver `audio/mezcla.ts`.
 */
let mezcla: { empiezaLaVoz(): void; acabaLaVoz(): void } | null = null;

export function conectarLaMezcla(
  quien: { empiezaLaVoz(): void; acabaLaVoz(): void } | null,
): void {
  mezcla = quien;
}

/**
 * Le cuenta a la mezcla cuándo empieza y cuándo acaba esta frase.
 *
 * Se engancha al `start` y no a la llamada porque lo que tiene que agachar el
 * motor es **que se oiga una voz**, no que se haya pedido una: entre pedirla y
 * oírla pasa un rato, y en sistemas sin voces no llega a oírse nunca.
 *
 * Y con seguro contra el doble aviso: el navegador dispara `end` y `error`
 * sobre la misma frase cuando se cancela, y dos avisos de final por un solo
 * comienzo dejarían la mezcla agachada para siempre.
 */
export function seguirLaVoz(frase: SpeechSynthesisUtterance): void {
  let contada = false;
  frase.addEventListener("start", () => {
    if (contada) return;
    contada = true;
    mezcla?.empiezaLaVoz();
  });
  const acabo = (): void => {
    if (!contada) return;
    contada = false;
    mezcla?.acabaLaVoz();
  };
  frase.addEventListener("end", acabo);
  frase.addEventListener("error", acabo);
}

/**
 * ¿Se puede hablar ahora mismo?
 *
 * Lo pregunta el instructor, que tiene su propia voz y su propio ritmo pero
 * obedece al mismo botón: quien pone el juego en mudo lo pone en mudo entero.
 */
export function vozPermitida(): boolean {
  return permitido;
}

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
    seguirLaVoz(dicho);
    dicho.lang = IDIOMA;
    // Un punto por encima de lo normal: los avisos de cabina son secos y
    // rápidos, y a los cuatro años una voz lenta se pierde antes de acabar.
    dicho.rate = 1.15;
    dicho.volume = volumen;
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

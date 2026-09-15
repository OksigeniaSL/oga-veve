/**
 * Lo que dice la torre por radio, y **qué grabación le toca a cada cosa**.
 *
 * La torre del juego tenía **siete frases grabadas y decía dos**. Las otras
 * cinco —«cleared for take-off», «cleared to land», «go around, runway
 * occupied», «hold short of the runway», «line up and wait»— estaban grabadas,
 * horneadas, publicadas y bajadas a cada tablet **sin que nada en `src/` las
 * nombrara**: solo aparecían en el guion que las generó. Se oyó jugando: «las
 * voces de torre y radio parece que se oyen, pero hay unas pocas frases».
 *
 * Es el mismo agujero que ya se tapó con los cantos de cabina, y por el mismo
 * motivo: esas frases se piden **por su texto en inglés** —que es como se
 * escriben en una radio de verdad— y el pack de voz busca **por clave**. Sin
 * nada que una las dos cosas, la grabación no suena y nadie se entera.
 *
 * ## Y son en inglés a propósito
 *
 * `i18n/habla.ts` ya lo tenía escrito: «lo que **no** cambia es el inglés
 * aeronáutico: `cleared for take-off` se dice igual en Tenerife, en Asunción y
 * en cualquier torre del mundo. Esa es media lección del juego». Las dos
 * frases en castellano que ya sonaban —«Podés entrar», «Esperá acá»— son la
 * **lámpara** hablando, que es la instrucción para quien tiene cuatro años y
 * no lee. Estas son la radio, que es el mundo.
 *
 * La tabla va aquí y no dentro de `game.ts` para que una prueba pueda
 * comprobar lo único que importa: que no sobre ninguna grabación.
 */

/** De lo que dice la torre a la clave con la que está grabado. */
export const CLAVE_DE_TORRE: Readonly<Record<string, string>> = {
  // La secuencia de salida, en el orden en que se oye.
  "hold short of the runway": "torre.holdShort",
  /*
   * **Y ésta todavía no la dice nadie, y se dice aquí para que se vea.**
   *
   * «Line up and wait» es entrar en pista y esperar ahí al permiso de
   * despegue, y en el juego **ese momento no existe**: la luz verde ya
   * significa que podés despegar, así que se entra y se va. Ponerla por
   * ponerla sería decir algo que no está pasando.
   *
   * Se queda en la tabla a propósito, en vez de borrarla de la lista o quitar
   * la grabación: existe, está grabada, y el día que la torre pueda parar a
   * alguien en el eje —con tráfico de verdad, que es el #118— ya está. Lo que
   * no puede pasar es que se quede escondida otra vez, y por eso está escrito.
   */
  "line up and wait": "torre.lineUpWait",
  "cleared for take-off": "torre.clearedTakeoff",
  // Y la de llegada.
  "cleared to land": "torre.clearedLand",
  "go around, runway occupied": "torre.goAround",
};

/**
 * La clave de una frase de torre, o `null` si esa frase no está grabada.
 *
 * Se compara en minúsculas y sin puntuación final, que es como se pide desde
 * el juego y como se escribe en una lista de llamadas.
 */
export function claveDeTorre(dice: string): string | null {
  const limpio = dice
    .trim()
    .toLowerCase()
    .replace(/[.!]+$/, "");
  for (const [suyo, clave] of Object.entries(CLAVE_DE_TORRE)) {
    if (limpio === suyo.toLowerCase()) return clave;
  }
  return null;
}

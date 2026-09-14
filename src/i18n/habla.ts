/**
 * Cómo se habla en cada sitio.
 *
 * El producto es paraguayo y su castellano también: se vosea —«podés entrar»,
 * «seguí la raya verde»— y eso está decidido y no se toca. Pero **la torre no
 * es el producto: es el sitio**, y una torre de Tenerife que dice «podés
 * entrar» suena tan raro como una de Asunción que dijera «puedes».
 *
 * Pedido con estas palabras: «vamos a poner una voz para las pistas de canarias
 * que tengan acento canario… así también hago un guiño a mi tierra», y luego,
 * cuando se propuso hacerlo con una lista de dos aeropuertos: «no sólo Tenerife
 * y La Palma, si se ponen más aeropuertos canarios también van».
 *
 * Así que la regla no es una lista: **es el indicativo OACI**. Los ocho
 * aeropuertos canarios empiezan por `GC` —GCXO, GCTS, GCLP, GCRR, GCFV, GCLA,
 * GCHI, GCGM— y ninguno de fuera lo hace, porque `GC` es el prefijo que la OACI
 * le dio a las islas. Poner mañana Fuerteventura o El Hierro no pide tocar
 * nada: llegan hablando canario el día que llega su fichero.
 *
 * ## Y el habla no es solo el acento
 *
 * Cambian **las palabras**: «puedes» y no «podés», «espera» y no «esperá»,
 * «ustedes» y no «vosotros» —que en Canarias es lo mismo que en América y es de
 * las pocas cosas que las dos orillas comparten contra la península—. Grabar
 * con voz canaria un texto voseado no arreglaría nada; sería un canario
 * imitando a un paraguayo.
 *
 * Lo que **no** cambia es el inglés aeronáutico: `cleared for take-off` se dice
 * igual en Tenerife, en Asunción y en cualquier torre del mundo. Esa es media
 * lección del juego.
 */

/** Las formas de hablar que el juego conoce. */
export type Habla = "paraguayo" | "canario";

/**
 * Cómo se habla en este aeródromo.
 *
 * Por el indicativo OACI, que es un dato del aeródromo y no una opinión
 * nuestra. Sin indicativo —un campo inventado, una pista de estancia— se habla
 * como habla el juego.
 */
export function hablaDe(id: string | null | undefined): Habla {
  return id?.toUpperCase().startsWith("GC") ? "canario" : "paraguayo";
}

/**
 * La clave de esta frase **dicha en este sitio**.
 *
 * Las frases de la torre y del otro avión tienen una versión por habla, y las
 * versiones son claves distintas a propósito: cada una se graba con su voz y el
 * pack de voz busca por clave. Si las dos hablas compartieran clave, la torre
 * canaria sonaría con la voz paraguaya o al revés, según cuál se hubiera
 * cargado antes. Ver `audio/instructor-grabado.ts`.
 *
 * Las claves del habla de la casa se quedan como estaban —`torre.verde`— y la
 * otra lleva el habla en medio —`torre.canario.verde`—, así que lo ya grabado,
 * medido y traducido no se mueve.
 */
export function comoSeDiceAqui(clave: string, habla: Habla): string {
  if (habla === "paraguayo") return clave;
  const punto = clave.indexOf(".");
  if (punto < 0) return clave;
  return `${clave.slice(0, punto)}.${habla}${clave.slice(punto)}`;
}

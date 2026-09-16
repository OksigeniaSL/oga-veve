/**
 * Otras maneras de decir lo mismo.
 *
 * Un aviso que suena igual la vigésima vez deja de ser un aviso y pasa a ser
 * un ruido de fondo: el oído lo reconoce antes de entenderlo y lo aparta. Con
 * una voz grabada se nota más que con la del navegador, porque es siempre
 * exactamente el mismo fichero.
 *
 * Así que algunas frases tienen dos o tres formas, y al decirlas se elige una.
 *
 * ## Y hay frases que **no** pueden tener variantes
 *
 * La fraseología de aviación se dice tal cual. `cleared to land` es
 * `cleared to land` y no «podés aterrizar cuando quieras»: media docena de
 * frases fijas, iguales en todo el mundo y en todos los idiomas, son la razón
 * de que una torre y un piloto que no comparten idioma se entiendan. Cambiarlas
 * por sinónimos aquí sería enseñar justo lo contrario de lo que enseñan.
 *
 * Por eso esto es una **lista corta y escrita a mano**, y no una regla que se
 * aplique a todo: las que están, están porque alguien decidió que esa concreta
 * admite decirse de otra forma.
 *
 * ## Cómo casa con las grabaciones
 *
 * La primera forma es la que vive en `i18n`, y su grabación se llama como la
 * clave. Las demás se graban como `<clave>~2`, `<clave>~3`… y el guion de las
 * frases las saca de aquí, así que añadir una variante es escribirla y volver
 * a grabar: no hay una segunda lista que mantener.
 *
 * Y se elige **una vez por aviso**, no una para la pantalla y otra para la
 * voz: si no, el cartel diría una cosa y el instructor otra.
 */

import { t, type TranslationKey } from "../i18n";

/**
 * Las otras formas, sin contar la que ya está en `i18n`.
 *
 * En español paraguayo, que es el idioma del producto. Las variantes no se
 * traducen a los otros idiomas todavía: en inglés y en guaraní se dice la de
 * siempre, que es lo que hay grabado.
 */
export const VARIANTES: Partial<Record<TranslationKey, readonly string[]>> = {
  /*
   * **La frustrada.** Es el aviso que más se repite de los que importan —una
   * de cada cuatro aproximaciones acaba así, y quien practica aterrizajes hace
   * veinte seguidas— y es además el que peor entra: hay que entenderlo
   * mientras se está bajando y decidiendo.
   *
   * Las tres dicen lo mismo en el mismo orden: **qué hacer primero** —gas y
   * subir— y **qué se abandona**. Jugando se pidió justo eso: «algo del tipo,
   * volvemos al aire, gas y aire, abandoná la maniobra de aterrizaje».
   */
  "vuelo.mandanFrustrar": [
    "¡Hay alguien en la pista! Gas, subí y dejá el aterrizaje",
    "No podés bajar: metele gas y volvé a subir",
  ],
  /*
   * **Y ninguna dice «no entra».**
   *
   * Decía «Así no entra: gas y al aire», y se entendió como que el avión no
   * cabía en la pista: «"así no entra" con 3400 m de pista y la velocidad al
   * mínimo». Con un 747 delante y una pista larguísima, eso es una acusación
   * falsa y además desconcertante — el avión cabe de sobra; lo que no va a
   * salir es **esta** aproximación.
   *
   * Lo que hay que decir es que venís mal, no que no quepas.
   */
  "vuelo.noEstabilizada": [
    "Venís mal para bajar: gas y al aire, lo probamos otra vez",
    "Dejá el aterrizaje. Gas, subí, y volvemos a intentarlo",
  ],
  "vuelo.frustrada": [
    "Muy bien: irse al aire también es volar bien",
    "Eso estuvo bien. Damos otra vuelta y volvemos",
  ],
  "vuelo.puedeVolver": ["La pista quedó libre: podés volver a bajar"],

  /*
   * **Y los avisos de senda**, que salen varias veces en cada aproximación.
   * Son los que más cansan de oír repetidos, y los que menos se pueden callar:
   * si no se dicen, no se aprende a corregir.
   *
   * **Y hablan como habla una persona, no como una máquina de aros.** Quien lo
   * jugó pidió esto con todas las letras: «más natural, que me diga que baje,
   * que estoy alto y así, como diría una instructora». Así que ninguna nombra
   * el aro: nombran **la pista**, que es lo que se está mirando, y dicen qué
   * hacer. Un aro es el dibujo con el que el juego lo enseña; lo que se corrige
   * es la altura para la pista.
   *
   * Cuatro formas de cada una, que es lo que separa a alguien que te acompaña
   * de un aviso grabado. Salen tres o cuatro veces por aproximación.
   */
  "vuelo.aroAlto": [
    "Venís un poco alto. Bajá el morro despacito",
    "Estás por encima. Soltá un poquito y vas a ir entrando",
    "Un poco alto para la pista: bajá suave",
  ],
  "vuelo.aroBajo": [
    "Venís bajo. Tirá un poquito y un toque de motor",
    "Estás por debajo: subí despacio, sin pasarte",
    "Un poco bajo para la pista: levantá suave",
  ],

  /*
   * **Y el que dice que lo arreglaste.** Éste lleva variantes por una razón
   * distinta de las demás: no cansa por repetirse, cansa por sonar a premio de
   * máquina. Tres formas de decir «muy bien» se parecen más a una persona.
   */
  "vuelo.corregido": [
    "Muy bien, así venís",
    "Eso. Ahora entrás derechito",
    "Perfecto, quedate así",
  ],
};

/**
 * Cuántas formas tiene una frase, contando la de `i18n`.
 *
 * Lo usa el guion que arma la lista de grabación.
 */
export function cuantasFormas(clave: TranslationKey): number {
  return 1 + (VARIANTES[clave]?.length ?? 0);
}

/**
 * El identificador de grabación de la forma número `n`, empezando en cero.
 *
 * La primera se llama como la clave, para que nada de lo ya grabado cambie de
 * nombre al añadir una variante.
 */
export function idDeLaForma(clave: TranslationKey, n: number): string {
  return n === 0 ? clave : `${clave}~${n + 1}`;
}

/**
 * Una de las formas, al azar, con su identificador de grabación.
 *
 * `azar` se puede pasar para poder comprobarlo sin depender de la suerte.
 */
export function unaForma(
  clave: TranslationKey,
  azar: () => number = Math.random,
): { readonly texto: string; readonly id: string } {
  const otras = VARIANTES[clave];
  if (!otras?.length) return { texto: t(clave), id: clave };
  const n = Math.min(otras.length, Math.floor(azar() * (otras.length + 1)));
  return {
    texto: n === 0 ? t(clave) : otras[n - 1]!,
    id: idDeLaForma(clave, n),
  };
}

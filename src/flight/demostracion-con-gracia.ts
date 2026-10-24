/**
 * **La demostración de seguridad, con gracia de vez en cuando** (punto 294).
 *
 * La idea es de Enrique: hay compañías que dejan a su tripulación hacer la
 * demostración a su manera —las de Southwest son famosas—, porque con un poco
 * de gracia se atiende más. Lo que manda la norma es el contenido, no el texto
 * exacto. Y con sus palabras: «Sin pasarse: aunque pueda ser divertido, no le
 * quiero quitar la seriedad o importancia que tiene todo lo que se dice y se
 * hace.»
 *
 * Así que esto es un toque, no un número cómico, y con tres reglas:
 *
 * - **La gracia va en el adorno, nunca en las instrucciones.** Una frase en la
 *   entrada, detrás del «les rogamos un momento de atención», y otra en la
 *   despedida, detrás del «muchas gracias por su atención». El cinturón, las
 *   salidas, las mascarillas, el chaleco, la tarjeta y el modo avión son
 *   **las mismas frases grabadas de siempre**, en el mismo orden y con su
 *   dibujo: ninguna forma las toca.
 * - **Nada que diga que la seguridad es un trámite**, ni ironía sobre ella,
 *   ni dobles sentidos, ni burlas a nadie. Las tres dicen lo contrario de un
 *   trámite: que el paisaje puede esperar, que la tripulación lo repasa
 *   tanto que hasta se examina, y que se cuenta con cariño a quien vuela por
 *   primera vez.
 * - **La tripulación es seguridad**: lo de la entrada de `examen` es verdad
 *   —el entrenamiento periódico es anual y acaba con una comprobación, ver
 *   `docs/historias/fuentes.md`— y es justo lo que la separa de un adorno.
 *
 * ## Cada cuánto
 *
 * **En uno de cada tres vuelos, de media, y nunca dos seguidos.** Después de
 * un vuelo con gracia va siempre la demostración de siempre, y después de la
 * de siempre, la gracia sale una vez de cada dos. Un chiste que sale siempre
 * deja de serlo a la segunda vez —ver `audio/variantes.ts`—, y una
 * demostración que siempre hace gracia acaba pareciendo un número. Entre las
 * formas con gracia, nunca la misma dos veces seguidas.
 *
 * Y **solo las que suenan**: una forma entra en el sorteo el día que tiene
 * sus dos frases grabadas. La voz del navegador es muda en Brave para Linux, y
 * una gracia que no suena es la tripulante callada en medio de la
 * demostración. Lo mismo que la bienvenida de Jazlyn: ver `audio/bienvenidas.ts`.
 *
 * Sin three.js ni audio, para poder comprobarlo sin navegador.
 */

import { elegirSinRepetir } from "../audio/sin-repetir";

/** Las formas con gracia, por su nombre. */
export const FORMAS_CON_GRACIA = ["ventanilla", "examen", "primeraVez"] as const;

export type FormaConGracia = (typeof FORMAS_CON_GRACIA)[number];

/** La de siempre, sin adorno, o una con gracia. */
export type FormaDeLaDemostracion = "sobria" | FormaConGracia;

/** El prefijo de las claves de la demostración: lo de la tripulación, por la megafonía. */
const DEMO = "inicio.tripulacion.pasaje.demo";

/**
 * **Las dos frases de cada forma**: la de la entrada, detrás de
 * `demo.intro`, y la de la despedida, detrás de `demo.aparatos`. Sus textos,
 * en `i18n/es-PY.ts`.
 */
export const GRACIA: Readonly<Record<FormaConGracia, { readonly entrada: string; readonly despedida: string }>> = {
  ventanilla: { entrada: `${DEMO}.gracia.ventanilla.entrada`, despedida: `${DEMO}.gracia.ventanilla.despedida` },
  examen: { entrada: `${DEMO}.gracia.examen.entrada`, despedida: `${DEMO}.gracia.examen.despedida` },
  primeraVez: { entrada: `${DEMO}.gracia.primeraVez.entrada`, despedida: `${DEMO}.gracia.primeraVez.despedida` },
};

/** Si una forma lleva gracia. */
export function conGracia(forma: string | null): forma is FormaConGracia {
  return (FORMAS_CON_GRACIA as readonly string[]).includes(forma ?? "");
}

/** Lo que hace falta saber para elegir la demostración de este vuelo. */
export interface ParaLaDemostracion {
  /** La forma del último vuelo de pasaje, o `null` si es el primero. */
  readonly ultima: string | null;
  /** La última forma con gracia que salió, o `null` si no salió ninguna. */
  readonly ultimaConGracia: string | null;
  /** Si una frase tiene su grabación. */
  readonly grabada: (clave: string) => boolean;
  readonly azar?: () => number;
}

/** Lo que sale la gracia después de un vuelo con la de siempre: una de cada dos. */
export const GRACIA_TRAS_LA_DE_SIEMPRE = 0.5;

/**
 * **La demostración de este vuelo**: la de siempre o una con gracia, según lo
 * que salió la vez anterior. Ver la cabecera para el cada cuánto.
 */
export function laDemostracion(p: ParaLaDemostracion): FormaDeLaDemostracion {
  if (conGracia(p.ultima)) return "sobria";
  const azar = p.azar ?? Math.random;
  const suenan = FORMAS_CON_GRACIA.filter((f) => p.grabada(GRACIA[f].entrada) && p.grabada(GRACIA[f].despedida));
  if (suenan.length === 0 || azar() >= GRACIA_TRAS_LA_DE_SIEMPRE) return "sobria";
  return elegirSinRepetir(suenan, p.ultimaConGracia as FormaConGracia | null, azar) ?? "sobria";
}

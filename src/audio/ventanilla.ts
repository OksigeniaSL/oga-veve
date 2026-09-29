/**
 * **Cómo se cuenta lo que se ve por la ventanilla**: con qué palabras, con
 * qué grabación y con qué voz.
 *
 * Era una plantilla con huecos —«Ahí abajo, a la {lado}, {nombre}.»— dicha por
 * la voz del navegador, y se oyó como lo que era: «muy robótica, sin emoción…
 * una azafata que no ha dormido bien». Lo que se pedía era lo otro, lo que sí
 * gustó del servicio a bordo: una frase natural, con gracia, con algo que
 * contar.
 *
 * Así que ahora cada sitio tiene **su frase escrita a mano** —
 * `ventanilla.<clave>`: «Ese gigante es el Teide…»— grabada entera, con la
 * voz de Jazlyn y con los ajustes que le dan chispa. Y delante, **por qué lado
 * mirar**, que es la otra mitad de lo que dice una comandante: una frase corta
 * grabada aparte, con dos formas por lado para que no suene igual dos veces
 * seguidas. Se montan como las demás recetas de la megafonía —ver
 * `bienvenidaConPlan`—: dos frases enteras, nunca una palabra suelta pegada en
 * medio de otra.
 *
 * ## Quién lo dice
 *
 * Con pasaje, la comandante, por la megafonía y de usted. En avioneta, la
 * instructora, sentada al lado y **de vos**: `ventanilla.vos.*`. Son dos voces
 * con dos grabaciones, y las claves no se pisan porque el pack busca por
 * clave. Ver «Y lo dice quien de verdad lo diría» en `game.ts`.
 *
 * ## Y la primera vez, se presenta
 *
 * La comandante habló por última vez para lo del cinturón, y lo primero que
 * dice una de verdad al volver a coger el micrófono es quién habla. Solo la
 * primera vez del vuelo: la segunda ya se sabe.
 */

import { hayTexto, t, type TranslationKey } from "../i18n";
import type { Mirada } from "../world/hitos";
import { VARIANTES, idDeLaForma } from "./variantes";

/** Lo que se le pide a la boca: el texto, la receta y sus piezas. */
export interface LoQueSeDice {
  readonly texto: string;
  /** La receta del pack: `ventanilla` o `ventanilla.vos`. */
  readonly clave: string;
  readonly relleno: Readonly<Record<string, string>>;
}

/**
 * La frase que cuenta esta mirada, o `null` si ese sitio no tiene frase.
 *
 * `orden` es cuántas se han dicho antes en este vuelo: la primera lleva el
 * saludo, y la forma de decir el lado va rotando para no repetirse.
 */
export function loQueSeDice(
  mirada: Mirada,
  conPasaje: boolean,
  orden: number,
): LoQueSeDice | null {
  const que = mirada.hito.clave ?? mirada.hito.clase;
  const prefijo = conPasaje ? "ventanilla." : "ventanilla.vos.";
  const cuerpo = `${prefijo}${que}`;
  // Un sitio sin frase no se cuenta: una plantilla con el nombre en un hueco
  // es justo lo que se quitó.
  if (!hayTexto(cuerpo)) return null;
  const lado = `${prefijo}lado.${mirada.lado}` as TranslationKey;
  const formas = 1 + (VARIANTES[lado]?.length ?? 0);
  const n = orden % formas;
  const textoDelLado = n === 0 ? t(lado) : VARIANTES[lado]![n - 1]!;
  const saludo = conPasaje && orden === 0 ? "ventanilla.saludo" : null;
  return {
    texto: [saludo ? t(saludo) : null, textoDelLado, t(cuerpo)]
      .filter(Boolean)
      .join(" "),
    clave: conPasaje ? "ventanilla" : "ventanilla.vos",
    relleno: {
      ...(saludo ? { saludo } : {}),
      lado: idDeLaForma(lado, n),
      que: cuerpo,
    },
  };
}

/**
 * **Qué dice la comandante de la turbulencia**, y cómo lo dice cada vez.
 *
 * Enrique quiere la palabra **turbulencia**, nunca «movimiento», y que se oiga
 * dicha de muchas maneras, todas normales, para que quien la oye aprenda que
 * es normal. Así que la frase sale de lo que pasa de verdad —ver
 * `flight/turbulencia-del-vuelo.ts`—: por grados, la que no se veía venir, la
 * segunda vez del vuelo, la de la tormenta y la que avisó otro avión; y al
 * pasar, que ya se apaga la señal o que sigue encendida porque se baja.
 *
 * Ninguna grita ni dice «peligro». Las de grado fuerte se graban en calma
 * —firmes, no alarmadas—, que es la forma que tiene la seguridad de
 * funcionar. Ver `EN_CALMA` en `scripts/frases-para-grabar.mjs`.
 *
 * ## Y solo con su grabación
 *
 * Cada frase nueva entra el día que tiene su toma en el pack. Hasta entonces
 * suena la que ya hay, `comandante.turbulencia`, que habla de «movimiento»
 * pero es verdad: una frase que el juego pide y nadie grabó la dice la voz
 * del navegador, que en Brave para Linux es muda, y el anuncio de la
 * turbulencia no puede quedarse en silencio. Al pasar no hay grabada ninguna
 * que sea verdad, así que hasta entonces lo cuenta el cartel, que se apaga
 * con su *ding*.
 *
 * Sin three.js ni audio, para poder comprobarlo sin volar.
 */

import { t, type TranslationKey } from "../i18n";
import type { Intensidad, SucesoDelCamino } from "../flight/turbulencia-del-vuelo";
import { laForma, unaForma } from "./variantes";

/** Lo que se le pide a la boca: el texto y la clave de su grabación. */
export interface FormaDicha {
  readonly texto: string;
  readonly id: string;
}

/** La de siempre, la que ya está grabada. Ver la cabecera. */
export const LA_DE_SIEMPRE: TranslationKey = "comandante.turbulencia";

/**
 * **La clave del anuncio**, antes de mirar si está grabada:
 *
 * - con tormenta, la de la tormenta, que dura casi todo el vuelo;
 * - si la avisó otro avión, la del PIREP, que cuenta que los aviones se
 *   ayudan entre ellos;
 * - la de aire claro, que ya se mueve, la de «ahora»;
 * - la segunda vez del vuelo, dicha de otro modo;
 * - y si no, la de su grado.
 */
export function claveDelAnuncio(
  suceso: Extract<SucesoDelCamino, { que: "anunciar" }>,
): TranslationKey {
  if (suceso.como === "tormenta") return "comandante.turbulencia.tormenta";
  if (suceso.fuente === "pirep") return "comandante.turbulencia.pirep";
  if (suceso.como === "sin-avisar")
    return `comandante.turbulencia.ahora.${suceso.intensidad}` as TranslationKey;
  if (suceso.vez > 1)
    return `comandante.turbulencia.otraVez.${suceso.intensidad}` as TranslationKey;
  return `comandante.turbulencia.${suceso.intensidad}` as TranslationKey;
}

/** A quién se le habla, que cambia lo que es verdad decir. */
export interface AQuien {
  /**
   * Si el avión lleva tripulación de cabina. El JAZ 60 no la lleva —ver
   * `conTripulacion` en `megafonia.ts`—, y «la tripulación también se va a
   * sentar» dicho en él es falso.
   */
  readonly conTripulacion: boolean;
  /**
   * Si el pasaje ya va sentado con el cartel puesto —la subida, la bajada—:
   * «vuelvan a su asiento» no es lo que se dice ahí, sino «sigan sentados».
   */
  readonly sentados: boolean;
}

/** Las de la moderada que hablan de la tripulación. Ver `AQuien.conTripulacion`. */
const NOMBRAN_A_LA_TRIPULACION = /^comandante\.turbulencia\.(?:ahora\.|otraVez\.)?(?:moderada|fuerte)$/;

/**
 * **Las claves que valen para este anuncio, de la que mejor lo dice a la que
 * menos**, antes de mirar cuál está grabada:
 *
 * - con el pasaje sentado, la de «sigan sentados», si es moderada;
 * - sin tripulación de cabina, la suya, que no la nombra;
 * - y la de siempre del suceso, si es verdad en este avión.
 */
export function clavesDelAnuncio(
  suceso: Extract<SucesoDelCamino, { que: "anunciar" }>,
  a: AQuien = { conTripulacion: true, sentados: false },
): TranslationKey[] {
  const base = claveDelAnuncio(suceso);
  const claves: TranslationKey[] = [];
  const moderada = suceso.intensidad === "moderada";
  const propia = suceso.como === "tormenta" || suceso.fuente === "pirep";
  if (a.sentados && moderada && !propia) claves.push("comandante.turbulencia.sentados.moderada");
  if (!a.conTripulacion && NOMBRAN_A_LA_TRIPULACION.test(base)) {
    if (moderada) claves.push(`${base}.sinTripulacion` as TranslationKey);
    return claves;
  }
  claves.push(base);
  return claves;
}

/**
 * **El anuncio, con su grabación**: el que mejor lo dice de los grabados y, si
 * no hay ninguno, el de siempre en una de sus formas, que no nombra a la
 * tripulación. Ver la cabecera.
 */
export function anuncioDeTurbulencia(
  suceso: Extract<SucesoDelCamino, { que: "anunciar" }>,
  grabada: (id: string) => boolean,
  azar: () => number = Math.random,
  a?: AQuien,
): FormaDicha {
  for (const clave of clavesDelAnuncio(suceso, a))
    if (grabada(clave)) return { texto: t(clave), id: clave };
  return unaForma(LA_DE_SIEMPRE, azar);
}

/**
 * **Lo que se dice al pasar**, o `null` si no hay nada grabado que sea verdad.
 *
 * - `bajando`: la señal sigue encendida porque ya se empezó a bajar, y eso se
 *   dice —«la señal sigue encendida porque ya empezamos a bajar»—.
 * - Si no, `seApaga` dice si la señal se apaga ahora: la encendió el anuncio
 *   con el pasaje suelto. Con la señal puesta de antes —la subida, o el
 *   interruptor— decir «apagamos la señal» sería falso, y no se dice nada.
 * - `conConsejo`: detrás va el consejo del cinturón —ver `CINTURON_PORQUE`—,
 *   así que se prefiere la forma que no lo da ya, «gracias por la paciencia»,
 *   para no decir lo mismo dos veces seguidas.
 */
export function pasoDeTurbulencia(
  momento: { readonly bajando: boolean; readonly seApaga: boolean; readonly conConsejo: boolean },
  grabada: (id: string) => boolean,
  azar: () => number = Math.random,
): FormaDicha | null {
  if (momento.bajando) {
    const id: TranslationKey = "comandante.turbulencia.pasoBajando";
    return grabada(id) ? { texto: t(id), id } : null;
  }
  if (!momento.seApaga) return null;
  const clave: TranslationKey = "comandante.turbulencia.paso";
  if (momento.conConsejo) {
    const sinElConsejo = laForma(clave, 1);
    if (grabada(sinElConsejo.id)) return sinElConsejo;
  }
  const forma = unaForma(clave, azar, undefined, grabada);
  return grabada(forma.id) ? forma : null;
}

/** El consejo del cinturón, con su porqué: una vez por vuelo. */
export const CINTURON_PORQUE: TranslationKey = "comandante.cinturon.porque";

/**
 * **El grado como se dice por radio**: *light*, *moderate* y *severe*, que son
 * los tres de la OACI. «Fuerte» en el juego es la severa del parte.
 */
export const GRADO_EN_RADIO: Readonly<Record<Intensidad, string>> = {
  ligera: "light",
  moderada: "moderate",
  fuerte: "severe",
};

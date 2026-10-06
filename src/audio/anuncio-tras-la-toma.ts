/**
 * **Lo que dice la tripulación de cabina al dejar la pista.**
 *
 * Pedido así: «al salir de la pista tras el aterrizaje, cuando ya se está en
 * rodadura, la azafata suele decir eso de que ya pueden conectar los
 * dispositivos y que sigan con el cinturón puesto. Debe haber por ahí frases
 * hechas».
 *
 * Las hay, y se parecen mucho de una compañía a otra. Lo que es común a todas
 * las fuentes que se miraron es esto, y en este orden:
 *
 * 1. **Bienvenidos a** —el sitio—, y en muchas la hora local.
 * 2. **Sigan sentados con el cinturón abrochado hasta que el avión se detenga
 *    por completo y se apague la señal de cinturones.**
 * 3. **El teléfono**: que ya se puede usar.
 * 4. **Cuidado al abrir los compartimentos de arriba**, que el equipaje se
 *    mueve durante el vuelo.
 * 5. **Que no se olvide nada**: el bolsillo del asiento, los compartimentos.
 *
 * Fuentes:
 *
 * - Delta Air Lines, *Announcement Guide & Quick Reference Checklist*, AGQRC
 *   R10, 21-10-2014, «Arrival» (publicado por el Northwest Airlines History
 *   Center: northwestairlineshistory.org/wp-content/uploads/2024/04/
 *   AGQRC-R10-OCT-21-2014-parent.pdf): bienvenida y hora local, sentados con
 *   el cinturón hasta el puesto y la señal apagada, cuidado con los
 *   compartimentos «as items tend to shift in flight», «you may now use
 *   mobile phones» y revisar bolsillo, compartimentos y suelo antes de salir.
 * - Diario de una azafata, «Mensajes a bordo del avión» (diarioazafata.com,
 *   2012), el de una tripulante española: «bienvenidos al aeropuerto de…»,
 *   sentados y con el cinturón «hasta que el avión haya parado completamente
 *   los motores y la señal luminosa de cinturones se apague», y cuidado con
 *   los compartimentos superiores.
 * - El guion de despedida de un curso de TCP en castellano («TCP, voces
 *   cabina de pasajeros», SlideShare): bienvenida con la hora local, el
 *   cinturón hasta la completa parada, precaución con los compartimentos
 *   superiores y comprobar el equipaje de mano y los objetos personales.
 * - **El teléfono, cuándo**: las dos fuentes en castellano son de antes de
 *   2014 y lo dejan apagado hasta abrir puertas, que era la norma europea de
 *   entonces. Desde el 26 de septiembre de 2014 EASA deja que cada compañía
 *   lo permita en todo el vuelo («EASA allows electronic devices to remain
 *   On and Connected throughout the flight», nota de EASA), y una circular de
 *   la autoridad de Emiratos de ese mismo año lo dice con el momento exacto:
 *   «use of cellphones may be permitted after an aircraft has left the
 *   active runway after landing» (GCAA, *Safety Alert 01/2014*). Es justo
 *   cuando suena esto, y es lo que se oye hoy en los vuelos, como lo contó
 *   Enrique.
 *
 * No se encontró publicado el texto de Paranair, LATAM, Aerolíneas Argentinas,
 * Iberia, Air Europa ni Binter: cada compañía lo tiene en su manual de cabina,
 * que no es público. Ninguno de los de arriba se copia: lo de aquí está
 * escrito a partir de lo que tienen en común, que es lo real.
 *
 * ## Lo que se deja fuera
 *
 * **La hora local.** Se dice en muchas compañías, pero en este juego ninguna
 * ruta cambia de huso —Paraguay entero va con la misma hora, y Canarias
 * también—, así que es la misma de la salida y no cuenta nada; y decirla
 * pide grabar cada hora y cada minuto con dos voces. Un anuncio de verdad
 * dura cuarenta segundos: aquí se queda lo que suena a anuncio. Ver la
 * cabecera de la megafonía en `i18n/es-PY.ts`.
 *
 * ## Cómo se dice
 *
 * Dos frases enteras, nunca una palabra suelta pegada en medio: la
 * bienvenida, que lleva el nombre del sitio y es una grabación por campo, y
 * el resto, que es igual en todos y tiene varias formas para que aterrizar
 * diez veces no suene diez veces igual. Con el habla de la tripulación —la de
 * Asunción dice «celulares» y «compartimientos»; la de Canarias, «móviles» y
 * «compartimentos»—, como el servicio a bordo. Ver `servicio-a-bordo.ts` y
 * `i18n/habla.ts`.
 *
 * **Y solo las formas grabadas entran en el sorteo**: la voz del navegador es
 * muda en Brave para Linux, y sortear entre una forma que suena y otra que no
 * es sortear si el anuncio suena. Ver `conPieza` en `unaForma`.
 */

import { hayTexto, t, type TranslationKey } from "../i18n";
import { comoSeDiceAqui, type Habla } from "../i18n/habla";
import type { AnuncioMontado } from "./partes-de-la-comandante";
import { unaForma } from "./variantes";

/** El campo donde se acaba de aterrizar: su `id` y su nombre dicho. */
export interface CampoDeLlegada {
  readonly id: string;
  /** Como se dice en voz alta: «Guaraní, Ciudad del Este», sin el punto medio. */
  readonly nombre: string;
}

/**
 * El anuncio de este aterrizaje, listo para decir: la receta, sus piezas y
 * el texto entero para la tira de la megafonía.
 *
 * `conPieza` dice si una forma tiene su grabación; sin él se sortea entre
 * todas, que es lo que quieren las pruebas.
 */
export function anuncioTrasLaToma(
  habla: Habla,
  campo: CampoDeLlegada,
  conPieza?: (id: string) => boolean,
  azar: () => number = Math.random,
): AnuncioMontado {
  const aqui = (clave: string): string => comoSeDiceAqui(clave, habla);
  /*
   * La bienvenida del campo si la tiene, y si no la de reserva con el nombre
   * en su hueco: un campo nuevo no se queda sin anuncio, aunque esa no se
   * pueda grabar y la diga quien pueda.
   */
  const suya = aqui(`tripulacion.bienvenidos.${campo.id}`);
  const bienvenidos = (
    hayTexto(suya) ? suya : aqui("tripulacion.bienvenidos")
  ) as TranslationKey;
  const resto = unaForma(
    aqui("tripulacion.trasLaToma") as TranslationKey,
    azar,
    undefined,
    conPieza,
  );
  return {
    clave: aqui("tripulacion.llegada"),
    relleno: { bienvenidos, resto: resto.id },
    texto: `${t(bienvenidos, { campo: campo.nombre })} ${resto.texto}`,
  };
}

/**
 * Dónde empieza y dónde acaba Canarias, para lo que solo existe allí.
 *
 * Los barcos entre islas y los turbohélices que las unen son de Canarias y de
 * ningún otro sitio de este juego: en Paraguay no hay ferris cruzando el mar
 * porque no hay mar, y poner uno ahí sería enseñar algo falso. Así que hace
 * falta una pregunta que se pueda hacer desde cualquier escenario —«¿esto es
 * Canarias?»— y que no dependa de cómo se llame el escenario ni de su prefijo
 * OACI: la contesta el propio sitio, por sus coordenadas.
 *
 * Una caja de latitud y longitud y nada más. El archipiélago cabe holgado
 * entre los 27,4° y los 29,6° norte y entre los 18,3° y los 13,2° oeste, y no
 * hay nada más en esa caja que pueda confundirse con él: la costa africana más
 * cercana queda a cien kilómetros al este del último punto de Fuerteventura.
 */

import type { Sitio } from "./entre-aerodromos";

const SUR = 27.4;
const NORTE = 29.6;
const OESTE = -18.3;
const ESTE = -13.2;

/** Si un sitio cae en el archipiélago canario. */
export function enCanarias(sitio: Sitio): boolean {
  return (
    sitio.lat >= SUR &&
    sitio.lat <= NORTE &&
    sitio.lon >= OESTE &&
    sitio.lon <= ESTE
  );
}

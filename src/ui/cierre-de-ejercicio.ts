/**
 * **Cómo acabó un ejercicio**, dibujado, para la pantalla del final.
 *
 * Dos dibujos y ninguno es un castigo. Hecho: el avión y la marca de hecho,
 * que es lo que se lleva quien lo ha practicado. A repetir: el mismo avión y
 * la flecha que da la vuelta, que es lo que se hace en un simulador cuando
 * algo no sale — se repite, las veces que haga falta. Sin humo, sin estrellas
 * del golpe y sin avión torcido: aquí no se ha roto nada, porque en un
 * ejercicio nunca se rompe nada. Ver `flight/practica.ts`.
 */

import type { Cierre } from "../flight/practica";

const lienzo = (contenido: string): string =>
  `<svg class="cierre" viewBox="0 0 64 64" role="img" aria-hidden="true">${contenido}</svg>`;

/** El avión de frente, entero y derecho. */
const AVION = `
  <path d="M8 36 h48" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" />
  <path d="M29.5 27 h5 v13 h-5 Z" />
  <path d="M26 44 h12 l-2 4 h-8 Z" />
  <circle cx="20" cy="39.5" r="3" />
  <circle cx="44" cy="39.5" r="3" />
`;

/** La marca de hecho, arriba. */
const HECHO = lienzo(`
  ${AVION}
  <path d="M20 16 l8 8 l16 -16" fill="none" stroke="currentColor"
        stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
`);

/** La flecha que vuelve a empezar, arriba. */
const OTRA_VEZ = lienzo(`
  ${AVION}
  <path d="M44 15 a12 12 0 1 0 -3.5 8.5" fill="none" stroke="currentColor"
        stroke-width="4.5" stroke-linecap="round" />
  <path d="M40 6 l6 9 l-10 1 Z" />
`);

export function dibujoDeCierre(como: Cierre): string {
  return como === "otraVez" ? OTRA_VEZ : HECHO;
}

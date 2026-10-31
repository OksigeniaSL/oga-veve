/**
 * **El botón de «no volver a explicar»**, igual en toda pantalla que se
 * explica al abrirse: la tarjeta del tiempo, la de las teclas y el final del
 * vuelo. Ver `flight/explicacion-al-abrir.ts`.
 *
 * Pequeño y apartado, arriba a la derecha, en la tinta suave: no compite con
 * lo que la pantalla pide hacer. De yema, eso sí, que lo pequeño es el dibujo
 * y no el sitio donde se toca. En el peldaño que no lee va solo el dibujo; la
 * palabra, desde el que lee.
 */

import { t } from "../i18n";

/**
 * El globo de lo que se dice con el visto dentro —«ya lo sé»—. Es el mismo
 * visto de «ya me lo aprendí» de las teclas que tocan, para que se reconozca
 * como la misma idea: esto ya lo aprendí.
 */
export const YA_LO_SE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5 h16 a1.5 1.5 0 0 1 1.5 1.5 v9 a1.5 1.5 0 0 1 -1.5 1.5 h-9 l-4.5 3.5 v-3.5 h-2.5 a1.5 1.5 0 0 1 -1.5 -1.5 v-9 a1.5 1.5 0 0 1 1.5 -1.5 Z"
  fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 11.5 l2.6 2.6 l5.4 -5.4" fill="none"
  stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/**
 * El botón. `clase` y `atributos` los pone cada pantalla para engancharlo a lo
 * suyo; la pinta común la lleva `.no-explicar` en la hoja.
 */
export function botonDeNoExplicar(conLetras: boolean, clase = "", atributos = ""): string {
  const dice = t("parte.noExplicar");
  return `<button type="button" class="no-explicar${clase ? ` ${clase}` : ""}" ${atributos}
            aria-label="${dice}" title="${dice}">${YA_LO_SE}${conLetras ? `<span>${dice}</span>` : ""}</button>`;
}

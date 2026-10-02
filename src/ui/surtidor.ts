/**
 * **El surtidor, en piezas**, para que lo dibujen igual el SVG y el lienzo.
 *
 * Es el dibujo del combustible de todo el juego —la tarjeta de «queda poco»,
 * la luz del panel de avisos— y desde que en los dos peldaños sin letras el
 * depósito enseña sus kilos, es también **el rótulo de esos kilos**: una cifra
 * sola debajo de una barra no dice de qué es, y FUEL ahí no se lee. Lo pinta
 * el cuadro plano en SVG y la pantalla de la cabina en un lienzo, y si cada
 * uno llevara su copia del trazo acabarían siendo dos surtidores. Ver
 * `reglaDeCombustible` en `cristal.ts` y en `world/pantallas-cabina.ts`.
 *
 * En una caja de 24 por 24, como los demás dibujos de `senal.ts`.
 */
export const SURTIDOR = {
  cuerpo: "M3.4 22 V4.4 A1.8 1.8 0 0 1 5.2 2.6 h6.4 A1.8 1.8 0 0 1 13.4 4.4 V22 Z",
  /** La ventanilla de la cifra: el hueco claro de la máquina. */
  hueco: { x: 5.4, y: 5, ancho: 6, alto: 4.4 },
  base: "M2 22 h12.8 v1.6 H2 Z",
  /** La manguera, que va en trazo y no en relleno. */
  manguera:
    "M14.6 7.4 h2.4 a2 2 0 0 1 2 2 v7.4 a1.6 1.6 0 0 0 3.2 0 V10.6 l-2-2.4",
} as const;

/** El surtidor dibujado en SVG, con el hueco en la clase de siempre. */
export function surtidorSvg(): string {
  const h = SURTIDOR.hueco;
  return `
  <path d="${SURTIDOR.cuerpo}" />
  <rect class="senal__hueco" x="${h.x}" y="${h.y}" width="${h.ancho}" height="${h.alto}" rx="0.7" />
  <path d="${SURTIDOR.base}" />
  <path d="${SURTIDOR.manguera}"
        fill="none" stroke="currentColor" stroke-width="1.7"
        stroke-linecap="round" stroke-linejoin="round" />
`;
}

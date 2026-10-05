/**
 * La manga del uniforme con las barras del grado, dibujada en un solo sitio.
 *
 * Estaba escrita cuatro veces —el HUD en vuelo, el final del vuelo, el
 * ascenso de grado y el cuaderno— con los mismos números a mano, y ahora la
 * pintan los cuatro desde aquí.
 *
 * ## Las barras son el grado, y nunca más de cuatro
 *
 * Esta manga llegó a dibujar hasta seis barras: una por cada galón que se
 * ganaba en un vuelo. Seis barras no las lleva ningún uniforme, y el juego
 * enseñaba a contar algo que no significaba nada. Enrique: «Claro, que sea
 * real, y si hay varios modos, pues el más usado en LATAM–UE». Así que la
 * manga lleva **las barras del grado de quien juega**, con el esquema de
 * `barrasDe` en `flight/cuaderno.ts` —una, dos, tres o cuatro—, y lo que se
 * gana en cada vuelo es la hoja de la instructora, que es otra cosa y se
 * dibuja aparte. Ver `ui/hoja.ts`.
 *
 * Y el tope está aquí y no en quien llama: si mañana alguien le pasa a la
 * manga una cuenta que no es un grado, sale con cuatro barras como mucho, que
 * es lo más que lleva una manga de verdad.
 */

/** Lo más que lleva una manga: las cuatro de la comandante. */
export const BARRAS_MAXIMAS = 4;

/** El dibujo de la manga, en unidades de su lienzo. */
const TELA = { y: 2, alto: 28 } as const;
/** Dónde se apoya la barra de abajo, justo encima del puño. */
const LA_DE_ABAJO = 21;
/** La separación entre barras. Con cuatro, la de arriba cae en 4,5. */
const SEPARACION = 5.5;
/** Lo gorda que es una barra. */
const GORDA = 3.6;

/** Las barras que se dibujan de verdad: enteras, de cero a cuatro. */
export function barrasDeLaManga(barras: number): number {
  if (!Number.isFinite(barras)) return 0;
  return Math.min(BARRAS_MAXIMAS, Math.max(0, Math.round(barras)));
}

/**
 * La manga entera, en SVG.
 *
 * `animarDesde` es cuántas barras ya estaban puestas: las anteriores salen sin
 * animación y solo entra creciendo la nueva, que es como se enseña un ascenso
 * —la barra que se acaba de ganar— sin que las de antes salten a la vez. Ver
 * `galon-entra` en el CSS.
 */
export function manga(
  barras: number,
  alto: number,
  etiqueta: string,
  animarDesde = 0,
): string {
  const n = barrasDeLaManga(barras);
  const barra = (i: number): string =>
    `<rect class="manga__barra${i < animarDesde ? " manga__barra--ya" : ""}" x="9" y="${(
      LA_DE_ABAJO -
      i * SEPARACION
    ).toFixed(
      2,
    )}" width="30" height="${GORDA.toFixed(2)}" rx="${(GORDA / 2).toFixed(2)}" />`;
  return `
    <svg viewBox="0 0 48 ${alto}" role="img" aria-label="${etiqueta}">
      <rect class="manga__tela" x="4" y="${TELA.y}" width="40" height="${TELA.alto}" rx="6" />
      <rect class="manga__puno" x="4" y="24" width="40" height="6" rx="3" />
      ${Array.from({ length: n }, (_, i) => barra(i)).join("")}
    </svg>
  `;
}

/** El alto del lienzo donde cabe la manga, para quien la dibuje. */
export const MANGA_ALTO = 32;

/**
 * La manga con sus galones, dibujada en un solo sitio.
 *
 * Estaba escrita cuatro veces —el HUD en vuelo, el final del vuelo, el
 * ascenso de grado y el cuaderno— con los mismos números a mano, y en las
 * cuatro estaba mal a partir de la quinta barra: con `y = 21 − n·5,5` la
 * quinta cae en `−1` y la tela empieza en `2`, así que se salía por arriba, y
 * la sexta caía fuera del lienzo y **no se dibujaba**.
 *
 * Y hay seis galones, no cuatro: aproximación, frustrada, toma, aros,
 * velocidad y rodaje. O sea que la manga nunca pudo enseñar un vuelo redondo.
 * Se vio en vídeo, con cinco galones ganados y el quinto partido por el borde
 * de la tela.
 *
 * Ahora las barras se reparten: con cuatro o menos salen exactamente donde
 * salían —el caso de siempre no cambia de aspecto— y de la quinta en adelante
 * se juntan lo justo para caber en la misma tela.
 */

/** El dibujo de la manga, en unidades de su lienzo. */
const TELA = { y: 2, alto: 28 } as const;
/** Dónde se apoya la barra de abajo, justo encima del puño. */
const LA_DE_ABAJO = 21;
/** Y hasta dónde puede subir la de arriba sin comerse el borde de la tela. */
const LA_DE_ARRIBA = 4.5;
/** La separación de siempre, la que se ve con cuatro barras o menos. */
const SEPARACION = 5.5;
/** Lo gorda que es una barra cuando hay sitio de sobra. */
const GORDA = 3.6;
/** Y lo que se le deja de aire a la de al lado. */
const AIRE = 0.9;

/** Dónde y cómo de gorda va cada barra, con este número de barras. */
export function repartoDeBarras(barras: number): {
  paso: number;
  alto: number;
} {
  if (barras < 2) return { paso: SEPARACION, alto: GORDA };
  const paso = Math.min(
    SEPARACION,
    (LA_DE_ABAJO - LA_DE_ARRIBA) / (barras - 1),
  );
  return { paso, alto: Math.min(GORDA, paso - AIRE) };
}

/**
 * La manga entera, en SVG.
 *
 * `animarDesde` es cuántas barras ya estaban puestas: las anteriores salen sin
 * animación y solo entran creciendo las nuevas, que es lo que hace que los
 * galones «aparezcan de uno en uno» sin que salten todos a la vez cuando la
 * manga se repinta. Ver `galon-entra` en el CSS.
 */
export function manga(
  barras: number,
  alto: number,
  etiqueta: string,
  animarDesde = 0,
): string {
  const { paso, alto: grosor } = repartoDeBarras(barras);
  const barra = (n: number): string =>
    `<rect class="manga__barra${n < animarDesde ? " manga__barra--ya" : ""}" x="9" y="${(
      LA_DE_ABAJO -
      n * paso
    ).toFixed(
      2,
    )}" width="30" height="${grosor.toFixed(2)}" rx="${(grosor / 2).toFixed(2)}" />`;
  return `
    <svg viewBox="0 0 48 ${alto}" role="img" aria-label="${etiqueta}">
      <rect class="manga__tela" x="4" y="${TELA.y}" width="40" height="${TELA.alto}" rx="6" />
      <rect class="manga__puno" x="4" y="24" width="40" height="6" rx="3" />
      ${Array.from({ length: barras }, (_, i) => barra(i)).join("")}
    </svg>
  `;
}

/** El alto del lienzo donde cabe la manga, para quien la dibuje. */
export const MANGA_ALTO = 32;

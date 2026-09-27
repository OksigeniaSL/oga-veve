/**
 * **La manga de viento del HUD**: el viento dicho sin una letra.
 *
 * La pantalla de navegación pinta «010/12» en cian, que es lo que pone una de
 * verdad y lo que se aprende de Taguató para arriba. En Guyrami y en Tukã eso
 * no dice nada: son números, y a los cuatro años no se leen. Lo que sí se
 * entiende mirando es **una manga**, que además es la que se ve de verdad al
 * lado de la pista —el juego ya la pone en cada aeródromo, tiesa o colgando—.
 *
 * Así que la del HUD es esa misma manga **vista desde arriba**, con el morro
 * del avión hacia arriba de la pantalla:
 *
 * - **La boca mira de donde viene el viento.** Con viento de cara, la boca
 *   arriba y la cola hacia quien mira; con viento de cola, al revés. Es lo que
 *   hace la de la pista, y es lo que decide por dónde se despega.
 * - **Cuánto se infla dice la fuerza.** Cinco bandas naranjas y blancas, y
 *   cada una se llena con unos tres nudos: a quince, tiesa entera. Es la
 *   norma de las mangas de verdad —la de la FAA, AC 150/5345-27: extendida
 *   del todo a quince nudos—, así que quien aprenda a leer esta lee la del
 *   aeródromo.
 * - **En calma, cuelga.** Sin dirección que señalar, una manga flácida y gris
 *   junto a su mástil.
 *
 * Solo el dibujo: la cifra está en la pantalla de navegación, que es donde va
 * en una cabina, y en los peldaños que leen se sigue viendo allí.
 */

/** Cada cuántos nudos se llena una banda. Ver arriba. */
export const NUDOS_POR_BANDA = 3;

/** Las bandas de la manga: cinco, como las de verdad. */
export const BANDAS = 5;

/**
 * Cuántas bandas van infladas con este viento, de cero a cinco.
 *
 * Una banda se llena al pasar de la mitad de sus tres nudos: con uno y medio
 * ya se levanta la primera, que es lo que se ve en una manga de verdad con
 * una brisa que apenas se nota.
 */
export function bandasInfladas(nudos: number): number {
  if (!Number.isFinite(nudos) || nudos <= 0) return 0;
  return Math.max(0, Math.min(BANDAS, Math.floor(nudos / NUDOS_POR_BANDA + 0.5)));
}

/**
 * Hacia dónde apunta la boca en el dibujo, grados desde arriba y en el
 * sentido del reloj: de dónde viene el viento **respecto al morro**.
 */
export function bocaRespectoAlMorro(vientoDe: number, rumbo: number): number {
  return (((vientoDe - rumbo) % 360) + 360) % 360;
}

/** Largo de cada banda y anchura de la boca y de la cola, en el lienzo. */
const LARGO = 5;
const BOCA = 9;
const COLA = 4.5;
/** Dónde empieza la boca, desde el centro: la manga entera queda centrada. */
const ARRANQUE = -(BANDAS * LARGO) / 2;

/**
 * La manga en SVG, para un lienzo de 40 × 40.
 *
 * `boca` es la de `bocaRespectoAlMorro`, o `null` en calma. Las bandas sin
 * inflar se dibujan como la tela que cuelga: una línea gris fina que sigue a
 * la última llena, porque una manga a medio inflar no se acorta — se dobla.
 */
export function mangaDeViento(boca: number | null, nudos: number): string {
  const llenas = boca === null ? 0 : bandasInfladas(nudos);
  const giro = boca === null ? 0 : Math.round(boca);
  const ancho = (i: number): number => BOCA - ((BOCA - COLA) * i) / BANDAS;
  let tela = "";
  for (let i = 0; i < llenas; i++) {
    const y0 = ARRANQUE + i * LARGO;
    const y1 = y0 + LARGO;
    const a0 = ancho(i) / 2;
    const a1 = ancho(i + 1) / 2;
    tela += `<path class="manga-viento__banda manga-viento__banda--${
      i % 2 ? "blanca" : "naranja"
    }" d="M${-a0} ${y0} L${a0} ${y0} L${a1} ${y1} L${-a1} ${y1} Z" />`;
  }
  /*
   * Lo que no se infla, arrugado detrás de la última llena: la mitad de largo
   * y fino, que es como se ve desde arriba la tela que cuelga. Entera y recta
   * parecía un palo, y la manga medía lo mismo con viento que sin él; así,
   * con más viento se ve **más larga**, que es lo que hace la de verdad.
   */
  const desde = ARRANQUE + llenas * LARGO;
  const hasta = desde + (BANDAS - llenas) * LARGO * 0.5;
  const arranque = llenas ? ancho(llenas) / 2 : BOCA / 2;
  const floja =
    llenas < BANDAS
      ? `<path class="manga-viento__floja" d="M${-arranque * 0.6} ${desde} L${
          arranque * 0.6
        } ${desde} L0.6 ${hasta} L-0.6 ${hasta} Z" />`
      : "";
  // El mástil, en la boca: el punto fijo del que cuelga todo.
  const mastil = `<circle class="manga-viento__mastil" cx="0" cy="${ARRANQUE - 1.5}" r="2" />`;
  return `
    <svg class="manga-viento" viewBox="-20 -20 40 40" aria-hidden="true"
         data-bandas="${llenas}" data-boca="${boca === null ? "calma" : giro}">
      <circle class="manga-viento__fondo" r="19" />
      <g transform="rotate(${giro})">${floja}${tela}${mastil}</g>
    </svg>`;
}

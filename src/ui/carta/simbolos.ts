/**
 * Los símbolos de la carta, de la hoja de estilo de Gaudí (`simbolos/`), tal
 * cual llegaron: aquí solo se giran y se recortan por calco.
 *
 * Se meten en línea —`?raw`— y no como imagen porque giran: el grupo de la
 * pista de cada aeródromo va con el rumbo verdadero de su pista, y el norte
 * magnético de la rosa, con la declinación de hoy. Cambiar un símbolo es
 * cambiar su fichero.
 */

import CIVIL from "./simbolos/aerodromo-civil.svg?raw";
import PEQUENO from "./simbolos/aerodromo-pequeno.svg?raw";
import ROSA from "./simbolos/rosa-vientos.svg?raw";
import AVION from "./simbolos/avion-planta.svg?raw";
import COTA from "./simbolos/cota.svg?raw";

/** El SVG sin su papel de imagen suelta: aquí va dentro de un mapa mudo. */
const enLinea = (svg: string): string =>
  svg
    .replace(/ role="img"/, ' aria-hidden="true" focusable="false"')
    .replace(/ aria-label="[^"]*"/, "")
    // Un id repetido en cada aeródromo sería un id que no es único.
    .replace(/ id="([\w-]+)"/g, ' class="$1"');

const r2 = (n: number): string => (Math.round(n * 100) / 100).toString();

/**
 * **El aeródromo**, con su pista girada al rumbo verdadero.
 *
 * Civil —disco oscuro, pista blanca y cuatro pestañas— si tiene torre; el
 * pequeño —aro con la pista en contorno— si no. `rumbo` en grados verdaderos.
 */
export function simboloDeAerodromo(civil: boolean, rumbo: number): string {
  return enLinea(civil ? CIVIL : PEQUENO).replace(
    /(<g class="pista" transform=")rotate\([^)]*\)/,
    `$1rotate(${r2(((rumbo % 180) + 180) % 180)})`,
  );
}

/**
 * **La rosa.** El norte verdadero arriba, siempre; las cifras de cada treinta
 * grados y el norte magnético, solo cuando se piden —en el calco de la radio—.
 * `declinacion` en grados, positiva al este: girar −3,5 es 3,5° al oeste.
 */
export function rosa(declinacion: number | null, conCifras: boolean): string {
  let svg = enLinea(ROSA);
  if (!conCifras) svg = svg.replace(/<g transform="translate\([^)]*\)">[\s\S]*?<\/g>/g, "");
  svg =
    declinacion === null
      ? svg.replace(/<g class="norte-magnetico"[\s\S]*?<\/g>/, "")
      : svg.replace(
          /(<g class="norte-magnetico" transform=")rotate\([^)]*\)/,
          `$1rotate(${r2(declinacion)})`,
        );
  return svg;
}

/** El punto de una cota. */
export const PUNTO_DE_COTA = enLinea(COTA);

/**
 * **El avión en planta**, como trazado suelto para dibujarlo en un lienzo: el
 * halo de papel y el cuerpo, con el morro arriba. Sale del mismo fichero que
 * el resto, así que si se cambia el dibujo cambia también aquí.
 */
export const AVION_EN_PLANTA = (() => {
  const trazos = [...AVION.matchAll(/<path d="([^"]+)"([^>]*)\/>/g)];
  const color = (attrs: string, nombre: string): string | null =>
    attrs.match(new RegExp(`${nombre}="([^"]+)"`))?.[1] ?? null;
  const caja = AVION.match(/viewBox="([^"]+)"/)?.[1]?.split(/\s+/).map(Number) ?? [-17, -16, 34, 30];
  return {
    caja,
    halo: trazos[0]
      ? { d: trazos[0][1]!, color: color(trazos[0][2]!, "stroke") ?? "#f3efe3", grosor: Number(color(trazos[0][2]!, "stroke-width") ?? 4) }
      : null,
    cuerpo: trazos[1] ? { d: trazos[1][1]!, color: color(trazos[1][2]!, "fill") ?? "#22302a" } : null,
  };
})();

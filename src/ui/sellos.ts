/**
 * **Los sellos del cuaderno**: uno por campo donde se ha despegado o aterrizado.
 *
 * Es el punto 131 de la lista, con las palabras de Enrique: «un sello por
 * aeropuerto visitado, horas de vuelo en dibujo, y los galones que se ganan
 * con lo que significan». El cuaderno ya apuntaba los aeródromos —son la
 * cuenta que pide el grado de comandante— y los enseñaba como **un número**,
 * que a los cuatro años no es nada. Un sello sí: se reconoce sin leer, se
 * cuenta con el dedo y se le enseña a alguien.
 *
 * ## Cómo es un sello
 *
 * Como los de un pasaporte o los de la libreta de un piloto, y con tres cosas
 * de verdad dentro:
 *
 * - **La silueta de su isla, o de su país**, con un punto donde está el campo.
 *   Salen de Natural Earth —`siluetas.ts` y `rios.ts`, que son los mismos que
 *   dibujan el mapa del hangar—, no de un dibujo a mano: quien reconozca aquí
 *   La Palma la va a reconocer en un mapa.
 * - **La pista con sus números**, los de su cabecera: los mismos que van
 *   pintados en el asfalto y que dice la torre. Ver `designador` en
 *   `hangar.ts`. Un sello con un «09/27» inventado enseñaría a no fijarse.
 * - **Algo de su paisaje**: el Teide sobre el mar de nubes de Los Rodeos, la
 *   cúpula del observatorio de La Palma, las dunas de Corralejo, la sabina de
 *   El Hierro doblada por el viento, el Palacio de López, el puente de
 *   Encarnación… Una cosa que se ve allí y en ningún otro sitio del juego.
 *
 * La tinta dice de dónde es, como la de un pasaporte: roja la del Paraguay,
 * azul la de Canarias, morada la de Madrid y verde la de los dos sitios
 * inventados. Y la forma también, para quien no distingue colores: redondo en
 * Canarias, rectangular en el Paraguay, octogonal en Madrid y con el borde a
 * trazos en los inventados, que no son ningún sitio de verdad y no pueden
 * llevar el sello de uno — por eso tampoco llevan silueta.
 *
 * Cada sello sale un poco torcido, siempre igual para el mismo campo: así se
 * estampan, y una página de sellos rectos parece una tabla.
 *
 * Y solo están **los que se han ganado**. Un hueco vacío por cada campo que
 * falta sería una lista de deberes —la misma regla que los galones y las
 * gafas: lo que no se tiene, todavía no está—.
 *
 * Esto no toca el DOM: devuelve SVG, que se puede probar sin navegador.
 */

import type { Scenario } from "../world/scenarios";
import { SCENARIOS } from "../world/scenarios";
import { SILUETAS, type Anillo } from "./siluetas";
import { RIOS } from "./rios";
import { designador } from "./hangar";
import { caucho } from "./caucho";

/** La tinta del sello, que es la de su sitio. Ver la cabecera. */
export type Tinta = "py" | "canarias" | "madrid" | "inventado";

/** El dibujo del paisaje de cada campo, en un recuadro de 40 × 40. */
/** El dibujo del paisaje de cada campo, en un recuadro de 40 × 40. Ver `paisajes.ts`. */
export { PAISAJES } from "./paisajes";
import { PAISAJES } from "./paisajes";

export type Paisaje = keyof typeof PAISAJES;

/** Lo de cada campo: su tinta y su paisaje. */
interface DeUnCampo {
  readonly tinta: Tinta;
  readonly paisaje: Paisaje;
}

/**
 * **Los veinte campos del juego**, por el `id` de su escenario.
 *
 * Una entrada por escenario de `SCENARIOS`, y lo exige una prueba: un campo
 * nuevo sin su sello sería un sitio al que se vuela y que no queda en el
 * cuaderno.
 */
export const DE_CADA_CAMPO: Readonly<Record<string, DeUnCampo>> = {
  pettirossi: { tinta: "py", paisaje: "palacio" },
  guarani: { tinta: "py", paisaje: "salto" },
  encarnacion: { tinta: "py", paisaje: "puente" },
  concepcion: { tinta: "py", paisaje: "barco" },
  ayolas: { tinta: "py", paisaje: "pez" },
  pilar: { tinta: "py", paisaje: "yacare" },
  "pedro-juan": { tinta: "py", paisaje: "cerros" },
  estigarribia: { tinta: "py", paisaje: "borracho" },
  "yvytu-rape": { tinta: "py", paisaje: "vaca" },
  "valle-cordillera": { tinta: "inventado", paisaje: "lomas" },
  chaco: { tinta: "inventado", paisaje: "cactus" },
  "tenerife-norte": { tinta: "canarias", paisaje: "teide" },
  "tenerife-sur": { tinta: "canarias", paisaje: "vela" },
  "la-palma": { tinta: "canarias", paisaje: "observatorio" },
  "gran-canaria": { tinta: "canarias", paisaje: "nublo" },
  lanzarote: { tinta: "canarias", paisaje: "camello" },
  fuerteventura: { tinta: "canarias", paisaje: "dunas" },
  "el-hierro": { tinta: "canarias", paisaje: "sabina" },
  "la-gomera": { tinta: "canarias", paisaje: "laurisilva" },
  "cuatro-vientos": { tinta: "madrid", paisaje: "guadarrama" },
};

/**
 * **Los campos de los sellos ganados**, a partir de lo que guarda el cuaderno.
 *
 * El cuaderno apunta el identificador del aeródromo —«GCXO»— o, en los dos
 * sitios inventados que no tienen fichero de aeródromo, el del escenario. Ver
 * `apuntarElSitio` en `game.ts`. Uno por campo y en el orden en que se
 * ganaron; lo que no se reconozca —un campo que ya no está en el juego— no
 * sale, y no rompe nada.
 */
export function camposDeLosSellos(aerodromos: readonly string[]): Scenario[] {
  const salen: Scenario[] = [];
  for (const id of aerodromos) {
    const e = SCENARIOS.find((s) => s.aerodrome?.id === id || s.id === id);
    if (e && DE_CADA_CAMPO[e.id] && !salen.includes(e)) salen.push(e);
  }
  return salen;
}

/** El punto donde está el campo, en longitud y latitud, si lo tiene. */
function dondeEsta(e: Scenario): readonly [number, number] | null {
  const o = e.aerodrome?.origin;
  return o ? [o.lon, o.lat] : null;
}

/** Si un punto cae dentro de un anillo. Rayo hacia el este, de manual. */
function dentro(p: readonly [number, number], anillo: Anillo): boolean {
  let si = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i]!;
    const [xj, yj] = anillo[j]!;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi)
      si = !si;
  }
  return si;
}

/**
 * **La silueta de su sitio**: la isla que lo contiene, o el país entero.
 *
 * En Canarias, la isla donde cae el campo; en el Paraguay, el país, con sus
 * ríos grandes. Madrid no tiene silueta en los datos —de España solo se
 * extrajo Canarias— y los inventados no tienen sitio: sin silueta.
 */
export function siluetaDe(e: Scenario): { anillo: Anillo; rios: readonly Anillo[] } | null {
  const tinta = DE_CADA_CAMPO[e.id]?.tinta;
  const p = dondeEsta(e);
  if (!p) return null;
  if (tinta === "canarias") {
    const isla = SILUETAS.es.find((a) => dentro(p, a));
    return isla ? { anillo: isla, rios: [] } : null;
  }
  if (tinta === "py") {
    const pais = SILUETAS.py[0];
    // Los tres ríos que parten el país —el Paraguay, el Paraná, el
    // Pilcomayo— y no los arroyos: a este tamaño un arroyo es una mancha.
    return pais ? { anillo: pais, rios: RIOS.py.filter((r) => r.length >= 100) } : null;
  }
  return null;
}

/** Un ángulo de estampado, siempre el mismo para el mismo campo. */
function torcido(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  // Entre ocho grados a un lado y ocho al otro, y nunca recto del todo.
  const a = (Math.abs(h) % 15) - 7;
  return a === 0 ? 3 : a;
}

/**
 * **La isla de Canarias donde cae un punto**, con su silueta de Natural
 * Earth, o `null` si cae en el mar. La de los sellos de campo, y la de los
 * del cuaderno de viaje: ver `ui/sellos-del-viaje.ts`.
 */
export function islaDe(lon: number, lat: number): Anillo | null {
  return SILUETAS.es.find((a) => dentro([lon, lat], a)) ?? null;
}

/**
 * **Una silueta encajada en un hueco**: lo que convierte cada longitud y
 * latitud en un punto del dibujo, `"x,y"`.
 *
 * Con la longitud acortada por el coseno de la latitud: sin eso el Paraguay
 * sale ancho y las islas, chatas, que es justo lo que no se puede hacer con
 * una forma que se tiene que reconocer.
 */
export function encajarLaSilueta(
  anillo: Anillo,
  x: number,
  y: number,
  ancho: number,
  alto: number,
): (p: readonly [number, number]) => string {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [lon, lat] of anillo) {
    minX = Math.min(minX, lon);
    maxX = Math.max(maxX, lon);
    minY = Math.min(minY, lat);
    maxY = Math.max(maxY, lat);
  }
  const k = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
  const escala = Math.min(ancho / ((maxX - minX) * k), alto / (maxY - minY));
  const dx = x + (ancho - (maxX - minX) * k * escala) / 2;
  const dy = y + (alto - (maxY - minY) * escala) / 2;
  return ([lon, lat]) => `${(dx + (lon - minX) * k * escala).toFixed(1)},${(dy + (maxY - lat) * escala).toFixed(1)}`;
}

/** La silueta encajada en su hueco del sello, con el punto del campo. Ver `encajarLaSilueta`. */
function siluetaEnElSello(
  e: Scenario,
  x: number,
  y: number,
  ancho: number,
  alto: number,
): string {
  const s = siluetaDe(e);
  const p = dondeEsta(e);
  if (!s || !p) return "";
  const a = encajarLaSilueta(s.anillo, x, y, ancho, alto);
  const anillo = `M${s.anillo.map(a).join("L")}Z`;
  const rios = s.rios
    .map((r) => `<path class="estampa__rio" d="M${r.filter((_, i) => i % 2 === 0).map(a).join("L")}" />`)
    .join("");
  const [px, py] = a(p).split(",");
  return `
    <path class="estampa__silueta" d="${anillo}" />
    ${rios}
    <circle class="estampa__aqui" cx="${px}" cy="${py}" r="3.4" />
    <circle class="estampa__aqui-aro" cx="${px}" cy="${py}" r="6" />`;
}

/** El borde del sello, según su tinta. Ver la cabecera. */
function borde(tinta: Tinta): string {
  switch (tinta) {
    case "canarias":
      return `<circle class="estampa__borde" cx="60" cy="60" r="55" />
              <circle class="estampa__borde-fino" cx="60" cy="60" r="49" />`;
    case "py":
      return `<rect class="estampa__borde" x="6" y="12" width="108" height="96" rx="5" />
              <rect class="estampa__borde-fino" x="11" y="17" width="98" height="86" rx="3" />`;
    case "madrid":
      return `<path class="estampa__borde" d="M38 6 H82 L114 38 V82 L82 114 H38 L6 82 V38 Z" />
              <path class="estampa__borde-fino" d="M40 12 H80 L108 40 V80 L80 108 H40 L12 80 V40 Z" />`;
    case "inventado":
      return `<rect class="estampa__borde estampa__borde--trazos" x="8" y="14" width="104" height="92" rx="30" />`;
  }
}

/**
 * **La pista con sus números**, como se pinta: asfalto oscuro y la cifra en
 * blanco en cada punta, con la raya del eje en medio.
 */
function pista(escenario: Scenario, y: number): string {
  /*
   * **El número bajo, a la izquierda**: es el de la cabecera oeste. Una pista
   * 12/30 se pinta con el 12 en la punta del noroeste —desde ahí se despega
   * hacia el 120— y en una tira tumbada con el norte arriba, eso es la
   * izquierda. Los datos traen las dos cabeceras en cualquier orden.
   */
  const [una = "", otra = ""] = designador(escenario)
    .split("/")
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  // Las paralelas llevan su letra, «03L»: tres caracteres no caben a once.
  const largo = Math.max(una.length, otra.length) > 2;
  return `
    <rect class="estampa__pista" x="25" y="${y}" width="70" height="17" rx="2" />
    <path class="estampa__eje" d="M${largo ? 52 : 47} ${y + 8.5} H${largo ? 68 : 73}" />
    <text class="estampa__numero${largo ? " estampa__numero--paralela" : ""}" x="${largo ? 38 : 36}" y="${y + 12.6}" text-anchor="middle">${una}</text>
    <text class="estampa__numero${largo ? " estampa__numero--paralela" : ""}" x="${largo ? 82 : 84}" y="${y + 12.6}" text-anchor="middle">${otra}</text>`;
}

/**
 * **El sello de un campo**, en SVG.
 *
 * `nombre` es el del campo, para quien no ve la pantalla: el sello es una
 * imagen y necesita su nombre, que un lector de pantalla no pasa por la
 * escalera. Las letras del código OACI van estampadas arriba como en un
 * sello de verdad, en pequeño: son tinta, no algo que haya que leer.
 */
export function selloDe(escenario: Scenario, nombre: string): string {
  const campo = DE_CADA_CAMPO[escenario.id];
  if (!campo) return "";
  const conSilueta = siluetaDe(escenario) !== null;
  const codigo = escenario.aerodrome?.id ?? "";
  // El caucho: presión, bordes comidos y poros, siempre igual para el mismo campo. Ver caucho.ts.
  const goma = caucho(escenario.id, campo.tinta);
  /*
   * Con silueta, la silueta a la izquierda y el paisaje a la derecha; sin
   * ella, el paisaje en grande y en el medio, que es lo único que hay.
   */
  const paisaje = conSilueta
    ? `<g class="estampa__paisaje" transform="translate(60 32) scale(0.95)">${PAISAJES[campo.paisaje]}</g>`
    : `<g class="estampa__paisaje" transform="translate(38 30) scale(1.1)">${PAISAJES[campo.paisaje]}</g>`;
  return `
    <svg class="estampa estampa--${campo.tinta}" viewBox="0 0 120 120" role="img"
         aria-label="${nombre}" data-campo="${escenario.id}">
      ${goma.defs}
      <g mask="${goma.mascara}" transform="rotate(${torcido(escenario.id)} 60 60)">
        ${borde(campo.tinta)}
        ${codigo ? `<text class="estampa__codigo" x="60" y="28" text-anchor="middle">${codigo}</text>` : ""}
        ${conSilueta ? siluetaEnElSello(escenario, 20, 33, 38, 38) : ""}
        ${paisaje}
        ${pista(escenario, 76)}
      </g>
    </svg>`;
}

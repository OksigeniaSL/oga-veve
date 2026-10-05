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

/** La tinta del sello, que es la de su sitio. Ver la cabecera. */
export type Tinta = "py" | "canarias" | "madrid" | "inventado";

/** El dibujo del paisaje de cada campo, en un recuadro de 40 × 40. */
const PAISAJES = {
  /* Asunción: el Palacio de López, con su torre en el centro. */
  palacio: `
    <path class="estampa__tinte" d="M5 36 V24 H35 V36 Z" />
    <path d="M3 36 H37 M5 36 V24 H35 V36 M5 24 L20 19 L35 24
             M16 21 V12 H24 V21 M18 12 V8 H22 V12 M20 8 V4
             M9 34 V28 M13 34 V28 M27 34 V28 M31 34 V28" />`,
  /* Ciudad del Este: los Saltos del Monday, a un paso del campo. */
  salto: `
    <path class="estampa__tinte" d="M2 13 H15 L13 36 H2 Z M26 13 H38 V36 H28 Z" />
    <path d="M2 13 H15 L13 36 M38 13 H26 L28 36
             M17 13 Q19 14 19 20 V31 M21 13 Q23 14 23 20 V31 M25 13 Q24 15 24 20 V31
             M11 35 Q15 31 19 35 Q23 31 27 35 Q31 31 33 35" />`,
  /* Encarnación: el puente sobre el Paraná, con sus dos torres y sus tirantes. */
  puente: `
    <path d="M2 26 H38 M12 26 V9 M28 26 V9
             M12 10 L4 26 M12 10 L8 26 M12 10 L16 26 M12 10 L20 26
             M28 10 L20 26 M28 10 L24 26 M28 10 L32 26 M28 10 L36 26
             M3 33 Q7 30 11 33 Q15 30 19 33 Q23 30 27 33 Q31 30 35 33" />`,
  /* Concepción: el barco del río Paraguay, que llega al puerto. */
  barco: `
    <path class="estampa__tinte" d="M4 26 H36 L32 31 H8 Z" />
    <path d="M4 26 H36 L32 31 H8 Z M10 26 V20 H28 V26 M14 20 V15 H24 V20
             M19 15 V9 M12 23 H14 M18 23 H20 M24 23 H26
             M3 35 Q7 32 11 35 Q15 32 19 35 Q23 32 27 35 Q31 32 35 35" />`,
  /* Ayolas: el dorado saltando, en la capital de la pesca. */
  pez: `
    <path class="estampa__tinte" d="M7 25 Q14 9 28 13 Q22 22 7 25 Z" />
    <path d="M7 25 Q14 9 28 13 Q22 22 7 25 Z M28 13 L35 8 M28 13 L34 18
             M12 19 L14 22 M23 14.5 h0.1
             M3 33 Q7 30 11 33 Q15 30 19 33 Q23 30 27 33 Q31 30 35 33" />`,
  /* Pilar: el yacaré asomando en los esteros del Ñeembucú. */
  yacare: `
    <path class="estampa__tinte" d="M6 27 Q8 22 14 23 H33 Q36 24 34 27 Z" />
    <path d="M6 27 Q8 22 14 23 H33 Q36 24 34 27 M12 23 Q12 19 15 19 Q18 19 18 23
             M15 21 h0.1 M24 25 H30 M26 25 V24 M29 25 V24
             M3 31 Q7 28 11 31 Q15 28 19 31 Q23 28 27 31 Q31 28 37 31
             M36 27 V12 M36 16 Q33 14 33 11 M38 21 V14" />`,
  /* Pedro Juan Caballero: los cerros de Cerro Corá. */
  cerros: `
    <path class="estampa__tinte" d="M2 36 Q9 14 17 26 Q24 10 32 24 Q36 30 38 36 Z" />
    <path d="M2 36 Q9 14 17 26 Q24 10 32 24 Q36 30 38 36 M2 36 H38
             M9 36 V30 M9 30 Q6 28 9 25 Q12 28 9 30" />`,
  /* Mariscal Estigarribia: el palo borracho del Chaco, con su panza. */
  borracho: `
    <path class="estampa__tinte" d="M17 36 Q11 29 15 22 Q17 19 18.5 16 H21.5 Q23 19 25 22 Q29 29 23 36 Z
             M7 15 a6 6 0 0 1 7 -7 a7 7 0 0 1 12 0 a6 6 0 0 1 7 7 Z" />
    <path d="M17 36 Q11 29 15 22 Q17 19 18.5 16 M21.5 16 Q23 19 25 22 Q29 29 23 36 M4 36 H36
             M7 15 a6 6 0 0 1 7 -7 a7 7 0 0 1 12 0 a6 6 0 0 1 7 7 Z" />`,
  /* Yvytu Rape: la granja, con su vaca. */
  vaca: `
    <path class="estampa__tinte" d="M12 14 Q20 10 28 14 L27 30 Q20 35 13 30 Z" />
    <path d="M12 14 Q20 10 28 14 L27 30 Q20 35 13 30 Z M12 14 Q7 13 4 16 M28 14 Q33 13 36 16
             M13 12 Q11 7 14 5 M27 12 Q29 7 26 5
             M16 19 h0.1 M24 19 h0.1 M15 27 Q20 24 25 27 M18 28 h0.1 M22 28 h0.1" />`,
  /* El valle inventado: lomas verdes y un río que serpentea. */
  lomas: `
    <path class="estampa__tinte" d="M2 27 Q9 10 17 21 Q25 8 38 22 V27 Z" />
    <path d="M2 27 Q9 10 17 21 Q25 8 38 22 M2 27 H38
             M10 38 Q22 34 16 31 Q11 29 21 27 M16 38 Q28 34 22 31 Q17 29 27 27" />`,
  /* El Chaco inventado: llano hasta donde se ve, un cardón y el sol. */
  cactus: `
    <path d="M2 34 H38 M18 34 V12 Q18 9 20 9 Q22 9 22 12 V34
             M18 24 H14 Q12 24 12 22 V17 M22 21 H26 Q28 21 28 19 V15
             M31 10 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0" />`,
  /* Los Rodeos: el Teide por encima del mar de nubes de la laguna. */
  teide: `
    <path class="estampa__tinte" d="M5 28 L18 8 H22 L35 28 Z" />
    <path d="M5 28 L18 8 H22 L35 28 M18 8 L20 13 L22 8 M16 11 L20 15 L24 11
             M2 32 Q6 27 10 31 Q14 26 19 31 Q24 26 29 31 Q33 27 38 32 M2 32 H38" />`,
  /* Tenerife Sur: la vela del Médano y la Montaña Roja junto al mar. */
  vela: `
    <path class="estampa__tinte" d="M20 6 Q30 16 21 28 Z" />
    <path d="M20 6 Q30 16 21 28 Z M20 6 V29 M14 29 H28
             M2 36 Q6 33 10 36 Q14 33 18 36 Q22 33 26 36 Q30 33 34 36
             M2 29 L8 22 L12 29" />`,
  /* La Palma: las cúpulas del observatorio del Roque de los Muchachos. */
  observatorio: `
    <path class="estampa__tinte" d="M2 36 L16 20 L26 26 L38 36 Z" />
    <path d="M2 36 L16 20 L26 26 L38 36 Z M12 22 a5 5 0 0 1 10 0 Z M17 17 V15
             M24 25 a3.5 3.5 0 0 1 7 0 Z" />`,
  /* Gran Canaria: el Roque Nublo, el dedo de piedra de la cumbre. */
  nublo: `
    <path class="estampa__tinte" d="M2 36 L14 24 H26 L38 36 Z M17 24 V9 Q20 6 22 9 V24 Z" />
    <path d="M2 36 L14 24 H26 L38 36 M17 24 V9 Q20 6 22 9 V24
             M26 24 V19 Q27 17 28 19 V24" />`,
  /* Lanzarote: el camello de Timanfaya delante del volcán. */
  camello: `
    <path class="estampa__tinte" d="M27 24 L32 14 H35 L40 24 Z
             M4 21 Q6 11 11 11 Q15 11 16 16 L20 15 L23 8 L28 9 L27 11 L25 11 L23 19 Q21 22 17 22 H6 Q4 22 4 21 Z" />
    <path d="M27 24 L32 14 H35 L40 24
             M4 21 Q6 11 11 11 Q15 11 16 16 L20 15 L23 8 L28 9 L27 11 L25 11 L23 19 Q21 22 17 22 H6 Q4 22 4 21 Z
             M7 22 V32 M10 22 V32 M16 22 V32 M19 22 V32 M1 33 H39" />`,
  /* Fuerteventura: las dunas de Corralejo y su sol. */
  dunas: `
    <path class="estampa__tinte" d="M2 36 Q10 22 20 30 Q28 20 38 28 V36 Z" />
    <path d="M2 36 Q10 22 20 30 Q28 20 38 28 M8 33 Q12 30 16 33
             M28 10 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0
             M28 2 V0.5 M36 10 H37.5 M19 10 H20.5" />`,
  /* El Hierro: la sabina de El Sabinar, doblada por el viento. */
  sabina: `
    <path class="estampa__tinte" d="M12 14 Q22 8 37 12 Q30 20 16 20 Z" />
    <path d="M10 36 Q12 28 13 22 Q14 18 18 17 M12 14 Q22 8 37 12 Q30 20 16 20 Q11 19 12 14
             M3 36 H30 M22 26 H32 M26 30 H36" />`,
  /* La Gomera: el monte de laurisilva de Garajonay, entre la niebla. */
  laurisilva: `
    <path class="estampa__tinte" d="M5 22 a6 6 0 1 1 12 0 Z M14 18 a7 7 0 1 1 14 0 Z M24 22 a6 6 0 1 1 12 0 Z" />
    <path d="M5 22 a6 6 0 1 1 12 0 Z M14 18 a7 7 0 1 1 14 0 Z M24 22 a6 6 0 1 1 12 0 Z
             M11 22 V34 M21 18 V34 M30 22 V34 M2 34 H38 M4 27 H14 M26 29 H38" />`,
  /* Cuatro Vientos: la sierra de Guadarrama y la rosa de los cuatro vientos. */
  guadarrama: `
    <path class="estampa__tinte" d="M2 36 L10 22 L16 28 L24 16 L32 26 L38 22 V36 Z" />
    <path d="M2 36 L10 22 L16 28 L24 16 L32 26 L38 22 M21 20 L24 16 L27 20
             M10 2 L12 8 L18 10 L12 12 L10 18 L8 12 L2 10 L8 8 Z" />`,
} as const;

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
 * La silueta encajada en su hueco del sello, con el punto del campo.
 *
 * Con la longitud acortada por el coseno de la latitud: sin eso el Paraguay
 * sale ancho y las islas, chatas, que es justo lo que no se puede hacer con
 * una forma que se tiene que reconocer.
 */
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
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [lon, lat] of s.anillo) {
    minX = Math.min(minX, lon);
    maxX = Math.max(maxX, lon);
    minY = Math.min(minY, lat);
    maxY = Math.max(maxY, lat);
  }
  const k = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
  const escala = Math.min(ancho / ((maxX - minX) * k), alto / (maxY - minY));
  const dx = x + (ancho - (maxX - minX) * k * escala) / 2;
  const dy = y + (alto - (maxY - minY) * escala) / 2;
  const a = ([lon, lat]: readonly [number, number]): string =>
    `${(dx + (lon - minX) * k * escala).toFixed(1)},${(dy + (maxY - lat) * escala).toFixed(1)}`;
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
      <g transform="rotate(${torcido(escenario.id)} 60 60)">
        ${borde(campo.tinta)}
        ${codigo ? `<text class="estampa__codigo" x="60" y="28" text-anchor="middle">${codigo}</text>` : ""}
        ${conSilueta ? siluetaEnElSello(escenario, 20, 33, 38, 38) : ""}
        ${paisaje}
        ${pista(escenario, 76)}
      </g>
    </svg>`;
}

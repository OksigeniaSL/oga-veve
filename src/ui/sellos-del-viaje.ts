/**
 * **El cuaderno de viaje, dibujado**: un sello por cada cosa vista por la
 * ventanilla en el vuelo de pasaje, y su página.
 *
 * Qué se gana y cómo lo dicen `flight/lo-que-se-toca.ts` y
 * `flight/sellos-del-viaje.ts`; esto lo dibuja, con las piezas de los otros
 * dos cuadernos: el aro y la tinta de los sellos con nombre —ver `ui/album.ts`—
 * y la silueta de Natural Earth de los sellos de campo —ver `ui/sellos.ts`—.
 * No es un tercer estilo: es el mismo tampón.
 *
 * ## Cada sello es su dibujo
 *
 * Sin letras y sin números, que se juega sin saber leer: el motor de frente,
 * con su ventilador; el ala de perfil con el flap fuera, empujando el aire
 * hacia abajo; el avión sobre el mar de nubes; el Teide asomando por encima de
 * las nubes —el mismo del sello de Los Rodeos—; **La Gomera y La Palma con su
 * costa de verdad**, las de Natural Earth, que quien las reconozca aquí las
 * reconocerá en un mapa; las ruedas fuera, con su pata y su compuerta; y la
 * ladera de Mazo con sus fincas en bancales, sus casas y la torre de la
 * iglesia, sobre el mar.
 *
 * La tinta es la azul de Canarias, la de los sellos de campo de allí, y el
 * aro es redondo, que es la forma de Canarias para quien no distingue
 * colores. El nombre va en la etiqueta, para quien no ve la pantalla.
 *
 * ## La página: los ganados y los huecos
 *
 * Como el álbum, y por lo mismo: es una colección, y su gracia es ver cómo se
 * llena. Cada sello tiene su sitio, en el orden del vuelo, y el que falta es
 * su hueco a trazos, sin tachar ni candado ni porcentaje. Los que se acaban
 * de ganar se estampan al salir, uno detrás de otro.
 *
 * Esto no toca el DOM: devuelve SVG y HTML, que se pueden probar sin
 * navegador.
 */

import { t, type TranslationKey } from "../i18n";
import { SELLOS_DEL_VIAJE, type SelloDelViaje } from "../flight/lo-que-se-toca";
import { avionDeLado, HUECO, LLENO, TINTE, torcido, trazo } from "./album";
import { encajarLaSilueta, islaDe, PAISAJES } from "./sellos";

/** Un punto de cada isla, para encontrar su silueta: el Garajonay y el aeropuerto de La Palma. */
const GARAJONAY: readonly [number, number] = [-17.248, 28.11];
const AEROPUERTO_DE_LA_PALMA: readonly [number, number] = [-17.755, 28.626];

/**
 * **Una isla de Natural Earth en su hueco**, con un punto donde se dice: la
 * silueta teñida, su costa y, si se pide, el punto.
 */
function isla(punto: readonly [number, number], x: number, y: number, ancho: number, alto: number, aqui?: readonly [number, number]): string {
  const anillo = islaDe(punto[0], punto[1]);
  if (!anillo) return "";
  const a = encajarLaSilueta(anillo, x, y, ancho, alto);
  const d = `M${anillo.map(a).join("L")}Z`;
  const marca = aqui ? a(aqui).split(",") : null;
  return `<path ${TINTE} d="${d}" /><path ${trazo(1.3)} d="${d}" />${
    marca ? `<circle ${LLENO} cx="${marca[0]}" cy="${marca[1]}" r="1.7" />` : ""
  }`;
}

/** Las aspas del ventilador del motor, visto de frente: barridas, como las de verdad. */
function aspas(cx: number, cy: number, desde: number, hasta: number, cuantas: number): string {
  let d = "";
  for (let i = 0; i < cuantas; i++) {
    const a = (i / cuantas) * Math.PI * 2;
    const p = (r: number, g: number): string => `${(cx + r * Math.cos(g)).toFixed(2)} ${(cy + r * Math.sin(g)).toFixed(2)}`;
    d += `M${p(desde, a)} Q${p((desde + hasta) / 2, a + 0.28)} ${p(hasta, a + 0.5)} `;
  }
  return `<path ${trazo(1)} d="${d.trim()}" />`;
}

/**
 * **El dibujo de cada sello**, en un lienzo de cuarenta con el centro en el
 * medio y todo dentro de un círculo de diecinueve: así cabe dentro del aro,
 * como los del álbum.
 */
const DIBUJO: Readonly<Record<SelloDelViaje, () => string>> = {
  /* El motor de frente, colgado del ala por su pilón: el ventilador que se traga el aire. */
  motor: () => `
    <path ${trazo(2.2)} d="M3 7 H37" />
    <path ${TINTE} d="M17.5 7 H22.5 V10 H17.5 Z" />
    <path ${trazo(1.4)} d="M17.5 7 V10 M22.5 7 V10" />
    <circle ${TINTE} cx="20" cy="22" r="12.5" />
    <circle ${trazo(2.2)} cx="20" cy="22" r="12.5" />
    <circle ${trazo(1)} cx="20" cy="22" r="10.2" />
    ${aspas(20, 22, 3, 9.6, 12)}
    <circle ${LLENO} cx="20" cy="22" r="2.8" />`,
  /*
   * El ala de perfil, con el flap fuera por detrás y el aire que sale
   * empujado hacia abajo: así se sostiene, y con el flap, también despacio.
   */
  ala: () => `
    <path ${TINTE} d="M4 19 Q6 13.5 15 13 Q26 12.6 30 17 L30.5 20 Q20 21.5 9 21.2 Q4.4 21 4 19 Z" />
    <path ${trazo(1.6)} d="M4 19 Q6 13.5 15 13 Q26 12.6 30 17 L30.5 20 Q20 21.5 9 21.2 Q4.4 21 4 19 Z" />
    <path ${LLENO} d="M31.6 20.4 L37 25.6 L35.6 27 L30.6 22.2 Z" />
    <path ${trazo(1.1)} stroke-dasharray="2 2" d="M2 10 Q20 6.5 36 12" />
    <path ${trazo(1.4)} d="M31 30 Q33 33.5 33.5 37 M30.8 34.6 L33.5 37 L35.6 34" />`,
  /* El avión por encima del mar de nubes, que es lo que se ve desde la ventanilla. */
  nubes: () => `
    ${avionDeLado(21, 11, -6, 0.95)}
    <path ${TINTE} d="M2.5 27 a4.5 4.5 0 0 1 7.5 -3 a5.5 5.5 0 0 1 10 -1.5 a5 5 0 0 1 9 0.5 a4.5 4.5 0 0 1 8.5 4 Z" />
    <path ${trazo(1.5)} d="M2.5 27 a4.5 4.5 0 0 1 7.5 -3 a5.5 5.5 0 0 1 10 -1.5 a5 5 0 0 1 9 0.5 a4.5 4.5 0 0 1 8.5 4" />
    <path ${trazo(1.2)} d="M4 32 a4 4 0 0 1 7 -1.5 a5 5 0 0 1 9 -0.5 a4.5 4.5 0 0 1 8 0.5 a4 4 0 0 1 7.5 1.5" />`,
  /*
   * El Teide por encima del mar de nubes: el mismo del sello de Los Rodeos,
   * con su clase, que es la que le pone el trazo y el tinte.
   */
  teide: () => `<g class="estampa__paisaje" transform="translate(0 2)">${PAISAJES.teide}</g>`,
  /* La Gomera con su costa de verdad, y el silbo que cruza los barrancos. */
  gomera: () => `
    ${isla(GARAJONAY, 6, 9, 26, 24, GARAJONAY)}
    <path ${trazo(1.1)} d="M31 6.5 q2 2 0 4 M33.6 5 q3.4 3.5 0 7" />`,
  /* La Palma con su costa de verdad, y el avión que llega a su aeropuerto. */
  palma: () => `
    ${isla(AEROPUERTO_DE_LA_PALMA, 9, 3, 22, 34, AEROPUERTO_DE_LA_PALMA)}
    ${avionDeLado(31, 13, 24, 0.62)}`,
  /* Las ruedas fuera: la pata, la compuerta abierta y las dos ruedas, sobre la pista. */
  ruedas: () => `
    <path ${trazo(2.2)} d="M2 8 Q20 3.5 38 8" />
    <path ${trazo(1.3)} d="M23.5 8.5 L28 17" />
    <path ${trazo(2.6)} d="M18 7.5 V24" />
    <path ${trazo(1.4)} d="M18 14 L25 8.8" />
    <path ${trazo(2.2)} d="M11.5 25 H24.5" />
    <circle ${TINTE} cx="12.5" cy="28.5" r="6" />
    <circle ${trazo(2)} cx="12.5" cy="28.5" r="6" />
    <circle ${LLENO} cx="12.5" cy="28.5" r="1.8" />
    <circle ${TINTE} cx="23.5" cy="28.5" r="6" />
    <circle ${trazo(2)} cx="23.5" cy="28.5" r="6" />
    <circle ${LLENO} cx="23.5" cy="28.5" r="1.8" />
    <path ${trazo(1.2)} d="M3 36 H37" />`,
  /*
   * La ladera de Villa de Mazo: las fincas en bancales que suben, las casas
   * sueltas, la torre de la iglesia y el mar abajo, que es lo que se ve por
   * la ventanilla de Ara entrando a la pista.
   */
  mazo: () => `
    <path ${TINTE} d="M2 33 V24 Q15 17 38 7 V33 Z" />
    <path ${trazo(1.6)} d="M2 24 Q15 17 38 7" />
    <path ${trazo(1)} d="M4 30 Q16 25.5 37 15.5 M8 33 Q22 27.5 37 22" />
    <path ${LLENO} d="M8.5 27.6 v-2.6 l2 -1.8 l2 1.8 v2.6 Z M16.5 24.6 v-2.6 l2 -1.8 l2 1.8 v2.6 Z M24 27.8 v-2.6 l2 -1.8 l2 1.8 v2.6 Z" />
    <path ${LLENO} d="M28.6 18.8 v-6 l1.6 -2 l1.6 2 v6 Z" />
    <path ${trazo(1.2)} d="M2 37 q3 -2 6 0 t6 0 t6 0 t6 0 t6 0 t6 0" />`,
};

/** El nombre de cada sello, para quien no ve la pantalla. */
export const nombreDelSelloDelViaje = (id: SelloDelViaje): string => t(`inicio.viaje.sello.${id}` as TranslationKey);

/**
 * **Un sello del cuaderno de viaje**, en SVG: el aro de Canarias —uno grueso
 * y otro fino, redondos— y su dibujo dentro, torcido como sale de un tampón.
 */
export function dibujoDelSelloDelViaje(id: SelloDelViaje): string {
  return `<svg class="sello-del-viaje" viewBox="0 0 48 48" aria-hidden="true" data-sello-viaje="${id}">
    <g transform="rotate(${torcido(`viaje-${id}`)} 24 24)">
      <circle ${trazo(2.4)} cx="24" cy="24" r="21.4" />
      <circle ${trazo(0.9)} cx="24" cy="24" r="18.6" />
      <g transform="translate(6 6) scale(0.9)">${DIBUJO[id]()}</g>
    </g>
  </svg>`;
}

/**
 * **La página del viaje**: los ocho sitios en el orden del vuelo, los ganados
 * con su sello y los que faltan, un hueco. Los recién ganados llevan
 * `viaje__sello--nuevo`, que los estampa al salir, uno detrás de otro.
 */
export function paginaDelViaje(ganados: readonly SelloDelViaje[], nuevos: readonly SelloDelViaje[] = []): string {
  let orden = 0;
  const sitios = SELLOS_DEL_VIAJE.map((id) => {
    if (!ganados.includes(id)) return `<li class="viaje__sitio viaje__sitio--hueco" aria-hidden="true">${HUECO}</li>`;
    const nuevo = nuevos.includes(id);
    const estilo = nuevo ? ` style="--orden:${orden++}"` : "";
    return `<li class="viaje__sitio"><span class="viaje__sello${nuevo ? " viaje__sello--nuevo" : ""}" role="img"
      aria-label="${nombreDelSelloDelViaje(id)}"${estilo}>${dibujoDelSelloDelViaje(id)}</span></li>`;
  }).join("");
  return `<div class="viaje" role="group" aria-label="${t("inicio.viaje.titulo")}: ${ganados.length} / ${SELLOS_DEL_VIAJE.length}">
    <ul class="viaje__sellos">${sitios}</ul>
  </div>`;
}

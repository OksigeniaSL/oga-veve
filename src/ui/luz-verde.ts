/**
 * **Luz verde, en la pantalla**: el aeropuerto de La Palma visto desde arriba,
 * a la izquierda, y a la derecha la mesa de la torre con la lámpara de
 * señales. La lógica vive en `flight/luz-verde.ts`; esto la dibuja.
 *
 * ## Los contornos, los de verdad
 *
 * El norte arriba, como en cualquier mapa. La costa y las curvas de nivel de
 * cien, doscientos y trescientos metros salen del relieve medido del juego
 * —`data/terrain/la-palma.bin`, el MDT05 del PNOA-LiDAR del IGN, CC BY 4.0, ya
 * en `CREDITOS.md`—: la costa es donde la cota pasa de medio metro, buscada
 * fila a fila de este a oeste y simplificada a doce metros; las curvas, igual.
 * La pista, las calles, la plataforma y los edificios son los de
 * `gcla.aero.json`. La pista se pinta más ancha de lo que es —cuarenta y cinco
 * metros serían un hilo—, que es lo que hace cualquier carta, y lleva sus
 * números, el 36 abajo y el 18 arriba al revés, como se pintan de verdad.
 *
 * ## Con el estilo de las ilustraciones
 *
 * Colores cálidos de cuento —arena, ocre, el mar en verde azulado— y trazo de
 * lápiz: las curvas de nivel a trazos irregulares, la trama de la tierra y las
 * olas a rayitas. Los avioncitos llevan la librea de la flota —`LIBREA` en
 * `aircraft.ts`—: casco crema, la cola verde con el sol, la franja terracota
 * con su raya verde y las góndolas terracota del JAZ 90.
 *
 * ## Rendimiento
 *
 * Va encima del vuelo, que sigue corriendo (regla 6). Así que son dos capas:
 * el fondo, que se dibuja una vez y no se toca más, y lo que se mueve —unos
 * pocos grupos con su `transform`—, en otra capa encima. Sin filtros.
 */

import { t, type TranslationKey } from "../i18n";
import {
  AERODROMO_DE_LA_LUZ,
  ANCHO_DE_PISTA,
  RUMBO_DE_LA_PISTA,
  enLaPista,
  type EstadoDeLaLuz,
  type Senal,
} from "../flight/luz-verde";

const SVG = "http://www.w3.org/2000/svg";

/** Los colores: los de la casa y los de las ilustraciones. */
const C = {
  papel: "#f3ead8",
  tinta: "#2a1c14",
  mar: "#5f97a3",
  marHondo: "#4f8794",
  arena: "#dcc59a",
  lapiz: "#8a5a3a",
  asfalto: "#5a524a",
  plataforma: "#bdb2a0",
  edificio: "#efe3c8",
  crema: "#ecece6",
  terracota: "#be5d38",
  verdeCasa: "#2f5243",
  ocre: "#dd923f",
  sol: "#f2c230",
  mesa: "#d8b98a",
  verde: "#3fbf5f",
  roja: "#e0443a",
  blanco: "#ffffff",
} as const;

// ── De metros a la hoja ──────────────────────────────────────────────────

/** Lo que mide la hoja, y el mapa, que es la parte de la izquierda. */
const ANCHO = 640;
const ALTO = 340;
const MAPA = 460;
/**
 * **Nueve metros y medio por punto**, con la pista en la columna 150 y el
 * circuito entero a media altura: de la travesía, al norte, a la base, al sur.
 */
const ESCALA = 10.4;
const u = (x: number): number => 150 + x / ESCALA;
const v = (y: number): number => 170 - (y + 317) / ESCALA;
const pt = (p: readonly [number, number]): string => `${u(p[0]).toFixed(1)} ${v(p[1]).toFixed(1)}`;
const linea = (ps: readonly (readonly [number, number])[]): string => ps.map(pt).join(" L");

/**
 * **La costa y las curvas de nivel**, m del aeródromo —x al este, y al norte—,
 * de norte a sur. Sacadas del relieve medido: ver la cabecera.
 */
const COSTA: readonly (readonly [number, number])[] = [[-180,2000],[-200,1960],[-180,1920],[-100,1880],[-85,1840],[-165,1720],[-165,1640],[-100,1600],[-200,1560],[-200,1440],[-90,1400],[-100,1360],[-140,1320],[-130,1280],[110,1240],[140,1200],[155,760],[180,720],[155,680],[220,520],[195,480],[190,400],[195,200],[300,120],[275,40],[420,0],[510,-80],[475,-160],[540,-240],[500,-280],[500,-360],[540,-440],[550,-520],[515,-600],[540,-680],[475,-720],[460,-800],[355,-960],[355,-1080],[380,-1120],[340,-1160],[235,-1200],[220,-1280],[100,-1360],[115,-1400],[100,-1440],[-5,-1480],[-45,-1560],[-20,-1600],[-60,-1640],[-45,-1800],[-10,-1840],[-5,-1880],[60,-1920],[-50,-2040],[-60,-2080]];
const CURVAS: readonly (readonly (readonly [number, number])[])[] = [
  [[-550,2000],[-515,1880],[-550,1560],[-505,1480],[-495,1400],[-430,1360],[-410,1280],[-485,1200],[-545,1000],[-540,880],[-575,760],[-615,680],[-695,640],[-680,600],[-695,560],[-680,480],[-615,440],[-605,400],[-640,320],[-650,200],[-625,120],[-620,40],[-580,-40],[-585,-80],[-560,-120],[-570,-280],[-530,-360],[-590,-440],[-495,-640],[-525,-760],[-465,-960],[-480,-1080],[-515,-1160],[-530,-1400],[-485,-1560],[-490,-1640],[-440,-1680],[-375,-1840],[-380,-1960],[-340,-2080]],
  [[-1485,2000],[-1470,1960],[-1360,1920],[-1250,1800],[-1175,1640],[-1140,1600],[-1165,1560],[-1140,1480],[-1170,1440],[-1165,1400],[-1115,1360],[-1110,1240],[-1200,1080],[-1180,1000],[-1205,920],[-1205,760],[-1180,600],[-1190,560],[-1250,480],[-1235,360],[-1245,320],[-1285,280],[-1240,120],[-1185,80],[-1180,-80],[-1235,-240],[-1255,-440],[-1190,-480],[-1150,-560],[-1155,-640],[-1255,-760],[-1260,-840],[-1200,-1040],[-1205,-1120],[-1140,-1240],[-1130,-1360],[-1070,-1400],[-1050,-1480],[-945,-1560],[-965,-1800],[-905,-1920],[-845,-2000],[-775,-2040],[-760,-2080]],
  [[-1925,2000],[-1865,1800],[-1875,1720],[-1845,1600],[-1795,1520],[-1780,1440],[-1875,1320],[-1840,1280],[-1830,1200],[-1800,1160],[-1730,1120],[-1710,1080],[-1760,880],[-1825,800],[-1825,760],[-1800,640],[-1740,600],[-1715,400],[-1715,360],[-1765,280],[-1735,200],[-1770,160],[-1715,-80],[-1745,-120],[-1740,-160],[-1790,-200],[-1790,-240],[-1670,-480],[-1690,-560],[-1790,-640],[-1820,-720],[-1785,-760],[-1760,-840],[-1770,-880],[-1835,-960],[-1835,-1040],[-1875,-1120],[-1855,-1280],[-1785,-1360],[-1730,-1520],[-1710,-1640],[-1155,-1680],[-1160,-1720],[-1280,-1800],[-1400,-1840],[-1360,-1920],[-1365,-2000],[-1255,-2040],[-1235,-2080]],
];
/** La manga de viento de la cabecera 36, de verdad, y el alisio del escenario: del 035. */
const MANGA: readonly [number, number] = [92.7, -825.4];
const VIENTO_DE = 35;

// ── El fondo ─────────────────────────────────────────────────────────────

/** **La pista**, con sus números, su eje y los umbrales: lo que se ve desde arriba. */
function pista(): string {
  const [a, b] = AERODROMO_DE_LA_LUZ.pista;
  const ancho = 10;
  const giro = (RUMBO_DE_LA_PISTA * 180) / Math.PI;
  const numero = (p: readonly [number, number], texto: string, vuelta: number): string =>
    `<text transform="translate(${pt(p)}) rotate(${(giro + vuelta).toFixed(1)})" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif" font-weight="800" font-size="6.5" fill="${C.blanco}">${texto}</text>`;
  const umbral = AERODROMO_DE_LA_LUZ.umbral;
  const barra = (p: readonly [number, number]): string =>
    `<path d="M${(u(p[0]) - ancho / 2 + 1).toFixed(1)} ${v(p[1]).toFixed(1)} h${ancho - 2}" stroke="${C.blanco}" stroke-width="1.6"/>`;
  return `<g class="luz-pista">
<path d="M${pt(a)} L${pt(b)}" stroke="${C.tinta}" stroke-width="${ancho + 2.4}" stroke-linecap="butt"/>
<path d="M${pt(a)} L${pt(b)}" stroke="${C.asfalto}" stroke-width="${ancho}" stroke-linecap="butt"/>
<path d="M${pt(enLaPista(40, 0))} L${pt(enLaPista(1950, 0))}" stroke="${C.blanco}" stroke-width="0.9" stroke-dasharray="5 4" opacity=".9"/>
${barra(umbral)}${barra(b)}
<path d="M${pt(a)} L${pt(umbral)}" stroke="${C.blanco}" stroke-width="0.8" stroke-dasharray="1.5 2.5" opacity=".7"/>
${numero(enLaPista(25, 0), "36", 0)}${numero(enLaPista(2060, 0), "18", 180)}
</g>
<!-- Ancho de verdad, para quien lo mire: ${ANCHO_DE_PISTA} m. -->`;
}

function fondo(): string {
  const tierra = `M${linea(COSTA)} L${pt([-2400, -2100])} L${pt([-2400, 2100])} Z`;
  const a = AERODROMO_DE_LA_LUZ;
  const manga = (() => {
    // La manga apunta hacia donde va el viento: del 035, hacia el 215.
    const giro = VIENTO_DE + 180 - 90;
    return `<g transform="translate(${pt(MANGA)}) rotate(${giro})"><path d="M0 0 v-6" stroke="${C.tinta}" stroke-width="1"/><path d="M0 -6 l9 1.2 v2.2 l-9 1.4z" fill="${C.ocre}" stroke="${C.tinta}" stroke-width=".7"/><path d="M3 -5.6 v3.4 M6 -5.2 v2.6" stroke="${C.blanco}" stroke-width="1.2"/></g>`;
  })();
  return `<svg class="luz-capa luz-fondo" viewBox="0 0 ${ANCHO} ${ALTO}" xmlns="${SVG}" aria-hidden="true">
<defs>
<pattern id="luz-olas" width="34" height="18" patternUnits="userSpaceOnUse"><path d="M2 6 q4 -3 8 0 M18 14 q4 -3 8 0" fill="none" stroke="${C.blanco}" stroke-width="1" opacity=".45" stroke-linecap="round"/></pattern>
<pattern id="luz-trama" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0 v7" stroke="${C.lapiz}" stroke-width=".8" opacity=".22"/></pattern>
<clipPath id="luz-recorte"><rect width="${MAPA}" height="${ALTO}" rx="16"/></clipPath>
</defs>
<rect width="${ANCHO}" height="${ALTO}" rx="16" fill="${C.mesa}"/>
<g clip-path="url(#luz-recorte)">
<rect width="${MAPA}" height="${ALTO}" fill="${C.mar}"/>
<rect width="${MAPA}" height="${ALTO}" fill="url(#luz-olas)"/>
<path d="${tierra}" fill="${C.arena}"/>
<path d="${tierra}" fill="url(#luz-trama)"/>
${CURVAS.map((c, i) => `<path d="M${linea(c)}" fill="none" stroke="${C.lapiz}" stroke-width="${1.3 - i * 0.2}" stroke-dasharray="7 2 3 2" opacity=".55" stroke-linejoin="round"/>`).join("")}
<path d="M${linea(COSTA)}" fill="none" stroke="${C.blanco}" stroke-width="5" opacity=".5" stroke-linejoin="round"/>
<path d="M${linea(COSTA)}" fill="none" stroke="${C.tinta}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
<path d="M${linea(a.plataforma)} Z" fill="${C.plataforma}" stroke="${C.tinta}" stroke-width=".8"/>
${a.calles.map((c) => `<path d="M${linea(c)}" fill="none" stroke="${C.plataforma}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}
${a.edificios.map((e) => `<path d="M${linea(e)} Z" fill="${C.edificio}" stroke="${C.tinta}" stroke-width=".9" stroke-linejoin="round"/>`).join("")}
${pista()}
${manga}
<path d="M${linea(a.vuelta)}" fill="none" stroke="${C.papel}" stroke-width="1.6" stroke-dasharray="2 7" stroke-linecap="round" opacity=".75"/>
<g transform="translate(26 312)"><circle r="15" fill="${C.papel}" stroke="${C.tinta}" stroke-width="1.6"/><path d="M0 -11 l5 12 l-5 -3 l-5 3z" fill="${C.terracota}" stroke="${C.tinta}" stroke-width="1"/><text y="9" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="7" fill="${C.tinta}">N</text></g>
</g>
<rect x="1.5" y="1.5" width="${MAPA - 3}" height="${ALTO - 3}" rx="15" fill="none" stroke="${C.tinta}" stroke-width="3"/>
${PLAN_B}
</svg>`;
}

/**
 * **El plan B, sin palabras**: la radio con sus ondas tachadas, una flecha y
 * la lámpara con su luz verde y roja. Es lo que cuenta Ara al empezar, y está
 * a la vista mientras se juega.
 */
const PLAN_B = `<g class="luz-plan-b" transform="translate(470 14)">
<rect x="0" y="0" width="160" height="74" rx="12" fill="${C.papel}" stroke="${C.tinta}" stroke-width="2"/>
<g transform="translate(12 18)">
<path d="M10 0 l-6 -10" stroke="${C.tinta}" stroke-width="2" stroke-linecap="round"/>
<rect x="0" y="0" width="34" height="24" rx="5" fill="${C.ocre}" stroke="${C.tinta}" stroke-width="2"/>
<circle cx="11" cy="12" r="6" fill="${C.papel}" stroke="${C.tinta}" stroke-width="1.5"/>
<path d="M22 7 h8 M22 12 h8 M22 17 h8" stroke="${C.tinta}" stroke-width="1.5"/>
<path d="M38 4 q5 8 0 16 M43 0 q8 12 0 24" fill="none" stroke="${C.tinta}" stroke-width="1.8" stroke-linecap="round"/>
<path d="M-3 -6 L48 30 M48 -6 L-3 30" stroke="${C.roja}" stroke-width="4.5" stroke-linecap="round"/>
</g>
<path d="M70 37 h18 m-6 -6 l6 6 l-6 6" fill="none" stroke="${C.tinta}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
<g transform="translate(96 26)">
<rect x="0" y="0" width="22" height="20" rx="4" fill="${C.verdeCasa}" stroke="${C.tinta}" stroke-width="2"/>
<rect x="6" y="20" width="7" height="12" rx="2" fill="${C.verdeCasa}" stroke="${C.tinta}" stroke-width="1.6"/>
<circle cx="24" cy="10" r="6" fill="${C.sol}" stroke="${C.tinta}" stroke-width="1.6"/>
<path d="M30 6 L56 -6 L56 14 Z" fill="${C.verde}" opacity=".75"/>
<path d="M30 14 L56 18 L56 36 Z" fill="${C.roja}" opacity=".7"/>
</g>
</g>`;

// ── Lo que se mueve ──────────────────────────────────────────────────────

/** **El avioncito**, de la flota, mirando a la derecha. Las alas aparte, que son las que alabean. */
const ALAS = `<path d="M6 0 L-5 -18 L-11 -18 L-5 0 L-11 18 L-5 18 Z" fill="${C.crema}" stroke="${C.tinta}" stroke-width="1.4" stroke-linejoin="round"/>
<rect x="-2" y="-10.5" width="8" height="3.6" rx="1.8" fill="${C.terracota}" stroke="${C.tinta}" stroke-width=".9"/>
<rect x="-2" y="6.9" width="8" height="3.6" rx="1.8" fill="${C.terracota}" stroke="${C.tinta}" stroke-width=".9"/>`;
const CUERPO = `<path d="M-14 0 L-18.5 -7.5 L-21.5 -7.5 L-19.5 0 L-21.5 7.5 L-18.5 7.5 Z" fill="${C.crema}" stroke="${C.tinta}" stroke-width="1.1" stroke-linejoin="round"/>
<path d="M18 0 q0 -3.4 -5.5 -3.4 h-27 q-6 0 -6 3.4 q0 3.4 6 3.4 h27 q5.5 0 5.5 -3.4z" fill="${C.crema}" stroke="${C.tinta}" stroke-width="1.4"/>
<path d="M-15 1.7 h27" stroke="${C.terracota}" stroke-width="1.5"/><path d="M-15 2.9 h26" stroke="${C.verdeCasa}" stroke-width=".7"/>
<path d="M14 -1.6 q2.2 .6 2.6 1.6" fill="none" stroke="${C.tinta}" stroke-width="1"/>
<path d="M-20.5 -1 L-15 -1 L-17.5 -11 L-22 -11 Z" fill="${C.verdeCasa}" stroke="${C.tinta}" stroke-width="1" stroke-linejoin="round"/>
<circle cx="-18.8" cy="-6.6" r="1.7" fill="${C.sol}"/>`;
/** Su sombra en el suelo o en el mar: más lejos cuanto más alto. */
const SOMBRA = `<path d="M18 0 q0 -3.4 -5.5 -3.4 h-6 L-5 -18 L-11 -18 L-8 -3.4 h-7 L-18.5 -7.5 L-21.5 -7.5 L-20 0 L-21.5 7.5 L-18.5 7.5 L-15 3.4 h7 L-11 18 L-5 18 L6.5 3.4 h6 q5.5 0 5.5 -3.4z" fill="${C.tinta}" opacity=".22"/>`;
/** Las luces de navegación, de noche: roja en el ala izquierda, verde en la derecha, blanca atrás. */
const DE_NOCHE = `<g class="luz-avion__noche"><circle cx="-11" cy="-18" r="1.8" fill="${C.roja}"/><circle cx="-11" cy="18" r="1.8" fill="${C.verde}"/><circle cx="-21.5" cy="0" r="1.5" fill="${C.blanco}"/>
<g class="luz-avion__faros"><circle cx="3" cy="-4.5" r="5" fill="${C.blanco}" opacity=".55"/><circle cx="3" cy="4.5" r="5" fill="${C.blanco}" opacity=".55"/><circle cx="3" cy="-4.5" r="1.8" fill="${C.blanco}"/><circle cx="3" cy="4.5" r="1.8" fill="${C.blanco}"/></g></g>`;
/** La radio rota, encima de los que no tienen; y la radio que habla, encima de los que sí. */
const SIN_RADIO = `<g class="luz-radio luz-radio--rota"><rect x="-8" y="-6" width="16" height="11" rx="2.5" fill="${C.ocre}" stroke="${C.tinta}" stroke-width="1.2"/><path d="M-4 -6 l-3 -5" stroke="${C.tinta}" stroke-width="1.2"/><path d="M-10 -9 L10 8 M10 -9 L-10 8" stroke="${C.roja}" stroke-width="2.6" stroke-linecap="round"/></g>`;
const CON_RADIO = `<g class="luz-radio"><rect x="-8" y="-6" width="16" height="11" rx="2.5" fill="${C.ocre}" stroke="${C.tinta}" stroke-width="1.2"/><path d="M-4 -6 l-3 -5" stroke="${C.tinta}" stroke-width="1.2"/><g class="luz-radio__ondas"><path d="M10 -5 q3 4.5 0 9 M13.5 -8 q5 7.5 0 15" fill="none" stroke="${C.tinta}" stroke-width="1.4" stroke-linecap="round"/></g></g>`;

/** **La lámpara de señales** de la torre, mirando a la derecha: el cuerpo, el asa y el gatillo. */
const LAMPARA = `<rect x="-16" y="-12" width="44" height="24" rx="7" fill="${C.verdeCasa}" stroke="${C.tinta}" stroke-width="2.2"/>
<path d="M-6 12 l-4 18 h10 l3 -18" fill="${C.verdeCasa}" stroke="${C.tinta}" stroke-width="2" stroke-linejoin="round"/>
<path d="M4 12 q4 6 0 10" fill="none" stroke="${C.tinta}" stroke-width="2"/>
<path d="M-12 -12 v-5 h20 v5" fill="none" stroke="${C.tinta}" stroke-width="2"/>
<rect x="26" y="-14" width="8" height="28" rx="3" fill="${C.tinta}"/>
<circle class="luz-lampara__lente" cx="33" cy="0" r="10" fill="${C.papel}" stroke="${C.tinta}" stroke-width="2"/>`;
/** Dónde está la lámpara, en la mesa, y lo largo hasta su lente. */
const LAMPARA_EN: readonly [number, number] = [540, 152];
const HASTA_LA_LENTE = 34;

/** **Los botones de la lámpara**: dónde va cada luz en la mesa, con dos o con cuatro. */
function botones(luces: readonly Senal[]): readonly { senal: Senal; x: number; y: number; r: number }[] {
  if (luces.length <= 2) return [{ senal: "verde", x: 505, y: 270, r: 34 }, { senal: "roja", x: 590, y: 270, r: 34 }];
  return [
    { senal: "verde", x: 505, y: 232, r: 26 },
    { senal: "roja", x: 590, y: 232, r: 26 },
    { senal: "verde-destellos", x: 505, y: 299, r: 26 },
    { senal: "roja-destellos", x: 590, y: 299, r: 26 },
  ];
}
const colorDe = (s: Senal): string => (s.startsWith("verde") ? C.verde : C.roja);
const destellos = (s: Senal): boolean => s.endsWith("destellos");

function boton(b: { senal: Senal; x: number; y: number; r: number }): string {
  const rayos = destellos(b.senal)
    ? Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        const r0 = b.r + 3;
        const r1 = b.r + 9;
        return `M${(Math.cos(a) * r0).toFixed(1)} ${(Math.sin(a) * r0).toFixed(1)} L${(Math.cos(a) * r1).toFixed(1)} ${(Math.sin(a) * r1).toFixed(1)}`;
      }).join(" ")
    : "";
  return `<g class="luz-boton${destellos(b.senal) ? " luz-boton--destellos" : ""}" data-luz-senal="${b.senal}" transform="translate(${b.x} ${b.y})" role="button" tabindex="0" aria-label="${t(`inicio.kit.luz.${b.senal}` as TranslationKey)}">
<circle r="${b.r + 10}" fill="transparent"/>
${rayos ? `<path class="luz-boton__rayos" d="${rayos}" stroke="${colorDe(b.senal)}" stroke-width="3" stroke-linecap="round"/>` : ""}
<circle class="luz-boton__aro" r="${b.r}" fill="${C.tinta}"/>
<circle class="luz-boton__luz" r="${b.r - 6}" fill="${colorDe(b.senal)}" stroke="${C.papel}" stroke-width="2.5"/>
<circle cx="${-(b.r * 0.3).toFixed(1)}" cy="${-(b.r * 0.3).toFixed(1)}" r="${(b.r * 0.22).toFixed(1)}" fill="${C.blanco}" opacity=".55"/>
</g>`;
}

/** **La hoja entera**: el fondo y la capa de lo que se mueve. */
export function hojaDeLaLuz(luces: readonly Senal[]): string {
  return `<div class="kit-hoja kit-hoja--luz luz" aria-label="${t("inicio.kit.luz")}">
${fondo()}
<svg class="luz-capa luz-vivo" viewBox="0 0 ${ANCHO} ${ALTO}" xmlns="${SVG}">
<defs><clipPath id="luz-recorte-vivo"><rect width="${MAPA}" height="${ALTO}" rx="16"/></clipPath></defs>
<g clip-path="url(#luz-recorte-vivo)">
<rect class="luz-noche" width="${MAPA}" height="${ALTO}" fill="#16203a" opacity="0"/>
<g class="luz-luces-de-pista">${Array.from({ length: 12 }, (_, i) => {
    const a = -142 + (i * 2258) / 11;
    return `<circle cx="${u(enLaPista(a, -30)[0]).toFixed(1)}" cy="${v(enLaPista(a, -30)[1]).toFixed(1)}" r="1.2" fill="#ffe9a8"/><circle cx="${u(enLaPista(a, 30)[0]).toFixed(1)}" cy="${v(enLaPista(a, 30)[1]).toFixed(1)}" r="1.2" fill="#ffe9a8"/>`;
  }).join("")}</g>
<g class="luz-camion" visibility="hidden"><rect x="-7" y="-3.6" width="14" height="7.2" rx="1.5" fill="${C.roja}" stroke="${C.tinta}" stroke-width="1"/><rect x="3" y="-3" width="3" height="6" fill="${C.papel}" opacity=".8"/><circle class="luz-camion__girofaro" cx="-1" cy="0" r="1.8" fill="${C.ocre}"/></g>
<g class="luz-aviones"></g>
</g>
<polygon class="luz-haz" points="0,0 0,0 0,0" visibility="hidden"/>
<g class="luz-lampara" transform="translate(${LAMPARA_EN[0]} ${LAMPARA_EN[1]})"><g class="luz-lampara__giro">${LAMPARA}</g></g>
${botones(luces).map(boton).join("")}
</svg>
</div>`;
}

/** **Un avión nuevo en la capa**: su sombra, su cuerpo y lo que lleva encima. */
function avionNuevo(id: number, radio: boolean): SVGGElement {
  const g = document.createElementNS(SVG, "g");
  g.setAttribute("class", "luz-avion");
  g.setAttribute("data-luz-avion", String(id));
  g.setAttribute("role", "button");
  g.setAttribute("tabindex", "0");
  g.setAttribute("aria-label", t(radio ? "inicio.kit.luz.conRadio" : "inicio.kit.luz.sinRadio"));
  g.innerHTML = `<circle class="luz-avion__toque" r="30" fill="transparent"/>
<circle class="luz-avion__pide" r="27" fill="none" stroke-width="4"/>
<circle class="luz-avion__apunta" r="24" fill="none" stroke="${C.tinta}" stroke-width="1.8" stroke-dasharray="5 4"/>
<g class="luz-avion__sombra">${SOMBRA}</g>
<circle class="luz-avion__brillo" r="20" opacity="0"/>
<g class="luz-avion__giro"><g class="luz-avion__alas">${ALAS}</g>${CUERPO}${DE_NOCHE}</g>
<g class="luz-avion__radio" transform="translate(0 -27)">${radio ? CON_RADIO : SIN_RADIO}</g>
<g class="luz-avion__fiesta"></g>`;
  return g;
}

/** Las estrellitas de un aterrizaje, y la flecha de «otra vuelta» de un al aire. */
const ESTRELLITAS = Array.from({ length: 6 }, (_, i) => {
  const a = (i * Math.PI) / 3;
  return `<path class="luz-estrellita" style="--dx:${(Math.cos(a) * 26).toFixed(0)}px;--dy:${(Math.sin(a) * 26).toFixed(0)}px" d="M0 -5 l1.5 3.4 3.7 .4 -2.8 2.5 .8 3.6 -3.2 -1.9 -3.2 1.9 .8 -3.6 -2.8 -2.5 3.7 -.4z" fill="${C.sol}" stroke="${C.tinta}" stroke-width=".8"/>`;
}).join("");
const OTRA_VUELTA = `<g class="luz-otra-vuelta"><path d="M-14 -4 a14 14 0 1 1 4 12" fill="none" stroke="${C.verde}" stroke-width="4" stroke-linecap="round"/><path d="M-19 4 l9 5 l1 -10z" fill="${C.verde}"/>${ESTRELLITAS}</g>`;

/**
 * **Lo que se pinta en cada fotograma**: dónde va cada avión, si alabea o
 * enciende los faros, la luz encendida, lo que pide luz y la fiesta. Solo
 * `transform`, atributos y clases: la capa de abajo no se toca.
 */
export class PintorDeLaLuz {
  private readonly aviones = new Map<number, SVGGElement>();
  private readonly capa: SVGGElement | null;
  private readonly haz: SVGPolygonElement | null;
  private readonly lampara: SVGGElement | null;
  private readonly camion: SVGGElement | null;
  private fiesta = "";
  private giro = 180;

  constructor(private readonly hoja: HTMLElement) {
    this.capa = hoja.querySelector<SVGGElement>(".luz-aviones");
    this.haz = hoja.querySelector<SVGPolygonElement>(".luz-haz");
    this.lampara = hoja.querySelector<SVGGElement>(".luz-lampara__giro");
    this.camion = hoja.querySelector<SVGGElement>(".luz-camion");
  }

  pintar(e: EstadoDeLaLuz): void {
    const raiz = this.hoja.querySelector(".luz");
    raiz?.classList.toggle("luz--noche", e.noche);
    raiz?.classList.toggle("kit-hoja--hecha", e.terminado);
    const vivos = new Set<number>();
    for (const a of e.aviones) {
      vivos.add(a.id);
      let g = this.aviones.get(a.id);
      if (!g) {
        g = avionNuevo(a.id, a.radio);
        this.capa?.appendChild(g);
        this.aviones.set(a.id, g);
      }
      const x = u(a.x);
      const y = v(a.y);
      const escala = 0.7 + 0.4 * Math.max(a.altura, a.enVuelo ? 0.3 : 0);
      g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      g.style.opacity = a.aparece.toFixed(2);
      const giro = g.querySelector(".luz-avion__giro");
      giro?.setAttribute("transform", `rotate(${((a.rumbo * 180) / Math.PI - 90).toFixed(1)}) scale(${escala.toFixed(2)})`);
      g.querySelector(".luz-avion__sombra")?.setAttribute(
        "transform",
        `translate(${(7 * a.altura).toFixed(1)} ${(10 * a.altura).toFixed(1)}) rotate(${((a.rumbo * 180) / Math.PI - 90).toFixed(1)}) scale(${(escala * 0.95).toFixed(2)})`,
      );
      // **Alabea para contestar**: dos veces, de un lado y del otro, que desde arriba se ve en lo que miden las alas.
      const alas = g.querySelector(".luz-avion__alas");
      const k = a.acuse?.tipo === "alas" ? 1 - 0.55 * Math.abs(Math.sin(a.acuse.t * Math.PI * 2)) : 1;
      alas?.setAttribute("transform", `scale(1 ${k.toFixed(2)})`);
      // **De noche, los faros**: se apagan y se encienden dos veces.
      const faros = a.acuse?.tipo === "faros" && ((a.acuse.t > 0.1 && a.acuse.t < 0.3) || (a.acuse.t > 0.5 && a.acuse.t < 0.7));
      g.classList.toggle("luz-avion--faros-apagados", !!faros);
      g.classList.toggle("luz-avion--en-tierra", !a.enVuelo);
      g.classList.toggle("luz-avion--apuntado", e.apunta === a.id);
      g.classList.toggle("luz-avion--pide", a.pide !== null);
      g.classList.toggle("luz-avion--habla", a.hablando);
      g.classList.toggle("luz-avion--autorizado", a.autorizado && a.enVuelo);
      const pide = g.querySelector(".luz-avion__pide");
      if (a.pide) pide?.setAttribute("stroke", colorDe(a.pide));
      const brillo = g.querySelector(".luz-avion__brillo");
      brillo?.setAttribute("fill", a.luz ? colorDe(a.luz) : "none");
      brillo?.setAttribute("opacity", a.luz ? (destellos(a.luz) ? ".25" : ".45") : "0");
      g.setAttribute("tabindex", a.enVuelo ? "0" : "-1");
    }
    for (const [id, g] of this.aviones)
      if (!vivos.has(id)) {
        g.remove();
        this.aviones.delete(id);
      }
    // La fiesta: estrellitas al tocar, y la flecha de otra vuelta con roja o al aire.
    const fiesta = e.fiesta ? `${e.fiesta.que}:${e.fiesta.id}` : "";
    if (fiesta !== this.fiesta) {
      this.fiesta = fiesta;
      for (const f of this.hoja.querySelectorAll(".luz-avion__fiesta")) f.innerHTML = "";
      if (e.fiesta) {
        const g = this.aviones.get(e.fiesta.id)?.querySelector(".luz-avion__fiesta");
        if (g) g.innerHTML = e.fiesta.que === "aterrizo" ? `<g class="luz-estrellitas">${ESTRELLITAS}</g>` : OTRA_VUELTA;
      }
    }
    // La lámpara mira al avión al que apunta, o al que pide luz; y la luz, si está encendida.
    const hacia = e.aviones.find((a) => a.id === (e.haz?.hacia ?? e.apunta)) ?? e.aviones.find((a) => a.pide) ?? null;
    if (hacia) this.giro = (Math.atan2(v(hacia.y) - LAMPARA_EN[1], u(hacia.x) - LAMPARA_EN[0]) * 180) / Math.PI;
    const izquierda = Math.abs(this.giro) > 90;
    this.lampara?.setAttribute("transform", `rotate(${this.giro.toFixed(1)})${izquierda ? " scale(1 -1)" : ""}`);
    const lente = this.lampara?.querySelector(".luz-lampara__lente");
    lente?.setAttribute("fill", e.haz ? colorDe(e.haz.senal) : C.papel);
    const objetivo = e.haz ? e.aviones.find((a) => a.id === e.haz?.hacia) : null;
    if (this.haz) {
      if (e.haz && objetivo) {
        const r = (this.giro * Math.PI) / 180;
        const bx = LAMPARA_EN[0] + Math.cos(r) * HASTA_LA_LENTE;
        const by = LAMPARA_EN[1] + Math.sin(r) * HASTA_LA_LENTE;
        const tx = u(objetivo.x);
        const ty = v(objetivo.y);
        const nx = -Math.sin(r);
        const ny = Math.cos(r);
        this.haz.setAttribute(
          "points",
          `${(bx + nx * 7).toFixed(1)},${(by + ny * 7).toFixed(1)} ${(bx - nx * 7).toFixed(1)},${(by - ny * 7).toFixed(1)} ${(tx - nx * 16).toFixed(1)},${(ty - ny * 16).toFixed(1)} ${(tx + nx * 16).toFixed(1)},${(ty + ny * 16).toFixed(1)}`,
        );
        this.haz.setAttribute("fill", colorDe(e.haz.senal));
        this.haz.setAttribute("visibility", "visible");
        this.haz.classList.toggle("luz-haz--destellos", destellos(e.haz.senal));
      } else this.haz.setAttribute("visibility", "hidden");
    }
    if (this.camion) {
      this.camion.setAttribute("visibility", e.camion ? "visible" : "hidden");
      if (e.camion)
        this.camion.setAttribute(
          "transform",
          `translate(${u(e.camion.x).toFixed(1)} ${v(e.camion.y).toFixed(1)}) rotate(${((e.camion.rumbo * 180) / Math.PI - 90).toFixed(1)})`,
        );
    }
    for (const b of this.hoja.querySelectorAll<SVGGElement>("[data-luz-senal]")) {
      const s = b.dataset.luzSenal as Senal;
      b.classList.toggle("luz-boton--ayuda", e.ayuda === s);
      b.classList.toggle("luz-boton--encendido", e.haz?.senal === s);
    }
  }

  /** Dónde está cada cosa en la pantalla: para el banco, que juega con el dedo. */
  paraBanco(): { readonly aviones: Readonly<Record<string, DOMRect>>; readonly luces: Readonly<Record<string, DOMRect>> } {
    const aviones: Record<string, DOMRect> = {};
    for (const [id, g] of this.aviones) {
      const r = g.querySelector(".luz-avion__toque")?.getBoundingClientRect();
      if (r) aviones[id] = r;
    }
    const luces: Record<string, DOMRect> = {};
    for (const b of this.hoja.querySelectorAll<SVGGElement>("[data-luz-senal]")) {
      const r = b.querySelector(".luz-boton__aro")?.getBoundingClientRect();
      if (r) luces[b.dataset.luzSenal!] = r;
    }
    return { aviones, luces };
  }
}

/** **Lo de Luz verde en la hoja de elegir**: la torre, su luz verde y un avioncito que llega. */
export const ICONO_DE_LA_LUZ = `<svg viewBox="0 0 160 100" aria-hidden="true">
<rect width="160" height="100" rx="12" fill="${C.mar}"/>
<path d="M0 74 q30 -6 60 0 t60 0 t40 -2 V100 H0z" fill="${C.arena}" stroke="${C.tinta}" stroke-width="2.5"/>
<path d="M14 92 L118 80" stroke="${C.asfalto}" stroke-width="7" stroke-linecap="round"/>
<path d="M22 91 L110 81" stroke="${C.blanco}" stroke-width="1.2" stroke-dasharray="5 4"/>
<g transform="translate(130 22)">
<path d="M-5 70 L-3 22 h8 L7 70z" fill="${C.edificio}" stroke="${C.tinta}" stroke-width="2.5"/>
<path d="M-14 22 h28 l-4 -16 h-20z" fill="#bfe0e6" stroke="${C.tinta}" stroke-width="2.5"/>
<path d="M-15 6 h30 l-4 -6 h-22z" fill="${C.verdeCasa}" stroke="${C.tinta}" stroke-width="2.5"/>
<circle cx="-8" cy="14" r="4" fill="${C.verde}" stroke="${C.tinta}" stroke-width="1.5"/>
</g>
<path d="M122 36 L52 22 L54 44 Z" fill="${C.verde}" opacity=".65"/>
<g transform="translate(44 32) rotate(200) scale(.9)">${ALAS}${CUERPO}</g>
</svg>`;

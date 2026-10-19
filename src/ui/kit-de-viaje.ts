/**
 * **El kit de viaje, en la pantalla**: el botón de la mochilita y los dos
 * juegos, dibujados en el código y jugables con el dedo, con el ratón o con
 * el teclado. La lógica vive en `flight/kit-de-viaje.ts`; esto la dibuja y le
 * pasa lo que se toca.
 *
 * ## Sin leer
 *
 * Se juega sin saber leer (regla 2 del AGENTS.md): la mochilita late cuando
 * llega, los juegos se eligen por su dibujo, las piezas encajan por su forma
 * —el hueco del ala tiene forma de ala— y lo que hay que tocar, brilla. Ara
 * dice qué hacer y qué es cada cosa, y el subtítulo va en la tarjeta de la
 * escena, arriba, como todo lo que se dice. Los únicos signos son los
 * números del camino, del uno al cuatro, que es lo que se aprende contando.
 *
 * ## Lo que se dibuja es lo de verdad
 *
 * El avión es el de la escena, un reactor regional con los motores debajo de
 * las alas, visto de lado; y el mapa, las islas en su sitio con sus
 * coordenadas, con el camino del vuelo de hoy pasando al norte del Teide y de
 * La Gomera, que se ven por la izquierda, como desde la ventanilla de Ara.
 *
 * ## Dónde
 *
 * La mochilita, abajo a la derecha, que en la escena de pasaje está libre en
 * el teléfono y en el portátil. El kit abierto, debajo de la tarjeta de la
 * escena y encima de la ventanilla —como quien baja la mesita y mira lo que
 * tiene delante—, sin tapar la tarjeta, el cartel del cinturón ni el menú.
 * Mientras habla la megafonía se apaga y se ve el altavoz encima: se escucha.
 */

import { t, type TranslationKey } from "../i18n";
import {
  JuegoDeLasPiezas,
  JuegoDelCamino,
  PARADAS,
  PIEZAS,
  type JuegoDelKit,
  type KitDeViaje,
  type Parada,
  type Pieza,
} from "../flight/kit-de-viaje";

/** Los colores: los de los dibujos de la ventanita. Ver `dibujos-del-pasaje.ts`. */
const C = {
  papel: "#f3ead8",
  tinta: "#2a1c14",
  cielo: "#cfe6ee",
  mar: "#3f7fa6",
  tierra: "#b98a5a",
  monte: "#8a5a3a",
  terracota: "#c8643c",
  amarillo: "#f2c230",
  blanco: "#ffffff",
  gris: "#b9c2c6",
  oscuro: "#3b3b3b",
  verde: "#4f9a5a",
} as const;

const SVG = "http://www.w3.org/2000/svg";

// ── El avión ─────────────────────────────────────────────────────────────

/**
 * **Cada pieza**: su dibujo alrededor de su centro, dónde va en el avión y
 * dónde espera en la bandeja. El avión mira a la derecha, de lado y un poco
 * desde abajo, que es como se ve el ala.
 */
const PIEZA: Readonly<Record<Pieza, { readonly dibujo: string; readonly sitio: readonly [number, number]; readonly bandeja: readonly [number, number] }>> = {
  /*
   * El ala, en flecha hacia atrás y colgando del fuselaje: el borde de ataque
   * delante, el de salida detrás.
   */
  ala: {
    dibujo: `<path d="M17 -30 L102 -30 L-43 28 L-78 28 Z" fill="${C.gris}" stroke="${C.tinta}" stroke-width="4" stroke-linejoin="round"/>
<path d="M36 -30 L-60 28" stroke="${C.tinta}" stroke-width="2" opacity=".35"/>`,
    sitio: [283, 200],
    bandeja: [520, 296],
  },
  /*
   * El motor, debajo del ala y por delante: la entrada con su ventilador a la
   * derecha, la tobera a la izquierda y el pilón que lo cuelga.
   */
  motor: {
    dibujo: `<path d="M-14 -16 L-22 -36 L-6 -36 L6 -16 Z" fill="${C.gris}" stroke="${C.tinta}" stroke-width="3" stroke-linejoin="round"/>
<path d="M-40 -6 Q-44 0 -40 6 L-28 12 L30 16 Q42 16 42 0 Q42 -16 30 -16 L-28 -12 Z" fill="${C.terracota}" stroke="${C.tinta}" stroke-width="4" stroke-linejoin="round"/>
<ellipse cx="36" cy="0" rx="6" ry="14" fill="${C.oscuro}" stroke="${C.tinta}" stroke-width="3"/>
<path d="M36 -10 L36 10 M31 -7 L41 7 M31 7 L41 -7" stroke="${C.gris}" stroke-width="2"/>`,
    sitio: [435, 212],
    bandeja: [96, 296],
  },
  /*
   * La cola: la deriva, con el timón detrás, más claro y con su bisagra.
   */
  cola: {
    dibujo: `<path d="M60 36 L-12 -37 L-45 -37 L-30 36 Z" fill="${C.terracota}" stroke="${C.tinta}" stroke-width="4" stroke-linejoin="round"/>
<path d="M-30 36 L-45 -37 L-30 -37 L-8 36 Z" fill="${C.amarillo}" stroke="${C.tinta}" stroke-width="3" stroke-linejoin="round"/>`,
    sitio: [130, 72],
    bandeja: [226, 292],
  },
  /*
   * Las ruedas del tren principal: la pata y las dos ruedas, una detrás de
   * otra.
   */
  ruedas: {
    dibujo: `<path d="M-3 -32 L3 -32 L3 6 L-3 6 Z" fill="${C.gris}" stroke="${C.tinta}" stroke-width="3"/>
<circle cx="-9" cy="14" r="14" fill="${C.oscuro}" stroke="${C.tinta}" stroke-width="3"/>
<circle cx="7" cy="14" r="14" fill="${C.oscuro}" stroke="${C.tinta}" stroke-width="3"/>
<circle cx="7" cy="14" r="5" fill="${C.gris}"/>`,
    sitio: [352, 204],
    bandeja: [350, 296],
  },
};

/** Lo que mide la hoja del avión. */
const ANCHO = 640;
const ALTO = 340;

/**
 * **El avión sin sus piezas**: el fuselaje con sus ventanillas, la cabina de
 * mando, la puerta, la raya de la casa, el estabilizador de cola y la rueda
 * de delante.
 */
const FUSELAJE = `
<path d="M108 136 L72 152 L92 156 L150 146 Z" fill="${C.gris}" stroke="${C.tinta}" stroke-width="4" stroke-linejoin="round"/>
<path d="M150 108 L520 108 Q568 110 586 140 Q572 170 520 172 L215 172 Q152 166 100 128 L99 118 Q110 108 150 108 Z" fill="${C.blanco}" stroke="${C.tinta}" stroke-width="5" stroke-linejoin="round"/>
<path d="M125 150 Q300 158 578 152" fill="none" stroke="${C.terracota}" stroke-width="7"/>
${Array.from({ length: 13 }, (_, i) => `<rect x="${212 + i * 22}" y="122" width="11" height="15" rx="5" fill="${C.cielo}" stroke="${C.tinta}" stroke-width="2"/>`).join("")}
<path d="M540 121 L566 121 Q575 126 578 133 L544 133 Z" fill="${C.cielo}" stroke="${C.tinta}" stroke-width="3" stroke-linejoin="round"/>
<rect x="497" y="116" width="17" height="38" rx="4" fill="none" stroke="${C.tinta}" stroke-width="2.5"/>
<path d="M520 172 L520 198" stroke="${C.tinta}" stroke-width="5"/>
<circle cx="520" cy="206" r="10" fill="${C.oscuro}" stroke="${C.tinta}" stroke-width="3"/>`;

/** El dibujo de una pieza, sin colores: el hueco que la espera, con su forma. */
const hueco = (p: Pieza): string =>
  PIEZA[p].dibujo
    .replace(/fill="[^"]*"/g, 'fill="currentColor"')
    .replace(/stroke="[^"]*"/g, 'stroke="currentColor"');

function hojaDeLasPiezas(): string {
  const huecos = PIEZAS.map((p) => {
    const [x, y] = PIEZA[p].sitio;
    return `<g class="kit-hueco" data-sitio="${p}" transform="translate(${x} ${y})" role="button" aria-label="${t(`inicio.kit.sitio.${p}` as TranslationKey)}">
<rect x="-60" y="-45" width="120" height="90" fill="transparent" stroke="none"/>
<g class="kit-hueco__forma">${hueco(p)}</g></g>`;
  }).join("");
  const piezas = PIEZAS.map((p) => {
    const [x, y] = PIEZA[p].bandeja;
    return `<g class="kit-pieza" data-pieza="${p}" style="transform: translate(${x}px, ${y}px)" role="button" tabindex="0" aria-label="${t(`inicio.kit.pieza.${p}` as TranslationKey)}">
<rect x="-62" y="-44" width="124" height="88" rx="14" fill="transparent" stroke="none"/>
<g class="kit-pieza__dibujo">${PIEZA[p].dibujo}</g></g>`;
  }).join("");
  return `<svg class="kit-hoja kit-hoja--piezas" viewBox="0 0 ${ANCHO} ${ALTO}" xmlns="${SVG}" aria-label="${t("inicio.kit.piezas")}">
<rect x="10" y="252" width="620" height="82" rx="18" class="kit-bandeja"/>
<g class="kit-avion">
<g class="kit-velocidad"><path d="M60 100 H20 M70 130 H10 M60 160 H25" stroke="${C.tinta}" stroke-width="5" stroke-linecap="round" opacity=".5"/></g>
${FUSELAJE}
<g class="kit-huecos">${huecos}</g>
<g class="kit-piezas">${piezas}</g>
</g>
</svg>`;
}

// ── El mapa ──────────────────────────────────────────────────────────────

/**
 * **De longitud y latitud a la hoja**: de 18,05° O a 16,05° O y de 28,90° N a
 * 27,95° N, a 320 puntos por grado de longitud y 358 de latitud, que a esta
 * latitud es lo mismo en kilómetros: las islas no salen estiradas.
 */
const x = (lon: number): number => (lon + 18.05) * 320;
const y = (lat: number): number => (28.9 - lat) * 357.9;
const punto = (lon: number, lat: number): string => `${x(lon).toFixed(1)} ${y(lat).toFixed(1)}`;

/** Las costas, simplificadas, en el sentido de las agujas del reloj. */
const COSTAS: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
  tenerife: [
    [-16.13, 28.585], [-16.25, 28.57], [-16.32, 28.555], [-16.42, 28.5], [-16.52, 28.42], [-16.62, 28.395],
    [-16.72, 28.375], [-16.83, 28.37], [-16.92, 28.35], [-16.86, 28.27], [-16.82, 28.17], [-16.75, 28.08],
    [-16.7, 28.0], [-16.62, 28.03], [-16.52, 28.06], [-16.45, 28.13], [-16.38, 28.25], [-16.3, 28.4],
    [-16.24, 28.47], [-16.15, 28.53],
  ],
  gomera: [
    [-17.12, 28.18], [-17.1, 28.1], [-17.17, 28.03], [-17.27, 28.01], [-17.34, 28.07], [-17.35, 28.15],
    [-17.3, 28.21], [-17.2, 28.22],
  ],
  palma: [
    [-17.78, 28.84], [-17.9, 28.86], [-17.98, 28.8], [-18.0, 28.73], [-17.95, 28.65], [-17.9, 28.57],
    [-17.88, 28.5], [-17.84, 28.455], [-17.8, 28.5], [-17.76, 28.58], [-17.74, 28.65], [-17.72, 28.75],
    [-17.74, 28.81],
  ],
};

/** Los aeropuertos y lo que se ve, donde están. */
const LOS_RODEOS = [-16.341, 28.483] as const;
const LA_PALMA = [-17.755, 28.626] as const;
const TEIDE = [-16.642, 28.272] as const;
const ROQUE = [-17.885, 28.757] as const;

/**
 * **El camino del vuelo**: de Los Rodeos a La Palma por el norte, en una curva
 * suave —la misma que dibuja la lámina del camino de la ventanita—, con el
 * Teide y La Gomera a la izquierda.
 */
const CONTROL = [-17.0, 28.62] as const;
function enElCamino(s: number): readonly [number, number] {
  const a = (1 - s) * (1 - s);
  const b = 2 * (1 - s) * s;
  const c = s * s;
  return [a * LOS_RODEOS[0] + b * CONTROL[0] + c * LA_PALMA[0], a * LOS_RODEOS[1] + b * CONTROL[1] + c * LA_PALMA[1]];
}
/** El punto del camino a la altura de una longitud: el de «ahora lo tenemos al lado». */
function caminoALaAlturaDe(lon: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (enElCamino(m)[0] > lon) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

/** Dónde va cada parada en el camino, 0 a 1. */
const EN_EL_CAMINO: Readonly<Record<Parada, number>> = {
  tenerife: 0,
  teide: caminoALaAlturaDe(TEIDE[0]),
  gomera: caminoALaAlturaDe(-17.24),
  palma: 1,
};

const enLaHoja = (p: Parada): readonly [number, number] => {
  const [lon, lat] = enElCamino(EN_EL_CAMINO[p]);
  return [x(lon), y(lat)];
};

/** Un tramo del camino, de una parada a la siguiente, y lo que mide. */
function tramo(de: Parada, a: Parada): { readonly d: string; readonly largo: number } {
  const puntos: (readonly [number, number])[] = [];
  for (let i = 0; i <= 16; i++) {
    const s = EN_EL_CAMINO[de] + ((EN_EL_CAMINO[a] - EN_EL_CAMINO[de]) * i) / 16;
    const [lon, lat] = enElCamino(s);
    puntos.push([x(lon), y(lat)]);
  }
  let largo = 0;
  for (let i = 1; i < puntos.length; i++) largo += Math.hypot(puntos[i]![0] - puntos[i - 1]![0], puntos[i]![1] - puntos[i - 1]![1]);
  return { d: `M${puntos.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join(" L")}`, largo };
}

/** El avioncito del mapa, mirando a la derecha: se gira hacia donde va. */
const AVIONCITO = `<path d="M-22 0 q0 -5 7 -5 h26 q8 0 12 5 q-4 5 -12 5 h-26 q-7 0 -7 -5z M-2 0 l-12 13 h7 l17 -13z M-2 0 l-12 -13 h7 l17 13z" fill="${C.blanco}" stroke="${C.tinta}" stroke-width="3"/>`;

function hojaDelCamino(): string {
  const isla = (nombre: string): string =>
    `<path d="M${COSTAS[nombre]!.map(([lon, lat]) => punto(lon, lat)).join(" L")} Z" fill="${C.tierra}" stroke="${C.tinta}" stroke-width="4" stroke-linejoin="round"/>`;
  const tramos = PARADAS.slice(1)
    .map((a, i) => {
      const { d, largo } = tramo(PARADAS[i]!, a);
      return `<g class="kit-tramo" data-tramo="${i + 1}">
<mask id="kit-mascara-${i + 1}" maskUnits="userSpaceOnUse"><path d="${d}" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" class="kit-tramo__trazo" style="stroke-dasharray: ${largo.toFixed(0)}; stroke-dashoffset: ${largo.toFixed(0)}"/></mask>
<path d="${d}" fill="none" stroke="${C.blanco}" stroke-width="7" stroke-dasharray="3 14" stroke-linecap="round" mask="url(#kit-mascara-${i + 1})"/></g>`;
    })
    .join("");
  const paradas = PARADAS.map((p, i) => {
    const [px, py] = enLaHoja(p);
    return `<g class="kit-parada" data-parada="${p}" transform="translate(${px.toFixed(1)} ${py.toFixed(1)})" role="button" tabindex="0" aria-label="${t(`inicio.kit.parada.${p}` as TranslationKey)}">
<circle class="kit-parada__toque" r="34" fill="transparent"/>
<circle class="kit-parada__aro" r="23" stroke="${C.tinta}" stroke-width="4"/>
<text dominant-baseline="central" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="26" fill="${C.blanco}">${i + 1}</text></g>`;
  }).join("");
  const [tx, ty] = [x(TEIDE[0]), y(TEIDE[1])];
  const [rx, ry] = [x(ROQUE[0]), y(ROQUE[1])];
  const [lx, ly] = [x(LOS_RODEOS[0]), y(LOS_RODEOS[1])];
  const [gx, gy] = [x(-17.23), y(28.12)];
  return `<svg class="kit-hoja kit-hoja--camino" viewBox="0 0 ${ANCHO} ${ALTO}" xmlns="${SVG}" aria-label="${t("inicio.kit.camino")}">
<rect width="${ANCHO}" height="${ALTO}" rx="18" fill="${C.mar}"/>
<path d="M0 40 q40 -8 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 M0 300 q40 -8 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0" fill="none" stroke="${C.blanco}" stroke-width="3" opacity=".25"/>
${isla("tenerife")}${isla("gomera")}${isla("palma")}
<g transform="translate(${tx.toFixed(0)} ${ty.toFixed(0)})">
<path d="M-34 22 L-6 -30 L6 -30 L34 22 Z" fill="${C.monte}" stroke="${C.tinta}" stroke-width="4" stroke-linejoin="round"/>
<path d="M-12 -19 L-6 -30 L6 -30 L12 -19 L4 -15 L0 -20 L-5 -15 Z" fill="${C.blanco}"/>
<path d="M-46 4 q8 -10 18 -4 q8 -10 20 -2 q10 -8 22 0 q10 -6 18 2 q8 0 10 6 h-88 z" fill="${C.blanco}" stroke="${C.tinta}" stroke-width="3" class="kit-nube"/>
</g>
<g transform="translate(${gx.toFixed(0)} ${gy.toFixed(0)})" class="kit-silbo">
<path d="M-8 -30 v-18 l14 -4 v16 M6 -36 a5 4 0 1 1 -1 -2 M-8 -30 a5 4 0 1 1 -1 -2" fill="none" stroke="${C.tinta}" stroke-width="3" stroke-linecap="round"/>
<circle cx="-14" cy="-30" r="4" fill="${C.tinta}"/><circle cx="0" cy="-36" r="4" fill="${C.tinta}"/>
<path d="M-16 4 q16 -22 32 0 z" fill="${C.verde}" stroke="${C.tinta}" stroke-width="3"/>
</g>
<g transform="translate(${rx.toFixed(0)} ${ry.toFixed(0)})">
<path d="M-12 4 a12 12 0 0 1 24 0 z" fill="${C.blanco}" stroke="${C.tinta}" stroke-width="3"/>
<path d="M-1 -7 l6 -2 l1 11" fill="none" stroke="${C.tinta}" stroke-width="2.5"/>
</g>
<g transform="translate(${(lx + 30).toFixed(0)} ${(ly + 30).toFixed(0)})">
<path d="M-6 20 L-3 0 h6 L6 20z" fill="${C.blanco}" stroke="${C.tinta}" stroke-width="3"/>
<rect x="-9" y="-10" width="18" height="11" rx="2" fill="${C.cielo}" stroke="${C.tinta}" stroke-width="3"/>
</g>
${tramos}
${paradas}
<g class="kit-aviocito">${AVIONCITO}</g>
</svg>`;
}

// ── Lo de fuera de los juegos ────────────────────────────────────────────

/** **La mochilita**: el kit de viaje, con un avión en la tapa. */
const MOCHILITA = `<svg viewBox="0 0 64 64" aria-hidden="true">
<path d="M20 18 q0 -10 12 -10 q12 0 12 10" fill="none" stroke="${C.tinta}" stroke-width="4"/>
<rect x="11" y="16" width="42" height="42" rx="12" fill="${C.terracota}" stroke="${C.tinta}" stroke-width="4"/>
<path d="M11 30 q21 9 42 0" fill="${C.amarillo}" stroke="${C.tinta}" stroke-width="3"/>
<rect x="20" y="40" width="24" height="12" rx="4" fill="${C.amarillo}" stroke="${C.tinta}" stroke-width="3"/>
<path d="M22 27 l8 -3 l3 -5 l2 1 l-2 4 l7 -2 l1 2 l-8 3 l-9 3 z" fill="${C.blanco}" stroke="${C.tinta}" stroke-width="1.5"/>
</svg>`;

/** Lo de cada juego en la hoja de elegir: su dibujo pequeño. */
const ICONO: Readonly<Record<JuegoDelKit, string>> = {
  piezas: `<svg viewBox="0 0 160 100" aria-hidden="true">
<path d="M28 44 L132 44 Q150 46 154 56 Q148 66 132 66 L40 66 Q22 62 12 48 Q16 44 28 44 Z" fill="${C.blanco}" stroke="${C.tinta}" stroke-width="4"/>
<path d="M30 44 L16 18 L28 18 L48 44 Z" fill="${C.terracota}" stroke="${C.tinta}" stroke-width="4"/>
<path d="M70 66 L94 66 L60 92 L48 92 Z" fill="none" stroke="${C.tinta}" stroke-width="3" stroke-dasharray="6 5"/>
<path d="M104 74 h22 q6 0 6 5 q0 5 -6 5 h-22 z" fill="${C.terracota}" stroke="${C.tinta}" stroke-width="3"/>
</svg>`,
  camino: `<svg viewBox="0 0 160 100" aria-hidden="true">
<rect width="160" height="100" rx="12" fill="${C.mar}"/>
<path d="M120 60 L150 40 L140 76 Z M70 80 a12 10 0 1 0 1 0 M14 30 l14 -14 l8 40 z" fill="${C.tierra}" stroke="${C.tinta}" stroke-width="3"/>
<path d="M132 52 Q90 26 30 34" fill="none" stroke="${C.blanco}" stroke-width="4" stroke-dasharray="3 9" stroke-linecap="round"/>
<circle cx="132" cy="52" r="9" fill="${C.amarillo}" stroke="${C.tinta}" stroke-width="3"/>
<circle cx="30" cy="34" r="9" fill="${C.terracota}" stroke="${C.tinta}" stroke-width="3"/>
</svg>`,
};

/** La estrella de lo ya hecho. */
const ESTRELLA = `<svg class="kit-juego__estrella" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 l3 6.6 7.2 .8 -5.4 4.9 1.5 7.1 -6.3 -3.7 -6.3 3.7 1.5 -7.1 -5.4 -4.9 7.2 -.8z" fill="${C.amarillo}" stroke="${C.tinta}" stroke-width="1.6"/></svg>`;

/** El altavoz del techo, encima del kit pausado: se escucha. */
const ALTAVOZ = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M11 19.5 h6.5 l9-7.5 v24 l-9-7.5 h-6.5 Z" fill="${C.tinta}"/><path d="M30.5 18.5 q3.6 5.5 0 11 M34.5 14.5 q6.6 9.5 0 19" fill="none" stroke="${C.tinta}" stroke-width="2.6" stroke-linecap="round"/></svg>`;

const CERRAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`;
const ATRAS = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ── La pantalla ──────────────────────────────────────────────────────────

/** Cuánto hay que mover el dedo para que un toque sea un arrastre, px de pantalla. */
const ES_ARRASTRE = 8;
/** **Lo cerca de su sitio que basta soltar una pieza**, en puntos de la hoja: con margen. */
const CERCA_DE_SU_SITIO = 80;
/** Y lo cerca de otro sitio para entender que se quiso poner ahí. */
const CERCA_DE_OTRO = 55;

export class PantallaDelKit {
  private readonly boton: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly hoja: HTMLElement;
  private readonly atras: HTMLButtonElement;
  private readonly pausa: HTMLElement;
  /** Lo que hay montado en la hoja: elegir, o el juego de ahora. */
  private montado: "elegir" | JuegoDeLasPiezas | JuegoDelCamino | null = null;
  private firma = "";
  private medido = 0;
  /** Dónde quedó el panel la última vez que se colocó: el ancho de la pantalla, su arriba y su ancho, en píxeles. */
  private sitioDelPanel = "";
  private movidas = 0;
  /**
   * **La tarjeta, que crece y encoge con lo que se dice**: el panel va debajo
   * de ella, así que se recoloca en cuanto cambia de alto, y no al siguiente
   * vistazo de los de cada poco. Con ese vistazo, una frase de tres líneas
   * dejaba la tarjeta encima del panel hasta tres décimas de segundo.
   */
  private readonly laTarjetaCambia =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => (this.medido = 0));
  private tarjetaMirada: Element | null = null;
  private arrastre: {
    readonly pieza: Pieza;
    readonly id: number;
    readonly desde: { readonly x: number; readonly y: number };
    readonly agarre: { readonly x: number; readonly y: number };
    movido: boolean;
  } | null = null;

  constructor(
    private readonly raiz: HTMLElement,
    private readonly kit: KitDeViaje,
  ) {
    raiz.innerHTML = `
      <button class="kit__boton" type="button" data-kit="abrir" aria-label="${t("inicio.kit.abrir")}" hidden>${MOCHILITA}</button>
      <div class="kit__panel" role="group" aria-label="${t("inicio.kit.nombre")}" data-hud="kit" hidden>
        <button class="kit__atras" type="button" data-kit="elegir" aria-label="${t("inicio.kit.elegir")}" hidden>${ATRAS}</button>
        <button class="kit__cerrar" type="button" data-kit="cerrar" aria-label="${t("inicio.kit.cerrar")}">${CERRAR}</button>
        <div class="kit__hoja"></div>
        <div class="kit__pausa" role="status" hidden>${ALTAVOZ}<span class="kit__oculto">${t("inicio.kit.pausa")}</span></div>
      </div>`;
    this.boton = raiz.querySelector<HTMLButtonElement>(".kit__boton")!;
    this.panel = raiz.querySelector<HTMLElement>(".kit__panel")!;
    this.hoja = raiz.querySelector<HTMLElement>(".kit__hoja")!;
    this.atras = raiz.querySelector<HTMLButtonElement>(".kit__atras")!;
    this.pausa = raiz.querySelector<HTMLElement>(".kit__pausa")!;
    raiz.hidden = false;
    raiz.addEventListener("click", this.alTocar);
    this.hoja.addEventListener("pointerdown", this.alApretar);
    this.hoja.addEventListener("pointermove", this.alMover);
    this.hoja.addEventListener("pointerup", this.alSoltar);
    this.hoja.addEventListener("pointercancel", this.alSoltar);
    this.panel.addEventListener("keydown", this.alTeclear);
    window.addEventListener("resize", this.alCambiarDeTamano);
  }

  /** Se acabó la escena: fuera todo. */
  quitar(): void {
    document.documentElement.classList.remove("kit-abierto");
    window.removeEventListener("resize", this.alCambiarDeTamano);
    this.laTarjetaCambia?.disconnect();
    this.raiz.removeEventListener("click", this.alTocar);
    this.raiz.innerHTML = "";
    this.raiz.hidden = true;
  }

  private readonly alCambiarDeTamano = (): void => {
    this.medido = 0;
  };

  /**
   * **Cuántas veces se ha abierto, cerrado o movido el panel**, para lo que
   * tiene que apartarse de él en el mismo fotograma: la lámina de lo que se
   * explica. Ver `vigilar` en `ventana-de-historia.ts`.
   */
  get movido(): number {
    return this.movidas;
  }

  /**
   * **Un paso de la pantalla**: lo que se ve sale del estado del kit, y solo
   * se toca el DOM si cambió algo. `suena` es la clave de lo que se está
   * diciendo: la pieza de la que habla Ara brilla mientras lo dice.
   */
  pintar(suena: string | null): void {
    const e = this.kit.estado;
    const abierto = e.abierto;
    this.boton.hidden = !this.kit.aMano || abierto;
    this.boton.classList.toggle("kit__boton--nuevo", !e.visto);
    if (this.panel.hidden === abierto) {
      this.panel.hidden = !abierto;
      this.medido = 0;
      this.movidas++;
      this.sitioDelPanel = "";
      // En el teléfono apaisado la tarjeta sube para dejarle sitio: ver la hoja.
      document.documentElement.classList.toggle("kit-abierto", abierto);
      if (abierto) requestAnimationFrame(() => this.panel.querySelector<HTMLElement>(".kit__cerrar")?.focus({ preventScroll: true }));
      else if (this.kit.aMano) this.boton.focus({ preventScroll: true });
    }
    if (!abierto) {
      this.arrastre = null;
      return;
    }
    // Dónde y de qué tamaño, medido cada poco y no en cada fotograma: medir obliga a rehacer la página.
    const ahora = performance.now();
    if (ahora - this.medido > 300) {
      this.medido = ahora;
      this.colocar();
    }
    const juego = this.kit.juegoDeAhora;
    const quiere = juego ?? "elegir";
    if (quiere !== this.montado) this.montar(quiere);
    const firma = `${JSON.stringify(e)}|${suena ?? ""}`;
    if (firma === this.firma) return;
    this.firma = firma;
    this.panel.classList.toggle("kit__panel--pausa", e.pausado);
    this.pausa.hidden = !e.pausado;
    this.atras.hidden = !juego;
    if (juego instanceof JuegoDeLasPiezas) this.pintarLasPiezas(juego, suena);
    else if (juego instanceof JuegoDelCamino) this.pintarElCamino(juego);
    else
      for (const b of this.hoja.querySelectorAll<HTMLElement>("[data-kit-juego]"))
        b.classList.toggle("kit-juego--hecho", e.hechos.includes(b.dataset.kitJuego as JuegoDelKit));
  }

  /**
   * **Debajo de la tarjeta de la escena**, que crece y encoge con lo que dice,
   * y del ancho que quepa entero hasta abajo en la proporción de la hoja. Y
   * **sin tapar el volumen**: en la tablet del aula el deslizador va a media
   * altura a la izquierda, y el kit le caía encima. Si lo pisa, se prueba
   * encima de él y a su lado, y se queda con el que deja el kit más grande.
   */
  private colocar(): void {
    const laTarjeta = document.querySelector("#inicio .inicio__tarjeta");
    if (laTarjeta !== this.tarjetaMirada) {
      this.laTarjetaCambia?.disconnect();
      if (laTarjeta) this.laTarjetaCambia?.observe(laTarjeta);
      this.tarjetaMirada = laTarjeta;
    }
    const tarjeta = laTarjeta?.getBoundingClientRect();
    const arriba = tarjeta && tarjeta.height > 2 ? tarjeta.bottom + 10 : 72;
    const marco = 26;
    const proporcion = 640 / 340;
    const anchoPara = (alto: number): number => (alto - marco) * proporcion + marco;
    const altoDe = (ancho: number): number => (ancho - marco) / proporcion + marco;
    const deLado = Math.min(780, innerWidth - 150);
    let ancho = Math.min(deLado, anchoPara(innerHeight - arriba - 12));
    const volumen = document.querySelector(".volumen");
    const v = volumen && !volumen.closest("[hidden]") ? volumen.getBoundingClientRect() : null;
    const izquierda = (innerWidth - ancho) / 2;
    const pisa =
      !!v && v.width > 2 && v.right > izquierda && v.left < innerWidth - izquierda && v.bottom > arriba && v.top < arriba + altoDe(ancho);
    if (v && pisa) {
      const encima = Math.min(deLado, anchoPara(v.top - 8 - arriba));
      const alLado = Math.min(innerWidth - 2 * (v.right + 10), anchoPara(innerHeight - arriba - 12));
      ancho = Math.max(encima, alLado);
    }
    this.raiz.style.setProperty("--kit-arriba", `${Math.round(arriba)}px`);
    this.raiz.style.setProperty("--kit-ancho", `${Math.max(200, Math.floor(ancho))}px`);
    // Centrado por la hoja: con otra pantalla se mueve aunque mida lo mismo.
    const sitio = `${innerWidth}|${Math.round(arriba)}|${Math.max(200, Math.floor(ancho))}`;
    if (sitio !== this.sitioDelPanel) {
      this.sitioDelPanel = sitio;
      this.movidas++;
    }
  }

  /** Monta lo de la hoja: elegir, o un juego nuevo. */
  private montar(que: "elegir" | JuegoDeLasPiezas | JuegoDelCamino): void {
    this.montado = que;
    this.firma = "";
    this.arrastre = null;
    if (que === "elegir")
      this.hoja.innerHTML = `<div class="kit-elegir">${(["piezas", "camino"] as const)
        .map(
          (j) =>
            `<button class="kit-juego" type="button" data-kit-juego="${j}" aria-label="${t(`inicio.kit.${j}` as TranslationKey)}">${ICONO[j]}${ESTRELLA}</button>`,
        )
        .join("")}</div>`;
    else this.hoja.innerHTML = que instanceof JuegoDeLasPiezas ? hojaDeLasPiezas() : hojaDelCamino();
  }

  private pintarLasPiezas(juego: JuegoDeLasPiezas, suena: string | null): void {
    const e = juego.estado;
    const svg = this.hoja.querySelector("svg");
    svg?.classList.toggle("kit-hoja--hecha", e.terminado);
    for (const p of PIEZAS) {
      const pieza = this.hoja.querySelector<SVGGElement>(`[data-pieza="${p}"]`);
      const sitio = this.hoja.querySelector<SVGGElement>(`[data-sitio="${p}"]`);
      if (!pieza || !sitio) continue;
      const puesta = e.puestas.includes(p);
      if (this.arrastre?.pieza !== p) {
        const [px, py] = puesta ? PIEZA[p].sitio : PIEZA[p].bandeja;
        pieza.style.transform = `translate(${px}px, ${py}px)`;
      }
      pieza.classList.toggle("kit-pieza--puesta", puesta);
      pieza.classList.toggle("kit-pieza--cogida", e.cogida === p);
      pieza.classList.toggle("kit-pieza--senala", e.senala === p);
      pieza.classList.toggle("kit-pieza--dice", puesta && suena === `inicio.ara.pasaje.kit.piezas.${p}`);
      pieza.setAttribute("tabindex", puesta ? "-1" : "0");
      pieza.setAttribute("aria-disabled", String(puesta));
      sitio.classList.toggle("kit-hueco--puesto", puesta);
      sitio.classList.toggle("kit-hueco--brilla", !puesta && e.ilumina === p);
    }
  }

  private pintarElCamino(juego: JuegoDelCamino): void {
    const e = juego.estado;
    const svg = this.hoja.querySelector("svg");
    svg?.classList.toggle("kit-hoja--hecha", e.terminado);
    PARADAS.forEach((p, i) => {
      const g = this.hoja.querySelector<SVGGElement>(`[data-parada="${p}"]`);
      g?.classList.toggle("kit-parada--hecha", i < e.hechas);
      g?.classList.toggle("kit-parada--brilla", e.ilumina === p);
      g?.setAttribute("aria-disabled", String(i < e.hechas));
    });
    for (let i = 1; i < PARADAS.length; i++)
      this.hoja.querySelector(`[data-tramo="${i}"]`)?.classList.toggle("kit-tramo--hecho", i < e.hechas);
    // El avioncito, en la última parada unida y mirando hacia donde va; al final, como llegó.
    const aqui = PARADAS[e.hechas - 1]!;
    const [ax, ay] = enLaHoja(aqui);
    const [bx, by] = e.terminado ? enLaHoja(PARADAS[PARADAS.length - 2]!) : enLaHoja(PARADAS[e.hechas]!);
    const giro = e.terminado ? Math.atan2(ay - by, ax - bx) : Math.atan2(by - ay, bx - ax);
    const avion = this.hoja.querySelector<SVGGElement>(".kit-aviocito");
    if (avion) avion.style.transform = `translate(${ax.toFixed(1)}px, ${(ay - 34).toFixed(1)}px) rotate(${((giro * 180) / Math.PI).toFixed(0)}deg)`;
  }

  // ── Lo que se toca ──

  private readonly alTocar = (event: MouseEvent): void => {
    const donde = event.target as Element | null;
    const boton = donde?.closest<HTMLElement>("[data-kit]");
    if (boton) {
      const que = boton.dataset.kit;
      if (que === "abrir") this.kit.abrir();
      else if (que === "cerrar") this.kit.cerrar();
      else if (que === "elegir") this.kit.volverAElegir();
      return;
    }
    const juego = donde?.closest<HTMLElement>("[data-kit-juego]")?.dataset.kitJuego as JuegoDelKit | undefined;
    if (juego) {
      this.kit.elegir(juego);
      return;
    }
    const j = this.kit.juego;
    const parada = donde?.closest("[data-parada]")?.getAttribute("data-parada") as Parada | null;
    if (parada && j instanceof JuegoDelCamino) {
      this.kit.tocado();
      j.tocar(parada, this.kit.hayHueco);
      return;
    }
    const sitio = donde?.closest("[data-sitio]")?.getAttribute("data-sitio") as Pieza | null;
    if (sitio && j instanceof JuegoDeLasPiezas && !donde?.closest("[data-pieza]")) {
      this.kit.tocado();
      j.tocarSitio(sitio, this.kit.hayHueco);
    }
  };

  /** De la pantalla a los puntos de la hoja. */
  private enLaHoja(event: PointerEvent): { x: number; y: number } | null {
    const svg = this.hoja.querySelector("svg");
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  private readonly alApretar = (event: PointerEvent): void => {
    const j = this.kit.juego;
    if (!(j instanceof JuegoDeLasPiezas) || this.arrastre) return;
    const g = (event.target as Element | null)?.closest<SVGGElement>("[data-pieza]");
    const p = g?.getAttribute("data-pieza") as Pieza | null;
    if (!g || !p || j.puesta(p)) return;
    const en = this.enLaHoja(event);
    if (!en) return;
    event.preventDefault();
    const [cx, cy] = PIEZA[p].bandeja;
    this.arrastre = { pieza: p, id: event.pointerId, desde: { x: event.clientX, y: event.clientY }, agarre: { x: en.x - cx, y: en.y - cy }, movido: false };
    this.hoja.setPointerCapture?.(event.pointerId);
    // Encima de todo mientras se lleva.
    g.parentElement?.appendChild(g);
    g.classList.add("kit-pieza--llevada");
    this.kit.tocado();
  };

  private readonly alMover = (event: PointerEvent): void => {
    const a = this.arrastre;
    if (!a || a.id !== event.pointerId) return;
    if (!a.movido && Math.hypot(event.clientX - a.desde.x, event.clientY - a.desde.y) < ES_ARRASTRE) return;
    a.movido = true;
    const en = this.enLaHoja(event);
    const g = this.hoja.querySelector<SVGGElement>(`[data-pieza="${a.pieza}"]`);
    if (!en || !g) return;
    g.style.transform = `translate(${(en.x - a.agarre.x).toFixed(1)}px, ${(en.y - a.agarre.y).toFixed(1)}px)`;
    this.kit.tocado();
  };

  private readonly alSoltar = (event: PointerEvent): void => {
    const a = this.arrastre;
    if (!a || a.id !== event.pointerId) return;
    this.arrastre = null;
    this.hoja.releasePointerCapture?.(event.pointerId);
    const g = this.hoja.querySelector<SVGGElement>(`[data-pieza="${a.pieza}"]`);
    g?.classList.remove("kit-pieza--llevada");
    const j = this.kit.juego;
    if (!(j instanceof JuegoDeLasPiezas)) return;
    this.kit.tocado();
    this.firma = "";
    if (!a.movido || event.type === "pointercancel") {
      // Un toque: se coge, y con otro en su sitio se suelta.
      if (event.type !== "pointercancel") j.tocarPieza(a.pieza);
      return;
    }
    const en = this.enLaHoja(event);
    if (!en) return;
    const centro = { x: en.x - a.agarre.x, y: en.y - a.agarre.y };
    const lejos = (p: Pieza): number => Math.hypot(centro.x - PIEZA[p].sitio[0], centro.y - PIEZA[p].sitio[1]);
    /*
     * **Con margen**: cerca de su sitio, encaja aunque haya otro más cerca. Lo
     * que se pide es la idea, no la puntería. Cerca de otro sitio, se ayuda;
     * y soltada en ninguna parte, vuelve a la bandeja sin más.
     */
    if (lejos(a.pieza) < CERCA_DE_SU_SITIO) {
      j.soltar(a.pieza, a.pieza, this.kit.hayHueco);
      return;
    }
    const otro = PIEZAS.filter((p) => p !== a.pieza).sort((p, q) => lejos(p) - lejos(q))[0]!;
    j.soltar(a.pieza, lejos(otro) < CERCA_DE_OTRO ? otro : null, this.kit.hayHueco);
  };

  /**
   * **El teclado**: el tabulador recorre lo que se toca; con Intro o la barra
   * se elige un juego, se toca un número o se lleva una pieza a su sitio; y
   * con Escape se guarda el kit. Lo que se usa aquí no le llega al avión.
   */
  private readonly alTeclear = (event: KeyboardEvent): void => {
    const donde = event.target as Element | null;
    if (event.key === "Escape") {
      event.stopPropagation();
      this.kit.cerrar();
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;
    event.stopPropagation();
    const j = this.kit.juego;
    const pieza = donde?.closest("[data-pieza]")?.getAttribute("data-pieza") as Pieza | null;
    if (pieza && j instanceof JuegoDeLasPiezas) {
      event.preventDefault();
      this.kit.tocado();
      j.colocar(pieza);
      return;
    }
    const parada = donde?.closest("[data-parada]")?.getAttribute("data-parada") as Parada | null;
    if (parada && j instanceof JuegoDelCamino) {
      event.preventDefault();
      this.kit.tocado();
      j.tocar(parada, this.kit.hayHueco);
    }
  };

  /** Dónde está cada cosa de la hoja en la pantalla: para el banco, que juega con el dedo. */
  get paraBanco(): {
    readonly boton: DOMRect | null;
    readonly panel: DOMRect | null;
    readonly piezas: Readonly<Record<string, { readonly en: DOMRect; readonly sitio: DOMRect }>>;
    readonly paradas: Readonly<Record<string, DOMRect>>;
    readonly juegos: Readonly<Record<string, DOMRect>>;
  } {
    const caja = (el: Element | null): DOMRect | null => (el && !el.closest("[hidden]") ? el.getBoundingClientRect() : null);
    const piezas: Record<string, { en: DOMRect; sitio: DOMRect }> = {};
    for (const p of PIEZAS) {
      const en = caja(this.hoja.querySelector(`[data-pieza="${p}"] .kit-pieza__dibujo`));
      const sitio = caja(this.hoja.querySelector(`[data-sitio="${p}"] .kit-hueco__forma`));
      if (en && sitio) piezas[p] = { en, sitio };
    }
    const paradas: Record<string, DOMRect> = {};
    for (const p of PARADAS) {
      const r = caja(this.hoja.querySelector(`[data-parada="${p}"] .kit-parada__aro`));
      if (r) paradas[p] = r;
    }
    const juegos: Record<string, DOMRect> = {};
    for (const b of this.hoja.querySelectorAll<HTMLElement>("[data-kit-juego]")) {
      const r = caja(b);
      if (r) juegos[b.dataset.kitJuego!] = r;
    }
    return { boton: caja(this.boton), panel: caja(this.panel), piezas, paradas, juegos };
  }
}

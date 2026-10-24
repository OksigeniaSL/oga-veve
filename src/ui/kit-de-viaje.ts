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
 * escena, arriba, como todo lo que se dice. La luz verde se dibuja aparte, en
 * `luz-verde.ts`.
 *
 * ## Lo que se dibuja es lo de verdad, y en vistas de libro
 *
 * Los aviones de Armá tu avión son los de la flota, medidos en sus modelos
 * —ver `aviones-del-kit.ts`, que es generado— y dibujados como en un libro:
 *
 * - **De perfil**, por la derecha y con el morro a la derecha, como se ven
 *   por la ventanilla de Ara: ahí se arman. De perfil se ve sin dudar si el
 *   ala va encima de la cabina o abajo, dónde van el motor y las ruedas, y la
 *   forma de la cola. Lo de delante tapa lo de detrás, también los huecos:
 *   cada uno va en su capa, como su pieza.
 * - **Desde arriba**, con el morro hacia arriba: ahí se ponen las luces de
 *   navegación, porque ahí la izquierda y la derecha del avión son las de
 *   quien mira. Y de noche se ve hacia dónde alumbra cada una: la roja hacia
 *   delante y a la izquierda, la verde hacia delante y a la derecha, la
 *   blanca hacia atrás, en los ángulos de la norma (14 CFR 25.1387: 110, 110
 *   y 140 grados).
 * - Y **de perfil otra vez** para despegar.
 *
 * De una vista a la otra, sin leer: el avión armado se tumba —se aplasta de
 * perfil y se abre por las alas, como al alabear hasta enseñar el lomo— y
 * gira hasta poner el morro arriba. Al despegar, lo mismo al revés.
 *
 * Hasta el 24-10-2026 era una sola vista de tres cuartos por delante y desde
 * un poco por encima, para ver las dos alas a la vez. En la avioneta el ala
 * alta salía como una tabla en diagonal cruzando la cabina, y nada decía qué
 * iba delante: «Un Picasso, vaya lujo de juego» (Enrique). Ver
 * `scripts/aviones-del-kit.mjs`.
 *
 * Cada pieza espera en la bandeja de abajo, más grande o más chica para que
 * quepa y se agarre con el dedo, y al levantarla toma su tamaño, el de su
 * hueco. Las luces, en la de la derecha.
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
import { JuegoDeLaLuz, type Senal } from "../flight/luz-verde";
import { hojaDeLaLuz, ICONO_DE_LA_LUZ, PintorDeLaLuz } from "./luz-verde";
import {
  JuegoDelAvion,
  LUCES,
  NIVELES,
  esLuz,
  type JuegoDelKit,
  type KitDeViaje,
  type Luz,
  type NivelDelAvion,
  type PiezaDelAvion,
  type Sitio,
} from "../flight/kit-de-viaje";
import { AVIONES_DEL_MODELO, type ColorDelModelo, type ParteDelDibujo, type PiezaDelModelo } from "./aviones-del-kit";
import { leerProgreso, ponerProgreso } from "../datos/guardado";

/** Dónde se guarda el nivel de Armá tu avión: solo el número, en el progreso del perfil. */
const NIVEL_GUARDADO = "kitNivelDelAvion";

/** Los colores: los de la casa y los de los dibujos de la ventanita. Ver `LIBREA` en `aircraft.ts`. */
const C = {
  papel: "#f3ead8",
  mesa: "#e9dcc0",
  tinta: "#2a1c14",
  cielo: "#cfe6ee",
  crema: "#ecece6",
  terracota: "#be5d38",
  verdeCasa: "#2f5243",
  amarillo: "#f2c230",
  ocre: "#dd923f",
  blanco: "#ffffff",
  gris: "#b9c2c6",
  noche: "#0d1631",
  roja: "#e0443a",
  verde: "#3fbf5f",
  luzBlanca: "#fff7da",
} as const;

/**
 * **El color de cada material del modelo**, el de la librea de la casa
 * —`LIBREA` en `aircraft.ts`—: casco crema, franja y remates terracota, raya
 * fina y cola verdes; y lo que no se viste, como lo pinta el juego.
 */
const COLOR: Readonly<Record<ColorDelModelo, string>> = {
  casco: C.crema,
  capo: C.terracota,
  detalle: C.verdeCasa,
  cola: C.verdeCasa,
  remate: C.terracota,
  oscuro: "#3b3b3b",
  gris: "#a9aeb3",
  aluminio: "#cfd3d6",
  goma: "#333333",
  cristal: "#3d5f78",
};

const SVG = "http://www.w3.org/2000/svg";

/** Lo que mide la hoja del kit. */
const ANCHO = 640;
const ALTO = 340;

// ── Armá tu avión ────────────────────────────────────────────────────────

/** **Qué partes del modelo forman cada pieza del juego.** La cola entera del primer avión es la deriva con su estabilizador. */
const PARTES: Readonly<Record<PiezaDelAvion, readonly PiezaDelModelo[]>> = {
  ala: ["ala"],
  alaArriba: ["alaArriba"],
  alaAbajo: ["alaAbajo"],
  motor: ["motor"],
  cola: ["estabilizador", "deriva"],
  estabilizador: ["estabilizador"],
  deriva: ["deriva"],
  trenPrincipal: ["trenPrincipal"],
  trenMorro: ["trenMorro"],
  trenCola: ["trenCola"],
};

/** De qué pieza del juego es cada parte del modelo en este nivel, o `null` si es del tablero. */
function piezaDe(nivel: NivelDelAvion, p: ParteDelDibujo): PiezaDelAvion | null {
  if (p.pieza === null) return null;
  return nivel.piezas.find((k) => PARTES[k].includes(p.pieza!)) ?? null;
}

const n = (x: number): string => x.toFixed(1);
/** Los puntos de un contorno, para medirlo. */
const puntosDe = (d: string): (readonly [number, number])[] =>
  [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);

interface Caja {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}
function cajaDe(partes: readonly ParteDelDibujo[]): Caja {
  const ps = partes.flatMap((p) => puntosDe(p.d));
  const xs = ps.map((p) => p[0]);
  const ys = ps.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/** El `id` del recorte del sol de la deriva: uno por avión, que en la hoja hay uno montado cada vez. */
const recorteDelSol = (tipo: string): string => `kit-deriva-${tipo}`;

/**
 * **Una parte, dibujada**: tintas planas con su contorno. Primero lo que más
 * se ve de ella, encima lo de otros colores —la franja, las ventanillas, las
 * llantas— y el contorno al final, que nada lo pise. Una hélice girando es su
 * disco, de canto.
 */
function dibujoDe(p: ParteDelDibujo, tipo: string): string {
  if (p.color === "helice")
    return `<path d="${p.d}" fill="${C.gris}" fill-opacity=".5" stroke="${C.tinta}" stroke-width="1.2" stroke-opacity=".75"/>`;
  const encima = (p.encima ?? [])
    .map((e) => `<path d="${e.d}" fill="${COLOR[e.color]}" fill-rule="evenodd"${e.color === "cristal" ? ` stroke="${C.tinta}" stroke-width=".7"` : ""}/>`)
    .join("");
  // El sol de la casa, naciendo en la raíz de la deriva y cortado por su borde, como lo pinta `world/librea.ts`.
  const sol = p.sol
    ? `<g clip-path="url(#${recorteDelSol(tipo)})"><circle cx="${p.sol.c[0]}" cy="${p.sol.c[1]}" r="${n(p.sol.r * 1.16)}" fill="${C.crema}"/><circle cx="${p.sol.c[0]}" cy="${p.sol.c[1]}" r="${p.sol.r}" fill="${C.ocre}"/></g>`
    : "";
  return `<path d="${p.d}" fill="${COLOR[p.color]}" fill-rule="evenodd"/>${encima}${sol}<path d="${p.d}" fill="none" stroke="${C.tinta}" stroke-width="1.8" stroke-linejoin="round"/>`;
}

/**
 * **La bandeja de las piezas**, abajo, como la tapa de un puzle: un sitio por
 * pieza, en fila. Y la de las luces, a la derecha, que el avión visto desde
 * arriba ocupa lo alto entero.
 */
const BANDEJA = { x0: 6, x1: 634, y: 294, alto: 78 } as const;
const BANDEJA_DE_LUCES = { x: 593, y0: 92, paso: 82 } as const;

/** Dónde espera cada pieza de un nivel: no en el orden del avión, que eso lo daría resuelto. */
function sitioEnLaBandeja(nivel: number, i: number, cuantas: number): readonly [number, number, number] {
  const orden = [4, 0, 6, 3, 1, 5, 2];
  // Saltando de tres en tres —o de cinco en cinco con seis, que de tres en tres se repetirían—, cada una en un sitio.
  const paso = cuantas % 3 === 0 ? 5 : 3;
  const k = orden.filter((x) => x < cuantas)[(i * paso + nivel * 2) % cuantas]!;
  const ancho = (BANDEJA.x1 - BANDEJA.x0) / cuantas;
  return [BANDEJA.x0 + ancho * (k + 0.5), BANDEJA.y, ancho];
}

/**
 * **El orden de las luces en su bandeja**, por nivel: en los dos primeros,
 * que es cuando se aprende, la roja arriba y la verde debajo; después,
 * cambiado, que lo que se recuerda es dónde va cada una y no en qué orden
 * llegan.
 */
const ORDEN_DE_LUCES: readonly (readonly Luz[])[] = [
  ["roja", "verde", "blanca"],
  ["roja", "verde", "blanca"],
  ["verde", "blanca", "roja"],
  ["blanca", "roja", "verde"],
  ["verde", "roja", "blanca"],
  ["roja", "blanca", "verde"],
];

/** Lo que mide cada pieza y cómo se ve en la bandeja: su centro de verdad y su escala para que quepa. */
export interface PiezaDibujada {
  readonly sitio: Sitio;
  readonly centro: readonly [number, number];
  readonly bandeja: readonly [number, number];
  readonly escala: number;
  /** Lo cerca de su hueco que basta soltarla, en puntos de la hoja: con margen, y más en las grandes. */
  readonly margen: number;
}

/** **La lámpara de cada luz**: una bombillita con su color. */
const lampara = (l: Luz, r = 13): string =>
  `<circle r="${r + 5}" fill="${l === "blanca" ? C.luzBlanca : l === "roja" ? C.roja : C.verde}" opacity=".35"/>
<circle r="${r}" fill="${l === "blanca" ? C.luzBlanca : l === "roja" ? C.roja : C.verde}" stroke="${C.tinta}" stroke-width="2.4"/>
<circle cx="${-r * 0.35}" cy="${-r * 0.35}" r="${r * 0.28}" fill="${C.blanco}" opacity=".75"/>`;

/**
 * **Hacia dónde alumbra cada luz**, desde arriba y con el morro arriba: la
 * roja de frente a 110 grados a la izquierda, la verde igual a la derecha, la
 * blanca 140 hacia atrás. Los ángulos, contados en el sentido del reloj desde
 * el morro.
 */
function abanico(l: Luz, [x, y]: readonly [number, number], r: number): string {
  const [a0, a1] = l === "roja" ? [-110, 0] : l === "verde" ? [0, 110] : [110, 250];
  const pts: string[] = [`${n(x)} ${n(y)}`];
  for (let i = 0; i <= 16; i++) {
    const g = ((a0 + ((a1 - a0) * i) / 16) * Math.PI) / 180;
    pts.push(`${n(x + r * Math.sin(g))} ${n(y - r * Math.cos(g))}`);
  }
  const color = l === "roja" ? C.roja : l === "verde" ? C.verde : C.luzBlanca;
  return `<path class="kit-abanico kit-abanico--${l}" d="M${pts.join(" L")} Z" fill="${color}"/>`;
}

/** Las piezas de un nivel, medidas: las del avión de perfil, y las luces en la planta. */
export function piezasDelNivel(i: number): readonly PiezaDibujada[] {
  const nivel = NIVELES[i]!;
  const avion = AVIONES_DEL_MODELO[nivel.tipo]!;
  const piezas = nivel.piezas.map((k, j) => {
    const caja = cajaDe(avion.perfil.partes.filter((p) => piezaDe(nivel, p) === k));
    const [bx, by, ancho] = sitioEnLaBandeja(i, j, nivel.piezas.length);
    const w = caja.x1 - caja.x0 + 4;
    const h = caja.y1 - caja.y0 + 4;
    return {
      sitio: k as Sitio,
      centro: [(caja.x0 + caja.x1) / 2, (caja.y0 + caja.y1) / 2] as const,
      bandeja: [bx, by] as const,
      // Las chicas, más grandes en la bandeja, que se vean y se agarren; las grandes, lo que quepa.
      escala: Math.min(2.4, (ancho - 16) / w, (BANDEJA.alto - 14) / h),
      margen: Math.max(46, 0.3 * Math.max(w, h)),
    };
  });
  const orden = ORDEN_DE_LUCES[i] ?? LUCES;
  const luces = LUCES.map((l) => ({
    sitio: l as Sitio,
    centro: avion.planta.luces[l],
    bandeja: [BANDEJA_DE_LUCES.x, BANDEJA_DE_LUCES.y0 + BANDEJA_DE_LUCES.paso * orden.indexOf(l)] as const,
    escala: 1,
    margen: 42,
  }));
  return [...piezas, ...luces];
}

/**
 * **La hoja de un nivel**: el avión de perfil con sus huecos, la bandeja con
 * las piezas, y el mismo avión desde arriba para las luces y la noche.
 *
 * El paso de una vista a la otra lo hace la hoja de estilos con las fases
 * (`kit-hoja--vuelta` y `kit-hoja--despegue`): la planta sale de donde
 * estaba el perfil, del mismo largo y con el morro a la derecha —`--gx`,
 * `--gy` y `--gk`—, se abre por las alas hasta caber de alto —`--gm`— y
 * llega a su sitio con el morro arriba.
 */
function hojaDelAvion(i: number): string {
  const nivel = NIVELES[i]!;
  const avion = AVIONES_DEL_MODELO[nivel.tipo]!;
  const { perfil, planta } = avion;
  const piezas = piezasDelNivel(i);
  const etiqueta = (s: Sitio): string => t(`inicio.kit.pieza.${s}` as TranslationKey);
  /*
   * **Cada hueco en la capa de su pieza**, justo debajo de ella: lo que va
   * delante tapa también el hueco de lo que va detrás —la rueda se mete
   * debajo del ala, la deriva detrás del fuselaje— y no se ven rayas que se
   * cruzan sin saber cuál va delante.
   */
  const escena = perfil.partes
    .map((p) => {
      const k = piezaDe(nivel, p);
      const dibujo = `<g class="kit-parte${k ? "" : " kit-parte--fija"}"${k ? ` data-de="${k}"` : ""}>${dibujoDe(p, nivel.tipo)}</g>`;
      if (!k) return dibujo;
      return `<g class="kit-hueco" data-sitio="${k}" role="button" aria-label="${etiqueta(k)}"><path class="kit-hueco__forma" d="${p.d}"/></g>${dibujo}`;
    })
    .join("");
  const deriva = perfil.partes.find((p) => p.sol);
  const recorte = deriva ? `<clipPath id="${recorteDelSol(nivel.tipo)}" clipPathUnits="userSpaceOnUse"><path d="${deriva.d}"/></clipPath>` : "";
  const desdeArriba = planta.partes.map((p) => dibujoDe(p, nivel.tipo)).join("");
  const huecosDeLuces = LUCES.map((l) => {
    const [x, y] = planta.luces[l];
    // Con su color en los primeros niveles; la blanca, con borde de tinta, que si no en el papel no se ve.
    const relleno = nivel.lucesConColor ? (l === "roja" ? C.roja : l === "verde" ? C.verde : C.luzBlanca) : "none";
    const borde = nivel.lucesConColor && l !== "blanca" ? relleno : C.tinta;
    return `<g class="kit-hueco kit-hueco--luz" data-sitio="${l}" role="button" aria-label="${etiqueta(l)}">
<circle cx="${n(x)}" cy="${n(y)}" r="26" fill="transparent" stroke="none"/>
<circle class="kit-hueco__forma" cx="${n(x)}" cy="${n(y)}" r="9" fill="${relleno}" fill-opacity=".55" stroke="${borde}"/></g>`;
  }).join("");
  const bandeja = piezas
    .map((pz) => {
      const [bx, by] = pz.bandeja;
      const dibujo = esLuz(pz.sitio)
        ? lampara(pz.sitio)
        : `<g transform="translate(${n(-pz.centro[0])} ${n(-pz.centro[1])})">${perfil.partes
            .filter((p) => piezaDe(nivel, p) === pz.sitio)
            .map((p) => dibujoDe(p, nivel.tipo))
            .join("")}</g>`;
      const [w, h] = esLuz(pz.sitio) ? [70, 70] : [(BANDEJA.x1 - BANDEJA.x0) / nivel.piezas.length - 6, BANDEJA.alto];
      return `<g class="kit-pieza${esLuz(pz.sitio) ? " kit-pieza--luz" : ""}" data-pieza="${pz.sitio}" style="transform: translate(${n(bx)}px, ${n(by)}px)" role="button" tabindex="0" aria-label="${etiqueta(pz.sitio)}">
<rect class="kit-pieza__toque" x="${n(-w / 2)}" y="${n(-h / 2)}" width="${n(w)}" height="${n(h)}" rx="14" fill="transparent" stroke="none"/>
<g class="kit-pieza__escala" style="--s: ${pz.escala.toFixed(3)}"><g class="kit-pieza__dibujo">${dibujo}</g></g></g>`;
    })
    .join("");
  const encendidas = LUCES.map((l) => {
    const [x, y] = planta.luces[l];
    // El sitio en un grupo y el latido en otro: el `transform` del CSS pisaría el del sitio.
    return `<g transform="translate(${n(x)} ${n(y)})"><g class="kit-luz" data-luz="${l}">${lampara(l, 6)}</g></g>`;
  }).join("");
  const abanicos = LUCES.map((l) => abanico(l, planta.luces[l], 58)).join("");
  // De dónde sale la planta: del sitio del perfil, del mismo largo y con el morro a la derecha.
  const centro = (c: readonly [number, number, number, number]): readonly [number, number] => [(c[0] + c[2]) / 2, (c[1] + c[3]) / 2];
  const [px, py] = centro(perfil.caja);
  const [qx, qy] = centro(planta.caja);
  // Y al abrirse por las alas, ya del tamaño que quepa de alto: de envergadura, la planta ocupa su ancho.
  const k = perfil.escala / planta.escala;
  const envergadura = cajaDe(planta.partes);
  const cabe = Math.min(k, (ALTO - 30) / (envergadura.x1 - envergadura.x0));
  const giro = `--gx: ${n(px - qx)}px; --gy: ${n(py - qy)}px; --gk: ${k.toFixed(3)}; --gm: ${cabe.toFixed(3)}`;
  // La sombra en la pista, debajo del tren, y el despegue, girando sobre las ruedas grandes.
  const caja = cajaDe(perfil.partes);
  const ruedas = cajaDe(perfil.partes.filter((p) => p.pieza === "trenPrincipal"));
  const cola = caja.x0;
  const medio = (caja.y0 + perfil.suelo) / 2;
  return `<svg class="kit-hoja kit-hoja--avion" data-tipo="${nivel.tipo}" viewBox="0 0 ${ANCHO} ${ALTO}" xmlns="${SVG}" aria-label="${t("inicio.kit.avion")}" style="${giro}">
<defs>${recorte}</defs>
<rect class="kit-bandeja kit-bandeja--piezas" x="${BANDEJA.x0}" y="${BANDEJA.y - BANDEJA.alto / 2 - 3}" width="${BANDEJA.x1 - BANDEJA.x0}" height="${BANDEJA.alto + 6}" rx="18"/>
<rect class="kit-bandeja kit-bandeja--luces" x="${BANDEJA_DE_LUCES.x - 40}" y="${BANDEJA_DE_LUCES.y0 - 40}" width="80" height="${BANDEJA_DE_LUCES.paso * 2 + 80}" rx="18"/>
<ellipse class="kit-sombra" cx="${n((caja.x0 + caja.x1) / 2)}" cy="${n(perfil.suelo + 3)}" rx="${n((caja.x1 - caja.x0) * 0.42)}" ry="6" fill="${C.tinta}" fill-opacity=".12"/>
<g class="kit-perfil" style="transform-origin: ${n(px)}px ${n(py)}px">
<g class="kit-vuela" style="transform-origin: ${n((ruedas.x0 + ruedas.x1) / 2)}px ${n(perfil.suelo)}px">
<g class="kit-velocidad"><path d="M${n(cola - 14)} ${n(medio - 34)} h-60 M${n(cola - 6)} ${n(medio)} h-80 M${n(cola - 14)} ${n(medio + 34)} h-50" stroke="${C.tinta}" stroke-width="5" stroke-linecap="round" opacity=".45"/></g>
<g class="kit-escena">${escena}</g>
</g>
</g>
<g class="kit-planta" style="transform-origin: ${n(qx)}px ${n(qy)}px"><g class="kit-escena">${desdeArriba}</g></g>
<rect class="kit-noche" x="-400" y="-400" width="1440" height="1140" fill="${C.noche}"/>
<g class="kit-planta" style="transform-origin: ${n(qx)}px ${n(qy)}px">
<g class="kit-abanicos">${abanicos}</g>
<g class="kit-luces">${encendidas}</g>
<g class="kit-huecos">${huecosDeLuces}</g>
</g>
<g class="kit-piezas">${bandeja}</g>
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

/**
 * **El dibujo de Armá tu avión en la hoja de elegir**: el contorno del
 * avioncito de escuela con sus huecos a trazos, y sus piezas ordenadas al
 * lado, como un puzle en su caja. Nunca un avión roto: el avión está entero
 * y quieto, y lo que falta se ve que tiene su sitio. Con el mismo marco que
 * el de Luz verde.
 */
function iconoDelAvion(): string {
  const nivel = NIVELES[0]!;
  const { perfil } = AVIONES_DEL_MODELO[nivel.tipo]!;
  const de = (k: PiezaDelAvion): readonly ParteDelDibujo[] => perfil.partes.filter((p) => piezaDe(nivel, p) === k);
  // El avión entero, de perfil, menos la cola y el motor, que tienen su hueco en su capa; y esas dos piezas en la bandeja, al lado.
  const falta = (p: ParteDelDibujo): boolean => ["cola", "motor"].includes(piezaDe(nivel, p) ?? "");
  const avion = perfil.partes
    .map((p) =>
      falta(p)
        ? `<path d="${p.d}" fill="${C.papel}" stroke="${C.tinta}" stroke-width="4" stroke-dasharray="10 8" stroke-linejoin="round"/>`
        : dibujoDe(p, nivel.tipo),
    )
    .join("");
  const pieza = (k: PiezaDelAvion, x: number, y: number, s: number): string => {
    const c = cajaDe(de(k));
    return `<g transform="translate(${x} ${y}) scale(${s}) translate(${n(-(c.x0 + c.x1) / 2)} ${n(-(c.y0 + c.y1) / 2)})">${de(k).map((p) => dibujoDe(p, nivel.tipo)).join("")}</g>`;
  };
  const c = cajaDe(perfil.partes);
  const s = Math.min(108 / (c.x1 - c.x0), 88 / (c.y1 - c.y0));
  return `<svg viewBox="0 0 160 100" aria-hidden="true">
<rect width="160" height="100" rx="12" fill="${C.mesa}"/>
<rect x="118" y="5" width="38" height="90" rx="9" fill="${C.papel}" stroke="${C.tinta}" stroke-width="1.2" stroke-dasharray="2 4"/>
<g transform="translate(${n(60 - ((c.x1 - c.x0) * s) / 2)} ${n(50 - ((c.y1 - c.y0) * s) / 2)}) scale(${s.toFixed(3)}) translate(${n(-c.x0)} ${n(-c.y0)})">${avion}</g>
${pieza("cola", 137, 26, 0.2)}${pieza("motor", 137, 56, 0.24)}
<g transform="translate(130 82)">${lampara("roja", 5)}</g><g transform="translate(145 82)">${lampara("verde", 5)}</g>
</svg>`;
}

/** Lo de cada juego en la hoja de elegir: su dibujo pequeño. */
const ICONO: Readonly<Record<JuegoDelKit, string>> = {
  luz: ICONO_DE_LA_LUZ,
  avion: iconoDelAvion(),
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
/** Y lo cerca de otro hueco para entender que se quiso poner ahí, en puntos de la hoja. */
const CERCA_DE_OTRO = 40;

export class PantallaDelKit {
  private readonly boton: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly hoja: HTMLElement;
  private readonly atras: HTMLButtonElement;
  private readonly pausa: HTMLElement;
  /** Lo que hay montado en la hoja: elegir, o el juego de ahora. */
  private montado: "elegir" | JuegoDelAvion | JuegoDeLaLuz | null = null;
  /** El nivel del avión montado: al despegar, se monta el siguiente. */
  private nivelMontado = -1;
  /** El nivel que hay guardado en el dispositivo: se escribe solo al cambiar. */
  private nivelGuardado = 0;
  private piezas: readonly PiezaDibujada[] = [];
  /** Lo que pinta la luz verde, mientras está montada. */
  private pintorDeLaLuz: PintorDeLaLuz | null = null;
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
    readonly pieza: Sitio;
    readonly id: number;
    readonly desde: { readonly x: number; readonly y: number };
    movido: boolean;
  } | null = null;

  constructor(
    private readonly raiz: HTMLElement,
    private readonly kit: KitDeViaje,
    /**
     * **Si se guarda por qué avión se va.** Sí, salvo con el kit de prueba
     * —`?inicio=3&kit`, ver `kitDePrueba` en `game.ts`—: lo que se juega
     * probando no es el progreso de nadie, y el próximo vuelo de verdad tiene
     * que empezar por donde lo dejó quien juega.
     */
    private readonly guardar = true,
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
    // Por donde se iba el otro día: solo el número del nivel, ningún dato de quien juega.
    kit.seguirArmandoDesde(leerProgreso(NIVEL_GUARDADO));
    this.nivelGuardado = kit.nivelDeArmar;
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
   * diciendo.
   */
  pintar(suena: string | null): void {
    const e = this.kit.estado;
    if (this.kit.nivelDeArmar !== this.nivelGuardado) {
      this.nivelGuardado = this.kit.nivelDeArmar;
      if (this.guardar) ponerProgreso(NIVEL_GUARDADO, this.nivelGuardado);
    }
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
    if (quiere !== this.montado || (juego instanceof JuegoDelAvion && juego.numero !== this.nivelMontado)) this.montar(quiere);
    const firma = `${JSON.stringify(e)}|${suena ?? ""}`;
    if (firma === this.firma) return;
    this.firma = firma;
    this.panel.classList.toggle("kit__panel--pausa", e.pausado);
    this.pausa.hidden = !e.pausado;
    this.atras.hidden = !juego;
    if (juego instanceof JuegoDelAvion) this.pintarElAvion(juego);
    else if (juego instanceof JuegoDeLaLuz && e.juego?.juego === "luz") this.pintorDeLaLuz?.pintar(e.juego);
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

  /** Monta lo de la hoja: elegir, o un juego nuevo, o el avión del nivel siguiente. */
  private montar(que: "elegir" | JuegoDelAvion | JuegoDeLaLuz): void {
    this.montado = que;
    this.firma = "";
    this.arrastre = null;
    this.pintorDeLaLuz = null;
    this.nivelMontado = -1;
    if (que instanceof JuegoDeLaLuz) {
      this.hoja.innerHTML = hojaDeLaLuz(que.luces);
      this.pintorDeLaLuz = new PintorDeLaLuz(this.hoja);
    } else if (que === "elegir")
      this.hoja.innerHTML = `<div class="kit-elegir">${(["luz", "avion"] as const)
        .map(
          (j) =>
            `<button class="kit-juego" type="button" data-kit-juego="${j}" aria-label="${t(`inicio.kit.${j}` as TranslationKey)}">${ICONO[j]}${ESTRELLA}</button>`,
        )
        .join("")}</div>`;
    else {
      this.nivelMontado = que.numero;
      this.piezas = piezasDelNivel(que.numero);
      this.hoja.innerHTML = hojaDelAvion(que.numero);
    }
  }

  private pieza(s: Sitio): PiezaDibujada | undefined {
    return this.piezas.find((p) => p.sitio === s);
  }

  private pintarElAvion(juego: JuegoDelAvion): void {
    const e = juego.estado;
    const svg = this.hoja.querySelector("svg");
    if (!svg) return;
    for (const f of ["piezas", "vuelta", "luces", "noche", "despegue"]) svg.classList.toggle(`kit-hoja--${f}`, e.fase === f);
    svg.classList.toggle("kit-hoja--hecha", e.terminado);
    for (const pz of this.piezas) {
      const s = pz.sitio;
      const g = this.hoja.querySelector<SVGGElement>(`[data-pieza="${s}"]`);
      // Una pieza puede tener su hueco en varias capas: la cola entera es la deriva, detrás del fuselaje, y el estabilizador, delante.
      const huecos = this.hoja.querySelectorAll<SVGGElement>(`[data-sitio="${s}"]`);
      if (!g || !huecos.length) continue;
      const puesta = e.puestas.includes(s);
      const deLaFase = esLuz(s) ? e.fase === "luces" : e.fase === "piezas";
      if (this.arrastre?.pieza !== s) {
        const [x, y] = puesta ? pz.centro : pz.bandeja;
        g.style.transform = `translate(${n(x)}px, ${n(y)}px)`;
      }
      g.classList.toggle("kit-pieza--puesta", puesta);
      g.classList.toggle("kit-pieza--fuera", !puesta && !deLaFase);
      g.classList.toggle("kit-pieza--cogida", e.cogida === s);
      g.classList.toggle("kit-pieza--senala", e.senala === s);
      g.setAttribute("tabindex", puesta || !deLaFase ? "-1" : "0");
      g.setAttribute("aria-disabled", String(puesta || !deLaFase));
      for (const hueco of huecos) {
        hueco.classList.toggle("kit-hueco--puesto", puesta || !deLaFase);
        hueco.classList.toggle("kit-hueco--brilla", !puesta && deLaFase && e.ilumina === s);
      }
      if (esLuz(s)) this.hoja.querySelector(`[data-luz="${s}"]`)?.classList.toggle("kit-luz--puesta", puesta);
      else for (const parte of this.hoja.querySelectorAll(`[data-de="${s}"]`)) parte.classList.toggle("kit-parte--puesta", puesta);
    }
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
    const sitio = donde?.closest("[data-sitio]")?.getAttribute("data-sitio") as Sitio | null;
    if (sitio && j instanceof JuegoDelAvion && !donde?.closest("[data-pieza]")) {
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
    /*
     * **La luz verde, al apretar** y no al soltar: los avioncitos se mueven, y
     * entre bajar y levantar el dedo el de un niño de cuatro años ya se fue de
     * debajo. Un toque en un avión le apunta la lámpara; uno en una luz, la
     * enciende.
     */
    if (j instanceof JuegoDeLaLuz) {
      const donde = event.target as Element | null;
      const senal = donde?.closest("[data-luz-senal]")?.getAttribute("data-luz-senal") as Senal | null;
      const avion = donde?.closest("[data-luz-avion]")?.getAttribute("data-luz-avion");
      if (!senal && !avion) return;
      event.preventDefault();
      this.kit.tocado();
      if (senal) j.encender(senal);
      else if (avion) j.apuntar(Number(avion));
      return;
    }
    if (!(j instanceof JuegoDelAvion) || this.arrastre) return;
    const g = (event.target as Element | null)?.closest<SVGGElement>("[data-pieza]");
    const p = g?.getAttribute("data-pieza") as Sitio | null;
    if (!g || !p || !j.aMano(p)) return;
    event.preventDefault();
    this.arrastre = { pieza: p, id: event.pointerId, desde: { x: event.clientX, y: event.clientY }, movido: false };
    this.hoja.setPointerCapture?.(event.pointerId);
    // Encima de todo mientras se lleva.
    g.parentElement?.appendChild(g);
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
    // Llevada, toma el tamaño de su hueco, con el dedo en el centro.
    g.classList.add("kit-pieza--llevada");
    g.style.transform = `translate(${n(en.x)}px, ${n(en.y)}px)`;
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
    if (!(j instanceof JuegoDelAvion)) return;
    this.kit.tocado();
    this.firma = "";
    if (!a.movido || event.type === "pointercancel") {
      // Un toque: se coge, y con otro en su sitio se suelta.
      if (event.type !== "pointercancel") j.tocarPieza(a.pieza);
      return;
    }
    const en = this.enLaHoja(event);
    const suya = this.pieza(a.pieza);
    if (!en || !suya) return;
    const lejos = (s: Sitio): number => {
      const c = this.pieza(s)!.centro;
      return Math.hypot(en.x - c[0], en.y - c[1]);
    };
    /*
     * **Con margen**: cerca de su hueco, encaja aunque haya otro más cerca. Lo
     * que se pide es la idea, no la puntería. Cerca de otro hueco de los que
     * faltan, vuelve con calma y el suyo brilla; y soltada en ninguna parte,
     * vuelve a la bandeja sin más.
     */
    if (lejos(a.pieza) < suya.margen) {
      j.soltar(a.pieza, a.pieza, this.kit.hayHueco);
      return;
    }
    const otro = this.piezas
      .map((p) => p.sitio)
      .filter((s) => s !== a.pieza && j.aMano(s) && esLuz(s) === esLuz(a.pieza))
      .sort((p, q) => lejos(p) - lejos(q))[0];
    j.soltar(a.pieza, otro && lejos(otro) < Math.max(CERCA_DE_OTRO, this.pieza(otro)!.margen * 0.8) ? otro : null, this.kit.hayHueco);
  };

  /**
   * **El teclado**: el tabulador recorre lo que se toca; con Intro o la barra
   * se elige un juego, se lleva una pieza a su sitio o se da una luz; y con
   * Escape se guarda el kit. Lo que se usa aquí no le llega al avión.
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
    const pieza = donde?.closest("[data-pieza]")?.getAttribute("data-pieza") as Sitio | null;
    if (pieza && j instanceof JuegoDelAvion) {
      event.preventDefault();
      this.kit.tocado();
      j.colocar(pieza);
      return;
    }
    if (j instanceof JuegoDeLaLuz) {
      const senal = donde?.closest("[data-luz-senal]")?.getAttribute("data-luz-senal") as Senal | null;
      const avion = donde?.closest("[data-luz-avion]")?.getAttribute("data-luz-avion");
      if (!senal && !avion) return;
      event.preventDefault();
      this.kit.tocado();
      if (senal) j.encender(senal);
      else if (avion) j.apuntar(Number(avion));
    }
  };

  /** Dónde está cada cosa de la hoja en la pantalla: para el banco, que juega con el dedo. */
  get paraBanco(): {
    readonly boton: DOMRect | null;
    readonly panel: DOMRect | null;
    /** Las piezas y las luces que se pueden llevar ahora, con su hueco. */
    readonly piezas: Readonly<Record<string, { readonly en: DOMRect; readonly sitio: DOMRect }>>;
    readonly juegos: Readonly<Record<string, DOMRect>>;
    readonly luz: ReturnType<PintorDeLaLuz["paraBanco"]> | null;
  } {
    const caja = (el: Element | null): DOMRect | null => (el && !el.closest("[hidden]") ? el.getBoundingClientRect() : null);
    const piezas: Record<string, { en: DOMRect; sitio: DOMRect }> = {};
    const j = this.kit.juegoDeAhora;
    if (j instanceof JuegoDelAvion)
      for (const { sitio: s } of this.piezas) {
        if (!j.aMano(s)) continue;
        const en = caja(this.hoja.querySelector(`[data-pieza="${s}"] .kit-pieza__dibujo`));
        // El hueco entero, con todas sus capas.
        const capas = [...this.hoja.querySelectorAll(`[data-sitio="${s}"] .kit-hueco__forma`)].map(caja).filter((r): r is DOMRect => !!r);
        const sitio = capas.length
          ? capas.reduce((a, b) => {
              const x = Math.min(a.left, b.left);
              const y = Math.min(a.top, b.top);
              return new DOMRect(x, y, Math.max(a.right, b.right) - x, Math.max(a.bottom, b.bottom) - y);
            })
          : null;
        if (en && sitio) piezas[s] = { en, sitio };
      }
    const juegos: Record<string, DOMRect> = {};
    for (const b of this.hoja.querySelectorAll<HTMLElement>("[data-kit-juego]")) {
      const r = caja(b);
      if (r) juegos[b.dataset.kitJuego!] = r;
    }
    return { boton: caja(this.boton), panel: caja(this.panel), piezas, juegos, luz: this.pintorDeLaLuz?.paraBanco() ?? null };
  }
}

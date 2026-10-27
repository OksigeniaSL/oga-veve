/**
 * **La carta del país**: el sitio de salida, los campos y las rutas que se
 * pueden volar, sobre una carta aeronáutica de verdad.
 *
 * Contado jugando: «no me deja elegir otro aeropuerto y quiero viajar por todo
 * Paraguay». Una lista de fichas no dice lo que dice un mapa —**dónde está
 * cada sitio**—, y desde el 26 de octubre de 2026 ese mapa es la cara del
 * juego: papel de carta, el relieve con sus tintas hipsométricas y su
 * sombreado del noroeste, la cubierta del suelo, el mar con sus veriles, el
 * aeródromo de la OACI con la pista girada a su rumbo, la rosa con la
 * declinación de hoy y las rutas en magenta. Ver `carta/estilo.ts`.
 *
 * ## Por calcos
 *
 * Lo que se escribe encima va por peldaños, como hojas de papel calco que se
 * suman: el dibujo en los cuatro; los nombres desde Tukã; las cifras desde
 * Taguato; la radio en Taguato Ruvicha. Y el indicativo OACI en todos, porque
 * ya estaba. Ver `calcosDe` en `flight/escalera.ts`.
 *
 * ## Cada rótulo donde cabe
 *
 * Dónde va cada rótulo no se decide aquí, sino ya en la página, con lo que
 * mide de verdad la letra y lo que mide la carta: ver `colocarLaCarta` y
 * `carta/rotulos.ts`. Lo que no cabe no se escribe, y sigue en la ficha.
 *
 * ## Tocar un aeródromo abre su ficha
 *
 * Su sello, su pista con su forma y el avión que va a ir; y para quien lee,
 * sus pistas con sus números, su elevación, el rumbo y las millas y, en el
 * calco de la radio, sus frecuencias como las publica su AIP. Y en la ficha,
 * el botón de ir: el mismo `data-destino` —o `data-destino-lejos` con su
 * `data-con`— que llevaban los puntos, así que quien elige destino lo sigue
 * eligiendo igual. El punto en sí lleva `data-ficha`, que solo abre y cierra:
 * ver `abrirFichaDeLaCarta`. Si sobra papel al lado de la región, la ficha va
 * ahí y no encima: ver `ponerElMargen`.
 *
 * ## Lo que no es
 *
 * No es el mando: los mandos son las fichas de abajo, con su porqué y su
 * propuesta, y son los que recorre el teclado y leen los lectores. La carta
 * entera va oculta a los lectores para no decirlo todo dos veces.
 *
 * ## De dónde sale cada cosa
 *
 * El fondo, del horno (`scripts/carta-hornear.mjs`: ETOPO 2022, ESA
 * WorldCover y CHELSA); la costa y los ríos, de Natural Earth (`siluetas.ts`,
 * `rios.ts`); los puntos, del origen de cada aeródromo extraído —el mismo con
 * el que se monta el mundo—, y lo vigila `mapa-del-pais.test.ts`; las cotas,
 * de los hitos de OpenStreetMap (`lo-destacado.ts`); las frecuencias, del AIP
 * (`frecuencias-publicadas.ts`); la declinación, del WMM2025.
 */

import type { Scenario } from "../world/scenarios";
import type { Pista } from "../world/aerodrome";
import { SILUETAS } from "./siluetas";
import { RIOS } from "./rios";
import { t, type TranslationKey } from "../i18n";
import { calcosDe, type Peldano } from "../flight/escalera";
import { LINEAS, SIMBOLOS, variablesDeLaCarta, type IdRegion } from "./carta/estilo";
import { imagenDe, PAPEL_URL, proyeccionDe, regionDe } from "./carta/region";
import { rosa, simboloDeAerodromo, PUNTO_DE_COTA } from "./carta/simbolos";
import { anoDecimal, declinacion, varEscrita } from "./carta/declinacion";
import { frecuenciasDeLaCarta, RADIO } from "../world/frecuencias-publicadas";
import { DESTACADOS } from "../world/lo-destacado";
import {
  colocar,
  sitiosAlrededor,
  sitiosEnLaRaya,
  sitiosEntre,
  type Caja,
  type PorColocar,
  type Raya,
} from "./carta/rotulos";
import { selloDe } from "./sellos";
import { retratoDe, TAMANO_DE_RETRATO } from "./retratos";

/** Una ruta desde el sitio de salida, tal como la ve este avión. */
export interface RutaEnElMapa {
  readonly destino: Scenario;
  /** Si este avión llega a ese campo. */
  readonly cabe: boolean;
  /**
   * El avión que sí llegaría, si este no: tocar el botón de ir de su ficha
   * acepta la propuesta, como tocar su ficha de abajo. `null` si no hay
   * ninguno.
   */
  readonly con: string | null;
}

/** Longitud y latitud de un escenario, si es un aeródromo de verdad. */
const dondeEsta = (e: Scenario): readonly [number, number] | null =>
  e.aerodrome ? [e.aerodrome.origin.lon, e.aerodrome.origin.lat] : null;

const r3 = (n: number): string => (Math.round(n * 1000) / 1000).toString();

/** Un pie, en metros: las cotas de la carta van en pies, como en aviación. */
const PIE = 0.3048;
/** Una milla náutica, en metros. */
const MILLA = 1852;
const R = 6371008;

/**
 * Los nombres que se escriben en el agua y en las tierras de alrededor, por
 * región: islas, mar, ríos y países vecinos. Las islas no se traducen —son
 * nombres propios—; lo demás sí. Puestos a mano donde una carta los pondría:
 * en el mar junto a su isla, a lo largo de su río.
 *
 * Y con **otros sitios a lo largo del mismo río o de la misma tierra**, por
 * si en el primero no caben: un río se puede rotular en cualquier tramo, y lo
 * que no puede es tapar un aeródromo o una ruta. Ver `carta/rotulos.ts`.
 */
const NOMBRES: Readonly<
  Record<
    IdRegion,
    readonly {
      readonly texto: string | TranslationKey;
      readonly lon: number;
      readonly lat: number;
      readonly clase: "isla" | "agua" | "pais";
      readonly otros?: readonly (readonly [number, number])[];
    }[]
  >
> = {
  canarias: [
    { texto: "La Palma", lon: -17.84, lat: 29.0, clase: "isla" },
    { texto: "El Hierro", lon: -17.98, lat: 27.56, clase: "isla" },
    { texto: "La Gomera", lon: -17.22, lat: 27.93, clase: "isla" },
    { texto: "Tenerife", lon: -16.95, lat: 28.68, clase: "isla" },
    { texto: "Gran Canaria", lon: -15.6, lat: 27.6, clase: "isla" },
    { texto: "Fuerteventura", lon: -14.72, lat: 28.5, clase: "isla" },
    { texto: "Lanzarote", lon: -13.95, lat: 29.38, clase: "isla" },
    { texto: "carta.atlantico", lon: -15.7, lat: 29.25, clase: "agua", otros: [[-16.4, 29.2], [-16.3, 27.6], [-14.3, 27.7]] },
  ],
  paraguay: [
    {
      texto: "carta.rioParaguay",
      lon: -57.75,
      lat: -23.2,
      clase: "agua",
      otros: [[-58.05, -21.7], [-57.85, -22.5], [-58.0, -24.3]],
    },
    {
      texto: "carta.rioParana",
      lon: -56.6,
      lat: -27.62,
      clase: "agua",
      otros: [[-57.6, -27.62], [-55.5, -27.35], [-54.75, -26.6]],
    },
    {
      texto: "carta.rioPilcomayo",
      lon: -59.6,
      lat: -24.45,
      clase: "agua",
      otros: [[-60.6, -23.75], [-58.8, -24.95], [-61.5, -23.05]],
    },
    { texto: "carta.bolivia", lon: -61.9, lat: -19.5, clase: "pais", otros: [[-62.3, -20.5], [-60.9, -19.3]] },
    { texto: "carta.brasil", lon: -54.6, lat: -21.3, clase: "pais", otros: [[-55.0, -20.3], [-54.3, -23.0]] },
    { texto: "carta.argentina", lon: -60.6, lat: -26.6, clase: "pais", otros: [[-59.5, -27.4], [-61.6, -25.7]] },
  ],
  madrid: [],
};

/** Dónde va la rosa en cada región: donde no tapa nada. */
const ROSA_EN: Readonly<Record<IdRegion, readonly [number, number]>> = {
  canarias: [-13.75, 27.85],
  paraguay: [-62.2, -27.3],
  madrid: [-4.5, 39.98],
};

/** El largo de una pista, por su eje. */
function largoDe(p: Pista): number {
  const a = p.centerline[0];
  const b = p.centerline[p.centerline.length - 1];
  return a && b ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0;
}

/** Los números de una pista, «12/30», como los trae su fichero. */
function numerosDe(p: Pista): string {
  const n = Object.keys(p.thresholds);
  return n.length >= 2 ? `${n[0]}/${n[1]}` : (p.ref ?? n[0] ?? "");
}

/** Si el AIP le publica torre: el símbolo civil; si no, el pequeño. */
function tieneTorre(oaci: string | null): boolean {
  return frecuenciasDeLaCarta(oaci)?.torre?.servicio === "TWR";
}

/** Del fichero del aeródromo —la Y al norte— al dibujo de su ficha —la Y abajo—, en cien de lado. */
function encuadreDePistas(
  e: Scenario,
  /** Cuánto más que las pistas mide el dibujo: con números hace falta sitio alrededor. */
  holgura = 1.8,
): ((p: readonly [number, number]) => [number, number]) & { lado: number } {
  const puntos = (e.aerodrome?.runways ?? []).flatMap((p) => p.centerline);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const [x, y] of puntos) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  // Con sitio alrededor para los números de las cabeceras y la flecha del norte.
  const lado = Math.max(x1 - x0, y1 - y0) * holgura || 1;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return Object.assign(
    ([x, y]: readonly [number, number]): [number, number] => [50 + ((x - cx) / lado) * 100, 50 - ((y - cy) / lado) * 100],
    { lado },
  );
}

/**
 * La flecha del norte del dibujo, en su esquina: en el medio de arriba caía
 * encima del número de una pista norte-sur.
 */
const FLECHA_DEL_NORTE = "M8 2 L12.5 12 L8 10 L3.5 12 Z";
/** La caja de la flecha, para que no la pise ningún número. */
export const CAJA_DEL_NORTE = { x0: 3, y0: 1.5, x1: 13, y1: 12.5 } as const;

/** El cuerpo de los números de pista en el dibujo de la ficha, en unidades del dibujo (cien de lado). */
const CUERPO_DE_PISTA = 11;

/** Lo que ocupa un número de pista en el dibujo: Barlow estrecha, con su halo de papel. */
export const anchoDeNumeroDePista = (nombre: string): number => nombre.length * CUERPO_DE_PISTA * 0.52 + 3;

/**
 * **Dónde va el número de cada cabecera** en el dibujo de la ficha: un poco
 * más allá del umbral, por fuera de la pista. Y el de una paralela, a su lado
 * de verdad: el 03L, a la izquierda de quien despega o aterriza por el 03 —el
 * oeste en Gran Canaria—, y el 03R a la derecha. Estaban cambiados de lado, y
 * en Gran Canaria los dos números se montaban uno encima del otro en medio de
 * las dos pistas.
 *
 * Una cabecera repetida —Cuatro Vientos trae dos pistas con los mismos
 * umbrales— se rotula una vez: dos números iguales en el mismo sitio son uno
 * ilegible.
 */
export function numerosDePista(e: Scenario): { nombre: string; x: number; y: number }[] {
  const en = encuadreDePistas(e);
  const salen: { nombre: string; x: number; y: number }[] = [];
  for (const p of e.aerodrome?.runways ?? []) {
    const c = p.centerline;
    for (const [nombre, u] of Object.entries(p.thresholds)) {
      if (!u?.xy || !c[0]) continue;
      const [x, y] = en(u.xy);
      // La otra punta es la más lejana del umbral, no la que no coincide con él:
      // un umbral desplazado no cae en la punta de su eje.
      const ultima = c[c.length - 1] ?? c[0];
      const otra =
        Math.hypot(c[0][0] - u.xy[0], c[0][1] - u.xy[1]) > Math.hypot(ultima[0] - u.xy[0], ultima[1] - u.xy[1]) ? c[0] : ultima;
      const [ox, oy] = en(otra);
      // Hacia fuera de la pista, por su cabecera.
      const dx = x - ox;
      const dy = y - oy;
      const d = Math.hypot(dx, dy) || 1;
      /*
       * La izquierda de quien mira pista adentro —de la cabecera hacia la otra
       * punta—, con la Y del dibujo hacia abajo: mirando al norte (0, −1), la
       * izquierda es el oeste (−1, 0).
       */
      const izq: [number, number] = [-dy / d, dx / d];
      const lado = /L$/.test(nombre) ? 1 : /R$/.test(nombre) ? -1 : 0;
      const aparte = lado ? anchoDeNumeroDePista(nombre) / 2 + 1.5 : 0;
      const fuera = CUERPO_DE_PISTA * 0.8;
      const n = {
        nombre,
        x: x + (dx / d) * fuera + izq[0] * aparte * lado,
        y: y + (dy / d) * fuera + izq[1] * aparte * lado,
      };
      if (!salen.some((o) => o.nombre === n.nombre && Math.hypot(o.x - n.x, o.y - n.y) < 4)) salen.push(n);
    }
  }
  return salen;
}

/**
 * Las pistas de un aeródromo dibujadas para su ficha, con el norte arriba y
 * su rumbo de verdad; y sus números en las cabeceras desde el calco de las
 * cifras.
 */
function dibujoDePistas(e: Scenario, conNumeros: boolean): string {
  const pistas = e.aerodrome?.runways ?? [];
  const puntos = pistas.flatMap((p) => p.centerline);
  if (puntos.length < 2) return "";
  // Sin números, la pista más grande: es lo que se mira.
  const en = encuadreDePistas(e, conNumeros ? 1.8 : 1.35);
  const { lado } = en;
  /*
   * **Y el campo alrededor**: las plataformas y las calles de rodaje, en el
   * tono del papel. Sin ellas una pista es una raya en medio de una hoja, y con
   * ellas se reconoce el aeródromo: Asunción no se parece a Yvytu Rape.
   */
  const punto = (q: readonly [number, number]): string => en(q).map(r3).join(",");
  const plataformas = (e.aerodrome?.aprons ?? [])
    .filter((a) => a.polygon.length > 2)
    .map((a) => `<polygon class="pistas__plataforma" points="${a.polygon.map(punto).join(" ")}" />`)
    .join("");
  const calles = (e.aerodrome?.taxiways ?? [])
    .filter((c) => c.path.length > 1)
    .map(
      (c) =>
        `<polyline class="pistas__calle" stroke-width="${r3(Math.max(1.2, ((c.widthM ?? 18) / lado) * 100))}" points="${c.path.map(punto).join(" ")}" />`,
    )
    .join("");
  /*
   * Lo que separa dos paralelas, en unidades del dibujo: en Gran Canaria son
   * doscientos metros en tres kilómetros de pista, y con el grueso mínimo de
   * cinco las dos barras se fundían en una.
   */
  let separacion = Infinity;
  for (const p of pistas)
    for (const q of pistas) {
      const [a, b] = [p.centerline[0], p.centerline[p.centerline.length - 1]];
      const [c, d] = [q.centerline[0], q.centerline[q.centerline.length - 1]];
      if (p === q || !a || !b || !c || !d) continue;
      const ux = b[0] - a[0];
      const uy = b[1] - a[1];
      const l = Math.hypot(ux, uy) || 1;
      const vx = d[0] - c[0];
      const vy = d[1] - c[1];
      // Solo las que corren juntas: menos de diez grados entre una y otra.
      if (Math.abs(ux * vy - uy * vx) / (l * (Math.hypot(vx, vy) || 1)) > 0.17) continue;
      const mx = (c[0] + d[0]) / 2 - a[0];
      const my = (c[1] + d[1]) / 2 - a[1];
      const perp = Math.abs(mx * uy - my * ux) / l;
      if (perp > 1) separacion = Math.min(separacion, (perp / lado) * 100);
    }
  const barras = pistas
    .map((p) => {
      const a = p.centerline[0];
      const b = p.centerline[p.centerline.length - 1];
      if (!a || !b) return "";
      const [ax, ay] = en(a);
      const [bx, by] = en(b);
      // A su anchura, y como poco cinco; pero entre dos paralelas, con hueco.
      const grueso = Math.min(Math.max(5, ((p.widthM ?? 45) / lado) * 100), separacion * 0.6);
      return `<line x1="${r3(ax)}" y1="${r3(ay)}" x2="${r3(bx)}" y2="${r3(by)}" class="pistas__barra" stroke-width="${r3(grueso)}" />
        <line x1="${r3(ax)}" y1="${r3(ay)}" x2="${r3(bx)}" y2="${r3(by)}" class="pistas__eje" />`;
    })
    .join("");
  const numeros = conNumeros
    ? numerosDePista(e)
        .map((n) => `<text x="${r3(n.x)}" y="${r3(n.y)}" class="pistas__numero">${n.nombre}</text>`)
        .join("")
    : "";
  return `<svg class="pistas" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="${FLECHA_DEL_NORTE}" class="pistas__norte" />
      ${plataformas}${calles}${barras}${numeros}
    </svg>`;
}

/** Lo que mide un texto, a ojo: Barlow estrecha anda por el 0,47 del cuerpo. */
export const anchoDe = (texto: string, cuerpo: number): number => texto.length * cuerpo * 0.5 + 4;

/** Las cifras de una latitud o longitud de la retícula: «28°30′N». */
function grados(v: number, positivo: string, negativo: string): string {
  const a = Math.abs(v);
  const g = Math.floor(a + 1e-9);
  const m = Math.round((a - g) * 60);
  return `${g}°${m ? `${String(m).padStart(2, "0")}′` : ""}${v >= 0 ? positivo : negativo}`;
}

/**
 * **Lo que el colocador necesita saber de un rótulo**: qué es y a qué se
 * agarra. Va escrito en el propio rótulo —`data-e`— para que el colocador lo
 * lea de la página cada vez que la carta cambia de tamaño, sin rehacerla.
 * Ver `colocarLaCarta` y `carta/rotulos.ts`.
 */
export interface Etiqueta {
  readonly tipo: "campo" | "ruta" | "isla" | "agua" | "pais" | "cota" | "grado" | "leyenda";
  /** Dónde se agarra, en fracción del lienzo: de 0 a 1. */
  readonly x: number;
  readonly y: number;
  /** El otro extremo, si es de ruta: el destino. */
  readonly x2?: number;
  readonly y2?: number;
  /** Otros sitios donde puede ir un nombre, en fracción del lienzo. */
  readonly otros?: readonly (readonly [number, number])[];
  /** El radio del símbolo que rotula, en píxeles. */
  readonly r?: number;
  /** Cuál es su raya entre las rutas, si es de ruta. */
  readonly raya?: number;
  /** El orden en que se coloca: primero lo que más importa. */
  readonly orden: number;
}

const r4 = (n: number): number => Math.round(n * 10000) / 10000;
const conEtiqueta = (e: Etiqueta): string => `data-e='${JSON.stringify(e)}'`;

/**
 * Las formas de un rótulo de aeródromo, de la entera a la más corta: sin la
 * radio; sin la radio ni las cifras; solo el primer renglón; y solo el
 * indicativo, cuatro letras, cuando ni el nombre cabe —«Silvio Pettirossi» en
 * el teléfono pequeño—. La primera que quepa es la que se escribe; lo quitado
 * sigue en la ficha. Ver la hoja de estilos, `.pais__rotulo[data-v]`.
 */
const FORMAS_DE_ROTULO = 5;

/** El rumbo magnético y las millas de una ruta, como se escriben en una carta: «247° · 38 NM». */
function rumboYMillas(
  desde: readonly [number, number],
  hasta: readonly [number, number],
  dec: number,
): { rumbo: string; millas: number } {
  const k = Math.cos((((desde[1] + hasta[1]) / 2) * Math.PI) / 180);
  const este = (hasta[0] - desde[0]) * k;
  const norte = hasta[1] - desde[1];
  const millas = Math.round((Math.hypot(este, norte) * Math.PI * R) / 180 / MILLA);
  const verdadero = (Math.atan2(este, norte) * 180) / Math.PI;
  const magnetico = Math.round((((verdadero - dec) % 360) + 360) % 360) || 360;
  return { rumbo: `${String(magnetico).padStart(3, "0")}°`, millas };
}

/** El avión del botón de ir, con el morro hacia donde se va. */
const AVION_DE_IR = `<svg viewBox="-17 -16 34 30" aria-hidden="true" focusable="false"><path d="M0 -13C1.6 -13 2.1 -11 2.1 -8.5V-3.2H13.4C14.4 -3.2 14.8 -2.6 14.8 -1.8V0.2H2.1V6.6L6.4 8.6V11H-6.4V8.6L-2.1 6.6V0.2H-14.8V-1.8C-14.8 -2.6 -14.4 -3.2 -13.4 -3.2H-2.1V-8.5C-2.1 -11 -1.6 -13 0 -13Z" /></svg>`;

/**
 * **La carta del país del sitio de salida**, en HTML: el fondo horneado, la
 * costa, la retícula y las rutas en SVG, y encima lo que se toca y lo que se
 * lee, puesto en porcentaje.
 *
 * `campos` son todos los aeródromos de verdad del país —con ruta o sin ella—,
 * porque también enseña algo ver que un campo existe y todavía no se puede ir
 * a él desde aquí. `elegido` es el destino de ahora; el propio sitio es la
 * vuelta al campo. `peldano` decide los calcos; sin él, el del dibujo, que es
 * lo que enseñaba el mapa antes de ser carta. `avion` es el que vuela, para
 * la ficha de cada campo: es el que va a ir allí.
 *
 * Los rótulos salen a la derecha de su punto y en la mitad de su ruta; dónde
 * caben de verdad lo decide `colocarLaCarta`, ya con la carta en la página.
 *
 * Vacío si el sitio no está en ninguna carta: los escenarios inventados no
 * están en ningún mapa.
 */
export function mapaDelPais(
  sitio: Scenario,
  campos: readonly Scenario[],
  rutas: readonly RutaEnElMapa[],
  elegido: string,
  peldano: Peldano = "dibujo",
  avion: string | null = null,
): string {
  if (sitio.pais === "inventado") return "";
  const aqui = dondeEsta(sitio);
  if (!aqui) return "";
  const id = regionDe({ lon: aqui[0], lat: aqui[1] });
  if (!id) return "";
  const pro = proyeccionDe(id);
  const { ancho, alto, xy, region } = pro;
  const calcos = calcosDe(peldano);
  const pequenos = peldano === "dibujo";
  const hoy = anoDecimal(new Date());
  /** En fracción del lienzo, de 0 a 1. */
  const enFraccion = (p: readonly [number, number]): [number, number] => {
    const [x, y] = xy(p);
    return [r4(x / ancho), r4(y / alto)];
  };
  const enPorcentaje = (p: readonly [number, number]): string => {
    const [x, y] = enFraccion(p);
    return `left: ${(x * 100).toFixed(2)}%; top: ${(y * 100).toFixed(2)}%`;
  };
  const dentro = ([lon, lat]: readonly [number, number]): boolean =>
    lon > region.oeste && lon < region.este && lat > region.sur && lat < region.norte;
  const conSitio = campos.flatMap((e) => {
    const p = dondeEsta(e);
    return p && dentro(p) && e.pais === sitio.pais ? [{ e, p }] : [];
  });

  // ── El dibujo: retícula, costa, frontera, ríos y rutas ─────────────────
  const camino = (anillo: readonly (readonly [number, number])[], cerrar: boolean): string =>
    "M" +
    anillo
      .map((p) => {
        const [x, y] = xy(p);
        return `${r3(x)} ${r3(y)}`;
      })
      .join("L") +
    (cerrar ? "Z" : "");
  const reticula: string[] = [];
  const cifrasDeLaReticula: string[] = [];
  for (let lon = Math.ceil(region.oeste * 2) / 2; lon < region.este; lon += 0.5) {
    reticula.push(camino([[lon, region.sur], [lon, region.norte]], false));
    if (calcos.cifras && Number.isInteger(lon)) {
      const [x, y] = enFraccion([lon, region.norte]);
      cifrasDeLaReticula.push(
        `<span class="pais__letra pais__numeros pais__grado pais__grado--lon" ${conEtiqueta({ tipo: "grado", x, y, orden: 70 })} style="${enPorcentaje([lon, region.norte])}">${grados(lon, "E", "W")}</span>`,
      );
    }
  }
  for (let lat = Math.ceil(region.sur * 2) / 2; lat < region.norte; lat += 0.5) {
    reticula.push(camino([[region.oeste, lat], [region.este, lat]], false));
    if (calcos.cifras && Number.isInteger(lat)) {
      const [x, y] = enFraccion([region.oeste, lat]);
      cifrasDeLaReticula.push(
        `<span class="pais__letra pais__numeros pais__grado pais__grado--lat" ${conEtiqueta({ tipo: "grado", x, y, orden: 70 })} style="${enPorcentaje([region.oeste, lat])}">${grados(lat, "N", "S")}</span>`,
      );
    }
  }
  const costa =
    region.conMar
      ? `<path class="pais__costa" d="${SILUETAS.es.map((a) => camino(a, true)).join("")}" />`
      : region.pais
        ? `<path class="pais__frontera" d="${SILUETAS[region.pais].map((a) => camino(a, true)).join("")}" />`
        : "";
  const rios =
    region.pais === "py" ? `<path class="pais__rio" d="${RIOS.py.map((l) => camino(l, false)).join("")}" />` : "";

  const [sx, sy] = xy(aqui);
  const decAqui = declinacion(aqui[1], aqui[0], hoy);
  const cifrasDeRuta: string[] = [];
  let rayasPuestas = 0;
  const rayas = rutas
    .map(({ destino, cabe }) => {
      const p = dondeEsta(destino);
      if (!p) return "";
      const [dx, dy] = xy(p);
      const clase = [
        "pais__ruta",
        cabe ? "pais__ruta--cabe" : "pais__ruta--no",
        destino.id === elegido ? "pais__ruta--elegida" : "",
      ]
        .filter(Boolean)
        .join(" ");
      /*
       * Y desde el calco de las cifras, **el rumbo y las millas**, como se
       * escriben en una carta: «247° · 38 NM». Rumbo magnético —el que se
       * vuela con la brújula—, con la declinación de hoy en la salida.
       */
      if (calcos.cifras) {
        const { rumbo, millas } = rumboYMillas(aqui, p, decAqui);
        const [ax, ay] = enFraccion(aqui);
        const [bx, by] = enFraccion(p);
        cifrasDeRuta.push(
          `<span class="pais__letra pais__numeros pais__cifra-ruta${cabe ? "" : " pais__cifra-ruta--no"}" ${conEtiqueta({
            tipo: "ruta",
            x: ax,
            y: ay,
            x2: bx,
            y2: by,
            raya: rayasPuestas,
            orden: destino.id === elegido ? 30 : cabe ? 31 : 32,
          })} style="left: ${((ax + (bx - ax) * 0.6) * 100).toFixed(2)}%; top: ${((ay + (by - ay) * 0.6) * 100).toFixed(2)}%">${rumbo} · ${millas} NM</span>`,
        );
      }
      rayasPuestas++;
      const linea = `x1="${r3(sx)}" y1="${r3(sy)}" x2="${r3(dx)}" y2="${r3(dy)}"`;
      // La orla de papel debajo: el magenta solo no llega a 3:1 sobre el pardo.
      return `<line class="pais__orla${cabe ? "" : " pais__orla--no"}" ${linea} /><line class="${clase}" ${linea} />`;
    })
    .join("");

  // ── Lo que se lee: nombres, cotas, la rosa ─────────────────────────────
  const [rlon, rlat] = ROSA_EN[id];
  const decRosa = declinacion(rlat, rlon, hoy);
  const laRosa = `<span class="pais__rosa" style="${enPorcentaje([rlon, rlat])}">${rosa(
    calcos.radio ? decRosa : null,
    calcos.radio,
  )}${calcos.radio ? `<i class="pais__letra pais__numeros">${varEscrita(decRosa)} ${Math.floor(hoy)}</i>` : ""}</span>`;
  const leyenda = calcos.cifras
    ? `<span class="pais__letra pais__leyenda" ${conEtiqueta({ tipo: "leyenda", x: 0, y: 1, orden: 20 })}>${t("carta.enPies")}</span>`
    : "";

  // ── Los aeródromos, sus rótulos y la ficha de cada uno ─────────────────
  const tamano = pequenos ? SIMBOLOS.aerodromoPequenos : SIMBOLOS.aerodromo;
  const puntos: string[] = [];
  const rotulos: string[] = [];
  const fichas: string[] = [];
  /*
   * Se rotulan primero los que importan —casa y el destino elegido— para que
   * se queden con su sitio preferido, y después los demás.
   */
  const importa = (e: Scenario): number =>
    e.id === sitio.id ? 0 : e.id === elegido ? 1 : rutas.some((r) => r.destino.id === e.id && r.cabe) ? 2 : rutas.some((r) => r.destino.id === e.id) ? 3 : 4;
  for (const { e, p } of conSitio) {
    const oaci = e.aerodrome?.id ?? "";
    const ruta = rutas.find((r) => r.destino.id === e.id);
    const esSalida = e.id === sitio.id;
    const sinRuta = !esSalida && !ruta;
    const apagado = !esSalida && ruta && !ruta.cabe;
    const clases = [
      "pais__campo",
      esSalida ? "pais__campo--salida" : "",
      esSalida ? "" : ruta ? (ruta.cabe ? "pais__campo--cabe" : "pais__campo--no") : "pais__campo--sin-ruta",
      e.id === elegido ? "pais__campo--elegido" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const torre = tieneTorre(oaci);
    const radio = frecuenciasDeLaCarta(oaci);
    const elevFt = e.aerodrome?.elevationM != null ? Math.round(e.aerodrome.elevationM / PIE) : null;
    const pistaPrincipal = e.aerodrome?.runways[0];
    const nombre = t(e.nameKey as TranslationKey).split(" · ")[0] ?? "";
    // Un campo sin ruta desde aquí se ve que existe, más pequeño.
    const suTamano = sinRuta ? Math.round(tamano * 0.8) : tamano;
    puntos.push(
      `<button class="${clases}" type="button" tabindex="-1" data-ficha="${e.id}"
          style="${enPorcentaje(p)}; --tamano: ${suTamano}px">${simboloDeAerodromo(torre, e.runway.heading)}</button>`,
    );

    /*
     * El rótulo de la carta, por calcos: el indicativo siempre; el nombre
     * desde Tukã; la pista y la elevación desde Taguato; la torre y el ATIS
     * en Taguato Ruvicha, con la cifra como la imprime su AIP. Va fuera del
     * botón, suelto en la carta, para que el colocador lo pueda llevar a
     * cualquier lado de su punto.
     */
    const cifras =
      calcos.cifras && (elevFt !== null || pistaPrincipal)
        ? `<span class="pais__cifras">${elevFt !== null ? ` <i class="pais__elev">${elevFt}</i>` : ""}${
            pistaPrincipal ? ` <i class="pais__rwy">${numerosDe(pistaPrincipal)}</i>` : ""
          }</span>`
        : "";
    const renglones = [
      calcos.nombres ? `<span class="pais__rotulo-nombre">${nombre}</span>` : "",
      `<span class="pais__numeros pais__oaci">${oaci}${cifras}</span>`,
      calcos.radio && radio?.torre
        ? `<span class="pais__numeros pais__radio">${radio.torre.servicio} ${radio.torre.f.cifra}${radio.torre.f.canal833 ? " C" : ""}${
            radio.atis ? ` · ATIS ${radio.atis.cifra}${radio.atis.canal833 ? " C" : ""}` : ""
          }</span>`
        : "",
    ]
      .filter(Boolean)
      .join("");
    const [fx, fy] = enFraccion(p);
    rotulos.push(
      `<span class="pais__letra pais__rotulo pais__rotulo--derecha${apagado ? " pais__rotulo--no" : ""}${sinRuta ? " pais__rotulo--sin-ruta" : ""}" data-de="${e.id}" data-v="0" ${conEtiqueta(
        { tipo: "campo", x: fx, y: fy, r: suTamano / 2, orden: 10 + importa(e) },
      )} style="${enPorcentaje(p)}; --r: ${suTamano / 2}px">${renglones}</span>`,
    );
    fichas.push(fichaDelCampo(e, p, { esSalida, ruta, oaci, nombre, elevFt, calcos, peldano, aqui, decAqui, hoy, avion }));
  }

  const zona = id === "paraguay" ? "paraguay" : id === "canarias" ? "canarias" : null;
  const cotas = calcos.cifras
    ? DESTACADOS.filter((d) => d.zona === zona && d.ele && (d.clase === "montana" || d.clase === "isla"))
        .map((d) => {
          const [lat, lon] = d.puntos[0] as readonly [number, number];
          if (!dentro([lon, lat])) return "";
          const cifra = String(Math.round((d.ele ?? 0) / PIE));
          const [x, y] = enFraccion([lon, lat]);
          // Una cota que no cabe no se escribe: acompaña, no manda.
          return `<span class="pais__letra pais__cota" ${conEtiqueta({ tipo: "cota", x, y, orden: 60 })} style="${enPorcentaje([lon, lat])}">${PUNTO_DE_COTA}<i class="pais__numeros">${cifra}</i></span>`;
        })
        .join("")
    : "";
  const nombres = calcos.nombres
    ? NOMBRES[id]
        .map((n) => {
          const texto = n.texto.startsWith("carta.") ? t(n.texto as TranslationKey) : n.texto;
          const [x, y] = enFraccion([n.lon, n.lat]);
          return `<span class="pais__letra pais__nombre pais__nombre--${n.clase}" ${conEtiqueta({
            tipo: n.clase,
            x,
            y,
            otros: n.otros?.map(enFraccion),
            orden: n.clase === "isla" ? 40 : n.clase === "pais" ? 50 : 51,
          })} style="${enPorcentaje([n.lon, n.lat])}">${texto}</span>`;
        })
        .join("")
    : "";

  const imagen = imagenDe(id, pequenos);
  const grosorRuta = pequenos ? LINEAS.rutaPequenos : LINEAS.ruta;
  return `
    <div class="pais carta-papel${ancho / alto > 1.6 ? " pais--apaisado" : ""}" aria-hidden="true"
         data-region="${id}" data-peldano="${peldano}" data-elegido="${elegido}"
         style="--proporcion: ${r3(ancho / alto)}; ${variablesDeLaCarta()};
                --ruta-grosor: ${grosorRuta}px; --ruta-orla: ${grosorRuta + 2 * LINEAS.rutaOrla}px;
                --costa-grosor: ${LINEAS.costa}px; --rio-grosor: ${LINEAS.rio}px;
                --reticula-grosor: ${LINEAS.reticula}px${PAPEL_URL ? `; --papel-grano: url(${PAPEL_URL})` : ""}">
      <div class="pais__lienzo">
        ${imagen ? `<img class="pais__relieve" src="${imagen}" alt="" decoding="async" draggable="false" />` : ""}
        <svg class="pais__dibujo" viewBox="0 0 ${r3(ancho)} ${r3(alto)}"
             preserveAspectRatio="none" focusable="false">
          <path class="pais__reticula" d="${reticula.join("")}" />
          ${costa}${rios}${rayas}
        </svg>
        ${cifrasDeLaReticula.join("")}${nombres}${cotas}${cifrasDeRuta.join("")}${laRosa}${puntos.join("")}${rotulos.join("")}${leyenda}
      </div>
      ${fichas.join("")}
    </div>`;
}

/** Lo que la ficha de un campo necesita de la carta. */
interface DeLaCarta {
  readonly esSalida: boolean;
  readonly ruta: RutaEnElMapa | undefined;
  readonly oaci: string;
  readonly nombre: string;
  readonly elevFt: number | null;
  readonly calcos: ReturnType<typeof calcosDe>;
  readonly peldano: Peldano;
  readonly aqui: readonly [number, number];
  readonly decAqui: number;
  readonly hoy: number;
  readonly avion: string | null;
}

/**
 * **La ficha de un aeródromo**: adónde se va, dicho para quien no lee.
 *
 * Era una hoja de papel con una pista diminuta, una flecha y el indicativo, y
 * el botón de ir en una esquina. A los cuatro años la ficha es donde se ve
 * **adónde va**, así que la llena lo que se reconoce del sitio:
 *
 * - **su sello**, el del cuaderno —la silueta de su isla o de su país con el
 *   punto donde está, y algo de su paisaje: el Teide, el Roque Nublo, el
 *   puente de Encarnación—. Es el mismo que se gana al aterrizar allí;
 * - **su pista**, con su forma y su rumbo de verdad, el norte arriba;
 * - **el avión que va a ir**: el que se vuela, o el que la propuesta ofrece
 *   si este no llega;
 * - y **el botón de ir**, grande y abajo a la derecha, donde cae el pulgar.
 *
 * En los peldaños de arriba, lo mismo y además sus datos: el nombre desde
 * Tukã; pistas, elevación, rumbo y millas desde Taguato; y en Taguato Ruvicha
 * las frecuencias como las publica su AIP.
 */
function fichaDelCampo(e: Scenario, p: readonly [number, number], d: DeLaCarta): string {
  const { esSalida, ruta, oaci, nombre, elevFt, calcos } = d;
  /*
   * El botón de ir, en la ficha: el de salida es la vuelta al campo; uno con
   * ruta, ese destino; uno al que este avión no llega, la propuesta del que
   * sí; y uno sin ruta desde aquí no lleva botón: se mira, y ya.
   */
  const ir =
    esSalida || ruta?.cabe
      ? `data-destino="${e.id}"`
      : ruta && ruta.con
        ? `data-destino-lejos="${e.id}" data-con="${ruta.con}"`
        : null;
  const boton = ir
    ? `<button class="ficha-carta__ir" type="button" tabindex="-1" ${ir}>
          ${AVION_DE_IR}
          ${calcos.nombres ? `<span>${t("carta.ir")}</span>` : ""}
        </button>`
    : "";
  const quienVa = !ir ? null : esSalida || ruta?.cabe ? d.avion : (ruta?.con ?? null);
  const retrato = quienVa
    ? `<span class="ficha-carta__avion"><img src="${retratoDe(quienVa)}" alt="" width="${TAMANO_DE_RETRATO.ancho}" height="${TAMANO_DE_RETRATO.alto}" decoding="async" draggable="false" /></span>`
    : "";
  const sello = selloDe(e, nombre);
  const pistas = (e.aerodrome?.runways ?? [])
    .filter((pista) => Object.keys(pista.thresholds).length >= 2)
    .map((pista) => `<li>RWY ${numerosDe(pista)} · ${Math.round(largoDe(pista)).toLocaleString("en-US").replace(/,/g, " ")} m</li>`)
    .join("");
  const rumbo = esSalida ? "" : (() => {
    const { rumbo: r, millas } = rumboYMillas(d.aqui, p, d.decAqui);
    return `<li>CRS ${r}</li><li>DIST ${millas} NM</li>`;
  })();
  const publicada = RADIO[oaci];
  const laRadio = !calcos.radio
    ? ""
    : publicada && publicada.servicios.length
      ? `<ul class="ficha-carta__lista ficha-carta__radio">${publicada.servicios
          .map(
            (s) =>
              `<li><b>${s.servicio}</b>${s.indicativo ? ` <span>${s.indicativo}</span>` : ""} ${s.frecuencias
                .map((f) => `<i>${f.tal}${f.nota && /EMERG|GMC|CLR|BACK/i.test(f.nota) ? ` ${f.nota}` : ""}</i>`)
                .join(" ")}</li>`,
          )
          .join("")}</ul><small class="ficha-carta__pie ficha-carta__fuente">${publicada.fuente}</small>`
      : `<p class="ficha-carta__pie ficha-carta__sin-radio">${t(publicada ? "carta.sinFrecuencia" : "carta.sinAip")}</p>`;
  /*
   * Los datos, solo para quien lee: en Guyrami no hay ni una letra que haga
   * falta leer. El indicativo va estampado en el sello, como tinta.
   */
  const datos = calcos.nombres
    ? `<div class="ficha-carta__datos">
          <b class="ficha-carta__oaci">${oaci}</b>
          <span class="ficha-carta__nombre">${nombre}</span>
          ${
            calcos.cifras
              ? `<ul class="ficha-carta__lista ficha-carta__cifras">${pistas}${elevFt !== null ? `<li>ELEV ${elevFt} ft</li>` : ""}${rumbo}</ul>`
              : ""
          }
          ${laRadio}
          ${calcos.radio ? `<small class="ficha-carta__pie ficha-carta__var">${varEscrita(declinacion(p[1], p[0], d.hoy))}</small>` : ""}
        </div>`
    : "";
  return `
      <div class="ficha-carta ficha-carta--${d.peldano}${quienVa ? "" : " ficha-carta--sin-avion"}" data-ficha-de="${e.id}" hidden>
        <button class="ficha-carta__cerrar" type="button" tabindex="-1" data-ficha="">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6 L18 18 M18 6 L6 18" /></svg>
        </button>
        <div class="ficha-carta__hoja">
          ${sello ? `<span class="ficha-carta__sello">${sello}</span>` : ""}
          <div class="ficha-carta__dibujo">${dibujoDePistas(e, calcos.cifras)}</div>
          ${datos}
          ${retrato}
          ${boton}
        </div>
      </div>`;
}

// ── La colocación, ya en la página ──────────────────────────────────────

/**
 * El papel que tiene que sobrar a un lado de la región para que la ficha vaya
 * ahí, en píxeles: menos y no caben su sello, su pista y su avión.
 */
const MARGEN_PARA_LA_FICHA = 300;

/** La caja de un elemento, en los píxeles del lienzo. */
function cajaEn(el: Element, origen: DOMRect, agranda = 0): Caja {
  const r = el.getBoundingClientRect();
  return {
    cx: r.left + r.width / 2 - origen.left,
    cy: r.top + r.height / 2 - origen.top,
    w: r.width + agranda * 2,
    h: r.height + agranda * 2,
  };
}

/**
 * **Los sitios donde puede ir cada rótulo**, con sus medidas en cada forma.
 * Es lo que se le pasa a `colocar`; sale de aquí para que la prueba lo use
 * igual que la página. `ancho` y `alto`, los del lienzo.
 */
export function sitiosDe(
  e: Etiqueta,
  medidas: readonly (readonly [number, number])[],
  ancho: number,
  alto: number,
  fija?: Caja,
): PorColocar {
  const x = e.x * ancho;
  const y = e.y * alto;
  const m = medidas[0] ?? [0, 0];
  switch (e.tipo) {
    case "campo":
      return { formas: medidas.map((mm) => sitiosAlrededor(x, y, e.r ?? 9, mm)) };
    case "ruta":
      return {
        formas: [sitiosEnLaRaya([x, y], [(e.x2 ?? e.x) * ancho, (e.y2 ?? e.y) * alto], m, LINEAS.rutaOrla + LINEAS.ruta / 2 + 2)],
        propia: e.raya,
      };
    case "isla":
      return {
        formas: [
          sitiosEntre(
            [
              [x, y],
              [x, y - m[1] * 0.9],
              [x, y + m[1] * 0.9],
              [x - m[0] * 0.35, y - m[1] * 0.6],
              [x + m[0] * 0.35, y + m[1] * 0.6],
            ],
            m,
          ),
        ],
      };
    case "agua":
    case "pais":
      return { formas: [sitiosEntre([[x, y], ...(e.otros ?? []).map(([a, b]) => [a * ancho, b * alto] as const)], m)] };
    case "leyenda":
      return {
        formas: [
          sitiosEntre(
            [
              [6 + m[0] / 2, alto - 6 - m[1] / 2],
              [ancho - 6 - m[0] / 2, alto - 6 - m[1] / 2],
              [ancho - 6 - m[0] / 2, 6 + m[1] / 2],
              [6 + m[0] / 2, 6 + m[1] / 2],
            ],
            m,
          ),
        ],
      };
    // Las cotas y las cifras de la retícula van donde van, o no van.
    case "cota":
    case "grado":
      return { formas: [fija ? [{ caja: fija, coste: 0 }] : []] };
  }
}

/** Las cartas que se están mirando, para recolocarlas cuando cambian de tamaño. */
let observador: ResizeObserver | null = null;

/**
 * **Coloca los rótulos de la carta con sus medidas de verdad**, y pone la
 * ficha al lado si sobra papel. La llama el hangar cada vez que pinta, y se
 * vuelve a llamar sola cuando la carta cambia de tamaño —girar la tablet— o
 * cuando llegan las letras. Ver `carta/rotulos.ts`.
 */
export function colocarLaCarta(raiz: ParentNode): void {
  const cartas = [...raiz.querySelectorAll<HTMLElement>(".pais")];
  for (const pais of cartas) colocarUna(pais);
  if (typeof ResizeObserver !== "undefined") {
    observador ??= new ResizeObserver((vistas) => {
      for (const v of vistas) {
        const pais = v.target as HTMLElement;
        if (pais.isConnected) colocarUna(pais);
        else observador?.unobserve(pais);
      }
    });
    for (const pais of cartas) observador.observe(pais);
  }
  // Con Barlow ya cargada los rótulos miden otra cosa.
  void document.fonts?.ready.then(() => {
    for (const pais of cartas) if (pais.isConnected) colocarUna(pais);
  });
}

/**
 * **El sitio de la ficha.** Si a un lado de la región sobra papel —el
 * Paraguay en una tablet tumbada deja dos tercios vacíos—, la región se
 * arrima y la ficha va a su lado, sin tapar la carta; y entonces se abre sola
 * la del destino elegido, que es lo que se va a volar. Si no sobra, la ficha
 * se abre encima, al tocar un campo, como siempre.
 */
function ponerElMargen(pais: HTMLElement): void {
  const proporcion = parseFloat(pais.style.getPropertyValue("--proporcion")) || 1;
  const sobra = pais.clientWidth - 24 - (pais.clientHeight - 16) * proporcion;
  const con = sobra >= MARGEN_PARA_LA_FICHA;
  const tenia = pais.classList.contains("pais--margen");
  if (con === tenia) return;
  pais.classList.toggle("pais--margen", con);
  const abierta = pais.querySelector<HTMLElement>(".ficha-carta:not([hidden])");
  if (con && !abierta) {
    const elegido = pais.dataset.elegido ?? "";
    const ficha = pais.querySelector<HTMLElement>(`.ficha-carta[data-ficha-de="${elegido}"]`);
    if (ficha) {
      abrirFichaDeLaCarta(pais, elegido);
      // Abierta sola: si la carta vuelve a estrecharse, se cierra sola.
      ficha.dataset.sola = "1";
    }
  } else if (!con && abierta?.dataset.sola) abrirFichaDeLaCarta(pais, "");
}

function colocarUna(pais: HTMLElement): void {
  const lienzo = pais.querySelector<HTMLElement>(".pais__lienzo");
  if (!lienzo || !pais.isConnected) return;
  ponerElMargen(pais);
  const ancho = lienzo.clientWidth;
  const alto = lienzo.clientHeight;
  if (ancho < 40 || alto < 40) return;
  const origen = lienzo.getBoundingClientRect();
  const letras = [...lienzo.querySelectorAll<HTMLElement>("[data-e]")];
  const etiquetas = letras.map((el) => JSON.parse(el.dataset.e ?? "{}") as Etiqueta);

  /*
   * Las medidas de cada rótulo, de una vez: las de un aeródromo en cada una
   * de sus formas, poniéndoselas todas a la vez. Son cuatro lecturas de la
   * página y no una por rótulo.
   */
  const medidas: [number, number][][] = letras.map(() => []);
  const deCampo = letras.flatMap((_, i) => (etiquetas[i]?.tipo === "campo" ? [i] : []));
  for (let v = 0; v < FORMAS_DE_ROTULO; v++) {
    for (const i of deCampo) letras[i]!.dataset.v = String(v);
    for (const i of deCampo) medidas[i]!.push([letras[i]!.offsetWidth, letras[i]!.offsetHeight]);
  }
  letras.forEach((el, i) => {
    if (etiquetas[i]?.tipo !== "campo") medidas[i]!.push([el.offsetWidth, el.offsetHeight]);
  });
  // Las formas que miden lo mismo que la anterior no son otra forma.
  const formas = medidas.map((m) =>
    m.flatMap((mm, v) => (v > 0 && mm[0] === m[v - 1]![0] && mm[1] === m[v - 1]![1] ? [] : [{ v, mm }])),
  );

  // Lo que no se mueve: los símbolos —con el aro de casa y del elegido— y la rosa.
  const fijos: Caja[] = [];
  for (const b of lienzo.querySelectorAll(".pais__campo"))
    fijos.push(cajaEn(b, origen, b.matches(".pais__campo--salida, .pais__campo--elegido") ? 6 : 2));
  for (const r of lienzo.querySelectorAll(".pais__rosa svg, .pais__rosa i")) fijos.push(cajaEn(r, origen, 2));
  const dibujo = lienzo.querySelector<SVGSVGElement>(".pais__dibujo");
  const vb = dibujo?.viewBox.baseVal;
  const rayas: Raya[] = vb
    ? [...lienzo.querySelectorAll<SVGLineElement>("line.pais__ruta")].map((l) => ({
        a: [(l.x1.baseVal.value / vb.width) * ancho, (l.y1.baseVal.value / vb.height) * alto],
        b: [(l.x2.baseVal.value / vb.width) * ancho, (l.y2.baseVal.value / vb.height) * alto],
      }))
    : [];

  const orden = letras.map((_, i) => i).sort((a, b) => etiquetas[a]!.orden - etiquetas[b]!.orden);
  const porColocar = orden.map((i) => {
    const e = etiquetas[i]!;
    const fija = e.tipo === "cota" || e.tipo === "grado" ? cajaEn(letras[i]!, origen) : undefined;
    return sitiosDe(e, formas[i]!.map((f) => f.mm), ancho, alto, fija);
  });
  const puestos = colocar(ancho, alto, fijos, rayas, porColocar);

  orden.forEach((i, k) => {
    const el = letras[i]!;
    const e = etiquetas[i]!;
    const puesto = puestos[k];
    if (e.tipo === "campo") el.dataset.v = String(formas[i]![puesto?.forma ?? 0]?.v ?? 0);
    el.classList.toggle("pais__letra--fuera", !puesto);
    if (!puesto || e.tipo === "cota" || e.tipo === "grado") return;
    const c = puesto.caja;
    el.style.left = `${((c.cx / ancho) * 100).toFixed(3)}%`;
    el.style.top = `${((c.cy / alto) * 100).toFixed(3)}%`;
    el.style.bottom = "auto";
    el.style.transform = `translate(-50%, -50%)${c.giro ? ` rotate(${c.giro.toFixed(4)}rad)` : ""}`;
    if (e.tipo === "campo") {
      const lado = porColocar[k]!.formas[puesto.forma]![puesto.sitio]!.lado ?? "derecha";
      for (const l of ["derecha", "izquierda", "centro"]) el.classList.toggle(`pais__rotulo--${l}`, l === lado);
    }
  });
}

/**
 * **El aeródromo que se quiso tocar**: el más cercano al dedo.
 *
 * Cada punto se toca en un círculo de 44 px aunque se dibuje de 18, y en una
 * carta pequeña los de Encarnación y Ayolas están a veinte píxeles: el círculo
 * del que va después en la página tapaba el centro del otro, y tocar
 * Encarnación abría Ayolas. Así que no manda el círculo que recibe el toque,
 * sino el punto más cercano a donde cayó el dedo. Sin dedo —un clic sin
 * coordenadas— manda el propio botón.
 */
export function campoTocado(boton: HTMLElement, evento: MouseEvent): string {
  const propio = boton.getAttribute("data-ficha") ?? "";
  const pais = boton.closest(".pais");
  if (!pais || !boton.matches(".pais__campo") || evento.detail === 0) return propio;
  let mejor = propio;
  let cerca = Infinity;
  for (const c of pais.querySelectorAll<HTMLElement>(".pais__campo")) {
    const r = c.getBoundingClientRect();
    const d = Math.hypot(r.left + r.width / 2 - evento.clientX, r.top + r.height / 2 - evento.clientY);
    if (d < cerca) {
      cerca = d;
      mejor = c.getAttribute("data-ficha") ?? mejor;
    }
  }
  return mejor;
}

/**
 * **Abre la ficha de un aeródromo de la carta**, o la cierra con `""`.
 *
 * No repinta el hangar: la ficha ya está en la página, escondida, y solo se
 * enseña. Así abrir y cerrar no cuesta nada y lo de alrededor no se mueve.
 * Lo llama el hangar desde su manejador de toques, al ver un `data-ficha`.
 */
export function abrirFichaDeLaCarta(raiz: ParentNode, id: string): void {
  /*
   * Encima de la carta, la ficha se abre del lado contrario a su campo: un
   * campo de la mitad derecha, a la izquierda. Sale del sitio del punto, que
   * va en porcentaje en su estilo.
   */
  const campo = id ? raiz.querySelector<HTMLElement>(`.pais__campo[data-ficha="${id}"]`) : null;
  const derecha = campo ? parseFloat(campo.style.left) > 50 : false;
  for (const f of raiz.querySelectorAll<HTMLElement>(".ficha-carta")) {
    f.hidden = f.getAttribute("data-ficha-de") !== id || id === "";
    if (!f.hidden) f.dataset.lado = derecha ? "izquierda" : "derecha";
    // Abierta o cerrada a propósito: ya no es la que se abrió sola.
    delete f.dataset.sola;
  }
  for (const c of raiz.querySelectorAll<HTMLElement>(".pais__campo"))
    c.classList.toggle("pais__campo--abierto", id !== "" && c.getAttribute("data-ficha") === id);
}

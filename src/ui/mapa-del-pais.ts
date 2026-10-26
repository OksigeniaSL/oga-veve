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
 * ## Tocar un aeródromo abre su ficha
 *
 * Sus pistas con sus números y su rumbo, su elevación y, en el calco de la
 * radio, sus frecuencias como las publica su AIP. Y en la ficha, el botón de
 * ir: el mismo `data-destino` —o `data-destino-lejos` con su `data-con`— que
 * llevaban los puntos, así que quien elige destino lo sigue eligiendo igual.
 * El punto en sí lleva `data-ficha`, que solo abre y cierra: ver
 * `abrirFichaDeLaCarta`.
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
 */
const NOMBRES: Readonly<
  Record<
    IdRegion,
    readonly { readonly texto: string | TranslationKey; readonly lon: number; readonly lat: number; readonly clase: "isla" | "agua" | "pais" }[]
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
    { texto: "carta.atlantico", lon: -15.7, lat: 29.25, clase: "agua" },
  ],
  paraguay: [
    { texto: "carta.rioParaguay", lon: -57.75, lat: -23.2, clase: "agua" },
    { texto: "carta.rioParana", lon: -56.6, lat: -27.62, clase: "agua" },
    { texto: "carta.rioPilcomayo", lon: -59.6, lat: -24.45, clase: "agua" },
    { texto: "carta.bolivia", lon: -61.9, lat: -19.5, clase: "pais" },
    { texto: "carta.brasil", lon: -54.6, lat: -21.3, clase: "pais" },
    { texto: "carta.argentina", lon: -60.6, lat: -26.6, clase: "pais" },
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

/**
 * Las pistas de un aeródromo dibujadas para su ficha, con el norte arriba y
 * su rumbo de verdad; y sus números en las cabeceras desde el calco de las
 * cifras.
 */
function dibujoDePistas(e: Scenario, conNumeros: boolean): string {
  const pistas = e.aerodrome?.runways ?? [];
  const puntos = pistas.flatMap((p) => p.centerline);
  if (puntos.length < 2) return "";
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
  const lado = Math.max(x1 - x0, y1 - y0) * 1.5 || 1;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  // Del fichero —la Y al norte— al dibujo —la Y abajo—, en cien de lado.
  const en = ([x, y]: readonly [number, number]): [number, number] => [
    50 + ((x - cx) / lado) * 100,
    50 - ((y - cy) / lado) * 100,
  ];
  const barras = pistas
    .map((p) => {
      const a = p.centerline[0];
      const b = p.centerline[p.centerline.length - 1];
      if (!a || !b) return "";
      const [ax, ay] = en(a);
      const [bx, by] = en(b);
      // A su anchura, y como poco tres: dos paralelas a doscientos metros se
      // tienen que ver dos.
      const grueso = Math.max(5, ((p.widthM ?? 45) / lado) * 100);
      return `<line x1="${r3(ax)}" y1="${r3(ay)}" x2="${r3(bx)}" y2="${r3(by)}" class="pistas__barra" stroke-width="${r3(grueso)}" />
        <line x1="${r3(ax)}" y1="${r3(ay)}" x2="${r3(bx)}" y2="${r3(by)}" class="pistas__eje" />`;
    })
    .join("");
  const numeros = conNumeros
    ? pistas
        .flatMap((p) =>
          Object.entries(p.thresholds).map(([nombre, u]) => {
            if (!u?.xy) return "";
            const [x, y] = en(u.xy);
            /*
             * Un poco hacia fuera del umbral, por el lado de su cabecera; y la
             * de la izquierda, a su izquierda, que con dos paralelas los
             * números de las dos caían uno encima del otro.
             */
            const c = p.centerline;
            const otra = c[0] && Math.hypot(c[0][0] - u.xy[0], c[0][1] - u.xy[1]) < 1 ? c[c.length - 1] : c[0];
            const [ox, oy] = otra ? en(otra) : [50, 50];
            const dx = x - ox;
            const dy = y - oy;
            const d = Math.hypot(dx, dy) || 1;
            const lado = /L$/.test(nombre) ? -1 : /R$/.test(nombre) ? 1 : 0;
            // Mirando por la pista hacia fuera, la izquierda es (dy, −dx).
            const lx = (dy / d) * 7 * lado;
            const ly = (-dx / d) * 7 * lado;
            return `<text x="${r3(x + (dx / d) * 9 - lx)}" y="${r3(y + (dy / d) * 9 - ly)}" class="pistas__numero">${nombre}</text>`;
          }),
        )
        .join("")
    : "";
  return `<svg class="pistas" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="M50 4 L54 13 L50 11 L46 13 Z" class="pistas__norte" />
      ${barras}${numeros}
    </svg>`;
}

/** Una caja en píxeles de la carta: x e y de la esquina, ancho y alto. */
type Caja = readonly [number, number, number, number];

const pisa = (a: Caja, b: Caja): number => {
  const w = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
  const h = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
  return w > 0 && h > 0 ? w * h : 0;
};

/**
 * **Dónde va cada rótulo para no pisar a otro.** Con todo escrito al lado
 * derecho de su punto, en el calco de la radio los de Asunción y sus vecinos
 * se escribían unos encima de otros. Aquí cada rótulo prueba sus sitios —a la
 * derecha, a la izquierda, debajo, encima— y se queda con el primero libre; y
 * los que solo acompañan, como una cota, si no caben no se escriben: es lo
 * que hace una carta de verdad.
 *
 * Mide en los píxeles de una carta de tamaño normal, porque el tamaño de
 * verdad lo decide el CSS después. Es una cuenta aproximada, y basta: lo que
 * evita es el montón, no el último píxel.
 */
class Colocador {
  private readonly cajas: Caja[] = [];
  constructor(readonly ancho: number, readonly alto: number) {}
  ocupar(c: Caja): void {
    this.cajas.push(c);
  }
  /**
   * El primer candidato que no pisa nada, o el que menos si `siempre`; `null`
   * si ninguno cabe y no es obligatorio. Se queda ocupado.
   */
  elegir(candidatos: readonly Caja[], siempre: boolean): number | null {
    let mejor = -1;
    let menos = Infinity;
    candidatos.forEach((c, i) => {
      const fuera =
        Math.max(0, -c[0]) + Math.max(0, c[0] + c[2] - this.ancho) + Math.max(0, -c[1]) + Math.max(0, c[1] + c[3] - this.alto);
      const total = this.cajas.reduce((n, o) => n + pisa(c, o), 0) + fuera * 40;
      if (total < menos) {
        menos = total;
        mejor = i;
      }
    });
    if (mejor < 0 || (menos > 0 && !siempre)) return null;
    this.cajas.push(candidatos[mejor]!);
    return mejor;
  }
}

/** Lo que mide un texto, a ojo: Barlow estrecha anda por el 0,47 del cuerpo. */
const anchoDe = (texto: string, cuerpo: number): number => texto.length * cuerpo * 0.5 + 4;

/** Las cifras de una latitud o longitud de la retícula: «28°30′N». */
function grados(v: number, positivo: string, negativo: string): string {
  const a = Math.abs(v);
  const g = Math.floor(a + 1e-9);
  const m = Math.round((a - g) * 60);
  return `${g}°${m ? `${String(m).padStart(2, "0")}′` : ""}${v >= 0 ? positivo : negativo}`;
}

/**
 * **La carta del país del sitio de salida**, en HTML: el fondo horneado, la
 * costa, la retícula y las rutas en SVG, y encima lo que se toca y lo que se
 * lee, puesto en porcentaje.
 *
 * `campos` son todos los aeródromos de verdad del país —con ruta o sin ella—,
 * porque también enseña algo ver que un campo existe y todavía no se puede ir
 * a él desde aquí. `elegido` es el destino de ahora; el propio sitio es la
 * vuelta al campo. `peldano` decide los calcos; sin él, el del dibujo, que es
 * lo que enseñaba el mapa antes de ser carta.
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
  const enPorcentaje = (p: readonly [number, number]): string => {
    const [x, y] = xy(p);
    return `left: ${((x / ancho) * 100).toFixed(2)}%; top: ${((y / alto) * 100).toFixed(2)}%`;
  };
  const dentro = ([lon, lat]: readonly [number, number]): boolean =>
    lon > region.oeste && lon < region.este && lat > region.sur && lat < region.norte;
  // Una carta de tamaño normal: 450 px de alto, sin pasar de 1.000 de ancho.
  const W = Math.min(1000, (450 * ancho) / alto);
  const H = (W * alto) / ancho;
  const enPx = (p: readonly [number, number]): [number, number] => {
    const [x, y] = xy(p);
    return [(x / ancho) * W, (y / alto) * H];
  };
  const enPorcentajeDePx = (x: number, y: number): string =>
    `left: ${((x / W) * 100).toFixed(2)}%; top: ${((y / H) * 100).toFixed(2)}%`;
  const colocador = new Colocador(W, H);
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
    if (calcos.cifras && Number.isInteger(lon))
      cifrasDeLaReticula.push(
        `<span class="pais__letra pais__numeros pais__grado pais__grado--lon" style="${enPorcentaje([lon, region.norte])}">${grados(lon, "E", "W")}</span>`,
      );
  }
  for (let lat = Math.ceil(region.sur * 2) / 2; lat < region.norte; lat += 0.5) {
    reticula.push(camino([[region.oeste, lat], [region.este, lat]], false));
    if (calcos.cifras && Number.isInteger(lat))
      cifrasDeLaReticula.push(
        `<span class="pais__letra pais__numeros pais__grado pais__grado--lat" style="${enPorcentaje([region.oeste, lat])}">${grados(lat, "N", "S")}</span>`,
      );
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
  const rotulosDeRuta: { texto: string; a: [number, number]; b: [number, number]; cabe: boolean }[] = [];
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
        const k = Math.cos((((aqui[1] + p[1]) / 2) * Math.PI) / 180);
        const este = (p[0] - aqui[0]) * k;
        const norte = p[1] - aqui[1];
        const nm = (Math.hypot(este, norte) * Math.PI * R) / 180 / MILLA;
        const verdadero = (Math.atan2(este, norte) * 180) / Math.PI;
        const magnetico = Math.round((((verdadero - decAqui) % 360) + 360) % 360) || 360;
        rotulosDeRuta.push({
          texto: `${String(magnetico).padStart(3, "0")}° · ${Math.round(nm)} NM`,
          a: enPx(aqui),
          b: enPx(p),
          cabe,
        });
      }
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
  const leyenda = calcos.cifras ? `<span class="pais__letra pais__leyenda">${t("carta.enPies")}</span>` : "";

  // ── Los aeródromos, y la ficha de cada uno ─────────────────────────────
  const tamano = pequenos ? SIMBOLOS.aerodromoPequenos : SIMBOLOS.aerodromo;
  const puntos: string[] = [];
  const fichas: string[] = [];
  for (const { p } of conSitio) {
    const [x, y] = enPx(p);
    colocador.ocupar([x - tamano / 2, y - tamano / 2, tamano, tamano]);
  }
  {
    const [x, y] = enPx([rlon, rlat]);
    colocador.ocupar([x - 40, y - 40, 80, 96]);
  }
  // Y los nombres de las islas y del agua, que tienen su sitio fijo.
  if (calcos.nombres)
    for (const n of NOMBRES[id]) {
      const texto = n.texto.startsWith("carta.") ? t(n.texto as TranslationKey) : n.texto;
      const [x, y] = enPx([n.lon, n.lat]);
      const w = anchoDe(texto, n.clase === "isla" ? 17 : 14) * (n.clase === "agua" ? 1 : 1.25);
      colocador.ocupar([x - w / 2, y - 9, w, 18]);
    }
  /*
   * Se rotulan primero los que importan —casa y el destino elegido— para que
   * se queden con su sitio preferido, y después los demás.
   */
  const importa = (e: Scenario): number =>
    e.id === sitio.id ? 0 : e.id === elegido ? 1 : rutas.some((r) => r.destino.id === e.id && r.cabe) ? 2 : 3;
  const ordenados = [...conSitio].sort((a, b) => importa(a.e) - importa(b.e));
  for (const { e, p } of ordenados) {
    const oaci = e.aerodrome?.id ?? "";
    const ruta = rutas.find((r) => r.destino.id === e.id);
    const esSalida = e.id === sitio.id;
    const clases = [
      "pais__campo",
      esSalida ? "pais__campo--salida" : "",
      esSalida
        ? ""
        : ruta
          ? ruta.cabe
            ? "pais__campo--cabe"
            : "pais__campo--no"
          : "pais__campo--sin-ruta",
      e.id === elegido ? "pais__campo--elegido" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const torre = tieneTorre(oaci);
    const radio = frecuenciasDeLaCarta(oaci);
    const elevFt = e.aerodrome?.elevationM != null ? Math.round(e.aerodrome.elevationM / PIE) : null;
    const pistaPrincipal = e.aerodrome?.runways[0];
    const nombre = t(e.nameKey as TranslationKey).split(" · ")[0] ?? "";
    /*
     * El rótulo de la carta, por calcos: el indicativo siempre; el nombre
     * desde Tukã; la pista y la elevación desde Taguato; la torre y el ATIS
     * en Taguato Ruvicha, con la cifra como la imprime su AIP.
     */
    const renglones = [
      calcos.nombres ? `<span class="pais__rotulo-nombre">${nombre}</span>` : "",
      `<span class="pais__numeros pais__oaci">${oaci}${
        calcos.cifras && elevFt !== null ? ` <i class="pais__elev">${elevFt}</i>` : ""
      }${calcos.cifras && pistaPrincipal ? ` <i class="pais__rwy">${numerosDe(pistaPrincipal)}</i>` : ""}</span>`,
      calcos.radio && radio?.torre
        ? `<span class="pais__numeros pais__radio">${radio.torre.servicio} ${radio.torre.f.cifra}${radio.torre.f.canal833 ? " C" : ""}${
            radio.atis ? ` · ATIS ${radio.atis.cifra}${radio.atis.canal833 ? " C" : ""}` : ""
          }</span>`
        : "",
    ]
      .filter(Boolean)
      .join("");
    const textos = [
      calcos.nombres ? anchoDe(nombre, 14) : 0,
      anchoDe(`${oaci} ${calcos.cifras ? `${elevFt ?? ""} ${pistaPrincipal ? numerosDe(pistaPrincipal) : ""}` : ""}`, 12),
      calcos.radio && radio?.torre ? anchoDe(`${radio.torre.servicio} ${radio.torre.f.cifra} · ATIS ${radio.atis?.cifra ?? ""}`, 12) : 0,
    ];
    const w = Math.max(...textos);
    const h = textos.filter((n) => n > 0).length * 14;
    const [px, py] = enPx(p);
    const m = tamano / 2 + 5;
    const lados = ["derecha", "izquierda", "abajo", "arriba"] as const;
    const lado =
      lados[
        colocador.elegir(
          [
            [px + m, py - h / 2, w, h],
            [px - m - w, py - h / 2, w, h],
            [px - w / 2, py + m, w, h],
            [px - w / 2, py - m - h, w, h],
          ],
          true,
        ) ?? 0
      ];
    puntos.push(
      `<button class="${clases}" type="button" tabindex="-1" data-ficha="${e.id}"
          style="${enPorcentaje(p)}; --tamano: ${tamano}px">${simboloDeAerodromo(torre, e.runway.heading)}<span class="pais__letra pais__rotulo pais__rotulo--${lado}">${renglones}</span></button>`,
    );

    /*
     * El botón de ir, en la ficha: el de salida es la vuelta al campo; uno
     * con ruta, ese destino; uno al que este avión no llega, la propuesta del
     * que sí; y uno sin ruta desde aquí no lleva botón: se mira, y ya.
     */
    const ir =
      esSalida || ruta?.cabe
        ? `data-destino="${e.id}"`
        : ruta && ruta.con
          ? `data-destino-lejos="${e.id}" data-con="${ruta.con}"`
          : null;
    const boton = ir
      ? `<button class="ficha-carta__ir" type="button" tabindex="-1" ${ir}>
          <svg viewBox="-17 -16 34 30" aria-hidden="true" focusable="false"><path d="M0 -13C1.6 -13 2.1 -11 2.1 -8.5V-3.2H13.4C14.4 -3.2 14.8 -2.6 14.8 -1.8V0.2H2.1V6.6L6.4 8.6V11H-6.4V8.6L-2.1 6.6V0.2H-14.8V-1.8C-14.8 -2.6 -14.4 -3.2 -13.4 -3.2H-2.1V-8.5C-2.1 -11 -1.6 -13 0 -13Z" /></svg>
          ${calcos.nombres ? `<span>${t("carta.ir")}</span>` : ""}
        </button>`
      : "";
    const pistas = (e.aerodrome?.runways ?? [])
      .map((pista) => `<li>RWY ${numerosDe(pista)} · ${Math.round(largoDe(pista)).toLocaleString("en-US").replace(/,/g, " ")} m</li>`)
      .join("");
    const distancia = esSalida
      ? ""
      : (() => {
          const k = Math.cos((((aqui[1] + p[1]) / 2) * Math.PI) / 180);
          const nm = (Math.hypot((p[0] - aqui[0]) * k, p[1] - aqui[1]) * Math.PI * R) / 180 / MILLA;
          return `<li>DIST ${Math.round(nm)} NM</li>`;
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
    fichas.push(`
      <div class="ficha-carta" data-ficha-de="${e.id}" hidden>
        <button class="ficha-carta__cerrar" type="button" tabindex="-1" data-ficha="">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6 L18 18 M18 6 L6 18" /></svg>
        </button>
        <div class="ficha-carta__dibujo">${dibujoDePistas(e, calcos.cifras)}</div>
        <div class="ficha-carta__datos">
          <b class="ficha-carta__oaci">${oaci}</b>
          ${calcos.nombres ? `<span class="ficha-carta__nombre">${nombre}</span>` : ""}
          ${
            calcos.cifras
              ? `<ul class="ficha-carta__lista ficha-carta__cifras">${pistas}${elevFt !== null ? `<li>ELEV ${elevFt} ft</li>` : ""}${distancia}</ul>`
              : ""
          }
          ${laRadio}
          ${calcos.radio ? `<small class="ficha-carta__pie ficha-carta__var">${varEscrita(declinacion(p[1], p[0], hoy))}</small>` : ""}
        </div>
        ${boton}
      </div>`);
  }

  /*
   * Las cifras de cada ruta, a lo largo de su raya: mejor pasada la mitad, que
   * de Asunción salen siete rutas en abanico y en la mitad se juntaban.
   */
  for (const r of rotulosDeRuta) {
    const w = anchoDe(r.texto, 13);
    const en = (f: number): Caja => {
      const x = r.a[0] + (r.b[0] - r.a[0]) * f;
      const y = r.a[1] + (r.b[1] - r.a[1]) * f;
      return [x - w / 2, y - 8, w, 16];
    };
    const sitios = [0.6, 0.45, 0.72, 0.35, 0.82].map(en);
    const i = colocador.elegir(sitios, true) ?? 0;
    const c = sitios[i]!;
    cifrasDeRuta.push(
      `<span class="pais__letra pais__numeros pais__cifra-ruta${r.cabe ? "" : " pais__cifra-ruta--no"}" style="${enPorcentajeDePx(
        c[0] + w / 2,
        c[1] + 8,
      )}">${r.texto}</span>`,
    );
  }
  const zona = id === "paraguay" ? "paraguay" : id === "canarias" ? "canarias" : null;
  const cotas = calcos.cifras
    ? DESTACADOS.filter((d) => d.zona === zona && d.ele && (d.clase === "montana" || d.clase === "isla"))
        .map((d) => {
          const [lat, lon] = d.puntos[0] as readonly [number, number];
          const cifra = String(Math.round((d.ele ?? 0) / PIE));
          const [x, y] = enPx([lon, lat]);
          // Una cota que no cabe no se escribe: acompaña, no manda.
          if (colocador.elegir([[x - 4, y - 8, anchoDe(cifra, 12) + 8, 16]], false) === null) return "";
          return `<span class="pais__letra pais__cota" style="${enPorcentaje([lon, lat])}">${PUNTO_DE_COTA}<i class="pais__numeros">${cifra}</i></span>`;
        })
        .join("")
    : "";
  // Los nombres del agua y de las islas, los últimos: van donde van.
  const nombres = calcos.nombres
    ? NOMBRES[id]
        .map((n) => {
          const texto = n.texto.startsWith("carta.") ? t(n.texto as TranslationKey) : n.texto;
          const [x, y] = enPx([n.lon, n.lat]);
          const w = anchoDe(texto, n.clase === "isla" ? 17 : 14) * (n.clase === "agua" ? 1 : 1.25);
          colocador.ocupar([x - w / 2, y - 9, w, 18]);
          return `<span class="pais__letra pais__nombre pais__nombre--${n.clase}" style="${enPorcentaje([n.lon, n.lat])}">${texto}</span>`;
        })
        .join("")
    : "";

  const imagen = imagenDe(id, pequenos);
  const grosorRuta = pequenos ? LINEAS.rutaPequenos : LINEAS.ruta;
  return `
    <div class="pais carta-papel${ancho / alto > 1.6 ? " pais--apaisado" : ""}" aria-hidden="true"
         data-region="${id}" data-peldano="${peldano}"
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
        ${cifrasDeLaReticula.join("")}${nombres}${cotas}${cifrasDeRuta.join("")}${laRosa}${puntos.join("")}
      </div>
      ${leyenda}
      ${fichas.join("")}
    </div>`;
}

/**
 * **Abre la ficha de un aeródromo de la carta**, o la cierra con `""`.
 *
 * No repinta el hangar: la ficha ya está en la página, escondida, y solo se
 * enseña. Así abrir y cerrar no cuesta nada y lo de alrededor no se mueve.
 * Lo llama el hangar desde su manejador de toques, al ver un `data-ficha`.
 */
export function abrirFichaDeLaCarta(raiz: ParentNode, id: string): void {
  for (const f of raiz.querySelectorAll<HTMLElement>(".ficha-carta"))
    f.hidden = f.getAttribute("data-ficha-de") !== id || id === "";
  for (const c of raiz.querySelectorAll<HTMLElement>(".pais__campo"))
    c.classList.toggle("pais__campo--abierto", id !== "" && c.getAttribute("data-ficha") === id);
}

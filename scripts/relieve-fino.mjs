/**
 * **El relieve fino donde el horizonte lo alisa**, y el contorno de los lagos.
 *
 * El mundo de un vuelo son dos mapas por campo —el fino, de dieciséis a
 * veintidós kilómetros, y el del horizonte, de cientos— y lo que cae en el del
 * horizonte va a una muestra cada trescientos metros en Canarias y cada
 * kilómetro y setecientos en Paraguay. Eso alisa justo lo que se reconoce
 * desde el avión: el Teide se queda en 3.648 m en vez de 3.715, el Roque
 * Nublo pierde 157 m, el de Agando 250, y de los 196 m de pared de Itaipú
 * asoman entre 22 y 50, porque el cañón del Paraná, de cuatrocientos metros
 * de ancho, no cabe en una muestra de kilómetro y pico.
 *
 * Así que aquí se sacan **parches**: un recuadro pequeño alrededor de cada
 * sitio, a veinte o treinta metros por muestra, que el juego pone encima del
 * horizonte de cualquier mundo que lo cubra. Ver `world/parches-de-relieve.ts`
 * y el ADR 0022.
 *
 * ## Las fuentes, cada una con su licencia
 *
 * - **Canarias: el MDT05 del PNOA-LiDAR** (IGN, CC BY 4.0), el mismo que ya
 *   llevan los mapas finos de Los Rodeos y La Palma, pedido al WCS del IDEE.
 *   Es modelo **del terreno**: sin los pinos de Las Cañadas encima.
 * - **Tajogaite**: el MDT05 es de antes de la erupción de 2021 y el cono no
 *   está. Encima va el modelo de elevaciones de **Copernicus EMS, activación
 *   EMSN119**, del 3 de febrero de 2022 (Pléiades tri-estéreo, dos metros),
 *   con la referencia vertical ajustada por ellos al LiDAR de 2015. Libre de
 *   reutilizar y distribuir citando la fuente. Es de superficie —lleva los
 *   árboles—, así que solo manda alrededor del cono, donde la erupción lo
 *   enterró todo en ceniza.
 * - **Paraguay: Copernicus DEM GLO-30**, el de los mapas de siempre, leído
 *   por rangos de su COG.
 * - **Los lagos: OpenStreetMap** (ODbL), el contorno del agua tal cual.
 *
 * ## Qué se guarda y dónde
 *
 * Lo bajado va a `datos/relieve-fino/`, fuera de git: se rehace solo. Lo que
 * va al juego —pequeño, como los demás relieves— va a `data/terrain/parches/`
 * (un `.bin` de enteros de dieciséis bits por parche, en metros, filas de
 * norte a sur, y su `.json`) y a `data/terrain/lagos.json`.
 *
 * Uso:
 *   node scripts/relieve-fino.mjs            # todos los parches
 *   node scripts/relieve-fino.mjs teide      # uno
 *   node scripts/relieve-fino.mjs --lagos    # los contornos de los lagos
 */

import { inflateRawSync, inflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CACHE = "datos/relieve-fino";
const SALIDA = "data/terrain/parches";
const AGENTE = "oga-veve/0.1 (+https://github.com/OksigeniaSL/oga-veve)";

/** Radio terrestre medio, m. El mismo que el resto de extractores. */
const R = 6371008;
const RAD = Math.PI / 180;

const ATRIBUCION_IGN =
  "Modelo Digital del Terreno MDT05 del PNOA-LiDAR © Instituto Geográfico " +
  "Nacional de España, CC BY 4.0";
const ATRIBUCION_COPERNICUS =
  "© DLR e.V. 2010-2014 y © Airbus Defence and Space GmbH 2014-2018, provided " +
  "under COPERNICUS by the European Union and ESA; all rights reserved";
const ATRIBUCION_EMS =
  "© European Union, Copernicus Emergency Management Service, activación " +
  "EMSN119 (La Palma), producto P01 DEM T3, 3 de febrero de 2022";

/**
 * **Los parches**, y por qué cada uno.
 *
 * - `ancho`/`alto`: el recuadro, m, centrado en `lat`/`lon`. Que llegue con
 *   holgura a todo lo que se reconoce: el juego funde el borde con el
 *   horizonte a lo largo de un kilómetro, y lo fundido ya no es fino.
 * - `paso`: la muestra que se guarda, m. Veinte o treinta: por debajo de lo
 *   que cubre un píxel de tablet a la distancia a la que se ven (veinte
 *   kilómetros, veintiocho metros).
 * - `dibujo`: cada cuántos metros se dibuja, más o menos; el juego lo casa
 *   con la rejilla de su horizonte. Ver `subdivisionDe` en
 *   `world/parches-de-relieve.ts`.
 */
export const PARCHES = [
  {
    id: "teide",
    nombre: "El Teide y Pico Viejo",
    lat: 28.268,
    lon: -16.654,
    ancho: 9000,
    alto: 8000,
    paso: 25,
    dibujo: 45,
    fuente: "ign",
  },
  {
    id: "roque-nublo",
    nombre: "El Roque Nublo y el Bentayga",
    lat: 27.98,
    lon: -15.627,
    ancho: 6500,
    alto: 5500,
    paso: 20,
    dibujo: 40,
    fuente: "ign",
  },
  {
    id: "roque-agando",
    nombre: "El Roque de Agando",
    lat: 28.1053,
    lon: -17.2136,
    ancho: 4500,
    alto: 4500,
    paso: 20,
    dibujo: 35,
    fuente: "ign",
  },
  {
    id: "timanfaya",
    nombre: "Timanfaya",
    lat: 29.0,
    lon: -13.73,
    ancho: 9000,
    alto: 7000,
    paso: 25,
    dibujo: 50,
    fuente: "ign",
  },
  {
    id: "tajogaite",
    nombre: "Tajogaite y la Cumbre Vieja",
    lat: 28.6133,
    lon: -17.8664,
    ancho: 6000,
    alto: 5500,
    paso: 20,
    dibujo: 35,
    fuente: "ign+ems",
  },
  {
    /*
     * La presa y el cañón del Paraná aguas abajo, hasta pasado el Monday:
     * el Puente de la Amistad y los saltos caen dentro, y el río de verdad
     * va a cien metros entre barrancas de ciento cincuenta.
     */
    id: "itaipu",
    nombre: "Itaipú y el cañón del Paraná",
    lat: -25.475,
    lon: -54.598,
    ancho: 13000,
    alto: 26000,
    paso: 30,
    dibujo: 60,
    fuente: "copernicus",
  },
  {
    id: "ypacarai",
    nombre: "El lago Ypacaraí",
    lat: -25.3,
    lon: -57.35,
    ancho: 18000,
    alto: 28000,
    paso: 30,
    dibujo: 90,
    fuente: "copernicus",
  },
];

/**
 * **Los lagos**: el agua de tierra adentro que el juego dibuja a su cota.
 *
 * `cota` es la de su lámina, con su fuente; el script la compara con la que
 * mide Copernicus dentro del contorno y la dice. `tolerancia` es cuánto se
 * simplifica el contorno, m: a veinte kilómetros un píxel cubre veintiocho.
 */
export const LAGOS = [
  {
    id: "ypacarai",
    nombre: "Lago Ypacaraí",
    /** La relación de OpenStreetMap: «Lago Ypacaraí», natural=water. */
    relacion: 3719150,
    /*
     * La lámina en estiaje y en crecida se mueve entre 62 y 64 m; la que
     * mide Copernicus dentro del contorno es la que se pone (ver la salida).
     */
    cota: null,
    tolerancia: 15,
  },
  {
    id: "itaipu",
    nombre: "Embalse de Itaipú",
    /** «Lago de Itaipu», natural=water, water=reservoir. */
    relacion: 102679,
    /** El nivel normal de explotación: 220 m (Itaipu Binacional). */
    cota: 220,
    tolerancia: 40,
  },
];

// ── Lo que se baja, con reintentos y a disco ─────────────────────────────

async function pedir(url, rango) {
  for (let intento = 1; ; intento++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": AGENTE,
          ...(rango ? { Range: `bytes=${rango[0]}-${rango[1]}` } : {}),
        },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${url} respondió ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (intento >= 5) throw e;
      await new Promise((listo) => setTimeout(listo, 2000 * intento));
    }
  }
}

/** Un fichero remoto leído por trozos, cada trozo guardado en disco. */
class Remoto {
  constructor(url) {
    this.url = url;
  }
  async leer(desde, hasta) {
    const clave = createHash("sha1").update(`${this.url}#${desde}-${hasta}`).digest("hex");
    const ruta = `${CACHE}/trozos/${clave}.bin`;
    if (existsSync(ruta)) return readFileSync(ruta);
    const b = await pedir(this.url, [desde, hasta]);
    if (!b) return null;
    mkdirSync(`${CACHE}/trozos`, { recursive: true });
    writeFileSync(ruta, b);
    return b;
  }
}

/** Un fichero entero, ya en memoria. */
class EnMemoria {
  constructor(b) {
    this.b = b;
  }
  async leer(desde, hasta) {
    return this.b.subarray(desde, Math.min(hasta + 1, this.b.length));
  }
}

// ── El lector de GeoTIFF ──────────────────────────────────────────────────

/**
 * La imagen completa de un TIFF clásico, con lo que hace falta para leer sus
 * bloques. Teselas o tiras; sin comprimir o en Deflate; enteros de dieciséis
 * bits o coma flotante de treinta y dos. Es lo que contestan las tres
 * fuentes, y nada más: si llega otra cosa, se para.
 */
async function abrirTiff(fuente) {
  const cab = await fuente.leer(0, 262143);
  if (!cab) return null;
  if (cab.toString("ascii", 0, 2) !== "II" || cab.readUInt16LE(2) !== 42)
    throw new Error("no es un TIFF little-endian clásico");
  /*
   * El directorio puede ir al final del fichero —el del EMS va detrás de los
   * doscientos megas de datos—, y entonces se lee aparte.
   */
  const donde = cab.readUInt32LE(4);
  const directorio =
    donde + 2 <= cab.length && donde + 2 + cab.readUInt16LE(donde) * 12 <= cab.length
      ? { b: cab, o: donde }
      : await (async () => {
          const cuantas = (await fuente.leer(donde, donde + 1)).readUInt16LE(0);
          return { b: await fuente.leer(donde, donde + 2 + cuantas * 12 + 3), o: 0 };
        })();
  const ifd = directorio.o;
  const n = directorio.b.readUInt16LE(ifd);
  const et = {};
  for (let i = 0; i < n; i++) {
    const o = ifd + 2 + i * 12;
    const d = directorio.b;
    const tag = d.readUInt16LE(o);
    const tipo = d.readUInt16LE(o + 2);
    const cuenta = d.readUInt32LE(o + 4);
    const tam = { 1: 1, 2: 1, 3: 2, 4: 4, 11: 4, 12: 8 }[tipo] ?? 1;
    // Los valores que caben en la entrada van en ella; si no, se leen.
    if (cuenta * tam <= 4) {
      const leer = (k) => (tipo === 3 ? d.readUInt16LE(o + 8 + k * 2) : tipo === 1 || tipo === 2 ? d[o + 8 + k] : d.readUInt32LE(o + 8));
      et[tag] = Array.from({ length: cuenta }, (_, k) => leer(k));
      continue;
    }
    const p = d.readUInt32LE(o + 8);
    const datos = p + cuenta * tam <= cab.length ? cab : await fuente.leer(p, p + cuenta * tam - 1);
    const base = datos === cab ? p : 0;
    const leer = (k) =>
      tipo === 3
        ? datos.readUInt16LE(base + k * 2)
        : tipo === 12
          ? datos.readDoubleLE(base + k * 8)
          : tipo === 1 || tipo === 2
            ? datos[base + k]
            : datos.readUInt32LE(base + k * 4);
    et[tag] = Array.from({ length: cuenta }, (_, k) => leer(k));
  }
  const uno = (t) => et[t]?.[0];
  const teselado = et[322] !== undefined;
  const img = {
    fuente,
    ancho: uno(256),
    alto: uno(257),
    bits: uno(258),
    compresion: uno(259) ?? 1,
    predictor: uno(317) ?? 1,
    formato: uno(339) ?? 1,
    anchoBloque: teselado ? uno(322) : uno(256),
    altoBloque: teselado ? uno(323) : (uno(278) ?? uno(257)),
    offsets: teselado ? et[324] : et[273],
    bytes: teselado ? et[325] : et[279],
    // Esquina noroeste del píxel (0, 0) y tamaño de píxel, en las unidades
    // del fichero: grados o metros.
    x0: et[33922][3],
    y0: et[33922][4],
    dx: et[33550][0],
    dy: et[33550][1],
    bloques: new Map(),
  };
  if (![1, 8, 32946].includes(img.compresion))
    throw new Error(`compresión ${img.compresion} no soportada`);
  if (!((img.bits === 16 && img.formato === 2) || (img.bits === 32 && img.formato === 3)))
    throw new Error(`muestras de ${img.bits} bits y formato ${img.formato}: no se esperaban`);
  return img;
}

/** Deshace el predictor de coma flotante: diferencias byte a byte y planos. */
function deshacerPredictor3(crudo, ancho, bpm) {
  const fila = ancho * bpm;
  for (let f = 0; f < crudo.length / fila; f++) {
    const t = crudo.subarray(f * fila, (f + 1) * fila);
    for (let i = 1; i < t.length; i++) t[i] = (t[i] + t[i - 1]) & 0xff;
    const copia = Buffer.from(t);
    for (let m = 0; m < ancho; m++)
      for (let plano = 0; plano < bpm; plano++) t[bpm * m + (bpm - 1 - plano)] = copia[plano * ancho + m];
  }
}

async function bloque(img, i) {
  if (img.bloques.has(i)) return img.bloques.get(i);
  const off = img.offsets[i];
  const len = img.bytes[i];
  let valores = null;
  if (off !== undefined && len) {
    let crudo = await img.fuente.leer(off, off + len - 1);
    if (crudo) {
      crudo = img.compresion === 1 ? Buffer.from(crudo) : inflateSync(crudo);
      if (img.predictor === 3) deshacerPredictor3(crudo, img.anchoBloque, img.bits / 8);
      const copia = crudo.buffer.slice(crudo.byteOffset, crudo.byteOffset + crudo.length);
      valores = img.formato === 3 ? new Float32Array(copia) : new Int16Array(copia);
    }
  }
  img.bloques.set(i, valores);
  return valores;
}

/** El valor de un píxel, o `NaN` fuera o sin dato. */
async function pixel(img, x, y) {
  if (x < 0 || y < 0 || x >= img.ancho || y >= img.alto) return NaN;
  const porFila = Math.ceil(img.ancho / img.anchoBloque);
  const bx = Math.floor(x / img.anchoBloque);
  const by = Math.floor(y / img.altoBloque);
  const v = await bloque(img, by * porFila + bx);
  if (!v) return NaN;
  const valor = v[(y - by * img.altoBloque) * img.anchoBloque + (x - bx * img.anchoBloque)];
  // El mar, los huecos y el «sin dato» de cada fuente: números muy negativos.
  return Number.isFinite(valor) && valor > -500 ? valor : NaN;
}

/** Bilineal en las coordenadas del fichero; `NaN` si falta alguna esquina. */
async function bilineal(img, x, y) {
  const px = (x - img.x0) / img.dx - 0.5;
  const py = (img.y0 - y) / img.dy - 0.5;
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const fx = px - x0;
  const fy = py - y0;
  const [a, b, c, d] = await Promise.all([
    pixel(img, x0, y0),
    pixel(img, x0 + 1, y0),
    pixel(img, x0, y0 + 1),
    pixel(img, x0 + 1, y0 + 1),
  ]);
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

// ── Transversa de Mercator, para el DEM de Copernicus EMS ─────────────────

/**
 * De grados WGS84 a UTM, con la serie de Krüger: al milímetro dentro de la
 * zona, que es de sobra para muestras de dos metros.
 */
function aUtm(lat, lon, zona) {
  const a = 6378137;
  const f = 1 / 298.257223563;
  const n = f / (2 - f);
  const A = (a / (1 + n)) * (1 + (n * n) / 4 + n ** 4 / 64);
  const alfa = [n / 2 - (2 * n * n) / 3 + (5 * n ** 3) / 16, (13 * n * n) / 48 - (3 * n ** 3) / 5, (61 * n ** 3) / 240];
  const e = Math.sqrt(f * (2 - f));
  const phi = lat * RAD;
  const lam = (lon - (zona * 6 - 183)) * RAD;
  const t = Math.sinh(Math.atanh(Math.sin(phi)) - e * Math.atanh(e * Math.sin(phi)));
  const xi = Math.atan2(t, Math.cos(lam));
  const eta = Math.atanh(Math.sin(lam) / Math.sqrt(1 + t * t));
  let E = eta;
  let N = xi;
  for (let j = 1; j <= 3; j++) {
    E += alfa[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
    N += alfa[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
  }
  return [500000 + 0.9996 * A * E, 0.9996 * A * N];
}

// ── Las fuentes ───────────────────────────────────────────────────────────

/**
 * El MDT05 del recuadro, pedido al WCS del IDEE y guardado.
 *
 * A un tercio del paso del parche, que es lo que luego se promedia: así
 * cada muestra del parche es la media de nueve medidas del terreno y no un
 * pinchazo en una ladera.
 */
async function abrirIgn(p, caja) {
  const anchoPx = Math.ceil(((caja.este - caja.oeste) * RAD * R * Math.cos(p.lat * RAD)) / (p.paso / 3));
  const altoPx = Math.ceil(((caja.norte - caja.sur) * RAD * R) / (p.paso / 3));
  const url =
    "https://servicios.idee.es/wcs-inspire/mdt?SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage" +
    "&COVERAGEID=Elevacion4258_5" +
    `&SUBSET=lat(${caja.sur.toFixed(6)},${caja.norte.toFixed(6)})` +
    `&SUBSET=long(${caja.oeste.toFixed(6)},${caja.este.toFixed(6)})` +
    `&FORMAT=image/tiff&SCALESIZE=long(${anchoPx}),lat(${altoPx})`;
  // Con la huella de lo pedido en el nombre: si cambia el recuadro, se pide otro.
  const huella = createHash("sha1").update(url).digest("hex").slice(0, 10);
  const ruta = `${CACHE}/ign-${p.id}-${huella}.tif`;
  if (!existsSync(ruta)) {
    process.stdout.write(`  pidiendo el MDT05 al IDEE (${anchoPx}×${altoPx})… `);
    const b = await pedir(url);
    if (!b) throw new Error("el IDEE no devolvió nada");
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(ruta, b);
    console.log(`${(b.length / 1e6).toFixed(1)} MB`);
  }
  const img = await abrirTiff(new EnMemoria(readFileSync(ruta)));
  return (lat, lon) => bilineal(img, lon, lat);
}

/** Copernicus GLO-30, por rangos del COG de cada grado. */
async function abrirCopernicus() {
  const grados = new Map();
  const nombre = (lat, lon) => {
    const ns = lat < 0 ? "S" : "N";
    const ew = lon < 0 ? "W" : "E";
    const la = String(Math.abs(Math.floor(lat))).padStart(2, "0");
    const lo = String(Math.abs(Math.floor(lon))).padStart(3, "0");
    return `Copernicus_DSM_COG_10_${ns}${la}_00_${ew}${lo}_00_DEM`;
  };
  return async (lat, lon) => {
    const clave = `${Math.floor(lat)},${Math.floor(lon)}`;
    if (!grados.has(clave)) {
      const n = nombre(lat, lon);
      grados.set(clave, await abrirTiff(new Remoto(`https://copernicus-dem-30m.s3.amazonaws.com/${n}/${n}.tif`)));
    }
    const img = grados.get(clave);
    return img ? bilineal(img, lon, lat) : NaN;
  };
}

/**
 * **El DEM de Copernicus EMS de después de la erupción**, sacado de su zip.
 *
 * El zip entero son mil megas; el DEM de febrero de 2022, ciento veinte
 * comprimido. Se pide **solo esa entrada**, por rango: su sitio en el zip se
 * leyó del índice central, que no cambia mientras no lo republiquen (si lo
 * hacen, la cabecera local no casa y se para aquí).
 */
const EMS = {
  zip: "https://mapping.emergency.copernicus.eu/download/EMSN119/Geospatial_data.zip",
  entrada: "Raster_data/P01/EMSN119_FLEX_AOI01_P01DEM_T3_OPTICAL_v01.tif",
  desde: 268639895,
  comprimido: 119462202,
  zona: 28,
};

async function abrirEms() {
  const ruta = `${CACHE}/emsn119-t3.tif`;
  if (!existsSync(ruta)) {
    const zipent = `${CACHE}/emsn119-t3.zipent`;
    if (!existsSync(zipent)) {
      process.stdout.write("  bajando el DEM T3 de EMSN119 (120 MB, por rango)… ");
      const b = await pedir(EMS.zip, [EMS.desde, EMS.desde + EMS.comprimido + 4095]);
      if (!b) throw new Error("Copernicus EMS no devolvió el zip");
      mkdirSync(CACHE, { recursive: true });
      writeFileSync(zipent, b);
      console.log("ok");
    }
    const b = readFileSync(zipent);
    if (b.readUInt32LE(0) !== 0x04034b50) throw new Error("la entrada del zip no empieza donde se esperaba");
    const largoNombre = b.readUInt16LE(26);
    const largoExtra = b.readUInt16LE(28);
    const nombre = b.toString("utf8", 30, 30 + largoNombre);
    if (nombre !== EMS.entrada) throw new Error(`en el zip hay «${nombre}» donde se esperaba el DEM`);
    const ini = 30 + largoNombre + largoExtra;
    writeFileSync(ruta, inflateRawSync(b.subarray(ini, ini + EMS.comprimido)));
  }
  const img = await abrirTiff(new EnMemoria(readFileSync(ruta)));
  return (lat, lon) => {
    const [e, n] = aUtm(lat, lon, EMS.zona);
    return bilineal(img, e, n);
  };
}

// ── El parche ─────────────────────────────────────────────────────────────

/** El recuadro de un parche, en grados. */
function cajaDe(p) {
  const dLat = p.alto / 2 / (R * RAD);
  const dLon = p.ancho / 2 / (R * RAD * Math.cos(p.lat * RAD));
  return { sur: p.lat - dLat, norte: p.lat + dLat, oeste: p.lon - dLon, este: p.lon + dLon };
}

/**
 * Tajogaite: el EMS manda junto al cono y el MDT05 lejos de él.
 *
 * El EMS es un modelo de **superficie**: donde hay pinar lleva los pinos, de
 * diez a veinticinco metros por encima del suelo que da el LiDAR. Junto al
 * cono no queda pinar —la ceniza lo enterró—, y ahí está lo que cambió: el
 * cono, de casi doscientos metros, y las coladas que salen de él. Así que
 * dentro de `CONO_DENTRO` manda el EMS, fuera de `CONO_FUERA` el MDT05, y
 * entre los dos se funden.
 */
const CONO = { lat: 28.6133, lon: -17.8664 };
const CONO_DENTRO = 1800;
const CONO_FUERA = 2400;

async function hacerParche(p) {
  const caja = cajaDe(p);
  const filas = Math.round(p.alto / p.paso) + 1;
  const columnas = Math.round(p.ancho / p.paso) + 1;
  console.log(`${p.id} · ${p.nombre} · ${p.ancho / 1000}×${p.alto / 1000} km a ${p.paso} m · ${columnas}×${filas}`);

  // Un poco de margen al pedir: el promedio de cada muestra mira medio paso
  // a cada lado.
  const margen = (p.paso / (R * RAD)) * 2;
  const pedida = {
    sur: caja.sur - margen,
    norte: caja.norte + margen,
    oeste: caja.oeste - margen / Math.cos(p.lat * RAD),
    este: caja.este + margen / Math.cos(p.lat * RAD),
  };
  const base = p.fuente.startsWith("ign") ? await abrirIgn(p, pedida) : await abrirCopernicus();
  const ems = p.fuente.endsWith("+ems") ? await abrirEms() : null;

  const FINURA = 3;
  const dLat = (caja.norte - caja.sur) / (filas - 1);
  const dLon = (caja.este - caja.oeste) / (columnas - 1);
  const alturas = new Int16Array(filas * columnas);
  let min = Infinity;
  let max = -Infinity;
  let cima = { h: -Infinity, lat: 0, lon: 0 };
  let huecos = 0;
  // El desfase vertical entre el EMS y el MDT05 donde no cambió nada: se
  // mide, para poder decirlo. Ver la salida.
  const diferencias = [];
  const kLon = R * RAD * Math.cos(CONO.lat * RAD);
  for (let f = 0; f < filas; f++) {
    const lat = caja.norte - f * dLat;
    for (let c = 0; c < columnas; c++) {
      const lon = caja.oeste + c * dLon;
      let suma = 0;
      let cuantas = 0;
      for (let i = 0; i < FINURA; i++)
        for (let j = 0; j < FINURA; j++) {
          const la = lat + ((i - (FINURA - 1) / 2) * dLat) / FINURA;
          const lo = lon + ((j - (FINURA - 1) / 2) * dLon) / FINURA;
          let h = await base(la, lo);
          if (ems) {
            const d = Math.hypot((lo - CONO.lon) * kLon, (la - CONO.lat) * R * RAD);
            const peso = 1 - Math.min(1, Math.max(0, (d - CONO_DENTRO) / (CONO_FUERA - CONO_DENTRO)));
            if (peso > 0) {
              const he = await ems(la, lo);
              if (Number.isFinite(he)) {
                if (d > CONO_FUERA - 200 && Number.isFinite(h) && i === 1 && j === 1) diferencias.push(he - h);
                h = Number.isFinite(h) ? h + (he - h) * peso : he;
              }
            }
          }
          if (Number.isFinite(h)) {
            suma += h;
            cuantas++;
          }
        }
      if (!cuantas) huecos++;
      const v = Math.round(cuantas ? suma / cuantas : 0);
      alturas[f * columnas + c] = v;
      if (v < min) min = v;
      if (v > max) max = v;
      if (v > cima.h) cima = { h: v, lat, lon };
    }
    if (f % 40 === 0) process.stdout.write(`\r  muestreando… ${Math.round((f / filas) * 100)} %`);
  }
  console.log("\r  muestreando… 100 %          ");
  if (huecos) console.log(`  ⚠ ${huecos} muestras sin dato, puestas a cero`);
  if (diferencias.length) {
    diferencias.sort((a, b) => a - b);
    const med = diferencias[Math.floor(diferencias.length / 2)];
    console.log(`  EMS − MDT05 en el anillo de fundido: mediana ${med.toFixed(1)} m en ${diferencias.length} muestras`);
  }
  console.log(`  cotas de ${min} a ${max} m · la más alta en ${cima.lat.toFixed(5)}, ${cima.lon.toFixed(5)}`);

  mkdirSync(SALIDA, { recursive: true });
  writeFileSync(`${SALIDA}/${p.id}.bin`, Buffer.from(alturas.buffer));
  const fuentes = {
    ign: { fuente: "PNOA-LiDAR MDT05 (IGN)", atribucion: ATRIBUCION_IGN },
    "ign+ems": {
      fuente: "PNOA-LiDAR MDT05 (IGN) y Copernicus EMS EMSN119 (DEM de febrero de 2022)",
      atribucion: `${ATRIBUCION_IGN}. ${ATRIBUCION_EMS}`,
    },
    copernicus: { fuente: "Copernicus DEM GLO-30", atribucion: ATRIBUCION_COPERNICUS },
  }[p.fuente];
  writeFileSync(
    `${SALIDA}/${p.id}.json`,
    `${JSON.stringify(
      {
        id: p.id,
        nombre: p.nombre,
        ...fuentes,
        sur: +caja.sur.toFixed(7),
        norte: +caja.norte.toFixed(7),
        oeste: +caja.oeste.toFixed(7),
        este: +caja.este.toFixed(7),
        filas,
        columnas,
        dibujo: p.dibujo,
        minM: min,
        maxM: max,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`  → ${SALIDA}/${p.id}.bin (${((alturas.byteLength) / 1024).toFixed(0)} KB)`);
}

// ── Los lagos ─────────────────────────────────────────────────────────────

/** Une las vías de un multipolígono en anillos cerrados. */
function anillosDe(vias) {
  const sueltas = vias.map((v) => v.slice());
  const anillos = [];
  while (sueltas.length) {
    let anillo = sueltas.shift();
    let cerrado = () => {
      const a = anillo[0];
      const b = anillo[anillo.length - 1];
      return a[0] === b[0] && a[1] === b[1];
    };
    while (!cerrado()) {
      const fin = anillo[anillo.length - 1];
      const i = sueltas.findIndex((v) => {
        const a = v[0];
        const b = v[v.length - 1];
        return (a[0] === fin[0] && a[1] === fin[1]) || (b[0] === fin[0] && b[1] === fin[1]);
      });
      if (i < 0) break;
      let v = sueltas.splice(i, 1)[0];
      if (v[0][0] !== fin[0] || v[0][1] !== fin[1]) v = v.reverse();
      anillo = anillo.concat(v.slice(1));
    }
    if (cerrado() && anillo.length >= 4) anillos.push(anillo);
  }
  return anillos;
}

/** Douglas–Peucker en metros, sobre un anillo cerrado de [lat, lon]. */
function simplificar(anillo, tolerancia) {
  const lat0 = anillo[0][0];
  const k = Math.cos(lat0 * RAD);
  const xy = anillo.map(([la, lo]) => [lo * RAD * R * k, la * RAD * R]);
  const guardar = new Uint8Array(anillo.length);
  guardar[0] = 1;
  guardar[anillo.length - 1] = 1;
  // El punto más lejano del primero, para partir el anillo en dos tramos.
  let lejos = 0;
  let dLejos = -1;
  for (let i = 1; i < xy.length - 1; i++) {
    const d = Math.hypot(xy[i][0] - xy[0][0], xy[i][1] - xy[0][1]);
    if (d > dLejos) {
      dLejos = d;
      lejos = i;
    }
  }
  guardar[lejos] = 1;
  const pila = [[0, lejos], [lejos, anillo.length - 1]];
  while (pila.length) {
    const [a, b] = pila.pop();
    let peor = -1;
    let cual = -1;
    const [ax, ay] = xy[a];
    const [bx, by] = xy[b];
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    for (let i = a + 1; i < b; i++) {
      const t = Math.max(0, Math.min(1, ((xy[i][0] - ax) * dx + (xy[i][1] - ay) * dy) / l2));
      const d = Math.hypot(xy[i][0] - ax - t * dx, xy[i][1] - ay - t * dy);
      if (d > peor) {
        peor = d;
        cual = i;
      }
    }
    if (peor > tolerancia) {
      guardar[cual] = 1;
      pila.push([a, cual], [cual, b]);
    }
  }
  return anillo.filter((_, i) => guardar[i]).map(([la, lo]) => [+la.toFixed(6), +lo.toFixed(6)]);
}

/** Si un punto cae dentro de un anillo, por paridad. */
function dentro(anillo, la, lo) {
  let si = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [ya, xa] = anillo[i];
    const [yb, xb] = anillo[j];
    if (ya > la !== yb > la && lo < ((xb - xa) * (la - ya)) / (yb - ya) + xa) si = !si;
  }
  return si;
}

async function hacerLagos() {
  const copernicus = await abrirCopernicus();
  const salida = [];
  for (const l of LAGOS) {
    console.log(`${l.id} · ${l.nombre}`);
    /*
     * **Por la API de OpenStreetMap y no por Overpass**: es una relación
     * conocida y entera, con sus vías y sus nudos, y Overpass pasa medias
     * mañanas saturado. Guardada en disco: una petición por lago y versión.
     */
    const ruta = `${CACHE}/osm-relation-${l.relacion}.json`;
    if (!existsSync(ruta)) {
      const b = await pedir(`https://api.openstreetmap.org/api/0.6/relation/${l.relacion}/full.json`);
      if (!b) throw new Error(`OpenStreetMap no tiene la relación ${l.relacion}`);
      mkdirSync(CACHE, { recursive: true });
      writeFileSync(ruta, b);
    }
    const datos = JSON.parse(readFileSync(ruta, "utf8"));
    const nudos = new Map(datos.elements.filter((x) => x.type === "node").map((x) => [x.id, [x.lat, x.lon]]));
    const lineas = new Map(datos.elements.filter((x) => x.type === "way").map((x) => [x.id, x.nodes]));
    const rel = datos.elements.find((x) => x.type === "relation" && x.id === l.relacion);
    if (!rel) throw new Error(`no se encontró ${l.nombre} en OpenStreetMap`);
    const vias = (papel) =>
      rel.members
        .filter((m) => m.type === "way" && m.role === papel && lineas.has(m.ref))
        .map((m) => lineas.get(m.ref).map((id) => nudos.get(id)).filter(Boolean));
    const exteriores = anillosDe(vias("outer")).map((a) => simplificar(a, l.tolerancia));
    const interiores = anillosDe(vias("inner"))
      .map((a) => simplificar(a, l.tolerancia))
      // Las islas de menos de cuatro puntos tras simplificar no se ven.
      .filter((a) => a.length >= 4);
    const puntos = [...exteriores, ...interiores].reduce((t, a) => t + a.length, 0);
    console.log(`  relation/${rel.id}: ${exteriores.length} contornos, ${interiores.length} islas, ${puntos} puntos`);

    // Lo que mide Copernicus dentro, para comparar con la cota que se pone.
    const cotas = [];
    const ex = exteriores[0];
    const lats = ex.map((p) => p[0]);
    const lons = ex.map((p) => p[1]);
    const [s2, n2, o2, e2] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
    for (let i = 0; i < 40; i++)
      for (let j = 0; j < 40; j++) {
        const la = s2 + ((i + 0.5) * (n2 - s2)) / 40;
        const lo = o2 + ((j + 0.5) * (e2 - o2)) / 40;
        if (exteriores.some((a) => dentro(a, la, lo)) && !interiores.some((a) => dentro(a, la, lo))) {
          const h = await copernicus(la, lo);
          if (Number.isFinite(h)) cotas.push(h);
        }
      }
    cotas.sort((a, b) => a - b);
    const mediana = cotas[Math.floor(cotas.length / 2)];
    console.log(`  Copernicus dentro: mediana ${mediana?.toFixed(1)} m en ${cotas.length} muestras`);
    const cota = l.cota ?? Math.round(mediana);
    console.log(`  cota que se pone: ${cota} m${l.cota ? " (la publicada)" : " (la medida)"}`);
    salida.push({
      id: l.id,
      nombre: l.nombre,
      cota,
      de: `osm relation/${rel.id}`,
      exteriores,
      interiores,
    });
  }
  writeFileSync(
    "data/terrain/lagos.json",
    `${JSON.stringify(
      {
        fuente: "OpenStreetMap: el contorno del agua de cada lago, simplificado",
        licencia: "© colaboradores de OpenStreetMap, ODbL 1.0",
        lagos: salida,
      },
      null,
      1,
    )}\n`,
  );
  console.log("  → data/terrain/lagos.json");
}

// ── El programa ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.includes("--lagos")) {
  await hacerLagos();
} else {
  const ids = args.filter((a) => !a.startsWith("--"));
  const elegidos = ids.length ? PARCHES.filter((p) => ids.includes(p.id)) : PARCHES;
  if (!elegidos.length) {
    console.error(`Parches: ${PARCHES.map((p) => p.id).join(", ")}`);
    process.exit(1);
  }
  for (const p of elegidos) await hacerParche(p);
}

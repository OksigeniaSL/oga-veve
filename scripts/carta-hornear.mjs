/**
 * **El horno de la carta**: el relieve, el sombreado, el mar con sus veriles y
 * la cubierta del suelo de cada región, pintados una vez en una imagen.
 *
 * Lo que no cambia en vuelo no se calcula en el juego. Una tablet de gama media
 * no tiene por qué sombrear mil kilómetros de Paraguay cada vez que se abre el
 * hangar: se hace aquí, con los datos de verdad, y el juego pone la imagen y
 * dibuja encima lo que sí cambia —las rutas, los símbolos, las letras de cada
 * peldaño—. Ver `src/ui/carta/`.
 *
 * ## De dónde sale cada cosa
 *
 * - **El relieve y el fondo del mar**: ETOPO 2022, de NCEI/NOAA, a quince
 *   segundos de arco (unos 460 m). Es dominio público, como todo lo que publica
 *   el Gobierno de los Estados Unidos, y trae a la vez tierra y batimetría, que
 *   es justo lo que hace falta para los veriles. Ver el ADR 0021.
 * - **La cubierta del suelo**: ESA WorldCover 2021 v200, CC BY 4.0. Se lee de
 *   las vistas reducidas que lleva dentro cada fichero —a unos 300 o 600 m por
 *   píxel—, así que de cada tesela de tres grados se bajan unos pocos cientos
 *   de kilobytes y no los cien megas que pesa entera.
 * - **La lluvia del año**, para separar el monte seco del húmedo: CHELSA V2.1,
 *   bio12 de 1981-2010, CC0. Solo se bajan las filas de la región.
 * - **La costa y el contorno del país**: Natural Earth, las mismas siluetas que
 *   dibuja el juego encima, para que la costa pintada y la trazada coincidan.
 *
 * Todo se guarda en `datos/carta/`, que no va a git: la segunda tirada no baja
 * nada y tarda segundos. Los colores salen de `src/ui/carta/estilo.ts`, el
 * mismo fichero que lee el juego: cambiar la rampa es cambiarla allí y volver
 * a hornear.
 *
 * ## Uso
 *
 *   node scripts/carta-hornear.mjs            # las tres regiones
 *   node scripts/carta-hornear.mjs canarias   # una
 *
 * Sale `src/assets/carta/<region>.webp`. Hace falta `cwebp`.
 *
 * Sin dependencias, como `copernicus-a-relieve.mjs`: el lector de GeoTIFF son
 * cien líneas y Node ya trae `inflate`.
 */

import { inflateSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, openSync, readSync, closeSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  REGIONES,
  RAMPA,
  MAR,
  CUBIERTA,
  SOMBRA,
  VERILES,
  AGUA_DULCE,
  PAPEL,
  FUERA_DEL_PAIS,
  PUNTEADO,
  JUNCOS,
} from "../src/ui/carta/estilo.ts";
import { SILUETAS } from "../src/ui/siluetas.ts";

const CACHE = "datos/carta";
const SALIDA = "src/assets/carta";
const AGENTE = "oga-veve/0.1 (+https://github.com/OksigeniaSL/oga-veve)";

/** Radio terrestre medio, m. El mismo que el resto del juego. */
const R = 6371008;

// ── Lo que se baja, con reintentos y a disco ─────────────────────────────

async function pedir(url, rango) {
  for (let intento = 1; ; intento++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": AGENTE, ...(rango ? { Range: `bytes=${rango[0]}-${rango[1]}` } : {}) },
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

/**
 * Un fichero remoto que se lee por trozos, cada trozo guardado en disco.
 *
 * Un trozo que ya se bajó una vez no se vuelve a pedir: al cambiar un color
 * se hornea otra vez sin tocar la red.
 */
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

/** Un fichero entero en disco, bajado la primera vez. */
class Local {
  static async bajar(url, ruta) {
    if (!existsSync(ruta)) {
      process.stdout.write(`  bajando ${url.split("/").pop()}… `);
      const b = await pedir(url);
      if (!b) return null;
      mkdirSync(ruta.replace(/\/[^/]+$/, ""), { recursive: true });
      writeFileSync(ruta, b);
      console.log(`${(b.length / 1e6).toFixed(1)} MB`);
    }
    return new Local(ruta);
  }
  constructor(ruta) {
    this.fd = openSync(ruta, "r");
    this.tam = statSync(ruta).size;
  }
  async leer(desde, hasta) {
    const n = Math.min(hasta, this.tam - 1) - desde + 1;
    const b = Buffer.alloc(n);
    readSync(this.fd, b, 0, n, desde);
    return b;
  }
  cerrar() {
    closeSync(this.fd);
  }
}

// ── El lector de GeoTIFF ──────────────────────────────────────────────────

/**
 * Las imágenes de un TIFF clásico —la completa y sus vistas reducidas—, con lo
 * que hace falta para pedir sus teselas o sus tiras.
 */
async function leerTiff(fuente) {
  const cab = await fuente.leer(0, 262143);
  if (!cab) return null;
  if (cab.toString("ascii", 0, 2) !== "II" || cab.readUInt16LE(2) !== 42)
    throw new Error("no es un TIFF little-endian clásico");
  const imagenes = [];
  let ifd = cab.readUInt32LE(4);
  while (ifd) {
    const n = cab.readUInt16LE(ifd);
    const etiquetas = {};
    for (let i = 0; i < n; i++) {
      const o = ifd + 2 + i * 12;
      const tag = cab.readUInt16LE(o);
      const tipo = cab.readUInt16LE(o + 2);
      const cuenta = cab.readUInt32LE(o + 4);
      const tam = { 1: 1, 2: 1, 3: 2, 4: 4, 11: 4, 12: 8 }[tipo] ?? 1;
      const enLinea = cuenta * tam <= 4;
      const p = enLinea ? o + 8 : cab.readUInt32LE(o + 8);
      // Las tablas largas pueden caer fuera de la cabecera: se piden aparte.
      const datos = p + cuenta * tam <= cab.length ? cab : await fuente.leer(p, p + cuenta * tam - 1);
      const base = datos === cab ? p : 0;
      const leer = (k) =>
        tipo === 3
          ? datos.readUInt16LE(base + k * 2)
          : tipo === 12
            ? datos.readDoubleLE(base + k * 8)
            : tipo === 2 || tipo === 1
              ? datos[base + k]
              : datos.readUInt32LE(base + k * 4);
      etiquetas[tag] = Array.from({ length: cuenta }, (_, k) => leer(k));
    }
    const uno = (t) => etiquetas[t]?.[0];
    const teselado = etiquetas[322] !== undefined;
    imagenes.push({
      ancho: uno(256),
      alto: uno(257),
      bits: uno(258),
      compresion: uno(259),
      predictor: uno(317) ?? 1,
      formato: uno(339) ?? 1,
      teselado,
      anchoBloque: teselado ? uno(322) : uno(256),
      altoBloque: teselado ? uno(323) : (uno(278) ?? 1),
      offsets: teselado ? etiquetas[324] : etiquetas[273],
      bytes: teselado ? etiquetas[325] : etiquetas[279],
      escala: etiquetas[33550],
      atadura: etiquetas[33922],
    });
    ifd = cab.readUInt32LE(ifd + 2 + n * 12);
  }
  if (imagenes[0].compresion !== 8 && imagenes[0].compresion !== 32946)
    throw new Error(`compresión ${imagenes[0].compresion} no soportada`);
  return imagenes;
}

/** Deshace los predictores de TIFF sobre un bloque ya descomprimido. */
function deshacer(crudo, img) {
  const ancho = img.anchoBloque;
  const bpm = img.bits / 8;
  const fila = ancho * bpm;
  const filas = crudo.length / fila;
  if (img.predictor === 2) {
    for (let f = 0; f < filas; f++) {
      const o = f * fila;
      if (bpm === 1) for (let i = 1; i < ancho; i++) crudo[o + i] = (crudo[o + i] + crudo[o + i - 1]) & 0xff;
      else if (bpm === 2)
        for (let i = 1; i < ancho; i++)
          crudo.writeUInt16LE((crudo.readUInt16LE(o + i * 2) + crudo.readUInt16LE(o + (i - 1) * 2)) & 0xffff, o + i * 2);
    }
  } else if (img.predictor === 3) {
    for (let f = 0; f < filas; f++) {
      const t = crudo.subarray(f * fila, (f + 1) * fila);
      for (let i = 1; i < t.length; i++) t[i] = (t[i] + t[i - 1]) & 0xff;
      const copia = Buffer.from(t);
      for (let m = 0; m < ancho; m++)
        for (let plano = 0; plano < bpm; plano++) t[bpm * m + (bpm - 1 - plano)] = copia[plano * ancho + m];
    }
  }
  return crudo;
}

/**
 * Una imagen de un TIFF, con sus bloques —teselas o tiras— pedidos cuando
 * hacen falta y una sola vez.
 */
class Raster {
  constructor(fuente, img, base) {
    this.fuente = fuente;
    this.img = img;
    this.bloques = new Map();
    // La esquina noroeste y el paso, de la imagen completa: las reducidas
    // cubren lo mismo con menos píxeles.
    this.lon0 = base.atadura[3];
    this.lat0 = base.atadura[4];
    this.paso = (base.escala[0] * base.ancho) / img.ancho;
  }
  async bloque(i) {
    if (this.bloques.has(i)) return this.bloques.get(i);
    /*
     * **Las tiras, de sesenta y cuatro en sesenta y cuatro.** Un fichero por
     * tiras de una fila —el de la lluvia— pedido fila a fila son mil
     * peticiones para el Paraguay, y cada una tarda lo suyo. Seguidas en el
     * fichero, se piden de una vez y se reparten.
     */
    if (!this.img.teselado) {
      const desde = Math.floor(i / 64) * 64;
      const hasta = Math.min(this.img.offsets.length, desde + 64) - 1;
      const o0 = this.img.offsets[desde];
      const o1 = this.img.offsets[hasta] + this.img.bytes[hasta] - 1;
      const seguidas = this.img.offsets
        .slice(desde + 1, hasta + 1)
        .every((o, k) => o === this.img.offsets[desde + k] + this.img.bytes[desde + k]);
      if (seguidas) {
        const b = await this.fuente.leer(o0, o1);
        for (let j = desde; j <= hasta; j++) {
          const a = this.img.offsets[j] - o0;
          this.bloques.set(j, this.valores(b.subarray(a, a + this.img.bytes[j])));
        }
        return this.bloques.get(i);
      }
    }
    const off = this.img.offsets[i];
    const len = this.img.bytes[i];
    let valores = null;
    if (off !== undefined && len) valores = this.valores(await this.fuente.leer(off, off + len - 1));
    this.bloques.set(i, valores);
    return valores;
  }
  valores(b) {
    const crudo = deshacer(inflateSync(b), this.img);
    const n = crudo.length / (this.img.bits / 8);
    // Copiado: un Float32Array pide el comienzo alineado a cuatro bytes, y el
    // de `inflate` no siempre lo está.
    return this.img.formato === 3
      ? new Float32Array(crudo.buffer.slice(crudo.byteOffset, crudo.byteOffset + crudo.length))
      : this.img.bits === 16
        ? new Uint16Array(crudo.buffer.slice(crudo.byteOffset, crudo.byteOffset + crudo.length))
        : new Uint8Array(crudo.buffer, crudo.byteOffset, n);
  }
  /** El valor del píxel `(x, y)` de esta imagen, o `null` si no lo hay. */
  async pixel(x, y) {
    const { img } = this;
    if (x < 0 || y < 0 || x >= img.ancho || y >= img.alto) return null;
    const porFila = Math.ceil(img.ancho / img.anchoBloque);
    const bx = Math.floor(x / img.anchoBloque);
    const by = Math.floor(y / img.altoBloque);
    const v = await this.bloque(by * porFila + bx);
    if (!v) return null;
    return v[(y - by * img.altoBloque) * img.anchoBloque + (x - bx * img.anchoBloque)];
  }
  /** Bilineal, en grados. */
  async bilineal(lon, lat) {
    const px = (lon - this.lon0) / this.paso - 0.5;
    const py = (this.lat0 - lat) / this.paso - 0.5;
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const fx = px - x0;
    const fy = py - y0;
    const v = await Promise.all([
      this.pixel(x0, y0),
      this.pixel(x0 + 1, y0),
      this.pixel(x0, y0 + 1),
      this.pixel(x0 + 1, y0 + 1),
    ]);
    if (v.some((a) => a === null)) return v.find((a) => a !== null) ?? null;
    return (v[0] * (1 - fx) + v[1] * fx) * (1 - fy) + (v[2] * (1 - fx) + v[3] * fx) * fy;
  }
  /** El más cercano, en grados: para las clases, que no se promedian. */
  async cercano(lon, lat) {
    return this.pixel(Math.floor((lon - this.lon0) / this.paso), Math.floor((this.lat0 - lat) / this.paso));
  }
}

// ── Las tres fuentes ──────────────────────────────────────────────────────

/** ETOPO 2022: teselas de quince grados, nombradas por su esquina noroeste. */
async function abrirEtopo(region) {
  const teselas = new Map();
  for (let lat = Math.ceil(region.sur / 15) * 15; lat <= Math.ceil(region.norte / 15) * 15; lat += 15)
    for (let lon = Math.floor(region.oeste / 15) * 15; lon <= Math.floor(region.este / 15) * 15; lon += 15) {
      const nombre = `${lat >= 0 ? "N" : "S"}${String(Math.abs(lat)).padStart(2, "0")}${lon >= 0 ? "E" : "W"}${String(Math.abs(lon)).padStart(3, "0")}`;
      const url = `https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/15s/15s_surface_elev_gtif/ETOPO_2022_v1_15s_${nombre}_surface.tif`;
      const local = await Local.bajar(url, `${CACHE}/etopo/${nombre}.tif`);
      if (!local) throw new Error(`ETOPO no tiene ${nombre}`);
      const imgs = await leerTiff(local);
      teselas.set(`${lat},${lon}`, new Raster(local, imgs[0], imgs[0]));
    }
  return {
    async cota(lon, lat) {
      const t = teselas.get(`${Math.ceil(lat / 15) * 15},${Math.floor(lon / 15) * 15}`);
      return t ? t.bilineal(lon, lat) : null;
    },
  };
}

/**
 * WorldCover: teselas de tres grados, nombradas por su esquina suroeste. Se
 * abre la vista reducida más basta que todavía es más fina que la carta.
 */
async function abrirCubierta(region) {
  const teselas = new Map();
  const porTesela = 3 * region.porGrado;
  for (let lat = Math.floor(region.sur / 3) * 3; lat < region.norte; lat += 3)
    for (let lon = Math.floor(region.oeste / 3) * 3; lon < region.este; lon += 3) {
      const nombre = `${lat >= 0 ? "N" : "S"}${String(Math.abs(lat)).padStart(2, "0")}${lon >= 0 ? "E" : "W"}${String(Math.abs(lon)).padStart(3, "0")}`;
      const url = `https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_${nombre}_Map.tif`;
      const remoto = new Remoto(url);
      const imgs = await leerTiff(remoto);
      // Una tesela que no existe es mar abierto: WorldCover solo publica las
      // que tocan tierra.
      if (!imgs) continue;
      const img = [...imgs].reverse().find((i) => i.ancho >= porTesela) ?? imgs[0];
      teselas.set(`${lat},${lon}`, new Raster(remoto, img, imgs[0]));
    }
  console.log(`  cubierta: ${teselas.size} teselas de WorldCover`);
  return {
    async clase(lon, lat) {
      const t = teselas.get(`${Math.floor(lat / 3) * 3},${Math.floor(lon / 3) * 3}`);
      return t ? t.cercano(lon, lat) : null;
    },
  };
}

/** CHELSA bio12: un solo fichero mundial por tiras de una fila. */
async function abrirLluvia() {
  const remoto = new Remoto(
    "https://os.zhdk.cloud.switch.ch/chelsav2/GLOBAL/climatologies/1981-2010/bio/CHELSA_bio12_1981-2010_V.2.1.tif",
  );
  const imgs = await leerTiff(remoto);
  const r = new Raster(remoto, imgs[0], imgs[0]);
  return {
    // El fichero guarda décimas de milímetro: lleva una escala de 0,1.
    async mm(lon, lat) {
      const v = await r.bilineal(lon, lat);
      return v === null ? null : v * 0.1;
    },
  };
}

// ── Lo que se pinta ───────────────────────────────────────────────────────

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const mezcla = (a, b, t) => [0, 1, 2].map((i) => a[i] * (1 - t) + b[i] * t);
const RAMPA_RGB = RAMPA.map((f) => ({ desde: f.desde, color: rgb(f.color) }));
const MAR_RGB = MAR.map((f) => ({ desde: f.desde, color: rgb(f.color) }));

/** La franja de una tabla en la que cae un valor. */
function franja(tabla, v) {
  let i = 0;
  while (i + 1 < tabla.length && v >= tabla[i + 1].desde) i++;
  return i;
}

/** Un número de 0 a 1 que depende solo de dónde se está: para desordenar. */
const azar = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

/**
 * Qué píxeles están dentro de unos anillos, fila a fila: el relleno de toda la
 * vida por pares de cortes. Es como se pinta la costa sin preguntar a cada
 * píxel por cada vértice.
 */
function rellenar(anillos, ancho, alto, aPixel) {
  const dentro = new Uint8Array(ancho * alto);
  const lados = [];
  for (const a of anillos)
    for (let i = 0; i < a.length; i++) lados.push([aPixel(a[i]), aPixel(a[(i + 1) % a.length])]);
  for (let y = 0; y < alto; y++) {
    const yc = y + 0.5;
    const cortes = [];
    for (const [p, q] of lados)
      if (p[1] > yc !== q[1] > yc) cortes.push(p[0] + ((yc - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
    cortes.sort((a, b) => a - b);
    for (let k = 0; k + 1 < cortes.length; k += 2) {
      const x0 = Math.max(0, Math.ceil(cortes[k] - 0.5));
      const x1 = Math.min(ancho - 1, Math.floor(cortes[k + 1] - 0.5));
      for (let x = x0; x <= x1; x++) dentro[y * ancho + x] = 1;
    }
  }
  return dentro;
}

/**
 * **De la clase de WorldCover y la lluvia a los tintes de la hoja.**
 *
 * WorldCover dice qué hay —árboles, matorral, pasto, cultivo, suelo desnudo,
 * humedal, ciudad— y no si es seco o húmedo: el monte del Chaco y el de
 * Itapúa son los dos «árboles». Eso lo dice la lluvia del año, y con ella se
 * reparte entre el tinte húmedo y el seco de la región. Devuelve pares de
 * tinte y peso.
 */
function tintesDe(clase, seco, region) {
  const { humedo: h, seco: s } = region.tintes;
  switch (clase) {
    case 10:
    case 20:
    case 30:
    case 40:
      return [
        [h, 1 - seco],
        [s, seco],
      ];
    // El suelo desnudo: el ocre de las islas de levante, y en el Paraguay, Chaco.
    case 60:
      return [[s === "chaco" ? "chaco" : "ocre", 1]];
    /*
     * Musgo y liquen: en Canarias es lo que cubre los malpaíses —la lava
     * reciente, que el liquen es lo primero que la coloniza—, y así es como
     * WorldCover los ve desde el satélite.
     */
    case 100:
      return [[region.conMar ? "volcan" : "ocre", 1]];
    case 90:
    case 95:
      return [["estero", 1]];
    case 50:
      return [["ciudad", 1]];
    default:
      return [];
  }
}

async function hornear(id) {
  const region = REGIONES[id];
  const latMedia = (region.sur + region.norte) / 2;
  const k = Math.cos((latMedia * Math.PI) / 180);
  const ancho = Math.round((region.este - region.oeste) * k * region.porGrado);
  const alto = Math.round((region.norte - region.sur) * region.porGrado);
  console.log(`${id}: ${ancho}×${alto} px`);

  const lonDe = (x) => region.oeste + ((x + 0.5) / ancho) * (region.este - region.oeste);
  const latDe = (y) => region.norte - ((y + 0.5) / alto) * (region.norte - region.sur);
  const aPixel = ([lon, lat]) => [
    ((lon - region.oeste) / (region.este - region.oeste)) * ancho,
    ((region.norte - lat) / (region.norte - region.sur)) * alto,
  ];

  const etopo = await abrirEtopo(region);
  const cubierta = await abrirCubierta(region);
  const lluvia = await abrirLluvia();

  // La costa y el país, de las mismas siluetas que se trazan encima.
  const tierra = region.conMar ? rellenar(SILUETAS.es, ancho, alto, aPixel) : null;
  const pais = region.pais ? rellenar(SILUETAS[region.pais], ancho, alto, aPixel) : null;

  const h = new Float32Array(ancho * alto);
  const clase = new Uint8Array(ancho * alto);
  const mm = new Float32Array(ancho * alto);
  for (let y = 0; y < alto; y++) {
    const lat = latDe(y);
    for (let x = 0; x < ancho; x++) {
      const lon = lonDe(x);
      const i = y * ancho + x;
      h[i] = (await etopo.cota(lon, lat)) ?? 0;
      clase[i] = (await cubierta.clase(lon, lat)) ?? 0;
      mm[i] = (await lluvia.mm(lon, lat)) ?? region.lluvia.humedo;
    }
    if (y % 25 === 0) process.stdout.write(`\r  muestreando… ${Math.round((y / alto) * 100)} %`);
  }
  console.log(`\r  muestreando… 100 %   `);

  const esTierra = (i) => (tierra ? tierra[i] === 1 : true);
  const cuenta = {};
  for (let i = 0; i < h.length; i++) if (esTierra(i)) cuenta[clase[i]] = (cuenta[clase[i]] ?? 0) + 1;
  console.log(`  clases en tierra: ${JSON.stringify(cuenta)}`);

  /*
   * ── La cubierta: un multiplicador por píxel, suavizado ──────────────────
   *
   * `color = mix(rampa, rampa × tinte, fuerza)` es multiplicar la rampa por
   * `1 + fuerza × (tinte − 1)`. Se guarda ese multiplicador y se suaviza con
   * sus vecinos: así los bordes entre cubiertas son suaves y desiguales, y no
   * la escalera de píxeles de un mapa de clases.
   */
  const mult = new Float32Array(ancho * alto * 3).fill(1);
  const peso = { volcan: new Float32Array(ancho * alto), estero: new Float32Array(ancho * alto) };
  for (let i = 0; i < h.length; i++) {
    if (!esTierra(i)) continue;
    const seco = Math.max(0, Math.min(1, (region.lluvia.humedo - mm[i]) / (region.lluvia.humedo - region.lluvia.seco)));
    for (const [nombre, w] of tintesDe(clase[i], seco, region)) {
      const t = CUBIERTA[nombre];
      const c = rgb(t.color);
      for (let k3 = 0; k3 < 3; k3++) mult[i * 3 + k3] += w * t.fuerza * (c[k3] - 1);
      if (peso[nombre]) peso[nombre][i] = w;
    }
  }
  const suave = new Float32Array(mult.length);
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++)
      for (let k3 = 0; k3 < 3; k3++) {
        let suma = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= ancho || yy >= alto) continue;
            suma += mult[(yy * ancho + xx) * 3 + k3];
            n++;
          }
        suave[(y * ancho + x) * 3 + k3] = suma / n;
      }

  // ── El sombreado, una vez; se aplica con las dos fuerzas ──────────────
  const dxM = (R * Math.PI * (region.este - region.oeste) * k) / 180 / ancho;
  const dyM = (R * Math.PI * (region.norte - region.sur)) / 180 / alto;
  const az = (SOMBRA.azimut * Math.PI) / 180;
  const zen = ((90 - SOMBRA.altura) * Math.PI) / 180;
  const en = (x, y) => h[Math.min(alto - 1, Math.max(0, y)) * ancho + Math.min(ancho - 1, Math.max(0, x))];
  const enTierra = (x, y) => Math.max(0, en(x, y));
  const oscuro = new Float32Array(ancho * alto);
  const pendientePx = new Float32Array(ancho * alto);
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++) {
      const i = y * ancho + x;
      pendientePx[i] = Math.hypot((en(x + 1, y) - en(x - 1, y)) / 2, (en(x, y + 1) - en(x, y - 1)) / 2);
      if (!esTierra(i)) continue;
      /*
       * La cuenta de siempre de los SIG, con la luz a 315° y 45° de altura:
       * `sy` crece hacia el sur, y con esa convención la orientación de la
       * ladera es atan2(sy, −sx) y el ángulo de la luz, 450° − azimut.
       */
      const sx = ((enTierra(x + 1, y) - enTierra(x - 1, y)) / 2 / dxM) * region.exageracion;
      const sy = ((enTierra(x, y + 1) - enTierra(x, y - 1)) / 2 / dyM) * region.exageracion;
      const pendiente = Math.atan(Math.hypot(sx, sy));
      const aspecto = Math.atan2(sy, -sx);
      const luz =
        Math.cos(zen) * Math.cos(pendiente) +
        Math.sin(zen) * Math.sin(pendiente) * Math.cos(Math.PI * 2.5 - az - aspecto);
      // Normalizada: el llano vale uno y no se oscurece; solo la sombra pinta.
      oscuro[i] = Math.max(0, Math.min(1, 1 - luz / Math.cos(zen)));
    }

  const papel = rgb(PAPEL.fondo);
  const veril = rgb(VERILES.color);
  const dulce = rgb(AGUA_DULCE);
  const sombra = rgb(SOMBRA.color);
  const volcan = rgb(CUBIERTA.volcan.color);
  // Los juncos, en la tinta del agua de la hoja.
  const junco = rgb("#255f86");
  const limitesMar = MAR.slice(1).map((f) => -f.desde);

  /**
   * La raya de un veril, con su borde suave: la distancia en píxeles a la
   * curva es la diferencia de cota partida por la pendiente, y la raya se
   * enciende cuando esa distancia baja de medio grosor. Una línea fina y sin
   * dientes sin tener que trazar la curva.
   */
  const raya = (v, limites, pendiente, grosor) => {
    let d = Infinity;
    for (const l of limites) d = Math.min(d, Math.abs(v - l));
    if (pendiente < 1e-6) return 0;
    return Math.max(0, Math.min(1, grosor / 2 + 0.5 - d / pendiente));
  };

  /** El símbolo de los juncos: una raya de suelo y tres tallos. */
  const JUNCO = [
    [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0],
    [0, -1], [0, -2], [0, -3], [-2, -1], [-2, -2], [2, -1], [2, -2],
  ];

  for (const [sufijo, fuerza] of [
    ["", SOMBRA.fuerza],
    ["-pequenos", SOMBRA.fuerzaPequenos],
  ]) {
    const color = new Float32Array(ancho * alto * 3);
    for (let y = 0; y < alto; y++)
      for (let x = 0; x < ancho; x++) {
        const i = y * ancho + x;
        let c;
        if (!esTierra(i)) {
          // El mar: su franja de fondo y los veriles. El mar no se sombrea.
          c = MAR_RGB[franja(MAR_RGB, Math.max(0, -h[i]))].color;
          c = mezcla(c, veril, raya(h[i], limitesMar, pendientePx[i], VERILES.grosor));
        } else if (clase[i] === 80) {
          c = dulce;
        } else {
          const base = RAMPA_RGB[franja(RAMPA_RGB, Math.max(0, h[i]))].color;
          c = base.map((v, k3) => v * suave[i * 3 + k3]);
          // `color × (1 − fuerza × oscuro)`, con un toque de la sombra fría.
          const d = oscuro[i] * fuerza;
          c = c.map((v, k3) => v * (1 - d) + sombra[k3] * d * 0.35);
        }
        if (pais && !pais[i]) c = mezcla(c, papel, FUERA_DEL_PAIS);
        color[i * 3] = c[0];
        color[i * 3 + 1] = c[1];
        color[i * 3 + 2] = c[2];
      }

    const pinta = (x, y, c, a) => {
      if (x < 0 || y < 0 || x >= ancho || y >= alto || a <= 0) return;
      const i = (y * ancho + x) * 3;
      for (let k3 = 0; k3 < 3; k3++) color[i + k3] = color[i + k3] * (1 - a) + c[k3] * a;
    };
    // El punteado del volcán, en una rejilla desordenada.
    for (let gy = 0; gy < alto; gy += PUNTEADO.paso)
      for (let gx = 0; gx < ancho; gx += PUNTEADO.paso) {
        const px = gx + azar(gx, gy) * PUNTEADO.paso;
        const py = gy + azar(gy, gx) * PUNTEADO.paso;
        const i = Math.floor(py) * ancho + Math.floor(px);
        if (!(peso.volcan[i] > 0.5)) continue;
        for (let yy = Math.floor(py - 1); yy <= Math.ceil(py + 1); yy++)
          for (let xx = Math.floor(px - 1); xx <= Math.ceil(px + 1); xx++) {
            const dist = Math.hypot(xx + 0.5 - px, yy + 0.5 - py);
            pinta(xx, yy, volcan, Math.max(0, Math.min(1, PUNTEADO.radio + 0.5 - dist)) * PUNTEADO.opacidad);
          }
      }
    // Los juncos de los esteros, donde el estero ocupa todo el símbolo.
    for (let gy = JUNCOS.paso / 2; gy < alto; gy += JUNCOS.paso)
      for (let gx = ((gy / JUNCOS.paso) % 2) * (JUNCOS.paso / 2); gx < ancho; gx += JUNCOS.paso) {
        const px = Math.round(gx + (azar(gx, gy) - 0.5) * 4);
        const py = Math.round(gy + (azar(gy, gx) - 0.5) * 4);
        const todo = JUNCO.every(([dx, dy]) => peso.estero[(py + dy) * ancho + (px + dx)] > 0.5);
        if (!todo) continue;
        // Fuera del país, apagados como todo lo de fuera.
        const fuera = pais && !pais[py * ancho + px] ? 1 - FUERA_DEL_PAIS : 1;
        for (const [dx, dy] of JUNCO) pinta(px + dx, py + dy, junco, JUNCOS.opacidad * fuera);
      }

    const salida = Buffer.alloc(ancho * alto * 3);
    for (let i = 0; i < color.length; i++) salida[i] = Math.round(Math.max(0, Math.min(1, color[i])) * 255);
    // A WebP por un PPM, que `cwebp` lee sin más.
    mkdirSync(`${CACHE}/ppm`, { recursive: true });
    const ppm = `${CACHE}/ppm/${id}${sufijo}.ppm`;
    writeFileSync(ppm, Buffer.concat([Buffer.from(`P6\n${ancho} ${alto}\n255\n`), salida]));
    mkdirSync(SALIDA, { recursive: true });
    const webp = `${SALIDA}/${id}${sufijo}.webp`;
    execFileSync("cwebp", ["-quiet", "-q", "82", "-m", "6", "-sharp_yuv", ppm, "-o", webp]);
    console.log(`  ${webp}: ${(statSync(webp).size / 1024).toFixed(0)} KB`);
  }
}

const pedidas = process.argv.slice(2).filter((a) => !a.startsWith("-"));
for (const id of pedidas.length ? pedidas : Object.keys(REGIONES)) {
  if (!REGIONES[id]) {
    console.error(`No hay región «${id}». Hay: ${Object.keys(REGIONES).join(", ")}`);
    process.exit(1);
  }
  await hornear(id);
}

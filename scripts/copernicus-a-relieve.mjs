/**
 * El relieve de verdad: de Copernicus GLO-30 al escenario.
 *
 * Hasta ahora el terreno era ruido fractal, y eso costaba caro: el escenario de
 * Asunción salía con el treinta y ocho por ciento bajo el agua, Tenerife
 * necesitaba una elipse dibujada a mano para tener mar, y la semilla del
 * relieve había que elegirla probando mil cuatrocientas cuarenta combinaciones
 * a ver cuál dejaba el aeropuerto a su cota. Con el relieve real nada de eso
 * existe: el terreno **es** el que hay.
 *
 * ── La licencia, que es la razón de elegir esta fuente ───────────────────
 *
 * Copernicus DEM GLO-30 se puede usar comercialmente, gratis, con atribución
 * obligatoria y literal. Ver `docs/adr/0005-que-se-puede-comprar.md`. La
 * atribución va en los créditos del juego y **no se puede quitar ni resumir**.
 *
 * ── Cómo, y por qué sin dependencias ─────────────────────────────────────
 *
 * Los ficheros son GeoTIFF en la nube —COG— servidos por AWS sin registro. Un
 * COG está partido en teselas internas, así que con peticiones por rango de
 * bytes **se baja solo el trozo que hace falta**: para un escenario de catorce
 * kilómetros, dos o tres teselas de las dieciséis que tiene el grado.
 *
 * Leerlos son unas ciento cincuenta líneas: cabecera TIFF, tabla de teselas,
 * `inflate` —que Node ya trae— y deshacer el predictor. Se hace aquí y no con
 * una librería por lo mismo que el codificador PNG de al lado: este repositorio
 * no arrastra una cadena de paquetes de imagen que auditar. Ver AGENTS.md,
 * regla 5.
 *
 * Uso:
 *   npx tsx scripts/copernicus-a-relieve.mjs pettirossi
 *   npx tsx scripts/copernicus-a-relieve.mjs tenerife-norte
 */

import { inflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SCENARIOS } from '../src/world/scenarios.ts';

const BASE = 'https://copernicus-dem-30m.s3.amazonaws.com';
const SALIDA = 'data/terrain';

/** Radio terrestre medio, m. El mismo que usa el extractor de aeródromos. */
const R = 6371008;

// ── Descarga por rangos ───────────────────────────────────────────────────

/** Un trozo de un fichero remoto, por rango de bytes. */
async function trozo(url, desde, hasta) {
  const res = await fetch(url, {
    headers: {
      Range: `bytes=${desde}-${hasta}`,
      'User-Agent': 'oga-veve/0.1 (+https://github.com/OksigeniaSL/oga-veve)',
    },
  });
  if (!res.ok && res.status !== 206) throw new Error(`${url} respondió ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** El nombre de la tesela de un grado, como los nombra Copernicus. */
function nombreDeTesela(lat, lon) {
  const ns = lat < 0 ? 'S' : 'N';
  const ew = lon < 0 ? 'W' : 'E';
  const la = String(Math.abs(Math.floor(lat))).padStart(2, '0');
  const lo = String(Math.abs(Math.floor(lon))).padStart(3, '0');
  return `Copernicus_DSM_COG_10_${ns}${la}_00_${ew}${lo}_00_DEM`;
}

// ── El lector de GeoTIFF ──────────────────────────────────────────────────

/**
 * Lee la cabecera de un COG y devuelve lo que hace falta para pedir teselas.
 *
 * Se leen los primeros sesenta y cuatro kilobytes, que es de sobra: en estos
 * ficheros la cabecera y las tablas de teselas caben en los primeros cientos
 * de bytes.
 */
function leerCabecera(b) {
  if (b.toString('ascii', 0, 2) !== 'II' || b.readUInt16LE(2) !== 42) {
    throw new Error('no es un TIFF little-endian clásico');
  }
  const u16 = (o) => b.readUInt16LE(o);
  const u32 = (o) => b.readUInt32LE(o);

  const ifd = u32(4);
  const n = u16(ifd);
  const etiquetas = {};
  for (let i = 0; i < n; i++) {
    const o = ifd + 2 + i * 12;
    const tag = u16(o);
    const tipo = u16(o + 2);
    const cuenta = u32(o + 4);
    const tam = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 11: 4, 12: 8 }[tipo] ?? 1;
    const enLinea = cuenta * tam <= 4;
    const p = enLinea ? o + 8 : u32(o + 8);
    const leer = (k) =>
      tipo === 3 ? u16(p + k * 2) : tipo === 12 ? b.readDoubleLE(p + k * 8) : u32(p + k * 4);
    etiquetas[tag] = { cuenta, valores: Array.from({ length: cuenta }, (_, k) => leer(k)) };
  }

  const uno = (tag) => etiquetas[tag]?.valores[0];
  const cab = {
    ancho: uno(256),
    alto: uno(257),
    bits: uno(258),
    compresion: uno(259),
    anchoTesela: uno(322),
    altoTesela: uno(323),
    offsets: etiquetas[324]?.valores ?? [],
    bytes: etiquetas[325]?.valores ?? [],
    predictor: uno(317) ?? 1,
    formato: uno(339) ?? 1,
    escala: etiquetas[33550]?.valores ?? [],
    atadura: etiquetas[33922]?.valores ?? [],
  };

  if (cab.compresion !== 8 && cab.compresion !== 32946) {
    throw new Error(`compresión ${cab.compresion} no soportada; se espera Deflate`);
  }
  if (cab.bits !== 32 || cab.formato !== 3) {
    throw new Error(`se esperaban muestras de 32 bits en coma flotante, hay ${cab.bits}/${cab.formato}`);
  }
  return cab;
}

/**
 * Deshace el predictor 3, el de coma flotante.
 *
 * No es un delta normal. TIFF guarda los bytes **por planos** —primero el byte
 * más significativo de todas las muestras, luego el siguiente— y encima los
 * pone en diferencias. Así comprime mucho mejor, porque el byte alto de un
 * terreno cambia poquísimo de un píxel al de al lado.
 *
 * Se deshace en dos pasos y en este orden: primero se suman las diferencias
 * byte a byte, y después se vuelven a entrelazar los planos.
 */
function deshacerPredictor(fila, muestras) {
  for (let i = 1; i < fila.length; i++) fila[i] = (fila[i] + fila[i - 1]) & 0xff;

  const copia = Buffer.from(fila);
  for (let m = 0; m < muestras; m++) {
    for (let plano = 0; plano < 4; plano++) {
      // Little-endian: el plano 0 es el byte más significativo, que va al
      // final de cada muestra.
      fila[4 * m + (3 - plano)] = copia[plano * muestras + m];
    }
  }
}

/** Baja y descomprime una tesela interna del COG. */
async function leerTesela(url, cab, ct, ft) {
  const porFila = Math.ceil(cab.ancho / cab.anchoTesela);
  const indice = ft * porFila + ct;
  const off = cab.offsets[indice];
  const len = cab.bytes[indice];
  if (off === undefined || !len) return null;

  const crudo = inflateSync(await trozo(url, off, off + len - 1));
  const bytesFila = cab.anchoTesela * 4;
  if (cab.predictor === 3) {
    for (let f = 0; f < cab.altoTesela; f++) {
      deshacerPredictor(crudo.subarray(f * bytesFila, (f + 1) * bytesFila), cab.anchoTesela);
    }
  }
  return new Float32Array(crudo.buffer, crudo.byteOffset, cab.anchoTesela * cab.altoTesela);
}

// ── El muestreo ───────────────────────────────────────────────────────────

/**
 * Un grado de terreno, con las teselas que se vayan necesitando.
 *
 * Las teselas se piden **cuando hacen falta y una sola vez**. Un escenario de
 * catorce kilómetros toca dos o tres de las dieciséis que tiene el grado, y
 * bajarlas todas serían cuarenta megas para usar cinco.
 */
class Grado {
  constructor(url, cab) {
    this.url = url;
    this.cab = cab;
    this.teselas = new Map();
    // Esquina noroeste del fichero, en grados.
    this.lon0 = cab.atadura[3];
    this.lat0 = cab.atadura[4];
    this.paso = cab.escala[0];
  }

  static async abrir(lat, lon) {
    const nombre = nombreDeTesela(lat, lon);
    const url = `${BASE}/${nombre}/${nombre}.tif`;
    const cab = leerCabecera(await trozo(url, 0, 65535));
    return new Grado(url, cab);
  }

  /** La cota en un punto, con interpolación bilineal. */
  async cota(lat, lon) {
    const { cab } = this;
    // Píxel en coordenadas de fichero. La fila 0 es el norte.
    const px = (lon - this.lon0) / this.paso - 0.5;
    const py = (this.lat0 - lat) / this.paso - 0.5;
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const fx = px - x0;
    const fy = py - y0;

    const v = await Promise.all([
      this.muestra(x0, y0),
      this.muestra(x0 + 1, y0),
      this.muestra(x0, y0 + 1),
      this.muestra(x0 + 1, y0 + 1),
    ]);
    const a = v[0] * (1 - fx) + v[1] * fx;
    const b = v[2] * (1 - fx) + v[3] * fx;
    return a * (1 - fy) + b * fy;
  }

  async muestra(x, y) {
    const { cab } = this;
    const cx = Math.max(0, Math.min(cab.ancho - 1, x));
    const cy = Math.max(0, Math.min(cab.alto - 1, y));
    const ct = Math.floor(cx / cab.anchoTesela);
    const ft = Math.floor(cy / cab.altoTesela);
    const clave = `${ct},${ft}`;
    if (!this.teselas.has(clave)) {
      this.teselas.set(clave, await leerTesela(this.url, cab, ct, ft));
    }
    const t = this.teselas.get(clave);
    if (!t) return 0;
    const dx = cx - ct * cab.anchoTesela;
    const dy = cy - ft * cab.altoTesela;
    const valor = t[dy * cab.anchoTesela + dx];
    // Copernicus marca «sin dato» con un número enorme y negativo.
    return Number.isFinite(valor) && valor > -1000 ? valor : 0;
  }
}

// ── El programa ───────────────────────────────────────────────────────────

const id = process.argv[2];
const esc = SCENARIOS.find((s) => s.id === id);
if (!esc) {
  console.error(`Uso: npx tsx scripts/copernicus-a-relieve.mjs <escenario>`);
  console.error(`Escenarios: ${SCENARIOS.map((s) => s.id).join(', ')}`);
  process.exit(1);
}
if (!esc.aerodrome) {
  console.error(
    `«${id}» no tiene aeródromo real, así que no tiene sitio en el mundo.\n` +
      `El relieve real solo vale para escenarios con coordenadas.`,
  );
  process.exit(1);
}

/*
 * **El anillo lejano**, con `--lejos`.
 *
 * El mapa normal de Tenerife mide dieciocho kilómetros de lado, o sea que llega
 * a nueve de la pista. El Teide está a treinta y siete y medio: sencillamente
 * no cabía, y lo que se veía al fondo —y se confundía con él— era la Cumbre de
 * Tigaiga, mil seiscientos setenta y un metros a once kilómetros y medio.
 *
 * Ensanchar el mapa fino no sirve: con las mismas muestras repartidas en cien
 * kilómetros, cada una cubre doscientos cuarenta metros y el aeropuerto se
 * queda sin relieve alrededor. Así que son dos mapas. Uno fino y pequeño donde
 * se vuela, y uno basto y enorme para el horizonte, con un agujero en medio.
 * Es lo que hace cualquier motor de terreno, y aquí sale gratis: el mismo
 * número de muestras, el mismo peso de fichero, otra escala.
 */
const LEJOS = process.argv.includes('--lejos');
const VECES = 6;

const { lat: lat0, lon: lon0 } = esc.aerodrome.origin;
const res = esc.segments + 1;
const tamano = LEJOS ? esc.size * VECES : esc.size;
const sufijo = LEJOS ? '-lejos' : '';
const paso = tamano / esc.segments;
const mitad = tamano / 2;

// La inversa de la proyección del extractor de aeródromos, para que el relieve
// y el asfalto caigan en el mismo sitio. Si estas dos cuentas se separan, el
// aeropuerto queda flotando o enterrado.
const k = Math.cos((lat0 * Math.PI) / 180);
const aLatLon = (x, y) => [
  lat0 + (y * 180) / (R * Math.PI),
  lon0 + (x * 180) / (R * Math.PI * k),
];

console.log(`${esc.id} · ${esc.aerodrome.name}`);
console.log(`  centro ${lat0.toFixed(5)}, ${lon0.toFixed(5)} · ${tamano / 1000} km · ${res}×${res} muestras · ${(paso).toFixed(0)} m por muestra`);

// Qué grados hacen falta.
const esquinas = [
  aLatLon(-mitad, -mitad),
  aLatLon(mitad, -mitad),
  aLatLon(-mitad, mitad),
  aLatLon(mitad, mitad),
];
const grados = new Map();
for (const [la, lo] of esquinas) {
  const clave = `${Math.floor(la)},${Math.floor(lo)}`;
  if (!grados.has(clave)) grados.set(clave, [Math.floor(la), Math.floor(lo)]);
}
console.log(`  teselas de un grado necesarias: ${grados.size}`);

const abiertos = new Map();
for (const [clave, [la, lo]] of grados) {
  process.stdout.write(`  abriendo ${nombreDeTesela(la, lo)}… `);
  abiertos.set(clave, await Grado.abrir(la + 0.5, lo + 0.5));
  console.log('ok');
}

const alturas = new Int16Array(res * res);
let min = Infinity;
let max = -Infinity;
for (let fila = 0; fila < res; fila++) {
  const z = -mitad + fila * paso;
  for (let col = 0; col < res; col++) {
    const x = -mitad + col * paso;
    // El mundo tiene el norte en la Z negativa; el fichero, la Y al norte.
    const [la, lo] = aLatLon(x, -z);
    const g = abiertos.get(`${Math.floor(la)},${Math.floor(lo)}`) ?? [...abiertos.values()][0];
    const h = await g.cota(la, lo);
    const v = Math.round(h);
    alturas[fila * res + col] = v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (fila % 40 === 0) process.stdout.write(`\r  muestreando… ${Math.round((fila / res) * 100)} %`);
}
console.log(`\r  muestreando… 100 %          `);

mkdirSync(SALIDA, { recursive: true });
writeFileSync(`${SALIDA}/${esc.id}${sufijo}.bin`, Buffer.from(alturas.buffer));
writeFileSync(
  `${SALIDA}/${esc.id}${sufijo}.json`,
  `${JSON.stringify(
    {
      id: `${esc.id}${sufijo}`,
      fuente: 'Copernicus DEM GLO-30',
      atribucion:
        '© DLR e.V. 2010-2014 y © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA; all rights reserved',
      origen: { lat: lat0, lon: lon0 },
      tamanoM: tamano,
      resolucion: res,
      minM: min,
      maxM: max,
    },
    null,
    2,
  )}\n`,
);

const kb = (alturas.byteLength / 1024).toFixed(0);
console.log(`  cotas de ${min} a ${max} m · ${kb} KB → ${SALIDA}/${esc.id}${sufijo}.bin`);

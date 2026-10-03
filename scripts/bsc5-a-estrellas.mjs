#!/usr/bin/env node
/**
 * Las estrellas del cielo de noche: el Yale Bright Star Catalogue →
 * `data/cielo/estrellas.json`.
 *
 *     node scripts/bsc5-a-estrellas.mjs [fichero.tdat.gz]
 *
 * Sin argumento lo baja de la HEASARC; con él, lee ese fichero.
 *
 * ## Por qué este catálogo
 *
 * El cielo era un sorteo de mil doscientos puntos con semilla fija: siempre
 * el mismo, y ninguno en su sitio. Para enseñar a orientarse con la Cruz del
 * Sur o con la Polar hace falta el cielo de verdad, y el cielo de verdad a
 * simple vista es justo lo que recoge el **Bright Star Catalogue** de Yale:
 * las 9110 estrellas hasta la magnitud 6,5, que es lo que ve un ojo en una
 * noche oscura.
 *
 * Se toma la tabla **BSC5P de la HEASARC**, el archivo de la NASA, y no otra
 * copia: es la que la NASA publica en catalog.data.gov como obra del Gobierno
 * de EE. UU. —licencia `usa.gov/government-works`, dominio público—, y así la
 * licencia se puede comprobar en una página oficial. La alternativa obvia, el
 * HYG, va con CC BY-SA, y el *share-alike* se contagia a lo que lo usa. Ver
 * `CREDITOS.md`.
 *
 * ## Qué se guarda
 *
 * Hasta la magnitud 6,0: unas cinco mil, el límite de un cielo de campo. Las
 * de 6,0 a 6,5 son tres mil más que en una pantalla no se distinguen de una
 * mota, y doblarían el fichero.
 *
 * Cuatro enteros por estrella, en una lista plana —ascensión recta y
 * declinación J2000 en centésimas de grado, la magnitud en centésimas y el
 * color B−V en centésimas— que es lo más corto que se puede escribir en JSON
 * sin perder nada que se vea: una centésima de grado son treinta y seis
 * segundos de arco, la décima parte de un píxel.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const FUENTE =
  "https://heasarc.gsfc.nasa.gov/FTP/heasarc/dbase/tdat_files/heasarc_bsc5p.tdat.gz";
const HASTA = 6.0;
/** B−V que falta en el catálogo: unas pocas, y salen blancas. */
const SIN_COLOR = 999;

const comprimido = process.argv[2]
  ? readFileSync(process.argv[2])
  : Buffer.from(await (await fetch(FUENTE)).arrayBuffer());
const texto = gunzipSync(comprimido).toString("latin1");

// El orden de los campos lo dice la propia cabecera: no se supone.
const formato = /^line\[1\] = (.+)$/m.exec(texto);
if (!formato) throw new Error("la tabla no trae su línea de formato");
const campos = formato[1].trim().split(/\s+/);
const col = (nombre) => {
  const i = campos.indexOf(nombre);
  if (i < 0) throw new Error(`la tabla no trae el campo ${nombre}`);
  return i;
};
const [RA, DEC, VMAG, BV, HR] = ["ra", "dec", "vmag", "bv_color", "hr"].map(col);

const datos = texto.slice(texto.indexOf("<DATA>") + 6, texto.indexOf("<END>"));
const filas = [];
for (const linea of datos.split("\n")) {
  if (!linea.trim()) continue;
  const f = linea.split("|");
  const v = Number.parseFloat(f[VMAG]);
  const ra = Number.parseFloat(f[RA]);
  const dec = Number.parseFloat(f[DEC]);
  // Las catorce entradas sin magnitud son novas y objetos que no son
  // estrellas; el catálogo las conserva para no renumerar.
  if (!Number.isFinite(v) || !Number.isFinite(ra) || !Number.isFinite(dec))
    continue;
  if (v > HASTA) continue;
  const bv = Number.parseFloat(f[BV]);
  filas.push({
    hr: Number(f[HR]),
    ra: Math.round(ra * 100) % 36000,
    dec: Math.round(dec * 100),
    v: Math.round(v * 100),
    bv: Number.isFinite(bv) ? Math.round(bv * 100) : SIN_COLOR,
  });
}
// De la más brillante a la más débil: quien quiera menos, corta por delante.
filas.sort((a, b) => a.v - b.v || a.hr - b.hr);

const salida = {
  fuente:
    "Yale Bright Star Catalogue, 5.ª edición revisada (Hoffleit y Warren, 1991), tabla BSC5P de la HEASARC, NASA",
  licencia:
    "Dominio público: obra del Gobierno de EE. UU. (https://www.usa.gov/government-works), según su ficha en catalog.data.gov/dataset/bright-star-catalog",
  de: FUENTE,
  epoca: "J2000",
  hasta: HASTA,
  campos: [
    "ascensión recta J2000, centésimas de grado",
    "declinación J2000, centésimas de grado",
    "magnitud V, centésimas",
    `color B−V, centésimas (${SIN_COLOR}: sin dato)`,
  ],
  estrellas: filas.flatMap((s) => [s.ra, s.dec, s.v, s.bv]),
};

mkdirSync("data/cielo", { recursive: true });
writeFileSync("data/cielo/estrellas.json", JSON.stringify(salida) + "\n");
console.log(
  `${filas.length} estrellas hasta la magnitud ${HASTA} → data/cielo/estrellas.json`,
);

#!/usr/bin/env node
/**
 * Convierte una tesela NASADEM/SRTM (.hgt) en un mapa de altura PNG de 16
 * bits que el juego puede cargar como escenario.
 *
 * Sin dependencias a propósito. Un codificador PNG en escala de grises son
 * sesenta líneas usando el zlib que ya trae Node, y a cambio este repositorio
 * no arrastra una cadena de paquetes de imagen que auditar y actualizar. Ver
 * AGENTS.md, regla 5.
 *
 * Los datos son de dominio público (NASA / LP DAAC), sin restricciones de
 * uso, venta ni redistribución. Ver CREDITOS.md y
 * docs/adr/0003-terreno-nasadem.md.
 *
 * Descarga de teselas:
 *   https://search.earthdata.nasa.gov  (colección NASADEM_HGT v001)
 *   https://portal.opentopography.org   (SRTM GL1, sin registro)
 *
 * Uso:
 *   node scripts/hgt-a-heightmap.mjs datos/dem/S26W057.hgt
 *   node scripts/hgt-a-heightmap.mjs datos/dem/S26W057.hgt --size 1024
 *
 * Produce, junto al PNG, un .json con la cota mínima y máxima: el PNG solo
 * guarda 0..65535, así que sin esos dos números no se puede volver a metros.
 */

import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

/** Valor que SRTM usa para "aquí no hay dato". */
const VOID = -32768;

function main() {
  const args = process.argv.slice(2);
  const source = args.find((a) => !a.startsWith('--'));
  if (!source) {
    console.error('Uso: node scripts/hgt-a-heightmap.mjs <fichero.hgt> [--size N] [--out ruta.png]');
    process.exit(1);
  }

  const targetSize = readNumberFlag(args, '--size') ?? 1025;
  const output = readStringFlag(args, '--out') ?? defaultOutput(source);

  const raw = readFileSync(source);
  const side = Math.round(Math.sqrt(raw.length / 2));
  if (side * side * 2 !== raw.length) {
    console.error(`El fichero no es una tesela cuadrada de enteros de 16 bits: ${raw.length} bytes`);
    process.exit(1);
  }
  console.log(`Tesela ${basename(source)}: ${side} × ${side} muestras`);

  const elevations = decodeHgt(raw, side);
  const resampled = resample(elevations, side, targetSize);
  const { min, max } = extent(resampled);
  console.log(`Cotas: ${min} m a ${max} m`);

  const png = encodeGrayscale16(normalise(resampled, min, max), targetSize, targetSize);
  writeFileSync(output, png);

  const sidecar = output.replace(/\.png$/, '.json');
  writeFileSync(
    sidecar,
    JSON.stringify(
      {
        source: basename(source),
        size: targetSize,
        minElevation: min,
        maxElevation: max,
        note: 'Altura en metros = min + (valor / 65535) * (max - min)',
        attribution: 'NASADEM / SRTM — NASA JPL, dominio público',
        checksum: createHash('sha256').update(png).digest('hex').slice(0, 16),
      },
      null,
      2,
    ) + '\n',
  );

  console.log(`Escrito ${output}`);
  console.log(`Escrito ${sidecar}`);
}

/**
 * Lee la rejilla de enteros de 16 bits con signo, big-endian.
 *
 * Los huecos se rellenan con el vecino anterior. Es tosco, pero en SRTM los
 * huecos son pequeños y aislados salvo en zonas de agua, y para un juego
 * cualquier relleno razonable vale.
 */
function decodeHgt(raw, side) {
  const values = new Int16Array(side * side);
  let previous = 0;
  for (let i = 0; i < values.length; i++) {
    const value = raw.readInt16BE(i * 2);
    if (value === VOID) {
      values[i] = previous;
    } else {
      values[i] = value;
      previous = value;
    }
  }
  return values;
}

/** Remuestreo bilineal al tamaño de destino. */
function resample(values, side, size) {
  const out = new Float32Array(size * size);
  const scale = (side - 1) / (size - 1);

  for (let row = 0; row < size; row++) {
    const sy = row * scale;
    const y0 = Math.min(side - 1, Math.floor(sy));
    const y1 = Math.min(side - 1, y0 + 1);
    const ty = sy - y0;

    for (let col = 0; col < size; col++) {
      const sx = col * scale;
      const x0 = Math.min(side - 1, Math.floor(sx));
      const x1 = Math.min(side - 1, x0 + 1);
      const tx = sx - x0;

      const a = values[y0 * side + x0];
      const b = values[y0 * side + x1];
      const c = values[y1 * side + x0];
      const d = values[y1 * side + x1];

      out[row * size + col] = lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
    }
  }
  return out;
}

function extent(values) {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min: Math.floor(min), max: Math.ceil(max) };
}

function normalise(values, min, max) {
  const range = Math.max(1, max - min);
  const out = new Uint16Array(values.length);
  for (let i = 0; i < values.length; i++) {
    out[i] = Math.round(((values[i] - min) / range) * 65535);
  }
  return out;
}

// ── Codificador PNG mínimo (escala de grises, 16 bits) ──────────────────

function encodeGrayscale16(samples, width, height) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(16, 8); // profundidad de bits
  header.writeUInt8(0, 9); // tipo de color: escala de grises
  header.writeUInt8(0, 10); // compresión
  header.writeUInt8(0, 11); // filtrado
  header.writeUInt8(0, 12); // sin entrelazado

  // Cada línea lleva delante su byte de filtro. Usamos 0 (sin filtro): el
  // deflate hace casi todo el trabajo y así el codificador cabe de un vistazo.
  const stride = width * 2;
  const rows = Buffer.alloc(height * (stride + 1));
  for (let row = 0; row < height; row++) {
    const offset = row * (stride + 1);
    rows[offset] = 0;
    for (let col = 0; col < width; col++) {
      rows.writeUInt16BE(samples[row * width + col], offset + 1 + col * 2);
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// ── Utilidades ──────────────────────────────────────────────────────────

function defaultOutput(source) {
  const name = basename(source).replace(/\.hgt$/i, '');
  return join(dirname(source), '..', '..', 'public', 'assets', 'terreno', `${name}.png`);
}

function readNumberFlag(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = Number(args[index + 1]);
  return Number.isFinite(value) ? value : undefined;
}

function readStringFlag(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// La llamada va al final: `CRC_TABLE` se inicializa al evaluarse el módulo y
// arrancar antes dejaría esa constante en zona muerta temporal.
main();

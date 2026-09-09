#!/usr/bin/env node
/**
 * De las tomas del estudio al pack que toca el juego.
 *
 *     node scripts/hacer-pack-de-voz.mjs crudo/instructor instructor
 *
 * Coge los ficheros que devuelve el estudio —lo que salga, en la calidad más
 * alta que dé—, les aplica la cadena documentada y escribe en
 * `data/voces/<voz>/` los dos horneados y el manifiesto.
 *
 * ## Por qué el proceso va aquí y no en el estudio
 *
 * Para que **la frase veintisiete suene igual dentro de un año**. Si el
 * tratamiento vive en la cabeza de quien mezcló la primera tanda, la segunda
 * tanda no pega con la primera y se nota en cuanto suenan seguidas: es el
 * fallo clásico de los packs de voz. Aquí es un comando, y el comando está
 * escrito. Ver #65 y `docs/voces/LEEME.md`.
 *
 * ## Los dos horneados
 *
 * Opus a 24 kbps, que es la mitad de peso que cualquier otra cosa y suena bien
 * en voz; y **gemelo en AAC porque Safari no decodifica Opus de forma
 * fiable**. Es el mismo audio dos veces, no dos grabaciones. El juego elige
 * uno según lo que diga el navegador. Ver `src/audio/banco-de-voz.ts`.
 *
 * ## Y las recetas
 *
 * El manifiesto lleva qué piezas monta cada frase, como un GPS. Se leen de
 * `recetas.json` al lado de las tomas si existe; si no, cada fichero es su
 * propia frase de una pieza, que es lo que vale para las voces de cabina y de
 * torre —esas no se trocean, son cantos enteros—.
 *
 * Cero dependencias de Node. Lo único que hace falta es `ffmpeg` en el PATH,
 * que es la misma herramienta que ya usa el resto de esta carpeta.
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join } from "node:path";

const CRUDO = process.argv[2];
const VOZ = process.argv[3] ?? "instructor";
const SALIDA = process.argv[4] ?? join("data/voces", VOZ);

if (!CRUDO) {
  console.error(
    "Uso: node scripts/hacer-pack-de-voz.mjs <carpeta de tomas> [voz] [salida]",
  );
  process.exit(1);
}

/**
 * Limpiar, igualar y comprimir. La misma cadena para todas las voces.
 *
 * Quita el silencio de los dos extremos —que es lo que hace que las piezas
 * peguen unas con otras sin huecos, y en un pack troceado eso **es** el
 * producto—, e iguala el volumen entre frases, que es lo que hace que unas no
 * peguen un salto sobre otras.
 */
const LIMPIAR = [
  "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB",
  "areverse",
  "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB",
  "areverse",
  "loudnorm=I=-16:TP=-1.5:LRA=11",
].join(",");

/**
 * Y el filtro de radio, para la torre y el otro avión.
 *
 * **Lo que hace creíble una radio no es la voz, es el filtro**: banda estrecha
 * —una radio de aviación va de 300 a 3400 Hz y no da más—, saturación blanda y
 * compresión fuerte, que es lo que hace que todo llegue al mismo volumen. Por
 * eso se graba limpio y esto se pone después.
 */
const RADIO = [
  "highpass=f=300",
  "lowpass=f=3400",
  "acompressor=threshold=-18dB:ratio=8:attack=5:release=60",
  "aeval='tanh(1.6*val(0))/1.6':c=same",
  "volume=2dB",
].join(",");

/** Qué voces van por radio. Las otras dos se oyen en la cabina, sin filtro. */
const POR_RADIO = new Set(["torre", "otro"]);

const ffmpeg = (args) =>
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);

/** Cuánto dura un fichero, en milisegundos. */
function duracion(ruta) {
  const salida = execFileSync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    ruta,
  ]).toString();
  return Math.round(Number(salida.trim()) * 1000);
}

if (!existsSync(CRUDO) || !statSync(CRUDO).isDirectory()) {
  console.error(`No encuentro la carpeta de tomas: ${CRUDO}`);
  process.exit(1);
}

mkdirSync(SALIDA, { recursive: true });

const filtro = POR_RADIO.has(VOZ) ? `${LIMPIAR},${RADIO}` : LIMPIAR;
const tomas = readdirSync(CRUDO)
  .filter((f) => /\.(wav|flac|aiff?|mp3|m4a|ogg)$/i.test(f))
  .sort();

if (tomas.length === 0) {
  console.error(`No hay ninguna toma en ${CRUDO}`);
  process.exit(1);
}

const piezas = {};
let bytes = 0;
for (const toma of tomas) {
  const nombre = basename(toma, extname(toma));
  const entrada = join(CRUDO, toma);
  const opus = join(SALIDA, `${nombre}.ogg`);
  const aac = join(SALIDA, `${nombre}.m4a`);

  // Opus, que es el que se baja en casi todas partes.
  ffmpeg([
    "-i",
    entrada,
    "-af",
    filtro,
    "-ac",
    "1",
    "-ar",
    "48000",
    "-c:a",
    "libopus",
    "-b:a",
    "24k",
    opus,
  ]);
  /*
   * Y el gemelo en AAC, **desde la misma entrada y con el mismo filtro**.
   *
   * Nunca desde el Opus ya hecho: encadenar dos códecs con pérdida sobre una
   * voz suena a teléfono roto, y el gemelo existe precisamente para que a
   * quien le toque Safari no le toque una versión peor.
   */
  ffmpeg([
    "-i",
    entrada,
    "-af",
    filtro,
    "-ac",
    "1",
    "-ar",
    "48000",
    "-c:a",
    "aac",
    "-b:a",
    "48k",
    aac,
  ]);

  piezas[nombre] = { ms: duracion(opus) };
  bytes += statSync(opus).size + statSync(aac).size;
}

/*
 * Las recetas: qué piezas monta cada frase.
 *
 * Si no hay `recetas.json`, cada pieza es su propia frase. Vale tal cual para
 * la cabina y para la torre, que no se trocean: `cabina.oneHundred` es un
 * canto entero y no se monta con nada.
 */
const dondeRecetas = join(CRUDO, "recetas.json");
const recetas = existsSync(dondeRecetas)
  ? JSON.parse(readFileSync(dondeRecetas, "utf8"))
  : Object.fromEntries(Object.keys(piezas).map((p) => [p, [p]]));

/** Que ninguna receta nombre una pieza que no se grabó. */
const huecos = [];
for (const [clave, receta] of Object.entries(recetas)) {
  for (const trozo of receta) {
    if (/^\{\w+\}$/.test(trozo)) continue;
    if (!piezas[trozo]) huecos.push(`${clave} → ${trozo}`);
  }
}
if (huecos.length) {
  console.error(
    `\n  Hay recetas que nombran piezas que no existen:\n` +
      huecos.map((h) => `    ${h}`).join("\n") +
      `\n\n  Una frase a medias es peor que ninguna: el juego las descarta\n` +
      `  enteras y las dice con la voz del navegador. Arreglalas o quitalas.\n`,
  );
  process.exit(1);
}

const idioma = VOZ === "cabina" || VOZ === "torre" ? "en" : "es-PY";
const manifiesto = {
  version: 1,
  voz: VOZ,
  idioma,
  piezas,
  recetas,
};
writeFileSync(
  join(SALIDA, "manifiesto.json"),
  JSON.stringify(manifiesto, null, 2) + "\n",
);

const ms = Object.values(piezas).reduce((a, p) => a + p.ms, 0);
console.log(
  `\n  ${VOZ} · ${tomas.length} piezas · ${(ms / 1000).toFixed(1)} s · ` +
    `${(bytes / 1024).toFixed(0)} KB los dos formatos\n` +
    `  ${Object.keys(recetas).length} frases montables\n` +
    `  → ${SALIDA}\n` +
    (POR_RADIO.has(VOZ) ? "  con filtro de radio\n" : "") +
    `\n  El pack no entra en la precarga: lo baja el juego tras el primer\n` +
    `  gesto y lo guarda en su propia caché. Ver scripts/plantilla-sw.js.\n`,
);

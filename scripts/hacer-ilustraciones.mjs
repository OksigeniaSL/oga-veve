#!/usr/bin/env node
/**
 * **Las ilustraciones del juego, de los originales a WebP.**
 *
 * Los originales viven en `crudo/imagenes/`, fuera del repositorio: son más de
 * cien megas de dibujos, casi todos de 2400 × 1792 —ver `.gitignore`—. Lo que
 * entra en el repositorio es lo que sale de aquí, cada una recortada a la
 * proporción de su hueco y reducida al doble de lo que mide en pantalla, sin
 * metadatos:
 *
 * - las de la escena de pasaje, la tarjeta del avión y la cara de Jazlyn, en
 *   `src/assets/ilustraciones/`;
 * - y las de las historias de la ventanilla, una por historia, en
 *   `src/assets/historias/`, desde `crudo/imagenes/historias/`.
 *
 * Qué trozo se coge de cada una, y por qué, está en
 * `src/ui/ilustraciones-recetas.ts`, que es lo mismo que lee el juego. Este
 * guion solo lo ejecuta: así se puede repetir con un original nuevo sin
 * acordarse de nada.
 *
 * ## Con lo que ya hay en la máquina
 *
 * ImageMagick para cortar y reducir, y `cwebp` —de libwebp— para escribir el
 * WebP. Ninguna dependencia de npm para esto: son dos herramientas del sistema
 * que hacen exactamente eso. El retrato se recorta además en redondo, con el
 * fondo transparente, que es como va: dentro de un círculo.
 *
 * Uso: `node scripts/hacer-ilustraciones.mjs [clave …]` — sin claves, todas;
 * con `historias`, las veinticinco de las historias. `OGA_ORIGINALES=carpeta`
 * los lee de otra carpeta: desde una copia de trabajo aparte, la de la copia
 * principal, que es donde están.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  RECETAS,
  RECETAS_DE_LAS_HISTORIAS,
  TAMANO_DEL_HUECO,
} from "../src/ui/ilustraciones-recetas.ts";

const ORIGINALES = process.env.OGA_ORIGINALES ?? "crudo/imagenes";

/** Cada colección, con su carpeta: las claves no se repiten entre las dos. */
const COLECCIONES = [
  { nombre: "ilustraciones", recetas: RECETAS, destino: "src/assets/ilustraciones" },
  { nombre: "historias", recetas: RECETAS_DE_LAS_HISTORIAS, destino: "src/assets/historias" },
];

/**
 * **La calidad de cada hueco**, la de `cwebp`. Medida a ojo sobre los dibujos:
 * por debajo de 78 los degradados del cielo de la escena de pasaje hacen
 * escalones; el retrato es diminuto y con la cara entera en 96 píxeles, así
 * que va más alto.
 *
 * Las de las historias van en 50, y es a propósito: son de lápiz de color, y
 * casi todo lo que pesan es el grano del papel. Medidas las veinticinco a
 * 1280 × 960 —el 19 de octubre de 2026—: en 50 pesan 3,0 MB entre todas, en
 * 60 3,4 y en 75 4,2, y lo que se gana subiendo es grano que a tamaño de
 * pantalla no se ve; las estrellas, la luna y el cielo de las de noche quedan
 * igual. En 40 ya se nota: la luna de Yacyretá se emborrona.
 */
const CALIDAD = { lamina: 78, ventanita: 80, tarjeta: 80, retrato: 90, historia: 50 };

function correr(orden, args) {
  const r = spawnSync(orden, args, { encoding: "utf8" });
  if (r.error) throw new Error(`${orden}: ${r.error.message}. ¿Está instalado?`);
  if (r.status !== 0) throw new Error(`${orden} ${args.join(" ")}\n${r.stderr}`);
}

const coleccionDe = (clave) => COLECCIONES.find((c) => c.recetas[clave]);

const pedidas = process.argv.slice(2);
const todas = !pedidas.length;
const soloHistorias = pedidas.length === 1 && pedidas[0] === "historias";
if (!todas && !soloHistorias)
  for (const c of pedidas) if (!coleccionDe(c)) throw new Error(`No hay receta para «${c}».`);
const trabajo = todas
  ? COLECCIONES.flatMap((col) => Object.keys(col.recetas))
  : soloHistorias
    ? Object.keys(RECETAS_DE_LAS_HISTORIAS)
    : pedidas;

for (const col of COLECCIONES) mkdirSync(col.destino, { recursive: true });
const temporal = mkdtempSync(join(tmpdir(), "ilustraciones-"));
try {
  for (const clave of trabajo) {
    const col = coleccionDe(clave);
    const r = col.recetas[clave];
    const original = join(ORIGINALES, r.original);
    if (!existsSync(original)) throw new Error(`Falta el original ${original}.`);
    const { ancho, alto } = TAMANO_DEL_HUECO[r.hueco];
    const [x, y, w, h] = r.recorte;
    // El recorte ya viene en la proporción del hueco: si no, se deformaría al reducir.
    if (Math.abs(w / h - ancho / alto) > 0.01)
      throw new Error(`${clave}: el recorte ${w} × ${h} no es de la proporción de su hueco, ${ancho} × ${alto}.`);
    const png = join(temporal, `${clave}.png`);
    const redondo =
      r.hueco === "retrato"
        ? [
            "(",
            "+clone",
            "-alpha",
            "off",
            "-fill",
            "black",
            "-colorize",
            "100",
            "-fill",
            "white",
            "-draw",
            `circle ${(ancho - 1) / 2},${(alto - 1) / 2} ${(ancho - 1) / 2},0.5`,
            ")",
            "-alpha",
            "off",
            "-compose",
            "CopyOpacity",
            "-composite",
          ]
        : [];
    correr("convert", [
      original,
      "-crop",
      `${w}x${h}+${x}+${y}`,
      "+repage",
      "-filter",
      "Lanczos",
      "-resize",
      `${ancho}x${alto}!`,
      ...redondo,
      "-strip",
      `PNG32:${png}`,
    ]);
    const webp = join(col.destino, `${clave}.webp`);
    correr("cwebp", [
      "-quiet",
      "-q",
      String(CALIDAD[r.hueco]),
      "-m",
      "6",
      "-sharp_yuv",
      "-metadata",
      "none",
      ...(r.hueco === "retrato" ? ["-exact", "-alpha_q", "100"] : []),
      png,
      "-o",
      webp,
    ]);
    console.log(`${clave.padEnd(24)} ${String(Math.round(statSync(webp).size / 1024)).padStart(4)} KB  ← ${r.original}`);
  }
} finally {
  rmSync(temporal, { recursive: true, force: true });
}

for (const col of COLECCIONES) {
  // Lo que ya no tiene receta, fuera: la carpeta tiene que ser lo que dicen las recetas.
  if (todas || (soloHistorias && col.nombre === "historias"))
    for (const f of readdirSync(col.destino))
      if (!col.recetas[f.replace(/\.webp$/, "")]) {
        rmSync(join(col.destino, f));
        console.log(`fuera: ${col.destino}/${f}`);
      }
  const ficheros = readdirSync(col.destino);
  const total = ficheros.reduce((s, f) => s + statSync(join(col.destino, f)).size, 0);
  console.log(`\n${col.destino}: ${ficheros.length} ficheros, ${Math.round(total / 1024)} KB entre todos.`);
}

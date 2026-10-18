#!/usr/bin/env node
/**
 * **Las ilustraciones del juego, de los originales a WebP.**
 *
 * Los originales viven en `crudo/imagenes/`, fuera del repositorio: son unos
 * cuarenta y cinco megas de dibujos de 2400 × 1792 —ver `.gitignore`—. Lo que
 * entra en el repositorio es lo que sale de aquí, en
 * `src/assets/ilustraciones/`: cada una recortada a la proporción de su hueco
 * y reducida al doble de lo que mide en pantalla, sin metadatos.
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
 * Uso: `node scripts/hacer-ilustraciones.mjs [clave …]` — sin claves, todas.
 * `OGA_ORIGINALES=carpeta` los lee de otra carpeta: desde una copia de trabajo
 * aparte, la de la copia principal, que es donde están.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RECETAS, TAMANO_DEL_HUECO } from "../src/ui/ilustraciones-recetas.ts";

const ORIGINALES = process.env.OGA_ORIGINALES ?? "crudo/imagenes";
const DESTINO = "src/assets/ilustraciones";

/**
 * **La calidad de cada hueco**, la de `cwebp`. Medida a ojo sobre los dibujos:
 * por debajo de 78 los degradados del cielo hacen escalones; el retrato es
 * diminuto y con la cara entera en 96 píxeles, así que va más alto.
 */
const CALIDAD = { ventanita: 80, tarjeta: 80, retrato: 90 };

function correr(orden, args) {
  const r = spawnSync(orden, args, { encoding: "utf8" });
  if (r.error) throw new Error(`${orden}: ${r.error.message}. ¿Está instalado?`);
  if (r.status !== 0) throw new Error(`${orden} ${args.join(" ")}\n${r.stderr}`);
}

const pedidas = process.argv.slice(2);
for (const c of pedidas) if (!RECETAS[c]) throw new Error(`No hay receta para «${c}».`);
const claves = pedidas.length ? pedidas : Object.keys(RECETAS);

mkdirSync(DESTINO, { recursive: true });
const temporal = mkdtempSync(join(tmpdir(), "ilustraciones-"));
try {
  for (const clave of claves) {
    const r = RECETAS[clave];
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
    const webp = join(DESTINO, `${clave}.webp`);
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

// Lo que ya no tiene receta, fuera: la carpeta tiene que ser lo que dicen las recetas.
if (!pedidas.length)
  for (const f of readdirSync(DESTINO))
    if (!RECETAS[f.replace(/\.webp$/, "")]) {
      rmSync(join(DESTINO, f));
      console.log(`fuera: ${f}`);
    }

const total = readdirSync(DESTINO).reduce((s, f) => s + statSync(join(DESTINO, f)).size, 0);
console.log(`\n${readdirSync(DESTINO).length} ilustraciones, ${Math.round(total / 1024)} KB entre todas.`);

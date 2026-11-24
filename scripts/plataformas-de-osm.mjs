#!/usr/bin/env node
/**
 * **Las plataformas de OpenStreetMap que le faltan a la ficha de un aeródromo**,
 * sin volver a extraerlo entero (H81).
 *
 *     node scripts/plataformas-de-osm.mjs LEMD                      # pregunta a Overpass
 *     node scripts/plataformas-de-osm.mjs LEMD --crudo carpeta      # y guarda lo que trae
 *     node scripts/plataformas-de-osm.mjs LEMD --de carpeta         # lo lee de ahí
 *
 * Hasta la H81 el extractor pedía `out tags geom`, que de una relación no trae los
 * miembros, y las plataformas dibujadas como `multipolygon` se perdían sin avisar: en
 * Barajas, seis. Solo añade: ni quita, ni mueve, ni simplifica lo que la ficha ya tiene.
 * Está ya la que tiene todos sus vértices a medio metro de alguno de los de una de la
 * ficha.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { anillos } from "./anillos-de-osm.mjs";
import { overpass } from "./osm-comun.mjs";

const SALIDA = "data/aerodromes";
/** El de `osm-a-aerodromo.mjs`, para que los puntos salgan idénticos a los de la ficha. */
const R = 6371008;
const redondear = (n) => Math.round(n * 10) / 10;
function proyector(lat0, lon0) {
  const k = Math.cos((lat0 * Math.PI) / 180);
  return (lat, lon) => [
    redondear((R * (lon - lon0) * Math.PI * k) / 180),
    redondear((R * (lat - lat0) * Math.PI) / 180),
  ];
}

const consulta = (icao) => `[out:json][timeout:180];
nwr["aeroway"="aerodrome"]["icao"="${icao}"];
map_to_area->.a;
nwr(area.a)["aeroway"="apron"];
out body geom;`;

const args = process.argv.slice(2);
/** El valor de una opción `--nombre valor`, y las posiciones que ocupa. */
const opcion = (nombre) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? { valor: args[i + 1], en: [i, i + 1] } : { valor: null, en: [] };
};
const crudo = opcion("--crudo");
const de = opcion("--de");
const icaos = args.filter((a, i) => !a.startsWith("--") && ![...crudo.en, ...de.en].includes(i));
if (!icaos.length) {
  console.error("Uso: node scripts/plataformas-de-osm.mjs LEMD [--crudo carpeta | --de carpeta]");
  process.exit(1);
}

/** La lista de `aprons` de la ficha, sustituida en su texto y con lo demás tal cual estaba escrito. */
function conLasPlataformas(texto, aprons) {
  const clave = '"aprons": ';
  const abre = texto.indexOf(clave) + clave.length;
  let nivel = 0;
  let cierra = -1;
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === "[") nivel++;
    else if (texto[i] === "]" && --nivel === 0) {
      cierra = i + 1;
      break;
    }
  }
  if (cierra < 0) throw new Error("la lista de aprons no se cierra");
  return texto.slice(0, abre) + JSON.stringify(aprons, null, 2).replace(/\n/g, "\n  ") + texto.slice(cierra);
}

for (const icao of icaos.map((s) => s.toUpperCase())) {
  const destino = join(SALIDA, `${icao.toLowerCase()}.aero.json`);
  const texto = await readFile(destino, "utf8");
  const ficha = JSON.parse(texto);
  const datos = de.valor
    ? JSON.parse(await readFile(join(de.valor, `${icao.toLowerCase()}.json`), "utf8"))
    : await overpass(consulta(icao));
  if (crudo.valor) {
    await mkdir(crudo.valor, { recursive: true });
    await writeFile(join(crudo.valor, `${icao.toLowerCase()}.json`), JSON.stringify(datos));
  }
  const proj = proyector(ficha.origin.lat, ficha.origin.lon);
  const nuevas = [];
  for (const e of datos.elements ?? []) {
    if (e.tags?.aeroway !== "apron" || (e.type !== "way" && e.type !== "relation")) continue;
    // Un `way` sin cerrar no es una superficie: es un trozo del contorno de una relación.
    const g = e.geometry ?? [];
    if (e.type === "way" && (g[0]?.lat !== g.at(-1)?.lat || g[0]?.lon !== g.at(-1)?.lon)) continue;
    for (const polygon of anillos(e, proj)) {
      const ya = [...ficha.aprons, ...nuevas].some((a) =>
        polygon.every((p) => a.polygon.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= 0.5)),
      );
      if (ya) continue;
      nuevas.push({ surface: e.tags.surface ?? null, polygon });
      process.stdout.write(`  + ${icao} ${e.type} ${e.id} ${e.tags.ref ?? ""}: ${polygon.length} vértices\n`);
    }
  }
  process.stdout.write(`→ ${icao}: ${ficha.aprons.length} plataformas en la ficha y ${nuevas.length} que le faltan\n`);
  if (nuevas.length) await writeFile(destino, conLasPlataformas(texto, [...ficha.aprons, ...nuevas]));
}

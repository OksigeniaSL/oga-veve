#!/usr/bin/env node
/**
 * El service worker, escrito a partir de lo que de verdad hay en `dist/`.
 *
 * «La promesa es que cualquier colegio paraguayo pueda usarlo. En bastantes
 * sitios la conexión es mala o va y viene, y ahora mismo sin internet no hay
 * juego.» Esto lo arregla, y de todo el backlog es probablemente lo que más
 * convierte la promesa educativa en algo real.
 *
 * ## Por qué a mano y no con un complemento
 *
 * `vite-plugin-pwa` haría esto y bastante más, y arrastra Workbox: unas
 * cuantas decenas de dependencias para un fichero de ciento y pico líneas que
 * además queremos poder leer entero cuando algo falle sin conexión, que es
 * justo cuando no se puede depurar. El resto de guiones de esta carpeta son
 * de cero dependencias por la misma razón.
 *
 * ## Qué se precarga y qué no
 *
 * **El armazón**: el HTML, el JavaScript, la hoja de estilos, el manifiesto y
 * los iconos. Son unos setecientos kilobytes y son lo que hace que el juego
 * abra sin red.
 *
 * **Lo gordo, no**: el modelo del avión son 2,4 MB, los relieves 3,1 y las
 * ortofotos 4,3. Precargarlos todos serían once megas en la primera visita de
 * alguien con mala conexión —justo a quien esto quiere servir— y la mayoría
 * son de escenarios en los que nunca va a volar. Se guardan **según se usan**:
 * el escenario en el que se voló ayer está disponible hoy sin red, y el resto
 * llega cuando haya conexión.
 *
 * Uso: `node scripts/hacer-sw.mjs [carpeta]` — lo llama `npm run build`.
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = process.argv[2] ?? "dist";

/**
 * Lo que entra en la precarga, por extensión.
 *
 * El código va **entero y sin tope de tamaño**, y eso hay que decirlo porque
 * la primera versión de esto tenía un límite de medio mega «para los iconos
 * gordos» y lo primero que se dejó fuera fueron los dos trozos de JavaScript
 * del juego —542 y 571 KB—. O sea: precargaba el armazón menos el armazón.
 * Sin conexión abría una página en blanco perfectamente cacheada.
 */
const DEL_ARMAZON = /\.(html|js|css|webmanifest|woff2?)$/i;

/**
 * Y los iconos, que son pocos y pequeños y hacen falta para instalarlo.
 *
 * Van por nombre y no por extensión: por extensión entrarían también las
 * ortofotos, que son megas de fotografía aérea de un escenario en el que
 * quizá no se vuele nunca.
 */
const ICONOS = /^(favicon\.svg|icono-[\w-]+\.png)$/i;

/** Un tope de seguridad, no una regla: nada de esto debería acercarse. */
const DEMASIADO_GRANDE = 4 * 1024 * 1024;

function* todos(carpeta) {
  for (const entrada of readdirSync(carpeta, { withFileTypes: true })) {
    const camino = join(carpeta, entrada.name);
    if (entrada.isDirectory()) yield* todos(camino);
    else yield camino;
  }
}

const ficheros = [];
let bytes = 0;
for (const camino of todos(RAIZ)) {
  const nombre = relative(RAIZ, camino).split("\\").join("/");
  if (!DEL_ARMAZON.test(nombre) && !ICONOS.test(nombre)) continue;
  // El propio service worker no se precarga a sí mismo.
  if (nombre === "sw.js") continue;
  const tam = statSync(camino).size;
  if (tam > DEMASIADO_GRANDE) continue;
  ficheros.push("./" + nombre);
  bytes += tam;
}
ficheros.sort();

/*
 * La versión sale del contenido, no de la fecha.
 *
 * Con la fecha, cada compilación estrenaría caché aunque no hubiera cambiado
 * nada y todo el mundo se descargaría el armazón otra vez. Con el contenido,
 * dos compilaciones iguales son la misma versión y nadie descarga nada.
 */
const version = createHash("sha256")
  .update(ficheros.map((f) => f + readFileSync(join(RAIZ, f.slice(2)))).join(""))
  .digest("hex")
  .slice(0, 12);

const plantilla = readFileSync("scripts/plantilla-sw.js", "utf8");
writeFileSync(
  join(RAIZ, "sw.js"),
  plantilla
    .replace("__VERSION__", version)
    .replace("__ARMAZON__", JSON.stringify(ficheros, null, 2)),
);

process.stdout.write(
  `\n  sw.js · versión ${version}\n` +
    `  ${ficheros.length} ficheros de armazón · ${(bytes / 1024).toFixed(0)} KB precargados\n` +
    `  lo demás —modelos, relieves, ortofotos— se guarda según se usa\n\n`,
);

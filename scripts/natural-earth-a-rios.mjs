#!/usr/bin/env node
/**
 * Los ríos grandes del Paraguay: Natural Earth → `src/ui/rios.ts`.
 *
 *     node scripts/natural-earth-a-rios.mjs
 *
 * ## Para qué
 *
 * Para que el plano del vuelo no se acabe donde se acaba el relieve cargado.
 * En Canarias basta con la costa —fuera del relieve, lo que no es isla es
 * mar—, pero en el Paraguay fuera del relieve sigue habiendo tierra, y lo que
 * orienta en esa tierra son los ríos. Fue la primera pregunta que hizo nacer
 * el plano: «estoy buscando el río Paraguay, el que pasa por debajo del puente
 * del Chaco, pero estoy desorientado».
 *
 * ## De dónde
 *
 * Natural Earth, `rivers_lake_centerlines` a 1:10 millones, **dominio
 * público**, igual que las siluetas del hangar (ver
 * `natural-earth-a-siluetas.mjs`). En esa capa el río Paraguay va dentro del
 * trazo que la capa llama «Paraná»: es el mismo sistema, y por eso aquí no se
 * rotulan — se dibujan. Un nombre equivocado en un mapa es peor que ninguno.
 *
 * ## Cuánto
 *
 * Solo lo que cae en un rectángulo algo mayor que el país, y simplificado a
 * medio kilómetro, que a la escala del plano ancho —cientos de kilómetros en
 * cuatrocientos sesenta píxeles— no se distingue del original.
 */

import { writeFileSync } from "node:fs";

const FUENTE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson";

/** El rectángulo del país con su orla: oeste, sur, este, norte. */
const CAJA = [-63, -28.5, -53.5, -19];

/** Los ríos que se dibujan, por su nombre en la capa. */
const RIOS = new Set(["Paraná", "Pilcomayo", "Jejui Guazu", "Bermejo"]);

const R = 6371008;

function simplificar(linea, tolerancia) {
  if (linea.length < 3) return linea;
  const k = Math.cos((linea[0][1] * Math.PI) / 180);
  const m = linea.map(([lon, lat]) => [
    ((lon * Math.PI) / 180) * R * k,
    ((lat * Math.PI) / 180) * R,
  ]);
  const quedan = new Uint8Array(linea.length);
  quedan[0] = quedan[linea.length - 1] = 1;
  const pila = [[0, linea.length - 1]];
  while (pila.length) {
    const [a, b] = pila.pop();
    const [ax, ay] = m[a];
    const [bx, by] = m[b];
    const l = Math.hypot(bx - ax, by - ay) || 1;
    let peor = -1;
    let donde = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - m[i][1]) - (ax - m[i][0]) * (by - ay)) / l;
      if (d > peor) {
        peor = d;
        donde = i;
      }
    }
    if (peor > tolerancia) {
      quedan[donde] = 1;
      pila.push([a, donde], [donde, b]);
    }
  }
  return linea
    .filter((_, i) => quedan[i])
    .map(([lon, lat]) => [Math.round(lon * 1000) / 1000, Math.round(lat * 1000) / 1000]);
}

const dentro = ([lon, lat]) =>
  lon >= CAJA[0] && lon <= CAJA[2] && lat >= CAJA[1] && lat <= CAJA[3];

/** Parte una línea en los trozos que caen dentro de la caja. */
function recortar(linea) {
  const trozos = [];
  let trozo = [];
  for (const p of linea) {
    if (dentro(p)) trozo.push(p);
    else if (trozo.length) {
      if (trozo.length > 1) trozos.push(trozo);
      trozo = [];
    }
  }
  if (trozo.length > 1) trozos.push(trozo);
  return trozos;
}

const res = await fetch(FUENTE);
if (!res.ok) throw new Error(`Natural Earth respondió ${res.status}`);
const datos = await res.json();
const lineas = [];
for (const f of datos.features) {
  if (!RIOS.has(f.properties.name)) continue;
  const g = f.geometry;
  const partes = g.type === "LineString" ? [g.coordinates] : g.coordinates;
  for (const parte of partes)
    for (const trozo of recortar(parte)) lineas.push(simplificar(trozo, 500));
}

const puntos = lineas.reduce((n, l) => n + l.length, 0);
console.log(`  py: ${lineas.length} trazos, ${puntos} puntos`);

const cuerpo = `/**
 * Los ríos grandes del Paraguay, en longitud y latitud.
 *
 * **Generado** por \`scripts/natural-earth-a-rios.mjs\` desde Natural Earth
 * 1:10m, que es de dominio público. No se edita a mano: se regenera.
 */

export type Linea = readonly (readonly [number, number])[];

export const RIOS: Readonly<Record<"py", readonly Linea[]>> = ${JSON.stringify({ py: lineas })};
`;
writeFileSync("src/ui/rios.ts", cuerpo);
console.log("  → src/ui/rios.ts");

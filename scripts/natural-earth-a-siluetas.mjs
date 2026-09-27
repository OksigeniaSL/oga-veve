#!/usr/bin/env node
/**
 * La silueta de cada país con aeropuertos: Natural Earth → `src/ui/siluetas.ts`.
 *
 *     node scripts/natural-earth-a-siluetas.mjs
 *
 * ## Para qué
 *
 * Para que en el hangar se vea **el país**, y no solo una lista de fichas. Un
 * niño que no lee reconoce la forma del Paraguay antes que la palabra
 * «Concepción», igual que reconoce la bandera; y sobre esa forma se ve de un
 * vistazo lo que ninguna lista enseña: que Ciudad del Este está en la otra
 * punta y el Chaco al otro lado del río.
 *
 * ## De dónde
 *
 * Natural Earth, 1:10 millones, **dominio público** («All versions of Natural
 * Earth raster + vector map data found on this website are in the public
 * domain», naturalearthdata.com/about/terms-of-use). Se anota igual en
 * `CREDITOS.md`: que no haga falta no quiere decir que no se diga.
 *
 * El Paraguay es un polígono; de España solo se quiere Canarias, que es donde
 * están sus rutas, y se reconoce por la latitud: todo lo que queda al sur del
 * paralelo treinta.
 *
 * ## Cuánto
 *
 * Se simplifica hasta que el error no se ve en el tamaño en que se dibuja: el
 * Paraguay a un kilómetro y medio —mil cien puntos se quedan en unos
 * doscientos— y las islas a doscientos metros, que miden cuarenta kilómetros y
 * con más tolerancia salían redondas.
 */

import { writeFileSync } from "node:fs";

const FUENTE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson";

/** Radio terrestre medio, m. */
const R = 6371008;

/** Douglas-Peucker sobre lon/lat, con la tolerancia en metros. */
function simplificar(anillo, tolerancia) {
  const lat0 = anillo[0][1];
  const k = Math.cos((lat0 * Math.PI) / 180);
  const m = anillo.map(([lon, lat]) => [
    ((lon * Math.PI) / 180) * R * k,
    ((lat * Math.PI) / 180) * R,
  ]);
  const quedan = new Uint8Array(anillo.length);
  quedan[0] = quedan[anillo.length - 1] = 1;
  /*
   * Un anillo empieza y acaba en el mismo punto, y entre dos puntos iguales no
   * hay recta con la que medir: se parte primero por el más lejano al inicio.
   */
  let lejos = 0;
  for (let i = 1; i < m.length; i++)
    if (Math.hypot(m[i][0] - m[0][0], m[i][1] - m[0][1]) >
        Math.hypot(m[lejos][0] - m[0][0], m[lejos][1] - m[0][1]))
      lejos = i;
  quedan[lejos] = 1;
  const pila = [
    [0, lejos],
    [lejos, anillo.length - 1],
  ];
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
  return anillo
    .filter((_, i) => quedan[i])
    .map(([lon, lat]) => [Math.round(lon * 1000) / 1000, Math.round(lat * 1000) / 1000]);
}

const res = await fetch(FUENTE);
if (!res.ok) throw new Error(`Natural Earth respondió ${res.status}`);
const datos = await res.json();
const pais = (nombre) => {
  const f = datos.features.find((x) => x.properties.ADMIN === nombre);
  if (!f) throw new Error(`${nombre} no está en Natural Earth`);
  const g = f.geometry;
  return g.type === "Polygon" ? [g.coordinates] : g.coordinates;
};

const siluetas = {
  py: pais("Paraguay").map((p) => simplificar(p[0], 1500)),
  es: pais("Spain")
    .filter((p) => p[0][0][1] < 30)
    .map((p) => simplificar(p[0], 200)),
};

const puntos = (s) => s.reduce((n, a) => n + a.length, 0);
for (const [k, s] of Object.entries(siluetas))
  console.log(`  ${k}: ${s.length} polígonos, ${puntos(s)} puntos`);

const cuerpo = `/**
 * La silueta de los países con aeropuertos, en longitud y latitud.
 *
 * **Generado** por \`scripts/natural-earth-a-siluetas.mjs\` desde Natural
 * Earth 1:10m, que es de dominio público. No se edita a mano: se regenera.
 *
 * \`es\` es solo Canarias, que es donde están las rutas de España.
 */

export type Anillo = readonly (readonly [number, number])[];

export const SILUETAS: Readonly<Record<"py" | "es", readonly Anillo[]>> = ${JSON.stringify(
  siluetas,
)};
`;
writeFileSync("src/ui/siluetas.ts", cuerpo);
console.log("  → src/ui/siluetas.ts");

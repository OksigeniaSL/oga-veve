#!/usr/bin/env node
/**
 * Las costas del mapa del respaldo: Natural Earth → `src/ui/costas-de-la-ruta.ts`.
 *
 *     node scripts/natural-earth-a-costas-de-la-ruta.mjs [ne_50m_land.geojson]
 *
 * ## De dónde
 *
 * Natural Earth, tierra a 1:50 millones, **dominio público** («All versions of
 * Natural Earth raster + vector map data found on this website are in the
 * public domain», naturalearthdata.com/about/terms-of-use). Sin argumento, se
 * baja del mismo sitio que `natural-earth-a-siluetas.mjs`.
 *
 * ## Cuánto
 *
 * El mapa del respaldo se pinta a mil píxeles de ancho para algo más de ciento
 * cuarenta grados: un píxel son unos dieciséis kilómetros. Así que se simplifica
 * a nueve, por debajo de lo que se ve, y **solo lo que cae cerca de la ruta**: se
 * recorta por el encuadre del mapa, con un poco de margen. Sin recortar, Eurasia
 * sola son miles de puntos que nunca salen en la pantalla.
 *
 * ## Las islas pequeñas se quedan
 *
 * Canarias y Cabo Verde son unos pocos píxeles, pero son justo lo que se cuenta
 * en este viaje —El Hierro pasa por debajo a las dos horas y veinte—, y un anillo
 * se queda aunque mida un píxel: Douglas-Peucker le deja al menos su triángulo.
 *
 * ## Y la pelota
 *
 * La misma fuente saca también `src/ui/costas-de-la-pelota.ts`: **la media Tierra
 * que se ve** desde encima del punto medio de la ruta, para el modo pelota de la
 * pantalla. La caja de arriba no vale para eso: una pelota enseña Escocia, Groenlandia,
 * el Canadá, la Patagonia y la Antártida, y con la caja saldrían cortados a regla.
 * La pelota mide seiscientos píxeles para doce mil setecientos kilómetros, así que
 * se simplifica a veinte kilómetros.
 *
 * Lo que queda detrás no se dibuja nunca, y Eurasia sola son miles de puntos en la
 * cara oculta: cada punto de detrás se **pliega** al borde de la pelota, en la misma
 * dirección desde el centro, y un anillo entero detrás se tira. El pliegue conserva
 * lo que hay dentro de cada anillo en la cara visible —una región que no contiene el
 * punto opuesto al centro sigue dando una vuelta alrededor de lo suyo—, y deja la
 * pintura sin más cuenta que proyectar: nada de recortar por el horizonte en el juego.
 */

import { readFileSync, writeFileSync } from "node:fs";

const FUENTE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson";

/** Radio terrestre medio, m. */
const R = 6371008;

/**
 * El encuadre, grados, con margen sobre el de `flight/mapa-del-vuelo.ts`: lo que
 * se corta en el margen no se ve, y sin él el recorte asomaría en el borde.
 */
const CAJA = { oeste: -108, este: 46, sur: -43, norte: 57 };

/** La tolerancia, m. Ver la cabecera. */
const TOLERANCIA = 9000;

/** Recorta un anillo por un lado de la caja (Sutherland-Hodgman). */
function recortarPorLado(anillo, dentro, cruce) {
  const salida = [];
  for (let i = 0; i < anillo.length; i++) {
    const a = anillo[i];
    const b = anillo[(i + 1) % anillo.length];
    const da = dentro(a);
    const db = dentro(b);
    if (da) salida.push(a);
    if (da !== db) salida.push(cruce(a, b));
  }
  return salida;
}

function recortar(anillo) {
  const enLon = (lon) => (a, b) => [lon, a[1] + ((b[1] - a[1]) * (lon - a[0])) / (b[0] - a[0])];
  const enLat = (lat) => (a, b) => [a[0] + ((b[0] - a[0]) * (lat - a[1])) / (b[1] - a[1]), lat];
  let r = anillo.slice(0, -1);
  if (r.length) r = recortarPorLado(r, (p) => p[0] >= CAJA.oeste, enLon(CAJA.oeste));
  if (r.length) r = recortarPorLado(r, (p) => p[0] <= CAJA.este, enLon(CAJA.este));
  if (r.length) r = recortarPorLado(r, (p) => p[1] >= CAJA.sur, enLat(CAJA.sur));
  if (r.length) r = recortarPorLado(r, (p) => p[1] <= CAJA.norte, enLat(CAJA.norte));
  return r;
}

/** Douglas-Peucker sobre lon/lat, con la tolerancia en metros. Igual que en las siluetas. */
function simplificar(abierto, tolerancia) {
  const anillo = [...abierto, abierto[0]];
  const k = Math.cos((anillo[0][1] * Math.PI) / 180);
  const m = anillo.map(([lon, lat]) => [((lon * Math.PI) / 180) * R * k, ((lat * Math.PI) / 180) * R]);
  const quedan = new Uint8Array(anillo.length);
  quedan[0] = quedan[anillo.length - 1] = 1;
  let lejos = 0;
  for (let i = 1; i < m.length; i++)
    if (Math.hypot(m[i][0] - m[0][0], m[i][1] - m[0][1]) > Math.hypot(m[lejos][0] - m[0][0], m[lejos][1] - m[0][1]))
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
    .slice(0, -1)
    .filter((_, i) => quedan[i])
    .map(([lon, lat]) => [Math.round(lon * 10) / 10, Math.round(lat * 10) / 10]);
}

const datos = process.argv[2]
  ? JSON.parse(readFileSync(process.argv[2], "utf8"))
  : await (async () => {
      const res = await fetch(FUENTE);
      if (!res.ok) throw new Error(`Natural Earth respondió ${res.status}`);
      return res.json();
    })();

const anillos = [];
for (const f of datos.features) {
  const g = f.geometry;
  for (const poligono of g.type === "Polygon" ? [g.coordinates] : g.coordinates) {
    const dentro = recortar(poligono[0]);
    if (dentro.length < 3) continue;
    const s = simplificar(dentro, TOLERANCIA);
    if (s.length >= 3) anillos.push(s);
  }
}

const puntos = anillos.reduce((n, a) => n + a.length, 0);
console.log(`  ${anillos.length} costas, ${puntos} puntos`);

const cuerpo = `/**
 * Las costas que caen cerca de la ruta de Madrid a Asunción, en longitud y
 * latitud: lo que dibuja el mapa del respaldo.
 *
 * **Generado** por \`scripts/natural-earth-a-costas-de-la-ruta.mjs\` desde Natural
 * Earth 1:50m, que es de dominio público. No se edita a mano: se regenera.
 */

export type Costa = readonly (readonly [number, number])[];

export const COSTAS_DE_LA_RUTA: readonly Costa[] = ${JSON.stringify(anillos)};
`;
writeFileSync("src/ui/costas-de-la-ruta.ts", cuerpo);
console.log("  → src/ui/costas-de-la-ruta.ts");

// ── La pelota ───────────────────────────────────────────────────────────

/** La tolerancia de la pelota, m: por debajo del píxel de una pelota de seiscientos. */
const TOLERANCIA_DE_LA_PELOTA = 20_000;
/** Cada cuántos grados del borde se deja un punto: una cuerda de cinco grados no se separa ni un píxel. */
const PASO_DEL_BORDE = (5 * Math.PI) / 180;

/**
 * El centro de la pelota: el punto medio de la ortodrómica entre el punto de
 * referencia de Barajas (`BARAJAS` en `flight/ruta-larga.ts`, del AIP) y el de
 * Pettirossi. El punto medio de un círculo máximo es la suma de los dos vectores.
 */
const aVector = (lon, lat) => {
  const [f, l] = [(lat * Math.PI) / 180, (lon * Math.PI) / 180];
  return [Math.cos(f) * Math.cos(l), Math.cos(f) * Math.sin(l), Math.sin(f)];
};
const PETTIROSSI = JSON.parse(readFileSync("data/aerodromes/sgas.aero.json", "utf8")).origin;
const [cx, cy, cz] = (() => {
  const a = aVector(-(3 + 33 / 60 + 39 / 3600), 40 + 28 / 60 + 20 / 3600);
  const b = aVector(PETTIROSSI.lon, PETTIROSSI.lat);
  const s = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const l = Math.hypot(...s);
  return [s[0] / l, s[1] / l, s[2] / l];
})();
// Los ejes de quien mira: este y norte en el plano de la pelota, y `c` hacia él.
const este = (() => {
  const l = Math.hypot(cx, cy);
  return [-cy / l, cx / l, 0];
})();
const norte = [-cz * este[1], cz * este[0], cx * este[1] - cy * este[0]];
const vista = (lon, lat) => {
  const v = aVector(lon, lat);
  const por = (e) => v[0] * e[0] + v[1] * e[1] + v[2] * e[2];
  return { x: por(este), y: por(norte), z: por([cx, cy, cz]) };
};
const enElBorde = (azimut) => {
  const [x, y] = [Math.cos(azimut), Math.sin(azimut)];
  const v = [0, 1, 2].map((i) => x * este[i] + y * norte[i]);
  return [
    Math.round((Math.atan2(v[1], v[0]) * 1800) / Math.PI) / 10,
    Math.round((Math.asin(v[2]) * 1800) / Math.PI) / 10,
  ];
};
const giro = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Lo de detrás, al borde: ver la cabecera. `null` si no queda nada delante. */
function plegar(anillo) {
  if (!anillo.some(([lon, lat]) => vista(lon, lat).z >= 0)) return null;
  const salida = [];
  let antes = null;
  for (let i = 0; i < anillo.length; i++) {
    const [lon, lat] = anillo[i];
    const p = vista(lon, lat);
    if (p.z >= 0) {
      salida.push(anillo[i]);
      antes = null;
      continue;
    }
    const azimut = Math.atan2(p.y, p.x);
    const siguiente = anillo[(i + 1) % anillo.length];
    const ultimoDeDetras = vista(siguiente[0], siguiente[1]).z >= 0;
    if (antes === null) {
      salida.push(enElBorde(azimut));
      antes = azimut;
      continue;
    }
    // Por el borde, sin cuerdas: el camino corto del acimut, a pasos.
    const falta = giro(azimut - antes);
    const pasos = Math.floor(Math.abs(falta) / PASO_DEL_BORDE);
    for (let k = 1; k <= pasos; k++) {
      antes += (Math.sign(falta) * PASO_DEL_BORDE);
      salida.push(enElBorde(antes));
    }
    if (ultimoDeDetras) {
      salida.push(enElBorde(azimut));
      antes = azimut;
    }
  }
  return salida;
}

const dePelota = [];
for (const f of datos.features) {
  const g = f.geometry;
  // Con los huecos: en esta fuente, el único es el mar Caspio, que se ve junto al borde.
  for (const poligono of g.type === "Polygon" ? [g.coordinates] : g.coordinates) {
    for (const anillo of poligono) {
      const s = simplificar(anillo.slice(0, -1), TOLERANCIA_DE_LA_PELOTA);
      if (s.length < 3) continue;
      const plegado = plegar(s);
      if (plegado && plegado.length >= 3) dePelota.push(plegado);
    }
  }
}
console.log(`  ${dePelota.length} costas de la pelota, ${dePelota.reduce((n, a) => n + a.length, 0)} puntos`);

writeFileSync(
  "src/ui/costas-de-la-pelota.ts",
  `/**
 * La media Tierra que se ve desde encima del punto medio de la ruta de Madrid a
 * Asunción, en longitud y latitud: lo que dibuja la pelota de la pantalla del
 * respaldo. Lo que queda detrás va plegado al borde.
 *
 * **Generado** por \`scripts/natural-earth-a-costas-de-la-ruta.mjs\` desde Natural
 * Earth 1:50m, que es de dominio público. No se edita a mano: se regenera.
 */

import type { Costa } from "./costas-de-la-ruta";

export const COSTAS_DE_LA_PELOTA: readonly Costa[] = ${JSON.stringify(dePelota)};
`,
);
console.log("  → src/ui/costas-de-la-pelota.ts");

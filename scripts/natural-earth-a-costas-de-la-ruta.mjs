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

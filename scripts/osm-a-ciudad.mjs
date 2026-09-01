#!/usr/bin/env node
/**
 * Extractor de ciudad: OpenStreetMap → `.city.json`.
 *
 *     npx tsx scripts/osm-a-ciudad.mjs tenerife-norte
 *
 * ## Por qué no se bajan los edificios
 *
 * Porque no caben, y está medido. En quince kilómetros alrededor de Silvio
 * Pettirossi hay **434.286 edificios**, 45.551 tramos de vía y 6.207 polígonos
 * de uso del suelo. Una muestra real de dos kilómetros de radio del centro de
 * Asunción son 20.701 edificios y 15,1 MB de JSON; extrapolado, unos 300 MB.
 * Incluso cuantizados en binario, los edificios solos pesan 12 MB. El aeródromo
 * entero ocupa hoy 620 KB.
 *
 * Y desde trescientos metros **nadie distingue una casa concreta**. Lo que se
 * reconoce al aproximar es otra cosa: por dónde se espesa la ciudad, la
 * carretera que va al centro y el agua. Eso sí cabe.
 *
 * ## Lo que sí se baja
 *
 * - **El uso del suelo**: residencial, industrial, comercial. De ahí sale una
 *   rejilla de densidad de un byte por celda —dónde hay ciudad y de qué clase—
 *   que en el juego se convierte en cajas instanciadas con semilla fija.
 * - **El viario principal**, de autopista a terciaria, simplificado con
 *   Douglas-Peucker. Es lo que dibuja la trama.
 * - **El agua**: ríos, embalses, lagunas.
 *
 * La rejilla es la idea entera: **no se envían casas, se envía dónde hay
 * casas**. Las casas las pone el juego, siempre las mismas porque la semilla es
 * la misma, y por eso un sitio se aprende.
 *
 * ## Licencia
 *
 * Base de datos derivada de OpenStreetMap: **ODbL 1.0**. Vive en `data/cities/`
 * con su licencia, separada del código.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { SCENARIOS } from '../src/world/scenarios.ts';
import { overpass, simplificar, proyector, R_TIERRA } from './osm-comun.mjs';

const SALIDA = 'data/cities';

/** Cuántas celdas tiene la rejilla de densidad por lado. */
const REJILLA = 96;

/**
 * Las clases de suelo, por orden de prioridad al pintar la rejilla.
 *
 * El orden importa: una celda que es a la vez residencial y comercial se pinta
 * de comercial, porque lo que se ve desde el aire es lo alto, no lo que hay
 * debajo. Y `0` quiere decir «campo», que es la mayoría del mapa.
 */
const CLASES = [
  { nombre: 'comercial', codigo: 3, etiquetas: ['commercial', 'retail'] },
  { nombre: 'industrial', codigo: 2, etiquetas: ['industrial', 'port'] },
  { nombre: 'residencial', codigo: 1, etiquetas: ['residential', 'construction', 'farmyard'] },
];

/** Los tipos de vía que se traen enteros, de más gorda a menos. */
const VIAS = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'];

/**
 * Las calles de barrio, de las que **solo se pide el centro**.
 *
 * El uso del suelo por sí solo no vale en todas partes. En Tenerife hay
 * novecientos setenta y cinco polígonos de `landuse` y sale el dieciséis por
 * ciento del mapa con ciudad; en Asunción hay cuatrocientos noventa y ocho y
 * salía el trece, y Asunción no tiene menos ciudad que La Laguna: tiene menos
 * gente mapeándola. La rejilla se creía el hueco.
 *
 * Las calles de barrio no mienten: donde hay casas hay calle. Pero bajarlas
 * enteras son decenas de miles de geometrías, así que se pide `out center`, que
 * devuelve **un punto por calle** en vez de su trazado. Treinta mil puntos son
 * un megabyte y medio y se tiran en cuanto se han contado; su trazado no
 * interesa, solo dónde están.
 */
const CALLES = ['residential', 'unclassified', 'living_street'];

const id = process.argv[2];
const esc = SCENARIOS.find((s) => s.id === id);
if (!esc?.aerodrome) {
  console.error('Uso: npx tsx scripts/osm-a-ciudad.mjs <escenario con aeródromo>');
  console.error(`Escenarios: ${SCENARIOS.filter((s) => s.aerodrome).map((s) => s.id).join(', ')}`);
  process.exit(1);
}

const { lat: lat0, lon: lon0 } = esc.aerodrome.origin;
const mitad = esc.size / 2;
const aMetros = proyector(lat0, lon0);

// El recuadro en grados, con un margen: una nave industrial cortada por el
// borde del mapa deja media manzana sin densidad.
const k = Math.cos((lat0 * Math.PI) / 180);
const dLat = ((mitad * 1.1) * 180) / (R_TIERRA * Math.PI);
const dLon = ((mitad * 1.1) * 180) / (R_TIERRA * Math.PI * k);
const caja = `${(lat0 - dLat).toFixed(5)},${(lon0 - dLon).toFixed(5)},${(lat0 + dLat).toFixed(5)},${(lon0 + dLon).toFixed(5)}`;

console.log(`${esc.id} · ${esc.aerodrome.name}`);
console.log(`  recuadro ${caja} · ${esc.size / 1000} km`);

const usos = CLASES.flatMap((c) => c.etiquetas).join('|');
const consulta = `[out:json][timeout:300];
(
  way["landuse"~"^(${usos})$"](${caja});
  way["highway"~"^(${VIAS.join('|')})$"](${caja});
  way["natural"="water"](${caja});
  way["waterway"="riverbank"](${caja});
  relation["natural"="water"](${caja});
);
out geom;`;

const consultaCalles = `[out:json][timeout:300];
way["highway"~"^(${CALLES.join('|')})$"](${caja});
out center;`;

process.stdout.write('  preguntando a Overpass… ');
const [datos, calles] = await Promise.all([overpass(consulta), overpass(consultaCalles)]);
console.log(`${datos.elements.length} elementos · ${calles.elements.length} calles de barrio`);

/** Los puntos de un elemento en metros, ya sea `geometry` o `members`. */
function enMetros(el) {
  if (el.geometry) return [el.geometry.map((p) => aMetros(p.lat, p.lon))];
  if (el.members) {
    return el.members
      .filter((m) => m.geometry && m.role !== 'inner')
      .map((m) => m.geometry.map((p) => aMetros(p.lat, p.lon)));
  }
  return [];
}

// ── La rejilla de densidad ────────────────────────────────────────────────

const paso = esc.size / REJILLA;
const clase = new Uint8Array(REJILLA * REJILLA);
const densidad = new Uint8Array(REJILLA * REJILLA);

/** ¿Cae el punto dentro del anillo? Cruce de rayos de toda la vida. */
function dentro([px, py], anillo) {
  let si = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) si = !si;
  }
  return si;
}

let poligonos = 0;
for (const el of datos.elements) {
  const uso = el.tags?.landuse;
  if (!uso) continue;
  const c = CLASES.find((x) => x.etiquetas.includes(uso));
  if (!c) continue;
  for (const anillo of enMetros(el)) {
    if (anillo.length < 3) continue;
    poligonos++;
    // Solo las celdas del recuadro del polígono. Probar las nueve mil contra
    // los seis mil polígonos serían cincuenta y cinco millones de pruebas.
    const xs = anillo.map((p) => p[0]);
    const ys = anillo.map((p) => p[1]);
    const c0 = Math.max(0, Math.floor((Math.min(...xs) + mitad) / paso));
    const c1 = Math.min(REJILLA - 1, Math.floor((Math.max(...xs) + mitad) / paso));
    const f0 = Math.max(0, Math.floor((Math.min(...ys) + mitad) / paso));
    const f1 = Math.min(REJILLA - 1, Math.floor((Math.max(...ys) + mitad) / paso));
    for (let f = f0; f <= f1; f++) {
      for (let col = c0; col <= c1; col++) {
        // Cuatro muestras por celda: una sola dejaba las manzanas estrechas
        // fuera y la ciudad salía apolillada.
        let dentroCuantas = 0;
        for (const [dx, dy] of [
          [0.25, 0.25],
          [0.75, 0.25],
          [0.25, 0.75],
          [0.75, 0.75],
        ]) {
          const p = [-mitad + (col + dx) * paso, -mitad + (f + dy) * paso];
          if (dentro(p, anillo)) dentroCuantas++;
        }
        if (!dentroCuantas) continue;
        const i = f * REJILLA + col;
        densidad[i] = Math.min(255, densidad[i] + dentroCuantas * 64);
        if (c.codigo > clase[i]) clase[i] = c.codigo;
      }
    }
  }
}

/*
 * Y ahora las calles de barrio, que es lo que rellena lo que el uso del suelo
 * se dejó. Cada centro de calle suma densidad a su celda y la marca como
 * residencial si no era ya algo más.
 *
 * Cuarenta por calle y no ciento veintiocho: una celda de ciento ochenta y
 * siete metros de lado con seis calles ya es un barrio hecho, y con el salto
 * grande cualquier cruce de tres calles salía a densidad máxima.
 */
let conCalle = 0;
for (const el of calles.elements) {
  const c = el.center ?? el;
  if (c.lat == null || c.lon == null) continue;
  const [x, y] = aMetros(c.lat, c.lon);
  if (Math.abs(x) > mitad || Math.abs(y) > mitad) continue;
  const col = Math.floor((x + mitad) / paso);
  const f = Math.floor((y + mitad) / paso);
  if (col < 0 || col >= REJILLA || f < 0 || f >= REJILLA) continue;
  const i = f * REJILLA + col;
  if (!clase[i]) {
    clase[i] = 1;
    conCalle++;
  }
  densidad[i] = Math.min(255, densidad[i] + 40);
}
console.log(`  ${conCalle} celdas más por las calles de barrio`);

const conCiudad = [...clase].filter((c) => c > 0).length;
console.log(
  `  ${poligonos} polígonos de uso → ${conCiudad} celdas con ciudad de ${REJILLA * REJILLA} (${Math.round((conCiudad / clase.length) * 100)} %)`,
);

// ── El viario y el agua ───────────────────────────────────────────────────

/** Recorta una polilínea al cuadrado del escenario, en trozos. */
function recortar(puntos) {
  const trozos = [];
  let actual = [];
  for (const p of puntos) {
    if (Math.abs(p[0]) <= mitad && Math.abs(p[1]) <= mitad) actual.push(p);
    else if (actual.length) {
      // Se guarda el punto de fuera para que la vía llegue al borde y no se
      // quede cortada a media celda.
      actual.push(p);
      trozos.push(actual);
      actual = [];
    }
  }
  if (actual.length) trozos.push(actual);
  return trozos.filter((t) => t.length > 1);
}

const vias = [];
for (const el of datos.elements) {
  const via = el.tags?.highway;
  if (!via) continue;
  const nivel = VIAS.indexOf(via);
  if (nivel < 0) continue;
  for (const linea of enMetros(el)) {
    for (const trozo of recortar(linea)) {
      // Veinte metros de tolerancia: desde el aire una curva de carretera no
      // se distingue de dos rectas, y esto divide el peso por cinco.
      const simple = simplificar(trozo, 20).map((p) => [Math.round(p[0]), Math.round(p[1])]);
      if (simple.length > 1) vias.push({ nivel, puntos: simple });
    }
  }
}

const agua = [];
for (const el of datos.elements) {
  if (el.tags?.natural !== 'water' && el.tags?.waterway !== 'riverbank') continue;
  for (const anillo of enMetros(el)) {
    if (anillo.length < 4) continue;
    const xs = anillo.map((p) => p[0]);
    const ys = anillo.map((p) => p[1]);
    // Fuera del mapa entero: no se guarda.
    if (Math.min(...xs) > mitad || Math.max(...xs) < -mitad) continue;
    if (Math.min(...ys) > mitad || Math.max(...ys) < -mitad) continue;
    const simple = simplificar(anillo, 30).map((p) => [Math.round(p[0]), Math.round(p[1])]);
    // Charcos que desde el aire no se ven: fuera.
    const area = Math.abs(
      simple.reduce((s, p, i) => {
        const q = simple[(i + 1) % simple.length];
        return s + (p[0] * q[1] - q[0] * p[1]);
      }, 0) / 2,
    );
    if (simple.length > 3 && area > 20000) agua.push(simple);
  }
}

console.log(`  ${vias.length} tramos de vía · ${agua.length} polígonos de agua`);

// ── El fichero ────────────────────────────────────────────────────────────

mkdirSync(SALIDA, { recursive: true });
const salida = {
  id: esc.id,
  fuente: 'OpenStreetMap',
  licencia: 'ODbL 1.0',
  atribucion: '© colaboradores de OpenStreetMap',
  extraido: new Date().toISOString().slice(0, 10),
  origen: { lat: lat0, lon: lon0 },
  tamanoM: esc.size,
  rejilla: {
    lado: REJILLA,
    // En base 64 y no como lista de números: nueve mil comas y espacios pesan
    // más que los datos.
    clase: Buffer.from(clase).toString('base64'),
    densidad: Buffer.from(densidad).toString('base64'),
  },
  vias,
  agua,
};
const texto = `${JSON.stringify(salida)}\n`;
writeFileSync(`${SALIDA}/${esc.id}.city.json`, texto);
console.log(`  ${(texto.length / 1024).toFixed(0)} KB → ${SALIDA}/${esc.id}.city.json`);

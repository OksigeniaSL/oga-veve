#!/usr/bin/env node
/**
 * Extractor de aeródromos: OpenStreetMap + OurAirports → `.aero.json`.
 *
 *     node scripts/osm-a-aerodromo.mjs SGAS GCXO
 *
 * Saca de OpenStreetMap la geometría en planta —pistas, calles de rodaje,
 * plataformas, edificios, puntos de espera, mangas de viento— y la cruza con
 * OurAirports, que es de donde salen las elevaciones de umbral, la anchura y
 * si la pista está iluminada. Ninguna de esas tres cosas está en OSM de forma
 * fiable, y las tres hacen falta.
 *
 * Cero dependencias: Node trae `fetch` y el resto son cuarenta líneas de
 * geometría.
 *
 * ## Licencias, que aquí importan
 *
 * Lo que sale de aquí es una **base de datos derivada** de OpenStreetMap, así
 * que va bajo ODbL 1.0 y vive en `data/aerodromes/` con su propia licencia,
 * separado del código (Apache-2.0) y del contenido propio. OurAirports es de
 * dominio público. Ver `data/aerodromes/README.md`.
 *
 * ## Lo que este script NO hace
 *
 * No inventa nada. Las marcas pintadas, las luces y los PAPI no están en OSM
 * y aquí salen como `null`: se generan luego por categoría, o se rellenan a
 * mano. Y **nunca sobreescribe un campo marcado `"manual": true`**, que es lo
 * que permite retocar un aeródromo sin perder el retoque en la siguiente
 * extracción.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const OVERPASS = process.env.OVERPASS ?? 'https://overpass-api.de/api/interpreter';
const OURAIRPORTS = 'https://davidmegginson.github.io/ourairports-data';
const SALIDA = 'data/aerodromes';

/** Radio terrestre medio, m. */
const R = 6371008;

/** Tolerancia de simplificación, m. Por debajo de esto no se ve la diferencia. */
const TOLERANCIA = 0.5;

/** Qué se pide a Overpass dentro del área del aeródromo. */
const COSAS =
  '^(runway|taxiway|apron|terminal|helipad|windsock|gate|parking_position|holding_position|navigationaid)$';

// ── Geometría ────────────────────────────────────────────────────────────

/**
 * Proyección equirrectangular local, con el aeródromo en el origen.
 *
 * Diez líneas, invertible y sin dependencias. Su error en la esquina de un
 * escenario de catorce kilómetros es de unos cuatro metros —menor que el
 * error de digitalización del propio OpenStreetMap—, así que no compensa
 * nada más sofisticado.
 */
function proyector(lat0, lon0) {
  const k = Math.cos((lat0 * Math.PI) / 180);
  return (lat, lon) => [
    redondear((R * (lon - lon0) * Math.PI * k) / 180),
    redondear((R * (lat - lat0) * Math.PI) / 180),
  ];
}

const redondear = (n) => Math.round(n * 10) / 10;

/** Distancia de un punto al segmento a-b. */
function aLaRecta([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const largo = dx * dx + dy * dy;
  const t = largo === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / largo));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Douglas-Peucker. Se simplifica aquí y no en el juego: se hace una vez. */
function simplificar(puntos, tol = TOLERANCIA) {
  if (puntos.length < 3) return puntos;
  let peor = 0;
  let cual = 0;
  for (let i = 1; i < puntos.length - 1; i++) {
    const d = aLaRecta(puntos[i], puntos[0], puntos[puntos.length - 1]);
    if (d > peor) {
      peor = d;
      cual = i;
    }
  }
  if (peor <= tol) return [puntos[0], puntos[puntos.length - 1]];
  return [
    ...simplificar(puntos.slice(0, cual + 1), tol).slice(0, -1),
    ...simplificar(puntos.slice(cual), tol),
  ];
}

// ── Fuentes ──────────────────────────────────────────────────────────────

async function overpass(query) {
  // El tipo de contenido y el identificador no son opcionales: sin ellos
  // Overpass devuelve 406 sin más explicación. Y el identificador es de
  // cortesía además de obligatorio — es un servicio gratuito de voluntarios.
  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'oga-veve/0.1 (+https://github.com/OksigeniaSL/oga-veve)',
    },
    body: 'data=' + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Overpass respondió ${res.status}`);
  return res.json();
}

/**
 * Lo del aeródromo, dentro de su perímetro.
 *
 * Se usa `nwr` y no `way` porque un aeropuerto grande suele estar mapeado
 * como relación multipolígono —Silvio Pettirossi lo está— y una consulta por
 * `way` no lo encuentra. Y `out geom` mete las coordenadas dentro de cada
 * elemento, así que no hace falta una segunda pasada.
 */
const consultaArea = (icao) => `[out:json][timeout:180];
nwr["aeroway"="aerodrome"]["icao"="${icao}"];
map_to_area->.a;
(nwr(area.a)["aeroway"~"${COSAS}"];);
out tags geom;`;

/**
 * Respaldo para los campos del interior, que suelen estar mapeados como un
 * nodo suelto sin perímetro: sin área no hay `map_to_area` que valga, así que
 * se busca alrededor.
 */
const consultaCerca = (icao) => `[out:json][timeout:120];
nwr["aeroway"="aerodrome"]["icao"="${icao}"];
(nwr["aeroway"~"${COSAS}"](around:2500););
out tags geom;`;

/** Una línea de CSV, respetando las comillas. */
function celdas(linea) {
  const out = [];
  let campo = '';
  let comillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (comillas && linea[i + 1] === '"') {
        campo += '"';
        i++;
      } else comillas = !comillas;
    } else if (c === ',' && !comillas) {
      out.push(campo);
      campo = '';
    } else campo += c;
  }
  out.push(campo);
  return out;
}

async function csv(nombre) {
  const res = await fetch(`${OURAIRPORTS}/${nombre}.csv`);
  if (!res.ok) throw new Error(`OurAirports respondió ${res.status} para ${nombre}`);
  const lineas = (await res.text()).split('\n').filter(Boolean);
  const cab = celdas(lineas[0]);
  return lineas.slice(1).map((l) => Object.fromEntries(celdas(l).map((v, i) => [cab[i], v])));
}

const num = (v) => (v === '' || v === undefined ? null : Number(v));

// ── Montaje ──────────────────────────────────────────────────────────────

function centro(elemento) {
  const g = elemento.geometry ?? [];
  if (elemento.lat !== undefined) return [elemento.lat, elemento.lon];
  if (!g.length) return null;
  const lat = g.reduce((a, p) => a + p.lat, 0) / g.length;
  const lon = g.reduce((a, p) => a + p.lon, 0) / g.length;
  return [lat, lon];
}

const camino = (elemento, proj) =>
  simplificar((elemento.geometry ?? []).map((p) => proj(p.lat, p.lon)));

/** El aeródromo entero, listo para escribir. */
async function construir(icao, pistas, aeropuertos) {
  process.stdout.write(`→ ${icao}\n`);

  let datos = await overpass(consultaArea(icao));
  let elementos = datos.elements ?? [];
  if (!elementos.some((e) => e.tags?.aeroway === 'runway')) {
    process.stdout.write('  sin perímetro mapeado, se busca alrededor\n');
    datos = await overpass(consultaCerca(icao));
    elementos = datos.elements ?? [];
  }

  const ficha = aeropuertos.find((a) => a.ident === icao);
  if (!ficha) throw new Error(`${icao} no está en OurAirports`);
  const lat0 = Number(ficha.latitude_deg);
  const lon0 = Number(ficha.longitude_deg);
  const proj = proyector(lat0, lon0);

  const de = (tipo) => elementos.filter((e) => e.tags?.aeroway === tipo);

  const runways = de('runway').map((w) => {
    const ref = w.tags.ref ?? '';
    const [a, b] = ref.split('/');
    const eje = camino(w, proj);
    const suyas = pistas.filter((p) => p.airport_ident === icao);
    const umbral = (designador) => {
      const p = suyas.find((r) => r.le_ident === designador || r.he_ident === designador);
      if (!p) return null;
      const lado = p.le_ident === designador ? 'le' : 'he';
      const lat = num(p[`${lado}_latitude_deg`]);
      const lon = num(p[`${lado}_longitude_deg`]);
      const pies = num(p[`${lado}_elevation_ft`]);
      return {
        xy: lat !== null && lon !== null ? proj(lat, lon) : null,
        elevM: pies === null ? null : redondear(pies * 0.3048),
        headingTrue: num(p[`${lado}_heading_degT`]),
        displacedM: (() => {
          const d = num(p[`${lado}_displaced_threshold_ft`]);
          return d === null ? 0 : redondear(d * 0.3048);
        })(),
        // No está en ninguna de las dos fuentes: se rellena a mano o se
        // genera por categoría. Nunca se inventa.
        papi: null,
        approachLights: null,
      };
    };
    const suya = suyas.find((r) => `${r.le_ident}/${r.he_ident}` === ref) ?? suyas[0];
    const anchoPies = suya ? num(suya.width_ft) : null;
    return {
      ref,
      // OSM casi nunca trae la anchura; OurAirports sí.
      widthM: w.tags.width ? Number(w.tags.width) : anchoPies === null ? null : redondear(anchoPies * 0.3048),
      surface: w.tags.surface ?? suya?.surface ?? null,
      lit: w.tags.lit === 'yes' || suya?.lighted === '1',
      centerline: eje,
      thresholds: a && b ? { [a]: umbral(a), [b]: umbral(b) } : {},
      // Categoría de marcas pintadas: no existe en OSM. Se decide luego.
      markings: null,
    };
  });

  const elev = num(ficha.elevation_ft);
  return {
    id: icao,
    name: ficha.name,
    source: {
      osm: 'overpass',
      extracted: new Date().toISOString().slice(0, 10),
      ourairports: ficha.id,
      note: 'Geometría © colaboradores de OpenStreetMap, ODbL 1.0. Ver README.',
    },
    origin: { lat: lat0, lon: lon0 },
    elevationM: elev === null ? null : redondear(elev * 0.3048),
    runways,
    taxiways: de('taxiway').map((w) => ({
      ref: w.tags.ref ?? null,
      widthM: w.tags.width ? Number(w.tags.width) : null,
      path: camino(w, proj),
    })),
    aprons: de('apron').map((w) => ({ surface: w.tags.surface ?? null, polygon: camino(w, proj) })),
    buildings: de('terminal').map((w) => ({
      kind: 'terminal',
      heightM: w.tags.height ? Number(w.tags.height) : null,
      polygon: camino(w, proj),
    })),
    helipads: de('helipad').map((w) => centro(w)).filter(Boolean).map(([la, lo]) => proj(la, lo)),
    holdingPositions: de('holding_position').map((n) => centro(n)).filter(Boolean).map(([la, lo]) => proj(la, lo)),
    windsocks: de('windsock').map((n) => centro(n)).filter(Boolean).map(([la, lo]) => proj(la, lo)),
    // OJO: en OSM `aeroway=navigationaid` son ayudas VISUALES —PAPI, VASI—,
    // no radioayudas. Las radioayudas van con `airmark=beacon`, que es otra
    // consulta. Lo dimos por hecho al revés durante un tiempo.
    visualAids: de('navigationaid').map((n) => centro(n)).filter(Boolean).map(([la, lo]) => proj(la, lo)),
  };
}

/**
 * Escribe respetando lo retocado a mano.
 *
 * Cualquier objeto que lleve `"manual": true` se conserva tal cual. Sin esto,
 * ajustar un PAPI o la altura de una terminal duraría hasta la siguiente
 * extracción, y nadie volvería a ejecutar el extractor.
 */
function conservarManual(nuevo, viejo) {
  if (viejo === null || typeof viejo !== 'object') return nuevo;
  if (viejo.manual === true) return viejo;
  if (Array.isArray(viejo) && Array.isArray(nuevo)) {
    return nuevo.map((n, i) => conservarManual(n, viejo[i] ?? null));
  }
  if (Array.isArray(nuevo) || typeof nuevo !== 'object' || nuevo === null) return nuevo;
  const out = { ...nuevo };
  for (const clave of Object.keys(nuevo)) out[clave] = conservarManual(nuevo[clave], viejo[clave] ?? null);
  return out;
}

const icaos = process.argv.slice(2).map((s) => s.toUpperCase());
if (icaos.length === 0) {
  console.error('Uso: node scripts/osm-a-aerodromo.mjs SGAS GCXO');
  process.exit(1);
}

await mkdir(SALIDA, { recursive: true });
process.stdout.write('Descargando OurAirports…\n');
const [pistas, aeropuertos] = await Promise.all([csv('runways'), csv('airports')]);

for (const icao of icaos) {
  const ficha = await construir(icao, pistas, aeropuertos);
  const destino = join(SALIDA, `${icao.toLowerCase()}.aero.json`);
  const previo = existsSync(destino) ? JSON.parse(await readFile(destino, 'utf8')) : null;
  await writeFile(destino, JSON.stringify(conservarManual(ficha, previo), null, 2) + '\n');
  const r = ficha.runways[0];
  process.stdout.write(
    `  ${ficha.name}\n` +
      `  pista ${r?.ref ?? '—'} · ${r?.widthM ?? '?'} m de ancho · ${r?.surface ?? '?'}\n` +
      `  ${ficha.taxiways.length} rodaduras · ${ficha.aprons.length} plataformas · ` +
      `${ficha.windsocks.length} mangas · ${ficha.holdingPositions.length} puntos de espera\n` +
      `  → ${destino}\n`,
  );
}

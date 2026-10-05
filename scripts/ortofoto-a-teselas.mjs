#!/usr/bin/env node
/**
 * Ortofoto → teselas por niveles: las islas Canarias del PNOA y los pasillos
 * de Paraguay de Sentinel-2.
 *
 * El hermano de `ortofoto-publica.mjs`, que saca cuatro fotos de una pieza por
 * escenario. Éste saca **teselas sueltas** del mosaico web, para que el juego
 * se baje solo las que mira y con el detalle que le toca por la distancia. Es
 * la respuesta a la captura de La Palma de Enrique (punto 166): «el resto de
 * la isla, verde plano y a bloques, como estar jugando en Minecraft». Qué
 * teselas y a qué nivel lo decide `src/world/cobertura-de-teselas.ts`; aquí
 * solo se piden, se guardan y se apuntan.
 *
 * ## Las dos fuentes
 *
 * - **`pnoa`** (por omisión), el PNOA del IGN, CC BY 4.0: las siete islas
 *   enteras hasta z15 y z16 en pasillos y cumbres. De z14 a z16 tal cual las
 *   sirve el IGN; **z13, z12 y z11 hechas aquí**, promediando de cuatro en
 *   cuatro con `ffmpeg`, porque los niveles bajos del IGN son otro mosaico,
 *   con otra exposición, y mezclarlos dibujaría costuras de color.
 * - **`s2`**, Sentinel-2 cloudless de EOX, la tanda de 2025, CC BY-NC-SA 4.0:
 *   Paraguay entero hasta z12 y los pasillos de sus rutas hasta z14, que es
 *   todo lo que da un satélite de diez metros. Es un solo mosaico a todos los
 *   niveles, así que todos se piden tal cual.
 *
 * ## Lo que hace
 *
 * 1. Dónde hay tierra, con el relieve que ya está en `data/terrain/` (solo en
 *    Canarias): así no se piden miles de teselas de mar. Las que aun así
 *    salen lisas —el IGN contesta con un JPEG de novecientos bytes en el
 *    mar— se apuntan y no se vuelven a pedir.
 * 2. Las teselas del plan, nivel a nivel, y las promediadas si toca.
 * 3. El índice, `manifiesto.json`, con lo que hay de verdad en disco y lo que
 *    pesa cada isla. Se reescribe después de cada paso, así que una tirada
 *    cortada a medias ya deja algo que el juego puede usar.
 *
 * ## Lo que no hace
 *
 * Versionarlas. Son decenas de miles de ficheros y cientos de megas, y el
 * repositorio no es sitio para eso: van al servidor de la web con el resto
 * del juego (`deploy-oga-veve.sh`) y se pueden rehacer con este guion, que es
 * lo que sí está versionado. Ver el ADR 0018.
 *
 * ## Uso
 *
 *   node scripts/ortofoto-a-teselas.mjs                    # las siete islas
 *   node scripts/ortofoto-a-teselas.mjs la-palma tenerife  # esas
 *   node scripts/ortofoto-a-teselas.mjs --fuente s2        # Paraguay
 *   node scripts/ortofoto-a-teselas.mjs --plan             # cuántas, sin bajar nada
 *   node scripts/ortofoto-a-teselas.mjs --a /otra/carpeta  # a otro sitio
 *
 * Sale a `data/teselas/<fuente>/<z>/<x>/<y>.jpg`. Se puede cortar y
 * relanzar: lo que ya está en disco no se vuelve a pedir. **Y no se lanzan
 * dos tiradas de la misma isla a la vez**: la segunda pisaría a la primera.
 * Cada isla deja un cerrojo con su PID mientras corre, y otra tirada que lo
 * encuentre vivo se niega.
 *
 * Medido el 5 de octubre de 2026: el IGN dio entre cuarenta y cincuenta
 * teselas por segundo con ocho peticiones a la vez, y las siete islas
 * —17.137 teselas, 197 MB— salieron en ocho minutos. Otro día puede ir diez
 * veces más lento: en segundo plano.
 *
 * Hace falta `ffmpeg` en la máquina, como para `ortofoto-publica.mjs`. No es
 * dependencia del juego: corre aquí.
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { mkdir, rm, writeFile, appendFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CAJA_DE_PARAGUAY,
  ISLAS_CANARIAS,
  NIVEL_MIN,
  NIVEL_PEDIDO_MIN,
  NIVEL_MAX,
  NIVEL_DE_SENTINEL,
  LADO_DE_TESELA,
  aIndice,
  deLlave,
  islaDe,
  madresHasta,
  pistasEnGrados,
  planDeLaIsla,
  planDeParaguay,
  tierraDeLosRelieves,
} from '../src/world/cobertura-de-teselas.ts';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

const FUENTES = {
  pnoa: {
    id: 'pnoa',
    fuente: 'PNOA · Instituto Geográfico Nacional de España',
    licencia: 'CC BY 4.0 · scne.es',
    servicio: 'https://www.ign.es/wmts/pnoa-ma',
    capa: 'OI.OrthoimageCoverage',
    nivelMax: NIVEL_MAX,
    nota:
      'Teselas del mosaico EPSG:3857 tal cual las sirve el IGN de z14 a z16; ' +
      'z11 a z13 promediadas aquí a partir de las de z14. Ver scripts/ortofoto-a-teselas.mjs.',
    url: (z, x, y) =>
      'https://www.ign.es/wmts/pnoa-ma?service=WMTS&request=GetTile&version=1.0.0' +
      '&layer=OI.OrthoimageCoverage&style=default&format=image/jpeg' +
      `&tilematrixset=EPSG:3857&TileMatrix=${z}&TileRow=${y}&TileCol=${x}`,
  },
  s2: {
    id: 's2',
    fuente: 'Sentinel-2 cloudless · EOX IT Services, sobre datos Copernicus/ESA',
    // La misma que en `ortofoto-publica.mjs`: ver allí por qué esta y no otra.
    licencia:
      'CC BY-NC-SA 4.0 · EOX s2cloudless, uso no comercial —juego gratuito, de código abierto y sin fines de lucro—. Consultado 2026-09-12 en cloudless.eox.at/documentation/license',
    servicio: 'https://tiles.maps.eox.at/wmts',
    capa: 's2cloudless-2025_3857',
    nivelMax: NIVEL_DE_SENTINEL,
    nota:
      'Teselas del mosaico EPSG:3857 tal cual las sirve EOX, de z11 a z14: un solo ' +
      'mosaico a todos los niveles. Ver scripts/ortofoto-a-teselas.mjs.',
    url: (z, x, y) =>
      'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default' +
      `/GoogleMapsCompatible/${z}/${y}/${x}.jpg`,
  },
};

/** La zona de Paraguay, como si fuera una isla: para el índice y el cerrojo. */
const PARAGUAY = { id: 'paraguay', nombre: 'Paraguay', caja: CAJA_DE_PARAGUAY };

/**
 * Los campos de Paraguay por su aeródromo: el origen de cada uno, que es de
 * donde sale todo lo demás del escenario.
 */
function cargarCampos() {
  const out = {};
  for (const id of ['sgas', 'sgay', 'sgco', 'sgen', 'sges', 'sgme', 'sgpi', 'sgpj', 'yvytu']) {
    const aero = JSON.parse(readFileSync(join(RAIZ, 'data', 'aerodromes', `${id}.aero.json`), 'utf8'));
    // Por su identificador, que es como van las rutas: ver `RUTAS_DE_PARAGUAY`.
    out[aero.id] = aero.origin;
  }
  return out;
}

/** Por debajo de esto, el JPEG es el liso del mar: medido, 912 bytes. */
const LISO = 1500;

/** Cuántas peticiones a la vez. Ocho es lo que el IGN aguantó sin quejarse. */
const A_LA_VEZ = 8;

const args = process.argv.slice(2);
const SOLO_PLAN = args.includes('--plan');
const dondeFuente = args.indexOf('--fuente');
const FUENTE = FUENTES[dondeFuente >= 0 ? args[dondeFuente + 1] : 'pnoa'];
if (!FUENTE) {
  console.error(`fuentes: ${Object.keys(FUENTES).join(', ')}`);
  process.exit(1);
}
const dondeA = args.indexOf('--a');
const SALIDA =
  dondeA >= 0 && args[dondeA + 1]
    ? args[dondeA + 1]
    : join(RAIZ, 'data', 'teselas', FUENTE.id);
const pedidas = args.filter(
  (a, i) => !a.startsWith('--') && args[i - 1] !== '--a' && args[i - 1] !== '--fuente',
);
const TODAS = FUENTE.id === 's2' ? [PARAGUAY] : ISLAS_CANARIAS;
const ISLAS = pedidas.length ? TODAS.filter((i) => pedidas.includes(i.id)) : TODAS;
if (pedidas.length && ISLAS.length !== pedidas.length) {
  console.error(`islas: ${TODAS.map((i) => i.id).join(', ')}`);
  process.exit(1);
}

// ── Dónde hay tierra ──────────────────────────────────────────────────────

/**
 * Los mapas de relieve de Canarias que hay en `data/terrain/`, finos y
 * lejanos. Dónde hay tierra lo decide `tierraDeLosRelieves`.
 */
function cargarRelieves() {
  const dir = join(RAIZ, 'data', 'terrain');
  const mapas = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const ficha = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const bin = join(dir, f.replace(/\.json$/, '.bin'));
    if (!ficha.origen || !existsSync(bin)) continue;
    // Solo los de Canarias: el resto no cubre ninguna isla y cuesta memoria.
    if (ficha.origen.lat < 27 || ficha.origen.lat > 30 || ficha.origen.lon > -13) continue;
    const b = readFileSync(bin);
    mapas.push({
      origen: ficha.origen,
      tamanoM: ficha.tamanoM,
      datos: new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)),
    });
  }
  return mapas;
}

function cargarPistas() {
  const dir = join(RAIZ, 'data', 'aerodromes');
  const out = [];
  for (const f of readdirSync(dir)) {
    if (!/^gc\w+\.aero\.json$/.test(f)) continue;
    out.push(...pistasEnGrados(JSON.parse(readFileSync(join(dir, f), 'utf8'))));
  }
  return out;
}

function cargarCumbres() {
  const d = JSON.parse(readFileSync(join(RAIZ, 'data', 'hitos', 'destacados.json'), 'utf8'));
  const out = [];
  for (const h of d.destacados) {
    if (h.zona !== 'canarias') continue;
    for (const p of h.puntos) out.push({ clave: h.clave, lat: p[0], lon: p[1] });
  }
  return out;
}

// ── Pedir y guardar ───────────────────────────────────────────────────────

const ruta = (t) => join(SALIDA, String(t.z), String(t.x), `${t.y}.jpg`);

/** Las que ya se sabe que son mar, para no volver a pedirlas. */
async function leerMar() {
  const f = join(SALIDA, 'mar.txt');
  if (!existsSync(f)) return new Set();
  return new Set((await readFile(f, 'utf8')).split('\n').filter(Boolean));
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function pedir(t) {
  for (let intento = 0; intento < 5; intento++) {
    try {
      const res = await fetch(FUENTE.url(t.z, t.x, t.y), { signal: AbortSignal.timeout(30000) });
      if (res.status === 404 || res.status === 400) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (intento === 4) throw e;
      await espera(1000 * 2 ** intento);
    }
  }
  return null;
}

async function bajar(lista, mar, rotulo) {
  const faltan = lista.filter((k) => !mar.has(k) && !existsSync(ruta(deLlave(k))));
  let hechas = 0;
  let bytes = 0;
  let lisas = 0;
  let fallos = 0;
  const t0 = Date.now();
  let i = 0;
  const obrero = async () => {
    while (i < faltan.length) {
      const k = faltan[i++];
      const t = deLlave(k);
      try {
        const b = await pedir(t);
        if (!b || b.length < LISO) {
          mar.add(k);
          await appendFile(join(SALIDA, 'mar.txt'), `${k}\n`);
          lisas++;
        } else {
          await mkdir(dirname(ruta(t)), { recursive: true });
          await writeFile(ruta(t), b);
          bytes += b.length;
        }
      } catch (e) {
        fallos++;
        if (fallos < 20) console.log(`\n  ${k}: ${e.message}`);
      }
      hechas++;
      if (hechas % 200 === 0 || hechas === faltan.length) {
        const s = (Date.now() - t0) / 1000;
        process.stdout.write(
          `\r  ${rotulo}: ${hechas}/${faltan.length} · ${(bytes / 1048576).toFixed(1)} MB · ` +
            `${lisas} de mar · ${fallos} fallos · ${(hechas / s).toFixed(1)}/s   `,
        );
      }
    }
  };
  await Promise.all(Array.from({ length: A_LA_VEZ }, obrero));
  process.stdout.write(`\r  ${rotulo}: ${faltan.length} pedidas, ${lista.length - faltan.length} ya estaban · ${(bytes / 1048576).toFixed(1)} MB · ${lisas} de mar · ${fallos} fallos\n`);
}

/** Lanza ffmpeg y espera. */
const ffmpeg = (a) =>
  new Promise((listo, falla) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' });
    p.on('close', (c) => (c === 0 ? listo() : falla(new Error(`ffmpeg salió con ${c}`))));
  });

/**
 * Una tesela gruesa a partir de sus cuatro hijas, promediando. La que falte
 * —mar— va en negro: es agua, y el agua la pinta el juego por encima.
 */
async function promediar(t) {
  const entradas = [];
  for (const h of [
    { x: t.x * 2, y: t.y * 2 },
    { x: t.x * 2 + 1, y: t.y * 2 },
    { x: t.x * 2, y: t.y * 2 + 1 },
    { x: t.x * 2 + 1, y: t.y * 2 + 1 },
  ]) {
    const f = ruta({ z: t.z + 1, ...h });
    if (existsSync(f)) entradas.push('-i', f);
    else entradas.push('-f', 'lavfi', '-i', `color=c=black:s=${LADO_DE_TESELA}x${LADO_DE_TESELA}`);
  }
  await mkdir(dirname(ruta(t)), { recursive: true });
  await ffmpeg([
    ...entradas,
    '-filter_complex',
    `[0][1]hstack[a];[2][3]hstack[b];[a][b]vstack,scale=${LADO_DE_TESELA}:${LADO_DE_TESELA}:flags=area`,
    '-frames:v', '1', '-q:v', '3', ruta(t),
  ]);
}

async function hacerGruesas(deZ14) {
  const madres = madresHasta(deZ14);
  for (let z = NIVEL_PEDIDO_MIN - 1; z >= NIVEL_MIN; z--) {
    const lista = [...(madres.get(z) ?? [])];
    let hechas = 0;
    for (const k of lista) {
      const t = deLlave(k);
      if (!existsSync(ruta(t))) await promediar(t);
      hechas++;
    }
    console.log(`  z${z}: ${hechas} hechas promediando`);
  }
}

// ── El índice ─────────────────────────────────────────────────────────────

function* enDisco() {
  if (!existsSync(SALIDA)) return;
  for (const z of readdirSync(SALIDA)) {
    if (!/^\d+$/.test(z)) continue;
    for (const x of readdirSync(join(SALIDA, z))) {
      for (const f of readdirSync(join(SALIDA, z, x))) {
        if (!f.endsWith('.jpg')) continue;
        const t = { z: Number(z), x: Number(x), y: Number(f.slice(0, -4)) };
        yield { t, bytes: statSync(ruta(t)).size };
      }
    }
  }
}

async function escribirIndice() {
  const todas = [];
  const porIsla = new Map();
  let total = 0;
  for (const { t, bytes } of enDisco()) {
    todas.push(t);
    total += bytes;
    const id = islaDe(t, TODAS)?.id ?? 'fuera';
    const i = porIsla.get(id) ?? { teselas: {}, bytes: 0 };
    i.teselas[t.z] = (i.teselas[t.z] ?? 0) + 1;
    i.bytes += bytes;
    porIsla.set(id, i);
  }
  const manifiesto = {
    fuente: FUENTE.fuente,
    licencia: FUENTE.licencia,
    servicio: FUENTE.servicio,
    capa: FUENTE.capa,
    nota: FUENTE.nota,
    generado: new Date().toISOString().slice(0, 10),
    lado: LADO_DE_TESELA,
    nivelMin: NIVEL_MIN,
    nivelMax: FUENTE.nivelMax,
    islas: TODAS.map((i) => ({
      id: i.id,
      nombre: i.nombre,
      caja: i.caja,
      ...(porIsla.get(i.id) ?? { teselas: {}, bytes: 0 }),
    })),
    teselas: todas.length,
    bytes: total,
    indice: aIndice(todas),
  };
  await writeFile(join(SALIDA, 'manifiesto.json'), `${JSON.stringify(manifiesto)}\n`);
  console.log(`  índice: ${todas.length} teselas, ${(total / 1048576).toFixed(1)} MB`);
}

// ── El cerrojo ────────────────────────────────────────────────────────────

function vivo(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function cerrar(isla) {
  const f = join(SALIDA, `.cerrojo-${isla.id}`);
  if (existsSync(f)) {
    const pid = Number(readFileSync(f, 'utf8'));
    if (pid && pid !== process.pid && vivo(pid)) {
      console.error(`  ${isla.id}: ya hay una tirada en marcha (PID ${pid}); no se lanzan dos de la misma isla`);
      return null;
    }
  }
  await writeFile(f, String(process.pid));
  return async () => rm(f, { force: true });
}

// ── La tirada ─────────────────────────────────────────────────────────────

console.log(`${FUENTE.id} → teselas · salida ${SALIDA}`);
await mkdir(SALIDA, { recursive: true });
const mar = await leerMar();

if (FUENTE.id === 's2') {
  /*
   * **Paraguay**: un solo mosaico a todos los niveles, así que se piden
   * todos tal cual, de los gruesos a los finos.
   */
  const plan = planDeParaguay(cargarCampos());
  console.log(`\nParaguay: ${[...plan].map(([z, s]) => `z${z} ${s.size}`).join(' · ')}`);
  if (!SOLO_PLAN) {
    const abrir = await cerrar(PARAGUAY);
    if (abrir) {
      try {
        for (const [z, lista] of [...plan].sort((a, b) => a[0] - b[0])) {
          await bajar([...lista], mar, `z${z}`);
          await escribirIndice();
        }
      } finally {
        await abrir();
      }
    }
  }
} else {
  const mapas = cargarRelieves();
  const datos = { tierra: tierraDeLosRelieves(mapas), pistas: cargarPistas(), cumbres: cargarCumbres() };
  console.log(
    `  ${mapas.length} relieves, ${datos.pistas.length} pistas, ${datos.cumbres.length} cumbres`,
  );
  for (const isla of ISLAS) {
    const plan = planDeLaIsla(isla, datos);
    const cuenta = [...plan.pedidas].map(([z, s]) => `z${z} ${s.size}`).join(' · ');
    const porPasillo = [...plan.motivo.values()].filter((m) => m === 'pasillo').length;
    console.log(
      `\n${isla.nombre}: ${cuenta} (z${NIVEL_MAX}: ${porPasillo} de pasillo, ` +
        `${plan.motivo.size - porPasillo} de cumbre)`,
    );
    if (SOLO_PLAN) continue;
    const abrir = await cerrar(isla);
    if (!abrir) continue;
    try {
      const z14 = [...plan.pedidas.get(NIVEL_PEDIDO_MIN)];
      await bajar(z14, mar, `z${NIVEL_PEDIDO_MIN}`);
      await hacerGruesas(z14.filter((k) => existsSync(ruta(deLlave(k)))));
      await escribirIndice();
      for (let z = NIVEL_PEDIDO_MIN + 1; z <= NIVEL_MAX; z++) {
        await bajar([...plan.pedidas.get(z)], mar, `z${z}`);
        await escribirIndice();
      }
    } finally {
      await abrir();
    }
  }
}
if (SOLO_PLAN) process.exit(0);
await escribirIndice();
// Para que se vea en el registro que acabó, y no que se cortó.
console.log(`\nhecho · ${new Date().toISOString()}`);

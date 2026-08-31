/**
 * Elegir la semilla de un escenario **midiendo**, no probando a ojo.
 *
 * El relieve es ruido: no sabe que ahí abajo hay un aeropuerto. Si la semilla
 * deja el terreno de alrededor a doscientos metros y el aeródromo está a
 * seiscientos, el aplanado tiene que salvar cuatrocientos y el aeropuerto
 * queda sobre un pedestal. Esto prueba semillas y se queda con la que deja el
 * terreno más cerca de la cota del aeródromo, que es lo que hace que una
 * meseta parezca una meseta.
 *
 * Uso: `npx tsx scripts/buscar-semilla.mjs tenerife-norte`
 */
import { SCENARIOS } from '../src/world/scenarios.ts';
import { buildHeightfield } from '../src/world/terrain.ts';

const id = process.argv[2] ?? 'tenerife-norte';
const base = SCENARIOS.find((s) => s.id === id);
if (!base) throw new Error(`no hay escenario ${id}`);
const cota = base.aerodrome?.elevationM ?? 0;

/** Cota media y desviación en un anillo alrededor del origen. */
function anillo(heights, esc, radio) {
  const res = esc.segments + 1;
  const paso = esc.size / esc.segments;
  const mitad = esc.size / 2;
  const v = [];
  for (let a = 0; a < 64; a++) {
    const t = (a / 64) * Math.PI * 2;
    const col = Math.round((Math.cos(t) * radio + mitad) / paso);
    const row = Math.round((Math.sin(t) * radio + mitad) / paso);
    if (col < 0 || row < 0 || col >= res || row >= res) continue;
    v.push(heights[row * res + col]);
  }
  const media = v.reduce((x, y) => x + y, 0) / v.length;
  const dt = Math.sqrt(v.reduce((x, y) => x + (y - media) ** 2, 0) / v.length);
  return { media, dt, min: Math.min(...v), max: Math.max(...v) };
}

// Se barren también los parámetros del relieve, porque la semilla sola no
// puede con todo: para que quepan el mar y una meseta a seiscientos metros en
// el mismo mapa hace falta que el relieve tenga recorrido de sobra.
const VARIANTES = [{ reliefHeight: base.reliefHeight, reliefScale: base.reliefScale }];

const candidatas = [];
for (const v of VARIANTES)
for (let i = 0; i < 260; i++) {
  const seed = 19770000 + i * 7;
  const esc = { ...base, ...v, seed };
  const h = buildHeightfield(esc);
  const cerca = anillo(h, esc, 2600);
  const lejos = anillo(h, esc, 7000);
  // Se busca: terreno de alrededor a la cota del aeródromo, y **variedad** a
  // lo lejos —si todo está igual de alto no hay isla, hay meseta infinita—.
  const error = Math.abs(cerca.media - cota);
  candidatas.push({ seed, ...v, error, cerca, lejos, mar: lejos.min < esc.waterLevel });
}

candidatas.sort((a, b) => a.error - b.error);
console.log(`${id}: el aeródromo está a ${cota} m`);
console.log('semilla     anillo 2,6 km        anillo 7 km          ¿hay mar?');
const conMar = candidatas.filter((c) => c.mar);
console.log(`${conMar.length} de ${candidatas.length} combinaciones tienen mar a 7 km`);
for (const c of (conMar.length ? conMar : candidatas).slice(0, 10)) {
  console.log(
    `${c.seed} h${c.reliefHeight} e${c.reliefScale}  ${c.cerca.media.toFixed(0).padStart(4)} m ±${c.cerca.dt.toFixed(0).padStart(3)}` +
      `  ·  ${c.lejos.media.toFixed(0).padStart(4)} m de ${c.lejos.min.toFixed(0)} a ${c.lejos.max.toFixed(0)}` +
      `  · ${c.mar ? "sí" : "no"} (error ${c.error.toFixed(0)} m)`,
  );
}

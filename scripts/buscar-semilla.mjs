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

/**
 * Lo más alto que hay **en la prolongación del eje de pista**, hasta cuatro
 * kilómetros de cada cabecera, medido respecto a la propia pista.
 *
 * Es lo que se ve al despegar y lo que hay que sortear al entrar. Un
 * aeropuerto de verdad tiene por dónde salir; si aquí sale +658 m a dos
 * kilómetros y medio —que es lo que salía en el primer Tenerife—, eso no es
 * un aeropuerto, es un circo de montaña.
 */
function muroDelante(heights, esc) {
  const { x, z, heading, length } = esc.runway;
  const rad = (heading * Math.PI) / 180;
  const ux = Math.sin(rad);
  const uz = -Math.cos(rad);
  const cota = esc.aerodrome?.elevationM ?? 0;
  let peor = 0;
  for (const lado of [1, -1]) {
    for (let d = length / 2 + 300; d <= length / 2 + 4000; d += 200) {
      peor = Math.max(peor, sonda(heights, esc, x + ux * d * lado, z + uz * d * lado) - cota);
    }
  }
  return peor;
}

/** Cota de la malla en un punto del mundo. */
function sonda(heights, esc, x, z) {
  const res = esc.segments + 1;
  const paso = esc.size / esc.segments;
  const mitad = esc.size / 2;
  const col = Math.round((x + mitad) / paso);
  const row = Math.round((z + mitad) / paso);
  if (col < 0 || row < 0 || col >= res || row >= res) return 0;
  return heights[row * res + col];
}

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
const VARIANTES = [];
for (const reliefHeight of [1100, 1400, 1700])
  for (const reliefScale of [3.4, 4.4]) VARIANTES.push({ reliefHeight, reliefScale });

const candidatas = [];
for (const v of VARIANTES)
for (let i = 0; i < 90; i++) {
  const seed = 19770000 + i * 7;
  const esc = { ...base, ...v, seed };
  const h = buildHeightfield(esc);
  const cerca = anillo(h, esc, 2600);
  const lejos = anillo(h, esc, 7000);
  const muro = muroDelante(h, esc);
  // Dos cosas a la vez, y la segunda pesa más: que el terreno de alrededor
  // esté a la cota del aeródromo, y que **no haya un muro delante de las
  // cabeceras**. Un aeropuerto de verdad tiene por dónde entrar y por dónde
  // salir; si en la prolongación del eje hay seiscientos metros de montaña a
  // dos kilómetros y medio, eso no es un aeropuerto, es un circo.
  const error = Math.abs(cerca.media - cota) + Math.max(0, muro - 200) * 1.5;
  candidatas.push({ seed, ...v, error, muro: Math.round(muro), cerca, lejos, mar: lejos.min < esc.waterLevel });
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

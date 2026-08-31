/**
 * Ver un escenario desde muy arriba, antes de tener que volarlo.
 *
 * Un escenario se juzga desde la cabina, y desde la cabina se ve un cono de
 * sesenta grados a la altura de los ojos. La forma de la isla, dónde está el
 * mar, si las bandas de color hacen lo que se les pide y si el aeródromo queda
 * en una meseta o sobre un pedestal —nada de eso se ve desde ahí.
 *
 * Esto lo construye entero en un navegador de verdad y lo mira desde encima.
 *
 * Uso: `node scripts/verificar-escenario.mjs tenerife-norte`
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';

const id = process.argv[2] ?? 'tenerife-norte';
const salida = process.argv[3] ?? `/tmp/escenario-${id}.png`;

const server = await createServer({ root: process.cwd(), server: { port: 5197 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const page = await b.newPage();
page.on('pageerror', (e) => console.log('ERROR:', e.message));
await page.goto('http://localhost:5197/');

const r = await page.evaluate(async (id) => {
  const THREE = await import('/node_modules/three/build/three.module.js');
  const { SCENARIOS } = await import('/src/world/scenarios.ts');
  const { Terrain } = await import('/src/world/terrain.ts');
  const esc = SCENARIOS.find((s) => s.id === id);
  if (!esc) throw new Error(`no hay escenario ${id}`);

  const terreno = new Terrain(esc);
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(esc.sky.horizon);
  escena.add(terreno.group);
  escena.add(new THREE.AmbientLight(0xffffff, 1.5));
  const sol = new THREE.DirectionalLight(0xffffff, 1.6);
  sol.position.set(1, 2, 1);
  escena.add(sol);

  const r = esc.size / 2;
  const cam = new THREE.OrthographicCamera(-r, r, r, -r, 1, esc.size * 4);
  cam.position.set(0, esc.size, 0);
  cam.lookAt(0, 0, 0);
  const lienzo = document.createElement('canvas');
  lienzo.width = 1000;
  lienzo.height = 1000;
  const render = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
  render.setSize(1000, 1000, false);
  render.render(escena, cam);
  const png = lienzo.toDataURL('image/png');
  render.dispose();

  // Y las cuentas que la imagen no da: cuánto del mapa es mar, a qué distancia
  // está la costa desde el aeródromo y si el terreno recibe al aeropuerto a su
  // cota o lo deja sobre un pedestal.
  let bajoAgua = 0;
  let total = 0;
  let costa = Infinity;
  // Cuánto del escenario está sumergido. Un río es agua; media provincia, no.
  let celdas = 0;
  let mojadas = 0;
  for (let z = -esc.size / 2; z < esc.size / 2; z += esc.size / 120)
    for (let x = -esc.size / 2; x < esc.size / 2; x += esc.size / 120) {
      celdas++;
      if (terreno.sampleHeight(x, z) < esc.waterLevel) mojadas++;
    }
  for (let a = 0; a < 360; a += 3) {
    const t = (a * Math.PI) / 180;
    for (let d = 200; d < esc.size / 2; d += 100) {
      const h = terreno.sampleHeight(Math.sin(t) * d, -Math.cos(t) * d);
      total++;
      if (h < esc.waterLevel) {
        bajoAgua++;
        costa = Math.min(costa, d);
        break;
      }
    }
  }
  const anillo = [];
  for (let a = 0; a < 360; a += 10) {
    const t = (a * Math.PI) / 180;
    anillo.push(terreno.sampleHeight(Math.sin(t) * 2600, -Math.cos(t) * 2600));
  }

  return {
    png,
    cotaPista: terreno.runwayElevation,
    cotaFichero: esc.aerodrome?.elevationM ?? null,
    costa: Number.isFinite(costa) ? Math.round(costa) : null,
    mojado: Math.round((mojadas / celdas) * 100),
    radiosConMar: Math.round((bajoAgua / (total / (esc.size / 2 / 100))) * 0),
    anilloMin: Math.round(Math.min(...anillo)),
    anilloMax: Math.round(Math.max(...anillo)),
    anilloMedia: Math.round(anillo.reduce((x, y) => x + y, 0) / anillo.length),
  };
}, id);

console.log(`${id}`);
console.log(`  cota de la pista medida: ${r.cotaPista.toFixed(1)} m` +
  (r.cotaFichero !== null ? ` · el fichero dice ${r.cotaFichero} m` : ''));
console.log(`  terreno a 2,6 km: de ${r.anilloMin} a ${r.anilloMax} m, media ${r.anilloMedia} m`);
console.log(`  bajo el agua: ${r.mojado} % del escenario`);
console.log(`  costa más cercana: ${r.costa === null ? 'no hay mar en el escenario' : r.costa + ' m'}`);
writeFileSync(salida, Buffer.from(r.png.split(',')[1], 'base64'));
console.log(`  vista cenital → ${salida}`);

await b.close();
await server.close();

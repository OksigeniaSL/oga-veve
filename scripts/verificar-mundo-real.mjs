/**
 * ¿Hay ciudad de verdad encima de nuestros aeropuertos, y a qué precio?
 *
 * Se vuela la prueba en un navegador y se mira lo que dice el propio
 * renderizador: cuántas teselas carga, cuánto tarda en dejar de descargar y qué
 * error geométrico alcanza. Se hizo primero recorriendo el árbol con `curl` y
 * **el sondeo mentía** —Madrid daba el mismo resultado que mitad del Chaco—,
 * que es lo que pasa cuando se reimplementa a mano lo que ya sabe hacer la
 * biblioteca. El renderizador es el instrumento.
 *
 *     node scripts/verificar-mundo-real.mjs [carpeta]
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const D = process.argv[2] ?? '/tmp';
const server = await createServer({ root: process.cwd(), server: { port: 5173 } });
await server.listen();
const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'],
});

const PLAN = (process.argv[3] ?? 'sgas:700,gcxo:900,madrid:700')
  .split(',')
  .map((x) => x.split(':'));

for (const [sitio, alt] of PLAN) {
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const fallos = [];
  page.on('pageerror', (e) => fallos.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') fallos.push(m.text().slice(0, 120)); });
  page.on('response', (r) => {
    if (r.url().includes('tile.googleapis.com') && !r.ok()) fallos.push(`${r.status()} tesela`);
  });

  const atras = Number(alt) < 300 ? 420 : 2600;
  await page.goto(
    `http://localhost:5173/spike/mundo-real.html?sitio=${sitio}&alt=${alt}&atras=${atras}`,
  );
  // Tiempo para que baje el árbol hasta el detalle fino.
  await page.waitForTimeout(22000);

  const r = await page.evaluate(() => {
    const t = globalThis.__spike?.teselas;
    if (!t) return null;
    let mallas = 0;
    let triangulos = 0;
    let mejorError = Infinity;
    t.group.traverse((o) => {
      if (o.isMesh) {
        mallas++;
        const g = o.geometry;
        triangulos += (g.index ? g.index.count : g.attributes.position.count) / 3;
      }
    });
    // El error geométrico de las teselas que están dibujándose ahora.
    t.forEachLoadedModel?.((_, tile) => {
      if (tile.__visible && tile.geometricError < mejorError) mejorError = tile.geometricError;
    });
    return {
      fps: globalThis.__spike.fps(),
      mallas,
      triangulos: Math.round(triangulos),
      mejorError,
      stats: JSON.parse(JSON.stringify(t.stats ?? {})),
    };
  });

  if (!r) {
    console.log(`${sitio}: no arrancó · ${fallos.slice(0, 3).join(' | ')}`);
  } else {
    const veredicto =
      r.mejorError <= 6 ? 'FOTOGRAMETRÍA' : r.mejorError <= 40 ? 'volumen basto' : 'solo relieve';
    console.log(
      `${sitio.padEnd(7)} ${String(r.fps).padStart(3)} fps · ${String(r.mallas).padStart(4)} mallas · ` +
        `${String(r.triangulos).padStart(8)} triángulos · error mín ${r.mejorError.toFixed(1)} m → ${veredicto}` +
        (fallos.length ? `  ⚠ ${fallos.slice(0, 2).join(' | ')}` : ''),
    );
  }
  await page.screenshot({ path: `${D}/mundo-${sitio}.png` });
  await page.close();
}
await b.close();
await server.close();

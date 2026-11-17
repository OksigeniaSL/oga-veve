/**
 * Una foto del mapa abierto, que es lo único que dice si se entiende.
 *
 *   node scripts/ver-mapa.mjs <carpeta> [escenario…]
 *
 * El puerto, `OGA_PUERTO`; el peldaño, `OGA_TRAMO` («taguato-ruvicha» para
 * ver el calco de la radio). Con la tarjeta de verdad, como `ver-carta.mjs`:
 * cada foto dice con qué se dibujó.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { baseDe } from './servidor.mjs';
const D = process.argv[2] ?? '/tmp';
const ESCENARIOS = process.argv.slice(3).length ? process.argv.slice(3) : ['pettirossi', 'tenerife-norte'];
const PUERTO = Number(process.env.OGA_PUERTO ?? 5225);
const TRAMO = process.env.OGA_TRAMO ?? '';
const server = await createServer({ root: process.cwd(), server: { port: PUERTO, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const BASE = baseDe(server, PUERTO);
const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
try {
  for (const esc of ESCENARIOS) {
    const page = await b.newPage({ viewport: { width: 1280, height: 800 }, locale: 'es-PY' });
    page.on('pageerror', (e) => console.log('ERROR:', e.message));
    await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
    await page.goto(`${BASE}/?escenario=${esc}&hora=16${TRAMO ? `&tramo=${TRAMO}` : ''}`);
    await page.waitForSelector('[data-hud="mapa-boton"]', { timeout: 120000 });
    await page.waitForTimeout(4500);
    const tarjeta = await page.evaluate(() => {
      const g = document.createElement('canvas').getContext('webgl');
      const i = g?.getExtension('WEBGL_debug_renderer_info');
      return i ? g.getParameter(i.UNMASKED_RENDERER_WEBGL) : 'sin WebGL';
    });
    await page.evaluate(() => document.querySelector('[data-hud="mapa-boton"]')?.click());
    await page.waitForTimeout(600);
    // Los cuatro alcances, que es lo que hay que mirar.
    for (let z = 0; z < 4; z++) {
      if (z) await page.evaluate(() => document.querySelector('[data-hud="mapa"] [data-accion="cerca"]')?.click());
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${D}/mapa-${esc}${TRAMO ? `-${TRAMO}` : ''}-z${z}.png` });
    }
    console.log(`${esc} (${tarjeta}) → ${D}/mapa-${esc}${TRAMO ? `-${TRAMO}` : ''}-z*.png`);
    await page.close();
  }
} finally {
  await b.close();
  await server.close();
}

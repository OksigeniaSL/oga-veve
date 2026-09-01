/** Una foto del mapa abierto, que es lo único que dice si se entiende. */
import { chromium } from 'playwright';
import { createServer } from 'vite';
const D = process.argv[2] ?? '/tmp';
const server = await createServer({ root: process.cwd(), server: { port: 5225 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
for (const esc of ['pettirossi', 'tenerife-norte']) {
  const page = await b.newPage({ viewport: { width: 1280, height: 800 }, locale: 'es-PY' });
  page.on('pageerror', (e) => console.log('ERROR:', e.message));
  await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
  await page.goto(`http://localhost:5225/?escenario=${esc}`);
  await page.waitForTimeout(4500);
  await page.click('[data-hud="mapa-boton"]');
  await page.waitForTimeout(600);
  const caja = await page.$('[data-hud="mapa"]');
  await caja.screenshot({ path: `${D}/mapa-${esc}.png` });
  console.log(`${esc} → ${D}/mapa-${esc}.png`);
  await page.close();
}
await b.close();
await server.close();

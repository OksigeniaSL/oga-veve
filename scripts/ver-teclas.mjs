/** La pantalla de teclas, en los dos peldaños. */
import { chromium } from 'playwright';
import { createServer } from 'vite';
const D = process.argv[2] ?? '/tmp';
const server = await createServer({ root: process.cwd(), server: { port: 5243 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
for (const tramo of ['guyrami', 'taguato']) {
  const page = await b.newPage({ viewport: { width: 1000, height: 900 }, locale: 'es-PY' });
  page.on('pageerror', (e) => console.log('ERROR:', e.message));
  await page.addInitScript((t) => {
    localStorage.setItem('oga-veve:teclas-vistas', '1');
    localStorage.setItem('oga-veve:tramo', t);
  }, tramo);
  await page.goto('http://localhost:5243/?escenario=tenerife-norte&leccion=despegue&teselas=0');
  await page.waitForTimeout(3500);
  await page.click('[data-hud="keys"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${D}/teclas-${tramo}.png` });
  console.log(`${tramo} → teclas-${tramo}.png`);
  await page.close();
}
await b.close();
await server.close();

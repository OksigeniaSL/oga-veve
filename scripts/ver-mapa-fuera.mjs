/** El mapa cuando el avión se ha ido del mundo, que es lo que no contemplaba. */
import { chromium } from 'playwright';
import { createServer } from 'vite';
const D = process.argv[2] ?? '/tmp';
const server = await createServer({ root: process.cwd(), server: { port: 5245 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const page = await b.newPage({ viewport: { width: 900, height: 900 }, locale: 'es-PY' });
page.on('pageerror', (e) => console.log('ERROR:', e.message));
await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
await page.goto('http://localhost:5245/?escenario=tenerife-norte&leccion=aterrizaje&teselas=0');
await page.waitForTimeout(3500);
await page.click('[data-hud="mapa-boton"]');
await page.waitForTimeout(400);

for (const [nombre, km] of [['dentro', 4], ['borde', 11], ['lejos', 40], ['grancanaria', 70]]) {
  await page.evaluate((km) => {
    const s = globalThis.__oga.estado();
    // Rumbo a Gran Canaria: al sureste.
    s.position.x = km * 1000 * 0.87;
    s.position.z = km * 1000 * 0.49;
  }, km);
  await page.waitForTimeout(900);
  const caja = await page.$('[data-hud="mapa"]');
  await caja.screenshot({ path: `${D}/fuera-${nombre}.png` });
  console.log(`${nombre} (${km} km) → fuera-${nombre}.png`);
}
await b.close();
await server.close();

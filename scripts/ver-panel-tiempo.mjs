/** El panel del tiempo con el sol puesto, y que arrastrarlo cambie el cielo. */
import { chromium } from 'playwright';
import { createServer } from 'vite';
const D = process.argv[2] ?? '/tmp';
const server = await createServer({ root: process.cwd(), server: { port: 5235 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const page = await b.newPage({ viewport: { width: 1100, height: 700 }, locale: 'es-PY' });
page.on('pageerror', (e) => console.log('ERROR:', e.message));
await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
await page.goto('http://localhost:5235/?escenario=tenerife-norte&leccion=aterrizaje');
await page.waitForTimeout(4000);
await page.click('[data-hud="tiempo-boton"]');
await page.waitForTimeout(500);

const sol = await page.$('[data-hud="tiempo-sol"]');
const caja = await sol.boundingBox();
const cx = caja.x + caja.width / 2;
const cy = caja.y + caja.height / 2;
const r = caja.width * 0.4;

// Arrastrar el sol a varias horas y ver si el cielo obedece.
for (const [nombre, hora] of [['amanecer', 7], ['mediodia', 12], ['ocaso', 18.5], ['noche', 23]]) {
  const a = ((hora - 12) / 24) * Math.PI * 2;
  await page.mouse.move(cx + Math.sin(a) * r, cy - Math.cos(a) * r);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${D}/panel-${nombre}.png` });
  console.log(`${nombre} (${hora} h) → panel-${nombre}.png`);
}
await b.close();
await server.close();

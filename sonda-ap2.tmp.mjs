import { chromium } from 'playwright';
import { createServer } from 'vite';
const server = await createServer({ root: process.cwd(), server: { port: 5311, hmr: false } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle','--use-angle=gl','--enable-unsafe-swiftshader'] });
const page = await b.newPage({ viewport: { width: 1280, height: 800 }, locale: 'es-PY' });
page.on('pageerror', e => console.log('ERROR:', e.message));
await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas','1'));
await page.goto('http://localhost:5311/?escenario=tenerife-norte&hora=12&leccion=vuelta&tramo=taguato-ruvicha&avion=jaz-120');
await page.waitForTimeout(23000);
await page.evaluate(() => globalThis.__oga.colocar(0, 3000, -20000, 150, 1.0));
await page.evaluate(() => { globalThis.__oga.controles().throttle = 1; });
await page.waitForTimeout(3000);
// Se engancha el piloto automático, como con el botón.
await page.evaluate(() => document.querySelector('[data-hud="piloto-auto"]')?.click());
const y0 = await page.evaluate(() => globalThis.__oga.estado().position.y);
let peor = 0, rapido = 0;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() => {
    const s = globalThis.__oga.estado();
    return { y: s.position.y, tas: s.airspeed, gas: globalThis.__oga.controles().throttle };
  });
  peor = Math.max(peor, Math.abs(r.y - y0));
  rapido = Math.max(rapido, r.tas);
  if (i % 10 === 0) console.log(`  ${i*3}s  alt ${Math.round(r.y)} m (${Math.round(r.y-y0)})  tas ${r.tas.toFixed(0)} m/s  gas ${r.gas.toFixed(2)}`);
}
console.log(`dos minutos de piloto automático: se fue ${Math.round(peor)} m como mucho`);
await b.close(); await server.close();

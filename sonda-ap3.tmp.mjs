import { chromium } from 'playwright';
import { createServer } from 'vite';
const server = await createServer({ root: process.cwd(), server: { port: 5313, hmr: false } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle','--use-angle=gl','--enable-unsafe-swiftshader'] });
const page = await b.newPage({ viewport: { width: 1280, height: 800 }, locale: 'es-PY' });
page.on('pageerror', e => console.log('ERROR:', e.message));
await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas','1'));
await page.goto('http://localhost:5313/?escenario=tenerife-norte&hora=12&leccion=vuelta&tramo=taguato-ruvicha&avion=jaz-120');
await page.waitForTimeout(23000);
await page.evaluate(() => globalThis.__oga.colocar(0, 3000, -20000, 150, 1.0));
await page.evaluate(() => { globalThis.__oga.controles().throttle = 1; });
await page.waitForTimeout(3000);
await page.evaluate(() => document.querySelector('[data-hud="piloto-auto"]')?.click());
const y0 = await page.evaluate(() => globalThis.__oga.estado().position.y);
let peor = 0; const gases = [];
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() => {
    const s = globalThis.__oga.estado();
    return { y: s.position.y, tas: s.airspeed, gas: globalThis.__oga.controles().throttle };
  });
  peor = Math.max(peor, Math.abs(r.y - y0));
  gases.push(r.gas);
  if (i % 13 === 0) console.log(`  ${i*3}s  alt ${Math.round(r.y)} (${Math.round(r.y-y0)} m)  tas ${r.tas.toFixed(0)}  gas ${r.gas.toFixed(2)}`);
}
console.log(`dos minutos: se fue ${Math.round(peor)} m · gas entre ${Math.min(...gases).toFixed(2)} y ${Math.max(...gases).toFixed(2)}`);
await b.close(); await server.close();

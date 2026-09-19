import { chromium } from 'playwright';
import { createServer } from 'vite';
const server = await createServer({ root: process.cwd(), server: { port: 5317, hmr: false } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle','--use-angle=gl','--enable-unsafe-swiftshader'] });
const page = await b.newPage({ viewport: { width: 1100, height: 700 }, locale: 'es-PY' });
page.on('pageerror', e => console.log('ERROR:', e.message));
await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas','1'));
await page.goto('http://localhost:5317/?escenario=cuatro-vientos&hora=12&leccion=despegue&tramo=guyrami&avion=jaz-20');
await page.waitForTimeout(24000);
await page.evaluate(() => globalThis.__oga.acelerar?.(8));
await page.waitForTimeout(45000);
const r = await page.evaluate(() => ({
  torre: globalThis.__oga.dichoTodo().torre,
  descartes: globalThis.__oga.descartadas().filter((d) => d.includes('torre')),
}));
console.log('torre dijo:', JSON.stringify(r.torre));
console.log('descartes :', JSON.stringify(r.descartes.slice(-12)));
await b.close(); await server.close();

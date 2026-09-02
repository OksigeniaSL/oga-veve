/** Las luces de aproximación y el PAPI, vistos desde final. */
import { chromium } from 'playwright';
import { createServer } from 'vite';
const D = process.argv[2] ?? '/tmp';
const server = await createServer({ root: process.cwd(), server: { port: 5254 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'] });
const page = await b.newPage({ viewport: { width: 1280, height: 720 }, locale: 'es-PY' });
page.on('pageerror', (e) => console.log('ERROR:', e.message));
await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
await page.goto('http://localhost:5254/?escenario=pettirossi');
await page.waitForTimeout(45000);
// Motor en marcha: si no, el juego recoloca el avión al puesto al moldear.
await page.keyboard.press('i');
await page.waitForTimeout(2000);
console.log('cabecera:', await page.evaluate(() => globalThis.__oga.puntoDeFinal?.(0)?.cabecera));
for (const [nombre, alt] of [['luces-senda', 1.0], ['luces-alto', 1.7], ['luces-bajo', 0.5]]) {
  await page.evaluate((alt) => {
    const o = globalThis.__oga, s = o.estado();
    const d = 1600;
    const p = o.puntoDeFinal(d);
    s.position.x = p.x; s.position.z = p.z; s.heading = p.h;
    s.position.y = p.suelo + Math.tan((3 * Math.PI) / 180) * (d + 300) * alt;
    s.velocity.x = 0; s.velocity.y = 0; s.velocity.z = 0; s.pitch = -0.03;
  }, alt);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${D}/${nombre}.png` });
  console.log(nombre);
}
await b.close();
await server.close();

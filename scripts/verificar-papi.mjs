/**
 * ¿Dice el PAPI la verdad, y están las luces donde apuntan?
 *
 * Las pruebas de `aproximacion.test.ts` comprueban la cuenta del ángulo. Esto
 * comprueba otra cosa: que en el juego de verdad, volando en final, las cuatro
 * luces salgan del color que les toca. Son dos preguntas distintas y la segunda
 * es la que importa — la primera ya salía bien cuando las luces ni existían,
 * porque nadie las montaba sin fotografía.
 *
 * En la senda de tres grados tienen que verse dos blancas y dos rojas; alto,
 * las cuatro blancas; bajo, las cuatro rojas.
 */
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
await page.goto('http://localhost:5254/?escenario=pettirossi&teselas=0');
await page.waitForTimeout(6000);
// Motor en marcha: si no, el juego recoloca el avión al puesto al moldear.
await page.keyboard.press('i');
await page.waitForTimeout(2000);
console.log('cabecera:', await page.evaluate(() => globalThis.__oga.puntoDeFinal?.(0)?.cabecera));
for (const [nombre, alt] of [['luces-senda', 1.0], ['luces-alto', 1.7], ['luces-bajo', 0.5]]) {
  await page.evaluate((alt) => {
    const o = globalThis.__oga, s = o.estado();
    const d = 900;
    const p = o.puntoDeFinal(d);
    s.position.x = p.x; s.position.z = p.z; s.heading = p.h;
    s.position.y = p.suelo + Math.tan((3 * Math.PI) / 180) * (d + 300) * alt;
    // Volando de verdad hacia la pista: sin velocidad se desploma y la cámara
    // pica al suelo antes de que se pueda ver nada.
    const v = 45;
    s.velocity.x = Math.sin(p.h) * v;
    s.velocity.z = -Math.cos(p.h) * v;
    s.velocity.y = -v * Math.tan((3 * Math.PI) / 180);
    s.pitch = -0.03;
    s.airspeed = v;
  }, alt);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${D}/${nombre}.png` });
  const papi = await page.evaluate(() => globalThis.__oga.papi?.() ?? null);
  console.log(nombre, '·', papi ? papi.join(' ') : 'sin papi');
}
await b.close();
await server.close();

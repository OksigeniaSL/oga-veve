/**
 * ¿Se ve el río Paraguay desde el aire? ¿Y qué se ve sobre el Atlántico?
 *
 * Dos preguntas que solo se contestan mirando. El río es lo que se reconoce de
 * Asunción antes que nada, y el mar de Tenerife ahora sale de la fotografía —y
 * la fotografía, ahí, trae **el fondo del mar**, no el agua. Si eso se está
 * dibujando, volar a Gran Canaria es volar sobre un cañón marrón.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const D = process.argv[2] ?? '/tmp';
const server = await createServer({ root: process.cwd(), server: { port: 5249 } });
await server.listen();
const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'],
});

const mirar = async (escenario, tomas) => {
  const page = await b.newPage({ viewport: { width: 1280, height: 720 }, locale: 'es-PY' });
  page.on('pageerror', (e) => console.log('ERROR:', e.message));
  await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
  await page.goto(`http://localhost:5249/?escenario=${escenario}`);
  await page.waitForTimeout(32000);
  for (const [nombre, sitio] of tomas) {
    await page.evaluate((p) => {
      const s = globalThis.__oga.estado();
      s.position.x = p.x;
      s.position.z = p.z;
      s.position.y = p.y;
      s.heading = p.h;
      s.pitch = p.pitch ?? -0.25;
      s.velocity.x = 0;
      s.velocity.y = 0;
      s.velocity.z = 0;
    }, sitio);
    await page.waitForTimeout(14000);
    await page.screenshot({ path: `${D}/${nombre}.png` });
    console.log(`${nombre}.png`);
  }
  await page.close();
};

// Asunción: sobre el aeropuerto mirando al oeste, que es por donde va el río.
await mirar('pettirossi', [
  ['rio-cerca', { x: 0, z: 0, y: 900, h: Math.PI * 1.5 }],
  ['rio-encima', { x: -9000, z: 2000, y: 1400, h: Math.PI * 1.35 }],
  ['casas-asuncion', { x: -6000, z: 1000, y: 350, h: Math.PI * 1.4, pitch: -0.12 }],
]);
// Tenerife: mar adentro camino de Gran Canaria.
await mirar('tenerife-norte', [
  ['mar-25km', { x: 21750, z: 12250, y: 2000, h: 2.1 }],
  ['casas-tenerife', { x: -3500, z: 2500, y: 350, h: 1.2, pitch: -0.12 }],
  // En final por la 30, a tres kilómetros y en la senda: aquí se ve el PAPI.
  ['final-30', { x: 2400, z: 1300, y: 790, h: 5.05, pitch: -0.06 }],
]);

await b.close();
await server.close();

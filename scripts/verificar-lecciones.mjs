/**
 * Las cuatro lecciones, comprobadas en un navegador.
 *
 * Cada una tiene que arrancar donde dice y encender solo lo suyo. Es fácil
 * escribir cuatro objetos con banderas y que ninguna cambie nada.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ root: process.cwd(), server: { port: 5227 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });

for (const leccion of ['vuelta', 'rodaje', 'despegue', 'aterrizaje']) {
  const page = await b.newPage({ viewport: { width: 1000, height: 700 }, locale: 'es-PY' });
  page.on('pageerror', (e) => console.log('ERROR:', e.message));
  await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
  await page.goto(`http://localhost:5227/?escenario=tenerife-norte&leccion=${leccion}`);
  await page.waitForTimeout(3500);

  const r = await page.evaluate(async () => {
    const o = globalThis.__oga;
    const s = o.estado();
    const { SCENARIOS } = await import('/src/world/scenarios.ts');
    const esc = SCENARIOS.find((e) => e.id === 'tenerife-norte');
    return {
      agl: Math.round(s.position.y - (esc.aerodrome ? 0 : 0)),
      y: Math.round(s.position.y),
      vel: Math.round(s.airspeed),
      motor: o.controles().engineOn,
      puntosDeRuta: o.ruta().length,
      fase: o.fase(),
      torre: !!document.querySelector('[data-hud="torre"]:not([hidden])'),
    };
  });
  console.log(
    leccion.padEnd(11),
    'y=' + String(r.y).padStart(4) + ' m',
    'vel=' + String(r.vel).padStart(2),
    'motor=' + (r.motor ? 'sí ' : 'no '),
    'raya=' + String(r.puntosDeRuta).padStart(3) + ' puntos',
    'fase=' + r.fase,
  );
  await page.screenshot({ path: `${process.argv[2] ?? '/tmp'}/leccion-${leccion}.png` });
  await page.close();
}
await b.close();
await server.close();

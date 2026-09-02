/**
 * ¿Cuántas veces salta el avión al empezar una partida?
 *
 * Debería ser **una**: aparece donde va a quedarse. Antes eran tres, y así se
 * describió jugando: «vengo aquí, luego me traga el Iberia y luego voy al sitio
 * nuevo donde ya no hay grandullones que me comen. Ya podría aparecer aquí a la
 * primera».
 *
 * Los tres saltos salían de decidir el puesto en tres momentos distintos: al
 * arrancar sin fotografía, al llegar la fotografía, y otra vez cuando por fin
 * se podía medir si el puesto tenía un avión encima. Ese último se quitó al
 * cambiar de criterio — los puestos a menos de sesenta metros de un edificio
 * son pasarelas, y eso lo dice OpenStreetMap desde el primer fotograma, sin
 * necesidad de fotografía ninguna.
 *
 * Queda un movimiento inevitable y **vertical**: cuando llega la fotografía el
 * suelo entero sube el datum —cuarenta y siete metros en Tenerife— y el avión
 * tiene que subir con él. Eso no se ve, porque la cámara sube igual.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

/** Cuánto tiene que moverse en horizontal para llamarlo un salto, en metros. */
const SALTO = 5;

const server = await createServer({ root: process.cwd(), server: { port: 5272 } });
await server.listen();
const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'],
});

for (const esc of ['tenerife-norte', 'pettirossi']) {
  const page = await b.newPage({ viewport: { width: 900, height: 600 }, locale: 'es-PY' });
  page.on('pageerror', (e) => console.log('ERROR:', e.message));
  await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
  await page.goto(`http://localhost:5272/?escenario=${esc}`);

  const saltos = [];
  let antes = null;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(2000);
    const p = await page.evaluate(() => {
      const s = globalThis.__oga?.estado?.();
      return s ? { x: s.position.x, y: s.position.y, z: s.position.z } : null;
    });
    if (!p) continue;
    if (antes) {
      const d = Math.hypot(p.x - antes.x, p.z - antes.z);
      if (d > SALTO) saltos.push({ metros: Math.round(d), subida: +(p.y - antes.y).toFixed(1) });
    }
    antes = p;
  }
  console.log(
    `${esc}: ${saltos.length} salto(s) horizontal(es)` +
      (saltos.length ? ` · ${saltos.map((s) => `${s.metros} m`).join(', ')}` : ''),
  );
  await page.close();
}

await b.close();
await server.close();

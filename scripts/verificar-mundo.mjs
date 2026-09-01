/**
 * El mundo de verdad, dentro del juego de verdad.
 *
 * No es la prueba de `spike/`: aquí se arranca el juego entero —con su modelo
 * de vuelo, su aeródromo, su HUD y sus fases— y se mira si el suelo que se ve
 * es una fotografía y si coincide con el suelo con el que choca el avión.
 *
 *     node scripts/verificar-mundo.mjs [carpeta]
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const D = process.argv[2] ?? '/tmp';
const server = await createServer({ root: process.cwd(), server: { port: 5241 } });
await server.listen();
const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'],
});

for (const [escenario, leccion] of [
  ['tenerife-norte', 'aterrizaje'],
  ['tenerife-norte', 'despegue'],
  ['pettirossi', 'aterrizaje'],
]) {
  const page = await b.newPage({ viewport: { width: 1280, height: 800 }, locale: 'es-PY' });
  const fallos = [];
  page.on('pageerror', (e) => fallos.push(e.message.slice(0, 140)));
  await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
  await page.goto(`http://localhost:5241/?escenario=${escenario}&leccion=${leccion}`);
  await page.waitForTimeout(28000);

  const r = await page.evaluate(() => {
    const o = globalThis.__oga;
    const s = o.estado();
    return {
      y: Math.round(s.position.y),
      agl: Math.round(s.heightAboveGround),
      mundo: o.mundoReal?.() ?? null,
    };
  });
  console.log(
    `${escenario}/${leccion}  ` +
      (r.mundo
        ? `desfase ${r.mundo.desfase?.toFixed(1) ?? '—'} m · ${r.mundo.visibles} teselas · asentado=${r.mundo.asentado}`
        : 'sin mundo real') +
      ` · avión a ${r.y} m (${r.agl} sobre el suelo)` +
      (fallos.length ? `  ⚠ ${fallos[0]}` : ''),
  );
  await page.screenshot({ path: `${D}/mundo-${escenario}-${leccion}.png` });
  await page.close();
}
await b.close();
await server.close();

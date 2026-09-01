/**
 * El panel del tiempo, arrastrado de verdad.
 *
 * Lo que hay que comprobar no es que el panel se abra: es que **arrastrar la
 * flecha cambie la cabecera en uso**. Es fácil escribir un mando bonito que no
 * mueva nada.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const D = process.argv[2] ?? '/tmp';
const server = await createServer({ root: process.cwd(), server: { port: 5229 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const page = await b.newPage({ viewport: { width: 1280, height: 800 }, locale: 'es-PY' });
page.on('pageerror', (e) => console.log('ERROR:', e.message));
await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
await page.goto('http://localhost:5229/?escenario=tenerife-norte&leccion=despegue');
await page.waitForTimeout(4000);
await page.click('[data-hud="tiempo-boton"]');
await page.waitForTimeout(400);

const rosa = await page.$('[data-hud="tiempo-rosa"]');
const caja = await rosa.boundingBox();
const cx = caja.x + caja.width / 2;
const cy = caja.y + caja.height / 2;
const radio = caja.width * 0.4;

/** Deja el viento viniendo de `de` grados y devuelve la cabecera que resulta. */
async function soplar(de) {
  const r = (de * Math.PI) / 180;
  await page.mouse.move(cx + Math.sin(r) * radio, cy - Math.cos(r) * radio);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(700);
  return page.evaluate(async () => {
    const { SCENARIOS } = await import('/src/world/scenarios.ts');
    const esc = SCENARIOS.find((e) => e.id === 'tenerife-norte');
    const o = globalThis.__oga;
    const p = o.pista();
    const mag = Math.round(((p.heading + esc.magneticVariation + 360) % 360) / 10);
    return {
      rumbo: Math.round(p.heading),
      pista: mag,
      panel: !!document.querySelector('[data-hud="tiempo"]:not([hidden])'),
      flecha: document.querySelector('[data-hud="tiempo-flecha"]')?.getAttribute('transform'),
    };
  });
}

for (const de of [290, 110, 200, 20]) {
  const r = await soplar(de);
  console.log(
    `viento del ${String(de).padStart(3)}° → pista ${String(r.pista).padStart(2)} (rumbo ${r.rumbo}°) · panel=${r.panel} flecha=${r.flecha}`,
  );
}
await page.screenshot({ path: `${D}/tiempo.png` });
console.log('captura →', `${D}/tiempo.png`);
await b.close();
await server.close();

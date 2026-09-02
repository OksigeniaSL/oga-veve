/**
 * ¿Hay suelo de verdad al salir del escenario?
 *
 * Se lleva el avión mar adentro camino de Gran Canaria y se compara, cada
 * pocos kilómetros, lo que dice nuestro suelo con lo que dice la fotografía.
 *
 * El patrón es un rayo nuevo contra las teselas (`medidaDirecta`), no la rejilla
 * del parche que usa el suelo: si midiera con la rejilla estaría comparándola
 * consigo misma y casaría siempre.
 * Dentro del escenario tienen que coincidir porque es el mismo dato; fuera,
 * antes había un suelo invisible y plano y ahora debería seguir el relieve.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const D = process.argv[2] ?? '/tmp';
const server = await createServer({ root: process.cwd(), server: { port: 5247 } });
await server.listen();
const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'],
});
const page = await b.newPage({ viewport: { width: 1100, height: 700 }, locale: 'es-PY' });
page.on('pageerror', (e) => console.log('ERROR:', e.message));
await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
await page.goto('http://localhost:5247/?escenario=tenerife-norte&leccion=aterrizaje');
// Tiempo para que el mundo se asiente y se moldee.
await page.waitForTimeout(30000);

// Rumbo a Gran Canaria: sureste.
for (const km of [6, 12, 20, 35, 55, 70]) {
  const puesto = await page.evaluate((km) => {
    const o = globalThis.__oga;
    const s = o.estado();
    s.position.x = km * 1000 * 0.87;
    s.position.z = km * 1000 * 0.49;
    s.position.y = 3000;
    return null;
  }, km);
  // Unos segundos para que el parche se rellene con el avión ya ahí.
  await page.waitForTimeout(6000);
  const r = await page.evaluate(() => {
    const o = globalThis.__oga;
    const s = o.estado();
    const m = o.mundoReal();
    return { nuestro: m?.nuestroSuelo ?? null, foto: o.cotaCruda?.(s.position.x, s.position.z) ?? null };
  });
  const d = r.nuestro !== null && r.foto !== null ? Math.abs(r.nuestro - r.foto) : null;
  console.log(
    `${String(km).padStart(2)} km · nuestro ${r.nuestro === null ? '—' : r.nuestro.toFixed(0).padStart(5)} m` +
      ` · la foto ${r.foto === null ? '—' : r.foto.toFixed(0).padStart(5)} m` +
      ` → ${d === null ? 'sin medir' : d < 30 ? `casan (${d.toFixed(0)} m)` : `SE SEPARAN ${d.toFixed(0)} m`}`,
  );
  await page.screenshot({ path: `${D}/lejos-${km}km.png` });
}
await b.close();
await server.close();

import { chromium } from 'playwright';
import { createServer } from 'vite';
const server = await createServer({ root: process.cwd(), server: { port: 5325, hmr: false } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle','--use-angle=gl','--enable-unsafe-swiftshader'] });
const page = await b.newPage({ viewport: { width: 1280, height: 800 }, locale: 'es-PY' });
page.on('pageerror', e => console.log('ERROR:', e.message));
await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas','1'));
await page.goto('http://localhost:5325/?escenario=tenerife-norte&hora=12&leccion=vuelta&tramo=taguato&avion=jaz-40');
await page.waitForTimeout(30000);
// Las pistas de los vecinos, ya en coordenadas de este mundo, las sabe el juego.
const sitios = await page.evaluate(() => globalThis.__oga.pistasDeLosVecinos?.() ?? null);
if (!sitios) { console.log('sin sonda de pistas'); }
else for (const s of sitios) {
  const r = await page.evaluate(([x, z]) => {
    const suelo = globalThis.__oga.suelo(x, z);
    globalThis.__oga.colocar(x, suelo + 1.5, z, 0, 0);
    return Math.round(suelo);
  }, [s.x, s.z]);
  await page.waitForTimeout(7000);
  const q = await page.evaluate(() => ({ campo: globalThis.__oga.campoDeAhora(), raya: globalThis.__oga.ruta().length }));
  console.log(`  a ${String(Math.round(Math.hypot(s.x,s.z)/1000)).padStart(3)} km · suelo ${String(r).padStart(4)} m · «${q.campo}» · raya ${q.raya} puntos`);
}
await b.close(); await server.close();

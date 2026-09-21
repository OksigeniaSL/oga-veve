/** Las casas nuestras sobre el suelo de Google. */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { baseDe } from './servidor.mjs';
const D = process.argv[2] ?? '/tmp';
const PUERTO = 5237;
const server = await createServer({ root: process.cwd(), server: { port: PUERTO, hmr: false } });
await server.listen();
const BASE = baseDe(server, PUERTO);
const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'],
});
for (const [sitio, vista, alt] of [['sgas', 'cenital', 700]]) {
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const fallos = [];
  page.on('pageerror', (e) => fallos.push(e.message.slice(0, 160)));
  await page.goto(
    `${BASE}/spike/aerodromo-real.html?sitio=${sitio}&vista=${vista}&alt=${alt}`,
  );
  await page.waitForTimeout(30000);
  const r = await page.evaluate(() => {
    const s = globalThis.__spike;
    let tri = 0;
    s.ciudad?.traverse?.(() => {});
    return { fps: s.fps(), cota: s.cota() };
  });
  console.log(
    `${sitio}/${vista}  ${r.fps} fps · cota ${r.cota?.toFixed(1) ?? '?'} m` +
      (fallos.length ? `  ⚠ ${fallos[0]}` : ''),
  );
  await page.screenshot({ path: `${D}/ciudad-real-${sitio}-${vista}.png` });
  await page.close();
}
await b.close();
await server.close();

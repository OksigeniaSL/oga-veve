/**
 * ¿Casa nuestro asfalto con el de la foto?
 *
 * Es la única pregunta que importa de toda la prueba. Se mide de dos maneras:
 * a ojo, con capturas desde la aproximación y desde el aire; y con números,
 * comparando la cota que da el mundo de Google en varios puntos del aeródromo
 * con la que dice nuestro fichero.
 *
 *     node scripts/verificar-encaje.mjs [carpeta]
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const D = process.argv[2] ?? '/tmp';
const server = await createServer({ root: process.cwd(), server: { port: 5173 } });
await server.listen();
const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'],
});

for (const sitio of (process.argv[4] ?? 'gcxo,sgas').split(',')) {
  for (const vista of (process.argv[3] ?? 'aproximacion,cabecera').split(',')) {
    const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
    const fallos = [];
    page.on('pageerror', (e) => fallos.push(e.message.slice(0, 140)));
    await page.goto(`http://localhost:5173/spike/aerodromo-real.html?sitio=${sitio}&vista=${vista}` +
        (process.argv[5] === 'tinte' ? '&tinte=1' : ''));
    await page.waitForTimeout(vista === 'aproximacion' ? 26000 : 16000);

    const r = await page.evaluate(() => {
      const s = globalThis.__spike;
      if (!s) return null;
      // La cota del mundo en cinco puntos del aeródromo, para ver si el suelo
      // de Google y el nuestro tienen la misma pendiente y no solo la misma
      // altura en el centro.
      // Solo catas plausibles: las teselas bastas dan cotas de kilómetros.
      const catas = [[0, 0], [800, 0], [-800, 0], [0, 800], [0, -800]].map(([x, z]) => {
        const c = s.cotaDelMundo(x, z);
        return s.plausible(c) ? Math.round(c * 10) / 10 : null;
      });
      const crudas = s.catasDePista().map((c) => (c === null ? null : Math.round(c)));
      return { fps: s.fps(), cota: s.cota(), supuesta: s.supuesta, catas, crudas };
    });

    if (!r) console.log(`${sitio}/${vista}: no arrancó · ${fallos.slice(0, 2).join(' | ')}`);
    else if (vista === 'cabecera' || vista === 'aproximacion') {
      const buenas = r.catas.filter((c) => c !== null);
      const rango = buenas.length > 1 ? Math.max(...buenas) - Math.min(...buenas) : 0;
      console.log(
        `${sitio}  ${r.fps} fps · el fichero dice ${r.supuesta?.toFixed(1)} m · ` +
          `Google dice ${r.cota?.toFixed(1) ?? 'no medida'} m · ` +
          `desfase ${r.cota === null ? '?' : (r.cota - r.supuesta).toFixed(1)} m\n` +
          `        sobre la pista, en crudo: [${r.crudas.join(', ')}]` +
          (fallos.length ? `  ⚠ ${fallos[0]}` : ''),
      );
    }
    await page.screenshot({ path: `${D}/encaje-${sitio}-${vista}${process.argv[5] === 'tinte' ? '-tinte' : ''}.png` });
    await page.close();
  }
}
await b.close();
await server.close();

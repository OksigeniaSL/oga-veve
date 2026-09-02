/**
 * ¿Trae la fotografía los edificios, o hay que levantarlos nosotros?
 *
 * Es la pregunta que decide si Asunción tiene cincuenta y tres mil casas o
 * ninguna, y si Santa Cruz tiene las suyas o veintinueve mil cajas encima.
 *
 * La medida vieja confundía dos cosas que se miden igual: «aquí la foto es lisa
 * porque no hay edificios» y «aquí la foto es lisa porque es una tesela gruesa
 * que todavía no ha cargado». Ahora solo cuentan las teselas cuyo error
 * geométrico baje de veinte metros — y esas están **cerca del avión**, porque
 * el árbol de teselas afina lo que la cámara mira y nada más.
 *
 * Así que esto pasea el avión por encima de la ciudad y va imprimiendo cuántas
 * medidas lleva y qué desnivel encuentra. Si al final no decide, eso también es
 * un resultado, y es el bueno: más vale no saberlo que plantar cajas a ciegas.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ root: process.cwd(), server: { port: 5248 } });
await server.listen();
const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'],
});

for (const escenario of ['tenerife-norte', 'pettirossi']) {
  const page = await b.newPage({ viewport: { width: 1100, height: 700 }, locale: 'es-PY' });
  page.on('pageerror', (e) => console.log('ERROR:', e.message));
  await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
  await page.goto(`http://localhost:5248/?escenario=${escenario}`);
  console.log(`\n=== ${escenario} ===`);
  await page.waitForTimeout(30000);

  /*
   * Un paseo bajo por encima de la ciudad. Bajo a propósito: a cuatrocientos
   * metros la fotografía se afina de verdad, y es además la altura a la que un
   * niño va a estar mirando las casas.
   */
  const paseo = [
    [0, 0],
    [-2500, -1500],
    [-5000, -3000],
    [-7500, -1500],
    [-9000, 1500],
    [-6000, 3500],
    [-3000, 3000],
    [0, 2000],
  ];
  for (let i = 0; i < paseo.length; i++) {
    await page.evaluate((p) => {
      const s = globalThis.__oga.estado();
      s.position.x = p[0];
      s.position.z = p[1];
      s.position.y = 400;
      s.velocity.x = 0;
      s.velocity.y = 0;
      s.velocity.z = 0;
    }, paseo[i]);
    await page.waitForTimeout(9000);
    const c = await page.evaluate(() => globalThis.__oga.casas?.() ?? null);
    if (!c) {
      console.log(`  ${(i + 1) * 9}s · sin datos`);
      continue;
    }
    console.log(
      `  ${String((i + 1) * 9).padStart(3)}s · medidas ${String(c.medidas).padStart(3)}` +
        ` · salto ${c.salto === null ? '—' : c.salto.toFixed(1).padStart(5) + ' m'}` +
        ` (q1 ${c.q1 === null ? '—' : c.q1.toFixed(1)} q3 ${c.q3 === null ? '—' : c.q3.toFixed(1)})` +
        ` · ${c.decidido ? 'decidido' : 'juntando'}` +
        ` · levantadas ${c.levantadas}`,
    );
  }
  await page.close();
}

await b.close();
await server.close();

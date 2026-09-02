/**
 * ¿Se ve la raya verde de guía cuando llega la fotografía?
 *
 * No basta con preguntar si existe. Sus cotas van horneadas en la geometría, y
 * la fotografía sube el suelo el datum entero —cuarenta y siete metros en
 * Tenerife Norte, trece y medio en Asunción—, así que la cinta puede estar
 * perfectamente construida y **enterrada bajo el asfalto**. Se vio jugando
 * como «sin línea guía», y desconcertaba porque a veces sí salía: salía justo
 * cuando el juego cambiaba de puesto, porque cambiar de puesto la reconstruía.
 *
 * Así que se mide a qué altura está respecto del suelo. Cerca de cero es que
 * se ve; varios metros por debajo, que está enterrada.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ root: process.cwd(), server: { port: 5280 } });
await server.listen();
const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'],
});

for (const esc of ['tenerife-norte', 'pettirossi']) {
  const page = await b.newPage({ viewport: { width: 900, height: 600 }, locale: 'es-PY' });
  page.on('pageerror', (e) => console.log('ERROR:', e.message));
  await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
  await page.goto(`http://localhost:5280/?escenario=${esc}`);
  await page.waitForTimeout(95000);
  const r = await page.evaluate(() => ({
    cinta: globalThis.__oga.cintaGuia?.() ?? null,
    ruta: (globalThis.__oga.ruta?.() ?? []).length,
  }));
  const c = r.cinta;
  console.log(
    `${esc}: ruta de ${r.ruta} puntos · cinta con ${c?.vertices ?? 0} vértices · ` +
      (c?.sobreElSuelo === null || c?.sobreElSuelo === undefined
        ? 'sin medir'
        : `${c.sobreElSuelo.toFixed(2)} m sobre el suelo`),
  );
  await page.close();
}

await b.close();
await server.close();

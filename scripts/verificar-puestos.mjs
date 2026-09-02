/**
 * ¿En qué puesto aparece el avión, y hay algo aparcado ahí?
 *
 * Esto existe por el 737 caníbal: durante semanas el juego colocaba la avioneta
 * dentro de un avión de línea de la fotografía. La prueba de antes preguntaba
 * si el puesto tenía algo **encima** —y un 737 en la plaza de al lado no
 * levanta el suelo bajo nuestras ruedas—, y además contestaba «libre» cuando no
 * podía medir.
 *
 * Aquí se imprime lo que sobresale en cada puesto, en metros. Una plataforma
 * vacía da menos de metro y medio; con un avión encima se va a diez o quince.
 * Un guion es «no se pudo medir», y eso ya no cuenta como bueno.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ root: process.cwd(), server: { port: 5272 } });
await server.listen();
const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'],
});

for (const esc of ['tenerife-norte', 'pettirossi']) {
  const page = await b.newPage({ viewport: { width: 1100, height: 700 }, locale: 'es-PY' });
  page.on('pageerror', (e) => console.log('ERROR:', e.message));
  await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
  await page.goto(`http://localhost:5272/?escenario=${esc}`);
  await page.waitForTimeout(90000);
  const m = await page.evaluate(() => globalThis.__oga.mundoReal?.() ?? null);
  console.log(`\n=== ${esc} ===`);
  console.log('  estorbo por puesto (m):', m?.puestos ?? '—');
  console.log('  el más despejado es el nº', m?.masDespejado ?? '—');
  console.log('  estorbo del elegido:', m?.puestoElegido ?? '—');
  await page.close();
}

await b.close();
await server.close();

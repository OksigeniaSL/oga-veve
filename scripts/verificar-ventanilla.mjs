/**
 * ¿Señala la comandante lo que se ve por la ventanilla?
 *
 * Es una función que es voz y tarjeta, o sea invisible para una prueba de
 * unidad: las reglas se comprueban en `lo-que-se-ve.test.ts` y la geometría en
 * `hitos.test.ts`, pero que el dato extraído, el escenario y el bucle del
 * juego se encuentren no lo dice ninguna de las dos. Un fichero de hitos que
 * no se carga, un identificador de escenario que no casa o una fase que nunca
 * llega dejan esto mudo sin romper nada.
 *
 * Así que se vuela. Se pone el avión en crucero al norte del Teide mirando al
 * sur —donde hay hitos de sobra— y se mira el contador.
 *
 *   node scripts/verificar-ventanilla.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({
  root: process.cwd(),
  server: { port: 5261, hmr: false },
});
await server.listen();
const navegador = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'],
});
const page = await navegador.newPage({
  viewport: { width: 1100, height: 700 },
  locale: 'es-PY',
});
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
await page.goto('http://localhost:5261/?escenario=tenerife-norte&hora=12&leccion=vuelta');
await page.waitForTimeout(25000);

/*
 * Diez kilómetros al norte del aeródromo, a dos mil metros y rumbo sur: por
 * delante quedan La Laguna, Santa Cruz y, más allá, el Teide. Y con velocidad
 * de crucero, que sin ella el avión cae y la fase deja de ser `en-vuelo`.
 */
await page.evaluate(() =>
  globalThis.__oga.colocar(0, 2000, -10000, 70, Math.PI),
);

const hasta = Date.now() + 120000;
let cuantos = 0;
while (Date.now() < hasta) {
  await page.waitForTimeout(3000);
  cuantos = await page.evaluate(() => globalThis.__oga.ventanilla());
  if (cuantos >= 2) break;
}

const fase = await page.evaluate(() => globalThis.__oga.fase());
console.log(`hitos señalados: ${cuantos} · fase: ${fase}`);

/*
 * **Y el plano se abre con ellos dentro.**
 *
 * Los hitos se dibujan en el mapa —triángulo si es cumbre, círculo si es
 * pueblo— y el nombre sale solo de los que ya se han oído. El mapa se pinta en
 * un lienzo, así que lo único que se puede mirar desde fuera sin ponerse a
 * comparar píxeles es lo que de verdad rompe: que abrirlo no reviente y que no
 * salga en blanco.
 */
await page.evaluate(() =>
  document.querySelector('[data-hud="mapa-boton"]')?.click(),
);
await page.waitForTimeout(2500);
const plano = await page.evaluate(() => {
  const c = document.querySelector('[data-hud="mapa-fondo"]');
  if (!c) return { hay: false };
  const g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const colores = new Set();
  for (let i = 0; i < d.length; i += 4 * 97)
    colores.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
  return { hay: true, colores: colores.size };
});
console.log(`plano: ${plano.hay ? `${plano.colores} colores distintos` : 'no está'}`);
for (const e of errores) console.log('ERROR:', e);

await navegador.close();
await server.close();
if (errores.length) {
  console.log('✖ La página dio errores.');
  process.exit(1);
}
if (!plano.hay || plano.colores < 5) {
  console.log('✖ El plano no se pintó.');
  process.exit(1);
}
if (cuantos < 1) {
  console.log('✖ La comandante no señaló nada en dos minutos de crucero.');
  process.exit(1);
}
console.log('✓ Señala lo que se ve.');

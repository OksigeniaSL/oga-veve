/**
 * Al aterrizar en el otro aeropuerto, ¿hay raya verde hasta el hangar?
 *
 * Contado jugando después de cruzar a otra isla: «así se ve el aeropuerto: no
 * hay coche, no sé la ruta a mi hangar». El campo de destino estaba entero
 * —pista, calles, plataforma, todo pisable— y el plan de tierra seguía siendo
 * el de casa, a sesenta kilómetros. De un grafo que no está debajo no sale
 * ninguna ruta.
 *
 * `plan-mudanza.test.ts` comprueba la mudanza sin volar; esto comprueba que de
 * verdad ocurre volando, que es otra cosa: depende de en qué campo cree el
 * juego que está, y eso solo se sabe con el avión puesto allí.
 *
 *   node scripts/verificar-destino.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({
  root: process.cwd(),
  server: { port: 5263, hmr: false },
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
// Tenerife Norte, cuyo destino es Tenerife Sur. Ver `destino` en scenarios.ts.
await page.goto('http://localhost:5263/?escenario=tenerife-norte&hora=12&leccion=aterrizaje');
await page.waitForTimeout(25000);

const vecino = await page.evaluate(() => globalThis.__oga.pistaDelVecino?.() ?? null);
if (!vecino) {
  console.log('✖ Este escenario no tiene vecino: la prueba no mide nada.');
  await navegador.close();
  await server.close();
  process.exit(1);
}

/*
 * En la pista del otro campo, parado. No se vuela el trayecto entero: lo que
 * se comprueba es la mudanza del plan, y eso depende de dónde está el avión,
 * no de cómo llegó.
 */
await page.evaluate(
  ([x, z, rumbo]) => {
    // A ras del asfalto de **ese** campo: la cota se pregunta, que la del
    // vecino no es la de casa y caer cincuenta metros rompe el avión.
    const suelo = globalThis.__oga.suelo(x, z);
    globalThis.__oga.colocar(x, suelo + 1.2, z, 0, (rumbo * Math.PI) / 180);
  },
  [vecino.x, vecino.z, vecino.heading],
);
await page.waitForTimeout(8000);

const ruta = await page.evaluate(() => globalThis.__oga.ruta());
const campo = await page.evaluate(() => globalThis.__oga.campoDeAhora?.() ?? null);
const fase = await page.evaluate(() => globalThis.__oga.fase());
const alto = await page.evaluate(() => {
  const s = globalThis.__oga.estado();
  return {
    sobreElSuelo: +(s.position.y - globalThis.__oga.suelo(s.position.x, s.position.z)).toFixed(1),
    enPista: s.onRunway,
    enSuelo: s.onGround,
  };
});
console.log(`fase: ${fase} · ${JSON.stringify(alto)}`);
const lejos = ruta.length
  ? Math.max(...ruta.map(([x, z]) => Math.hypot(x - vecino.x, z - vecino.z)))
  : Infinity;

console.log(`campo de ahora: ${campo}`);
console.log(`puntos de la raya: ${ruta.length} · el más lejano de la pista del destino: ${Math.round(lejos)} m`);
for (const e of errores) console.log('ERROR:', e);

await navegador.close();
await server.close();

if (ruta.length < 2) {
  console.log('✖ No hay raya en el campo de destino.');
  process.exit(1);
}
// Un aeropuerto entero cabe de sobra en cinco kilómetros desde su pista. Si la
// raya se va más lejos, es que sigue siendo la del campo de casa.
if (lejos > 5000) {
  console.log('✖ La raya no es de este campo: se va al otro aeropuerto.');
  process.exit(1);
}
console.log('✓ El plan se muda con el avión.');

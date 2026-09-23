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
 * **Y desde hoy comprueba también que se pueda aterrizar allí.** Media docena
 * de sitios preguntaban «¿estoy sobre la pista?» y «¿me he pasado del final?»
 * mirando la pista **del campo de salida**, que a ciento ochenta kilómetros da
 * una distancia de ciento ochenta mil metros: el percance de salida de pista
 * saltaba en cuanto la fase pasaba a «aterrizado», tocaras donde tocaras, y
 * las ruedas se declaraban fuera de asfalto. Contado jugando: «toqué tierra a
 * principio de pista, me quedaba para poder frenar, pero la instructora tenía
 * ganas de romper un 747». Esta prueba deja el avión rodando por la pista del
 * vecino, que es lo que aquello rompía.
 *
 *   node scripts/verificar-destino.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { baseDe } from './servidor.mjs';

const PUERTO = 5263;
const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);
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
await page.goto(`${BASE}/?escenario=tenerife-norte&hora=12&leccion=aterrizaje`);
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

/*
 * Y ahora rodando por esa misma pista, deprisa y con el morro por ella: es la
 * carrera de frenada de un aterrizaje, que es cuando salta el percance de
 * salida de pista. Parado no mide nada — la condición pide más de cinco
 * metros por segundo.
 */
await page.evaluate(
  ([x, z, rumbo]) => {
    const suelo = globalThis.__oga.suelo(x, z);
    globalThis.__oga.colocar(x, suelo + 1.2, z, 45, (rumbo * Math.PI) / 180);
  },
  [vecino.x, vecino.z, vecino.heading],
);
await page.waitForTimeout(3000);
const rodando = await page.evaluate(() => {
  const s = globalThis.__oga.estado();
  return {
    percance: globalThis.__oga.percance(),
    enPista: s.onRunway,
    velocidad: Math.round(s.airspeed),
    campo: globalThis.__oga.campoDeAhora?.() ?? null,
  };
});
console.log(`rodando por la pista del vecino: ${JSON.stringify(rodando)}`);
const lejos = ruta.length
  ? Math.max(...ruta.map(([x, z]) => Math.hypot(x - vecino.x, z - vecino.z)))
  : Infinity;

console.log(`campo de ahora: ${campo}`);
console.log(`puntos de la raya: ${ruta.length} · el más lejano de la pista del destino: ${Math.round(lejos)} m`);
/*
 * **Y desde el aire, que se diga a dónde se va.**
 *
 * Esta es la comprobación que faltaba y que costó más cara de todas: el
 * destino estaba cargado —relieve, aeropuerto, pista donde aterrizar— y en la
 * pantalla no había **nada** que dijera que existe. Contado jugando: «yo no sé
 * la de veces que he querido despegar de una pista y llegar a otra, y desde
 * Gran Canaria no localizo Fuerteventura».
 *
 * Un aeropuerto al que no se puede apuntar no está en el juego, está en el
 * disco. Así que lo que se mide es lo único que lo mete en el juego: que la
 * tarjeta de la aguja diga su **nombre** y su distancia.
 */
const enElAire = await page.evaluate(() => {
  const e = globalThis.__oga.estado();
  globalThis.__oga.colocar(e.position.x, 1600, e.position.z, 80, 0);
  return true;
});
await page.waitForTimeout(1500);
const rotulo = await page.evaluate(() => ({
  nombre: document.querySelector('[data-hud="home-gloss"]')?.textContent ?? '',
  distancia: document.querySelector('[data-hud="home-distance"]')?.textContent ?? '',
  esDestino: !!document.querySelector('[data-hud="home"]')?.classList.contains('casa--destino'),
  hayGlosa: !!document.querySelector('[data-hud="home-gloss"]'),
}));
console.log(`la aguja: destino=${rotulo.esDestino} · «${rotulo.nombre}» a ${rotulo.distancia}`);
/*
 * La aguja y su color valen en los cuatro peldaños: es el canal que funciona
 * sin leer. El **nombre** solo existe donde hay palabras —Guyrami no lleva
 * glosa ni cifras, a propósito—, así que se comprueba si la glosa está.
 * Comprobar un rótulo que el peldaño no pinta sería medir otra cosa.
 */
if (!enElAire || !rotulo.esDestino) {
  console.log('✖ Volando hacia otro campo y la aguja no señala un destino.');
  await navegador.close();
  await server.close();
  process.exit(1);
}
if (rotulo.hayGlosa && (!rotulo.nombre || rotulo.nombre === 'Pista')) {
  console.log(`✖ La tarjeta no dice a qué aeropuerto se va: «${rotulo.nombre}».`);
  await navegador.close();
  await server.close();
  process.exit(1);
}
console.log(
  rotulo.hayGlosa
    ? '✓ Desde el aire se ve a qué aeropuerto se va, con su nombre.'
    : '✓ Desde el aire la aguja señala el destino (peldaño sin palabras).',
);

for (const e of errores) console.log('ERROR:', e);

await navegador.close();
await server.close();

if (!alto.enPista) {
  console.log('✖ Parado en la pista del vecino y el juego dice que no está en pista.');
  process.exit(1);
}
if (rodando.percance) {
  console.log(`✖ Percance «${rodando.percance}» rodando por la pista del destino.`);
  process.exit(1);
}
if (!rodando.enPista) {
  console.log('✖ Rodando por la pista del destino y el juego lo cree fuera de pista.');
  process.exit(1);
}
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

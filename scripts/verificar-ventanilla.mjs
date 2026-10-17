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
 * Y detrás de lo señalado, su historia y **su foto**: mientras suena, la foto
 * sale al lado del cuadro —o en la placa, en las avionetas— y al acabar se va.
 * Se mira cada medio segundo qué foto hay puesta y dónde, y se exige que haya
 * salido alguna y que se haya ido. Ver `ui/ventana-de-historia.ts`.
 *
 *   node scripts/verificar-ventanilla.mjs [avion]
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { baseDe } from './servidor.mjs';

const PUERTO = 5261;
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
const AVION = process.argv[2] ?? null;
await page.goto(
  `${BASE}/?escenario=tenerife-norte&hora=12&leccion=vuelta${AVION ? `&avion=${AVION}` : ""}`,
);
await page.waitForTimeout(25000);

/*
 * Veinticinco kilómetros al norte del aeródromo, sobre el mar, a dos mil
 * quinientos metros y rumbo sur: Anaga queda a la izquierda y el Teide a la
 * derecha, y los dos se ven desde ahí. Y con velocidad de crucero, que sin
 * ella el avión cae y la fase deja de ser `en-vuelo`.
 *
 * Estaba a diez kilómetros, y desde que no se habla en las fases de trabajo
 * —ver `enFaseDeTrabajo`— eso es casi el circuito: en treinta segundos el
 * avión entraba en los ocho kilómetros del campo y la instructora callaba, que
 * es lo que tiene que hacer.
 */
await page.evaluate(() =>
  globalThis.__oga.colocar(0, 2500, -25000, 70, Math.PI),
);

/*
 * Y mientras, las fotos: cuál sale, dónde y si se va. Se sigue mirando hasta
 * que una haya salido y se haya ido, o hasta los dos minutos: con dos sitios
 * señalados la historia del primero puede estar aún sonando.
 */
const hasta = Date.now() + 120000;
let cuantos = 0;
const fotos = [];
let puesta = null;
let seFue = false;
while (Date.now() < hasta) {
  await page.waitForTimeout(500);
  const ahora = await page.evaluate(() => ({
    cuantos: globalThis.__oga.ventanilla(),
    foto: globalThis.__oga.historia(),
  }));
  cuantos = ahora.cuantos;
  if (ahora.foto.sitio && ahora.foto.sitio !== puesta)
    fotos.push(`${ahora.foto.sitio} (${ahora.foto.donde})`);
  if (puesta && !ahora.foto.sitio) seFue = true;
  puesta = ahora.foto.sitio;
  if (cuantos >= 2 && fotos.length && seFue) break;
}

const fase = await page.evaluate(() => globalThis.__oga.fase());
console.log(`hitos señalados: ${cuantos} · fase: ${fase}`);
console.log(`fotos de las historias: ${fotos.join(", ") || "ninguna"} · ${seFue ? "y se fue al acabar" : "no se fue"}`);

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
if (!fotos.length || !seFue) {
  console.log('✖ La foto de la historia no salió mientras se contaba, o no se fue al acabar.');
  process.exit(1);
}
console.log('✓ Señala lo que se ve, y la foto de su historia sale y se va.');

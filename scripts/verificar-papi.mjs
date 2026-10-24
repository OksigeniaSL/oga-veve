/**
 * ¿Dice el PAPI la verdad, y están las luces donde apuntan?
 *
 * Las pruebas de `aproximacion.test.ts` comprueban la cuenta del ángulo. Esto
 * comprueba otra cosa: que en el juego de verdad, volando en final, las cuatro
 * luces salgan del color que les toca. Son dos preguntas distintas y la segunda
 * es la que importa — la primera ya salía bien cuando las luces ni existían,
 * porque nadie las montaba sin fotografía.
 *
 * En la senda de tres grados tienen que verse dos blancas y dos rojas; alto,
 * las cuatro blancas; bajo, las cuatro rojas.
 *
 * **Y desde dónde se distinguen** (277): de día, el de verdad se ve a unas
 * cinco millas (AIM 2-1-2 b), y aquí, dibujado a su tamaño, solo en los
 * últimos novecientos metros. Se vuela la senda desde lejos, desde la cabina
 * y desde fuera, y se apunta a cuántos píxeles quedan las cuatro, si el juego
 * las da por distinguidas y la foto de cada distancia. Las fotos solo valen
 * con la tarjeta de verdad: `OGA_GPU=1`, y mirando el renderer que se imprime.
 *
 * Uso: `node scripts/verificar-papi.mjs [carpeta de capturas]`.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
import { baseDe } from './servidor.mjs';
const D = process.argv[2] ?? '/tmp';
mkdirSync(D, { recursive: true });
// Uno propio, que otro banco puede estar corriendo a la vez: `OGA_PUERTO` para otro.
const PUERTO = Number(process.env.OGA_PUERTO ?? 5254);
const CON_GPU = process.env.OGA_GPU === '1';
const server = await createServer({ root: process.cwd(), server: { port: PUERTO, hmr: false } });
await server.listen();
const BASE = baseDe(server, PUERTO);
const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: CON_GPU
    ? ['--headless=new', '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=gl']
    : ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'],
});
const fallos = [];
const comprobar = (nombre, ok, detalle) => {
  if (!ok) fallos.push(nombre);
  console.log(`${ok ? '✓' : '✗'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};
try {
  const page = await b.newPage({ viewport: { width: 1280, height: 720 }, locale: 'es-PY' });
  page.on('pageerror', (e) => console.log('ERROR:', e.message));
  await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
  await page.goto(`${BASE}/?escenario=pettirossi&hora=16&teselas=0&meteo=&viento=000/00`);
  await page.waitForFunction(() => !!globalThis.__oga?.estado, null, { timeout: 120000 });
  await page.waitForTimeout(6000);
  // Motor en marcha: si no, el juego recoloca el avión al puesto al moldear.
  await page.keyboard.press('i');
  await page.waitForTimeout(2000);
  console.log(
    'renderer:',
    await page.evaluate(() => {
      const g = globalThis.__oga.pintor().getContext();
      const e = g.getExtension('WEBGL_debug_renderer_info');
      return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : '¿?';
    }),
  );
  console.log('cabecera:', await page.evaluate(() => globalThis.__oga.puntoDeFinal?.(0)?.cabecera));

  /** Pone el avión volando la final a `d` m del umbral y `alt` veces la altura de la senda. */
  const enLaFinal = (d, alt, vista = null) =>
    page.evaluate(
      ([d, alt, vista]) => {
        const o = globalThis.__oga;
        const j = o.juegoParaTrazas();
        const p = o.puntoDeFinal(d);
        const alto = p.suelo + Math.tan((3 * Math.PI) / 180) * (d + 300) * alt;
        /*
         * Con `colocar`, que pone también la actitud: tocando solo la
         * posición y el rumbo, la cámara de la cabina seguía mirando adonde
         * miraba el avión antes, y las luces salían en una esquina.
         */
        const v = j.aircraft.approachSpeed;
        o.colocar(p.x, alto, p.z, v, p.h);
        // Volando de verdad hacia la pista: sin velocidad se desploma y la cámara
        // pica al suelo antes de que se pueda ver nada.
        const s = o.estado();
        s.velocity.x = Math.sin(p.h) * v;
        s.velocity.z = -Math.cos(p.h) * v;
        s.velocity.y = -v * Math.tan((3 * Math.PI) / 180);
        o.pedirTren(true);
        o.controles().throttle = 0.45;
        if (vista) o.ponerVista(vista);
      },
      [d, alt, vista],
    );

  for (const [nombre, alt, quiere] of [
    ['luces-senda', 1.0, 'blanca blanca roja roja'],
    ['luces-alto', 1.7, 'blanca blanca blanca blanca'],
    ['luces-bajo', 0.5, 'roja roja roja roja'],
  ]) {
    await enLaFinal(900, alt);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${D}/${nombre}.png` });
    const papi = await page.evaluate(() => globalThis.__oga.papi?.() ?? null);
    comprobar(`${nombre}: ${quiere}`, papi?.join(' ') === quiere, papi ? papi.join(' ') : 'sin papi');
  }

  // ── Desde dónde se distingue (277) ──────────────────────────────────────
  const MILLA = 1609.344;
  for (const vista of ['cockpit', 'chase']) {
    for (const d of [600, 1200, 2000, 3000, 4500, 6000, 7500, 9500]) {
      await enLaFinal(d, 1.0, vista);
      await page.waitForTimeout(900);
      const r = await page.evaluate(() => {
        const j = globalThis.__oga.juegoParaTrazas();
        const v = j.loNombradoParaBanco;
        return {
          ve: v.papiSeDistingue,
          papi: v.papi,
          colores: globalThis.__oga.papi?.() ?? null,
          vista: globalThis.__oga.vista(),
        };
      });
      await page.screenshot({ path: `${D}/de-lejos-${vista}-${d}.png` });
      const p = r.papi;
      const detalle = p
        ? `${p.anchoPx.toFixed(1)} px de fila · ${Math.round(p.distancia)} m del ojo · ` +
          `${p.delante ? 'delante' : 'detrás'}${p.tapado ? ' · tapado' : ''} · ` +
          `x ${p.x.toFixed(2)} y ${p.y.toFixed(2)} · ${r.colores?.join(' ') ?? ''}`
        : 'sin PAPI';
      const lejos = p ? p.distancia : Infinity;
      const enLasCinco = lejos <= 5 * MILLA;
      /*
       * Desde la cabina, que es desde donde se vuela la final: dentro de las
       * cinco millas se distingue —salvo que el morro las tape— y fuera no se
       * da por distinguido. Desde fuera se apunta, sin exigir: ahí el avión
       * se pone delante.
       */
      if (vista === 'cockpit')
        comprobar(
          `${vista} a ${d} m del umbral: ${enLasCinco ? 'se distingue' : 'pasadas las cinco millas, no'}`,
          enLasCinco ? r.ve || !!p?.tapado : !r.ve,
          detalle,
        );
      else console.log(`  · ${vista} a ${d} m del umbral: ${r.ve ? 'se distingue' : 'no se distingue'} — ${detalle}`);
    }
  }
} finally {
  await b.close();
  await server.close();
}
console.log(fallos.length ? `\n${fallos.length} fallo(s)` : '\ntodo bien');
process.exit(fallos.length ? 1 : 0);

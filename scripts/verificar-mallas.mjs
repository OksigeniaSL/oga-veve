/**
 * ¿Dónde está cada malla del aeródromo respecto del suelo?
 *
 * Es la pregunta que ha resuelto dos casos que se resistían, y en los dos la
 * malla existía y estaba encendida:
 *
 * - **La raya verde**, que estaba cuarenta y siete metros bajo el asfalto
 *   porque sus cotas se hornean al arrancar y la fotografía sube el suelo.
 * - **La pintura de la pista**, que estaba veinte centímetros por encima del
 *   asfalto —o sea, bien— y eso fue lo que descartó cuatro hipótesis de golpe
 *   y dejó ver la quinta: que el asfalto era un plano de cuatro vértices para
 *   una pista que cae diecisiete metros.
 *
 * Preguntar «¿existe?» y «¿está encendida?» no basta. Hay que preguntar
 * **dónde está**.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { baseDe } from './servidor.mjs';
// Dónde dejar la foto a ras de pista: `node scripts/verificar-mallas.mjs [carpeta]`.
const D = process.argv[2] ?? '/tmp';
const PUERTO = Number(process.env.OGA_PUERTO ?? 5286);
const server = await createServer({ root: process.cwd(), server: { port: PUERTO, hmr: false } });
await server.listen();
const BASE = baseDe(server, PUERTO);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'] });
const page = await b.newPage({ viewport: { width: 900, height: 600 }, locale: 'es-PY' });
page.on('pageerror', (e) => console.log('ERROR:', e.message));
await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
await page.goto(`${BASE}/?escenario=tenerife-norte&hora=16`);
await page.waitForTimeout(95000);
console.log('— altura de cada malla sobre el suelo —');
for (const l of await page.evaluate(() => globalThis.__oga.alturaDeLasMallas?.() ?? [])) {
  console.log(' ', l);
}

// Y a ras de pista, que es el encuadre en el que las líneas desaparecían: en
// cenital siempre se vieron bien, y por eso el fallo tardó tanto en salir.
await page.evaluate(() => {
  const o = globalThis.__oga, s = o.estado(), c = o.controles();
  c.engineOn = true;
  const p = o.puntoDeFinal(-120);
  s.position.x = p.x; s.position.z = p.z; s.heading = p.h;
  s.position.y = p.suelo + 1.6;
  s.velocity.x = 0; s.velocity.y = 0; s.velocity.z = 0;
});
await page.waitForTimeout(2500);
await page.screenshot({ path: `${D}/pintura-ras.png` });
console.log('pintura-ras.png');
const c = await page.evaluate(() => globalThis.__oga.camara?.() ?? null);
console.log('cámara:', c ? `near ${c.near} · far ${c.far} · ${c.bits} bits · logarítmico ${c.logaritmico}` : 'sin dato');
// Y con eso, a qué distancia empieza a fallar el empate contra 25 cm de pintura.
if (c) {
  const paso = (z) => (z * z) / (c.near * Math.pow(2, c.bits));
  for (const z of [20, 50, 100, 300, 1000]) {
    console.log(`   a ${z} m el escalón de profundidad mide ${paso(z).toFixed(3)} m`);
  }
}
await b.close();
await server.close();

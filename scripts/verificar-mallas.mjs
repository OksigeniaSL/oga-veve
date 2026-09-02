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
const server = await createServer({ root: process.cwd(), server: { port: 5286 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'] });
const page = await b.newPage({ viewport: { width: 900, height: 600 }, locale: 'es-PY' });
page.on('pageerror', (e) => console.log('ERROR:', e.message));
await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
await page.goto('http://localhost:5286/?escenario=tenerife-norte');
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
await page.screenshot({ path: '/tmp/claude-1000/-home-eraorahan-Downloads-flyjazz/b3dbfc3e-0835-4131-92f8-19dd24f3f2e3/scratchpad/pintura-ras.png' });
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

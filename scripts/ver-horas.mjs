/** El cielo a distintas horas. Lo único que dice si una paleta funciona. */
import { chromium } from 'playwright';
import { createServer } from 'vite';
const D = process.argv[2] ?? '/tmp';
const server = await createServer({ root: process.cwd(), server: { port: 5233 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
for (const hora of (process.argv[3] ?? '6,7,12,16,19,23').split(',').map(Number)) {
  const page = await b.newPage({ viewport: { width: 1100, height: 620 }, locale: 'es-PY' });
  page.on('pageerror', (e) => console.log('ERROR:', e.message));
  await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
  await page.goto(`http://localhost:5233/?escenario=tenerife-norte&leccion=aterrizaje&hora=${hora}`);
  await page.waitForTimeout(4200);
  await page.screenshot({ path: `${D}/hora-${String(hora).replace('.', '_')}.png` });
  console.log(`${hora} h → hora-${String(hora).replace('.', '_')}.png`);
  await page.close();
}
await b.close();
await server.close();

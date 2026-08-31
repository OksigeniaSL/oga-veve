import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ root: process.cwd(), server: { port: 5199 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', e => console.log('ERROR:', e.message));
await page.addInitScript(() => localStorage.setItem('oga-veve:tramo', 'taguato-ruvicha'));
await page.goto('http://localhost:5199/?escenario=valle-cordillera');
await page.waitForTimeout(2500);
console.log('esferas:', await page.locator('.esfera').count());

const leer = async () => ({
  asi: await page.locator('[data-needle="asi"]').getAttribute('transform'),
  alt: await page.locator('[data-needle="alt-hundreds"]').getAttribute('transform'),
  vsi: await page.locator('[data-needle="vsi"]').getAttribute('transform'),
  dg:  await page.locator('[data-needle="dg-card"]').getAttribute('transform'),
  ai:  await page.locator('[data-ai-disc]').getAttribute('transform'),
  tc:  await page.locator('[data-tc-plane]').getAttribute('transform'),
  bola:await page.locator('[data-tc-ball]').getAttribute('cx'),
});
console.log('en parado:', JSON.stringify(await leer()));

// Gas a tope, carrera, rotar y virar a la derecha.
await page.keyboard.down('Equal');            // '+' sin shift
for (let i = 0; i < 60; i++) await page.keyboard.press('+');
await page.waitForTimeout(1500);
await page.keyboard.down('ArrowUp');
await page.waitForTimeout(3500);
await page.keyboard.up('ArrowUp');
await page.waitForTimeout(2000);
console.log('en ascenso:', JSON.stringify(await leer()));

await page.keyboard.down('ArrowRight');
await page.waitForTimeout(2500);
console.log('en viraje: ', JSON.stringify(await leer()));
await page.keyboard.up('ArrowRight');
await page.screenshot({ path: process.argv[2] });
await b.close(); await server.close();

import { chromium } from 'playwright';
import { createServer } from 'vite';
const server = await createServer({ root: process.cwd(), server: { port: 5196 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', e => console.log('ERROR:', e.message));
await page.addInitScript(() => localStorage.setItem('oga-veve:tramo', 'guyrami'));
await page.goto('http://localhost:5196/?escenario=valle-cordillera');
await page.waitForTimeout(2200);

const leer = async () => ({
  vel: await page.locator('[data-picto="speed"]').getAttribute('transform'),
  alt: await page.locator('[data-picto="altitude"]').getAttribute('transform'),
  hel: await page.locator('[data-picto="prop"]').getAttribute('transform'),
  boton: await page.locator('.freno--boton:not([hidden])').count(),
  tarjeta: await page.locator('[data-hud="brakes"]:not([hidden])').count(),
});
console.log('parado:  ', JSON.stringify(await leer()));
await page.screenshot({ path: process.argv[2] + '/picto-parado.png' });

for (let i = 0; i < 60; i++) await page.keyboard.press('+');
await page.waitForTimeout(1500);
console.log('rodando: ', JSON.stringify(await leer()));
await page.keyboard.down('ArrowUp');
await page.waitForTimeout(6000);
await page.keyboard.up('ArrowUp');
console.log('volando: ', JSON.stringify(await leer()));
await page.screenshot({ path: process.argv[2] + '/picto-volando.png' });
await b.close(); await server.close();

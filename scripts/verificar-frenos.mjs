import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ root: process.cwd(), server: { port: 5197 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });

for (const tramo of ['guyrami', 'taguato']) {
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => console.log('ERROR:', e.message));
  await page.addInitScript(t => localStorage.setItem('oga-veve:tramo', t), tramo);
  await page.goto('http://localhost:5197/');
  await page.waitForTimeout(2200);

  // Tarjeta de freno: en el suelo debe verse.
  const visible = await page.locator('.freno:not([hidden])').count();

  // Gas a tope y rodar sin frenar.
  for (let i = 0; i < 60; i++) await page.keyboard.press('+');
  await page.waitForTimeout(4000);
  const rodando = await page.locator('.freno:not([hidden])').count();

  // Motor a cero y freno a fondo.
  for (let i = 0; i < 60; i++) await page.keyboard.press('-');
  await page.keyboard.down('Space');
  await page.waitForTimeout(6000);
  const pisado = await page.locator('.freno--pisado').count();
  await page.keyboard.up('Space');

  // ¿Se ha parado? Se mide el desplazamiento en dos segundos.
  const antes = await page.locator('[data-hud="home-distance"]').textContent().catch(() => null);
  await page.waitForTimeout(2000);
  const despues = await page.locator('[data-hud="home-distance"]').textContent().catch(() => null);

  console.log(
    `${tramo.padEnd(9)} tarjeta al inicio=${visible} rodando=${rodando} encendida=${pisado}  ` +
    `distancia: ${antes} → ${despues}  ${antes === despues ? '⇒ PARADO' : '⇒ SIGUE'}`,
  );
  await page.close();
}
await b.close(); await server.close();

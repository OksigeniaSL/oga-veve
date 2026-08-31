import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ root: process.cwd(), server: { port: 5198 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });

// Tres formas de pantalla: portátil, tablet apaisada baja y móvil vertical.
const formas = [
  ['portátil  ', 1280, 800],
  ['apaisada  ', 1024, 600],
  ['vertical  ', 420, 860],
];

const solape = (a, b) => {
  if (!a || !b) return 0;
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? Math.round(w * h) : 0;
};

for (const [nombre, width, height] of formas) {
  const page = await b.newPage({ viewport: { width, height } });
  await page.addInitScript(() => localStorage.setItem('oga-veve:tramo', 'taguato-ruvicha'));
  await page.goto('http://localhost:5198/');
  await page.waitForTimeout(2200);
  const tutor = await page.locator('.tutor:not([hidden])').boundingBox().catch(() => null);
  const panel = await page.locator('.seispack').boundingBox();
  const abajo = await page.locator('.hud__abajo').boundingBox();
  const fuera = panel && (panel.y + panel.height > height + 1 || panel.x < -1);
  console.log(
    `${nombre} tutor×panel=${solape(tutor, panel)}px²  panel=${panel ? Math.round(panel.width)+'×'+Math.round(panel.height) : 'no'}` +
    `  ancho franja=${abajo ? Math.round(abajo.width) : '-'}  ¿se sale?=${fuera ? 'SÍ' : 'no'}`,
  );
  if (process.argv[2]) await page.screenshot({ path: `${process.argv[2]}/${nombre.trim()}.png` });
  await page.close();
}
await b.close(); await server.close();

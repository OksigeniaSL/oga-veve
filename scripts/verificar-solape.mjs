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

/**
 * La caja de un elemento **solo si se ve**.
 *
 * Un elemento con `opacity: 0` sigue ocupando su sitio, así que medir cajas a
 * secas da solapes de cosas invisibles. Lo que importa es si el niño ve una
 * cosa encima de otra.
 */
const visible = async (page, sel) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el || el.hidden) return null;
    // Se acumula la opacidad de toda la cadena de padres: basta con que uno
    // esté a cero para que no se vea nada.
    let o = 1;
    for (let p = el; p; p = p.parentElement) o *= Number(getComputedStyle(p).opacity);
    if (o < 0.05) return null;
    const r = el.getBoundingClientRect();
    return r.width && r.height ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
  }, sel);

const solape = (a, b) => {
  if (!a || !b) return 0;
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? Math.round(w * h) : 0;
};

for (const [nombre, width, height] of formas) {
  const page = await b.newPage({ viewport: { width, height } });
  await page.addInitScript(() => localStorage.setItem('oga-veve:tramo', 'taguato-ruvicha'));
  await page.goto('http://localhost:5198/?escenario=valle-cordillera');
  await page.waitForTimeout(2200);
  const tutor = await page.locator('.tutor:not([hidden])').boundingBox().catch(() => null);
  const panel = await page.locator('.seispack').boundingBox();
  const abajo = await page.locator('.hud__abajo').boundingBox();
  // La alarma se fuerza por **el camino de verdad**: la clase `hud--avisando`,
  // que es la que hace desaparecer al tutor. Forzándola a mano sin esa clase
  // se mide un solape que en el juego no existe, y una comprobación que
  // inventa fallos acaba ignorándose igual que una que no los ve.
  await page.evaluate(() => {
    const a = document.querySelector('[data-hud="warning-text"]');
    if (a) a.textContent = 'Ground! Pull up';
    document.querySelector('.aviso-hud')?.classList.add('aviso-hud--visible');
    document.querySelector('.hud')?.classList.add('hud--avisando');
  });
  await new Promise((r) => setTimeout(r, 400));
  const aviso = await visible(page, '.aviso-hud');
  const tutorConAviso = await visible(page, '.tutor');
  const fuera = panel && (panel.y + panel.height > height + 1 || panel.x < -1);
  const pares = [
    ['tutor×panel', solape(tutor, panel)],
    ['tutor×alarma', solape(tutorConAviso, aviso)],
    ['alarma×panel', solape(aviso, panel)],
  ];
  const malos = pares.filter(([, n]) => n > 0);
  console.log(
    `${nombre} ${pares.map(([n, v]) => `${n}=${v}px²`).join('  ')}` +
      `  ¿se sale?=${fuera ? 'SÍ' : 'no'}  ${malos.length ? '✗ SE SOLAPAN' : '✓'}`,
  );
  if (process.argv[2]) await page.screenshot({ path: `${process.argv[2]}/${nombre.trim()}.png` });
  await page.close();
}
await b.close(); await server.close();

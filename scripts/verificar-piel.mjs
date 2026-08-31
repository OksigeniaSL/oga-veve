import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ root: process.cwd(), server: { port: 5189 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });

// Contraste WCAG entre dos colores ya compuestos.
const lum = (rgb) => {
  const l = rgb.map(v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const ratio = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const rgb = (s) => s.match(/\d+/g).slice(0, 3).map(Number);

for (const tramo of ['guyrami', 'tuka', 'taguato', 'taguato-ruvicha']) {
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => console.log('ERROR:', e.message));
  await page.addInitScript(t => {
    localStorage.setItem('oga-veve:tramo', t);
    localStorage.setItem('oga-veve:teclas-vistas', '1');
  }, tramo);
  await page.goto('http://localhost:5189/?escenario=valle-cordillera');
  await page.waitForTimeout(2200);

  // Contraste medido sobre los elementos de verdad, no sobre valores teóricos.
  const medidas = await page.evaluate(() => {
    const out = [];
    for (const sel of ['.medidor__etiqueta', '.medidor__glosa', '.esfera__rotulo', '.aviso-hud']) {
      const el = document.querySelector(sel);
      if (!el) continue;
      let fondo = 'rgb(0,0,0)', p = el;
      while (p) {
        const bg = getComputedStyle(p).backgroundColor;
        if (bg && !bg.includes('rgba(0, 0, 0, 0)')) { fondo = bg; break; }
        p = p.parentElement;
      }
      out.push({ sel, color: getComputedStyle(el).color, fondo, tam: getComputedStyle(el).fontSize });
    }
    return out;
  });
  const linea = medidas.map(m => {
    const r = ratio(rgb(m.color), rgb(m.fondo));
    const minimo = parseFloat(m.tam) >= 24 ? 3 : 4.5;
    return `${m.sel.replace('.', '')} ${r.toFixed(1)}:1 ${m.tam} ${r >= minimo ? '✓' : '✗ FALLA'}`;
  }).join(' · ');
  console.log(`${tramo.padEnd(16)} ${linea || '(sin texto medible)'}`);
  await page.screenshot({ path: `${process.argv[2]}/piel-${tramo}.png` });
  await page.close();
}
await b.close(); await server.close();

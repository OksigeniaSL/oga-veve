/**
 * El hangar, mirado y medido.
 *
 * Mide el contraste de verdad, sobre los elementos ya compuestos y no sobre
 * valores teóricos: el barro es opaco justamente para que esta cuenta salga
 * una vez y valga siempre. Y comprueba lo que a un prelector le importa más
 * que ninguna otra cosa: que **todo lo que se toca sea grande de tocar**.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const D = process.argv[2] ?? '/tmp';
const server = await createServer({ root: process.cwd(), server: { port: 5199 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });

const lum = (rgb) => {
  const l = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const ratio = (a, c) => {
  const x = lum(a);
  const y = lum(c);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const rgb = (s) => s.match(/\d+/g).slice(0, 3).map(Number);

for (const [ancho, alto, nombre] of [
  [1280, 800, 'escritorio'],
  [820, 1180, 'tableta'],
  [390, 844, 'telefono'],
]) {
    // En español paraguayo, que es el idioma del producto: el navegador de
  // pruebas viene en inglés y las capturas salían en un idioma que aquí no
  // usa nadie.
  const page = await b.newPage({ viewport: { width: ancho, height: alto }, locale: 'es-PY' });
  page.on('pageerror', (e) => console.log('ERROR:', e.message));
  await page.goto('http://localhost:5199/');
  await page.waitForSelector('.ficha--sitio');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${D}/hangar-${nombre}.png` });

  const m = await page.evaluate(() => {
    const out = { tactos: [], textos: [], desborde: 0, planos: 0 };
    for (const el of document.querySelectorAll('.hangar button')) {
      const r = el.getBoundingClientRect();
      out.tactos.push({ q: el.className.split(' ')[0], w: Math.round(r.width), h: Math.round(r.height) });
    }
    for (const sel of ['.hangar__marca', '.hangar__pregunta', '.ficha__nombre', '.ficha__dato', '.ficha__numero', '.hangar__despegar']) {
      const el = document.querySelector(sel);
      if (!el) continue;
      let fondo = 'rgb(0,0,0)';
      let p = el;
      while (p) {
        const bg = getComputedStyle(p).backgroundColor;
        if (bg && !bg.includes('rgba(0, 0, 0, 0)')) {
          fondo = bg;
          break;
        }
        p = p.parentElement;
      }
      const cs = getComputedStyle(el);
      out.textos.push({ sel, color: cs.color, fondo, tam: parseFloat(cs.fontSize) });
    }
    out.desborde = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    // ¿Cabe entero sin desplazar? El botón de despegar es lo único que no se
    // puede quedar fuera de pantalla: si hay que buscarlo, no hay puerta.
    const b = document.querySelector('.hangar__despegar').getBoundingClientRect();
    out.despegarVisible = b.bottom <= window.innerHeight && b.top >= 0;
    out.alto = Math.round(document.querySelector('.hangar__marco').getBoundingClientRect().height);
    out.planos = document.querySelectorAll('.ficha__plano polyline.plano__pista').length;
    return out;
  });

  const chico = m.tactos.filter((x) => x.w < 44 || x.h < 44);
  console.log(`\n── ${nombre} ${ancho}×${alto}`);
  console.log(`  botones: ${m.tactos.length} · por debajo de 44 px: ${chico.length ? JSON.stringify(chico) : 'ninguno ✓'}`);
  console.log(`  desborde horizontal: ${m.desborde} px ${m.desborde <= 0 ? '✓' : '✗'}`);
  console.log(`  botón de despegar a la vista sin desplazar: ${m.despegarVisible ? 'sí ✓' : 'no ✗'}`);
  console.log(`  planos de pista dibujados: ${m.planos}`);
  for (const x of m.textos) {
    const r = ratio(rgb(x.color), rgb(x.fondo));
    const exige = x.tam >= 24 ? 3 : 4.5;
    console.log(
      `  ${x.sel.padEnd(22)} ${x.tam.toFixed(0)}px  ${r.toFixed(2)}:1  ${r >= exige ? '✓' : `✗ necesita ${exige}`}`,
    );
  }
  await page.close();
}

await b.close();
await server.close();

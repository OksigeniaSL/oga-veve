import { chromium } from 'playwright';
import { createServer } from 'vite';
const server = await createServer({ root: process.cwd(), server: { port: 5309, hmr: false } });
await server.listen();
const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle','--use-angle=gl','--enable-unsafe-swiftshader'],
});
const page = await b.newPage({ viewport: { width: 1100, height: 700 }, locale: 'es-PY' });
page.on('pageerror', e => console.log('ERROR:', e.message));
page.on('console', m => { const t = m.text(); if (t.startsWith('[voz]')) console.log(t); });
/*
 * Se finge un sintetizador: el de verdad no existe sin pantalla, y lo que hay
 * que ver es **quién corta a quién**, no cómo suena. Cada frase dura lo que
 * duraría, y `cancel()` se apunta.
 */
await page.addInitScript(() => {
  localStorage.setItem('oga-veve:teclas-vistas','1');
  const voz = { name: 'falsa', lang: 'es-ES', default: true, localService: true, voiceURI: 'falsa' };
  let enMarcha = null;
  const reloj = () => Math.round(performance.now());
  window.speechSynthesis = {
    getVoices: () => [voz, { ...voz, name: 'falsa2', lang: 'en-US' }],
    speak(u) {
      if (enMarcha) console.log(`[voz] ${reloj()} SOLAPA sobre «${enMarcha.text}»`);
      enMarcha = u;
      console.log(`[voz] ${reloj()} empieza «${u.text}»`);
      const dura = Math.max(900, u.text.length * 60);
      u._t = setTimeout(() => {
        if (enMarcha === u) { enMarcha = null; console.log(`[voz] ${reloj()} acaba   «${u.text}»`); u.onend?.(); u.dispatchEvent?.(new Event('end')); }
      }, dura);
    },
    cancel() {
      if (enMarcha) {
        console.log(`[voz] ${reloj()} CORTA   «${enMarcha.text}»`);
        clearTimeout(enMarcha._t);
        const u = enMarcha; enMarcha = null;
        u.onend?.(); u.dispatchEvent?.(new Event('end'));
      }
    },
    get speaking() { return enMarcha !== null; },
    get pending() { return false; },
    addEventListener() {}, removeEventListener() {},
  };
});
await page.goto('http://localhost:5309/?escenario=tenerife-norte&hora=12&leccion=despegue&tramo=taguato&avion=jaz-40');
await page.waitForTimeout(20000);
// Un gesto, que es lo que despierta el audio.
await page.mouse.click(550, 350);
await page.waitForTimeout(40000);
await b.close(); await server.close();

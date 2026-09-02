/** ¿Queda el aeródromo por encima de la foto, y rodando se mantiene en el suelo? */
import { chromium } from 'playwright';
import { createServer } from 'vite';
const D = process.argv[2] ?? '/tmp';
const server = await createServer({ root: process.cwd(), server: { port: 5276 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'] });
for (const esc of ['tenerife-norte', 'pettirossi']) {
  const page = await b.newPage({ viewport: { width: 1280, height: 720 }, locale: 'es-PY' });
  page.on('pageerror', (e) => console.log('ERROR:', e.message));
  await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
  await page.goto(`http://localhost:5276/?escenario=${esc}`);
  await page.waitForTimeout(95000);
  const r = await page.evaluate(async () => {
    const o = globalThis.__oga, s = o.estado(), c = o.controles();
    const alzado = o.alzado?.() ?? null;
    // Cuánto asoma la foto por encima de nuestro suelo, a lo largo de la pista.
    const asoma = [];
    for (let i = 0; i <= 30; i++) {
      const p = o.puntoDeFinal(-(i / 30) * 3000);
      const foto = o.cotaCruda(p.x, p.z);
      if (foto !== null) asoma.push(foto - p.suelo);
    }
    asoma.sort((a, b) => a - b);
    // Y un rodaje: motor y gas medio treinta segundos, contando cuántos
    // fotogramas el juego cree que estamos en el aire.
    c.engineOn = true;
    const x0 = s.position.x, z0 = s.position.z;
    let enElAire = 0, total = 0;
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 900; i++) {
      c.throttle = 0.25; c.elevator = 0;
      await espera(16);
      total++;
      if (!s.onGround) enElAire++;
    }
    return {
      alzado,
      asomaMax: asoma.length ? asoma[asoma.length - 1] : null,
      asomaMed: asoma.length ? asoma[Math.floor(asoma.length / 2)] : null,
      enElAire: `${enElAire} de ${total}`,
      recorrido2: Math.round(Math.hypot(s.position.x - x0, s.position.z - z0)),
    };
  });
  console.log(
    `${esc}: alzado ${r.alzado?.toFixed(2)} m · la foto asoma como mucho ` +
      `${r.asomaMax?.toFixed(2)} m (mediana ${r.asomaMed?.toFixed(2)}) · ` +
      `rodando ${r.recorrido2} m, en el aire ${r.enElAire} fotogramas`,
  );
  await page.close();
}
await b.close();
await server.close();

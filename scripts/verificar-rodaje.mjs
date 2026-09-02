/**
 * Rodando por la pista, ¿se queda el avión en el suelo?
 *
 * La pregunta parece la misma que la de `verificar-suelo.mjs` y no lo es. Allí
 * se mide el terreno; aquí, el modelo de vuelo. Hizo falta separarlas porque
 * durante horas se buscó en el terreno un problema que estaba en el modelo: el
 * pavimento de los dos aeropuertos está liso hasta el centímetro y aun así el
 * avión pasaba parte del rodaje en el aire, con el aviso «¡el suelo, subí!»
 * parpadeando.
 *
 * Se rueda **por la pista**, que es la superficie que ya se ha comprobado que
 * es lisa. Si aquí el avión se despega, no es el suelo.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ root: process.cwd(), server: { port: 5279 } });
await server.listen();
const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'],
});

for (const [esc, tramo] of [
  ['tenerife-norte', 'taguato'],
  ['tenerife-norte', 'guyrami'],
  ['pettirossi', 'taguato'],
]) {
  const page = await b.newPage({ viewport: { width: 900, height: 600 }, locale: 'es-PY' });
  page.on('pageerror', (e) => console.log('ERROR:', e.message));
  await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
  await page.goto(`http://localhost:5279/?escenario=${esc}&teselas=0&tramo=${tramo}`);
  await page.waitForTimeout(6000);

  const r = await page.evaluate(async () => {
    const o = globalThis.__oga;
    const s = o.estado();
    const c = o.controles();
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    // Alineado en la pista, que es donde se ha medido que el suelo es liso.
    const p = o.puntoDeFinal(-200);
    s.position.x = p.x;
    s.position.z = p.z;
    s.heading = p.h;
    s.position.y = p.suelo + 1;
    s.velocity.x = 0;
    s.velocity.y = 0;
    s.velocity.z = 0;
    c.engineOn = true;
    await espera(1500);

    const x0 = s.position.x;
    const z0 = s.position.z;
    let aire = 0;
    let masAlto = 0;
    for (let i = 0; i < 600; i++) {
      // Gas de rodaje y mando de cabeceo **quieto**: nadie está pidiendo subir.
      c.throttle = 0.3;
      c.elevator = 0;
      await espera(16);
      if (!s.onGround) aire++;
      const sobre = s.position.y - (o.suelo(s.position.x, s.position.z) + 1.2);
      if (sobre > masAlto) masAlto = sobre;
    }
    return {
      aire,
      masAlto,
      metros: Math.round(Math.hypot(s.position.x - x0, s.position.z - z0)),
      kmh: s.airspeed * 3.6,
    };
  });

  console.log(
    `${esc} · ${tramo}: rodó ${r.metros} m a ${r.kmh.toFixed(0)} km/h · ` +
      `en el aire ${r.aire} de 600 fotogramas · se levantó como mucho ${r.masAlto.toFixed(2)} m`,
  );
  await page.close();
}

await b.close();
await server.close();

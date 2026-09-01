/**
 * ¿Se queda el avión en la calle de rodaje sin que nadie lo dirija?
 *
 * Es la pregunta que hace útil la asistencia de dirección, y la única forma de
 * contestarla es soltar el mando y mirar. Se rueda con gas y **sin tocar el
 * timón ni los alerones**, y se anota cuánto se aparta el avión de la raya.
 *
 * Un peldaño con asistencia tiene que llevarlo; uno sin ella, no. Si Guyrami y
 * Taguato Ruvicha dan el mismo número, la escalera no existe.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ root: process.cwd(), server: { port: 5239 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });

console.log('tramo              desvío máximo   al final   ¿se sale de la calle?');
for (const tramo of ['guyrami', 'tuka', 'taguato', 'taguato-ruvicha']) {
  const page = await b.newPage();
  page.on('pageerror', (e) => console.log('ERROR:', e.message));
  await page.addInitScript((t) => {
    localStorage.setItem('oga-veve:teclas-vistas', '1');
    localStorage.setItem('oga-veve:tramo', t);
  }, tramo);
  await page.goto('http://localhost:5239/?escenario=pettirossi');
  await page.waitForTimeout(2500);

  const r = await page.evaluate(async () => {
    const o = globalThis.__oga;
    const cuadro = () => new Promise((r) => requestAnimationFrame(() => r()));
    const alaRaya = (e, ruta) => {
      let m = Infinity;
      for (let i = 0; i < ruta.length - 1; i++) {
        const [ax, az] = ruta[i];
        const [bx, bz] = ruta[i + 1];
        const dx = bx - ax;
        const dz = bz - az;
        const l = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((e.position.x - ax) * dx + (e.position.z - az) * dz) / l));
        m = Math.min(m, Math.hypot(e.position.x - (ax + t * dx), e.position.z - (az + t * dz)));
      }
      return m;
    };
    let peor = 0;
    // **Solo gas.** Ni alerón ni timón: es lo que hace alguien de cuatro años
    // que todavía no sabe que hay que girar.
    o.pilotar((c) => {
      const e = o.estado();
      c.engineOn = true;
      c.aileron = 0;
      c.rudder = 0;
      c.elevator = 0;
      c.throttle = e.airspeed < 7 ? 0.45 : 0;
      c.brakes = e.airspeed > 10 ? 1 : 0;
    });
    const t0 = performance.now();
    while (performance.now() - t0 < 75000) {
      await cuadro();
      const e = o.estado();
      const ruta = o.ruta();
      if (ruta.length > 1) peor = Math.max(peor, alaRaya(e, ruta));
      if (!e.onGround) break;
    }
    const e = o.estado();
    const ruta = o.ruta();
    o.pilotar(null);
    return { peor: Math.round(peor), final: ruta.length > 1 ? Math.round(alaRaya(e, ruta)) : -1 };
  });

  // Una calle de rodaje tiene veintitrés metros: pasar de doce del eje es
  // tener una rueda fuera del asfalto.
  const fuera = r.peor > 12;
  console.log(
    `${tramo.padEnd(18)} ${String(r.peor).padStart(9)} m ${String(r.final).padStart(10)} m   ` +
      `${fuera ? 'SÍ ✗' : 'no ✓'}`,
  );
  await page.close();
}
await b.close();
await server.close();

/** ¿Arranca el motor al pulsar la tecla, y se mueve el avión con gas? */
import { chromium } from 'playwright';
import { createServer } from 'vite';
const server = await createServer({ root: process.cwd(), server: { port: 5239 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
for (const leccion of (process.argv[2] ?? 'despegue,vuelta').split(',')) {
  const page = await b.newPage({ viewport: { width: 1000, height: 700 }, locale: 'es-PY' });
  page.on('pageerror', (e) => console.log('ERROR:', e.message));
  await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
  await page.goto(`http://localhost:5239/?escenario=${process.argv[3] ?? 'tenerife-norte'}&leccion=${leccion}`);
  await page.waitForTimeout(3500);

  const antes = await page.evaluate(() => {
    const o = globalThis.__oga;
    return { motor: o.controles().engineOn, frenos: o.controles().brakes, fase: o.fase() };
  });

  await page.keyboard.press('KeyI');
  await page.waitForTimeout(900);
  const trasI = await page.evaluate(() => {
    const o = globalThis.__oga;
    return { motor: o.controles().engineOn, frenos: o.controles().brakes, fase: o.fase() };
  });

  // Gas a tope durante cinco segundos. **X sube, Z baja** — Z era el fallo de
  // la primera versión de esta prueba, y probablemente el de quien la reportó.
  await page.keyboard.down('KeyX');
  await page.waitForTimeout(5000);
  await page.keyboard.up('KeyX');
  const trasGas = await page.evaluate(() => {
    const o = globalThis.__oga;
    const s = o.estado();
    const c = o.controles();
    return {
      motor: c.engineOn,
      gas: Math.round(c.throttle * 100) / 100,
      frenos: c.brakes,
      vel: Math.round(s.airspeed * 10) / 10,
      fase: o.fase(),
    };
  });

  console.log(
    `${leccion.padEnd(9)} al empezar motor=${antes.motor} frenos=${antes.frenos} fase=${antes.fase}\n` +
      `          tras I  motor=${trasI.motor} frenos=${trasI.frenos} fase=${trasI.fase}\n` +
      `          tras gas motor=${trasGas.motor} gas=${trasGas.gas} frenos=${trasGas.frenos} vel=${trasGas.vel} m/s fase=${trasGas.fase}`,
  );
  await page.close();
}
await b.close();
await server.close();

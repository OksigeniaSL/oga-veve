/**
 * El vuelo completo, volado de verdad en un navegador.
 *
 * La máquina de fases tiene sus propias pruebas y pasan en Node en cuatro
 * milisegundos. Lo que esas pruebas **no** pueden decir es si el avión aparece
 * donde toca, si la raya verde se ve, si la ruta lleva a alguna parte y si la
 * luz de la torre se enciende. Eso hay que volarlo.
 *
 * Uso: `node scripts/verificar-vuelo.mjs [carpeta-de-capturas]`
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const D = process.argv[2] ?? '/tmp';
const server = await createServer({ root: process.cwd(), server: { port: 5213 } });
await server.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });

/*
 * Solo se rueda en Tenerife Norte, y es a propósito.
 *
 * Su ruta del puesto a la doble raya son ciento cuarenta metros; la de Silvio
 * Pettirossi, mil quinientos, que a velocidad de rodaje son cinco minutos de
 * reloj. Una comprobación que tarda cinco minutos no se ejecuta nunca, y una
 * que no se ejecuta no comprueba nada. De Asunción se mira lo que no hace
 * falta rodar: dónde aparece el avión y hacia dónde mira.
 */
const RUEDAN = new Set(['tenerife-norte']);

for (const escenario of ['pettirossi', 'tenerife-norte']) {
  const page = await b.newPage({ viewport: { width: 1280, height: 800 }, locale: 'es-PY' });
  page.on('pageerror', (e) => console.log('ERROR:', e.message));
  await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
  await page.goto(`http://localhost:5213/?escenario=${escenario}`);
  await page.waitForTimeout(3000);

  // Lo que no se ve en una captura: si el avión mira hacia donde tiene que
  // irse. Un avión que aparece de espaldas a su ruta obliga a maniobrar antes
  // de entender nada.
  const inicio = await page.evaluate(async () => {
    const { SCENARIOS } = await import('/src/world/scenarios.ts');
    const { PlanDeVuelo } = await import('/src/world/plan-de-vuelo.ts');
    const esc = SCENARIOS.find((s) => s.id === new URLSearchParams(location.search).get('escenario'));
    const plan = new PlanDeVuelo(esc.aerodrome, esc.runway, () => 0);
    plan.reiniciar();
    const salida = plan.arranque();
    const paso = plan.primerPaso();
    const rumboRuta =
      salida && paso
        ? ((Math.atan2(paso[0] - salida[0], -(paso[1] - salida[1])) * 180) / Math.PI + 360) % 360
        : null;
    return {
      aviso: document.querySelector('[data-hud="hint"]')?.textContent?.trim() ?? '',
      rumboRuta: rumboRuta === null ? null : Math.round(rumboRuta),
      hdg: document.querySelector('[data-hud="heading"]')?.textContent ?? '',
    };
  });
  console.log(`\n── ${escenario}`);
  console.log(`  al empezar: «${inicio.aviso}»`);
  console.log(
    `  el avión mira a HDG ${inicio.hdg} y la ruta se va a ${inicio.rumboRuta}° verdaderos`,
  );
  await page.screenshot({ path: `${D}/vuelo-${escenario}-1-puesto.png` });

  // ── Rodar de verdad ─────────────────────────────────────────────────────
  //
  // Con un seguidor de línea: motor corto para ir a unos quince por hora, y
  // timón hacia el punto de la ruta que queda cien metros por delante. No
  // pretende rodar bonito, pretende **demostrar que la raya lleva a alguna
  // parte** y que la torre acaba dando luz verde.
  //
  // El primer intento fue «dar motor y ya», y el avión despegó de la
  // plataforma a doscientos por hora sin que la comprobación se enterara: una
  // prueba que no mira lo que está haciendo no prueba nada.
  if (!RUEDAN.has(escenario)) {
    await page.close();
    continue;
  }

  await page.keyboard.press('KeyI');
  await page.waitForTimeout(400);

  const fases = [];
  let ultima = '';
  let despegoSinQuerer = false;

  for (let paso = 0; paso < 600; paso++) {
    const info = await page.evaluate(() => {
      const o = globalThis.__oga;
      const e = o.estado();
      const ruta = o.ruta();
      // El punto de la ruta cien metros por delante del más cercano.
      let mejor = Infinity;
      let cual = 0;
      ruta.forEach((p, k) => {
        const d = Math.hypot(p[0] - e.position.x, p[1] - e.position.z);
        if (d < mejor) {
          mejor = d;
          cual = k;
        }
      });
      let mira = ruta[ruta.length - 1] ?? null;
      let acumulado = 0;
      for (let k = cual; k < ruta.length - 1; k++) {
        acumulado += Math.hypot(ruta[k + 1][0] - ruta[k][0], ruta[k + 1][1] - ruta[k][1]);
        if (acumulado > 100) {
          mira = ruta[k + 1];
          break;
        }
      }
      const rumbo = ((e.heading * 180) / Math.PI + 360) % 360;
      let giro = null;
      if (mira) {
        const quiero =
          ((Math.atan2(mira[0] - e.position.x, -(mira[1] - e.position.z)) * 180) / Math.PI + 360) %
          360;
        giro = ((quiero - rumbo + 540) % 360) - 180;
      }
      return {
        vel: e.airspeed,
        alto: e.position.y,
        giro,
        aLaRuta: mejor,
        aviso: document.querySelector('[data-hud="hint"]')?.textContent?.trim() ?? '',
        torre: document.querySelector('.torre')?.hidden
          ? null
          : document.querySelector('.torre')?.className.includes('verde')
            ? 'verde'
            : 'roja',
      };
    });

    if (info.aviso && info.aviso !== ultima) {
      ultima = info.aviso;
      fases.push(`${info.aviso}${info.torre ? `  [luz ${info.torre}]` : ''}`);
      if (info.torre === 'verde') break;
    }
    if (info.vel > 30) despegoSinQuerer = true;

    // Timón hacia la ruta, y motor corto.
    if (info.giro !== null && Math.abs(info.giro) > 4) {
      await page.keyboard.down(info.giro > 0 ? 'KeyE' : 'KeyQ');
      await page.waitForTimeout(40);
      await page.keyboard.up(info.giro > 0 ? 'KeyE' : 'KeyQ');
    }
    if (info.vel < 4) {
      await page.keyboard.down('ShiftLeft');
      await page.waitForTimeout(30);
      await page.keyboard.up('ShiftLeft');
    } else if (info.vel > 6) {
      await page.keyboard.down('KeyB');
      await page.waitForTimeout(30);
      await page.keyboard.up('KeyB');
    } else {
      await page.waitForTimeout(30);
    }
  }

  console.log('  rodando, lo que fue diciendo el juego:');
  for (const f of fases) console.log(`    · ${f}`);
  console.log(
    `  ¿llegó a la luz verde? ${fases.some((f) => f.includes('verde')) ? 'sí ✓' : 'no ✗'}` +
      `${despegoSinQuerer ? '  ✗ despegó sin querer' : ''}`,
  );
  await page.screenshot({ path: `${D}/vuelo-${escenario}-3-rodando.png` });
  await page.close();
}

await b.close();
await server.close();

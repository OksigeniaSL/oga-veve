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

  if (!RUEDAN.has(escenario)) {
    await page.close();
    continue;
  }

  // ── Rodar de verdad ─────────────────────────────────────────────────────
  //
  // **El bucle va dentro de la página.** Pilotar desde fuera cuesta un viaje de
  // ida y vuelta al navegador por cada tecla, y así rodar ciento cuarenta
  // metros tardaba más de tres minutos: la comprobación se quedaba sin tiempo
  // antes de llegar a la doble raya. Metida dentro, tarda segundos.
  //
  // Lo que hace es seguir la línea: timón hacia el punto de la ruta que queda
  // sesenta metros por delante, y motor corto para ir a paso de rodaje. No
  // pretende rodar bonito; pretende demostrar que la raya lleva a alguna parte
  // y que la torre acaba dando luz verde.
  const resultado = await page.evaluate(async () => {
    const o = globalThis.__oga;
    const cuadro = () => new Promise((r) => requestAnimationFrame(() => r()));
    const hasta = performance.now() + 150000;

    const fases = [];
    let ultima = '';
    let masRapido = 0;
    let cerca = Infinity;
    let arranque = null;
    let ultimaPos = null;
    let destino = null;
    let vecesQueGiro = 0;

    // **El piloto va enganchado al bucle del juego**, no escribiendo en los
    // mandos desde fuera. Escribir desde fuera no servía: `input.update()`
    // reescribe los mandos enteros cada fotograma y le quitaba el timón al
    // instante, así que el avión salía recto de la plataforma y se alejaba de
    // su ruta mientras la comprobación anotaba, tan contenta, que rodaba.
    o.pilotar((c) => {
      const e = o.estado();
      const ruta = o.ruta();
      c.engineOn = true;
      masRapido = Math.max(masRapido, e.airspeed);
      if (ruta.length < 2) return;

      const fin = ruta[ruta.length - 1];
      const alFinal = Math.hypot(fin[0] - e.position.x, fin[1] - e.position.z);
      cerca = Math.min(cerca, alFinal);
      arranque ??= [Math.round(e.position.x), Math.round(e.position.z)];
      ultimaPos = [Math.round(e.position.x), Math.round(e.position.z)];
      destino = [Math.round(fin[0]), Math.round(fin[1])];

      // Parar al llegar: la torre solo mira a quien está parado del todo.
      if (alFinal < 28) {
        c.throttle = 0;
        c.brakes = 1;
        c.aileron = 0;
        c.rudder = 0;
        return;
      }

      // Timón hacia el punto de la ruta sesenta metros por delante.
      let mejor = Infinity;
      let cual = 0;
      ruta.forEach((p, k) => {
        const d = Math.hypot(p[0] - e.position.x, p[1] - e.position.z);
        if (d < mejor) {
          mejor = d;
          cual = k;
        }
      });
      let mira = fin;
      let acumulado = 0;
      for (let k = cual; k < ruta.length - 1; k++) {
        acumulado += Math.hypot(ruta[k + 1][0] - ruta[k][0], ruta[k + 1][1] - ruta[k][1]);
        if (acumulado > 45) {
          mira = ruta[k + 1];
          break;
        }
      }
      const rumbo = ((e.heading * 180) / Math.PI + 360) % 360;
      const quiero =
        ((Math.atan2(mira[0] - e.position.x, -(mira[1] - e.position.z)) * 180) / Math.PI + 360) %
        360;
      const giro = ((quiero - rumbo + 540) % 360) - 180;
      // **En tierra se gira con el alabeo, no con el timón.** La rueda de morro
      // va en el eje de alabeo desde que se añadió la dirección en tierra, y el
      // primer comprobador ponía timón y alabeo a cero: el avión salió del
      // puesto perfectamente recto y siguió recto sesenta segundos, con el
      // rumbo clavado en 190 de principio a fin, mientras la comprobación
      // anotaba que estaba rodando.
      // **Los mandos se llaman `aileron` y `rudder`.** Escribir en `roll` y
      // `yaw` no da error: crea dos propiedades que nadie lee, y el avión sale
      // recto del puesto con el rumbo clavado mientras la comprobación anota
      // trescientos mandos de giro. Perdí media hora buscando el fallo en el
      // juego, que estaba bien.
      const mando = Math.max(-1, Math.min(1, giro / 20));
      if (Math.abs(mando) > 0.05) vecesQueGiro++;
      c.aileron = mando;
      c.rudder = mando * 0.5;
      c.elevator = 0;
      // Ocho metros por segundo, unos treinta por hora: es lo que rueda un
      // avión de verdad por una recta, y a cuatro esta comprobación tardaba
      // tres minutos y se quedaba sin tiempo antes de llegar.
      c.throttle = e.airspeed < 8 ? 0.5 : 0;
      c.brakes = e.airspeed > 11 ? 1 : 0;
    });

    for (;;) {
      const fase = o.fase();
      if (fase && fase !== ultima) {
        ultima = fase;
        const luz = document.querySelector('.torre');
        fases.push({
          fase,
          luz: luz && !luz.hidden ? (luz.className.includes('verde') ? 'verde' : 'roja') : null,
          aviso: document.querySelector('[data-hud="hint"]')?.textContent?.trim() ?? '',
        });
        if (fase === 'autorizado') break;
      }
      if (performance.now() > hasta) break;
      await cuadro();
    }

    o.pilotar(null);
    return {
      fases,
      masRapido: Math.round(masRapido * 3.6),
      cerca: Math.round(cerca),
      arranque,
      ultimaPos,
      destino,
      vecesQueGiro,
      recorrido:
        arranque && ultimaPos
          ? Math.round(Math.hypot(ultimaPos[0] - arranque[0], ultimaPos[1] - arranque[1]))
          : 0,
      seQuedoSinTiempo: performance.now() > hasta,
    };
  });

  console.log('  rodando, fase a fase:');
  for (const f of resultado.fases) {
    console.log(
      `    · ${f.fase.padEnd(13)} ${f.luz ? `[luz ${f.luz}]` : '         '}  «${f.aviso}»`,
    );
  }
  console.log(
    `  salió de [${resultado.arranque}] y acabó en [${resultado.ultimaPos}] · destino [${resultado.destino}]`,
  );
  console.log(
    `  se movió ${resultado.recorrido} m en línea recta y pidió timón ${resultado.vecesQueGiro} veces`,
  );
  const llego = resultado.fases.some((f) => f.fase === 'autorizado');
  console.log(
    `  ¿llegó a la luz verde? ${llego ? 'sí ✓' : 'no ✗'}` +
      `  · lo más cerca que llegó del final: ${resultado.cerca} m` +
      `  · lo más rápido que fue: ${resultado.masRapido} km/h` +
      `${resultado.masRapido > 60 ? ' ✗ eso no es rodar, es despegar' : ''}` +
      `${resultado.seQuedoSinTiempo ? ' · se acabó el tiempo' : ''}`,
  );
  await page.screenshot({ path: `${D}/vuelo-${escenario}-3-rodando.png` });
  await page.close();
}

await b.close();
await server.close();

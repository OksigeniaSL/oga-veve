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

  // ── El vuelo entero, volado ──────────────────────────────────────────────
  //
  // Un piloto automático que hace lo que hay que hacer en cada fase. No
  // pretende volar bonito: pretende **demostrar que las catorce fases se
  // encadenan de verdad**, con un avión de verdad y la física de verdad, y no
  // solo en una prueba unitaria que le da a la máquina de estados las
  // situaciones ya masticadas.
  //
  // El circuito es una lágrima y no un rectángulo, y es a propósito: se
  // despega en el rumbo de la pista, se sube, se dan dos virajes de ciento
  // ochenta y se vuelve a entrar **por la misma cabecera y en el mismo
  // sentido**. Un rectángulo de tráfico haría lo mismo con cuatro virajes en
  // vez de dos; la lágrima prueba lo mismo y cabe en menos código.
  const resultado = await page.evaluate(async () => {
    const o = globalThis.__oga;
    const cuadro = () => new Promise((r) => requestAnimationFrame(() => r()));
    const hasta = performance.now() + 420000;
    const pista = o.pista();

    const rad = (g) => (g * Math.PI) / 180;
    const delante = (g) => [Math.sin(rad(g)), -Math.cos(rad(g))];
    const traves = (g) => [Math.cos(rad(g)), Math.sin(rad(g))];

    /** Dónde está el avión en ejes de pista: cuánto por delante y cuánto de lado. */
    const enEjes = (x, z) => {
      const [fx, fz] = delante(pista.heading);
      const [tx, tz] = traves(pista.heading);
      const dx = x - pista.x;
      const dz = z - pista.z;
      return { along: dx * fx + dz * fz, across: dx * tx + dz * tz };
    };

    const rumboDe = (e) => ((e.heading * 180) / Math.PI + 360) % 360;
    const error = (quiero, tengo) => ((quiero - tengo + 540) % 360) - 180;

    const fases = [];
    let ultima = '';
    let etapa = 'salida';
    let masAlto = 0;
    let toque = null;

    o.pilotar((c) => {
      const e = o.estado();
      const fase = o.fase();
      const ruta = o.ruta();
      const { along, across } = enEjes(e.position.x, e.position.z);
      const suelo = e.position.y;
      masAlto = Math.max(masAlto, suelo);

      c.engineOn = fase !== 'en-puesto';
      c.aileron = 0;
      c.elevator = 0;
      c.rudder = 0;
      c.brakes = 0;

      /** Rodar siguiendo la raya verde hasta su final, y parar allí. */
      const seguirLaRaya = () => {
        if (ruta.length < 2) return;
        const fin = ruta[ruta.length - 1];
        const alFinal = Math.hypot(fin[0] - e.position.x, fin[1] - e.position.z);
        if (alFinal < 28) {
          c.throttle = 0;
          c.brakes = 1;
          return;
        }
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
        const quiero =
          ((Math.atan2(mira[0] - e.position.x, -(mira[1] - e.position.z)) * 180) / Math.PI + 360) %
          360;
        const giro = error(quiero, rumboDe(e));
        c.aileron = Math.max(-1, Math.min(1, giro / 20));
        c.rudder = c.aileron * 0.5;
        c.throttle = e.airspeed < 8 ? 0.5 : 0;
        c.brakes = e.airspeed > 11 ? 1 : 0;
      };

      /** Rodar hacia un punto concreto del mundo. */
      const rodarHacia = (x, z, vel = 8) => {
        const quiero = ((Math.atan2(x - e.position.x, -(z - e.position.z)) * 180) / Math.PI + 360) % 360;
        const giro = error(quiero, rumboDe(e));
        c.aileron = Math.max(-1, Math.min(1, giro / 20));
        c.rudder = c.aileron * 0.5;
        c.throttle = e.airspeed < vel ? 0.5 : 0;
        c.brakes = e.airspeed > vel + 3 ? 1 : 0;
      };

      /** Volar a un rumbo, subiendo o bajando lo que se le pida. */
      const volarA = (rumbo, subida, gas) => {
        const giro = error(rumbo, rumboDe(e));
        // Alabeo proporcional al error de rumbo, con tope de treinta grados de
        // inclinación, que es lo que se usa en un circuito de verdad.
        c.aileron = Math.max(-0.6, Math.min(0.6, giro / 30));
        c.rudder = c.aileron * 0.25;
        // Cabeceo por velocidad vertical: se pide una y se corrige la que hay.
        c.elevator = Math.max(-0.5, Math.min(0.6, (subida - e.verticalSpeed) * 0.09));
        c.throttle = gas;
      };

      switch (fase) {
        case 'estacionado':
        case 'arrancando':
        case 'rodando':
        case 'esperando':
          seguirLaRaya();
          break;

        case 'autorizado': {
          // Entrar a la pista: se rueda al eje, ciento cincuenta metros pista
          // adentro desde la cabecera de salida.
          const [fx, fz] = delante(pista.heading);
          const d = -pista.length / 2 + 150;
          rodarHacia(pista.x + fx * d, pista.z + fz * d, 7);
          break;
        }

        case 'alineando': {
          const giro = error(pista.heading, rumboDe(e));
          c.aileron = Math.max(-1, Math.min(1, giro / 12));
          c.rudder = c.aileron * 0.5;
          c.throttle = e.airspeed < 4 ? 0.35 : 0;
          break;
        }

        case 'despegando': {
          c.throttle = 1;
          const giro = error(pista.heading, rumboDe(e));
          c.aileron = Math.max(-0.5, Math.min(0.5, giro / 15));
          c.rudder = c.aileron * 0.6;
          // Rotar a partir de treinta y dos metros por segundo, que es
          // velocidad de rotación de una avioneta.
          c.elevator = e.airspeed > 32 ? 0.45 : 0;
          break;
        }

        case 'en-vuelo': {
          const alturaSuelo = suelo - (pista.elev ?? 0);
          if (etapa === 'salida') {
            volarA(pista.heading, 6, 1);
            if (along > 2500 && suelo > masAlto - 5 && suelo > 400) etapa = 'vuelta1';
          } else if (etapa === 'vuelta1') {
            // Primer viraje de ciento ochenta.
            volarA((pista.heading + 180) % 360, 0, 0.8);
            if (Math.abs(error((pista.heading + 180) % 360, rumboDe(e))) < 12) etapa = 'volviendo';
          } else if (etapa === 'volviendo') {
            volarA((pista.heading + 180) % 360, 0, 0.8);
            // Se vuelve hasta cinco kilómetros por detrás de la cabecera.
            if (along < -pista.length / 2 - 4500) etapa = 'vuelta2';
          } else if (etapa === 'vuelta2') {
            volarA(pista.heading, 0, 0.7);
            if (Math.abs(error(pista.heading, rumboDe(e))) < 12) etapa = 'entrando';
          } else {
            // Entrando: corrige el desvío lateral y baja hacia la cabecera.
            const correccion = Math.max(-25, Math.min(25, -across / 40));
            volarA((pista.heading + correccion + 360) % 360, -3.5, 0.35);
          }
          void alturaSuelo;
          break;
        }

        case 'final': {
          const correccion = Math.max(-20, Math.min(20, -across / 30));
          // Se afloja la bajada cerca del suelo, que es la recogida.
          const bajada = suelo - (o.estado().position.y - 0) < 0 ? -3 : -3;
          volarA((pista.heading + correccion + 360) % 360, bajada, 0.3);
          break;
        }

        case 'aterrizado':
          toque ??= Math.round(along);
          c.throttle = 0;
          c.brakes = 1;
          {
            const giro = error(pista.heading, rumboDe(e));
            c.aileron = Math.max(-0.6, Math.min(0.6, giro / 15));
            c.rudder = c.aileron * 0.5;
          }
          break;

        case 'abandonando': {
          // Salir de la pista: se rueda perpendicular hasta dejarla libre.
          const [tx, tz] = traves(pista.heading);
          const lado = across >= 0 ? 1 : -1;
          rodarHacia(
            e.position.x + tx * lado * 200,
            e.position.z + tz * lado * 200,
            6,
          );
          break;
        }

        case 'a-plataforma':
          seguirLaRaya();
          break;

        case 'en-puesto':
          c.throttle = 0;
          c.brakes = 1;
          c.engineOn = false;
          break;

        default:
          c.throttle = 0;
          c.brakes = 1;
          break;
      }
    });

    for (;;) {
      const fase = o.fase();
      if (fase && fase !== ultima) {
        ultima = fase;
        const e = o.estado();
        const { along, across } = enEjes(e.position.x, e.position.z);
        fases.push({
          fase,
          etapa,
          alto: Math.round(e.position.y),
          vel: Math.round(e.airspeed * 3.6),
          along: Math.round(along),
          across: Math.round(across),
          aviso: document.querySelector('[data-hud="hint"]')?.textContent?.trim() ?? '',
        });
        if (fase === 'apagado') break;
      }
      if (performance.now() > hasta) break;
      await cuadro();
    }

    o.pilotar(null);
    return {
      fases,
      etapa,
      toque,
      masAlto: Math.round(masAlto),
      seQuedoSinTiempo: performance.now() > hasta,
    };
  });

  console.log('  el vuelo entero, fase a fase:');
  for (const f of resultado.fases) {
    console.log(
      `    · ${f.fase.padEnd(13)} ${String(f.alto).padStart(4)} m  ${String(f.vel).padStart(3)} km/h` +
        `  eje ${String(f.along).padStart(6)} / ${String(f.across).padStart(5)} m   «${f.aviso}»`,
    );
  }
  const llego = (f) => resultado.fases.some((x) => x.fase === f);
  console.log(
    `  despegó: ${llego('en-vuelo') ? '✓' : '✗'}` +
      ` · aterrizó: ${llego('aterrizado') ? '✓' : '✗'}` +
      ` · abandonó la pista: ${llego('a-plataforma') ? '✓' : '✗'}` +
      ` · volvió al puesto: ${llego('en-puesto') ? '✓' : '✗'}` +
      ` · apagó: ${llego('apagado') ? '✓' : '✗'}`,
  );
  console.log(
    `  subió a ${resultado.masAlto} m · se quedó en la etapa «${resultado.etapa}»` +
      `${resultado.seQuedoSinTiempo ? ' · se acabó el tiempo' : ''}`,
  );
  await page.screenshot({ path: `${D}/vuelo-${escenario}-3-rodando.png` });
  await page.close();
}

await b.close();
await server.close();

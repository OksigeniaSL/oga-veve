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
  await page.addInitScript(() => {
    localStorage.setItem('oga-veve:teclas-vistas', '1');
    // **Con la física de verdad.** El modelo sencillo de Guyrami sube solo
    // por encima de cierta velocidad y con un piloto automático corriente no
    // se le saca un ascenso: es a propósito —ese peldaño enseña que hay que
    // correr para volar— pero para comprobar un circuito completo hace falta
    // el modelo de coeficientes, donde una ley de mando normal funciona.
    localStorage.setItem('oga-veve:tramo', 'taguato-ruvicha');
  });
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
    let desdeEtapa = performance.now();
    const irA = (nueva) => {
      etapa = nueva;
      desdeEtapa = performance.now();
    };
    /** Segundos en la etapa actual. Ninguna puede durar para siempre. */
    const enEtapa = () => (performance.now() - desdeEtapa) / 1000;
    let masAlto = 0;
    let toque = null;
    const rastro = [];

    o.pilotar((c) => {
      const e = o.estado();
      const fase = o.fase();
      const ruta = o.ruta();
      const { along, across } = enEjes(e.position.x, e.position.z);
      const suelo = e.position.y;
      masAlto = Math.max(masAlto, e.heightAboveGround ?? 0);

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
        if (alFinal < 15) {
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

        // **Protección de velocidad, que es lo que hace un piloto.** La primera
        // versión pedía seis metros por segundo de ascenso nada más despegar y
        // tiraba del morro a ciento doce por hora: el avión entraba en pérdida
        // a quince metros y se estrellaba, y el juego lo reiniciaba solo. Antes
        // de subir hay que tener velocidad; si falta, se baja el morro aunque
        // se pierda altura.
        const V_SEGURA = 36;
        const pedida = e.airspeed < V_SEGURA ? Math.min(subida, -0.5) : subida;
        // Y con ganancia suave: un mando de cabeceo nervioso es un fugoide.
        c.elevator = Math.max(-0.35, Math.min(0.35, (pedida - e.verticalSpeed) * 0.05));
        c.throttle = e.airspeed < V_SEGURA ? 1 : gas;
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
          // **Apuntar al eje, no al rumbo.** Corrigiendo solo el rumbo, el
          // avión entraba a la pista por el borde, se ponía paralelo al eje a
          // veintidós metros de él y rodaba así hasta el final sin alinearse
          // nunca: el rumbo era perfecto y el desvío no se tocaba.
          const [fx, fz] = delante(pista.heading);
          const [tx, tz] = traves(pista.heading);
          const d = along + 180;
          const objetivoX = pista.x + fx * d + tx * 0;
          const objetivoZ = pista.z + fz * d + tz * 0;
          const quiero =
            ((Math.atan2(objetivoX - e.position.x, -(objetivoZ - e.position.z)) * 180) / Math.PI +
              360) %
            360;
          const giro = error(quiero, rumboDe(e));
          c.aileron = Math.max(-1, Math.min(1, giro / 12));
          c.rudder = c.aileron * 0.5;
          c.throttle = e.airspeed < 5 ? 0.4 : 0;
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
          // **La altura es sobre el suelo, no sobre el mar.** La primera
          // versión pedía «pasar de cuatrocientos metros» y el aeropuerto está
          // a seiscientos veinticuatro: la condición era cierta desde antes de
          // despegar y la de después nunca llegaba. El avión se pasó siete
          // minutos subiendo en línea recta.
          const alto = e.heightAboveGround ?? 0;

          if (etapa === 'salida') {
            volarA(pista.heading, 4, 1);
            // Se sale hasta pasar la cabecera contraria con altura de
            // circuito, o a los cincuenta segundos, lo que llegue antes.
            if ((along > pista.length / 2 + 800 && alto > 250) || enEtapa() > 50) irA('vuelta1');
          } else if (etapa === 'vuelta1') {
            volarA((pista.heading + 180) % 360, 0, 0.85);
            if (Math.abs(error((pista.heading + 180) % 360, rumboDe(e))) < 15 || enEtapa() > 60) {
              irA('volviendo');
            }
          } else if (etapa === 'volviendo') {
            // Se vuelve por un lado, no por encima de la pista: así el segundo
            // viraje deja al avión alineado en vez de cruzado.
            const quiere = across > 0 ? 900 : -900;
            const correccion = Math.max(-20, Math.min(20, (quiere - across) / 60));
            volarA((pista.heading + 180 + correccion + 360) % 360, 0, 0.85);
            if (along < -pista.length / 2 - 5000 || enEtapa() > 120) irA('vuelta2');
          } else if (etapa === 'vuelta2') {
            volarA(pista.heading, -1, 0.6);
            if (Math.abs(error(pista.heading, rumboDe(e))) < 15 || enEtapa() > 60) irA('entrando');
          } else {
            // Entrando: se corrige el desvío lateral y se baja hacia la
            // cabecera con una senda de unos tres grados.
            const correccion = Math.max(-25, Math.min(25, -across / 50));
            const quiereAlto = Math.max(20, (Math.abs(along) - pista.length / 2) * 0.05);
            const subida = alto > quiereAlto ? -4 : 0;
            volarA((pista.heading + correccion + 360) % 360, subida, 0.35);
          }
          break;
        }

        case 'final': {
          const alto = e.heightAboveGround ?? 0;
          const correccion = Math.max(-20, Math.min(20, -across / 40));
          // La recogida: cerca del suelo se afloja la bajada, que es lo que
          // convierte un impacto en un aterrizaje.
          const subida = alto < 12 ? -0.8 : alto < 40 ? -2 : -3.5;
          volarA((pista.heading + correccion + 360) % 360, subida, alto < 30 ? 0.15 : 0.3);
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
      if (rastro.length < 200 && (rastro.length === 0 || performance.now() - rastro[rastro.length - 1].t > 4000)) {
        const e = o.estado();
        const { along, across } = enEjes(e.position.x, e.position.z);
        rastro.push({
          t: performance.now(),
          fase: o.fase(),
          etapa,
          alto: Math.round(e.heightAboveGround ?? 0),
          vel: Math.round(e.airspeed * 3.6),
          along: Math.round(along),
          across: Math.round(across),
        });
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
      rastro: rastro.map((r) => ({ ...r, t: undefined })),
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
  if (!resultado.fases.some((f) => f.fase === 'apagado')) {
    console.log('  por dónde anduvo (cada 4 s):');
    for (const r of resultado.rastro.slice(-32)) {
      console.log(
        `    ${String(r.fase).padEnd(12)} ${String(r.etapa).padEnd(10)} ` +
          `${String(r.alto).padStart(5)} m  ${String(r.vel).padStart(3)} km/h  eje ${String(r.along).padStart(6)} / ${String(r.across).padStart(5)}`,
      );
    }
  }
  console.log(
    `  subió a ${resultado.masAlto} m sobre el suelo · se quedó en la etapa «${resultado.etapa}»` +
      `${resultado.seQuedoSinTiempo ? ' · se acabó el tiempo' : ''}`,
  );
  await page.screenshot({ path: `${D}/vuelo-${escenario}-3-rodando.png` });
  await page.close();
}

await b.close();
await server.close();

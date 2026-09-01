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
    const hasta = performance.now() + 780000;
    const pista = o.pista();

    const rad = (g) => (g * Math.PI) / 180;
    const { pitchAngleOf, bankAngleOf } = await import('/src/ui/actitud.ts');
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
        c.aileron = mandoDeTierra(error(quiero, rumboDe(e)));
        c.rudder = c.aileron * 0.5;
        c.throttle = e.airspeed < 8 ? 0.5 : 0;
        c.brakes = e.airspeed > 11 ? 1 : 0;
      };

      /**
       * El mando de dirección en tierra, **amortiguado**.
       *
       * Proporcional a secas no vale desde que la rueda de morro tiene la
       * autoridad que le hacía falta para tomar curvas: el avión serpenteaba
       * por el eje de la pista con el rumbo oscilando más de ocho grados, y el
       * juego —que pide menos de ocho para dar por alineado— no lo daba nunca.
       * Se quedaba rodando por la pista para siempre.
       *
       * Restar la velocidad de guiñada es lo que frena el volantazo antes de
       * pasarse. Es lo mismo que hace una mano.
       */
      const mandoDeTierra = (giro) =>
        Math.max(-1, Math.min(1, giro / 20 - (e.yawRate * 180) / Math.PI / 45));

      /** Rodar hacia un punto concreto del mundo. */
      const rodarHacia = (x, z, vel = 8) => {
        const quiero = ((Math.atan2(x - e.position.x, -(z - e.position.z)) * 180) / Math.PI + 360) % 360;
        c.aileron = mandoDeTierra(error(quiero, rumboDe(e)));
        c.rudder = c.aileron * 0.5;
        c.throttle = e.airspeed < vel ? 0.5 : 0;
        c.brakes = e.airspeed > vel + 3 ? 1 : 0;
      };

      /** Mantener un rumbo con las alas, sin tocar el cabeceo. */
      const ladeoA = (rumbo) => {
        const giro = error(rumbo, rumboDe(e));
        const objetivo = Math.max(rad(-18), Math.min(rad(18), rad(giro * 1.1)));
        return Math.max(
          -0.5,
          Math.min(0.5, (objetivo - bankAngleOf(e.orientation)) * 2.0 - e.rollRate * 0.7),
        );
      };

      /** Mantener una actitud de morro, en grados. Amortiguada. */
      const subirA = (grados) =>
        Math.max(
          -0.45,
          Math.min(0.45, (rad(grados) - pitchAngleOf(e.orientation)) * 2.2 - e.pitchRate * 0.9),
        );

      /**
       * Volar a un rumbo, subiendo o bajando lo que se le pida.
       *
       * **Control de actitud, no mando a golpes.** La primera versión ponía el
       * elevador según la velocidad —cero por debajo de treinta y dos, un
       * tercio por encima— y como la velocidad oscilaba justo en ese umbral, el
       * mando castañeteaba: el avión entraba en fugoide, el ángulo de ataque
       * paseaba entre cuatro y once grados y el factor de carga entre 0,57 y
       * 1,29. Subía, pero a tirones y a tres metros por segundo de media.
       *
       * Así es como se pilota de verdad: se elige una **actitud** —cuánto morro
       * arriba— y se mantiene, amortiguando con la velocidad de cabeceo para
       * que no se pase. La velocidad vertical se pide moviendo esa actitud,
       * despacio, en un lazo de fuera.
       */
      const volarA = (rumbo, subida, gas) => {
        const cabeceo = pitchAngleOf(e.orientation);
        const alabeo = bankAngleOf(e.orientation);

        // Lazo de fuera: la actitud que hace falta para la subida pedida.
        const objetivoCabeceo = Math.max(
          rad(-6),
          Math.min(rad(11), rad(subida * 1.4) + (subida - e.verticalSpeed) * 0.02),
        );
        // Lazo de dentro: mando proporcional al error, amortiguado con la
        // velocidad de cabeceo. Sin la amortiguación esto vuelve a oscilar.
        c.elevator = Math.max(
          -0.45,
          Math.min(0.45, (objetivoCabeceo - cabeceo) * 2.2 - e.pitchRate * 0.9),
        );

        // Lo mismo con el alabeo: se elige una inclinación y se mantiene. Un
        // circuito se vuela a veinte grados, no a tumbo limpio.
        const giro = error(rumbo, rumboDe(e));
        const objetivoAlabeo = Math.max(rad(-22), Math.min(rad(22), rad(giro * 1.1)));
        c.aileron = Math.max(
          -0.6,
          Math.min(0.6, (objetivoAlabeo - alabeo) * 2.0 - e.rollRate * 0.7),
        );
        // Timón para coordinar el viraje, poquito.
        c.rudder = Math.max(-0.35, Math.min(0.35, alabeo * 0.5));

        // Y protección de velocidad: antes de subir hay que tener con qué.
        const V_SEGURA = 34;
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
          c.aileron = mandoDeTierra(error(quiero, rumboDe(e)));
          c.rudder = c.aileron * 0.5;
          c.throttle = e.airspeed < 5 ? 0.4 : 0;
          break;
        }

        case 'despegando': {
          c.throttle = 1;
          c.aileron = mandoDeTierra(error(pista.heading, rumboDe(e))) * 0.6;
          c.rudder = c.aileron * 0.6;
          // Rotar a treinta y dos metros por segundo y **mantener ocho grados
          // de morro arriba**. Es la misma ley que usa la subida inicial, y es
          // a propósito: con una ley distinta a cada lado de los doce metros,
          // el avión rebotaba en ese límite —doce, uno, treinta y dos, uno—
          // porque cada vez que cruzaba cambiaba de mando.
          c.elevator = e.airspeed > 32 ? subirA(8) : 0;
          break;
        }

        case 'en-vuelo': {
          const alto = e.heightAboveGround ?? 0;
          // **Las etapas avanzan por dónde está el avión, no por reloj.** Con
          // relojes, si una etapa no se cumplía la siguiente empezaba igual: el
          // avión acabó a siete kilómetros y medio del aeropuerto, alejándose,
          // en la etapa de «entrando». El reloj queda solo de red de
          // seguridad, y lo que hace es **abortar**, no avanzar.
          if (enEtapa() > 200) {
            irA('salida');
            break;
          }

          if (etapa === 'salida') {
            // Subida inicial con la misma ley que el despegue.
            c.throttle = 1;
            c.aileron = ladeoA(pista.heading);
            c.rudder = 0;
            c.elevator = subirA(alto < 60 ? 8 : 6);
            if (along > pista.length / 2 + 500 && alto > 220) irA('vuelta1');
          } else if (etapa === 'vuelta1') {
            // Primer viraje: a la recíproca, apartándose mil doscientos metros
            // para no volver por encima de la pista.
            volarA((pista.heading + 180) % 360, 0, 0.8);
            if (Math.abs(error((pista.heading + 180) % 360, rumboDe(e))) < 20) irA('volviendo');
          } else if (etapa === 'volviendo') {
            const quiere = 1200;
            const correccion = Math.max(-25, Math.min(25, (quiere - across) / 50));
            volarA((pista.heading + 180 + correccion + 360) % 360, 0, 0.8);
            if (along < -pista.length / 2 - 3000) irA('vuelta2');
          } else if (etapa === 'vuelta2') {
            // Segundo viraje: a rumbo de pista, cerrando el desvío lateral.
            const correccion = Math.max(-30, Math.min(30, -across / 60));
            volarA((pista.heading + correccion + 360) % 360, -1.5, 0.55);
            if (Math.abs(across) < 250 && Math.abs(error(pista.heading, rumboDe(e))) < 20) {
              irA('entrando');
            }
          } else {
            // Entrando: senda de unos tres grados hacia la cabecera. Y si se
            // pasa de largo, **frustrada**: se vuelve a empezar el circuito,
            // que es exactamente lo que se hace de verdad.
            if (along > -pista.length / 2 + 200) {
              irA('salida');
              break;
            }
            const faltan = -pista.length / 2 - along;
            const quiereAlto = Math.max(15, faltan * 0.052);
            const correccion = Math.max(-25, Math.min(25, -across / 40));
            volarA((pista.heading + correccion + 360) % 360, alto > quiereAlto ? -3.5 : -1, 0.3);
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
          c.aileron = mandoDeTierra(error(pista.heading, rumboDe(e))) * 0.6;
          c.rudder = c.aileron * 0.5;
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

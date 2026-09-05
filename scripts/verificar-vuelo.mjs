/**
 * El banco de pruebas de vuelo: un aterrizaje entero, comprobado a máquina.
 *
 * Existe por una frase: «he hecho 200 aterrizajes encontrando una y otra vez
 * fallos repetidos». Y por una constatación incómoda: **ni uno solo de los
 * fallos gordos de este juego se encontró volando**. La senda que era un palo
 * de hockey, la ruta que empezaba doscientos ochenta y seis metros por detrás
 * del avión, el aro que se daba por cruzado pasando ciento dieciocho metros
 * por encima, el veredicto de la toma que llegaba cincuenta y cuatro segundos
 * tarde, los dos PAPI con uno siempre en rojo — todos salieron de **medir**.
 *
 * Una persona tarda tres minutos en hacer un aterrizaje y solo puede mirar una
 * cosa a la vez. Esto hace el vuelo entero en un minuto y mira treinta.
 *
 * ## Cómo vuela
 *
 * **Colocando el avión, no pilotándolo.** Pilotar de verdad desde fuera es
 * frágil —un guion que tira de la palanca sale distinto cada vez— y además no
 * es lo que hay que comprobar: el modelo de vuelo ya tiene sus propias
 * pruebas. Lo que aquí se comprueba es **lo que el juego contesta** cuando el
 * avión está en un sitio: qué ruta traza, qué aro se enciende, qué tarjeta
 * enseña, qué veredicto da. Que es donde han estado todos los fallos.
 *
 * ## Qué hacer cuando esto falla
 *
 * Cada comprobación lleva escrito **qué fallo real la puso ahí**. Si una se
 * pone en rojo, no es un capricho del banco: es que ha vuelto algo que ya
 * estuvo mal una vez.
 *
 * Uso: `node scripts/verificar-vuelo.mjs [escenario] [tramo]`
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const ESCENARIO = process.argv[2] ?? 'tenerife-norte';
const TRAMO = process.argv[3] ?? 'guyrami';
const PUERTO = 5273;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();

const navegador = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'],
});
/*
 * Se prueba **con el dedo**, que es el aparato del aula. No es un detalle de
 * configuración: la mitad de las decisiones del HUD miran el puntero, y con
 * ratón se estaban comprobando otras. El botón rojo del freno, por ejemplo,
 * solo sale en los peldaños de arriba cuando se juega con el dedo.
 */
const page = await navegador.newPage({
  viewport: { width: 1000, height: 620 },
  hasTouch: true,
  isMobile: true,
});
const errores = [];
page.on('pageerror', (e) => errores.push(e.message.slice(0, 160)));

await page.addInitScript(() => {
  localStorage.setItem('oga-veve:teclas-vistas', '1');
});
await page.goto(
  `http://localhost:${PUERTO}/?escenario=${ESCENARIO}&leccion=aterrizaje&tramo=${TRAMO}`,
);

/*
 * Veinte segundos en el aire antes de tocar nada. No es una espera de
 * cortesía: la máquina de fases no da un vuelo por hecho hasta que se ha
 * subido a altura de circuito **y** se ha estado un rato arriba, y sin eso
 * nada de lo que viene después —la vuelta al puesto, el señalero— existe.
 */
await page.waitForTimeout(22000);

/** Coloca el avión respecto al umbral: `d` metros antes, `alto` sobre la pista. */
async function poner(d, alto, lateral = 0) {
  await page.evaluate(
    ({ d, alto, lateral }) => {
      const o = globalThis.__oga;
      const s = o.estado();
      const h = s.heading;
      const ux = Math.sin(h);
      const uz = -Math.cos(h);
      const u = globalThis.__umbral;
      o.colocar(
        u.x - ux * d - uz * lateral,
        u.y + alto,
        u.z - uz * d + ux * lateral,
        s.airspeed,
      );
    },
    { d, alto, lateral },
  );
  await page.waitForTimeout(260);
}

// El umbral en uso, que es de donde se mide todo. Sale del haz de la cabecera,
// que está plantado exactamente ahí.
await page.evaluate(() => {
  let raiz = globalThis.__oga.aeronave().grupo;
  while (raiz.parent) raiz = raiz.parent;
  const faro = raiz.getObjectByName('faro');
  globalThis.__umbral = {
    x: faro.position.x,
    y: faro.position.y - 210,
    z: faro.position.z,
  };
  globalThis.__raiz = raiz;
});

const resultados = [];
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

// ── La senda ──────────────────────────────────────────────────────────────

const senda = await page.evaluate(() => {
  const raiz = globalThis.__raiz;
  const pista = globalThis.__oga.pista();
  const suelo = globalThis.__oga.suelo(pista.x, pista.z);
  const aros = [];
  raiz.getObjectByName('aros').traverse((o) => {
    if (o.isMesh) aros.push({ y: o.position.y, d: o.userData.distancia ?? 0 });
  });
  return aros
    .sort((a, b) => b.d - a.d)
    .map((a) => ({ d: a.d, grados: (Math.atan2(a.y - suelo, a.d) * 180) / Math.PI }));
});
const pendientes = senda.map((a) => a.grados);
const maxDesvio = Math.max(...pendientes.map((g) => Math.abs(g - 3)));
comprobar(
  'la senda es una recta de tres grados',
  maxDesvio < 1.2,
  `desvío máximo ${maxDesvio.toFixed(2)}°`,
  'los aros dibujaban un palo de hockey: los últimos a 80 m sobre la pista',
);

const hilo = await page.evaluate(() => {
  const h = globalThis.__raiz.getObjectByName('hilo');
  if (!h) return { puntos: 0, hastaElUmbral: Infinity };
  const p = h.geometry.attributes.position;
  const u = globalThis.__umbral;
  let cerca = Infinity;
  for (let i = 0; i < p.count; i++) {
    cerca = Math.min(cerca, Math.hypot(p.getX(i) - u.x, p.getZ(i) - u.z));
  }
  return { puntos: p.count, hastaElUmbral: cerca };
});
comprobar(
  'la senda está dibujada y llega hasta el umbral',
  hilo.puntos > 40 && hilo.hastaElUmbral < 90,
  `${hilo.puntos} puntos, el último a ${hilo.hastaElUmbral.toFixed(0)} m del umbral`,
  'entre aro y aro no había nada que dijera si vas alto o bajo',
);

// ── Corta final ───────────────────────────────────────────────────────────

await poner(400, 24);
const enCorta = await page.evaluate(() => {
  const raiz = globalThis.__raiz;
  const faro = raiz.getObjectByName('faro');
  return { faro: faro.visible ? faro.material.opacity : 0 };
});
comprobar(
  'en corta final no hay nada tapando la pista',
  enCorta.faro < 0.05,
  `opacidad del haz ${enCorta.faro.toFixed(2)}`,
  'el haz de la cabecera pintaba la pista de ocre y borraba sus marcas',
);

// ── La carrera de aterrizaje ──────────────────────────────────────────────

await poner(-350, 1.4);
await page.evaluate(() => {
  const s = globalThis.__oga.estado();
  const h = s.heading;
  s.velocity?.set(Math.sin(h) * 28, 0, -Math.cos(h) * 28);
});
await page.waitForTimeout(2200);

const enPista = await page.evaluate(() => {
  const o = globalThis.__oga;
  const s = o.estado();
  const pista = o.pista();
  const h = (pista.heading * Math.PI) / 180;
  const ejes = (x, z) => {
    const dx = x - pista.x;
    const dz = z - pista.z;
    return {
      along: dx * Math.sin(h) - dz * Math.cos(h),
      across: dx * Math.cos(h) + dz * Math.sin(h),
    };
  };
  const yo = ejes(s.position.x, s.position.z);
  const ruta = o.ruta().map(([x, z]) => ejes(x, z));
  // Los puntos de la ruta que caen sobre el asfalto de la pista.
  const enAsfalto = ruta.filter(
    (p) => Math.abs(p.across) < pista.width && Math.abs(p.along) < pista.length / 2,
  );
  return {
    fase: o.fase(),
    delante: enAsfalto.filter((p) => (p.along - yo.along) * Math.sign(1) > 0).length,
    // Los últimos puntos son el giro a la calle de salida: ahí hay que
    // cruzar el borde, para eso es una salida. Lo que no puede es cruzarlo
    // antes, que es lo que hacía la diagonal.
    fueraDelEje: enAsfalto
      .slice(0, Math.max(0, enAsfalto.length - 6))
      .filter((p) => Math.abs(p.across) > pista.width / 2).length,
    /*
     * La tarjeta del freno se reconoce por su dibujo, no por su tecla: en los
     * peldaños de arriba la tecla va en otra tarjeta, y comprobar la tecla
     * hacía fallar la prueba en Taguató por un motivo que no era el fallo.
     */
    tarjeta: (document.querySelector('[data-hud="senal-dibujo"]')?.innerHTML ?? '')
      .includes('x="2.4"')
      ? 'freno'
      : '',
  };
});
comprobar(
  'la ruta de vuelta tiene pista por delante',
  enPista.delante > 3,
  `${enPista.delante} puntos por delante`,
  'la ruta nacía 286 m por detrás del avión y se iba por la calle paralela',
);
comprobar(
  'y va por el eje, no pegada al borde',
  enPista.fueraDelEje === 0,
  `${enPista.fueraDelEje} puntos fuera del medio ancho`,
  'iba en diagonal desde el avión hasta la boca de la salida',
);
comprobar(
  'y la tarjeta pide frenar con su tecla',
  enPista.tarjeta.length > 0,
  `tecla «${enPista.tarjeta}»`,
  'al tocar tierra no salía ninguna tarjeta durante seis segundos',
);

// ── El veredicto de la toma ───────────────────────────────────────────────

const veredicto = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const s = o.estado();
  const u = globalThis.__umbral;
  const h = s.heading;
  const ux = Math.sin(h);
  const uz = -Math.cos(h);
  // Otra toma, para cronometrar cuánto tarda en decir algo.
  s.position.x = u.x - ux * 30;
  s.position.z = u.z - uz * 30;
  s.position.y = u.y + 30;
  await new Promise((r) => setTimeout(r, 500));
  s.position.y = u.y + 1.3;
  s.position.x = u.x + ux * 200;
  s.position.z = u.z + uz * 200;
  const t0 = performance.now();
  const hint = document.querySelector('[data-hud="hint"]');
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if (hint?.textContent) return { segundos: (performance.now() - t0) / 1000 };
  }
  return { segundos: Infinity };
});
comprobar(
  'el veredicto de la toma llega enseguida',
  veredicto.segundos < 4,
  `${veredicto.segundos === Infinity ? 'nunca' : veredicto.segundos.toFixed(1) + ' s'}`,
  'esperaba a bajar de velocidad de rodaje: 54 s y 1129 m después de tocar',
);

// ── El rodaje de vuelta y el puesto ───────────────────────────────────────

const alFinal = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const ruta = o.ruta();
  if (ruta.length < 2) return { sinRuta: true };
  const s = o.estado();
  // Se recorre la ruta a saltos, como si se rodara por ella.
  let cintaRodando = null;
  for (let i = 0; i < ruta.length; i++) {
    const [x, z] = ruta[i];
    s.position.x = x;
    s.position.z = z;
    s.position.y = o.suelo(x, z) + 1.3;
    // La cinta se mide **rodando**, que es cuando existe: al llegar al puesto
    // la ruta se borra a propósito, porque ya no queda camino.
    if (i === Math.floor(ruta.length * 0.6)) {
      cintaRodando = o.cintaGuia()?.sobreElSuelo ?? null;
    }
    await new Promise((r) => setTimeout(r, 45));
  }
  /*
   * Y al llegar, **parado de verdad**. Colocar el avión no le quita la
   * velocidad: seguía a treinta metros por segundo encima del puesto, así que
   * la máquina de fases nunca daba el vuelo por terminado y esta comprobación
   * fallaba por estar mal montada, no por el juego.
   */
  const mandos = o.controles();
  mandos.throttle = 0;
  mandos.brakes = 1;
  // Parado de verdad, por el modelo. Ver `__oga.colocar`.
  const fin = ruta[ruta.length - 1];
  o.colocar(fin[0], o.suelo(fin[0], fin[1]) + 1.3, fin[1], 0);
  await new Promise((r) => setTimeout(r, 2000));
  const raiz = globalThis.__raiz;
  const coche = raiz.getObjectByName('sigueme');
  const senalero = raiz.getObjectByName('senalero');
  const dibujo = document.querySelector('[data-hud="senal-dibujo"]')?.innerHTML ?? '';
  return {
    fase: o.fase(),
    cinta: cintaRodando,
    cocheVisible: !!coche?.visible,
    senaleroVisible: !!senalero?.visible,
    senaleroDistancia: senalero
      ? Math.hypot(senalero.position.x - s.position.x, senalero.position.z - s.position.z)
      : Infinity,
    // La llave lleva un círculo con un hueco; el señalero, una figura con brazos.
    pideApagar: dibujo.includes('senal__hueco'),
    dibujo: dibujo.slice(0, 40),
    v: o.estado().airspeed.toFixed(1),
    restante: o.cintaGuia() ? 'hay ruta' : 'sin ruta',
  };
});

comprobar(
  'la cinta guía se ve sobre el suelo',
  alFinal.cinta !== null && alFinal.cinta > 0 && alFinal.cinta < 1.5,
  `${alFinal.cinta === null ? 'no hay cinta' : alFinal.cinta.toFixed(2) + ' m'}`,
  'sus cotas van horneadas y cualquier cambio del suelo la entierra',
);
comprobar(
  'el señalero está a la vista al llegar',
  alFinal.senaleroVisible && alFinal.senaleroDistancia < 60,
  `${alFinal.senaleroVisible ? alFinal.senaleroDistancia.toFixed(0) + ' m' : 'no se ve'}`,
  '«señor de los bastones, ¿qué señor?»: medía treinta píxeles',
);
comprobar(
  'y al parar, la pantalla dice apagar el motor',
  alFinal.pideApagar,
  alFinal.pideApagar ? 'la llave' : `fase «${alFinal.fase}», v=${alFinal.v}`,
  'la tarjeta del gesto del señalero se quedaba puesta y tapaba la llave',
);

// ── La ciudad ─────────────────────────────────────────────────────────────

const ciudad = await page.evaluate(() => {
  const o = globalThis.__oga;
  const vias = o.vias().filter((v) => v.nivel <= 2);
  if (!vias.length) return { sinCiudad: true };
  const casas = [];
  globalThis.__raiz.getObjectByName('ciudad')?.traverse((n) => {
    if (!n.isInstancedMesh) return;
    const a = n.instanceMatrix.array;
    for (let i = 0; i < n.count; i++) {
      // Del mundo al fichero: el norte del fichero es la Z negativa.
      casas.push([a[i * 16 + 12], -a[i * 16 + 14]]);
    }
  });
  // Distancia de cada casa al viario ancho, por fuerza bruta sobre una
  // muestra: mirar cuarenta mil casas contra dos mil tramos aquí sería eterno.
  const muestra = casas.filter((_, i) => i % 17 === 0);
  const anchos = [22, 18, 13];
  let encima = 0;
  for (const [cx, cy] of muestra) {
    for (const via of vias) {
      const semi = anchos[via.nivel] / 2;
      let cerca = false;
      for (let i = 0; i < via.puntos.length - 1 && !cerca; i++) {
        const [ax, ay] = via.puntos[i];
        const [bx, by] = via.puntos[i + 1];
        const dx = bx - ax;
        const dy = by - ay;
        const l2 = dx * dx + dy * dy;
        if (l2 < 1) continue;
        const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / l2));
        const d = Math.hypot(cx - (ax + dx * t), cy - (ay + dy * t));
        if (d < semi) cerca = true;
      }
      if (cerca) {
        encima++;
        break;
      }
    }
  }
  return { muestra: muestra.length, encima };
});
if (!ciudad.sinCiudad) {
  comprobar(
    'no hay casas plantadas sobre las autovías',
    ciudad.encima === 0,
    `${ciudad.encima} de ${ciudad.muestra} casas de la muestra`,
    'la ciudad se siembra por densidad y no sabía nada del viario',
  );
}

// ── Y lo que no puede pasar en una calle de rodaje ────────────────────────

const enCalle = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const s = o.estado();
  /*
   * Un punto de la ruta **que esté fuera de la pista**, que es de lo que va
   * esta comprobación. El primer intento cogía el punto de en medio y en
   * Tenerife ese cae todavía sobre el asfalto: la prueba fallaba por estar mal
   * planteada, no por el juego.
   */
  const pista = o.pista();
  const h = (pista.heading * Math.PI) / 180;
  const fueraDePista = ([x, z]) => {
    const dx = x - pista.x;
    const dz = z - pista.z;
    const along = dx * Math.sin(h) - dz * Math.cos(h);
    const across = dx * Math.cos(h) + dz * Math.sin(h);
    return Math.abs(across) > pista.width || Math.abs(along) > pista.length / 2;
  };
  const enCalle = o.ruta().filter(fueraDePista);
  const donde = enCalle[Math.floor(enCalle.length / 2)];
  if (donde) {
    o.colocar(donde[0], o.suelo(donde[0], donde[1]) + 1.3, donde[1], 0);
  }
  /*
   * **Se acelera de verdad, no se teletransporta a velocidad.** Poner el
   * avión a treinta metros por segundo de golpe lo deja en el aire un
   * instante, y en el aire el botón del freno se esconde con razón. Aquí lo
   * que se prueba es rodar rápido por una calle, así que se rueda.
   */
  const c = o.controles();
  c.brakes = 0;
  c.throttle = 1;
  await new Promise((r) => setTimeout(r, 7000));
  const freno = document.querySelector('[data-hud="brakes-touch"]');
  return {
    frenoEscondido: !!freno?.hidden,
    v: o.estado().airspeed,
    enPista: o.estado().onRunway,
  };
});
comprobar(
  'el freno no desaparece por acelerar fuera de la pista',
  !enCalle.frenoEscondido,
  enCalle.frenoEscondido
    ? `se escondió (onRunway=${enCalle.enPista}, v=${enCalle.v.toFixed(0)})`
    : 'sigue ahí',
  '«si acelero me quita la mano como para que pueda despegar sobre la R»',
);

// ── El informe ────────────────────────────────────────────────────────────

console.log(`\n  ${ESCENARIO} · ${TRAMO}\n`);
let fallos = 0;
for (const r of resultados) {
  if (!r.ok) fallos++;
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.nombre}  —  ${r.detalle}`);
  if (!r.ok) console.log(`      volvió: ${r.porque}`);
}
if (errores.length) {
  fallos++;
  console.log(`\n  ✗ errores en la consola: ${errores[0]}`);
}
console.log(
  `\n  ${resultados.length - fallos} de ${resultados.length} comprobaciones\n`,
);

await navegador.close();
await server.close();
process.exit(fallos ? 1 : 0);

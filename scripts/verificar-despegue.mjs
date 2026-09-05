/**
 * La otra mitad del vuelo: salir del puesto, rodar, esperar y despegar.
 *
 * Existe por una frase: «imagina ahora ir pasito a pasito trabajando sobre el
 * despegue, luego sobre dar un paseo por el aire, luego una frustrada,
 * luego… interminable».
 *
 * Tiene razón, y la salida de eso no es ir más rápido: es **comprobar las
 * fases a la vez**. El banco del aterrizaje encontró tres fallos en su primera
 * tirada, dos de ellos reportados jugando. Esta mitad del vuelo no se había
 * medido nunca.
 *
 * A diferencia del banco de aterrizaje, aquí **se pilota de verdad**: se
 * arranca el motor, se da gas y se deja que el avión ruede y despegue solo,
 * con la asistencia del peldaño haciendo su trabajo. Es lo que hay que
 * comprobar — que quien no sabe pilotar pueda salir del puesto y despegar
 * siguiendo lo que el juego le dice.
 *
 * ## Por qué solo en los peldaños de abajo
 *
 * El piloto de este banco no toca el timón: da gas, frena donde toca y deja
 * que la ayuda de rodaje haga su trabajo. Eso es exactamente lo que promete
 * Guyrami —a los cuatro años nadie hila dos kilómetros de calle de rodaje— y
 * exactamente lo que **no** promete Taguató, donde la curva es tuya. Correrlo
 * ahí saldría en rojo por la razón contraria a un fallo.
 *
 * Uso: `node scripts/verificar-despegue.mjs [escenario] [tramo]`
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const ESCENARIO = process.argv[2] ?? 'tenerife-norte';
const TRAMO = process.argv[3] ?? 'guyrami';
const PUERTO = 5281;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();

const navegador = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'],
});
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
  `http://localhost:${PUERTO}/?escenario=${ESCENARIO}&leccion=despegue&tramo=${TRAMO}`,
);
await page.waitForTimeout(16000);

const resultados = [];
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

const mirar = (fn) => page.evaluate(fn);
const dibujoDeLaSenal = () =>
  page.evaluate(
    () => document.querySelector('[data-hud="senal-dibujo"]')?.innerHTML ?? '',
  );

// ── En el puesto ──────────────────────────────────────────────────────────

const arranque = await mirar(() => {
  const o = globalThis.__oga;
  let raiz = o.aeronave().grupo;
  while (raiz.parent) raiz = raiz.parent;
  globalThis.__raiz = raiz;
  const s = o.estado();
  return {
    fase: o.fase(),
    motor: o.controles().engineOn,
    v: s.airspeed,
    ruta: o.ruta().length,
    tecla: document.querySelector('[data-hud="senal-tecla"]')?.textContent ?? '',
    // Los pavimentos del aeródromo, para saber si la ruta va por asfalto.
  };
});

comprobar(
  'se empieza en el puesto, parado y con el motor apagado',
  arranque.fase === 'estacionado' && !arranque.motor && arranque.v < 1,
  `fase «${arranque.fase}», motor ${arranque.motor ? 'en marcha' : 'parado'}`,
  'arrancar el motor es el primer paso del vuelo y no existía como paso',
);
comprobar(
  'y la pantalla pide arrancar, con su tecla dibujada',
  arranque.tecla.length > 0,
  `tecla «${arranque.tecla}»`,
  '«pulso la I y no se quita de la pantalla el icono»: un mando que no se anuncia no existe',
);
comprobar(
  'hay ruta desde el puesto hasta el punto de espera',
  arranque.ruta > 4,
  `${arranque.ruta} puntos`,
  'hay puestos de OSM que no conectan con ninguna calle y el avión salía sin raya',
);

// La ruta de salida, ¿va por el asfalto?
const rutaPorAsfalto = await mirar(() => {
  const o = globalThis.__oga;
  // `caminos()` da las polilíneas del asfalto en coordenadas del mundo.
  const caminos = o.caminos();
  const alCamino = (px, pz) => {
    let mejor = Infinity;
    for (const { puntos: linea } of caminos) {
      for (let i = 0; i < linea.length - 1; i++) {
        const [ax, az] = linea[i];
        const [bx, bz] = linea[i + 1];
        const dx = bx - ax;
        const dz = bz - az;
        const l2 = dx * dx + dz * dz;
        if (l2 < 1) continue;
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
        mejor = Math.min(mejor, Math.hypot(px - (ax + dx * t), pz - (az + dz * t)));
      }
    }
    return mejor;
  };
  // Media anchura de calle de rodaje y un margen: fuera de eso es el campo.
  const ruta = o.ruta();
  const fuera = ruta.filter(([x, z]) => alCamino(x, z) > 20).length;
  return { fuera, total: ruta.length };
});
comprobar(
  'y va por el asfalto, no por el campo',
  /*
   * Se tolera un punto: el propio puesto de estacionamiento cae en mitad de
   * una plataforma, y de una plataforma solo se conocen su contorno y sus
   * diagonales, así que su centro queda «lejos» de todas las líneas sin estar
   * fuera del asfalto.
   */
  rutaPorAsfalto.fuera <= 1,
  `${rutaPorAsfalto.fuera} de ${rutaPorAsfalto.total} puntos fuera`,
  '«salgo por E4 atravesando los jardines»',
);

// ── El sígame ─────────────────────────────────────────────────────────────

const sigueme = await mirar(() => {
  const coche = globalThis.__raiz.getObjectByName('sigueme');
  const s = globalThis.__oga.estado();
  return {
    visible: !!coche?.visible,
    d: coche
      ? Math.hypot(coche.position.x - s.position.x, coche.position.z - s.position.z)
      : Infinity,
  };
});
if (TRAMO === 'guyrami' || TRAMO === 'tuka') {
  comprobar(
    'el coche del sígame espera delante antes de arrancar',
    sigueme.visible && sigueme.d < 70,
    sigueme.visible ? `a ${sigueme.d.toFixed(0)} m` : 'no se ve',
    'salía cuando ya ibas rodando, y aparecer de la nada no enseña nada',
  );
}

// ── Se arranca y se rueda ─────────────────────────────────────────────────

const rodando = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const c = o.controles();
  c.engineOn = true;
  c.brakes = 0;
  /*
   * **Se rueda a velocidad de rodaje, que es lo que el propio juego pide.**
   *
   * El primer intento daba gas fijo y el avión cogía veinte metros por segundo
   * —setenta y dos por hora, el triple de lo que la banda de velocidad tolera—
   * y en la primera curva se plantaba en la pista. Un banco que rueda como
   * nadie rodaría mide otra cosa. Aquí se sostiene la velocidad de rodaje,
   * como haría quien hace caso al juego.
   */
  const RODAJE = 9;
  const desvios = [];
  const fases = [];
  /*
   * Doscientos segundos. La ruta de salida de Tenerife Norte son dos
   * kilómetros de calle a velocidad de rodaje: el primer intento le dio
   * treinta segundos y **el banco se declaraba roto porque no había llegado
   * todavía**. Un banco impaciente miente igual que uno mal escrito.
   */
  // Cinco minutos: la salida de Tenerife Norte son dos kilómetros de calle a
  // paso de rodaje, y eso son cuatro minutos largos. Rodar lleva lo que lleva.
  for (let i = 0; i < 1400; i++) {
    await new Promise((r) => setTimeout(r, 250));
    const s = o.estado();
    /*
     * El acelerador de quien mira el indicador: gas si voy lento, freno si no.
     * Y **frenando al ver la doble raya**, que es la lección de este trozo: el
     * juego pone la luz roja y la tarjeta de parar, y quien no frena se planta
     * en la pista sin permiso. El primer piloto de este banco no frenaba, se
     * pasaba el punto de espera de largo y se perdía por el campo — y el banco
     * decía que el juego estaba roto.
     */
    const ruta = o.ruta();
    const fin = ruta[ruta.length - 1];
    const alFinal = fin
      ? Math.hypot(fin[0] - s.position.x, fin[1] - s.position.z)
      : Infinity;
    const llegando = alFinal < 45;
    c.throttle = !llegando && s.airspeed < RODAJE ? 0.5 : 0;
    c.brakes = llegando || s.airspeed > RODAJE * 1.25 ? 1 : 0;
    desvios.push(s.airspeed);
    fases.push(o.fase());
    if (o.fase() === 'esperando' || o.fase() === 'autorizado') break;
  }
  const s = o.estado();
  const ruta = o.ruta();
  const fin = ruta[ruta.length - 1];
  return {
    fase: o.fase(),
    v: s.airspeed,
    maxV: Math.max(...desvios),
    // Cuánto queda de ruta: si el avión avanza pero no llega, esto lo dice.
    alFinal: fin ? Math.hypot(fin[0] - s.position.x, fin[1] - s.position.z) : -1,
    puntos: ruta.length,
    fases: [...new Set(fases)].join(' '),
  };
});
comprobar(
  'rodando se llega al punto de espera y el juego lo sabe',
  rodando.fase === 'esperando' || rodando.fase === 'autorizado',
  `fase «${rodando.fase}» a ${rodando.v.toFixed(1)} m/s, quedan ${rodando.alFinal.toFixed(0)} m · vistas: ${rodando.fases}`,
  'la máquina de fases se quedaba pegada y la lección no avanzaba',
);
comprobar(
  'y no se rueda como un cohete',
  rodando.maxV < 22,
  `máxima ${rodando.maxV.toFixed(1)} m/s rodando`,
  'rodar a noventa por hora no es rodar, y nadie avisaba',
);

// ── La torre ──────────────────────────────────────────────────────────────

const torre = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const c = o.controles();
  c.throttle = 0;
  c.brakes = 1;
  let verde = null;
  let vistas = '';
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 250));
    // La clase del verde vive en la caja, no en la bombilla.
    const caja = document.querySelector('[data-hud="torre"]');
    const clases = caja?.className ?? '';
    vistas = clases;
    if (clases.includes('torre--verde')) {
      verde = i * 0.25;
      break;
    }
  }
  return { verde, fase: o.fase(), luz: vistas };
});
comprobar(
  'parando en la doble raya, la torre acaba autorizando',
  torre.verde !== null && torre.verde < 12,
  torre.verde === null
    ? `nunca dio verde (fase «${torre.fase}», lámpara «${torre.luz}»)`
    : `verde a los ${torre.verde.toFixed(1)} s`,
  'la torre miraba si habías llegado, no si estabas parado: se cruzaba a toda velocidad',
);

// ── La carrera de despegue ────────────────────────────────────────────────

const despegue = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const c = o.controles();
  const pista = o.pista();
  /*
   * **Primero se entra en pista, y eso se hace rodando.**
   *
   * Con la luz verde, el avión sigue en la doble raya: hay que meterlo en el
   * asfalto y alinearlo antes de dar gas. El primer intento daba gas a fondo
   * desde el punto de espera y el avión se comía la curva de entrada; el banco
   * decía «no despega» y lo que pasaba es que estaba en la hierba.
   */
  c.brakes = 0;
  for (let i = 0; i < 200; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const s = o.estado();
    c.throttle = s.airspeed < 8 ? 0.5 : 0;
    if (s.onRunway && o.fase() === 'despegando') break;
    if (s.onRunway && Math.abs(s.airspeed) < 12 && o.fase() === 'alineando') {
      // Ya en el eje: se acabó el rodaje.
      if (i > 12) break;
    }
  }
  c.throttle = 1;
  let frenoSeFue = null;
  let enElAire = null;
  let usado = 0;
  const inicio = o.estado().position.clone
    ? { x: o.estado().position.x, z: o.estado().position.z }
    : null;
  for (let i = 0; i < 200; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const s = o.estado();
    // Un empujón de palanca cuando ya corre, que es lo que pide el tutor.
    if (s.airspeed > 27) c.elevator = 0.5;
    const boton = document.querySelector('[data-hud="brakes-touch"]');
    if (frenoSeFue === null && boton?.hidden) frenoSeFue = s.airspeed;
    if (inicio) {
      usado = Math.hypot(s.position.x - inicio.x, s.position.z - inicio.z);
    }
    if (!s.onGround && s.heightAboveGround > 15) {
      enElAire = { v: s.airspeed, usado };
      break;
    }
  }
  return {
    enElAire,
    frenoSeFue,
    largoDePista: pista.length,
    fase: o.fase(),
  };
});

comprobar(
  'a todo gas el avión despega',
  despegue.enElAire !== null,
  despegue.enElAire
    ? `a ${despegue.enElAire.v.toFixed(1)} m/s tras ${despegue.enElAire.usado.toFixed(0)} m`
    : 'no llegó a despegar',
  'con el empuje mal el avión tardaba veinticinco segundos en rotar',
);
if (despegue.enElAire) {
  comprobar(
    'y le sobra pista de largo',
    despegue.enElAire.usado < despegue.largoDePista * 0.6,
    `${despegue.enElAire.usado.toFixed(0)} m de ${despegue.largoDePista.toFixed(0)}`,
    'una carrera que se come la pista entera no es una carrera, es un susto',
  );
  comprobar(
    'el freno se despide al pasar el punto de no retorno',
    despegue.frenoSeFue !== null && despegue.frenoSeFue > 15,
    despegue.frenoSeFue === null
      ? 'no se fue'
      : `se fue a ${despegue.frenoSeFue.toFixed(1)} m/s`,
    'se iba también rodando por una calle, donde no hay V1 que valga',
  );
}

// ── En el aire ────────────────────────────────────────────────────────────

const enVuelo = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const c = o.controles();
  c.elevator = 0;
  await new Promise((r) => setTimeout(r, 4000));
  const s = o.estado();
  return {
    fase: o.fase(),
    subiendo: s.verticalSpeed,
    alto: s.heightAboveGround,
    ruta: o.ruta().length,
  };
});
comprobar(
  'en el aire sigue subiendo con el motor a tope',
  enVuelo.subiendo > 0.5,
  `${enVuelo.subiendo.toFixed(1)} m/s a ${enVuelo.alto.toFixed(0)} m`,
  'soltando los mandos el avión se quedaba nivelado con el gas a tope',
);
comprobar(
  'y la raya de rodaje desaparece, que volando no hay nada que rodar',
  enVuelo.ruta === 0,
  `${enVuelo.ruta} puntos de ruta`,
  'la raya se quedaba pintada en el suelo mientras se volaba',
);

// ── El informe ────────────────────────────────────────────────────────────

console.log(`\n  despegue · ${ESCENARIO} · ${TRAMO}\n`);
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

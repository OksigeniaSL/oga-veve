/**
 * ¿Es el suelo del aeródromo lo bastante liso para rodar por él?
 *
 * Esto sustituye a una comprobación que medía mal. La anterior ponía el avión
 * a rodar y contaba cuántos fotogramas pasaba en el aire, y ese número depende
 * del puesto en el que arranque, de por dónde acabe pasando y de cuánto ruede:
 * dos corridas del mismo código dieron «0 de 900» y «151 de 900» porque en la
 * primera el avión recorrió treinta y ocho metros. Con eso llegué a decir que
 * un aeropuerto estaba arreglado cuando no lo estaba.
 *
 * Así que no se mide el vuelo: se mide **el suelo**, que es la causa. Se
 * recorre el eje de la pista y todas las calles de rodaje muestreando la cota
 * cada metro, y se cuenta cuántas veces el terreno **cae** más de lo que unas
 * ruedas pueden seguir.
 *
 * El umbral sale de la física del juego, no de la intuición: el avión se
 * despega cuando el suelo se aparta más de un metro por debajo (ver
 * `PEGADO_AL_SUELO` en `arcade.ts`). Rodando a treinta por hora se avanzan
 * unos ocho metros por segundo, así que una caída de más de doce centímetros
 * por metro basta para dejar las ruedas en el aire.
 *
 * Es determinista, es rápido —no hay física de por medio— y mide justo lo que
 * hay que arreglar.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { baseDe } from './servidor.mjs';

/** Caída por metro, en metros, que ya despega al avión rodando. */
const CAIDA_QUE_DESPEGA = 0.12;

/**
 * Lo más que se espera a que un escenario arranque, ms.
 *
 * **Se espera a que esté, no a un reloj.** Esto esperaba noventa y cinco
 * segundos fijos por escenario y luego medía, y el juego está listo para
 * medir en dos a cinco: abre la ventana de pruebas al final de su
 * constructor, con el terreno ya aplanado bajo el aeródromo. Así que se
 * pregunta cada segundo si ya está. Y con tope, que una espera sin salida
 * deja un navegador vivo para nada: pasado este, el escenario se da por no
 * arrancado, se dice hasta dónde llegó y se sigue con el siguiente.
 */
const TOPE_DEL_ARRANQUE = 3 * 60_000;

/**
 * Espera a que el escenario esté listo para medirle el suelo, o lanza un error
 * que dice cuál, cuánto se esperó y la última etapa del arranque a la que
 * llegó —las migas de `main.ts`—.
 *
 * Preguntando con `evaluate` y no con `waitForFunction`: si la página se
 * recarga sola mientras arranca —lo hace el vigilante de `index.html` cuando
 * un módulo no baja—, `waitForFunction` muere con el contexto y esto sigue
 * preguntando.
 */
async function esperarAlEscenario(page, esc) {
  const desde = Date.now();
  while (Date.now() - desde < TOPE_DEL_ARRANQUE) {
    const listo = await page
      .evaluate(
        () =>
          typeof globalThis.__oga?.caminos === 'function' &&
          typeof globalThis.__oga?.suelo === 'function',
      )
      .catch(() => false);
    if (listo) return (Date.now() - desde) / 1000;
    await page.waitForTimeout(1000);
  }
  const miga = await page
    .evaluate(() => globalThis.__arranque?.at(-1) ?? null)
    .catch(() => null);
  throw new Error(
    `${esc} no arrancó en ${TOPE_DEL_ARRANQUE / 1000} s: el juego no llegó a ` +
      `abrir la ventana de pruebas (__oga.caminos); lo último del arranque, ` +
      `${miga ? `«${miga}»` : 'nada'}`,
  );
}

const PUERTO = Number(process.env.OGA_PUERTO ?? 5278);
const server = await createServer({ root: process.cwd(), server: { port: PUERTO, hmr: false } });
await server.listen();
const BASE = baseDe(server, PUERTO);

/*
 * **Y se miran todos, que es lo que no se hacía.**
 *
 * Miraba dos aeródromos —los dos que se estaban arreglando cuando se escribió—
 * y los otros quince nunca pasaron por aquí. En La Palma el avión se pasaba el
 * **75 % de la frenada en el aire**, frenaba a 0,08 g en vez de a 0,32 y el
 * banco de vuelo entero lo contaba como «este avión frena mal». No frenaba
 * mal: no tocaba el suelo. Un instrumento que solo mira donde ya se sabe que
 * hay un problema no encuentra ninguno nuevo.
 *
 * **Y «todos» son los del juego, no una lista copiada a mano.** La de aquí
 * llevaba un «ciudad-del-este» que no es ningún escenario —el aeropuerto de
 * Ciudad del Este es Guaraní, que ya estaba—, y con un nombre que no conoce
 * el juego abre el hangar y espera a que alguien elija: el banco reventaba a
 * los noventa y cinco segundos con «Cannot read properties of undefined
 * (reading 'caminos')», y se tomó por un escenario pesado que no llegaba a
 * tiempo. Así que la lista sale de `SCENARIOS`, y un nombre pedido que no
 * esté ahí se dice sin abrir el navegador.
 */
const { SCENARIOS } = await server.ssrLoadModule('/src/world/scenarios.ts');
const DEL_JUEGO = SCENARIOS.map((e) => e.id);
const ESCENARIOS = process.argv.slice(2);
if (!ESCENARIOS.length) ESCENARIOS.push(...DEL_JUEGO);
const desconocidos = ESCENARIOS.filter((e) => !DEL_JUEGO.includes(e));
for (const esc of desconocidos)
  console.log(`\n=== ${esc} ===\n  SIN MEDIR: no es un escenario del juego (los hay: ${DEL_JUEGO.join(', ')})`);

const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'],
});

/** Recorre la pista, las calles y las plataformas metro a metro y cuenta las caídas. */
function medirElSuelo(page) {
  return page.evaluate((umbral) => {
    const o = globalThis.__oga;
    const caminos = o.caminos();
    const salida = {};
    for (const { que, puntos } of caminos) {
      const s = (salida[que] ??= { metros: 0, saltos: 0, peor: 0 });
      for (let i = 0; i < puntos.length - 1; i++) {
        const [ax, az] = puntos[i];
        const [bx, bz] = puntos[i + 1];
        const largo = Math.hypot(bx - ax, bz - az);
        if (largo < 1) continue;
        let anterior = o.suelo(ax, az);
        for (let d = 1; d <= largo; d++) {
          const t = d / largo;
          const y = o.suelo(ax + (bx - ax) * t, az + (bz - az) * t);
          const caida = anterior - y;
          if (caida > umbral) s.saltos++;
          if (caida > s.peor) s.peor = caida;
          anterior = y;
          s.metros++;
        }
      }
    }
    return salida;
  }, CAIDA_QUE_DESPEGA);
}

let peorDeTodos = { esc: null, porKm: 0 };
const sinArrancar = [...desconocidos];
try {
  for (const esc of ESCENARIOS.filter((e) => DEL_JUEGO.includes(e))) {
    const page = await b.newPage({ viewport: { width: 900, height: 600 }, locale: 'es-PY' });
    page.on('pageerror', (e) => console.log('ERROR:', e.message));
    await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
    /*
     * **El mundo dibujado, dicho y no supuesto** (`teselas=0`). Con la
     * fotografía 3D el suelo se reescribe con ella cuando se posa, a su
     * ritmo, y ese «listo» no tiene fecha; y Google no la sirve a cuentas del
     * Espacio Económico Europeo, así que el suelo que se rueda es el
     * dibujado. Ver `claveDeTeselas` en `game.ts`.
     */
    await page.goto(`${BASE}/?escenario=${esc}&hora=16&teselas=0`);
    let r;
    let segundos;
    try {
      segundos = await esperarAlEscenario(page, esc);
      r = await medirElSuelo(page);
    } catch (e) {
      console.log(`\n=== ${esc} ===\n  SIN MEDIR: ${e.message}`);
      sinArrancar.push(esc);
      continue;
    } finally {
      await page.close();
    }

    console.log(`\n=== ${esc} === (listo a los ${segundos.toFixed(0)} s)`);
    for (const [que, s] of Object.entries(r)) {
      const porKm = s.metros ? (s.saltos / s.metros) * 1000 : 0;
      if (que === 'pista' && porKm > peorDeTodos.porKm)
        peorDeTodos = { esc, porKm, peor: s.peor };
      console.log(
        `  ${que.padEnd(9)} ${String(s.metros).padStart(6)} m recorridos · ` +
          `${String(s.saltos).padStart(4)} caídas de más de ${CAIDA_QUE_DESPEGA} m ` +
          `(${porKm.toFixed(0)} por km) · la peor ${s.peor.toFixed(2)} m`,
      );
    }
  }

  if (peorDeTodos.esc)
    console.log(
      `\nla pista más basta de todas: ${peorDeTodos.esc}, ` +
        `${peorDeTodos.porKm.toFixed(0)} caídas por km, la peor ${peorDeTodos.peor.toFixed(2)} m`,
    );
  // Un escenario sin medir no es un escenario sin caídas: se dice y se sale mal.
  if (sinArrancar.length) {
    console.log(`\nsin medir: ${sinArrancar.join(', ')}`);
    process.exitCode = 1;
  }
} finally {
  await b.close();
  await server.close();
}

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

const PUERTO = 5278;
const server = await createServer({ root: process.cwd(), server: { port: PUERTO, hmr: false } });
await server.listen();
const BASE = baseDe(server, PUERTO);
const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'],
});

/*
 * **Y se miran todos, que es lo que no se hacía.**
 *
 * Miraba dos aeródromos —los dos que se estaban arreglando cuando se escribió—
 * y los otros quince nunca pasaron por aquí. En La Palma el avión se pasaba el
 * **75 % de la frenada en el aire**, frenaba a 0,08 g en vez de a 0,32 y el
 * banco de vuelo entero lo contaba como «este avión frena mal». No frenaba
 * mal: no tocaba el suelo. Un instrumento que solo mira donde ya se sabe que
 * hay un problema no encuentra ninguno nuevo.
 */
const ESCENARIOS = process.argv.slice(2);
if (!ESCENARIOS.length)
  ESCENARIOS.push(
    'valle-cordillera', 'chaco', 'pettirossi', 'guarani', 'yvytu-rape',
    'encarnacion', 'ciudad-del-este', 'estigarribia', 'pedro-juan',
    'tenerife-norte', 'tenerife-sur', 'la-palma', 'gran-canaria',
    'el-hierro', 'la-gomera', 'lanzarote', 'fuerteventura', 'cuatro-vientos',
  );

let peorDeTodos = { esc: null, porKm: 0 };
for (const esc of ESCENARIOS) {
  const page = await b.newPage({ viewport: { width: 900, height: 600 }, locale: 'es-PY' });
  page.on('pageerror', (e) => console.log('ERROR:', e.message));
  await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
  await page.goto(`${BASE}/?escenario=${esc}&hora=16`);
  await page.waitForTimeout(95000);

  const r = await page.evaluate((umbral) => {
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

  console.log(`\n=== ${esc} ===`);
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
  await page.close();
}

if (peorDeTodos.esc)
  console.log(
    `\nla pista más basta de todas: ${peorDeTodos.esc}, ` +
      `${peorDeTodos.porKm.toFixed(0)} caídas por km, la peor ${peorDeTodos.peor.toFixed(2)} m`,
  );

await b.close();
await server.close();

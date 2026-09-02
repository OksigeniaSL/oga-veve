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

/** Caída por metro, en metros, que ya despega al avión rodando. */
const CAIDA_QUE_DESPEGA = 0.12;

const server = await createServer({ root: process.cwd(), server: { port: 5278 } });
await server.listen();
const b = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-unsafe-swiftshader'],
});

for (const esc of ['tenerife-norte', 'pettirossi']) {
  const page = await b.newPage({ viewport: { width: 900, height: 600 }, locale: 'es-PY' });
  page.on('pageerror', (e) => console.log('ERROR:', e.message));
  await page.addInitScript(() => localStorage.setItem('oga-veve:teclas-vistas', '1'));
  await page.goto(`http://localhost:5278/?escenario=${esc}`);
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
    console.log(
      `  ${que.padEnd(9)} ${String(s.metros).padStart(6)} m recorridos · ` +
        `${String(s.saltos).padStart(4)} caídas de más de ${CAIDA_QUE_DESPEGA} m ` +
        `(${porKm.toFixed(0)} por km) · la peor ${s.peor.toFixed(2)} m`,
    );
  }
  await page.close();
}

await b.close();
await server.close();

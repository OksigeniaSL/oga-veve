/**
 * Los flaps, en el juego de verdad: que existan, que se muevan, que tarden y
 * que vuelvan **exactamente** a su sitio.
 *
 * Se pidió con una advertencia delante: «no sé si quiero que lo intentes y
 * empecemos a romper el diseño del avión ahora que está tan bonito». Así que
 * lo primero que se mira no es que bajen, sino que al subir el avión vuelva a
 * ser el que era, matriz por matriz. Lo que comprueba, por avión:
 *
 * 1. Que **los tenga quien los tiene**: los cinco que los llevan, con sus
 *    piezas en el modelo; el biplano fumigador, ninguna.
 * 2. Que **la palanca vaya de un golpe y los flaps tarden**: entre pedirlos y
 *    tenerlos hay un rato, y ese rato es medio mando. Ver `flight/flaps.ts`.
 * 3. Que **se vean bajar**: el borde de salida, más bajo con ellos fuera.
 * 4. Que **vuelvan a su sitio exacto**, con las tapas y el hueco apagados:
 *    recogidos, el avión es el de antes de que se pudieran mover.
 *
 * Uso: `node scripts/verificar-flaps.mjs`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = 5311;
const CON_FLAPS = ["jaz-20", "jaz-40", "jaz-60", "jaz-90", "jaz-120"];
const SIN_FLAPS = ["jaz-25"];

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

for (const id of [...CON_FLAPS, ...SIN_FLAPS]) {
  const losLleva = CON_FLAPS.includes(id);
  const page = await navegador.newPage({
    viewport: { width: 1000, height: 640 },
  });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.addInitScript(() => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
  });
  await page.goto(`${BASE}/?escenario=gran-canaria&hora=12&tramo=taguato&avion=${id}`);
  await page
    .waitForFunction(
      () => globalThis.__oga?.estado?.() && globalThis.__oga?.aeronave?.().deVerdad,
      null,
      { timeout: 60000 },
    )
    .catch(() => {});

  const visto = await page.evaluate(async () => {
    const o = globalThis.__oga;
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    // El borde de salida de los flaps: lo más bajo de su piel, en el avión.
    const bajo = () => {
      const cajas = o.enElAvion("^flap-[^-]+-(derecha|izquierda)-piel$");
      return cajas.length ? Math.min(...cajas.map((c) => c.y0)) : null;
    };
    const recogidos = o.piezasDeFlaps();
    const bajoRecogidos = bajo();
    o.acelerar?.(4);

    // Se pide la primera muesca, con el mando de la cabina, y se mira el
    // camino: la palanca, de un golpe; los flaps, detrás.
    o.tocarMando("flaps");
    const palanca = o.palancaDeFlaps();
    await espera(50);
    const nadaMasPedir = o.controles().flaps;
    const camino = [];
    for (let i = 0; i < 200 && o.controles().flaps < palanca; i++) {
      camino.push(o.controles().flaps);
      await espera(50);
    }
    const enLaPrimera = o.controles().flaps;

    // Y abajo del todo.
    o.pedirFlaps(1);
    for (let i = 0; i < 400 && o.controles().flaps < 1; i++) await espera(50);
    const abajo = o.controles().flaps;
    const fuera = o.piezasDeFlaps();
    const bajoFuera = bajo();

    // Y de vuelta arriba.
    o.pedirFlaps(0);
    for (let i = 0; i < 400 && o.controles().flaps > 0; i++) await espera(50);
    await espera(200);
    const vuelta = o.piezasDeFlaps();
    return {
      piezas: o.flaps(),
      palanca,
      nadaMasPedir,
      pasos: camino.filter((v) => v > 0 && v < palanca).length,
      enLaPrimera,
      abajo,
      bajoRecogidos,
      bajoFuera,
      recogidos,
      fuera,
      vuelta,
      alFinal: o.controles().flaps,
    };
  });

  const etiqueta = (que) => `${id}: ${que}`;
  if (losLleva) {
    comprobar(
      etiqueta("los trae sueltos en el modelo"),
      visto.piezas >= 2 && visto.piezas % 2 === 0,
      `${visto.piezas} flaps`,
      "sin piezas que mover, la palanca no cambia nada en el ala",
    );
    comprobar(
      etiqueta("la palanca va de un golpe y los flaps tardan"),
      Math.abs(visto.palanca - 1 / 3) < 1e-9 &&
        visto.nadaMasPedir < visto.palanca &&
        visto.pasos > 3 &&
        Math.abs(visto.enLaPrimera - 1 / 3) < 1e-9,
      `palanca ${visto.palanca.toFixed(3)} · flaps ${visto.nadaMasPedir.toFixed(3)} al pedirlos · ${visto.pasos} muestras a medio camino`,
      "unos flaps instantáneos no enseñan a pedirlos antes de necesitarlos",
    );
    comprobar(
      etiqueta("abajo del todo, se ven bajar"),
      visto.abajo === 1 &&
        visto.bajoRecogidos !== null &&
        visto.bajoFuera < visto.bajoRecogidos - 0.05 &&
        visto.fuera.cierresVisibles > 0,
      `el borde de salida baja ${((visto.bajoRecogidos - visto.bajoFuera) * 100).toFixed(0)} cm`,
      "un mando que no cambia nada en la pantalla no parece un mando",
    );
    const iguales =
      visto.vuelta.matrices.length === visto.recogidos.matrices.length &&
      visto.vuelta.matrices.every((m, i) =>
        m.every((v, k) => Object.is(v, visto.recogidos.matrices[i][k])),
      );
    comprobar(
      etiqueta("recogidos, vuelven exactamente a su sitio"),
      visto.alFinal === 0 &&
        iguales &&
        visto.recogidos.cierresVisibles === 0 &&
        visto.vuelta.cierresVisibles === 0,
      iguales
        ? `las ${visto.vuelta.matrices.length} matrices, bit a bit; ${visto.vuelta.cierresVisibles} tapas a la vista`
        : "alguna matriz no es la de antes",
      "recogido, el avión tiene que ser el que era: ni una raya nueva",
    );
  } else {
    comprobar(
      etiqueta("no los tiene, y el modelo no finge tenerlos"),
      visto.piezas === 0,
      `${visto.piezas} flaps en el modelo`,
      "un biplano fumigador de esta clase vuela con alerones y nada más",
    );
  }
  comprobar(etiqueta("sin errores"), !errores.length, errores[0] ?? "limpio", "");
  await page.close();
}

console.log("");
for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
  if (!r.ok && r.porque) console.log(`      ${r.porque}`);
}
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones\n`);

await navegador.close();
await server.close();
process.exit(bien === resultados.length ? 0 : 1);

/**
 * Lo que cuesta **el cuadro abierto en el teléfono**, contra el recogido.
 *
 * En el teléfono apaisado el cuadro nace recogido, y abierto ocupa medio alto
 * de pantalla. Medido a mano con la CPU a ×4, abierto pedía de 19 a 29 ms por
 * fotograma y recogido de 14 a 18: cinco o diez milisegundos que se iban en un
 * dibujo que, en crucero, cambia en cuatro agujas. Esto lo mide igual cada vez
 * para que un arreglo se pueda defender con un número.
 *
 * - Teléfono de 915×412 con el dedo, la GPU de verdad y la CPU a ×4, que es la
 *   de una tablet de gama media: ver `verificar-rendimiento.mjs`.
 * - Sin techo de sesenta —sin sincronía vertical—, que si no se mide el techo.
 * - En el aire y virando, para que las agujas, la rosa y el horizonte se
 *   muevan: un cuadro quieto no cuesta nada y no dice nada.
 * - **Alternando** recogido y abierto varias veces, porque la máquina la
 *   comparten otras sesiones y una tanda suelta mide la carga de ese rato.
 *
 * Además del tiempo de cuadro saca, del propio Chrome, cuánto se va en
 * guion, estilo y maquetación: eso dice **por dónde** se va el tiempo.
 *
 * ## Y los casos que hay desde las losas
 *
 * Desde que el teléfono enseña las losas, «abierto» ya no es el cuadro
 * entero: son cuatro losas. El cuadro entero sale **en grande**, al tocar una
 * losa —una sola pantalla a todo lo ancho—, y desde la cabina lo que se pinta
 * son las pantallas del avión en 3D. `OGA_CASOS` dice cuáles se alternan, por
 * defecto los cuatro: `recogido,abierto,grande-actitud,cabina`. Y
 * `grande-rumbo` y `grande-motor` ponen grande la otra pantalla.
 *
 * Uso: `node scripts/medir-cuadro-telefono.mjs [avión…]`
 *   `OGA_TRAMO=guyrami` mide en otro peldaño (por defecto, el de arriba).
 *   `OGA_VUELTAS=3` cuántas veces se alterna.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = 5377;
const AVIONES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["jaz-20", "jaz-60", "jaz-90"];
const TRAMO = process.env.OGA_TRAMO ?? "taguato-ruvicha";
const VUELTAS = Number(process.env.OGA_VUELTAS ?? 3);
const CASOS = (process.env.OGA_CASOS ?? "recogido,abierto,grande-actitud,cabina")
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);
const MIDE = 5000;
const [ANCHO, ALTO] = (process.env.OGA_VISTA ?? "915x412").split("x").map(Number);
/**
 * Y las fotos del cuadro abierto, si se piden: `OGA_FOTOS=carpeta`. Con la
 * densidad de un teléfono de verdad —`OGA_DENSIDAD`, 2,6 por defecto—, que a
 * uno el cuadro sale borroso y no se juzga nada. Con `OGA_VUELTAS=0` solo saca
 * las fotos.
 */
const FOTOS = process.env.OGA_FOTOS ?? null;
const DENSIDAD = Number(process.env.OGA_DENSIDAD ?? (FOTOS ? 2.625 : 1));
if (FOTOS) (await import("node:fs")).mkdirSync(FOTOS, { recursive: true });

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "warn",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: [
    "--headless=new",
    "--enable-gpu",
    "--ignore-gpu-blocklist",
    "--use-angle=gl",
    "--disable-gpu-vsync",
    "--disable-frame-rate-limit",
  ],
});

/**
 * **Y por dónde se va, si se pide** (`OGA_TRAZA=1`): tres segundos de traza
 * del hilo principal.
 *
 * Cuenta **tiempo de CPU del hilo** —el `tdur` de la traza— y no de reloj: con
 * la máquina cargada por otras sesiones el reloj mide la cola del planificador
 * tanto como el juego, y el tiempo de CPU del hilo casi no se entera. Así se
 * puede comparar un antes y un después hechos en dos momentos distintos.
 * Con `OGA_TRAZA=40` lista además las cuarenta clases de trabajo que más
 * cuestan; esas sumas se solapan —un «Paint» va dentro de su ciclo—, así que
 * se leen como tamaños relativos.
 */
async function trazar(cdp, caso) {
  const eventos = [];
  const recoger = (d) => eventos.push(...d.value);
  cdp.on("Tracing.dataCollected", recoger);
  const acabado = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
  await cdp.send("Tracing.start", {
    categories:
      "devtools.timeline,disabled-by-default-devtools.timeline,blink,cc,gpu,viz",
    transferMode: "ReportEvents",
  });
  await new Promise((r) => setTimeout(r, 3000));
  await cdp.send("Tracing.end");
  await acabado;
  cdp.off("Tracing.dataCollected", recoger);
  const principal = eventos.find(
    (e) => e.name === "thread_name" && e.args?.name === "CrRendererMain",
  );
  const suma = new Map();
  let cuadros = 0;
  for (const e of eventos) {
    if (e.ph !== "X" || !e.dur) continue;
    if (principal && (e.tid !== principal.tid || e.pid !== principal.pid)) continue;
    if (e.name === "FireAnimationFrame") cuadros++;
    const ms = (e.tdur ?? e.dur) / 1000;
    suma.set(e.name, (suma.get(e.name) ?? 0) + ms);
  }
  const porCuadro = (n) => (suma.get(n) ?? 0) / Math.max(1, cuadros);
  const cuanto = Number(process.env.OGA_TRAZA);
  if (cuanto > 1) {
    const top = [...suma.entries()].sort((a, b) => b[1] - a[1]).slice(0, cuanto);
    console.log(`    traza ${caso} (${cuadros} cuadros):`);
    for (const [n, ms] of top)
      console.log(`      ${n.padEnd(34)} ${(ms / Math.max(1, cuadros)).toFixed(2)} ms/cuadro`);
  }
  return {
    cpu: porCuadro("RunTask"),
    js: porCuadro("FunctionCall"),
    pintar: porCuadro("Paint"),
    capas: porCuadro("Layerize"),
    estiloCpu: porCuadro("UpdateLayoutTree"),
    maquetaCpu: porCuadro("Layout"),
  };
}

const filas = [];
try {
  for (const avion of AVIONES) {
    const page = await navegador.newPage({
      viewport: { width: ANCHO, height: ALTO },
      deviceScaleFactor: DENSIDAD,
      hasTouch: true,
      isMobile: true,
    });
    page.on("pageerror", (e) => console.log(`  ${avion} ERROR:`, e.message));
    await page.addInitScript(() => {
      localStorage.setItem("oga-veve:teclas-vistas", "1");
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Performance.enable");
    await page.goto(
      `${BASE}/?escenario=pettirossi&hora=16&leccion=despegue&tramo=${TRAMO}&avion=${avion}&meteo=`,
    );
    await page.waitForFunction(() => !!globalThis.__oga?.estado?.(), null, {
      timeout: 90000,
    });
    await page.waitForTimeout(8000);
    /*
     * En el aire, virando suave con el motor tirando: todo se mueve. Y se
     * vuelve a colocar antes de cada medida, que un viraje sostenido acaba en
     * espiral y un avión en el suelo no mueve ninguna aguja.
     */
    const { x: x0, z: z0 } = await page.evaluate(() => {
      const { x, z } = globalThis.__oga.estado().position;
      return { x, z };
    });
    const alAire = () =>
      page.evaluate(
        ({ x, z }) => {
          const o = globalThis.__oga;
          const a = o.avion();
          o.pilotar((c) => {
            c.engineOn = true;
            c.throttle = 0.75;
            c.elevator = 0.02;
            c.aileron = 0.06;
            c.rudder = 0.02;
          });
          o.colocar(x, o.suelo(x, z) + 900, z, (a.aproximacion ?? 40) * 1.6);
        },
        { x: x0, z: z0 },
      );
    await alAire();
    await page.waitForTimeout(2000);
    const ponerAbierto = (abierto) =>
      page.evaluate((abierto) => {
        const cuadro = document.querySelector('[data-hud="cuadro"]');
        const bajado = cuadro?.classList.contains("cuadro--bajado");
        if (!!bajado === !abierto) return;
        document
          .querySelector('[data-hud="cuadro-tirador"]')
          ?.dispatchEvent(
            new PointerEvent("pointerdown", { bubbles: true, cancelable: true }),
          );
      }, abierto);
    /**
     * Cada caso desde cero: fuera de lo grande y de la cabina, y de ahí al
     * que toca. Lo grande se pone tocando su losa, como con el dedo.
     */
    const ponerCaso = async (caso) => {
      await page.evaluate(() => {
        const o = globalThis.__oga;
        const cuadro = document.querySelector('[data-hud="cuadro"]');
        if (cuadro?.classList.contains("cuadro--grande"))
          document
            .querySelector('[data-hud="tablero"]')
            ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        if (o.vista() !== "chase") o.ponerVista("chase");
      });
      await ponerAbierto(caso !== "recogido" && caso !== "cabina");
      if (caso.startsWith("grande"))
        await page.evaluate((cual) => {
          document
            .querySelector(`[data-tel-grande="${cual}"]`)
            ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        }, caso.split("-")[1] ?? "actitud");
      if (caso === "cabina")
        await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
    };
    /** Lo que se ve de verdad, para no dar por medido un caso que no se puso. */
    const casoDeVerdad = () =>
      page.evaluate(() => {
        const cuadro = document.querySelector('[data-hud="cuadro"]');
        if (globalThis.__oga.vista() === "cockpit") return "cabina";
        if (cuadro?.classList.contains("cuadro--grande")) return "grande";
        return cuadro?.classList.contains("cuadro--bajado") ? "recogido" : "abierto";
      });

    const metricas = async () => {
      const { metrics } = await cdp.send("Performance.getMetrics");
      const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
      return {
        guion: m.ScriptDuration ?? 0,
        maqueta: m.LayoutDuration ?? 0,
        estilo: m.RecalcStyleDuration ?? 0,
        tarea: m.TaskDuration ?? 0,
      };
    };

    if (FOTOS) {
      await ponerAbierto(true);
      await alAire();
      await page.waitForTimeout(2500);
      const foto = `${FOTOS}/${avion}-${TRAMO}.png`;
      await page.screenshot({ path: foto });
      console.log(`  ${foto}`);
    }
    if (process.env.OGA_CONTAR)
      console.log(
        `  ${avion}: ` + JSON.stringify(await page.evaluate(() => {
          const t = document.querySelector('[data-hud="tablero"]');
          const todos = t ? [...t.querySelectorAll("*")] : [];
          const visibles = todos.filter(
            (e) => getComputedStyle(e).display !== "none",
          );
          return {
            piezas: todos.length,
            visibles: visibles.length,
            textos: visibles.filter((e) => e.tagName === "text").length,
            conTransform: visibles.filter((e) => e.hasAttribute("transform")).length,
            recortes: visibles.filter((e) => e.hasAttribute("clip-path")).length,
            filtros: visibles.filter((e) => getComputedStyle(e).filter !== "none").length,
          };
        })),
      );
    // Para probar una hipótesis sin tocar las fuentes: `OGA_CSS="regla"`.
    if (process.env.OGA_CSS)
      await page.addStyleTag({ content: process.env.OGA_CSS });

    for (let v = 0; v < VUELTAS; v++) {
      for (const caso of CASOS) {
        await ponerCaso(caso);
        await alAire();
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await page.waitForTimeout(1500);
        const antes = await metricas();
        const medida = await page.evaluate(async (ms) => {
          const tiempos = [];
          await new Promise((listo) => {
            let previo = performance.now();
            const fin = previo + ms;
            const paso = (t) => {
              tiempos.push(t - previo);
              previo = t;
              if (t < fin) requestAnimationFrame(paso);
              else listo();
            };
            requestAnimationFrame(paso);
          });
          const n = tiempos.length;
          const total = tiempos.reduce((s, x) => s + x, 0);
          tiempos.sort((a, b) => a - b);
          const en = (p) => tiempos[Math.floor(n * p)] ?? 0;
          return { mediana: en(0.5), p95: en(0.95), fps: (n * 1000) / total, n };
        }, MIDE);
        const despues = await metricas();
        const traza = process.env.OGA_TRAZA ? await trazar(cdp, caso) : null;
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
        const porCuadro = (k) => ((despues[k] - antes[k]) * 1000) / medida.n;
        const visto = await casoDeVerdad();
        if (!caso.startsWith(visto))
          console.log(`  ${avion}: se pidió «${caso}» y se ve «${visto}»`);
        filas.push({
          avion,
          vuelta: v,
          caso: caso.startsWith(visto) ? caso : `${caso}?`,
          ...medida,
          guion: porCuadro("guion"),
          estilo: porCuadro("estilo"),
          maqueta: porCuadro("maqueta"),
          tarea: porCuadro("tarea"),
          traza,
        });
        const f = filas[filas.length - 1];
        console.log(
          `  ${avion} ${TRAMO} v${v} ${f.caso.padEnd(14)} ` +
            `${f.fps.toFixed(1)} fps · mediana ${f.mediana.toFixed(1)} · p95 ${f.p95.toFixed(1)} ms · ` +
            `por cuadro: guion ${f.guion.toFixed(1)} estilo ${f.estilo.toFixed(1)} ` +
            `maqueta ${f.maqueta.toFixed(1)} tarea ${f.tarea.toFixed(1)} ms` +
            (traza ? ` · CPU del hilo ${traza.cpu.toFixed(2)} ms` : ""),
        );
      }
    }
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

console.log(`\n  ${ANCHO}×${ALTO} · CPU ×4 · ${TRAMO} · mediana de las ${VUELTAS} vueltas\n`);
const mediana = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
};
for (const avion of AVIONES) {
  for (const caso of CASOS) {
    const fs = filas.filter((f) => f.avion === avion && f.caso === caso);
    if (!fs.length) continue;
    console.log(
      `  ${avion.padEnd(8)} ${caso.padEnd(14)} ` +
        `${mediana(fs.map((f) => f.fps)).toFixed(1)} fps · ` +
        `mediana ${mediana(fs.map((f) => f.mediana)).toFixed(1)} ms · ` +
        `p95 ${mediana(fs.map((f) => f.p95)).toFixed(1)} ms · ` +
        `guion ${mediana(fs.map((f) => f.guion)).toFixed(1)} · ` +
        `estilo ${mediana(fs.map((f) => f.estilo)).toFixed(1)} · ` +
        `maqueta ${mediana(fs.map((f) => f.maqueta)).toFixed(1)} · ` +
        `tarea ${mediana(fs.map((f) => f.tarea)).toFixed(1)} ms`,
    );
    const tz = fs.map((f) => f.traza).filter(Boolean);
    if (tz.length)
      console.log(
        `  ${"".padEnd(8)} ${caso.padEnd(14)} CPU del hilo ` +
          `${mediana(tz.map((x) => x.cpu)).toFixed(2)} ms/cuadro · ` +
          `js ${mediana(tz.map((x) => x.js)).toFixed(2)} · ` +
          `pintar ${mediana(tz.map((x) => x.pintar)).toFixed(2)} · ` +
          `capas ${mediana(tz.map((x) => x.capas)).toFixed(2)} · ` +
          `estilo ${mediana(tz.map((x) => x.estiloCpu)).toFixed(2)} · ` +
          `maqueta ${mediana(tz.map((x) => x.maquetaCpu)).toFixed(2)}`,
      );
  }
}

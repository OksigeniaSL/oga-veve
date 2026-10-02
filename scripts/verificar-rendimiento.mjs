/**
 * El banco de rendimiento: cuánto cuesta cada escenario, y en qué máquina.
 *
 * `AGENTS.md` dice «antes de añadir un efecto visual, se mide», y hasta hoy no
 * había con qué: había un contador de fotogramas en pantalla —que ya es
 * algo— y ninguna manera de contestar la única pregunta que importa, que es
 * **si esto va en la tablet del aula**.
 *
 * ## Sin tablet, y midiendo de verdad
 *
 * No hace falta el aparato para poner un suelo: Chrome sabe **estrangular su
 * propia CPU** por un factor, y eso es exactamente lo que separa un portátil
 * de una tablet barata. Cuatro veces más lento es una tablet Android de gama
 * media de hace tres años; seis, una vieja. Así que se mide aquí a uno, a
 * cuatro y a seis, y lo que se exige es que a **cuatro** el juego siga por
 * encima de treinta fotogramas.
 *
 * No sustituye a probarlo en el aparato, y conviene saber por dónde falla:
 *
 * - **La GPU no se estrangula.** En una tablet, muchas veces lo que se atasca
 *   es el relleno de píxeles y no el cálculo.
 * - **Y aquí se dibuja por software** —SwiftShader—, porque esto corre sin
 *   pantalla. O sea que el reparto entre CPU y GPU no es el de un aparato de
 *   verdad; a cambio, todo el coste cae en la CPU, que es lo que este banco
 *   sabe estrangular, y el número que sale es **conservador**.
 *
 * Con esos dos avisos, convierte «va bien» en un número que se puede defender
 * y que salta cuando alguien mete un efecto caro.
 *
 * ## Qué mide
 *
 * - **Tiempo de cuadro**, en mediana y en percentil noventa y cinco. La
 *   mediana dice cómo va; el p95 dice si da tirones, que es lo que de verdad
 *   se nota.
 * - **Llamadas de dibujo y triángulos**, que dicen *por dónde* se va el
 *   tiempo: demasiadas cosas o cosas demasiado gordas son arreglos distintos.
 *
 * Uso: `node scripts/verificar-rendimiento.mjs [escenario…]`
 *
 * Y con `OGA_METAR="…"` mide con ese parte. Si trae capa de nubes, mide
 * además **dentro de la nube**, a media capa sobre el campo: es donde se
 * cierra la niebla, se apaga el cielo y pasan los jirones, el peor caso del
 * tiempo. Ver `world/capa-de-nubes.ts`.
 *
 * Y con `OGA_AVION=jaz-120` mide con ese avión, que es como se mide lo que
 * cuesta un avión: la librea de la casa se midió así, con el más grande.
 *
 * ## Y con la tarjeta de verdad
 *
 * `OGA_GPU=1` lanza Chrome con la GPU del equipo en vez de SwiftShader, y
 * entonces mide además **lo que tarda la tarjeta**: cada `render` va entre dos
 * marcas de `EXT_disjoint_timer_query_webgl2`, que es el reloj de la propia
 * GPU, y sale la mediana en milisegundos por cuadro. Sin eso, con la tarjeta
 * de verdad el tiempo de cuadro solo dice lo que tarda la CPU en mandar el
 * trabajo: la tarjeta lo hace en paralelo y no se ve. Se escribe también qué
 * tarjeta contestó, porque una medida que dice «GPU» y era SwiftShader no
 * vale para nada.
 *
 * Si el juego trae bandadas, se mide además un tercer sitio, **mirando a la
 * más cercana**, que es el peor caso de lo que cuestan: con el aeródromo
 * detrás y las aves llenando el cuadro. Ver `world/bandadas.ts`.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = 5281;
const ESCENARIOS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["yvytu-rape", "pettirossi", "tenerife-norte"];

/** Cuánto se estrangula la CPU, y qué aparato es cada cosa. */
const APRIETES = [
  { veces: 1, nombre: "esta máquina" },
  { veces: 4, nombre: "tablet de gama media" },
  { veces: 6, nombre: "tablet vieja" },
];

/** Lo que se exige a cuatro veces: treinta fotogramas por segundo. */
const CUADRO_MAXIMO = 33.3;

/** Cuánto se mide en cada sitio, ms. */
const MIDE = 4000;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const CON_GPU = process.env.OGA_GPU === "1";
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  /*
   * **Sin techo de sesenta**, que si no se mide el techo y no el juego.
   *
   * Con la sincronía vertical puesta, el navegador espera al monitor y todos
   * los cuadros salen a 16,7 ms exactos aunque el trabajo de cada uno sean
   * dos milisegundos: el banco decía «sesenta» hasta con la CPU estrangulada
   * seis veces, que es tanto como no medir. Quitándola, el intervalo entre
   * cuadros vuelve a ser lo que cuesta hacerlos.
   */
  args: [
    ...(CON_GPU
      ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
      : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"]),
    "--disable-gpu-vsync",
    "--disable-frame-rate-limit",
  ],
});

const filas = [];
/** Qué tarjeta contestó, para saber qué se ha medido. */
let tarjeta = "";

for (const escenario of ESCENARIOS) {
  const page = await navegador.newPage({
    viewport: { width: 1280, height: 720 },
  });
  await page.addInitScript(() => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
  });
  const cdp = await page.context().newCDPSession(page);
  await page.goto(
    `${BASE}/?escenario=${escenario}&hora=16&leccion=despegue&tramo=guyrami` +
      (process.env.OGA_AVION ? `&avion=${process.env.OGA_AVION}` : "") +
      (process.env.OGA_METAR
        ? `&metar=${encodeURIComponent(process.env.OGA_METAR)}`
        : ""),
  );
  await page.waitForFunction(() => !!globalThis.__oga?.estado, null, {
    timeout: 60000,
  });
  await page.waitForTimeout(14000);

  if (!tarjeta) tarjeta = await page.evaluate(() => {
    const gl = globalThis.__oga.pintor().getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre";
  });
  const hayBandadas = await page.evaluate(
    () => typeof globalThis.__oga.mirarLaBandada === "function",
  );
  const hayCapa = await page.evaluate(
    () => !!globalThis.__oga.capaDeNubes?.(),
  );
  for (const sitio of [
    "puesto",
    "aire",
    ...(hayCapa ? ["nube"] : []),
    ...(hayBandadas ? ["bandada"] : []),
  ]) {
    /*
     * **El peor caso de las aves**: la bandada que más aves lleva, de frente
     * y a su altura. Se vuelve a plantar el avión antes de cada medida,
     * porque vuela: a los cinco segundos ya la habría pasado.
     */
    const aLaBandada = () =>
      page.evaluate(() => globalThis.__oga.mirarLaBandada(700, "mayor"));
    if (sitio === "bandada" && !(await aLaBandada())) continue;
    if (sitio === "nube") {
      // A media capa sobre el campo, con el automático guardando la altura.
      await page.evaluate(() => {
        const o = globalThis.__oga;
        const c = o.capaDeNubes();
        const r = o.pista();
        const y = (c.base + c.techo) / 2;
        o.colocar(r.x, y, r.z, 70, 0);
        o.ponerVentanillaAlt?.(y / 0.3048);
        o.pilotoAutomatico(true);
      });
      await page.waitForTimeout(1500);
    }
    if (sitio === "aire") {
      // Sobre el aeródromo y a la altura del circuito, que es donde se ve
      // todo a la vez: el aeropuerto, el pueblo y el monte.
      await page.evaluate(() => {
        const o = globalThis.__oga;
        const r = o.pista();
        o.colocar(r.x, o.suelo(r.x, r.z) + 250, r.z, 30);
      });
      await page.waitForTimeout(1500);
    }
    for (const { veces, nombre } of APRIETES) {
      if (sitio === "bandada") await aLaBandada();
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: veces });
      // Un respiro para que se estabilice antes de contar.
      await page.waitForTimeout(1200);
      const medida = await page.evaluate(async ({ ms, conGpu }) => {
        const tiempos = [];
        /*
         * El reloj de la tarjeta: cada `render` entre dos marcas. Los
         * resultados llegan unos cuadros tarde, así que se recogen al final y
         * se descartan los que la GPU marca como no fiables (`disjoint`).
         */
        const pintor = globalThis.__oga.pintor();
        const gl = pintor.getContext();
        const ext = conGpu ? gl.getExtension("EXT_disjoint_timer_query_webgl2") : null;
        const consultas = [];
        const original = pintor.render;
        if (ext) {
          pintor.render = function (...args) {
            const q = gl.createQuery();
            gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
            try {
              return original.apply(this, args);
            } finally {
              gl.endQuery(ext.TIME_ELAPSED_EXT);
              consultas.push(q);
            }
          };
        }
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
        let gpu = null;
        if (ext) {
          pintor.render = original;
          // Unos cuadros más para que lleguen los últimos resultados.
          for (let i = 0; i < 6; i++) await new Promise((r) => requestAnimationFrame(r));
          const ms = [];
          const roto = gl.getParameter(ext.GPU_DISJOINT_EXT);
          for (const q of consultas) {
            if (!roto && gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE))
              ms.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
            gl.deleteQuery(q);
          }
          ms.sort((a, b) => a - b);
          gpu = ms.length ? ms[Math.floor(ms.length / 2)] : null;
        }
        tiempos.sort((a, b) => a - b);
        const en = (p) => tiempos[Math.floor(tiempos.length * p)] ?? 0;
        return {
          mediana: en(0.5),
          p95: en(0.95),
          cuadros: tiempos.length,
          gpu,
          ...globalThis.__oga.coste(),
        };
      }, { ms: MIDE, conGpu: CON_GPU });
      filas.push({ escenario, sitio, veces, nombre, ...medida });
    }
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  }
  await page.close();
}

await navegador.close();
await server.close();

// ── El informe ────────────────────────────────────────────────────────────

console.log(`\n  rendimiento · 1280×720 · ${tarjeta}\n`);
let fallos = 0;
for (const f of filas) {
  const fps = f.mediana > 0 ? 1000 / f.mediana : 0;
  const exige = f.veces === 4;
  const bien = !exige || f.mediana <= CUADRO_MAXIMO;
  if (!bien) fallos++;
  console.log(
    `  ${bien ? "✓" : "✗"} ${f.escenario.padEnd(15)} ${f.sitio.padEnd(7)} ` +
      `×${f.veces} ${String(Math.round(fps)).padStart(3)} fps · ` +
      `mediana ${f.mediana.toFixed(1)} ms · p95 ${f.p95.toFixed(1)} ms · ` +
      `${f.llamadas} dibujos · ${(f.triangulos / 1000).toFixed(0)}k △` +
      (f.gpu !== null && f.gpu !== undefined ? ` · GPU ${f.gpu.toFixed(2)} ms` : "") +
      (f.aves ? ` · aves ${f.aves.cerca}+${f.aves.lejos}` : "") +
      (exige ? `  ← ${f.nombre}` : ""),
  );
}
console.log(
  `\n  Se exige a ×4 (tablet de gama media): mediana ≤ ${CUADRO_MAXIMO} ms.` +
    `  ${fallos ? `${fallos} por encima` : "todo dentro"}\n`,
);
process.exit(fallos ? 1 : 0);

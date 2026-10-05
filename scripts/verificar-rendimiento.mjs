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
 *
 * ## Y con la tarjeta del avión abierta
 *
 * `OGA_TARJETA=1` mide además, en el aire, **con la tarjeta del avión
 * abierta**: quieta —que es como está casi siempre: no se repinta si nada
 * cambia— y girándola con el dedo, que es su peor caso, pintando a cada
 * fotograma. Es un segundo dibujo en otro contexto, y la regla de AGENTS.md
 * es medirlo antes de darlo por bueno. Ver `ui/visor-del-avion.ts`.
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
const CON_TARJETA = process.env.OGA_TARJETA === "1";
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
  /*
   * **Lo que se baja, contado por la red**: fotos, teselas y todo lo demás.
   * Con las teselas de ortofoto (punto 166), «cuánto pesa» depende de dónde
   * se mire, así que se cuenta lo que de verdad llega y no lo que hay en el
   * servidor.
   */
  const bajado = { total: 0, teselas: 0, nTeselas: 0, fotos: 0 };
  page.on("response", async (r) => {
    const u = r.url();
    const largo =
      Number(r.headers()["content-length"] ?? 0) ||
      (await r.body().catch(() => Buffer.alloc(0))).length;
    bajado.total += largo;
    if (u.includes("/teselas/") && /\.jpg(\?|$)/.test(u)) {
      bajado.teselas += largo;
      bajado.nTeselas++;
    } else if (u.includes("/ortho/") && /\.jpg(\?|$)/.test(u)) bajado.fotos += largo;
  });
  const t0 = Date.now();
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
  /** Hasta poder jugar, s: el tiempo de carga que se nota. */
  const arranque = (Date.now() - t0) / 1000;
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
    /*
     * **Y en crucero**, a tres mil metros sobre el campo: es donde más isla
     * cabe en el cuadro y donde la ortofoto por teselas tiene más que pintar.
     * Ver `world/teselas-de-ortofoto.ts`.
     */
    "crucero",
    /*
     * **La tarjeta justo después del aire, en el mismo sitio**, para que la
     * diferencia sea la tarjeta y nada más. Medida al final, detrás de la
     * nube y de la bandada, salía a 45 ms contra los 22 del aire... y la
     * bandada, sin tarjeta, a 42: lo que se medía era el orden.
     */
    ...(CON_TARJETA ? ["tarjeta", "girando"] : []),
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
    if (sitio === "tarjeta") {
      // En el aire otra vez, y la tarjeta abierta como al tocar la placa.
      await page.evaluate(() => {
        const o = globalThis.__oga;
        const r = o.pista();
        o.colocar(r.x, o.suelo(r.x, r.z) + 250, r.z, 30);
        if (!o.tarjetaDelAvion().abierta) o.alternarTarjeta();
      });
      await page.waitForFunction(
        () => !!document.querySelector("#tarjeta-avion .tav--3d"),
        null,
        { timeout: 60000 },
      );
      await page.waitForTimeout(1500);
    }
    if (sitio === "crucero") {
      await page.evaluate(() => {
        const o = globalThis.__oga;
        const r = o.pista();
        o.colocar(r.x, o.suelo(r.x, r.z) + 3000, r.z, 120);
        o.ponerVentanillaAlt?.((o.suelo(r.x, r.z) + 3000) / 0.3048);
        o.pilotoAutomatico?.(true);
      });
      // Lo que haya que bajar para ese sitio, que en crucero es lo que más.
      await page.waitForTimeout(8000);
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
      const medida = await page.evaluate(async ({ ms, conGpu, girando }) => {
        const tiempos = [];
        /*
         * **Girándola con el dedo**: un dedo de mentira que aprieta en el
         * lienzo y se mueve cuatro píxeles por fotograma. Es el peor caso: la
         * tarjeta pinta a cada fotograma mientras se arrastra.
         */
        const lienzo = girando ? document.querySelector('[data-tarjeta="lienzo"]') : null;
        let x = 200;
        if (lienzo)
          lienzo.dispatchEvent(
            new PointerEvent("pointerdown", { bubbles: true, pointerId: 77, clientX: x, clientY: 200, button: 0, pointerType: "touch" }),
          );
        const antes = globalThis.__oga.tarjetaDelAvion?.().pintadas ?? 0;
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
            if (lienzo) {
              x += 4;
              window.dispatchEvent(
                new PointerEvent("pointermove", { pointerId: 77, clientX: x, clientY: 200, pointerType: "touch" }),
              );
            }
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
        if (lienzo)
          window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 77, pointerType: "touch" }));
        const pintadas = (globalThis.__oga.tarjetaDelAvion?.().pintadas ?? 0) - antes;
        tiempos.sort((a, b) => a - b);
        const en = (p) => tiempos[Math.floor(tiempos.length * p)] ?? 0;
        /*
         * **La memoria de texturas**, sumada a mano: lo que ocupa en la
         * tarjeta cada textura que cuelga de un material de la escena, sin
         * contar dos veces la misma. three solo dice cuántas hay, y lo que se
         * quiere saber es cuánto pesan —una ortofoto de 3.584 de lado son
         * cincuenta megas en la tarjeta aunque baje en uno—.
         */
        const vistas = new Set();
        let bytesDeTexturas = 0;
        const mirar = (t) => {
          if (!t || !t.isTexture || vistas.has(t)) return;
          vistas.add(t);
          const img = t.image ?? {};
          const ancho = img.width ?? img.videoWidth ?? 0;
          const alto = img.height ?? img.videoHeight ?? 0;
          const capas = img.depth ?? 1;
          const conMip = t.generateMipmaps && t.minFilter !== 1006 ? 4 / 3 : 1;
          bytesDeTexturas += ancho * alto * 4 * capas * conMip;
        };
        globalThis.__oga.escena().traverse((o) => {
          const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
          for (const m of ms) {
            for (const v of Object.values(m)) mirar(v);
            for (const v of Object.values(m.userData ?? {})) mirar(v);
            for (const u of Object.values(m.uniforms ?? {})) mirar(u?.value);
          }
        });
        return {
          texturasMB: bytesDeTexturas / 1048576,
          pintadas,
          mediana: en(0.5),
          p95: en(0.95),
          cuadros: tiempos.length,
          gpu,
          ...globalThis.__oga.coste(),
        };
      }, { ms: MIDE, conGpu: CON_GPU, girando: sitio === "girando" });
      filas.push({
        escenario,
        sitio,
        veces,
        nombre,
        arranque,
        bajadoMB: bajado.total / 1048576,
        teselasMB: bajado.teselas / 1048576,
        nTeselas: bajado.nTeselas,
        fotosMB: bajado.fotos / 1048576,
        ...medida,
      });
    }
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    if (sitio === "girando")
      await page.evaluate(() => {
        const o = globalThis.__oga;
        if (o.tarjetaDelAvion().abierta) o.alternarTarjeta();
      });
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
      ` · texturas ${f.texturasMB.toFixed(0)} MB` +
      (f.veces === 1
        ? ` · bajado ${f.bajadoMB.toFixed(1)} MB (fotos ${f.fotosMB.toFixed(1)}, ` +
          `teselas ${f.nTeselas}: ${f.teselasMB.toFixed(1)}) · arranque ${f.arranque.toFixed(1)} s`
        : "") +
      (f.sitio === "tarjeta" || f.sitio === "girando"
        ? ` · tarjeta ${Math.round((f.pintadas * 1000) / MIDE)}/s`
        : "") +
      (exige ? `  ← ${f.nombre}` : ""),
  );
}
console.log(
  `\n  Se exige a ×4 (tablet de gama media): mediana ≤ ${CUADRO_MAXIMO} ms.` +
    `  ${fallos ? `${fallos} por encima` : "todo dentro"}\n`,
);
process.exit(fallos ? 1 : 0);

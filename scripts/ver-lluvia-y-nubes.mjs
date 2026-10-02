/**
 * La lluvia y la capa de nubes, miradas con la tarjeta de verdad: debajo,
 * dentro y encima, desde la persecución, la cabina y el morro. Y lo que
 * cuesta cada sitio, con la capa y sin ella.
 *
 * Lo que dicen las pruebas de unidad —que la gota va contra el avión, que no
 * llueve por encima del techo, que la ventanilla no anuncia lo tapado— no
 * dice **cómo se ve** atravesar la capa, y eso es lo que se pidió: «las nubes
 * no se notan al atravesarlas». Así que se pone el avión en los tres sitios y
 * se fotografía, y en cada uno se mide con el reloj de la propia GPU.
 *
 * Uso:
 *
 *     OGA_FOTOS=carpeta OGA_METAR="METAR GCXO … RA BKN010 …" \
 *       node scripts/ver-lluvia-y-nubes.mjs
 *
 * Sin `OGA_METAR`, un día de lluvia con la capa a mil pies sobre Los Rodeos.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = 5317;
const FOTOS = process.env.OGA_FOTOS ?? "fotos-lluvia-y-nubes";
const METAR =
  process.env.OGA_METAR ?? "METAR GCXO 021300Z 31012KT 6000 RA BKN010 19/17 Q1017";
const AVION = process.env.OGA_AVION ?? "jaz-120";
mkdirSync(FOTOS, { recursive: true });

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
let navegador;
let fallos = 0;
const errores = [];
try {
  await server.listen();
  const BASE = baseDe(server, PUERTO);
  navegador = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    args: [
      "--headless=new",
      "--enable-gpu",
      "--ignore-gpu-blocklist",
      "--use-angle=gl",
      // Sin techo de sesenta, para medir lo que cuesta y no el monitor.
      "--disable-gpu-vsync",
      "--disable-frame-rate-limit",
    ],
  });
  const page = await navegador.newPage({
    viewport: { width: 1280, height: 720 },
    locale: "es-PY",
  });
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.addInitScript(() =>
    localStorage.setItem("oga-veve:teclas-vistas", "1"),
  );
  await page.goto(
    `${BASE}/?escenario=tenerife-norte&hora=15&leccion=vuelta&tramo=guyrami` +
      `&avion=${AVION}&destino=gran-canaria&metar=${encodeURIComponent(METAR)}`,
  );
  await page.waitForFunction(() => !!globalThis.__oga?.estado, null, {
    timeout: 120000,
  });
  await page.waitForTimeout(12000);

  const tarjeta = await page.evaluate(() => {
    const gl = globalThis.__oga.pintor().getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre";
  });
  console.log(`\n  tarjeta: ${tarjeta}`);
  if (/swiftshader/i.test(tarjeta)) {
    console.log("  ✗ esto es SwiftShader: las fotos no valen para juzgar");
    fallos++;
  }
  console.log(`  parte: ${METAR}`);

  /*
   * La capa como la pone el juego: base y techo en altitud. Si el juego no
   * sabe decirlo —antes de que la capa tuviera grosor—, la base del banco y
   * los doscientos ochenta metros de sus cinco láminas.
   */
  const capa = await page.evaluate(() => {
    const o = globalThis.__oga;
    if (typeof o.capaDeNubes === "function") return o.capaDeNubes();
    const n = o.nubes();
    return n?.visible ? { base: n.altura, techo: n.altura + 280 } : null;
  });
  if (!capa) throw new Error("el parte no ha puesto capa de nubes");
  console.log(
    `  capa: base ${Math.round(capa.base)} m · techo ${Math.round(capa.techo)} m`,
  );

  /*
   * Sobre el mar al norte de Los Rodeos, rumbo oeste: con la costa de
   * Tenerife a la izquierda y nada contra lo que chocar a ninguna altura.
   */
  const SITIOS = {
    debajo: capa.base - 250,
    // Entrando: los primeros jirones, con el mar todavía detrás.
    borde: capa.base + 15,
    dentro: (capa.base + capa.techo) / 2,
    encima: capa.techo + 300,
  };
  /*
   * Con la ventanilla ALT a esa altura, para que el automático la guarde: sin
   * ella sube hacia la del plan y en dos segundos ya no se está donde se
   * quería mirar.
   */
  const colocar = (y) =>
    page.evaluate(
      ([y]) => {
        const o = globalThis.__oga;
        o.colocar(0, y, -16000, 110, -Math.PI / 2);
        o.ponerVentanillaAlt?.(y / 0.3048);
        o.pilotoAutomatico(true);
      },
      [y],
    );

  /** Lo que cuesta el cuadro aquí: tiempo, dibujos, triángulos y GPU. */
  const medir = (ms = 3500) =>
    page.evaluate(async (ms) => {
      const pintor = globalThis.__oga.pintor();
      const gl = pintor.getContext();
      const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
      const consultas = [];
      const original = pintor.render;
      if (ext)
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
      pintor.render = original;
      let gpu = null;
      if (ext) {
        for (let i = 0; i < 6; i++)
          await new Promise((r) => requestAnimationFrame(r));
        const roto = gl.getParameter(ext.GPU_DISJOINT_EXT);
        const xs = [];
        for (const q of consultas) {
          if (!roto && gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE))
            xs.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
          gl.deleteQuery(q);
        }
        xs.sort((a, b) => a - b);
        gpu = xs.length ? xs[Math.floor(xs.length / 2)] : null;
      }
      tiempos.sort((a, b) => a - b);
      return {
        mediana: tiempos[Math.floor(tiempos.length / 2)] ?? 0,
        gpu,
        ...globalThis.__oga.coste(),
      };
    }, ms);

  for (const [sitio, y] of Object.entries(SITIOS)) {
    for (const vista of ["chase", "cockpit", "morro"]) {
      await colocar(y);
      await page.evaluate((v) => globalThis.__oga.ponerVista(v), vista);
      await page.waitForTimeout(1800);
      const ruta = `${FOTOS}/${sitio}-${vista}.png`;
      await page.screenshot({ path: ruta });
      const como = await page.evaluate(() => {
        const o = globalThis.__oga;
        const c = o.capaDeNubes?.();
        const a = o.agua?.();
        return (
          `avión a ${Math.round(o.estado().position.y)} m` +
          (c ? ` · dentro ${c.enLaNube.toFixed(2)} · niebla ${c.niebla.toFixed(4)}` : "") +
          (a ? ` · ${a.rayas} rayas · ${a.jirones} jirones · ${a.gotas} gotas` : "")
        );
      });
      console.log(`  foto ${ruta} · ${como}`);
    }
  }

  /*
   * **Y lo que cuesta, con la capa y sin ella, a turnos.** En esta máquina
   * hay otros bancos corriendo a la vez, y una medida suelta se la lleva
   * cualquiera de ellos: la primera tirada dio tres veces más debajo de la
   * capa que sin ella y era otro navegador. Así que en cada sitio se mide con
   * y sin, tres veces cada una alternando, y se da la mediana de las
   * medianas.
   */
  const parte = await page.evaluate(() => ({
    techoM: globalThis.__oga.capaDeNubes()?.techoM ?? null,
    tapadura: globalThis.__oga.capaDeNubes()?.tapadura ?? 0,
    ...globalThis.__oga.lloviendo(),
  }));
  const poner = (con) =>
    page.evaluate(
      ([con, p]) => {
        const o = globalThis.__oga;
        o.ponerNubes(con ? p.techoM : null, p.tapadura);
        o.ponerLluvia(con ? p.clase : "nada", con ? p.fuerza : 0);
      },
      [con, parte],
    );
  const filas = [];
  const medianaDe = (xs) => {
    const o = xs.filter((x) => x !== null).sort((a, b) => a - b);
    return o.length ? o[Math.floor(o.length / 2)] : null;
  };
  for (const [sitio, vista] of [
    ["debajo", "chase"],
    ["dentro", "chase"],
    ["dentro", "cockpit"],
    ["encima", "chase"],
  ]) {
    const tandas = { con: [], sin: [] };
    for (let k = 0; k < 3; k++)
      for (const con of [true, false]) {
        await poner(con);
        await colocar(SITIOS[sitio]);
        await page.evaluate((v) => globalThis.__oga.ponerVista(v), vista);
        await page.waitForTimeout(1200);
        tandas[con ? "con" : "sin"].push(await medir(2500));
      }
    for (const lado of ["con", "sin"]) {
      const xs = tandas[lado];
      filas.push({
        sitio: `${sitio} ${lado}`,
        vista,
        mediana: medianaDe(xs.map((x) => x.mediana)),
        gpu: medianaDe(xs.map((x) => x.gpu)),
        llamadas: xs[xs.length - 1].llamadas,
        triangulos: xs[xs.length - 1].triangulos,
      });
    }
  }
  await poner(true);

  console.log("\n  coste (1280×720, GPU de verdad):");
  for (const f of filas)
    console.log(
      `    ${f.sitio.padEnd(11)} ${f.vista.padEnd(8)} ` +
        `cuadro ${f.mediana.toFixed(2)} ms · ${f.llamadas} dibujos · ` +
        `${(f.triangulos / 1000).toFixed(1)}k △` +
        (f.gpu !== null ? ` · GPU ${f.gpu.toFixed(2)} ms` : " · GPU sin reloj"),
    );
  await page.close();
} finally {
  await navegador?.close();
  await server.close();
}
for (const e of errores) console.log(`  ERROR: ${e}`);
if (errores.length) fallos++;
console.log(fallos ? `\n  ${fallos} fallos\n` : "\n  ✓ hecho\n");
process.exit(fallos ? 1 : 0);

/**
 * **Mirar la cabina de dos pasillos**, con la tarjeta de verdad: las tres capturas
 * del JAZ 110 —el pasillo, la ventanilla y la pantalla— y lo que cuesta cada una.
 *
 * Abre `?inicio=3&avion=jaz-110` de día, en el puesto, y otra vez ya arriba y de
 * noche (`&largo=`), con el mapa a medio camino. Los planos se ponen a mano: el
 * `respaldo` todavía no lo usa ningún guion.
 *
 *   OGA_FOTOS=carpeta node scripts/ver-cabina-333.mjs
 *
 * `OGA_SIN_MEDIR=1` sin la medida; `OGA_SOLO_NOCHE=1` y `OGA_SOLO_DIA=1`, una de las dos.
 * `OGA_MEDIR=1` solo la medida, a uno y a cuatro veces de CPU, la tablet de gama
 * media del banco de rendimiento: `ventanilla` es sin la cabina nueva, y
 * `pasillo` y `respaldo`, con ella. Si dice SwiftShader, no vale ni para mirar ni
 * para medir.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const FOTOS = process.env.OGA_FOTOS ?? "capturas-cabina-333";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5604);
const SOLO_MEDIR = !!process.env.OGA_MEDIR;
const MEDIR = SOLO_MEDIR || !process.env.OGA_SIN_MEDIR;
mkdirSync(FOTOS, { recursive: true });

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false, watch: null },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-gpu-vsync"],
});
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const informe = [];

/** La tarjeta que dibuja esta página: cada captura lleva escrito con qué se hizo. */
const laTarjeta = (page) =>
  page.evaluate(() => {
    const g = globalThis.__oga.pintor().getContext();
    const i = g.getExtension("WEBGL_debug_renderer_info");
    return i ? g.getParameter(i.UNMASKED_RENDERER_WEBGL) : "sin extensión";
  });

async function abrir(contexto, consulta) {
  const page = await contexto.newPage();
  page.on("pageerror", (e) => console.log("  ERROR:", e.message.slice(0, 300)));
  page.on("console", (m) => {
    if (m.type() === "error" || /THREE\.|no cabe/.test(m.text())) console.log("  consola:", m.text().slice(0, 300));
  });
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(`${BASE}/?inicio=3&avion=jaz-110&${consulta}`);
  await page.waitForFunction(() => !!globalThis.__oga?.inicio?.()?.estado, null, { timeout: 240_000 });
  await page.keyboard.press("ShiftLeft");
  await page.waitForFunction(() => globalThis.__oga.inicio().vista?.startsWith("pasaje"), null, { timeout: 120_000 }).catch(() => {});
  await pausa(5000);
  return page;
}

async function fotos(page, sufijo, planos = ["pasillo", "ventanilla", "respaldo"]) {
  const tarjeta = await laTarjeta(page);
  console.log(`  ${sufijo} · avión ${await page.evaluate(() => globalThis.__oga.avion().id)} · tarjeta: ${tarjeta}`);
  informe.push(`${sufijo}: ${tarjeta}`);
  for (const plano of planos) {
    await page.evaluate((p) => globalThis.__oga.ponerPlano(p), plano);
    await pausa(2500);
    const donde = await page.evaluate(() => {
      const p = globalThis.__oga.pasillo();
      return p ? { plano: p.plano, colgado: p.colgado, marco: p.marco, fov: p.fov, letrero: p.letrero, tiras: p.tiras } : null;
    });
    console.log(`  ${plano}:`, JSON.stringify(donde));
    await page.screenshot({ path: `${FOTOS}/${plano}-${sufijo}.png` });
  }
}

/** Lo que cuesta un plano: tiempo entre cuadros y, si la tarjeta lo da, lo que tarda ella. Ver `verificar-mirada.mjs`. */
async function medir(page) {
  const cdp = await page.context().newCDPSession(page);
  const salida = [];
  for (const plano of ["ventanilla", "pasillo", "respaldo"]) {
    await page.evaluate((p) => globalThis.__oga.ponerPlano(p), plano);
    await pausa(3000);
    for (const veces of [1, 4]) {
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: veces });
      await pausa(1200);
      const m = await page.evaluate(async () => {
        const tiempos = [];
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
        await new Promise((listo) => {
          let previo = performance.now();
          const fin = previo + 5000;
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
          for (let i = 0; i < 6; i++) await new Promise((r) => requestAnimationFrame(r));
          const ms = [];
          const roto = gl.getParameter(ext.GPU_DISJOINT_EXT);
          for (const q of consultas) {
            if (!roto && gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) ms.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
            gl.deleteQuery(q);
          }
          ms.sort((a, b) => a - b);
          gpu = ms.length ? ms[Math.floor(ms.length / 2)] : null;
        }
        tiempos.sort((a, b) => a - b);
        const en = (p) => tiempos[Math.floor(tiempos.length * p)] ?? 0;
        const info = pintor.info.render;
        return { mediana: en(0.5), p95: en(0.95), gpu, triangulos: info.triangles, llamadas: info.calls };
      });
      salida.push({ plano, veces, ...m });
      console.log(
        `  ${plano.padEnd(11)} ×${veces} · ${Math.round(1000 / m.mediana)} fps · mediana ${m.mediana.toFixed(1)} ms · p95 ${m.p95.toFixed(1)} ms` +
          (m.gpu != null ? ` · tarjeta ${m.gpu.toFixed(2)} ms` : "") +
          ` · ${m.triangulos} triángulos · ${m.llamadas} llamadas`,
      );
    }
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  }
  informe.push(JSON.stringify(salida, null, 1));
}

try {
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 720 }, locale: "es-PY" });
  if (!process.env.OGA_SOLO_NOCHE) {
    console.log("De día, en el puesto:");
    const page = await abrir(contexto, "fecha=2026-11-15");
    if (!SOLO_MEDIR) {
      await fotos(page, "dia");
      // La ventanilla oscurecida, sin persiana: cuatro toques, del todo.
      await page.evaluate(() => globalThis.__oga.ponerPlano("ventanilla"));
      for (let i = 0; i < 4; i++) await page.evaluate(() => globalThis.__oga.tocarLaVentanilla());
      await pausa(6000);
      await page.screenshot({ path: `${FOTOS}/ventanilla-oscura-dia.png` });
    }
    if (MEDIR) await medir(page);
    await page.close();
  }
  if (!process.env.OGA_SOLO_DIA && !SOLO_MEDIR) {
    console.log("De noche, embarcando, en el puesto:");
    const puesto = await abrir(contexto, "fecha=2026-11-15&hora=23");
    await fotos(puesto, "embarque-noche", ["pasillo", "ventanilla"]);
    await puesto.close();
    // Sin salto: `hasta` a la misma hora. Lo primero la pantalla, antes de que Ara se duerma.
    console.log("De noche, arriba, a las cuatro horas de vuelo:");
    const page = await abrir(contexto, "fecha=2026-11-15&largo=14400&hasta=14400");
    await fotos(page, "crucero-noche", ["respaldo", "pasillo"]);
    console.log("  hora del vuelo:", await page.evaluate(() => globalThis.__oga.inicio()?.salto?.hora ?? null));
    await page.close();
  }
  writeFileSync(`${FOTOS}/informe.txt`, informe.join("\n") + "\n");
} finally {
  await navegador.close();
  await server.close();
}

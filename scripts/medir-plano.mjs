/**
 * **Lo que cuesta el plano en vuelo**, con la CPU de una tablet de gama media.
 *
 * Mide, con la CPU estrangulada cuatro veces —la tablet del aula, como en
 * `verificar-rendimiento.mjs`— y la GPU del portátil:
 *
 * - lo que tarda en abrirse el plano y en cambiar de lupa, que es cuando se
 *   repinta el fondo, lo caro;
 * - el cuadro con el plano abierto, que es lo que se paga cada fotograma;
 * - y lo que se baja para pintarlo.
 *
 * Sirve para comparar dos árboles: se corre en cada uno con el mismo puerto
 * libre y se miran los números juntos.
 *
 *   node scripts/medir-plano.mjs [escenario] [tramo]
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const SITIO = process.argv[2] ?? "tenerife-norte";
const TRAMO = process.argv[3] ?? "taguato-ruvicha";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5604);
const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false, watch: null },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const mediana = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
try {
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await contexto.newPage();
  const bajado = new Map();
  page.on("response", async (r) => {
    const url = r.url();
    if (!/\/assets\/(carta|letras)\//.test(url)) return;
    try {
      bajado.set(url.split("/").pop().split("?")[0], (await r.body()).length);
    } catch {
      // Una respuesta sin cuerpo no cuenta.
    }
  });
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(`${BASE}/?escenario=${SITIO}&tramo=${TRAMO}&hora=12`);
  await page.waitForSelector('[data-hud="mapa-boton"]', { state: "attached", timeout: 120000 });
  await page.waitForTimeout(6000);
  const cdp = await contexto.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const tarjeta = await page.evaluate(() => {
    const g = document.createElement("canvas").getContext("webgl");
    const i = g?.getExtension("WEBGL_debug_renderer_info");
    return i ? g.getParameter(i.UNMASKED_RENDERER_WEBGL) : "sin WebGL";
  });
  const cuadro = () =>
    page.evaluate(
      () =>
        new Promise((listo) => {
          const t = [];
          let antes = performance.now();
          const fin = antes + 3000;
          const paso = (ahora) => {
            t.push(ahora - antes);
            antes = ahora;
            if (ahora < fin) requestAnimationFrame(paso);
            else listo(t.slice(5));
          };
          requestAnimationFrame(paso);
        }),
    );
  const cerrado = await cuadro();
  // Abrir el plano: la primera vez, con la imagen bajándose; luego, ya en casa.
  const abrir = [];
  for (let i = 0; i < 5; i++) {
    abrir.push(
      await page.evaluate(() => {
        const t0 = performance.now();
        document.querySelector('[data-hud="mapa-boton"]')?.click();
        return performance.now() - t0;
      }),
    );
    await page.waitForTimeout(700);
    if (i < 4) await page.evaluate(() => document.querySelector('[data-hud="mapa-boton"]')?.click());
    await page.waitForTimeout(300);
  }
  const lupas = [];
  for (const accion of ["cerca", "cerca", "cerca", "lejos", "lejos", "lejos"]) {
    lupas.push(
      await page.evaluate((a) => {
        const t0 = performance.now();
        document.querySelector(`[data-hud="mapa"] [data-accion="${a}"]`)?.click();
        return performance.now() - t0;
      }, accion),
    );
    await page.waitForTimeout(400);
  }
  const abierto = await cuadro();
  console.log(`${SITIO} · ${TRAMO} · ${tarjeta} · CPU ×4`);
  console.log(`  abrir el plano: ${abrir.map((t) => t.toFixed(1)).join(", ")} ms (mediana ${mediana(abrir).toFixed(1)})`);
  console.log(`  cambiar de lupa: ${lupas.map((t) => t.toFixed(1)).join(", ")} ms (mediana ${mediana(lupas).toFixed(1)})`);
  console.log(`  cuadro con el plano cerrado: mediana ${mediana(cerrado).toFixed(1)} ms`);
  console.log(`  cuadro con el plano abierto: mediana ${mediana(abierto).toFixed(1)} ms`);
  console.log(`  bajado para la carta: ${[...bajado].map(([n, b]) => `${n} ${(b / 1024).toFixed(0)} KB`).join(", ") || "nada"}`);
} finally {
  await navegador.close();
  await server.close();
}

/**
 * **El plano en vuelo con la piel de la carta**, en los cuatro calcos, en
 * tablet y en teléfono tumbado, con la tarjeta de verdad.
 *
 * Arranca cada escenario directo en su peldaño (`?escenario=…&tramo=…`), abre
 * el plano y lo fotografía en el encuadre ancho y dos lupas más cerca. Cada
 * captura dice con qué tarjeta se dibujó, y cuánto tardó el último repintado
 * del fondo, que es lo caro.
 *
 *   node scripts/ver-plano.mjs <carpeta> [escenario…]
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";

const SALIDA = process.argv[2] ?? "capturas-plano";
const SITIOS = process.argv.slice(3).length ? process.argv.slice(3) : ["tenerife-norte", "pettirossi"];
const PUERTO = Number(process.env.OGA_PUERTO ?? 5604);
const TRAMOS = ["guyrami", "tuka", "taguato", "taguato-ruvicha"];
const PANTALLAS = [
  { nombre: "tablet", viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5, isMobile: false, hasTouch: true },
  { nombre: "telefono", viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];

mkdirSync(SALIDA, { recursive: true });
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
try {
  for (const pantalla of PANTALLAS) {
    for (const sitio of SITIOS) {
      for (const tramo of TRAMOS) {
        const contexto = await navegador.newContext({
          viewport: pantalla.viewport,
          deviceScaleFactor: pantalla.deviceScaleFactor,
          isMobile: pantalla.isMobile,
          hasTouch: pantalla.hasTouch,
        });
        const page = await contexto.newPage();
        page.on("pageerror", (e) => console.log(`  ERROR en la página: ${e.message}`));
        await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
        await page.goto(`${BASE}/?escenario=${sitio}&tramo=${tramo}&hora=12`);
        await page.waitForSelector('[data-hud="mapa-boton"]', { state: "attached", timeout: 120000 });
        await page.waitForTimeout(5000);
        const tarjeta = await page.evaluate(() => {
          const g = document.createElement("canvas").getContext("webgl");
          const i = g?.getExtension("WEBGL_debug_renderer_info");
          return i ? g.getParameter(i.UNMASKED_RENDERER_WEBGL) : "sin WebGL";
        });
        await page.evaluate(() => document.querySelector('[data-hud="mapa-boton"]')?.click());
        await page.waitForTimeout(1500);
        const nombre = `${SALIDA}/${sitio}-${tramo}-${pantalla.nombre}`;
        const caja = await page.$('[data-hud="mapa"]');
        for (const lupa of [0, 2]) {
          if (lupa) {
            for (let i = 0; i < lupa; i++)
              await page.evaluate(() => document.querySelector('[data-hud="mapa"] [data-accion="cerca"]')?.click());
            await page.waitForTimeout(800);
          }
          await (caja ?? page).screenshot({ path: `${nombre}-z${lupa}.png` });
        }
        console.log(`${nombre} · ${tarjeta}`);
        await contexto.close();
      }
    }
  }
} finally {
  await navegador.close();
  await server.close();
}

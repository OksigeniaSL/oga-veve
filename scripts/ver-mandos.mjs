/**
 * **Los alerones, la profundidad y el timón, movidos, en fotos.**
 *
 * Existe porque es de mirar: que el alerón derecho suba y el izquierdo baje
 * con el volante a la derecha, que la profundidad suba al tirar y el timón
 * vaya a la derecha con el pie derecho, y que en el centro el avión sea el de
 * siempre, sin rayas. Con el avión parado en Los Rodeos y el piloto de pruebas
 * en los mandos —en tierra se ve lo que pide quien pilota—, en cada vista que
 * se pida y en la tarjeta del avión abierta. Dice los grados de cada pieza y
 * qué tarjeta gráfica pintó: con `OGA_GPU=1`, la de verdad.
 *
 * Uso: `OGA_GPU=1 node scripts/ver-mandos.mjs carpeta [aviones] [vistas]`,
 * con `aviones` como `jaz-20,jaz-90` y `vistas` como `chase,izquierda`.
 * Con `OGA_EN_VUELO=1`, en la final y con el motor en marcha: en el aire se
 * ve lo que le llega al modelo de vuelo, y se fotografía a la media
 * décima de mover los mandos, antes de que el avión gire mucho.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";

import { baseDe } from "./servidor.mjs";

const RAIZ = process.cwd();
const CARPETA = process.argv[2];
const AVIONES = (process.argv[3] ?? "jaz-20,jaz-25,jaz-40,jaz-60,jaz-90,jaz-120").split(",");
const VISTAS = (process.argv[4] ?? "chase").split(",");
mkdirSync(CARPETA, { recursive: true });
const CON_GPU = process.env.OGA_GPU === "1";
const EN_VUELO = process.env.OGA_EN_VUELO === "1";
const PUERTO = 5371;

const server = await createServer({ root: RAIZ, server: { port: PUERTO, hmr: false }, logLevel: "error" });
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (const id of AVIONES) {
    const page = await navegador.newPage({ viewport: { width: 1280, height: 800 } });
    page.on("pageerror", (e) => console.log("  ERROR:", e.message.slice(0, 200)));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(
      `${BASE}/?escenario=tenerife-norte&hora=12&tramo=taguato&avion=${id}&meteo=&viento=000/00` +
        (EN_VUELO ? "&leccion=aterrizaje" : ""),
    );
    await page.waitForFunction(
      () => globalThis.__oga?.estado?.() && globalThis.__oga?.aeronave?.().deVerdad,
      null,
      { timeout: 120000 },
    );
    await pausa(2500);
    const tarjeta = await page.evaluate(() => {
      const gl = globalThis.__oga.pintor().getContext();
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre";
    });
    console.log(`  · ${id} · ${tarjeta}`);
    for (const [nombre, m] of [
      ["centro", { aileron: 0, elevator: 0, rudder: 0 }],
      ["derecha-tira-pie-derecho", { aileron: 1, elevator: 1, rudder: 1 }],
      ["izquierda-empuja-pie-izquierdo", { aileron: -1, elevator: -1, rudder: -1 }],
    ]) {
      await page.evaluate((m) => {
        globalThis.__oga.pilotar((c) => {
          c.engineOn = m.vuelo;
          c.throttle = m.vuelo ? 0.5 : 0;
          c.brakes = m.vuelo ? 0 : 1;
          c.aileron = m.aileron;
          c.elevator = m.elevator;
          c.rudder = m.rudder;
        });
      }, { ...m, vuelo: EN_VUELO });
      await pausa(EN_VUELO ? 600 : 1200);
      const grados = await page.evaluate(() => {
        const g = globalThis.__oga.aeronave().grupo;
        const fuera = {};
        g.traverse((o) => {
          if (/^(aleron|profundidad|timon)-/.test(o.name) && o.userData.bisagra) {
            const q = o.quaternion;
            fuera[o.name] = +((2 * Math.acos(Math.min(1, Math.abs(q.w))) * 180) / Math.PI).toFixed(1);
          }
        });
        return fuera;
      });
      console.log(`    ${nombre}: ${JSON.stringify(grados)}`);
      for (const vista of VISTAS) {
        await page.evaluate((v) => globalThis.__oga.ponerVista(v), vista);
        await pausa(900);
        await page.screenshot({ path: `${CARPETA}/${id}-${vista}-${nombre}.png` });
      }
    }
    // La tarjeta en vivo, con los mandos a un lado.
    await page.evaluate(() => globalThis.__oga.alternarTarjeta());
    await pausa(2500);
    await page.screenshot({ path: `${CARPETA}/${id}-tarjeta-izquierda.png` });
    await page.evaluate(() => {
      globalThis.__oga.pilotar((c) => {
        c.engineOn = false;
        c.brakes = 1;
        c.aileron = 1;
        c.elevator = 1;
        c.rudder = 1;
      });
    });
    await pausa(2500);
    await page.screenshot({ path: `${CARPETA}/${id}-tarjeta-derecha.png` });
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

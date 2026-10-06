/**
 * **El parabrisas y el guardasol de cada cabina, en fotos y en píxeles.**
 *
 * Existe por una captura: el JAZ 120 rodando en Tenerife Sur al atardecer,
 * con los montantes como dos planchas grises y el guardasol como una mancha
 * negra que tapaba media pantalla. «Una de las cosas a mejorar es el
 * parabrisas de los aviones, se ven feos.» Lo que se juzga aquí es cómo se ve,
 * así que va con la tarjeta de verdad (`OGA_GPU=1`) y dice cuál pintó.
 *
 * Por cada avión, momento y pantalla saca una foto desde el asiento y apunta
 * cuánto ocupan en la pantalla los montantes y el guardasol, medido con
 * `enPantalla` —en píxeles, que es donde se ve si algo tapa—.
 *
 * Uso:
 *
 *     OGA_GPU=1 node scripts/ver-parabrisas.mjs carpeta [aviones] [momentos] [pantallas]
 *
 * - `aviones`: `jaz-20,jaz-120`… (los seis si no se dice).
 * - `momentos`: `dia`, `atardecer`, `pista`, `lluvia` (`dia,atardecer`).
 *   `pista` es alineado en la cabecera, de día; `lluvia`, con agua en el
 *   cristal.
 * - `pantallas`: `portatil`, `telefono` (las dos).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";

import { baseDe } from "./servidor.mjs";

const RAIZ = process.cwd();
const CARPETA = process.argv[2] ?? "fotos-parabrisas";
const AVIONES = (process.argv[3] ?? "jaz-20,jaz-25,jaz-40,jaz-60,jaz-90,jaz-120").split(",");
const MOMENTOS = (process.argv[4] ?? "dia,atardecer").split(",");
const PANTALLAS = (process.argv[5] ?? "portatil,telefono").split(",");
mkdirSync(CARPETA, { recursive: true });
const CON_GPU = process.env.OGA_GPU === "1";
const PUERTO = 5374;

/*
 * El portátil, del tamaño de la captura que vino con la queja; el teléfono,
 * apaisado y con dedo, que es donde juega el público. Ver la memoria de
 * «mirar en móvil apaisado».
 */
const PANTALLA = {
  portatil: { viewport: { width: 1312, height: 750 } },
  telefono: {
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  },
};

/*
 * Tenerife Sur, que es la de la captura. La hora es solar —ver `horaPedida`
 * en `game.ts`—: a las 17,9 el sol está tocando el horizonte en octubre.
 */
const MOMENTO = {
  dia: "&hora=12",
  atardecer: "&hora=17.9",
  pista: "&hora=12&leccion=despegue",
  lluvia:
    "&hora=13&leccion=despegue&metar=" +
    encodeURIComponent("METAR GCTS 021300Z 31012KT 6000 RA BKN010 19/17 Q1017"),
};

const server = await createServer({
  root: RAIZ,
  server: { port: PUERTO, hmr: false },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const medidas = [];
try {
  for (const pantalla of PANTALLAS) {
    for (const momento of MOMENTOS) {
      for (const id of AVIONES) {
        const page = await navegador.newPage({ ...PANTALLA[pantalla], locale: "es-PY" });
        page.on("pageerror", (e) => console.log("  ERROR:", e.message.slice(0, 200)));
        await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
        await page.goto(
          `${BASE}/?escenario=tenerife-sur&tramo=guyrami&avion=${id}&viento=000/00` +
            (momento === "lluvia" ? "" : "&meteo=") +
            MOMENTO[momento],
        );
        try {
          await page.waitForFunction(
            () => globalThis.__oga?.estado?.() && globalThis.__oga?.aeronave?.().deVerdad,
            null,
            { timeout: 120000 },
          );
        } catch {
          console.log(`  ✗ ${id} ${momento} ${pantalla}: no cargó`);
          await page.close();
          continue;
        }
        await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
        await pausa(momento === "lluvia" ? 9000 : 3500);
        const tarjeta = await page.evaluate(() => {
          const gl = globalThis.__oga.pintor().getContext();
          const dbg = gl.getExtension("WEBGL_debug_renderer_info");
          return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre";
        });
        /*
         * Lo que ocupa cada pieza del marco en la pantalla: el ancho de cada
         * montante y el alto del guardasol en la columna de los ojos.
         */
        const piezas = await page.evaluate(() =>
          globalThis.__oga.enPantalla(
            "^(montante-parabrisas|marco-de-techo|visera|mcp|guardasol|parabrisas-|limpia|brujula|aviso-)",
          ),
        );
        const nombre = `${CARPETA}/${pantalla}-${momento}-${id}.png`;
        await page.screenshot({ path: nombre });
        console.log(`  · ${nombre} · ${tarjeta}`);
        medidas.push({ id, momento, pantalla, tarjeta, ...piezas });
        await page.close();
      }
    }
  }
} finally {
  writeFileSync(`${CARPETA}/medidas.json`, JSON.stringify(medidas, null, 1));
  await navegador.close();
  await server.close();
}
console.log("== fin");

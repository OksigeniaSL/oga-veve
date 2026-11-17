/**
 * **La radio de navegación en el cuadro** (#51): la aguja del ADF y el CDI
 * del VOR sobre la rosa, fotografiados en tablet y en teléfono tumbado, con
 * la tarjeta de verdad.
 *
 *   node scripts/ver-radio.mjs <carpeta>
 *
 * Cada juego sale en el peldaño de cabina, que es el que tiene radio: en
 * tierra, con la estación del campo puesta sola y el OBS en el radial donde
 * se está; y en el aire, a unas millas de la estación con el OBS girado,
 * para que la barra se aparte y se vea el TO/FROM. En el teléfono, con la
 * pantalla de navegación en grande. Dice qué estación recibe cada caja. El
 * puerto, `OGA_PUERTO`.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";

const SALIDA = process.argv[2] ?? "capturas-radio";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5687);
const PANTALLAS = [
  { nombre: "tablet", viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5, isMobile: false, hasTouch: true },
  { nombre: "telefono", viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];
/**
 * Los juegos: el sitio, el avión y dónde se pone en el aire, en metros desde
 * el origen del mundo (x al este, z al sur), con la altitud y el rumbo, y
 * cuántos grados se gira el OBS.
 */
const JUEGOS = [
  { escenario: "tenerife-norte", avion: "jaz-90", aire: { x: 14000, z: -4000, y: 1800, rumbo: 250 }, obs: -6 },
  { escenario: "tenerife-norte", avion: "jaz-20", aire: { x: 9000, z: 6000, y: 1500, rumbo: 300 }, obs: 5 },
  { escenario: "pettirossi", avion: "jaz-60", aire: { x: -12000, z: -9000, y: 1200, rumbo: 120 }, obs: 4 },
  { escenario: "pettirossi", avion: "jaz-20", aire: { x: 8000, z: 10000, y: 900, rumbo: 330 }, obs: -4 },
  { escenario: "fuerteventura", avion: "jaz-60", aire: { x: 6000, z: 15000, y: 1200, rumbo: 20 }, obs: 3 },
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

/** Lo que dice cada caja, leído del cuadro. */
const leer = (page) =>
  page.evaluate(() => {
    const t = (k) => document.querySelector(`[data-radio="${k}"]`)?.textContent?.trim() ?? "";
    const vis = (k) => document.querySelector(`[data-radio="${k}"]`)?.getAttribute("visibility") ?? "?";
    return `${t("nav-id") || t("nav-ident")} ${t("nav-mhz")} ${t("nav-crs") || t("nav-crs-cifra")} ${t("nav-dme")} · tofrom ${vis("tofrom")} · bandera ${vis("bandera")} · ${t("adf-id") || t("adf-ident")} ${t("adf-khz")} aguja ${vis("adf")}`;
  });

try {
  for (const pantalla of PANTALLAS) {
    const contexto = await navegador.newContext({
      viewport: pantalla.viewport,
      deviceScaleFactor: pantalla.deviceScaleFactor,
      isMobile: pantalla.isMobile,
      hasTouch: pantalla.hasTouch,
    });
    const page = await contexto.newPage();
    page.on("pageerror", (e) => console.log(`  ERROR en la página: ${e.message}`));
    await page.addInitScript(() => {
      localStorage.setItem("oga-veve:teclas-vistas", "1");

    });
    for (const j of JUEGOS) {
      await page.goto(`${BASE}/?escenario=${j.escenario}&hora=12&leccion=despegue&tramo=taguato-ruvicha&avion=${j.avion}&meteo=`);
      await page.waitForFunction(() => globalThis.__oga?.estado?.(), null, { timeout: 90000 });
      await page.waitForTimeout(2500);
      const tarjeta = await page.evaluate(() => {
        const g = document.createElement("canvas").getContext("webgl");
        const i = g?.getExtension("WEBGL_debug_renderer_info");
        return i ? g.getParameter(i.UNMASKED_RENDERER_WEBGL) : "sin WebGL";
      });
      const nombre = `${SALIDA}/${j.escenario}-${j.avion}-${pantalla.nombre}`;
      // El cuadro, subido: en el teléfono nace recogido.
      if (await page.$('[data-hud="cuadro"].cuadro--bajado')) {
        await page.keyboard.press("KeyH");
        await page.waitForTimeout(600);
      }
      if (pantalla.nombre === "telefono") {
        const losa = await page.$('[data-tel-grande="rumbo"]');
        if (losa) await losa.tap().catch(() => {});
        await page.waitForTimeout(600);
      }
      await page.screenshot({ path: `${nombre}-tierra.png` });
      console.log(`${nombre}-tierra.png · ${tarjeta}\n    ${await leer(page)}`);
      await page.evaluate(({ a, obs }) => {
        globalThis.__oga.colocar(a.x, a.y, a.z, 70, (a.rumbo * Math.PI) / 180);
        globalThis.__oga.juegoParaTrazas().girarElObs(obs);
      }, { a: j.aire, obs: j.obs });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${nombre}-aire.png` });
      console.log(`${nombre}-aire.png\n    ${await leer(page)}`);
    }
    await contexto.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

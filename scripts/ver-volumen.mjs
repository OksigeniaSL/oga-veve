/**
 * El mando de volumen, **en fotos**: en un portátil y en un teléfono apaisado.
 *
 * No comprueba nada: saca la pantalla del vuelo en los aparatos donde el mando
 * tiene que caber —el portátil del aula, con ratón, y el teléfono apaisado,
 * con el dedo y la franja de los pulgares llena— para mirarla. Lo que se mide
 * de verdad, que no pise nada, lo mide `verificar-carteles.mjs`.
 *
 * Uso: `node scripts/ver-volumen.mjs carpeta`
 *
 * `OGA_GPU=1` las saca con la tarjeta de verdad, que es como hay que juzgar lo
 * que se ve: las de software sirven para medir, no para mirar.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";

const FOTOS = process.argv[2];
if (!FOTOS) {
  console.error("  uso: node scripts/ver-volumen.mjs carpeta");
  process.exit(2);
}
mkdirSync(FOTOS, { recursive: true });
const CON_GPU = process.env.OGA_GPU === "1";
const PUERTO = 5347;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const APARATOS = [
  { nombre: "portatil", ancho: 1280, alto: 800, dedo: false },
  { nombre: "tableta", ancho: 1280, alto: 800, dedo: true },
  { nombre: "telefono", ancho: 915, alto: 412, dedo: true },
  { nombre: "telefono-pequeno", ancho: 780, alto: 360, dedo: true },
];

try {
  for (const a of APARATOS) {
    const page = await navegador.newPage({
      viewport: { width: a.ancho, height: a.alto },
      hasTouch: a.dedo,
      isMobile: a.dedo,
    });
    page.on("pageerror", (e) => console.log(`  ${a.nombre} ERROR:`, e.message));
    await page.addInitScript(() =>
      localStorage.setItem("oga-veve:teclas-vistas", "1"),
    );
    await page.goto(
      `${BASE}/?escenario=tenerife-norte&hora=16&leccion=despegue&tramo=taguato&avion=jaz-90`,
    );
    await page.bringToFront();
    await page
      .waitForFunction(() => globalThis.__oga?.estado?.(), null, { timeout: 90000 })
      .catch(() => console.log(`  ${a.nombre}: el juego no arrancó`));
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${FOTOS}/${a.nombre}.png` });
    /*
     * En el teléfono el volumen vive en el menú de los cuatro puntos: se
     * abre como lo abre quien juega.
     */
    const conMenu = await page.evaluate(() => {
      const b = document.querySelector('[data-hud="menu"]');
      if (!b || getComputedStyle(b).display === "none") return false;
      b.click();
      return true;
    });
    if (conMenu) await page.waitForTimeout(400);
    /*
     * Y con el mando en la mano: si hay un deslizador, a un tercio, que es
     * como lo deja quien tiene música de fondo.
     */
    const movido = await page.evaluate(() => {
      const d = document.querySelector('[data-hud="volumen"]');
      if (!d) return false;
      d.value = "0.35";
      d.dispatchEvent(new Event("input", { bubbles: true }));
      d.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    });
    if (movido) {
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${FOTOS}/${a.nombre}-bajado.png` });
    }
    console.log(`  ${a.nombre}: ${FOTOS}/${a.nombre}.png`);
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

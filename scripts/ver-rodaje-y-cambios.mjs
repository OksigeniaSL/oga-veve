/**
 * **La GS de rodar en la esquina de la pantalla de navegación, y lo que cambia
 * en el cuadro, en fotos.**
 *
 * Existe por dos frases de Enrique. Una con la barra de rodar: «¿qué es esa
 * barra verde en el radar? Eso es nuevo», y «se ve brusca ahí; tapa un
 * trocito de la circunferencia del radar». Otra con los cambios: «cuando hay un
 * cambio de altitud o velocidad estaría bien alguna señal acústica y otra
 * visual en el elemento que cambia, para yo verlo».
 *
 * Saca, en el JAZ 90 y en dos peldaños —el de los dibujos y el de las cifras—:
 *
 * 1. Rodando por Los Rodeos: el cuadro plano y la cabina, con la GS en la
 *    esquina, su dibujo de rodar y su marca. Y **mide** que la fila no pise la
 *    rosa: la distancia del centro de la rosa a la caja de la fila tiene que
 *    ser mayor que su radio.
 * 2. En el aire, al cambiar la ventanilla ALT: el marco que late y la flecha
 *    de la marca, en el instante y unos segundos después, y el modo del FMA
 *    recuadrado al poner el automático.
 *
 * Uso: `node scripts/ver-rodaje-y-cambios.mjs carpeta`. Con `OGA_GPU=1`, con
 * la tarjeta de verdad, que es como hay que mirar lo que se ve.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";

const FOTOS = process.argv[2];
if (!FOTOS) {
  console.error("  uso: node scripts/ver-rodaje-y-cambios.mjs carpeta");
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

const fallos = [];
try {
  for (const tramo of ["guyrami", "taguato"]) {
    const page = await navegador.newPage({ viewport: { width: 1280, height: 720 } });
    page.on("pageerror", (e) => console.log(`  ${tramo} ERROR:`, e.message));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(
      `${BASE}/?escenario=tenerife-norte&hora=12&leccion=despegue&tramo=${tramo}&avion=jaz-90`,
    );
    await page.bringToFront();
    await page.waitForFunction(() => globalThis.__oga?.aeronave?.().deVerdad === true, null, {
      timeout: 90000,
    });
    // Arranca y rueda unos segundos por la raya, con un poco de gas.
    await page.evaluate(() => {
      globalThis.__oga.pilotar((c) => {
        c.engineOn = true;
        c.brakes = 0;
        c.throttle = 0.32;
      });
    });
    await page.waitForTimeout(9000);
    const fila = await page.evaluate(() => {
      const g = document.querySelector('[data-cristal="rodaje"]');
      const rosas = [...document.querySelectorAll(".cr__rosa-caja")];
      if (!g) return null;
      const r = g.getBoundingClientRect();
      const visible = getComputedStyle(g).visibility === "visible";
      // La rosa de la pantalla de navegación es la que comparte pantalla con la fila.
      const rosa = rosas
        .map((c) => c.getBoundingClientRect())
        .find((c) => Math.abs(c.left - r.left) < 400);
      if (!rosa) return { visible, sinRosa: true };
      const cx = rosa.left + rosa.width / 2;
      const cy = rosa.top + rosa.height / 2;
      const radio = rosa.width / 2;
      const px = Math.max(r.left, Math.min(cx, r.right));
      const py = Math.max(r.top, Math.min(cy, r.bottom));
      const marca = document.querySelector('[data-cristal="rodaje-marca"]');
      return {
        visible,
        separacion: +(Math.hypot(cx - px, cy - py) - radio).toFixed(1),
        alto: +r.height.toFixed(1),
        marca: marca?.getAttribute("transform") ?? null,
        gs: globalThis.__oga.estado().groundSpeed,
      };
    });
    console.log(`  ${tramo}: la fila de la GS`, JSON.stringify(fila));
    if (!fila?.visible) fallos.push(`${tramo}: la GS de rodar no se ve rodando`);
    else if (!(fila.separacion > 0)) fallos.push(`${tramo}: la fila pisa la rosa (${fila.separacion} px)`);
    await page.screenshot({ path: `${FOTOS}/${tramo}-rodando-cuadro.png` });
    await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${FOTOS}/${tramo}-rodando-cabina.png` });
    await page.evaluate(() => globalThis.__oga.ponerVista("chase"));

    // En el aire, una ventanilla nueva que no viene de la mano: se resalta.
    await page.evaluate(() => {
      const o = globalThis.__oga;
      const a = o.avion();
      const { x, z } = o.estado().position;
      o.pilotar((c) => {
        c.engineOn = true;
        c.throttle = 0.7;
        c.elevator = 0;
        c.aileron = 0;
      });
      o.colocar(x, o.suelo(x, z) + 1200, z, (a.aproximacion ?? 70) * 1.6);
    });
    await page.waitForTimeout(3000);
    await page.evaluate(() => globalThis.__oga.ponerVentanillaAlt(9000));
    await page.waitForTimeout(150);
    const resalte = await page.evaluate(() => ({
      caja: !!document.querySelector('[data-cristal="alt-sel-caja"].cr__cambia'),
      flecha: [...document.querySelectorAll('[data-flecha^="alt-"]')]
        .filter((f) => f.getAttribute("visibility") === "visible")
        .map((f) => f.dataset.flecha),
      tonos: globalThis.__oga.sonidos().filter((s) => s.que === "cambio").length,
    }));
    console.log(`  ${tramo}: al cambiar la ventanilla`, JSON.stringify(resalte));
    if (!resalte.caja) fallos.push(`${tramo}: la ventanilla ALT no late al cambiar`);
    if (resalte.flecha.length !== 1) fallos.push(`${tramo}: la marca no lleva su flecha`);
    if (resalte.tonos < 1) fallos.push(`${tramo}: el cambio no sonó`);
    await page.screenshot({ path: `${FOTOS}/${tramo}-cambio-alt.png` });
    await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${FOTOS}/${tramo}-cambio-alt-cabina.png` });
    await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
    // Y el modo del FMA, al poner el automático: recuadrado sus diez segundos.
    await page.evaluate(() => globalThis.__oga.pilotoAutomatico(true));
    await page.waitForTimeout(1200);
    const fma = await page.evaluate(() =>
      [...document.querySelectorAll("[data-fma-caja]")]
        .filter((r) => r.getAttribute("visibility") === "visible")
        .map((r) => r.dataset.fmaCaja),
    );
    console.log(`  ${tramo}: el FMA recuadrado`, JSON.stringify(fma));
    // El FMA se lee desde el peldaño de las letras: en Guyrami no se pinta.
    if (tramo !== "guyrami" && !fma.length) fallos.push(`${tramo}: el FMA no recuadra el modo nuevo`);
    await page.screenshot({ path: `${FOTOS}/${tramo}-fma.png` });
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}
if (fallos.length) {
  console.log(`\n  ✗ ${fallos.length}: ${fallos.join(" · ")}`);
  process.exit(1);
}
console.log(`\n  ✓ fotos en ${FOTOS}`);

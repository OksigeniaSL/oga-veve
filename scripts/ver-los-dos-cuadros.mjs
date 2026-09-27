/**
 * El cuadro plano y la cabina de cada avión, **en fotos que se pueden poner
 * una al lado de la otra**.
 *
 * Existe por una frase: «los paneles de los aviones no coinciden en diferentes
 * vistas». Y no coincidían: el anemómetro del fumigador marcaba de treinta y
 * cinco en treinta y cinco en un sitio y de diecisiete y medio en el otro, el
 * motor de pistón era un tanto por ciento fuera y un tacómetro dentro, y el
 * depósito estaba en el cuadro y no en la cabina. Ninguna prueba unitaria lo
 * ve, porque cada dibujo por separado estaba bien hecho; lo que fallaba era
 * compararlos, y eso se hace mirando.
 *
 * Así que esto no comprueba nada: **saca las dos fotos de cada avión**, con el
 * mismo vuelo detrás —en el aire, con el motor tirando y los flaps a medias—
 * para que las agujas tengan algo que decir.
 *
 * Uso: `node scripts/ver-los-dos-cuadros.mjs carpeta [jaz-20 jaz-40 …]`
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
  console.error("  uso: node scripts/ver-los-dos-cuadros.mjs carpeta [avión…]");
  process.exit(2);
}
mkdirSync(FOTOS, { recursive: true });
const PEDIDOS = process.argv.slice(3);
const FLOTA = PEDIDOS.length
  ? PEDIDOS
  : ["jaz-20", "jaz-25", "jaz-40", "jaz-60", "jaz-90", "jaz-120"];
const CON_GPU = process.env.OGA_GPU === "1";
const PUERTO = 5343;

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

for (const id of FLOTA) {
  const page = await navegador.newPage({
    viewport: { width: 1280, height: 720 },
  });
  page.on("pageerror", (e) => console.log(`  ${id} ERROR:`, e.message));
  await page.addInitScript(() =>
    localStorage.setItem("oga-veve:teclas-vistas", "1"),
  );
  await page.goto(
    `${BASE}/?escenario=tenerife-norte&hora=12&leccion=despegue&tramo=taguato-ruvicha&avion=${id}`,
  );
  await page.bringToFront();
  await page
    .waitForFunction(() => globalThis.__oga?.aeronave?.().deVerdad === true, null, {
      timeout: 90000,
    })
    .catch(() => console.log(`  ${id}: el modelo no llegó a cargar`));
  /*
   * En el aire, a una velocidad que caiga dentro del arco verde de cualquiera
   * de los seis, con el motor tirando y un punto de flaps: así cada aguja
   * enseña algo y se ve si las dos vistas dicen lo mismo.
   */
  await page.evaluate(() => {
    const o = globalThis.__oga;
    const a = o.avion();
    const { x, z } = o.estado().position;
    o.pilotar((c) => {
      c.engineOn = true;
      c.throttle = 0.7;
      c.elevator = 0;
      c.aileron = 0.08;
      c.rudder = 0;
    });
    o.colocar(x, o.suelo(x, z) + 900, z, (a.aproximacion ?? 40) * 1.5);
    o.pedirFlaps?.(1 / 3);
  });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${FOTOS}/${id}-cuadro.png` });
  await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${FOTOS}/${id}-cabina.png` });
  console.log(`  ${id}: ${FOTOS}/${id}-cuadro.png · ${id}-cabina.png`);
  await page.close();
}

await navegador.close();
await server.close();

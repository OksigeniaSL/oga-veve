/**
 * La placa de la matrícula y el viento sin leer, **mirados con la GPU**.
 *
 * Dos cosas que solo se juzgan viéndolas: la placa con la matrícula en el
 * cuadro plano, en el de cristal y en la cabina en tres dimensiones —ver
 * `ui/tablero.ts` y `world/placa-de-cabina.ts`—, y la manga de viento del
 * HUD en Guyrami —ver `ui/manga-de-viento.ts`—. Las capturas de SwiftShader
 * no valen para esto: los colores y el grano del lienzo salen de otra forma.
 *
 * Uso: `node scripts/ver-placa-y-viento.mjs <carpeta>`
 *
 * Saca, por avión y peldaño, el vuelo recién arrancado en la vista de
 * persecución y en la de cabina. Con `?viento=` para que la manga tenga algo
 * que enseñar y se pueda comprobar el sentido: de cara, la manga apunta hacia
 * quien mira.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const D = process.argv[2] ?? "/tmp/placa-y-viento";
mkdirSync(D, { recursive: true });
const PUERTO = 5297;
const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"],
});

const TOMAS = [
  // [nombre, escenario, tramo, avión, viento, vista, ancho, alto]
  ["guyrami-jaz20", "pettirossi", "guyrami", "jaz-20", "050/12", "chase", 1100, 700],
  ["guyrami-jaz20-cabina", "pettirossi", "guyrami", "jaz-20", "050/12", "cockpit", 1100, 700],
  ["guyrami-jaz60-telefono", "la-palma", "guyrami", "jaz-60", "150/6", "chase", 915, 412],
  ["taguato-jaz60", "la-palma", "taguato", "jaz-60", "150/6", "chase", 1100, 700],
  ["taguato-jaz60-cabina", "la-palma", "taguato", "jaz-60", "150/6", "cockpit", 1100, 700],
  ["taguato-jaz90", "tenerife-norte", "taguato", "jaz-90", "300/15", "chase", 1100, 700],
  ["taguato-jaz90-cabina", "tenerife-norte", "taguato", "jaz-90", "300/15", "cockpit", 1100, 700],
];

try {
  for (const [nombre, esc, tramo, avion, viento, vista, ancho, alto] of TOMAS) {
    const page = await navegador.newPage({
      viewport: { width: ancho, height: alto },
      locale: "es-PY",
      hasTouch: ancho < 1000,
      isMobile: ancho < 1000,
    });
    page.on("pageerror", (e) => console.log(`  ${nombre} · error: ${e.message.slice(0, 160)}`));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(
      `${BASE}/?escenario=${esc}&hora=11&leccion=despegue&tramo=${tramo}&avion=${avion}` +
        `&viento=${encodeURIComponent(viento)}&meteo=`,
    );
    await page
      .waitForFunction(() => globalThis.__oga?.estado?.(), null, { timeout: 90000 })
      .catch(() => {});
    await page.evaluate(() => globalThis.__ogaEmpezar?.());
    if (vista !== "chase")
      await page.evaluate((v) => globalThis.__oga?.ponerVista?.(v), vista);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${D}/${nombre}.png` });
    // Y dónde quedó la placa de la cabina, que en la foto puede no verse por
    // estar tapada: su sitio en el mundo y lo lejos que queda del ojo.
    const placa = await page.evaluate(() => {
      const o = globalThis.__oga;
      const escena = o?.escena?.();
      let malla = null;
      escena?.traverse((x) => {
        if (x.name === "placa-matricula") malla = x;
      });
      if (!malla) return null;
      const p = malla.getWorldPosition(malla.position.clone());
      const ojo = o.ojoDeCamara?.();
      return {
        x: +p.x.toFixed(2),
        y: +p.y.toFixed(2),
        z: +p.z.toFixed(2),
        visible: malla.visible,
        ojo,
      };
    });
    console.log(`  ${nombre} → ${D}/${nombre}.png · placa: ${JSON.stringify(placa)}`);
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

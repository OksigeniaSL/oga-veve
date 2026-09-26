/**
 * La librea de cada avión, de cerca y con la tarjeta de verdad.
 *
 * `verificar-librea.mjs` comprueba que cada ranura lleva el color de su
 * ficha, y eso se mide; lo que no se mide es si la librea **está bien
 * diseñada**: si la cola se lee, si la franja lleva a la cola, si la marca
 * está donde tiene que estar. Para eso hay que mirar, y para mirar hace falta
 * esto — con la GPU del equipo, porque SwiftShader no juzga una imagen.
 *
 * Saca de cada avión las vistas de siempre de un avión en una revista: de
 * perfil, de tres cuartos por delante y por detrás, desde atrás, y dos de
 * cerca, la cola y la puerta.
 *
 * Uso: `node scripts/ver-librea.mjs [carpeta] [jaz-90 jaz-120 …]`
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const CARPETA = process.argv[2] ?? "librea";
const PEDIDOS = process.argv.slice(3);
const TODOS = ["jaz-20", "jaz-25", "jaz-40", "jaz-60", "jaz-90", "jaz-120"];
const PUERTO = 5311;

/**
 * Las vistas. `dir` es de dónde se mira en los ejes del avión —x a la
 * derecha, y arriba, z hacia la cola—; `mira`, a qué punto de su caja; y
 * `lejos`, a cuántos largos.
 */
const VISTAS = {
  perfil: { dir: [-1, 0.06, 0], lejos: 2.1 },
  "tres-cuartos": { dir: [-0.9, 0.35, -0.75], lejos: 1.9 },
  "tres-cuartos-atras": { dir: [0.85, 0.3, 0.9], lejos: 1.9 },
  atras: { dir: [0.12, 0.18, 1], lejos: 1.7, mira: [0.5, 0.55, 0.5] },
  cola: { dir: [-1, 0.15, 0.25], lejos: 0.62, mira: [0.5, 0.72, 0.9] },
  "cola-derecha": { dir: [1, 0.15, 0.25], lejos: 0.62, mira: [0.5, 0.72, 0.9] },
  puerta: { dir: [-1, 0.12, -0.35], lejos: 0.55, mira: [0.5, 0.45, 0.16] },
  "puerta-derecha": { dir: [1, 0.12, -0.35], lejos: 0.55, mira: [0.5, 0.45, 0.16] },
  // Y la firma de cerca, por los dos costados: que se lea del derecho.
  firma: { dir: [-1, 0.1, -0.15], lejos: 0.22, mira: "marca" },
  "firma-derecha": { dir: [1, 0.1, -0.15], lejos: 0.22, mira: "marca" },
};

mkdirSync(CARPETA, { recursive: true });
const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"],
});
try {
  for (const id of PEDIDOS.length ? PEDIDOS : TODOS) {
    const page = await navegador.newPage({ viewport: { width: 1200, height: 700 } });
    page.on("pageerror", (e) => console.log(`  ${id} ERROR:`, e.message));
    await page.goto(`${BASE}/scripts/ver-librea.html?avion=${id}`);
    await page.waitForFunction(() => globalThis.__listo === true, null, {
      timeout: 60000,
    });
    // `OGA_VISTAS=cola,puerta` saca solo esas, para ir y venir deprisa.
    const solo = process.env.OGA_VISTAS?.split(",");
    for (const [nombre, vista] of Object.entries(VISTAS)) {
      if (solo && !solo.includes(nombre)) continue;
      await page.evaluate((v) => globalThis.__vista(v), vista);
      const ruta = `${CARPETA}/${id}-${nombre}.png`;
      await page.screenshot({ path: ruta });
    }
    // Y los lienzos de la librea, sin luz: el dibujo tal como sale.
    for (const { nombre, url } of await page.evaluate(() => globalThis.__lienzos())) {
      writeFileSync(
        `${CARPETA}/${id}-lienzo-${nombre}.png`,
        Buffer.from(url.split(",")[1], "base64"),
      );
    }
    console.log(`  ${id}: ${Object.keys(VISTAS).length} vistas en ${CARPETA}/`);
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

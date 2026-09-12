/**
 * Las cinco siluetas, en fila y de perfil, para mirarlas.
 *
 * La fábrica se puede medir sin ojos —que midan lo que dicen, que sean
 * simétricas, que no haya dos con la misma huella— y eso lo hace
 * `fabrica-de-aeronaves.test.ts`. Lo que ninguna prueba puede decir es si **se
 * reconocen**, que es lo único que #68 pide de verdad. Para eso hay que mirar,
 * y para mirar hace falta esto.
 *
 * Saca tres vistas de cada una —de perfil, de planta y de tres cuartos—,
 * porque un avión no se reconoce desde un solo sitio: la cola en T se ve de
 * perfil y la flecha del ala se ve desde arriba.
 *
 * Uso: `node scripts/ver-flota.mjs [fichero.png]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const SALIDA = process.argv[2] ?? "flota.png";
const PUERTO = 5292;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
const page = await navegador.newPage({ viewport: { width: 1180, height: 780 } });
page.on("pageerror", (e) => console.log("ERROR:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLA:", m.text());
});

await page.goto(`http://localhost:${PUERTO}/scripts/ver-flota.html`);
await page.waitForFunction(() => globalThis.__listo === true, null, {
  timeout: 60000,
});
await page.screenshot({ path: SALIDA });
console.log(`  ${SALIDA}`);
await navegador.close();
await server.close();

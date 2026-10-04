/**
 * Los retratos de la flota para el hangar, hechos de antemano.
 *
 * El hangar enseñaba cada avión en «¿Con qué volás?» dibujándolo en el
 * navegador en el momento, con la fábrica de siluetas —cajas y cilindros—,
 * y se notaba: los motores flotando separados del ala, sin piel y sin la
 * librea. «Esas imágenes de los aviones son cutres.» Y además lo pagaba el
 * móvil: un contexto de WebGL y seis aviones montados antes de poder elegir,
 * trescientos milisegundos con la CPU de un teléfono barato.
 *
 * Aquí se hacen una vez, **con el avión que se vuela**: el `.glb` cargado y
 * vestido por el propio juego —`cargarModelo`, con los colores de la ficha y
 * la librea de la casa—, en Chrome sin ventana pero con la tarjeta gráfica de
 * verdad, porque SwiftShader no juzga una imagen. Salen como WebP con el fondo
 * transparente y el hangar las enseña como enseña cualquier imagen.
 *
 * ## Y no se pueden quedar viejos
 *
 * En `src/ui/retratos-huellas.json` va de qué `.glb`, de qué ficha y de qué
 * `librea.ts` salió cada retrato. `src/ui/retratos.test.ts` lo compara con lo
 * que hay ahora, y si alguien cambia un modelo o un color y no rehace los
 * retratos, la prueba se lo dice — con el avión y lo que cambió.
 *
 * ## Ni en el repositorio ni en el navegador
 *
 * **Cada retrato lleva en el nombre la huella de su imagen**:
 * `jaz-120-9db9a3c8.webp`. Se llamaban `jaz-120.webp` siempre, y el retrato
 * nuevo del JAZ 120 —el de las aletas partidas y el terracota de T8c— estaba
 * en el repositorio y en el servidor mientras Enrique seguía viendo el de
 * antes en «¿Con qué volás?»: puntas rectas y sin terracota. Lo servían las
 * cachés —la del navegador, que el servidor deja vivir hasta el día
 * siguiente; la de Cloudflare, y la precarga del service worker, que al
 * estrenar versión vuelve a pedir el fichero y se lo da la del navegador—,
 * y las tres guardan por dirección: con la misma dirección, la imagen de
 * ayer es tan buena como la de hoy. Con la huella en el nombre, un retrato
 * nuevo es otra dirección y no hay caché que lo tape; y el service worker,
 * que reconoce las huellas, guarda el de siempre sin volver a pedirlo. El
 * nombre de cada uno va en las huellas, y de ahí lo saca `ui/retratos.ts`.
 *
 * Uso: `npm run retratos [-- --fila hoja.png] [-- --solo jaz-60,jaz-120]`
 *
 * - `--fila` guarda además la flota entera en una hoja, para mirarla junta.
 * - `--a carpeta` los deja en otra carpeta y no toca las huellas: para probar.
 * - `OGA_RETRATO="rumbo=40&altura=12"` cambia el encuadre, para probar.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = 5317;
const MODELOS = "public/assets/aeronaves";
const RETRATOS = join(MODELOS, "retratos");

const args = process.argv.slice(2);
const opcion = (nombre) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
};
const FILA = opcion("--fila");
const DESTINO = opcion("--a") ?? RETRATOS;
const SOLO = opcion("--solo")?.split(",");
const PRUEBA = DESTINO !== RETRATOS;

const sha = (datos) => createHash("sha256").update(datos).digest("hex");

/**
 * La huella de un retrato: lo que, si cambia, cambia el dibujo.
 *
 * El modelo, entero; la librea que lo viste, que es código; y la ficha, que va
 * tal cual y no resumida para que la prueba pueda decir **qué** cambió.
 */
export function huellaDe(id, ficha, retrato) {
  return {
    glb: sha(readFileSync(join(MODELOS, `${id}.glb`))),
    librea: sha(readFileSync("src/world/librea.ts")),
    ficha,
    retrato,
  };
}

/**
 * El nombre del retrato: el avión y los ocho primeros de la huella de la
 * imagen, que es lo que el service worker reconoce como «con huella». Ver la
 * cabecera y `scripts/plantilla-sw.js`.
 */
export const nombreDelRetrato = (id, datos) => `${id}-${sha(datos).slice(0, 8)}.webp`;

const ids = readdirSync(MODELOS)
  .filter((f) => /^jaz-\d+\.glb$/.test(f))
  .map((f) => f.replace(/\.glb$/, ""))
  .sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)))
  .filter((id) => !SOLO || SOLO.includes(id));

mkdirSync(DESTINO, { recursive: true });
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

const rutaHuellas = "src/ui/retratos-huellas.json";
let huellas = {};
try {
  huellas = JSON.parse(readFileSync(rutaHuellas, "utf8"));
} catch {
  // La primera vez no hay.
}
const hechos = [];
let fallos = 0;
try {
  for (const id of ids) {
    const page = await navegador.newPage({ viewport: { width: 800, height: 600 } });
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message));
    await page.goto(`${BASE}/scripts/retratos.html?${process.env.OGA_RETRATO ?? ""}`);
    await page.waitForFunction(() => globalThis.__listo === true, null, { timeout: 60000 });
    try {
      const { url, ficha } = await page.evaluate((id) => globalThis.__retrato(id), id);
      if (!url.startsWith("data:image/webp")) throw new Error("el navegador no sabe hacer WebP");
      const datos = Buffer.from(url.split(",")[1], "base64");
      // De prueba, con el nombre de siempre; de verdad, con su huella, y
      // fuera el de antes de este avión, que ya no lo pide nadie.
      const nombre = PRUEBA ? `${id}.webp` : nombreDelRetrato(id, datos);
      if (!PRUEBA)
        for (const viejo of readdirSync(DESTINO))
          if (new RegExp(`^${id}(-[0-9a-f]{8})?\\.webp$`).test(viejo) && viejo !== nombre)
            rmSync(join(DESTINO, viejo));
      const ruta = join(DESTINO, nombre);
      writeFileSync(ruta, datos);
      if (!PRUEBA) huellas[id] = huellaDe(id, ficha, nombre);
      hechos.push({ id, url, kb: datos.length / 1024 });
      console.log(`  ✓ ${id.padEnd(8)} ${(datos.length / 1024).toFixed(1)} KB  ${ruta}`);
    } catch (e) {
      fallos++;
      console.log(`  ✗ ${id}: ${e.message}${errores.length ? ` · ${errores[0]}` : ""}`);
    }
    await page.close();
  }
  if (!PRUEBA)
    writeFileSync(rutaHuellas, JSON.stringify(huellas, null, 2) + "\n");

  // La flota junta, en el fondo del hangar: para ver que son de la misma casa.
  if (FILA && hechos.length) {
    const page = await navegador.newPage({
      viewport: { width: 3 * 600 + 4 * 24, height: Math.ceil(hechos.length / 3) * 384 + 24 },
    });
    await page.setContent(`
      <body style="margin:0;padding:12px;background:#1d2721;display:grid;
                   grid-template-columns:repeat(3,600px);gap:24px;
                   font:600 18px system-ui;color:#e4e2da">
        ${hechos
          .map(
            (h) => `<figure style="margin:0;position:relative">
              <img src="${h.url}" width="600" height="360" style="display:block" />
              <figcaption style="position:absolute;left:10px;top:6px">${h.id.toUpperCase()}</figcaption>
            </figure>`,
          )
          .join("")}
      </body>`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: FILA, fullPage: true });
    console.log(`\n  la flota junta: ${FILA}`);
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}
const total = hechos.reduce((a, h) => a + h.kb, 0);
console.log(`\n  ${hechos.length} de ${ids.length} retratos · ${total.toFixed(1)} KB en total`);
process.exit(fallos ? 1 : 0);

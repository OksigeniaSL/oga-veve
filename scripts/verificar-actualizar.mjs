/**
 * El botón de «hay una versión nueva», tocado con el dedo.
 *
 * «Al pulsar sobre el botón de actualizar no respondía», en el teléfono. No
 * era el dedo ni una capa encima: el botón guardaba el trabajador de servicio
 * que esperaba **cuando se encendió**, y si mientras tanto se publicaba otra
 * versión, ésa lo jubilaba y el toque iba a parar a un trabajador que ya no
 * existía. Con la pestaña abierta mientras se prueba —publicar, volver a
 * publicar— es justo lo que pasa. Ver `estrenar` en `main.ts`.
 *
 * Esto no se puede comprobar en el servidor de desarrollo, donde no hay
 * trabajador de servicio. Así que se compila, se sirve `dist/` con su `sw.js`
 * de producción y se **publican versiones** sin cerrar la pestaña: el
 * servidor pasa a servir otro `sw.js` —otra versión, otra caché— y otro
 * `index.html` con su marca. Después se toca el botón con el dedo y se mira
 * que la página se recargue en la versión última, con su trabajador al mando
 * y sin el botón.
 *
 * Tres casos, en un teléfono apaisado y con dedo: una versión nueva, dos
 * seguidas —el que no respondía—, y dos seguidas con el botón ya a la vista
 * antes de la segunda. Y en cada uno, que el botón no caiga encima de un
 * mando de pulgar: abajo a la derecha tapaba el ralentí de la palanca de
 * gases.
 *
 * Uso: `node scripts/verificar-actualizar.mjs` (compila antes).
 *   `OGA_SIN_COMPILAR=1` usa el `dist/` que haya.
 */
import { execSync } from "node:child_process";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium, devices } from "playwright";

const PUERTO = 5323;

if (!process.env.OGA_SIN_COMPILAR) {
  process.stdout.write("\n  compilando…\n");
  execSync("npx vite build", { stdio: "pipe" });
}

/*
 * **Publicar una versión es cambiar lo que sirve el servidor**, y basta con
 * dos ficheros: el `sw.js` —otra versión en su nombre de caché, que es lo que
 * hace que el navegador lo instale como nuevo— y el `index.html`, con una
 * marca para saber qué página se abrió después. El armazón es el mismo: lo
 * que se prueba es el relevo entre trabajadores, no la compilación.
 */
let version = 1;
const SW = readFileSync("dist/sw.js", "utf8");
const INDEX = readFileSync("dist/index.html", "utf8");
if (!/const VERSION = "[^"]+"/.test(SW)) {
  console.log("\n  ✗ dist/sw.js no tiene su VERSION: ¿se compiló con hacer-sw?\n");
  process.exit(1);
}
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".glb": "model/gltf-binary",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
};
const servidor = createServer((req, res) => {
  const pedido = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (pedido === "/sw.js") {
    res.setHeader("content-type", "text/javascript");
    res.setHeader("cache-control", "no-cache");
    res.end(
      SW.replace(
        /const VERSION = "([^"]+)"/,
        (_m, v) => `const VERSION = "${v}-v${version}"`,
      ),
    );
    return;
  }
  const camino = join("dist", normalize(pedido).replace(/^(\.\.[/\\])+/, ""));
  const esFichero = existsSync(camino) && statSync(camino).isFile();
  if (!esFichero || pedido === "/" || pedido.endsWith("/index.html")) {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.setHeader("cache-control", "no-cache");
    res.end(INDEX.replace("<head>", `<head><!-- publicada:${version} -->`));
    return;
  }
  res.setHeader("content-type", TIPOS[extname(camino)] ?? "application/octet-stream");
  createReadStream(camino).pipe(res);
});
await new Promise((listo) => servidor.listen(PUERTO, "127.0.0.1", listo));
const BASE = `http://127.0.0.1:${PUERTO}`;

const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args:
    process.env.OGA_GPU === "1"
      ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
      : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle) =>
  resultados.push({ nombre, ok: !!ok, detalle });

const CASOS = [
  { nombre: "una versión nueva", tel: "Pixel 7 landscape", antes: 1, despues: 0 },
  { nombre: "dos seguidas", tel: "Pixel 7 landscape", antes: 2, despues: 0 },
  {
    nombre: "dos seguidas, la segunda con el botón ya puesto",
    tel: "iPhone 14 landscape",
    antes: 1,
    despues: 1,
  },
];

try {
  for (const caso of CASOS) await probar(caso);
} finally {
  await navegador.close();
  servidor.close();
}

const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length}\n`);
for (const r of resultados)
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}${r.detalle ? ` — ${r.detalle}` : ""}`);
console.log("");
process.exit(bien === resultados.length ? 0 : 1);

async function probar(caso) {
  version = 1;
  const ctx = await navegador.newContext({
    ...devices[caso.tel],
    hasTouch: true,
    isMobile: true,
    locale: "es-PY",
  });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.addInitScript(() =>
    localStorage.setItem("oga-veve:teclas-vistas", "1"),
  );
  const et = (s) => `${caso.nombre}: ${s}`;
  try {
    // Volando, que es cuando se toca: con el juego pidiendo piezas por detrás.
    await page.goto(
      `${BASE}/?escenario=pettirossi&hora=16&leccion=despegue&tramo=guyrami&avion=jaz-20&meteo=`,
    );
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {
      timeout: 120_000,
    });
    await page.waitForTimeout(6000);

    /*
     * Publicar y que la pestaña se entere: lo mismo que hace ella sola cada
     * dos minutos —ver `avisarDeLaVersionNueva`—, sin esperar dos minutos.
     */
    const publicar = async () => {
      version++;
      await page.evaluate(async () => {
        const r = await navigator.serviceWorker.getRegistration();
        await r?.update().catch(() => {});
      });
      await page.waitForFunction(
        async () => {
          const r = await navigator.serviceWorker.getRegistration();
          return !!r?.waiting && !r.installing;
        },
        null,
        { timeout: 60_000, polling: 250 },
      );
      await page.waitForTimeout(800);
    };
    for (let i = 0; i < caso.antes; i++) await publicar();
    await page.waitForSelector(".version-nueva", { timeout: 10_000 });
    for (let i = 0; i < caso.despues; i++) await publicar();

    /*
     * **Y no encima de un mando de pulgar.** Abajo a la derecha caía sobre el
     * tercio de abajo de la palanca de gases —el ralentí—: bajar el gas con
     * prisa podía recargar la página rodando.
     */
    const solapes = await page.evaluate(() => {
      const b = document.querySelector(".version-nueva")?.getBoundingClientRect();
      if (!b) return ["sin botón"];
      const pisa = [];
      for (const sel of [
        ".pad--throttle",
        ".pad--stick",
        ".pad--rudder",
        '[data-hud="brakes-touch"]',
        '[data-hud="throttle-up"]',
        '[data-hud="throttle-down"]',
      ]) {
        const e = document.querySelector(sel);
        if (!e || e.closest("[hidden]")) continue;
        const r = e.getBoundingClientRect();
        if (!r.width) continue;
        if (b.left < r.right && r.left < b.right && b.top < r.bottom && r.top < b.bottom)
          pisa.push(sel);
      }
      return pisa;
    });
    comprobar(
      et("el botón no pisa ningún mando de pulgar"),
      solapes.length === 0,
      solapes.join(", ") || "libre",
    );

    const caja = await page.locator(".version-nueva").boundingBox();
    const recarga = page
      .waitForEvent("load", { timeout: 15_000 })
      .then(() => true, () => false);
    const tocado = Date.now();
    await page.touchscreen.tap(caja.x + caja.width / 2, caja.y + caja.height / 2);
    const recargo = await recarga;
    const tardo = (Date.now() - tocado) / 1000;
    if (recargo) {
      await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {
        timeout: 30_000,
      });
      await page.waitForTimeout(3000);
    }
    const estado = await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      return {
        publicada: Number(
          document.documentElement.innerHTML.match(/publicada:(\d+)/)?.[1] ?? 0,
        ),
        armazones: (await caches.keys()).filter((k) => k.includes("armazon")),
        esperando: !!r?.waiting,
        boton: !!document.querySelector(".version-nueva"),
      };
    });
    const ultima = 1 + caso.antes + caso.despues;
    comprobar(
      et("tocar el botón recarga la página"),
      recargo,
      recargo ? `en ${tardo.toFixed(1)} s` : "quince segundos y nada",
    );
    comprobar(
      et("y abre la última versión, con su trabajador al mando"),
      estado.publicada === ultima &&
        estado.armazones.length === 1 &&
        estado.armazones[0].endsWith(`-v${ultima}`) &&
        !estado.esperando,
      `página ${estado.publicada} de ${ultima} · cachés ${estado.armazones.join(", ")}` +
        (estado.esperando ? " · y otro esperando" : ""),
    );
    comprobar(et("y el botón se va"), !estado.boton, estado.boton ? "sigue ahí" : "");
  } catch (e) {
    comprobar(et("se pudo probar"), false, String(e).slice(0, 200));
  }
  if (errores.length) comprobar(et("sin errores en la página"), false, errores.join(" · "));
  await ctx.close();
}

/**
 * ¿Se puede volar sin internet?
 *
 * «La promesa es que cualquier colegio paraguayo pueda usarlo. En bastantes
 * sitios la conexión es mala o va y viene.» Esta es la comprobación de esa
 * frase, y no se puede hacer de otra manera que así: compilar, servir, entrar
 * con red, **cortar la red de verdad** y volver a entrar.
 *
 * El corte es **apagar el servidor**, y no `context.setOffline`. Se probaron
 * los dos: con `setOffline` la navegación muere en el propio navegador
 * —`ERR_INTERNET_DISCONNECTED`— antes de que el service worker llegue a
 * enterarse, así que no se mide el juego sin red, se mide un navegador
 * amordazado. Con el servidor apagado el navegador sí llama a su service
 * worker, que es exactamente lo que pasa cuando se cae el wifi de un colegio:
 * la máquina está viva y el otro extremo no contesta.
 *
 * ## Por qué dos entradas antes de cortar
 *
 * El service worker se instala durante la primera visita, así que buena parte
 * de lo que esa visita pide ya ha volado antes de que él exista. En la segunda
 * ya manda él y todo lo que pasa por delante se guarda. Por eso la promesa es
 * «a partir de la segunda visita», y por eso el banco entra dos veces antes de
 * cortar: medir otra cosa sería medirse a uno mismo.
 *
 * Uso: `node scripts/verificar-sin-red.mjs [escenario]`
 */
import { execSync } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const ESCENARIO = process.argv[2] ?? "tenerife-norte";
const PUERTO = 5321;

process.stdout.write("\n  compilando…\n");
execSync("npx vite build && node scripts/hacer-sw.mjs", { stdio: "pipe" });

/** Un servidor estático de veinte líneas: `dist/` tal cual, sin nada más. */
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".bin": "application/octet-stream",
  ".glb": "model/gltf-binary",
};
const servidor = createServer((req, res) => {
  const pedido = decodeURIComponent((req.url ?? "/").split("?")[0]);
  const camino = join("dist", normalize(pedido).replace(/^(\.\.[/\\])+/, ""));
  const fichero =
    existsSync(camino) && statSync(camino).isFile() ? camino : "dist/index.html";
  res.setHeader("content-type", TIPOS[extname(fichero)] ?? "application/octet-stream");
  createReadStream(fichero).pipe(res);
});
await new Promise((listo) => servidor.listen(PUERTO, listo));

const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
const contexto = await navegador.newContext({ viewport: { width: 900, height: 560 } });
const page = await contexto.newPage();
const errores = [];
page.on("pageerror", (e) => errores.push(e.message.slice(0, 120)));

const resultados = [];
const comprobar = (nombre, ok, detalle) =>
  resultados.push({ nombre, ok: !!ok, detalle });

const url = `http://localhost:${PUERTO}/?escenario=${ESCENARIO}`;
const entrar = async () => {
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(14000);
};

/**
 * ¿Ha arrancado el juego de verdad? En lo publicado no hay ganchos.
 *
 * Con reintento: al apagar el servidor, alguna petición que iba por el aire se
 * queda a medias y el navegador puede rehacer la navegación, y entonces el
 * `evaluate` se cae con «execution context destroyed». No es un fallo del
 * juego, es el ruido de cortar la red en mitad de una carga.
 */
const arrancado = async () => {
  for (let intento = 0; ; intento++) {
    try {
      return await mirarLaPagina();
    } catch (fallo) {
      if (intento >= 2) throw fallo;
      await page.waitForTimeout(3000);
    }
  }
};

const mirarLaPagina = () =>
  page.evaluate(() => {
    const insignia = document.querySelector('[data-hud="badge"]');
    const lienzo = document.querySelector("canvas");
    return {
      insignia: insignia?.textContent?.trim() ?? "",
      pintando: !!lienzo && lienzo.width > 100 && lienzo.height > 100,
      alt: document.querySelector('[data-hud="altitude"]')?.textContent ?? "",
      direccion: location.href,
    };
  });

// ── Primera visita: aquí es donde se instala el service worker ───────────
await entrar();
const controla = await page.evaluate(
  () => !!navigator.serviceWorker.controller,
);
comprobar(
  "el service worker se instala en la primera visita",
  controla,
  controla ? "y ya manda él" : "no llegó a tomar el control",
);

// ── Segunda visita, todavía con red: ahora todo pasa por él ──────────────
await entrar();
const guardado = await page.evaluate(async () => {
  const nombres = await caches.keys();
  let piezas = 0;
  const rutas = [];
  for (const n of nombres) {
    const llaves = await (await caches.open(n)).keys();
    piezas += llaves.length;
    for (const k of llaves) rutas.push(k.url);
  }
  return {
    cachés: nombres,
    piezas,
    mundo: {
      relieve: rutas.some((r) => r.endsWith(".bin")),
      avion: rutas.some((r) => r.endsWith(".glb")),
      foto: rutas.some((r) => /\.(jpg|jpeg|png|webp)$/.test(r) && !r.includes("icono")),
    },
  };
});
comprobar(
  "guarda el armazón y lo que se usó",
  guardado.piezas > 12,
  `${guardado.piezas} piezas en ${guardado.cachés.length} cachés`,
);
/*
 * Y que lo guardado sea **el mundo**, no solo el armazón.
 *
 * Un juego que abre sin red y vuela sobre un terreno plano y gris no cumple
 * la promesa: cumple la mitad que se ve en una captura. El relieve, la
 * ortofoto y el modelo del avión son lo que hace que el escenario sea ese
 * escenario.
 */
comprobar(
  "y lo guardado incluye el mundo, no solo el armazón",
  guardado.mundo.relieve && guardado.mundo.avion && guardado.mundo.foto,
  `relieve ${guardado.mundo.relieve ? "sí" : "NO"} · ` +
    `avión ${guardado.mundo.avion ? "sí" : "NO"} · ` +
    `ortofoto ${guardado.mundo.foto ? "sí" : "NO"}`,
);

// ── Y ahora se corta la red ──────────────────────────────────────────────
await new Promise((cerrado) => servidor.close(cerrado));
errores.length = 0;
let abrio = true;
try {
  await entrar();
} catch (fallo) {
  abrio = false;
  errores.push(String(fallo).split("\n")[0].slice(0, 100));
}
comprobar(
  "la página llega a cargarse con el servidor apagado",
  abrio,
  abrio ? "el service worker la sirvió" : "no la sirvió nadie",
);
const sinRed = await arrancado();
comprobar(
  "sin red, el juego abre igual",
  sinRed.pintando && sinRed.insignia.length > 3,
  `insignia «${sinRed.insignia}» · lienzo ${sinRed.pintando ? "pintando" : "en blanco"}`,
);
comprobar(
  "y el escenario está entero, no el mundo de repuesto",
  sinRed.insignia.toLowerCase().includes(ESCENARIO.split("-")[0]),
  `dice «${sinRed.insignia}»`,
);
await page.screenshot({ path: `${process.env.SALIDA ?? "/tmp"}/sin-red.png` });
comprobar(
  "sin errores en la consola",
  errores.length === 0,
  errores.length ? errores.slice(0, 2).join(" · ") : "ninguno",
);

// ── Y la promesa de que se puede instalar ────────────────────────────────
const manifiesto = await page.evaluate(async () => {
  const enlace = document.querySelector('link[rel="manifest"]');
  if (!enlace) return null;
  const res = await fetch(enlace.href);
  return res.ok ? await res.json() : null;
});
comprobar(
  "el manifiesto también está sin red",
  manifiesto !== null &&
    manifiesto.icons?.length >= 3 &&
    manifiesto.display === "standalone",
  manifiesto
    ? `«${manifiesto.short_name}» · ${manifiesto.icons.length} iconos · ${manifiesto.display}`
    : "no se pudo leer",
);

console.log(`\n  sin red · ${ESCENARIO}\n`);
for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
}
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones\n`);

await navegador.close();
process.exit(bien === resultados.length ? 0 : 1);

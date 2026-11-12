/**
 * **El juego en el Firefox 98 de una pizarra de aula, el de verdad.**
 *
 * Hay pizarras digitales con un Android 8 que ya no se actualiza y su Firefox
 * 98, de 2022. Lo que ese navegador no entiende —`:has()`, las unidades de
 * contenedor, `dvh`, `DecompressionStream`…— no se ve en el portátil donde se
 * programa, así que `src/navegador-viejo.test.ts` lo vigila en el código. Esto
 * es la otra mitad: abrir el juego construido en ese navegador y mirar.
 *
 * Sin Playwright ni geckodriver: el Firefox 98 se maneja por Marionette, su
 * protocolo propio, que es «largo:json» por un socket. Va sin ventana y con la
 * tarjeta gráfica de verdad (WebGL 2 con la Intel, medido).
 *
 * En tres tamaños —1280×600, lo que queda a la vista en las pizarras medidas;
 * 960×540, y 1366×768, el de un Chromebook duplicado—: la portada, el hangar,
 * la carta de «¿A dónde vas?» con la ficha de un campo, y un despegue en
 * Tenerife Norte. Falla si la página da un error, si un botón queda fuera de
 * la pantalla, si la carta sale deformada —su lienzo se mide con unidades de
 * contenedor— o si el sello de la ficha se queda sin lado. Que el relieve se
 * descomprima sin `DecompressionStream` lo mira `navegador-viejo.test.ts`.
 *
 * Primero `npm run build`. El Firefox 98 se baja solo a `.firefox-98/` (no va
 * al repositorio) la primera vez.
 *
 * Uso: `node scripts/verificar-firefox-98.mjs [dist]`, con `OGA_FOTOS=<dir>`
 * para las capturas y `OGA_PUERTO` para el servidor.
 */
import { createServer } from "node:http";
import { connect } from "node:net";
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const DIST = resolve(process.argv[2] ?? "dist");
const FOTOS = process.env.OGA_FOTOS ?? "";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5298);
const MARIONETTE = PUERTO + 23000;
const TAMANOS = [
  [1280, 600],
  [960, 540],
  [1366, 768],
];
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
if (!existsSync(join(DIST, "index.html"))) {
  console.log(`No hay juego construido en ${DIST}: primero \`npm run build\`.`);
  process.exit(1);
}

// ── El navegador: el de la versión 98, bajado una vez ─────────────────────
const CARPETA = resolve(".firefox-98");
const FIREFOX = join(CARPETA, "firefox", "firefox");
if (!existsSync(FIREFOX)) {
  console.log("Bajando Firefox 98 a .firefox-98/ …");
  mkdirSync(CARPETA, { recursive: true });
  const tar = join(CARPETA, "firefox-98.0.tar.bz2");
  execFileSync("curl", ["-sSfL", "-o", tar, "https://archive.mozilla.org/pub/firefox/releases/98.0/linux-x86_64/es-ES/firefox-98.0.tar.bz2"], { stdio: "inherit" });
  execFileSync("tar", ["xjf", tar, "-C", CARPETA], { stdio: "inherit" });
  rmSync(tar);
}

// ── El servidor: el `dist/` tal cual, con un chivato de errores ──────────
const TIPOS = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".woff2": "font/woff2", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".jpg": "image/jpeg", ".glb": "model/gltf-binary", ".opus": "audio/ogg", ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg", ".bin": "application/octet-stream",
};
// Va el primero del <head>: lo que falle al cargar los módulos también se apunta.
const CHIVATO = `<script>window.__errores=[];addEventListener('error',function(e){__errores.push((e.message||'no carga: '+(e.target&&(e.target.src||e.target.href)))+' '+(e.filename||'')+':'+(e.lineno||''))},true);addEventListener('unhandledrejection',function(e){__errores.push('promesa: '+(e.reason&&(e.reason.message||e.reason)))});</script>`;
const servidor = createServer((pide, responde) => {
  let ruta = decodeURIComponent(new URL(pide.url, "http://x").pathname);
  if (ruta.endsWith("/")) ruta += "index.html";
  const fichero = join(DIST, ruta);
  // Sin trabajador de servicio: entre una tirada y otra serviría lo de antes.
  if (ruta === "/sw.js" || !fichero.startsWith(DIST) || !existsSync(fichero) || statSync(fichero).isDirectory()) {
    responde.writeHead(404);
    responde.end();
    return;
  }
  let cuerpo = readFileSync(fichero);
  if (ruta.endsWith("index.html")) cuerpo = Buffer.from(cuerpo.toString().replace("<head>", `<head>${CHIVATO}`));
  responde.writeHead(200, { "content-type": TIPOS[extname(fichero)] ?? "application/octet-stream" });
  responde.end(cuerpo);
});
await new Promise((r) => servidor.listen(PUERTO, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${PUERTO}`;

const perfil = mkdtempSync(join(tmpdir(), "oga-ff98-"));
writeFileSync(
  join(perfil, "user.js"),
  [
    `user_pref("marionette.port", ${MARIONETTE});`,
    `user_pref("browser.shell.checkDefaultBrowser", false);`,
    `user_pref("datareporting.policy.dataSubmissionEnabled", false);`,
    `user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);`,
    `user_pref("browser.startup.homepage_override.mstone", "ignore");`,
    `user_pref("app.update.disabledForTesting", true);`,
    `user_pref("browser.aboutwelcome.enabled", false);`,
    `user_pref("media.autoplay.default", 0);`,
    `user_pref("webgl.force-enabled", true);`,
    `user_pref("intl.accept_languages", "es-PY, es");`,
  ].join("\n"),
);
const firefox = spawn(FIREFOX, ["--headless", "--marionette", "--no-remote", "--profile", perfil, "about:blank"], {
  env: { ...process.env, MOZ_HEADLESS: "1" },
  stdio: "ignore",
});

// ── Marionette: «largo:json» en los dos sentidos ──────────────────────────
let socket = null;
for (let i = 0; i < 60 && !socket; i++) {
  await new Promise((r) => setTimeout(r, 500));
  socket = await new Promise((r) => {
    const s = connect(MARIONETTE, "127.0.0.1", () => r(s));
    s.on("error", () => r(null));
  });
}
if (!socket) {
  console.log("Firefox 98 no abre Marionette.");
  firefox.kill();
  servidor.close();
  process.exit(1);
}
let llegado = Buffer.alloc(0);
const esperando = new Map();
let saludar;
const saludo = new Promise((r) => (saludar = r));
socket.on("data", (trozo) => {
  llegado = Buffer.concat([llegado, trozo]);
  for (;;) {
    const dos = llegado.indexOf(":");
    if (dos < 0) return;
    const largo = Number(llegado.subarray(0, dos).toString());
    if (llegado.length < dos + 1 + largo) return;
    const mensaje = JSON.parse(llegado.subarray(dos + 1, dos + 1 + largo).toString("utf8"));
    llegado = llegado.subarray(dos + 1 + largo);
    if (!Array.isArray(mensaje)) {
      saludar();
      continue;
    }
    const [, id, error, resultado] = mensaje;
    esperando.get(id)?.({ error, resultado });
    esperando.delete(id);
  }
});
await saludo;
let ultimo = 0;
async function orden(nombre, parametros = {}) {
  const texto = JSON.stringify([0, ++ultimo, nombre, parametros]);
  socket.write(`${Buffer.byteLength(texto)}:${texto}`);
  const { error, resultado } = await new Promise((r) => esperando.set(ultimo, r));
  if (error) throw new Error(`${nombre}: ${JSON.stringify(error).slice(0, 300)}`);
  return resultado;
}
const js = async (script) => (await orden("WebDriver:ExecuteScript", { script, args: [] })).value;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
async function esperar(condicion, ms) {
  for (const fin = Date.now() + ms; Date.now() < fin; await pausa(300))
    if (await js(`return !!(${condicion})`).catch(() => false)) return true;
  return false;
}
async function foto(nombre) {
  if (!FOTOS) return;
  const { value } = await orden("WebDriver:TakeScreenshot", { full: false });
  writeFileSync(join(FOTOS, `${nombre}.png`), Buffer.from(value, "base64"));
}

const resultados = [];
function comprobar(nombre, ok, detalle = "") {
  resultados.push(!!ok);
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? `  —  ${detalle}` : ""}`);
}

/** Lo que se toca y queda fuera de la pantalla, y los errores apuntados. Corre en la página. */
const MIRAR = `
  var fuera = [];
  document.querySelectorAll('button, [role=button], a[href], input, select').forEach(function (b) {
    if (b.closest('[hidden]')) return;
    var r = b.getBoundingClientRect(), cs = getComputedStyle(b);
    if (!r.width || !r.height || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return;
    if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1)
      fuera.push(((b.getAttribute('aria-label') || b.textContent || b.className) + '').replace(/\\s+/g, ' ').trim().slice(0, 24));
  });
  return { fuera: fuera, errores: (window.__errores || []).slice(0, 6) };`;

try {
  await orden("WebDriver:NewSession", { capabilities: { alwaysMatch: { acceptInsecureCerts: true } } });
  const version = await js("return navigator.userAgent");
  console.log(`\n${version}`);
  comprobar("es Firefox 98", /Firefox\/98\./.test(version), version);

  for (const [ancho, alto] of TAMANOS) {
    // La ventana lleva bordes: se ajusta hasta que lo que se ve mida lo pedido.
    await orden("WebDriver:SetWindowRect", { width: ancho, height: alto });
    const [w, h] = await js("return [innerWidth, innerHeight]");
    await orden("WebDriver:SetWindowRect", { width: 2 * ancho - w, height: 2 * alto - h });
    const t = `${ancho}×${alto}`;
    console.log(`\n${t}`);

    await orden("WebDriver:Navigate", { url: `${BASE}/` });
    await js(`localStorage.clear();
      localStorage.setItem("oga-veve:cuaderno", JSON.stringify({ despegues: 1, segundos: 600 }));
      localStorage.setItem("oga-veve:escenario", "tenerife-norte");
      localStorage.setItem("oga-veve:teclas-vistas", "1");`);
    await orden("WebDriver:Navigate", { url: `${BASE}/` });
    const portada = await esperar("document.querySelector('.piloto__boton')", 60000);
    await pausa(1200);
    await foto(`${ancho}x${alto}-1-portada`);
    let m = await js(MIRAR);
    comprobar(`${t} portada`, portada && !m.fuera.length && !m.errores.length, [...m.fuera, ...m.errores].join(" · "));

    await js("document.querySelector('.piloto__boton').click()");
    const hangar = await esperar("document.querySelector('.ficha--sitio')", 30000);
    await pausa(1200);
    await foto(`${ancho}x${alto}-2-hangar`);
    m = await js(MIRAR);
    comprobar(`${t} hangar`, hangar && !m.fuera.length && !m.errores.length, [...m.fuera, ...m.errores].join(" · "));

    // La carta se mide contra su caja con `cqw` y `cqh`: sin reserva, el lienzo
    // se estiraba a la caja entera y la carta salía deformada.
    await js("document.querySelector('.paso[data-pantalla=\"adonde\"]').click()");
    const carta = await esperar("document.querySelector('.pais__lienzo')", 20000);
    await pausa(1200);
    await foto(`${ancho}x${alto}-3-carta`);
    const forma = await js(`var l = document.querySelector('.pais__lienzo').getBoundingClientRect();
      var p = parseFloat(getComputedStyle(document.querySelector('.pais')).getPropertyValue('--proporcion')) || 1;
      return { ancho: l.width, alto: l.height, proporcion: p };`);
    const torcida = Math.abs(forma.ancho / forma.alto / forma.proporcion - 1);
    m = await js(MIRAR);
    comprobar(
      `${t} carta sin deformar`,
      carta && torcida < 0.03 && !m.fuera.length && !m.errores.length,
      `${Math.round(forma.ancho)}×${Math.round(forma.alto)} para ${forma.proporcion.toFixed(2)} ${[...m.fuera, ...m.errores].join(" · ")}`,
    );
    await js("var c = document.querySelector('.pais__campo[data-ficha]'); c && c.click()");
    await pausa(1000);
    await foto(`${ancho}x${alto}-4-ficha`);
    const ficha = await js(`var f = document.querySelector('.ficha-carta:not([hidden])');
      if (!f) return null;
      var s = f.querySelector('.ficha-carta__sello');
      if (!s) return null;
      var r = s.getBoundingClientRect();
      return { lado: getComputedStyle(f).getPropertyValue('--lado').trim(), ancho: r.width, alto: r.height };`);
    comprobar(`${t} ficha del campo, con su sello`, ficha && ficha.ancho > 20 && ficha.alto > 20, JSON.stringify(ficha));

    await orden("WebDriver:Navigate", { url: `${BASE}/?escenario=tenerife-norte&hora=16&leccion=despegue` });
    const vuelo = await esperar("document.querySelector('.hud .tablero')", 60000);
    await pausa(9000);
    await foto(`${ancho}x${alto}-5-vuelo`);
    m = await js(MIRAR);
    comprobar(`${t} vuelo`, vuelo && !m.fuera.length && !m.errores.length, [...m.fuera, ...m.errores].join(" · "));
  }
} catch (e) {
  comprobar("el banco termina", false, e.message);
} finally {
  await orden("Marionette:Quit", {}).catch(() => {});
  socket.destroy();
  await pausa(1000);
  firefox.kill();
  servidor.close();
  rmSync(perfil, { recursive: true, force: true });
}

const bien = resultados.filter(Boolean).length;
console.log(`\n${bien} de ${resultados.length}`);
process.exit(bien === resultados.length ? 0 : 1);

/**
 * **El niño que se pierde mar adentro sale de ahí con un toque**, visto en un
 * vuelo de verdad: la flecha de casa late, el aviso sale una vez y tocar la
 * tarjeta hace virar el avión hacia el campo con el automático (`HDG SEL`).
 *
 * Coloca el avión a nueve kilómetros al norte de Los Rodeos, sobre el mar y
 * con el morro hacia fuera, y lo prueba con los tres mandos: el ratón, la J y
 * el dedo. Con `OGA_FOTOS=<carpeta>` guarda las capturas, perdido y virando, y
 * dice con qué tarjeta se dibujaron. Ver `flight/perdido.ts`.
 *
 * Uso: `OGA_PUERTO=5678 [OGA_GPU=1] [OGA_FOTOS=…] node scripts/ver-perdido.mjs`
 */

import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = Number(process.env.OGA_PUERTO ?? 5611);
const FOTOS = process.env.OGA_FOTOS ?? null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });

const server = await createServer({ root: process.cwd(), server: { port: PUERTO, hmr: false }, logLevel: "warn" });
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args:
    process.env.OGA_GPU === "1"
      ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
      : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok: !!ok, detalle });
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? `  —  ${detalle}` : ""}`);
};
const grados = (r) => Math.round((((r * 180) / Math.PI) % 360 + 360) % 360);

/** Una prueba entera con un mando: `raton`, `tecla` o `dedo`. */
async function probar(mando, tramo) {
  console.log(`\n${mando} · ${tramo}`);
  const dedo = mando === "dedo";
  const contexto = await navegador.newContext({
    viewport: dedo ? { width: 1180, height: 820 } : { width: 1280, height: 800 },
    locale: "es-PY",
    hasTouch: dedo,
  });
  const page = await contexto.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(`${BASE}/?escenario=tenerife-norte&avion=jaz-20&tramo=${tramo}&hora=12&meteo=&viento=000/0`);
  await page.waitForFunction(() => globalThis.__oga?.estado?.(), null, { timeout: 120_000 });
  await page.waitForTimeout(4000);
  if (FOTOS) {
    const tarjeta = await page.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl");
      const i = gl?.getExtension("WEBGL_debug_renderer_info");
      return i ? gl.getParameter(i.UNMASKED_RENDERER_WEBGL) : "?";
    });
    console.log(`  tarjeta: ${tarjeta}`);
  }
  // Nueve kilómetros al norte (el norte es −z), a seiscientos metros y de espaldas al campo.
  await page.evaluate(() => {
    const o = globalThis.__oga;
    const r = o.escenario().runway;
    o.colocar(r.x, 600, r.z - 9000, 60, 0);
    o.controles().throttle = 0.75;
  });
  await page.waitForTimeout(2500);
  const antes = await page.evaluate(() => ({
    perdido: globalThis.__oga.perdido(),
    late: document.querySelector('[data-hud="home"]')?.classList.contains("casa--perdida") ?? false,
    etiqueta: document.querySelector('[data-hud="home"]')?.getAttribute("aria-label") ?? "",
    aguja: globalThis.__oga.aguja(),
  }));
  comprobar(`${mando}: mar adentro y de espaldas, se ha perdido`, antes.perdido.perdido,
    `aguja a ${Math.round(antes.aguja?.metros ?? 0)} m, ${grados(antes.aguja?.relativo ?? 0)}° del morro`);
  comprobar(`${mando}: la flecha de casa late`, antes.late);
  comprobar(`${mando}: la tarjeta se llama «Volver al campo»`, antes.etiqueta === "Volver al campo", antes.etiqueta);
  if (FOTOS) await page.screenshot({ path: `${FOTOS}/perdido-${mando}-${tramo}.png` });

  // El toque, con el mando que toca.
  const caja = await page.locator('[data-hud="home"]').boundingBox();
  if (mando === "raton") await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
  else if (mando === "tecla") await page.keyboard.press("KeyJ");
  else await page.touchscreen.tap(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.waitForTimeout(600);
  const tocado = await page.evaluate(() => ({
    perdido: globalThis.__oga.perdido(),
    puesto: globalThis.__oga.pilotoAutomatico(),
    late: document.querySelector('[data-hud="home"]')?.classList.contains("casa--perdida") ?? false,
    rumbo: globalThis.__oga.estado().heading,
    aguja: globalThis.__oga.aguja(),
  }));
  /*
   * A donde señala la aguja, que con plan de vuelo es el punto siguiente del
   * plan hacia el destino y no la pista de salida: es la flecha que se toca.
   */
  const haciaLaAguja = tocado.rumbo + (tocado.aguja?.relativo ?? 0);
  comprobar(`${mando}: el toque pone el automático con el rumbo hacia la aguja (HDG SEL)`,
    tocado.puesto && tocado.perdido.modoLateral === "HDG SEL" && tocado.perdido.rumbo !== null &&
      Math.abs(grados(tocado.perdido.rumbo) - grados(haciaLaAguja)) <= 3,
    `${tocado.perdido.modoLateral}, ventanilla ${grados(tocado.perdido.rumbo ?? 0)}°, aguja a ${grados(haciaLaAguja)}° (${tocado.aguja?.por ?? "?"})`);
  comprobar(`${mando}: tocada, la flecha deja de llamar`, !tocado.late);

  // Y vira: a tres grados por segundo, media vuelta en un minuto. Se mira a los veinte segundos y al final.
  const traza = async (t) => {
    if (process.env.OGA_TRAZA !== "1") return;
    const v = await page.evaluate(() => {
      const o = globalThis.__oga;
      const s = o.estado();
      return { rumbo: s.heading, alabeo: o.alabeo(), v: s.airspeed, y: s.position.y, gas: o.controles().throttle, puesto: o.pilotoAutomatico() };
    });
    console.log(`    t=${t}s rumbo ${grados(v.rumbo)}° alabeo ${Math.round((v.alabeo * 180) / Math.PI)}° v ${Math.round(v.v)} m/s alt ${Math.round(v.y)} m gas ${v.gas.toFixed(2)} ap ${v.puesto}`);
  };
  for (let t = 0; t < 20; t += 5) {
    await traza(t);
    await page.waitForTimeout(5_000);
  }
  const virando = await page.evaluate(() => ({ rumbo: globalThis.__oga.estado().heading, alabeo: globalThis.__oga.alabeo() }));
  comprobar(`${mando}: a los veinte segundos el avión ha virado`,
    Math.abs(grados(virando.rumbo) - grados(tocado.rumbo)) >= 30,
    `de ${grados(tocado.rumbo)}° a ${grados(virando.rumbo)}°, alabeo ${Math.round((virando.alabeo * 180) / Math.PI)}°`);
  if (FOTOS) await page.screenshot({ path: `${FOTOS}/virando-${mando}-${tramo}.png` });
  /*
   * Y se espera a que acabe el viraje, con tope: en Guyrami el automático
   * vira a unos dos grados por segundo, y media vuelta pasa del minuto.
   */
  for (let t = 20; t < 150; t += 5) {
    if (t % 10 === 0) await traza(t);
    if (!(await page.evaluate(() => globalThis.__oga.perdido().virando))) break;
    await page.waitForTimeout(5_000);
  }
  const vuelto = await page.evaluate(() => ({
    aguja: globalThis.__oga.aguja(),
    perdido: globalThis.__oga.perdido(),
    etiqueta: document.querySelector('[data-hud="home"]')?.getAttribute("aria-label") ?? "",
  }));
  comprobar(`${mando}: al acabar el viraje la aguja queda delante`, Math.abs(vuelto.aguja?.relativo ?? Math.PI) < (15 * Math.PI) / 180,
    `${grados(vuelto.aguja?.relativo ?? 0)}° del morro`);
  comprobar(`${mando}: y la tarjeta vuelve a ser la de cambiar de destino`,
    !vuelto.perdido.perdido && !vuelto.perdido.virando && vuelto.etiqueta === "Cambiar de destino", vuelto.etiqueta);
  comprobar(`${mando}: sin errores en la página`, errores.length === 0, errores.join(" | "));
  await contexto.close();
}

try {
  const solo = process.env.OGA_SOLO;
  if (!solo || solo === "raton") await probar("raton", "guyrami");
  if (!solo || solo === "tecla") await probar("tecla", "taguato");
  if (!solo || solo === "dedo") await probar("dedo", "guyrami");
} finally {
  await navegador.close();
  await server.close();
}
const malos = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - malos.length} de ${resultados.length}`);
process.exit(malos.length ? 1 : 0);

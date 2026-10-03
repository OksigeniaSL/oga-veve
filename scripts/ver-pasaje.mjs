/**
 * **La cabina de pasaje y lo que se ve desde ella**, con la tarjeta de verdad.
 *
 * Saca las capturas con las que se juzga la vista de pasajero: la pared de la
 * ventanilla con sus vecinas, lo que señala la comandante desde la ventanilla
 * y desde la vista de detrás, y —con `OGA_NOCHE=1`— la cabina de noche. No
 * comprueba nada: para eso están `verificar-mirada.mjs` y
 * `verificar-ventanilla.mjs`. Esto es para mirar, y por eso va con la GPU.
 *
 * Se pone el avión en crucero con el automático, rumbo al suroeste por el
 * norte de Tenerife, con el Teide `OGA_TEIDE` grados a la derecha del morro
 * (por defecto setenta: ya en la ventanilla). Y se espera a la comandante.
 *
 *   node scripts/ver-pasaje.mjs carpeta [avión] [hora]
 *
 * `OGA_GPU=0` con SwiftShader: no vale para mirar.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const FOTOS = process.argv[2] ?? "capturas-pasaje";
const AVION = process.argv[3] ?? "jaz-120";
const HORA = process.argv[4] ?? "12";
const TEIDE_A = Number(process.env.OGA_TEIDE ?? 70);
const CON_GPU = process.env.OGA_GPU !== "0";
const PUERTO = 5383;
mkdirSync(FOTOS, { recursive: true });

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "warn",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

try {
  const page = await navegador.newPage({
    viewport: { width: 1280, height: 720 },
    locale: "es-PY",
  });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(
    `${BASE}/?escenario=tenerife-norte&hora=${HORA}&avion=${AVION}&tramo=guyrami` +
      `&destino=gran-canaria&teselas=0&meteo=&viento=000/00`,
  );
  await page.bringToFront();
  await page.waitForFunction(() => !!globalThis.__oga?.estado?.(), null, { timeout: 120_000 });
  await page.waitForTimeout(6000);
  const tarjeta = await page.evaluate(() => {
    const gl = globalThis.__oga.pintor().getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre";
  });
  console.log(`  ${tarjeta}`);
  await page.keyboard.press("i");
  await page.waitForTimeout(600);

  // En crucero, con el Teide a `TEIDE_A` grados a la derecha del morro y a
  // treinta kilómetros, y el automático puesto.
  const teide = await page.evaluate(async (a) => {
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    const { trueFromIndicated } = await import("/src/flight/atmosphere.ts");
    const espera = (ms) => new Promise((res) => setTimeout(res, ms));
    const t = (j.hitosDelVuelo ?? []).find((h) => /teide/i.test(h.nombre));
    if (!t) return null;
    const alto = 4500;
    const rumbo = (225 * Math.PI) / 180;
    // El Teide, a `a` grados a la derecha del rumbo: el avión se pone a treinta
    // kilómetros de él en la dirección contraria.
    const haciaElTeide = rumbo + (a * Math.PI) / 180;
    const x = t.x - Math.sin(haciaElTeide) * 30_000;
    const z = t.z + Math.cos(haciaElTeide) * 30_000;
    const tas = trueFromIndicated(270 / 1.94384, alto, j.flight.aireDelDia());
    o.colocar(x, alto, z, tas, rumbo);
    const c = o.controles();
    c.throttle = j.flight.gasPara(tas);
    c.trim = 0;
    if ("ventanillaAlt" in j) j.ventanillaAlt = Math.round(alto / 0.3048 / 100) * 100;
    await espera(300);
    o.pedirTren(false);
    o.pedirFlaps(0);
    await espera(300);
    o.pilotoAutomatico(true);
    return { x: t.x, y: t.ele, z: t.z };
  }, TEIDE_A);
  if (!teide) console.log("  (el escenario no tiene Teide)");

  for (const vista of ["pasaje-derecha", "pasaje-izquierda"]) {
    await page.evaluate((v) => globalThis.__oga.ponerVista(v), vista);
    await pausa(2500);
    await page.screenshot({ path: `${FOTOS}/${AVION}-${vista}.png` });
  }

  // Y lo que señala la comandante, desde detrás: se espera a que lo diga.
  await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
  const hasta = Date.now() + 150_000;
  let senalado = null;
  while (Date.now() < hasta && !senalado) {
    await pausa(500);
    senalado = (await page.evaluate(() => globalThis.__oga.mirada())).senalado;
  }
  console.log(`  señalado: ${senalado ? `${senalado.nombre} (${senalado.lado})` : "nada"}`);
  if (senalado) {
    await page.screenshot({ path: `${FOTOS}/${AVION}-detras-al-senalar.png` });
    await pausa(3000);
    const donde = await page.evaluate(
      ({ x, y, z }) => globalThis.__oga.enElCuadro(x, y, z),
      senalado.punto,
    );
    console.log(
      `  a los tres segundos, desde detrás: (${donde.x.toFixed(2)}, ${donde.y.toFixed(2)})` +
        `${donde.delante ? "" : " detrás"}`,
    );
    await page.screenshot({ path: `${FOTOS}/${AVION}-detras-a-los-3-s.png` });
    await page.evaluate((v) => globalThis.__oga.ponerVista(v), `pasaje-${senalado.lado}`);
    await pausa(2500);
    await page.screenshot({ path: `${FOTOS}/${AVION}-pasaje-al-senalar.png` });
  }
  if (errores.length) console.log(`  errores: ${errores.join(" · ")}`);
  await page.close();
} finally {
  await navegador.close();
  await server.close();
}

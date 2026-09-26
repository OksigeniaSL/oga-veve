/**
 * El mar y el cielo de Canarias: fotos de un barco y de un avión que se
 * cruza, y lo que cuestan.
 *
 * Lo que dicen las pruebas de unidad —que los barcos van por el mar, que los
 * turbohélices se cruzan separados y por sus rutas— no dice **cómo se ven**,
 * y eso es lo que se pidió: «que de vez en cuando se vea un ferri por ahí» y
 * «algún avión de los de aquí cruzando delante». Así que se vuela, con la
 * tarjeta de verdad, y se fotografía:
 *
 * 1. El catamarán de Agaete en medio del canal, con su estela, desde un
 *    avión que le viene por la aleta.
 * 2. Un turbohélice que viene de frente por la ruta de Los Rodeos, en varios
 *    momentos de su pasada.
 * 3. Y el tiempo de cuadro con los barcos y los aviones puestos y quitados, en
 *    esta máquina y con la CPU estrangulada cuatro veces —la tablet del
 *    aula—, que es la regla de la casa: antes de añadir, se mide.
 *
 * Y de propina, que en Asunción no sale nada de esto.
 *
 * Uso: `OGA_FOTOS=carpeta node scripts/ver-mar-y-cielo.mjs`
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = 5297;
const FOTOS = process.env.OGA_FOTOS ?? "fotos-mar-y-cielo";
mkdirSync(FOTOS, { recursive: true });

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: [
    "--headless=new",
    "--enable-gpu",
    "--ignore-gpu-blocklist",
    "--use-angle=gl",
    // Sin techo de sesenta, para medir lo que cuesta y no el monitor.
    "--disable-gpu-vsync",
    "--disable-frame-rate-limit",
  ],
});
const errores = [];
let fallos = 0;
const mal = (m) => {
  fallos++;
  console.log(`  ✗ ${m}`);
};

/** De grados de latitud y longitud a metros del mundo de `origen`. */
function dondeCae(origen, sitio) {
  const R = 6371008;
  const rad = (g) => (g * Math.PI) / 180;
  const k = Math.cos(rad((origen.lat + sitio.lat) / 2));
  return {
    x: R * rad(sitio.lon - origen.lon) * k,
    z: -R * rad(sitio.lat - origen.lat),
  };
}

/** El rumbo de compás de un punto a otro, en radianes. */
const rumboHacia = (dx, dz) => Math.atan2(dx, -dz);

async function abrir(escenario, destino) {
  const page = await navegador.newPage({
    viewport: { width: 1280, height: 720 },
    locale: "es-PY",
  });
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.addInitScript(() =>
    localStorage.setItem("oga-veve:teclas-vistas", "1"),
  );
  await page.goto(
    `${BASE}/?escenario=${escenario}&hora=16&leccion=vuelta&tramo=guyrami&avion=jaz-20` +
      (destino ? `&destino=${destino}` : ""),
  );
  await page.waitForFunction(() => !!globalThis.__oga?.estado, null, {
    timeout: 120000,
  });
  await page.waitForTimeout(12000);
  return page;
}

/** Cuánto tarda cada cuadro durante `ms`, en mediana y p95. */
async function medir(page, ms = 4000) {
  return page.evaluate(async (ms) => {
    const tiempos = [];
    await new Promise((listo) => {
      let previo = performance.now();
      const fin = previo + ms;
      const paso = (t) => {
        tiempos.push(t - previo);
        previo = t;
        if (t < fin) requestAnimationFrame(paso);
        else listo();
      };
      requestAnimationFrame(paso);
    });
    tiempos.sort((a, b) => a - b);
    const en = (p) => tiempos[Math.floor(tiempos.length * p)] ?? 0;
    return { mediana: en(0.5), p95: en(0.95), ...globalThis.__oga.coste() };
  }, ms);
}

// ── 1. El barco ───────────────────────────────────────────────────────────

const page = await abrir("gran-canaria", "tenerife-norte");
const hay = await page.evaluate(() => globalThis.__oga.barcos());
if (!hay.hay) mal("en Gran Canaria no hay barcos");

/*
 * Se adelanta el reloj de los barcos hasta que el de Agaete va a toda
 * máquina, y veinte minutos más: así está en medio del canal y no saliendo
 * de puerto.
 */
let barco = null;
for (let i = 0; i < 400; i++) {
  const { lista } = await page.evaluate(() => globalThis.__oga.barcos());
  barco = lista.find((b) => b.id === "agaete-santa-cruz");
  if (barco && barco.nudos >= 27.5) break;
  await page.evaluate(() => globalThis.__oga.adelantarBarcos(60));
  await page.waitForTimeout(40);
}
await page.evaluate(() => globalThis.__oga.adelantarBarcos(1200));
await page.waitForTimeout(200);
barco = (await page.evaluate(() => globalThis.__oga.barcos())).lista.find(
  (b) => b.id === "agaete-santa-cruz",
);
console.log(
  `  catamarán de Agaete: ${barco.nudos} kt, rumbo ${barco.rumbo}°, en ${barco.x}, ${barco.z}`,
);

/**
 * Pone el avión a `lejos` metros del barco, a `altura`, en la dirección
 * `desde` grados respecto a su proa, mirándolo, y saca una foto.
 */
async function fotoDelBarco(nombre, lejos, altura, desde) {
  const b = (await page.evaluate(() => globalThis.__oga.barcos())).lista.find(
    (x) => x.id === "agaete-santa-cruz",
  );
  const r = ((b.rumbo + desde) * Math.PI) / 180;
  const x = b.x + Math.sin(r) * lejos;
  const z = b.z - Math.cos(r) * lejos;
  /*
   * Mirando **al lado** del barco, veintidós grados a su izquierda: la
   * cámara de persecución lleva el avión en el centro, y apuntando justo al
   * barco el avión lo tapa.
   */
  const rumbo = rumboHacia(b.x - x, b.z - z) - (22 * Math.PI) / 180;
  await page.evaluate(
    ([x, y, z, rumbo]) => {
      globalThis.__oga.colocar(x, y, z, 60, rumbo);
      globalThis.__oga.pilotoAutomatico(true);
    },
    [x, altura, z, rumbo],
  );
  await page.waitForTimeout(2500);
  const visto = await page.evaluate(() => globalThis.__oga.barcos().aLaVista);
  await page.screenshot({ path: `${FOTOS}/${nombre}.png` });
  console.log(`  foto ${nombre}.png · ${visto} barcos dibujándose`);
  return visto;
}

if ((await fotoDelBarco("barco-aleta", 3000, 700, 150)) < 1)
  mal("el barco no se dibuja a tres kilómetros");
await fotoDelBarco("barco-lejos", 7000, 1500, 120);
await fotoDelBarco("barco-cerca", 1400, 350, 200);

// ── 2. Lo que cuesta ──────────────────────────────────────────────────────

const cdp = await page.context().newCDPSession(page);
await fotoDelBarco("barco-medida", 2500, 600, 160);
const filas = [];
for (const veces of [1, 4]) {
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: veces });
  for (const con of [true, false, true, false, true, false]) {
    await page.evaluate((si) => globalThis.__oga.vidaDelMar(si), con);
    await page.waitForTimeout(1000);
    filas.push({ veces, con, ...(await medir(page, 5000)) });
  }
}
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
await page.evaluate(() => globalThis.__oga.vidaDelMar(true));
/*
 * Y la mediana de las medianas de cada lado, que una sola ventana de cinco
 * segundos se la lleva cualquier tirón de fondo.
 */
const medianaDe = (xs) => {
  const o = [...xs].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)] ?? 0;
};
const resumen = [];
for (const veces of [1, 4])
  for (const con of [true, false])
    resumen.push({
      veces,
      con,
      ms: medianaDe(
        filas.filter((f) => f.veces === veces && f.con === con).map((f) => f.mediana),
      ),
    });
console.log("\n  tiempo de cuadro, mirando al barco (GPU de verdad, 1280×720):");
for (const r of resumen)
  console.log(
    `    ×${r.veces} ${r.con ? "con barcos " : "sin barcos "} mediana de medianas ${r.ms.toFixed(2)} ms`,
  );
console.log("  cada ventana:");
for (const f of filas)
  console.log(
    `    ×${f.veces} ${f.con ? "con barcos " : "sin barcos "} mediana ${f.mediana.toFixed(2)} ms · p95 ${f.p95.toFixed(2)} ms · ${f.llamadas} dibujos · ${(f.triangulos / 1000).toFixed(1)}k △`,
  );

// ── 3. El turbohélice que se cruza ────────────────────────────────────────

/*
 * Saliendo de Gando hacia Los Rodeos, a treinta y tantos kilómetros y dos
 * mil doscientos metros: donde un vuelo entre las dos islas se cruza con los
 * que vienen de allí bajando, y por debajo, que es donde la cámara los ve.
 * Más cerca de Gando no cabe ninguno: el que baja pasaría por encima de los
 * altos de Telde sin su margen, y el tráfico no lo lanza.
 */
const GANDO = { lat: 27.9319, lon: -15.3866 };
const LOS_RODEOS = { lat: 28.482752, lon: -16.341707 };
const tfn = dondeCae(GANDO, LOS_RODEOS);
const f = 0.3;
const px = tfn.x * f;
const pz = tfn.z * f;
await page.evaluate(
  ([x, z, r]) => {
    globalThis.__oga.colocar(x, 2200, z, 60, r);
    globalThis.__oga.pilotoAutomatico(true);
  },
  [px, pz, rumboHacia(tfn.x, tfn.z)],
);
await page.waitForTimeout(3000);
console.log(`\n  fase para el cruce: ${await page.evaluate(() => globalThis.__oga.fase())}`);
let lanzado = false;
for (let i = 0; i < 10 && !lanzado; i++) {
  lanzado = await page.evaluate(() => globalThis.__oga.lanzarIsleno());
  if (!lanzado) await page.waitForTimeout(1000);
}
if (!lanzado) mal("no se pudo lanzar ningún turbohélice a media travesía");
else {
  let fotos = 0;
  let masCerca = Infinity;
  const fotoHecha = new Set();
  for (let i = 0; i < 280; i++) {
    const { lista } = await page.evaluate(() => globalThis.__oga.islenos());
    const yo = await page.evaluate(() => globalThis.__oga.estado().position);
    const a = lista[0];
    if (!a) break;
    const d = Math.hypot(a.x - yo.x, a.z - yo.z);
    masCerca = Math.min(masCerca, d);
    const toca = [6000, 3500, 2200, 1500].find(
      (m) => d <= m && d > m - 600 && !fotoHecha.has(m),
    );
    if (toca) {
      fotoHecha.add(toca);
      await page.screenshot({ path: `${FOTOS}/avion-${toca}.png` });
      fotos++;
      console.log(
        `  foto avion-${toca}.png · ${a.como} por ${a.ruta} · a ${Math.round(d)} m · ${Math.round(a.y - yo.y)} m de altura de diferencia · ${Math.round(a.nudos)} kt`,
      );
    }
    await page.waitForTimeout(250);
  }
  console.log(`  lo más cerca que pasó en planta: ${Math.round(masCerca)} m`);
  if (!fotos) mal("el turbohélice no se llegó a fotografiar");

}

await page.close();

// ── 4. De cerca, para juzgar la forma ─────────────────────────────────────

/*
 * En el juego se ven a kilómetros; aquí, a metros y en tres vistas, en la
 * misma página que la flota: el turbohélice con sus tres libreas y los cinco
 * barcos con su estela. Ver `ver-mar-y-cielo.html`.
 */
{
  const hoja = await navegador.newPage({ viewport: { width: 1150, height: 1300 } });
  hoja.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await hoja.goto(`${BASE}/scripts/ver-mar-y-cielo.html`);
  await hoja.waitForFunction(() => document.body.dataset.listo === "1", null, {
    timeout: 60000,
  });
  await hoja.screenshot({ path: `${FOTOS}/de-cerca.png`, fullPage: true });
  console.log("\n  foto de-cerca.png · turbohélices y barcos en tres vistas");
  await hoja.close();
}

// ── 5. Y en Asunción, nada ────────────────────────────────────────────────

const py = await abrir("pettirossi", null);
const enPy = await py.evaluate(() => ({
  barcos: globalThis.__oga.barcos().hay,
  islenos: globalThis.__oga.islenos().hay,
}));
console.log(
  `\n  en Asunción: ${enPy.barcos ? "HAY barcos" : "sin barcos"} · ${enPy.islenos ? "HAY turbohélices de las islas" : "sin turbohélices de las islas"}`,
);
if (enPy.barcos || enPy.islenos) mal("en Paraguay aparece el mar de Canarias");
await py.close();

await navegador.close();
await server.close();
for (const e of errores) console.log(`  ERROR: ${e}`);
if (errores.length) fallos++;
console.log(fallos ? `\n  ${fallos} fallos\n` : "\n  ✓ todo en su sitio\n");
process.exit(fallos ? 1 : 0);

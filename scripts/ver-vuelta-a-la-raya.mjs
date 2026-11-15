/**
 * **La vuelta a la raya, jugando** (H12c): se arranca, se rueda un poco por la raya, el
 * avión se queda parado en la hierba al lado y se espera. Tiene que salir la tarjeta del
 * tractor latiendo y la instructora decirlo; un toque en la tarjeta, como un dedo, y el
 * tractor tiene que llegar, engancharse, remolcar el avión hasta la raya y soltarlo. Con
 * capturas de cada paso y el nombre de la tarjeta gráfica con que se dibujaron.
 *
 * Uso: `node scripts/ver-vuelta-a-la-raya.mjs [carpeta] [escenario] [avión] [tramo]`
 *
 * Ver `Game.atenderALaHierba` y `world/vuelta-a-la-raya.ts`.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const CARPETA = process.argv[2] ?? "vuelta-a-la-raya";
const ESCENARIO = process.argv[3] ?? "tenerife-norte";
const AVION = process.argv[4] ?? "jaz-20";
const TRAMO = process.argv[5] ?? "guyrami";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5281);

mkdirSync(CARPETA, { recursive: true });
const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, strictPort: true, hmr: false },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle) => resultados.push({ nombre, ok: !!ok, detalle });

try {
  const page = await navegador.newPage({ viewport: { width: 1280, height: 720 }, hasTouch: true });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(
    `${BASE}/?escenario=${ESCENARIO}&hora=12&leccion=despegue&tramo=${TRAMO}&avion=${AVION}&meteo=&viento=000/00`,
  );
  await page.waitForFunction(() => globalThis.__oga?.estado?.(), null, { timeout: 120000 });
  await page.waitForTimeout(8000);
  const tarjeta = await page.evaluate(() => {
    const gl = globalThis.__oga.pintor().getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre";
  });
  console.log(`\n  ${ESCENARIO} · ${AVION} · ${TRAMO} · ${tarjeta}\n`);

  // ── Arrancar y rodar un poco, para estar en una fase de rodar ──
  const rodando = await page.evaluate(async () => {
    const o = globalThis.__oga;
    const c = o.controles();
    if (!c.engineOn) o.tocarMando("motor");
    const s0 = { ...o.estado().position };
    for (let i = 0; i < 160; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const s = o.estado();
      const movido = Math.hypot(s.position.x - s0.x, s.position.z - s0.z);
      c.brakes = 0;
      c.throttle = s.groundSpeed < 4 ? 0.5 : 0;
      if (movido > 15 && (o.fase() === "rodando" || o.fase() === "arrancando")) break;
    }
    c.throttle = 0;
    return { fase: o.fase(), motor: c.engineOn };
  });
  comprobar("se rueda con el motor en marcha", rodando.motor && /rodando|arrancando/.test(rodando.fase), `fase «${rodando.fase}»`);

  // ── Parado en la hierba, al lado de la raya ──
  const hierba = await page.evaluate(() => {
    const o = globalThis.__oga;
    const h = [40, 60, 80, 110].map((m) => o.hierbaJuntoALaRaya(m)).find((p) => p) ?? null;
    if (!h) return null;
    o.colocar(h.x, o.sueloDeVuelo(h.x, h.z) + o.avion().tren, h.z, 0, h.rumbo);
    o.controles().throttle = 0;
    o.controles().brakes = 1;
    return h;
  });
  comprobar("hay hierba junto a la raya donde pararse", hierba, hierba ? `${hierba.x.toFixed(0)}, ${hierba.z.toFixed(0)}` : "");
  if (!hierba) throw new Error("sin hierba");
  await page.waitForTimeout(3000);
  const antes = await page.evaluate(() => globalThis.__oga.vueltaALaRaya());
  comprobar("a los tres segundos todavía no se ofrece", !antes.ofrecido, JSON.stringify(antes));
  await page.screenshot({ path: `${CARPETA}/1-parado-en-la-hierba.png` });

  // A los ocho segundos, la tarjeta del tractor, pulsable y latiendo.
  const sale = await page
    .waitForFunction(() => globalThis.__oga.vueltaALaRaya().ofrecido, null, { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  if (!sale) {
    const como = await page.evaluate(() => ({
      fase: globalThis.__oga.fase(),
      v: globalThis.__oga.estado().groundSpeed,
      suelo: globalThis.__oga.estado().onGround,
    }));
    comprobar("a los veinte segundos, la tarjeta del tractor", false, JSON.stringify(como));
    throw new Error("sin tarjeta");
  }
  await page.waitForTimeout(600);
  const ofrecida = await page.evaluate(() => {
    const b = document.querySelector('[data-hud="senal"]');
    return {
      visible: !!b && !b.hidden,
      pulsable: !!b?.classList.contains("senal--pulsable"),
      animacion: b ? getComputedStyle(b).animationName : "",
      texto: document.querySelector('[data-hud="senal-texto"]')?.textContent ?? "",
      desactivado: b?.disabled ?? true,
      fase: globalThis.__oga.fase(),
    };
  });
  comprobar(
    "sale la tarjeta del tractor, pulsable y latiendo",
    ofrecida.visible && ofrecida.pulsable && !ofrecida.desactivado && ofrecida.animacion !== "none",
    JSON.stringify(ofrecida),
  );
  await page.screenshot({ path: `${CARPETA}/2-tarjeta-del-tractor.png` });

  // La raya de cuando se toca: después el plan puede rehacerla, o pasar a la de la pista.
  const rayaAlTocar = await page.evaluate(() => globalThis.__oga.laRaya());
  // Un toque en la tarjeta, como un dedo.
  const caja = await page.locator('[data-hud="senal"]').boundingBox();
  if (caja) await page.touchscreen.tap(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.waitForTimeout(800);
  const pedido = await page.evaluate(() => globalThis.__oga.vueltaALaRaya());
  comprobar("el toque llama al tractor", pedido.fase === "llegando", JSON.stringify(pedido));

  // El tractor llega, engancha, remolca y suelta.
  const fases = [];
  let capturas = 0;
  let gasesRemolcando = null;
  const t0 = Date.now();
  for (;;) {
    const v = await page.evaluate(() => globalThis.__oga.vueltaALaRaya());
    if (v.fase !== fases[fases.length - 1]) {
      // Remolcando, quien juega da gas a fondo: la palanca tiene que volver a ralentí.
      if (v.fase === "empujando") {
        await page.evaluate(() => {
          globalThis.__oga.controles().throttle = 1;
        });
        await page.waitForTimeout(400);
        gasesRemolcando = await page.evaluate(() => globalThis.__oga.controles().throttle);
      }
      fases.push(v.fase);
      if (["enganchando", "empujando", "saludando"].includes(v.fase))
        await page.screenshot({ path: `${CARPETA}/${3 + capturas++}-${v.fase}.png` });
    }
    if (v.fase === "libre" || v.fase === null || Date.now() - t0 > 300000) break;
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: `${CARPETA}/${3 + capturas}-libre.png` });
  comprobar(
    "el tractor llega, engancha, remolca y suelta",
    fases.join(" → ") ===
      "llegando → enganchando → empujando → frenado → soltando → apartandose → andando → saludando → libre",
    `${fases.join(" → ")} en ${((Date.now() - t0) / 1000).toFixed(0)} s`,
  );
  comprobar(
    "remolcando, los gases se quedan a ralentí aunque se pida motor",
    gasesRemolcando === 0,
    `palanca a ${gasesRemolcando} tras pedir 1`,
  );
  const fin = await page.evaluate((ruta) => {
    const o = globalThis.__oga;
    const s = o.estado();
    let lejos = Infinity;
    for (let i = 1; i < ruta.length; i++) {
      const [ax, az] = ruta[i - 1];
      const [bx, bz] = ruta[i];
      const dx = bx - ax;
      const dz = bz - az;
      const l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((s.position.x - ax) * dx + (s.position.z - az) * dz) / l2));
      lejos = Math.min(lejos, Math.hypot(ax + dx * t - s.position.x, az + dz * t - s.position.z));
    }
    return { aLaRaya: lejos, ofrecido: o.vueltaALaRaya().ofrecido, fase: o.fase() };
  }, rayaAlTocar);
  comprobar(
    "y el avión queda en la raya que había al tocar",
    fin.aLaRaya < 2.5,
    `${fin.aLaRaya.toFixed(1)} m de la raya, fase «${fin.fase}»`,
  );
  comprobar("sin errores en la página", errores.length === 0, errores.join(" | "));
} catch (e) {
  comprobar("el banco llega al final", false, String(e?.message ?? e).slice(0, 200));
} finally {
  await navegador.close();
  await server.close();
}

let mal = 0;
for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}${r.detalle ? ` — ${r.detalle}` : ""}`);
  if (!r.ok) mal++;
}
console.log(`\n  ${resultados.length - mal} de ${resultados.length}\n`);
process.exit(mal ? 1 : 0);

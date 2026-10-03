/**
 * **El cielo de noche, mirado con la tarjeta de verdad**: una foto por tiro y
 * lo que cuesta en la GPU, con la noche encendida y apagada en el mismo cuadro.
 *
 * Existe porque «antes de añadir un efecto, se mide» y porque lo que se ve en
 * una captura de SwiftShader no vale para juzgar una estrella de un píxel.
 * Con `OGA_GPU=1` —lo normal aquí— usa la tarjeta del portátil y lo dice: si
 * el renderizador que contesta es SwiftShader, la foto no sirve.
 *
 * Cada tiro es `escenario:hora:rumbo:cabeceo[:fecha]`: el avión clavado a
 * mil quinientos metros sobre su pista, mirando a ese rumbo con el morro
 * levantado esos grados, y la cámara de fuera detrás. Por ejemplo, la Polar
 * desde Los Rodeos y la Cruz del Sur de madrugada desde Asunción:
 *
 *     OGA_GPU=1 node scripts/ver-noche.mjs carpeta \
 *       tenerife-norte:21:0:20 pettirossi:5:150:15
 *
 * `OGA_METAR="…"` vuela con ese parte: para ver que bajo una capa cerrada no
 * hay estrellas.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const D = process.argv[2] ?? "/tmp";
const TIROS = process.argv.slice(3);
const PUERTO = 5297;
const CON_GPU = process.env.OGA_GPU !== "0";
mkdirSync(D, { recursive: true });

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: [
    ...(CON_GPU
      ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
      : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"]),
    "--disable-gpu-vsync",
    "--disable-frame-rate-limit",
  ],
});

/** Lo que tarda la tarjeta por cuadro, mediana en ms, durante `ms`. */
async function gpuMs(page, ms = 2500) {
  return page.evaluate(async (ms) => {
    const pintor = globalThis.__oga.pintor();
    const gl = pintor.getContext();
    const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
    if (!ext) return null;
    const consultas = [];
    const original = pintor.render;
    pintor.render = function (...a) {
      const q = gl.createQuery();
      gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
      try {
        return original.apply(this, a);
      } finally {
        gl.endQuery(ext.TIME_ELAPSED_EXT);
        consultas.push(q);
      }
    };
    await new Promise((r) => setTimeout(r, ms));
    pintor.render = original;
    for (let i = 0; i < 6; i++) await new Promise((r) => requestAnimationFrame(r));
    const roto = gl.getParameter(ext.GPU_DISJOINT_EXT);
    const t = [];
    for (const q of consultas) {
      if (!roto && gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE))
        t.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(q);
    }
    t.sort((a, b) => a - b);
    return t.length ? t[Math.floor(t.length / 2)] : null;
  }, ms);
}

/**
 * **Lo que tarda cada pieza de la noche**, en la propia tarjeta: una consulta
 * de tiempo alrededor de la llamada de dibujo de las estrellas, otra en la de
 * la Luna y otra en la de la cúpula —que es donde se pinta la Vía Láctea—,
 * con la Vía Láctea puesta y quitada. Medir el cuadro entero con la noche y
 * sin ella no sirve: el resto del cuadro baila más de lo que cuesta la noche.
 */
async function porPieza(page, ms = 3000) {
  return page.evaluate(async (ms) => {
    const o = globalThis.__oga;
    const gl = o.pintor().getContext();
    const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
    if (!ext) return null;
    const escena = o.escena();
    const piezas = ["estrellas", "luna", "cielo"].map((n) => escena.getObjectByName(n));
    const tiempos = { estrellas: [], luna: [], cielo: [], cieloSinVia: [] };
    const pendientes = [];
    let sinVia = false;
    const cupula = piezas[2];
    const via = cupula?.material?.uniforms?.viaLactea;
    const antes = [];
    for (const p of piezas) {
      if (!p) continue;
      const b = p.onBeforeRender;
      const a = p.onAfterRender;
      antes.push([p, b, a]);
      p.onBeforeRender = function (...x) {
        b.apply(this, x);
        const q = gl.createQuery();
        gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
        pendientes.push([p.name === "cielo" && sinVia ? "cieloSinVia" : p.name, q]);
      };
      p.onAfterRender = function (...x) {
        gl.endQuery(ext.TIME_ELAPSED_EXT);
        a.apply(this, x);
      };
    }
    const guardada = via?.value ?? 0;
    const fin = performance.now() + ms;
    while (performance.now() < fin) {
      // Medio segundo con la Vía Láctea y medio sin ella, alternando.
      sinVia = !sinVia;
      if (via) via.value = sinVia ? 0 : guardada;
      await new Promise((r) => setTimeout(r, 500));
    }
    if (via) via.value = guardada;
    for (const [p, b, a] of antes) {
      p.onBeforeRender = b;
      p.onAfterRender = a;
    }
    for (let i = 0; i < 6; i++) await new Promise((r) => requestAnimationFrame(r));
    const roto = gl.getParameter(ext.GPU_DISJOINT_EXT);
    for (const [n, q] of pendientes) {
      if (!roto && gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE))
        tiempos[n].push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(q);
    }
    const mediana = (t) => {
      if (!t.length) return null;
      t.sort((x, y) => x - y);
      return t[Math.floor(t.length / 2)];
    };
    return Object.fromEntries(Object.entries(tiempos).map(([k, t]) => [k, mediana(t)]));
  }, ms);
}

try {
  for (const tiro of TIROS) {
    const [esc, hora, rumbo, cabeceo, fecha] = tiro.split(":");
    const page = await navegador.newPage({
      viewport: { width: 1100, height: 620 },
      locale: "es-PY",
    });
    page.on("pageerror", (e) => console.log("  ERROR:", e.message.slice(0, 200)));
    await page.addInitScript(() =>
      localStorage.setItem("oga-veve:teclas-vistas", "1"),
    );
    const metar = process.env.OGA_METAR
      ? `&metar=${encodeURIComponent(process.env.OGA_METAR)}`
      : "&meteo=";
    await page.goto(
      `${BASE}/?escenario=${esc}&hora=${hora}&leccion=aterrizaje&tramo=guyrami` +
        `${metar}${fecha ? `&fecha=${fecha}` : ""}`,
    );
    await page.waitForFunction(() => !!globalThis.__oga?.estado, null, {
      timeout: 90000,
    });
    await page.waitForTimeout(6000);
    const tarjeta = await page.evaluate(() => {
      const gl = globalThis.__oga.pintor().getContext();
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre";
    });
    await page.evaluate(
      async ({ rumbo, cabeceo, mira }) => {
        const o = globalThis.__oga;
        const r = o.pista();
        const y = o.suelo(r.x, r.z) + 1500;
        const h = (rumbo * Math.PI) / 180;
        /*
         * El rumbo con `colocar`, que es quien se lo dice al modelo de vuelo:
         * el sencillo lleva su propio rumbo y pisa la orientación que se le
         * escriba por fuera. Y la posición, clavada en cada fotograma.
         */
        o.colocar(r.x, y, r.z, 0, h);
        o.pilotar((c) => {
          const s = o.estado();
          s.position.set(r.x, y, r.z);
          s.velocity.set(0, 0, 0);
          c.throttle = 0;
          c.pitch = 0;
          c.roll = 0;
          c.yaw = 0;
        });
        o.ponerVista("chase");
        /*
         * **Y la cámara mirando arriba**, girada solo para pintar: la de fuera
         * sigue al avión y su mirada no sube lo bastante para ver la Polar.
         * Se gira antes de cada cuadro y se deshace después, así que el juego
         * no se entera.
         */
        const pintor = o.pintor();
        const original = pintor.render;
        const a = (cabeceo * Math.PI) / 180;
        /*
         * Con `OGA_MIRA=luna`, un teleobjetivo de cuatro grados apuntado a la
         * Luna: para ver su fase y sus mares, que a tamaño de juego son
         * catorce píxeles.
         */
        const aLaLuna = mira === "luna";
        pintor.render = function (escena, camara) {
          const q = camara.quaternion.clone();
          const fov = camara.fov;
          if (aLaLuna) {
            const l = o.cieloDeNoche().luna;
            const al = (l.altura * Math.PI) / 180;
            const az = (l.acimut * Math.PI) / 180;
            const p = camara.position;
            camara.lookAt(
              p.x + Math.cos(al) * Math.sin(az),
              p.y + Math.sin(al),
              p.z - Math.cos(al) * Math.cos(az),
            );
            camara.fov = 4;
            camara.updateProjectionMatrix();
          } else camara.rotateX(a);
          camara.updateMatrixWorld();
          try {
            return original.call(this, escena, camara);
          } finally {
            camara.quaternion.copy(q);
            camara.fov = fov;
            camara.updateProjectionMatrix();
            camara.updateMatrixWorld();
          }
        };
      },
      { rumbo: Number(rumbo), cabeceo: Number(cabeceo), mira: process.env.OGA_MIRA ?? "" },
    );
    // Lo que tarda en llegar el catálogo y en asentarse la cámara.
    await page.waitForTimeout(5000);
    const cielo = await page.evaluate(() => globalThis.__oga.cieloDeNoche());
    const mira = Number(cabeceo);
    /*
     * Y dónde cae en la foto lo que se enseña: la Polar, la Cruz, la Luna.
     * Fuera del cuadro no se dice; con su píxel, se puede buscar en la foto.
     */
    const dondeCaen = await page.evaluate(({ ancho, alto, cabeceoFoto }) => {
      const o = globalThis.__oga;
      const ojo = o.ojoDeCamara();
      // `enElCuadro` mira con la cámara tal cual la deja el juego: se gira
      // como para pintar mientras se pregunta.
      const camara = o.camaraViva();
      const a = (cabeceoFoto * Math.PI) / 180;
      camara.rotateX(a);
      camara.updateMatrixWorld();
      const c = o.cieloDeNoche();
      const enPantalla = (d) => {
        if (!d) return null;
        const p = o.enElCuadro(ojo.x + d.x * 1e5, ojo.y + d.y * 1e5, ojo.z + d.z * 1e5);
        if (!p.delante || Math.abs(p.x) > 1 || Math.abs(p.y) > 1) return null;
        return [Math.round(((p.x + 1) / 2) * ancho), Math.round(((1 - p.y) / 2) * alto)];
      };
      const lista = {
        polar: o.haciaLaEstrella(37.9529, 89.2642),
        acrux: o.haciaLaEstrella(186.6496, -63.0992),
        gacrux: o.haciaLaEstrella(187.7912, -57.1133),
        sirio: o.haciaLaEstrella(101.2871, -16.7161),
        antares: o.haciaLaEstrella(247.3519, -26.432),
      };
      const salida = {};
      for (const [k, d] of Object.entries(lista)) {
        const p = enPantalla(d);
        if (p) salida[k] = p;
      }
      if (c.luna && c.lunaDibujada) {
        const a = (c.luna.altura * Math.PI) / 180;
        const z = (c.luna.acimut * Math.PI) / 180;
        const p = enPantalla({ x: Math.cos(a) * Math.sin(z), y: Math.sin(a), z: -Math.cos(a) * Math.cos(z) });
        if (p) salida.luna = p;
      }
      camara.rotateX(-a);
      camara.updateMatrixWorld();
      return salida;
    }, { ancho: 1100, alto: 620, cabeceoFoto: Number(cabeceo) });
    const piezas = await porPieza(page);
    const con = await gpuMs(page);
    const coste = await page.evaluate(() => globalThis.__oga.coste());
    await page.evaluate(() => globalThis.__oga.apagarLaNoche(true));
    await page.waitForTimeout(400);
    const sin = await gpuMs(page);
    // Y la foto sin la noche, para ver qué pone ella, si se pide.
    if (process.env.OGA_SIN === "1")
      await page.screenshot({ path: `${D}/noche-${tiro.replace(/[:.]/g, "_")}-sin.png` });
    const costeSin = await page.evaluate(() => globalThis.__oga.coste());
    await page.evaluate(() => globalThis.__oga.apagarLaNoche(false));
    await page.waitForTimeout(600);
    const nombre = `noche-${tiro.replace(/[:.]/g, "_")}.png`;
    await page.screenshot({ path: `${D}/${nombre}` });
    const rumboReal = await page.evaluate(() => (globalThis.__oga.estado().heading * 180) / Math.PI);
    console.log(
      `${tiro} → ${nombre}\n  ${tarjeta} · el avión mira a ${rumboReal.toFixed(0)}°\n` +
        `  la cabeza ${mira.toFixed(0)}° arriba · estrellas: ${cielo.cuantas} puestas, se ven ${cielo.seVen.toFixed(2)}, dibujadas ${cielo.dibujadas}` +
        (cielo.luna
          ? ` · Luna a ${cielo.luna.altura.toFixed(1)}° de altura y ${cielo.luna.acimut.toFixed(0)}°, ${Math.round(cielo.luna.fase * 100)} % alumbrada, dibujada ${cielo.lunaDibujada}`
          : "") +
        `\n  en la foto: ${JSON.stringify(dondeCaen)}` +
        `\n  por pieza (ms): ${JSON.stringify(Object.fromEntries(Object.entries(piezas ?? {}).map(([k, v]) => [k, v === null ? null : +v.toFixed(4)])))}` +
        `\n  GPU con la noche ${con?.toFixed(3) ?? "—"} ms, sin ella ${sin?.toFixed(3) ?? "—"} ms · ` +
        `${coste.llamadas} dibujos con ella, ${costeSin.llamadas} sin ella`,
    );
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

/**
 * **El faro de Punta de Teno, mirado**: el sitio con modelo de
 * `data/sitios/sitios.json` y su luz, en la misión de Teno del Super Puma.
 *
 * Saca las fotos de día, al atardecer y de noche —con la luz en un destello—,
 * desde el helicóptero posado en el llano de la misión, a setenta metros, y
 * desde cuatrocientos metros y dos y quince kilómetros, en el aire y mirando
 * al faro. Y mide lo que cuesta: triángulos, llamadas y cuadro, con el faro y
 * sin él, desde el mismo sitio.
 *
 * El helicóptero se recoloca cada poco en el mismo punto para que no se mueva
 * mientras se mira: aquí no se vuela, se mira.
 *
 * Uso: `OGA_PUERTO=5661 OGA_FOTOS=fotos node scripts/ver-faro-de-teno.mjs`.
 * Con la tarjeta de verdad por omisión; `OGA_GPU=0` para dibujar por programa.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = Number(process.env.OGA_PUERTO ?? 5661);
const FOTOS = process.env.OGA_FOTOS ?? "fotos-faro";
mkdirSync(FOTOS, { recursive: true });

/** El faro y el llano, en el mundo de Los Rodeos: los de `content/missions.ts`. */
const FARO = { x: -56800, z: 15641 };
const LLANO = { x: -56863.6, z: 15668.9 };

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await createServer({ root: process.cwd(), server: { port: PUERTO, hmr: false }, logLevel: "warn" });
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args:
    process.env.OGA_GPU === "0"
      ? ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"]
      : ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"],
});

let codigo = 1;
try {
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-PY" });
  const page = await contexto.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(`${BASE}/?avion=super-puma&mision=teno&tramo=guyrami&hora=12&meteo=&viento=000/0`);
  await page.waitForFunction(() => globalThis.__oga?.helicoptero?.() != null, null, { timeout: 120_000 });
  const tarjeta = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "¿?";
  });
  console.log(`  tarjeta: ${tarjeta}`);

  /**
   * Pone el helicóptero en (x, z), a `alto` m del suelo —o, con
   * `{ sobreElFaro }`, a esos metros sobre el pie del faro—, mirando a
   * `hacia`, y lo tiene ahí `ms`.
   */
  const ponerEn = async (p, alto, hacia, ms = 1500) => {
    const fin = Date.now() + ms;
    do {
      await page.evaluate(
        ({ p, alto, hacia, faro }) => {
          const o = globalThis.__oga;
          const rumbo = Math.atan2(hacia.x - p.x, -(hacia.z - p.z));
          const y =
            typeof alto === "number"
              ? o.sueloDeVuelo(p.x, p.z) + alto
              : Math.max(o.sueloDeVuelo(p.x, p.z) + 2, o.sueloDeVuelo(faro.x, faro.z) + alto.sobreElFaro);
          o.colocar(p.x, y, p.z, 0, rumbo);
        },
        { p, alto, hacia, faro: FARO },
      );
      await pausa(150);
    } while (Date.now() < fin);
  };
  /** A `metros` del faro hacia `rumbo` grados, en el plano del mundo. */
  const desde = (metros, rumbo) => ({
    x: FARO.x + metros * Math.sin((rumbo * Math.PI) / 180),
    z: FARO.z - metros * Math.cos((rumbo * Math.PI) / 180),
  });
  const faroPuesto = () =>
    page.evaluate(() => globalThis.__oga.sitios().find((s) => s.id === "faro-de-teno")?.estado ?? "no está");
  /**
   * Una foto con la vista que se pida. La de cabina para lo lejano y para el
   * llano: con la de detrás, el horizonte y lo alto de la torre caen bajo los
   * botones de arriba.
   */
  const foto = async (nombre, vista = "chase") => {
    await page.evaluate((v) => globalThis.__oga.ponerVista(v), vista);
    await pausa(600);
    await page.screenshot({ path: `${FOTOS}/${nombre}.png` });
    console.log(`    foto: ${FOTOS}/${nombre}.png`);
    await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
  };
  /** Cuadro mediano y percentil 95, ms, y lo dibujado en el último. */
  const medir = (cuadros = 120) =>
    page.evaluate(
      (n) =>
        new Promise((listo) => {
          const t = [];
          let antes = performance.now();
          const uno = (ahora) => {
            t.push(ahora - antes);
            antes = ahora;
            if (t.length < n) requestAnimationFrame(uno);
            else {
              t.shift();
              t.sort((a, b) => a - b);
              const c = globalThis.__oga.coste();
              listo({
                mediana: t[Math.floor(t.length / 2)],
                p95: t[Math.floor(t.length * 0.95)],
                triangulos: c.triangulos,
                llamadas: c.llamadas,
              });
            }
          };
          requestAnimationFrame(uno);
        }),
      cuadros,
    );
  /** Con el faro y sin él, desde el mismo sitio, quieto. */
  const coste = async (p, alto, hacia, nombre) => {
    await ponerEn(p, alto, hacia, 800);
    const con = await medir();
    await page.evaluate(() => globalThis.__oga.verLosSitios(false));
    const sin = await medir();
    await page.evaluate(() => globalThis.__oga.verLosSitios(true));
    console.log(
      `  coste ${nombre}: con el faro ${con.triangulos} triángulos y ${con.llamadas} llamadas, cuadro ${con.mediana.toFixed(1)} ms (p95 ${con.p95.toFixed(1)}); ` +
        `sin él ${sin.triangulos} y ${sin.llamadas}, ${sin.mediana.toFixed(1)} ms (p95 ${sin.p95.toFixed(1)})`,
    );
  };
  /** La primera hora de la tarde con el sol a `grados` o más abajo. */
  const horaConElSolA = (grados) =>
    page.evaluate((g) => {
      const o = globalThis.__oga;
      for (let h = 17; h <= 23; h += 0.05) {
        o.ponerHora(h);
        if (o.solEnPantalla().altura <= g) return h;
      }
      return 23;
    }, grados);

  // ── De día ─────────────────────────────────────────────────────────────
  console.log("\nDe día, a las doce");
  await ponerEn(LLANO, 0.4, FARO, 4000);
  for (let i = 0; i < 40 && (await faroPuesto()) !== "puesto"; i++) await ponerEn(LLANO, 0.4, FARO, 500);
  console.log(`  el faro: ${await faroPuesto()}`);
  await ponerEn(LLANO, 0.4, FARO, 2500);
  await foto("dia-posado");
  await foto("dia-posado-cabina", "cockpit");
  // Desde la pasarela del oeste, como «Faro de punta Teno» (Yerie2017).
  await ponerEn(desde(150, 250), 12, FARO, 2500);
  await foto("dia-150m-oeste", "cockpit");
  // Y desde el camino del este, como «Faro de Teno - Tenerife 03» (H. Zell).
  await ponerEn(desde(60, 60), { sobreElFaro: 16 }, FARO, 2500);
  await foto("dia-60m-este", "cockpit");
  await ponerEn(desde(400, 240), 60, FARO, 2500);
  await foto("dia-400m");
  await ponerEn(desde(2000, 240), 150, FARO, 3000);
  await foto("dia-2km");
  await foto("dia-2km-cabina", "cockpit");
  await coste(desde(2000, 240), 150, FARO, "a 2 km, de día");
  await coste(LLANO, 0.4, FARO, "posado, de día");

  // ── Al atardecer y de noche, con la luz en un destello ────────────────
  const atardecer = await horaConElSolA(-3);
  const noche = 23;
  for (const [nombre, hora] of [
    ["atardecer", atardecer],
    ["noche", noche],
  ]) {
    console.log(`\n${nombre}, a las ${hora.toFixed(2)}`);
    await page.evaluate((h) => {
      globalThis.__oga.ponerHora(h);
      globalThis.__oga.ponerSegundoDeLosFaros(0.15, true);
    }, hora);
    await ponerEn(LLANO, 0.4, FARO, 2500);
    console.log(`  la luz: ${JSON.stringify(await page.evaluate(() => globalThis.__oga.lucesDeFaro()))}`);
    await foto(`${nombre}-posado`, "cockpit");
    await ponerEn(desde(60, 60), { sobreElFaro: 16 }, FARO, 2500);
    await foto(`${nombre}-60m-este`, "cockpit");
    await ponerEn(desde(2000, 240), 150, FARO, 3000);
    await foto(`${nombre}-2km`);
    await foto(`${nombre}-2km-cabina`, "cockpit");
    // Y entre destellos, apagada: para ver que el punto de antes es la luz.
    await page.evaluate(() => globalThis.__oga.ponerSegundoDeLosFaros(4, true));
    await ponerEn(desde(2000, 240), 150, FARO, 800);
    await foto(`${nombre}-2km-apagada`, "cockpit");
    await page.evaluate(() => globalThis.__oga.ponerSegundoDeLosFaros(0.15, true));
  }
  // Desde lejos, de noche: el faro ya no está bajado, la luz sí.
  await ponerEn(desde(15000, 240), 300, FARO, 3000);
  console.log(`  a 15 km, el faro: ${await faroPuesto()}; la luz: ${JSON.stringify(await page.evaluate(() => globalThis.__oga.lucesDeFaro()))}`);
  await foto("noche-15km", "cockpit");
  await coste(desde(2000, 240), 150, FARO, "a 2 km, de noche");

  console.log(errores.length ? `\n  errores: ${errores.join(" | ")}` : "\n  sin errores en la página");
  codigo = errores.length ? 1 : 0;
} finally {
  await navegador.close();
  await server.close();
}
process.exit(codigo);

/**
 * **El gas con el que nace un avión colocado en el aire, y lo que hace con
 * él** (ADR 0002, nota H40a): se abre un ejercicio, no se toca nada y se mira
 * medio minuto de juego.
 *
 *   node scripts/ver-el-gas-al-colocar.mjs
 *
 * Los casos van en `OGA_CASOS`, separados por comas, como
 * `avion:ejercicio:escenario:peldaño` —por defecto, la deriva de Asunción con
 * el JAZ 20, el JAZ 25 y el JAZ 40 en Taguató, y la final del cangrejo de Los
 * Rodeos con el JAZ 20—. Sin mano en los mandos, en Taguató lo que se sostiene
 * es la velocidad, así que la trayectoria la pone el gas: un ejercicio que
 * empieza nivelado tiene que seguir nivelado y a su velocidad, y una final,
 * bajando por su senda. Sin viento (`viento=000/0`), para que lo que se mida
 * sea el gas y no la ráfaga. El puerto, `OGA_PUERTO`; el reloj, por
 * `OGA_VECES` (cuatro).
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = Number(process.env.OGA_PUERTO ?? 5686);
const VECES = Number(process.env.OGA_VECES ?? 4);
const CASOS = (
  process.env.OGA_CASOS ??
  "jaz-20:deriva:pettirossi:taguato,jaz-25:deriva:pettirossi:taguato,jaz-40:deriva:pettirossi:taguato,jaz-20:cangrejo:tenerife-norte:taguato"
)
  .split(",")
  .map((c) => {
    const [avion, ejercicio, escenario, tramo] = c.split(":");
    return { avion, ejercicio, escenario, tramo };
  });
const SEGUNDOS = 30;
const NUDO = 0.514444;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false, watch: null },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const leer = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    const s = o.estado();
    return {
      reloj: j.clock?.elapsedTime ?? 0,
      y: s.position.y,
      verdadera: s.airspeed,
      vertical: s.verticalSpeed,
      enTierra: s.onGround,
      gas: o.controles().throttle,
      flaps: o.controles().flaps,
      tren: o.controles().tren,
    };
  });

let codigo = 0;
try {
  for (const k of CASOS) {
    const contexto = await navegador.newContext({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1 });
    const page = await contexto.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(
      `${BASE}/?escenario=${k.escenario}&hora=12&tramo=${k.tramo}&avion=${k.avion}&ejercicio=${k.ejercicio}&viento=000/0`,
    );
    await page.waitForFunction(
      () => {
        const s = globalThis.__oga?.estado?.();
        return s && !s.onGround && s.airspeed > 20;
      },
      null,
      { timeout: 120000 },
    );
    const r0 = await leer(page);
    await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
    const muestras = [r0];
    const hasta = Date.now() + 4 * 60000;
    let r = r0;
    while (r.reloj - r0.reloj < SEGUNDOS && Date.now() < hasta && !r.enTierra) {
      await pausa(500);
      r = await leer(page);
      muestras.push(r);
    }
    const t = r.reloj - r0.reloj;
    const media = (r.y - r0.y) / Math.max(1e-3, t);
    console.log(
      `${k.avion} ${k.ejercicio} ${k.tramo}: nace con gas ${r0.gas.toFixed(3)} (flaps ${r0.flaps.toFixed(2)}, tren ${r0.tren.toFixed(2)}) a ${(r0.verdadera / NUDO).toFixed(1)} kt` +
        ` | a los ${t.toFixed(1)} s: ${(r.verdadera / NUDO).toFixed(1)} kt, gas ${r.gas.toFixed(3)}, ${(r.y - r0.y).toFixed(0)} m (${media.toFixed(2)} m/s de media, ${r.vertical.toFixed(2)} ahora)` +
        ` | velocidad entre ${(Math.min(...muestras.map((m) => m.verdadera)) / NUDO).toFixed(1)} y ${(Math.max(...muestras.map((m) => m.verdadera)) / NUDO).toFixed(1)} kt` +
        (errores.length ? ` | errores: ${errores.join(" · ")}` : ""),
    );
    if (errores.length) codigo = 1;
    await contexto.close();
  }
} catch (e) {
  console.error(e);
  codigo = 1;
} finally {
  await navegador.close();
  await server.close();
}
process.exit(codigo);

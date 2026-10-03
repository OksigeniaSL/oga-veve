/**
 * **¿Se señalan la Cruz del Sur y la Polar cuando se ven, y solo entonces?**
 *
 * Las reglas y las cuentas se comprueban sin navegador —`cielo-de-noche.test`
 * y `hitos-del-cielo.test`—, pero que el cielo del juego, la ventanilla y el
 * bucle se encuentren no lo dice ninguna de las dos: un catálogo que no llega,
 * un cielo que no se pone o una fecha que no se lee dejan esto mudo sin romper
 * nada. Así que se vuela, de noche:
 *
 * - **Tenerife Norte a las nueve de la noche** de hoy: la Polar, sobre el
 *   norte, por la izquierda volando al este.
 * - **Asunción una noche de otoño** —el 20 de mayo de 2027—: la Cruz del Sur,
 *   alta sobre el sur, por la derecha volando al este.
 * - **Y Asunción con el cielo cubierto** por encima del avión: nada, que no
 *   se ve.
 *
 * El avión va lejos de los campos y sobre lo que menos merece contarse, para
 * que la estrella no espere turno detrás del Teide; y con el reloj del juego
 * a cuatro veces, que la primera cosa que se señala espera medio minuto de
 * crucero. Con `OGA_FOTOS=carpeta` saca la tarjeta y la cabeza girada hacia la
 * estrella al tocarla; con `OGA_GPU=1`, con la tarjeta de verdad.
 *
 *     node scripts/verificar-estrellas.mjs
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = 5263;
const FOTOS = process.env.OGA_FOTOS ?? null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const CON_GPU = process.env.OGA_GPU === "1";

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

/**
 * Los vuelos. `donde` es dónde se pone el avión respecto al campo, m —el
 * norte es la Z negativa—, y `espera` la clase que se tiene que señalar, o
 * `null` si no se tiene que señalar ninguna estrella.
 */
const VUELOS = [
  {
    nombre: "Tenerife Norte, 21 h: la Polar",
    url: "escenario=tenerife-norte&hora=21",
    donde: { x: 0, z: -110_000, y: 2500 },
    espera: "polar",
    lado: "izquierda",
  },
  {
    nombre: "Asunción, 20-05-2027 21 h: la Cruz del Sur",
    url: "escenario=pettirossi&hora=21&fecha=2027-05-20",
    donde: { x: -120_000, z: 60_000, y: 2500 },
    espera: "cruz-del-sur",
    lado: "derecha",
  },
  {
    nombre: "Asunción, cielo cubierto por encima: ninguna",
    url:
      "escenario=pettirossi&hora=21&fecha=2027-05-20&metar=" +
      encodeURIComponent("SGAS 202100Z 09005KT 9999 OVC120 18/12 Q1016"),
    donde: { x: -120_000, z: 60_000, y: 2500 },
    espera: null,
    lado: null,
  },
];

const fallos = [];
try {
  for (const v of VUELOS) {
    const page = await navegador.newPage({
      viewport: { width: 1100, height: 620 },
      locale: "es-PY",
    });
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(
      `${BASE}/?${v.url}&leccion=vuelta&tramo=taguato&avion=jaz-20` +
        (v.url.includes("metar=") ? "" : "&meteo="),
    );
    await page.waitForFunction(() => !!globalThis.__oga?.estado, null, { timeout: 120000 });
    await page.waitForTimeout(8000);
    /*
     * Al este, con el piloto automático guardando la altura: sin él, el
     * avión baja y la fase deja de ser de crucero.
     */
    await page.evaluate((d) => {
      const o = globalThis.__oga;
      const r = o.pista();
      o.colocar(r.x + d.x, d.y, r.z + d.z, 60, Math.PI / 2);
      o.ponerVentanillaAlt?.(d.y / 0.3048);
      o.pilotoAutomatico?.(true);
      o.acelerar(4);
    }, v.donde);
    let senalado = null;
    let estrellas = null;
    const hasta = Date.now() + 150_000;
    while (Date.now() < hasta) {
      await page.waitForTimeout(2000);
      const m = await page.evaluate(() => globalThis.__oga.mirada());
      estrellas ??= await page.evaluate(() => globalThis.__oga.cieloDeNoche());
      if (m.senalado && (m.senalado.clase === "polar" || m.senalado.clase === "cruz-del-sur")) {
        senalado = m.senalado;
        break;
      }
    }
    const fase = await page.evaluate(() => globalThis.__oga.fase());
    const tarjeta = await page.evaluate(() => globalThis.__oga.tarjeta());
    let mirando = null;
    if (senalado) {
      // A tiempo real otra vez: la cabeza se queda ocho segundos de juego, y a
      // cuatro veces se volvía antes de la foto.
      await page.evaluate(() => globalThis.__oga.acelerar(1));
      const base = FOTOS ? `${FOTOS}/estrellas-${v.espera}` : null;
      if (base) await page.screenshot({ path: `${base}-tarjeta.png` });
      await page.evaluate(() => globalThis.__oga.mirarHaciaLoSenalado());
      await page.waitForTimeout(3000);
      mirando = await page.evaluate(() => globalThis.__oga.mirada());
      if (base) await page.screenshot({ path: `${base}-mirando.png` });
    }
    const bien = v.espera === null ? senalado === null : senalado?.clase === v.espera && senalado?.lado === v.lado;
    console.log(
      `  ${bien ? "✓" : "✗"} ${v.nombre}: ` +
        (senalado ? `señalada ${senalado.nombre} (${senalado.clase}) por la ${senalado.lado}` : "ninguna estrella señalada") +
        ` · fase ${fase} · se ven ${estrellas?.seVen?.toFixed(2)} · ${estrellas?.cuantas} estrellas` +
        (mirando
          ? ` · al tocarla, la cabeza ${((mirando.guinada * 180) / Math.PI).toFixed(0)}° de lado y ${((mirando.cabeceo * 180) / Math.PI).toFixed(0)}° arriba`
          : "") +
        (tarjeta ? ` · tarjeta ${JSON.stringify(tarjeta).slice(0, 80)}` : ""),
    );
    for (const e of errores) console.log(`    ERROR: ${e}`);
    if (!bien || errores.length) fallos.push(v.nombre);
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}
console.log(fallos.length ? `\n  ✗ ${fallos.length} mal` : "\n  ✓ Las estrellas se señalan cuando se ven.");
process.exit(fallos.length ? 1 : 0);

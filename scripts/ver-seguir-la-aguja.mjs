/**
 * **«Seguí la aguja», volado en el juego** (#51, ADR 0030, enmienda H26b):
 * Fuerteventura, la avioneta en el peldaño de cabina y el NDB FV.
 *
 *   node scripts/ver-seguir-la-aguja.mjs <carpeta>
 *
 * Dos vuelos: con el alisio del sitio (del treinta a veinte nudos, el que pone
 * el ejercicio) y en calma (`&viento=000/0`). En los dos, el piloto de banco
 * sintoniza con la tecla 8 como quien juega, espera al morse y sigue la aguja
 * con el automático: cada poco, el rumbo del automático al de la aguja. Así
 * vuela lo mismo que el piloto de la prueba de mesa, con el modelo de vuelo de
 * verdad. Mira:
 *
 * - que el ADF empieza vacío, que la tecla pone FV y que el morse la
 *   identifica (`__oga.morse()`);
 * - que con viento la estela se aparta de la recta (la curva del perro) y en
 *   calma no;
 * - que el ejercicio se cierra al pasar por encima de FV, con la aguja atrás.
 *
 * Capturas: la salida, la aguja sintonizada, el plano con la estela a media
 * curva, la aguja dando la vuelta encima de la radio y el panel del final con
 * la traza. El puerto, `OGA_PUERTO`; el reloj, acelerado por cuatro.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";

const SALIDA = process.argv[2] ?? "capturas-aguja";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5687);
const AVION = process.env.OGA_AVION ?? "jaz-20";
const VUELOS = [
  { nombre: "alisio", viento: null },
  { nombre: "calma", viento: "000/0" },
];

mkdirSync(SALIDA, { recursive: true });
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

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok: !!ok });
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? `  —  ${detalle}` : ""}`);
};

/** Lo que dice el ejercicio, el ADF y el morse, y dónde está el avión. */
const leer = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    const s = o.estado();
    const a = j.avionParaLaRadio();
    const adf = a ? j.radioAlDia().leer(a, j.elevacionDeLaEstacion).adf : null;
    return {
      x: s.position.x,
      z: s.position.z,
      y: s.position.y,
      rumbo: s.heading,
      gs: s.groundSpeed,
      aguja: o.seguirLaAguja(),
      morse: o.morse(),
      adfMhz: j.radioAlDia().adfMhz,
      adfId: adf?.lectura.emisora?.estacion.id ?? null,
      relativa: adf?.lectura.relativa ?? null,
      piloto: o.pilotoAutomatico(),
      tarjeta: o.tarjeta?.()?.dibujo ?? null,
    };
  });

/** El rumbo del automático, rad, como lo lleva el juego. */
const rumboAlAutomatico = (page, rumbo) =>
  page.evaluate((r) => {
    const j = globalThis.__oga.juegoParaTrazas();
    if (j.objetivos) j.objetivos.rumbo = r;
  }, rumbo);

let codigo = 0;
try {
  for (const vuelo of VUELOS) {
    console.log(`\n${vuelo.nombre}`);
    const contexto = await navegador.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      hasTouch: false,
    });
    const page = await contexto.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    const viento = vuelo.viento ? `&viento=${vuelo.viento}` : "";
    await page.goto(
      `${BASE}/?escenario=fuerteventura&hora=12&tramo=taguato-ruvicha&avion=${AVION}&ejercicio=aguja${viento}`,
    );
    await page.waitForFunction(() => globalThis.__oga?.seguirLaAguja?.() != null, null, { timeout: 120000 });
    await pausa(3000);
    const foto = async (n) => {
      const ruta = `${SALIDA}/${vuelo.nombre}-${n}.png`;
      await page.screenshot({ path: ruta });
      console.log(`    foto: ${ruta}`);
    };
    const tarjeta = await page.evaluate(() => {
      const g = document.createElement("canvas").getContext("webgl");
      const i = g?.getExtension("WEBGL_debug_renderer_info");
      return i ? g.getParameter(i.UNMASKED_RENDERER_WEBGL) : "sin WebGL";
    });
    console.log(`    tarjeta: ${tarjeta}`);
    let r = await leer(page);
    const est = r.aguja.estacion;
    const lejos0 = Math.hypot(est.x - r.x, est.z - r.z);
    comprobar("empieza en el aire, lejos de la radio", r.y > 500 && lejos0 > 10000, `${(lejos0 / 1852).toFixed(1)} NM, ${Math.round(r.y)} m`);
    await foto("01-salida");
    comprobar("el ADF empieza vacío", r.adfMhz === null, `adf ${r.adfMhz}`);

    // Sintonizar como quien juega: la tecla 8, la estación siguiente por cercanía.
    await page.keyboard.press("Digit8");
    await pausa(400);
    r = await leer(page);
    comprobar("la tecla 8 pone FV", r.adfId === "FV", `${r.adfId} en ${r.adfMhz}`);
    // El morse: espera a que la boca quede libre y suena entero, unos ocho segundos y medio.
    const hasta = Date.now() + 60000;
    while (Date.now() < hasta && r.morse.identificada !== "adf FV") {
      await pausa(300);
      r = await leer(page);
    }
    comprobar("el morse la identifica", r.morse.identificada === "adf FV", JSON.stringify(r.morse));
    await foto("02-sintonizada");

    // El automático, y el reloj por cuatro.
    await page.evaluate(() => globalThis.__oga.pilotoAutomatico(true));
    await page.evaluate(() => globalThis.__oga.acelerar(4));
    let plano = false;
    let pasada = null;
    const fin = Date.now() + 8 * 60000;
    while (Date.now() < fin) {
      r = await leer(page);
      if (r.relativa !== null) {
        let rel = (r.relativa * Math.PI) / 180;
        if (rel > Math.PI) rel -= 2 * Math.PI;
        // Seguir la aguja: el morro a la radio. Detrás, ya se pasó: recto.
        if (Math.abs(rel) < Math.PI / 2) await rumboAlAutomatico(page, r.rumbo + rel);
      }
      const queda = Math.hypot(est.x - r.x, est.z - r.z);
      if (!plano && queda < lejos0 * 0.3) {
        plano = true;
        await page.evaluate(() => globalThis.__oga.juegoParaTrazas().hud.mapa.alternar());
        await pausa(900);
        await foto("03-plano-estela");
        await page.evaluate(() => globalThis.__oga.juegoParaTrazas().hud.mapa.alternar());
      }
      if (r.aguja.fase === "cerrada") {
        pasada = r;
        await foto("04-aguja-da-la-vuelta");
        break;
      }
      await pausa(150);
    }
    comprobar("se acaba al pasar por encima de FV", pasada?.aguja.cierre === "hecho", pasada ? `relativa ${Math.round(pasada.relativa ?? -1)}°` : "no llegó");
    const a = (pasada ?? r).aguja;
    const parte = a.lejosAlEmpezar ? a.desvio / a.lejosAlEmpezar : 0;
    if (vuelo.viento === null)
      comprobar("con el alisio, la estela se curva (la curva del perro)", parte > 0.04, `${Math.round(a.desvio)} m de ${Math.round(a.lejosAlEmpezar ?? 0)}: ${(parte * 100).toFixed(1)} %`);
    else
      comprobar("en calma, la estela sale recta", parte < 0.02, `${Math.round(a.desvio)} m de ${Math.round(a.lejosAlEmpezar ?? 0)}: ${(parte * 100).toFixed(1)} %`);
    // El panel del final, con la traza en el plano: ocho segundos y medio de juego después.
    await pausa(4000);
    await foto("05-final");
    comprobar("sin errores en la página", errores.length === 0, errores.join(" | "));
    await contexto.close();
  }
} catch (e) {
  console.error(e);
  codigo = 1;
} finally {
  await navegador.close();
  await server.close();
}
const mal = resultados.filter((x) => !x.ok).length;
console.log(`\n${resultados.length - mal}/${resultados.length} bien`);
process.exit(mal || codigo ? 1 : 0);

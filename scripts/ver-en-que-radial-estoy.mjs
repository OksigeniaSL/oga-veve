/**
 * **«¿En qué radial estoy?», volado en el juego** (#51, ADR 0030, enmienda
 * H26c): Fuerteventura, la avioneta en el peldaño de cabina y el VOR FTV.
 *
 *   node scripts/ver-en-que-radial-estoy.mjs <carpeta>
 *
 * Un vuelo con el alisio del sitio (del treinta a veinte nudos, el que pone el
 * ejercicio), o en calma con `OGA_VIENTO=000/0`. El piloto de banco hace lo
 * que pide la instructora, con las teclas de quien juega:
 *
 * - sintoniza con la tecla 7 —la estación siguiente por cercanía, hasta que
 *   sale FTV— y espera a su morse (`__oga.morse()`);
 * - gira el OBS de grado en grado con el 9 y el 0 hasta centrar la barra con
 *   FROM, y mira que ese curso es el radial que marca la radio;
 * - gira el avión un cuarto de vuelta hacia la radio con el automático, y
 *   mira lo que se movió la barra;
 * - gira el OBS media vuelta con la tecla apretada —la rueda que sigue
 *   girando— hasta TO, y vuela a la radio con la barra: el rumbo del curso
 *   más tres veces lo que se aparta;
 * - y pasa por encima de FTV: la bandera y FROM, y el panel del final.
 *
 * Capturas, la página entera y el cuadro de cerca: la salida, la barra
 * centrada con FROM, antes y después del giro, la bandera encima de la radio,
 * el FROM al otro lado y el final. El puerto, `OGA_PUERTO`; el reloj,
 * acelerado por ocho en la vuelta a la radio (`OGA_VECES`).
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";
import { vigilarLoAjeno } from "./lo-ajeno-al-ejercicio.mjs";

const SALIDA = process.argv[2] ?? "capturas-radial";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5687);
const AVION = process.env.OGA_AVION ?? "jaz-20";
const VECES = Number(process.env.OGA_VECES ?? 8);
const VIENTO = process.env.OGA_VIENTO ?? null;
const NOMBRE = VIENTO ? "calma" : "alisio";

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

/** Lo que dice el ejercicio, la NAV y el morse, y dónde está el avión. */
const leerSolo = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    const s = o.estado();
    const a = j.avionParaLaRadio();
    const radio = j.radioAlDia();
    const nav = a ? radio.leer(a, j.elevacionDeLaEstacion).nav : null;
    const l = nav?.lectura ?? null;
    return {
      x: s.position.x,
      z: s.position.z,
      y: s.position.y,
      rumbo: s.heading,
      ejercicio: o.enQueRadialEstoy(),
      morse: o.morse(),
      navMhz: radio.navMhz,
      curso: radio.curso,
      navId: l?.emisora?.estacion.id ?? null,
      declinacion: l?.emisora?.declinacion ?? 0,
      radial: l?.radial ?? null,
      desviacion: l?.desviacion ?? null,
      toFrom: l?.toFrom ?? null,
      bandera: l?.bandera ?? true,
      tarjeta: o.tarjeta?.()?.dibujo ?? null,
    };
  });

/** Lo que no es del ejercicio, mirado en cada lectura mientras dura (H26f). Ver `lo-ajeno-al-ejercicio.mjs`. */
const ajeno = vigilarLoAjeno();
const leer = async (page) => {
  const r = await leerSolo(page);
  await ajeno.mirar(page, r.ejercicio && r.ejercicio.fase !== "cerrada");
  return r;
};

/** El rumbo del automático, rad verdaderos, como lo lleva el juego. */
const rumboAlAutomatico = (page, rumbo) =>
  page.evaluate((r) => {
    const j = globalThis.__oga.juegoParaTrazas();
    if (j.objetivos) j.objetivos.rumbo = r;
  }, rumbo);

const centrado = (g) => ((((g + 180) % 360) + 360) % 360) - 180;
const GRADO = Math.PI / 180;

let codigo = 0;
try {
  console.log(`\n${NOMBRE}`);
  const contexto = await navegador.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    hasTouch: false,
  });
  const page = await contexto.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  const viento = VIENTO ? `&viento=${VIENTO}` : "";
  await page.goto(`${BASE}/?escenario=fuerteventura&hora=12&tramo=taguato-ruvicha&avion=${AVION}&ejercicio=radial${viento}`);
  await page.waitForFunction(() => globalThis.__oga?.enQueRadialEstoy?.() != null, null, { timeout: 120000 });
  await pausa(3000);
  const foto = async (n) => {
    const ruta = `${SALIDA}/${NOMBRE}-${n}.png`;
    await page.screenshot({ path: ruta });
    const cuadro = page.locator(".cuadro").first();
    if (await cuadro.count()) await cuadro.screenshot({ path: `${SALIDA}/${NOMBRE}-${n}-cuadro.png` }).catch(() => {});
    console.log(`    foto: ${ruta}`);
  };
  const tarjeta = await page.evaluate(() => {
    const g = document.createElement("canvas").getContext("webgl");
    const i = g?.getExtension("WEBGL_debug_renderer_info");
    return i ? g.getParameter(i.UNMASKED_RENDERER_WEBGL) : "sin WebGL";
  });
  console.log(`    tarjeta: ${tarjeta}`);

  let r = await leer(page);
  const est = r.ejercicio.estacion;
  const c = r.ejercicio.colocacion;
  const lejos0 = Math.hypot(est.x - r.x, est.z - r.z);
  comprobar("empieza en el aire, lejos del VOR", r.y > 500 && lejos0 > 12 * 1852, `${(lejos0 / 1852).toFixed(1)} NM, ${Math.round(r.y)} m, radial ${c?.radial}`);
  comprobar("la NAV empieza vacía y el OBS apartado", r.navMhz === null && r.curso === c?.curso, `nav ${r.navMhz}, OBS ${r.curso}`);
  await foto("01-salida");

  // Sintonizar como quien juega: la tecla 7, la estación siguiente por cercanía, hasta FTV.
  for (let i = 0; i < 6 && r.navId !== est.id; i++) {
    await page.keyboard.press("Digit7");
    await pausa(400);
    r = await leer(page);
  }
  comprobar("la tecla 7 pone FTV", r.navId === est.id, `${r.navId} en ${r.navMhz}`);
  const hasta = Date.now() + 60000;
  while (Date.now() < hasta && r.morse.identificada !== `nav ${est.id}`) {
    await pausa(300);
    r = await leer(page);
  }
  comprobar("el morse la identifica", r.morse.identificada === `nav ${est.id}`, JSON.stringify(r.morse));
  comprobar("con el OBS apartado, FROM y la barra a tope", r.toFrom === "FROM" && Math.abs(r.desviacion ?? 0) >= 10, `${r.toFrom}, ${r.desviacion?.toFixed(1)}°`);
  // Y la tarjeta, con la barra del lado en que está la de verdad (H26f).
  comprobar(
    "la tarjeta dibuja la barra a tope del lado en que está",
    r.tarjeta === `cdi-a-la-${(r.desviacion ?? 0) >= 0 ? "derecha" : "izquierda"}`,
    `barra ${r.desviacion?.toFixed(1)}°, tarjeta ${r.tarjeta}`,
  );
  await foto("02-sintonizada");

  // El OBS, de grado en grado, hacia donde se centra la barra.
  for (let i = 0; i < 80 && r.ejercicio.fase === "centrar"; i++) {
    await page.keyboard.press(r.desviacion !== null && r.desviacion < 0 ? "Digit0" : "Digit9");
    await pausa(120);
    r = await leer(page);
  }
  const alCentrar = r;
  comprobar(
    "la barra centrada con FROM: el OBS es el radial que marca la radio",
    r.ejercicio.fase === "girar" && Math.abs(centrado(r.curso - r.radial)) < 1.5,
    `OBS ${r.curso}, radial ${r.radial?.toFixed(2)}, barra ${r.desviacion?.toFixed(2)}°, ${r.toFrom}`,
  );
  await pausa(600);
  await foto("03-centrada-from");

  // Un cuarto de vuelta hacia la radio, con el automático.
  await page.evaluate(() => globalThis.__oga.pilotoAutomatico(true));
  const haciaLaRadio = Math.atan2(est.x - r.x, -(est.z - r.z));
  await rumboAlAutomatico(page, haciaLaRadio);
  const fin1 = Date.now() + 90000;
  while (Date.now() < fin1 && r.ejercicio.fase === "girar") {
    await pausa(250);
    r = await leer(page);
  }
  const giro = Math.abs(centrado((r.rumbo - alCentrar.rumbo) / GRADO));
  const seMovio = Math.abs((r.desviacion ?? 99) - (alCentrar.desviacion ?? 0));
  comprobar(
    "gira un cuarto de vuelta y la barra casi no se mueve",
    r.ejercicio.fase === "aLaRadio" && giro >= 80 && seMovio < 3,
    `el morro ${giro.toFixed(0)}°, la barra ${seMovio.toFixed(2)}°, el radial de ${alCentrar.radial?.toFixed(1)} a ${r.radial?.toFixed(1)}`,
  );
  await foto("04-tras-el-giro");

  // Que pida volver a la radio, y el OBS media vuelta con la tecla apretada.
  const fin2 = Date.now() + 30000;
  while (Date.now() < fin2 && r.tarjeta !== "cdi-to") {
    await pausa(300);
    r = await leer(page);
  }
  comprobar("pide volver a la radio, con el CDI y TO en la tarjeta", r.tarjeta === "cdi-to", `tarjeta ${r.tarjeta}`);
  const destino = ((alCentrar.curso + 180 - 1) % 360) + 1;
  const tecla = centrado(destino - r.curso) > 0 ? "Digit0" : "Digit9";
  for (let i = 0; i < 400 && r.curso !== destino; i++) {
    await page.keyboard.down(tecla);
    if (i % 10 === 9) r = await leer(page);
  }
  await page.keyboard.up(tecla);
  r = await leer(page);
  for (let i = 0; i < 10 && r.curso !== destino; i++) {
    await page.keyboard.press(centrado(destino - r.curso) > 0 ? "Digit0" : "Digit9");
    r = await leer(page);
  }
  comprobar("con la tecla apretada el OBS da media vuelta, y dice TO", r.curso === destino && r.toFrom === "TO", `OBS ${r.curso}, ${r.toFrom}`);

  // A la radio con la barra, y el reloj por ocho.
  const puestas = await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
  console.log(`    reloj por ${puestas}`);
  let bandera = false;
  let cerrada = null;
  const fin3 = Date.now() + 8 * 60000;
  while (Date.now() < fin3) {
    r = await leer(page);
    const queda = Math.hypot(est.x - r.x, est.z - r.z);
    if (r.desviacion !== null && r.toFrom === "TO") {
      const mag = r.curso + Math.max(-30, Math.min(30, 3 * r.desviacion));
      await rumboAlAutomatico(page, (mag - r.declinacion) * GRADO);
    }
    if (!bandera && r.bandera && queda < 3 * 1852) {
      bandera = true;
      await foto("05-bandera-encima");
    }
    if (r.ejercicio.fase === "cerrada") {
      cerrada = r;
      await foto("06-from-al-otro-lado");
      break;
    }
    await pausa(120);
  }
  comprobar("sale la bandera encima de la radio", bandera && cerrada?.ejercicio.vioLaBandera, `queda la bandera: ${cerrada?.ejercicio.vioLaBandera}`);
  comprobar("se acaba al pasar, con FROM", cerrada?.ejercicio.cierre === "hecho" && cerrada.toFrom === "FROM", cerrada ? `${cerrada.toFrom}, radial ${cerrada.radial?.toFixed(1)}` : "no llegó");
  // Nada que no sea del ejercicio (H26f): ni la fase del plan, ni la torre, ni la frecuencia, ni la ventanilla.
  await ajeno.comprobar(page, comprobar, /^cdi-/);
  // El panel del final, con la traza en el plano: ocho segundos y medio de juego después.
  await pausa(4000);
  await foto("07-final");
  comprobar("sin errores en la página", errores.length === 0, errores.join(" | "));
  await contexto.close();
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

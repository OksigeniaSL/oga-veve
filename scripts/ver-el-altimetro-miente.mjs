/**
 * **«El altímetro miente», volado en el juego** (#51, ADR 0031, enmienda
 * H26p): La Palma, la avioneta, de Lanzarote con su presión hacia la Cumbre
 * Nueva.
 *
 *   node scripts/ver-el-altimetro-miente.mjs <carpeta>
 *
 * El piloto de banco hace lo que hace quien vuela: el automático con el rumbo
 * del camino y **la aguja** en la altura pedida —la altitud que le pide es la
 * de verdad en la que la aguja marca la pedida con la ventanilla que lleve—.
 * Dos variantes:
 *
 * - sin `OGA_PONER`, la rueda no se toca: se pasa la cima ochenta metros más
 *   bajo de lo que dice la aguja, la instructora lo hace ver cerca y el
 *   cierre es para volver a intentar;
 * - con `OGA_PONER=1`, al dar la presión de acá se gira la rueda **con el
 *   dedo en el cuadro plano** —la mitad izquierda de la ventanilla, un toque
 *   por hectopascal— hasta ponerla, y la última muesca con la tecla: la aguja
 *   baja lo que mentía, el automático vuelve a la pedida y se pasa con el
 *   margen entero.
 *
 * En las dos, además, la rueda **desde el asiento**: en la cabina 3D, un
 * toque en la mitad derecha de la esfera del altímetro sube la ventanilla y
 * uno en la izquierda la baja, por el mismo camino que el dedo del juego
 * (`pulsarElMando`). Capturas desde fuera y desde la cabina. El puerto,
 * `OGA_PUERTO`; el peldaño, `OGA_TRAMO` (Taguató); el avión, `OGA_AVION`
 * (jaz-20); el reloj, por `OGA_VECES` (cuatro); con `OGA_GPU=1`, con la
 * tarjeta de verdad.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";
import { vigilarLoAjeno } from "./lo-ajeno-al-ejercicio.mjs";

const SALIDA = process.argv[2] ?? "capturas-altimetro";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5686);
const AVION = process.env.OGA_AVION ?? "jaz-20";
const TRAMO = process.env.OGA_TRAMO ?? "taguato";
const VECES = Number(process.env.OGA_VECES ?? 4);
const PONER = process.env.OGA_PONER === "1";
const CON_GPU = process.env.OGA_GPU === "1";
const NOMBRE = `la-palma-${PONER ? "poniendo" : "sin-poner"}-${AVION}-${TRAMO}`;
const PIE = 0.3048;
const METROS_POR_HPA = 8.23;

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
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok: !!ok });
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? `  —  ${detalle}` : ""}`);
};

const leerSolo = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const s = o.estado();
    const qnh = document.querySelector("[data-qnh]");
    return {
      x: s.position.x,
      z: s.position.z,
      y: s.position.y,
      rumbo: s.heading,
      ejercicio: o.altimetro(),
      tarjeta: o.tarjeta?.()?.dibujo ?? null,
      textoDeLaTarjeta: document.querySelector(".senal")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      ventanilla: qnh?.textContent?.trim() ?? null,
      ventanillaMal: !!qnh?.classList.contains("esfera__qnh--mal"),
    };
  });

const ajeno = vigilarLoAjeno();
let dichoMientras = null;
const leer = async (page) => {
  const r = await leerSolo(page);
  const abierto = r.ejercicio && r.ejercicio.fase !== "cerrada";
  await ajeno.mirar(page, abierto);
  if (abierto) dichoMientras = await page.evaluate(() => globalThis.__oga.dichoTodo());
  return r;
};

/** El automático: el rumbo del camino y la altitud de verdad en la que la aguja marca la pedida. */
const sostenerLaAguja = (page, c, puesta, delSitio) =>
  page.evaluate(
    ({ rumbo, altitud }) => {
      const j = globalThis.__oga.juegoParaTrazas();
      if (j.objetivos) j.objetivos = { ...j.objetivos, rumbo, altitud };
    },
    { rumbo: c.rumbo, altitud: c.pedida * PIE - (puesta - delSitio) * METROS_POR_HPA },
  );

/** **La rueda desde el asiento**: un toque en la esfera del altímetro de la cabina 3D, a un lado de su centro. */
const tocarLaEsfera = (page, lado) =>
  page.evaluate((lado) => {
    const j = globalThis.__oga.juegoParaTrazas();
    const relojes = j.aircraftMesh?.relojes;
    const alt = relojes?.hay.find((h) => h.que === "alt");
    if (!alt) return { tocado: false, por: "sin esfera de altímetro" };
    let malla = null;
    j.aircraftMesh.grupo?.traverse?.((o) => {
      if (o.uuid === alt.uuid) malla = o;
    });
    if (!malla) j.scene.traverse((o) => {
      if (o.uuid === alt.uuid) malla = o;
    });
    if (!malla) return { tocado: false, por: "sin malla" };
    malla.geometry.computeBoundingBox();
    const caja = malla.geometry.boundingBox;
    const centro = caja.getCenter(caja.min.clone());
    const P = centro.constructor;
    // Un cuarto del ancho hacia el lado, en la cara de la esfera: el eje más largo de los dos de la cara.
    const tam = caja.getSize(new P());
    const ejes = [
      ["x", tam.x],
      ["y", tam.y],
      ["z", tam.z],
    ].sort((a, b) => b[1] - a[1]);
    const puntos = [];
    for (const signo of [-1, 1]) {
      const p = centro.clone();
      p[ejes[0][0]] += (signo * ejes[0][1]) / 4;
      malla.localToWorld(p);
      p.project(j.camera);
      puntos.push({ x: p.x, y: p.y });
    }
    // El de la izquierda de la pantalla baja; el de la derecha sube.
    puntos.sort((a, b) => a.x - b.x);
    const p = lado < 0 ? puntos[0] : puntos[1];
    const antes = j.qnhPuesta;
    j.pulsarElMando(p.x, p.y);
    return { tocado: true, antes, despues: j.qnhPuesta, en: p };
  }, lado);

let codigo = 0;
try {
  console.log(`\n${NOMBRE}`);
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: false });
  const page = await contexto.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(`${BASE}/?escenario=la-palma&hora=12&tramo=${TRAMO}&avion=${AVION}&ejercicio=altimetro`);
  await page.waitForFunction(() => globalThis.__oga?.altimetro?.()?.colocacion != null, null, { timeout: 120000 });
  await pausa(3000);
  await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
  const foto = async (n) => {
    const ruta = `${SALIDA}/${NOMBRE}-${n}.png`;
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
  const c = r.ejercicio.colocacion;
  comprobar(
    "empieza sobre el mar, hacia la Cumbre Nueva, con la ventanilla de Lanzarote",
    r.ejercicio.puesta === c.puesta && c.puesta - c.delSitio === 10 && Math.hypot(r.x - c.x, r.z - c.z) < 1500,
    `cima ${c.cima.cota.toFixed(0)} m en x ${c.cima.x.toFixed(0)}, pedida ${c.pedida} ft, ventanilla ${r.ejercicio.puesta} con ${r.ejercicio.delSitio.toFixed(1)} aquí`,
  );
  comprobar(
    "la aguja marca la pedida y de verdad se va doscientos setenta pies más bajo",
    Math.abs(r.ejercicio.indicada / PIE - c.pedida) < 60 && Math.abs((r.ejercicio.indicada - r.ejercicio.altitud) / PIE - 270) < 5,
    `aguja ${(r.ejercicio.indicada / PIE).toFixed(0)} ft, de verdad ${(r.ejercicio.altitud / PIE).toFixed(0)} ft`,
  );
  comprobar(
    "la ventanilla del cuadro dice 1023, en ámbar",
    r.ventanilla === String(c.puesta) && r.ventanillaMal,
    `«${r.ventanilla}», ámbar ${r.ventanillaMal}`,
  );
  comprobar("la tarjeta escribe de dónde se viene y el plan", /Lanzarote · QNH 1023 · ALT \d+ ft/.test(r.textoDeLaTarjeta), `«${r.textoDeLaTarjeta.slice(0, 110)}» (${r.tarjeta})`);
  await foto("01-salida");

  // ── La rueda desde el asiento: arriba y abajo, y queda donde estaba ──
  await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
  await pausa(1200);
  const sube = await tocarLaEsfera(page, 1);
  const baja = await tocarLaEsfera(page, -1);
  comprobar(
    "desde el asiento, la esfera del altímetro gira la rueda: derecha sube, izquierda baja",
    sube.tocado && baja.tocado && sube.despues === sube.antes + 1 && baja.despues === baja.antes - 1,
    `${JSON.stringify(sube)} / ${JSON.stringify(baja)}`,
  );
  await foto("02-cabina-salida");
  await page.evaluate(() => globalThis.__oga.ponerVista("chase"));

  await page.evaluate(() => globalThis.__oga.pilotoAutomatico(true));
  await sostenerLaAguja(page, c, r.ejercicio.puesta, r.ejercicio.delSitio);
  const puestas = await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
  console.log(`    reloj por ${puestas}`);

  const tarjetas = [];
  let fotoCerca = false;
  let fotoPuesta = false;
  let girando = false;
  let masBajo = Infinity;
  const fin = Date.now() + 15 * 60000;
  while (Date.now() < fin && r.ejercicio.fase !== "cerrada") {
    await pausa(400);
    r = await leer(page);
    if (r.tarjeta && tarjetas[tarjetas.length - 1] !== r.tarjeta) tarjetas.push(r.tarjeta);
    masBajo = Math.min(masBajo, r.ejercicio.sobreElSuelo);
    if (PONER && r.ejercicio.qnh !== null && !girando) {
      girando = true;
      // Con el dedo en el cuadro plano: un toque por hectopascal, en la mitad que baja.
      await page.evaluate(() => globalThis.__oga.acelerar(1));
      const diana = page.locator('[data-radio-mando="qnh"][data-paso="-1"]').first();
      for (let i = 0; i < 9; i++) {
        await diana.click({ force: true });
        await pausa(120);
      }
      // Y la última muesca, con la tecla.
      await page.keyboard.press("KeyU");
      await pausa(300);
      r = await leer(page);
      comprobar(
        "con el dedo y la tecla la ventanilla llega a la presión de acá, y deja el ámbar",
        r.ejercicio.puesta === r.ejercicio.qnh && !r.ventanillaMal && r.ventanilla === String(r.ejercicio.qnh),
        `ventanilla ${r.ejercicio.puesta} («${r.ventanilla}», ámbar ${r.ventanillaMal}), QNH ${r.ejercicio.qnh}`,
      );
      comprobar(
        "y la aguja dice la verdad",
        Math.abs(r.ejercicio.indicada - r.ejercicio.altitud) < METROS_POR_HPA * 1.01,
        `aguja ${(r.ejercicio.indicada / PIE).toFixed(0)} ft, de verdad ${(r.ejercicio.altitud / PIE).toFixed(0)} ft`,
      );
      await foto("03-puesta");
      await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
    }
    await sostenerLaAguja(page, c, r.ejercicio.puesta, r.ejercicio.delSitio);
    const aLaCima = Math.hypot(c.cima.x - r.x, c.cima.z - r.z);
    if (!fotoPuesta && PONER && r.ejercicio.puestaEn !== null && aLaCima < 4000) {
      fotoPuesta = true;
      await page.evaluate(() => globalThis.__oga.acelerar(1));
      await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
      await pausa(800);
      await foto("04-cabina-hacia-la-cima");
      await page.evaluate(() => globalThis.__oga.ponerVista("izquierda"));
      await pausa(800);
      await foto("05-de-lado-hacia-la-cima");
      await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
      await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
    }
    if (!fotoCerca && !PONER && aLaCima < 2400) {
      fotoCerca = true;
      await page.evaluate(() => globalThis.__oga.acelerar(1));
      await pausa(600);
      r = await leer(page);
      await foto("04-cerca");
      await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
      await pausa(800);
      await foto("05-cabina-cerca");
      await page.evaluate(() => globalThis.__oga.ponerVista("izquierda"));
      await pausa(800);
      await foto("06-de-lado-cerca");
      await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
      comprobar(
        "cerca y sin poner, la tarjeta del avión más bajo que la aguja, con las dos cifras",
        tarjetas.includes("altimetro-miente") && /La aguja: \d+ ft sobre el cerro\. De verdad: \d+ ft/.test(r.textoDeLaTarjeta),
        `«${r.textoDeLaTarjeta.slice(0, 110)}» (${r.tarjeta})`,
      );
      await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
    }
  }
  await page.evaluate(() => globalThis.__oga.acelerar(1));
  console.log(`    tarjetas: ${tarjetas.join(", ")}`);
  const e = r.ejercicio;
  if (PONER) {
    comprobar("pasada la cima con la rueda puesta: hecho", e.cierre === "hecho" && e.conLaRuedaPuesta, `${e.cierre}`);
    comprobar(
      "y con el margen entero, los mil pies",
      e.margen / PIE > 950,
      `margen de verdad ${(e.margen / PIE).toFixed(0)} ft, la aguja decía ${(e.creido / PIE).toFixed(0)} ft`,
    );
  } else {
    comprobar("pasada la cima sin poner la rueda: para volver a intentar", e.cierre === "sinPoner" && e.conLaRuedaPuesta === false, `${e.cierre}`);
    comprobar(
      "y doscientos setenta pies menos de lo que decía la aguja",
      Math.abs((e.creido - e.margen) / PIE - 270) < 15 && e.margen / PIE < 900,
      `margen de verdad ${(e.margen / PIE).toFixed(0)} ft, la aguja decía ${(e.creido / PIE).toFixed(0)} ft`,
    );
  }
  comprobar("sin susto: nunca a menos de cien metros del suelo", masBajo > 100, `${masBajo.toFixed(0)} m como mucho cerca`);
  const dicho = await page.evaluate(() => globalThis.__oga.dichoTodo());
  const delAltimetro = (dicho.instructor ?? []).filter((k) => /^ejercicio\.altimetro\./.test(k));
  console.log(`    la instructora: ${delAltimetro.join(", ") || "nada"}`);
  const esperado = PONER
    ? ["ejercicio.altimetro.antes", "ejercicio.altimetro.qnh", "ejercicio.altimetro.puesto", "ejercicio.altimetro.pasaste"]
    : ["ejercicio.altimetro.antes", "ejercicio.altimetro.qnh", "ejercicio.altimetro.cerca", "ejercicio.altimetro.pasasteSinPoner"];
  comprobar("la instructora dice lo suyo, en su orden", esperado.every((k, i) => delAltimetro[i] === k), delAltimetro.join(", "));
  const maquina = await page.evaluate(() => globalThis.__oga.maquina());
  const cantos = maquina.filter((k) => /terrain|pull|sink|minimums/i.test(k));
  comprobar("y ninguna caja canta terreno: la avioneta no la lleva", cantos.length === 0, cantos.join(", ") || `${maquina.length} cantos de la máquina`);
  await ajeno.comprobar(page, comprobar, /^altimetro-/, /^vuelo\.baches/, dichoMientras);
  await foto("07-pasada");
  await pausa(10000);
  await foto("08-final");
  const final = await page.evaluate(() => document.querySelector('[data-hud="fin"]')?.textContent?.replace(/\s+/g, " ").trim() ?? "");
  comprobar("el panel del final lleva la regla", /De alta a baja, ojo con la caja/.test(final), `«${final.slice(0, 140)}»`);
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

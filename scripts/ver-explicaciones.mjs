/**
 * **Tocar una pieza del cuadro y que se explique**, mirado y medido.
 *
 * Existe por el 117 y por la pregunta del 204, con una captura delante: «¿qué
 * significa ese arco?». Saca las fotos de la ventana de una explicación y del
 * rincón de las curiosidades, en el portátil y en el teléfono tumbado, y
 * comprueba lo que una foto no dice:
 *
 * 1. **Que el toque llega**: un clic de ratón encima de la pantalla de
 *    navegación —que deja pasar el dedo al mundo— abre su explicación.
 * 2. **Que arrastrar sigue siendo mirar**: el mismo gesto con el dedo
 *    movido no abre nada.
 * 3. **Que en el teléfono el dedo también llega**: un toque de verdad, con
 *    pantalla táctil, en la barra de la GS de rodar de su losa.
 * 4. **Que el T/D y el «TCAS STBY» se leen**: su letra, medida en píxeles de
 *    pantalla, en el portátil y en la pantalla grande del teléfono.
 *
 * Uso: `node scripts/ver-explicaciones.mjs carpeta`. Con `OGA_GPU=1`, con la
 * tarjeta de verdad, que es como hay que mirar lo que se ve.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";

const FOTOS = process.argv[2];
if (!FOTOS) {
  console.error("  uso: node scripts/ver-explicaciones.mjs carpeta");
  process.exit(2);
}
mkdirSync(FOTOS, { recursive: true });
const CON_GPU = process.env.OGA_GPU === "1";
const PUERTO = 5349;

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

const fallos = [];
const comprobar = (nombre, ok, detalle = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  if (!ok) fallos.push(nombre);
};

/** Abre el juego y espera al avión de verdad. */
async function abrir(opciones, consulta) {
  const page = await navegador.newPage(opciones);
  page.on("pageerror", (e) => console.log("  ERROR:", e.message));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(`${BASE}/?${consulta}`);
  await page.bringToFront();
  await page.waitForFunction(() => globalThis.__oga?.aeronave?.().deVerdad === true, null, {
    timeout: 120000,
  });
  // El cuadro abierto, también en el teléfono, que nace recogido.
  await page.evaluate(() => {
    const cuadro = document.querySelector('[data-hud="cuadro"]');
    if (!cuadro?.classList.contains("cuadro--bajado")) return;
    document
      .querySelector('[data-hud="cuadro-tirador"]')
      ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  });
  if (CON_GPU) {
    const tarjeta = await page.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl");
      const i = gl?.getExtension("WEBGL_debug_renderer_info");
      return i ? gl.getParameter(i.UNMASKED_RENDERER_WEBGL) : "?";
    });
    console.log(`  tarjeta: ${tarjeta}`);
  }
  return page;
}

/** Lo que enseña la ventana ahora: si está abierta y cuál. */
const laVentana = (page) =>
  page.evaluate(() => {
    const v = document.getElementById("explicacion");
    return { abierta: !!v && !v.hidden, cual: v?.dataset.abierta ?? null };
  });

const cerrarLaVentana = (page) =>
  page.evaluate(async () => {
    const m = await import("/src/ui/explicaciones.ts");
    m.cerrarExplicacion();
  });

/** La letra de un rótulo, en píxeles de pantalla. */
const letraDe = (page, sel) =>
  page.evaluate((s) => {
    const el = [...document.querySelectorAll(s)].find(
      (e) => e.getBoundingClientRect().height > 0,
    );
    if (!el) return null;
    return +el.getBoundingClientRect().height.toFixed(1);
  }, sel);

try {
  /* ── El portátil: el JAZ 90 en el peldaño de las cifras ── */
  const portatil = await abrir(
    { viewport: { width: 1600, height: 900 } },
    "escenario=tenerife-norte&hora=12&leccion=despegue&tramo=taguato&avion=jaz-90",
  );
  await portatil.waitForTimeout(2500);
  // En tierra, el TCAS en espera: el rótulo de la carta tiene que leerse.
  const stby = await letraDe(portatil, '[data-carta="solo-ta"]');
  comprobar("portátil: «TCAS STBY» se lee en tierra", stby !== null && stby >= 10, `${stby} px`);
  await portatil.screenshot({ path: `${FOTOS}/portatil-en-tierra.png` });

  // Un clic de ratón encima de la pantalla de navegación: pasa al mundo y explica.
  const nd = await portatil.evaluate(() => {
    const r = document.querySelector('[data-fondo="nd"]')?.getBoundingClientRect();
    return r ? { x: r.left + r.width * 0.2, y: r.top + r.height * 0.85 } : null;
  });
  if (nd) {
    // Primero un arrastre: eso es mirar alrededor, no pedir una explicación.
    await portatil.mouse.move(nd.x, nd.y);
    await portatil.mouse.down();
    await portatil.mouse.move(nd.x + 60, nd.y - 10, { steps: 6 });
    await portatil.mouse.up();
    const trasArrastrar = await laVentana(portatil);
    comprobar("portátil: arrastrar encima del cuadro no abre nada", !trasArrastrar.abierta);
    await portatil.mouse.click(nd.x, nd.y);
    await portatil.waitForTimeout(400);
    const v = await laVentana(portatil);
    comprobar("portátil: un clic en la carta abre su explicación", v.cual === "carta", `${v.cual}`);
    await portatil.screenshot({ path: `${FOTOS}/portatil-carta-en-tierra.png` });
    await cerrarLaVentana(portatil);
  } else comprobar("portátil: hay pantalla de navegación", false);

  // En el aire, con el plan: el T/D en la carta, su rótulo y su explicación.
  await portatil.evaluate(() => {
    const o = globalThis.__oga;
    const a = o.avion();
    const { x, z } = o.estado().position;
    o.pilotar((c) => {
      c.engineOn = true;
      c.throttle = 0.75;
      c.elevator = 0;
      c.aileron = 0;
    });
    o.colocar(x, o.suelo(x, z) + 3000, z, (a.aproximacion ?? 70) * 1.8);
  });
  await portatil.waitForTimeout(4000);
  const td = await letraDe(portatil, ".cr__td-rotulo");
  console.log(`  portátil: el rótulo del T/D, ${td ?? "sin T/D en la carta"} px`);
  if (td !== null) comprobar("portátil: el T/D se lee", td >= 12, `${td} px`);
  await portatil.evaluate(async () => {
    const m = await import("/src/ui/explicaciones.ts");
    m.abrirExplicacion("td");
  });
  await portatil.waitForTimeout(400);
  await portatil.screenshot({ path: `${FOTOS}/portatil-ventana-td.png` });
  await portatil.evaluate(async () => {
    const m = await import("/src/ui/explicaciones.ts");
    m.abrirExplicacion("tcas");
  });
  await portatil.waitForTimeout(300);
  await portatil.screenshot({ path: `${FOTOS}/portatil-ventana-tcas.png` });
  await portatil.evaluate(async () => {
    const m = await import("/src/ui/explicaciones.ts");
    m.abrirCuriosidades();
  });
  await portatil.waitForTimeout(300);
  const rincon = await laVentana(portatil);
  comprobar("portátil: el rincón de las curiosidades se abre", rincon.cual === "curiosidades");
  await portatil.screenshot({ path: `${FOTOS}/portatil-curiosidades.png` });
  // Y desde el rincón, una curiosidad.
  await portatil.click('[data-explica-abre="mascaras"]');
  await portatil.waitForTimeout(300);
  const mascaras = await laVentana(portatil);
  comprobar("portátil: tocar una curiosidad la abre", mascaras.cual === "mascaras", `${mascaras.cual}`);
  await portatil.screenshot({ path: `${FOTOS}/portatil-curiosidad-mascaras.png` });
  await cerrarLaVentana(portatil);
  await portatil.close();

  /* ── Guyrami: sin una letra, el dibujo solo ── */
  const pequenos = await abrir(
    { viewport: { width: 1600, height: 900 } },
    "escenario=tenerife-norte&hora=12&leccion=despegue&tramo=guyrami&avion=jaz-90",
  );
  await pequenos.waitForTimeout(2000);
  await pequenos.evaluate(async () => {
    const m = await import("/src/ui/explicaciones.ts");
    m.abrirExplicacion("altitud");
  });
  await pequenos.waitForTimeout(300);
  const letras = await pequenos.evaluate(() => {
    const v = document.getElementById("explicacion");
    const texto = v?.querySelector(".explica__texto")?.textContent ?? "";
    return texto.length;
  });
  comprobar("guyrami: la ventana no tiene texto que leer", letras === 0, `${letras} letras`);
  await pequenos.screenshot({ path: `${FOTOS}/guyrami-ventana-altitud.png` });
  await pequenos.close();

  /* ── El teléfono tumbado, con el dedo ── */
  const telefono = await abrir(
    {
      viewport: { width: 844, height: 390 },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: true,
    },
    "escenario=tenerife-norte&hora=12&leccion=despegue&tramo=taguato&avion=jaz-90",
  );
  await telefono.waitForTimeout(2500);
  // Rodando un poco, para que la losa de la velocidad sea la GS de rodar.
  await telefono.evaluate(() => {
    globalThis.__oga.pilotar((c) => {
      c.engineOn = true;
      c.brakes = 0;
      c.throttle = 0.3;
    });
  });
  await telefono.waitForTimeout(5000);
  const barra = await telefono.evaluate(() => {
    const el = [...document.querySelectorAll('[data-hud="cuadro-tel"] [data-explica="gs-rodaje"]')].find(
      (e) => e.getBoundingClientRect().width > 0,
    );
    const r = el?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  });
  if (barra) {
    await telefono.touchscreen.tap(barra.x, barra.y);
    await telefono.waitForTimeout(400);
    const v = await laVentana(telefono);
    comprobar("teléfono: tocar la barra de rodar la explica", v.cual === "gs-rodaje", `${v.cual}`);
    const grande = await telefono.evaluate(
      () => !!document.querySelector(".cuadro--grande"),
    );
    comprobar("teléfono: y no pone grande la losa a la vez", !grande);
    await telefono.screenshot({ path: `${FOTOS}/telefono-ventana-gs-rodaje.png` });
    await cerrarLaVentana(telefono);
  } else comprobar("teléfono: se ve la barra de rodar en su losa", false);

  // La pantalla grande de la navegación: el «TCAS STBY», a tamaño de teléfono.
  await telefono.evaluate(() => {
    globalThis.__oga.pilotar((c) => {
      c.throttle = 0;
      c.brakes = 1;
    });
    document.querySelector('[data-tel-grande="rumbo"]')?.click();
  });
  await telefono.waitForTimeout(800);
  const stbyTel = await letraDe(telefono, '[data-carta="solo-ta"]');
  comprobar(
    "teléfono: «TCAS STBY» se lee en la pantalla grande",
    stbyTel !== null && stbyTel >= 10,
    `${stbyTel} px`,
  );
  await telefono.screenshot({ path: `${FOTOS}/telefono-carta-grande.png` });
  /*
   * En la pantalla grande, el rótulo del modo del TCAS se explica, y el resto
   * de la pantalla sigue siendo volver a las losas.
   */
  const rotuloTcas = await telefono.evaluate(() => {
    const r = [...document.querySelectorAll('[data-carta="solo-ta"]')]
      .map((e) => e.getBoundingClientRect())
      .find((x) => x.width > 0);
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  });
  if (rotuloTcas) {
    await telefono.touchscreen.tap(rotuloTcas.x, rotuloTcas.y);
    await telefono.waitForTimeout(400);
    const v = await laVentana(telefono);
    comprobar("teléfono: tocar «TCAS STBY» lo explica", v.cual === "tcas", `${v.cual}`);
    await telefono.screenshot({ path: `${FOTOS}/telefono-ventana-tcas-en-tierra.png` });
    await cerrarLaVentana(telefono);
  }
  const centro = await telefono.evaluate(() => {
    const r = document.querySelector('[data-hud="tablero"]')?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  });
  if (centro) {
    await telefono.touchscreen.tap(centro.x, centro.y);
    await telefono.waitForTimeout(400);
    const v = await laVentana(telefono);
    const sigue = await telefono.evaluate(() => !!document.querySelector(".cuadro--grande"));
    comprobar(
      "teléfono: tocar la pantalla grande vuelve a las losas, sin abrir nada",
      !v.abierta && !sigue,
      `${v.abierta ? `abre ${v.cual}` : "no abre"} · ${sigue ? "sigue grande" : "vuelven las losas"}`,
    );
  }
  await telefono.evaluate(async () => {
    const m = await import("/src/ui/explicaciones.ts");
    m.abrirExplicacion("td");
  });
  await telefono.waitForTimeout(300);
  await telefono.screenshot({ path: `${FOTOS}/telefono-ventana-td.png` });
  await telefono.evaluate(async () => {
    const m = await import("/src/ui/explicaciones.ts");
    m.abrirCuriosidades();
  });
  await telefono.waitForTimeout(300);
  const cerrarSeVe = await telefono.evaluate(() => {
    const b = document.querySelector('#explicacion [data-accion="cerrar"]');
    const r = b?.getBoundingClientRect();
    return !!r && r.bottom <= innerHeight && r.top >= 0;
  });
  comprobar("teléfono: en el rincón, el botón de cerrar se ve", cerrarSeVe);
  await telefono.screenshot({ path: `${FOTOS}/telefono-curiosidades.png` });
  await telefono.close();
} finally {
  await navegador.close();
  await server.close();
}

if (fallos.length) {
  console.log(`\n  ${fallos.length} sin pasar.`);
  process.exitCode = 1;
}

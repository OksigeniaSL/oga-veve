/**
 * **Las teclas que tocan, en un navegador de verdad.**
 *
 * Enrique, de El Hierro a La Gomera con el JAZ 60: «para los iniciados,
 * cuando hay que subir o bajar o poner los flaps, que en un lado aparezca la
 * tecla que hay que pulsar […] con luz en la que el niño tiene que tocar. Con
 * una opción pequeña "ya me lo aprendí, no volver a mostrar", y poder
 * recuperarlo». La lógica tiene su prueba —`flight/teclas-que-tocan.test.ts`—
 * y el dibujo la suya; lo que no ven es la pantalla: dónde cae la tarjeta,
 * si tapa algo, si la tecla de verdad la apaga, si «ya me lo aprendí» se
 * guarda de una partida a la siguiente y si los ajustes la devuelven.
 *
 * Mira, en el JAZ 60 de El Hierro:
 *
 * - **con teclado**, que los flaps salen con la F encendida entre la D y la
 *   G, que no pisan el cuadro, la columna de mandos ni los avisos, y que
 *   apretar la F de verdad la apaga;
 * - que **«ya me lo aprendí»** la retira, que sigue retirada al recargar y
 *   que **los ajustes** la devuelven;
 * - **con el dedo**, en un teléfono apaisado, que el dedo de encima cae sobre
 *   el botón del tren y que la tarjeta no pisa la palanca ni el gas;
 * - **con mando de consola**, que se dibuja el mando con su botón encendido.
 *
 * Uso: `node scripts/verificar-teclas-que-tocan.mjs`. Con `OGA_PUERTO`.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = Number(process.env.OGA_PUERTO ?? 5371);
const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok: !!ok });
  console.log(`${ok ? "✓" : "✗"} ${nombre}${detalle ? ` — ${detalle}` : ""}`);
};

const URL_DEL_VUELO = (tramo) =>
  `${BASE}/?escenario=el-hierro&hora=12&avion=jaz-60&tramo=${tramo}&teselas=0&meteo=&viento=000/00&destino=la-gomera&leccion=despegue`;

/** Arranca, pone el avión en el aire y espera a que el tutor del despegue se calle. */
async function enElAire(page, mando) {
  await page.waitForFunction(() => !!globalThis.__oga?.estado?.(), null, { timeout: 120000 });
  await page.waitForTimeout(4000);
  await page.evaluate(async (mando) => {
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 100 && !j.navegacion.plan; i++) await espera(100);
    const f0 = j.navegacion.plan.fijos[0];
    o.colocar(f0.x, o.suelo(f0.x, f0.z) + 2500 * 0.3048, f0.z, 75, 0);
    o.pedirTren(false);
    o.pedirFlaps(0);
    o.controles().throttle = 0.6;
    if (mando) j.input.ultimoMando = mando;
    /*
     * El tutor celebra el despegue unos segundos y se calla: se le deja
     * salir —tarda un fotograma en enterarse de que se vuela— y se espera a
     * que se vaya.
     */
    await espera(1500);
    for (let i = 0; i < 100 && j.hud.tutor.visible; i++) await espera(200);
    await espera(300);
  }, mando);
}

/** La tarjeta: si se ve, qué pide, qué teclas lleva y qué pisa. */
const laTarjeta = () => {
  const t = document.querySelector('[data-hud="teclas-que-tocan"]');
  const r = t?.getBoundingClientRect();
  const visible = !!t && !t.hidden && !!r && r.width > 4;
  const pisa = (a, b) =>
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  const vecinos = visible
    ? [
        '[data-hud="tablero"]',
        '[data-hud="cuadro-tel"]',
        '[data-hud="cuadro-tirador"]',
        ".hud__derecha > *",
        ".hud__arriba > *",
        ".hud__vistas > *",
        '[data-hud="pictos"]',
        '[data-hud="senal"]',
        '[data-hud="warning"]',
        '[data-hud="volumen-caja"]',
        "#tactil .pad",
      ]
        .flatMap((q) => [...document.querySelectorAll(q)])
        .filter(
          (o) =>
            !o.closest("[hidden]") &&
            getComputedStyle(o).display !== "none" &&
            getComputedStyle(o).visibility !== "hidden" &&
            o.getBoundingClientRect().width > 2 &&
            pisa(r, o.getBoundingClientRect()),
        )
        .map((o) => o.dataset.hud ?? String(o.className).slice(0, 24))
    : [];
  const letras = (clase) =>
    [...(t?.querySelectorAll(`.${clase} .tecla__letra`) ?? [])].map((e) => e.textContent);
  const boton = t?.querySelector('[data-hud="ya-me-lo-aprendi"]')?.getBoundingClientRect();
  return {
    visible,
    tecla: t?.querySelector("[data-tecla]")?.getAttribute("data-tecla") ?? null,
    mando: t?.querySelector("[data-mando]")?.getAttribute("data-mando") ?? null,
    encendidas: letras("inicio__tecla--late"),
    apagadas: letras("inicio__tecla--apagada"),
    pisa: [...new Set(vecinos)],
    fuera: visible && (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight),
    boton: boton ? [Math.round(boton.width), Math.round(boton.height)] : null,
    consola: !!t?.querySelector(".dib--consola .dib__parte--activa, .dib--consola .dib__boton.dib__parte--activa"),
  };
};

try {
  // ── Con teclado, en una tablet apaisada ─────────────────────────────
  {
    const page = await navegador.newPage({ viewport: { width: 1180, height: 820 }, locale: "es-PY" });
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(URL_DEL_VUELO("tuka"));
    await enElAire(page, "teclado");
    await page.evaluate(() => globalThis.__oga.pedirTecla("flaps"));
    await page.waitForTimeout(600);
    const flaps = await page.evaluate(laTarjeta);
    comprobar(
      "con teclado, los flaps: la F encendida entre la D y la G",
      flaps.visible && flaps.tecla === "flaps" && flaps.encendidas.join() === "F" && flaps.apagadas.join() === "D,G",
      JSON.stringify({ v: flaps.visible, t: flaps.tecla, on: flaps.encendidas, off: flaps.apagadas }),
    );
    comprobar(
      "la tarjeta no pisa el cuadro, los mandos ni los avisos, y cabe",
      flaps.visible && flaps.pisa.length === 0 && !flaps.fuera,
      flaps.pisa.join(", ") || (flaps.fuera ? "se sale" : "libre"),
    );
    comprobar(
      "«ya me lo aprendí» se toca con una yema",
      !!flaps.boton && flaps.boton[0] >= 44 && flaps.boton[1] >= 44,
      flaps.boton ? `${flaps.boton[0]}×${flaps.boton[1]}` : "no está",
    );
    if (process.env.OGA_CAPTURA) await page.screenshot({ path: `${process.env.OGA_CAPTURA}-tablet.png` });
    await page.keyboard.press("f");
    await page.waitForTimeout(500);
    const trasLaF = await page.evaluate(() => ({ t: globalThis.__oga.teclas(), visible: !document.querySelector('[data-hud="teclas-que-tocan"]').hidden }));
    comprobar("apretar la F de verdad la apaga", !trasLaF.visible && trasLaF.t.ahora === null, JSON.stringify(trasLaF));

    // «Ya me lo aprendí», guardado y devuelto por los ajustes.
    await page.evaluate(() => globalThis.__oga.pedirTecla("tren"));
    await page.waitForTimeout(500);
    await page.click('[data-hud="ya-me-lo-aprendi"]');
    await page.waitForTimeout(300);
    const aprendida = await page.evaluate(() => {
      globalThis.__oga.pedirTecla("tren");
      return globalThis.__oga.teclas();
    });
    await page.waitForTimeout(300);
    const otraVez = await page.evaluate(laTarjeta);
    comprobar(
      "«ya me lo aprendí» la retira, y no vuelve a salir",
      aprendida.aprendidas === 1 && aprendida.ahora === null && !otraVez.visible,
      JSON.stringify(aprendida),
    );
    // Lo guardado se escribe con freno: se da tiempo antes de recargar.
    await page.waitForTimeout(2500);
    await page.reload();
    await enElAire(page, "teclado");
    const trasRecargar = await page.evaluate(() => {
      globalThis.__oga.pedirTecla("tren");
      return globalThis.__oga.teclas();
    });
    comprobar(
      "y sigue retirada al recargar: se guarda en el perfil",
      trasRecargar.aprendidas === 1 && trasRecargar.ahora === null,
      JSON.stringify(trasRecargar),
    );
    const ajustes = await page.evaluate(async () => {
      const j = globalThis.__oga.juegoParaTrazas();
      j.ajustesUI.abrir();
      await new Promise((r) => setTimeout(r, 300));
      const linea = !!document.querySelector('[data-ajuste-linea="teclas-que-tocan"]');
      document.querySelector('[data-accion="teclas-que-tocan"]')?.click();
      await new Promise((r) => setTimeout(r, 300));
      const sigue = !!document.querySelector('[data-ajuste-linea="teclas-que-tocan"]');
      j.ajustesUI.cerrar();
      globalThis.__oga.pedirTecla("tren");
      return { linea, sigue, t: globalThis.__oga.teclas() };
    });
    comprobar(
      "los ajustes ofrecen recuperarlas y las devuelven todas",
      ajustes.linea && !ajustes.sigue && ajustes.t.aprendidas === 0 && ajustes.t.ahora === "tren",
      JSON.stringify(ajustes),
    );
    // Con mando de consola, el mando con su botón encendido.
    await page.evaluate(() => {
      globalThis.__oga.juegoParaTrazas().input.ultimoMando = "consola";
    });
    await page.waitForTimeout(400);
    const conMando = await page.evaluate(laTarjeta);
    comprobar(
      "con mando de consola, el mando con el botón del tren encendido",
      conMando.visible && conMando.mando === "consola" && conMando.consola,
      JSON.stringify({ v: conMando.visible, m: conMando.mando, on: conMando.consola }),
    );
    if (errores.length) comprobar("sin errores en la página (tablet)", false, errores.slice(0, 3).join(" | "));
    await page.close();
  }

  // ── Con el dedo, en un teléfono apaisado ────────────────────────────
  for (const [ancho, alto] of [
    [915, 412],
    [780, 360],
  ]) {
    const page = await navegador.newPage({
      viewport: { width: ancho, height: alto },
      hasTouch: true,
      isMobile: true,
      locale: "es-PY",
    });
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(URL_DEL_VUELO("guyrami"));
    await enElAire(page, "dedo");
    await page.evaluate(() => globalThis.__oga.pedirTecla("tren"));
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => {
      const t = (() => {
        const el = document.querySelector('[data-hud="teclas-que-tocan"]');
        return { visible: !el.hidden, mando: el.querySelector("[data-mando]")?.getAttribute("data-mando") };
      })();
      const dedo = document.querySelector(".ttq__dedo");
      const boton = document.querySelector('[data-hud="tren-touch"]');
      const d = dedo.getBoundingClientRect();
      const b = boton.getBoundingClientRect();
      const lejos = Math.hypot(d.left + d.width / 2 - (b.left + b.width / 2), d.top + 6 - (b.top + b.height / 2));
      return { ...t, dedo: !dedo.hidden, lejos: Math.round(lejos), senalado: boton.classList.contains("ttq--senalado") };
    });
    const tarjeta = await page.evaluate(laTarjeta);
    comprobar(
      `con el dedo (${ancho}×${alto}): el dedo cae sobre el botón del tren, que se enciende`,
      r.visible && r.mando === "dedo" && r.dedo && r.lejos < 30 && r.senalado,
      JSON.stringify(r),
    );
    comprobar(
      `con el dedo (${ancho}×${alto}): la tarjeta no pisa la palanca, el gas ni el cuadro`,
      tarjeta.visible && tarjeta.pisa.length === 0 && !tarjeta.fuera,
      tarjeta.pisa.join(", ") || (tarjeta.fuera ? "se sale" : "libre"),
    );
    if (process.env.OGA_CAPTURA) await page.screenshot({ path: `${process.env.OGA_CAPTURA}-telefono-${ancho}.png` });
    if (errores.length) comprobar(`sin errores en la página (${ancho}×${alto})`, false, errores.slice(0, 3).join(" | "));
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

const malas = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - malas.length}/${resultados.length} en verde`);
process.exit(malas.length ? 1 : 0);

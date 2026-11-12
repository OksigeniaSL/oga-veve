/**
 * **El helicóptero en el hangar**, tocado como lo toca quien juega: el JAZ 70
 * Kirikiri'i sale en «¿Con qué volás?» de Tenerife Norte, entre el JAZ 60 y
 * el JAZ 90, con su retrato; elegido, el paso de a dónde se va desaparece —vuela
 * por casa—, «¿A qué jugás?» ofrece su vuelo libre y la misión de Teno y nada
 * más, su tarjeta se abre con sus láminas, y al despegar con la misión se vuela
 * ella, desde su helipuerto, con su nombre en la insignia. Y en otro campo no
 * sale, y quien lo tenía puesto vuelve al avión de antes.
 *
 * Mira también lo que un prelector necesita: que todo lo que se toca sea
 * grande de tocar y que no haya que leer para elegir —cada ficha, su dibujo—.
 *
 * Capturas con `OGA_FOTOS=<carpeta>`, en 1280×800 y en un teléfono apaisado
 * de 844×390 con dedo.
 *
 * Uso: `OGA_PUERTO=5392 OGA_FOTOS=fotos node scripts/ver-hangar-helicoptero.mjs`
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = Number(process.env.OGA_PUERTO ?? 5392);
const FOTOS = process.env.OGA_FOTOS ?? null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await createServer({ root: process.cwd(), server: { port: PUERTO, hmr: false }, logLevel: "warn" });
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args:
    process.env.OGA_GPU === "1"
      ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
      : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok: !!ok, detalle });
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? `  —  ${detalle}` : ""}`);
};

/** El hangar abierto, con un piloto que ya ha volado y que estuvo en Tenerife Norte. */
async function abrirHangar(ancho, alto, dedo) {
  const contexto = await navegador.newContext({
    viewport: { width: ancho, height: alto },
    hasTouch: dedo,
    isMobile: dedo,
    locale: "es-PY",
  });
  const page = await contexto.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.addInitScript(() => {
    if (localStorage.getItem("oga-veve:guardado") === null) {
      localStorage.setItem("oga-veve:cuaderno", JSON.stringify({ despegues: 1, segundos: 600 }));
      localStorage.setItem("oga-veve:escenario", "tenerife-norte");
      // Y la pantalla de las teclas ya vista: se abre al empezar el primer vuelo con teclado.
      localStorage.setItem("oga-veve:teclas-vistas", "1");
    }
  });
  await page.goto(`${BASE}/`);
  await page.waitForSelector(".piloto__boton", { timeout: 60000 });
  await page.click(".piloto__boton");
  await page.waitForSelector(".ficha--sitio", { timeout: 60000 });
  await pausa(400);
  return { contexto, page, errores };
}

/** Toca, con el dedo si lo hay. */
async function tocar(page, selector, dedo) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  if (dedo) await el.tap();
  else await el.click();
  await pausa(350);
}

const foto = async (page, nombre, sufijo) => {
  if (!FOTOS) return;
  await page.screenshot({ path: `${FOTOS}/${nombre}${sufijo}.png` });
  console.log(`    foto: ${FOTOS}/${nombre}${sufijo}.png`);
};

/** Los pasos de la barra de abajo: qué dicen. */
const pasos = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll(".hangar__pasos [data-pantalla]")].map((b) => [
        b.getAttribute("data-pantalla"),
        b.querySelector(".paso__valor")?.textContent?.trim() ?? "",
      ]),
    ),
  );

/** Lo más pequeño que se toca en la pantalla, px. */
const loMasPequeno = (page) =>
  page.evaluate(() => {
    let min = Infinity;
    let cual = "";
    for (const el of document.querySelectorAll(".hangar .ficha, .hangar .paso, .hangar__despegar")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      const m = Math.min(r.width, r.height);
      if (m < min) {
        min = m;
        cual = el.className.split(" ").slice(0, 2).join(" ");
      }
    }
    return { min: Math.round(min), cual };
  });

let codigo = 1;
try {
  for (const [ancho, alto, dedo] of [
    [1280, 800, false],
    [844, 390, true],
  ]) {
    const sufijo = dedo ? "-telefono" : "";
    console.log(`\nEl hangar en ${ancho}×${alto}${dedo ? " con dedo" : ""}`);
    const { contexto, page, errores } = await abrirHangar(ancho, alto, dedo);
    comprobar("se abre en Tenerife Norte", (await pasos(page)).donde?.includes("Tenerife Norte"), (await pasos(page)).donde);

    // ── ¿Con qué volás? ─────────────────────────────────────────────────
    await tocar(page, '[data-pantalla="conque"]', dedo);
    await page.waitForSelector('[data-avion="super-puma"]', { timeout: 10000 });
    await page.waitForFunction(
      () => document.querySelector('[data-avion="super-puma"] .ficha__retrato')?.complete === true,
      null,
      { timeout: 15000 },
    );
    const fichas = await page.evaluate(() =>
      [...document.querySelectorAll("[data-avion]")].map((b) => ({
        id: b.getAttribute("data-avion"),
        nombre: b.querySelector(".ficha__nombre")?.textContent?.trim(),
        dato: b.querySelector(".ficha__dato")?.textContent?.trim(),
        retrato: (b.querySelector(".ficha__retrato")?.naturalWidth ?? 0) > 0,
        apagada: b.hasAttribute("disabled"),
      })),
    );
    const heli = fichas.find((f) => f.id === "super-puma");
    const ids = fichas.map((f) => f.id);
    comprobar(
      "sale el JAZ 70 Kirikiri'i, con su retrato, entre el JAZ 60 y el JAZ 90",
      heli?.nombre === "Kirikiri'i" &&
        heli.dato === "JAZ 70" &&
        heli.retrato &&
        !heli.apagada &&
        ids.indexOf("super-puma") === ids.indexOf("jaz-60") + 1 &&
        ids.indexOf("jaz-90") === ids.indexOf("super-puma") + 1,
      ids.join(" · "),
    );
    await page.locator('[data-avion="super-puma"]').scrollIntoViewIfNeeded();
    await foto(page, "1-con-que-volas-tenerife-norte", sufijo);

    // ── Su tarjeta, con sus láminas ─────────────────────────────────────
    await tocar(page, '[data-de-cerca="super-puma"]', dedo);
    await page.waitForSelector("#tarjeta-avion:not([hidden]) .tav", { timeout: 15000 });
    await pausa(2500);
    const tarjeta = await page.evaluate(() => {
      const raiz = document.getElementById("tarjeta-avion");
      return {
        texto: raiz?.textContent ?? "",
        laminas: [...(raiz?.querySelectorAll("img") ?? [])]
          .map((i) => i.getAttribute("src") ?? "")
          .filter((s) => /ilustraciones/.test(s)),
      };
    });
    comprobar(
      "su tarjeta se llama como en la flota y lleva sus dos láminas",
      tarjeta.texto.includes("JAZ 70 Kirikiri'i") &&
        tarjeta.laminas.some((s) => /fuera-super-puma/.test(s)) &&
        tarjeta.laminas.some((s) => /cabina-super-puma/.test(s)),
      tarjeta.laminas.map((s) => s.replace(/.*\//, "")).join(", "),
    );
    await foto(page, "2-tarjeta-en-el-hangar", sufijo);
    await page.keyboard.press("Escape");
    await pausa(600);
    comprobar("y se cierra con Escape", (await page.locator("#tarjeta-avion:not([hidden]) .tav").count()) === 0);

    // ── Elegido ─────────────────────────────────────────────────────────
    await tocar(page, '[data-avion="super-puma"]', dedo);
    await page.waitForSelector(".hangar__pasos", { timeout: 10000 });
    const conHeli = await pasos(page);
    comprobar(
      "elegido, sin paso de a dónde se va y jugando a vuelo libre",
      conHeli.conque === "Kirikiri'i" && !("adonde" in conHeli) && conHeli.que === "Vuelo libre",
      JSON.stringify(conHeli),
    );

    // ── ¿A qué jugás? ───────────────────────────────────────────────────
    await tocar(page, '[data-pantalla="que"]', dedo);
    await page.waitForSelector('[data-mision="teno"]', { timeout: 10000 });
    const que = await page.evaluate(() => ({
      fichas: [...document.querySelectorAll(".hangar__bloque .ficha")].map(
        (b) => b.getAttribute("data-leccion") ?? b.getAttribute("data-mision") ?? b.getAttribute("data-inicio-modo") ?? b.getAttribute("data-ejercicio") ?? "?",
      ),
      conDibujo: [...document.querySelectorAll(".hangar__bloque .ficha")].every((b) =>
        b.querySelector(".ficha__lienzo svg"),
      ),
      km: document.querySelector('[data-mision="teno"] .ficha__dato')?.textContent?.trim() ?? "",
    }));
    comprobar(
      "ofrece su vuelo libre y la misión de Teno, cada una con su dibujo, y nada más",
      JSON.stringify(que.fichas) === JSON.stringify(["vuelta", "teno"]) && que.conDibujo,
      `${que.fichas.join(" · ")} · Teno ${que.km}`,
    );
    const km = Number(que.km.replace(",", ".").replace(/[^\d.]/g, ""));
    comprobar("la de Teno cuenta su viaje, que acaba en Garachico y no vuelve", km > 70 && km < 80, que.km);
    const tactil = await loMasPequeno(page);
    comprobar("todo lo que se toca, grande de tocar", tactil.min >= 44, `${tactil.min} px (${tactil.cual})`);
    await foto(page, "3-a-que-jugas", sufijo);

    await tocar(page, '[data-mision="teno"]', dedo);
    await page.waitForSelector(".hangar__pasos", { timeout: 10000 });
    const conMision = await pasos(page);
    comprobar("con la misión de Teno elegida", conMision.que === "Rescate en Teno", conMision.que);
    await foto(page, "4-listo-para-despegar", sufijo);

    // ── Otro campo ──────────────────────────────────────────────────────
    if (!dedo) {
      const otro = await abrirHangar(ancho, alto, dedo);
      await tocar(otro.page, '[data-pantalla="conque"]', dedo);
      await tocar(otro.page, '[data-avion="super-puma"]', dedo);
      await tocar(otro.page, '[data-pantalla="donde"]', dedo);
      await tocar(otro.page, '[data-sitio="pettirossi"]', dedo);
      const alli = await pasos(otro.page);
      await tocar(otro.page, '[data-pantalla="conque"]', dedo);
      const hayHeli = await otro.page.locator('[data-avion="super-puma"]').count();
      comprobar(
        "en otro campo no sale, y quien lo tenía puesto vuelve al avión de antes",
        hayHeli === 0 && alli.conque !== "Kirikiri'i" && alli.conque.length > 0,
        `en ${alli.donde}: ${alli.conque}`,
      );
      comprobar("sin errores en la página, en el otro campo", otro.errores.length === 0, otro.errores.slice(0, 3).join(" | "));
      await otro.contexto.close();
    }

    // ── Y a volar ───────────────────────────────────────────────────────
    await tocar(page, "[data-despegar]", dedo);
    await page.waitForFunction(() => !!globalThis.__oga?.mision, null, { timeout: 120000 });
    await page.waitForFunction(() => (document.querySelector('[data-hud="badge"]')?.textContent ?? "").length > 0, null, {
      timeout: 60000,
    });
    await pausa(6000);
    const vuelo = await page.evaluate(() => ({
      insignia: document.querySelector('[data-hud="badge"]')?.textContent?.trim() ?? "",
      mision: globalThis.__oga.mision()?.id ?? null,
      avion: globalThis.__oga.avion?.()?.id ?? null,
    }));
    comprobar(
      "despega con la misión de Teno, y la insignia dice JAZ 70 Kirikiri'i",
      vuelo.insignia.startsWith("JAZ 70 Kirikiri'i") && vuelo.mision === "teno",
      `«${vuelo.insignia}» · misión ${vuelo.mision}`,
    );
    await foto(page, "5-pildora-en-el-vuelo", sufijo);
    comprobar("sin errores en la página", errores.length === 0, errores.slice(0, 3).join(" | "));
    await contexto.close();
  }

  const malos = resultados.filter((r) => !r.ok);
  console.log(`\n${resultados.length - malos.length} de ${resultados.length} bien`);
  codigo = malos.length ? 1 : 0;
} catch (e) {
  console.error(e);
} finally {
  await navegador.close();
  await server.close();
}
process.exit(codigo);

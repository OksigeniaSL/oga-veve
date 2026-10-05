/**
 * **La hoja de la instructora y la manga del grado**, mirados.
 *
 * Lo que se gana en cada vuelo dejó de ser barras en la manga —llegaban a
 * seis, y seis barras no las lleva ningún uniforme— y pasó a ser la hoja de
 * evaluación de la instructora, con un visto por parte bien hecha. Ver
 * `ui/hoja.ts`. Esto saca las fotos que hay que mirar para darlo por bueno,
 * en el portátil y en el teléfono tumbado:
 *
 * - la hoja en el HUD, durante el vuelo, y en el final del vuelo;
 * - la manga del HUD con las barras de cada uno de los cuatro grados, y el
 *   ascenso;
 * - el cuaderno con un día en tierra, una vuelta al avión, un despegue
 *   abortado y un vuelo con su hoja.
 *
 * Y mide lo que una foto no dice: que la manga nunca lleve más de cuatro
 * barras, que la hoja no tenga filas vacías ni tachadas, y que en el teléfono
 * el subtítulo no tape el «TCAS STBY» de la pantalla de navegación en grande.
 *
 * Uso: `node scripts/ver-hoja.mjs carpeta`. Con `OGA_GPU=1`, con la tarjeta de
 * verdad, que es como hay que mirar lo que se ve.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";

const FOTOS = process.argv[2];
if (!FOTOS) {
  console.error("  uso: node scripts/ver-hoja.mjs carpeta");
  process.exit(2);
}
mkdirSync(FOTOS, { recursive: true });
const CON_GPU = process.env.OGA_GPU === "1";
const PUERTO = 5351;

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

const SEIS = ["aproximacion", "frustrada", "toma", "aros", "velocidad", "rodaje"];
const GRADOS = [
  ["aprendiz", 1],
  ["piloto", 3],
  ["comandante", 4],
  ["instructora", 4],
];

/** Una línea de la bitácora, como la apunta el juego. */
const vuelo = (minutos, extra) => ({
  fecha: new Date(Date.UTC(2026, 9, 5, 10, minutos)).toISOString(),
  escenario: "tenerife-norte",
  leccion: "despegue",
  tramo: "guyrami",
  segundos: minutos * 60,
  galones: [],
  traza: [
    [0, 0],
    [300, 120],
    [900, 600],
  ],
  ...extra,
});

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

/** Lo que pinta el rincón de la manga y la hoja del HUD. */
const elRincon = (page) =>
  page.evaluate(() => {
    const caja = document.querySelector('[data-hud="galones"]');
    return {
      visible: !!caja && !caja.hidden,
      barras: caja?.querySelectorAll(".manga__barra").length ?? 0,
      filas: caja?.querySelectorAll(".hoja__parte").length ?? 0,
      vistos: caja?.querySelectorAll(".hoja__visto").length ?? 0,
    };
  });

/** La foto de un trozo de la pantalla: el rincón del HUD, con aire. */
async function fotoDe(page, sel, archivo) {
  const caja = await page.evaluate((s) => {
    const r = document.querySelector(s)?.getBoundingClientRect();
    return r && r.width > 0 ? { x: r.left, y: r.top, width: r.width, height: r.height } : null;
  }, sel);
  if (!caja) return;
  const aire = 12;
  await page.screenshot({
    path: archivo,
    clip: {
      x: Math.max(0, caja.x - aire),
      y: Math.max(0, caja.y - aire),
      width: caja.width + aire * 2,
      height: caja.height + aire * 2,
    },
  });
}

/** Siembra la bitácora con un día de cada, y recarga para que el juego la lea. */
async function sembrarElCuaderno(page, consulta) {
  await page.evaluate(async (vuelos) => {
    const b = await import("/src/flight/bitacora.ts");
    for (const v of vuelos) b.apuntarVuelo(v);
  }, [
    vuelo(4, { antes: { vuelta: "a-medias" }, galones: ["aros", "velocidad"] }),
    vuelo(2, { antes: { vuelta: "entera", decision: "abortado" } }),
    vuelo(12, { antes: { vuelta: "entera" }, galones: SEIS }),
    vuelo(1, { antes: { vuelta: "entera", decision: "en-tierra" }, traza: [[0, 0]] }),
  ]);
  await page.goto(`${BASE}/?${consulta}`);
  await page.waitForFunction(() => globalThis.__oga?.aeronave?.().deVerdad === true, null, {
    timeout: 120000,
  });
}

/** Pone en el HUD la manga de un grado y la hoja con tres partes. */
const conGrado = (page, clave, barras) =>
  page.evaluate(
    ([c, b]) => {
      globalThis.__oga.gradoParaBanco(b, `grado.${c}`);
      globalThis.__oga.hojaParaBanco(["aproximacion", "toma", "rodaje"]);
    },
    [clave, barras],
  );

async function mirar(nombre, opciones, tramo) {
  const consulta = `escenario=tenerife-norte&hora=12&leccion=despegue&tramo=${tramo}&avion=jaz-90&meteo=`;
  const page = await abrir(opciones, consulta);
  await page.waitForTimeout(2000);

  // Sin nada ganado, no hay rincón: ni manga ni hoja.
  const vacio = await elRincon(page);
  comprobar(`${nombre}: sin nada ganado no se enseña nada`, !vacio.visible);

  // La hoja entrando de una en una, durante el vuelo.
  await page.evaluate(() => globalThis.__oga.hojaParaBanco(["toma"]));
  await page.waitForTimeout(150);
  await page.evaluate(() => globalThis.__oga.hojaParaBanco(["toma", "aros"]));
  await page.waitForTimeout(600);
  const dos = await elRincon(page);
  comprobar(
    `${nombre}: la hoja del HUD marca lo ganado, con su visto`,
    dos.visible && dos.filas === 2 && dos.vistos === 2,
    `${dos.filas} filas, ${dos.vistos} vistos`,
  );
  await page.screenshot({ path: `${FOTOS}/${nombre}-hoja-en-vuelo.png` });
  await fotoDe(page, '[data-hud="galones"]', `${FOTOS}/${nombre}-rincon-en-vuelo.png`);

  // La manga de cada grado.
  for (const [clave, barras] of GRADOS) {
    await conGrado(page, clave, barras);
    await page.waitForTimeout(300);
    const r = await elRincon(page);
    comprobar(
      `${nombre}: la manga de ${clave} lleva ${barras}`,
      r.barras === barras && r.barras <= 4,
      `${r.barras} barras`,
    );
    await fotoDe(page, '[data-hud="galones"]', `${FOTOS}/${nombre}-manga-${clave}.png`);
  }

  // Las seis, y el final del vuelo con ellas.
  await page.evaluate(() => globalThis.__oga.gradoParaBanco(3, "grado.piloto"));
  await page.evaluate((seis) => globalThis.__oga.hojaParaBanco(seis, true), SEIS);
  await page.waitForTimeout(2200);
  const fin = await page.evaluate(() => {
    const caja = document.querySelector('[data-hud="fin-manga"]');
    return {
      barras: caja?.querySelectorAll(".manga__barra").length ?? 0,
      filas: caja?.querySelectorAll(".hoja__parte").length ?? 0,
      vistos: caja?.querySelectorAll(".hoja__visto").length ?? 0,
      panel: (() => {
        const r = document.querySelector(".fin__panel")?.getBoundingClientRect();
        return r ? { top: r.top, bottom: r.bottom, alto: innerHeight } : null;
      })(),
    };
  });
  comprobar(
    `${nombre}: el final lleva la manga del grado y la hoja entera`,
    fin.barras === 3 && fin.filas === 6 && fin.vistos === 6,
    `${fin.barras} barras, ${fin.filas} filas, ${fin.vistos} vistos`,
  );
  comprobar(
    `${nombre}: y el final cabe en la pantalla`,
    !!fin.panel && fin.panel.top >= 0 && fin.panel.bottom <= fin.panel.alto,
    fin.panel ? `de ${Math.round(fin.panel.top)} a ${Math.round(fin.panel.bottom)} en ${fin.panel.alto}` : "sin panel",
  );
  await page.screenshot({ path: `${FOTOS}/${nombre}-fin-seis.png` });
  await page.evaluate(() => document.querySelector('[data-hud="fin"]').hidden = true);

  // El ascenso de piloto a comandante, con la barra nueva entrando.
  await page.evaluate(() => globalThis.__oga.ascensoParaBanco(4, "Comandante", 3));
  await page.waitForTimeout(900);
  const ascenso = await page.evaluate(() => {
    const caja = document.querySelector('[data-hud="fin-manga"]');
    return {
      barras: caja?.querySelectorAll(".manga__barra").length ?? 0,
      nuevas: caja?.querySelectorAll(".manga__barra:not(.manga__barra--ya)").length ?? 0,
      hoja: !!caja?.querySelector(".hoja"),
    };
  });
  comprobar(
    `${nombre}: el ascenso enseña la manga nueva, y solo crece la barra nueva`,
    ascenso.barras === 4 && ascenso.nuevas === 1 && !ascenso.hoja,
    `${ascenso.barras} barras, ${ascenso.nuevas} nueva`,
  );
  await page.screenshot({ path: `${FOTOS}/${nombre}-ascenso.png` });
  await page.close();

  // El cuaderno con un día en tierra.
  const otra = await abrir(opciones, consulta);
  await sembrarElCuaderno(otra, consulta);
  await otra.evaluate(() => document.querySelector('[data-hud="cuaderno"]')?.click());
  await otra.waitForTimeout(800);
  const cuaderno = await otra.evaluate(() => {
    const hojas = [...document.querySelectorAll(".bitacora .hoja")];
    return {
      hojas: hojas.length,
      partes: hojas.map((h) => [...h.querySelectorAll(".hoja__parte")].map((p) => p.dataset.parte).join("+")),
      barrasEnLosVuelos: document.querySelectorAll(".bitacora .manga__barra").length,
    };
  });
  comprobar(
    `${nombre}: el cuaderno enseña lo de antes en cada vuelo, sin barras`,
    cuaderno.partes.some((p) => p.includes("en-tierra")) &&
      cuaderno.partes.some((p) => p.includes("abortado")) &&
      cuaderno.barrasEnLosVuelos === 0,
    cuaderno.partes.join(" · "),
  );
  await otra.evaluate(() => {
    const b = document.querySelector(".bitacora");
    b?.scrollIntoView({ block: "center" });
  });
  await otra.waitForTimeout(300);
  await otra.screenshot({ path: `${FOTOS}/${nombre}-cuaderno-con-dia-en-tierra.png` });
  await fotoDe(otra, ".bitacora", `${FOTOS}/${nombre}-cuaderno-vuelos.png`);
  await otra.close();
}

/**
 * **El «TCAS STBY» y el subtítulo**, en el teléfono: la pantalla de navegación
 * en grande, en tierra, con un subtítulo largo puesto. No se pueden tapar.
 */
async function elRotuloDelTcas() {
  const page = await abrir(
    { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
    "escenario=tenerife-norte&hora=12&leccion=despegue&tramo=taguato&avion=jaz-90&meteo=",
  );
  await page.waitForTimeout(2500);
  const medida = await page.evaluate(async () => {
    const cuadro = document.querySelector('[data-hud="cuadro"]');
    if (cuadro?.classList.contains("cuadro--bajado"))
      document
        .querySelector('[data-hud="cuadro-tirador"]')
        ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 500));
    const caja = (el) => {
      const r = el?.getBoundingClientRect();
      return r && r.width > 0 ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom } : null;
    };
    const pisa = (a, b) =>
      !!a && !!b &&
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
      Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    const hint = document.querySelector('[data-hud="hint"]');
    /*
     * El subtítulo se pone justo antes de medir, en el mismo instante: el HUD
     * lo borra en el fotograma siguiente si no lleva su cuenta atrás, y
     * medido medio segundo después ya no estaba —la prueba pasaba sin mirar—.
     */
    const medir = () => {
      hint.textContent =
        "Rodá despacio hasta el punto de espera de la pista y esperá ahí la autorización de la torre";
      const rotulo = [...document.querySelectorAll('[data-carta="solo-ta"]')]
        .map(caja)
        .find((r) => r);
      const sub = caja(hint);
      const tablero = caja(document.querySelector('[data-hud="tablero"]'));
      return { rotulo, sub, tablero, pisa: pisa(rotulo, sub) };
    };
    const normal = medir();
    document.querySelector(".tel__losa--hdg")?.click();
    await new Promise((r) => setTimeout(r, 500));
    const grande = medir();
    // Y se sujeta un rato, para que salga en la foto.
    const texto = hint.textContent;
    const sujeta = new MutationObserver(() => {
      if (!hint.textContent) hint.textContent = texto;
    });
    sujeta.observe(hint, { childList: true, characterData: true, subtree: true });
    setTimeout(() => sujeta.disconnect(), 3000);
    return { normal, grande };
  });
  const dice = (m) =>
    !m.rotulo
      ? "sin rótulo a la vista"
      : `rótulo ${Math.round(m.rotulo.top)}–${Math.round(m.rotulo.bottom)}, subtítulo ${
          m.sub ? `${Math.round(m.sub.top)}–${Math.round(m.sub.bottom)}` : "sin subtítulo"
        }${m.tablero ? `, pantalla ${Math.round(m.tablero.top)}–${Math.round(m.tablero.bottom)}` : ""}`;
  comprobar("teléfono: el subtítulo no tapa «TCAS STBY» con el cuadro abierto", !medida.normal.pisa, dice(medida.normal));
  comprobar("teléfono: ni con la pantalla de navegación en grande", !!medida.grande.rotulo && !medida.grande.pisa, dice(medida.grande));
  await page.screenshot({ path: `${FOTOS}/telefono-tcas-stby-con-subtitulo.png` });
  await page.close();
}

/** `OGA_SOLO=tcas` mira solo el rótulo del TCAS, que es lo rápido. */
const SOLO = process.env.OGA_SOLO ?? "";
try {
  if (SOLO !== "tcas") await mirar("portatil", { viewport: { width: 1600, height: 900 } }, "guyrami");
  if (SOLO !== "tcas") await mirar(
    "telefono",
    { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
    "guyrami",
  );
  if (SOLO !== "tcas") await mirar(
    "telefono-taguato",
    { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
    "taguato",
  );
  await elRotuloDelTcas();
} finally {
  await navegador.close();
  await server.close();
}
console.log(fallos.length ? `\n  ${fallos.length} sin pasar: ${fallos.join(" · ")}` : "\n  todo en su sitio");
process.exit(fallos.length ? 1 : 0);

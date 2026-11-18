/**
 * **«Apuntá al viento», volado en el juego** (#51, ADR 0031): Asunción, la
 * avioneta y el puente Remanso, con el viento típico del sitio —del 020 a
 * ocho nudos—, o en calma con `OGA_VIENTO=000/0`.
 *
 *   node scripts/ver-la-deriva.mjs <carpeta>
 *
 * El piloto de banco hace lo que pide la instructora, con el automático de
 * rumbo como quien sostiene el avión:
 *
 * - mantiene el morro en el rumbo de salida, que apunta al puente, hasta que
 *   el ejercicio dice que la raya se fue de costado;
 * - entonces apunta un poco al viento: el rumbo al puente menos lo que ve que
 *   el viento lo deriva —el camino contra el morro—, como quien mira la raya
 *   blanca, y lo sostiene hasta llegar;
 * - con `OGA_SIN_CORREGIR=1` no corrige nunca: sigue con el morro en el puente
 *   —la curva del perro— y llega igual.
 *
 * Mira que las dos rayas estén en el suelo, que lo apartado salga del viento
 * de costado por el tiempo, que **la corrección que mide el ejercicio sea la
 * del triángulo de vientos con el viento que sopla en el modelo**, y lo de
 * H26f: nada que no sea del ejercicio. Capturas desde fuera, que es desde
 * donde se ven las rayas. El puerto, `OGA_PUERTO`; el peldaño, `OGA_TRAMO`
 * (Taguató, con sus grados); el reloj, por `OGA_VECES` (cuatro); el sitio,
 * `OGA_ESCENARIO` (`pettirossi`, o `tenerife-norte` para el Auditorio con el
 * alisio y el relieve que baja hacia Santa Cruz); con `OGA_GPU=1`, con la
 * tarjeta de verdad.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync, readFileSync } from "node:fs";
import { baseDe } from "./servidor.mjs";
import { vigilarLoAjeno } from "./lo-ajeno-al-ejercicio.mjs";

const SALIDA = process.argv[2] ?? "capturas-deriva";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5686);
const AVION = process.env.OGA_AVION ?? "jaz-20";
const TRAMO = process.env.OGA_TRAMO ?? "taguato";
const VECES = Number(process.env.OGA_VECES ?? 4);
const VIENTO = process.env.OGA_VIENTO ?? null;
const SIN_CORREGIR = process.env.OGA_SIN_CORREGIR === "1";
const ESCENARIO = process.env.OGA_ESCENARIO ?? "pettirossi";
const CON_GPU = process.env.OGA_GPU === "1";
/** El sitio que le toca a cada campo: ver `sitioDeLaDeriva`. */
const SITIO = { pettirossi: ["puente-remanso", "Remanso"], "tenerife-norte": ["auditorio", "Auditorio"] }[ESCENARIO] ?? [null, ""];
const NOMBRE = `${ESCENARIO}-${VIENTO ? "calma" : "viento"}${SIN_CORREGIR ? "-sin-corregir" : ""}-${TRAMO}`;

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

const centrado = (g) => ((((g + 180) % 360) + 360) % 360) - 180;
const GRADO = Math.PI / 180;
const NUDO = 0.514444;

const leerSolo = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    const s = o.estado();
    return {
      x: s.position.x,
      z: s.position.z,
      y: s.position.y,
      rumbo: s.heading,
      camino: Math.atan2(s.velocity.x, -s.velocity.z),
      ejercicio: o.deriva(),
      tarjeta: o.tarjeta?.()?.dibujo ?? null,
      textoDeLaTarjeta: document.querySelector(".senal")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      reloj: j.clock?.elapsedTime ?? 0,
      viento: j.vientoAqui?.aire ?? { x: 0, z: 0 },
      verdadera: s.airspeed,
      pista: j.terrain?.runwayElevation ?? 0,
    };
  });

const ajeno = vigilarLoAjeno();
const leer = async (page) => {
  const r = await leerSolo(page);
  await ajeno.mirar(page, r.ejercicio && r.ejercicio.fase !== "cerrada");
  return r;
};

const rumboAlAutomatico = (page, rumbo) =>
  page.evaluate((r) => {
    const j = globalThis.__oga.juegoParaTrazas();
    if (j.objetivos) j.objetivos.rumbo = r;
  }, rumbo);

const marcacion = (r) => Math.atan2(r.ejercicio.sitio.x - r.x, -(r.ejercicio.sitio.z - r.z));
/** Lo que el viento que sopla en el modelo empuja de costado al que va por `camino`, m/s. */
const deCostado = (v, camino) => v.x * Math.cos(camino) + v.z * Math.sin(camino);

let codigo = 0;
try {
  console.log(`\n${NOMBRE}`);
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: false });
  const page = await contexto.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  const viento = VIENTO ? `&viento=${VIENTO}` : "";
  await page.goto(`${BASE}/?escenario=${ESCENARIO}&hora=12&tramo=${TRAMO}&avion=${AVION}&ejercicio=deriva${viento}`);
  await page.waitForFunction(() => globalThis.__oga?.deriva?.()?.colocacion != null, null, { timeout: 120000 });
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
  const lejos0 = Math.hypot(r.ejercicio.sitio.x - r.x, r.ejercicio.sitio.z - r.z);
  comprobar(
    "empieza en el aire, a dos minutos y medio de su sitio",
    r.ejercicio.sitio.id === SITIO[0] && r.y - r.pista > 400 && Math.abs(lejos0 - c.lejos) < 400,
    `${r.ejercicio.sitio.id}, ${(lejos0 / 1000).toFixed(1)} km de ${c.lejos.toFixed(0)} m, ${Math.round(r.y - r.pista)} m sobre la pista, rumbo ${((c.rumbo / GRADO + 360) % 360).toFixed(0)}`,
  );
  comprobar(
    "con el morro en el puente",
    Math.abs(centrado((r.rumbo - marcacion(r)) / GRADO)) < 2,
    `${centrado((r.rumbo - marcacion(r)) / GRADO).toFixed(1)}°`,
  );
  const costado0 = deCostado(r.viento, r.rumbo);
  const kt0 = Math.hypot(r.viento.x, r.viento.z) / NUDO;
  comprobar(
    VIENTO ? "en calma, sin viento" : "con el viento entero de costado",
    VIENTO ? kt0 < 0.5 : Math.abs(Math.abs(costado0) / NUDO - kt0) < 0.5 && kt0 > 4,
    `${kt0.toFixed(1)} kt, ${(costado0 / NUDO).toFixed(1)} kt de costado`,
  );
  comprobar(
    "las dos rayas en el suelo, la recta hasta el puente entera",
    r.ejercicio.rayas?.enLaEscena && r.ejercicio.rayas.recta > c.lejos / 60,
    JSON.stringify(r.ejercicio.rayas),
  );
  comprobar("la tarjeta escribe el sitio", r.textoDeLaTarjeta.includes(SITIO[1]), `«${r.textoDeLaTarjeta.slice(0, 90)}» (${r.tarjeta})`);
  /** El modelo del sitio, puesto en el mundo: ver `world/sitios-con-modelo.ts`. */
  const sitioPuesto = () =>
    page.evaluate((id) => (globalThis.__oga.sitios?.() ?? []).find((s) => s.id === id)?.estado ?? null, SITIO[0]);
  await foto("01-salida");

  await page.evaluate(() => globalThis.__oga.pilotoAutomatico(true));
  await rumboAlAutomatico(page, r.rumbo);
  const puestas = await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
  console.log(`    reloj por ${puestas}`);
  const t0 = r.reloj;

  // El morro quieto hasta que la raya se va de costado (o, en calma, a mitad de camino).
  const fin1 = Date.now() + 4 * 60000;
  while (Date.now() < fin1 && r.ejercicio.fase === "apuntar") {
    await pausa(150);
    r = await leer(page);
  }
  const ladoEsperado = Math.sign(costado0) > 0 ? "derecha" : "izquierda";
  if (!VIENTO) {
    // El reloj de la página es el de pared: el del juego va por las veces que se aceleró.
    const t = (r.reloj - t0) * puestas;
    comprobar(
      "la raya se va de costado, hacia donde empuja el viento, en lo que tarda el viento en apartarla",
      r.ejercicio.fase === "corregir" && r.ejercicio.loQueSeAparto >= 150 && Math.abs(t - 150 / Math.abs(costado0)) < 12,
      `${r.ejercicio.loQueSeAparto.toFixed(0)} m en ${t.toFixed(0)} s (el viento: ${(150 / Math.abs(costado0)).toFixed(0)} s), tarjeta ${r.tarjeta}`,
    );
    comprobar("y la tarjeta dibuja el camino yéndose de ese lado", r.tarjeta === `deriva-a-la-${ladoEsperado}`, r.tarjeta);
  } else
    comprobar("en calma, a mitad de camino lo dice, sin apartarse", r.ejercicio.fase === "llegar" && r.ejercicio.loQueSeAparto < 30, `${r.ejercicio.loQueSeAparto.toFixed(0)} m, tarjeta ${r.tarjeta}`);
  comprobar("la línea de trayectoria, tendida por delante", (r.ejercicio.rayas?.delante ?? 0) > 10, JSON.stringify(r.ejercicio.rayas));
  await foto("02-de-costado");
  comprobar("el sitio, cargado en el mundo", (await sitioPuesto()) === "puesto", String(await sitioPuesto()));

  // Al viento: el rumbo al puente menos lo que se ve que el viento deriva.
  let ventana = [];
  let fotoAlViento = false;
  let textoAlViento = "";
  const fin2 = Date.now() + 5 * 60000;
  while (Date.now() < fin2 && r.ejercicio.fase !== "cerrada") {
    r = await leer(page);
    if (!SIN_CORREGIR && !VIENTO) {
      const deriva = centrado((r.camino - r.rumbo) / GRADO);
      await rumboAlAutomatico(page, marcacion(r) - deriva * GRADO);
    } else if (SIN_CORREGIR) await rumboAlAutomatico(page, marcacion(r));
    if (r.ejercicio.fase === "corregir") {
      const gx = r.verdadera * Math.sin(r.rumbo) + r.viento.x;
      const gz = -r.verdadera * Math.cos(r.rumbo) + r.viento.z;
      const camino = Math.atan2(gx, -gz);
      ventana.push({
        medida: centrado((r.rumbo - r.camino) / GRADO),
        // El triángulo de vientos con el viento del modelo y la verdadera que se lleva.
        triangulo: -Math.asin(deCostado(r.viento, camino) / r.verdadera) / GRADO,
      });
      if (ventana.length > 120) ventana.shift();
    }
    if (!fotoAlViento && r.ejercicio.fase === "llegar" && r.ejercicio.correccion !== null) {
      fotoAlViento = true;
      textoAlViento = r.textoDeLaTarjeta;
      comprobar(
        "corregido: la tarjeta dibuja el morro al viento y el camino derecho",
        r.tarjeta === `deriva-corregida-a-la-${ladoEsperado}`,
        `${r.tarjeta}, «${textoAlViento.slice(0, 80)}»`,
      );
      await foto("03-al-viento");
    }
    await pausa(100);
  }
  comprobar("llega encima del puente y se cierra", r.ejercicio.cierre === "hecho", `${r.ejercicio.cierre}, ${r.ejercicio.llegada}`);
  comprobar(
    "cómo llegó",
    r.ejercicio.llegada === (VIENTO ? "enCalma" : SIN_CORREGIR ? "enCurva" : "derecho"),
    `${r.ejercicio.llegada}, apartado como mucho ${r.ejercicio.loQueSeAparto.toFixed(0)} m`,
  );
  if (!VIENTO && !SIN_CORREGIR) {
    const media = (k) => ventana.slice(-80).reduce((a, m) => a + m[k], 0) / Math.max(1, Math.min(80, ventana.length));
    comprobar(
      "la corrección que mide el ejercicio es la del triángulo de vientos con el viento del modelo, a menos de grado y medio",
      r.ejercicio.correccion !== null && Math.abs(r.ejercicio.correccion - media("triangulo")) < 1.5,
      `ejercicio ${r.ejercicio.correccion?.toFixed(1)}°, banco ${media("medida").toFixed(1)}°, triángulo ${media("triangulo").toFixed(1)}° (la cuenta: ${c.correccion.toFixed(1)}°)`,
    );
    if (TRAMO !== "tuka" && TRAMO !== "guyrami")
      comprobar("desde Taguató, los grados escritos", /\d+° (al viento|into the wind)/.test(textoAlViento), `«${textoAlViento.slice(0, 60)}»`);
  }
  comprobar("la raya blanca del camino, entera en el suelo", (r.ejercicio.rayas?.camino ?? 0) > 20, JSON.stringify(r.ejercicio.rayas));
  comprobar("y la de delante, quitada al cerrar", r.ejercicio.rayas?.delante === 0, JSON.stringify(r.ejercicio.rayas));
  /*
   * **Los baches** sí: es la instructora contando con calma qué es lo que se
   * siente cuando el aire de la tarde sacude el avión sobre la ciudad, y eso
   * pasa de verdad mientras dura el ejercicio. Ver ADR 0031.
   */
  await ajeno.comprobar(page, comprobar, /^deriva-/, /^vuelo\.baches/);
  await pausa(500);
  await foto("04-encima");
  await pausa(4000);
  await foto("05-final");
  comprobar("sin errores en la página", errores.length === 0, errores.join(" | "));

  /*
   * **La lámina**: los cinco dibujos de la tarjeta y la ficha del hangar,
   * puestos encima de la página con las clases de verdad, para mirarlos de
   * cerca. La ficha se saca del fuente tal cual, con el avión de su macro.
   */
  const hangar = readFileSync("src/ui/hangar.ts", "utf8");
  const avion = /const AVION = \(t: string\): string =>\s*`([\s\S]*?)`;/.exec(hangar)?.[1] ?? "";
  const ficha = (/const EJ_DERIVA = escena\(`([\s\S]*?)`\);/.exec(hangar)?.[1] ?? "").replace(
    /\$\{AVION\("([^"]*)"\)\}/g,
    (_, t) => avion.replace("${t}", t),
  );
  await page.evaluate(async (ficha) => {
    const { DIBUJOS } = await import("/src/ui/senal.ts");
    const caja = document.createElement("div");
    caja.style.cssText =
      "position:fixed;inset:0;z-index:99999;background:#1a2420;display:flex;flex-wrap:wrap;gap:24px;padding:24px;align-items:center;color:#f2f1ec";
    for (const n of ["deriva-a-la-izquierda", "deriva-a-la-derecha", "deriva-corregida-a-la-izquierda", "deriva-corregida-a-la-derecha", "deriva-en-calma"]) {
      const d = document.createElement("div");
      d.style.cssText = "width:160px;height:160px;fill:currentColor";
      d.innerHTML = DIBUJOS[n].replace("<svg ", '<svg width="160" height="160" ');
      caja.append(d);
    }
    const f = document.createElement("div");
    f.className = "ficha ficha--leccion ficha--ejercicio";
    f.style.cssText = "width:360px";
    f.innerHTML = `<span class="ficha__lienzo ficha__lienzo--panel"><svg class="ficha__panel" viewBox="0 0 120 84" width="360" height="252">
      <rect class="panel__cielo" x="0" y="0" width="120" height="46" rx="3" />
      <rect class="panel__tierra" x="0" y="42" width="120" height="42" rx="3" />${ficha}</svg></span>`;
    caja.append(f);
    document.body.append(caja);
  }, ficha);
  await pausa(300);
  await foto("06-lamina");
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

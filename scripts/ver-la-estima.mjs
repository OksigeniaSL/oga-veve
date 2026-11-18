/**
 * **«Rumbo y reloj», volado en el juego** (#51, ADR 0031, enmienda H26n):
 * Mariscal Estigarribia, la avioneta y Filadelfia, con el viento típico del
 * sitio —del 010 a ocho nudos—, o en calma con `OGA_VIENTO=000/0`.
 *
 *   node scripts/ver-la-estima.mjs <carpeta>
 *
 * El piloto de banco hace lo que pide la instructora, con el automático de
 * rumbo como quien sostiene el avión:
 *
 * - sostiene el rumbo de la tarjeta —el del plan, corregido por el viento—
 *   hasta que el reloj llega a cero;
 * - con `OGA_SIN_CORREGIR=1` sostiene la recta al pueblo sin corregir, y el
 *   viento lo aparta.
 *
 * Mira que el ejercicio empiece encima del campo con el rumbo del plan, que el
 * cronómetro enseñe el rumbo y el reloj y que cuente hacia atrás con el reloj
 * del juego, que el plano no sepa dónde está el avión mientras dura, que al
 * llegar a cero el pueblo quede **debajo, a menos de una milla**, corrigiendo
 * —o en calma—, y **apartado lo que dice el viento de costado del modelo por
 * el tiempo**, sin corregir, y del lado que toca; que salgan las dos rayas al
 * final, y lo de H26f: nada que no sea del ejercicio. Capturas desde fuera y
 * desde la cabina. El puerto, `OGA_PUERTO`; el peldaño, `OGA_TRAMO`
 * (Taguató); el reloj, por `OGA_VECES` (ocho); con `OGA_GPU=1`, con la tarjeta
 * de verdad.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";
import { vigilarLoAjeno } from "./lo-ajeno-al-ejercicio.mjs";

const SALIDA = process.argv[2] ?? "capturas-estima";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5686);
const AVION = process.env.OGA_AVION ?? "jaz-20";
const TRAMO = process.env.OGA_TRAMO ?? "taguato";
const VECES = Number(process.env.OGA_VECES ?? 8);
const VIENTO = process.env.OGA_VIENTO ?? null;
const SIN_CORREGIR = process.env.OGA_SIN_CORREGIR === "1";
const CON_GPU = process.env.OGA_GPU === "1";
const NOMBRE = `estigarribia-${VIENTO ? "calma" : "viento"}${SIN_CORREGIR ? "-sin-corregir" : ""}-${TRAMO}`;
const MILLA = 1852;

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
      ejercicio: o.estima(),
      tarjeta: o.tarjeta?.()?.dibujo ?? null,
      casaSinGps: !!document.querySelector('[data-hud="home"]')?.classList.contains("casa--sin-gps"),
      textoDeLaTarjeta: document.querySelector(".senal")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      reloj: j.clock?.elapsedTime ?? 0,
      viento: j.vientoAqui?.aire ?? { x: 0, z: 0 },
      verdadera: s.airspeed,
      pista: j.terrain?.runwayElevation ?? 0,
    };
  });

const ajeno = vigilarLoAjeno();
/** Lo dicho en la última lectura con el ejercicio abierto: lo de después ya es un vuelo (H26g). */
let dichoMientras = null;
const leer = async (page) => {
  const r = await leerSolo(page);
  const abierto = r.ejercicio && r.ejercicio.fase !== "cerrada";
  await ajeno.mirar(page, abierto);
  if (abierto) dichoMientras = await page.evaluate(() => globalThis.__oga.dichoTodo());
  return r;
};

const rumboAlAutomatico = (page, rumbo) =>
  page.evaluate((r) => {
    const j = globalThis.__oga.juegoParaTrazas();
    if (j.objetivos) j.objetivos.rumbo = r;
  }, rumbo);

/** Lo que el viento que sopla en el modelo empuja de costado al que va por `camino`, m/s. */
const deCostado = (v, camino) => v.x * Math.cos(camino) + v.z * Math.sin(camino);
/** Lo que se lee en el cronómetro: «HDG 128° rumbo 18:54 Filadelfia». */
const segundosDelCronometro = (texto) => {
  const m = /(\d+):(\d\d)/.exec(texto ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

let codigo = 0;
try {
  console.log(`\n${NOMBRE}`);
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: false });
  const page = await contexto.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  const viento = VIENTO ? `&viento=${VIENTO}` : "";
  await page.goto(`${BASE}/?escenario=estigarribia&hora=12&tramo=${TRAMO}&avion=${AVION}&ejercicio=estima${viento}`);
  await page.waitForFunction(() => globalThis.__oga?.estima?.()?.colocacion != null, null, { timeout: 120000 });
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
    "empieza encima del campo, en el aire, hacia Filadelfia",
    r.ejercicio.destino.id === "filadelfia" && Math.hypot(r.x - c.x, r.z - c.z) < 1500 && r.y - r.pista > 400,
    `${r.ejercicio.destino.nombre} a ${(c.lejos / 1000).toFixed(1)} km, ${Math.hypot(r.x, r.z).toFixed(0)} m del campo, ${Math.round(r.y - r.pista)} m sobre la pista`,
  );
  comprobar(
    "con el morro en el rumbo del plan",
    Math.abs(centrado((r.rumbo - c.rumbo) / GRADO)) < 2,
    `HDG ${c.rumboMagnetico} (verdadero ${((c.rumbo / GRADO + 360) % 360).toFixed(1)}°, el curso ${((c.curso / GRADO + 360) % 360).toFixed(1)}°, corrección ${c.correccion.toFixed(1)}°), morro a ${centrado((r.rumbo - c.rumbo) / GRADO).toFixed(1)}°`,
  );
  const kt0 = Math.hypot(r.viento.x, r.viento.z) / NUDO;
  comprobar(VIENTO ? "en calma, sin viento" : "con el viento típico del sitio", VIENTO ? kt0 < 0.5 : kt0 > 6, `${kt0.toFixed(1)} kt`);
  comprobar(
    "el cronómetro enseña el rumbo, el reloj y el sitio",
    r.ejercicio.cronometro?.includes(`HDG ${String(c.rumboMagnetico).padStart(3, "0")}°`) &&
      r.ejercicio.cronometro.includes("Filadelfia") &&
      Math.abs(segundosDelCronometro(r.ejercicio.cronometro) - c.tiempo) < 30,
    `«${r.ejercicio.cronometro}», el plan ${(c.tiempo / 60).toFixed(1)} min`,
  );
  comprobar("la tarjeta escribe el sitio", r.textoDeLaTarjeta.includes("Filadelfia"), `«${r.textoDeLaTarjeta.slice(0, 90)}» (${r.tarjeta})`);
  comprobar(
    "el plano no sabe dónde está el avión, la tarjeta de casa va sin aguja ni distancia, y las rayas no se ven",
    r.ejercicio.planoSinGps && r.casaSinGps && !r.ejercicio.rayas?.enLaEscena,
    `plano ${r.ejercicio.planoSinGps}, casa ${r.casaSinGps}, ${JSON.stringify(r.ejercicio.rayas)}`,
  );
  await foto("01-salida");

  await page.evaluate(() => globalThis.__oga.pilotoAutomatico(true));
  const rumboQueSeVuela = SIN_CORREGIR ? c.curso : c.rumbo;
  await rumboAlAutomatico(page, rumboQueSeVuela);
  const puestas = await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
  console.log(`    reloj por ${puestas}`);
  const t0 = r.reloj;
  const cronometro0 = segundosDelCronometro(r.ejercicio.cronometro);

  // El rumbo quieto hasta que el reloj llega a cero.
  const costados = [];
  let fotoMitad = false;
  let fotoUnMinuto = false;
  let cuentaAtras = null;
  const fin = Date.now() + 25 * 60000;
  while (Date.now() < fin && r.ejercicio.fase !== "cerrada") {
    await pausa(500);
    r = await leer(page);
    await rumboAlAutomatico(page, rumboQueSeVuela);
    costados.push(deCostado(r.viento, c.curso));
    if (!fotoMitad && r.ejercicio.transcurrido > c.tiempo / 2) {
      fotoMitad = true;
      const corrido = (r.reloj - t0) * puestas;
      const enElCronometro = segundosDelCronometro(r.ejercicio.cronometro);
      cuentaAtras = { corrido, enElCronometro, transcurrido: r.ejercicio.transcurrido };
      comprobar(
        "a mitad, el cronómetro ha bajado lo que corrió el reloj del juego",
        enElCronometro !== null && Math.abs(cronometro0 - enElCronometro - r.ejercicio.transcurrido) < 3,
        `«${r.ejercicio.cronometro}»: ${cronometro0 - enElCronometro} s menos, ${r.ejercicio.transcurrido.toFixed(0)} s en el ejercicio, ${corrido.toFixed(0)} s de juego`,
      );
      comprobar("y el plano y la tarjeta de casa siguen sin GPS", r.ejercicio.planoSinGps && r.casaSinGps, `${r.ejercicio.planoSinGps}, ${r.casaSinGps}`);
      await foto("02-mitad");
    }
    if (!fotoUnMinuto && r.ejercicio.queda < 50) {
      fotoUnMinuto = true;
      await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
      await pausa(400);
      await foto("03-un-minuto-cabina");
      await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
    }
  }
  comprobar("el reloj llega a cero y se cierra", r.ejercicio.cierre === "hecho", `${r.ejercicio.cierre}, ${(r.ejercicio.transcurrido / 60).toFixed(1)} min`);
  const res = r.ejercicio.resultado;
  const costadoMedio = costados.reduce((a, b) => a + b, 0) / Math.max(1, costados.length);
  if (SIN_CORREGIR && !VIENTO) {
    const esperado = costadoMedio * c.tiempo;
    comprobar(
      "sin corregir, el viento lo aparta su costado por el tiempo",
      res && Math.abs(res.lateral - esperado) < Math.max(600, 0.2 * Math.abs(esperado)),
      `${res?.lateral.toFixed(0)} m de la recta (el viento del modelo por el tiempo: ${esperado.toFixed(0)} m; la cuenta: ${c.sinCorregir.toFixed(0)} m), ${res?.distancia.toFixed(0)} m del pueblo`,
    );
    const lado = c.lado > 0 ? "izquierda" : "derecha";
    comprobar(`y el pueblo queda a la ${lado}, que es del otro lado del viento`, res?.donde === lado, `${res?.donde}, tarjeta ${r.tarjeta}`);
    comprobar("y la tarjeta escribe lo lejos", /\d+[,.]\d (km|NM)/.test(r.textoDeLaTarjeta), `«${r.textoDeLaTarjeta.slice(0, 90)}»`);
  } else
    comprobar(
      VIENTO ? "en calma, con el rumbo del plan, el pueblo debajo" : "con el rumbo corregido, el pueblo debajo, a menos de una milla",
      res?.donde === "debajo" && res.distancia < MILLA,
      `${res?.donde} a ${res?.distancia.toFixed(0)} m (de lado ${res?.lateral.toFixed(0)}, de largo ${res?.largo.toFixed(0)}), tarjeta ${r.tarjeta}`,
    );
  console.log(
    `    rumbo medio volado ${((r.ejercicio.rumboMedio + 360) % 360).toFixed(1)}° verdaderos (el plan ${((c.rumbo / GRADO + 360) % 360).toFixed(1)}°), verdadera ${(r.verdadera / NUDO).toFixed(0)} kt (el plan ${(c.suelo / NUDO).toFixed(0)} kt sobre el suelo)`,
  );
  const dicho = await page.evaluate(() => globalThis.__oga.dichoTodo());
  const deLaEstima = (dicho.instructor ?? []).filter((k) => /^ejercicio\.estima\./.test(k));
  console.log(`    la instructora: ${deLaEstima.join(", ") || "nada"}`);
  await pausa(1500);
  r = await leer(page);
  comprobar(
    "al final, las dos rayas en el suelo y el plano vuelve a saber dónde está el avión",
    r.ejercicio.rayas?.enLaEscena &&
      r.ejercicio.rayas.recta > c.lejos / 60 &&
      r.ejercicio.rayas.camino > c.lejos / 120 &&
      !r.ejercicio.planoSinGps &&
      !r.casaSinGps,
    JSON.stringify(r.ejercicio.rayas),
  );
  await foto("04-cero");
  await page.evaluate(() => globalThis.__oga.ponerVista("izquierda"));
  await pausa(600);
  await foto("05-cero-de-lado");
  await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
  await ajeno.comprobar(page, comprobar, /^estima-/, /^vuelo\.baches/, dichoMientras);
  await pausa(10000);
  await foto("06-final");
  r = await leer(page);
  comprobar("con el panel del final, el cronómetro se recoge", r.ejercicio.cronometro === null, String(r.ejercicio.cronometro));
  comprobar("sin errores en la página", errores.length === 0, errores.join(" | "));
  if (cuentaAtras) console.log(`    cuenta atrás: ${JSON.stringify(cuentaAtras)}`);
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

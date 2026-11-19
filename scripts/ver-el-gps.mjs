/**
 * **«Se apaga el GPS», volado en el juego** (#51, ADR 0031, enmienda H26v):
 * Fuerteventura, la avioneta en el peldaño de cabina y el VOR FTV de plan B.
 *
 *   node scripts/ver-el-gps.mjs <carpeta>
 *
 * Con el alisio del sitio, o en calma con `OGA_VIENTO=000/0`; otro avión con
 * `OGA_AVION` (el bimotor, `jaz-40`). El piloto de banco:
 *
 * - con GPS, vuela con el automático derecho a FTV, el «directo a»;
 * - cuando se va, mira que el plano se queda donde lo supo, sin el avión, y
 *   que la tarjeta de casa va sin aguja ni distancia, mientras el sitio de
 *   verdad sigue moviéndose;
 * - con el plan B pedido, gira el OBS de grado en grado con el 9 y el 0 hasta
 *   el curso a la radio, y vuela con la barra: el rumbo del curso más tres
 *   veces lo que se aparta;
 * - y pasa por encima de FTV: TO a FROM, el GPS vuelve y el plano lo sabe.
 *
 * Capturas, la página entera con el plano abierto y el cuadro de cerca, por
 * fuera y desde el asiento: con GPS, recién ido, con la barra centrada y al
 * pasar. El puerto, `OGA_PUERTO`; el reloj, por `OGA_VECES` (ocho).
 *
 * **Con un turbohélice** (`OGA_AVION=jaz-60` o `jaz-50`, enmienda H26w), lo
 * que se mira es el G1000: antes de irse, «LOI» en ámbar junto al avioncito
 * del HSI, con su foto; sin posición, «DR» en el HSI y encima del avioncito
 * de la carta, las millas en ámbar, y el plano y la tarjeta de casa
 * siguiendo, que el G1000 sigue a estima. El curso se pide con «CRS».
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";
import { vigilarLoAjeno } from "./lo-ajeno-al-ejercicio.mjs";

const SALIDA = process.argv[2] ?? "capturas-gps";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5686);
const AVION = process.env.OGA_AVION ?? "jaz-20";
const VECES = Number(process.env.OGA_VECES ?? 8);
const VIENTO = process.env.OGA_VIENTO ?? null;
const NOMBRE = `${AVION}-${VIENTO ? "calma" : "alisio"}`;
/** Los turbohélices, con su G1000: ver la cabecera. */
const CRISTAL = /^jaz-(50|60)$/.test(AVION);

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
      gps: o.gps(),
      navMhz: radio.navMhz,
      curso: radio.curso,
      navId: l?.emisora?.estacion.id ?? null,
      declinacion: l?.emisora?.declinacion ?? 0,
      desviacion: l?.desviacion ?? null,
      toFrom: l?.toFrom ?? null,
      bandera: l?.bandera ?? true,
      tarjeta: o.tarjeta?.()?.dibujo ?? null,
      texto: document.querySelector(".senal")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      mapaAbierto: !!j.hud?.mapa?.visible,
      // El G1000: lo que dice junto al avioncito del HSI, el «DR» de la carta y las millas en ámbar.
      hsi: (() => {
        const el = document.querySelector('[data-cristal="gps-hsi"]');
        return el && el.getAttribute("visibility") === "visible" ? el.textContent : null;
      })(),
      drEnLaCarta: document.querySelector('[data-cristal="gps-carta"]')?.getAttribute("visibility") === "visible",
      millasEnAmbar: !!document.querySelector('[data-cristal="distancia"]')?.classList.contains("cr__aux--estima"),
    };
  });

const ajeno = vigilarLoAjeno();
const leer = async (page) => {
  const r = await leerSolo(page);
  await ajeno.mirar(page, r.gps && r.gps.fase !== "cerrada");
  return r;
};

const rumboAlAutomatico = (page, rumbo) =>
  page.evaluate((r) => {
    const j = globalThis.__oga.juegoParaTrazas();
    if (j.objetivos) j.objetivos.rumbo = r;
  }, rumbo);

const centrado = (g) => ((((g + 180) % 360) + 360) % 360) - 180;
const GRADO = Math.PI / 180;
const MILLA = 1852;

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
  await page.goto(`${BASE}/?escenario=fuerteventura&hora=12&tramo=taguato-ruvicha&avion=${AVION}&ejercicio=gps${viento}`);
  await page.waitForFunction(() => globalThis.__oga?.gps?.() != null, null, { timeout: 120000 });
  await pausa(3000);
  const foto = async (n, cabina = true) => {
    const ruta = `${SALIDA}/${NOMBRE}-${n}.png`;
    await page.screenshot({ path: ruta });
    const cuadro = page.locator(".cuadro").first();
    if (await cuadro.count()) await cuadro.screenshot({ path: `${SALIDA}/${NOMBRE}-${n}-cuadro.png` }).catch(() => {});
    console.log(`    foto: ${ruta}`);
    if (!cabina) return;
    // Y desde el asiento: el panel con su CDI y lo que se ve por el parabrisas.
    await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
    await pausa(500);
    await page.screenshot({ path: `${SALIDA}/${NOMBRE}-${n}-asiento.png` });
    await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
    await pausa(300);
  };
  const tarjetaGrafica = await page.evaluate(() => {
    const g = document.createElement("canvas").getContext("webgl");
    const i = g?.getExtension("WEBGL_debug_renderer_info");
    return i ? g.getParameter(i.UNMASKED_RENDERER_WEBGL) : "sin WebGL";
  });
  console.log(`    tarjeta gráfica: ${tarjetaGrafica}`);

  let r = await leer(page);
  const est = r.gps.estacion;
  const c = r.gps.colocacion;
  const lejos0 = Math.hypot(est.x - r.x, est.z - r.z);
  comprobar("empieza en el aire, lejos del VOR", r.y > 500 && lejos0 > 9.5 * MILLA, `${(lejos0 / MILLA).toFixed(1)} NM, ${Math.round(r.y)} m, radial ${c?.radial}`);
  comprobar(
    "el plan B ya está puesto: FTV en la NAV y el OBS apartado del curso a la radio",
    r.navId === est.id && r.curso === c?.obs,
    `nav ${r.navId} ${r.navMhz}, OBS ${r.curso}, a la radio ${c?.alaRadio}`,
  );
  comprobar(
    "con GPS, el plano y la tarjeta de casa saben dónde está el avión",
    r.gps.fase === "conGps" && r.gps.sinGps === null && !r.gps.casaSinGps,
    `${r.gps.fase}, plano ${JSON.stringify(r.gps.sinGps)}, casa sin GPS ${r.gps.casaSinGps}`,
  );
  if (CRISTAL)
    comprobar(
      "con GPS, el HSI y la carta no dicen nada del GPS",
      r.hsi === null && !r.drEnLaCarta && !r.millasEnAmbar,
      `HSI ${r.hsi}, DR en la carta ${r.drEnLaCarta}, millas en ámbar ${r.millasEnAmbar}`,
    );
  await page.evaluate(() => globalThis.__oga.juegoParaTrazas().hud.mapa.alternar());
  await pausa(800);
  r = await leer(page);
  comprobar("el plano, abierto", r.mapaAbierto);
  await foto("01-con-gps");

  // Con GPS, el «directo a»: el automático derecho a la radio, y el reloj por ocho.
  await page.evaluate(() => globalThis.__oga.pilotoAutomatico(true));
  const puestas = await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
  console.log(`    reloj por ${puestas}`);
  const fin1 = Date.now() + 4 * 60000;
  let conLoi = null;
  while (Date.now() < fin1 && r.gps.fase === "conGps") {
    await rumboAlAutomatico(page, Math.atan2(est.x - r.x, -(est.z - r.z)));
    await pausa(200);
    r = await leer(page);
    // El «LOI»: se va la integridad antes que la posición. Su foto, con el reloj normal.
    if (CRISTAL && !conLoi && r.gps.receptor === "sinIntegridad") {
      await page.evaluate(() => globalThis.__oga.acelerar(1));
      await pausa(1500);
      conLoi = await leer(page);
      await foto("015-loi");
      await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
    }
  }
  if (CRISTAL) {
    const lejosLoi = conLoi ? Math.hypot(est.x - conLoi.x, est.z - conLoi.z) : NaN;
    comprobar(
      "antes de irse, «LOI» en ámbar junto al avioncito del HSI, y la carta todavía sin «DR»",
      conLoi?.gps.fase === "conGps" && conLoi.hsi === "LOI" && !conLoi.drEnLaCarta && !conLoi.millasEnAmbar,
      conLoi ? `HSI ${conLoi.hsi}, a ${(lejosLoi / MILLA).toFixed(1)} de ${(lejos0 / MILLA).toFixed(1)} NM, «${conLoi.texto}»` : "no salió",
    );
  }
  const alIrse = r;
  const lejosAlIrse = Math.hypot(est.x - r.x, est.z - r.z);
  comprobar(
    "se va a mitad de camino",
    r.gps.fase === "sinGps" && lejosAlIrse < 0.55 * lejos0 && lejosAlIrse > 0.35 * lejos0,
    `${r.gps.fase}, a ${(lejosAlIrse / MILLA).toFixed(1)} de ${(lejos0 / MILLA).toFixed(1)} NM`,
  );
  // El reloj normal para las fotos: lo que se ve recién ido.
  await page.evaluate(() => globalThis.__oga.acelerar(1));
  await pausa(1500);
  r = await leer(page);
  if (CRISTAL) {
    comprobar(
      "sin posición, el G1000: «DR» en el HSI y encima del avioncito de la carta, y las millas en ámbar",
      r.hsi === "DR" && r.drEnLaCarta && r.millasEnAmbar,
      `HSI ${r.hsi}, DR en la carta ${r.drEnLaCarta}, millas en ámbar ${r.millasEnAmbar}`,
    );
    comprobar(
      "y el mapa sigue a estima: el plano y la tarjeta de casa siguen sabiéndolo",
      r.gps.sinGps === null && !r.gps.casaSinGps,
      `plano ${JSON.stringify(r.gps.sinGps)}, casa sin GPS ${r.gps.casaSinGps}`,
    );
  } else
    comprobar(
      "sin GPS: el plano sin el avión y la tarjeta de casa sin aguja ni distancia",
      r.gps.sinGps !== null && r.gps.casaSinGps,
      `plano ${JSON.stringify(r.gps.sinGps && { x: Math.round(r.gps.sinGps.x), z: Math.round(r.gps.sinGps.z) })}, casa ${r.gps.casaSinGps}`,
    );
  comprobar("la tarjeta dice que se fue, con el satélite tachado", r.tarjeta === "gps-apagado", `${r.tarjeta}: «${r.texto}»`);
  await foto("02-sin-gps");
  const quieto = r.gps.sinGps;

  // El plan B: esperar a que lo pida, y el OBS de grado en grado hasta el curso a la radio.
  await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
  const fin2 = Date.now() + 60000;
  while (Date.now() < fin2 && !/^cdi-/.test(r.tarjeta ?? "")) {
    await pausa(250);
    r = await leer(page);
  }
  comprobar(
    "pide el plan B con el CDI en la tarjeta y el curso escrito",
    /^cdi-/.test(r.tarjeta ?? "") && (CRISTAL ? /CRS \d{3}/ : /OBS \d{3}/).test(r.texto ?? ""),
    `${r.tarjeta}: «${r.texto}»`,
  );
  // El OBS se gira con el reloj de verdad, como lo giraría una mano: la tarjeta de la barra centrada dura lo suyo.
  await page.evaluate(() => globalThis.__oga.acelerar(1));
  for (let i = 0; i < 60 && r.curso !== c.alaRadio; i++) {
    await page.keyboard.press(centrado(c.alaRadio - r.curso) > 0 ? "Digit0" : "Digit9");
    await pausa(80);
    r = await leer(page);
  }
  comprobar("el OBS en el curso a la radio, y dice TO", r.curso === c.alaRadio && r.toFrom === "TO", `OBS ${r.curso}, ${r.toFrom}, barra ${r.desviacion?.toFixed(1)}°`);
  let centradaVista = false;
  /*
   * **Volar con la barra corrigiendo el viento**, como un piloto: tres veces
   * lo que se aparta y, encima, lo que se va sumando mientras sigue apartada,
   * que es el ángulo que pide el viento. Solo con lo primero, el alisio de
   * Fuerteventura deja la barra quieta a tres grados y medio del centro: la
   * avioneta apunta al curso más diez grados y el viento se los come.
   */
  let alViento = 0;
  let veces = 1;
  let antes = Date.now();
  const conLaBarra = (d) => {
    // Lo sumado va por segundo de juego, con el reloj que lleve: igual por uno que por ocho.
    const ahora = Date.now();
    const deJuego = Math.min(3, ((ahora - antes) / 1000) * veces);
    antes = ahora;
    alViento = Math.max(-25, Math.min(25, alViento + 0.08 * d * deJuego));
    return Math.max(-35, Math.min(35, 3 * d + alViento));
  };
  {
    // La barra al medio llega girando el OBS, o al poco de seguirla: unos segundos con el reloj de verdad.
    const hasta = Date.now() + 15000;
    while (Date.now() < hasta && r.tarjeta !== "cdi-to") {
      if (r.desviacion !== null && r.toFrom === "TO") {
        const mag = r.curso + conLaBarra(r.desviacion);
        await rumboAlAutomatico(page, (mag - r.declinacion) * GRADO);
      }
      await pausa(200);
      r = await leer(page);
    }
    if (r.tarjeta === "cdi-to") {
      centradaVista = true;
      await pausa(600);
      await foto("03-centrada-to");
    }
  }
  await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
  veces = VECES;
  let cerrada = null;
  let movido = 0;
  let planoQuieto = true;
  let planoSigue = true;
  let drTodoElRato = true;
  const fin3 = Date.now() + 8 * 60000;
  while (Date.now() < fin3) {
    r = await leer(page);
    if (r.desviacion !== null && r.toFrom === "TO") {
      const mag = r.curso + conLaBarra(r.desviacion);
      await rumboAlAutomatico(page, (mag - r.declinacion) * GRADO);
    }
    if (r.gps.fase === "sinGps") {
      movido = Math.max(movido, Math.hypot(r.x - alIrse.x, r.z - alIrse.z));
      if (!r.gps.sinGps || Math.hypot(r.gps.sinGps.x - quieto.x, r.gps.sinGps.z - quieto.z) > 1) planoQuieto = false;
      if (r.gps.sinGps || r.gps.casaSinGps) planoSigue = false;
      if (r.hsi !== "DR" || !r.drEnLaCarta) drTodoElRato = false;
    }
    if (!centradaVista && r.tarjeta === "cdi-to") {
      centradaVista = true;
      await page.evaluate(() => globalThis.__oga.acelerar(1));
      await pausa(800);
      await foto("03-centrada-to");
      await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
    }
    if (r.gps.fase === "cerrada") {
      cerrada = r;
      await page.evaluate(() => globalThis.__oga.acelerar(1));
      await pausa(1500);
      cerrada = await leer(page);
      await foto("04-pasada");
      break;
    }
    await pausa(150);
  }
  if (CRISTAL)
    comprobar(
      "mientras no hay GPS el avión se mueve, el «DR» no se va y el mapa sigue a estima",
      drTodoElRato && planoSigue && movido > 3 * MILLA,
      `el avión anduvo ${(movido / MILLA).toFixed(1)} NM; «DR» todo el rato: ${drTodoElRato}; el plano sigue: ${planoSigue}`,
    );
  else
    comprobar(
      "mientras no hay GPS el avión se mueve y el plano se queda donde lo supo",
      planoQuieto && movido > 3 * MILLA,
      `el avión anduvo ${(movido / MILLA).toFixed(1)} NM; el plano quieto: ${planoQuieto}`,
    );
  comprobar("la barra centrada con TO, felicitada", centradaVista);
  comprobar(
    "se llega con la radio: TO a FROM encima de FTV, y el GPS vuelve",
    cerrada?.gps.cierre === "hecho" && cerrada.gps.sinGps === null && !cerrada.gps.casaSinGps,
    cerrada ? `${cerrada.toFrom}, plano ${JSON.stringify(cerrada.gps.sinGps)}, casa sin GPS ${cerrada.gps.casaSinGps}, «${cerrada.texto}»` : "no llegó",
  );
  if (CRISTAL)
    comprobar(
      "y con el GPS de vuelta, el HSI y la carta ya no dicen nada",
      !!cerrada && cerrada.hsi === null && !cerrada.drEnLaCarta && !cerrada.millasEnAmbar,
      cerrada ? `HSI ${cerrada.hsi}, DR en la carta ${cerrada.drEnLaCarta}, millas en ámbar ${cerrada.millasEnAmbar}` : "no llegó",
    );
  // Lo que pidió decir la instructora, en su orden, sonara o no (sin grabar, se calla).
  {
    const hasta = Date.now() + 30000;
    while (Date.now() < hasta && ((await page.evaluate(() => globalThis.__oga.gps()?.porDecir ?? 0)) > 0)) await pausa(250);
  }
  const dicho = await page.evaluate(() => globalThis.__oga.dichoTodo());
  const cantados = await page.evaluate(() => globalThis.__oga.cantados());
  const pedidas = [
    ...(dicho.instructor ?? []).filter((k) => /^ejercicio\.gps\./.test(k)),
    ...cantados
      .map((c) => /^(ejercicio\.gps\.\w+): sin grabar/.exec(typeof c === "string" ? c : (c?.que ?? ""))?.[1])
      .filter(Boolean),
  ];
  const delGps = pedidas.filter((k, i) => pedidas.indexOf(k) === i);
  const enSuOrden = CRISTAL ? ["antes", "loi", "seFueDr", "planBCrs", "centrada", "pasada"] : ["antes", "seFue", "planB", "centrada", "pasada"];
  comprobar(
    "la instructora pide cada frase en su orden, una detrás de otra",
    enSuOrden.every((k, i) => delGps[i] === `ejercicio.gps.${k}`),
    delGps.join(", ") || "nada",
  );
  await ajeno.comprobar(page, comprobar, /^cdi-|^gps-/);
  // El panel del final sale ocho segundos y medio de juego después de pasar.
  await pausa(9000);
  await foto("05-final", false);
  comprobar("sin errores en la página", errores.length === 0, errores.join(" | "));
  await contexto.close();
} catch (e) {
  console.error(e);
  codigo = 1;
} finally {
  await navegador.close();
  await server.close();
}
const malas = resultados.filter((x) => !x.ok).length;
console.log(`\n${resultados.length - malas} de ${resultados.length}`);
process.exit(codigo || (malas ? 1 : 0));

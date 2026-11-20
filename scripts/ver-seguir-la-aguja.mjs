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
 * la traza. El puerto, `OGA_PUERTO`; el reloj, acelerado por ocho
 * (`OGA_VECES`); solo uno de los vuelos, `OGA_VUELOS=alisio`; y más abajo que
 * el techo de la final de la torre, `OGA_BAJAR` (H43).
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";
import { vigilarLoAjeno } from "./lo-ajeno-al-ejercicio.mjs";

const SALIDA = process.argv[2] ?? "capturas-aguja";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5687);
const AVION = process.env.OGA_AVION ?? "jaz-20";
/** Cuánto se acelera el reloj del juego mientras se sigue la aguja. */
const VECES = Number(process.env.OGA_VECES ?? 8);
const VUELOS = [
  { nombre: "alisio", viento: null },
  { nombre: "calma", viento: "000/0" },
].filter((v) => !process.env.OGA_VUELOS || process.env.OGA_VUELOS.split(",").includes(v.nombre));
/**
 * **Cuántos metros más abajo se sigue la aguja**, para probar la final de la
 * torre (H43): el ejercicio va a tres mil pies sobre la pista, que es justo el
 * techo de esa final, y de que entre o no deciden unos decímetros. Con
 * `OGA_BAJAR=5` pasa por debajo siempre. Sin él, a su altura.
 */
const BAJAR = Number(process.env.OGA_BAJAR ?? 0);

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
const leerSolo = (page) =>
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
      // Lo que se le ha dicho a la torre del combustible, y lo que queda.
      llamada: j.llamadaDicha,
      kilos: j.combustible,
      // Si la torre te ve en su final, y la fase que ve (H43).
      enLaFinalDeLaTorre: j.enLaFinalDeLaTorreParaBanco,
      faseDeLaTorre: j.faseDeLaTorre,
      sobreElCampo: s.position.y - j.cotaDelCampo(j.elCampo()),
      rumboPista: j.elCampo().pista.heading,
      // A cuánto del umbral, dentro del embudo de la aproximación; null fuera. Ver `alUmbralEnLaAproximacion`.
      alUmbral: globalThis.__guia?.alUmbralEnLaAproximacion(j.elCampo().pista, s.position.x, s.position.z) ?? null,
    };
  });

/** Lo que no es del ejercicio, mirado en cada lectura mientras dura (H26f); uno por vuelo. */
let ajeno = vigilarLoAjeno();
/**
 * **Lo dicho en la última lectura con el ejercicio abierto**: lo de después ya
 * es un vuelo, y la torre vuelve a hablar (H26g, como en los demás bancos de
 * radio). Este no lo llevaba, y juzgaba también lo que se oye en el segundo de
 * juego que va de cerrarse a la foto: con el alisio, la torre de Fuerteventura
 * autorizando a despegar a otro justo al pasar por encima de FV (H43).
 */
let dichoMientras = null;
/**
 * **Y la final de la torre, mientras dura** (H43): cuántas lecturas con el
 * ejercicio abierto el avión estaba dentro de la final que ve la torre
 * —a menos de cinco millas del umbral, por debajo de tres mil pies y
 * apuntando a la pista— y en cuántas la torre lo trataba como suyo, que es
 * cuando le quita la pista a otro («cleared for take-off») para dártela.
 */
let enLaFinal = { dentro: 0, suya: 0, lecturas: 0, alto: null, alto0: null, embudo: 0, bajo: Infinity, alto2: -Infinity };
const leer = async (page) => {
  const r = await leerSolo(page);
  const abierto = r.aguja && r.aguja.fase !== "cerrada";
  await ajeno.mirar(page, abierto);
  if (abierto) {
    dichoMientras = await page.evaluate(() => globalThis.__oga.dichoTodo());
    enLaFinal.lecturas++;
    enLaFinal.alto0 ??= `${Math.round(r.sobreElCampo)} m sobre el campo al empezar`;
    const torcido = ((((r.rumbo * 180) / Math.PI - r.rumboPista) % 360) + 540) % 360 - 180;
    // Donde la torre te vería en su final si fueras tres mil pies o menos sobre el campo: a cinco millas del umbral y apuntando a la pista.
    if (r.alUmbral !== null && r.alUmbral <= 5 * 1852 && Math.abs(torcido) <= 60) {
      enLaFinal.embudo++;
      enLaFinal.bajo = Math.min(enLaFinal.bajo, r.sobreElCampo);
      enLaFinal.alto2 = Math.max(enLaFinal.alto2, r.sobreElCampo);
    }
    if (r.enLaFinalDeLaTorre) {
      enLaFinal.dentro++;
      enLaFinal.alto ??= `${Math.round(r.sobreElCampo)} m sobre el campo y ${Math.round(torcido)}° de la pista`;
    }
    if (r.faseDeLaTorre === "final") enLaFinal.suya++;
  }
  return r;
};

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
    ajeno = vigilarLoAjeno();
    dichoMientras = null;
    enLaFinal = { dentro: 0, suya: 0, lecturas: 0, alto: null, alto0: null, embudo: 0, bajo: Infinity, alto2: -Infinity };
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
    await page.evaluate(async () => {
      globalThis.__guia = await import("/src/world/runway-guide.ts");
    });
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
    if (BAJAR)
      console.log(
        `    el automático, ${BAJAR} m más abajo: a ` +
          (await page.evaluate((m) => {
            const j = globalThis.__oga.juegoParaTrazas();
            j.objetivos = { ...j.objetivos, altitud: j.objetivos.altitud - m };
            return Math.round(j.objetivos.altitud);
          }, BAJAR)) +
          " m",
      );
    const puestas = await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
    // El reloj del juego en el fotograma en que se cierra, para saber si lo que dice la radio va antes o después.
    await page.evaluate(() => {
      const o = globalThis.__oga;
      globalThis.__cierreDeLaAguja = null;
      const mira = () => {
        if (o.seguirLaAguja()?.fase === "cerrada") globalThis.__cierreDeLaAguja = o.reloj();
        else requestAnimationFrame(mira);
      };
      requestAnimationFrame(mira);
    });
    console.log(`    reloj por ${puestas}`);
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
    /*
     * **Y sin «minimum fuel»**: el depósito lleva el vuelo del ejercicio, de
     * donde empieza hasta casa. Con lo del tramo desde casa, en la avioneta
     * se declaraba a mitad de la curva. Ver `cargaDelEjercicio`.
     */
    const alPasar = pasada ?? r;
    comprobar("sin «minimum fuel»: el depósito lleva el vuelo del ejercicio", alPasar.llamada === "nada", `${alPasar.llamada} · ${Math.round(alPasar.kilos)} kg al pasar`);
    const a = (pasada ?? r).aguja;
    const parte = a.lejosAlEmpezar ? a.desvio / a.lejosAlEmpezar : 0;
    if (vuelo.viento === null)
      comprobar("con el alisio, la estela se curva (la curva del perro)", parte > 0.04, `${Math.round(a.desvio)} m de ${Math.round(a.lejosAlEmpezar ?? 0)}: ${(parte * 100).toFixed(1)} %`);
    else
      comprobar("en calma, la estela sale recta", parte < 0.02, `${Math.round(a.desvio)} m de ${Math.round(a.lejosAlEmpezar ?? 0)}: ${(parte * 100).toFixed(1)} %`);
    comprobar(
      "y la torre no te da su final mientras dura: no le quita la pista a nadie para dártela",
      enLaFinal.suya === 0,
      `${enLaFinal.suya} de ${enLaFinal.lecturas} lecturas en su final; dentro del cono de la final, ${enLaFinal.dentro}` +
        (enLaFinal.alto !== null ? `, la primera a ${enLaFinal.alto}` : "") +
        ` (${enLaFinal.alto0}; a cinco millas del umbral y apuntando a la pista, ${enLaFinal.embudo} lecturas` +
        (enLaFinal.embudo ? `, de ${enLaFinal.bajo.toFixed(1)} a ${enLaFinal.alto2.toFixed(1)} m sobre el campo` : "") +
        `; el techo de la final de la torre, 914,4)`,
    );
    // Nada que no sea del ejercicio (H26f): ni la fase del plan, ni la torre, ni la frecuencia, ni la ventanilla.
    await ajeno.comprobar(page, comprobar, /^aguja-/, null, dichoMientras);
    const alCerrar = await page.evaluate(() => globalThis.__oga.dichoTodo());
    const despues = Object.entries(alCerrar).flatMap(([quien, claves]) =>
      claves.slice(dichoMientras?.[quien]?.length ?? 0).map((c) => `${quien}: ${c}`),
    );
    console.log(`    dicho al cerrar, ya en vuelo: ${despues.join(", ") || "nada"}`);
    const porLaRadio = await page.evaluate(() => {
      const cierre = globalThis.__cierreDeLaAguja;
      if (cierre === null) return "sin cierre";
      const cerca = globalThis.__oga.nombrados().lista.filter((n) => n.t > cierre - 30);
      return cerca.map((n) => `${n.clave} a ${(n.t - cierre).toFixed(2)} s del cierre`).join(", ") || "nada";
    });
    console.log(`    la frecuencia del campo, desde medio minuto antes de cerrar: ${porLaRadio}`);
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

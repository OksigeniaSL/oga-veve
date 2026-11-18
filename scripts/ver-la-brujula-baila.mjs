/**
 * **«La brújula baila», volado en el juego** (#51, ADR 0031, enmienda H26q):
 * la avioneta en Tenerife Norte y en Asunción, un campo de cada hemisferio.
 *
 *   node scripts/ver-la-brujula-baila.mjs <carpeta>
 *
 * El piloto de banco hace lo que pide la instructora, con el automático de
 * rumbo como quien sostiene el avión: derecho al oeste hasta que pide el
 * viraje, y entonces el norte del direccional. Mira que empiece desde el
 * asiento, que la brújula del parabrisas mienta virando como manda su
 * hemisferio —en Canarias se atrasa, en Asunción se adelanta—, que baile al
 * salir y que se quede quieta; y lo de H26f: nada que no sea del ejercicio.
 * Capturas de cabina derecho, en mitad del viraje, al salir y quieta. El
 * puerto, `OGA_PUERTO`; el peldaño, `OGA_TRAMO` (Taguató, con su número); el
 * avión, `OGA_AVION`; el reloj, por `OGA_VECES` (dos); con `OGA_GPU=1`, con
 * la tarjeta de verdad; `OGA_CAMPOS`, los escenarios separados por comas;
 * `OGA_ESCALA`, los píxeles por punto de las capturas (dos); con `OGA_FUERA=1`,
 * se sale un rato a la vista de detrás al empezar.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync, readFileSync } from "node:fs";
import { baseDe } from "./servidor.mjs";
import { vigilarLoAjeno } from "./lo-ajeno-al-ejercicio.mjs";

const SALIDA = process.argv[2] ?? "capturas-brujula";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5687);
const AVION = process.env.OGA_AVION ?? "jaz-20";
const TRAMO = process.env.OGA_TRAMO ?? "taguato";
const VECES = Number(process.env.OGA_VECES ?? 2);
const CON_GPU = process.env.OGA_GPU === "1";
const ESCALA = Number(process.env.OGA_ESCALA ?? 2);
const FUERA = process.env.OGA_FUERA === "1";
/** Cada campo con lo que su brújula tiene que hacer virando del oeste al norte. */
const CAMPOS = (process.env.OGA_CAMPOS ?? "tenerife-norte,pettirossi").split(",");
const ESPERADO = { "tenerife-norte": "seAtrasa", pettirossi: "seAdelanta" };

mkdirSync(SALIDA, { recursive: true });
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const centrado = (g) => ((((g + 180) % 360) + 360) % 360) - 180;
const GRADO = Math.PI / 180;

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

let codigo = 0;
let laminaHecha = false;
try {
  for (const campo of CAMPOS) {
    const NOMBRE = `${campo}-${AVION}-${TRAMO}`;
    console.log(`\n${NOMBRE}`);
    // A doble resolución: la brújula del parabrisas, desde el asiento, son cincuenta píxeles.
    const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: ESCALA, hasTouch: false });
    const page = await contexto.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(`${BASE}/?escenario=${campo}&tramo=${TRAMO}&avion=${AVION}&ejercicio=brujula`);
    await page.waitForFunction(() => globalThis.__oga?.brujula?.() != null, null, { timeout: 120000 });
    await pausa(3000);
    const variacion = await page.evaluate(async (id) => {
      const { SCENARIOS } = await import("/src/world/scenarios.ts");
      return SCENARIOS.find((s) => s.id === id)?.magneticVariation ?? 0;
    }, campo);
    const tarjetaGrafica = await page.evaluate(() => {
      const g = document.createElement("canvas").getContext("webgl");
      const i = g?.getExtension("WEBGL_debug_renderer_info");
      return i ? g.getParameter(i.UNMASKED_RENDERER_WEBGL) : "sin WebGL";
    });
    console.log(`    tarjeta: ${tarjetaGrafica}`);
    const foto = async (n) => {
      const ruta = `${SALIDA}/${NOMBRE}-${n}.png`;
      await page.screenshot({ path: ruta });
      console.log(`    foto: ${ruta}`);
    };
    const ajeno = vigilarLoAjeno();
    let dichoMientras = null;
    const leer = async () => {
      const r = await page.evaluate(() => {
        const o = globalThis.__oga;
        const j = o.juegoParaTrazas();
        const s = o.estado();
        return {
          y: s.position.y,
          x: s.position.x,
          z: s.position.z,
          rumbo: s.heading,
          b: o.brujula(),
          tarjeta: o.tarjeta?.()?.dibujo ?? null,
          texto: document.querySelector(".senal")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
          pista: j.terrain?.runwayElevation ?? 0,
        };
      });
      const abierto = r.b && r.b.fase !== "cerrada";
      await ajeno.mirar(page, abierto);
      if (abierto) dichoMientras = await page.evaluate(() => globalThis.__oga.dichoTodo());
      return r;
    };
    const alAutomatico = (rumbo) =>
      page.evaluate((r) => {
        const j = globalThis.__oga.juegoParaTrazas();
        if (j.objetivos) j.objetivos.rumbo = r;
      }, rumbo);

    let r = await leer();
    comprobar("empieza desde el asiento", r.b.camara === "cockpit", r.b.camara);
    comprobar(
      "en el aire encima del campo, al oeste magnético",
      Math.hypot(r.x, r.z) < 400 && r.y - r.pista > 800 && Math.abs(centrado(r.b.direccional - 270)) < 3,
      `${Math.round(r.y - r.pista)} m sobre la pista, direccional ${r.b.direccional.toFixed(1)}`,
    );
    comprobar(
      "la inclinación del campo, la del WMM2025",
      campo === "pettirossi" ? r.b.inclinacion < -31 : r.b.inclinacion > 34,
      `${r.b.inclinacion.toFixed(1)}°`,
    );
    /*
     * **Derecho, casi lo mismo**: el avión sale del equilibrio frenando un
     * poco —medio metro por segundo cada segundo, medido—, y al oeste eso es
     * el error de aceleración de verdad: en el norte magnético la brújula se
     * va hacia el sur, y en el sur hacia el norte. Lo que se mira es que sea
     * pequeño y del lado que toca.
     */
    const v0 = await page.evaluate(() => globalThis.__oga.estado().airspeed);
    await pausa(1000);
    r = await leer();
    const frena = (await page.evaluate(() => globalThis.__oga.estado().airspeed)) < v0;
    const aparteAlSalir = centrado(r.b.brujula - r.b.direccional);
    comprobar(
      "derecho, las dos casi lo mismo, y lo que se aparta es lo que manda frenar en su hemisferio",
      Math.abs(aparteAlSalir) < 6 && (!frena || Math.sign(aparteAlSalir) === (campo === "pettirossi" ? 1 : -1)),
      `brújula ${r.b.brujula.toFixed(1)}, direccional ${r.b.direccional.toFixed(1)}, ${frena ? "frenando" : "sin frenar"}`,
    );
    comprobar("la tarjeta dibuja las dos agujas", r.tarjeta === "brujula-las-dos", `${r.tarjeta}, «${r.texto.slice(0, 80)}»`);
    await foto("01-derecho");
    if (FUERA) {
      /*
       * **Y fuera de la cabina**: la brújula no se ve desde la vista de
       * detrás, y la instructora lo dice una vez, a los tres segundos. Vuelve
       * al asiento quien juega, no el ejercicio.
       */
      await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
      // Tres segundos y poco: antes de que el ejercicio pida el viraje y su tarjeta tape esta.
      await pausa(3400);
      await foto("01b-fuera");
      const fuera = await leer();
      comprobar(
        "fuera de la cabina, dice dónde está la brújula",
        fuera.b.dijoLaCabina && fuera.tarjeta === "brujula-las-dos",
        `${fuera.b.dijoLaCabina}, ${fuera.tarjeta}, «${fuera.texto.slice(0, 70)}»`,
      );
      await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
      await pausa(500);
      r = await leer();
      comprobar("y no vuelve sola: vuelve quien juega", r.b.camara === "cockpit", r.b.camara);
    }

    await page.evaluate(() => globalThis.__oga.pilotoAutomatico(true));
    await alAutomatico(r.rumbo);
    const puestas = await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
    console.log(`    reloj por ${puestas}`);

    const fin = Date.now() + 4 * 60000;
    let pedido = false;
    let fotoViraje = false;
    let fotoBaila = false;
    let enElViraje = null;
    let mayor = 0;
    while (Date.now() < fin && r.b.fase !== "cerrada") {
      if (!pedido && r.b.fase !== "derecho") {
        pedido = true;
        // El norte del direccional, en verdaderos.
        await alAutomatico(((360 - variacion) % 360) * GRADO);
        comprobar("pide el viraje con la tarjeta de virar", r.tarjeta === "brujula-virar", `${r.tarjeta}, «${r.texto.slice(0, 80)}»`);
        if (TRAMO !== "tuka" && TRAMO !== "guyrami")
          comprobar("desde Taguató, el rumbo escrito", /(Rumbo|Heading) 360/.test(r.texto), `«${r.texto.slice(0, 60)}»`);
        comprobar("la marca del direccional, en el norte", r.b.rumboPedido === 360, String(r.b.rumboPedido));
      }
      const aparte = centrado(r.b.brujula - r.b.direccional);
      if (r.b.fase === "virando" && Math.abs(aparte) > Math.abs(mayor)) mayor = aparte;
      if (!fotoViraje && r.b.fase === "virando" && Math.abs(aparte) >= 8 && Math.abs(r.b.alabeo) > 5) {
        fotoViraje = true;
        enElViraje = { ...r.b };
        await foto("02-en-mitad-del-viraje");
        console.log(`    en el viraje: brújula ${r.b.brujula.toFixed(1)}, direccional ${r.b.direccional.toFixed(1)}, alabeo ${r.b.alabeo.toFixed(1)}°`);
      }
      if (!fotoBaila && r.b.fase === "saliendo") {
        fotoBaila = true;
        await pausa(400);
        await foto("03-al-salir");
        const s = (await leer()).b;
        console.log(`    al salir: brújula ${s.brujula.toFixed(1)}, direccional ${s.direccional.toFixed(1)}`);
      }
      await pausa(120);
      r = await leer();
    }
    comprobar("virando, la brújula se aparta del direccional ocho grados o más", Math.abs(mayor) >= 8, `${mayor.toFixed(1)}° como mucho`);
    comprobar(
      `y como manda su hemisferio: ${ESPERADO[campo] ?? "?"}`,
      r.b.como === ESPERADO[campo],
      `${r.b.como}, ${enElViraje ? `brújula ${enElViraje.brujula.toFixed(1)} con direccional ${enElViraje.direccional.toFixed(1)}` : "sin foto"}`,
    );
    comprobar("al salir baila", r.b.bailoHasta > 1, `${r.b.bailoHasta.toFixed(1)}° como mucho, quieta a los ${r.b.tardo?.toFixed(1)} s`);
    comprobar("y se cierra con la brújula quieta", r.b.cierre === "hecho", `${r.b.fase}, ${r.b.cierre}`);
    comprobar(
      "quieta, otra vez lo mismo que el direccional",
      Math.abs(centrado(r.b.brujula - r.b.direccional)) < 2.5,
      `brújula ${r.b.brujula.toFixed(1)}, direccional ${r.b.direccional.toFixed(1)}`,
    );
    await foto("04-quieta");
    await ajeno.comprobar(page, comprobar, /^brujula-/, /^vuelo\.baches/, dichoMientras);
    comprobar("sin errores en la página", errores.length === 0, errores.join(" | "));

    if (!laminaHecha) {
      laminaHecha = true;
      /*
       * **La lámina**: los dibujos de la tarjeta y la ficha del hangar,
       * encima de la página con las clases de verdad, para mirarlos de cerca.
       */
      const hangar = readFileSync("src/ui/hangar.ts", "utf8");
      const ficha = /const EJ_BRUJULA = escena\(`([\s\S]*?)`\);/.exec(hangar)?.[1] ?? "";
      await page.evaluate(async (ficha) => {
        const { DIBUJOS } = await import("/src/ui/senal.ts");
        const caja = document.createElement("div");
        caja.style.cssText =
          "position:fixed;inset:0;z-index:99999;background:#f2f1ec;display:flex;flex-wrap:wrap;gap:24px;padding:24px;align-items:center;color:#1a2420";
        for (const n of ["brujula-las-dos", "brujula-virar", "brujula-se-atrasa", "brujula-se-adelanta", "brujula-baila"]) {
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
      await foto("05-lamina");
    }
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

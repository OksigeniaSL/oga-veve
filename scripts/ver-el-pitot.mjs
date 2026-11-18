/**
 * **«El pitot se hiela», volado en el juego** (#51, ADR 0031, enmienda
 * H26s): el bimotor de pistón en Tenerife Norte y en Asunción.
 *
 *   node scripts/ver-el-pitot.mjs <carpeta>
 *
 * El piloto de banco sostiene la altura y el rumbo con el automático, como
 * quien sostiene el avión en nivel, y el gas lo pone con la tecla. Mira que
 * empiece dentro de la nube a cinco bajo cero, que la aguja diga la verdad
 * antes del hielo, que con el tubo cerrado y todo el gas el avión acelere y
 * la aguja se quede quieta, y que al tocar la tarjeta de la calefacción la
 * aguja vuelva a la de verdad. Capturas de cabina antes, durante y después,
 * y del cuadro plano con la aguja quieta. El puerto, `OGA_PUERTO`; el
 * peldaño, `OGA_TRAMO` (Taguató); el avión, `OGA_AVION`; el reloj, por
 * `OGA_VECES` (dos); con `OGA_GPU=1`, con la tarjeta de verdad;
 * `OGA_CAMPOS`, los escenarios separados por comas; `OGA_ESCALA`, los
 * píxeles por punto (dos).
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync, readFileSync } from "node:fs";
import { baseDe } from "./servidor.mjs";
import { vigilarLoAjeno } from "./lo-ajeno-al-ejercicio.mjs";

const SALIDA = process.argv[2] ?? "capturas-pitot";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5687);
const AVION = process.env.OGA_AVION ?? "jaz-40";
const TRAMO = process.env.OGA_TRAMO ?? "taguato";
const VECES = Number(process.env.OGA_VECES ?? 2);
const CON_GPU = process.env.OGA_GPU === "1";
const ESCALA = Number(process.env.OGA_ESCALA ?? 2);
const CAMPOS = (process.env.OGA_CAMPOS ?? "tenerife-norte,pettirossi").split(",");
const NUDO = 0.514444;

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
const kt = (v) => `${(v / NUDO).toFixed(1)} kt`;

let codigo = 0;
let laminaHecha = false;
try {
  for (const campo of CAMPOS) {
    const NOMBRE = `${campo}-${AVION}-${TRAMO}`;
    console.log(`\n${NOMBRE}`);
    const contexto = await navegador.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: ESCALA,
      hasTouch: false,
      locale: process.env.OGA_IDIOMA ?? "es-PY",
    });
    const page = await contexto.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(`${BASE}/?escenario=${campo}&tramo=${TRAMO}&avion=${AVION}&ejercicio=pitot`);
    await page.waitForFunction(() => globalThis.__oga?.pitot?.()?.fase != null, null, { timeout: 120000 });
    await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
    await pausa(2500);
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
    const tarjetas = [];
    const leer = async () => {
      const r = await page.evaluate(() => {
        const o = globalThis.__oga;
        const j = o.juegoParaTrazas();
        const s = o.estado();
        return {
          y: s.position.y,
          x: s.position.x,
          z: s.position.z,
          p: o.pitot(),
          tarjeta: o.tarjeta?.()?.dibujo ?? null,
          texto: document.querySelector(".senal")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
          pista: j.terrain?.runwayElevation ?? 0,
        };
      });
      if (r.tarjeta && tarjetas[tarjetas.length - 1] !== r.tarjeta) tarjetas.push(r.tarjeta);
      const abierto = r.p && r.p.fase !== "cerrada";
      await ajeno.mirar(page, abierto);
      if (abierto) dichoMientras = await page.evaluate(() => globalThis.__oga.dichoTodo());
      return r;
    };
    const esperar = async (hasta, ms) => {
      const fin = Date.now() + ms;
      let r = await leer();
      while (Date.now() < fin && !hasta(r)) {
        await pausa(150);
        r = await leer();
      }
      return r;
    };

    let r = await leer();
    comprobar(
      "en el aire encima del campo, dentro de la nube y a cinco bajo cero",
      Math.hypot(r.x, r.z) < 400 &&
        r.p.nube !== null &&
        r.y > r.p.nube.base &&
        r.y < r.p.nube.techo &&
        r.p.enNube >= 0.3 &&
        Math.abs(r.p.oat + 5) < 1.5,
      `${Math.round(r.y)} m sobre el mar, nube de ${Math.round(r.p.nube?.base ?? 0)} a ${Math.round(r.p.nube?.techo ?? 0)}, dentro ${r.p.enNube.toFixed(2)}, ${r.p.oat.toFixed(1)} °C`,
    );
    comprobar(
      "antes del hielo, la aguja dice la verdad y la calefacción está apagada",
      !r.p.tapado && Math.abs(r.p.marca - r.p.deVerdad) < 0.3 && !r.p.calefaccion,
      `aguja ${kt(r.p.marca)}, de verdad ${kt(r.p.deVerdad)}`,
    );
    await foto("01-antes");

    await page.evaluate(() => globalThis.__oga.pilotoAutomatico(true));
    const puestas = await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
    console.log(`    reloj por ${puestas}`);

    r = await esperar((x) => x.p.tapado || x.p.fase === "cerrada", 60000);
    comprobar("el hielo cierra el tubo, en nube fría y sin calefacción", r.p.tapado, `hielo ${r.p.hielo.toFixed(2)}, ${r.p.fase}`);
    r = await esperar((x) => x.tarjeta === "gas-mas" || x.p.fase === "cerrada", 30000);
    comprobar("pide todo el gas, con su tarjeta", r.tarjeta === "gas-mas", `${r.tarjeta}, «${r.texto.slice(0, 70)}»`);

    // **Todo el gas**, con la tecla: el automático sostiene la altura y el rumbo.
    const alDarGas = r;
    await page.keyboard.down("KeyX");
    await pausa(2500);
    await page.keyboard.up("KeyX");
    const muestras = [];
    r = await esperar((x) => {
      muestras.push(x);
      return x.p.deVerdad - x.p.marca >= 10 * NUDO || x.p.fase === "cerrada";
    }, 60000);
    const marcas = muestras.map((m) => m.p.marca);
    const quieta = Math.max(...marcas) - Math.min(...marcas);
    comprobar(
      "con todo el gas el avión acelera diez nudos y la aguja se queda quieta",
      r.p.deVerdad - alDarGas.p.deVerdad >= 9 * NUDO && quieta < 1.5 * NUDO,
      `de verdad ${kt(alDarGas.p.deVerdad)} → ${kt(r.p.deVerdad)}; aguja ${kt(Math.min(...marcas))}–${kt(Math.max(...marcas))}; altura ${Math.round(alDarGas.y)} → ${Math.round(r.y)} m`,
    );
    r = await esperar((x) => (x.tarjeta === "pitot-helado" && /acelera|speeds up/.test(x.texto)) || x.p.fase === "cerrada", 15000);
    comprobar(
      "y la instructora lo hace ver, con los dos números en la tarjeta",
      r.tarjeta === "pitot-helado" && /De verdad|Actual/.test(r.texto),
      `«${r.texto.slice(0, 110)}»`,
    );
    await foto("02-durante-cabina");
    await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
    await pausa(900);
    r = await leer();
    await foto("03-durante-cuadro-plano");
    await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
    await pausa(600);

    r = await esperar((x) => x.tarjeta === "pitot-calefaccion" || x.p.fase === "cerrada", 30000);
    comprobar("pide la calefacción del pitot, con su tarjeta", r.tarjeta === "pitot-calefaccion", `${r.tarjeta}, «${r.texto.slice(0, 70)}»`);
    // **Tocando la tarjeta**, que es el interruptor para quien juega con el dedo.
    const caja = await page.locator(".senal").first().boundingBox();
    if (caja) await page.mouse.click(caja.x + caja.width * 0.5, caja.y + caja.height * 0.5);
    await pausa(400);
    r = await leer();
    const porLaTarjeta = r.p.calefaccion;
    if (!porLaTarjeta) await page.keyboard.press("Digit4");
    await pausa(300);
    r = await leer();
    comprobar("tocar la tarjeta prende la calefacción", porLaTarjeta, porLaTarjeta ? "" : `con la tecla: ${r.p.calefaccion}`);

    r = await esperar((x) => x.p.fase === "cerrada", 60000);
    comprobar("el hielo se derrite y se cierra hecho", r.p.cierre === "hecho" && !r.p.tapado, `${r.p.fase}, ${r.p.cierre}`);
    comprobar(
      "y la aguja vuelve a la de verdad",
      Math.abs(r.p.marca - r.p.deVerdad) < 0.3 && r.p.marca - alDarGas.p.marca > 9 * NUDO,
      `aguja ${kt(r.p.marca)}, de verdad ${kt(r.p.deVerdad)}`,
    );
    await pausa(800);
    await foto("04-despues");
    comprobar(
      "las tarjetas en su orden",
      ["gas-mas", "pitot-helado", "pitot-calefaccion"].every((t) => tarjetas.includes(t)) &&
        tarjetas.indexOf("gas-mas") < tarjetas.lastIndexOf("pitot-calefaccion"),
      tarjetas.join(" → "),
    );
    await ajeno.comprobar(page, comprobar, /^(pitot-|gas-mas)/, /^vuelo\.baches/, dichoMientras);
    comprobar("sin errores en la página", errores.length === 0, errores.join(" | "));

    if (!laminaHecha) {
      laminaHecha = true;
      const hangar = readFileSync("src/ui/hangar.ts", "utf8");
      const ficha = /const EJ_PITOT = escena\(`([\s\S]*?)`\);/.exec(hangar)?.[1] ?? "";
      await page.evaluate(async (ficha) => {
        const { DIBUJOS } = await import("/src/ui/senal.ts");
        const caja = document.createElement("div");
        caja.style.cssText =
          "position:fixed;inset:0;z-index:99999;background:#f2f1ec;display:flex;flex-wrap:wrap;gap:24px;padding:24px;align-items:center;color:#1a2420";
        for (const n of ["pitot-helado", "gas-mas", "pitot-calefaccion", "pitot-tapado"]) {
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

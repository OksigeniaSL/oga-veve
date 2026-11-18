/**
 * **«Poné en hora el giróscopo», volado en el juego** (#51, ADR 0031,
 * enmienda H26r): la avioneta en Tenerife Norte y en Asunción, un campo de
 * cada hemisferio.
 *
 *   node scripts/ver-el-giroscopo.mjs <carpeta>
 *
 * El piloto de banco sostiene el norte con el automático de rumbo, como quien
 * sostiene el avión derecho. Mira que empiece desde el asiento con las dos
 * diciendo lo mismo, que con el reloj del giróscopo apurado el direccional se
 * vaya hacia el lado de su hemisferio —en Canarias el número baja, en
 * Asunción sube— mientras la brújula y el rumbo de verdad se quedan, y que se
 * ponga con la perilla: un toque en cada mitad del direccional del cuadro
 * plano, uno en la esfera del panel 3D desde el asiento, y el resto con la
 * tecla. Capturas de cabina antes y después de ponerlo, y del cuadro plano
 * con el direccional ido. El puerto, `OGA_PUERTO`; el peldaño, `OGA_TRAMO`
 * (Taguató); el avión, `OGA_AVION`; el reloj, por `OGA_VECES` (dos); con
 * `OGA_GPU=1`, con la tarjeta de verdad; `OGA_CAMPOS`, los escenarios
 * separados por comas; `OGA_ESCALA`, los píxeles por punto (dos).
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync, readFileSync } from "node:fs";
import { baseDe } from "./servidor.mjs";
import { vigilarLoAjeno } from "./lo-ajeno-al-ejercicio.mjs";

const SALIDA = process.argv[2] ?? "capturas-giroscopo";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5687);
const AVION = process.env.OGA_AVION ?? "jaz-20";
const TRAMO = process.env.OGA_TRAMO ?? "taguato";
const VECES = Number(process.env.OGA_VECES ?? 2);
const CON_GPU = process.env.OGA_GPU === "1";
const ESCALA = Number(process.env.OGA_ESCALA ?? 2);
const CAMPOS = (process.env.OGA_CAMPOS ?? "tenerife-norte,pettirossi").split(",");
/** Hacia dónde se va el número del direccional en cada campo: la Tierra manda. */
const SIGNO = { "tenerife-norte": -1, pettirossi: 1 };

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

/** **La perilla desde el asiento**: un toque en la esfera del direccional de la cabina 3D, a un lado de su centro. */
const tocarElDireccional = (page, lado) =>
  page.evaluate((lado) => {
    const j = globalThis.__oga.juegoParaTrazas();
    const relojes = j.aircraftMesh?.relojes;
    const uuids = new Set((relojes?.hay ?? []).filter((h) => h.que === "dg").map((h) => h.uuid));
    let malla = null;
    j.scene.traverse((o) => {
      if (uuids.has(o.uuid) && o.name !== "brujula") malla = o;
    });
    if (!malla) return { tocado: false, por: "sin esfera del direccional" };
    malla.geometry.computeBoundingBox();
    const caja = malla.geometry.boundingBox;
    const centro = caja.getCenter(caja.min.clone());
    const P = centro.constructor;
    const tam = caja.getSize(new P());
    const ejes = [
      ["x", tam.x],
      ["y", tam.y],
      ["z", tam.z],
    ].sort((a, b) => b[1] - a[1]);
    const puntos = [];
    for (const signo of [-1, 1]) {
      const p = centro.clone();
      p[ejes[0][0]] += (signo * ejes[0][1]) / 4;
      malla.localToWorld(p);
      p.project(j.camera);
      puntos.push({ x: p.x, y: p.y });
    }
    puntos.sort((a, b) => a.x - b.x);
    const p = lado < 0 ? puntos[0] : puntos[1];
    const antes = globalThis.__oga.giroscopo().error;
    j.pulsarElMando(p.x, p.y);
    return { tocado: true, antes, despues: globalThis.__oga.giroscopo().error, en: p };
  }, lado);

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
    await page.goto(`${BASE}/?escenario=${campo}&tramo=${TRAMO}&avion=${AVION}&ejercicio=giroscopo`);
    await page.waitForFunction(() => globalThis.__oga?.giroscopo?.()?.fase != null, null, { timeout: 120000 });
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
          rumbo: s.heading,
          g: o.giroscopo(),
          tarjeta: o.tarjeta?.()?.dibujo ?? null,
          texto: document.querySelector(".senal")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
          pista: j.terrain?.runwayElevation ?? 0,
        };
      });
      if (r.tarjeta && tarjetas[tarjetas.length - 1] !== r.tarjeta) tarjetas.push(r.tarjeta);
      const abierto = r.g && r.g.fase !== "cerrada";
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
    comprobar("empieza desde el asiento", r.g.camara === "cockpit", r.g.camara);
    comprobar("en este avión y este peldaño el direccional se va", r.g.seVa, String(r.g.seVa));
    comprobar(
      "en el aire encima del campo, al norte magnético",
      Math.hypot(r.x, r.z) < 400 && r.y - r.pista > 800 && Math.abs(centrado(r.g.magnetico - 360)) < 3,
      `${Math.round(r.y - r.pista)} m sobre la pista, magnético ${r.g.magnetico.toFixed(1)}`,
    );
    comprobar(
      "puesto al empezar: el direccional y la brújula dicen lo mismo",
      Math.abs(r.g.error) < 0.05 && Math.abs(centrado(r.g.brujula - r.g.direccional)) < 3,
      `direccional ${r.g.direccional.toFixed(1)}, brújula ${r.g.brujula.toFixed(1)}`,
    );
    comprobar(
      "la deriva de su hemisferio: el número baja al norte del ecuador y sube al sur",
      Math.sign(r.g.deriva) === SIGNO[campo],
      `${r.g.deriva.toFixed(2)}°/h`,
    );
    await foto("01-puesto-al-empezar");

    await page.evaluate(() => globalThis.__oga.pilotoAutomatico(true));
    await alAutomatico(((360 - variacion) % 360) * GRADO);
    const puestas = await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
    console.log(`    reloj por ${puestas}`);

    const fin = Date.now() + 4 * 60000;
    let vioApurar = false;
    while (Date.now() < fin && r.g.fase !== "ponerlo" && r.g.fase !== "cerrada") {
      if (r.g.fase === "seVa" && !vioApurar && r.tarjeta === "giroscopo-se-fue") {
        vioApurar = true;
        comprobar(
          "al apurar, la tarjeta del direccional que se va, con el reloj escrito",
          /Reloj apurado|Clock sped up/.test(r.texto) && r.g.apuro > 10,
          `«${r.texto.slice(0, 90)}», por ${Math.round(r.g.apuro)}`,
        );
      }
      await pausa(200);
      r = await leer();
    }
    comprobar(
      "se fue hacia el lado de su hemisferio, siete grados o más",
      Math.sign(r.g.error) === SIGNO[campo] && Math.abs(r.g.error) >= 7,
      `${r.g.error.toFixed(1)}°: direccional ${r.g.direccional.toFixed(1)}, brújula ${r.g.brujula.toFixed(1)}`,
    );
    comprobar(
      "y la brújula y el rumbo de verdad no se fueron",
      Math.abs(centrado(r.g.brujula - r.g.magnetico)) < 2.5 && Math.abs(centrado(r.g.magnetico - 360)) < 3,
      `brújula ${r.g.brujula.toFixed(1)}, de verdad ${r.g.magnetico.toFixed(1)}`,
    );
    comprobar("el reloj vuelve a su paso", r.g.apuro === 1, String(r.g.apuro));
    await foto("02-se-fue");

    // Hasta que pide la perilla.
    const hastaPedir = Date.now() + 30000;
    while (Date.now() < hastaPedir && r.tarjeta !== "giroscopo-perilla" && r.g.fase !== "cerrada") {
      await pausa(200);
      r = await leer();
    }
    comprobar("pide la perilla con su tarjeta", r.tarjeta === "giroscopo-perilla", `${r.tarjeta}, «${r.texto.slice(0, 80)}»`);

    /*
     * **En el cuadro plano, con el dedo**: la vista de detrás, un toque en la
     * mitad que acerca el direccional a la brújula y otro en la que lo aleja.
     */
    await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
    await pausa(800);
    await foto("03-cuadro-plano-ido");
    const hacia = Math.sign(centrado(r.g.brujula - r.g.direccional)) || 1;
    const errorAntes = (await leer()).g.error;
    for (const lado of [hacia, -hacia]) {
      const caja = await page.locator(`[data-radio-mando="dg"][data-paso="${lado}"]`).first().boundingBox();
      if (caja) await page.mouse.click(caja.x + caja.width * 0.5, caja.y + caja.height * 0.5);
      await pausa(250);
    }
    const trasLosDos = (await leer()).g.error;
    // Un toque de cada lado: vuelve a donde estaba, y entre medias se movió.
    await page.mouse.click(...(await (async () => {
      const caja = await page.locator(`[data-radio-mando="dg"][data-paso="${hacia}"]`).first().boundingBox();
      return caja ? [caja.x + caja.width * 0.5, caja.y + caja.height * 0.5] : [0, 0];
    })()));
    await pausa(250);
    const trasUno = (await leer()).g.error;
    const explica = await page.evaluate(() => !!document.querySelector('[data-hud="explica"]:not([hidden]), .explica:not([hidden])'));
    comprobar(
      "en el cuadro plano, la perilla gira un grado por toque hacia cada lado, sin abrir la explicación",
      Math.abs(trasLosDos - errorAntes) < 0.3 && Math.abs(Math.abs(trasUno - errorAntes) - 1) < 0.3 && !explica,
      `${errorAntes.toFixed(1)} → ${trasLosDos.toFixed(1)} → ${trasUno.toFixed(1)}${explica ? ", se abrió la explicación" : ""}`,
    );
    await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
    await pausa(800);

    // **Desde el asiento**: un toque en la esfera del direccional del panel 3D.
    r = await leer();
    const lado3d = Math.sign(centrado(r.g.brujula - r.g.direccional)) || 1;
    const toque = await tocarElDireccional(page, lado3d);
    comprobar(
      "desde el asiento, un toque en la esfera del panel 3D gira un grado hacia su lado",
      toque.tocado && Math.abs(toque.despues - toque.antes - lado3d) < 0.3,
      toque.tocado ? `${toque.antes.toFixed(1)} → ${toque.despues.toFixed(1)}` : toque.por,
    );

    // **Y el resto con la tecla**: el 6 sube y el 5 baja, hasta que cuadran.
    let teclas = 0;
    for (let i = 0; i < 40; i++) {
      r = await leer();
      const falta = centrado(r.g.brujula - r.g.direccional);
      if (Math.abs(falta) <= 0.6 || r.g.fase === "cerrada") break;
      await page.keyboard.press(falta > 0 ? "Digit6" : "Digit5");
      teclas++;
      await pausa(120);
    }
    console.log(`    ${teclas} teclas`);
    const hastaCerrar = Date.now() + 40000;
    while (Date.now() < hastaCerrar && r.g.fase !== "cerrada") {
      await pausa(200);
      r = await leer();
    }
    comprobar("se cierra con el direccional puesto", r.g.cierre === "hecho", `${r.g.fase}, ${r.g.cierre}`);
    comprobar(
      "puesto con la brújula derecha, el direccional dice la verdad",
      r.g.queda !== null && Math.abs(r.g.queda) <= 2 && Math.abs(r.g.error) <= 2,
      `queda ${r.g.queda?.toFixed(1)}°, direccional ${r.g.direccional.toFixed(1)}, brújula ${r.g.brujula.toFixed(1)}`,
    );
    comprobar("las tarjetas en su orden", tarjetas.includes("giroscopo-se-fue") && tarjetas.includes("giroscopo-perilla") && tarjetas.includes("giroscopo-puesto"), tarjetas.join(" → "));
    await foto("04-puesto");
    await ajeno.comprobar(page, comprobar, /^(brujula|giroscopo)-/, /^vuelo\.baches/, dichoMientras);
    comprobar("sin errores en la página", errores.length === 0, errores.join(" | "));

    if (!laminaHecha) {
      laminaHecha = true;
      const hangar = readFileSync("src/ui/hangar.ts", "utf8");
      const ficha = /const EJ_GIROSCOPO = escena\(`([\s\S]*?)`\);/.exec(hangar)?.[1] ?? "";
      await page.evaluate(async (ficha) => {
        const { DIBUJOS } = await import("/src/ui/senal.ts");
        const caja = document.createElement("div");
        caja.style.cssText =
          "position:fixed;inset:0;z-index:99999;background:#f2f1ec;display:flex;flex-wrap:wrap;gap:24px;padding:24px;align-items:center;color:#1a2420";
        for (const n of ["brujula-las-dos", "giroscopo-se-fue", "giroscopo-perilla", "giroscopo-puesto"]) {
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

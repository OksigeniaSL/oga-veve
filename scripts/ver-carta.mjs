/**
 * **La carta del hangar en los cuatro calcos**, fotografiada en tablet y en
 * teléfono tumbado, con la tarjeta de verdad.
 *
 * Para mirarla con los ojos: entra en el hangar, elige el sitio y el piloto
 * de cada peldaño, abre «¿A dónde vas?» y saca la carta; y en el peldaño de
 * la radio, también la ficha de un aeródromo abierta. Cada captura dice con
 * qué tarjeta se dibujó: si sale SwiftShader, no vale para juzgar la imagen.
 *
 *   node scripts/ver-carta.mjs <carpeta> [sitio[:ficha]…]
 *
 * Por defecto, Tenerife Norte y Silvio Pettirossi. El puerto, `OGA_PUERTO`.
 * Con `sitio:ficha` se abre la ficha de ese campo y no la de siempre:
 * `tenerife-norte:tenerife-norte` es la de Los Rodeos. En el peldaño de la
 * radio, si la ficha lleva carta de aproximación, también se fotografía
 * abierta (`-iac`), por abajo (`-iac-abajo`) y con la otra cabecera
 * (`-iac-otra`); y la ficha con sus datos rodados hasta abajo
 * (`-ficha-abajo`). Solo los dos peldaños de los extremos con
 * `OGA_EXTREMOS=1`.
 *
 * Y la carta que se toca (#72): en la ficha, un toque con el dedo en la pista
 * (`-toque-pista`) y, en el calco de la radio, en una radioayuda o en la
 * frecuencia de la torre (`-toque-radio`); en la carta de aproximación, en el
 * punto de frustrada y en los mínimos (`-iac-toque`, `-iac-toque-minimos`).
 * Cada toque dice qué rótulo salió, y si la franja tapa lo tocado. Con
 * `OGA_IDIOMA=es-PY`, en el idioma de quien juega en Paraguay.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";

const SALIDA = process.argv[2] ?? "capturas-carta";
const PEDIDOS = process.argv.slice(3).length ? process.argv.slice(3) : ["tenerife-norte", "pettirossi"];
const PUERTO = Number(process.env.OGA_PUERTO ?? 5604);
const TRAMOS = process.env.OGA_EXTREMOS ? ["guyrami", "taguato-ruvicha"] : ["guyrami", "tuka", "taguato", "taguato-ruvicha"];
const PANTALLAS = [
  { nombre: "tablet", viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5, isMobile: false, hasTouch: true },
  { nombre: "telefono", viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];
/** El aeródromo cuya ficha se abre, por sitio. */
const FICHA = { "tenerife-norte": "gran-canaria", pettirossi: "encarnacion" };

mkdirSync(SALIDA, { recursive: true });

/**
 * **Un toque con el dedo** en el primer elemento visible que case, en su
 * centro, y la foto. Dice qué rótulo salió y si la franja pisa lo tocado.
 */
async function tocar(page, carta, selector, nombre) {
  const caja = await page.$$eval(selector, (els) => {
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      if (r.width > 0 && r.height > 0 && s.visibility !== "hidden") return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return null;
  });
  if (!caja) {
    console.log(`    ${nombre}: no hay ${selector} a la vista`);
    return;
  }
  await page.touchscreen.tap(caja.x, caja.y);
  await page.waitForTimeout(200);
  await carta.screenshot({ path: `${nombre}.png` });
  const visto = await page.evaluate(() => {
    const f = [...document.querySelectorAll(".toque-rotulo")].find((x) => !x.hidden);
    const tocado = document.querySelector(".toque-tocado");
    const pisa = (() => {
      if (!f || !tocado) return false;
      const a = f.getBoundingClientRect();
      const b = tocado.getBoundingClientRect();
      return !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top);
    })();
    return {
      rotulo: f ? f.textContent.trim().replace(/\s+/g, " ") : "(sin franja)",
      tocado: tocado ? tocado.getAttribute("data-toca") : null,
      pisa,
    };
  });
  console.log(`    ${nombre.split("/").pop()}: ${visto.tocado ?? "nada"} · ${visto.rotulo.slice(0, 90)}${visto.pisa ? " · ¡PISA LO TOCADO!" : ""}`);
}
const server = await createServer({
  root: process.cwd(),
  // Sin vigilar ficheros: no se edita nada mientras se fotografía.
  server: { port: PUERTO, hmr: false, watch: null },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
try {
  for (const pantalla of PANTALLAS) {
    const contexto = await navegador.newContext({
      viewport: pantalla.viewport,
      deviceScaleFactor: pantalla.deviceScaleFactor,
      isMobile: pantalla.isMobile,
      hasTouch: pantalla.hasTouch,
      // El idioma del navegador, que es el que elige el juego: `OGA_IDIOMA=es-PY`.
      ...(process.env.OGA_IDIOMA ? { locale: process.env.OGA_IDIOMA } : {}),
    });
    const page = await contexto.newPage();
    page.on("pageerror", (e) => console.log(`  ERROR en la página: ${e.message}`));
    /*
     * Como `verificar-hangar.mjs`: el perfil nace con un despegue en su
     * cuaderno —el hangar es de quien ya ha volado— y antes del hangar se
     * dice quién vuela.
     */
    await page.addInitScript(() => {
      localStorage.setItem("oga-veve:teclas-vistas", "1");
      if (localStorage.getItem("oga-veve:guardado") === null)
        localStorage.setItem("oga-veve:cuaderno", JSON.stringify({ despegues: 1, segundos: 600 }));
    });
    await page.goto(`${BASE}/`);
    await page.waitForSelector(".piloto__boton", { timeout: 90000 });
    await page.click(".piloto__boton");
    await page.waitForSelector(".ficha--sitio", { timeout: 90000 });
    const tarjeta = await page.evaluate(() => {
      const g = document.createElement("canvas").getContext("webgl");
      const i = g?.getExtension("WEBGL_debug_renderer_info");
      return i ? g.getParameter(i.UNMASKED_RENDERER_WEBGL) : "sin WebGL";
    });
    console.log(`${pantalla.nombre}: ${tarjeta}`);
    for (const pedido of PEDIDOS) {
      const [sitio, suFicha] = pedido.split(":");
      for (const tramo of TRAMOS) {
        await page.click('[data-pantalla="donde"]');
        await page.click(`[data-sitio="${sitio}"]`);
        await page.click('[data-pantalla="quien"]');
        await page.click(`[data-tramo="${tramo}"]`);
        await page.click('[data-pantalla="adonde"]');
        await page.waitForSelector(".pais__relieve");
        await page.waitForFunction(() => {
          const img = document.querySelector(".pais__relieve");
          return img && img.complete && img.naturalWidth > 0;
        });
        await page.evaluate(() => document.fonts.ready);
        const carta = await page.$(".pais");
        await carta.scrollIntoViewIfNeeded();
        const nombre = `${SALIDA}/${sitio}${suFicha ? `-${suFicha}` : ""}-${tramo}-${pantalla.nombre}`;
        await carta.screenshot({ path: `${nombre}.png` });
        await page.screenshot({ path: `${nombre}-pantalla.png` });
        if (tramo === "taguato-ruvicha" || tramo === "guyrami") {
          const campo = await page.$(`.pais__campo[data-ficha="${suFicha ?? FICHA[sitio] ?? sitio}"]`);
          if (campo) {
            await campo.click();
            await carta.screenshot({ path: `${nombre}-ficha.png` });
            const ficha = ".ficha-carta:not([hidden])";
            await tocar(page, carta, `${ficha} .pistas [data-toca="pista"]`, `${nombre}-toque-pista`);
            if (tramo === "taguato-ruvicha") {
              await tocar(page, carta, `${ficha} .pistas [data-toca="vor"], ${ficha} .pistas [data-toca="ndb"], ${ficha} .ficha-carta__radio i[data-toca]`, `${nombre}-toque-radio`);
            }
            if (await page.$(`${ficha} .ficha-carta__iac`)) {
              await page.$eval(`${ficha} .ficha-carta__datos`, (d) => (d.scrollTop = d.scrollHeight));
              await carta.screenshot({ path: `${nombre}-ficha-abajo.png` });
              await page.click(`${ficha} .ficha-carta__iac`);
              await carta.screenshot({ path: `${nombre}-iac.png` });
              await tocar(page, carta, `${ficha} .iac--0 .iac-perfil [data-toca="mapt"], ${ficha} .iac--0 .iac-perfil [data-toca="faf"]`, `${nombre}-iac-toque`);
              await tocar(page, carta, `${ficha} .iac--0 [data-toca="minimos"]`, `${nombre}-iac-toque-minimos`);
              await page.$eval(`${ficha} .iac--0 .iac__cuerpo`, (d) => (d.scrollTop = d.scrollHeight));
              await carta.screenshot({ path: `${nombre}-iac-abajo.png` });
              await page.$eval(`${ficha} .iac--0 .iac__cuerpo`, (d) => (d.scrollTop = 0));
              const otra = await page.$(`${ficha} .iac--0 .iac__pestana:not(.iac__pestana--esta)`);
              if (otra) {
                await otra.click();
                await carta.screenshot({ path: `${nombre}-iac-otra.png` });
              }
              // Cuánto mide la hoja abierta y cuánto queda por rodar: lo que no se ve al abrirla.
              const medida = await page.$eval(ficha, (f) => {
                const abierta = [...f.querySelectorAll(".iac")].find((el) => getComputedStyle(el).display !== "none");
                const cuerpo = abierta?.querySelector(".iac__cuerpo");
                return abierta && cuerpo
                  ? `iac ${abierta.clientWidth}×${abierta.clientHeight}, rueda ${cuerpo.scrollHeight - cuerpo.clientHeight} px`
                  : "iac cerrada";
              });
              console.log(`    ${medida}`);
            }
            await page.click(`${ficha} .ficha-carta__cerrar`);
          }
        }
        console.log(`  ${nombre}.png`);
        await page.click('[data-pantalla="inicio"]');
      }
    }
    await contexto.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

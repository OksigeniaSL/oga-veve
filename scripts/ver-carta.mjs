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
            if (await page.$(`${ficha} .ficha-carta__iac`)) {
              await page.$eval(`${ficha} .ficha-carta__datos`, (d) => (d.scrollTop = d.scrollHeight));
              await carta.screenshot({ path: `${nombre}-ficha-abajo.png` });
              await page.click(`${ficha} .ficha-carta__iac`);
              await carta.screenshot({ path: `${nombre}-iac.png` });
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

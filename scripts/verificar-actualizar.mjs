/**
 * El botón de «hay una versión nueva», tocado con el dedo.
 *
 * «Al pulsar sobre el botón de actualizar no respondía», en el teléfono. No
 * era el dedo ni una capa encima: el botón guardaba el trabajador de servicio
 * que esperaba **cuando se encendió**, y si mientras tanto se publicaba otra
 * versión, ésa lo jubilaba y el toque iba a parar a un trabajador que ya no
 * existía. Con la pestaña abierta mientras se prueba —publicar, volver a
 * publicar— es justo lo que pasa. Ver `estrenar` en `main.ts`.
 *
 * Esto no se puede comprobar en el servidor de desarrollo, donde no hay
 * trabajador de servicio. Así que se compila, se sirve `dist/` con su `sw.js`
 * de producción y se **publican versiones** sin cerrar la pestaña: el
 * servidor pasa a servir otro `sw.js` —otra versión, otra caché— y otro
 * `index.html` con su marca. Después se toca el botón con el dedo y se mira
 * que la página se recargue en la versión última, con su trabajador al mando
 * y sin el botón.
 *
 * Cuatro casos, en un teléfono apaisado y con dedo: una versión nueva, dos
 * seguidas —el que no respondía—, dos seguidas con el botón ya a la vista
 * antes de la segunda, y una con la página pidiendo cosas sin parar, que es
 * como está volando. Y en cada uno, que el botón no caiga encima de un mando
 * de pulgar: abajo a la derecha tapaba el ralentí de la palanca de gases.
 *
 * Uso: `node scripts/verificar-actualizar.mjs` (compila antes).
 *   `OGA_SIN_COMPILAR=1` usa el `dist/` que haya.
 */
import { execSync } from "node:child_process";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium, devices } from "playwright";

// Uno propio, que otro banco puede estar corriendo a la vez: `OGA_PUERTO` para otro.
const PUERTO = Number(process.env.OGA_PUERTO ?? 5323);

/*
 * **Y con tope, el banco entero y cada pregunta a la página.**
 *
 * Una página colgada no contesta a nada, y este banco le preguntaba sin plazo:
 * cuando el toque dejaba la página a media navegación —ver `callarLaRed` en
 * `main.ts`—, se quedaba esperando la respuesta para siempre y no decía nada.
 * Ahora cada pregunta tiene su plazo y, si se pasa, es un fallo con nombre; y
 * por si algo se escapa, el banco entero se rinde a los quince minutos
 * contando lo que llevaba.
 */
const TOPE_DE_PREGUNTA = 20_000;
const TOPE_DEL_BANCO = 15 * 60_000;

if (!process.env.OGA_SIN_COMPILAR) {
  process.stdout.write("\n  compilando…\n");
  execSync("npx vite build", { stdio: "pipe" });
}

/*
 * **Publicar una versión es cambiar lo que sirve el servidor**, y basta con
 * dos ficheros: el `sw.js` —otra versión en su nombre de caché, que es lo que
 * hace que el navegador lo instale como nuevo— y el `index.html`, con una
 * marca para saber qué página se abrió después. El armazón es el mismo: lo
 * que se prueba es el relevo entre trabajadores, no la compilación.
 */
let version = 1;
const SW = readFileSync("dist/sw.js", "utf8");
const INDEX = readFileSync("dist/index.html", "utf8");
if (!/const VERSION = "[^"]+"/.test(SW)) {
  console.log("\n  ✗ dist/sw.js no tiene su VERSION: ¿se compiló con hacer-sw?\n");
  process.exit(1);
}
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".glb": "model/gltf-binary",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
};
/** Lo que tarda en llegar cada cosa que se pide despacio. Ver el último caso. */
const DESPACIO = 1500;
const servidor = createServer((req, res) => {
  const pedido = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (pedido.startsWith("/despacio/")) {
    res.setHeader("content-type", "text/plain");
    setTimeout(() => res.end("tesela"), DESPACIO);
    return;
  }
  if (pedido === "/sw.js") {
    res.setHeader("content-type", "text/javascript");
    res.setHeader("cache-control", "no-cache");
    res.end(
      SW.replace(
        /const VERSION = "([^"]+)"/,
        (_m, v) => `const VERSION = "${v}-v${version}"`,
      ),
    );
    return;
  }
  const camino = join("dist", normalize(pedido).replace(/^(\.\.[/\\])+/, ""));
  const esFichero = existsSync(camino) && statSync(camino).isFile();
  if (!esFichero || pedido === "/" || pedido.endsWith("/index.html")) {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.setHeader("cache-control", "no-cache");
    res.end(INDEX.replace("<head>", `<head><!-- publicada:${version} -->`));
    return;
  }
  res.setHeader("content-type", TIPOS[extname(camino)] ?? "application/octet-stream");
  createReadStream(camino).pipe(res);
});
await new Promise((listo) => servidor.listen(PUERTO, "127.0.0.1", listo));
const BASE = `http://127.0.0.1:${PUERTO}`;

const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args:
    process.env.OGA_GPU === "1"
      ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
      : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle) =>
  resultados.push({ nombre, ok: !!ok, detalle });

function informar() {
  const bien = resultados.filter((r) => r.ok).length;
  console.log(`\n  ${bien} de ${resultados.length}\n`);
  for (const r of resultados)
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}${r.detalle ? ` — ${r.detalle}` : ""}`);
  console.log("");
  return bien === resultados.length;
}

setTimeout(() => {
  comprobar(
    "el banco acaba",
    false,
    `${TOPE_DEL_BANCO / 60_000} minutos y seguía: algo se quedó esperando sin plazo`,
  );
  informar();
  // Sin esperar al navegador: si algo está colgado, puede ser él.
  process.exit(1);
}, TOPE_DEL_BANCO).unref();

/** Una promesa con plazo: si no llega, falla diciendo qué se esperaba. */
function conTope(promesa, que, ms = TOPE_DE_PREGUNTA) {
  let reloj;
  return Promise.race([
    promesa,
    new Promise((_, mal) => {
      reloj = setTimeout(
        () => mal(new Error(`${que}: sin respuesta en ${ms / 1000} s`)),
        ms,
      );
    }),
  ]).finally(() => clearTimeout(reloj));
}

const CASOS = [
  { nombre: "una versión nueva", tel: "Pixel 7 landscape", antes: 1, despues: 0 },
  { nombre: "dos seguidas", tel: "Pixel 7 landscape", antes: 2, despues: 0 },
  {
    nombre: "dos seguidas, la segunda con el botón ya puesto",
    tel: "iPhone 14 landscape",
    antes: 1,
    despues: 1,
  },
  /*
   * **Y con la página pidiendo cosas, que es como está cuando se toca.**
   *
   * Volando, el juego pide teselas sin parar, y Chrome no deja entrar al
   * trabajador nuevo mientras el viejo tenga alguna a medias: lo para en
   * cuanto se queda sin trabajo y, si la página le pide otra en ese instante,
   * lo vuelve a arrancar. Así se colgaba este banco con las teselas puestas
   * —el caso tres, o ya el dos—, y solo a veces: dependía de que el toque
   * cayera con una tesela en camino. Medido, la recarga de socorro caía
   * entonces con el viejo al mando y salía de dos maneras: la página otra
   * vez con el botón puesto y el nuevo esperando, o colgada a media
   * navegación para siempre.
   *
   * Aquí, con tres bucles de peticiones que tardan lo que una tesela en un
   * teléfono —ver `DESPACIO`—, puestos a mano justo antes de tocar: para el
   * trabajador de servicio son lo mismo, y no dependen de que haya teselas
   * en `dist/` ni de la suerte. Sin `callarLaRed`, tres de tres esperaban a
   * la red de socorro.
   */
  {
    nombre: "una versión nueva, con la página pidiendo sin parar",
    tel: "Pixel 7 landscape",
    antes: 1,
    despues: 0,
    pidiendo: 3,
  },
];

try {
  for (const caso of CASOS) await probar(caso);
} finally {
  await navegador.close().catch(() => {});
  servidor.close();
}

process.exit(informar() ? 0 : 1);

async function probar(caso) {
  version = 1;
  const ctx = await navegador.newContext({
    ...devices[caso.tel],
    hasTouch: true,
    isMobile: true,
    locale: "es-PY",
  });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.addInitScript(() =>
    localStorage.setItem("oga-veve:teclas-vistas", "1"),
  );
  const et = (s) => `${caso.nombre}: ${s}`;
  const preguntar = (fn, arg, que) => conTope(page.evaluate(fn, arg), que);
  /*
   * **Esperar a algo que la página sabe con `await`**, preguntándole cada
   * cuarto de segundo hasta que diga que sí.
   *
   * Se hacía con `waitForFunction`, y esa no espera a una función asíncrona:
   * la promesa que devuelve ya cuenta como «sí». Así que la espera del
   * trabajador nuevo no esperaba nada —medido: «resuelta» a los treinta y
   * cuatro milisegundos con una función que dice que no— y el banco tocaba
   * con lo que hubiera en ese momento.
   */
  const esperarEnLaPagina = async (fn, arg, ms, que) => {
    const hasta = Date.now() + ms;
    for (;;) {
      if (await preguntar(fn, arg, que)) return true;
      if (Date.now() > hasta) return false;
      await new Promise((r) => setTimeout(r, 250));
    }
  };
  try {
    // Volando, que es cuando se toca: con el juego pidiendo piezas por detrás.
    await page.goto(
      `${BASE}/?escenario=pettirossi&hora=16&leccion=despegue&tramo=guyrami&avion=jaz-20&meteo=`,
    );
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {
      timeout: 120_000,
    });
    // Con el juego ya puesto, que quien toca el botón está jugando.
    await page.waitForSelector(".pad--throttle", { timeout: 120_000 });
    await page.waitForTimeout(3000);

    /*
     * Publicar y que la pestaña se entere: lo mismo que hace ella sola cada
     * dos minutos —ver `avisarDeLaVersionNueva`—, sin esperar dos minutos.
     *
     * **Y se espera a esa versión, no a cualquiera.** La espera de antes no
     * esperaba —ver `esperarEnLaPagina`—: lo que paraba el banco era que
     * `update()` contestara, que lo hace al **empezar** a instalarse, y
     * ochocientas milésimas. Con la máquina cargada se tocaba entonces con la
     * versión todavía instalándose, o con la segunda comprobación pegada a la
     * primera sin haber bajado nada, y el relevo que se medía era otro. Ahora
     * se espera a la caché de su armazón, que lleva su número —ver el
     * servidor de arriba—, y a que no quede nadie instalándose. Y se vuelve a
     * preguntar cada pocos segundos, como hace el juego.
     *
     * **Sin esperar a que `update()` conteste**, que la primera vez puede
     * tardar medio minuto. Medido: la primera comprobación después de abrir
     * el navegador tarda entre quince y veinticinco segundos en salir hacia
     * el servidor —cincuenta y dos con la máquina cargada—, con la página
     * libre, el servidor parado, sin voces y sin teselas; las siguientes,
     * cuarenta milésimas. Es el navegador poniéndose en marcha, no el
     * trabajador de servicio ni su caché, que tenía ciento y pico entradas.
     */
    const publicar = async () => {
      version++;
      const desde = Date.now();
      for (;;) {
        await preguntar(
          () =>
            void navigator.serviceWorker
              .getRegistration()
              .then((r) => r?.update())
              .catch(() => {}),
          undefined,
          `publicar la ${version}`,
        );
        const lista = await esperarEnLaPagina(
          async (v) => {
            const r = await navigator.serviceWorker.getRegistration();
            const suya = (await caches.keys()).some(
              (k) => k.endsWith(`-v${v}`) && k.includes("armazon"),
            );
            return suya && !!r?.waiting && !r.installing;
          },
          version,
          10_000,
          `ver instalada la ${version}`,
        );
        if (lista) break;
        if (Date.now() - desde > 120_000)
          throw new Error(`la versión ${version} no se instaló en dos minutos`);
      }
      await page.waitForTimeout(800);
    };
    for (let i = 0; i < caso.antes; i++) await publicar();
    await page.waitForSelector(".version-nueva", { timeout: 10_000 });
    for (let i = 0; i < caso.despues; i++) await publicar();

    /*
     * **Y no encima de un mando de pulgar.** Abajo a la derecha caía sobre el
     * tercio de abajo de la palanca de gases —el ralentí—: bajar el gas con
     * prisa podía recargar la página rodando.
     */
    const solapes = await preguntar(
      () => {
        const b = document.querySelector(".version-nueva")?.getBoundingClientRect();
        if (!b) return ["sin botón"];
        const pisa = [];
        for (const sel of [
          ".pad--throttle",
          ".pad--stick",
          ".pad--rudder",
          '[data-hud="brakes-touch"]',
          '[data-hud="throttle-up"]',
          '[data-hud="throttle-down"]',
        ]) {
          const e = document.querySelector(sel);
          if (!e || e.closest("[hidden]")) continue;
          const r = e.getBoundingClientRect();
          if (!r.width) continue;
          if (b.left < r.right && r.left < b.right && b.top < r.bottom && r.top < b.bottom)
            pisa.push(sel);
        }
        return pisa;
      },
      undefined,
      "mirar dónde cae el botón",
    );
    comprobar(
      et("el botón no pisa ningún mando de pulgar"),
      solapes.length === 0,
      solapes.join(", ") || "libre",
    );

    /*
     * Los bucles de peticiones del último caso, puestos justo antes de tocar:
     * cada uno pide en cuanto le contestan, siempre algo nuevo —que no esté
     * en la caché— y con la misma `fetch` con la que pide el juego sus
     * teselas.
     */
    if (caso.pidiendo)
      await preguntar(
        (n) => {
          let cual = 0;
          for (let k = 0; k < n; k++)
            void (async () => {
              for (;;)
                await fetch(`./despacio/${k}-${cual++}`)
                  .then((r) => r.text())
                  .catch(() => {});
            })();
        },
        caso.pidiendo,
        "poner a pedir la página",
      );

    /*
     * **Y si recargó con el nuevo ya al mando**, o por la red de socorro.
     * Las dos acaban en una recarga, pero la segunda es la que colgaba: se
     * apunta en la sesión, que sobrevive a la recarga, si el relevo llegó
     * antes. Ver `estrenar` en `main.ts`.
     */
    await preguntar(
      () =>
        navigator.serviceWorker.addEventListener("controllerchange", () =>
          sessionStorage.setItem("oga-banco:relevo", "antes"),
        ),
      undefined,
      "escuchar el relevo",
    );
    const caja = await page.locator(".version-nueva").boundingBox();
    const recarga = page
      .waitForEvent("load", { timeout: 30_000 })
      .then(() => true, () => false);
    const tocado = Date.now();
    await page.touchscreen.tap(caja.x + caja.width / 2, caja.y + caja.height / 2);
    const recargo = await recarga;
    const tardo = (Date.now() - tocado) / 1000;
    comprobar(
      et("tocar el botón recarga la página"),
      recargo,
      recargo ? `en ${tardo.toFixed(1)} s` : "treinta segundos y nada",
    );
    if (!recargo) throw new Error("no recargó: lo de después no se puede medir");
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {
      timeout: 30_000,
    });
    await page.waitForTimeout(3000);
    const estado = await preguntar(
      async () => {
        const r = await navigator.serviceWorker.getRegistration();
        return {
          publicada: Number(
            document.documentElement.innerHTML.match(/publicada:(\d+)/)?.[1] ?? 0,
          ),
          armazones: (await caches.keys()).filter((k) => k.includes("armazon")),
          esperando: !!r?.waiting,
          boton: !!document.querySelector(".version-nueva"),
          relevo: sessionStorage.getItem("oga-banco:relevo"),
        };
      },
      undefined,
      "preguntar a la página recargada",
    );
    comprobar(
      et("y recarga con el nuevo ya al mando, no por la red de socorro"),
      estado.relevo === "antes",
      estado.relevo === "antes" ? "" : `recargó con el viejo al mando, a los ${tardo.toFixed(1)} s`,
    );
    const ultima = 1 + caso.antes + caso.despues;
    comprobar(
      et("y abre la última versión, con su trabajador al mando"),
      estado.publicada === ultima &&
        estado.armazones.length === 1 &&
        estado.armazones[0].endsWith(`-v${ultima}`) &&
        !estado.esperando,
      `página ${estado.publicada} de ${ultima} · cachés ${estado.armazones.join(", ")}` +
        (estado.esperando ? " · y otro esperando" : ""),
    );
    comprobar(et("y el botón se va"), !estado.boton, estado.boton ? "sigue ahí" : "");
  } catch (e) {
    // Y cómo estaba la página, que «no se pudo» sin más no dice dónde mirar.
    const como = await preguntar(
      async () => {
        const r = await navigator.serviceWorker.getRegistration();
        const b = document.querySelector(".version-nueva");
        return (
          `botón ${b ? (b.getBoundingClientRect().width ? "a la vista" : "sin tamaño") : "no está"}` +
          ` · esperando ${r?.waiting?.state ?? "nadie"} · instalando ${r?.installing?.state ?? "nadie"}` +
          ` · al mando ${navigator.serviceWorker.controller ? "sí" : "nadie"}`
        );
      },
      undefined,
      "mirar cómo quedó",
    ).catch((x) => String(x));
    comprobar(et("se pudo probar"), false, `${String(e).split("\n")[0].slice(0, 200)} · ${como}`);
  }
  if (errores.length) comprobar(et("sin errores en la página"), false, errores.join(" · "));
  await conTope(ctx.close(), "cerrar la pestaña").catch(() => {});
}

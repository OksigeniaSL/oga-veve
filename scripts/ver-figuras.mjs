/**
 * **Los instrumentos por dentro, abiertos en su sitio**, mirados y medidos.
 *
 * Abre cada figura donde va —la IAS y la ALT del cuadro, en el teléfono por
 * su pantalla grande; la tarjeta del PAPI de la final, y el pitot, los
 * alerones, la profundidad, el timón, los flaps y el motor de la tarjeta del
 * avión— en una tablet y en un teléfono tumbado,
 * en los tres peldaños que tienen figura distinta, y saca la foto de cada
 * una. Y comprueba lo que una foto no dice:
 *
 * 1. **Que llega a montarse**: el trozo de la figura se pide y se pinta, y se
 *    queda abierta: el clic que sigue al toque que la abre no la cierra.
 * 2. **Que cabe**: la figura y el botón de cerrar, dentro de la pantalla.
 * 3. **Que se toca con el dedo**: cada mando de la figura mide 44 × 44 o más.
 * 4. **Que en Guyrami no hay letras**: ni una letra ni un número a la vista,
 *    tampoco en el botón «Por dentro», que es solo el engranaje.
 * 5. **Que se mueve con el teclado** y el panel no le roba las flechas.
 * 6. **Que se va entera al cerrar**: ni rastro de la figura en la página.
 * 7. **Que solo va en el avión que dibuja**: los mandos y los flaps, en el
 *    JAZ 20 y no en el JAZ 90; el pitot del morro del reactor, sin figura;
 *    cada motor en el suyo: el de pistones en el JAZ 20, el turbohélice en
 *    el JAZ 60, el turbofán en el JAZ 90, y nada en el bimotor ni en el
 *    fumigador, que llevan otros; y el tren fijo en el JAZ 20 y el que se
 *    recoge en el JAZ 60, y ninguno en los demás.
 * 8. **Que «reducir movimiento» la deja quieta**: el avión del PAPI no pasea.
 *
 * Uso: `node scripts/ver-figuras.mjs carpeta`. Con `OGA_GPU=1`, con la tarjeta
 * de verdad; `OGA_IDIOMA=en` para mirarlas en inglés (por defecto, en
 * castellano); `OGA_PUERTO` para no pisar a otro banco.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";

const FOTOS = process.argv[2];
if (!FOTOS) {
  console.error("  uso: node scripts/ver-figuras.mjs carpeta");
  process.exit(2);
}
mkdirSync(FOTOS, { recursive: true });
const CON_GPU = process.env.OGA_GPU === "1";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5352);
const IDIOMA = process.env.OGA_IDIOMA ?? "es-PY";

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const PANTALLAS = {
  tablet: { viewport: { width: 1280, height: 800 }, hasTouch: true },
  telefono: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
};
const TRAMOS = ["guyrami", "tuka", "taguato"];

const fallos = [];
const comprobar = (nombre, ok, detalle = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  if (!ok) fallos.push(nombre);
};

/** Abre el juego y espera al avión de verdad, con el cuadro abierto. */
async function abrir(pantalla, tramo, avion, { quieto = false } = {}) {
  // «Reducir movimiento», el del aparato: el ajuste del juego viene en «sistema».
  const page = await navegador.newPage({
    ...PANTALLAS[pantalla],
    locale: IDIOMA,
    reducedMotion: quieto ? "reduce" : "no-preference",
  });
  page.on("pageerror", (e) => console.log("  ERROR:", e.message));
  await page.addInitScript((idioma) => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
    localStorage.setItem("oga-veve:idioma", idioma);
  }, IDIOMA);
  await page.goto(`${BASE}/?escenario=tenerife-norte&hora=12&leccion=despegue&tramo=${tramo}&avion=${avion}`);
  await page.bringToFront();
  await page.waitForFunction(() => globalThis.__oga?.aeronave?.().deVerdad === true, null, {
    timeout: 180000,
  });
  await page.evaluate(() => {
    const cuadro = document.querySelector('[data-hud="cuadro"]');
    if (!cuadro?.classList.contains("cuadro--bajado")) return;
    document
      .querySelector('[data-hud="cuadro-tirador"]')
      ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  });
  await page.waitForTimeout(1500);
  return page;
}

/**
 * Toca con el dedo el centro **de lo que se ve** de lo que case con `sel`: la
 * cinta de la velocidad del reactor mide dos mil píxeles, y su centro cae
 * fuera de la pantalla.
 */
async function tocar(page, sel) {
  const r = await page.evaluate((s) => {
    for (const e of document.querySelectorAll(s)) {
      const b = e.getBoundingClientRect();
      const l = Math.max(0, b.left);
      const d = Math.min(innerWidth, b.right);
      const a = Math.max(0, b.top);
      const ab = Math.min(innerHeight, b.bottom);
      if (d - l > 0 && ab - a > 0) return { x: (l + d) / 2, y: (a + ab) / 2 };
    }
    return null;
  }, sel);
  if (!r) return false;
  await page.touchscreen.tap(r.x, r.y);
  return true;
}

/**
 * Espera a que la figura esté montada en la ventana, y un poco más: el clic
 * que el navegador manda detrás del toque llega después, y es el que la
 * cerraba.
 */
async function esperarFigura(page, cual) {
  const ok = await page
    .waitForSelector(`#explicacion .explica__figura .fig-${cual} svg`, { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  if (!ok) return false;
  await page.waitForTimeout(900);
  return page.evaluate(
    (c) => !document.getElementById("explicacion")?.hidden && !!document.querySelector(`#explicacion .fig-${c}`),
    cual,
  );
}

/** Lo que se mide de la figura abierta. */
const medir = (page) =>
  page.evaluate(() => {
    const fig = document.querySelector("#explicacion [data-explica-figura]");
    if (!fig) return null;
    const visible = (el) => {
      for (let e = el; e && e !== fig.parentElement; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
      }
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0;
    };
    const r = fig.getBoundingClientRect();
    const acciones = document.querySelector("#explicacion .concha__acciones")?.getBoundingClientRect();
    const cajas = [...fig.querySelectorAll('[role="slider"], [role="button"], [role="switch"]')]
      .filter(visible)
      .map((m) => ({ nombre: m.getAttribute("aria-label"), b: m.getBoundingClientRect() }));
    /*
     * Un mando chico vale si su dedo cae en otro grande: el de tirar y empujar
     * el volante es la marca del teclado, y con el dedo se tira del volante,
     * que es la zona grande de al lado.
     */
    const mandos = cajas.map(({ nombre, b }) => {
      const cx = b.left + b.width / 2;
      const cy = b.top + b.height / 2;
      const dentroDe = cajas.find(
        (o) => o.b !== b && o.b.width >= 44 && o.b.height >= 44 && cx >= o.b.left && cx <= o.b.right && cy >= o.b.top && cy <= o.b.bottom,
      );
      return { nombre, w: Math.round(b.width), h: Math.round(b.height), en: dentroDe?.nombre ?? null };
    });
    /*
     * Lo que se arrastra no deja rodar la ventana por encima, así que eso es
     * lo que tiene que caber entero en la pantalla. Lo demás —la cabina y el
     * despiece del PAPI— se puede rodar.
     */
    const arrastres = [...fig.querySelectorAll("svg")]
      .filter((x) => getComputedStyle(x).touchAction === "none")
      .map((x) => {
        const b = x.getBoundingClientRect();
        return { arriba: Math.round(b.top), abajo: Math.round(b.bottom) };
      });
    // Lo que solo oye el lector de pantalla —los avisos `aria-live`— no se ve.
    const letras = [...fig.querySelectorAll("text")]
      .filter((t) => !t.closest("[aria-live]") && /[\p{L}\p{N}]/u.test(t.textContent ?? "") && visible(t))
      .map((t) => t.textContent);
    return {
      edad: fig.dataset.edad,
      foco: fig.dataset.foco ?? null,
      blanca: fig.dataset.blanca ?? null,
      arriba: Math.round(r.top),
      abajo: Math.round(r.bottom),
      ancho: Math.round(r.width),
      alto: innerHeight,
      cerrarAbajo: acciones ? Math.round(acciones.bottom) : null,
      arrastres,
      mandos,
      letras,
    };
  });

/** Una figura abierta: sus comprobaciones y su foto. */
async function revisar(page, pantalla, tramo, etiqueta) {
  const m = await medir(page);
  const n = `${pantalla} ${tramo} ${etiqueta}`;
  if (!m) return comprobar(`${n}: montada`, false);
  comprobar(`${n}: montada, en ${m.edad}`, m.edad === tramo);
  comprobar(
    `${n}: lo que se arrastra cabe, y cerrar a la vista`,
    m.arrastres.length > 0 &&
      m.arrastres.every((a) => a.arriba >= 0 && a.abajo <= m.alto) &&
      m.cerrarAbajo !== null &&
      m.cerrarAbajo <= m.alto,
    `figura ${m.arriba}–${m.abajo} de ${m.alto}, ${m.ancho} de ancho; arrastre ${m.arrastres
      .map((a) => `${a.arriba}–${a.abajo}`)
      .join(", ")}; cerrar hasta ${m.cerrarAbajo}`,
  );
  const chicos = m.mandos.filter((x) => (x.w < 44 || x.h < 44) && !x.en);
  comprobar(
    `${n}: mandos de un dedo`,
    m.mandos.length > 0 && chicos.length === 0,
    m.mandos.map((x) => `${x.nombre} ${x.w}×${x.h}${x.en ? ` (en «${x.en}»)` : ""}`).join(", "),
  );
  if (tramo === "guyrami") comprobar(`${n}: sin letras`, m.letras.length === 0, m.letras.join(" · "));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${FOTOS}/${pantalla}-${tramo}-${etiqueta}.png` });
  return m;
}

/**
 * Con el teclado: el primer deslizador —o el interruptor del tren—, una
 * flecha, y el valor cambia sin que el panel se lleve el foco.
 */
async function conElTeclado(page, nombre) {
  const SEL = '#explicacion .explica__figura [role="slider"], #explicacion .explica__figura [role="switch"]';
  const { antes, tecla } = await page.evaluate((sel) => {
    const s = document.querySelector(sel);
    s?.focus();
    const interruptor = s?.getAttribute("role") === "switch";
    return {
      antes: s ? s.getAttribute(interruptor ? "aria-checked" : "aria-valuenow") : null,
      tecla: interruptor ? "ArrowUp" : s?.getAttribute("aria-orientation") === "vertical" ? "ArrowDown" : "ArrowRight",
    };
  }, SEL);
  await page.keyboard.down(tecla);
  await page.waitForTimeout(250);
  const durante = await page.evaluate((sel) => {
    const s = document.querySelector(sel);
    const interruptor = s?.getAttribute("role") === "switch";
    return { valor: s?.getAttribute(interruptor ? "aria-checked" : "aria-valuenow"), foco: document.activeElement === s };
  }, SEL);
  await page.keyboard.up(tecla);
  comprobar(
    `${nombre}: con el teclado`,
    antes !== null && durante.valor !== antes && durante.foco,
    `${antes} → ${durante.valor}${durante.foco ? "" : ", el foco se fue"}`,
  );
}

/** Cierra la ventana con Escape, si está abierta, y mira que no quede nada de la figura. */
async function cerrar(page, nombre) {
  const abierta = await page.evaluate(() => !document.getElementById("explicacion")?.hidden);
  if (abierta) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
  const queda = await page.evaluate(() => ({
    figuras: document.querySelectorAll('[class*="fig-"]').length,
    abierta: !document.getElementById("explicacion")?.hidden,
  }));
  comprobar(`${nombre}: se va entera al cerrar`, abierta && queda.figuras === 0 && !queda.abierta, JSON.stringify({ ...queda, estabaAbierta: abierta }));
}

/** Toca un punto de la tarjeta del avión y mide su «por dentro», si lo tiene. */
async function porDentro(page, pieza) {
  await page.evaluate((p) => {
    document.querySelector(`.tav__punto[data-pieza="${p}"]`)?.click();
  }, pieza);
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    const b = document.querySelector('[data-tarjeta="globo"]:not([hidden]) .tav__por-dentro');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), letras: b.innerText.trim(), lector: b.getAttribute("aria-label") ?? "" };
  });
}

/** El «por dentro» de un punto: el botón, la figura que abre y su foto. */
async function abrirPorDentro(page, pantalla, tramo, pieza, cual, etiqueta) {
  const boton = await porDentro(page, pieza);
  const n = `${pantalla} ${tramo} ${etiqueta}`;
  comprobar(`${n}: «por dentro» de un dedo`, !!boton && boton.w >= 44 && boton.h >= 44, boton ? `${boton.w}×${boton.h}` : "no está");
  if (!boton) return null;
  // En Guyrami, solo el engranaje; su nombre, para el lector de pantalla.
  if (tramo === "guyrami")
    comprobar(`${n}: «por dentro» sin letras, con su nombre`, boton.letras === "" && boton.lector !== "", `«${boton.letras}» · «${boton.lector}»`);
  if (!(await tocar(page, '[data-tarjeta="globo"]:not([hidden]) .tav__por-dentro')) || !(await esperarFigura(page, cual))) {
    comprobar(`${n}: figura`, false);
    await cerrar(page, n);
    return null;
  }
  const m = await revisar(page, pantalla, tramo, etiqueta);
  if (pantalla === "tablet" && tramo === "taguato") await conElTeclado(page, n);
  await cerrar(page, n);
  return m;
}

try {
  for (const pantalla of ["tablet", "telefono"]) {
    for (const tramo of TRAMOS) {
      console.log(`\n  ── ${pantalla}, ${tramo}, JAZ 20 ──`);
      const page = await abrir(pantalla, tramo, "jaz-20");
      if (CON_GPU && pantalla === "tablet" && tramo === "guyrami") {
        const tarjeta = await page.evaluate(() => {
          const gl = document.createElement("canvas").getContext("webgl");
          const i = gl?.getExtension("WEBGL_debug_renderer_info");
          return i ? gl.getParameter(i.UNMASKED_RENDERER_WEBGL) : "?";
        });
        console.log(`  tarjeta gráfica: ${tarjeta}`);
      }

      for (const [sel, cual, etiqueta, losa] of [
        ['.cuadro [data-explica="velocidad"]', "velocimetro", "ias-velocimetro", ".tel__losa--ias"],
        ['.cuadro [data-explica="altitud"]', "altimetro", "alt-altimetro", ".tel__losa--alt"],
      ]) {
        const n = `${pantalla} ${tramo} ${etiqueta}`;
        /*
         * **En el teléfono, en dos toques**: la losa pone grande la pantalla
         * —y no abre nada, que se toca a cada rato volando— y en la grande la
         * cinta o el reloj se explican. Ver `ui/tocar-para-explicar.ts`.
         */
        let tocado;
        if (pantalla === "telefono") {
          await tocar(page, losa);
          await page.waitForTimeout(500);
          const grande = await page.evaluate(() => ({
            grande: !!document.querySelector(".cuadro--grande"),
            abierta: !document.getElementById("explicacion")?.hidden,
          }));
          comprobar(`${n}: la losa pone grande la pantalla y no abre nada`, grande.grande && !grande.abierta, JSON.stringify(grande));
          tocado = await tocar(page, `.cuadro--grande ${sel.replace(".cuadro ", "")}`);
        } else tocado = await tocar(page, sel);
        if (tocado && (await esperarFigura(page, cual))) {
          await revisar(page, pantalla, tramo, etiqueta);
          if (pantalla === "tablet" && tramo === "taguato") await conElTeclado(page, n);
        } else comprobar(`${n}: se toca y se abre`, false);
        await cerrar(page, n);
        // Y del grande se vuelve a las losas tocando el horizonte, que sigue siendo fondo.
        if (pantalla === "telefono") {
          await tocar(page, '.cuadro--grande [data-explica="actitud"]');
          await page.waitForTimeout(400);
          const vuelta = await page.evaluate(() => ({
            grande: !!document.querySelector(".cuadro--grande"),
            abierta: !document.getElementById("explicacion")?.hidden,
          }));
          comprobar(`${n}: el horizonte vuelve a las losas`, !vuelta.grande && !vuelta.abierta, JSON.stringify(vuelta));
        }
      }

      // La tarjeta del PAPI, como en la final: se toca y abre el PAPI por dentro.
      await page.evaluate(() => globalThis.__oga.papiVisto(2));
      await page.waitForTimeout(300);
      const senal = await page.evaluate(() => {
        const s = document.querySelector('[data-hud="senal"]');
        return s ? { puesta: !s.hidden, explica: s.classList.contains("senal--explica"), llama: s.classList.contains("senal--pulsable") } : null;
      });
      comprobar(`${pantalla} ${tramo} PAPI: su tarjeta se toca sin llamar`, !!senal?.puesta && senal.explica && !senal.llama, JSON.stringify(senal));
      if ((await tocar(page, '[data-hud="senal"]')) && (await esperarFigura(page, "papi"))) {
        await revisar(page, pantalla, tramo, "papi");
        if (pantalla === "tablet" && tramo === "taguato") await conElTeclado(page, `${pantalla} ${tramo} PAPI`);
      } else comprobar(`${pantalla} ${tramo} PAPI: se abre y se queda abierta`, false);
      await cerrar(page, `${pantalla} ${tramo} PAPI`);

      // La tarjeta del avión: el pitot, los tres mandos, los flaps y el motor de pistones.
      await page.evaluate(() => globalThis.__oga.alternarTarjeta());
      const puntos = await page
        .waitForSelector('.tav__punto[data-pieza="pitot"]', { timeout: 60000 })
        .then(() => true)
        .catch(() => false);
      comprobar(`${pantalla} ${tramo} tarjeta: sus puntos`, puntos);
      if (puntos)
        for (const [pieza, cual, foco] of [
          ["pitot", "velocimetro", null],
          ["alerones", "mandos", "alerones"],
          ["profundidad", "mandos", "profundidad"],
          ["timon", "mandos", "timon"],
          ["flaps", "flaps", null],
          ["motor", "piston", null],
          ["tren", "tren-fijo", null],
          ["luces", "luces", null],
        ]) {
          const m = await abrirPorDentro(page, pantalla, tramo, pieza, cual, `tarjeta-${pieza}`);
          if (m && foco) comprobar(`${pantalla} ${tramo} tarjeta ${pieza}: delante su circuito`, m.foco === foco, m.foco);
          if (m && pieza === "luces") comprobar(`${pantalla} ${tramo} tarjeta luces: la blanca en la cola`, m.blanca === "cola", m.blanca);
        }
      await page.close();
    }
  }

  /* ── Los motores de turbina, cada uno en su avión ── */
  for (const [avion, cual] of [
    ["jaz-60", "turbohelice"],
    ["jaz-90", "turbofan"],
  ]) {
    for (const pantalla of ["tablet", "telefono"]) {
      for (const tramo of TRAMOS) {
        console.log(`\n  ── ${pantalla}, ${tramo}, ${avion} ──`);
        const page = await abrir(pantalla, tramo, avion);
        await page.evaluate(() => globalThis.__oga.alternarTarjeta());
        await page.waitForSelector('.tav__punto[data-pieza="motor"]', { timeout: 60000 }).catch(() => {});
        await abrirPorDentro(page, pantalla, tramo, "motor", cual, `${avion}-motor-${cual}`);
        // Y el tren que se recoge, el del JAZ 60; el del reactor no es ese.
        if (avion === "jaz-60") await abrirPorDentro(page, pantalla, tramo, "tren", "tren-retractil", `${avion}-tren-retractil`);
        else comprobar(`${pantalla} ${tramo} ${avion} tren: sin «por dentro», que no es el suyo`, (await porDentro(page, "tren")) === null);
        /*
         * Y en el reactor, lo que no es suyo no sale: ni los mandos de cables
         * ni los flaps del JAZ 20, ni el pitot de debajo del ala.
         */
        if (avion === "jaz-90" && pantalla === "tablet" && tramo === "taguato") {
          // Sus luces, con la blanca en las puntas, como su modelo y «Armá tu avión».
          const m = await abrirPorDentro(page, pantalla, tramo, "luces", "luces", "jaz-90-luces");
          comprobar("JAZ 90 luces: la blanca en las puntas", m?.blanca === "puntas", m?.blanca);
          for (const pieza of ["pitot", "alerones", "flaps"])
            comprobar(`JAZ 90 tarjeta ${pieza}: sin «por dentro»`, (await porDentro(page, pieza)) === null);
          await page.evaluate(() => globalThis.__oga.alternarTarjeta());
          const ias = (await tocar(page, '.cuadro [data-explica="velocidad"]')) && (await esperarFigura(page, "velocimetro"));
          comprobar("JAZ 90 IAS: con su velocímetro por dentro", ias);
          if (ias) await page.screenshot({ path: `${FOTOS}/tablet-taguato-jaz90-ias.png` });
          await cerrar(page, "JAZ 90 IAS");
        }
        await page.close();
      }
    }
  }

  // El bimotor de pistón y el fumigador llevan otros motores: sin la figura del de la avioneta.
  for (const avion of ["jaz-40", "jaz-25"]) {
    const page = await abrir("tablet", "taguato", avion);
    await page.evaluate(() => globalThis.__oga.alternarTarjeta());
    await page.waitForSelector('.tav__punto[data-pieza="motor"]', { timeout: 60000 }).catch(() => {});
    comprobar(`${avion} motor: sin «por dentro», que no es el suyo`, (await porDentro(page, "motor")) === null);
    comprobar(`${avion} tren: sin «por dentro», que no es el suyo`, (await porDentro(page, "tren")) === null);
    if (avion === "jaz-25")
      comprobar("jaz-25 luces: sin «por dentro», que no lleva destellos", (await porDentro(page, "luces")) === null);
    await page.close();
  }

  /* ── Reducir movimiento: el avión del PAPI no pasea; sin reducir, sí ── */
  console.log("\n  ── el movimiento ──");
  for (const quieto of [false, true]) {
    const page = await abrir("tablet", "taguato", "jaz-20", { quieto });
    await page.evaluate(() => globalThis.__oga.papiVisto(2));
    await page.waitForTimeout(300);
    await tocar(page, '[data-hud="senal"]');
    await esperarFigura(page, "papi");
    const angulo = () =>
      page.evaluate(() => document.querySelector('#explicacion [data-papi="plane"]')?.getAttribute("aria-valuenow"));
    const a0 = await angulo();
    await page.waitForTimeout(6500);
    const a1 = await angulo();
    comprobar(
      quieto ? "reducir movimiento: el avión del PAPI se queda quieto" : "sin reducir: el avión del PAPI pasea solo",
      a0 !== undefined && (quieto ? a0 === a1 : a0 !== a1),
      `${a0} → ${a1}`,
    );
    if (quieto) await page.screenshot({ path: `${FOTOS}/tablet-taguato-papi-reducido.png` });
    await cerrar(page, quieto ? "PAPI quieto" : "PAPI con movimiento");
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

console.log(fallos.length ? `\n  ${fallos.length} fallos:\n  - ${fallos.join("\n  - ")}` : "\n  todo bien");
process.exit(fallos.length ? 1 : 0);

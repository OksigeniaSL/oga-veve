/**
 * **El dedo, en tres preguntas**, y el panel de accesibilidad de la casa.
 *
 * Las tres preguntas las trajo Gaudí, el agente de arte, de mirar webs
 * premiadas con un teléfono en la mano:
 *
 * 1. **Un toque no deja el `:hover` pegado.** En una pantalla táctil el
 *    navegador da el `:hover` al tocar y lo deja puesto hasta que se toca otra
 *    cosa: el botón que crece o se ilumina al pasar el ratón se queda crecido
 *    o iluminado, y se lee como «sigue elegido» o «sigue abierto». Aquí todos
 *    los `:hover` van dentro de `@media (hover: hover)` desde el 12-11, y lo
 *    vigila `navegador-viejo.test.ts` leyendo la hoja; esto lo mira en la
 *    página, que es donde se ven también los estilos que no están en la hoja
 *    —los de un componente con su sombra, como el panel de accesibilidad—.
 * 2. **Lo que se aprieta responde con `:active`.** Sin respuesta, quien tiene
 *    cuatro años aprieta más fuerte o vuelve a tocar.
 * 3. **Con «reducir movimiento» no queda nada oculto ni en marcha.** Lo que
 *    espera una animación de entrada que no llega se queda a opacidad cero, y
 *    un latido infinito sigue latiendo (DESIGN.md §9, «Con reducir
 *    movimiento»).
 *
 * El `:hover` y el `:active` se fuerzan por el protocolo de Chrome
 * (`CSS.forcePseudoState`) y se compara el estilo calculado con el de reposo.
 * No se toca de verdad para el veredicto: lo que deja un toque depende de la
 * prueba de impacto y del reloj, y el toque, además, apretaría el botón. La
 * hoja da siempre la misma respuesta.
 *
 * Y el panel: que sale en la pantalla de pilotos y en el hangar sin tapar nada
 * que se toque, que no está en el vuelo, que con un enlace directo al vuelo ni
 * se pide, y que no pide nada fuera de casa. Ver `ui/panel-de-acceso.ts`.
 *
 * La misma comprobación, para cualquier web de Oksigenia, vive en la batería
 * común de hq (`kit/bateria-navegador/touch.mjs`).
 *
 *     npm run toque
 *     OGA_FOTOS=/tmp/fotos npm run toque     (con capturas)
 */

import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = Number(process.env.OGA_PUERTO ?? 5331);
const FOTOS = process.env.OGA_FOTOS ?? null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });

/** Lo que tiene que cambiar para que un estado se vea. */
const VISIBLE = [
  "background-color",
  "background-image",
  "color",
  "border-color",
  "box-shadow",
  "outline-style",
  "opacity",
  "transform",
  "scale",
  "translate",
  "filter",
];

/** Lo que se toca. Con lo de dentro de las sombras: el panel es un componente. */
const TOCABLE =
  'button, a[href], [role="button"], [role="radio"], [role="checkbox"], [role="tab"], summary';

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, strictPort: false, hmr: false },
  logLevel: "warn",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle, porque = "") =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

const PRIMERA_VEZ = () => {
  localStorage.setItem("oga-veve:teclas-vistas", "1");
  if (localStorage.getItem("oga-veve:guardado") === null)
    localStorage.setItem("oga-veve:cuaderno", JSON.stringify({ despegues: 1, segundos: 600 }));
};

try {
  // Tablet y teléfono tumbado, con el dedo: donde el `:hover` se pega.
  for (const [ancho, alto] of [
    [1024, 600],
    [915, 412],
  ]) {
    const tam = `${ancho}×${alto} con el dedo`;
    const page = await navegador.newPage({
      viewport: { width: ancho, height: alto },
      hasTouch: true,
      isMobile: true,
      locale: "es-PY",
    });
    vigilarLaRed(page, tam);
    await page.addInitScript(PRIMERA_VEZ);
    await page.goto(`${BASE}/`);
    await page.waitForSelector(".piloto__boton", { timeout: 90000 });
    await esperarAlPanel(page);
    await lasDosPreguntas(page, `pilotos ${tam}`);
    await elPanelNoTapa(page, `pilotos ${tam}`);
    await foto(page, `pilotos-${ancho}x${alto}`);

    await page.click(".piloto__boton");
    await page.waitForSelector(".ficha--sitio", { timeout: 90000 });
    await page.waitForTimeout(600);
    await lasDosPreguntas(page, `hangar ${tam}`);
    await elPanelNoTapa(page, `hangar ${tam}`);
    for (const p of ["que", "quien", "conque", "ajustes"]) {
      const boton = page.locator(`[data-pantalla="${p}"]:visible`).first();
      if (!(await boton.count())) continue;
      await boton.click({ timeout: 5000 });
      await page.waitForTimeout(400);
      await lasDosPreguntas(page, `hangar/${p} ${tam}`);
      await elPanelNoTapa(page, `hangar/${p} ${tam}`);
      await foto(page, `hangar-${p}-${ancho}x${alto}`);
      await page.locator('[data-pantalla="inicio"]:visible').first().click({ timeout: 5000 });
      await page.waitForTimeout(300);
    }

    // Y abierto el panel, sus botones también.
    await page.evaluate(() =>
      document.querySelector("oksigenia-access-panel")?.shadowRoot?.querySelector("#oks-trigger")?.click(),
    );
    await page.waitForTimeout(400);
    await lasDosPreguntas(page, `panel de accesibilidad ${tam}`, { soloSombra: true });
    await foto(page, `panel-${ancho}x${alto}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // Al vuelo: el panel se va.
    await page.click(".hangar__despegar");
    await page.waitForFunction(() => document.querySelector("#hangar")?.hidden === true, null, {
      timeout: 90000,
    });
    await page.waitForFunction(() => globalThis.__oga?.estado?.(), null, { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const enVuelo = await page.evaluate(() => {
      const p = document.querySelector("oksigenia-access-panel");
      return p ? getComputedStyle(p).display !== "none" && !p.hidden : false;
    });
    comprobar(`vuelo ${tam}: sin panel de accesibilidad`, !enVuelo, enVuelo ? "se ve" : "escondido",
      "en el vuelo la ventana es el instrumento");
    await lasDosPreguntas(page, `vuelo ${tam}`);
    await foto(page, `vuelo-${ancho}x${alto}`);

    const pausa = page.locator('[data-hud="pausa"]:visible').first();
    if (await pausa.count()) {
      await pausa.click({ timeout: 5000 });
      await page.waitForTimeout(500);
      await lasDosPreguntas(page, `pausa ${tam}`);
      await foto(page, `pausa-${ancho}x${alto}`);
    }
    await page.close();
  }

  // Con un enlace directo al vuelo, el panel ni se baja.
  {
    const page = await navegador.newPage({ viewport: { width: 1280, height: 800 } });
    let pedido = false;
    page.on("request", (r) => {
      if (r.url().includes("oksigenia-access-panel")) pedido = true;
    });
    await page.addInitScript(PRIMERA_VEZ);
    await page.goto(`${BASE}/?escenario=pettirossi`);
    await page.waitForFunction(() => globalThis.__oga?.estado?.(), null, { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(2000);
    comprobar("enlace directo al vuelo: el panel no se pide", !pedido, pedido ? "se pidió" : "no se pidió",
      "veinte kilobytes que nadie va a usar");
    await page.close();
  }

  // Con «reducir movimiento», del sistema y con la fila «Movimiento» del juego.
  for (const como of ["sistema", "ajuste"]) {
    const page = await navegador.newPage({
      viewport: { width: 1024, height: 600 },
      hasTouch: true,
      isMobile: true,
      locale: "es-PY",
      reducedMotion: como === "sistema" ? "reduce" : "no-preference",
    });
    await page.addInitScript(PRIMERA_VEZ);
    await page.goto(`${BASE}/`);
    await page.waitForSelector(".piloto__boton", { timeout: 90000 });
    if (como === "ajuste") {
      // La fila «Movimiento: reducido», guardada en el piloto como la guardan
      // los ajustes del vuelo, y de vuelta a empezar: es lo que hace quien la
      // eligió ayer y abre hoy el juego.
      await page.evaluate(async () => {
        const { ponerTexto } = await import("/src/datos/guardado.ts");
        ponerTexto("ajuste.movimiento", "reducido");
      });
      await page.reload();
      await page.waitForSelector(".piloto__boton", { timeout: 90000 });
    }
    await quieto(page, `pilotos, movimiento reducido (${como})`);
    await page.click(".piloto__boton");
    await page.waitForSelector(".ficha--sitio", { timeout: 90000 });
    await quieto(page, `hangar, movimiento reducido (${como})`);
    await page.click(".hangar__despegar");
    await page.waitForFunction(() => document.querySelector("#hangar")?.hidden === true, null, { timeout: 90000 });
    await page.waitForFunction(() => globalThis.__oga?.estado?.(), null, { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await quieto(page, `vuelo, movimiento reducido (${como})`);
    await foto(page, `quieto-${como}`);
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length}\n`);
for (const r of resultados)
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}${r.detalle ? ` — ${r.detalle}` : ""}${!r.ok && r.porque ? `\n      (${r.porque})` : ""}`);
console.log("");
process.exit(resultados.length && bien === resultados.length ? 0 : 1);

// ── Las piezas ─────────────────────────────────────────────────────────

function vigilarLaRed(page, tam) {
  const fuera = new Set();
  page.on("request", (r) => {
    const u = r.url();
    if (!u.startsWith(BASE) && !/^(data|blob):/.test(u)) fuera.add(u.slice(0, 100));
  });
  page.on("close", () =>
    comprobar(`${tam}: nada pedido fuera de casa`, fuera.size === 0, [...fuera].join(" · ") || "nada",
      "regla 7 de AGENTS.md: ni analítica ni terceros"),
  );
}

async function esperarAlPanel(page) {
  const llego = await page
    .waitForFunction(() => document.documentElement.classList.contains("con-panel-de-acceso"), null, {
      timeout: 30000,
    })
    .then(() => true)
    .catch(() => false);
  comprobar("el panel de accesibilidad llega", llego, llego ? "" : "no se definió en 30 s");
}

async function foto(page, nombre) {
  if (FOTOS) await page.screenshot({ path: `${FOTOS}/toque-${nombre}.png` });
}

/** Que el botón del panel se vea, mida lo que pide el dedo y no pise nada que se toque. */
async function elPanelNoTapa(page, donde) {
  const m = await page.evaluate((TOCABLE) => {
    const host = document.querySelector("oksigenia-access-panel");
    const b = host && !host.hidden ? host.shadowRoot?.querySelector("#oks-trigger") : null;
    if (!b) return null;
    const r = b.getBoundingClientRect();
    // El lado, de su caja y no de lo que se ve: apretado encoge un 7 % y vuelve.
    const lado = Math.min(b.offsetWidth, b.offsetHeight);
    const pisa = [];
    for (const el of document.querySelectorAll(`${TOCABLE}, .ficha, .paso, .idioma`)) {
      if (el.closest("[hidden]")) continue;
      const q = el.getBoundingClientRect();
      if (!q.width || !q.height || getComputedStyle(el).visibility === "hidden") continue;
      const w = Math.min(r.right, q.right) - Math.max(r.left, q.left);
      const h = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top);
      if (w > 0 && h > 0) pisa.push(`${el.className.toString().split(" ")[0]} «${(el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 24)}»`);
    }
    return { lado, pisa };
  }, TOCABLE);
  comprobar(`${donde}: el panel de accesibilidad está`, !!m, m ? `${m.lado} px` : "no se ve");
  if (!m) return;
  comprobar(`${donde}: el panel no tapa nada que se toque`, m.pisa.length === 0, m.pisa.join(" · ") || "libre",
    "un toque en la esquina de una tarjeta abría el panel en vez de elegirla");
  comprobar(`${donde}: el botón del panel mide lo que el dedo`, m.lado >= 44, `${m.lado} px`, "DESIGN.md §8: 44 × 44");
}

/** Los tocables visibles, guardados en la página para que el protocolo encuentre cada nodo. */
async function recoger(page, { soloSombra = false } = {}) {
  return page.evaluate(
    ({ TOCABLE, soloSombra }) => {
      const raices = soloSombra ? [] : [document];
      const andar = (raiz) => {
        for (const el of raiz.querySelectorAll("*"))
          if (el.shadowRoot) {
            raices.push(el.shadowRoot);
            andar(el.shadowRoot);
          }
      };
      andar(document);
      const vistos = [];
      for (const raiz of raices)
        for (const el of raiz.querySelectorAll(TOCABLE)) {
          if (el.closest("[hidden]") || el.hasAttribute("disabled")) continue;
          // El freno responde por su clase, `freno--pisado`, que pone el
          // código al pisarlo y quita al soltarlo: no pasa por `:active`.
          if (el.matches('[data-hud="brakes-touch"]')) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none") continue;
          let o = 1;
          for (let p = el; p && p.nodeType === 1; p = p.parentElement ?? p.getRootNode()?.host) o *= Number(getComputedStyle(p).opacity);
          if (o < 0.05) continue;
          vistos.push(el);
        }
      globalThis.__tocables = vistos;
      return vistos.map(
        (e) =>
          e.getAttribute("data-hud") ||
          e.getAttribute("aria-label") ||
          (e.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 24) ||
          `${e.tagName.toLowerCase()}.${e.classList[0] ?? ""}`,
      );
    },
    { TOCABLE, soloSombra },
  );
}

/** Las dos preguntas del estilo: `:hover` pegado con el dedo y `:active` que responde. */
async function lasDosPreguntas(page, donde, opciones = {}) {
  const nombres = await recoger(page, opciones);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
  /*
   * Sin transiciones mientras se mide: un `:active` de 90 ms se leería a
   * medias. **También dentro de las sombras**, que una hoja de la página no
   * cruza: el panel de accesibilidad lleva sus transiciones de 0,2 s, y leído
   * antes de acabar parecía mudo y el botón medía 41 px en vez de 44.
   */
  await page.evaluate(() => {
    const quieta = "*, *::before, *::after { transition: none !important; }";
    const raices = [document.head];
    const andar = (raiz) => {
      for (const el of raiz.querySelectorAll("*"))
        if (el.shadowRoot) {
          raices.push(el.shadowRoot);
          andar(el.shadowRoot);
        }
    };
    andar(document);
    for (const r of raices) {
      const st = document.createElement("style");
      st.dataset.toque = "";
      st.textContent = quieta;
      r.append(st);
    }
  });
  const quitar = {
    evaluate: () =>
      page.evaluate(() => {
        const todas = [...document.querySelectorAll("style[data-toque]")];
        for (const el of document.querySelectorAll("*"))
          if (el.shadowRoot) todas.push(...el.shadowRoot.querySelectorAll("style[data-toque]"));
        for (const st of todas) st.remove();
      }),
  };
  const leer = (i) =>
    page.evaluate(
      ({ i, VISIBLE }) => {
        const el = globalThis.__tocables[i];
        const a = getComputedStyle(el);
        const b = getComputedStyle(el, "::before");
        return VISIBLE.map((p) => a.getPropertyValue(p)).join("|") + "#" + VISIBLE.map((p) => b.getPropertyValue(p)).join("|");
      },
      { i, VISIBLE },
    );
  const forzar = async (i, estados) => {
    const { result } = await cdp.send("Runtime.evaluate", { expression: `globalThis.__tocables[${i}]` });
    const { nodeId } = await cdp.send("DOM.requestNode", { objectId: result.objectId });
    await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: estados });
  };
  const pegados = [];
  const mudos = [];
  try {
    for (let i = 0; i < nombres.length; i++) {
      const reposo = await leer(i);
      await forzar(i, ["hover"]);
      const encima = await leer(i);
      await forzar(i, ["active"]);
      const apretado = await leer(i);
      await forzar(i, []);
      if (encima !== reposo) pegados.push(nombres[i]);
      if (apretado === reposo) mudos.push(nombres[i]);
    }
  } finally {
    await cdp.detach().catch(() => {});
    await quitar.evaluate().catch(() => {});
  }
  comprobar(`${donde}: un toque no deja el :hover pegado`, pegados.length === 0,
    pegados.length ? pegados.join(" · ") : `${nombres.length} tocables`,
    "con el dedo el :hover se queda puesto hasta tocar otra cosa: se lee como «sigue elegido»");
  comprobar(`${donde}: lo que se aprieta responde`, mudos.length === 0,
    mudos.length ? mudos.join(" · ") : `${nombres.length} tocables`,
    "sin respuesta al apretar, se aprieta más fuerte o se vuelve a tocar");
}

/** Con movimiento reducido: nada a opacidad cero que ocupe sitio y nada en marcha sin fin. */
async function quieto(page, donde) {
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const nombre = (e) =>
      e ? `${e.tagName?.toLowerCase()}${e.id ? `#${e.id}` : ""}${e.classList?.[0] ? `.${e.classList[0]}` : ""}` : "?";
    const ocultos = [];
    for (const el of document.querySelectorAll("h1, h2, h3, p, li, img, button, a[href], [role=button], label, .ficha, .paso")) {
      if (el.closest('[hidden], [aria-hidden="true"]')) continue;
      const q = el.getBoundingClientRect();
      if (q.width < 2 || q.height < 2 || q.bottom < 0 || q.top > innerHeight) continue;
      let o = 1;
      let fuera = false;
      for (let p = el; p; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.display === "none") { fuera = true; break; }
        o *= Number(cs.opacity);
      }
      if (fuera) continue;
      if (getComputedStyle(el).visibility === "hidden" || o < 0.05) ocultos.push(nombre(el));
    }
    const enMarcha = document
      .getAnimations()
      .filter((a) => a.playState === "running" && a.effect?.getComputedTiming?.().iterations === Infinity)
      .map((a) => `${a.animationName ?? "animación"} en ${nombre(a.effect?.target)}`);
    return { ocultos: [...new Set(ocultos)], enMarcha: [...new Set(enMarcha)] };
  });
  comprobar(`${donde}: no queda nada oculto`, r.ocultos.length === 0, r.ocultos.slice(0, 8).join(" · ") || "nada",
    "lo que espera una entrada animada que no llega se queda invisible");
  comprobar(`${donde}: nada en marcha sin fin`, r.enMarcha.length === 0, r.enMarcha.slice(0, 8).join(" · ") || "quieto",
    "DESIGN.md §9: con movimiento reducido se quedan quietos los latidos y los parpadeos");
}

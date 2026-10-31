/**
 * **Lo visto en aulas de verdad: el volumen, y las pantallas que salían mudas.**
 *
 * En un 5.º, veintiocho Chromebooks hablando a la vez dieron risas y ruido; en
 * la pizarra de un 1.º, una voz que salió de golpe muy alta asustó a los
 * pequeños (`oksigenia-hq/shared/diseno-por-edades.md`). Y dos pantallas que
 * se abren solas —la de las teclas y el final del vuelo— salían sin que nadie
 * las explicara. Esto mira, en un portátil con ratón, una tablet y un teléfono
 * apaisados:
 *
 * - que **la primera vez suena bajo**: el deslizador a medio recorrido, que es
 *   un cuarto de ganancia;
 * - que **el altavoz y su deslizador están a la vista y son de yema**, también
 *   en el teléfono, donde antes vivían dentro del menú de los cuatro puntos;
 * - que lo elegido **se recuerda en el aparato** y no se mueve al estrenar ni
 *   al cambiar de piloto;
 * - que **la pantalla de las teclas** se explica al abrirse sola, que «no
 *   volver a explicar» sale desde la segunda vez, se guarda y los ajustes lo
 *   devuelven; y lo mismo **el final del vuelo**;
 * - y que **en el iPhone** sale la línea de cómo poner el juego a pantalla
 *   completa, y en Android no.
 *
 * Las capturas van a `OGA_CAPTURAS` si se da.
 *
 * Uso: `OGA_PUERTO=5601 node scripts/verificar-sonido-y-explicaciones.mjs`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = Number(process.env.OGA_PUERTO ?? 5298);
const CAPTURAS = process.env.OGA_CAPTURAS ?? null;
const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false, watch: null },
});
await server.listen();
const BASE = baseDe(server, PUERTO);

const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

const foto = async (page, nombre) => {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` });
};

/**
 * Arranca y da **el primer gesto**, que es lo que despierta el audio y baja el
 * pack de voz: quien llega del hangar ya lo dio al pulsar despegar. Con la
 * pantalla de las teclas abierta, el gesto es una flecha —quien tiene teclado
 * aprieta una tecla—, que con el motor parado no mueve nada y en la pantalla
 * de los dibujos se enciende.
 */
async function arrancar(page, url) {
  await page.goto(url);
  await page.waitForFunction(() => globalThis.__oga?.estado?.(), null, { timeout: 90000 });
  const teclas = await page.evaluate(() => !document.getElementById("teclas")?.hidden);
  if (teclas) await page.keyboard.press("ArrowUp");
  else await page.mouse.click(4, 200);
  await page.waitForTimeout(1500);
}

/** Espera, con tope, a que se haya pedido decir algo que cumpla `cumple`. */
async function esperarAQueSeDiga(page, cumple, tope = 25_000) {
  for (let t = 0; t < tope; t += 500) {
    const dichas = await pedidas(page);
    if (dichas.some(cumple)) return dichas;
    await page.waitForTimeout(500);
  }
  return pedidas(page);
}

/** Lo que se le pidió decir a la instructora en lo que va de página. */
const pedidas = (page) =>
  page.evaluate(() => [
    ...(globalThis.__oga.dichoTodo().instructor ?? []),
    ...globalThis.__oga.descartadas().map((d) => `(descartada) ${d}`),
  ]);

/** Un mando: si se ve, si mide una yema y si lo de encima es él. */
function medir(selector) {
  const e = document.querySelector(selector);
  if (!e) return { esta: false };
  const r = e.getBoundingClientRect();
  const visto = r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden";
  const dentro = r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5;
  const p = visto ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
  return {
    esta: true,
    visto,
    dentro,
    encima: !!p && (p === e || e.contains(p)),
    ancho: Math.round(r.width),
    alto: Math.round(r.height),
    caja: { l: r.left, t: r.top, r: r.right, b: r.bottom },
  };
}

const deYema = (m) => m.esta && m.visto && m.dentro && m.encima && m.ancho >= 43.5 && m.alto >= 43.5;
const texto = (m) =>
  !m.esta ? "no está" : `${m.ancho}×${m.alto}${m.visto ? "" : " escondido"}${m.dentro ? "" : " fuera"}${m.encima ? "" : " tapado"}`;

const PANTALLAS = [
  { ancho: 1280, alto: 800, dedo: false, nombre: "portátil" },
  { ancho: 1024, alto: 600, dedo: true, nombre: "tablet apaisada" },
  { ancho: 800, alto: 360, dedo: true, nombre: "teléfono apaisado" },
];

const VUELO = `${BASE}/?escenario=pettirossi&hora=10&leccion=despegue&avion=jaz-20`;

try {
  // ── 1. El volumen ──
  for (const p of PANTALLAS) {
    const donde = `${p.nombre} ${p.ancho}×${p.alto}`;
    const contexto = await navegador.newContext({
      viewport: { width: p.ancho, height: p.alto },
      hasTouch: p.dedo,
      isMobile: p.dedo,
    });
    const page = await contexto.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
    await page.addInitScript(() => {
      // Sin la pantalla de teclas encima: aquí se mira el volumen.
      if (!localStorage.getItem("oga-veve:guardado"))
        localStorage.setItem("oga-veve:teclas-vistas", "1");
      if (sessionStorage.getItem("banco:otro-piloto") === "1") {
        sessionStorage.removeItem("banco:otro-piloto");
        const g = JSON.parse(localStorage.getItem("oga-veve:guardado"));
        const id = "piloto-nuevo-del-banco";
        g.perfiles.push({ id, avatar: "jaguarete", color: "azul", ajustes: {}, progreso: {} });
        g.activo = id;
        localStorage.setItem("oga-veve:guardado", JSON.stringify(g));
      }
    });
    await arrancar(page, `${VUELO}&tramo=taguato`);
    const primera = await page.evaluate(() => ({
      mando: Number(document.querySelector('[data-hud="volumen"]')?.value ?? NaN),
      guardado: localStorage.getItem("oks-volumen"),
    }));
    comprobar(
      `${donde}: la primera vez suena bajo, el deslizador a medio recorrido`,
      Math.abs(primera.mando - 0.5) < 0.02,
      `deslizador en ${primera.mando} · en el aparato: ${primera.guardado ?? "nada todavía"}`,
      "una voz que sale de golpe muy alta asusta a los pequeños",
    );
    await foto(page, `volumen-${p.ancho}x${p.alto}-de-fabrica`);
    const altavoz = await page.evaluate(medir, '[data-hud="sound"]');
    const mando = await page.evaluate(medir, '[data-hud="volumen"]');
    comprobar(
      `${donde}: el altavoz se ve sin abrir nada y es de yema`,
      deYema(altavoz),
      texto(altavoz),
      "el altavoz para quitar el sonido, siempre a la vista",
    );
    const juntos =
      altavoz.esta &&
      mando.esta &&
      Math.max(0, Math.max(mando.caja.l - altavoz.caja.r, altavoz.caja.l - mando.caja.r)) +
        Math.max(0, Math.max(mando.caja.t - altavoz.caja.b, altavoz.caja.t - mando.caja.b)) <
        24;
    comprobar(
      `${donde}: el deslizador está junto al altavoz, a la vista y de yema`,
      deYema(mando) && juntos,
      `${texto(mando)}${juntos ? " · al lado" : " · lejos del altavoz"}`,
      "un control de volumen junto al altavoz, de un dedo",
    );

    // Se mueve como lo mueve una mano: arrastrar y soltar.
    await page.evaluate(() => {
      const d = document.querySelector('[data-hud="volumen"]');
      d.value = "0.8";
      d.dispatchEvent(new Event("input", { bubbles: true }));
      d.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForTimeout(300);
    const elegido = await page.evaluate(() => localStorage.getItem("oks-volumen"));
    comprobar(
      `${donde}: lo elegido queda en el aparato`,
      elegido === "0.64",
      `oks-volumen = ${elegido}`,
      "se ajusta una vez en la pizarra",
    );

    /*
     * **Y otro piloto lo oye igual.** Se estrena uno en el guardado, como lo
     * hace la pantalla de pilotos, y se recarga con él jugando.
     */
    /*
     * La página que se va escribe su guardado al irse, así que el piloto nuevo
     * se mete en la que llega, antes de que el juego lo lea.
     */
    await page.evaluate(() => sessionStorage.setItem("banco:otro-piloto", "1"));
    await arrancar(page, `${VUELO}&tramo=taguato`);
    const otro = await page.evaluate(() => ({
      mando: Number(document.querySelector('[data-hud="volumen"]')?.value ?? NaN),
      activo: JSON.parse(localStorage.getItem("oga-veve:guardado")).activo,
    }));
    comprobar(
      `${donde}: con otro piloto, el mismo volumen`,
      otro.activo === "piloto-nuevo-del-banco" && Math.abs(otro.mando - 0.8) < 0.02,
      `piloto ${otro.activo} · deslizador en ${otro.mando}`,
      "es un ajuste del aparato, no del perfil",
    );
    comprobar(`${donde}: sin errores en la página`, errores.length === 0, errores.slice(0, 3).join(" | ") || "ninguno", "");
    await contexto.close();
  }

  // ── 2. La pantalla de las teclas, que se abre sola con teclado ──
  for (const tramo of ["guyrami", "taguato"]) {
    const donde = `teclas en ${tramo}`;
    const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await contexto.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
    await page.addInitScript(() => localStorage.setItem("oga-veve:idioma", "es-PY"));
    await arrancar(page, `${VUELO}&tramo=${tramo}`);
    const clave = tramo === "guyrami" ? "teclas.explica.abajo" : "teclas.explica.arriba";
    const abierta = await page.evaluate(() => !document.getElementById("teclas")?.hidden);
    const dichas1 = await esperarAQueSeDiga(page, (c) => c === clave);
    comprobar(
      `${donde}: se abre sola la primera vez y se explica en voz`,
      abierta && dichas1.includes(clave),
      `${abierta ? "abierta" : "cerrada"} · ${dichas1.filter((c) => c.includes("teclas.")).join(" · ") || `nada: ${dichas1.slice(-3).join(" · ")}`}`,
      "lo que sale de golpe se explica en voz",
    );
    const boton1 = await page.evaluate(medir, "#teclas .no-explicar");
    comprobar(
      `${donde}: la primera vez no se ofrece «no volver a explicar»`,
      !boton1.esta,
      boton1.esta ? "sale ya" : "no sale",
      "quien la ve por primera vez todavía no sabe qué es",
    );
    await foto(page, `teclas-${tramo}-primera`);
    // Se cierra y se vuelve a abrir con su botón, como quien la busca.
    await page.evaluate(() => {
      const j = globalThis.__oga.juegoParaTrazas();
      j.keyScreen.hide();
      j.keyScreen.show();
    });
    await page.waitForTimeout(400);
    const boton2 = await page.evaluate(medir, "#teclas .no-explicar");
    const foco = await page.evaluate(() => document.activeElement?.className ?? "");
    comprobar(
      `${donde}: la segunda vez se ofrece, de yema y sin el foco encima`,
      deYema(boton2) && !foco.includes("no-explicar"),
      `${texto(boton2)} · foco en «${foco.slice(0, 40)}»`,
      "«a partir de la segunda o tercera vez»; un Enter de más no puede dejarla muda",
    );
    await foto(page, `teclas-${tramo}-segunda`);
    if (boton2.esta) {
      await page.click("#teclas .no-explicar");
      await page.waitForTimeout(300);
      const q = await page.evaluate(() => ({
        guardado: globalThis.__oga.explicaciones().teclas,
        boton: !!document.querySelector("#teclas .no-explicar"),
        abierta: !document.getElementById("teclas").hidden,
      }));
      comprobar(
        `${donde}: al tocarlo se guarda en el perfil y se va, y la pantalla sigue`,
        q.guardado.quitada && !q.boton && q.abierta,
        JSON.stringify(q),
        "para siempre en ese perfil, y recuperable en los ajustes",
      );
      const antes = (await pedidas(page)).filter((c) => c === clave).length;
      await page.evaluate(() => {
        const j = globalThis.__oga.juegoParaTrazas();
        j.keyScreen.hide();
        j.keyScreen.show();
      });
      await page.waitForTimeout(400);
      const despues = (await pedidas(page)).filter((c) => c === clave).length;
      comprobar(
        `${donde}: la tercera vez ya no se explica`,
        despues === antes,
        `${despues - antes} veces más`,
        "así no escucha siempre lo mismo",
      );
      const ajustes = await page.evaluate(async () => {
        const j = globalThis.__oga.juegoParaTrazas();
        j.keyScreen.hide();
        j.ajustesUI.abrir();
        await new Promise((r) => setTimeout(r, 300));
        const linea = !!document.querySelector('[data-ajuste-linea="explicacion-de-las-teclas"]');
        document.querySelector('[data-accion="explicacion-de-las-teclas"]')?.click();
        await new Promise((r) => setTimeout(r, 300));
        const sigue = !!document.querySelector('[data-ajuste-linea="explicacion-de-las-teclas"]');
        j.ajustesUI.cerrar();
        return { linea, sigue, guardado: globalThis.__oga.explicaciones().teclas };
      });
      comprobar(
        `${donde}: los ajustes ofrecen volver a explicarla, y la devuelven`,
        ajustes.linea && !ajustes.sigue && !ajustes.guardado.quitada,
        JSON.stringify(ajustes),
        "lo quitado sin querer se recupera",
      );
    }
    comprobar(`${donde}: sin errores en la página`, errores.length === 0, errores.slice(0, 3).join(" | ") || "ninguno", "");
    await contexto.close();
  }

  // ── 3. El final del vuelo ──
  for (const p of [PANTALLAS[1], PANTALLAS[2]]) {
    for (const tramo of ["guyrami", "taguato"]) {
      const donde = `final en ${tramo}, ${p.nombre} ${p.ancho}×${p.alto}`;
      const contexto = await navegador.newContext({
        viewport: { width: p.ancho, height: p.alto },
        hasTouch: p.dedo,
        isMobile: p.dedo,
      });
      const page = await contexto.newPage();
      const errores = [];
      page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
      await page.addInitScript(() => {
        localStorage.setItem("oga-veve:teclas-vistas", "1");
        localStorage.setItem("oga-veve:idioma", "es-PY");
      });
      await arrancar(page, `${VUELO}&tramo=${tramo}`);
      const lista = ["toma", "velocidad", "rodaje"];
      await page.evaluate((l) => globalThis.__oga.finalParaBanco(l), lista);
      // La explicación montada, o, mientras sus piezas esperan su toma, el
      // reconocimiento solo, que sí está grabado. Va detrás de lo que la
      // instructora estuviera diciendo: un suceso, una voz.
      const esDelFinal = (c) => c === "fin.explica" || c === "fin.muyBien";
      const delFinal = (cs) => cs.filter(esDelFinal);
      const dichas1 = await esperarAQueSeDiga(page, esDelFinal);
      comprobar(
        `${donde}: al salir se explica en voz`,
        delFinal(dichas1).length > 0,
        delFinal(dichas1).join(" · ") || `nada: ${dichas1.slice(-3).join(" · ")}`,
        "«¡Gran vuelo!», que en Guyrami no se escribe, y qué se mira",
      );
      const b1 = await page.evaluate(medir, ".fin__no-explicar");
      comprobar(`${donde}: la primera vez, sin «no volver a explicar»`, !b1.esta, b1.esta ? "sale ya" : "no sale", "");
      await foto(page, `final-${tramo}-${p.ancho}x${p.alto}-primera`);
      await page.evaluate(() => globalThis.__oga.juegoParaTrazas().hud.cerrarFinDeVuelo());
      await page.evaluate((l) => globalThis.__oga.finalParaBanco(l), lista);
      await page.waitForTimeout(500);
      const b2 = await page.evaluate(medir, ".fin__no-explicar");
      const pisa = await page.evaluate(() => {
        const b = document.querySelector(".fin__no-explicar")?.getBoundingClientRect();
        const panel = document.querySelector(".fin__panel")?.getBoundingClientRect();
        if (!b || !panel) return null;
        return !(b.right <= panel.left || b.left >= panel.right || b.bottom <= panel.top || b.top >= panel.bottom);
      });
      comprobar(
        `${donde}: la segunda vez se ofrece, de yema y sin pisar el panel`,
        deYema(b2) && pisa === false,
        `${texto(b2)}${pisa ? " · pisa el panel" : ""}`,
        "pequeño y apartado: el panel es el vuelo",
      );
      await foto(page, `final-${tramo}-${p.ancho}x${p.alto}-segunda`);
      if (b2.esta) {
        await page.click(".fin__no-explicar");
        await page.waitForTimeout(300);
        const q = await page.evaluate(() => ({
          guardado: globalThis.__oga.explicaciones().fin,
          puesto: globalThis.__oga.juegoParaTrazas().hud.finPuesto,
          boton: !!document.querySelector(".fin__no-explicar"),
        }));
        comprobar(
          `${donde}: al tocarlo se guarda, se va y el final sigue puesto`,
          q.guardado.quitada && q.puesto && !q.boton,
          JSON.stringify(q),
          "tocar el panel lo cierra; este botón no",
        );
        const antes = delFinal(await pedidas(page)).length;
        await page.evaluate(() => globalThis.__oga.juegoParaTrazas().hud.cerrarFinDeVuelo());
        await page.evaluate((l) => globalThis.__oga.finalParaBanco(l), lista);
        await page.waitForTimeout(500);
        const despues = delFinal(await pedidas(page)).length;
        comprobar(`${donde}: la tercera vez ya no se explica`, despues === antes, `${despues - antes} más`, "");
        const ajustes = await page.evaluate(async () => {
          const j = globalThis.__oga.juegoParaTrazas();
          j.hud.cerrarFinDeVuelo();
          j.ajustesUI.abrir();
          await new Promise((r) => setTimeout(r, 300));
          const linea = !!document.querySelector('[data-ajuste-linea="explicacion-del-final"]');
          document.querySelector('[data-accion="explicacion-del-final"]')?.click();
          await new Promise((r) => setTimeout(r, 300));
          j.ajustesUI.cerrar();
          return { linea, guardado: globalThis.__oga.explicaciones().fin };
        });
        comprobar(
          `${donde}: los ajustes lo devuelven`,
          ajustes.linea && !ajustes.guardado.quitada,
          JSON.stringify(ajustes),
          "",
        );
      }
      comprobar(`${donde}: sin errores en la página`, errores.length === 0, errores.slice(0, 3).join(" | ") || "ninguno", "");
      await contexto.close();
    }
  }

  // ── 4. El iPhone ──
  const IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";
  const ANDROID =
    "Mozilla/5.0 (Linux; Android 14; SM-A155M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36";
  for (const [nombre, agente, standalone, ancho, alto] of [
    ["iPhone de pie", IPHONE, false, 390, 844],
    ["iPhone apaisado", IPHONE, false, 844, 390],
    ["Android", ANDROID, undefined, 800, 360],
  ]) {
    const contexto = await navegador.newContext({
      viewport: { width: ancho, height: alto },
      hasTouch: true,
      isMobile: true,
      userAgent: agente,
    });
    const page = await contexto.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
    await page.addInitScript((s) => {
      localStorage.setItem("oga-veve:idioma", "es-PY");
      if (s !== undefined) Object.defineProperty(Navigator.prototype, "standalone", { get: () => s });
      // En el iPhone la página no puede pedir pantalla completa.
      if (/iPhone/.test(navigator.userAgent)) {
        Object.defineProperty(Document.prototype, "fullscreenEnabled", { get: () => false });
        Object.defineProperty(Document.prototype, "webkitFullscreenEnabled", { get: () => false });
        Object.defineProperty(Element.prototype, "requestFullscreen", { value: undefined });
      }
    }, standalone);
    await page.goto(`${BASE}/`);
    await page.waitForSelector("#pilotos:not([hidden])", { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const tarjeta = await page.evaluate(() => {
      const e = document.querySelector(".a-inicio");
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return {
        texto: e.textContent.replace(/\s+/g, " ").trim(),
        dentro: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5,
      };
    });
    const debe = /iPhone/.test(agente);
    comprobar(
      `${nombre} ${ancho}×${alto}: ${debe ? "sale" : "no sale"} cómo poner el juego a pantalla completa`,
      debe ? !!tarjeta && tarjeta.dentro && /Compartir/.test(tarjeta.texto) && /Agregar a inicio/.test(tarjeta.texto) : !tarjeta,
      tarjeta ? `«${tarjeta.texto.slice(0, 110)}»${tarjeta.dentro ? "" : " · fuera de la pantalla"}` : "ninguna",
      "en el iPhone Safari no deja pedir pantalla completa; en el resto, no estorbar",
    );
    await foto(page, `inicio-${nombre.replace(/ /g, "-").toLowerCase()}-${ancho}x${alto}`);
    comprobar(`${nombre}: sin errores en la página`, errores.length === 0, errores.slice(0, 3).join(" | ") || "ninguno", "");
    await contexto.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

let mal = 0;
for (const r of resultados) {
  if (!r.ok) mal++;
  console.log(`${r.ok ? "✓" : "✗"} ${r.nombre} — ${r.detalle}${r.ok || !r.porque ? "" : `\n    ${r.porque}`}`);
}
console.log(`\n${resultados.length - mal} de ${resultados.length} bien`);
process.exit(mal ? 1 : 0);

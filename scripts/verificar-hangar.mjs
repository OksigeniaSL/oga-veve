/**
 * El hangar, mirado y medido.
 *
 * Mide el contraste de verdad, sobre los elementos ya compuestos y no sobre
 * valores teóricos: el barro es opaco justamente para que esta cuenta salga
 * una vez y valga siempre. Y comprueba lo que a un prelector le importa más
 * que ninguna otra cosa: que **todo lo que se toca sea grande de tocar**.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const D = process.argv[2] ?? "/tmp";
const PUERTO = 5199;
const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });

const lum = (rgb) => {
  const l = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const ratio = (a, c) => {
  const x = lum(a);
  const y = lum(c);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const rgb = (s) => s.match(/\d+/g).slice(0, 3).map(Number);

for (const [ancho, alto, nombre] of [
  [1280, 800, "escritorio"],
  [820, 1180, "tableta"],
  [390, 844, "telefono"],
]) {
  // En español paraguayo, que es el idioma del producto: el navegador de
  // pruebas viene en inglés y las capturas salían en un idioma que aquí no
  // usa nadie.
  const page = await b.newPage({
    viewport: { width: ancho, height: alto },
    locale: "es-PY",
  });
  page.on("pageerror", (e) => console.log("ERROR:", e.message));
  await page.goto(`${BASE}/`);
  /*
   * **Y antes del hangar hay que decir quién vuela.**
   *
   * Esta sonda esperaba las fichas de sitio nada más cargar, y el juego pide
   * primero el piloto: el escenario, el peldaño y el avión se guardan por
   * perfil, así que sin elegir a nadie no hay hangar que mirar. Llevaba roto
   * desde que existe esa pantalla y no se notaba porque esto sale con cero
   * pase lo que pase — una sonda que revienta y no lo dice es una sonda que
   * no mira nada.
   */
  await page.waitForSelector(".piloto__boton", { timeout: 60000 });
  await page.click(".piloto__boton");
  await page.waitForSelector(".ficha--sitio", { timeout: 60000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${D}/hangar-${nombre}.png` });

  const m = await page.evaluate(() => {
    const out = { tactos: [], textos: [], desborde: 0, planos: 0 };
    for (const el of document.querySelectorAll(".hangar button")) {
      const r = el.getBoundingClientRect();
      out.tactos.push({
        q: el.className.split(" ")[0],
        w: Math.round(r.width),
        h: Math.round(r.height),
      });
    }
    for (const sel of [
      ".hangar__marca",
      ".hangar__pregunta",
      ".ficha__nombre",
      ".ficha__dato",
      ".ficha__numero",
      ".hangar__despegar",
    ]) {
      const el = document.querySelector(sel);
      if (!el) continue;
      let fondo = "rgb(0,0,0)";
      let p = el;
      while (p) {
        const bg = getComputedStyle(p).backgroundColor;
        if (bg && !bg.includes("rgba(0, 0, 0, 0)")) {
          fondo = bg;
          break;
        }
        p = p.parentElement;
      }
      const cs = getComputedStyle(el);
      out.textos.push({
        sel,
        color: cs.color,
        fondo,
        tam: parseFloat(cs.fontSize),
      });
    }
    out.desborde =
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth;
    // ¿Cabe entero sin desplazar? El botón de despegar es lo único que no se
    // puede quedar fuera de pantalla: si hay que buscarlo, no hay puerta.
    const b = document
      .querySelector(".hangar__despegar")
      .getBoundingClientRect();
    out.despegarVisible = b.bottom <= window.innerHeight && b.top >= 0;

    // ¿La barra de abajo tapa algo? Se mira al final del desplazamiento, que
    // es donde la última fila se le mete debajo.
    // Lo que se desplaza es `.hangar`, no la ventana: tiene `overflow-y` propio.
    const cajon = document.querySelector(".hangar");
    cajon.scrollTop = cajon.scrollHeight;
    const barra = document
      .querySelector(".hangar__barra")
      .getBoundingClientRect();
    out.tapadosPorBarra = [];
    for (const el of document.querySelectorAll(
      ".ficha__nombre, .ficha__peldanos",
    )) {
      const r = el.getBoundingClientRect();
      if (r.bottom > barra.top + 1 && r.top < barra.bottom) {
        out.tapadosPorBarra.push(el.textContent.trim() || "galones");
      }
    }
    out.alto = Math.round(
      document.querySelector(".hangar__marco").getBoundingClientRect().height,
    );
    out.planos = document.querySelectorAll(
      ".ficha__plano polyline.plano__pista",
    ).length;

    // ¿Se parte algún nombre en dos líneas? Se compara el alto real con el de
    // un renglón: si cabe más de uno, es que se partió. Mirar capturas para
    // esto es lo que hace que un «Valle de / la Cordillera» llegue a
    // producción.
    // Se cuentan los renglones con un `Range` sobre el texto, no dividiendo
    // el alto de la caja: un botón con `min-height: 44px` y una línea de texto
    // parecía tener tres.
    out.partidos = [];
    for (const el of document.querySelectorAll(
      ".ficha__nombre, .idioma, .ficha__dato",
    )) {
      const r = document.createRange();
      r.selectNodeContents(el);
      const lineas = r.getClientRects().length;
      if (lineas > 1)
        out.partidos.push(`${el.textContent.trim()} (${lineas} líneas)`);
    }

    // ¿Se tapa algo con algo? Se comprueban las esquinas de arriba, que es
    // donde la marca de elegido pisó a la cota de Tenerife.
    out.tapados = [];
    for (const f of document.querySelectorAll(".ficha")) {
      const p = f.querySelector(".plano__ficha");
      if (!p) continue;
      const a = p.getBoundingClientRect();
      const c = f.getBoundingClientRect();
      // El visto ocupa 26 px en la esquina superior derecha de la ficha.
      const visto = { x: c.right - 36, y: c.top + 10, w: 26, h: 26 };
      if (a.right > visto.x && a.top < visto.y + visto.h) {
        out.tapados.push(p.textContent.trim());
      }
    }
    return out;
  });

  const chico = m.tactos.filter((x) => x.w < 44 || x.h < 44);
  console.log(`\n── ${nombre} ${ancho}×${alto}`);
  console.log(
    `  botones: ${m.tactos.length} · por debajo de 44 px: ${chico.length ? JSON.stringify(chico) : "ninguno ✓"}`,
  );
  console.log(
    `  desborde horizontal: ${m.desborde} px ${m.desborde <= 0 ? "✓" : "✗"}`,
  );
  console.log(
    `  botón de despegar a la vista sin desplazar: ${m.despegarVisible ? "sí ✓" : "no ✗"}`,
  );
  console.log(
    `  tapado por la barra al final del desplazamiento: ${m.tapadosPorBarra.length ? "✗ " + m.tapadosPorBarra.join(", ") : "nada ✓"}`,
  );
  console.log(`  planos de pista dibujados: ${m.planos}`);
  console.log(
    `  textos partidos en dos líneas: ${m.partidos.length ? "✗ " + m.partidos.join(", ") : "ninguno ✓"}`,
  );
  console.log(
    `  datos tapados por la marca de elegido: ${m.tapados.length ? "✗ " + m.tapados.join(", ") : "ninguno ✓"}`,
  );
  for (const x of m.textos) {
    const r = ratio(rgb(x.color), rgb(x.fondo));
    const exige = x.tam >= 24 ? 3 : 4.5;
    console.log(
      `  ${x.sel.padEnd(22)} ${x.tam.toFixed(0)}px  ${r.toFixed(2)}:1  ${r >= exige ? "✓" : `✗ necesita ${exige}`}`,
    );
  }
  /*
   * **Y la voz de la instructora en el hangar**, una vez: se abre la tarjeta
   * del avión, se toca un punto y su globo tiene que sonar con su grabación
   * —la voz «instructor» del pack, no la del navegador—. Se juega sin saber
   * leer, y el globo es la explicación. Ver `audio/voz-del-hangar.ts`.
   */
  if (nombre === "escritorio") {
    await page.evaluate(() => document.querySelector(".hangar")?.scrollTo(0, 0));
    await page.click('[data-pantalla="conque"]');
    await page.waitForSelector("[data-de-cerca]", { timeout: 20000 });
    await page.click("[data-de-cerca]");
    await page.waitForSelector(".tav__punto", { timeout: 60000 });
    await page.click(".tav__punto");
    const oido = await page
      .waitForFunction(
        () => {
          const v = globalThis.__ogaVozDelHangar;
          return v && v.vocesUsadas.has("instructor")
            ? { pedidas: [...v.historial], voces: [...v.vocesUsadas] }
            : null;
        },
        undefined,
        { timeout: 30000 },
      )
      .then((h) => h.jsonValue())
      .catch(async () =>
        page.evaluate(() => {
          const v = globalThis.__ogaVozDelHangar;
          return { pedidas: v ? [...v.historial] : [], voces: v ? [...v.vocesUsadas] : [], nada: true };
        }),
      );
    const bien = !oido.nada && oido.pedidas.some((c) => c.startsWith("tarjeta.voz."));
    console.log(
      `  la tarjeta del avión habla en el hangar: ${bien ? "sí ✓" : "no ✗"} · ` +
        `pedidas ${JSON.stringify(oido.pedidas)} · voces ${JSON.stringify(oido.voces)}`,
    );
    /*
     * Y el camión de los bomberos: en Guaraní el JAZ 120 no cabe por ellos
     * —su categoría es la 7 y el avión pide la 8—, y tocar el camión de su
     * ficha abre la explicación, que también tiene que sonar.
     */
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await page.click('[data-pantalla="inicio"]');
    await page.click('[data-pantalla="donde"]');
    await page.click('[data-sitio="guarani"]');
    await page.waitForTimeout(300);
    if (await page.$('[data-pantalla="conque"]')) await page.click('[data-pantalla="conque"]');
    const camion = await page.waitForSelector('[data-explicar="bomberos"]', { timeout: 20000 }).catch(() => null);
    if (camion) await camion.click();
    const bomberos = await page
      .waitForFunction(
        () => {
          const v = globalThis.__ogaVozDelHangar;
          const pedidas = v ? [...v.historial] : [];
          return pedidas.some((c) => c.startsWith("explica.bomberos")) ? pedidas : null;
        },
        undefined,
        { timeout: 30000 },
      )
      .then((h) => h.jsonValue())
      .catch(() => null);
    console.log(
      `  los bomberos se explican con voz en el hangar: ${bomberos ? "sí ✓" : "no ✗"}` +
        `${camion ? "" : " · no se encontró el camión en la ficha"}` +
        `${bomberos ? ` · pedidas ${JSON.stringify(bomberos)}` : ""}`,
    );
  }
  await page.close();
}

await b.close();
await server.close();

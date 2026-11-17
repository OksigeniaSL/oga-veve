/**
 * **«Dos radiales que se cortan», volado en el juego** (#51, ADR 0030,
 * enmienda H26g): Fuerteventura, la avioneta en el peldaño de cabina, FTV y
 * LTE con una sola NAV.
 *
 *   node scripts/ver-dos-radiales.mjs <carpeta>
 *
 * Un vuelo con el alisio del sitio (del treinta a veinte nudos, el que pone el
 * ejercicio), o en calma con `OGA_VIENTO=000/0`. El piloto de banco hace lo
 * que pide la instructora, con las teclas de quien juega:
 *
 * - sostiene el rumbo de la salida con el automático, que es volar hacia FTV
 *   con el morro corrigiendo el viento;
 * - gira el OBS de toque en toque, con el 9 y el 0, hasta centrar la barra
 *   con FROM: la primera raya;
 * - cuando la tarjeta pide la otra radio, aprieta el 7 hasta que la NAV tiene
 *   LTE, espera su morse y vuelve a girar el OBS —seguido, con la tecla
 *   apretada, mientras dice TO— hasta centrarla otra vez: la segunda raya y la
 *   cruz.
 *
 * Con `OGA_TARDE=1`, en cuanto lee la primera vira hacia LTE y tarda cuarenta
 * segundos en ponerla: la cruz se queda donde estaba el avión, y la
 * instructora dice por qué.
 *
 * Lo que mira: los dos radiales leídos son los de la NAV a menos de un grado;
 * la cruz cae del avión a menos de lo que da el VOR (o, tarde, más); la
 * tarjeta escribe las dos radios y los radiales leídos; y nada que no sea del
 * ejercicio (`lo-ajeno-al-ejercicio.mjs`). Capturas: la salida, la primera
 * raya en el plano, la otra radio puesta, **las dos rayas y la cruz encima del
 * avión** —la página entera y el plano de cerca— y el final. El puerto,
 * `OGA_PUERTO`; el reloj, por `OGA_VECES` (cuatro) mientras se espera.
 *
 * Y lo que miró H26h, en cada foto del plano y en el panel del final:
 *
 * - **ningún rótulo del plano pisa a otro**, ni a un símbolo, ni se sale: las
 *   cajas de lo escrito, medidas en la pantalla, con el número de cada raya
 *   entre ellas (`rotulosPuestos`, como `verificar-carteles.mjs`);
 * - **al cerrarse, el plano se acerca solo** a la cruz y al avión
 *   (`lupaDelFijo`): la cruz dentro del papel y, tarde, apartada de la flecha
 *   lo que se ve sin buscarlo; y con la lupa de alejar se vuelve al ancho;
 * - **el panel del final dibuja el fijo**: las dos rayas con su número, la
 *   cruz y el avión, sin que un número pise a otro ni a la cruz ni al avión.
 *
 * Otro campo y otro avión con `OGA_ESCENARIO` y `OGA_AVION`: Tenerife Norte
 * con el JAZ 90 vuela TFN y TFS.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";
import { vigilarLoAjeno } from "./lo-ajeno-al-ejercicio.mjs";

const SALIDA = process.argv[2] ?? "capturas-dos-radiales";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5687);
const AVION = process.env.OGA_AVION ?? "jaz-20";
const ESCENARIO = process.env.OGA_ESCENARIO ?? "fuerteventura";
const VECES = Number(process.env.OGA_VECES ?? 4);
const VIENTO = process.env.OGA_VIENTO ?? null;
const TARDE = process.env.OGA_TARDE === "1";
const NOMBRE = `${ESCENARIO === "fuerteventura" ? "" : `${ESCENARIO}-`}${AVION === "jaz-20" ? "" : `${AVION}-`}${VIENTO ? "calma" : "alisio"}${TARDE ? "-tarde" : ""}`;
const MILLA = 1852;

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
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok: !!ok });
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? `  —  ${detalle}` : ""}`);
};

/** Lo que dice el ejercicio y la NAV, y dónde está el avión. */
const leerSolo = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    const s = o.estado();
    const a = j.avionParaLaRadio();
    const radio = j.radioAlDia();
    const nav = a ? radio.leer(a, j.elevacionDeLaEstacion).nav : null;
    const l = nav?.lectura ?? null;
    return {
      x: s.position.x,
      z: s.position.z,
      y: s.position.y,
      rumbo: s.heading,
      ejercicio: o.dosRadiales(),
      morse: o.morse(),
      navMhz: radio.navMhz,
      curso: radio.curso,
      navId: l?.emisora?.estacion.id ?? null,
      radial: l?.radial ?? null,
      desviacion: l?.desviacion ?? null,
      toFrom: l?.toFrom ?? null,
      bandera: l?.bandera ?? true,
      tarjeta: o.tarjeta?.()?.dibujo ?? null,
      textoDeLaTarjeta: document.querySelector(".senal")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
    };
  });

const ajeno = vigilarLoAjeno();
const leer = async (page) => {
  const r = await leerSolo(page);
  await ajeno.mirar(page, r.ejercicio && r.ejercicio.fase !== "cerrada");
  return r;
};

/**
 * **Lo que hay escrito en el plano, y lo que se pisa**: corre en la página.
 * Las cajas de `rotulosPuestos`, en píxeles de pantalla, con el eje separador
 * —las de los números de las rayas van giradas—; y dónde caen la cruz y el
 * avión en la pantalla, con el encuadre pintado.
 */
function medirElPlano() {
  const j = globalThis.__oga?.juegoParaTrazas?.();
  const m = j?.hud?.mapa;
  const p = m?.rotulosPuestos;
  if (!p) return null;
  const ejes = (c) => [
    [Math.cos(c.giro ?? 0), Math.sin(c.giro ?? 0)],
    [-Math.sin(c.giro ?? 0), Math.cos(c.giro ?? 0)],
  ];
  const radio = (c, [ex, ey]) => {
    const [[ux, uy], [vx, vy]] = ejes(c);
    return (c.w / 2) * Math.abs(ux * ex + uy * ey) + (c.h / 2) * Math.abs(vx * ex + vy * ey);
  };
  // Medio píxel de gracia: el redondeo no es un choque.
  const pisan = (a, b) =>
    [...ejes(a), ...ejes(b)].every(
      (e) => Math.abs((a.cx - b.cx) * e[0] + (a.cy - b.cy) * e[1]) < radio(a, e) + radio(b, e) - 0.5,
    );
  const mal = [];
  p.rotulos.forEach((a, i) => {
    const rx = radio(a.caja, [1, 0]);
    const ry = radio(a.caja, [0, 1]);
    if (a.caja.cx - rx < -0.5 || a.caja.cy - ry < -0.5 || a.caja.cx + rx > p.lado + 0.5 || a.caja.cy + ry > p.lado + 0.5)
      mal.push(`«${a.que}» se sale`);
    if (a.cuerpo < 11) mal.push(`«${a.que}» con letra de ${a.cuerpo}`);
    for (const b of p.rotulos.slice(i + 1)) if (pisan(a.caja, b.caja)) mal.push(`«${a.que}» pisa «${b.que}»`);
    for (const f of p.fijos) if (pisan(a.caja, f)) mal.push(`«${a.que}» pisa un símbolo`);
  });
  const e = m.encuadrePintado;
  const r = m.rayas?.();
  const s = globalThis.__oga.estado();
  const enPx = (x, z) => [p.lado / 2 + ((x - e.cx) / e.lado) * p.lado, p.lado / 2 + ((z - e.cz) / e.lado) * p.lado];
  const cruz = e && r?.cruz ? enPx(r.cruz.x, r.cruz.z) : null;
  const avion = e ? enPx(s.position.x, s.position.z) : null;
  return {
    mal,
    lado: Math.round(p.lado),
    lupa: m.lupa,
    encuadre: e ? Math.round(e.lado) : null,
    textos: p.rotulos.map((x) => x.que),
    radiales: p.rotulos.filter((x) => /^R-\d{3}/.test(x.que)).map((x) => x.que),
    cruz,
    avion,
    cruzAlAvion: cruz && avion ? Math.hypot(cruz[0] - avion[0], cruz[1] - avion[1]) : null,
    // Lo que da el VOR, en píxeles: con eso se juzga si la cruz está «encima».
    tolerancia: e && r?.tolerancia ? (r.tolerancia / e.lado) * p.lado : null,
  };
}

/**
 * **El fijo del panel del final**, medido en la pantalla: las rayas, la cruz,
 * el avión y los números, con las esquinas de cada número giradas como van;
 * y si un número pisa a otro, a la cruz o al avión.
 */
function medirElFinal(tolerancia) {
  const svg = document.querySelector('[data-hud="fin-plano"] svg');
  // Las rayas van en su capa, debajo de la traza, y lo demás en la del fijo, encima.
  const g = svg?.querySelector(".plano__fijo") ? svg : null;
  if (!g) return null;
  const esquinas = (el) => {
    const b = el.getBBox();
    const m = el.getScreenCTM();
    return [
      [b.x, b.y],
      [b.x + b.width, b.y],
      [b.x + b.width, b.y + b.height],
      [b.x, b.y + b.height],
    ].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
  };
  const caja = (el) => {
    const r = el.getBoundingClientRect();
    return [
      [r.left, r.top],
      [r.right, r.top],
      [r.right, r.bottom],
      [r.left, r.bottom],
    ];
  };
  // El eje separador con dos cuadriláteros: las normales de sus ocho lados.
  const pisan = (a, b) => {
    for (const poli of [a, b])
      for (let i = 0; i < 4; i++) {
        const [x0, y0] = poli[i];
        const [x1, y1] = poli[(i + 1) % 4];
        const n = [y0 - y1, x1 - x0];
        const proy = (q) => q.map(([x, y]) => (x * n[0] + y * n[1]) / (Math.hypot(n[0], n[1]) || 1));
        const pa = proy(a);
        const pb = proy(b);
        if (Math.max(...pa) <= Math.min(...pb) + 0.5 || Math.max(...pb) <= Math.min(...pa) + 0.5) return false;
      }
    return true;
  };
  const textos = [...g.querySelectorAll(".plano__radial-rotulo")];
  const numeros = textos.map((t) => ({ que: t.textContent, q: esquinas(t) }));
  const cruz = g.querySelector(".plano__cruz");
  const avion = g.querySelector(".plano__avion");
  const mal = [];
  numeros.forEach((a, i) => {
    for (const b of numeros.slice(i + 1)) if (pisan(a.q, b.q)) mal.push(`«${a.que}» pisa «${b.que}»`);
    if (cruz && pisan(a.q, caja(cruz))) mal.push(`«${a.que}» pisa la cruz`);
    if (avion && pisan(a.q, caja(avion))) mal.push(`«${a.que}» pisa el avión`);
  });
  const medio = (el) => {
    const r = el.getBoundingClientRect();
    return [(r.left + r.right) / 2, (r.top + r.bottom) / 2];
  };
  const ca = cruz ? medio(cruz) : null;
  const av = avion ? medio(avion) : null;
  // El cuerpo de la letra en la pantalla: el de la letra, por lo que encoge el dibujo.
  const m = textos[0]?.getScreenCTM();
  const cuerpo = textos[0] && m ? Number(textos[0].getAttribute("font-size")) * Math.hypot(m.a, m.b) : null;
  return {
    rayas: g.querySelectorAll(".plano__radial").length,
    cruz: !!cruz,
    avion: !!avion,
    numeros: numeros.map((n) => n.que),
    mal,
    cruzAlAvion: ca && av ? Math.hypot(ca[0] - av[0], ca[1] - av[1]) : null,
    // Lo que da el VOR, en píxeles: el dibujo va en metros.
    tolerancia: tolerancia * Math.hypot(svg.getScreenCTM().a, svg.getScreenCTM().b),
    cuerpo,
  };
}

/** El rumbo del automático, rad verdaderos, como lo lleva el juego. */
const rumboAlAutomatico = (page, rumbo) =>
  page.evaluate((r) => {
    const j = globalThis.__oga.juegoParaTrazas();
    if (j.objetivos) j.objetivos.rumbo = r;
  }, rumbo);

const centrado = (g) => ((((g + 180) % 360) + 360) % 360) - 180;
const GRADO = Math.PI / 180;

/**
 * **Centrar la barra con FROM**, como quien juega: mientras dice TO, la tecla
 * apretada, que la rueda sigue girando; con FROM, de toque en toque hacia
 * donde está la barra —a la izquierda, menos grados—. Devuelve el radial de
 * la NAV en la última lectura antes de que el ejercicio la diera por leída.
 */
async function centrar(page, cuantasLeidas) {
  let r = await leer(page);
  let radialAlLeer = r.radial;
  for (let i = 0; i < 400 && (r.ejercicio.leidas.length ?? 0) < cuantasLeidas; i++) {
    if (r.toFrom === "TO" && r.radial !== null) {
      // La tecla apretada: cada pulsación repetida del teclado es un grado, hacia el lado más corto.
      const tecla = centrado(r.radial - r.curso) > 0 ? "Digit0" : "Digit9";
      for (let k = 0; k < 8; k++) await page.keyboard.down(tecla);
      await page.keyboard.up(tecla);
      await pausa(60);
    } else if (r.desviacion !== null) {
      // FROM: la barra a la izquierda (negativa) es el radial con más grados que el OBS.
      await page.keyboard.press(r.desviacion < 0 ? "Digit0" : "Digit9");
      await pausa(90);
    } else await pausa(150);
    radialAlLeer = r.radial ?? radialAlLeer;
    r = await leer(page);
  }
  return { r, radialAlLeer };
}

let codigo = 0;
try {
  console.log(`\n${NOMBRE}`);
  const contexto = await navegador.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    hasTouch: false,
  });
  const page = await contexto.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  const viento = VIENTO ? `&viento=${VIENTO}` : "";
  await page.goto(`${BASE}/?escenario=${ESCENARIO}&hora=12&tramo=taguato-ruvicha&avion=${AVION}&ejercicio=cruce${viento}`);
  await page.waitForFunction(() => globalThis.__oga?.dosRadiales?.()?.colocacion != null, null, { timeout: 120000 });
  await pausa(3000);
  const foto = async (n, plano = false) => {
    const ruta = `${SALIDA}/${NOMBRE}-${n}.png`;
    await page.screenshot({ path: ruta });
    console.log(`    foto: ${ruta}`);
    if (plano) {
      const mapa = page.locator(".mapa__lienzos").first();
      const caja = (await mapa.count()) ? await mapa.boundingBox() : null;
      if (caja) {
        const deCerca = `${SALIDA}/${NOMBRE}-${n}-plano.png`;
        await page.screenshot({ path: deCerca, clip: caja });
        console.log(`    foto: ${deCerca}`);
      }
    }
  };
  const verElPlano = (si) =>
    page.evaluate((si) => {
      const m = globalThis.__oga.juegoParaTrazas().hud.mapa;
      if (m.visible !== si) m.alternar();
    }, si);
  /** Que ningún rótulo del plano pise a otro, con el plano como está. */
  const rotulosSinPisarse = async (donde, radiales) => {
    const p = await page.evaluate(medirElPlano);
    comprobar(
      `${donde}: ningún rótulo del plano pisa a otro, ni a un símbolo, ni se sale`,
      p && p.mal.length === 0,
      p ? `${p.textos.length} rótulos en ${p.lado} px${p.mal.length ? `: ${p.mal.join("; ")}` : ""}` : "sin plano",
    );
    comprobar(
      `${donde}: los números de las rayas, escritos`,
      p && p.radiales.length === radiales,
      p ? p.radiales.join(", ") || "ninguno" : "",
    );
    return p;
  };
  const tarjeta = await page.evaluate(() => {
    const g = document.createElement("canvas").getContext("webgl");
    const i = g?.getExtension("WEBGL_debug_renderer_info");
    return i ? g.getParameter(i.UNMASKED_RENDERER_WEBGL) : "sin WebGL";
  });
  console.log(`    tarjeta: ${tarjeta}`);

  let r = await leer(page);
  const { primera, segunda, colocacion: c } = r.ejercicio;
  const lejos0 = Math.hypot(primera.x - r.x, primera.z - r.z);
  comprobar(
    "empieza en el aire, entre diez y quince millas de la primera radio, con las dos rayas cortándose bien",
    r.y > 500 && lejos0 / MILLA > 9.5 && lejos0 / MILLA < 15.5 && c.corte >= 60 && c.corte <= 120,
    `${primera.id} y ${segunda.id}; a ${(lejos0 / MILLA).toFixed(1)} NM de ${primera.id}, ${Math.round(r.y)} m, corte ${c.corte.toFixed(0)}°`,
  );
  comprobar(
    "la NAV con la primera y el OBS apartado, con FROM y la barra a tope",
    r.navId === primera.id && r.curso === c.curso && r.toFrom === "FROM" && Math.abs(r.desviacion ?? 0) >= 10,
    `${r.navId}, OBS ${r.curso}, ${r.toFrom} ${r.desviacion?.toFixed(1)}°, radial ${r.radial?.toFixed(1)}`,
  );
  comprobar(
    "la tarjeta escribe las dos radios",
    r.textoDeLaTarjeta.includes(`${primera.id} · ${segunda.id}`),
    `«${r.textoDeLaTarjeta.slice(0, 90)}»`,
  );
  await foto("01-salida");

  // El automático, con el rumbo de la salida: hacia la primera radio, el morro contra el viento.
  await page.evaluate(() => globalThis.__oga.pilotoAutomatico(true));
  await rumboAlAutomatico(page, r.rumbo);
  await pausa(1500);

  // ── La primera raya ────────────────────────────────────────────────
  const una = await centrar(page, 1);
  r = una.r;
  const leida1 = r.ejercicio.leidas[0];
  comprobar(
    "la primera, centrada con FROM: el radial leído es el de la NAV a menos de un grado",
    leida1?.id === primera.id && Math.abs(centrado(leida1.radial - (una.radialAlLeer ?? 999))) < 1,
    `leído R-${leida1?.radial} ${leida1?.id}, la NAV marcaba ${una.radialAlLeer?.toFixed(2)}`,
  );
  await pausa(400);
  r = await leer(page);
  comprobar(
    "y la tarjeta lo escribe, con la barra centrada",
    r.tarjeta === "cdi-from" && r.textoDeLaTarjeta.includes(`R-${String(leida1.radial).padStart(3, "0")} ${primera.id}`),
    `${r.tarjeta}, «${r.textoDeLaTarjeta.slice(0, 80)}»`,
  );
  await verElPlano(true);
  await pausa(600);
  await foto("02-primera-raya", true);
  await rotulosSinPisarse("la primera raya", 1);
  // Y de cerca, con dos lupas: es donde el número de H26g rozaba la radio del campo.
  for (let i = 0; i < 2; i++) {
    await page.locator('.mapa [data-accion="cerca"]').first().click();
    await pausa(500);
  }
  await foto("02b-primera-raya-de-cerca", true);
  await rotulosSinPisarse("la primera raya, de cerca", 1);
  for (let i = 0; i < 2; i++) {
    await page.locator('.mapa [data-accion="lejos"]').first().click();
    await pausa(300);
  }
  await verElPlano(false);

  if (TARDE) {
    // Vira hacia la otra radio: la primera raya deja de pasar por el avión.
    const aLaOtra = Math.atan2(segunda.x - r.x, -(segunda.z - r.z));
    await rumboAlAutomatico(page, aLaOtra);
  }
  await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
  // La tarjeta de la otra, con su frecuencia; y, tarde, cuarenta segundos de juego más.
  const escrita = `${segunda.id} ${segunda.mhz.toFixed(2)}`;
  const fin1 = Date.now() + 90000;
  while (Date.now() < fin1 && !r.textoDeLaTarjeta.includes(escrita)) {
    await pausa(150);
    r = await leer(page);
  }
  comprobar("la tarjeta pide la otra radio, con su frecuencia", r.textoDeLaTarjeta.includes(escrita), `«${r.textoDeLaTarjeta.slice(0, 80)}»`);
  if (TARDE) await pausa((40 * 1000) / VECES);
  await page.evaluate(() => globalThis.__oga.acelerar(1));

  // ── La otra radio: el 7 hasta que la NAV la tiene, y su morse ──────
  for (let i = 0; i < 10 && r.navId !== segunda.id; i++) {
    await page.keyboard.press("Digit7");
    await pausa(250);
    r = await leer(page);
  }
  comprobar("el 7 pone la otra radio en la NAV", r.navId === segunda.id, `${r.navId} ${r.navMhz}`);
  await foto("03-la-otra");
  const fin2 = Date.now() + 60000;
  while (Date.now() < fin2 && r.ejercicio.fase !== "segunda") {
    await pausa(200);
    r = await leer(page);
  }
  comprobar(
    "su morse la identifica",
    r.ejercicio.fase === "segunda" && r.morse.identificada === `nav ${segunda.id}`,
    `fase ${r.ejercicio.fase}, identificada ${r.morse.identificada}`,
  );

  // ── La segunda raya, y la cruz ─────────────────────────────────────
  const otra = await centrar(page, 2);
  r = otra.r;
  /*
   * **Nada que no sea del ejercicio** (H26f), mirado en cuanto se cierra: al
   * cerrarse vuelve todo —la frecuencia del campo, la torre—, que lo que se
   * vuele después ya es un vuelo, y el banco se queda unos segundos más
   * haciendo fotos. Lo dicho después se apunta aparte, sin juzgarlo.
   */
  await ajeno.comprobar(page, comprobar, /^(cdi-|cruce-de-radiales)/);
  const dichoAlCerrar = await page.evaluate(() => globalThis.__oga.dichoTodo());
  const leida2 = r.ejercicio.leidas[1];
  const cruce = r.ejercicio.cruce;
  comprobar(
    "la segunda, centrada con FROM: el radial leído es el de la NAV a menos de un grado",
    leida2?.id === segunda.id && Math.abs(centrado(leida2.radial - (otra.radialAlLeer ?? 999))) < 1,
    `leído R-${leida2?.radial} ${leida2?.id}, la NAV marcaba ${otra.radialAlLeer?.toFixed(2)}`,
  );
  const lejos = cruce ? cruce.lejos / MILLA : Infinity;
  const tolera = cruce ? cruce.tolerancia / MILLA : 0;
  comprobar(
    TARDE ? "la cruz cae lejos del avión, más de lo que da el VOR" : "la cruz cae encima del avión, a menos de lo que da el VOR",
    cruce?.cruz && (TARDE ? lejos > tolera : lejos <= tolera),
    `a ${lejos.toFixed(2)} NM del avión, el VOR da ${tolera.toFixed(2)} NM; corte ${cruce?.corte.toFixed(0)}°, ` +
      `${cruce?.entreMedias.toFixed(0)} s entre una y otra; ` +
      `volado entre medias ${(Math.hypot(leida2.x - leida1.x, leida2.z - leida1.z) / MILLA).toFixed(2)} NM`,
  );
  await pausa(400);
  r = await leer(page);
  const ambas = `R-${String(leida1.radial).padStart(3, "0")} ${primera.id} · R-${String(leida2.radial).padStart(3, "0")} ${segunda.id}`;
  comprobar(
    "la tarjeta dibuja la cruz y escribe los dos radiales",
    r.tarjeta === "cruce-de-radiales" && r.textoDeLaTarjeta.includes(ambas),
    `${r.tarjeta}, «${r.textoDeLaTarjeta.slice(0, 100)}»`,
  );
  await verElPlano(true);
  await pausa(800);
  await foto("04-la-cruz", true);
  /*
   * **Al cerrarse, el plano se acerca solo a la cruz y al avión** (H26h): en
   * el ancho, una milla son unos pocos píxeles. La cruz, dentro del papel; y
   * tarde, apartada de la flecha más que lo que mide el avión y que lo que da
   * el VOR; encima, a menos de lo que da el VOR, que es como lo juzga el
   * ejercicio.
   */
  const deCerca = await rotulosSinPisarse("la cruz", 2);
  comprobar(
    TARDE ? "el plano se acerca a la cruz, y se ve apartada del avión" : "el plano se acerca a la cruz, y el avión está en ella",
    deCerca &&
      deCerca.lupa > 0 &&
      deCerca.cruz &&
      deCerca.cruz.every((v) => v > 10 && v < deCerca.lado - 10) &&
      // Encima es a menos de lo que da el VOR, que es como lo juzga el ejercicio; tarde, más, y que se vea.
      (TARDE ? deCerca.cruzAlAvion > Math.max(30, deCerca.tolerancia) : deCerca.cruzAlAvion <= deCerca.tolerancia),
    deCerca
      ? `lupa ${deCerca.lupa}, encuadre de ${(deCerca.encuadre / MILLA).toFixed(1)} NM en ${deCerca.lado} px; ` +
          `la cruz a ${deCerca.cruzAlAvion?.toFixed(0)} px de la flecha, el VOR da ${deCerca.tolerancia?.toFixed(0)} px`
      : "sin plano",
  );
  // Y las lupas siguen mandando: alejando, el ancho de siempre, con las dos radios.
  for (let i = 0; i < 6; i++) {
    await page.locator('.mapa [data-accion="lejos"]').first().click();
    await pausa(300);
  }
  await pausa(300);
  await foto("04b-la-cruz-de-lejos", true);
  const deLejos = await rotulosSinPisarse("la cruz, de lejos", 2);
  comprobar("alejando, el plano ancho", deLejos && deLejos.lupa === 0, deLejos ? `lupa ${deLejos.lupa}` : "");
  await verElPlano(false);

  const dichoDespues = await page.evaluate(() => globalThis.__oga.dichoTodo());
  const despues = Object.entries(dichoDespues).flatMap(([quien, claves]) =>
    claves.slice((dichoAlCerrar[quien] ?? []).length).map((c) => `${quien}: ${c}`),
  );
  console.log(`    dicho después de cerrar, ya en vuelo: ${despues.join(", ") || "nada"}`);
  /*
   * Lo que la instructora dijo o tenía que decir: lo grabado, en lo que oyó
   * su boca; lo que no, en lo apuntado como «sin grabar, se calla», que
   * hasta grabarlo es la tarjeta y su texto.
   */
  const pedido = await page.evaluate(() => {
    const o = globalThis.__oga;
    const sinGrabar = o
      .cantados()
      .map((c) => /^(ejercicio\.[\w.]+): sin grabar/.exec(c)?.[1])
      .filter(Boolean);
    return [...(o.dichoTodo().instructor ?? []), ...sinGrabar];
  });
  const delCruce = [...new Set(pedido.filter((c) => /^ejercicio\.(cruce|radial)\./.test(c)))].sort();
  const esperado = [
    "ejercicio.cruce.antes",
    "ejercicio.cruce.primera",
    "ejercicio.cruce.otra",
    "ejercicio.radial.identificada",
    TARDE ? "ejercicio.cruce.tarde" : "ejercicio.cruce.aqui",
  ].sort();
  comprobar("la instructora lo cuenta por pasos, y nada más", delCruce.join(",") === esperado.join(","), delCruce.join(", "));
  // El panel del final, con la traza en el plano.
  await page.evaluate(() => globalThis.__oga.acelerar(4));
  await pausa(6000);
  await foto("05-final");
  {
    const plano = page.locator('[data-hud="fin-plano"]').first();
    const caja = (await plano.count()) ? await plano.boundingBox() : null;
    if (caja) {
      const ruta = `${SALIDA}/${NOMBRE}-05-final-plano.png`;
      await page.screenshot({ path: ruta, clip: caja });
      console.log(`    foto: ${ruta}`);
    }
  }
  /*
   * **El panel del final dibuja lo que se vio** (H26h): las dos rayas con su
   * número, la cruz y el avión, sin pisarse; y tarde, la cruz apartada del
   * avión lo que se ve.
   */
  const fin = await page.evaluate(medirElFinal, cruce?.tolerancia ?? 0);
  comprobar(
    "el panel del final dibuja las dos rayas con su número, la cruz y el avión",
    fin && fin.rayas === 2 && fin.cruz && fin.avion && fin.numeros.length === 2,
    fin ? `${fin.rayas} rayas, ${fin.numeros.join(" y ")}, letra de ${fin.cuerpo?.toFixed(1)} px` : "sin fijo",
  );
  comprobar(
    "y en él ningún número pisa a otro, ni a la cruz, ni al avión",
    fin && fin.mal.length === 0,
    fin?.mal.join("; ") ?? "",
  );
  comprobar(
    TARDE ? "en el panel, la cruz apartada del avión" : "en el panel, el avión en la cruz",
    fin && (TARDE ? fin.cruzAlAvion > Math.max(30, fin.tolerancia) : fin.cruzAlAvion <= fin.tolerancia),
    fin ? `a ${fin.cruzAlAvion?.toFixed(0)} px, el VOR da ${fin.tolerancia?.toFixed(0)} px` : "",
  );
  comprobar("sin errores en la página", errores.length === 0, errores.join(" | "));
  await contexto.close();
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

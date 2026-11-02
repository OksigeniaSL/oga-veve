/**
 * **La Cruz del Sur, con el dedo**: el juego de la consola de la pantalla del asiento. Ver
 * `src/flight/cruz-del-sur.ts` y `src/ui/cruz-del-sur.ts`.
 *
 * - **Las cuatro pantallas**, cada una en un peldaño, `OGA_SOLO=pantallas`: la ficha sale en
 *   la pestaña de juegos, se juega con el dedo hasta completar, nada se sale ni pisa la
 *   pausa, el volumen, el menú o la tarjeta, y el lienzo no se repinta sin cambio.
 * - **La megafonía y los diez mil pies**, `OGA_SOLO=capitulo`: el capítulo 3 con la Cruz
 *   a medias: se pausa y sigue, y se recoge.
 * - **Las luces de la noche**, `OGA_SOLO=noche`: el capítulo 2, que la recoge al bajarlas.
 * - **Y «Viajá con Jazlyn»**, `OGA_SOLO=sin`: su kit no cambia.
 *
 * `OGA_FOTOS=<dir>` para las capturas, `OGA_GPU=1` como los demás, `OGA_FECHA` y `OGA_VIENTO`
 * como `verificar-consola`; `OGA_PRISA` es el reloj de los bancos durante el capítulo.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = Number(process.env.OGA_PUERTO ?? 5605);
const FOTOS = process.env.OGA_FOTOS ?? null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const FECHA = process.env.OGA_FECHA ?? "2026-12-15";
const VIENTO = process.env.OGA_VIENTO ?? "020/8";
const PRISA = Number(process.env.OGA_PRISA ?? 8);
const SOLO = process.env.OGA_SOLO ?? null;
const TOPE = Number(process.env.OGA_TOPE ?? 25) * 60_000;
const YEMA = 44;

const PANTALLAS = [
  { nombre: "portatil", ancho: 1280, alto: 800, dedo: false, tramo: "guyrami", punteros: false, nombres: false },
  { nombre: "tablet", ancho: 1024, alto: 600, dedo: true, tramo: "tuka", punteros: false, nombres: false },
  { nombre: "telefono-tumbado", ancho: 844, alto: 390, dedo: true, tramo: "taguato", punteros: true, nombres: false },
  { nombre: "telefono-de-pie", ancho: 390, alto: 844, dedo: true, tramo: "taguato-ruvicha", punteros: true, nombres: true },
];
const LA_CRUZ = ["gacrux", "acrux", "mimosa", "delta"];
const LOS_PUNTEROS = ["alfa", "beta"];

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await createServer({ root: process.cwd(), server: { port: PUERTO, hmr: false }, logLevel: "warn" });
await server.listen();
const BASE = baseDe(server, PUERTO);

const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args:
    process.env.OGA_GPU === "1"
      ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl", "--autoplay-policy=no-user-gesture-required"]
      : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok: !!ok, detalle });
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? `  —  ${detalle}` : ""}`);
};

/** Lo que se lee de una vez: el estado, dónde está cada cosa y lo que hay alrededor. */
const leer = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const i = o.inicio();
    const s = o.estado();
    const caja = (q) => {
      const el = document.querySelector(q);
      if (!el || el.closest("[hidden]")) return null;
      const c = getComputedStyle(el);
      if (c.display === "none" || c.visibility === "hidden") return null;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2 ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } : null;
    };
    return {
      ancho: innerWidth,
      alto: innerHeight,
      y: s.position.y,
      enTierra: s.onGround,
      percance: o.percance?.() ?? null,
      estado: {
        momento: i.estado?.momento ?? null,
        dichos: i.estado?.dichos ?? [],
        linea: i.estado?.linea?.clave ?? null,
        hablando: i.estado?.hablando ?? false,
        megafonia: i.estado?.megafonia ?? false,
        consola: i.estado?.consola ?? null,
        kit: i.estado?.kit ?? null,
      },
      planoVisto: i.planoVisto,
      registro: (i.registro ?? []).map((d) => ({ clave: d.clave, desde: d.desde, hasta: d.hasta, como: d.como, cortada: d.cortada })),
      consola: i.consola ? JSON.parse(JSON.stringify(i.consola)) : null,
      kitUi: i.kit ? JSON.parse(JSON.stringify(i.kit)) : null,
      tarjeta: caja("#inicio .inicio__tarjeta"),
      alrededor: {
        pausa: caja('[data-hud="pausa"]'),
        adelantar: caja('[data-hud="adelantar"]'),
        volumen: caja(".volumen__capsula"),
        menu: caja('[data-hud="menu"]'),
        cinturon: caja('[data-hud="cinturon"]'),
      },
      kitAbierto: caja(".kit__panel"),
      kitCerrar: caja(".kit__cerrar"),
      kitAtras: caja(".kit__atras"),
      kitPausa: caja(".kit__pausa"),
      explicada: o.juegoParaTrazas().explicacionesParaBanco?.cruz ?? null,
    };
  });

const pisan = (a, b) => !!a && !!b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const entera = (c, W, H) => c.left >= -0.5 && c.top >= -0.5 && c.right <= W + 0.5 && c.bottom <= H + 0.5;
const centro = (c) => ({ x: (c.left + c.right) / 2, y: (c.top + c.bottom) / 2 });

/** Lo que se mira de un grupo: el tamaño de la yema, que quepa y que no caiga encima de nada. */
function revisar(l, cajas) {
  const malas = [];
  const alrededor = { ...l.alrededor, tarjeta: l.tarjeta };
  for (const [nombre, c] of Object.entries(cajas)) {
    if (!c) continue;
    if (c.width < YEMA - 0.5 || c.height < YEMA - 0.5) malas.push(`${nombre} ${Math.round(c.width)}×${Math.round(c.height)} px`);
    if (!entera(c, l.ancho, l.alto)) malas.push(`${nombre} se sale`);
    for (const [otro, o] of Object.entries(alrededor)) if (pisan(c, o)) malas.push(`${nombre} pisa ${otro}`);
  }
  return malas;
}

async function tocar(page, x, y, conDedo) {
  if (conDedo) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

async function foto(page, cual, paso) {
  if (FOTOS) await page.screenshot({ path: `${FOTOS}/${cual}-${paso}.png` });
}

/** Espera a que se cumpla algo de lo que se lee, con su tope. */
async function hastaQue(page, cumple, ms = 15_000) {
  const desde = Date.now();
  for (;;) {
    const l = await leer(page);
    if (cumple(l)) return l;
    if (Date.now() - desde > ms) return null;
    await pausa(120);
  }
}

async function abrirElCapitulo(ctx, capitulo, tramo, errores) {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  page.on("console", (m) => {
    if (m.type() === "error") errores.push(m.text().slice(0, 200));
  });
  await page.goto(`${BASE}/?inicio=4&capitulo=${capitulo}&fecha=${FECHA}&viento=${VIENTO}&tramo=${tramo}`);
  await page.bringToFront();
  await page.waitForFunction(() => globalThis.__oga?.salto?.().hora != null, null, { timeout: 240_000 });
  await page.keyboard.press("ShiftLeft");
  await page.evaluate(() => globalThis.__ogaEmpezar?.());
  await pausa(800);
  return page;
}

/** De la ventanilla a la hoja del cielo, tocando lo que se ve. Devuelve la lectura, o `null`. */
async function hastaLaCruz(page, conDedo, chequeos = null) {
  const conBoton = await hastaQue(page, (l) => l.consola?.boton, 60_000);
  if (!conBoton) return null;
  await pausa(600);
  const b = centro((await leer(page)).consola.boton);
  await tocar(page, b.x, b.y, conDedo);
  let l = await hastaQue(page, (x) => x.estado.consola?.abierta, 8000);
  if (!l) return null;
  await pausa(500);
  const j = centro((await leer(page)).consola.pestanas.juegos);
  await tocar(page, j.x, j.y, conDedo);
  l = await hastaQue(page, (x) => x.kitUi?.juegos?.cruz, 5000);
  if (!l) return null;
  await pausa(700);
  l = await leer(page);
  if (chequeos) {
    chequeos(l);
    await foto(page, chequeos.cual, "1-juegos");
  }
  const c = centro(l.kitUi.juegos.cruz);
  await tocar(page, c.x, c.y, conDedo);
  return hastaQue(page, (x) => x.estado.kit?.juego?.juego === "cruz" && x.kitUi?.cruz?.hoja && x.kitUi.cruz.medida.repintes > 0, 6000);
}

// ── Las cuatro pantallas ─────────────────────────────────────────────────

async function unaPantalla(p) {
  console.log(`\n── ${p.nombre}: ${p.ancho}×${p.alto}${p.dedo ? " con el dedo" : ""}, ${p.tramo}`);
  const ctx = await navegador.newContext({ viewport: { width: p.ancho, height: p.alto }, hasTouch: p.dedo, isMobile: p.dedo, locale: "es-PY" });
  const errores = [];
  const de = (n) => `${p.nombre}: ${n}`;
  try {
    const page = await abrirElCapitulo(ctx, 3, p.tramo, errores);
    await page.evaluate(() => globalThis.__oga.saltarLaApertura());
    const chequeos = (l) => {
      const juegos = l.kitUi.juegos;
      comprobar(de("la ficha sale en la pestaña de juegos, junto a las otras dos"), Object.keys(juegos).join() === "luz,avion,cruz", Object.keys(juegos).join(", "));
      const mal = revisar(l, { panel: l.kitAbierto, ...juegos });
      const sobreLaBarra = Object.values(juegos).some((c) => pisan(c, l.consola.barra));
      comprobar(de("las tres, de yema, dentro y sin pisar nada"), mal.length === 0 && !sobreLaBarra, mal.join(" · ") || `la ficha, ${Math.round(juegos.cruz.width)}×${Math.round(juegos.cruz.height)} px`);
    };
    chequeos.cual = p.nombre;
    let l = await hastaLaCruz(page, p.dedo, chequeos);
    comprobar(de("tocar la ficha abre el cielo"), !!l, l ? `${Math.round(l.kitUi.cruz.hoja.width)}×${Math.round(l.kitUi.cruz.hoja.height)} px` : "no se abrió");
    if (!l) return;
    await pausa(900);
    l = await leer(page);
    await foto(page, p.nombre, "2-cielo-al-abrir");

    // ── Lo que se toca, dónde está ─
    const pide = p.punteros ? [...LA_CRUZ, ...LOS_PUNTEROS] : LA_CRUZ;
    const estrellas = l.kitUi.cruz.estrellas;
    comprobar(de(`las que se tocan en ${p.tramo}: ${p.punteros ? "con" : "sin"} los punteros`), Object.keys(estrellas).sort().join() === [...pide].sort().join(), Object.keys(estrellas).join(", "));
    const j0 = l.estado.kit.juego;
    comprobar(de(`los nombres: ${p.nombres ? "sí" : "no"}`), j0.conNombres === p.nombres, "");
    const mal = revisar(l, { panel: l.kitAbierto, cerrar: l.kitCerrar, atras: l.kitAtras, ...estrellas });
    comprobar(de("las dianas de 44 px o más, y nada se sale ni pisa la pausa, el volumen, el menú o la tarjeta"), mal.length === 0, mal.join(" · ") || `dianas de ${Math.round(estrellas.gacrux.width)} px, panel de ${Math.round(l.kitAbierto.width)}×${Math.round(l.kitAbierto.height)} px`);
    const nombres = Object.keys(estrellas);
    let cerca = Infinity;
    for (let i = 0; i < nombres.length; i++)
      for (let k = i + 1; k < nombres.length; k++) {
        const [a, b] = [centro(estrellas[nombres[i]]), centro(estrellas[nombres[k]])];
        cerca = Math.min(cerca, Math.hypot(a.x - b.x, a.y - b.y));
      }
    comprobar(de("entre dos estrellas, sitio para dos yemas"), cerca >= YEMA, `las dos más cercanas, a ${cerca.toFixed(1)} px`);
    const tierra = l.kitUi.cruz.tierra;
    const debajo = Object.entries(estrellas).filter(([, c]) => pisan(c, tierra)).map(([n]) => n);
    comprobar(de("la Tierra chiquita, dentro de la hoja y sin caer sobre lo que se toca"), !!tierra && debajo.length === 0 && entera(tierra, p.ancho, p.alto), debajo.join(", ") || `${Math.round(tierra?.width ?? 0)} px`);
    const fuera = Object.entries(estrellas).filter(([, c]) => pisan(c, l.kitCerrar) || pisan(c, l.kitAtras)).map(([n]) => n);
    comprobar(de("lo que se toca, sin caer bajo cerrar ni atrás"), fuera.length === 0, fuera.join(", "));
    comprobar(de("el catálogo de verdad, de fondo"), l.kitUi.cruz.estrellasDeFondo > 1000, `${l.kitUi.cruz.estrellasDeFondo} estrellas en el plano`);

    // ── Otra parte no hace nada ─
    const hoja = l.kitUi.cruz.hoja;
    // El sitio de la hoja que más lejos cae de todas: ahí no hay estrella que valga.
    let vacio = null;
    for (let x = hoja.left + 30; x < hoja.right - 30; x += 20)
      for (let y = hoja.top + 56; y < hoja.bottom - 16; y += 20) {
        const d = Math.min(...Object.values(estrellas).map((c) => Math.hypot(centro(c).x - x, centro(c).y - y)));
        if (!pisan({ left: x, right: x + 1, top: y, bottom: y + 1 }, tierra) && (!vacio || d > vacio.d)) vacio = { x, y, d };
      }
    const lejos = vacio.d > 60;
    const antesDeFuera = JSON.stringify(l.estado.kit.juego.tocadas);
    await tocar(page, vacio.x, vacio.y, p.dedo);
    await pausa(250);
    let m = await leer(page);
    comprobar(de("un toque en el cielo vacío no pasa nada"), lejos && JSON.stringify(m.estado.kit.juego.tocadas) === antesDeFuera && !m.estado.kit.juego.terminado && m.estado.kit?.abierto, lejos ? "" : "el rincón no estaba vacío");

    // ── Con el dedo, en el orden que sea, y sin apuntar al centro ─
    const orden = [...pide].reverse();
    const hechas = [];
    let medidaQuieta = null;
    for (const [i, e] of orden.entries()) {
      l = await leer(page);
      const c = centro(l.kitUi.cruz.estrellas[e]);
      // Dedo de cuatro años: dieciséis píxeles al lado. Queda más cerca de la suya que de ninguna otra.
      await tocar(page, c.x + 12, c.y + 10.5, p.dedo);
      await pausa(600);
      m = await leer(page);
      hechas.push(m.estado.kit.juego.tocadas.at(-1));
      if (i === 1) {
        await foto(page, p.nombre, "3-a-medio-tocar");
        // Quieto: el lienzo no se repinta. Lo que late, late sin él.
        const antes = m.kitUi.cruz.medida.repintes;
        const hojaAntes = JSON.stringify(m.kitUi.cruz.hoja);
        await pausa(3000);
        const d = await leer(page);
        medidaQuieta = { repintes: d.kitUi.cruz.medida.repintes - antes, igual: JSON.stringify(d.kitUi.cruz.hoja) === hojaAntes };
        // Lo que cuesta quieto: todo lo que hace la hoja del kit en un fotograma sin cambios.
        medidaQuieta.us = await page.evaluate(() => {
          const k = globalThis.__oga.juegoParaTrazas().pantallaDelKit;
          const t0 = performance.now();
          for (let n = 0; n < 2000; n++) k.pintar(null);
          return ((performance.now() - t0) / 2000) * 1000;
        });
      }
    }
    comprobar(de("se toca con el dedo cada una, una al lado, en orden inverso"), JSON.stringify(hechas) === JSON.stringify(orden), hechas.join(", "));
    comprobar(
      de("quieto, el juego no repinta: cero veces en tres segundos"),
      !!medidaQuieta && (medidaQuieta.repintes === 0 || !medidaQuieta.igual),
      medidaQuieta ? `${medidaQuieta.repintes} repintes · la hoja, en un fotograma quieto: ${medidaQuieta.us.toFixed(1)} µs` : "",
    );

    // ── Se completa ─
    const repintesAntes = (await leer(page)).kitUi.cruz.medida;
    const mitad = await hastaQue(page, (x) => (x.estado.kit?.juego?.brazo ?? 0) > 0.6, 8000);
    if (mitad) await foto(page, p.nombre, "4-la-linea");
    l = await hastaQue(page, (x) => x.estado.kit?.juego?.juego === "cruz" && x.estado.kit.juego.punto === 1, 15_000);
    comprobar(de("se completa: se enciende, se aleja, la línea, el polo, el horizonte y el sur"), !!l, l ? `punto ${l.estado.kit.juego.punto}` : "no llegó");
    if (l) {
      await pausa(200);
      l = await leer(page);
      await foto(page, p.nombre, "5-cruz-completa");
      const c = l.kitUi.cruz;
      const dentro = c.sur.x > 0 && c.sur.x < c.hoja.width && c.sur.y > 0 && c.sur.y < c.hoja.height && Math.abs(c.sur.y - c.horizonte) < 0.01;
      comprobar(de("el sur, en el horizonte y dentro de la hoja"), dentro, `en ${c.sur.x.toFixed(0)}, ${c.sur.y.toFixed(0)} de ${Math.round(c.hoja.width)}×${Math.round(c.hoja.height)}`);
      const mal2 = revisar(l, { panel: l.kitAbierto });
      comprobar(de("y el panel, sin pisar nada, con lo que esté diciendo la tarjeta"), mal2.length === 0, mal2.join(" · "));
      const med = c.medida;
      const anim = med.repintes - repintesAntes.repintes;
      comprobar(
        de("lo que cuesta un fotograma del final"),
        anim > 20 && med.msMaximo < 16,
        `${anim} repintes · media ${((med.msTotal - repintesAntes.msTotal) / Math.max(1, anim)).toFixed(2)} ms · el peor ${med.msMaximo.toFixed(2)} ms`,
      );
      const hecho = await hastaQue(page, (x) => x.estado.kit?.hechos?.includes("cruz"), 5000);
      comprobar(de("y queda como hecho, con su estrella en la hoja de elegir"), !!hecho, "");
      // Lo que cuenta, que va a su ritmo detrás de lo que hubiera. Las frases por grabar se dan por dichas en mudo, con su rato.
      const delFinal = ["kit.cruz.encendida", "kit.cruz.sur", ...(p.punteros ? ["kit.cruz.navegantes"] : [])];
      const conTodo = await hastaQue(page, (x) => delFinal.every((f) => x.registro.some((r) => r.clave.endsWith(f))), 60_000);
      const dichas = ((conTodo ?? (await leer(page))).registro).map((r) => r.clave).filter((x) => x.includes("kit.cruz") || x.includes("elegirConLaCruz"));
      comprobar(de("Ara cuenta el final entero: el sur, y la bandera arriba; y sin decir «tocalas» con la Cruz encendida"), !!conTodo && dichas.indexOf(dichas.find((d) => d.endsWith("empezar"))) < dichas.indexOf(dichas.find((d) => d.endsWith("encendida"))), dichas.map((d) => d.split(".").pop()).join(", "));
      const r = (conTodo ?? (await leer(page))).registro;
      let pisadas = 0;
      for (let k = 1; k < r.length; k++) if (r[k].desde < (r[k - 1].hasta ?? Infinity) - 1e-6) pisadas++;
      comprobar(de("un suceso, una voz: ninguna frase encima de otra"), pisadas === 0, `${r.length} frases`);
    }

    // ── «No volver a explicar», desde la segunda vez ─
    if (p.nombre === "telefono-de-pie") {
      const primera = (await leer(page)).explicada;
      const vuelta = await hastaQue(page, (x) => x.kitUi?.juegos?.cruz, 60_000);
      comprobar(de("al acabar, vuelve a elegir"), !!vuelta, "");
      if (vuelta) {
        const c = centro(vuelta.kitUi.juegos.cruz);
        await tocar(page, c.x, c.y, p.dedo);
        l = await hastaQue(page, (x) => x.kitUi?.cruz?.noExplicar, 6000);
        const malas = l ? revisar(l, { noExplicar: l.kitUi.cruz.noExplicar }) : ["no salió"];
        comprobar(de("la primera vez no se ofrece «no volver a explicar», y la segunda, sí"), primera?.veces === 1 && l?.explicada?.veces === 2 && malas.length === 0, `${primera?.veces} → ${l?.explicada?.veces} · ${malas.join(" · ")}`);
        if (l) {
          await foto(page, p.nombre, "6-no-explicar");
          const n = centro(l.kitUi.cruz.noExplicar);
          await tocar(page, n.x, n.y, p.dedo);
          await pausa(400);
          l = await leer(page);
          comprobar(de("y tocarlo se queda guardado, sin tocar ninguna estrella"), l.explicada?.quitada === true && !l.kitUi.cruz.noExplicar && l.estado.kit.juego.tocadas.length === 0, "");
        }
      }
    }

    // ── La mano, si tarda ─
    if (p.nombre === "tablet") {
      await page.locator(".kit__atras").click();
      const eligiendo = await hastaQue(page, (x) => x.kitUi?.juegos?.cruz, 12_000);
      if (eligiendo) {
        const c = centro(eligiendo.kitUi.juegos.cruz);
        await tocar(page, c.x, c.y, p.dedo);
        // Sin tocar nada: con lo que tarde la megafonía si le toca, que entonces el juego está en pausa y no cuenta.
        const conMano = await hastaQue(page, (x) => x.kitUi?.cruz?.mano, 75_000);
        const cual = conMano ?? (await leer(page));
        comprobar(de("si tarda un rato, la mano señala la que falta"), !!conMano && entera(conMano.kitUi.cruz.mano, p.ancho, p.alto), conMano ? `a ${conMano.estado.kit.juego.mano}` : `no salió · ${JSON.stringify(cual.estado.kit).slice(0, 300)}`);
        if (conMano) await foto(page, p.nombre, "7-la-mano");
      } else comprobar(de("si tarda un rato, la mano señala la que falta"), false, "no volvió a elegir");
    }

    comprobar(de("sin errores de consola"), errores.length === 0, errores.slice(0, 3).join(" · "));
  } catch (e) {
    comprobar(de("la pantalla"), false, `${String(e).slice(0, 300)} · ${errores.slice(0, 2).join(" · ")}`);
  } finally {
    await ctx.close();
  }
}

// ── La megafonía y los diez mil pies ─────────────────────────────────────

async function elCapitulo() {
  console.log("\n── el capítulo 3, con la Cruz a medias");
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-PY" });
  const errores = [];
  try {
    const page = await abrirElCapitulo(ctx, 3, "guyrami", errores);
    await page.evaluate(() => globalThis.__oga.saltarLaApertura());
    let l = await hastaLaCruz(page, false);
    comprobar("con la consola abierta, a la Cruz", !!l, "");
    if (!l) return;
    await pausa(600);
    // A medias: dos tocadas.
    for (const e of ["delta", "gacrux"]) {
      l = await leer(page);
      const c = centro(l.kitUi.cruz.estrellas[e]);
      await tocar(page, c.x, c.y, false);
      await pausa(200);
    }
    const tocadas = (await leer(page)).estado.kit.juego.tocadas;
    comprobar("dos tocadas", tocadas.join() === "delta,gacrux", tocadas.join(", "));

    // ── La megafonía ─
    await page.evaluate((v) => globalThis.__oga.acelerar(v), PRISA);
    const desde = Date.now();
    let enPausa = null;
    let despues = null;
    while (Date.now() - desde < TOPE) {
      const x = await leer(page);
      if (!enPausa && x.estado.kit?.pausado && x.estado.megafonia) {
        enPausa = x;
        await foto(page, "capitulo", "2-cruz-en-pausa");
        // Y un toque en pausa no hace nada: ni se cuenta ni falla.
        const c = centro(x.kitUi.cruz.estrellas.acrux);
        await tocar(page, c.x, c.y, false);
        await pausa(250);
        const y = await leer(page);
        comprobar("tocar en pausa no hace nada", y.estado.kit.juego.tocadas.join() === "delta,gacrux" && (y.estado.kit.pausado || !y.estado.megafonia), y.estado.kit.juego.tocadas.join(", "));
      }
      if (enPausa && !x.estado.megafonia && !x.estado.kit?.pausado) {
        despues = x;
        break;
      }
      if (x.estado.consola?.recogida || x.percance) break;
      await pausa(120);
    }
    comprobar("con la Cruz abierta suena la megafonía y se pausa, con el altavoz encima", !!enPausa && !!enPausa.kitPausa, enPausa ? `suena ${enPausa.estado.linea}` : "no sonó");
    comprobar(
      "y luego sigue por donde iba",
      !!despues && despues.estado.kit?.juego?.juego === "cruz" && despues.estado.kit.juego.tocadas.join() === "delta,gacrux" && despues.estado.consola?.pestana === "juegos",
      despues ? despues.estado.kit.juego.tocadas.join(", ") : "no siguió",
    );

    // ── A los diez mil pies ─
    let alRecoger = null;
    let antes = null;
    const hastaDiezMil = Date.now();
    while (Date.now() - hastaDiezMil < TOPE) {
      const x = await leer(page);
      if (x.y > 3048 && x.estado.kit?.abierto) antes = x;
      if (x.estado.consola?.recogida) {
        alRecoger = x;
        break;
      }
      if (x.percance) break;
      await pausa(100);
    }
    comprobar("pasa de los diez mil pies con la Cruz abierta", !!antes && antes.estado.kit?.juego?.juego === "cruz", antes ? `a ${(antes.y / 0.3048).toFixed(0)} ft` : "");
    const yaFuera = await hastaQue(page, (x) => !x.estado.consola?.abierta && !x.estado.kit?.abierto && x.planoVisto === "ventanilla", 8000);
    await pausa(500);
    comprobar("a los diez mil pies se recoge, y se vuelve a la ventanilla", !!alRecoger && !!yaFuera && yaFuera.estado.kit?.recogido && !yaFuera.kitAbierto, alRecoger ? `a ${(alRecoger.y / 0.3048).toFixed(0)} ft` : "no se recogió");
    comprobar("el dibujo contestó: no hizo falta la red del tope", !!yaFuera && !yaFuera.estado.consola?.porElTope, "");
    await foto(page, "capitulo", "3-recogida");
    comprobar("sin errores de consola, en el capítulo", errores.length === 0, errores.slice(0, 3).join(" · "));
  } catch (e) {
    comprobar("el capítulo", false, `${String(e).slice(0, 300)} · ${errores.slice(0, 2).join(" · ")}`);
  } finally {
    await ctx.close();
  }
}

// ── La noche ─────────────────────────────────────────────────────────────

async function laNoche() {
  console.log("\n── el capítulo 2: la Cruz abierta, y bajan las luces");
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-PY" });
  const errores = [];
  try {
    const page = await abrirElCapitulo(ctx, 2, "guyrami", errores);
    await page.evaluate(() => globalThis.__oga.saltarLaApertura());
    const l = await hastaLaCruz(page, false);
    comprobar("en la noche también sale la Cruz", !!l, "");
    if (!l) return;
    await page.evaluate((v) => globalThis.__oga.acelerar(v), PRISA);
    const y = await hastaQue(page, (x) => x.estado.consola?.recogida && !x.estado.kit?.abierto, TOPE);
    comprobar("y al bajar las luces se recoge", !!y && y.estado.kit?.recogido, y ? `${y.estado.momento}` : "no se recogió");
    comprobar("sin errores de consola, en la noche", errores.length === 0, errores.slice(0, 3).join(" · "));
  } catch (e) {
    comprobar("la noche", false, `${String(e).slice(0, 300)} · ${errores.slice(0, 2).join(" · ")}`);
  } finally {
    await ctx.close();
  }
}

// ── «Viajá con Jazlyn» ───────────────────────────────────────────────────

async function sinPantalla() {
  console.log("\n── «Viajá con Jazlyn»: el kit no cambia");
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-PY" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  try {
    await page.goto(`${BASE}/?inicio=3&kit&fecha=${FECHA}`);
    await page.waitForFunction(() => globalThis.__oga?.inicio?.()?.estado?.momento != null, null, { timeout: 240_000 });
    await page.keyboard.press("ShiftLeft");
    await page.evaluate(() => globalThis.__ogaEmpezar?.());
    await pausa(1500);
    const conBoton = await hastaQue(page, (x) => x.kitUi?.boton, 30_000);
    if (conBoton) {
      const b = centro(conBoton.kitUi.boton);
      await tocar(page, b.x, b.y, false);
    }
    const l = await hastaQue(page, (x) => x.kitUi?.juegos?.luz, 5000);
    comprobar("dos juegos, y la Cruz no sale", !!l && Object.keys(l.kitUi.juegos).join() === "luz,avion", l ? Object.keys(l.kitUi.juegos).join(", ") : "no se abrió");
    const tres = await page.evaluate(() => !!document.querySelector(".kit-elegir--tres"));
    comprobar("con la hoja de elegir de siempre", !tres, "");
    comprobar("sin errores de consola, sin pantalla", errores.length === 0, errores.slice(0, 3).join(" · "));
  } catch (e) {
    comprobar("el vuelo sin pantalla", false, String(e).slice(0, 300));
  } finally {
    await ctx.close();
  }
}

try {
  if (!SOLO || SOLO === "sin") await sinPantalla();
  if (!SOLO || SOLO === "pantallas") for (const p of PANTALLAS) await unaPantalla(p);
  if (SOLO && PANTALLAS.some((p) => p.nombre === SOLO)) await unaPantalla(PANTALLAS.find((p) => p.nombre === SOLO));
  if (!SOLO || SOLO === "capitulo") await elCapitulo();
  if (!SOLO || SOLO === "noche") await laNoche();
} finally {
  await navegador.close();
  await server.close();
}

const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length}\n`);
for (const r of resultados) if (!r.ok) console.log(`  ✗ ${r.nombre}  —  ${r.detalle}`);
process.exit(bien === resultados.length ? 0 : 1);

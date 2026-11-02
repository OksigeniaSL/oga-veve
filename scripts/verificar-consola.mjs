/**
 * **La consola de la pantalla del asiento, con el dedo**: `?inicio=4&capitulo=3`. Ver
 * `src/flight/consola-del-asiento.ts` y `src/ui/consola-del-asiento.ts`.
 *
 * Dos cosas distintas, cada una con su tiempo:
 *
 * - **Las cuatro pantallas** —portátil, tablet, teléfono tumbado y teléfono de pie, cada
 *   una en un peldaño—: el botón, las pestañas, los modos, los juegos, los cuentos y el
 *   cuaderno, tocados de verdad donde se ven, con sus medidas: dianas de 44 px, dentro
 *   de la pantalla y sin pisar la pausa, el volumen ni la tarjeta de quien habla. Saltan
 *   la apertura, que en esto no pinta nada: `OGA_SOLO=pantallas`.
 * - **El capítulo entero con la consola en las manos**, en el portátil y con la apertura
 *   de verdad: el botón no sale hasta que se abre la ventanilla, la megafonía pausa el
 *   juego y sigue, y a los diez mil pies se recoge sola; y el avión toca, y el guion
 *   acaba, y nunca dos voces a la vez. `OGA_SOLO=capitulo`. El mismo capítulo sin tocar
 *   la consola lo mira `verificar-inicio-4.mjs`.
 * - **Y el vuelo de Ara a La Palma**, sin pantalla en los respaldos: nada de esto sale.
 *
 * `OGA_FOTOS=<dir>` para las capturas, `OGA_GPU=1` como los demás, `OGA_FECHA` y
 * `OGA_VIENTO` como `verificar-inicio-4`; `OGA_PRISA` es el reloj de los bancos durante
 * el capítulo, para no esperar media hora.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = Number(process.env.OGA_PUERTO ?? 5604);
const FOTOS = process.env.OGA_FOTOS ?? null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const FECHA = process.env.OGA_FECHA ?? "2026-12-15";
const VIENTO = process.env.OGA_VIENTO ?? "020/8";
const PRISA = Number(process.env.OGA_PRISA ?? 8);
const SOLO = process.env.OGA_SOLO ?? null;
const TOPE = Number(process.env.OGA_TOPE ?? 45) * 60_000;
const YEMA = 44;

const PANTALLAS = [
  { nombre: "portatil", ancho: 1280, alto: 800, dedo: false, tramo: "guyrami", datos: false },
  { nombre: "tablet", ancho: 1024, alto: 600, dedo: true, tramo: "tuka", datos: false },
  { nombre: "telefono-tumbado", ancho: 844, alto: 390, dedo: true, tramo: "taguato", datos: true },
  { nombre: "telefono-de-pie", ancho: 390, alto: 844, dedo: true, tramo: "taguato-ruvicha", datos: true },
];

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

/** Lo que se lee de la consola de una vez: el estado, dónde está cada cosa y lo que hay alrededor. */
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
      enPista: s.onRunway,
      percance: o.percance?.() ?? null,
      estado: {
        momento: i.estado?.momento ?? null,
        dichos: i.estado?.dichos ?? [],
        saltados: i.estado?.saltados ?? [],
        plano: i.estado?.plano ?? null,
        tapa: i.estado?.tapa ?? null,
        linea: i.estado?.linea?.clave ?? null,
        hablando: i.estado?.hablando ?? false,
        megafonia: i.estado?.megafonia ?? false,
        consola: i.estado?.consola ?? null,
        kit: i.estado?.kit ?? null,
        puedeSeguir: i.estado?.puedeSeguir ?? false,
        adelanto: i.estado?.adelanto ?? null,
        charlas: i.estado?.charlas ?? [],
      },
      planoVisto: i.planoVisto,
      tripulacion: i.tripulacion,
      tramo: i.tripulacion?.tramo ?? "?",
      ultimaToma: i.ultimaToma ?? null,
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
      kitPausa: caja(".kit__pausa"),
      escena: i.escena,
      elCuaderno: caja("#cuaderno"),
      mochilita: caja(".kit__boton"),
      explicada: o.juegoParaTrazas().explicacionesParaBanco?.consola ?? null,
    };
  });

/** Si dos cajas se tocan. */
const pisan = (a, b) => !!a && !!b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const entera = (c, W, H) => c.left >= -0.5 && c.top >= -0.5 && c.right <= W + 0.5 && c.bottom <= H + 0.5;

/**
 * **Lo que se mira de un grupo de botones**: el tamaño de la yema, que quepan y que no
 * caigan encima de nada de lo que no se puede tapar. Lo que se mide es lo que se ve, en
 * el fotograma en que se mide.
 */
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

/** Y que el dedo le llegue: en su centro, lo primero que hay es él o algo suyo. */
const leLlega = (page, c) =>
  page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    return el?.closest?.("#consola, #kit, #cuaderno") ? el.closest("button, [role=button], svg, [data-kit-juego]") !== null : false;
  }, { x: (c.left + c.right) / 2, y: (c.top + c.bottom) / 2 });

async function tocar(page, c, conDedo) {
  const x = (c.left + c.right) / 2;
  const y = (c.top + c.bottom) / 2;
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

async function abrirElCapitulo(ctx, tramo, errores) {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  page.on("console", (m) => {
    if (m.type() === "error") errores.push(m.text().slice(0, 200));
  });
  await page.goto(`${BASE}/?inicio=4&capitulo=3&fecha=${FECHA}&viento=${VIENTO}&tramo=${tramo}`);
  await page.bringToFront();
  await page.waitForFunction(() => globalThis.__oga?.salto?.().hora != null, null, { timeout: 240_000 });
  await page.keyboard.press("ShiftLeft");
  await page.evaluate(() => globalThis.__ogaEmpezar?.());
  await pausa(800);
  return page;
}

/** Apunta cada llamada a `mostrar` de la pantalla de verdad, que es lo que hace la consola. */
const espiarLaPantalla = (page) =>
  page.evaluate(() => {
    const p = globalThis.__oga.juegoParaTrazas().elPasillo()?.pantalla;
    if (!p) return false;
    const antes = p.mostrar.bind(p);
    globalThis.__llamadas = [];
    p.mostrar = (m) => {
      globalThis.__llamadas.push(m);
      return antes(m);
    };
    return true;
  });

// ── Las cuatro pantallas ─────────────────────────────────────────────────

async function unaPantalla(p) {
  console.log(`\n── ${p.nombre}: ${p.ancho}×${p.alto}${p.dedo ? " con el dedo" : ""}, ${p.tramo}`);
  const ctx = await navegador.newContext({
    viewport: { width: p.ancho, height: p.alto },
    hasTouch: p.dedo,
    isMobile: p.dedo,
    locale: "es-PY",
  });
  const errores = [];
  const de = (n) => `${p.nombre}: ${n}`;
  try {
    const page = await abrirElCapitulo(ctx, p.tramo, errores);
    await page.evaluate(() => globalThis.__oga.saltarLaApertura());
    const conBoton = await hastaQue(page, (l) => l.consola?.boton, 30_000);
    comprobar(de("sale el botón, sin la apertura delante"), !!conBoton, conBoton ? `${Math.round(conBoton.consola.boton.width)} px` : "no salió");
    if (!conBoton) return;
    await pausa(1500);
    let l = await leer(page);
    await foto(page, p.nombre, "1-ventanilla");
    const botonMal = revisar(l, { boton: l.consola.boton });
    comprobar(de("el botón, de yema, dentro y sin pisar nada"), botonMal.length === 0, botonMal.join(" · ") || `${Math.round(l.consola.boton.width)} px`);

    await tocar(page, l.consola.boton, p.dedo);
    l = await hastaQue(page, (x) => x.estado.consola?.abierta && x.planoVisto === "respaldo", 8000);
    comprobar(de("tocarlo abre la consola, y Ara mira su pantalla"), !!l, l ? `plano ${l.estado.plano}` : "no se abrió");
    if (!l) return;
    await espiarLaPantalla(page);
    await pausa(1500);
    l = await leer(page);

    // ── Las pestañas y la salida ─
    const barra = { ventanilla: l.consola.ventanilla, ...l.consola.pestanas };
    const barraMal = revisar(l, barra);
    comprobar(
      de("la barra: cuatro pestañas y la ventanilla, de yema, dentro y sin pisar nada"),
      Object.keys(l.consola.pestanas).length === 4 && !!l.consola.ventanilla && barraMal.length === 0,
      barraMal.join(" · ") || `${Object.keys(barra).length} botones de ${Math.round(l.consola.ventanilla?.width ?? 0)} px`,
    );

    // ── Los modos ─
    const modos = Object.keys(l.consola.modos);
    comprobar(
      de(`los modos que se ofrecen en ${p.tramo}: ${p.datos ? "con" : "sin"} los datos`),
      modos.includes("datos") === p.datos && ["mapa", "cerca", "pelota", "relojes"].every((m) => modos.includes(m)),
      modos.join(", "),
    );
    const modosMal = revisar(l, l.consola.modos);
    comprobar(de("los modos, de yema, dentro y sin pisar nada"), modosMal.length === 0, modosMal.join(" · ") || `${modos.length} botones`);
    const pisanLaBarra = Object.entries(l.consola.modos).filter(([, c]) => Object.values(barra).some((b) => pisan(c, b))).map(([n]) => n);
    comprobar(de("los modos no caen sobre la barra"), pisanLaBarra.length === 0, pisanLaBarra.join(", "));
    await foto(page, p.nombre, "2-mapa");
    const orden = [...modos.filter((m) => m !== "mapa"), "mapa"];
    const dieron = [];
    for (const m of orden) {
      const c = (await leer(page)).consola.modos[m];
      await tocar(page, c, p.dedo);
      await pausa(160);
      dieron.push((await leer(page)).consola.enLaPantalla);
      if (m === "pelota" || m === "datos") await foto(page, p.nombre, `2-modo-${m}`);
    }
    const llamadas = await page.evaluate(() => globalThis.__llamadas);
    comprobar(
      de("cada botón de modo llama a mostrar con el suyo, una vez"),
      JSON.stringify(llamadas) === JSON.stringify(orden) && JSON.stringify(dieron) === JSON.stringify(orden),
      `tocados ${orden.join(", ")} · mostrar(${llamadas.join(", ")}) · en la pantalla ${dieron.join(", ")}`,
    );

    // ── Los juegos ─
    await tocar(page, (await leer(page)).consola.pestanas.juegos, p.dedo);
    l = await hastaQue(page, (x) => x.estado.kit?.abierto && x.kitUi?.panel, 5000);
    comprobar(de("la pestaña de juegos abre el kit, a elegir"), !!l && Object.keys(l.kitUi.juegos).join() === "luz,avion,cruz", l ? Object.keys(l.kitUi.juegos).join(", ") : "no se abrió");
    if (l) {
      await pausa(700);
      l = await leer(page);
      const juegos = l.kitUi.juegos;
      const juegosMal = revisar(l, { panel: l.kitAbierto, ...juegos });
      const sobreLaBarra = pisan(l.kitAbierto, l.consola.barra);
      comprobar(de("el kit, de yema, dentro, sin pisar nada y sin caer sobre la barra"), juegosMal.length === 0 && !sobreLaBarra, [...juegosMal, sobreLaBarra ? "sobre la barra" : ""].filter(Boolean).join(" · ") || `${Math.round(l.kitAbierto.width)}×${Math.round(l.kitAbierto.height)} px`);
      comprobar(de("y sin la mochilita: aquí se abre desde la consola"), !l.mochilita, "");
      await foto(page, p.nombre, "3-juegos");
      await tocar(page, juegos.luz, p.dedo);
      const conLuz = await hastaQue(page, (x) => x.estado.kit?.juego?.juego === "luz", 3000);
      comprobar(de("«Luz verde» se abre con su hoja de siempre"), !!conLuz, "");
      await pausa(900);
      await foto(page, p.nombre, "3-luz-verde");
      await page.locator(".kit__cerrar").click();
      l = await hastaQue(page, (x) => !x.estado.kit?.abierto && x.estado.consola?.pestana === "mapa", 3000);
      comprobar(de("guardar el kit vuelve a la pantalla, y sigue abierta"), !!l && l.estado.consola.abierta, "");
    }

    // ── Los cuentos ─
    await tocar(page, (await leer(page)).consola.pestanas.cuentos, p.dedo);
    l = await hastaQue(page, (x) => x.consola?.panel && Object.keys(x.consola.cuentos).length > 0, 3000);
    comprobar(de("la pestaña de cuentos enseña los que tienen dibujo y voz"), !!l, l ? l.consola.losCuentos.join(", ") : "ninguno");
    if (l) {
      await pausa(600);
      l = await leer(page);
      const tarjetas = l.consola.cuentos;
      const tarjetasMal = revisar(l, tarjetas);
      const sobreLaBarra = Object.values(tarjetas).some((c) => pisan(c, l.consola.barra));
      comprobar(de("los cuentos, de yema, dentro y sin pisar nada"), tarjetasMal.length === 0 && !sobreLaBarra, tarjetasMal.join(" · ") || `${Object.keys(tarjetas).length} láminas`);
      await foto(page, p.nombre, "4-cuentos");
      const cual = l.consola.losCuentos[0];
      await tocar(page, tarjetas[cual], p.dedo);
      const clave = `ventanilla.historia.${cual}`;
      // Puede tocarle esperar al anuncio de la comandante, que manda y es largo.
      l = await hastaQue(page, (x) => x.estado.linea === clave && x.estado.hablando && x.consola?.foto, 75_000);
      comprobar(de(`tocar uno lo cuenta con su lámina en grande: ${cual}`), !!l, l ? `lámina de ${Math.round(l.consola.foto.width)}×${Math.round(l.consola.foto.height)} px` : "no sonó");
      if (l) {
        await pausa(900);
        l = await leer(page);
        const fotoMal = revisar(l, { lamina: l.consola.foto, atras: l.consola.atras });
        comprobar(
          de("la lámina y su «atrás», dentro y sin pisar nada, con la tarjeta creciendo"),
          fotoMal.length === 0,
          fotoMal.join(" · ") || `tarjeta ${l.tarjeta ? `${Math.round(l.tarjeta.height)} px` : "callada"}`,
        );
        await foto(page, p.nombre, "4-un-cuento");
        await tocar(page, l.consola.atras, p.dedo);
        const vuelta = await hastaQue(page, (x) => x.estado.consola?.cuento === null && !x.estado.hablando, 4000);
        const cortado = vuelta?.registro.filter((d) => d.clave === clave).at(-1);
        comprobar(de("«atrás» calla el cuento y vuelve a la lista"), !!vuelta && cortado?.cortada, `${cortado?.como}`);
        // Y otra vez el mismo, enseguida: lo pide quien lo toca, y la regla de no repetirse no es para él.
        const hechas = vuelta?.registro.filter((d) => d.clave === clave).length ?? 0;
        await tocar(page, vuelta.consola.cuentos[cual], p.dedo);
        const otra = await hastaQue(page, (x) => x.registro.filter((d) => d.clave === clave).length > hechas, 8000);
        await pausa(1200);
        const denuevo = (await leer(page)).registro.filter((d) => d.clave === clave).at(-1);
        comprobar(de("tocar el mismo otra vez lo vuelve a contar, con su voz"), !!otra && denuevo?.como !== "muda", `${denuevo?.como ?? "sonando"}`);
        const quedaAtras = (await leer(page)).consola.atras;
        if (quedaAtras) await tocar(page, quedaAtras, p.dedo);
        await hastaQue(page, (x) => x.estado.consola?.cuento === null && !x.estado.hablando, 4000);
      }
    }

    // ── El cuaderno ─
    await tocar(page, (await leer(page)).consola.pestanas.cuaderno, p.dedo);
    // Es un panel de los que congelan: lo de leer sigue, y lo del fotograma, no.
    l = await hastaQue(page, (x) => x.consola?.cuaderno && x.elCuaderno, 3000);
    comprobar(de("la pestaña del cuaderno abre el de siempre"), !!l, "");
    if (l) {
      await pausa(500);
      await foto(page, p.nombre, "5-cuaderno");
      await page.locator('#cuaderno [data-accion="cerrar"]').first().click();
      l = await hastaQue(page, (x) => !x.consola?.cuaderno && x.estado.consola?.pestana === "mapa", 4000);
      comprobar(de("y al cerrarlo se vuelve a la pantalla"), !!l && l.estado.consola.abierta, "");
    }

    // ── Volver ─
    l = await leer(page);
    await tocar(page, l.consola.ventanilla, p.dedo);
    l = await hastaQue(page, (x) => !x.estado.consola?.abierta && x.planoVisto === "ventanilla", 5000);
    comprobar(de("la ventanilla: se vuelve a mirar afuera, y el botón sigue ahí"), !!l && !!l.consola.boton, "");

    // ── «No volver a explicar», desde la segunda vez ─
    if (p.nombre === "telefono-de-pie") {
      const primera = (await leer(page)).explicada;
      await page.reload();
      await page.waitForFunction(() => globalThis.__oga?.salto?.().hora != null, null, { timeout: 240_000 });
      await page.keyboard.press("ShiftLeft");
      await page.evaluate(() => globalThis.__ogaEmpezar?.());
      await pausa(800);
      await page.evaluate(() => globalThis.__oga.saltarLaApertura());
      const otra = await hastaQue(page, (x) => x.consola?.boton, 30_000);
      await tocar(page, otra.consola.boton, p.dedo);
      l = await hastaQue(page, (x) => x.consola?.noExplicar, 8000);
      const mal = l ? revisar(l, { noExplicar: l.consola.noExplicar }) : [];
      comprobar(
        de("la primera vez no se ofrece «no volver a explicar», y la segunda, sí"),
        !!l && primera?.veces === 1 && l.explicada?.veces === 2 && mal.length === 0,
        `${primera?.veces} → ${l?.explicada?.veces} · ${mal.join(" · ")}`,
      );
      if (l) {
        await foto(page, p.nombre, "6-no-explicar");
        await tocar(page, l.consola.noExplicar, p.dedo);
        await pausa(300);
        l = await leer(page);
        comprobar(de("y tocarlo se queda guardado"), l.explicada?.quitada === true && !l.consola.noExplicar, "");
      }
    }

    comprobar(de("sin errores de consola"), errores.length === 0, errores.slice(0, 3).join(" · "));
  } catch (e) {
    comprobar(de("la pantalla"), false, `${String(e).slice(0, 300)} · ${errores.slice(0, 2).join(" · ")}`);
  } finally {
    await ctx.close();
  }
}

// ── El capítulo entero ───────────────────────────────────────────────────

async function elCapitulo() {
  console.log("\n── el capítulo entero, con la consola en las manos");
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-PY" });
  const errores = [];
  try {
    const page = await abrirElCapitulo(ctx, "guyrami", errores);
    const inicio = Date.now();
    // ── La apertura: el botón no está ─
    let conBotonEnApertura = 0;
    let lecturas = 0;
    let a = null;
    let botonAlAbrir = null;
    for (;;) {
      a = await leer(page);
      lecturas++;
      const abierta = a.estado.dichos.includes("ventanilla");
      if (!abierta && (a.consola?.boton || a.estado.consola?.sale)) conBotonEnApertura++;
      if (lecturas === 8) await foto(page, "capitulo", "0-apertura");
      if (abierta) break;
      if (Date.now() - inicio > 12 * 60_000) break;
      await pausa(300);
    }
    comprobar("durante la apertura no se ofrece el botón", lecturas > 50 && conBotonEnApertura === 0, `${lecturas} lecturas en ${((Date.now() - inicio) / 1000).toFixed(0)} s, con botón ${conBotonEnApertura}`);
    const pantallaIgual = await page.evaluate(() => globalThis.__oga.juegoParaTrazas().elPasillo()?.pantalla?.modo ?? null);
    comprobar("y la pantalla de Idaira, sin tocar: el mapa", pantallaIgual === "mapa", `${pantallaIgual}`);
    botonAlAbrir = await hastaQue(page, (l) => l.consola?.boton, 2000);
    comprobar("desde que se abre la ventanilla, sí", !!botonAlAbrir, botonAlAbrir ? `${Math.round(botonAlAbrir.consola.boton.width)} px` : "no salió");
    if (!botonAlAbrir) return;
    await foto(page, "capitulo", "1-con-boton");

    // ── La megafonía manda: con un juego abierto ─
    await tocar(page, botonAlAbrir.consola.boton, false);
    let l = await hastaQue(page, (x) => x.estado.consola?.abierta, 3000);
    await tocar(page, l.consola.pestanas.juegos, false);
    l = await hastaQue(page, (x) => x.kitUi?.juegos?.luz, 3000);
    await tocar(page, l.kitUi.juegos.luz, false);
    await hastaQue(page, (x) => x.estado.kit?.juego?.juego === "luz", 3000);
    const conElJuego = Date.now();
    let enPausa = null;
    let despues = null;
    while (Date.now() - conElJuego < 180_000) {
      const x = await leer(page);
      if (!enPausa && x.estado.kit?.pausado && x.estado.megafonia) {
        enPausa = x;
        await foto(page, "capitulo", "2-juego-en-pausa");
      }
      if (enPausa && !x.estado.megafonia && !x.estado.kit?.pausado) {
        despues = x;
        break;
      }
      await pausa(150);
    }
    comprobar(
      "con un juego abierto suena la megafonía y el juego se pausa, con el altavoz encima",
      !!enPausa && !!enPausa.kitPausa,
      enPausa ? `suena ${enPausa.estado.linea}` : "no sonó",
    );
    comprobar(
      "y luego sigue por donde iba",
      !!despues && despues.estado.kit?.juego?.juego === "luz" && despues.estado.consola?.abierta && despues.estado.consola?.pestana === "juegos",
      despues ? `juego ${despues.estado.kit?.juego?.juego}` : "no siguió",
    );
    if (process.env.OGA_SOLO_MEGAFONIA) return;

    // ── Ara no nombra lo que no ve: la pantalla delante, con los cuentos seguidos hasta la bajada ─
    await page.evaluate((v) => globalThis.__oga.acelerar(v), PRISA);
    let m = await leer(page);
    await tocar(page, m.consola.pestanas.cuentos, false);
    await hastaQue(page, (x) => x.consola?.panel && Object.keys(x.consola.cuentos).length > 0, 3000);
    const hastaBajada = Date.now();
    while (Date.now() - hastaBajada < TOPE) {
      const x = await leer(page);
      if (x.estado.dichos.includes("bajada")) break;
      if (!x.estado.consola?.cuento && !x.estado.megafonia) {
        // El más largo, para que la bajada caiga con él sonando y no en el hueco de entre dos.
        const c = x.consola?.cuentos?.asuncion;
        if (c) await tocar(page, c, false);
      }
      if (x.percance) break;
      await pausa(300);
    }
    // Dicho el momento, las frases van a su cola: detrás del ralentí de Ara, los cinturones.
    const trasBajar = (await hastaQue(page, (x) => x.registro.some((d) => d.clave === "tripulacion.cinturones"), 30_000)) ?? (await leer(page));
    const iCint = trasBajar.registro.findIndex((d) => d.clave === "tripulacion.cinturones");
    const delante = trasBajar.registro.slice(0, Math.max(0, iCint)).filter((d) => d.clave !== "inicio.ara.pasaje.ralenti");
    const antes = delante.at(-1);
    const seCorto = !!antes && antes.clave.startsWith("ventanilla.historia.") && antes.cortada;
    console.log(`  alrededor de la bajada: ${trasBajar.registro.slice(Math.max(0, iCint - 3), iCint + 1).map((d) => `${d.clave.split(".").slice(-2).join(".")}(${d.como}, ${d.desde?.toFixed(1)}–${d.hasta?.toFixed(1)})`).join(" · ")}`);
    comprobar(
      "la megafonía manda sobre un cuento: lo corta, o espera a que no haya ninguno; y nunca se pisan",
      iCint >= 0 && (!antes || antes.hasta <= trasBajar.registro[iCint].desde),
      `antes de los cinturones: ${antes?.clave} (${antes?.como})${seCorto ? ", cortado" : ""}`,
    );
    if (seCorto) {
      const vuelve = await hastaQue(page, (x) => x.registro.some((d, k) => k > iCint && d.clave === antes.clave), 40_000);
      comprobar("y el cuento vuelve a empezar al acabar el anuncio", !!vuelve, "");
    }

    // ── A los diez mil pies, con un juego abierto ─
    m = await leer(page);
    await tocar(page, m.consola.pestanas.juegos, false);
    await hastaQue(page, (x) => x.estado.kit?.abierto, 3000);
    let alRecoger = null;
    let antesDeRecoger = null;
    const hastaDiezMil = Date.now();
    while (Date.now() - hastaDiezMil < TOPE) {
      const x = await leer(page);
      if (x.y > 3048) antesDeRecoger = x;
      if (x.estado.consola?.recogida) {
        alRecoger = x;
        break;
      }
      if (x.percance) break;
      await pausa(100);
    }
    comprobar("pasa de los diez mil pies con la consola y un juego abiertos", !!antesDeRecoger && antesDeRecoger.estado.consola?.abierta && antesDeRecoger.estado.kit?.abierto, antesDeRecoger ? `a ${(antesDeRecoger.y / 0.3048).toFixed(0)} ft` : "");
    const yaFuera = await hastaQue(page, (x) => !x.estado.consola?.abierta && !x.estado.kit?.abierto && x.planoVisto === "ventanilla", 8000);
    await pausa(600);
    comprobar(
      "y se recoge sola, y se vuelve a la ventanilla",
      !!alRecoger && !!yaFuera && yaFuera.estado.kit?.recogido && !yaFuera.consola?.barra,
      alRecoger ? `a ${(alRecoger.y / 0.3048).toFixed(0)} ft, ${alRecoger.tramo}` : "no se recogió",
    );
    comprobar("el dibujo contestó: no hizo falta la red del tope", !!yaFuera && !yaFuera.estado.consola?.porElTope, "");
    await foto(page, "capitulo", "3-recogida");
    const sinBoton = await leer(page);
    comprobar("y desaparece el botón, y se dice por qué", !sinBoton.consola?.boton && sinBoton.registro.some((d) => d.clave.endsWith("consolaRecoge")), `${sinBoton.estado.linea}`);

    // ── Y el vuelo acaba ─
    let tocado = null;
    let ultimo = sinBoton;
    let botonOtraVez = 0;
    const hastaElFin = Date.now();
    while (Date.now() - hastaElFin < TOPE) {
      const x = await leer(page);
      ultimo = x;
      if (x.consola?.boton) botonOtraVez++;
      if (x.tripulacion?.tocado && !tocado) tocado = x;
      if (x.estado.momento === "fin" && x.estado.puedeSeguir) break;
      if (x.percance) break;
      await pausa(400);
    }
    comprobar("el botón no vuelve en lo que queda de vuelo", botonOtraVez === 0, `${botonOtraVez} veces`);
    const t = ultimo.tripulacion;
    comprobar(
      "toca dentro de la pista, a menos de tres metros por segundo",
      !!t?.tocado && (t.caidaAlTocar ?? Infinity) < 3 && !ultimo.percance && !!tocado?.enPista,
      `${t?.caidaAlTocar?.toFixed(2)} m/s · «${ultimo.ultimaToma?.veredicto}» a ${ultimo.ultimaToma?.pasado?.toFixed(0)} m del umbral · ${ultimo.percance ?? "sin percance"}`,
    );
    comprobar("y el guion acaba", ultimo.estado.momento === "fin" && ultimo.estado.puedeSeguir, `${ultimo.estado.momento} · saltados ${ultimo.estado.saltados.join(", ") || "ninguno"}`);
    const r = ultimo.registro;
    let pisadas = 0;
    for (let k = 1; k < r.length; k++) if (r[k].desde < (r[k - 1].hasta ?? Infinity) - 1e-6) pisadas++;
    const cortadasAjenas = r.filter((d) => d.cortada && !d.clave.startsWith("ventanilla.historia.")).map((d) => d.clave);
    comprobar(
      "nunca dos voces a la vez, y solo se corta lo que se pidió cortar: un cuento",
      r.length >= 20 && pisadas === 0 && cortadasAjenas.length === 0,
      `${r.length} frases · ${pisadas} pisadas · ${r.filter((d) => d.cortada).length} cuentos cortados · ajenas cortadas ${cortadasAjenas.join(", ") || "ninguna"}`,
    );
    const sonados = r.filter((d) => d.clave.startsWith("ventanilla.historia.") && d.como === "sono").map((d) => d.clave.split(".").pop());
    const mudos = r.filter((d) => d.clave.startsWith("ventanilla.historia.") && d.como === "muda").length;
    comprobar("los cuentos suenan con su grabación, enteros, y ninguno se queda mudo", sonados.length > 0 && mudos === 0, `${sonados.length} enteros · ${mudos} mudos`);
    const lasDelCuento = ultimo.estado.dichos;
    comprobar(
      "lo imprescindible para aterrizar se dijo",
      ["bajada", "aproximacion", "llegada", "fin"].every((d) => d === "fin" || lasDelCuento.includes(d)) && r.some((d) => d.clave === "comandante.aproximacion"),
      lasDelCuento.join(", "),
    );
    comprobar("sin errores de consola", errores.length === 0, errores.slice(0, 3).join(" · "));
  } catch (e) {
    comprobar("el capítulo", false, `${String(e).slice(0, 300)} · ${errores.slice(0, 2).join(" · ")}`);
  } finally {
    await ctx.close();
  }
}

// ── Donde no hay pantalla ────────────────────────────────────────────────

async function sinPantalla() {
  console.log("\n── el vuelo de Ara a La Palma, sin pantalla en los respaldos");
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-PY" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  try {
    await page.goto(`${BASE}/?inicio=3&fecha=${FECHA}`);
    await page.waitForFunction(() => globalThis.__oga?.inicio?.()?.estado?.momento != null, null, { timeout: 240_000 });
    await page.keyboard.press("ShiftLeft");
    await page.evaluate(() => globalThis.__ogaEmpezar?.());
    await pausa(2000);
    const r = await page.evaluate(() => {
      const o = globalThis.__oga;
      const i = o.inicio();
      const raiz = document.querySelector("#consola");
      return {
        avion: o.avion().id,
        disposicion: o.avion().disposicionDelPasaje ?? null,
        consola: i.estado?.consola ?? null,
        ui: i.consola ?? null,
        raiz: { hidden: raiz?.hidden, hijos: raiz?.children.length },
      };
    });
    comprobar(
      "en un avión sin pantalla no hay consola, ni en el motor ni en el dibujo",
      r.consola === null && r.ui === null && r.raiz.hidden === true && r.raiz.hijos === 0,
      `${r.avion}, disposición ${r.disposicion} · motor ${r.consola} · dibujo ${r.ui} · raíz ${r.raiz.hijos} hijos`,
    );
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
  if (SOLO && !["sin", "pantallas", "capitulo"].includes(SOLO)) await unaPantalla(PANTALLAS.find((p) => p.nombre === SOLO));
  if (!SOLO || SOLO === "capitulo") await elCapitulo();
} finally {
  await navegador.close();
  await server.close();
}

const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length}\n`);
for (const r of resultados) if (!r.ok) console.log(`  ✗ ${r.nombre}  —  ${r.detalle}`);
process.exit(bien === resultados.length ? 0 : 1);

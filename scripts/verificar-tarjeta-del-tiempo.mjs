/**
 * **La tarjeta del tiempo, abierta con niebla de verdad**, en una tablet y en
 * un teléfono apaisados, y en un portátil con ratón.
 *
 * Enrique empezó un vuelo con el JAZ 120 en Los Rodeos con niebla y le salió
 * la tarjeta: «no entiendo mucho, me sale esto siempre que empiezo y si lo
 * quito (que no hay x para quitar) el lugar está nublado». Esto la abre igual
 * —el mismo avión, el mismo campo, Guyrami y un METAR de niebla— y mira lo
 * que se pidió:
 *
 * - que al abrirse **se explica en voz** (con su grabación si está; si no, el
 *   porqué de siempre, que sí está grabado);
 * - que cabe y que **todo lo que se toca mide al menos 44 × 44**;
 * - que hay **una ✕** y que cerrar no decide nada: ni se apunta quedarse ni
 *   se dice «salimos con cuidado»;
 * - que **señalar** un botón de la decisión —con el tabulador, y con el ratón
 *   parado encima— pide decir qué hace;
 * - y que **«no volver a explicar»** no sale la primera vez, sale la segunda,
 *   se guarda en el perfil y la tercera ya no se explica.
 *
 * Las capturas van a `OGA_CAPTURAS` si se da; el peldaño, en `OGA_TRAMO`.
 *
 * Uso: `OGA_PUERTO=5601 node scripts/verificar-tarjeta-del-tiempo.mjs`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = Number(process.env.OGA_PUERTO ?? 5298);
const CAPTURAS = process.env.OGA_CAPTURAS ?? null;
/** El peldaño: Guyrami, como Enrique; `OGA_TRAMO=tuka` para ver la palabra del botón. */
const TRAMO = process.env.OGA_TRAMO ?? "guyrami";
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

/*
 * **La niebla de Los Rodeos**: trescientos metros y el cielo tapado a
 * doscientos pies. Pasa la visibilidad mínima del JAZ 120 —550 m de una
 * aproximación de precisión— y con `?metar=` manda en los dos campos.
 */
const METAR = "GCXO 270630Z 31006KT 0300 FG VV002 14/14 Q1018";

const PANTALLAS = [
  { ancho: 1024, alto: 600, dedo: true, nombre: "tablet apaisada" },
  { ancho: 800, alto: 360, dedo: true, nombre: "teléfono apaisado" },
  { ancho: 1280, alto: 800, dedo: false, nombre: "portátil" },
];

/** Lo que se toca dentro de la tarjeta y mide menos de una yema, o se sale, o lo tapa otra cosa. */
function medirLaTarjeta() {
  const YEMA = 44;
  const raiz = document.getElementById("tarjeta-del-tiempo");
  const caja = raiz.querySelector(".concha").getBoundingClientRect();
  const malos = [];
  for (const b of raiz.querySelectorAll("button")) {
    const r = b.getBoundingClientRect();
    if (r.width === 0) continue;
    const nombre = b.dataset.parteAccion ?? b.className;
    if (r.width < YEMA - 0.5 || r.height < YEMA - 0.5)
      malos.push(`${nombre} ${Math.round(r.width)}×${Math.round(r.height)}`);
    if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight)
      malos.push(`${nombre} fuera de la pantalla`);
    const p = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!p || !(p === b || b.contains(p))) malos.push(`${nombre} tapado`);
  }
  return {
    cabe: caja.top >= 0 && caja.left >= 0 && caja.bottom <= innerHeight + 0.5 && caja.right <= innerWidth + 0.5,
    caja: `${Math.round(caja.width)}×${Math.round(caja.height)}`,
    malos,
    cerrar: !!raiz.querySelector('.parte__cerrar[aria-label]'),
    noExplicar: !!raiz.querySelector(".parte__no-explicar"),
    foco: document.activeElement?.dataset?.parteAccion ?? null,
  };
}

/** Lo que se le pidió decir a la instructora en lo que va de página. */
const pedidas = (page) =>
  page.evaluate(() => [
    ...(globalThis.__oga.dichoTodo().instructor ?? []),
    ...globalThis.__oga.descartadas().map((d) => `(descartada) ${d}`),
  ]);

const explica = (claves) =>
  claves.find((c) => c === "parte.explica" || c.startsWith("parte.propone.")) ?? null;

async function abrir(page, url) {
  await page.goto(url);
  await page.waitForFunction(() => globalThis.__oga?.estado?.(), null, { timeout: 90000 });
  // El primer gesto: despierta el audio y baja el pack de voz, como en el juego.
  await page.mouse.click(4, 200);
  const abierta = await page
    .waitForFunction(() => !document.getElementById("tarjeta-del-tiempo")?.hidden, null, {
      timeout: 30000,
    })
    .then(() => true)
    .catch(() => false);
  // Lo que dura la explicación en pedirse: la tarjeta sale y la voz va detrás.
  await page.waitForTimeout(1500);
  return abierta;
}

try {
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
      localStorage.setItem("oga-veve:teclas-vistas", "1");
      localStorage.setItem("oga-veve:idioma", "es-PY");
    });
    const url =
      `${BASE}/?escenario=tenerife-norte&hora=8&leccion=despegue&tramo=${TRAMO}` +
      `&avion=jaz-120&metar=${encodeURIComponent(METAR)}`;

    // ── La primera vez ──
    const abierta = await abrir(page, url);
    comprobar(`${donde}: con niebla, la tarjeta sale sola`, abierta, abierta ? "abierta" : "no salió", "es lo que se mide");
    if (!abierta) {
      await contexto.close();
      continue;
    }
    if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/despues-${TRAMO}-${p.ancho}x${p.alto}-primera.png` });
    const m1 = await page.evaluate(medirLaTarjeta);
    comprobar(`${donde}: cabe entera`, m1.cabe, m1.caja, "en el teléfono apaisado la decisión tiene que verse sin desplazar");
    comprobar(
      `${donde}: todo lo que se toca mide al menos 44 × 44 y se alcanza`,
      m1.malos.length === 0,
      m1.malos.join(" · ") || "todo de yema",
      "un niño de cuatro años con el dedo",
    );
    comprobar(`${donde}: hay ✕ para cerrar, con su nombre`, m1.cerrar, m1.cerrar ? "sí" : "no", "«que no hay x para quitar»");
    comprobar(
      `${donde}: la primera vez no se ofrece «no volver a explicar»`,
      !m1.noExplicar,
      m1.noExplicar ? "sale ya" : "no sale",
      "quien la ve por primera vez todavía no sabe qué es",
    );
    comprobar(
      `${donde}: el foco empieza en la decisión, no en la ✕`,
      m1.foco === "quedarse",
      m1.foco ?? "en ningún botón",
      "un Enter de más no puede cerrar la tarjeta",
    );
    const dichas1 = await pedidas(page);
    const laExplicacion = explica(dichas1);
    comprobar(
      `${donde}: al abrirse, se explica en voz`,
      laExplicacion !== null,
      laExplicacion === "parte.explica"
        ? "la explicación montada, grabada"
        : laExplicacion
          ? `${laExplicacion} (las piezas nuevas esperan su toma: va el porqué de siempre)`
          : `nada: ${dichas1.slice(-4).join(" · ") || "silencio"}`,
      "«debería escucharse algo que lo explique»",
    );

    // ── Señalar sin pulsar ──
    await page.keyboard.press("Tab");
    await page.waitForTimeout(600);
    const conTab = await pedidas(page);
    comprobar(
      `${donde}: el tabulador llega a «esperar» y se pide decir qué hace`,
      conTab.some((c) => c.includes("parte.senala.esperar")),
      conTab.filter((c) => c.includes("parte.senala")).join(" · ") || `nada: ${conTab.slice(-3).join(" · ")}`,
      "a los cuatro años un botón que no se sabe qué hace no se toca",
    );
    if (!p.dedo) {
      const r = await page.evaluate(() => {
        const b = document.querySelector('[data-parte-accion="salir-igual"]').getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      });
      await page.mouse.move(r.x - 6, r.y);
      await page.mouse.move(r.x, r.y, { steps: 3 });
      await page.waitForTimeout(900);
      const conRaton = await pedidas(page);
      comprobar(
        `${donde}: el ratón parado encima de «salir igual» pide decir qué hace`,
        conRaton.some((c) => c.includes("parte.senala.salirIgual")),
        conRaton.filter((c) => c.includes("parte.senala")).join(" · ") || "nada",
        "señalar es preguntar sin decidir",
      );
    }

    // ── Cerrar con la ✕ ──
    await page.click(".parte__cerrar");
    await page.waitForTimeout(500);
    const tras = await page.evaluate(() => ({
      oculta: document.getElementById("tarjeta-del-tiempo").hidden,
      antes: globalThis.__oga.antesDeVolar(),
      dichas: globalThis.__oga.dichoTodo().instructor ?? [],
    }));
    comprobar(
      `${donde}: la ✕ cierra sin decidir nada`,
      tras.oculta && tras.antes.decision === null && !tras.dichas.includes("parte.ganaste") && !tras.dichas.includes("parte.salgoIgual.voz"),
      `${tras.oculta ? "cerrada" : "abierta"} · decisión: ${tras.antes.decision ?? "ninguna"}`,
      "cerrar es «ya lo vi», no quedarse ni salir",
    );
    if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/despues-${TRAMO}-${p.ancho}x${p.alto}-cerrada.png` });

    // ── La segunda vez: se ofrece «no volver a explicar» ──
    const abierta2 = await abrir(page, url);
    const m2 = abierta2 ? await page.evaluate(medirLaTarjeta) : null;
    comprobar(
      `${donde}: la segunda vez se ofrece «no volver a explicar», de yema`,
      abierta2 && m2.noExplicar && m2.malos.length === 0 && m2.cabe,
      !abierta2 ? "no salió" : `${m2.noExplicar ? "sale" : "no sale"} · ${m2.malos.join(" · ") || "todo de yema"}`,
      "«un botón de “no volver a explicar” que aparezca a partir de la segunda o tercera vez»",
    );
    if (CAPTURAS && abierta2)
      await page.screenshot({ path: `${CAPTURAS}/despues-${TRAMO}-${p.ancho}x${p.alto}-segunda.png` });
    if (abierta2 && m2.noExplicar) {
      await page.click(".parte__no-explicar");
      await page.waitForTimeout(300);
      const q = await page.evaluate(() => ({
        guardado: globalThis.__oga.explicacionDelParte(),
        boton: !!document.querySelector(".parte__no-explicar"),
        foco: document.activeElement?.dataset?.parteAccion ?? null,
      }));
      comprobar(
        `${donde}: al tocarlo se guarda en el perfil y se va`,
        q.guardado.quitada && !q.boton && q.foco === "cerrar",
        `quitada: ${q.guardado.quitada} · veces: ${q.guardado.veces} · foco en ${q.foco}`,
        "para siempre en ese perfil, y recuperable en los ajustes",
      );
      // ── La tercera: ya no se explica ──
      const abierta3 = await abrir(page, url);
      const dichas3 = abierta3 ? await pedidas(page) : [];
      const m3 = abierta3 ? await page.evaluate(medirLaTarjeta) : null;
      comprobar(
        `${donde}: la tercera vez sale la tarjeta, sin explicación ni botón`,
        abierta3 && explica(dichas3) === null && !m3.noExplicar,
        !abierta3 ? "no salió" : `${explica(dichas3) ?? "callada"} · botón: ${m3.noExplicar ? "sale" : "no"}`,
        "así no escucha siempre lo mismo",
      );
      // ── Y los ajustes la devuelven ──
      const ajustes = await page.evaluate(async () => {
        document.querySelector(".parte__cerrar")?.click();
        const j = globalThis.__oga.juegoParaTrazas();
        j.ajustesUI.abrir();
        await new Promise((r) => setTimeout(r, 300));
        const linea = !!document.querySelector('[data-ajuste-linea="explicacion-del-parte"]');
        document.querySelector('[data-accion="explicacion-del-parte"]')?.click();
        await new Promise((r) => setTimeout(r, 300));
        const sigue = !!document.querySelector('[data-ajuste-linea="explicacion-del-parte"]');
        j.ajustesUI.cerrar();
        return { linea, sigue, guardado: globalThis.__oga.explicacionDelParte() };
      });
      comprobar(
        `${donde}: los ajustes ofrecen volver a explicarla, y la devuelven`,
        ajustes.linea && !ajustes.sigue && !ajustes.guardado.quitada,
        JSON.stringify(ajustes),
        "lo quitado sin querer se recupera, como las teclas que tocan",
      );
    }
    comprobar(`${donde}: sin errores en la página`, errores.length === 0, errores.slice(0, 3).join(" | ") || "ninguno", "");
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

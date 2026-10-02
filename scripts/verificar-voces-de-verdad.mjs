/**
 * **Las voces en las condiciones de casa**: sin la bandera de autoplay, con
 * un primer gesto de verdad y con el pack de voz bajando despacio.
 *
 * Enrique, dos vuelos seguidos: «Tripulación, armar toboganes y verificación
 * cruzada» no se oye. Y en el banco de vuelo entero sí se pedía y se daba por
 * dicho, porque ese banco no se parece a su casa en tres cosas:
 *
 * - Lanza Chrome sin pantalla y hace un clic nada más cargar, así que el
 *   audio se desbloquea antes de que pase nada; en casa el primer gesto llega
 *   cuando llega —en el hangar, o al tocar la primera tecla—.
 * - Sirve el pack del disco en un instante; en casa, la primera vez después
 *   de publicar, se bajan otra vez todas las piezas —llevan su huella en la
 *   dirección— y la comandante es la sexta voz de la cola.
 * - Y apunta lo que se **pidió** decir, no lo que **sonó**. Una frase pedida
 *   antes de tener su grabación se le pasaba a la voz del navegador, que en
 *   Brave para Linux es muda, y se apuntaba igual.
 *
 * Esto vuela las dos formas de llegar al puesto con esas condiciones, y mira
 * con el oído —`oido.mjs`— lo que llega al altavoz:
 *
 * - **por el hangar**: el gesto es anterior al juego, como el clic de
 *   «despegar» —el juego todavía no escucha—;
 * - **directo**: se entra por la dirección y el primer gesto es un toque en
 *   la pantalla con el juego ya en marcha.
 *
 * Y en las dos, quieto en el puesto, tiene que sonar el crosscheck de Jazlyn
 * con su grabación y entero, y todo lo que la comandante pidió decir.
 *
 * Uso: `node scripts/verificar-voces-de-verdad.mjs [escenario] [avión]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";
import {
  autoplayDeVerdad,
  enUnaLinea,
  frasesOidas,
  loOido,
  oidoEnLaPagina,
  redLentaParaLasVoces,
  seSolapan,
} from "./oido.mjs";

const PUERTO = 5297;
const ESCENARIO = process.argv[2] ?? "tenerife-norte";
const AVION = process.argv[3] ?? "jaz-90";
/** Cuánto se queda en el puesto mirando, en segundos de pared. */
const EN_EL_PUESTO = Number(process.env.OGA_PUESTO ?? 45);
/** El tubo de la red: kilobits por segundo. Ver `redLentaParaLasVoces`. */
const KBPS = Number(process.env.OGA_KBPS ?? 1600);

const resultados = [];
const comprobar = (nombre, ok, detalle) =>
  resultados.push({ nombre, ok: !!ok, detalle });

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);

let navegador;
try {
  navegador = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    /*
     * **La política de autoplay de un navegador de verdad**, dicha a mano: la
     * que tienen Chrome y Brave por omisión. Los bancos que necesitan sonar
     * sin gesto llevan `no-user-gesture-required`; éste lleva la contraria a
     * propósito.
     */
    args: [
      "--use-gl=angle",
      "--use-angle=gl",
      "--enable-unsafe-swiftshader",
      "--autoplay-policy=document-user-activation-required",
    ],
  });

  for (const como of ["por-el-hangar", "directo"]) {
    const contexto = await navegador.newContext({
      viewport: { width: 1000, height: 620 },
      hasTouch: true,
      isMobile: true,
      locale: "es-PY",
    });
    await contexto.addInitScript(() => {
      localStorage.setItem("oga-veve:teclas-vistas", "1");
    });
    // La regla de autoplay primero, y el oído encima: ver `autoplayDeVerdad`.
    await contexto.addInitScript(autoplayDeVerdad);
    await contexto.addInitScript(oidoEnLaPagina);
    await redLentaParaLasVoces(contexto, { kbps: KBPS });
    const page = await contexto.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));

    const url =
      `${BASE}/?escenario=${ESCENARIO}&hora=16&leccion=despegue&tramo=guyrami` +
      `&avion=${AVION}&destino=la-palma&meteo=`;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    let gestoAntesDelJuego = null;
    if (como === "por-el-hangar") {
      /*
       * El clic de «despegar» del hangar: un gesto de verdad sobre la página,
       * antes de que el juego exista y escuche. Se mira que de verdad fuera
       * antes, que si no esto no mediría lo que dice.
       */
      await page.mouse.click(500, 310);
      gestoAntesDelJuego = await page.evaluate(() => !globalThis.__oga);
    }
    const arranco = await page
      .waitForFunction(() => !!globalThis.__oga?.estado, null, { timeout: 120000 })
      .then(() => true)
      .catch(() => false);
    if (!arranco) {
      comprobar(`${como}: el juego arranca`, false, errores.slice(0, 2).join(" | ") || "no arrancó en 120 s");
      await contexto.close();
      continue;
    }
    if (como === "directo") {
      /*
       * Un toque en la pantalla con el juego ya en marcha, y no enseguida:
       * a los ocho segundos, con el crosscheck ya pedido —se pide a los
       * cuatro— y el audio todavía dormido. Es quien entra por un enlace y
       * mira antes de tocar.
       */
      await page.waitForTimeout(8000);
      const libre = await page.evaluate(() => {
        for (let fy = 0.3; fy < 0.9; fy += 0.05)
          for (let fx = 0.3; fx < 0.8; fx += 0.05) {
            const x = Math.round(innerWidth * fx);
            const y = Math.round(innerHeight * fy);
            if (document.elementFromPoint(x, y)?.id === "lienzo") return [x, y];
          }
        return [Math.round(innerWidth / 2), Math.round(innerHeight / 3)];
      });
      await page.mouse.click(libre[0], libre[1]);
    }

    // Quieto en el puesto, que es donde se arman los toboganes.
    await page.waitForTimeout(EN_EL_PUESTO * 1000);

    const fase = await page.evaluate(() => globalThis.__oga.fase()).catch(() => "?");
    const pedido = await page
      .evaluate(() => globalThis.__oga.dichoTodo?.() ?? {})
      .catch(() => ({}));
    const oido = await loOido(page);
    const frases = frasesOidas(oido.sonidos);
    const cero = frases[0]?.t0 ?? 0;
    const deJazlyn = frases.filter((f) => f.voz === "comandante");
    const crosscheck = deJazlyn.find((f) => f.piezas.includes("comandante.crosscheck"));

    if (gestoAntesDelJuego !== null)
      comprobar(
        `${como}: el gesto llegó antes que el juego`,
        gestoAntesDelJuego,
        gestoAntesDelJuego ? "sí: el juego aún no escuchaba" : "no: el juego ya estaba",
      );
    comprobar(
      `${como}: suena el crosscheck de Jazlyn, con su voz y entero`,
      crosscheck && crosscheck.entera,
      crosscheck
        ? `${enUnaLinea(crosscheck, cero)} · fase ${fase}`
        : `no sonó · la comandante pidió: ${(pedido.comandante ?? []).join(", ") || "nada"} · ` +
            `oído de ella: ${deJazlyn.map((f) => f.piezas[0]).join(", ") || "nada"} · fase ${fase}`,
    );
    /*
     * Y todo lo que la comandante pidió decir sonó: lo pedido que no llegó
     * al altavoz es justo lo que en casa era silencio.
     */
    const pedidoDeElla = (pedido.comandante ?? []).map((c) => c.replace(/~\d+$/, ""));
    const sinSonar = pedidoDeElla.filter(
      (c) => !deJazlyn.some((f) => f.piezas.some((p) => p.startsWith(c))),
    );
    comprobar(
      `${como}: lo que pidió la comandante, sonó`,
      pedidoDeElla.length > 0 && sinSonar.length === 0,
      sinSonar.length ? `sin sonar: ${sinSonar.join(", ")}` : `${pedidoDeElla.length} de ${pedidoDeElla.length}`,
    );
    const choques = seSolapan(frases);
    comprobar(
      `${como}: y no suenan dos voces a la vez`,
      choques.length === 0,
      choques.length
        ? choques
            .slice(0, 3)
            .map((c) => `${enUnaLinea(c.a, cero)} ✕ ${enUnaLinea(c.b, cero)}`)
            .join(" | ")
        : `${frases.length} frases oídas, ninguna encima de otra`,
    );
    console.log(`\n  ${como} — lo que sonó:`);
    for (const f of frases.slice(0, 20)) console.log(`    ${enUnaLinea(f, cero)}`);
    if (oido.navegador.length)
      console.log(`    (y ${oido.navegador.length} por la voz del navegador)`);
    console.log(
      `    audio: ${oido.estados.map((e) => `${e.estado}@${(e.pared / 1000).toFixed(1)}s`).join(" → ") || "sin contexto"}`,
    );
    await contexto.close();
  }
} finally {
  await navegador?.close().catch(() => {});
  await server.close().catch(() => {});
}

console.log("");
for (const r of resultados)
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones\n`);
process.exit(bien === resultados.length ? 0 : 1);

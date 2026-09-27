/**
 * Cambiar de avión es empezar otro vuelo, y solo en tierra y parado.
 *
 * Este banco nació por otra queja —«la avioneta nace en el aire porque el
 * juego parte de un avión enorme y es como si se cayera»— cuando la tecla
 * montaba el avión nuevo donde estaba el anterior. Arreglado eso, quedaba lo
 * gordo: **los destinos y el combustible se deciden al arrancar, para el avión
 * de ese arranque**, y cambiar de avión por encima los dejaba con el de antes.
 * Contado jugando en Pettirossi: del cuatrimotor, que allí no tiene destino, a
 * la avioneta, que se quedó sin destinos —«no me deja elegir otro
 * aeropuerto»— y con 20 842 kg en el depósito.
 *
 * Ahora la tecla guarda el avión y vuelve a arrancar por el camino del hangar.
 * Lo que se mide aquí es eso, con el arranque de verdad:
 *
 * - en el aire la tecla no cambia nada, y se dice;
 * - en tierra y parado, la página vuelve a arrancar con el avión siguiente;
 * - el vuelo nuevo tiene **los destinos y el combustible de ese avión**, está
 *   apoyado sobre sus ruedas y sin percance;
 * - y el recado es de un solo uso: la recarga siguiente vuelve a lo de siempre.
 *
 * Uso: `node scripts/verificar-cambio-de-avion.mjs [escenario] [tramo]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = 5293;
const ESCENARIO = process.argv[2] ?? "pettirossi";
const TRAMO = process.argv[3] ?? "taguato-ruvicha";

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
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

try {
  const page = await navegador.newPage({ viewport: { width: 900, height: 560 } });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.addInitScript(() => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
  });

  const arrancado = () =>
    page
      .waitForFunction(() => globalThis.__oga?.estado?.(), null, { timeout: 90000 })
      .then(() => page.waitForTimeout(2000))
      .then(() => true)
      .catch(() => false);

  const mirar = () =>
    page.evaluate(() => {
      const o = globalThis.__oga;
      const s = o.estado();
      const a = o.avion();
      const sobre = s.position.y - o.suelo(s.position.x, s.position.z);
      const d = o.combustible();
      return {
        avion: a.id,
        enElSuelo: s.onGround,
        flotando: +(sobre - a.tren).toFixed(2),
        percance: !!o.percance?.(),
        destinos: (o.pistasDeLosVecinos?.() ?? []).length,
        kilos: Math.round(d.kilos),
        cabe: Math.round(d.cabe),
        url: location.search,
      };
    });

  // ── En el aire, la tecla no cambia de avión ─────────────────────────────
  await page.goto(
    `${BASE}/?escenario=${ESCENARIO}&hora=16&leccion=aterrizaje&tramo=${TRAMO}&avion=jaz-120`,
  );
  await arrancado();
  const enElAire = await mirar();
  await page.evaluate(() => {
    globalThis.__recargas = (globalThis.__recargas ?? 0) + 1;
  });
  await page.keyboard.press("KeyP");
  await page.waitForTimeout(1500);
  const trasLaTecla = await page
    .evaluate(() => ({
      misma: globalThis.__recargas === 1,
      avion: globalThis.__oga.avion().id,
      tarjeta: globalThis.__oga.tarjeta?.() ?? null,
    }))
    .catch(() => ({ misma: false, avion: "?", tarjeta: null }));
  comprobar(
    "en el aire la tecla no cambia de avión",
    !enElAire.enElSuelo && trasLaTecla.misma && trasLaTecla.avion === enElAire.avion,
    `${enElAire.enElSuelo ? "estaba en tierra: no mide nada" : "en el aire"} · ${trasLaTecla.avion} · ${trasLaTecla.misma ? "sin recargar" : "RECARGÓ"}`,
    "en el aire no se cambia de avión: no es real",
  );
  /*
   * Con el freno, salvo que haya puesta una tarjeta que importe más —la senda,
   * un aviso—: esa no se tapa por contestar a una tecla, y es lo correcto.
   */
  const t = trasLaTecla.tarjeta;
  comprobar(
    "y lo dice con el freno",
    t?.dibujo === "freno" || (t?.prioridad ?? 0) > 0,
    `tarjeta: ${t ? `${t.dibujo} (prioridad ${t.prioridad})` : "ninguna"}`,
    "una tecla que no hace nada se aprieta más fuerte",
  );

  // ── En tierra y parado, empieza otro vuelo ──────────────────────────────
  await page.goto(
    `${BASE}/?escenario=${ESCENARIO}&hora=16&leccion=despegue&tramo=${TRAMO}&avion=jaz-120`,
  );
  await arrancado();
  const antes = await mirar();
  console.log(`\n  antes: ${JSON.stringify(antes)}`);
  const recargada = page.waitForEvent("load", { timeout: 30000 }).catch(() => null);
  await page.keyboard.press("KeyP");
  await recargada;
  const volvio = await arrancado();
  const despues = volvio ? await mirar() : null;
  console.log(`  después: ${JSON.stringify(despues)}\n`);

  comprobar(
    "en tierra y parado, la tecla empieza un vuelo con otro avión",
    volvio && despues && despues.avion !== antes.avion,
    despues ? `${antes.avion} → ${despues.avion}` : "no volvió a arrancar",
    "cambiar de avión es arrancar otra vez, por el camino del hangar",
  );
  if (despues) {
    comprobar(
      "y el avión nuevo tiene los destinos que le tocan",
      antes.avion !== "jaz-120" || ESCENARIO !== "pettirossi" || despues.destinos > 0,
      `${antes.destinos} destinos con ${antes.avion} → ${despues.destinos} con ${despues.avion}`,
      "los destinos se filtran al arrancar por lo que cabe en cada pista",
    );
    comprobar(
      "y el combustible de su depósito, no el del de antes",
      despues.kilos <= despues.cabe && despues.kilos > 0,
      `${despues.kilos} kg de ${despues.cabe} que caben (antes ${antes.kilos} kg)`,
      "veinte mil kilos en una avioneta no caben ni diez veces en su ala",
    );
    comprobar(
      "y nace apoyado sobre sus ruedas, sin percance",
      despues.enElSuelo && Math.abs(despues.flotando) <= 0.3 && !despues.percance,
      `${despues.enElSuelo ? "en el suelo" : "EN EL AIRE"} · ${despues.flotando} m sobre su tren${despues.percance ? " · PERCANCE" : ""}`,
      "cambiar de avión no es un percance",
    );

    // ── Y el recado era de un solo uso ─────────────────────────────────────
    await page.reload();
    await arrancado();
    const otraVez = await mirar();
    comprobar(
      "y la recarga siguiente ya no lo lleva: el recado era de un solo uso",
      otraVez.avion === "jaz-120",
      `tras recargar: ${otraVez.avion} (la dirección pide jaz-120)`,
      "si se quedara, cada recarga se saltaría el hangar para siempre",
    );
  }

  comprobar("sin errores", !errores.length, errores[0] ?? "limpio", "");
} finally {
  console.log("");
  for (const r of resultados) {
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
    if (!r.ok && r.porque) console.log(`      ${r.porque}`);
  }
  const bien = resultados.filter((r) => r.ok).length;
  console.log(`\n  ${bien} de ${resultados.length} comprobaciones\n`);
  await navegador.close();
  await server.close();
  process.exit(bien === resultados.length && resultados.length ? 0 : 1);
}

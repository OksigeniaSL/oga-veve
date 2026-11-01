/**
 * **El tercer capítulo del vuelo largo, de principio a fin**: `?inicio=4&capitulo=3`.
 * Ver `src/flight/guion-llegada-a-asuncion.ts` y el ADR 0023.
 *
 * Es el banco de la tanda T4 del plan del largo radio: lo que se cuenta y el vuelo
 * entero. Mira que el vuelo se pueda hacer entero, que no se rompa nada del motor del
 * pasaje con otro guion, y que lo que se cuenta suene en su orden y con su lámina.
 *
 * ## Qué mira
 *
 * - **Se abre**: el JAZ 110, de pasajero, sin pasar por el hangar y sin menú. Y con
 *   su ficha de «¿A qué jugás?», con el dedo: `OGA_MENU=1`, solo eso.
 * - **El mundo no asoma antes de la ventanilla**, y cada lámina se ve de verdad, con
 *   su fichero bajado, y en su orden. Lo que falta por grabar se dice: `sin grabar`,
 *   que es lo esperado mientras no lleguen las voces, y no cuenta como fallo.
 * - **Entra en el sitio y la hora que da la cuenta**: en crucero, en el mundo de
 *   Paraguay, con la hora del vuelo de `entradaDeLaLlegada` y el sol de ese
 *   instante. Y sin la tarjeta de la escena en blanco.
 * - **El ⏩ funciona hasta los diez mil pies**, con el botón de verdad, y ahí se
 *   apaga solo, sin que vuelva: de ahí a la pista, a su paso.
 * - **Baja por su aproximación publicada**, y toca dentro de la pista a menos de
 *   tres metros por segundo. Lo fino de la toma no es de este banco: se acepta
 *   esto (el plan lo dice, y el piloto de banco ya costó dos horas).
 * - **Llega al puesto**, con los motores parados, y acaba el guion.
 * - **Nunca suenan dos voces a la vez**, ni una voz que no sea de la escena.
 * - **Sin errores de consola.**
 *
 * Con la fecha fija, una de diciembre: `OGA_FECHA=` para otra. Con el viento de
 * siempre, del 020: `OGA_VIENTO=200/8` entra por la 20. `OGA_VECES` es el reloj de
 * los bancos por debajo de los diez mil pies, que el botón ⏩ no toca: acelera lo
 * que quien juega no puede, solo para no esperar media hora, y `OGA_PRISA` lo
 * pone desde el principio. `OGA_GPU=1` y `OGA_FOTOS=<dir>`, como los demás.
 * `OGA_APERTURA=1` para en cuanto se abre la ventanilla: es lo que tarda en comprobarse
 * lo que se cuenta, con sus capturas, sin volar lo demás.
 */
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = Number(process.env.OGA_PUERTO ?? 5602);
const FOTOS = process.env.OGA_FOTOS ?? null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const FECHA = process.env.OGA_FECHA ?? "2026-12-15";
const VIENTO = process.env.OGA_VIENTO ?? "020/8";
const VECES = Number(process.env.OGA_VECES ?? 8);
const SOLO_APERTURA = !!process.env.OGA_APERTURA;
/** Las frases de lo que se cuenta antes de ver el mundo, en su orden. */
const DE_LA_APERTURA = (temporada, sol) => [
  "inicio.tripulacion.pasaje.cerca.despertar",
  "inicio.ara.pasaje.largo.meDormi",
  "inicio.tripulacion.pasaje.cerca.largo.mapa",
  "inicio.ara.pasaje.largo.mapa",
  "inicio.tripulacion.pasaje.derlis.desayuno",
  "inicio.ara.pasaje.largo.chipa",
  "inicio.ara.pasaje.largo.nariz",
  "inicio.tripulacion.pasaje.derlis.agua",
  "inicio.ara.pasaje.largo.huso",
  "inicio.tripulacion.pasaje.cerca.largo.huso",
  temporada === "verano" ? "inicio.tripulacion.pasaje.cerca.largo.husoVerano" : "inicio.tripulacion.pasaje.cerca.largo.husoInvierno",
  "inicio.tripulacion.pasaje.cerca.largo.ecuador1",
  "inicio.ara.pasaje.largo.ecuador",
  "inicio.tripulacion.pasaje.cerca.largo.ecuador2",
  "inicio.tripulacion.pasaje.derlis.piernas",
  "inicio.tripulacion.pasaje.derlis.desfase",
  ...(sol),
];
/** De qué piezas tienen voz ya: lo que no, sale «sin grabar». */
const manifiesto = (voz) => JSON.parse(readFileSync(`data/voces/${voz}/manifiesto.json`, "utf8")).piezas;
const GRABADAS = new Set(["ara", "comandante", "tripulacion", "tripulacion-canarias"].flatMap((v) => Object.keys(manifiesto(v))));
/** Tope del vuelo entero, ms de pared. */
const TOPE = Number(process.env.OGA_TOPE ?? 50) * 60_000;
const PIE = 0.3048;
const DIEZ_MIL_PIES = 10_000 * PIE;

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "warn",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const ruta = await server.ssrLoadModule("/src/flight/ruta-larga.ts");
const salto = await server.ssrLoadModule("/src/flight/salto-bajo-tapa.ts");
const perfil = ruta.perfilDelVuelo(ruta.horarioDelDia(new Date(`${FECHA}T12:00:00Z`)));

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

async function foto(page, nombre) {
  if (!FOTOS) return;
  const r = await page.evaluate(() => {
    const c = document.querySelector("#lienzo");
    const gl = c?.getContext("webgl2") ?? c?.getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "desconocido";
  });
  const corto = /swiftshader/i.test(r) ? "swiftshader" : /intel/i.test(r) ? "intel" : /nvidia/i.test(r) ? "nvidia" : "otro";
  const fichero = `${FOTOS}/inicio-4-${nombre}-${corto}.png`;
  await page.screenshot({ path: fichero });
  console.log(`  📷 ${fichero}  —  ${r}`);
}

/** Lo que se lee del juego de una vez, que entre lecturas el avión se mueve. */
const leer = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const s = o.estado();
    const i = o.inicio();
    const j = o.juegoParaTrazas();
    const tarjeta = document.querySelector("#inicio .inicio__tarjeta");
    const caja = tarjeta?.getBoundingClientRect();
    const boton = document.querySelector('[data-hud="adelantar"]');
    const cajaBoton = boton?.getBoundingClientRect();
    return {
      x: s.position.x,
      y: s.position.y,
      z: s.position.z,
      rumbo: s.heading,
      velocidad: s.airspeed,
      suelo: s.groundSpeed,
      vertical: s.verticalSpeed,
      enTierra: s.onGround,
      enPista: s.onRunway,
      altura: s.heightAboveGround,
      fase: o.fase(),
      percance: o.percance?.() ?? null,
      motor: o.controles().engineOn,
      flaps: o.controles().flaps,
      tren: o.controles().tren,
      gas: o.controles().throttle,
      escena: i.escena,
      lamina: i.lamina ?? null,
      tapa: i.estado?.tapa ?? null,
      momento: i.estado?.momento ?? null,
      dichos: i.estado?.dichos ?? [],
      saltados: i.estado?.saltados ?? [],
      terminado: i.estado?.terminado ?? false,
      puedeSeguir: i.estado?.puedeSeguir ?? false,
      plano: i.estado?.plano ?? null,
      siestas: i.estado?.siestas ?? [],
      adelanto: i.estado?.adelanto ?? null,
      linea: i.estado?.linea?.clave ?? null,
      registro: (i.registro ?? []).map((d) => ({ clave: d.clave, desde: d.desde, hasta: d.hasta, como: d.como, cortada: d.cortada })),
      nombrados: i.estado?.nombrados ?? [],
      charlas: i.estado?.charlas ?? [],
      cartel: o.salto().cartel,
      sobreElMundo: {
        visible: document.querySelector("#lamina-grande")?.hidden === false,
        opacidad: Number(document.querySelector("#lamina-grande")?.style.opacity ?? 0),
      },
      tripulacion: i.tripulacion,
      manos: i.manos ?? null,
      faltaParaTocar: i.lecturaDeLinea?.faltaParaTocar ?? null,
      enLaFinal: i.lecturaDeLinea?.enLaFinal ?? null,
      lado: i.lecturaDeLinea?.pista?.lado ?? null,
      ultimaToma: i.ultimaToma ?? null,
      vista: i.vista,
      salto: o.salto(),
      reloj: j.relojDelJuego,
      habladas: o.habladas(),
      maquina: o.maquina(),
      plan: j.planParaBanco ?? null,
      tarjeta: tarjeta
        ? {
            alto: caja.height,
            texto: tarjeta.textContent.trim(),
            visible: getComputedStyle(tarjeta).visibility !== "hidden" && getComputedStyle(tarjeta).display !== "none" && caja.height > 0,
          }
        : null,
      boton: boton
        ? {
            visible: !boton.closest("[hidden]") && getComputedStyle(boton).visibility !== "hidden" && (cajaBoton?.width ?? 0) > 4,
            pulsado: boton.getAttribute("aria-pressed") === "true",
          }
        : null,
    };
  });

const sitioDe = (l) => salto.sitioDelMundo(l.salto.origen, l.x, l.z);
/** Lo que se aparta de donde dice la cuenta a esa hora, m por la superficie. */
const fueraDeLaCuenta = (l) => ruta.ortodromica(sitioDe(l), ruta.dondeVa(perfil, l.salto.hora).sitio).distancia;

async function elCapitulo() {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errores = [];
  const avisos = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  page.on("console", (m) => {
    if (m.type() === "error") errores.push(m.text().slice(0, 200));
    if (m.type() === "warning") avisos.push(m.text().slice(0, 200));
  });
  try {
    await page.goto(`${BASE}/?inicio=4&capitulo=3&fecha=${FECHA}&viento=${VIENTO}`);
    await page.bringToFront();
    await page.waitForFunction(() => globalThis.__oga?.salto?.().hora != null, null, { timeout: 240_000 });
    await page.keyboard.press("ShiftLeft");
    await page.evaluate(() => globalThis.__ogaEmpezar?.());
    await pausa(1500);

    // ── Se abre, y entra donde toca ──────────────────────────────────────
    const uno = await leer(page);
    comprobar(
      "arranca tapado: el mundo no asoma antes de abrirse la ventanilla",
      uno.sobreElMundo.visible && uno.sobreElMundo.opacidad === 1 && uno.tapa !== null,
      `lámina ${uno.tapa} · opacidad ${uno.sobreElMundo.opacidad}`,
    );
    const avion = await page.evaluate(() => globalThis.__oga.avion().id);
    comprobar(
      "se abre con el JAZ 110, de pasajero, en el mundo del Paraguay y con la tripulación en crucero",
      avion === "jaz-110" && uno.escena === "largo" && uno.salto.mundo === "pettirossi" && uno.tripulacion?.tramo === "crucero" && !uno.enTierra && uno.motor === true && uno.vista?.startsWith("pasaje"),
      `${avion} · ${uno.escena} · ${uno.salto.mundo} · ${uno.tripulacion?.tramo} · FL${Math.round(uno.y / 30.48)} · vista ${uno.vista}`,
    );
    const entrada = ruta.entradaDeLaLlegada(perfil);
    comprobar(
      "entra a la hora que da la cuenta",
      Math.abs(uno.salto.hora - entrada) < 60,
      `${(uno.salto.hora / 3600).toFixed(3)} h del despegue (cuenta: ${(entrada / 3600).toFixed(3)} h, ${perfil.horario.temporada})`,
    );
    comprobar(
      "y en el sitio que da la cuenta, dentro del mundo",
      fueraDeLaCuenta(uno) < 500 && Math.abs(uno.x) < 374_000 && Math.abs(uno.z) < 374_000,
      `${fueraDeLaCuenta(uno).toFixed(0)} m de la cuenta · lat ${sitioDe(uno).lat.toFixed(2)} lon ${sitioDe(uno).lon.toFixed(2)} · x ${(uno.x / 1000).toFixed(0)} km z ${(uno.z / 1000).toFixed(0)} km`,
    );
    const sol = ruta.solEn(new Date(perfil.horario.despegue.getTime() + uno.salto.hora * 1000), sitioDe(uno));
    comprobar(
      "con el sol de ese sitio y ese instante",
      Math.abs(uno.salto.alturaDelSol - (sol.altura * 180) / Math.PI) < 1,
      `el sol a ${uno.salto.alturaDelSol.toFixed(1)}° (cuenta: ${((sol.altura * 180) / Math.PI).toFixed(1)}°)`,
    );
    comprobar(
      "y sin la tarjeta de la escena en blanco: si nadie habla, no se ve",
      !uno.tarjeta?.visible || uno.tarjeta.texto.length > 0,
      uno.tarjeta ? `visible ${uno.tarjeta.visible} · «${uno.tarjeta.texto.slice(0, 40)}»` : "sin tarjeta",
    );
    const plan = uno.plan;
    console.log(`  el plan: ${plan?.fijos?.filter((f) => f.nombre).map((f) => `${f.nombre}(${f.papel})`).join(" → ")}`);

    // ── Lo de antes de ver el mundo ──────────────────────────────────────
    const fotos = new Set();
    const planosVistos = [];
    const tapasVistas = [];
    let desnudo = 0;
    let abierta = null;
    const pared00 = Date.now();
    await foto(page, "0-a-oscuras");
    for (;;) {
      const a = await leer(page);
      if (tapasVistas.at(-1) !== a.tapa) tapasVistas.push(a.tapa);
      if (planosVistos.at(-1) !== a.plano) planosVistos.push(a.plano);
      // Sin lámina ni pantalla delante, antes de tiempo: el mundo a la vista.
      if (a.tapa === null && a.plano !== "respaldo" && !a.dichos.includes("ventanilla") && !a.sobreElMundo.visible) desnudo++;
      const vista = a.lamina?.vista ?? null;
      if (vista && a.lamina.tapa && !fotos.has(vista) && a.linea && (a.momento !== "despertar" || a.lamina.opacidad === 1)) {
        // Ya con la luz subida del todo, si es la del despertar.
        if (a.dichos.includes("mapa") || vista !== (a.lamina.vistas[0] ?? "")) {
          fotos.add(vista);
          await pausa(1100);
          await foto(page, `lamina-${vista}`);
        }
      }
      if (a.plano === "respaldo" && !fotos.has("respaldo") && a.linea?.endsWith("largo.mapa")) {
        fotos.add("respaldo");
        await pausa(1500);
        await foto(page, "pantalla-del-respaldo");
      }
      if (a.dichos.includes("ventanilla")) {
        abierta = a;
        break;
      }
      if (a.percance || Date.now() - pared00 > 12 * 60_000) break;
      await pausa(300);
    }
    const a = abierta;
    comprobar("la apertura se acaba, y se abre la ventanilla", !!a, a ? `${((Date.now() - pared00) / 1000).toFixed(0)} s de pared` : "no se abrió");
    if (a) {
      const temporada = perfil.horario.temporada;
      const conSol = ruta.solEnElVuelo(perfil, ruta.entradaDeLaLlegada(perfil)).asoma;
      const desayuno = conSol ? "desayuno" : "desayuno-noche";
      const huso = temporada === "verano" ? "huso-verano" : "huso-invierno";
      const esperadas = [desayuno, huso, "ecuador"];
      comprobar(
        "cada lámina se ve, con su fichero, y es la de hoy",
        esperadas.every((c) => a.lamina.vistas.includes(c)) && a.lamina.sinFichero.length === 0 && !a.lamina.vistas.includes(conSol ? "desayuno-noche" : "desayuno"),
        `vistas ${a.lamina.vistas.join(" → ")} · sin fichero ${a.lamina.sinFichero.join(", ") || "ninguna"}`,
      );
      comprobar(
        "en su orden, con la pantalla del asiento entre medias",
        tapasVistas.filter((t) => t).join() === ["a-oscuras", desayuno, desayuno, huso, "ecuador", desayuno, huso].filter((t, i) => t !== "a-oscuras" || tapasVistas[0] === "a-oscuras").join() &&
          planosVistos.includes("respaldo"),
        `${tapasVistas.join(" → ")} · planos ${planosVistos.join(" → ")}`,
      );
      comprobar("y sin que el mundo asome antes de tiempo", desnudo === 0, `${desnudo} lecturas con el mundo a la vista`);
      const orden = DE_LA_APERTURA(temporada, []);
      const dichas = a.registro.map((d) => d.clave);
      let i = -1;
      const fueraDeOrden = orden.filter((c) => {
        const j = dichas.indexOf(c);
        if (j <= i) return true;
        i = j;
        return false;
      });
      comprobar("suena todo, en su orden", fueraDeOrden.length === 0, fueraDeOrden.length ? `fuera de orden o sin decir: ${fueraDeOrden.join(", ")}` : `${orden.length} frases`);
      const sin = a.registro.filter((d) => d.como !== "sono").map((d) => d.clave);
      const graves = sin.filter((c) => GRABADAS.has(c));
      comprobar(
        "lo que no suena es solo lo que está sin grabar",
        graves.length === 0,
        graves.length ? `grabadas y mudas: ${graves.join(", ")}` : `sin grabar, y por eso mudas: ${sin.length} de ${a.registro.length}`,
      );
      if (sin.length) console.log(`  sin grabar: ${sin.join(" · ")}`);
      comprobar(
        "la frase de Idaira que llevaba tiempo muda, la primera",
        dichas[0] === "inicio.tripulacion.pasaje.cerca.despertar",
        `${a.registro[0]?.clave} (${a.registro[0]?.como})`,
      );
      comprobar("y no sale el ⏩ mientras dura", !(a.adelanto?.pulsado > 0), `pulsado ${a.adelanto?.pulsado}`);
      await pausa(1500);
      await foto(page, "1-ventanilla");
    }
    if (SOLO_APERTURA) {
      comprobar("sin errores de consola", errores.length === 0, errores.slice(0, 4).join(" · "));
      return;
    }

    // ── El vuelo entero ──────────────────────────────────────────────────
    // Para mirar la llegada sin esperar el crucero; las comprobaciones del ⏩ siguen valiendo.
    if (process.env.OGA_PRISA) await page.evaluate((v) => globalThis.__oga.acelerar(v), Number(process.env.OGA_PRISA));
    const pared0 = Date.now();
    const adelanto = { pulsadas: 0, corrio: false, enLaLlegada: null, botonTrasLaLlegada: 0, pulsaTras: null, corrioTras: false };
    const tramosVistos = [];
    let ultimo = uno;
    let trazaEn = 0;
    let fotoFinal = false;
    let fotoCorta = false;
    let fotoRodando = false;
    let tocado = null;
    let flaps = false;
    for (;;) {
      const l = await leer(page);
      ultimo = l;
      const ad = l.adelanto;
      const tramo = l.tripulacion?.tramo ?? "?";
      if (tramosVistos.at(-1)?.tramo !== tramo)
        tramosVistos.push({ tramo, pared: (Date.now() - pared0) / 1000, hora: l.salto.hora, y: l.y });
      if (Date.now() - trazaEn > 15_000) {
        trazaEn = Date.now();
        console.log(
          `  · ${((Date.now() - pared0) / 1000).toFixed(0).padStart(4)} s · ${(l.salto.hora / 3600).toFixed(3)} h · ${tramo} · ${l.fase} · FL${(l.y / 30.48).toFixed(0)} · ${(l.velocidad / 0.5144).toFixed(0)} kt · VS ${(l.vertical / 0.00508).toFixed(0)} fpm · falta ${((l.faltaParaTocar ?? 0) / 1000).toFixed(1)} km · ${l.momento} · gas ${l.gas.toFixed(2)} pide ${((l.manos?.velocidad ?? 0) / 0.5144).toFixed(0)} kt · flaps ${l.flaps.toFixed(2)} tren ${l.tren.toFixed(1)} · ⏩ ${ad?.sale ? "sale" : "—"}${ad?.puesto ? " puesto" : ""}${ad?.adelantando ? " corre" : ""} · plano ${l.plano} · ${l.linea ?? ""}`,
        );
      }
      // El botón, con el dedo de verdad, en cuanto sale.
      if (ad?.sale && !ad.puesto && adelanto.pulsadas === 0) {
        await page.locator('[data-hud="adelantar"]').click({ timeout: 5000 }).catch(() => page.evaluate(() => document.querySelector('[data-hud="adelantar"]')?.click()));
        adelanto.pulsadas++;
      }
      if (ad?.adelantando) adelanto.corrio = true;
      if (l.dichos.includes("bajada") && adelanto.cartelAlBajar === undefined && Date.now() - (adelanto.bajadaEn ??= Date.now()) > 8000)
        adelanto.cartelAlBajar = l.cartel;
      if (ad?.llegada != null && !adelanto.enLaLlegada) {
        adelanto.enLaLlegada = { y: l.y, seApagoSolo: ad.seApagoSolo, puesto: ad.puesto, falta: l.faltaParaTocar, pared: Date.now() };
        // Desde aquí, el reloj de los bancos: lo que queda es a su paso para quien juega, y son veinte minutos.
        await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
        console.log(`  la llegada a FL${(l.y / 30.48).toFixed(0)}, ⏩ se apagó solo ${ad.seApagoSolo}; reloj de los bancos ×${VECES}`);
      }
      if (adelanto.enLaLlegada && Date.now() - adelanto.enLaLlegada.pared > 2500) {
        if (l.boton?.visible || ad?.sale || ad?.puesto) adelanto.botonTrasLaLlegada++;
        if (ad?.adelantando) adelanto.corrioTras = true;
      }
      if (!flaps && l.flaps > 0.2) {
        flaps = true;
        await foto(page, "3-flaps");
      }
      if (!fotoCorta && l.enLaFinal && l.altura < 300) {
        fotoCorta = true;
        await foto(page, "4-final");
      }
      if (!fotoFinal && adelanto.corrio && l.salto.hora > entrada + 900) {
        fotoFinal = true;
        await foto(page, "2-bajando");
      }
      if (l.tripulacion?.tocado && !tocado) {
        tocado = { t: Date.now(), lectura: l };
        await foto(page, "5-toma");
      }
      if (!fotoRodando && tramo === "al-puesto") {
        fotoRodando = true;
        await foto(page, "6-rodando");
      }
      if (l.momento === "fin" && l.puedeSeguir) break;
      if (l.percance) break;
      if (Date.now() - pared0 > TOPE) break;
      await pausa(400);
    }
    const l = ultimo;
    await foto(page, "7-puesto");
    await page.evaluate(() => globalThis.__oga.acelerar(1));
    console.log(`  tramos: ${tramosVistos.map((t) => `${t.tramo}@${t.pared.toFixed(0)}s`).join(" → ")}`);

    // ── El ⏩ ─────────────────────────────────────────────────────────────
    comprobar(
      "el ⏩ se pone con el botón, y corre",
      adelanto.pulsadas === 1 && adelanto.corrio,
      `pulsado ${adelanto.pulsadas} · corrió ${adelanto.corrio}`,
    );
    const ll = adelanto.enLaLlegada;
    comprobar(
      "se apaga solo al llegar a los diez mil pies",
      !!ll && ll.seApagoSolo && !ll.puesto && (ll.y < DIEZ_MIL_PIES + 60 * PIE || (ll.falta ?? Infinity) < 28_000),
      ll ? `a ${(ll.y / PIE).toFixed(0)} ft · faltando ${((ll.falta ?? 0) / 1000).toFixed(1)} km · se apagó solo ${ll.seApagoSolo}` : "no llegó",
    );
    comprobar(
      "y desde ahí no vuelve: ×1 para quien juega, sin botón",
      !!ll && adelanto.botonTrasLaLlegada === 0 && !adelanto.corrioTras,
      `el botón a la vista ${adelanto.botonTrasLaLlegada} veces · corrió después ${adelanto.corrioTras}`,
    );

    // ── La toma ───────────────────────────────────────────────────────────
    const t = l.tripulacion;
    const ut = l.ultimaToma;
    comprobar(
      "toca dentro de la pista, a menos de tres metros por segundo",
      !!t?.tocado && (t.caidaAlTocar ?? Infinity) < 3 && !l.percance && !!tocado && tocado.lectura.enPista,
      t?.tocado
        ? `${t.caidaAlTocar?.toFixed(2)} m/s · «${ut?.veredicto}» a ${ut?.pasado?.toFixed(0)} m del umbral · a ${Math.abs(tocado?.lectura.lado ?? NaN).toFixed(1)} m del eje · percance ${l.percance ?? "ninguno"}`
        : `no se tocó · ${l.percance ?? ""}`,
    );
    comprobar(
      "llega al puesto, con los motores parados",
      t?.tramo === "apagado" && l.motor === false && l.enTierra,
      `${t?.tramo} · ${l.fase} · motor ${l.motor}`,
    );
    comprobar(
      "y el guion acaba: se puede volver",
      l.momento === "fin" && l.puedeSeguir,
      `${l.momento} · dichos ${l.dichos.join(", ")} · saltados ${l.saltados.join(", ") || "ninguno"}`,
    );

    // ── Las voces ─────────────────────────────────────────────────────────
    const registro = l.registro;
    let pisadas = 0;
    for (let k = 1; k < registro.length; k++) if (registro[k].desde < (registro[k - 1].hasta ?? Infinity) - 1e-6) pisadas++;
    const queSono = registro.filter((d) => d.como === "sono").length;
    comprobar(
      "nunca suenan dos voces a la vez",
      registro.length >= 20 && pisadas === 0 && registro.every((d) => !d.cortada),
      `${registro.length} frases, ${queSono} sonadas · ${pisadas} pisadas · ${registro.filter((d) => d.cortada).length} cortadas`,
    );
    console.log(`  lo dicho: ${registro.map((d) => `${d.clave}(${d.como})`).join(" · ")}`);
    // ── Lo de la ventanilla, ya abierta ──────────────────────────────────
    const lasDichas = registro.map((d) => d.clave);
    const delAnuncio = registro.find((d) => d.clave === "comandante.largo.anuncio");
    comprobar(
      "el anuncio de la comandante, y después los cinturones, los oídos y prepararse para aterrizar",
      !!delAnuncio &&
        ["comandante.largo.anuncio", "tripulacion.cinturones", "inicio.tripulacion.pasaje.cerca.largo.oidos", "comandante.aproximacion"].every(
          (c, k, t) => lasDichas.includes(c) && (k === 0 || lasDichas.indexOf(t[k - 1]) < lasDichas.indexOf(c)),
        ),
      lasDichas.filter((c) => /largo\.anuncio|cinturones|largo\.oidos|aproximacion/.test(c)).join(" → "),
    );
    comprobar(
      "el cartel se enciende al bajar",
      adelanto.cartelAlBajar === true,
      `el cartel a ${adelanto.cartelAlBajar ?? "?"}`,
    );
    const sol = ruta.solEnElVuelo(perfil, l.salto.hora);
    const nombro = l.nombrados.map((n) => `${n.sitio}(${n.como}${n.lado ? `, ${n.lado}` : ""})`);
    console.log(`  lo que Ara nombró: ${nombro.join(" · ") || "nada"} · charlas ${l.charlas.join(", ") || "ninguna"}`);
    comprobar(
      "lo que nombra Ara, solo por su cristal",
      l.nombrados.every((n) => n.como === "ventanilla" && (n.lado === null || n.lado === "izquierda")),
      nombro.join(" · ") || "nada: hoy no se veía por su lado",
    );
    comprobar(
      "y de noche cerrada, ni el río ni el Chaco",
      sol.deNoche ? !l.charlas.includes("rio") && !l.charlas.includes("chaco") : true,
      `el sol al acabar a ${((sol.altura * 180) / Math.PI).toFixed(0)}°`,
    );
    const horaFinal = `comandante.largo.llegada.${perfil.horario.temporada}`;
    comprobar("la hora de allí al llegar, la de hoy", lasDichas.includes(horaFinal), horaFinal);
    comprobar(
      "y Ara dice que llegó, y no a La Palma",
      lasDichas.includes("inicio.ara.pasaje.largo.llegamos") && !lasDichas.includes("inicio.ara.pasaje.fin"),
      "",
    );
    const ajenas = l.habladas.filter((h) => !/ (inicio\.|comandante\.|tripulacion\.)/.test(h));
    comprobar(
      "ni otra voz que no sea de la escena, ni la de la máquina",
      ajenas.length === 0 && l.maquina.length === 0,
      `boca: ${ajenas.slice(0, 3).join(" · ") || "nada ajeno"} · máquina: ${l.maquina.slice(0, 3).join(" · ") || "nada"}`,
    );
    comprobar("Ara no se duerme en este capítulo", l.siestas.length === 0, `${l.siestas.length} siestas`);
    comprobar("sin errores de consola", errores.length === 0, errores.slice(0, 4).join(" · "));
    if (avisos.length) console.log(`  avisos de consola: ${avisos.length}; el primero: ${avisos[0]}`);
  } catch (e) {
    comprobar("el capítulo", false, `${String(e).slice(0, 300)} · ${errores.slice(0, 2).join(" · ")}`);
  } finally {
    await ctx.close();
  }
}

/** La ficha de «¿A qué jugás?», con el dedo: abre el capítulo, sin obligar a leer. */
async function laFicha() {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-PY" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  // Como en los otros bancos del menú: sin el pack de Ara, un piloto nuevo va al hangar y no a la primera experiencia.
  await page.route("**/data/voces/ara/manifiesto.json", (r) => r.fulfill({ status: 404, body: "" }));
  try {
    await page.goto(`${BASE}/?hora=12&fecha=${FECHA}`);
    await page.click("[data-nuevo]", { timeout: 120_000 });
    await page.click("[data-crear]");
    await page.waitForSelector('[data-pantalla="que"]', { timeout: 120_000 });
    await page.click('[data-pantalla="que"]');
    await page.waitForSelector('[data-inicio-modo="largo"]', { timeout: 20_000 });
    const ficha = await page.evaluate(() => {
      const b = document.querySelector('[data-inicio-modo="largo"]');
      const c = b.getBoundingClientRect();
      return { alto: c.height, ancho: c.width, dibujo: !!b.querySelector("svg"), nombre: b.querySelector(".ficha__nombre")?.textContent?.trim() };
    });
    comprobar("la ficha de llegar a Asunción, con su dibujo y su nombre", ficha.dibujo && ficha.alto >= 44 && !!ficha.nombre, `«${ficha.nombre}» ${Math.round(ficha.ancho)} × ${Math.round(ficha.alto)} px`);
    if (FOTOS) await page.screenshot({ path: `${FOTOS}/inicio-4-menu.png` });
    await page.click('[data-inicio-modo="largo"]');
    await page.waitForFunction(() => globalThis.__oga?.inicio?.()?.estado && globalThis.__oga.salto?.()?.hora != null, null, { timeout: 240_000 });
    const abre = await page.evaluate(() => ({ escena: globalThis.__oga.inicio().escena, avion: globalThis.__oga.avion().id, mundo: globalThis.__oga.salto().mundo }));
    comprobar("y abre este capítulo", abre.escena === "largo" && abre.avion === "jaz-110" && abre.mundo === "pettirossi", `${abre.escena} · ${abre.avion} · ${abre.mundo}`);
    comprobar("sin errores de consola, desde el menú", errores.length === 0, errores.slice(0, 3).join(" · "));
  } catch (e) {
    comprobar("la ficha", false, `${String(e).slice(0, 300)} · ${errores.slice(0, 2).join(" · ")}`);
  } finally {
    await ctx.close();
  }
}

try {
  if (process.env.OGA_MENU) await laFicha();
  else await elCapitulo();
} finally {
  await navegador.close();
  await server.close();
}

const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length}\n`);
process.exit(bien === resultados.length ? 0 : 1);

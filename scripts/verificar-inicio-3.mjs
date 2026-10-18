/**
 * **La tercera escena del modo inicio, el primer vuelo de pasaje de Ara, de
 * punta a punta.** Ver `src/flight/inicio-pasaje.ts`, que es la escena, y
 * `src/flight/vuelo-de-linea.ts`, que es la tripulación que lleva el avión.
 *
 * Hermano de `verificar-inicio.mjs` y `verificar-inicio-2.mjs`. Las pruebas de
 * unidad vuelan la escena con una tripulación de mentira y la tripulación
 * con el modelo de Guyrami sobre un mundo de mentira; esto vuela las dos
 * juntas en el navegador, sobre el mundo de verdad: de un puesto de Los
 * Rodeos a uno de La Palma, en el JAZ 90, sin tocar ni un mando.
 *
 * ## Qué mira
 *
 * - **Que se abre**: con `?inicio=3`, y desde el hangar, con su ficha al lado
 *   de las dos de Jazlyn.
 * - **Que se empieza sentado en la ventanilla**, en el puesto y con los
 *   motores parados, sin relojes ni mandos de pilotar en la pantalla.
 * - **Que cada cosa pasa en su momento**, en el orden de un vuelo de verdad,
 *   y que no se salta nada en un vuelo normal.
 * - **Que la tripulación no entra en pista** antes de «tripulación, sentados
 *   para el despegue», y que no se arranca antes de armar los toboganes.
 * - **Que se despega por el eje, se toca en la zona de toma y despacio**, y
 *   se llega al puesto; sin percance.
 * - **Que nada se pisa y no habla nadie más**: ni la radio, ni las cajas de la
 *   cabina de mando, ni la instructora. Lo que la boca tiró de otros, se
 *   cuenta aparte: se tiró porque la boca era de la escena.
 * - **Que lo de la ventanilla se dice**, con su historia, y Ara contesta. El
 *   Teide, sin falta: es lo más bonito de la ruta.
 * - **Que se dibuja qué mirar** —el ala, el cinturón, el motor, las nubes, la
 *   ventanilla—.
 * - **Que el cuaderno no apunta nada de pilotaje** y sí el sello de La Palma,
 *   de visita, y que el botón del final vuelve al hangar.
 * - **Y que en un teléfono apaisado**, con el dedo, la tarjeta cabe y no hay
 *   mandos de pilotar.
 *
 * Sin voces del sistema —el banco no las tiene, como el Brave de Enrique—,
 * con las tomas del pack: cada frase dura lo que dura su grabación, y **todo
 * lo que dice la escena tiene que haberse oído**. Con el reloj del juego
 * acelerado —`OGA_VECES`, doce por defecto—, que el vuelo entero son unos
 * treinta y cinco minutos; mientras habla la escena el juego va a su ritmo,
 * que lo que se oye no se acelera (ver `frame` en `game.ts`), así que el banco
 * tarda unos diez minutos.
 *
 * Uso: `node scripts/verificar-inicio-3.mjs`
 *   `OGA_GPU=1` con la tarjeta de verdad; `OGA_FOTOS=carpeta` saca capturas
 *   del despegue, las nubes, la ventanilla en crucero y la toma, con el
 *   renderer en el nombre; `OGA_SIN_HANGAR=1` se salta la ficha del hangar;
 *   `OGA_TOPE=segundos` cambia el tope de pared.
 */
import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = 5397;
const FOTOS = process.env.OGA_FOTOS ?? null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const VECES = Number(process.env.OGA_VECES ?? 12);
/** Tope de pared: el vuelo son unos treinta y cinco minutos de reloj del juego. */
const TOPE_S = Number(process.env.OGA_TOPE ?? 1800);

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "warn",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args:
    process.env.OGA_GPU === "1"
      ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
      : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => resultados.push({ nombre, ok: !!ok, detalle });

const renderer = (page) =>
  page.evaluate(() => {
    const c = document.querySelector("#lienzo");
    const gl = c?.getContext("webgl2") ?? c?.getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "desconocido";
  });

async function foto(page, nombre) {
  if (!FOTOS) return;
  const r = await renderer(page);
  const corto = /swiftshader/i.test(r) ? "swiftshader" : /intel/i.test(r) ? "intel" : /nvidia/i.test(r) ? "nvidia" : "otro";
  const ruta = `${FOTOS}/inicio-3-${nombre}-${corto}.png`;
  await page.screenshot({ path: ruta });
  console.log(`  📷 ${ruta}  —  ${r}`);
}

/** Lo que se ve de la escena, de una vez. */
const leer = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const i = o?.inicio?.();
    const s = o?.estado?.();
    const visible = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return !el.closest("[hidden]") && cs.visibility !== "hidden" && cs.display !== "none" && r.width > 2 && r.height > 2;
    };
    return {
      inicio: i ?? null,
      pos: s ? { x: s.position.x, y: s.position.y, z: s.position.z } : null,
      velocidad: s?.airspeed ?? 0,
      enTierra: s?.onGround ?? true,
      enPista: s?.onRunway ?? false,
      motor: o?.controles?.()?.engineOn ?? null,
      fase: o?.fase?.() ?? "",
      percance: o?.percance?.() ?? null,
      mirar: document.querySelector("#inicio [data-mirar]")?.getAttribute("data-mirar") ?? null,
      cara: document.querySelector("#inicio .inicio__cara")?.getAttribute("class") ?? null,
      dice: document.querySelector("#inicio .inicio__dice")?.textContent ?? "",
      conPasaje: document.documentElement.classList.contains("con-pasaje"),
      relojes: visible(".hud__izquierda") || visible(".hud__derecha"),
      mandos: visible("#tactil [data-touch='stick']") || visible("#tactil [data-touch='throttle']"),
      tarjeta: visible("#inicio .inicio__tarjeta"),
    };
  });

/** Los momentos de un vuelo normal, en su orden. Ver `GUION_DEL_PASAJE`. */
const MOMENTOS = [
  "ventanilla",
  "cinturon",
  "puertas",
  "motores",
  "bienvenida",
  "espera",
  "despegue",
  "carrera",
  "volando",
  "nubes",
  "nubesRespuesta",
  "arriba",
  "servicio",
  "bajada",
  "oidos",
  "isla",
  "aproximacion",
  "flaps",
  "toma",
  "llegada",
  "puesto",
];

/** Las claves que dice la escena y que no empiezan por `inicio.`: los anuncios y la ventanilla. */
const DE_LA_ESCENA = /^(inicio\.|comandante\.|tripulacion\.|ventanilla)/;

async function elVuelo() {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-PY" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.goto(`${BASE}/?inicio=3`);
  await page.bringToFront();
  try {
    await page.waitForFunction(() => !!globalThis.__oga?.inicio?.()?.estado, null, { timeout: 180_000 });
  } catch {
    comprobar("el juego arranca en la escena de pasaje", false, errores.join(" · ") || "sin __oga");
    await ctx.close();
    return;
  }
  // El primer toque, que deja sonar algo.
  await page.keyboard.press("ShiftLeft");
  await page.waitForFunction(() => globalThis.__oga.inicio().vista?.startsWith("pasaje"), null, { timeout: 60_000 }).catch(() => {});
  const primero = await leer(page);
  const avion = await page.evaluate(() => globalThis.__oga?.avion?.().id ?? null);
  comprobar(
    "arranca sentado en la ventanilla, en el puesto de Los Rodeos y con los motores parados",
    primero.inicio?.escena === "pasaje" &&
      primero.enTierra &&
      primero.motor === false &&
      primero.inicio?.tripulacion?.tramo === "puerta" &&
      primero.inicio?.vista === "pasaje-izquierda" &&
      avion === "jaz-90",
    `${primero.inicio?.escena} · ${avion} · motor ${primero.motor} · ${primero.inicio?.tripulacion?.tramo} · vista ${primero.inicio?.vista}`,
  );
  comprobar(
    "sin relojes ni mandos de pilotar, y con la tarjeta de la escena",
    primero.conPasaje && !primero.relojes && !primero.mandos && primero.tarjeta,
    `con-pasaje ${primero.conPasaje} · relojes ${primero.relojes} · mandos ${primero.mandos} · tarjeta ${primero.tarjeta}`,
  );
  const cuadernoAntes = primero.inicio?.cuaderno ?? null;
  const veces = await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
  console.log(`  reloj del juego ×${veces}`);

  const tramos = [];
  const miradas = new Set();
  const caras = new Set();
  const fotos = new Set();
  let entroEnPista = null;
  let arrancoCon = null;
  let masDeLadoEnLaCarrera = 0;
  let percance = null;
  let sello = null;
  let conversacion = null;
  let ultimo = null;
  const t0 = Date.now();

  while (Date.now() - t0 < TOPE_S * 1000) {
    const v = await leer(page).catch(() => null);
    if (!v) break;
    ultimo = v;
    const i = v.inicio;
    const e = i?.estado;
    if (!e) break;
    if (v.percance) percance = v.percance;
    const tramo = i.tripulacion?.tramo;
    if (tramo && tramos[tramos.length - 1]?.tramo !== tramo) tramos.push({ tramo, t: e.segundos });
    if (v.mirar) miradas.add(v.mirar);
    if (v.cara) caras.add(v.cara.replace(/^.*inicio__cara--/, ""));
    // ── Lo que se mira mientras pasa ──
    // Oída: que sonó o se esperó el rato de leerla, no que se pidió. Ver `Conversacion.oida`.
    const oida = (clave) => (i.registro ?? []).some((d) => d.clave === clave && (d.como === "sono" || d.como === "muda"));
    if (arrancoCon === null && v.motor) arrancoCon = oida("comandante.crosscheck");
    if (entroEnPista === null && v.enPista && v.fase !== "back-taxi" && tramo !== "frenando")
      entroEnPista = oida("comandante.despegue");
    if (tramo === "carrera" && v.enTierra && i.lecturaDeLinea)
      masDeLadoEnLaCarrera = Math.max(masDeLadoEnLaCarrera, Math.abs(i.lecturaDeLinea.pista.lado));
    // ── Las fotos ──
    if (FOTOS) {
      const en = (n, si) => {
        if (si && !fotos.has(n)) {
          fotos.add(n);
          return true;
        }
        return false;
      };
      if (en("despegue", tramo === "carrera" && v.velocidad > 50)) await foto(page, "despegue");
      if (en("nubes", e.dichos.includes("nubes"))) await foto(page, "nubes");
      if (en("ventanilla", e.senalados.length > 0 && e.mira === "ventanilla" && !v.enTierra)) await foto(page, "ventanilla");
      if (en("toma", tramo === "frenando")) await foto(page, "toma");
    }
    // ── El final ──
    if (e.momento === "fin") {
      if (!e.puedeSeguir) {
        await pausa(150);
        continue;
      }
      conversacion = await page.evaluate(() => ({
        habladas: globalThis.__oga.habladas(),
        descartadas: globalThis.__oga.descartadas(),
        maquina: globalThis.__oga.maquina?.() ?? [],
        registro: globalThis.__oga.inicio?.()?.registro ?? null,
      }));
      sello = await page.evaluate(() => {
        const s = document.querySelector("#inicio .inicio__sello svg");
        const r = s?.getBoundingClientRect();
        const b = document.querySelector("#inicio [data-inicio='seguir']");
        return {
          campo: s?.getAttribute("data-campo") ?? null,
          visible: !!r && r.width > 40 && r.top >= 0 && r.bottom <= innerHeight,
          boton: b && !b.hidden ? b.textContent.trim() : null,
        };
      });
      await foto(page, "fin");
      break;
    }
    await pausa(250);
  }

  const i = ultimo?.inicio;
  const e = i?.estado;
  const t = i?.tripulacion;
  comprobar(
    "la tripulación vuela del puesto al puesto, sin saltarse nada",
    tramos.map((x) => x.tramo).join(" ") ===
      "puerta arrancando rodando esperando entrando carrera subida crucero bajada final recogida frenando al-puesto aparcado apagado",
    tramos.map((x) => `${x.tramo}@${x.t.toFixed(0)}s`).join(" "),
  );
  comprobar(
    "cada cosa en su momento, en el orden de un vuelo de verdad",
    !!e && MOMENTOS.every((m) => e.dichos.includes(m)) && e.dichos.join() === MOMENTOS.filter((m) => e.dichos.includes(m)).join() && e.saltados.length === 0,
    e ? `${e.dichos.join(" ")}${e.saltados.length ? ` · saltados: ${e.saltados.join(" ")}` : ""}` : "no llegó",
  );
  comprobar("no se arranca antes de armar los toboganes", arrancoCon === true, String(arrancoCon));
  comprobar(
    "no se entra en la pista antes de «tripulación, sentados para el despegue»",
    entroEnPista === true,
    String(entroEnPista),
  );
  comprobar("se despega por el eje", masDeLadoEnLaCarrera > 0 && masDeLadoEnLaCarrera < 5, `${masDeLadoEnLaCarrera.toFixed(1)} m de lado como mucho`);
  comprobar(
    "se toca suave, y sin percance",
    !!t && t.caidaAlTocar !== null && t.caidaAlTocar < 1.5 && !percance,
    t ? `${t.caidaAlTocar?.toFixed(2)} m/s · percance: ${percance ?? "ninguno"}` : "no se tocó",
  );
  const registro = conversacion?.registro ?? [];
  let pisadas = 0;
  for (let k = 1; k < registro.length; k++) if (registro[k].desde < (registro[k - 1].hasta ?? Infinity) - 1e-6) pisadas++;
  comprobar(
    "nunca dos frases a la vez",
    registro.length > 30 && pisadas === 0 && registro.every((d) => !d.cortada),
    `${registro.length} frases · ${pisadas} pisadas · ${registro.filter((d) => d.cortada).length} cortadas`,
  );
  /*
   * **Y todo lo que dice la escena se oye**: con las tomas en el pack, cada
   * frase acaba sonando entera. Una que acaba sin sonar es una que se tiró por
   * el camino —la boca reservada, una receta que no se reconoce— o que la
   * escena dio por perdida.
   */
  const sinOir = registro.filter((d) => d.como !== "sono");
  comprobar(
    "y todo lo que dice la escena se oye entero, de su toma",
    registro.length > 30 && sinOir.length === 0,
    sinOir.length
      ? `${sinOir.length} sin oír: ${sinOir
          .slice(0, 5)
          .map((d) => {
            // Y por qué, si la boca la tiró: lo apunta en `descartadas`.
            const tirada = (conversacion?.descartadas ?? []).find((x) => String(x).replace(/^\S+s /, "").startsWith(d.clave));
            return `${d.clave} (${d.como}${tirada ? `: ${String(tirada).replace(/^.*: /, "")}` : ""})`;
          })
          .join(" · ")}`
      : `${registro.length} frases, todas oídas`,
  );
  const ajenas = (conversacion?.habladas ?? []).filter((l) => !DE_LA_ESCENA.test(l.replace(/^\S+s /, "")));
  const maquina = conversacion?.maquina ?? [];
  const tiradas = (conversacion?.descartadas ?? []).filter((d) => !DE_LA_ESCENA.test(String(d).replace(/^\S+s /, "")));
  comprobar(
    "no habla nadie más: ni la radio, ni las cajas de la cabina de mando, ni la instructora",
    !!conversacion && ajenas.length === 0 && maquina.length === 0,
    !conversacion
      ? "no llegó al final"
      : `${ajenas.length ? `ajenas: ${ajenas.slice(0, 3).join(" · ")} · ` : ""}${maquina.length ? `máquina: ${maquina.slice(0, 3).join(" · ")} · ` : ""}${(conversacion.habladas ?? []).length} sonadas · ${tiradas.length} de otros tiradas por la boca de la escena`,
  );
  const ventanillas = registro.filter((d) => d.clave === "ventanilla").length;
  const historias = registro.filter((d) => d.clave === "ventanilla.historia").length;
  const deAra = registro.filter((d) => /^inicio\.ara\.pasaje\.(teide|garajonay|orotava|loVeo)$/.test(d.clave)).map((d) => d.clave.split(".").pop());
  comprobar(
    "lo de la ventanilla se dice —el Teide, el que más—, con su historia, y Ara contesta lo que ve por su lado",
    ventanillas >= 2 && historias >= 1 && !!e?.senalados?.includes("teide") && deAra.includes("teide"),
    `${ventanillas} sitios · ${historias} historias · ${e?.senalados?.join(", ")} · Ara: ${deAra.join(", ")}`,
  );
  comprobar(
    "se dibuja qué mirar: el ala, el cinturón, el motor, las nubes y la ventanilla",
    ["ala", "cinturon", "motor", "nubes", "ventanilla"].every((m) => miradas.has(m)),
    [...miradas].join(", "),
  );
  comprobar(
    "habla quien tiene que hablar: Ara, Jazlyn por la megafonía y la tripulación",
    ["ara", "mama", "tripulacion"].every((c) => caras.has(c)),
    [...caras].join(", "),
  );
  const cuaderno = i?.cuaderno;
  comprobar(
    "el cuaderno no apunta nada de pilotaje, y sí el sello de La Palma, de visita",
    !!cuaderno &&
      !!cuadernoAntes &&
      cuaderno.aterrizajes === cuadernoAntes.aterrizajes &&
      cuaderno.despegues === cuadernoAntes.despegues &&
      cuaderno.segundos === cuadernoAntes.segundos &&
      cuaderno.aerodromos.length === cuadernoAntes.aerodromos.length &&
      cuaderno.deViaje.includes("GCLA"),
    cuaderno
      ? `aterrizajes ${cuadernoAntes?.aterrizajes}→${cuaderno.aterrizajes} · despegues ${cuadernoAntes?.despegues}→${cuaderno.despegues} · segundos ${cuadernoAntes?.segundos}→${cuaderno.segundos} · de visita: ${cuaderno.deViaje.join(",")}`
      : "no llegó",
  );
  comprobar(
    "al final, el sello de La Palma a la vista, y el botón de volver al hangar",
    sello?.campo === "la-palma" && sello.visible && !!sello.boton,
    sello ? `${sello.campo} · visible: ${sello.visible} · «${sello.boton}»` : "no llegó al final",
  );
  if (sello?.boton) {
    await page.click("#inicio [data-inicio='seguir']");
    const fuera = await page
      .waitForFunction(() => !location.search.includes("inicio"), null, { timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    comprobar("y el botón vuelve al hangar", fuera, await page.evaluate(() => location.href).catch(() => "?"));
  }
  if (e) console.log(`  la escena duró ${e.segundos.toFixed(0)} s de reloj del juego`);
  comprobar("sin errores", errores.length === 0, errores[0] ?? "limpio");
  await ctx.close();
}

/**
 * **Y desde el hangar**: su ficha, la tercera, al lado de las dos de Jazlyn,
 * abre la escena de pasaje. Como en el banco de la segunda escena, se esconde
 * el pack de Ara para que un piloto nuevo vaya al hangar y no a la primera
 * experiencia.
 */
async function desdeElHangar() {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-PY" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.route("**/data/voces/ara/manifiesto.json", (r) => r.fulfill({ status: 404, body: "" }));
  try {
    await page.goto(`${BASE}/?hora=12`);
    await page.click("[data-nuevo]", { timeout: 120_000 });
    await page.click("[data-crear]");
    await page.waitForSelector('[data-pantalla="que"]', { timeout: 120_000 });
    await page.click('[data-pantalla="que"]');
    await page.waitForSelector("[data-inicio-modo]", { timeout: 20_000 });
    const fichas = await page.evaluate(() =>
      [...document.querySelectorAll("[data-inicio-modo]")].map((b) => ({
        cual: b.getAttribute("data-inicio-modo"),
        nombre: b.querySelector(".ficha__nombre")?.textContent?.trim(),
        alto: Math.round(b.getBoundingClientRect().height),
      })),
    );
    comprobar(
      "hangar: la ficha de viajar con Jazlyn, al lado de las otras dos",
      fichas.length === 3 &&
        fichas.map((f) => f.cual).join() === "despegar,aterrizar,pasaje" &&
        fichas.every((f) => f.alto >= 44),
      fichas.map((f) => `${f.cual}: «${f.nombre}» ${f.alto} px`).join(" · "),
    );
    // La ficha, a la vista: el foto se hace sobre el hangar, que no lleva lienzo del vuelo.
    if (FOTOS) await page.screenshot({ path: `${FOTOS}/inicio-3-hangar.png` });
    await page.click('[data-inicio-modo="pasaje"]');
    const escena = await page
      .waitForFunction(() => globalThis.__oga?.inicio?.()?.estado && globalThis.__oga.inicio().escena, null, {
        timeout: 180_000,
      })
      .then((h) => h.jsonValue())
      .catch(() => null);
    const dentro = await page.evaluate(() => ({
      enTierra: globalThis.__oga?.estado?.().onGround ?? null,
      avion: globalThis.__oga?.avion?.().id ?? null,
      campo: globalThis.__oga?.campoDeAhora?.() ?? null,
    }));
    comprobar(
      "hangar: su ficha abre la escena de pasaje, en tierra y con el JAZ 90",
      escena === "pasaje" && dentro.enTierra === true && dentro.avion === "jaz-90",
      `${escena ?? "nada"} · en tierra: ${dentro.enTierra} · ${dentro.avion ?? "?"} · ${dentro.campo ?? ""}${errores.length ? ` · ${errores[0]}` : ""}`,
    );
  } catch (e) {
    comprobar("hangar: su ficha abre la escena de pasaje", false, String(e).slice(0, 140));
  } finally {
    await ctx.close();
  }
}

/**
 * **Y en un teléfono apaisado, con el dedo**: la tarjeta entera en la pantalla,
 * sin los mandos de pilotar, y la ventanilla debajo.
 */
async function enElTelefono() {
  const ctx = await navegador.newContext({ ...devices["Pixel 7 landscape"], hasTouch: true, isMobile: true, locale: "es-PY" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  try {
    await page.goto(`${BASE}/?inicio=3`);
    await page.waitForFunction(() => !!globalThis.__oga?.inicio?.()?.estado, null, { timeout: 180_000 });
    // Hasta que la escena hable y dibuje qué mirar.
    await page.waitForFunction(() => !!document.querySelector("#inicio [data-mirar]"), null, { timeout: 60_000 }).catch(() => {});
    const v = await leer(page);
    const caja = await page.evaluate(() => {
      const r = document.querySelector("#inicio .inicio__tarjeta")?.getBoundingClientRect();
      return r ? { l: r.left, t: r.top, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight } : null;
    });
    comprobar(
      "teléfono apaisado: la tarjeta cabe entera, sin mandos de pilotar",
      !!caja && caja.l >= 0 && caja.t >= 0 && caja.r <= caja.w && caja.b <= caja.h * 0.6 && !v.mandos && !v.relojes,
      caja
        ? `tarjeta ${Math.round(caja.l)},${Math.round(caja.t)}–${Math.round(caja.r)},${Math.round(caja.b)} en ${caja.w}×${caja.h} · mandos ${v.mandos} · relojes ${v.relojes}${errores.length ? ` · ${errores[0]}` : ""}`
        : "sin tarjeta",
    );
    await foto(page, "telefono");
  } catch (e) {
    comprobar("teléfono apaisado: la escena se abre", false, String(e).slice(0, 140));
  } finally {
    await ctx.close();
  }
}

try {
  if (!process.env.OGA_SIN_HANGAR) await desdeElHangar();
  await enElTelefono();
  await elVuelo();
} finally {
  await navegador.close();
  await server.close();
}

const bien = resultados.filter((r) => r.ok).length;
console.log("");
for (const r of resultados) console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}${r.detalle ? `  —  ${r.detalle}` : ""}`);
console.log(`\n  ${bien} de ${resultados.length}\n`);
process.exit(bien === resultados.length ? 0 : 1);

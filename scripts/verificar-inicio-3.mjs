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
 * - **Que se ve por fuera lo que se cuenta** (18-10-2026): el rodaje, el
 *   despegue desde la orilla de la pista, el giro, una vuelta alrededor, el
 *   ala y la toma, cada corte con su fundido y **ninguno a media frase**; y
 *   Ara con la cara contra el cristal para ver el motor y el mar.
 * - **Que la tripulación da la demostración de seguridad** entera y en su
 *   orden, antes de entrar en la pista, y que **las nubes se explican**: la
 *   comandante para todos y la tripulante a Ara, con su dibujo.
 * - **Que sale la ventanita** con los dibujos de lo que se explica, y con
 *   **las ilustraciones** de lo que pasa (punto 278): el embarque, la cabina
 *   llena, la tripulante, Ara contra el cristal y la comandante; y que las
 *   que llevan cielo por la ventanilla no salen con el avión en tierra.
 * - **Que no hay ratos largos callados**: medido con el reloj de la escena,
 *   que es el del vuelo sin acelerar.
 * - **Que desde el asiento de Ara se ven el ala y el motor**, contado con
 *   rayos por el cristal en el modelo cargado.
 * - **Que el cuaderno no apunta nada de pilotaje** y sí el sello de La Palma,
 *   de visita, y que el botón del final vuelve al hangar.
 * - **Y que en un teléfono apaisado**, con el dedo, la tarjeta cabe y no hay
 *   mandos de pilotar.
 * - **El kit de viaje** (punto 275): que la tripulante lo trae en un tramo
 *   tranquilo de la bajada, que en el vuelo se abre y se juega el camino, que
 *   se pausa con la megafonía de la aproximación y se recoge antes de
 *   aterrizar; y en el teléfono, la tablet del aula y el portátil, que cabe
 *   sin tapar la tarjeta ni los botones y **se juegan los dos juegos enteros
 *   con el dedo** —arrastrando las piezas— o con el ratón.
 * - **El hilo musical**: que suena en el embarque por el altavoz del techo,
 *   en el bus de la música, que se calla con la primera megafonía y no vuelve
 *   en vuelo, y que suena otra vez en el puesto de llegada.
 * - **Que lo que se nombra del paisaje está a la vista cuando se nombra**
 *   (18-10-2026, puntos 281 y 286): cada sitio que nombra la escena —la isla,
 *   la costa, el mar, lo señalado por la ventanilla— se mide con lo que se
 *   pinta en ese momento: dentro de la imagen, por el cristal si se mira por
 *   la ventanilla, sin el ojo metido en una nube y sin nube densa por medio,
 *   contada a pasos con la densidad del dibujo. Con la captura de ese momento.
 * - **Que la foto de una historia no sale sin su voz** (punto 287), que dentro
 *   de la nube el meneo se cuenta en el momento (280), que al salir por debajo
 *   de las nubes se cuenta el techo (295), y los dos planos nuevos: **el tren
 *   desde abajo** (298) y **el señalero** (301).
 * - **Que Ara se duerme un rato** (punto 304): arriba y sin nada que contar,
 *   bosteza, la pantalla se funde a Ara durmiendo y después soñando, con el
 *   mapa de la ruta en la ventanita —las islas con su costa de verdad (292) y
 *   el avión avanzando—; el vuelo pasa deprisa y **de verdad** —el avión sigue
 *   su ruta, no salta—, y Ara se despierta antes de lo que hay que oír y antes
 *   de bajar, sin perder nada de seguridad. Lo que pasa durmiendo no cuenta
 *   como silencio. Con capturas del fundido, del sueño con el mapa a mitad de
 *   la siesta y del despertar.
 *
 * Sin voces del sistema —el banco no las tiene, como el Brave de Enrique—,
 * con las tomas del pack: cada frase dura lo que dura su grabación, y **todo
 * lo que dice la escena tiene que haberse oído**. Con el reloj del juego
 * acelerado —`OGA_VECES`, doce por defecto—, que el vuelo entero son unos
 * treinta y cinco minutos; mientras habla la escena el juego va a su ritmo,
 * que lo que se oye no se acelera (ver `frame` en `game.ts`), así que el banco
 * tarda unos diez minutos.
 *
 * **Las frases nuevas sin grabar** —las del 18-10-2026, hasta que se graben—
 * no suenan: esperan el rato de leerlas, y el banco las cuenta aparte. Lo que
 * tiene toma en el pack tiene que sonar entero.
 *
 * Uso: `node scripts/verificar-inicio-3.mjs`
 *   `OGA_GPU=1` con la tarjeta de verdad; `OGA_FOTOS=carpeta` saca capturas
 *   de cada momento nuevo —Ara contra el cristal, el cinturón, el rodaje, el
 *   despegue, el giro, la vuelta, el ala, la toma, la ventanita y sus
 *   ilustraciones—, con el
 *   renderer en el nombre; `OGA_SIN_HANGAR=1` se salta la ficha del hangar;
 *   `OGA_TOPE=segundos` cambia el tope de pared; `OGA_VOLCADO=fichero` deja
 *   lo dicho y los tramos en un JSON; `OGA_SIN_NUBES=1` vuela sin el mar de
 *   nubes, para ver nombrado con su toma lo que con él queda tapado: lo que
 *   se espera de un vuelo con nubes no vale ahí;
 *   y `OGA_SIN_JUGAR=1` no abre el kit en vuelo, para que las capturas de lo
 *   que se nombra bajando salgan sin él delante.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  "demostracion",
  "revision",
  "espera",
  "despegue",
  "carrera",
  "volando",
  "nubes",
  "nubesRespuesta",
  "arriba",
  "servicio",
  "tcpNubes",
  "bajada",
  "oidos",
  "kit",
  "techo",
  "isla",
  "aproximacion",
  "tcpAterrizaje",
  "flaps",
  "aterrizando",
  "toma",
  "llegada",
  "puesto",
];

/** Lo que tiene toma en el pack: lo demás, hasta grabarlo, se lee. */
const GRABADAS = new Set(
  ["ara", "comandante", "tripulacion-canarias"].flatMap((v) =>
    Object.keys(JSON.parse(readFileSync(`data/voces/${v}/manifiesto.json`, "utf8")).piezas ?? {}),
  ),
);

/**
 * **El rato más largo callado en el aire**, s de escena. En las pruebas de
 * unidad, con lo que dura cada frase, sale de 65 s; aquí las frases nuevas
 * sin grabar duran solo el rato de leerlas —seis segundos como mucho—, y los
 * huecos crecen un poco.
 */
const CALLADO_COMO_MUCHO = 85;

/** Lo que calla la escena en cada corte de cámara, s de escena. Ver `CORTE_DE_PLANO`. */
const CORTE = 1.1;

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
  if (process.env.OGA_SIN_NUBES) await page.evaluate(() => globalThis.__oga.ponerNubes(null));
  const veces = await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
  console.log(`  reloj del juego ×${veces}`);

  const tramos = [];
  const miradas = new Set();
  /** Los planos que de verdad se vieron, y lo más que tapó el velo. Ver `camaraDeLaEscena`. */
  const vistos = new Set();
  let veloMaximo = 0;
  const ventanitas = new Set();
  /** Las ilustraciones con cielo por la ventanilla que salieron con el avión en tierra: ninguna. */
  const ilustradasEnTierra = new Set();
  let asientoDeAra = null;
  const caras = new Set();
  const fotos = new Set();
  let entroEnPista = null;
  let arrancoCon = null;
  let masDeLadoEnLaCarrera = 0;
  let percance = null;
  let sello = null;
  let conversacion = null;
  let ultimo = null;
  // El hilo musical: lo que suena en cada rato. Ver `audio/hilo-musical.ts`.
  const musica = { embarque: null, enVuelo: [], llegada: null, callada: null };
  // El kit de viaje: cuándo llega, qué se juega y cómo acaba. Ver `flight/kit-de-viaje.ts`.
  const kit = { dadoEn: null, tramo: null, jugado: false, pausadoEnLaAproximacion: false, abiertoEnLaFinal: false, botonEnLaFinal: false, recogido: false };
  // Lo nombrado del paisaje, medido con lo que se pinta cuando se nombra. Ver `paisajeParaBanco`.
  const nombrados = [];
  let vistosNombrados = 0;
  // Las fotos de las historias que salieron sin su voz sonando: ninguna. Ver el punto 287.
  const fotosMudas = new Set();
  let fotosConVoz = 0;
  // Dentro de la nube, el meneo: si empezó con el avión metido en ella.
  let meneoEnLaNube = null;
  // La siesta de Ara, mirada de cerca en cuanto bosteza. Ver `mirarLaSiesta`.
  let siesta = null;
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
    if (i.planoVisto) vistos.add(i.planoVisto);
    veloMaximo = Math.max(veloMaximo, Number(i.velo) || 0);
    if (i.ventanita?.sitio) ventanitas.add(i.ventanita.sitio);
    if (i.asientoDeAra) asientoDeAra = i.asientoDeAra;
    if (v.cara) caras.add(v.cara.replace(/^.*inicio__cara--/, ""));
    // ── Lo que se mira mientras pasa ──
    // Oída: que sonó o se esperó el rato de leerla, no que se pidió. Ver `Conversacion.oida`.
    const oida = (clave) => (i.registro ?? []).some((d) => d.clave === clave && (d.como === "sono" || d.como === "muda"));
    if (arrancoCon === null && v.motor) arrancoCon = oida("comandante.crosscheck");
    if (entroEnPista === null && v.enPista && v.fase !== "back-taxi" && tramo !== "frenando")
      entroEnPista = oida("comandante.despegue");
    if (tramo === "carrera" && v.enTierra && i.lecturaDeLinea)
      masDeLadoEnLaCarrera = Math.max(masDeLadoEnLaCarrera, Math.abs(i.lecturaDeLinea.pista.lado));
    // ── El hilo musical ──
    const m = i.musica?.audio;
    const cinturon = (i.registro ?? []).find((d) => d.clave === "inicio.tripulacion.pasaje.cinturon");
    if (m && tramo === "puerta" && !cinturon && m.suena && musica.embarque === null) musica.embarque = m;
    if (m && cinturon && e.segundos > cinturon.desde + 1 && tramo === "puerta" && musica.callada === null) musica.callada = !m.suena;
    if (m && m.suena && tramo && !["puerta", "aparcado", "apagado"].includes(tramo)) musica.enVuelo.push(`${m.suena}@${tramo}`);
    if (m && m.suena && (tramo === "apagado" || e.momento === "fin")) musica.llegada ??= m;
    // ── El kit de viaje ──
    if (e.kit?.dado && kit.dadoEn === null) {
      kit.dadoEn = e.segundos;
      kit.tramo = tramo;
    }
    if (e.kit?.dado && !kit.jugado && i.kit?.boton && !process.env.OGA_SIN_JUGAR) {
      kit.jugado = true;
      await jugarElCaminoEnElVuelo(page);
    }
    if (e.kit?.abierto && e.kit.pausado && (i.registro ?? []).some((d) => d.clave === "comandante.aproximacion" && d.hasta === null))
      kit.pausadoEnLaAproximacion = true;
    if (tramo === "final" || tramo === "recogida") {
      kit.abiertoEnLaFinal ||= !!e.kit?.abierto;
      kit.botonEnLaFinal ||= !!i.kit?.boton;
    }
    kit.recogido = !!e.kit?.recogido;
    // ── Lo nombrado del paisaje, a la vista ──
    const nuevos = (e.nombrados ?? []).slice(vistosNombrados);
    for (const n of nuevos) {
      vistosNombrados++;
      // Pasado el corte, con el plano ya puesto y sin velo: lo que se ve mientras se dice.
      await page
        .waitForFunction(
          (desde) => {
            const j = globalThis.__oga.inicio();
            return j.estado.segundos > desde + 1.6 && (Number(j.velo) || 0) < 0.02;
          },
          n.desde,
          { timeout: 8000 },
        )
        .catch(() => {});
      const medido = await page.evaluate((sitio) => {
        const j = globalThis.__oga.inicio();
        return { vista: globalThis.__oga.paisajeALaVista(sitio), plano: j.planoVisto, linea: j.estado.linea?.clave ?? null };
      }, n.sitio);
      const v = medido.vista;
      const enLaImagen = !!v && v.delante && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1;
      const porElCristal = !v || !medido.plano || medido.plano.startsWith("fuera-") || v.porElCristal !== false;
      // Y el mar de nubes, al revés: lo que se nombra es la nube, que tiene que estar por medio.
      const nube = n.sitio === "nubes-abajo" ? !!v && v.nubeEnMedio >= 100 : !!v && v.nubeEnMedio < 150;
      const ok = enLaImagen && porElCristal && !!v && v.ojoEnNube < 0.35 && nube;
      const nombre = `nombrado-${nombrados.length + 1}-${n.sitio.replace(":", "-")}`;
      nombrados.push({ ...n, plano: medido.plano, medido: v, ok, nombre });
      if (FOTOS) await foto(page, nombre);
    }
    // ── La foto de una historia, solo con su voz ──
    const enLaVentanita = i.ventanita?.sitio ?? "";
    if (enLaVentanita && !enLaVentanita.includes(":")) {
      const ahora = (i.registro ?? []).at(-1);
      /*
       * La foto se queda un poco después de su voz, hasta la frase siguiente
       * —la de Ara—: eso no es una foto muda. Lo mudo es la foto de una
       * historia que no llegó a sonar, o la que sigue puesta con otra frase.
       */
      const suHistoria = ahora?.clave === "ventanilla.historia" && (ahora.hasta === null || ahora.como === "sono");
      if (suHistoria) fotosConVoz++;
      else
        fotosMudas.add(
          `${enLaVentanita} con ${ahora?.clave ?? "nada"}${ahora?.hasta != null ? ` acabada hace ${(e.segundos - ahora.hasta).toFixed(1)} s (${ahora.como})` : ""}`,
        );
    }
    // ── La siesta de Ara: en cuanto bosteza, se mira entera ──
    if (siesta === null && (e.durmiendo || (e.linea?.clave === "inicio.ara.pasaje.dormirse" && e.hablando)))
      siesta = await mirarLaSiesta(page);
    // ── El meneo, dentro de la nube ──
    if (meneoEnLaNube === null && (i.registro ?? []).some((d) => d.clave === "inicio.ara.pasaje.meneo"))
      meneoEnLaNube = await page.evaluate(() => globalThis.__oga.capaDeNubes?.()?.enLaNube ?? 0);
    // ── Las fotos ──
    if (FOTOS) {
      const en = (n, si) => {
        if (si && !fotos.has(n)) {
          fotos.add(n);
          return true;
        }
        return false;
      };
      // Lo nuevo: cada plano cuando ya se ve —sin velo—, la ventanita y Ara contra el cristal.
      const sinVelo = (Number(i.velo) || 0) < 0.02;
      if (en("asomado-motor", i.planoVisto === "asomado-motor" && e.segundos - e.planoDesde > 2.5)) await foto(page, "asomado-motor");
      if (en("cinturon", i.ventanita?.sitio === "dibujo:cinturon" && i.ventanita?.donde)) await pausa(800).then(() => foto(page, "cinturon"));
      if (en("rodando", sinVelo && i.planoVisto === "fuera-rodando")) await foto(page, "fuera-rodando");
      if (en("mascara", i.ventanita?.sitio === "dibujo:mascara" && i.ventanita?.donde)) await pausa(800).then(() => foto(page, "ventanita-mascara"));
      if (en("despegue", sinVelo && i.planoVisto === "fuera-despegue" && v.velocidad > 50)) await foto(page, "fuera-despegue");
      if (en("giro", sinVelo && i.planoVisto === "fuera-giro" && e.segundos - e.planoDesde > 4)) await foto(page, "fuera-giro");
      if (en("nubes", e.dichos.includes("nubes"))) await foto(page, "nubes");
      if (en("ala", sinVelo && i.planoVisto === "fuera-ala")) await foto(page, "fuera-ala");
      if (en("vuelta", sinVelo && i.planoVisto === "fuera-vuelta" && e.segundos - e.planoDesde > 10)) await foto(page, "fuera-vuelta");
      if (en("nube-dibujo", i.ventanita?.sitio === "dibujo:nube" && i.ventanita?.donde)) await pausa(800).then(() => foto(page, "ventanita-nube"));
      if (en("asomado-abajo", i.planoVisto === "asomado-abajo" && e.segundos - e.planoDesde > 2.5)) await foto(page, "asomado-abajo");
      if (en("motor-dibujo", i.ventanita?.sitio === "dibujo:motor" && i.ventanita?.donde)) await pausa(800).then(() => foto(page, "ventanita-motor"));
      if (en("ventanilla", e.senalados.length > 0 && e.mira === "ventanilla" && !v.enTierra)) await foto(page, "ventanilla");
      if (en("pista", sinVelo && i.planoVisto === "fuera-pista" && !v.enTierra)) await foto(page, "fuera-pista");
      if (en("toma", tramo === "frenando")) await foto(page, "toma");
      // Lo del 18-10 por la tarde: el meneo, debajo de las nubes, el tren desde abajo y el señalero.
      // Lo que se dice ahora, suene o se lea mientras espera su toma.
      const suena = (clave) => e.linea?.clave === clave && e.hablando;
      if (en("meneo", suena("inicio.ara.pasaje.meneo"))) await foto(page, "meneo-en-la-nube");
      if (en("bajo-las-nubes", suena("inicio.ara.pasaje.bajoLasNubes"))) await foto(page, "bajo-las-nubes");
      if (en("tren", sinVelo && i.planoVisto === "fuera-tren" && e.segundos - e.planoDesde > 3)) await foto(page, "fuera-tren");
      if (en("tren-trabado", sinVelo && i.planoVisto === "fuera-tren" && e.segundos - e.planoDesde > 9)) await foto(page, "fuera-tren-trabado");
      if (en("senalero", sinVelo && i.planoVisto === "fuera-senalero" && e.segundos - e.planoDesde > 4)) await foto(page, "fuera-senalero");
      if (en("senalero-alto", sinVelo && i.planoVisto === "fuera-senalero" && (tramo === "aparcado" || v.velocidad < 0.5) && e.segundos - e.planoDesde > 6))
        await foto(page, "fuera-senalero-alto");
      // Y cada ilustración, la primera vez que queda puesta.
      const ilustrada = i.ventanita?.donde ? /^ilustracion:(.+)$/.exec(i.ventanita.sitio ?? "")?.[1] : null;
      if (ilustrada && en(`ilustracion-${ilustrada}`, true)) await pausa(800).then(() => foto(page, `ilustracion-${ilustrada}`));
    }
    // ── Las ilustraciones con cielo por la ventanilla, nunca en tierra ──
    if (/^ilustracion:pasaje-(tripulante|ara-ventanilla|comandante)$/.test(i.ventanita?.sitio ?? "") && v.enTierra)
      ilustradasEnTierra.add(`${i.ventanita.sitio} en ${tramo}`);
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
  if (process.env.OGA_VOLCADO)
    writeFileSync(
      process.env.OGA_VOLCADO,
      JSON.stringify(
        {
          tramos,
          registro: conversacion?.registro ?? i?.registro ?? null,
          // Y lo que tiró la boca, con su porqué: lo que no sonó se mira aquí.
          descartadas: conversacion?.descartadas ?? null,
          nombrados,
          estado: e ?? null,
        },
        null,
        1,
      ),
    );
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
  // Lo grabado tiene que sonar; lo que aún no tiene toma, se lee y se cuenta aparte.
  const porGrabar = registro.filter((d) => d.clave.startsWith("inicio.") && !GRABADAS.has(d.clave));
  const sinOir = registro.filter((d) => d.como !== "sono" && !porGrabar.includes(d));
  console.log(`  ${porGrabar.length} frases dichas que esperan su toma: se leen`);
  comprobar(
    "y todo lo grabado que dice la escena se oye entero, de su toma; lo que espera su toma, se lee",
    registro.length > 30 && sinOir.length === 0 && porGrabar.every((d) => d.como === "muda" || d.como === "sono"),
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
    "habla quien tiene que hablar: Ara, Jazlyn por la megafonía, la tripulación por el altavoz y la tripulante en persona",
    ["ara", "mama", "tripulacion", "tripulante"].every((c) => caras.has(c)),
    [...caras].join(", "),
  );
  // ── Lo del 18-10-2026: los planos, la demostración, las nubes, la ventanita y los silencios ──
  const FUERA = ["fuera-rodando", "fuera-despegue", "fuera-giro", "fuera-vuelta", "fuera-ala", "fuera-pista"];
  comprobar(
    "se ve el avión por fuera en lo que se cuenta —rodando, despegando, girando, alrededor, el ala, tocando—, con su fundido",
    FUERA.every((p) => vistos.has(p)) && veloMaximo > 0.9 && vistos.has("ventanilla"),
    `vistos: ${[...vistos].join(", ")} · velo hasta ${veloMaximo.toFixed(2)}`,
  );
  const planos = e?.planos ?? [];
  let aMedia = 0;
  for (let k = 1; k < planos.length; k++) {
    const corte = planos[k - 1].plano.startsWith("fuera-") || planos[k].plano.startsWith("fuera-");
    if (!corte) continue;
    const t0 = planos[k].desde;
    if (registro.some((d) => d.desde < t0 + CORTE - 1e-3 && (d.hasta ?? Infinity) > t0 + 1e-3)) aMedia++;
  }
  comprobar(
    "y ningún corte de cámara a media frase",
    planos.length > 10 && aMedia === 0,
    `${planos.length - 1} cambios de plano · ${aMedia} a media frase`,
  );
  comprobar(
    "Ara se pega al cristal: para el motor y para mirar abajo",
    planos.some((p) => p.plano === "asomado-motor") && planos.some((p) => p.plano === "asomado-abajo"),
    planos.filter((p) => p.plano.startsWith("asomado")).map((p) => `${p.plano}@${p.desde.toFixed(0)}`).join(" "),
  );
  comprobar(
    "desde el asiento de Ara se ven el ala y el motor, contado con rayos por el cristal",
    !!asientoDeAra && asientoDeAra.motor > 0.03 && asientoDeAra.ala > 0.03,
    asientoDeAra
      ? `ventanilla en z ${asientoDeAra.z.toFixed(2)} m · motor ${(asientoDeAra.motor * 100).toFixed(1)} % · ala ${(asientoDeAra.ala * 100).toFixed(1)} %`
      : "sin asiento",
  );
  const claves = registro.map((d) => d.clave);
  const demo = ["intro", "cinturon", "salidas", "mascaras", "chaleco", "tarjeta", "aparatos"].map((x) => claves.indexOf(`inicio.tripulacion.pasaje.demo.${x}`));
  comprobar(
    "la demostración de seguridad, entera, en su orden y antes de «sentados para el despegue»",
    demo.every((x) => x >= 0) && demo.every((x, k) => k === 0 || x > demo[k - 1]) && Math.max(...demo) < claves.indexOf("comandante.despegue"),
    demo.join(" "),
  );
  comprobar(
    "las nubes, explicadas: la comandante para todos y la tripulante a Ara, con su dibujo",
    ["inicio.mama.pasaje.nubes", "inicio.tripulacion.pasaje.cerca.nubes1", "inicio.tripulacion.pasaje.cerca.nubes2", "inicio.tripulacion.pasaje.cerca.nubes3"].every((c) => claves.includes(c)) &&
      ventanitas.has("dibujo:nube"),
    `${claves.filter((c) => /nubes/.test(c)).join(", ")} · ventanita: ${ventanitas.has("dibujo:nube")}`,
  );
  comprobar(
    "la ventanita, con los dibujos de lo que se explica",
    ["dibujo:cinturon", "dibujo:mascara", "dibujo:chaleco", "dibujo:nube", "dibujo:motor"].every((d) => ventanitas.has(d)),
    [...ventanitas].join(", "),
  );
  const ilustraciones = ["embarque", "lleno", "tripulante", "ara-ventanilla", "comandante"].map((c) => `ilustracion:pasaje-${c}`);
  comprobar(
    "y con las ilustraciones de lo que pasa, y las del cielo nunca en tierra",
    ilustraciones.every((c) => ventanitas.has(c)) && ilustradasEnTierra.size === 0,
    `faltan: ${ilustraciones.filter((c) => !ventanitas.has(c)).join(", ") || "ninguna"} · en tierra: ${[...ilustradasEnTierra].join(", ") || "ninguna"}`,
  );
  // Los silencios, en el aire, con el reloj de la escena.
  const tramoEn = (s) => [...tramos].reverse().find((x) => x.t <= s)?.tramo ?? "puerta";
  /*
   * **Y lo que Ara pasa durmiendo no es silencio** (punto 304): un rato callado
   * es un rato sin dormir y sin nada; durmiendo, se ve a Ara soñar y el mapa
   * con el vuelo pasando deprisa. Se quita del hueco lo que se durmió, y lo
   * demás se mide igual que siempre: un silencio de verdad se sigue viendo.
   */
  const siestas = (e?.siestas ?? []).map((x) => ({ desde: x.desde, hasta: x.hasta ?? Infinity }));
  const durmiendoEntre = (a, b) => siestas.reduce((t, x) => t + Math.max(0, Math.min(b, x.hasta) - Math.max(a, x.desde)), 0);
  const callados = [];
  let masLargo = 0;
  for (let k = 1; k < registro.length; k++) {
    const desde = registro[k - 1].hasta ?? registro[k - 1].desde;
    const largo = registro[k].desde - desde - durmiendoEntre(desde, registro[k].desde);
    const tr = tramoEn(desde);
    if (!["subida", "crucero", "bajada"].includes(tr)) continue;
    masLargo = Math.max(masLargo, largo);
    if (largo > CALLADO_COMO_MUCHO) callados.push(`${largo.toFixed(0)} s desde ${desde.toFixed(0)} (${tr})`);
  }
  comprobar(
    `ningún rato largo callado en el aire (más de ${CALLADO_COMO_MUCHO} s)`,
    callados.length === 0 && registro.length > 60,
    callados.length ? callados.join(" · ") : `lo más largo: ${masLargo.toFixed(0)} s · ${(e?.charlas ?? []).length} charlas: ${(e?.charlas ?? []).join(" ")}`,
  );
  // ── La siesta de Ara (punto 304), y el mapa de la ruta (292) ──
  const s0 = e?.siestas?.[0] ?? null;
  const bajadaEn = tramos.find((x) => x.tramo === "bajada")?.t ?? Infinity;
  const oidaEn = (clave) => registro.find((d) => d.clave === clave && (d.como === "sono" || d.como === "muda"));
  const bostezo = oidaEn("inicio.ara.pasaje.dormirse");
  const alDespertar = oidaEn("inicio.ara.pasaje.despertarse");
  // Lo siguiente que había que oír: el «ya estamos arriba», o empezar a bajar.
  const loSiguiente = oidaEn(s0?.paraBajar ? "comandante.descenso" : "comandante.crucero");
  comprobar(
    "Ara se duerme una vez, arriba, y se despierta antes de lo que hay que oír y antes de empezar a bajar",
    (e?.siestas?.length ?? 0) === 1 &&
      s0.hasta !== null &&
      s0.hasta < bajadaEn &&
      !!bostezo &&
      !!alDespertar &&
      bostezo.desde < s0.desde &&
      alDespertar.desde >= s0.hasta - 1e-3 &&
      !!loSiguiente &&
      loSiguiente.desde > alDespertar.desde,
    s0
      ? `durmiendo de ${s0.desde.toFixed(0)} a ${s0.hasta?.toFixed(0)} s: ${(s0.hasta - s0.desde).toFixed(0)} s de vuelo${s0.paraBajar ? ", y despierta para bajar" : ""} · ${loSiguiente?.clave ?? "?"} a los ${loSiguiente?.desde?.toFixed(0) ?? "?"} s · empieza a bajar a los ${bajadaEn.toFixed(0)} s`
      : "no se durmió",
  );
  comprobar(
    "y rápido: el fundido entero en segundos de pantalla, no un minuto",
    !!siesta?.pared && siesta.pared < 15,
    siesta?.pared ? `${siesta.pared.toFixed(1)} s de pared con la pantalla del sueño, por ${siesta.vuelo?.toFixed(0)} s de vuelo` : "no se vio",
  );
  comprobar(
    "durmiendo, el avión sigue su ruta de verdad: sin salirse y recorriendo lo que vuela",
    !!siesta && siesta.muestras >= 5 && siesta.lado < 2000 && siesta.recorrido !== null && siesta.recorrido > 0.8 && siesta.recorrido < 1.25,
    siesta
      ? `${siesta.muestras} muestras · ${siesta.lado.toFixed(0)} m fuera de la ruta como mucho · recorrido ${siesta.recorrido?.toFixed(2) ?? "?"} de lo que da su velocidad`
      : "no se vio",
  );
  const DE_SEGURIDAD = [
    ...["intro", "cinturon", "salidas", "mascaras", "chaleco", "tarjeta", "aparatos"].map((x) => `inicio.tripulacion.pasaje.demo.${x}`),
    "inicio.tripulacion.pasaje.cerca.revision",
    "comandante.despegue",
    "comandante.crucero",
    "comandante.descenso",
    "tripulacion.cinturones",
    "inicio.tripulacion.pasaje.oidos",
    "inicio.tripulacion.pasaje.cerca.aterrizaje",
  ];
  const seguridadPerdida = DE_SEGURIDAD.filter(
    (c) => !oidaEn(c) || siestas.some((x) => oidaEn(c).desde > x.desde && oidaEn(c).desde < x.hasta),
  );
  comprobar(
    "nada de seguridad se pierde con la siesta: la demostración, el cinturón y la bajada, todo oído y despierto",
    seguridadPerdida.length === 0 && registro.every((d) => !siestas.some((x) => d.desde > x.desde + 1e-3 && d.desde < x.hasta - 1e-3)),
    seguridadPerdida.length ? `perdido: ${seguridadPerdida.join(", ")}` : `${DE_SEGURIDAD.length} de seguridad, todas oídas, y nada dicho durmiendo`,
  );
  comprobar(
    "durmiendo se ve a Ara durmiendo y después soñando, en su orden",
    !!siesta && siesta.vistas.join(" → ") === "ara-durmiendo → ara-sonando",
    siesta ? siesta.vistas.join(" → ") || "ninguna" : "no se vio",
  );
  const movido = siesta?.avionAntes && siesta?.avionDespues ? Math.hypot(siesta.avionDespues[0] - siesta.avionAntes[0], siesta.avionDespues[1] - siesta.avionAntes[1]) : 0;
  comprobar(
    "y en la ventanita, el mapa de la ruta con las islas de verdad y el avión avanzando; el mismo de la tripulante",
    !!siesta &&
      siesta.islas.length === 4 &&
      siesta.islas.every((n) => n >= 15) &&
      siesta.muestras > 0 &&
      siesta.conElMapa / siesta.muestras > 0.8 &&
      movido > 1 &&
      ventanitas.has("dibujo:ruta"),
    siesta
      ? `islas de ${siesta.islas.join(", ")} puntos · el mapa en la ventanita en ${siesta.conElMapa} de ${siesta.muestras} muestras · el avión avanza ${movido.toFixed(1)} de 480 en la hoja`
      : "no se vio",
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
  // ── El kit de viaje en el vuelo ──
  const deMegafonia = (c) =>
    /^(comandante\.|tripulacion\.|ventanilla|inicio\.mama\.pasaje\.)/.test(c) ||
    (c.startsWith("inicio.tripulacion.pasaje.") && !c.includes(".cerca."));
  const dado = registro.find((d) => d.clave === "inicio.tripulacion.pasaje.cerca.kitAqui");
  const aprox = registro.find((d) => d.clave === "comandante.aproximacion");
  const cerca = dado ? registro.filter((d) => deMegafonia(d.clave) && d.desde > dado.desde - 30 && d.desde < dado.desde + 240) : [];
  comprobar(
    "el kit llega en un tramo tranquilo de la bajada: sin megafonía cerca y con rato por delante",
    !!dado && kit.tramo === "bajada" && cerca.length === 0 && !!aprox && aprox.desde - dado.desde > 240,
    dado
      ? `a los ${dado.desde.toFixed(0)} s, ${kit.tramo} · megafonía cerca: ${cerca.map((d) => d.clave).join(", ") || "ninguna"} · ${aprox ? (aprox.desde - dado.desde).toFixed(0) : "?"} s hasta preparar la cabina`
      : "no llegó",
  );
  comprobar(
    "en el vuelo se abre y se juega el camino entero, y Ara cuenta cada sitio",
    !!e?.kit?.hechos?.includes("camino") &&
      ["teide", "gomera", "palma"].every((p) => registro.some((d) => d.clave === `inicio.ara.pasaje.kit.camino.${p}`)),
    `hechos: ${(e?.kit?.hechos ?? []).join(", ") || "ninguno"}`,
  );
  comprobar(
    "el vuelo manda: con el kit abierto, la megafonía de la aproximación lo pausa, y se recoge antes de la final",
    kit.pausadoEnLaAproximacion &&
      kit.recogido &&
      !kit.abiertoEnLaFinal &&
      !kit.botonEnLaFinal &&
      registro.some((d) => d.clave === "inicio.tripulacion.pasaje.cerca.kitGuardar"),
    `pausado ${kit.pausadoEnLaAproximacion} · recogido ${kit.recogido} · abierto en la final ${kit.abiertoEnLaFinal} · mochilita en la final ${kit.botonEnLaFinal}`,
  );
  // ── El hilo musical ──
  comprobar(
    "el hilo musical suena al embarcar, la de Canarias, por el altavoz del techo y en el bus de la música",
    musica.embarque?.suena === "canarias" && musica.embarque.porElTecho && musica.embarque.bus === "musica" && !!musica.embarque.vuelta,
    musica.embarque ? JSON.stringify(musica.embarque) : "no sonó",
  );
  comprobar(
    "y se calla con la primera megafonía, y no suena en todo el vuelo",
    musica.callada === true && musica.enVuelo.length === 0,
    `callada tras la bienvenida: ${musica.callada} · en vuelo: ${[...new Set(musica.enVuelo)].join(", ") || "nada"}`,
  );
  comprobar(
    "y vuelve en el puesto de llegada, con los motores apagados",
    musica.llegada?.suena === "canarias",
    musica.llegada ? JSON.stringify(musica.llegada) : "no sonó",
  );
  // ── Lo que se nombra, a la vista; la foto con su voz; el meneo, el techo, el tren y el señalero ──
  for (const n of nombrados)
    console.log(
      `  ${n.ok ? "·" : "✗"} ${n.sitio} (${n.clave}) a los ${n.desde.toFixed(0)} s: ${n.como} por ${n.lado ?? "—"} · plano ${n.plano} · ` +
        (n.medido
          ? `en la imagen ${n.medido.x.toFixed(2)},${n.medido.y.toFixed(2)}${n.medido.delante ? "" : " detrás"} · cristal ${n.medido.porElCristal} · ojo en nube ${n.medido.ojoEnNube.toFixed(2)} · nube por medio ${n.medido.nubeEnMedio.toFixed(0)} m · a ${(n.medido.distancia / 1000).toFixed(1)} km`
          : "sin punto"),
    );
  comprobar(
    "lo que se nombra del paisaje está a la vista cuando se nombra: en la imagen, por el cristal y sin nube por medio",
    nombrados.length >= 3 && nombrados.every((n) => n.ok),
    `${nombrados.filter((n) => n.ok).length} de ${nombrados.length}: ${nombrados.map((n) => `${n.sitio}${n.ok ? "" : " ✗"}`).join(", ")}`,
  );
  const olvidados = e?.saltados ?? [];
  comprobar(
    "y la isla de llegada se dice cuando se ve, no metido en la nube",
    nombrados.some((n) => n.clave === "inicio.ara.pasaje.isla" && n.ok) && !olvidados.includes("isla"),
    nombrados.filter((n) => n.sitio === "isla-de-llegada").map((n) => `${n.como} a los ${n.desde.toFixed(0)} s`).join(", ") || "no se dijo",
  );
  comprobar(
    "la foto de una historia sale solo con su voz sonando, y Ara no contesta a lo que no se oyó",
    fotosMudas.size === 0 &&
      registro
        .filter((d) => d.clave === "inicio.ara.pasaje.garajonay")
        .every((d) => registro.some((h) => h.clave === "ventanilla.historia" && h.como === "sono" && h.hasta !== null && h.hasta <= d.desde)),
    fotosMudas.size ? [...fotosMudas].join(" · ") : `${fotosConVoz} muestras de foto, todas con su voz`,
  );
  comprobar(
    "dentro de la nube el avión se menea y se cuenta en el momento: Ara, la comandante y Ara",
    (meneoEnLaNube ?? 0) >= 0.35 &&
      ["inicio.ara.pasaje.meneo", "inicio.mama.pasaje.meneo", "inicio.ara.pasaje.meneoBien"].every((c) => claves.includes(c)),
    `en la nube al empezar: ${meneoEnLaNube === null ? "no se dijo" : meneoEnLaNube.toFixed(2)}`,
  );
  const techo = claves.indexOf("inicio.ara.pasaje.bajoLasNubes");
  comprobar(
    "al salir por debajo de las nubes se cuenta el techo, con los números de hoy y la visibilidad",
    techo >= 0 && ["inicio.tripulacion.pasaje.cerca.techo", "inicio.ara.pasaje.techo"].some((c) => claves.slice(techo).includes(c)),
    claves.slice(techo, techo + 4).join(" → ") || "no se dijo",
  );
  comprobar(
    "el Teide se presenta antes de volar más alto que él",
    claves.includes("inicio.mama.pasaje.altoRapido") &&
      (claves.indexOf("inicio.mama.pasaje.teide") >= 0
        ? claves.indexOf("inicio.mama.pasaje.teide") < claves.indexOf("inicio.mama.pasaje.altoRapido")
        : registro.some((d) => d.clave === "ventanilla" && d.desde < registro.find((x) => x.clave === "inicio.mama.pasaje.altoRapido").desde)),
    `presentación en ${claves.indexOf("inicio.mama.pasaje.teide")} · más alto que el Teide en ${claves.indexOf("inicio.mama.pasaje.altoRapido")}`,
  );
  comprobar(
    "el tren se ve desde abajo al salir, y el señalero desde el suelo hasta parar el avión",
    vistos.has("fuera-tren") && vistos.has("fuera-senalero"),
    `vistos: ${[...vistos].filter((p) => p === "fuera-tren" || p === "fuera-senalero").join(", ") || "ninguno"}`,
  );
  if (e) console.log(`  la escena duró ${e.segundos.toFixed(0)} s de reloj del juego`);
  comprobar("sin errores", errores.length === 0, errores[0] ?? "limpio");
  await ctx.close();
}

/**
 * **La siesta de Ara, de cerca** (punto 304): desde el bostezo, el fundido a
 * medio camino, Ara soñando con el mapa en la ventanita a mitad de la siesta y
 * el despertar con el mapa todavía puesto, cada uno con su captura; y
 * mientras duerme, qué ilustraciones salen y en qué orden, si el
 * avión sigue su ruta —lo que se aparta del tramo del plan— y si recorre lo
 * que da su velocidad por el suelo en el tiempo de vuelo que pasa, que es lo
 * que distingue volar deprisa de saltar.
 */
async function mirarLaSiesta(page) {
  const leerSiesta = () =>
    page.evaluate(() => {
      const j = globalThis.__oga.inicio();
      const l = j.lecturaDeLinea;
      return {
        durmiendo: !!j.estado?.durmiendo,
        segundos: j.estado?.segundos ?? 0,
        siesta: j.siesta,
        ruta: j.ruta,
        mapa: j.ventanita?.sitio === "dibujo:ruta" && !!j.ventanita?.donde,
        x: l?.x ?? null,
        z: l?.z ?? null,
        tramo: l?.tramo ?? null,
        falta: l?.faltaParaTocar ?? null,
        suelo: l?.porElSuelo ?? 0,
      };
    });
  const r = { pared: null, vuelo: null, lado: 0, muestras: 0, recorrido: null, islas: [], avionAntes: null, avionDespues: null, vistas: [], conElMapa: 0 };
  // El bostezo, que se oye o se lee; y Ara cierra los ojos.
  await page.waitForFunction(() => globalThis.__oga.inicio().estado?.durmiendo, null, { timeout: 40_000 }).catch(() => {});
  let a = await leerSiesta();
  if (!a.durmiendo) return r;
  const empieza = Date.now();
  await page
    .waitForFunction(() => (globalThis.__oga.inicio().siesta?.opacidad ?? 0) > 0.35, null, { timeout: 5000, polling: 16 })
    .catch(() => {});
  await foto(page, "siesta-fundido");
  a = await leerSiesta();
  const desde = a;
  let antes = a;
  let previsto = 0;
  let conFoto = false;
  while (a.durmiendo && Date.now() - empieza < 60_000) {
    if (a.siesta) r.vistas = a.siesta.vistas;
    if (a.ruta) {
      r.islas = a.ruta.islas;
      r.avionAntes ??= a.ruta.avion;
      r.avionDespues = a.ruta.avion;
    }
    // Lo que se aparta del tramo del plan que se vuela.
    if (a.tramo && a.x !== null) {
      const { desde: d, hasta: h } = a.tramo;
      const dx = h.x - d.x;
      const dz = h.z - d.z;
      r.lado = Math.max(r.lado, Math.abs(dx * (a.z - d.z) - dz * (a.x - d.x)) / (Math.hypot(dx, dz) || 1));
      r.muestras++;
      if (a.mapa) r.conElMapa++;
    }
    previsto += ((a.suelo + antes.suelo) / 2) * (a.segundos - antes.segundos);
    // El sueño, con el mapa en la ventanita: pasado el fundido de una ilustración a la otra.
    if (!conFoto && a.siesta?.ilustracion === "ara-sonando" && a.mapa && a.segundos - desde.segundos > 15) {
      await pausa(500);
      await foto(page, "siesta-sonando");
      conFoto = true;
    }
    antes = a;
    await pausa(120);
    a = await leerSiesta();
  }
  r.vuelo = antes.segundos - desde.segundos;
  r.recorrido = desde.falta !== null && antes.falta !== null && previsto > 0 ? (desde.falta - antes.falta) / previsto : null;
  // Despierta: la pantalla se va, y lo que se pasó con ella puesta es lo que dura.
  await page
    .waitForFunction(() => (globalThis.__oga.inicio().siesta?.opacidad ?? 0) <= 0.001, null, { timeout: 10_000, polling: 16 })
    .catch(() => {});
  r.pared = (Date.now() - empieza) / 1000;
  // Y Ara, con el mapa en la ventanita mientras dice que se durmió.
  await page
    .waitForFunction(
      () => {
        const j = globalThis.__oga.inicio();
        return j.estado?.linea?.clave === "inicio.ara.pasaje.despertarse" && j.ventanita?.sitio === "dibujo:ruta" && !!j.ventanita?.donde;
      },
      null,
      { timeout: 20_000 },
    )
    .catch(() => {});
  await pausa(700);
  await foto(page, "siesta-despertar");
  return r;
}

/**
 * **El kit en el vuelo, con el ratón**: se abre la mochilita, se elige el
 * camino y se tocan los números; y después se elige el avión y se deja
 * abierto, que es lo que tienen que pausar la aproximación y recoger la
 * tripulante.
 */
async function jugarElCaminoEnElVuelo(page) {
  const kitDe = () => page.evaluate(() => globalThis.__oga.inicio().kit);
  const centro = (r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  let k = await kitDe();
  if (!k?.boton) return;
  let c = centro(k.boton);
  await page.mouse.click(c.x, c.y);
  await page.waitForFunction(() => !!globalThis.__oga.inicio().kit?.juegos?.camino, null, { timeout: 10_000 }).catch(() => {});
  k = await kitDe();
  if (!k?.juegos?.camino) return;
  c = centro(k.juegos.camino);
  await page.mouse.click(c.x, c.y);
  await page.waitForFunction(() => Object.keys(globalThis.__oga.inicio().kit?.paradas ?? {}).length === 4, null, { timeout: 10_000 }).catch(() => {});
  await foto(page, "kit-camino-en-vuelo");
  for (const p of ["teide", "gomera", "palma"]) {
    // Sin pausar: si habla la megafonía, se espera, que manda ella.
    await page.waitForFunction(() => !globalThis.__oga.inicio().estado.kit.pausado, null, { timeout: 60_000 }).catch(() => {});
    k = await kitDe();
    if (!k?.paradas?.[p]) return;
    c = centro(k.paradas[p]);
    await page.mouse.click(c.x, c.y);
    await pausa(1500);
  }
  await foto(page, "kit-camino-hecho-en-vuelo");
  // Y el avión, que se deja abierto: lo recoge la tripulación antes de aterrizar.
  await page.waitForFunction(() => !!globalThis.__oga.inicio().kit?.juegos?.piezas, null, { timeout: 60_000 }).catch(() => {});
  k = await kitDe();
  if (k?.juegos?.piezas) {
    c = centro(k.juegos.piezas);
    await page.mouse.click(c.x, c.y);
  }
}

/**
 * **El kit con el dedo, en cada pantalla**: el teléfono apaisado, la tablet
 * del aula y el portátil con ratón. Se da el kit ya —sin volar media hora:
 * `darElKit`—, se abre, se mira que cabe sin tapar la tarjeta ni los botones,
 * y se juegan los dos juegos enteros: las piezas **arrastradas** a su sitio
 * con el dedo, y los números del camino tocados.
 */
async function elKitConElDedo() {
  const PANTALLAS = [
    ["telefono", { ...devices["Pixel 7 landscape"], hasTouch: true, isMobile: true }],
    ["tablet", { viewport: { width: 1024, height: 600 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1.5 }],
    ["portatil", { viewport: { width: 1280, height: 800 } }],
  ];
  for (const [nombre, opciones] of PANTALLAS) {
    const ctx = await navegador.newContext({ ...opciones, locale: "es-PY" });
    const page = await ctx.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
    const dedo = !!opciones.hasTouch;
    const cdp = dedo ? await ctx.newCDPSession(page) : null;
    const centro = (r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
    const tocar = async (r) => {
      const c = centro(r);
      if (dedo) await page.touchscreen.tap(c.x, c.y);
      else await page.mouse.click(c.x, c.y);
    };
    /** Arrastrar de un sitio a otro: con el dedo, toques de verdad; si no, el ratón. */
    const arrastrar = async (de, a) => {
      const pasos = 10;
      if (dedo) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: de.x, y: de.y }] });
        for (let k = 1; k <= pasos; k++) {
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: de.x + ((a.x - de.x) * k) / pasos, y: de.y + ((a.y - de.y) * k) / pasos }],
          });
          await pausa(20);
        }
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      } else {
        await page.mouse.move(de.x, de.y);
        await page.mouse.down();
        await page.mouse.move(a.x, a.y, { steps: pasos });
        await page.mouse.up();
      }
    };
    const kitDe = () => page.evaluate(() => globalThis.__oga.inicio().kit);
    const estado = () => page.evaluate(() => globalThis.__oga.inicio().estado.kit);
    try {
      await page.goto(`${BASE}/?inicio=3`);
      await page.waitForFunction(() => !!globalThis.__oga?.inicio?.()?.estado, null, { timeout: 180_000 });
      await page.keyboard.press("ShiftLeft");
      await page.waitForFunction(() => !!document.querySelector("#inicio .inicio__tarjeta"), null, { timeout: 60_000 });
      await page.evaluate(() => globalThis.__oga.darElKit());
      await page.waitForFunction(() => !!globalThis.__oga.inicio().kit?.boton, null, { timeout: 10_000 });
      let k = await kitDe();
      await foto(page, `kit-mochilita-${nombre}`);
      await tocar(k.boton);
      await page.waitForFunction(() => !!globalThis.__oga.inicio().kit?.juegos?.piezas, null, { timeout: 10_000 });
      await pausa(500);
      // Que cabe, y no tapa la tarjeta ni ningún botón del HUD que se vea.
      const solapes = await page.evaluate(() => {
        const panel = document.querySelector(".kit__panel").getBoundingClientRect();
        const tocan = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
        const fuera = panel.left < 0 || panel.top < 0 || panel.right > innerWidth || panel.bottom > innerHeight;
        const otros = [...document.querySelectorAll("#inicio .inicio__tarjeta, .hud button, .hud [data-hud='cinturon'], .volumen")].filter((el) => {
          if (el.closest("[hidden]")) return false;
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.05) return false;
          const r = el.getBoundingClientRect();
          return r.width > 2 && r.height > 2 && tocan(panel, r);
        });
        return { fuera, otros: otros.map((el) => el.getAttribute("data-hud") ?? el.className) };
      });
      k = await kitDe();
      const minimo = Math.min(...Object.values(k.juegos).map((r) => Math.min(r.width, r.height)));
      comprobar(
        `${nombre}: el kit cabe entero, sin tapar la tarjeta ni los botones, y los juegos se tocan bien`,
        !solapes.fuera && solapes.otros.length === 0 && minimo >= 88,
        `fuera ${solapes.fuera} · tapa: ${solapes.otros.join(", ") || "nada"} · juegos de ${minimo.toFixed(0)} px`,
      );
      await foto(page, `kit-elegir-${nombre}`);
      // ── Armá el avión, arrastrando ──
      await tocar(k.juegos.piezas);
      await page.waitForFunction(() => Object.keys(globalThis.__oga.inicio().kit?.piezas ?? {}).length === 4, null, { timeout: 10_000 });
      await pausa(500);
      k = await kitDe();
      const menor = Math.min(...Object.values(k.piezas).map((x) => Math.max(x.en.width, x.en.height)));
      // Primero una al sitio equivocado: vuelve a la bandeja y su sitio brilla.
      await arrastrar(centro(k.piezas.motor.en), centro(k.piezas.ala.sitio));
      await pausa(600);
      const tras = await estado();
      const ayuda = tras.juego?.puestas?.length === 0 && tras.juego?.ilumina === "motor";
      for (const p of ["ala", "motor", "cola", "ruedas"]) {
        k = await kitDe();
        await arrastrar(centro(k.piezas[p].en), centro(k.piezas[p].sitio));
        await pausa(600);
        if (p === "motor") await foto(page, `kit-piezas-${nombre}`);
      }
      const piezas = await estado();
      comprobar(
        `${nombre}: se arma el avión entero ${dedo ? "con el dedo, arrastrando" : "con el ratón"}; equivocarse ayuda`,
        piezas.juego?.terminado === true && piezas.hechos.includes("piezas") && ayuda && menor >= 36,
        `puestas: ${(piezas.juego?.puestas ?? []).join(", ")} · ayuda al equivocarse: ${ayuda} · pieza más chica ${menor.toFixed(0)} px`,
      );
      await pausa(1200);
      await foto(page, `kit-piezas-hecho-${nombre}`);
      // ── El camino, tocando los números ──
      await page.click(".kit__atras", { force: true });
      await page.waitForFunction(() => !!globalThis.__oga.inicio().kit?.juegos?.camino, null, { timeout: 10_000 });
      k = await kitDe();
      await tocar(k.juegos.camino);
      await page.waitForFunction(() => Object.keys(globalThis.__oga.inicio().kit?.paradas ?? {}).length === 4, null, { timeout: 10_000 });
      await pausa(500);
      for (const p of ["teide", "gomera", "palma"]) {
        k = await kitDe();
        await tocar(k.paradas[p]);
        await pausa(800);
      }
      await pausa(1500);
      await foto(page, `kit-camino-${nombre}`);
      const camino = await estado();
      const radio = Math.min(...Object.values(k.paradas).map((r) => r.width));
      comprobar(
        `${nombre}: se dibuja el camino entero tocando los números`,
        camino.juego?.terminado === true && camino.hechos.includes("camino") && radio >= 34,
        `unidas ${camino.juego?.hechas} · número de ${radio.toFixed(0)} px`,
      );
      // ── Y se deja cuando se quiera ──
      await page.click(".kit__cerrar", { force: true });
      await pausa(400);
      const cerrado = await estado();
      k = await kitDe();
      comprobar(
        `${nombre}: se guarda cuando se quiera, y la mochilita vuelve`,
        !cerrado.abierto && !!k.boton,
        `abierto ${cerrado.abierto} · mochilita ${!!k.boton}`,
      );
      if (errores.length) comprobar(`${nombre}: sin errores`, false, errores[0]);
    } catch (err) {
      comprobar(`${nombre}: el kit se juega`, false, String(err).slice(0, 160));
    } finally {
      await ctx.close();
    }
  }
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
  if (!process.env.OGA_SIN_KIT) await elKitConElDedo();
  if (!process.env.OGA_SOLO_KIT) await elVuelo();
} finally {
  await navegador.close();
  await server.close();
}

const bien = resultados.filter((r) => r.ok).length;
console.log("");
for (const r of resultados) console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}${r.detalle ? `  —  ${r.detalle}` : ""}`);
console.log(`\n  ${bien} de ${resultados.length}\n`);
process.exit(bien === resultados.length ? 0 : 1);

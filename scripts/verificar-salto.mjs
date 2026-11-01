/**
 * **El salto bajo tapa, en el juego de verdad.** Ver el ADR 0023,
 * `src/flight/salto-bajo-tapa.ts`, que son las cuentas, y `atenderAlSalto` en
 * `src/game.ts`, que las pone.
 *
 * Con el JAZ 120 de avión de prueba y solo con los mundos que ya existen:
 * Canarias y el Paraguay. El pasillo de crucero es de otra tanda, así que entre
 * los dos mundos debajo no hay nada dibujado, y eso aquí no se mira.
 *
 * ## Qué mira
 *
 * - **Entra arriba**, sin pasar por el puesto: a las 2 h 24, sobre El Hierro.
 * - **Ara se duerme, y bajo la tapa, salta siete horas**: cae en el punto de la
 *   ortodrómica que da la cuenta —con la hora del vuelo de ese instante, contando
 *   lo que lleva volado desde entonces—, y en el mundo del tramo.
 * - **Nunca se ve saltar**: se mira en cada fotograma de la página, y entre dos
 *   fotogramas en los que el avión aparece en otro sitio la pantalla está opaca.
 * - **Sigue en crucero, estable, sesenta segundos después**: la altitud, lo que
 *   sube o baja, el alabeo, la velocidad, el tramo de la tripulación, la fase, y
 *   por la raya.
 * - **El estado entero**: el combustible de esas horas, la cabina a su altura,
 *   el cartel apagado, y la hora y el sol de ese sitio.
 * - **No se dispara nada de más al destapar**: en la boca, en la voz de la
 *   máquina y en los sonidos, solo la frase con la que Ara se despierta.
 * - **Sin Ara dormida también**: con la tapa de un juego a pantalla completa, un
 *   salto corto ya dentro del Paraguay, con su suelo debajo.
 * - **Si el mundo no llega, la red destapa**: con los ficheros de Pettirossi que
 *   no contestan, se destapa a los veinte segundos de pared, con el avión en su
 *   sitio y volando, sin el mundo nuevo.
 *
 * Con la fecha fija, una de diciembre: `?fecha=` (ADR 0023). `OGA_GPU=1` para
 * dibujar con la tarjeta, `OGA_FOTOS=<dir>` para las capturas.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = Number(process.env.OGA_PUERTO ?? 5601);
const FOTOS = process.env.OGA_FOTOS ?? null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const FECHA = "2026-12-15";
const HORA = 3600;
/** Sobre El Hierro. */
const T0 = 2.4 * HORA;
/** El salto del plan: siete horas. */
const T1 = T0 + 7 * HORA;
/** Ya en el Paraguay, antes de bajar: la bajada de diciembre empieza a las 10 h 48. */
const T2 = 10.62 * HORA;
/** Lo que se le carga al avión de prueba, kg: los tanques del JAZ 120 del juego no dan para esta ruta. */
const CARGA_DE_PRUEBA = 150_000;

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
const { AIRCRAFT } = await server.ssrLoadModule("/src/flight/aircraft.ts");
const JAZ_120 = AIRCRAFT.find((a) => a.id === "jaz-120");
const perfil = ruta.perfilDelVuelo(ruta.horarioDelDia(new Date(`${FECHA}T12:00:00Z`)));

const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args:
    process.env.OGA_GPU === "1"
      ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
      : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
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
  const fichero = `${FOTOS}/salto-${nombre}-${corto}.png`;
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
    return {
      x: s.position.x,
      y: s.position.y,
      z: s.position.z,
      rumbo: s.heading,
      velocidad: s.airspeed,
      vertical: s.verticalSpeed,
      enTierra: s.onGround,
      fase: o.fase(),
      percance: o.percance?.() ?? null,
      motor: o.controles().engineOn,
      tramo: i.tripulacion?.tramo ?? null,
      duerme: i.estado?.duerme ?? null,
      siestas: i.estado?.siestas ?? [],
      registro: (i.registro ?? []).map((d) => ({ clave: d.clave, como: d.como })),
      siesta: i.siesta,
      salto: o.salto(),
      reloj: j.relojDelJuego,
      habladas: o.habladas(),
      habladasTotal: o.habladasTotal(),
      maquina: o.maquina(),
      sonidos: o.sonidos().map((x) => x.que ?? String(x)),
      tarjeta: o.tarjeta(),
      coste: o.coste(),
      suelo: j.terrain.cotaConocida(s.position.x, s.position.z),
      plan: j.navegacion?.progreso?.restante ?? null,
    };
  });

/** Dónde está un avión de verdad, en el sitio, con el origen del mundo en el que está. */
const sitioDe = (l) => salto.sitioDelMundo(l.salto.origen, l.x, l.z);
/** Lo que se aparta de donde dice la cuenta a esa hora, m por la superficie. */
const fueraDeLaCuenta = (l) => ruta.ortodromica(sitioDe(l), ruta.dondeVa(perfil, l.salto.hora).sitio).distancia;

/**
 * **Cada fotograma de la página**: dónde está el avión y lo que tapa la pantalla.
 * Es la prueba de que nunca se ve saltar: la saca el navegador, no este guion,
 * que entre dos lecturas no vería nada.
 */
const vigilarLaTapa = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const saltos = [];
    let antes = null;
    const mirar = () => {
      const s = o.estado();
      const el = document.getElementById("siesta");
      const opacidad = el && !el.hidden ? Number(getComputedStyle(el).opacity) : 0;
      if (antes && Math.hypot(s.position.x - antes.x, s.position.z - antes.z) > 5000)
        saltos.push({ antes: antes.opacidad, despues: opacidad });
      antes = { x: s.position.x, z: s.position.z, opacidad };
      requestAnimationFrame(mirar);
    };
    requestAnimationFrame(mirar);
    globalThis.__saltosVistos = saltos;
  });

/** Abre el vuelo y deja el avión de prueba en el aire, con combustible para esto. */
async function abrir(ctx, hasta = T1) {
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.goto(`${BASE}/?inicio=3&avion=jaz-120&fecha=${FECHA}&largo=${T0}&hasta=${hasta}`);
  await page.bringToFront();
  await page.waitForFunction(() => globalThis.__oga?.salto?.().hora != null, null, { timeout: 180_000 });
  await page.keyboard.press("ShiftLeft");
  await page.evaluate(() => globalThis.__ogaEmpezar?.());
  await page.evaluate((k) => globalThis.__oga.ponerCombustible(k), CARGA_DE_PRUEBA);
  return { page, errores };
}

async function elSaltoDeSieteHoras() {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 } });
  const { page, errores } = await abrir(ctx);
  try {
    await vigilarLaTapa(page);
    await pausa(1500);
    const uno = await leer(page);
    comprobar(
      "entra arriba, sin pasar por el puesto, con el JAZ 120 y la tripulación en crucero",
      !uno.enTierra && uno.tramo === "crucero" && uno.motor === true && uno.y > 10000,
      `${uno.salto.mundo} · ${uno.tramo} · FL${Math.round(uno.y / 30.48)} · ${uno.fase}`,
    );
    const avion = await page.evaluate(() => globalThis.__oga.avion().id);
    comprobar("el avión de prueba es el JAZ 120", avion === "jaz-120", avion);
    comprobar(
      "cae sobre la ruta a esa hora, junto a El Hierro",
      fueraDeLaCuenta(uno) < 500,
      `${fueraDeLaCuenta(uno).toFixed(0)} m de la cuenta · lat ${sitioDe(uno).lat.toFixed(2)} lon ${sitioDe(uno).lon.toFixed(2)}`,
    );
    await foto(page, "1-sobre-el-hierro");
    /*
     * **El instrumento, antes de fiarse de él**: que de pasaje se vea un *ding* en
     * la lista de sonidos. Un «no sonó nada» solo vale si podía verlo.
     */
    const seVeUnDing = await page.evaluate(() => {
      const o = globalThis.__oga;
      const antes = o.sonidos().length;
      o.juegoParaTrazas().avisar("cinturon");
      return o.sonidos().length - antes;
    });
    comprobar("la lista de sonidos ve un ding del cartel, si lo hay", seVeUnDing === 1, `+${seVeUnDing}`);
    const combustibleAntes = uno.salto.combustible;
    const horaAntes = uno.salto.hora;

    // **Ara se duerme, sola**, y lo demás lo pide la escena. Con el tope de lo que tarda la voz.
    console.log("  esperando a que Ara se duerma…");
    await page.waitForFunction(() => globalThis.__oga.salto().enCurso !== null, null, { timeout: 90_000 });
    const pedido = await leer(page);
    // Lo que lleva al empezar a saltar: lo que queda arriba son los segundos que tarda el salto, a la quema de ahora.
    const combustibleAlPedir = pedido.salto.combustible;
    // Y desde aquí, todo lo que se cuente en el juego: ver más abajo. Se cuenta del `emit`, que no hay otra lista.
    const descartadasAntes = await page.evaluate(() => {
      const j = globalThis.__oga.juegoParaTrazas();
      globalThis.__hechosVistos = [];
      const emit = j.hechos.emit.bind(j.hechos);
      j.hechos.emit = (que, datos) => {
        globalThis.__hechosVistos.push(que);
        emit(que, datos);
      };
      return globalThis.__oga.descartadas().length;
    });
    console.log(`  a dormir: ${pedido.salto.enCurso?.estado}, mundo ${pedido.salto.enCurso?.mundoPedido}`);
    comprobar(
      "Ara se durmió con la pantalla tapada, y el salto lo pidió la escena",
      pedido.salto.tapa === true,
      `tapa ${pedido.salto.tapa} · opacidad ${pedido.siesta?.opacidad}`,
    );
    await foto(page, "2-durmiendo");
    await page.waitForFunction(() => globalThis.__oga.salto().hechos.length > 0, null, { timeout: 60_000 });
    const dos = await leer(page);
    const hecho = dos.salto.hechos[0];
    // Desde antes del salto, que lo que se dispare al caer se dispara en ese mismo fotograma.
    const voces = { habladas: pedido.habladasTotal, maquina: pedido.maquina.length, sonidos: pedido.sonidos.length };
    comprobar(
      "salta siete horas, ni más ni menos: de una hora a la otra, en el mundo del tramo",
      Math.abs(hecho.hasta - T1) < 1e-6 && Math.abs(hecho.hasta - hecho.desde - 7 * HORA) < 120 && hecho.mundo === "pettirossi" && !hecho.sinElMundo,
      `de ${(hecho.desde / HORA).toFixed(3)} h a ${(hecho.hasta / HORA).toFixed(3)} h · ${hecho.mundo} · ${hecho.pared.toFixed(1)} s de pared`,
    );
    comprobar(
      "el avión cae en el punto de la ortodrómica que da la cuenta",
      fueraDeLaCuenta(dos) < 500,
      `${fueraDeLaCuenta(dos).toFixed(0)} m de la cuenta · lat ${sitioDe(dos).lat.toFixed(3)} lon ${sitioDe(dos).lon.toFixed(3)} · a ${(ruta.dondeVa(perfil, dos.salto.hora).recorrido / 1000).toFixed(0)} km de Barajas`,
    );
    comprobar(
      "el reloj del juego no se ha movido, y el del vuelo sí",
      // Con el paso que se da debajo de la tapa, un sesentavo de segundo. Ver `atenderAlSalto`.
      dos.reloj - uno.reloj < 60 && Math.abs(dos.salto.hora - hecho.hasta - (dos.reloj - hecho.relojDelJuego)) < 0.1,
      `juego +${(dos.reloj - uno.reloj).toFixed(0)} s · vuelo +${((dos.salto.hora - horaAntes) / HORA).toFixed(2)} h`,
    );
    const esperado = salto.estadoDelSalto(perfil, hecho.hasta, JAZ_120, { en: hecho.desde, kilos: combustibleAlPedir });
    comprobar(
      "ha gastado el combustible de esas horas",
      dos.salto.combustible < combustibleAntes - 5 * 5000 && Math.abs(dos.salto.combustible - esperado.combustible) < 1000,
      `de ${(combustibleAntes / 1000).toFixed(1)} t a ${(dos.salto.combustible / 1000).toFixed(1)} t (cuenta: ${(esperado.combustible / 1000).toFixed(1)} t)`,
    );
    comprobar(
      "la cabina a su altura, y el cartel apagado",
      Math.abs(dos.salto.cabina - esperado.cabina) < 30 && dos.salto.cartel === false,
      `cabina ${Math.round(dos.salto.cabina / 0.3048)} ft (cuenta: ${Math.round(esperado.cabina / 0.3048)} ft) · cartel ${dos.salto.cartel}`,
    );
    const sol = ruta.solEn(new Date(perfil.horario.despegue.getTime() + dos.salto.hora * 1000), sitioDe(dos));
    comprobar(
      "la hora y el sol de ese sitio y ese instante",
      Math.abs(dos.salto.alturaDelSol - (sol.altura * 180) / Math.PI) < 1 && Math.abs(dos.salto.horaDelCielo - esperado.horaSolar) < 0.1,
      `el sol a ${dos.salto.alturaDelSol.toFixed(1)}° (cuenta: ${((sol.altura * 180) / Math.PI).toFixed(1)}°) · hora del sol ${dos.salto.horaDelCielo.toFixed(2)} (cuenta: ${esperado.horaSolar.toFixed(2)})`,
    );
    comprobar(
      "el mundo de antes se fue: lo que hay en la tarjeta no se dobla",
      dos.coste.geometrias < uno.coste.geometrias * 1.5,
      `geometrías ${uno.coste.geometrias} → ${dos.coste.geometrias} · texturas ${uno.coste.texturas} → ${dos.coste.texturas}`,
    );

    // **Sesenta segundos después**, de reloj del juego.
    await page.evaluate(() => globalThis.__oga.acelerar(1));
    const muestras = [];
    const reloj0 = dos.reloj;
    const pared0 = Date.now();
    for (;;) {
      const l = await leer(page);
      muestras.push(l);
      if (l.reloj - reloj0 >= 60 || Date.now() - pared0 > 300_000) break;
      await pausa(1000);
    }
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    const tres = muestras[muestras.length - 1];
    // Desde la primera lectura y sin dejarle un rato para asentarse: un avión cayendo se ve justo al destapar.
    const y = [dos.y, ...muestras.map((m) => m.y)];
    const v = [dos.velocidad, ...muestras.map((m) => m.velocidad)];
    const rango = (a) => Math.max(...a) - Math.min(...a);
    const verticales = [dos.vertical, ...muestras.map((m) => m.vertical)].map(Math.abs);
    comprobar(
      "sesenta segundos después sigue en crucero, con la tripulación y en vuelo",
      tres.reloj - reloj0 >= 60 && tres.tramo === "crucero" && tres.fase === "en-vuelo" && !tres.enTierra && !tres.percance && tres.motor === true,
      `${(tres.reloj - reloj0).toFixed(0)} s · ${tres.tramo} · ${tres.fase} · motor ${tres.motor} · percance ${tres.percance ?? "ninguno"}`,
    );
    comprobar(
      "estable: no sube, no baja y no pierde velocidad",
      rango(y) < 30 && Math.max(...verticales) < 2 && rango(v) < 0.02 * v[0],
      `altitud ±${rango(y).toFixed(1)} m · vertical hasta ${Math.max(...verticales).toFixed(2)} m/s · velocidad ${Math.min(...v).toFixed(1)}–${Math.max(...v).toFixed(1)} m/s`,
    );
    comprobar(
      "y volando por la raya de la ortodrómica, donde dice la cuenta a esa hora",
      fueraDeLaCuenta(tres) < 1500,
      `${fueraDeLaCuenta(tres).toFixed(0)} m de la cuenta tras ${((tres.salto.hora - hecho.hasta) / 60).toFixed(1)} min`,
    );

    // **Lo que sonó**: solo la frase de Ara al despertar.
    const habladasNuevas = tres.habladas.slice(Math.max(0, tres.habladas.length - (tres.habladasTotal - voces.habladas)));
    const delResto = habladasNuevas.filter((h) => !h.endsWith("inicio.ara.pasaje.despertarse"));
    const maquinaNueva = tres.maquina.slice(voces.maquina);
    const sonidosNuevos = tres.sonidos.slice(voces.sonidos);
    const registroTras = tres.registro.filter((d, i) => i >= pedido.registro.length);
    comprobar(
      "Ara se despierta con su frase, y una sola",
      registroTras.length === 1 && tres.siestas.at(-1)?.porQue === "salto",
      `${registroTras.map((d) => `${d.clave} (${d.como})`).join(" · ") || "ninguna"} · despertó por ${tres.siestas.at(-1)?.porQue}`,
    );
    comprobar(
      "no se dispara ninguna voz de más al destapar, ni en la boca ni en la máquina",
      delResto.length === 0 && maquinaNueva.length === 0,
      `boca: ${habladasNuevas.join(" · ") || "nada"} · máquina: ${maquinaNueva.join(" · ") || "nada"}`,
    );
    comprobar(
      "ni ningún aviso sonoro, ni el ding del cartel",
      sonidosNuevos.length === 0,
      sonidosNuevos.join(" · ") || "nada",
    );
    /*
     * **Y lo que no suena pero se dispara**: de pasaje la boca es de la escena y
     * lo demás se tira, y un «no sonó» no diría si algo saltó igual por debajo.
     * Se mira lo que se contó —una frustrada, una toma, un punto de descenso— y
     * lo que la boca tiró.
     */
    const despues = await page.evaluate(() => ({ hechos: globalThis.__hechosVistos, descartadas: globalThis.__oga.descartadas() }));
    const tiradas = despues.descartadas.slice(descartadasAntes);
    comprobar(
      "y por debajo tampoco salta nada: ningún hecho del vuelo, y nada que la boca haya tenido que tirar",
      despues.hechos.length === 0 && tiradas.length === 0,
      `hechos: ${despues.hechos.join(" · ") || "ninguno"} · tiradas: ${tiradas.join(" · ") || "ninguna"}`,
    );
    await foto(page, "3-tras-el-salto");

    // **Y otro salto, sin Ara dormida**: la tapa de un juego a pantalla completa, ya dentro del Paraguay.
    const saltosAntes = tres.salto.hechos.length;
    const pedidoSonda = await page.evaluate((t) => globalThis.__oga.saltar(t), T2);
    comprobar("se puede saltar con otra tapa que la siesta, sin Ara dormida", pedidoSonda === true);
    await page.waitForFunction((n) => globalThis.__oga.salto().hechos.length > n, saltosAntes, { timeout: 60_000 });
    const cuatro = await leer(page);
    const otro = cuatro.salto.hechos.at(-1);
    comprobar(
      "cae en su punto y dentro del mundo, con el suelo debajo",
      fueraDeLaCuenta(cuatro) < 500 && cuatro.suelo !== null && otro.mundoPedido === null,
      `${fueraDeLaCuenta(cuatro).toFixed(0)} m de la cuenta · suelo ${cuatro.suelo?.toFixed(0) ?? "sin saber"} m · ${otro.pared.toFixed(1)} s de pared`,
    );
    await page.waitForFunction(() => !(globalThis.__oga.inicio().siesta?.opacidad > 0), null, { timeout: 15_000 });
    const cinco0 = await leer(page);
    const r0 = cinco0.reloj;
    for (let i = 0; i < 120; i++) {
      const c = await page.evaluate(() => globalThis.__oga.juegoParaTrazas().relojDelJuego);
      if (c - r0 >= 15) break;
      await pausa(500);
    }
    const cinco = await leer(page);
    comprobar(
      "y sigue arriba, en crucero, con la pantalla destapada",
      cinco.tramo === "crucero" && !cinco.percance && Math.abs(cinco.y - cuatro.y) < 40,
      `${cinco.tramo} · FL${Math.round(cinco.y / 30.48)} · ${cinco.fase}`,
    );
    await foto(page, "4-sobre-el-paraguay");
    comprobar(
      "y este salto, sin que Ara durmiera, no dice nada: ni la escena, ni la boca, ni la máquina, ni un aviso",
      cinco.habladasTotal === tres.habladasTotal && cinco.maquina.length === tres.maquina.length && cinco.sonidos.length === tres.sonidos.length,
      `boca +${cinco.habladasTotal - tres.habladasTotal} · máquina +${cinco.maquina.length - tres.maquina.length} · sonidos +${cinco.sonidos.length - tres.sonidos.length}`,
    );

    const vistos = await page.evaluate(() => globalThis.__saltosVistos);
    comprobar(
      "nunca se ve saltar: en cada fotograma en que el avión aparece en otro sitio, la pantalla está opaca",
      vistos.length >= 2 && vistos.every((s) => s.antes >= 0.999 && s.despues >= 0.999),
      `${vistos.length} saltos vistos · opacidad ${vistos.map((s) => `${s.antes.toFixed(2)}→${s.despues.toFixed(2)}`).join(", ")}`,
    );
    comprobar("sin errores en la página", errores.length === 0, errores.slice(0, 3).join(" · "));
  } catch (e) {
    comprobar("el salto de siete horas", false, `${String(e).slice(0, 200)} · ${errores.slice(0, 2).join(" · ")}`);
  } finally {
    await ctx.close();
  }
}

/** Con el mundo que no llega: los ficheros de Pettirossi, sin contestar. */
async function laRed() {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 } });
  const { page, errores } = await abrir(ctx);
  try {
    /*
     * Solo los datos de su mundo, y ya con el juego arrancado: interceptar pasa
     * por aquí cada petición, y en desarrollo son miles de módulos.
     */
    await page.route(/\/data\/(terrain|ortho)\/pettirossi[^/]*\.(bin|jpg)/, () => {
      // Sin contestar ni fallar, que es la espera que se cuelga de verdad.
    });
    await vigilarLaTapa(page);
    await page.waitForFunction(() => globalThis.__oga.salto().enCurso !== null, null, { timeout: 90_000 });
    const pared0 = Date.now();
    console.log("  la red: Ara duerme, y el mundo no contesta…");
    await page.waitForFunction(() => globalThis.__oga.salto().hechos.length > 0, null, { timeout: 45_000 });
    const pared = (Date.now() - pared0) / 1000;
    const l = await leer(page);
    const h = l.salto.hechos[0];
    comprobar(
      "la red destapa, a los veinte segundos de pared, sin el mundo",
      h.sinElMundo && h.pared >= 19 && h.pared < 24 && l.salto.mundo === "tenerife-norte",
      `${h.pared.toFixed(1)} s de pared (${pared.toFixed(1)} s vistos desde aquí) · por la red ${h.porLaRed} · mundo ${l.salto.mundo}`,
    );
    comprobar(
      "y el avión, en su sitio igual: la cuenta no espera a ningún mundo",
      fueraDeLaCuenta(l) < 500,
      `${fueraDeLaCuenta(l).toFixed(0)} m de la cuenta`,
    );
    await page.waitForFunction(() => !(globalThis.__oga.inicio().siesta?.opacidad > 0), null, { timeout: 15_000 });
    const destapado = await leer(page);
    comprobar("la pantalla se destapa", !(destapado.siesta?.opacidad > 0), `opacidad ${destapado.siesta?.opacidad ?? 0}`);
    const r0 = destapado.reloj;
    for (let i = 0; i < 120; i++) {
      const c = await page.evaluate(() => globalThis.__oga.juegoParaTrazas().relojDelJuego);
      if (c - r0 >= 20) break;
      await pausa(500);
    }
    const f = await leer(page);
    comprobar(
      "y sigue volando, sin caerse y sin nada debajo: se ve el cielo y se oye el motor",
      f.tramo === "crucero" && !f.percance && Math.abs(f.y - destapado.y) < 40 && f.motor === true,
      `${f.tramo} · FL${Math.round(f.y / 30.48)} · ${f.velocidad.toFixed(0)} m/s`,
    );
    await foto(page, "5-la-red");
    const vistos = await page.evaluate(() => globalThis.__saltosVistos);
    comprobar(
      "tampoco por la red se ve saltar",
      vistos.length === 1 && vistos[0].antes >= 0.999 && vistos[0].despues >= 0.999,
      `${vistos.length} saltos vistos · opacidad ${vistos.map((s) => `${s.antes.toFixed(2)}→${s.despues.toFixed(2)}`).join(", ")}`,
    );
    comprobar("sin errores en la página", errores.length === 0, errores.slice(0, 3).join(" · "));
  } catch (e) {
    comprobar("la red", false, `${String(e).slice(0, 200)} · ${errores.slice(0, 2).join(" · ")}`);
  } finally {
    await ctx.close();
  }
}

try {
  if (!process.env.OGA_SOLO_RED) await elSaltoDeSieteHoras();
  if (!process.env.OGA_SIN_RED) await laRed();
} finally {
  await navegador.close();
  await server.close();
}

const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length}\n`);
process.exit(bien === resultados.length ? 0 : 1);

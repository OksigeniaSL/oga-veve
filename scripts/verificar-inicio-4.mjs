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
 * - **Con los motores en marcha en todo el vuelo y por encima de la reserva**, y
 *   **desde 25 km hasta la recogida, a la velocidad pedida** con diez nudos de
 *   margen. Quemando por el gas, el avión se quedaba seco a 26 km y volaba la final
 *   a 103 nudos, planeando, sin que fallara nada de lo demás: tocaba bien. Ver
 *   `empujeQueSeQuema` en `vuelo-de-linea.ts`.
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
 *
 * ## Con `OGA_CAPITULO=2`, la noche sobre el mar, y de ahí el tercero entero
 *
 * `?inicio=4&capitulo=2`: ver `src/flight/guion-noche-sobre-el-mar.ts`. Mira lo suyo, y
 * al caer del salto sigue por las mismas comprobaciones de arriba, una a una: lo que
 * quiere decir «el capítulo 3 corre igual que suelto» es que es el mismo banco.
 *
 * - **Arranca tapado**, en el JAZ 110, de noche, a la hora y en el punto que da la cuenta,
 *   dentro del mundo de Canarias, en crucero, con el nivel y la velocidad del perfil.
 * - **Pasa por El Hierro a su hora**, ±5 minutos, con Valverde debajo, Tenerife a 73 km a
 *   la izquierda y La Palma a 43 a la derecha, ±10 km: lo mide donde va el avión de verdad,
 *   no la cuenta.
 * - **Se puede dormir**: la siesta tapa, el salto cae a la hora del despertar y en el punto
 *   de la ortodrómica de esa hora, y nunca se ve saltar: lo mira cada fotograma de la página.
 * - **Lo que queda en los depósitos al despertar cuadra con la cuenta**.
 * - **El mundo de antes se va** de la tarjeta, medido justo al quitarlo. Y lo que hay al
 *   llegar sale en una línea, para compararlo con el tercero suelto, que es el mismo mundo.
 * - **Y cae con el parte de Asunción**, no con el de Canarias: vuela con el 040/12 del
 *   alisio, y `OGA_VIENTO` es el de allí. Con 200/8, tiene que entrar por la 20.
 *
 * `OGA_SOLO_NOCHE=1` para al caer del salto, y `OGA_METAR=` da un parte a mano, que con el
 * alisio de siempre hay una capa de nubes y lo de abajo no se ve: para las capturas.
 *
 * `OGA_RED=1` mira la red: con los ficheros de Pettirossi que no contestan, a los veinte
 * segundos de pared la noche suelta y se abre el tercer capítulo por su camino de siempre.
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
const CAPITULO = process.env.OGA_CAPITULO ?? "3";
const SOLO_NOCHE = !!process.env.OGA_SOLO_NOCHE;
const METAR = process.env.OGA_METAR ?? null;
/** Lo que se aparta como mucho de lo que dan las cuentas al pasar por las islas, m. */
const MARGEN_DE_LADO = 10_000;
/** El mundo de Tenerife Norte llega a esto de su centro, m: dieciocho veces sus dieciocho kilómetros, y la mitad. */
const EL_MUNDO_DE_LA_NOCHE_LLEGA_A = 162_000;
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
const { vientoDeCasa } = await server.ssrLoadModule("/src/world/meteo.ts");
const { PETTIROSSI: ESCENARIO_DE_LA_LLEGADA } = await server.ssrLoadModule("/src/world/scenarios.ts");
const { AIRCRAFT } = await server.ssrLoadModule("/src/flight/aircraft.ts");
const JAZ_110 = AIRCRAFT.find((a) => a.id === "jaz-110");
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
      combustible: o.combustible(),
      sinMotor: o.sinMotor(),
      faltaParaTocar: i.lecturaDeLinea?.faltaParaTocar ?? null,
      enLaFinal: i.lecturaDeLinea?.enLaFinal ?? null,
      lado: i.lecturaDeLinea?.pista?.lado ?? null,
      ultimaToma: i.ultimaToma ?? null,
      vista: i.vista,
      salto: o.salto(),
      reloj: j.relojDelJuego,
      habladas: o.habladas(),
      maquina: o.maquina(),
      coste: o.coste(),
      siesta: i.siesta ?? null,
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

/**
 * **Cada fotograma de la página**, lo mismo que en `verificar-salto.mjs`: dónde está el
 * avión y lo que tapa la pantalla, que entre dos lecturas de este guion no se vería nada.
 * Y **lo que asoma del mundo** en los cinco segundos siguientes al salto, con la siesta
 * yéndose y la lámina del capítulo que sigue debajo: si se fundieran las dos a la vez,
 * asomaría por en medio.
 */
const vigilarLaTapa = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const saltos = [];
    const asomo = { maximo: 0, fotogramas: 0 };
    const deEl = (id) => {
      const el = document.getElementById(id);
      return el && !el.hidden ? Number(getComputedStyle(el).opacity) : 0;
    };
    let antes = null;
    let hastaCuando = 0;
    const mirar = () => {
      const s = o.estado();
      const tapa = 1 - (1 - deEl("siesta")) * (1 - deEl("lamina-grande"));
      if (antes && Math.hypot(s.position.x - antes.x, s.position.z - antes.z) > 5000) {
        saltos.push({ antes: antes.tapa, despues: tapa });
        hastaCuando = performance.now() + 5000;
      }
      if (performance.now() < hastaCuando) {
        asomo.maximo = Math.max(asomo.maximo, 1 - tapa);
        asomo.fotogramas++;
      }
      antes = { x: s.position.x, z: s.position.z, tapa };
      requestAnimationFrame(mirar);
    };
    requestAnimationFrame(mirar);
    globalThis.__saltosVistos = saltos;
    globalThis.__asomoTrasElSalto = asomo;
  });

/** Lo que queda a la derecha —positivo— de quien va en `l`, m, y a cuánto está. */
function respectoAlAvion(l, sitio) {
  const q = salto.sitioDelMundo(l.salto.origen, l.x, l.z);
  const distancia = ruta.ortodromica(q, sitio).distancia;
  // Con `x` al este y `z` al sur, en el mismo plano que el avión: el lado no cambia a estas distancias.
  const k = Math.cos((q.lat * Math.PI) / 180);
  const dx = ((sitio.lon - q.lon) * Math.PI * 6371008 * k) / 180;
  const dz = -((sitio.lat - q.lat) * Math.PI * 6371008) / 180;
  return { distancia, lado: dx * Math.cos(l.rumbo) + dz * Math.sin(l.rumbo) };
}

/**
 * **El capítulo 2**, de que se abre a que el salto cae en el tercero: lo suyo. De ahí en
 * adelante, `elCapitulo` sigue como con el tercero suelto.
 */
async function laNoche(page) {
  const carga = salto.cargaDelVueloLargo(JAZ_110, perfil);
  await vigilarLaTapa(page);
  /*
   * **El parte de allí, distinto del de aquí**: con `?viento=` los dos serían el mismo, y no
   * se vería cuál se usa. Después de lo que pida `main.ts`, que con la dirección ya contestó.
   */
  const [de, kt] = VIENTO.split("/").map(Number);
  const deAlla = { ...vientoDeCasa(ESCENARIO_DE_LA_LLEGADA.vientoDominante), vientoDe: de, vientoKt: kt, fuente: "mano" };
  await page.evaluate((m) => globalThis.__oga.juegoParaTrazas().ponerTiempoDeLaLlegada(m), deAlla);
  await pausa(1500);
  const uno = await leer(page);
  const avion = await page.evaluate(() => globalThis.__oga.avion().id);
  const entrada = ruta.entradaDeLaNoche(perfil);
  comprobar(
    "arranca tapado: el mundo no asoma antes de abrirse la ventanilla",
    uno.sobreElMundo.visible && uno.sobreElMundo.opacidad === 1 && uno.tapa !== null,
    `lámina ${uno.tapa} · opacidad ${uno.sobreElMundo.opacidad}`,
  );
  comprobar(
    "se abre con el JAZ 110, con Ara a la izquierda, en el mundo de Canarias y con la tripulación en crucero",
    avion === "jaz-110" && uno.salto.mundo === "tenerife-norte" && uno.tripulacion?.tramo === "crucero" && !uno.enTierra && uno.motor === true && uno.vista === "pasaje-izquierda",
    `${avion} · ${uno.salto.mundo} · ${uno.tripulacion?.tramo} · vista ${uno.vista}`,
  );
  comprobar(
    "entra a la hora que da la cuenta",
    Math.abs(uno.salto.hora - entrada) < 60,
    `${(uno.salto.hora / 3600).toFixed(3)} h del despegue (cuenta: ${(entrada / 3600).toFixed(3)} h, ${perfil.horario.temporada})`,
  );
  comprobar(
    "y en el sitio que da la cuenta, dentro del mundo",
    fueraDeLaCuenta(uno) < 500 && Math.abs(uno.x) < EL_MUNDO_DE_LA_NOCHE_LLEGA_A && Math.abs(uno.z) < EL_MUNDO_DE_LA_NOCHE_LLEGA_A,
    `${fueraDeLaCuenta(uno).toFixed(0)} m de la cuenta · lat ${sitioDe(uno).lat.toFixed(2)} lon ${sitioDe(uno).lon.toFixed(2)} · x ${(uno.x / 1000).toFixed(0)} km z ${(uno.z / 1000).toFixed(0)} km`,
  );
  const solAqui = ruta.solEn(new Date(perfil.horario.despegue.getTime() + uno.salto.hora * 1000), sitioDe(uno));
  comprobar(
    "con el sol de ese sitio y ese instante, de noche",
    Math.abs(uno.salto.alturaDelSol - (solAqui.altura * 180) / Math.PI) < 1 && solAqui.deNoche,
    `el sol a ${uno.salto.alturaDelSol.toFixed(1)}° (cuenta: ${((solAqui.altura * 180) / Math.PI).toFixed(1)}°)`,
  );
  const delPerfil = ruta.dondeVa(perfil, uno.salto.hora);
  comprobar(
    "en crucero, con el nivel y la velocidad del perfil",
    delPerfil.fase === "crucero" && Math.abs(uno.y - delPerfil.altitud) < 30 && Math.abs(uno.velocidad - delPerfil.velocidad) < 3,
    `FL${(uno.y / 30.48).toFixed(0)} (perfil FL${(delPerfil.altitud / 30.48).toFixed(0)}) · ${uno.velocidad.toFixed(1)} m/s (perfil ${delPerfil.velocidad.toFixed(1)} m/s)`,
  );
  const alEntrar = salto.estadoDelSalto(perfil, uno.salto.hora, JAZ_110, { en: 0, kilos: carga }).combustible;
  comprobar(
    "con lo que le queda a esa hora en los depósitos",
    Math.abs(uno.combustible.kilos - alEntrar) < 200,
    `${uno.combustible.kilos.toFixed(0)} kg (cuenta: ${alEntrar.toFixed(0)} kg)`,
  );
  await foto(page, "noche-0-tapado");

  // ── Se vuela hasta pasar El Hierro ───────────────────────────────────
  const lejos = () => ({ distancia: Infinity, lado: 0, hora: 0 });
  const pasos = {
    valverde: { sitio: ruta.SITIOS_DEL_CAMINO.valverde, ...lejos() },
    tenerife: { sitio: ruta.SITIOS_DEL_CAMINO.tenerife, ...lejos() },
    laPalma: { sitio: ruta.SITIOS_DEL_CAMINO.laPalma, ...lejos() },
  };
  const fotosHechas = new Set();
  let desnudo = 0;
  let pulsado = false;
  let prisa = false;
  let fuera = 0;
  let dejoElCrucero = false;
  const pared0 = Date.now();
  let pedido = null;
  for (;;) {
    const l = await leer(page);
    if (l.salto.enCurso) {
      pedido = l;
      break;
    }
    if (l.percance || Date.now() - pared0 > 15 * 60_000) break;
    const dichos = l.dichos;
    if (l.tapa === null && !dichos.includes("ventanilla") && !l.sobreElMundo.visible) desnudo++;
    if (l.tripulacion?.tramo !== "crucero") dejoElCrucero = true;
    if (dichos.includes("ventanilla")) {
      for (const p of Object.values(pasos)) {
        const r = respectoAlAvion(l, p.sitio);
        if (r.distancia < p.distancia) Object.assign(p, r, { hora: l.salto.hora });
      }
      if (fueraDeLaCuenta(l) > fuera) fuera = fueraDeLaCuenta(l);
      if (process.env.OGA_PRISA && !prisa) {
        prisa = true;
        await page.evaluate((v) => globalThis.__oga.acelerar(v), Number(process.env.OGA_PRISA));
      }
      if (!prisa && !pulsado && l.adelanto?.sale && !l.adelanto.puesto) {
        pulsado = true;
        await page.locator('[data-hud="adelantar"]').click({ timeout: 5000 }).catch(() => page.evaluate(() => document.querySelector('[data-hud="adelantar"]')?.click()));
      }
    }
    for (const [cual, cuando] of [
      ["noche-1-ventanilla", dichos.includes("ventanilla")],
      ["noche-2-tenerife-de-traves", dichos.includes("tenerife") && l.plano === "ventanilla" && l.linea?.endsWith("cerca.estrellas")],
      ["noche-3-asomado-el-hierro", l.plano === "asomado-abajo" && l.linea?.endsWith("marAbajo")],
      ["noche-4-luces", dichos.includes("luces")],
    ])
      if (cuando && !fotosHechas.has(cual)) {
        fotosHechas.add(cual);
        await pausa(cual === "noche-3-asomado-el-hierro" ? 900 : 300);
        await foto(page, cual);
      }
    await pausa(250);
  }
  comprobar("y el mundo no asoma antes de la ventanilla", desnudo === 0, `${desnudo} lecturas con el mundo a la vista`);
  comprobar("va todo el rato en crucero", !dejoElCrucero, "");
  const horaDeValverde = ruta.cuandoPasa(perfil, ruta.PASA_EL_HIERRO);
  const { valverde, tenerife, laPalma } = pasos;
  const delPlan = (p) => ruta.respectoALaRuta(ruta.DE_MADRID_A_ASUNCION, p.sitio).lado;
  comprobar(
    "pasa por El Hierro a la hora de la cuenta, ±5 minutos, con Valverde debajo",
    Math.abs(valverde.hora - horaDeValverde) < 300 && Math.abs(valverde.distancia) < MARGEN_DE_LADO,
    `a las ${(valverde.hora / 3600).toFixed(3)} h (cuenta: ${(horaDeValverde / 3600).toFixed(3)} h) · Valverde a ${(valverde.distancia / 1000).toFixed(1)} km (cuenta: ${(Math.abs(delPlan(valverde)) / 1000).toFixed(1)} km)`,
  );
  comprobar(
    "con Tenerife a 73 km a la izquierda, ±10 km",
    tenerife.lado < 0 && Math.abs(tenerife.distancia - 73_000) < MARGEN_DE_LADO,
    `${(tenerife.distancia / 1000).toFixed(1)} km, ${tenerife.lado < 0 ? "izquierda" : "derecha"} (cuenta: ${(delPlan(tenerife) / 1000).toFixed(1)} km)`,
  );
  comprobar(
    "y La Palma a 43 km a la derecha, ±10 km",
    laPalma.lado > 0 && Math.abs(laPalma.distancia - 43_000) < MARGEN_DE_LADO,
    `${(laPalma.distancia / 1000).toFixed(1)} km, ${laPalma.lado < 0 ? "izquierda" : "derecha"} (cuenta: ${(delPlan(laPalma) / 1000).toFixed(1)} km)`,
  );
  comprobar("y sin apartarse de la raya en todo el rato", fuera < 2000, `como mucho, a ${fuera.toFixed(0)} m de donde dice la cuenta`);

  // ── Luces bajas, siesta y salto ──────────────────────────────────────
  comprobar(
    "Ara se duerme, ya pasado El Hierro, y la siesta tapa la pantalla",
    !!pedido && pedido.salto.tapa === true && pedido.siestas.length === 1 && pedido.salto.hora > horaDeValverde && pedido.dichos.includes("luces"),
    pedido ? `a las ${(pedido.salto.hora / 3600).toFixed(3)} h · tapa ${pedido.salto.tapa} · opacidad ${pedido.siesta?.opacidad} · siestas ${pedido.siestas.length}` : "no se durmió",
  );
  if (!pedido) throw new Error("Ara no se durmió");
  await foto(page, "noche-5-durmiendo");
  const kilosAntes = pedido.salto.combustible;
  await page.waitForFunction(() => globalThis.__oga.salto().hechos.length > 0, null, { timeout: 60_000 });
  // Lo que quede de la prisa no es del tercero: suelto, su apertura corre a su paso.
  await page.evaluate(() => globalThis.__oga.acelerar(1));
  const despierto = await leer(page);
  const hecho = despierto.salto.hechos[0];
  const elParte = await page.evaluate(() => {
    const m = globalThis.__oga.juegoParaTrazas().scenario.meteo;
    return { vientoDe: m?.vientoDe, vientoKt: m?.vientoKt };
  });
  const ultimoFijo = despierto.plan?.fijos?.at(-1)?.nombre;
  const cabecera = de > 90 && de < 270 ? "RW20" : "RW02";
  comprobar(
    "cae con el parte de Asunción, y entra por la cabecera que da su viento",
    elParte.vientoDe === de && elParte.vientoKt === kt && ultimoFijo === cabecera,
    `viento ${elParte.vientoDe}/${elParte.vientoKt} · el plan acaba en ${ultimoFijo} (el de Canarias era 040/12)`,
  );
  const delAntes = await page.evaluate(() => {
    const d = globalThis.__oga.inicio().capituloDeAntes;
    return d ? { registro: d.registro.map((x) => ({ clave: x.clave, desde: x.desde, hasta: x.hasta, cortada: x.cortada, como: x.como })), dichos: d.estado.dichos } : null;
  });
  const elDespertar = ruta.entradaDeLaLlegada(perfil);
  comprobar(
    "el salto cae a la hora del despertar, en el mundo del Paraguay, con el mundo ya bajado",
    Math.abs(hecho.hasta - elDespertar) < 1 && hecho.mundo === "pettirossi" && !hecho.sinElMundo && !hecho.porLaRed,
    `de ${(hecho.desde / 3600).toFixed(3)} h a ${(hecho.hasta / 3600).toFixed(3)} h (cuenta: ${(elDespertar / 3600).toFixed(3)} h) · ${hecho.mundo} · ${hecho.pared.toFixed(1)} s de pared`,
  );
  comprobar(
    "y en el punto de la ortodrómica de esa hora, ±10 km",
    fueraDeLaCuenta(despierto) < MARGEN_DE_LADO,
    `${fueraDeLaCuenta(despierto).toFixed(0)} m de la cuenta · lat ${sitioDe(despierto).lat.toFixed(2)} lon ${sitioDe(despierto).lon.toFixed(2)}`,
  );
  const vistos = await page.evaluate(() => ({ saltos: globalThis.__saltosVistos, asomo: globalThis.__asomoTrasElSalto }));
  comprobar(
    "nunca se ve saltar: la pantalla está opaca en el fotograma del corte",
    vistos.saltos.length === 1 && vistos.saltos.every((x) => x.antes >= 0.999 && x.despues >= 0.999),
    JSON.stringify(vistos.saltos),
  );
  const esperado = salto.estadoDelSalto(perfil, hecho.hasta, JAZ_110, { en: 0, kilos: carga }).combustible;
  const queda = despierto.salto.combustible;
  const t = hecho.tarjeta;
  comprobar(
    "al quitar el mundo de antes, lo suyo se va de la tarjeta",
    !!t && t.geometrias[1] < t.geometrias[0] * 0.8,
    t ? `geometrías ${t.geometrias[0]} → ${t.geometrias[1]} · texturas ${t.texturas[0]} → ${t.texturas[1]}` : "sin medida",
  );
  comprobar(
    "lo que queda al despertar cuadra con la cuenta",
    Math.abs(queda - esperado) < 500,
    `${queda.toFixed(0)} kg (cuenta del vuelo entero: ${esperado.toFixed(0)} kg) · al dormirse ${kilosAntes.toFixed(0)} kg`,
  );
  const reg = delAntes?.registro ?? [];
  let pisadas = 0;
  for (let k = 1; k < reg.length; k++) if (reg[k].desde < (reg[k - 1].hasta ?? Infinity) - 1e-6) pisadas++;
  comprobar(
    "en este capítulo tampoco suenan dos voces a la vez, y se dice lo suyo en su orden",
    pisadas === 0 && reg.every((d) => !d.cortada) && ["cena", "ventanilla", "tenerife", "hierro", "luces"].every((m, k) => delAntes.dichos[k] === m),
    `${reg.length} frases · ${pisadas} pisadas · ${delAntes?.dichos.join(", ")}`,
  );
  console.log(`  lo dicho: ${reg.map((d) => `${d.clave}(${d.como})`).join(" · ")}`);
  console.log(`  ${((Date.now() - pared0) / 1000).toFixed(0)} s de pared de la ventanilla al salto`);
  await foto(page, "noche-6-tras-el-salto");
}

async function elCapitulo() {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 }, locale: "es-PY" });
  const page = await ctx.newPage();
  const errores = [];
  const avisos = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  page.on("console", (m) => {
    if (m.type() === "error") errores.push(m.text().slice(0, 200));
    if (m.type() === "warning") avisos.push(m.text().slice(0, 200));
  });
  try {
    // En la noche, el alisio de Canarias: `VIENTO` es el de allí. Ver `laNoche`.
    await page.goto(`${BASE}/?inicio=4&capitulo=${CAPITULO}&fecha=${FECHA}&viento=${CAPITULO === "2" ? "040/12" : VIENTO}${METAR ? `&metar=${encodeURIComponent(METAR)}` : ""}`);
    await page.bringToFront();
    await page.waitForFunction(() => globalThis.__oga?.salto?.().hora != null, null, { timeout: 240_000 });
    await page.keyboard.press("ShiftLeft");
    await page.evaluate(() => globalThis.__ogaEmpezar?.());
    if (CAPITULO === "2") await laNoche(page);
    else await pausa(1500);
    if (SOLO_NOCHE) {
      comprobar("sin errores de consola", errores.length === 0, errores.slice(0, 4).join(" · "));
      return;
    }

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
      if (!fotos.has("piernas") && a.linea?.endsWith("derlis.piernas")) {
        fotos.add("piernas");
        await pausa(1500);
        await foto(page, "lamina-piernas");
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
      // La última puede estar aún sonando al abrirse la ventanilla, y entonces su `como` es null: no ha acabado, no es muda.
      const sin = a.registro.filter((d) => d.como !== null && d.como !== "sono").map((d) => d.clave);
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
    const fotosDeLoNombrado = new Set();
    let seParo = null;
    let alLlegar = null;
    let lecturasDeVelocidad = 0;
    let loPeor = null;
    for (;;) {
      const l = await leer(page);
      ultimo = l;
      const ad = l.adelanto;
      const tramo = l.tripulacion?.tramo ?? "?";
      if (tramosVistos.at(-1)?.tramo !== tramo)
        tramosVistos.push({ tramo, pared: (Date.now() - pared0) / 1000, hora: l.salto.hora, y: l.y });
      if (!seParo && tramo !== "apagado" && (!l.motor || l.sinMotor))
        seParo = { hora: l.salto.hora, falta: l.faltaParaTocar, tramo, kilos: l.combustible.kilos };
      // Lo último antes de apagar: al apagar en el campo de llegada se reposta para la vuelta. Ver `repostar`.
      if (tramo !== "apagado") alLlegar = l.combustible.kilos;
      // Solo en lo que lleva el gas: en la recogida sale con la altura, y lo que se pierde ahí es de la toma.
      if (!l.enTierra && (tramo === "bajada" || tramo === "final") && l.manos && l.faltaParaTocar < 25_000) {
        lecturasDeVelocidad++;
        const margen = l.velocidad - l.manos.velocidad;
        if (!loPeor || margen < loPeor.margen)
          loPeor = { margen, velocidad: l.velocidad, pedida: l.manos.velocidad, falta: l.faltaParaTocar };
      }
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
      for (const n of l.nombrados) {
        if (fotosDeLoNombrado.has(n.sitio)) continue;
        fotosDeLoNombrado.add(n.sitio);
        await foto(page, `nombra-${n.sitio.replace(":", "-")}`);
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
    /*
     * **Lo que hay en la tarjeta al llegar**: si el mundo de antes se quedara, aquí se
     * sumaría. El mismo número sale con el tercero suelto, que es la referencia. Antes y
     * después de cambiar no se compara: three.js cuenta lo que ya se ha pintado, y a
     * cuarenta mil pies sobre el mar es poco.
     */
    console.log(`  en la tarjeta al llegar: geometrías ${l.coste.geometrias} · texturas ${l.coste.texturas}`);
    const reserva = l.combustible.reserva;
    const alTocar = tocado?.lectura.combustible.kilos ?? 0;
    comprobar(
      "con los motores en marcha en todo el vuelo, y por encima de la reserva al tocar y al llegar al puesto",
      !seParo && alTocar > reserva && (alLlegar ?? 0) > reserva,
      `al tocar ${alTocar.toFixed(0)} kg · antes de apagar ${(alLlegar ?? 0).toFixed(0)} kg · reserva ${reserva.toFixed(0)} kg · ${
        seParo ? `parados en ${seParo.tramo} a las ${(seParo.hora / 3600).toFixed(3)} h, faltando ${(seParo.falta / 1000).toFixed(1)} km, con ${seParo.kilos.toFixed(0)} kg` : "sin pararse"
      }`,
    );
    // Veinte lecturas como poco: una comprobación que apenas ha mirado no ha comprobado nada.
    comprobar(
      "desde 25 km hasta la recogida, la velocidad no baja de la pedida menos 10 kt",
      lecturasDeVelocidad >= 20 && !!loPeor && loPeor.margen > -10 * 0.5144,
      loPeor
        ? `lo peor, ${(loPeor.margen / 0.5144).toFixed(1)} kt: ${(loPeor.velocidad / 0.5144).toFixed(0)} pidiendo ${(loPeor.pedida / 0.5144).toFixed(0)} a ${(loPeor.falta / 1000).toFixed(1)} km · ${lecturasDeVelocidad} lecturas`
        : `${lecturasDeVelocidad} lecturas`,
    );
    const recogida = await page.evaluate(() => globalThis.__oga.inicio().recogida?.muestras ?? []);
    const alRecoger = recogida.find((m) => m.tramo === "recogida");
    const posado = recogida.find((m) => m.enTierra);
    console.log(
      `  la recogida: ${alRecoger ? (alRecoger.velocidad / 0.5144).toFixed(0) : "?"} kt al empezar · ${posado ? (posado.velocidad / 0.5144).toFixed(0) : "?"} kt al tocar`,
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
    const solAlAcabar = ruta.solEnElVuelo(perfil, l.salto.hora);
    const nombro = l.nombrados.map((n) => `${n.sitio}(${n.como}${n.lado ? `, ${n.lado}` : ""})`);
    console.log(`  lo que Ara nombró: ${nombro.join(" · ") || "nada"} · charlas ${l.charlas.join(", ") || "ninguna"}`);
    comprobar(
      "lo que nombra Ara, solo por su cristal",
      l.nombrados.every((n) => n.como === "ventanilla" && (n.lado === null || n.lado === "izquierda")),
      nombro.join(" · ") || "nada: hoy no se veía por su lado",
    );
    comprobar(
      "y de noche cerrada, ni el río ni el Chaco",
      solAlAcabar.deNoche ? !l.charlas.includes("rio") && !l.charlas.includes("chaco") : true,
      `el sol al acabar a ${((solAlAcabar.altura * 180) / Math.PI).toFixed(0)}°`,
    );
    // Con la 02 y de día queda todo de su lado: si aquí no nombra nada, es que lo que mira no ve.
    if (VIENTO.startsWith("020") && !solAlAcabar.deNoche)
      comprobar(
        "y con la 02 y de día, nombra el río y Asunción, y el Chaco si llega a verse",
        ["rio", "asuncion"].every((c) => l.charlas.includes(c)),
        l.charlas.join(", "),
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
    if (CAPITULO === "2") {
      const vistos = await page.evaluate(() => globalThis.__asomoTrasElSalto);
      comprobar(
        "y al caer del salto, el mundo no asoma con la siesta yéndose",
        vistos.fotogramas > 30 && vistos.maximo < 0.01,
        `lo más que asomó: ${(vistos.maximo * 100).toFixed(1)} % en ${vistos.fotogramas} fotogramas`,
      );
    }
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

/**
 * **La red de la noche**: sin el mundo de la llegada no se puede caer en la llegada, y una
 * espera sin salida se queda colgada. Se recarga en el capítulo 3, que sí baja lo suyo.
 */
async function laRedDeLaNoche() {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 }, locale: "es-PY" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  try {
    await page.goto(`${BASE}/?inicio=4&capitulo=2&fecha=${FECHA}&viento=${VIENTO}`);
    await page.bringToFront();
    await page.waitForFunction(() => globalThis.__oga?.salto?.().hora != null, null, { timeout: 240_000 });
    /*
     * No contesta nunca, que es lo que hace una red caída. Ya con el juego arrancado, como en
     * `verificar-salto.mjs`: interceptar pasa por aquí cada petición, y en desarrollo son miles.
     */
    const elMundo = /\/data\/(terrain|ortho)\/pettirossi[^/]*\.(bin|jpg)/;
    await page.route(elMundo, () => {});
    await page.keyboard.press("ShiftLeft");
    await page.evaluate(() => globalThis.__ogaEmpezar?.());
    await page.waitForFunction(() => globalThis.__oga.inicio().estado?.dichos?.includes("ventanilla"), null, { timeout: 120_000 });
    await page.evaluate(() => globalThis.__oga.acelerar(8));
    await page.waitForFunction(() => globalThis.__oga.salto().enCurso !== null, null, { timeout: 600_000 });
    const pedido = Date.now();
    await page.waitForURL(/capitulo=3/, { timeout: 60_000, waitUntil: "commit" });
    const pared = (Date.now() - pedido) / 1000;
    // Al recargar, ya sí contesta: lo que se prueba es que suelta, no una red que siga caída.
    await page.unroute(elMundo);
    comprobar(
      "sin el mundo de la llegada, pasada la red, suelta y se abre el capítulo 3",
      pared >= 19 && pared < 30,
      `a los ${pared.toFixed(1)} s de pared · ${page.url().replace(BASE, "")}`,
    );
    await page.waitForFunction(() => globalThis.__oga?.salto?.().hora != null, null, { timeout: 240_000 });
    const abierto = await page.evaluate(() => ({ mundo: globalThis.__oga.salto().mundo, hora: globalThis.__oga.salto().hora, escena: globalThis.__oga.inicio().escena }));
    const entrada = ruta.entradaDeLaLlegada(perfil);
    comprobar(
      "y es el de siempre: en su mundo, a su hora",
      abierto.mundo === "pettirossi" && abierto.escena === "largo" && Math.abs(abierto.hora - entrada) < 60,
      `${abierto.mundo} · ${(abierto.hora / 3600).toFixed(3)} h (cuenta: ${(entrada / 3600).toFixed(3)} h)`,
    );
    comprobar("sin errores de consola", errores.length === 0, errores.slice(0, 3).join(" · "));
  } catch (e) {
    comprobar("la red de la noche", false, `${String(e).slice(0, 300)} · ${errores.slice(0, 2).join(" · ")}`);
  } finally {
    await ctx.close();
  }
}

try {
  if (process.env.OGA_MENU) await laFicha();
  else if (process.env.OGA_RED) await laRedDeLaNoche();
  else await elCapitulo();
} finally {
  await navegador.close();
  await server.close();
}

const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length}\n`);
process.exit(bien === resultados.length ? 0 : 1);

/**
 * **«Interceptar un radial», volado en el juego** (#51, ADR 0030, enmienda
 * H26e): Fuerteventura, la avioneta en el peldaño de cabina y el VOR FTV.
 *
 *   node scripts/ver-interceptar-un-radial.mjs <carpeta>
 *
 * Un vuelo con el alisio del sitio (del treinta a veinte nudos, el que pone el
 * ejercicio), o en calma con `OGA_VIENTO=000/0`. El piloto de banco hace lo
 * que pide la instructora, con las teclas de quien juega:
 *
 * - lee el radial pedido en la tarjeta y lo pone en el OBS con el 0 apretado
 *   —la rueda que sigue girando— y luego de toque en toque;
 * - mantiene la cortada de cuarenta y cinco grados con el automático mientras
 *   la barra está a tope;
 * - en cuanto la barra se despega, vira hacia el curso de a poco: el rumbo del
 *   curso más cuatro veces y media la barra, y lo que ve que el viento lo
 *   deriva, como quien mira el camino. Con `OGA_TARDE=1` no anticipa: sigue
 *   cortando hasta que la barra llega al centro, y entonces vira;
 * - y se queda en el radial hasta que el ejercicio lo da por establecido.
 *
 * Capturas, la página entera y el cuadro de cerca: la salida, la barra a
 * tope, la barra viniendo, el viraje anticipado, en el radial corrigiendo y
 * el final. El puerto, `OGA_PUERTO`; el reloj, acelerado por `OGA_VECES`
 * (cuatro) desde que el OBS está puesto.
 *
 * Y lo de H26f: que en todo el ejercicio no salga nada que no sea suyo —ni
 * «andá a la pista», ni la torre, ni la frecuencia, ni la ventanilla, ni la
 * flecha de casa latiendo—; que el CDI de la tarjeta lleve la barra del lado
 * en que está la de verdad; y **la corrección de viento como media** en los
 * veinte segundos de establecido, contra la que pide el viento que sopla en
 * el modelo de vuelo a la verdadera que lleva, muestra a muestra.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";
import { vigilarLoAjeno } from "./lo-ajeno-al-ejercicio.mjs";

const SALIDA = process.argv[2] ?? "capturas-interceptar";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5687);
const AVION = process.env.OGA_AVION ?? "jaz-20";
const VECES = Number(process.env.OGA_VECES ?? 4);
const VIENTO = process.env.OGA_VIENTO ?? null;
const TARDE = process.env.OGA_TARDE === "1";
const NOMBRE = `${VIENTO ? "calma" : "alisio"}${TARDE ? "-tarde" : ""}`;

mkdirSync(SALIDA, { recursive: true });
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false, watch: null },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok: !!ok });
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? `  —  ${detalle}` : ""}`);
};

/** Lo que dice el ejercicio y la NAV, dónde está el avión y hacia dónde va. */
const leerSolo = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    const s = o.estado();
    const a = j.avionParaLaRadio();
    const radio = j.radioAlDia();
    const nav = a ? radio.leer(a, j.elevacionDeLaEstacion).nav : null;
    const l = nav?.lectura ?? null;
    return {
      x: s.position.x,
      z: s.position.z,
      y: s.position.y,
      rumbo: s.heading,
      camino: Math.atan2(s.velocity.x, -s.velocity.z),
      ejercicio: o.interceptarUnRadial(),
      navMhz: radio.navMhz,
      curso: radio.curso,
      navId: l?.emisora?.estacion.id ?? null,
      radial: l?.radial ?? null,
      desviacion: l?.desviacion ?? null,
      toFrom: l?.toFrom ?? null,
      bandera: l?.bandera ?? true,
      tarjeta: o.tarjeta?.()?.dibujo ?? null,
      textoDeLaTarjeta: document.querySelector(".senal")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      reloj: j.clock?.elapsedTime ?? 0,
      // El viento donde está el avión, hacia dónde va, m/s; y la verdadera, m/s.
      viento: j.vientoAqui?.aire ?? { x: 0, z: 0 },
      verdadera: s.airspeed,
    };
  });

/** Lo que no es del ejercicio, mirado en cada lectura mientras dura. Ver `lo-ajeno-al-ejercicio.mjs`. */
const ajeno = vigilarLoAjeno();
const leer = async (page) => {
  const r = await leerSolo(page);
  await ajeno.mirar(page, r.ejercicio && r.ejercicio.fase !== "cerrada");
  return r;
};
/** El lado de la barra en el nombre del dibujo de la tarjeta. */
const ladoDe = (d) => ((d ?? 0) >= 0 ? "derecha" : "izquierda");

/** El rumbo del automático, rad verdaderos, como lo lleva el juego. */
const rumboAlAutomatico = (page, rumbo) =>
  page.evaluate((r) => {
    const j = globalThis.__oga.juegoParaTrazas();
    if (j.objetivos) j.objetivos.rumbo = r;
  }, rumbo);

const centrado = (g) => ((((g + 180) % 360) + 360) % 360) - 180;
const GRADO = Math.PI / 180;

let codigo = 0;
try {
  console.log(`\n${NOMBRE}`);
  const contexto = await navegador.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    hasTouch: false,
  });
  const page = await contexto.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  const viento = VIENTO ? `&viento=${VIENTO}` : "";
  await page.goto(`${BASE}/?escenario=fuerteventura&hora=12&tramo=taguato-ruvicha&avion=${AVION}&ejercicio=interceptar${viento}`);
  await page.waitForFunction(() => globalThis.__oga?.interceptarUnRadial?.()?.pedido != null, null, { timeout: 120000 });
  await pausa(3000);
  const foto = async (n) => {
    const ruta = `${SALIDA}/${NOMBRE}-${n}.png`;
    await page.screenshot({ path: ruta });
    const cuadro = page.locator(".cuadro").first();
    if (await cuadro.count()) await cuadro.screenshot({ path: `${SALIDA}/${NOMBRE}-${n}-cuadro.png` }).catch(() => {});
    console.log(`    foto: ${ruta}`);
  };
  const tarjeta = await page.evaluate(() => {
    const g = document.createElement("canvas").getContext("webgl");
    const i = g?.getExtension("WEBGL_debug_renderer_info");
    return i ? g.getParameter(i.UNMASKED_RENDERER_WEBGL) : "sin WebGL";
  });
  console.log(`    tarjeta: ${tarjeta}`);

  let r = await leer(page);
  const est = r.ejercicio.estacion;
  const c = r.ejercicio.colocacion;
  const pedido = r.ejercicio.pedido;
  const cursoV = (pedido - est.declinacion) * GRADO;
  const lejos0 = Math.hypot(est.x - r.x, est.z - r.z);
  comprobar(
    "empieza en el aire, a cinco millas del VOR",
    r.y > 500 && Math.abs(lejos0 / 1852 - 5) < 0.6,
    `${(lejos0 / 1852).toFixed(1)} NM, ${Math.round(r.y)} m, pide el ${pedido}, OBS en el ${r.curso}`,
  );
  comprobar(
    "la NAV con FTV y el OBS en el radial de debajo, con la barra en el centro",
    // Casi en el centro: desde que empieza, el avión ya va cruzando radiales hacia el pedido.
    r.navId === est.id && r.curso === c?.curso && r.toFrom === "FROM" && Math.abs(r.desviacion ?? 99) < 4,
    `${r.navId}, OBS ${r.curso}, ${r.toFrom} ${r.desviacion?.toFixed(2)}°`,
  );
  const escrito = `R-${String(pedido).padStart(3, "0")} ${est.id}`;
  comprobar("la tarjeta escribe el radial pedido", r.textoDeLaTarjeta.includes(escrito), `«${r.textoDeLaTarjeta.slice(0, 90)}»`);
  comprobar(
    "el morro, a cuarenta y cinco grados del curso",
    Math.abs(Math.abs(centrado((r.rumbo - cursoV) / GRADO)) - 45) < 3,
    `${centrado((r.rumbo - cursoV) / GRADO).toFixed(1)}°`,
  );
  await foto("01-salida");

  // El automático, con el rumbo de la cortada: lo que haría quien sostiene el avión.
  await page.evaluate(() => globalThis.__oga.pilotoAutomatico(true));
  await rumboAlAutomatico(page, r.rumbo);

  // El OBS al pedido: la tecla apretada —la rueda que sigue girando— y luego de toque en toque.
  const tecla = centrado(pedido - r.curso) > 0 ? "Digit0" : "Digit9";
  for (let i = 0; i < 200 && Math.abs(centrado(pedido - r.curso)) > 3; i++) {
    await page.keyboard.down(tecla);
    if (i % 5 === 4) r = await leer(page);
  }
  await page.keyboard.up(tecla);
  r = await leer(page);
  for (let i = 0; i < 12 && r.curso !== pedido; i++) {
    await page.keyboard.press(centrado(pedido - r.curso) > 0 ? "Digit0" : "Digit9");
    await pausa(80);
    r = await leer(page);
  }
  await pausa(300);
  r = await leer(page);
  comprobar(
    "con el OBS en el pedido la barra se va a tope, con FROM",
    r.curso === pedido && r.toFrom === "FROM" && Math.abs(r.desviacion ?? 0) >= 10 && r.ejercicio.fase === "cortar",
    `OBS ${r.curso}, ${r.toFrom} ${r.desviacion?.toFixed(1)}°, fase ${r.ejercicio.fase}, tarjeta ${r.tarjeta}`,
  );
  comprobar(
    "y la tarjeta dibuja la barra a tope del lado en que está",
    r.tarjeta === `cdi-a-la-${ladoDe(r.desviacion)}`,
    `barra ${r.desviacion?.toFixed(1)}°, tarjeta ${r.tarjeta}`,
  );
  await foto("02-a-tope");

  const puestas = await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
  console.log(`    reloj por ${puestas}`);

  // A cortar hasta que la barra se despega.
  const fin1 = Date.now() + 4 * 60000;
  while (Date.now() < fin1 && r.ejercicio.fase === "cortar") {
    await pausa(150);
    r = await leer(page);
  }
  const lado = Math.sign(r.desviacion ?? 1);
  comprobar(
    "la barra se despega del tope y lo dice la tarjeta",
    r.ejercicio.fase === "acercarse" && Math.abs(r.desviacion ?? 99) < 10 && r.tarjeta === `cdi-viniendo-de-la-${ladoDe(r.desviacion)}`,
    `${r.desviacion?.toFixed(1)}°, a ${(Math.hypot(est.x - r.x, est.z - r.z) / 1852).toFixed(1)} NM, tarjeta ${r.tarjeta}`,
  );
  // Con la tarjeta todavía a la vista: a cuatro veces, sus doce segundos son tres.
  await foto("03-barra-despegada");

  /*
   * Quien anticipa vira desde ya, de a poco; quien no, sigue cortando hasta
   * ver la barra en el centro. Los dos, en cuanto siguen la barra, quitan lo
   * que ven que el viento los deriva: el camino contra el morro.
   */
  let siguiendo = !TARDE;
  let fotoViniendo = false;
  let fotoViraje = false;
  let fotoPasado = false;
  let sePaso = 0;
  let ajuste = 0;
  let antes = r.reloj;
  let empezoCon = siguiendo ? Math.abs(r.desviacion ?? 0) : null;
  let tarjetaPasada = null;
  /*
   * **La corrección de viento, muestra a muestra** mientras la barra está en
   * el centro con el morro cerca del curso, que es el rato que promedia el
   * ejercicio: se vacía al salir, como su cuenta. En cada muestra, el morro
   * contra el camino de verdad y contra el que daría el viento que sopla en el
   * modelo sumado a la verdadera por el morro, sin derrape.
   */
  let ventana = [];
  const fin2 = Date.now() + 6 * 60000;
  while (Date.now() < fin2 && r.ejercicio.fase !== "cerrada") {
    r = await leer(page);
    const d = r.curso === pedido && r.toFrom === "FROM" ? r.desviacion : null;
    if (d !== null) {
      if (!siguiendo && (Math.sign(d) !== lado || Math.abs(d) < 0.2)) {
        siguiendo = true;
        empezoCon = Math.abs(d);
      }
      if (Math.sign(d) === -lado) sePaso = Math.max(sePaso, Math.abs(d));
      if (siguiendo) {
        const dt = Math.max(0, r.reloj - antes);
        // Lo que queda, despacio: solo cerca del centro, que lejos es la cortada.
        if (Math.abs(d) < 2) ajuste = Math.max(-8, Math.min(8, ajuste + 0.08 * d * dt));
        const deriva = centrado((r.camino - r.rumbo) / GRADO);
        const quiero = cursoV / GRADO + Math.max(-45, Math.min(45, 4.5 * d)) - deriva + ajuste;
        await rumboAlAutomatico(page, quiero * GRADO);
      }
      if (!fotoViniendo && Math.abs(d) < 6) {
        fotoViniendo = true;
        await foto("03b-barra-viniendo");
      }
      const girado = Math.abs(centrado((r.rumbo - cursoV) / GRADO));
      if (!fotoViraje && siguiendo && girado < 30) {
        fotoViraje = true;
        await foto(TARDE ? "04-viraje-tarde" : "04-viraje-anticipado");
        console.log(`    viraje: el morro a ${girado.toFixed(0)}° del curso con la barra a ${d.toFixed(2)}°`);
      }
    }
    if (!fotoPasado && r.ejercicio.loQueSePaso > 1) {
      fotoPasado = true;
      tarjetaPasada = { tarjeta: r.tarjeta, desviacion: r.desviacion };
      await foto("04b-se-paso");
    }
    if (d !== null && Math.abs(d) < 1 && Math.abs(centrado((r.rumbo - cursoV) / GRADO)) < 15) {
      const gx = r.verdadera * Math.sin(r.rumbo) + r.viento.x;
      const gz = -r.verdadera * Math.cos(r.rumbo) + r.viento.z;
      ventana.push({
        medida: centrado((r.rumbo - r.camino) / GRADO),
        esperada: centrado((r.rumbo - Math.atan2(gx, -gz)) / GRADO),
        kt: Math.hypot(r.viento.x, r.viento.z) / 0.514444,
        verdadera: r.verdadera / 0.514444,
      });
    } else if (r.ejercicio.fase !== "cerrada") ventana = [];
    antes = r.reloj;
    await pausa(100);
  }
  /*
   * La corrección de viento es el morro contra el camino, no contra el curso:
   * quien aún se acerca a la barra lleva el morro unos grados hacia ella,
   * también en calma (lo mismo que mide el ejercicio).
   */
  const morro = centrado((r.rumbo - cursoV) / GRADO);
  const contraElCamino = centrado((r.rumbo - r.camino) / GRADO);
  comprobar(
    TARDE ? "quien vira tarde se pasa, vuelve y queda establecido" : "quien vira al despegarse llega al centro sin pasarse",
    r.ejercicio.cierre === "hecho" && (TARDE ? r.ejercicio.loQueSePaso > 1 : r.ejercicio.loQueSePaso <= 1),
    `empezó a virar con la barra a ${empezoCon?.toFixed(1)}°, se pasó ${r.ejercicio.loQueSePaso.toFixed(2)}° (el piloto vio ${sePaso.toFixed(2)}°)`,
  );
  comprobar(
    "establecido en el radial, a menos de un grado",
    Math.abs(centrado((r.radial ?? 0) - pedido)) < 1,
    `radial ${r.radial?.toFixed(2)}, barra ${r.desviacion?.toFixed(2)}°`,
  );
  comprobar(
    VIENTO ? "en calma, el morro va por donde va el avión" : "con el alisio, el morro contra el viento y no por el camino",
    VIENTO ? Math.abs(contraElCamino) < 3 : contraElCamino < -3,
    `al cerrar, el morro ${contraElCamino.toFixed(1)}° del camino y ${morro.toFixed(1)}° del curso, tarjeta ${r.tarjeta}`,
  );
  const media = (k) => ventana.reduce((a, m) => a + m[k], 0) / Math.max(1, ventana.length);
  const medida = media("medida");
  const esperada = media("esperada");
  const delEjercicio = r.ejercicio.correccion;
  console.log(
    `    corrección, media de ${ventana.length} muestras: el ejercicio ${delEjercicio?.toFixed(1)}°, ` +
      `el banco ${medida.toFixed(1)}°, la que pide el viento ${esperada.toFixed(1)}° ` +
      `(${media("kt").toFixed(1)} kt a ${media("verdadera").toFixed(0)} kt de verdadera; ` +
      `de ${Math.min(...ventana.map((m) => m.medida)).toFixed(1)} a ${Math.max(...ventana.map((m) => m.medida)).toFixed(1)}° muestra a muestra)`,
  );
  comprobar(
    "la corrección que mide el ejercicio es la que pide el viento del modelo, a menos de dos grados",
    ventana.length > 10 && delEjercicio !== null && Math.abs(delEjercicio - esperada) < 2 && Math.abs(medida - esperada) < 2,
    `ejercicio ${delEjercicio?.toFixed(1)}°, banco ${medida.toFixed(1)}°, viento ${esperada.toFixed(1)}°`,
  );
  if (TARDE)
    comprobar(
      "al pasarse, la tarjeta dibuja la barra del lado al que se fue",
      tarjetaPasada !== null && tarjetaPasada.tarjeta === `cdi-pasada-a-la-${ladoDe(tarjetaPasada.desviacion)}`,
      `barra ${tarjetaPasada?.desviacion?.toFixed(1)}°, tarjeta ${tarjetaPasada?.tarjeta}`,
    );
  // Nada que no sea del ejercicio (H26f): ni la fase del plan, ni la torre, ni la frecuencia, ni la ventanilla.
  await ajeno.comprobar(page, comprobar, /^cdi-/);
  await pausa(500);
  await foto("05-en-el-radial");
  // El panel del final, con la traza en el plano: ocho segundos y medio de juego después.
  await pausa(4000);
  await foto("06-final");
  comprobar("sin errores en la página", errores.length === 0, errores.join(" | "));
  await contexto.close();
} catch (e) {
  console.error(e);
  codigo = 1;
} finally {
  await navegador.close();
  await server.close();
}
const mal = resultados.filter((x) => !x.ok).length;
console.log(`\n${resultados.length - mal}/${resultados.length} bien`);
process.exit(mal || codigo ? 1 : 0);

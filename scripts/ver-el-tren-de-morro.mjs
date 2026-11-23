/**
 * **El tren de nariz que no sale, mirado** (ADR 0014, enmiendas H70 y H70b):
 * el JAZ 40 en Gran Canaria con el peldaño de Taguató.
 *
 *   node scripts/ver-el-tren-de-morro.mjs <carpeta>
 *
 * Despega de verdad unos segundos —el ejercicio solo cuenta un tren metido
 * después de correr—, se pone en el aire, mete el tren y lo saca: la rueda de
 * morro se queda en su pozo. Entonces:
 *
 * - el avión por fuera, de costado y desde abajo por delante: las principales
 *   fuera y la de morro en su pozo;
 * - las luces del tren en el cuadro plano —dos verdes, la de en medio apagada
 *   y la roja del panel de avisos— y en la cabina, en la esfera del tren;
 * - y el dibujo del ejercicio en el hangar, en «¿A qué jugás?».
 *
 * Con `OGA_GPU=1`, con la tarjeta de verdad. El puerto, `OGA_PUERTO`.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync, writeFileSync } from "node:fs";
import { baseDe } from "./servidor.mjs";

const SALIDA = process.argv[2] ?? "capturas-tren-de-morro";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5687);
const CON_GPU = process.env.OGA_GPU === "1";
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
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok: !!ok });
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? `  —  ${detalle}` : ""}`);
};
const guardarDataUrl = (nombre, url) => {
  const ruta = `${SALIDA}/${nombre}.png`;
  writeFileSync(ruta, Buffer.from(url.replace(/^data:image\/png;base64,/, ""), "base64"));
  console.log(`    foto: ${ruta}`);
};

let codigo = 0;
try {
  // ── En vuelo ──────────────────────────────────────────────────────────
  const contexto = await navegador.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "es-PY",
  });
  const page = await contexto.newPage();
  page.on("pageerror", (e) => console.log("  ERROR:", e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(
    `${BASE}/?escenario=gran-canaria&hora=12&avion=jaz-40&tramo=taguato&ejercicio=tren-de-morro&meteo=&viento=000/00`,
  );
  await page.waitForFunction(
    () => globalThis.__oga?.estado?.() && globalThis.__oga?.aeronave?.().deVerdad,
    null,
    { timeout: 120000 },
  );
  await pausa(6000);
  const tarjeta = await page.evaluate(() => {
    const gl = globalThis.__oga.pintor().getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre";
  });
  console.log(`\n  tarjeta: ${tarjeta}`);

  const estado = await page.evaluate(async () => {
    const o = globalThis.__oga;
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    const acota = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    o.reiniciar();
    await espera(500);
    /*
     * Unos segundos de carrera, que es lo que el ejercicio pide para contar
     * el tren metido (`yaCorrio` en `flight/practica.ts`), y después al aire.
     */
    o.pilotar((c) => {
      c.engineOn = true;
      c.throttle = 1;
      c.brakes = 0;
      c.elevator = 0;
    });
    await espera(7000);
    const fase = o.fase();
    const t = o.puntoDeFinal(4000);
    const cota = o.cotaDePistaDeAhora(t.x, t.z);
    const nivelado = (c) => {
      const s = o.estado();
      const a = o.actitud();
      c.engineOn = true;
      c.throttle = 0.55;
      c.brakes = 0;
      c.elevator = acota(2.5 * (0.04 - a.cabeceo) - 1.2 * s.pitchRate, -1, 1);
      c.aileron = acota(-1.6 * a.alabeo - 0.3 * s.rollRate, -0.6, 0.6);
      c.rudder = 0;
    };
    o.colocar(t.x, cota + 450, t.z, 50, t.h);
    o.pilotar(nivelado);
    o.pedirFlaps(0);
    /*
     * Con el peso encima la palanca no se mueve (`sePuedeMeter`), y recién
     * colocado el modelo todavía no ha dado el paso que lo saca del suelo:
     * se pide cuando ya vuela, y otra vez si no se movió.
     */
    for (let i = 0; i < 50 && o.estado().onGround; i++) await espera(100);
    for (let k = 0; k < 5 && o.controles().tren >= 1; k++) {
      o.pedirTren(false);
      await espera(1500);
    }
    for (let i = 0; i < 200 && o.controles().tren > 0; i++) await espera(100);
    await espera(1000);
    const metido = o.controles().tren;
    o.colocar(t.x, cota + 450, t.z, 50, t.h);
    o.pedirTren(true);
    for (let i = 0; i < 200 && o.controles().tren < 1; i++) await espera(100);
    await espera(1500);
    // Y otra vez en su sitio, recto y a nivel, para las fotos.
    o.colocar(t.x, cota + 450, t.z, 50, t.h);
    await espera(800);
    const ej = o.ejercicio();
    return { fase, metido, fuera: o.controles().tren, dentro: ej?.morro?.dentro ?? null, averia: ej?.averia?.que ?? null };
  });
  comprobar(
    "la rueda de morro se queda en su pozo con el tren pedido fuera",
    estado.dentro === true && estado.fuera >= 1,
    `fase al correr ${estado.fase} · metido ${estado.metido} · fuera ${estado.fuera} · avería ${estado.averia} · morro dentro ${estado.dentro}`,
  );

  // ── El avión por fuera ────────────────────────────────────────────────
  const fotos = await page.evaluate(() => {
    const o = globalThis.__oga;
    const s = o.estado();
    const g = o.aeronave().grupo;
    const V = g.position.constructor;
    const Camara = o.camaraViva().constructor;
    const lienzo = o.pintor().domElement;
    const ancho = lienzo.width;
    const alto = lienzo.height;
    g.updateWorldMatrix(true, true);
    const delante = new V(0, 0, -1).applyQuaternion(s.orientation);
    const arriba = new V(0, 1, 0).applyQuaternion(s.orientation);
    const izquierda = new V().crossVectors(arriba, delante).normalize();
    const pintor = o.pintor();
    const escena = o.escena();
    const vista = (desde, mira, fov) => {
      const cam = new Camara(fov, ancho / alto, 0.2, 20000);
      cam.position.copy(desde);
      cam.up.copy(arriba);
      cam.lookAt(mira);
      cam.updateMatrixWorld();
      pintor.setRenderTarget(null);
      pintor.render(escena, cam);
      return pintor.domElement.toDataURL("image/png");
    };
    const centro = s.position.clone().addScaledVector(delante, 1.2).addScaledVector(arriba, -0.6);
    // De costado y un poco por debajo: las principales y el morro.
    const costado = vista(
      centro.clone().addScaledVector(izquierda, 11).addScaledVector(arriba, -2.2),
      centro,
      34,
    );
    // Desde abajo y por delante: el pozo de la de morro y las dos principales.
    const morro = s.position.clone().addScaledVector(delante, 3);
    const abajo = vista(
      morro.clone().addScaledVector(delante, 7).addScaledVector(arriba, -4.5).addScaledVector(izquierda, 3.5),
      s.position.clone().addScaledVector(delante, 1).addScaledVector(arriba, -0.6),
      40,
    );
    return { costado, abajo };
  });
  guardarDataUrl("1-por-fuera-de-costado", fotos.costado);
  guardarDataUrl("2-por-fuera-desde-abajo", fotos.abajo);

  // ── Las luces, en el cuadro plano ─────────────────────────────────────
  await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
  await pausa(1500);
  const plano = await page.evaluate(() => {
    const ruedas = [...document.querySelectorAll('[data-cristal="tren"] [data-pata]')].map((r) =>
      r.classList.contains("cr--dentro") ? "apagada" : r.classList.contains("cr--moviendose") ? "ámbar" : "verde",
    );
    const roja = document.querySelector('[data-hud="tablero"] [data-luz="tren"]');
    return { ruedas, roja: roja?.getAttribute("visibility") ?? "sin luz" };
  });
  comprobar(
    "en el cuadro plano: dos verdes, la de en medio apagada, y la roja encendida",
    JSON.stringify(plano.ruedas) === JSON.stringify(["verde", "apagada", "verde"]) && plano.roja === "visible",
    `${plano.ruedas.join(" · ")} · roja ${plano.roja}`,
  );
  await page.screenshot({ path: `${SALIDA}/3-luces-en-el-cuadro-plano.png` });
  console.log(`    foto: ${SALIDA}/3-luces-en-el-cuadro-plano.png`);
  // De cerca: la mitad izquierda del cuadro, de la visera —donde se enciende la roja— a las ruedas.
  const caja = await page.locator('[data-hud="tablero"]').first().boundingBox();
  if (caja) {
    await page.screenshot({
      path: `${SALIDA}/3b-luces-en-el-cuadro-plano-de-cerca.png`,
      clip: { x: caja.x, y: caja.y, width: Math.min(caja.width, 480), height: caja.height },
    });
    console.log(`    foto: ${SALIDA}/3b-luces-en-el-cuadro-plano-de-cerca.png`);
  }

  // ── Y en la cabina ────────────────────────────────────────────────────
  await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
  await pausa(2500);
  await page.screenshot({ path: `${SALIDA}/4-luces-en-la-cabina.png` });
  console.log(`    foto: ${SALIDA}/4-luces-en-la-cabina.png`);
  // La esfera del tren, de cerca: la cámara de la cabina, más cerrada y hacia ella.
  const esfera = await page.evaluate(() => {
    const o = globalThis.__oga;
    const uuid = o.relojes().find((r) => r.que === "tren")?.uuid;
    let reloj = null;
    o.aeronave().grupo.traverse((m) => {
      if (!reloj && m.uuid === uuid) reloj = m;
    });
    if (!reloj) return null;
    const viva = o.camaraViva();
    const cam = viva.clone();
    const V = viva.position.constructor;
    const donde = new V();
    reloj.getWorldPosition(donde);
    cam.fov = 9;
    cam.lookAt(donde);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const pintor = o.pintor();
    pintor.setRenderTarget(null);
    pintor.render(o.escena(), cam);
    return { nombre: reloj.name, url: pintor.domElement.toDataURL("image/png") };
  });
  if (esfera) guardarDataUrl("4b-la-esfera-del-tren-de-cerca", esfera.url);
  else console.log("    (no encontré la esfera del tren por su nombre)");
  await contexto.close();

  // ── El dibujo del ejercicio en el hangar ──────────────────────────────
  const hangar = await navegador.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-PY" });
  const h = await hangar.newPage();
  h.on("pageerror", (e) => console.log("  ERROR:", e.message.slice(0, 200)));
  await h.addInitScript(() => {
    if (localStorage.getItem("oga-veve:guardado") === null) {
      localStorage.setItem("oga-veve:cuaderno", JSON.stringify({ despegues: 1, segundos: 600 }));
      localStorage.setItem("oga-veve:escenario", "gran-canaria");
      localStorage.setItem("oga-veve:teclas-vistas", "1");
    }
  });
  await h.goto(`${BASE}/`);
  await h.waitForSelector(".piloto__boton", { timeout: 60000 });
  await h.click(".piloto__boton");
  await h.waitForSelector(".ficha--sitio", { timeout: 60000 });
  await pausa(400);
  const tocar = async (sel) => {
    const el = h.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    await el.click();
    await pausa(400);
  };
  await tocar('[data-pantalla="quien"]');
  await tocar('[data-tramo="taguato"]');
  await tocar('[data-pantalla="conque"]');
  await tocar('[data-avion="jaz-40"]');
  await tocar('[data-pantalla="que"]');
  const ficha = h.locator('[data-ejercicio="tren-de-morro"]').first();
  const hay = (await ficha.count()) > 0;
  comprobar("en el hangar sale el ejercicio, con su dibujo", hay && (await ficha.locator("svg").count()) > 0);
  if (hay) {
    // En medio de la pantalla: la barra de abajo tapa la última fila.
    await ficha.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await pausa(800);
    await h.screenshot({ path: `${SALIDA}/5-hangar.png` });
    await ficha.screenshot({ path: `${SALIDA}/5b-hangar-la-ficha.png` });
    console.log(`    foto: ${SALIDA}/5-hangar.png`);
    console.log(`    foto: ${SALIDA}/5b-hangar-la-ficha.png`);
  }
  await hangar.close();
} catch (e) {
  console.log("  FALLO:", e.message);
  codigo = 1;
} finally {
  await navegador.close();
  await server.close();
}
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length}`);
process.exit(codigo || (bien === resultados.length ? 0 : 1));

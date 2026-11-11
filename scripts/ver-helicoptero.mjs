/**
 * **El Super Puma en el juego de verdad**: `?avion=super-puma`, escondido, en
 * Tenerife Norte y desde el helipuerto del Ejército. Ver `flight/helicoptero-en-el-juego.ts` y
 * el paso 3 del ADR 0026.
 *
 * Lo vuela entero un piloto de banco que escribe en los mandos del juego —el
 * gas es el colectivo, la profundidad y los alerones el cíclico— y mira:
 *
 * - **Que empieza posado en el helipuerto**, con el rotor en sus vueltas.
 * - **Que despega subiendo el colectivo**, sin tocar nada más.
 * - **Que se queda en estacionario**: medio minuto a diez metros sin irse.
 * - **Que avanza con el cíclico** y se para al soltarlo.
 * - **Que vuelve, baja y se posa** en el helipuerto, suave y entero.
 * - Y en pantalla, **NR y TQ** con sus cifras, y ninguno de los mandos de avión
 *   que no lleva: ni flaps, ni tren, ni aerofrenos, ni piloto automático.
 *
 * Saca capturas de fuera, del HUD y de la cabina con `OGA_FOTOS=<carpeta>`.
 * `OGA_GPU=1` como los demás; `OGA_TRAMO` para el peldaño (de fábrica
 * `guyrami`, el de la estabilización de estacionario: el piloto de banco pide
 * velocidad con el cíclico, que es lo que hace ese nivel).
 *
 * Uso: `OGA_PUERTO=5601 OGA_FOTOS=fotos node scripts/ver-helicoptero.mjs`
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = Number(process.env.OGA_PUERTO ?? 5601);
const FOTOS = process.env.OGA_FOTOS ?? null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const TRAMO = process.env.OGA_TRAMO ?? "guyrami";
/*
 * **En calma de fábrica**, para mirar los mandos sin el viento por medio;
 * `OGA_VIENTO=025/20` (de dónde y nudos) para volarlo con el alisio de Gando.
 */
const VIENTO = process.env.OGA_VIENTO ?? "000/0";
const ANCHO = 1280;
const ALTO = 800;

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await createServer({ root: process.cwd(), server: { port: PUERTO, hmr: false }, logLevel: "warn" });
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
const comprobar = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok: !!ok, detalle });
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? `  —  ${detalle}` : ""}`);
};

let codigo = 1;
try {
  const page = await navegador.newPage({ viewport: { width: ANCHO, height: ALTO }, locale: "es-PY" });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  // Con el tiempo de casa y sin parte de verdad, como los demás bancos: `&meteo=` vacío.
  await page.goto(`${BASE}/?avion=super-puma&tramo=${TRAMO}&hora=12&meteo=&viento=${VIENTO}`);
  await page.waitForFunction(() => globalThis.__oga?.helicoptero?.() != null, null, { timeout: 120_000 });
  // El suelo se asienta unos segundos después de abrir y recoloca la aeronave.
  await pausa(15_000);

  const foto = async (nombre, opciones = {}) => {
    if (!FOTOS) return;
    await page.screenshot({ path: `${FOTOS}/${nombre}.png`, ...opciones });
    console.log(`    foto: ${FOTOS}/${nombre}.png`);
  };
  const leer = () =>
    page.evaluate(() => {
      const o = globalThis.__oga;
      const s = o.estado();
      const h = o.helicoptero();
      const p = h.helipuerto;
      return {
        x: s.position.x,
        y: s.position.y,
        z: s.position.z,
        alto: s.heightAboveGround,
        vs: s.verticalSpeed,
        gs: s.groundSpeed,
        enTierra: s.onGround,
        roto: s.crashed,
        toma: s.touchdownSinkRate,
        rumbo: (s.heading * 180) / Math.PI,
        alHelipuerto: p ? Math.hypot(s.position.x - p.x, s.position.z - p.z) : Infinity,
        nr: h.nr,
        par: h.par,
        rpm: h.rpm,
        colectivo: h.mandos.colectivo,
        gas: o.controles().throttle,
        cabeceo: (h.actitud.cabeceo * 180) / Math.PI,
        alabeo: (h.actitud.alabeo * 180) / Math.PI,
        rotor: h.anguloDelRotor,
        percance: h.percance,
        fase: globalThis.__banco?.fase ?? null,
        vista: o.vista(),
        senal: o.tarjeta()?.dibujo ?? null,
        faseDelJuego: o.fase(),
        dicho: Object.values(o.dicho()).filter(Boolean),
      };
    });
  /*
   * **Lo que el juego dice y enseña mientras tanto**, para ver si se cuela algo
   * de avión: las fases del plan, los dibujos de la señal y lo que dice la
   * instructora.
   */
  const visto = { senales: new Set(), fases: new Set(), dicho: new Set(), percances: new Set() };
  const leerYApuntar = leer;
  const leerApuntando = async () => {
    const r = await leerYApuntar();
    if (r.senal) visto.senales.add(r.senal);
    if (r.faseDelJuego) visto.fases.add(r.faseDelJuego);
    for (const d of r.dicho) visto.dicho.add(d);
    if (r.percance) visto.percances.add(r.percance);
    return r;
  };

  // ── Posado ─────────────────────────────────────────────────────────────
  console.log("\nPosado en el helipuerto");
  const posado = await leerApuntando();
  comprobar(
    "empieza posado en el helipuerto del Ejército, junto a Los Rodeos",
    posado.enTierra && posado.alHelipuerto < 5,
    `a ${posado.alHelipuerto.toFixed(1)} m de su centro, ${posado.enTierra ? "en tierra" : "en el aire"}`,
  );
  comprobar("con el rotor en sus vueltas", Math.abs(posado.nr - 1) < 0.03, `NR ${(posado.nr * 100).toFixed(0)} %, ${posado.rpm.toFixed(0)} rpm`);
  await pausa(500);
  const giro = await leerApuntando();
  comprobar(
    "y el rotor de la silueta girando",
    giro.rotor !== null && giro.rotor !== posado.rotor,
    `de ${posado.rotor?.toFixed(2)} a ${giro.rotor?.toFixed(2)} rad`,
  );

  const pantalla = await page.evaluate(() => {
    const visible = (q) => {
      const el = document.querySelector(q);
      if (!el || el.hidden || el.closest("[hidden]")) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const texto = (q) => document.querySelector(q)?.textContent?.trim() ?? null;
    return {
      nr: visible('[data-hud="tarjeta-rotor"]'),
      tq: visible('[data-hud="tarjeta-par"]'),
      nrValor: texto('[data-hud="rotor"]'),
      tqValor: texto('[data-hud="par"]'),
      rotulos: [...document.querySelectorAll(".medidor__etiqueta")].map((e) => e.textContent.trim()),
      flaps: visible('[data-hud="flaps-touch"]'),
      tren: visible('[data-hud="tren-touch"]'),
      aerofrenos: visible('[data-hud="aerofrenos-touch"]'),
      reversa: visible('[data-hud="reversa"]'),
      automatico: visible('[data-hud="piloto-auto"]'),
    };
  });
  comprobar(
    "NR y TQ en pantalla, con sus cifras",
    pantalla.nr && pantalla.tq && Number(pantalla.nrValor) > 90,
    `NR «${pantalla.nrValor}» · TQ «${pantalla.tqValor}» · rótulos ${pantalla.rotulos.join(", ")}`,
  );
  comprobar(
    "ninguno de los mandos de avión que no lleva",
    !pantalla.flaps && !pantalla.tren && !pantalla.aerofrenos && !pantalla.reversa && !pantalla.automatico,
    `flaps ${pantalla.flaps}, tren ${pantalla.tren}, aerofrenos ${pantalla.aerofrenos}, reversa ${pantalla.reversa}, automático ${pantalla.automatico}`,
  );
  await foto("1-posado-fuera");
  await foto("1-posado-hud-derecha", { clip: { x: ANCHO - 420, y: 0, width: 420, height: ALTO } });

  /*
   * ── El piloto de banco ──────────────────────────────────────────────────
   *
   * Escribe en los mandos del juego en cada fotograma. El colectivo lleva la
   * altura con un lazo sencillo sobre la velocidad vertical, empezando por el
   * colectivo del estacionario que dice el modelo; el cíclico, en la
   * estabilización de estacionario, pide velocidad sobre el suelo, así que para
   * ir a un sitio basta con pedirle la que lleva hasta él.
   */
  await page.evaluate(() => {
    const o = globalThis.__oga;
    const b = (globalThis.__banco = { fase: "subir", alto: 10, integral: 0, antes: o.reloj(), destino: null, rapido: 0 });
    o.pilotar((c) => {
      const s = o.estado();
      const h = o.helicoptero();
      const ahora = o.reloj();
      const dt = Math.min(0.1, Math.max(0, ahora - b.antes));
      b.antes = ahora;
      c.elevator = 0;
      c.aileron = 0;
      c.rudder = 0;
      const colectivo = (ritmo) => {
        const falta = ritmo - s.verticalSpeed;
        b.integral = Math.max(-0.3, Math.min(0.3, b.integral + falta * dt * 0.05));
        c.throttle = Math.max(0, Math.min(1, h.estacionario + b.integral + 0.08 * falta));
      };
      const altura = (objetivo) => colectivo(Math.max(-1.5, Math.min(1.5, 0.5 * (objetivo - s.heightAboveGround))));
      /** El cíclico que lleva a (x, z): la velocidad que hace falta, en ejes de la aeronave. */
      const ir = (x, z, tope) => {
        const dx = x - s.position.x;
        const dz = z - s.position.z;
        const r = h.actitud.rumbo;
        const adelante = dx * Math.sin(r) - dz * Math.cos(r);
        const derecha = dx * Math.cos(r) + dz * Math.sin(r);
        const quiere = (d) => Math.max(-tope, Math.min(tope, 0.25 * d));
        /*
         * +1 de profundidad es tirar, morro arriba: hacia atrás. A tope, adelante y atrás
         * piden 40 m/s sobre el suelo (`VA_EN_ESTACIONARIO` en `flight/helicoptero.ts`), y a
         * los lados, despacio, ocho. Con los ocho de antes en los dos ejes, la vuelta pedía
         * cinco veces más de lo que quería y llegaba lanzado al helipuerto.
         */
        c.elevator = -quiere(adelante) / 40;
        c.aileron = quiere(derecha) / 8;
        return Math.hypot(dx, dz);
      };
      if (b.fase === "subir") {
        // Se sube la palanca poco a poco hasta que despega, y entonces manda el lazo.
        if (s.onGround && !b.despego) {
          b.gas = Math.min(1, (b.gas ?? 0) + 0.12 * dt);
          c.throttle = b.gas;
        } else {
          b.despego = true;
          altura(b.alto);
        }
      } else if (b.fase === "quieto") {
        altura(b.alto);
      } else if (b.fase === "adelante") {
        altura(b.alto);
        c.elevator = -0.6;
      } else if (b.fase === "volver") {
        altura(b.alto);
        b.lejos = ir(b.destino.x, b.destino.z, 6);
      } else if (b.fase === "bajar") {
        b.lejos = ir(b.destino.x, b.destino.z, 1.5);
        colectivo(s.heightAboveGround > 4 ? -1 : -0.4);
        if (s.onGround) {
          b.fase = "posado";
          b.gas = c.throttle;
        }
      } else if (b.fase === "posado") {
        b.gas = Math.max(0, (b.gas ?? c.throttle) - 0.2 * dt);
        c.throttle = b.gas;
      }
    });
  });

  const esperar = async (cond, segundos, cada = 250) => {
    const hasta = Date.now() + segundos * 1000;
    let r = await leerApuntando();
    while (!cond(r) && Date.now() < hasta) {
      await pausa(cada);
      r = await leerApuntando();
    }
    return r;
  };

  // ── Despegue ───────────────────────────────────────────────────────────
  console.log("\nDespegue con el colectivo");
  const t0 = Date.now();
  const enElAire = await esperar((r) => !r.enTierra && r.alto > 2.5, 60);
  comprobar(
    "despega subiendo el colectivo",
    !enElAire.enTierra && !enElAire.roto,
    `en ${((Date.now() - t0) / 1000).toFixed(0)} s, colectivo ${(enElAire.colectivo * 100).toFixed(0)} %, estacionario según el modelo ${(
      (await page.evaluate(() => globalThis.__oga.helicoptero().estacionario)) * 100
    ).toFixed(0)} %`,
  );
  const arriba = await esperar((r) => Math.abs(r.alto - 10 - 1.8) < 1.5 && Math.abs(r.vs) < 0.4, 40);
  await foto("2-despegando-fuera");

  // ── Estacionario ───────────────────────────────────────────────────────
  console.log("\nEstacionario a diez metros");
  await page.evaluate(() => (globalThis.__banco.fase = "quieto"));
  await pausa(5000);
  const desde = await leerApuntando();
  let peorVs = 0;
  let peorAlabeo = 0;
  let nrMin = Infinity;
  let nrMax = 0;
  let parMax = 0;
  for (let i = 0; i < 30; i++) {
    await pausa(500);
    const r = await leerApuntando();
    peorVs = Math.max(peorVs, Math.abs(r.vs));
    peorAlabeo = Math.max(peorAlabeo, Math.abs(r.alabeo));
    nrMin = Math.min(nrMin, r.nr);
    nrMax = Math.max(nrMax, r.nr);
    parMax = Math.max(parMax, r.par);
  }
  const quieto = await leerApuntando();
  const deriva = Math.hypot(quieto.x - desde.x, quieto.z - desde.z);
  comprobar(
    "se queda en estacionario quince segundos sin irse",
    deriva < 5 && peorVs < 1 && !quieto.enTierra,
    `deriva ${deriva.toFixed(1)} m, ${quieto.alto.toFixed(1)} m sobre el suelo (centro de gravedad), V/S peor ${peorVs.toFixed(2)} m/s, alabeo peor ${peorAlabeo.toFixed(1)}°`,
  );
  comprobar(
    "con las vueltas del rotor en las de la ficha",
    nrMin > 0.95 && nrMax < 1.05,
    `NR ${(nrMin * 100).toFixed(1)}–${(nrMax * 100).toFixed(1)} %, TQ hasta ${(parMax * 100).toFixed(0)} %, colectivo ${(quieto.colectivo * 100).toFixed(0)} %`,
  );
  await foto("3-estacionario-fuera");
  await foto("3-estacionario-hud-derecha", { clip: { x: ANCHO - 420, y: 0, width: 420, height: ALTO } });
  // Y desde la cabina, si se puede.
  const vistas = await page.evaluate(() => {
    const o = globalThis.__oga;
    const antes = o.vista();
    return { antes, ahora: o.ponerVista("cockpit") };
  });
  await pausa(1200);
  if (vistas.ahora === "cockpit") await foto("4-cabina");
  comprobar("la vista de cabina se puede poner", vistas.ahora === "cockpit", `de «${vistas.antes}» a «${vistas.ahora}»`);
  await page.evaluate((v) => globalThis.__oga.ponerVista(v), vistas.antes);
  await pausa(800);

  // ── Adelante ───────────────────────────────────────────────────────────
  console.log("\nAdelante con el cíclico, a treinta metros");
  // Por encima de los hangares y la terminal: a diez metros, adelante hay un edificio.
  await page.evaluate(() => (globalThis.__banco.alto = 30));
  await esperar((r) => Math.abs(r.alto - 30) < 1.5 && Math.abs(r.vs) < 0.4, 40);
  const salida = await leerApuntando();
  await page.evaluate(() => (globalThis.__banco.fase = "adelante"));
  let gsMax = 0;
  for (let i = 0; i < 24; i++) {
    await pausa(500);
    const r = await leerApuntando();
    gsMax = Math.max(gsMax, r.gs);
    if (i === 14) await foto("5-adelante-fuera");
  }
  const lejos = await leerApuntando();
  const recorrido = Math.hypot(lejos.x - salida.x, lejos.z - salida.z);
  comprobar(
    "avanza con el cíclico adelante",
    recorrido > 40 && gsMax > 5,
    `${recorrido.toFixed(0)} m en 12 s, hasta ${gsMax.toFixed(1)} m/s (${(gsMax * 1.944).toFixed(0)} kt), morro ${lejos.cabeceo.toFixed(1)}°, a ${lejos.alto.toFixed(1)} m`,
  );
  await page.evaluate(() => (globalThis.__banco.fase = "quieto"));
  const parado = await esperar((r) => r.gs < 0.5, 25);
  comprobar("y al soltar el cíclico se para solo", parado.gs < 0.5, `${parado.gs.toFixed(2)} m/s tras soltarlo`);

  // ── Vuelta y toma ──────────────────────────────────────────────────────
  console.log("\nVuelta al helipuerto y toma");
  await page.evaluate(() => {
    const b = globalThis.__banco;
    b.destino = globalThis.__oga.helicoptero().helipuerto;
    b.fase = "volver";
  });
  const desdeLejos = parado.alHelipuerto;
  const encima = await esperar((r) => r.alHelipuerto < 2 && r.gs < 0.6, 90);
  comprobar(
    "vuelve sobre el helipuerto",
    desdeLejos > 40 && encima.alHelipuerto < 3 && !encima.percance,
    `desde ${desdeLejos.toFixed(0)} m, se queda a ${encima.alHelipuerto.toFixed(1)} m, ${encima.gs.toFixed(2)} m/s`,
  );
  await page.evaluate(() => (globalThis.__banco.fase = "bajar"));
  const abajo = await esperar((r) => r.enTierra, 60);
  await pausa(3000);
  const final = await leerApuntando();
  comprobar(
    "baja y se posa en el helipuerto, suave y entero",
    final.enTierra && !final.roto && final.alHelipuerto < 5 && final.toma < 1.0,
    `a ${final.alHelipuerto.toFixed(1)} m del centro, tocó a ${final.toma.toFixed(2)} m/s, ${final.roto ? "roto" : "entero"}`,
  );
  await foto("6-posado-otra-vez");
  // Y en un teléfono apaisado, que es donde menos sitio hay para las dos tarjetas.
  if (FOTOS) {
    await page.setViewportSize({ width: 844, height: 390 });
    await pausa(1500);
    const enElTelefono = await page.evaluate(() => {
      const caja = (q) => {
        const r = document.querySelector(q)?.getBoundingClientRect();
        return r ? { x: r.x, y: r.y, ancho: r.width, alto: r.height } : null;
      };
      return { nr: caja('[data-hud="tarjeta-rotor"]'), tq: caja('[data-hud="tarjeta-par"]') };
    });
    const dentro = (c) => c && c.x >= 0 && c.y >= 0 && c.x + c.ancho <= 844 && c.y + c.alto <= 390;
    comprobar(
      "en un teléfono apaisado, NR y TQ caben en la pantalla",
      dentro(enElTelefono.nr) && dentro(enElTelefono.tq),
      JSON.stringify(enElTelefono),
    );
    await foto("7-telefono-apaisado");
    await page.setViewportSize({ width: ANCHO, height: ALTO });
  }
  comprobar(
    "sin percances en todo el vuelo",
    visto.percances.size === 0,
    [...visto.percances].join(", ") || "ninguno",
  );
  comprobar("sin errores en la página", errores.length === 0, errores.slice(0, 3).join(" | "));
  console.log(`\n  señales vistas: ${[...visto.senales].join(", ") || "ninguna"}`);
  console.log(`  fases del juego: ${[...visto.fases].join(", ") || "ninguna"}`);
  console.log(`  dicho: ${[...visto.dicho].join(" · ") || "nada"}`);
  const fin = await page.evaluate(() => globalThis.__oga.finDeVuelo());
  console.log(`  pantalla de fin de vuelo: ${JSON.stringify(fin)}`);

  await page.evaluate(() => globalThis.__oga.pilotar(null));
  const malos = resultados.filter((r) => !r.ok);
  console.log(`\n${resultados.length - malos.length} de ${resultados.length} bien`);
  codigo = malos.length ? 1 : 0;
} catch (e) {
  console.error(e);
} finally {
  await navegador.close();
  await server.close();
}
process.exit(codigo);

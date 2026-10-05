/**
 * **Qué se mueve en un bache, y a qué ritmo**: la medida que va antes de
 * tocar la turbulencia.
 *
 * Enrique: «lo que vibra ahora parece del render». Antes de cambiar nada hay
 * que saber **qué** vibra —el avión en el modelo de vuelo, la cámara respecto
 * al avión o algo que se pinta— y **a qué frecuencia**, que es lo que separa
 * un bache de un temblor. Este banco pone el avión en crucero con el
 * automático, le da turbulencia del camino o aire quieto, y apunta en cada
 * fotograma:
 *
 * - la carga vertical del modelo de vuelo (`loadFactor`) y la ráfaga que se le
 *   dio, que es lo que siente el avión;
 * - la cámara **respecto al avión**, en sus ejes: lo que se mueve la cabeza
 *   sobre el asiento, que es lo único que la cámara añade de suyo;
 * - y el giro del avión fotograma a fotograma.
 *
 * De cada serie saca la desviación típica, el pico y cuánto de ella cae por
 * encima de dos hercios —lo que se lee como temblor y no como bache—.
 *
 *   node scripts/medir-sacudidas.mjs [avión] [intensidad|nada] [vista] [segundos]
 *
 * `OGA_GPU=0`, con SwiftShader; por defecto, con la tarjeta.
 */
import { createServer } from "vite";
import { chromium } from "playwright";
import { baseDe } from "./servidor.mjs";

const AVION = process.argv[2] ?? "jaz-120";
const INTENSIDAD = process.argv[3] ?? "moderada";
const VISTA = process.argv[4] ?? "cockpit";
const SEGUNDOS = Number(process.argv[5] ?? 20);
const ALTO = Number(process.env.OGA_ALTO ?? 0);
const TRAMO = process.env.OGA_TRAMO ?? "taguato-ruvicha";
const VIENTO = process.env.OGA_VIENTO ?? "000/00";
const SITIO = (process.env.OGA_SITIO ?? "0,-60000").split(",").map(Number);
const CON_GPU = process.env.OGA_GPU !== "0";
const PUERTO = 5391;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "warn",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

/** Desviación típica, pico y parte por encima de `corte` Hz de una serie. */
function analizar(t, x, corte = 2) {
  const n = x.length;
  if (n < 8) return null;
  const media = x.reduce((s, v) => s + v, 0) / n;
  const d = x.map((v) => v - media);
  const sd = Math.sqrt(d.reduce((s, v) => s + v * v, 0) / n);
  const pico = Math.max(...d.map(Math.abs));
  // Paso bajo de primer orden a `corte` Hz, con el tiempo de verdad de cada
  // fotograma: lo que queda al restarlo es lo que va más deprisa que eso.
  let y = d[0];
  let alto = 0;
  for (let i = 1; i < n; i++) {
    const dt = Math.max(1e-4, t[i] - t[i - 1]);
    const k = 1 - Math.exp(-2 * Math.PI * corte * dt);
    y += (d[i] - y) * k;
    alto += (d[i] - y) ** 2;
  }
  // Y la frecuencia que más pesa, por un barrido de Fourier sencillo.
  let mejor = 0;
  let fMejor = 0;
  const dur = t[n - 1] - t[0];
  for (let f = 0.05; f <= 15; f += 0.05) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i++) {
      const dt = i ? t[i] - t[i - 1] : 0;
      re += d[i] * Math.cos(2 * Math.PI * f * t[i]) * dt;
      im += d[i] * Math.sin(2 * Math.PI * f * t[i]) * dt;
    }
    const p = (re * re + im * im) / dur;
    if (p > mejor) {
      mejor = p;
      fMejor = f;
    }
  }
  return { sd, pico, rapido: Math.sqrt(alto / n), fPico: fMejor };
}

const fmt = (r, u, k = 1) =>
  r
    ? `σ ${(r.sd * k).toFixed(3)}${u} · pico ${(r.pico * k).toFixed(3)}${u} · ` +
      `>2 Hz ${(r.rapido * k).toFixed(3)}${u} · domina ${r.fPico.toFixed(2)} Hz`
    : "sin datos";

try {
  const page = await navegador.newPage({ viewport: { width: 1280, height: 720 }, locale: "es-PY" });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(
    `${BASE}/?escenario=tenerife-norte&hora=12&avion=${AVION}&tramo=${TRAMO}` +
      `&destino=gran-canaria&teselas=0&meteo=&viento=${VIENTO}`,
  );
  await page.waitForFunction(() => !!globalThis.__oga?.estado?.(), null, { timeout: 120_000 });
  await page.waitForTimeout(5000);
  const tarjeta = await page.evaluate(() => {
    const gl = globalThis.__oga.pintor().getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre";
  });
  console.log(`  ${tarjeta}`);
  await page.keyboard.press("i");

  const enTierra = process.env.OGA_SUELO === "1";
  const puesto = enTierra
    ? await page.evaluate(() => ({ altura: 0, tas: 0, suelo: 0 }))
    : await page.evaluate(
    async ({ intensidad, alto, sitio }) => {
      const o = globalThis.__oga;
      const j = o.juegoParaTrazas();
      const { trueFromIndicated } = await import("/src/flight/atmosphere.ts");
      const espera = (ms) => new Promise((r) => setTimeout(r, ms));
      o.ponerTurbulencia(
        intensidad === "nada"
          ? []
          : [{ desde: 0, hasta: 1e9, intensidad, como: "sin-avisar", capa: null }],
      );
      const altura = alto || j.aircraft.alturaDeCrucero || 3000;
      const ias = j.aircraft.cruiseSpeed > 150 ? 270 / 1.94384 : j.aircraft.cruiseSpeed;
      const tas = trueFromIndicated(ias, altura, j.flight.aireDelDia());
      o.colocar(sitio[0], altura, sitio[1], tas, (225 * Math.PI) / 180);
      const c = o.controles();
      c.throttle = j.flight.gasPara(tas);
      c.trim = 0;
      if ("ventanillaAlt" in j) j.ventanillaAlt = Math.round(altura / 0.3048 / 100) * 100;
      await espera(300);
      o.pedirTren(false);
      o.pedirFlaps(0);
      await espera(300);
      o.pilotoAutomatico(true);
      return { altura, tas, suelo: j.flight.state.heightAboveGround };
    },
        { intensidad: INTENSIDAD, alto: ALTO, sitio: SITIO },
      );
  console.log(`  ${AVION} a ${puesto.altura} m y ${puesto.tas.toFixed(0)} m/s, turbulencia ${INTENSIDAD}, tramo ${TRAMO}, viento ${VIENTO}, ${puesto.suelo.toFixed(0)} m sobre el suelo`);
  // `OGA_PIEZAS=1`: lo que está en el ala y no se dobla.
  if (process.env.OGA_PIEZAS === "1") {
    const sueltas = await page.evaluate(() => {
      const j = globalThis.__oga.juegoParaTrazas();
      const g = j.aircraftMesh.group;
      const a = j.aircraftMesh.ala;
      if (!a) return ["sin ala"];
      g.updateWorldMatrix(true, true);
      const inv = g.matrixWorld.clone().invert();
      const salen = [];
      g.traverse((o) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const dobla = mats.map((m) => m.customProgramCacheKey().includes("ala-que-se-dobla"));
        o.geometry.computeBoundingBox();
        const c = o.geometry.boundingBox.getCenter(o.position.clone()).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
        const s = o.geometry.boundingBox.getSize(o.position.clone());
        if (Math.abs(c.x) > a.raiz + 0.5 || s.x > 2 * a.raiz + 1)
          salen.push(`${o.name}${o.parent ? "<" + o.parent.name : ""} x ${c.x.toFixed(1)} ancho ${s.x.toFixed(1)} ${dobla.join(",")} ${mats.map((m) => m.name).join(",")}`);
      });
      return salen;
    });
    console.log(sueltas.join("\n"));
  }
  // `OGA_COSTE=1`: lo que cuesta en la CPU, por fotograma, el ala y las ráfagas.
  if (process.env.OGA_COSTE === "1") {
    const c = await page.evaluate(async () => {
      const j = globalThis.__oga.juegoParaTrazas();
      const a = j.aircraftMesh.ala;
      const { Rafagas } = await import("/src/flight/rafagas.ts");
      const r = new Rafagas(1);
      const m = { sigma: 1.5, constancia: 0.45, sobreElSuelo: 10000, enTierra: false, velocidad: 230,
        densidad: 0.38, envergadura: 60, cuerda: 8, rumbo: 0 };
      const N = 20000;
      let t0 = performance.now();
      for (let i = 0; i < N; i++) r.paso(1 / 60, m);
      const rafagas = (performance.now() - t0) / N;
      let ala = null;
      if (a) {
        t0 = performance.now();
        for (let i = 0; i < N; i++) {
          a.paso(1 / 60, 1 + 0.1 * Math.sin(i), false);
          a.antesDePintar(j.camera);
        }
        ala = (performance.now() - t0) / N;
      }
      return { rafagas, ala };
    });
    console.log(`  coste CPU · ráfagas ${(c.rafagas * 1000).toFixed(1)} µs/fotograma · ala ${c.ala === null ? "—" : (c.ala * 1000).toFixed(1) + " µs/fotograma"}`);
  }
  // `OGA_SIN_ALA=1`: el ala sin doblar, para comparar.
  if (process.env.OGA_SIN_ALA === "1")
    await page.evaluate(() => {
      const a = globalThis.__oga.juegoParaTrazas().aircraftMesh.ala;
      if (!a) return;
      a.paso = () => {};
      a.flexion.asentar = () => {};
      a.flexion.punta = 0;
    });
  const vista = await page.evaluate((v) => globalThis.__oga.ponerVista(v), VISTA);
  console.log(`  vista ${vista}`);
  // Que se asiente el automático y la cámara.
  await page.waitForTimeout(8000);
  // Y unas fotos seguidas, para ver qué cambia de una a otra.
  if (process.env.OGA_FOTOS) {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(process.env.OGA_FOTOS, { recursive: true });
    for (let i = 0; i < 4; i++) {
      await page.screenshot({ path: `${process.env.OGA_FOTOS}/${AVION}-${VISTA}-${enTierra ? "tierra" : INTENSIDAD}-${i}.png` });
      await page.waitForTimeout(150);
    }
  }

  const serie = await page.evaluate(async (segundos) => {
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    const cam = j.camera;
    const s = j.flight.state;
    const V = cam.position.constructor;
    const Q = cam.quaternion.constructor;
    const rel = new V();
    const inv = new Q();
    const qrel = new Q();
    let racha = [0, 0, 0, 0];
    const original = j.flight.ponerRacha.bind(j.flight);
    j.flight.ponerRacha = (x, y, z, a) => {
      racha = [x, y, z, a ?? 0];
      original(x, y, z, a);
    };
    const filas = [];
    await new Promise((listo) => {
      const fin = performance.now() + segundos * 1000;
      const paso = (ahora) => {
        inv.copy(s.orientation).invert();
        rel.copy(cam.position).sub(s.position).applyQuaternion(inv);
        qrel.copy(inv).multiply(cam.quaternion);
        filas.push([
          ahora / 1000,
          s.loadFactor,
          s.verticalSpeed,
          s.position.y,
          rel.x,
          rel.y,
          rel.z,
          // Ángulo del giro de la cámara respecto al avión, rad.
          2 * Math.acos(Math.min(1, Math.abs(qrel.w))),
          s.pitchRate,
          s.rollRate,
          racha[1],
          racha[0],
          s.airspeed,
          o.reloj(),
          o.ala?.()?.punta ?? 0,
          o.rafagas?.()?.enRacha ? 1 : 0,
        ]);
        if (ahora < fin) requestAnimationFrame(paso);
        else listo();
      };
      requestAnimationFrame(paso);
    });
    j.flight.ponerRacha = original;
    return filas;
  }, SEGUNDOS);

  const col = (i) => serie.map((f) => f[i]);
  const t = col(0);
  const dts = t.slice(1).map((v, i) => v - t[i]);
  dts.sort((a, b) => a - b);
  console.log(
    `  ${serie.length} fotogramas · mediana ${(dts[Math.floor(dts.length / 2)] * 1000).toFixed(1)} ms` +
      ` · reloj del juego ${(serie.at(-1)[13] - serie[0][13]).toFixed(1)} s en ${(t.at(-1) - t[0]).toFixed(1)} s`,
  );
  console.log(`  ráfaga vertical   ${fmt(analizar(t, col(10)), " m/s")}`);
  console.log(`  ráfaga horizontal ${fmt(analizar(t, col(11)), " m/s")}`);
  console.log(`  carga n−1         ${fmt(analizar(t, col(1)), " g")}`);
  console.log(`  velocidad vert.   ${fmt(analizar(t, col(2)), " m/s")}`);
  console.log(`  altura            ${fmt(analizar(t, col(3)), " m")}`);
  console.log(`  cabeceo (q)       ${fmt(analizar(t, col(8)), " °/s", 180 / Math.PI)}`);
  console.log(`  alabeo (p)        ${fmt(analizar(t, col(9)), " °/s", 180 / Math.PI)}`);
  console.log(`  velocidad aire    ${fmt(analizar(t, col(12)), " m/s")}`);
  console.log(`  cámara/avión y    ${fmt(analizar(t, col(5)), " cm", 100)}`);
  console.log(`  cámara/avión x    ${fmt(analizar(t, col(4)), " cm", 100)}`);
  console.log(`  cámara/avión z    ${fmt(analizar(t, col(6)), " cm", 100)}`);
  console.log(`  giro cám./avión   ${fmt(analizar(t, col(7)), " °", 180 / Math.PI)}`);
  const puntas = col(14);
  console.log(
    `  punta del ala     media ${(puntas.reduce((a, b) => a + b, 0) / puntas.length).toFixed(2)} m · ` +
      `${fmt(analizar(t, puntas), " m")}`,
  );
  const enRacha = col(15);
  console.log(`  en racha          ${((enRacha.reduce((a, b) => a + b, 0) / enRacha.length) * 100).toFixed(0)} % del rato`);
  if (process.env.OGA_VOLCAR) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(process.env.OGA_VOLCAR, JSON.stringify(serie));
  }
  if (errores.length) console.log(`  errores: ${errores.join(" · ")}`);
} finally {
  await navegador.close();
  await server.close();
}

/**
 * **El remolque del tráfico, mirado** (ADR 0025): un reactor del tráfico en Los
 * Rodeos sale de su puesto de contacto empujado por el tractor.
 *
 * Mira, con el juego de verdad:
 *
 * 1. Que empieza en el puesto con el morro al edificio y el tractor enganchado
 *    delante de su rueda de morro.
 * 2. Que va hacia atrás: lo que avanza contra su morro, mientras está el tractor.
 * 3. Que la calle queda reservada mientras empuja: lo que barre sale en los
 *    tramos que corta la raya de quien juega.
 * 4. Que ningún punto de lo que barre ni el tractor caen dentro de un edificio.
 * 5. Que el tractor y la persona desaparecen al acabar y el avión rueda hacia
 *    delante.
 *
 * Y saca capturas desde una cámara puesta encima, con la tarjeta de verdad
 * (`OGA_GPU=1`). Uso: `node scripts/ver-remolque-del-trafico.mjs carpeta`, con
 * `OGA_PUERTO` y `OGA_PRISA` como los demás bancos.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync, writeFileSync } from "node:fs";
import { baseDe } from "./servidor.mjs";

const FOTOS = process.argv[2] ?? process.env.OGA_FOTOS;
if (!FOTOS) {
  console.error("  uso: node scripts/ver-remolque-del-trafico.mjs carpeta");
  process.exit(2);
}
mkdirSync(FOTOS, { recursive: true });
const CON_GPU = process.env.OGA_GPU === "1";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5601);
const PRISA = process.env.OGA_PRISA ? Number(process.env.OGA_PRISA) : 4;
// Una matrícula que en Los Rodeos le toca al reactor: ver `tipoDe` en `trafico.ts`.
const MATRICULA = process.env.OGA_MATRICULA ?? "EC-PSH";

const server = await createServer({ root: process.cwd(), server: { port: PUERTO, hmr: false } });
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
const fallos = [];
const f = (v, d = 1) => (typeof v === "number" ? v.toFixed(d) : String(v));

/** Una foto desde encima del avión del tráfico, a un lado y por delante del morro. */
async function foto(page, nombre, deCerca = false) {
  const datos = await page.evaluate(([m, deCerca]) => {
    const o = globalThis.__oga;
    const q = o.trafico().find((x) => x.matricula === m);
    if (!q) return null;
    const cam = o.camaraViva().clone();
    const r = (q.rumbo * Math.PI) / 180;
    const n = { x: Math.sin(r), z: -Math.cos(r) };
    if (deCerca) {
      // Por detrás y a un lado, algo alto, con el morro y la fachada que tiene delante en el cuadro.
      cam.position.set(q.x - n.x * 45 - n.z * 40, q.y + 14, q.z - n.z * 45 + n.x * 40);
      cam.lookAt(q.x + n.x * 40, q.y + 2, q.z + n.z * 40);
    } else {
      cam.position.set(q.x + n.x * 70 - n.z * 55, q.y + 60, q.z + n.z * 70 + n.x * 55);
      cam.lookAt(q.x - n.x * 10, q.y, q.z - n.z * 10);
    }
    cam.updateMatrixWorld();
    const pintor = o.pintor();
    pintor.render(o.escena(), cam);
    return pintor.domElement.toDataURL("image/png");
  }, [MATRICULA, deCerca]);
  if (!datos) return;
  writeFileSync(`${FOTOS}/${nombre}.png`, Buffer.from(datos.split(",")[1], "base64"));
}

try {
  const page = await navegador.newPage({ viewport: { width: 1280, height: 720 }, locale: "es-PY" });
  page.on("pageerror", (e) => fallos.push(`error de página: ${e.message}`));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(`${BASE}/?escenario=tenerife-norte&hora=12&leccion=despegue&avion=jaz-20`);
  await page.waitForFunction(() => globalThis.__oga?.aeronave?.().deVerdad === true, null, { timeout: 120000 });
  const renderer = await page.evaluate(() => {
    const c = document.createElement("canvas").getContext("webgl2");
    const ext = c?.getExtension("WEBGL_debug_renderer_info");
    return ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "?";
  });
  console.log(`renderer ${renderer}`);
  await page.waitForTimeout(4000);
  await page.evaluate((m) => globalThis.__oga.traficoAnuncia(m, "otro.rodando"), MATRICULA);
  await page.evaluate((v) => globalThis.__oga.acelerar(v), PRISA);

  const muestra = () =>
    page.evaluate((m) => {
      const o = globalThis.__oga;
      const q = o.trafico().find((x) => x.matricula === m);
      const g = o.traficoGrupo();
      const rem = g?.children.find((c) => c.name === "remolque");
      const tractor = rem ? rem.children[0].position : null;
      const zona = o.traficoTramos().find((t) => t.matricula === m && t.empuja);
      const aero = o.escenario().aerodrome;
      /** La distancia a la pared más cercana, y si cae dentro de algún edificio. */
      const dentro = (x, z) => {
        if (!aero?.buildings) return null;
        for (const e of aero.buildings) {
          const p = e.polygon;
          let c = false;
          for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
            const [xi, yi] = p[i];
            const [xj, yj] = p[j];
            const zi = -yi;
            const zj = -yj;
            if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
          }
          if (c) return true;
        }
        return false;
      };
      const enEdificio =
        (tractor && dentro(tractor.x, tractor.z)) ||
        (zona?.porDelante ?? []).some((p) => dentro(p.x, p.z)) ||
        (q && dentro(q.x, q.z));
      return {
        q: q ? { x: q.x, z: q.z, rumbo: q.rumbo, tipo: q.tipo } : null,
        tractor: tractor ? { x: tractor.x, z: tractor.z } : null,
        zona: zona ? zona.porDelante.length : 0,
        enEdificio: !!enEdificio,
      };
    }, MATRICULA);

  await page.waitForTimeout(300);
  await foto(page, "trafico-0-en-el-puesto-de-cerca", true);
  const m0 = await muestra();
  console.log(`al anunciarlo: ${JSON.stringify(m0)}`);
  if (m0.q?.tipo !== "reactor") fallos.push(`${MATRICULA} no es un reactor (${m0.q?.tipo})`);
  let antes = m0;
  let deCulo = 0;
  let adelante = 0;
  let conTractor = 0;
  let reservada = 0;
  let tractorDelante = Infinity;
  let enEdificio = 0;
  let fotos = 0;
  let suelto = false;
  let rodado = 0;
  for (let i = 0; i < 400; i++) {
    await page.waitForTimeout(250);
    const m = await muestra();
    if (!m.q || !antes.q) break;
    const r = (antes.q.rumbo * Math.PI) / 180;
    const avance = (m.q.x - antes.q.x) * Math.sin(r) + (m.q.z - antes.q.z) * -Math.cos(r);
    if (m.tractor) {
      conTractor++;
      if (avance < -1e-3) deCulo += -avance;
      else if (avance > 1e-2) adelante += avance;
      if (m.zona > 1) reservada++;
      const n = { x: Math.sin((m.q.rumbo * Math.PI) / 180), z: -Math.cos((m.q.rumbo * Math.PI) / 180) };
      tractorDelante = Math.min(tractorDelante, (m.tractor.x - m.q.x) * n.x + (m.tractor.z - m.q.z) * n.z);
      if (m.enEdificio) enEdificio++;
      if ((fotos === 0 && conTractor > 4) || (fotos === 1 && deCulo > 20) || (fotos === 2 && deCulo > 40)) {
        await foto(page, `trafico-${++fotos}-empujando`);
        console.log(`foto ${fotos}: de culo ${f(deCulo)} m, tractor ${f(tractorDelante)} m por delante, zona ${m.zona} puntos`);
      }
    } else if (conTractor > 0) {
      if (!suelto) {
        suelto = true;
        await foto(page, "trafico-4-suelto");
      }
      rodado += avance;
      if (rodado > 40) break;
    }
    antes = m;
  }
  console.log(
    `con tractor ${f(conTractor / 4, 0)} s · de culo ${f(deCulo)} m · hacia delante con tractor ${f(adelante, 2)} m · tractor a ${f(tractorDelante)} m por delante del centro · calle reservada ${f(reservada / 4, 0)} s · dentro de un edificio ${enEdificio} · suelto, rodó ${f(rodado)} m`,
  );
  console.log(
    `al final: ${JSON.stringify(await page.evaluate((m) => ({ dentro: globalThis.__oga.traficoPorDentro().find((x) => x.matricula === m), todos: globalThis.__oga.trafico().map((x) => [x.matricula, x.tipo, Math.round(x.x), Math.round(x.z)]), tu: globalThis.__oga.estado().position }), MATRICULA))}`,
  );
  if (conTractor === 0) fallos.push("no salió el tractor");
  if (deCulo < 20) fallos.push(`no va de culo (${f(deCulo)} m)`);
  if (adelante > 1) fallos.push(`con el tractor va hacia delante (${f(adelante)} m)`);
  if (tractorDelante < 8) fallos.push(`el tractor no está delante de la rueda de morro (${f(tractorDelante)} m)`);
  if (reservada < conTractor / 2) fallos.push(`la calle no queda reservada mientras empuja (${reservada} de ${conTractor})`);
  if (enEdificio) fallos.push(`algo dentro de un edificio (${enEdificio} muestras)`);
  if (!suelto || rodado < 20) fallos.push(`no rueda hacia delante después (${f(rodado)} m)`);
  await page.close();
} finally {
  await navegador.close();
  await server.close();
}
if (fallos.length) {
  console.log(`\nFALLOS:\n  ${fallos.join("\n  ")}`);
  process.exit(1);
}
console.log("\nbien");

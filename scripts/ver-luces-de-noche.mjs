/**
 * **Las luces de otro avión de noche**, con la tarjeta de verdad: uno que
 * viene de frente y el mismo alejándose.
 *
 * Es lo que se enseña con ellas: si ves la verde a tu izquierda y la roja a
 * tu derecha, viene hacia ti; si solo ves la blanca, se va. Para verlo hay que
 * ponerse delante y detrás de un avión que vuela, y eso es lo que hace esto:
 * se anuncia uno en final y el tuyo se clava a unos cientos de metros de él,
 * en su línea, mirándolo. Dos fotos por posición: la de la cámara de fuera y
 * una con teleobjetivo, que a esa distancia un reactor son treinta píxeles.
 *
 *     OGA_GPU=1 node scripts/ver-luces-de-noche.mjs carpeta [escenario] [hora]
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const D = process.argv[2] ?? "/tmp";
const ESC = process.argv[3] ?? "pettirossi";
const HORA = process.argv[4] ?? "21";
const PUERTO = 5296;
mkdirSync(D, { recursive: true });

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const CON_GPU = process.env.OGA_GPU !== "0";
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

try {
  // Una página por posición: la tarjeta de las luces sale una vez por vuelo.
  for (const como of ["de-frente", "alejandose"]) {
    const page = await navegador.newPage({
      viewport: { width: 1100, height: 620 },
      locale: "es-PY",
    });
    page.on("pageerror", (e) => console.log("  ERROR:", e.message.slice(0, 200)));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(
      `${BASE}/?escenario=${ESC}&hora=${HORA}&leccion=aterrizaje&tramo=guyrami&meteo=`,
    );
    await page.waitForFunction(() => !!globalThis.__oga?.estado, null, { timeout: 90000 });
    await page.waitForTimeout(6000);
    const tarjeta = await page.evaluate(() => {
      const gl = globalThis.__oga.pintor().getContext();
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre";
    });
    console.log(`  ${tarjeta}`);

    // Uno que viene a aterrizar, con permiso, y que se espera hasta que vuele
    // la final.
    const MATRICULA = process.env.OGA_MATRICULA ?? "ZP-TNOC";
    await page.evaluate((m) => globalThis.__oga.traficoAnuncia(m, "otro.final", true), MATRICULA);
    await page.waitForTimeout(4000);
    const puesto = await page.evaluate(
      async ({ m, como }) => {
        const o = globalThis.__oga;
        const suyo = () => o.trafico().find((q) => q.matricula === m);
        const a = suyo();
        if (!a) return null;
        await new Promise((r) => setTimeout(r, 500));
        const b = suyo();
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const l = Math.hypot(dx, dz) || 1;
        const f = { x: dx / l, z: dz / l };
        // De frente: delante de él y mirándolo. Alejándose: detrás y mirando
        // hacia donde va.
        // Más allá de los cuatrocientos metros, que más cerca no se cuenta:
        // ver `contarLasLucesDeNoche`.
        const D = 700;
        const lado = como === "de-frente" ? 1 : -1;
        // El rumbo es desde el norte —la Z negativa— hacia el este.
        const rumboTuyo =
          como === "de-frente" ? Math.atan2(-f.x, f.z) : Math.atan2(f.x, -f.z);
        /*
         * A su altura y un poco más, pero nunca a menos de trescientos
         * cincuenta metros del suelo: más abajo es una fase de trabajo y la
         * instructora no explica nada. Ver `contarLasLucesDeNoche`.
         */
        const alto = (q) =>
          Math.max(q.y + 15, o.suelo(q.x + lado * f.x * D, q.z + lado * f.z * D) + 350);
        o.colocar(b.x + lado * f.x * D, alto(b), b.z + lado * f.z * D, 55, rumboTuyo);
        o.pilotar((c) => {
          const q = suyo();
          if (!q) return;
          const s = o.estado();
          s.position.set(q.x + lado * f.x * D, alto(q), q.z + lado * f.z * D);
          // Volando de verdad, con su velocidad: parado en el aire, el
          // avisador de pérdida y el de terreno taparían cualquier tarjeta.
          c.throttle = 0.6;
        });
        o.ponerVista("chase");
        return { rumbo: (rumboTuyo * 180) / Math.PI };
      },
      { m: MATRICULA, como },
    );
    if (!puesto) {
      console.log("  el tráfico no está");
      break;
    }
    /*
     * Y la tarjeta de lo que se le ve, la primera vez del vuelo: espera
     * hueco —que no hable nadie un rato—, así que se le da medio minuto.
     */
    let laSuya = null;
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000);
      laSuya = await page.evaluate(() => {
        const o = globalThis.__oga;
        const s = o.estado();
        return {
          salio: o.lucesDeNoche(),
          tarjeta: o.tarjeta(),
          suelo: Math.round(s.heightAboveGround),
          vs: +s.verticalSpeed.toFixed(1),
          enTierra: s.onGround,
          fase: o.fase(),
        };
      });
      if (laSuya.tarjeta?.dibujo?.startsWith("luces-")) break;
    }
    await page.screenshot({ path: `${D}/luces-${ESC}-${como}.png` });
    console.log(`  ${como}: tarjeta de las luces ${JSON.stringify(laSuya)}`);
    // Y con teleobjetivo, apuntado a él: ocho grados.
    await page.evaluate((m) => {
      const o = globalThis.__oga;
      const pintor = o.pintor();
      if (!pintor.__original) pintor.__original = pintor.render;
      const original = pintor.__original;
      pintor.render = function (escena, camara) {
        const q = o.trafico().find((x) => x.matricula === m);
        const guardada = camara.quaternion.clone();
        const fov = camara.fov;
        if (q) {
          camara.lookAt(q.x, q.y, q.z);
          camara.fov = 5;
          camara.updateProjectionMatrix();
          camara.updateMatrixWorld();
        }
        try {
          return original.call(this, escena, camara);
        } finally {
          camara.quaternion.copy(guardada);
          camara.fov = fov;
          camara.updateProjectionMatrix();
          camara.updateMatrixWorld();
        }
      };
    }, MATRICULA);
    // Varias, para pillar los destellos y la baliza.
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(430);
      await page.screenshot({ path: `${D}/luces-${ESC}-${como}-cerca-${i}.png` });
    }
    await page.evaluate(() => {
      const pintor = globalThis.__oga.pintor();
      if (pintor.__original) pintor.render = pintor.__original;
    });
    console.log(`  ${como}: el tuyo mira a ${puesto.rumbo.toFixed(0)}° → luces-${ESC}-${como}*.png`);
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

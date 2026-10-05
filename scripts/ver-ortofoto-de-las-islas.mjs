/**
 * Las islas desde el aire, con la tarjeta de verdad: para mirar la ortofoto.
 *
 * Existe por la captura de Enrique de La Palma (punto 166 de la lista): «el
 * resto de la isla, verde plano y a bloques, como estar jugando en
 * Minecraft». Se juzga con la vista, y la vista se juzga con la GPU del
 * portátil y no con SwiftShader —las capturas por software engañan—, así que
 * este guion lanza Chrome con la tarjeta y **lo comprueba**: si el que
 * contesta es SwiftShader, lo dice y no hace capturas.
 *
 * Cada vista clava el avión en un sitio, un rumbo y una altura, y espera a
 * que se baje lo que haya que bajar antes de hacer la foto. Las mismas vistas
 * sirven para el antes y el después: se corre en cada copia del código con
 * la misma orden.
 *
 * Uso: `node scripts/ver-ortofoto-de-las-islas.mjs <carpeta> [vista…]`
 *
 * Las vistas:
 * - `la-palma` — la de la captura de Enrique: costa este, al norte del
 *   aeropuerto, a 1.800 ft y rumbo 195, con La Palma como casa;
 * - `la-palma-caldera`, `la-palma-norte` y `la-palma-teide` — el relieve
 *   lejano de La Palma: la Caldera desde el mar del este, el norte de la
 *   isla desde fuera del mapa fino y el Teide visto desde ella;
 * - `fuerteventura-betancuria`, `fuerteventura-jandia`, `la-gomera-norte` y
 *   `la-gomera-oeste` — el relieve lejano de las dos islas que se quedaron a
 *   ochocientos y a cuatrocientos ochenta metros por muestra: el macizo de
 *   Betancuria desde el aeropuerto, Jandía desde el aire, y el norte y el
 *   oeste de La Gomera desde el mar. Y con ellas la costa, que es donde
 *   salían los dientes oscuros en el agua;
 * - `la-palma-desde-tfn` — la misma, llegando desde Los Rodeos: La Palma es
 *   el vecino y el resto de la isla salía de la foto del horizonte;
 * - `teide` y `nieves` — las cumbres de Tenerife y Gran Canaria desde
 *   crucero;
 * - `paraguay-en-ruta` — de Asunción a Encarnación, en crucero y lejos de
 *   los dos campos.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const CARPETA = process.argv[2] ?? "/tmp";
const PUERTO = 5291;
const R = 6371008;
const RAD = Math.PI / 180;

/**
 * Las vistas, en grados de verdad. `origen` es el del escenario de casa: con
 * él se pasa a metros del marco local, con la misma proyección que los
 * extractores. `mira` es a dónde apunta el morro.
 */
const VISTAS = {
  "la-palma": {
    escenario: "la-palma",
    origen: [28.626499, -17.7556],
    sitio: [28.745, -17.715],
    altura: 549,
    rumbo: 195,
  },
  /*
   * **Y el relieve lejano de La Palma**, que es lo que quedaba «a bloques»
   * con la foto ya fina: la Caldera de Taburiente desde el mar del este, por
   * fuera del mapa fino, y el Teide visto desde la isla, a ciento veinte
   * kilómetros. Las dos salen del mapa lejano de casa. Ver `segmentosLejos`
   * en `world/scenarios.ts`.
   */
  "la-palma-caldera": {
    escenario: "la-palma",
    origen: [28.626499, -17.7556],
    sitio: [28.62, -17.66],
    altura: 1200,
    mira: [28.754, -17.885],
  },
  "la-palma-norte": {
    escenario: "la-palma",
    origen: [28.626499, -17.7556],
    sitio: [28.86, -17.80],
    altura: 1800,
    mira: [28.70, -17.86],
  },
  "la-palma-teide": {
    escenario: "la-palma",
    origen: [28.626499, -17.7556],
    sitio: [28.62, -17.70],
    altura: 2500,
    mira: [28.27269, -16.64227],
  },
  /*
   * **Y Fuerteventura y La Gomera**, que se quedaron fuera de aquello: la
   * una por los triángulos de sus llanos y la otra por la línea de barcos de
   * Santa Cruz. Ver `segmentosLejos` en `world/scenarios.ts` y
   * `world/malla-lejana.ts`.
   */
  "fuerteventura-betancuria": {
    escenario: "fuerteventura",
    origen: [28.4527, -13.8638],
    sitio: [28.47, -13.9],
    altura: 1200,
    mira: [28.4, -14.08],
  },
  "fuerteventura-jandia": {
    escenario: "fuerteventura",
    origen: [28.4527, -13.8638],
    sitio: [28.2, -14.1],
    altura: 1500,
    mira: [28.08, -14.36],
  },
  "la-gomera-norte": {
    escenario: "la-gomera",
    origen: [28.0296, -17.2146],
    sitio: [28.28, -17.22],
    altura: 1500,
    mira: [28.12, -17.25],
  },
  "la-gomera-oeste": {
    escenario: "la-gomera",
    origen: [28.0296, -17.2146],
    sitio: [28.1, -17.45],
    altura: 1200,
    mira: [28.12, -17.25],
  },
  "la-palma-desde-tfn": {
    escenario: "tenerife-norte",
    destino: "la-palma",
    origen: [28.482752, -16.341707],
    sitio: [28.745, -17.715],
    altura: 549,
    rumbo: 195,
  },
  teide: {
    escenario: "tenerife-norte",
    origen: [28.482752, -16.341707],
    sitio: [28.43, -16.47],
    altura: 3658,
    mira: [28.27269, -16.64227],
  },
  /*
   * Y Paraguay en ruta, de Asunción a Encarnación a diez mil pies y a ciento
   * diez kilómetros de casa: lo que antes era la foto del horizonte.
   */
  "paraguay-en-ruta": {
    escenario: "pettirossi",
    destino: "encarnacion",
    origen: [-25.240156, -57.519227],
    sitio: [-26.035, -56.846],
    altura: 3048,
    mira: [-27.227537, -55.837584],
  },
  nieves: {
    escenario: "gran-canaria",
    origen: [27.9319, -15.3866],
    sitio: [28.1, -15.45],
    altura: 3658,
    mira: [27.96193, -15.57177],
  },
};

const pedidas = process.argv.slice(3).length
  ? process.argv.slice(3)
  : Object.keys(VISTAS);

function aLocal([lat, lon], [lat0, lon0]) {
  return {
    x: (lon - lon0) * RAD * R * Math.cos(lat0 * RAD),
    z: -(lat - lat0) * RAD * R,
  };
}

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"],
});

try {
  for (const nombre of pedidas) {
    const v = VISTAS[nombre];
    if (!v) {
      console.log(`  ${nombre}: no es una vista`);
      continue;
    }
    const page = await navegador.newPage({
      viewport: { width: 1280, height: 720 },
      locale: "es-PY",
    });
    page.on("pageerror", (e) => console.log("  ERROR:", e.message));
    await page.addInitScript(() => {
      localStorage.setItem("oga-veve:teclas-vistas", "1");
    });
    /*
     * Lo que se baja, contado por la red: las teselas, si las hay, y el resto
     * de las fotos. Es lo que dice cuánto pesa mirar esto.
     */
    const bajado = { teselas: 0, bytesTeselas: 0, fotos: 0, bytesFotos: 0 };
    page.on("response", async (r) => {
      const u = r.url();
      if (!/\.(jpg|jpeg|webp)(\?|$)/.test(u)) return;
      const largo = Number(r.headers()["content-length"] ?? 0) ||
        (await r.body().catch(() => Buffer.alloc(0))).length;
      if (u.includes("/teselas/")) {
        bajado.teselas++;
        bajado.bytesTeselas += largo;
      } else if (u.includes("/ortho/")) {
        bajado.fotos++;
        bajado.bytesFotos += largo;
      }
    });
    const t0 = Date.now();
    await page.goto(
      `${BASE}/?escenario=${v.escenario}&hora=12&leccion=despegue&tramo=guyrami` +
        (v.destino ? `&destino=${v.destino}` : "") +
        "&avion=jaz-90" +
        // Despejado: se mira el suelo, y unas nubes encima no dejan comparar.
        `&metar=${encodeURIComponent("GCXX 051200Z 03010KT CAVOK 22/14 Q1018")}`,
    );
    await page.waitForFunction(() => !!globalThis.__oga?.estado, null, {
      timeout: 90000,
    });
    const arranque = (Date.now() - t0) / 1000;
    const tarjeta = await page.evaluate(() => {
      const gl = globalThis.__oga.pintor().getContext();
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre";
    });
    if (/swiftshader/i.test(tarjeta)) {
      console.log(`  ✗ ${nombre}: contesta ${tarjeta}; sin tarjeta no se juzga la imagen`);
      await page.close();
      continue;
    }
    const p = aLocal(v.sitio, v.origen);
    let rumbo = v.rumbo ?? 0;
    if (v.mira) {
      const m = aLocal(v.mira, v.origen);
      rumbo = (Math.atan2(m.x - p.x, -(m.z - p.z)) / RAD + 360) % 360;
    }
    /*
     * Se clava el avión en cada fotograma, como en `ver-horizonte.mjs`: si se
     * coloca una vez, la física lo suelta y en unos segundos ya está en otro
     * sitio y mirando a otro lado.
     */
    await page.evaluate(
      async ({ x, z, y, rumbo }) => {
        const THREE = await import("/node_modules/three/build/three.module.js");
        const o = globalThis.__oga;
        const r = (rumbo * Math.PI) / 180;
        o.colocar(x, y, z, 0, r);
        o.pilotar((c) => {
          const s = o.estado();
          s.position.set(x, y, z);
          s.orientation.setFromEuler(new THREE.Euler(0, -r, 0, "YXZ"));
          s.velocity.set(0, 0, 0);
          c.throttle = 0;
        });
      },
      { x: p.x, z: p.z, y: v.altura, rumbo },
    );
    // Lo que tarde en bajarse lo de ese sitio, con un tope.
    await page.waitForTimeout(12000);
    const teselas = await page.evaluate(() => globalThis.__oga.teselas?.() ?? null);
    const rumboReal = await page.evaluate(
      () => ((globalThis.__oga.estado().heading * 180) / Math.PI + 360) % 360,
    );
    await page.screenshot({ path: `${CARPETA}/${nombre}.png` });
    console.log(
      `  ${nombre}: ${tarjeta.slice(0, 60)} · rumbo ${rumbo.toFixed(0)}° (el avión ${rumboReal.toFixed(0)}°) · arranque ${arranque.toFixed(1)} s · ` +
        `fotos ${bajado.fotos} (${(bajado.bytesFotos / 1048576).toFixed(1)} MB) · ` +
        `teselas ${bajado.teselas} (${(bajado.bytesTeselas / 1048576).toFixed(1)} MB)` +
        (teselas
          ? ` · en la tarjeta ${teselas.puestas}/${teselas.capas} ${JSON.stringify(teselas.porNivel)}`
          : ""),
    );
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

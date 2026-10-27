/**
 * **Fotos de los sitios del relieve fino**, con la tarjeta de verdad.
 *
 * Una vista por sitio —el Teide, los roques, Timanfaya, Tajogaite, Itaipú,
 * el Ypacaraí, el puente de Encarnación, el Palacio de López—, desde donde
 * se ven en las rutas del juego, para comparar antes y después de un cambio
 * del relieve. Ver `scripts/relieve-fino.mjs` y el ADR 0022.
 *
 * Sirve una compilación tal cual —como `medir-mundo.mjs`— o el árbol de
 * trabajo con Vite:
 *
 *     NODE_ENV=development npx vite build --outDir /tmp/antes   # en main
 *     node scripts/ver-relieve-fino.mjs /tmp/antes carpeta-de-fotos [vista…]
 *     node scripts/ver-relieve-fino.mjs dev carpeta-de-fotos [vista…]
 *
 * Con Vite escucha en `OGA_PUERTO` (5603 si no se dice). Cada foto dice qué
 * tarjeta la pintó: si sale SwiftShader, no vale para juzgar la imagen.
 */
import { chromium } from "playwright";
import { createServer as servidorHttp } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const [QUE, CARPETA = "/tmp", ...PEDIDAS] = process.argv.slice(2);
const R = 6371008;
const RAD = Math.PI / 180;

/** Desde dónde se mira cada sitio: el ojo, su altura en m y adónde mira. */
const VISTAS = {
  "itaipu-ruta": {
    // Saliendo de Guaraní hacia el este, a 18,7 km y unos 3.000 ft.
    escenario: "guarani",
    sitio: [-25.433, -54.772],
    altura: 900,
    mira: [-25.408347, -54.587833],
  },
  "itaipu-cerca": {
    // Aguas abajo, a unos cinco kilómetros: el cañón y la cara de la presa.
    escenario: "guarani",
    sitio: [-25.452, -54.616],
    altura: 450,
    mira: [-25.408347, -54.587833],
  },
  teide: {
    escenario: "tenerife-norte",
    sitio: [28.43, -16.47],
    altura: 2600,
    mira: [28.27269, -16.64227],
  },
  "roque-nublo": {
    escenario: "gran-canaria",
    sitio: [27.94, -15.49],
    altura: 1900,
    mira: [27.97083, -15.6125],
  },
  "roque-nublo-ruta": {
    // De Los Rodeos a Gran Canaria, a 16.000 ft y unos 19 km: como la ficha.
    escenario: "tenerife-norte",
    sitio: [28.14, -15.61],
    altura: 4877,
    mira: [27.970815, -15.6125968],
  },
  "roque-nublo-cerca": {
    // Sobre el Pico de las Nieves, a cuatro kilómetros.
    escenario: "gran-canaria",
    sitio: [27.959, -15.573],
    altura: 2300,
    mira: [27.970815, -15.6125968],
  },
  trinidad: {
    // En la ruta de Guaraní a Encarnación, a unos cinco kilómetros.
    escenario: "encarnacion",
    sitio: [-27.1, -55.668],
    altura: 900,
    mira: [-27.132, -55.702],
  },
  "trinidad-cerca": {
    // Y de cerca, con las ruinas un poco a la izquierda del avión.
    escenario: "encarnacion",
    sitio: [-27.121, -55.689],
    altura: 450,
    mira: [-27.1335, -55.7045],
  },
  "roque-agando": {
    escenario: "la-gomera",
    sitio: [28.065, -17.165],
    altura: 1250,
    mira: [28.10528, -17.21361],
  },
  timanfaya: {
    escenario: "lanzarote",
    sitio: [28.975, -13.66],
    altura: 900,
    mira: [29.0, -13.74],
  },
  tajogaite: {
    escenario: "la-palma",
    sitio: [28.655, -17.79],
    altura: 1500,
    mira: [28.61325, -17.86641],
  },
  ypacarai: {
    escenario: "pettirossi",
    sitio: [-25.255, -57.47],
    altura: 700,
    mira: [-25.3, -57.35],
  },
  itaipu: {
    // El embalse, desde el sur: la presa delante y el agua detrás.
    escenario: "guarani",
    sitio: [-25.5, -54.62],
    altura: 1200,
    mira: [-25.3, -54.55],
  },
  "puente-encarnacion": {
    // Llegando a Encarnación, de costado al puente: los pilonos en A.
    escenario: "encarnacion",
    sitio: [-27.35, -55.888],
    altura: 350,
    mira: [-27.374494, -55.87485],
  },
  "puente-remanso": {
    // Llegando a Asunción por el río, de costado al puente.
    escenario: "pettirossi",
    sitio: [-25.1995, -57.565],
    altura: 300,
    mira: [-25.183017, -57.548165],
  },
  auditorio: {
    // Saliendo de Los Rodeos por la 12, sobre La Laguna hacia Santa Cruz.
    escenario: "tenerife-norte",
    sitio: [28.468, -16.3],
    altura: 800,
    mira: [28.456108, -16.251243],
  },
  izana: {
    // Saliendo de Los Rodeos hacia el oeste, como el vuelo de Ara, con la
    // cumbre de Izaña a la izquierda.
    escenario: "tenerife-norte",
    sitio: [28.42, -16.43],
    altura: 2200,
    mira: [28.3009, -16.51035],
  },
  "amistad-ruta": {
    // Saliendo de Guaraní hacia el este, sobre Ciudad del Este.
    escenario: "guarani",
    sitio: [-25.48, -54.70],
    altura: 900,
    mira: [-25.50947, -54.6011],
  },
  "amistad-cerca": {
    // Y de cerca, aguas abajo, con el puente de costado.
    escenario: "guarani",
    sitio: [-25.526, -54.61],
    altura: 300,
    mira: [-25.5094, -54.6005],
  },
  "palacio-lopez": {
    escenario: "pettirossi",
    sitio: [-25.262, -57.615],
    altura: 350,
    mira: [-25.27764, -57.63757],
  },
};

// ── Lo que se sirve ───────────────────────────────────────────────────────

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".glb": "model/gltf-binary",
  ".bin": "application/octet-stream",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

async function servirCarpeta(carpeta) {
  const servidor = servidorHttp(async (pet, res) => {
    try {
      const ruta = decodeURIComponent(new URL(pet.url, "http://x").pathname);
      let fichero = join(carpeta, ruta);
      if (!fichero.startsWith(carpeta)) throw new Error("fuera");
      if ((await stat(fichero)).isDirectory()) fichero = join(fichero, "index.html");
      const cuerpo = await readFile(fichero);
      res.writeHead(200, {
        "content-type": TIPOS[extname(fichero)] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      res.end(cuerpo);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((listo) => servidor.listen(0, "127.0.0.1", listo));
  return { cerrar: () => servidor.close(), base: `http://127.0.0.1:${servidor.address().port}` };
}

let servido;
if (QUE === "dev") {
  const puerto = Number(process.env.OGA_PUERTO ?? 5603);
  const vite = await createServer({ root: process.cwd(), server: { port: puerto, hmr: false } });
  await vite.listen();
  servido = { cerrar: () => vite.close(), base: baseDe(vite, puerto) };
} else {
  servido = await servirCarpeta(resolve(QUE));
}

const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"],
});

/** Las coordenadas de un punto en el mundo de un escenario, con la proyección de sus mapas. */
function aLocal([lat, lon], [lat0, lon0]) {
  return {
    x: (lon - lon0) * RAD * R * Math.cos(lat0 * RAD),
    z: -(lat - lat0) * RAD * R,
  };
}

try {
  const nombres = PEDIDAS.length ? PEDIDAS : Object.keys(VISTAS);
  for (const nombre of nombres) {
    const v = VISTAS[nombre];
    if (!v) {
      console.log(`  ${nombre}: no es una vista`);
      continue;
    }
    const page = await navegador.newPage({ viewport: { width: 1280, height: 720 }, locale: "es-PY" });
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(
      `${servido.base}/?escenario=${v.escenario}&hora=12&leccion=despegue&tramo=guyrami&avion=jaz-90` +
        `&metar=${encodeURIComponent("GCXX 051200Z 03010KT CAVOK 22/14 Q1018")}`,
    );
    await page.waitForFunction(() => !!globalThis.__oga?.estado, null, { timeout: 180000 });
    const { tarjeta, origen } = await page.evaluate(() => {
      const gl = globalThis.__oga.pintor().getContext();
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        tarjeta: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre",
        origen: globalThis.__oga.escenario?.().aerodrome?.origin ?? null,
      };
    });
    if (!origen) {
      console.log(`  ✗ ${nombre}: el escenario no dice su origen`);
      await page.close();
      continue;
    }
    const p = aLocal(v.sitio, [origen.lat, origen.lon]);
    const m = aLocal(v.mira, [origen.lat, origen.lon]);
    const rumbo = Math.atan2(m.x - p.x, -(m.z - p.z));
    const distancia = Math.hypot(m.x - p.x, m.z - p.z);
    // Clavado en cada fotograma: si no, la física lo suelta y se va.
    await page.evaluate(
      ({ x, z, y, rumbo }) => {
        const o = globalThis.__oga;
        o.colocar(x, y, z, 0, rumbo);
        o.pilotar((c) => {
          const s = o.estado();
          s.position.set(x, y, z);
          // Un giro de −rumbo alrededor de la vertical, sin pedir three a la página.
          s.orientation.set(0, Math.sin(-rumbo / 2), 0, Math.cos(-rumbo / 2));
          s.velocity.set(0, 0, 0);
          c.throttle = 0;
        });
      },
      { x: p.x, z: p.z, y: v.altura, rumbo },
    );
    /*
     * Sin el panel ni el avión delante: se mira el paisaje. El panel se
     * esconde con una hoja de estilo —solo el lienzo queda a la vista— y el
     * avión, en la escena.
     */
    await page.addStyleTag({
      content: "* { visibility: hidden !important } canvas { visibility: visible !important }",
    });
    await page.evaluate(() => {
      globalThis.__oga.escena().traverse((o) => {
        // Encogido y no escondido: la cámara lo vuelve a enseñar cada cuadro.
        if (o.name?.startsWith("aeronave:")) o.scale.setScalar(1e-4);
      });
    });
    await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(8000);
    const suelo = await page.evaluate(({ x, z }) => globalThis.__oga.suelo(x, z), m);
    await page.screenshot({ path: `${CARPETA}/${nombre}.png` });
    console.log(
      `  ${nombre}: ${tarjeta.slice(0, 70)} · a ${(distancia / 1000).toFixed(1)} km, ` +
        `${v.altura} m · el suelo en lo mirado, ${suelo.toFixed(0)} m` +
        (errores.length ? ` · errores: ${errores.join(" | ")}` : ""),
    );
    await page.close();
  }
} finally {
  await navegador.close();
  await servido.cerrar();
}

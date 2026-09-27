/**
 * Lo que cuesta un mundo: arranque, memoria y cuadro, con la GPU de verdad.
 *
 * Existe para contestar una pregunta con números antes de decidirla: **¿cuánto
 * cuesta ensanchar el mundo de un vuelo, y cuánto cuesta cada aeropuerto
 * vecino que se monta en él?** El banco de rendimiento de siempre
 * (`verificar-rendimiento.mjs`) mide el cuadro con SwiftShader y contra el
 * servidor de desarrollo; eso vale para ver si algo se dispara, pero no para
 * medir el arranque —Vite compila módulo a módulo al pedirlos, y eso no lo
 * paga nadie en la web publicada— ni la memoria que se lleva la tarjeta.
 *
 * Así que aquí se compara **compilaciones**, cada una en su carpeta, servidas
 * tal cual como las serviría nginx, en el mismo navegador y a la vez:
 *
 *     NODE_ENV=development npx vite build          # en cada árbol a comparar
 *     node scripts/medir-mundo.mjs antes=../otro/dist despues=dist
 *
 * `NODE_ENV=development` deja dentro la ventana de pruebas (`__oga`), que es
 * lo que permite colocar el avión y mirar la escena; todo lo demás —el
 * empaquetado, los relieves comprimidos— es lo de producción.
 *
 * ## Cómo se mide, y por qué así
 *
 * - **La CPU va estrangulada cuatro veces desde antes de pedir la página**,
 *   que es la tablet de gama media del aula (ver `verificar-rendimiento.mjs`).
 *   El arranque se mide con ella puesta: es donde duele.
 * - **La GPU es la del portátil**, no SwiftShader. Se comprueba y se dice cuál
 *   es: si sale SwiftShader, los números del cuadro no valen.
 * - **Las variantes se alternan**, vuelta a vuelta y en orden cambiado. En
 *   esta máquina corren otras cosas a la vez, y medir primero todo lo de una y
 *   luego todo lo de la otra mide también quién estaba usando el equipo en
 *   cada momento. Alternando, ese ruido cae igual sobre las dos.
 * - **Cada carga en un contexto nuevo**, sin caché: es la primera visita, que
 *   es la que se sufre.
 *
 * ## Qué sale
 *
 * - arranque: hasta el juego creado, y hasta que llegan las fotos que se piden
 *   después (anillos y vecinos);
 * - memoria: el montón de JavaScript, y **lo que ocupan en la tarjeta las
 *   texturas y las mallas**, sumado recorriendo la escena. Esto último no
 *   depende del aparato y es el número que manda en una tablet, donde la
 *   memoria de vídeo es la del sistema;
 * - cuadro: mediana y p95 en el puesto, sobre el campo y en crucero mirando al
 *   vecino más lejano, con llamadas y triángulos.
 *
 * Opciones: `--escenario pettirossi`, `--avion jaz-20`, `--vueltas 3`,
 * `--rumbo 95` (hacia dónde mira el crucero, grados verdaderos),
 * `--salida fichero.json`. Y cada variante puede llevar su propio escenario y
 * su rumbo —`gc=dist,gran-canaria,290`—, que es como se pone al lado una
 * referencia: el mundo más gordo que ya se publica.
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, stat, writeFile } from "node:fs/promises";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const opcion = (nombre, porDefecto) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? args[i + 1] : porDefecto;
};
const ESCENARIO = opcion("escenario", "pettirossi");
const AVION = opcion("avion", "jaz-20");
const VUELTAS = Number(opcion("vueltas", "3"));
const RUMBO = Number(opcion("rumbo", "95"));
const SALIDA = opcion("salida", null);
const VARIANTES = args
  .filter((a, i) => a.includes("=") && !args[i - 1]?.startsWith("--"))
  .map((a) => {
    const [etiqueta, resto] = a.split("=");
    const [carpeta, escenario, rumbo] = resto.split(",");
    return {
      etiqueta,
      carpeta: resolve(carpeta),
      escenario: escenario || ESCENARIO,
      rumbo: rumbo ? Number(rumbo) : RUMBO,
    };
  });
if (VARIANTES.length === 0) {
  console.error("uso: node scripts/medir-mundo.mjs etiqueta=carpeta-dist …");
  process.exit(1);
}
for (const v of VARIANTES)
  if (!existsSync(join(v.carpeta, "index.html")))
    throw new Error(`${v.carpeta} no tiene index.html: ¿está compilada?`);

/** Cuánto se estrangula la CPU: la tablet de gama media. */
const APRIETE = 4;
/** Cuánto se cuenta en cada sitio, ms. */
const MIDE = 5000;

// ── Un servidor estático por variante, como nginx ─────────────────────────

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".bin": "application/octet-stream",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

async function servir(carpeta) {
  const servidor = createServer(async (pet, res) => {
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
  return { servidor, base: `http://127.0.0.1:${servidor.address().port}` };
}

// ── La memoria del navegador entero, por si acaso ─────────────────────────

/** Los PID de un proceso y todos sus descendientes. */
function arbol(raiz) {
  const hijos = new Map();
  for (const d of readdirSync("/proc")) {
    if (!/^\d+$/.test(d)) continue;
    try {
      const st = readFileSync(`/proc/${d}/stat`, "utf8");
      const ppid = Number(st.slice(st.lastIndexOf(")") + 2).split(" ")[1]);
      if (!hijos.has(ppid)) hijos.set(ppid, []);
      hijos.get(ppid).push(Number(d));
    } catch {
      /* el proceso ya no está */
    }
  }
  const todos = [];
  const pila = [raiz];
  while (pila.length) {
    const p = pila.pop();
    todos.push(p);
    pila.push(...(hijos.get(p) ?? []));
  }
  return todos;
}

/** La memoria proporcional (PSS) de un árbol de procesos, MB. */
function pss(raiz) {
  let kb = 0;
  for (const p of arbol(raiz)) {
    try {
      const m = readFileSync(`/proc/${p}/smaps_rollup`, "utf8").match(/^Pss:\s+(\d+)/m);
      if (m) kb += Number(m[1]);
    } catch {
      /* el proceso ya no está */
    }
  }
  return kb / 1024;
}

// ── Lo que se mide dentro de la página ────────────────────────────────────

/** Los cuadros de `ms` milisegundos: mediana, p95 y lo que costó el último. */
const contarCuadros = async (ms) => {
  const tiempos = [];
  await new Promise((listo) => {
    let previo = performance.now();
    const fin = previo + ms;
    const paso = (t) => {
      tiempos.push(t - previo);
      previo = t;
      if (t < fin) requestAnimationFrame(paso);
      else listo();
    };
    requestAnimationFrame(paso);
  });
  tiempos.sort((a, b) => a - b);
  const en = (p) => tiempos[Math.floor(tiempos.length * p)] ?? 0;
  const c = globalThis.__oga.coste();
  return { mediana: en(0.5), p95: en(0.95), llamadas: c.llamadas, triangulos: c.triangulos };
};

/**
 * Lo que ocupa la escena en la tarjeta: texturas y mallas, MB.
 *
 * Se recorre la escena y se suma cada textura una vez —muchas se comparten—
 * con sus mipmaps, a cuatro bytes por píxel, que es como las sube WebGL. Es
 * una cuenta y no una lectura del controlador, y por eso vale igual para
 * cualquier aparato: una tablet no tiene memoria de vídeo aparte, así que lo
 * que se sube aquí se le quita al sistema.
 */
const pesarEscena = () => {
  const vistas = new Set();
  const grandes = [];
  let texturas = 0;
  let mallas = 0;
  let nTexturas = 0;
  const pesar = (t, donde) => {
    if (!t || !t.isTexture || vistas.has(t.uuid)) return;
    vistas.add(t.uuid);
    const img = t.image;
    const w = img?.width ?? img?.videoWidth ?? 0;
    const h = img?.height ?? img?.videoHeight ?? 0;
    const capas = img?.depth ?? 1;
    const bytes = w * h * capas * 4 * (t.generateMipmaps !== false ? 4 / 3 : 1);
    if (bytes > 0) {
      texturas += bytes;
      nTexturas++;
      grandes.push({ donde, w, h, mb: bytes / 2 ** 20 });
    }
  };
  const geos = new Set();
  globalThis.__oga.escena().traverse((o) => {
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) {
      for (const v of Object.values(m)) pesar(v, o.name || o.parent?.name || o.type);
      for (const u of Object.values(m.uniforms ?? {}))
        pesar(u?.value, o.name || o.parent?.name || o.type);
    }
    const g = o.geometry;
    if (g && !geos.has(g.uuid)) {
      geos.add(g.uuid);
      for (const a of Object.values(g.attributes ?? {})) mallas += a.array?.byteLength ?? 0;
      mallas += g.index?.array?.byteLength ?? 0;
    }
  });
  grandes.sort((a, b) => b.mb - a.mb);
  return {
    texturasMB: texturas / 2 ** 20,
    mallasMB: mallas / 2 ** 20,
    nTexturas,
    grandes: grandes.slice(0, 12),
  };
};

// ── El banco ──────────────────────────────────────────────────────────────

const servidos = [];
for (const v of VARIANTES) servidos.push({ ...v, ...(await servir(v.carpeta)) });

const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: [
    "--headless=new",
    "--enable-gpu",
    "--ignore-gpu-blocklist",
    "--use-angle=gl",
    // Sin techo de sesenta: si no, se mide el monitor y no el juego.
    "--disable-gpu-vsync",
    "--disable-frame-rate-limit",
    "--enable-precise-memory-info",
  ],
});
/*
 * El proceso del navegador es hijo de éste: Playwright lo lanza desde aquí.
 * Se busca por parentesco y no por nombre, que en este portátil hay otros
 * Chrome —el navegador de quien trabaja en él también lo es—.
 */
const pidNavegador = arbol(process.pid).find((p) => {
  try {
    return p !== process.pid && readFileSync(`/proc/${p}/cmdline`, "utf8").includes("chrome");
  } catch {
    return false;
  }
});
const filas = [];
let tarjeta = "?";

try {
  for (let vuelta = 0; vuelta < VUELTAS; vuelta++) {
    // El orden cambia en cada vuelta: la primera carga de la tanda no puede
    // ser siempre la misma.
    const orden = vuelta % 2 === 0 ? servidos : [...servidos].reverse();
    for (const v of orden) {
      const contexto = await navegador.newContext({
        viewport: { width: 1280, height: 720 },
        serviceWorkers: "block",
      });
      const page = await contexto.newPage();
      const errores = [];
      page.on("pageerror", (e) => errores.push(e.message.slice(0, 140)));
      await page.addInitScript(() => {
        localStorage.setItem("oga-veve:teclas-vistas", "1");
      });
      const cdp = await contexto.newCDPSession(page);
      await cdp.send("Performance.enable");
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: APRIETE });
      const url =
        `${v.base}/?escenario=${v.escenario}&hora=16&leccion=despegue` +
        `&tramo=guyrami&avion=${AVION}`;
      const t0 = Date.now();
      await page.goto(url);
      await page.waitForFunction(() => !!globalThis.__oga?.estado, null, {
        timeout: 240000,
        polling: 250,
      });
      const tJuego = (Date.now() - t0) / 1000;
      await page.evaluate(() => globalThis.__ogaEmpezar?.());
      // Y las fotos que se piden después: anillos y vecinos.
      await page.waitForLoadState("networkidle", { timeout: 240000 }).catch(() => {});
      const tTodo = (Date.now() - t0) / 1000;
      await page.waitForTimeout(3000);
      const migas = await page.evaluate(() => globalThis.__arranque ?? []);
      if (tarjeta === "?")
        tarjeta = await page.evaluate(() => {
          const gl = document.createElement("canvas").getContext("webgl2");
          const ext = gl?.getExtension("WEBGL_debug_renderer_info");
          return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "?";
        });

      const peso = await page.evaluate(pesarEscena);
      await cdp.send("HeapProfiler.collectGarbage").catch(() => {});
      const montón = await cdp.send("Runtime.getHeapUsage");
      const usedSize = montón.usedSize;
      // Los ArrayBuffer —relieves, mallas antes de subir— van fuera del montón.
      const fueraMB = (montón.backingStorageSize ?? NaN) / 2 ** 20;
      const proceso = pidNavegador ? pss(pidNavegador) : NaN;

      const cuadros = {};
      cuadros.puesto = await page.evaluate(contarCuadros, MIDE);
      await page.evaluate(() => {
        const o = globalThis.__oga;
        const r = o.pista();
        o.colocar(r.x, o.suelo(r.x, r.z) + 250, r.z, 30);
      });
      await page.waitForTimeout(2000);
      cuadros.campo = await page.evaluate(contarCuadros, MIDE);
      await page.evaluate((rumbo) => {
        // En crucero, a treinta kilómetros de casa y mirando al vecino: es
        // donde se ven a la vez el anillo del horizonte, su foto y los
        // mundos vecinos.
        const o = globalThis.__oga;
        const r = o.pista();
        const h = (rumbo * Math.PI) / 180;
        const x = r.x + Math.sin(h) * 30000;
        const z = r.z - Math.cos(h) * 30000;
        o.colocar(x, o.suelo(x, z) + 2500, z, 80, h);
      }, v.rumbo);
      await page.waitForTimeout(2500);
      cuadros.crucero = await page.evaluate(contarCuadros, MIDE);

      filas.push({
        variante: v.etiqueta,
        escenario: v.escenario,
        vuelta,
        tJuego,
        tTodo,
        migas,
        heapMB: usedSize / 2 ** 20,
        buffersMB: fueraMB,
        pssMB: proceso,
        ...peso,
        cuadros,
        errores,
      });
      console.log(
        `  ${v.etiqueta.padEnd(12)} vuelta ${vuelta + 1}: juego ${tJuego.toFixed(1)} s · ` +
          `todo ${tTodo.toFixed(1)} s · heap ${(usedSize / 2 ** 20).toFixed(0)}+${fueraMB.toFixed(0)} MB · ` +
          `texturas ${peso.texturasMB.toFixed(0)} MB (${peso.nTexturas}) · ` +
          `mallas ${peso.mallasMB.toFixed(0)} MB · PSS ${proceso.toFixed(0)} MB · ` +
          Object.entries(cuadros)
            .map(([k, c]) => `${k} ${c.mediana.toFixed(1)}/${c.p95.toFixed(1)} ms`)
            .join(" · ") +
          (errores.length ? ` · ${errores.length} errores: ${errores[0]}` : ""),
      );
      await contexto.close();
    }
  }
} finally {
  await navegador.close();
  for (const s of servidos) s.servidor.close();
}

// ── El resumen: la mediana de las vueltas ─────────────────────────────────

const mediana = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? NaN;
};
console.log(`\n  ${AVION} · CPU ×${APRIETE} · ${tarjeta}\n`);
for (const v of VARIANTES) {
  const f = filas.filter((x) => x.variante === v.etiqueta);
  const m = (fn) => mediana(f.map(fn));
  console.log(
    `  ${v.etiqueta.padEnd(12)} ${v.escenario} · juego ${m((x) => x.tJuego).toFixed(1)} s · ` +
      `todo ${m((x) => x.tTodo).toFixed(1)} s · heap ${m((x) => x.heapMB).toFixed(0)}+${m((x) => x.buffersMB).toFixed(0)} MB · ` +
      `texturas ${m((x) => x.texturasMB).toFixed(0)} MB · mallas ${m((x) => x.mallasMB).toFixed(0)} MB · ` +
      `PSS ${m((x) => x.pssMB).toFixed(0)} MB`,
  );
  for (const sitio of ["puesto", "campo", "crucero"])
    console.log(
      `  ${"".padEnd(12)} ${sitio.padEnd(8)} mediana ${m((x) => x.cuadros[sitio].mediana).toFixed(1)} ms · ` +
        `p95 ${m((x) => x.cuadros[sitio].p95).toFixed(1)} ms · ` +
        `${m((x) => x.cuadros[sitio].llamadas)} dibujos · ` +
        `${(m((x) => x.cuadros[sitio].triangulos) / 1000).toFixed(0)}k △`,
    );
}
if (SALIDA) await writeFile(SALIDA, JSON.stringify({ tarjeta, filas }, null, 2));

/**
 * **Lo de la tanda 14, en fotos y con números**: el lazo de remontar la pista
 * en Pilar, el umbral desplazado de La Palma, las reversas abiertas de los
 * dos reactores y los focos del JAZ 60 de frente.
 *
 * Existe porque las cuatro cosas son de mirar —«ese giro ahí en la pista», los
 * focos que no se veían de frente— y una prueba de unidad no ve una imagen.
 * Con `OGA_GPU=1`, con la tarjeta de verdad, que es como hay que mirar lo que
 * se ve: cada parte dice qué tarjeta pintó.
 *
 * 1. **Pilar, JAZ 60, por la 02**: en el punto de espera con el verde, el
 *    cuadro con la pantalla de navegación y la cabina; y en la pista,
 *    remontando, la cabina mirando al lazo. Dice dónde se gira.
 * 2. **La Palma por la 36**: en final a 1.500 y 500 m, cabina y persecución:
 *    las flechas, la barra, el PAPI.
 * 3. **Las reversas del JAZ 90 y el JAZ 120**, rodando por la pista a la
 *    velocidad de toma con la palanca atrás: lo que se mueve el manguito
 *    cada medio segundo —tiene que llegar a su recorrido a los dos—, y fotos
 *    desde la persecución y desde encima del ala. Y **lo que cuestan**: los
 *    fotogramas por segundo con los manguitos y las cascadas dibujados y sin
 *    dibujar, alternando.
 * 4. **Los focos del JAZ 60 de frente**, de noche, en la pista.
 *
 * Uso: `OGA_GPU=1 node scripts/ver-remonte-reversas-y-focos.mjs carpeta [partes]`
 * con `partes` una lista como `lazo,palma,reversas,focos` (todas, si no).
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const CARPETA = process.argv[2];
if (!CARPETA) {
  console.error("  uso: node scripts/ver-remonte-reversas-y-focos.mjs carpeta [partes]");
  process.exit(2);
}
const PARTES = new Set((process.argv[3] ?? "lazo,palma,reversas,focos").split(","));
mkdirSync(CARPETA, { recursive: true });
const CON_GPU = process.env.OGA_GPU === "1";
const PUERTO = 5361;
const ALTO = 800;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const fallos = [];

async function abrir(consulta) {
  const page = await navegador.newPage({ viewport: { width: 1280, height: ALTO } });
  page.on("pageerror", (e) => console.log("  ERROR:", e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(`${BASE}/?${consulta}`);
  await page.bringToFront();
  await page.waitForFunction(
    () => globalThis.__oga?.estado?.() && globalThis.__oga?.aeronave?.().deVerdad,
    null,
    { timeout: 120000 },
  );
  await page.waitForTimeout(2500);
  const tarjeta = await page.evaluate(() => {
    const gl = globalThis.__oga.pintor().getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre";
  });
  console.log(`  · ${consulta}\n    tarjeta: ${tarjeta}`);
  return page;
}

try {
  // ── 1. El lazo de Pilar ────────────────────────────────────────────────
  if (PARTES.has("lazo")) {
    const page = await abrir("escenario=pilar&hora=12&tramo=taguato&avion=jaz-60&meteo=&viento=020/12");
    // Al punto de espera: el final de la raya de rodaje, mirando a la pista.
    const espera = await page.evaluate(() => {
      const o = globalThis.__oga;
      o.pilotar((c) => {
        c.engineOn = true;
        c.throttle = 0;
        c.brakes = 1;
      });
      const r = o.ruta();
      const a = r[r.length - 2];
      const b = r[r.length - 1];
      if (!a || !b) return null;
      const h = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
      o.colocar(b[0], o.sueloDeVuelo(b[0], b[1]) + o.avion().tren, b[1], 0, h);
      return { x: b[0], z: b[1] };
    });
    console.log(`    en el punto de espera: ${JSON.stringify(espera)}`);
    await page
      .waitForFunction(() => globalThis.__oga.luzVerde() === true, null, { timeout: 60000 })
      .catch(() => console.log("    (sin verde en un minuto)"));
    await pausa(1500);
    const bt = await page.evaluate(() => ({ ...globalThis.__oga.backTaxi(), fase: globalThis.__oga.fase() }));
    console.log(`    con el verde: fase ${bt.fase}, se gira en ${bt.giro} (el avión en ${bt.along})`);
    if (bt.giro === null) fallos.push("Pilar: con el verde no se sabe dónde se gira");
    await page.screenshot({ path: `${CARPETA}/lazo-pilar-espera-cuadro.png` });
    await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
    await pausa(1200);
    await page.screenshot({ path: `${CARPETA}/lazo-pilar-espera-cabina.png` });
    // Y en la pista, remontando hacia la cabecera, con el lazo delante.
    await page.evaluate(() => {
      const o = globalThis.__oga;
      const r = o.ruta();
      // El punto de la raya a ochenta metros antes del giro, y su rumbo.
      const b = o.backTaxi();
      const pista = o.pista();
      const h0 = (pista.heading * Math.PI) / 180;
      // A lo largo del eje desde el centro, positivo hacia donde se despega.
      const along = (p) => (p[0] - pista.x) * Math.sin(h0) - (p[1] - pista.z) * Math.cos(h0);
      let mejor = null;
      for (let i = 0; i < r.length - 1; i++) {
        const p = r[i];
        const q = r[i + 1];
        // Yendo hacia la cabecera: la raya de ida, no la de vuelta.
        const va = along(q) - along(p);
        if (va >= 0) continue;
        const d = Math.abs(along(p) - (b.giro + 90));
        if (!mejor || d < mejor.d) mejor = { p, q, d };
      }
      if (!mejor) return;
      const h = Math.atan2(mejor.q[0] - mejor.p[0], -(mejor.q[1] - mejor.p[1]));
      o.colocar(mejor.p[0], o.sueloDeVuelo(mejor.p[0], mejor.p[1]) + o.avion().tren, mejor.p[1], 0, h);
    });
    await pausa(2500);
    const bt2 = await page.evaluate(() => ({ ...globalThis.__oga.backTaxi(), fase: globalThis.__oga.fase() }));
    console.log(`    remontando: fase ${bt2.fase}, el avión en ${bt2.along}, se gira en ${bt2.giro}`);
    await page.screenshot({ path: `${CARPETA}/lazo-pilar-remontando-cabina.png` });
    await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
    await pausa(1500);
    await page.screenshot({ path: `${CARPETA}/lazo-pilar-remontando-persecucion.png` });
    await page.close();
  }

  // ── 2. El umbral desplazado de La Palma ───────────────────────────────
  if (PARTES.has("palma")) {
    const page = await abrir("escenario=la-palma&hora=12&tramo=taguato&avion=jaz-90&meteo=&viento=000/08");
    for (const d of [1500, 500]) {
      for (const vista of ["cockpit", "chase"]) {
        await page.evaluate((v) => globalThis.__oga.ponerVista(v), vista);
        for (let i = 0; i < 3; i++) {
          await page.evaluate((d) => {
            const o = globalThis.__oga;
            const f = o.puntoDeFinal(d);
            o.pedirTren(true);
            o.pedirFlaps(1);
            o.pilotar((c) => {
              c.throttle = 0.45;
              c.elevator = 0;
              c.aileron = 0;
            });
            // En la senda de tres grados del umbral de aterrizar, contada desde
            // la cota de la pista y no desde el mar que hay debajo de la final.
            const u = o.puntoDeFinal(0);
            const cota = o.sueloDeVuelo(u.x, u.z);
            o.colocar(f.x, cota + 15 + d * Math.tan((3 * Math.PI) / 180), f.z, o.avion().aproximacion ?? 70, f.h);
          }, d);
          await pausa(700);
        }
        await page.screenshot({ path: `${CARPETA}/palma-36-${d}m-${vista}.png` });
      }
    }
    await page.close();
  }

  // ── 3. Las reversas ───────────────────────────────────────────────────
  if (PARTES.has("reversas")) {
    for (const id of ["jaz-90", "jaz-120"]) {
      const page = await abrir(`escenario=tenerife-norte&hora=12&tramo=guyrami&avion=${id}&meteo=&viento=000/00`);
      /*
       * **Aterrizando, no apareciendo en la pista.** Puesto en la pista desde
       * el puesto, sin verde, el juego lo cuenta como entrar en pista sin
       * permiso —su percance, con la pantalla y todo parado—. Así que primero
       * en final y luego en el suelo, a la velocidad de toma: un aterrizaje,
       * como hace `ver-frenos-de-tierra.mjs`.
       */
      const enLaPista = async () => {
        await page.evaluate(() => {
          const o = globalThis.__oga;
          const f = o.puntoDeFinal(900);
          o.pedirTren(true);
          o.pedirFlaps(1);
          o.pilotar((c) => {
            c.engineOn = true;
            c.throttle = 0.5;
            c.reversa = 0;
          });
          o.colocar(f.x, f.suelo + 50, f.z, o.avion().aproximacion ?? 70, f.h);
        });
        await pausa(1500);
        await page.evaluate(() => {
          const o = globalThis.__oga;
          const t = o.puntoDeFinal(-300);
          o.pilotar((c) => {
            c.engineOn = true;
            c.throttle = 0;
            c.brakes = 0;
            c.elevator = 0;
            c.reversa = 0;
          });
          o.colocar(t.x, o.sueloDeVuelo(t.x, t.z) + o.avion().tren + 0.05, t.z, o.avion().aproximacion ?? 70, t.h);
        });
        await pausa(700);
      };
      const manguito = () =>
        page.evaluate(() => {
          const g = globalThis.__oga.aeronave().grupo;
          let n = null;
          g.traverse((o) => {
            if (!n && /^reversa-/.test(o.name)) n = o;
          });
          return n ? +n.position.length().toFixed(3) : null;
        });
      await enLaPista();
      await pausa(1500);
      const cerrado = await manguito();
      // La palanca atrás, como quien la levanta: y cada medio segundo, cuánto.
      await page.evaluate(() =>
        globalThis.__oga.pilotar((c) => {
          c.engineOn = true;
          c.throttle = 0;
          c.reversa = 1;
        }),
      );
      const pasos = [];
      const t0 = Date.now();
      for (let i = 0; i < 6; i++) {
        await pausa(500);
        pasos.push(`${((Date.now() - t0) / 1000).toFixed(1)} s: ${(await manguito())} m`);
      }
      console.log(`    ${id}: cerrado ${cerrado} m · ${pasos.join(" · ")}`);
      const abierto = await manguito();
      if (!(abierto > 0.3)) fallos.push(`${id}: el manguito no se abre (${abierto} m)`);
      /*
       * Las que pidió el encargo —la de seguir y las de encima del ala— y las
       * de costado y la ventanilla de delante, que son desde donde se ve el
       * motor entero: desde encima del ala el motor queda por delante y por
       * debajo de la ventanilla, y desde atrás lo tapan los flaps.
       */
      for (const vista of ["chase", "pasaje-ala-izquierda", "pasaje-ala-derecha", "pasaje-izquierda", "izquierda", "morro"]) {
        const puesta = await page.evaluate((v) => globalThis.__oga.ponerVista(v), vista);
        if (puesta !== vista) {
          console.log(`    (sin vista «${vista}»)`);
          continue;
        }
        await enLaPista();
        await page.evaluate(() =>
          globalThis.__oga.pilotar((c) => {
            c.engineOn = true;
            c.throttle = 0;
            c.reversa = 1;
          }),
        );
        await pausa(2800);
        await page.screenshot({ path: `${CARPETA}/reversa-${id}-${vista}.png` });
      }
      // Y lo que cuesta: parado en la pista, de persecución, con todo
      // dibujado y con los manguitos y las cascadas apagados, alternando.
      await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
      await page.evaluate(() =>
        globalThis.__oga.pilotar((c) => {
          c.engineOn = true;
          c.throttle = 0;
          c.reversa = 1;
          c.brakes = 1;
        }),
      );
      await pausa(3000);
      const medir = (ms) =>
        page.evaluate(
          (ms) =>
            new Promise((fin) => {
              let n = 0;
              const t0 = performance.now();
              const paso = () => {
                n++;
                if (performance.now() - t0 < ms) requestAnimationFrame(paso);
                else fin((n * 1000) / (performance.now() - t0));
              };
              requestAnimationFrame(paso);
            }),
          ms,
        );
      const verlas = (si) =>
        page.evaluate((si) => {
          globalThis.__oga.aeronave().grupo.traverse((o) => {
            if (/-(manguito|cascada)/.test(o.name)) o.visible = si;
          });
        }, si);
      const con = [];
      const sin = [];
      for (let i = 0; i < 4; i++) {
        await verlas(true);
        await pausa(300);
        con.push(await medir(3000));
        await verlas(false);
        await pausa(300);
        sin.push(await medir(3000));
      }
      await verlas(true);
      const media = (v) => v.reduce((a, b) => a + b, 0) / v.length;
      const piezas = await page.evaluate(() => {
        let tri = 0;
        let mallas = 0;
        globalThis.__oga.aeronave().grupo.traverse((o) => {
          if (!/-(manguito|cascada)/.test(o.name) || !o.geometry) return;
          mallas++;
          const g = o.geometry;
          tri += (g.index ? g.index.count : g.attributes.position.count) / 3;
        });
        return { tri, mallas };
      });
      console.log(
        `    ${id}: ${piezas.mallas} mallas de reversa, ${piezas.tri} triángulos · ` +
          `${media(con).toFixed(1)} fps con ellas, ${media(sin).toFixed(1)} sin ellas ` +
          `(con ${con.map((f) => f.toFixed(0)).join("/")}, sin ${sin.map((f) => f.toFixed(0)).join("/")})`,
      );
      await page.close();
    }
  }

  // ── 4. Los focos del JAZ 60, de frente y de noche ─────────────────────
  if (PARTES.has("focos")) {
    // En final, con el tren fuera: los focos encendidos, mirados de frente.
    for (const [hora, cual] of [[23, "noche"], [12, "dia"]]) {
      const page = await abrir(`escenario=tenerife-norte&hora=${hora}&tramo=guyrami&avion=jaz-60&meteo=&viento=000/00`);
      await page.evaluate(() => globalThis.__oga.ponerVista("morro"));
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => {
          const o = globalThis.__oga;
          const f = o.puntoDeFinal(1500);
          o.pedirTren(true);
          o.pedirFlaps(1);
          o.pilotar((c) => {
            c.engineOn = true;
            c.throttle = 0.5;
            c.elevator = 0;
          });
          o.colocar(f.x, f.suelo + 80, f.z, o.avion().aproximacion ?? 60, f.h);
        });
        await pausa(1000);
      }
      await page.screenshot({ path: `${CARPETA}/focos-jaz-60-morro-${cual}.png` });
      await page.close();
    }
  }
  console.log(fallos.length ? `\n  ✗ ${fallos.join("\n  ✗ ")}` : "\n  ✓ sin fallos");
  console.log(`  capturas en ${CARPETA}/`);
} finally {
  await navegador.close();
  await server.close();
}
process.exit(fallos.length ? 1 : 0);

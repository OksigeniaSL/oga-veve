/**
 * **La cabina de pasaje y lo que se ve desde ella**, con la tarjeta de verdad.
 *
 * Saca las capturas con las que se juzga la vista de pasajero: la pared de la
 * ventanilla con sus vecinas, lo que señala la comandante desde la ventanilla
 * y desde la vista de detrás, y —con `OGA_NOCHE=1`— la cabina de noche. No
 * comprueba nada: para eso están `verificar-mirada.mjs` y
 * `verificar-ventanilla.mjs`. Esto es para mirar, y por eso va con la GPU.
 *
 * Se pone el avión en crucero con el automático, rumbo al suroeste por el
 * norte de Tenerife, con el Teide `OGA_TEIDE` grados a la derecha del morro
 * (por defecto setenta: ya en la ventanilla). Y se espera a la comandante.
 *
 *   node scripts/ver-pasaje.mjs carpeta [avión] [hora]
 *
 * `OGA_GPU=0` con SwiftShader: no vale para mirar.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const FOTOS = process.argv[2] ?? "capturas-pasaje";
const AVION = process.argv[3] ?? "jaz-120";
const HORA = process.argv[4] ?? "12";
const TEIDE_A = Number(process.env.OGA_TEIDE ?? 70);
const CON_GPU = process.env.OGA_GPU !== "0";
const PUERTO = 5383;
mkdirSync(FOTOS, { recursive: true });

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "warn",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: [
    ...(CON_GPU
      ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
      : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"]),
    // Sin techo de sesenta al medir, para que la medida sea el juego y no el
    // monitor. Ver `verificar-mirada.mjs`.
    ...(process.env.OGA_MEDIR ? ["--disable-gpu-vsync", "--disable-frame-rate-limit"] : []),
  ],
});

try {
  const page = await navegador.newPage({
    viewport: { width: 1280, height: 720 },
    locale: "es-PY",
  });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(
    `${BASE}/?escenario=tenerife-norte&hora=${HORA}&avion=${AVION}&tramo=guyrami` +
      `&destino=gran-canaria&teselas=0&meteo=&viento=000/00`,
  );
  await page.bringToFront();
  await page.waitForFunction(() => !!globalThis.__oga?.estado?.(), null, { timeout: 120_000 });
  await page.waitForTimeout(6000);
  const tarjeta = await page.evaluate(() => {
    const gl = globalThis.__oga.pintor().getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre";
  });
  console.log(`  ${tarjeta}`);
  await page.keyboard.press("i");
  await page.waitForTimeout(600);

  // En crucero, con el Teide a `TEIDE_A` grados a la derecha del morro y a
  // treinta kilómetros, y el automático puesto.
  const teide = await page.evaluate(async (a) => {
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    const { trueFromIndicated } = await import("/src/flight/atmosphere.ts");
    const espera = (ms) => new Promise((res) => setTimeout(res, ms));
    const t = (j.hitosDelVuelo ?? []).find((h) => /teide/i.test(h.nombre));
    if (!t) return null;
    const alto = 4500;
    const rumbo = (225 * Math.PI) / 180;
    // El Teide, a `a` grados a la derecha del rumbo: el avión se pone a treinta
    // kilómetros de él en la dirección contraria.
    const haciaElTeide = rumbo + (a * Math.PI) / 180;
    const x = t.x - Math.sin(haciaElTeide) * 30_000;
    const z = t.z + Math.cos(haciaElTeide) * 30_000;
    const tas = trueFromIndicated(270 / 1.94384, alto, j.flight.aireDelDia());
    o.colocar(x, alto, z, tas, rumbo);
    const c = o.controles();
    c.throttle = j.flight.gasPara(tas);
    c.trim = 0;
    if ("ventanillaAlt" in j) j.ventanillaAlt = Math.round(alto / 0.3048 / 100) * 100;
    await espera(300);
    o.pedirTren(false);
    o.pedirFlaps(0);
    await espera(300);
    o.pilotoAutomatico(true);
    return { x: t.x, y: t.ele, z: t.z };
  }, TEIDE_A);
  if (!teide) console.log("  (el escenario no tiene Teide)");

  // Y las de encima del ala, en el avión que las tiene: la tecla se las
  // salta en los demás, y entonces no hay captura.
  for (const vista of ["pasaje-derecha", "pasaje-izquierda", "pasaje-ala-derecha", "pasaje-ala-izquierda"]) {
    const puesta = await page.evaluate((v) => globalThis.__oga.ponerVista(v), vista);
    if (puesta !== vista) continue;
    await pausa(2500);
    await page.screenshot({ path: `${FOTOS}/${AVION}-${vista}.png` });
  }

  /*
   * **La persiana —o el cristal— y la cabina**, si este juego ya las tiene:
   * en crucero, a toques, y preparando la cabina para aterrizar, cuando se
   * aclara sola. Y mirando hacia delante, donde está el respaldo de la fila
   * de delante.
   */
  const conCabina = await page.evaluate(() => typeof globalThis.__oga.cabina === "function");
  if (conCabina) {
    const foto = async (nombre) => {
      const c = await page.evaluate(() => globalThis.__oga.cabina());
      console.log(
        `  ${nombre}: ${c.tipo} · tapan ${c.tapan.map((x) => x.toFixed(2)).join(" ")} · ` +
          `luz ${c.luz.toFixed(2)}${c.bloqueada ? " · preparada" : ""} · ` +
          `vecinas ${c.vecinas.delante ? "D" : "-"}${c.vecinas.detras ? "T" : "-"}`,
      );
      await page.screenshot({ path: `${FOTOS}/${AVION}-cabina-${nombre}.png` });
    };
    await page.evaluate(() => globalThis.__oga.ponerVista("pasaje-derecha"));
    await page.evaluate(() => globalThis.__oga.prepararLaCabina(false));
    await pausa(1500);
    await foto("crucero");
    for (const n of [1, 2]) {
      await page.evaluate(() => globalThis.__oga.tocarLaVentanilla());
      await pausa(5000);
      await foto(`toque-${n}`);
    }
    await page.evaluate(() => globalThis.__oga.prepararLaCabina(true));
    await pausa(1200);
    await foto("preparando");
    await pausa(5000);
    await foto("preparada");
    // Y un toque con la cabina preparada: no se deja.
    await page.evaluate(() => globalThis.__oga.tocarLaVentanilla());
    await pausa(200);
    await foto("preparada-toque");
    await page.evaluate(() => globalThis.__oga.prepararLaCabina(null));
    // Mirando hacia delante, asomándose: el respaldo de la fila de delante.
    await page.evaluate(() => globalThis.__oga.arrastrarLaMirada(700, 0, false));
    await pausa(600);
    await foto("mirando-adelante");
    await page.evaluate(() => globalThis.__oga.arrastrarLaMirada(0, 0, true));
    await pausa(2000);
  }
  /*
   * `OGA_MEDIR=1`: **lo que cuesta**, con la tarjeta de verdad: la vista de
   * detrás, la ventanilla clara y la ventanilla con el cristal oscurecido
   * —que es una pasada más—, a uno y a cuatro veces de CPU. Lo que se mira es
   * el tiempo de tarjeta de cada `render`, que es lo que añade el marco.
   */
  if (process.env.OGA_MEDIR) {
    const cdp = await page.context().newCDPSession(page);
    const medir = async (nombre) => {
      for (const veces of [1, 4]) {
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: veces });
        await pausa(1200);
        const m = await page.evaluate(async () => {
          const pintor = globalThis.__oga.pintor();
          const gl = pintor.getContext();
          const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
          const consultas = [];
          const original = pintor.render;
          if (ext)
            pintor.render = function (...args) {
              const q = gl.createQuery();
              gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
              try {
                return original.apply(this, args);
              } finally {
                gl.endQuery(ext.TIME_ELAPSED_EXT);
                consultas.push(q);
              }
            };
          const tiempos = [];
          await new Promise((listo) => {
            let previo = performance.now();
            const fin = previo + 4000;
            const paso = (t) => {
              tiempos.push(t - previo);
              previo = t;
              if (t < fin) requestAnimationFrame(paso);
              else listo();
            };
            requestAnimationFrame(paso);
          });
          pintor.render = original;
          for (let i = 0; i < 6; i++) await new Promise((r) => requestAnimationFrame(r));
          const ms = [];
          const roto = ext ? gl.getParameter(ext.GPU_DISJOINT_EXT) : true;
          for (const q of consultas) {
            if (!roto && gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE))
              ms.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
            gl.deleteQuery(q);
          }
          ms.sort((a, b) => a - b);
          tiempos.sort((a, b) => a - b);
          return {
            mediana: tiempos[Math.floor(tiempos.length / 2)] ?? 0,
            gpu: ms.length ? ms[Math.floor(ms.length / 2)] : null,
            llamadas: globalThis.__oga.coste?.().llamadas ?? null,
          };
        });
        console.log(
          `  coste · ${nombre.padEnd(16)} ×${veces} · mediana ${m.mediana.toFixed(1)} ms` +
            (m.gpu != null ? ` · tarjeta ${m.gpu.toFixed(2)} ms` : "") +
            (m.llamadas != null ? ` · ${m.llamadas} dibujos` : ""),
        );
      }
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    };
    /*
     * **El marco solo**, que es lo que cambia: se pinta él solo —y el tinte,
     * si lo hay— sobre una escena vacía con la cámara del pasaje, sesenta
     * veces, y se le resta lo que cuesta pintar la escena vacía. Medido así no
     * le afecta lo que haya fuera ni lo que esté haciendo el escritorio con la
     * misma tarjeta, que en la vista entera mueve la medida de dos a diez
     * milisegundos de una vuelta a otra.
     */
    await page.evaluate(() => globalThis.__oga.ponerVista("pasaje-derecha"));
    await pausa(2500);
    const soloElMarco = async (nombre) => {
      const r = await page.evaluate(async () => {
        const o = globalThis.__oga;
        const pintor = o.pintor();
        const gl = pintor.getContext();
        const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
        if (!ext) return null;
        const escena = o.escena();
        const camara = o.camaraViva();
        const piezas = ["marco-de-ventanilla", "cristal-oscuro"]
          .map((n) => escena.getObjectByName(n))
          .filter((m) => m && m.visible);
        const vacia = new escena.constructor();
        const conMarco = new escena.constructor();
        const medir = async (que) => {
          const qs = [];
          for (let i = 0; i < 60; i++) {
            const q = gl.createQuery();
            gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
            pintor.render(que, camara);
            gl.endQuery(ext.TIME_ELAPSED_EXT);
            qs.push(q);
            await new Promise((r) => requestAnimationFrame(r));
          }
          // Hasta que la tarjeta tenga la última: con el escritorio ocupado, seis
          // fotogramas no bastaban y la vuelta salía sin medida.
          for (let i = 0; i < 120 && !gl.getQueryParameter(qs[qs.length - 1], gl.QUERY_RESULT_AVAILABLE); i++)
            await new Promise((r) => requestAnimationFrame(r));
          const ms = [];
          for (const q of qs) {
            if (gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE))
              ms.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
            gl.deleteQuery(q);
          }
          ms.sort((a, b) => a - b);
          return ms[Math.floor(ms.length / 2)] ?? null;
        };
        const padres = piezas.map((m) => m.parent);
        for (const m of piezas) conMarco.add(m);
        try {
          const nada = await medir(vacia);
          const marco = await medir(conMarco);
          return { nada, marco, piezas: piezas.map((m) => m.name) };
        } finally {
          piezas.forEach((m, i) => padres[i]?.add(m));
        }
      });
      // Sin resultado si la tarjeta partió la medida —`GPU_DISJOINT`, cuando el
      // escritorio le pide algo a la vez—: esa vuelta no cuenta.
      if (!r || r.nada == null || r.marco == null) console.log(`  marco solo · ${nombre.padEnd(14)} · sin medida`);
      else
        console.log(
          `  marco solo · ${nombre.padEnd(14)} · ${(r.marco - r.nada).toFixed(3)} ms` +
            ` (vacía ${r.nada.toFixed(3)}, con ${r.piezas.join(" + ")} ${r.marco.toFixed(3)})`,
        );
    };
    for (let vuelta = 1; vuelta <= 3; vuelta++) await soloElMarco(`claro (${vuelta})`);
    /*
     * Y desde encima del ala, que en el de pasillo único lleva la trampilla de
     * la salida y su letrero en la pared: lo que cuesta de más está ahí.
     */
    const ala = await page.evaluate(() => globalThis.__oga.ponerVista("pasaje-ala-izquierda"));
    if (ala === "pasaje-ala-izquierda") {
      await pausa(2500);
      for (let vuelta = 1; vuelta <= 3; vuelta++) await soloElMarco(`ala (${vuelta})`);
    }
    await page.evaluate(() => globalThis.__oga.ponerVista("pasaje-derecha"));
    await pausa(2500);
    if (conCabina) {
      await page.evaluate(() => globalThis.__oga.prepararLaCabina(false));
      for (let i = 0; i < 4; i++) await page.evaluate(() => globalThis.__oga.tocarLaVentanilla());
      await pausa(6000);
      const c = await page.evaluate(() => globalThis.__oga.cabina());
      for (let vuelta = 1; vuelta <= 3; vuelta++)
        await soloElMarco(`tapada ${c.tapan[0].toFixed(2)} (${vuelta})`);
      // Y vuelta a clara, para lo que sigue.
      while ((await page.evaluate(() => globalThis.__oga.cabina())).tapan[0] > 0.01) {
        await page.evaluate(() => globalThis.__oga.tocarLaVentanilla());
        await pausa(6000);
      }
    }

    // Tres vueltas, alternando: la tarjeta la comparte el escritorio, y una
    // medida suelta mide también lo que estuviera haciendo él.
    if (conCabina) await page.evaluate(() => globalThis.__oga.prepararLaCabina(false));
    for (let vuelta = 1; vuelta <= 3; vuelta++) {
      await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
      await pausa(2000);
      await medir(`detrás (${vuelta})`);
      await page.evaluate(() => globalThis.__oga.ponerVista("pasaje-derecha"));
      await pausa(2500);
      await medir(`ventanilla (${vuelta})`);
      if ((await page.evaluate(() => globalThis.__oga.ponerVista("pasaje-ala-izquierda"))) ===
        "pasaje-ala-izquierda") {
        await pausa(2500);
        await medir(`encima ala (${vuelta})`);
      }
      await page.evaluate(() => globalThis.__oga.ponerVista("pasaje-derecha"));
    }
    // Oscurecida del todo, si es de las que se oscurecen; si es de persiana,
    // bajada: las dos cosas que se pueden hacer con ella.
    if (conCabina) {
      for (let i = 0; i < 4; i++) await page.evaluate(() => globalThis.__oga.tocarLaVentanilla());
      await pausa(6000);
      const c = await page.evaluate(() => globalThis.__oga.cabina());
      await medir(`${c.tipo === "electrocromica" ? "oscura" : "persiana"} ${c.tapan[0].toFixed(2)}`);
      await page.evaluate(() => globalThis.__oga.prepararLaCabina(null));
    }
  }
  if (process.env.OGA_SOLO_PARED) {
    if (errores.length) console.log(`  errores: ${errores.join(" · ")}`);
    await page.close();
    process.exitCode = 0;
  } else {

  // Y lo que señala la comandante, desde detrás: se espera a que lo diga.
  await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
  const hasta = Date.now() + 150_000;
  let senalado = null;
  while (Date.now() < hasta && !senalado) {
    await pausa(500);
    senalado = (await page.evaluate(() => globalThis.__oga.mirada())).senalado;
  }
  console.log(`  señalado: ${senalado ? `${senalado.nombre} (${senalado.lado})` : "nada"}`);
  if (senalado) {
    await page.screenshot({ path: `${FOTOS}/${AVION}-detras-al-senalar.png` });
    await pausa(3000);
    const donde = await page.evaluate(
      ({ x, y, z }) => globalThis.__oga.enElCuadro(x, y, z),
      senalado.punto,
    );
    console.log(
      `  a los tres segundos, desde detrás: (${donde.x.toFixed(2)}, ${donde.y.toFixed(2)})` +
        `${donde.delante ? "" : " detrás"}`,
    );
    await page.screenshot({ path: `${FOTOS}/${AVION}-detras-a-los-3-s.png` });
    await page.evaluate((v) => globalThis.__oga.ponerVista(v), `pasaje-${senalado.lado}`);
    await pausa(2500);
    await page.screenshot({ path: `${FOTOS}/${AVION}-pasaje-al-senalar.png` });
  }
  if (errores.length) console.log(`  errores: ${errores.join(" · ")}`);
  await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

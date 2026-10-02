/**
 * **¿Se ve lo que cuenta la comandante?** Mirar, girarse y la ventanilla.
 *
 * Existe por tres frases de quien lo jugó:
 *
 * - «Jazlyn estaba diciendo que mires a la izquierda para ver el Teide, y
 *   realmente se vería desde la ventanilla de un avión, pero al pulsar C no
 *   había manera: se ve La Gomera.»
 * - «Estaba en maniobra de descenso, y eso me obliga a soltar el timón para
 *   darle al modo vista lateral […] el juego tiene unas perspectivas fijas y
 *   no puedo mirar hacia donde está el objeto nombrado por la comandante.»
 * - «Me gustaría tener una vista de pasajero desde ventanilla derecha e
 *   izquierda.»
 *
 * Así que se vuela un crucero con la ventanilla hablando —por defecto el
 * JAZ 90 de Los Rodeos a La Palma, con el Teide por el través izquierdo— y:
 *
 * 1. **Se espera a que la comandante señale algo**, y se toca su tarjeta,
 *    como un dedo: la cámara tiene que girarse hasta que **el sitio quede
 *    dentro del cuadro**, desde detrás, desde la cabina y desde la ventanilla,
 *    y volver sola después.
 * 2. **Se arrastra el paisaje** —con el ratón en el portátil, y en el
 *   teléfono con un segundo dedo **mientras el pulgar sigue en la palanca**—,
 *   y al soltar la cabeza vuelve a su sitio. Y la palanca no pierde su dedo.
 * 3. **Se sacan las capturas** con la tarjeta de verdad: el Teide desde la
 *    ventanilla del pasaje y desde la mirada libre, en el portátil y en el
 *    teléfono.
 * 4. **Y se mide lo que cuesta la ventanilla**: tiempo de cuadro y de tarjeta
 *    en la vista de detrás, en la cabina y en el pasaje, a uno y a cuatro
 *    veces de CPU, que es la tablet de gama media del banco de rendimiento.
 *
 * Uso: `node scripts/verificar-mirada.mjs [escenario] [tramo] [avión] [destino]`
 *   `OGA_FOTOS=carpeta` dónde dejar las capturas (por defecto, `capturas-mirada`).
 *   `OGA_GPU=0` con SwiftShader: vale para medir el vuelo, no para mirar.
 *   `OGA_SOLO=portatil|telefono` uno de los dos.
 *   `OGA_SIN_MEDIR=1` sin la medida de rendimiento.
 */
import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const ESCENARIO = process.argv[2] ?? "tenerife-norte";
const TRAMO = process.argv[3] ?? "guyrami";
const AVION = process.argv[4] ?? "jaz-90";
const DESTINO = process.argv[5] ?? "la-palma";
const FOTOS = process.env.OGA_FOTOS ?? "capturas-mirada";
const CON_GPU = process.env.OGA_GPU !== "0";
const SOLO = process.env.OGA_SOLO ?? "";
const MEDIR = !process.env.OGA_SIN_MEDIR;
const PUERTO = 5373;
mkdirSync(FOTOS, { recursive: true });

/**
 * Cuánto se espera a que la comandante hable, s. Treinta de su primer rato,
 * lo que tarde en tener hueco, y margen: en dos minutos y medio de crucero
 * tiene que haber dicho algo, o la ventanilla está muda.
 */
const ESPERA_A_QUE_HABLE = 150;

/** Dónde tiene que caer lo señalado: dentro del cuadro y no rozando el borde. */
const DENTRO = 0.85;

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
    // Sin techo de sesenta, para que la medida sea el juego y no el monitor.
    "--disable-gpu-vsync",
    "--disable-frame-rate-limit",
  ],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") =>
  resultados.push({ nombre, ok: !!ok, detalle });
const medidas = [];
let tarjeta = "";
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Lo común ──────────────────────────────────────────────────────────────

/**
 * Abre el juego y pone el avión en crucero con el automático, al norte del
 * Teide y rumbo oeste: el Teide queda por el través izquierdo, a unos treinta
 * kilómetros. Si el escenario no tiene Teide, en crucero al norte del campo.
 */
async function abrir(ctx, quien) {
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(
    `${BASE}/?escenario=${ESCENARIO}&hora=12&avion=${AVION}&tramo=${TRAMO}` +
      `&destino=${DESTINO}&teselas=0&meteo=&viento=000/00`,
  );
  // Al frente, o el juego se para: ver `verificar-rodaje.mjs`.
  await page.bringToFront();
  await page.waitForFunction(() => !!globalThis.__oga?.estado?.(), null, {
    timeout: 120_000,
  });
  await page.waitForTimeout(6000);
  if (!tarjeta)
    tarjeta = await page.evaluate(() => {
      const gl = globalThis.__oga.pintor().getContext();
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre";
    });
  await page.keyboard.press("i");
  await page.waitForTimeout(600);
  const donde = await page.evaluate(async () => {
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    const { trueFromIndicated } = await import("/src/flight/atmosphere.ts");
    const espera = (ms) => new Promise((res) => setTimeout(res, ms));
    const teide = (j.hitosDelVuelo ?? []).find((h) => /teide/i.test(h.nombre));
    const alto = 4000;
    const tas = trueFromIndicated(250 / 1.94384, alto, j.flight.aireDelDia());
    // Rumbo oeste: el Teide, al sur, cae a la izquierda.
    const x = teide ? teide.x : 0;
    const z = teide ? teide.z - 28_000 : -30_000;
    o.colocar(x, alto, z, tas, -Math.PI / 2);
    const c = o.controles();
    c.throttle = j.flight.gasPara(tas);
    c.trim = 0;
    if ("ventanillaAlt" in j) j.ventanillaAlt = Math.round(alto / 0.3048 / 100) * 100;
    await espera(300);
    o.pedirTren(false);
    o.pedirFlaps(0);
    await espera(300);
    o.pilotoAutomatico(true);
    return { teide: teide ? { nombre: teide.nombre, x: teide.x, y: teide.ele, z: teide.z } : null };
  });
  comprobar(`${quien}: el escenario tiene el Teide`, !!donde.teide, donde.teide?.nombre ?? "");
  return { page, errores, teide: donde.teide };
}

/** Espera a que la comandante señale algo. Devuelve qué, o `null`. */
async function esperarASenalar(page) {
  const hasta = Date.now() + ESPERA_A_QUE_HABLE * 1000;
  while (Date.now() < hasta) {
    const m = await page.evaluate(() => globalThis.__oga.mirada());
    if (m.senalado) return m.senalado;
    await pausa(1000);
  }
  return null;
}

/** Dónde cae un punto en la pantalla ahora mismo. */
const enElCuadro = (page, p) =>
  page.evaluate(({ x, y, z }) => globalThis.__oga.enElCuadro(x, y, z), p);

const dentro = (c) => c.delante && Math.abs(c.x) < DENTRO && Math.abs(c.y) < DENTRO;
const fmt = (c) => `(${c.x.toFixed(2)}, ${c.y.toFixed(2)})${c.delante ? "" : " detrás"}`;

/** La caja de un elemento visible, en píxeles de pantalla. */
const caja = (page, sel) =>
  page.evaluate((sel) => {
    const e = document.querySelector(sel);
    if (!e || e.closest("[hidden]")) return null;
    const r = e.getBoundingClientRect();
    return r.width ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
  }, sel);

/**
 * **Mira lo señalado desde una vista** y comprueba que cae dentro del cuadro.
 * `tocar` es cómo se pide: la tarjeta con el dedo o el ratón, o la sonda si
 * la tarjeta ya se fue.
 */
async function mirarDesde(page, quien, vista, senalado, tocar, foto) {
  await page.evaluate((v) => globalThis.__oga.ponerVista(v), vista);
  await pausa(900);
  const pedido = await tocar();
  comprobar(`${quien}: desde «${vista}», la tarjeta gira la cámara`, pedido);
  await pausa(2600);
  const m = await page.evaluate(() => globalThis.__oga.mirada());
  const c = await enElCuadro(page, senalado.punto);
  comprobar(
    `${quien}: desde «${m.vista}», ${senalado.nombre} queda dentro del cuadro`,
    dentro(c),
    `${fmt(c)} · giro ${((m.guinada * 180) / Math.PI).toFixed(0)}°`,
  );
  /*
   * **Y en el pasaje, por el cristal.** Dentro del cuadro no basta: en la
   * primera tirada del teléfono el Teide cayó en el centro de la pantalla y
   * en el centro estaba la pared — la cabeza se había girado y el cristal se
   * había quedado a un lado.
   */
  const cristal = await page.evaluate(
    ({ x, y, z }) => globalThis.__oga.porLaVentanilla(x, y, z),
    senalado.punto,
  );
  if (cristal !== null)
    comprobar(`${quien}: y se ve por el cristal, no detrás de la pared`, cristal);
  if (foto) await page.screenshot({ path: `${FOTOS}/${foto}` });
  return m;
}

/** Espera a que la cabeza vuelva a su sitio, y lo comprueba. */
async function vuelveSola(page, quien, que, segundos) {
  const hasta = Date.now() + segundos * 1000;
  let m;
  while (Date.now() < hasta) {
    m = await page.evaluate(() => globalThis.__oga.mirada());
    if (!m.apuntando && Math.abs(m.guinada) < 0.01 && Math.abs(m.cabeceo) < 0.01) break;
    await pausa(250);
  }
  comprobar(
    `${quien}: ${que}, la cabeza vuelve sola`,
    !m.apuntando && Math.abs(m.guinada) < 0.01 && Math.abs(m.cabeceo) < 0.01,
    `giro ${((m.guinada * 180) / Math.PI).toFixed(1)}°`,
  );
}

// ── En el portátil ────────────────────────────────────────────────────────

async function enElPortatil() {
  const ctx = await navegador.newContext({
    viewport: { width: 1280, height: 720 },
    locale: "es-PY",
  });
  try {
    const { page, errores, teide } = await abrir(ctx, "portátil");

    // El Teide desde la ventanilla, sin girar nada: por el través izquierdo.
    await page.evaluate(() => globalThis.__oga.ponerVista("pasaje-izquierda"));
    await pausa(2500);
    const vista = await page.evaluate(() => globalThis.__oga.vista());
    comprobar("portátil: hay vista de pasaje en el JAZ 90", vista === "pasaje-izquierda", vista);
    if (teide) {
      const c = await enElCuadro(page, teide);
      const cristal = await page.evaluate(
        ({ x, y, z }) => globalThis.__oga.porLaVentanilla(x, y, z),
        teide,
      );
      comprobar("portátil: el Teide, por la ventanilla de la izquierda", dentro(c) && cristal, fmt(c));
    }
    await page.screenshot({ path: `${FOTOS}/portatil-pasaje-teide.png` });

    // La mirada libre: arrastrar el paisaje desde la vista de detrás.
    await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
    await pausa(1500);
    // Novecientos píxeles: lo que hace falta para girar noventa grados en
    // esta pantalla, que es donde va el Teide.
    await page.mouse.move(180, 300);
    await page.mouse.down();
    for (let i = 1; i <= 30; i++) await page.mouse.move(180 + i * 30, 300 + i);
    await pausa(400);
    const agarrada = await page.evaluate(() => globalThis.__oga.mirada());
    comprobar(
      "portátil: arrastrar el paisaje a la derecha mira a la izquierda",
      agarrada.guinada > 0.3,
      `${((agarrada.guinada * 180) / Math.PI).toFixed(0)}°`,
    );
    if (teide) {
      const c = await enElCuadro(page, teide);
      comprobar("portátil: mirando a la izquierda desde detrás, el Teide se ve", dentro(c), fmt(c));
    }
    await page.screenshot({ path: `${FOTOS}/portatil-mirada-libre.png` });
    await page.mouse.up();
    await vuelveSola(page, "portátil", "al soltar el ratón", 4);

    // Lo señalado: se espera a la comandante y se toca su tarjeta.
    const senalado = await esperarASenalar(page);
    comprobar("portátil: la comandante señala algo", !!senalado, senalado?.nombre ?? "en silencio");
    if (senalado) {
      const tarjetaSenal = await caja(page, '[data-hud="senal"]');
      const pulsable = await page.evaluate(
        () => !!document.querySelector('[data-hud="senal"].senal--pulsable:not([disabled])'),
      );
      comprobar("portátil: su tarjeta se puede tocar", !!tarjetaSenal && pulsable);
      await mirarDesde(
        page,
        "portátil",
        "chase",
        senalado,
        async () => {
          if (!tarjetaSenal) return page.evaluate(() => globalThis.__oga.mirarHaciaLoSenalado());
          await page.mouse.click(tarjetaSenal.x + tarjetaSenal.w / 2, tarjetaSenal.y + tarjetaSenal.h / 2);
          await pausa(100);
          return (await page.evaluate(() => globalThis.__oga.mirada())).apuntando;
        },
        "portatil-cola-mirando.png",
      );
      await vuelveSola(page, "portátil", "pasado su rato", 14);
      for (const [vista, foto] of [
        ["cockpit", "portatil-cabina-mirando.png"],
        [senalado.lado === "izquierda" ? "pasaje-derecha" : "pasaje-izquierda", "portatil-pasaje-mirando.png"],
      ])
        await mirarDesde(
          page,
          "portátil",
          vista,
          senalado,
          () => page.evaluate(() => globalThis.__oga.mirarHaciaLoSenalado()),
          foto,
        );
      // Desde la ventanilla del otro lado, se cambia de asiento.
      const m = await page.evaluate(() => globalThis.__oga.mirada());
      comprobar(
        "portátil: en el pasaje, se mira por la ventanilla del lado del sitio",
        m.vista === `pasaje-${senalado.lado}`,
        m.vista,
      );
    }

    if (MEDIR) await medir(page);
    comprobar("portátil: sin errores en la página", errores.length === 0, errores.join(" · "));
  } finally {
    await ctx.close();
  }
}

/**
 * **Lo que cuesta cada vista**, en el mismo sitio y mirando lo mismo: el
 * Teide por la izquierda. Tiempo entre cuadros y, con la tarjeta de verdad,
 * lo que tarda ella en cada `render`. Ver `verificar-rendimiento.mjs`.
 */
async function medir(page) {
  const cdp = await page.context().newCDPSession(page);
  for (const vista of ["chase", "cockpit", "pasaje-izquierda"]) {
    await page.evaluate((v) => globalThis.__oga.ponerVista(v), vista);
    await pausa(1500);
    for (const veces of [1, 4]) {
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: veces });
      await pausa(1200);
      const m = await page.evaluate(async (conGpu) => {
        const tiempos = [];
        const pintor = globalThis.__oga.pintor();
        const gl = pintor.getContext();
        const ext = conGpu ? gl.getExtension("EXT_disjoint_timer_query_webgl2") : null;
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
        let gpu = null;
        if (ext) {
          pintor.render = original;
          for (let i = 0; i < 6; i++) await new Promise((r) => requestAnimationFrame(r));
          const ms = [];
          const roto = gl.getParameter(ext.GPU_DISJOINT_EXT);
          for (const q of consultas) {
            if (!roto && gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE))
              ms.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
            gl.deleteQuery(q);
          }
          ms.sort((a, b) => a - b);
          gpu = ms.length ? ms[Math.floor(ms.length / 2)] : null;
        }
        tiempos.sort((a, b) => a - b);
        const en = (p) => tiempos[Math.floor(tiempos.length * p)] ?? 0;
        return { mediana: en(0.5), p95: en(0.95), gpu, ...globalThis.__oga.coste() };
      }, CON_GPU);
      medidas.push({ vista, veces, ...m });
    }
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  }
  /*
   * **Contra las vistas que ya había, y no contra un número fijo.** Esta
   * máquina la comparten varios bancos a la vez, y a cuatro veces de CPU la
   * vista de detrás pasó de dieciséis a treinta y nueve milisegundos de una
   * tirada a otra sin tocar una línea: con un listón fijo, el banco mediría
   * la carga del portátil. Lo que se pregunta es si el pasaje cuesta más que
   * lo que ya se juega, en el mismo sitio y en la misma tirada; el número
   * suelto se escribe igual, para quien lo mire con la máquina libre.
   */
  const de = (v, n) => medidas.find((m) => m.vista === v && m.veces === n);
  const pasaje = de("pasaje-izquierda", 4);
  const peor = Math.max(de("chase", 4)?.mediana ?? 0, de("cockpit", 4)?.mediana ?? 0);
  comprobar(
    "la vista de pasaje, a ×4 de CPU, no cuesta más que las que ya había",
    pasaje && (pasaje.mediana <= 33.3 || pasaje.mediana <= peor * 1.15),
    pasaje ? `${pasaje.mediana.toFixed(1)} ms; la más cara de las otras, ${peor.toFixed(1)} ms` : "",
  );
  const cola = de("chase", 1);
  const ventana = de("pasaje-izquierda", 1);
  if (cola?.gpu != null && ventana?.gpu != null)
    comprobar(
      "y a la tarjeta no le cuesta más que la vista de detrás",
      ventana.gpu <= cola.gpu * 1.1,
      `${ventana.gpu.toFixed(2)} ms contra ${cola.gpu.toFixed(2)} ms`,
    );
}

// ── En el teléfono ────────────────────────────────────────────────────────

async function enElTelefono() {
  const ctx = await navegador.newContext({
    ...devices["Pixel 7 landscape"],
    hasTouch: true,
    isMobile: true,
    locale: "es-PY",
  });
  try {
    const { page, errores, teide } = await abrir(ctx, "teléfono");
    const cdp = await ctx.newCDPSession(page);
    const puestos = new Map();
    const enviar = (type) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: [...puestos].map(([id, p]) => ({ id, x: p.x, y: p.y, radiusX: 9, radiusY: 9, force: 1 })),
      });
    const bajar = async (id, x, y) => {
      puestos.set(id, { x, y });
      await enviar("touchStart");
    };
    const mover = async (id, x, y) => {
      puestos.set(id, { x, y });
      await enviar("touchMove");
    };
    // El `touchEnd` lleva el dedo que se levanta. Ver `verificar-dedo.mjs`.
    const subir = async (id) => {
      const p = puestos.get(id);
      if (!p) return;
      puestos.delete(id);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [{ id, x: p.x, y: p.y, radiusX: 9, radiusY: 9, force: 1 }],
      });
    };
    const PULGAR = 1;
    const OTRO = 2;

    await page.evaluate(() => globalThis.__oga.ponerVista("pasaje-izquierda"));
    await pausa(2500);
    if (teide) {
      const c = await enElCuadro(page, teide);
      const cristal = await page.evaluate(
        ({ x, y, z }) => globalThis.__oga.porLaVentanilla(x, y, z),
        teide,
      );
      comprobar("teléfono: el Teide, por la ventanilla de la izquierda", dentro(c) && cristal, fmt(c));
    }
    await page.screenshot({ path: `${FOTOS}/telefono-pasaje-teide.png` });

    /*
     * **El pulgar en la palanca y el otro dedo en el paisaje.** La palanca se
     * inclina un poco a la izquierda y se queda así; el otro dedo arrastra.
     * Lo que se mira: que la cabeza gire, y que la palanca siga mandando
     * mientras tanto.
     */
    await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
    await pausa(1500);
    const palanca = await caja(page, ".pad--stick");
    comprobar("teléfono: la palanca está en pantalla", !!palanca);
    if (palanca) {
      const px = palanca.x + palanca.w / 2;
      const py = palanca.y + palanca.h / 2;
      await bajar(PULGAR, px, py);
      await mover(PULGAR, px - palanca.w * 0.2, py);
      const vp = page.viewportSize();
      // El otro dedo, de la mitad de la pantalla hacia la derecha: en un
      // teléfono, noventa grados son unos cuatrocientos píxeles.
      const x0 = vp.width * 0.3;
      const y0 = vp.height * 0.35;
      await bajar(OTRO, x0, y0);
      for (let i = 1; i <= 20; i++) await mover(OTRO, x0 + i * 22, y0 + i);
      await pausa(300);
      const m = await page.evaluate(() => globalThis.__oga.mirada());
      // En el aire, el dedo mueve la palanca que se queda (`palancaDelDedo`);
      // `touchRoll` es solo el volante de tierra y allí vale cero.
      const alabeo = await page.evaluate(() => globalThis.__oga.juegoParaTrazas().input.palancaDelDedo.x);
      comprobar(
        "teléfono: con el pulgar en la palanca, el segundo dedo mira",
        m.guinada > 0.2,
        `${((m.guinada * 180) / Math.PI).toFixed(0)}°`,
      );
      comprobar(
        "teléfono: y la palanca sigue con su dedo",
        alabeo < -0.05,
        `palanca ${alabeo?.toFixed?.(2)}`,
      );
      if (teide) {
        const c = await enElCuadro(page, teide);
        comprobar("teléfono: mirando a la izquierda desde detrás, el Teide se ve", dentro(c), fmt(c));
      }
      await page.screenshot({ path: `${FOTOS}/telefono-mirada-libre.png` });
      await subir(OTRO);
      await vuelveSola(page, "teléfono", "al levantar el segundo dedo", 4);
      const sigue = await page.evaluate(() => globalThis.__oga.juegoParaTrazas().input.palancaDelDedo.x);
      comprobar("teléfono: y el pulgar sigue en la palanca", sigue < -0.05, `palanca ${sigue?.toFixed?.(2)}`);
      await mover(PULGAR, px, py);
      await subir(PULGAR);
    }

    // Lo señalado, tocando la tarjeta con el segundo dedo y el pulgar puesto.
    await page.evaluate(() => globalThis.__oga.ponerVista("pasaje-izquierda"));
    const senalado = await esperarASenalar(page);
    comprobar("teléfono: la comandante señala algo", !!senalado, senalado?.nombre ?? "en silencio");
    if (senalado && palanca) {
      const px = palanca.x + palanca.w / 2;
      const py = palanca.y + palanca.h / 2;
      await mirarDesde(
        page,
        "teléfono",
        "pasaje-izquierda",
        senalado,
        async () => {
          const t = await caja(page, '[data-hud="senal"]');
          if (!t) return false;
          await bajar(PULGAR, px, py);
          await bajar(OTRO, t.x + t.w / 2, t.y + t.h / 2);
          await pausa(80);
          await subir(OTRO);
          await pausa(100);
          await subir(PULGAR);
          return (await page.evaluate(() => globalThis.__oga.mirada())).apuntando;
        },
        "telefono-pasaje-mirando.png",
      );
    }
    comprobar("teléfono: sin errores en la página", errores.length === 0, errores.join(" · "));
  } finally {
    await ctx.close();
  }
}

// ── Y a volar ─────────────────────────────────────────────────────────────
//
// Al final, que las funciones de arriba con `const` no existen hasta que se
// leen: llamadas desde antes, revientan.

try {
  if (SOLO !== "telefono") await enElPortatil();
  if (SOLO !== "portatil") await enElTelefono();
} catch (e) {
  comprobar("el banco termina", false, String(e?.stack ?? e).slice(0, 400));
} finally {
  await navegador.close();
  await server.close();
}

// ── El informe ────────────────────────────────────────────────────────────

console.log(`\n  mirada · ${ESCENARIO} ${TRAMO} ${AVION} → ${DESTINO} · ${tarjeta}\n`);
if (!CON_GPU || /swiftshader/i.test(tarjeta))
  console.log("  (las capturas son de software: no valen para juzgar la imagen)\n");
for (const r of resultados)
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}${r.detalle ? ` — ${r.detalle}` : ""}`);
if (medidas.length) {
  console.log("\n  lo que cuesta cada vista (1280×720):\n");
  for (const m of medidas)
    console.log(
      `    ${m.vista.padEnd(17)} ×${m.veces}  ${String(Math.round(1000 / m.mediana)).padStart(3)} fps · ` +
        `mediana ${m.mediana.toFixed(1)} ms · p95 ${m.p95.toFixed(1)} ms` +
        (m.gpu != null ? ` · tarjeta ${m.gpu.toFixed(2)} ms` : "") +
        ` · ${m.llamadas} dibujos`,
    );
}
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} · capturas en ${FOTOS}/\n`);
process.exit(bien === resultados.length ? 0 : 1);

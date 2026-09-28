/**
 * Del puesto al punto de espera y al aire, **con el dedo**.
 *
 * Existe por una frase de quien lo probó en su teléfono: «en general la
 * versión móvil se ve mejor, pero tiene cosas que hace que sea difícil
 * jugar». El gas «cuesta bastante controlarlo» y el avión «es difícil de
 * frenar». Ninguno de los bancos de vuelo lo podía ver: todos pilotan
 * escribiendo en los mandos —`pilotar`—, que es exactamente lo que no hace
 * nadie con un teléfono en la mano. Un freno de veintinueve píxeles en la
 * otra punta de la pantalla frena igual de bien si se le escribe `brakes = 1`.
 *
 * Éste pilota **con toques de pantalla de verdad**, los que manda el propio
 * Chrome al emular un dedo: la palanca de gases se toca y se arrastra, el
 * freno se pisa y se suelta, la llave se toca en su tarjeta y la palanca de
 * mando se empuja. Nada de `pilotar`, nada de `colocar`.
 *
 * ## Qué mide
 *
 * **La palanca, como la usa un niño.** De ralentí a despegue y de vuelta, con
 * el dedo cayendo algo desviado de las puntas: cuántos toques hacen falta y si
 * se llega **justo** —ralentí es cero, no un cuatro por ciento con el que la
 * llave no arranca—. Y lo mismo con los botones de más y menos: cuánto hay que
 * mantener para llegar arriba, y cuánto mueve un toque.
 *
 * **Parar en el punto de espera.** Se rueda con la palanca en la marca de
 * rodaje y, al llegar, se hace lo que se hace en un avión: gas a ralentí y
 * freno. Se cuentan los gestos, se mide a cuántos metros de la raya se queda
 * y se comprueba que, soltado el freno, **el avión sigue parado**: con el gas
 * a ralentí no repta.
 *
 * **Y despegar con la palanca**: con la luz verde, a la pista con el rodaje;
 * alineado, la palanca arriba de un toque; en la Vr, el dedo empuja la
 * palanca de mando hacia arriba —que en este juego es morro arriba— y el
 * avión se va.
 *
 * El volante lo lleva el juego: el banco vuela por defecto en Guyrami, el
 * peldaño donde el juego conduce por las calles. Lo que se mide aquí son los
 * mandos de pulgar, no la puntería rodando.
 *
 * Uso: `node scripts/verificar-dedo.mjs [escenario] [tramo] [veces] [avión]`
 *   `OGA_DEDO_EN=pixel,iphone` qué teléfonos (por defecto, los dos).
 *   `OGA_GPU=1` con la tarjeta de verdad; `OGA_FOTOS=carpeta` saca capturas.
 *   `OGA_TRAZA=1` escribe, cerca de la raya y frenando, el freno y cada
 *   `pointerdown`/`pointerup` con su dedo: así se vio que el banco levantaba
 *   el dedo equivocado. Ver `subir`.
 */
import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const ESCENARIO = process.argv[2] ?? "pettirossi";
const TRAMO = process.argv[3] ?? "guyrami";
const VECES = Number(process.argv[4] ?? 3);
const AVION = process.argv[5] ?? "jaz-20";
if (!Number.isFinite(VECES) || VECES <= 0 || !/^jaz-\d+$/.test(AVION)) {
  console.log(
    "\n  ✗ El orden es: escenario tramo veces avión\n" +
      "    Por ejemplo:  node scripts/verificar-dedo.mjs pettirossi guyrami 3 jaz-20\n",
  );
  process.exit(2);
}
const PUERTO = 5297;

/**
 * Los teléfonos, apaisados: el Pixel 7 y el iPhone 14 de la lista de
 * Playwright —863 × 360 y 750 × 340, con la barra del navegador puesta, que
 * es el peor caso que se ve— y siempre con dedo.
 */
const TELEFONOS = {
  pixel: devices["Pixel 7 landscape"],
  iphone: devices["iPhone 14 landscape"],
};
const QUE = (process.env.OGA_DEDO_EN ?? "pixel,iphone")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => TELEFONOS[s]);
const FOTOS = process.env.OGA_FOTOS ?? null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });

/** Tope de pared por teléfono: un banco que se cuelga no dice nada. */
const TOPE_S = Number(process.env.OGA_TOPE ?? 480);

/**
 * La geometría de la palanca de gases: la misma que `bindPalanca` en
 * `flight/input.ts` y `.pad--throttle` en la hoja. El punto mide 34 y se queda
 * a 10 de cada punta, dentro de un filo de 2.
 */
const FILO = 2;
const BORDE = 10;
const PUNTO = 34;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "warn",
});
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
const comprobar = (nombre, ok, detalle) =>
  resultados.push({ nombre, ok: !!ok, detalle });
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  for (const quien of QUE) await unTelefono(quien);
} finally {
  await navegador.close();
  await server.close();
}

const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length}\n`);
for (const r of resultados)
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}${r.detalle ? ` — ${r.detalle}` : ""}`);
console.log("");
process.exit(bien === resultados.length ? 0 : 1);

async function unTelefono(quien) {
  const ctx = await navegador.newContext({
    ...TELEFONOS[quien],
    hasTouch: true,
    isMobile: true,
    locale: "es-PY",
  });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.addInitScript(() =>
    localStorage.setItem("oga-veve:teclas-vistas", "1"),
  );
  if (process.env.OGA_TRAZA)
    await page.addInitScript(() => {
      globalThis.__eventos = [];
      for (const t of ["pointerdown", "pointerup", "pointercancel"])
        window.addEventListener(t, (e) => globalThis.__eventos.push(`${t}#${e.pointerId}@${e.target?.className?.baseVal ?? e.target?.className}`), true);
    });
  await page.goto(
    `${BASE}/?escenario=${ESCENARIO}&hora=16&leccion=despegue&tramo=${TRAMO}` +
      `&avion=${AVION}&meteo=`,
  );
  // Al frente, o el juego se para: ver `verificar-rodaje.mjs`.
  await page.bringToFront();
  try {
    await page.waitForFunction(() => !!globalThis.__oga?.estado?.(), null, {
      timeout: 120_000,
    });
  } catch {
    comprobar(`${quien}: el juego arranca`, false, errores.join(" · ") || "sin __oga");
    await ctx.close();
    return;
  }
  await page.waitForTimeout(6000);
  const et = (s) => `${quien}: ${s}`;

  // ── El dedo ────────────────────────────────────────────────────────────
  /*
   * Los toques van por el protocolo de depuración y no por `page.touchscreen`,
   * que solo sabe dar golpecitos: aquí hace falta mantener un dedo en el freno
   * mientras otro se levanta de la palanca, y arrastrar. Cada suceso lleva
   * **todos** los dedos que siguen puestos, que es como lo pide Chrome.
   */
  const cdp = await ctx.newCDPSession(page);
  const puestos = new Map();
  let gestos = 0;
  const enviar = async (type) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: [...puestos].map(([id, p]) => ({
        id,
        x: p.x,
        y: p.y,
        radiusX: 9,
        radiusY: 9,
        force: 1,
      })),
    });
  const bajar = async (id, x, y) => {
    // El volante no cuenta como gesto: se lleva todo el rato.
    if (id !== DEDO_PALANCA) gestos++;
    puestos.set(id, { x, y });
    await enviar("touchStart");
  };
  const mover = async (id, x, y) => {
    puestos.set(id, { x, y });
    await enviar("touchMove");
  };
  /*
   * **Levantar un dedo de dos: el `touchEnd` lleva el que se levanta.** El
   * primer intento le pasaba los que seguían puestos, y Chrome levantaba
   * justo esos: el banco soltaba el freno creyendo que soltaba el volante. Y
   * con un movimiento sin el dedo tampoco: ése no lo levanta nunca.
   */
  const subir = async (id) => {
    const p = puestos.get(id);
    if (!p) return;
    puestos.delete(id);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [{ id, x: p.x, y: p.y, radiusX: 9, radiusY: 9, force: 1 }],
    });
  };
  const tocar = async (id, x, y) => {
    await bajar(id, x, y);
    await pausa(60);
    await subir(id);
  };
  const DEDO_GAS = 1;
  const DEDO_FRENO = 2;
  const DEDO_PALANCA = 3;
  const DEDO_BOTON = 4;

  const caja = (sel) =>
    page.evaluate((sel) => {
      const e = document.querySelector(sel);
      if (!e || e.closest("[hidden]")) return null;
      const r = e.getBoundingClientRect();
      if (!r.width) return null;
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }, sel);
  const palancaCaja = await caja(".pad--throttle");
  const alturaDelGas = (g) =>
    palancaCaja.y +
    palancaCaja.h -
    FILO -
    BORDE -
    PUNTO / 2 -
    g * (palancaCaja.h - 2 * FILO - 2 * BORDE - PUNTO);
  const xGas = palancaCaja.x + palancaCaja.w / 2;
  const leerPalanca = () => page.evaluate(() => globalThis.__oga.palancaDeGas());
  const ponerGas = async (g, desvio = 0) => {
    await tocar(DEDO_GAS, xGas, alturaDelGas(g) + desvio);
    await pausa(120);
    return (await leerPalanca()).gas;
  };

  // ── A. La palanca, como la usa un niño ─────────────────────────────────
  const { marcas } = await leerPalanca();
  const rodaje = marcas[1];
  gestos = 0;
  const arriba = await ponerGas(1, 8);
  const toquesArriba = gestos;
  gestos = 0;
  const abajo = await ponerGas(0, -8);
  const toquesAbajo = gestos;
  comprobar(
    et("palanca: de ralentí a despegue y de vuelta, un toque cada vez y justo"),
    arriba === 1 && abajo === 0 && toquesArriba === 1 && toquesAbajo === 1,
    `arriba ${arriba} en ${toquesArriba} · abajo ${abajo} en ${toquesAbajo}` +
      " (el dedo cae a 8 px de la punta)",
  );
  const enRodaje = await ponerGas(rodaje, 9);
  comprobar(
    et("palanca: la marca de rodaje se coge sin puntería"),
    enRodaje === rodaje,
    `marca ${rodaje.toFixed(2)} · tocando a 9 px da ${enRodaje.toFixed(3)}`,
  );
  /*
   * Y **el punto está donde dice el gas**: si la hoja y el dedo hicieran la
   * cuenta distinta, se tocaría el punto y el gas saltaría.
   */
  const punto = await caja(".pad--throttle .pad__punto");
  const esperado = alturaDelGas(enRodaje);
  const desfase = Math.abs(punto.y + punto.h / 2 - esperado);
  comprobar(
    et("palanca: el punto se pinta donde está el gas"),
    desfase <= 2,
    `a ${desfase.toFixed(1)} px de donde toca`,
  );
  // Agarrar el punto desviado no lo mueve.
  gestos = 0;
  await bajar(DEDO_GAS, xGas, esperado - 12);
  await pausa(120);
  const agarrado = (await leerPalanca()).gas;
  await subir(DEDO_GAS);
  comprobar(
    et("palanca: agarrar el punto con la yema desviada no le da un tirón"),
    Math.abs(agarrado - enRodaje) < 0.01,
    `${enRodaje.toFixed(3)} → ${agarrado.toFixed(3)}`,
  );

  // Los botones de más y menos: un toque, un paso; mantenido, empuja.
  await ponerGas(0, -8);
  const mas = await caja('[data-hud="throttle-up"]');
  const menos = await caja('[data-hud="throttle-down"]');
  if (mas && menos) {
    const desde = Date.now();
    await bajar(DEDO_BOTON, mas.x + mas.w / 2, mas.y + mas.h / 2);
    let g = 0;
    while (g < 1 && Date.now() - desde < 5000) {
      await pausa(50);
      g = (await leerPalanca()).gas;
    }
    const tarda = (Date.now() - desde) / 1000;
    await subir(DEDO_BOTON);
    await pausa(150);
    await tocar(DEDO_BOTON, menos.x + menos.w / 2, menos.y + menos.h / 2);
    await pausa(150);
    const unToque = 1 - (await leerPalanca()).gas;
    comprobar(
      et("botones: mantenido llega a despegue, y un toque es un paso que se ve"),
      g === 1 && tarda < 3 && unToque >= 0.05 && unToque <= 0.15,
      `de ralentí a despegue en ${tarda.toFixed(1)} s mantenido · un toque de «−» baja ${unToque.toFixed(2)}` +
        ` · botones de ${Math.round(mas.w)}×${Math.round(mas.h)} px`,
    );
  } else comprobar(et("botones: están a la vista"), false, "no se encontraron");
  await ponerGas(0, -8);

  // ── B. Arrancar, rodar y parar en el punto de espera ───────────────────
  await page.evaluate((v) => globalThis.__oga.acelerar?.(v), VECES);
  /*
   * Lo que mira quien juega, y hacia dónde movería el pulgar izquierdo.
   *
   * **El volante lo lleva el dedo, no el juego.** La ayuda de rodaje corrige
   * la deriva pero no toma las curvas —«ese giro no lo di yo»: ver
   * `asistencia` en `plan-de-vuelo.ts`—, así que en la entrada a la pista hay
   * que girar como giraría cualquiera: mirando la raya un poco por delante y
   * empujando la palanca de mando hacia ese lado. En la carrera, el eje de la
   * pista doscientos cincuenta metros por delante.
   */
  const leer = (modo = "ruta") =>
    page.evaluate((modo) => {
      const o = globalThis.__oga;
      const s = o.estado();
      const r = o.rodajeAsi();
      const v = Math.hypot(s.velocity.x, s.velocity.z);
      const err = (a, b) => {
        let e = a - b;
        while (e > Math.PI) e -= 2 * Math.PI;
        while (e < -Math.PI) e += 2 * Math.PI;
        return e;
      };
      const hacia = (x, z) =>
        Math.max(
          -1,
          Math.min(
            1,
            err(Math.atan2(x - s.position.x, -(z - s.position.z)), s.heading) * 1.2,
          ),
        );
      let volante = 0;
      if (modo === "pista") {
        const p = o.pistaDeAhora?.() ?? o.pista();
        const h = (p.heading * Math.PI) / 180;
        const dx = Math.sin(h);
        const dz = -Math.cos(h);
        const a = (s.position.x - p.x) * dx + (s.position.z - p.z) * dz + 250;
        volante = hacia(p.x + dx * a, p.z + dz * a);
      } else {
        const ruta = o.ruta();
        if (ruta.length > 1) {
          let cerca = 0;
          let mejor = Infinity;
          for (let i = 0; i < ruta.length; i++) {
            const d = Math.hypot(ruta[i][0] - s.position.x, ruta[i][1] - s.position.z);
            if (d < mejor) {
              mejor = d;
              cerca = i;
            }
          }
          const mira = Math.max(10, v * 2.2);
          let objetivo = ruta[ruta.length - 1];
          for (let i = cerca; i < ruta.length; i++) {
            if (Math.hypot(ruta[i][0] - s.position.x, ruta[i][1] - s.position.z) > mira) {
              objetivo = ruta[i];
              break;
            }
          }
          volante = hacia(objetivo[0], objetivo[1]);
        }
      }
      return {
        fase: o.fase(),
        faseRodaje: r.fase,
        restante: r.restante,
        v,
        ias: s.airspeed,
        alto: s.heightAboveGround,
        enSuelo: s.onGround,
        motor: o.controles().engineOn,
        palanca: o.palancaDeGas().gas,
        percance: o.percance(),
        rotacion: o.avion().rotacion,
        volante,
      };
    }, modo);

  const mando = await caja(".pad--stick");
  /** El pulgar izquierdo en la palanca de mando: alabeo y cabeceo, −1 a 1. */
  const volantear = async (alabeo, cabeceo = 0) => {
    const x = mando.x + ((alabeo + 1) / 2) * mando.w;
    // Arriba es morro arriba en este juego: ver el cabeceo en `input.ts`.
    const y = mando.y + ((1 - cabeceo) / 2) * mando.h;
    if (puestos.has(DEDO_PALANCA)) await mover(DEDO_PALANCA, x, y);
    else await bajar(DEDO_PALANCA, x, y);
  };
  const soltarVolante = async () => {
    if (puestos.has(DEDO_PALANCA)) await subir(DEDO_PALANCA);
  };

  const senal = await caja(".senal");
  if (senal) await tocar(DEDO_BOTON, senal.x + senal.w / 2, senal.y + senal.h / 2);
  await pausa(1500);
  let s = await leer();
  comprobar(et("la llave se toca en su tarjeta y arranca"), s.motor, `motor ${s.motor}`);

  gestos = 0;
  await ponerGas(rodaje);
  const gestosParaRodar = gestos;

  let etapa = "rodar";
  const empezo = Date.now();
  let gestosParaParar = 0;
  let paradoA = null;
  let percanceAlParar = null;
  let quietoDesde = 0;
  let seMovioSinFreno = 0;
  let rodandoMax = 0;
  let despego = false;
  let tiempoDeFrenada = 0;
  let frenoCaja = null;
  let frenoAguanta = null;
  let esperoVerde = 0;
  while (Date.now() - empezo < TOPE_S * 1000) {
    await pausa(80);
    s = await leer(etapa === "carrera" || etapa === "rotar" ? "pista" : "ruta");
    if (s.percance) break;
    if (process.env.OGA_TRAZA && (etapa === "frenando" || s.restante < 60))
      console.log(
        `    ${etapa} ${s.fase} v=${s.v.toFixed(1)} r=${s.restante} vol=${s.volante.toFixed(2)} ` +
          JSON.stringify(await page.evaluate(() => ({ b: globalThis.__oga.controles().brakes.toFixed(2), ev: (globalThis.__eventos ?? []).splice(0) }))),
      );
    if (etapa === "rodar") {
      await volantear(s.volante);
      rodandoMax = Math.max(rodandoMax, s.v);
      /*
       * **Se frena como frenaría alguien que mira la raya**: a la distancia en
       * que un frenazo suave —uno y medio por segundo al cuadrado, la mitad de
       * lo que da el freno— deja el avión encima, más lo que se recorre
       * mientras se mueve el dedo.
       *
       * Y **primero el freno**, con el gas todavía en rodaje: es lo que hace
       * quien ve la raya encima y tiene prisa, y el avión tiene que pararse
       * igual. El gas se baja después, ya parado.
       */
      const hace = (s.v * s.v) / (2 * 1.5) + s.v * 0.4 * VECES + 6;
      if (s.restante >= 0 && s.restante < 200 && s.restante < hace) {
        gestos = 0;
        frenoCaja = await caja('[data-hud="brakes-touch"]');
        if (!frenoCaja) {
          comprobar(et("el freno está a la vista rodando"), false, "oculto");
          break;
        }
        await bajar(
          DEDO_FRENO,
          frenoCaja.x + frenoCaja.w / 2,
          frenoCaja.y + frenoCaja.h / 2,
        );
        tiempoDeFrenada = Date.now();
        etapa = "frenando";
      }
    } else if (etapa === "frenando") {
      /*
       * **Y a media frenada se levanta el otro pulgar**, el del volante: con
       * el teléfono en las dos manos es lo más normal del mundo, y el freno
       * no se puede soltar por eso. Se soltaba: cualquier dedo que se
       * levantara soltaba el freno. Ver `dedoDelFreno` en `ui/hud.ts`.
       */
      if (frenoAguanta === null && Date.now() - tiempoDeFrenada > 250) {
        await soltarVolante();
        await pausa(250);
        frenoAguanta = await page.evaluate(
          () => globalThis.__oga.controles().brakes,
        );
      }
      if (s.v < 0.2) {
        if (FOTOS)
          await page.screenshot({ path: `${FOTOS}/${quien}-parado-frenando.png` });
        await ponerGas(0, -8);
        await pausa(200);
        await subir(DEDO_FRENO);
        gestosParaParar = gestos;
        tiempoDeFrenada = (Date.now() - tiempoDeFrenada) / 1000;
        paradoA = s.restante;
        percanceAlParar = (await leer()).percance;
        quietoDesde = Date.now();
        etapa = "quieto";
      }
    } else if (etapa === "quieto") {
      seMovioSinFreno = Math.max(seMovioSinFreno, s.v);
      if (Date.now() - quietoDesde > 3000) {
        etapa = "esperar";
        esperoVerde = Date.now();
      }
    } else if (etapa === "esperar") {
      seMovioSinFreno = Math.max(seMovioSinFreno, s.v);
      if (s.fase === "autorizado" || s.faseRodaje === "autorizado") {
        esperoVerde = (Date.now() - quietoDesde) / 1000;
        await ponerGas(rodaje);
        etapa = "entrar";
      } else if (Date.now() - esperoVerde > 90_000) break;
    } else if (etapa === "entrar") {
      await volantear(s.volante);
      if (s.fase === "despegando" || s.fase === "comprometido") {
        await ponerGas(1, 8);
        etapa = "carrera";
        if (FOTOS) await page.screenshot({ path: `${FOTOS}/${quien}-carrera.png` });
      }
    } else if (etapa === "carrera") {
      await volantear(s.volante);
      if (s.ias >= s.rotacion) {
        await volantear(0, 0.45);
        etapa = "rotar";
      }
    } else if (etapa === "rotar") {
      if (!s.enSuelo && s.alto > 40) {
        if (FOTOS) await page.screenshot({ path: `${FOTOS}/${quien}-en-el-aire.png` });
        await soltarVolante();
        despego = true;
        break;
      }
    }
  }
  for (const id of [...puestos.keys()]) await subir(id);
  s = await leer();

  comprobar(
    et("rodar: la palanca en la marca de rodaje, de un toque"),
    gestosParaRodar === 1 && rodandoMax > 3,
    `${gestosParaRodar} toque · hasta ${rodandoMax.toFixed(1)} m/s`,
  );
  comprobar(
    et("parar en el punto de espera: freno y gas a ralentí, dos gestos"),
    paradoA !== null && gestosParaParar <= 2 && paradoA < 45 && !percanceAlParar,
    paradoA === null
      ? `no llegó a parar (etapa ${etapa}, fase ${s.fase}, restante ${s.restante}${s.percance ? `, percance ${s.percance}` : ""})`
      : `${gestosParaParar} gestos · parado a ${paradoA} m del final de la raya` +
          ` · frenando ${tiempoDeFrenada.toFixed(1)} s de pared` +
          (frenoCaja ? ` · freno de ${Math.round(frenoCaja.w)} px` : ""),
  );
  comprobar(
    et("el freno aguanta aunque se levante el otro pulgar"),
    frenoAguanta !== null && frenoAguanta > 0.5,
    `freno a ${frenoAguanta === null ? "?" : frenoAguanta.toFixed(2)} con el volante soltado`,
  );
  comprobar(
    et("soltado el freno con el gas a ralentí, el avión no repta"),
    paradoA !== null && seMovioSinFreno < 0.5,
    `lo más rápido que se movió después: ${seMovioSinFreno.toFixed(2)} m/s`,
  );
  comprobar(
    et("con la verde, a la pista y al aire con la palanca"),
    despego && !s.percance,
    despego
      ? `esperó la verde ${typeof esperoVerde === "number" ? esperoVerde.toFixed(0) : "?"} s · a ${s.alto.toFixed(0)} m`
      : `se quedó en «${etapa}» (fase ${s.fase}${s.percance ? `, percance ${s.percance}` : ""})`,
  );
  if (errores.length) comprobar(et("sin errores en la página"), false, errores.join(" · "));
  await ctx.close();
}

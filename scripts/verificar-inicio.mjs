/**
 * **El modo inicio, de punta a punta, con cada mando.** Ver `src/flight/inicio.ts`.
 *
 * Es el primer vuelo de quien no ha volado nunca: Jazlyn le enseña a Ara,
 * paso a paso, y el mundo espera en cada paso a que se haga lo que se pide.
 * Las pruebas de unidad prueban la secuencia con un avión de mentira; esto la
 * vuela de verdad, en el navegador, **con los mandos de verdad**: teclas que
 * se aprietan, toques de pantalla que manda el propio Chrome al emular un
 * dedo, y un mando de juego de mentira —el de consola y el joystick HOTAS X—
 * con los botones y los ejes que daría el de verdad.
 *
 * ## Qué mira
 *
 * - **Que el mundo espera**: en cada paso que pide algo, el avión no se mueve
 *   ni un palmo mientras no se hace, y la escena sigue viva —el reloj de la
 *   secuencia corre—, que un juego colgado también está quieto.
 * - **Que se dibuja el mando que se tiene en la mano**, y que cambia en
 *   cuanto se cambia de mando: el de consola enchufado a mitad, el teclado
 *   después, el mando otra vez.
 * - **Que equivocarse no pasa nada**: una tecla que no es lo vuelve a pedir
 *   con otras palabras, con el mundo todavía quieto.
 * - **Que se vuela entero**: se arranca, se rueda, se despega en la Vr, se vira
 *   a un lado y al otro y se endereza.
 * - **Y que acaba con el sello del Chaco** en la tarjeta y en el cuaderno, y
 *   al seguir volando la tarjeta se va y el avión vuela.
 * - **Y dónde cae la tarjeta**, en el portátil, la tablet, el teléfono
 *   apaisado y de pie: entera en la pantalla, sin tapar los mandos de los
 *   pulgares ni la columna de la derecha; de pie, escondida tras el cartel de
 *   girar.
 *
 * Sin voces —el banco no las tiene, como el Brave de Enrique—, así que la
 * escena va al ritmo de leer los subtítulos: es la prueba de que sin grabar
 * también se puede seguir.
 *
 * Uso: `node scripts/verificar-inicio.mjs [teclado,dedo,consola,joystick]`
 *   `OGA_GPU=1` con la tarjeta de verdad; `OGA_FOTOS=carpeta` saca capturas
 *   de cuatro pasos, con el renderer en el nombre; `OGA_SIN_TAMANOS=1` se
 *   salta las pantallas.
 */
import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = 5395;
const CUALES = (process.argv[2] ?? "teclado,dedo,consola,joystick")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const FOTOS = process.env.OGA_FOTOS ?? null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
/** Tope de pared por vuelta: un banco que se cuelga no dice nada. */
const TOPE_S = Number(process.env.OGA_TOPE ?? 360);

const GRADO = Math.PI / 180;
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
  args:
    process.env.OGA_GPU === "1"
      ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
      : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => resultados.push({ nombre, ok: !!ok, detalle });

/** Un mando de juego de mentira: el navegador sin ventana no tiene ninguno. */
async function ponerElMandoFalso(page) {
  await page.addInitScript(() => {
    globalThis.__padFalso = null;
    navigator.getGamepads = () => (globalThis.__padFalso ? [globalThis.__padFalso] : []);
  });
}

const PADS = {
  consola: {
    id: "Xbox 360 Controller (XInput STANDARD GAMEPAD)",
    mapping: "standard",
    ejes: [0, 0, 0, 0],
  },
  /*
   * El HOTAS X en Linux: siete ejes, y la palanca de gases en Z, atrás del
   * todo —al ralentí— que es +1. Ver `flight/mandos-fisicos.ts`.
   */
  joystick: {
    id: "Thrustmaster T.Flight Hotas X (STANDARD GAMEPAD Vendor: 044f Product: b108)",
    mapping: "",
    ejes: [0, 0, 1, 0, 0, 0, 0],
  },
};

async function enchufar(page, cual) {
  const p = PADS[cual];
  await page.evaluate((p) => {
    globalThis.__padFalso = {
      id: p.id,
      index: 0,
      connected: true,
      mapping: p.mapping,
      timestamp: performance.now(),
      axes: [...p.ejes],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
    };
  }, p);
}
const eje = (page, i, v) =>
  page.evaluate(([i, v]) => {
    globalThis.__padFalso.axes[i] = v;
    globalThis.__padFalso.timestamp = performance.now();
  }, [i, v]);
const boton = (page, i, apretado) =>
  page.evaluate(([i, a]) => {
    globalThis.__padFalso.buttons[i] = { pressed: a, touched: a, value: a ? 1 : 0 };
    globalThis.__padFalso.timestamp = performance.now();
  }, [i, apretado]);
async function pulsarBoton(page, i, ms = 200) {
  await boton(page, i, true);
  await pausa(ms);
  await boton(page, i, false);
}

/** El renderer de esta página: una captura de SwiftShader no juzga la imagen. */
const renderer = (page) =>
  page.evaluate(() => {
    const c = document.querySelector("#lienzo");
    const gl = c?.getContext("webgl2") ?? c?.getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "desconocido";
  });

async function foto(page, nombre) {
  if (!FOTOS) return;
  const r = await renderer(page);
  const corto = /swiftshader/i.test(r) ? "swiftshader" : /intel/i.test(r) ? "intel" : /nvidia/i.test(r) ? "nvidia" : "otro";
  const ruta = `${FOTOS}/inicio-${nombre}-${corto}.png`;
  await page.screenshot({ path: ruta });
  console.log(`  📷 ${ruta}  —  ${r}`);
}

/** Lo que se ve de la escena, de una vez. */
const leer = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const i = o?.inicio?.();
    const d = document.querySelector("#inicio [data-mando]");
    const p = o?.estado?.().position;
    return {
      inicio: i ?? null,
      dibujo: d ? { mando: d.dataset.mando, gesto: d.dataset.gesto } : null,
      pos: p ? { x: p.x, y: p.y, z: p.z } : null,
      altura: o?.estado ? o.estado().heightAboveGround : 0,
      alabeo: o?.actitud ? o.actitud().alabeo : 0,
      enTierra: o?.estado ? o.estado().onGround : true,
      raizOculta: document.querySelector("#inicio")?.hidden ?? true,
      conInicio: document.documentElement.classList.contains("con-inicio"),
    };
  });

/** Lo que hay que hacer en cada paso, con cada mando. */
function acciones(page, cdp, cual) {
  // ── El dedo, por el protocolo de depuración: ver `verificar-dedo.mjs`. ──
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
  const subir = async (id) => {
    puestos.delete(id);
    await enviar("touchEnd");
  };
  const caja = (sel) =>
    page.evaluate((sel) => {
      const r = document.querySelector(sel)?.getBoundingClientRect();
      return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
    }, sel);
  const tocar = async (sel) => {
    const r = await caja(sel);
    if (!r) return false;
    await bajar(1, r.x + r.w / 2, r.y + r.h / 2);
    await pausa(60);
    await subir(1);
    return true;
  };
  /** Arrastrar la palanca de mando desde el centro, y dejarla o soltarla. */
  const palanca = async (dx, dy, ms, soltar = true) => {
    const r = await caja('#tactil [data-touch="stick"]');
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    await bajar(2, cx, cy);
    for (let k = 1; k <= 6; k++) {
      await mover(2, cx + (dx * r.w * k) / 6, cy + (dy * r.h * k) / 6);
      await pausa(30);
    }
    await pausa(ms);
    if (soltar) await subir(2);
  };

  const teclado = {
    motor: () => page.keyboard.press("KeyI"),
    gas: async () => {
      await page.keyboard.down("Equal");
      await pausa(150);
      await page.keyboard.up("Equal");
    },
    despegar: async () => {
      await page.keyboard.down("ArrowUp");
      await pausa(200);
      await page.keyboard.up("ArrowUp");
    },
    izquierda: async () => {
      await page.keyboard.down("ArrowLeft");
      await pausa(900);
      await page.keyboard.up("ArrowLeft");
    },
    derecha: async () => {
      await page.keyboard.down("ArrowRight");
      await pausa(1500);
      await page.keyboard.up("ArrowRight");
    },
    nivelar: async (alabeo) => {
      const k = alabeo > 0 ? "ArrowLeft" : "ArrowRight";
      await page.keyboard.down(k);
      await pausa(250);
      await page.keyboard.up(k);
    },
    seguir: () => page.keyboard.press("Enter"),
  };
  const dedo = {
    motor: () => tocar('[data-inicio="llave"]'),
    gas: async () => {
      const r = await caja('#tactil [data-touch="throttle"]');
      const x = r.x + r.w / 2;
      await bajar(3, x, r.y + r.h - 14);
      for (let k = 1; k <= 8; k++) {
        await mover(3, x, r.y + r.h - 14 - ((r.h - 28) * k) / 8);
        await pausa(30);
      }
      await subir(3);
    },
    despegar: () => palanca(0, -0.35, 700),
    izquierda: () => palanca(-0.35, 0, 1200),
    derecha: () => palanca(0.35, 0, 1500),
    // Dos golpecitos en la palanca: al centro.
    nivelar: async () => {
      const r = await caja('#tactil [data-touch="stick"]');
      for (let k = 0; k < 2; k++) {
        await bajar(4, r.x + r.w / 2, r.y + r.h / 2);
        await pausa(60);
        await subir(4);
        await pausa(90);
      }
    },
    seguir: () => tocar('[data-inicio="seguir"]'),
  };
  const consola = {
    motor: () => pulsarBoton(page, 9),
    gas: async () => {
      await page.evaluate(() => {
        globalThis.__padFalso.buttons[7] = { pressed: true, touched: true, value: 1 };
      });
      await pausa(400);
      await page.evaluate(() => {
        globalThis.__padFalso.buttons[7] = { pressed: false, touched: false, value: 0 };
      });
    },
    despegar: async () => {
      await eje(page, 1, -1);
      await pausa(500);
      await eje(page, 1, 0);
    },
    // La palanca a un lado un rato, y se suelta: tiene muelle.
    izquierda: async () => {
      await eje(page, 0, -0.8);
      await pausa(1500);
      await eje(page, 0, 0);
    },
    derecha: async () => {
      await eje(page, 0, 0.8);
      await pausa(1500);
      await eje(page, 0, 0);
    },
    /*
     * Enderezar con el mando es soltarlo; aquí, que venía del teclado, se
     * toca hacia el lado contrario y se suelta: así se usa, y el dibujo vuelve.
     */
    nivelar: async (alabeo) => {
      await eje(page, 0, alabeo > 0 ? -0.6 : 0.6);
      await pausa(250);
      await eje(page, 0, 0);
    },
    seguir: async () => {
      await eje(page, 0, 0.9);
      await pausa(300);
      await eje(page, 0, 0);
    },
  };
  const joystick = {
    ...consola,
    // La palanca de gases, del ralentí (atrás, +1) a fondo (adelante, −1).
    gas: async () => {
      for (let k = 1; k <= 5; k++) {
        await eje(page, 2, 1 - (2 * k) / 5);
        await pausa(80);
      }
    },
    // Hacia uno: el eje Y positivo, como cualquier joystick por USB.
    despegar: async () => {
      await eje(page, 1, 0.8);
      await pausa(500);
      await eje(page, 1, 0);
    },
  };
  return { teclado, dedo, consola, joystick }[cual];
}

/** El mando que se espera ver dibujado. */
const esperado = (cual) => cual;

async function unaVuelta(cual) {
  const conDedo = cual === "dedo";
  const ctx = await navegador.newContext(
    conDedo
      ? { ...devices["Pixel 7 landscape"], hasTouch: true, isMobile: true, locale: "es-PY" }
      : { viewport: { width: 1280, height: 800 }, locale: "es-PY" },
  );
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await ponerElMandoFalso(page);
  await page.goto(`${BASE}/?inicio=1&hora=12`);
  await page.bringToFront();
  const et = (s) => `${cual}: ${s}`;
  try {
    await page.waitForFunction(() => !!globalThis.__oga?.inicio?.()?.estado, null, { timeout: 120_000 });
  } catch {
    comprobar(et("el juego arranca en el modo inicio"), false, errores.join(" · ") || "sin __oga");
    await ctx.close();
    return;
  }
  const cdp = await ctx.newCDPSession(page);
  const hacer = acciones(page, cdp, cual);
  const primero = await leer(page);
  comprobar(
    et("arranca en el modo inicio, saludando y con el mundo quieto"),
    primero.inicio?.conInicio && primero.inicio.estado?.paso === "hola" && primero.inicio.congelado,
    `${primero.inicio?.estado?.paso} · quieto: ${primero.inicio?.congelado}`,
  );

  /*
   * El primer gesto, que es lo que deja sonar algo y bajar el pack. Con el
   * dedo, un toque en medio del cielo; con lo demás, una tecla sin mando.
   */
  if (conDedo) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ id: 9, x: 400, y: 160, radiusX: 9, radiusY: 9, force: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else await page.keyboard.press("ShiftLeft");

  /*
   * **Y el cambio de mando, a mitad.** Con el de consola, se empieza con el
   * dibujo del teclado —es un ordenador— y se enchufa el mando: el dibujo
   * cambia. Más adelante se vira con una tecla y vuelve el teclado; y al
   * enderezar con el mando, otra vez el mando.
   */
  const cambios = [];
  let ultimoDibujo = null;
  if (cual === "consola" || cual === "joystick") {
    /*
     * El dibujo de antes de enchufar se apunta aquí, antes de enchufar: si
     * no, la primera lectura del bucle ya lo ve con el mando y el cambio no
     * se ve nunca.
     */
    await page
      .waitForFunction(() => !!document.querySelector("#inicio [data-mando]"), null, { timeout: 90_000 })
      .catch(() => {});
    const antes = await leer(page);
    if (antes.dibujo?.mando) {
      cambios.push(antes.dibujo.mando);
      ultimoDibujo = antes.dibujo.mando;
    }
    await enchufar(page, cual);
  }

  const vistos = new Map([[primero.inicio?.estado?.paso ?? "?", 0]]);
  const quietoMedido = new Set();
  const dibujoMedido = new Set();
  let error = null;
  let altura = 0;
  let alabeoMin = 0;
  let alabeoMax = 0;
  let enderezo = false;
  let sello = null;
  let seguido = false;
  const t0 = Date.now();
  const fotos = new Set();

  while (Date.now() - t0 < TOPE_S * 1000) {
    const v = await leer(page);
    if (v.dibujo?.mando && v.dibujo.mando !== ultimoDibujo) {
      cambios.push(v.dibujo.mando);
      ultimoDibujo = v.dibujo.mando;
    }
    const e = v.inicio?.estado;
    if (!e) {
      // Se acabó la escena: el vuelo sigue sin ella.
      seguido = true;
      break;
    }
    if (!vistos.has(e.paso)) vistos.set(e.paso, (Date.now() - t0) / 1000);
    altura = Math.max(altura, v.altura);
    alabeoMin = Math.min(alabeoMin, v.alabeo);
    alabeoMax = Math.max(alabeoMax, v.alabeo);
    if (e.paso === "fin" && Math.abs(v.alabeo) < 3 * GRADO) enderezo = true;

    // ── Lo que se mira con el mundo esperando ──
    if (e.fase === "espera" && v.inicio.congelado && !quietoMedido.has(e.paso)) {
      quietoMedido.add(e.paso);
      const antes = v;
      await pausa(1200);
      const despues = await leer(page);
      const d = antes.pos && despues.pos ? Math.hypot(despues.pos.x - antes.pos.x, despues.pos.y - antes.pos.y, despues.pos.z - antes.pos.z) : NaN;
      const corre = (despues.inicio?.estado?.segundos ?? 0) - e.segundos;
      comprobar(
        et(`${e.paso}: el mundo espera, y la escena sigue viva`),
        d < 0.05 && corre > 0.8 && despues.inicio?.estado?.paso === e.paso,
        `se movió ${d.toFixed(3)} m · la escena corrió ${corre.toFixed(1)} s`,
      );
    }
    if (e.gesto && e.fase === "espera" && !dibujoMedido.has(e.paso)) {
      dibujoMedido.add(e.paso);
      /*
       * Con el de consola, el viraje a la derecha se hace con el teclado —ver
       * más abajo—, así que al enderezar lo que se tiene en la mano es eso.
       */
      const quiero = cual === "consola" && e.paso === "nivelar" ? "teclado" : esperado(cual);
      comprobar(
        et(`${e.paso}: se dibuja el gesto con el mando que se tiene en la mano`),
        v.dibujo?.mando === quiero && v.dibujo?.gesto === e.gesto,
        `${v.dibujo?.mando ?? "nada"}/${v.dibujo?.gesto ?? "-"} · se quería ${quiero}/${e.gesto}`,
      );
      if (conDedo && (e.paso === "gas" || e.paso === "despegar")) {
        const dedoEncima = await page.evaluate((paso) => {
          const d = document.querySelector(".inicio__dedo");
          const pad = document.querySelector(`#tactil [data-touch="${paso === "gas" ? "throttle" : "stick"}"]`);
          if (!d || d.hidden || !pad) return null;
          const a = d.getBoundingClientRect();
          const b = pad.getBoundingClientRect();
          return a.left < b.right && a.right > b.left && a.top < b.bottom + 30 && a.bottom > b.top - 60;
        }, e.paso);
        comprobar(
          et(`${e.paso}: un dedo señala el mando de verdad de la pantalla`),
          dedoEncima,
          dedoEncima === null ? "no hay dedo" : dedoEncima ? "encima" : "lejos",
        );
      }
      if (["motor", "despegar", "izquierda"].includes(e.paso) && !fotos.has(e.paso)) {
        fotos.add(e.paso);
        await foto(page, `${cual}-${e.paso}`);
      }
    }

    // ── Y se hace lo que se pide, cuando se ha terminado de pedir ──
    if (e.paso === "fin") {
      if (!e.puedeSeguir) {
        await pausa(150);
        continue;
      }
      if (!sello) {
        sello = await page.evaluate(() => {
          const s = document.querySelector("#inicio .inicio__sello svg");
          const r = s?.getBoundingClientRect();
          return {
            campo: s?.getAttribute("data-campo") ?? null,
            visible: !!r && r.width > 40 && r.top >= 0 && r.bottom <= innerHeight,
            cuaderno: globalThis.__oga.aerodromosVisitados?.() ?? [],
          };
        });
        await foto(page, `${cual}-fin`);
      }
      await hacer.seguir();
      await pausa(500);
      continue;
    }
    if (e.fase === "espera" && v.inicio.congelado) {
      if (e.paso === "motor" && cual === "teclado" && !error) {
        // Primero, una que no es: la flecha de bajar.
        const antes = e.otraVez;
        await page.keyboard.down("ArrowDown");
        await pausa(300);
        await page.keyboard.up("ArrowDown");
        await pausa(600);
        const tras = await leer(page);
        error = {
          otraVez: (tras.inicio?.estado?.otraVez ?? 0) - antes,
          paso: tras.inicio?.estado?.paso,
          quieto: tras.inicio?.congelado,
          linea: tras.inicio?.estado?.linea?.clave,
        };
        continue;
      }
      if (cual === "consola" && e.paso === "derecha") {
        // A mitad, con el teclado: el dibujo tiene que seguir a la mano.
        await teclasDeDerecha(page);
        continue;
      }
      const hazlo = hacer[e.paso === "despegar" ? "despegar" : e.paso];
      if (hazlo) await hazlo(v.alabeo);
      await pausa(300);
      continue;
    }
    if (e.fase === "hace" && (e.paso === "izquierda" || e.paso === "derecha") && cual === "teclado") {
      await hacer[e.paso]();
      continue;
    }
    await pausa(150);
  }

  comprobar(
    et("se recorre la escena entera, paso a paso"),
    ["hola", "motor", "gas", "carrera", "despegar", "subida", "izquierda", "derecha", "nivelar", "fin"].every((p) => vistos.has(p)),
    [...vistos].map(([p, t]) => `${p}@${t.toFixed(0)}s`).join(" "),
  );
  if (cual === "teclado")
    comprobar(
      et("una tecla que no es lo vuelve a pedir con otras palabras, con el mundo quieto"),
      error && error.otraVez >= 1 && error.paso === "motor" && error.quieto && /otra/.test(error.linea ?? ""),
      error ? `${error.otraVez} vez · ${error.linea} · quieto: ${error.quieto}` : "no se probó",
    );
  comprobar(et("se despega"), altura > 15, `${altura.toFixed(0)} m sobre el suelo`);
  comprobar(
    et("se vira a un lado y al otro, y se endereza"),
    alabeoMin <= -9 * GRADO && alabeoMax >= 9 * GRADO && enderezo,
    `de ${(alabeoMin / GRADO).toFixed(0)}° a ${(alabeoMax / GRADO).toFixed(0)}° · derecho al final: ${enderezo}`,
  );
  comprobar(
    et("al final, el sello del Chaco, a la vista y en el cuaderno"),
    sello?.campo === "chaco" && sello.visible && sello.cuaderno.includes("chaco"),
    sello ? `${sello.campo} · visible: ${sello.visible} · cuaderno: ${sello.cuaderno.join(",")}` : "no llegó al final",
  );
  if (seguido) {
    const a = await leer(page);
    await pausa(1500);
    const b = await leer(page);
    const d = a.pos && b.pos ? Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z) : 0;
    comprobar(
      et("y al seguir volando, la tarjeta se va y el avión vuela"),
      b.raizOculta && !b.conInicio && d > 20,
      `tarjeta ${b.raizOculta ? "fuera" : "puesta"} · avanzó ${d.toFixed(0)} m`,
    );
  } else comprobar(et("y al seguir volando, la tarjeta se va y el avión vuela"), false, "no se acabó en el tope");
  if (cual === "consola" || cual === "joystick")
    comprobar(
      et("el dibujo cambia con el mando: del teclado al mando enchufado"),
      cambios[0] === "teclado" && cambios.includes(cual),
      cambios.join(" → "),
    );
  if (cual === "consola")
    comprobar(
      et("y vuelve al teclado al usarlo, y al mando al usarlo otra vez"),
      cambios.join(">").includes(`consola>teclado>consola`),
      cambios.join(" → "),
    );
  comprobar(et("sin errores"), errores.length === 0, errores[0] ?? "limpio");
  await ctx.close();
}

/** Virar a la derecha con la tecla, para el cambio de mando. */
async function teclasDeDerecha(page) {
  await page.keyboard.down("ArrowRight");
  await pausa(1500);
  await page.keyboard.up("ArrowRight");
}

/**
 * **Dónde cae la tarjeta**, en las pantallas donde se juega: entera, por
 * delante y sin tapar lo que se toca. Ver `.inicio__tarjeta` en la hoja.
 */
async function enLasPantallas() {
  const PANTALLAS = [
    [1280, 800, false],
    [1024, 600, true],
    [915, 412, true],
    [800, 360, true],
    [780, 360, true],
    [864, 330, true],
    [400, 780, true],
  ];
  for (const [ancho, alto, dedo] of PANTALLAS) {
    const ctx = await navegador.newContext({
      viewport: { width: ancho, height: alto },
      hasTouch: dedo,
      isMobile: dedo,
      locale: "es-PY",
    });
    const page = await ctx.newPage();
    await ponerElMandoFalso(page);
    await page.goto(`${BASE}/?inicio=1&hora=12`);
    await page.bringToFront();
    const donde = `${ancho}×${alto}${dedo ? " con el dedo" : ""}`;
    const ok = await page
      .waitForFunction(() => globalThis.__oga?.inicio?.()?.estado?.paso === "motor", null, { timeout: 120_000 })
      .then(() => true)
      .catch(() => false);
    if (!ok) {
      comprobar(`${donde}: llega a la llave`, false, "no llegó");
      await ctx.close();
      continue;
    }
    await page.waitForTimeout(800);
    const m = await page.evaluate(() => {
      const pisa = (a, b) =>
        Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
        Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
      const t = document.querySelector(".inicio__tarjeta");
      const r = t?.getBoundingClientRect();
      const visible = !!r && r.width > 2 && getComputedStyle(document.querySelector("#inicio")).display !== "none";
      const gira = document.querySelector('[data-hud="gira"]');
      const deGira = !!gira && getComputedStyle(gira).display !== "none";
      if (!visible) return { visible, deGira };
      const dentro = r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
      const tapa = [
        ...document.querySelectorAll('#tactil [data-touch]'),
        ...document.querySelectorAll(".hud__derecha > *"),
        ...document.querySelectorAll(".hud__arriba button"),
      ]
        .filter((o) => !o.closest("[hidden]") && getComputedStyle(o).visibility !== "hidden" && o.getBoundingClientRect().height > 2)
        .filter((o) => pisa(r, o.getBoundingClientRect()))
        .map((o) => o.dataset.touch ?? o.dataset.hud ?? String(o.className).slice(0, 24));
      const llave = document.querySelector('[data-inicio="llave"]')?.getBoundingClientRect();
      return {
        visible,
        deGira,
        dentro,
        tapa,
        llave: llave ? Math.min(llave.width, llave.height) : null,
        caja: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}`,
      };
    });
    if (ancho < alto && dedo) {
      comprobar(
        `${donde}: de pie, la tarjeta se esconde y manda el cartel de girar`,
        !m.visible && m.deGira,
        `tarjeta ${m.visible ? "a la vista" : "escondida"} · girar ${m.deGira ? "a la vista" : "no"}`,
      );
    } else {
      comprobar(
        `${donde}: la tarjeta, entera y sin tapar ningún mando`,
        m.visible && m.dentro && m.tapa.length === 0,
        `${m.caja ?? "-"}${m.tapa?.length ? ` · tapa ${m.tapa.join(", ")}` : ""}`,
      );
      if (dedo)
        comprobar(
          `${donde}: la llave se toca con un dedo`,
          (m.llave ?? 0) >= 44,
          `${m.llave?.toFixed(0) ?? "sin llave"} px`,
        );
    }
    await ctx.close();
  }
}

try {
  if (!process.env.OGA_SIN_TAMANOS) await enLasPantallas();
  for (const cual of CUALES) await unaVuelta(cual);
} finally {
  await navegador.close();
  await server.close();
}

const bien = resultados.filter((r) => r.ok).length;
console.log("");
for (const r of resultados) console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}${r.detalle ? `  —  ${r.detalle}` : ""}`);
console.log(`\n  ${bien} de ${resultados.length}\n`);
process.exit(bien === resultados.length ? 0 : 1);

/**
 * **La segunda escena del modo inicio, aterrizar con Jazlyn, de punta a punta
 * y con cada mando.** Ver `src/flight/inicio-aterrizar.ts`.
 *
 * Hermano de `verificar-inicio.mjs`, que vuela la primera. Las pruebas de
 * unidad vuelan la final con el modelo de Guyrami y un piloto de mentira; esto
 * la vuela en el navegador **con los mandos de verdad**: teclas que se
 * aprietan, toques que manda el propio Chrome al emular un dedo, y los dos
 * mandos de juego de mentira, el de consola y el HOTAS X.
 *
 * ## Qué mira
 *
 * - **Que se abre**: con `?inicio=2`, y desde el hangar, con su ficha al lado
 *   de la de aprender. Y que la primera experiencia sigue siendo el despegue.
 * - **Que en el aire el mundo no se para**: en cada paso que pide algo volando,
 *   el avión sigue avanzando, la escena sigue viva y la mano de Jazlyn lo
 *   lleva por la senda y por el eje. Ni un fotograma quieto en el aire.
 * - **Y que en el suelo sí espera**: el freno, con el avión quieto.
 * - **Que se dibuja el mando que se tiene en la mano**, y que el dedo de
 *   encima señala el gas, la palanca y el botón rojo del freno.
 * - **Que equivocarse no pasa nada**: una tecla que no es lo vuelve a pedir
 *   con otras palabras, con el avión volando derecho.
 * - **Que se toca dentro de la pista y despacio**, por el eje, y se para en
 *   ella; sin percance, sin frustrada y con el aterrizaje en el cuaderno.
 * - **Que en toda la escena solo hablan Jazlyn y Ara.**
 * - **Y que acaba con el sello del Chaco**, y al seguir la tarjeta se va.
 *
 * Sin voces del sistema —el banco no las tiene, como el Brave de Enrique— y
 * sin grabar todavía: cada frase espera el rato de leerla, que es lo más
 * despacio que va la escena.
 *
 * Uso: `node scripts/verificar-inicio-2.mjs [teclado,dedo,consola,joystick]`
 *   `OGA_GPU=1` con la tarjeta de verdad; `OGA_FOTOS=carpeta` saca capturas
 *   de cada paso, con el renderer en el nombre; `OGA_SIN_HANGAR=1` se salta
 *   la ficha del hangar.
 */
import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = 5396;
const CUALES = (process.argv[2] ?? "teclado,dedo,consola,joystick")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const FOTOS = process.env.OGA_FOTOS ?? null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
/** Tope de pared por vuelta: la escena dura unos tres minutos de vuelo. */
const TOPE_S = Number(process.env.OGA_TOPE ?? 480);

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

/*
 * El HOTAS X en Linux: siete ejes, y la palanca de gases en Z. **A media
 * palanca**, que es donde la tiene quien viene en una final: −0,18 es el gas
 * de entrada en final del JAZ 20 en Guyrami. Ver `flight/mandos-fisicos.ts`.
 */
const PADS = {
  consola: { id: "Xbox 360 Controller (XInput STANDARD GAMEPAD)", mapping: "standard", ejes: [0, 0, 0, 0] },
  joystick: {
    id: "Thrustmaster T.Flight Hotas X (STANDARD GAMEPAD Vendor: 044f Product: b108)",
    mapping: "",
    ejes: [0, 0, -0.18, 0, 0, 0, 0],
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
const boton = (page, i, valor) =>
  page.evaluate(([i, v]) => {
    globalThis.__padFalso.buttons[i] = { pressed: v > 0.5, touched: v > 0, value: v };
    globalThis.__padFalso.timestamp = performance.now();
  }, [i, valor]);

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
  const ruta = `${FOTOS}/inicio-2-${nombre}-${corto}.png`;
  await page.screenshot({ path: ruta });
  console.log(`  📷 ${ruta}  —  ${r}`);
}

/** Lo que se ve de la escena, de una vez. */
const leer = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const i = o?.inicio?.();
    const d = document.querySelector("#inicio [data-mando]");
    const s = o?.estado?.();
    return {
      inicio: i ?? null,
      dibujo: d ? { mando: d.dataset.mando, gesto: d.dataset.gesto } : null,
      pos: s ? { x: s.position.x, y: s.position.y, z: s.position.z } : null,
      velocidad: s?.airspeed ?? 0,
      enTierra: s?.onGround ?? true,
      percance: o?.percance?.() ?? null,
      raizOculta: document.querySelector("#inicio")?.hidden ?? true,
      conInicio: document.documentElement.classList.contains("con-inicio"),
    };
  });

/** Lo que hay que hacer en cada paso, con cada mando. */
function acciones(page, cdp, cual) {
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
      const el = document.querySelector(sel);
      const r = el?.getBoundingClientRect();
      return r && r.width > 2 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
    }, sel);
  const tocar = async (sel, ms = 60) => {
    const r = await caja(sel);
    if (!r) return false;
    await bajar(1, r.x + r.w / 2, r.y + r.h / 2);
    await pausa(ms);
    await subir(1);
    return true;
  };
  /** La palanca de mando, desde el centro, un rato, y se suelta. */
  const palanca = async (dx, dy, ms) => {
    const r = await caja('#tactil [data-touch="stick"]');
    if (!r) return;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    await bajar(2, cx, cy);
    for (let k = 1; k <= 6; k++) {
      await mover(2, cx + (dx * r.w * k) / 6, cy + (dy * r.h * k) / 6);
      await pausa(30);
    }
    await pausa(ms);
    await subir(2);
  };
  const tecla = async (codigo, ms) => {
    await page.keyboard.down(codigo);
    await pausa(ms);
    await page.keyboard.up(codigo);
  };

  const teclado = {
    menosGas: () => tecla("Minus", 150),
    bajar: () => tecla("ArrowDown", 250),
    subir: () => tecla("ArrowUp", 2500),
    frenar: () => tecla("KeyB", 300),
    seguir: () => page.keyboard.press("Enter"),
  };
  const dedo = {
    // El punto del gas, de donde está, un poco abajo.
    menosGas: async () => {
      const r = await caja('#tactil [data-touch="throttle"]');
      if (!r) return;
      const punto = await caja('#tactil [data-touch="throttle"] .pad__punto');
      const x = r.x + r.w / 2;
      const y0 = punto ? punto.y + punto.h / 2 : r.y + r.h * 0.45;
      await bajar(3, x, y0);
      for (let k = 1; k <= 6; k++) {
        await mover(3, x, y0 + (r.h * 0.2 * k) / 6);
        await pausa(30);
      }
      await subir(3);
    },
    bajar: () => palanca(0, 0.3, 300),
    subir: () => palanca(0, -0.3, 2500),
    // El botón rojo de la pantalla, que es un pedal: se pisa un rato.
    frenar: () => tocar('[data-hud="brakes-touch"]', 400),
    seguir: () => tocar('[data-inicio="seguir"]'),
  };
  const consola = {
    // El gatillo del gas, apenas: poco gas.
    menosGas: async () => {
      await boton(page, 7, 0.2);
      await pausa(300);
      await boton(page, 7, 0);
    },
    bajar: async () => {
      await eje(page, 1, 0.8);
      await pausa(400);
      await eje(page, 1, 0);
    },
    subir: async () => {
      await eje(page, 1, -0.8);
      await pausa(2500);
      await eje(page, 1, 0);
    },
    // El gatillo izquierdo, el freno.
    frenar: async () => {
      await boton(page, 6, 1);
      await pausa(400);
      await boton(page, 6, 0);
    },
    seguir: async () => {
      await eje(page, 0, 0.9);
      await pausa(300);
      await eje(page, 0, 0);
    },
  };
  const joystick = {
    ...consola,
    // La palanca de gases, de la mitad un poco atrás.
    menosGas: async () => {
      for (let k = 1; k <= 5; k++) {
        await eje(page, 2, -0.18 + (0.45 * k) / 5);
        await pausa(80);
      }
    },
    // Hacia delante es morro abajo: el eje Y negativo.
    bajar: async () => {
      await eje(page, 1, -0.8);
      await pausa(400);
      await eje(page, 1, 0);
    },
    subir: async () => {
      await eje(page, 1, 0.8);
      await pausa(2500);
      await eje(page, 1, 0);
    },
    // El gatillo del mango.
    frenar: async () => {
      await boton(page, 0, 1);
      await pausa(400);
      await boton(page, 0, 0);
    },
  };
  return { teclado, dedo, consola, joystick }[cual];
}

/** El gesto de cada paso. */
const GESTO = { gas: "menosGas", nariz: "bajar", recogida: "subir", frenar: "frenar" };
/** A qué mando de la pantalla señala el dedo de encima en cada paso. */
const SENALA = { gas: '#tactil [data-touch="throttle"]', nariz: '#tactil [data-touch="stick"]', frenar: '[data-hud="brakes-touch"]' };

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
  await page.goto(`${BASE}/?inicio=2&hora=12`);
  await page.bringToFront();
  const et = (s) => `${cual}: ${s}`;
  try {
    await page.waitForFunction(() => !!globalThis.__oga?.inicio?.()?.estado, null, { timeout: 120_000 });
  } catch {
    comprobar(et("el juego arranca en la escena de aterrizar"), false, errores.join(" · ") || "sin __oga");
    await ctx.close();
    return;
  }
  const cdp = await ctx.newCDPSession(page);
  const hacer = acciones(page, cdp, cual);
  const primero = await leer(page);
  await pausa(1000);
  const tras = await leer(page);
  const avanzo = primero.pos && tras.pos ? Math.hypot(tras.pos.x - primero.pos.x, tras.pos.z - primero.pos.z) : 0;
  comprobar(
    et("arranca aterrizando: en la final, volando y sin parar el mundo"),
    primero.inicio?.escena === "aterrizar" &&
      ["hola", "gas"].includes(primero.inicio.estado?.paso) &&
      !primero.enTierra &&
      !tras.inicio?.congelado &&
      avanzo > 10,
    `${primero.inicio?.escena} · ${primero.inicio?.estado?.paso} · en el aire: ${!primero.enTierra} · avanzó ${avanzo.toFixed(0)} m en 1 s`,
  );

  // El primer gesto, que deja sonar algo: con el dedo, un toque en el cielo.
  if (conDedo) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ id: 9, x: 400, y: 160, radiusX: 9, radiusY: 9, force: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else await page.keyboard.press("ShiftLeft");

  const cambios = [];
  let ultimoDibujo = null;
  if (cual === "consola" || cual === "joystick") {
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

  const aterrizajesAntes = primero.inicio?.cuaderno?.aterrizajes ?? 0;
  const percancesAntes = primero.inicio?.cuaderno?.percances ?? 0;
  const frustradasAntes = primero.inicio?.cuaderno?.frustradas ?? 0;
  const vistos = new Map();
  const medido = new Set();
  const hecho = new Set();
  let error = null;
  let quietoEnElAire = null;
  let masLejosDeLaSenda = 0;
  let masDeLado = 0;
  let percance = null;
  let sello = null;
  let seguido = false;
  let conversacion = null;
  let quedabaAlParar = null;
  const t0 = Date.now();

  while (Date.now() - t0 < TOPE_S * 1000) {
    const v = await leer(page);
    if (v.dibujo?.mando && v.dibujo.mando !== ultimoDibujo) {
      cambios.push(v.dibujo.mando);
      ultimoDibujo = v.dibujo.mando;
    }
    if (v.percance) percance = v.percance;
    const e = v.inicio?.estado;
    if (!e) {
      seguido = true;
      break;
    }
    if (!vistos.has(e.paso)) vistos.set(e.paso, (Date.now() - t0) / 1000);
    const l = v.inicio.lectura;
    if (!v.enTierra && v.inicio.congelado && !quietoEnElAire) quietoEnElAire = `${e.paso}/${e.fase}`;
    if (l && !v.enTierra && l.altura > 30) masLejosDeLaSenda = Math.max(masLejosDeLaSenda, Math.abs(l.sobreLaSenda));
    if (l && !v.enTierra) masDeLado = Math.max(masDeLado, Math.abs(l.lado));

    // ── Lo que se mira mientras se pide ──
    if (e.gesto && (e.fase === "espera" || e.fase === "entra") && !medido.has(e.paso) && !e.hablando) {
      medido.add(e.paso);
      const quiero = cual;
      comprobar(
        et(`${e.paso}: se dibuja el gesto con el mando que se tiene en la mano`),
        v.dibujo?.mando === quiero && v.dibujo?.gesto === GESTO[e.paso],
        `${v.dibujo?.mando ?? "nada"}/${v.dibujo?.gesto ?? "-"} · se quería ${quiero}/${GESTO[e.paso]}`,
      );
      if (conDedo && SENALA[e.paso]) {
        await pausa(600);
        const encima = await page.evaluate((sel) => {
          const d = document.querySelector(".inicio__dedo");
          const pad = document.querySelector(sel);
          if (!d || d.hidden || !pad) return null;
          const a = d.getBoundingClientRect();
          const b = pad.getBoundingClientRect();
          return a.left < b.right && a.right > b.left && a.top < b.bottom + 30 && a.bottom > b.top - 60;
        }, SENALA[e.paso]);
        comprobar(
          et(`${e.paso}: un dedo señala el mando de verdad de la pantalla`),
          encima,
          encima === null ? "no hay dedo" : encima ? "encima" : "lejos",
        );
      }
      // Volando, el mundo no se para y la mano lo lleva; en el suelo, espera.
      const antes = await leer(page);
      await pausa(1500);
      const despues = await leer(page);
      const d =
        antes.pos && despues.pos
          ? Math.hypot(despues.pos.x - antes.pos.x, despues.pos.y - antes.pos.y, despues.pos.z - antes.pos.z)
          : NaN;
      const corre = (despues.inicio?.estado?.segundos ?? 0) - (antes.inicio?.estado?.segundos ?? 0);
      if (e.paso === "frenar")
        comprobar(
          et("frenar: en el suelo el mundo espera el freno, y la escena sigue viva"),
          d < 0.05 && corre > 1 && despues.inicio?.estado?.paso === "frenar" && despues.inicio.congelado,
          `se movió ${d.toFixed(2)} m · la escena corrió ${corre.toFixed(1)} s`,
        );
      else if (e.paso !== "recogida") {
        const ld = despues.inicio?.lectura;
        comprobar(
          et(`${e.paso}: volando, el mundo no se para y la mano lleva el avión por la senda`),
          d > 25 && corre > 1 && !despues.inicio?.congelado && ld && Math.abs(ld.sobreLaSenda) < 20 && Math.abs(ld.lado) < 8,
          `avanzó ${d.toFixed(0)} m en 1,5 s · ${ld ? `${ld.sobreLaSenda.toFixed(1)} m sobre la senda, ${ld.lado.toFixed(1)} m de lado` : "sin lectura"}`,
        );
      }
      if (!hecho.has(`foto-${e.paso}`)) {
        hecho.add(`foto-${e.paso}`);
        await foto(page, `${cual}-${e.paso}`);
      }
      continue;
    }

    // ── El final ──
    if (e.paso === "fin") {
      if (quedabaAlParar === null) quedabaAlParar = l?.pistaQueQueda ?? null;
      if (!e.puedeSeguir) {
        await pausa(150);
        continue;
      }
      if (!conversacion)
        conversacion = await page.evaluate(() => ({
          habladas: globalThis.__oga.habladas(),
          descartadas: globalThis.__oga.descartadas(),
          maquina: globalThis.__oga.maquina?.() ?? [],
          registro: globalThis.__oga.inicio?.()?.registro ?? null,
        }));
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

    // ── Y se hace lo que se pide, cuando se ha terminado de pedir ──
    if (e.gesto && e.fase === "espera" && !e.hablando) {
      if (e.paso === "gas" && cual === "teclado" && !error) {
        // Primero, una que no es: más gas, lo contrario.
        const antes = e.otraVez;
        await page.keyboard.down("Equal");
        await pausa(200);
        await page.keyboard.up("Equal");
        await pausa(700);
        const tras = await leer(page);
        error = {
          otraVez: (tras.inicio?.estado?.otraVez ?? 0) - antes,
          paso: tras.inicio?.estado?.paso,
          quieto: tras.inicio?.congelado,
          linea: tras.inicio?.estado?.linea?.clave,
          sobre: tras.inicio?.lectura?.sobreLaSenda ?? NaN,
        };
        continue;
      }
      const hazlo = hacer[GESTO[e.paso]];
      if (hazlo && !hecho.has(e.paso)) {
        hecho.add(e.paso);
        await hazlo();
      }
      await pausa(200);
      continue;
    }
    // La recogida no espera a que acabe de pedirse: en cuanto se pide, se tira.
    if (e.paso === "recogida" && !e.tocado && !hecho.has("recogida")) {
      hecho.add("recogida");
      comprobar(
        et("recogida: se dibuja el gesto con el mando que se tiene en la mano"),
        v.dibujo?.mando === cual && v.dibujo?.gesto === GESTO.recogida,
        `${v.dibujo?.mando ?? "nada"}/${v.dibujo?.gesto ?? "-"} · se quería ${cual}/${GESTO.recogida}`,
      );
      await foto(page, `${cual}-recogida`);
      await hacer.subir();
      continue;
    }
    await pausa(120);
  }

  const toma = (await leer(page)).inicio?.toma ?? null;
  const fin = await page.evaluate(() => globalThis.__oga?.inicio?.()?.cuaderno ?? null);
  comprobar(
    et("se recorre la escena entera, paso a paso"),
    ["gas", "nariz", "senda", "recogida", "frenar", "parado", "fin"].every((p) => vistos.has(p)),
    [...vistos].map(([p, t]) => `${p}@${t.toFixed(0)}s`).join(" "),
  );
  comprobar(
    et("en el aire, el mundo no se paró ni un fotograma"),
    quietoEnElAire === null,
    quietoEnElAire ? `quieto en ${quietoEnElAire}` : "nunca",
  );
  comprobar(
    et("y la mano lo llevó por la senda y por el eje"),
    masLejosDeLaSenda > 0 && masLejosDeLaSenda < 20 && masDeLado < 8,
    `lo más lejos de la senda: ${masLejosDeLaSenda.toFixed(1)} m · de lado: ${masDeLado.toFixed(1)} m`,
  );
  if (cual === "teclado")
    comprobar(
      et("una tecla que no es lo vuelve a pedir con otras palabras, volando derecho"),
      error && error.otraVez >= 1 && error.paso === "gas" && !error.quieto && /otra/.test(error.linea ?? "") && Math.abs(error.sobre) < 20,
      error ? `${error.otraVez} vez · ${error.linea} · quieto: ${error.quieto} · ${error.sobre.toFixed(1)} m sobre la senda` : "no se probó",
    );
  comprobar(
    et("se toca dentro de la pista, pasado el umbral, despacio y por el eje"),
    !!toma && toma.alUmbral < 0 && toma.alUmbral > -800 && toma.caida < 1.5 && Math.abs(toma.lado) < 5,
    toma
      ? `a ${(-toma.alUmbral).toFixed(0)} m del umbral · ${toma.caida.toFixed(2)} m/s · ${toma.lado.toFixed(1)} m de lado · ${toma.velocidad.toFixed(1)} m/s`
      : "no se tocó",
  );
  comprobar(
    et("y se para en la pista"),
    quedabaAlParar !== null && Number.isFinite(quedabaAlParar) && quedabaAlParar > 100,
    quedabaAlParar === null ? "no se paró" : `quedaban ${Number(quedabaAlParar).toFixed(0)} m`,
  );
  comprobar(
    et("sin percance ni frustrada, y el aterrizaje en el cuaderno"),
    !percance &&
      !!fin &&
      fin.percances === percancesAntes &&
      fin.frustradas === frustradasAntes &&
      fin.aterrizajes === aterrizajesAntes + 1,
    `percance: ${percance ?? "ninguno"} · aterrizajes ${aterrizajesAntes}→${fin?.aterrizajes} · frustradas ${frustradasAntes}→${fin?.frustradas}`,
  );
  const ajenas = [
    ...(conversacion?.habladas ?? []),
    ...(conversacion?.descartadas ?? []).map((d) => `${d} (se cayó)`),
    ...(conversacion?.maquina ?? []).map((m) => `${m} (máquina)`),
  ].filter((l) => !/^\S+s inicio\./.test(l));
  /*
   * Lo que pidió la escena, del registro: sin grabar todavía, la boca no
   * apunta nada como sonado —no sonó—, y lo que se mira es que no sonara
   * nadie más. Con las frases grabadas, `habladas` las tendrá todas.
   */
  const pedidas = (conversacion?.registro ?? []).length;
  comprobar(
    et("en toda la escena no habla nadie más que Jazlyn y Ara"),
    !!conversacion && pedidas > 10 && ajenas.length === 0,
    !conversacion
      ? "no llegó al final"
      : ajenas.length
        ? `${ajenas.length}: ${ajenas.slice(0, 4).join(" · ")}`
        : `${pedidas} frases de la escena, ${(conversacion.habladas ?? []).length} sonadas, y ninguna de nadie más`,
  );
  comprobar(
    et("al final, el sello del Chaco, a la vista y en el cuaderno"),
    sello?.campo === "chaco" && sello.visible && sello.cuaderno.includes("chaco"),
    sello ? `${sello.campo} · visible: ${sello.visible} · cuaderno: ${sello.cuaderno.join(",")}` : "no llegó al final",
  );
  if (seguido) {
    const b = await leer(page);
    comprobar(
      et("y al seguir, la tarjeta se va y el avión queda en la pista, entero"),
      b.raizOculta && !b.conInicio && b.enTierra && !b.percance,
      `tarjeta ${b.raizOculta ? "fuera" : "puesta"} · en tierra: ${b.enTierra}`,
    );
  } else comprobar(et("y al seguir, la tarjeta se va"), false, "no se acabó en el tope");
  if (cual === "consola" || cual === "joystick")
    comprobar(
      et("el dibujo cambia con el mando: del teclado al mando enchufado"),
      cambios[0] === "teclado" && cambios.includes(cual),
      cambios.join(" → "),
    );
  comprobar(et("sin errores"), errores.length === 0, errores[0] ?? "limpio");
  await ctx.close();
}

/**
 * **Y desde el hangar**: su ficha, al lado de la de aprender, abre la escena
 * de aterrizar. Un piloto nuevo con la escena del despegue grabada va directo
 * a ella —es la primera experiencia—, así que aquí se le esconde el pack de
 * Ara para que vaya al hangar, como va mientras falta una sola frase.
 */
async function desdeElHangar() {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-PY" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.route("**/data/voces/ara/manifiesto.json", (r) => r.fulfill({ status: 404, body: "" }));
  try {
    await page.goto(`${BASE}/?hora=12`);
    await page.click("[data-nuevo]", { timeout: 120_000 });
    await page.click("[data-crear]");
    await page.waitForSelector('[data-pantalla="que"]', { timeout: 120_000 });
    await page.click('[data-pantalla="que"]');
    await page.waitForSelector("[data-inicio-modo]", { timeout: 20_000 });
    const fichas = await page.evaluate(() =>
      [...document.querySelectorAll("[data-inicio-modo]")].map((b) => ({
        cual: b.getAttribute("data-inicio-modo"),
        nombre: b.querySelector(".ficha__nombre")?.textContent?.trim(),
        alto: Math.round(b.getBoundingClientRect().height),
      })),
    );
    /*
     * Y detrás, desde la tercera escena, la de viajar de pasaje: ver
     * `verificar-inicio-3.mjs`.
     */
    comprobar(
      "hangar: las fichas de Jazlyn, aprender y aterrizar, una al lado de la otra",
      fichas.length >= 2 && fichas[0].cual === "despegar" && fichas[1].cual === "aterrizar" && fichas.every((f) => f.alto >= 44),
      fichas.map((f) => `${f.cual}: «${f.nombre}» ${f.alto} px`).join(" · "),
    );
    await page.click('[data-inicio-modo="aterrizar"]');
    const escena = await page
      .waitForFunction(() => globalThis.__oga?.inicio?.()?.estado && globalThis.__oga.inicio().escena, null, {
        timeout: 120_000,
      })
      .then((h) => h.jsonValue())
      .catch(() => null);
    const dentro = await page.evaluate(() => ({
      enTierra: globalThis.__oga?.estado?.().onGround ?? null,
      avion: globalThis.__oga?.avion?.().id ?? null,
    }));
    comprobar(
      "hangar: su ficha abre la escena de aterrizar, en el aire y con el JAZ 20",
      escena === "aterrizar" && dentro.enTierra === false,
      `${escena ?? "nada"} · en el aire: ${dentro.enTierra === false} · ${dentro.avion ?? "?"}${errores.length ? ` · ${errores[0]}` : ""}`,
    );
  } catch (e) {
    comprobar("hangar: su ficha abre la escena de aterrizar", false, String(e).slice(0, 140));
  } finally {
    await ctx.close();
  }
}

try {
  if (!process.env.OGA_SIN_HANGAR) await desdeElHangar();
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

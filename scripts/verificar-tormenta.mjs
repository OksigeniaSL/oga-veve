/**
 * **El ejercicio de la tormenta, volado de verdad**: las dos salidas.
 *
 * Las pruebas de `practica-de-tormenta.test.ts` miran el orden de lo que pasa
 * con un avión de papel. Esto mira la cadena entera dentro del juego, con un
 * piloto de banco que hace lo que se enseña —o lo contrario—:
 *
 * - `rodear`: oye qué es, gira treinta y cinco grados a la derecha —el lado
 *   del viento— y sigue hasta dejarla al costado, y vuelve hacia casa. Tiene
 *   que pasar a sus veinte millas del rojo, oír que va bien, ver el rayo de
 *   lejos, celebrarse y no entrar nunca; arriba, con el desvío pedido por
 *   radio.
 * - `entrar`: derecho a ella. Dentro tiene que sacudir, llover y granizar, un
 *   rayo tiene que tocar el avión y contarse con calma, y al salir el
 *   ejercicio vuelve a empezar solo, sin percance ni castigo.
 * - `fotos`: las capturas —la tormenta de lejos al empezar, de cerca, con el
 *   rayo y por dentro—, con el nombre de la tarjeta que las dibujó. Con
 *   `OGA_GPU=1`, con la tarjeta del equipo.
 *
 * **Las voces que no están grabadas no suenan** —ver `decirDelEjercicio` en
 * `game.ts`—, y el juego apunta cada una que se calla en `cantados`. Así que
 * lo que se mira aquí es que se **pidió**, grabado o no.
 *
 * Uso: `node scripts/verificar-tormenta.mjs <rodear|entrar|fotos> [escenario]
 *        [avion] [tramo]`
 *
 * Con `OGA_TRAZA=1` escribe la traza del vuelo aunque todo vaya bien, y con
 * `OGA_FOTOS=<carpeta>` dice dónde dejar las capturas.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const MODO = process.argv[2] ?? "rodear";
if (!["rodear", "entrar", "fotos"].includes(MODO)) {
  console.error("Uso: verificar-tormenta.mjs <rodear|entrar|fotos> [escenario] [avion] [tramo]");
  process.exit(2);
}
const ESCENARIO = process.argv[3] ?? "pettirossi";
const AVION = process.argv[4] ?? "jaz-90";
const TRAMO = process.argv[5] ?? "taguato";
const PUERTO = 5349;
const FOTOS = process.env.OGA_FOTOS ?? "fotos-tormenta";
const CON_GPU = process.env.OGA_GPU === "1";
/** Lo más que se espera, en segundos de reloj del juego. */
const TOPE = Number(process.env.OGA_TOPE ?? 1500);

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
const resultados = [];
const comprobar = (nombre, ok, detalle) => resultados.push({ nombre, ok: !!ok, detalle });

try {
  const page = await navegador.newPage({
    viewport: { width: 1280, height: 720 },
    locale: "es-PY",
  });
  page.on("pageerror", (e) => console.log("ERROR:", e.message));
  await page.addInitScript(() => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
    /*
     * Lo que pasa por la tira de la radio, apuntado al pasar: es donde se lee
     * el desvío pedido y su respuesta.
     */
    globalThis.__radioDelBanco = [];
    new MutationObserver(() => {
      const caja = document.querySelector('[data-hud="radio"]');
      const texto = caja?.textContent?.trim();
      const lista = globalThis.__radioDelBanco;
      if (texto && lista[lista.length - 1] !== texto) lista.push(texto);
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  await page.goto(
    `${BASE}/?escenario=${ESCENARIO}&avion=${AVION}&tramo=${TRAMO}` +
      `&ejercicio=tormenta&teselas=0`,
  );
  await page.waitForFunction(() => !!globalThis.__oga?.estado, null, { timeout: 90000 });
  await page.waitForTimeout(12000);

  const tarjeta = await page.evaluate(() => {
    const gl = globalThis.__oga.pintor().getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre";
  });
  console.log(`  tarjeta: ${tarjeta}`);

  if (MODO === "fotos") {
    mkdirSync(FOTOS, { recursive: true });
    const foto = async (nombre) => {
      await page.screenshot({ path: `${FOTOS}/${nombre}.png` });
      console.log(`  → ${FOTOS}/${nombre}.png`);
    };
    // Otra vez desde el principio: la escena entera, con la nube delante.
    await page.evaluate(() => globalThis.__oga.reiniciar());
    await page.waitForTimeout(4000);
    await foto("1-de-lejos");
    const t = await page.evaluate(() => globalThis.__oga.tormenta());
    const s0 = await page.evaluate(() => globalThis.__oga.estado().position);
    // De cerca: a veinticinco kilómetros, mirándola, a la altura del ejercicio.
    const rumbo = Math.atan2(t.celda.x - s0.x, -(t.celda.z - s0.z));
    const aDistancia = (d) => ({
      x: t.celda.x - Math.sin(rumbo) * d,
      z: t.celda.z + Math.cos(rumbo) * d,
    });
    const cerca = aDistancia(25000);
    await page.evaluate(
      ({ p, y, r }) => {
        globalThis.__oga.colocar(p.x, y, p.z, 200, r);
        globalThis.__oga.pilotoAutomatico?.(true);
      },
      { p: cerca, y: s0.y, r: rumbo },
    );
    await page.waitForTimeout(5000);
    await foto("2-de-cerca");
    /*
     * Y desde abajo, a dos mil metros y a treinta kilómetros: la base oscura,
     * la cortina de agua y el rayo que baja al suelo, que desde arriba tapa
     * la propia nube. Con la vista de cabina, sin el avión delante.
     */
    const abajo = aDistancia(30000);
    await page.evaluate(
      ({ p, r }) => {
        const o = globalThis.__oga;
        o.colocar(p.x, o.suelo(p.x, p.z) + 2000, p.z, 150, r);
        o.ponerVista?.("cockpit");
      },
      { p: abajo, r: rumbo },
    );
    await page.waitForTimeout(4000);
    await foto("3-desde-abajo");
    // El rayo de lejos, en el instante en que alumbra.
    await page.evaluate(() => globalThis.__oga.rayoDeLaTormenta(false));
    await page.waitForTimeout(60);
    await foto("4-rayo-de-lejos");
    await page.waitForTimeout(3000);
    await page.evaluate(() => globalThis.__oga.ponerVista?.("chase"));
    // Y por dentro: en el borde del núcleo, con el agua cayendo.
    const dentro = aDistancia(1500);
    await page.evaluate(
      ({ p, y, r }) => globalThis.__oga.colocar(p.x, y, p.z, 200, r),
      { p: dentro, y: s0.y, r: rumbo },
    );
    await page.waitForTimeout(3000);
    await foto("5-dentro");
    await page.evaluate(() => globalThis.__oga.rayoDeLaTormenta(true));
    await page.waitForTimeout(60);
    await foto("6-rayo-en-el-avion");
    const estado = await page.evaluate(() => ({
      tormenta: globalThis.__oga.tormenta(),
      agua: globalThis.__oga.agua(),
      niebla: globalThis.__oga.nieblaAhora(),
    }));
    console.log(
      `  dentro: lluvia ${JSON.stringify(estado.tormenta.lloviendo)} · granizo ${estado.tormenta.granizo.toFixed(2)} · ` +
        `rayas ${estado.agua.rayas} · niebla ${estado.niebla.toExponential(2)} · ` +
        `${estado.tormenta.triangulos} triángulos de nube`,
    );
    comprobar(
      "las capturas se hicieron con la tarjeta de verdad",
      !/swiftshader/i.test(tarjeta),
      tarjeta,
    );
  } else {
    const r = await page.evaluate(
      async ({ modo, tope }) => {
        const o = globalThis.__oga;
        const espera = (ms) => new Promise((res) => setTimeout(res, ms));
        /*
         * **Otra vez desde el principio**, como el botón del final: el mundo
         * ya está asentado, y lo que empezó mientras cargaba no cuenta.
         */
        // Lo dicho hasta aquí no cuenta; lo de desde el principio, entero.
        const antes = {
          instructor: o.dichoTodo().instructor.length,
          cantados: o.cantados().length,
        };
        o.reiniciar();
        await espera(300);
        o.acelerar?.(8);
        const t0 = o.reloj();
        const t = o.tormenta();
        const s0 = o.estado();
        // El camino de casa: el rumbo con que se empieza, hacia la pista.
        const camino = s0.heading;
        const crucero = s0.airspeed;
        const altura = s0.position.y;
        const acota = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        const error = (a, b) => {
          let e = a - b;
          while (e > Math.PI) e -= 2 * Math.PI;
          while (e < -Math.PI) e += 2 * Math.PI;
          return e;
        };
        let reloj = t0;
        let lenta = 0;
        let deActitud = 0;
        let deGas = 0.5;
        const profundidad = (s, quiereCabeceo, dt) => {
          const falta = quiereCabeceo - o.actitud().cabeceo;
          deActitud = acota(deActitud + 0.8 * falta * dt, -0.5, 0.5);
          return acota(2.5 * falta - 1.2 * s.pitchRate + deActitud, -1, 1);
        };
        // A nivel: la subida que pida volver a la altura del ejercicio.
        const aNivel = (s, dt) => {
          const vs = acota((altura - s.position.y) * 0.05, -8, 8);
          const e = vs - s.verticalSpeed;
          lenta = acota(lenta + 0.004 * e * dt, -0.3, 0.3);
          return profundidad(s, acota(lenta + 0.012 * e, -0.25, 0.3), dt);
        };
        const gasPara = (s, v, dt) => {
          const e = v - s.airspeed;
          deGas = acota(deGas + 0.02 * e * dt, 0, 1);
          return acota(deGas + 0.08 * e, 0, 1);
        };
        const alabear = (s, rumbo, tope) => {
          const e = error(rumbo, s.heading);
          const quiere = acota(e * 1.4, -tope, tope);
          return acota((quiere - o.actitud().alabeo) * 1.6 - s.rollRate * 0.3, -0.6, 0.6);
        };
        let quiere = camino;
        const piloto = (c) => {
          const ahora = o.reloj();
          const dt = Math.max(0, Math.min(0.25, ahora - reloj));
          reloj = ahora;
          const s = o.estado();
          c.aileron = alabear(s, quiere, 0.45);
          c.rudder = 0;
          c.elevator = aNivel(s, dt);
          c.throttle = gasPara(s, crucero, dt);
        };
        o.pilotar(piloto);

        const traza = [];
        let entro = false;
        let maxSacude = 0;
        let maxGranizo = 0;
        let maxRayas = 0;
        let lluviaDentro = null;
        let nieblaFuera = o.nieblaAhora();
        let nieblaDentro = 0;
        let cinturon = false;
        let salioYVolvio = false;
        let rodeadaEn = null;
        let ultimaTraza = -999;
        while (o.reloj() - t0 < tope) {
          await espera(100);
          const s = o.estado();
          const tt = o.tormenta();
          if (!tt) break;
          const dx = s.position.x - t.celda.x;
          const dz = s.position.z - t.celda.z;
          const d = Math.hypot(dx, dz);
          if (tt.cinturon) cinturon = true;
          if (tt.entro) {
            entro = true;
            const r = o.rafagas();
            maxSacude = Math.max(maxSacude, Math.abs(r.vertical));
            maxGranizo = Math.max(maxGranizo, tt.granizo);
            maxRayas = Math.max(maxRayas, o.agua().rayas);
            if (tt.lloviendo) lluviaDentro = tt.lloviendo;
            nieblaDentro = Math.max(nieblaDentro, o.nieblaAhora());
          }
          if (o.reloj() - ultimaTraza > 20) {
            ultimaTraza = o.reloj();
            traza.push(
              `${Math.round(o.reloj() - t0)}s ${tt.fase} · a ${(d / 1000).toFixed(1)} km del centro · ` +
                `rumbo ${Math.round((s.heading * 180) / Math.PI)}° · ${Math.round(s.position.y)} m · ` +
                `${Math.round(s.airspeed)} m/s · lo más cerca del rojo ${(tt.loMasCerca / 1000).toFixed(1)} km`,
            );
          }
          if (modo === "rodear") {
            /*
             * Oído qué es y avisado el control, se gira al lado del viento: con
             * cuarenta grados, que el viraje lleva su rato y el viento empuja.
             */
            if (o.reloj() - t0 > 30 && rodeadaEn === null) quiere = camino + (40 * Math.PI) / 180;
            if (tt.comoSeRodeo && rodeadaEn === null) {
              rodeadaEn = o.reloj();
              quiere = camino;
            }
            if (rodeadaEn !== null && o.reloj() - rodeadaEn > 25) break;
          } else {
            // Y al salir, el ejercicio vuelve a empezar solo.
            if (entro && tt.fase === "delante" && !tt.entro) {
              salioYVolvio = true;
              await espera(1500);
              break;
            }
          }
          if (o.percance()) break;
        }
        o.pilotar(null);
        const todo = o.dichoTodo();
        return {
          tormenta: o.tormenta(),
          traza,
          entro,
          maxSacude,
          maxGranizo,
          maxRayas,
          lluviaDentro,
          nieblaFuera,
          nieblaDentro,
          cinturon,
          salioYVolvio,
          rodeada: rodeadaEn !== null,
          percance: o.percance(),
          reloj: o.reloj() - t0,
          instructor: todo.instructor.slice(antes.instructor),
          torre: todo.torre ?? [],
          cantados: o.cantados().slice(antes.cantados),
          radio: [...globalThis.__radioDelBanco],
        };
      },
      { modo: MODO, tope: TOPE },
    );

    const dice = (lista, trozo) => lista.some((k) => String(k).includes(trozo));
    const pedido = [...r.instructor, ...r.cantados];
    const conCifras = TRAMO === "taguato" || TRAMO === "taguato-ruvicha";
    const explica = TRAMO !== "taguato-ruvicha";
    const km = (m) => `${(m / 1000).toFixed(1)} km`;
    comprobar(
      "la instructora presenta la tormenta antes de nada",
      dice(pedido, "ejercicio.tormenta.antes"),
      pedido.filter((k) => /tormenta\.antes/.test(k)).slice(0, 1).join("") || "no",
    );
    if (explica)
      comprobar(
        "y cuenta por qué no se entra y por dónde se rodea",
        dice(pedido, "ejercicio.tormenta.porQue") || dice(pedido, "ejercicio.tormenta.radar"),
        pedido.filter((k) => /tormenta\.(porQue|radar)/.test(k)).slice(0, 1).join("") || "no",
      );
    comprobar("con el cartel del cinturón encendido", r.cinturon, `cinturón ${r.cinturon}`);
    if (conCifras)
      comprobar(
        "y el desvío, pedido y aprobado por radio",
        dice(r.radio, "request weather deviation") && dice(r.radio, "advise clear of weather"),
        r.radio.filter((k) => /deviation/.test(k)).slice(0, 1).join("") || `no · ${r.radio.slice(-3).join(" | ")}`,
      );
    comprobar("sin percance: nadie se hace daño", !r.percance, r.percance ?? "ninguno");
    if (MODO === "rodear") {
      const t = r.tormenta;
      comprobar("no entra nunca en el rojo", !r.entro, `entró ${r.entro}`);
      if (explica)
        comprobar(
          "con el rumbo que la deja lejos, «así va»",
          dice(pedido, "ejercicio.tormenta.asiVa"),
          pedido.filter((k) => /asiVa|masDerecha|masIzquierda/.test(k)).join(" · ") || "no",
        );
      if (explica)
        comprobar(
          "ve el rayo de lejos, y se le cuenta con calma",
          dice(pedido, "ejercicio.tormenta.rayoLejos"),
          pedido.filter((k) => /rayoLejos/.test(k)).join("") || "no",
        );
      comprobar(
        "la rodea a sus veinte millas del rojo",
        r.rodeada && t.comoSeRodeo === "rodeada" && t.loMasCerca >= t.margen * 0.95,
        `lo más cerca del rojo ${km(t.loMasCerca)} · margen ${km(t.margen)} · ${t.comoSeRodeo ?? "sin rodear"}`,
      );
      comprobar(
        "y se celebra",
        dice(pedido, "ejercicio.tormenta.bien"),
        pedido.filter((k) => /tormenta\.bien/.test(k)).join("") || "no",
      );
    } else {
      comprobar("entra en la tormenta", r.entro, `entró ${r.entro}`);
      comprobar(
        "dentro sacude, llueve, graniza y se cierra la vista",
        r.maxSacude > 1 && r.maxGranizo > 0 && r.lluviaDentro && r.maxRayas > 0 && r.nieblaDentro > r.nieblaFuera * 3,
        `ráfaga ${r.maxSacude.toFixed(1)} m/s · granizo ${r.maxGranizo.toFixed(2)} · ` +
          `lluvia ${JSON.stringify(r.lluviaDentro)} · rayas ${r.maxRayas} · ` +
          `niebla ${r.nieblaFuera.toExponential(1)} → ${r.nieblaDentro.toExponential(1)}`,
      );
      comprobar(
        "y se cuenta con calma: lo de dentro y el rayo que toca el avión sin hacer nada",
        dice(pedido, "ejercicio.tormenta.adentro") && dice(pedido, "ejercicio.tormenta.rayoEnElAvion"),
        pedido.filter((k) => /tormenta\.(adentro|rayoEnElAvion)/.test(k)).join(" · ") || "no",
      );
      comprobar(
        "al salir, por qué no se entra, y otra vez desde el principio: sin castigo",
        dice(pedido, "ejercicio.tormenta.salimos") && r.salioYVolvio,
        `${pedido.filter((k) => /tormenta\.salimos/.test(k)).join("") || "sin frase"} · volvió a empezar ${r.salioYVolvio}`,
      );
      comprobar(
        "y ni se celebra ni se castiga: no hay «rodeada» ni percance",
        !r.rodeada && !r.percance,
        `rodeada ${r.rodeada} · percance ${r.percance ?? "no"}`,
      );
    }
    const mal = resultados.some((x) => !x.ok);
    if (process.env.OGA_TRAZA || mal) {
      for (const l of r.traza) console.log(`    ${l}`);
      console.log(`    instructor: ${r.instructor.join(" · ")}`);
      console.log(`    callados: ${r.cantados.join(" · ")}`);
      console.log(`    radio: ${r.radio.join(" | ")}`);
    }
    console.log(
      `\n  ${MODO} · ${ESCENARIO} · ${AVION} · ${TRAMO} · ${Math.round(r.reloj)} s de reloj`,
    );
  }
  for (const x of resultados)
    console.log(`  ${x.ok ? "✓" : "✗"} ${x.nombre} — ${x.detalle}`);
  if (resultados.some((x) => !x.ok)) process.exitCode = 1;
} finally {
  await navegador.close();
  await server.close();
}

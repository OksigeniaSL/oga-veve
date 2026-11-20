/**
 * **El despegue de pista corta, volado en el juego** (#91, H35a; ADR 0027,
 * enmienda H35a): Yvytu Rape, novecientos metros de hierba con el monte a
 * ciento veinte metros del final, la mañana de veintiocho grados y en calma.
 *
 *   node scripts/ver-la-pista-corta.mjs <carpeta>
 *
 * Lo vuela dos veces con el piloto de la mesa (`pista-corta.test.ts`), metido
 * en la página con `__oga.pilotar`: frenos y motor a tope, soltar, rotar a los
 * 51 nudos de la tabla del 172S y, en el aire, la velocidad sostenida con el
 * timón, que va hacia la pedida a dos nudos por segundo:
 *
 * - **bien**: a la del obstáculo, 56 nudos, hasta pasar el monte, y luego a
 *   la Vy, 74;
 * - **mal**: a la Vy desde que se va del suelo;
 * - **copas**: recién despegado se queda a seis metros del suelo, con el
 *   motor a tope y sin subir, y llega al monte por debajo de las copas. Desde
 *   H35b los árboles se tocan: tiene que salir el percance del árbol y el
 *   ejercicio pedir otra vez (`OGA_TECNICA=bien,mal,copas`, que es lo de
 *   siempre).
 *
 * Mira que se presente, que pida soltar los frenos, que el monte esté en su
 * sitio, cómo se pasa y con cuánto margen sobre las copas, y que bien volado
 * el margen sea mucho mayor que mal volado: si no lo es, la lección no es
 * real en el modelo. El puerto, `OGA_PUERTO`; el peldaño, `OGA_TRAMO`
 * (Taguato Ruvichá, sin ayudas); con `OGA_GPU=1`, con la tarjeta de verdad.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";

const SALIDA = process.argv[2] ?? "capturas-pista-corta";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5686);
const TRAMO = process.env.OGA_TRAMO ?? "taguato-ruvicha";
const CON_GPU = process.env.OGA_GPU === "1";
const TECNICAS = (process.env.OGA_TECNICA ?? "bien,mal,copas").split(",");

mkdirSync(SALIDA, { recursive: true });
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false, watch: null },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok: !!ok });
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? `  —  ${detalle}` : ""}`);
};

const leer = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    const s = o.estado();
    const p = o.pistaCorta();
    const m = p?.monte;
    return {
      ejercicio: p,
      pasado: m ? (s.position.x - m.x) * m.dx + (s.position.z - m.z) * m.dz : null,
      sobreLasCopas: m ? s.position.y - j.aircraft.gearHeight - m.cima : null,
      sobreElSuelo: s.position.y - j.terrain.sampleHeight(s.position.x, s.position.z) - j.aircraft.gearHeight,
      kt: o.velocidadDeCabina(),
      enElSuelo: s.onGround,
      percance: j.percance !== null,
      cualPercance: j.percance,
      tarjeta: o.tarjeta?.()?.dibujo ?? null,
      texto: document.querySelector(".senal")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
    };
  });

const medidos = {};
const pasos = {};
let codigo = 0;
try {
  for (const tecnica of TECNICAS) {
    const NOMBRE = `pista-corta-${tecnica}-${TRAMO}`;
    console.log(`\n${NOMBRE}`);
    const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: false });
    const page = await contexto.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(`${BASE}/?escenario=yvytu-rape&hora=10&tramo=${TRAMO}&avion=jaz-20&ejercicio=pista-corta`);
    await page.waitForFunction(() => globalThis.__oga?.estado?.() != null && globalThis.__oga.pistaCorta?.() != null, null, {
      timeout: 120000,
    });
    await pausa(2500);
    const foto = async (n) => {
      const ruta = `${SALIDA}/${NOMBRE}-${n}.png`;
      await page.screenshot({ path: ruta });
      console.log(`    foto: ${ruta}`);
    };
    const tarjeta = await page.evaluate(() => {
      const g = document.createElement("canvas").getContext("webgl");
      const i = g?.getExtension("WEBGL_debug_renderer_info");
      return i ? g.getParameter(i.UNMASKED_RENDERER_WEBGL) : "sin WebGL";
    });
    console.log(`    tarjeta: ${tarjeta}`);

    /*
     * **En la cabecera, quieto y en el eje**: el ejercicio empieza donde esté
     * el avión, y el banco lo pone a diez metros del principio de la pista
     * por la que se sale, que es lo que haría quien sale de una pista corta:
     * aprovecharla entera.
     */
    const inicio = await page.evaluate(() => {
      const o = globalThis.__oga;
      const j = o.juegoParaTrazas();
      const r = j.scenario.runway;
      const h = (r.heading * Math.PI) / 180;
      const dx = Math.sin(h);
      const dz = -Math.cos(h);
      const x = r.x - dx * (r.length / 2 - 10);
      const z = r.z - dz * (r.length / 2 - 10);
      o.colocar(x, o.cotaDePista(x, z) + j.aircraft.gearHeight, z, 0, h);
      return { largo: r.length, rumbo: r.heading, meteo: o.meteo() };
    });
    await pausa(800);
    let r = await leer(page);
    const e0 = r.ejercicio;
    comprobar(
      "el monte está a 120 m del final, con sus 15 m",
      e0 && e0.monte && e0.pasadaLaPista === 120 && e0.alto === 15,
      `pista ${Math.round(inicio.largo)} m al ${Math.round(inicio.rumbo)}°, viento ${inicio.meteo?.vientoKt ?? "?"} kt, ${inicio.meteo?.temp ?? "?"} °C; cima ${e0?.monte?.cima?.toFixed(1)} m; el avión a ${Math.round(-r.pasado)} m del final`,
    );
    /*
     * **Y la cabecera de enfrente, con el umbral desplazado** (H35d): el monte
     * queda en su aproximación todo el vuelo, y el campo la lleva como un
     * aeródromo de verdad, con la superficie del Anexo 14 por encima de las
     * copas. En la pista del escenario, en el fichero del aeródromo y tendido
     * en la hierba.
     */
    const enfrente = await page.evaluate(() => {
      const j = globalThis.__oga.juegoParaTrazas();
      const umbrales = j.scenario.aerodrome?.runways[0]?.thresholds ?? {};
      return {
        desplazado: j.scenario.runway.desplazado ?? 0,
        desplazadoEnfrente: j.scenario.runway.desplazadoEnfrente ?? 0,
        enElFichero: Object.fromEntries(Object.entries(umbrales).map(([n, u]) => [n, u?.displacedM ?? 0])),
        tendido: !!j.terrain.group.getObjectByName("umbral-desplazado"),
      };
    });
    comprobar(
      "la cabecera de enfrente lleva el umbral desplazado, tendido en la hierba",
      enfrente.desplazado === 0 && enfrente.desplazadoEnfrente > 150 && enfrente.tendido,
      `en uso ${enfrente.desplazado} m, enfrente ${enfrente.desplazadoEnfrente} m; fichero ${JSON.stringify(enfrente.enElFichero)}`,
    );
    comprobar("se presenta con el dibujo del freno", r.tarjeta === "freno", `«${r.texto.slice(0, 80)}»`);
    await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
    // **Cada tarjeta que se pide**, con su dibujo y su texto: entre dos lecturas caben varias.
    await page.evaluate(() => {
      const j = globalThis.__oga.juegoParaTrazas();
      const senal = j.hud.senal;
      const original = senal.mostrar.bind(senal);
      globalThis.__tarjetas = [];
      senal.mostrar = (dibujo, texto, letra, opciones = {}) => {
        original(dibujo, texto, letra, opciones);
        globalThis.__tarjetas.push(`${dibujo} «${(texto || "").slice(0, 70)}»`);
      };
    });
    await foto("01-cabecera");

    // **El piloto de la mesa**, en la página. Ver `pista-corta.test.ts`.
    await page.evaluate(
      async ({ tecnica }) => {
        const o = globalThis.__oga;
        const j = o.juegoParaTrazas();
        const { timonQueSostiene } = await import("/src/flight/fdm.ts");
        const { flapsDeDespegue } = await import("/src/flight/flaps.ts");
        const { indicatedAirspeed } = await import("/src/flight/atmosphere.ts");
        const a = j.aircraft;
        const KT = 0.514444;
        const flaps = flapsDeDespegue(a);
        const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        const dif = (x, y) => {
          let d = x - y;
          while (d > Math.PI) d -= 2 * Math.PI;
          while (d < -Math.PI) d += 2 * Math.PI;
          return d;
        };
        const rumbo = (j.scenario.runway.heading * Math.PI) / 180;
        let desde = null;
        let quiere = 0;
        let antes = null;
        let reloj = null;
        let integral = 0;
        globalThis.__perfil = [];
        o.pilotar((c) => {
          const s = o.estado();
          const ahora = o.reloj();
          const dt = reloj === null ? 1 / 60 : clamp(ahora - reloj, 1 / 240, 0.1);
          reloj = ahora;
          const p = o.pistaCorta();
          const m = p?.monte;
          // Sin redondear: la de la cabina va de nudo en nudo, y su derivada sería ruido.
          const indicada = indicatedAirspeed(s.airspeed, s.position.y, j.flight.aireDelDia()) / KT;
          c.flaps = flaps;
          c.throttle = 1;
          // **Por el eje**: en el suelo con el pedal y la rueda, como `verificar-emergencias.mjs`; en el aire, con el ala.
          const e = dif(rumbo, s.heading);
          const q = s.orientation;
          const ala = Math.asin(-2 * (q.x * q.y + q.w * q.z));
          c.rudder = s.onGround ? clamp(e * 4 + 3 * s.beta, -1, 1) : clamp(3 * s.beta, -1, 1);
          c.aileron = s.onGround ? clamp(e * 3, -1, 1) : clamp(3 * (clamp(1.5 * e, -0.3, 0.3) - ala) - 0.6 * s.rollRate, -1, 1);
          if (desde === null) desde = ahora;
          if (s.onGround) {
            // Frenos y motor a tope cuatro segundos con el avión quieto; luego, soltar.
            c.brakes = ahora - desde < 4 ? 1 : 0;
            c.elevator = indicada >= 51 ? 0.55 : 0;
            quiere = indicada;
            antes = indicada;
            return;
          }
          c.brakes = 0;
          const pasado = m ? (s.position.x - m.x) * m.dx + (s.position.z - m.z) * m.dz : 0;
          if (tecnica === "copas") {
            /*
             * **A seis metros del suelo y sin subir**: el morro que sostiene la
             * velocidad de ahora, más lo que pide la altura, menos lo que sube.
             */
            const alto = s.position.y - a.gearHeight - j.terrain.sampleHeight(s.position.x, s.position.z);
            /*
             * Con integral: el timón de la página lleva encima el compensador
             * de despegue del juego, morro arriba, y sin ella el avión se
             * quedaba a dieciséis metros, justo rozando la cima del monte.
             */
            integral = clamp(integral + (6 - alto) * 0.03 * dt, -0.6, 0.6);
            c.elevator = clamp(
              timonQueSostiene(a, Math.max(indicada, 50) * KT, flaps) + (6 - alto) * 0.05 + integral - s.verticalSpeed * 0.1 - s.pitchRate * 1.2,
              -1,
              1,
            );
            globalThis.__perfil.push({ pasado, kt: indicada, quiere: indicada, alto: s.position.y - a.gearHeight - (m?.cima ?? 0) });
            return;
          }
          const meta = tecnica === "bien" && pasado < p.pasadaLaPista ? p.velocidades.sobreElObstaculo : p.velocidades.vy;
          quiere += clamp(meta - quiere, -2 * dt, 2 * dt);
          const acelera = ((indicada - (antes ?? indicada)) * KT) / dt;
          antes = indicada;
          // Con una integral, que el timón de la página lleva el compensador del juego encima.
          integral = clamp(integral + (indicada - quiere) * KT * 0.02 * dt, -0.3, 0.3);
          c.elevator = clamp(
            timonQueSostiene(a, quiere * KT, flaps) + (indicada - quiere) * KT * 0.05 + integral + acelera * 0.3 - s.pitchRate * 1.2,
            -1,
            1,
          );
          globalThis.__perfil.push({ pasado, kt: indicada, quiere, alto: s.position.y - a.gearHeight - (m?.cima ?? 0) });
        });
      },
      { tecnica },
    );

    let soltar = false;
    let fotoMonte = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 240000) {
      r = await leer(page);
      if (!soltar && r.ejercicio?.fase === "frenos" && r.tarjeta === "freno" && /solt|let go|release/i.test(r.texto)) soltar = true;
      if (!fotoMonte && r.pasado !== null && r.pasado > -60 && !r.enElSuelo) {
        fotoMonte = true;
        await foto("02-el-monte");
      }
      if (r.ejercicio?.fase === "cerrada" || r.percance) break;
      await pausa(150);
    }
    // Con el percance, el vuelo se para: lo que haya cerrado el ejercicio, se lee en un momento.
    if (r.percance) {
      await pausa(1500);
      r = await leer(page);
      await foto("02b-el-percance");
    }
    const e = r.ejercicio;
    const perfil = await page.evaluate(() => globalThis.__perfil ?? []);
    const tarjetas = await page.evaluate(() => globalThis.__tarjetas ?? []);
    console.log(`    tarjetas: ${tarjetas.join(" | ")}`);
    soltar = soltar || tarjetas.some((x) => x.startsWith("freno") && /solt|release|let go/i.test(x));
    /*
     * **El ángulo, por su dibujo**: la tarjeta de la subida antes de pasar el
     * monte. Por el texto no vale en Tukã, donde lleva una palabra («Steady»)
     * y no la frase entera.
     */
    const pasoElMonte = tarjetas.findIndex((x) => x.startsWith("nariz-abajo"));
    const alAngulo = tarjetas.some((x, i) => x.startsWith("subida") && (pasoElMonte < 0 || i < pasoElMonte));
    if (tecnica === "bien") comprobar("bien volado se cuenta el ángulo sostenido", alAngulo);
    else if (tecnica === "mal") comprobar("mal volado no se cuenta el ángulo, que solo se cruzó acelerando", !alAngulo);
    const enLaFila = perfil.find((x) => x.pasado >= (e?.pasadaLaPista ?? 120));
    comprobar("pide soltar los frenos con el motor a tope", soltar);
    if (tecnica === "copas") {
      const ultimo = perfil[perfil.length - 1];
      comprobar(
        "por debajo de las copas, el árbol se toca: percance y otra vez",
        r.cualPercance === "arbol" && (e?.cierre ?? "otraVez") === "otraVez",
        `percance ${r.cualPercance}, cierre ${e?.cierre}; el último paso, ${ultimo ? `${ultimo.pasado.toFixed(0)} m pasado el final, ${ultimo.alto.toFixed(1)} m sobre la cima a ${ultimo.kt.toFixed(0)} kt` : "?"}`,
      );
    } else
      comprobar(
        "se cierra en el aire, con la Vy sostenida",
        e?.fase === "cerrada" && !r.percance,
        `cierre ${e?.cierre}, pasó ${e?.paso} con ${e?.margen?.toFixed(1)} m sobre las copas; al cruzar la fila ${enLaFila ? `${enLaFila.kt} kt` : "?"}`,
      );
    medidos[tecnica] = e?.margen ?? null;
    pasos[tecnica] = e?.paso ?? null;
    console.log(
      "    perfil: " +
        [-300, -150, 0, 60, 120, 240].map((d) => {
          const x = perfil.find((q) => q.pasado >= d);
          return x ? `${d} m: ${x.alto.toFixed(1)} sobre las copas a ${x.kt} kt` : `${d} m: —`;
        }).join(" · "),
    );
    await foto("03-cierre");
    comprobar("sin errores en la página", errores.length === 0, errores.slice(0, 2).join(" | "));
    await page.evaluate(() => globalThis.__oga.pilotar(null));
    await contexto.close();
  }
  if (medidos.bien != null && medidos.mal != null) {
    comprobar("bien volado se pasa con margen", medidos.bien >= 10, `${medidos.bien.toFixed(1)} m`);
    comprobar("bien volado se cuenta «con margen», y mal volado «justo»", pasos.bien === "conMargen" && pasos.mal === "justo", `${pasos.bien} · ${pasos.mal}`);
    comprobar(
      "y mal volado, a la Vy desde el principio, con mucho menos",
      medidos.mal < medidos.bien - 10,
      `${medidos.mal.toFixed(1)} m contra ${medidos.bien.toFixed(1)}`,
    );
  }
} catch (e) {
  console.error(e);
  codigo = 1;
} finally {
  await navegador.close();
  await server.close();
}
const mal = resultados.filter((x) => !x.ok).length;
console.log(`\n${resultados.length - mal}/${resultados.length} bien`);
process.exit(mal || codigo ? 1 : 0);

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
 * - **mal**: a la Vy desde que se va del suelo.
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
const TECNICAS = (process.env.OGA_TECNICA ?? "bien,mal").split(",");

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
      tarjeta: o.tarjeta?.()?.dibujo ?? null,
      texto: document.querySelector(".senal")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
    };
  });

const medidos = {};
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
          c.aileron = 0;
          c.rudder = 0;
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
    const e = r.ejercicio;
    const perfil = await page.evaluate(() => globalThis.__perfil ?? []);
    const tarjetas = await page.evaluate(() => globalThis.__tarjetas ?? []);
    console.log(`    tarjetas: ${tarjetas.join(" | ")}`);
    soltar = soltar || tarjetas.some((x) => x.startsWith("freno") && /solt|release|let go/i.test(x));
    const enLaFila = perfil.find((x) => x.pasado >= (e?.pasadaLaPista ?? 120));
    comprobar("pide soltar los frenos con el motor a tope", soltar);
    comprobar(
      "se cierra en el aire, con la Vy sostenida",
      e?.fase === "cerrada" && !r.percance,
      `cierre ${e?.cierre}, pasó ${e?.paso} con ${e?.margen?.toFixed(1)} m sobre las copas; al cruzar la fila ${enLaFila ? `${enLaFila.kt} kt` : "?"}`,
    );
    medidos[tecnica] = e?.margen ?? null;
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

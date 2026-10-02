/**
 * **El radar, en su sitio**: un avión a dos millas en cada una de las ocho
 * direcciones sale en su sitio en las pantallas de navegación.
 *
 * Dicho jugando, con capturas: el avión que se veía delante a la derecha salía
 * en la carta delante a la izquierda, y uno que adelantaba por debajo salía
 * detrás. La prueba de unidad —`ui/radar-en-su-sitio.test.ts`— mide la cuenta
 * del TCAS a la carta; esto mide **la costura**: que lo que el juego le pasa
 * al cuadro plano y al lienzo de la cabina sea eso mismo, en el avión de
 * verdad y con el rumbo de verdad. Con el reactor y con el turbohélice, que
 * son los que llevan TCAS y cada uno su cuadro.
 *
 * Los ocho se ponen con `intrusosDePrueba`: transpondedores sin dibujo ni
 * radio, para que la prueba no dependa de por dónde vuele hoy el tráfico.
 *
 * Y saca una foto de cada pantalla con los ocho puestos, para mirarla. Con
 * `OGA_GPU=1`, con la tarjeta de verdad (ver la memoria del proyecto: las de
 * SwiftShader no sirven para juzgar una imagen).
 *
 * Uso: `node scripts/verificar-radar.mjs [carpeta-de-fotos]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdir } from "node:fs/promises";
import { baseDe } from "./servidor.mjs";

const PUERTO = 5373;
const FOTOS = process.argv[2] ?? null;
const CON_GPU = process.env.OGA_GPU === "1";
const MILLA = 1852;
const PIE = 0.3048;
/** Las ocho direcciones, en grados desde el morro. */
const OCHO = [0, 45, 90, 135, 180, 225, 270, 315];
/** Con qué rumbos se vuela: el de la captura 115 y el de la final de la 125. */
const RUMBOS = [302, 179];
const AVIONES = ["jaz-90", "jaz-60"];

if (FOTOS) await mkdir(FOTOS, { recursive: true });
const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
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

/** Diferencia de dos ángulos en grados, entre −180 y 180. */
const diferencia = (a, b) => ((((a - b) % 360) + 540) % 360) - 180;
/** Marcación de una pieza de la carta, en grados desde arriba y a derechas. */
const marcacion = (dx, dy) => ((((Math.atan2(dx, -dy) * 180) / Math.PI) % 360) + 360) % 360;

/**
 * **Cada pieza con su avión**, emparejados por la distancia —cada uno de los
 * ocho va a una distinta, ver `millasDe`—, y su marcación a menos de 3°. Con
 * las ocho a la misma distancia una carta en espejo pasaría: las ocho
 * direcciones son simétricas y el espejo pone las ocho en las mismas ocho.
 */
function casanUnoAUno(piezas, reales) {
  if (piezas.length !== reales.length) return false;
  const p = [...piezas].sort((a, b) => Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy));
  const r = [...reales].sort((a, b) => a.distancia - b.distancia);
  return p.every(
    (x, i) => Math.abs(diferencia(marcacion(x.dx, x.dy), r[i].marcacion)) < 3,
  );
}

/** Cada uno de los ocho a una distancia distinta, millas. Ver `casanUnoAUno`. */
const millasDe = (i) => 2 + i * 0.5;

/** Una foto de la pantalla de navegación del cuadro plano, sola y de cerca. */
async function fotoDeLaCarta(page, ruta) {
  const caja = await page.evaluate(() => {
    const el = document.querySelector('[data-fondo="nd"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  if (caja && caja.width > 0) await page.screenshot({ path: ruta, clip: caja });
}

/** Si las marcaciones vistas son las ocho, cada una a menos de tres grados. */
function lasOcho(vistas) {
  if (vistas.length !== 8) return `${vistas.length} de 8`;
  // Con la vuelta del cero: 359 está a un grado de las doce.
  const mal = OCHO.filter((r) => !vistas.some((v) => Math.abs(diferencia(v, r)) <= 3));
  return mal.length ? `fuera de sitio: ${mal.join(", ")}` : null;
}

try {
  for (const avion of AVIONES) {
    // Con el doble de píxeles: la foto de la carta tiene que poder leerse.
    const page = await navegador.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
    });
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(
      `${BASE}/?escenario=tenerife-norte&hora=16&leccion=despegue&tramo=taguato&avion=${avion}&meteo=`,
    );
    await page.waitForFunction(() => !!globalThis.__oga?.estado, null, { timeout: 120000 });
    await page.waitForTimeout(4000);
    const gpu = await page.evaluate(() => {
      const gl = globalThis.__oga.pintor().getContext();
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "?";
    });
    /*
     * **En el puesto, el TCAS en espera, y la carta lo dice.** Las capturas
     * 107 a 109 eran una carta vacía rodando, con aviones en el cielo: lo real
     * es el equipo en espera, y lo que faltaba era que se leyera.
     */
    const enElPuesto = await page.evaluate(() => {
      const o = globalThis.__oga;
      const el = document.querySelector('[data-carta="solo-ta"]');
      return {
        fase: o.fase(),
        modo: o.tcas().modo,
        escrito: el?.getAttribute("visibility") === "visible" ? el.textContent : null,
      };
    });
    comprobar(
      `${avion}: en el puesto, «TCAS STBY» en la carta`,
      enElPuesto.modo === "TCAS STBY" && enElPuesto.escrito === "TCAS STBY",
      `fase ${enElPuesto.fase} · modo ${enElPuesto.modo} · escrito ${enElPuesto.escrito}`,
    );
    if (FOTOS) await fotoDeLaCarta(page, `${FOTOS}/${avion}-en-el-puesto-carta.png`);
    for (const rumbo of RUMBOS) {
      /*
       * Al aire, al noroeste del campo y lejos de su circuito, a 14 000 ft:
       * sin pista en la carta, que se queda en su rango de diez millas, y sin
       * tráfico del campo cerca que se mezcle con los ocho.
       */
      const colocar = ([r, pie]) => {
        const o = globalThis.__oga;
        const p = o.pista();
        o.colocar(p.x - 30000, 14000 * pie, p.z - 30000, 100, (r * Math.PI) / 180);
      };
      await page.evaluate(colocar, [rumbo, PIE]);
      await page.evaluate(
        ([r, ocho, distancias, pie]) => {
          const o = globalThis.__oga;
          const p = o.pista();
          const x = p.x - 30000;
          const z = p.z - 30000;
          o.intrusosDePrueba(
            ocho.map((rel, i) => {
              const a = ((r + rel) * Math.PI) / 180;
              return {
                id: `prueba:${rel}`,
                x: x + Math.sin(a) * distancias[i],
                y: 14500 * pie,
                z: z - Math.cos(a) * distancias[i],
              };
            }),
          );
        },
        [rumbo, OCHO, OCHO.map((_, i) => millasDe(i) * MILLA), PIE],
      );
      // Dos ciclos del TCAS y un repintado.
      await page.waitForTimeout(3000);
      /*
       * Y se vuelve a poner donde estaba: mientras tanto ha seguido volando y
       * girando un poco, sin nadie a los mandos. Así las ocho caen justo en
       * las horas del reloj, y lo que se compara es la carta con el morro.
       */
      await page.evaluate(colocar, [rumbo, PIE]);
      await page.waitForTimeout(300);
      const plano = await page.evaluate(() => {
        const o = globalThis.__oga;
        const s = o.estado();
        const tcas = o.tcas();
        const piezas = [...document.querySelectorAll('[data-carta^="otro-"]')]
          .filter((el) => el.getAttribute("visibility") === "visible")
          .map((el) => {
            const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(el.getAttribute("transform") ?? "");
            return m ? { dx: Number(m[1]), dy: Number(m[2]) } : null;
          })
          .filter(Boolean);
        // Y dónde está cada uno de verdad, visto desde el morro de ahora.
        const reales = tcas.enPantalla
          .filter((b) => b.id.startsWith("prueba:"))
          .map((b) => {
            let m = (Math.atan2(b.x - s.position.x, -(b.z - s.position.z)) * 180) / Math.PI;
            m -= (s.heading * 180) / Math.PI;
            return {
              marcacion: ((m % 360) + 360) % 360,
              distancia: Math.hypot(b.x - s.position.x, b.z - s.position.z),
            };
          });
        return { piezas, reales, modo: tcas.modo };
      });
      const vistas = plano.piezas.map((p) => marcacion(p.dx, p.dy));
      // Cada pieza en la marcación de verdad de uno de los ocho, y cada uno
      // de los ocho con su pieza: uno a uno, a menos de tres grados.
      const casan = casanUnoAUno(plano.piezas, plano.reales);
      comprobar(
        `${avion} al ${rumbo}: los ocho, en su sitio en el cuadro plano`,
        plano.piezas.length === 8 && casan,
        `${plano.piezas.length} piezas · ${vistas.map((v) => Math.round(v)).join(" ")} · modo ${plano.modo}`,
      );
      if (FOTOS) {
        await page.screenshot({ path: `${FOTOS}/${avion}-${rumbo}-cuadro.png` });
        await fotoDeLaCarta(page, `${FOTOS}/${avion}-${rumbo}-carta.png`);
      }
      /*
       * **Y en el lienzo de la cabina**, si el avión la lleva: desde dentro,
       * con su pantalla de navegación pintada.
       */
      const hayCabina = await page.evaluate(() => !!globalThis.__oga.pantallas());
      if (hayCabina) {
        await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
        await page.waitForTimeout(1200);
        await page.evaluate(colocar, [rumbo, PIE]);
        await page.waitForTimeout(300);
        const cabina = await page.evaluate(() => {
          const o = globalThis.__oga;
          const s = o.estado();
          const carta = o.cartaDeCabina();
          const reales = o
            .tcas()
            .enPantalla.filter((b) => b.id.startsWith("prueba:"))
            .map((b) => {
              let m = (Math.atan2(b.x - s.position.x, -(b.z - s.position.z)) * 180) / Math.PI;
              m -= (s.heading * 180) / Math.PI;
              return {
                marcacion: ((m % 360) + 360) % 360,
                distancia: Math.hypot(b.x - s.position.x, b.z - s.position.z),
              };
            });
          return { otros: carta?.otros ?? [], reales };
        });
        const deCabina = cabina.otros.map((p) => marcacion(p.dx, p.dy));
        const casanEnCabina = casanUnoAUno(cabina.otros, cabina.reales);
        comprobar(
          `${avion} al ${rumbo}: los ocho, en su sitio en la pantalla de la cabina`,
          deCabina.length === 8 && casanEnCabina,
          `${deCabina.length} en el lienzo · ${deCabina.map((v) => Math.round(v)).join(" ")}`,
        );
        if (FOTOS)
          await page.screenshot({ path: `${FOTOS}/${avion}-${rumbo}-cabina.png` });
        await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
      }
      const malEnLasOcho = lasOcho(vistas);
      comprobar(
        `${avion} al ${rumbo}: y las ocho marcaciones son las del reloj`,
        malEnLasOcho === null,
        malEnLasOcho ?? "0, 45, 90 … 315",
      );
    }
    await page.evaluate(() => globalThis.__oga.intrusosDePrueba(null));
    /*
     * **Y a veinticuatro mil pies no se oye el campo de salida** (la 132): ni
     * su tráfico pidiendo rodar ni su torre hablándole a otro. Se vuela un
     * rato largo —el reloj corrido— lejos y alto, y se cuenta lo que dijo la
     * frecuencia del campo. Ver `flight/dependencia.ts`.
     */
    if (avion === AVIONES[0]) {
      /*
       * Con el pack de voz bajado, que baja tras el primer gesto: sin él la
       * radio no pasa por la boca y lo que se cuenta aquí —lo que sonó— no
       * vería nada aunque sonara. Ver el clic de `verificar-vuelo-entero.mjs`.
       */
      await page.mouse.click(640, 200);
      await page
        .waitForFunction(() => (globalThis.__oga?.voz?.().piezas ?? 0) > 0, null, { timeout: 60000 })
        .catch(() => {});
      const lejos = await page.evaluate(async (pie) => {
        const o = globalThis.__oga;
        const p = o.pista();
        o.colocar(p.x - 40000, 24000 * pie, p.z - 20000, 120, (300 * Math.PI) / 180);
        o.acelerar?.(8);
        const antes = o.habladasTotal();
        await new Promise((r) => setTimeout(r, 25000));
        const total = o.habladasTotal();
        const nuevas = o.habladas().slice(-(total - antes));
        o.acelerar?.(1);
        return {
          dependencia: o.dependencia(),
          habladas: total - antes,
          deLosDemas: nuevas.filter((h) => /\s(?:otro|torre)\.[^@]*@fonetico\.(?:echo|zulu)/.test(h) && !/zulu-fonetico\.papa-fonetico\.alfa-fonetico\.romeo/.test(h)),
          reloj: o.reloj(),
        };
      }, PIE);
      comprobar(
        `${avion} a 24 000 ft: la frecuencia del campo de salida no se oye`,
        lejos.deLosDemas.length === 0 && /salida|control/.test(lejos.dependencia ?? ""),
        `con ${lejos.dependencia} · ${lejos.habladas} frases en la boca · ${lejos.deLosDemas.length ? lejos.deLosDemas.join(" | ") : "ni una llamada de otro"}`,
      );
    }
    comprobar(`${avion}: sin errores en la consola`, errores.length === 0, errores.join(" | ") || "ninguno");
    console.log(`  ${avion} · ${gpu}`);
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

let bien = 0;
for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
  if (r.ok) bien++;
}
console.log(`\n  ${bien} de ${resultados.length} comprobaciones`);
process.exit(bien === resultados.length ? 0 : 1);

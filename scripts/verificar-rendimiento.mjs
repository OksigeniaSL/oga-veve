/**
 * El banco de rendimiento: cuánto cuesta cada escenario, y en qué máquina.
 *
 * `AGENTS.md` dice «antes de añadir un efecto visual, se mide», y hasta hoy no
 * había con qué: había un contador de fotogramas en pantalla —que ya es
 * algo— y ninguna manera de contestar la única pregunta que importa, que es
 * **si esto va en la tablet del aula**.
 *
 * ## Sin tablet, y midiendo de verdad
 *
 * No hace falta el aparato para poner un suelo: Chrome sabe **estrangular su
 * propia CPU** por un factor, y eso es exactamente lo que separa un portátil
 * de una tablet barata. Cuatro veces más lento es una tablet Android de gama
 * media de hace tres años; seis, una vieja. Así que se mide aquí a uno, a
 * cuatro y a seis, y lo que se exige es que a **cuatro** el juego siga por
 * encima de treinta fotogramas.
 *
 * No sustituye a probarlo en el aparato, y conviene saber por dónde falla:
 *
 * - **La GPU no se estrangula.** En una tablet, muchas veces lo que se atasca
 *   es el relleno de píxeles y no el cálculo.
 * - **Y aquí se dibuja por software** —SwiftShader—, porque esto corre sin
 *   pantalla. O sea que el reparto entre CPU y GPU no es el de un aparato de
 *   verdad; a cambio, todo el coste cae en la CPU, que es lo que este banco
 *   sabe estrangular, y el número que sale es **conservador**.
 *
 * Con esos dos avisos, convierte «va bien» en un número que se puede defender
 * y que salta cuando alguien mete un efecto caro.
 *
 * ## Qué mide
 *
 * - **Tiempo de cuadro**, en mediana y en percentil noventa y cinco. La
 *   mediana dice cómo va; el p95 dice si da tirones, que es lo que de verdad
 *   se nota.
 * - **Llamadas de dibujo y triángulos**, que dicen *por dónde* se va el
 *   tiempo: demasiadas cosas o cosas demasiado gordas son arreglos distintos.
 *
 * Uso: `node scripts/verificar-rendimiento.mjs [escenario…]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const PUERTO = 5281;
const ESCENARIOS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["yvytu-rape", "pettirossi", "tenerife-norte"];

/** Cuánto se estrangula la CPU, y qué aparato es cada cosa. */
const APRIETES = [
  { veces: 1, nombre: "esta máquina" },
  { veces: 4, nombre: "tablet de gama media" },
  { veces: 6, nombre: "tablet vieja" },
];

/** Lo que se exige a cuatro veces: treinta fotogramas por segundo. */
const CUADRO_MAXIMO = 33.3;

/** Cuánto se mide en cada sitio, ms. */
const MIDE = 4000;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  /*
   * **Sin techo de sesenta**, que si no se mide el techo y no el juego.
   *
   * Con la sincronía vertical puesta, el navegador espera al monitor y todos
   * los cuadros salen a 16,7 ms exactos aunque el trabajo de cada uno sean
   * dos milisegundos: el banco decía «sesenta» hasta con la CPU estrangulada
   * seis veces, que es tanto como no medir. Quitándola, el intervalo entre
   * cuadros vuelve a ser lo que cuesta hacerlos.
   */
  args: [
    "--use-gl=angle",
    "--use-angle=gl",
    "--enable-unsafe-swiftshader",
    "--disable-gpu-vsync",
    "--disable-frame-rate-limit",
  ],
});

const filas = [];

for (const escenario of ESCENARIOS) {
  const page = await navegador.newPage({
    viewport: { width: 1280, height: 720 },
  });
  await page.addInitScript(() => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
  });
  const cdp = await page.context().newCDPSession(page);
  await page.goto(
    `http://localhost:${PUERTO}/?escenario=${escenario}&leccion=despegue&tramo=guyrami`,
  );
  await page.waitForFunction(() => !!globalThis.__oga?.estado, null, {
    timeout: 60000,
  });
  await page.waitForTimeout(14000);

  for (const sitio of ["puesto", "aire"]) {
    if (sitio === "aire") {
      // Sobre el aeródromo y a la altura del circuito, que es donde se ve
      // todo a la vez: el aeropuerto, el pueblo y el monte.
      await page.evaluate(() => {
        const o = globalThis.__oga;
        const r = o.pista();
        o.colocar(r.x, o.suelo(r.x, r.z) + 250, r.z, 30);
      });
      await page.waitForTimeout(1500);
    }
    for (const { veces, nombre } of APRIETES) {
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: veces });
      // Un respiro para que se estabilice antes de contar.
      await page.waitForTimeout(1200);
      const medida = await page.evaluate(async (ms) => {
        const tiempos = [];
        await new Promise((listo) => {
          let previo = performance.now();
          const fin = previo + ms;
          const paso = (t) => {
            tiempos.push(t - previo);
            previo = t;
            if (t < fin) requestAnimationFrame(paso);
            else listo();
          };
          requestAnimationFrame(paso);
        });
        tiempos.sort((a, b) => a - b);
        const en = (p) => tiempos[Math.floor(tiempos.length * p)] ?? 0;
        return {
          mediana: en(0.5),
          p95: en(0.95),
          cuadros: tiempos.length,
          ...globalThis.__oga.coste(),
        };
      }, MIDE);
      filas.push({ escenario, sitio, veces, nombre, ...medida });
    }
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  }
  await page.close();
}

await navegador.close();
await server.close();

// ── El informe ────────────────────────────────────────────────────────────

console.log("\n  rendimiento · 1280×720\n");
let fallos = 0;
for (const f of filas) {
  const fps = f.mediana > 0 ? 1000 / f.mediana : 0;
  const exige = f.veces === 4;
  const bien = !exige || f.mediana <= CUADRO_MAXIMO;
  if (!bien) fallos++;
  console.log(
    `  ${bien ? "✓" : "✗"} ${f.escenario.padEnd(15)} ${f.sitio.padEnd(7)} ` +
      `×${f.veces} ${String(Math.round(fps)).padStart(3)} fps · ` +
      `mediana ${f.mediana.toFixed(1)} ms · p95 ${f.p95.toFixed(1)} ms · ` +
      `${f.llamadas} dibujos · ${(f.triangulos / 1000).toFixed(0)}k △` +
      (exige ? `  ← ${f.nombre}` : ""),
  );
}
console.log(
  `\n  Se exige a ×4 (tablet de gama media): mediana ≤ ${CUADRO_MAXIMO} ms.` +
    `  ${fallos ? `${fallos} por encima` : "todo dentro"}\n`,
);
process.exit(fallos ? 1 : 0);

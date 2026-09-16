/**
 * El panel de la cabina **visto desde el asiento**, que es lo único que cuenta.
 *
 * Existe por una frase corta: «tú me estás vacilando», dicha con cinco
 * capturas de las seis cabinas delante. Y llevaba razón dos veces. Primero,
 * porque el rediseño se había hecho en el cuadro del HUD, que solo sale en el
 * peldaño de arriba, mientras lo que se ve volando en Guyrami es **esto**.
 * Y segundo, porque en esas capturas se veía lo que ningún banco decía:
 * pantallas cortadas por el borde, una segunda brújula asomando del puesto del
 * copiloto, y todo el grupo escorado con medio panel en negro.
 *
 * `verificar-cabina.mjs` ya medía la cabina **en metros** —que el reloj esté a
 * tantos centímetros del asiento— y daba verde. No se contradecían: un panel
 * puede estar perfecto en metros y salir escorado en pantalla, porque lo que
 * decide es dónde está el ojo. Así que esto mide **en píxeles de pantalla**,
 * con la sonda `enPantalla`, y comprueba lo que se ve:
 *
 * 1. Que las pantallas del piloto se vean **enteras**, sin que las corte el
 *    borde de la pantalla.
 * 2. Que el grupo esté **centrado** en la vista: lo que sobra a un lado tiene
 *    que ser lo que sobra al otro.
 * 3. Que **no se pisen** entre ellas.
 * 4. Y que no haya dos brújulas: una sola referencia de rumbo por avión.
 *
 * Uso: `node scripts/verificar-panel.mjs [carpeta-de-fotos]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const FOTOS = process.argv[2] ?? "";
const PUERTO = 5301;
const FLOTA = ["jaz-20", "jaz-25", "jaz-40", "jaz-60", "jaz-90", "jaz-120"];

if (FOTOS) mkdirSync(FOTOS, { recursive: true });

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

for (const id of FLOTA) {
  const page = await navegador.newPage({
    viewport: { width: 1280, height: 720 },
  });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.addInitScript(() => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
  });
  await page.goto(
    `http://localhost:${PUERTO}/?escenario=tenerife-sur&leccion=despegue&tramo=guyrami&avion=${id}`,
  );
  await page
    .waitForFunction(
      () => globalThis.__oga?.aeronave?.().deVerdad === true,
      null,
      { timeout: 60000 },
    )
    .catch(() => {});
  await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
  await page.waitForTimeout(1200);

  const visto = await page.evaluate(() => {
    const o = globalThis.__oga;
    /*
     * Solo lo que se enciende: las pantallas y los relojes. El panel, la
     * visera y los montantes también caen en pantalla, pero de ellos no se
     * espera que estén centrados — lo que se lee son los instrumentos.
     */
    const { ancho, alto, piezas } = o.enPantalla("^(pantalla|reloj)");
    return { ancho, alto, piezas, vista: o.vista() };
  });

  const etiqueta = (que) => `${id}: ${que}`;
  const dentro = visto.piezas.filter((p) => !p.detras);

  comprobar(
    etiqueta("se está mirando desde el asiento"),
    visto.vista === "cockpit",
    visto.vista,
    "medido desde fuera, todo esto no dice nada",
  );

  comprobar(
    etiqueta("hay instrumentos encendidos delante"),
    dentro.length > 0,
    `${dentro.length} piezas`,
    "una cabina sin instrumentos es una burbuja",
  );

  if (dentro.length) {
    /*
     * **Que se vean enteros.** Una pantalla cortada por el borde no es un
     * detalle estético: es un instrumento que no se puede leer, y en las
     * capturas había dos por avión.
     */
    const cortadas = dentro.filter(
      (p) => p.x0 < 0 || p.x1 > visto.ancho || p.y0 < 0 || p.y1 > visto.alto,
    );
    comprobar(
      etiqueta("ninguna pantalla la corta el borde"),
      cortadas.length === 0,
      cortadas.length
        ? cortadas
            .map((p) => `${p.nombre} [${p.x0.toFixed(0)}…${p.x1.toFixed(0)}]`)
            .join(" · ")
        : `${dentro.length} enteras`,
      "un instrumento que no se ve entero no es un instrumento",
    );

    const izq = Math.min(...dentro.map((p) => p.x0));
    const der = Math.max(...dentro.map((p) => p.x1));
    const sobraIzq = izq;
    const sobraDer = visto.ancho - der;
    comprobar(
      etiqueta("el grupo está centrado en la vista"),
      Math.abs(sobraIzq - sobraDer) <= visto.ancho * 0.06,
      `sobran ${sobraIzq.toFixed(0)} px por la izquierda y ${sobraDer.toFixed(0)} por la derecha`,
      "«esto no está centrado ni aunque venga Cristo y me lo diga»",
    );

    // Y que no se monten unas encima de otras.
    const ordenadas = [...dentro].sort((a, b) => a.x0 - b.x0);
    let pisadas = 0;
    for (let i = 1; i < ordenadas.length; i++) {
      const a = ordenadas[i - 1];
      const b = ordenadas[i];
      const solapaX = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const solapaY = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (solapaX > 4 && solapaY > 4) pisadas += 1;
    }
    comprobar(
      etiqueta("y no se pisan entre ellas"),
      pisadas === 0,
      pisadas ? `${pisadas} solapes` : "ninguna",
      "",
    );
  }

  comprobar(
    etiqueta("sin errores"),
    !errores.length,
    errores[0] ?? "limpio",
    "",
  );

  if (FOTOS) await page.screenshot({ path: join(FOTOS, `${id}.png`) });
  await page.close();
}

console.log("");
for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
  if (!r.ok && r.porque) console.log(`      ${r.porque}`);
}
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones\n`);

await navegador.close();
await server.close();
process.exit(bien === resultados.length ? 0 : 1);

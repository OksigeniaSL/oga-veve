/**
 * Que los carteles del vuelo no se pisen unos a otros.
 *
 * El HUD de este juego tiene dos cosas que dicen qué hacer y las dos viven
 * abajo y en el medio, que es donde ya mira quien pilota:
 *
 * - **la señal**, que es la orden —«arrancá el motor», «frená», «salí de la
 *   pista»— y cuando se puede tocar lleva un borde ocre que late;
 * - **el tutor**, que es la explicación con su barra —«esperá a que corra».
 *
 * Las dos son `position: fixed`, las dos van centradas abajo y las dos tenían
 * el mismo `z-index`, así que **con las dos puestas a la vez se solapaban**:
 * el filo naranja de la de atrás asomando por un lado de la de delante. Se vio
 * jugando, en una foto: «aquí hay solapes de carteles».
 *
 * Esto no se caza con una prueba unitaria —hace falta CSS de verdad, y el
 * tamaño de cada tarjeta depende de lo que lleve escrito— ni se caza fácil
 * jugando, porque las dos coinciden solo en unos segundos concretos. Así que
 * aquí se **fuerzan las dos a la vez**, con el texto más largo que pueden
 * llevar, y se mide si se tocan. En cuatro tamaños de pantalla, que es donde
 * la cuenta de porcentajes cambia.
 *
 * Uso: `node scripts/verificar-carteles.mjs`
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const PUERTO = 5291;
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

/**
 * Los tamaños donde esto puede romperse.
 *
 * El sitio de las dos tarjetas se calcula en porcentaje de la altura —8 % y
 * 9 %— más lo que ocupe el cuadro de mandos, así que en una pantalla baja los
 * dos porcentajes valen casi lo mismo y en una alta se separan. Van una tablet
 * de pie, una apaisada, un móvil estrecho y un portátil.
 */
const PANTALLAS = [
  [565, 641],
  [900, 600],
  [400, 780],
  [1280, 800],
];

for (const [ancho, alto] of PANTALLAS) {
  const page = await navegador.newPage({
    viewport: { width: ancho, height: alto },
  });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.addInitScript(() => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
  });
  await page.goto(
    `http://localhost:${PUERTO}/?escenario=la-palma&leccion=despegue&tramo=taguato&avion=jaz-90`,
  );
  await page
    .waitForFunction(() => globalThis.__oga?.estado?.(), null, {
      timeout: 60000,
    })
    .catch(() => {});
  await page.waitForTimeout(1200);

  const visto = await page.evaluate(() => {
    const senal = document.querySelector('[data-hud="senal"]');
    const tutor = document.querySelector('[data-hud="tutor"]');
    if (!senal || !tutor) return null;
    /*
     * Las dos puestas y con lo más largo que pueden llevar. La señal ya está
     * puesta al arrancar —«arrancá el motor», que además es la pulsable, la
     * del borde ocre—, así que solo hay que sacar el tutor.
     */
    tutor.hidden = false;
    const texto = tutor.querySelector('[data-hud="tutor-text"]');
    if (texto)
      texto.textContent = "Empujá el motor a tope y esperá a que corra";
    const a = senal.getBoundingClientRect();
    const b = tutor.getBoundingClientRect();
    const solape =
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 &&
      Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0;
    return {
      solape,
      hueco: Math.round(a.top - b.bottom),
      senal: [Math.round(a.top), Math.round(a.bottom)],
      tutor: [Math.round(b.top), Math.round(b.bottom)],
      clase: senal.className,
      // Y que ninguna se salga de la pantalla por arriba o por abajo.
      fuera: b.top < 0 || a.bottom > window.innerHeight,
    };
  });

  const donde = `${ancho}×${alto}`;
  if (!visto) {
    comprobar(`${donde}: están las dos tarjetas`, false, "no se encontraron");
    await page.close();
    continue;
  }

  comprobar(
    `${donde}: la señal y el tutor no se pisan`,
    !visto.solape,
    `señal ${visto.senal.join("–")} · tutor ${visto.tutor.join("–")} · ${visto.hueco} px de hueco`,
    "las dos son fijas, centradas abajo y del mismo z-index: sin reservarse sitio se apilan",
  );

  comprobar(
    `${donde}: las dos caben en la pantalla`,
    !visto.fuera,
    visto.fuera ? "alguna se sale" : "dentro",
    "subir una encima de la otra no vale si la de arriba se va por el borde",
  );

  comprobar(
    `${donde}: sin errores`,
    !errores.length,
    errores[0] ?? "limpio",
    "",
  );
  await page.close();
}

for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
  if (!r.ok && r.porque) console.log(`      ${r.porque}`);
}
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones`);

await navegador.close();
await server.close();
process.exit(bien === resultados.length ? 0 : 1);

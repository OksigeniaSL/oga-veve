/**
 * Que cada avión lleve puestos los colores de su ficha.
 *
 * El color de un avión vive en `src/flight/aircraft.ts` y de ahí lo sacan las
 * cajas del respaldo, los retratos del hangar y la ficha de «¿Con qué volás?».
 * Un modelo de verdad trae los suyos dentro del `.glb`, así que el cargador lo
 * repinta al abrirlo —`pintarDeLaFlota`— y así no hay dos verdades.
 *
 * Esto lo comprueba **en la pista**, sobre el material que el navegador va a
 * pintar de verdad, no sobre la tabla. Hacía falta porque el fallo anterior no
 * se veía en ninguna tabla: los colores del guion de Blender estaban escritos
 * en sRGB y un glTF los guarda en lineal, así que el Mainumby salía
 * descolorido —el capó terracota llegaba como un salmón `#DD906F` y el verde
 * oscuro de los detalles como un gris `#7C8179`— y las dos tablas, la del
 * guion y la de la ficha, seguían diciendo cada una lo suyo tan tranquilas.
 *
 * Uso: `node scripts/verificar-librea.mjs`
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const PUERTO = 5298;
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

/** Los que tienen modelo de verdad hecho aquí, con las ranuras de la casa. */
const NUESTROS = ["jaz-25"];
/** Y uno traído de fuera, que no se toca. */
const DE_FUERA = "jaz-20";

for (const id of [...NUESTROS, DE_FUERA]) {
  const page = await navegador.newPage({
    viewport: { width: 900, height: 560 },
  });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.addInitScript(() => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
  });
  await page.goto(
    `http://localhost:${PUERTO}/?escenario=tenerife-norte&leccion=despegue&tramo=guyrami&avion=${id}`,
  );
  /*
   * **Y hay que esperar a que el modelo entre.**
   *
   * El juego arranca con las cajas de la fábrica y cambia al `.glb` cuando
   * termina de bajarlo, así que preguntar nada más cargar es preguntarle a las
   * cajas: la primera versión de esta sonda daba «cajas de respaldo» para un
   * avión que sí tiene modelo. Se espera a `deVerdad`, y si no llega se sigue
   * igual — eso es justo lo que esta sonda tiene que poder decir.
   */
  await page
    .waitForFunction(
      () => globalThis.__oga?.aeronave?.().deVerdad === true,
      null,
      {
        timeout: 45000,
      },
    )
    .catch(() => {});

  const visto = await page.evaluate(() => {
    const o = globalThis.__oga;
    const colores = {};
    o.aeronave().grupo.traverse((n) => {
      const ms = Array.isArray(n.material)
        ? n.material
        : n.material
          ? [n.material]
          : [];
      for (const m of ms)
        if (m.color && m.name) colores[m.name] = "#" + m.color.getHexString();
    });
    return { colores, avion: o.avion(), deVerdad: !!o.aeronave().deVerdad };
  });

  comprobar(
    `${id}: el modelo de verdad está puesto`,
    visto.deVerdad,
    visto.deVerdad ? "modelo glTF" : "cajas de respaldo",
    "sin modelo esto no mide nada",
  );

  if (id === DE_FUERA) {
    /*
     * Al de fuera no se le toca: trae treinta materiales con nombres suyos
     * —`fuselarge`, `ruder_petal`— y ninguno coincide con las ranuras de la
     * casa, así que conserva su librea. Se comprueba que sigue siendo así,
     * que es lo que dice `CREDITOS.md` de él.
     */
    comprobar(
      `${id}: conserva la librea con la que vino`,
      Object.keys(visto.colores).length > 5 && !visto.colores.casco,
      `${Object.keys(visto.colores).length} materiales, ninguno de la casa`,
      "repintar un modelo ajeno sería inventarle una librea que no es suya",
    );
    await page.close();
    continue;
  }

  const hex = (n) => "#" + n.toString(16).padStart(6, "0");
  for (const [ranura, esperado] of [
    ["casco", hex(visto.avion.librea.casco)],
    ["capo", hex(visto.avion.librea.capo)],
    ["detalle", hex(visto.avion.librea.detalle)],
  ]) {
    comprobar(
      `${id}: el ${ranura} lleva el color de su ficha`,
      visto.colores[ranura] === esperado,
      `${visto.colores[ranura] ?? "sin material"} · ficha ${esperado}`,
      "el .glb traía los suyos y salían descoloridos",
    );
  }
  comprobar(
    `${id}: la goma de las ruedas es oscura`,
    visto.colores.goma && luminancia(visto.colores.goma) < 0.05,
    `${visto.colores.goma} · luz ${luminancia(visto.colores.goma ?? "#ffffff").toFixed(3)}`,
    "en lineal el negro se levantaba hasta gris medio",
  );
  comprobar(
    `${id}: ningún material quedó sin repintar`,
    !errores.length,
    errores.length ? errores[0] : "sin errores en consola",
    "",
  );
  await page.close();
}

function luminancia(css) {
  const n = parseInt(css.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
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

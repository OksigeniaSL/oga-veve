/**
 * El freno: que esté donde toca, que se vea pisado, y que **pare el avión**.
 *
 * Esto era una sonda que imprimía tres números y salía con cero pasara lo que
 * pasara, y los tres números estaban mal:
 *
 * - Buscaba `.freno` en Guyrami, donde esa tarjeta **no existe a propósito**:
 *   en los peldaños de dibujos el freno es un botón, no una tecla dibujada con
 *   su letra. Salía cero y nadie se enteraba de que estaba mirando el elemento
 *   equivocado.
 * - Medía si el avión se había parado leyendo `[data-hud="home-distance"]`,
 *   que no existe: `null === null` es «PARADO» pase lo que pase.
 * - Y nunca arrancaba el motor, así que el avión no se movía de todos modos.
 *
 * Ahora mide el avión, no la pantalla, para lo que importa: **cuánto recorre
 * con el freno pisado**. Y de paso comprueba lo contrario, que es tan
 * importante y no se miraba: que al soltarlo vuelva a rodar. Un freno que se
 * queda pegado es peor que no tener freno.
 *
 * Uso: `node scripts/verificar-frenos.mjs`
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const PUERTO = 5197;
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

/*
 * ── Dónde sale el freno, y de qué forma ───────────────────────────────────
 *
 * Los dos peldaños lo enseñan de dos maneras: con dibujos es un botón grande
 * de tocar, y con cifras es una tarjeta con su tecla escrita.
 *
 * **Y depende del aparato, no solo del peldaño.** En un teclado son
 * excluyentes —«nunca los dos», dice el HUD— pero en una tablet el peldaño de
 * cifras enseña los dos a la vez, y tiene que ser así: la tarjeta dice qué
 * tecla es y el botón es lo único que se puede tocar. La primera versión de
 * esta comprobación daba por buena la regla del teclado en una página táctil
 * y cantaba un fallo donde no lo hay.
 */
for (const [tramo, tactil, boton, tarjeta] of [
  ["guyrami", false, true, false],
  ["guyrami", true, true, false],
  ["taguato", false, false, true],
  ["taguato", true, true, true],
]) {
  const page = await navegador.newPage({
    viewport: { width: 1280, height: 800 },
    hasTouch: tactil,
    isMobile: tactil,
  });
  await page.addInitScript(() => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
  });
  await page.goto(
    `http://localhost:${PUERTO}/?escenario=valle-cordillera&leccion=despegue&tramo=${tramo}`,
  );
  await page.waitForFunction(() => globalThis.__oga?.estado, null, {
    timeout: 60000,
  });
  await page.waitForTimeout(2500);
  const visto = {
    boton:
      (await page.locator('[data-hud="brakes-touch"]:not([hidden])').count()) >
      0,
    tarjeta:
      (await page.locator('[data-hud="brakes"]:not([hidden])').count()) > 0,
  };
  comprobar(
    `${tramo}${tactil ? " en tablet" : " con teclado"}: sale el freno que le toca`,
    visto.boton === boton && visto.tarjeta === tarjeta,
    `botón ${visto.boton ? "sí" : "no"} · tarjeta ${visto.tarjeta ? "sí" : "no"} · se esperaba ${boton ? "botón" : "sin botón"} y ${tarjeta ? "tarjeta" : "sin tarjeta"}`,
    "buscaba la tarjeta en el peldaño donde el freno es un botón",
  );
  await page.close();
}

// ── Y que frene ───────────────────────────────────────────────────────────
/*
 * **Y cuánto puede recorrer frenando, que es lo que de verdad lo mide.**
 *
 * Pedir solo «que se pare» no comprueba el freno: con el gas fuera el avión
 * se para solo por rozamiento, y la comprobación seguía en verde con la fuerza
 * de frenado puesta a cero. Medido desde ocho metros por segundo, quitándola
 * de los dos modelos:
 *
 *                  con freno   sin freno
 *   Guyrami           2,6 m      12,6 m
 *   Taguato          11,4 m      58,1 m · y ni siquiera llega a pararse
 *
 * Los dos modelos frenan distinto y por eso el listón es distinto: el sencillo
 * es más contundente a propósito, porque ahí el freno es la lección.
 */
for (const [tramo, tope] of [
  ["guyrami", 6],
  ["taguato", 25],
]) {
  const page = await navegador.newPage({
    viewport: { width: 1280, height: 800 },
    hasTouch: true,
  });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.addInitScript(() => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
  });
  await page.goto(
    `http://localhost:${PUERTO}/?escenario=valle-cordillera&leccion=despegue&tramo=${tramo}`,
  );
  await page.waitForFunction(() => globalThis.__oga?.estado, null, {
    timeout: 60000,
  });
  await page.waitForTimeout(2500);

  /*
   * ── Y ahora el freno de verdad ──────────────────────────────────────────
   *
   * Se arranca, se coge velocidad de rodaje y se pisa. El piloto de pruebas
   * lleva solo el motor: el freno tiene que entrar por donde entra cuando se
   * juega, que es la tecla, o esto no comprobaría el freno sino una variable.
   */
  const medido = await page.evaluate(async () => {
    const o = globalThis.__oga;
    o.pilotar((c) => {
      c.engineOn = true;
      c.throttle = 0.6;
      c.aileron = 0;
      c.rudder = 0;
      c.elevator = 0;
    });
    // A rodar, hasta coger algo de velocidad.
    for (let i = 0; i < 120 && o.estado().airspeed < 8; i++)
      await new Promise((r) => setTimeout(r, 100));
    return { rodo: +o.estado().airspeed.toFixed(1) };
  });
  comprobar(
    `${tramo}: con el motor puesto, el avión rueda`,
    medido.rodo >= 8,
    `${medido.rodo} m/s antes de frenar`,
    "sin arrancar el motor no hay nada que frenar, y así estaba esto",
  );

  // Gas fuera, freno a fondo con la tecla, y se mide lo que recorre.
  await page.evaluate(() => {
    globalThis.__oga.pilotar((c) => {
      c.engineOn = true;
      c.throttle = 0;
      c.aileron = 0;
      c.rudder = 0;
      c.elevator = 0;
    });
  });
  await page.keyboard.down("Space");
  const frenando = await page.evaluate(async () => {
    const o = globalThis.__oga;
    const a = { ...o.estado().position };
    let pisado = false;
    for (let i = 0; i < 80; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (document.querySelector(".freno--pisado")) pisado = true;
      if (o.estado().airspeed < 0.3) break;
    }
    const b = o.estado().position;
    return {
      pisado,
      recorrido: +Math.hypot(b.x - a.x, b.z - a.z).toFixed(1),
      quedo: +o.estado().airspeed.toFixed(2),
    };
  });
  await page.keyboard.up("Space");

  comprobar(
    `${tramo}: el freno se ve pisado mientras se pisa`,
    frenando.pisado,
    frenando.pisado ? "se enciende" : "no se encendió en ocho segundos",
    "«se aprieta algo y algo responde» es todo el tutorial que hay",
  );
  comprobar(
    `${tramo}: con el freno a fondo el avión se para en ${tope} m`,
    frenando.quedo < 0.5 && frenando.recorrido < tope,
    `quedó en ${frenando.quedo} m/s tras ${frenando.recorrido} m · tope ${tope} m`,
    "esto se medía leyendo un elemento que no existe: null === null, «PARADO»",
  );

  /*
   * **Y suelta.** Un freno pegado es peor que ninguno: el avión se queda
   * clavado en la calle sin que nadie sepa por qué.
   */
  const suelta = await page.evaluate(async () => {
    const o = globalThis.__oga;
    o.pilotar((c) => {
      c.engineOn = true;
      c.throttle = 0.7;
      c.aileron = 0;
      c.rudder = 0;
      c.elevator = 0;
    });
    for (let i = 0; i < 80 && o.estado().airspeed < 4; i++)
      await new Promise((r) => setTimeout(r, 100));
    const v = +o.estado().airspeed.toFixed(1);
    o.pilotar(null);
    return v;
  });
  comprobar(
    `${tramo}: y al soltarlo vuelve a rodar`,
    suelta >= 4,
    `${suelta} m/s con el freno suelto`,
    "un freno que se queda puesto deja el avión clavado sin decir por qué",
  );

  comprobar(
    `${tramo}: sin errores`,
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

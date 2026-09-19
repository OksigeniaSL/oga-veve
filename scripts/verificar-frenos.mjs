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
    `http://localhost:${PUERTO}/?escenario=valle-cordillera&hora=16&leccion=despegue&tramo=${tramo}`,
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
 * de frenado puesta a cero.
 *
 * ## Y el listón sale de la física, no de una medida vieja
 *
 * Aquí había dos números a mano —seis metros y veinticinco— sacados de medir
 * el juego el día que se escribió esto. Y ese día el modelo sencillo paraba
 * desde ocho metros por segundo **en dos metros y medio**, que son más de un
 * g: un avión frenando no hace eso ni de lejos, y se notaba jugando —«freno
 * en la pista en dos metros, eso no se lo cree nadie»—.
 *
 * Cuatro días después la frenada se hizo realista, cada avión pasó a parar en
 * los metros que dice su ficha… y esta comprobación se puso en rojo. O sea que
 * el banco llevaba desde entonces **exigiendo la avería**: el número a mano
 * había congelado el fallo y convertido su arreglo en un fallo del banco.
 *
 * Así que el listón ya no es un número: se le pregunta al avión cuánto le
 * cuesta pararse desde su velocidad de toma —`frenadaEn` y `tomaA`, que salen
 * de `rodaduraDeFrenada`— y de ahí sale la deceleración que puede dar. Lo que
 * se exige es parar en esa distancia con un margen, sea cual sea el avión y el
 * modelo de vuelo. Un listón que se calcula no se queda viejo.
 *
 * El margen es del doble: no se mide una frenada limpia sino un avión que
 * venía rodando, con el gas cerrándose y el freno entrando, así que los
 * primeros metros no frena del todo. Lo que caza el listón es el orden de
 * magnitud — pararse en dos metros, o no pararse.
 *
 * ## Y «parado» se mide contra el suelo, no contra el aire
 *
 * Esto miraba `airspeed`, y en el modelo detallado eso es la velocidad
 * **respecto al aire**: un avión clavado con el freno puesto marca la
 * velocidad del viento que le da. Así que Taguato salía en rojo por «se quedó
 * a 1,09 m/s» con el avión completamente parado — 1,09 m/s era la brisa.
 *
 * La regla está escrita en `flight/model.ts` y no tiene excepciones: «lo que
 * hace volar es el aire; lo que hace avanzar es el suelo». Pararse es de las
 * segundas, así que va con `groundSpeed`. Un banco que pregunta por la
 * magnitud equivocada no mide de menos: mide otra cosa.
 */
const MARGEN = 2;
for (const tramo of ["guyrami", "taguato"]) {
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
    `http://localhost:${PUERTO}/?escenario=valle-cordillera&hora=16&leccion=despegue&tramo=${tramo}`,
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
    /*
     * A rodar, hasta coger algo de velocidad — **la del suelo**, que es la que
     * dice si el avión avanza. Ver más abajo.
     */
    for (let i = 0; i < 120 && o.estado().groundSpeed < 8; i++)
      await new Promise((r) => setTimeout(r, 100));
    return { rodo: +o.estado().groundSpeed.toFixed(1) };
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
    /*
     * Ciento sesenta décimas, no ochenta: con la frenada realista el avión
     * tarda más en pararse que con la de un g que había antes, y el bucle
     * terminaba con el avión todavía rodando a metro y pico. Un banco que
     * deja de mirar antes de que pase lo que mide no está midiendo nada.
     */
    for (let i = 0; i < 160; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (document.querySelector(".freno--pisado")) pisado = true;
      if (o.estado().groundSpeed < 0.3) break;
    }
    const b = o.estado().position;
    return {
      pisado,
      recorrido: +Math.hypot(b.x - a.x, b.z - a.z).toFixed(1),
      quedo: +o.estado().groundSpeed.toFixed(2),
      // Y lo que marcaba el anemómetro, solo para el informe: es lo que
      // confundió a este banco durante quince días. Ver abajo.
      marcaba: +o.estado().airspeed.toFixed(2),
    };
  });
  await page.keyboard.up("Space");

  comprobar(
    `${tramo}: el freno se ve pisado mientras se pisa`,
    frenando.pisado,
    frenando.pisado ? "se enciende" : "no se encendió en ocho segundos",
    "«se aprieta algo y algo responde» es todo el tutorial que hay",
  );
  /*
   * El listón, calculado con la ficha de **este** avión: la deceleración que
   * puede dar sale de parar desde su velocidad de toma en su rodadura de
   * frenada, y de ahí los metros que le tiene que costar desde donde venía.
   */
  const ficha = await page.evaluate(() => globalThis.__oga.avion());
  const decel = (ficha.tomaA * ficha.tomaA) / (2 * ficha.frenadaEn);
  const tope =
    Math.round(((medido.rodo * medido.rodo) / (2 * decel)) * MARGEN) + 2;
  comprobar(
    `${tramo}: con el freno a fondo el avión se para en ${tope} m`,
    frenando.quedo < 0.5 && frenando.recorrido < tope,
    `quedó en ${frenando.quedo} m/s por el suelo (el anemómetro marcaba ${frenando.marcaba}) tras ${frenando.recorrido} m · su ficha da ${decel.toFixed(1)} m/s², o sea ${tope} m de tope desde ${medido.rodo} m/s`,
    "el tope era un número a mano de cuando frenaba a más de un g, y «parado» se miraba contra el aire",
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
    // Y esto también por el suelo: con viento de cara el anemómetro marca
    // cuatro metros por segundo con el avión casi quieto, y la comprobación
    // pasaba sin que el freno se hubiera soltado de nada. Ver arriba.
    for (let i = 0; i < 80 && o.estado().groundSpeed < 4; i++)
      await new Promise((r) => setTimeout(r, 100));
    const v = +o.estado().groundSpeed.toFixed(1);
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

/*
 * ── El tren y los flaps, que hasta hoy no se podían tocar desde fuera ──────
 *
 * Volando en la vista de fuera había palanca, gases, timón y freno al alcance
 * del dedo, y nada más: el tren y los flaps solo existían como tecla —la G y
 * la F— y como botón dentro de la cabina. O sea que en una tablet no existían.
 *
 * Preguntado jugando, con el tren ya metido y el dibujo todavía en pantalla:
 * «si pulsé la G para meter el tren ¿por qué sigo viéndolo? ¿en qué parte del
 * panel veo que se está poniendo o quitando?». Las dos preguntas tienen la
 * misma respuesta, y es este botón.
 *
 * Se comprueban las tres cosas que lo hacen un mando y no un dibujo: que esté
 * **solo donde hay tren que meter**, que se pueda **alcanzar con el dedo** sin
 * salirse de la pantalla, y que al pulsarlo **el tren se mueva de verdad** y el
 * botón lo cuente. Lo que no se puede tocar no es un mando; y un mando que no
 * dice en qué estado está es la pregunta de arriba otra vez.
 */
for (const [avion, hayTren] of [
  ["jaz-120", true],
  ["jaz-20", false],
]) {
  const page = await navegador.newPage({
    viewport: { width: 900, height: 600 },
    hasTouch: true,
    isMobile: true,
  });
  await page.addInitScript(() => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
  });
  await page.goto(
    `http://localhost:${PUERTO}/?escenario=tenerife-sur&hora=16&leccion=aterrizaje&tramo=guyrami&avion=${avion}`,
  );
  await page.waitForFunction(() => globalThis.__oga?.estado, null, {
    timeout: 60000,
  });
  await page.waitForTimeout(2500);

  const mirar = () =>
    page.evaluate(() => {
      const ver = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const c = el.getBoundingClientRect();
        return {
          visible: !el.hidden,
          clases: el.className,
          ancho: Math.round(c.width),
          alcanzable:
            !el.hidden &&
            c.left >= 0 &&
            c.right <= innerWidth &&
            c.top >= 0 &&
            c.bottom <= innerHeight,
        };
      };
      return {
        tren: ver('[data-hud="tren-touch"]'),
        flaps: ver('[data-hud="flaps-touch"]'),
        donde: globalThis.__oga.controles().tren,
      };
    });

  const antes = await mirar();
  comprobar(
    `${avion}: el botón del tren está solo donde hay tren`,
    antes.tren !== null && antes.tren.visible === hayTren,
    antes.tren
      ? `visible ${antes.tren.visible ? "sí" : "no"}, se esperaba ${hayTren ? "sí" : "no"}`
      : "no existe",
    "un botón que no hace nada enseña que los mandos son adorno",
  );
  comprobar(
    `${avion}: y los flaps se pueden tocar`,
    antes.flaps?.visible === true && antes.flaps.alcanzable,
    antes.flaps
      ? `${antes.flaps.ancho} px · ${antes.flaps.alcanzable ? "dentro de la pantalla" : "FUERA de la pantalla"}`
      : "no existe",
    "lo que no se puede tocar no es un mando",
  );

  if (hayTren) {
    comprobar(
      `${avion}: y el del tren se alcanza con el dedo`,
      antes.tren.alcanzable && antes.tren.ancho >= 44,
      `${antes.tren.ancho} px · ${antes.tren.alcanzable ? "dentro de la pantalla" : "FUERA de la pantalla"}`,
      "cuarenta y cuatro píxeles es lo que mide un dedo, y por debajo de eso no se acierta",
    );
    /*
     * Y que **mueva el tren**, no solo que se encienda. Un botón que cambia de
     * color y no hace nada es peor que ninguno.
     */
    await page.click('[data-hud="tren-touch"]');
    await page.waitForTimeout(500);
    const moviendo = await mirar();
    comprobar(
      `${avion}: al pulsarlo, el tren se mueve y el botón lo dice`,
      moviendo.donde < antes.donde &&
        moviendo.tren.clases.includes("mando--moviendose"),
      `de ${antes.donde.toFixed(2)} a ${moviendo.donde.toFixed(2)} · clases «${moviendo.tren.clases}»`,
      "«¿en qué parte del panel veo que se está poniendo o quitando?»",
    );
  }
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

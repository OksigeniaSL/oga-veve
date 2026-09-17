/**
 * Que los mandos de la cabina se puedan pulsar de verdad.
 *
 * Pedido jugando, y con las tres formas dichas: «quería también botones que
 * poder pulsar, tanto con clic, tap como tecla». Las teclas ya estaban; lo que
 * faltaba es el mando **que está en la cabina**, que es donde lo busca quien se
 * acaba de sentar ahí.
 *
 * Y hace falta comprobarlo desde fuera porque el fallo no se ve leyendo el
 * código: la primera versión ponía los tres mandos a la derecha de la columna
 * de motores, que en un avión de línea cae **fuera de lo que ve el
 * comandante** —el ojo está en su asiento, no en el eje del avión—. Estaban,
 * respondían, y no había un solo píxel de la pantalla que los tocara.
 *
 * Uso: `node scripts/verificar-botones.mjs`
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const PUERTO = 5287;
/*
 * Los seis. Eran tres —uno por familia de cabina— y con eso no se vio que los
 * botones del fumigador y los del bimotor colgaban fuera del tablero: ninguno
 * de los dos estaba en la lista.
 */
const AVIONES = ["jaz-20", "jaz-25", "jaz-40", "jaz-60", "jaz-90", "jaz-120"];
/**
 * Los que lleva cualquier cabina. El del tren **solo donde hay tren**, así que
 * no se exige: lo que se exige es que **todo lo que el modelo dibuja como
 * mando se pueda alcanzar**, que es lo que de verdad falla — al aparecer la
 * palanca del tren la fila se corrió a la derecha y el último quedó fuera de
 * lo que ve el comandante, exactamente el fallo que este banco nació para
 * cazar.
 */
const MANDOS = ["motor", "flaps", "freno"];

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

const ANCHO = 1000;
const ALTO = 640;

for (const avion of AVIONES) {
  const page = await navegador.newPage({
    viewport: { width: ANCHO, height: ALTO },
  });
  await page.addInitScript(() => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
  });
  await page.goto(
    `http://localhost:${PUERTO}/?escenario=tenerife-norte&leccion=despegue&tramo=guyrami&avion=${avion}`,
  );
  await page
    .waitForFunction(() => globalThis.__oga?.estado?.(), null, {
      timeout: 60000,
    })
    .catch(() => {});
  await page.waitForTimeout(2500);

  /*
   * **Y se mira desde el asiento, dicho de la única forma que funciona.**
   *
   * El banco lo pedía escribiendo `oga-veve:vista` en el almacén, y esa llave
   * no existe: la vista vive dentro del bulto de guardado, en sus ajustes. O
   * sea que este banco llevaba probando los mandos de la cabina **desde
   * fuera del avión**, donde `pulsarElMando` no hace nada a propósito. Lo que
   * se veía era un banco que fallaba una de cada tres veces sin patrón.
   */
  const vista = await page.evaluate(() =>
    globalThis.__oga.ponerVista("cockpit"),
  );
  await page.waitForTimeout(600);
  comprobar(
    `${avion}: se mira desde el asiento`,
    vista === "cockpit",
    vista,
    "desde fuera del avión los mandos de la cabina no se pulsan, a propósito",
  );

  const hay = await page.evaluate(() => globalThis.__oga.botones?.() ?? []);

  /*
   * **Y que estén en el tablero, no colgando de él.**
   *
   * Se alcanzaban con el dedo y aun así sobresalían: en el bimotor asomaban
   * siete centímetros por debajo del canto del panel y en el fumigador uno por
   * el costado. Las dos cosas se ven —es justo lo que queda a la vista al
   * mirar hacia abajo— y ninguna la veía este banco, que solo preguntaba si se
   * podían tocar. Se mide **en el avión**, en metros, porque en pantalla un
   * botón que flota delante del tablero se ve igual de bien.
   */
  const colgando = await page.evaluate(() => {
    const piezas = globalThis.__oga.enElAvion("^(boton|panel$)");
    const panel = piezas.find((p) => p.nombre === "panel");
    if (!panel) return null;
    return piezas
      .filter((p) => p.nombre.startsWith("boton"))
      .filter(
        (b) =>
          b.x0 < panel.x0 - 0.005 ||
          b.x1 > panel.x1 + 0.005 ||
          b.y0 < panel.y0 - 0.005 ||
          b.y1 > panel.y1 + 0.005,
      )
      .map((b) => b.nombre);
  });
  comprobar(
    `${avion}: y están puestos en el tablero`,
    colgando !== null && colgando.length === 0,
    colgando === null
      ? "no se encontró el panel"
      : colgando.length
        ? `fuera: ${[...new Set(colgando.map((n) => n.replace("-hueco", "")))].join(" · ")}`
        : "todos dentro",
    "un mando que flota fuera del tablero no es un mando, es un error de dibujo",
  );
  comprobar(
    `${avion}: la cabina trae sus mandos`,
    MANDOS.every((m) => hay.includes(m)),
    hay.join(" · ") || "ninguno",
    "un panel donde no se puede tocar nada enseña que los mandos son adorno",
  );

  /*
   * Y **se pueden alcanzar con el dedo**: se barre la pantalla y se apunta
   * dónde cae cada uno. Lo que no se puede tocar no es un mando.
   */
  /**
   * Barre la pantalla y apunta dónde cae cada mando **ahora**.
   *
   * Se vuelve a barrer antes de cada pulsación y no una vez al principio, y no
   * es por gusto: **el avión se mueve**. Parar el motor de un fumigador lo
   * asienta sobre su patín de cola, y con un par de grados de cabeceo los
   * botones se corren un centímetro en el tablero — lo bastante para que el
   * punto apuntado hace diez segundos ya no toque nada. El banco se lo comía y
   * lo contaba como «el mando no hace nada»: tres cuartos de hora persiguiendo
   * un fallo que era suyo. Quien juega mira dónde está el botón cada vez que
   * va a pulsarlo; esto hace lo mismo.
   */
  const buscar = async () => {
    const donde = {};
    for (
      let y = ALTO * 0.45;
      y < ALTO && Object.keys(donde).length < hay.length;
      y += 8
    ) {
      for (let x = 20; x < ANCHO; x += 8) {
        const cual = await page.evaluate(
          ([px, py]) => globalThis.__oga.mandoEn?.(px, py) ?? null,
          [x, y],
        );
        if (cual && !donde[cual]) donde[cual] = [x, y];
      }
    }
    return donde;
  };

  /** Mueve el dedo, espera un latido, aprieta y suelta. */
  const pulsar = async (punto) => {
    /*
     * **Despacio.** Con el clic pegado al movimiento el banco fallaba una de
     * cada tres veces, porque quién está bajo el dedo se resuelve en el
     * fotograma siguiente al del movimiento: se apretaba antes de que el juego
     * supiera sobre qué.
     */
    await page.mouse.move(punto[0], punto[1]);
    await page.waitForTimeout(150);
    await page.mouse.down();
    await page.waitForTimeout(80);
    await page.mouse.up();
    await page.waitForTimeout(400);
  };

  const donde = await buscar();
  comprobar(
    `${avion}: y se alcanzan con el dedo`,
    // **Todos los que el modelo trae**, no una lista escrita a mano. Con una
    // lista fija, el día que apareció la palanca del tren nadie se enteró de
    // que se había quedado fuera de la pantalla.
    hay.every((m) => donde[m]),
    hay
      .map((m) => `${m}${donde[m] ? "" : " (fuera de la pantalla)"}`)
      .join(" · "),
    "el ojo está en el asiento del piloto, no en el eje del avión",
  );

  if (donde.motor) {
    const antes = await page.evaluate(
      () => globalThis.__oga.controles().engineOn,
    );
    await pulsar(donde.motor);
    const despues = await page.evaluate(
      () => globalThis.__oga.controles().engineOn,
    );
    comprobar(
      `${avion}: y el contacto arranca el motor`,
      antes !== despues,
      `${antes} → ${despues}`,
      "se dispara al soltar, como cualquier botón",
    );
  }

  // Y se vuelve a mirar dónde está: el avión se ha movido desde la última vez.
  const ahora = await buscar();
  if (ahora.flaps) {
    const antes = await page.evaluate(() => globalThis.__oga.controles().flaps);
    await pulsar(ahora.flaps);
    const despues = await page.evaluate(
      () => globalThis.__oga.controles().flaps,
    );
    comprobar(
      `${avion}: y el de flaps los mueve`,
      antes !== despues,
      `${antes} → ${despues}`,
      "",
    );
  }

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

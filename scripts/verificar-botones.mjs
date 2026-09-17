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
const AVIONES = ["jaz-20", "jaz-60", "jaz-120"];
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
    localStorage.setItem("oga-veve:vista", "cockpit");
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

  const hay = await page.evaluate(() => globalThis.__oga.botones?.() ?? []);
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
    await page.mouse.move(donde.motor[0], donde.motor[1]);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(400);
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

  if (donde.flaps) {
    const antes = await page.evaluate(() => globalThis.__oga.controles().flaps);
    await page.mouse.move(donde.flaps[0], donde.flaps[1]);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(400);
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

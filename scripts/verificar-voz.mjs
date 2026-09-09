/**
 * El pack de voz, de punta a punta y en un navegador de verdad.
 *
 *     node scripts/verificar-voz.mjs
 *
 * Este banco existe por una razón incómoda: **la tubería del pack de voz está
 * entera y su contenido todavía no**. Bajarlo, guardarlo en la caché,
 * descodificarlo, montar la frase con sus trozos y tocarla por el bus de voz
 * son cinco cosas que solo se pueden equivocar en un navegador, y esperar a
 * que existan las grabaciones para probarlas es garantizar que el día que
 * lleguen no funcione nada.
 *
 * Así que aquí se hornea un pack de mentira —cuatro tonos con nombre de
 * pieza—, se juega con él y se borra. Lo que se comprueba no es cómo suena:
 * es que suene el grabado cuando hay grabación, que suene el navegador cuando
 * no la hay, que la mezcla se levante al acabar la frase y que la segunda
 * sesión no vuelva a bajar nada.
 *
 * Necesita `ffmpeg` en el PATH, como `hacer-pack-de-voz.mjs`.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

const PUERTO = 5284;
const VOZ = "instructor";
const TOMAS = join("node_modules", ".cache", "tomas-de-prueba");
const PACK = join("data", "voces", VOZ);

/** Las piezas del pack de mentira, y las frases que montan. */
const PIEZAS = ["segui", "la-raya-verde", "la-calle", "hueco.a"];
const RECETAS = {
  "vuelo.rodando": ["segui", "la-raya-verde"],
  "vuelo.calle": ["segui", "la-calle", "{letra}"],
};

const resultados = [];
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

/** Hornea el pack de mentira con el mismo guion que horneará el de verdad. */
function hornear() {
  rmSync(TOMAS, { recursive: true, force: true });
  mkdirSync(TOMAS, { recursive: true });
  for (const pieza of PIEZAS) {
    execFileSync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=320:duration=0.6",
      join(TOMAS, `${pieza}.wav`),
    ]);
  }
  execFileSync("node", [
    "-e",
    `require('fs').writeFileSync(${JSON.stringify(join(TOMAS, "recetas.json"))}, ${JSON.stringify(JSON.stringify(RECETAS))})`,
  ]);
  execFileSync("node", ["scripts/hacer-pack-de-voz.mjs", TOMAS, VOZ, PACK], {
    stdio: "ignore",
  });
}

/** Y lo borra. Va en `finally`: un banco que deja basura en `data/` es peor. */
function recoger() {
  rmSync(TOMAS, { recursive: true, force: true });
  rmSync(join("data", "voces"), { recursive: true, force: true });
}

let navegador;
let server;
try {
  hornear();
  server = await createServer({
    root: process.cwd(),
    server: { port: PUERTO, hmr: false },
  });
  await server.listen();
  navegador = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    args: [
      "--use-gl=angle",
      "--use-angle=gl",
      "--enable-unsafe-swiftshader",
      // Sin esto el contexto de audio no arranca ni con el gesto simulado, y
      // lo que se está probando es justamente que suene.
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
  const contexto = await navegador.newContext({
    viewport: { width: 900, height: 620 },
  });
  const page = await contexto.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.addInitScript(() =>
    localStorage.setItem("oga-veve:teclas-vistas", "1"),
  );
  const direccion = `http://localhost:${PUERTO}/?escenario=tenerife-norte&leccion=rodaje&tramo=guyrami`;
  await page.goto(direccion);
  await page.waitForFunction(() => !!globalThis.__oga?.voz, null, {
    timeout: 120000,
  });

  const antes = await page.evaluate(() => globalThis.__oga.voz());
  comprobar(
    "antes del primer gesto no se ha bajado nada",
    antes.piezas === 0,
    `${antes.piezas} piezas`,
    "bajarlo al arrancar sería gastar la red de alguien que quizá juegue en silencio",
  );

  // El primer gesto: es lo que despierta el audio y lo que dispara la bajada.
  await page.mouse.click(450, 500);
  await page.waitForFunction(() => globalThis.__oga.voz().piezas > 0, null, {
    timeout: 30000,
  });
  const cargado = await page.evaluate(() => globalThis.__oga.voz());
  comprobar(
    "y con el primer gesto se baja el pack entero",
    cargado.piezas === PIEZAS.length,
    `${cargado.piezas} de ${PIEZAS.length} piezas`,
    "un pack a medias deja frases cojas, y media frase es peor que ninguna",
  );

  const guardado = await page.evaluate(async () => {
    const nombres = await caches.keys();
    const voz = await caches.open("oga-veve-voz-v1");
    return { nombres, cuantas: (await voz.keys()).length };
  });
  comprobar(
    "y queda guardado en su propia caché, no en la del juego",
    guardado.cuantas === PIEZAS.length + 1 &&
      guardado.nombres.includes("oga-veve-voz-v1"),
    `${guardado.cuantas} entradas en ${guardado.nombres.join(", ") || "ninguna"}`,
    "las veinte tablets de un aula tienen que bajarlo una vez, no una por sesión",
  );

  /*
   * La frase grabada: suena la persona, y **se calla sola** cuando acaba la
   * última pieza. Eso último no es un detalle: la mezcla se agacha mientras
   * habla el instructor, y si no llegara el aviso de final se quedaría el
   * motor agachado para siempre.
   */
  const grabada = await page.evaluate(async () => {
    const o = globalThis.__oga;
    o.decirlo("vuelo.rodando");
    const sonando = o.voz();
    await new Promise((r) => setTimeout(r, 2000));
    return { sonando, luego: o.voz() };
  });
  comprobar(
    "una frase grabada la dice la persona, montada por trozos",
    grabada.sonando.hablando && grabada.sonando.ultima === "vuelo.rodando",
    `última «${grabada.sonando.ultima}» · ${grabada.sonando.hablando ? "sonando" : "callado"}`,
    "es toda la razón de ser del pack",
  );
  comprobar(
    "y se calla sola al acabar la última pieza",
    !grabada.luego.hablando,
    grabada.luego.hablando ? "seguía hablando dos segundos después" : "callada",
    "sin el aviso de final, la mezcla deja el motor agachado para siempre",
  );

  /*
   * Y lo que no está grabado lo dice el navegador. Es lo que permite subir el
   * pack por partes y oír el resultado el mismo día en vez de esperar a las
   * ciento dieciséis frases.
   */
  const suplente = await page.evaluate(async () => {
    const o = globalThis.__oga;
    const antes = o.voz().ultima;
    o.decirlo("vuelo.estacionado");
    await new Promise((r) => setTimeout(r, 400));
    return { antes, ahora: o.voz() };
  });
  comprobar(
    "lo que todavía no está grabado no lo dice la persona",
    suplente.ahora.ultima === suplente.antes,
    `última sigue siendo «${suplente.ahora.ultima}»`,
    "una frase a medias con la voz de otro es peor que la voz del navegador entera",
  );

  /*
   * **Y la segunda sesión no vuelve a la red.**
   *
   * Se abre otra pestaña del mismo contexto —que es lo que comparte la
   * caché— contando las peticiones que salen hacia el pack. Tienen que ser
   * cero: si sale una sola, el aula de veinte tablets baja el pack veinte
   * veces al día y la promesa de la Cache API no vale nada.
   *
   * Se cuenta y no se apaga el servidor a propósito: apagándolo, una segunda
   * sesión que sí fuera a la red se quedaría sin pack y el banco lo leería
   * como «no había nada guardado», que es un síntoma y no la causa.
   */
  const otra = await contexto.newPage();
  const pedidas = [];
  otra.on("request", (r) => {
    if (r.url().includes("/data/voces/")) pedidas.push(r.url());
  });
  await otra.addInitScript(() =>
    localStorage.setItem("oga-veve:teclas-vistas", "1"),
  );
  await otra.goto(direccion);
  await otra.waitForFunction(() => !!globalThis.__oga?.voz, null, {
    timeout: 120000,
  });
  await otra.mouse.click(450, 500);
  await otra
    .waitForFunction(() => globalThis.__oga.voz().piezas > 0, null, {
      timeout: 30000,
    })
    .catch(() => {});
  const segunda = await otra.evaluate(() => globalThis.__oga.voz());
  comprobar(
    "la segunda sesión tiene el pack igual",
    segunda.piezas === PIEZAS.length,
    `${segunda.piezas} de ${PIEZAS.length} piezas`,
    "de nada sirve guardarlo si a la vuelta no está",
  );
  comprobar(
    "y no vuelve a pedirlo por la red",
    pedidas.length === 0,
    pedidas.length === 0
      ? "ni una petición"
      : `${pedidas.length} peticiones, la primera ${pedidas[0]}`,
    "un aula de veinte tablets bajaría el pack veinte veces al día",
  );

  comprobar(
    "y sin errores en la consola",
    errores.length === 0,
    errores[0] ?? "ninguno",
    "una tubería nueva que revienta en silencio no se descubre volando",
  );
} finally {
  await navegador?.close();
  await server?.close();
  recoger();
}

console.log("\n  el pack de voz\n");
let fallos = 0;
for (const r of resultados) {
  if (!r.ok) fallos++;
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
  if (!r.ok) console.log(`      importa porque: ${r.porque}`);
}
console.log(
  `\n  ${resultados.length - fallos} de ${resultados.length} comprobaciones\n`,
);
process.exit(fallos ? 1 : 0);

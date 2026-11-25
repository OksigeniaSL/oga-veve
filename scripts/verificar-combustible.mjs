/**
 * **Lo que dice el hangar es lo que lleva el avión**, destino a destino.
 *
 * «No importa el destino que elija, que el combustible siempre es el mismo»:
 * con el JAZ 90 en Ciudad del Este, 4629 kilos para ir a cualquier sitio. La
 * tarjeta del destino cambiaba la flecha y no el depósito. Las pruebas de
 * `combustible.test.ts` miran la cuenta; esto mira el juego: en el puesto se
 * toca la tarjeta una vez por destino y el depósito tiene que salir con la
 * carga de ese tramo, distinta para cada uno. Y apagar y volver a arrancar no
 * devuelve el destino de antes.
 *
 * Uso: `node scripts/verificar-combustible.mjs [escenario] [avion]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { arrancarConLaLlave, comoEstaElMotor } from "./motor-del-banco.mjs";
import { baseDe } from "./servidor.mjs";

const ESCENARIO = process.argv[2] ?? "guarani";
const AVION = process.argv[3] ?? "jaz-90";
// Uno propio, que otro banco puede estar corriendo a la vez: `OGA_PUERTO` para otro.
const PUERTO = Number(process.env.OGA_PUERTO ?? 5337);

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
const resultados = [];
const comprobar = (nombre, ok, detalle) =>
  resultados.push({ nombre, ok: !!ok, detalle });

try {
  const page = await navegador.newPage({
    viewport: { width: 900, height: 600 },
    locale: "es-PY",
  });
  page.on("pageerror", (e) => console.log("ERROR:", e.message));
  await page.addInitScript(() =>
    localStorage.setItem("oga-veve:teclas-vistas", "1"),
  );
  await page.goto(
    `${BASE}/?escenario=${ESCENARIO}&hora=16&avion=${AVION}&tramo=taguato&teselas=0`,
  );
  await page.waitForFunction(() => !!globalThis.__oga?.estado, null, {
    timeout: 90000,
  });
  await page.waitForTimeout(10000);

  const r = await page.evaluate(async () => {
    const o = globalThis.__oga;
    const espera = (ms) => new Promise((res) => setTimeout(res, ms));
    const leer = () => ({
      destino: o.rutaDelVuelo().destino,
      kilos: Math.round(o.combustible().kilos),
      carga: Math.round(o.cargaDelTramo()),
    });
    const vueltas = [leer()];
    // Una vuelta entera a la tarjeta: cada destino y la vuelta al campo.
    for (let i = 0; i < 8; i++) {
      o.siguienteDestino();
      await espera(200);
      vueltas.push(leer());
      if (vueltas.at(-1).destino === vueltas[0].destino) break;
    }
    /*
     * Uno que no sea la vuelta al campo ni el de salida del hangar, y a ver
     * si sobrevive a la llave: con el del hangar la prueba no distinguiría.
     */
    for (let i = 0; i < 8; i++) {
      const d = o.rutaDelVuelo();
      if (d.destino !== d.salida && d.destino !== vueltas[0].destino) break;
      o.siguienteDestino();
      await espera(200);
    }
    const elegido = leer();
    return { vueltas, elegido };
  });
  /*
   * La llave: se arranca, se apaga y se vuelve a arrancar. Como quien juega,
   * que en un puesto de pasarela es la baliza, pedir el tractor y arrancar
   * empujando —ver el ADR 0025—. En el de Guaraní sale por sus medios y con la
   * llave basta; en Gran Canaria, sin la baliza no responde, y con las tres
   * pulsaciones de antes el motor seguía parado de principio a fin. Por eso se
   * mira cada vez que hizo lo que se le pidió.
   */
  const arranque = await arrancarConLaLlave(page);
  await page.waitForTimeout(1500);
  await page.keyboard.press("KeyI");
  await page.waitForTimeout(1500);
  const apagado = await comoEstaElMotor(page);
  await page.keyboard.press("KeyI");
  await page.waitForTimeout(1500);
  const otraVez = await comoEstaElMotor(page);
  comprobar(
    "la llave arranca, apaga y vuelve a arrancar",
    arranque !== null && !apagado.motor && otraVez.motor,
    `${arranque ?? "no arrancó"} · apagado: ${apagado.motor ? "SIGUE EN MARCHA" : "sí"} · otra vez: ${otraVez.motor ? "en marcha" : "NO"}` +
      (otraVez.tractor ? ` · el tractor, ${otraVez.tractor}` : ""),
  );
  const despues = await page.evaluate(() => {
    const o = globalThis.__oga;
    return {
      destino: o.rutaDelVuelo().destino,
      kilos: Math.round(o.combustible().kilos),
      carga: Math.round(o.cargaDelTramo()),
    };
  });

  const linea = (v) => `${v.destino} ${v.kilos} kg (pide ${v.carga})`;
  comprobar(
    "cada destino sale con su carga",
    r.vueltas.every((v) => Math.abs(v.kilos - v.carga) <= 1),
    r.vueltas.map(linea).join(" · "),
  );
  const distintas = new Set(r.vueltas.map((v) => v.kilos));
  const destinos = new Set(r.vueltas.map((v) => v.destino));
  comprobar(
    "y no la misma para todos",
    distintas.size === destinos.size && destinos.size > 1,
    `${destinos.size} destinos, ${distintas.size} cargas`,
  );
  comprobar(
    "y apagar y volver a arrancar no devuelve el destino del hangar",
    despues.destino === r.elegido.destino &&
      Math.abs(despues.kilos - r.elegido.carga) <= 1,
    `elegido ${linea(r.elegido)} · después ${linea(despues)}`,
  );
} finally {
  await navegador.close();
  await server.close();
}

console.log("");
for (const r of resultados)
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones\n`);
process.exit(bien === resultados.length ? 0 : 1);

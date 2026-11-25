/**
 * ¿Arranca el motor con la llave, y se mueve el avión con gas?
 *
 * **Con la llave y en su orden** (H99): pulsaba la tecla y escribía lo que
 * hubiera, sin mirar si había arrancado, y sin decir nada si no. Donde hay
 * tractor, la baliza, la llave para pedir el empuje y, empujando, la llave; y
 * el gas, cuando el tractor se ha ido. Sale en rojo si no arranca o si con el
 * gas a fondo no se mueve. En tierra no hay motor que vigilar volando.
 *
 * Uso: `node scripts/probar-arranque.mjs [despegue,vuelta] [escenario] [avion]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { arrancarConLaLlave, comoEstaElMotor } from "./motor-del-banco.mjs";
import { baseDe } from "./servidor.mjs";

const PUERTO = Number(process.env.OGA_PUERTO ?? 5239);
const LECCIONES = (process.argv[2] ?? "despegue,vuelta").split(",");
const ESCENARIO = process.argv[3] ?? "tenerife-norte";
const AVION = process.argv[4];
const server = await createServer({ root: process.cwd(), server: { port: PUERTO, hmr: false }, logLevel: "error" });
await server.listen();
const BASE = baseDe(server, PUERTO);
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });
let bien = 0;
let todas = 0;
const comprobar = (nombre, ok, detalle) => {
  todas++;
  if (ok) bien++;
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}  —  ${detalle}`);
};
try {
  for (const leccion of LECCIONES) {
    const page = await b.newPage({ viewport: { width: 1000, height: 700 }, locale: "es-PY" });
    page.on("pageerror", (e) => console.log("ERROR:", e.message));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(
      `${BASE}/?escenario=${ESCENARIO}&hora=16&leccion=${leccion}&meteo=${AVION ? `&avion=${AVION}` : ""}`,
    );
    await page.waitForFunction(() => !!globalThis.__oga?.estado?.(), null, { timeout: 90000 });
    await page.waitForTimeout(3500);

    const antes = await comoEstaElMotor(page);
    const pasos = await arrancarConLaLlave(page);
    comprobar(
      `${leccion}: el motor arranca con la llave`,
      !antes.motor && pasos !== null,
      `al empezar ${antes.motor ? "ya en marcha" : "parado"}, en «${antes.fase}» · ${pasos ?? "no arrancó"}`,
    );
    // El tractor lo deja en la calle y se va: hasta entonces el gas es suyo.
    for (let i = 0; i < 240 && (await comoEstaElMotor(page)).tractor; i++) await page.waitForTimeout(500);

    // Gas a tope durante cinco segundos. **X sube, Z baja** — Z era el fallo de
    // la primera versión de esta prueba, y probablemente el de quien la reportó.
    await page.keyboard.down("KeyX");
    await page.waitForTimeout(5000);
    await page.keyboard.up("KeyX");
    const trasGas = await page.evaluate(() => {
      const o = globalThis.__oga;
      const c = o.controles();
      return { motor: c.engineOn, gas: c.throttle, frenos: c.brakes, vel: o.estado().groundSpeed, fase: o.fase() };
    });
    comprobar(
      `${leccion}: y con gas se mueve`,
      trasGas.motor && trasGas.vel > 1,
      `motor ${trasGas.motor} · gas ${trasGas.gas.toFixed(2)} · frenos ${trasGas.frenos} · ${trasGas.vel.toFixed(1)} m/s · «${trasGas.fase}»`,
    );
    await page.close();
  }
} finally {
  await b.close();
  await server.close();
}
console.log(`\n  ${bien} de ${todas} comprobaciones`);
process.exit(bien === todas ? 0 : 1);

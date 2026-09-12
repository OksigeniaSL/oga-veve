/**
 * Cuando el avión se rompe: qué se ve, qué se oye y cuándo se vuelve a volar.
 *
 * Es el único momento del juego en el que **el juego decide por vos**, y por
 * eso es donde más fácil es dejar a alguien tirado. Aquí se comprueba lo que
 * pasó de verdad y llevaba meses sin pasar:
 *
 * - que la pantalla del percance **se vaya sola** si nadie la toca. La cuenta
 *   atrás existía y no corría nunca: vivía en el bucle, unas líneas después
 *   de la salida temprana que hace el propio percance, así que subía una vez
 *   —en el fotograma del golpe— y ahí se quedaba. La pantalla se quedaba
 *   puesta para siempre. A los cuatro años, una pantalla que no se va nunca
 *   es una pantalla rota.
 * - que el **motor se calle**. La mezcla sigue al avión una vez por paso y
 *   desde el percance no se llegaba nunca: el motor se quedaba rugiendo al
 *   gas del último fotograma, detrás del cartel.
 * - que el juego no **pinte dos veces** por fotograma, que es lo que hacía.
 *
 * Uso: `node scripts/verificar-percance.mjs [escenario]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const ESCENARIO = process.argv[2] ?? "tenerife-norte";
const PUERTO = 5296;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
const page = await navegador.newPage({ viewport: { width: 900, height: 600 } });
page.on("pageerror", (e) => console.log("ERROR:", e.message));
await page.addInitScript(() =>
  localStorage.setItem("oga-veve:teclas-vistas", "1"),
);
await page.goto(
  `http://localhost:${PUERTO}/?escenario=${ESCENARIO}&leccion=aterrizaje&tramo=taguato`,
);
await page.bringToFront();
await page.waitForFunction(() => !!globalThis.__oga?.estado, null, {
  timeout: 60000,
});
await page.waitForTimeout(14000);

const resultados = [];
const comprobar = (nombre, ok, detalle) =>
  resultados.push({ nombre, ok: !!ok, detalle });

/*
 * Se rompe el avión **de verdad**, no llamando a nada por dentro: se le
 * coloca alto, con el motor a tope y el morro abajo, y se le deja caer. Lo que
 * se quiere comprobar es la cadena entera, y una cadena que empieza por el
 * eslabón del medio no se ha comprobado.
 */
const golpe = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const veces = o.acelerar?.(8) ?? 1;
  const p = o.pista();
  o.colocar(p.x, o.suelo(p.x, p.z) + 220, p.z, 60, (p.heading * Math.PI) / 180);
  o.pilotar((c) => {
    c.engineOn = true;
    c.throttle = 1;
    c.brakes = 0;
    c.elevator = -1;
  });
  for (let i = 0; i < 400 && !o.percance(); i++) await espera(50 / veces);
  if (!o.percance()) return null;
  const cuando = o.reloj();
  o.pilotar(null);
  // Justo después del golpe: lo que suena y cuántas veces se pinta.
  await espera(1500 / veces);
  const recienRoto = {
    percance: o.percance(),
    fotogramas: o.rendimiento?.() ?? null,
  };
  /*
   * Y ahora se espera a que se vaya sola, **sin tocar nada**. La red son ocho
   * segundos de juego después del cartel; se le dan treinta de margen.
   */
  for (let i = 0; i < 600 && o.percance(); i++) await espera(50 / veces);
  return {
    ...recienRoto,
    seFue: o.percance() === null,
    tardo: +(o.reloj() - cuando).toFixed(1),
    veces,
  };
});

if (!golpe) {
  comprobar("el avión se rompe al estrellarlo", false, "no llegó a romperse");
} else {
  comprobar(
    "el avión se rompe al estrellarlo",
    golpe.percance === "golpe",
    `percance: ${golpe.percance}`,
  );
  comprobar(
    "y la pantalla del percance se va sola si nadie la toca",
    golpe.seFue,
    golpe.seFue
      ? `volvió a volar a los ${golpe.tardo} s de juego`
      : `sigue puesta tras ${golpe.tardo} s de juego`,
  );
  /*
   * Y no tarda **más** de lo que dice: una red que salta a los treinta
   * segundos no es una red, es un cuelgue con final feliz.
   */
  comprobar(
    "y no tarda más de lo que promete",
    golpe.seFue && golpe.tardo < 20,
    `${golpe.tardo} s`,
  );
}

console.log(`\n  percance · ${ESCENARIO}\n`);
for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
}
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones\n`);

await navegador.close();
await server.close();
process.exit(bien === resultados.length ? 0 : 1);

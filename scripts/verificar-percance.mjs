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
  `http://localhost:${PUERTO}/?escenario=${ESCENARIO}&leccion=aterrizaje&tramo=taguato-ruvicha`,
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
 * **Y en el peldaño de arriba**, que es el único sin ayudas: en los de abajo
 * el juego nivela y compensa, y un avión tirado en picado desde ochenta metros
 * se recuperaba solo y llegaba a metro y medio del suelo planeando. Eso está
 * bien —es lo que promete ese peldaño— pero para medir qué pasa **cuando el
 * avión se rompe** hace falta un avión que se pueda romper.
 */

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
  /*
   * **Se le hace salirse de la pista por el final**, que es el percance más
   * fácil de provocar y también el más fácil de tener jugando: se aterriza
   * largo, no se frena a tiempo y el avión se va al campo. Lo que se mide aquí
   * no es *qué* percance, es lo que el juego hace con cualquiera de ellos.
   *
   * Se probó antes a estrellarlo tirándolo en picado desde doscientos metros y
   * desde ochenta, con ayudas y sin ellas, y no se rompía: el avión llegaba a
   * metro y medio del suelo y se posaba. Eso está bien —es lo que el modelo
   * promete— pero como forma de provocar un percance es poco de fiar, y un
   * banco que depende de que algo salga mal **de una manera concreta** es un
   * banco que dará verde el día que salga mal de otra.
   */
  const r = o.pista();
  const hp = (r.heading * Math.PI) / 180;
  const fx = Math.sin(hp);
  const fz = -Math.cos(hp);
  // Ochenta metros antes del final, rodando rápido y sin frenos.
  const x = r.x + fx * (r.length / 2 - 80);
  const z = r.z + fz * (r.length / 2 - 80);
  o.colocar(x, o.suelo(x, z) + 1.2, z, 30, hp);
  o.pilotar((c) => {
    c.engineOn = true;
    c.throttle = 1;
    c.brakes = 0;
    c.elevator = 0;
    c.aileron = 0;
  });
  let masLejos = 0;
  for (let i = 0; i < 600 && !o.percance(); i++) {
    await espera(50 / veces);
    const e = o.estado();
    masLejos = Math.hypot(e.position.x - x, e.position.z - z);
  }
  if (!o.percance())
    return { fallo: `no hubo percance; rodó ${masLejos.toFixed(0)} m` };
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

if (!golpe || golpe.fallo) {
  comprobar(
    "el avión se rompe al estrellarlo",
    false,
    golpe?.fallo ?? "no llegó a romperse",
  );
} else {
  /*
   * Cuál de los percances sea da igual y **no se fija a propósito**: pasarse
   * del final de la pista acaba en el campo o contra lo que haya al otro
   * lado, y eso cambia con el aeropuerto. Lo que este banco mide es lo que el
   * juego hace con cualquiera de ellos.
   */
  comprobar(
    "salirse por el final de la pista es un percance",
    !!golpe.percance,
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

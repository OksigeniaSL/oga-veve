/**
 * Que cada boca use **su** grabación.
 *
 * El juego tiene cuatro bocas —la instructora, la torre, el otro avión de la
 * frecuencia y la comandante— y un pack de voz con seis voces grabadas. Hasta
 * hoy, tres de las cuatro se construían con `elegirTorre`, `elegirOtroAvion` y
 * `elegirCapitana`, que devuelven la voz sintética del navegador y **no
 * preguntan por una grabación en ningún momento**: treinta y tres frases
 * grabadas, horneadas, publicadas y bajadas a cada tablet para no sonar nunca.
 *
 * Se vio jugando: «que se escuche la torre, que todavía a día de hoy la única
 * voz es la de la instructora… tenemos a Yeray, a Jazlyn, a todos esos, ¿para
 * qué?».
 *
 * Esto lo comprueba pieza a pieza, en un navegador de verdad y con el pack de
 * verdad: para cada frase se pregunta a las cuatro bocas de qué pack saldría, y
 * tiene que salir del suyo.
 *
 * Uso: `node scripts/verificar-voces.mjs`
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const PUERTO = 5292;

/** Qué frase le toca a quién, y de qué pack tiene que salir. */
const REPARTO = [
  ["torre", "torre.verde", "torre"],
  ["torre", "torre.roja", "torre"],
  ["torre", "torre.canario.verde", "torre-canarias"],
  ["torre", "torre.canario.roja", "torre-canarias"],
  ["otro", "otro.enCola", "otro"],
  ["otro", "otro.pistaLibre", "otro"],
  /*
   * Y las cinco de fraseología, que estaban grabadas y no las decía nadie.
   * Aquí se comprueba que **salen del pack**; que alguien las pida está en
   * `src/audio/torre.test.ts`, y hacen falta las dos cosas: una grabación que
   * nadie nombra y una que nadie encuentra suenan igual de poco.
   */
  ["torre", "torre.clearedTakeoff", "torre"],
  ["torre", "torre.clearedLand", "torre"],
  ["torre", "torre.holdShort", "torre"],
  ["torre", "torre.lineUpWait", "torre"],
  ["torre", "torre.goAround", "torre"],
  ["capitana", "capitana.bienvenida", "capitana"],
  ["capitana", "capitana.crucero", "capitana"],
  ["instructor", "cabina.v1", "cabina"],
  ["instructor", "cabina.vr", "cabina"],
];

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
const page = await navegador.newPage({ viewport: { width: 900, height: 560 } });
const errores = [];
page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
await page.addInitScript(() =>
  localStorage.setItem("oga-veve:teclas-vistas", "1"),
);
await page.goto(
  `http://localhost:${PUERTO}/?escenario=tenerife-norte&leccion=despegue&tramo=guyrami&avion=jaz-20`,
);
await page
  .waitForFunction(() => globalThis.__oga?.estado?.(), null, { timeout: 60000 })
  .catch(() => {});
// El pack se baja después del primer gesto, como en el juego.
await page.mouse.click(450, 300);
await page
  .waitForFunction(() => (globalThis.__oga?.voz?.().piezas ?? 0) > 0, null, {
    timeout: 60000,
  })
  .catch(() => {});
await page.waitForTimeout(1500);

const resultados = [];
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

const piezas = await page.evaluate(() => globalThis.__oga.voz().piezas);
comprobar(
  "el pack de voz llega entero",
  piezas > 100,
  `${piezas} piezas cargadas`,
  "sin pack no hay nada que repartir y esto no mide nada",
);

for (const [quien, clave, pack] of REPARTO) {
  const dicho = await page.evaluate(
    (c) => globalThis.__oga.quienDice(c),
    clave,
  );
  comprobar(
    `«${clave}» la dice ${quien} con el pack ${pack}`,
    dicho[quien] === pack,
    Object.entries(dicho)
      .map(([k, v]) => `${k}:${v ?? "—"}`)
      .join(" "),
    "una frase grabada que sale por la voz del navegador es una grabación tirada",
  );
}

comprobar("sin errores", !errores.length, errores[0] ?? "limpio", "");

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

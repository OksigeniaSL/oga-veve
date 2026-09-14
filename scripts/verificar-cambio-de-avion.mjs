/**
 * Cambiar de avión en pista no puede romper nada.
 *
 * Se vio jugando, y la explicación de quien lo vio es exacta:
 *
 * > «Si estoy en la pista con la avioneta y pulso P para cambiar de avión, lo
 * > que ocurre cuando paso del cuatrimotor al siguiente es que ésta aparece
 * > ahora en el aire y cae. Entonces la instructora dice “se rompió, volvemos a
 * > empezar”. La avioneta nace en el aire porque el juego parte de un avión
 * > enorme y es como si se cayera, cuando en realidad estoy cambiando de
 * > aparato.»
 *
 * **El origen de una aeronave no está en sus ruedas**: está a la altura de su
 * tren por encima de ellas. Conservar la posición tal cual al cambiar de avión
 * daba por bueno el tren del que se iba, así que pasar del de fuselaje ancho
 * —5,20 m de tren— a la avioneta —1,40— la dejaba flotando cuatro metros. Y
 * desde ahí se caía, y el juego hacía lo que hace cuando un avión se cae.
 *
 * Esto no se puede cazar con una prueba unitaria: hace falta el mundo montado,
 * con su terreno y su pista, y la tecla de verdad.
 *
 * Uso: `node scripts/verificar-cambio-de-avion.mjs [escenario] [tramo]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const PUERTO = 5293;
const ESCENARIO = process.argv[2] ?? "tenerife-norte";
const TRAMO = process.argv[3] ?? "taguato";

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

const page = await navegador.newPage({ viewport: { width: 900, height: 560 } });
const errores = [];
page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
await page.addInitScript(() => {
  localStorage.setItem("oga-veve:teclas-vistas", "1");
});

/*
 * **Se empieza por el más grande**, que es el caso que se rompía: del tren más
 * alto de la flota al más bajo. Al revés el avión aparecía enterrado, que el
 * juego perdona porque lo sube al suelo, y no se habría visto nunca.
 */
await page.goto(
  `http://localhost:${PUERTO}/?escenario=${ESCENARIO}&leccion=despegue&tramo=${TRAMO}&avion=jaz-120`,
);
await page
  .waitForFunction(() => globalThis.__oga?.estado?.(), null, { timeout: 60000 })
  .catch(() => {});
await page.waitForTimeout(2000);

const mirar = () =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const s = o.estado();
    const a = o.avion();
    /*
     * **Y el circuito que tiene puesto**, que es del avión y no del campo.
     *
     * `escalaDeCircuito` lo estira con la velocidad de aproximación, pero el
     * circuito solo se montaba al preparar el aeródromo: cambiar de avión con
     * la tecla te dejaba volando un reactor por el circuito de la avioneta.
     * Dicho jugando: «que no me diga que dé el giro cuando todavía no llevo ni
     * dos segundos en el aire, porque ese tipo de avión necesita más giro».
     */
    const v = o.circuito();
    const subida =
      v.length > 1 ? Math.hypot(v[1].x - v[0].x, v[1].z - v[0].z) : 0;
    const sobre = s.position.y - o.suelo(s.position.x, s.position.z);
    return {
      avion: a.id,
      enElSuelo: s.onGround,
      sobreElSuelo: +sobre.toFixed(2),
      /*
       * Lo que sobra por encima de **su** tren. Es el número que dice si este
       * avión ha nacido apoyado: cero es apoyado, sea el tren de la avioneta o
       * el del de fuselaje ancho.
       */
      flotando: +(sobre - a.tren).toFixed(2),
      percance: !!o.percance?.(),
      subida: Math.round(subida),
      alturaDeCircuito: v.length > 1 ? Math.round(v[1].y - v[0].y) : 0,
    };
  });

/*
 * **Se mira en el fotograma siguiente, no cuando se haya posado todo.**
 *
 * Este banco esperaba segundo y medio después de cada tecla, y con segundo y
 * medio un avión que nace flotando cuatro metros ya se ha caído, ha tocado el
 * suelo y descansa sobre sus ruedas: la foto sale idéntica con el fallo y sin
 * él. Se comprobó a propósito, rompiendo el arreglo a mano — y el banco seguía
 * diciendo que todo estaba bien, que es la peor cosa que puede hacer un banco.
 *
 * Cuatro metros de caída son casi un segundo. Al sexto de segundo de haber
 * pulsado la tecla, el avión que nace apoyado sigue apoyado y el que nace en el
 * aire todavía está cayendo, que es exactamente la pregunta.
 */
const AL_INSTANTE = 160;
const YA_POSADO = 1500;

const vistos = [await mirar()];
// Una vuelta entera a la flota, que es lo que hace quien pulsa la tecla.
const despues = [];
for (let i = 0; i < 6; i++) {
  await page.keyboard.press("KeyP");
  await page.waitForTimeout(AL_INSTANTE);
  vistos.push(await mirar());
  await page.waitForTimeout(YA_POSADO);
  despues.push(await mirar());
}

console.log("\n  la vuelta entera a la flota:\n");
for (const v of vistos)
  console.log(
    `  · ${v.avion.padEnd(8)} ${v.enElSuelo ? "en el suelo" : "EN EL AIRE "} ` +
      `· ${String(v.sobreElSuelo).padStart(5)} m sobre el terreno` +
      `${v.flotando > 0.3 ? `  · ${v.flotando} m EN EL AIRE` : ""}` +
      `${v.percance ? "  · PERCANCE" : ""}`,
  );

comprobar(
  "se recorre la flota entera",
  new Set(vistos.map((v) => v.avion)).size >= 6,
  `${new Set(vistos.map((v) => v.avion)).size} aviones distintos`,
  "si la tecla no cambia de avión, esto no está midiendo nada",
);

comprobar(
  "ninguno nace en el aire",
  vistos.every((v) => v.enElSuelo),
  vistos
    .filter((v) => !v.enElSuelo)
    .map((v) => v.avion)
    .join(", ") || "todos con las ruedas en el suelo",
  "el origen de un avión está a la altura de su tren, y cada tren mide lo suyo",
);

comprobar(
  "y ninguno nace flotando sobre sus ruedas",
  vistos.every((v) => Math.abs(v.flotando) <= 0.3),
  vistos
    .filter((v) => Math.abs(v.flotando) > 0.3)
    .map((v) => `${v.avion} a ${v.flotando} m`)
    .join(", ") || "todos a ras de sus ruedas",
  "el origen de un avión está a la altura de su tren, y cada tren mide lo suyo",
);

comprobar(
  "ninguno se rompe al aparecer",
  [...vistos, ...despues].every((v) => !v.percance),
  [...vistos, ...despues]
    .filter((v) => v.percance)
    .map((v) => v.avion)
    .join(", ") || "ninguno",
  "cambiar de avión no es un percance, y el juego lo contaba como tal",
);

/*
 * Y que cada uno esté a **su** altura, no a la del anterior: es lo que separa
 * «se ha arreglado» de «se ha tapado». Si alguien volviera a arrastrar la
 * posición tal cual, todos saldrían a la misma altura y esto lo diría.
 */
// Esta sí se mira ya posado: lo que dice es que seis trenes distintos dejan al
// avión a seis alturas distintas, y para eso hay que dejarlo quieto.
comprobar(
  "y cada uno se apoya a la altura de su propio tren",
  new Set(despues.map((v) => v.sobreElSuelo)).size >= 5,
  despues
    .map((v) => `${v.avion.replace("jaz-", "")}:${v.sobreElSuelo}`)
    .join(" "),
  "seis aviones con seis trenes distintos no pueden apoyarse todos igual",
);

/*
 * **Y cada avión con su circuito.**
 *
 * La vuelta al aeropuerto de un avión de fuselaje ancho es casi seis kilómetros
 * de tramo de subida; la de la avioneta, cuatro y pico. No es adorno: es dónde
 * se canta el giro, y cantárselo a un reactor donde le toca a una avioneta es
 * pedirle que vire con dos segundos de vuelo. Dos de los seis comparten figura
 * a propósito —el biplano se aproxima más despacio que el entrenador y el
 * circuito nunca se encoge—, así que se piden cinco de seis.
 */
comprobar(
  "y cada uno vuela el circuito de su avión",
  new Set(despues.map((v) => v.subida)).size >= 5,
  despues.map((v) => `${v.avion.replace("jaz-", "")}:${v.subida}m`).join(" "),
  "el circuito se monta con la velocidad de aproximación, y al cambiar de avión no se rehacía",
);

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

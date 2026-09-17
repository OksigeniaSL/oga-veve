/**
 * El tren de aterrizaje, en el juego de verdad.
 *
 * Pedido jugando: «¿por qué no guardo el tren de aterrizaje o lo saco? ¿por qué
 * no puedo ponerlo o quitarlo con los botones en los aviones donde eso se
 * hace?». Y la respuesta era que no existía.
 *
 * Lo que comprueba, que son las cuatro cosas de las que vive el mando:
 *
 * 1. Que **solo lo tengan los que lo tienen**. Un entrenador de escuela y un
 *    fumigador llevan las patas al aire a propósito, y fingir una palanca que
 *    no hace nada enseña que los mandos son decoración.
 * 2. Que **tarde**. Diez segundos, que es lo que hay que aprender a dejar. Si
 *    fuera instantáneo, no habría nada que aprender.
 * 3. Que **se vea**: las patas suben de verdad en el modelo.
 * 4. Que **valga la pena**: con el tren metido el avión corre más. Es la
 *    lección entera del mando, y sin medirla no se sabe si llegó.
 *
 * Uso: `node scripts/verificar-tren.mjs`
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const PUERTO = 5309;
const CON_TREN = ["jaz-40", "jaz-60", "jaz-90", "jaz-120"];
const SIN_TREN = ["jaz-20", "jaz-25"];

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

for (const id of [...CON_TREN, ...SIN_TREN]) {
  const loMete = CON_TREN.includes(id);
  const page = await navegador.newPage({
    viewport: { width: 1000, height: 640 },
  });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.addInitScript(() => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
  });
  await page.goto(
    `http://localhost:${PUERTO}/?escenario=tenerife-sur&leccion=vuelta&tramo=taguato-ruvicha&avion=${id}`,
  );
  await page
    .waitForFunction(() => globalThis.__oga?.estado?.(), null, {
      timeout: 60000,
    })
    .catch(() => {});

  const visto = await page.evaluate(async (loMete) => {
    const o = globalThis.__oga;
    o.acelerar?.(6);
    // Se despega y se sube: el tren no se mete con el peso encima.
    o.pilotar((c) => {
      c.engineOn = true;
      c.throttle = 1;
      c.brakes = 0;
      c.elevator = o.estado().airspeed > 70 ? 0.35 : 0;
    });
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 200 && o.estado().heightAboveGround < 500; i++) {
      await espera(100);
    }
    /*
     * **Y ahora se nivela.** La velocidad de un avión que sube depende del
     * ángulo, no de la resistencia, así que comparar mientras trepa mide el
     * pulso del que pilota y no el tren. Se suelta la palanca, se deja que se
     * asiente, y **entonces** se compara: mismo gas, misma altura, lo único
     * que cambia es dónde están las patas.
     */
    /*
     * Nivelado **de verdad**, con un piloto automático de una línea: el
     * elevador contra la velocidad vertical. Con la palanca suelta a secas el
     * avión sigue trepando o se mete en un fugoide, y entonces lo que se mide
     * es el cabeceo y no el tren.
     */
    o.pilotar((c) => {
      c.engineOn = true;
      c.throttle = 1;
      c.brakes = 0;
      c.elevator = Math.max(
        -0.3,
        Math.min(0.3, -o.estado().verticalSpeed * 0.05),
      );
    });
    /*
     * Y se le da tiempo de verdad a asentarse, y se promedian los últimos
     * segundos: un avión que acaba de nivelar sigue moviéndose en fugoide un
     * buen rato, y una sola muestra coge la cresta o el valle. Medido con una
     * muestra suelta, el bimotor daba un uno por ciento **menos** de velocidad
     * con el tren metido — que es físicamente imposible y era el fugoide.
     */
    const asentar = async () => {
      for (let i = 0; i < 180; i++) await espera(100);
      const ultimas = [];
      for (let i = 0; i < 40; i++) {
        ultimas.push(o.estado().airspeed);
        await espera(100);
      }
      return ultimas.reduce((a, b) => a + b, 0) / ultimas.length;
    };
    const rapidoConTren = await asentar();
    const antes = o.controles().tren;

    // Y se pide meterlo, mirando cuánto tarda.
    o.tocarMando?.("tren");
    const camino = [];
    for (let i = 0; i < 160; i++) {
      camino.push({ t: i * 0.1, tren: o.controles().tren });
      if (o.controles().tren <= 0) break;
      await espera(100);
    }
    const rapidoSinTren = await asentar();
    return {
      antes,
      despues: o.controles().tren,
      camino,
      rapidoConTren,
      rapidoSinTren,
      patas: o.patas?.() ?? null,
      loMete,
    };
  }, loMete);

  const etiqueta = (que) => `${id}: ${que}`;

  if (loMete) {
    comprobar(
      etiqueta("mete el tren cuando se le pide"),
      visto.antes === 1 && visto.despues === 0,
      `de ${visto.antes} a ${visto.despues}`,
      "un mando que no hace nada enseña que los mandos son decoración",
    );
    /*
     * Y **tarda**. El reloj del juego va al doble, así que diez segundos de
     * vuelo son cinco de pared: se mide el camino y no el reloj de fuera.
     */
    const pasos = visto.camino.filter((p) => p.tren > 0 && p.tren < 1).length;
    comprobar(
      etiqueta("y tarda, que es medio mando"),
      pasos > 5,
      `${pasos} muestras con el tren a medio camino`,
      "un tren instantáneo no enseña a pedirlo antes de necesitarlo",
    );
    comprobar(
      etiqueta("y con él metido el avión corre más"),
      visto.rapidoSinTren > visto.rapidoConTren,
      `${visto.rapidoConTren.toFixed(1)} → ${visto.rapidoSinTren.toFixed(1)} m/s`,
      "si meterlo no se nota, la lección no llega",
    );
    comprobar(
      etiqueta("y las patas se mueven en el modelo"),
      (visto.patas ?? 0) > 0,
      `${visto.patas} piezas de tren`,
      "un mando que no cambia nada en la pantalla no parece un mando",
    );
  } else {
    comprobar(
      etiqueta("no tiene tren que meter, y no finge tenerlo"),
      visto.antes === 1 && visto.despues === 1,
      `el tren se queda en ${visto.despues}`,
      "sus patas van al aire a propósito: meterlas cuesta peso y averías",
    );
  }

  comprobar(
    etiqueta("sin errores"),
    !errores.length,
    errores[0] ?? "limpio",
    "",
  );
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

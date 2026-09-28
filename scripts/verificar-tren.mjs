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
 * ## Y por qué fallaba a veces
 *
 * «Mete el tren cuando se le pide — de 1 a 1», una tirada de cada tres, y
 * cada vez con otro avión. No era el tren: **el avión seguía en el suelo** al
 * pedirlo, y con el peso encima el tren no se mete. Medido con el JAZ 60 y el
 * parte de verdad de Tenerife Sur, cinco de cinco: rotaba, se levantaba un
 * palmo, el piloto del banco soltaba la palanca «hasta setenta» —el número de
 * un reactor—, volvía a posarse ya torcido fuera del asfalto, eso es un
 * percance, y el vuelo volvía a empezar. Así un minuto entero, y al pedir el
 * tren seguía rodando.
 *
 * Eran tres cosas, y ninguna del juego:
 *
 * - **El tiempo del día.** Sin `&meteo=`, el juego pide el METAR de verdad
 *   por el proxy del `.env`, que en el árbol principal está: el banco volaba
 *   con el viento que hiciera esa mañana en Tenerife Sur. Con los veinte nudos
 *   del alisio el avión se iba al aire enseguida; con calma, no. Es lo mismo
 *   que ya se arregló en `verificar-vuelo-entero.mjs`, y aquí faltaba.
 * - **El piloto del banco no llevaba el avión.** No corregía el rumbo en la
 *   carrera y en el aire soltaba la palanca hasta los setenta metros por
 *   segundo, que en un turbohélice que rota a cuarenta y uno es dejarlo caer.
 *   Ahora lleva el rumbo de la pista con la rueda y el timón, y en el aire
 *   sube con el morro a su ángulo, amortiguado y cuidando la velocidad.
 * - **El reloj de pared.** Contaba sus propias vueltas de cien milisegundos, y
 *   con la máquina cargada el juego corre menos por vuelta: el mismo minuto
 *   de pared es menos vuelo. Ahora todo se mide con el reloj del juego.
 *
 * Y si aun así no despega, lo dice: una comprobación previa —«despega y se
 * pone a nivel»— y las del tren salen como «no se midió» en vez de como un
 * tren que no se mete. Ver «La regla de medir se come la prueba».
 *
 * Uso: `node scripts/verificar-tren.mjs`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = 5309;
const CON_TREN = ["jaz-40", "jaz-60", "jaz-90", "jaz-120"];
const SIN_TREN = ["jaz-20", "jaz-25"];

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

try {
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
    /*
     * **Y con el tiempo de casa, no con el del día**: `&meteo=` vacío le dice
     * al juego que no hay proxy. Ver la cabecera.
     */
    await page.goto(
      `${BASE}/?escenario=tenerife-sur&hora=16&leccion=vuelta&tramo=taguato-ruvicha&avion=${id}&meteo=`,
    );
    await page
      .waitForFunction(() => globalThis.__oga?.estado?.(), null, {
        timeout: 60000,
      })
      .catch(() => {});

    const visto = await page.evaluate(async () => {
      const o = globalThis.__oga;
      o.acelerar?.(6);
      const espera = (ms) => new Promise((r) => setTimeout(r, ms));
      /*
       * **Todo con el reloj del juego.** Espera a que se cumpla algo o a que
       * pasen tantos segundos de vuelo, y no de pared. Ver la cabecera.
       */
      const hasta = async (cumple, segundos) => {
        const fin = o.reloj() + segundos;
        /*
         * Y con tope de pared, que un juego en pausa no avanza su reloj y la
         * espera no acabaría nunca. El juego va por lo menos a su paso aunque
         * la máquina vaya cargada, así que vez y media más diez segundos es
         * red, no presupuesto. Ver «Una espera sin salida».
         */
        const tope = performance.now() + (segundos * 1.5 + 10) * 1000;
        while (!cumple() && o.reloj() < fin && performance.now() < tope)
          await espera(50);
        return cumple();
      };
      const pasar = (segundos) => hasta(() => false, segundos);
      const acotar = (v, t) => Math.max(-t, Math.min(t, v));
      const cabeceo = () => {
        const q = o.estado().orientation;
        return Math.asin(2 * (q.w * q.x - q.y * q.z));
      };
      const alabeo = () => {
        const q = o.estado().orientation;
        return Math.asin(-2 * (q.x * q.y + q.w * q.z));
      };
      const vr = o.avion?.().rotacion ?? 70;
      const rumbo = o.estado().heading;
      const desvio = () => {
        let d = rumbo - o.estado().heading;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        return d;
      };
      /*
       * **El piloto del banco**, en cada fotograma.
       *
       * En el suelo, recto por la pista —rueda de morro y timón contra el
       * desvío— y a la Vr, a tirar. En el aire, alas a nivel con el rumbo de
       * la pista y el morro a diez grados, amortiguado con lo que gira, y
       * bajándolo si la velocidad cae por debajo de vez y cuarto la Vr: la
       * subida de cualquier avión, sin números de reactor.
       */
      let fase = "subir";
      o.pilotar((c) => {
        const e = o.estado();
        c.engineOn = true;
        c.throttle = 1;
        c.brakes = 0;
        if (e.onGround) {
          c.aileron = acotar(desvio() * 4, 1);
          c.rudder = acotar(desvio() * 4, 1);
          c.elevator = e.airspeed >= vr ? 0.35 : 0;
          return;
        }
        c.rudder = 0;
        const alas = acotar(desvio(), 0.25);
        c.aileron = acotar((alas - alabeo()) * 2 - e.rollRate * 0.5, 0.5);
        if (fase === "subir") {
          const lento = Math.max(0, 1.25 * vr - e.airspeed) * 0.02;
          const morro = Math.max(0.03, 0.17 - lento);
          c.elevator = acotar(1.5 * (morro - cabeceo()) - 0.8 * e.pitchRate, 0.4);
        } else {
          /*
           * Y nivelado con el morro contra la velocidad vertical, amortiguado:
           * la velocidad de un avión que sube depende del ángulo, no de la
           * resistencia, así que comparar mientras trepa mide el pulso del que
           * pilota y no el tren.
           */
          c.elevator = acotar(-e.verticalSpeed * 0.05 - e.pitchRate * 0.8, 0.3);
        }
      });
      /*
       * **Y con tiempo para llegar arriba**: tres minutos de vuelo para
       * quinientos metros sobre el suelo, que con el tren fuera el bimotor sube
       * a unos cinco metros por segundo.
       */
      const arriba = await hasta(
        () => o.estado().heightAboveGround >= 500 && !o.estado().onGround,
        180,
      );
      fase = "nivelar";
      /*
       * Se le da tiempo de verdad a asentarse, y se promedian los últimos
       * segundos: un avión que acaba de nivelar sigue moviéndose en fugoide un
       * buen rato, y una sola muestra coge la cresta o el valle. Medido con una
       * muestra suelta, el bimotor daba un uno por ciento **menos** de velocidad
       * con el tren metido — que es físicamente imposible y era el fugoide.
       */
      const asentar = async () => {
        await pasar(100);
        const ultimas = [];
        const fin = o.reloj() + 24;
        const tope = performance.now() + 60000;
        while (o.reloj() < fin && performance.now() < tope) {
          ultimas.push(o.estado().airspeed);
          await espera(50);
        }
        return ultimas.reduce((a, b) => a + b, 0) / Math.max(1, ultimas.length);
      };
      const rapidoConTren = await asentar();
      const e = o.estado();
      const volando = !e.onGround && e.heightAboveGround > 100;
      const antes = o.controles().tren;

      // Y se pide meterlo, mirando cuánto tarda **en el reloj del juego**.
      const pedido = o.reloj();
      o.tocarMando?.("tren");
      let aMedias = null;
      await hasta(() => {
        const tren = o.controles().tren;
        if (aMedias === null && tren > 0 && tren < 1) aMedias = o.reloj();
        return tren <= 0;
      }, 60);
      const dentro = o.controles().tren <= 0 ? o.reloj() : null;
      const rapidoSinTren = await asentar();
      return {
        arriba,
        volando,
        alto: Math.round(e.heightAboveGround),
        antes,
        despues: o.controles().tren,
        tarda: dentro === null ? null : dentro - pedido,
        empezo: aMedias === null ? null : aMedias - pedido,
        rapidoConTren,
        rapidoSinTren,
        patas: o.patas?.() ?? null,
      };
    });

    const etiqueta = (que) => `${id}: ${que}`;
    comprobar(
      etiqueta("despega y se pone a nivel"),
      visto.arriba && visto.volando,
      visto.volando
        ? `a ${visto.alto} m del suelo`
        : `sin volar al pedir el tren (${visto.alto} m del suelo)`,
      "sin avión en el aire no hay tren que meter: lo que falle detrás no se midió",
    );
    const medido = visto.volando;
    const siSeMidio = (ok) => medido && ok;
    const noSeMidio = "no se midió: el avión no estaba en el aire";

    if (loMete) {
      comprobar(
        etiqueta("mete el tren cuando se le pide"),
        siSeMidio(visto.antes === 1 && visto.despues === 0),
        medido ? `de ${visto.antes} a ${visto.despues}` : noSeMidio,
        "un mando que no hace nada enseña que los mandos son decoración",
      );
      /*
       * Y **tarda**, medido en el reloj del juego: de pedirlo a tenerlo dentro,
       * los diez segundos de `TARDA_EL_TREN`, y empezando a moverse enseguida.
       */
      comprobar(
        etiqueta("y tarda, que es medio mando"),
        siSeMidio(visto.tarda !== null && visto.tarda >= 8 && visto.empezo < 1),
        medido
          ? `dentro a los ${visto.tarda?.toFixed(1) ?? "—"} s de juego`
          : noSeMidio,
        "un tren instantáneo no enseña a pedirlo antes de necesitarlo",
      );
      comprobar(
        etiqueta("y con él metido el avión corre más"),
        siSeMidio(visto.rapidoSinTren > visto.rapidoConTren),
        medido
          ? `${visto.rapidoConTren.toFixed(1)} → ${visto.rapidoSinTren.toFixed(1)} m/s`
          : noSeMidio,
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
        siSeMidio(visto.antes === 1 && visto.despues === 1),
        medido ? `el tren se queda en ${visto.despues}` : noSeMidio,
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
} finally {
  await navegador.close();
  await server.close();
}

console.log("");
for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
  if (!r.ok && r.porque) console.log(`      ${r.porque}`);
}
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones\n`);
process.exit(bien === resultados.length ? 0 : 1);

/**
 * Quién habla en un vuelo, y con qué voz.
 *
 * Este banco existe por una queja que ninguna prueba podía ver:
 *
 * > «No escucho la torre ni el otro avión. La única voz es prácticamente toda
 * > de la instructora.»
 *
 * Y era verdad por dos motivos distintos, los dos invisibles desde una prueba
 * unitaria:
 *
 * 1. **La torre no hablaba.** Era una lámpara verde o roja con una palabra
 *    escrita debajo, arriba en una esquina. Quien juega tiene cuatro años y no
 *    lee — «un niño (ni yo) leemos esas etiquetitas de arriba ni por asomo».
 * 2. **Las voces no se repartían.** `elegirVoz` tenía una sola plaza de «voz
 *    cogida», así que la torre esquivaba al instructor y el otro avión también:
 *    los dos elegían la misma segunda voz y tres bocas sonaban con dos timbres.
 *
 * ## Cómo se mide
 *
 * Dos trucos, y los dos hacen falta:
 *
 * - **Voces de mentira**, puestas antes de que cargue la página. Un Chrome sin
 *   ventana no publica ninguna —«this browser has no speech voices installed»—
 *   y sin voces no habla nadie, así que el banco mediría cero siempre y no
 *   podría fallar. Se le ponen las cinco que publica un Chrome de verdad.
 * - **Se intercepta `speak`** y se apunta cada frase con su voz, su velocidad
 *   y su tono. De ahí sale quién la dijo: el instructor, la torre y el otro
 *   avión tienen timbres distintos a propósito, y eso se puede contar.
 *
 * Uso: `node scripts/verificar-quien-habla.mjs [escenario] [tramo] [avion]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = 5292;
const ESCENARIO = process.argv[2] ?? "tenerife-norte";
const TRAMO = process.argv[3] ?? "taguato";
const AVION = process.argv[4] ?? "jaz-20";

/**
 * Lo que publica un Chrome de verdad: cinco voces, dos de ellas castellanas.
 *
 * Dos para tres bocas es el caso **difícil** y por eso es el que se prueba:
 * alguien tiene que repetir, y lo que se comprueba es que el que repite no sea
 * el instructor. Ver `elegirVoz`.
 */
const VOCES = [
  ["de-DE", "Google Deutsch"],
  ["en-US", "Google US English"],
  ["es-ES", "Google español"],
  ["es-US", "Google español de Estados Unidos"],
  ["fr-FR", "Google français"],
];

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

const page = await navegador.newPage({ viewport: { width: 900, height: 600 } });
const errores = [];
page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));

await page.addInitScript((voces) => {
  localStorage.setItem("oga-veve:teclas-vistas", "1");
  // En castellano paraguayo, que es el idioma del producto y el que reparte
  // las dos voces castellanas de Chrome entre tres bocas — el caso difícil.
  localStorage.setItem("oga-veve:idioma", "es-PY");
  /*
   * Un sintetizador de mentira que no dice nada y lo apunta todo.
   *
   * Habla «instantáneamente»: dispara `start` y, un poco después, `end`. Ese
   * poco después no es cosmético — la boca (`audio/boca.ts`) no deja hablar a
   * nadie mientras haya alguien hablando, así que si las frases no terminaran
   * nunca solo se apuntaría la primera de todo el vuelo.
   */
  const dichas = [];
  globalThis.__dichas = dichas;
  const lista = voces.map(([lang, name]) => ({
    lang,
    name,
    default: false,
    localService: false,
    voiceURI: name,
  }));
  /*
   * Y la frase también es de mentira, que si no no hay manera: la de verdad
   * valida el campo `voice` contra un `SpeechSynthesisVoice` real y revienta
   * con «failed to convert value» en cuanto se le pone uno inventado.
   */
  class FraseFalsa extends EventTarget {
    constructor(texto) {
      super();
      this.text = texto ?? "";
      this.voice = null;
      this.lang = "";
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
      this.onend = null;
      this.onerror = null;
    }
  }
  Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
    value: FraseFalsa,
    configurable: true,
  });

  const falso = {
    getVoices: () => lista,
    speak(frase) {
      dichas.push({
        texto: String(frase.text ?? ""),
        voz: frase.voice?.name ?? null,
        rate: Math.round((frase.rate ?? 1) * 100) / 100,
        pitch: Math.round((frase.pitch ?? 1) * 100) / 100,
      });
      frase.dispatchEvent?.(new Event("start"));
      setTimeout(() => {
        try {
          frase.dispatchEvent?.(new Event("end"));
          frase.onend?.();
        } catch {
          /* una frase que ya no existe no puede acabar dos veces */
        }
      }, 120);
    },
    cancel() {},
    pause() {},
    resume() {},
    speaking: false,
    pending: false,
    paused: false,
    addEventListener() {},
    removeEventListener() {},
  };
  Object.defineProperty(globalThis, "speechSynthesis", {
    value: falso,
    configurable: true,
  });
}, VOCES);

await page.goto(
  `${BASE}/?escenario=${ESCENARIO}&hora=16&leccion=despegue&tramo=${TRAMO}&avion=${AVION}`,
);
await page
  .waitForFunction(() => globalThis.__oga?.estado?.(), null, { timeout: 60000 })
  .catch(() => {});
await page.waitForTimeout(1200);

/*
 * Y ahora, al punto de espera, que es donde la torre tiene algo que decir.
 *
 * **Se pone el avión ahí en vez de rodar hasta ahí**, y es a propósito: rodar
 * el campo entero es lo que mide `verificar-vuelo-entero.mjs`, y repetirlo
 * aquí sería medir dos veces lo mismo y tardar tres minutos en hacerlo. Lo que
 * se mide aquí es **quién habla**, y para eso basta con llegar a los sitios
 * donde alguien tiene algo que decir.
 *
 * El punto de espera es el final de la ruta de rodaje que dibuja el plan de
 * vuelo, así que no hay ningún número escrito a mano: se le pregunta.
 */
await page.evaluate(() => {
  const o = globalThis.__oga;
  o.acelerar(6);
});
await page.keyboard.press("KeyI");
await page.waitForTimeout(4000);
await page.evaluate(() => {
  const o = globalThis.__oga;
  const ruta = o.ruta();
  if (!ruta.length) return;
  const fin = ruta[ruta.length - 1];
  const antes = ruta[Math.max(0, ruta.length - 2)];
  const rumbo = Math.atan2(fin[0] - antes[0], -(fin[1] - antes[1]));
  o.colocar(fin[0], o.suelo(fin[0], fin[1]), fin[1], 0, rumbo);
});
// Y se espera a que el juego se entere de que hay un avión parado en el punto
// de espera: la luz de la torre la pone el bucle, no el teletransporte.
await page.waitForTimeout(25000);

const donde = await page.evaluate(() => {
  const o = globalThis.__oga;
  const s = o.estado();
  return {
    fase: o.fase(),
    ias: Math.round(s.airspeed),
    puntos: o.ruta().length,
    pos: [Math.round(s.position.x), Math.round(s.position.z)],
  };
});
console.log(`\n  dónde acabó: ${JSON.stringify(donde)}`);

/*
 * **Y se mide lo que dijo cada boca, no lo que pasó por el sintetizador.**
 *
 * Este banco escuchaba `speechSynthesis.speak`, y desde que la torre, el
 * instructor y el otro avión hablan con grabaciones, por ahí no pasa casi
 * nada: medía cero frases y fallaba siempre, que es otra forma de no tener
 * banco. Ahora se pregunta al juego qué dijo cada boca (`dichoTodo`) y con
 * qué voces grabadas lo dijo (`vocesDeCadaBoca`). Las voces de mentira de
 * arriba se quedan: cubren las frases que no están grabadas.
 */
const { dicho, voces } = await page.evaluate(() => ({
  dicho: globalThis.__oga.dichoTodo(),
  voces: globalThis.__oga.vocesDeCadaBoca(),
}));
const cuenta = Object.fromEntries(
  Object.entries(dicho).map(([q, l]) => [q, l.length]),
);
const total = Object.values(cuenta).reduce((a, n) => a + n, 0);

comprobar(
  "alguien habla",
  total > 0,
  `${total} frases`,
  "si no habla nadie, este banco no mide nada",
);

comprobar(
  "la torre habla",
  (cuenta["torre"] ?? 0) > 0,
  `${cuenta["torre"] ?? 0} frases de torre`,
  "la torre era una lámpara con una palabra escrita, y quien juega no lee",
);

const suyas = cuenta["instructor"] ?? 0;
comprobar(
  "no habla solo el instructor",
  total > 0 && suyas / total <= 0.9,
  `${suyas} de ${total} son del instructor (${Math.round((100 * suyas) / Math.max(1, total))} %)`,
  "«la única voz es prácticamente toda de la instructora»",
);

const delInstructor = new Set(voces["instructor"] ?? []);
const deLaRadio = new Set([...(voces["torre"] ?? []), ...(voces["otro"] ?? [])]);
const compartidas = [...delInstructor].filter((v) => deLaRadio.has(v));
comprobar(
  "el instructor no comparte voz con la radio",
  delInstructor.size > 0 && deLaRadio.size > 0 && compartidas.length === 0,
  `instructor ${[...delInstructor].join(", ") || "—"} · radio ${[...deLaRadio].join(", ") || "—"}`,
  "una radio en la que contesta tu propio instructor no es una radio, es un eco",
);

comprobar("sin errores", !errores.length, errores[0] ?? "limpio", "");

console.log("\n  quién habla:\n");
for (const [q, n] of Object.entries(cuenta).sort((a, b) => b[1] - a[1]))
  console.log(`  · ${q.padEnd(11)} ${String(n).padStart(3)} frases  ·  ${(voces[q] ?? []).join(", ") || "—"}`);
console.log("");
for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
  if (!r.ok && r.porque) console.log(`      ${r.porque}`);
}
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones`);

await navegador.close();
await server.close();
process.exit(bien === resultados.length ? 0 : 1);

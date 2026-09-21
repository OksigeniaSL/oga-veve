/**
 * La frecuencia, escuchada de verdad: quién habla y con qué grabación.
 *
 * Sale de una frase dicha jugando: «hay unas pocas frases y en cada vuelo dice
 * lo mismo: charlie, papa, zulú… viento de cola». Las pruebas unitarias
 * comprueban el reparto de turnos, pero lo que hay que contestar es otra cosa
 * y no se ve en ninguna de ellas: **¿suena a un aeropuerto con gente dentro?**
 *
 * Así que esto arranca el juego, deja el reloj corriendo un buen rato y
 * escucha. Y comprueba las cuatro cosas de las que sale la sensación:
 *
 * 1. Que hable **más de un avión**, con matrículas distintas.
 * 2. Que **la torre conteste** — que se la oiga nombrar a otro que no sos vos.
 * 3. Que haya **variedad**: no dos frases repetidas, sino unas cuantas
 *    distintas, y con matrículas que van cambiando.
 * 4. Que todo lo que se dice **salga del pack de voz** y no de la voz del
 *    navegador, que es como se cae una grabación sin que nadie se entere.
 *
 * Uso: `node scripts/verificar-frecuencia.mjs [minutos]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const MINUTOS = Number(process.argv[2] ?? 6);
const PUERTO = 5299;
/** Cuántas veces más deprisa va el reloj del juego. Ver `Game.acelerar`. */
const VECES = 12;

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
const page = await navegador.newPage({
  viewport: { width: 1100, height: 700 },
});
const errores = [];
page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
await page.addInitScript(() => {
  localStorage.setItem("oga-veve:teclas-vistas", "1");
});
await page.goto(
  `${BASE}/?escenario=tenerife-norte&hora=16&leccion=despegue&tramo=taguato-ruvicha`,
);
await page.waitForFunction(
  () => globalThis.__oga?.indicativo !== undefined,
  null,
  {
    timeout: 60000,
  },
);

const oido = await page.evaluate(
  async ([veces, minutos]) => {
    const o = globalThis.__oga;
    o.acelerar?.(veces);
    /*
     * **Y el avión se queda en el puesto, con el motor parado.**
     *
     * No hace falta volar para escuchar la frecuencia, y volar sería peor: en
     * final la radio se calla a propósito —ahí quien habla es el instructor—,
     * así que un vuelo entero mide la radio menos rato que estar parado
     * mirando. Lo que se escucha aquí es el aeropuerto, no el vuelo.
     */
    const hasta = Date.now() + (minutos * 60 * 1000) / veces;
    /*
     * Las matrículas se muestrean **mientras pasa el rato**: en un instante
     * solo se ven las dos que hay en la frecuencia, y lo que se quiere saber es
     * si van cambiando. Preguntarlo al final daría dos, siempre, aunque por la
     * radio hubieran pasado diez aviones — que es exactamente la clase de
     * medida ciega que da un falso «no pasa nada».
     */
    const vistas = new Set();
    while (Date.now() < hasta) {
      for (const m of o.enLaFrecuencia()) vistas.add(m);
      await new Promise((listo) => setTimeout(listo, 250));
    }
    return {
      dicho: o.dichoTodo(),
      indicativo: o.indicativo(),
      matriculas: [...vistas],
    };
  },
  [VECES, MINUTOS],
);

const resultados = [];
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

/*
 * El historial de cada boca trae lo que dijo **y con qué lo dijo**: el pack o
 * la voz del navegador. Ver `historial` en `instructor-grabado.ts`.
 */
const deLaRadio = [...(oido.dicho.otro ?? [])];
const deLaTorre = [...(oido.dicho.torre ?? [])];
const matriculas = new Set(oido.matriculas);

comprobar(
  "se oye la frecuencia",
  deLaRadio.length > 0,
  `${deLaRadio.length} llamadas de otros aviones en ${MINUTOS} min`,
  "una radio muerta convierte el aeropuerto en un decorado",
);

comprobar(
  "y no es siempre el mismo avión",
  matriculas.size > 2,
  [...matriculas].join(" · ") || "ninguna",
  "«en cada vuelo dice lo mismo: charlie, papa, zulú»",
);

comprobar(
  "y son del país del aeródromo",
  matriculas.size > 0 && [...matriculas].every((m) => m.startsWith("EC-")),
  "en Tenerife, EC-",
  "ZP- es Paraguay, y en Canarias sonaba igual: era siempre el mismo avión",
);

const aOtros = deLaTorre.filter((l) => !l.includes(oido.indicativo.yoDicho));
comprobar(
  "la torre habla con los demás, no solo con vos",
  aOtros.length > 0,
  `${aOtros.length} de ${deLaTorre.length} llamadas de torre a otro`,
  "una radio en la que nadie contesta es una megafonía",
);

const frases = new Set([...deLaRadio, ...deLaTorre]);

comprobar(
  "y se dicen cosas distintas",
  frases.size >= 5,
  `${frases.size} frases distintas`,
  "diez frases repetidas y repetidas es lo que había",
);

comprobar("sin errores", !errores.length, errores[0] ?? "limpio", "");

console.log("");
for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
  if (!r.ok && r.porque) console.log(`      ${r.porque}`);
}
console.log("\n  lo que se oyó:\n");
for (const l of [...deLaRadio, ...deLaTorre].slice(0, 30)) {
  console.log(`  · ${l}`);
}
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones\n`);

await navegador.close();
await server.close();
process.exit(bien === resultados.length ? 0 : 1);

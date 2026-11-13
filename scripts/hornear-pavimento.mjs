/**
 * Hornea la rejilla del pavimento de cada aeródromo, o comprueba la horneada.
 * Ver `src/world/pavimento-horneado.ts` y el ADR 0028.
 *
 *   npm run pavimento                      hornea todos los campos
 *   npm run pavimento -- barajas pilar     solo esos escenarios
 *   npm run pavimento -- --comprobar       compara, sin escribir nada
 *
 * ## Por qué con el juego y en un navegador
 *
 * La rejilla sale del asfalto **dibujado** sobre el relieve aplanado bajo él,
 * y eso lo hacen `aerodrome.ts` y `terrain.ts` al montar el mundo, con lo que
 * `main.ts` les da. Rehacer ese montaje aquí fuera sería escribir una segunda
 * versión del juego que tarde o temprano no daría lo mismo. Así que se abre
 * cada escenario en el propio juego, sin ventana, y se le pide la rejilla que
 * hace él: lo horneado es, por construcción, la cuenta del navegador.
 *
 * ## Y por qué comprobar
 *
 * `--comprobar` abre cada campo y compara, byte a byte, el fichero con la
 * rejilla recién hecha —huella incluida—, y mira además que el juego la haya
 * usado al arrancar. Una rejilla vieja no rompe nada —el juego la reconoce
 * por la huella y hace la cuenta—, pero deja de ahorrar, y esto es lo que lo
 * dice: sale con error si alguna no cuadra.
 *
 * Sin teselas de Google, a propósito: con ellas el aeródromo se tiende sobre
 * el suelo de la fotografía, que llega por la red y no se puede hornear.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { baseDe } from "./servidor.mjs";

const argumentos = process.argv.slice(2);
const COMPROBAR = argumentos.includes("--comprobar");
const PEDIDOS = argumentos.filter((a) => !a.startsWith("--"));
const PUERTO = Number(process.env.OGA_PUERTO ?? 5290);
const CARPETA = resolve("data/aerodromes");

// El suelo de la fotografía no se hornea: ver arriba.
process.env.VITE_GOOGLE_TILES = "";

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false, strictPort: !!process.env.OGA_PUERTO },
  logLevel: "warn",
});
await server.listen();
const BASE = baseDe(server, PUERTO);

const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
let malos = 0;
try {
  /*
   * Los escenarios con aeródromo de verdad, cada aeródromo una vez. Se le
   * preguntan al navegador y no a `ssrLoadModule`: con la máquina cargada,
   * Barajas y sus novecientos kilobytes pasaban del minuto que vite le da a
   * un módulo del lado del servidor, y el guion se caía antes de empezar.
   */
  const lista = await navegador.newPage();
  await lista.goto(`${BASE}/robots.txt`);
  const todos = await lista.evaluate(async () => {
    const { SCENARIOS, conSuAerodromo } = await import("/src/world/scenarios.ts");
    const fuera = [];
    for (const e of SCENARIOS) fuera.push({ escenario: e.id, id: (await conSuAerodromo(e)).aerodrome?.id ?? null });
    return fuera;
  });
  await lista.close();
  const campos = [];
  const vistos = new Map();
  for (const { escenario, id } of todos) {
    if (!id || (PEDIDOS.length && !PEDIDOS.includes(escenario))) continue;
    if (vistos.has(id)) {
      console.log(`  ${escenario}: ${id} ya sale de ${vistos.get(id)}`);
      continue;
    }
    vistos.set(id, escenario);
    campos.push({ escenario, id });
  }

  for (const { escenario, id } of campos) {
    const page = await navegador.newPage({ viewport: { width: 1280, height: 720 } });
    page.on("pageerror", (e) => console.log(`  ${escenario}: error en la página: ${e.message}`));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(`${BASE}/?escenario=${escenario}&leccion=despegue&meteo=`);
    await page.waitForFunction(() => !!globalThis.__oga?.estado, null, { timeout: 180000 });
    const { hecha, usada } = await page.evaluate(() => ({
      usada: globalThis.__oga.pavimentoHorneado(),
      hecha: globalThis.__oga.pavimentoParaHornear(),
    }));
    await page.close();
    const fichero = resolve(CARPETA, `${id.toLowerCase()}.pavimento.bin`);
    if (!hecha) {
      // Sin pavimento, o fuera del mapa fino: no hay nada que hornear.
      if (COMPROBAR && existsSync(fichero)) {
        console.log(`  ✗ ${escenario} (${id}): hay fichero y no debería`);
        malos++;
      } else if (!COMPROBAR && existsSync(fichero)) unlinkSync(fichero);
      console.log(`  · ${escenario} (${id}): sin rejilla que hornear`);
      continue;
    }
    const bytes = Buffer.from(hecha.base64, "base64");
    if (COMPROBAR) {
      const guardado = existsSync(fichero) ? readFileSync(fichero) : null;
      const igual = !!guardado && guardado.equals(bytes);
      if (!igual || !usada) malos++;
      console.log(
        `  ${igual && usada ? "✓" : "✗"} ${escenario} (${id}): ` +
          (!guardado
            ? "no está horneada"
            : igual
              ? `igual byte a byte a la cuenta del navegador (huella ${hecha.huella})` +
                (usada ? ", y el juego la usó al arrancar" : ", pero el juego NO la usó al arrancar")
              : `vieja: la cuenta de ahora tiene la huella ${hecha.huella}; hay que hornear`),
      );
    } else {
      // En crudo, como los relieves: se comprime al empaquetar. Ver `relievesComprimidos`.
      writeFileSync(fichero, bytes);
      console.log(
        `  ${escenario} (${id}): ${(bytes.length / 1024).toFixed(1)} KB, ` +
          `${(gzipSync(bytes, { level: 9 }).length / 1024).toFixed(1)} KB al empaquetar; huella ${hecha.huella}`,
      );
    }
  }
} finally {
  await navegador.close();
  await server.close();
}
if (COMPROBAR) {
  console.log(malos ? `\n${malos} sin cuadrar: npm run pavimento` : `\nCuadran todas.`);
  process.exit(malos ? 1 : 0);
}

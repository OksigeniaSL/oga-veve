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
import { gunzipSync, gzipSync } from "node:zlib";
import { baseDe } from "./servidor.mjs";

const argumentos = process.argv.slice(2);
const COMPROBAR = argumentos.includes("--comprobar");
const PEDIDOS = argumentos.filter((a) => !a.startsWith("--"));
const PUERTO = Number(process.env.OGA_PUERTO ?? 5289);
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

// Los escenarios con aeródromo de verdad, cada aeródromo una vez.
const { SCENARIOS, conSuAerodromo } = await server.ssrLoadModule("/src/world/scenarios.ts");
const campos = [];
const vistos = new Map();
for (const e of SCENARIOS) {
  if (PEDIDOS.length && !PEDIDOS.includes(e.id)) continue;
  const id = (await conSuAerodromo(e)).aerodrome?.id;
  if (!id) continue;
  if (vistos.has(id)) {
    console.log(`  ${e.id}: ${id} ya sale de ${vistos.get(id)}`);
    continue;
  }
  vistos.set(id, e.id);
  campos.push({ escenario: e.id, id });
}

const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
let malos = 0;
try {
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
      // Se compara lo de dentro: el gzip puede salir distinto de una versión de zlib a otra.
      const guardado = existsSync(fichero) ? gunzipSync(readFileSync(fichero)) : null;
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
      const comprimido = gzipSync(bytes, { level: 9 });
      writeFileSync(fichero, comprimido);
      console.log(
        `  ${escenario} (${id}): ${(comprimido.length / 1024).toFixed(1)} KB ` +
          `(${(bytes.length / 1024).toFixed(1)} KB sin comprimir), huella ${hecha.huella}`,
      );
    }
  }
} finally {
  await navegador.close();
  await server.close();
}
if (COMPROBAR) {
  console.log(malos ? `\n${malos} sin cuadrar: npm run pavimento` : `\nLas ${campos.length} cuadran.`);
  process.exit(malos ? 1 : 0);
}

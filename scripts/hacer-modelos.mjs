/**
 * Rehace los aviones desde sus guiones de Blender, y falla si alguno no corre.
 *
 * Existe porque pasó: al meter la fila de ventanillas en el Panambi se le quitó
 * del `import` la función `caja`, que el guion seguía usando para los asientos
 * de atrás. El guion dejó de ejecutarse —`NameError: name 'caja' is not
 * defined`— y **nadie se enteró**, porque el `.glb` de la versión anterior
 * seguía en su sitio y el juego seguía enseñándolo. Un modelo que ya no se
 * puede regenerar no es un modelo: es un binario huérfano, que es justo lo que
 * este proyecto decidió no tener cuando eligió que el guion fuera el modelo.
 *
 * No es una prueba unitaria porque no puede serlo: hace falta Blender. Y no
 * entra en el barrido porque tarda un minuto y no se rompe a menudo. Se corre
 * cuando se toca `modelos/`.
 *
 *     npm run modelos
 *
 * Comprueba tres cosas de cada avión:
 *
 * - Que el guion **corre**.
 * - Que el `.glb` que escribe cambia de fecha, o sea que se ha escrito de
 *   verdad y no se está leyendo el de antes.
 * - Que el avión mide de ancho su envergadura, que ya lo comprueba `exportar`
 *   y aquí solo se recoge.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const CARPETA = "modelos";
const guiones = readdirSync(CARPETA)
  .filter((f) => f.startsWith("jaz-") && f.endsWith(".py"))
  .sort();

if (!guiones.length) {
  console.error("  ✗ no hay ningún guion de avión en modelos/");
  process.exit(1);
}

const partes = [];
for (const guion of guiones) {
  const ruta = join(CARPETA, guion);
  let salida = "";
  let reventado = null;
  try {
    salida = execFileSync("blender", ["--background", "--python", ruta], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 300000,
    });
  } catch (e) {
    reventado = `${e.stdout ?? ""}${e.stderr ?? ""}${e.message ?? ""}`;
  }
  const texto = reventado ?? salida;
  // Blender devuelve 0 aunque el guion reviente, así que el código de salida no
  // vale: lo que dice la verdad es si escribió el fichero y qué imprimió.
  const escrito = /ESCRITO: (\S+)/.exec(texto);
  const medidas = /MEDIDAS: ([^\n]+)/.exec(texto);
  const piezas = /PIEZAS: ([^\n]+)/.exec(texto);
  const fallo =
    /(NameError|SyntaxError|AttributeError|TypeError|ImportError|SystemExit)[^\n]*/.exec(
      texto,
    );
  partes.push({
    guion,
    escrito: escrito?.[1] ?? null,
    medidas: medidas?.[1] ?? null,
    piezas: piezas?.[1] ?? null,
    fallo: fallo?.[0] ?? null,
    fresco: escrito
      ? Date.now() - statSync(escrito[1]).mtimeMs < 300000
      : false,
  });
}

let mal = 0;
for (const p of partes) {
  const bien = p.escrito && p.fresco && !p.fallo;
  if (!bien) mal++;
  console.log(
    `  ${bien ? "✓" : "✗"} ${p.guion.padEnd(22)} ${p.medidas ?? p.fallo ?? "no escribió nada"}`,
  );
  if (p.piezas) console.log(`      ${p.piezas}`);
  if (!bien && p.fallo) console.log(`      ${p.fallo}`);
}

console.log(
  `\n  ${partes.length - mal} de ${partes.length} aviones se rehacen\n`,
);
process.exit(mal === 0 ? 0 : 1);

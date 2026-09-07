/**
 * La lista de lo que hay que grabar, sacada del propio juego.
 *
 * El juego habla con la voz del navegador —«speechSynthesis»— y suena a robot.
 * Está así desde el primer día y con una salida preparada: `Instructor` es una
 * interfaz, y el resto del juego pide «decí esto» sin saber quién contesta. El
 * día que existan las grabaciones se escribe otra implementación y se cambia
 * una línea.
 *
 * Este guion prepara ese día: recorre los diccionarios y escribe la lista de
 * frases con su identificador, para grabarlas —o sintetizarlas— y devolverlas
 * como ficheros que el juego pueda buscar por nombre.
 *
 * ## Qué hace falta grabar, y qué no
 *
 * - **El instructor** habla en castellano paraguayo y es lo que sustituye al
 *   texto en el peldaño que no lee. Es lo primero y lo más importante.
 * - **La cabina** habla en inglés aeronáutico y son cantos cortos: *terrain,
 *   pull up*, *one hundred*, *V1*. No se traducen jamás, así que se graban una
 *   vez y valen para los tres idiomas.
 * - **La torre** es la misma lista de la cabina pero pasada por radio, y por
 *   eso va aparte: lo que la hace creíble no es la voz, es el filtro.
 * - **El guaraní no se sintetiza.** No hay voz de guaraní en ningún sintetizador
 *   y una voz castellana leyendo guaraní escrito suena a burla. Esas frases
 *   esperan a una persona que lo hable. Ver #6.
 *
 * Uso: `node scripts/frases-para-grabar.mjs [carpeta]`
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";

const SALIDA = process.argv[2] ?? "docs/voces";

/**
 * Qué grupos de claves habla el instructor.
 *
 * No es todo el diccionario: los créditos, los nombres de las teclas y los
 * rótulos del hangar se leen, no se oyen. Lo que se graba es **lo que se dice
 * mientras se vuela**, que es lo que alguien de cuatro años no puede leer.
 */
const HABLADOS = [
  ["vuelo", "lo que toca hacer ahora, en vuelo y en tierra"],
  ["circuito", "los cuatro tramos del circuito de tráfico"],
  ["percance", "lo que salió mal, en la pantalla de fin"],
  ["fin", "el reconocimiento al terminar"],
  ["grado", "los cuatro grados del cuaderno"],
  ["galon", "los galones que se ganan en el vuelo"],
  ["tutor", "los consejos del tutor de los primeros minutos"],
  ["mission", "las misiones"],
  ["torre", "la lámpara de la torre, dicha"],
];

/**
 * Y los cantos de cabina, que no están en el diccionario porque no se traducen.
 *
 * Viven escritos en `game.ts` y en `avisos-de-altura.ts`; aquí se listan con
 * su identificador para que las grabaciones vuelvan con nombre. Son la mitad
 * del juego que suena a avión.
 */
const CABINA = [
  ["cabina.v1", "V1", "el punto de no retorno del despegue"],
  ["cabina.vr", "Vr", "la velocidad de rotación: tirar"],
  [
    "cabina.terrainPullUp",
    "terrain, pull up",
    "aviso de terreno, el más urgente",
  ],
  ["cabina.tooLow", "too low", "vas bajo sobre el terreno"],
  ["cabina.tooFast", "too fast", "veredicto de toma rápida"],
  ["cabina.offTheRunway", "off the runway", "tomaste fuera de la pista"],
  ["cabina.airspeed", "airspeed", "vas rápido en el aire"],
  ["cabina.slowDown", "slow down", "vas rápido en el suelo"],
  [
    "cabina.tooHighComeDown",
    "too high, come down",
    "te pasaste el aro por arriba",
  ],
  ["cabina.tooLowClimb", "too low, climb", "te pasaste el aro por abajo"],
  ["cabina.obstacleAhead", "obstacle ahead", "hay un edificio delante"],
  [
    "cabina.goAround",
    "going around. good decision",
    "te fuiste al aire: bien hecho",
  ],
  ["cabina.weHaveAProblem", "we have a problem", "se rompió el avión"],
  ["cabina.fiveHundred", "five hundred", "altura de la toma, en pies"],
  ["cabina.oneHundred", "one hundred", "altura de la toma"],
  ["cabina.fifty", "fifty", "altura de la toma"],
  ["cabina.forty", "forty", "altura de la toma, en pies"],
  ["cabina.thirty", "thirty", "altura de la toma"],
  ["cabina.twenty", "twenty", "altura de la toma"],
  ["cabina.ten", "ten", "altura de la toma"],
  ["cabina.five", "five", "altura de la toma, en metros"],
];

/**
 * Y lo que dice la torre, que es lo mismo pasado por radio.
 *
 * Va aparte porque **lo que hace creíble una radio no es la voz, es el
 * filtro**: banda estrecha, un poco de saturación y el clic del final. Se
 * graba limpio y el efecto se pone después, así que estas frases se pueden
 * sacar de la misma sesión.
 */
const TORRE = [
  ["torre.clearedTakeoff", "cleared for take-off", "luz verde para despegar"],
  ["torre.clearedLand", "cleared to land", "podés volver a intentarlo"],
  ["torre.goAround", "go around, runway occupied", "la pista está ocupada"],
  ["torre.holdShort", "hold short of the runway", "pará en la doble raya"],
  ["torre.lineUpWait", "line up and wait", "entrá y esperá en el eje"],
];

const claves = (ruta) => {
  const s = readFileSync(ruta, "utf8");
  const salida = new Map();
  for (const m of s.matchAll(/"([\w.]+)":\s*\n?\s*"((?:[^"\\]|\\.)*)"/g)) {
    salida.set(m[1], m[2]);
  }
  return salida;
};

const es = claves("src/i18n/es-PY.ts");

mkdirSync(SALIDA, { recursive: true });

const filas = [];
let total = 0;
for (const [grupo, para] of HABLADOS) {
  for (const [k, v] of es) {
    if (k.split(".")[0] !== grupo) continue;
    filas.push({ id: k, idioma: "es-PY", texto: v, para });
    total += v.length;
  }
}
for (const [id, texto, para] of [...CABINA, ...TORRE]) {
  filas.push({ id, idioma: "en", texto, para });
  total += texto.length;
}

const tsv = [
  ["fichero", "idioma", "texto", "dónde suena"].join("\t"),
  ...filas.map((f) =>
    [`${f.idioma}/${f.id}.ogg`, f.idioma, f.texto, f.para].join("\t"),
  ),
].join("\n");
writeFileSync(`${SALIDA}/frases.tsv`, tsv + "\n");

// Y el mismo contenido como JSON, que es lo que leerá el juego para saber qué
// fichero suena con cada clave.
writeFileSync(`${SALIDA}/frases.json`, JSON.stringify(filas, null, 2) + "\n");

console.log(`\n  ${filas.length} frases · ${total} caracteres en total\n`);
const porIdioma = new Map();
for (const f of filas) {
  const [n, c] = porIdioma.get(f.idioma) ?? [0, 0];
  porIdioma.set(f.idioma, [n + 1, c + f.texto.length]);
}
for (const [idioma, [n, c]] of porIdioma) {
  console.log(
    `  ${idioma.padEnd(6)} ${String(n).padStart(4)} frases · ${c} caracteres`,
  );
}
console.log(
  `\n  El inglés de cabina se graba una vez y vale para los tres idiomas.\n` +
    `  El guaraní no se sintetiza: espera a una persona que lo hable (#6).\n` +
    `\n  → ${SALIDA}/frases.tsv y ${SALIDA}/frases.json\n`,
);

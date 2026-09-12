/**
 * De la lista de frases a las tomas, con ElevenLabs.
 *
 * Es el eslabón que faltaba entre `frases-para-grabar.mjs` —que dice **qué**
 * hay que grabar, y lo dice sin quedarse viejo porque lo saca del propio
 * juego— y `hacer-pack-de-voz.mjs`, que coge las tomas y hornea el pack. En
 * medio había una persona pegando ciento veintiuna frases a mano en una web.
 *
 * ## Lo que hace y lo que no
 *
 * Escribe **un fichero por frase**, con el nombre que dice la tabla, en
 * `crudo/<voz>/`. Nada más. No trata el audio, no lo convierte y no lo mete en
 * el juego: de eso se encarga el horneado, y va aparte por el motivo de
 * siempre —que la frase veintisiete suene igual dentro de un año—.
 *
 * ## La clave
 *
 * Sale del entorno, `ELEVENLABS_API_KEY`, y **no se escribe en ningún sitio ni
 * se imprime nunca**. Sin `VITE_` delante: cualquier variable con ese prefijo
 * la mete Vite dentro del paquete que se publica, o sea dentro del navegador
 * de quien juegue.
 *
 *     export ELEVENLABS_API_KEY=...
 *     node scripts/voces-elevenlabs.mjs --voces
 *     node scripts/voces-elevenlabs.mjs --cuanto
 *     node scripts/voces-elevenlabs.mjs instructor
 *
 * ## Qué voz dice cada cosa
 *
 * Cuatro voces y cada una tiene su encargo —ver `docs/voces/LEEME.md`—, así
 * que hace falta decir qué voz de la cuenta hace de cuál. Va en
 * `docs/voces/voces.json`, que es un fichero de configuración y no un secreto:
 * un identificador de voz no abre nada.
 *
 *     { "instructor": "…", "cabina": "…", "torre": "…", "otro": "…" }
 *
 * `--voces` lista las de la cuenta para poder rellenarlo.
 *
 * ## Y se puede volver a empezar
 *
 * Salta lo que ya está grabado. Una tanda de ciento veintiuna frases se corta
 * —la red, un límite de la cuenta, un Ctrl-C— y volver a lanzarlo sigue por
 * donde iba en vez de pagar otra vez lo mismo. Con `--rehacer` se fuerza.
 */
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";

const CLAVE = process.env.ELEVENLABS_API_KEY;
const API = "https://api.elevenlabs.io/v1";
/**
 * El modelo, y por qué éste.
 *
 * `eleven_multilingual_v2` es el que habla castellano sin acento de traductor
 * y el que aguanta el voseo —«arrancá», «seguí», «andá»—, que es la mitad de
 * lo que hace que esta voz suene de Paraguay y no de un doblaje. Los cantos de
 * cabina en inglés los dice igual de bien.
 */
const MODELO = "eleven_multilingual_v2";
/** Lo más alto que da la API. El horneado ya bajará lo que haga falta. */
const FORMATO = "mp3_44100_192";

const FRASES = "docs/voces/frases.json";
const VOCES = "docs/voces/voces.json";
const DESTINO = "crudo";

const args = process.argv.slice(2);
const bandera = (n) => args.includes(n);
const cuales = args.filter((a) => !a.startsWith("--"));

const hay = async (f) =>
  access(f)
    .then(() => true)
    .catch(() => false);

/** Pide algo a la API y se queja bien si falla. **Nunca imprime la clave.** */
async function pedir(ruta, opciones = {}) {
  if (!CLAVE) {
    console.error(
      "\n  Falta ELEVENLABS_API_KEY en el entorno.\n" +
        "  export ELEVENLABS_API_KEY=... y volvé a lanzarlo.\n" +
        "  (Sin VITE_ delante: eso la metería en el paquete del navegador.)\n",
    );
    process.exit(2);
  }
  const r = await fetch(`${API}${ruta}`, {
    ...opciones,
    headers: { "xi-api-key": CLAVE, ...(opciones.headers ?? {}) },
  });
  if (!r.ok) {
    const porque = await r.text().catch(() => "");
    throw new Error(`${r.status} ${r.statusText} · ${porque.slice(0, 300)}`);
  }
  return r;
}

// ── Las voces de la cuenta ────────────────────────────────────────────────

if (bandera("--voces")) {
  const r = await pedir("/voices");
  const { voices } = await r.json();
  console.log(`\n  ${voices.length} voces en la cuenta\n`);
  for (const v of voices) {
    const etiquetas = Object.values(v.labels ?? {}).join(", ");
    console.log(
      `  ${v.voice_id}  ${v.name}${etiquetas ? ` · ${etiquetas}` : ""}`,
    );
  }
  console.log(`\n  Poné los cuatro que quieras en ${VOCES}:`);
  console.log(
    '  { "instructor": "…", "cabina": "…", "torre": "…", "otro": "…" }\n',
  );
  process.exit(0);
}

// ── Qué hay que grabar ────────────────────────────────────────────────────

if (!(await hay(FRASES))) {
  console.error(
    `\n  No está ${FRASES}. Sale de:\n    node scripts/frases-para-grabar.mjs\n`,
  );
  process.exit(2);
}
const frases = JSON.parse(await readFile(FRASES, "utf8"));
const pedidas = cuales.length
  ? frases.filter((f) => cuales.includes(f.voz))
  : frases;

/*
 * **Lo que cuesta, antes de gastarlo.**
 *
 * ElevenLabs cobra por carácter, así que la cuenta se puede hacer sin llamar a
 * nadie. Va de serie y no detrás de una bandera: gastar el saldo de otro sin
 * decir cuánto es lo que no se hace.
 */
const caracteres = pedidas.reduce((n, f) => n + f.texto.length, 0);
console.log(
  `\n  ${pedidas.length} frases · ${caracteres} caracteres` +
    `${cuales.length ? ` · solo ${cuales.join(", ")}` : ""}`,
);
for (const v of [...new Set(pedidas.map((f) => f.voz))]) {
  const suyas = pedidas.filter((f) => f.voz === v);
  const n = suyas.reduce((a, f) => a + f.texto.length, 0);
  console.log(
    `    ${v.padEnd(12)} ${String(suyas.length).padStart(3)} frases · ${String(n).padStart(5)} caracteres`,
  );
}
if (bandera("--cuanto")) {
  console.log("\n  (solo la cuenta: no se ha pedido nada)\n");
  process.exit(0);
}

// ── Quién dice qué ────────────────────────────────────────────────────────

if (!(await hay(VOCES))) {
  console.error(
    `\n  Falta ${VOCES}, que dice qué voz de la cuenta hace de cuál.\n` +
      `  Listá las tuyas con:  node scripts/voces-elevenlabs.mjs --voces\n`,
  );
  process.exit(2);
}
const quienDice = JSON.parse(await readFile(VOCES, "utf8"));
const sinVoz = [...new Set(pedidas.map((f) => f.voz))].filter(
  (v) => !quienDice[v],
);
if (sinVoz.length) {
  console.error(`\n  Sin voz asignada en ${VOCES}: ${sinVoz.join(", ")}\n`);
  process.exit(2);
}

// ── A grabar ──────────────────────────────────────────────────────────────

console.log("");
let hechas = 0;
let saltadas = 0;
for (const f of pedidas) {
  const destino = join(DESTINO, f.voz, `${f.id}.mp3`);
  if (!bandera("--rehacer") && (await hay(destino))) {
    saltadas++;
    continue;
  }
  await mkdir(dirname(destino), { recursive: true });
  process.stdout.write(`  ${f.voz}/${f.id} … `);
  try {
    const r = await pedir(
      `/text-to-speech/${quienDice[f.voz]}?output_format=${FORMATO}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: f.texto, model_id: MODELO }),
      },
    );
    await writeFile(destino, Buffer.from(await r.arrayBuffer()));
    hechas++;
    console.log("ok");
  } catch (e) {
    console.log(`✗ ${e.message}`);
    console.error(
      `\n  Se corta aquí. Lo ya grabado se queda: volvé a lanzarlo y sigue\n` +
        `  por donde iba, sin pagar dos veces lo mismo.\n`,
    );
    process.exit(1);
  }
}

console.log(
  `\n  ${hechas} grabadas, ${saltadas} ya estaban · en ${DESTINO}/\n` +
    `  Y ahora el horneado, una voz por vez:\n` +
    `    node scripts/hacer-pack-de-voz.mjs ${DESTINO}/instructor instructor\n`,
);

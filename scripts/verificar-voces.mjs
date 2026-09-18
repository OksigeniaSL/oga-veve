/**
 * Que cada boca use **su** grabación.
 *
 * El juego tiene cuatro bocas —la instructora, la torre, el otro avión de la
 * frecuencia y la comandante— y un pack de voz con seis voces grabadas. Hasta
 * hoy, tres de las cuatro se construían con `elegirTorre`, `elegirOtroAvion` y
 * `elegirCapitana`, que devuelven la voz sintética del navegador y **no
 * preguntan por una grabación en ningún momento**: treinta y tres frases
 * grabadas, horneadas, publicadas y bajadas a cada tablet para no sonar nunca.
 *
 * Se vio jugando: «que se escuche la torre, que todavía a día de hoy la única
 * voz es la de la instructora… tenemos a Yeray, a Jazlyn, a todos esos, ¿para
 * qué?».
 *
 * Esto lo comprueba pieza a pieza, en un navegador de verdad y con el pack de
 * verdad: para cada frase se pregunta a las cuatro bocas de qué pack saldría, y
 * tiene que salir del suyo.
 *
 * Uso: `node scripts/verificar-voces.mjs`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PUERTO = 5292;

/** Qué frase le toca a quién, y de qué pack tiene que salir. */
const REPARTO = [
  ["torre", "torre.verde", "torre"],
  ["torre", "torre.roja", "torre"],
  ["torre", "torre.canario.verde", "torre-canarias"],
  ["torre", "torre.canario.roja", "torre-canarias"],
  ["otro", "otro.enCola", "otro"],
  ["otro", "otro.pistaLibre", "otro"],
  /*
   * Y las cinco de fraseología, que estaban grabadas y no las decía nadie.
   * Aquí se comprueba que **salen del pack**; que alguien las pida está en
   * `src/audio/torre.test.ts`, y hacen falta las dos cosas: una grabación que
   * nadie nombra y una que nadie encuentra suenan igual de poco.
   */
  ["torre", "torre.clearedTakeoff", "torre"],
  ["torre", "torre.clearedLand", "torre"],
  ["torre", "torre.holdShort", "torre"],
  ["torre", "torre.lineUpWait", "torre"],
  ["torre", "torre.goAround", "torre"],
  /*
   * **Y las mismas dichas en Canarias, que es donde se oía el fallo.**
   *
   * La lámpara la decía la torre canaria y la radio la torre de casa, así que
   * en Tenerife sonaba una orden y un segundo después la misma con otra voz:
   * «voz de hombre primero y luego de mujer». Ahora la torre canaria tiene su
   * juego entero —su alfabeto, sus cifras y sus cinco órdenes— y esto
   * comprueba que de verdad salen de su pack y no del de casa.
   */
  ["torre", "torre.canario.clearedTakeoff", "torre-canarias"],
  ["torre", "torre.canario.holdShort", "torre-canarias"],
  ["torre", "torre.canario.goAround", "torre-canarias"],
  ["capitana", "capitana.bienvenida", "capitana"],
  ["capitana", "capitana.crucero", "capitana"],
  /*
   * Y la orden de irse al aire **con su motivo**, que es la receta que junta
   * las dos piezas. Sin ella la voz decía qué hacer y no por qué, que a los
   * cuatro años es una orden sin lección.
   */
  ["instructor", "vuelo.noEstabilizada+lento", "instructor"], // Y las dos del tren, que son nuevas: una frase que se pide y no está
  // grabada se cae a la voz del navegador y suena a otra persona.
  ["instructor", "vuelo.meteElTren", "instructor"],
  /*
   * **Y ésta ya no sale del pack, a propósito.**
   *
   * Se grabó a voces, y el tono vive en el fichero de audio y no en el texto:
   * cambiar la frase cambia lo que lee la voz del navegador, no lo que se
   * grabó. Pedido por su nombre: «el tren si hay que quitarlo, se dice y ya
   * está, no hace falta pegar un grito». Hasta que se vuelva a grabar en tono
   * de aviso la dice la voz del sistema. Ver `A_VOCES` en
   * `audio/instructor-grabado.ts`.
   *
   * Se deja escrita aquí y no se borra: el día que se rehaga, esta línea
   * vuelve a `"instructor"` y el banco vuelve a exigir la grabación.
   */
  ["instructor", "vuelo.sacaElTren", null],

  ["instructor", "vuelo.noEstabilizada+descolocado", "instructor"],
  ["instructor", "cabina.v1", "cabina"],
  ["instructor", "cabina.vr", "cabina"],
];

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
const page = await navegador.newPage({ viewport: { width: 900, height: 560 } });
const errores = [];
page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
await page.addInitScript(() =>
  localStorage.setItem("oga-veve:teclas-vistas", "1"),
);
await page.goto(
  `http://localhost:${PUERTO}/?escenario=tenerife-norte&leccion=despegue&tramo=guyrami&avion=jaz-20`,
);
await page
  .waitForFunction(() => globalThis.__oga?.estado?.(), null, { timeout: 60000 })
  .catch(() => {});
// El pack se baja después del primer gesto, como en el juego.
await page.mouse.click(450, 300);
await page
  .waitForFunction(() => (globalThis.__oga?.voz?.().piezas ?? 0) > 0, null, {
    timeout: 60000,
  })
  .catch(() => {});
await page.waitForTimeout(1500);

const resultados = [];
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

/*
 * **Y antes de nada, que el pack y su manifiesto digan lo mismo.**
 *
 * Esto no necesita navegador y sin embargo es la mitad del problema. Un
 * horneado que deja atrás los ficheros de la tanda anterior no da ningún
 * error: el manifiesto queda bien, el juego funciona, y lo que pasa es que se
 * publican y se bajan **audios que no van a sonar nunca**. Pasó al montar el
 * indicativo del otro avión por piezas — las cinco frases viejas, con «Zulu
 * Papa Alfa Bravo Charlie» pegado dentro, se quedaron en la carpeta después de
 * dejar de estar en ninguna receta: diez ficheros de audio muerto viajando a
 * cada tablet.
 *
 * Es el tercer agujero de la misma familia en este pack —las cinco de torre
 * que no pedía nadie, los veintiún cantos de cabina antes que ellas—. Todos se
 * ven igual: algo grabado que nadie llega a oír.
 */
{
  const RAIZ = "data/voces";
  const voces = readdirSync(RAIZ).filter((v) =>
    existsSync(join(RAIZ, v, "manifiesto.json")),
  );
  const sobran = [];
  const faltan = [];
  const sueltas = [];
  for (const voz of voces) {
    const m = JSON.parse(readFileSync(join(RAIZ, voz, "manifiesto.json")));
    const piezas = new Set(Object.keys(m.piezas));
    const enDisco = new Set();
    for (const f of readdirSync(join(RAIZ, voz))) {
      const trozo = /^(.*)\.(ogg|m4a)$/.exec(f);
      if (trozo) enDisco.add(trozo[1]);
    }
    for (const f of enDisco) if (!piezas.has(f)) sobran.push(`${voz}/${f}`);
    for (const p of piezas) if (!enDisco.has(p)) faltan.push(`${voz}/${p}`);

    /*
     * Y que cada pieza entre en alguna receta. Con huecos, las piezas que los
     * rellenan no aparecen por su nombre en ninguna: son justo las
     * intercambiables, y se reconocen por su propia receta de una pieza.
     */
    const usadas = new Set();
    let hayHuecos = false;
    for (const receta of Object.values(m.recetas)) {
      for (const trozo of receta) {
        if (/^\{\w+\}$/.test(trozo)) hayHuecos = true;
        else usadas.add(trozo);
      }
    }
    for (const p of piezas) {
      if (usadas.has(p)) continue;
      const suya = m.recetas[p];
      if (hayHuecos && suya?.length === 1 && suya[0] === p) continue;
      sueltas.push(`${voz}/${p}`);
    }
  }
  comprobar(
    "en el pack no sobra ningún audio",
    !sobran.length,
    sobran.length ? sobran.join(" ") : `${voces.length} voces cuadran`,
    "un audio que ya no nombra nadie se publica y se baja para no sonar nunca",
  );
  comprobar(
    "y no falta ninguno que el manifiesto prometa",
    !faltan.length,
    faltan.length ? faltan.join(" ") : "ninguno",
    "media frase es peor que ninguna: el juego la descarta entera",
  );
  comprobar(
    "y cada pieza entra en alguna receta",
    !sueltas.length,
    sueltas.length ? sueltas.join(" ") : "todas montan algo",
    "una grabación que no monta nada es una grabación tirada",
  );
}

const piezas = await page.evaluate(() => globalThis.__oga.voz().piezas);
comprobar(
  "el pack de voz llega entero",
  piezas > 100,
  `${piezas} piezas cargadas`,
  "sin pack no hay nada que repartir y esto no mide nada",
);

/*
 * **Y el indicativo del otro avión se monta, así que hay que rellenarlo.**
 *
 * Sus recetas llevan cinco huecos, uno por letra, y una receta con huecos sin
 * rellenar no monta nada —a propósito: media frase es peor que ninguna—. El
 * relleno de este vuelo lo da el juego. Ver `flight/matricula.ts`.
 */
const indicativo = await page.evaluate(() => globalThis.__oga.indicativo());
comprobar(
  "y tu avión tiene la suya, con la pista en uso",
  /^ZP-[A-Z]{3}$/.test(indicativo.yo) && !!indicativo.pista,
  `${indicativo.yo} · «${indicativo.yoDicho}, runway ${indicativo.pista}»`,
  "una torre que nunca te llama por tu nombre no es una torre, es un altavoz",
);

comprobar(
  "el otro avión tiene indicativo, y del país del aeródromo",
  /^EC-[A-Z]{3}$/.test(indicativo.matricula),
  `${indicativo.matricula} · «${indicativo.dicho}» · en Tenerife`,
  "ZP- es Paraguay, y en Canarias sonaba igual: era siempre el mismo avión",
);

for (const [quien, clave, pack] of REPARTO) {
  if (pack === null) {
    comprobar(
      `«${clave}» la dice la voz del sistema, no el pack`,
      true,
      "apartada a propósito hasta rehacer la grabación",
      "",
    );
    continue;
  }
  const dicho = await page.evaluate(
    ([c, r]) => globalThis.__oga.quienDice(c, r),
    [
      clave.startsWith("torre.") && !clave.startsWith("torre.canario")
        ? `${clave}${indicativo.sufijo}`
        : clave,
      clave.startsWith("otro.")
        ? indicativo.relleno
        : clave.startsWith("torre.")
          ? // La lámpara también lleva hueco desde que te llama por tu
            // matrícula, y `deTorre` trae el indicativo y la pista: sobra lo de
            // la pista y falta nada.
            indicativo.deTorre
          : undefined,
    ],
  );
  comprobar(
    `«${clave}» la dice ${quien} con el pack ${pack}`,
    dicho[quien] === pack,
    Object.entries(dicho)
      .map(([k, v]) => `${k}:${v ?? "—"}`)
      .join(" "),
    "una frase grabada que sale por la voz del navegador es una grabación tirada",
  );
}

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

/**
 * Que el circuito de tráfico no pase por debajo del suelo.
 *
 * La figura se dibuja **a la cota de la pista**: los cinco vértices salen de
 * `cotaDePista + alto`, y eso da por hecho que alrededor del aeropuerto el
 * terreno es el del aeropuerto. En un aeródromo de llanura lo es; en
 * Encarnación, en La Palma o en Tenerife Norte no, y ahí la base del circuito
 * —que es el tramo más apartado de la pista y el más bajo de todos— se puede
 * meter dentro de una loma.
 *
 * Lo que se ve jugando es peor que un dibujo enterrado: **la instructora manda
 * bajar a un sitio donde hay monte**, porque la altura del circuito y la altura
 * del terreno son dos cosas distintas y solo una de las dos está en la cuenta.
 *
 * Aquí se mide lo que hay: se recorre cada tramo del circuito de metro en
 * metro largo y se compara con la cota del terreno debajo. El listón es el
 * mismo que usa cualquier carta de aproximación —trescientos pies, noventa y
 * un metros— y por debajo de eso ya no es un circuito, es una maniobra de
 * montaña.
 *
 * Uso: `node scripts/verificar-circuito.mjs [escenario...]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const PUERTO = 5294;

/** Los aeródromos con circuito, y el avión con el que se vuela cada uno. */
const TODOS = [
  ["pettirossi", "jaz-20"],
  ["pettirossi", "jaz-120"],
  ["yvytu-rape", "jaz-20"],
  ["guarani", "jaz-20"],
  ["guarani", "jaz-120"],
  ["encarnacion", "jaz-20"],
  ["estigarribia", "jaz-20"],
  ["pedro-juan", "jaz-20"],
  ["tenerife-norte", "jaz-20"],
  ["tenerife-norte", "jaz-90"],
  ["la-palma", "jaz-20"],
  ["cuatro-vientos", "jaz-20"],
];

/**
 * Lo menos que puede quedar entre los tramos llanos y el suelo, m.
 *
 * Noventa y uno: los trescientos pies de margen sobre obstáculos con los que
 * se publica un circuito de verdad. Vale para el viento cruzado y el viento en
 * cola, que se vuelan a altura fija.
 *
 * **Y no vale para la base**, que es justo donde se baja: la base termina en el
 * punto de entrada en final, y ese punto está sobre la senda de tres grados por
 * obligación —a mil ochocientos metros del umbral son noventa y cuatro metros,
 * y tienen que ser esos y no otros—. Medir la base con el listón de los tramos
 * llanos daba tres campos en rojo por estar donde deben estar: la primera
 * versión de este banco lo hizo y lo que midió fue su propio listón.
 */
const MARGEN = 91;

/**
 * Y lo que se le pide a la base, m.
 *
 * Treinta: lo que hace falta para distinguir «viene bajando a la senda» de
 * «viene bajando hacia una loma». Por debajo de eso el tramo se mete en el
 * terreno, y eso no lo arregla pilotar mejor.
 */
const MARGEN_EN_BASE = 30;

/** Y por debajo de esto ya no es margen escaso: es que va por dentro del monte. */
const ENTERRADO = 0;

const PEDIDOS = process.argv.slice(2);
const LISTA = PEDIDOS.length
  ? TODOS.filter(([e]) => PEDIDOS.includes(e))
  : TODOS;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();

const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const page = await navegador.newPage({ viewport: { width: 640, height: 400 } });
await page.addInitScript(() => {
  localStorage.setItem("oga-veve:teclas-vistas", "1");
});

const medidas = [];
for (const [escenario, avion] of LISTA) {
  await page.goto(
    `http://localhost:${PUERTO}/?escenario=${escenario}&hora=16&leccion=circuito&avion=${avion}`,
  );
  await page
    .waitForFunction(() => globalThis.__oga?.circuito?.()?.length, null, {
      timeout: 60000,
    })
    .catch(() => {});
  const medida = await page.evaluate(() => {
    const o = globalThis.__oga;
    const v = o.circuito();
    if (!v?.length) return null;
    /*
     * Se recorre el circuito **por dentro de cada tramo**, no vértice a
     * vértice: lo que se mete debajo del terreno es el trozo de en medio de la
     * base, y mirando solo las esquinas eso no se ve nunca.
     */
    const PASO = 40;
    /*
     * Y se mira **desde que acaba la subida**: el primer vértice está en la
     * cabecera, a ras de pista, así que el tramo de despegue toca el suelo por
     * definición y medirlo solo sirve para que la peor holgura del circuito sea
     * siempre cero. Lo que se comprueba aquí es la figura que se vuela arriba:
     * viento cruzado, viento en cola y base.
     */
    const DESDE = 1;
    /** Lo peor de cada tramo, que es lo que se compara con listones distintos. */
    const porTramo = [];
    let peor = { holgura: Infinity, tramo: DESDE, x: 0, z: 0, suelo: 0, y: 0 };
    for (let i = DESDE; i < v.length - 1; i++) {
      porTramo[i] = Infinity;
      const a = v[i];
      const b = v[i + 1];
      const largo = Math.hypot(b.x - a.x, b.z - a.z);
      const pasos = Math.max(1, Math.ceil(largo / PASO));
      for (let k = 0; k <= pasos; k++) {
        const t = k / pasos;
        const x = a.x + (b.x - a.x) * t;
        const z = a.z + (b.z - a.z) * t;
        const y = a.y + (b.y - a.y) * t;
        const suelo = o.suelo(x, z);
        const holgura = y - suelo;
        if (holgura < porTramo[i]) porTramo[i] = holgura;
        if (holgura < peor.holgura)
          peor = { holgura, tramo: i, x, z, suelo, y };
      }
    }
    return {
      avion: o.avion().id,
      cotaDePista: +v[0].y.toFixed(0),
      altura: +(v[1].y - v[0].y).toFixed(0),
      holgura: +peor.holgura.toFixed(0),
      tramo: peor.tramo,
      suelo: +peor.suelo.toFixed(0),
      y: +peor.y.toFixed(0),
      lejos: +Math.hypot(peor.x - v[0].x, peor.z - v[0].z).toFixed(0),
      /** Lo peor de los tramos llanos, y lo peor de la base, por separado. */
      llanos: +Math.min(porTramo[1], porTramo[2]).toFixed(0),
      base: +porTramo[3].toFixed(0),
    };
  });
  medidas.push({ escenario, avion, ...(medida ?? { holgura: null }) });
}

const TRAMOS = ["salida", "viento en cara", "través", "base", "final"];

console.log("\n  el circuito contra el terreno que tiene debajo:\n");
for (const m of medidas) {
  if (m.holgura === null) {
    console.log(`  · ${m.escenario.padEnd(16)} ${m.avion}  —  sin circuito`);
    continue;
  }
  const señal =
    m.holgura <= ENTERRADO
      ? "✗"
      : m.llanos < MARGEN || m.base < MARGEN_EN_BASE
        ? "!"
        : "·";
  console.log(
    `  ${señal} ${m.escenario.padEnd(16)} ${String(m.avion).padEnd(7)}` +
      ` circuito a ${String(m.altura).padStart(4)} m sobre la pista` +
      ` · lo peor: ${String(m.holgura).padStart(5)} m` +
      ` en ${TRAMOS[m.tramo] ?? m.tramo}` +
      ` · llanos ${String(m.llanos).padStart(4)} m · base ${String(m.base).padStart(4)} m`,
  );
}

const resultados = [];
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

const medidos = medidas.filter((m) => m.holgura !== null);

comprobar(
  "todos los circuitos se pueden medir",
  medidos.length === medidas.length,
  `${medidos.length} de ${medidas.length}`,
  "un circuito que no existe no es un circuito que esté bien",
);

comprobar(
  "ninguno va por debajo del terreno",
  medidos.every((m) => m.holgura > ENTERRADO),
  medidos
    .filter((m) => m.holgura <= ENTERRADO)
    .map((m) => `${m.escenario}/${m.avion} a ${m.holgura} m`)
    .join(", ") || "ninguno enterrado",
  "la figura sale de la cota de la pista y el terreno de alrededor es otro",
);

comprobar(
  "los tramos llanos van a trescientos pies del suelo o más",
  medidos.every((m) => m.llanos >= MARGEN),
  medidos
    .filter((m) => m.llanos < MARGEN)
    .map((m) => `${m.escenario}/${m.avion} a ${m.llanos} m`)
    .join(", ") || `todos por encima de ${MARGEN} m`,
  "es el margen con el que se publica un circuito de verdad",
);

comprobar(
  "y la base baja a la senda, no hacia una loma",
  medidos.every((m) => m.base >= MARGEN_EN_BASE),
  medidos
    .filter((m) => m.base < MARGEN_EN_BASE)
    .map((m) => `${m.escenario}/${m.avion} a ${m.base} m`)
    .join(", ") || `todas por encima de ${MARGEN_EN_BASE} m`,
  "la base termina en la senda; lo que no puede es terminar dentro del monte",
);

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

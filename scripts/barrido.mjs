/**
 * El barrido: el vuelo entero, por todos los aeropuertos, de una vez.
 *
 * Los bancos de este proyecto se corrían a mano y de uno en uno, y eso tiene
 * un coste que no se ve en ningún sitio: **lo que cuesta correrlos decide lo
 * que se comprueba**. Un banco de ocho minutos por escenario, por nueve
 * escenarios, son casi dos horas — así que en la práctica se corrían dos o
 * tres, los de siempre, y los demás se miraban el día que ya había un fallo
 * que buscar. Justo al revés de para lo que sirve un banco.
 *
 * Con el reloj del juego acelerado —ver `Game.acelerar`— un vuelo entero cabe
 * en poco más de un minuto, y entonces el barrido entero es un café. Esto es
 * lo que lo junta: los lanza **de uno en uno** y saca una tabla.
 *
 * De uno en uno y no a la vez, y no por prudencia: ya se midió. Seis pestañas
 * de Chrome con WebGL por software peleándose por la máquina daban La Palma a
 * 7 de 13 y Encarnación en blanco; los mismos dos, corridos solos, 17 de 18 y
 * 18 de 18. Un banco que falla según lo que más haya abierto no mide el juego,
 * mide el ordenador.
 *
 * Uso: `node scripts/barrido.mjs [veces] [escenario...]`
 */
import { spawn } from "node:child_process";

/** Los que tienen aeropuerto, que son los que se pueden volar enteros. */
const TODOS = [
  ["pettirossi", "guyrami"],
  ["yvytu-rape", "guyrami"],
  ["guarani", "taguato"],
  ["encarnacion", "guyrami"],
  ["estigarribia", "guyrami"],
  ["pedro-juan", "guyrami"],
  ["tenerife-norte", "guyrami"],
  ["la-palma", "taguato"],
  ["cuatro-vientos", "guyrami"],
];

const VECES = Number(process.argv[2] ?? 12);
const PEDIDOS = process.argv.slice(3);
const LISTA = PEDIDOS.length
  ? TODOS.filter(([e]) => PEDIDOS.includes(e))
  : TODOS;

/** Saca «14 de 18» del parte que imprime el banco. */
const cuenta = (salida) => {
  const m = /(\d+) de (\d+) comprobaciones/.exec(salida);
  return m ? { bien: +m[1], total: +m[2] } : null;
};

/**
 * Cuánto del vuelo se pasa rodando.
 *
 * Es el número que el barrido está aquí para enseñar, y no cabía en ningún
 * banco suelto: cada uno mira su aeropuerto y dice si el rodaje «no se
 * dispara», pero lo que se ve al ponerlos en fila es otra cosa —que en los
 * campos grandes el rodaje **es** el vuelo—. Medido en Pettirossi: 75 s de
 * ida, 276 de vuelta y 500 de vuelo entero. Siete de cada diez minutos
 * rodando, para alguien que tiene cuatro años y quiere volar.
 */
const rodando = (salida) => {
  const ida = /(\d+) s del puesto al punto de espera/.exec(salida);
  const vuelta = /(\d+) s y (\d+) m de la pista al puesto/.exec(salida);
  const total = /acabó en «[^»]+» a los (\d+) s/.exec(salida);
  if (!ida || !vuelta || !total) return null;
  const suma = +ida[1] + +vuelta[1];
  return { ida: +ida[1], vuelta: +vuelta[1], total: +total[1], suma };
};

/** Y la línea del final del vuelo, que es lo que dice dónde se quedó. */
const comoAcabo = (salida) => {
  const m = /acabó en «([^»]+)» a los (\d+) s([^\n]*)/.exec(salida);
  return m
    ? `${m[1]} a los ${m[2]} s${m[3].includes("percance") ? " · percance" : ""}`
    : "—";
};

const partes = [];
const empezoTodo = Date.now();

for (const [escenario, tramo] of LISTA) {
  process.stdout.write(`  · ${escenario} (${tramo})… `);
  const empezo = Date.now();
  const salida = await new Promise((listo) => {
    let texto = "";
    const hijo = spawn(
      process.execPath,
      ["scripts/verificar-vuelo-entero.mjs", escenario, tramo, String(VECES)],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    hijo.stdout.on("data", (b) => (texto += b));
    hijo.stderr.on("data", (b) => (texto += b));
    hijo.on("close", () => listo(texto));
  });
  const minutos = (Date.now() - empezo) / 60000;
  const c = cuenta(salida);
  partes.push({
    escenario,
    tramo,
    c,
    minutos,
    fin: comoAcabo(salida),
    rodaje: rodando(salida),
    salida,
  });
  console.log(
    c
      ? `${c.bien} de ${c.total} · ${minutos.toFixed(1)} min`
      : `sin parte · ${minutos.toFixed(1)} min`,
  );
}

// ── La tabla ──────────────────────────────────────────────────────────────

console.log(`\n  barrido · vuelo entero · reloj ×${VECES}\n`);
const ancho = Math.max(...partes.map((p) => p.escenario.length));
for (const p of partes) {
  const marca = p.c && p.c.bien === p.c.total ? "✓" : "✗";
  const cuantas = p.c ? `${p.c.bien} de ${p.c.total}` : "sin parte";
  console.log(
    `  ${marca} ${p.escenario.padEnd(ancho)}  ${cuantas.padStart(9)}  ${p.minutos.toFixed(1).padStart(5)} min  ${p.fin}`,
  );
}

/*
 * Y debajo, **lo que falló, con su motivo**. Una tabla de cruces dice que hay
 * un problema y no dice cuál, y entonces hay que volver a correr el banco a
 * mano para verlo: o sea, el barrido no ha ahorrado nada.
 */
console.log("\n  y cuánto de cada vuelo se pasa rodando:\n");
for (const p of partes) {
  const r = p.rodaje;
  if (!r) {
    console.log(`  · ${p.escenario.padEnd(ancho)}  no llegó a terminar`);
    continue;
  }
  const parte = Math.round((100 * r.suma) / Math.max(1, r.total));
  console.log(
    `  · ${p.escenario.padEnd(ancho)}  ida ${String(r.ida).padStart(3)} s` +
      ` · vuelta ${String(r.vuelta).padStart(3)} s` +
      ` · vuelo ${String(r.total).padStart(3)} s` +
      `  →  ${String(parte).padStart(3)} % rodando`,
  );
}

const malos = partes.filter((p) => !p.c || p.c.bien !== p.c.total);
for (const p of malos) {
  console.log(`\n  ── ${p.escenario} ──`);
  for (const linea of p.salida.split("\n")) {
    if (linea.includes("✗")) console.log(`  ${linea.trim()}`);
  }
}

const total = (Date.now() - empezoTodo) / 60000;
const bien = partes.filter((p) => p.c && p.c.bien === p.c.total).length;
console.log(
  `\n  ${bien} de ${partes.length} escenarios limpios · ${total.toFixed(1)} min en total\n`,
);
process.exit(bien === partes.length ? 0 : 1);

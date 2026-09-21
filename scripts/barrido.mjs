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
  /*
   * **Y el mismo campo en Tukã**, que era el único peldaño sin vigilancia.
   *
   * No es repetir escenario: es repetir **modelo de vuelo**. Guyrami usa el
   * sencillo y Tukã el de coeficientes, y los dos fallos que tenía este piloto
   * —sostener la velocidad de subida sin subir, y apuntar la senda al filo del
   * umbral— solo se veían en el segundo. En el primero el avión sube solo con
   * el gas a fondo y perdona el aterrizaje corto.
   */
  ["tenerife-norte", "tuka"],
  ["la-palma", "taguato"],
  /*
   * **Y los canarios nuevos, los cinco.**
   *
   * Tenerife Sur y Lanzarote son los dos campos a ras de mar del archipiélago
   * —64 y 14 metros de cota contra los 632 de Los Rodeos—, y eso cambia la
   * carrera de despegue y la de frenada sin cambiar nada más. El Hierro y La
   * Gomera son los dos pequeños, que es el otro extremo.
   *
   * **Y Gran Canaria, que estuvo fuera y ya no tiene por qué.** Se quedó
   * apartada con el rodaje de vuelta en 4.206 metros y 384 segundos —el #156—,
   * y eso resultó no ser del campo: el plan elegía puesto comparando viajes
   * medidos con `Ruta.largo`, que decía metros y devolvía el coste de Dijkstra,
   * con la pista multiplicada por seis. Arreglado eso, vuela 15 de 15.
   */
  ["tenerife-sur", "guyrami"],
  ["gran-canaria", "guyrami"],
  ["el-hierro", "guyrami"],
  ["la-gomera", "guyrami"],
  ["lanzarote", "guyrami"],
  ["fuerteventura", "guyrami"],
  ["cuatro-vientos", "guyrami"],
  /*
   * **Y un avión grande, que era el otro hueco.**
   *
   * La flota pasó de dos aviones a seis y este barrido seguía volando el
   * primero en los diez escenarios. El turbohélice cruza el umbral a cuarenta
   * y ocho metros por segundo contra los treinta y tres de la avioneta, pesa
   * cinco veces más y gira mucho peor en la plataforma: nada de lo que este
   * banco mide —el rodaje, la senda, la toma, la frenada— se comporta igual.
   *
   * En Guyrami y no en Taguato, y **eso es un hallazgo apuntado, no una
   * elección**: con el modelo de coeficientes y cualquier capa de asistencia
   * puesta, el turbohélice se come los 3.400 metros de Tenerife Norte sin
   * despegar. Sin ninguna ayuda vuela; con las de Tukã o las de Taguato, no.
   * Está medido y sin explicar en #158.
   */
  ["tenerife-norte", "guyrami", "jaz-60"],
];

const VECES = Number(process.argv[2] ?? 12);

/**
 * Los escenarios que no se pueden medir con el reloj a tope, y a cuánto van.
 *
 * **El reloj acelerado no acelera todo por igual.** El vuelo va doce veces
 * más rápido; hablar, no — una frase dura lo que dura. Así que a ×12 la boca
 * tiene doce veces menos hueco para decir lo mismo, y en un campo corto y
 * con tráfico la cola se satura: la torre se queda esperando turno y el banco
 * lo cuenta como que la torre no habla.
 *
 * Medido en La Palma con el mismo código el mismo día: **a ×12, 22 de 23; a
 * ×4, 23 de 23**. No es del juego, es del cronómetro. Y bajar el reloj de
 * todo el barrido para esto sería triplicar la media hora que tarda.
 *
 * Así que el que lo necesita va más despacio y aquí queda escrito por qué.
 * Ver `CADUCA` en `audio/boca.ts`.
 */
const A_SU_RITMO = { "la-palma": 4 };
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
  /*
   * **Y esta lectura se había quedado ciega sin que nadie lo notara.**
   *
   * El banco medía el rodaje de vuelta contra la línea recta y decía «81 s y
   * 798 m de la pista al puesto»; al arreglar #166 pasó a medirlo contra la
   * ruta que el juego dibuja —que es lo correcto— y con ello cambió la frase.
   * Aquí seguía el patrón viejo, así que la tabla de «cuánto se pasa rodando»
   * llevaba desde entonces imprimiendo «no llegó a terminar» en los diecisiete
   * escenarios, incluidos los que terminaban perfectamente.
   *
   * Es la misma trampa de siempre: un instrumento que deja de ver no falla,
   * simplemente calla, y un silencio se lee como «no hay nada que contar».
   */
  const vuelta = /· (\d+) m rodados sobre (\d+) trazados · (\d+) s/.exec(salida);
  const total = /acabó en «[^»]+» a los (\d+) s/.exec(salida);
  if (!ida || !vuelta || !total) return null;
  const suma = +ida[1] + +vuelta[3];
  return { ida: +ida[1], vuelta: +vuelta[3], total: +total[1], suma };
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

for (const [escenario, tramo, avion] of LISTA) {
  process.stdout.write(
    `  · ${escenario} (${tramo}${avion ? ` · ${avion}` : ""})… `,
  );
  const empezo = Date.now();
  const suVeces = Math.min(VECES, A_SU_RITMO[escenario] ?? VECES);
  const salida = await new Promise((listo) => {
    let texto = "";
    const hijo = spawn(
      process.execPath,
      [
        "scripts/verificar-vuelo-entero.mjs",
        escenario,
        tramo,
        String(suVeces),
        avion ?? "jaz-20",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    hijo.stdout.on("data", (b) => (texto += b));
    hijo.stderr.on("data", (b) => (texto += b));
    hijo.on("close", () => listo(texto));
  });
  const minutos = (Date.now() - empezo) / 60000;
  const c = cuenta(salida);
  partes.push({
    escenario: avion ? `${escenario} ${avion}` : escenario,
    tramo,
    veces: suVeces,
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
  /*
   * **Y si no hubo parte, se enseña por qué.**
   *
   * «Sin parte» quiere decir que el banco de ese escenario no llegó a
   * imprimir su línea de cuentas: se cayó. Y lo que se cayó estaba **aquí
   * dentro**, en `salida`, y se tiraba a la basura — así que el barrido
   * decía «algo pasó» sin decir qué, y encima cambiaba de escenario en cada
   * tirada, que es lo que convierte una cifra en humo.
   *
   * Se enseñan las últimas líneas con contenido, que es donde está el
   * motivo: una excepción, un tiempo agotado o una página en blanco.
   */
  if (!c) {
    const cola = salida
      .split("\n")
      .map((l) => l.trimEnd())
      .filter(Boolean)
      .slice(-12);
    for (const l of cola) console.log(`      ${l}`);
  }
}

// ── La tabla ──────────────────────────────────────────────────────────────

console.log(`\n  barrido · vuelo entero · reloj ×${VECES}\n`);
const ancho = Math.max(...partes.map((p) => p.escenario.length));
for (const p of partes) {
  const marca = p.c && p.c.bien === p.c.total ? "✓" : "✗";
  const cuantas = p.c ? `${p.c.bien} de ${p.c.total}` : "sin parte";
  console.log(
    `  ${marca} ${p.escenario.padEnd(ancho)}  ${cuantas.padStart(9)}  ${p.minutos.toFixed(1).padStart(5)} min  ${p.fin}` +
      // Y si fue más despacio, que se vea: un número de otra tirada no se
      // compara con los demás sin saberlo. Ver `A_SU_RITMO`.
      (p.veces !== VECES ? `  (a ×${p.veces})` : ""),
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

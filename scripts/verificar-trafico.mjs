/**
 * Que el avión que se oye **esté ahí**.
 *
 * La radio lleva tiempo contando que hay alguien más: uno rodando a la
 * cabecera, otro en viento en cola, la torre autorizándoles. Y no había nadie.
 * Oír «Echo Charlie Oscar, en final», mirar, y ver la pista vacía es la manera
 * más rápida de aprender que la radio de este juego es un adorno.
 *
 * Esto se comprueba desde fuera y no con una prueba de unidad porque lo que
 * falla no es la geometría —eso ya está medido en `trafico.test.ts`— sino **la
 * costura**: que la llamada llegue al módulo, que la matrícula sea la misma
 * llave a los dos lados, que la mano y la escala del circuito sean las que el
 * juego está usando hoy. Cada una de esas cuatro se puede romper sin que falle
 * una sola prueba, y las cuatro se ven igual: la radio habla y no hay nadie.
 *
 * Se escucha de verdad, con el reloj corrido, y **cada vez que alguien dice
 * algo se mira dónde está**. Es la única pregunta que importa.
 *
 * ## Y se escucha desde el puesto, no desde la pista
 *
 * Esto arrancaba en la lección de dar una vuelta, que pone el avión alineado
 * en la cabecera con el motor en marcha, y se quedaba ahí quieto escuchando.
 * Para el juego eso es «despegando», y el juego cambió por debajo dos veces:
 * desde el 18-sep-2026 la frecuencia calla mientras uno se alinea y corre
 * —ver `CALLADAS` en `flight/radio.ts`, «el camarote de los Hermanos Marx»—,
 * y desde el 26-sep la pista con uno encima no se le da a nadie, así que el
 * que venía a aterrizar se iba al aire. El banco escuchaba ciento cincuenta
 * segundos una radio que tenía que callar, y daba 3 de 11 sin decir por qué.
 *
 * En el puesto, con el motor parado, la frecuencia de la torre se oye —es
 * lo primero que se hace al subir a un avión— y la pista es de los demás:
 * ruedan, despegan, aterrizan y lo cuentan. Es el sitio donde un niño la oye
 * por primera vez, y el sitio donde lo que se oye y lo que se ve tienen que
 * ser el mismo vuelo.
 *
 * Las comprobaciones son las mismas once. Dos se han puesto al día con lo que
 * el juego hace hoy sin aflojar lo que piden: la de cuántos se ven —ver «los
 * que ya dejaron la frecuencia»— y la de dónde está quien llama, que se mira
 * al hacer la llamada y no al sonar —ver `alguienEn`—.
 *
 * Uso: `node scripts/verificar-trafico.mjs`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = 5289;
const RELOJ = Number(process.env.OGA_RELOJ ?? 8);
/**
 * Cuánto se escucha, en segundos de reloj de pared: los mismos veinte
 * minutos de juego con el reloj que se ponga.
 */
const RATO = Math.round((150 * 8) / RELOJ);

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

const resultados = [];
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

const page = await navegador.newPage({
  viewport: { width: 1000, height: 640 },
});
await page.addInitScript(() => {
  localStorage.setItem("oga-veve:teclas-vistas", "1");
});
/*
 * **En el puesto y con el tiempo de casa.** La lección de despegar empieza
 * en el puesto con el motor parado, y ahí no se toca nada: se escucha. Ver
 * arriba por qué no la de dar una vuelta.
 *
 * Y `&meteo=` vacío, como en `verificar-despegue.mjs`: con el `.env` del
 * árbol principal el juego pide el parte de verdad, y un día de techo bajo
 * la tarjeta del tiempo sale sola en el puesto a proponer no salir, con la
 * escena parada detrás. Para el parte de verdad, `OGA_METEO_DE_VERDAD=1`.
 */
const METEO = process.env.OGA_METEO_DE_VERDAD ? "" : "&meteo=";
await page.goto(
  `${BASE}/?escenario=tenerife-sur&hora=16&leccion=despegue&tramo=guyrami${METEO}`,
);
await page
  .waitForFunction(() => globalThis.__oga?.estado?.(), null, { timeout: 60000 })
  .catch(() => {});
// El reloj no va por la barra de direcciones: lo corre el juego, y dice lo que
// pudo poner. Ver `acelerar`.
const veces = await page.evaluate((n) => globalThis.__oga.acelerar(n), RELOJ);
await page.waitForTimeout(1500);
comprobar(
  "el reloj va corrido, que si no no da tiempo a oír nada",
  veces >= 4,
  `×${veces}`,
  "",
);

const pista = await page.evaluate(() => globalThis.__oga.pista());
/*
 * **Y la cota de la pista se pregunta, no se saca de `pista`.**
 *
 * `scenario.runway` trae x, z, rumbo y largo, y nada más: no lleva altura. Un
 * `pista.y` ahí es `undefined`, y `a.y > undefined + 120` es `a.y > NaN`, que
 * es `false` siempre. O sea que las cuatro comprobaciones de sitio habrían
 * fallado todas por una cuenta del banco, no del juego.
 */
const cota = await page.evaluate(
  (p) => globalThis.__oga.cotaDePista(p.x, p.z),
  pista,
);
/*
 * Cuántos bultos hay **antes** de que aparezca nadie. Si el tráfico entrara en
 * el índice de choques, este número crecería con él; y ese es exactamente el
 * juego que no se quiere hacer. Ver `Obstaculos`.
 */
const bultosAlPrincipio = await page.evaluate(
  () => globalThis.__oga.bultos().cuantos,
);

/*
 * Se muestrea a menudo y no al final. Con el reloj a ocho, entre una llamada y
 * la siguiente caben cinco segundos de pared: preguntar dos veces por vuelo
 * sería preguntarle a la radio por un avión que ya está en otro tramo.
 */
const visto = [];
const dichas = { otro: 0, torre: 0 };
/**
 * La clave, quitada la voz del campo y la cabecera.
 *
 * La torre de Canarias dice `torre.canario.lineUpWait` y en una pista doble le
 * pega además un `.L`. El tráfico las conoce por su nombre pelado, que es como
 * están escritas en los guiones. **Sin esto, el banco no reconocía ni una sola
 * llamada de la torre**, y como una comprobación sin casos se saltaba sin
 * decir nada, daba todo por bueno. Ver `comoSeDiceAqui` en `i18n/habla.ts`.
 */
const pelada = (clave) =>
  clave.replace(/^torre\.[a-z]+\./, "torre.").replace(/\.[LR]$/, "");
/*
 * **Y desde dónde se escuchó, que es lo que faltaba para entender un cero.**
 * El banco dio «0 llamadas» durante semanas y el parte no decía por qué: que
 * se estaba escuchando en una fase en la que la frecuencia calla. Se apunta
 * cada fase y con quién se habla, y si alguna de ellas calla la radio, se
 * dice con su nombre. Ver `CALLADAS` y `flight/dependencia.ts`.
 */
const { CALLADAS, CUANTOS } = await server.ssrLoadModule("/src/flight/radio.ts");
const fasesOidas = new Map();
const relojAlEmpezar = await page.evaluate(() => globalThis.__oga.reloj());
const hasta = Date.now() + RATO * 1000;
let sinNadie = 0;
let muestras = 0;
let maximo = 0;
/*
 * **Y los que ya dejaron la frecuencia, aparte.** Esto contaba a todos los
 * dibujados y pedía dos como mucho, y desde que el tráfico rueda por las
 * calles —el 26-sep-2026, ver `world/suelo-del-trafico.ts`— el que aterriza
 * no se esfuma al dejar la pista: dice «pista libre», deja la frecuencia de
 * la torre como la deja cualquiera, y rueda callado hasta su puesto.
 * Mientras tanto entra otro en la frecuencia, y se ven tres. Eso es lo real,
 * no un avión de más.
 *
 * Y lo mismo el que despega: con su «cleared for take-off» deja la torre
 * —pasa con salidas— y se le ve subir hasta perderse.
 *
 * Lo que se sigue exigiendo es lo que la comprobación quería decir: en la
 * frecuencia no hay más de `CUANTOS` dibujados a la vez, ninguno dibujado
 * sin haber estado nunca en ella, y el que ya la dejó o rueda por el suelo o
 * se va por su salida. Uno callado en el aire que no se está yendo —en el
 * circuito, en final— sí sería uno de más: llegaría sin haber hablado.
 */
let maximoDibujados = 0;
const hechas = [];
let nombradosAntes = (await page.evaluate(() => globalThis.__oga.nombrados())).total;
const estuvieron = new Set();
const sinFrecuencia = new Set();
const callados = new Set();
while (Date.now() < hasta) {
  const m = await page.evaluate(() => ({
    dicho: globalThis.__oga.dichoTodo(),
    trafico: globalThis.__oga.trafico(),
    avion: globalThis.__oga.estado().position,
    fase: globalThis.__oga.juegoParaTrazas().faseDeAhora,
    con: globalThis.__oga.dependencia(),
    frecuencia: globalThis.__oga.enLaFrecuencia(),
    caminos: Object.fromEntries(
      globalThis.__oga.traficoPorDentro().map((d) => [d.matricula, d.camino]),
    ),
    t: globalThis.__oga.reloj(),
    nombrados: globalThis.__oga.nombrados(),
  }));
  for (const matricula of m.frecuencia) estuvieron.add(matricula);
  /*
   * **Y quién la hizo, y cuándo**, que no es lo mismo que cuándo sonó. La
   * frecuencia apunta cada llamada al hacerla —`nombrar` en `game.ts`—, y la
   * boca la dice cuando le toca: entre una cosa y otra el avión sigue
   * volando. Sin esto, una llamada que no cuadra no dice si la frecuencia la
   * hizo tarde o la boca la dijo tarde.
   */
  const nuevas = m.nombrados.total - nombradosAntes;
  const desde = Math.max(0, m.nombrados.lista.length - nuevas);
  for (const n of m.nombrados.lista.slice(desde)) {
    hechas.push({
      t: n.t,
      clave: pelada(n.clave),
      quien: n.quien,
      avion: m.trafico.find((x) => x.matricula === n.quien) ?? null,
      camino: m.caminos[n.quien],
    });
  }
  nombradosAntes = m.nombrados.total;
  const donde = `${m.fase || "(sin fase)"}@${m.con ?? "nadie"}`;
  fasesOidas.set(donde, (fasesOidas.get(donde) ?? 0) + 1);
  // **`otro`, no `otroAvion`.** Es como se llama la boca en `Game.bocas`, y
  // leyendo la otra el banco no veía ni una llamada del avión de la frecuencia:
  // las veintiuna que contaba eran todas de la torre.
  for (const quien of ["otro", "torre"]) {
    const lista = m.dicho[quien] ?? [];
    for (const clave of lista.slice(dichas[quien])) {
      // Lo que suena se apunta con **todos** los que se ven y con la llamada
      // hecha de la que sale, si la hay: con eso se cuenta lo que habló la
      // radio, cuánto tardó en sonar y si alguien estaba plantado en el
      // centro. Dónde estaba quien llamaba se juzga con `hechas`.
      const k = pelada(clave);
      const hecha =
        hechas.filter((h) => h.clave === k && h.t <= m.t + 0.01).at(-1) ?? null;
      visto.push({ clave: k, aviones: m.trafico, caminos: m.caminos, t: m.t, hecha });
    }
    dichas[quien] = lista.length;
  }
  if (visto.length) {
    muestras += 1;
    const enElla = m.trafico.filter((a) => m.frecuencia.includes(a.matricula));
    maximo = Math.max(maximo, enElla.length);
    maximoDibujados = Math.max(maximoDibujados, m.trafico.length);
    for (const a of m.trafico) {
      if (m.frecuencia.includes(a.matricula)) continue;
      if (!estuvieron.has(a.matricula)) sinFrecuencia.add(a.matricula);
      // Doce metros sobre la cota de la pista, como «en el suelo» más abajo.
      else if (a.y - cota > 12 && m.caminos[a.matricula] !== "salida")
        callados.add(`${a.matricula} (${m.caminos[a.matricula] ?? "?"})`);
    }
    if (m.trafico.length === 0) sinNadie += 1;
  }
  await page.waitForTimeout(250);
}

const cuantas = visto.length;
const deJuego = (await page.evaluate(() => globalThis.__oga.reloj())) - relojAlEmpezar;
const escuchado = [...fasesOidas.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([d, n]) => `${d} ×${n}`)
  .join(", ");
const callada = [...fasesOidas.keys()]
  .map((d) => d.split("@")[0])
  .filter((f) => CALLADAS.has(f));

// Lo que tardó la boca en decir lo que la frecuencia ya había hecho. Ver `alguienEn`.
const retrasos = visto
  .filter((v) => v.hecha)
  .map((v) => v.t - v.hecha.t)
  .sort((a, b) => a - b);
const sinQuien = visto.filter((v) => !v.hecha).length;

comprobar(
  "la radio habló",
  cuantas >= 4,
  `${cuantas} llamadas en ${RATO} s de pared a reloj ×${RELOJ} (${deJuego.toFixed(0)} s de juego)` +
    ` · escuchando en ${escuchado}` +
    (callada.length ? ` · ${[...new Set(callada)].join(", ")} es fase callada` : "") +
    (retrasos.length
      ? ` · de hacerla a sonar, mediana ${retrasos[Math.floor(retrasos.length / 2)].toFixed(1)}` +
        ` s de juego y la peor ${retrasos.at(-1).toFixed(1)}`
      : "") +
    (sinQuien ? ` · ${sinQuien} sin quien la hizo apuntado` : ""),
  "sin llamadas este banco no comprueba nada, y diría que todo está bien",
);

comprobar(
  "y desde la primera llamada siempre hay alguien dibujado",
  cuantas >= 4 && sinNadie === 0,
  sinNadie
    ? `${sinNadie} de ${muestras} muestras con la frecuencia hablando y el cielo vacío`
    : `${muestras} muestras, nunca vacío`,
  "una radio que cuenta un avión que no está enseña que la radio es un adorno",
);

comprobar(
  "y no son más de los que dice la frecuencia",
  maximo > 0 &&
    maximo <= CUANTOS &&
    sinFrecuencia.size === 0 &&
    callados.size === 0,
  `${maximo} de la frecuencia a la vez como mucho (son ${CUANTOS})` +
    ` · ${maximoDibujados} dibujados contando los que ya la dejaron` +
    (sinFrecuencia.size ? ` · nunca en la frecuencia: ${[...sinFrecuencia].join(", ")}` : "") +
    (callados.size ? ` · fuera de ella, en el aire y sin irse: ${[...callados].join(", ")}` : ""),
  "ver CUANTOS en flight/radio.ts: quien la dejó rueda a su puesto o se va por su salida," +
    " no vuela callado por aquí",
);

/** Dónde cae un punto respecto de la pista: a lo largo y de lado, en metros. */
const enEjes = (p) => {
  const h = (pista.heading * Math.PI) / 180;
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  const dx = p.x - pista.x;
  const dz = p.z - pista.z;
  return { largo: dx * fx + dz * fz, lado: dx * -fz + dz * fx };
};
/** Y a qué altura sobre la pista va, que es lo que dice si vuela o rueda. */
const sobreLaPista = (a) => a.y - cota;

/**
 * Juzga cada llamada **por quien la hizo, donde estaba al hacerla**.
 *
 * Esto la juzgaba por el que mejor encajara de los que se veían **al sonar**,
 * porque desde fuera no se sabía quién hablaba. Ahora se sabe —la frecuencia
 * apunta quién y cuándo, ver `hechas`— y sonar no es hacerla: la boca la dice
 * cuando le toca, y en este banco le toca tarde. Medido el 5-oct-2026 en
 * Tenerife Sur, juzgando al sonar fallaban «viento en cola» o «final» en
 * cuatro tiradas de ocho. En una, un «viento en cola» hecho con el avión a la
 * altura de la cabecera, a 2.830 m del eje y 347 de alto —donde dice—, sonó
 * **197 s de juego después**, con el avión ya en otra vuelta; y su «final»,
 * hecho a 5,2 km en el eje y a 190 m, 199 s después. Son veinticinco
 * segundos de pared a ×8, y de una tirada a otra la mediana fue de un
 * segundo de juego o de ciento ochenta: sin pack de voz —aquí no hay gesto
 * que lo baje— habla la voz del navegador sin cabeza, que tarda lo suyo en
 * arrancar y se puede quedar colgada hasta su tope, y el reloj corrido lo
 * multiplica. Es la regla de medir que se come la prueba: el reloj corrido no
 * acelera el habla.
 *
 * Así que la pregunta —¿el avión que se nombra está donde se dice?— se hace
 * en el instante en que la frecuencia lo nombra, y **a ese avión**, no a
 * cualquiera que pase por ahí: es más exigente que antes, no menos. Y se
 * cuentan todas las que hace, hayan acabado de sonar o no. Lo que tarda la
 * boca en decirlas se cuenta aparte, en «la radio habló», y lo miden los
 * bancos de voces.
 */
const alguienEn = (claves, cumple) => {
  const lista = [].concat(claves);
  const casos = hechas.filter((h) => lista.includes(h.clave));
  if (!casos.length) return null;
  const bien = casos.filter((h) => !!h.avion && cumple(enEjes(h.avion), h.avion));
  const mal = casos.find((h) => !bien.includes(h));
  return { casos: casos.length, bien: bien.length, mal: mal ? comoEstaQuien(mal) : null };
};

/**
 * **Y cuando una llamada no cuadra, dónde estaba cada uno.** Un «1 de 2
 * veces» a secas no dice si el avión estaba a 390 m del eje o en la
 * plataforma, y sin eso no se sabe si falla el juego o el listón del banco.
 */
const dondeEsta = (a) => {
  const e = enEjes(a);
  return (
    `${Math.round(e.largo)} m a lo largo, ${Math.round(e.lado)} de lado` +
    ` y ${Math.round(sobreLaPista(a))} de alto`
  );
};
const comoEstaQuien = (h) =>
  `${h.clave} de ${h.quien} a los ${h.t.toFixed(0)} s de juego: ` +
  (h.avion ? `${h.camino ?? "?"} a ${dondeEsta(h.avion)}` : "sin dibujo");
const comoEstan = (caso) =>
  `${caso.clave}: ` +
  (caso.aviones
    .map((a) => `${a.matricula} ${caso.caminos?.[a.matricula] ?? "?"} a ${dondeEsta(a)}`)
    .join("; ") || "nadie dibujado") +
  (caso.hecha
    ? ` · la hizo ${caso.hecha.quien} ${(caso.t - caso.hecha.t).toFixed(1)} s de juego` +
      " antes de sonar," +
      (caso.hecha.avion
        ? ` ${caso.hecha.camino ?? "?"} a ${dondeEsta(caso.hecha.avion)}`
        : " sin dibujo todavía")
    : "");

const sitios = [
  [
    "otro.enCola",
    "el que anuncia viento en cola está arriba y separado del eje",
    (e, a) => sobreLaPista(a) > 120 && Math.abs(e.lado) > 400,
  ],
  [
    "otro.final",
    "y el que anuncia final está alineado con la pista y bajo",
    (e, a) => Math.abs(e.lado) < 250 && sobreLaPista(a) < 260 && e.largo < 0,
  ],
  [
    /*
     * Las dos formas de la misma llamada. **De día se saluda**, y entonces la
     * primera de quien sale no es «rodando a la cabecera» sino «buenos días,
     * rodando a la cabecera»: la misma frase con una pieza más delante, y otra
     * clave. Pidiendo solo la primera, esta comprobación se quedaba sin un
     * solo caso volando a media tarde. Ver `CON_SALUDO` en `flight/radio.ts`.
     */
    ["otro.rodando", "otro.buenosDias"],
    "y el que rueda a la cabecera está en el suelo",
    (e, a) => sobreLaPista(a) < 12,
  ],
  [
    "otro.pistaLibre",
    "y el que deja la pista, también",
    (e, a) => sobreLaPista(a) < 12,
  ],
];
/*
 * **Y una comprobación sin casos es un fallo, no un aprobado.**
 *
 * Es lo que escondió el fallo de arriba: leyendo la boca que no era, las
 * cuatro comprobaciones de sitio se saltaban por no tener ni un caso y el
 * banco salía con todo en verde. Un banco que calla cuando no puede medir
 * miente mejor que uno que falla.
 */
let sitiosMedidos = 0;
for (const [clave, nombre, cumple] of sitios) {
  const r = alguienEn(clave, cumple);
  comprobar(
    nombre,
    r !== null && r.bien === r.casos,
    r
      ? `${r.bien} de ${r.casos} veces${r.mal ? ` · la que no: ${r.mal}` : ""}`
      : "la frecuencia no la hizo nunca",
    "lo que se oye y lo que se ve tienen que ser el mismo vuelo",
  );
  if (r) sitiosMedidos += 1;
}
comprobar(
  "y se han podido medir todas las llamadas de sitio",
  sitiosMedidos === sitios.length,
  `${sitiosMedidos} de ${sitios.length}`,
  "una comprobación que no se ejecuta no es una comprobación que pasa",
);

const enElOrigen = visto.filter((v) =>
  v.aviones.some((a) => Math.hypot(a.x - pista.x, a.z - pista.z) <= 1),
);
comprobar(
  "y ninguno se queda plantado en el centro del mundo",
  enElOrigen.length === 0,
  enElOrigen.length
    ? `${enElOrigen.length} veces: ${enElOrigen.slice(0, 3).map(comoEstan).join(" | ")}`
    : "ninguno en el origen",
  "el fallo silencioso de devolver {0,0,0} en vez de nada",
);

/*
 * **Y no se le puede chocar.** No se mide estrellándose contra él —que sería
 * un banco de una hora para comprobar que no pasa nada— sino preguntándole al
 * juego cuáles son los bultos con los que se choca. Si el tráfico no está en
 * esa lista, no hay colisión que probar.
 *
 * Es ambiente, no un obstáculo: un juego donde a los cuatro años te mata algo
 * que no controlás no es este juego.
 */
const bultosAlFinal = await page.evaluate(
  () => globalThis.__oga.bultos().cuantos,
);
comprobar(
  "y no se le puede chocar: es ambiente, no un obstáculo",
  bultosAlFinal === bultosAlPrincipio,
  `${bultosAlPrincipio} bultos al empezar, ${bultosAlFinal} al acabar`,
  "a los cuatro años no te puede matar algo que no controlás",
);

console.log("");
for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
  if (!r.ok && r.porque) console.log(`      ${r.porque}`);
}
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones\n`);

await page.close();
await navegador.close();
await server.close();
process.exit(bien === resultados.length ? 0 : 1);

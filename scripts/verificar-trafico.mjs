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
 * Se vuela de verdad, con el reloj corrido, y **cada vez que alguien dice algo
 * se mira dónde está**. Es la única pregunta que importa.
 *
 * Uso: `node scripts/verificar-trafico.mjs`
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const PUERTO = 5289;
const RELOJ = 8;
/** Cuánto se vuela, en segundos de reloj de pared. */
const RATO = 150;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
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
await page.goto(
  `http://localhost:${PUERTO}/?escenario=tenerife-sur&hora=16&leccion=vuelta&tramo=guyrami`,
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
const hasta = Date.now() + RATO * 1000;
let sinNadie = 0;
let muestras = 0;
let maximo = 0;
while (Date.now() < hasta) {
  const m = await page.evaluate(() => ({
    dicho: globalThis.__oga.dichoTodo(),
    trafico: globalThis.__oga.trafico(),
    avion: globalThis.__oga.estado().position,
  }));
  // **`otro`, no `otroAvion`.** Es como se llama la boca en `Game.bocas`, y
  // leyendo la otra el banco no veía ni una llamada del avión de la frecuencia:
  // las veintiuna que contaba eran todas de la torre.
  for (const quien of ["otro", "torre"]) {
    const lista = m.dicho[quien] ?? [];
    for (const clave of lista.slice(dichas[quien])) {
      // Quien acaba de hablar es quien está más recién colocado; con dos en la
      // frecuencia no se puede saber cuál desde fuera, así que se apunta la
      // llamada con **todos** los que se ven y se juzga la llamada contra el
      // que mejor encaje. Lo que se persigue es que no haya llamada sin nadie.
      visto.push({ clave: pelada(clave), aviones: m.trafico });
    }
    dichas[quien] = lista.length;
  }
  if (visto.length) {
    muestras += 1;
    maximo = Math.max(maximo, m.trafico.length);
    if (m.trafico.length === 0) sinNadie += 1;
  }
  await page.waitForTimeout(250);
}

const deQuien = (clave) => visto.filter((v) => v.clave === clave);
const cuantas = visto.length;

comprobar(
  "la radio habló",
  cuantas >= 4,
  `${cuantas} llamadas en ${RATO} s de pared a reloj ×${RELOJ}`,
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
  maximo > 0 && maximo <= 2,
  `${maximo} a la vez como mucho`,
  "ver CUANTOS en flight/radio.ts",
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
 * Juzga una llamada por **el que mejor encaje** de los que se ven.
 *
 * No por el más cercano ni por el primero: con dos aviones en la frecuencia, a
 * uno de ellos le acaban de decir «en final» y al otro no le pasa nada, y
 * desde fuera no hay forma de saber cuál es cuál. Lo que este banco puede
 * afirmar es lo que de verdad importa: **que hay uno donde la llamada dice**.
 */
const alguienEn = (claves, cumple) => {
  const casos = [].concat(claves).flatMap(deQuien);
  if (!casos.length) return null;
  const bien = casos.filter((c) => c.aviones.some((a) => cumple(enEjes(a), a)));
  return { casos: casos.length, bien: bien.length };
};

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
    r ? `${r.bien} de ${r.casos} veces` : "nunca se oyó esa llamada",
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

comprobar(
  "y ninguno se queda plantado en el centro del mundo",
  visto.every((v) =>
    v.aviones.every((a) => Math.hypot(a.x - pista.x, a.z - pista.z) > 1),
  ),
  "ninguno en el origen",
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

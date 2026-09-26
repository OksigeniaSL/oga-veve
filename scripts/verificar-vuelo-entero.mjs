/**
 * El vuelo entero, sin cortes: del puesto al puesto.
 *
 * Existe por una frase, y por media tarde de vídeos: «no puede ser que hagas
 * (1) y yo tenga que estar media hora entre prueba, grabación, comprobar que
 * el fallo todavía está…». Tenía razón, y el problema no era el vídeo: era que
 * **el banco no volaba**. Comprobaba trozos, colocando el avión a mano en cada
 * situación, y así se le escapa justo lo que aparece al encadenarlas: la raya
 * que desaparece en la salida, la pantalla que se queda muda medio minuto, el
 * coche que se va, los cuatro minutos de rodaje.
 *
 * ## Qué mide esto y qué no
 *
 * No mide funciones: mide **la experiencia**. Un vuelo completo con los mandos
 * de verdad —motor, gas, freno, timón, palanca— y ni un solo `colocar`. Lo que
 * se comprueba después no es si tal método devuelve tal cosa, sino si quien
 * juega se queda alguna vez sin saber qué hacer:
 *
 * - que el vuelo se pueda terminar,
 * - que el rodaje no se haga eterno, de ida y de vuelta,
 * - que la pantalla nunca se quede muda en tierra,
 * - que la raya verde no falte mientras se rueda,
 * - que al coche del sígame se le pueda seguir,
 * - que nada salte cuando no toca ni calle cuando toca.
 *
 * ## El piloto
 *
 * Es tonto a propósito: sigue la raya que el juego pinta, hace lo que la fase
 * pide y navega por la geometría de la pista. Si con eso no se puede completar
 * un vuelo, el juego no cumple lo que promete — que es exactamente la pregunta.
 *
 * Tarda lo que tarda un vuelo: unos cinco minutos de reloj. Por eso no está en
 * `npm run vuelo` con los demás, sino aparte.
 *
 * ## Esto no da el mismo número dos veces, y hay que saberlo
 *
 * El banco vuela en un navegador de verdad y en tiempo de reloj: el paso de
 * simulación depende de lo que tarde cada fotograma, así que dos ejecuciones
 * del mismo código con el mismo escenario **no dan el mismo vuelo**. Medido a
 * propósito en La Palma, cuatro veces seguidas sin tocar una línea: se tocó a
 * 0,3 · 9,9 · 5,7 y 1,2 metros del eje, y una de las cuatro cayó del lado malo
 * del listón.
 *
 * Lo que se saca de ahí: un cambio de una comprobación arriba o abajo en un
 * escenario **no dice nada**, y perseguirlo es afinar contra el ruido —se hizo,
 * y se perdieron dos vueltas del barrido en ello—. Lo que sí dice algo es un
 * fallo que se repite, uno que aparece en varios campos a la vez, o un número
 * que se mueve de escala: la toma que pasa de 150 a 320 metros, el rodaje de
 * vuelta que se dobla, el percance que sale siempre.
 *
 * Uso: `node scripts/verificar-vuelo-entero.mjs [escenario] [tramo] [veces]
 * [avion] [destino]`. Con destino, se despega en casa y se aterriza, se rueda
 * y se aparca en ese otro campo. Ver `DESTINO`.
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const ESCENARIO = process.argv[2] ?? "tenerife-norte";
const TRAMO = process.argv[3] ?? "guyrami";
const PUERTO = 5289;
/*
 * Cuántas veces más deprisa va el reloj del juego. Ver `Game.acelerar`.
 *
 * Con uno se vuela en tiempo real, que es lo que hacía este banco y lo que
 * lo dejaba en ocho minutos por escenario. El juego tiene su tope y dice lo
 * que pudo poner.
 */
const VECES = Number(process.argv[4] ?? 12);
/*
 * **Y si no es un número, se dice y se para aquí.**
 *
 * El orden es `escenario tramo veces avion`, y el avión va **detrás** del
 * reloj. Equivocarse es facilísimo —`… tenerife-norte guyrami jaz-60`— y lo
 * que pasaba entonces no se parecía a un error:
 *
 *   `Number("jaz-60")` es `NaN`, así que la espera de cada vuelta es
 *   `setTimeout(NaN)`, que dispara al instante: bucle cerrado. Y el tope de
 *   pared tampoco salva, porque `Math.max(180, NaN)` **es NaN** y toda
 *   comparación con NaN es falsa. Resultado: quince minutos sin una sola
 *   línea, exactamente la misma cara que un cuelgue del juego.
 *
 * Costó una investigación entera y, peor, **contaminó otra**: un cuelgue que
 * se achacó al juego era esto. Un banco que se traga un argumento imposible y
 * se cuelga en silencio no es una regla de medir, es una trampa.
 */
if (!Number.isFinite(VECES) || VECES <= 0) {
  console.log(
    `\n  ✗ «${process.argv[4]}» no es un reloj.\n` +
      "    El orden es: escenario tramo veces avion\n" +
      "    Por ejemplo:  node scripts/verificar-vuelo-entero.mjs tenerife-norte guyrami 12 jaz-60\n",
  );
  process.exit(2);
}
/**
 * Con qué avión se vuela.
 *
 * Existe porque la flota pasó de dos aviones a cinco y **este banco solo
 * volaba el primero**. Los otros cuatro tenían sus diecisiete comprobaciones
 * de prestaciones —pérdida, planeo, carrera, los cinco modos— y ni una sola
 * que los sacara del puesto y los trajera de vuelta. Es exactamente el hueco
 * que ya tuvieron el plano y el tiempo entre los paneles: lo que no se vuela,
 * no se mide.
 *
 * Y no da igual cuál: un reactor que cruza el umbral a noventa metros por
 * segundo no cabe en las mismas pistas ni en las mismas curvas de rodaje que
 * una avioneta, y lo que este banco mide es precisamente eso.
 */
const AVION = process.argv[5] ?? "jaz-20";
// Y el avión, que tiene que existir: un identificador mal escrito volaba el
// de siempre y el parte decía el nombre equivocado. Ver `AIRCRAFT`.
if (!/^jaz-\d+$/.test(AVION)) {
  console.log(
    `\n  ✗ «${AVION}» no es un avión de la flota.\n` +
      "    El orden es: escenario tramo veces avion\n",
  );
  process.exit(2);
}
/**
 * **Y a dónde se va, si se va a otro sitio.** Quinto argumento: el
 * identificador de un campo vecino —`tenerife-norte`, por ejemplo—.
 *
 * Existe porque todo lo que este banco mide lo medía **en casa**, y el día que
 * se aterrizó en el aeropuerto de enfrente no había nadie: ni coche, ni raya,
 * ni señalero. «En el de salida sí.» El banco estaba en verde porque nunca
 * había salido del campo de salida.
 *
 * El trayecto entre islas no se vuela: son cuarenta minutos de recta que no
 * miden nada de lo que aquí importa. Se despega de verdad, se sube hasta que
 * el vuelo cuenta como vuelo, y ahí el avión se pone en final del otro campo,
 * a cuatro kilómetros y en su senda. Desde ahí es el mismo piloto que en casa:
 * aterriza, sale de la pista, sigue la raya hasta el puesto y apaga — **allí**.
 */
const DESTINO = process.argv[6] ?? null;
if (DESTINO !== null && !/^[a-z-]+$/.test(DESTINO)) {
  console.log(`\n  ✗ «${DESTINO}» no es un campo.\n`);
  process.exit(2);
}

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();

/*
 * **Y la dirección se pregunta, no se supone.**
 *
 * El puerto estaba escrito a mano en dos sitios: al levantar el servidor y
 * al navegar. Y Vite, si el puerto está ocupado, **se muda al siguiente sin
 * decir nada** — así que el banco levantaba su servidor en el 5290 y pedía la
 * página al 5289, donde no había nadie o había el servidor del escenario
 * anterior todavía cerrándose. La página salía en blanco, el banco no
 * imprimía su línea de cuentas y el barrido lo contaba como «sin parte».
 *
 * Y esa es la firma exacta de lo que llevaba tres tiradas pasando: «sin
 * parte» en un escenario distinto cada vez, siempre al minuto y pico, y los
 * mismos escenarios pasando 24 de 24 corridos solos.
 *
 * Preguntándole al servidor por dónde escucha, el problema no puede existir.
 */
const BASE = server.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
if (!BASE) throw new Error("el servidor de pruebas no dijo por dónde escucha");
if (!BASE.endsWith(`:${PUERTO}`))
  console.log(`  (el ${PUERTO} estaba ocupado: se usa ${BASE})`);

/*
 * **Y con la tarjeta de verdad, si se pide.** `OGA_GPU=1` lanza Chrome con la
 * GPU del equipo en vez de SwiftShader: para medir el vuelo da igual, pero
 * para mirar las fotos de `OGA_FOTOS` no — SwiftShader no juzga una imagen.
 */
const CON_GPU = process.env.OGA_GPU === "1";
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
/*
 * **Y la pantalla y el idioma, si se piden.** `OGA_VISTA=915x412` vuela en
 * un teléfono apaisado y `OGA_IDIOMA=es-PY` en el idioma de quien juega: el
 * banco volaba siempre en una tablet y en inglés —lo que dice el navegador
 * sin cabeza—, que es justo lo que menos se parece a un niño en Paraguay con
 * el móvil de su madre.
 */
const [anchoVista, altoVista] = (process.env.OGA_VISTA ?? "1000x620")
  .split("x")
  .map(Number);
const page = await navegador.newPage({
  viewport: { width: anchoVista || 1000, height: altoVista || 620 },
  hasTouch: true,
  isMobile: true,
  ...(process.env.OGA_IDIOMA ? { locale: process.env.OGA_IDIOMA } : {}),
});
const errores = [];
page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
await page.addInitScript(() => {
  localStorage.setItem("oga-veve:teclas-vistas", "1");
});
/*
 * **Y la hora se fija, que si no el banco mide la hora a la que se ejecuta.**
 *
 * Desde que el cielo lleva la hora de verdad del sitio —ver `world/hora.ts`—,
 * un vuelo a las tres de la mañana y otro a mediodía no se parecen: cambia la
 * luz, se encienden las balizas y el cuadro. Eso está bien en el juego y es
 * veneno en un banco, donde dos tiradas del mismo código tienen que dar lo
 * mismo. Las cuatro de la tarde, que es la hora con la que se diseñó todo.
 */
/*
 * Y la hora y el tiempo, si se piden: `OGA_HORA=21` vuela de noche y
 * `OGA_METAR="…"` con el parte que se le dé —lluvia, niebla, viento—. Por
 * defecto, las cuatro y el tiempo de casa, que es lo que mide igual cada vez.
 */
const HORA = process.env.OGA_HORA ?? "16";
const METAR = process.env.OGA_METAR
  ? `&metar=${encodeURIComponent(process.env.OGA_METAR)}`
  : "";
/*
 * **Y la lección, si se pide otra.** `OGA_LECCION=rodaje` para mirar con
 * `OGA_FOTOS` la lección que acaba en el punto de espera. Las comprobaciones
 * de vuelo fallarán, porque no se vuela: sirve para las fotos, no para contar.
 */
const LECCION = process.env.OGA_LECCION ?? "despegue";
await page.goto(
  `${BASE}/?escenario=${ESCENARIO}&hora=${HORA}&leccion=${LECCION}` +
    `&tramo=${TRAMO}&avion=${AVION}${METAR}` +
    (DESTINO ? `&destino=${DESTINO}` : ""),
);
/*
 * **Y se espera a que el juego esté, no a que pasen dieciséis segundos.**
 *
 * Aquí había un `waitForTimeout(16000)` a secas y luego se usaba `__oga` como
 * si estuviera. Mientras los escenarios cargaban en diez segundos coló; en
 * cuanto un mundo pasó a trescientos kilómetros con tres islas de vecinos,
 * dejó de colar — y el banco no falla diciendo «tardó en cargar», falla con
 * un `TypeError` de una sonda que no existe todavía y el escenario sale
 * **«sin parte»**, que es la forma más cara de fallar: no dice qué pasó.
 *
 * Medido en el barrido de cierre: Encarnación y La Palma, las dos a 1,3
 * minutos y las dos con el mismo `Cannot read properties of undefined`.
 *
 * Es el mismo error de siempre en este banco —cruzar dos relojes, el de la
 * espera y el de la carga— y se arregla igual: se pregunta por lo que se
 * necesita en vez de contar segundos. Un minuto de tope, que es de sobra
 * para el escenario más gordo y poco para quedarse colgado.
 */
/*
 * Y si no arranca, **se dice**: un banco no sale nunca «sin parte».
 *
 * Reventar con una excepción de Playwright deja al barrido enseñando una
 * traza de pila donde debería haber un motivo, y el escenario cuenta como
 * «sin parte», que no distingue «el juego no cargó» de «el banco está roto».
 * Son dos averías muy distintas y una de ellas no es del juego.
 *
 * Dos minutos de tope: en esta máquina el escenario más gordo arranca en
 * veinte segundos, así que dos minutos solo se agotan si algo va mal de
 * verdad — y entonces lo que hace falta es el error de la consola, que es lo
 * único que dice por qué.
 */
/*
 * **Y cuánto tardó, siempre, no solo cuando falla.**
 *
 * Con el tope en dos minutos y un arranque normal de veinte segundos, un
 * barrido de diecisiete escenarios sacaba **un falso rojo por tirada** —y
 * siempre en otro escenario, que corrido solo pasa entero—. Con un número
 * binario «arrancó / no arrancó» eso es una moneda al aire: no se sabe si el
 * caído tardó veintidós segundos o ciento diecinueve.
 *
 * La tentación era subir el tope a cuatro minutos y llamarlo arreglado. Eso
 * es tapar el instrumento, no medirlo. Lo que hace falta es **el reparto**:
 * con el tiempo de arranque de los diecisiete en la tabla, un atípico se ve
 * como lo que es y el tope se decide con datos en vez de a ojo.
 */
const arrancoA = Date.now();
/*
 * **Y qué se quedó esperando, si no arranca.**
 *
 * Guaraní no arrancó en ciento veinte segundos otra vez, con los argumentos
 * buenos, y corrido dos veces seguidas después arrancó en 1,5 y 1,9. No se
 * reproduce a demanda, así que razonar la causa es adivinar. Lo que hace
 * falta es que la próxima vez **diga qué petición no terminó**: una promesa
 * colgada es silenciosa, pero la petición de red que la cuelga no lo es.
 */
const pendientes = new Map();
/** Lo que falla o responde con error en la carga. Ver `verificar-carteles`. */
const carga = [];
page.on("requestfailed", (r) =>
  carga.push(`falló ${r.url().replace(/^https?:\/\/[^/]+/, "")} ${r.failure()?.errorText ?? ""}`),
);
page.on("response", (r) => {
  if (r.status() >= 400)
    carga.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, "")}`);
});
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning")
    carga.push(`consola ${m.type()}: ${m.text().slice(0, 160)}`);
});
page.on("request", (r) => pendientes.set(r, Date.now()));
page.on("requestfinished", (r) => pendientes.delete(r));
page.on("requestfailed", (r) => pendientes.delete(r));
/*
 * Hasta dos veces: si un módulo no baja, el vigilante de `index.html` recarga
 * la página —lo que hace en la web— y esa recarga rompe la espera. Ver
 * `verificar-carteles.mjs`.
 */
let arrancoYa = false;
for (let intento = 0; intento < 2 && !arrancoYa; intento++) {
  arrancoYa = await page
    .waitForFunction(() => !!globalThis.__oga?.estado, null, {
      timeout: 120000,
    })
    .then(() => true)
    .catch(() => false);
  if (!arrancoYa && intento === 0) {
    await page.waitForLoadState("load").catch(() => {});
    if (carga.length)
      console.log(`  (la primera carga falló —${carga[0]}—; se espera la recarga)`);
  }
}
if (!arrancoYa) {
  console.log(
    `\n  ✗ el juego no arrancó en 120 s · ${ESCENARIO} · ${TRAMO} · ${AVION}`,
  );
  console.log(
    errores.length
      ? `    la consola dijo: ${errores.slice(0, 3).join(" | ")}`
      : "    y la consola no dijo nada: o tardó de más, o se quedó esperando un dato",
  );
  /*
   * **Y hasta dónde llegó el arranque.** La última vez no quedó ninguna
   * petición abierta: lo que esperaba no era la red. `main.ts` deja una miga
   * por etapa; la que falte es la que se quedó esperando.
   */
  const migas = await page
    .evaluate(() => globalThis.__arranque ?? null)
    .catch(() => null);
  console.log(
    migas
      ? `    el arranque llegó a: ${migas.join(" · ")}`
      : "    y no dejó ni una miga: no llegó a ejecutarse `main.ts`",
  );
  console.log(
    carga.length
      ? `    en la carga:\n      ${carga.slice(0, 12).join("\n      ")}`
      : "    y en la carga no falló nada ni respondió con error",
  );
  const colgadas = [...pendientes.entries()]
    .map(([r, desde]) => `${((Date.now() - desde) / 1000).toFixed(0)} s  ${r.url().replace(/^https?:\/\/[^/]+/, "")}`)
    .slice(0, 8);
  console.log(
    colgadas.length
      ? `    peticiones sin terminar:\n      ${colgadas.join("\n      ")}`
      : "    y ninguna petición quedó abierta: lo que espera no es la red",
  );
  await navegador.close();
  await server.close();
  process.exit(1);
}
/** Cuánto tardó el juego en estar listo, s. Ver por qué, más arriba. */
const tardoEnArrancar = (Date.now() - arrancoA) / 1000;

// Y un respiro para que el mundo termine de posarse: el relieve y las
// ortofotos llegan con la primera tanda, pero las mallas se montan después.
await page.waitForTimeout(4000);

/*
 * **Y un clic, para que baje el pack de voz.**
 *
 * El pack se baja tras el primer gesto, como en el juego. Sin él, `cantar` no
 * encuentra grabación para «V one» y se la manda **directamente al
 * sintetizador del navegador**, saltándose la boca entera: la frase suena, pero
 * no pasa por ninguna de las cuatro bocas y por tanto no queda en ningún
 * historial. El banco daba «no canta V1» con aviones que sí la cantan, y no
 * medía en absoluto el camino que recorre la voz en el juego de verdad.
 *
 * Con el clic, un vuelo entero de este banco ejercita las grabaciones, que es
 * lo que oye quien juega.
 */
/*
 * **En un sitio donde solo haya paisaje.** Iba a (450, 300) fijo, y con el
 * cuadro subido por encima de los pedales ese punto caía en su tirador: el
 * banco bajaba el cuadro sin querer y las fotos salían con media fila de
 * esferas. Se busca en una rejilla el primer punto que sea el lienzo.
 */
const libre = await page.evaluate(() => {
  for (let fy = 0.3; fy < 0.9; fy += 0.05)
    for (let fx = 0.3; fx < 0.8; fx += 0.05) {
      const x = Math.round(innerWidth * fx);
      const y = Math.round(innerHeight * fy);
      if (document.elementFromPoint(x, y)?.id === "lienzo") return [x, y];
    }
  return [Math.round(innerWidth / 2), Math.round(innerHeight / 3)];
});
await page.mouse.click(libre[0], libre[1]);
/*
 * **Y la vista, si se pide.** `OGA_CAMARA=cockpit` vuela entero desde dentro,
 * que es lo que hace quien juega con la cabina puesta y el banco no miraba.
 */
if (process.env.OGA_CAMARA)
  await page.evaluate((v) => globalThis.__oga?.ponerVista?.(v), process.env.OGA_CAMARA);
await page
  .waitForFunction(() => (globalThis.__oga?.voz?.().piezas ?? 0) > 0, null, {
    timeout: 60000,
  })
  .catch(() => {});

const resultados = [];
/**
 * Cuántas veces puede decir la instructora una misma cosa en un vuelo entero.
 *
 * Cuatro es generoso a propósito: hay avisos que pertenecen legítimamente a
 * varios momentos del vuelo —se sale, se vuelve, se vuelve a entrar en final—
 * y no hay que convertir el banco en un cepo. Lo que caza es lo otro: el aviso
 * que sale ocho veces seguidas porque se rearma solo.
 */
const MAS_DE_LA_CUENTA = 4;

const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

/**
 * Lo mismo, pero **solo si el vuelo llegó a terminar**.
 *
 * Todo lo que se mide después de aterrizar falla a la vez cuando no se llega a
 * aterrizar, y eso no son ocho defectos: es uno, contado ocho veces. Ver
 * `seQuedoSinTiempo` y el `TOPE` del presupuesto.
 *
 * No se marca en verde ni en rojo: se dice que no se midió, que es la verdad.
 * Dar por bueno lo que no se ha mirado es la otra forma de mentir con un
 * banco.
 */
const comprobarSiVolo = (nombre, ok, detalle, porque) => {
  if (seQuedoSinTiempo || seQuedoSinPared) {
    resultados.push({
      nombre,
      ok: true,
      sinMedir: true,
      detalle: "no se midió: el vuelo no llegó a terminar",
      porque,
    });
    return;
  }
  comprobar(nombre, ok, detalle, porque);
};

// ── El vuelo ──────────────────────────────────────────────────────────────

/*
 * **Las fotos del vuelo, si se piden.** `OGA_FOTOS=carpeta` saca una captura
 * cada vez que cambia la fase —en el puesto, rodando, en la carrera, subiendo,
 * en final, en la toma— y una cada treinta segundos de juego entre medias. Es
 * jugar el vuelo entero y mirarlo, que es como se encuentra lo que ninguna
 * comprobación sabe preguntar. Va en paralelo al piloto, que vuela dentro de
 * la página: Playwright deja hacer capturas mientras `evaluate` corre.
 */
const FOTOS = process.env.OGA_FOTOS ?? null;
let fotografiando = !!FOTOS;
const fotos = (async () => {
  if (!FOTOS) return;
  const { mkdir } = await import("node:fs/promises");
  await mkdir(FOTOS, { recursive: true });
  let ultima = "";
  let ultimaT = -Infinity;
  let n = 0;
  while (fotografiando) {
    await new Promise((r) => setTimeout(r, 700));
    const dato = await page
      .evaluate(() => {
        const o = globalThis.__oga;
        const s = o.estado();
        return {
          fase: o.fase() || "—",
          t: o.reloj(),
          alto: Math.round(s.heightAboveGround),
          vel: Math.round(s.airspeed * 1.944),
        };
      })
      .catch(() => null);
    if (!dato) continue;
    if (dato.fase === ultima && dato.t - ultimaT < 30) continue;
    ultima = dato.fase;
    ultimaT = dato.t;
    const nombre = `${String(n++).padStart(2, "0")}-${dato.t.toFixed(0)}s-${dato.fase.replace(/[^\w.-]+/g, "_")}.png`;
    await page.screenshot({ path: `${FOTOS}/${nombre}` }).catch(() => {});
  }
})();

const vuelo = await page.evaluate(async ([vecesPedidas, destino]) => {
  const o = globalThis.__oga;
  /*
   * **Sin órdenes de irse al aire.**
   *
   * Una de cada cuatro aproximaciones trae orden de frustrar, y el piloto de
   * este banco no sabe obedecerla: bajaba igual, se llevaba el percance de
   * pista ocupada y el vuelo se quedaba congelado a los novecientos segundos.
   * Quien comprueba esa orden es el banco de vuelo, que sí sabe. Aquí lo que
   * se mide es que un vuelo entero se pueda completar.
   */
  o.mandarFrustrar("nunca");
  // La raíz de la escena, para poder mirar el coche del sígame.
  let raiz = o.aeronave().grupo;
  while (raiz.parent) raiz = raiz.parent;
  globalThis.__raiz = raiz;
  /*
   * **Los mandos se ponen por `pilotar`, no escribiendo en `controles()`.**
   *
   * Esto es lo que llevaba meses midiendo un piloto que no pilotaba. El
   * objeto de `controles()` es el del teclado, y el teclado lo **reescribe
   * entero cada fotograma**: `Input.update` devuelve alerón y palanca al
   * centro a 3,4 por segundo, así que un alerón de 0,5 escrito desde fuera se
   * queda en nada en siete centésimas de vuelo. En las trazas se ve tal cual —
   * tras escribir 0,5, tres de cada cuatro muestras leen 0,0.
   *
   * El juego tiene el gancho exactamente para esto y corre **después** del
   * teclado. Es la misma lección que ya se aprendió en el banco de rodaje —
   * «el guion le ponía timón al avión y el teclado se lo quitaba al
   * instante»— y que aquí se había vuelto a colar.
   *
   * Y no era solo que el piloto fuera flojo: **su autoridad dependía del
   * reloj**. Escribiendo una vez por vuelta del bucle, a tiempo real el mando
   * vivía un tercio del tiempo y a reloj acelerado un octavo. Un banco cuyo
   * piloto pilota distinto según lo deprisa que vaya la máquina no mide el
   * juego, se mide a sí mismo.
   */
  const c = {
    throttle: 0,
    brakes: 1,
    aileron: 0,
    elevator: 0,
    rudder: 0,
    flaps: 0,
    engineOn: false,
  };
  o.pilotar((mandos) => Object.assign(mandos, c));
  /*
   * **La pista es la del campo en el que se está**, no siempre la de casa.
   * En casa es la misma; en el destino, la suya. Ver el argumento `destino`.
   */
  const pistaAhora = () => o.pistaDeAhora?.() ?? o.pista();
  const finalAhora = (d) => o.puntoDeFinalDe?.(d) ?? o.puntoDeFinal(d);
  let pista = pistaAhora();
  let rumboPista = (pista.heading * Math.PI) / 180;

  /**
   * A qué altura se puede empezar a girar, m.
   *
   * Ciento cincuenta. Por debajo se mantiene el rumbo de salida: girar bajo es
   * lo que estrelló este banco en La Palma —de 62 a 14 metros en cuatro
   * segundos— y es además lo que ningún piloto hace.
   *
   * **Y tiene que estar por debajo de la altura de crucero**, que son
   * doscientos. Se puso primero en doscientos cincuenta, la del circuito de
   * tráfico, y entonces el permiso para girar no llegaba nunca: el avión
   * nivelaba a doscientos, salía recto hasta quedarse sin escenario y el banco
   * se lo apuntaba como «pasada». Un umbral por encima de donde el avión se
   * queda es un umbral que no existe.
   */
  const SEGURO_PARA_GIRAR = 150;

  /**
   * Cuánto antes de un vértice se da el tramo por terminado, m.
   *
   * Trescientos. Un avión no gira en una esquina: gira en un arco, y a treinta
   * y cinco metros por segundo con veinticinco grados de inclinación ese arco
   * mide unos trescientos metros de radio. Anticipar el viraje es lo que hace
   * que el circuito salga rectangular y no en forma de estrella.
   */
  const MARGEN_DE_VIRAJE = 300;

  /**
   * Los vértices del circuito que dibuja el juego, en coordenadas de mundo.
   *
   * Se piden una vez y se guardan: son los mismos todo el vuelo mientras no
   * cambie el viento, y pedirlos por fotograma es cruzar la frontera con el
   * juego cientos de veces para nada.
   */
  let vertices;
  const circuito = () => {
    if (vertices === undefined) vertices = o.circuito?.() ?? null;
    return vertices;
  };

  /**
   * A qué velocidad se sube y a cuál se navega, m/s.
   *
   * Treinta y cuatro y cincuenta. La primera está bastante por encima de la de
   * rotación —veintiocho— y bastante por debajo de donde este avión deja de
   * subir; la segunda es el crucero de la ficha. Lo que importa de las dos no
   * es el número exacto: es que el piloto **apunte a una velocidad** y no
   * sostenga media palanca, que es como se entra en pérdida subiendo.
   */
  /*
   * **Las velocidades salen de la ficha del avión, no de aquí.**
   *
   * Estaban escritas a mano —34 de subida, 50 de crucero— y eran las del JAZ
   * 20, que era el único que volaba este banco. Con cinco aviones en la flota
   * dejó de ser una simplificación: al turbohélice, que pierde a 37, se le
   * mandaba subir a 34. Se comió los tres mil cuatrocientos metros de Tenerife
   * Norte sin despegar y acabó contra un edificio.
   *
   * La de subida es la de rotación más un margen —es lo que se vuela después
   * de soltar el suelo— y la de crucero es la suya. Con el JAZ 20 salen 32 y
   * 60, o sea casi lo que había.
   */
  const suyas = o.avion?.() ?? {};
  const VELOCIDAD_DE_SUBIDA = (suyas.rotacion ?? 28) * 1.15;
  /**
   * **Y por debajo de diez mil pies no se vuela a velocidad de crucero.**
   *
   * `crucero` es la velocidad de crucero **a nivel de vuelo**, y este banco
   * vuela un circuito a doscientos metros. Para una avioneta da igual —su
   * crucero son 117 nudos y ahí cabe— pero para un reactor no: el JAZ 90 tiene
   * 220 m/s, o sea **428 nudos**, que además está por encima de su propia Vmo.
   *
   * Y lo que hacía el piloto del banco era exactamente eso: mantener 428
   * nudos a doscientos metros del suelo. Medido en Tenerife Sur — a los 157 s
   * iba a 98 m/s y doce metros de altura, y a los 282 s a **212 m/s y tres
   * metros**, trece kilómetros pasado el umbral. No se desviaba: aceleraba a
   * ras de suelo hasta el terreno.
   *
   * Por eso el barrido nunca voló los reactores, y por eso «diecisiete
   * escenarios limpios» quería decir diecisiete con avioneta.
   *
   * El tope son los **250 nudos por debajo de diez mil pies** que rige en
   * medio mundo, y que existe justo por esto: abajo hay tráfico, pájaros y
   * terreno, y a esa velocidad no da tiempo a ver nada. Para los cuatro
   * primeros de la flota no cambia nada, porque ya vuelan por debajo.
   *
   * Es la tercera vez en el mismo día que aparece esta forma —un número igual
   * para toda la flota donde tenía que salir de cada avión—: antes fueron la
   * altura de meter el tren y el tope de morro abajo.
   */
  const ABAJO_NO_SE_CORRE = 128.6;
  const VELOCIDAD_DE_CRUCERO = Math.min(
    suyas.crucero ?? 50,
    ABAJO_NO_SE_CORRE,
  );

  /**
   * Palanca para mantener una velocidad, con un empujón opcional de altura.
   *
   * Si el avión va más deprisa de lo que toca, se tira y sube; si va más
   * despacio, se suelta y acelera. Es como se vuela de verdad y, sobre todo,
   * es lo único que **no puede entrar en pérdida por insistir**: cuanto más
   * cerca de la pérdida está, menos palanca pide.
   */
  /**
   * Lo rápido que se avanza **por el suelo**, en m/s.
   *
   * **Rodando no vale el anemómetro**, y eso lo destapó el viento: en cuanto el
   * motor de vuelo empezó a restar el viento, un avión parado con viento de cara
   * marcaba ya la velocidad del viento. Este piloto decidía el gas de rodaje con
   * `airspeed`, así que daba por hecho que ya iba deprisa, cerraba el gas y
   * frenaba: en Guaraní, Tenerife Norte y La Palma se pasó los quince minutos
   * enteros parado en la plataforma sin llegar nunca al punto de espera.
   *
   * Y es lo correcto por sí solo: rodar es avanzar por el suelo, y lo que decide
   * si te pasas una curva es a qué velocidad la tomas **por el suelo**.
   */
  const porElSuelo = (s) => Math.hypot(s.velocity.x, s.velocity.z);

  /**
   * **Cuánto mando da el timón a esta velocidad, respecto a la de ajuste.**
   *
   * La fuerza de un timón va con la **presión dinámica**, o sea con el cuadrado
   * de la velocidad. Las leyes de este piloto se ajustaron volando la
   * avioneta, y a la velocidad de un reactor el mismo tirón da muchísimo más:
   * a 135 m/s contra los 33 de aproximación de la avioneta son (135/33)² ≈
   * **diecisiete veces**.
   *
   * Medido en Tenerife Sur con el JAZ 90, segundo a segundo, antes de esto: el
   * despegue salía perfecto —diez grados de morro, subiendo a siete metros por
   * segundo— y en cuanto la etapa de subir pedía velocidad con la palanca, el
   * morro se iba a **cincuenta y siete grados** subiendo a setenta y seis
   * metros por segundo. Después, el timón de +0,30 a −0,30 cada dos segundos,
   * el cabeceo oscilando entre −11° y +14°, y la altura desangrándose hasta el
   * suelo. Una oscilación inducida por el piloto de libro.
   *
   * Es lo mismo que el juego ya aprendió con su piloto automático —«una ley de
   * un solo piso no amortigua el fugoide, lo alimenta»—. Aquí se resuelve como
   * lo resuelve cualquier mando de vuelo de verdad: la ganancia se reparte
   * según la presión dinámica.
   *
   * **Y a propósito, sin tocar a los que hoy pasan.** La ganancia no sube de
   * uno: por debajo de 90 m/s —el crucero del turbohélice, que es el avión más
   * rápido que el barrido ya volaba limpio— no cambia nada. Solo se recorta por
   * encima, que es donde vuelan los reactores.
   */
  /**
   * **Configurar el avión según el tramo del circuito**, como se hace.
   *
   * El banco no tocaba nunca ni los flaps ni el tren: ponía `flaps: 0` al
   * empezar y ya. Con la avioneta da igual —tren fijo, lenta, y en Guyrami el
   * juego ayuda con todo—, pero un reactor es **limpio**: al ralentí en
   * descenso no frena, y sin tren ni flaps no hay manera de bajarle la
   * velocidad. El JAZ 90 llegaba a la pista de Asunción a **108 m/s** con una
   * aproximación de 68, y se salía.
   *
   * Así que el piloto hace lo que hace cualquiera en un circuito:
   *
   * - **Subiendo**: tren dentro en cuanto sube de verdad.
   * - **Viento en cola** (esquina 2 en adelante): frena, y el tren sale en
   *   cuanto la velocidad baja de su `vleKt`.
   * - **Base** (esquina 3 en adelante): flaps, en cuanto baja de su `vfeKt`.
   * - **Final**: ya configurado. Se frena **antes** de bajar, no bajando.
   *
   * Los límites salen de la ficha de cada avión, así que el mismo piloto vale
   * para los seis. Sacar el tren por encima de su velocidad es romperlo, y
   * eso es justo lo que el juego castiga.
   */
  const configurar = (s, c, tramo) => {
    if (s.onGround || !NECESITA_TECNICA) return;
    const kt = s.airspeed * 1.94384;
    if (suyas.trenRetractil) {
      if (tramo >= 2 && kt < (suyas.vleKt ?? 999)) o.pedirTren?.(true);
      else if (tramo < 2 && s.verticalSpeed > 1 && s.heightAboveGround > 30)
        o.pedirTren?.(false);
    }
    c.flaps = tramo >= 3 && kt < (suyas.vfeKt ?? 999) ? 1 : 0;
  };

  /**
   * La velocidad a la que toca ir en cada tramo del circuito, m/s.
   *
   * Hasta la esquina de allá, la de crucero —con su tope de baja cota—; desde
   * ahí, **la de aproximación con un margen**, que es frenar en el viento en
   * cola para poder sacar el tren y los flaps. Un reactor no se puede frenar
   * bajando: hay que llegar a final ya lento.
   */
  const velocidadDelTramo = (tramo) =>
    NECESITA_TECNICA && tramo >= 2
      ? Math.min(VELOCIDAD_DE_CRUCERO, (suyas.aproximacion ?? 40) * 1.3)
      : VELOCIDAD_DE_CRUCERO;

  const AJUSTADO_HASTA = 90;
  /**
   * **Si este avión necesita la técnica de los rápidos.**
   *
   * Frenar en el circuito, sacar tren y flaps, no meter gas con velocidad de
   * sobra: todo eso es lo que hace falta para aterrizar un reactor, y lo que
   * **rompía a la avioneta y al turbohélice** cuando se lo apliqué a todos. Se
   * midió: con la configuración para toda la flota, el JAZ 20 y el JAZ 60 —que
   * pasaban 26 de 26— se quedaban flotando en final hasta agotar el tiempo.
   * Todo su piloto está afinado para aterrizar sin flaps, y con ellos
   * sustentaban de más y no tocaban nunca.
   *
   * Así que la raya es la misma que la de la ganancia: el banco se afinó con
   * aviones hasta 90 m/s de crucero, y la técnica extra es para los de
   * encima. Enseñársela también a la avioneta sería otro cambio, con su propia
   * medida delante — no uno que se cuela con este.
   */
  const NECESITA_TECNICA = (suyas.crucero ?? 0) > AJUSTADO_HASTA;
  const ganancia = (s) =>
    Math.min(1, (AJUSTADO_HASTA / Math.max(1, s.airspeed)) ** 2);

  const palancaPorVelocidad = (s, objetivo, extra = 0) =>
    ganancia(s) *
    Math.max(-0.35, Math.min(0.35, (s.airspeed - objetivo) * 0.05 + extra));

  /**
   * Palanca para quedarse a una altura, amortiguada.
   *
   * El término de velocidad vertical es lo que impide el vaivén: sin él, el
   * avión llega a la altura pedida con toda la subida encima, se pasa, corrige
   * y se pasa más. Con él llega y se queda.
   *
   * Y por debajo de la velocidad que se está volando no se tira, pase lo que
   * pase: una altura que falta se recupera, una pérdida en viraje no.
   *
   * **Cuál es esa velocidad es el tercer argumento, y no siempre es la de
   * subida.** Estaba fija en la de subida, treinta y cuatro, y en final se
   * vuela a treinta a propósito — o sea que en toda la aproximación el piloto
   * tenía prohibido tirar y la senda no mandaba nada hacia arriba: sobraba el
   * lazo entero. Lo que queda es el suelo de verdad, que es la velocidad que
   * el propio piloto está pidiendo con el gas en ese momento.
   */
  /**
   * Subir de verdad: la velocidad de subida, **y que además suba**.
   *
   * Sostener una velocidad no es subir. Un lazo que solo mira la velocidad se
   * conforma con cualquier actitud en la que la velocidad cuadre, y la más
   * fácil es el vuelo nivelado: medido en Tukã recién despegado, velocidad
   * clavada en 35 m/s, palanca en 0,06 y cuarenta centímetros por segundo de
   * ascenso. Se iba del extremo de la pista a tres metros del suelo.
   *
   * En el modelo sencillo no se notaba porque ahí el avión va donde apunta el
   * morro y con el gas a fondo sube solo.
   *
   * Así que el mando es el de siempre **más un empujón cuando sobra velocidad
   * y no se sube**. En el modelo sencillo, que ya sube, el empujón vale cero y
   * no cambia nada; en el de coeficientes es lo que levanta el avión.
   *
   * Y se probó lo obvio antes: pedir metros por segundo a secas, como al
   * nivelar. Con techo de cuatro, en Encarnación el terreno de la salida sube
   * más deprisa y el avión se metió en la ladera subiendo limpio; con techo de
   * doce, el modelo de coeficientes se pasa de tirón y pierde el vuelo. El
   * mando de velocidad con un extra es lo único que valió para los dos.
   */
  /**
   * El cabeceo de ahora, en radianes, sacado del cuaternión del avión.
   *
   * Hace falta porque la subida inicial **no se vuela por velocidad**: se
   * rota a una actitud y se mantiene. Ver `subirDeVerdad`.
   */
  const cabeceoDe = (s) => {
    const q = s.orientation;
    const v = 2 * (q.w * q.x - q.y * q.z);
    return Math.asin(Math.max(-1, Math.min(1, v)));
  };

  /**
   * La actitud de la subida inicial, rad.
   *
   * Doce grados. Es lo que se rota en cualquier avión de transporte y algo más
   * de lo que necesita una avioneta, pero **sostener una actitud es lo mismo
   * en los dos** y es lo que de verdad se hace: se tira hasta el morro que
   * toca, se deja ahí, y la velocidad sale sola.
   */
  const CABECEO_DE_SUBIDA = (12 * Math.PI) / 180;

  /** Hasta cuándo se vuela por actitud y no por velocidad, m sobre el suelo. */
  const ASENTAR_LA_SUBIDA = 120;

  const subirDeVerdad = (s) => {
    /*
     * **Los primeros metros, por actitud.**
     *
     * La ley de abajo pide una **velocidad**, y cerca de la de subida el timón
     * que saca es 0,15. A una avioneta le sobra; a un reactor de treinta y un
     * metros no le da para asentar la subida — despegaba, llegaba a doce
     * metros, se volvía a posar, y el juego lo daba por aterrizado mientras
     * seguía a ciento treinta metros por segundo campo a través. Medido en
     * Tenerife Sur, Gran Canaria y Los Rodeos: los tres igual.
     *
     * Y así no se despega en ningún avión: **se rota a una actitud y se
     * mantiene**. La velocidad sale sola de ahí. Volar por velocidad es de
     * después, cuando ya se está arriba.
     */
    if (s.heightAboveGround < ASENTAR_LA_SUBIDA) {
      const falta = CABECEO_DE_SUBIDA - cabeceoDe(s);
      return ganancia(s) * Math.max(-0.35, Math.min(0.6, falta * 4));
    }
    const base = palancaPorVelocidad(s, VELOCIDAD_DE_SUBIDA);
    const falta = Math.max(0, 3 - s.verticalSpeed);
    /*
     * **Y el empujón entra en cuanto hay margen de pérdida, no cuando ya se ha
     * alcanzado la velocidad de subida.**
     *
     * Pedía `airspeed > VELOCIDAD_DE_SUBIDA`, que es la de rotación más un
     * quince por ciento. O sea que el avión rotaba y **se quedaba nivelado a
     * cinco metros acelerando** hasta alcanzarla: medido en Los Rodeos con el
     * bimotor, a setecientos treinta metros de la cabecera seguía a 5,7 m sobre
     * la cota del campo. Eso es una pendiente del 0,8 %; un bimotor sube al 6 o
     * al 10 %.
     *
     * Y no es la técnica: se rota, se comprueba régimen positivo y se sube.
     * Nadie mantiene cinco metros durante setecientos, y quien lo hace se lleva
     * por delante lo que haya —fue así como apareció el choque de #169—.
     *
     * Un cinco por ciento sobre la de rotación es margen de pérdida de sobra
     * para levantar el morro, y por debajo de eso el empujón sigue sin entrar,
     * que es lo que evita rotar demasiado pronto.
     */
    const conMargen = s.airspeed > (suyas.rotacion ?? 28) * 1.05;
    const extra = conMargen ? Math.min(0.25, falta * 0.05) : 0;
    return Math.max(-0.35, Math.min(0.5, base + extra));
  };

  /**
   * Lo más deprisa que este avión puede bajar sin tirarse, m/s.
   *
   * Eran cinco, y cinco es la senda de una avioneta: a treinta y tres metros
   * por segundo, tres grados son dos metros por segundo de caída, así que
   * cinco daba margen de sobra. **A noventa y ocho no.** El de fuselaje ancho
   * necesita cuatro con seis solo para seguir la senda, y con el tope en cinco
   * y un piloto que no llega del todo a lo que pide, se quedaba en tres y
   * medio: entraba sobre el umbral a doscientos metros de altura y se iba
   * derecho por encima de la pista. Se ve en la traza —«umbral 111 m, alto
   * 223»— y es la misma queja de quien juega, «no le da tiempo a descender».
   *
   * Ahora sale de la senda que este avión tiene que volar: su velocidad de
   * aproximación por el seno de cuatro grados, uno más que la senda, para que
   * quepa corregir. Con el JAZ 20 da dos y pico y manda el suelo de cinco, o
   * sea que **la avioneta vuela exactamente como antes**.
   */
  const CAIDA_MAXIMA = Math.max(
    5,
    (suyas.aproximacion ?? 33) * Math.sin((4 * Math.PI) / 180),
  );

  /*
   * **Y aquí no hay término integral, y se probó.**
   *
   * El mando es proporcional, así que se planta donde el error da justo la
   * palanca que hace falta y nunca llega del todo a lo que pide: con el de
   * fuselaje ancho, pidiendo seis metros por segundo de caída se quedaba en
   * cuatro. Se le puso un acumulado —despacio y con tope— para cerrar ese
   * resto, y la cuenta salió mal por los dos lados: al grande no le arregló el
   * aterrizaje —La Palma se le queda corta igual, que es lo que de verdad le
   * pasa— y a la avioneta le movió dos escenarios que estaban limpios, porque
   * seguir la senda más pegado corre la toma y alarga el rodaje de vuelta.
   * Medido en Pettirossi: de doscientos dos segundos a doscientos setenta y
   * uno. Separar el acumulado del crucero y el de la senda no cambió nada, así
   * que no era mezcla: era el acumulado.
   *
   * Un banco que cambia de veredicto en dos campos a cambio de no arreglar lo
   * que iba a arreglar no compensa. Queda escrito para no volver a probarlo.
   */
  const aLaAltura = (s, objetivo, minima = VELOCIDAD_DE_SUBIDA) => {
    /*
     * Se manda **velocidad vertical**, no palanca, y se limita.
     *
     * Es el paso que faltaba. Mandando palanca en proporción a la altura que
     * falta, un objetivo cien metros más bajo pide media palanca de morro
     * abajo, y eso no es descender: es tirarse. Medido en final, entrando a
     * 176 m con la senda en 40: de 176 a 64 metros en dos segundos y de 53 a
     * 68 m/s. Pidiendo cinco metros por segundo de bajada, el mismo error se
     * recorre en veinte segundos y el avión llega volando.
     */
    const quiere = Math.max(
      -CAIDA_MAXIMA,
      Math.min(4, (objetivo - alto(s)) * 0.1),
    );
    const error = quiere - s.verticalSpeed;
    /*
     * **Y tres décimas de palanca, ni una más.**
     *
     * Se subió a 0,35 de paso, al probar el término integral, y se quedó
     * puesto al quitarlo. Cinco centésimas: en Pettirossi movieron la toma
     * seiscientos metros —el rodaje de vuelta pasó de 202 segundos a 249, por
     * encima del listón— sin que nada dijera por qué. Lo que un piloto de
     * banco puede tirar decide dónde se posa el avión, y eso no se ajusta de
     * pasada.
     */
    const mando = Math.max(-0.3, Math.min(0.3, error * 0.08));
    const conSuMando = mando * ganancia(s);
    return s.airspeed < minima ? Math.min(0, conSuMando) : conSuMando;
  };

  /**
   * Un punto del eje de pista **siempre por delante**, saliendo.
   *
   * `puntoDeFinal(d)` mide desde la cabecera en uso hacia atrás, o sea hacia
   * el final; con `d` negativo se va hacia delante por la pista. Pidiendo dos
   * kilómetros más allá de la cabecera contraria, el punto queda por delante
   * de cualquier avión que esté saliendo, entre en pista por donde entre.
   *
   * Esto se escribió primero como `puntoDeFinal(-2000)`, un punto fijo, y en
   * Guaraní se entra en pista a 1.522 m de la cabecera: el punto caía a 478 m
   * por delante, el avión lo rebasaba todavía rodando a 39 m/s y el piloto
   * daba media vuelta con alerón a fondo — contra la fila de hangares. Y se
   * escribió después como «mantener el rumbo de pista», que es peor: el rumbo
   * nominal es el de **una** de las dos cabeceras, y saliendo por la otra eso
   * es media vuelta pedida a treinta metros de altura.
   */
  const porDelante = () => finalAhora(-(pista.length + 2000));

  /**
   * El rumbo con el que se sale, que **no es el rumbo nominal de la pista**.
   *
   * Una pista tiene dos cabeceras y su `heading` es el de una de ellas; por
   * cuál se sale lo decide el viento. `puntoDeFinal` ya sabe cuál está en uso
   * y devuelve, con el punto, el rumbo que va de esa cabecera a la contraria:
   * o sea, el de salida. Se pregunta una vez, en el suelo, y ya no cambia.
   *
   * Se probó a sostener el eje volando **a un punto** en vez de a un rumbo y
   * no vale: cualquier punto fijo se acaba rebasando, y en cuanto se rebasa el
   * piloto pide media vuelta. Medido: el avión salía derecho noventa segundos
   * y a los 3.600 m se tiraba de lado hasta el suelo.
   */
  const rumboDeSalida = porDelante()?.h ?? rumboPista;

  /**
   * Lo más que se apunta contra el eje al capturarlo, en radianes.
   *
   * Veinte grados. El juego manda irse al aire por encima de veinte de
   * desalineación —ver `MARGENES.torcido`—, así que capturar con más de eso es
   * capturar de una forma que el propio juego llama mal hecha.
   */
  const ANGULO_DE_CAPTURA = (20 * Math.PI) / 180;

  /** Diferencia de rumbo, de −π a π. */
  const error = (a, b) => {
    let e = a - b;
    while (e > Math.PI) e -= 2 * Math.PI;
    while (e < -Math.PI) e += 2 * Math.PI;
    return e;
  };
  /**
   * Mando de alerón para ir a un rumbo.
   *
   * **En el aire se limita a un tercio**, y no es un ajuste fino: con el mando
   * llegando entero al avión, media vuelta con alerón a fondo a ciento
   * cincuenta metros de altura es un viraje de cuchillo, y un viraje de
   * cuchillo pierde altura mucho más deprisa de lo que el motor la recupera.
   * Medido en Guaraní: de 154 a 41 metros en cinco segundos, con la velocidad
   * subiendo de 40 a 60 m/s. El avión no se rompía virando, se rompía cayendo
   * mientras viraba.
   *
   * En tierra no se limita: allí el alerón es la rueda de morro y lo que hace
   * falta es dirección, no inclinación.
   */
  const TOPE_DE_ALERON_EN_VUELO = 0.35;
  /**
   * Y cuánto se puede inclinar: veinticinco grados.
   *
   * Es lo que llamaría viraje normal cualquier manual, y aquí además es la
   * diferencia entre virar y caer. **El alerón manda velocidad de alabeo, no
   * inclinación**: sostenerlo es seguir girando sobre el eje, así que un
   * piloto que empuja el alerón «hasta estar en rumbo» acaba boca abajo y en
   * espiral, tirando de la palanca mientras baja. Le pasó a este: de 168 a 39
   * metros en cinco segundos con la palanca pidiendo subir.
   *
   * Con esto, el alerón lo decide la inclinación que falta y no el rumbo que
   * falta, que son dos cosas distintas y solo la primera se puede sostener.
   */
  const TOPE_DE_INCLINACION = (25 * Math.PI) / 180;
  const alRumbo = (s, rumbo) => {
    const e = error(rumbo, s.heading);
    /*
     * En tierra el alerón es la rueda de morro. Con ganancia 2 y el mando
     * entero, la corrección se pasa y la siguiente se pasa al otro lado: el
     * avión se iba del asfalto rodando. Con 1,2 llega y se queda.
     */
    if (s.onGround) return Math.max(-1, Math.min(1, e * 1.2));
    const quiere = Math.max(
      -TOPE_DE_INCLINACION,
      Math.min(TOPE_DE_INCLINACION, e * 1.5),
    );
    const alabeo = o.actitud?.().alabeo ?? 0;
    return Math.max(
      -TOPE_DE_ALERON_EN_VUELO,
      Math.min(TOPE_DE_ALERON_EN_VUELO, (quiere - alabeo) * 1.6),
    );
  };
  /** Y para ir a un punto. */
  const alPunto = (s, x, z) =>
    alRumbo(s, Math.atan2(x - s.position.x, -(z - s.position.z)));

  /**
   * Hacia ese punto **por el suelo**, corrigiendo la deriva del viento.
   *
   * `alPunto` apunta el **morro** al sitio, y con viento cruzado el morro y la
   * trayectoria no son lo mismo: el avión mira al eje y el aire lo va llevando
   * de lado. Medido en Tenerife Norte con el viento del parte: tocaba a trece
   * metros y medio del eje, con la pista entera por delante y sin enterarse.
   *
   * Un piloto de verdad no apunta el morro: apunta **la trayectoria**, y para
   * eso pone el morro un poco al viento. Se llama cruzarse, y es lo que hace
   * cualquiera cruzando un río a nado.
   *
   * La cuenta no necesita saber cuánto viento hace: el propio avión lo dice
   * comparando hacia dónde mira con hacia dónde va. Por debajo de cinco metros
   * por segundo esa comparación es ruido, así que ahí manda el morro.
   */
  const alPuntoPorElSuelo = (s, x, z) => {
    const deseado = Math.atan2(x - s.position.x, -(z - s.position.z));
    const porElSuelo = Math.hypot(s.velocity.x, s.velocity.z);
    if (porElSuelo < 5) return alPunto(s, x, z);
    const trayectoria = Math.atan2(s.velocity.x, -s.velocity.z);
    // Lo que el viento se lleva: la diferencia entre a dónde mira y a dónde va.
    const deriva = error(trayectoria, s.heading);
    return alRumbo(s, deseado - deriva);
  };

  /** Cuánto se está del eje de la pista, en metros. Para la traza. */
  const desvio = (s) => {
    const r = pistaAhora();
    const hp = (r.heading * Math.PI) / 180;
    return (
      (s.position.x - r.x) * Math.cos(hp) + (s.position.z - r.z) * Math.sin(hp)
    );
  };

  /**
   * Cuánto falta para el umbral por el que se entra, a lo largo del eje.
   *
   * El compañero de `desvio`: uno dice cuánto te has ido de lado y éste cuánto
   * te queda por delante. Negativo cuando ya se ha pasado la cabecera, o sea
   * cuánta pista se lleva gastada.
   *
   * Estaba escrito a mano dentro de la etapa de final y en ningún otro sitio,
   * y por eso el parte del banco no sabía decir **dónde** iba el avión en la
   * aproximación: la única columna de sitio era el desvío lateral. Un vuelo
   * que se queda corto y otro que se pasa de largo salían idénticos.
   */
  const alUmbral = (s) => {
    const r = pistaAhora();
    const hp = (r.heading * Math.PI) / 180;
    const along =
      (s.position.x - r.x) * Math.sin(hp) +
      (s.position.z - r.z) * -Math.cos(hp);
    return -r.length / 2 - along;
  };

  /**
   * Seguir la raya: se mira un punto de la ruta quince metros por delante y se
   * gira hacia él. Es lo que hace quien sigue una raya pintada en el suelo.
   */
  /**
   * Cuánto se mira por delante al seguir la raya, m.
   *
   * **Según lo que se corra**, no quince metros fijos. Quince es lo que mira
   * quien va al paso; a doce metros por segundo eso es medio segundo de
   * anticipación, y con el mando llegando entero al avión —que es lo que
   * cambió al pasar por `pilotar`— el piloto zigzagueaba y se salía del
   * asfalto en el rodaje de vuelta. Antes no se notaba porque el teclado le
   * borraba el mando: iba mal dirigido pero flojo.
   *
   * Mirar más lejos cuanto más deprisa se va es lo que hace cualquiera
   * conduciendo, y es lo que convierte un zigzag en una curva.
   */
  /**
   * A qué distancia mira el piloto por delante para seguir la raya, m.
   *
   * **Y mira más lejos cuanto más fuera de la raya está.**
   *
   * Esto es persecución pura —apuntar a un punto de la ruta y girar hacia
   * él—, y la persecución pura tiene un fallo conocido: si el punto al que
   * mirás está más cerca de lo que el bicho puede girar, no llegás nunca.
   * Girás, te pasás, girás al revés, te pasás otra vez, y lo que sale es **un
   * círculo eterno**.
   *
   * Es exactamente lo que hacía, y se vio en el parte en cuanto dijo dónde
   * estaba: en Yvytu Rape, saliendo de la pista, «−742 m … −726 m … −742 m»
   * con el desvío oscilando ±15 m, durante los quinientos segundos que
   * faltaban hasta rendirse. Un círculo de quince metros de radio. Una de
   * cada ocho carreras, según por dónde hubiera salido de la pista.
   *
   * **Y subir el suelo a secas sale peor.** Con veinte metros fijos, Yvytu
   * Rape se arregla —ocho carreras seguidas volviendo al puesto en 57-64 s—
   * pero mirar lejos es cortar las curvas, y el rodaje de ida está lleno de
   * ellas: Pettirossi se metió en un edificio a los 24 s y Mariscal
   * Estigarribia atropelló al coche a los 9. Cambiar un fallo de uno de cada
   * ocho por dos seguros no es arreglarlo.
   *
   * Lo que hace falta es lo otro: **la mirada larga solo cuando hace falta**,
   * que es cuando se está lejos de la raya. Pegado a ella, doce metros y las
   * curvas salen cerradas; a quince metros fuera, veintidós, que ya es más de
   * lo que el avión gira y el círculo no se cierra.
   */
  const miraDe = (s, fuera = 0) => Math.max(12, s.airspeed * 1.6, fuera * 1.5);
  const timon = (s, ruta) => {
    if (ruta.length < 2) return 0;
    let cerca = 0;
    let mejor = Infinity;
    for (let i = 0; i < ruta.length; i++) {
      const d = Math.hypot(
        ruta[i][0] - s.position.x,
        ruta[i][1] - s.position.z,
      );
      if (d < mejor) {
        mejor = d;
        cerca = i;
      }
    }
    let mira = ruta[ruta.length - 1];
    for (let i = cerca; i < ruta.length; i++) {
      const d = Math.hypot(
        ruta[i][0] - s.position.x,
        ruta[i][1] - s.position.z,
      );
      if (d > miraDe(s, mejor)) {
        mira = ruta[i];
        break;
      }
    }
    return alPunto(s, mira[0], mira[1]);
  };

  /** Lo que queda de ruta hasta su final, en metros. */
  const alFinalDeLaRuta = (s, ruta) => {
    if (!ruta.length) return Infinity;
    const f = ruta[ruta.length - 1];
    return Math.hypot(f[0] - s.position.x, f[1] - s.position.z);
  };

  let umbral = finalAhora(0);
  let cotaDePista = umbral ? o.suelo(umbral.x, umbral.z) : 0;
  /**
   * Altura sobre la pista, que es la que importa para volar un circuito.
   *
   * **Y sobre el trozo de pista que toca, no sobre su centro.** Una pista con
   * pendiente no está a una sola cota: la de La Palma baja once metros y medio
   * de punta a punta, así que volando la senda contra la cota del centro se
   * llega seis metros bajo en la cabecera alta — y seis metros de menos en una
   * senda de tres grados son **ciento veinte metros de terreno antes del
   * umbral**. Medido allí: el avión tocaba a 122 m del asfalto y el juego lo
   * cantaba, con razón, como aterrizaje fuera de pista.
   */
  const alto = (s) =>
    s.position.y -
    ((o.cotaDePistaDeAhora ?? o.cotaDePista)?.(s.position.x, s.position.z) ??
      cotaDePista);

  // Doscientos metros y la entrada en final a dos kilómetros y medio: es un
  // circuito de verdad y es lo más corto que se puede volar sin que parezca
  // otra cosa. El banco tarda lo que tarda un vuelo, y hay que poder correrlo.
  const CRUCERO = 200;
  const SENDA = Math.tan((3 * Math.PI) / 180);

  /*
   * **Las fases en las que el juego promete una raya que seguir.**
   *
   * Esto era «todas menos aterrizado», y contaba como fallo dos huecos que son
   * a propósito: la carrera de despegue —donde la raya se borra porque lo que
   * se sigue es la pista, y hay una comprobación aparte que exige justo eso— y
   * el final del vuelo en el puesto, donde ya no queda sitio a donde ir.
   *
   * Medido en Yvytu Rape: 9,4 s de «raya que falta», el primero a los 40 s en
   * «despegando» a 9 m/s y el último a los 238 en «apagado» con el avión
   * parado. Ni uno solo de esos segundos era rodando.
   */
  const CON_RAYA = new Set([
    "estacionado",
    "arrancando",
    "rodando",
    "esperando",
    "autorizado",
    "alineando",
    "abandonando",
    "a-plataforma",
  ]);

  const linea = [];
  /** Un renglón por cambio de fase: por dónde se torció el vuelo. */
  const hitos = [];
  /** La carrera de despegue, con el mando delante. Ver más abajo. */
  const carrera = [];
  let faseAnterior = "";
  let etapa = "arrancar";
  /** En qué campo se puso el avión al cruzar, si se cruzó. Ver `destino`. */
  let enElDestino = null;
  let mudo = 0;
  let mudoMaximo = 0;
  let mudoDonde = "";
  let vueltaMetros = 0;
  /*
   * **Dónde se quedó el avión al frenar, y dónde acabó.**
   *
   * El rodaje de vuelta empieza donde cae el avión después de la toma, y eso
   * depende de dónde tocó y de cuánto rodó frenando: variación física legítima
   * de cientos de metros. Cronometrarlo mide esa variación tanto como mide la
   * ruta —medido, la misma vuelta da entre 189 y 237 segundos—, así que el
   * listón acababa dentro de su propio ruido y la comprobación salía a cara o
   * cruz. Ver #166.
   *
   * Lo que no hereda esa varianza es **cuánto rodea**: los metros rodados
   * partidos por los que hay en línea recta desde donde se paró hasta el
   * puesto. Eso sí dice si la ruta se va por donde no debe, que es lo que la
   * comprobación quería vigilar.
   */
  let largoDeLaRuta = 0;
  /**
   * Las puertas distintas que se asignaron durante una misma llegada.
   *
   * Tiene que haber **una**. A un avión que llega se le da una puerta y nadie
   * se la cambia mientras rueda; aquí se la cambiaban en cada fotograma, y el
   * avión iba detrás de la raya verde de un lado a otro del aeropuerto.
   */
  const puertas = [];
  const verBackTaxi = new Set();
  /*
   * **Y el señalero, que no lo miraba nadie.**
   *
   * Veinticuatro comprobaciones por escenario y ni una del señor de los
   * bastones — que es, además, «lo único que hace un aeropuerto cuando el
   * avión ya no vuela». Se arregló una vez que se quedaba plantado en el
   * puesto de salida cuando el de llegada era otro, y no había nada que
   * dijera si seguía arreglado. Contado jugando: «nadie me esperaba en Gran
   * Canaria».
   *
   * Se apunta lo mínimo que hace falta para poder afirmar algo: si llegó a
   * verse, qué gestos hizo y a cuánto de su sitio estaba el avión cuando se
   * le vio.
   */
  const senalero = {
  visto: false,
  gestos: new Set(),
  masCerca: Infinity,
  /* Y por qué no se le vio, que es lo que faltaba. Ver `comoVa`. */
  porQueNo: new Set(),
  donde: "sin puesto",
};
  let antes = null;
  let sinRaya = 0;
  let sinRayaDonde = "";
  let sinRayaPrimero = "";
  let lejosDelCoche = 0;
  /*
   * **Y dónde pasó**, que sin eso el fallo no se puede perseguir.
   *
   * Esto decía «lo más lejos que llegó a estar: 722 m» y ahí se acababa el
   * parte. Con doce de cada catorce carreras dando 36 m clavados y dos dando
   * setecientos y pico, lo único que hace falta saber es en qué fase y en qué
   * segundo se dispara — y eso no había forma de sacarlo sin volver a correr
   * el banco con una sonda a mano.
   */
  let lejosDondeCoche = "";
  let cercaDelCoche = Infinity;
  /*
   * **Y si el coche llegó a pisar la pista con el avión encima de ella.**
   *
   * Un sígame no circula por una pista en uso, y el juego ya lo sabía: el tope
   * que lo hace esperar en la boca de la salida está escrito y explicado. Lo
   * que fallaba es que miraba **una fase** —«aterrizado»— y en cuanto pasaba a
   * «abandonando», que es justo cuando te dicen que salgas, el coche volvía a
   * ponerse treinta metros por delante del morro. Y va a velocidad de coche:
   * quien acelera hacia una salida lejana lo alcanza y se lo lleva puesto.
   *
   * «Acelero porque en esta pista las salidas están lejos, y se rompió,
   * volvemos a empezar.» Se apunta lo más cerca que llegó a estar **mientras
   * los dos estaban en pista**, que es la situación imposible de esquivar.
   */
  let cocheEnPista = Infinity;
  let ladoAlEstarCerca = Infinity;
  let cercaCuando = "";
  let alCocheAhora = -1;
  let ladoDelCoche = -1;
  let terrenoEnPista = 0;
  /*
   * **Y en la final del otro campo**, cuántas veces salta el aviso de terreno
   * estando en final. En casa la final ya es excusa para que se calle; en el
   * campo de llegada no lo era, porque la distancia al umbral se medía hasta
   * el de casa: «terrain, pull up» a ciento veinte metros en una final bien
   * volada a Los Rodeos.
   *
   * Se cuenta **cuándo salta**, no cuánto dura. Este piloto deja el
   * variómetro en cero a ratos, y con eso la fase sale de «final» un segundo
   * —pide ir bajando— y el aviso puede saltar en ese segundo, que es lo que
   * pasa también en casa. Lo que no puede pasar es que salte con la fase en
   * «final»: eso es no reconocer la final.
   */
  let terrenoEnFinalAlli = 0;
  let terrenoAntes = null;
  /** Cuánto se había hablado al cruzar, para mirar solo lo dicho allí. */
  let habladasAlCruzar = -1;
  let dijoToca = false;
  let pidioFreno = false;
  let tiempoDeRodajeIda = 0;
  let tiempoDeRodajeVuelta = 0;
  let despego = 0;
  let toco = 0;
  /** Dónde y cómo se tocó: del eje, pasado el umbral y a qué velocidad. */
  let tocoDesviado = 0;
  let tocoPasadoElUmbral = 0;
  let tocoA = 0;
  /*
   * **Y cuánta pista se come frenando**, que es lo que faltaba medir.
   *
   * Contado jugando: «freno en la pista en dos metros, eso no se lo cree
   * nadie». Las dos cuentas —la física de `rodaduraDeFrenada` y la prueba por
   * avión que la comprueba paso a paso— dicen que no, que el de fuselaje ancho
   * necesita más de un kilómetro; pero ninguna de las dos vuela: las dos miden
   * el modelo a solas, con el avión puesto a mano a la velocidad de toma y sin
   * nada más del juego encima. Y encima hay un tope de rodaje que toca el
   * freno, un trinquete que baja el techo y una máquina de fases.
   *
   * Aquí se mide **lo que pasa aterrizando de verdad**: los metros que separan
   * el punto donde tocaron las ruedas del punto donde el avión ya va a paso de
   * rodaje. Si algún día vuelve a pararse en dos metros, se ve aquí.
   */
  let rodaduraMedida = 0;
  let antesDeFrenar = null;
  /*
   * **Y la velocidad respecto al suelo al tocar, que es la que frena.**
   *
   * Sin esto, esta medida comparaba una velocidad del aire contra una
   * distancia del suelo: en Canarias sopla el alisio casi siempre, y tocar a
   * 32 m/s de aire con quince nudos de cara son bastantes menos de suelo. La
   * carrera se acorta **de verdad**, porque aterrizar contra el viento acorta
   * la carrera — eso es la lección, no un fallo. Pero el listón se sacaba de
   * la ficha del avión, que no sabe de viento, así que el banco fallaba en la
   * frontera: «rodó 97 m, su ficha pide al menos 101», y el avión frenaba
   * perfectamente. Ver `src/flight/frenada.test.ts`.
   */
  let tocoSuelo = 0;
  let dejoDeFrenarA = 0;
  /*
   * **Y cuántos fotogramas de la frenada se pasan con las ruedas en el aire.**
   *
   * Porque un freno solo frena si la rueda toca. Si la pista bota, el avión
   * pisa el freno la mitad del tiempo y frena la mitad, y eso no se ve en
   * ninguno de los números de arriba: la frenada sale larga y parece que el
   * avión frena mal, cuando lo que pasa es que la pista está mal.
   */
  let frenadaFotogramas = 0;
  let frenadaEnElAire = 0;
  /*
   * **Y si el vuelo se dio por terminado con el avión todavía en la pista.**
   *
   * Frenando se está sobre el asfalto por definición, así que si en ese tramo
   * la fase salta a «en puesto» o «apagado», el juego ha dado por estacionado
   * a alguien que está bloqueando la pista. Contado jugando dos veces:
   * «llegaste, apagá el motor — pero si estoy en la pista todavía» y «apago el
   * motor en mitad de la pista y vuelo terminado, y gano hasta galones».
   */
  let acaboEnLaPista = false;
  const fases = new Set();
  /*
   * **Y todo lo que llegó a decir la torre.**
   *
   * Tenía siete frases grabadas y decía dos: las otras cinco viajaban en el
   * pack a cada tablet sin que nada en `src/` las nombrara. Que la clave
   * resuelva no basta —eso ya lo comprueba `verificar-voces`—; lo que hace
   * falta saber es si **suenan en un vuelo**, que es donde estaba el agujero.
   */
  const deLaTorre = new Set();
  /*
   * Y lo que canta la cabina, que va por la boca de la instructora. «V one» y
   * «rotate» son los dos momentos del despegue y con el 747 no salía ninguno:
   * «en ese mismo vuelo, al despegar no me avisa del V1 ni VR ni nada».
   */
  const deLaCabina = new Set();
  /*
   * Y **lo más rápido que llegó a ir creyéndose en la pista**, que es la
   * condición que enciende V1: `onRunway && airspeed > decisionSpeed`. Si el
   * avión se sale del rectángulo antes de llegar a su velocidad de decisión,
   * el destello y el canto no salen nunca y no hay forma de saber por qué.
   */
  let masRapidoEnPista = 0;
  /*
   * **Y con qué pendiente sube después de rotar.**
   *
   * Es lo que decide si un despegue libra lo que hay delante, y no se medía.
   * El piloto del banco subía al 0,8 % —nivelado a cinco metros acelerando— y
   * el síntoma que se veía era otro: un choque contra un bulto a setecientos
   * metros de la cabecera. Ver #169.
   *
   * Se mide donde importa: desde que las ruedas dejan el suelo hasta los cien
   * metros sobre la cota de la pista, que es el primer minuto del vuelo.
   */
  let subidaDesde = null;
  let pendiente = null;
  let seSalioEnPista = 0;
  let gasEnLaCarrera = 0;
  const verV1 = new Set();
  /** Todas las tarjetas que llegaron a verse. Para saber qué faltó. */
  const vistas = new Set();
  /** Cuándo se rompió, si se rompió. */
  let seRompio = 0;
  /** Dónde y contra qué se rompió, si se rompió. Ver el percance, abajo. */
  let donde = null;
  /*
   * Los edificios del aeródromo, para poder decir contra cuál se chocó.
   *
   * Se piden una vez: son decenas de polígonos y no se mueven.
   */
  const edificios = o.edificios?.() ?? [];
  const alBorde = (p, a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    const u =
      l2 < 1e-9
        ? 0
        : Math.max(
            0,
            Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2),
          );
    return Math.hypot(p[0] - (a[0] + dx * u), p[1] - (a[1] + dy * u));
  };
  const cualEdificio = (x, z) => {
    let mejor = null;
    for (let k = 0; k < edificios.length; k++) {
      const e = edificios[k];
      let d = Infinity;
      for (let i = 0; i < e.puntos.length; i++)
        d = Math.min(
          d,
          alBorde([x, z], e.puntos[i], e.puntos[(i + 1) % e.puntos.length]),
        );
      if (!mejor || d < mejor.d)
        mejor = { k, d: +d.toFixed(1), alto: +e.alto.toFixed(1) };
    }
    return mejor;
  };
  /** A qué vértice del circuito se va ahora. Ver la etapa «subir». */
  let aDonde = 1;
  let tocaDichas = 0;
  const cuandoDijoToca = [];
  let queLaTapo = "";
  /** Lo más bajo que se llegó a estar sobre la pista, volando, y con qué. */
  let mejorAltura = Infinity;
  let mejorVertical = 0;
  let mejorFase = "";

  /** Cada cuánto mira el piloto lo que pasa, en segundos **de juego**. */
  const PASO = 0.1;
  /*
   * **Y el reloj del juego va más deprisa que el de la pared.**
   *
   * Un vuelo entero son unos ocho minutos de reloj, y esto se corre por siete
   * escenarios: casi dos horas por barrido, que es tanto como no tenerlo —«no
   * puede ser que yo tenga que estar media hora entre prueba, grabación,
   * comprobar que el fallo todavía está»—. Acelerado, el mismo vuelo cabe en
   * un minuto largo.
   *
   * El juego dice lo que pudo poner, que puede no ser lo pedido: hay tope, y
   * por buenos motivos. Ver `Game.acelerar`.
   */
  const veces = o.acelerar?.(vecesPedidas) ?? 1;
  /*
   * **Y el reloj baja en la carrera de despegue.**
   *
   * A doce, la carrera de una avioneta —doscientos veinticinco metros, diez
   * segundos— cabe en un fotograma, y entre V1 y Vr no hay ninguno: el banco
   * no puede ver lo que pasa ahí. Daba «no canta V1» con aviones que sí la
   * cantan, y daba una cosa distinta en cada tirada según dónde cayera el
   * muestreo. Una regla de medir que no resuelve lo que mide no mide.
   */
  let relojAhora = veces;
  const relojPara = (fase) => {
    /*
     * **Desde el punto de espera, no desde «alineando».**
     *
     * Si se espera a que la fase sea de despegue para bajar el reloj, ya es
     * tarde: a doce, la carrera de una avioneta cabe en un fotograma y **no cae
     * ni un muestreo dentro**, así que el banco no veía ninguna de las tres
     * fases y decía «no canta V1» donde sí la canta. En Pettirossi, además, se
     * sale con back-taxi, y ese medio minuto también hay que verlo.
     */
    const enLaCarrera = [
      "autorizado",
      "back-taxi",
      "alineando",
      "despegando",
      "comprometido",
    ].includes(fase);
    const quiere = enLaCarrera ? Math.min(2, veces) : veces;
    if (quiere !== relojAhora) {
      relojAhora = quiere;
      o.acelerar?.(quiere);
    }
  };
  /*
   * Veinte minutos **de vuelo**. Un vuelo entero son unos ocho; el resto es
   * margen para que, cuando algo falle, se vea **dónde** se quedó parado.
   *
   * Eran quince y se quedaron cortos el día que el banco empezó a volar los
   * back-taxi de verdad: en Pettirossi la plataforma cae junto a la cabecera
   * contraria, así que hay que rodar mil doscientos metros por la propia pista
   * antes de despegar, y eso son dos minutos largos que antes el banco se
   * saltaba yendo al campo. Un vuelo que tarda más porque **hace más** no es un
   * vuelo que falle.
   */
  /*
   * **Y treinta minutos, no veinte, porque una frustrada es un circuito más.**
   *
   * Con veinte, un vuelo con **dos** frustradas no cabía: la torre manda
   * irse al aire, se da otra vuelta al circuito —doscientos y pico segundos—
   * y el presupuesto se acaba con el avión todavía volando. Medido, el mismo
   * banco tres veces seguidas: con cero y con una frustrada, 22 de 22; con
   * dos, ocho fallos de golpe.
   *
   * Y esos ocho fallos no eran ocho cosas rotas: eran **una**, contada ocho
   * veces, porque todo lo que se mide después de aterrizar falla cuando no se
   * llega a aterrizar. Costó dos investigaciones en falso — una de ellas
   * culpándome de haber editado el código mientras el banco volaba. Un
   * instrumento que reporta su propio reloj agotado como ocho defectos manda a
   * buscar fantasmas. Ver `seQuedoSinTiempo`.
   *
   * Frustrar es parte del vuelo y está en la lección; un vuelo que tarda más
   * porque **hace más** no es un vuelo que falle.
   */
  const TOPE = 1800;
  /*
   * Y el tiempo se lee del juego, no se cuenta por vueltas.
   *
   * Antes era `i * PASO`: «cien milisegundos por vuelta, luego esto son doce
   * segundos». Es mentira en cuanto la máquina va cargada —seis pestañas de
   * Chrome, que es como se pasa un barrido entero— y con el reloj acelerado
   * lo es del todo. Todo lo que este banco mide son **duraciones** —cuánto se
   * rueda, cuánto tiempo estuvo muda la pantalla, cuánto sin raya—, así que
   * medirlas con un reloj que miente es no medirlas.
   */
  /** Cuánto flotaba el avión sobre el suelo antes de moverse, m. */
  const alPrincipioFlotaba = (() => {
    const g = o.aeronave?.().grupo;
    if (!g) return null;
    g.updateWorldMatrix(true, true);
    let bajo = Infinity;
    g.traverse((n) => {
      const pos = n.geometry?.attributes?.position;
      if (!pos) return;
      for (let i = 0; i < pos.count; i++) {
        const v = n.localToWorld(
          new n.position.constructor(pos.getX(i), pos.getY(i), pos.getZ(i)),
        );
        if (v.y < bajo) bajo = v.y;
      }
    });
    const p = o.estado().position;
    return bajo === Infinity ? null : +(bajo - o.suelo(p.x, p.z)).toFixed(2);
  })();

  /*
   * **Y un segundo tope, éste de reloj de pared, porque el de arriba no basta.**
   *
   * El presupuesto se mide en segundos **de juego**, y eso está bien pensado:
   * todo lo que mide este banco son duraciones, y contarlas por vueltas miente
   * en cuanto la máquina va cargada. Pero tiene un agujero que se tragó media
   * tarde: **si el reloj del juego deja de avanzar, `t` no crece y el bucle no
   * tiene salida.** Playwright no le pone tope a un `evaluate`, así que el
   * banco se queda esperando para siempre, sin imprimir una sola línea.
   *
   * Medido en Guaraní, con el reloj a ×4: treinta minutos de pared, cero
   * líneas de salida y un `timeout` externo teniendo que matarlo. En el
   * barrido eso sale como «sin parte», que es justo lo que se arregló esta
   * madrugada para el arranque — y aquí volvía por la puerta de atrás.
   *
   * Es la avería de siempre en esta casa: **dos relojes cruzados**. La cura no
   * es cambiar el presupuesto de reloj —el de juego es el correcto para lo que
   * mide— sino ponerle al lado un tope del otro reloj, generoso, que solo se
   * agota cuando algo va mal de verdad. El doble de lo que el vuelo puede
   * tardar legítimamente a la velocidad que el juego dice que va.
   */
  const paredEmpezo = Date.now();
  const TOPE_DE_PARED = Math.max(180, (TOPE / veces) * 2) * 1000;
  let seQuedoSinPared = false;

  /** La última altura a la que el piloto creía que tenía que ir, m. */
  let ultimoAltoQueToca = null;
  /** Traza de la subida: qué se pidió y qué hizo el avión. */
  const subida = [];

  const empezo = o.reloj();
  let leidoAntes = empezo;
  let t = 0;
  let i = 0;
  for (; t < TOPE; i++) {
    await new Promise((r) => setTimeout(r, (PASO / veces) * 1000));
    if (Date.now() - paredEmpezo > TOPE_DE_PARED) {
      seQuedoSinPared = true;
      break;
    }
    const ahora = o.reloj();
    /** Lo que ha pasado de verdad desde la muestra anterior. */
    const paso = ahora - leidoAntes;
    leidoAntes = ahora;
    t = ahora - empezo;
    const s = o.estado();
    const fase = o.fase();
    /*
     * La traza se toma en dos ventanas: la subida —los primeros cuarenta y
     * cinco— y la aproximación, que es donde falla ahora el reactor. Con una
     * sola ventana al principio, lo que pasa en final no se veía nunca.
     */
    const enFinal = /final|aterriz|frustr/.test(fase) || etapa === "final";
    if (
      !s.onGround &&
      i % 10 === 0 &&
      ((subida.length < 45 && !enFinal) || (enFinal && subida.length < 110))
    ) {
      const cc = o.controles();
      subida.push(
        `${t.toFixed(0)}s ${etapa}/${fase} alto ${s.heightAboveGround.toFixed(0)}m` +
          ` vel ${s.airspeed.toFixed(0)} sube ${s.verticalSpeed.toFixed(1)}` +
          ` elev ${cc.elevator.toFixed(2)} trim ${(cc.trim ?? 0).toFixed(2)}` +
          ` cabeceo ${((cabeceoDe(s) * 180) / Math.PI).toFixed(1)}°`,
      );
    }
    const ruta = o.ruta();
    const tarjeta = o.tarjeta();
    fases.add(fase);
    /*
     * **La puerta se mira desde el fotograma en que se toca, y esto ya falló.**
     *
     * La primera versión la miraba dentro de la etapa «volver» del guion, que
     * empieza cuando el avión ha frenado por debajo de ocho metros por segundo.
     * Para entonces el baile de puertas ya ha pasado: ocurre mientras se
     * abandona la pista, que se hace deprisa. Con el arreglo deshecho a
     * propósito, el rodeo salía ×1,63 y esta comprobación seguía en verde —o
     * sea, no medía lo que dice medir.
     */
    {
      const p = o.puerta?.();
      if (p) {
        const clave = `${Math.round(p[0])},${Math.round(p[1])}`;
        if (!puertas.includes(clave)) puertas.push(clave);
      }
    }
    relojPara(fase);
    if (fase === "back-taxi" || fase === "autorizado") {
      const b = o.backTaxi?.();
      if (b)
        verBackTaxi.add(`giro=${b.giro} along=${b.along} queda=${b.restante}`);
    }
    {
      const sen = o.senalero?.();
      const donde = sen?.donde;
      if (donde) {
        senalero.donde = `${Math.round(donde.x)},${Math.round(donde.z)}`;
        const s = o.estado();
        senalero.masCerca = Math.min(
          senalero.masCerca,
          Math.hypot(s.position.x - donde.x, s.position.z - donde.z),
        );
      }
      if (sen?.grupo?.visible) {
        senalero.visto = true;
        if (sen.gestoDeAhora) senalero.gestos.add(sen.gestoDeAhora);
      } else if (sen?.comoVa) {
        const v = sen.comoVa;
        /*
         * Con la fase delante, que es lo que faltaba: sin ella la lista se
         * llenaba de la salida —donde es correcto que no se le vea— y la
         * vuelta, que es lo que se busca, quedaba escondida entre repetidos.
         */
        senalero.porQueNo.add(
          `${fase}: puesto=${v.puesto} volviendo=${v.volviendo} queda≈${
            Math.round(v.restante / 100) * 100
          }`,
        );
      }
    }
    const bocas = o.dicho?.();
    if (bocas?.torre) deLaTorre.add(bocas.torre);
    /*
     * **Y se apunta la clave o el texto**, que no siempre es lo mismo.
     *
     * Sin pack de voz cargado —que es lo normal en este banco: el pack se baja
     * tras el primer gesto y aquí no hay gestos— la frase la dice el navegador
     * y lo que queda apuntado es **el texto en inglés**, no la clave
     * `cabina.v1`. Mirando solo la clave, el banco daba «la cabina no dijo
     * nada» también con la avioneta, donde sí se oye.
     */
    if (bocas?.instructor) deLaCabina.add(bocas.instructor);
    /*
     * Las cuatro condiciones que encienden V1, medidas donde importan: en la
     * carrera de despegue. Sin mirar si está en el suelo, que la condición del
     * juego tampoco lo mira.
     */
    if (
      !subidaDesde &&
      /*
       * **Y la cuenta empieza volando de verdad, no en un bote.**
       *
       * `onGround` parpadea durante la carrera —el modelo da por volando al
       * avión en cuanto la sustentación lo levanta un palmo, ver
       * `PEGADO_AL_SUELO`—, así que con el primer fotograma sin ruedas en el
       * suelo el punto de partida podía quedar fijado trescientos metros antes
       * del despegue, y esos trescientos metros de rodadura entraban en el
       * denominador. De ahí salían los 2,8 % de una tirada frente a los 8,2 y
       * 12,6 de la siguiente con el mismo avión y el mismo campo.
       *
       * Cinco metros sobre el terreno es más alto que cualquier bote y más bajo
       * que cualquier subida.
       */
      s.heightAboveGround > 5
      /*
       * **Y sin mirar en qué fase dice el plan que va.**
       *
       * Aquí se exigía además que la fase fuera «despegando» o «comprometido»
       * *en el instante* en que el avión cruza los cinco metros, y eso es una
       * carrera entre dos relojes que no tienen por qué coincidir: si el plan
       * ya ha pasado a «en vuelo» cuando el avión llega a esa altura, la
       * medida no arranca nunca y el banco dice «no llegó a subir cien
       * metros» de un vuelo que subió, despegó y aterrizó sin un rasguño.
       * Pasó en Guaraní, que entra en pista por una intersección y cambia de
       * fase antes que los demás.
       *
       * Y la condición no hacía falta: este banco **siempre sale del puesto**
       * —`leccion=despegue`—, así que la primera vez en todo el vuelo que las
       * ruedas están a más de cinco metros del suelo es el despegue, y no
       * puede ser otra cosa. Lo de una sola vez lo garantiza `!subidaDesde`.
       */
    )
      subidaDesde = { x: s.position.x, z: s.position.z, y: s.position.y };
    if (subidaDesde && pendiente === null) {
      const gana = s.position.y - subidaDesde.y;
      const anda = Math.hypot(
        s.position.x - subidaDesde.x,
        s.position.z - subidaDesde.z,
      );
      if (gana > 100) pendiente = anda > 0 ? gana / anda : null;
    }
    if (["alineando", "despegando", "comprometido"].includes(fase)) {
      const ejes = o.ejesDePista?.();
      if (s.onRunway) {
        masRapidoEnPista = Math.max(masRapidoEnPista, s.airspeed);
        gasEnLaCarrera = Math.max(gasEnLaCarrera, o.controles().throttle);
        const v1 = o.v1?.();
        if (v1)
          verV1.add(
            `carrera:${v1.enLaCarrera} v1:${v1.dijoV1} vr:${v1.dijoVr}`,
          );
      }
      if (ejes)
        seSalioEnPista = Math.max(seSalioEnPista, Math.abs(ejes.across));
    }

    // ── Lo que se mide, pase lo que pase ─────────────────────────────────
    /*
     * **Y con un percance se deja de medir.**
     *
     * Un percance congela el avión en tierra y quita la tarjeta, que es lo que
     * tiene que pasar. Pero el contador de «pantalla muda en tierra» seguía
     * sumando hasta el tope del bucle: en La Palma daba **816 segundos sin
     * tarjeta**, que no es un fallo del juego sino el banco midiendo los trece
     * minutos que tardó en rendirse. Lo que hay que contar de un percance es
     * que pasó, no lo que dura la pantalla.
     */
    if (o.percance?.()) {
      /*
       * **Y dónde fue.**
       *
       * Un percance sin sitio no se investiga: el banco decía «percance:
       * edificio» y nada más, y con eso lo único que se puede hacer es mirar
       * el aeropuerto entero a ver. Se apunta el punto, la altura, la fase y
       * —si fue contra un edificio— **contra cuál y a qué distancia de su
       * borde**, que es lo que dice si el avión se metió dentro o si lo que
       * pasa es que el juego cuenta un roce como un choque.
       */
      if (!seRompio) {
        seRompio = t;
        donde = {
          que: o.percance(),
          t: +t.toFixed(0),
          fase,
          x: Math.round(s.position.x),
          z: Math.round(s.position.z),
          alto: +alto(s).toFixed(1),
          sobreElTerreno: +s.heightAboveGround.toFixed(1),
          velocidad: +s.airspeed.toFixed(0),
          edificio: cualEdificio(s.position.x, s.position.z),
          // Y el bulto de verdad del índice, que no tiene por qué ser un
          // edificio del aeródromo: ahí están también la ciudad y el coche.
          bulto: o.bultoCerca?.(s.position.x, s.position.z) ?? null,
        };
      }
      if (t - seRompio > 3) break;
      continue;
    }
    if (s.onGround) {
      /*
       * **La pantalla muda en tierra.** En el suelo el juego siempre tiene
       * algo que pedir —arrancá, seguí la raya, frená, salí de la pista,
       * apagá—, así que quedarse sin tarjeta es quedarse sin saber qué hacer.
       * Es literalmente lo que pasó: «la llave salió, se apagó a los seis
       * segundos, y ya no había forma de enterarse de qué hacía falta».
       */
      mudo = tarjeta.dibujo ? 0 : mudo + paso;
      if (mudo > mudoMaximo) {
        mudoMaximo = mudo;
        // Y **dónde**: un número sin sitio no se puede arreglar.
        mudoDonde = `a los ${t.toFixed(0)} s, en «${fase}» a ${s.airspeed.toFixed(0)} m/s`;
      }
      if (CON_RAYA.has(fase) && ruta.length < 2) {
        sinRaya += paso;
        // Y **dónde**: el primero y el último, que es lo que distingue un
        // hueco en mitad del rodaje de la cola natural del final del vuelo.
        const donde = `${t.toFixed(0)} s en «${fase}» a ${s.airspeed.toFixed(0)} m/s`;
        if (!sinRayaPrimero) sinRayaPrimero = donde;
        sinRayaDonde = donde;
      }
    } else {
      mudo = 0;
    }
    if (o.avisoDeTerreno() && s.onRunway) terrenoEnPista += paso;
    {
      const terreno = o.avisoDeTerreno();
      if (terreno && !terrenoAntes && enElDestino && fase === "final")
        terrenoEnFinalAlli++;
      terrenoAntes = terreno;
    }
    if (tarjeta.dibujo) vistas.add(tarjeta.dibujo);
    // Y **cuándo** lo decidió, que es lo que separa «se lo tapan» de «lo
    // decide en el despegue y no se rearma».
    if (queLaTapo === "pendiente") queLaTapo = tarjeta.dibujo || "nada";
    const dichas = o.vecesQueDijoToca?.() ?? 0;
    if (dichas > tocaDichas) {
      tocaDichas = dichas;
      cuandoDijoToca.push(
        `${t.toFixed(0)}s/${fase}/${alto(s).toFixed(0)}m, y en pantalla «${tarjeta.dibujo || "—"}»`,
      );
      // Y lo que hay en pantalla justo después, que es quien se la come.
      queLaTapo = "pendiente";
    }
    /*
     * **Las condiciones de «ya podés tocar», medidas una a una.**
     *
     * El banco decía «no lo dijo» y ahí se acababa, que sirve para saber que
     * algo falla y no para saber qué. Son cuatro —en el aire, sobre la pista,
     * por debajo de dieciocho metros **sobre la cota de la pista** y sin
     * subir— y para arreglarlo solo hace falta saber cuál no se cumple nunca.
     */
    if (!s.onGround) {
      const r = pistaAhora();
      const hp = (r.heading * Math.PI) / 180;
      const dx = s.position.x - r.x;
      const dz = s.position.z - r.z;
      const aLoLargo = dx * Math.sin(hp) + dz * -Math.cos(hp);
      const deLado = dx * Math.cos(hp) + dz * Math.sin(hp);
      const encima =
        Math.abs(deLado) < r.width / 2 + 40 &&
        Math.abs(aLoLargo) < r.length / 2 + 300;
      if (encima) {
        // `alto` ya es la altura sobre la cota del umbral, que es contra la
        // que mide el juego. Ver `ALTURA_DE_TOMA`.
        const sobre = alto(s);
        if (sobre < mejorAltura) {
          mejorAltura = sobre;
          mejorVertical = s.verticalSpeed;
          mejorFase = fase;
        }
      }
    }
    if (tarjeta.dibujo === "toma") dijoToca = true;
    if (tarjeta.dibujo === "freno" && toco) pidioFreno = true;

    /*
     * **El coche solo cuenta mientras se rueda.** Durante la carrera de
     * aterrizaje se adelanta a esperar en la boca de la salida, y ahí estar
     * lejos es lo correcto: no se le está siguiendo, se va a su encuentro.
     */
    const coche = globalThis.__raiz?.getObjectByName("sigueme");
    /*
     * **Y solo mientras el coche esté guiando.**
     *
     * Esto contaba la distancia al coche también cuando el coche ya se había
     * apartado, y un coche apartado es un coche aparcado al lado del puesto:
     * que esté lejos no significa nada. Daba 36 m en doce carreras de catorce
     * y setecientos y pico en dos, sin nada en medio — un número bimodal que
     * no medía lo que decía.
     *
     * El parte lo delató en cuanto dijo **dónde** pasaba: «729 m en «» a los
     * 507 s», con la fase en blanco. La fase en blanco es que el vuelo ya
     * terminó, y ahí el coche lleva un rato quieto en su sitio.
     *
     * La otra mitad de esta misma comprobación —que no se le atropelle— ya
     * miraba `cocheApartado`. Faltaba aquí.
     */
    const guiandoAhora = coche?.visible && !o.cocheApartado?.();
    /*
     * **Y en la pista, la lejanía cuenta si el avión se aleja del coche.**
     *
     * El juego tiene al coche esperando en la boca de la salida **mientras el
     * avión pise pista** —ver `enLaPistaAun` en `Game`—, así que rodar por el
     * asfalto hacia él con el coche lejos es lo correcto: se va a su
     * encuentro. Aquí ponía que en pista no contaba nunca, y eso tapaba justo
     * lo contrario: aterrizando por la 12 de Los Rodeos la raya salía por la
     * E2, que da media vuelta, y el avión rodaba pista adelante **alejándose**
     * del coche, que lo esperaba detrás, hasta doscientos doce metros. Lo que
     * se mide en pista es eso: si se va hacia el coche o se le deja atrás.
     * Lo cerca cuenta en todas partes: que no se le lleve por delante.
     */
    const haciaElCoche =
      coche &&
      Math.sin(s.heading) * (coche.position.x - s.position.x) -
        Math.cos(s.heading) * (coche.position.z - s.position.z) >
        0;
    const cuentaLejos = !s.onRunway || !haciaElCoche;
    if (
      guiandoAhora &&
      s.onGround &&
      s.airspeed < 16 &&
      fase !== "aterrizado"
    ) {
      const alCoche = Math.hypot(
        coche.position.x - s.position.x,
        coche.position.z - s.position.z,
      );
      if (cuentaLejos && alCoche > lejosDelCoche) {
        lejosDelCoche = alCoche;
        lejosDondeCoche = `en «${fase}» a los ${Math.round(t)} s, a ${Math.round(s.airspeed)} m/s`;
      }
      /*
       * **Y lo cerca que se le llega a poner**, que es la otra mitad.
       *
       * Se medía solo lo lejos —«se le puede seguir»— y faltaba lo contrario:
       * que no se le lleve por delante. Atropellarlo es un percance, o sea el
       * final del vuelo, y en Mariscal Estigarribia y Pedro Juan Caballero
       * pasa **en todos**. Ver #154.
       */
      alCocheAhora = alCoche;
      if (s.onRunway) cocheEnPista = Math.min(cocheEnPista, alCoche);
      // Y apartado ya no cuenta: ahí es un coche aparcado al lado del puesto,
      // no alguien a quien se adelanta. Ver `yaSeAparto`.
      const guiando = !o.cocheApartado?.();
      /*
       * Y a qué lado de la raya se ha puesto el coche, que es lo que dice si
       * se está apartando o no. Ver `A_UN_LADO` en `world/sigueme.ts`.
       */
      if (ruta.length > 1) {
        let mejor = Infinity;
        for (let k = 1; k < ruta.length; k++) {
          const a = ruta[k - 1];
          const b = ruta[k];
          const dx = b[0] - a[0];
          const dz = b[1] - a[1];
          const l2 = dx * dx + dz * dz || 1;
          const u = Math.max(
            0,
            Math.min(
              1,
              ((coche.position.x - a[0]) * dx +
                (coche.position.z - a[1]) * dz) /
                l2,
            ),
          );
          mejor = Math.min(
            mejor,
            Math.hypot(
              coche.position.x - (a[0] + dx * u),
              coche.position.z - (a[1] + dz * u),
            ),
          );
        }
        ladoDelCoche = mejor;
      }
      if (guiando && alCoche < cercaDelCoche) {
        cercaDelCoche = alCoche;
        cercaCuando = `a los ${t.toFixed(0)} s, en «${fase}» a ${s.airspeed.toFixed(0)} m/s`;
        // Y a qué lado de la raya estaba en ese momento, que es lo que dice
        // si se apartó o si se quedó en medio.
        ladoAlEstarCerca = ladoDelCoche;
      }
    }
    /*
     * **Y una línea en cada cambio de fase, pase lo que pase.**
     *
     * El muestreo de uno de cada veinte guarda las últimas cuarenta y cinco,
     * o sea el final del vuelo. Cuando lo que hay que mirar es **por dónde se
     * torció** —un despegue que no despega, un rodaje que se va al campo— el
     * final no dice nada: para entonces ya lleva un cuarto de hora dando
     * vueltas. Los cambios de fase son pocos y son justo los momentos en los
     * que algo pasó.
     */
    /*
     * **Y la carrera de despegue con el mando delante.**
     *
     * «No llegó a subir cien metros» dice que no subió y no dice si es que no
     * se tiró de la palanca, si se tiró y el avión no respondió, o si respondió
     * y se volvió a posar. Son tres averías distintas y desde fuera se ven
     * igual. Con el elevador, la velocidad y lo que sube al lado, se ven
     * distintas de un vistazo.
     */
    if ((etapa === "despegar" || fase === "comprometido") && i % 40 === 0)
      carrera.push(
        `${t.toFixed(0)}s ${s.airspeed.toFixed(0)}m/s elev ${c.elevator.toFixed(2)} sube ${s.verticalSpeed.toFixed(1)}m/s suelo ${s.heightAboveGround.toFixed(1)}m ${s.onGround ? "ruedas" : "aire"} ${s.onRunway ? "enPista" : "FUERA"} eje ${desvio(s).toFixed(0)}m`,
      );
    if (fase !== faseAnterior) {
      faseAnterior = fase;
      hitos.push(
        `${t.toFixed(0)}s → ${fase} · ${s.airspeed.toFixed(0)}m/s · ${s.heightAboveGround.toFixed(0)}m del suelo · cabeceo ${((s._cabeceo ?? 0) * 57.3).toFixed(0)}° · gas ${c.throttle.toFixed(1)} · ${s.onRunway ? "en pista" : "fuera"} · umbral ${alUmbral(s).toFixed(0)}m · quiere ${ultimoAltoQueToca === null ? "—" : ultimoAltoQueToca.toFixed(0) + "m"}`,
      );
    }
    if (i % 20 === 0) {
      linea.push(
        `${t.toFixed(0)}s ${etapa}/${fase} ${s.airspeed.toFixed(0)}m/s gas ${c.throttle.toFixed(1)} ${alto(s).toFixed(0)}m ${s.onGround ? "tierra" : "aire"} ${s.onRunway ? "enPista" : "fuera"} ${desvio(s).toFixed(0)}m umbral ${alUmbral(s).toFixed(0)}m coche ${alCocheAhora < 0 ? "—" : `${alCocheAhora.toFixed(0)}/${ladoDelCoche.toFixed(0)}`} v${aDonde} suelo ${s.heightAboveGround.toFixed(0)}m en ${s.position.x.toFixed(0)},${s.position.z.toFixed(0)} ${tarjeta.dibujo || "—"}`,
      );
    }

    // ── El piloto ────────────────────────────────────────────────────────
    if (etapa === "arrancar") {
      c.engineOn = true;
      c.brakes = 0;
      if (fase === "rodando" || fase === "arrancando") etapa = "rodar";
    } else if (etapa === "rodar") {
      tiempoDeRodajeIda += paso;
      // La velocidad la pide el juego, y al final de la ruta pide cero: el
      // avión se para solo encima de la raya. Ver `calcularVelocidades`.
      const quiere = o.rodaje() ?? 9;
      c.throttle = porElSuelo(s) < quiere ? 0.6 : 0;
      c.brakes = porElSuelo(s) > quiere + 2 ? 1 : 0;
      c.aileron = timon(s, ruta);
      if (fase === "esperando" || fase === "autorizado") etapa = "esperar";
    } else if (etapa === "esperar") {
      c.throttle = 0;
      c.brakes = 1;
      if (fase === "autorizado" || fase === "alineando") etapa = "entrar";
    } else if (etapa === "entrar") {
      c.brakes = 0;
      /*
       * **Y si toca back-taxi, se hace.**
       *
       * Esto pasaba a despegar en cuanto el avión estaba en pista y apuntando
       * al rumbo de salida, sin mirar si el plan le mandaba rodar hasta el otro
       * extremo primero. Donde la plataforma cae junto a la cabecera contraria
       * —Pettirossi— el avión entra ya apuntando bien y **con ocho metros de
       * pista por delante**: el banco aceleraba ahí mismo, se iba al campo y
       * despegaba pasado el final, y el vuelo se daba por bueno.
       *
       * O sea que el banco no había volado un back-taxi **nunca**, y por eso
       * nadie vio que en esos campos no salían ni V1 ni Vr: la fase no llegaba
       * a cambiar porque el avión nunca llegaba al punto de girar.
       *
       * Mientras el plan diga back-taxi se rueda por la raya, como haría
       * cualquiera siguiendo la línea verde.
       */
      if (fase === "back-taxi") {
        const quiere = o.rodaje() ?? 9;
        c.throttle = porElSuelo(s) < quiere ? 0.6 : 0;
        c.brakes = porElSuelo(s) > quiere + 2 ? 1 : 0;
        c.aileron = timon(s, ruta);
      } else {
        c.throttle = porElSuelo(s) < 8 ? 0.5 : 0;
        c.aileron = s.onRunway ? alRumbo(s, rumboPista) : timon(s, ruta);
        if (s.onRunway && Math.abs(error(rumboPista, s.heading)) < 0.15) {
          etapa = "despegar";
        }
      }
    } else if (etapa === "despegar") {
      c.throttle = 1;
      /*
       * **En el eje, apuntando por delante del avión y no del umbral.**
       *
       * Esto apuntaba a un punto fijo a dos mil metros del umbral, y en un
       * aeropuerto donde se entra por una intersección eso puede quedar
       * **detrás**: en Guaraní se entra a 1.522 m del umbral, así que el punto
       * caía a 478 m por delante, el avión lo rebasaba todavía en el suelo a
       * 39 m/s, y el piloto daba media vuelta con alerón a fondo — hacia la
       * fila de hangares. El percance «edificio» que salía en el barrido era
       * eso, y el juego hacía bien en darlo.
       *
       * Apuntar mil metros por delante de donde está el avión no puede quedar
       * detrás de él nunca.
       */
      const p = porDelante();
      c.aileron = p ? alPunto(s, p.x, p.z) : alRumbo(s, rumboPista);
      /*
       * **Y el timón, que es lo único que dirige a partir de los veintiocho.**
       *
       * La rueda de morro va con el mando de alabeo y **se apaga con la
       * carrerilla**: entera hasta ocho metros por segundo y sin autoridad
       * ninguna a los veintiocho. A partir de ahí lo que dirige es el timón, y
       * este piloto no lo tocaba nunca — ni rodando ni despegando.
       *
       * En Guyrami no se notaba porque la asistencia de rodaje empuja hacia la
       * raya y tapaba el agujero. En Tukã esa asistencia es un tercio, así que
       * el avión entraba en pista descolocado del eje, aceleraba, y a partir
       * de los veintiocho ya no había nada que lo enderezara.
       *
       * Dos términos, que es como se lleva un avión por el eje: adónde apunta
       * el morro y a qué lado del eje se está. El segundo es pequeño a
       * propósito —dos centésimas por metro— porque corregir el desvío con
       * prisa es hacer eses.
       */
      c.rudder = s.onGround
        ? Math.max(
            -1,
            Math.min(1, error(rumboPista, s.heading) * 1.5 - desvio(s) * 0.02),
          )
        : 0;
      /*
       * **Se tira para rotar, y en cuanto se vuela se suelta.**
       *
       * Aquí se sostenía media palanca desde los 27 m/s **y también en el
       * aire**, hasta pasar los sesenta metros. Con el mando llegando entero
       * al avión eso es volar medio minuto al borde de la pérdida: en la traza
       * de Guaraní se veía subir a 24 m, caer a 22, subir a 47, caer a 50, con
       * la velocidad bajando de 30 a 22 m/s — un delfín. Y en cuanto la etapa
       * siguiente pedía algo más, se caía.
       *
       * Rotar es un tirón; volar es mantener una velocidad. Son dos cosas
       * distintas y ahora se hacen distinto.
       */
      /*
       * **Y en el aire se pide subir, no se pide una velocidad.**
       *
       * Aquí se sostenía la velocidad de subida y ya está, y eso no sube: un
       * lazo que solo mira la velocidad se conforma con **cualquier** actitud
       * en la que la velocidad cuadre, y la más fácil de todas es el vuelo
       * nivelado. Medido en Tukã, recién despegado: velocidad clavada en 35
       * m/s, palanca en 0,06, y el avión ganando cuarenta centímetros por
       * segundo. Se iba del extremo de la pista a tres metros del suelo y se
       * posaba en el terreno de más allá — con el percance correspondiente.
       *
       * En Guyrami no se veía porque el modelo sencillo sube solo con el gas a
       * fondo: el avión va donde apunta el morro y el morro estaba arriba.
       *
       * `aLaAltura` pide **metros por segundo**, que es lo que se quiere, y ya
       * lleva dentro la única regla que no admite excepción: por debajo de la
       * velocidad de subida no se tira, pase lo que pase.
       */
      /*
       * Y se tira al llegar a **su** velocidad de rotación, con mando de
       * sobra: medio elevador no levanta cinco toneladas y media, y lo que
       * limita el morro en tierra es la geometría del tren y no la palanca.
       */
      c.elevator = s.onGround
        ? s.airspeed > (suyas.rotacion ?? 28) * 0.96
          ? 0.8
          : 0
        : subirDeVerdad(s);
      if (!s.onGround && alto(s) > 30) {
        despego = t;
        etapa = "subir";
      }
    } else if (
      etapa === "subir" &&
      destino &&
      !enElDestino &&
      alto(s) > 150 &&
      t - despego > 25
    ) {
      /*
       * **Y aquí se cruza el canal.** El vuelo ya cuenta como vuelo —subió
       * más de ciento veinte metros y lleva en el aire más de quince
       * segundos, ver `haVolado`— y el avión se pone a cuatro kilómetros del
       * umbral del otro campo, en su eje y en su senda de tres grados. A
       * partir de aquí la pista, el umbral y la cota son los de allí.
       */
      const f = o.puntoDeFinalDe(4000, destino);
      const u = o.puntoDeFinalDe(0, destino);
      if (!f || !u) return { etapa: "sin destino", destino };
      const alli = u.suelo;
      const aproximacion = o.avion().aproximacion;
      o.colocar(f.x, alli + (4000 + 250) * SENDA, f.z, aproximacion + 3, f.h);
      await new Promise((r) => setTimeout(r, 500));
      enElDestino = o.campoDeAhora();
      habladasAlCruzar = (o.habladas?.() ?? []).length;
      pista = pistaAhora();
      rumboPista = (pista.heading * Math.PI) / 180;
      umbral = finalAhora(0);
      cotaDePista = umbral ? o.suelo(umbral.x, umbral.z) : 0;
      etapa = "final";
    } else if (etapa === "subir") {
      /*
       * **El circuito, tramo a tramo, que es como se vuela una vuelta.**
       *
       * Esto subía y se iba derecho a buscar la entrada en final desde donde
       * estuviera, y funcionaba en el sentido de que llegaba. Lo que no hacía
       * era **llegar alineado**: medido en los nueve aeropuertos, el avión se
       * plantaba en la altura de decisión entre 63 y 95 metros fuera del eje y
       * hasta 25 grados torcido, y el juego le mandaba irse al aire con toda
       * la razón — eso es una aproximación no estabilizada de manual, y
       * mandar al aire es lo que hace un instructor. Consecuencia: la tarjeta
       * de «ya podés tocar» no salía **nunca**, en ninguno de los nueve.
       *
       * Se intentó dos veces arreglarlo afinando la captura del eje y las dos
       * salió peor. El problema no era la ganancia: era que no había circuito.
       * Un piloto no va derecho al umbral desde donde esté — sube por el eje,
       * gira a la izquierda, vuela paralelo a la pista al revés y gira otra
       * vez ya bajando. Cuando llega a final **ya viene alineado**, y por eso
       * la aproximación está estabilizada antes de empezar a bajar.
       *
       * Y el circuito no se calcula aquí: se lee del juego, que es quien lo
       * dibuja. Volarlo por una geometría propia sería medir un circuito que
       * no es el que se enseña. Ver `world/circuito.ts` y `__oga.circuito`.
       */
      const v = circuito();
      // El vértice al que se va ahora. 1 es el final de la subida, 2 la
      // esquina de allá, 3 la esquina de acá y 4 la entrada en final.
      const meta = v?.[aDonde] ?? null;

      /*
       * El gas y la palanca: subiendo se manda la velocidad con la palanca y
       * el gas va a tope; a la altura del circuito se cambia el reparto —el
       * gas lleva la velocidad y la palanca la altura, amortiguada—. Seguir
       * con el primero arriba daba un fugoide que crecía hasta el suelo:
       * medido en Guaraní, 185 → 219 → 147 → 236 → 99 → 34 metros.
       */
      const altoQueToca = meta ? meta.y - cotaDePista : CRUCERO;
      ultimoAltoQueToca = altoQueToca;
      const subiendo = alto(s) < altoQueToca - 15;
      const quiereIr = velocidadDelTramo(aDonde);
      c.throttle = subiendo
        ? 1
        : Math.max(
            // Frenando, el gas puede ir al ralentí: un reactor con un tercio
            // de gas a nivel no frena nunca.
            quiereIr < VELOCIDAD_DE_CRUCERO ? 0 : 0.3,
            Math.min(1, 0.55 + (quiereIr - s.airspeed) * 0.04),
          );
      configurar(s, c, aDonde);
      /*
       * Y aquí igual: subiendo se pide subir. Sostener la velocidad de subida
       * no es subir — es quedarse a esa velocidad, y nivelado también se está
       * a esa velocidad. Ver el mismo comentario en la etapa de despegar.
       */
      c.elevator = subiendo ? subirDeVerdad(s) : aLaAltura(s, altoQueToca);

      /*
       * **Y no se gira hasta estar alto.** El primer tramo es recto por el eje
       * de la pista, y eso no es una preferencia: girar a sesenta metros con
       * el alerón a fondo es lo que estrelló a este piloto en La Palma, donde
       * el suelo al oeste está a la cota de la pista. Se baja de 62 a 14
       * metros en cuatro segundos.
       */
      if (!meta || alto(s) < SEGURO_PARA_GIRAR) {
        c.aileron = alRumbo(s, rumboDeSalida);
      } else {
        c.aileron = alPunto(s, meta.x, meta.z);
      }

      /*
       * Se pasa al vértice siguiente al **rebasarlo**, no al acercarse.
       *
       * Esperar a estar a tantos metros de un punto deja al avión
       * orbitándolo: con el giro acotado a veinticinco grados, un punto se
       * puede rodear eternamente sin llegar nunca. Lo que dice que un tramo se
       * ha terminado es haber pasado de largo, y eso se mide proyectando sobre
       * la dirección del tramo.
       */
      if (meta && v) {
        const desde = v[aDonde - 1] ?? v[0];
        const dx = meta.x - desde.x;
        const dz = meta.z - desde.z;
        const largo = Math.hypot(dx, dz) || 1;
        const cuanto =
          ((s.position.x - desde.x) * dx + (s.position.z - desde.z) * dz) /
          largo;
        if (cuanto > largo - MARGEN_DE_VIRAJE) {
          if (aDonde >= 4) etapa = "final";
          else aDonde++;
        }
      }

      /*
       * Y una salida de socorro: si el circuito no se puede leer —un escenario
       * sin aeródromo, un peldaño sin circuito— se hace lo de antes, que es ir
       * a la entrada en final por coordenadas de pista. Peor, pero llega.
       */
      if (!v) {
        const falta = alUmbral(s);
        const p = alto(s) > SEGURO_PARA_GIRAR ? finalAhora(3000) : null;
        if (p) c.aileron = alPunto(s, p.x, p.z);
        if (falta > 800 && falta < 4000) etapa = "final";
      }
    } else if (etapa === "final") {
      /*
       * **En final se vuela con coordenadas de pista, no con distancias.**
       *
       * La primera versión apuntaba al umbral y sacaba la altura de la
       * distancia a él. Y una distancia no tiene signo: en cuanto se cruza la
       * cabecera vuelve a crecer, así que la senda subía y el avión se quedaba
       * **volando a un metro del asfalto para siempre** —treinta metros por
       * segundo, gas a fondo, once minutos— sin tocar tierra. Y como el rumbo
       * de respaldo solo mantiene el rumbo y no el eje, volaba paralelo a la
       * pista y por fuera, así que ni siquiera contaba como estar en ella.
       *
       * Con las coordenadas de la pista —cuánto llevas recorrido a lo largo y
       * cuánto te has ido de lado— las dos cosas salen solas: la altura es lo
       * que queda hasta el umbral, y el punto al que apuntar está en el eje,
       * trescientos metros por delante.
       */
      const r = pistaAhora();
      const hp = (r.heading * Math.PI) / 180;
      const fx = Math.sin(hp);
      const fz = -Math.cos(hp);
      const along = (s.position.x - r.x) * fx + (s.position.z - r.z) * fz;
      // Cuánto falta para la cabecera por la que se entra. Ver `alUmbral`.
      const falta = alUmbral(s);
      /*
       * **Y la senda no apunta al umbral: apunta a un poco más adentro.**
       *
       * Apuntando al umbral, la altura que se pide es cero justo en el filo
       * del asfalto — o sea que el vuelo perfecto toca en el borde y
       * **cualquier cosa que se quede corta toca fuera**. No hay margen por
       * construcción. Medido en Tukã, que es donde se notó: de nueve carreras,
       * cuatro acababan con el avión posándose en la hierba de delante, en el
       * eje y a tres metros de altura sobre el umbral; y la que salía bien
       * decía «0 m pasado el umbral», que es el mismo filo por el otro lado.
       *
       * Un avión de verdad apunta a las marcas de toma, que están metidas en
       * la pista. Doscientos cincuenta metros, o la quinta parte de la pista
       * si es corta: en Yvytu Rape, con novecientos metros, son ciento
       * ochenta.
       */
      const puntoDeToma = Math.min(250, r.length * 0.2);
      const objetivo = Math.max(0, (falta + puntoDeToma) * SENDA);
      // Sobre la pista se corta el gas: eso es aterrizar. Y antes, la
      // velocidad de aproximación a mano, que el gas no significa lo mismo en
      // los dos modelos de vuelo.
      /*
       * **La velocidad de aproximación es la de este avión, no la de treinta.**
       *
       * Estaba clavada en treinta metros por segundo, y treinta es la
       * aproximación de la avioneta —ni siquiera: la suya son treinta y tres—.
       * El de fuselaje ancho entra a setenta y cinco. Un piloto de banco que
       * le pide treinta a un avión que vuela a setenta y cinco no está
       * aterrizando: está cayéndose despacio. Es la misma constante parroquial
       * de siempre, ahora en el banco.
       */
      /*
       * **Y en proporción a la suya, no la suya a secas.** Se probó a volar el
       * final justo a la velocidad de aproximación de la tarjeta —treinta y
       * tres en la avioneta— y el barrido se cayó por el otro lado: Yvytu
       * Rape, Encarnación y Cuatro Vientos pasaron a «pasada», con el avión
       * flotando a un metro del asfalto sin llegar a tocar, y el rodaje de
       * vuelta de Silvio Pettirossi se fue a 318 segundos porque se tocaba
       * mucho más allá. Tres metros por segundo de más al cruzar el umbral son
       * un avión que no se posa.
       *
       * Las dos cifras que había —treinta al final y veinticuatro en la
       * recogida— son 0,91 y 0,73 de la aproximación de la avioneta. Puestas
       * como proporción, la avioneta vuela exactamente como volaba y el de
       * fuselaje ancho cruza a sesenta y ocho en vez de a treinta.
       */
      const deAproximacion = suyas.aproximacion ?? 33;
      const quiere = falta < 60 ? deAproximacion * 0.73 : deAproximacion * 0.91;
      /*
       * **Y el gas también vuela la senda, no solo la velocidad.**
       *
       * Con el gas atado únicamente a la velocidad, el final entero se volaba
       * al ralentí: el avión iba justo a la velocidad pedida, así que el gas
       * bajaba a cero, y al ralentí ningún avión baja tres grados — baja
       * cuatro y pico. Como además el mando de altura tiene prohibido tirar
       * por debajo de la velocidad pedida, el piloto no tenía con qué
       * sostenerse y llegaba siempre por debajo de la senda. Medido en La
       * Palma con el Tukã: en los últimos diez segundos pasó de tres metros
       * por debajo a tocar **ciento cincuenta y tres metros antes del
       * umbral**, en el mar.
       *
       * Lo que se hace de verdad es lo de siempre: **la velocidad con la
       * palanca y la senda con el gas**. Aquí se deja la palanca como estaba
       * —que mueve todos los escenarios— y se le suma al gas lo que pide la
       * senda cuando se va por debajo. Manda el que más pide, así que por
       * encima de la senda no cambia nada, y pasado el umbral se apaga: sobre
       * el asfalto el gas se corta, que es lo que es aterrizar.
       */
      /*
       * **Con banda muerta, y no es adorno.** Este lazo era de dos estados
       * —o sube o baja—, así que en final el gas oscilaba entre cero y medio
       * a cada fotograma, y esa oscilación se le nota al avión: medido en La
       * Palma, con el gas de dos estados se tocaba a **22,6 m del eje** y con
       * tres metros por segundo de banda muerta, a 0,3. Un avión al que le
       * mueven el gas veinte veces por minuto no va recto.
       */
      const porVelocidad =
        s.airspeed < quiere ? 0.05 : s.airspeed > quiere + 3 ? -0.05 : 0;
      /*
       * Y la senda pide lo suyo: **por debajo, gas, aunque sobre velocidad**,
       * que es lo único que sostiene a un avión en el aire. Manda el que más
       * pide, así que por encima de la senda no cambia nada. Pasado el umbral
       * el término se apaga: sobre el asfalto el gas se corta, que es lo que
       * es aterrizar.
       */
      const bajoLaSenda = objetivo - alto(s);
      const porSenda =
        falta <= 0
          ? -0.05
          : bajoLaSenda > 2
            ? 0.06
            : bajoLaSenda < -2
              ? -0.04
              : -0.05;
      /*
       * **Con velocidad de sobra no se mete gas, vaya donde vaya la senda.**
       *
       * Esto sumaba `Math.max(porVelocidad, porSenda)`: cuando el avión iba
       * rápido pero un poco bajo, ganaba el de la senda y **se le metía gas**
       * — cada fotograma, a un avión que ya iba sobrado. A la avioneta no le
       * pasaba nada, porque tiene poco empuje y mucha resistencia. Al reactor
       * lo disparaba: medido en Asunción, entraba en final a 116 m/s y subía a
       * **160**, y a noventa metros del suelo aún iba a 138 — el doble de su
       * velocidad de aproximación, y por encima de la de sacar tren y flaps.
       *
       * Es la regla que no se rompe en ningún avión: el gas lleva la
       * velocidad y la palanca la senda. Si se va rápido y bajo, se levanta el
       * morro y el gas se queda quieto; si se va rápido y alto, se reduce. Lo
       * que no se hace nunca es arreglar una senda baja con gas cuando sobra
       * velocidad.
       */
      const cambio =
        NECESITA_TECNICA && porVelocidad < 0
          ? porVelocidad
          : Math.max(porVelocidad, porSenda);
      c.throttle = Math.max(0, Math.min(1, c.throttle + cambio));
      /*
       * Con la misma ley de altura que arriba: bajada limitada y amortiguada.
       * Ver `aLaAltura`, que cuenta el porqué con lo medido.
       *
       * **Y el suelo para tirar es la velocidad de aproximación, no la de
       * subida.** Con la de subida —treinta y cuatro— el piloto no podía tirar
       * en ningún momento del final, porque en final se vuela a treinta a
       * propósito: la senda solo sabía bajar. Medido en Yvytu Rape con Tukã,
       * los últimos veinte segundos del vuelo, la senda pedía veintiuno y el
       * avión iba por catorce y bajando a casi tres metros por segundo, o sea
       * cinco grados donde tocaban tres. Se posaba en la hierba **ochenta y
       * siete metros antes del umbral**, en el eje y con el juez cantando
       * «fuera».
       *
       * En Tenerife Norte no se veía: tres mil cuatrocientos metros de pista
       * perdonan llegar bajo, y el avión acababa dentro igual.
       */
      c.elevator = aLaAltura(s, objetivo, quiere);
      // Y en final, ya configurado del todo: tren fuera y flaps. Ver
      // `configurar`, que en el tramo 4 pide las dos cosas.
      configurar(s, c, 4);
      /*
       * Y el eje, apuntando a un punto trescientos metros por delante de donde
       * se está: eso corrige el desvío en vez de solo mantener el rumbo.
       *
       * **Y aquí se probó a afinarlo y salió peor.** Se intentó mirar más
       * corto según se acerca el umbral, añadir un término con el desvío
       * medido en anchos de pista y meter timón, buscando que el piloto
       * pudiera posarse en los dieciocho metros de Yvytu Rape. Resultado: en
       * Tenerife Norte, donde antes hacía el vuelo entero, pasó de diez
       * comprobaciones a seis. Lo medido y lo aprendido están en #147; el
       * piloto se queda como estaba hasta que haya una captura de eje de
       * verdad.
       */
      /*
       * **El eje se captura con rumbo, no persiguiendo un punto.**
       *
       * Esto apuntaba a un punto del eje trescientos metros por delante, y eso
       * es una persecución: el avión va siempre detrás del error en vez de
       * anticiparlo. Medido en Tenerife Norte, con el mando llegando entero al
       * avión: a la altura de decisión —cincuenta y tres metros— el piloto
       * llegaba **83 metros fuera del eje y 24 grados torcido**, y el juego le
       * mandaba al aire con toda la razón. Después se enderezaba y tocaba a
       * 0,7 m del eje, o sea que el avión podía: lo que llegaba tarde era la
       * corrección.
       *
       * Un piloto de verdad captura un eje apuntando **un ángulo** contra él y
       * lo va soltando según se acerca: es lo que hace cualquiera aparcando en
       * línea. El ángulo se limita a treinta grados, que es lo que cabe dentro
       * del margen de «torcido» del juego, que son veinte.
       */
      /*
       * **Y se mira más cerca cuanto más fuera se está.**
       *
       * Perseguir un punto del eje trescientos metros por delante converge,
       * pero tarde: medido en Tenerife Norte, a la altura de decisión el
       * piloto llegaba **83 metros fuera del eje y 24 grados torcido** y el
       * juego le mandaba al aire con toda la razón. Después se enderezaba y
       * tocaba a 0,7 m del eje, o sea que el avión podía; lo que llegaba tarde
       * era la corrección.
       *
       * Mirar más cerca es apuntar más contra el eje, que es lo que hace
       * cualquiera aparcando en línea: ángulo grande al principio y se va
       * soltando al llegar. Se probó también a mandar un rumbo de
       * interceptación calculado y salió peor —el avión se iba del otro lado—,
       * así que se queda lo que ya funcionaba, con la mirada variable.
       */
      /*
       * **Y la mirada se acorta al acercarse.**
       *
       * Trescientos metros fijos convergen despacio: saliendo de la base con
       * el eje a cincuenta metros, el avión llegaba al umbral todavía a
       * veinticinco —o sea, en el borde de una pista de cuarenta y cinco— y en
       * La Palma eso es tocar fuera. Medido allí: 25 m a mil metros del umbral
       * y 22 al tocar, convergiendo tres metros por kilómetro.
       *
       * Mirando más cerca cuando queda menos, el mismo lazo aprieta al final
       * sin ponerse nervioso lejos, que es lo que hace cualquiera aparcando en
       * línea. El suelo son ciento veinte metros: por debajo, el punto de mira
       * se mete dentro de la pista y el avión empieza a serpentear.
       */
      /*
       * Y un avión rápido mira más lejos: la mirada está pensada para los 33
       * m/s de la avioneta, y a 65 son la mitad de segundos para corregir.
       */
      const mirada =
        Math.max(120, Math.min(300, falta * 0.4)) *
        (NECESITA_TECNICA ? Math.max(1, s.airspeed / 33) : 1);
      const tx = r.x + fx * (along + mirada);
      const tz = r.z + fz * (along + mirada);
      c.aileron = alPuntoPorElSuelo(s, tx, tz);
      if (s.onGround && s.onRunway) {
        toco = t;
        /*
         * **Dónde se tocó.** Es el número que da nombre a #147 y el banco no
         * lo decía: en una pista de dieciocho metros de ancho, «aterrizó» sin
         * decir a cuántos metros del eje no significa nada. Se apunta también
         * cuánta pista se dejó atrás, que es lo que separa posarse en el
         * umbral de posarse a mitad de pista.
         */
        tocoDesviado = desvio(s);
        tocoPasadoElUmbral = falta < 0 ? -falta : 0;
        tocoA = s.airspeed;
        tocoSuelo = porElSuelo(s);
        etapa = "frenar";
      }
    } else if (etapa === "frenar") {
      frenadaFotogramas++;
    if (fase === "en-puesto" || fase === "apagado") acaboEnLaPista = true;
      if (!s.onGround) frenadaEnElAire++;
      if (antesDeFrenar) {
        rodaduraMedida += Math.hypot(
          s.position.x - antesDeFrenar.x,
          s.position.z - antesDeFrenar.z,
        );
      }
      antesDeFrenar = { x: s.position.x, z: s.position.z };
      c.throttle = 0;
      c.elevator = 0;
      c.brakes = 1;
      c.aileron = alRumbo(s, rumboPista);
      /*
       * **Y el timón, que es lo único que dirige recién tomado.**
       *
       * La carrera de frenada empieza a más de treinta metros por segundo, y a
       * esa velocidad la rueda de morro ya no tiene autoridad: se apaga entre
       * los ocho y los veintiocho. Es el mismo agujero que había en la carrera
       * de despegue, en el otro extremo del vuelo.
       *
       * Se vio en Yvytu Rape, que es una pista de hierba de dieciocho metros:
       * el avión tomaba en el eje, frenaba, se iba de lado y el vuelo acababa
       * con percance «fuera» a los trescientos sesenta y seis segundos —con el
       * aterrizaje ya hecho—.
       */
      c.rudder = Math.max(
        -1,
        Math.min(1, error(rumboPista, s.heading) * 1.5 - desvio(s) * 0.02),
      );
      if (porElSuelo(s) < 8) {
        dejoDeFrenarA = porElSuelo(s);
        etapa = "volver";
      }
    } else if (etapa === "volver") {
      tiempoDeRodajeVuelta += paso;
      if (antes) {
        vueltaMetros += Math.hypot(
          s.position.x - antes.x,
          s.position.z - antes.z,
        );
      }
      antes = { x: s.position.x, z: s.position.z };
      const quiere = o.rodaje() ?? 9;
      c.throttle = porElSuelo(s) < quiere ? 0.6 : 0;
      c.brakes = porElSuelo(s) > quiere + 2 ? 1 : 0;
      c.aileron = timon(s, ruta);
      /*
       * Y el largo de **la ruta que el juego trazó** para volver, que es el
       * denominador bueno: dice si el avión siguió su camino o se fue por ahí,
       * y a diferencia del reloj no hereda dónde cayó el avión al frenar.
       *
       * Se queda con **la más larga que se llegó a ver** durante la vuelta, y
       * no con la del primer fotograma: la ruta de vuelta se traza un momento
       * después de tocar, así que mirándola una sola vez salía a medias —o
       * vacía, que es lo que daba La Gomera: «270 m rodados sobre 0 trazados»—.
       */
      {
        const r = o.ruta();
        let suma = 0;
        for (let i = 0; i < r.length - 1; i++) {
          suma += Math.hypot(r[i + 1][0] - r[i][0], r[i + 1][1] - r[i][1]);
        }
        largoDeLaRuta = Math.max(largoDeLaRuta, suma);
      }
      if (fase === "en-puesto" || fase === "apagado") etapa = "apagar";
    } else if (etapa === "apagar") {
      c.throttle = 0;
      c.brakes = 1;
      c.engineOn = false;
      /*
       * Y se le dan tres segundos al juego para contar el vuelo. La pantalla
       * de fin no sale en el mismo fotograma en que se para la hélice —tiene
       * su pausa, a propósito— y el banco salía corriendo antes de verla.
       */
      if (fase === "apagado") {
        await new Promise((r) => setTimeout(r, 3000));
        break;
      }
    }
  }

  /*
   * **Y lo que el juego enseña en el campo de llegada, que es de allí.** La
   * torre, la aguja, el cuaderno y el tráfico miraban el campo de casa, así
   * que se toma aquí, con el avión ya apagado en su puesto de allí.
   */
  const alli = (() => {
    if (!destino) return null;
    const cabecera = o.puntoDeFinalDe?.(0, destino)?.cabecera ?? null;
    const dicho = (o.habladas?.() ?? [])
      .slice(Math.max(0, habladasAlCruzar))
      .filter((h) => /torre\..*clearedLand/.test(h))
      .map((h) => h.replace(/^[\d.]+s /, ""));
    const aerodromos = [...(o.aerodromosVisitados?.() ?? [])];
    const pista = o.pistaDeAhora?.();
    const lejosDeAlli = (o.trafico?.() ?? []).map((a) =>
      pista ? Math.round(Math.hypot(a.x - pista.x, a.z - pista.z)) : -1,
    );
    return {
      cabecera,
      clearedLand: dicho,
      aerodromos,
      oaci: o.aerodromoDeAhora?.() ?? null,
      aguja: o.aguja?.() ?? null,
      traficoLejos: lejosDeAlli.length ? Math.max(...lejosDeAlli) : 0,
    };
  })();

  return {
    etapa,
    alli,
    terrenoEnFinalAlli,
    // Dónde se cruzó y dónde se acabó, si el vuelo iba a otro campo.
    destino: destino
      ? { pedido: destino, llego: enElDestino, acabo: o.campoDeAhora?.() ?? null }
      : null,
    /*
     * **Y si el vuelo se paró por un percance, cuál.**
     *
     * Sin esto, un percance y un atasco se cuentan igual —«acabó en volver a
     * los 900 s»— y son cosas muy distintas: en el percance el juego hizo lo
     * que tenía que hacer y el banco se quedó dando gas a un avión con los
     * frenos puestos durante once minutos. Ver `sufrirPercance`.
     */
    percance: o.percance?.() ?? null,
    donde,
    gafas: o.gafas?.() ?? null,
    segundos: +t.toFixed(1),
    veces,
    subida,
    /*
     * Los dos relojes, para poder compararlos: si el de juego avanzó mucho
     * menos que el de pared × `veces`, el vuelo no iba lento — iba parado.
     */
    paredSegundos: +((Date.now() - paredEmpezo) / 1000).toFixed(1),
    seQuedoSinPared,
    vueltas: i,
    fases: [...fases].join(" "),
    torreDijo: [...(o.dichoTodo?.().torre ?? deLaTorre)],
    // Del historial de la boca, no del muestreo: ver `dichoTodo`.
    cabinaDijo: o.dichoTodo?.().instructor ?? [...deLaCabina],
    cantados: [
      `total:${(o.cantados?.() ?? []).length}`,
      ...(o.cantados?.() ?? []).filter((c) => /V one|rotate|manejador/.test(c)),
      ...(o.descartadas?.() ?? []).filter((c) =>
        /comprometido|rotar|cabina\.v/.test(c),
      ),
    ],
    torreDijoTodo: o.dichoTodo?.().torre ?? [],
    // Y por qué se cayó lo que se cayó, que sin esto una boca muda es un
    // misterio. Ver `apuntarDescarte` en `audio/boca.ts`.
    descartes: o.descartadas?.() ?? [],
    /*
     * Y la conversación entera en orden, que es el gemelo del anterior: sin
     * las dos listas no se distingue «se dijeron cuatro cosas seguidas» de
     * «se dijeron dos y se perdieron otras dos». Ver `habladas` en
     * `audio/boca.ts`.
     */
    habladas: o.habladas?.() ?? [],
    // Todo lo que dijo cada boca, para poder contarlo al final del parte.
    todoLoDicho: o.dichoTodo?.() ?? {},
    masRapidoEnPista: Math.round(masRapidoEnPista),
    seSalioEnPista: Math.round(seSalioEnPista),
    gasEnLaCarrera: +gasEnLaCarrera.toFixed(2),
    verV1: [...verV1],
    tarjetas: [...vistas].join(" "),
    vecesQueDijoToca: o.vecesQueDijoToca?.() ?? null,
    porQueSeMando: o.porQueSeMando?.() ?? null,
    cuandoDijoToca: cuandoDijoToca.join(" · "),
    queLaTapo,
    masBajoSobreLaPista:
      mejorAltura === Infinity ? null : +mejorAltura.toFixed(1),
    alEstarAbajo: { vertical: +mejorVertical.toFixed(1), fase: mejorFase },
    // El principio y el final: los dos sitios donde se atasca un vuelo.
    /*
     * El principio y **el final**, que es donde se atasca un vuelo.
     *
     * Era una ventana fija en mitad de la traza —de la muestra 88 a la 150—,
     * y eso valía cuando lo que fallaba era el rodaje de salida. Desde que el
     * bucle se corta al romperse, lo que hay que ver es lo de justo antes del
     * percance, y una ventana fija cae en cualquier otro sitio.
     */
    linea: [...linea.slice(0, 4), "…", ...linea.slice(-45)],
    hitos,
    carrera: carrera.slice(0, 40),
    mudoMaximo: +mudoMaximo.toFixed(1),
    mudoDonde,
    puertas,
    vueltaMetros: Math.round(vueltaMetros),
    largoDeLaRuta: Math.round(largoDeLaRuta),
    ortofoto: o.ortofoto?.() ?? null,
    pendiente: pendiente === null ? null : +(pendiente * 100).toFixed(1),
    senalero: {
      visto: senalero.visto,
      donde: senalero.donde,
      porQueNo: [...senalero.porQueNo],
      gestos: [...senalero.gestos],
      masCerca: Math.round(senalero.masCerca),
    },
    verBackTaxi: (() => {
      const v = [...verBackTaxi];
      return v.length > 6
        ? [...v.slice(0, 2), `…${v.length - 5}…`, ...v.slice(-3)]
        : v;
    })(),
    sinRaya: +sinRaya.toFixed(1),
    sinRayaDonde,
    sinRayaPrimero,
    // Los cantos con sus números, para poder ver dónde se repite algo.
    cantados: o.cantados?.() ?? [],
    // El tiempo que hizo: lo único que cambia entre pasadas. Ver el informe.
    meteo: o.meteo?.() ?? null,
    lejosDelCoche: Math.round(lejosDelCoche),
    cocheEnPista: Number.isFinite(cocheEnPista)
      ? Math.round(cocheEnPista)
      : null,
    lejosDondeCoche,
    enBici: o.enBici?.() ?? false,
    ladoAlEstarCerca: Number.isFinite(ladoAlEstarCerca)
      ? Math.round(ladoAlEstarCerca)
      : -1,
    cercaDelCoche: Number.isFinite(cercaDelCoche)
      ? Math.round(cercaDelCoche)
      : -1,
    cercaCuando,
    terrenoEnPista: +terrenoEnPista.toFixed(1),
    dijoToca,
    pidioFreno,
    ida: +tiempoDeRodajeIda.toFixed(0),
    vuelta: +tiempoDeRodajeVuelta.toFixed(0),
    despego: +despego.toFixed(0),
    toco: +toco.toFixed(0),
    tocoDesviado: +tocoDesviado.toFixed(1),
    tocoPasadoElUmbral: Math.round(tocoPasadoElUmbral),
    tocoA: +tocoA.toFixed(0),
    rodaduraMedida: Math.round(rodaduraMedida),
    tocoSuelo: +tocoSuelo.toFixed(1),
    frenadaFotogramas,
    frenadaEnElAire,
    acaboEnLaPista,
    dejoDeFrenarA: +dejoDeFrenarA.toFixed(1),
    galones: o.galones().map((g) => g.id ?? g),
    fin: o.finDeVuelo(),
    avion: o.avion?.() ?? null,
    /*
     * **Y a qué altura del suelo se queda el avión parado.**
     *
     * Se mide al principio, con el avión en su puesto y quieto: el punto más
     * bajo del modelo tiene que estar en el asfalto. Flotaba exactamente la
     * altura de su tren —1,40 m el Pykasu, 1,80 el Mainumby— porque el
     * cargador bajaba el modelo lo que mide él y no lo que el juego lo había
     * subido. No se veía porque la sombra se dibuja aparte, contra el suelo, y
     * tapaba el hueco desde la cámara de persecución.
     */
    flota: alPrincipioFlotaba,
  };
}, [VECES, DESTINO]);
fotografiando = false;
await fotos;
/*
 * **Y lo que se dijo, en orden y con su hora, si se pide.** `OGA_VOCES=fichero`
 * vuelca las frases que sonaron y las que se cayeron: para saber qué ocupaba
 * la boca cuando una orden de la torre caducó esperando, el recuento no
 * basta; hace falta la línea de tiempo.
 */
if (process.env.OGA_VOCES) {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(
    process.env.OGA_VOCES,
    JSON.stringify(
      { habladas: vuelo.habladas, descartes: vuelo.descartes, todo: vuelo.todoLoDicho },
      null,
      1,
    ),
  );
}

/**
 * Si el vuelo se quedó sin presupuesto de tiempo.
 *
 * Una frustrada es un circuito más, y con dos el vuelo no cabía en los veinte
 * minutos que había antes. Lo que hacía el banco entonces era reportar ocho
 * fallos —todo lo que se mide después de aterrizar— cuando el defecto era uno:
 * no se llegó a aterrizar. Ver `comprobarSiVolo`.
 */
const seQuedoSinTiempo = vuelo.etapa !== "apagar" && vuelo.segundos >= 1750;

/*
 * **Y lo mismo cuando el que se agota es el reloj de pared.**
 *
 * Vale lo de arriba entero: todo lo que se mide después de aterrizar falla a
 * la vez cuando no se llega a aterrizar, y eso es **un** defecto contado
 * veinte veces. La diferencia es qué hay que ir a mirar: con el presupuesto
 * de juego agotado, el vuelo hizo más de lo que cabía; con éste, el vuelo no
 * avanzó. Ver `TOPE_DE_PARED`.
 */
const seQuedoSinPared = !!vuelo.seQuedoSinPared;

/** Cuánto juego se movió por cada segundo de pared, de verdad. */
const relojDeVerdad =
  vuelo.paredSegundos > 0 ? vuelo.segundos / vuelo.paredSegundos : 0;

// ── Lo que se comprueba ───────────────────────────────────────────────────

/*
 * **Y se vuela el avión de verdad, no las cajas.**
 *
 * El modelo en glTF se carga si está y, si no, el juego sigue con la media
 * docena de cajas de respaldo sin decir nada. Eso está bien —que falte un
 * recurso externo no puede dejar a nadie sin volar— y tiene un reverso que
 * ya costó caro: **nadie se entera de que se apagó**. Pasó el día que la
 * aeronave cambió de identificador y el fichero se quedó con el nombre viejo;
 * el salto visual más grande del juego se fue en silencio y ningún banco lo
 * notó. Ahora lo nota este.
 *
 * **Y solo para los que tienen modelo.** La regla se escribió cuando la flota
 * eran dos aviones y los dos tenían su glTF. Ahora son cinco y tres se dibujan
 * con la fábrica paramétrica, que no es un respaldo: es cómo están hechos, y
 * #68 lo argumenta —diez aeronaves en glTF son cientos de kilobytes; por
 * código, decenas—. Acusarlos de volar el respaldo era medirlos con la regla
 * de otros.
 *
 * Lo que sí se sigue cazando es lo que costó caro: un avión que **tiene**
 * fichero y no lo carga.
 */
const CON_MODELO = new Set([
  "jaz-20",
  "jaz-25",
  "jaz-40",
  "jaz-60",
  "jaz-90",
  "jaz-120",
]);
if (CON_MODELO.has(AVION)) {
  comprobar(
    "se vuela el modelo de la aeronave y no el respaldo",
    vuelo.avion?.dibujo === "modelo",
    vuelo.avion
      ? `${vuelo.avion.nombre} · ${vuelo.avion.dibujo}`
      : "no se pudo mirar",
    "el modelo se apaga en silencio si el fichero no está donde se le espera",
  );
}

/*
 * **Y este escenario vuela sobre fotografía.**
 *
 * Catorce de dieciséis volaban sobre relieve pelado con las casas del sorteo
 * encima, que es lo peor de los dos mundos, y el síntoma que se contaba jugando
 * era otro: «no me gusta volar sobre Maincraft… casi todos los aeropuertos
 * están sin paisaje realista, encima tú le metes edificios inventados».
 *
 * No era de licencias ni de diseño: el guion que baja la ortofoto estaba
 * escrito y probado, y su tabla tenía dos entradas. Eran catorce descargas que
 * nadie había lanzado, y desde fuera «no tiene foto» y «la foto no cargó» se
 * ven igual — terreno liso—. Por eso se comprueba aquí, escenario por
 * escenario, en vez de fiarlo a que alguien mire.
 */
/*
 * **Y se sube después de rotar, no se acelera a ras de suelo.**
 *
 * Un avión ligero sube al seis por ciento largo y uno de línea al cinco; por
 * debajo del tres, lo que hay delante empieza a importar. Se midió persiguiendo
 * un choque contra un bulto a setecientos metros de la cabecera de Los Rodeos:
 * el avión llevaba 730 m recorridos y 5,7 m de altura, o sea **0,8 %**. Ver
 * #169.
 */
comprobar(
  "y sube de verdad después de rotar",
  vuelo.pendiente !== null && vuelo.pendiente >= 3,
  vuelo.pendiente === null
    ? "no llegó a subir cien metros"
    : `${vuelo.pendiente} % desde que suelta el suelo hasta los cien metros`,
  "subir al uno por ciento es acelerar a ras de suelo, y ahí es donde están los bultos",
);

comprobar(
  "el escenario vuela sobre fotografía y no sobre terreno pelado",
  !!vuelo.ortofoto,
  vuelo.ortofoto
    ? `${vuelo.ortofoto.ancho}×${vuelo.ortofoto.alto} px de ortofoto`
    : "sin ortofoto: relieve pelado",
  "volar sobre cajas de colores no se parece a volar",
);

comprobar(
  "el avión parado tiene las ruedas en el suelo",
  vuelo.flota !== null && Math.abs(vuelo.flota) < 0.25,
  vuelo.flota === null
    ? "no se pudo medir"
    : `${vuelo.flota > 0 ? "flota" : "hundido"} ${Math.abs(vuelo.flota).toFixed(2)} m`,
  "el modelo se bajaba lo que mide él y no lo que el juego lo había subido",
);

/*
 * **Y si se acabó el reloj, se dice una vez y no ocho.**
 *
 * Todo lo que este banco mide después de aterrizar —dónde se tocó, si pidió
 * frenar, las gafas, la vuelta al puesto— falla a la vez cuando el vuelo no
 * llega a aterrizar. Y no son ocho defectos: es uno, contado ocho veces, y
 * manda a buscar fantasmas donde no los hay.
 *
 * Así que si el vuelo se quedó sin presupuesto, eso es **el** fallo, y lo que
 * depende de haber aterrizado no se juzga: no se midió.
 */
if (seQuedoSinTiempo) {
  console.log(
    `\n  ⏱  el vuelo no cupo en el presupuesto: se quedó en «${vuelo.etapa}»` +
      ` a los ${vuelo.segundos.toFixed(0)} s.\n` +
      `     Lo que se mide después de aterrizar no se juzga en esta pasada.\n`,
  );
}

/*
 * **Y si el que se agotó fue el de pared, eso es el fallo y se dice con los
 * dos relojes al lado.**
 *
 * Un solo número no distingue «va lento» de «está parado». Los dos juntos sí:
 * si el juego pidió ×4 y de verdad se movió a ×0,2, no hay nada que afinar en
 * el vuelo — hay algo que no corre.
 */
if (seQuedoSinPared) {
  console.log(
    `\n  ⏱  el vuelo no avanzó: ${vuelo.segundos.toFixed(0)} s de juego en` +
      ` ${vuelo.paredSegundos.toFixed(0)} s de pared, o sea ×${relojDeVerdad.toFixed(2)}` +
      ` donde el juego dijo ×${vuelo.veces}.\n` +
      `     Se quedó en «${vuelo.etapa}», fase «${vuelo.fases.split(" ").pop()}».` +
      ` Lo que depende de haber volado no se juzga en esta pasada.\n`,
  );
}

comprobar(
  "el vuelo avanza al ritmo que dice que avanza",
  !seQuedoSinPared,
  seQuedoSinPared
    ? `×${relojDeVerdad.toFixed(2)} de verdad frente a ×${vuelo.veces} pedidos` +
      ` · ${vuelo.segundos.toFixed(0)} s de juego en ${vuelo.paredSegundos.toFixed(0)} s de pared` +
      ` · ${vuelo.vueltas} vueltas · se quedó en «${vuelo.etapa}»`
    : `×${relojDeVerdad.toFixed(2)} de verdad frente a ×${vuelo.veces} pedidos`,
  "el bucle salía por el reloj del juego y se colgaba para siempre si ese reloj se paraba",
);

comprobar(
  "un vuelo entero se puede completar sin ayuda de nadie",
  vuelo.etapa === "apagar",
  `acabó en «${vuelo.etapa}» a los ${vuelo.segundos.toFixed(0)} s${
    vuelo.percance ? ` · percance: ${vuelo.percance}` : ""
  }${
    /*
     * **Y dónde.** Un percance sin sitio no se investiga: «percance: edificio»
     * y nada más deja mirar el aeropuerto entero a ver contra cuál fue.
     */
    vuelo.donde
      ? ` · en ${vuelo.donde.x},${vuelo.donde.z} a ${vuelo.donde.alto} m sobre la pista` +
        ` y ${vuelo.donde.sobreElTerreno} sobre el terreno, a ${vuelo.donde.velocidad} m/s, en «${vuelo.donde.fase}»` +
        (vuelo.donde.edificio
          ? ` · edificio ${vuelo.donde.edificio.k} a ${vuelo.donde.edificio.d} m, de ${vuelo.donde.edificio.alto} m de alto`
          : "") +
        (vuelo.donde.bulto
          ? ` · bulto a ${vuelo.donde.bulto.d} m en ${Math.round(vuelo.donde.bulto.x)},${Math.round(vuelo.donde.bulto.z)}` +
            ` de ${(vuelo.donde.bulto.semiX * 2).toFixed(0)}×${(vuelo.donde.bulto.semiZ * 2).toFixed(0)} m` +
            ` y ${vuelo.donde.bulto.base.toFixed(0)}…${vuelo.donde.bulto.cima.toFixed(0)} de alto`
          : "")
      : ""
  } · fases: ${vuelo.fases}`,
  "el banco medía trozos sueltos y nunca había volado un vuelo de principio a fin",
);

/*
 * **Y la torre autoriza, que para eso hay una torre.**
 *
 * Tenía siete frases grabadas y decía dos. Las otras cinco —«cleared for
 * take-off», «cleared to land», «go around», «hold short», «line up and
 * wait»— estaban grabadas, horneadas, publicadas y bajadas a cada tablet
 * **sin que nada en `src/` las nombrara**: solo vivían en el guion que las
 * generó. Se oyó jugando: «las voces de torre y radio parece que se oyen, pero
 * hay unas pocas frases».
 *
 * Que la clave resuelva ya lo comprueba `verificar-voces`. Lo que se comprueba
 * aquí es lo otro, que es donde estaba el agujero: **que suenan en un vuelo**.
 */
const DE_UN_VUELO = [
  "torre.holdShort",
  "torre.clearedTakeoff",
  "torre.clearedLand",
];

/*
 * **Y la fraseología tiene edad.**
 *
 * La pareja castellano + inglés es la lección, y a los cuatro años el inglés no
 * enseña nada: lo que hace es decir dos veces lo mismo cada vez que la torre
 * abre la boca. Se oyó así: «¿por qué se oye la locución en español y justo
 * después lo mismo pero en inglés siempre?». De Taguató para arriba se dicen
 * los dos; en Guyrami y en Tukã, solo lo que hay que hacer. Así que en esos dos
 * peldaños lo que se comprueba es que la torre **hable**, no que recite en
 * inglés. Ver `luzDeTorre` en `game.ts`.
 */
const conFraseologia = TRAMO === "taguato" || TRAMO === "taguato-ruvicha";
comprobar(
  conFraseologia
    ? "la torre dice la fraseología del vuelo"
    : "la torre manda, y en este peldaño sin el inglés",
  conFraseologia
    ? /*
       * Sin el lado —donde hay pistas paralelas la misma orden lleva su `.L` o
       * su `.R`— y **sin el habla**: en Canarias la misma orden la dice la voz
       * de allí y su clave lleva `canario` en medio, que es lo que arregló que
       * una torre sonara a dos personas. Ver `comoSeDiceAqui`.
       */
      DE_UN_VUELO.every((c) =>
        (vuelo.torreDijo ?? []).some(
          (d) => d.replace(/\.[LCR]$/, "").replace(".canario.", ".") === c,
        ),
      )
    : (vuelo.torreDijo ?? []).some((d) => /(verde|roja)$/.test(d)),
  `la torre dijo: ${vuelo.torreDijo?.join(" · ") || "nada"}` +
    /*
     * **Y lo que se cayó de la torre, todo, no los últimos seis.**
     *
     * Con la cola del final de vuelo, los seis últimos descartes son siempre
     * comentarios de rodaje y lo que se busca —qué pasó con la autorización—
     * ya se salió por arriba. Se filtra a lo de torre y se enseña entero.
     */
    (vuelo.descartes?.some((d) => / torre\./.test(` ${d}`))
      ? ` · de la torre se cayeron: ${vuelo.descartes
          .filter((d) => / torre\./.test(` ${d}`))
          .join(" | ")}`
      : "") +
    (vuelo.descartes?.length
      ? ` · se cayeron: ${vuelo.descartes.slice(-6).join(" | ")}`
      : ""),
  "cinco frases grabadas y horneadas que no las pedía nadie",
);

/*
 * **Y la cabina canta los dos momentos del despegue.**
 *
 * V1 es la decisión —a partir de ahí se vuela pase lo que pase— y Vr la
 * acción. Son la mitad de lo que hace que un despegue se entienda, y con el
 * 747 no salía ninguno de los dos: «en ese mismo vuelo, al despegar no me
 * avisa del V1 ni VR ni nada». El banco volaba siempre la avioneta, donde sí
 * salen, así que nadie se enteró.
 */
comprobar(
  "se anuncian los dos momentos del despegue, V1 y rotar",
  /*
   * **En inglés o en castellano, según el peldaño.** De Taguató para abajo el
   * canal de cabina está apagado y lo mismo se dice con `vuelo.comprometido` y
   * `vuelo.rotar`. Lo que se comprueba es que **los dos momentos se
   * anuncien**, no en qué idioma. Ver `cantar` y `flight/escalera.ts`.
   *
   * Y sin pack de voz cargado —que es lo normal aquí: se baja tras el primer
   * gesto y este banco no da ninguno— lo que queda apuntado es el texto en
   * inglés y no la clave, así que valen las tres formas.
   */
  /*
   * **Y se mira lo que el juego pide, no lo que el navegador consigue decir.**
   *
   * Esto miraba el historial de la boca, o sea lo que de verdad **sonó**. Y en
   * este banco no suena nada: Chrome sin pantalla no trae voces instaladas y
   * el pack de voz no se baja hasta el primer gesto, que aquí no lo da nadie.
   * Así que el resultado dependía de por cuál de los tres caminos de `cantar`
   * se hubiera ido esa tirada, y **cambiaba de escenario entre tiradas con el
   * mismo código**: Tenerife un día, Guaraní al siguiente. Un banco que da un
   * rojo distinto cada vez no está midiendo el juego.
   *
   * Lo que sí es del juego —y es lo que el fallo original era, «con el 747 no
   * salía ninguno de los dos»— es que el detector de velocidades dispare las
   * dos. Eso se pide por `cantar()` y queda apuntado siempre, suene o no.
   * Que además se oigan es cosa del pack de voz, y lo mide `verificar-voces`.
   */
  ["cabina.v1", "V one", "vuelo.comprometido"].some((c) =>
    vuelo.cantados?.some((x) => x.includes(c)),
  ) &&
    ["cabina.vr", "rotate", "vuelo.rotar"].some((c) =>
      vuelo.cantados?.some((x) => x.includes(c)),
    ),
  `del despegue salió: ${(vuelo.cabinaDijo ?? []).filter((c) => /^(cabina\.|V one|rotate|vuelo\.(comprometido|rotar))/.test(c)).join(" · ") || "nada"}` +
    /*
     * **Y qué pasó con el que falta.** Los seis últimos descartes son siempre
     * del final del vuelo, así que el del despegue se salía por arriba y el
     * banco decía «no salió» sin decir por qué. Se filtra a lo del despegue.
     */
    (vuelo.descartes?.some((d) => /(rotar|comprometido|cabina\.v)/.test(d))
      ? ` · del despegue se cayeron: ${vuelo.descartes
          .filter((d) => /(rotar|comprometido|cabina\.v)/.test(d))
          .join(" | ")}`
      : "") +
    ` · cantar() hizo: ${vuelo.cantados?.join(" | ") || "nada"}` +
    ` · back-taxi: ${vuelo.verBackTaxi?.join(" | ")}`,
  "sin V1 ni Vr, un despegue es acelerar y que pase algo",
);

/*
 * **Y que haya alguien esperando en el puesto.**
 *
 * Es «lo único que hace un aeropuerto cuando el avión ya no vuela», y no lo
 * miraba nadie: veinticuatro comprobaciones por escenario y ni una del señor
 * de los bastones. Se arregló una vez —se quedaba plantado en el puesto de
 * salida cuando el de llegada era otro— y no había con qué defender el
 * arreglo. Contado jugando: «nadie me esperaba en Gran Canaria».
 *
 * Se pide poco y se pide lo que importa: que se le llegue a ver y que haga
 * al menos un gesto. Dónde se planta y con qué lateralidad ya lo comprueba
 * `senalero.test.ts` sin navegador.
 */
comprobar(
  "y en el puesto hay alguien esperando, con sus bastones",
  !!vuelo.senalero?.visto && (vuelo.senalero?.gestos?.length ?? 0) > 0,
  `visto: ${vuelo.senalero?.visto ? "sí" : "no"} · gestos: ${
    vuelo.senalero?.gestos?.join(", ") || "ninguno"
  } · su puesto: ${vuelo.senalero?.donde} · lo más cerca que se estuvo: ${vuelo.senalero?.masCerca} m${
    vuelo.senalero?.visto
      ? ""
      : // Los últimos, que son los de la llegada: la lista entera se llena
        // de la salida, donde es correcto que no se le vea.
        ` · y no se le vio porque: ${
          vuelo.senalero?.porQueNo?.slice(-8).join(" | ") || "ni idea"
        }`
  }`,
  "«nadie me esperaba en Gran Canaria», y no había prueba que lo mirara",
);

comprobar(
  "el rodaje de ida no aburre",
  vuelo.ida > 0 && vuelo.ida <= 90,
  `${vuelo.ida} s del puesto al punto de espera`,
  "«es aburrido pasarse cuatro minutos en una pista, eso un niño no lo aguanta»",
);

/*
 * **La vuelta es más larga que la ida, y no es un fallo: es el campo.**
 *
 * Se midieron los 130 pares puesto + punto de espera que tiene Tenerife Norte,
 * y el mejor de todos son 337 metros de ida y unos 1300 de vuelta. La razón es
 * geométrica: la plataforma está en una punta del campo, así que **una de las
 * dos patas es larga por fuerza**. Despegando hacia la otra punta, la corta es
 * la ida —el punto de espera cae al lado del puesto, con toda la pista por
 * delante— y la larga es la vuelta. Dando la vuelta al sentido de uso pasa
 * exactamente lo contrario, y es peor: lo primero que hace quien juega, con la
 * ilusión de despegar, serían dos kilómetros de calle.
 *
 * Así que lo que se comprueba aquí no es un ideal de noventa segundos que este
 * aeropuerto no puede dar: es que **no crezca**. Lo que sí acortaría esto de
 * verdad es un aeródromo pequeño para el peldaño de los pequeños, y eso es una
 * decisión de producto, no un ajuste.
 */
const rodeo = vuelo.vueltaMetros / Math.max(1, vuelo.largoDeLaRuta);
comprobarSiVolo(
  "y el de vuelta no se dispara",
  /*
   * **Y se mide el rodeo, no el reloj.**
   *
   * El listón estaba en 220 segundos y el ruido propio de esta medida va de 189
   * a 237: la comprobación salía a cara o cruz, y dos barridos seguidos sobre
   * el mismo código fallaban escenarios distintos. Comprobado con tres tiradas
   * a cada lado de un cambio —218 s de media con él, 217 sin él—, o sea que no
   * medía el cambio: medía la suerte.
   *
   * El ruido es legítimo y no se puede quitar: la vuelta empieza donde cae el
   * avión al frenar, y eso depende de dónde tocó. Lo que **no** hereda esa
   * varianza es cuánto rodea la ruta, o sea los metros rodados partidos por los
   * que hay en línea recta. Medido, eso sale ×1,1 o ×1,2 en cuatro aeródromos
   * de tamaños muy distintos —Pettirossi 2113 m, Tenerife Norte 1045, Gran
   * Canaria 1050, El Hierro 714—, que es justo lo que se espera de una medida
   * que mide la ruta y no el campo. Ver #166.
   *
   * **Y el primer intento de arreglarlo salió mal, que es de lo que va esto.**
   * Probé a medir el rodeo contra la línea recta hasta el puesto, salió ×1,1 o
   * ×1,2 en cuatro aeródromos y lo di por bueno. En los otros doce sale entre
   * ×1,9 y ×5,7 — en La Palma, 742 metros rodados con 177 en línea recta,
   * porque la plataforma está al lado de la pista y hay que rodearla—. Cuatro
   * muestras que coinciden no son una regla: son cuatro muestras.
   *
   * Contra la ruta trazada, en cambio, sale ×0,89 · ×0,95 · ×0,96 · ×0,97 ·
   * ×0,98 · ×1,07 en seis campos de tamaños que no se parecen en nada. Por
   * debajo de uno porque el avión corta las curvas redondeadas. Uno y medio es
   * holgura de sobra y muy poco para un avión que se va por donde no debe.
   *
   * **Y lo que esto ya no comprueba**, dicho para que no se dé por cubierto: si
   * la ruta **en sí** es buena. Un elector de puesto que mande al hueco más
   * lejano traza una ruta larguísima y el avión la sigue clavada, así que este
   * número sale en uno igual. Eso es lo que pasó en #156 y lo que vigilan los
   * segundos de aquí abajo —quinientos, o sea «esto se rompió»— y la tabla de
   * porcentajes de rodaje que imprime el barrido.
   */
  vuelo.vuelta > 0 &&
    vuelo.largoDeLaRuta > 0 &&
    rodeo <= 1.55 &&
    vuelo.vuelta <= 500,
  `×${rodeo.toFixed(2)} de su ruta · ${vuelo.vueltaMetros} m rodados sobre ${vuelo.largoDeLaRuta} trazados · ${vuelo.vuelta} s`,
  "la vuelta es más larga que la ida y nadie la había cronometrado",
);

/*
 * **Y la puerta asignada no cambia, que es de dónde salía el rodeo.**
 *
 * El rodeo de arriba dice que el avión rodó de más, pero no dice por qué. Esto
 * sí: `puestoDeLlegada` mide «el más cercano rodando **desde donde estás**» y
 * se llamaba en cada fotograma del tramo de abandonar la pista, así que al
 * avanzar el avión cambiaba el ganador — la ruta saltaba de un puesto a otro y
 * la raya verde con ella.
 *
 * Medido antes de arreglarlo: Tenerife Sur ×1,53 —1682 metros rodados sobre
 * 1098 trazados— y La Palma ×1,40. Contado jugando: «estoy paseando por el
 * aeropuerto y ni coche, ni señor de las balizas, ni rayas verdes».
 *
 * **Y el listón sube de 1,4 a 1,55, con el motivo medido.** Tenerife Sur da
 * ×1,08, ×1,31, ×1,31 y ×1,43 en cuatro tiradas del mismo código: su banda de
 * ruido pasa por encima de 1,4, así que la comprobación fallaba a cara o cruz
 * — exactamente el mal que ya costó una tarde con el listón de los 220
 * segundos. Y esta comprobación tiene hoy menos trabajo que cuando se escribió:
 * el baile de puertas, que era lo que disparaba el rodeo a ×1,53, lo caza
 * ahora su propia prueba, que no depende de volar.
 *
 * Lo que sigue cazando —y para lo que se queda— es un avión que se va por
 * donde no debe: con el denominador equivocado eso daba de ×1,9 a ×5,7.
 *
 * **Y esto detecta el síntoma, no demuestra la regla.** Con el arreglo deshecho
 * a propósito, una tirada lo cazó —dos puertas— y la siguiente pasó en verde:
 * un vuelo entero tiene varianza de sobra para tapar el fallo en una tirada.
 * Quien demuestra la regla sin depender de la suerte es
 * `src/world/puerta-asignada.test.ts`. Esto es la red de abajo.
 */
comprobarSiVolo(
  "y la puerta asignada es una sola",
  vuelo.puertas.length === 1,
  vuelo.puertas.length === 1
    ? "la misma de principio a fin"
    : `${vuelo.puertas.length} puertas distintas en una llegada: ${vuelo.puertas.join(" · ")}`,
  "a un avión que llega se le da una puerta, y nadie se la cambia rodando",
);

comprobar(
  "la pantalla nunca se queda muda en tierra",
  vuelo.mudoMaximo < 6,
  `lo más, ${vuelo.mudoMaximo} s sin tarjeta${vuelo.mudoDonde ? ` · ${vuelo.mudoDonde}` : ""}`,
  "«la llave salió, se apagó a los seis segundos, y ya no había forma de enterarse»",
);

comprobarSiVolo(
  "la raya verde no falta mientras se rueda",
  vuelo.sinRaya < 1,
  vuelo.sinRaya
    ? `${vuelo.sinRaya} s sin raya · del ${vuelo.sinRayaPrimero} al ${vuelo.sinRayaDonde}`
    : "puesta todo el rato",
  "«cuando doy el giro dejo de ver la línea verde… había desaparecido hasta A3»",
);

if (TRAMO === "guyrami" || TRAMO === "tuka") {
  /*
   * **Y el sígame no se mete en la pista contigo dentro.**
   *
   * Cincuenta metros: lo bastante lejos como para que no sea un obstáculo
   * saliendo a velocidad de calle, y lo bastante cerca como para cazar al
   * coche plantado delante del morro, que es lo que pasaba —treinta metros—.
   * `null` quiere decir que nunca coincidieron en pista, que es lo ideal.
   */
  comprobar(
    "y el sígame no baja a la pista contigo encima",
    vuelo.cocheEnPista === null || vuelo.cocheEnPista > 50,
    vuelo.cocheEnPista === null
      ? "nunca coincidieron en pista"
      : `lo más cerca, ${vuelo.cocheEnPista} m con los dos en pista`,
    "«acelero porque las salidas están lejos, y se rompió, volvemos a empezar»",
  );
  comprobar(
    "al coche del sígame se le puede seguir",
    vuelo.lejosDelCoche < 150,
    `lo más lejos que llegó a estar: ${vuelo.lejosDelCoche} m${vuelo.lejosDondeCoche ? ` · ${vuelo.lejosDondeCoche}` : ""}`,
    "«el avión frena sin que el usuario pueda acelerar y el coche casi que se escapa»",
  );
}

/*
 * **Y no se le atropella.**
 *
 * Es lo contrario de la comprobación de arriba y hace falta igual: llevárselo
 * por delante es un percance, o sea el final del vuelo en el sitio donde el
 * juego debería estar diciendo «llegaste a casa». Ocho metros es lo que el
 * propio juego considera atropello — el tren de el Pykasu, no pasarle cerca.
 *
 * **Y solo donde sale el coche.** En los campos privados —Yvytu Rape— no sale
 * un coche: sale alguien en bicicleta, y ahí el juego hace lo contrario a
 * propósito. Un coche que se lleva un golpe es un chiste y enseña que en una
 * plataforma no se adelanta; una persona en bici, no. Así que la bici **se
 * aparta** en cuanto la tenés a veinte metros y el percance no se le aplica.
 * Ver `cede` en `Game` y `construirBici`.
 *
 * Medirla con la vara del coche era medir el juego con la regla de otro
 * juego: en Yvytu Rape la comprobación fallaba unas veces sí y otras no —2, 5,
 * 6, 7 y 13 metros en carreras seguidas— justo donde el juego estaba haciendo
 * lo que tiene que hacer. Un banco que falla sin que haya fallo es peor que no
 * tener banco.
 *
 * Lo que sí queda dicho es el número, que hace falta: la bici acaba a dos
 * metros del avión y encima de la raya, y tenía que haberse echado once a un
 * lado. Ver #157.
 */
comprobar(
  "y no se le atropella",
  vuelo.enBici || vuelo.cercaDelCoche < 0 || vuelo.cercaDelCoche > 8,
  vuelo.cercaDelCoche < 0
    ? "no llegó a salir"
    : `lo más cerca que llegó a estar: ${vuelo.cercaDelCoche} m · a ${vuelo.ladoAlEstarCerca} m de la raya · ${vuelo.cercaCuando}` +
        (vuelo.enBici
          ? " · en bici, que se aparta a propósito y no cuenta como atropello"
          : ""),
  "«con el avión puedo adelantar al coche, le paso por encima»",
);

comprobar(
  "sobre la pista no salta el aviso de terreno",
  vuelo.terrenoEnPista === 0,
  vuelo.terrenoEnPista
    ? `${vuelo.terrenoEnPista} s avisando`
    : "callado, como debe",
  "«me avisa que voy a terrain cuando ya estoy sobre la cabecera de la pista»",
);

comprobarSiVolo(
  "antes de tocar, el juego dice que ya se puede tocar",
  vuelo.dijoToca,
  vuelo.dijoToca
    ? "salió su dibujo"
    : `no salió · el juego lo decidió ${vuelo.vecesQueDijoToca} veces (${vuelo.cuandoDijoToca}; lo siguiente en pantalla: «${vuelo.queLaTapo}», mandada por ${JSON.stringify(vuelo.porQueSeMando)}) · lo más bajo sobre la pista, volando: ${vuelo.masBajoSobreLaPista} m, a ${vuelo.alEstarAbajo.vertical} m/s, en «${vuelo.alEstarAbajo.fase}»`,
  "«no me indica lo contrario, que ya debo tomar tierra»",
);

/*
 * **Y dónde se tocó.** Nueve metros del eje es lo que caben en media pista de
 * Yvytu Rape, que mide dieciocho de ancho: es el listón que hace falta para
 * poder decir que este piloto sabe posarse ahí. Ver #147.
 */
comprobarSiVolo(
  "se toca cerca del eje y dentro de la pista",
  vuelo.toco > 0 && Math.abs(vuelo.tocoDesviado) < 9,
  vuelo.toco
    ? `a ${Math.abs(vuelo.tocoDesviado).toFixed(1)} m del eje, ${vuelo.tocoPasadoElUmbral} m pasado el umbral, a ${vuelo.tocoA} m/s`
    : "no llegó a tocar",
  "en una pista de dieciocho metros, «aterrizó» sin decir a cuánto del eje no significa nada",
);

/*
 * **Y la frenada frena lo que tiene que frenar.**
 *
 * Lo que se mide es la **deceleración media en g**, y no los metros. Los
 * metros era lo que había, y era una regla de medir rota: el listón salía de
 * la ficha del avión —«al menos un tercio de su distancia de aterrizaje»— y
 * una ficha no sabe de viento. En Canarias sopla el alisio casi siempre, así
 * que tocar a 32 m/s de aire son bastantes menos respecto al suelo, y la
 * carrera de frenada se acorta **de verdad**: aterrizar contra el viento
 * acorta la carrera, y eso es justo la lección, no un fallo.
 *
 * El resultado era un fallo en la frontera —«rodó 97 m desde que tocó a 32
 * m/s, su ficha pide al menos 101»— con el avión frenando perfectamente. Lo
 * comprobó, sin volar y sin viento, `src/flight/frenada.test.ts`: los seis
 * aviones frenan entre 0,31 y 0,33 g, que es lo que frena una avioneta en
 * asfalto seco.
 *
 * En g no hay nada que descontar: es la misma cifra con viento y sin él, y
 * sigue cazando lo que hay que cazar —«freno en la pista en 2 metros, eso no
 * se lo cree nadie»—, que en g son cuatro o cinco.
 */
if (vuelo.toco > 0 && vuelo.rodaduraMedida > 0 && vuelo.tocoSuelo > 0) {
  const g =
    (vuelo.tocoSuelo * vuelo.tocoSuelo -
      vuelo.dejoDeFrenarA * vuelo.dejoDeFrenarA) /
    (2 * vuelo.rodaduraMedida) /
    9.80665;
  comprobarSiVolo(
    "y frenar le cuesta lo que frena un avión",
    g > 0.15 && g < 0.6,
    `${g.toFixed(2)} g · ${vuelo.rodaduraMedida} m desde ${vuelo.tocoSuelo} m/s de suelo` +
      ` (${vuelo.tocoA} de aire) hasta ${vuelo.dejoDeFrenarA}` +
      ` · en el aire el ${Math.round((100 * vuelo.frenadaEnElAire) / Math.max(1, vuelo.frenadaFotogramas))} % de la frenada`,

    "«freno en la pista en 2 metros, eso no se lo cree nadie»",
  );
}

/*
 * **Y el vuelo no se da por terminado con el avión en la pista.**
 *
 * La pista se deja libre: hay otro detrás, y ése es el motivo por el que
 * existen el punto de espera y la doble raya. Un juego que te felicita por
 * pararte en medio enseña justo lo contrario.
 */
comprobarSiVolo(
  "y no se da por llegado con el avión en la pista",
  !vuelo.acaboEnLaPista,
  vuelo.acaboEnLaPista
    ? "dijo «llegaste» con el avión todavía sobre el asfalto"
    : "esperó a que dejara la pista",
  "«apago el motor en mitad de la pista y vuelo terminado, y gano hasta galones»",
);

comprobarSiVolo(
  "y después de tocar, pide frenar",
  vuelo.pidioFreno,
  vuelo.pidioFreno ? "salió la tarjeta del freno" : "no la pidió",
  "se aterrizaba y la pantalla no decía nada durante quince segundos",
);

/*
 * **Y el primer aterrizaje bueno trae las gafas de sol.**
 *
 * Es la única comprobación de este banco que no mide si el avión vuela: mide
 * si el premio llega. El proyecto entero nace de una niña que quiere ser
 * piloto «con las gafas de sol», y entre la regla escrita en `flight/gafas.ts`
 * y que unas gafas aparezcan de verdad en la cara de quien acaba de posarse
 * hay cuatro piezas —el veredicto, el hecho, el botón y el cristal—, que son
 * cuatro sitios donde se puede cortar sin que nadie se entere.
 *
 * Solo cuando se llegó a tocar: un vuelo que no aterriza no las gana, y eso no
 * es un fallo del premio.
 */
if (vuelo.toco > 0) {
  comprobarSiVolo(
    "y con el primer aterrizaje bueno te llevás las gafas de sol",
    vuelo.gafas?.ganadas === true && vuelo.gafas?.puestas === true,
    vuelo.gafas
      ? `ganadas ${vuelo.gafas.ganadas ? "sí" : "no"}, puestas ${vuelo.gafas.puestas ? "sí" : "no"}`
      : "el juego no sabe decirlo",
    "«quiero ser piloto con las gafas de sol»",
  );
}

comprobarSiVolo(
  "y el vuelo termina contando lo que te llevás",
  vuelo.fin && vuelo.galones.length > 0,
  `${vuelo.galones.length} galones: ${vuelo.galones.join(", ") || "ninguno"}${vuelo.fin ? "" : " · sin pantalla de fin"}`,
  "un vuelo que termina sin decir que ha terminado deja mirando la pantalla",
);

/*
 * **Y que nadie se repita.**
 *
 * El banco ya apuntaba qué se oyó y cuántas veces, pero solo lo *imprimía*: un
 * número en un listado que nadie lee no impide nada. Y esa cuenta era la que
 * tenía la respuesta delante — «metélo, el tren» ocho veces en una misma
 * subida, de trescientos a novecientos metros, porque el aviso se rearmaba con
 * un reloj. Se descubrió mirando el listado a mano, y a mano no se mira todos
 * los días.
 *
 * Así que ahora falla. Un aviso que sale cinco veces en un vuelo es un aviso
 * que no se está escuchando: o la situación no ha cambiado entre una vez y la
 * siguiente —y entonces la segunda ya sobraba— o el rearme mira un número que
 * tiembla en vez de algo que pasa. Ver `seVuelveADecir` en `flight/tren.ts`.
 *
 * Solo la instructora: la torre y el otro tráfico repiten a propósito —cuatro
 * autorizaciones de aterrizaje son cuatro vueltas al circuito, y cada una es
 * un suceso distinto—, mientras que la instructora habla de lo que está
 * pasando ahora y lo que está pasando ahora no pasa cinco veces.
 */
{
  const dichas = (vuelo.todoLoDicho ?? {}).instructor ?? [];
  const cuenta = new Map();
  for (const c of dichas) cuenta.set(c, (cuenta.get(c) ?? 0) + 1);
  const pesadas = [...cuenta]
    .filter(([, n]) => n > MAS_DE_LA_CUENTA)
    .sort((a, b) => b[1] - a[1]);
  /*
   * **Y con las primeras veces y sus números**, que es lo que hace falta para
   * arreglarlo.
   *
   * Saber que algo se dijo trescientas veces no dice **dónde**. El registro de
   * cantos lleva la velocidad y la altura de cada uno, así que con las
   * primeras a la vista se ve en qué tramo del vuelo pasa: en la aproximación,
   * en el circuito o rodando. Sin esto se adivina, y adivinar costó cuatro
   * arreglos seguidos que movieron el número sin llevarlo a cero.
   */
  /*
   * Y se cuenta **por su cuenta**, sin cruzar los dos nombres: el recuento de
   * arriba usa la palabra de casa —«cien»— y el registro de cantos la de
   * cabina —«one hundred»—, así que casar uno con otro por texto no funciona.
   * Lo que interesa es lo mismo de todas formas: qué canto se repite y con qué
   * números salió las primeras veces.
   */
  const porCanto = new Map();
  for (const l of vuelo.cantados ?? []) {
    const k = String(l).split("→")[0].trim();
    if (!porCanto.has(k)) porCanto.set(k, []);
    porCanto.get(k).push(l);
  }
  const elQueMas = [...porCanto.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  )[0];
  const conNumeros =
    pesadas.length && elQueMas && elQueMas[1].length > MAS_DE_LA_CUENTA
      ? elQueMas[1]
      : [];
  comprobar(
    "y la instructora no se repite",
    pesadas.length === 0,
    pesadas.length
      ? pesadas.map(([c, n]) => `${c} ×${n}`).join(", ") +
          (conNumeros.length
            ? `\n      las primeras:\n        ${conNumeros.slice(0, 8).join("\n        ")}`
            : "")
      : `${cuenta.size} frases distintas, ninguna más de ${MAS_DE_LA_CUENTA} veces`,
    "«me dice que meta el tren, luego que lo saque, luego que lo vuelva a meter, joder»",
  );
}

/*
 * **Y si se iba a otro campo, que se llegó a él y se acabó en él.** Todo lo de
 * arriba —la raya, el coche, el señalero, el rodaje— vale solo si se midió
 * allí; un vuelo que se queda en casa lo pasaría en verde sin haber cruzado.
 */
if (DESTINO) {
  const d = vuelo.destino ?? {};
  comprobar(
    "se aterriza y se aparca en el otro campo",
    d.llego === DESTINO && d.acabo === DESTINO,
    `pedido ${DESTINO} · se cruzó a ${d.llego ?? "ninguno"} · se acabó en ${d.acabo ?? "?"}`,
    "«aterricé en Tenerife Norte y no había nadie esperando, ni coche ni señor con señales ni línea verde»",
  );

  /*
   * **Y allí todo es de allí.** Lo de arriba mide que se llegó y se aparcó;
   * esto, que lo que el juego enseña al llegar —el aviso de terreno, la
   * torre, la aguja, el cuaderno y el tráfico— habla del campo en el que se
   * está y no del de casa. Cada una de estas cosas miraba el de casa.
   */
  const a = vuelo.alli ?? {};
  comprobar(
    "y en la final de allí no salta el aviso de terreno",
    vuelo.terrenoEnFinalAlli === 0,
    vuelo.terrenoEnFinalAlli
      ? `saltó ${vuelo.terrenoEnFinalAlli} veces con la fase en final`
      : "no saltó ninguna vez con la fase en final",
    "«terrain, pull up» a ciento veinte metros en una final bien volada a Los Rodeos",
  );
  const cifras = String(a.cabecera ?? "")
    .replace(/[^0-9]/g, "")
    .split("")
    .map((c) => `cifra.${c}`)
    .join("-");
  const conOtraPista = (a.clearedLand ?? []).filter(
    (h) => !cifras || !h.endsWith(cifras),
  );
  comprobar(
    "y la torre de allí nombra su pista",
    !!cifras && conOtraPista.length === 0,
    !cifras
      ? "no se supo la cabecera de allí"
      : conOtraPista.length
        ? `pista ${a.cabecera}, y dijo: ${conOtraPista.slice(0, 3).join(" · ")}`
        : `pista ${a.cabecera} · ${(a.clearedLand ?? []).length} autorizaciones, todas con ella`,
    "«runway zero three left, cleared to land» llegando por la 12 de Los Rodeos",
  );
  const metros = a.aguja?.metros ?? NaN;
  comprobar(
    "y en tierra allí la aguja señala su pista",
    Number.isFinite(metros) && metros < 10000,
    Number.isFinite(metros)
      ? `señala a ${(metros / 1000).toFixed(1)} km`
      : "la aguja no dijo nada",
    "rodando en Los Rodeos, la aguja apuntaba a la pista de Gando, a ciento trece kilómetros",
  );
  comprobar(
    "y el aeródromo de allí se apunta como visitado",
    !!a.oaci && (a.aerodromos ?? []).includes(a.oaci),
    `cuaderno: ${JSON.stringify(a.aerodromos ?? [])} · allí: ${a.oaci}`,
    "aterrizar en Los Rodeos apuntaba Gran Canaria en «aeródromos visitados»",
  );
  comprobar(
    "y el tráfico que se oye vuela allí",
    (a.traficoLejos ?? 0) < 20000,
    a.traficoLejos
      ? `el más lejos, a ${a.traficoLejos} m de la pista de allí`
      : "sin nadie en el circuito",
    "en Los Rodeos se oía el circuito de Gando, con los aviones a ciento trece kilómetros",
  );
}

// ── El informe ────────────────────────────────────────────────────────────

/*
 * **Y con qué tiempo se voló.**
 *
 * Es lo único que cambia de una pasada a la siguiente: el relieve, el avión y
 * el piloto del banco son los mismos. Así que cuando dos pasadas del mismo
 * comando dan resultados distintos —y pasa— lo primero que hay que poder
 * comparar es esto, y hasta hoy no se imprimía. Se perdieron dos
 * investigaciones por no tenerlo delante.
 */
const queTiempoHizo = vuelo.meteo
  ? ` · viento ${String(Math.round(vuelo.meteo.vientoDe ?? 0)).padStart(3, "0")}/${Math.round(vuelo.meteo.vientoKt ?? 0)} kt` +
    (vuelo.meteo.techoM ? ` · techo ${Math.round(vuelo.meteo.techoM)} m` : "") +
    (vuelo.meteo.temp != null ? ` · ${Math.round(vuelo.meteo.temp)} °C` : "")
  : "";
if (vuelo.subida?.length)
  console.log("\n  la subida:\n" + vuelo.subida.map((l) => "    " + l).join("\n"));

console.log(
  `\n  vuelo entero · ${ESCENARIO}${DESTINO ? ` → ${DESTINO}` : ""} · ${TRAMO} · reloj ×${vuelo.veces}` +
    ` · arrancó en ${tardoEnArrancar.toFixed(1)} s` +
    ` · ${vuelo.vueltas} muestras en ${vuelo.segundos.toFixed(0)} s de vuelo` +
    queTiempoHizo +
    "\n",
);
let fallos = 0;
for (const r of resultados) {
  if (!r.ok) fallos++;
  console.log(
    `  ${r.sinMedir ? "·" : r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`,
  );
  if (!r.ok) console.log(`      volvió: ${r.porque}`);
}
if (errores.length) {
  fallos++;
  console.log(`\n  ✗ errores en la consola: ${errores[0]}`);
}
if (fallos) {
  if (vuelo.carrera?.length) {
    console.log("\n  la carrera de despegue:");
    for (const l of vuelo.carrera) console.log(`    ${l}`);
  }
  if (vuelo.hitos?.length) {
    console.log("\n  por dónde fue el vuelo:");
    for (const h of vuelo.hitos) console.log(`    ${h}`);
  }
  console.log("\n  últimos instantes del vuelo:");
  for (const l of vuelo.linea) console.log(`    ${l}`);
}
/*
 * ── **Y qué se oyó, y cuántas veces** ──
 *
 * El pack de la instructora tiene ciento cinco frases distintas y quien juega
 * decía oír siempre las mismas cuatro: «hay un montón de sonidos y yo solo le
 * oigo decir siempre las mismas cuatro cosas». No había forma de contestar a
 * eso sin volar y apuntar a mano, que es justo lo que este banco ya hace.
 *
 * Así que lo cuenta: por boca, qué dijo y cuántas veces, ordenado por lo más
 * repetido. Una voz que dice cuatro cosas cincuenta veces y una que dice
 * cuarenta una vez cada una son dos juegos distintos, y hasta hoy se veían
 * igual desde fuera.
 */
{
  const bocas = vuelo.todoLoDicho ?? {};
  const nombres = Object.keys(bocas).filter((b) => (bocas[b] ?? []).length);
  if (nombres.length) {
    console.log("\n  lo que se oyó en el vuelo:\n");
    for (const boca of nombres) {
      const cuenta = new Map();
      for (const c of bocas[boca]) cuenta.set(c, (cuenta.get(c) ?? 0) + 1);
      const orden = [...cuenta].sort((a, b) => b[1] - a[1]);
      console.log(
        `  ${boca}: ${bocas[boca].length} frases · ${cuenta.size} distintas`,
      );
      for (const [c, n] of orden)
        console.log(`      ${String(n).padStart(3)} ×  ${c}`);
    }
  }
}

const sinMedir = resultados.filter((r) => r.sinMedir).length;
console.log(
  `\n  ${resultados.length - fallos - sinMedir} de ${resultados.length - sinMedir} comprobaciones` +
    (sinMedir ? ` · ${sinMedir} sin medir` : "") +
    "\n",
);

await navegador.close();
await server.close();
process.exit(fallos ? 1 : 0);

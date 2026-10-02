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
import {
  autoplayDeVerdad,
  enUnaLinea,
  frasesOidas,
  loOido,
  oidoEnLaPagina,
  redLentaParaLasVoces,
  seSolapan,
} from "./oido.mjs";
import { fasesATiempoReal } from "./reloj-del-banco.mjs";

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
/**
 * **Y un crucero antes de cruzar, si se pide**: `OGA_CRUCERO=segundos`.
 *
 * El trayecto entre islas no se vuela —ver arriba— y con él se saltaba todo
 * lo que pasa en crucero: el cartel que se apaga, el servicio a bordo, el
 * anuncio del descenso, los cinturones y la orden a la tripulación de
 * prepararse para aterrizar. El guion de la cabina se quedaba en el
 * despegue y la despedida, y lo de en medio no lo medía nadie.
 *
 * Con esto el avión sube a setecientos cincuenta metros sobre el campo,
 * vuela nivelado esos segundos de juego, baja a trescientos como baja
 * cualquiera hacia su destino y **entonces** cruza a la final del otro
 * campo. Sin la variable el banco vuela como siempre.
 */
const CRUCERO_PEDIDO = Number(process.env.OGA_CRUCERO ?? 0) || 0;
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
 * **Y el oído**: lo que de verdad llega al altavoz, no lo que se pidió decir.
 * Ver `scripts/oido.mjs`. Con `OGA_COMO_EN_CASA=1`, además, las condiciones de
 * casa de Enrique: la política de autoplay de un navegador con pantalla y el
 * pack de voz bajando por una red lenta. Ver `verificar-voces-de-verdad.mjs`.
 */
const COMO_EN_CASA = process.env.OGA_COMO_EN_CASA === "1";
if (COMO_EN_CASA) {
  await page.addInitScript(autoplayDeVerdad);
  await redLentaParaLasVoces(page);
}
await page.addInitScript(oidoEnLaPagina);
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
/*
 * **Y el tiempo de casa es el de casa, no el del día.**
 *
 * Sin `OGA_METAR` esto decía volar con el tiempo de casa, y en el árbol
 * principal no era verdad: allí hay un `.env` con el proxy del METAR, así que
 * el juego pedía el parte de verdad del aeropuerto y el banco volaba con el
 * tiempo que hiciera ese día. Se vio con la tormenta: en Los Rodeos, el
 * 27-sep-2026, el parte traía `-RA` —lluvia floja—, salían células en el
 * radar y la instructora pedía rodear la lluvia cinco veces en un vuelo que
 * se suponía de buen tiempo. Y en una copia sin `.env` el mismo banco no lo
 * reproducía. `&meteo=` vacío le dice al juego que no hay proxy. Para volar
 * con el parte de verdad, `OGA_METEO_DE_VERDAD=1`.
 */
const METAR = process.env.OGA_METAR
  ? `&metar=${encodeURIComponent(process.env.OGA_METAR)}`
  : process.env.OGA_METEO_DE_VERDAD
    ? ""
    : "&meteo=";
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
/*
 * **Y aves en la final, seguro, si se pide.** En los peldaños de arriba una
 * final de cada dos trae una bandada y el aviso de la torre; con
 * `OGA_AVES_EN_FINAL=1` la trae esta, para poder mirarla. Ver
 * `flight/aviso-de-aves.ts`.
 */
if (process.env.OGA_AVES_EN_FINAL === "1")
  await page.evaluate(() => globalThis.__oga?.avesEnLaFinalSeguro?.());
/*
 * **Y la llegada por la otra punta, si se pide.** `OGA_OTRA_PUNTA=1` con un
 * destino aterriza allí por la cabecera contraria a la del viento, que es como
 * llegó Enrique a Fuerteventura —la 01 en uso, la toma por la 19— y como se
 * quedó sin raya, sin coche y sin señalero. La torre no te autoriza esa final
 * —no es la pista en uso—, así que lo que se mide de ella no cuenta; lo que
 * se mira es el rodaje de después. Ver `porLaOtraPunta` en `sondas.ts`.
 */
if (process.env.OGA_OTRA_PUNTA === "1" && DESTINO)
  await page.evaluate(
    (d) => globalThis.__oga?.aterrizarPorLaOtraPunta?.(d),
    DESTINO,
  );
await page
  .waitForFunction(() => (globalThis.__oga?.voz?.().piezas ?? 0) > 0, null, {
    timeout: 60000,
  })
  .catch(() => {});
/*
 * **Y una turbulencia en el camino, si se pide**: `OGA_TURBULENCIA=prevista`
 * o `sin-avisar`, a los veinte kilómetros de despegar y durante diez. Es para
 * mirar que lo que anuncia Jazlyn pasa de verdad, y en su orden: la prevista
 * se anuncia antes de llegar; la de aire claro, cuando ya se mueve. Pide un
 * crucero —`OGA_CRUCERO`— para que dé tiempo a cruzarla. Ver
 * `flight/turbulencia-del-vuelo.ts`.
 */
const TURBULENCIA = process.env.OGA_TURBULENCIA ?? null;
const ZONA_PEDIDA = TURBULENCIA
  ? { desde: 20000, hasta: 30000, intensidad: "moderada", como: TURBULENCIA, capa: null }
  : null;
if (ZONA_PEDIDA)
  await page.evaluate((z) => globalThis.__oga?.ponerTurbulencia?.([z]), ZONA_PEDIDA);

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
  const fotografiadas = new Set();
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
          aves: o.avesDelante?.() ?? null,
        };
      })
      .catch(() => null);
    if (!dato) continue;
    /*
     * Y una cuando se pasa junto a una bandada, que en final dura segundos y
     * entre dos fotos de fase no sale nunca. Ver `avesDelante` en `sondas.ts`.
     */
    const aves = dato.aves && !fotografiadas.has(dato.aves);
    if (aves) fotografiadas.add(dato.aves);
    if (!aves && dato.fase === ultima && dato.t - ultimaT < 30) continue;
    ultima = dato.fase;
    ultimaT = dato.t;
    const nombre = `${String(n++).padStart(2, "0")}-${dato.t.toFixed(0)}s-${dato.fase.replace(/[^\w.-]+/g, "_")}${aves ? "-aves" : ""}.png`;
    await page.screenshot({ path: `${FOTOS}/${nombre}` }).catch(() => {});
  }
})();

// Ver `apuntarElAla`: la traza del ala se enciende antes de volar.
if (process.env.OGA_TRAZA_ALA)
  await page.evaluate(() => {
    globalThis.__trazaAla = [];
  });

/*
 * **Si el avión lleva pasaje, y con él megafonía.** Una avioneta no la lleva:
 * la comandante no tiene a quién hablar. Ver `conPasaje` en
 * `audio/megafonia.ts`. Decide qué fases se vuelan a tiempo real —ver
 * `scripts/reloj-del-banco.mjs`— y si se mide lo que pidió la megafonía.
 */
const conMegafonia = await page
  .evaluate(() => !!globalThis.__oga?.avion?.().conPasaje)
  .catch(() => true);
const A_TIEMPO_REAL = fasesATiempoReal(conMegafonia);

const vuelo = await page.evaluate(async ([vecesPedidas, destino, peldano, cruceroPedido, trazarCoche, aTiempoReal, pistaOcupadaPedida]) => {
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
  // Si el campo de salida tiene torre: en una pista particular no la hay, y
  // lo que se comprueba de ella es que calle. Ver la comprobación de la torre.
  const saleConTorre = o.conFrecuencia?.() ?? true;
  /*
   * Y si el de salida o el de llegada es un AFIS, que informa y no autoriza:
   * allí lo que se oye es «pista libre», no «cleared». Ver `Aerodrome.afis`.
   */
  const saleConAfis = o.conAfis?.() ?? false;
  const aterrizaConAfis = !!destino && (o.conAfis?.(destino) ?? false);
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
    engineOn: false,
  };
  /*
   * **Y el piloto no tira más allá de lo que aguanta el ala.**
   *
   * Con el JAZ 90 en Taguató el juego cantó «stall, stall» una treintena de
   * veces entre 181 y 190 nudos, y parecía un aviso que miraba la velocidad.
   * El registro de cantos, con el ángulo de ataque al lado, dijo lo contrario:
   * α 18,6° con la pérdida a 14,9° y 1,5 g — **pérdida de verdad**, a alta
   * velocidad, que es la que enseña que un ala entra en pérdida a cualquier
   * velocidad si se tira lo bastante. Y quien tiraba era este banco: la ley de
   * subida suma a la palanca de velocidad un empujón cuando no sube, hasta 0,5,
   * y en este avión cada décima de palanca son unos cuatro grados de ángulo.
   * Afinada con la avioneta, en un reactor es una orden de entrar en pérdida.
   *
   * Un piloto de verdad no vuela así: cede palanca antes de que suene el
   * avisador. Así que el mando se recorta aquí, en el único sitio por el que
   * pasa todo lo que el piloto pide, por encima del **sesenta y cinco por
   * ciento del ángulo de pérdida** —nueve grados y medio en el JAZ 90, lejos
   * del aviso, que suena a 12,7° limpio y a 11,1° con todo fuera— y del todo
   * si el avisador llegara a sonar. En la avioneta, que ya volaba lejos de
   * ahí, no cambia nada.
   *
   * **Y el recorte va acumulando, no es un muelle.** El primer intento
   * restaba palanca en proporción a lo que sobraba, y un recorte proporcional
   * se planta donde lo que sobra da justo la palanca que falta: el JAZ 90 se
   * quedó clavado en 12,8°, en el mismo umbral del avisador, y cantó «stall,
   * stall» treinta veces igual. Así se ceden unas centésimas cada fotograma
   * mientras sobre ángulo y se devuelven cuando no, que es lo que hace una
   * mano que nota la palanca: llega al ángulo y se queda en él.
   *
   * **Y ceder no es empujar.** La segunda versión dejaba bajar el tope hasta
   * palanca adelante y restaba en proporción a lo que sobraba: con 18° de
   * ángulo heredados, el tope se iba a −0,3 en cuatro fotogramas, el JAZ 90
   * picaba a 235 nudos y se metía en el mar desde seiscientos metros. Una
   * mano que cede suelta hasta el centro y no más, y a un ritmo que no pasa
   * de dos centésimas por fotograma.
   */
  /*
   * **Y el tope se mide contra el avisador, no contra la pérdida.** Con un
   * porcentaje del ángulo de pérdida no había número que valiera: el JAZ 90
   * limpio vuela el circuito a 8,8° —170 nudos, una g— y el avisador con
   * flaps suena a 11,1°, así que el setenta por ciento le prohibía virar y el
   * ochenta dejaba tirar por encima del aviso en final. El juego ya sabe a qué
   * ángulo suena ahora, con los flaps que lleve: dos grados menos que eso.
   *
   * **Y el tope se calcula, no se persigue.** Dos intentos de recortar
   * mirando el ángulo —en proporción y acumulando— llegaron siempre tarde:
   * con el reloj del banco acelerado, un ala de reactor a ciento noventa
   * nudos pasa del tope al aviso en cuatro fotogramas, y el recorte, al
   * soltar, dejaba al piloto del banco oscilar entre 0,02 y 0,30 de palanca y
   * cien «stall, stall». En este modelo la palanca manda ángulo de ataque: en
   * equilibrio `cm0 + cmα·α + cmδ·δ = 0`. Así que la palanca que deja el ala
   * dos grados por debajo del avisador se sabe de antemano, y de ahí no se
   * pasa: 0,20 en el JAZ 90 limpio, 0,16 con todo fuera.
   */
  const limitarElAngulo = (mandos) => {
    const s = o.estado();
    const p = o.avion?.()?.cabeceo;
    if (s.onGround || !p || !(s.stallWarningAlpha < 1)) return;
    const limite = s.stallWarningAlpha - 0.035;
    const tope = (-p.cmAlpha * limite - p.cm0) / p.cmElevator;
    mandos.elevator = Math.min(
      mandos.elevator,
      s.stallWarning ? 0 : Math.max(0, tope),
    );
  };
  /*
   * **El ala en el aire, cuatro veces por segundo de juego, si se pide.**
   * `OGA_TRAZA_ALA=fichero`.
   *
   * El registro de cantos dice el ángulo en el instante del «stall, stall»,
   * y con eso no se sabe si el avión iba al borde de la pérdida o si el aviso
   * saltó en una final normal: hace falta lo de antes y lo de después, y el
   * umbral al que sonaba el avisador **con los flaps que llevaba**. Se apunta
   * desde el mismo gancho por el que pilota el banco, así que lo que se lee
   * es lo que vio el modelo en ese fotograma.
   */
  const apuntarElAla = (mandos) => {
    const traza = globalThis.__trazaAla;
    if (!traza) return;
    const s = o.estado();
    if (s.onGround) return;
    const ahora = o.reloj();
    const ultima = traza[traza.length - 1];
    if (ultima && ahora - ultima.t < 0.25) return;
    traza.push({
      t: +ahora.toFixed(2),
      h: Math.round(s.heightAboveGround),
      v: +s.airspeed.toFixed(1),
      a: +s.alpha.toFixed(4),
      aw: +s.stallWarningAlpha.toFixed(4),
      w: s.stallWarning,
      st: s.stalled,
      n: +s.loadFactor.toFixed(2),
      f: +mandos.flaps.toFixed(2),
      e: +mandos.elevator.toFixed(3),
      g: +mandos.throttle.toFixed(2),
      vy: +s.velocity.y.toFixed(1),
      // Y la senda que vuela el automático, si la hay: lo que pide y lo que
      // lleva pedido. Ver `volarLaSenda`.
      sr: senda ? +senda.ritmo.toFixed(2) : null,
      mr: memoriaDeSenda ? +memoriaDeSenda.ritmo.toFixed(2) : null,
      // Y dónde: cuánto falta para el umbral, del eje, y si se recoge.
      ...(() => {
        try {
          return {
            u: Math.round(alUmbral(s)),
            x: Math.round(desvio(s)),
            et: etapa,
            rc: recogida ? 1 : 0,
          };
        } catch {
          return {};
        }
      })(),
    });
  };
  /*
   * **Y la senda de un reactor, con el morro del piloto automático del
   * juego**, fotograma a fotograma.
   *
   * La ley de altura de este banco manda palanca en proporción al ritmo de
   * bajada que falta, y se afinó con avionetas. Volando la final de un
   * reactor a su Vref de verdad —ver `quiere` en la final— se descubrió lo
   * que tapaba ir despacio: el morro del JAZ 90 responde en un período de
   * cinco segundos y apenas amortiguado, y esa ley lo lleva de −0,3 a +0,15
   * de palanca cada cuatro segundos, con el ángulo de ataque de −9° a +11° y
   * la carga de 0,4 a 1,7 g. Medido con la traza del ala. Antes no se veía
   * porque a 0,91 de la Vref el suelo de velocidad le prohibía tirar casi
   * siempre, y eso hacía de amortiguador — a costa de ir al borde del
   * avisador.
   *
   * Un piloto de reactor no vuela así la final: la vuela con el automático
   * enganchado hasta los mínimos, o a mano con cambios de actitud de un
   * grado. El juego tiene uno con los topes de uno de verdad —carga, giro del
   * morro y alabeo; ver `flight/piloto-automatico.ts`— y se usa aquí tal
   * cual, en el gancho de cada fotograma: a diez veces por segundo su lazo de
   * cabeceo oscila con el reactor, y a sesenta va suave. El gas sigue siendo
   * el de este banco.
   */
  const { mandosPara, memoriaNueva } = await import(
    "/src/flight/piloto-automatico.ts"
  );
  /** La senda que vuela el automático: altitud, su ritmo y desde cuándo. */
  let senda = null;
  let memoriaDeSenda = null;
  let relojDeSenda = null;
  const volarLaSenda = (mandos) => {
    const s = o.estado();
    if (!senda || s.onGround) {
      memoriaDeSenda = null;
      relojDeSenda = null;
      return;
    }
    const ahora = o.reloj();
    const dt =
      relojDeSenda === null
        ? 1 / 60
        : Math.max(1 / 240, Math.min(0.1, ahora - relojDeSenda));
    relojDeSenda = ahora;
    const engancha = memoriaDeSenda === null;
    if (engancha) memoriaDeSenda = memoriaNueva();
    const actitud = o.actitud();
    const r = mandosPara(
      {
        heading: s.heading,
        alabeo: actitud.alabeo,
        cabeceo: actitud.cabeceo,
        altitud: s.position.y,
        vertical: s.velocity.y,
        velocidad: (o.velocidadDeCabina?.() ?? 0) / 1.94384,
        gas: mandos.throttle,
        verdadera: s.airspeed,
        ritmoDeCabeceo: s.pitchRate,
        // Lo que lleva la palanca al engancharlo, para no dar un tirón.
        timon: engancha ? mandos.elevator : undefined,
      },
      {
        rumbo: null,
        altitud: senda.altitud + senda.ritmo * (ahora - senda.desde),
        ritmo: senda.ritmo,
        velocidad: null,
      },
      dt,
      memoriaDeSenda,
    );
    mandos.elevator = r.elevator;
  };
  /*
   * **La recogida, fotograma a fotograma**, en el mismo gancho que el
   * automático y por lo mismo: a diez veces por segundo un lazo de cabeceo
   * de reactor oscila, y la recogida dura tres o cuatro segundos. Ver
   * `RITMO_AL_TOCAR`.
   *
   * Se manda el ritmo de bajada que toca a esta altura con la palanca, desde
   * la que llevaba al empezar —que es la de la senda, con su compensación y
   * sus flaps—, con un término proporcional y uno que acumula. En el modelo
   * completo las ganancias van en ángulo de ataque y se pasan a palanca con
   * el propio cabeceo del avión, `−cmα/cmδ`: la misma recogida pide lo mismo
   * al ala de la avioneta que a la del JAZ 120. El tope de ángulo de
   * `limitarElAngulo` sigue mandando después.
   */
  let recogida = null;
  /**
   * Lo último que bajaba en el aire, m/s: por si el juego no dice a qué se
   * tocó. Aquí y no con los demás porque lo escribe el gancho, que empieza a
   * correr en cuanto se engancha.
   */
  let ultimaCaida = 0;
  const recoger = (mandos) => {
    if (!recogida) return;
    const s = o.estado();
    if (s.onGround) return;
    const ahora = o.reloj();
    const dt = Math.max(1 / 240, Math.min(0.1, ahora - recogida.ultimo));
    recogida.ultimo = ahora;
    const ruedas = alto(s) - (suyas.tren ?? 0);
    const queda = Math.max(0, Math.min(1, ruedas / recogida.altura));
    const pide = -(RITMO_AL_TOCAR + (recogida.caida - RITMO_AL_TOCAR) * queda);
    /*
     * Y en el último metro y medio no se empuja: si baja menos de lo pedido,
     * se deja que se pose. Empujando ahí, el JAZ 60 pasó de bajar a 0,6 a
     * tocar a 2,3 — lo que se ganó recogiendo se perdió en el último palmo.
     */
    const falta =
      ruedas < 1.5
        ? Math.max(0, pide - s.verticalSpeed)
        : pide - s.verticalSpeed;
    /*
     * **Y lo que acumula, solo hacia arriba.** Con el gas fuera la velocidad
     * cae, y a menos velocidad hace falta más ángulo para la misma
     * sustentación: eso es lo que cubre el acumulado, y va siempre en el
     * mismo sentido. Dejándolo bajar, en cuanto la recogida se pasaba un poco
     * —el ala responde con medio segundo de retraso— acumulaba empujar, y el
     * JAZ 90 pasó de bajar a 1,2 a tocar a 5,3 empujando la palanca.
     */
    recogida.acumulado = Math.max(
      0,
      Math.min(2, recogida.acumulado + falta * dt),
    );
    /*
     * En el modelo completo, tres centésimas y media de radián de ángulo —dos
     * grados— por cada metro por segundo que falte y dos que acumulan,
     * pasadas a palanca con el cabeceo del avión y amortiguadas con el giro
     * del morro. Con dos, el JAZ 90 tardaba casi dos segundos en cambiar de
     * ritmo y tocaba sin haber recogido; con cuatro sin amortiguar y la ayuda
     * del compensador metida por medio —ver `mandos.automatico`—, se pasaba;
     * con cuatro y media, el JAZ 60 volvía a tocar a 2,4 donde con tres y
     * media tocaba a 1,1.
     */
    /*
     * Y en Guyrami, más: ahí la palanca no mueve un ala sino el ritmo de
     * subida, a través de medio segundo de retraso y a medias con el gas. Con
     * las ocho centésimas del principio el JAZ 90 pasaba de −4,3 a −2,3 y
     * tocaba así.
     */
    const kp = recogida.porAngulo ? recogida.porAngulo * 0.035 : 0.2;
    const ki = recogida.porAngulo ? recogida.porAngulo * 0.02 : 0.1;
    /*
     * **Y lo que pide la velocidad que se pierde**, por delante y no por
     * error. Con el gas fuera el avión frena, y la misma sustentación a menos
     * velocidad pide más ángulo. Sin esto, el JAZ 60 recogía de 3,3 a 2,2 y se
     * quedaba ahí, frenando de 55 a 47 m/s mientras el lazo corría detrás;
     * con la cuenta entera —un cuarto de radián por cada vez que el cuadrado
     * de la velocidad se queda en la mitad— se nivelaba a cuatro metros y
     * flotaba seiscientos. Una décima: la mitad del ángulo lo pone esto y la
     * otra mitad el lazo, que es quien sabe cuánto falta.
     */
    const porLoQueFrena = recogida.porAngulo
      ? recogida.porAngulo *
        0.1 *
        Math.min(
          0.6,
          Math.max(0, (recogida.velocidad / Math.max(1, s.airspeed)) ** 2 - 1),
        )
      : 0;
    /*
     * **Y amortiguado con el giro del morro**, que es lo que hace una mano:
     * el ala tarda casi un segundo en dar lo que se le pide, y sin esto el
     * lazo tiraba, se pasaba y empujaba —medido con el JAZ 60: de −4,8 a −0,2
     * y de vuelta a −2,5 en dos segundos—. Cuatro décimas de segundo de giro
     * del morro, pasadas a palanca como lo demás.
     */
    const kq = recogida.porAngulo ? recogida.porAngulo * 0.4 : 0;
    mandos.elevator = Math.max(
      -0.6,
      Math.min(
        0.8,
        recogida.palanca +
          porLoQueFrena +
          kp * falta +
          ki * recogida.acumulado -
          kq * (s.pitchRate ?? 0),
      ),
    );
    if (!SENCILLO) mandos.throttle = 0;
  };
  /**
   * La palanca media de los últimos segundos de la final, que es la que
   * sostiene la senda: al empezar la recogida el morro puede ir en mitad de
   * una corrección, y partir de la palanca de ese instante es partir de un
   * tirón. Ver `recoger`.
   */
  let palancaMedia = null;
  let relojDeLaMedia = null;
  o.pilotar((mandos) => {
    Object.assign(mandos, c);
    volarLaSenda(mandos);
    recoger(mandos);
    /*
     * **Y con la senda o la recogida, las manos en los mandos.** Las ayudas
     * del peldaño que imitan a un piloto —el compensador que sostiene la
     * subida, el nivelador de alas— entran cuando la palanca pasa cerca del
     * centro, que es como el juego sabe que se ha soltado. Este piloto la
     * lleva ahí a menudo sin soltarla, y cada vez que cruzaba las ocho
     * centésimas entraba la otra mano con su ley: en Tukã, con el compensador
     * entero, el JAZ 60 oscilaba entre 0,2 y 2 g en la final y no llegaba a
     * bajar; en Taguató, la recogida del JAZ 90 subía el morro seis grados con
     * tres centésimas de palanca, se pasaba y tocaba a cuatro metros por
     * segundo. Es lo mismo que ya le pasó al automático del juego, y se arregla
     * igual: diciendo quién lleva los mandos. Ver `ControlInputs.automatico`.
     */
    mandos.automatico = senda !== null || recogida !== null;
    if (!recogida && senda !== null) {
      const ahora = o.reloj();
      const dt =
        relojDeLaMedia === null ? 0 : Math.max(0, Math.min(0.1, ahora - relojDeLaMedia));
      relojDeLaMedia = ahora;
      palancaMedia =
        palancaMedia === null
          ? mandos.elevator
          : palancaMedia + (mandos.elevator - palancaMedia) * Math.min(1, dt / 2);
    }
    {
      const e = o.estado();
      if (!e.onGround) ultimaCaida = -e.verticalSpeed;
    }
    limitarElAngulo(mandos);
    apuntarElAla(mandos);
  });
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
   * **Y lo que mide el arco a esta velocidad**, si es más: el radio de un
   * viraje de veinticinco grados, `v²/(g·tan 25°)`.
   *
   * Los trescientos metros son el arco de la avioneta. A noventa y cinco
   * metros por segundo el radio es de dos kilómetros: el JAZ 90 empezaba a
   * virar de la base a la final trescientos metros antes del eje y se abría
   * **mil ochocientos metros** al otro lado, en Los Rodeos, alineando a dos
   * kilómetros y medio del umbral. Anticipar el viraje lo que mide el arco es
   * lo que hace que se salga de él sobre el eje.
   *
   * Solo en los dos virajes que llevan a la final, con los treinta grados de
   * ahí: aplicado a todos, el del JAZ 90 se comía la base entera y entraba
   * en final desde el viento en cola.
   */
  const margenDeViraje = (s, tramo) =>
    tramo >= 3
      ? Math.max(
          MARGEN_DE_VIRAJE,
          (s.airspeed * s.airspeed) /
            (9.81 * Math.tan(TOPE_DE_INCLINACION_EN_LA_BASE)),
        )
      : MARGEN_DE_VIRAJE;
  /**
   * Lo que queda de camino por el circuito hasta el punto de toma, m: hasta
   * el vértice al que se va, los tramos que faltan y la final entera.
   */
  const queQuedaHastaTocar = (s, v, desde) => {
    let d = Math.hypot(v[desde].x - s.position.x, v[desde].z - s.position.z);
    for (let k = desde; k < v.length - 1; k++)
      d += Math.hypot(v[k + 1].x - v[k].x, v[k + 1].z - v[k].z);
    const u = finalAhora(0);
    const r = pistaAhora();
    const entrada = v[v.length - 1];
    if (u && entrada)
      d +=
        Math.hypot(entrada.x - u.x, entrada.z - u.z) +
        Math.min(250, (r.length - (r.desplazado ?? 0)) * 0.2);
    return d;
  };

  /**
   * Los vértices del circuito que dibuja el juego, en coordenadas de mundo.
   *
   * Se piden una vez **por pista** y se guardan: pedirlos por fotograma es
   * cruzar la frontera con el juego cientos de veces para nada.
   *
   * **Y por pista, no una vez por vuelo.** Se pedían una sola vez, y la
   * primera era en casa: llegando a La Gomera con el JAZ 60, el AFIS mandó al
   * aire por un tráfico en la pista, el piloto subió por el eje y a ciento
   * cincuenta metros giró hacia el final de la subida **del circuito de Los
   * Rodeos**, a noventa kilómetros. Novecientos segundos derecho hacia
   * Tenerife y contra la ladera del oeste a 1.190 m: el «too low» ×3 y el
   * percance del banco 33/57 eran esto, no el circuito de La Gomera, que va
   * por el sur, sobre el mar. Cambia la pista —otro campo u otra cabecera por
   * el viento— y se vuelve a pedir.
   */
  let vertices;
  let verticesDe = "";
  const circuito = () => {
    const r = pistaAhora();
    const de = r ? `${Math.round(r.x)},${Math.round(r.z)},${Math.round(r.heading)}` : "";
    if (vertices === undefined || de !== verticesDe) {
      verticesDe = de;
      vertices = alargarElVientoEnCola(o.circuito?.() ?? null);
    }
    return vertices;
  };
  /**
   * **Y el viento en cola, alargado lo que haga falta para llegar a la
   * puerta ya alineado**, como alarga cualquier piloto que va justo.
   *
   * La entrada en final del circuito que dibuja el juego está en la senda,
   * a mil ochocientos metros del umbral en la avioneta —noventa y cuatro de
   * altura— y a tres kilómetros y medio en el JAZ 90. En la avioneta eso es
   * salir del viraje a trescientos pies, por debajo de la puerta de los
   * quinientos —ver `PUERTA_BAJA`—, y en el JAZ 60 salir a los quinientos
   * justos: ni uno ni otro pueden llegar a ella estabilizados, porque llegan
   * virando. Un piloto de verdad no baja a la puerta virando: se abre en el
   * viento en cola hasta tener una final en la que quepan unos segundos
   * derecho antes de la puerta.
   *
   * Diez segundos a la de la base más el viraje, y como mucho un kilómetro
   * más: el circuito del juego se sigue viendo y se sigue volando, solo más
   * largo por detrás, que es lo que dice el controlador cuando pide «alargue
   * el viento en cola».
   */
  function alargarElVientoEnCola(v) {
    if (!v || v.length < 5) return v;
    const [a, b] = v;
    const largo = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const fx = (b.x - a.x) / largo;
    const fz = (b.z - a.z) / largo;
    const u = finalAhora(0);
    const r = pistaAhora();
    if (!u) return v;
    const entrada = Math.hypot(v[4].x - u.x, v[4].z - u.z);
    const toma = Math.min(250, (r.length - (r.desplazado ?? 0)) * 0.2);
    const hastaLaPuerta = PUERTA_BAJA / SENDA - toma;
    // Y el viraje a final entero: se sale de él un radio más cerca.
    const radio =
      (DE_BASE * DE_BASE) / (9.81 * Math.tan(TOPE_DE_INCLINACION_EN_LA_BASE));
    const hace = hastaLaPuerta + 10 * DE_BASE + radio - entrada;
    const mas = Math.max(0, Math.min(1000, hace));
    if (mas <= 0) return v;
    const atras = (p) => ({ ...p, x: p.x - fx * mas, z: p.z - fz * mas });
    return [
      v[0],
      v[1],
      v[2],
      atras(v[3]),
      { ...atras(v[4]), y: v[4].y + mas * SENDA },
    ];
  }

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
   *
   * **Y en los seis, no solo en los reactores.** Esto era solo para los
   * rápidos, porque con flaps la avioneta y el turbohélice «se quedaban
   * flotando en final hasta agotar el tiempo». No era por los flaps: era la
   * ley de altura, que pedía llegar al suelo en una exponencial y no llegaba
   * nunca —ver `RITMO_AL_TOCAR`—. Sin flaps, el JAZ 60 volaba la final de
   * Los Rodeos a nueve décimas de su Vref con el ala limpia, o sea a un palmo
   * de su pérdida limpia, y el avisador sonaba en la final. Ningún piloto de
   * turbohélice aterriza sin flaps porque sí.
   */
  const configurar = (s, c, tramo, enFinal = false) => {
    if (s.onGround || LIMPIO) return;
    const kt = s.airspeed * 1.94384;
    if (suyas.trenRetractil) {
      if (tramo >= 2 && kt < (suyas.vleKt ?? 999)) o.pedirTren?.(true);
      else if (tramo < 2 && s.verticalSpeed > 1 && s.heightAboveGround > 30)
        o.pedirTren?.(false);
    }
    /*
     * **Los flaps, con la palanca y no escribiendo dónde están.** Escritos en
     * `controles()` a cada vuelta, el banco los teletransportaba: bajaban
     * del todo en un fotograma, cuando en el juego tardan lo que tardan en
     * su avión. Pidiéndolos por la palanca, este banco vuela el avión que
     * vuela quien juega. Ver `flight/flaps.ts`.
     */
    /*
     * **Y por muescas, como en cualquier avión**: la primera en el viento en
     * cola y la base, y las de aterrizaje en final. Todo abajo desde el viento
     * en cola era la resistencia del aterrizaje volando el circuito: el JAZ 60
     * no llegaba a su velocidad de circuito ni con nueve décimas de gas, y en
     * el aire que sube de Los Rodeos se quedaba subiendo con la palanca
     * adelante.
     */
    const primera = suyas.vfePorMuesca?.[0] ?? suyas.vfeKt ?? 999;
    o.pedirFlaps?.(
      (enFinal || tramo >= 4) && kt < (suyas.vfeKt ?? 999)
        ? 1
        : tramo >= 3 && kt < primera
          ? 1 / 3
          : 0,
    );
  };

  /**
   * La velocidad a la que toca ir en el circuito, m/s.
   *
   * **La de circuito, de la primera esquina a la última.** Un reactor no se
   * puede frenar bajando: hay que llegar a final ya lento, y para eso no hay
   * que haberse acelerado antes.
   *
   * Hasta la esquina de allá se iba a la de crucero con el tope de los 250
   * nudos —y desde ahí a la de aproximación con un margen—, y un reactor a
   * 250 nudos no vuela un circuito: vira con tres
   * kilómetros de radio. Medido en Los Rodeos con el JAZ 90 —el banco que
   * pedía este cambio—: subía con el gas a fondo, llegaba al viento en cola a
   * ciento veintidós metros por segundo, ya con el gas cortado y sin poder
   * frenar —un reactor limpio no frena, y por encima de su `vfeKt` no hay
   * flaps que sacar—, se abría en el viraje por encima de las estribaciones
   * de Anaga y tocaba terreno a ciento dieciséis.
   *
   * Lo que hace un piloto de verdad es no acelerar de más: de la subida al
   * circuito, a la de circuito de su ficha, que es la de maniobra con los
   * flaps del viento en cola. Ver `velocidadDeCircuito` en `aircraft.ts`.
   *
   * **Y las hélices, desde el viento en cola.** Lo de los reactores iba
   * solo para ellos, y las hélices volaban el circuito entero a su crucero:
   * el JAZ 60 a noventa metros por segundo, ciento setenta y cinco nudos, con
   * una Vref de cuarenta y ocho. Con ese radio la base se le quedaba corta y
   * entraba en final cruzando el eje: en Los Rodeos, con Tukã, alineaba tarde
   * y tocaba a catorce metros del eje. En el viento en cola se frena, como
   * en cualquier avión, y la subida y el primer tramo siguen como estaban.
   *
   * **Y se frena a la de la base, no a la de circuito**: la Vref más quince
   * nudos, o la de circuito si es menos. Es lo que cabe en los virajes que
   * quedan —ver `TOPE_DE_INCLINACION_EN_LA_BASE`— y es la de base de
   * cualquier manual: primera muesca de flaps, y en final las de aterrizar.
   */
  const DE_CIRCUITO = suyas.circuito ?? (suyas.aproximacion ?? 40) * 1.3;
  const DE_BASE = Math.min(
    DE_CIRCUITO,
    (suyas.aproximacion ?? 33) + 15 * 0.514444,
  );
  const velocidadDelTramo = (tramo = 1) =>
    tramo >= 3
      ? Math.min(VELOCIDAD_DE_CRUCERO, DE_BASE)
      : NECESITA_TECNICA
        ? Math.min(VELOCIDAD_DE_CRUCERO, DE_CIRCUITO)
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
  /**
   * **Y lo que se aprendió de la pérdida, solo en el modelo completo.**
   *
   * Llegar a la final configurado y a la Vref en indicada, llevar la senda y
   * la altura del circuito con el automático, quitar el gas a cincuenta pies
   * y bajar el morro al tocar: todo eso sale de volar un reactor con sus
   * coeficientes, donde está la pérdida y donde el morro tarda. El modelo
   * sencillo de Guyrami no tiene ni lo uno ni lo otro —el gas es la
   * velocidad—, y el automático del juego, pensado para el completo, lo
   * llevaba bajo y rápido a la final de Los Rodeos: el JAZ 120 tocaba antes
   * del umbral y se salía (43 de 43 en main, 35 de 43 con esto puesto
   * también ahí). En Guyrami el piloto del banco vuela como volaba.
   */
  const REACTOR_COMPLETO = NECESITA_TECNICA && peldano !== "guyrami";
  const ganancia = (s) =>
    Math.min(1, (AJUSTADO_HASTA / Math.max(1, s.airspeed)) ** 2);

  /**
   * **La verdadera que toca para volar una indicada, aquí y ahora**, m/s.
   *
   * El piloto del banco pilota con `airspeed`, que es la verdadera, y la
   * Vref de la ficha es **indicada**: es la que marca el anemómetro y la que
   * dice dónde está la pérdida. A nivel del mar son lo mismo; en Los Rodeos,
   * a seiscientos metros y con calor, la misma indicada es un cuatro por
   * ciento más de verdadera. Volando la Vref como verdadera, el JAZ 90 iba
   * allí por debajo de su Vref sin saberlo. La proporción se le pregunta al
   * propio anemómetro del juego.
   */
  const enVerdadera = (s, indicada) => {
    const nudos = o.velocidadDeCabina?.() ?? 0;
    return nudos > 20 ? (indicada * s.airspeed) / (nudos / 1.94384) : indicada;
  };
  /**
   * **Lo que se suma a la Vref para volar la final**, m/s: cinco nudos.
   *
   * La velocidad de aproximación de un reactor es la Vref más un margen —el
   * mínimo de cinco nudos, más con viento racheado— y se cruza el umbral a
   * la Vref. Es el colchón que hace que una racha no deje al avión debajo de
   * su Vref, que ya está a un treinta por ciento de la pérdida.
   */
  const ADITIVO_DE_FINAL = 5 * 0.514444;
  /**
   * **La recogida**, que este piloto no hacía: el último tramo de la toma, de
   * la senda al suelo.
   *
   * Lo que había eran dos formas de no hacerla. En los reactores del modelo
   * completo, gas fuera a quince metros —el *retard*— y ni un grado de
   * morro: se tocaba bajando a unos **cuatro metros por segundo**, la senda
   * entera hasta el asfalto. Se había probado a pedirle al automático que
   * bajara cada vez más despacio y no llegaba: gira la trayectoria a una
   * décima de g, con un morro que tarda cinco segundos. En los demás, la ley
   * de altura pedía llegar a cero sobre la pista con un ritmo proporcional a
   * lo que faltaba, y eso es una exponencial: **no llega nunca**. El avión se
   * quedaba a un metro flotando y tocaba cuando se le acababa la velocidad.
   * Medido: unos ochocientos metros pasado el umbral en Pilar y Ayolas, y dos
   * mil en Guaraní con el JAZ 90.
   *
   * Un piloto de verdad hace otra cosa, y es lo que hace esto: a una altura
   * que depende de lo deprisa que baja —tres segundos de senda, que en la
   * avioneta son seis metros y en el JAZ 90 trece—, quita el gas y
   * va levantando el morro para que **el ritmo de bajada se reparta en la
   * altura que queda**: la senda arriba y metro y pico por segundo al tocar.
   * Pedido así —el ritmo en proporción a la altura, más un resto que no se
   * acaba— el suelo llega en un tiempo contado, no en una exponencial.
   */
  const RITMO_AL_TOCAR = 1.2;
  /** Cuántos segundos de senda antes del suelo empieza la recogida. */
  const SEGUNDOS_DE_RECOGIDA = 3.2;
  /**
   * **El modelo sencillo va aparte**, porque ahí el gas es la velocidad y no
   * hay ala que pierda: quitar el gas en la recogida es tirarse al suelo a la
   * caída sin motor. En Guyrami la recogida es solo de morro, con el gas
   * llevando la velocidad como toda la final.
   */
  const SENCILLO = peldano === "guyrami";
  /**
   * **Y la senda, con el morro del automático en todo el modelo completo**,
   * no solo en los reactores.
   *
   * La ley de altura de este banco manda palanca en proporción al ritmo que
   * falta, sin amortiguar, y con las hélices se aguantaba porque volaban la
   * final limpias y a nueve décimas de la Vref, con el suelo de velocidad
   * prohibiéndoles tirar casi siempre. Configuradas y a la Vref más cinco,
   * esa ley hace lo mismo que hacía con el JAZ 90: medido con la traza del
   * ala, el JAZ 60 en Los Rodeos iba de −8° a +10° de ángulo cada ocho
   * segundos. Del viento en cola en adelante vuela la altura y la senda el
   * automático del juego, con sus topes, como en los reactores; subiendo y
   * en el primer tramo, lo de siempre. En Guyrami no: ver `REACTOR_COMPLETO`.
   */
  const CON_EL_AUTOMATICO = !SENCILLO;
  /**
   * **Y en Guyrami, las hélices aterrizan limpias**, a nueve décimas de su
   * Vref, como volaban.
   *
   * El modelo sencillo no tiene ala: el gas es la velocidad, y los flaps y
   * el tren la recortan —ver `FRENAN_LOS_FLAPS` en `arcade.ts`—. Con los de
   * aterrizaje y el tren fuera, el JAZ 60 no pasaba de 35 m/s **con el gas a
   * fondo**, trece por debajo de su Vref, y a fondo el modelo sube solo:
   * voló la final de Pilar entera a nivel, cruzó la pista a doscientos treinta
   * metros y se fue al aire. En ese modelo no hay pérdida que guardar, y lo
   * que baja a la senda es el gas por debajo de la mitad: la velocidad de la
   * final la pone el modelo, no la tarjeta. Los reactores sí se configuran,
   * que con su margen de crucero les cabe.
   */
  const LIMPIO = SENCILLO && !NECESITA_TECNICA;
  /**
   * **Y en Guyrami, la senda con el morro y sin tope de ala.**
   *
   * En el modelo sencillo el gas es la velocidad: por encima de la mitad
   * larga sube solo y por debajo baja, y el morro suma o resta a eso. A la Vref
   * más cinco con flaps, el gas que la sostiene está justo en el punto en el
   * que el avión ni sube ni baja, así que la senda la tiene que llevar entera
   * el morro. La ley de altura de arriba no llega: su palanca va acotada a
   * tres décimas por la pérdida —que aquí no hay— y es proporcional, así que
   * se planta con un error. Medido en Guaraní con el JAZ 90: bajando a metro
   * y medio por segundo donde la senda pide cuatro, cruzó el umbral a
   * doscientos cuarenta metros y se fue al aire.
   *
   * Aquí se pide el ritmo de la senda más lo que falta de altura, y la
   * palanca lo busca con un término proporcional y uno que acumula.
   */
  let sendaSencilla = 0;
  const porLaSendaSencilla = (s, objetivo, dt) => {
    const quiere = Math.max(
      -CAIDA_MAXIMA,
      Math.min(3, -porElSuelo(s) * SENDA + (objetivo - alto(s)) * 0.15),
    );
    const falta = quiere - s.verticalSpeed;
    // Con sitio para llegar a toda la palanca: con ocho, el acumulado se
    // plantaba en −0,36 y el JAZ 90 bajaba a tres donde la senda pide cuatro.
    sendaSencilla = Math.max(-25, Math.min(25, sendaSencilla + falta * dt));
    return Math.max(-0.8, Math.min(0.8, falta * 0.06 + sendaSencilla * 0.03));
  };

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
  let rumboDeSalida = porDelante()?.h ?? rumboPista;

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
  /**
   * **Y treinta en los virajes de la base y la final**, que es el tope de un
   * circuito de línea.
   *
   * El circuito del juego se estira con la velocidad de aproximación —el
   * doble en el JAZ 90—, pero el radio de un viraje crece con su cuadrado:
   * a ochenta y siete metros por segundo y veinticinco grados son mil
   * seiscientos ochenta metros, y los dos virajes del viento en cola a la
   * final piden el doble que eso de separación, donde el circuito del JAZ 90
   * tiene dos kilómetros. Se salía de la final un kilómetro y ochocientos
   * metros por el otro lado. Con la base a la Vref más quince nudos —ver
   * `velocidadDelTramo`— y treinta grados, los dos virajes caben.
   */
  const TOPE_DE_INCLINACION_EN_LA_BASE = (30 * Math.PI) / 180;
  let topeDeInclinacion = TOPE_DE_INCLINACION;
  const alRumbo = (s, rumbo) => {
    const e = error(rumbo, s.heading);
    /*
     * En tierra el alerón es la rueda de morro. Con ganancia 2 y el mando
     * entero, la corrección se pasa y la siguiente se pasa al otro lado: el
     * avión se iba del asfalto rodando. Con 1,2 llega y se queda.
     */
    if (s.onGround) return Math.max(-1, Math.min(1, e * 1.2));
    const quiere = Math.max(
      -topeDeInclinacion,
      Math.min(topeDeInclinacion, e * 1.5),
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
  /*
   * **Y el umbral es el de aterrizar**, que con el umbral desplazado está
   * pista adentro: en la 01 de Fuerteventura, mil metros. Contado desde la
   * punta, este piloto volaba la senda a la punta y tocaba a ciento cincuenta
   * metros de ella, en la zona de las flechas, y el parte decía «152 m pasado
   * el umbral» como si fuera un aterrizaje de libro. Ver `umbral-desplazado.ts`.
   */
  const alUmbral = (s) => {
    const r = pistaAhora();
    const hp = (r.heading * Math.PI) / 180;
    const along =
      (s.position.x - r.x) * Math.sin(hp) +
      (s.position.z - r.z) * -Math.cos(hp);
    return -r.length / 2 + (r.desplazado ?? 0) - along;
  };

  /**
   * **El punto del plan a `desde` metros del umbral, contados por la ruta**,
   * si ahí la ruta todavía no va por el eje: con su rumbo y los puntos que
   * quedan antes de la final recta. `null` si a esa distancia ya es recta, que
   * es lo de casi todas las aproximaciones.
   *
   * El eje es el del último tramo del plan, el que acaba en el umbral: ciento
   * cincuenta metros de él a cada lado es estar en él.
   */
  function porLaRutaDeLlegada(plan, u, desde) {
    const fijos = plan?.fijos ?? [];
    const n = fijos.length;
    if (n < 3) return null;
    const ultimo = fijos[n - 1];
    const antes = fijos[n - 2];
    const ex = ultimo.x - antes.x;
    const ez = ultimo.z - antes.z;
    const el = Math.hypot(ex, ez) || 1;
    let falta = desde;
    for (let i = n - 1; i > 0; i--) {
      const a = fijos[i - 1];
      const b = fijos[i];
      const l = Math.hypot(b.x - a.x, b.z - a.z);
      if (l < falta) {
        falta -= l;
        continue;
      }
      const t = 1 - falta / (l || 1);
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      const deLado = Math.abs(((x - u.x) * ez - (z - u.z) * ex) / el);
      if (deLado < 150) return null;
      return {
        x,
        z,
        h: (Math.atan2(b.x - a.x, -(b.z - a.z)) + 2 * Math.PI) % (2 * Math.PI),
        fijos: fijos.slice(i, n - 1).map((f) => ({ x: f.x, z: f.z, nombre: f.nombre })),
      };
    }
    return null;
  }

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
  /*
   * **Y se sigue la raya por donde se va, no por el trozo más cercano.**
   *
   * Esto buscaba el punto más cercano de **toda** la ruta, y el back-taxi se
   * pisa a sí mismo: se va por una raya apartada ocho metros del eje y se
   * vuelve por el eje. En cuanto el avión se arrimaba al eje a la ida, el
   * punto más cercano era de la vuelta, el de delante quedaba a la espalda y
   * el piloto daba media vuelta a trece metros por segundo en mitad de la
   * pista: medido en Lanzarote con el JAZ 90, fuera del asfalto a 468 m de la
   * cabecera. Quien sigue una raya pintada la sigue en orden; no salta a la
   * que va al lado en sentido contrario.
   *
   * Así que se busca cerca de donde se iba —un poco hacia atrás y treinta
   * metros de raya hacia delante— y solo si de ahí no queda nada a mano, en
   * toda la ruta.
   *
   * **Y por los metros de raya, no por sus puntos.** Se buscaba el punto
   * pintado más cercano y se apuntaba al primero que quedara más lejos que la
   * mirada, y la raya se trocea cada veinticinco metros: en la ida por la pista
   * hasta la media vuelta, el punto más cercano podía ser uno de la vuelta, a
   * siete metros de través, antes que uno de la ida a doce por delante. Y con
   * una ruta nueva se buscaba en toda ella. En Pilar, recién trazada la vuelta
   * por la pista, el piloto tomó la raya de vuelta por la suya y apuntó pista
   * atrás: media vuelta a diez metros por segundo y al pasto, a veintiocho
   * metros del eje, con la media vuelta dibujada cuarenta metros más allá.
   *
   * Es lo que hace el piloto perfecto de `vuelta-por-la-pista.test.ts`, que la
   * da entera sobre el asfalto: llevar la cuenta de por dónde va **a lo largo
   * de la raya**. Aquí, proyectando sobre cada tramo y no sobre sus puntos, una
   * ruta nueva se empieza por su principio —sale de donde está el avión—, y
   * se mira un punto de la raya los metros de la mirada **por delante en la
   * raya**, no a esa distancia en línea recta: la vuelta queda a siete metros
   * del avión y a veinte de raya.
   */
  let firmaDelTimon = "";
  let avanceDelTimon = 0;
  let largosDelTimon = [0];
  const timon = (s, ruta) => {
    if (ruta.length < 2) return 0;
    const ultimo = ruta[ruta.length - 1];
    const firma = `${ruta.length}:${ruta[0][0].toFixed(1)},${ruta[0][1].toFixed(1)}:${ultimo[0].toFixed(1)},${ultimo[1].toFixed(1)}`;
    if (firma !== firmaDelTimon) {
      firmaDelTimon = firma;
      largosDelTimon = [0];
      for (let i = 1; i < ruta.length; i++)
        largosDelTimon.push(
          largosDelTimon[i - 1] +
            Math.hypot(ruta[i][0] - ruta[i - 1][0], ruta[i][1] - ruta[i - 1][1]),
        );
      avanceDelTimon = 0;
    }
    const total = largosDelTimon[largosDelTimon.length - 1];
    /** El punto de la raya a tantos metros de su principio. */
    const aLos = (avance) => {
      for (let i = 0; i < ruta.length - 1; i++) {
        if (largosDelTimon[i + 1] < avance) continue;
        const l = largosDelTimon[i + 1] - largosDelTimon[i];
        const t = l > 0 ? Math.max(0, (avance - largosDelTimon[i]) / l) : 0;
        return [
          ruta[i][0] + (ruta[i + 1][0] - ruta[i][0]) * t,
          ruta[i][1] + (ruta[i + 1][1] - ruta[i][1]) * t,
        ];
      }
      return ultimo;
    };
    /** Lo más cerca que queda la raya entre dos avances, y en cuál. */
    const buscar = (desde, hasta) => {
      let mejor = Infinity;
      let avance = Math.max(0, desde);
      for (let i = 0; i < ruta.length - 1; i++) {
        const a0 = largosDelTimon[i];
        const a1 = largosDelTimon[i + 1];
        if (a1 < desde || a0 > hasta) continue;
        const l = a1 - a0;
        const [ax, az] = ruta[i];
        const [bx, bz] = ruta[i + 1];
        const u =
          l > 0
            ? ((s.position.x - ax) * (bx - ax) + (s.position.z - az) * (bz - az)) /
              (l * l)
            : 0;
        const aqui = Math.max(desde, Math.min(hasta, a0 + Math.max(0, Math.min(1, u)) * l));
        const t = l > 0 ? (aqui - a0) / l : 0;
        const d = Math.hypot(
          ax + (bx - ax) * t - s.position.x,
          az + (bz - az) * t - s.position.z,
        );
        if (d < mejor) {
          mejor = d;
          avance = aqui;
        }
      }
      return { mejor, avance };
    };
    let hallado = buscar(avanceDelTimon - 5, avanceDelTimon + 30);
    if (hallado.mejor > 25) hallado = buscar(0, total);
    avanceDelTimon = hallado.avance;
    const mira = aLos(Math.min(total, avanceDelTimon + miraDe(s, hallado.mejor)));
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

  /*
   * **Y en el circuito, un reactor lleva la altura con el automático**, por
   * lo mismo que la senda de la final: ver `volarLaSenda`.
   *
   * La ley de altura del banco también oscilaba en el circuito. Medido con
   * la traza del ala en Los Rodeos, con el JAZ 90 a ciento ochenta y cinco
   * nudos: la palanca de −0,27 a +0,20 cada once segundos, la altura de 224
   * a 620 m y la carga de −0,4 a 1,5 g, y en cada cresta el ala en el
   * avisador: cinco «stall, stall» limpios en el circuito.
   *
   * **Y subiendo también.** Se dejó primero la ley de subida, y dio un
   * «stall, stall» a 182 nudos y 1,39 g: esa ley pide la velocidad de subida
   * de la ficha —la de rotar más un quince por ciento— tirando de la palanca,
   * y el reactor ya iba más rápido, así que tiraba. El automático sube a su
   * ritmo, con sus topes de carga, y el gas de subida sigue llevando la
   * velocidad. Los primeros ciento veinte metros siguen por actitud, como en
   * `subirDeVerdad`: eso es asentar la subida, no circuito.
   */
  const sostenerLaAltura = (s, subiendo, altoQueToca, ritmo = 0, aMano = false) => {
    if (!REACTOR_COMPLETO && !aMano) return;
    if (subiendo && s.heightAboveGround < ASENTAR_LA_SUBIDA) return;
    senda = {
      altitud: s.position.y + (altoQueToca - alto(s)),
      // Bajando por la senda que queda, al ritmo de la senda. Ver `porLaSenda`.
      ritmo,
      desde: o.reloj(),
    };
  };

  // Doscientos metros y la entrada en final a dos kilómetros y medio: es un
  // circuito de verdad y es lo más corto que se puede volar sin que parezca
  // otra cosa. El banco tarda lo que tarda un vuelo, y hay que poder correrlo.
  const CRUCERO = 200;
  const SENDA = Math.tan((3 * Math.PI) / 180);
  /*
   * Las del crucero de `OGA_CRUCERO`, m sobre el campo: por encima de los
   * cuatrocientos en los que la comandante apaga el cartel, y abajo por debajo
   * de los mil de la aproximación y por encima de la final.
   */
  const ALTO_DE_CRUCERO = 750;
  const ALTO_DE_BAJADA = 320;
  /** Cuándo se llegó arriba en ese crucero, s de juego. */
  let cruceroDesde = null;

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
  /** Y lo mismo a la ida: lo rodado y lo trazado. Ver «el rodaje de ida». */
  let idaMetros = 0;
  let largoDeLaIda = 0;
  let antesIda = null;
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
  /** La seña que hacía al girar la llave. Ver la etapa «apagar». */
  alApagar: null,
  /** Y dónde estaba el avión entonces. Ver la etapa «apagar». */
  alApagarComo: null,
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
   * **Y cuánto rato guía la bici**, en un campo particular: visible, en la
   * raya y por delante del avión, con el avión ya fuera de la pista.
   *
   * Existe porque dejó de salir y nadie lo vio. Desde #157 esperaba al lado de
   * la salida, y esperar al lado contaba como haberse apartado para siempre:
   * iba por la hierba, a once metros de la raya, y todas las comprobaciones
   * del coche la daban por buena porque ninguna preguntaba si guiaba.
   */
  let biciGuiando = 0;
  let biciVista = 0;
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
  let cocheEnPistaDonde = "";
  /**
   * **Y el coche fotograma a fotograma, si se pide.** `OGA_TRAZA_COCHE=fichero`.
   *
   * «Lo más lejos, 677 m» y «15 m con los dos en pista» dicen que pasó y no
   * por qué: sin ver dónde iba el coche en su ruta, dónde iba el avión en la
   * suya y cuándo cambió la ruta, el porqué se adivina. Todo lo que se rueda,
   * de ida y de vuelta, cada tres muestras.
   */
  const trazaCoche = [];
  /**
   * **Y cómo estaban las ruedas cuando el juego dijo «aterrizado».**
   *
   * La máquina de fases daba el avión por aterrizado a doce metros del suelo,
   * y de ahí colgaba el «frená»: en El Hierro sonaba antes que «thirty»,
   * «twenty» y «ten». La comprobación de las voces lo veía de refilón —por el
   * orden de lo que sonó— y según qué boca estuviera ocupada pasaba o no.
   * Esto mira el hecho: la primera vez que la fase es «aterrizado», a cuánto
   * del suelo iban las ruedas.
   */
  let ruedasAlAterrizar = null;
  /** Lo más lejos que estuvo el coche **esperando** en la salida, m. */
  let lejosEsperando = 0;
  /**
   * **Y si el coche pisa la pista después de tocar, esté donde esté el avión.**
   *
   * La de «con los dos en pista» solo miraba con el avión rodando despacio y
   * encima del asfalto, y el coche se colaba por los huecos: en Guaraní
   * bajaba la pista delante del avión justo cuando éste la pisaba medio
   * segundo después de dar la vuelta. Un sígame no entra en la pista en la
   * que se acaba de aterrizar, nunca.
   */
  let cochePisaLaPista = null;
  /**
   * **Y quién está en el puesto cuando se llega**: la bici, si es un campo
   * particular. Se mira la primera vez que la fase dice «en el puesto».
   */
  let quienRecibe = null;
  /** Y lo cerca que estuvo con solo el avión en pista, para el parte. */
  let cocheCercaEnPista = Infinity;
  /*
   * **Y a qué altura va el coche**, sobre lo que pisa. Llegando a Asunción
   * desde Concepción y desde Encarnación se le vio a unos treinta y cinco
   * metros sobre la pista: un coche en el aire guía igual de bien según el
   * banco —que solo miraba distancias en el plano— y no guía nada según quien
   * juega.
   */
  let cocheEnElAire = 0;
  let cocheEnElAireDonde = "";
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
   * Se cuenta **cuándo salta**, no cuánto dura. Lo que no puede pasar es que
   * salte con la fase en «final»: eso es no reconocer la final. (Este piloto
   * deja el variómetro en cero a ratos, y hasta que la fase dejó de salirse
   * al nivelarse —ver `SUBIDA_QUE_SACA_DE_FINAL` en `vuelo.ts`— eso la
   * sacaba de «final» un segundo cada vez.)
   */
  let terrenoEnFinalAlli = 0;
  let terrenoAntes = null;
  /**
   * El tráfico que se vio allí, muestreado mientras se estuvo allí.
   *
   * Se miraba una sola vez, al final, y con nadie en el circuito en ese
   * instante la comprobación pasaba sola: «lo más lejos» de una lista vacía
   * era cero. Ver «y el tráfico que se oye vuela allí».
   */
  let traficoVistoAlli = 0;
  let traficoMasLejosAlli = 0;
  /**
   * **La pista que es tuya, de nadie más**, mientras lo es.
   *
   * Dos cosas: que ningún avión de la frecuencia la **tenga** —alineado o
   * autorizado a aterrizar— y que no se **oiga** a la torre dándosela a otro
   * después de habértela dado a vos. Lo segundo se oía en Pettirossi y en
   * Gando: tu «cleared to land» y seis segundos después un «line up and wait»
   * a otro, que esperaba turno en la boca desde antes. Ver
   * `quitarleLaPistaALosDemas` en `game.ts`.
   */
  const PISTA_TUYA = new Set([
    "autorizado",
    "alineando",
    "back-taxi",
    "despegando",
    "comprometido",
    "final",
    "aterrizado",
    "abandonando",
  ]);
  let pistaDeOtros = 0;
  let pistaDeOtrosDonde = null;
  const dadaAOtroTrasLaTuya = [];
  /**
   * **Y lo que se le dio a otro antes, sin anular de viva voz.**
   *
   * Lo de arriba solo miraba lo oído después de tu autorización, y el
   * modelo, que ya estaba limpio. Lo que se oía era esto: «Echo Charlie Golf
   * Papa Golf, cleared to land», y detrás el tuyo por la misma pista, sin
   * ningún «go around» entre medias: con la boca ocupada, la orden que lo
   * mandaba al aire pasaba callada. Se lleva la cuenta de lo oído —a quién
   * se le dio la pista y a quién se le quitó— y al sonar lo tuyo no puede
   * quedar nadie con ella.
   */
  const conPermisoOido = new Map();
  const sinAnularAlDartela = [];
  /**
   * Cuántas frases se habían dicho en la muestra anterior. La lista de
   * `habladas` tiene tope y en un vuelo largo se llena: mirando lo nuevo por
   * su largo, a partir de ahí no se veía nada. Ver `habladasTotal`.
   */
  let habladasVistas = 0;
  /** Cuántas veces la torre te mandó al aire por la pista ocupada, y se fue. */
  let frustradasPorLaPista = 0;
  /** Y cuántas se fue porque el juego ya había dado la frustrada. */
  let frustradasPorElJuego = 0;
  let yaTeLaDieron = false;
  /**
   * **Tus autorizaciones para aterrizar, con la fase en que sonaron.** Nada
   * exigía que sonara la tuya: la comprobación de la pista de allí pasaba con
   * cero autorizaciones. Y la torre te decía «cleared to land» en pleno
   * ascenso de una frustrada, al dejar libre la pista el de delante. Tienen
   * que sonar, y en final.
   */
  const tusAutorizaciones = [];
  /**
   * **Y las esperas en la roja por alguien**, con lo que se dijo del porqué:
   * la roja podía durar tres minutos con un «hold short» a secas.
   */
  let esperandoPorAlguien = null;
  let porQueSeDijo = null;
  /**
   * **Y lo que dura la roja**, en segundos de juego: la más larga del vuelo.
   *
   * «Me tiene esperando por ese avión un buen rato. ¿Me dejará salir?» La
   * roja duraba hasta tres minutos y medio, y tras volver a empezar no se
   * apagaba nunca. Aquí se mide lo que se está en «esperando» de un tirón.
   */
  let rojaDesde = null;
  let rojaMasLarga = 0;
  let rojaMasLargaDonde = "";
  /**
   * **Y el tráfico que viene de frente.** «Un avión de frente y ni aviso ni
   * radar ni nada. ¿Cómo le han permitido a ese piloto kamikaze aterrizar?»
   * Por cada avión dibujado, su último sitio, para sacar hacia dónde va.
   */
  const traficoAntes = new Map();
  let deFrente = 0;
  let deFrenteDonde = null;
  /**
   * **Y una sola fuente: lo que se ve, lo que pinta el radar y lo que nombra
   * la radio.** «Veo aviones durante el vuelo que no aparecen en el radar, es
   * como si cada cosa fuera por su lado.» Se cuenta en cada muestra:
   *
   * - los aviones del mundo que se ven —dibujados y dentro del cuadro—;
   * - los rombos del TCAS, y cuántos de ellos no son de ningún avión del
   *   mundo o no se dibujan estando a menos de treinta kilómetros;
   * - los que vuelan dentro de la banda del TCAS en marcha y no tienen rombo;
   * - los rombos del cuadro plano que no caen en la marcación de ningún avión
   *   del TCAS —el espejo, si un día vuelve—;
   * - y cada vez que la radio nombra a un tráfico, si ese tráfico está en el
   *   mundo en ese momento.
   */
  const radar = {
    muestras: 0,
    vistos: 0,
    rombos: 0,
    rombosSinAvion: 0,
    rombosSinAvionDonde: null,
    rombosSinDibujo: 0,
    rombosSinDibujoDonde: null,
    vistosSinRombo: 0,
    vistosSinRomboDonde: null,
    fueraDeBanda: 0,
    piezasFueraDeSitio: 0,
    piezasFueraDeSitioDonde: null,
    piezas: 0,
    nombrados: 0,
    nombradosQueNoEstan: 0,
    nombradosQueNoEstanDonde: null,
    porClave: {},
    modos: {},
    dependencias: {},
  };
  let nombradosVistos = o.nombrados?.()?.total ?? 0;
  /**
   * Desde cuándo está cada avión en la banda del TCAS, s. El TCAS mira una
   * vez por segundo y un avión recién puesto tarda ese ciclo en salir: lo que
   * se cuenta es el que lleva dos segundos y sigue sin rombo.
   *
   * **Y dos segundos seguidos, no desde la primera vez que se le vio.** La
   * cuenta solo se borraba al salir de la banda por altura; si el avión dejaba
   * de mirarse por otra cosa —más allá de las treinta millas, sin dibujar,
   * fuera de la lista—, la hora vieja se quedaba. Los de la ruta dan la vuelta
   * a su corredor con el mismo nombre y reaparecen en la otra punta, y si esa
   * punta cae a veinte kilómetros de ti —llegando a El Hierro, a La Gomera,
   * dando vueltas en Los Rodeos— el banco lo contaba sin rombo desde la
   * primera muestra, con una hora de media hora antes, mientras el TCAS hacía
   * lo que hace uno de verdad con un transpondedor nuevo: cogerlo en su ciclo.
   * Medido: «el TCAS: no lo sigue», diez muestras, menos de un segundo. Ver
   * `comoVeA` en `flight/tcas.ts`.
   */
  const enLaBandaDesde = new Map();
  /**
   * **Y el cercano del que nadie dice nada.** En la final de La Palma había
   * dos rombos llenos —a cien y a seiscientos pies— y no sonó ni el «traffic,
   * traffic» ni la información de la torre. Desde cuándo es cercano cada uno
   * —rombo lleno o círculo de aviso, volando por encima de quinientos pies—,
   * y a quién se le ha informado.
   *
   * **En segundos de reloj de pared, no de juego.** La información la dice
   * una voz, y una voz dura lo que dura en el reloj de pared: con el juego
   * corrido a doce, treinta segundos de juego son dos y medio de verdad, y en
   * una final con la instructora hablando no hay hueco en dos y medio. Así
   * lo contó la primera versión de esto —un cercano «sin una palabra» en
   * Pettirossi que corrido a uno se habría informado—, y es la trampa de
   * siempre de este banco: ver la memoria sobre la regla de medir.
   */
  const cercanoDesde = new Map();
  const CERCANO_SIN_INFORMAR = 12;
  const informados = new Set();
  const cercanosSinInformar = new Set();
  /** Lo que la frecuencia dijo allí: el tráfico y la torre hablándole. */
  const frecuenciaOidaAlli = [];
  /**
   * Los «cleared to land» oídos allí, a quien fueran. Y donde contesta un
   * AFIS, lo que dice él nombrando la pista —«runway zero two free»—, que es
   * lo que allí se oye en su lugar.
   */
  const clearedLandAlli = [];
  /**
   * **Y lo que un AFIS no dice.** Las órdenes y los permisos oídos en un campo
   * AFIS, a quien fueran, y las muestras con la lámpara encendida allí: un
   * AFIS no autoriza, y una lámpara verde o roja es una autorización.
   */
  const ordenesEnUnAfis = [];
  let lamparaEnUnAfis = 0;
  /**
   * **Y nadie baja a tu pista mientras es tuya.** El avión dibujado volaba el
   * circuito entero y se posaba, con permiso o sin él: el que esperaba su
   * «cleared to land» en el viento en cola entraba en final detrás de ti y
   * bajaba a veintitrés metros de tu pista.
   */
  let bajandoATuPista = 0;
  let bajandoATuPistaDonde = null;
  /**
   * **Y con alguien en tu pista por debajo de la decisión, la orden de irse.**
   * Ver dónde se cuenta. Y el que estaba en tierra al lado, no encima: en un
   * campo con paralelas, lo que diga quién estaba en cuál.
   */
  let enTuPistaSinOrden = 0;
  let enTuPistaSinOrdenDonde = null;
  let alCostadoDeTuPista = null;
  /**
   * **Y con `OGA_PISTA_OCUPADA=1`, alguien entra en tu pista después de tu
   * permiso**: un despegue que se le pone a uno del tráfico dibujado, sin que
   * la frecuencia lo sepa, con el avión a punto de llegar a la decisión. Es
   * el caso que no vigilaba nadie —la pista se miraba hasta darte el permiso
   * y ya no— y no se da solo: hace falta ponerlo. Cuándo y dónde se puso.
   */
  let pistaOcupadaPuesta = null;
  /**
   * **Y en la final, la ventanilla ALT no sube por encima de la del punto de
   * final** si el automático no va bajando por la senda. Llegando a Gando en
   * Guyrami saltaba de 2.100 a 3.000 con el avión bajando a la pista: «ningún
   * sentido». Ver `ventanillaEnLaFinal` en `flight/altitud-seleccionada.ts`.
   */
  let ventanillaEnFinal = null;
  let ventanillaQueSube = null;
  /**
   * **Y la pista es de uno por vez, y las llegadas van en fila.** Se veían
   * dos o tres aviones entrando a la vez en la pista, uno encima del otro en
   * la misma final. Se cuentan las muestras con dos encima de la pista —tú
   * incluido— y las de uno del tráfico en final sin su hueco con el que cruza
   * el umbral antes que él. Ver `SEPARACION_ENTRE_LLEGADAS` en
   * `world/trafico.ts`.
   */
  let dosEnLaPista = 0;
  let dosEnLaPistaDonde = null;
  let sinHueco = 0;
  let sinHuecoDonde = null;
  /** Las fases en que estás encima de la pista. Ver `tuLlegada` en `game.ts`. */
  const ENCIMA_DE_LA_PISTA = new Set([
    "back-taxi",
    "alineando",
    "despegando",
    "comprometido",
    "aterrizado",
    "abandonando",
  ]);
  const misLetrasEnLaTorre = Object.entries(o.indicativo?.()?.deTorre ?? {})
    .filter(([k]) => /^c\d/.test(k))
    .map(([, v]) => v)
    .join("-");
  /** Segundos esperando a poder apagar con la llave. Ver la etapa «apagar». */
  let esperandoParaApagar = 0;
  let dijoToca = false;
  let pidioFreno = false;
  let tiempoDeRodajeIda = 0;
  let tiempoDeRodajeVuelta = 0;
  let despego = 0;
  let toco = 0;
  /**
   * **La puerta de la final estabilizada**, en ruedas sobre la pista.
   *
   * Es el criterio de aproximación estabilizada de la Flight Safety
   * Foundation, el que llevan las compañías en sus manuales: a **mil pies** en
   * instrumental y a **quinientos** en visual, el avión va configurado, a su
   * velocidad —de la Vref a la Vref más veinte nudos—, en la senda y en el
   * eje, bajando a no más de mil pies por minuto. Si no, al aire. Aquí se usa
   * la de mil cuando la final pasa por ellos —la de un destino, que empieza a
   * diez kilómetros— y la de quinientos cuando no: un circuito de tráfico se
   * vuela entero por debajo de los mil pies, en visual.
   */
  const PUERTA_ALTA = 1000 * 0.3048;
  const PUERTA_BAJA = 500 * 0.3048;
  /** Lo más alto que se ha estado en esta final, m de ruedas. */
  let masAltoEnFinal = 0;
  /** Lo que se bajaba en los últimos segundos de final. Ver `enLaPuerta`. */
  const bajadaReciente = [];
  /** Cómo se pasó por la puerta, o `null` si no se ha pasado. */
  let enLaPuerta = null;
  /**
   * **La aproximación que acaba en circuito, por su ruta y no por el eje.**
   *
   * Los puntos del plan que quedan por volar antes de la final recta, o
   * `null` si la final ya es recta. Ver `porLaRutaDeLlegada` y la 18 de La
   * Palma en `world/procedimientos-canarias.ts`: su final a la vista entra en
   * el eje a dos millas y media, y a diez kilómetros del umbral el eje pasa
   * por encima de la ladera de Puntallana. Con `finalALaVista` la puerta es la
   * de quinientos pies, que es la de una aproximación visual.
   */
  let aLaVista = null;
  let finalALaVista = false;
  /** Dónde empezó la recogida y a qué se bajaba entonces. Ver `recoger`. */
  let empezoLaRecogida = null;
  /** A qué ritmo se tocó, m/s: lo que apunta el propio juego al tocar. */
  let caidaAlTocar = null;
  /** Lo más deprisa que se rodó de vuelta fuera de la pista, m/s. */
  let rodajeMasRapido = 0;
  /** Cuánta pista hay para aterrizar en la que se tocó, m. */
  let pistaParaTocar = 0;
  /** Dónde y cómo se tocó: del eje, pasado el umbral y a qué velocidad. */
  let tocoDesviado = 0;
  let tocoPasadoElUmbral = 0;
  /** Cuánta pista había antes del umbral de aterrizaje donde se tocó, m. */
  let desplazadoAlTocar = 0;
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
   * **Y cuándo se pasó de una a otra, desde que se toca tierra.**
   *
   * El conjunto de arriba dice por qué fases se pasó, no cuántas veces ni en
   * qué orden, y lo que se rompió en Fuerteventura era justo eso: la fase iba
   * y venía entre «aterrizado» y «abandonando» rodando por la pista, y cada
   * vuelta rehacía la raya. Desde fuera, el parte decía lo mismo que un
   * aterrizaje limpio. Con la velocidad por el suelo y por el aire y lo que
   * queda al umbral, el vaivén se ve y se ve por qué.
   */
  const cambiosDeFase = [];
  let faseDelCambio = null;
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
    /*
     * **Y a uno, no a dos: es la ventana más hablada del vuelo, y la voz va
     * en reloj de pared.**
     *
     * Las fases corren con el reloj del juego y las frases duran lo que
     * duran. A dos, de la verde al V1 había diecinueve segundos de pared, y
     * de Taguató para arriba la torre dice en ella dieciocho y pico —«pista
     * uno dos, autorizado a despegar» y detrás la fraseología con el viento,
     * diez segundos y medio ella sola—: no cabía nada más. Medido al juntar
     * las voces y el radar, en Los Rodeos con el JAZ 90 y Taguató: la boca
     * hablando sin parar de los 33,7 a los 56,5 s y, detrás de la torre, se
     * cayeron sin sonar la fase de autorizado, la de despegando, el V1 de la
     * instructora y «tripulación, sentados para el despegue» de Jazlyn. Se
     * leyó como una cola parada. A uno, que es como se juega, esa ventana
     * dura el doble. Es la trampa de siempre de este banco: el reloj
     * acelerado comprime el juego y no el habla.
     */
    /*
     * **Y donde hay megafonía, también el rodaje de salida.** Es la ventana
     * de Jazlyn —el crosscheck y la bienvenida—, y a ×3 el rodaje de Gran
     * Canaria cabía en veintiún segundos de pared: la bienvenida se quedaba
     * detrás de la torre y se retiraba al empezar la carrera. Las fases que
     * van a uno están en `scripts/reloj-del-banco.mjs`, con su prueba.
     */
    const quiere = aTiempoReal.includes(fase) ? 1 : veces;
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
  /**
   * Cuánto flotaba el avión sobre el suelo antes de moverse, m.
   *
   * **Contra el suelo que se ve**, no contra `o.suelo`. Se medía contra el
   * mapa de alturas, que en un aeródromo está treinta y cinco centímetros por
   * debajo del asfalto dibujado —ver `mapa-del-pavimento.ts`—, y como el
   * modelo de vuelo apoyaba las ruedas justo ahí, esto daba cero mientras la
   * flota entera rodaba con el tren metido en la pista. Medía una superficie
   * contra sí misma. Ahora es el punto más bajo del avión contra lo que haya
   * dibujado debajo de él, como en `verificar-ruedas.mjs`.
   */
  const alPrincipioFlotaba = await (async () => {
    const g = o.aeronave?.().grupo;
    if (!g) return null;
    const { Raycaster, Vector3 } = await import(
      "/node_modules/three/build/three.module.js"
    );
    g.updateWorldMatrix(true, true);
    const visible = (n) => {
      for (let p = n; p; p = p.parent) if (!p.visible) return false;
      return true;
    };
    let bajo = null;
    const v = new Vector3();
    g.traverse((n) => {
      const pos = n.geometry?.attributes?.position;
      if (!n.isMesh || !pos || !visible(n)) return;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(n.matrixWorld);
        if (!bajo || v.y < bajo.y) bajo = v.clone();
      }
    });
    if (!bajo) return null;
    const rayo = new Raycaster(
      new Vector3(bajo.x, bajo.y + 30, bajo.z),
      new Vector3(0, -1, 0),
    );
    /*
     * Lo que no es suelo: lo que se pinta encima sin serlo —la raya verde,
     * la sombra, las luces, los aros—, lo que anda por ahí, y **la pintura**,
     * que va dos centímetros sobre el asfalto (`PINTURA_ALTURA`) y lo que se
     * mide aquí es el asfalto. Y el agua de casa, que
     * sobre el campo de llegada no se dibuja —su orilla lo tapa— y el rayo
     * sí la encuentra.
     */
    const NO_ES_SUELO =
      /plan-de-vuelo|ruta|sombra|luces|balizas|aros|senda|cielo|nubes|lluvia|sigueme|senalero|trafico|amarillo|pintura|designador|letreros|marcas|puntos-de-mira|cabeceras|helipuertos|agua/;
    for (const h of rayo.intersectObjects(o.escena().children, true)) {
      if (!h.object.isMesh || h.object.isInstancedMesh || !visible(h.object))
        continue;
      let nombres = "";
      let deAvion = false;
      for (let p = h.object; p; p = p.parent) {
        if (p === g) deAvion = true;
        nombres += `${p.name}<`;
      }
      if (deAvion || NO_ES_SUELO.test(nombres)) continue;
      return +(bajo.y - h.point.y).toFixed(2);
    }
    return null;
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
    // La senda del automático solo vale en la final de un reactor, y se
    // vuelve a poner en cada vuelta mientras dure. Ver `volarLaSenda`.
    senda = null;
    if (fase === "aterrizado" && ruedasAlAterrizar === null)
      ruedasAlAterrizar = {
        t: +t.toFixed(1),
        tocando: s.onGround,
        ruedas: +(s.heightAboveGround - (o.avion?.()?.tren ?? 0)).toFixed(1),
      };
    /*
     * La traza se toma en dos ventanas: la subida —los primeros cuarenta y
     * cinco— y la aproximación, que es donde falla ahora el reactor. Con una
     * sola ventana al principio, lo que pasa en final no se veía nunca.
     */
    const enFinal = /final|aterriz|frustr/.test(fase) || etapa === "final";
    {
      /*
       * Tuya es su fase **y que no seas el número dos**: detrás de uno que
       * aterriza antes, la final es tuya pero la pista todavía es suya. Ver
       * `numeroDos` en `game.ts`.
       */
      const tuya = o.pistaEsTuya ? o.pistaEsTuya() : PISTA_TUYA.has(fase);
      if (!tuya) yaTeLaDieron = false;
      const otros = tuya ? (o.pistaDeLosDemas?.() ?? []) : [];
      if (otros.length) {
        pistaDeOtros++;
        pistaDeOtrosDonde ??= `${t.toFixed(0)} s en «${fase}»: ${otros
          .map((x) => `${x.matricula} ${x.orden}`)
          .join(", ")}`;
      }
      if (tuya && pistaAhora()) {
        const p = pistaAhora();
        const rumbo = (p.heading * Math.PI) / 180;
        const fx = Math.sin(rumbo);
        const fz = -Math.cos(rumbo);
        const cota = o.cotaDePistaDeAhora?.(p.x, p.z) ?? 0;
        for (const a of o.trafico?.() ?? []) {
          if (!a.llegando) continue;
          const along = (a.x - p.x) * fx + (a.z - p.z) * fz;
          const across = Math.abs(-(a.x - p.x) * fz + (a.z - p.z) * fx);
          if (
            across < 30 &&
            along > -p.length / 2 - 1500 &&
            along < p.length / 2 &&
            a.y - cota < 30
          ) {
            bajandoATuPista++;
            bajandoATuPistaDonde ??= `${t.toFixed(0)} s en «${fase}»: ${a.matricula} a ${Math.round(a.y - cota)} m, ${Math.round(along + p.length / 2)} m del umbral${a.conPermiso ? "" : ", sin permiso"}`;
          }
        }
      }
      /*
       * **Y por debajo de la altura de decisión, con alguien en tu pista, al
       * aire.** Se mira el asfalto, no lo que el juego cree: un avión en
       * tierra dentro del rectángulo de tu pista —su largo y su ancho con
       * margen de ala—. Si está y no hay orden de irse, es lo que vio Enrique
       * en Gran Canaria: «tengo un avión en la pista y nadie me dice que
       * frustre». Diez metros por debajo de los sesenta para que la orden
       * tenga su fotograma, y el más cercano en el costado se apunta también:
       * en las paralelas dice si estaba en la de al lado.
       */
      if (
        pistaOcupadaPedida &&
        pistaOcupadaPuesta === null &&
        etapa === "final" &&
        !s.onGround &&
        (!destino || enElDestino) &&
        tusAutorizaciones.length > 0 &&
        alto(s) < 75 &&
        alto(s) > 62
      ) {
        o.traficoAnuncia?.("EC-PSO", "torre.clearedTakeoff");
        pistaOcupadaPuesta = `a los ${t.toFixed(0)} s, con el avión a ${Math.round(alto(s))} m`;
      }
      if (etapa === "final" && !s.onGround && (!destino || enElDestino)) {
        const j = o.juegoParaTrazas?.();
        const pies = j?.ventanillaParaBanco?.pies ?? null;
        const alli = j?.navegacion?.alturaDelFinal ?? null;
        if (pies !== null && alli !== null) {
          ventanillaEnFinal = { pies, delFinal: Math.round(alli / 0.3048) };
          // Doscientos pies de holgura: el reglaje y el redondeo a cien.
          if (!j.pilotoPuesto && pies > alli / 0.3048 + 200)
            ventanillaQueSube ??= `${t.toFixed(0)} s a ${Math.round(alto(s))} m: ${pies} ft con el punto de final a ${Math.round(alli / 0.3048)}`;
        }
      }
      if (etapa === "final" && !s.onGround && alto(s) < 50 && alto(s) > 2) {
        const p = pistaAhora();
        const rumbo = (p.heading * Math.PI) / 180;
        const fx = Math.sin(rumbo);
        const fz = -Math.cos(rumbo);
        const cota = o.cotaDePistaDeAhora?.(p.x, p.z) ?? 0;
        const orden = !!o.ordenDeFrustrar?.();
        for (const a of o.trafico?.() ?? []) {
          if (a.y - cota > 15) continue;
          const along = (a.x - p.x) * fx + (a.z - p.z) * fz;
          const across = -(a.x - p.x) * fz + (a.z - p.z) * fx;
          if (Math.abs(along) > p.length / 2) continue;
          const dentro = Math.abs(across) < (p.width ?? 45) / 2 + 10;
          const dentroDe = (o.traficoPorDentro?.() ?? []).find(
            (d) => d.matricula === a.matricula,
          );
          const como = `${a.matricula} a ${Math.round(along + p.length / 2)} m del umbral y ${Math.round(across)} m del eje (${a.enLaPista ? "en la pista para el juego" : "fuera para el juego"}${dentroDe ? `, ${dentroDe.camino} ${dentroDe.recorrido}/${dentroDe.espera}/${dentroDe.toca}/${dentroDe.fuera}` : ""})`;
          if (dentro && !orden) {
            enTuPistaSinOrden++;
            enTuPistaSinOrdenDonde ??= `${t.toFixed(0)} s a ${Math.round(alto(s))} m: ${como}`;
          } else if (!dentro && Math.abs(across) < 400)
            alCostadoDeTuPista ??= `${t.toFixed(0)} s a ${Math.round(alto(s))} m: ${como}`;
        }
      }
      {
        const encima = (o.trafico?.() ?? [])
          .filter((a) => a.enLaPista)
          .map((a) => a.matricula);
        if (s.onGround && ENCIMA_DE_LA_PISTA.has(fase)) encima.push("tú");
        if (encima.length > 1) {
          dosEnLaPista++;
          /*
           * Con cómo va cada uno por dentro —camino, metros y dónde caen la
           * doble raya, el despegue, la toma y la salida—: dos encima de la
           * pista puede venir de varios sitios, y sin esto solo se adivinaba.
           * Una vez al empezar y otra un rato después, para ver si se mueven.
           */
          if (dosEnLaPista === 1 || dosEnLaPista === 150) {
            const dentro = (o.traficoPorDentro?.() ?? [])
              .filter((d) => encima.includes(d.matricula))
              .map(
                (d) =>
                  `${d.matricula} ${d.tipo} ${d.camino} ${d.recorrido} m (espera ${d.espera}, despega ${d.despega}, toca ${d.toca}, fuera ${d.fuera})` +
                  `${d.conPermiso ? " con permiso" : ""} cedido ${d.cedido} s quieto ${d.quieto} s a ${d.alto} m`,
              )
              .join(" | ");
            const aqui = `${t.toFixed(0)} s en «${fase}»: ${encima.join(", ")}${dentro ? ` [${dentro}]` : ""}`;
            if (dosEnLaPista === 1) dosEnLaPistaDonde = aqui;
            else dosEnLaPistaDonde += ` · y luego ${aqui}`;
          }
        }
        const fila = (o.secuencia?.() ?? []).map((x) => ({ ...x, tuyo: false }));
        if (fase === "final" && !s.onGround && pistaAhora()) {
          const v = Math.max(15, s.groundSpeed ?? s.airspeed);
          fila.push({
            matricula: "tú",
            alUmbral: Math.max(0, alUmbral(s)) / v,
            velocidad: v,
            enFinal: true,
            tuyo: true,
          });
        }
        fila.sort((a, b) => a.alUmbral - b.alUmbral);
        for (let i = 1; i < fila.length; i++) {
          const b = fila[i];
          const a = fila[i - 1];
          if (b.tuyo || !b.enFinal) continue;
          const hueco = b.alUmbral - a.alUmbral;
          const leToca = Math.max(120, (3 * 1852) / Math.max(1, b.velocidad));
          if (hueco < leToca - 3) {
            sinHueco++;
            sinHuecoDonde ??= `${t.toFixed(0)} s en «${fase}»: ${b.matricula} a ${hueco.toFixed(0)} s de ${a.matricula}`;
          }
        }
      }
      const h = o.habladas?.() ?? [];
      const total = o.habladasTotal?.() ?? h.length;
      if (total < habladasVistas) habladasVistas = 0;
      const nuevas = h.slice(Math.max(0, h.length - (total - habladasVistas)));
      habladasVistas = total;
      if (o.avionesDelMundo && o.tcas) {
        const mundo = o.avionesDelMundo();
        const porId = new Map(mundo.map((a) => [a.id, a]));
        const tc = o.tcas();
        const pintados = tc.enPantalla ?? [];
        radar.muestras++;
        radar.modos[tc.modo ?? "—"] = (radar.modos[tc.modo ?? "—"] ?? 0) + 1;
        const dep = o.dependencia?.() ?? "—";
        radar.dependencias[`${dep}@${fase}`] = (radar.dependencias[`${dep}@${fase}`] ?? 0) + 1;
        radar.vistos += mundo.filter((a) => a.enPantalla && !a.enElSuelo).length;
        radar.rombos += pintados.length;
        for (const b of pintados) {
          const a = porId.get(b.id);
          if (!a) {
            radar.rombosSinAvion++;
            /*
             * Con la hora al centésimo de las primeras: dos muestras con la
             * misma hora son el mismo paso del juego visto dos veces.
             */
            if (radar.rombosSinAvion <= 4)
              radar.rombosSinAvionDonde = `${radar.rombosSinAvionDonde ? `${radar.rombosSinAvionDonde} · ` : ""}${t.toFixed(2)} s en «${fase}»: ${b.id}`;
          } else if (!a.dibujado && a.distancia < 30000) {
            radar.rombosSinDibujo++;
            radar.rombosSinDibujoDonde ??= `${t.toFixed(0)} s en «${fase}»: ${b.id} a ${Math.round(a.distancia)} m`;
          }
        }
        /** Los que en esta muestra están en la banda. Ver `enLaBandaDesde`. */
        const enLaBandaAhora = new Set();
        if (tc.equipo && tc.enMarcha) {
          const banda = { NORM: [2700, 2700], ABV: [9900, 2700], BLW: [2700, 9900] }[tc.banda ?? "NORM"];
          const pintadosIds = new Set(pintados.map((b) => b.id));
          for (const a of mundo) {
            if (a.enElSuelo || !a.dibujado) continue;
            const pies = a.relativa / 0.3048;
            const inclinada = Math.hypot(a.distancia, a.relativa) / 1852;
            if (inclinada > 30) continue;
            if (pies > banda[0] || pies < -banda[1]) {
              if (a.enPantalla) radar.fueraDeBanda++;
              enLaBandaDesde.delete(a.id);
              continue;
            }
            enLaBandaAhora.add(a.id);
            if (!enLaBandaDesde.has(a.id)) enLaBandaDesde.set(a.id, t);
            if (t - enLaBandaDesde.get(a.id) < 2) continue;
            if (!pintadosIds.has(a.id)) {
              radar.vistosSinRombo++;
              /*
               * Y cómo lo ve el TCAS: si lo sigue, a cuánto lo midió y con qué
               * banda y altura propia pintó. Sin esto, un avión sin rombo podía
               * ser del banco o del juego y solo se adivinaba cuál.
               */
              if (!radar.vistosSinRomboDonde) {
                const ve = o.tcasComoVeA?.(a.id);
                radar.vistosSinRomboDonde =
                  `${t.toFixed(0)} s en «${fase}»: ${a.id} a ${Math.round(a.distancia)} m y ${Math.round(pies)} ft` +
                  ` · banda ${tc.banda ?? "NORM"}, yo a ${Math.round(s.position.y)} m` +
                  (ve
                    ? ` · el TCAS: ${ve.sigue ? `lo sigue a ${ve.millas} NM y ${ve.pies} ft` : "no lo sigue"}, pintó con ${ve.banda} a ${ve.y} m y ${ve.intrusos} transpondedores`
                    : "");
              }
            }
          }
          /*
           * Y los rombos del cuadro plano, en su marcación: cada pieza encendida
           * tiene que caer a menos de cinco grados de algún avión del TCAS.
           */
          const rumbo = s.heading;
          const marcaciones = pintados.map((b) => {
            const m = Math.atan2(b.x - s.position.x, -(b.z - s.position.z)) - rumbo;
            return Math.atan2(Math.sin(m), Math.cos(m));
          });
          for (const el of document.querySelectorAll('[data-carta^="otro-"]')) {
            if (el.getAttribute("visibility") !== "visible") continue;
            const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(el.getAttribute("transform") ?? "");
            if (!m) continue;
            const dx = Number(m[1]);
            const dy = Number(m[2]);
            if (Math.hypot(dx, dy) < 4) continue;
            radar.piezas++;
            const suya = Math.atan2(dx, -dy);
            const cerca = marcaciones.some(
              (q) => Math.abs(Math.atan2(Math.sin(suya - q), Math.cos(suya - q))) < (5 * Math.PI) / 180,
            );
            if (!cerca) {
              radar.piezasFueraDeSitio++;
              radar.piezasFueraDeSitioDonde ??= `${t.toFixed(0)} s en «${fase}»: pieza en ${Math.round((suya * 180) / Math.PI)}°`;
            }
          }
        }
        // Y quien no está en la banda en esta muestra, por lo que sea, vuelve
        // a empezar su cuenta. Ver `enLaBandaDesde`.
        for (const id of [...enLaBandaDesde.keys()])
          if (!enLaBandaAhora.has(id)) enLaBandaDesde.delete(id);
        if (!s.onGround && s.heightAboveGround > 152)
          for (const b of pintados) {
            if (b.clase === "otro") {
              cercanoDesde.delete(b.id);
              continue;
            }
            const pared = performance.now() / 1000;
            if (!cercanoDesde.has(b.id)) cercanoDesde.set(b.id, pared);
            if (pared - cercanoDesde.get(b.id) > CERCANO_SIN_INFORMAR && !informados.has(b.id) && !cercanosSinInformar.has(b.id)) {
              cercanosSinInformar.add(b.id);
              radar.cercanosSinInformar = (radar.cercanosSinInformar ?? 0) + 1;
              radar.cercanosSinInformarDonde ??= `${t.toFixed(0)} s en «${fase}»: ${b.id} a ${Math.round(b.relativa / 0.3048)} ft · la información: ${o.porQueCallaLaInformacion?.() ?? "?"} · informados: ${[...informados].join(", ") || "nadie"} · contados: ${(o.informacionDeTrafico?.() ?? []).join(", ") || "nadie"}`;
            }
          }
        const nombrados = o.nombrados?.();
        if (nombrados) {
          const nuevosN = nombrados.lista.slice(
            Math.max(0, nombrados.lista.length - (nombrados.total - nombradosVistos)),
          );
          nombradosVistos = nombrados.total;
          for (const n of nuevosN) {
            if (n.clave === "informacionDeTrafico" || n.clave === "traffic, traffic")
              informados.add(n.quien);
            radar.nombrados++;
            const clave = n.clave.replace(/@.*$/, "");
            radar.porClave[clave] = (radar.porClave[clave] ?? 0) + 1;
            const id = n.quien && n.quien.includes(":") ? n.quien : n.quien ? `circuito:${n.quien}` : null;
            if (!id || !porId.has(id)) {
              radar.nombradosQueNoEstan++;
              radar.nombradosQueNoEstanDonde ??= `${t.toFixed(0)} s en «${fase}»: ${clave} de ${n.quien ?? "nadie"}`;
            }
          }
        }
      }
      if (enElDestino && aterrizaConAfis && o.lamparaEncendida?.()) lamparaEnUnAfis++;
      if (fase === "esperando") {
        rojaDesde ??= t;
        if (t - rojaDesde > rojaMasLarga) {
          rojaMasLarga = t - rojaDesde;
          rojaMasLargaDonde = `a los ${Math.round(rojaDesde)} s: ${(o.ocupanLaPista?.() ?? []).map((x) => `${x.matricula} ${x.orden}`).join(", ") || "nadie en la pista"}`;
        }
      } else rojaDesde = null;
      /*
       * De frente es acercándose con rumbos casi opuestos **y por la misma
       * línea**: que, siguiendo los dos como van, se crucen a menos de
       * trescientos metros en el próximo minuto, con menos de ciento
       * cincuenta de altura entre los dos. En la salida y en la final, que es
       * donde se pidió. Uno en su viento en cola, a un kilómetro de lado y en
       * sentido contrario, no es de frente: es un circuito.
       */
      if (!s.onGround && /despegando|comprometido|en-vuelo|final/.test(fase)) {
        /*
         * **Y la velocidad se saca de dos muestras seguidas, no de la última
         * vez que se le vio.** El que se retiraba y volvía a aparecer con la
         * misma matrícula traía su último sitio de hacía un minuto, y de ahí
         * salía una velocidad de avión hacia donde reaparecía. Ese salto era
         * de verdad un fallo del tráfico —ver `otraVuelta` en
         * `world/trafico.ts`—, pero lo que mide esto es quién vuela de frente,
         * y un salto no vuela. Los saltos los mide `pista-compartida.test.ts`.
         */
        const vistos = new Set((o.trafico?.() ?? []).map((a) => a.matricula));
        for (const m of [...traficoAntes.keys()])
          if (!vistos.has(m)) traficoAntes.delete(m);
        for (const a of o.trafico?.() ?? []) {
          const antes = traficoAntes.get(a.matricula);
          traficoAntes.set(a.matricula, { x: a.x, z: a.z, t });
          if (!antes || t - antes.t <= 0) continue;
          const vx = (a.x - antes.x) / (t - antes.t);
          const vz = (a.z - antes.z) / (t - antes.t);
          const v = Math.hypot(vx, vz);
          if (v < 20) continue;
          const mx = Math.sin(s.heading);
          const mz = -Math.cos(s.heading);
          const opuesto = (vx * mx + vz * mz) / v < -0.87;
          const dx = a.x - s.position.x;
          const dz = a.z - s.position.z;
          const d = Math.hypot(dx, dz);
          // El punto de máximo acercamiento, con los dos en línea recta.
          const vs = Math.max(1, s.groundSpeed ?? s.airspeed);
          const rvx = vx - mx * vs;
          const rvz = vz - mz * vs;
          const rv2 = rvx * rvx + rvz * rvz || 1;
          const tc = -(dx * rvx + dz * rvz) / rv2;
          const cerca = Math.hypot(dx + rvx * tc, dz + rvz * tc);
          if (
            opuesto &&
            tc > 0 &&
            tc < 60 &&
            cerca < 300 &&
            d < 5000 &&
            Math.abs(a.y - s.position.y) < 150
          ) {
            deFrente++;
            deFrenteDonde ??= `${t.toFixed(0)} s en «${fase}»: ${a.matricula} a ${Math.round(d)} m y ${Math.round(a.y - s.position.y)} m de altura`;
          }
        }
      } else traficoAntes.clear();
      if (fase === "esperando" && !esperandoPorAlguien) {
        /*
         * Y **los que se ven** encima de la pista, no solo los que la tienen
         * según la frecuencia: el que corre su despegue ya la soltó para la
         * radio y sigue en ella, y la torre te deja en la roja por él con
         * «departing traffic». Mirando solo la frecuencia, el banco decía
         * «no había nadie en la pista: no se midió» con la torre diciéndolo.
         */
        const ocupan = [
          ...(o.ocupanLaPista?.() ?? []),
          ...(o.trafico?.() ?? [])
            .filter((a) => a.enLaPista)
            .map((a) => ({ matricula: a.matricula, orden: "en la pista" })),
        ];
        if (ocupan.length)
          esperandoPorAlguien = `${t.toFixed(0)} s: ${ocupan.map((x) => `${x.matricula} ${x.orden}`).join(", ")}`;
      }
      for (const x of nuevas) {
        if (
          /^[\d.]+s (?:torre\.(?:[a-z]+\.)?(?:holdShort|afisInUse)(?:Landing|Departing)@|vuelo\.esperaQue)/.test(x) &&
          (!/@/.test(x) || (!!misLetrasEnLaTorre && x.includes(`@${misLetrasEnLaTorre}`)))
        )
          porQueSeDijo ??= `${t.toFixed(0)} s en «${fase}»: ${x.replace(/^[\d.]+s /, "").replace(/@.*$/, "")}`;
        if (enElDestino) {
          if (
            aterrizaConAfis
              ? /torre\.(?:[a-z]+\.)?afis(?:Free|FreeTakeoff|Occupied|NoTraffic|InUseLanding|InUseDeparting)(?:\.[LCR])?@/.test(x)
              : /torre\..*clearedLand/.test(x)
          )
            clearedLandAlli.push(x.replace(/^[\d.]+s /, ""));
          if (
            aterrizaConAfis &&
            /torre\.(?:[a-z]+\.)?(?:verde|roja|aterrizar|clearedLand|clearedTakeoff|lineUpWait|holdShort\w*|goAround\w*|vacateNext|clearedTo)(?:\.[LCR])?@/.test(x)
          )
            ordenesEnUnAfis.push(x.replace(/^[\d.]+s /, ""));
          const f = /^[\d.]+s (otro|torre)\.[^@]*@(.*)$/.exec(x);
          if (f && !(misLetrasEnLaTorre && f[2].startsWith(misLetrasEnLaTorre)))
            frecuenciaOidaAlli.push(x);
        }
        const m = /^[\d.]+s (torre|otro)\.(?:[a-z]+\.)?([A-Za-z]+)(?:\.[LCR])?@(.*)$/.exec(x);
        if (!m) continue;
        const mia = !!misLetrasEnLaTorre && m[3].startsWith(misLetrasEnLaTorre);
        /*
         * Y en un AFIS, su «pista libre» en el aire, que es lo que allí se oye
         * en lugar del permiso: en castellano de la lámpara y en fraseología.
         * El «runway free» en tierra es el de entrar a la pista, no este.
         */
        if (
          mia &&
          m[1] === "torre" &&
          (/^(aterrizar|clearedLand|afisLibreEnFinal)$/.test(m[2]) ||
            (m[2] === "afisFree" && !s.onGround))
        )
          tusAutorizaciones.push({
            t: Math.round(t),
            fase,
            dice: m[2],
            alli: !!enElDestino,
            // Y a qué altura sonó: con la pista ocupada hasta la decisión, la
            // torre manda al aire, no autoriza a once metros del suelo.
            alto: Math.round(alto(s)),
          });
        // A quién va, por sus letras: las cinco del alfabeto, sin la pista.
        const quien = m[3]
          .split("-")
          .filter((l) => l.startsWith("fonetico."))
          .join("-");
        /*
         * En un AFIS, lo mismo con lo que dice él: «runway free» a otro es
         * la pista que tiene, y se le acaba al despegar o al estar ocupada.
         */
        if (!mia && m[1] === "torre" && /^(lineUpWait|clearedLand|afisFree)$/.test(m[2]))
          conPermisoOido.set(quien, x);
        if (
          !mia &&
          ((m[1] === "torre" &&
            /^(clearedTakeoff|goAround|afisFreeTakeoff|afisOccupied)$/.test(m[2])) ||
            (m[1] === "otro" && m[2] === "pistaLibre"))
        )
          conPermisoOido.delete(quien);
        if (!tuya) continue;
        if (
          mia &&
          m[1] === "torre" &&
          /^(verde|aterrizar|clearedTakeoff|clearedLand|afisLibre|afisLibreEnFinal|afisFree|afisFreeTakeoff)$/.test(m[2])
        ) {
          yaTeLaDieron = true;
          if (conPermisoOido.size)
            sinAnularAlDartela.push(
              `${t.toFixed(0)} s en «${fase}», ${x.replace(/@.*$/, "")}, con: ${[...conPermisoOido.values()].map((v) => v.replace(/@.*$/, "")).join(" · ")}`,
            );
        } else if (
          !mia &&
          m[1] === "torre" &&
          yaTeLaDieron &&
          /^(lineUpWait|clearedTakeoff|clearedLand|afisFree|afisFreeTakeoff)$/.test(m[2])
        )
          dadaAOtroTrasLaTuya.push(`${t.toFixed(0)} s en «${fase}»: ${x}`);
      }
    }
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
    // Sin la fase vacía, que no es una fase: es la tarjeta reponiéndose.
    if (fase && fase !== faseDelCambio) {
      if (toco > 0 && cambiosDeFase.length < 40)
        cambiosDeFase.push(
          `${t.toFixed(0)}s ${fase} · suelo ${s.groundSpeed.toFixed(0)} aire ${s.airspeed.toFixed(0)} m/s · umbral ${alUmbral(s).toFixed(0)} m`,
        );
      faseDelCambio = fase;
    }
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
      /*
       * **Y visto es colgado de la escena, no solo de pie.** Con «dar una
       * vuelta» el señalero trabajaba —`visible`, gestos, tarjeta— fuera de
       * la escena, y este banco lo daba por visto. Ver `verificar-llegadas`.
       */
      let colgado = sen?.grupo ?? null;
      while (colgado?.parent) colgado = colgado.parent;
      if (sen?.grupo?.visible && colgado === globalThis.__raiz) {
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
    if (quienRecibe === null && fase === "en-puesto" && toco) {
      const bici = o.enBici?.() ? coche : null;
      quienRecibe = {
        enBici: !!o.enBici?.(),
        biciALaVista: !!bici?.visible,
        biciA: bici
          ? Math.round(
              Math.hypot(
                bici.position.x - s.position.x,
                bici.position.z - s.position.z,
              ),
            )
          : null,
      };
    }
    if (
      trazarCoche &&
      (s.onGround || s.heightAboveGround < 40) &&
      (i % 3 === 0 || !s.onGround)
    ) {
      const sg = o.sigueme?.();
      const ac = sg?.acumulado ?? [];
      trazaCoche.push(
        `${t.toFixed(1)}s ${fase || "—"} · avión ${s.position.x.toFixed(0)},${s.position.z.toFixed(0)} rumbo ${((s.heading * 180) / Math.PI).toFixed(0)} ${s.groundSpeed.toFixed(1)} m/s ${s.onGround ? "" : "AIRE "}${s.onRunway ? "PISTA" : "fuera"} avance ${(o.avanceEnLaRuta?.() ?? 0).toFixed(0)} · coche ${coche?.visible ? "" : "oculto "}${coche ? `${coche.position.x.toFixed(0)},${coche.position.z.toFixed(0)}` : "—"} s ${sg?.s?.toFixed?.(0) ?? "?"} de ${(ac[ac.length - 1] ?? 0).toFixed(0)} aparte ${(sg?.aparte ?? 0).toFixed(2)}${sg?.esperando ? " ESPERA" : ""} · a ${coche ? Math.hypot(coche.position.x - s.position.x, coche.position.z - s.position.z).toFixed(0) : "—"} m · rutas ${o.rodajeAsi?.()?.vecesQueSePuso ?? "?"} · voz ${(() => {
          const b = o.bocaAhora?.();
          return b ? `${b.ocupada ? "hablando" : "callada"} «${b.ultima}» espera [${b.espera.join(", ")}]` : "?";
        })()} · ${o.tarjeta?.()?.dibujo ?? ""}`,
      );
    }
    if (o.enBici?.() && coche?.visible && s.onGround && !s.onRunway) {
      biciVista += paso;
      const raya = o.ruta?.() ?? [];
      let alaRaya = Infinity;
      for (let k = 1; k < raya.length; k++) {
        const [ax, az] = raya[k - 1];
        const [bx, bz] = raya[k];
        const dx = bx - ax;
        const dz = bz - az;
        const l2 = dx * dx + dz * dz || 1;
        const u = Math.max(
          0,
          Math.min(
            1,
            ((coche.position.x - ax) * dx + (coche.position.z - az) * dz) / l2,
          ),
        );
        alaRaya = Math.min(
          alaRaya,
          Math.hypot(coche.position.x - (ax + dx * u), coche.position.z - (az + dz * u)),
        );
      }
      const delante =
        Math.sin(s.heading) * (coche.position.x - s.position.x) -
          Math.cos(s.heading) * (coche.position.z - s.position.z) >
        0;
      if (!o.cocheApartado?.() && alaRaya < 3 && delante) biciGuiando += paso;
    }
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
    if (coche?.visible && toco && s.onGround && cochePisaLaPista === null) {
      const rp = pistaAhora();
      const hp = (rp.heading * Math.PI) / 180;
      const alEje = Math.abs(
        (coche.position.x - rp.x) * Math.cos(hp) +
          (coche.position.z - rp.z) * Math.sin(hp),
      );
      const alLargo = Math.abs(
        (coche.position.x - rp.x) * Math.sin(hp) -
          (coche.position.z - rp.z) * Math.cos(hp),
      );
      if (alEje < (rp.width ?? 45) / 2 && alLargo < rp.length / 2)
        cochePisaLaPista = `a los ${t.toFixed(0)} s, en «${fase}», a ${alEje.toFixed(0)} m del eje y a ${Math.round(Math.hypot(coche.position.x - s.position.x, coche.position.z - s.position.z))} m del avión`;
    }
    const guiandoAhora = coche?.visible && !o.cocheApartado?.();
    if (coche?.visible) {
      const sobre =
        coche.position.y - o.sueloDeVuelo(coche.position.x, coche.position.z);
      if (Math.abs(sobre) > Math.abs(cocheEnElAire)) {
        cocheEnElAire = sobre;
        cocheEnElAireDonde = `en «${fase}» a los ${Math.round(t)} s, en ${Math.round(coche.position.x)},${Math.round(coche.position.z)} (${o.aerodromoDeAhora?.() ?? "?"})`;
      }
    }
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
    /*
     * **Y esperando en la salida, lo lejos no cuenta.** Un sígame que espera
     * en la calle de salida a que llegue el avión está donde tiene que estar
     * aunque le quede lejos: en El Hierro la única salida está pista atrás y
     * el avión la rueda entera, setecientos metros, hasta ella. Lo que no
     * puede es alejarse guiando. Ver `esperando` en `world/sigueme.ts`.
     */
    const esperandoEnLaSalida = o.sigueme?.()?.esperando === true;
    const cuentaLejos =
      !esperandoEnLaSalida && (!s.onRunway || !haciaElCoche);
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
      if (esperandoEnLaSalida) lejosEsperando = Math.max(lejosEsperando, alCoche);
      if (cuentaLejos && alCoche > lejosDelCoche) {
        lejosDelCoche = alCoche;
        lejosDondeCoche =
          `en «${fase}» a los ${Math.round(t)} s, a ${Math.round(s.airspeed)} m/s` +
          (s.onRunway ? " · en pista" : " · fuera de la pista") +
          (s.onRunway ? (haciaElCoche ? " · hacia el coche" : " · de espaldas al coche") : "");
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
      /*
       * **Con los dos en pista, y no solo el avión.** El comentario de arriba
       * lo decía y la cuenta no: bastaba con que pisara pista el avión, así
       * que el coche esperando donde tiene que esperar —cuarenta metros
       * dentro de la calle de salida, ver `BIEN_FUERA_DE_LA_PISTA`— contaba
       * como coche en la pista en cuanto el avión se le acercaba para salir
       * por ella. Asunción daba treinta y cinco metros así, con el coche en su
       * sitio. Se mira también dónde está el coche: a menos de media pista y
       * un margen del eje, y dentro de su largo.
       */
      const rp = pistaAhora();
      const hp = (rp.heading * Math.PI) / 180;
      const cocheAlEje = Math.abs(
        (coche.position.x - rp.x) * Math.cos(hp) +
          (coche.position.z - rp.z) * Math.sin(hp),
      );
      const cocheALoLargo = Math.abs(
        (coche.position.x - rp.x) * Math.sin(hp) -
          (coche.position.z - rp.z) * Math.cos(hp),
      );
      const cocheSobreLaPista =
        cocheAlEje < (rp.width ?? 45) / 2 + 5 &&
        cocheALoLargo < rp.length / 2 + 5;
      if (s.onRunway) {
        cocheCercaEnPista = Math.min(cocheCercaEnPista, alCoche);
        if (cocheSobreLaPista && alCoche < cocheEnPista) {
          cocheEnPista = alCoche;
          cocheEnPistaDonde = `a los ${t.toFixed(0)} s, en «${fase}», con el coche a ${cocheAlEje.toFixed(0)} m del eje`;
        }
      }
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

    if (enElDestino && i % 20 === 0) {
      const p = pistaAhora();
      for (const a of o.trafico?.() ?? []) {
        traficoVistoAlli++;
        traficoMasLejosAlli = Math.max(
          traficoMasLejosAlli,
          Math.round(Math.hypot(a.x - p.x, a.z - p.z)),
        );
      }
    }

    // ── El piloto ────────────────────────────────────────────────────────
    /*
     * **Y si la torre te manda al aire porque la pista está ocupada, se va.**
     *
     * Con `mandarFrustrar("nunca")` no hay órdenes sorteadas, pero sí la de
     * verdad: detrás de uno que aterriza antes y no ha dejado la pista, al
     * llegar a la altura de decisión la torre te manda al aire. Bajar igual
     * es llevarse el avión de delante, y el vuelo se acaba en percance. Así
     * que se hace lo que se enseña: subir por el eje y dar otra vuelta al
     * circuito. Ver `autorizarCuandoToque` en `game.ts`.
     */
    if (
      etapa === "final" &&
      !s.onGround &&
      o.ordenDeFrustrar?.() &&
      o.porQueMandaron?.() === "pistaOcupada"
    ) {
      frustradasPorLaPista++;
      // El de la cabecera en uso, no el nominal: ver `rumboDeSalida`.
      rumboDeSalida = porDelante()?.h ?? rumboDeSalida;
      aDonde = 1;
      etapa = "subir";
    }
    /*
     * **Y si el juego ya te ha mandado al aire, o la pista se acabó, también.**
     *
     * Solo se obedecía la orden por pista ocupada. La otra —la de la
     * instructora cuando se llega mal a la altura de decisión— se dejaba
     * pasar, y con la avioneta salía bien: se enderezaba y tocaba. Con el JAZ
     * 90 en Los Rodeos, no: cruzó el umbral a sesenta metros, el juego dio la
     * frustrada, y el piloto siguió pidiendo «cero metros sobre la pista» más
     * allá del final del asfalto, o sea sobre el terreno que viene detrás.
     * Tocó monte a 120 m/s y cinco kilómetros y medio pasado el umbral: era
     * el «percance: fuera» del banco, y no el circuito.
     *
     * Renunciar es ganar: si el juego ya ha pasado a «en vuelo» con el umbral
     * a la espalda, o si el avión vuela por delante del final de la pista, se
     * sube por el eje y se da otra vuelta, que es lo que se enseña.
     */
    if (etapa === "final" && !s.onGround && alto(s) > 30) {
      const r = pistaAhora();
      const pasado = alUmbral(s) < -(r.length - (r.desplazado ?? 0));
      if (pasado || (fase === "en-vuelo" && alUmbral(s) < 0)) {
        frustradasPorElJuego++;
        rumboDeSalida = porDelante()?.h ?? rumboDeSalida;
        aDonde = 1;
        etapa = "subir";
      }
    }
    /*
     * **Y una final que se deja es una final que no cuenta.** Al irse al aire
     * se olvidan la recogida y la puerta: lo que se mide es la final que
     * acabó tocando.
     */
    if (etapa !== "final" && etapa !== "frenar" && recogida) recogida = null;
    topeDeInclinacion =
      etapa === "final" || (etapa === "subir" && aDonde >= 3)
        ? TOPE_DE_INCLINACION_EN_LA_BASE
        : TOPE_DE_INCLINACION;
    if (etapa === "subir" && (enLaPuerta || masAltoEnFinal > 0)) {
      enLaPuerta = null;
      masAltoEnFinal = 0;
      // La vuelta es por el circuito, que entra alineado: ver `aLaVista`.
      aLaVista = null;
      finalALaVista = false;
      empezoLaRecogida = null;
      sendaSencilla = 0;
      bajadaReciente.length = 0;
    }
    if (etapa === "arrancar") {
      c.engineOn = true;
      c.brakes = 0;
      if (fase === "rodando" || fase === "arrancando") etapa = "rodar";
    } else if (etapa === "rodar") {
      tiempoDeRodajeIda += paso;
      if (antesIda)
        idaMetros += Math.hypot(
          s.position.x - antesIda.x,
          s.position.z - antesIda.z,
        );
      antesIda = { x: s.position.x, z: s.position.z };
      {
        const r = o.ruta();
        let suma = 0;
        for (let i = 0; i < r.length - 1; i++)
          suma += Math.hypot(r[i + 1][0] - r[i][0], r[i + 1][1] - r[i][1]);
        largoDeLaIda = Math.max(largoDeLaIda, suma);
      }
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
      /*
       * **Y la media vuelta se da siguiendo la raya, y a la velocidad que
       * pide el juego.**
       *
       * Fuera del back-taxi esto apuntaba el morro al rumbo de la pista y
       * rodaba a ocho metros por segundo sin freno. Pisando la pista ya
       * derecho vale; con el morro al revés —que es como se acaba un
       * back-taxi— es dar la vuelta a esa velocidad, y con el JAZ 90 eso pide
       * un radio de once metros donde la raya dibuja uno de cuatro. Mientras
       * el morro no mire hacia donde se despega, se sigue la raya como
       * cualquiera, frenando lo que haga falta.
       */
      const torcido =
        ruta.length > 1 && Math.abs(error(rumboPista, s.heading)) > 0.5;
      if (fase === "back-taxi" || torcido) {
        const quiere = o.rodaje() ?? 9;
        c.throttle = porElSuelo(s) < quiere ? 0.6 : 0;
        c.brakes = porElSuelo(s) > quiere + 1 ? 1 : 0;
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
      cruceroPedido > 0 &&
      alto(s) > 150 &&
      t - despego > 25
    ) {
      // Ver `OGA_CRUCERO`: antes de cruzar, un crucero y una bajada.
      etapa = "crucero";
      cruceroDesde = null;
    } else if (etapa === "crucero") {
      /*
       * **Subir, cruzar nivelado y bajar**, recto por el rumbo de salida.
       *
       * El gas y la palanca, con el mismo reparto que el circuito: subiendo,
       * la palanca lleva la velocidad y el gas lo que haga falta; nivelado,
       * el gas la velocidad y la palanca la altura. Bajando, poco gas y la
       * palanca a la altura de abajo, con su bajada limitada.
       */
      if (cruceroDesde === null && alto(s) >= ALTO_DE_CRUCERO - 30)
        cruceroDesde = t;
      const yaBaja = cruceroDesde !== null && t - cruceroDesde >= cruceroPedido;
      const altoQueToca = yaBaja ? ALTO_DE_BAJADA : ALTO_DE_CRUCERO;
      const subiendo = !yaBaja && alto(s) < altoQueToca - 15;
      const topeSubiendo = Math.max(VELOCIDAD_DE_SUBIDA, DE_CIRCUITO);
      const gasSubiendo =
        NECESITA_TECNICA && peldano !== "guyrami"
          ? Math.max(0, Math.min(1, 0.55 + (topeSubiendo - s.airspeed) * 0.04))
          : 1;
      const aSuVelocidad = Math.min(
        1,
        (yaBaja ? 0.45 : 0.55) + (DE_CIRCUITO - s.airspeed) * 0.04,
      );
      c.throttle = subiendo ? gasSubiendo : Math.max(yaBaja ? 0.2 : 0.3, aSuVelocidad);
      configurar(s, c, 1);
      c.elevator = subiendo ? subirDeVerdad(s) : aLaAltura(s, altoQueToca);
      sostenerLaAltura(s, subiendo, altoQueToca);
      c.aileron = alRumbo(s, rumboDeSalida);
      /*
       * Y se cruza cuando la cabina ya dijo lo de la bajada —o cuando se ve
       * que no lo va a decir—: abajo, y con la orden a la tripulación dicha
       * o con minuto y medio de espera, que es más de lo que tarda.
       */
      const dicha = (o.megafonia?.() ?? []).some((h) =>
        h.includes("comandante.aproximacion"),
      );
      if (
        yaBaja &&
        alto(s) < ALTO_DE_BAJADA + 40 &&
        (dicha || t - cruceroDesde - cruceroPedido > 150)
      )
        etapa = "cruzar";
    } else if (
      (etapa === "cruzar" || (etapa === "subir" && !cruceroPedido)) &&
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
      /*
       * **Y a diez kilómetros, no a cuatro**: a cuatro se llegaba a
       * doscientos veinte metros, por debajo de los mil pies en los que una
       * final tiene que estar ya estabilizada. Desde diez la final pasa por
       * los mil pies —ver `PUERTA_ALTA`— un minuto después de aparecer en
       * ella, que es lo que tarda el automático en asentarse en la senda
       * viniendo de subir: desde siete llegaba a la puerta todavía cogiéndola,
       * bajando a diez metros por segundo.
       */
      const DESDE = 10000;
      const u = o.puntoDeFinalDe(0, destino);
      /*
       * **Y por la ruta de la aproximación, si a diez kilómetros todavía no es
       * recta.** Se ponía el avión siempre en el eje, y en la 18 de La Palma
       * el eje a diez kilómetros es la ladera de Puntallana: su aproximación
       * llega por el mar desde el noreste y entra a la vista en el eje a dos
       * millas y media. Ahí se pone en la ruta del plan, a diez kilómetros del
       * umbral contados por ella, y se vuela por sus puntos hasta la final
       * recta. Ver `porLaRutaDeLlegada`.
       */
      const enLaRuta = u ? porLaRutaDeLlegada(o.planDeVuelo?.(), u, DESDE) : null;
      const f = enLaRuta ?? o.puntoDeFinalDe(DESDE, destino);
      if (!f || !u) return { etapa: "sin destino", destino };
      aLaVista = enLaRuta ? enLaRuta.fijos : null;
      finalALaVista = enLaRuta !== null;
      const alli = u.suelo;
      const aproximacion = o.avion().aproximacion;
      const enLaSenda = alli + (DESDE + 250) * SENDA + (suyas.tren ?? 0);
      o.colocar(f.x, enLaSenda, f.z, aproximacion + 3, f.h);
      /*
       * **Y un reactor llega a los cuatro kilómetros estabilizado, como uno de
       * verdad**: tren fuera, flaps de aterrizaje y a su velocidad de
       * aproximación en indicada.
       *
       * Se colocaba limpio —tren dentro y flaps arriba, como venía de la
       * subida— y a la Vref más tres metros por segundo en verdadera. Limpio,
       * el JAZ 90 entra en pérdida a su Vref —esa Vref es la de los flaps
       * fuera—, y en Los Rodeos, con el aire del día, 71 m/s de verdadera eran
       * justo su pérdida limpia: aparecía ya con el avisador sonando, se tiraba
       * abajo para coger velocidad y los flaps tardaban dieciocho segundos en
       * salir. Cinco «stall, stall» antes de tener flaps, medidos con la traza
       * del ala. Ningún avión de línea llega así a tres millas: a mil pies ya
       * va configurado y a su velocidad, o se va al aire.
       *
       * Configurar de golpe es tan teletransporte como la posición y la
       * velocidad, y por el mismo motivo: el trayecto entre islas no se vuela.
       * Los flaps y el tren se ponen donde tienen que estar —su palanca y su
       * posición—; desde aquí se mueven solos como siempre.
       */
      /*
       * **Y los demás también**, que ahora vuelan la final como los reactores:
       * configurados y a la Vref más cinco nudos. Ver `configurar`.
       */
      {
        o.colocar(
          f.x,
          enLaSenda,
          f.z,
          enVerdadera(o.estado(), aproximacion + ADITIVO_DE_FINAL),
          f.h,
        );
        o.pedirTren?.(true);
        const conFlaps = suyas.llevaFlaps && !LIMPIO;
        if (conFlaps) o.pedirFlaps?.(1);
        const mandos = o.controles();
        mandos.tren = 1;
        if (conFlaps) mandos.flaps = 1;
      }
      await new Promise((r) => setTimeout(r, 500));
      enElDestino = o.campoDeAhora();
      // La frecuencia de allí empieza de cero: lo que se dio aquí, aquí se queda.
      conPermisoOido.clear();
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
      /*
       * **Y del viento en cola en adelante, la altura la da la senda que queda
       * por delante**, no la del vértice.
       *
       * Se iba a la altura de cada vértice, y la de la entrada en final está
       * en la senda pero la de la base no: la base se volaba a la altura del
       * circuito y se bajaba lo que se pudiera en el último tramo. Con la
       * avioneta sobra tiempo; con el JAZ 90 en Los Rodeos, no: entraba en
       * final doscientos metros por encima de la senda, se tiraba a ocho
       * metros por segundo para cogerla y a doscientos cincuenta pies le
       * cantaba el «sink rate». Un piloto de reactor planifica la bajada: a
       * tres grados desde el punto de toma por el camino que le queda —la
       * regla de las tres millas por cada mil pies—, y empieza a bajar en el
       * viento en cola cuando ese camino se acaba.
       */
      const porLaSenda =
        meta && v && aDonde >= 3 ? queQuedaHastaTocar(s, v, aDonde) * SENDA : Infinity;
      const altoQueToca = meta
        ? Math.min(meta.y - cotaDePista, porLaSenda + (suyas.tren ?? 0))
        : CRUCERO;
      ultimoAltoQueToca = altoQueToca;
      const subiendo = alto(s) < altoQueToca - 15;
      const quiereIr = velocidadDelTramo(aDonde);
      /*
       * **Y subiendo, el gas a tope solo mientras haga falta.**
       *
       * Con el gas a fondo y el morro a doce grados, un reactor ligero acelera
       * sin parar: medido en Los Rodeos, el JAZ 90 pasaba de 102 a 123 metros
       * por segundo entre los treinta y los ciento veinte metros de altura, y
       * al dejar de volar por actitud —ver `ASENTAR_LA_SUBIDA`— la palanca
       * encontraba treinta metros por segundo de sobra y se los comía en un
       * zoom hasta los ochocientos, muy por encima del circuito. De ahí bajaba
       * al viento en cola al ralentí y a ciento veinte, sin manera de frenar.
       *
       * Un piloto de verdad no despega un reactor ligero con todo el empuje y
       * lo deja acelerar: sube con el empuje que da la velocidad que toca, y
       * esa es la de subida o la de circuito, la que sea más alta. La palanca
       * sigue llevando lo suyo y el gas solo recorta lo que sobra.
       *
       * **Menos en Guyrami**, cuyo modelo es el sencillo: ahí el gas **es** la
       * velocidad y sin gas de sobra no se sube. Recortado, el JAZ 120 se
       * quedaba subiendo al uno por ciento a ras de suelo. Allí se sube con
       * todo y la de circuito se coge al nivelar, que ese modelo frena en
       * cuanto se le quita el gas.
       */
      const topeSubiendo = Math.max(VELOCIDAD_DE_SUBIDA, DE_CIRCUITO);
      const gasSubiendo =
        NECESITA_TECNICA && peldano !== "guyrami"
          ? Math.max(0, Math.min(1, 0.55 + (topeSubiendo - s.airspeed) * 0.04))
          : 1;
      c.throttle = subiendo
        ? gasSubiendo
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
      sostenerLaAltura(
        s,
        subiendo,
        altoQueToca,
        porLaSenda + (suyas.tren ?? 0) < (meta?.y ?? Infinity) - cotaDePista
          ? -porElSuelo(s) * SENDA
          : 0,
        // Y las hélices del modelo completo, del viento en cola en adelante:
        // ver `CON_EL_AUTOMATICO`.
        CON_EL_AUTOMATICO && aDonde >= 3 && !subiendo,
      );

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
        if (cuanto > largo - margenDeViraje(s, aDonde)) {
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
      const puntoDeToma = Math.min(250, (r.length - (r.desplazado ?? 0)) * 0.2);
      /*
       * **Y lo que va por la senda son las ruedas, no el centro del avión.**
       * La altura que se pedía era la del origen del modelo, que en el JAZ 120
       * va seis metros por encima de sus ruedas: las ruedas llegaban a la
       * senda por debajo, y más cuanto más grande el avión.
       */
      const tren = suyas.tren ?? 0;
      const ruedas = alto(s) - tren;
      /*
       * **Y por la ruta mientras la final no sea recta**: la senda es la de
       * tres grados por lo que queda de ruta, hasta el punto del eje y de ahí
       * al umbral. Ver `aLaVista`.
       */
      let queda = falta;
      if (aLaVista?.length) {
        queda = Math.hypot(aLaVista[0].x - s.position.x, aLaVista[0].z - s.position.z);
        for (let k = 1; k < aLaVista.length; k++)
          queda += Math.hypot(aLaVista[k].x - aLaVista[k - 1].x, aLaVista[k].z - aLaVista[k - 1].z);
        const ultimoDeLaVista = aLaVista[aLaVista.length - 1];
        const u0 = finalAhora(0);
        if (u0) queda += Math.hypot(u0.x - ultimoDeLaVista.x, u0.z - ultimoDeLaVista.z);
      }
      const objetivo = Math.max(0, (queda + puntoDeToma) * SENDA) + tren;
      /*
       * **La velocidad de la final: la Vref más cinco nudos, en indicada y en
       * los seis aviones.**
       *
       * Estaba en dos leyes. Las hélices volaban a nueve décimas de su Vref y
       * sin flaps —afinado así porque a la Vref de la tarjeta «flotaban» y no
       * tocaban nunca—, y los reactores a la Vref más cinco. Lo de flotar no era
       * la velocidad: era que no había recogida, y la ley de altura se acercaba
       * al suelo sin llegar —ver `RITMO_AL_TOCAR`—. Nueve décimas de la Vref
       * sin flaps es volar la final al lado de la pérdida limpia, y el JAZ 60
       * la volaba en Los Rodeos con el avisador sonando.
       *
       * Un piloto de verdad vuela la final configurado y a la Vref más un
       * margen —cinco nudos, más con racha— y cruza el umbral a la Vref: el
       * margen se lo come la recogida con el gas fuera. Y por debajo de la Vref
       * no se tira de la palanca para sostener la senda: eso es lo que se
       * entrena para no hacer. Ver `aLaAltura`.
       */
      const deAproximacion = suyas.aproximacion ?? 33;
      const vref = enVerdadera(s, deAproximacion);
      const quiere = LIMPIO
        ? deAproximacion * 0.91
        : enVerdadera(s, deAproximacion + ADITIVO_DE_FINAL);
      /*
       * **Y el gas lleva la velocidad, y también la senda por debajo.**
       *
       * Con el gas atado únicamente a la velocidad, el final entero se volaba
       * al ralentí: al ralentí ningún avión baja tres grados — baja cuatro y
       * pico, y se llegaba por debajo de la senda. Medido en La Palma con el
       * Tukã: tocar **ciento cincuenta y tres metros antes del umbral**, en el
       * mar. Así que por debajo de la senda se mete gas. Con banda muerta, que
       * un gas de dos estados se le nota al avión: en La Palma, con el de dos
       * estados se tocaba a 22,6 m del eje y con tres metros por segundo de
       * banda, a 0,3.
       *
       * **Y con velocidad de sobra no se mete gas, vaya donde vaya la senda.**
       * Era solo de los reactores —al JAZ 90 en Asunción la senda le metía gas
       * con 116 m/s y lo llevaba a 160— y es la regla de todos: si se va rápido
       * y bajo, morro arriba y el gas quieto.
       */
      const porVelocidad =
        s.airspeed < quiere ? 0.05 : s.airspeed > quiere + 3 ? -0.05 : 0;
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
       * **Y en la velocidad buena, el gas lleva la senda en los dos
       * sentidos.** Con `max(velocidad, senda)`, ir en la banda de velocidad
       * daba un cero que se comía el «quitá gas» de ir alto, y cada vez que la
       * velocidad rozaba por debajo se metía una décima de más: el JAZ 60 hizo
       * la final de Los Rodeos entera con el gas a fondo, alto y con la
       * palanca adelante. La velocidad sigue mandando cuando se sale de la
       * banda: lento, gas; rápido, menos.
       */
      const cambio =
        porVelocidad < 0
          ? porVelocidad
          : porVelocidad > 0
            ? Math.max(porVelocidad, porSenda)
            : porSenda;
      c.throttle = Math.max(0, Math.min(1, c.throttle + cambio));
      /*
       * **La recogida empieza aquí.** A la altura que dan unos segundos de
       * senda —ver `SEGUNDOS_DE_RECOGIDA`— y cerca del umbral: bajo y lejos no
       * es recoger, es ir corto, y eso lo arregla el gas. Desde aquí manda el
       * gancho de cada fotograma: ver `recoger`.
       */
      /*
       * Con lo que baja de verdad, si baja más que la senda: el que llega
       * bajando de más necesita más altura para recoger, no la misma.
       */
      const caidaDeSenda = Math.max(porElSuelo(s) * SENDA, -s.verticalSpeed);
      const alturaDeRecogida = Math.max(
        4,
        Math.min(15, caidaDeSenda * SEGUNDOS_DE_RECOGIDA),
      );
      if (
        !recogida &&
        !s.onGround &&
        ruedas <= alturaDeRecogida &&
        falta < alturaDeRecogida / SENDA + 150
      ) {
        const p = o.avion?.()?.cabeceo;
        recogida = {
          altura: alturaDeRecogida,
          /*
           * Desde lo que baja, o desde la senda si baja más: quien llega
           * bajando de más —una racha, la senda cogida tarde— tiene que
           * empezar a recoger ya, no repartir el exceso hasta el suelo. En Los
           * Rodeos, con veinte nudos, el JAZ 90 empezaba la recogida bajando a
           * seis y la repartía: tocaba a cuatro.
           */
          caida: Math.max(
            RITMO_AL_TOCAR,
            Math.min(6, -s.verticalSpeed, porElSuelo(s) * SENDA * 1.1),
          ),
          palanca:
            CON_EL_AUTOMATICO && palancaMedia !== null
              ? palancaMedia
              : (o.controles().elevator ?? c.elevator),
          porAngulo:
            !SENCILLO && p && p.cmElevator
              ? Math.abs(p.cmAlpha / p.cmElevator)
              : 0,
          acumulado: 0,
          ultimo: o.reloj(),
          velocidad: s.airspeed,
          gas: c.throttle,
        };
        empezoLaRecogida = {
          ruedas: +ruedas.toFixed(1),
          umbral: Math.round(-falta),
          caida: +(-s.verticalSpeed).toFixed(1),
          nudos: Math.round(o.velocidadDeCabina?.() ?? 0),
        };
      }
      if (recogida) {
        /*
         * Gas fuera, que es lo que deja tocar a la Vref. En Guyrami, quieto
         * donde estaba: ahí el gas es la velocidad y además la mitad de lo que
         * baja, y si la ley de la final lo sigue moviendo sobre la pista —la
         * senda ya no pide nada y lo va quitando— la palanca pierde mano a la
         * vez que el avión se hunde. La palanca la lleva `recoger`.
         */
        c.throttle = SENCILLO ? recogida.gas : 0;
      } else {
        /*
         * Con la misma ley de altura que arriba: bajada limitada y
         * amortiguada. Ver `aLaAltura`. Y el suelo para tirar es la Vref: por
         * debajo, la senda se recupera con gas y no con la palanca.
         */
        c.elevator = SENCILLO
          ? porLaSendaSencilla(s, objetivo, paso)
          : aLaAltura(s, objetivo, vref);
        /*
         * Y un reactor, con el morro del automático por la misma senda: la
         * altura que pide, y el ritmo al que baja por el suelo. Ver
         * `volarLaSenda`.
         */
        if (CON_EL_AUTOMATICO)
          senda = {
            altitud: s.position.y + (objetivo - alto(s)),
            ritmo: objetivo > tren ? -porElSuelo(s) * SENDA : 0,
            desde: o.reloj(),
          };
      }
      /*
       * **Y la puerta de la final estabilizada**: a mil pies si la final pasa
       * por ellos y, si no, a quinientos. Ver `PUERTA_ALTA`.
       */
      masAltoEnFinal = Math.max(masAltoEnFinal, ruedas);
      /*
       * Lo que baja, de media en los últimos cinco segundos: el criterio es
       * no bajar a más de mil pies por minuto de forma sostenida, y una racha
       * de Los Rodeos pasa de cuatro a siete en un segundo y vuelve.
       */
      bajadaReciente.push({ t, baja: -s.verticalSpeed });
      while (bajadaReciente.length && t - bajadaReciente[0].t > 5)
        bajadaReciente.shift();
      /*
       * La de mil pies, solo en la final larga de un destino: en el circuito
       * se entra en final más alto que eso en algunos campos, pero virando
       * desde la base, y eso es visual — quinientos. Ver `PUERTA_ALTA`.
       */
      const puerta =
        enElDestino && masAltoEnFinal >= PUERTA_ALTA && !finalALaVista
          ? PUERTA_ALTA
          : PUERTA_BAJA;
      if (!enLaPuerta && ruedas <= puerta && falta > 0) {
        const trayectoria = Math.atan2(s.velocity.x, -s.velocity.z);
        const mandosAhora = o.controles();
        enLaPuerta = {
          pies: Math.round(puerta / 0.3048),
          empezoPorDebajo: masAltoEnFinal < puerta + 1,
          nudos: Math.round(o.velocidadDeCabina?.() ?? s.airspeed * 1.94384),
          vref: Math.round(deAproximacion * 1.94384),
          limpio: LIMPIO,
          flaps: +(mandosAhora.flaps ?? 0).toFixed(2),
          tren: +(mandosAhora.tren ?? 1).toFixed(2),
          senda: +(alto(s) - objetivo).toFixed(1),
          tolSenda: +Math.max(
            5,
            (falta + puntoDeToma) * Math.tan((0.35 * Math.PI) / 180),
          ).toFixed(1),
          eje: +desvio(s).toFixed(1),
          tolEje: +Math.max(
            r.width ?? 30,
            (falta + r.length - (r.desplazado ?? 0) + 300) *
              Math.tan((0.5 * Math.PI) / 180),
          ).toFixed(1),
          rumbo: +((Math.abs(error(trayectoria, hp)) * 180) / Math.PI).toFixed(1),
          baja: +(
            bajadaReciente.reduce((a, b) => a + b.baja, 0) /
            Math.max(1, bajadaReciente.length)
          ).toFixed(1),
        };
      }
      // Y en final, ya configurado del todo: tren fuera y flaps. Ver
      // `configurar`, que en el tramo 4 pide las dos cosas.
      configurar(s, c, 4, true);
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
       * **En todos**, no solo en los reactores: el JAZ 60 vuela la final a
       * cincuenta, y con la mirada de la avioneta llegaba a la pista todavía
       * serpenteando.
       */
      /*
       * **Y nunca más cerca que dos radios de viraje mientras quede
       * final**: persiguiendo un punto más cerca de lo que el avión puede
       * girar, se pasa del eje y vuelve —el JAZ 60 salía de la base a 585 m
       * del eje y se iba 300 m al otro lado; el JAZ 90, 1.800—. Con la mirada
       * más larga que el arco, la captura es una curva que se acuesta en el
       * eje. Cerca del umbral manda la de siempre.
       */
      const radio =
        (s.airspeed * s.airspeed) /
        (9.81 * Math.tan(TOPE_DE_INCLINACION_EN_LA_BASE));
      const mirada = Math.max(
        Math.max(120, Math.min(300, falta * 0.4)) *
          Math.max(1, s.airspeed / 33),
        Math.min(2 * radio, falta * 0.6),
      );
      const tx = r.x + fx * (along + mirada);
      const tz = r.z + fz * (along + mirada);
      c.aileron = alPuntoPorElSuelo(s, tx, tz);
      /*
       * **Y mientras quede ruta antes de la final recta, por sus puntos**, con
       * el viraje anticipado lo que mide su arco: un punto se pasa de pasada,
       * como lo pasa un ordenador de vuelo. Con el último, a la final por el
       * eje, que es lo de arriba.
       */
      if (aLaVista?.length) {
        const sig = aLaVista[0];
        const tras = aLaVista[1] ?? finalAhora(0);
        c.aileron = alPuntoPorElSuelo(s, sig.x, sig.z);
        const va = Math.atan2(sig.x - s.position.x, -(sig.z - s.position.z));
        const luego = tras ? Math.atan2(tras.x - sig.x, -(tras.z - sig.z)) : va;
        const giro = Math.abs(error(luego, va));
        const antesDeGirar = radio * Math.tan(Math.min(giro, 2.6) / 2) + 100;
        if (Math.hypot(sig.x - s.position.x, sig.z - s.position.z) < antesDeGirar) {
          aLaVista = aLaVista.slice(1);
          if (aLaVista.length === 0) aLaVista = null;
        }
      }
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
        // Con signo: negativo es antes del umbral de aterrizaje.
        tocoPasadoElUmbral = -falta;
        pistaParaTocar = r.length - (r.desplazado ?? 0);
        /*
         * Y a qué ritmo: lo apunta el juego en el instante de tocar, que es
         * cuando se sabe —ver `caidaAlTocar` en `aterrizaje.ts`—. Esta muestra
         * llega hasta una décima tarde, con el avión ya rodando.
         */
        const delJuego = o.caida?.();
        caidaAlTocar =
          typeof delJuego === "number" && delJuego > 0 ? delJuego : ultimaCaida;
        recogida = null;
        desplazadoAlTocar = r.desplazado ?? 0;
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
      /*
       * **Y un reactor, con el morro abajo.** Tocando a su Vref con los flaps
       * de aterrizaje, el ala todavía sostiene el avión entero: con la
       * palanca en el centro, el JAZ 90 volvía a volar cinco metros y un
       * tercio de la frenada iba por el aire. Uno de verdad saca los
       * aerofrenos del suelo y baja la rueda de morro en cuanto toca; aquí no
       * hay aerofrenos, y bajar el morro es lo que queda.
       */
      c.elevator = REACTOR_COMPLETO ? -0.3 : 0;
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
      /*
       * **Y a la de rodaje, no a empujones.** Esto era gas al sesenta por
       * ciento por debajo de la velocidad pedida y freno a fondo dos metros
       * por segundo por encima: con una avioneta, un vaivén; con un reactor,
       * que a seis décimas de gas empuja lo que un despegue corto, un tirón
       * detrás de otro hasta pasarse. En el circuito de Los Rodeos con el JAZ
       * 90, «más despacio» sonaba hasta cinco veces en la vuelta.
       *
       * Se rueda como se rueda: el gas justo —el que sostiene nueve metros por
       * segundo en ese avión es de cinco a diez centésimas, ver
       * `gasParaRodar`—, buscado poco a poco, y el freno cuando sobra. Y nunca
       * por encima de la de rodaje, pida lo que pida la raya.
       */
      // Y al final de la ruta pide cero, que es pararse encima de la raya.
      const quiere = Math.min(9, o.rodaje() ?? 9);
      const vaA = porElSuelo(s);
      c.throttle = Math.max(
        0,
        Math.min(0.4, c.throttle + Math.max(-0.03, Math.min(0.03, (quiere - vaA) * 0.01))),
      );
      if (vaA > quiere + 0.5) c.throttle = Math.min(c.throttle, 0.02);
      c.brakes = vaA > quiere + 1.5 ? Math.min(1, (vaA - quiere - 1.5) * 0.5) : 0;
      if (!s.onRunway) rodajeMasRapido = Math.max(rodajeMasRapido, vaA);
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
      /*
       * **Con la llave, que es como se apaga.** Esto escribía `engineOn` en
       * los mandos y el juego no se enteraba de que se había apagado: no
       * pasaba por `toggleEngine`, que es donde llega el camión del
       * combustible en el campo de llegada. Así que el banco no veía nunca el
       * depósito con el que se sale de vuelta. Con el avión quieto y el gas
       * ya cerrado se gira la llave; si en cinco segundos no se ha podido,
       * se apaga a mano, que es lo que hacía antes.
       */
      esperandoParaApagar += paso;
      /*
       * **Y con la seña de cortar motores, no antes.** Quien juega apaga
       * cuando el señalero se lo dice, después del alto, los frenos y los
       * calzos; apagar antes era lo que salía en la tarjeta de «llegaste,
       * apagá el motor», tapándole. Se espera a esa seña si hay señalero
       * haciendo señas, con su red: veinte segundos.
       */
      const elSenalero = o.senalero?.();
      const sena = elSenalero?.grupo?.visible ? elSenalero.gestoDeAhora : null;
      const esperaLaSena = !!sena && sena !== "cortar" && esperandoParaApagar < 20;
      if (
        c.engineOn &&
        !esperaLaSena &&
        porElSuelo(s) < 1 &&
        (o.controles().throttle ?? 0) <= 0.05 &&
        o.tocarMando
      ) {
        senalero.alApagar ??= sena ?? "ninguna";
        /*
         * Y dónde estaba el avión respecto a su sitio y a qué iba: una seña
         * que no pasa del alto puede ser un avión pasado de la raya o uno que
         * no acaba de pararse, y son dos arreglos distintos.
         */
        senalero.alApagarComo ??= `a ${elSenalero?.comoVa?.restante ?? "?"} m de su sitio, a ${porElSuelo(s).toFixed(2)} m/s, tras ${esperandoParaApagar.toFixed(0)} s esperando`;
        o.tocarMando("motor");
        if (!o.controles().engineOn) c.engineOn = false;
      }
      if (esperandoParaApagar > 25) c.engineOn = false;
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
    // Mirado mientras se estaba allí, no cortando la lista al final: tiene
    // tope, y en un vuelo largo lo de allí ya no está donde se cortaba.
    const dicho = clearedLandAlli;
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
      traficoVisto: traficoVistoAlli,
      traficoMasLejos: traficoMasLejosAlli,
      conFrecuencia: o.conFrecuencia?.(destino) ?? true,
      frecuenciaOida: frecuenciaOidaAlli.slice(0, 6),
      frecuenciaOidaCuantas: frecuenciaOidaAlli.length,
    };
  })();


  const resultado = {
    etapa,
    alli,
    deVuelta: null,
    terrenoEnFinalAlli,
    tusAutorizaciones,
    esperandoPorAlguien,
    rojaMasLarga,
    rojaMasLargaDonde,
    deFrente,
    deFrenteDonde,
    radar,
    porQueSeDijo,
    // Si el campo donde se aterriza tiene torre: el de llegada, o el de ahora.
    aterrizaConTorre: o.conFrecuencia?.(destino ?? undefined) ?? true,
    saleConAfis,
    aterrizaConAfis,
    ordenesEnUnAfis,
    lamparaEnUnAfis,
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
    cambiosDeFase,
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
    trazaCoche,
    // Con qué letras te nombra la torre, para distinguir lo tuyo de lo de
    // los demás en `habladas`.
    misLetras: Object.entries(o.indicativo?.()?.deTorre ?? {})
      .filter(([k]) => /^c\d/.test(k))
      .map(([, v]) => v)
      .join("-"),
    // Todo lo que dijo cada boca, para poder contarlo al final del parte.
    todoLoDicho: o.dichoTodo?.() ?? {},
    /*
     * **Y la voz de la máquina, que no pasa por ninguna boca**: la cuenta y
     * los avisos de las cajas. Con la cuenta, cada número con lo que marcaba
     * el radioaltímetro al pedirlo. Ver `audio/maquina.ts`.
     */
    maquina: o.maquina?.() ?? [],
    cuentaOida: o.cuentaOida?.() ?? [],
    // Y lo que sonó por la megafonía, en orden: el guion de la cabina.
    megafonia: o.megafonia?.() ?? [],
    pistaDeOtros,
    pistaDeOtrosDonde,
    dadaAOtroTrasLaTuya,
    sinAnularAlDartela,
    frustradasPorLaPista,
    frustradasPorElJuego,
    bajandoATuPista,
    bajandoATuPistaDonde,
    enTuPistaSinOrden,
    enTuPistaSinOrdenDonde,
    alCostadoDeTuPista,
    pistaOcupadaPuesta,
    ventanillaEnFinal,
    ventanillaQueSube,
    dosEnLaPista,
    dosEnLaPistaDonde,
    sinHueco,
    sinHuecoDonde,
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
      alApagar: senalero.alApagar,
      alApagarComo: senalero.alApagarComo,
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
    lejosEsperando: Math.round(lejosEsperando),
    cochePisaLaPista,
    quienRecibe,
    ruedasAlAterrizar,
    cocheEnElAire: +cocheEnElAire.toFixed(2),
    cocheEnElAireDonde,
    cocheEnPista: Number.isFinite(cocheEnPista)
      ? Math.round(cocheEnPista)
      : null,
    cocheEnPistaDonde,
    cocheCercaEnPista: Number.isFinite(cocheCercaEnPista)
      ? Math.round(cocheCercaEnPista)
      : null,
    lejosDondeCoche,
    enBici: o.enBici?.() ?? false,
    biciGuiando: +biciGuiando.toFixed(1),
    biciVista: +biciVista.toFixed(1),
    saleConTorre,
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
    idaMetros: Math.round(idaMetros),
    largoDeLaIda: Math.round(largoDeLaIda),
    vuelta: +tiempoDeRodajeVuelta.toFixed(0),
    despego: +despego.toFixed(0),
    toco: +toco.toFixed(0),
    tocoDesviado: +tocoDesviado.toFixed(1),
    tocoPasadoElUmbral: Math.round(tocoPasadoElUmbral),
    pistaParaTocar: Math.round(pistaParaTocar),
    caidaAlTocar: caidaAlTocar === null ? null : +caidaAlTocar.toFixed(2),
    enLaPuerta,
    empezoLaRecogida,
    rodajeMasRapido: +rodajeMasRapido.toFixed(1),
    desplazadoAlTocar: Math.round(desplazadoAlTocar),
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
  /*
   * **Y el tramo de vuelta, que no lo arrancaba nadie.**
   *
   * El banco acababa en «apagado» en el campo de llegada, así que nada miraba
   * lo que pasa al volver a arrancar allí: con qué depósito se sale, a dónde
   * dice la ruta que se va y si el coche del sígame vuelve a guiar o se queda
   * apartado donde lo dejó la llegada. Y la aguja al decidir volverse a medio
   * camino, que señalaba al campo más cercano en vez de al de salida.
   *
   * Va lo último, con todo lo del vuelo ya leído: arrancar abre un tramo nuevo
   * —cierra el panel del final, pone los galones a cero— y el avión acaba
   * volando hacia casa.
   *
   * Se arranca con la llave, se deja un momento al juego y se mira. Después
   * se pone el avión volando al sesenta por ciento del camino a casa, se
   * decide volver —la vuelta al campo de salida del tramo— y se lee la aguja.
   */
  resultado.deVuelta = await (async () => {
    if (!destino || o.fase() !== "apagado") return null;
    const kilosAlApagar = o.combustible?.()?.kilos ?? null;
    c.throttle = 0;
    c.brakes = 1;
    o.tocarMando?.("motor");
    c.engineOn = true;
    await new Promise((r) => setTimeout(r, 2500));
    const ruta = o.rutaDelVuelo?.() ?? null;
    const lectura = {
      kilosAlApagar,
      kilos: o.combustible?.()?.kilos ?? null,
      carga: o.cargaDelTramo?.() ?? null,
      ruta,
      fase: o.fase(),
      raya: (o.ruta?.() ?? []).length,
      apartado: o.cocheApartado?.() ?? null,
      aguja: null,
      alUmbral: null,
    };
    const u = o.puntoDeFinalDe?.(0, destino);
    const casa = ruta?.destino ? o.puntoDeFinalDe?.(0, ruta.destino) : null;
    if (!u || !casa) return lectura;
    const x = u.x + (casa.x - u.x) * 0.6;
    const z = u.z + (casa.z - u.z) * 0.6;
    const rumbo = (Math.atan2(casa.x - u.x, -(casa.z - u.z)) + 2 * Math.PI) % (2 * Math.PI);
    o.ponerDestino?.(destino);
    /*
     * **Volando de verdad: por encima del suelo que haya ahí debajo.**
     *
     * Iba a mil quinientos metros a secas, y de La Gomera a Los Rodeos la
     * recta pasa por las faldas del Teide: al sesenta por ciento el suelo
     * está a mil seiscientos veintidós. El avión quedaba dentro del monte, el
     * modelo lo subía a la ladera y el juego, con razón, lo daba por rodando;
     * y en tierra la aguja señala la pista que se tiene más cerca, que desde
     * allí es Tenerife Sur, a treinta y un kilómetros. El rojo «señala a 31,6
     * km · el umbral de la-gomera está a 59,5 km» (#104) era eso, y no la
     * aguja: medido con el avión a seiscientos metros sobre el suelo, señala
     * La Gomera a 59,4 con el umbral a 59,4.
     */
    const alto = Math.max(1500, (o.suelo?.(x, z) ?? 0) + 600);
    o.colocar(x, alto, z, o.avion().aproximacion + 20, rumbo);
    await new Promise((r) => setTimeout(r, 800));
    lectura.aguja = o.aguja?.() ?? null;
    const ahora = o.estado().position;
    lectura.alUmbral = Math.round(Math.hypot(u.x - ahora.x, u.z - ahora.z));
    // Y si no está volando, que se diga: la aguja en tierra mira otra cosa.
    lectura.enElSuelo = o.estado().onGround;
    return lectura;
  })();
  return resultado;
}, [VECES, DESTINO, TRAMO, CRUCERO_PEDIDO, !!process.env.OGA_TRAZA_COCHE, A_TIEMPO_REAL, process.env.OGA_PISTA_OCUPADA === "1"]);
fotografiando = false;
await fotos;
/** Lo que de verdad sonó en el vuelo. Ver `scripts/oido.mjs`. */
const oido = await loOido(page);
const frasesDelVuelo = frasesOidas(oido.sonidos);
const ceroDelOido = frasesDelVuelo[0]?.t0 ?? 0;
const turbulenciaDelVuelo = await page
  .evaluate(() => globalThis.__oga?.turbulencia?.() ?? null)
  .catch(() => null);
/** Si el avión lleva tripulación de cabina: toboganes, servicio, cinturones. */
const llevaTripulacion = await page
  .evaluate(() => !!globalThis.__oga?.avion?.().conTripulacion)
  .catch(() => false);
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
      {
        habladas: vuelo.habladas,
        descartes: vuelo.descartes,
        todo: vuelo.todoLoDicho,
        maquina: vuelo.maquina,
        // Y lo que pasó con las aves de la final. Ver `vigilarLasAves`.
        aves: (vuelo.cantados ?? []).filter((c) => c.startsWith("aves:")),
        cuenta: vuelo.cuentaOida,
        megafonia: vuelo.megafonia,
        /*
         * Y lo que de verdad sonó, con su voz, su hora de audio **y cuándo
         * acabó**: sin el final, una frase de diez segundos se lee como diez
         * segundos de boca callada.
         */
        oido: frasesDelVuelo.map(
          (f) => `${enUnaLinea(f, ceroDelOido)} → ${(f.t1 - ceroDelOido).toFixed(1)}s`,
        ),
        navegador: oido.navegador,
        turbulencia: turbulenciaDelVuelo,
      },
      null,
      1,
    ),
  );
}

if (process.env.OGA_TRAZA_ALA) {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(
    process.env.OGA_TRAZA_ALA,
    JSON.stringify({
      avion: vuelo.avion ?? null,
      cantados: (vuelo.cantados ?? []).filter((c) => /stall/.test(c)),
      maquina: (vuelo.maquina ?? []).filter((m) => /stall/.test(m)),
      traza: await page.evaluate(() => globalThis.__trazaAla ?? []),
    }),
  );
}

if (process.env.OGA_TRAZA_COCHE) {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(process.env.OGA_TRAZA_COCHE, (vuelo.trazaCoche ?? []).join("\n") + "\n");
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
 * ── Lo que se oyó de verdad ─────────────────────────────────────────────
 *
 * Enrique: «todo el vuelo en silencio y cuando hablan lo hacen todos juntos»,
 * y el crosscheck de Jazlyn, que no sonaba en su casa y aquí se daba por
 * dicho. Estas tres miran el altavoz, no el historial. Ver `oido.mjs`.
 */
{
  const choques = seSolapan(frasesDelVuelo);
  comprobar(
    "y nunca suenan dos voces a la vez, salvo la máquina",
    frasesDelVuelo.length > 0 && choques.length === 0,
    choques.length
      ? `${choques.length} veces: ` +
          choques
            .slice(0, 4)
            .map((c) => `${enUnaLinea(c.a, ceroDelOido)} ✕ ${enUnaLinea(c.b, ceroDelOido)} (${c.encima.toFixed(1)} s)`)
            .join(" | ")
      : `${frasesDelVuelo.length} frases oídas, ninguna de personas encima de otra`,
    "«todo el vuelo en silencio y cuando hablan lo hacen todos juntos»",
  );
  /*
   * **Y todo lo que pidió la megafonía, sonó con su voz.** Lo pedido sale del
   * historial de sus dos bocas; lo oído, del altavoz. Una frase pedida que no
   * llegó al altavoz es justo el silencio de casa.
   */
  const todo = vuelo.todoLoDicho ?? {};
  const pedidas = [...(todo.comandante ?? []), ...(todo.tripulacion ?? [])].map((c) =>
    c.replace(/~\d+$/, ""),
  );
  const prefijo = (c) =>
    c === "comandante.bienvenidaConPlan"
      ? "comandante.bienvenida"
      : c.startsWith("tripulacion.")
        ? c.split(".").slice(0, 2).join(".")
        : c;
  const deLaMegafonia = frasesDelVuelo.filter(
    (f) => f.voz === "comandante" || f.voz.startsWith("tripulacion"),
  );
  const usadas = new Set();
  const sinSonar = [];
  for (const c of pedidas) {
    const i = deLaMegafonia.findIndex(
      (f, j) => !usadas.has(j) && f.piezas.some((p) => p.startsWith(prefijo(c))),
    );
    if (i < 0) sinSonar.push(c);
    else usadas.add(i);
  }
  /*
   * **Y solo en el avión que la lleva.** En el JAZ 20 no hay pasaje ni
   * megafonía, así que no se pide nada y esto salía en rojo con «0 de 0»:
   * medía que una avioneta no tiene comandante que hable al pasaje, que es
   * justo lo correcto. Ahí lo que se comprueba es lo contrario: que la
   * megafonía calle.
   */
  if (conMegafonia)
    comprobar(
      "y todo lo que pidió la megafonía, sonó con su voz",
      pedidas.length > 0 && sinSonar.length === 0,
      sinSonar.length
        ? `sin sonar: ${sinSonar.join(", ")} · pedidas ${pedidas.length}, oídas ${deLaMegafonia.length}`
        : `${pedidas.length} de ${pedidas.length}: ${pedidas.join(", ")}`,
      "«Tripulación, armar toboganes y verificación cruzada» no se oye",
    );
  else
    comprobar(
      "y en un avión sin pasaje la megafonía calla",
      pedidas.length === 0 && deLaMegafonia.length === 0,
      pedidas.length || deLaMegafonia.length
        ? `pedidas ${pedidas.length}: ${pedidas.join(", ") || "—"} · oídas ${deLaMegafonia.length}`
        : "ni pedida ni oída: no hay pasaje a quien hablar",
      "«0 de 0» en rojo con el JAZ 20, que no lleva megafonía",
    );
  /*
   * **Y los anuncios de Jazlyn del puesto a la despedida**, donde hay
   * tripulación que armar y pasaje que despedir.
   */
  const deJazlyn = deLaMegafonia.filter((f) => f.voz === "comandante");
  if (llevaTripulacion) {
    const debe = [
      "comandante.crosscheck",
      "comandante.bienvenida",
      "comandante.despegue",
      ...(DESTINO ? ["comandante.llegada"] : []),
    ];
    const faltan = debe.filter(
      (a) => !deJazlyn.some((f) => f.entera && f.piezas.some((p) => p.startsWith(a))),
    );
    comprobarSiVolo(
      "y suenan los anuncios de Jazlyn, enteros, del puesto a la despedida",
      faltan.length === 0,
      faltan.length
        ? `no sonaron: ${faltan.join(", ")} · de ella se oyó: ${deJazlyn.map((f) => f.piezas[0]).join(", ") || "nada"}`
        : deJazlyn.map((f) => enUnaLinea(f, ceroDelOido)).join(" · "),
      "jazlyn-es-el-centro",
    );
  }
  /*
   * **Y la turbulencia que se anuncia, llega**: la prevista, antes de
   * llegar; la de aire claro, cuando ya se mueve. Solo si se pidió una.
   */
  if (ZONA_PEDIDA) {
    const anuncios = (turbulenciaDelVuelo?.sucesos ?? []).filter(
      (s) => s.suceso.que === "anunciar",
    );
    const primero = anuncios[0];
    const oidaLaTurbulencia = deJazlyn.some((f) =>
      f.piezas.some((p) => p.startsWith("comandante.turbulencia")),
    );
    const enSuOrden =
      !!primero &&
      (ZONA_PEDIDA.como === "sin-avisar"
        ? primero.volado >= ZONA_PEDIDA.desde - 1500
        : primero.volado < ZONA_PEDIDA.desde);
    comprobarSiVolo(
      `y la turbulencia ${ZONA_PEDIDA.como} se anuncia en su orden, y suena`,
      enSuOrden && oidaLaTurbulencia,
      primero
        ? `anunciada a ${(primero.volado / 1000).toFixed(1)} km (la zona, de ${ZONA_PEDIDA.desde / 1000} a ${ZONA_PEDIDA.hasta / 1000} km) · ` +
            `${oidaLaTurbulencia ? "sonó" : "no sonó"} · ${(turbulenciaDelVuelo?.sucesos ?? []).map((s) => `${s.suceso.que}@${(s.volado / 1000).toFixed(1)}km`).join(" ")} · volado ${((turbulenciaDelVuelo?.volado ?? 0) / 1000).toFixed(1)} km`
        : `no se anunció · volado ${((turbulenciaDelVuelo?.volado ?? 0) / 1000).toFixed(1)} km`,
      "«la turbulencia que anuncia Jazlyn no existe»",
    );
  }
}
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
  // «Unos centímetros»: con un cuarto de metro cabía el tren metido en el
  // asfalto treinta y cinco, que era justo lo que había que ver.
  vuelo.flota !== null && Math.abs(vuelo.flota) < 0.05,
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
 * **Y donde contesta un AFIS, lo que dice un AFIS.** No da permisos: informa
 * de la pista y del tráfico, y quien vuela decide. Así que en su campo no se
 * pide la orden sino lo que se oye en su lugar —«runway in use zero two, no
 * reported traffic» en el punto de espera, «runway zero two free» para salir
 * o para bajar—, y en el de salida o en el de llegada según de cuál sea cada
 * cosa. Ver `EN_UN_AFIS` en `audio/torre.ts`.
 */
const LO_DICE_UN_AFIS = {
  "torre.holdShort": /^torre\.afis(?:NoTraffic|InUseLanding|InUseDeparting)$/,
  "torre.clearedTakeoff": /^torre\.afisFreeTakeoff$/,
  "torre.clearedLand": /^torre\.afisFree$/,
};
const conAfis = {
  "torre.holdShort": !!vuelo.saleConAfis,
  "torre.clearedTakeoff": !!vuelo.saleConAfis,
  "torre.clearedLand": vuelo.destino ? !!vuelo.aterrizaConAfis : !!vuelo.saleConAfis,
};
/** La clave sin el lado de la pista ni el habla del campo. */
const sinLadoNiHabla = (d) => d.replace(/\.[LCR]$/, "").replace(".canario.", ".");

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
/*
 * **Y la autorización de despegue, la tuya.** Con que la oyera cualquiera
 * bastaba, y la propia se caía en cada vuelo en Gran Canaria —«caducó
 * esperando» detrás del «hold short» de la luz roja, que seguía en la cola con
 * la luz ya verde—: la comprobación pasaba solo si la torre autorizaba a algún
 * avión del ambiente. Sin voz no hay cola que mirar, y entonces vale lo de
 * antes. Ver `luzDeTorre` en `game.ts`.
 */
const laPropia =
  !(vuelo.habladas ?? []).length ||
  (!!vuelo.misLetras &&
    (vuelo.habladas ?? []).some(
      (h) =>
        (vuelo.saleConAfis
          ? /torre\.(?:[a-z]+\.)?afisFreeTakeoff/
          : /torre\.(?:[a-z]+\.)?clearedTakeoff/
        ).test(h) && h.includes(`@${vuelo.misLetras}`),
    ));
/*
 * **Y un «hold short» retirado con razón no es una torre muda.**
 *
 * Si la luz se pone verde mientras tu «hold short» espera turno en la cola,
 * la torre lo retira: ya no es verdad, y decirlo sería mandarte parar cuando
 * te acaban de autorizar. Es lo que tiene que hacer —ver `retirar` en
 * `audio/boca.ts`—, y esto lo contaba como que la torre no lo había dicho
 * nunca. Vale solo **el tuyo** y solo con ese porqué —«ya no es verdad», no
 * «caducó esperando», que eso sí es callarse—; y lo demás se sigue pidiendo
 * igual, empezando por tu autorización de despegue, que es lo que hace
 * verdad que la luz se pusiera verde.
 */
const holdShortRetirado = (vuelo.descartes ?? []).some((d) => {
  const m =
    /\btorre\.(?:[a-z]+\.)?(?:holdShort(?:Landing|Departing)?|afis(?:NoTraffic|InUseLanding|InUseDeparting))(?:\.[LCR])?@([^:]+): ya no es verdad$/.exec(
      d,
    );
  return !!m && (m[1] === "yo" || (!!vuelo.misLetras && m[1] === vuelo.misLetras));
});
/*
 * **Y saliendo de una pista particular, la torre calla.** No hay torre: ni
 * lámpara que se ponga roja o verde ni voz que diga «mantenga fuera de
 * pista». Allí se para y se mira. Ver `guionSinTorre`.
 */
if (vuelo.saleConTorre === false)
  comprobar(
    "y en la pista de casa no enciende la luz ninguna torre",
    !(vuelo.torreDijo ?? []).some((d) => /(verde|roja)(?:\.[LCR])?$/.test(d)),
    `la torre dijo: ${vuelo.torreDijo?.join(" · ") || "nada"}`,
    "en la pista de hierba de la granja hablaba una torre que no existe",
  );
else comprobar(
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
      DE_UN_VUELO.every(
        (c) =>
          (vuelo.torreDijo ?? []).some((d) =>
            conAfis[c] ? LO_DICE_UN_AFIS[c].test(sinLadoNiHabla(d)) : sinLadoNiHabla(d) === c,
          ) ||
          (c === "torre.holdShort" && holdShortRetirado),
      ) && laPropia
    : /*
       * Y abajo, la lámpara dicha en castellano; donde contesta un AFIS, lo
       * que informa en su lugar: la pista libre o el tráfico que hay.
       */
      (vuelo.torreDijo ?? []).some((d) =>
        (vuelo.saleConAfis
          ? /(afisLibre|afisSinTrafico|afisTraficoAterriza|afisTraficoDespega)$/
          : /(verde|roja)(?:\.[LCR])?$/
        ).test(d),
      ),
  (conFraseologia && !laPropia
    ? "tu «cleared for take-off» no llegó a oírse · "
    : "") +
    (conFraseologia && holdShortRetirado
      ? "tu «hold short» se retiró porque la luz ya estaba verde · "
      : "") +
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
 * **Y la pista que es tuya no la tiene nadie más.** Ni alineado en el eje
 * durante tu toma, ni autorizado a aterrizar a la vez que vos, ni oído
 * recibiéndola después de tu autorización. Antes de dártela, la torre se la
 * quita a quien la tenga. Ver `despejarLaPista` en `flight/radio.ts`.
 */
comprobar(
  "la pista que es tuya no la tiene nadie más",
  (vuelo.pistaDeOtros ?? 0) === 0 &&
    !(vuelo.dadaAOtroTrasLaTuya ?? []).length &&
    !(vuelo.sinAnularAlDartela ?? []).length,
  [
    vuelo.pistaDeOtros
      ? `otro la tuvo ${vuelo.pistaDeOtros} muestras, la primera a los ${vuelo.pistaDeOtrosDonde}`
      : "nadie la tuvo mientras era tuya",
    (vuelo.dadaAOtroTrasLaTuya ?? []).length
      ? `y se oyó dársela a otro: ${vuelo.dadaAOtroTrasLaTuya.slice(0, 3).join(" · ")}`
      : "ni se oyó dársela a otro después de la tuya",
    (vuelo.sinAnularAlDartela ?? []).length
      ? `y sonó la tuya sin anular la de otro: ${vuelo.sinAnularAlDartela.slice(0, 2).join(" · ")}`
      : "ni sonó la tuya con la de otro sin anular",
  ].join(" · "),
  "«cleared to land» a vos y seis segundos después «line up and wait» a otro, en Pettirossi; y «cleared to land» a otro, oído y nunca anulado, y después el tuyo",
);

/*
 * **Y nadie que venga a aterrizar baja a ella.** El avión dibujado se posaba
 * con permiso o sin él; el que esperaba su «cleared to land» en el viento en
 * cola bajaba detrás de ti hasta veintitrés metros. Sin permiso, ahora se va
 * al aire en la altura de decisión. Ver `sinPermiso` en `world/trafico.ts`.
 */
comprobar(
  "y nadie baja a tu pista mientras es tuya",
  (vuelo.bajandoATuPista ?? 0) === 0,
  vuelo.bajandoATuPista
    ? `${vuelo.bajandoATuPista} muestras, la primera a los ${vuelo.bajandoATuPistaDonde}`
    : "nadie que viniera a aterrizar pasó bajo sobre ella",
  "uno sin permiso, detrás de ti en final, a quinientos ochenta metros del umbral y veintitrés de altura",
);

/*
 * **Y en la final la ventanilla ALT no sube**: sin el automático bajando por
 * la senda se queda en la del punto de final. Ver `ventanillaQueSube`.
 */
if (vuelo.ventanillaEnFinal)
  comprobar(
    "y en la final la ventanilla no sube por encima del punto de final",
    !vuelo.ventanillaQueSube,
    vuelo.ventanillaQueSube ??
      `${vuelo.ventanillaEnFinal.pies} ft, con el punto de final a ${vuelo.ventanillaEnFinal.delFinal}`,
    "«ningún sentido que, descendiendo, cuando me dice 2100 ahora me sube a 3000 si estoy llegando a la pista»",
  );

/*
 * **Y con alguien en tu pista a la altura de decisión, la torre te manda al
 * aire.** Sin la pista libre no hay permiso, y el que se dio se anula con su
 * orden. Gran Canaria, de noche, con el JAZ 120: «tengo un avión en la pista
 * y nadie me dice que frustre, ya lo hago yo». Ver `paso` en
 * `flight/turno-de-pista.ts`.
 */
comprobar(
  "y con alguien en tu pista a la decisión, te mandan al aire",
  (vuelo.enTuPistaSinOrden ?? 0) === 0 &&
    (process.env.OGA_PISTA_OCUPADA !== "1" ||
      (!!vuelo.pistaOcupadaPuesta && (vuelo.frustradasPorLaPista ?? 0) > 0)),
  [
    vuelo.enTuPistaSinOrden
      ? `${vuelo.enTuPistaSinOrden} muestras sin orden, la primera a los ${vuelo.enTuPistaSinOrdenDonde}`
      : "nadie en tu pista por debajo de la decisión sin orden de irse",
    vuelo.alCostadoDeTuPista ? `al costado: ${vuelo.alCostadoDeTuPista}` : null,
    process.env.OGA_PISTA_OCUPADA === "1"
      ? vuelo.pistaOcupadaPuesta
        ? `despegue puesto ${vuelo.pistaOcupadaPuesta}, ${vuelo.frustradasPorLaPista ?? 0} frustrada(s) por la pista`
        : "OGA_PISTA_OCUPADA: no se llegó a poner"
      : null,
  ]
    .filter(Boolean)
    .join(" · "),
  "«tengo un avión en la pista y nadie me dice que frustre, ya lo hago yo»",
);

/*
 * **Y uno por vez en la pista, y las llegadas en fila.** Se veían en la carta
 * dos o tres aviones entrando a la vez en la pista; en un aeropuerto de
 * verdad las llegadas se dejan un par de minutos —tres millas como poco— y el
 * siguiente no cruza el umbral hasta que el anterior la ha dejado. Ver
 * `SEPARACION_ENTRE_LLEGADAS` en `world/trafico.ts`.
 */
comprobar(
  "y en la pista uno por vez, y en final cada uno con su hueco",
  (vuelo.dosEnLaPista ?? 0) === 0 && (vuelo.sinHueco ?? 0) === 0,
  [
    vuelo.dosEnLaPista
      ? `dos encima de la pista ${vuelo.dosEnLaPista} muestras, la primera a los ${vuelo.dosEnLaPistaDonde}`
      : "nunca dos encima de la pista",
    vuelo.sinHueco
      ? `sin su hueco en final ${vuelo.sinHueco} muestras, la primera a los ${vuelo.sinHuecoDonde}`
      : "y en final cada uno con su hueco",
  ].join(" · "),
  "«se ve raro en el radar: dos o tres señales de aviones entrando en pista»",
);

/*
 * **Y tu «cleared to land» suena, y en final.** Nada exigía que sonara: lo de
 * la pista de allí pasaba con cero autorizaciones. Y sonaba donde no es: al
 * dejar libre la pista el de delante, la torre te autorizaba a aterrizar en
 * pleno ascenso de la frustrada. Aterrizando en un campo con torre tiene que
 * haber sonado al menos una, y todas en final. Sin voz no hay cola que
 * mirar, y eso es un fallo del banco, no un aprobado.
 *
 * **Y la de cada peldaño.** El permiso va por la verde en vuelo, como el de
 * despegar: «autorizado para aterrizar» —`torre.aterrizar`— en los cuatro, y
 * detrás el «cleared to land» en fraseología de Taguató para arriba. Así que abajo se
 * exige el castellano y que no se cuele el inglés, y arriba los dos. Lo que no
 * se acepta nunca es una torre muda: iba solo por radio y en inglés, y en
 * Guyrami no sonaba nada. Ver `autorizarElAterrizaje` en `game.ts`.
 */
{
  const tuyas = vuelo.tusAutorizaciones ?? [];
  const fueraDeFinal = tuyas.filter((a) => a.fase !== "final");
  /*
   * Y en un AFIS, lo que allí se oye en su lugar: «pista libre» en castellano
   * y «runway free» en fraseología. Ver `LO_DICE_UN_AFIS`.
   */
  const afis = conAfis["torre.clearedLand"];
  const enCasa = tuyas.filter((a) => a.dice === (afis ? "afisLibreEnFinal" : "aterrizar"));
  const enRadio = tuyas.filter((a) => a.dice === (afis ? "afisFree" : "clearedLand"));
  const [permiso, deRadio] = afis
    ? ["«pista libre»", "«runway free»"]
    : ["«podés aterrizar»", "«cleared to land»"];
  const conTorre = vuelo.aterrizaConTorre !== false;
  const falta = !enCasa.length
    ? `no sonó ${permiso}`
    : conFraseologia && !enRadio.length
      ? `sonó ${permiso} y no el ${deRadio} de detrás`
      : !conFraseologia && enRadio.length
        ? `sonó el ${deRadio} en inglés en un peldaño sin fraseología`
        : null;
  if (conTorre)
    comprobar(
      afis ? "y tu «pista libre» suena, y en final" : "y tu «cleared to land» suena, y en final",
      tuyas.length > 0 && fueraDeFinal.length === 0 && !falta,
      !tuyas.length
        ? (vuelo.toco ?? 0) > 0
          ? "se aterrizó y no sonó ninguna"
          : "no sonó ninguna, ni se llegó a tocar tierra"
        : fueraDeFinal.length
          ? `sonó fuera de final: ${fueraDeFinal.map((a) => `${a.t} s en «${a.fase}» ${a.dice}`).join(" · ")}`
          : falta
            ? `${falta}: ${tuyas.map((a) => `${a.t} s ${a.dice}`).join(" · ")}`
            : `${tuyas.length} · ${tuyas.map((a) => `${a.t} s ${a.dice}`).join(" · ")}`,
      "«podés aterrizar» y «cleared to land» subiendo en la frustrada, en cuanto el de delante dejó la pista; y en Guyrami, la torre muda: el permiso iba solo por radio y en inglés",
    );
}

/*
 * **Y tu permiso llega antes de la altura de decisión.** En Los Rodeos, de
 * número dos detrás de otro, el de delante soltó la pista por debajo de los
 * sesenta metros, su «pista libre» esperó turno y tu permiso sonó a once
 * metros del suelo. Lo de verdad es lo otro: si la pista no es tuya a la
 * altura de decisión, la torre te manda al aire. Se mide con la voz, que es
 * cuando se entera quien vuela; la boca puede retrasarla unos segundos detrás
 * de otra frase, y por eso el margen es de veinte metros y no de cero.
 */
{
  const tuyas = vuelo.tusAutorizaciones ?? [];
  const bajas = tuyas.filter((a) => typeof a.alto === "number" && a.alto < 40);
  if (tuyas.length)
    comprobar(
      "y tu permiso llega antes de la altura de decisión",
      bajas.length === 0,
      bajas.length
        ? bajas.map((a) => `${a.t} s ${a.dice} a ${a.alto} m`).join(" · ")
        : tuyas.map((a) => `${a.dice} a ${a.alto ?? "?"} m`).join(" · "),
      "«cleared to land» a once metros del suelo, de número dos hasta el final, en Los Rodeos",
    );
}

/*
 * **Y ninguna roja dura más de lo que dura de verdad.** Una torre retiene a
 * quien espera mientras el otro está en final corta y hasta que deja la
 * pista: uno o dos minutos. Ver `roja-de-verdad.test.ts`, que lo mide con
 * cuatrocientas frecuencias; esto lo mide en un vuelo de verdad.
 */
comprobar(
  "y ninguna roja dura más de lo que dura de verdad",
  (vuelo.rojaMasLarga ?? 0) < 170,
  vuelo.rojaMasLarga
    ? `la más larga, ${Math.round(vuelo.rojaMasLarga)} s ${vuelo.rojaMasLargaDonde}`
    : "no hubo roja",
  "«me tiene esperando por ese avión un buen rato, ¿me dejará salir?»: la roja no se apagaba nunca",
);

/*
 * **Y nadie viene de frente**, ni en la salida ni en la final: una pista en
 * uso para todos, y el tráfico vuela el mismo circuito que tú.
 */
comprobar(
  "y ningún tráfico viene de frente en la salida ni en la final",
  (vuelo.deFrente ?? 0) === 0,
  vuelo.deFrente
    ? `${vuelo.deFrente} muestras, la primera a los ${vuelo.deFrenteDonde}`
    : "nadie de frente",
  "«un avión de frente y ni aviso ni radar ni nada», despegando de Pettirossi",
);

/*
 * **Y una sola fuente de verdad del tráfico**: lo que se ve, lo que pinta el
 * radar y lo que nombra la radio son los mismos aviones. Ver `radar` en el
 * vuelo. «Veo aviones durante el vuelo que no aparecen en el radar, es como si
 * cada cosa fuera por su lado.»
 */
if (vuelo.radar) {
  const r = vuelo.radar;
  console.log(
    `\n  el radar: ${r.muestras} muestras · ${r.vistos} aviones vistos · ${r.rombos} rombos · ` +
      `${r.fueraDeBanda} vistos fuera de la banda del TCAS · ${r.piezas} piezas en la carta\n` +
      `  modos: ${Object.entries(r.modos).map(([k, v]) => `${k} ${v}`).join(" · ")}\n` +
      `  la radio nombró ${r.nombrados} veces: ${Object.entries(r.porClave).map(([k, v]) => `${k} ${v}`).join(" · ")}\n` +
      `  dependencias: ${Object.entries(r.dependencias).map(([k, v]) => `${k} ${v}`).join(" · ")}`,
  );
  comprobar(
    "cada rombo del TCAS es un avión del mundo, y se dibuja",
    r.rombosSinAvion === 0 && r.rombosSinDibujo === 0,
    r.rombosSinAvion || r.rombosSinDibujo
      ? `${r.rombosSinAvion} sin avión (${r.rombosSinAvionDonde ?? "—"}) · ${r.rombosSinDibujo} sin dibujo (${r.rombosSinDibujoDonde ?? "—"})`
      : `${r.rombos} rombos en ${r.muestras} muestras, todos de un avión que se ve`,
    "«veo aviones durante el vuelo que no aparecen en el radar»",
  );
  comprobar(
    "y cada avión que vuela dentro de la banda del TCAS tiene su rombo",
    r.vistosSinRombo === 0,
    r.vistosSinRombo
      ? `${r.vistosSinRombo} muestras, la primera a los ${r.vistosSinRomboDonde}`
      : `${r.vistos} vistos; fuera de la banda, ${r.fueraDeBanda}`,
    "en la 115 se veían tres aviones y la carta marcaba dos",
  );
  comprobar(
    "y cada rombo de la carta cae en la marcación de su avión",
    r.piezasFueraDeSitio === 0,
    r.piezasFueraDeSitio
      ? `${r.piezasFueraDeSitio} de ${r.piezas}, la primera a los ${r.piezasFueraDeSitioDonde}`
      : `${r.piezas} piezas, todas en su sitio`,
    "en la 115 el avión iba delante a la derecha y el rombo salía delante a la izquierda",
  );
  comprobar(
    "y del tráfico cercano se informa: la torre, la instructora o la caja",
    !r.cercanosSinInformar,
    r.cercanosSinInformar
      ? `${r.cercanosSinInformar} cercanos sin una palabra, el primero a los ${r.cercanosSinInformarDonde}`
      : "ningún rombo lleno doce segundos de reloj sin que nadie lo cuente",
    "en la final de La Palma, dos rombos llenos a cien y seiscientos pies y nadie dijo nada",
  );
  comprobar(
    "y cada tráfico que nombra la radio está en el mundo al nombrarlo",
    r.nombradosQueNoEstan === 0,
    r.nombradosQueNoEstan
      ? `${r.nombradosQueNoEstan} de ${r.nombrados}, el primero a los ${r.nombradosQueNoEstanDonde}`
      : `${r.nombrados} nombrados, todos en el mundo`,
    "la torre hacía esperar por un avión en la pista que aparecía al rato de la nada; en el Chaco, «tráfico aterrizando» y no aterrizaba nadie",
  );
}

/*
 * **Y si se espera en la roja por alguien, se dice por quién.** La torre en
 * fraseología —«hold short of the runway, landing traffic»— de Taguató para
 * arriba; la instructora en castellano, en los de abajo. Si al llegar a la
 * raya la pista estaba libre, no hay porqué que decir, y no se da por medido.
 */
if (vuelo.esperandoPorAlguien)
  comprobar(
    "y esperando en la roja por alguien, se dice por quién",
    !!vuelo.porQueSeDijo,
    `ocupaban la pista a los ${vuelo.esperandoPorAlguien} · ` +
      (vuelo.porQueSeDijo ? `se dijo a los ${vuelo.porQueSeDijo}` : "no se dijo por qué"),
    "la roja duraba tres minutos y solo se oía «esperá acá» y «hold short»",
  );
else
  resultados.push({
    nombre: "y esperando en la roja por alguien, se dice por quién",
    ok: true,
    sinMedir: true,
    detalle: "al llegar a la raya no había nadie en la pista: no se midió",
    porque: "la roja duraba tres minutos y solo se oía «esperá acá» y «hold short»",
  });

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
/*
 * **Y en la granja, quien espera es ella.** Un campo particular no tiene
 * servicios de plataforma: ni coche de sígame ni señalero. El señor de los
 * bastones seguía plantado en el puesto de Yvytu Rape; allí quien recibe es
 * Jazlyn, que salió en bici a buscarte y se queda a un lado del hueco.
 */
if (vuelo.enBici) {
  comprobar(
    "y en la granja te recibe quien salió en bici, sin bastones",
    !vuelo.senalero?.visto &&
      !!vuelo.quienRecibe?.biciALaVista &&
      (vuelo.quienRecibe?.biciA ?? Infinity) < 30,
    `señalero: ${vuelo.senalero?.visto ? `visto, con ${vuelo.senalero?.gestos?.join(", ") || "ningún gesto"}` : "ninguno"} · la bici al llegar al puesto: ${
      vuelo.quienRecibe === null
        ? "no se llegó al puesto"
        : vuelo.quienRecibe.biciALaVista
          ? `a ${vuelo.quienRecibe.biciA} m del avión`
          : "no estaba"
    }`,
    "«en una granja el señalero no pinta nada: allí quien recibe es Jazlyn, en bici»",
  );
} else {
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
  /*
   * **Y el motor se apaga con su seña, la última.** «Llegaste, apagá el
   * motor» salía antes que el señalero, con la tarjeta del final tapándole.
   * El orden de verdad, del Anexo 2 de la OACI: alto, frenos, calzos y
   * cortar motores; y el banco, como quien juega, gira la llave con esa
   * última. Si no llegó a hacerla, se ve aquí. Ver `YA_PARADO` en
   * `flight/senalero.ts`.
   */
  if (vuelo.senalero?.alApagar && vuelo.senalero.alApagar !== "ninguna")
    comprobar(
      "y se apaga con la seña de cortar motores, después del alto, los frenos y los calzos",
      vuelo.senalero.alApagar === "cortar" &&
        ["alto", "frenos", "calzos", "cortar"].every((g) =>
          vuelo.senalero.gestos.includes(g),
        ),
      `seña al apagar: ${vuelo.senalero.alApagar} · gestos: ${vuelo.senalero.gestos.join(", ")}` +
        (vuelo.senalero.alApagarComo ? ` · ${vuelo.senalero.alApagarComo}` : ""),
      "«llegaste, apagá el motor» antes que el señalero (captura 128)",
    );
}

/*
 * **El tope de la ida sale de la calle, no de un número redondo.**
 *
 * Eran noventa segundos para todos, y con el JAZ 90 en Asunción salían
 * noventa y siete: ¿rodaje lento, o calle larga? Era calle larga. Del puesto
 * al punto de espera en uso hay 623 metros trazados, y se rodaron a 6,2 m/s
 * de media, lo mismo que la avioneta en Guaraní (5,7) o en Gran Canaria
 * (5,8). A lo que se rueda de verdad —nueve metros por segundo en recta, que
 * son diecisiete nudos, el número del juego y el de cualquier manual— y
 * frenando en las curvas, esa calle no cabe en noventa.
 *
 * Así que el tope es lo que tarda esa ruta **a velocidad de rodaje**, con un
 * tercio más por las curvas —que se toman a la mitad— y veinte segundos de
 * arrancar y de pararse en la doble raya. Y nunca menos de los noventa de
 * antes: en una calle corta sigue mandando lo que aguanta un niño.
 */
const RODAJE_EN_RECTA = 9;
const topeDeIda = Math.round(
  Math.max(90, (vuelo.largoDeLaIda / RODAJE_EN_RECTA) * (4 / 3) + 20),
);
comprobar(
  "el rodaje de ida no aburre",
  vuelo.ida > 0 && vuelo.ida <= topeDeIda,
  `${vuelo.ida} s del puesto al punto de espera · ${vuelo.largoDeLaIda} m trazados, ` +
    `${vuelo.idaMetros} m rodados, a ${(vuelo.idaMetros / Math.max(1, vuelo.ida)).toFixed(1)} m/s de media · tope ${topeDeIda} s`,
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
    (vuelo.cocheEnPista === null
      ? "nunca coincidieron en pista"
      : `lo más cerca, ${vuelo.cocheEnPista} m con los dos en pista, ${vuelo.cocheEnPistaDonde}`) +
      (vuelo.cocheCercaEnPista !== null
        ? ` · con solo el avión en pista, ${vuelo.cocheCercaEnPista} m`
        : ""),
    "«acelero porque las salidas están lejos, y se rompió, volvemos a empezar»",
  );
  comprobar(
    "el coche del sígame rueda por el suelo, no por encima",
    Math.abs(vuelo.cocheEnElAire) < 0.5,
    `lo más separado del suelo: ${vuelo.cocheEnElAire} m${vuelo.cocheEnElAireDonde ? ` · ${vuelo.cocheEnElAireDonde}` : ""}`,
    "llegando a Asunción se le vio a treinta y cinco metros sobre la pista",
  );
  comprobar(
    "y después de tocar, el sígame no pisa la pista",
    vuelo.cochePisaLaPista === null,
    vuelo.cochePisaLaPista ?? "nunca, ni esperando ni guiando",
    "«el coche se puso delante en la pista, y lo tenía encima»",
  );
  comprobar(
    "al coche del sígame se le puede seguir",
    vuelo.lejosDelCoche < 150,
    `lo más lejos que llegó a estar guiando: ${vuelo.lejosDelCoche} m${vuelo.lejosDondeCoche ? ` · ${vuelo.lejosDondeCoche}` : ""}${vuelo.lejosEsperando ? ` · esperando en la salida, hasta ${vuelo.lejosEsperando} m` : ""}`,
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
/*
 * **Y en un campo particular, sale alguien a buscarte en bici, y te guía.**
 *
 * Jazlyn, con su banderín naranja: espera al lado de la salida y, en cuanto
 * dejás la pista, se pone delante y te lleva a casa. Se mide el rato que va
 * delante y en la raya, que es lo que es guiar; que esté «visible» no basta,
 * porque así estuvo semanas, pedaleando por la hierba a once metros de la
 * raya sin guiar a nadie. Cuatro segundos, que en la granja son la mitad de
 * lo que hay entre la salida y el puesto.
 */
if (vuelo.enBici)
  comprobar(
    "y en un campo particular sale alguien en bici a buscarte, y te guía",
    vuelo.biciGuiando >= 4,
    `${vuelo.biciGuiando} s delante y en la raya, de ${vuelo.biciVista} s a la vista fuera de la pista`,
    "«ya no sale ni Jazlyn a buscarme con la bici»",
  );

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
 * **Y pasado el umbral de aterrizaje, que no siempre es la punta.**
 *
 * Con el umbral desplazado, el asfalto de antes de la barra blanca es pista y
 * no es sitio para posarse. En la 01 de Fuerteventura el umbral está a mil
 * metros de la punta, y este piloto, que volaba la senda hasta la punta, tocaba
 * a ciento cincuenta: en la zona de las flechas, con el juego aplaudiendo. Ver
 * `umbral-desplazado.ts`.
 */
comprobarSiVolo(
  "y se toca pasado el umbral de aterrizaje",
  vuelo.toco > 0 && vuelo.tocoPasadoElUmbral >= 0,
  vuelo.toco
    ? `${Math.abs(vuelo.tocoPasadoElUmbral)} m ${vuelo.tocoPasadoElUmbral >= 0 ? "pasado" : "antes de"} el umbral de aterrizaje` +
        (vuelo.desplazadoAlTocar
          ? ` · desplazado ${vuelo.desplazadoAlTocar} m de la punta`
          : " · en la punta")
    : "no llegó a tocar",
  "en Fuerteventura se tocaba a ciento cincuenta metros de la punta, mil antes del umbral de la 01",
);

/*
 * **Y la final, estabilizada en su puerta.** Ver `PUERTA_ALTA`: configurado,
 * de la Vref a la Vref más veinte nudos, en la senda —un punto de la senda
 * de un ILS, treinta y cinco centésimas de grado— y en el eje, derecho y
 * bajando a menos de mil pies por minuto. Es lo que dice si el piloto llega a
 * la pista como llega uno de verdad o como llegaba este: sin flaps, a nueve
 * décimas de la Vref y alineando en el último kilómetro.
 */
{
  const p = vuelo.enLaPuerta;
  const a = vuelo.avion ?? {};
  const fallos = [];
  if (p) {
    // En Guyrami las hélices van limpias y a nueve décimas: ver `LIMPIO`.
    if (a.llevaFlaps && !p.limpio && p.flaps < 0.95) fallos.push(`flaps ${p.flaps}`);
    if (a.trenRetractil && p.tren < 0.99) fallos.push("sin tren");
    // Limpias en Guyrami, la mínima del modelo es nueve décimas de la Vref
    // en verdadera, que en indicada, con calor, son ocho y media.
    if (p.nudos < p.vref * (p.limpio ? 0.85 : 1) || p.nudos > p.vref + 20)
      fallos.push(`${p.nudos} kt con Vref ${p.vref}`);
    if (Math.abs(p.senda) > p.tolSenda)
      fallos.push(`${p.senda} m de la senda (±${p.tolSenda})`);
    if (Math.abs(p.eje) > p.tolEje)
      fallos.push(`${p.eje} m del eje (±${p.tolEje})`);
    if (p.rumbo > 5) fallos.push(`${p.rumbo}° cruzado`);
    if (p.baja > 5.08) fallos.push(`bajando a ${p.baja} m/s de media`);
  }
  comprobarSiVolo(
    "la final llega estabilizada a su puerta",
    !!p && fallos.length === 0,
    p
      ? `${p.pies} ft${p.empezoPorDebajo ? " (la final empezó por debajo)" : ""} · ${p.nudos} kt (Vref ${p.vref}) · flaps ${p.flaps} · senda ${p.senda} m · eje ${p.eje} m · ${p.rumbo}° · bajando ${p.baja} m/s` +
          (fallos.length ? ` · ✗ ${fallos.join(", ")}` : "")
      : "no pasó por la puerta",
    "«que vuele como un piloto de verdad: final estabilizada a mil pies»",
  );
}

/*
 * **Y dónde, a qué ritmo y a cuánto del eje se toca**, que es lo que dice si
 * hubo recogida.
 *
 * La zona de toma de una pista son sus primeros novecientos metros, y dentro
 * de ella se toca pasado el punto de visada: de ciento cincuenta a seiscientos
 * metros del umbral según la pista, y en las cortas, en su primer tercio.
 * Tocar a ochocientos metros en Pilar o a dos mil en Guaraní es flotar sin
 * recogida; tocar a cuatro metros por segundo, lo mismo sin flotar —la senda
 * entera hasta el asfalto—. Uno y medio, con la recogida hecha.
 */
{
  const lda = vuelo.pistaParaTocar || 0;
  const desde = Math.min(150, lda * 0.1);
  const hasta = Math.min(600, lda / 3);
  const d = vuelo.tocoPasadoElUmbral;
  const r = vuelo.empezoLaRecogida;
  comprobarSiVolo(
    "se toca en la zona de toma",
    vuelo.toco > 0 && d >= desde && d <= hasta,
    vuelo.toco
      ? `${d} m pasado el umbral · la zona, de ${Math.round(desde)} a ${Math.round(hasta)} m en ${lda} m de pista` +
          (r ? ` · recogida a ${r.ruedas} m de ruedas, ${r.umbral} m del umbral, bajando ${r.caida} m/s a ${r.nudos} kt` : " · sin recogida")
      : "no llegó a tocar",
    "aterriza largo: unos 800 m del umbral en Pilar y Ayolas, y unos 2.000 en Guaraní con el JAZ 90",
  );
  const caida = vuelo.caidaAlTocar;
  comprobarSiVolo(
    "y se toca con recogida, a uno o dos metros por segundo",
    vuelo.toco > 0 && caida !== null && caida <= 2,
    vuelo.toco
      ? `a ${caida ?? "?"} m/s · ${Math.abs(vuelo.tocoDesviado).toFixed(1)} m del eje · a ${vuelo.tocoA} m/s`
      : "no llegó a tocar",
    "los reactores tocan a unos 4 m/s de descenso, sin recogida",
  );
}

/*
 * **Y se vuelve a paso de rodaje.** El juego dice «más despacio» por encima
 * de la de rodaje y un tercio —ver `bandaDeRodaje`—, así que lo que se mide
 * es lo mismo que oye quien juega: lo más deprisa que se rodó de vuelta fuera
 * de la pista.
 */
comprobarSiVolo(
  "y se vuelve rodando a la velocidad de rodaje",
  vuelo.toco > 0 && vuelo.rodajeMasRapido <= 9 * 1.35,
  `lo más rápido fuera de la pista: ${vuelo.rodajeMasRapido} m/s (el aviso salta a ${(9 * 1.35).toFixed(1)})`,
  "en el circuito de Tenerife Norte con el JAZ 90, «vuelo.despacio» sale hasta 5 veces en su rodaje de vuelta",
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

/*
 * **Y aterrizado es con las ruedas en el suelo.** Ver `ruedasAlAterrizar`.
 * Medio metro de margen por el muestreo: el banco lee cada décima, y un
 * rebote justo en esa lectura no es volar.
 */
comprobarSiVolo(
  "y la fase de tierra empieza al tocar, no antes",
  vuelo.ruedasAlAterrizar !== null &&
    (vuelo.ruedasAlAterrizar.tocando || vuelo.ruedasAlAterrizar.ruedas < 0.5),
  vuelo.ruedasAlAterrizar === null
    ? "no llegó a «aterrizado»"
    : `a los ${vuelo.ruedasAlAterrizar.t} s, ${vuelo.ruedasAlAterrizar.tocando ? "con peso en las ruedas" : `con las ruedas a ${vuelo.ruedasAlAterrizar.ruedas} m del suelo`}`,
  "«me dice frená y todavía estoy volando: thirty, twenty, ten»",
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
 * **La cuenta de la toma dice la verdad**, que era la queja entera:
 *
 * > «Lee 400-300-200 todo seguido cuando estoy lejos. Un buen rato después me
 * > dice 100 sin que cuadre con lo que realmente estoy haciendo… Y cuando estoy
 * > ya en tierra rodando y frenando me dice 5. ¿Cinco, qué?»
 *
 * Cuatro cosas, y las cuatro se miran con lo que marcaba el radioaltímetro en
 * el instante de cada número:
 *
 * - que cada número suene a su altura, con un quince por ciento o diez pies
 *   de margen —el mismo que se aplica la propia cuenta, `holguraDe`—;
 * - que ninguno suene con peso en las ruedas;
 * - que la cuenta no pase por la cola de ninguna boca, que es donde esperaba;
 * - y que una avioneta, que no lleva radioaltímetro que cante, no cante nada.
 */
const PIES_DE_LA_CUENTA = {
  "twenty five hundred": 2500,
  "one thousand": 1000,
  "five hundred": 500,
  "four hundred": 400,
  "three hundred": 300,
  "two hundred": 200,
  "one hundred": 100,
  fifty: 50,
  forty: 40,
  thirty: 30,
  twenty: 20,
  ten: 10,
};
const NUMERO_EN_UNA_BOCA =
  /\b(?:cuenta\.[a-z]+|cabina\.(?:twentyFiveHundred|oneThousand|fiveHundred|fourHundred|threeHundred|twoHundred|oneHundred|fifty|forty|thirty|twenty|ten|five))\b/;
{
  const oidas = vuelo.cuentaOida ?? [];
  const sonaron = oidas.filter((c) => c.como === "suena");
  const fuera = (c) => {
    const n = PIES_DE_LA_CUENTA[c.dice];
    return (
      n === undefined ||
      c.pies === null ||
      Math.abs(c.pies - n) > Math.max(0.15 * n, 10)
    );
  };
  const lista = oidas
    .map(
      (c) =>
        `${c.t}s ${c.dice} a ${c.pies ?? "—"} ft${c.enTierra ? " EN TIERRA" : ""}` +
        (c.como === "suena" ? "" : ` (${c.como})`),
    )
    .join(" · ");
  const conCaja = !!vuelo.avion?.avisosHablados;
  const enLaBoca = [
    ...(vuelo.habladas ?? []),
    ...Object.values(vuelo.todoLoDicho ?? {}).flat(),
  ].filter((h) => NUMERO_EN_UNA_BOCA.test(String(h)));
  if (!conCaja) {
    const deLaMaquina = (vuelo.maquina ?? []).filter((m) =>
      NUMERO_EN_UNA_BOCA.test(String(m)),
    );
    comprobar(
      "una avioneta no canta la cuenta",
      oidas.length === 0 && enLaBoca.length === 0 && deLaMaquina.length === 0,
      oidas.length || enLaBoca.length || deLaMaquina.length
        ? `sonó: ${[lista, ...enLaBoca, ...deLaMaquina].filter(Boolean).slice(0, 12).join(" · ")}`
        : `${vuelo.avion?.id ?? "?"} no lleva radioaltímetro que cante, y no se oyó ningún número`,
      "«el 400-300-200-100 lo dice la instructora de vuelo y me lo tiene que decir una voz de robot»",
    );
  } else {
    comprobarSiVolo(
      "cada número de la cuenta suena a su altura",
      sonaron.length > 0 && !sonaron.some(fuera),
      sonaron.length
        ? `${sonaron.filter(fuera).length} fuera de su altura de ${sonaron.length}: ${lista}`
        : `no sonó ningún número${lista ? `: ${lista}` : ""}`,
      "«un buen rato después me dice 100 sin que cuadre con lo que realmente estoy haciendo»",
    );
    comprobarSiVolo(
      "y ningún número con peso en las ruedas",
      !sonaron.some((c) => c.enTierra),
      sonaron.some((c) => c.enTierra)
        ? sonaron
            .filter((c) => c.enTierra)
            .map((c) => `${c.t}s ${c.dice}`)
            .join(" · ")
        : `${sonaron.length} números, todos en el aire`,
      "«cuando estoy ya en tierra rodando y frenando me dice 5. ¿Cinco, qué?»",
    );
  }
  comprobar(
    "y la cuenta no espera en la cola de ninguna boca",
    enLaBoca.length === 0,
    enLaBoca.length
      ? enLaBoca.slice(0, 8).join(" · ")
      : "ningún número pasó por la instructora, la torre ni el otro avión",
    "«lee 400-300-200 todo seguido cuando estoy lejos»",
  );
}

/*
 * **Y en la final, lento y rápido no se dicen seguidos.**
 *
 * «Cuando voy al mínimo de velocidad bajando "bajás muy lento, metele gas", le
 * meto gas y "bajás muy rápido", pero si estoy tomando tierra ¿qué se supone
 * que tengo que hacer?» Un aviso de ir lento y uno de ir rápido —o de bajar de
 * golpe, que se oía igual— a menos de diez segundos son dos órdenes que se
 * contradicen, y quien las oye se queda sin saber qué tocar. Se mira en lo que
 * sonó de verdad, por las dos vías: la boca y la máquina.
 *
 * El *sink rate* de la caja no cuenta como «rápido»: lento y bajando de golpe
 * es un avión de verdad avisando de dos cosas ciertas a la vez, y detrás la
 * instructora explica la que se arregla con gas. Lo que no puede salir es su
 * «bajás muy de golpe: levantá la nariz» justo después de «metéle gas».
 */
{
  const LENTO = /^(?:vuelo\.lentoYBajo|cabina\.airspeedLow)\b/;
  const RAPIDO =
    /^(?:vuelo\.rapido|vuelo\.pediFlaps|vuelo\.bajasRapido|cabina\.airspeed)$/;
  const SEGUIDOS = 10;
  const oido = [];
  for (const h of vuelo.habladas ?? []) {
    const m = /^(-?[\d.]+)s (\S+)/.exec(String(h));
    if (m) oido.push({ t: +m[1], clave: m[2].split("@")[0].split("~")[0] });
  }
  for (const h of vuelo.maquina ?? []) {
    const m = /^(-?[\d.]+)s (\S+): sonó$/.exec(String(h));
    if (m) oido.push({ t: +m[1], clave: m[2] });
  }
  const lentos = oido.filter((x) => LENTO.test(x.clave));
  const rapidos = oido.filter((x) => RAPIDO.test(x.clave));
  const seguidos = [];
  for (const l of lentos)
    for (const r of rapidos)
      if (Math.abs(l.t - r.t) < SEGUIDOS)
        seguidos.push(`${l.t}s ${l.clave} y ${r.t}s ${r.clave}`);
  comprobar(
    "y en la final no se dice «lento» y «rápido» seguidos",
    seguidos.length === 0,
    seguidos.length
      ? seguidos.slice(0, 6).join(" · ")
      : `${lentos.length} de ir lento y ${rapidos.length} de ir rápido o bajar de golpe, ninguno a menos de ${SEGUIDOS} s del otro`,
    "«le meto gas y “bajás muy rápido”, pero si estoy tomando tierra ¿qué se supone que tengo que hacer?»",
  );
}

/*
 * **Y en un vuelo normal no suena el avisador de pérdida.**
 *
 * El JAZ 90 cantaba «stall, stall» catorce veces en la final de Los Rodeos y
 * el banco lo daba por bueno, porque nada lo contaba. El avisador estaba bien
 * —sonaba al siete por ciento de la pérdida de los flaps que llevaba, como
 * uno de verdad—; lo que estaba mal era el piloto del banco, que llegaba a la
 * final limpio y la volaba por debajo de la Vref. Un piloto que vuela como
 * se vuela no lo oye nunca: si suena, algo de los dos se ha torcido, y cada
 * canto lleva al lado el ángulo, la carga y los flaps para saber cuál.
 */
{
  const cantos = (vuelo.cantados ?? []).filter((c) =>
    /^stall, stall→/.test(String(c)),
  );
  comprobar(
    "y en un vuelo normal no suena el avisador de pérdida",
    cantos.length === 0,
    cantos.length
      ? `${cantos.length}: ${cantos.slice(0, 4).join(" · ")}`
      : `ni una vez${TRAMO === "guyrami" ? " (en Guyrami no hay pérdida)" : ""}`,
    "«suena “stall, stall” entre 18 y 21 veces en la final»",
  );
}

/*
 * **Y cada cosa en su sitio: el aire en el aire y el suelo en el suelo.**
 *
 * Medido con este mismo volcado en Los Rodeos, con el JAZ 90: «thirty»,
 * **«frená»**, «twenty», «ten» —el «frená» a treinta pies, porque la máquina de
 * fases da el avión por aterrizado a doce metros del suelo— y después, ya
 * rodando, «quitá el gas», que había esperado en la cola detrás del «frená».
 * Pedir frenar en el aire y hablar del aire rodando es la misma avería que el
 * «cinco» ya en tierra de la queja.
 */
{
  const DEL_AIRE = /^vuelo\.(?:quitaElGas|yaPodesTocar)$/;
  const oido = [];
  for (const h of vuelo.habladas ?? []) {
    const m = /^(-?[\d.]+)s (\S+)/.exec(String(h));
    if (m) oido.push({ t: +m[1], clave: m[2].split("@")[0].split("~")[0] });
  }
  const frenas = oido.filter((x) => x.clave === "vuelo.aterrizado");
  const tarde = [];
  for (const f of frenas)
    for (const x of oido)
      if (DEL_AIRE.test(x.clave) && x.t > f.t && x.t - f.t < 15)
        tarde.push(`${f.t}s frená y ${x.t}s ${x.clave}`);
  const enElAire = [];
  for (const f of frenas)
    for (const c of vuelo.cuentaOida ?? [])
      if (c.como === "suena" && c.t > f.t && c.t - f.t < 10)
        enElAire.push(`${f.t}s frená y ${c.t}s ${c.dice} a ${c.pies} ft`);
  comprobar(
    "y «frená» suena en el suelo, y lo del aire no suena rodando",
    tarde.length === 0 && enElAire.length === 0,
    tarde.length || enElAire.length
      ? [...enElAire, ...tarde].slice(0, 6).join(" · ")
      : `${frenas.length} «frená», ninguno antes del último número ni antes de «quitá el gas» o «ya podés tocar»`,
    "«cuando estoy ya en tierra rodando y frenando me dice 5. ¿Cinco, qué?»",
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
  /*
   * **Y con alguna autorización que mirar.** Con cero pasaba en verde: ni una
   * pista mal nombrada entre ninguna. En un campo con torre se aterriza con
   * la tuya, así que al menos esa tiene que haber sonado; en uno sin torre
   * no hay nada que nombrar y se dice.
   */
  const autorizacionesAlli = (a.clearedLand ?? []).length;
  /*
   * **Y en los peldaños sin fraseología, tu permiso no nombra pista.** Va en
   * castellano, «podés aterrizar», como la verde del despegue: el «cleared to
   * land» con su pista es de Taguató para arriba. Así que abajo la tuya no
   * cuenta aquí, y si nadie más fue autorizado mientras llegabas no hay pista
   * nombrada que mirar: se dice, sin aprobarlo ni suspenderlo. Que la torre
   * de allí te autorizó lo mide la comprobación de después.
   */
  const soloEnCasa =
    !conFraseologia &&
    autorizacionesAlli === 0 &&
    (vuelo.tusAutorizaciones ?? []).some(
      (x) => x.alli && (x.dice === "aterrizar" || x.dice === "afisLibreEnFinal"),
    );
  if (soloEnCasa)
    resultados.push({
      nombre: "y la torre de allí nombra su pista",
      ok: true,
      sinMedir: true,
      detalle: `pista ${a.cabecera} · tu permiso fue en castellano, que no nombra pista, y no se oyó autorizar a nadie más allí`,
      porque: "«runway zero three left, cleared to land» llegando por la 12 de Los Rodeos",
    });
  else if (a.conFrecuencia === false)
    resultados.push({
      nombre: "y la torre de allí nombra su pista",
      ok: autorizacionesAlli === 0,
      sinMedir: autorizacionesAlli === 0,
      detalle: autorizacionesAlli
        ? `campo sin torre, y se oyeron ${autorizacionesAlli} autorizaciones`
        : "campo sin torre: no hay torre que nombre nada",
      porque: "«runway zero three left, cleared to land» llegando por la 12 de Los Rodeos",
    });
  else
    comprobar(
      "y la torre de allí nombra su pista",
      !!cifras && autorizacionesAlli > 0 && conOtraPista.length === 0,
      !cifras
        ? "no se supo la cabecera de allí"
        : !autorizacionesAlli
          ? vuelo.aterrizaConAfis
            ? `pista ${a.cabecera} · AFIS, y no se oyó allí ningún «runway free» ni «runway in use», ni el tuyo`
            : `pista ${a.cabecera} · no se oyó allí ningún «cleared to land», ni el tuyo`
          : conOtraPista.length
            ? `pista ${a.cabecera}, y dijo: ${conOtraPista.slice(0, 3).join(" · ")}`
            : `pista ${a.cabecera} · ${autorizacionesAlli} autorizaciones, todas con ella`,
      "«runway zero three left, cleared to land» llegando por la 12 de Los Rodeos",
    );
  /*
   * **Y la tuya entre ellas.** Allí se aterriza con permiso de allí.
   */
  if (a.conFrecuencia !== false && !vuelo.aterrizaConAfis) {
    const tuyasAlli = (vuelo.tusAutorizaciones ?? []).filter((x) => x.alli);
    comprobar(
      "y allí te autoriza a ti a aterrizar",
      tuyasAlli.length > 0,
      tuyasAlli.length
        ? tuyasAlli.map((x) => `${x.t} s en «${x.fase}» ${x.dice}`).join(" · ")
        : "no sonó tu «cleared to land» en el campo de llegada",
      "se aterrizaba en el campo de llegada sin que nada comprobara que la torre de allí te autorizaba",
    );
  } else if (vuelo.aterrizaConAfis) {
    /*
     * **Y un AFIS no autoriza: informa.** Allí lo que tiene que sonar es que
     * la pista está libre, a vos y en final; y lo que no puede sonar ni verse
     * es una autorización: ni un «cleared», ni un «hold short», ni una
     * lámpara verde o roja, a nadie. Pilar no tiene torre, tiene «PILAR AFIS».
     */
    const tuyasAlli = (vuelo.tusAutorizaciones ?? []).filter((x) => x.alli);
    comprobar(
      "y allí el AFIS te dice que la pista está libre",
      tuyasAlli.length > 0,
      tuyasAlli.length
        ? tuyasAlli.map((x) => `${x.t} s en «${x.fase}» ${x.dice}`).join(" · ")
        : "no sonó tu «pista libre» en el campo de llegada",
      "en Pilar, que es un AFIS, «cleared to land» y lámpara verde, como si hubiera torre",
    );
    comprobar(
      "y un AFIS no da permisos ni enciende la lámpara",
      (vuelo.ordenesEnUnAfis ?? []).length === 0 && (vuelo.lamparaEnUnAfis ?? 0) === 0,
      (vuelo.ordenesEnUnAfis ?? []).length || vuelo.lamparaEnUnAfis
        ? `se oyó: ${(vuelo.ordenesEnUnAfis ?? []).slice(0, 4).join(" · ") || "nada"} · lámpara encendida ${vuelo.lamparaEnUnAfis ?? 0} muestras`
        : "ni órdenes ni lámpara: informa y decidís vos",
      "en Pilar, que es un AFIS, «cleared to land» y lámpara verde, como si hubiera torre",
    );
  }
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
  /*
   * **Y visto de verdad.** Mirado una vez al final, sin nadie en el circuito
   * en ese instante, esto pasaba solo. Ahora se muestrea mientras se está
   * allí, y sin ninguna muestra no dice que sí: dice que no lo pudo ver.
   *
   * **Y en un campo sin frecuencia, lo que hay que ver es que no hay nadie.**
   * Yvytu Rape es una pista privada: allí no se pone tráfico a propósito, así
   * que «no se vio a nadie» no era no poder comprobarlo —era la respuesta
   * buena— y se contaba como fallo. El banco de Pettirossi a Yvytu Rape salía
   * siempre en rojo, y el día que fallara algo de verdad ahí no se habría
   * visto. Lo que se pide allí es lo que tiene que pasar: ni tráfico dibujado
   * ni frecuencia oída, ni la de allí —que no hay— ni la del campo de salida.
   *
   * Con frecuencia y sin nadie visto, en cambio, no se dice ni que sí ni que
   * no: se dice que no se midió, que es la verdad. Salvo que se oyera a
   * alguien allí sin verlo, que es justo lo que esto mira.
   */
  if (a.conFrecuencia === false)
    comprobar(
      "y en un campo sin frecuencia, ni se oye ni se ve a nadie",
      (a.traficoVisto ?? 0) === 0 && (a.frecuenciaOidaCuantas ?? 0) === 0,
      (a.traficoVisto ?? 0) || (a.frecuenciaOidaCuantas ?? 0)
        ? `${a.traficoVisto ?? 0} muestras de tráfico; se oyó: ${(a.frecuenciaOida ?? []).join(" · ") || "nada"}`
        : "pista privada: nadie en el circuito y nadie en la radio",
      "llegando a Yvytu Rape se oía y se veía el tráfico de Asunción",
    );
  /*
   * **Y en uno con torre, sin nadie oído ni visto, no es «sin medir»: es
   * fallo.** Allí tiene que haber frecuencia —el tráfico de allí, la torre
   * hablándole—, y un aeropuerto con torre donde en todo lo que dura llegar,
   * aterrizar y aparcar no suena nadie es una frecuencia que no se montó.
   */
  else if ((a.traficoVisto ?? 0) === 0 && (a.frecuenciaOidaCuantas ?? 0) === 0)
    comprobar(
      "y el tráfico que se oye vuela allí",
      false,
      "campo con torre, y allí no se oyó ni se vio a nadie",
      "en Los Rodeos se oía el circuito de Gando, con los aviones a ciento trece kilómetros",
    );
  else
    comprobar(
      "y el tráfico que se oye vuela allí",
      (a.traficoVisto ?? 0) > 0 && (a.traficoMasLejos ?? Infinity) < 20000,
      (a.traficoVisto ?? 0) > 0
        ? `${a.traficoVisto} muestras; el más lejos, a ${a.traficoMasLejos} m de la pista de allí`
        : `se oyó a ${a.frecuenciaOidaCuantas} y no se vio a nadie: ${(a.frecuenciaOida ?? []).slice(0, 3).join(" · ")}`,
      "en Los Rodeos se oía el circuito de Gando, con los aviones a ciento trece kilómetros",
    );

  /*
   * **Y al volver a arrancar allí, el tramo de vuelta.** Ver `deVuelta`.
   */
  const v = vuelo.deVuelta ?? {};
  comprobar(
    "y al volver a arrancar allí, la ruta es la de vuelta",
    v.ruta?.salida === DESTINO && v.ruta?.destino === ESCENARIO && (v.raya ?? 0) > 1,
    v.ruta
      ? `${v.ruta.salida} → ${v.ruta.destino} · raya de ${v.raya} puntos · fase ${v.fase}`
      : "no se llegó a arrancar",
    "arrancar en Los Rodeos después de apagar dejaba el juego en «en el puesto», sin raya ni autorización",
  );
  comprobar(
    "y sale con el depósito lleno para volver",
    Number.isFinite(v.kilos) &&
      Number.isFinite(v.carga) &&
      Math.abs(v.kilos - v.carga) < 0.5,
    Number.isFinite(v.kilos)
      ? `${v.kilos?.toFixed(1)} kg · el tramo pide ${v.carga?.toFixed(1)} kg · al apagar había ${v.kilosAlApagar?.toFixed(1)} kg`
      : "no se leyó el depósito",
    "de vuelta en casa se arrancaba hacia Los Rodeos con el depósito de un circuito",
  );
  comprobar(
    "y el coche del sígame vuelve a guiar",
    v.apartado === false,
    v.apartado === false ? "en marcha, delante" : `apartado: ${v.apartado}`,
    "el coche seguía apartado a once metros de la raya, donde lo dejó la llegada",
  );
  const alDeSalida = v.alUmbral ?? NaN;
  const agujaA = v.aguja?.metros ?? NaN;
  comprobar(
    "y volviéndose a medio camino, la aguja señala el campo de salida",
    Number.isFinite(agujaA) &&
      Number.isFinite(alDeSalida) &&
      v.enElSuelo === false &&
      Math.abs(agujaA - alDeSalida) < 1500,
    Number.isFinite(agujaA)
      ? `señala a ${(agujaA / 1000).toFixed(1)} km (${v.aguja?.por ?? "?"}) · el umbral de ${DESTINO} está a ${(alDeSalida / 1000).toFixed(1)} km` +
          (v.enElSuelo ? " · ¡y el avión acabó en el suelo, no volando!" : "")
      : "la aguja no dijo nada",
    "decidiendo volver al sesenta por ciento, la aguja señalaba la otra isla, a la espalda",
  );
}

/*
 * **Y el mar de Canarias, solo en Canarias.**
 *
 * Los barcos entre islas y los turbohélices que las unen existen allí y en
 * ningún otro sitio: un ferri en el Paraná de Asunción enseñaría algo falso.
 * Aquí se mira que estén donde tocan y que falten donde no, que es lo único
 * que un vuelo entero puede decir de ellos; cómo se ven lo dice
 * `ver-mar-y-cielo.mjs`.
 */
{
  const mar = await page
    .evaluate(() => {
      const o = globalThis.__oga.escenario().aerodrome?.origin;
      const canarias =
        !!o && o.lat > 27.4 && o.lat < 29.6 && o.lon > -18.3 && o.lon < -13.2;
      const b = globalThis.__oga.barcos();
      const i = globalThis.__oga.islenos();
      return { canarias, barcos: b.hay, lista: b.lista.length, islenos: i.hay };
    })
    .catch(() => null);
  comprobar(
    "y los barcos y los turbohélices de las islas, solo en Canarias",
    mar !== null &&
      mar.barcos === mar.canarias &&
      mar.islenos === mar.canarias,
    mar === null
      ? "no se pudo preguntar"
      : mar.canarias
        ? `en Canarias: ${mar.lista} barcos en sus líneas y el tráfico de las islas ${mar.islenos ? "puesto" : "sin poner"}`
        : `fuera de Canarias: ${mar.barcos ? "hay barcos" : "sin barcos"} y ${mar.islenos ? "hay turbohélices" : "sin turbohélices"}`,
    "un escenario sin mar entre islas dibujaba barcos, o uno de Canarias no los tenía",
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

// Y las fases de la llegada, en orden. Ver `cambiosDeFase`.
if ((vuelo.cambiosDeFase ?? []).length) {
  console.log("\n  las fases desde que se tocó tierra:\n");
  for (const c of vuelo.cambiosDeFase) console.log(`      ${c}`);
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

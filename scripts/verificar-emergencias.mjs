/**
 * **Los ejercicios de emergencia, volados de verdad**: un motor que falla
 * antes de V1, uno que falla después y el planeo sin motor.
 *
 * Las pruebas de `motores.test.ts` miran el modelo de vuelo suelto y las de
 * `practica.test.ts` el orden del procedimiento. Esto mira la cadena entera
 * dentro del juego, con un piloto de banco que hace lo que se enseña:
 *
 * - `antes`: falla un motor antes de V1. Gas atrás, frenos y reversa donde la
 *   hay, recto por el eje. Tiene que pararse **en la pista**, la instructora
 *   —o la cabina, arriba del todo— tiene que haberlo dicho, y el ejercicio se
 *   cierra bien, con los bomberos junto al avión.
 * - `despues`: falla pasada V1. Se rota, se sube a la V2 con el pie del lado
 *   bueno, se mete el tren, la compañera asegura el motor a los 400 ft, se
 *   declara, se da la vuelta por un circuito amplio y se aterriza con un
 *   motor. Con la torre dando prioridad y los bomberos esperando.
 * - `carrera` y `tren`: los del bimotor de pistón, que no lleva V1 (H37e). En
 *   `carrera` el motor se para rodando cerca de la rotación, donde un reactor
 *   ya seguiría, y se para como en `antes`: su manual lo manda con el tren
 *   fuera. En `tren` se para subiendo con el tren ya dentro, y se sigue como en
 *   `despues`, a la línea azul y con la bandera puesta enseguida.
 * - `planeo`: en Tukã con la avioneta, el motor se para en el aire y se
 *   planea hasta la pista.
 * - `despres`: la cabina sin aire, en crucero. Se va el aire a su hora, se
 *   baja como baja una tripulación —el piloto del descenso de emergencia,
 *   `PilotoDelDescenso`—, y desde donde se respira se viene a la pista de
 *   casa y se aterriza, con la torre contestando el MAYDAY y los bomberos del
 *   aeródromo esperando.
 * - `carga`: la carga suelta (H38g), en Taguató con la avioneta. Subiendo, la
 *   maleta sin amarrar se va al fondo de la bodega y el centro de gravedad
 *   con ella: el piloto del banco empuja lo que haga falta —vuela por
 *   actitud—, sigue el circuito sin nada brusco y aterriza en el campo de
 *   salida, que es el más cercano. Sin llamada ni bomberos. Con
 *   `OGA_AMARRADA=1`, la maleta va amarrada en la hoja de carga: no se mueve
 *   nada, y se dice.
 * - `morro`: el tren de nariz que no sale (H70), en Taguató con el bimotor de
 *   pistón. Se despega, se mete el tren y, al sacarlo en la final, la rueda de
 *   morro se queda dentro. El piloto del banco va a 80 nudos, por debajo de
 *   los 85 de la extensión de emergencia; la compañera la prueba, no sale, se
 *   declara PAN PAN y se aterriza sobre las principales con la nariz arriba,
 *   sostenida hasta casi todo el timón y bajada después, sin frenos
 *   (FAA-H-8083-3C, p. 18-12). Mira que la nariz llegue a la pista por debajo
 *   de 64 KIAS, el arco blanco del POH: aguantó hasta que el ala dejó de volar.
 *   Y cuenta como fallo una frase del ejercicio que la boca tire en la cola.
 * - `radio`: el fallo de radio (H71), en Taguató con la avioneta y en un campo
 *   con torre de España o de Paraguay. Subiendo, la radio se calla: la instructora marca el
 *   7600, que se ve cifra a cifra; el piloto del banco sigue el circuito y,
 *   cuando la torre enciende los destellos verdes, contesta alabeando —no en
 *   la base ni en la final—; aterriza con la verde fija y, si en la final no
 *   la tiene a sesenta metros, se va y da otra vuelta, que es lo que se hace
 *   sin ella. Mira que ni la torre ni la frecuencia digan nada mientras dura
 *   el fallo, que la lámpara se vea grande y sin letras, y las luces en su
 *   orden. Con `OGA_PISTA_OCUPADA=1` sale uno a despegar cuando se va en la
 *   final a punto de llegar a la decisión, entre 75 y 62 m: la torre tiene
 *   que poner la roja fija, y tras la otra vuelta, la verde. Vuela por el lado
 *   del circuito del campo. Con `OGA_HORA=22`, de noche: no se alabea, y los
 *   faros tienen que contestar solos con sus dos destellos (H86). En
 *   `encarnacion`, cuya torre no tiene radar publicado, mira que lo que se dice
 *   del 7600 sea lo de allí, y en los demás, lo de siempre (H91).
 *
 * - `reventon`: la rueda que revienta en la carrera (H74), en Taguató con el
 *   JAZ 90. A dieciocho nudos de V1 revienta una rueda principal: el piloto
 *   del banco sostiene el eje con el pie, sigue, no mete el tren, da el
 *   circuito con él fuera y toma sosteniendo el eje y frenando a cuatro
 *   décimas. Mira el golpe y su tarjeta, de qué lado tira y qué pie se pisa,
 *   que nadie pida meter el tren, el PAN PAN con la torre y los bomberos, la
 *   toma por el eje y el cierre; y cuenta como fallo una frase del ejercicio
 *   que la boca tire en la cola (ADR 0033, H67). Con `OGA_PARAR=1` para en la
 *   pista en vez de seguir, que también está bien hecho. Con `OGA_METE_TREN=1`
 *   mete el tren al volar y lo saca cuando se lo cuentan. Con `OGA_FOTOS=dir`
 *   deja ahí las tarjetas. Vuela en calma (`OGA_VIENTO` para otro, «025/20»):
 *   en Gando, con sus veinte nudos y sus rachas, el pie del viento es tan grande
 *   como el de la rueda y no se sabe de quién es.
 *
 * - `toma`: la rueda que revienta al tomar (H84), en Taguató con el JAZ 90. El
 *   piloto del banco da la vuelta, toca y no toca nada ocho décimas desde el
 *   golpe; sostiene el eje con el pie, saca la reversa, y a los cuatro segundos
 *   y medio frena a cuatro décimas hasta parar en la pista. Mira el golpe y su
 *   tarjeta, de qué lado tira y qué pie se pisa, el freno y el «pará acá» con
 *   sus tarjetas, que el autofreno no se arme, que **nadie pida dejar la
 *   pista** —ni la instructora, ni la torre, ni la tarjeta—, que pare en ella y
 *   por el eje, los bomberos junto al avión y el cierre; y cuenta como fallo
 *   una frase del ejercicio que la boca tire en la cola. Con
 *   `OGA_DEJA_LA_PISTA=1` no para: deja la pista por su raya, despacio, y para
 *   fuera; entonces se cuenta por qué es mejor parar, y se cierra igual. En
 *   calma, y con `OGA_MOTOR`, `OGA_VIENTO` y `OGA_FOTOS` como en `reventon`.
 *
 * - `ave`: el ave en el motor, con su petardeo (H77), en Taguató con el JAZ 90.
 *   Subiendo, a cien metros, un ave entra en un motor: el piloto del banco
 *   sostiene el rumbo con el pie y la velocidad con la nariz, sigue subiendo
 *   recto mientras la compañera lleva esa palanca atrás, espera y la avanza, y
 *   con el motor ya sabido da el circuito y aterriza. Mira el golpe y su
 *   tarjeta, los estallidos espaciados con su fogonazo y su N1, que la palanca
 *   no se toque hasta tener altura, que se calle con ella atrás y que el otro
 *   motor siga dando lo suyo, el pie del otro lado, cómo queda, la llamada, la
 *   toma y el cierre; que no salga ningún mensaje ni alarma, y que la boca no
 *   tire nada del ejercicio. Con `OGA_NO_AGUANTA=1` el motor vuelve a estallar al
 *   avanzarla y se para. `OGA_MOTOR`, `OGA_FOTOS` y `OGA_VIENTO`, como en
 *   `reventon`: vuela en calma.
 *
 * **Las voces que no están grabadas no suenan** —ver `decirDelEjercicio` en
 * `game.ts`—, y el juego apunta cada una que se calla en `cantados`. Así que
 * lo que se mira aquí es que se **pidió**, grabado o no: lo dicho por la
 * instructora y lo callado por sin grabar.
 *
 * Uso: `node scripts/verificar-emergencias.mjs <antes|despues|carrera|tren|planeo|despres|carga|morro|radio|reventon|toma|ave>
 *        [escenario] [avion] [tramo]`
 *
 * Con `OGA_TRAZA=1` escribe la traza del vuelo aunque todo vaya bien. Con
 * `OGA_TRAZA_FINA=fichero`, además, la final cada medio segundo del reloj del
 * juego —el desvío, la traza y el rumbo, lo que pide y lo que hace el alabeo,
 * el pie, el gas y lo que da el motor, y el aire—, en columnas (H99).
 */
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const MODO = process.argv[2] ?? "despues";
const EJERCICIO = {
  antes: "antes-de-v1",
  despues: "despues-de-v1",
  carrera: "en-la-carrera",
  tren: "tren-arriba",
  planeo: "planeo",
  despres: "despresurizacion",
  carga: "carga",
  morro: "tren-de-morro",
  radio: "fallo-de-radio",
  reventon: "reventon",
  toma: "reventon-al-tomar",
  ave: "ave",
}[MODO];
if (!EJERCICIO) {
  console.error(
    "Uso: verificar-emergencias.mjs <antes|despues|carrera|tren|planeo|despres|carga|morro|radio|reventon|toma|ave> [escenario] [avion] [tramo]",
  );
  process.exit(2);
}
const ESCENARIO = process.argv[3] ?? "gran-canaria";
const AVION =
  process.argv[4] ??
  (MODO === "planeo" || MODO === "carga" || MODO === "radio"
    ? "jaz-20"
    : MODO === "carrera" || MODO === "tren" || MODO === "morro"
      ? "jaz-40"
      : "jaz-90");
/**
 * Con `OGA_AMARRADA=1`, en `carga` la hoja de carga lleva la maleta del
 * ejercicio amarrada en la bodega 1, y no se tiene que mover nada.
 */
const AMARRADA = MODO === "carga" && process.env.OGA_AMARRADA === "1";
/** La hora del vuelo: a las doce si no se dice otra. Con `OGA_HORA=22`, de noche (H86). */
const HORA = Number(process.env.OGA_HORA ?? 12);
const DE_NOCHE = HORA >= 21 || HORA < 5;
/** Los que se paran en la pista: antes de V1, y el bimotor de pistón con el tren fuera. */
const PARA = MODO === "antes" || MODO === "carrera";
/** Los que siguen volando con un motor. */
const SIGUE = MODO === "despues" || MODO === "tren";
/**
 * Con `OGA_SIN_TREN=1`, en `tren` nadie mete el tren hasta que falla el motor
 * (H37i): el ejercicio tiene que fallar igual a 650 ft, con el tren fuera, y
 * pedir meterlo. El piloto del banco lo mete en cuanto se lo piden.
 */
const SIN_TREN = MODO === "tren" && process.env.OGA_SIN_TREN === "1";
/**
 * Con `OGA_PISTA_OCUPADA=1`, en `radio` sale uno a despegar mientras se va en
 * la final, entre 75 y 62 m, como en el banco del vuelo entero (H68): la
 * torre tiene que poner la roja (H71).
 */
const PISTA_OCUPADA = MODO === "radio" && process.env.OGA_PISTA_OCUPADA === "1";
/** El campo cuya torre no tiene radar publicado. Ver `sinRadarPublicado` en `src/flight/ejercicios.ts` (H91). */
const SIN_RADAR = MODO === "radio" && ESCENARIO === "encarnacion";
/** Con `OGA_PARAR=1`, en `reventon` se para en la pista en vez de seguir (H74). */
const PARAR = MODO === "reventon" && process.env.OGA_PARAR === "1";
/** Con `OGA_METE_TREN=1`, en `reventon` se mete el tren al volar, y se saca cuando se cuenta por qué. */
const METE_TREN = MODO === "reventon" && process.env.OGA_METE_TREN === "1";
/** Con `OGA_DEJA_LA_PISTA=1`, en `toma` se deja la pista rodando en vez de parar en ella (H84). */
const DEJA = MODO === "toma" && process.env.OGA_DEJA_LA_PISTA === "1";
/** Con `OGA_NO_AGUANTA=1`, en `ave` el motor vuelve a estallar al avanzar su palanca, y se para (H77). */
const NO_AGUANTA = MODO === "ave" && process.env.OGA_NO_AGUANTA === "1";
/** El viento de los reventones y del ave, en calma si no se dice otro: lo que tira es la rueda o el motor y no la racha. */
const VIENTO = MODO === "reventon" || MODO === "toma" || MODO === "ave" ? (process.env.OGA_VIENTO ?? "000/00") : null;
/** Dónde dejar las fotos de las tarjetas, si se piden. */
const FOTOS =
  MODO === "reventon" || MODO === "toma" || MODO === "ave" || MODO === "radio" ? process.env.OGA_FOTOS : undefined;
const TRAMO = process.argv[5] ?? (MODO === "planeo" ? "tuka" : "taguato");
// Uno propio, que otro banco puede estar corriendo a la vez: `OGA_PUERTO` para otro.
const PUERTO = Number(process.env.OGA_PUERTO ?? 5337);
/**
 * Lo más que se espera a que acabe el ejercicio, en segundos de reloj. El de
 * la despresurización empieza a cien kilómetros, arriba: más rato. Y en el de la
 * radio cabe otra vuelta: si al ir a tomar hay alguien en la pista, uno se va.
 */
const TOPE = Number(
  process.env.OGA_TOPE ?? (MODO === "despres" ? 1800 : MODO === "radio" ? 2600 : 1200),
);

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
const resultados = [];
const comprobar = (nombre, ok, detalle) =>
  resultados.push({ nombre, ok: !!ok, detalle });

try {
  const page = await navegador.newPage({
    viewport: { width: 900, height: 600 },
    locale: "es-PY",
  });
  page.on("pageerror", (e) => console.log("ERROR:", e.message));
  await page.addInitScript(() =>
    localStorage.setItem("oga-veve:teclas-vistas", "1"),
  );
  /*
   * **El motor que se para, a elegir**: `OGA_MOTOR=izquierdo` o `derecho`.
   * El ejercicio lo sortea —se practican los dos pies— y una tirada que sale
   * mal con uno solo no se puede repetir con el mismo lado sin esto: el JAZ 90
   * tocaba a 30 m del eje con el derecho parado y nadie sabía si ya pasaba
   * antes del cambio del timón (H37e). Se cambia la suerte solo donde la pide
   * el ejercicio, `cualSePara` en `practica.ts`, mirando quién pregunta: el
   * resto del juego sigue sorteando como siempre. Sirve igual con el código
   * de antes, que es para lo que hacía falta.
   */
  if (process.env.OGA_MOTOR)
    await page.addInitScript((lado) => {
      const azar = Math.random;
      Math.random = function () {
        const tope = Error.stackTraceLimit;
        Error.stackTraceLimit = 4;
        const pila = new Error().stack ?? "";
        Error.stackTraceLimit = tope;
        if (pila.includes("cualSePara") || pila.includes("cualRevienta")) return lado === "derecho" ? 0.75 : 0.25;
        return azar();
      };
    }, process.env.OGA_MOTOR);
  /*
   * **Y si el motor del ave aguanta**, también a elegir, por lo mismo: aguanta,
   * salvo con `OGA_NO_AGUANTA=1`. Detrás del de arriba, que se encadenan.
   */
  if (MODO === "ave")
    await page.addInitScript((noAguanta) => {
      const azar = Math.random;
      Math.random = function () {
        const tope = Error.stackTraceLimit;
        Error.stackTraceLimit = 4;
        const pila = new Error().stack ?? "";
        Error.stackTraceLimit = tope;
        if (pila.includes("seRecuperaDelAve")) return noAguanta ? 0.9 : 0.1;
        return azar();
      };
    }, NO_AGUANTA);
  const fotosHechas = [];
  /*
   * **Y el fogonazo, del lienzo mismo**: dura un cuarto de segundo, y una
   * captura de la página llega cuando ya se apagó; la que se pedía al ver el
   * estallido, también. Se cuentan los cuadros en que la llamarada está puesta,
   * y con `OGA_FOTOS` se lee el lienzo de los ocho primeros, nada más pintados.
   */
  if (MODO === "ave") {
    await page.addInitScript(() => {
      const raf = globalThis.requestAnimationFrame.bind(globalThis);
      let ultimo = -1;
      globalThis.__cuadrosConLlama = 0;
      globalThis.requestAnimationFrame = (cb) =>
        raf((t) => {
          cb(t);
          const grupo = globalThis.__oga?.aeronave?.().grupo;
          if (!grupo?.getObjectByName("llamarada")?.visible) return;
          if (t !== ultimo) globalThis.__cuadrosConLlama++;
          ultimo = t;
          if (!globalThis.__lienzo || globalThis.__cuadrosConLlama > 8) return;
          const lienzo = [...document.querySelectorAll("canvas")].sort((a, b) => b.width * b.height - a.width * a.height)[0];
          if (lienzo) void globalThis.__lienzo(globalThis.__cuadrosConLlama, lienzo.toDataURL("image/jpeg", 0.9));
        });
    });
    if (FOTOS)
      await page.exposeFunction("__lienzo", async (k, url) => {
        const ruta = `${FOTOS}/${MODO}-${AVION}-${TRAMO}-fogonazo-${k}.jpg`;
        writeFileSync(ruta, Buffer.from(url.split(",")[1], "base64"));
        fotosHechas.push(ruta);
      });
  }
  if (FOTOS)
    await page.exposeFunction("__foto", async (nombre) => {
      const ruta = `${FOTOS}/${MODO}-${AVION}-${TRAMO}-${nombre}.png`;
      await page.screenshot({ path: ruta }).catch(() => undefined);
      fotosHechas.push(ruta);
    });
  await page.goto(
    `${BASE}/?escenario=${ESCENARIO}&hora=${HORA}&avion=${AVION}&tramo=${TRAMO}` +
      `&ejercicio=${EJERCICIO}&teselas=0&meteo=` +
      (VIENTO ? `&viento=${VIENTO}` : "") +
      (AMARRADA ? "&pasajeros=1&filas=1,0&bodegas=44,0&amarradas=1,1" : ""),
  );
  await page.waitForFunction(() => !!globalThis.__oga?.estado, null, {
    timeout: 90000,
  });
  await page.waitForTimeout(12000);

  const r = await page.evaluate(
    async ({ modo, tope, sinTren, pistaOcupada, parar, meteTren, deja, deNoche, avionId, peldano }) => {
      const o = globalThis.__oga;
      const { aircraftById } = await import("/src/flight/aircraft.ts");
      const { alabeoAFondo } = await import("/src/flight/mano.ts");
      const { TIERS } = await import("/src/flight/tiers.ts");
      const espera = (ms) => new Promise((res) => setTimeout(res, ms));
      /*
       * **Otra vez desde el principio**, como el botón del final: el mundo ya
       * está asentado, y el ejercicio que empezó mientras cargaba —con nadie a
       * los mandos— no cuenta. Así se ve entero, presentación incluida.
       */
      o.reiniciar();
      await espera(300);
      o.acelerar?.(4);
      const planeo = o.planeo();
      const umbral = o.puntoDeFinal(0);
      const pista = o.pistaDeAhora();
      const cota = o.cotaDePistaDeAhora(umbral.x, umbral.z);
      const h = umbral.h;
      const fx = Math.sin(h);
      const fz = -Math.cos(h);
      const tx = Math.cos(h);
      const tz = Math.sin(h);
      /** En ejes de la pista: a lo largo desde el umbral, y a su derecha. */
      const enPista = (x, z) => ({
        a: (x - umbral.x) * fx + (z - umbral.z) * fz,
        c: (x - umbral.x) * tx + (z - umbral.z) * tz,
      });
      const aMundo = (a, c) => ({
        x: umbral.x + a * fx + c * tx,
        z: umbral.z + a * fz + c * tz,
      });
      const error = (a, b) => {
        let e = a - b;
        while (e > Math.PI) e -= 2 * Math.PI;
        while (e < -Math.PI) e += 2 * Math.PI;
        return e;
      };
      const acota = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const ej0 = o.ejercicio();
      const vel = ej0?.velocidades ?? {};
      const vref = planeo.vref;
      const vfe = planeo.vfeKt / 1.943844;
      const esReactor = vref > 60;
      /*
       * **El bimotor de pistón no tiene V2: tiene línea azul**, y su manual
       * no lo sube como a uno de transporte. «If the decision is made to
       * continue: maintain heading. After establishing a climb, retract
       * landing gear, accelerate to 92 KIAS and feather inoperative engine
       * prop» (Piper, *Pilot's Operating Handbook* del PA-34-220T, VB-1110,
       * sección 3). Rota a la Vr, muy por debajo de su línea azul, y con un
       * motor no le sobra para subir y acelerar a la vez: el piloto del banco
       * lo levantaba a la actitud de un reactor, se quedaba a 75 nudos, y al
       * ir a buscar la línea azul a quince metros bajaba el morro y volvía al
       * suelo. Ahora hace lo del manual: sube lo justo sin bajar de la Vr,
       * mete el tren con la subida ya hecha, acelera a la línea azul sin
       * bajar, la sostiene y recoge los flaps de despegue, que la línea azul
       * es limpia.
       *
       * **Y no hay más**: con el motor parado antes de irse del suelo, la
       * hélice en molinete, el tren fuera y los flaps, ese avión no sube, y
       * vuelve a tocar la pista y la sigue corriendo hasta irse más deprisa.
       * Volado en Gran Canaria, a los 2.900 m de sus 3.100 (enmienda H37b del
       * ADR 0027). Su manual, por debajo de 85 nudos, manda parar.
       */
      const deLineaAzul = o.avion().conUnMotor === "VYSE";
      /*
       * El circuito de vuelta, a la escala de cada avión: el reactor, alto y
       * ancho —vira con dos kilómetros de radio—; el turbohélice y el bimotor
       * de pistón, a mil pies y más cerca, que con un motor suben poco y no
       * hay por qué subir más.
       */
      const alto = esReactor ? 600 : 300;
      const tendido = esReactor ? 4500 : vref > 45 ? 2600 : 2200;
      const largoDeFinal = esReactor ? 11000 : vref > 45 ? 6000 : 5000;

      const traza = [];
      const antes = {
        instructor: o.dichoTodo().instructor.length,
        torre: o.dichoTodo().torre.length,
        cantados: o.cantados().length,
      };

      /*
       * **El piloto del banco**: la velocidad con el timón de profundidad por
       * actitud —en dos lazos, como las pruebas del modelo—, el rumbo con el
       * alabeo, el derrape con el pedal —que es donde un motor parado se
       * sujeta— y el gas donde toca. Cada tramo pide una cosa.
       */
      let reloj = o.reloj();
      let lenta = 0;
      let deActitud = 0;
      let dePedal = 0;
      let deGas = 0.5;
      /** El alabeo que pide el rumbo ahora mismo, para la traza. */
      let quiereAlabeo = 0;
      let tramo = modo === "planeo" ? "planeo" : modo === "despres" ? "crucero" : "carrera";
      let paso = 0;
      let tocoEn = null;
      let bajo = Infinity;
      let mandoAlAire = false;
      let pedalMaximo = 0;
      let desdeElFallo = null;
      // Dónde y con qué tren falló: el de «sin tren» tiene que ser a 650 ft y fuera.
      let alFallar = null;
      let aseguradoEn = null;
      let recorridoAlParar = null;
      // En `despues`, de la toma a parar: lo que se aparta del eje y el pie que pisa.
      let enTierraDesvio = 0;
      let enTierraPedal = 0;
      let enTierraDonde = "";
      // En la carga suelta: el centro con que vuela el modelo al soltarse, y lo más atrás que llega.
      let centradoAlFallar = null;
      let centradoMaximo = -Infinity;
      // En el tren de nariz: a qué velocidad se probó la de emergencia, y cómo se sostiene la nariz al tocar.
      let alExtender = null;
      let narizObjetivo = null;
      let narizDesde = 0;
      let narizSoltando = false;
      let narizSoltadaA = null;
      let recogida = null;
      // Sin radio: cuándo se calló y volvió, lo que tenían dicho la torre y la frecuencia, las alas y la pista ocupada.
      let calladaEn = null;
      let devueltaEn = null;
      let dichoAlCallarse = null;
      let dichoAlVolver = null;
      let alasDesde = null;
      /** El lado al que alabea el banco ahora mismo, al contestar a los destellos. */
      let ladoDeLasAlas = 1;
      let alasEn = null;
      let sinVerdeEnLaFinal = 0;
      /** En cada final sin la verde: con qué luz, y quién estaba en la pista o en la final por delante. */
      const sinVerdePor = [];
      let ocupadaPuesta = null;
      let rojaConAlguienEnLaPista = null;
      let lamparaVista = null;
      let tiraConLaRadioCallada = null;
      // De noche: los golpes de los faros que contestan, cada uno con su segundo.
      const faros = [];
      // Y en el suelo: lo que se aparta del eje, y dónde se para.
      let radioDesvio = 0;
      let paroEn = null;
      let farosALaVelocidad = false;
      let farosHechos = false;
      // Con la rueda reventada: lo que se va del eje y el pie que pisa, en la carrera y en la toma; y la tarjeta.
      const rev = {
        lado: null,
        indicada: null,
        tarjeta: false,
        pedales: 0,
        pasos: 0,
        // El pie de antes, el que pide el viento, con el que se compara el de después.
        pedalesAntes: 0,
        pasosAntes: 0,
        desvio: 0,
        tirado: null,
        trenMetido: false,
        sacadoEn: null,
        alVolver: null,
      };
      let declaradaEn = null;
      // Con la rueda que revienta al tomar: las tarjetas por su orden, el autofreno, el eje y dónde se para.
      const tm = {
        tarjetas: [],
        alTocar: null,
        alReventar: null,
        desvio: 0,
        pieMaximo: 0,
        pedales: 0,
        pasos: 0,
        autofreno: "off",
        fuera: false,
        deprisa: 0,
        parado: null,
        megafonia: null,
      };
      // Con el ave en un motor: los estallidos, las agujas, la palanca, el pie y la tarjeta.
      const av = {
        motor: null,
        estallidos: [],
        separan: 0,
        otra: 1,
        pasos: [],
        tarjeta: false,
        palanca: [],
        pedales: 0,
        cuantos: 0,
        pieMaximo: 0,
        nariz: null,
        rumbo: null,
        yendose: 0,
        mensajes: [],
        luz: false,
      };
      // En `ave` el circuito empieza más lejos: se sube recto mientras la compañera lleva la palanca.
      const lejos = pista.length + (modo === "ave" ? 6500 : 3000);
      /*
       * **Y sin radio, por el lado del circuito del campo** (H86), que es por
       * donde se vuelve mirando a la torre: en Gran Canaria es la derecha, que
       * es por donde iba siempre el banco, y en Asunción, el este que publica su
       * carta, que por la 02 es la derecha y por la 20 la izquierda (H92).
       */
      const ladoDelCircuito =
        modo === "radio"
          ? Math.sign(o.circuito().reduce((suma, v) => suma + enPista(v.x, v.z).c, 0)) || 1
          : 1;
      const puntos = [
        [lejos, 0],
        [lejos + tendido, tendido * ladoDelCircuito],
        [-largoDeFinal, tendido * ladoDelCircuito],
        [-largoDeFinal, 0],
      ];
      const profundidad = (s, quiereCabeceo, dt) => {
        const falta = quiereCabeceo - o.actitud().cabeceo;
        deActitud = acota(deActitud + 0.8 * falta * dt, -0.5, 0.5);
        return acota(2.5 * falta - 1.2 * s.pitchRate + deActitud, -1, 1);
      };
      const porVelocidad = (s, v, dt) => {
        const e = s.airspeed - v;
        lenta = acota(lenta + 0.004 * e * dt, -0.3, 0.3);
        return profundidad(s, acota(0.02 * e + lenta, -0.25, 0.35), dt);
      };
      const porSubida = (s, vs, dt) => {
        const e = vs - s.verticalSpeed;
        lenta = acota(lenta + 0.004 * e * dt, -0.3, 0.3);
        return profundidad(s, acota(lenta + 0.012 * e, -0.25, 0.3), dt);
      };
      const gasPara = (s, v, dt) => {
        const e = v - s.airspeed;
        deGas = acota(deGas + 0.02 * e * dt, 0, 1);
        return acota(deGas + 0.08 * e, 0, 1);
      };
      const rumboA = (s, x, z) => Math.atan2(x - s.position.x, -(z - s.position.z));
      const alabear = (s, rumbo, tope) => {
        const e = error(rumbo, s.heading);
        const quiere = acota(e * 1.4, -tope, tope);
        quiereAlabeo = quiere;
        return acota((quiere - o.actitud().alabeo) * 1.6 - s.rollRate * 0.3, -0.6, 0.6);
      };
      /*
       * **Y en la final, la mano firme, que es un tiempo y no un número** (H99).
       *
       * Con 1,6 de alerón por radián que falta, la inclinación que falta se
       * cierra a 1,6 veces lo que rueda cada avión por unidad de alerón. La
       * avioneta, con las ayudas de Taguató, rueda 43° por segundo y con 1,6
       * trae el ala en ocho décimas; el JAZ 90 rueda 12 y tarda tres segundos,
       * los mismos que una racha de Gando en ladearlo otra vez. Volado allí con
       * un motor parado y la traza de cada medio segundo: a 1,5 km del umbral
       * el avión iba siete grados a un lado con el piloto pidiendo diez al
       * otro, y pasó siete segundos seguidos con el ala de seis a diecinueve
       * grados por detrás de la pedida. Se fue a 57 m del eje a un lado y a 25
       * al otro, y tocó a 22. El lazo de fuera corregía bien, pero lo que
       * pedía llegaba cuatro segundos tarde. Es lo mismo que en el banco del
       * vuelo entero (#192, H34g).
       *
       * Y con un motor parado hay además quien lo empuja sin racha ninguna: el
       * gas. Sube y baja cada cuarenta segundos —el motor tarda cinco en dar lo
       * que se le pide—, cada vaivén es guiñada hacia un lado, el pie va
       * detrás, y el derrape ladea el avión uno o dos grados que la mano floja
       * dejaba ahí. En la mesa, sin rachas, ±14 m; con los dos motores, nada.
       *
       * Así que el ala se trae en el mismo tiempo en todos, seis décimas, con
       * lo que rueda cada uno a la velocidad que va y con la amortiguación de
       * su peldaño; y nunca con menos de 1,6, que es lo que había.
       */
      const RITMO_DE_LA_MANO = 1.72;
      const laMano = (() => {
        const este = aircraftById(avionId);
        const clp = Math.abs(este.aero.clP);
        const extra = TIERS.find((x) => x.id === peldano)?.assists.extraDamping ?? 0;
        const amortiguado = clp / (clp + 0.5 * extra);
        return (v) => Math.max(1.6, RITMO_DE_LA_MANO / (alabeoAFondo(este, v) * amortiguado));
      })();
      /*
       * Y lo de fuera, al paso de la mano: el rumbo pide más inclinación y se
       * mira seis segundos por delante, no ochocientos metros, que al JAZ 90 le
       * son doce y a la avioneta veinticinco.
       */
      const GANANCIA_DEL_RUMBO = 2.5;
      const SEGUNDOS_DE_MIRADA = 6;
      const alabearEnLaFinal = (s, rumbo, tope) => {
        const quiere = acota(error(rumbo, s.heading) * GANANCIA_DEL_RUMBO, -tope, tope);
        quiereAlabeo = quiere;
        return acota((quiere - o.actitud().alabeo) * laMano(s.airspeed) - s.rollRate * 0.3, -0.8, 0.8);
      };
      const pedal = (s, dt) => {
        dePedal = acota(dePedal + 2 * s.beta * dt, -1, 1);
        const p = acota(4 * s.beta + dePedal - 0.5 * s.yawRate, -1, 1);
        pedalMaximo = Math.max(pedalMaximo, Math.abs(p));
        return p;
      };

      const piloto = (c) => {
        const ahora = o.reloj();
        const dt = Math.max(0, Math.min(0.25, ahora - reloj));
        reloj = ahora;
        const s = o.estado();
        const ej = o.ejercicio();
        const p = enPista(s.position.x, s.position.z);
        const sobre = s.position.y - cota;
        if (ej?.fase !== "armada" && desdeElFallo === null) {
          desdeElFallo = ahora;
          /*
           * **Y en `morro`, desde la avería a la velocidad de verdad** (H70b).
           * A cuatro por uno la final dura unos veinte segundos de pared, y lo
           * que la instructora tiene que decir —la rueda que no salió, la
           * perilla y el «tampoco», con el PAN PAN y la torre en medio— pasa
           * de veinticuatro: con las frases grabadas, el «tampoco» llegaba con
           * el avión ya parado. Las voces no van más deprisa con el reloj.
           */
          if (modo === "morro" || modo === "reventon" || modo === "toma" || modo === "ave") o.acelerar?.(1);
          if (modo === "toma") {
            rev.lado = ej?.reventon?.lado ?? null;
            rev.rumbo = s.heading;
            tm.alReventar = { c: p.c, a: p.a, v: s.groundSpeed };
            tm.megafonia = { comandante: o.dichoTodo().comandante.length, tripulacion: o.dichoTodo().tripulacion.length };
            globalThis.setTimeout(() => globalThis.__foto?.("golpe"), 500);
            globalThis.setTimeout(() => globalThis.__foto?.("pie"), 2600);
            globalThis.setTimeout(() => globalThis.__foto?.("freno"), 6000);
          }
          if (modo === "ave") {
            av.motor = ej?.ave?.motor ?? null;
            av.rumbo = s.heading;
            globalThis.setTimeout(() => globalThis.__foto?.("golpe"), 700);
            globalThis.setTimeout(() => globalThis.__foto?.("pie"), 4600);
          }
          if (modo === "reventon") {
            rev.lado = ej?.reventon?.lado ?? null;
            rev.indicada = o.indicada();
            rev.rumbo = s.heading;
            globalThis.setTimeout(() => globalThis.__foto?.("golpe"), 500);
            globalThis.setTimeout(() => globalThis.__foto?.("pie"), 2600);
          }
          alFallar = { sobre, trenFuera: o.trenQueSePide() };
          centradoAlFallar = ej?.centrado ?? null;
        }
        if (ej?.fase !== "armada" && typeof ej?.centrado === "number")
          centradoMaximo = Math.max(centradoMaximo, ej.centrado);
        // Sin tren: se mete cuando lo piden, que es en cuanto falla.
        if (sinTren && ej?.fase !== "armada" && !s.onGround && o.trenQueSePide()) o.pedirTren(false);
        if (ej?.asegurado && aseguradoEn === null) aseguradoEn = ahora;
        // La indicada, que es la que pide su manual: en Gando la verdadera va dos nudos por encima.
        if (ej?.morro?.extension && alExtender === null) alExtender = o.indicada();
        if (modo === "radio") {
          const golpe = ej?.radio?.faros ?? null;
          if (golpe !== null && (faros.length === 0 || faros[faros.length - 1].golpe !== golpe)) {
            faros.push({ golpe, t: ahora });
            // La tarjeta, con los faros apagados y encendidos.
            if (faros.length <= 2) globalThis.setTimeout(() => globalThis.__foto?.(golpe ? "faros" : "faros-apagados"), 150);
          }
          /*
           * De noche, a la velocidad de verdad desde los destellos hasta que
           * acaban los faros: a cuatro por uno cada golpe dura dos décimas de
           * pared, y no hay quien lo vea.
           */
          if (deNoche && !farosHechos) {
            if (ej?.radio?.lampara === "destellos" && !farosALaVelocidad) {
              farosALaVelocidad = true;
              o.acelerar?.(1);
            }
            if (faros.length >= 5 && golpe === null) {
              farosHechos = true;
              o.acelerar?.(4);
            }
          }
          const callada = !!ej?.radio?.callada;
          if (callada && calladaEn === null) {
            calladaEn = ahora;
            const d = o.dichoTodo();
            dichoAlCallarse = { torre: d.torre.length, otro: d.otro.length };
          }
          if (!callada && calladaEn !== null && devueltaEn === null) {
            devueltaEn = ahora;
            const d = o.dichoTodo();
            dichoAlVolver = { torre: d.torre.slice(dichoAlCallarse.torre), otro: d.otro.slice(dichoAlCallarse.otro) };
          }
          if (callada) {
            // La tira de la radio no escribe nada mientras está callada.
            const tira = document.querySelector('[data-hud="radio"]');
            if (tira && !tira.hidden && tira.textContent.trim() && tiraConLaRadioCallada === null)
              tiraConLaRadioCallada = tira.textContent.trim().slice(0, 80);
            // Y la lámpara, grande y sin letras: se mira la primera vez que se enciende.
            const caja = document.querySelector('[data-hud="torre"]');
            if (caja && !caja.hidden && lamparaVista === null) {
              const luz = caja.querySelector('[data-hud="torre-luz"]');
              const texto = caja.querySelector('[data-hud="torre-texto"]');
              lamparaVista = {
                clase: caja.className,
                ancho: luz ? Math.round(luz.getBoundingClientRect().width) : 0,
                letras: texto ? getComputedStyle(texto).display !== "none" && texto.textContent.trim() !== "" : false,
              };
            }
          }
          if (ej?.radio?.lampara === "roja" && rojaConAlguienEnLaPista === null)
            rojaConAlguienEnLaPista = (o.trafico?.() ?? []).filter((a) => a.enLaPista).map((a) => a.matricula);
        }

        if (modo === "reventon" && desdeElFallo !== null) {
          if (!rev.tarjeta) rev.tarjeta = !!document.querySelector(".senal:not([hidden]) .senal__tira");
          if (s.onGround && (tramo === "carrera" || tramo === "rotar" || tramo === "parar"))
            rev.desvio = Math.max(rev.desvio, Math.abs(p.c));
          // Lo que tira antes de que el pie haga nada: el rumbo a las ocho décimas.
          if (rev.tirado === null && ahora - desdeElFallo > 0.8) rev.tirado = error(s.heading, rev.rumbo);
          if (!s.onGround && !o.trenQueSePide()) rev.trenMetido = true;
        }
        if (modo === "toma") {
          // La final, a la velocidad de verdad; la vuelta, a cuatro por uno.
          const despacio = desdeElFallo !== null || (tramo === "final" && p.a > -4000);
          if (rev.despacio !== despacio) {
            rev.despacio = despacio;
            o.acelerar?.(despacio ? 1 : 4);
          }
          const puesto = o.tarjeta().dibujo;
          if (tocoEn !== null && puesto && tm.tarjetas[tm.tarjetas.length - 1] !== puesto) {
            tm.tarjetas.push(puesto);
            if (puesto === "para-en-la-pista" || puesto === "goma-suelta" || puesto === "bomberos")
              globalThis.setTimeout(() => globalThis.__foto?.(puesto), 900);
          }
          if (!s.onGround && tramo === "final" && sobre < 60) tm.autofreno = o.aerofrenos?.().autofreno ?? tm.autofreno;
          if (desdeElFallo !== null) {
            if (!rev.tarjeta) rev.tarjeta = !!document.querySelector(".senal:not([hidden]) .senal__tira");
            if (rev.tirado === null && ahora - desdeElFallo > 0.8) rev.tirado = error(s.heading, rev.rumbo);
            if (s.onGround && !s.onRunway && s.groundSpeed > 0.6) {
              tm.fuera = true;
              tm.deprisa = Math.max(tm.deprisa, s.groundSpeed);
            }
            // Hasta que se va: quien deja la pista a propósito la cruza hasta el borde, y eso no es irse del eje.
            if (s.onGround && s.onRunway && tramo !== "dejar") tm.desvio = Math.max(tm.desvio, Math.abs(p.c));
            if (s.groundSpeed < 0.5 && tm.parado === null) tm.parado = { a: p.a, c: p.c, enPista: !!s.onRunway };
          }
        }
        if (modo === "ave" && desdeElFallo !== null && av.motor !== null && ej?.ave) {
          const t = ahora - desdeElFallo;
          const n = ej.ave.tocado?.estallidos ?? 0;
          if (n > av.estallidos.length) {
            av.estallidos.push({ t, paso: ej.ave.paso });
          }
          const suya = ej.ave.agujas[av.motor] ?? 0;
          const otra = ej.ave.agujas[1 - av.motor] ?? 0;
          if (ej.ave.paso === "petardea") {
            av.separan = Math.max(av.separan, otra - suya);
            av.yendose = Math.max(av.yendose, Math.abs(error(s.heading, av.rumbo)));
          }
          if (ej.ave.paso === "quieto") av.otra = Math.min(av.otra, otra);
          const ultimo = av.pasos[av.pasos.length - 1];
          if (ultimo?.paso !== ej.ave.paso) {
            av.pasos.push({ paso: ej.ave.paso, t, sobre, alabeo: o.actitud().alabeo, agujas: [...ej.ave.agujas] });
            globalThis.setTimeout(() => globalThis.__foto?.(`palanca-${av.pasos.length}`), 900);
          }
          if (document.querySelector(".senal:not([hidden]) .senal__fogonazo")) av.tarjeta = true;
          const p1 = document.querySelector(".senal:not([hidden]) .senal__palanca");
          if (p1) {
            const cual = `${p1.closest("g[transform]") ? "derecha" : "izquierda"}-${p1.classList.contains("senal__palanca--atras") ? "atras" : "media"}`;
            if (!av.palanca.includes(cual)) av.palanca.push(cual);
          }
          if (ej.ave.paso !== "parado") for (const m of ej.mensajes ?? []) if (!av.mensajes.includes(m)) av.mensajes.push(m);
        }
        if ((modo === "reventon" || modo === "ave") && desdeElFallo !== null) {
          /*
           * A la velocidad de verdad lo que se dice —del golpe a lo de la
           * llamada, y la final—, y a cuatro por uno el circuito, que no se
           * dice nada del ejercicio.
           */
          if (ej?.declarada && declaradaEn === null) declaradaEn = ahora;
          const despacio = declaradaEn === null || ahora - declaradaEn < 35 || tramo === "final";
          if (rev.despacio !== despacio) {
            rev.despacio = despacio;
            o.acelerar?.(despacio ? 1 : 4);
          }
        }

        if (tramo === "crucero") {
          // Hasta que se va el aire, recto y a nivel hacia la pista de casa.
          const objetivo = aMundo(0, 0);
          c.aileron = alabear(s, rumboA(s, objetivo.x, objetivo.z), 0.3);
          c.rudder = 0;
          c.elevator = porSubida(s, 0, dt);
          return;
        }

        if (tramo === "planeo") {
          // Antes del fallo, recto y a nivel hacia la pista; después, a planear.
          const objetivo = aMundo(p.a < -300 ? 0 : 3000, 0);
          c.aileron = alabear(s, rumboA(s, objetivo.x, objetivo.z) , 0.35);
          c.rudder = 0;
          if (!o.sinMotor()) {
            c.elevator = porSubida(s, 0, dt);
            return;
          }
          c.throttle = 0;
          if (s.onGround) {
            c.brakes = 1;
            c.elevator = 0;
            return;
          }
          const u = -p.a;
          const quiereV =
            u > 2500 ? planeo.velocidad : Math.max(vref * 1.1, planeo.velocidad - (2500 - u) * 0.02);
          if (s.airspeed < vfe && u < 3000) o.pedirFlaps(1);
          const senda = (u + 400) * Math.tan((3.5 * Math.PI) / 180);
          let quiereVs = acota(
            -s.airspeed * Math.sin((3.5 * Math.PI) / 180) + (senda - sobre) * 0.08,
            -14,
            0,
          );
          if (s.airspeed < quiereV * 0.95) quiereVs = Math.min(quiereVs, -s.airspeed / planeo.fineza - 2);
          if (sobre < 14) quiereVs = -1.2 - sobre * 0.08;
          c.elevator = porSubida(s, quiereVs, dt);
          return;
        }

        if (tramo === "carrera") {
          c.throttle = 1;
          // Recto por el eje: la rueda de morro con el alerón y el pedal.
          const quiere = h - Math.atan(p.c * 0.02);
          const e = error(quiere, s.heading);
          c.aileron = acota(e * 3, -1, 1);
          c.rudder = acota(e * 4 + 3 * s.beta, -1, 1);
          c.elevator = 0;
          if (modo === "reventon" && desdeElFallo === null && s.airspeed > 40) {
            rev.pedalesAntes += c.rudder;
            rev.pasosAntes++;
          }
          if (modo === "reventon" && desdeElFallo !== null) {
            // Ocho décimas sin tocar nada, lo que se tarda en notarlo; y después, el eje con el pie.
            if (ahora - desdeElFallo < 0.8) {
              c.rudder = 0;
              c.aileron = 0;
            } else {
              c.aileron = 0;
              rev.pedales += c.rudder;
              rev.pasos++;
            }
            pedalMaximo = Math.max(pedalMaximo, Math.abs(c.rudder));
            if (parar && ahora - desdeElFallo > 1.5) {
              tramo = "parar";
              return;
            }
          }
          if ((modo === "antes" || modo === "carrera") && ej?.fase !== "armada") tramo = "parar";
          else if (s.airspeed >= (vel.vr ?? vref) && ej?.fase !== "armada") tramo = "rotar";
          else if (s.airspeed >= (vel.vr ?? vref) && modo !== "antes") tramo = "rotar";
          return;
        }

        if (tramo === "parar") {
          c.throttle = 0;
          c.brakes = 1;
          c.reversa = 1;
          const e = error(h - Math.atan(p.c * 0.02), s.heading);
          c.aileron = acota(e * 3, -1, 1);
          c.rudder = acota(e * 4 + 3 * s.beta, -1, 1);
          if (modo === "reventon") pedalMaximo = Math.max(pedalMaximo, Math.abs(c.rudder));
          if (s.groundSpeed < 0.5 && recorridoAlParar === null) recorridoAlParar = p.a;
          return;
        }

        if (tramo === "dejar") {
          /*
           * **Dejar la pista rodando**, por la raya del juego y a siete metros
           * por segundo, y parar cuando ya se ha contado: cinco segundos fuera.
           */
          const raya = o.laRaya();
          let cerca = 0;
          let d0 = Infinity;
          raya.forEach((q, i) => {
            const d = Math.hypot(q[0] - s.position.x, q[1] - s.position.z);
            if (d < d0) {
              d0 = d;
              cerca = i;
            }
          });
          let alla = raya[cerca];
          for (let i = cerca; i < raya.length; i++) {
            alla = raya[i];
            if (Math.hypot(alla[0] - s.position.x, alla[1] - s.position.z) > 30) break;
          }
          const e = alla ? error(rumboA(s, alla[0], alla[1]), s.heading) : 0;
          c.aileron = acota(e * 2, -1, 1);
          c.rudder = 0;
          c.elevator = 0;
          c.reversa = 0;
          if (!s.onRunway && rev.alVolver === null) rev.alVolver = { desde: ahora };
          const yaBasta = rev.alVolver !== null && ahora - rev.alVolver.desde > 5;
          c.throttle = yaBasta ? 0 : acota((7 - s.groundSpeed) * 0.12, 0, 0.35);
          c.brakes = yaBasta ? 0.6 : s.groundSpeed > 8 ? 0.3 : 0;
          return;
        }

        if (tramo === "rotar") {
          c.throttle = 1;
          /*
           * En el suelo, el pedal sigue llevando el avión por el eje: con un
           * motor parado el avión tira hacia él, y en el suelo el derrape no
           * lo dice —las ruedas no dejan—. En el aire, el derrape.
           */
          if (s.onGround) {
            const e = error(h - Math.atan(p.c * 0.02), s.heading);
            c.rudder = acota(e * 4 + 3 * s.beta, -1, 1);
            c.aileron = 0;
          } else {
            c.rudder = pedal(s, dt);
            c.aileron = alabear(s, h, 0.1);
          }
          // A la actitud de despegue de un avión de línea, unos ocho grados y
          // medio: con un motor se separa un poco más tarde, cerca de la V2.
          c.elevator = profundidad(s, 0.15, dt);
          // El de pistón, en cuanto vuela, a lo de su manual: ver `deLineaAzul`.
          if (!s.onGround && sobre > (deLineaAzul ? 3 : 15)) tramo = "subida";
          return;
        }

        /*
         * Y en `tren`, el despegue de siempre con los dos: el tren dentro con
         * la subida hecha, que es lo que el ejercicio espera para el fallo.
         */
        /*
         * Y en `morro`, el tren dentro en cuanto sube, y abajo en la final: es
         * al sacarlo cuando la rueda de morro no sale. Después del fallo, no se
         * vuelve a meter.
         */
        const meteElTren =
          modo === "morro"
            ? ej?.fase === "armada" && tramo !== "final"
            : modo === "toma"
              ? ej?.fase === "armada" && tramo !== "final"
            : modo === "reventon"
              ? meteTren && rev.sacadoEn === null && tramo !== "final"
            : modo === "ave"
              ? tramo !== "final"
            : ej?.fase !== "armada" || (modo === "tren" && !sinTren);
        if (!s.onGround && meteElTren) {
          /*
           * «After establishing a climb»: en el de pistón, con la subida hecha
           * aunque sea poca. Y no antes: metido a un metro del suelo, con la
           * hélice aún en molinete, el avión vuelve a la pista sin ruedas.
           */
          if (deLineaAzul ? s.verticalSpeed > 0.3 && sobre > 8 : s.verticalSpeed > 1 && sobre > 12)
            o.pedirTren(false);
        }
        // Y si se metió, se saca cuando se cuenta por qué: con la voz grabada, lo dicho; sin ella, lo cantado.
        if (modo === "reventon" && rev.trenMetido && rev.sacadoEn === null &&
            [...o.dichoTodo().instructor, ...o.cantados()].some((k) => String(k).includes("ejercicio.reventon.sacalo"))) {
          rev.sacadoEn = ahora;
          o.pedirTren(true);
        }
        c.rudder = pedal(s, dt);
        // El pie con esa palanca atrás, que es cuando más tira, y en la subida recta.
        if (modo === "ave" && tramo === "subida" && (ej?.ave?.paso === "quieto" || ej?.ave?.paso === "parado")) {
          av.pedales += c.rudder;
          av.cuantos++;
        }
        if (modo === "ave" && tramo === "subida") av.pieMaximo = Math.max(av.pieMaximo, Math.abs(c.rudder));

        if (tramo === "subida") {
          c.throttle = 1;
          /*
           * **La avioneta de la carga suelta sube a 74 nudos**, 1,15 veces su
           * vref: la Vy que el juego usa para el JAZ 20 (`SUBIDA_DEL_JAZ_20`,
           * del 172S) y dentro de la subida del despegue del 172R, «Normal
           * Climb Out 70-80 KIAS» (POH, p. 4-5). Con los flaps dentro en
           * cuanto tiene altura. La V2 es de los que deciden con V1, y el
           * monomotor no tiene: la primera tirada subió a 49 nudos, lo que el
           * juego daba entonces como V2 del 172, y el avisador de pérdida sonó
           * antes de soltarse la maleta. La lección es la contraria: velocidad
           * de sobra.
           */
          if ((modo === "carga" || modo === "morro" || modo === "radio") && sobre > 60) o.pedirFlaps(0);
          // Con los dos motores, la V2 y diez nudos, que es como se sube un reactor entero.
          /*
           * Y en `ave`, con los dos motores y lo que pesa hoy, a fondo subía a
           * veintiocho metros por segundo con la nariz a veinte grados, y al ir
           * a buscarla de golpe sonaba el avisador de pérdida encima de la
           * tarjeta. Nueve décimas de gas, y la nariz a dos grados por segundo.
           */
          if (modo === "ave") {
            c.throttle = 0.9;
            const e = s.airspeed - ((vel.v2 ?? vref * 1.2) + 20 * 0.514444);
            lenta = acota(lenta + 0.004 * e * dt, -0.3, 0.3);
            av.nariz = av.nariz ?? o.actitud().cabeceo;
            av.nariz = acota(acota(0.02 * e + lenta, -0.1, 0.28), av.nariz - 0.04 * dt, av.nariz + 0.035 * dt);
            c.elevator = profundidad(s, av.nariz, dt);
            c.aileron = alabear(s, h, 0.15);
            // Recto hasta saber cómo queda el motor: primero el avión, y después el circuito.
            const yaSeSabe = ej?.ave?.paso === "aguanta" || ej?.ave?.paso === "parado" || sobre > 1300;
            if (sobre > alto - 40 && yaSeSabe) {
              tramo = "circuito";
              lenta = 0;
            }
            return;
          }
          const v2 =
            modo === "carga" || modo === "radio"
              ? vref * 1.15
              : (vel.v2 ?? vref * 1.2) + (modo === "reventon" || modo === "toma" ? 10 * 0.514444 : 0);
          if (deLineaAzul && (ej?.fase !== "armada" || modo === "tren")) {
            /*
             * Sin bajar de la Vr, subiendo lo justo mientras le falte para la
             * línea azul, y en ella, a ella. Los flaps, dentro cuando ya va
             * deprisa para ir sin ellos: a diez nudos de la línea azul. Y en
             * `tren`, también con los dos en marcha: ir a buscar los 92 nudos
             * con el morro desde la Vr, a tres metros del suelo, era bajarlo
             * once grados.
             */
            const vr = vel.vr ?? vref;
            c.elevator =
              s.airspeed >= v2 - 0.5
                ? porVelocidad(s, v2, dt)
                : s.airspeed < vr + 1
                  ? porVelocidad(s, vr + 1.5, dt)
                  : porSubida(s, 0.4, dt);
            if (s.airspeed > v2 - 5.1 && sobre > 15) o.pedirFlaps(0);
          } else c.elevator = porVelocidad(s, v2, dt);
          c.aileron = alabear(s, h, 0.15);
          if (sobre > alto - 40) {
            tramo = "circuito";
            lenta = 0;
          }
          return;
        }

        if (tramo === "circuito") {
          const [pa, pc] = puntos[paso];
          const w = aMundo(pa, pc);
          c.aileron = alabear(s, rumboA(s, w.x, w.z), (20 * Math.PI) / 180);
          if (modo === "radio") {
            if (sobre > 60) o.pedirFlaps(0);
            /*
             * **Las alas que contestan a los destellos**: de un lado al otro,
             * hasta que el avión pasa de catorce grados de ese lado, y no a
             * reloj: con un segundo y medio por lado el bimotor iba al filo de
             * los diez que pide el juego, y unas tiradas contestaba y otras no.
             * En la subida, el tramo cruzado o el viento en cola —no en la
             * base, que el SERA lo deja fuera—, hasta que el juego lo cuente o
             * doce segundos, que es lo que insiste quien no ve respuesta.
             */
            const destellos = ej?.radio?.lampara === "destellos";
            if (!deNoche && destellos && (ej?.radio?.contestaciones ?? 0) === 0 && paso <= 2 && alasDesde === null)
              alasDesde = ahora;
            if (alasDesde !== null && alasEn === null) {
              const t = ahora - alasDesde;
              if ((ej?.radio?.contestaciones ?? 0) > 0 || t > 12) alasEn = { t, contestaron: (ej?.radio?.contestaciones ?? 0) > 0 };
              else {
                if (o.actitud().alabeo * ladoDeLasAlas > (14 * Math.PI) / 180) ladoDeLasAlas = -ladoDeLasAlas;
                const quiere = ladoDeLasAlas * ((18 * Math.PI) / 180);
                c.aileron = acota((quiere - o.actitud().alabeo) * 1.6 - s.rollRate * 0.3, -0.6, 0.6);
              }
            }
          }
          c.elevator = porSubida(s, acota((alto - sobre) * 0.12, -4, 3), dt);
          c.throttle = gasPara(s, vref * 1.35, dt);
          if (Math.hypot(s.position.x - w.x, s.position.z - w.z) < 700) paso++;
          if (paso >= puntos.length) tramo = "final";
          return;
        }

        if (tramo === "final") {
          const u = -p.a;
          /*
           * **Por la traza, no por el morro, y mirando más cerca al llegar.**
           *
           * Apuntaba el morro a un punto del eje dos kilómetros y medio por
           * delante, y eso deja un desvío fijo: con un motor parado y el pie
           * sujetándolo, o con algo de viento de costado, el avión no va
           * adonde apunta el morro, y a 2.500 m de palanca la corrección de
           * veinte metros es de medio grado. Medido con la traza en Gran
           * Canaria: el eje a 2 m a cuatro kilómetros, a 16 m en el umbral y
           * a 26 m al tocar, en una pista de 45 de ancho —el juego la da por
           * pisada hasta 28,5, y una tirada sí y otra no caía fuera—. Lo que
           * hace un piloto es llevar **la traza** al eje y mirar más cerca
           * cuanto más cerca está.
           */
          const adelante = Math.max(
            SEGUNDOS_DE_MIRADA * Math.hypot(s.velocity.x, s.velocity.z),
            Math.min(2500, u * 0.6),
          );
          const lead = aMundo(Math.min(p.a + adelante, pista.length), 0);
          const deriva =
            Math.hypot(s.velocity.x, s.velocity.z) > 5
              ? error(Math.atan2(s.velocity.x, -s.velocity.z), s.heading)
              : 0;
          c.aileron = s.onGround
            ? alabear(s, h, (18 * Math.PI) / 180)
            : alabearEnLaFinal(s, rumboA(s, lead.x, lead.z) - deriva, (18 * Math.PI) / 180);
          if (s.onGround) {
            if (tocoEn === null)
              tocoEn = {
                enPista: !!s.onRunway,
                a: p.a,
                vs: s.verticalSpeed,
                cabeceo: o.actitud().cabeceo,
                // Lo que tocó: las principales solas, o ya la panza del morro.
                morroEnLaPista: !!ej?.morro?.enLaPista || !!ej?.morro?.posado,
              };
            c.throttle = 0;
            if (modo === "morro") {
              /*
               * **Lo del manual de la FAA**: la nariz arriba, sostenida con el
               * timón hasta que haga falta casi todo —nueve décimas—, y
               * entonces se suelta poco a poco, dos grados por segundo, para
               * que baje despacio. Sin frenos, y por el eje con el pie: sin
               * rueda de morro, el volante no gira nada.
               */
              const cab = o.actitud().cabeceo;
              if (narizObjetivo === null) narizObjetivo = cab;
              narizDesde += dt;
              let e = acota(20 * (narizObjetivo - cab) - 4 * s.pitchRate, -1, 1);
              if (!narizSoltando && e >= 0.9 && narizDesde > 1.5) {
                narizSoltando = true;
                narizSoltadaA = s.airspeed;
              }
              if (narizSoltando) {
                narizObjetivo -= ((2 * Math.PI) / 180) * dt;
                e = acota(20 * (narizObjetivo - cab) - 4 * s.pitchRate, -1, 1);
              }
              c.elevator = e;
              c.brakes = 0;
              c.reversa = 0;
              const rumbo = error(h - Math.atan(p.c * 0.02), s.heading);
              c.rudder = acota(rumbo * 4 + 3 * s.beta, -1, 1);
              c.aileron = 0;
              return;
            }
            if (modo === "ave") {
              // Una toma como cualquiera, por el eje con el pie: el motor al ralentí da lo mismo que el otro.
              c.rudder = acota(error(h - Math.atan(p.c * 0.008), s.heading) * 4 + 3 * s.beta, -1, 1);
              c.aileron = 0;
              c.brakes = 0.6;
              c.reversa = 1;
              c.elevator = 0;
              return;
            }
            if (modo === "toma") {
              /*
               * **Las tres cosas**: ocho décimas sin tocar nada desde el golpe,
               * lo que se tarda en notarlo; el eje con el pie y la reversa; y
               * cuando se pide, el freno a cuatro décimas, hasta parar en la
               * pista. «Maximum use of reverse thrust is recommended» (*737 NG
               * FCTM*, p. 8.40).
               */
              tm.alTocar ??= { c: p.c, a: p.a };
              const t = desdeElFallo === null ? null : ahora - desdeElFallo;
              const rumbo = error(h - Math.atan(p.c * 0.008), s.heading);
              const pide = acota(rumbo * 4 + 3 * s.beta, -1, 1);
              c.aileron = 0;
              c.elevator = 0;
              c.rudder = t !== null && t < 0.8 ? 0 : pide;
              c.reversa = t !== null && t > 1.5 && s.groundSpeed > 32 ? 1 : 0;
              c.brakes = t !== null && t > 4.5 ? 0.4 : 0;
              if (t !== null && t > 0.8 && s.groundSpeed > 20) {
                tm.pedales += c.rudder;
                tm.pasos++;
                tm.pieMaximo = Math.max(tm.pieMaximo, Math.abs(c.rudder));
              }
              if (deja && t !== null && s.groundSpeed < 12) tramo = "dejar";
              return;
            }
            if (modo === "reventon") {
              /*
               * El eje con el pie y el freno a cuatro décimas, suave y parejo,
               * con la reversa, que no es de las ruedas: «gentle wheel
               * braking», «minimum braking» (AAIB, G-BZAY).
               */
              const rumbo = error(h - Math.atan(p.c * 0.008), s.heading);
              c.rudder = acota(rumbo * 4 + 3 * s.beta, -1, 1);
              c.aileron = 0;
              c.brakes = 0.4;
              c.reversa = 1;
              c.elevator = 0;
              rev.alVolver = {
                alTocar: rev.alVolver?.alTocar ?? Math.abs(p.c),
                c: Math.abs(p.c),
                desvio: Math.max(rev.alVolver?.desvio ?? 0, Math.abs(p.c)),
                pedal: Math.max(rev.alVolver?.pedal ?? 0, Math.abs(c.rudder)),
                a: p.a,
              };
              return;
            }
            if (modo === "radio") {
              /*
               * **Por el eje con el pie**, y no contra el derrape: en el suelo,
               * quitar el derrape es ponerse cara al viento. De noche en Los
               * Rodeos, con el viento de lado, se fue a la hierba, a 45 m del
               * eje, y el banco no lo miraba (H86).
               */
              c.rudder = acota(error(h - Math.atan(p.c * 0.02), s.heading) * 4 - s.yawRate, -1, 1);
              c.aileron = 0;
              c.brakes = 0.4;
              c.elevator = 0;
              if (s.groundSpeed > 3) radioDesvio = Math.max(radioDesvio, Math.abs(p.c));
              paroEn = { enPista: !!s.onRunway, c: p.c };
              return;
            }
            if (modo === "despues") {
              // El eje con el pie: la reversa del motor que queda tira hacia su lado (H80).
              c.rudder = acota(error(h - Math.atan(p.c * 0.008), s.heading) * 4 + 3 * s.beta, -1, 1);
              // Rodando: parado, el viento de lado da el derrape que quiera y el pie no dice nada.
              if (s.groundSpeed > 3) {
                enTierraDesvio = Math.max(enTierraDesvio, Math.abs(p.c));
                if (Math.abs(c.rudder) > enTierraPedal) {
                  enTierraPedal = Math.abs(c.rudder);
                  enTierraDonde = `a ${Math.round(s.groundSpeed)} m/s, ${p.c.toFixed(1)} m del eje, β ${((s.beta * 180) / Math.PI).toFixed(1)}°`;
                }
              }
            }
            c.brakes = 1;
            c.reversa = 1;
            c.elevator = 0;
            return;
          }
          if (modo === "radio") {
            const luz = ej?.radio?.lampara ?? null;
            /*
             * **Con `OGA_PISTA_OCUPADA=1`, uno a despegar en la final**, una
             * vez, entre 75 y 62 m: la torre tiene que poner la roja. Y con
             * la roja, o sin la verde a sesenta metros, se va uno: sin radio,
             * la pista es tuya con la verde fija.
             */
            if (pistaOcupada && ocupadaPuesta === null && u > 0 && sobre < 75 && sobre > 62) {
              o.traficoAnuncia("EC-PSO", "torre.clearedTakeoff");
              ocupadaPuesta = { u: Math.round(u), sobre: Math.round(sobre), luz };
            }
            if (luz === "roja" || (luz !== "verde" && sobre < 60 && u > 0)) {
              if (luz !== "roja") sinVerdeEnLaFinal++;
              sinVerdePor.push({
                luz: luz ?? "apagada",
                sobre: Math.round(sobre),
                enLaPista: (o.trafico?.() ?? []).filter((a) => a.enLaPista).map((a) => a.matricula),
                trafico: (o.traficoPorDentro?.() ?? []).map(
                  (a) =>
                    `${a.matricula} ${a.tipo} ${a.camino} ${Math.round(a.recorrido)} m (raya ${a.espera ?? "—"}, corre hasta ${a.despega ?? "—"}), ${Math.round(a.alto)} m de alto${a.conPermiso ? ", con permiso" : ""}${a.quieto > 1 ? `, parado ${Math.round(a.quieto)} s` : ""}`,
                ),
                permiso: o.sendaYPermiso?.() ?? null,
                enLaFinalDeLaTorre: o.enLaFinalDeLaTorre?.() ?? null,
                noTeMira: o.noTeMira?.() ?? null,
              });
              if (luz === "roja" || sinVerdeEnLaFinal <= 2) {
                tramo = "circuito";
                paso = 0;
                lenta = 0;
                c.throttle = 1;
                return;
              }
            }
          }
          if (u < 5000) o.pedirTren(true);
          if (u < 4000 && s.airspeed < vfe * 1.05) o.pedirFlaps(u < 1800 ? 1 : 2 / 3);
          const senda = (u + 350) * Math.tan((3 * Math.PI) / 180);
          let quiereVs = acota(
            -s.airspeed * Math.sin((3 * Math.PI) / 180) + (senda - sobre) * 0.1,
            -9,
            2,
          );
          if (sobre < 14) quiereVs = -0.9 - sobre * 0.07;
          c.elevator = porSubida(s, quiereVs, dt);
          /*
           * **Y en `morro`, la recogida de su manual**: «Touch down at minimum
           * airspeed» (POH del Seneca III, p. 3-9), con la nariz arriba y no
           * plana. La de siempre del banco, hecha para los de línea, tocaba a
           * 75 nudos con la nariz 2,6° abajo. Aquí, por debajo de diez metros,
           * la nariz sube cuatro grados por segundo mientras el avión se
           * hunda y se queda donde está si no, hasta ocho grados: se sostiene
           * en el aire mientras frena, que es la recogida de una toma corta.
           *
           * **Antes, desde ocho metros y a grado y medio por segundo** (H70b):
           * volada por primera vez, tocó con la nariz 0,9° abajo. A grado y medio por segundo el objetivo subía
           * más despacio de lo que la parte lenta del lazo de actitud soltaba
           * el morro abajo que llevaba toda la final, y el timón casi no se
           * movía. Ahora esa parte empieza la recogida sin empujar abajo.
           */
          if (modo === "morro" && sobre < 10) {
            if (recogida === null) {
              recogida = o.actitud().cabeceo;
              deActitud = Math.max(deActitud, 0);
            }
            if (s.verticalSpeed < -0.3) recogida = Math.min(recogida + ((4 * Math.PI) / 180) * dt, (8 * Math.PI) / 180);
            c.elevator = profundidad(s, recogida, dt);
          }
          /*
           * En `morro`, desde que la rueda no sale hasta que la compañera
           * prueba la de emergencia, a 80 nudos: por debajo de los 85 a los
           * que su manual la deja probar. Después, la final de siempre: «GEAR
           * UP LANDING — Approach: Normal» (POH del Seneca III, p. 3-8). A 80
           * nudos con todo fuera y sin gas la primera tirada tocó plana y a
           * 3,2 m/s, con la instructora diciendo «lento».
           */
          const enLaFinal =
            /*
             * Y en `reventon`, con los flaps de despegue hasta los cuatro mil
             * metros, a la del circuito: a 1,1 de la Vref con ellos el avisador
             * de pérdida sonaba en la final larga.
             */
            (modo === "reventon" || modo === "toma" || modo === "ave") && u > 4200
              ? vref * 1.35
            : modo === "morro" && ej?.fase !== "armada" && !ej?.morro?.extension ? 80 * 0.514444 : vref * 1.1;
          /*
           * Y sin radio, nunca a fondo en la final: a fondo y subiendo es
           * irse al aire para la torre (`seVaDeVerdad`), que retira el
           * permiso. Se vio en la segunda tirada: la avioneta lenta pidió
           * todo el gas a 130 m, subió quince y la verde se apagó.
           */
          const tope = modo === "radio" ? 0.85 : 1;
          c.throttle = sobre < 10 ? 0 : Math.min(tope, gasPara(s, enLaFinal, dt));
          bajo = Math.min(bajo, sobre);
        }
      };
      /*
       * **La final, cada medio segundo** (H99): lo que pide cada lazo y lo que
       * hace el avión, con el aire que lo mueve. Con la traza de cada dos
       * segundos de pared —ocho de vuelo— no se ve qué lazo se mece.
       */
      const fina = [];
      let finaEn = -Infinity;
      const pilotoConTraza = (c) => {
        piloto(c);
        if (tramo !== "final" && tramo !== "subida") return;
        const ahora = o.reloj();
        if (ahora - finaEn < 0.5) return;
        finaEn = ahora;
        const s = o.estado();
        const j = o.juegoParaTrazas();
        const p = enPista(s.position.x, s.position.z);
        const g = (x) => (x * 180) / Math.PI;
        const adelante = Math.max(
          SEGUNDOS_DE_MIRADA * Math.hypot(s.velocity.x, s.velocity.z),
          Math.min(2500, -p.a * 0.6),
        );
        const lead = aMundo(Math.min(p.a + adelante, pista.length), 0);
        const aire = j.vientoAqui?.aire ?? { x: 0, z: 0 };
        const racha = j.rachaAhora ?? { x: 0, z: 0 };
        fina.push(
          [
            ahora, tramo === "final" ? 1 : 0, p.a, p.c, s.position.y - cota,
            g(error(Math.atan2(s.velocity.x, -s.velocity.z), h)), g(error(s.heading, h)), g(error(rumboA(s, lead.x, lead.z), h)),
            g(o.actitud().alabeo), g(quiereAlabeo), c.aileron, g(s.rollRate), g(s.yawRate), g(s.beta),
            c.rudder, dePedal, c.throttle, j.flight.gasDelMotor?.() ?? -1,
            s.airspeed, s.verticalSpeed, g(o.actitud().cabeceo), c.elevator,
            racha.x * tx + racha.z * tz, racha.x * fx + racha.z * fz, j.subeElAireAhora ?? 0,
            aire.x * tx + aire.z * tz, aire.x * fx + aire.z * fz,
            g(j.rafagas?.ahora?.alabeo ?? 0), j.controles?.aileron ?? 0, s.onGround ? 1 : 0, c.flaps ?? -1,
            g(s.alpha ?? 0), j.movimientoDelAire ?? -1,
          ].map((x) => (typeof x === "number" ? Number(x.toFixed(4)) : x)).join(" "),
        );
      };
      o.pilotar(pilotoConTraza);
      /** En la despresurización: bajando con el piloto del descenso, y después. */
      let bajandoDeEmergencia = false;

      const t0 = o.reloj();
      const apuntar = setInterval(() => {
        const s = o.estado();
        const p = enPista(s.position.x, s.position.z);
        const c = o.controles();
        const ej = o.ejercicio();
        traza.push(
          `${Math.round(o.reloj() - t0)}s ${tramo}${tramo === "circuito" ? paso : ""} · a ${Math.round(p.a)} c ${Math.round(p.c)} · ` +
            `${Math.round(s.position.y - cota)} m · ${Math.round(s.airspeed * 1.943844)} kt · vs ${s.verticalSpeed.toFixed(1)} · ` +
            `alabeo ${((o.actitud().alabeo * 180) / Math.PI).toFixed(0)}° β ${((s.beta * 180) / Math.PI).toFixed(1)}° · ` +
            `gas ${c.throttle.toFixed(2)} pedal ${c.rudder.toFixed(2)} · ${ej?.fase ?? "-"} ${ej?.motores?.join("/") ?? ""}` +
            `${s.onGround ? " · suelo" : ""}`,
        );
      }, 2000);

      while (o.reloj() - t0 < tope) {
        await espera(150);
        const s = o.estado();
        if (o.aproximacionManda()) mandoAlAire = true;
        /*
         * **La despresurización, en tres tramos**: a nivel hasta que se va el
         * aire; el descenso de emergencia con su piloto —gas al ralentí,
         * aerofrenos y la máxima con el morro— hasta donde se respira; y desde
         * ahí, aerofrenos dentro y la final de siempre a la pista de casa.
         */
        if (modo === "despres") {
          const ejAhora = o.ejercicio();
          if (!bajandoDeEmergencia && ejAhora?.descenso && !ejAhora.descenso.terminado) {
            bajandoDeEmergencia = true;
            tramo = "descenso";
            o.volarElDescenso();
          }
          if (bajandoDeEmergencia && tramo === "descenso" && ejAhora?.descenso?.terminado) {
            o.volarElDescenso(false);
            o.ponerPalancaDeAerofrenos("recogida");
            o.pedirTren(false);
            lenta = 0;
            tramo = "final";
            o.pilotar(pilotoConTraza);
          }
        }
        if (o.percance()) break;
        const ej = o.ejercicio();
        if (ej?.cierre) {
          await espera(1500);
          /*
           * **Y lo que cierra el ejercicio, hasta que suene.** Se miraba a
           * segundo y medio del cierre, y desde que los bomberos tienen su
           * grabación el «bien hecho» va detrás de ellos: medido en Gando
           * con el de antes de V1, los bomberos sonaron a los dos segundos,
           * duraron seis y el «bien parado» llegó a los siete. El banco daba
           * por callado lo que estaba esperando turno. Se espera mientras
           * siga en la cola —ya no se cae: ver `cierraElVuelo` en
           * `src/audio/turnos.ts`—, con veinte segundos de tope.
           */
          for (let seg = 0; seg < 20; seg++) {
            const boca = o.bocaAhora?.();
            if (!boca?.espera.some((c) => /^ejercicio\./.test(c))) break;
            await espera(1000);
          }
          break;
        }
      }
      clearInterval(apuntar);
      o.pilotar(null);
      const todo = o.dichoTodo();
      return {
        traza,
        fina,
        paraLaMesa: {
          masa: o.juegoParaTrazas().flight.masaAhora?.() ?? null,
          vref, vfe, v2: vel.v2, cota, largo: pista.length, rumbo: h,
          aire: o.juegoParaTrazas().flight.aireDelDia?.() ?? null,
        },
        ejercicio: o.ejercicio(),
        velocidades: vel,
        tocoEn,
        bajo,
        mandoAlAire,
        pedalMaximo,
        bandera: aseguradoEn !== null && desdeElFallo !== null ? aseguradoEn - desdeElFallo : null,
        alFallar,
        centradoAlFallar,
        centradoMaximo,
        alExtender,
        narizSoltadaA,
        calladaEn,
        devueltaEn,
        dichoAlVolver,
        alasEn,
        sinVerdeEnLaFinal,
        sinVerdePor,
        ocupadaPuesta,
        rojaConAlguienEnLaPista,
        lamparaVista,
        tiraConLaRadioCallada,
        faros,
        ladoDelCircuito,
        radioDesvio,
        paroEn,
        rev,
        tm,
        av,
        caida: o.caida?.() ?? null,
        recorridoAlParar,
        enTierra: { desvio: enTierraDesvio, pedal: enTierraPedal, donde: enTierraDonde },
        largo: pista.length,
        percance: o.percance(),
        reloj: o.reloj() - t0,
        instructor: todo.instructor.slice(antes.instructor),
        // La presentación llega al empezar, antes de que el banco mire.
        todoInstructor: todo.instructor,
        // Y lo que se calló por no estar grabado, desde el principio también.
        todoCantado: o.cantados(),
        cuadrosConLlama: globalThis.__cuadrosConLlama ?? 0,
        torre: todo.torre.slice(antes.torre),
        // Y lo que dijo la megafonía desde que reventó la rueda al tomar.
        megafonia: tm.megafonia
          ? [...todo.comandante.slice(tm.megafonia.comandante), ...todo.tripulacion.slice(tm.megafonia.tripulacion)]
          : [],
        cantados: o.cantados().slice(antes.cantados),
        descartadas: o.descartadas(),
      };
    },
    { modo: MODO, tope: TOPE, sinTren: SIN_TREN, pistaOcupada: PISTA_OCUPADA, parar: PARAR, meteTren: METE_TREN, deja: DEJA, deNoche: DE_NOCHE, avionId: AVION, peldano: TRAMO },
  );

  if (process.env.OGA_TRAZA_FINA)
    writeFileSync(
      process.env.OGA_TRAZA_FINA,
      `# ${JSON.stringify(r.paraLaMesa)}\n` +
        "t final a c alto traza rumbo pideRumbo alabeo quiere aleron p r beta pedal dePedal gas da ias vs cab elev rxL rxA ry vxL vxA rAlab aleronFin suelo flaps alfa mov\n" +
        `${r.fina.join("\n")}\n`,
    );
  const dice = (lista, trozo) => lista.some((k) => String(k).includes(trozo));
  // Lo pedido, suene o no: lo que dijo la instructora y lo que se calló sin grabar.
  const pedido = [...r.todoInstructor, ...r.todoCantado];
  const nudos = (v) => (v ? Math.round(v * 1.943844) : "—");
  const ej = r.ejercicio;
  const cabina = TRAMO === "taguato-ruvicha";
  comprobar(
    "la instructora presenta el ejercicio antes de empezar",
    dice(pedido, `ejercicio.${ej?.id}.antes`),
    pedido.filter((k) => /ejercicio\.[^ ]*\.antes/.test(k)).slice(0, 1).join(" · ") || "no",
  );
  comprobar(
    "y el fallo llega cuando toca",
    ej && ej.fase !== "armada" &&
      (MODO === "despres"
        ? ej.averia?.que === "presion"
        : MODO === "carga"
          ? ej.averia?.que === "carga" && ej.motorParado === null && r.alFallar?.sobre > 100
          : MODO === "morro"
            ? ej.averia?.que === "morro" && ej.motorParado === null && r.alFallar?.trenFuera === true
          : MODO === "radio"
            ? ej.averia?.que === "radio" && ej.motorParado === null && r.alFallar?.sobre > 100
          : MODO === "reventon"
            ? ej.averia?.que === "neumatico" && ej.motorParado === null && !ej.parar && r.alFallar?.sobre < 15 &&
              r.rev.indicada >= r.velocidades.v1 - 20 * 0.514444 && r.rev.indicada < r.velocidades.v1
          : MODO === "toma"
            ? ej.averia?.que === "neumatico" && ej.motorParado === null && !ej.parar && r.tocoEn !== null && r.tm.alReventar?.v > 30
          : MODO === "ave"
            ? ej.averia?.que === "ave" && !ej.parar && r.alFallar?.sobre > 80 && r.alFallar.sobre < 160 &&
              (NO_AGUANTA ? ej.motorParado === r.av.motor : ej.motorParado === null)
          : MODO === "planeo"
            ? ej.motorParado === null
            : ej.motorParado !== null) &&
      (!PARA || (ej.parar ?? ej.antesDeV1)) &&
      (!SIGUE || !(ej.parar ?? ej.antesDeV1)),
    `fase ${ej?.fase} · motor ${ej?.motorParado} · se para ${ej?.parar ?? ej?.antesDeV1} · ` +
      `${r.alFallar ? `a ${Math.round(r.alFallar.sobre)} m · ` : ""}` +
      `${MODO === "reventon" ? `a ${nudos(r.rev.indicada)} kt indicados · ` : ""}` +
      `V1 ${nudos(r.velocidades.v1)} Vr ${nudos(r.velocidades.vr)} V2 ${nudos(r.velocidades.v2)} Vmc ${nudos(r.velocidades.vmc)} kt`,
  );
  /*
   * **Y en el despegue se dice lo que es verdad en este avión** (H37i): «ya
   * despegamos: seguí» —o «V one», arriba— en V1 solo donde se decide con
   * ella. En el bimotor de pistón, al meter el tren a 85 nudos o más, que es
   * cuando su manual deja seguir: en `tren`, antes de que falle el motor; en
   * `carrera` no llega, que el tren no sube. Ver
   * `flight/lo-que-se-dice-al-despegar.ts`.
   */
  if (MODO === "despues" || MODO === "carrera" || MODO === "tren") {
    const enV1 = r.todoCantado.filter((c) => /^V one/.test(c));
    const dicho = enV1.some((c) => /^V one→/.test(c));
    const callado = enV1.some((c) => /no decide con V1/.test(c));
    comprobar(
      MODO === "despues"
        ? "en V1 se dice «seguí», que este avión decide con ella"
        : "en V1 no se dice «seguí»: su manual para a esa velocidad",
      MODO === "despues" ? dicho && !callado : callado && !dicho,
      enV1.join(" · ") || "nada apuntado en V1",
    );
  }
  if (MODO === "tren" || MODO === "carrera") {
    const sigue = r.todoCantado.findIndex((c) => /^tren arriba/.test(c));
    const fallo = r.todoCantado.findIndex((c) => /^engine failure/.test(c));
    const alMeterlo = MODO === "tren" && !SIN_TREN;
    comprobar(
      alMeterlo
        ? "y «ya despegamos: seguí» al meter el tren, antes del fallo"
        : "y nadie dice «seguí»: el tren no sube antes del fallo",
      alMeterlo ? sigue >= 0 && (fallo < 0 || sigue < fallo) : sigue < 0,
      `${sigue >= 0 ? r.todoCantado[sigue] : "no se dijo"}` +
        `${fallo >= 0 ? ` · el fallo, ${sigue >= 0 && sigue < fallo ? "después" : "antes"}` : ""}`,
    );
  }
  if (SIN_TREN) {
    const fallo = r.todoCantado.findIndex((c) => /^engine failure/.test(c));
    const meteloTras = fallo >= 0 && r.todoCantado.slice(fallo).some((c) => /^gear up/.test(c));
    /*
     * Con margen, porque el banco mide desde la cota del umbral y el juego
     * desde la del campo: en Gran Canaria, siete metros de diferencia. La
     * primera tirada falló así: «a 191 m (627 ft)», con el juego cantando el
     * fallo a 198. Lo que se mira es que falle alto y con el tren fuera, no a
     * los quince metros de siempre ni nunca.
     */
    comprobar(
      "sin meter el tren, a 650 ft falla igual, con el tren fuera",
      r.alFallar?.trenFuera === true && r.alFallar.sobre >= 650 * 0.3048 - 15,
      r.alFallar
        ? `a ${Math.round(r.alFallar.sobre)} m (${Math.round(r.alFallar.sobre / 0.3048)} ft) con el tren ${r.alFallar.trenFuera ? "fuera" : "pedido dentro"}`
        : "no falló",
    );
    comprobar(
      "y detrás del fallo se pide meter el tren",
      meteloTras,
      r.todoCantado.slice(Math.max(0, fallo)).filter((c) => /^(engine failure|gear up)/.test(c)).join(" · ") || "no",
    );
  }
  comprobar(
    "sin percance: nadie se hace daño",
    !r.percance,
    r.percance ?? "ninguno",
  );
  if (PARA) {
    comprobar(
      "se para en la pista",
      r.recorridoAlParar !== null && r.recorridoAlParar < r.largo,
      `parado a ${Math.round(r.recorridoAlParar ?? NaN)} m del umbral, de ${Math.round(r.largo)}`,
    );
    comprobar(
      cabina ? "la cabina canta «stop»" : "la instructora dice que se para",
      cabina
        ? dice(r.cantados, "stop")
        : dice(pedido, MODO === "carrera" ? "ejercicio.paramosConElTren" : "ejercicio.paramos"),
      (cabina ? r.cantados : pedido).filter((k) => /stop|paramos/i.test(k)).join(" · ") || "no",
    );
    comprobar(
      "y se cierra bien, con los bomberos del aeródromo junto al avión",
      ej?.cierre === "parado" && ej?.bomberos,
      `cierre ${ej?.cierre} · bomberos ${ej?.bomberos} · ${ej?.camiones} camiones`,
    );
  }
  if (SIGUE) {
    comprobar(
      "sube con un motor, con el pie del lado bueno y sin quedarse sin timón",
      r.tocoEn !== null || (ej?.asegurado && ej?.declarada),
      `pedal máximo ${r.pedalMaximo.toFixed(2)}`,
    );
    comprobar(
      "la compañera asegura el motor y se declara la emergencia",
      ej?.asegurado && ej?.declarada && ej?.prioridad,
      `asegurado ${ej?.asegurado} · declarada ${ej?.declarada} · prioridad ${ej?.prioridad} · EICAS ${ej?.mensajes?.join(" / ") || "-"}`,
    );
    /*
     * En el bimotor de pistón, identificar, verificar y bandera en cuanto
     * falla: `IDENTIFICAR_Y_BANDERA`, cuatro segundos del juego, y el que tarde
     * el paso del banco en verlo.
     */
    if (MODO === "tren")
      comprobar(
        "la compañera pone la bandera enseguida, sin esperar a ninguna altura",
        r.bandera !== null && r.bandera <= 6,
        `a los ${r.bandera?.toFixed(1) ?? "—"} s del fallo`,
      );
    if (TRAMO === "taguato" || cabina)
      comprobar(
        "la torre contesta la llamada",
        dice(r.torre, "mayday") || dice(r.torre, "panpan"),
        r.torre.filter((k) => /mayday|panpan|clearedLand|aterrizar/i.test(k)).join(" · ") || "no",
      );
    comprobar(
      "nadie la manda al aire: tiene prioridad",
      !r.mandoAlAire,
      r.mandoAlAire ? "se mandó" : "ninguna orden",
    );
    comprobar(
      "vuelve, toca en la pista y se cierra el ejercicio",
      r.tocoEn?.enPista && ej?.cierre === "vuelta",
      r.tocoEn
        ? `tocó ${r.tocoEn.enPista ? "en la pista" : "fuera"} a ${Math.round(r.tocoEn.a)} m del umbral · cierre ${ej?.cierre}`
        : `no llegó · lo más bajo ${Math.round(r.bajo)} m`,
    );
    /*
     * Y hasta que para, por el eje con el pie: la reversa del motor que queda
     * tira hacia su lado (H80). Media pista y sobra pie.
     */
    if (MODO === "despues")
      comprobar(
        "se para por el eje, con el pie",
        r.enTierra.desvio < 20 && r.enTierra.pedal < 1,
        `lo más lejos, a ${r.enTierra.desvio.toFixed(1)} m del eje · pie ${r.enTierra.pedal.toFixed(2)} (${r.enTierra.donde})`,
      );
    comprobar(
      "con los bomberos del aeródromo esperando junto a la pista",
      ej?.bomberos,
      `bomberos ${ej?.bomberos} · ${ej?.camiones} camiones`,
    );
  }
  if (MODO === "despres") {
    comprobar(
      "se va el aire y se baja hasta donde se respira",
      ej?.descenso?.terminado || ej?.cierre === "vuelta",
      `descenso ${ej?.descenso ? `${Math.round(ej.descenso.segundos ?? NaN)} s` : "—"} · ` +
        `${dice(r.todoInstructor, "vuelo.cabinaSinPresion") ? "con" : "sin"} su aviso`,
    );
    comprobar(
      "la torre contesta el MAYDAY",
      dice(r.torre, "mayday"),
      r.torre.filter((k) => /mayday/i.test(k)).join(" · ") ||
        `no · ${r.descartadas.filter((k) => /mayday|torre/i.test(String(k))).slice(0, 4).join(" · ") || "nada descartado de la torre"}`,
    );
    comprobar(
      "vuelve a la pista de casa, con los bomberos del aeródromo esperando",
      r.tocoEn?.enPista && ej?.cierre === "vuelta" && ej?.bomberos,
      r.tocoEn
        ? `tocó ${r.tocoEn.enPista ? "en la pista" : "fuera"} a ${Math.round(r.tocoEn.a)} m del umbral · ` +
            `cierre ${ej?.cierre} · ${ej?.camiones} camiones`
        : `no llegó · lo más bajo ${Math.round(r.bajo)} m`,
    );
  }
  if (MODO === "carga") {
    const cm = (m) => (m === null || !Number.isFinite(m) ? "—" : `${(m * 100).toFixed(1)} cm`);
    const corrido = (r.centradoMaximo ?? -Infinity) - (r.centradoAlFallar ?? Infinity);
    comprobar(
      AMARRADA ? "la maleta amarrada no se mueve: el centro se queda" : "la maleta se corre y el centro se va hacia la cola",
      AMARRADA ? Number.isFinite(corrido) && Math.abs(corrido) < 0.002 : corrido > 0.04,
      `centrado al soltarse ${cm(r.centradoAlFallar)} · lo más atrás ${cm(r.centradoMaximo)} · corrido ${cm(corrido)}`,
    );
    comprobar(
      AMARRADA
        ? "la instructora dice que iba amarrada, y por eso no se movió"
        : "la instructora pide empujar y compensar, y después cuenta cómo se sigue",
      AMARRADA
        ? dice(pedido, "ejercicio.carga.amarrada") && !dice(pedido, "ejercicio.carga.suelta")
        : dice(pedido, "ejercicio.carga.suelta") && dice(pedido, "ejercicio.carga.despacio"),
      pedido.filter((k) => /ejercicio\.carga\./.test(k)).join(" · ") || "no",
    );
    const perdida = r.todoCantado.filter((k) => /^stall/.test(k));
    comprobar(
      "y lejos de la pérdida: el avisador no suena en todo el vuelo",
      perdida.length === 0,
      perdida.join(" · ") || "callado",
    );
    comprobar(
      "sin llamada ni bomberos: nada se ha roto",
      !ej?.declarada && !ej?.bomberos && !dice(r.torre, "mayday") && !dice(r.torre, "panpan"),
      `declarada ${ej?.declarada} · bomberos ${ej?.bomberos} · torre ${r.torre.filter((k) => /mayday|panpan/i.test(k)).join(" · ") || "sin emergencia"}`,
    );
    comprobar(
      "vuelve al campo de salida, toca en la pista y se cierra el ejercicio",
      r.tocoEn?.enPista && ej?.cierre === "vuelta",
      r.tocoEn
        ? `tocó ${r.tocoEn.enPista ? "en la pista" : "fuera"} a ${Math.round(r.tocoEn.a)} m del umbral a ${r.tocoEn.vs.toFixed(1)} m/s · cierre ${ej?.cierre}`
        : `no llegó · lo más bajo ${Math.round(r.bajo)} m`,
    );
  }
  if (MODO === "morro") {
    const kt = (v) => (v === null || v === undefined ? "—" : `${Math.round(v * 1.943844)} kt`);
    comprobar(
      "el tren sale y la rueda de morro no: se queda en su pozo, y se dice",
      ej?.morro?.dentro && dice(pedido, "ejercicio.morro.noSale"),
      `morro dentro ${ej?.morro?.dentro} · ${pedido.filter((k) => /ejercicio\.morro\.noSale/.test(k)).join(" · ") || "no dicho"}`,
    );
    comprobar(
      "la compañera prueba la extensión de emergencia, por debajo de los 85 nudos de su manual",
      ej?.morro?.extension && r.alExtender !== null && r.alExtender <= 85 * 0.514444 + 0.3 &&
        dice(pedido, "ejercicio.morro.emergencia"),
      `probada ${ej?.morro?.extension} a ${kt(r.alExtender)} · ` +
        `${pedido.filter((k) => /ejercicio\.morro\.emergencia/.test(k)).join(" · ") || "no dicho"}`,
    );
    comprobar(
      "tampoco sale: se cuenta la toma, se declara PAN PAN y los bomberos esperan",
      dice(pedido, "ejercicio.morro.tampoco") && ej?.declarada && dice(r.torre, "panpan") && ej?.bomberos,
      `declarada ${ej?.declarada} · torre ${r.torre.filter((k) => /panpan|mayday/i.test(k)).join(" · ") || "sin llamada"} · ` +
        `bomberos ${ej?.bomberos} · ${ej?.camiones} camiones`,
    );
    comprobar(
      "toca en la pista sobre las principales, con la nariz arriba",
      r.tocoEn?.enPista && r.tocoEn.cabeceo > 0 && !r.tocoEn.morroEnLaPista,
      r.tocoEn
        ? `tocó ${r.tocoEn.enPista ? "en la pista" : "fuera"} a ${Math.round(r.tocoEn.a)} m del umbral, ` +
            `${((r.tocoEn.cabeceo * 180) / Math.PI).toFixed(1)}° de nariz` +
            `${r.tocoEn.morroEnLaPista ? ", con la panza ya en la pista" : ", sobre las principales"}` +
            `${typeof r.caida === "number" ? `, cayendo ${r.caida.toFixed(1)} m/s` : ""}`
        : `no llegó · lo más bajo ${Math.round(r.bajo)} m`,
    );
    const posado = ej?.morro?.posado;
    comprobar(
      "la nariz llega a la pista despacio: por debajo de 64 KIAS, la pérdida con todo fuera",
      posado && posado.indicada < 64 * 0.514444,
      posado
        ? `posada a ${kt(posado.indicada)}, bajando ${posado.bajada.toFixed(2)} m/s; soltada a ${kt(r.narizSoltadaA)}`
        : "no llegó a posarse",
    );
    const tiradas = r.descartadas.filter((k) => /ejercicio\./.test(String(k)));
    comprobar(
      "y nada del ejercicio se cae esperando en la cola",
      tiradas.length === 0,
      tiradas.join(" · ") || "nada tirado",
    );
  }
  if (MODO === "radio") {
    const luces = (ej?.radio?.luces ?? []).filter((l) => l.luz !== null).map((l) => l.luz);
    comprobar(
      "la radio se calla, y la instructora lo cuenta",
      r.calladaEn !== null && dice(pedido, "ejercicio.radio.callada"),
      `callada ${r.calladaEn !== null ? "sí" : "no"} · ${pedido.filter((k) => /ejercicio\.radio\.callada/.test(k)).join(" · ") || "no dicho"}`,
    );
    /*
     * Las tres que hablan del 7600 —presentarlo, la radio callada y el
     * cierre—, con la razón de ese campo: donde la torre tiene radar, el número
     * se lo dice; donde no, se da cuenta porque no se le contesta (H91).
     */
    const del7600 = pedido
      .map((k) => /ejercicio\.(fallo-de-radio\.antes|radio\.callada|radio\.bien)(SinRadar)?(?!\w)/.exec(String(k)))
      .filter(Boolean);
    comprobar(
      SIN_RADAR
        ? "lo que se dice del 7600 es lo del campo sin radar: no es él quien se lo dice a la torre"
        : "lo que se dice del 7600 es lo de siempre: el número se lo dice a la torre",
      new Set(del7600.map((m) => m[1])).size === 3 && del7600.every((m) => (m[2] !== undefined) === SIN_RADAR),
      [...new Set(del7600.map((m) => `${m[1]}${m[2] ?? ""}`))].join(" · ") || "nada",
    );
    const cifras = r.todoCantado.map((c) => /^transpondedor: (\d+)/.exec(c)?.[1]).filter(Boolean);
    comprobar(
      "el 7600, marcado cifra a cifra",
      cifras.join(" ") === "7 76 760 7600",
      cifras.join(" → ") || "no se marcó",
    );
    const habla = r.dichoAlVolver ? [...r.dichoAlVolver.torre, ...r.dichoAlVolver.otro] : null;
    comprobar(
      "ni la torre ni la frecuencia dicen nada mientras la radio está callada, ni se escribe en la tira",
      habla !== null && habla.length === 0 && r.tiraConLaRadioCallada === null,
      habla === null
        ? "la radio no volvió: el ejercicio no se cerró"
        : `${habla.length ? `sonó: ${habla.join(" · ")}` : "nadie"}${r.tiraConLaRadioCallada ? ` · tira: «${r.tiraConLaRadioCallada}»` : ""}`,
    );
    comprobar(
      "la lámpara, grande y sin letras",
      r.lamparaVista && /torre--sin-radio/.test(r.lamparaVista.clase) && r.lamparaVista.ancho >= 80 && !r.lamparaVista.letras,
      r.lamparaVista
        ? `${r.lamparaVista.clase} · ${r.lamparaVista.ancho} px · ${r.lamparaVista.letras ? "con letras" : "sin letras"}`
        : "no se encendió",
    );
    const enOrden = PISTA_OCUPADA
      ? luces[0] === "destellos" &&
        luces.includes("roja") &&
        luces[luces.length - 1] === "verde" &&
        luces.indexOf("roja") < luces.lastIndexOf("verde")
      : luces[0] === "destellos" && !luces.includes("roja") && luces[luces.length - 1] === "verde";
    comprobar(
      PISTA_OCUPADA
        ? "las luces en su orden: destellos, la roja con alguien en la pista, y la verde tras otra vuelta"
        : "las luces en su orden: destellos verdes en el circuito y la verde fija en la final, sin roja",
      enOrden && (!PISTA_OCUPADA || (r.rojaConAlguienEnLaPista?.length ?? 0) > 0),
      `${luces.join(" → ") || "ninguna"}` +
        (PISTA_OCUPADA
          ? ` · despegue puesto ${r.ocupadaPuesta ? `a ${r.ocupadaPuesta.u} m del umbral, ${r.ocupadaPuesta.sobre} m, con ${r.ocupadaPuesta.luz ?? "la lámpara apagada"}` : "no"} · ` +
            `en la pista con la roja: ${r.rojaConAlguienEnLaPista?.join(", ") || "nadie"}`
          : "") +
        ` · ${(ej?.radio?.luces ?? []).map((l) => `${l.luz ?? "apagada"}@${Math.round(l.alto)}m`).join(" ")}`,
    );
    /*
     * De noche, los faros: apagados, encendidos, apagados, encendidos,
     * apagados, y de vuelta a como iban. Dos destellos, y sin alabear.
     */
    const golpes = (r.faros ?? []).map((f) => (f.golpe ? "encendidos" : "apagados")).join(" ");
    const dosDestellos = /^apagados encendidos apagados encendidos apagados/.test(golpes);
    comprobar(
      DE_NOCHE
        ? "a los destellos se contesta con los faros, dos veces, y la instructora explica cada luz"
        : "a los destellos se contesta alabeando, y la instructora explica cada luz",
      (ej?.radio?.contestaciones ?? 0) >= 1 &&
        (DE_NOCHE
          ? dosDestellos && dice(pedido, "ejercicio.radio.destellosDeNoche") && !dice(pedido, "ejercicio.radio.alas")
          : dice(pedido, "ejercicio.radio.alas") &&
            pedido.some((k) => /ejercicio\.radio\.destellos(?!DeNoche)/.test(String(k)))) &&
        dice(pedido, "ejercicio.radio.verde") &&
        (!PISTA_OCUPADA || dice(pedido, "ejercicio.radio.roja")),
      `contestaciones ${ej?.radio?.contestaciones ?? 0}${r.alasEn ? ` a los ${r.alasEn.t.toFixed(1)} s` : ""} · ` +
        `${DE_NOCHE ? `faros: ${golpes || "quietos"} · ` : ""}` +
        `${pedido.filter((k) => /ejercicio\.radio\.(destellos|alas|roja|verde)/.test(k)).join(" · ") || "nada"}`,
    );
    comprobar(
      "toca en la pista con la verde fija y para en ella, sin percance",
      r.tocoEn?.enPista && ej?.radio?.conLaVerde === true && !r.percance && r.paroEn?.enPista === true,
      r.tocoEn
        ? `tocó ${r.tocoEn.enPista ? "en la pista" : "fuera"} a ${Math.round(r.tocoEn.a)} m del umbral a ${r.tocoEn.vs.toFixed(1)} m/s · ` +
            `paró ${r.paroEn?.enPista ? "en la pista" : "fuera"} a ${Math.abs(r.paroEn?.c ?? 0).toFixed(0)} m del eje, con ${r.radioDesvio.toFixed(0)} m como mucho · ` +
            `con la verde ${ej?.radio?.conLaVerde} · finales sin la verde ${r.sinVerdeEnLaFinal}`
        : `no llegó · lo más bajo ${Math.round(r.bajo)} m · finales sin la verde ${r.sinVerdeEnLaFinal}`,
    );
    for (const f of r.sinVerdePor ?? []) console.log(`    final sin la verde: ${JSON.stringify(f)}`);
    comprobar(
      "sin llamada ni bomberos: sin radio no hay llamada, y nada se ha roto",
      !ej?.declarada && !ej?.bomberos,
      `declarada ${ej?.declarada} · bomberos ${ej?.bomberos}`,
    );
    const tiradas = r.descartadas.filter((k) => /ejercicio\./.test(String(k)));
    comprobar(
      "y nada del ejercicio se cae esperando en la cola",
      tiradas.length === 0,
      tiradas.join(" · ") || "nada tirado",
    );
  }
  if (MODO === "reventon") {
    const izq = r.rev.lado === "izquierdo";
    const grados = (x) => `${((x * 180) / Math.PI).toFixed(2)}°`;
    const suya = `ejercicio.reventon.${izq ? "izquierda" : "derecha"}`;
    comprobar(
      "el golpe, su tarjeta y el pie que se pisa, dicho",
      r.rev.lado !== null &&
        dice(r.todoCantado, `golpe de la rueda ${izq ? "izquierda" : "derecha"}`) &&
        r.rev.tarjeta &&
        dice(pedido, suya),
      `lado ${r.rev.lado} · ${r.todoCantado.filter((k) => /golpe de la rueda/.test(k)).join(" · ") || "sin golpe"} · ` +
        `tarjeta ${r.rev.tarjeta} · ${pedido.filter((k) => /reventon\.(izquierda|derecha)/.test(k)).join(" · ") || "no dicho"}`,
    );
    const pieMedio = r.rev.pasos ? r.rev.pedales / r.rev.pasos : 0;
    const pieDeAntes = r.rev.pasosAntes ? r.rev.pedalesAntes / r.rev.pasosAntes : 0;
    comprobar(
      "el avión tira hacia la reventada, y el eje se sostiene con el otro pie",
      /*
       * Lo que se va en ocho décimas sin tocar nada, y el pie de después contra
       * el de antes: hacia el otro lado de la reventada. Con viento no se
       * exige, que una racha es del mismo orden; ni el pie, parando a fondo,
       * que la pata sana frena más y tira hacia el suyo.
       */
      (VIENTO !== "000/00" || (izq ? r.rev.tirado < 0 : r.rev.tirado > 0)) &&
        (VIENTO !== "000/00" || PARAR || (izq ? pieMedio > pieDeAntes : pieMedio < pieDeAntes)) &&
        r.rev.desvio < 10 &&
        ej?.reventon?.enElModelo === (izq ? -1 : 1),
      `tiró ${grados(r.rev.tirado ?? NaN)} en ocho décimas · pie medio ${pieMedio.toFixed(3)} (antes ${pieDeAntes.toFixed(3)}), máximo ${r.pedalMaximo.toFixed(2)} · ` +
        `lo más lejos del eje ${r.rev.desvio.toFixed(1)} m · en el modelo ${ej?.reventon?.enElModelo}`,
    );
    if (PARAR) {
      comprobar(
        "para en la pista",
        r.recorridoAlParar !== null && r.recorridoAlParar < r.largo && r.tocoEn === null,
        `parado a ${Math.round(r.recorridoAlParar ?? NaN)} m del umbral, de ${Math.round(r.largo)}`,
      );
      comprobar(
        "y se cierra bien, como parar a tiempo, con los bomberos junto al avión",
        ej?.cierre === "parado" && ej?.bomberos && !ej?.declarada,
        `cierre ${ej?.cierre} · bomberos ${ej?.bomberos} · ${ej?.camiones} camiones`,
      );
    } else {
      const desdeElGolpe = r.todoCantado.findIndex((c) => /^golpe de la rueda/.test(c));
      const despues = desdeElGolpe >= 0 ? r.todoCantado.slice(desdeElGolpe) : r.todoCantado;
      const pideMeterlo = despues.filter((c) => /^gear up|vuelo\.meteElTren|^positive rate/.test(c));
      comprobar(
        METE_TREN
          ? "se sigue; si se mete el tren, se cuenta por qué va fuera y se saca; nadie pide meterlo"
          : "se sigue, y el tren se queda fuera: se cuenta, y nadie pide meterlo",
        pideMeterlo.length === 0 &&
          dice(pedido, "ejercicio.reventon.tren") &&
          (METE_TREN
            ? r.rev.trenMetido && r.rev.sacadoEn !== null && dice(pedido, "ejercicio.reventon.sacalo")
            : !r.rev.trenMetido && !dice(pedido, "ejercicio.reventon.sacalo")),
        `${pideMeterlo.join(" · ") || "nadie lo pidió"} · ${pedido.filter((k) => /reventon\.(tren|sacalo)/.test(k)).join(" · ") || "no dicho"}`,
      );
      comprobar(
        "PAN PAN, con la torre contestando y prioridad",
        ej?.declarada && ej?.prioridad && dice(r.torre, "panpan"),
        `declarada ${ej?.declarada} · torre ${r.torre.filter((k) => /panpan|mayday/i.test(k)).join(" · ") || "sin llamada"}`,
      );
      comprobar(
        "nadie la manda al aire: tiene prioridad",
        !r.mandoAlAire,
        r.mandoAlAire ? "se mandó" : "ninguna orden",
      );
      comprobar(
        "con los bomberos del aeródromo esperando junto a la pista",
        ej?.bomberos,
        `bomberos ${ej?.bomberos} · ${ej?.camiones} camiones`,
      );
      comprobar(
        "la toma se cuenta en la final, y se toca en la pista",
        dice(pedido, "ejercicio.reventon.toma") && r.tocoEn?.enPista,
        `${pedido.filter((k) => /reventon\.toma/.test(k)).join(" · ") || "no dicha"} · ` +
          (r.tocoEn
            ? `tocó ${r.tocoEn.enPista ? "en la pista" : "fuera"} a ${Math.round(r.tocoEn.a)} m del umbral` +
              `${typeof r.caida === "number" ? `, cayendo ${r.caida.toFixed(1)} m/s` : ""}`
            : `no llegó · lo más bajo ${Math.round(r.bajo)} m`),
      );
      comprobar(
        "el eje sostenido con el pie y el freno suave hasta parar en la pista",
        r.rev.alVolver &&
          r.rev.alVolver.desvio < r.rev.alVolver.alTocar + 6 &&
          r.rev.alVolver.c < 8 &&
          r.rev.alVolver.a < r.largo &&
          ej?.cierre === "vuelta",
        r.rev.alVolver
          ? `tocó a ${r.rev.alVolver.alTocar.toFixed(1)} m del eje, lo más lejos ${r.rev.alVolver.desvio.toFixed(1)} y parado a ${r.rev.alVolver.c.toFixed(1)} · pie hasta ${r.rev.alVolver.pedal.toFixed(2)} · ` +
              `parado a ${Math.round(r.rev.alVolver.a)} m del umbral, de ${Math.round(r.largo)} · cierre ${ej?.cierre}`
          : "no llegó a la pista",
      );
    }
    const tiradas = r.descartadas.filter((k) => /ejercicio\./.test(String(k)));
    comprobar(
      "y nada del ejercicio se cae esperando en la cola",
      tiradas.length === 0,
      tiradas.join(" · ") || "nada tirado",
    );
    if (FOTOS) console.log(`    fotos: ${fotosHechas.join(" · ") || "ninguna"}`);
  }
  if (MODO === "toma") {
    const tm = r.tm;
    const izq = r.rev.lado === "izquierdo";
    const grados = (x) => `${((x * 180) / Math.PI).toFixed(2)}°`;
    const suya = `ejercicio.rueda.${izq ? "izquierda" : "derecha"}`;
    const golpe = r.todoCantado.findIndex((c) => /^golpe de la rueda/.test(c));
    comprobar(
      "el golpe al poco de tocar, su tarjeta y el pie que se pisa, dicho",
      r.rev.lado !== null && golpe >= 0 && r.rev.tarjeta && dice(pedido, suya),
      `lado ${r.rev.lado} · a ${Math.round(tm.alReventar?.v * 1.943844)} kt y ${Math.round(tm.alReventar?.a - tm.alTocar?.a)} m de tocar · ` +
        `tarjeta ${r.rev.tarjeta} · ${pedido.filter((k) => /rueda\.(izquierda|derecha)/.test(k)).join(" · ") || "no dicho"}`,
    );
    const pieMedio = tm.pasos ? tm.pedales / tm.pasos : 0;
    comprobar(
      "el avión tira hacia la reventada, y el eje se sostiene con el otro pie, sin corregir de más",
      (VIENTO !== "000/00" || ((izq ? r.rev.tirado < 0 : r.rev.tirado > 0) && (izq ? pieMedio > 0 : pieMedio < 0))) &&
        tm.pieMaximo < 0.6 &&
        tm.desvio < Math.abs(tm.alTocar?.c ?? 99) + 6 &&
        ej?.reventon?.enElModelo === (izq ? -1 : 1),
      `tiró ${grados(r.rev.tirado ?? NaN)} en ocho décimas · pie medio ${pieMedio.toFixed(3)}, máximo ${tm.pieMaximo.toFixed(2)} · ` +
        `tocó a ${tm.alTocar?.c.toFixed(1)} m del eje, lo más lejos ${tm.desvio.toFixed(1)} · en el modelo ${ej?.reventon?.enElModelo}`,
    );
    const orden = tm.tarjetas.filter((x) => /^(reventon|pie|freno-suave|para-en-la-pista|goma-suelta|bomberos)/.test(x));
    const que = ["reventon", "pie", "freno-suave", "para-en-la-pista"];
    let va = 0;
    for (const x of orden) if (va < que.length && x.startsWith(que[va])) va++;
    comprobar(
      "las tarjetas, en su orden: la rueda, el pie, el freno suave y parar en la pista",
      va === que.length,
      tm.tarjetas.join(" → ") || "ninguna",
    );
    comprobar(
      "y dicho: el freno suave con la reversa, y parar ahí; sin autofreno armado",
      dice(pedido, "ejercicio.rueda.freno") && dice(pedido, "ejercicio.rueda.para") && tm.autofreno === "off",
      `${pedido.filter((k) => /rueda\.(freno|para)/.test(k)).join(" · ") || "no dicho"} · autofreno ${tm.autofreno}`,
    );
    /*
     * **Nadie pide dejar la pista**: ni la instructora —«frená» para la salida,
     * «salí de la pista», «por la siguiente»—, ni la torre —«vacate»,
     * «expedite vacating»—, ni una tarjeta. Solo mirando desde el golpe.
     */
    const pideSalir = [
      ...r.todoCantado.slice(Math.max(0, golpe)),
      ...r.instructor,
      ...r.torre,
    ].filter((k) => /vacat|abandon|salidaSiguiente|tutor\.salir|vuelo\.aterrizado$/i.test(String(k)));
    // Lo que dijo la megafonía desde el golpe: nada, que hay otra cosa entre manos.
    const bienvenida = r.megafonia.map((k) => `megafonía ${k}`);
    const tarjetasDeSalir = tm.tarjetas.filter((x) => x === "salida" || x === "freno");
    comprobar(
      "y nadie pide dejar la pista ni frenar para la salida, ni la megafonía da la bienvenida",
      pideSalir.length === 0 && tarjetasDeSalir.length === 0 && bienvenida.length === 0,
      [...pideSalir, ...tarjetasDeSalir.map((x) => `tarjeta ${x}`), ...bienvenida].join(" · ") || "nadie",
    );
    if (DEJA) {
      comprobar(
        "deja la pista rodando y para fuera: se cuenta por qué es mejor parar, con su tarjeta, y sin castigo",
        tm.fuera && tm.parado && !tm.parado.enPista && dice(pedido, "ejercicio.rueda.rodando") &&
          tm.tarjetas.includes("goma-suelta") && ej?.cierre === "vuelta",
        `fuera ${tm.fuera}, hasta ${tm.deprisa.toFixed(1)} m/s · parado ${tm.parado ? (tm.parado.enPista ? "en la pista" : "fuera") : "no"} · ` +
          `${pedido.filter((k) => /rueda\.rodando/.test(k)).join(" · ") || "no dicho"} · cierre ${ej?.cierre}`,
      );
    } else {
      comprobar(
        "para en la pista y por el eje, sin dejarla",
        tm.parado?.enPista && !tm.fuera && tm.parado.a < r.largo && Math.abs(tm.parado.c) < 8 && ej?.cierre === "vuelta" &&
          !dice(pedido, "ejercicio.rueda.rodando"),
        tm.parado
          ? `tocó a ${Math.round(tm.alTocar.a)} m del umbral y paró a ${Math.round(tm.parado.a)}, de ${Math.round(r.largo)}, a ${tm.parado.c.toFixed(1)} m del eje · cierre ${ej?.cierre}`
          : "no paró",
      );
    }
    comprobar(
      "con los bomberos del aeródromo junto al avión, y sin declarar nada en el aire",
      ej?.bomberos && !ej?.declarada && !r.mandoAlAire,
      `bomberos ${ej?.bomberos} · ${ej?.camiones} camiones · declarada ${ej?.declarada} · ${r.mandoAlAire ? "se mandó al aire" : "nadie mandó irse"}`,
    );
    const tiradas = r.descartadas.filter((k) => /ejercicio\./.test(String(k)));
    comprobar(
      "y nada del ejercicio se cae esperando en la cola",
      tiradas.length === 0,
      tiradas.join(" · ") || "nada tirado",
    );
    if (FOTOS) console.log(`    fotos: ${fotosHechas.join(" · ") || "ninguna"}`);
  }
  if (MODO === "ave") {
    const av = r.av;
    const izq = av.motor === 0;
    const lado = izq ? "izquierdo" : "derecho";
    const ladoF = izq ? "izquierda" : "derecha";
    const de = (paso) => av.pasos.find((x) => x.paso === paso);
    const cuando = (x) => (x ? `${x.t.toFixed(1)} s y ${Math.round(x.sobre)} m` : "no");
    comprobar(
      "el golpe, la tarjeta de qué motor y el pie que se pisa, dicho",
      av.motor !== null &&
        dice(r.todoCantado, `golpe del ave en el motor ${lado}`) &&
        av.tarjeta &&
        dice(pedido, `ejercicio.ave.${lado}`),
      `motor ${av.motor} (${lado}) · ${r.todoCantado.filter((k) => /golpe del ave/.test(k)).join(" · ") || "sin golpe"} · ` +
        `tarjeta ${av.tarjeta} · ${pedido.filter((k) => /ave\.(izquierdo|derecho)/.test(k)).join(" · ") || "no dicho"}`,
    );
    const separados = av.estallidos.slice(1).map((x, i) => x.t - av.estallidos[i].t);
    comprobar(
      "petardea: estallidos espaciados con su fogonazo, el N1 de ese motor se va del otro, y se cuenta qué es",
      av.estallidos.filter((x) => x.paso === "petardea").length >= 3 &&
        separados.every((x) => x > 3.5) &&
        av.separan > 0.05 &&
        (ej?.ave?.llamaradas ?? 0) >= 3 &&
        r.cuadrosConLlama >= 3 &&
        dice(r.todoCantado, `estallido del motor ${lado}`) &&
        dice(pedido, "ejercicio.ave.petardeo"),
      `${av.estallidos.length} estallidos a los ${av.estallidos.map((x) => x.t.toFixed(1)).join(", ")} s · ` +
        `las agujas se separan ${(av.separan * 100).toFixed(1)} % · ${ej?.ave?.llamaradas} fogonazos, en ${r.cuadrosConLlama} cuadros · guiñada ${((av.yendose * 180) / Math.PI).toFixed(1)}° · ` +
        `${pedido.filter((k) => /ave\.petardeo/.test(k)).join(" · ") || "no contado"}`,
    );
    const atras = de("atras");
    comprobar(
      "primero se vuela: la palanca no se toca hasta tener altura y el avión sujeto",
      // Catorce segundos, con uno de margen: el reloj del piloto del banco va un cuadro por detrás, y una foto lo para.
      !!atras && atras.t >= 12.9 && atras.sobre >= 122 && Math.abs(atras.alabeo) < 0.45,
      atras ? `a los ${cuando(atras)}, alabeo ${((atras.alabeo * 180) / Math.PI).toFixed(0)}°` : "no se tocó",
    );
    const quieto = de("quieto");
    const adelante = de("adelante");
    const enSilencio = av.estallidos.filter((x) => quieto && adelante && x.t > quieto.t + 3 && x.t < adelante.t);
    comprobar(
      "esa palanca y no la otra: atrás hasta que se calla, y el otro motor sigue dando lo suyo",
      !!quieto &&
        av.palanca.includes(`${ladoF}-atras`) &&
        !av.palanca.some((x) => !x.startsWith(ladoF)) &&
        dice(pedido, "ejercicio.ave.palanca") &&
        enSilencio.length === 0 &&
        av.otra > 0.85,
      `al ralentí a los ${cuando(quieto)} · tarjetas ${av.palanca.join(", ") || "ninguna"} · ${enSilencio.length} estallidos con ella atrás · ` +
        `el otro, al ${(av.otra * 100).toFixed(0)} % como poco · ${pedido.filter((k) => /ave\.palanca/.test(k)).join(" · ") || "no dicho"}`,
    );
    const pieMedio = av.cuantos ? av.pedales / av.cuantos : 0;
    comprobar(
      "el pie, del otro lado",
      // En la subida: en el suelo el pie del banco se va a fondo por el derrape de las ruedas, y no es de esto.
      av.cuantos > 0 && (izq ? pieMedio > 0.1 : pieMedio < -0.1) && av.pieMaximo < 0.9,
      `pie medio ${pieMedio.toFixed(2)} con esa palanca atrás, máximo en la subida ${av.pieMaximo.toFixed(2)}`,
    );
    comprobar(
      NO_AGUANTA
        ? "adelante despacio, vuelve a estallar, atrás y se para: contado"
        : "adelante despacio, aguanta y ahí se deja: contado",
      dice(pedido, "ejercicio.ave.adelante") &&
        av.palanca.includes(`${ladoF}-media`) &&
        (NO_AGUANTA
          ? !!de("noAguanta") && !!de("parado") && dice(pedido, "ejercicio.ave.noAguanta") && ej?.asegurado && !dice(pedido, "ejercicio.ave.aguanta")
          : !!de("aguanta") && dice(pedido, "ejercicio.ave.aguanta") && !de("noAguanta")),
      av.pasos.map((x) => `${x.paso} ${cuando(x)}`).join(" · "),
    );
    comprobar(
      NO_AGUANTA
        ? "sin mensajes ni alarma mientras va; al pararlo, lo que se hizo y no «ENG FAIL»"
        : "sin mensajes ni alarma: ese avión no los lleva de seguro para esto",
      av.mensajes.length === 0 &&
        !r.todoCantado.some((k) => /^motor parado→/.test(k)) &&
        (NO_AGUANTA
          ? (ej?.mensajes ?? []).some((m) => /THR LEVER . · IDLE/.test(m)) && !(ej?.mensajes ?? []).some((m) => /FAIL/.test(m))
          : (ej?.mensajes ?? []).length === 0),
      `mientras iba: ${av.mensajes.join(" / ") || "ninguno"} · al final: ${(ej?.mensajes ?? []).join(" / ") || "ninguno"}`,
    );
    comprobar(
      `${NO_AGUANTA ? "MAYDAY, con un motor" : "PAN PAN, con los dos"}, con la torre contestando y prioridad`,
      ej?.declarada && ej?.prioridad && dice(r.torre, NO_AGUANTA ? "mayday" : "panpan"),
      `declarada ${ej?.declarada} · torre ${r.torre.filter((k) => /panpan|mayday/i.test(k)).join(" · ") || "sin llamada"}`,
    );
    comprobar(
      "nadie la manda al aire: tiene prioridad",
      !r.mandoAlAire,
      r.mandoAlAire ? "se mandó" : "ninguna orden",
    );
    comprobar(
      "con los bomberos del aeródromo esperando junto a la pista",
      ej?.bomberos,
      `bomberos ${ej?.bomberos} · ${ej?.camiones} camiones`,
    );
    comprobar(
      "toca en la pista y se cierra la vuelta",
      r.tocoEn?.enPista && ej?.cierre === "vuelta",
      (r.tocoEn
        ? `tocó ${r.tocoEn.enPista ? "en la pista" : "fuera"} a ${Math.round(r.tocoEn.a)} m del umbral` +
          `${typeof r.caida === "number" ? `, cayendo ${r.caida.toFixed(1)} m/s` : ""}`
        : `no llegó · lo más bajo ${Math.round(r.bajo)} m`) + ` · cierre ${ej?.cierre}`,
    );
    const tiradas = r.descartadas.filter((k) => /ejercicio\./.test(String(k)));
    comprobar(
      "y nada del ejercicio se cae esperando en la cola",
      tiradas.length === 0,
      tiradas.join(" · ") || "nada tirado",
    );
    if (FOTOS) console.log(`    fotos: ${fotosHechas.join(" · ") || "ninguna"}`);
  }
  if (MODO === "planeo") {
    comprobar(
      "se para el motor y empieza el planeo, con calma",
      dice(r.instructor, "vuelo.sinMotor"),
      r.instructor.filter((k) => /sinMotor|planeo/.test(k)).join(" · ") || "no",
    );
    comprobar(
      "nadie la manda al aire",
      !r.mandoAlAire,
      r.mandoAlAire ? "se mandó" : "ninguna orden",
    );
    comprobar(
      "y llega planeando a la pista, y se cierra el ejercicio",
      ej?.cierre === "vuelta",
      `cierre ${ej?.cierre} · lo más bajo ${Math.round(r.bajo)} m`,
    );
  }
  const cierreQueToca =
    MODO === "carga" && !AMARRADA
      ? "ejercicio.carga.bien"
      : MODO === "morro"
        ? "ejercicio.morro.bien"
        : MODO === "radio"
          ? "ejercicio.radio.bien"
          : MODO === "reventon"
            ? PARAR
              ? "ejercicio.reventon.bienParado"
              : "ejercicio.reventon.bien"
            : MODO === "toma"
              ? DEJA
                ? "ejercicio.rueda.bienFuera"
                : "ejercicio.rueda.bien"
            : MODO === "ave"
              ? NO_AGUANTA
                ? "ejercicio.ave.bienParado"
                : "ejercicio.ave.bien"
            : "ejercicio.bien";
  comprobar(
    "y la instructora lo cierra celebrándolo",
    dice(pedido, cierreQueToca) &&
      (MODO !== "ave" || NO_AGUANTA || !dice(pedido, "ejercicio.ave.bienParado")) &&
      (MODO !== "toma" || DEJA || !dice(pedido, "ejercicio.rueda.bienFuera")),
    pedido.filter((k) => /ejercicio\.(bien|bomberos|carga\.bien|morro\.bien|radio\.bien|reventon\.bien|rueda\.bien|ave\.bien)/.test(k)).join(" · ") || "no",
  );
  const mal = resultados.some((x) => !x.ok);
  if (process.env.OGA_TRAZA || mal) {
    for (const l of r.traza) console.log(`    ${l}`);
    console.log(`    instructor: ${r.instructor.join(" · ")}`);
    console.log(`    torre: ${r.torre.join(" · ")}`);
    console.log(`    cabina: ${r.cantados.join(" · ")}`);
    // Y lo del ejercicio que la boca tiró, con su porqué: sin esto, un «no se pidió» no dice si se pidió y se cayó.
    const tiradas = r.descartadas.filter((k) => /ejercicio\./.test(String(k)));
    console.log(`    tiradas: ${tiradas.join(" · ") || "ninguna del ejercicio"}`);
  }
  console.log(
    `\n  ${MODO} · ${ESCENARIO} · ${AVION} · ${TRAMO} · ${Math.round(r.reloj)} s de reloj`,
  );
} finally {
  await navegador.close();
  await server.close();
}

console.log("");
for (const x of resultados)
  console.log(`  ${x.ok ? "✓" : "✗"} ${x.nombre}  —  ${x.detalle}`);
const bien = resultados.filter((x) => x.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones\n`);
process.exit(bien === resultados.length ? 0 : 1);

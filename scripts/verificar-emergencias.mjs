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
 *
 * **Las voces que no están grabadas no suenan** —ver `decirDelEjercicio` en
 * `game.ts`—, y el juego apunta cada una que se calla en `cantados`. Así que
 * lo que se mira aquí es que se **pidió**, grabado o no: lo dicho por la
 * instructora y lo callado por sin grabar.
 *
 * Uso: `node scripts/verificar-emergencias.mjs <antes|despues|carrera|tren|planeo|despres|carga|morro>
 *        [escenario] [avion] [tramo]`
 *
 * Con `OGA_TRAZA=1` escribe la traza del vuelo aunque todo vaya bien.
 */
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
}[MODO];
if (!EJERCICIO) {
  console.error(
    "Uso: verificar-emergencias.mjs <antes|despues|carrera|tren|planeo|despres|carga|morro> [escenario] [avion] [tramo]",
  );
  process.exit(2);
}
const ESCENARIO = process.argv[3] ?? "gran-canaria";
const AVION =
  process.argv[4] ??
  (MODO === "planeo" || MODO === "carga"
    ? "jaz-20"
    : MODO === "carrera" || MODO === "tren" || MODO === "morro"
      ? "jaz-40"
      : "jaz-90");
/**
 * Con `OGA_AMARRADA=1`, en `carga` la hoja de carga lleva la maleta del
 * ejercicio amarrada en la bodega 1, y no se tiene que mover nada.
 */
const AMARRADA = MODO === "carga" && process.env.OGA_AMARRADA === "1";
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
const TRAMO = process.argv[5] ?? (MODO === "planeo" ? "tuka" : "taguato");
// Uno propio, que otro banco puede estar corriendo a la vez: `OGA_PUERTO` para otro.
const PUERTO = Number(process.env.OGA_PUERTO ?? 5337);
/**
 * Lo más que se espera a que acabe el ejercicio, en segundos de reloj. El de
 * la despresurización empieza a cien kilómetros, arriba: más rato.
 */
const TOPE = Number(process.env.OGA_TOPE ?? (MODO === "despres" ? 1800 : 1200));

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
        if (pila.includes("cualSePara")) return lado === "derecho" ? 0.75 : 0.25;
        return azar();
      };
    }, process.env.OGA_MOTOR);
  await page.goto(
    `${BASE}/?escenario=${ESCENARIO}&hora=12&avion=${AVION}&tramo=${TRAMO}` +
      `&ejercicio=${EJERCICIO}&teselas=0&meteo=` +
      (AMARRADA ? "&pasajeros=1&filas=1,0&bodegas=44,0&amarradas=1,1" : ""),
  );
  await page.waitForFunction(() => !!globalThis.__oga?.estado, null, {
    timeout: 90000,
  });
  await page.waitForTimeout(12000);

  const r = await page.evaluate(
    async ({ modo, tope, sinTren }) => {
      const o = globalThis.__oga;
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
      const puntos = [
        [pista.length + 3000, 0],
        [pista.length + 3000 + tendido, tendido],
        [-largoDeFinal, tendido],
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
        return acota((quiere - o.actitud().alabeo) * 1.6 - s.rollRate * 0.3, -0.6, 0.6);
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
          if (s.groundSpeed < 0.5 && recorridoAlParar === null) recorridoAlParar = p.a;
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
        c.rudder = pedal(s, dt);

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
          if ((modo === "carga" || modo === "morro") && sobre > 60) o.pedirFlaps(0);
          const v2 = modo === "carga" ? vref * 1.15 : (vel.v2 ?? vref * 1.2);
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
          const adelante = Math.max(800, Math.min(2500, u * 0.6));
          const lead = aMundo(Math.min(p.a + adelante, pista.length), 0);
          const deriva =
            Math.hypot(s.velocity.x, s.velocity.z) > 5
              ? error(Math.atan2(s.velocity.x, -s.velocity.z), s.heading)
              : 0;
          c.aileron = alabear(
            s,
            s.onGround ? h : rumboA(s, lead.x, lead.z) - deriva,
            (18 * Math.PI) / 180,
          );
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
            c.brakes = 1;
            c.reversa = 1;
            c.elevator = 0;
            return;
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
           * 75 nudos con la nariz 2,6° abajo. Aquí, por debajo de ocho metros,
           * la nariz sube un grado y medio por segundo mientras el avión se
           * hunda y se queda donde está si no, hasta ocho grados: se sostiene
           * en el aire mientras frena, que es la recogida de una toma corta.
           */
          if (modo === "morro" && sobre < 8) {
            if (recogida === null) recogida = o.actitud().cabeceo;
            if (s.verticalSpeed < -0.3) recogida = Math.min(recogida + ((1.5 * Math.PI) / 180) * dt, (8 * Math.PI) / 180);
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
            modo === "morro" && ej?.fase !== "armada" && !ej?.morro?.extension ? 80 * 0.514444 : vref * 1.1;
          c.throttle = sobre < 10 ? 0 : gasPara(s, enLaFinal, dt);
          bajo = Math.min(bajo, sobre);
        }
      };
      o.pilotar(piloto);
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
            o.pilotar(piloto);
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
        caida: o.caida?.() ?? null,
        recorridoAlParar,
        largo: pista.length,
        percance: o.percance(),
        reloj: o.reloj() - t0,
        instructor: todo.instructor.slice(antes.instructor),
        // La presentación llega al empezar, antes de que el banco mire.
        todoInstructor: todo.instructor,
        // Y lo que se calló por no estar grabado, desde el principio también.
        todoCantado: o.cantados(),
        torre: todo.torre.slice(antes.torre),
        cantados: o.cantados().slice(antes.cantados),
        descartadas: o.descartadas(),
      };
    },
    { modo: MODO, tope: TOPE, sinTren: SIN_TREN },
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
          : MODO === "planeo"
            ? ej.motorParado === null
            : ej.motorParado !== null) &&
      (!PARA || (ej.parar ?? ej.antesDeV1)) &&
      (!SIGUE || !(ej.parar ?? ej.antesDeV1)),
    `fase ${ej?.fase} · motor ${ej?.motorParado} · se para ${ej?.parar ?? ej?.antesDeV1} · ` +
      `${r.alFallar ? `a ${Math.round(r.alFallar.sobre)} m · ` : ""}` +
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
    MODO === "carga" && !AMARRADA ? "ejercicio.carga.bien" : MODO === "morro" ? "ejercicio.morro.bien" : "ejercicio.bien";
  comprobar(
    "y la instructora lo cierra celebrándolo",
    dice(pedido, cierreQueToca),
    pedido.filter((k) => /ejercicio\.(bien|bomberos|carga\.bien|morro\.bien)/.test(k)).join(" · ") || "no",
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

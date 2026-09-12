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
 * Uso: `node scripts/verificar-vuelo-entero.mjs [escenario] [tramo]`
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

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();

const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
const page = await navegador.newPage({
  viewport: { width: 1000, height: 620 },
  hasTouch: true,
  isMobile: true,
});
const errores = [];
page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
await page.addInitScript(() => {
  localStorage.setItem("oga-veve:teclas-vistas", "1");
});
await page.goto(
  `http://localhost:${PUERTO}/?escenario=${ESCENARIO}&leccion=despegue&tramo=${TRAMO}`,
);
await page.waitForTimeout(16000);

const resultados = [];
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

// ── El vuelo ──────────────────────────────────────────────────────────────

const vuelo = await page.evaluate(async (vecesPedidas) => {
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
  const c = o.controles();
  const pista = o.pista();
  const rumboPista = (pista.heading * Math.PI) / 180;

  /** Diferencia de rumbo, de −π a π. */
  const error = (a, b) => {
    let e = a - b;
    while (e > Math.PI) e -= 2 * Math.PI;
    while (e < -Math.PI) e += 2 * Math.PI;
    return e;
  };
  /** Mando de alerón para ir a un rumbo. */
  const alRumbo = (s, rumbo) =>
    Math.max(-1, Math.min(1, error(rumbo, s.heading) * 2));
  /** Y para ir a un punto. */
  const alPunto = (s, x, z) =>
    alRumbo(s, Math.atan2(x - s.position.x, -(z - s.position.z)));

  /** Cuánto se está del eje de la pista, en metros. Para la traza. */
  const desvio = (s) => {
    const r = o.pista();
    const hp = (r.heading * Math.PI) / 180;
    return (
      (s.position.x - r.x) * Math.cos(hp) + (s.position.z - r.z) * Math.sin(hp)
    );
  };

  /**
   * Seguir la raya: se mira un punto de la ruta quince metros por delante y se
   * gira hacia él. Es lo que hace quien sigue una raya pintada en el suelo.
   */
  const MIRA = 15;
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
      if (d > MIRA) {
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

  const umbral = o.puntoDeFinal(0);
  const cotaDePista = umbral ? o.suelo(umbral.x, umbral.z) : 0;
  /** Altura sobre la pista, que es la que importa para volar un circuito. */
  const alto = (s) => s.position.y - cotaDePista;

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
  let etapa = "arrancar";
  let mudo = 0;
  let mudoMaximo = 0;
  let mudoDonde = "";
  let vueltaMetros = 0;
  let antes = null;
  let sinRaya = 0;
  let sinRayaDonde = "";
  let sinRayaPrimero = "";
  let lejosDelCoche = 0;
  let cercaDelCoche = Infinity;
  let cercaCuando = "";
  let alCocheAhora = -1;
  let ladoDelCoche = -1;
  let terrenoEnPista = 0;
  let dijoToca = false;
  let pidioFreno = false;
  let tiempoDeRodajeIda = 0;
  let tiempoDeRodajeVuelta = 0;
  let despego = 0;
  let toco = 0;
  const fases = new Set();

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
   * Quince minutos **de vuelo**. Un vuelo entero son unos ocho; el resto es
   * margen para que, cuando algo falle, se vea **dónde** se quedó parado.
   */
  const TOPE = 900;
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
  const empezo = o.reloj();
  let leidoAntes = empezo;
  let t = 0;
  let i = 0;
  for (; t < TOPE; i++) {
    await new Promise((r) => setTimeout(r, (PASO / veces) * 1000));
    const ahora = o.reloj();
    /** Lo que ha pasado de verdad desde la muestra anterior. */
    const paso = ahora - leidoAntes;
    leidoAntes = ahora;
    t = ahora - empezo;
    const s = o.estado();
    const fase = o.fase();
    const ruta = o.ruta();
    const tarjeta = o.tarjeta();
    fases.add(fase);

    // ── Lo que se mide, pase lo que pase ─────────────────────────────────
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
    if (tarjeta.dibujo === "toma") dijoToca = true;
    if (tarjeta.dibujo === "freno" && toco) pidioFreno = true;

    /*
     * **El coche solo cuenta mientras se rueda.** Durante la carrera de
     * aterrizaje se adelanta a esperar en la boca de la salida, y ahí estar
     * lejos es lo correcto: no se le está siguiendo, se va a su encuentro.
     */
    const coche = globalThis.__raiz?.getObjectByName("sigueme");
    if (
      coche?.visible &&
      s.onGround &&
      s.airspeed < 16 &&
      fase !== "aterrizado"
    ) {
      const alCoche = Math.hypot(
        coche.position.x - s.position.x,
        coche.position.z - s.position.z,
      );
      lejosDelCoche = Math.max(lejosDelCoche, alCoche);
      /*
       * **Y lo cerca que se le llega a poner**, que es la otra mitad.
       *
       * Se medía solo lo lejos —«se le puede seguir»— y faltaba lo contrario:
       * que no se le lleve por delante. Atropellarlo es un percance, o sea el
       * final del vuelo, y en Mariscal Estigarribia y Pedro Juan Caballero
       * pasa **en todos**. Ver #154.
       */
      alCocheAhora = alCoche;
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
      }
    }
    if (i % 20 === 0) {
      linea.push(
        `${t.toFixed(0)}s ${etapa}/${fase} ${s.airspeed.toFixed(0)}m/s gas ${c.throttle.toFixed(1)} ${alto(s).toFixed(0)}m ${s.onGround ? "tierra" : "aire"} ${s.onRunway ? "enPista" : "fuera"} ${desvio(s).toFixed(0)}m coche ${alCocheAhora < 0 ? "—" : `${alCocheAhora.toFixed(0)}/${ladoDelCoche.toFixed(0)}`} ${tarjeta.dibujo || "—"}`,
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
      c.throttle = s.airspeed < quiere ? 0.6 : 0;
      c.brakes = s.airspeed > quiere + 2 ? 1 : 0;
      c.aileron = timon(s, ruta);
      if (fase === "esperando" || fase === "autorizado") etapa = "esperar";
    } else if (etapa === "esperar") {
      c.throttle = 0;
      c.brakes = 1;
      if (fase === "autorizado" || fase === "alineando") etapa = "entrar";
    } else if (etapa === "entrar") {
      c.brakes = 0;
      c.throttle = s.airspeed < 8 ? 0.5 : 0;
      c.aileron = s.onRunway ? alRumbo(s, rumboPista) : timon(s, ruta);
      if (s.onRunway && Math.abs(error(rumboPista, s.heading)) < 0.15) {
        etapa = "despegar";
      }
    } else if (etapa === "despegar") {
      c.throttle = 1;
      // En el eje: se apunta a un punto de la pista muy por delante.
      const p = o.puntoDeFinal(-2000);
      c.aileron = p ? alPunto(s, p.x, p.z) : alRumbo(s, rumboPista);
      if (s.airspeed > 27) c.elevator = 0.5;
      if (!s.onGround && alto(s) > 60) {
        despego = t;
        etapa = "subir";
      }
    } else if (etapa === "subir") {
      /*
       * Se sube a la altura de circuito y se va a buscar la entrada en final.
       * El avión da la vuelta él solo por el camino: es lo que hace cualquiera
       * que despega y vuelve a entrar.
       *
       * **Y el cambio a final se decide en coordenadas de pista, no por
       * cercanía a un punto.** Apuntando a un punto y esperando a estar a
       * seiscientos metros de él, el avión se quedaba **orbitándolo**: a
       * treinta y seis metros por segundo y con el giro acotado, un punto se
       * puede rodear eternamente sin llegar nunca. Doce minutos de vuelo así,
       * subiendo, y las cinco comprobaciones de después culpando al juego.
       */
      const r = o.pista();
      const hp = (r.heading * Math.PI) / 180;
      const fx = Math.sin(hp);
      const fz = -Math.cos(hp);
      const along = (s.position.x - r.x) * fx + (s.position.z - r.z) * fz;
      const alUmbral = -r.length / 2 - along;
      // Y el gas se afloja al llegar arriba: con el motor a tope este modelo
      // sube aunque la palanca diga que no.
      c.throttle = alto(s) > CRUCERO ? 0.6 : 0.9;
      c.elevator = Math.max(-0.5, Math.min(0.5, (CRUCERO - alto(s)) * 0.02));
      const p = o.puntoDeFinal(3000);
      c.aileron = p ? alPunto(s, p.x, p.z) : 0;
      /*
       * **Y aquí hubo un intento de exigir estar en el eje antes de bajar**,
       * que es lo que hace un piloto de verdad. Se quitó porque empeoraba:
       * sin una captura de eje como tal —volar a un punto de intercepción y
       * después mantener rumbo— el piloto se quedaba dando vueltas sin llegar
       * nunca a cumplir la condición, y en Taguato ni siquiera entraba en
       * final. Queda anotado en #147 con lo medido.
       */
      if (alUmbral > 800 && alUmbral < 4000) etapa = "final";
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
      const r = o.pista();
      const hp = (r.heading * Math.PI) / 180;
      const fx = Math.sin(hp);
      const fz = -Math.cos(hp);
      const dx = s.position.x - r.x;
      const dz = s.position.z - r.z;
      const along = dx * fx + dz * fz;
      // El umbral por el que se entra está a media pista por detrás del centro.
      const alUmbral = -r.length / 2 - along;
      const objetivo = Math.max(0, alUmbral * SENDA);
      c.elevator = Math.max(-0.5, Math.min(0.4, (objetivo - alto(s)) * 0.02));
      // Sobre la pista se corta el gas: eso es aterrizar. Y antes, la
      // velocidad de aproximación a mano, que el gas no significa lo mismo en
      // los dos modelos de vuelo.
      const quiere = alUmbral < 60 ? 24 : 30;
      c.throttle =
        s.airspeed < quiere
          ? Math.min(1, c.throttle + 0.05)
          : Math.max(0, c.throttle - 0.05);
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
      const tx = r.x + fx * (along + 300);
      const tz = r.z + fz * (along + 300);
      c.aileron = alPunto(s, tx, tz);
      if (s.onGround && s.onRunway) {
        toco = t;
        etapa = "frenar";
      }
    } else if (etapa === "frenar") {
      c.throttle = 0;
      c.elevator = 0;
      c.brakes = 1;
      c.aileron = alRumbo(s, rumboPista);
      if (s.airspeed < 8) etapa = "volver";
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
      c.throttle = s.airspeed < quiere ? 0.6 : 0;
      c.brakes = s.airspeed > quiere + 2 ? 1 : 0;
      c.aileron = timon(s, ruta);
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

  return {
    etapa,
    /*
     * **Y si el vuelo se paró por un percance, cuál.**
     *
     * Sin esto, un percance y un atasco se cuentan igual —«acabó en volver a
     * los 900 s»— y son cosas muy distintas: en el percance el juego hizo lo
     * que tenía que hacer y el banco se quedó dando gas a un avión con los
     * frenos puestos durante once minutos. Ver `sufrirPercance`.
     */
    percance: o.percance?.() ?? null,
    segundos: +t.toFixed(1),
    veces,
    vueltas: i,
    fases: [...fases].join(" "),
    // El principio y el final: los dos sitios donde se atasca un vuelo.
    linea: [...linea.slice(0, 4), "…", ...linea.slice(88, 150)],
    mudoMaximo: +mudoMaximo.toFixed(1),
    mudoDonde,
    vueltaMetros: Math.round(vueltaMetros),
    sinRaya: +sinRaya.toFixed(1),
    sinRayaDonde,
    sinRayaPrimero,
    lejosDelCoche: Math.round(lejosDelCoche),
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
    galones: o.galones().map((g) => g.id ?? g),
    fin: o.finDeVuelo(),
    avion: o.avion?.() ?? null,
  };
}, VECES);

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
 */
comprobar(
  "se vuela el modelo de la aeronave y no las cajas de respaldo",
  vuelo.avion?.dibujo === "modelo",
  vuelo.avion
    ? `${vuelo.avion.nombre} · ${vuelo.avion.dibujo}`
    : "no se pudo mirar",
  "el modelo se apaga en silencio si el fichero no está donde se le espera",
);

comprobar(
  "un vuelo entero se puede completar sin ayuda de nadie",
  vuelo.etapa === "apagar",
  `acabó en «${vuelo.etapa}» a los ${vuelo.segundos.toFixed(0)} s${
    vuelo.percance ? ` · percance: ${vuelo.percance}` : ""
  } · fases: ${vuelo.fases}`,
  "el banco medía trozos sueltos y nunca había volado un vuelo de principio a fin",
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
comprobar(
  "y el de vuelta no se dispara",
  vuelo.vuelta > 0 && vuelo.vuelta <= 220,
  `${vuelo.vuelta} s y ${vuelo.vueltaMetros} m de la pista al puesto`,
  "la vuelta es más larga que la ida y nadie la había cronometrado",
);

comprobar(
  "la pantalla nunca se queda muda en tierra",
  vuelo.mudoMaximo < 6,
  `lo más, ${vuelo.mudoMaximo} s sin tarjeta${vuelo.mudoDonde ? ` · ${vuelo.mudoDonde}` : ""}`,
  "«la llave salió, se apagó a los seis segundos, y ya no había forma de enterarse»",
);

comprobar(
  "la raya verde no falta mientras se rueda",
  vuelo.sinRaya < 1,
  vuelo.sinRaya
    ? `${vuelo.sinRaya} s sin raya · del ${vuelo.sinRayaPrimero} al ${vuelo.sinRayaDonde}`
    : "puesta todo el rato",
  "«cuando doy el giro dejo de ver la línea verde… había desaparecido hasta A3»",
);

if (TRAMO === "guyrami" || TRAMO === "tuka") {
  comprobar(
    "al coche del sígame se le puede seguir",
    vuelo.lejosDelCoche < 150,
    `lo más lejos que llegó a estar: ${vuelo.lejosDelCoche} m`,
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
 */
comprobar(
  "y no se le atropella",
  vuelo.cercaDelCoche < 0 || vuelo.cercaDelCoche > 8,
  vuelo.cercaDelCoche < 0
    ? "no llegó a salir"
    : `lo más cerca que llegó a estar: ${vuelo.cercaDelCoche} m · ${vuelo.cercaCuando}`,
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

comprobar(
  "antes de tocar, el juego dice que ya se puede tocar",
  vuelo.dijoToca,
  vuelo.dijoToca ? "salió su dibujo" : "no lo dijo",
  "«no me indica lo contrario, que ya debo tomar tierra»",
);

comprobar(
  "y después de tocar, pide frenar",
  vuelo.pidioFreno,
  vuelo.pidioFreno ? "salió la tarjeta del freno" : "no la pidió",
  "se aterrizaba y la pantalla no decía nada durante quince segundos",
);

comprobar(
  "y el vuelo termina contando lo que te llevás",
  vuelo.fin && vuelo.galones.length > 0,
  `${vuelo.galones.length} galones: ${vuelo.galones.join(", ") || "ninguno"}${vuelo.fin ? "" : " · sin pantalla de fin"}`,
  "un vuelo que termina sin decir que ha terminado deja mirando la pantalla",
);

// ── El informe ────────────────────────────────────────────────────────────

console.log(
  `\n  vuelo entero · ${ESCENARIO} · ${TRAMO} · reloj ×${vuelo.veces}` +
    ` · ${vuelo.vueltas} muestras en ${vuelo.segundos.toFixed(0)} s de vuelo\n`,
);
let fallos = 0;
for (const r of resultados) {
  if (!r.ok) fallos++;
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
  if (!r.ok) console.log(`      volvió: ${r.porque}`);
}
if (errores.length) {
  fallos++;
  console.log(`\n  ✗ errores en la consola: ${errores[0]}`);
}
if (fallos) {
  console.log("\n  últimos instantes del vuelo:");
  for (const l of vuelo.linea) console.log(`    ${l}`);
}
console.log(
  `\n  ${resultados.length - fallos} de ${resultados.length} comprobaciones\n`,
);

await navegador.close();
await server.close();
process.exit(fallos ? 1 : 0);

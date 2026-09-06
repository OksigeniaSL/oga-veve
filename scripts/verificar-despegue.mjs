/**
 * La otra mitad del vuelo: salir del puesto, rodar, esperar y despegar.
 *
 * Existe por una frase: «imagina ahora ir pasito a pasito trabajando sobre el
 * despegue, luego sobre dar un paseo por el aire, luego una frustrada,
 * luego… interminable».
 *
 * Tiene razón, y la salida de eso no es ir más rápido: es **comprobar las
 * fases a la vez**. El banco del aterrizaje encontró tres fallos en su primera
 * tirada, dos de ellos reportados jugando. Esta mitad del vuelo no se había
 * medido nunca.
 *
 * A diferencia del banco de aterrizaje, aquí **se pilota de verdad**: se
 * arranca el motor, se da gas y se deja que el avión ruede y despegue solo,
 * con la asistencia del peldaño haciendo su trabajo. Es lo que hay que
 * comprobar — que quien no sabe pilotar pueda salir del puesto y despegar
 * siguiendo lo que el juego le dice.
 *
 * ## Por qué solo en los peldaños de abajo
 *
 * El piloto de este banco no toca el timón: da gas, frena donde toca y deja
 * que la ayuda de rodaje haga su trabajo. Eso es exactamente lo que promete
 * Guyrami —a los cuatro años nadie hila dos kilómetros de calle de rodaje— y
 * exactamente lo que **no** promete Taguató, donde la curva es tuya. Correrlo
 * ahí saldría en rojo por la razón contraria a un fallo.
 *
 * Uso: `node scripts/verificar-despegue.mjs [escenario] [tramo]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const ESCENARIO = process.argv[2] ?? "tenerife-norte";
const TRAMO = process.argv[3] ?? "guyrami";
const PUERTO = 5281;

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

const mirar = (fn) => page.evaluate(fn);
const dibujoDeLaSenal = () =>
  page.evaluate(
    () => document.querySelector('[data-hud="senal-dibujo"]')?.innerHTML ?? "",
  );

// ── En el puesto ──────────────────────────────────────────────────────────

const arranque = await mirar(() => {
  const o = globalThis.__oga;
  let raiz = o.aeronave().grupo;
  while (raiz.parent) raiz = raiz.parent;
  globalThis.__raiz = raiz;
  const s = o.estado();
  return {
    fase: o.fase(),
    motor: o.controles().engineOn,
    v: s.airspeed,
    ruta: o.ruta().length,
    largo: o
      .ruta()
      .reduce(
        (t, p, i, r) =>
          i ? t + Math.hypot(p[0] - r[i - 1][0], p[1] - r[i - 1][1]) : 0,
        0,
      ),
    tecla:
      document.querySelector('[data-hud="senal-tecla"]')?.textContent ?? "",
    // Los pavimentos del aeródromo, para saber si la ruta va por asfalto.
  };
});

comprobar(
  "se empieza en el puesto, parado y con el motor apagado",
  arranque.fase === "estacionado" && !arranque.motor && arranque.v < 1,
  `fase «${arranque.fase}», motor ${arranque.motor ? "en marcha" : "parado"}`,
  "arrancar el motor es el primer paso del vuelo y no existía como paso",
);
comprobar(
  "y la pantalla pide arrancar, con su tecla dibujada",
  arranque.tecla.length > 0,
  `tecla «${arranque.tecla}»`,
  "«pulso la I y no se quita de la pantalla el icono»: un mando que no se anuncia no existe",
);
comprobar(
  "hay ruta desde el puesto hasta el punto de espera",
  arranque.ruta > 4,
  `${arranque.ruta} puntos, ${arranque.largo.toFixed(0)} m`,
  "hay puestos de OSM que no conectan con ninguna calle y el avión salía sin raya",
);

// La ruta de salida, ¿va por el asfalto?
const rutaPorAsfalto = await mirar(() => {
  const o = globalThis.__oga;
  // `caminos()` da las polilíneas del asfalto en coordenadas del mundo.
  const caminos = o.caminos();
  const alCamino = (px, pz) => {
    let mejor = Infinity;
    let deQue = "";
    for (const { puntos: linea, que } of caminos) {
      for (let i = 0; i < linea.length - 1; i++) {
        const [ax, az] = linea[i];
        const [bx, bz] = linea[i + 1];
        const dx = bx - ax;
        const dz = bz - az;
        const l2 = dx * dx + dz * dz;
        if (l2 < 1) continue;
        const t = Math.max(
          0,
          Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2),
        );
        const d = Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
        if (d < mejor) {
          mejor = d;
          deQue = que;
        }
      }
    }
    return { d: mejor, que: deQue };
  };
  // Media anchura de calle de rodaje y un margen: fuera de eso es el campo.
  /*
   * **Y cerca de la pista el listón es otro, porque el asfalto es otro.**
   *
   * Veinte metros es media calle de rodaje y vale en una calle. Donde una
   * calle se une a la pista hay boca, acuerdos y zona de espera: cuarenta
   * metros del eje de la calle siguen siendo asfalto en cualquier aeropuerto
   * del mundo, y en los datos de OpenStreetMap ese trozo muchas veces no está
   * dibujado como calle. Medir ahí con el listón de una recta es medir
   * nuestros datos, no el juego.
   */
  const pista = o.pista();
  const cercaDeLaPista = (x, z) => {
    const dx = x - pista.x;
    const dz = z - pista.z;
    const h = (pista.heading * Math.PI) / 180;
    const across = Math.abs(dx * Math.cos(h) + dz * Math.sin(h));
    const along = Math.abs(dx * Math.sin(h) - dz * Math.cos(h));
    return across < 150 && along < pista.length / 2 + 150;
  };
  const ruta = o.ruta();
  const distancias = ruta.map(([x, z]) => alCamino(x, z));
  const fuera = distancias.filter(
    (c, i) => c.d > (cercaDeLaPista(ruta[i][0], ruta[i][1]) ? 40 : 20),
  ).length;
  return {
    fuera,
    total: ruta.length,
    // Dónde y cuánto, que «cuatro puntos fuera» no dice si es el puesto o un
    // atajo por la hierba.
    dondes: distancias
      .map((c, i) =>
        c.d > (cercaDeLaPista(ruta[i][0], ruta[i][1]) ? 40 : 20)
          ? `${i}:${c.d.toFixed(0)}m·${c.que}@${ruta[i][0].toFixed(0)},${ruta[i][1].toFixed(0)}`
          : null,
      )
      .filter(Boolean)
      .join(" "),
  };
});
comprobar(
  "y va por el asfalto, no por el campo",
  /*
   * Se tolera un punto: el propio puesto de estacionamiento cae en mitad de
   * una plataforma, y de una plataforma solo se conocen su contorno y sus
   * diagonales, así que su centro queda «lejos» de todas las líneas sin estar
   * fuera del asfalto.
   */
  rutaPorAsfalto.fuera <= 1,
  `${rutaPorAsfalto.fuera} de ${rutaPorAsfalto.total} puntos fuera${rutaPorAsfalto.dondes ? ` (${rutaPorAsfalto.dondes})` : ""}`,
  "«salgo por E4 atravesando los jardines»",
);

// ── El sígame ─────────────────────────────────────────────────────────────

const sigueme = await mirar(() => {
  const coche = globalThis.__raiz.getObjectByName("sigueme");
  const s = globalThis.__oga.estado();
  return {
    visible: !!coche?.visible,
    d: coche
      ? Math.hypot(
          coche.position.x - s.position.x,
          coche.position.z - s.position.z,
        )
      : Infinity,
  };
});
if (TRAMO === "guyrami" || TRAMO === "tuka") {
  comprobar(
    "el coche del sígame espera delante antes de arrancar",
    sigueme.visible && sigueme.d < 70,
    sigueme.visible ? `a ${sigueme.d.toFixed(0)} m` : "no se ve",
    "salía cuando ya ibas rodando, y aparecer de la nada no enseña nada",
  );
}

// ── Se arranca y se rueda ─────────────────────────────────────────────────

const rodando = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const c = o.controles();
  c.engineOn = true;
  c.brakes = 0;
  /*
   * **Se rueda a velocidad de rodaje, que es lo que el propio juego pide.**
   *
   * El primer intento daba gas fijo y el avión cogía veinte metros por segundo
   * —setenta y dos por hora, el triple de lo que la banda de velocidad tolera—
   * y en la primera curva se plantaba en la pista. Un banco que rueda como
   * nadie rodaría mide otra cosa. Aquí se sostiene la velocidad de rodaje,
   * como haría quien hace caso al juego.
   */
  /*
   * **La velocidad de rodaje la dice el juego, no este guion.**
   *
   * Estaba escrita a mano —nueve— y con eso el banco rodaba a nueve aunque el
   * plan pidiera trece: subir la velocidad de crucero no cambiaba ni el tiempo
   * medido ni nada. El plan la calcula curva a curva; aquí se pregunta.
   */
  const RODAJE = () => Math.max(4, o.rodaje?.() || 9);
  const desvios = [];
  const fases = [];
  /*
   * **Y este piloto sí lleva el timón.**
   *
   * Hasta hoy no lo tocaba: daba gas y dejaba que la ayuda de rodaje —que en
   * Guyrami estaba a tope— le hiciera las curvas. Eso medía el juego que había
   * y no el que queremos: «no tiene mucho sentido que el juego conduzca por el
   * jugador». Con la ayuda bajada a la mitad, el mismo piloto se comía la
   * primera curva, se plantaba en la pista y despegaba sin querer — que es
   * exactamente lo que le pasaría a un niño si nadie llevara el timón.
   *
   * Así que lo lleva: mira un punto de la ruta quince metros por delante y
   * gira hacia él. Es lo que hace quien sigue una raya pintada, y deja al
   * banco midiendo lo que tiene que medir — si la raya se puede seguir.
   */
  const MIRA = 15;
  const timon = (s, ruta) => {
    if (!ruta.length) return 0;
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
    // El rumbo del juego: x crece con el seno y z decrece con el coseno.
    const rumbo = Math.atan2(mira[0] - s.position.x, -(mira[1] - s.position.z));
    let e = rumbo - s.heading;
    while (e > Math.PI) e -= 2 * Math.PI;
    while (e < -Math.PI) e += 2 * Math.PI;
    return Math.max(-1, Math.min(1, e * 2));
  };
  // Se guarda para la entrada en pista, que es otra `evaluate` y otro ámbito.
  globalThis.__timon = timon;
  /*
   * Doscientos segundos. La ruta de salida de Tenerife Norte son dos
   * kilómetros de calle a velocidad de rodaje: el primer intento le dio
   * treinta segundos y **el banco se declaraba roto porque no había llegado
   * todavía**. Un banco impaciente miente igual que uno mal escrito.
   */
  // Cinco minutos: la salida de Tenerife Norte son dos kilómetros de calle a
  // paso de rodaje, y eso son cuatro minutos largos. Rodar lleva lo que lleva.
  for (let i = 0; i < 1400; i++) {
    await new Promise((r) => setTimeout(r, 250));
    const s = o.estado();
    /*
     * El acelerador de quien mira el indicador: gas si voy lento, freno si no.
     * Y **frenando al ver la doble raya**, que es la lección de este trozo: el
     * juego pone la luz roja y la tarjeta de parar, y quien no frena se planta
     * en la pista sin permiso. El primer piloto de este banco no frenaba, se
     * pasaba el punto de espera de largo y se perdía por el campo — y el banco
     * decía que el juego estaba roto.
     */
    const ruta = o.ruta();
    const fin = ruta[ruta.length - 1];
    const alFinal = fin
      ? Math.hypot(fin[0] - s.position.x, fin[1] - s.position.z)
      : Infinity;
    const llegando = alFinal < 45;
    const quiere = RODAJE();
    c.throttle = !llegando && s.airspeed < quiere ? 0.6 : 0;
    c.brakes = llegando || s.airspeed > quiere * 1.3 ? 1 : 0;
    c.aileron = timon(s, ruta);
    desvios.push(s.airspeed);
    fases.push(o.fase());
    if (o.fase() === "esperando" || o.fase() === "autorizado") break;
  }
  const s = o.estado();
  const ruta = o.ruta();
  const fin = ruta[ruta.length - 1];
  return {
    fase: o.fase(),
    v: s.airspeed,
    segundos: fases.length * 0.25,
    maxV: Math.max(...desvios),
    // Cuánto queda de ruta: si el avión avanza pero no llega, esto lo dice.
    alFinal: fin
      ? Math.hypot(fin[0] - s.position.x, fin[1] - s.position.z)
      : -1,
    puntos: ruta.length,
    fases: [...new Set(fases)].join(" "),
  };
});
comprobar(
  "rodando se llega al punto de espera y el juego lo sabe",
  rodando.fase === "esperando" || rodando.fase === "autorizado",
  `fase «${rodando.fase}» a ${rodando.v.toFixed(1)} m/s en ${rodando.segundos.toFixed(0)} s, quedan ${rodando.alFinal.toFixed(0)} m · vistas: ${rodando.fases}`,
  "la máquina de fases se quedaba pegada y la lección no avanzaba",
);
/*
 * **Y que no se haga eterno**, que es la otra mitad de lo mismo.
 *
 * «Voy a una velocidad absurdamente lenta, es aburrido pasarse cuatro minutos
 * en una pista, eso un niño no lo aguanta, se aburre.» Noventa segundos del
 * puesto al punto de espera: lo que dura la paciencia de quien tiene cuatro
 * años, y lo que se tarda de verdad en una avioneta que sale por la
 * intersección que le toca.
 */
comprobar(
  "y del puesto a la pista se llega antes de aburrirse",
  rodando.segundos <= 90,
  `${rodando.segundos.toFixed(0)} s de rodaje`,
  "«es aburrido pasarse cuatro minutos en una pista, eso un niño no lo aguanta»",
);
comprobar(
  "y no se rueda como un cohete",
  rodando.maxV < 22,
  `máxima ${rodando.maxV.toFixed(1)} m/s rodando`,
  "rodar a noventa por hora no es rodar, y nadie avisaba",
);

// ── La torre ──────────────────────────────────────────────────────────────

const torre = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const c = o.controles();
  c.throttle = 0;
  c.brakes = 1;
  let verde = null;
  let vistas = "";
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 250));
    // La clase del verde vive en la caja, no en la bombilla.
    const caja = document.querySelector('[data-hud="torre"]');
    const clases = caja?.className ?? "";
    vistas = clases;
    if (clases.includes("torre--verde")) {
      verde = i * 0.25;
      break;
    }
  }
  return { verde, fase: o.fase(), luz: vistas };
});
comprobar(
  "parando en la doble raya, la torre acaba autorizando",
  torre.verde !== null && torre.verde < 12,
  torre.verde === null
    ? `nunca dio verde (fase «${torre.fase}», lámpara «${torre.luz}»)`
    : `verde a los ${torre.verde.toFixed(1)} s`,
  "la torre miraba si habías llegado, no si estabas parado: se cruzaba a toda velocidad",
);

// ── La carrera de despegue ────────────────────────────────────────────────

const despegue = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const c = o.controles();
  const pista = o.pista();
  /*
   * **Primero se entra en pista, y eso se hace rodando.**
   *
   * Con la luz verde, el avión sigue en la doble raya: hay que meterlo en el
   * asfalto y alinearlo antes de dar gas. El primer intento daba gas a fondo
   * desde el punto de espera y el avión se comía la curva de entrada; el banco
   * decía «no despega» y lo que pasaba es que estaba en la hierba.
   */
  c.brakes = 0;
  /*
   * **Y la entrada también se hace con el timón**, que la curva del punto de
   * espera a la pista es la más cerrada de todo el rodaje.
   *
   * Iba con el alerón a cero, apoyada en la ayuda de rodaje: con la ayuda a
   * tope el avión entraba solo. Bajada a la mitad, en Silvio Pettirossi el
   * avión se quedaba en la boca —«no llegó a despegar»— y el banco culpaba al
   * empuje. Mientras queda raya, se sigue la raya; ya en el asfalto, se apunta
   * al eje de la pista.
   */
  const rumboPista = (pista.heading * Math.PI) / 180;
  const alRumbo = (s, rumbo) => {
    let e = rumbo - s.heading;
    while (e > Math.PI) e -= 2 * Math.PI;
    while (e < -Math.PI) e += 2 * Math.PI;
    return Math.max(-1, Math.min(1, e * 2));
  };
  for (let i = 0; i < 200; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const s = o.estado();
    c.throttle = s.airspeed < 8 ? 0.5 : 0;
    /*
     * Tres tramos, y en este orden: mientras quede raya por delante se sigue
     * la raya; agotada la raya —en la doble raya la ruta termina, y seguir
     * mirando su último punto es dar vueltas alrededor de él— se apunta al eje
     * de la pista; y ya en el asfalto, se pone el morro en el eje.
     */
    const ruta = o.ruta();
    const fin = ruta.length ? ruta[ruta.length - 1] : null;
    const alFin = fin
      ? Math.hypot(fin[0] - s.position.x, fin[1] - s.position.z)
      : 0;
    if (s.onRunway) {
      /*
       * **Y siempre en el rumbo de la pista, no en el que se parezca al
       * morro.**
       *
       * Se elegía entre el rumbo y su contrario según hacia dónde mirase el
       * avión al entrar, y entrando por una intersección casi de costado eso
       * es una moneda al aire: en Silvio Pettirossi salió cruz y el banco puso
       * al avión a despegar hacia el final de la pista, con treinta y cinco
       * metros por delante. Por dónde se despega no lo decide el morro: lo
       * decide el aeródromo, y es lo que el propio juego pinta con la raya de
       * entrada en pista.
       */
      c.aileron = alRumbo(s, rumboPista);
    } else if (ruta.length > 1 && alFin > 30) {
      c.aileron = globalThis.__timon(s, ruta);
    } else {
      c.aileron = alRumbo(
        s,
        Math.atan2(pista.x - s.position.x, -(pista.z - s.position.z)),
      );
    }
    if (s.onRunway && o.fase() === "despegando") break;
    // Ya en el eje: se acabó el rodaje. (Sin mirar la velocidad: entrando a
    // trece metros por segundo, el listón de doce no se cruzaba nunca y el
    // banco se pasaba cuarenta segundos dando vueltas por la pista.)
    if (s.onRunway && o.fase() === "alineando" && i > 12) break;
  }
  // La carrera va por donde va la pista. Ver arriba.
  const rumboDeLaCarrera = rumboPista;
  c.throttle = 1;
  let frenoSeFue = null;
  let enElAire = null;
  let usado = 0;
  // Desde dónde se empieza la carrera y hasta dónde se llega: si no despega,
  // esto dice si el problema es el empuje o el sitio.
  const ini = o.estado();
  const partida = {
    pista: ini.onRunway,
    fase: o.fase(),
    // Cuánta pista queda por delante donde empieza la carrera: si el avión se
    // sale por el final, el problema es dónde le han hecho entrar.
    queda: (
      pista.length / 2 -
      ((ini.position.x - pista.x) * Math.sin(rumboDeLaCarrera) -
        (ini.position.z - pista.z) * Math.cos(rumboDeLaCarrera))
    ).toFixed(0),
  };
  let alto = 0;
  let punta = 0;
  const inicio = o.estado().position.clone
    ? { x: o.estado().position.x, z: o.estado().position.z }
    : null;
  for (let i = 0; i < 200; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const s = o.estado();
    /*
     * **Y en la carrera el timón sigue en la mano.**
     *
     * Se soltaba —«lo que se mide aquí es el empuje»— y eso es falso: un avión
     * que no se mantiene en el eje se sale de la pista, y fuera de la pista
     * este modelo **no deja despegar**, a propósito. El banco marcaba «no
     * llegó a despegar» con el avión a treinta y siete metros por segundo
     * rodando por la hierba a doscientos por hora.
     */
    /*
     * **Y no basta con poner el morro en el rumbo de la pista: hay que ir al
     * eje.**
     *
     * Con solo el rumbo, un avión que entra por una calle y queda pegado al
     * borde sale de la pista por el costado sin dejar de apuntar bien — y
     * fuera de la pista este modelo no deja despegar, a propósito. Medido en
     * Silvio Pettirossi: 37,2 m/s, mil trescientos metros de carrera y un
     * metro de altura. Se apunta a un punto del eje trescientos metros por
     * delante, que es lo que hace quien despega.
     */
    if (s.onGround) {
      const dx = s.position.x - pista.x;
      const dz = s.position.z - pista.z;
      const along =
        dx * Math.sin(rumboDeLaCarrera) - dz * Math.cos(rumboDeLaCarrera);
      const tx = pista.x + Math.sin(rumboDeLaCarrera) * (along + 300);
      const tz = pista.z - Math.cos(rumboDeLaCarrera) * (along + 300);
      c.aileron = alRumbo(
        s,
        Math.atan2(tx - s.position.x, -(tz - s.position.z)),
      );
    } else {
      c.aileron = 0;
    }
    // Un empujón de palanca cuando ya corre, que es lo que pide el tutor.
    if (s.airspeed > 27) c.elevator = 0.5;
    const boton = document.querySelector('[data-hud="brakes-touch"]');
    if (frenoSeFue === null && boton?.hidden) frenoSeFue = s.airspeed;
    if (inicio) {
      usado = Math.hypot(s.position.x - inicio.x, s.position.z - inicio.z);
    }
    alto = Math.max(alto, s.heightAboveGround);
    punta = Math.max(punta, s.airspeed);
    if (!s.onGround && s.heightAboveGround > 15) {
      enElAire = { v: s.airspeed, usado };
      break;
    }
  }
  const fin = o.estado();
  const dxf = fin.position.x - pista.x;
  const dzf = fin.position.z - pista.z;
  const across =
    dxf * Math.cos(rumboDeLaCarrera) + dzf * Math.sin(rumboDeLaCarrera);
  return {
    acabo: `${fin.onRunway ? "en pista" : "fuera"}, a ${Math.abs(across).toFixed(0)} m del eje, ${fin.airspeed.toFixed(1)} m/s`,
    enElAire,
    frenoSeFue,
    largoDePista: pista.length,
    fase: o.fase(),
    partida,
    alto,
    punta,
    usado,
  };
});

comprobar(
  "a todo gas el avión despega",
  despegue.enElAire !== null,
  despegue.enElAire
    ? `a ${despegue.enElAire.v.toFixed(1)} m/s tras ${despegue.enElAire.usado.toFixed(0)} m`
    : `no llegó a despegar: empezó ${despegue.partida.pista ? "en pista" : "fuera de pista"} en fase «${despegue.partida.fase}» con ${despegue.partida.queda} m por delante, subió ${despegue.alto.toFixed(0)} m en ${despegue.usado.toFixed(0)} m, punta ${despegue.punta.toFixed(1)} m/s, acabó ${despegue.acabo}`,
  "con el empuje mal el avión tardaba veinticinco segundos en rotar",
);
if (despegue.enElAire) {
  comprobar(
    "y le sobra pista de largo",
    despegue.enElAire.usado < despegue.largoDePista * 0.6,
    `${despegue.enElAire.usado.toFixed(0)} m de ${despegue.largoDePista.toFixed(0)}`,
    "una carrera que se come la pista entera no es una carrera, es un susto",
  );
  comprobar(
    "el freno se despide al pasar el punto de no retorno",
    despegue.frenoSeFue !== null && despegue.frenoSeFue > 15,
    despegue.frenoSeFue === null
      ? "no se fue"
      : `se fue a ${despegue.frenoSeFue.toFixed(1)} m/s`,
    "se iba también rodando por una calle, donde no hay V1 que valga",
  );
}

// ── En el aire ────────────────────────────────────────────────────────────

const enVuelo = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const c = o.controles();
  c.elevator = 0;
  await new Promise((r) => setTimeout(r, 4000));
  const s = o.estado();
  return {
    fase: o.fase(),
    subiendo: s.verticalSpeed,
    alto: s.heightAboveGround,
    ruta: o.ruta().length,
  };
});
comprobar(
  "en el aire sigue subiendo con el motor a tope",
  enVuelo.subiendo > 0.5,
  `${enVuelo.subiendo.toFixed(1)} m/s a ${enVuelo.alto.toFixed(0)} m`,
  "soltando los mandos el avión se quedaba nivelado con el gas a tope",
);
comprobar(
  "y la raya de rodaje desaparece, que volando no hay nada que rodar",
  enVuelo.ruta === 0,
  `${enVuelo.ruta} puntos de ruta`,
  "la raya se quedaba pintada en el suelo mientras se volaba",
);

// ── El informe ────────────────────────────────────────────────────────────

console.log(`\n  despegue · ${ESCENARIO} · ${TRAMO}\n`);
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
console.log(
  `\n  ${resultados.length - fallos} de ${resultados.length} comprobaciones\n`,
);

await navegador.close();
await server.close();
process.exit(fallos ? 1 : 0);

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
 * Uso: `node scripts/verificar-despegue.mjs [escenario] [tramo] [viento]`
 *
 * El viento va como en el juego —`000/14`, del norte a catorce nudos— y sirve
 * para pedir una cabecera concreta. Sin él manda el tiempo de casa, que es lo
 * que ve quien abre el juego. Hace falta para el **back-taxi**: en Mariscal
 * Estigarribia la maniobra solo aparece con el viento del norte apretando, que
 * es justo cuando merece la pena rodar por la pista. Ver #151.
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const ESCENARIO = process.argv[2] ?? "tenerife-norte";
const TRAMO = process.argv[3] ?? "guyrami";
const VIENTO = process.argv[4] ?? "";
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
  `http://localhost:${PUERTO}/?escenario=${ESCENARIO}&leccion=despegue&tramo=${TRAMO}` +
    (VIENTO ? `&viento=${VIENTO}` : ""),
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
  /*
   * Y se deja instalada la medida, que hace falta dos veces: para la ruta del
   * puesto al punto de espera y para la de entrar en la pista. La segunda no
   * se medía, y es justo donde volvió a salir lo mismo: «me sale atravesando
   * el jardín».
   */
  globalThis.__medirAsfalto = (ruta) => {
    const distancias = ruta.map(([x, z]) => alCamino(x, z));
    const limite = (i) => (cercaDeLaPista(ruta[i][0], ruta[i][1]) ? 40 : 20);
    return {
      fuera: distancias.filter((c, i) => c.d > limite(i)).length,
      total: ruta.length,
      dondes: distancias
        .map((c, i) =>
          c.d > limite(i)
            ? `${i}:${c.d.toFixed(0)}m·${c.que}@${ruta[i][0].toFixed(0)},${ruta[i][1].toFixed(0)}`
            : null,
        )
        .filter(Boolean)
        .join(" "),
    };
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
/*
 * **Y en un campo particular no hay coche.**
 *
 * «Me sale hasta el coche follow-me, que está bien que salga, pero en un
 * aeródromo particular es raro.» Y es verdad: ese coche existe porque un
 * aeropuerto tiene cincuenta calles y aviones grandes moviéndose. Lo dice el
 * fichero del aeródromo, no el peldaño.
 */
const CON_COCHE =
  (TRAMO === "guyrami" || TRAMO === "tuka") && ESCENARIO !== "yvytu-rape";
if (!CON_COCHE && (TRAMO === "guyrami" || TRAMO === "tuka")) {
  comprobar(
    "en un campo particular no sale el coche del sígame",
    !sigueme.visible,
    sigueme.visible
      ? `salió, a ${sigueme.d.toFixed(0)} m`
      : "no sale, como debe",
    "«en un aeródromo particular es raro»: ese coche es de aeropuerto grande",
  );
}
if (CON_COCHE) {
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
  const RODAJE = () => o.rodaje?.() ?? 9;
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
  /*
   * **Y no se busca el punto más cercano de toda la ruta: solo hacia delante.**
   *
   * Vale mientras la ruta no se pise a sí misma. El back-taxi la pisa por
   * definición —se va y se vuelve por la misma pista— y ahí el punto más
   * cercano salta de una raya a la otra cada pocos segundos: medido en
   * Mariscal Estigarribia, el avión daba bandazos de ciento ochenta grados
   * cada diez segundos sin avanzar un metro. Se recuerda por dónde iba, que
   * es lo que hace cualquiera que sigue una raya. Ver #151.
   */
  let ibaPor = 0;
  let cuantosEran = 0;
  const timon = (s, ruta) => {
    if (!ruta.length) return 0;
    // Ruta nueva, numeración nueva: la memoria de la anterior no vale.
    if (ruta.length !== cuantosEran) {
      cuantosEran = ruta.length;
      ibaPor = 0;
    }
    let cerca = ibaPor;
    let mejor = Infinity;
    for (let i = Math.max(0, ibaPor - 2); i < ruta.length; i++) {
      const d = Math.hypot(
        ruta[i][0] - s.position.x,
        ruta[i][1] - s.position.z,
      );
      if (d < mejor) {
        mejor = d;
        cerca = i;
      }
    }
    ibaPor = cerca;
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
    const ruta = o.ruta();
    const fin = ruta[ruta.length - 1];
    const alFinal = fin
      ? Math.hypot(fin[0] - s.position.x, fin[1] - s.position.z)
      : Infinity;
    /*
     * **La velocidad la pide el juego, y al final de la ruta pide cero.**
     *
     * Antes este piloto frenaba «al ver la doble raya» —a cuarenta y cinco
     * metros del final— y eso era hacerle el trabajo al plan, que ya calcula
     * la frenada punto a punto y termina en cero. Con el perfil de velocidad
     * bien hecho, el avión se para solo encima de la raya; con el freno de
     * antes se paraba cuarenta metros antes y la fase no llegaba nunca.
     */
    const quiere = RODAJE();
    c.throttle = s.airspeed < quiere ? 0.6 : 0;
    c.brakes = s.airspeed > quiere + 2 ? 1 : 0;
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
    /*
     * Y **lo que el juego cree que queda**, que no es lo mismo.
     *
     * Lo de arriba es la distancia en línea recta al último punto de la ruta,
     * medida por este banco; esto es la cuenta con la que el juego decide
     * cambiar de fase. Cuando las dos se separan, el fallo está en la cuenta y
     * no en el piloto — y así es como se encontró el de Estigarribia, donde el
     * avión estaba a un metro de la raya y el juego creía que quedaban
     * trescientos. Ver #151.
     */
    creeQueQuedan: o.rodajeAsi?.().restante ?? -1,
    puntos: ruta.length,
    fases: [...new Set(fases)].join(" "),
  };
});
comprobar(
  "rodando se llega al punto de espera y el juego lo sabe",
  rodando.fase === "esperando" || rodando.fase === "autorizado",
  `fase «${rodando.fase}» a ${rodando.v.toFixed(1)} m/s en ${rodando.segundos.toFixed(0)} s, quedan ${rodando.alFinal.toFixed(0)} m y el juego cree que ${rodando.creeQueQuedan} · vistas: ${rodando.fases}`,
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

/*
 * **Y con el verde dado, la raya que mete en la pista también es asfalto.**
 *
 * Esto no se medía. La ruta del puesto al punto de espera sí, desde que
 * «salgo por E4 atravesando los jardines»; la de los últimos cien metros —del
 * punto de espera al eje de la pista— no, y ahí volvió a pasar lo mismo en
 * Tenerife Norte: «me sale atravesando el jardín, pues ya ves». Son los cien
 * metros más delicados del rodaje, porque es donde la calle se junta con la
 * pista.
 */
const entrada = await page.evaluate(() => {
  const o = globalThis.__oga;
  const ruta = o.ruta();
  return {
    ...globalThis.__medirAsfalto(ruta),
    fase: o.fase(),
    avion: [o.estado().position.x, o.estado().position.z],
    primeros: ruta.slice(0, 8).map((p) => [Math.round(p[0]), Math.round(p[1])]),
  };
});
comprobar(
  "y la raya que mete en la pista va por el asfalto",
  entrada.fuera <= 1 && entrada.total > 1,
  `${entrada.fuera} de ${entrada.total} puntos fuera en «${entrada.fase}»${
    entrada.dondes ? ` (${entrada.dondes})` : ""
  } · avión ${entrada.avion.map(Math.round).join(",")} · ${entrada.primeros.map((p) => p.join(",")).join(" → ")}`,
  "«me sale atravesando el jardín»: del punto de espera al eje se tiraba una recta",
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
  /*
   * Seiscientas vueltas y no doscientas: dos minutos. Lo pide el **back-taxi**,
   * que son seiscientos y pico metros de pista a ocho metros por segundo antes
   * de poder pensar en despegar. Ver #151.
   */
  for (let i = 0; i < 600; i++) {
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
    if (o.fase() === "back-taxi" && ruta.length > 1) {
      /*
       * **Salvo en el back-taxi, donde ir por la pista es el plan.**
       *
       * Aquí el avión está sobre el asfalto y apuntando justo al revés que la
       * pista **a propósito**: va a buscar la cabecera al otro extremo. Poner
       * el morro en el rumbo de despegue en ese momento es abortar la
       * maniobra, y eso es lo que hacía este banco: daba media vuelta y
       * despegaba desde donde estuviera. Mientras el juego diga que esto es un
       * back-taxi, se sigue la raya como en cualquier otro rodaje.
       */
      c.aileron = globalThis.__timon(s, ruta);
    } else if (s.onRunway) {
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
    /*
     * **Y «en el eje» quiere decir alineado, no «encima del asfalto».**
     *
     * Esto rompía a los doce fotogramas de estar sobre la pista, mirase donde
     * mirase el morro. En Tenerife colaba porque se entra por una calle casi
     * paralela; en un campo de novecientos metros con la calle entrando de
     * costado, el banco daba gas con el avión **ciento siete grados torcido**
     * —medido—, o sea cruzando la pista, y desde ahí no hay despegue posible:
     * se sale por el otro lado en dos segundos.
     */
    /*
     * **Y en el back-taxi no se rompe por mucho que el morro apunte bien.**
     *
     * Yendo hacia la cabecera por la pista, el avión cruza el rumbo de
     * despegue cada vez que corrige, y con eso bastaba para dar el rodaje por
     * terminado: el piloto de la carrera tomaba el mando a mitad del
     * back-taxi, daba media vuelta donde estuviera y despegaba desde ahí. Dos
     * de cada tres veces salía bien y a la tercera no, que es la peor clase de
     * banco. Ver #151.
     */
    if (
      s.onRunway &&
      o.fase() !== "back-taxi" &&
      Math.abs(alRumbo(s, rumboPista)) < 0.25 &&
      i > 8
    )
      break;
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
  const eIni = (() => {
    let e = rumboDeLaCarrera - ini.heading;
    while (e > Math.PI) e -= 2 * Math.PI;
    while (e < -Math.PI) e += 2 * Math.PI;
    return (e * 180) / Math.PI;
  })();
  const partida = {
    pista: ini.onRunway,
    fase: o.fase(),
    // Con qué morro y a qué distancia del eje se empieza la carrera: si el
    // avión entra torcido, lo que se mide después no es el empuje.
    torcido: eIni.toFixed(0),
    delEje: (
      (ini.position.x - pista.x) * Math.cos(rumboDeLaCarrera) +
      (ini.position.z - pista.z) * Math.sin(rumboDeLaCarrera)
    ).toFixed(0),
    v: ini.airspeed.toFixed(1),
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
  let desvio = 0;
  let enPistaPasos = 0;
  let destelloV1 = 0;
  /*
   * Y los dos momentos por separado: qué decía el destello y si salió la
   * flecha de tirar. V1 es una decisión y Vr es una acción, y hasta que no se
   * distinguieron los dos salían igual: un destello mudo. Ver #105.
   */
  const dichos = [];
  let flechaDeTirar = false;
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
    // El destello de V1, que es lo que marca el punto de no retorno.
    {
      const el = document.querySelector('[data-hud="v1"]');
      const op = el ? Number(getComputedStyle(el).opacity) : 0;
      if (op > destelloV1) destelloV1 = op;
      const texto = el?.textContent?.trim() ?? "";
      if (op > 0.05 && texto && !dichos.includes(texto)) dichos.push(texto);
      /*
       * **Y se mira lo que se ve, no lo que pone en el HTML.**
       *
       * Esto buscaba el trazo de la flecha dentro de `innerHTML` y con eso se
       * daba por contento. El trazo estaba y no se veía nada: el dibujo se
       * escribía sin `<svg>` alrededor y un navegador no pinta un `<path>`
       * suelto, así que en el segundo de tirar del morro salía un recuadro
       * naranja vacío. Meses. Ahora se le pide al navegador que mida el
       * `<svg>`: si no hay svg no hay caja, y si no hay caja no se vio.
       */
      const caja = document.querySelector('[data-hud="senal-dibujo"] svg');
      const dibujo = caja?.innerHTML ?? "";
      if (
        dibujo.includes("18.5 8.4") &&
        caja.getBoundingClientRect().height > 4
      )
        flechaDeTirar = true;
    }
    // Y lo que se separa del eje, que en una pista de hierba de dieciocho
    // metros es la diferencia entre despegar y correr por el campo.
    {
      const dx = s.position.x - pista.x;
      const dz = s.position.z - pista.z;
      desvio = Math.max(
        desvio,
        Math.abs(
          dx * Math.cos(rumboDeLaCarrera) + dz * Math.sin(rumboDeLaCarrera),
        ),
      );
      if (s.onRunway) enPistaPasos += 1;
    }
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
    desvio: +desvio.toFixed(0),
    enPistaPasos,
    destelloV1: +destelloV1.toFixed(2),
    dichos,
    flechaDeTirar,
    usado,
  };
});

comprobar(
  "a todo gas el avión despega",
  despegue.enElAire !== null,
  despegue.enElAire
    ? `a ${despegue.enElAire.v.toFixed(1)} m/s tras ${despegue.enElAire.usado.toFixed(0)} m`
    : `no llegó a despegar: empezó ${despegue.partida.pista ? "en pista" : "fuera de pista"} en fase «${despegue.partida.fase}» con ${despegue.partida.queda} m por delante, ${despegue.partida.torcido}° torcido, ${despegue.partida.delEje} m del eje, a ${despegue.partida.v} m/s, subió ${despegue.alto.toFixed(0)} m en ${despegue.usado.toFixed(0)} m, punta ${despegue.punta.toFixed(1)} m/s, ${despegue.desvio} m de desvío máximo, ${despegue.enPistaPasos} fotogramas en pista, acabó ${despegue.acabo}`,
  "con el empuje mal el avión tardaba veinticinco segundos en rotar",
);
if (despegue.enElAire) {
  comprobar(
    "y le sobra pista de largo",
    despegue.enElAire.usado < despegue.largoDePista * 0.6,
    `${despegue.enElAire.usado.toFixed(0)} m de ${despegue.largoDePista.toFixed(0)}`,
    "una carrera que se come la pista entera no es una carrera, es un susto",
  );
  /*
   * **Y V1 se ve, en grande y tenue.**
   *
   * «Ese V1 sí se podría mostrar incluso a los pequeños, pensaba en un V1 que
   * parpadeara un poco en grande en casi toda la pantalla pero tenue.» No está
   * para leerse —a los cuatro años no se lee— sino para marcar un instante,
   * como el destello de un aro: son señales que van quedando en la memoria
   * visual y que significan algo de verdad en aviación.
   */
  comprobar(
    "y V1 se marca en la pantalla",
    despegue.destelloV1 > 0.05,
    despegue.destelloV1
      ? `destelló hasta ${despegue.destelloV1}`
      : "no se vio nada",
    "V1 solo se contaba quitando el botón del freno, que se entiende después",
  );
  /*
   * **Y Vr detrás, que es otra cosa.**
   *
   * V1 es el último instante en que se puede parar —una decisión que ya está
   * tomada— y Vr es tirar para levantar el morro —una acción que toca hacer
   * ahora—. Entre las dos pasan unos segundos, y esos segundos son la
   * lección: ya no puedo parar y todavía no vuelo. Salían las dos igual: un
   * destello mudo y nada más.
   */
  comprobar(
    "y detrás de V1 sale Vr, que es la que se usa de verdad",
    despegue.dichos.includes("V1") && despegue.dichos.includes("Vr"),
    `destellos: ${despegue.dichos.join(" → ") || "ninguno"}`,
    "los dos momentos del despegue salían igual y no se distinguían",
  );
  comprobar(
    "y en Vr aparece la flecha de tirar, que se entiende sin leer",
    despegue.flechaDeTirar,
    despegue.flechaDeTirar ? "salió" : "no salió",
    "el peldaño que no lee se quedaba sin saber qué hacer en ese segundo",
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

/**
 * El banco de pruebas de vuelo: un aterrizaje entero, comprobado a máquina.
 *
 * Existe por una frase: «he hecho 200 aterrizajes encontrando una y otra vez
 * fallos repetidos». Y por una constatación incómoda: **ni uno solo de los
 * fallos gordos de este juego se encontró volando**. La senda que era un palo
 * de hockey, la ruta que empezaba doscientos ochenta y seis metros por detrás
 * del avión, el aro que se daba por cruzado pasando ciento dieciocho metros
 * por encima, el veredicto de la toma que llegaba cincuenta y cuatro segundos
 * tarde, los dos PAPI con uno siempre en rojo — todos salieron de **medir**.
 *
 * Una persona tarda tres minutos en hacer un aterrizaje y solo puede mirar una
 * cosa a la vez. Esto hace el vuelo entero en un minuto y mira treinta.
 *
 * ## Cómo vuela
 *
 * **Colocando el avión, no pilotándolo.** Pilotar de verdad desde fuera es
 * frágil —un guion que tira de la palanca sale distinto cada vez— y además no
 * es lo que hay que comprobar: el modelo de vuelo ya tiene sus propias
 * pruebas. Lo que aquí se comprueba es **lo que el juego contesta** cuando el
 * avión está en un sitio: qué ruta traza, qué aro se enciende, qué tarjeta
 * enseña, qué veredicto da. Que es donde han estado todos los fallos.
 *
 * ## Qué hacer cuando esto falla
 *
 * Cada comprobación lleva escrito **qué fallo real la puso ahí**. Si una se
 * pone en rojo, no es un capricho del banco: es que ha vuelto algo que ya
 * estuvo mal una vez.
 *
 * Uso: `node scripts/verificar-vuelo.mjs [escenario] [tramo]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const ESCENARIO = process.argv[2] ?? "tenerife-norte";
const TRAMO = process.argv[3] ?? "guyrami";

/**
 * Si en este peldaño viene el coche del «sígame».
 *
 * De Taguató en adelante **no viene, y es a propósito**: ahí la lección es el
 * plano de rodaje, y con un coche delante no hay plano que aprender. Ver
 * `flight/tiers.ts`. Sin esta distinción, la prueba del sígame daba por roto
 * lo que estaba bien.
 */
const CON_SIGUEME = TRAMO === "guyrami" || TRAMO === "tuka";

/**
 * Y si en este peldaño el juego pone tope a la velocidad de rodaje.
 *
 * La misma escalera: donde el juego conduce hay tope, y de Taguató en adelante
 * **no lo hay a propósito** —ahí la velocidad de rodaje es cosa de quien
 * pilota, con el aviso, la raya ámbar y el señalero pidiendo despacio—. Ver
 * `flight/gobernador.ts`.
 */
const CON_TOPE = CON_SIGUEME;
const PUERTO = 5273;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();

const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
/*
 * Se prueba **con el dedo**, que es el aparato del aula. No es un detalle de
 * configuración: la mitad de las decisiones del HUD miran el puntero, y con
 * ratón se estaban comprobando otras. El botón rojo del freno, por ejemplo,
 * solo sale en los peldaños de arriba cuando se juega con el dedo.
 */
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
  `http://localhost:${PUERTO}/?escenario=${ESCENARIO}&leccion=aterrizaje&tramo=${TRAMO}`,
);

/*
 * Veinte segundos en el aire antes de tocar nada. No es una espera de
 * cortesía: la máquina de fases no da un vuelo por hecho hasta que se ha
 * subido a altura de circuito **y** se ha estado un rato arriba, y sin eso
 * nada de lo que viene después —la vuelta al puesto, el señalero— existe.
 */
/*
 * **Y primero se espera a que el juego exista, no a que pase un rato.**
 *
 * Con la máquina cargada, el guion entraba a preguntarle a `__oga` antes de
 * que existiera y reventaba con «cannot read properties of undefined», que
 * parece un fallo del juego y es un fallo del reloj.
 */
await page.waitForFunction(() => !!globalThis.__oga?.estado, null, {
  timeout: 60000,
});
await page.waitForTimeout(22000);

/** Coloca el avión respecto al umbral: `d` metros antes, `alto` sobre la pista. */
async function poner(d, alto, lateral = 0) {
  await page.evaluate(
    ({ d, alto, lateral }) => {
      const o = globalThis.__oga;
      const s = o.estado();
      const h = s.heading;
      const ux = Math.sin(h);
      const uz = -Math.cos(h);
      const u = globalThis.__umbral;
      o.colocar(
        u.x - ux * d - uz * lateral,
        u.y + alto,
        u.z - uz * d + ux * lateral,
        s.airspeed,
      );
    },
    { d, alto, lateral },
  );
  await page.waitForTimeout(260);
}

/**
 * Igual, pero midiendo la altura **desde el suelo de ahí**, no desde la pista.
 *
 * Hace falta porque los dos escenarios no se parecen: Tenerife Norte está en
 * una meseta y a un kilómetro del umbral el terreno ha caído setenta metros,
 * mientras que Silvio Pettirossi es llano. Una altura medida sobre la pista
 * ponía el avión a ciento cuarenta metros del suelo en uno y bajo tierra en el
 * otro, y la prueba medía cosas distintas en cada sitio.
 */
async function ponerSobreElSuelo(d, alto) {
  await page.evaluate(
    ({ d, alto }) => {
      const o = globalThis.__oga;
      const s = o.estado();
      const h = s.heading;
      const ux = Math.sin(h);
      const uz = -Math.cos(h);
      const u = globalThis.__umbral;
      const x = u.x - ux * d;
      const z = u.z - uz * d;
      o.colocar(x, o.suelo(x, z) + alto, z, s.airspeed);
    },
    { d, alto },
  );
  await page.waitForTimeout(260);
}

// El umbral en uso, que es de donde se mide todo. Sale del haz de la cabecera,
// que está plantado exactamente ahí.
await page.evaluate(() => {
  let raiz = globalThis.__oga.aeronave().grupo;
  while (raiz.parent) raiz = raiz.parent;
  const faro = raiz.getObjectByName("faro");
  globalThis.__umbral = {
    x: faro.position.x,
    y: faro.position.y - 210,
    z: faro.position.z,
  };
  globalThis.__raiz = raiz;
});

const resultados = [];
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

// ── La senda ──────────────────────────────────────────────────────────────

const senda = await page.evaluate(() => {
  const raiz = globalThis.__raiz;
  const pista = globalThis.__oga.pista();
  const suelo = globalThis.__oga.suelo(pista.x, pista.z);
  const aros = [];
  raiz.getObjectByName("aros").traverse((o) => {
    if (o.isMesh) aros.push({ y: o.position.y, d: o.userData.distancia ?? 0 });
  });
  return aros
    .sort((a, b) => b.d - a.d)
    .map((a) => ({
      d: a.d,
      grados: (Math.atan2(a.y - suelo, a.d) * 180) / Math.PI,
    }));
});
const pendientes = senda.map((a) => a.grados);
const maxDesvio = Math.max(...pendientes.map((g) => Math.abs(g - 3)));
comprobar(
  "la senda es una recta de tres grados",
  maxDesvio < 1.2,
  `desvío máximo ${maxDesvio.toFixed(2)}°`,
  "los aros dibujaban un palo de hockey: los últimos a 80 m sobre la pista",
);

const hilo = await page.evaluate(() => {
  const h = globalThis.__raiz.getObjectByName("hilo");
  if (!h) return { puntos: 0, hastaElUmbral: Infinity };
  const p = h.geometry.attributes.position;
  const u = globalThis.__umbral;
  let cerca = Infinity;
  for (let i = 0; i < p.count; i++) {
    cerca = Math.min(cerca, Math.hypot(p.getX(i) - u.x, p.getZ(i) - u.z));
  }
  return { puntos: p.count, hastaElUmbral: cerca };
});
comprobar(
  "la senda está dibujada y llega hasta el umbral",
  hilo.puntos > 40 && hilo.hastaElUmbral < 90,
  `${hilo.puntos} puntos, el último a ${hilo.hastaElUmbral.toFixed(0)} m del umbral`,
  "entre aro y aro no había nada que dijera si vas alto o bajo",
);

// ── Ni un árbol dentro del aeropuerto ─────────────────────────────────────

/*
 * «Los árboles que a veces plantas en mitad del aeropuerto. No hay árboles en
 * los aeropuertos. Y ni macetas con rosales.» Y no es jardinería: un árbol al
 * lado de una calle de rodaje es un obstáculo, y los pájaros que viven en él
 * son otro. Se excluía el pavimento y quedaban bosquecillos en los huecos
 * entre calles, que es donde en un aeropuerto de verdad hay hierba segada.
 */
const arboles = await page.evaluate(() => {
  const puntos = [];
  for (const c of globalThis.__oga.caminos()) {
    if (c.que === "plataforma" || c.que === "pista") puntos.push(...c.puntos);
  }
  if (puntos.length < 3) return { dentro: 0, total: 0 };
  // La envolvente convexa de pistas y plataformas: el recinto, a ojo.
  const p = [...puntos].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cruz = (o, a, b) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const media = (lista) => {
    const s = [];
    for (const q of lista) {
      while (s.length >= 2 && cruz(s[s.length - 2], s[s.length - 1], q) <= 0) {
        s.pop();
      }
      s.push(q);
    }
    s.pop();
    return s;
  };
  const poli = [...media(p), ...media([...p].reverse())];
  const dentroDe = (x, z) => {
    let dentro = false;
    for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
      const [xi, zi] = poli[i];
      const [xj, zj] = poli[j];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
        dentro = !dentro;
      }
    }
    return dentro;
  };
  let dentro = 0;
  let total = 0;
  const m = new (globalThis.THREE?.Matrix4 ?? Object)();
  globalThis.__raiz.getObjectByName("vegetacion")?.traverse((n) => {
    if (!n.isInstancedMesh) return;
    for (let i = 0; i < n.count; i++) {
      // La posición de cada instancia son los tres últimos de su matriz.
      const a = n.instanceMatrix.array;
      const x = a[i * 16 + 12];
      const z = a[i * 16 + 14];
      total += 1;
      if (dentroDe(x, z)) dentro += 1;
    }
  });
  void m;
  return { dentro, total };
});
comprobar(
  "no hay un solo árbol dentro del aeropuerto",
  arboles.dentro === 0,
  `${arboles.dentro} de ${arboles.total} árboles dentro del recinto`,
  "«no hay árboles en los aeropuertos, y ni macetas con rosales»",
);

// ── Los edificios del aeródromo ──────────────────────────────────────────

/*
 * **La terminal, la torre y los hangares.**
 *
 * No existían, y lo que se veía en su sitio eran casas del generador de ciudad
 * cayendo dentro del recinto: «se ve la terminal como dos cuadraditos, como si
 * alguien hubiera construido una cabaña encima». Ahora salen de OpenStreetMap
 * con su planta de verdad, y **paran a un avión**: un edificio que se atraviesa
 * es decorado, no un edificio.
 */
const edificios = await page.evaluate(() => {
  const o = globalThis.__oga;
  const lista = o.edificios();
  const bultos = o.bultos();
  let solidos = 0;
  for (const e of lista) {
    let x = 0;
    let z = 0;
    for (const p of e.puntos) {
      x += p[0] / e.puntos.length;
      z += p[1] / e.puntos.length;
    }
    // A media altura del edificio, en su centro: ahí tiene que haber bulto.
    if (bultos.choca(x, o.suelo(x, z) + e.alto / 2, z)) solidos += 1;
  }
  const grupo = globalThis.__raiz.getObjectByName("edificios-aerodromo");
  let mallas = 0;
  grupo?.traverse((n) => {
    if (n.isMesh) mallas += 1;
  });
  return { cuantos: lista.length, solidos, mallas };
});
if (edificios.cuantos) {
  comprobar(
    "los edificios del aeródromo están dibujados",
    edificios.mallas > 0,
    `${edificios.cuantos} edificios en ${edificios.mallas} mallas`,
    "«se ve la terminal como dos cuadraditos, como si fuera una cabaña»",
  );
  comprobar(
    "y paran a un avión, que no son decorado",
    edificios.solidos === edificios.cuantos,
    `${edificios.solidos} de ${edificios.cuantos} tienen bulto`,
    "la ciudad se atravesaba entera hasta que existió el índice de bultos",
  );
}

/*
 * **Y dentro del recinto no hay más casas que las suyas.**
 *
 * Lo que se veía como terminal eran casas del generador de ciudad plantadas
 * dentro del campo. Se barre el recinto —la envolvente de pistas y
 * plataformas— y no puede haber bulto ninguno lejos de los edificios del
 * aeródromo, que son los únicos que ahí tienen derecho a estar.
 */
const casasDentro = await page.evaluate(() => {
  const o = globalThis.__oga;
  const bultos = o.bultos();
  const suyos = o.edificios();
  const puntos = [];
  for (const c of o.caminos()) {
    if (c.que === "plataforma" || c.que === "pista") puntos.push(...c.puntos);
  }
  if (puntos.length < 3) return { dentro: 0, sondas: 0 };
  const p = [...puntos].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cruz = (o2, a, b) =>
    (a[0] - o2[0]) * (b[1] - o2[1]) - (a[1] - o2[1]) * (b[0] - o2[0]);
  const media = (lista) => {
    const s2 = [];
    for (const q of lista) {
      while (
        s2.length >= 2 &&
        cruz(s2[s2.length - 2], s2[s2.length - 1], q) <= 0
      ) {
        s2.pop();
      }
      s2.push(q);
    }
    s2.pop();
    return s2;
  };
  const poli = [...media(p), ...media([...p].reverse())];
  const dentroDe = (x, z) => {
    let d = false;
    for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
      const [xi, zi] = poli[i];
      const [xj, zj] = poli[j];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi)
        d = !d;
    }
    return d;
  };
  // Lejos de los edificios del propio aeródromo, que sí tienen que estar.
  const suyoCerca = (x, z) =>
    suyos.some((e) =>
      e.puntos.some((q) => Math.hypot(q[0] - x, q[1] - z) < 60),
    );
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of poli) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  let dentro = 0;
  let sondas = 0;
  for (let x = minX; x <= maxX; x += 25) {
    for (let z = minZ; z <= maxZ; z += 25) {
      if (!dentroDe(x, z) || suyoCerca(x, z)) continue;
      sondas += 1;
      if (bultos.choca(x, o.suelo(x, z) + 3, z)) dentro += 1;
    }
  }
  return { dentro, sondas };
});
comprobar(
  "y no hay casas del pueblo dentro del aeropuerto",
  casasDentro.dentro === 0,
  `${casasDentro.dentro} bultos ajenos en ${casasDentro.sondas} sondeos del recinto`,
  "«se ve la terminal como dos cuadraditos, como si fuera una cabaña»",
);

// ── Corta final ───────────────────────────────────────────────────────────

await poner(400, 24);
const enCorta = await page.evaluate(() => {
  const raiz = globalThis.__raiz;
  const faro = raiz.getObjectByName("faro");
  return { faro: faro.visible ? faro.material.opacity : 0 };
});
comprobar(
  "en corta final no hay nada tapando la pista",
  enCorta.faro < 0.05,
  `opacidad del haz ${enCorta.faro.toFixed(2)}`,
  "el haz de la cabecera pintaba la pista de ocre y borraba sus marcas",
);

// ── Pasar por encima de un aro ───────────────────────────────────────────

/*
 * **«Supero el aro y nadie me corrige.»**
 *
 * Perder un aro sonaba y destellaba en rojo, o sea decía *que* se escapó — y
 * no decía **hacia dónde**, que es la mitad que enseña. Pasar cincuenta metros
 * por encima y pasar cincuenta por debajo eran el mismo pitido, y son la
 * lección contraria.
 */
const porEncima = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const raiz = globalThis.__raiz;
  // El aro que toca ahora, y su altura.
  const aros = [];
  raiz.getObjectByName("aros").traverse((n) => {
    if (n.isMesh) {
      aros.push({
        y: n.position.y,
        d: n.userData.distancia ?? 0,
        // El radio, que es la mitad de esta prueba: ver más abajo.
        r: n.geometry?.parameters?.radius ?? 0,
      });
    }
  });
  if (!aros.length) return { sinAros: true };
  aros.sort((a, b) => b.d - a.d);
  const u = globalThis.__umbral;
  const s = o.estado();
  const h = s.heading;
  const ux = Math.sin(h);
  const uz = -Math.cos(h);

  /*
   * Se cruza el plano de un aro **muy por encima**: cincuenta metros sobre su
   * centro, que es lo que se ve en la grabación. La distancia se toma de un
   * aro de en medio, para que quede senda por delante y por detrás.
   */
  /*
   * **Y el aro que se prueba es el que el juego tiene pendiente**, no el de en
   * medio. La senda avanza sola según se vuela, y a estas alturas del guion el
   * avión ya ha pasado por delante de media aproximación: apuntar al tercero
   * cuando el juego va por el sexto es probar un aro que ya no existe. La
   * sonda dice cuál toca.
   */
  const pendiente = o.aros()?.i ?? Math.floor(aros.length / 2);
  const cual = aros[Math.min(pendiente, aros.length - 1)];
  const d = cual.d;
  /*
   * **Por encima del aro de verdad, no cincuenta metros a ojo.**
   *
   * Estaban escritos cincuenta, y los aros de lejos miden hasta cincuenta y
   * seis de radio: la prueba pasaba **por dentro** del aro y el juego, con
   * toda la razón, lo daba por cruzado y no corregía nada. Y como el aro que
   * toca depende de la lección y del escenario, el número no puede ser fijo:
   * se le pregunta al aro.
   */
  const alto = cual.y + cual.r + 40;
  /*
   * Sesenta metros por delante del aro, y diez segundos de margen. Estaban en
   * noventa y seis, y a treinta y cuatro metros por segundo eso son 2,6
   * segundos de vuelo con 6 de reloj: cruzar el aro caía justo en el filo del
   * plazo y la prueba iba y venía sin que nadie tocara el juego. Una prueba
   * que depende de cuánto tarda un navegador en pintar no mide nada.
   */
  /*
   * **Y colocado sobre el eje de verdad, con el rumbo de la pista.**
   *
   * Se medían los metros «antes del umbral» en la dirección del morro, y el
   * morro viene de la prueba anterior: el avión aparecía descentrado y cruzaba
   * el plano del aro por un costado, que es «ancho» y no «alto» — la prueba
   * salía bien o mal según lo que hubiera pasado antes. `puntoDeFinal` da el
   * punto y el rumbo de la cabecera en uso.
   */
  const sitio = o.puntoDeFinal(d + 60);
  o.colocar(sitio.x, alto, sitio.z, 34, sitio.h);
  // Y se rearma la senda desde aquí: colocar el avión no lo hace, así que sin
  // esto la prueba hereda el índice de aros de lo que hubiera pasado antes.
  o.reiniciarSenda();
  await new Promise((r) => setTimeout(r, 400));

  let tarjeta = "";
  for (let i = 0; i < 200; i++) {
    await new Promise((r) => setTimeout(r, 50));
    const puesta = o.tarjeta().dibujo;
    if (puesta === "aro-alto" || puesta === "aro-bajo") {
      tarjeta = puesta;
      break;
    }
  }
  const e = o.estado();
  return {
    tarjeta,
    ultima: o.tarjeta().dibujo,
    como: `aro ${pendiente}→${o.aros()?.i ?? "-"} a ${d.toFixed(0)} m, ${cual.y.toFixed(0)} de alto y ${cual.r.toFixed(0)} de radio · ${aros.length} aros · acabó a ${Math.hypot(e.position.x - u.x, e.position.z - u.z).toFixed(0)} m del umbral, ${e.onGround ? "posado" : "volando"}`,
  };
});
if (!porEncima.sinAros) {
  comprobar(
    "pasar por encima de un aro tiene quien lo corrija",
    porEncima.tarjeta === "aro-alto",
    porEncima.tarjeta
      ? `dice «${porEncima.tarjeta}»`
      : `tarjeta «${porEncima.ultima || "ninguna"}» · ${porEncima.como}`,
    "«supero el aro y nadie me corrige»: sonaba, pero no decía hacia dónde",
  );
}

// ── Bajo de verdad en la senda ────────────────────────────────────────────

/*
 * **«Final» no puede ser una excusa para callarse.**
 *
 * El aviso de terreno se calla en la aproximación final a propósito: ahí estar
 * bajo y bajando es lo que toca. Pero la fase dice «final» con estar alineado,
 * por delante del umbral y bajando —no mira la altura—, así que quien viene a
 * dos kilómetros y a quince metros del suelo también está «en final».
 *
 * Grabado volando: aproximación larga sobre la ciudad, el avión bajando entre
 * los edificios y la pantalla muda hasta posarse en un descampado.
 */
/*
 * Treinta y cinco metros **sobre el suelo** a kilómetro y medio del umbral, y
 * no una altura medida sobre la pista: los dos escenarios no se parecen. A esa
 * distancia la senda va por setenta y ocho metros sobre la pista, así que esto
 * queda menos de la mitad en los dos — y entre los quince metros por debajo de
 * los cuales ya no hay aviso que dar y los ciento veinte por encima de los
 * cuales no hay nada que avisar.
 */
await ponerSobreElSuelo(1500, 35);
const bajoEnLaSenda = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const c = o.controles();
  /*
   * **Morro abajo de verdad y gas corto.** Con un toque suave, en el modelo de
   * coeficientes el avión a veces se sostenía y la prueba salía distinta cada
   * vez: pasaba sola en un escenario y fallaba en el otro sin que nada
   * estuviera roto. Lo que se está probando es si alguien habla, no si el
   * avión sabe bajar.
   */
  c.throttle = 0.12;
  /*
   * Un par de segundos para que la máquina de fases se entere de dónde está.
   * Una fase nueva tiene que sostenerse medio segundo antes de sustituir a la
   * vieja, y sin esta espera el aviso salía **antes** de que el juego dijera
   * «final»: la prueba medía el fotograma anterior.
   */
  await new Promise((r) => setTimeout(r, 2000));
  let aviso = "";
  let fase = "";
  let alto = 0;
  for (let i = 0; i < 200; i++) {
    c.elevator = -0.35;
    await new Promise((r) => setTimeout(r, 50));
    alto = o.estado().heightAboveGround;
    /*
     * **Las dos cosas a la vez, y el aviso vivo, no su tarjeta.**
     *
     * La tarjeta dura tres segundos y se queda puesta cuando el aviso ya se
     * apagó: mirándola, la prueba pasaba igual con el arreglo puesto que
     * quitado. Y la fase tiene que ser «final» **en ese mismo instante**,
     * porque fuera de final este aviso siempre habló.
     */
    if (o.fase() === "final" && o.avisoDeTerreno()) {
      aviso = o.avisoDeTerreno();
      fase = o.fase();
      break;
    }
    if (o.estado().onGround) break;
  }
  const ultimaFase = o.fase();
  c.elevator = 0;
  c.throttle = 0;
  return { fase, aviso, alto, ultimaFase };
});
comprobar(
  "volando bajísimo en final, alguien lo dice",
  !!bajoEnLaSenda.aviso && bajoEnLaSenda.fase === "final",
  bajoEnLaSenda.aviso
    ? `«${bajoEnLaSenda.aviso}» a ${bajoEnLaSenda.alto.toFixed(0)} m del suelo, en fase «${bajoEnLaSenda.fase}»`
    : `nadie dijo nada a ${bajoEnLaSenda.alto.toFixed(0)} m, fase «${bajoEnLaSenda.ultimaFase}»`,
  "la fase decía «final» y con eso el aviso de terreno se callaba",
);

// ── La frustrada ──────────────────────────────────────────────────────────

/*
 * **Y esta se vuela de verdad, no se coloca.**
 *
 * Es la única forma de comprobarla: la frustrada se reconoce por lo que hace
 * el avión —bajar hacia la pista y volver a subir— y colocarlo no le da
 * régimen de descenso ni de ascenso. Así que aquí el guion pilota: baja por la
 * senda, se planta cerca del suelo, y entonces mete gas y tira.
 *
 * Es también la regla número uno de este juego —renunciar es ganar— y hasta
 * que existió esto el juego **no la detectaba en absoluto**: `grep frustrad
 * src/flight/` no devolvía una sola línea. Se podía hacer la maniobra que
 * salva vidas y la pantalla se quedaba callada.
 */
await poner(1500, 82);
const frustrada = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const c = o.controles();
  const dibujo = () =>
    document.querySelector('[data-hud="senal-dibujo"]')?.innerHTML ?? "";
  // El trazo de la senda que baja y se vuelve a ir arriba. Ver `ui/senal.ts`.
  const ESA = "Q 12 20";

  // Bajar por la senda hasta ponerse cerca del suelo, sin llegar a tocar.
  c.throttle = 0.2;
  let enFinal = false;
  let masBajo = Infinity;
  for (let i = 0; i < 400; i++) {
    c.elevator = -0.35;
    await new Promise((r) => setTimeout(r, 50));
    const s = o.estado();
    enFinal ||= o.fase() === "final";
    masBajo = Math.min(masBajo, s.heightAboveGround);
    if (s.onGround || s.heightAboveGround < 40) break;
  }
  const toco = o.estado().onGround;

  // Y la decisión: gas a tope y arriba.
  const t0 = performance.now();
  c.throttle = 1;
  let cuando = Infinity;
  let alSubir = Infinity;
  let subido = 0;
  for (let i = 0; i < 400; i++) {
    c.elevator = 0.9;
    await new Promise((r) => setTimeout(r, 50));
    subido = o.estado().heightAboveGround - masBajo;
    if (dibujo().includes(ESA)) {
      cuando = (performance.now() - t0) / 1000;
      // Y **cuántos metros** hacían falta, que es lo que de verdad se mide.
      // El reloj depende del terreno: donde el suelo cae —Tenerife Norte—, la
      // altura sobre él sube sola y la frustrada salta antes sin que el avión
      // haya hecho nada distinto. En llano tarda lo que tarda subir.
      alSubir = subido;
      break;
    }
    if (subido > 220) break;
  }
  /*
   * **Y se devuelven los mandos donde estaban.** Esto vuela de verdad, así que
   * deja el avión subiendo a tope de gas: sin soltarlo, la carrera de
   * aterrizaje de la sección siguiente no llegaba a posarse y fallaba una
   * comprobación que no tenía nada que ver.
   */
  c.elevator = 0;
  c.throttle = 0;
  // Y los galones, que es donde la frustrada tiene que valer lo que vale.
  await new Promise((r) => setTimeout(r, 400));
  return {
    enFinal,
    toco,
    masBajo,
    subido,
    cuando,
    alSubir,
    galones: o.galones(),
  };
});

comprobar(
  "la aproximación llega a contar como final",
  frustrada.enFinal && !frustrada.toco,
  `${frustrada.enFinal ? "sí" : "nunca"}, lo más bajo ${frustrada.masBajo.toFixed(0)} m${
    frustrada.toco ? " (tocó tierra)" : ""
  }`,
  "sin final no hay frustrada que valga: el banco estaría probando otra cosa",
);
comprobar(
  "irse al aire se reconoce y se celebra",
  frustrada.alSubir < 80,
  frustrada.cuando === Infinity
    ? `nada tras subir ${frustrada.subido.toFixed(0)} m`
    : `a los ${frustrada.alSubir.toFixed(0)} m de subida, ${frustrada.cuando.toFixed(1)} s`,
  "el juego no detectaba la frustrada en absoluto, siendo su regla número uno",
);
comprobar(
  "y vale un galón, como un aterrizaje",
  frustrada.galones.includes("frustrada"),
  `galones: ${frustrada.galones.join(", ") || "ninguno"}`,
  "renunciar tenía que valer tanto como posarse, y no valía nada",
);

// ── La carrera de aterrizaje ──────────────────────────────────────────────

await poner(-350, 1.4);
await page.evaluate(() => {
  const s = globalThis.__oga.estado();
  const h = s.heading;
  s.velocity?.set(Math.sin(h) * 28, 0, -Math.cos(h) * 28);
});
/*
 * Y se espera **a que toque de verdad**, no dos segundos y pico.
 *
 * El avión se pone a metro y medio sobre la pista, así que hasta que se posa
 * el juego dice «ya podés tocar» —que es lo correcto ahí— y esta prueba,
 * mirando el reloj en vez de las ruedas, leía esa tarjeta y decía que faltaba
 * la del freno. Lo que se comprueba es lo que pasa **después** de tocar.
 */
await page.evaluate(async () => {
  const o = globalThis.__oga;
  for (let i = 0; i < 100 && !o.estado().onGround; i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  await new Promise((r) => setTimeout(r, 1500));
});

const enPista = await page.evaluate(() => {
  const o = globalThis.__oga;
  const s = o.estado();
  const pista = o.pista();
  const h = (pista.heading * Math.PI) / 180;
  const ejes = (x, z) => {
    const dx = x - pista.x;
    const dz = z - pista.z;
    return {
      along: dx * Math.sin(h) - dz * Math.cos(h),
      across: dx * Math.cos(h) + dz * Math.sin(h),
    };
  };
  const yo = ejes(s.position.x, s.position.z);
  const ruta = o.ruta().map(([x, z]) => ejes(x, z));
  // Los puntos de la ruta que caen sobre el asfalto de la pista.
  const enAsfalto = ruta.filter(
    (p) =>
      Math.abs(p.across) < pista.width && Math.abs(p.along) < pista.length / 2,
  );
  return {
    fase: `${o.fase()} av=${globalThis.__av ?? 0}`,
    delante: enAsfalto.filter((p) => p.along - yo.along > 0).length,
    /*
     * **Dónde nace la raya**, que es lo que se ve o no se ve al levantar la
     * vista. Se miraba cuántos puntos quedaban por delante y eso mide el
     * tamaño del aeropuerto: en un campo de novecientos metros la salida está
     * a cincuenta y la ruta se va del asfalto en dos puntos. Lo que hacía daño
     * era que **el primer punto** estuviera doscientos ochenta y seis metros
     * detrás, o sea fuera de la pantalla.
     */
    naceDetras: ruta.length ? yo.along - ruta[0].along : 0,
    // Los últimos puntos son el giro a la calle de salida: ahí hay que
    // cruzar el borde, para eso es una salida. Lo que no puede es cruzarlo
    // antes, que es lo que hacía la diagonal.
    fueraDelEje: enAsfalto
      .slice(0, Math.max(0, enAsfalto.length - 6))
      .filter((p) => Math.abs(p.across) > pista.width / 2).length,
    /*
     * La tarjeta se pregunta **por su nombre**, no rebuscando en el SVG. Se
     * miraba un trozo de `path` porque no había otra forma; ahora la señal
     * sabe decir qué tiene puesto, y de paso, cuando esto falla, dice qué
     * había en su lugar en vez de un hueco.
     */
    tarjeta: o.tarjeta().dibujo,
    /*
     * Y el coche del «sígame», que aquí desaparecía: «se ve bien, pero
     * desaparece en la pista de aterrizaje, no va delante de mí hasta el
     * final». Tiene que estar, y **por delante**, esperando en la salida.
     */
    coche: (() => {
      const c = globalThis.__raiz.getObjectByName("sigueme");
      if (!c?.visible) return null;
      const suyo = ejes(c.position.x, c.position.z);
      return { delante: suyo.along - yo.along, fuera: Math.abs(suyo.across) };
    })(),
  };
});
/*
 * **Y lo que se comprueba es que no nazca por detrás.**
 *
 * Se pedían más de tres puntos de ruta sobre la pista por delante, y eso mide
 * el tamaño del aeropuerto más que otra cosa: en Yvytu Rape la salida está a
 * cincuenta metros de donde se para el avión, así que la ruta se va del
 * asfalto en dos puntos y la comprobación salía roja teniendo razón el juego.
 * Lo que de verdad hacía daño era lo otro: que la raya arrancara doscientos
 * ochenta y seis metros **detrás**, o sea fuera de la pantalla.
 */
comprobar(
  "la ruta de vuelta no nace por detrás del avión",
  /*
   * Ciento cincuenta metros. No es cero a propósito: la ruta se traza cuando
   * la fase cambia a «abandonando» y el avión sigue corriendo mientras tanto,
   * así que a treinta metros por segundo unos segundos de cola son normales y
   * no se ven —quedan debajo del avión—. Lo que se vigila es lo otro: los
   * doscientos ochenta y seis metros que dejaban la raya fuera de la pantalla.
   */
  enPista.naceDetras < 150,
  `nace ${enPista.naceDetras.toFixed(0)} m ${enPista.naceDetras < 0 ? "por delante" : "por detrás"}, y hay ${enPista.delante} puntos de pista por delante`,
  "la ruta nacía 286 m por detrás del avión y se iba por la calle paralela",
);
comprobar(
  "y va por el eje, no pegada al borde",
  enPista.fueraDelEje === 0,
  `${enPista.fueraDelEje} puntos fuera del medio ancho`,
  "iba en diagonal desde el avión hasta la boca de la salida",
);
/*
 * **Y a todo gas en la carrera de aterrizaje no se acelera.**
 *
 * «A toda leche me pasé E5 y nada me avisó: puedo ir a la velocidad que me da
 * la gana por la pista después de un aterrizaje.» Y el freno tiene que seguir
 * ahí: **en un aterrizaje no hay V1** —V1 es el punto en el que ya no se puede
 * abortar un despegue, y después de tomar tierra no hay nada que abortar—.
 */
if (CON_TOPE) {
  const traLaToma = await page.evaluate(async () => {
    const o = globalThis.__oga;
    const c = o.controles();
    const antes = o.estado().airspeed;
    c.brakes = 0;
    c.throttle = 1;
    let punta = 0;
    let sinFreno = false;
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 100));
      punta = Math.max(punta, o.estado().airspeed);
      sinFreno ||= !!document.querySelector('[data-hud="brakes-touch"]')
        ?.hidden;
    }
    c.throttle = 0;
    c.brakes = 1;
    return { antes, punta, sinFreno, fase: o.fase() };
  });
  comprobar(
    "acelerar tras tomar tierra no relanza el avión",
    traLaToma.punta <= traLaToma.antes + 1,
    `de ${traLaToma.antes.toFixed(0)} a ${traLaToma.punta.toFixed(0)} m/s con el gas a fondo, fase «${traLaToma.fase}»`,
    "«puedo ir a la velocidad que me da la gana por la pista tras aterrizar»",
  );
  comprobar(
    "y el freno no se va: en un aterrizaje no hay V1",
    !traLaToma.sinFreno,
    traLaToma.sinFreno ? "se escondió" : "sigue ahí",
    "«me marca V1 cuando debería decirme que bajara la velocidad»",
  );
}

if (CON_SIGUEME) {
  comprobar(
    "el sígame espera en la salida mientras se frena",
    // Por delante **y fuera del eje**: si está en el eje es que va bajando la
    // pista corriendo delante de un avión que aterriza, que no lo hace nadie.
    // Cuarenta metros fuera del eje: **dentro de la calle**, no en el borde.
    // Medido, el primer intento lo dejaba a veinticinco —dos metros y medio
    // pasada la raya—, o sea justo donde lo alcanza el avión que frena.
    !!enPista.coche && enPista.coche.delante > 0 && enPista.coche.fuera > 40,
    enPista.coche
      ? `a ${enPista.coche.delante.toFixed(0)} m por delante, ${enPista.coche.fuera.toFixed(0)} m del eje`
      : "no está",
    "«se ve bien, pero desaparece en la pista de aterrizaje»",
  );
}
comprobar(
  "y la tarjeta pide frenar con su tecla",
  enPista.tarjeta === "freno",
  `tarjeta «${enPista.tarjeta || "ninguna"}»`,
  "al tocar tierra no salía ninguna tarjeta durante seis segundos",
);

// ── El veredicto de la toma ───────────────────────────────────────────────

const veredicto = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const s = o.estado();
  const u = globalThis.__umbral;
  const h = s.heading;
  const ux = Math.sin(h);
  const uz = -Math.cos(h);
  // Otra toma, para cronometrar cuánto tarda en decir algo.
  s.position.x = u.x - ux * 30;
  s.position.z = u.z - uz * 30;
  s.position.y = u.y + 30;
  await new Promise((r) => setTimeout(r, 500));
  s.position.y = u.y + 1.3;
  s.position.x = u.x + ux * 200;
  s.position.z = u.z + uz * 200;
  const t0 = performance.now();
  const hint = document.querySelector('[data-hud="hint"]');
  let segundos = Infinity;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if (hint?.textContent) {
      segundos = (performance.now() - t0) / 1000;
      break;
    }
  }
  return { segundos };
});
comprobar(
  "el veredicto de la toma llega enseguida",
  veredicto.segundos < 4,
  `${veredicto.segundos === Infinity ? "nunca" : veredicto.segundos.toFixed(1) + " s"}`,
  "esperaba a bajar de velocidad de rodaje: 54 s y 1129 m después de tocar",
);

// ── El rodaje de vuelta y el puesto ───────────────────────────────────────

const alFinal = await page.evaluate(async () => {
  const o = globalThis.__oga;
  /*
   * **Primero se aterriza, y después se mide el camino a casa.**
   *
   * Esta sección heredaba el avión de la prueba anterior —que lo estrella en
   * un descampado a propósito, para ver el veredicto— y desde ahí puede no
   * haber ruta a ninguna parte: el buscador engancha a seiscientos metros y en
   * mitad del campo no llega. Cuando eso pasaba, las tres comprobaciones de
   * aquí abajo salían en rojo hablando de la cinta, del señalero y de la
   * llave, que no tenían nada que ver.
   *
   * Así que se pone el avión donde estaría de verdad: en la pista, ochocientos
   * metros pasado el umbral y a paso de rodaje, que es de donde sale el camino
   * al puesto.
   */
  const p = o.puntoDeFinal(-800);
  o.colocar(p.x, o.suelo(p.x, p.z) + 1.3, p.z, 6, p.h);
  for (let i = 0; i < 40 && o.ruta().length < 2; i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  const ruta = o.ruta();
  if (ruta.length < 2) return { sinRuta: true };
  const s = o.estado();
  // Se recorre la ruta a saltos, como si se rodara por ella.
  let cintaRodando = null;
  for (let i = 0; i < ruta.length; i++) {
    const [x, z] = ruta[i];
    s.position.x = x;
    s.position.z = z;
    s.position.y = o.suelo(x, z) + 1.3;
    // La cinta se mide **rodando**, que es cuando existe: al llegar al puesto
    // la ruta se borra a propósito, porque ya no queda camino.
    if (i === Math.floor(ruta.length * 0.6)) {
      cintaRodando = o.cintaGuia()?.sobreElSuelo ?? null;
    }
    await new Promise((r) => setTimeout(r, 45));
  }
  /*
   * Y al llegar, **parado de verdad**. Colocar el avión no le quita la
   * velocidad: seguía a treinta metros por segundo encima del puesto, así que
   * la máquina de fases nunca daba el vuelo por terminado y esta comprobación
   * fallaba por estar mal montada, no por el juego.
   */
  const mandos = o.controles();
  mandos.throttle = 0;
  mandos.brakes = 1;
  // Parado de verdad, por el modelo. Ver `__oga.colocar`.
  const fin = ruta[ruta.length - 1];
  o.colocar(fin[0], o.suelo(fin[0], fin[1]) + 1.3, fin[1], 0);
  await new Promise((r) => setTimeout(r, 2000));
  const raiz = globalThis.__raiz;
  const coche = raiz.getObjectByName("sigueme");
  const senalero = raiz.getObjectByName("senalero");
  const dibujo =
    document.querySelector('[data-hud="senal-dibujo"]')?.innerHTML ?? "";
  return {
    fase: `${o.fase()} av=${globalThis.__av ?? 0}`,
    cinta: cintaRodando,
    cocheVisible: !!coche?.visible,
    senaleroVisible: !!senalero?.visible,
    senaleroDistancia: senalero
      ? Math.hypot(
          senalero.position.x - s.position.x,
          senalero.position.z - s.position.z,
        )
      : Infinity,
    // La llave lleva un círculo con un hueco; el señalero, una figura con brazos.
    pideApagar: dibujo.includes("senal__hueco"),
    dibujo: dibujo.slice(0, 40),
    v: o.estado().airspeed.toFixed(1),
    restante: o.cintaGuia() ? "hay ruta" : "sin ruta",
  };
});

comprobar(
  "la cinta guía se ve sobre el suelo",
  typeof alFinal.cinta === "number" && alFinal.cinta > 0 && alFinal.cinta < 1.5,
  // Y si no hay ruta, se dice: antes esto reventaba el guion entero con un
  // «no se puede leer toFixed de undefined», que no explica nada.
  typeof alFinal.cinta === "number"
    ? `${alFinal.cinta.toFixed(2)} m`
    : alFinal.sinRuta
      ? "el plan no tenía ruta que medir"
      : "no hay cinta",
  "sus cotas van horneadas y cualquier cambio del suelo la entierra",
);
comprobar(
  "el señalero está a la vista al llegar",
  alFinal.senaleroVisible && alFinal.senaleroDistancia < 60,
  `${alFinal.senaleroVisible ? alFinal.senaleroDistancia.toFixed(0) + " m" : "no se ve"}`,
  "«señor de los bastones, ¿qué señor?»: medía treinta píxeles",
);
comprobar(
  "y al parar, la pantalla dice apagar el motor",
  alFinal.pideApagar,
  alFinal.pideApagar ? "la llave" : `fase «${alFinal.fase}», v=${alFinal.v}`,
  "la tarjeta del gesto del señalero se quedaba puesta y tapaba la llave",
);

/*
 * **Y al apagar, el vuelo termina diciendo qué te llevás.**
 *
 * «Se echa en falta un reconocimiento en función de los galones logrados»: se
 * ganaban uno a uno con su sonido y al apagar el motor no pasaba nada.
 */
const final = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const antes = o.galones().length;
  o.controles().engineOn = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if (o.finDeVuelo()) break;
  }
  const puesta = o.finDeVuelo();
  /*
   * Y se vuelve a arrancar: lo que viene detrás en este banco necesita un
   * avión vivo, y con el motor parado la máquina de fases da el vuelo por
   * cerrado y el señalero deja de señalar.
   */
  o.controles().engineOn = true;
  await new Promise((r) => setTimeout(r, 600));
  return { puesta, galones: antes, fase: o.fase() };
});
comprobar(
  "y al apagar el motor hay reconocimiento",
  final.puesta,
  final.puesta ? `con ${final.galones} galones` : `nada, fase «${final.fase}»`,
  "el vuelo terminaba como termina una pestaña que se cierra",
);

/*
 * **Y se puede salir de ahí.** «Vale, pero habrá que salir de aquí»: el HUD
 * entero deja pasar el puntero para no comerse los clics del mundo, así que la
 * pantalla del final no recibía ni uno. Se veía perfecta y no se cerraba.
 */
if (final.puesta) {
  await page.click('[data-hud="fin"]', { position: { x: 40, y: 40 } });
  await page.waitForTimeout(300);
  const cerrada = await page.evaluate(() => !globalThis.__oga.finDeVuelo());
  comprobar(
    "y se puede salir de esa pantalla",
    cerrada,
    cerrada ? "se cierra al tocarla" : "no se cierra ni tocándola",
    "«vale, pero habrá que salir de aquí»: el HUD no dejaba pasar el clic",
  );
}

// ── Y que al señalero no se le atropella ──────────────────────────────────

/*
 * «Lo atropello sin problemas.» Y era verdad: se quedaba clavado en su sitio.
 *
 * La respuesta no es una caja de colisión —un avión que choca contra una
 * persona no se le enseña a nadie de cuatro años, y castigar por ello tampoco—
 * sino la de la plataforma de verdad: el señalero ve venir el avión y se
 * quita, andando y con el alto en la mano.
 *
 * La lógica ya tiene sus pruebas; lo que se comprueba aquí es **el cableado**:
 * que el juego le pasa dónde está el avión y a qué velocidad va, y que la
 * figura del mundo se mueve de verdad.
 */
const senalero = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const figura = globalThis.__raiz.getObjectByName("senalero");
  if (!figura) return { sinSenalero: true };
  const antes = { x: figura.position.x, z: figura.position.z };
  const c = o.controles();
  c.brakes = 0;
  c.throttle = 0.4;
  let pidioDespacio = false;
  for (let i = 0; i < 26; i++) {
    /*
     * El avión, encima de él y **sin dejar de estarlo**. Se ponía una vez y
     * salía rodando, así que a veces se alejaba antes de que al señalero le
     * diera tiempo a apartarse del todo y la medida salía distinta cada vez:
     * 3,1 m, 8,5 m, 2,8 m. Lo que se quiere probar es que se quita cuando le
     * vienen encima, no cuánto tarda un avión en irse solo.
     */
    o.colocar(antes.x, o.suelo(antes.x, antes.z) + 1.3, antes.z, 6);
    await new Promise((r) => setTimeout(r, 100));
    pidioDespacio ||= o.tarjeta().dibujo.startsWith("senalero-");
  }
  const seFue = Math.hypot(
    figura.position.x - antes.x,
    figura.position.z - antes.z,
  );
  c.throttle = 0;
  c.brakes = 1;
  return { seFue, pidioDespacio };
});
if (!senalero.sinSenalero) {
  comprobar(
    "el señalero se quita de en medio",
    senalero.seFue > 6,
    `se apartó ${senalero.seFue.toFixed(1)} m`,
    "«lo atropello sin problemas»: se quedaba clavado dejándose pasar por encima",
  );
  comprobar(
    "y lo dice con los bastones antes de tener que quitarse",
    senalero.pidioDespacio,
    senalero.pidioDespacio ? "señaló" : "no señaló nada",
    "ir a por él a toda velocidad no tenía quien lo avisara",
  );
}

// ── La ciudad ─────────────────────────────────────────────────────────────

const ciudad = await page.evaluate(() => {
  const o = globalThis.__oga;
  const vias = o.vias().filter((v) => v.nivel <= 2);
  if (!vias.length) return { sinCiudad: true };
  const casas = [];
  globalThis.__raiz.getObjectByName("ciudad")?.traverse((n) => {
    if (!n.isInstancedMesh) return;
    const a = n.instanceMatrix.array;
    for (let i = 0; i < n.count; i++) {
      // Del mundo al fichero: el norte del fichero es la Z negativa.
      casas.push([a[i * 16 + 12], -a[i * 16 + 14]]);
    }
  });
  // Distancia de cada casa al viario ancho, por fuerza bruta sobre una
  // muestra: mirar cuarenta mil casas contra dos mil tramos aquí sería eterno.
  const muestra = casas.filter((_, i) => i % 17 === 0);
  const anchos = [22, 18, 13];
  let encima = 0;
  for (const [cx, cy] of muestra) {
    for (const via of vias) {
      const semi = anchos[via.nivel] / 2;
      let cerca = false;
      for (let i = 0; i < via.puntos.length - 1 && !cerca; i++) {
        const [ax, ay] = via.puntos[i];
        const [bx, by] = via.puntos[i + 1];
        const dx = bx - ax;
        const dy = by - ay;
        const l2 = dx * dx + dy * dy;
        if (l2 < 1) continue;
        const t = Math.max(
          0,
          Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / l2),
        );
        const d = Math.hypot(cx - (ax + dx * t), cy - (ay + dy * t));
        if (d < semi) cerca = true;
      }
      if (cerca) {
        encima++;
        break;
      }
    }
  }
  return { muestra: muestra.length, encima };
});
if (!ciudad.sinCiudad) {
  comprobar(
    "no hay casas plantadas sobre las autovías",
    ciudad.encima === 0,
    `${ciudad.encima} de ${ciudad.muestra} casas de la muestra`,
    "la ciudad se siembra por densidad y no sabía nada del viario",
  );
}

// ── Y lo que no puede pasar en una calle de rodaje ────────────────────────

const enCalle = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const s = o.estado();
  /*
   * Un punto de la ruta **que esté fuera de la pista**, que es de lo que va
   * esta comprobación. El primer intento cogía el punto de en medio y en
   * Tenerife ese cae todavía sobre el asfalto: la prueba fallaba por estar mal
   * planteada, no por el juego.
   */
  const pista = o.pista();
  const h = (pista.heading * Math.PI) / 180;
  const fueraDePista = ([x, z]) => {
    const dx = x - pista.x;
    const dz = z - pista.z;
    const along = dx * Math.sin(h) - dz * Math.cos(h);
    const across = dx * Math.cos(h) + dz * Math.sin(h);
    return Math.abs(across) > pista.width || Math.abs(along) > pista.length / 2;
  };
  const enCalle = o.ruta().filter(fueraDePista);
  const donde = enCalle[Math.floor(enCalle.length / 2)];
  if (donde) {
    o.colocar(donde[0], o.suelo(donde[0], donde[1]) + 1.3, donde[1], 0);
  }
  /*
   * **Se acelera de verdad, no se teletransporta a velocidad.** Poner el
   * avión a treinta metros por segundo de golpe lo deja en el aire un
   * instante, y en el aire el botón del freno se esconde con razón. Aquí lo
   * que se prueba es rodar rápido por una calle, así que se rueda.
   */
  const c = o.controles();
  c.brakes = 0;
  c.throttle = 1;
  /*
   * Y de paso se mira **si el juego dice algo**. «La velocidad en tierra por
   * pista de rodadura la puedo acelerar a tope, debería haber un aviso de
   * prudencia»: acelerar a fondo por una calle de rodaje es de las cosas que
   * un aeropuerto no perdona, y el juego se lo callaba.
   */
  let avisoA = 0;
  let punta = 0;
  for (let i = 0; i < 70; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const v = o.estado().airspeed;
    punta = Math.max(punta, v);
    if (!avisoA && o.tarjeta().dibujo === "freno") avisoA = v;
  }
  const freno = document.querySelector('[data-hud="brakes-touch"]');
  return {
    frenoEscondido: !!freno?.hidden,
    v: o.estado().airspeed,
    punta,
    avisoA,
    enPista: o.estado().onRunway,
  };
});
comprobar(
  "el freno no desaparece por acelerar fuera de la pista",
  !enCalle.frenoEscondido,
  enCalle.frenoEscondido
    ? `se escondió (onRunway=${enCalle.enPista}, v=${enCalle.v.toFixed(0)})`
    : "sigue ahí",
  "«si acelero me quita la mano como para que pueda despegar sobre la R»",
);
if (CON_TOPE)
  comprobar(
    "y a todo gas por una calle el avión no se dispara",
    /*
     * **Y esto mide el tope, no el aviso.** Antes se comprobaba que saliera la
     * tarjeta de «más despacio», y ese era el arreglo pequeño: un aviso que se
     * puede ignorar sin consecuencia no es una regla, es una opinión. Ahora la
     * consecuencia es que el avión no va más rápido, así que lo que hay que
     * medir es la velocidad.
     *
     * Doce metros por segundo: velocidad de rodaje con su holgura y un poco más.
     * Sin tope, siete segundos de gas a fondo por una calle daban veintisiete.
     */
    enCalle.punta < 12,
    `punta ${enCalle.punta.toFixed(1)} m/s con el gas a fondo`,
    "«la puedo acelerar a tope, y puedo adelantar al coche del sígame»",
  );

// ── Chocar contra la ciudad ───────────────────────────────────────────────

/*
 * «Aterricé sobre la facultad de Biología, atravesé la de Farmacia, crucé San
 * Francisco de Paula.» Hasta que existió esto, **lo único que paraba el avión
 * era el suelo**: la ciudad entera se atravesaba.
 *
 * Y lo que tiene que pasar al chocar **no es lo mismo en los cuatro
 * peldaños**, así que esto comprueba las dos respuestas a la vez: o el avión
 * se rompe —de Tukã para arriba— o el mundo se lo impide —en Guyrami—. Lo
 * que no puede es pasar de largo.
 */
const bulto = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

  // El edificio más alto que haya, que es el más fácil de apuntar.
  const casas = [];
  globalThis.__raiz.getObjectByName("ciudad")?.traverse((n) => {
    if (!n.isInstancedMesh) return;
    const a = n.instanceMatrix.array;
    for (let i = 0; i < n.count; i++) {
      const m = a.slice(i * 16, i * 16 + 16);
      casas.push({
        x: m[12],
        y: m[13],
        z: m[14],
        sx: Math.hypot(m[0], m[1], m[2]),
        sy: Math.hypot(m[4], m[5], m[6]),
        sz: Math.hypot(m[8], m[9], m[10]),
      });
    }
  });
  if (!casas.length) return { sinCiudad: true };
  casas.sort(
    (a, b) => b.sy * Math.min(b.sx, b.sz) - a.sy * Math.min(a.sx, a.sz),
  );
  const casa = casas[0];
  const semi = Math.max(casa.sx, casa.sz) / 2;

  // Se apunta con el rumbo que ya lleva el avión: se le pone el edificio
  // delante, no se le gira la cabeza.
  const h = o.estado().heading;
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  const LEJOS = 110;
  o.colocar(casa.x - fx * LEJOS, casa.y, casa.z - fz * LEJOS, 38);

  const c = o.controles();
  c.aileron = 0;
  c.brakes = 0;
  c.throttle = 0.7;

  let roto = false;
  let avisoA = 0;
  let cerca = Infinity;
  let masAlla = -Infinity;
  let quieto = 0;
  let dentro = 0;
  let antes = -LEJOS;
  const laTarjeta = () =>
    (
      document.querySelector('[data-hud="senal-dibujo"]')?.innerHTML ?? ""
    ).includes("M4 21 V6");
  for (let i = 0; i < 240; i++) {
    /*
     * Un piloto automático de altura de tres líneas. No es adorno: sin él, lo
     * que se estaría midiendo es si el avión aguanta el nivel cinco segundos,
     * que es otra prueba y ya tiene la suya. Aquí lo que se mira es si la
     * ciudad para al avión.
     */
    const s = o.estado();
    c.elevator = Math.max(-0.6, Math.min(0.6, (casa.y - s.position.y) * 0.08));
    await dormir(50);
    const dx = s.position.x - casa.x;
    const dz = s.position.z - casa.z;
    const along = dx * fx + dz * fz;
    const d = Math.hypot(dx, dz);
    cerca = Math.min(cerca, d);
    masAlla = Math.max(masAlla, along);
    roto ||= s.crashed;
    // **Dentro de un edificio, ni un fotograma.** Es la forma honesta de decir
    // «no lo atraviesa» ahora que en este peldaño se sale por encima del
    // tejado: mirar si avanzó no vale, porque pasar por encima es avanzar.
    if (o.bultos().choca(s.position.x, s.position.y, s.position.z)) dentro++;
    // A qué distancia del edificio salió el aviso por primera vez. «Ni me
    // avisó»: el aviso tiene que llegar con sitio para girar, no al chocar.
    if (!avisoA && laTarjeta()) avisoA = d;
    // Parado contra la pared: el avión deja de avanzar y ahí se queda.
    quieto = along - antes < 0.5 ? quieto + 1 : 0;
    antes = along;
    if (roto || along > semi || quieto > 30) break;
  }

  /*
   * **Y ahora lo que faltaba: que se pueda salir.**
   *
   * «No puedo zafarme de ahí, estoy atrapado.» El primer intento devolvía el
   * avión al fotograma anterior en cada paso, y eso no es una pared, es una
   * trampa. Aquí se gira y se sube, que es lo que haría cualquiera, y se mira
   * si el avión se aleja de verdad.
   */
  const dondeQuedo = (() => {
    const s = o.estado();
    return Math.hypot(s.position.x - casa.x, s.position.z - casa.z);
  })();
  let escape = 0;
  if (!roto) {
    c.throttle = 1;
    c.aileron = 1;
    c.elevator = 0.3;
    for (let i = 0; i < 200; i++) {
      await dormir(50);
      const s = o.estado();
      escape = Math.max(
        escape,
        Math.hypot(s.position.x - casa.x, s.position.z - casa.z) - dondeQuedo,
      );
      if (escape > 120) break;
    }
  }
  c.throttle = 0;
  c.elevator = 0;
  c.aileron = 0;
  return {
    roto,
    avisoA,
    cerca,
    masAlla,
    semi,
    escape,
    dentro,
    alto: casa.sy,
  };
});

if (!bulto.sinCiudad) {
  comprobar(
    "el avión llega hasta el edificio",
    bulto.cerca < 70,
    `se quedó a ${bulto.cerca.toFixed(0)} m del centro de un bloque de ${bulto.alto.toFixed(0)} m`,
    "sin llegar, esta prueba pasaría sola y no estaría probando nada",
  );
  comprobar(
    "avisa antes, con sitio para girar",
    bulto.avisoA > bulto.semi + 20,
    bulto.avisoA
      ? `avisó a ${bulto.avisoA.toFixed(0)} m del centro (el bloque mide ${bulto.semi.toFixed(0)} de semiancho)`
      : "no avisó",
    "«ni me avisó»: solo hablaba con el avión ya metido dentro",
  );
  comprobar(
    "y no lo atraviesa",
    bulto.roto || bulto.dentro === 0,
    bulto.roto
      ? "se rompió, que es lo que toca en este peldaño"
      : `${bulto.dentro} fotogramas dentro del edificio`,
    "«aterricé sobre la facultad de Biología, atravesé la de Farmacia»",
  );
  if (!bulto.roto) {
    comprobar(
      "y se puede salir de ahí",
      bulto.escape > 60,
      `se alejó ${bulto.escape.toFixed(0)} m girando`,
      "«no puedo zafarme de ahí, estoy atrapado»: la pared encerraba",
    );
  }
}

// ── Aterrizar donde no es ────────────────────────────────────────────────

/*
 * **El peor final posible era el único sin dibujo.**
 *
 * El veredicto decía «aterrizaste fuera de la pista» con un texto y una voz, y
 * en el peldaño de los cuatro años no hay nadie que lea el texto. Se grabó un
 * vuelo que se posó en un descampado del pueblo y la pantalla no enseñó nada
 * distinto de un aterrizaje bueno.
 */
const enElCampo = CON_TOPE
  ? await page.evaluate(async () => {
      const o = globalThis.__oga;
      const u = globalThis.__umbral;
      const s = o.estado();
      const h = s.heading;
      const ux = Math.sin(h);
      const uz = -Math.cos(h);
      // Al lado de la pista, bien fuera del asfalto, y posado.
      const lat = 220;
      const x = u.x + ux * 400 - uz * lat;
      const z = u.z + uz * 400 + ux * lat;
      /*
       * **Y se aterriza de verdad, no se aparece en la hierba.**
       *
       * El veredicto de la toma nace de ver pasar el avión de volando a posado, y
       * un teletransporte al suelo no es eso: la prueba dependía de que la sección
       * anterior lo hubiera dejado volando —o sea, de la suerte—. Así que se le
       * pone en el aire sobre el campo, se le quita el gas y se le deja caer.
       */
      const c = o.controles();
      c.aileron = 0;
      c.elevator = 0;
      c.brakes = 0;
      c.throttle = 0;
      /*
       * Tres metros y a velocidad de aproximación: **lo justo para que sea una
       * toma y no un golpe**. Desde veinticinco el modelo de coeficientes llegaba
       * al suelo a doce metros por segundo de caída, el avión se rompía y entonces
       * no hay veredicto que dar — la prueba medía un accidente. Desde ocho,
       * todavía. El límite de este peldaño anda por los once y medio.
       */
      o.colocar(x, o.suelo(x, z) + 3, z, 26);
      let tarjeta = "";
      for (let i = 0; i < 140; i++) {
        await new Promise((r) => setTimeout(r, 100));
        if (o.tarjeta().dibujo === "fuera") {
          tarjeta = "fuera";
          break;
        }
      }
      return {
        tarjeta,
        ultima: o.tarjeta().dibujo,
        enPista: o.estado().onRunway,
      };
    })
  : null;
/*
 * **Y solo en los peldaños de abajo**, que es donde el guion sabe posarse en
 * la hierba de verdad. Con el modelo de coeficientes, dejar el avión caer en
 * un descampado a velocidad de aproximación acaba en accidente —y un avión
 * roto no tiene veredicto de toma que dar—, así que lo que se estaría midiendo
 * ahí es la pericia del guion, no el dibujo. El dibujo es el mismo en los
 * cuatro peldaños; lo que cambia es lo que sabe hacer esta prueba.
 */
if (enElCampo)
  comprobar(
    "aterrizar fuera de la pista se ve, no solo se lee",
    enElCampo.tarjeta === "fuera",
    enElCampo.tarjeta
      ? "sale su dibujo: la pista, y el avión al lado"
      : `tarjeta «${enElCampo.ultima || "ninguna"}», onRunway=${enElCampo.enPista}`,
    "el peor final posible era el único sin dibujo, y a los cuatro años no se lee",
  );

// ── Y que la ruta de vuelta se pueda seguir de verdad ────────────────────

/*
 * **Rodando, no teletransportando.**
 *
 * El banco recorría la ruta de vuelta poniendo el avión en cada punto, que
 * comprueba que la ruta existe pero no que se pueda seguir. Y lo que se dijo
 * jugando es justo lo otro: «se pasa un poco de frenada y tengo que girar
 * antes si quiero entrar bien» en la salida A4.
 *
 * Es además la promesa entera del peldaño de los pequeños (#145): a los cuatro
 * años nadie hila dos kilómetros de calle de rodaje, así que la raya tiene que
 * poder seguirse: quien gira hacia ella llega, sin pelearse con el avión. Lo
 * que **no** hace el juego es girar por vos. Ver `flight/tiers.ts`.
 *
 * Con el gas a fondo a propósito, que es lo que hace quien tiene cuatro años:
 * el tope de rodaje es quien decide la velocidad. Ver `flight/gobernador.ts`.
 */
if (CON_TOPE) {
  const deVuelta = await page.evaluate(async () => {
    const o = globalThis.__oga;
    const u = globalThis.__umbral;
    /*
     * **El rumbo de la pista, no el que trajera el avión.**
     *
     * Esto decía `const h = o.estado().heading`, y con eso los novecientos
     * metros «pista adelante» salían en la dirección en la que el morro
     * hubiera quedado al acabar la prueba anterior — de lado, mirando al
     * campo. El avión aparecía fuera del eje y atravesado, y lo que se medía
     * después no era seguir la raya de la salida: era enderezar un atravesado
     * que nadie había hecho. Medido: veintisiete metros de separación y
     * ochenta y cuatro de avance, con el timón haciendo lo correcto todo el
     * rato.
     */
    const h = (o.pista().heading * Math.PI) / 180;
    const ux = Math.sin(h);
    const uz = -Math.cos(h);
    /*
     * Posado en el eje y **ya a velocidad de rodaje**, que es lo que se está
     * probando: el camino a casa. A nueve metros por segundo la fase sigue
     * siendo la carrera de aterrizaje —que no lleva tope a propósito— y con el
     * gas a fondo el avión volvía a despegar: treinta y siete metros por
     * segundo y sesenta y tres metros fuera de la raya. No era un fallo del
     * rodaje: era una prueba que empezaba antes de que hubiera rodaje.
     */
    /*
     * Y **mirando por donde se rueda**, que es la mitad de estar posado en el
     * eje. Sin el rumbo, el avión se quedaba con el morro donde lo hubiera
     * dejado la prueba anterior —de lado, mirando al campo— y lo que se medía
     * después no era seguir la raya de la salida: era enderezar un atravesado
     * que nadie había hecho. Medido: treinta metros de separación y ciento
     * treinta de avance, con el timón haciendo lo correcto todo el rato.
     */
    o.colocar(
      u.x + ux * 900,
      o.suelo(u.x + ux * 900, u.z + uz * 900) + 1.3,
      u.z + uz * 900,
      6,
      h,
    );
    await new Promise((r) => setTimeout(r, 2500));

    const c = o.controles();
    /*
     * **Con el timón en la mano**, que es la promesa de ahora.
     *
     * Esta prueba nació al revés: el alerón a cero y a ver si el juego llevaba
     * el avión hasta casa. Y lo llevaba, porque la ayuda de rodaje estaba a
     * tope — o sea, conducía. «Aquí también pusieron imanes, no tiene mucho
     * sentido que el juego conduzca por el jugador. Y si todo se hace solo,
     * vaya aburrimiento.»
     *
     * Así que lo que hay que medir es lo otro: que **la raya se pueda seguir**
     * — que quien gira hacia ella llegue sin pelearse con el avión. El piloto
     * mira quince metros por delante y gira, igual que en el banco de
     * despegue; si con eso no se queda en la calle, la culpa es del juego.
     */
    c.elevator = 0;
    c.brakes = 0;
    const MIRA = 15;
    const timon = (st, ruta) => {
      if (!ruta.length) return 0;
      let cerca = 0;
      let mejor = Infinity;
      for (let i = 0; i < ruta.length; i++) {
        const d = Math.hypot(
          ruta[i][0] - st.position.x,
          ruta[i][1] - st.position.z,
        );
        if (d < mejor) {
          mejor = d;
          cerca = i;
        }
      }
      let mira = ruta[ruta.length - 1];
      for (let i = cerca; i < ruta.length; i++) {
        const d = Math.hypot(
          ruta[i][0] - st.position.x,
          ruta[i][1] - st.position.z,
        );
        if (d > MIRA) {
          mira = ruta[i];
          break;
        }
      }
      const rumbo = Math.atan2(
        mira[0] - st.position.x,
        -(mira[1] - st.position.z),
      );
      let e = rumbo - st.heading;
      while (e > Math.PI) e -= 2 * Math.PI;
      while (e < -Math.PI) e += 2 * Math.PI;
      return { mando: Math.max(-1, Math.min(1, e * 2)), error: e };
    };
    // Lo último que pidió el timón, para aflojar el gas en la curva.
    let giro = 0;

    /** Lo lejos que se está de la raya, en metros. */
    const aLaRaya = (x, z, ruta) => {
      let mejor = Infinity;
      for (let i = 0; i < ruta.length - 1; i++) {
        const [ax, ay] = ruta[i];
        const [bx, by] = ruta[i + 1];
        const dx = bx - ax;
        const dy = by - ay;
        const l2 = dx * dx + dy * dy;
        if (l2 < 1) continue;
        const t = Math.max(
          0,
          Math.min(1, ((x - ax) * dx + (z - ay) * dy) / l2),
        );
        mejor = Math.min(
          mejor,
          Math.hypot(x - (ax + dx * t), z - (ay + dy * t)),
        );
      }
      return mejor;
    };

    let lejos = 0;
    let punta = 0;
    // Cuántas vueltas se dieron de verdad: si la prueba se corta antes de
    // tiempo, el avance sale pequeño sin que el avión tenga la culpa.
    let pasos = 0;
    /** Décimas de segundo sin raya verde que seguir. */
    let sinRaya = 0;
    /*
     * **El avance se mide en metros, no en puntos de ruta.** Contar los puntos
     * que quedan no vale: la ruta se rehace sola según se avanza, así que su
     * longitud no baja de forma ordenada y salía cero aunque el avión hubiera
     * recorrido medio aeropuerto.
     */
    /*
     * **Y el camino se mide sumando pasos, no en línea recta.**
     *
     * Se medía la distancia al punto de partida, y en un aeropuerto eso no
     * mide avanzar: se sale de la pista, se da la vuelta y se vuelve por la
     * calle paralela, que va **al lado** de la pista. El avión recorría medio
     * kilómetro y la prueba veía ciento diecinueve metros — y llamaba a eso
     * «se queda dando vueltas».
     */
    let antes = {
      x: o.estado().position.x,
      z: o.estado().position.z,
    };
    let avance = 0;
    for (let i = 0; i < 600; i++) {
      /*
       * La velocidad la sostiene la prueba, y no el gas a fondo, **porque en
       * la pista no hay tope a propósito**: ahí un avión va rápido porque
       * tiene que ir rápido, así que con el gas clavado el avión volvía a
       * despegar y lo que se medía era un despegue. Lo que se prueba aquí es
       * la dirección; del tope se ocupa su propia comprobación.
       */
      /*
       * **Y se afloja para girar.** La salida de una pista es una horquilla:
       * se rueda pista adelante y se vuelve por la calle paralela, así que hay
       * un momento de más de noventa grados. Tomarlo a velocidad de rodaje es
       * pasarse, y eso es exactamente lo que se dijo jugando —«se pasa un poco
       * de frenada y tengo que girar antes si quiero entrar bien»—. Quien
       * conduce afloja antes de la curva; el banco también.
       */
      const v = o.estado().airspeed;
      const quiere = giro > 0.5 ? 4 : 9;
      c.throttle = v < quiere ? 0.4 : 0;
      c.brakes = v > quiere * 1.6 ? 1 : 0;
      await new Promise((r) => setTimeout(r, 100));
      const st = o.estado();
      punta = Math.max(punta, st.airspeed);
      const ruta = o.ruta();
      /*
       * **Sin raya no se sale del bucle: se apunta.**
       *
       * Antes, quedarse sin raya cortaba la prueba y el banco daba por bueno
       * lo poco que hubiera medido. Y quedarse sin raya es exactamente lo que
       * se vio jugando: «cuando doy el giro dejo de ver la línea verde… la
       * línea verde había desaparecido hasta A3».
       */
      if (ruta.length < 2) {
        sinRaya += 1;
        continue;
      }
      const t = timon(st, ruta);
      c.aileron = t.mando;
      giro = Math.abs(t.error);
      lejos = Math.max(lejos, aLaRaya(st.position.x, st.position.z, ruta));
      avance += Math.hypot(st.position.x - antes.x, st.position.z - antes.z);
      antes = { x: st.position.x, z: st.position.z };
      pasos = i + 1;
      if (lejos > 60) break;
    }
    c.throttle = 0;
    c.brakes = 1;
    return { lejos, punta, avance, fase: o.fase(), pasos, sinRaya };
  });
  comprobar(
    "siguiendo la raya con el timón, el avión se queda en la raya",
    /*
     * Veinte metros: el ancho de una calle de rodaje con su margen. Más que
     * eso ya no es ir por la raya, es ir por el campo de al lado.
     */
    deVuelta.lejos < 20,
    `se separó ${deVuelta.lejos.toFixed(0)} m de la raya como mucho, a ${deVuelta.punta.toFixed(1)} m/s de punta`,
    "«se pasa un poco de frenada y tengo que girar antes si quiero entrar bien»",
  );
  comprobar(
    "y la raya verde no se pierde por el camino",
    deVuelta.sinRaya === 0,
    deVuelta.sinRaya
      ? `${(deVuelta.sinRaya / 10).toFixed(1)} s sin raya`
      : "raya puesta todo el rato",
    "«cuando doy el giro dejo de ver la línea verde… había desaparecido hasta A3»",
  );
  comprobar(
    "y avanza de verdad, no se queda dando vueltas",
    // Trescientos metros de camino: la salida de la pista y un buen trozo de
    // la calle de vuelta. Menos que eso es haberse quedado en la boca.
    deVuelta.avance > 300,
    `recorrió ${deVuelta.avance.toFixed(0)} m de camino en ${(deVuelta.pasos / 10).toFixed(0)} s, fase «${deVuelta.fase}»`,
    "la ayuda daba una pirueta en la boca de la salida y el avión no avanzaba",
  );
}

// ── Cruzando el umbral ────────────────────────────────────────────────────

/*
 * **Lo que hay que decir cuando ya solo queda aterrizar**, y lo que no.
 *
 * Las dos cosas se vieron en el mismo vuelo y son la misma: «eso de que me
 * avise que voy a *terrain* cuando ya estoy sobre la cabecera de la pista. No
 * me indica lo contrario, que ya debo tomar tierra».
 */
const umbral = await page.evaluate(async () => {
  const o = globalThis.__oga;
  /*
   * **Colocado con el rumbo de la pista, no con el que trajera el avión.**
   *
   * `poner` mide los metros «antes del umbral» en la dirección del morro, y
   * después de las pruebas anteriores el morro mira donde mira: el avión
   * aparecía a doscientos metros del umbral pero de lado, y el juego —con toda
   * la razón— no decía que se pudiera tocar nada. `puntoDeFinal` sabe cuál es
   * la cabecera en uso y devuelve el punto y el rumbo, que es lo que hace
   * falta: en Silvio Pettirossi, restar a ojo en la dirección de la pista
   * ponía el avión pasado el otro extremo, aterrizando en el campo.
   */
  /*
   * **Primero se sube a volar, y después se entra en final.**
   *
   * Esta comprobación va al final del guion, y para entonces el avión lleva
   * media tarde aterrizando en descampados: la máquina de fases está en
   * «aterrizado» y en pantalla hay un veredicto de toma fuera de pista que no
   * caduca. Colocar el avión no borra nada de eso. Un paso por el aire, alto y
   * lejos, deja la lección donde tiene que estar para poder medir la entrada.
   */
  const alto = o.puntoDeFinal(2500);
  o.colocar(alto.x, globalThis.__umbral.y + 320, alto.z, 34, alto.h);
  await new Promise((r) => setTimeout(r, 1200));
  // Y se espera a que la pantalla quede libre: el veredicto de la toma
  // anterior dura cinco segundos con prioridad de urgencia, y mide lo de
  // antes, no lo de ahora.
  for (let i = 0; i < 70 && o.tarjeta().queda > 0; i++) {
    await new Promise((r) => setTimeout(r, 100));
  }

  const p = o.puntoDeFinal(80);
  o.colocar(p.x, globalThis.__umbral.y + 10, p.z, 30, p.h);
  await new Promise((r) => setTimeout(r, 400));
  const puesto = (() => {
    const e = o.estado();
    const u = globalThis.__umbral;
    return `puesto a ${Math.hypot(e.position.x - u.x, e.position.z - u.z).toFixed(0)} m del umbral, cabecera ${p.cabecera}, enPista ${e.onRunway}`;
  })();
  const c = o.controles();
  c.throttle = 0.35;
  // Un pelo de morro abajo: nivelado se va para arriba —y lo que salta es la
  // tarjeta de la frustrada, que es otra prueba y muy buena— y con mucho se
  // planta en el campo antes de llegar al umbral.
  c.elevator = -0.04;
  let tarjeta = "";
  let terreno = "nada";
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if (o.avisoDeTerreno()) terreno = o.avisoDeTerreno();
    if (o.tarjeta().dibujo === "toma") tarjeta = "toma";
  }
  const s = o.estado();
  return {
    tarjeta,
    terreno,
    ultima: o.tarjeta().dibujo,
    // Para saber por qué, si no sale: altura sobre la pista, caída y suelo.
    como: `${puesto} · alto ${(s.position.y - globalThis.__umbral.y).toFixed(0)} m · vs ${s.verticalSpeed.toFixed(1)} · ${s.onGround ? "posado" : "volando"} · fase ${o.fase()}`,
  };
});
comprobar(
  "cruzando el umbral bajo, el juego dice que ya se puede tocar",
  umbral.tarjeta === "toma",
  umbral.tarjeta
    ? "sale su dibujo: el avión con las ruedas sobre la raya"
    : `tarjeta «${umbral.ultima || "ninguna"}» · ${umbral.como}`,
  "«no me indica lo contrario, que ya debo tomar tierra»",
);
comprobar(
  "y ahí no salta el aviso de terreno, que sería mentir",
  umbral.terreno === "nada",
  umbral.terreno === "nada" ? "callado" : `dijo «${umbral.terreno}»`,
  "«me avisa que voy a terrain cuando ya estoy sobre la cabecera de la pista»",
);

// ── La ciudad delante de la cabecera ──────────────────────────────────────

/*
 * **Nada alto delante del umbral**, que es una norma y no un gusto.
 *
 * «Hay hasta prismas que representan edificaciones altas llegando a la cabecera
 * de pista, eso no ocurre en un aeropuerto. Al menos no existe en el de
 * Tenerife: está prohibido subir de dos plantas de altura en esa zona de
 * influencia del aeródromo.»
 *
 * Se pregunta por el índice de bultos, que es el que sabe dónde hay volumen:
 * se barre el corredor de aproximación a la altura de un tercer piso y no
 * puede haber nada.
 */
const corredor = await page.evaluate(() => {
  const o = globalThis.__oga;
  const bultos = o.bultos();
  const u = globalThis.__umbral;
  // Doce metros sobre la cota de la pista: por encima de dos plantas y su
  // tejado, y muy por debajo de lo que permitiría la superficie de OACI.
  const altura = u.y + 12;
  let choques = 0;
  let donde = "";
  for (let d = 200; d <= 2000; d += 40) {
    const p = o.puntoDeFinal(d);
    if (!p) break;
    // El través del rumbo: si delante es (sen h, −cos h), el costado es
    // (cos h, sen h).
    const ex = Math.cos(p.h);
    const ez = Math.sin(p.h);
    for (let lado = -300; lado <= 300; lado += 30) {
      if (bultos.choca(p.x + ex * lado, altura, p.z + ez * lado)) {
        choques += 1;
        if (!donde) donde = `${d} m del umbral, ${lado} m del eje`;
      }
    }
  }
  return { choques, donde };
});
comprobar(
  "delante de la cabecera no hay nada alto",
  corredor.choques === 0,
  corredor.choques
    ? `${corredor.choques} sondeos con edificio a 12 m, el primero a ${corredor.donde}`
    : "corredor limpio, dos kilómetros",
  "«prismas que representan edificaciones altas llegando a la cabecera»",
);

// ── El informe ────────────────────────────────────────────────────────────

console.log(`\n  ${ESCENARIO} · ${TRAMO}\n`);
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

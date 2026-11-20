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
 * **Y en Taguató Ruvichá, con los pies del vuelo entero** (H44b). La primera
 * tirada en ese peldaño, con el JAZ 90 en Los Rodeos, no despegó: el banco
 * daba gas en cuanto el morro miraba a la pista, a veintisiete metros del eje,
 * y en la carrera solo tenía el mando de alabeo, que sin ayudas y pasados los
 * veintiocho metros por segundo no gira nada. Ahora se alinea como el banco
 * del vuelo entero —por la raya hasta el eje— y fuera de Guyrami lleva la
 * carrera con sus pies: `el-eje-de-la-carrera.mjs`. Y apunta los cantos de
 * cabina de la carrera, que solo suenan en ese peldaño.
 *
 * Uso: `node scripts/verificar-despegue.mjs [escenario] [tramo] [viento] [avión]`
 *
 * El viento va como en el juego —`000/14`, del norte a catorce nudos— y sirve
 * para pedir una cabecera concreta. Sin él manda el tiempo de casa, que es lo
 * que ve quien abre el juego. Hace falta para el **back-taxi**: en Mariscal
 * Estigarribia la maniobra solo aparece con el viento del norte apretando, que
 * es justo cuando merece la pena rodar por la pista. Ver #151.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";
import { elEjeDeLaCarrera } from "./el-eje-de-la-carrera.mjs";

const ESCENARIO = process.argv[2] ?? "tenerife-norte";
const TRAMO = process.argv[3] ?? "guyrami";
const VIENTO = process.argv[4] ?? "";
/*
 * **Y con qué avión**, que es media pregunta de este banco desde que la flota
 * tiene seis. La carrera de despegue del JAZ 120 son mil cuatrocientos metros
 * y la del JAZ 25, ciento treinta: medir siempre con la avioneta es no medir
 * lo único que de verdad puede salir mal, que es el grande en una pista corta.
 */
const AVION = process.argv[5] ?? "jaz-20";
// Uno propio, que otro banco puede estar corriendo a la vez: `OGA_PUERTO` para otro.
const PUERTO = Number(process.env.OGA_PUERTO ?? 5281);

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
/*
 * **Y con el tiempo de casa, no con el del día.** En el árbol principal hay
 * un `.env` con el proxy del METAR, y el juego pedía el parte de verdad: el
 * 5-oct-2026 Los Rodeos daba OVC003, la tarjeta del tiempo salía sola a
 * proponer no salir —que es lo que tiene que hacer con trescientos pies de
 * techo y una avioneta visual— y el banco, que no la contesta, se quedaba
 * en el puesto. `&meteo=` vacío le dice al juego que no hay proxy, como en
 * `verificar-vuelo-entero.mjs`; para el parte de verdad,
 * `OGA_METEO_DE_VERDAD=1`.
 */
const METEO = process.env.OGA_METEO_DE_VERDAD ? "&meteo=verdad" : "&meteo=";
await page.goto(
  `${BASE}/?escenario=${ESCENARIO}&hora=16&leccion=despegue&tramo=${TRAMO}` +
    `&avion=${AVION}` +
    (VIENTO ? `&viento=${VIENTO}` : "") +
    METEO +
    /*
     * **Y lo que se quiera añadir a la dirección**: la hoja de carga
     * —`&pasajeros=19&llenos=1`— o un parte a mano —`&metar=…`—, para
     * despegar con la carga elegida. Ver `flight/hoja-de-carga.ts`.
     */
    (process.env.OGA_URL_EXTRA ?? ""),
);
await page.waitForTimeout(16000);
/*
 * **Los pies de la carrera, los del vuelo entero** (H44b): ver «y en el modelo
 * completo, con los pies» en la carrera de despegue, más abajo. Van a la
 * página como texto, como en `verificar-vuelo-entero.mjs`.
 */
await page.addScriptTag({
  content:
    `globalThis.__elEjeDeLaCarrera = ${elEjeDeLaCarrera.toString()};\n` +
    `globalThis.__tramoDelBanco = ${JSON.stringify(TRAMO)};`,
});
/*
 * **Y en el peldaño de cabina, con las voces de verdad** (H44b). El pack se
 * baja después del primer gesto, como en el juego, y este banco no hace
 * ninguno: la primera tirada en Taguató Ruvichá apuntó «eighty knots: sin
 * grabar, no se pide» y «V one» y «rotate» a la voz del navegador, con las
 * tres tomas en el pack. Lo que se mide ahí es justo lo que suena, así que se
 * hace lo de `verificar-tormenta.mjs`: una tecla que no hace nada y esperar
 * al pack entero. En los de abajo, como estaba —sin voz, la radio va más
 * deprisa y lo demás no cambia—; con `OGA_CON_VOCES=1`, también.
 */
if (TRAMO === "taguato-ruvicha" || process.env.OGA_CON_VOCES) {
  await page.keyboard.press("Shift");
  await page
    .waitForFunction(() => (globalThis.__oga?.voz?.().piezas ?? 0) > 0, null, { timeout: 90000 })
    .catch(() => {});
  await page
    .waitForFunction(() => (globalThis.__oga?.voz?.().pack ?? "listo") === "listo", null, {
      timeout: 120000,
    })
    .catch(() => {});
}

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
    /*
     * **Parado es por el suelo, no por el aire** (#192). Con el modelo de
     * coeficientes la velocidad del aire de un avión aparcado es la del
     * viento que llega al suelo: en Los Rodeos, con el alisio de 12 kt del
     * 040, el JAZ 20 frenado en el puesto marca 4,6 m/s de aire y 0,01 por el
     * suelo —medido con el modelo del juego y el viento a ras, `perfilDeViento`
     * —. En Guyrami, con el modelo sencillo, no se notaba; en Taguató esta
     * comprobación fallaba siempre con el avión quieto, el motor parado y la
     * fase bien.
     */
    v: s.groundSpeed,
    aire: s.airspeed,
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
  `fase «${arranque.fase}», motor ${arranque.motor ? "en marcha" : "parado"}, ${arranque.v.toFixed(1)} m/s por el suelo y ${arranque.aire.toFixed(1)} de aire`,
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

// ── La tarjeta del tiempo, si sale sola ───────────────────────────────────

/*
 * **Y la tarjeta del tiempo, si sale sola**, como en el banco del vuelo
 * entero. Cuando el tiempo de hoy pasa de lo que admite el avión, el juego la
 * abre a los dos segundos y medio en el puesto —«mirar si hoy se sale no es
 * opcional»— y, como todo panel que congela, para el mundo hasta que se
 * decide. El JAZ 25, con el tiempo de casa de Los Rodeos y un cruzado por
 * encima del de su norma, se quedaba «estacionado» los 350 s del rodaje: siete
 * de trece. Aquí se sale igual, que es lo que deja medir el despegue, y se
 * dice con sus motivos; con un viento en el cuarto argumento se despega con
 * otro.
 */
const parteQueSalio = await page.evaluate(() => {
  const o = globalThis.__oga;
  const salgo = document.querySelector('[data-parte-accion="salir-igual"]');
  if (!salgo || salgo.getClientRects().length === 0 || o.antesDeVolar?.()?.salir !== false) return null;
  const motivos = (o.antesDeVolar().motivos ?? []).map((m) => `${m.motivo} en la ${m.papel}`);
  salgo.click();
  return motivos;
});
if (parteQueSalio)
  console.log(
    `\n  ☁  la tarjeta del tiempo salió sola: hoy no conviene salir (${parteQueSalio.join(", ") || "sin motivo dicho"}).` +
      " El banco sale igual para medir el despegue.\n",
  );

// ── El tractor, si se sale empujado, y el sígame ──────────────────────────

/*
 * **Y del puesto de contacto se sale empujado, como sale quien juega.**
 *
 * Desde que los reactores salen de Los Rodeos empujados por un tractor —ver
 * `prepararElRemolque` en `game.ts`—, este banco se quedaba en el puesto con
 * el JAZ 90: escribía `engineOn` en los mandos, y así no pasaba por la llave,
 * que con el tractor enganchado no arranca sino que pide el empuje, ni
 * encendía la baliza, sin la que el tractor no empuja. Con los motores en
 * marcha y el tractor enganchado nadie pedía nada, y el avión se quedaba en
 * «arrancando», a cero, los 350 s del rodaje: seis de trece, y de ellas siete
 * rojas que no medían nada. El banco del vuelo entero lo aprendió primero;
 * éste lo hace igual: la baliza, la llave para pedir el empuje y, empujando,
 * la llave otra vez para arrancar; y no rueda hasta que lo sueltan. Con las
 * puertas aún abiertas se espera con freno, que es lo que pide el juego.
 */
const empuje = await page.evaluate(async () => {
  const o = globalThis.__oga;
  if (!o.inicio?.()?.remolque || !o.tocarMando) return null;
  const c = o.controles();
  const fases = [];
  let pedido = false;
  let conPuertas = 0;
  let sigameConTractor = false;
  for (let i = 0; i < 1200; i++) {
    await new Promise((r) => setTimeout(r, 250));
    const r = o.inicio()?.remolque ?? null;
    if (!r || r.fase === "libre") {
      // Suelto, quieto con freno hasta que se rueda, que es abajo.
      c.brakes = 1;
      return { fases: fases.join(" → "), libre: true, segundos: i * 0.25, sigameConTractor };
    }
    if (fases[fases.length - 1] !== r.fase) fases.push(r.fase);
    if (globalThis.__raiz.getObjectByName("sigueme")?.visible) sigameConTractor = true;
    const puertas = o.fase() === "estacionado" && o.listoParaArrancar?.() === false && conPuertas < 60;
    if (puertas) conPuertas += 0.25;
    c.throttle = 0;
    c.brakes = puertas ? 1 : 0;
    if (puertas) continue;
    if (r.fase === "enganchado") {
      if (!r.baliza) o.tocarMando("baliza");
      else if (!pedido) {
        o.tocarMando("motor");
        pedido = true;
      }
    } else if (!c.engineOn) o.tocarMando("motor");
  }
  return { fases: fases.join(" → "), libre: false, segundos: 300, sigameConTractor };
});
// El coche sale en cuanto el tractor suelta; se le da un segundo y medio para llegar a verse.
if (empuje?.libre) await page.waitForTimeout(1500);
if (empuje) {
  comprobar(
    "del puesto de contacto se sale empujado, y el tractor suelta el avión",
    empuje.libre,
    `${empuje.libre ? "suelto" : "sin soltar"} a los ${empuje.segundos.toFixed(0)} s · ${empuje.fases}`,
    "con el tractor enganchado el avión no rueda, y nadie pedía el empuje",
  );
  comprobar(
    "y con el tractor enganchado no sale el sígame, que su raya va por detrás",
    !empuje.sigameConTractor,
    empuje.sigameConTractor ? "salió con el tractor puesto" : "esperó a que lo soltaran",
    "el coche saldría por la raya, que va por detrás del avión",
  );
}

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
    empuje
      ? "el coche del sígame espera delante cuando el tractor suelta el avión"
      : "el coche del sígame espera delante antes de arrancar",
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
  // Lo largo de la calle y lo que tarda a lo que pide el juego, para el tope de abajo.
  let largo = 0;
  let comoPide = 0;
  /*
   * **Y el rato perdido por tráfico, aparte**, s, y por quién.
   *
   * El rodaje del JAZ 90 por Los Rodeos salía de 110 s o de 156 s con el mismo
   * código del juego, contra un tope de 153 (#192): el tope mide lo que tarda la
   * ruta, y no descontaba los ratos en que el juego te frena porque la pista o
   * la calle son de otro. Eso es tráfico, dicho con voz —«give way», «hold
   * short»—, y es justo lo que se enseña: no es rodar despacio. En la de 156 s
   * no se pasó de 9,9 m/s en toda la calle, donde la otra iba a 15,4, y la torre
   * esperó después por el que despegaba delante. Se cuenta solo lo que el
   * propio juego da por motivo:
   *
   * - **Parado**, con la velocidad que pide en cero, y con alguien delante en
   *   tu raya —`detrasDeQuien`— o tu raya cortada antes de la calle de uno que
   *   viene de frente —`paradaDeTuRaya`—: el rato entero. El porqué de la
   *   torre —`porQueEsperas`— no entra: la velocidad que pide el plan no lo
   *   mira, así que en la calle no para a nadie, y en la doble raya lo que
   *   espera se mide abajo, en «la torre acaba autorizando». Rodando por Los
   *   Rodeos, la torre ya decía «aterriza EC-RYH» con el avión arrancando a
   *   paso de calle.
   * - **Rodando detrás de uno** de tu raya: lo que se tarda de más frente al
   *   paso medio de la ruta que pide el juego —`segundosDeLaRuta` entre su
   *   largo—. Detrás de uno que rueda a paso de calle, la mitad de cada
   *   segundo; a la velocidad del plan, nada.
   *
   * Sin nadie delante no se descuenta nada: lo que aburre por un plan lento o
   * un rodaje atascado sigue contando entero, que es lo que se quiere cazar.
   */
  let perdidoPorTrafico = 0;
  const porQuienSePerdio = new Map();
  const paradas = [];
  const trazaDelRodaje = [];
  let recorridoAntes = null;
  for (let i = 0; i < 1400; i++) {
    await new Promise((r) => setTimeout(r, 250));
    const s = o.estado();
    {
      const r = o.ruta();
      let suma = 0;
      for (let k = 0; k < r.length - 1; k++) suma += Math.hypot(r[k + 1][0] - r[k][0], r[k + 1][1] - r[k][1]);
      largo = Math.max(largo, suma);
      comoPide = Math.max(comoPide, o.segundosDeLaRuta?.() ?? 0);
    }
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
    // Por el suelo, como lo pide el plan: con el modelo de coeficientes, la del aire lleva el viento (ver `v` arriba).
    c.throttle = s.groundSpeed < quiere ? 0.6 : 0;
    c.brakes = s.groundSpeed > quiere + 2 ? 1 : 0;
    c.aileron = timon(s, ruta);
    const recorrido = o.rodajeAsi?.().recorrido ?? null;
    const avance =
      recorrido !== null && recorridoAntes !== null ? Math.max(0, recorrido - recorridoAntes) : null;
    recorridoAntes = recorrido;
    const delanteEnLaRaya = o.detrasDeQuien?.() ?? null;
    const anotar = (motivo, segundos) => {
      perdidoPorTrafico += segundos;
      porQuienSePerdio.set(motivo, (porQuienSePerdio.get(motivo) ?? 0) + segundos);
    };
    if (Math.hypot(s.velocity.x, s.velocity.z) < 0.5) {
      let motivo = null;
      if (quiere < 0.5) {
        /*
         * La raya cortada cuenta solo si el corte está aquí delante: lejos,
         * la velocidad que pide no es por él. Treinta metros, lo que se para
         * un avión antes de la calle del otro con la frenada de rodaje.
         */
        const corte = o.paradaDeTuRaya?.() ?? null;
        const cortada = corte !== null && recorrido !== null && corte - recorrido < 30;
        motivo = delanteEnLaRaya
          ? `detrás de uno ${delanteEnLaRaya === "cola" ? "de tu cola" : "parado"}`
          : cortada
            ? "dando paso a uno que viene de frente"
            : null;
      }
      if (motivo) anotar(motivo, 0.25);
      // Y cada rato parado, con motivo o sin él, para el parte: dónde y cuánto.
      const que =
        motivo ?? (quiere < 0.5 ? "el juego pide cero, sin tráfico que lo diga" : `parado pidiendo ${quiere.toFixed(1)} m/s`);
      const ultima = paradas[paradas.length - 1];
      if (ultima && ultima.que === que && i * 0.25 - ultima.hasta <= 0.5) ultima.hasta = i * 0.25;
      else paradas.push({ desde: i * 0.25, hasta: i * 0.25, que, en: recorrido });
    } else if (delanteEnLaRaya && avance !== null && largo > 0 && comoPide > 0) {
      const perdido = Math.max(0, 0.25 - avance * (comoPide / largo));
      if (perdido > 0)
        anotar(`rodando detrás de uno ${delanteEnLaRaya === "cola" ? "de tu cola" : "parado"}`, perdido);
    }
    /*
     * Y un renglón por segundo de lo que pide el juego y de quién hay cerca,
     * para el parte si el rodaje se pasa del tope: el mismo código del juego
     * daba 110 s o 156 s, y sin esto no se sabía por qué.
     */
    if (i % 4 === 0) {
      const delante = (o.trafico?.() ?? [])
        .map((a) => {
          const dx = a.x - s.position.x;
          const dz = a.z - s.position.z;
          // Por delante del morro: el rumbo del juego va con x al seno y z al menos coseno.
          const alFrente = dx * Math.sin(s.heading) - dz * Math.cos(s.heading);
          return { m: a.matricula, d: Math.hypot(dx, dz), alFrente };
        })
        .filter((a) => a.alFrente > 0 && a.d < 250)
        .sort((a, b) => a.d - b.d)[0];
      const corte = o.paradaDeTuRaya?.() ?? null;
      const recorrido = o.rodajeAsi?.().recorrido ?? null;
      const torre = o.porQueEsperas?.() ?? null;
      trazaDelRodaje.push(
        `${(i * 0.25).toFixed(0)}s ${Math.hypot(s.velocity.x, s.velocity.z).toFixed(1)} m/s pide ${quiere.toFixed(1)}` +
          ` · ${recorrido ?? "?"} m` +
          (corte !== null && recorrido !== null ? ` · raya cortada a ${(corte - recorrido).toFixed(0)} m` : "") +
          (o.detrasDeQuien?.() ? ` · detrás de uno (${o.detrasDeQuien()})` : "") +
          (delante ? ` · delante ${delante.m} a ${delante.d.toFixed(0)} m` : "") +
          ((o.salenAntes?.() ?? []).length ? ` · salen antes ${o.salenAntes().join(",")}` : "") +
          (torre ? ` · torre: ${torre.porque} ${torre.matricula ?? ""}` : "") +
          ` · coche a ${Math.round(o.adelantoDelCoche?.() ?? -1)} m`,
      );
    }
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
    largo,
    comoPide,
    recta: o.avion?.()?.rodaje?.recta ?? 9,
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
    perdidoPorTrafico,
    porQuienSePerdio: [...porQuienSePerdio].map(([que, cuanto]) => `${cuanto.toFixed(0)} s ${que}`),
    // Los ratos parados de más de dos segundos: arrancar y llegar a la raya no son paradas.
    paradas: paradas
      .filter((p) => p.hasta - p.desde >= 2)
      .map((p) => `${p.desde.toFixed(0)}–${p.hasta.toFixed(0)} s a ${p.en ?? "?"} m: ${p.que}`),
    trazaDelRodaje,
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
 *
 * **Y en una calle larga, lo que tarda esa calle**, con la misma cuenta que el
 * banco del vuelo entero: el JAZ 90, empujado desde la terminal de Los Rodeos,
 * tiene casi un kilómetro hasta la doble raya, y a los veinte nudos de un
 * avión de línea son cien segundos sin perder uno. El tope es lo que tarda la
 * ruta a lo que pide el juego —`segundosDeLaRuta`— con un cuarto de holgura,
 * o a su velocidad en recta con un tercio por las curvas, más veinte de
 * arrancar y pararse; y nunca menos de noventa. Lo que esto caza sigue siendo
 * lo que aburre: un plan que pide ir despacio sin motivo, o un rodaje que se
 * atasca. Ver `topeDeIda` en `verificar-vuelo-entero.mjs`.
 */
const topeDeRodaje = Math.round(
  Math.max(90, (rodando.largo / rodando.recta) * (4 / 3) + 20, rodando.comoPide * 1.25 + 20),
);
/*
 * **Y el rato perdido por tráfico no es rodaje: se descuenta**, como en el
 * banco del vuelo entero —ver «el rodaje de ida no aburre»—, y se dice cuánto
 * y por quién, para que un descuento enorme se vea. El tope no se mueve: lo
 * que queda tiene que caber en él igual que antes cuando no hay nadie.
 */
const rodandoDeVerdad = rodando.segundos - rodando.perdidoPorTrafico;
comprobar(
  "y del puesto a la pista se llega antes de aburrirse",
  rodandoDeVerdad <= topeDeRodaje,
  `${rodando.segundos.toFixed(0)} s de rodaje` +
    (rodando.perdidoPorTrafico > 0
      ? `, ${rodando.perdidoPorTrafico.toFixed(0)} s de ellos perdidos por tráfico (${rodando.porQuienSePerdio.join(", ")}): ${rodandoDeVerdad.toFixed(0)} s rodando`
      : "") +
    `, con ${topeDeRodaje} de tope para ${rodando.largo.toFixed(0)} m` +
    ` (el juego pide ${rodando.comoPide.toFixed(0)} s)`,
  "«es aburrido pasarse cuatro minutos en una pista, eso un niño no lo aguanta»",
);
if (rodando.paradas.length)
  console.log(`\n  ⏸  parado rodando: ${rodando.paradas.join(" · ")}\n`);
if (process.env.OGA_TRAZA_RODAJE || rodandoDeVerdad > topeDeRodaje)
  console.log(`\n  el rodaje, segundo a segundo:\n    ${rodando.trazaDelRodaje.join("\n    ")}\n`);
comprobar(
  "y no se rueda como un cohete",
  rodando.maxV < 22,
  `máxima ${rodando.maxV.toFixed(1)} m/s rodando`,
  "rodar a noventa por hora no es rodar, y nadie avisaba",
);

// ── La torre ──────────────────────────────────────────────────────────────

/*
 * **Y si la roja es por alguien, se espera a que se vaya.** Con el tráfico
 * del campo puede haber uno que aterriza, uno que salía antes que tú en la
 * fila o la estela del que acaba de salir, y entonces la verde tarda lo que
 * tarda de verdad: minutos. La primera tirada después de la fila de salida
 * —Tenerife Sur, JAZ 60— dio «nunca dio verde» a los quince segundos sin decir
 * por quién. Ahora se apunta el porqué y, si lo hay, se corre el reloj hasta
 * que se vaya; lo que se sigue exigiendo es que la torre autorice al parar,
 * en doce segundos, cuando no hay nadie.
 */
/*
 * **Y donde no hay torre, no hay lámpara que esperar.** En un campo sin nadie
 * en la radio —la granja, Ayolas— o con un AFIS, que informa y no autoriza,
 * el juego lleva la luz por dentro, que es la cuenta de cuándo la pista está
 * libre para vos, pero no la pinta, a propósito: ver `luzDeTorre` y
 * `esAfisAqui` en `game.ts`. Este banco esperaba la clase `torre--verde` y en
 * Yvytu Rape daba «nunca dio verde» con el avión ya en «autorizado»: medía una
 * lámpara que no existe. Ahí se mira lo que sí hay —la fase que da el juego
 * con la pista libre, «autorizado» o una de las que vienen detrás—, con el
 * mismo plazo; y que la lámpara no se pinte, que es lo que hay que ver. Donde
 * hay torre se mide lo mismo que antes, la lámpara verde.
 */
const torre = await page.evaluate(async () => {
  const o = globalThis.__oga;
  const c = o.controles();
  c.throttle = 0;
  c.brakes = 1;
  /*
   * **Y el compensador a su marca de despegue**, como quien juega con la
   * lista: la aguja a la franja que pinta el indicador TRIM en la espera. En
   * cero, soltando los mandos recién despegado, el JAZ 20 volvía a la pista
   * en cuatro segundos (H20a). Ver `flight/compensador-de-despegue.ts`.
   */
  const compensa = o.compensadorDeDespegue?.();
  if (compensa) c.trim = compensa.marca;
  const conLampara = o.conFrecuencia?.() !== false && !o.conAfis?.();
  const LIBRE = new Set(["autorizado", "back-taxi", "alineando", "despegando", "comprometido"]);
  let verde = null;
  let vistas = "";
  let pintada = false;
  const porques = new Set();
  const noTeMira = new Set();
  const conRed = new Set();
  const t0 = o.reloj();
  const real0 = performance.now();
  let corrido = false;
  /*
   * **Y cuándo empezó y acabó cada porqué, en los dos relojes** (H44b). En
   * Los Rodeos con el JAZ 90 la verde llegó a los 292,7 s de juego esperando
   * al número uno de la fila, más que los tres minutos de
   * `PACIENCIA_EN_LA_FILA`, y el banco no decía qué parte era la fila, cuál
   * la pista ocupada y cuál la radio. Con el reloj corrido a ocho veces la
   * radio va a su ritmo —ver «el reloj acelerado no acelera lo que se oye» en
   * `game.ts`—, así que cada segundo de voz son ocho de juego: se apuntan el
   * del juego y el de pared, y si la boca hablaba.
   */
  const linea = [];
  let firmaAntes = "";
  for (let i = 0; i < 240; i++) {
    await new Promise((r) => setTimeout(r, 250));
    // La clase del verde vive en la caja, no en la bombilla.
    const caja = document.querySelector('[data-hud="torre"]');
    const clases = caja?.className ?? "";
    vistas = clases;
    if (caja && !caja.hidden && /torre--(verde|roja)/.test(clases)) pintada = true;
    const por = o.porQueEsperas?.();
    if (por) porques.add(`${por.porque}${por.numero ? ` (número ${por.numero})` : ""} ${por.matricula ?? ""}`);
    // Y por qué no te mira, aunque nadie lo diga: ver `noTeMira` (H48).
    const nm = o.noTeMira?.();
    {
      const boca = o.bocaAhora?.();
      const firma =
        `${por ? `${por.porque}${por.numero ? ` #${por.numero}` : ""} ${por.matricula ?? ""}` : "nadie"}` +
        ` · ${nm ? `${nm.por ?? "mira"}[${nm.piezas.join(",")}]` : "mira"}` +
        ` · fila ${(o.salenAntes?.() ?? []).join(",") || "-"}` +
        ` · boca ${boca?.ocupada ? `habla ${boca.ultima}` : "calla"}`;
      if (firma !== firmaAntes) {
        firmaAntes = firma;
        linea.push(
          `${(o.reloj() - t0).toFixed(0)} s de juego, ${((performance.now() - real0) / 1000).toFixed(0)} de pared: ${firma}`,
        );
      }
    }
    if (nm) noTeMira.add(`${nm.por ?? "mira"}${nm.piezas.length ? ` [${nm.piezas.join(", ")}]` : ""}${nm.lista ? " lista" : ""}`);
    /*
     * **Y lo que sujeta la roja sin nadie a quien nombrar, pero con su red**:
     * la lista de antes de despegar, que espera a que calle la radio, y una
     * «pista libre» de otro que todavía no ha sonado (H48). Con eso no hay
     * porqué que contar y la verde tarda más de doce segundos sin que nada
     * esté roto; lo que no puede es no llegar. Se corre el reloj, como con
     * alguien por medio, y se exige que llegue antes que su red más un margen.
     */
    if (nm && !por && nm.por === "lista") conRed.add("la lista de antes de despegar");
    if (nm && !por && nm.por === "otros" && nm.piezas.length && nm.piezas.every((p) => p === "pista libre por sonar"))
      conRed.add("una «pista libre» de otro todavía sin sonar");
    if (conLampara ? clases.includes("torre--verde") : LIBRE.has(o.fase())) {
      verde = o.reloj() - t0;
      // Sin lámpara, un poco más mirando que no se pinte: la luz de dentro ya está verde.
      if (!conLampara) await new Promise((r) => setTimeout(r, 1500));
      break;
    }
    // A los quince segundos con alguien por medio, el reloj corrido.
    if (i === 60 && (porques.size || conRed.size) && !corrido) corrido = o.acelerar(8) > 1;
    if (i >= 60 && !porques.size && !conRed.size) break;
  }
  o.acelerar(1);
  if (!conLampara) {
    const caja = document.querySelector('[data-hud="torre"]');
    if (caja && !caja.hidden && /torre--(verde|roja)/.test(caja.className)) pintada = true;
  }
  return {
    verde,
    real: (performance.now() - real0) / 1000,
    linea,
    fase: o.fase(),
    luz: vistas,
    porques: [...porques],
    conLampara,
    pintada,
    noTeMira: [...noTeMira],
    conRed: [...conRed],
    boca: o.bocaAhora?.(),
    ocupan: o.ocupanLaPista?.(),
    lista: (o.cantados?.() ?? []).filter((c) => /flaps de despegue|compensador de despegue/.test(c)),
  };
});
/*
 * **Y si no la dio, por qué no miraba la torre**: la roja sin porqué de Los
 * Rodeos con el JAZ 90 en la tanda 20 no decía qué la sujetaba (H48).
 */
if (torre.verde === null || torre.verde >= 12)
  console.log(
    `\n  la espera en la doble raya, ${torre.real.toFixed(0)} s de pared:\n    ${torre.linea.join("\n    ")}\n`,
  );
if (torre.verde === null)
  console.log(
    `  la torre no miraba por: ${torre.noTeMira.join(" → ") || "nada apuntado"}` +
      ` · boca ${JSON.stringify(torre.boca)} · ocupan ${JSON.stringify(torre.ocupan)}` +
      ` · lista: ${torre.lista.join(", ") || "nada"}`,
  );
const porAlguien = torre.porques.length > 0;
/*
 * Lo que sujeta la roja con su red tiene que soltarla antes que ella, más un
 * margen: la lista, `LA_LISTA_COMO_MUCHO` en `flight/vuelo.ts`, y la «pista
 * libre» sin sonar, `LO_QUE_SUELTA_COMO_MUCHO` en `flight/turno-de-pista.ts`.
 */
const TOPE_CON_RED = 90 + 15;
const porSuRed = torre.conRed.length > 0 && torre.verde !== null && torre.verde < TOPE_CON_RED;
comprobar(
  torre.conLampara
    ? "parando en la doble raya, la torre acaba autorizando"
    : "parando en la doble raya, sin torre, el juego da la pista por libre",
  torre.verde !== null && (torre.verde < 12 || porAlguien || porSuRed),
  (torre.verde === null
    ? torre.conLampara
      ? `nunca dio verde (fase «${torre.fase}», lámpara «${torre.luz}»)`
      : `nunca la dio por libre (fase «${torre.fase}»)`
    : torre.conLampara
      ? `verde a los ${torre.verde.toFixed(1)} s de juego`
      : `«${torre.fase}» a los ${torre.verde.toFixed(1)} s de juego`) +
    (porAlguien ? ` · esperando por ${torre.porques.join(", ")}` : " · sin nadie por medio") +
    (torre.conRed.length ? ` · esperando ${torre.conRed.join(" y ")}, que tiene su red` : ""),
  "la torre miraba si habías llegado, no si estabas parado: se cruzaba a toda velocidad",
);
if (!torre.conLampara)
  comprobar(
    "y sin torre no se pinta la lámpara",
    !torre.pintada,
    torre.pintada ? `se pintó (${torre.luz})` : "no se pintó, como debe",
    "una lámpara verde dice «autorizado», y donde nadie autoriza no la hay",
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
  const porElSuelo = (s) => Math.hypot(s.velocity.x, s.velocity.z);
  /** A cuánto del eje se da gas, m: lo de `EN_EL_EJE` en el banco del vuelo entero. */
  const EN_EL_EJE = 3;
  /*
   * **Los flaps de despegue, si la lista los pide**, como quien juega: en el
   * peldaño de cabina no los pone la instructora, los pide la lista —«FLAPS —
   * 5»— y el JAZ 90 salía sin ellos. Un tercio de palanca, como el banco del
   * vuelo entero: la primera muesca en las palancas de cuatro y de tres.
   */
  const losPideLaLista = () =>
    !!o.avion()?.llevaFlaps &&
    (o.palancaDeFlaps?.() ?? 0) < 0.01 &&
    (o.cantados?.() ?? []).some((c) => c.startsWith("flaps de despegue: los pide la lista"));
  /*
   * **Y el back-taxi se rueda como lo rueda el banco del vuelo entero**, que
   * sale de la granja con el JAZ 20 y éste no salía.
   *
   * Aquí se seguía con el timón del rodaje —el punto más cercano de la ruta
   * de ahí en adelante— y el back-taxi se pisa a sí mismo: se va por la pista
   * y se vuelve por ella. En la de hierba de Yvytu Rape, de dieciocho metros,
   * la vuelta pasa a pocos metros de la ida, así que el punto más cercano
   * saltaba a la vuelta y el avión daba la media vuelta antes de llegar al
   * sitio de girar: la bandera del back-taxi no bajaba nunca, el plan pedía
   * cero al final de su raya y el tope de rodaje le cerraba el gas. Quieto a
   * 0,0 m/s, dos minutos, y «no llegó a despegar» con todos los aviones.
   *
   * Así que se hace lo de `timon` en `verificar-vuelo-entero.mjs`: llevar la
   * cuenta de por dónde se va **a lo largo de la raya** —buscando cerca de
   * donde se iba, un poco atrás y treinta metros adelante— y mirar un punto
   * de la raya unos metros más allá, con la mirada más larga cuanto más
   * deprisa o más lejos de la raya. Y a la velocidad que pide el juego, con
   * freno si se pasa, que la media vuelta del final se da a paso de persona.
   */
  let firmaDeLaRaya = "";
  let avanceEnLaRaya = 0;
  let largosDeLaRaya = [0];
  const porLaRaya = (s, ruta) => {
    if (ruta.length < 2) return 0;
    const ultimo = ruta[ruta.length - 1];
    const firma = `${ruta.length}:${ruta[0][0].toFixed(1)},${ruta[0][1].toFixed(1)}:${ultimo[0].toFixed(1)},${ultimo[1].toFixed(1)}`;
    if (firma !== firmaDeLaRaya) {
      firmaDeLaRaya = firma;
      largosDeLaRaya = [0];
      for (let i = 1; i < ruta.length; i++)
        largosDeLaRaya.push(
          largosDeLaRaya[i - 1] + Math.hypot(ruta[i][0] - ruta[i - 1][0], ruta[i][1] - ruta[i - 1][1]),
        );
      avanceEnLaRaya = 0;
    }
    const total = largosDeLaRaya[largosDeLaRaya.length - 1];
    const aLos = (avance) => {
      for (let i = 0; i < ruta.length - 1; i++) {
        if (largosDeLaRaya[i + 1] < avance) continue;
        const l = largosDeLaRaya[i + 1] - largosDeLaRaya[i];
        const t = l > 0 ? Math.max(0, (avance - largosDeLaRaya[i]) / l) : 0;
        return [ruta[i][0] + (ruta[i + 1][0] - ruta[i][0]) * t, ruta[i][1] + (ruta[i + 1][1] - ruta[i][1]) * t];
      }
      return ultimo;
    };
    const buscar = (desde, hasta) => {
      let mejor = Infinity;
      let avance = Math.max(0, desde);
      for (let i = 0; i < ruta.length - 1; i++) {
        const a0 = largosDeLaRaya[i];
        const a1 = largosDeLaRaya[i + 1];
        if (a1 < desde || a0 > hasta) continue;
        const l = a1 - a0;
        const [ax, az] = ruta[i];
        const [bx, bz] = ruta[i + 1];
        const u = l > 0 ? ((s.position.x - ax) * (bx - ax) + (s.position.z - az) * (bz - az)) / (l * l) : 0;
        const aqui = Math.max(desde, Math.min(hasta, a0 + Math.max(0, Math.min(1, u)) * l));
        const t = l > 0 ? (aqui - a0) / l : 0;
        const d = Math.hypot(ax + (bx - ax) * t - s.position.x, az + (bz - az) * t - s.position.z);
        if (d < mejor) {
          mejor = d;
          avance = aqui;
        }
      }
      return { mejor, avance };
    };
    let hallado = buscar(avanceEnLaRaya - 5, avanceEnLaRaya + 30);
    if (hallado.mejor > 25) hallado = buscar(0, total);
    avanceEnLaRaya = hallado.avance;
    const mirada = Math.max(12, s.groundSpeed * 1.6, hallado.mejor * 1.5);
    const mira = aLos(Math.min(total, avanceEnLaRaya + mirada));
    // Con la ganancia del otro banco: en tierra el alerón es la rueda de morro, y con 2 se pasa.
    let e = Math.atan2(mira[0] - s.position.x, -(mira[1] - s.position.z)) - s.heading;
    while (e > Math.PI) e -= 2 * Math.PI;
    while (e < -Math.PI) e += 2 * Math.PI;
    return Math.max(-1, Math.min(1, e * 1.2));
  };
  /*
   * Seiscientas vueltas y no doscientas: dos minutos. Lo pide el **back-taxi**,
   * que son seiscientos y pico metros de pista a ocho metros por segundo antes
   * de poder pensar en despegar. Ver #151.
   */
  /*
   * **Y lo que el avión hace en la pista antes de la carrera** (H41e): dónde
   * pisa el asfalto, hasta dónde va hacia la cabecera y dónde suelta frenos,
   * en metros del eje desde el centro, para compararlo con lo que dice la
   * radio. Rodar por la pista hacia atrás es remontar.
   */
  const porLaPista = { entra: null, masAtras: null, giro: null };
  for (let i = 0; i < 600; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const s = o.estado();
    if (s.onRunway) {
      const b = o.backTaxi?.();
      if (b) {
        porLaPista.entra ??= b.along;
        porLaPista.masAtras = Math.min(porLaPista.masAtras ?? b.along, b.along);
        porLaPista.giro = b.giro ?? porLaPista.giro;
      }
    }
    c.throttle = s.groundSpeed < 8 ? 0.5 : 0;
    c.brakes = 0;
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
    /*
     * **Y si la torre dijo remontar, se remonta** (H41e): entrando por una
     * calle que llega mirando a la cabecera, el avión pisa la pista todavía
     * en «autorizado», y apuntar ahí al rumbo de despegue es no hacer caso
     * del «backtrack»: el hecho gana al plan —ver `deducir` en
     * `flight/vuelo.ts`— y se despega desde la boca. Con un remonte trazado,
     * en la pista se sigue la raya.
     */
    const remontePorDelante = s.onRunway && (o.backTaxi?.()?.giro ?? null) !== null;
    /*
     * **Y la raya se sigue hasta el eje, no hasta el borde** (H44b), como en
     * el banco del vuelo entero: ver `EN_EL_EJE` en `verificar-vuelo-entero.mjs`.
     * Entrando por la calle de Los Rodeos, el morro se ponía a menos de siete
     * grados de la pista todavía pisando el borde y desde ahí se daba gas: en
     * Taguató Ruvichá, con el JAZ 90, la carrera empezaba a veintisiete metros
     * del eje y acababa a doscientos cincuenta, en la hierba. La raya del juego
     * lleva al eje; se sigue hasta estar en él.
     */
    const delEjeAhora =
      (s.position.x - pista.x) * Math.cos(rumboPista) + (s.position.z - pista.z) * Math.sin(rumboPista);
    const fueraDelEje = ruta.length > 1 && s.onRunway && Math.abs(delEjeAhora) > EN_EL_EJE;
    // Y los flaps de despegue, si la lista los pide: ver `losPideLaLista`.
    if (losPideLaLista()) o.pedirFlaps(1 / 3);
    if ((o.fase() === "back-taxi" || remontePorDelante || fueraDelEje) && ruta.length > 1) {
      /*
       * **Salvo en el back-taxi, donde ir por la pista es el plan.**
       *
       * Aquí el avión está sobre el asfalto y apuntando justo al revés que la
       * pista **a propósito**: va a buscar la cabecera al otro extremo. Poner
       * el morro en el rumbo de despegue en ese momento es abortar la
       * maniobra, y eso es lo que hacía este banco: daba media vuelta y
       * despegaba desde donde estuviera. Mientras el juego diga que esto es un
       * back-taxi, se sigue la raya como en cualquier otro rodaje: por la raya
       * y a lo que pide el juego. Ver `porLaRaya`.
       */
      const quiere = o.rodaje?.() ?? 9;
      c.throttle = porElSuelo(s) < quiere ? 0.6 : 0;
      c.brakes = porElSuelo(s) > quiere + 1 ? 1 : 0;
      c.aileron = porLaRaya(s, ruta);
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
      !remontePorDelante &&
      !fueraDelEje &&
      Math.abs(alRumbo(s, rumboPista)) < 0.25 &&
      i > 8
    )
      break;
  }
  porLaPista.suelta = o.backTaxi?.()?.along ?? null;
  const sale = o.juegoParaTrazas?.()?.plan?.comoSeSale ?? null;
  porLaPista.sale = sale
    ? `${sale.desde}${sale.desde === "remonte" ? (sale.hastaElFinal ? " hasta el final" : " un trozo") : ""}` +
      ` (pide ${Math.round(sale.necesitaHoy)} m, desde la entrada ${Math.round(sale.desdeLaEntrada)},` +
      // La TORA dicha y la alineación que se le resta (H41f): ver `pistaDesdeLaBoca`.
      ` alinearse ${Math.round(sale.alinearse ?? 0)},` +
      ` por delante ${Math.round(sale.porDelante)}${sale.porQue ? `, por ${sale.porQue}` : ""})`
    : null;
  const ficha = o.avion();
  // La carrera va por donde va la pista. Ver arriba.
  const rumboDeLaCarrera = rumboPista;
  c.throttle = 1;

  /*
   * ── **Y el que pilota la carrera va por `pilotar`, no escribiendo mandos** ──
   *
   * Es la diferencia entre medir el avión y medir el bucle de entrada.
   * Escribir en `controles()` desde fuera no sirve: `input.update()` los
   * reescribe enteros cada fotograma y el elevador se acerca a su objetivo
   * poco a poco, así que de medio recorrido de palanca llegaba una fracción.
   * Resultado medido: el entrenador se iba al aire a cuarenta metros por
   * segundo con la Vr en veintiocho —un cuarenta por ciento largo— y con ello
   * la carrera salía casi el triple de la que dice su física.
   *
   * Y no era el avión: pilotado por `pilotar`, ese mismo entrenador rota a
   * 29,5 y el de fuselaje ancho a 95 con la Vr en 86, que es lo que tiene que
   * pasar. La regla de medir se estaba comiendo la prueba, y lo que se dio por
   * bueno durante meses fue una carrera de despegue que el juego no tiene.
   * Ver `pilotar` en `src/dev/sondas.ts`.
   */
  /*
   * **Y en el modelo completo, con los pies** (H44b): fuera de Guyrami, el pie
   * y la mano del banco del vuelo entero —ver `el-eje-de-la-carrera.mjs`—. En
   * Taguató Ruvichá el mando de alabeo, pasados los veintiocho metros por
   * segundo, no gira nada, y este piloto no tenía otro volante. En Guyrami,
   * como estaba: allí la ayuda de rodaje lleva el avión a la raya.
   */
  const conPies = globalThis.__tramoDelBanco !== "guyrami";
  const conAyudaEnTierra = (o.juegoParaTrazas?.()?.flight?.layers?.autoRudder ?? 0) > 0;
  let pieAcumulado = 0;
  let relojDelPie = o.reloj();
  if (losPideLaLista()) o.pedirFlaps(1 / 3);
  o.pilotar((m) => {
    const s = o.estado();
    m.engineOn = true;
    m.brakes = 0;
    m.throttle = 1;
    if (s.onGround && conPies) {
      const ahora = o.reloj();
      const pies = globalThis.__elEjeDeLaCarrera({
        rumboPista: rumboDeLaCarrera,
        rumbo: s.heading,
        desvio:
          (s.position.x - pista.x) * Math.cos(rumboDeLaCarrera) +
          (s.position.z - pista.z) * Math.sin(rumboDeLaCarrera),
        porElSuelo: porElSuelo(s),
        giro: s.yawRate,
        derrape: s.beta,
        acumulado: pieAcumulado,
        paso: Math.max(0, ahora - relojDelPie),
        conAyudaEnTierra,
      });
      relojDelPie = ahora;
      pieAcumulado = pies.acumulado;
      m.rudder = pies.rudder;
      m.aileron = pies.aileron;
    } else if (s.onGround) {
      /*
       * No basta con poner el morro en el rumbo de la pista: hay que ir al
       * eje. Con solo el rumbo, un avión que entra por una calle y queda
       * pegado al borde sale de la pista por el costado sin dejar de apuntar
       * bien — y fuera de la pista este modelo no deja despegar, a propósito.
       * Se apunta a un punto del eje trescientos metros por delante, que es lo
       * que hace quien despega.
       */
      const dx = s.position.x - pista.x;
      const dz = s.position.z - pista.z;
      const along =
        dx * Math.sin(rumboDeLaCarrera) - dz * Math.cos(rumboDeLaCarrera);
      const tx = pista.x + Math.sin(rumboDeLaCarrera) * (along + 300);
      const tz = pista.z - Math.cos(rumboDeLaCarrera) * (along + 300);
      m.aileron = alRumbo(
        s,
        Math.atan2(tx - s.position.x, -(tz - s.position.z)),
      );
    } else {
      m.aileron = 0;
      if (conPies) m.rudder = 0;
    }
    /*
     * Y el tirón **a la Vr de este avión**, no a veintisiete metros por
     * segundo. Veintisiete es la Vr del entrenador y de nadie más: es el
     * umbral escrito a mano de siempre, que acierta en el avión con el que se
     * escribió y miente en los otros cinco.
     */
    /*
     * **Y contando el compensador**, que ahora sale en su marca de despegue:
     * el timón es la mano más el compensador, y la mano que tiraba medio
     * recorrido con el compensador en cero tira lo que falta hasta ese medio
     * recorrido. Sin esto, con la marca puesta el morro subía de más, el avión
     * llegaba a los quince metros por debajo de su Vr y soltado bajaba (H21a).
     */
    /*
     * **Y en la aguja, no en la verdadera**: la Vr de un manual es indicada, y
     * es con la indicada con la que el juego la canta. Tirando con la
     * verdadera, en La Gomera a 40 °C con el JAZ 90 lleno el avión se iba al
     * aire con la aguja un 6 % por debajo de la Vr, y ni Vr ni su flecha
     * llegaban a salir antes de los quince metros (H38d).
     */
    m.elevator = o.indicada() > ficha.rotacion ? Math.max(0, 0.5 - (o.controles().trim ?? 0)) : 0;
  });
  let frenoSeFue = null;
  // Y las fases por las que pasa la carrera con las ruedas en el suelo (H44a).
  const fasesEnElSuelo = new Set();
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
  const agujaAlDecir = [];
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
    /*
     * **Y se mira en el suelo**: al volar el botón se va en todos, que en el
     * aire no hay nada que frenar. Lo que distingue a un tipo de otro es si
     * se despide —o ya se fue— con las ruedas todavía en la pista (H44a).
     */
    const boton = document.querySelector('[data-hud="brakes-touch"]');
    const seVa = boton?.hidden || boton?.classList.contains("freno--se-va");
    if (frenoSeFue === null && seVa && s.onGround) frenoSeFue = o.indicada();
    if (s.onGround) fasesEnElSuelo.add(o.fase());
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
      if (op > 0.05 && texto && !dichos.includes(texto)) {
        dichos.push(texto);
        // Y con qué aguja salió cada uno, que es lo que se compara con su V (H38d).
        agujaAlDecir.push(`${texto} ${o.indicada().toFixed(1)}`);
      }
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
      enElAire = { v: s.airspeed, ias: o.indicada(), usado };
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
    fasesEnElSuelo: [...fasesEnElSuelo],
    porLaPista,
    // Lo que se dijo de por dónde se sale: la torre y la instructora.
    porDondeSeSale: Object.entries(o.dichoTodo?.() ?? {}).flatMap(([quien, claves]) =>
      claves
        .filter((k) =>
          /backtrack|ofreceInterseccion|\.tora|remontar|desdeLaInterseccion|backTaxi|sinRemontar/.test(k),
        )
        .map((k) => `${quien}: ${k}`),
    ),
    largoDePista: pista.length,
    // Lo que el propio juego calcula que le cuesta llegar a rotar, y su Vr:
    // es contra eso contra lo que hay que medir, no contra una fracción de la
    // pista. Ver `cabeEn`.
    carreraDeFicha: ficha.carreraHastaVr,
    // Lo que pesaba al soltar frenos: con la hoja de carga, lo de la hoja.
    masa: ficha.masa,
    vr: ficha.rotacion,
    fase: o.fase(),
    partida,
    alto,
    punta,
    desvio: +desvio.toFixed(0),
    enPistaPasos,
    destelloV1: +destelloV1.toFixed(2),
    dichos,
    agujaAlDecir,
    flechaDeTirar,
    usado,
    // Lo que se pidió decir en V1, y si este avión decide con ella (H37i).
    cantosDeV1: (o.cantados?.() ?? []).filter((c) => /^V one/.test(c)),
    // Y los ochenta nudos, que solo canta el tipo que los lleva (H44a).
    cantosDeOchenta: (o.cantados?.() ?? []).filter((c) => /^eighty knots/.test(c)),
    seSigueEnV1: o.avion().seSigueEnV1,
  };
});

console.log(
  `  ochenta nudos: ${despegue.cantosDeOchenta.join(" · ") || "nada apuntado"}` +
    ` · fases en el suelo: ${despegue.fasesEnElSuelo.join(" → ")}`,
);

console.log(`  masa al soltar frenos: ${Math.round(despegue.masa)} kg`);
console.log(
  `  por la pista (m del centro): entra en ${despegue.porLaPista.entra}, lo más atrás ${despegue.porLaPista.masAtras}, ` +
    `giro ${despegue.porLaPista.giro}, suelta frenos en ${despegue.porLaPista.suelta}` +
    ` · el plan: ${despegue.porLaPista.sale}` +
    ` · por dónde se sale, dicho: ${despegue.porDondeSeSale.join(" · ") || "nada"}`,
);
comprobar(
  "a todo gas el avión despega",
  despegue.enElAire !== null,
  despegue.enElAire
    ? `a ${despegue.enElAire.v.toFixed(1)} m/s tras ${despegue.enElAire.usado.toFixed(0)} m`
    : `no llegó a despegar: empezó ${despegue.partida.pista ? "en pista" : "fuera de pista"} en fase «${despegue.partida.fase}» con ${despegue.partida.queda} m por delante, ${despegue.partida.torcido}° torcido, ${despegue.partida.delEje} m del eje, a ${despegue.partida.v} m/s, subió ${despegue.alto.toFixed(0)} m en ${despegue.usado.toFixed(0)} m, punta ${despegue.punta.toFixed(1)} m/s, ${despegue.desvio} m de desvío máximo, ${despegue.enPistaPasos} fotogramas en pista, acabó ${despegue.acabo}`,
  "con el empuje mal el avión tardaba veinticinco segundos en rotar",
);
if (despegue.enElAire) {
  /*
   * **Y le sobra pista: la que le sobre a él, no la que le sobraría a una
   * avioneta.**
   *
   * Esto pedía menos del sesenta por ciento de la pista, y el sesenta por
   * ciento es una cifra de Pykasu: corre doscientos veinticinco metros, así
   * que en cualquier campo del juego le sobra de todo. El JAZ 120 corre mil
   * cuatrocientos, y en Tenerife Sur —tres mil ciento noventa y cinco— eso son
   * dos tercios largos de pista **y está bien**: un avión de fuselaje ancho se
   * come la pista que se come, y ésa es la lección.
   *
   * Lo que sí hay que comprobar es lo que este banco existía para comprobar:
   * que la carrera de verdad se parezca a la que dice su ficha —de esa cuenta
   * sale `cabeEn`, o sea a qué campos se le deja ir— y que quede asfalto por
   * delante al rotar.
   */
  comprobar(
    "y rota con pista todavía por delante",
    despegue.enElAire.usado < despegue.largoDePista - 200,
    `${despegue.enElAire.usado.toFixed(0)} m de ${despegue.largoDePista.toFixed(0)}`,
    "rotar en el último suspiro de asfalto no es despegar, es un susto",
  );
  /*
   * **Y rota cerca de su Vr.**
   *
   * Los metros no se pueden comparar directamente con `carreraHastaVr`: lo que
   * mide este banco empieza en el punto de espera e incluye la entrada en
   * pista y la alineación, que no son carrera. Lo que sí se puede comparar es
   * **a qué velocidad se va al aire**, que es un número del avión y no del
   * aeródromo.
   *
   * Y ahí hay un hallazgo que se queda apuntado: los tres aviones medidos
   * rotan entre un veinte y un treinta por ciento por encima de su Vr —36
   * contra 28 en la avioneta, 107 contra 86 en el de fuselaje ancho—, o sea
   * que la ayuda tira tarde. No es un fallo de la física: es el piloto
   * automático del peldaño, y se nota en metros porque la distancia va con el
   * cuadrado de la velocidad. Un treinta y cinco por ciento de margen deja
   * pasar eso y caza lo que de verdad importa, que es un avión al que no se le
   * levanta el morro hasta el final de la pista.
   */
  // En la aguja: la Vr es indicada, y a 40 °C la verdadera va un 6 % por encima (H38d).
  comprobar(
    "y rota cerca de su velocidad de rotación",
    despegue.enElAire.ias < despegue.vr * 1.35,
    `a ${despegue.enElAire.ias.toFixed(0)} m/s de indicada (${despegue.enElAire.v.toFixed(0)} de verdadera) con la Vr en ${despegue.vr} · ${despegue.enElAire.usado.toFixed(0)} m desde el punto de espera, y su ficha dice ${despegue.carreraDeFicha.toFixed(0)} m de carrera`,
    "irse al aire muy por encima de Vr alarga la carrera con el cuadrado de la velocidad",
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
    `destellos: ${despegue.agujaAlDecir.join(" → ") || "ninguno"} m/s de aguja, con la Vr en ${despegue.vr.toFixed(1)}`,
    "los dos momentos del despegue salían igual y no se distinguían",
  );
  /*
   * **Y en V1 se dice lo que es verdad en este avión** (H37i). El destello
   * sale en todos; «ya despegamos: seguí» —«V one» en el peldaño de cabina—
   * solo en los que deciden con V1, los multimotores de turbina. En un
   * monomotor no hay otro motor con el que seguir, y el bimotor de pistón
   * para a esa velocidad: allí se calla, y se apunta que se calló. Ver
   * `flight/lo-que-se-dice-al-despegar.ts`.
   */
  {
    const dicho = despegue.cantosDeV1.some((c) => /^V one→/.test(c));
    const callado = despegue.cantosDeV1.some((c) => /no decide con V1/.test(c));
    comprobar(
      despegue.seSigueEnV1
        ? "y en V1 se dice «seguí», que este avión decide con ella"
        : "y en V1 no se dice «seguí», que este avión no decide con ella",
      despegue.seSigueEnV1 ? dicho && !callado : callado && !dicho,
      despegue.cantosDeV1.join(" · ") || "nada apuntado en V1",
      "a 66 nudos el bimotor de pistón oía «ya despegamos: seguí», y su manual manda parar ahí",
    );
  }
  comprobar(
    "y en Vr aparece la flecha de tirar, que se entiende sin leer",
    despegue.flechaDeTirar,
    despegue.flechaDeTirar ? "salió" : "no salió",
    "el peldaño que no lee se quedaba sin saber qué hacer en ese segundo",
  );
  /*
   * **Y solo donde V1 decide** (H44a): en la avioneta, el fumigador y el
   * bimotor de pistón frenar sigue siendo lo que toca mientras quede pista, y
   * el botón se queda hasta que las ruedas dejan el suelo. Ver `pasadaLaV1`
   * en `flight/decide-con-v1.ts`.
   */
  if (despegue.seSigueEnV1)
    comprobar(
      "el freno se despide al pasar el punto de no retorno",
      despegue.frenoSeFue !== null && despegue.frenoSeFue > 15,
      despegue.frenoSeFue === null
        ? "no se fue"
        : `se fue a ${despegue.frenoSeFue.toFixed(1)} m/s`,
      "se iba también rodando por una calle, donde no hay V1 que valga",
    );
  else {
    comprobar(
      "y en el que no decide con V1, el freno se queda mientras haya ruedas en la pista",
      despegue.frenoSeFue === null,
      despegue.frenoSeFue === null
        ? "se quedó hasta volar"
        : `se fue en el suelo, a ${despegue.frenoSeFue.toFixed(1)} m/s`,
      "el botón se despedía en V1 también en el 172 y en el Seneca, que paran mientras quede pista",
    );
    comprobar(
      "y su carrera no pasa por «comprometido»: no hay «ya despegamos: seguí»",
      !despegue.fasesEnElSuelo.includes("comprometido"),
      despegue.fasesEnElSuelo.join(" → ") || "ninguna",
      "la tarjeta de «seguí» salía con la pista acabándose, y su manual para igual",
    );
  }
}

// ── En el aire ────────────────────────────────────────────────────────────

const enVuelo = await page.evaluate(async () => {
  const o = globalThis.__oga;
  /*
   * **Y se sueltan los mandos de verdad.**
   *
   * Lo que se comprueba aquí es que el avión siga subiendo con el gas a tope y
   * la palanca suelta, así que el piloto de la carrera tiene que soltarla: si
   * se queda puesto, lo que se mide es su tirón y no el avión.
   */
  o.pilotar(null);
  const c = o.controles();
  c.elevator = 0;
  /*
   * **Y se mira un rato, con el reloj del juego** (H25b): la altitud cada
   * décima de segundo hasta `MIRA` segundos de vuelo, no la velocidad
   * vertical de un instante. Ver la comprobación, abajo.
   *
   * Con el reloj del juego y no con el de pared, que es el número de verdad
   * (`reloj` en `src/dev/sondas.ts`): contando las vueltas del banco, lo que
   * se mide depende de cómo vaya la máquina.
   */
  const MIRA = 18;
  const t0 = o.reloj();
  // `estado()` es el estado vivo, no una copia: lo de ahora se lee ahora.
  const s0 = o.estado();
  const sueltoA = s0.heightAboveGround;
  const muestras = [{ t: 0, y: s0.position.y }];
  const tope = performance.now() + 90_000;
  while (performance.now() < tope) {
    await new Promise((r) => setTimeout(r, 100));
    const t = o.reloj() - t0;
    muestras.push({ t, y: o.estado().position.y });
    if (t >= MIRA) break;
  }
  const s = o.estado();
  return {
    fase: o.fase(),
    muestras,
    alto: s.heightAboveGround,
    sueltoA,
    ruta: o.ruta().length,
    /*
     * **Y los cantos de cabina de la carrera** (H44b): lo que se pidió por la
     * voz de cabina —«eighty knots», «V one», «rotate»— y lo que sonó. Se
     * miran aquí, dieciocho segundos después de irse al aire, para que
     * «rotate» haya tenido su turno.
     */
    cantosDeLaCarrera: (o.cantados?.() ?? [])
      .filter((c) => /^(eighty knots|V one|rotate)(→|:)/.test(c))
      .map((c) => c.replace(/ \[.*$/, "")),
    sonaronDeLaCarrera: (o.habladas?.() ?? []).filter((h) => / cabina\.(eightyKnots|v1|vr)$/.test(h)),
    tiradasDeLaCarrera: (o.descartadas?.() ?? []).filter((d) => / cabina\.(eightyKnots|v1|vr):/.test(d)),
  };
});
/*
 * **Que siga subiendo es una media, no un instante** (H25b).
 *
 * Esto pedía más de medio metro por segundo **cuatro segundos después** de
 * soltar, y cuatro segundos después de soltar es el peor momento para
 * mirar. El banco suelta a los quince metros con el morro alto —el JAZ 20,
 * a 27 m/s y subiendo a casi 8 m/s—, así que el avión compensado hace lo que
 * hace uno de verdad: baja el morro para recuperar su velocidad, se hunde un
 * poco en la oscilación larga (la fugoide) y luego sube estable. En la mesa,
 * sin ráfagas, con el viento de casa de Los Rodeos y como lo vuela este
 * banco, sube a 26 m, baja a 24 m, pasa por −0,7 m/s **justo a los cuatro
 * segundos**, y desde los diez sube a 2,4–2,9 m/s. Con las ráfagas
 * (`rafagas.ts`, sesenta semillas) ese instante pasaba el listón 5 veces de
 * 60; y salía igual en 0244a3f3 y en ccd58455, porque para este avión el
 * modelo de vuelo de los dos da la misma traza al bit. No era la tanda: era
 * dónde se miraba.
 *
 * Así que se mira lo que dice el nombre, con dos cosas:
 *
 * - **Sube**: la media entre los 8 y los 18 s de soltar —lo ganado en altitud
 *   partido por el tiempo, con el reloj del juego— pasa de medio metro por
 *   segundo, el listón de siempre (cien pies por minuto). Ahí la oscilación ya
 *   ha pasado: en la mesa, con ráfagas, de 1,6 a 3,2 m/s, mediana 2,5. El
 *   fallo que originó esto —el avión nivelado con el gas a tope— da cero.
 * - **Y no vuelve hacia la pista**: en los dieciocho segundos no baja más de
 *   tres metros de donde se soltó. Es el fallo de H21a, la ayuda bajando el
 *   morro cerca del suelo (−2,3 a −3,7 m/s entre 14 y 26 m), que la media de
 *   después no ve porque luego remonta. En la mesa, con ráfagas, lo más que
 *   baja hoy de donde se soltó es 1,1 m; con el modelo de antes de H21d, 42
 *   de 60 vuelos bajan más de tres metros, hasta 14,7. Lo que se le escapa
 *   de ese fallo lo caza sin ráfagas `subida-recien-despegado.test.ts`.
 *
 * Con la altitud y no con la altura sobre el suelo: lo que sube es el avión,
 * no el terreno de debajo.
 */
{
  const m = enVuelo.muestras;
  const fin = m[m.length - 1];
  const desde = m.reduce((a, b) => (Math.abs(b.t - 8) < Math.abs(a.t - 8) ? b : a));
  const sube = fin.t > desde.t + 5 ? (fin.y - desde.y) / (fin.t - desde.t) : NaN;
  const baja = m[0].y - Math.min(...m.map((x) => x.y));
  comprobar(
    "en el aire sigue subiendo con el motor a tope",
    sube > 0.5 && baja < 3,
    Number.isNaN(sube)
      ? `el reloj del juego solo llegó a ${fin.t.toFixed(1)} s de los 18`
      : `${sube.toFixed(1)} m/s de media de ${desde.t.toFixed(0)} a ${fin.t.toFixed(0)} s, ` +
          `${baja > 0.05 ? `bajó ${baja.toFixed(1)} m de donde se soltó` : "sin bajar de donde se soltó"} ` +
          `(a ${enVuelo.sueltoA.toFixed(0)} m), y a ${enVuelo.alto.toFixed(0)} m al final`,
    "soltando los mandos el avión se quedaba nivelado con el gas a tope, o volvía hacia la pista",
  );
}
/*
 * **Los cantos de cabina de la carrera suenan, y en su orden** (H44b): lo que
 * dice quien vigila al ver pasar la aguja —ochenta nudos, V1, rotar— por la
 * voz de cabina, en el peldaño donde canta la tripulación. Qué tipo dice cada
 * uno lo dicen `CANTOS_DEL_DESPEGUE` y `seSigueEnV1`: el JAZ 90 los tres.
 * Abajo no se pide ninguno por esa voz, y no se mira.
 */
{
  const ORDEN = ["cabina.eightyKnots", "cabina.v1", "cabina.vr"];
  const pedidos = enVuelo.cantosDeLaCarrera
    .map((c) => /→(cabina\.\w+)$/.exec(c)?.[1] ?? null)
    .filter((c) => c !== null);
  const sonaron = enVuelo.sonaronDeLaCarrera.map((h) => h.split(" ").pop());
  console.log(
    `  cantos de la carrera: ${enVuelo.cantosDeLaCarrera.join(" · ") || "nada apuntado"}` +
      ` · sonaron: ${enVuelo.sonaronDeLaCarrera.join(" · ") || "nada"}` +
      (enVuelo.tiradasDeLaCarrera.length ? ` · tiradas: ${enVuelo.tiradasDeLaCarrera.join(" · ")}` : ""),
  );
  if (TRAMO === "taguato-ruvicha" || pedidos.length) {
    const enOrden = pedidos.every((c, i) => i === 0 || ORDEN.indexOf(c) > ORDEN.indexOf(pedidos[i - 1]));
    // Los que tocan a este tipo: los ochenta, si los lleva; V1, si decide con ella; y rotar.
    const tocan = ORDEN.filter(
      (c) =>
        (c !== "cabina.eightyKnots" ||
          !enVuelo.cantosDeLaCarrera.includes("eighty knots: este avión no lo canta")) &&
        (c !== "cabina.v1" || despegue.seSigueEnV1),
    );
    const losTres = tocan.every((c) => pedidos.includes(c));
    comprobar(
      "y los cantos de cabina de la carrera suenan, y en su orden",
      despegue.enElAire !== null &&
        losTres &&
        enOrden &&
        sonaron.length === pedidos.length &&
        sonaron.every((c, i) => c === pedidos[i]),
      `tocan ${tocan.join(" → ")} · pedidos ${pedidos.join(" → ") || "ninguno"} · sonaron ${sonaron.join(" → ") || "ninguno"}`,
      "«eighty knots» no se había oído nunca en este banco: el peldaño de cabina no se volaba",
    );
  }
}
comprobar(
  "y la raya de rodaje desaparece, que volando no hay nada que rodar",
  enVuelo.ruta === 0,
  `${enVuelo.ruta} puntos de ruta`,
  "la raya se quedaba pintada en el suelo mientras se volaba",
);

// ── El informe ────────────────────────────────────────────────────────────

console.log(`\n  despegue · ${ESCENARIO} · ${TRAMO} · ${AVION}\n`);
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

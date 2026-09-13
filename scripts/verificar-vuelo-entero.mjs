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
  `http://localhost:${PUERTO}/?escenario=${ESCENARIO}&leccion=despegue` +
    `&tramo=${TRAMO}&avion=${AVION}`,
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
  const pista = o.pista();
  const rumboPista = (pista.heading * Math.PI) / 180;

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
  const VELOCIDAD_DE_CRUCERO = suyas.crucero ?? 50;

  /**
   * Palanca para mantener una velocidad, con un empujón opcional de altura.
   *
   * Si el avión va más deprisa de lo que toca, se tira y sube; si va más
   * despacio, se suelta y acelera. Es como se vuela de verdad y, sobre todo,
   * es lo único que **no puede entrar en pérdida por insistir**: cuanto más
   * cerca de la pérdida está, menos palanca pide.
   */
  const palancaPorVelocidad = (s, objetivo, extra = 0) =>
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
  const subirDeVerdad = (s) => {
    const base = palancaPorVelocidad(s, VELOCIDAD_DE_SUBIDA);
    const falta = Math.max(0, 3 - s.verticalSpeed);
    const extra =
      s.airspeed > VELOCIDAD_DE_SUBIDA ? Math.min(0.25, falta * 0.05) : 0;
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
    return s.airspeed < minima ? Math.min(0, mando) : mando;
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
  const porDelante = () => o.puntoDeFinal(-(pista.length + 2000));

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

  /** Cuánto se está del eje de la pista, en metros. Para la traza. */
  const desvio = (s) => {
    const r = o.pista();
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
    const r = o.pista();
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
  let ladoAlEstarCerca = Infinity;
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
  /** Dónde y cómo se tocó: del eje, pasado el umbral y a qué velocidad. */
  let tocoDesviado = 0;
  let tocoPasadoElUmbral = 0;
  let tocoA = 0;
  const fases = new Set();
  /** Todas las tarjetas que llegaron a verse. Para saber qué faltó. */
  const vistas = new Set();
  /** Cuándo se rompió, si se rompió. */
  let seRompio = 0;
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
      if (!seRompio) seRompio = t;
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
      const r = o.pista();
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
      if (alCoche > lejosDelCoche) {
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
    if (i % 20 === 0) {
      linea.push(
        `${t.toFixed(0)}s ${etapa}/${fase} ${s.airspeed.toFixed(0)}m/s gas ${c.throttle.toFixed(1)} ${alto(s).toFixed(0)}m ${s.onGround ? "tierra" : "aire"} ${s.onRunway ? "enPista" : "fuera"} ${desvio(s).toFixed(0)}m umbral ${alUmbral(s).toFixed(0)}m coche ${alCocheAhora < 0 ? "—" : `${alCocheAhora.toFixed(0)}/${ladoDelCoche.toFixed(0)}`} ${tarjeta.dibujo || "—"}`,
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
      const subiendo = alto(s) < altoQueToca - 15;
      c.throttle = subiendo
        ? 1
        : Math.max(
            0.3,
            Math.min(1, 0.55 + (VELOCIDAD_DE_CRUCERO - s.airspeed) * 0.04),
          );
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
        const p = alto(s) > SEGURO_PARA_GIRAR ? o.puntoDeFinal(3000) : null;
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
      const r = o.pista();
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
      const quiere = falta < 60 ? 24 : 30;
      c.throttle =
        s.airspeed < quiere
          ? Math.min(1, c.throttle + 0.05)
          : Math.max(0, c.throttle - 0.05);
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
      const tx = r.x + fx * (along + 300);
      const tz = r.z + fz * (along + 300);
      c.aileron = alPunto(s, tx, tz);
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
        etapa = "frenar";
      }
    } else if (etapa === "frenar") {
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
    gafas: o.gafas?.() ?? null,
    segundos: +t.toFixed(1),
    veces,
    vueltas: i,
    fases: [...fases].join(" "),
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
    mudoMaximo: +mudoMaximo.toFixed(1),
    mudoDonde,
    vueltaMetros: Math.round(vueltaMetros),
    sinRaya: +sinRaya.toFixed(1),
    sinRayaDonde,
    sinRayaPrimero,
    lejosDelCoche: Math.round(lejosDelCoche),
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

comprobar(
  "el avión parado tiene las ruedas en el suelo",
  vuelo.flota !== null && Math.abs(vuelo.flota) < 0.25,
  vuelo.flota === null
    ? "no se pudo medir"
    : `${vuelo.flota > 0 ? "flota" : "hundido"} ${Math.abs(vuelo.flota).toFixed(2)} m`,
  "el modelo se bajaba lo que mide él y no lo que el juego lo había subido",
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

comprobar(
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
comprobar(
  "se toca cerca del eje y dentro de la pista",
  vuelo.toco > 0 && Math.abs(vuelo.tocoDesviado) < 9,
  vuelo.toco
    ? `a ${Math.abs(vuelo.tocoDesviado).toFixed(1)} m del eje, ${vuelo.tocoPasadoElUmbral} m pasado el umbral, a ${vuelo.tocoA} m/s`
    : "no llegó a tocar",
  "en una pista de dieciocho metros, «aterrizó» sin decir a cuánto del eje no significa nada",
);

comprobar(
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
  comprobar(
    "y con el primer aterrizaje bueno te llevás las gafas de sol",
    vuelo.gafas?.ganadas === true && vuelo.gafas?.puestas === true,
    vuelo.gafas
      ? `ganadas ${vuelo.gafas.ganadas ? "sí" : "no"}, puestas ${vuelo.gafas.puestas ? "sí" : "no"}`
      : "el juego no sabe decirlo",
    "«quiero ser piloto con las gafas de sol»",
  );
}

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

/**
 * **La tercera escena del modo inicio, el primer vuelo de pasaje de Ara, de
 * punta a punta.** Ver `src/flight/inicio-pasaje.ts`, que es la escena, y
 * `src/flight/vuelo-de-linea.ts`, que es la tripulación que lleva el avión.
 *
 * Hermano de `verificar-inicio.mjs` y `verificar-inicio-2.mjs`. Las pruebas de
 * unidad vuelan la escena con una tripulación de mentira y la tripulación
 * con el modelo de Guyrami sobre un mundo de mentira; esto vuela las dos
 * juntas en el navegador, sobre el mundo de verdad: de un puesto de Los
 * Rodeos a uno de La Palma, en el JAZ 90, sin tocar ni un mando.
 *
 * ## Qué mira
 *
 * - **Que se abre**: con `?inicio=3`, y desde el hangar, con su ficha al lado
 *   de las dos de Jazlyn.
 * - **Que se empieza sentado en la ventanilla**, en el puesto y con los
 *   motores parados, sin relojes ni mandos de pilotar en la pantalla.
 * - **Que cada cosa pasa en su momento**, en el orden de un vuelo de verdad,
 *   y que no se salta nada en un vuelo normal.
 * - **Que la tripulación no entra en pista** antes de «tripulación, sentados
 *   para el despegue», y que no se arranca antes de armar los toboganes.
 * - **Que se despega por el eje, se toca en la zona de toma y despacio**, y
 *   se llega al puesto; sin percance.
 * - **Que nada se pisa y no habla nadie más**: ni la radio, ni las cajas de la
 *   cabina de mando, ni la instructora. Lo que la boca tiró de otros, se
 *   cuenta aparte: se tiró porque la boca era de la escena.
 * - **Que lo de la ventanilla se dice**, con su historia, y Ara contesta. El
 *   Teide, sin falta: es lo más bonito de la ruta.
 * - **Que se dibuja qué mirar** —el ala, el cinturón, el motor, las nubes, la
 *   ventanilla—.
 * - **Que se ve por fuera lo que se cuenta** (18-10-2026): el rodaje, el
 *   despegue desde la orilla de la pista, el giro, una vuelta alrededor, el
 *   ala y la toma, cada corte con su fundido y **ninguno a media frase**; y
 *   Ara con la cara contra el cristal para ver el motor y el mar.
 * - **Que la tripulación da la demostración de seguridad** entera y en su
 *   orden, antes de entrar en la pista, y que **las nubes se explican**: la
 *   comandante para todos y la tripulante a Ara, con su dibujo.
 * - **Que sale la ventanita** con los dibujos de lo que se explica, y con
 *   **las ilustraciones** de lo que pasa (punto 278): el embarque, la cabina
 *   llena, la tripulante, Ara contra el cristal y la comandante; y que las
 *   que llevan cielo por la ventanilla no salen con el avión en tierra.
 * - **Que no hay ratos largos callados**: medido con el reloj de la escena,
 *   que es el del vuelo sin acelerar.
 * - **Que desde el asiento de Ara se ven el ala y el motor**, contado con
 *   rayos por el cristal en el modelo cargado.
 * - **Que el cuaderno no apunta nada de pilotaje** y sí el sello de La Palma,
 *   de visita, y que el botón del final vuelve al hangar.
 * - **Y que en un teléfono apaisado**, con el dedo, la tarjeta cabe y no hay
 *   mandos de pilotar.
 * - **El kit de viaje** (punto 275): que la tripulante lo trae en un tramo
 *   tranquilo de la parte alta de la bajada, que en el vuelo se abre y se
 *   juega primero **la luz verde entera** —a la velocidad de verdad, como un
 *   niño que hace caso a lo que brilla—, que acaba antes de los diez mil pies,
 *   que al acabar **suena el trozo de la canción**, agachado si alguien habla;
 *   que después, con lo que quede, **se ponen piezas de Armá tu avión** —nunca
 *   con la megafonía pausando— y Ara cuenta alguna; y que **se recoge al
 *   empezar la llegada**, cruzando los diez mil pies bajando (19-10-2026), con
 *   el juego que esté abierto y la canción yéndose con un fundido si todavía
 *   sonaba. La luz primero porque es la que tiene que acabar antes de los diez
 *   mil pies y el rato para jugar cambia de un vuelo a otro —espera a que no
 *   hable la megafonía—: con el avión entero delante, un rato corto la dejaba
 *   a medias, que es lo que le pasa a quien juega a los dos pero no lo que se
 *   quiere medir (24-10-2026). El avión entero, con sus luces y su despegue,
 *   se mira en las tres pantallas. Y en el teléfono, la tablet del aula y el
 *   portátil, que cabe sin tapar la tarjeta ni los botones, **se juegan los dos juegos
 *   con el dedo** —arrastrando las piezas y las luces— o con el ratón, y que al
 *   ganar la torre suena la canción, se agacha con quien habla y se va al
 *   guardar el kit.
 * - **Luz verde** (punto 304), en cada pantalla y en tres peldaños —el
 *   teléfono en el de abajo, la tablet en el de las cifras y el portátil en el
 *   de cabina, con su ronda de noche—: que se gana haciendo caso a lo que
 *   brilla, que la roja manda al avión al circuito sin aterrizar y se celebra,
 *   y que **el avión no alabea en base ni en final** —medido en el dibujo: lo
 *   que miden sus alas en la pantalla—, y sí en el resto del circuito.
 * - **El hilo musical**: que suena en el embarque por el altavoz del techo,
 *   en el bus de la música, que se calla con la primera megafonía y no vuelve
 *   subiendo ni arriba; y la de llegada (punto 302), que empieza bajando, por
 *   debajo de los diez mil pies, sigue por la rodadura, se calla con cada
 *   anuncio y **no suena en el puesto ni con los motores apagados**.
 * - **Lo que se oye cambiar se cuenta** (puntos 284 y 297): cada cambio de
 *   gas que nota Ara pasó de verdad un poco antes —la tripulación lo apunta—
 *   y se oye: el gas del motor que suena, medido en la mezcla, cambia hacia
 *   donde dice Ara. La explicación del gas de subida, pasados los diez mil
 *   pies; la de la aproximación, ya en tierra. Y el plop de los oídos, explicado
 *   una vez. Y cuánto rato callado queda en la bajada.
 * - **Que lo que se nombra del paisaje está a la vista cuando se nombra**
 *   (18-10-2026, puntos 281 y 286): cada sitio que nombra la escena —la isla,
 *   la costa, el mar, lo señalado por la ventanilla— se mide con lo que se
 *   pinta en ese momento: dentro de la imagen, por el cristal si se mira por
 *   la ventanilla, sin el ojo metido en una nube y sin nube densa por medio,
 *   contada a pasos con la densidad del dibujo y lo que deja de ella su
 *   desvanecido con la distancia (24-10-2026: ver `paisajeParaBanco`). Con la
 *   captura de ese momento.
 * - **Que la foto de una historia no sale sin su voz** (punto 287), que dentro
 *   de la nube el meneo se cuenta en el momento (280), que al salir por debajo
 *   de las nubes se cuenta el techo (295), y los dos planos nuevos: **el tren
 *   desde abajo** (298) y **el señalero** (301).
 * - **Que lo que se explica sale en grande y no tapa lo que se enseña**
 *   (punto 305): cada dibujo de la ventanita, de un cuarto del ancho como
 *   poco cuando ya está puesto y sin el kit abierto —en las tomas de cerca
 *   del ala y del tren, que las llena el avión, no menos que la ventanita de
 *   antes—; y la lámina nunca encima
 *   de lo nombrado —el sitio de los últimos veinte segundos, donde cae en la
 *   imagen mientras la lámina está puesta—, de la tarjeta de quien habla ni
 *   de los botones.
 * - **Que Ara se duerme un rato** (punto 304): arriba y sin nada que contar,
 *   bosteza, la pantalla se funde a Ara durmiendo y después soñando, con el
 *   mapa de la ruta en la ventanita —las islas con su costa de verdad (292) y
 *   el avión avanzando—; el vuelo pasa deprisa y **de verdad** —el avión sigue
 *   su ruta, no salta—, y Ara se despierta con algo que pasa —el *ding* de la
 *   luz que se apaga con el «ya estamos arriba», que se oye entero, o la
 *   tripulante antes de bajar—, sin perder nada de seguridad. Y que se nota
 *   (19-10-2026): `SIESTA_KM` de ruta como poco, el avión del mapa bien movido y
 *   el sitio donde se durmió, atrás. Lo que pasa durmiendo no cuenta como
 *   silencio. Con capturas del fundido, del sueño con el mapa a mitad de la
 *   siesta y del despertar.
 * - **La llegada a La Palma** (puntos 300 y 303): que Ara nota la vuelta en
 *   la pista cuando el avión de verdad gira —medido con su rumbo respecto a
 *   la pista y lo que se aparta del eje—, con el avión visto por fuera, y que
 *   la comandante la explica al dejar la pista; si no hay vuelta, que no se
 *   cuenta. Que en el puesto se oyen hebillas y gente levantándose con la luz
 *   del cinturón encendida, que Ara no se suelta hasta que se apaga —el
 *   cartel de la pantalla— y que lo que sabe hacer la tripulante sale una vez
 *   y sin pisar a nadie.
 * - **El toque en tierra** (puntos 296 y 299): que se toca en su sitio —en la
 *   zona de toma y sin golpe duro—, que en cuanto las ruedas tocan se corta
 *   al ala y **se ven subir los aerofrenos** —con la toma a ×1, que es como la
 *   ve quien juega—, que se vuelve a la orilla de la pista a ver frenar, y que
 *   Ara cuenta para qué sirven en el primer rato tranquilo rodando, sin pisar a
 *   nadie. Con capturas del ala y de los paneles desde el asiento de Ara.
 * - **El baño de Ara** (punto 293): la luz manda, y cuando se apaga, se puede.
 *   Que Ara cuenta en el embarque que fue antes de subir, que lo pide rodando
 *   con la luz encendida y no se levanta, y que si va es con el cartel de la
 *   pantalla apagado de que se va a que vuelve; si no hubo rato, que espera a
 *   aterrizar con la luz encendida. Y se escribe cuándo se enciende y se
 *   apaga la luz en todo el vuelo.
 *
 * Sin voces del sistema —el banco no las tiene, como el Brave de Enrique—,
 * con las tomas del pack: cada frase dura lo que dura su grabación, y **todo
 * lo que dice la escena tiene que haberse oído**. Con el reloj del juego
 * acelerado —`OGA_VECES`, doce por defecto—, que el vuelo entero son unos
 * treinta y cinco minutos; mientras habla la escena el juego va a su ritmo,
 * que lo que se oye no se acelera (ver `frame` en `game.ts`), así que el banco
 * tarda unos diez minutos.
 *
 * **Las frases nuevas sin grabar** —las del 18-10-2026, hasta que se graben—
 * no suenan: esperan el rato de leerlas, y el banco las cuenta aparte. Lo que
 * tiene toma en el pack tiene que sonar entero.
 *
 * Uso: `node scripts/verificar-inicio-3.mjs`
 *   `OGA_GPU=1` con la tarjeta de verdad; `OGA_FOTOS=carpeta` saca capturas
 *   de cada momento nuevo —Ara contra el cristal, el cinturón, el rodaje, el
 *   despegue, el giro, la vuelta, el ala, la toma, la ventanita y sus
 *   ilustraciones—, con el
 *   renderer en el nombre; `OGA_SIN_HANGAR=1` se salta la ficha del hangar;
 *   `OGA_TOPE=segundos` cambia el tope de pared; `OGA_VOLCADO=fichero` deja
 *   lo dicho y los tramos en un JSON; `OGA_SIN_NUBES=1` vuela sin el mar de
 *   nubes, para ver nombrado con su toma lo que con él queda tapado: lo que
 *   se espera de un vuelo con nubes no vale ahí;
 *   `OGA_SIN_JUGAR=1` no abre el kit en vuelo, para que las capturas de lo
 *   que se nombra bajando salgan sin él delante; y `OGA_SOLO_LAMINA=1` solo
 *   mira la lámina con el kit que se abre y se mueve, en un minuto; y
 *   `OGA_SOLO_ESQUEMAS=1`, solo los esquemas, puestos uno a uno.
 *
 * **Los esquemas de lo que se explica** (punto 311): que cada dibujo que ya
 * tiene ilustración —el oído, las máscaras, lo alto…— la enseña a ella y no
 * al dibujo, en grande, entera y sin pisar la tarjeta ni los botones: en el
 * vuelo, los que salen, y sin volar, todos, puestos uno a uno en la escena,
 * con la torre de «Luz verde». Con `OGA_FOTOS`, el oído, las máscaras, lo
 * alto y la torre en la lámina.
 *
 * **El modo rápido ⏩** (19-10-2026): la ronda de siempre mira que el botón
 * sale solo cuando toca —en el aire, nunca en tierra, ni con Ara durmiendo,
 * ni desde que empieza la llegada— y no lo pulsa, para seguir midiendo el
 * vuelo sin adelantar. Con `OGA_ADELANTAR=1` lo pone **una vez, en cuanto
 * sale**, como quien se aburre, y lo deja puesto: mira que el vuelo corre en
 * los ratos callados y se para antes de cada cosa que se cuenta, que por
 * debajo de los diez mil pies bajando no corre nunca —ahí se apaga solo y el
 * botón se va— y mide lo que cuesta: mientras corre, el reloj del juego vuelve
 * a ×1 para que lo que se ve sea lo de quien juega —el modo a sus veces, con
 * el mundo pintado—, y se cuentan los fotogramas, los lentos y las teselas que
 * van bajando. Y al final, cuánto dura el vuelo para quien juega y cuánto de
 * él es la llegada a su paso: el reloj de quien juega, ver
 * `relojDeQuienJuega` en `game.ts`.
 *
 * **La ventanilla viva** (19-10-2026): que sale el aro suave sobre algo que
 * se puede tocar y Ara invita a tocar una vez; que un toque de verdad —un
 * clic en la pantalla— sobre lo que se ve por el cristal de Ara lo cuenta,
 * con el Teide si se ve; que un toque sobre algo tapado —por la nube o por el
 * monte— no cuenta nada, ni dentro de la nube con la ventanilla blanca; que
 * un toque mientras habla alguien no le pisa; y que al llegar, con los
 * motores parados, sale el cuaderno de viaje con los sellos de lo visto y sus
 * huecos. Con `OGA_FOTOS`, el toque en el Teide y el cuaderno. Y en el
 * teléfono apaisado, que el cuaderno cabe. Lo que se toca aquí es lo de
 * arriba —el Teide, La Gomera, el mar de nubes, el motor y el ala—: la isla
 * de llegada y Mazo los cuenta la escena, que es lo que miran las demás.
 *
 * **Las salidas y lo que se pregunta después** (puntos 312 y 313): que la
 * demostración dice las salidas que lleva el avión —las de su hoja de tipo,
 * y las puertas del modelo—, que al decirlas Ara se asoma al pasillo y se ve
 * el letrero «EXIT» de la más cercana, entero, sin nada delante y sin la
 * lámina encima, con las tiras del suelo, y que lo de las máscaras y la
 * salida sobre el ala se pregunta en la revisión, antes del despegue. Y que
 * la comandante cuenta rodando por qué se sale hacia el este.
 *
 * **La demostración con gracia y el silbo** (puntos 294 y 288, 24-10-2026):
 * el vuelo se hace con una de las formas con gracia de la demostración
 * —`OGA_DEMOSTRACION=ventanilla|examen|primeraVez|sobria`, `examen` por
 * defecto—, aunque sus frases esperen toma: en el juego no saldría hasta
 * grabarlas. Se mira que la entrada va detrás de la intro y la despedida
 * detrás del modo avión, sin pisar a nadie; que las instrucciones suenan
 * igual, las mismas tomas grabadas en el mismo orden; y que si Ara contestó a
 * la historia del silbo, pregunta por las otras islas en la bajada y la
 * tripulante le contesta en persona detrás, y si no, que no se pregunta.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium, devices } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

// Uno propio, que otro banco puede estar corriendo a la vez: `OGA_PUERTO` para otro.
const PUERTO = Number(process.env.OGA_PUERTO ?? 5397);
const FOTOS = process.env.OGA_FOTOS ?? null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const VECES = Number(process.env.OGA_VECES ?? 12);
/** La forma de la demostración con la que se vuela. Ver la cabecera. */
const DEMOSTRACION = process.env.OGA_DEMOSTRACION ?? "examen";
/** Si se pone el modo rápido ⏩ en cuanto sale. Ver la cabecera. */
const ADELANTAR = process.env.OGA_ADELANTAR === "1";
/** **Lo que tiene que adelantar la siesta, como poco**, km por la ruta: que al despertar se note. */
const SIESTA_KM = 25;
/** Tope de pared: el vuelo son unos treinta y cinco minutos de reloj del juego. */
const TOPE_S = Number(process.env.OGA_TOPE ?? 1800);

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "warn",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args:
    process.env.OGA_GPU === "1"
      ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
      : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => resultados.push({ nombre, ok: !!ok, detalle });

const renderer = (page) =>
  page.evaluate(() => {
    const c = document.querySelector("#lienzo");
    const gl = c?.getContext("webgl2") ?? c?.getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "desconocido";
  });

async function foto(page, nombre) {
  if (!FOTOS) return;
  const r = await renderer(page);
  const corto = /swiftshader/i.test(r) ? "swiftshader" : /intel/i.test(r) ? "intel" : /nvidia/i.test(r) ? "nvidia" : "otro";
  const ruta = `${FOTOS}/inicio-3-${nombre}-${corto}.png`;
  await page.screenshot({ path: ruta });
  console.log(`  📷 ${ruta}  —  ${r}`);
}

/** Lo que se ve de la escena, de una vez. */
const leer = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const i = o?.inicio?.();
    const s = o?.estado?.();
    const visible = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return !el.closest("[hidden]") && cs.visibility !== "hidden" && cs.display !== "none" && r.width > 2 && r.height > 2;
    };
    return {
      inicio: i ?? null,
      pos: s ? { x: s.position.x, y: s.position.y, z: s.position.z } : null,
      velocidad: s?.airspeed ?? 0,
      enTierra: s?.onGround ?? true,
      enPista: s?.onRunway ?? false,
      motor: o?.controles?.()?.engineOn ?? null,
      // El gas con el que suena el motor ahora, el de la mezcla: ver `gasDelMotor` en `audio/ruidos.ts`.
      gasQueSuena: o?.ruidos?.()?.niveles?.gasDelMotor ?? null,
      fase: o?.fase?.() ?? "",
      percance: o?.percance?.() ?? null,
      mirar: document.querySelector("#inicio [data-mirar]")?.getAttribute("data-mirar") ?? null,
      cara: document.querySelector("#inicio .inicio__cara")?.getAttribute("class") ?? null,
      dice: document.querySelector("#inicio .inicio__dice")?.textContent ?? "",
      conPasaje: document.documentElement.classList.contains("con-pasaje"),
      relojes: visible(".hud__izquierda") || visible(".hud__derecha"),
      mandos: visible("#tactil [data-touch='stick']") || visible("#tactil [data-touch='throttle']"),
      tarjeta: visible("#inicio .inicio__tarjeta"),
      // Lo que la lámina no puede tapar: la tarjeta de quien habla y los botones. Ver `laminas`.
      noSeTapa: [...document.querySelectorAll("#inicio .inicio__tarjeta, #hud button, #kit button, .kit__panel")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return !el.closest("[hidden]") && getComputedStyle(el).visibility !== "hidden" && r.width > 2 && r.height > 2;
        })
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { que: el.className?.baseVal ?? el.className ?? el.tagName, left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        }),
      pantalla: { ancho: innerWidth, alto: innerHeight },
      // El cartel del cinturón de la cabina: encendido o no. Ver `ponerCinturon` en `ui/hud.ts`.
      cartel: !(document.querySelector('[data-hud="cinturon"]')?.hidden ?? true),
      // Y los golpes sueltos que han sonado desde la vez anterior: las hebillas, la gente.
      tocados: o?.ruidosTocados?.() ?? [],
      // El botón ⏩: si se ve y si está pulsado, y las teselas que van bajando.
      adelantar: visible('[data-hud="adelantar"]'),
      adelantarPulsado: document.querySelector('[data-hud="adelantar"]')?.getAttribute("aria-pressed") === "true",
      teselasBajando: o?.teselas?.()?.bajando ?? null,
      // La canción de la luz verde: lo que pide el kit y lo que suena. Ver `audio/cancion.ts`.
      cancion: o?.cancion?.() ?? null,
    };
  });

/** Si dos cajas en píxeles de pantalla se pisan. */
const sePisan = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * **Lo menos que mide la lámina grande**, en fracción del ancho, según la
 * toma: un cuarto, y en las de cerca del ala y del tren, que las llena el
 * avión, la ventanita de antes. Ver la comprobación del vuelo.
 */
const minimoDeLaLamina = (plano) => (plano === "fuera-ala" || plano === "fuera-tren" ? 240 / 1280 : 0.25);
/**
 * Y medido en superficie (punto 311): una de 4:3 de igual superficie que una
 * de 3:2 de un cuarto del ancho mide un 94 % de ese ancho. Ver la comprobación
 * del vuelo; los esquemas uno a uno miden con la misma regla.
 */
const anchoMinimoDeLaLamina = (plano, proporcion) => minimoDeLaLamina(plano) * Math.sqrt(Math.min(1, (proporcion ?? 1.5) / 1.5));

/**
 * **Lo que tarda la lámina en asentarse**, ms: la que sale con la cabeza de
 * Ara todavía moviéndose —del motor a la ventanilla— se coloca con el sitio
 * que deja el cristal en ese instante, y crece en el vistazo siguiente en
 * que cabe bastante más grande, que es cada 2,2 s (`CRECE_CADA` en
 * `ui/ventana-de-historia.ts`). Con un poco de holgura para el vistazo.
 */
const ASIENTA_LA_LAMINA = 3200;

/** Los momentos de un vuelo normal, en su orden. Ver `GUION_DEL_PASAJE`. */
const MOMENTOS = [
  "ventanilla",
  "banoAntes",
  "cinturon",
  "puertas",
  "motores",
  "bienvenida",
  "demostracion",
  "demoSalidas",
  "demoEquipo",
  "revision",
  "espera",
  "despegue",
  "carrera",
  "volando",
  "nubes",
  "nubesRespuesta",
  "arriba",
  "servicio",
  "tcpNubes",
  "bajada",
  "oidos",
  "kit",
  "kitRecoger",
  "techo",
  "isla",
  "aproximacion",
  "tcpAterrizaje",
  "flaps",
  "aterrizando",
  "toma",
  "llegada",
  "impacientes",
  "seLevantan",
  "luz",
  "suelto",
  "gracias",
  "puesto",
];

/**
 * **Los dibujos que ya salen con su ilustración** (punto 311), y el nombre del
 * fichero que tiene que salir: el suyo, o el de la historia que cuenta lo
 * mismo. Ver `ilustracionDelDibujo` en `src/ui/ilustraciones.ts`.
 */
const CON_ILUSTRACION = {
  mascara: "ilustraciones/mascara",
  nube: "ilustraciones/nube",
  frio: "ilustraciones/frio",
  oido: "ilustraciones/oido",
  alto: "ilustraciones/alto",
  meneo: "ilustraciones/meneo",
  chaleco: "ilustraciones/chaleco",
  maletero: "ilustraciones/maletero",
  islas: "historias/teide",
  estrellas: "historias/taburiente",
};
/** Si lo puesto en la lámina es la ilustración que le toca a ese dibujo. */
const esSuIlustracion = (clave, fichero) => !!fichero && new RegExp(`${CON_ILUSTRACION[clave]}[-.][^/]*webp`).test(fichero);

/** Lo que tiene toma en el pack: lo demás, hasta grabarlo, se lee. */
const GRABADAS = new Set(
  ["ara", "comandante", "tripulacion-canarias"].flatMap((v) =>
    Object.keys(JSON.parse(readFileSync(`data/voces/${v}/manifiesto.json`, "utf8")).piezas ?? {}),
  ),
);

/**
 * **El rato más largo callado en el aire**, s de escena. En las pruebas de
 * unidad, con lo que dura cada frase, sale de 65 s; aquí las frases nuevas
 * sin grabar duran solo el rato de leerlas —seis segundos como mucho—, y los
 * huecos crecen un poco.
 */
const CALLADO_COMO_MUCHO = 85;

/** Lo que calla la escena en cada corte de cámara, s de escena. Ver `CORTE_DE_PLANO`. */
const CORTE = 1.1;

/** Las claves que dice la escena y que no empiezan por `inicio.`: los anuncios y la ventanilla. */
const DE_LA_ESCENA = /^(inicio\.|comandante\.|tripulacion\.|ventanilla)/;

async function elVuelo() {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-PY" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.goto(`${BASE}/?inicio=3`);
  await page.bringToFront();
  try {
    await page.waitForFunction(() => !!globalThis.__oga?.inicio?.()?.estado, null, { timeout: 180_000 });
  } catch {
    comprobar("el juego arranca en la escena de pasaje", false, errores.join(" · ") || "sin __oga");
    await ctx.close();
    return;
  }
  // La demostración de este vuelo, antes de que empiece: ver `DEMOSTRACION`.
  await page.evaluate((f) => globalThis.__oga.demostracion?.(f === "sobria" ? "sobria" : f), DEMOSTRACION);
  // El primer toque, que deja sonar algo.
  await page.keyboard.press("ShiftLeft");
  await page.waitForFunction(() => globalThis.__oga.inicio().vista?.startsWith("pasaje"), null, { timeout: 60_000 }).catch(() => {});
  const primero = await leer(page);
  const avion = await page.evaluate(() => globalThis.__oga?.avion?.().id ?? null);
  comprobar(
    "arranca sentado en la ventanilla, en el puesto de Los Rodeos y con los motores parados",
    primero.inicio?.escena === "pasaje" &&
      primero.enTierra &&
      primero.motor === false &&
      primero.inicio?.tripulacion?.tramo === "puerta" &&
      primero.inicio?.vista === "pasaje-izquierda" &&
      avion === "jaz-90",
    `${primero.inicio?.escena} · ${avion} · motor ${primero.motor} · ${primero.inicio?.tripulacion?.tramo} · vista ${primero.inicio?.vista}`,
  );
  comprobar(
    "sin relojes ni mandos de pilotar, y con la tarjeta de la escena",
    primero.conPasaje && !primero.relojes && !primero.mandos && primero.tarjeta,
    `con-pasaje ${primero.conPasaje} · relojes ${primero.relojes} · mandos ${primero.mandos} · tarjeta ${primero.tarjeta}`,
  );
  const cuadernoAntes = primero.inicio?.cuaderno ?? null;
  if (process.env.OGA_SIN_NUBES) await page.evaluate(() => globalThis.__oga.ponerNubes(null));
  const veces = await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
  console.log(`  reloj del juego ×${veces}`);

  const tramos = [];
  const miradas = new Set();
  /** Los planos que de verdad se vieron, y lo más que tapó el velo. Ver `camaraDeLaEscena`. */
  const vistos = new Set();
  let veloMaximo = 0;
  const ventanitas = new Set();
  /** Las ilustraciones con cielo por la ventanilla que salieron con el avión en tierra: ninguna. */
  const ilustradasEnTierra = new Set();
  let asientoDeAra = null;
  const caras = new Set();
  const fotos = new Set();
  let entroEnPista = null;
  let arrancoCon = null;
  let masDeLadoEnLaCarrera = 0;
  let percance = null;
  let sello = null;
  let conversacion = null;
  let ultimo = null;
  // El hilo musical: lo que suena en cada rato. Ver `audio/hilo-musical.ts`.
  const musica = {
    embarque: null,
    callada: null,
    // Lo que suena después de dejar el puesto y antes de la última bajada: nada.
    enVuelo: [],
    // La de llegada: dónde empieza, si suena rodando al puesto, con la megafonía o en el puesto.
    empieza: null,
    rodandoAlPuesto: 0,
    conMegafonia: [],
    enElPuesto: [],
  };
  // El gas que suena, y la altitud, con la hora de la escena: para lo que se oye cambiar.
  const oido = [];
  const altitudes = [];
  // El kit de viaje: cuándo llega, qué se juega y cómo acaba. Ver `flight/kit-de-viaje.ts`.
  /*
   * `antes` es lo último que se leyó del kit sin recoger —abierto y con qué
   * juego—, y `alRecoger`, eso mismo justo antes de recogerlo: lo que tenía
   * delante quien jugaba cuando vino la tripulante.
   */
  const kit = { dadoEn: null, tramo: null, jugado: false, abiertoEnLaFinal: false, botonEnLaFinal: false, recogido: false, recogidoEn: null, pausado: 0, abiertoTrasGuardar: false, aUno: false, fotogramas: false, antes: null, alRecoger: null };
  /*
   * **Armá tu avión en el vuelo, después de la luz verde** (24-10-2026): cuándo
   * se eligió, lo que se puso —una pieza cada dos segundos y medio como poco,
   * como quien mira dónde va la siguiente, y nunca con la megafonía pausando—,
   * las lecturas pausadas mientras se armaba y lo que se puso entre dos de
   * ellas, que tiene que ser nada; y hasta dónde se llegó.
   */
  const armando = { elegidoEn: null, arrastres: 0, ultimo: 0, puestas: [], antes: null, pausado: 0, conPausa: 0, fases: new Set(), despegados: 0, libre: 0, tAnt: null };
  /*
   * **La luz verde en el vuelo** (19-10-2026): se juega entera, a la velocidad
   * de verdad y como un niño que hace caso a lo que brilla —toca el avión y la
   * luz un segundo y medio después de que se encienda la ayuda—, y se mira
   * dónde acaba, la canción que suena después, cómo se agacha cuando alguien
   * habla y cómo se va cuando la tripulante recoge el kit.
   */
  const torre = { abierta: null, fin: null, brilla: null, toques: 0, muestras: [], empieza: null, alRecoger: null, trasRecoger: [] };
  // Lo nombrado del paisaje, medido con lo que se pinta cuando se nombra. Ver `paisajeParaBanco`.
  const nombrados = [];
  let vistosNombrados = 0;
  // Las ilustraciones de las historias que salieron sin su voz sonando: ninguna. Ver el punto 287.
  const fotosMudas = new Set();
  let fotosConVoz = 0;
  // Dentro de la nube, el meneo: si empezó con el avión metido en ella.
  let meneoEnLaNube = null;
  // La siesta de Ara, mirada de cerca en cuanto bosteza. Ver `mirarLaSiesta`.
  let siesta = null;
  /*
   * La lámina grande de lo que se explica (punto 305): lo más ancha que se vio
   * cada una ya puesta, en fracción del ancho, y lo que pisó, si pisó algo.
   */
  const laminas = new Map();
  const laminaPisa = new Set();
  /** Lo que salió en la lámina de cada dibujo con ilustración: su fichero, o «dibujo» si salió el de código. */
  const conSuIlustracion = new Map();
  /** Las veces que la lámina estaba puesta con algo nombrado a la vista: lo que se pudo medir. */
  const laminaConNombrado = new Set();
  /*
   * **La llegada** (puntos 300 y 303): dónde va el avión respecto a la pista
   * de llegada —lo que se aparta del eje y cuánto se ha dado la vuelta—, la
   * fase, el cartel del cinturón y lo que suena de la gente, con la hora de
   * la escena.
   */
  const llegada = [];
  const gente = [];
  /** **La luz del cinturón en todo el vuelo**: cada vez que cambia el cartel, con la hora de la escena (punto 293). */
  const luces = [];
  /**
   * **El botón ⏩**: cuántas veces se vio, si salió donde no toca, si alguien
   * habló adelantando, si el botón de la pantalla dice lo mismo que la
   * escena, las veces que se pulsó, las teselas que llegaron a ir bajando a
   * la vez y el reloj de quien juega en cada tramo.
   */
  const adelanto = { visto: 0, mal: [], hablando: [], desacuerdo: 0, pulsadas: 0, teselas: 0, aUno: false, reloj: [], enLaLlegada: [], llegada: null, despues: [], foto: false, puestoEn: null };
  /**
   * **Ara asomada al pasillo** (punto 312): las muestras con el plano puesto y
   * sin velo, las buenas —el letrero entero y sin nada delante, la pared de la
   * ventanilla apagada y las tiras a la vista—, lo que tapó la lámina y lo que
   * decía el subtítulo de las salidas.
   */
  const pasillo = { muestras: 0, buenas: 0, peor: null, lamina: [], texto: null, foto: false };
  /**
   * **La ladera de Mazo mientras Ara la cuenta** (punto 314): cada muestra,
   * medida con lo que se pinta —en la imagen, por el cristal y sin nube—; y la
   * pregunta de la música, con lo que sonaba al hacerla.
   */
  const mazo = { muestras: [], foto: false };
  /**
   * **La ventanilla viva**: lo que llevó el aro suave, los toques sobre lo que
   * se ve —con el número de toques de la escena antes de cada uno—, el de algo
   * tapado, el de dentro de la nube y el de mientras habla alguien.
   */
  const viva = { aros: new Set(), toques: [], tapado: null, nube: null, pisa: null, teide: null, ultimo: 0, buscado: 0 };
  const dondeTocar = (que) => page.evaluate((q) => globalThis.__oga.dondeTocar?.(q) ?? null, que).catch(() => null);
  let preguntaDeLaMusica = null;
  /**
   * **La toma a la velocidad de verdad** (punto 296): de la recogida a dejar
   * la pista, el reloj del juego a ×1. Los aerofrenos suben en un segundo y
   * el fundido va por el reloj de pared, así que a ×12 los paneles ya están
   * arriba antes de que cambie la cámara: lo que se mide es lo que ve quien
   * juega, que vuela a ×1. Y las muestras de los paneles, con su plano.
   */
  const alTocar = { aUno: false, devuelto: false, muestras: [] };
  const t0 = Date.now();

  while (Date.now() - t0 < TOPE_S * 1000) {
    const v = await leer(page).catch(() => null);
    if (!v) break;
    ultimo = v;
    const i = v.inicio;
    const e = i?.estado;
    if (!e) break;
    if (v.percance) percance = v.percance;
    const tramo = i.tripulacion?.tramo;
    if (tramo && tramos[tramos.length - 1]?.tramo !== tramo) {
      tramos.push({ tramo, t: e.segundos });
      adelanto.reloj.push({ tramo, quienJuega: i.adelanto?.quienJuega ?? null });
    }
    if (tramo === "recogida" && !alTocar.aUno) {
      alTocar.aUno = true;
      await page.evaluate(() => globalThis.__oga.acelerar(1));
    }
    if (alTocar.aUno && !alTocar.devuelto && tramo === "al-puesto") {
      alTocar.devuelto = true;
      await page.evaluate((x) => globalThis.__oga.acelerar(x), VECES);
    }
    if (tramo === "frenando" && alTocar.muestras.length < 200)
      alTocar.muestras.push({ t: e.segundos, plano: i.planoVisto, velo: Number(i.velo) || 0, paneles: i.frenosDeTierra ?? null });
    if (v.mirar) miradas.add(v.mirar);
    if (i.planoVisto) vistos.add(i.planoVisto);
    veloMaximo = Math.max(veloMaximo, Number(i.velo) || 0);
    if (i.ventanita?.sitio) ventanitas.add(i.ventanita.sitio);
    // ── La lámina grande: su tamaño y lo que no tapa ──
    const lamina = i.ventanita;
    if (lamina?.donde && lamina.caja && (Number(i.velo) || 0) < 0.02 && !e.durmiendo) {
      // El tamaño, sin el kit abierto: con él, lo que se mira es el kit y la lámina se hace a un lado.
      const ancho = (lamina.caja.right - lamina.caja.left) / v.pantalla.ancho;
      const antes = laminas.get(lamina.sitio);
      // Y su proporción, la de la imagen sin el marco: los dibujos son de 3:2 y las ilustraciones, de 4:3.
      const proporcion = (lamina.caja.right - lamina.caja.left - 12) / Math.max(1, lamina.caja.bottom - lamina.caja.top - 12);
      if (!e.kit?.abierto && (!antes || ancho > antes.ancho)) laminas.set(lamina.sitio, { ancho, proporcion, donde: lamina.donde, plano: i.planoVisto });
      const esquema = /^dibujo:(.+)$/.exec(lamina.sitio)?.[1];
      if (esquema && CON_ILUSTRACION[esquema]) {
        const vistos = conSuIlustracion.get(esquema) ?? new Set();
        vistos.add(lamina.fichero ?? "dibujo");
        conSuIlustracion.set(esquema, vistos);
      }
      for (const o of v.noSeTapa) if (sePisan(lamina.caja, o)) laminaPisa.add(`${lamina.sitio} pisa ${o.que}`);
      // Y lo nombrado de hace poco, donde cae ahora en la imagen: fuera de la lámina.
      const recientes = new Set((e.nombrados ?? []).filter((n) => n.desde >= e.segundos - 20).map((n) => n.sitio));
      if (e.paisaje) recientes.add(e.paisaje);
      for (const sitio of recientes) {
        const p = await page.evaluate((s) => globalThis.__oga.paisajeALaVista(s), sitio).catch(() => null);
        if (!p || !p.delante || Math.abs(p.x) > 1 || Math.abs(p.y) > 1) continue;
        const x = ((p.x + 1) / 2) * v.pantalla.ancho;
        const y = ((1 - p.y) / 2) * v.pantalla.alto;
        const c = lamina.caja;
        laminaConNombrado.add(`${sitio} con ${lamina.sitio.replace(/^(dibujo|ilustracion):/, "")}`);
        if (x > c.left && x < c.right && y > c.top && y < c.bottom) laminaPisa.add(`${lamina.sitio} tapa ${sitio}`);
      }
    }
    if (i.asientoDeAra) asientoDeAra = i.asientoDeAra;
    if (v.cara) caras.add(v.cara.replace(/^.*inicio__cara--/, ""));
    // ── Lo que se mira mientras pasa ──
    // Oída: que sonó o se esperó el rato de leerla, no que se pidió. Ver `Conversacion.oida`.
    const oida = (clave) => (i.registro ?? []).some((d) => d.clave === clave && (d.como === "sono" || d.como === "muda"));
    if (arrancoCon === null && v.motor) arrancoCon = oida("comandante.crosscheck");
    if (entroEnPista === null && v.enPista && v.fase !== "back-taxi" && tramo !== "frenando")
      entroEnPista = oida("comandante.despegue");
    if (tramo === "carrera" && v.enTierra && i.lecturaDeLinea)
      masDeLadoEnLaCarrera = Math.max(masDeLadoEnLaCarrera, Math.abs(i.lecturaDeLinea.pista.lado));
    // ── El hilo musical ──
    const m = i.musica?.audio;
    const cinturon = (i.registro ?? []).find((d) => d.clave === "inicio.tripulacion.pasaje.cinturon");
    if (m && tramo === "puerta" && !cinturon && m.suena && musica.embarque === null) musica.embarque = m;
    if (m && cinturon && e.segundos > cinturon.desde + 1 && tramo === "puerta" && musica.callada === null) musica.callada = !m.suena;
    const altitud = v.pos?.y ?? 0;
    const despego = tramos.some((x) => x.tramo === "carrera");
    const enLaLlegada = ["bajada", "final", "recogida", "frenando", "al-puesto"].includes(tramo);
    if (m?.suena && despego && !enLaLlegada && !["aparcado", "apagado"].includes(tramo))
      musica.enVuelo.push(`${m.suena}@${tramo}`);
    if (m?.suena && tramo === "bajada" && altitud > 3048 + 60) musica.enVuelo.push(`${m.suena}@bajada a ${Math.round(altitud / 0.3048)} ft`);
    if (m?.suena && enLaLlegada && musica.empieza === null) musica.empieza = { tramo, pies: Math.round(altitud / 0.3048), t: e.segundos, ...m };
    if (m?.suena && tramo === "al-puesto") musica.rodandoAlPuesto++;
    if (m?.suena && e.megafonia && despego) musica.conMegafonia.push(`${(e.linea?.clave ?? "?")} a los ${e.segundos.toFixed(0)} s`);
    // En el puesto: el avión parado en su sitio —la fase lo dice—, o los motores apagados.
    if (m?.suena && despego && (tramo === "apagado" || v.fase === "en-puesto" || v.fase === "apagado"))
      musica.enElPuesto.push(`${tramo}/${v.fase} a los ${e.segundos.toFixed(0)} s`);
    // ── La llegada: la vuelta en la pista, el cartel y la gente ──
    if (["frenando", "al-puesto", "aparcado", "apagado"].includes(tramo)) {
      const l = i.lecturaDeLinea;
      const dif = l ? Math.abs((((l.rumbo - l.pista.rumbo) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) : null;
      llegada.push({ t: e.segundos, tramo, fase: v.fase, lado: l ? Math.abs(l.pista.lado) : null, vuelta: dif, cartel: v.cartel, plano: i.planoVisto });
    }
    for (const q of v.tocados ?? []) if (q === "hebilla" || q === "levantarse") gente.push({ t: e.segundos, que: q, tramo });
    if (luces[luces.length - 1]?.cartel !== v.cartel) luces.push({ t: e.segundos, cartel: v.cartel, tramo });
    // ── Lo que se oye cambiar ──
    if (v.gasQueSuena !== null) oido.push({ t: e.segundos, gas: v.gasQueSuena });
    altitudes.push({ t: e.segundos, altitud });
    // ── El kit de viaje ──
    if (e.kit?.dado && kit.dadoEn === null) {
      kit.dadoEn = e.segundos;
      kit.tramo = tramo;
    }
    if (e.kit?.dado && !kit.jugado && i.kit?.boton && !process.env.OGA_SIN_JUGAR) {
      kit.jugado = true;
      // A la velocidad de verdad, de que llega el kit a que se recoge: es el rato que hay para jugar.
      kit.aUno = true;
      await page.evaluate(() => globalThis.__oga.acelerar(1));
      await abrirLaLuzEnElVuelo(page);
    }
    if (e.kit?.abierto && e.kit.pausado) kit.pausado++;
    if (e.kit && !e.kit.recogido) kit.antes = { t: e.segundos, abierto: !!e.kit.abierto, juego: e.kit.juego?.juego ?? null };
    // ── La luz verde en el vuelo, como quien hace caso a lo que brilla ──
    const jl = e.kit?.juego;
    if (kit.jugado && jl?.juego === "luz" && !e.kit.recogido) {
      torre.abierta ??= { t: e.segundos, altitud };
      if (jl.terminado && !torre.fin)
        torre.fin = { t: e.segundos, altitud, rondas: jl.rondas, aterrizados: jl.aterrizados, rojas: jl.rojas, alAire: jl.alAire };
      /*
       * Los fotogramas, en cuanto hay avioncitos en el circuito: la primera
       * ronda espera a que Ara acabe de explicar. Ver `medirLaLuzEnVuelo`.
       */
      const medir = !kit.fotogramas && e.kit.abierto && !jl.terminado && (jl.aviones?.length ?? 0) > 0;
      if (medir) {
        kit.fotogramas = true;
        await medirLaLuzEnVuelo(page);
      }
      // Lo leído al empezar la vuelta es de antes de medir: se toca en la siguiente.
      const pide = (jl.aviones ?? []).find((a) => a.pide);
      if (!medir && !jl.terminado && jl.ayuda && e.kit.abierto && !e.kit.pausado && pide) {
        if (torre.brilla?.senal !== jl.ayuda || torre.brilla?.id !== pide.id) torre.brilla = { senal: jl.ayuda, id: pide.id, desde: Date.now() };
        const r = i.kit?.luz;
        if (Date.now() - torre.brilla.desde > 1500 && r?.luces?.[jl.ayuda]) {
          const centro = (b) => [b.x + b.width / 2, b.y + b.height / 2];
          if (r.aviones?.[pide.id]) await page.mouse.click(...centro(r.aviones[pide.id]));
          await page.mouse.click(...centro(r.luces[jl.ayuda]));
          torre.toques++;
          torre.brilla = null;
        }
      } else torre.brilla = null;
    }
    // ── Y después, con lo que quede, Armá tu avión ──
    if (kit.jugado && !e.kit?.recogido) await armarEnElVuelo(page, e, armando, torre, altitud);
    // ── Y su canción: cuándo empieza, cómo se agacha y cómo se va ──
    const ca = v.cancion?.audio;
    if (ca?.suena) {
      torre.empieza ??= { t: e.segundos, altitud, trasElFin: torre.fin ? e.segundos - torre.fin.t : null };
      torre.muestras.push({ t: e.segundos, va: ca.va, bus: ca.bus, fundido: ca.fundido, agachado: ca.agachado, megafonia: !!e.megafonia, linea: e.linea?.clave ?? null });
    }
    if (e.kit?.recogido && !kit.recogido) torre.alRecoger = { t: e.segundos, sonaba: torre.muestras.length > 0 && e.segundos - torre.muestras[torre.muestras.length - 1].t < 1.5 };
    if (torre.alRecoger && e.segundos - torre.alRecoger.t < 4) torre.trasRecoger.push({ t: e.segundos, suena: ca?.suena ?? null, seVa: ca?.seVa ?? null });
    // Recogido el kit y la canción ida, el vuelo vuelve a ir deprisa.
    if (kit.aUno && e.kit?.recogido && torre.alRecoger && e.segundos - torre.alRecoger.t > 4) {
      kit.aUno = false;
      await page.evaluate((x) => globalThis.__oga.acelerar(x), VECES);
    }
    const guardar = (i.registro ?? []).find((d) => d.clave === "inicio.tripulacion.pasaje.cerca.kitGuardar");
    if (guardar && e.segundos > (guardar.hasta ?? guardar.desde) + 2) kit.abiertoTrasGuardar ||= !!e.kit?.abierto;
    if (tramo === "final" || tramo === "recogida") {
      kit.abiertoEnLaFinal ||= !!e.kit?.abierto;
      kit.botonEnLaFinal ||= !!i.kit?.boton;
    }
    if (e.kit?.recogido && !kit.recogido) {
      kit.recogidoEn = { t: e.segundos, altitud };
      kit.alRecoger = kit.antes;
    }
    kit.recogido = !!e.kit?.recogido;
    // ── Lo nombrado del paisaje, a la vista ──
    const nuevos = (e.nombrados ?? []).slice(vistosNombrados);
    for (const n of nuevos) {
      vistosNombrados++;
      // Pasado el corte, con el plano ya puesto y sin velo: lo que se ve mientras se dice.
      await page
        .waitForFunction(
          (desde) => {
            const j = globalThis.__oga.inicio();
            return j.estado.segundos > desde + 1.6 && (Number(j.velo) || 0) < 0.02;
          },
          n.desde,
          { timeout: 8000 },
        )
        .catch(() => {});
      const medido = await page.evaluate((sitio) => {
        const j = globalThis.__oga.inicio();
        return {
          vista: globalThis.__oga.paisajeALaVista(sitio),
          plano: j.planoVisto,
          linea: j.estado.linea?.clave ?? null,
          lamina: j.ventanita?.donde ? { sitio: j.ventanita.sitio, caja: j.ventanita.caja } : null,
          pantalla: { ancho: innerWidth, alto: innerHeight },
        };
      }, n.sitio);
      const v = medido.vista;
      const enLaImagen = !!v && v.delante && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1;
      const porElCristal = !v || !medido.plano || medido.plano.startsWith("fuera-") || v.porElCristal !== false;
      // Y el mar de nubes, al revés: lo que se nombra es la nube, que tiene que estar por medio.
      const nube = n.sitio === "nubes-abajo" ? !!v && v.nubeEnMedio >= 100 : !!v && v.nubeEnMedio < 150;
      // Y la lámina de lo que se explica, si está puesta, no encima de lo nombrado.
      if (medido.lamina && v && v.delante) {
        const x = ((v.x + 1) / 2) * medido.pantalla.ancho;
        const y = ((1 - v.y) / 2) * medido.pantalla.alto;
        const c = medido.lamina.caja;
        n.conLamina = medido.lamina.sitio;
        if (x > c.left && x < c.right && y > c.top && y < c.bottom) laminaPisa.add(`${medido.lamina.sitio} tapa ${n.sitio}`);
      }
      const ok = enLaImagen && porElCristal && !!v && v.ojoEnNube < 0.35 && nube;
      const nombre = `nombrado-${nombrados.length + 1}-${n.sitio.replace(":", "-")}`;
      nombrados.push({ ...n, plano: medido.plano, medido: v, ok, nombre });
      if (FOTOS) await foto(page, nombre);
    }
    // ── La ladera de Mazo, medida mientras Ara la cuenta ──
    /*
     * Mientras suena, o mientras se lee si no tiene toma: la última frase pedida
     * se queda en `linea` hasta la siguiente, también en el silencio de un
     * corte, y una frase de Ara no dura siete segundos.
     */
    const suyaDesde = (i.registro ?? []).filter((d) => d.clave === e.linea?.clave).at(-1)?.desde ?? -Infinity;
    const deMazo =
      ["inicio.ara.pasaje.mazo", "inicio.ara.pasaje.mazoCaminos", "inicio.ara.pasaje.mazoBici"].includes(e.linea?.clave ?? "") &&
      e.segundos - suyaDesde < 7;
    if (deMazo && e.hablando && (Number(i.velo) || 0) < 0.02) {
      const p = await page.evaluate(() => globalThis.__oga.paisajeALaVista("ladera-de-mazo")).catch(() => null);
      mazo.muestras.push({
        t: e.segundos,
        clave: e.linea.clave,
        plano: i.planoVisto,
        tramo,
        enTierra: v.enTierra,
        pies: Math.round(altitud / 0.3048),
        km: p ? p.distancia / 1000 : null,
        enLaImagen: !!p && p.delante && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1,
        cristal: p?.porElCristal ?? null,
        nube: p?.nubeEnMedio ?? null,
        ojoEnNube: p?.ojoEnNube ?? 1,
      });
      if (FOTOS && !mazo.foto && e.linea.clave === "inicio.ara.pasaje.mazo" && i.planoVisto === "asomado-paisaje" && e.segundos - e.planoDesde > 1.5) {
        mazo.foto = true;
        await foto(page, "mazo-fincas");
      }
    }
    // ── La ventanilla viva: tocar lo que se ve, lo tapado y mientras habla alguien ──
    const sentada =
      ["ventanilla", "asomado-motor", "asomado-abajo", "asomado-paisaje"].includes(i.planoVisto) &&
      (Number(i.velo) || 0) < 0.02 &&
      !e.durmiendo &&
      !e.kit?.abierto &&
      e.momento !== "fin";
    // Lo de arriba: la llegada la cuenta la escena, y lo que miran las demás comprobaciones no se toca.
    const arribaParaTocar = ["subida", "crucero", "bajada"].includes(tramo) && altitud > 3048 && !e.kit?.dado;
    if (sentada) {
      const vv = await page.evaluate(() => globalThis.__oga.ventanillaViva?.() ?? null).catch(() => null);
      if (vv?.suave) viva.aros.add(vv.suave.que);
      const toques = e.toques ?? [];
      const clic = async (x, y) => {
        await page.mouse.click(x, y);
        viva.ultimo = Date.now();
      };
      const DE_ARRIBA = ["hito:teide", "hito:garajonay", "nubes", "motor", "ala"];
      // Algo que se ve, en un silencio: el Teide si se ve, si no lo que lleve el aro suave.
      if (arribaParaTocar && !e.hablando && viva.toques.length < 4 && Date.now() - viva.ultimo > 12_000) {
        let objetivo = null;
        if (!viva.teide) {
          const d = await dondeTocar("hito:teide");
          if (d?.seVe && d.porElCristal) objetivo = { que: "hito:teide", x: d.x, y: d.y };
        }
        if (!objetivo && vv?.suave && DE_ARRIBA.includes(vv.suave.que) && !viva.toques.some((x) => x.que === vv.suave.que))
          objetivo = vv.suave;
        if (objetivo) {
          const tq = { que: objetivo.que, t: e.segundos, antes: toques.length };
          await clic(objetivo.x, objetivo.y);
          viva.toques.push(tq);
          if (objetivo.que === "hito:teide") {
            viva.teide = tq;
            if (FOTOS) {
              await pausa(1500);
              await foto(page, "toque-teide");
            }
          }
        }
      }
      // Algo tapado por la nube o por el monte, por el cristal: tocarlo no cuenta nada.
      if (!viva.tapado && !e.hablando && Date.now() - viva.ultimo > 4000 && Date.now() - viva.buscado > 3000) {
        viva.buscado = Date.now();
        for (const que of ["hito:garajonay", "hito:teide", "isla-de-llegada", "hito:hierro", "hito:anaga", "hito:orotava"]) {
          const d = await dondeTocar(que);
          if (!d || d.seVe || !d.porElCristal) continue;
          const cabina = await page.evaluate(() => globalThis.__oga.cabina?.() ?? null).catch(() => null);
          viva.tapado = { que, t: e.segundos, antes: toques.length, tramo };
          await clic(d.x, d.y);
          // Si el toque fue a la persiana —no había nada que contar—, se deja como estaba.
          if (cabina && !cabina.bloqueada)
            for (let k = 0; k < 2; k++) await page.evaluate(() => globalThis.__oga.tocarLaVentanilla?.()).catch(() => {});
          break;
        }
      }
      // Dentro de la nube, con la ventanilla blanca: un toque en el cristal no cuenta nada.
      if (!viva.nube && (vv?.enNube ?? 0) > 0.5) {
        const d = await dondeTocar("cristal");
        if (d?.porElCristal) {
          viva.nube = { t: e.segundos, antes: toques.length, enNube: vv.enNube };
          await clic(d.x, d.y);
        }
      }
      // Mientras habla alguien, ya invitado: el toque espera su turno o se queda en su aro. Desde el embarque, el ala.
      const invitado = (i.registro ?? []).some((d) => d.clave === "inicio.ara.pasaje.toque.invita");
      if (!viva.pisa && invitado && (arribaParaTocar || tramo === "puerta") && e.hablando && e.linea && vv?.suave && DE_ARRIBA.includes(vv.suave.que)) {
        viva.pisa = { que: vv.suave.que, t: e.segundos, antes: toques.length, clave: e.linea.clave };
        await clic(vv.suave.x, vv.suave.y);
      }
    }
    // ── La pregunta de la música, con lo que suena al hacerla ──    // ── La pregunta de la música, con lo que suena al hacerla ──
    if (preguntaDeLaMusica === null && e.linea?.clave === "inicio.ara.pasaje.musica" && e.hablando)
      preguntaDeLaMusica = { t: e.segundos, suena: m?.suena ?? null, tramo, pies: Math.round(altitud / 0.3048) };
    // ── La foto de una historia, solo con su voz ──
    const enLaVentanita = i.ventanita?.sitio ?? "";
    if (enLaVentanita && !enLaVentanita.includes(":")) {
      const ahora = (i.registro ?? []).at(-1);
      /*
       * La foto se queda un poco después de su voz, hasta la frase siguiente
       * —la de Ara—: eso no es una foto muda. Lo mudo es la foto de una
       * historia que no llegó a sonar, o la que sigue puesta con otra frase.
       */
      const suHistoria = ahora?.clave === "ventanilla.historia" && (ahora.hasta === null || ahora.como === "sono");
      if (suHistoria) fotosConVoz++;
      else
        fotosMudas.add(
          `${enLaVentanita} con ${ahora?.clave ?? "nada"}${ahora?.hasta != null ? ` acabada hace ${(e.segundos - ahora.hasta).toFixed(1)} s (${ahora.como})` : ""}`,
        );
    }
    // ── El botón ⏩: solo cuando toca, y nadie habla adelantando ──
    const ad = e.adelanto;
    if (ad) {
      // Lo que se va solo, al empezar la llegada, se ve irse un momento: eso no es desacuerdo.
      const seVa = ad.llegada !== null && ad.seApagoSolo;
      if (v.adelantar) adelanto.visto++;
      if ((v.adelantar !== !!ad.sale && !seVa) || v.adelantarPulsado !== (!!ad.sale && !!ad.puesto)) adelanto.desacuerdo++;
      if (v.adelantar && !seVa && (v.enTierra || e.durmiendo || ["final", "recogida"].includes(tramo) || e.dichos.includes("aproximacion")))
        adelanto.mal.push(`${tramo} a los ${e.segundos.toFixed(0)} s${e.durmiendo ? " durmiendo" : ""}`);
      if (ad.adelantando && e.hablando && e.linea) adelanto.hablando.push(`${e.linea.clave} a los ${e.segundos.toFixed(0)} s`);
      if (ad.adelantando) adelanto.teselas = Math.max(adelanto.teselas, v.teselasBajando ?? 0);
      // Por debajo de los diez mil pies bajando, nunca: la llegada se vive a su paso.
      const altura = v.pos?.y ?? 0;
      if (ad.adelantando && ["bajada", "final", "recogida"].includes(tramo) && altura < 3048)
        adelanto.enLaLlegada.push(`${tramo} a ${Math.round(altura / 0.3048)} ft, a los ${e.segundos.toFixed(0)} s`);
      if (ad.llegada !== null && adelanto.llegada === null)
        adelanto.llegada = { t: ad.llegada, pies: Math.round(altura / 0.3048), tramo, quienJuega: i.adelanto?.quienJuega ?? null, pared: Date.now() };
      // Y desde ahí, el botón se va —en un momento— y no vuelve.
      if (adelanto.llegada && Date.now() - adelanto.llegada.pared > 2500 && (v.adelantar || ad.sale || ad.puesto || ad.adelantando))
        adelanto.despues.push(`${tramo} a los ${e.segundos.toFixed(0)} s`);
      if (ADELANTAR && ad.sale && !ad.puesto && adelanto.pulsadas === 0 && v.adelantar) {
        const caja = await page.evaluate(() => {
          const r = document.querySelector('[data-hud="adelantar"]')?.getBoundingClientRect();
          return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
        });
        if (caja) {
          await page.mouse.click(caja.x, caja.y);
          adelanto.pulsadas++;
          adelanto.puestoEn = { t: e.segundos, tramo, pies: Math.round(altura / 0.3048) };
        }
      }
      // Lo que se ve corriendo es lo de quien juega: el reloj del juego, a ×1; y parado, el del banco.
      if (ADELANTAR && ad.adelantando && !adelanto.aUno) {
        await page.evaluate(() => globalThis.__oga.acelerar(1));
        adelanto.aUno = true;
      } else if (adelanto.aUno && !ad.adelantando) {
        await page.evaluate((x) => globalThis.__oga.acelerar(x), VECES);
        adelanto.aUno = false;
      }
      if (FOTOS && ad.adelantando && !adelanto.foto && (Number(i.velo) || 0) < 0.02 && v.adelantarPulsado) {
        adelanto.foto = true;
        await foto(page, "modo-rapido");
      }
    }
    // ── Ara asomada al pasillo: el letrero de la salida más cercana ──
    if (e.linea?.clave === "inicio.tripulacion.pasaje.demo.salidas" && i.texto) pasillo.texto = i.texto;
    if (i.planoVisto === "pasillo" && (Number(i.velo) || 0) < 0.02) {
      const p = await page.evaluate(() => globalThis.__oga.pasillo?.() ?? null).catch(() => null);
      pasillo.muestras++;
      const bien = !!p?.letrero && p.letrero.entero && !p.letrero.tapado && p.colgado && !p.marco && p.tiras.vistas >= 0.3 * p.tiras.de;
      if (bien) pasillo.buenas++;
      else pasillo.peor ??= p;
      const lam = i.ventanita;
      if (p?.letrero && lam?.caja && sePisan(lam.caja, p.letrero.caja)) pasillo.lamina.push(`${lam.sitio} a los ${e.segundos.toFixed(0)} s`);
      if (bien && !pasillo.foto) {
        pasillo.foto = true;
        await foto(page, "pasillo-exit");
      }
    }
    // ── La siesta de Ara: en cuanto bosteza, se mira entera ──
    if (siesta === null && (e.durmiendo || (e.linea?.clave === "inicio.ara.pasaje.dormirse" && e.hablando)))
      siesta = await mirarLaSiesta(page);
    // ── El meneo, dentro de la nube ──
    if (meneoEnLaNube === null && (i.registro ?? []).some((d) => d.clave === "inicio.ara.pasaje.meneo"))
      meneoEnLaNube = await page.evaluate(() => globalThis.__oga.capaDeNubes?.()?.enLaNube ?? 0);
    // ── Las fotos ──
    if (FOTOS) {
      const en = (n, si) => {
        if (si && !fotos.has(n)) {
          fotos.add(n);
          return true;
        }
        return false;
      };
      // Lo nuevo: cada plano cuando ya se ve —sin velo—, la ventanita y Ara contra el cristal.
      const sinVelo = (Number(i.velo) || 0) < 0.02;
      if (en("asomado-motor", i.planoVisto === "asomado-motor" && e.segundos - e.planoDesde > 2.5)) await foto(page, "asomado-motor");
      if (en("cinturon", i.ventanita?.sitio === "dibujo:cinturon" && i.ventanita?.donde)) await pausa(800).then(() => foto(page, "cinturon"));
      if (en("rodando", sinVelo && i.planoVisto === "fuera-rodando")) await foto(page, "fuera-rodando");
      if (en("mascara", i.ventanita?.sitio === "dibujo:mascara" && i.ventanita?.donde)) await pausa(800).then(() => foto(page, "ventanita-mascara"));
      if (en("oido-dibujo", i.ventanita?.sitio === "dibujo:oido" && i.ventanita?.donde)) await pausa(800).then(() => foto(page, "ventanita-oido"));
      if (en("alto-dibujo", i.ventanita?.sitio === "dibujo:alto" && i.ventanita?.donde)) await pausa(800).then(() => foto(page, "ventanita-alto"));
      if (en("torre", i.ventanita?.sitio === "ilustracion:torre-radio" && i.ventanita?.donde)) await pausa(800).then(() => foto(page, "ventanita-torre"));
      if (en("despegue", sinVelo && i.planoVisto === "fuera-despegue" && v.velocidad > 50)) await foto(page, "fuera-despegue");
      if (en("giro", sinVelo && i.planoVisto === "fuera-giro" && e.segundos - e.planoDesde > 4)) await foto(page, "fuera-giro");
      if (en("nubes", e.dichos.includes("nubes"))) await foto(page, "nubes");
      if (en("ala", sinVelo && i.planoVisto === "fuera-ala")) await foto(page, "fuera-ala");
      if (en("vuelta", sinVelo && i.planoVisto === "fuera-vuelta" && e.segundos - e.planoDesde > 10)) await foto(page, "fuera-vuelta");
      if (en("nube-dibujo", i.ventanita?.sitio === "dibujo:nube" && i.ventanita?.donde)) await pausa(800).then(() => foto(page, "ventanita-nube"));
      if (en("asomado-abajo", i.planoVisto === "asomado-abajo" && e.segundos - e.planoDesde > 2.5)) await foto(page, "asomado-abajo");
      if (en("motor-dibujo", i.ventanita?.sitio === "dibujo:motor" && i.ventanita?.donde)) await pausa(800).then(() => foto(page, "ventanita-motor"));
      if (en("ventanilla", e.senalados.length > 0 && e.mira === "ventanilla" && !v.enTierra)) await foto(page, "ventanilla");
      if (en("pista", sinVelo && i.planoVisto === "fuera-pista" && !v.enTierra)) await foto(page, "fuera-pista");
      if (en("toma", tramo === "frenando")) await foto(page, "toma");
      /*
       * Y desde el asiento de Ara, con los aerofrenos arriba puestos a mano en
       * el puesto —solo el dibujo—: cómo se verían por su cristal (punto 296).
       */
      if (en("asiento-aerofrenos", sinVelo && i.planoVisto === "ventanilla" && v.enTierra && tramo === "puerta" && e.segundos > 4)) {
        await page.evaluate(() => globalThis.__oga.aerofrenosFijos(1));
        await pausa(500);
        await foto(page, "asiento-aerofrenos");
        await page.evaluate(() => globalThis.__oga.aerofrenosFijos(null));
      }
      // Y los aerofrenos al tocar, vistos desde el ala: subiendo, y ya arriba (punto 296).
      if (en("aerofrenos-subiendo", i.planoVisto === "fuera-ala" && v.enTierra && (Number(i.velo) || 0) < 0.5 && (i.frenosDeTierra ?? 1) < 0.9))
        await foto(page, "fuera-ala-aerofrenos-subiendo");
      if (en("aerofrenos", sinVelo && i.planoVisto === "fuera-ala" && v.enTierra && (i.frenosDeTierra ?? 0) > 0.95))
        await foto(page, "fuera-ala-aerofrenos");
      // Lo del 18-10 por la tarde: el meneo, debajo de las nubes, el tren desde abajo y el señalero.
      // Lo que se dice ahora, suene o se lea mientras espera su toma.
      const suena = (clave) => e.linea?.clave === clave && e.hablando;
      if (en("meneo", suena("inicio.ara.pasaje.meneo"))) await foto(page, "meneo-en-la-nube");
      if (en("bajo-las-nubes", suena("inicio.ara.pasaje.bajoLasNubes"))) await foto(page, "bajo-las-nubes");
      if (en("tren", sinVelo && i.planoVisto === "fuera-tren" && e.segundos - e.planoDesde > 3)) await foto(page, "fuera-tren");
      if (en("tren-trabado", sinVelo && i.planoVisto === "fuera-tren" && e.segundos - e.planoDesde > 9)) await foto(page, "fuera-tren-trabado");
      if (en("senalero", sinVelo && i.planoVisto === "fuera-senalero" && e.segundos - e.planoDesde > 4)) await foto(page, "fuera-senalero");
      if (en("senalero-alto", sinVelo && i.planoVisto === "fuera-senalero" && (tramo === "aparcado" || v.velocidad < 0.5) && e.segundos - e.planoDesde > 6))
        await foto(page, "fuera-senalero-alto");
      // Lo del 19-10: la vuelta en la punta de la pista, y la gente que se levanta en el puesto.
      if (en("raqueta", sinVelo && i.planoVisto === "fuera-raqueta" && e.segundos - e.planoDesde > 3)) await foto(page, "fuera-raqueta");
      if (en("raqueta-vuelta", sinVelo && i.planoVisto === "fuera-raqueta" && e.segundos - e.planoDesde > 12)) await foto(page, "fuera-raqueta-vuelta");
      if (en("se-levantan", suena("inicio.ara.pasaje.seLevantan"))) await foto(page, "se-levantan");
      if (en("luz-apagada", suena("inicio.ara.pasaje.luzApagada"))) await foto(page, "luz-apagada");
      // Y cada ilustración, la primera vez que queda puesta.
      const ilustrada = i.ventanita?.donde ? /^ilustracion:(.+)$/.exec(i.ventanita.sitio ?? "")?.[1] : null;
      if (ilustrada && en(`ilustracion-${ilustrada}`, true)) await pausa(800).then(() => foto(page, `ilustracion-${ilustrada}`));
    }
    // ── Las ilustraciones con cielo por la ventanilla, nunca en tierra ──
    if (/^ilustracion:pasaje-(tripulante|ara-ventanilla|comandante)$/.test(i.ventanita?.sitio ?? "") && v.enTierra)
      ilustradasEnTierra.add(`${i.ventanita.sitio} en ${tramo}`);
    // ── El final ──
    if (e.momento === "fin") {
      if (!e.puedeSeguir) {
        await pausa(150);
        continue;
      }
      conversacion = await page.evaluate(() => ({
        habladas: globalThis.__oga.habladas(),
        descartadas: globalThis.__oga.descartadas(),
        maquina: globalThis.__oga.maquina?.() ?? [],
        registro: globalThis.__oga.inicio?.()?.registro ?? null,
      }));
      sello = await page.evaluate(() => {
        const s = document.querySelector("#inicio .inicio__sello svg");
        const r = s?.getBoundingClientRect();
        const b = document.querySelector("#inicio [data-inicio='seguir']");
        return {
          campo: s?.getAttribute("data-campo") ?? null,
          visible: !!r && r.width > 40 && r.top >= 0 && r.bottom <= innerHeight,
          boton: b && !b.hidden ? b.textContent.trim() : null,
          // Y el cuaderno de viaje: los sellos de lo visto y los huecos, a la vista.
          viaje: (() => {
            const p = document.querySelector("#inicio .viaje");
            const r = p?.getBoundingClientRect();
            return p
              ? {
                  sellos: [...p.querySelectorAll("[data-sello-viaje]")].map((x) => x.getAttribute("data-sello-viaje")),
                  huecos: p.querySelectorAll(".viaje__sitio--hueco").length,
                  visible: !!r && r.width > 100 && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
                }
              : null;
          })(),
        };
      });
      // El cuaderno, cuando ya está estampado: lo nuevo se estampa uno detrás de otro.
      if (FOTOS) {
        await pausa(3500);
        await foto(page, "cuaderno-de-viaje");
      }
      await foto(page, "fin");
      break;
    }
    await pausa(250);
  }

  const i = ultimo?.inicio;
  const e = i?.estado;
  const t = i?.tripulacion;
  if (process.env.OGA_VOLCADO)
    writeFileSync(
      process.env.OGA_VOLCADO,
      JSON.stringify(
        {
          tramos,
          registro: conversacion?.registro ?? i?.registro ?? null,
          // Y lo que tiró la boca, con su porqué: lo que no sonó se mira aquí.
          descartadas: conversacion?.descartadas ?? null,
          nombrados,
          estado: e ?? null,
          // Y la recogida medida, de los cien pies al toque. Ver `apuntarLaRecogida` en `game.ts`.
          recogida: i?.recogida ?? null,
          ultimaToma: i?.ultimaToma ?? null,
          // Y la altitud cada dos segundos de escena, m, y la luz del cinturón: para medir los ratos del vuelo.
          altitudes: altitudes.reduce((cada, x) => (!cada.length || x.t - cada[cada.length - 1].t >= 2 ? [...cada, x] : cada), []),
          luces,
        },
        null,
        1,
      ),
    );
  comprobar(
    "la tripulación vuela del puesto al puesto, sin saltarse nada",
    tramos.map((x) => x.tramo).join(" ") ===
      "puerta arrancando rodando esperando entrando carrera subida crucero bajada final recogida frenando al-puesto aparcado apagado",
    tramos.map((x) => `${x.tramo}@${x.t.toFixed(0)}s`).join(" "),
  );
  comprobar(
    "cada cosa en su momento, en el orden de un vuelo de verdad",
    !!e && MOMENTOS.every((m) => e.dichos.includes(m)) && e.dichos.join() === MOMENTOS.filter((m) => e.dichos.includes(m)).join() && e.saltados.length === 0,
    e ? `${e.dichos.join(" ")}${e.saltados.length ? ` · saltados: ${e.saltados.join(" ")}` : ""}` : "no llegó",
  );
  comprobar("no se arranca antes de armar los toboganes", arrancoCon === true, String(arrancoCon));
  comprobar(
    "no se entra en la pista antes de «tripulación, sentados para el despegue»",
    entroEnPista === true,
    String(entroEnPista),
  );
  comprobar("se despega por el eje", masDeLadoEnLaCarrera > 0 && masDeLadoEnLaCarrera < 5, `${masDeLadoEnLaCarrera.toFixed(1)} m de lado como mucho`);
  /*
   * **Se toca en su sitio** (punto 299). Esto decía «se toca suave», con menos
   * de metro y medio por segundo de caída, y lo que hace bueno un aterrizaje no
   * es lo suave: es tocar en la zona de toma, sin flotar, y sin pasar de los
   * diez pies por segundo del aterrizaje duro. Ver `flight/aterrizaje.ts`.
   */
  const ut = i?.ultimaToma ?? null;
  comprobar(
    "se toca sin golpe duro —por debajo de diez pies por segundo— y sin percance",
    !!t && t.caidaAlTocar !== null && t.caidaAlTocar < 10 * 0.3048 && !percance,
    t
      ? `${t.caidaAlTocar?.toFixed(2)} m/s (${((t.caidaAlTocar ?? 0) / 0.3048).toFixed(1)} ft/s) · percance: ${percance ?? "ninguno"}`
      : "no se tocó",
  );
  comprobar(
    "y en su sitio: en la zona de toma, que es lo que hace bueno un aterrizaje",
    !!ut && (ut.veredicto === "suave" || ut.veredicto === "firme") && ut.pasado !== null && ut.pasado > 0 && ut.pasado <= ut.zona,
    ut ? `«${ut.veredicto}» a ${ut.pasado?.toFixed(0)} m del umbral de aterrizaje; la zona acaba a ${ut.zona?.toFixed(0)} m` : "sin veredicto",
  );

  const registro = conversacion?.registro ?? [];
  let pisadas = 0;
  for (let k = 1; k < registro.length; k++) if (registro[k].desde < (registro[k - 1].hasta ?? Infinity) - 1e-6) pisadas++;
  comprobar(
    "nunca dos frases a la vez",
    registro.length > 30 && pisadas === 0 && registro.every((d) => !d.cortada),
    `${registro.length} frases · ${pisadas} pisadas · ${registro.filter((d) => d.cortada).length} cortadas`,
  );
  /*
   * **Los aerofrenos al tocar, vistos desde el ala** (punto 296): la toma se ve
   * desde la orilla de la pista hasta tocar; en cuanto los paneles empiezan a
   * subir se corta al ala, y se los ve moverse —todavía no arriba del todo al
   * quitarse el velo—; y se vuelve a la orilla de la pista a ver frenar.
   */
  {
    const planosT = e?.planos ?? [];
    const toco = tramos.find((x) => x.tramo === "frenando")?.t ?? Infinity;
    const ala = planosT.find((p) => p.plano === "fuera-ala" && p.desde >= toco - 1);
    const antes = planosT.filter((p) => ala && p.desde < ala.desde).pop();
    const vuelta = ala ? planosT.find((p) => p.desde > ala.desde) : null;
    const av = i?.aerofrenosVistos ?? null;
    const enAla = alTocar.muestras.filter((m) => m.plano === "fuera-ala");
    comprobar(
      "al tocar se corta al ala, con los aerofrenos subiendo: se los ve moverse y quedar arriba",
      !!ala &&
        antes?.plano === "fuera-pista" &&
        ala.desde - toco < 1 &&
        !!av &&
        av.alCambiar < 0.5 &&
        av.sinVelo !== null &&
        av.sinVelo < 0.9 &&
        enAla.some((m) => m.velo < 0.02 && (m.paneles ?? 0) > 0.95) &&
        (e?.charlas ?? []).includes("aerofrenos"),
      `tocó a los ${toco.toFixed(1)} s · el ala a los ${ala?.desde?.toFixed(1) ?? "—"} s, desde ${antes?.plano ?? "—"} · paneles al cambiar de cámara ${av ? (av.alCambiar * 100).toFixed(0) : "—"} %, al quitarse el velo ${av?.sinVelo !== null && av ? (av.sinVelo * 100).toFixed(0) : "—"} % (${av?.tardoElVelo?.toFixed(2) ?? "—"} s de pared) · ${enAla.length} muestras en el ala, arriba del todo y sin velo: ${enAla.some((m) => m.velo < 0.02 && (m.paneles ?? 0) > 0.95)}`,
    );
    comprobar(
      "y el plano desde la pista sigue: se ve tocar desde la orilla, y se vuelve a ella a ver frenar, con lo de la reversa",
      !!ala &&
        antes?.plano === "fuera-pista" &&
        antes.desde < toco &&
        vuelta?.plano === "fuera-pista" &&
        vuelta.desde - ala.desde >= 3.5 - 0.3 &&
        (registro.find((d) => d.clave === "inicio.ara.pasaje.toma")?.desde ?? -Infinity) >= vuelta.desde + CORTE - 0.05,
      `la pista desde los ${antes?.desde?.toFixed(1) ?? "—"} s · el ala ${ala ? (vuelta ? (vuelta.desde - ala.desde).toFixed(1) : "?") : "—"} s · de vuelta a ${vuelta?.plano ?? "—"} a los ${vuelta?.desde?.toFixed(1) ?? "—"} s · «¡tocamos el suelo!» a los ${registro.find((d) => d.clave === "inicio.ara.pasaje.toma")?.desde?.toFixed(1) ?? "—"} s`,
    );
    /*
     * **Y el golpecito, solo si fue firme y en su sitio** (punto 299): justo
     * antes de los aerofrenos y sin pisar a nadie; con otra toma, no se dice.
     */
    const kg = registro.findIndex((d) => d.clave === "inicio.ara.pasaje.golpecito");
    const firmeYEnSuSitio = i?.ultimaToma?.veredicto === "firme";
    comprobar(
      "el golpecito se cuenta solo si la toma fue firme y en su sitio, antes de los aerofrenos y sin pisar a nadie",
      firmeYEnSuSitio
        ? kg >= 0 &&
            registro[kg + 1]?.clave === "inicio.ara.pasaje.aerofrenos" &&
            (!registro[kg - 1] || registro[kg].desde >= (registro[kg - 1].hasta ?? Infinity) - 1e-6)
        : kg < 0,
      `toma «${i?.ultimaToma?.veredicto ?? "—"}» · ${kg >= 0 ? `golpecito a los ${registro[kg].desde.toFixed(1)} s, ${registro[kg].como}, antes de ${registro[kg + 1]?.clave ?? "—"}` : "sin golpecito"}`,
    );
    const llegada = registro.find((d) => d.clave === "tripulacion.llegada");
    const k = registro.findIndex((d) => d.clave === "inicio.ara.pasaje.aerofrenos");
    const x1 = registro[k];
    const x2 = registro[k + 1];
    const pisa = (d, j) => (registro[j - 1] && d.desde < (registro[j - 1].hasta ?? Infinity) - 1e-6) || (registro[j + 1] && registro[j + 1].desde < (d.hasta ?? Infinity) - 1e-6);
    comprobar(
      "y la explicación de los aerofrenos llega después, rodando, en el primer rato tranquilo: Ara, sin pisar a nadie",
      !!llegada &&
        !!x1 &&
        x2?.clave === "inicio.ara.pasaje.aerofrenosPorque" &&
        x1.desde > (llegada.hasta ?? Infinity) &&
        !pisa(x1, k) &&
        !pisa(x2, k + 1) &&
        [x1, x2].every((d) => d.como === "sono" || d.como === "muda"),
      x1
        ? `a los ${x1.desde.toFixed(1)} s, ${(x1.desde - (llegada?.hasta ?? 0)).toFixed(1)} s después de la megafonía de la llegada · ${x1.como}/${x2?.como ?? "—"} · antes: ${registro[k - 1]?.clave ?? "—"} · después: ${registro[k + 2]?.clave ?? "—"}`
        : "no se dijo",
    );
  }
  /*
   * **Y todo lo que dice la escena se oye**: con las tomas en el pack, cada
   * frase acaba sonando entera. Una que acaba sin sonar es una que se tiró por
   * el camino —la boca reservada, una receta que no se reconoce— o que la
   * escena dio por perdida.
   */
  // Lo grabado tiene que sonar; lo que aún no tiene toma, se lee y se cuenta aparte.
  const porGrabar = registro.filter((d) => d.clave.startsWith("inicio.") && !GRABADAS.has(d.clave));
  const sinOir = registro.filter((d) => d.como !== "sono" && !porGrabar.includes(d));
  console.log(`  ${porGrabar.length} frases dichas que esperan su toma: se leen`);
  comprobar(
    "y todo lo grabado que dice la escena se oye entero, de su toma; lo que espera su toma, se lee",
    registro.length > 30 && sinOir.length === 0 && porGrabar.every((d) => d.como === "muda" || d.como === "sono"),
    sinOir.length
      ? `${sinOir.length} sin oír: ${sinOir
          .slice(0, 5)
          .map((d) => {
            // Y por qué, si la boca la tiró: lo apunta en `descartadas`.
            const tirada = (conversacion?.descartadas ?? []).find((x) => String(x).replace(/^\S+s /, "").startsWith(d.clave));
            return `${d.clave} (${d.como}${tirada ? `: ${String(tirada).replace(/^.*: /, "")}` : ""})`;
          })
          .join(" · ")}`
      : `${registro.length} frases, todas oídas`,
  );
  const ajenas = (conversacion?.habladas ?? []).filter((l) => !DE_LA_ESCENA.test(l.replace(/^\S+s /, "")));
  const maquina = conversacion?.maquina ?? [];
  const tiradas = (conversacion?.descartadas ?? []).filter((d) => !DE_LA_ESCENA.test(String(d).replace(/^\S+s /, "")));
  comprobar(
    "no habla nadie más: ni la radio, ni las cajas de la cabina de mando, ni la instructora",
    !!conversacion && ajenas.length === 0 && maquina.length === 0,
    !conversacion
      ? "no llegó al final"
      : `${ajenas.length ? `ajenas: ${ajenas.slice(0, 3).join(" · ")} · ` : ""}${maquina.length ? `máquina: ${maquina.slice(0, 3).join(" · ")} · ` : ""}${(conversacion.habladas ?? []).length} sonadas · ${tiradas.length} de otros tiradas por la boca de la escena`,
  );
  const ventanillas = registro.filter((d) => d.clave === "ventanilla").length;
  const historias = registro.filter((d) => d.clave === "ventanilla.historia").length;
  const deAra = registro.filter((d) => /^inicio\.ara\.pasaje\.(teide|garajonay|orotava|loVeo)$/.test(d.clave)).map((d) => d.clave.split(".").pop());
  comprobar(
    "lo de la ventanilla se dice —el Teide, el que más—, con su historia, y Ara contesta lo que ve por su lado",
    ventanillas >= 2 && historias >= 1 && !!e?.senalados?.includes("teide") && deAra.includes("teide"),
    `${ventanillas} sitios · ${historias} historias · ${e?.senalados?.join(", ")} · Ara: ${deAra.join(", ")}`,
  );
  comprobar(
    "se dibuja qué mirar: el ala, el cinturón, el motor, las nubes y la ventanilla",
    ["ala", "cinturon", "motor", "nubes", "ventanilla"].every((m) => miradas.has(m)),
    [...miradas].join(", "),
  );
  comprobar(
    "habla quien tiene que hablar: Ara, Jazlyn por la megafonía, la tripulación por el altavoz y la tripulante en persona",
    ["ara", "mama", "tripulacion", "tripulante"].every((c) => caras.has(c)),
    [...caras].join(", "),
  );
  // ── Lo del 18-10-2026: los planos, la demostración, las nubes, la ventanita y los silencios ──
  const FUERA = ["fuera-rodando", "fuera-despegue", "fuera-giro", "fuera-vuelta", "fuera-ala", "fuera-pista"];
  comprobar(
    "se ve el avión por fuera en lo que se cuenta —rodando, despegando, girando, alrededor, el ala, tocando—, con su fundido",
    FUERA.every((p) => vistos.has(p)) && veloMaximo > 0.9 && vistos.has("ventanilla"),
    `vistos: ${[...vistos].join(", ")} · velo hasta ${veloMaximo.toFixed(2)}`,
  );
  const planos = e?.planos ?? [];
  let aMedia = 0;
  for (let k = 1; k < planos.length; k++) {
    // Lo mismo que `esCorte`: de dentro a fuera y al revés, y de la ventanilla al pasillo y de vuelta.
    const corte = [planos[k - 1].plano, planos[k].plano].some((x) => x.startsWith("fuera-") || x === "pasillo");
    if (!corte) continue;
    const t0 = planos[k].desde;
    if (registro.some((d) => d.desde < t0 + CORTE - 1e-3 && (d.hasta ?? Infinity) > t0 + 1e-3)) aMedia++;
  }
  comprobar(
    "y ningún corte de cámara a media frase",
    planos.length > 10 && aMedia === 0,
    `${planos.length - 1} cambios de plano · ${aMedia} a media frase`,
  );
  comprobar(
    "Ara se pega al cristal: para el motor y para mirar abajo",
    planos.some((p) => p.plano === "asomado-motor") && planos.some((p) => p.plano === "asomado-abajo"),
    planos.filter((p) => p.plano.startsWith("asomado")).map((p) => `${p.plano}@${p.desde.toFixed(0)}`).join(" "),
  );
  comprobar(
    "desde el asiento de Ara se ven el ala y el motor, contado con rayos por el cristal",
    !!asientoDeAra && asientoDeAra.motor > 0.03 && asientoDeAra.ala > 0.03,
    asientoDeAra
      ? `ventanilla en z ${asientoDeAra.z.toFixed(2)} m · motor ${(asientoDeAra.motor * 100).toFixed(1)} % · ala ${(asientoDeAra.ala * 100).toFixed(1)} %`
      : "sin asiento",
  );
  const claves = registro.map((d) => d.clave);
  const demo = ["intro", "cinturon", "salidas", "mascaras", "chaleco", "tarjeta", "aparatos"].map((x) => claves.indexOf(`inicio.tripulacion.pasaje.demo.${x}`));
  comprobar(
    "la demostración de seguridad, entera, en su orden y antes de «sentados para el despegue»",
    demo.every((x) => x >= 0) && demo.every((x, k) => k === 0 || x > demo[k - 1]) && Math.max(...demo) < claves.indexOf("comandante.despegue"),
    demo.join(" "),
  );
  /*
   * **La demostración con gracia** (punto 294): la entrada detrás de «un
   * momento de atención», la despedida detrás de «gracias por su atención»,
   * oídas enteras y sin pisar a nadie. Y lo de en medio, igual que siempre:
   * las mismas tomas grabadas —las instrucciones no cambian— en su orden.
   */
  const GRACIA_DE = {
    ventanilla: "ventanilla",
    examen: "examen",
    primeraVez: "primeraVez",
  };
  const conGracia = GRACIA_DE[DEMOSTRACION] ?? null;
  const loQuePisa = (d) =>
    registro.filter((x) => x !== d && x.desde < (d.hasta ?? Infinity) - 1e-6 && (x.hasta ?? Infinity) > d.desde + 1e-6).map((x) => x.clave);
  const deGracia = registro.filter((d) => d.clave.startsWith("inicio.tripulacion.pasaje.demo.gracia."));
  if (conGracia) {
    const entrada = `inicio.tripulacion.pasaje.demo.gracia.${conGracia}.entrada`;
    const despedida = `inicio.tripulacion.pasaje.demo.gracia.${conGracia}.despedida`;
    const pisadasDeLaGracia = deGracia.flatMap(loQuePisa);
    comprobar(
      `la demostración con gracia (${conGracia}) sale sin pisar a nadie: la entrada detrás de la intro y la despedida detrás del modo avión`,
      deGracia.map((d) => d.clave).join() === [entrada, despedida].join() &&
        claves.indexOf(entrada) === claves.indexOf("inicio.tripulacion.pasaje.demo.intro") + 1 &&
        claves.indexOf(despedida) === claves.indexOf("inicio.tripulacion.pasaje.demo.aparatos") + 1 &&
        deGracia.every((d) => (d.como === "sono" || d.como === "muda") && !d.cortada) &&
        claves.indexOf(despedida) < claves.indexOf("comandante.despegue") &&
        pisadasDeLaGracia.length === 0,
      `${deGracia.map((d) => `${d.clave.split(".").slice(-2).join(".")} a los ${d.desde.toFixed(0)} s (${d.como})`).join(" · ") || "no se dijo"} · pisa: ${pisadasDeLaGracia.join(", ") || "nada"}`,
    );
  } else {
    comprobar("la demostración de siempre, sin gracia, si así se pide", deGracia.length === 0, deGracia.map((d) => d.clave).join(", ") || "sin gracia");
  }
  const INSTRUCCIONES = ["intro", "cinturon", "salidas", "mascaras", "chaleco", "tarjeta", "aparatos"].map((x) => `inicio.tripulacion.pasaje.demo.${x}`);
  const instrucciones = INSTRUCCIONES.map((c) => registro.find((d) => d.clave === c));
  comprobar(
    "las instrucciones de seguridad suenan igual con la gracia: las mismas tomas grabadas, enteras y en su orden",
    instrucciones.every((d) => d && GRABADAS.has(d.clave) && d.como === "sono" && !d.cortada) &&
      instrucciones.every((d, k) => k === 0 || d.desde > instrucciones[k - 1].desde),
    instrucciones.map((d, k) => `${INSTRUCCIONES[k].split(".").pop()} ${d ? `${d.como}${GRABADAS.has(d.clave) ? "" : " sin toma"}` : "no"}`).join(" · "),
  );
  /*
   * **El silbo, también en otras islas** (punto 288): si Ara contestó a la
   * historia de La Gomera, pregunta después si se silba en más islas y la
   * tripulante le contesta detrás, en persona, en la bajada y antes de
   * preparar la cabina; sin la historia, no se pregunta.
   */
  const aLaHistoria = registro.find((d) => d.clave === "inicio.ara.pasaje.garajonay" && (d.como === "sono" || d.como === "muda"));
  const preguntaDelSilbo = registro.filter((d) => d.clave === "inicio.ara.pasaje.silboOtras");
  const respuestaDelSilbo = registro.filter((d) => d.clave === "inicio.tripulacion.pasaje.cerca.silbo");
  const iPregunta = registro.indexOf(preguntaDelSilbo[0]);
  const aproximacionEn = registro.find((d) => d.clave === "comandante.aproximacion")?.desde ?? Infinity;
  const pisadasDelSilbo = [...preguntaDelSilbo, ...respuestaDelSilbo].flatMap(loQuePisa);
  const tramoDelSilbo = preguntaDelSilbo[0] ? ([...tramos].reverse().find((x) => x.t <= preguntaDelSilbo[0].desde)?.tramo ?? "?") : "—";
  comprobar(
    "lo del silbo, en su sitio: detrás de la historia de La Gomera y de las islas de la tripulante, Ara pregunta por las otras islas y ella contesta en persona, sin pisar a nadie",
    aLaHistoria
      ? preguntaDelSilbo.length === 1 &&
          respuestaDelSilbo.length === 1 &&
          preguntaDelSilbo[0].desde > aLaHistoria.desde &&
          preguntaDelSilbo[0].desde > (registro.find((d) => d.clave === "inicio.ara.pasaje.islas")?.desde ?? Infinity) &&
          registro[iPregunta + 1] === respuestaDelSilbo[0] &&
          [...preguntaDelSilbo, ...respuestaDelSilbo].every((d) => (d.como === "sono" || d.como === "muda") && !d.cortada) &&
          respuestaDelSilbo[0].desde < aproximacionEn &&
          pisadasDelSilbo.length === 0
      : preguntaDelSilbo.length === 0 && respuestaDelSilbo.length === 0,
    aLaHistoria
      ? `historia contestada a los ${aLaHistoria.desde.toFixed(0)} s · pregunta ${preguntaDelSilbo.map((d) => `a los ${d.desde.toFixed(0)} s (${d.como}, ${tramoDelSilbo})`).join(", ") || "no"} · respuesta ${respuestaDelSilbo.map((d) => `a los ${d.desde.toFixed(0)} s (${d.como})`).join(", ") || "no"} · aproximación a los ${aproximacionEn.toFixed(0)} s · pisa: ${pisadasDelSilbo.join(", ") || "nada"}`
      : `sin la historia del silbo, no se pregunta: ${preguntaDelSilbo.length + respuestaDelSilbo.length} dichas`,
  );
  /*
   * **Las salidas, las de este avión** (punto 312): lo que dijo el subtítulo de
   * la demostración, lo que dice su hoja de tipo y las puertas del modelo,
   * delante y detrás del asiento de Ara.
   */
  const sal = ultimo?.inicio?.salidas ?? null;
  const puertasDelante = sal ? sal.puertas.filter((p) => p.hasta < sal.ara).length * 2 : null;
  const puertasDetras = sal ? sal.puertas.filter((p) => p.desde > sal.ara).length * 2 : null;
  comprobar(
    "lo que dice la demostración casa con las salidas del avión: cuatro puertas, dos delante y dos detrás, ninguna sobre el ala",
    !!sal &&
      !!pasillo.texto &&
      /cuatro salidas/.test(pasillo.texto) &&
      /dos delante y dos detrás/.test(pasillo.texto) &&
      !/\balas?\b/.test(pasillo.texto) &&
      sal.declaradas.delante === 2 &&
      sal.declaradas.detras === 2 &&
      sal.declaradas.sobreElAla === 0 &&
      puertasDelante === sal.declaradas.delante &&
      puertasDetras === sal.declaradas.detras,
    `«${pasillo.texto ?? "no se leyó"}» · hoja de tipo ${JSON.stringify(sal?.declaradas ?? null)} · puertas del modelo: ${puertasDelante} delante y ${puertasDetras} detrás de Ara`,
  );
  const salidasEn = registro.find((d) => d.clave === "inicio.tripulacion.pasaje.demo.salidas");
  const pasilloEn = (e?.planos ?? []).find((x) => x.plano === "pasillo");
  comprobar(
    "al decir las salidas Ara se asoma al pasillo y se ve el letrero EXIT de la más cercana, entero, sin nada delante ni la lámina encima, con las tiras del suelo",
    vistos.has("pasillo") &&
      !!salidasEn &&
      !!pasilloEn &&
      pasilloEn.desde <= salidasEn.desde &&
      pasillo.muestras > 0 &&
      pasillo.buenas >= Math.max(1, 0.8 * pasillo.muestras) &&
      pasillo.lamina.length === 0,
    `plano del pasillo a los ${pasilloEn?.desde?.toFixed(1) ?? "?"} s, las salidas a los ${salidasEn?.desde?.toFixed(1) ?? "?"} s · ${pasillo.buenas} de ${pasillo.muestras} muestras buenas${pasillo.peor ? ` · la peor: ${JSON.stringify(pasillo.peor)}` : ""}${pasillo.lamina.length ? ` · la lámina encima: ${pasillo.lamina.slice(0, 2).join(", ")}` : ""}`,
  );
  const despegaEn = tramos.find((x) => x.tramo === "carrera")?.t ?? Infinity;
  const dichaEn = (c) => registro.find((d) => d.clave === c)?.desde ?? null;
  const preguntas = [
    "inicio.ara.pasaje.mascaraAhora",
    "inicio.tripulacion.pasaje.cerca.mascaraAhora",
    "inicio.ara.pasaje.salidaAla",
    "inicio.tripulacion.pasaje.cerca.salidaAla",
  ].map(dichaEn);
  comprobar(
    "la pregunta de las mascarillas sale antes del despegue, y la de la salida sobre el ala, con la tripulante al lado en la revisión",
    preguntas.every((x) => x !== null && x < despegaEn) &&
      preguntas.every((x, k) => k === 0 || x > preguntas[k - 1]) &&
      preguntas[0] > (dichaEn("inicio.tripulacion.pasaje.demo.aparatos") ?? Infinity),
    `${preguntas.map((x) => (x === null ? "?" : x.toFixed(0))).join(" · ")} s · se despega a los ${despegaEn.toFixed(0)} s`,
  );
  const vientoEn = registro.find((d) => d.clave === "inicio.mama.pasaje.viento");
  const rodandoDesde = tramos.find((x) => x.tramo === "rodando")?.t ?? Infinity;
  comprobar(
    "por qué se sale hacia el este, contado por la comandante rodando, antes del despegue",
    !!vientoEn && vientoEn.desde >= rodandoDesde && vientoEn.desde < despegaEn && (vientoEn.como === "sono" || vientoEn.como === "muda"),
    vientoEn ? `a los ${vientoEn.desde.toFixed(0)} s (${vientoEn.como}) · rodando desde los ${rodandoDesde.toFixed(0)} s` : "no se dijo",
  );
  comprobar(
    "las nubes, explicadas: la comandante para todos y la tripulante a Ara, con su dibujo",
    ["inicio.mama.pasaje.nubes", "inicio.tripulacion.pasaje.cerca.nubes1", "inicio.tripulacion.pasaje.cerca.nubes2", "inicio.tripulacion.pasaje.cerca.nubes3"].every((c) => claves.includes(c)) &&
      ventanitas.has("dibujo:nube"),
    `${claves.filter((c) => /nubes/.test(c)).join(", ")} · ventanita: ${ventanitas.has("dibujo:nube")}`,
  );
  comprobar(
    "la ventanita, con los dibujos de lo que se explica",
    ["dibujo:cinturon", "dibujo:mascara", "dibujo:chaleco", "dibujo:nube", "dibujo:motor"].every((d) => ventanitas.has(d)),
    [...ventanitas].join(", "),
  );
  const ilustraciones = ["embarque", "lleno", "tripulante", "ara-ventanilla", "comandante"].map((c) => `ilustracion:pasaje-${c}`);
  comprobar(
    "y con las ilustraciones de lo que pasa, y las del cielo nunca en tierra",
    ilustraciones.every((c) => ventanitas.has(c)) && ilustradasEnTierra.size === 0,
    `faltan: ${ilustraciones.filter((c) => !ventanitas.has(c)).join(", ") || "ninguna"} · en tierra: ${[...ilustradasEnTierra].join(", ") || "ninguna"}`,
  );
  // Los silencios, en el aire, con el reloj de la escena.
  const tramoEn = (s) => [...tramos].reverse().find((x) => x.t <= s)?.tramo ?? "puerta";
  /*
   * **Y lo que Ara pasa durmiendo no es silencio** (punto 304): un rato callado
   * es un rato sin dormir y sin nada; durmiendo, se ve a Ara soñar y el mapa
   * con el vuelo pasando deprisa. Se quita del hueco lo que se durmió, y lo
   * demás se mide igual que siempre: un silencio de verdad se sigue viendo.
   */
  const siestas = (e?.siestas ?? []).map((x) => ({ desde: x.desde, hasta: x.hasta ?? Infinity }));
  const durmiendoEntre = (a, b) => siestas.reduce((t, x) => t + Math.max(0, Math.min(b, x.hasta) - Math.max(a, x.desde)), 0);
  const callados = [];
  let masLargo = 0;
  for (let k = 1; k < registro.length; k++) {
    const desde = registro[k - 1].hasta ?? registro[k - 1].desde;
    const largo = registro[k].desde - desde - durmiendoEntre(desde, registro[k].desde);
    const tr = tramoEn(desde);
    if (!["subida", "crucero", "bajada"].includes(tr)) continue;
    masLargo = Math.max(masLargo, largo);
    if (largo > CALLADO_COMO_MUCHO) callados.push(`${largo.toFixed(0)} s desde ${desde.toFixed(0)} (${tr})`);
  }
  comprobar(
    `ningún rato largo callado en el aire (más de ${CALLADO_COMO_MUCHO} s)`,
    callados.length === 0 && registro.length > 60,
    callados.length ? callados.join(" · ") : `lo más largo: ${masLargo.toFixed(0)} s · ${(e?.charlas ?? []).length} charlas: ${(e?.charlas ?? []).join(" ")}`,
  );
  // ── La siesta de Ara (punto 304), y el mapa de la ruta (292) ──
  const s0 = e?.siestas?.[0] ?? null;
  const bajadaEn = tramos.find((x) => x.tramo === "bajada")?.t ?? Infinity;
  const oidaEn = (clave) => registro.find((d) => d.clave === clave && (d.como === "sono" || d.como === "muda"));
  const bostezo = oidaEn("inicio.ara.pasaje.dormirse");
  const alDespertar = oidaEn("inicio.ara.pasaje.despertarse");
  // Lo siguiente que había que oír: el «ya estamos arriba», o empezar a bajar.
  const loSiguiente = oidaEn(s0?.paraBajar ? "comandante.descenso" : "comandante.crucero");
  /*
   * **Y lo que despierta a Ara es algo que pasa** (19-10-2026): el *ding* de la
   * luz que se apaga con el «ya estamos arriba» —que suena entero, y Ara lo
   * cuenta detrás—, o la tripulante para bajar, antes de bajar.
   */
  const conElDing = s0?.porQue === "ding";
  const porLaTripulante = s0?.porQue === "tripulante";
  const oidoAlEmpezar = (c) => registro.find((d) => d.clave === c && (d.como === "sono" || d.como === "muda"));
  const despiertan = oidoAlEmpezar("inicio.tripulacion.pasaje.cerca.despertar");
  const loDeLaComandante = conElDing ? oidoAlEmpezar("comandante.crucero") : null;
  const mama = registro.find((d) => d.clave === "inicio.mama.pasaje.menosGas" || d.clave === "inicio.mama.pasaje.nubes");
  comprobar(
    "Ara se duerme una vez, arriba, en cuanto la comandante acaba lo de los diez mil pies, y se despierta con algo que pasa: el ding de la luz, o la tripulante para bajar",
    (e?.siestas?.length ?? 0) === 1 &&
      s0.hasta !== null &&
      s0.hasta < bajadaEn &&
      !!bostezo &&
      !!alDespertar &&
      bostezo.desde < s0.desde &&
      (!mama || mama.desde < s0.desde) &&
      alDespertar.desde >= s0.hasta - 1e-3 &&
      ((conElDing && !!loDeLaComandante && loDeLaComandante.desde >= s0.hasta - 1e-3 && loDeLaComandante.desde < s0.hasta + 3 && alDespertar.desde > loDeLaComandante.desde) ||
        (porLaTripulante && !!despiertan && despiertan.desde < alDespertar.desde && !!loSiguiente && loSiguiente.desde > alDespertar.desde)),
    s0
      ? `durmiendo de ${s0.desde.toFixed(0)} a ${s0.hasta?.toFixed(0)} s: ${(s0.hasta - s0.desde).toFixed(0)} s de vuelo · se despierta con: ${s0.porQue ?? "?"} · ${loSiguiente?.clave ?? "?"} a los ${loSiguiente?.desde?.toFixed(0) ?? "?"} s · «me dormí» a los ${alDespertar?.desde?.toFixed(0) ?? "?"} s · empieza a bajar a los ${bajadaEn.toFixed(0)} s`
      : "no se durmió",
  );
  const movidoEnElMapa = siesta?.avionAntes && siesta?.avionDespues ? Math.hypot(siesta.avionDespues[0] - siesta.avionAntes[0], siesta.avionDespues[1] - siesta.avionAntes[1]) : 0;
  comprobar(
    `y al despertar se nota: ${SIESTA_KM} km de ruta como poco, el avión del mapa bien movido y lo de al dormirse, atrás`,
    !!siesta && (siesta.km ?? 0) >= SIESTA_KM && movidoEnElMapa >= 20 && (siesta.atras ?? 0) >= 0.6 * SIESTA_KM,
    siesta
      ? `${siesta.km?.toFixed(1) ?? "?"} km por la ruta · el avión del mapa, ${movidoEnElMapa.toFixed(0)} puntos de 480 · donde se durmió, ${siesta.atras?.toFixed(1) ?? "?"} km por detrás`
      : "no se vio",
  );
  comprobar(
    "y rápido: el fundido entero en segundos de pantalla, no un minuto",
    !!siesta?.pared && siesta.pared < 20,
    siesta?.pared ? `${siesta.pared.toFixed(1)} s de pared con la pantalla del sueño, por ${siesta.vuelo?.toFixed(0)} s de vuelo` : "no se vio",
  );
  comprobar(
    "durmiendo, el avión sigue su ruta de verdad: sin salirse y recorriendo lo que vuela",
    !!siesta && siesta.muestras >= 5 && siesta.lado < 2000 && siesta.recorrido !== null && siesta.recorrido > 0.8 && siesta.recorrido < 1.25,
    siesta
      ? `${siesta.muestras} muestras · ${siesta.lado.toFixed(0)} m fuera de la ruta como mucho · recorrido ${siesta.recorrido?.toFixed(2) ?? "?"} de lo que da su velocidad`
      : "no se vio",
  );
  const DE_SEGURIDAD = [
    ...["intro", "cinturon", "salidas", "mascaras", "chaleco", "tarjeta", "aparatos"].map((x) => `inicio.tripulacion.pasaje.demo.${x}`),
    "inicio.tripulacion.pasaje.cerca.revision",
    "comandante.despegue",
    "comandante.crucero",
    "comandante.descenso",
    "tripulacion.cinturones",
    "inicio.tripulacion.pasaje.oidos",
    "inicio.tripulacion.pasaje.cerca.aterrizaje",
  ];
  const seguridadPerdida = DE_SEGURIDAD.filter(
    (c) => !oidaEn(c) || siestas.some((x) => oidaEn(c).desde > x.desde && oidaEn(c).desde < x.hasta),
  );
  comprobar(
    "nada de seguridad se pierde con la siesta: la demostración, el cinturón y la bajada, todo oído y despierto",
    seguridadPerdida.length === 0 && registro.every((d) => !siestas.some((x) => d.desde > x.desde + 1e-3 && d.desde < x.hasta - 1e-3)),
    seguridadPerdida.length ? `perdido: ${seguridadPerdida.join(", ")}` : `${DE_SEGURIDAD.length} de seguridad, todas oídas, y nada dicho durmiendo`,
  );
  comprobar(
    "durmiendo se ve a Ara durmiendo y después soñando, en su orden",
    !!siesta && siesta.vistas.join(" → ") === "ara-durmiendo → ara-sonando",
    siesta ? siesta.vistas.join(" → ") || "ninguna" : "no se vio",
  );
  const movido = siesta?.avionAntes && siesta?.avionDespues ? Math.hypot(siesta.avionDespues[0] - siesta.avionAntes[0], siesta.avionDespues[1] - siesta.avionAntes[1]) : 0;
  comprobar(
    "y en la ventanita, el mapa de la ruta con las islas de verdad y el avión avanzando; el mismo de la tripulante",
    !!siesta &&
      siesta.islas.length === 4 &&
      siesta.islas.every((n) => n >= 15) &&
      siesta.muestras > 0 &&
      siesta.conElMapa / siesta.muestras > 0.8 &&
      movido > 1 &&
      ventanitas.has("dibujo:ruta"),
    siesta
      ? `islas de ${siesta.islas.join(", ")} puntos · el mapa en la ventanita en ${siesta.conElMapa} de ${siesta.muestras} muestras · el avión avanza ${movido.toFixed(1)} de 480 en la hoja`
      : "no se vio",
  );
  // ── El modo rápido ⏩ (19-10-2026) ──
  const medida = i?.adelanto ?? null;
  const reloj = (tramo) => adelanto.reloj.find((x) => x.tramo === tramo)?.quienJuega ?? null;
  const minutos = (a, b) => (a !== null && b !== null ? ((b - a) / 60).toFixed(1) : "?");
  const finDelVuelo = medida?.quienJuega ?? null;
  const laLlegada = adelanto.llegada;
  console.log(
    `  para quien juega${ADELANTAR ? ", con el modo rápido puesto en cuanto sale" : ", sin el modo rápido"}: el vuelo entero ${minutos(reloj("puerta"), finDelVuelo)} min ·` +
      ` de la puerta al despegue ${minutos(reloj("puerta"), reloj("carrera"))} min · la subida ${minutos(reloj("subida"), reloj("crucero"))} min ·` +
      ` la bajada ${minutos(reloj("bajada"), reloj("final"))} min · la final y el rodaje ${minutos(reloj("final"), finDelVuelo)} min ·` +
      ` de la llegada (${laLlegada?.pies ?? "?"} ft bajando) a parar, a ×1: ${minutos(laLlegada?.quienJuega ?? null, finDelVuelo)} min` +
      (adelanto.puestoEn ? ` · puesto a los ${adelanto.puestoEn.t.toFixed(0)} s, ${adelanto.puestoEn.tramo} a ${adelanto.puestoEn.pies} ft` : ""),
  );
  comprobar(
    "el botón ⏩ sale en el aire, y nunca en tierra, con Ara durmiendo ni desde que empieza la llegada",
    adelanto.visto > 0 && adelanto.mal.length === 0 && adelanto.desacuerdo <= 2 && adelanto.despues.length === 0,
    `visto en ${adelanto.visto} muestras · mal: ${adelanto.mal.slice(0, 3).join(" · ") || "ninguna"} · después de la llegada: ${adelanto.despues.slice(0, 3).join(" · ") || "nada"} · la pantalla y la escena, distintas en ${adelanto.desacuerdo}`,
  );
  /*
   * **Y se para antes de cada cosa que se cuenta**: ninguna frase empieza con
   * el vuelo corriendo, y lo que se dice detrás de cada parada llega con su
   * rato a ×1. Con los ratos que apunta la escena, que son los de verdad.
   */
  const ratos = e?.adelanto?.ratos ?? [];
  const corriendo = (t) => ratos.some((r) => t > r.desde + 1e-3 && t < (r.hasta ?? Infinity) - 1e-3);
  const pisadasCorriendo = registro.filter((d) => corriendo(d.desde)).map((d) => `${d.clave}@${d.desde.toFixed(0)}`);
  const trasParar = ratos.filter((r) => r.hasta !== null).map((r) => (registro.find((d) => d.desde >= r.hasta - 1e-3)?.desde ?? Infinity) - r.hasta);
  comprobar(
    "el modo rápido se para antes de cada cosa que se cuenta: nadie empieza a hablar con el vuelo corriendo",
    adelanto.hablando.length === 0 && pisadasCorriendo.length === 0 && (!ADELANTAR || ratos.length > 0),
    [...adelanto.hablando, ...pisadasCorriendo].slice(0, 3).join(" · ") ||
      `${ratos.length} ratos corriendo · de la parada a lo siguiente: ${trasParar.map((d) => (Number.isFinite(d) ? d.toFixed(0) : "fin")).join(" ")} s`,
  );
  comprobar(
    "por debajo de los 10.000 ft bajando nunca se adelanta: ahí se apaga solo y el botón se va",
    adelanto.enLaLlegada.length === 0 &&
      !!laLlegada &&
      laLlegada.tramo === "bajada" &&
      laLlegada.pies <= 10100 &&
      (!ADELANTAR || (e?.adelanto?.seApagoSolo === true && e?.adelanto?.puesto === false)),
    `${adelanto.enLaLlegada.slice(0, 3).join(" · ") || "nunca corriendo ahí"} · la llegada empieza a ${laLlegada?.pies ?? "?"} ft (${laLlegada?.tramo ?? "?"}) · se apagó solo: ${e?.adelanto?.seApagoSolo ?? "?"}`,
  );
  if (ADELANTAR) {
    const fps = medida && medida.pared > 0 ? medida.cuadros / medida.pared : 0;
    comprobar(
      "puesto en cuanto sale: corre con el mundo pintado a 60 fps, y las teselas llegan",
      adelanto.pulsadas === 1 && (medida?.cuadros ?? 0) > 60 && fps >= 55 && adelanto.teselas <= 12,
      medida
        ? `${adelanto.pulsadas} vez · ${medida.cuadros} fotogramas en ${medida.pared.toFixed(1)} s: ${fps.toFixed(1)} fps, ${medida.lentos} de más de 20 ms · pasos por fotograma ${JSON.stringify(medida.porVeces)} · un paso ${medida.pasoMs.toFixed(2)} ms y el dibujo ${medida.dibujoMs.toFixed(1)} ms · teselas bajando a la vez, como mucho ${adelanto.teselas}`
        : "sin medida",
    );
  }
  // ── La ventanilla viva ──
  const losToques = e?.toques ?? [];
  const elToque = (x) => losToques.find((q, k) => k >= x.antes && q.que === x.que && Math.abs(q.desde - x.t) < 3);
  const contados = viva.toques.map((x) => ({ ...x, toque: elToque(x) }));
  comprobar(
    "la ventanilla viva invita a tocar: el aro suave sobre algo que se puede tocar, y Ara lo dice una vez",
    viva.aros.size > 0 && claves.filter((k) => k === "inicio.ara.pasaje.toque.invita").length === 1,
    `el aro suave en: ${[...viva.aros].join(", ") || "nada"} · invitación: ${claves.filter((k) => k === "inicio.ara.pasaje.toque.invita").length} vez`,
  );
  comprobar(
    "un toque sobre lo que se ve por el cristal de Ara lo cuenta, y el Teide si se ve",
    contados.length > 0 &&
      contados.every((x) => x.toque && (x.toque.dijo.length > 0 || x.toque.calla === "contado")) &&
      contados.some((x) => x.toque?.dijo.length > 0) &&
      (!viva.teide || !!contados.find((x) => x.que === "hito:teide")?.toque) &&
      contados.every((x) => (x.toque?.dijo ?? []).every((k) => /^inicio\.(ara|tripulacion)\.pasaje\./.test(k))),
    contados.map((x) => `${x.que} a los ${x.t.toFixed(0)} s: ${x.toque ? (x.toque.dijo.join(" + ") || x.toque.calla) : "no llegó a la escena"}`).join(" · ") ||
      "no se tocó nada",
  );
  const delTapado = viva.tapado ? losToques.filter((q, k) => k >= viva.tapado.antes && q.que === viva.tapado.que && Math.abs(q.desde - viva.tapado.t) < 3) : [];
  comprobar(
    "un toque sobre algo tapado por la nube o el monte no cuenta nada",
    !!viva.tapado && delTapado.length === 0,
    viva.tapado ? `${viva.tapado.que} en ${viva.tapado.tramo} a los ${viva.tapado.t.toFixed(0)} s: ${delTapado.length ? delTapado.map((q) => q.dijo.join(" + ")).join(", ") : "nada"}` : "no se encontró nada tapado por el cristal",
  );
  const enLaNube = viva.nube ? losToques.filter((q, k) => k >= viva.nube.antes && Math.abs(q.desde - viva.nube.t) < 3) : [];
  comprobar(
    "dentro de la nube, con la ventanilla blanca, un toque en el cristal no cuenta nada",
    !!viva.nube && enLaNube.length === 0,
    viva.nube ? `a los ${viva.nube.t.toFixed(0)} s, en la nube ${viva.nube.enNube.toFixed(2)}: ${enLaNube.map((q) => q.que).join(", ") || "nada"}` : "no se tocó dentro de la nube",
  );
  const pisado = viva.pisa ? losToques.find((q, k) => k >= viva.pisa.antes && Math.abs(q.desde - viva.pisa.t) < 3) : null;
  const hablaba = viva.pisa ? registro.filter((d) => d.clave === viva.pisa.clave && d.desde <= viva.pisa.t + 0.5).at(-1) : null;
  const suPrimera = pisado?.dijo.length ? registro.find((d) => d.clave === pisado.dijo[0] && d.desde >= pisado.desde - 0.1) : null;
  comprobar(
    "un toque mientras habla alguien no le pisa: espera a que se calle, o se queda en su aro",
    !!viva.pisa &&
      !!pisado &&
      (suPrimera ? !!hablaba && suPrimera.desde >= (hablaba.hasta ?? Infinity) - 1e-6 : ["ocupado", "contado"].includes(pisado.calla)),
    viva.pisa
      ? `${viva.pisa.que} a los ${viva.pisa.t.toFixed(0)} s con «${viva.pisa.clave}» sonando (acaba a los ${hablaba?.hasta?.toFixed(1) ?? "—"} s): ${pisado ? (suPrimera ? `${pisado.dijo[0]} a los ${suPrimera.desde.toFixed(1)} s` : pisado.calla) : "no llegó a la escena"}`
      : "no se tocó con nadie hablando",
  );
  const vistosDelViaje = e?.vistos ?? [];
  comprobar(
    "al llegar, con los motores parados, sale el cuaderno de viaje con los sellos de lo visto y los huecos de lo que falta",
    !!sello?.viaje &&
      sello.viaje.visible &&
      sello.viaje.sellos.length === vistosDelViaje.length &&
      vistosDelViaje.every((s) => sello.viaje.sellos.includes(s)) &&
      sello.viaje.sellos.length + sello.viaje.huecos === 8 &&
      t?.tramo === "apagado" &&
      ultimo?.motor === false,
    sello?.viaje
      ? `${sello.viaje.sellos.join(", ")} · ${sello.viaje.huecos} huecos · vistos en el vuelo: ${vistosDelViaje.join(", ")} · ${t?.tramo}, motor ${ultimo?.motor}`
      : "no salió",
  );
  const cuaderno = i?.cuaderno;
  comprobar(
    "el cuaderno no apunta nada de pilotaje, y sí el sello de La Palma, de visita",
    !!cuaderno &&
      !!cuadernoAntes &&
      cuaderno.aterrizajes === cuadernoAntes.aterrizajes &&
      cuaderno.despegues === cuadernoAntes.despegues &&
      cuaderno.segundos === cuadernoAntes.segundos &&
      cuaderno.aerodromos.length === cuadernoAntes.aerodromos.length &&
      cuaderno.deViaje.includes("GCLA"),
    cuaderno
      ? `aterrizajes ${cuadernoAntes?.aterrizajes}→${cuaderno.aterrizajes} · despegues ${cuadernoAntes?.despegues}→${cuaderno.despegues} · segundos ${cuadernoAntes?.segundos}→${cuaderno.segundos} · de visita: ${cuaderno.deViaje.join(",")}`
      : "no llegó",
  );
  comprobar(
    "al final, el sello de La Palma a la vista, y el botón de volver al hangar",
    sello?.campo === "la-palma" && sello.visible && !!sello.boton,
    sello ? `${sello.campo} · visible: ${sello.visible} · «${sello.boton}»` : "no llegó al final",
  );
  if (sello?.boton) {
    await page.click("#inicio [data-inicio='seguir']");
    const fuera = await page
      .waitForFunction(() => !location.search.includes("inicio"), null, { timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    comprobar("y el botón vuelve al hangar", fuera, await page.evaluate(() => location.href).catch(() => "?"));
  }
  // ── El kit de viaje en el vuelo ──
  const deMegafonia = (c) =>
    /^(comandante\.|tripulacion\.|ventanilla|inicio\.mama\.pasaje\.)/.test(c) ||
    (c.startsWith("inicio.tripulacion.pasaje.") && !c.includes(".cerca."));
  const dado = registro.find((d) => d.clave === "inicio.tripulacion.pasaje.cerca.kitAqui");
  const guardar = registro.find((d) => d.clave === "inicio.tripulacion.pasaje.cerca.kitGuardar");
  const altitudDe = (s) => altitudes.filter((x) => x.t <= s).at(-1)?.altitud ?? null;
  /** La altitud en un instante, entre las dos lecturas de alrededor: con el vuelo a ×1 se lee cada pocos pies. */
  const altitudEntre = (s) => {
    const a = altitudes.filter((x) => x.t <= s).at(-1);
    const b = altitudes.find((x) => x.t >= s);
    if (!a || !b || b.t === a.t) return (a ?? b)?.altitud ?? null;
    return a.altitud + ((b.altitud - a.altitud) * (s - a.t)) / (b.t - a.t);
  };
  const pies = (m) => (m === null ? "?" : `${Math.round(m / 0.3048)} ft`);
  // **El rato para jugar**: de que la tripulante lo da a que pide guardarlo, sin lo que habla la megafonía, que lo pausa.
  const megafoniaEnMedio = dado && guardar ? registro.filter((d) => deMegafonia(d.clave) && d.desde > dado.desde && d.desde < guardar.desde) : [];
  const enPausa = megafoniaEnMedio.reduce((n, d) => n + Math.max(0, Math.min(d.hasta ?? d.desde, guardar.desde) - d.desde), 0);
  const rato = dado && guardar ? guardar.desde - (dado.hasta ?? dado.desde) : null;
  // La tripulante llega con diez segundos callados detrás de la megafonía —`CALLA_ANTES_DEL_KIT`—, y sin megafonía en el minuto de después.
  const cerca = dado
    ? registro.filter((d) => deMegafonia(d.clave) && (d.hasta ?? d.desde) > dado.desde - 10 && d.desde < dado.desde + 60)
    : [];
  comprobar(
    "el kit llega en la parte alta de la bajada, sin megafonía cerca, y con rato para jugar antes de los diez mil pies",
    !!dado && kit.tramo === "bajada" && cerca.length === 0 && (altitudDe(dado.desde) ?? 0) > 3048 + 300 && rato !== null && rato - enPausa > 120,
    dado
      ? `a los ${dado.desde.toFixed(0)} s, ${kit.tramo}, a ${pies(altitudDe(dado.desde))} · megafonía cerca: ${cerca.map((d) => d.clave).join(", ") || "ninguna"} · para jugar: ${rato?.toFixed(0) ?? "?"} s hasta pedir guardarlo, ${enPausa.toFixed(0)} s de megafonía en medio (${megafoniaEnMedio.map((d) => d.clave).join(", ") || "ninguna"})`
      : "no llegó",
  );
  /*
   * **Armá tu avión, con lo que queda después de la luz verde**: se eligió
   * cuando ya había acabado la luz, se pusieron piezas, ninguna entre dos
   * lecturas con la megafonía pausando, y Ara contó alguna. Lo de cada pieza
   * se cuenta con la conversación callada, menos la primera de cada avión, que
   * va a la cola: así que se pide alguna, no una en concreto. Si el avión llegó
   * a despegar, también lo de las luces. Si no dio tiempo a acabarlo, la
   * tripulante lo recoge igual: lo mira la comprobación de después. El avión
   * entero, con sus luces y su despegue, se mira en las tres pantallas.
   */
  const delKit = registro.filter((d) => d.clave.startsWith("inicio.ara.pasaje.kit.")).map((d) => d.clave.replace("inicio.ara.pasaje.kit.", ""));
  const piezaContada = registro.find(
    (d) =>
      ["piezas.ala", "piezas.motor", "piezas.cola", "piezas.ruedas", "avion.estabilizador"].includes(d.clave.replace("inicio.ara.pasaje.kit.", "")) &&
      d.como !== "cortada" &&
      !!armando.elegidoEn &&
      d.desde >= armando.elegidoEn.t,
  );
  const despego = armando.despegados > 0;
  /*
   * Y piezas puestas, si hubo rato: el banco solo pone una con el kit sin
   * pausa y sin nadie hablando, y con la luz y su canción delante a veces no
   * queda ni eso antes de pedir guardarlo (24-10-2026: 0 s libres).
   *
   * Lo de la primera pieza va a la cola, detrás de quien hable, y se quita si
   * la tripulante pide guardar el kit antes de que le llegue el turno. Así que
   * Ara tiene que contar alguna **si hubo un hueco** entre elegir el avión y
   * pedir guardarlo; si las charlas de la escena lo llenaron todo, que mandan
   * ellas, no.
   *
   * **Y el hueco, hasta los diez mil pies** (24-10-2026): desde ahí el kit ya
   * no dice nada, que deja la palabra a la tripulante —ver `atenderAlKit` en
   * `inicio-pasaje.ts`—, así que el rato entre cruzarlos y que ella lo pida no
   * es un hueco para Ara. Medido en el banco: 1,9 s entre lo último del kit y
   * su «guárdalo», 0,8 por encima de los diez mil y 1,1 por debajo, y la
   * comprobación lo daba por hueco perdido.
   */
  const cruzaLosDiezMil = (() => {
    const n = altitudes.findIndex((x, k) => k > 0 && altitudes[k - 1].altitud >= 3048 && x.altitud < 3048);
    if (n < 1) return null;
    const a = altitudes[n - 1];
    const b = altitudes[n];
    return a.t + ((a.altitud - 3048) * (b.t - a.t)) / (a.altitud - b.altitud);
  })();
  let hueco = Infinity;
  if (armando.elegidoEn && guardar) {
    hueco = 0;
    const hasta = Math.min(guardar.desde, cruzaLosDiezMil ?? Infinity);
    let fin = armando.elegidoEn.t;
    const enMedio = registro
      .filter((d) => (d.hasta ?? d.desde) > armando.elegidoEn.t && d.desde < hasta)
      .sort((x, y) => x.desde - y.desde);
    for (const d of enMedio) {
      hueco = Math.max(hueco, d.desde - fin);
      fin = Math.max(fin, d.hasta ?? d.desde);
    }
    hueco = Math.max(hueco, hasta - fin);
  }
  comprobar(
    "en el vuelo, después de la luz verde y con lo que queda, se ponen piezas de Armá tu avión —ninguna con la megafonía pausando— y Ara cuenta alguna si la escena le deja un hueco",
    !!armando.elegidoEn &&
      !!torre.fin &&
      armando.elegidoEn.t > torre.fin.t &&
      (armando.puestas.length > 0 || armando.libre < 3) &&
      armando.conPausa === 0 &&
      (!!piezaContada || hueco < 1.5) &&
      (!despego || delKit.includes("avion.luces")),
    armando.elegidoEn
      ? `elegido a los ${armando.elegidoEn.t.toFixed(0)} s a ${pies(armando.elegidoEn.altitud)}, ${torre.fin ? `${(armando.elegidoEn.t - torre.fin.t).toFixed(0)} s después de acabar la luz` : "sin acabar la luz"} · ${armando.libre.toFixed(0)} s libres para jugar (sin pausa y sin nadie hablando) · puestas ${armando.puestas.length} (${armando.puestas.join(", ")}) · fases ${[...armando.fases].join(", ")} · despegó ${despego} · ${armando.pausado} lecturas pausado por la megafonía armando, ${armando.conPausa} puestas en pausa · Ara cuenta ${piezaContada ? `${piezaContada.clave.replace("inicio.ara.pasaje.kit.", "")} a los ${piezaContada.desde.toFixed(0)} s` : "ninguna"} · el hueco más largo hasta los diez mil pies o pedir guardarlo, ${Number.isFinite(hueco) ? `${hueco.toFixed(1)} s` : "—"} · dicho: ${delKit.join(", ") || "nada"}`
      : `no se eligió · la luz ${torre.fin ? `acabó a los ${torre.fin.t.toFixed(0)} s` : "no acabó"} · la tripulante pide guardarlo a los ${guardar?.desde?.toFixed(0) ?? "—"} s`,
  );
  const aGuardar = guardar ? altitudEntre(guardar.desde) : null;
  comprobar(
    "se recoge al empezar la llegada: la tripulante lo pide cruzando los diez mil pies bajando, con el juego que esté abierto, y la llegada se vive sin juego",
    !!guardar &&
      aGuardar !== null &&
      aGuardar < 3048 &&
      aGuardar > 3048 - 300 &&
      kit.recogido &&
      !!kit.recogidoEn &&
      kit.recogidoEn.altitud > 3048 - 350 &&
      !!kit.alRecoger?.abierto &&
      !!kit.alRecoger.juego &&
      !kit.abiertoTrasGuardar &&
      !kit.abiertoEnLaFinal &&
      !kit.botonEnLaFinal,
    `pide guardarlo a ${pies(aGuardar)} · recogido a ${pies(kit.recogidoEn?.altitud ?? null)}, ${kit.alRecoger?.abierto ? `con ${kit.alRecoger.juego ?? "nada"} abierto` : "con el kit cerrado"} · abierto después ${kit.abiertoTrasGuardar} · en la final: abierto ${kit.abiertoEnLaFinal}, mochilita ${kit.botonEnLaFinal} · pausado por la megafonía ${kit.pausado} lecturas`,
  );
  // ── La luz verde en el vuelo, entera, y su canción ──
  const guardarEn = guardar?.desde ?? null;
  comprobar(
    "en el vuelo, la luz verde se juega entera haciendo caso a lo que brilla, y acaba antes de los diez mil pies",
    !!torre.fin && torre.fin.altitud > 3048 && (guardarEn === null || torre.fin.t < guardarEn) && torre.fin.alAire === 0,
    torre.fin
      ? `abierta a los ${torre.abierta?.t?.toFixed(0)} s a ${pies(torre.abierta?.altitud ?? null)} · acaba a los ${torre.fin.t.toFixed(0)} s a ${pies(torre.fin.altitud)}: ${(torre.fin.t - (torre.abierta?.t ?? 0)).toFixed(0)} s de juego · ${torre.fin.rondas} rondas, ${torre.fin.aterrizados} aterrizados, ${torre.fin.rojas} rojas · ${torre.toques} toques · la tripulante pide guardarlo a los ${guardarEn?.toFixed(0) ?? "—"} s`
      : `no acabó · abierta ${JSON.stringify(torre.abierta)} · ${torre.toques} toques · la tripulante pide guardarlo a los ${guardarEn?.toFixed(0) ?? "—"} s`,
  );
  const sono = torre.muestras;
  const ultimaDeLaCancion = sono[sono.length - 1];
  comprobar(
    "y al acabar suena el trozo de la canción, por su bus, después del «¡aterrizaron todos!»",
    !!torre.empieza && torre.empieza.trasElFin !== null && torre.empieza.trasElFin > 2 && torre.empieza.trasElFin < 20 && sono.length > 10,
    torre.empieza
      ? `empieza a los ${torre.empieza.t.toFixed(0)} s, ${torre.empieza.trasElFin?.toFixed(1)} s después de acabar el juego, a ${pies(torre.empieza.altitud)} · suena ${(ultimaDeLaCancion.t - torre.empieza.t).toFixed(0)} s, hasta el ${ultimaDeLaCancion.va?.toFixed(1)} del trozo`
      : "no sonó",
  );
  const cancionAgachada = (lista) => lista.filter((m) => m.agachado && (m.fundido ?? 0) > 0.9);
  const agachada = cancionAgachada(sono);
  const conMegafonia = agachada.filter((m) => m.megafonia);
  const enSuSitio = sono.filter((m) => !m.agachado && (m.fundido ?? 0) > 0.9);
  comprobar(
    "la canción va por debajo de las voces: se agacha cuando alguien habla y vuelve a su sitio",
    agachada.length > 0 ? agachada.some((m) => m.bus < 10 ** (-15 / 20)) && enSuSitio.some((m) => m.bus > 10 ** (-7 / 20)) : true,
    agachada.length > 0
      ? `agachada en ${agachada.length} lecturas (la más baja ${(20 * Math.log10(Math.min(...agachada.map((m) => m.bus)))).toFixed(1)} dB), con la megafonía en ${conMegafonia.length} (${[...new Set(conMegafonia.map((m) => m.linea))].join(", ") || "ninguna"}), con ${[...new Set(agachada.map((m) => m.linea))].join(", ")} · en su sitio ${(20 * Math.log10(Math.max(...enSuSitio.map((m) => m.bus), 1e-6))).toFixed(1)} dB`
      : `nadie habló mientras sonaba en el vuelo: el agachado se mira en las pantallas del kit`,
  );
  const seFue = torre.trasRecoger.filter((x) => x.seVa);
  comprobar(
    "y si la tripulante viene a recoger el kit con la canción sonando, se va con un fundido",
    torre.alRecoger?.sonaba ? seFue.some((x) => x.seVa.fundido < 0.9 && x.seVa.fundido > 0.02) && torre.trasRecoger.every((x) => !x.suena) : !!torre.alRecoger,
    torre.alRecoger
      ? torre.alRecoger.sonaba
        ? `recogido a los ${torre.alRecoger.t.toFixed(0)} s con la canción sonando · fundido ${seFue.map((x) => x.seVa.fundido.toFixed(2)).join(" → ") || "no se vio"}`
        : `la canción ya había acabado entera ${torre.empieza && ultimaDeLaCancion ? `${(torre.alRecoger.t - ultimaDeLaCancion.t).toFixed(0)} s` : "—"} antes de recoger el kit`
      : "no se recogió",
  );
  // ── El hilo musical ──
  comprobar(
    "el hilo musical suena al embarcar, la de Canarias, por el altavoz del techo y en el bus de la música",
    musica.embarque?.suena === "canarias" && musica.embarque.porElTecho && musica.embarque.bus === "musica" && !!musica.embarque.vuelta,
    musica.embarque ? JSON.stringify(musica.embarque) : "no sonó",
  );
  comprobar(
    "y se calla con la primera megafonía, y no suena ni subiendo, ni arriba, ni bajando por encima de los diez mil pies",
    musica.callada === true && musica.enVuelo.length === 0,
    `callada tras la bienvenida: ${musica.callada} · antes de la última bajada: ${[...new Set(musica.enVuelo)].join(", ") || "nada"}`,
  );
  /*
   * **La música de llegada, del descenso al puesto** (punto 302): empieza
   * bajando, por debajo de los diez mil pies, sigue por la rodadura y se
   * calla con cada anuncio; y se acaba al llegar al puesto, que con los
   * motores apagados la gente ya está de pie.
   */
  comprobar(
    "la música de llegada empieza bajando, por debajo de los diez mil pies, y suena rodando hasta el puesto",
    musica.empieza?.suena === "canarias" &&
      musica.empieza.tramo === "bajada" &&
      musica.empieza.pies <= 10000 + 200 &&
      musica.rodandoAlPuesto > 0,
    musica.empieza
      ? `empieza a los ${musica.empieza.t.toFixed(0)} s, ${musica.empieza.tramo} a ${musica.empieza.pies} ft · rodando al puesto en ${musica.rodandoAlPuesto} muestras`
      : "no sonó",
  );
  comprobar(
    "y no suena en el puesto ni con los motores apagados, ni encima de la megafonía",
    // Con los motores apagados, ni una muestra; al pararse en el puesto, la del fotograma en que cambia la fase.
    !musica.enElPuesto.some((x) => x.includes("apagado")) && musica.enElPuesto.length <= 1 && musica.conMegafonia.length <= 2,
    `en el puesto: ${musica.enElPuesto.join(", ") || "nada"} · con la megafonía: ${musica.conMegafonia.join(", ") || "nada"}`,
  );
  // ── Por qué ponen música al bajar ──
  /*
   * Ara pregunta poco después de que empiece la música de llegada, con ella
   * sonando, una vez, y contesta la tripulante en persona; ni la pregunta ni
   * la respuesta caen encima de otra frase. Lo oído, que es lo que se pisa:
   * lo que sonó y lo que se dejó leer.
   */
  const oidas = registro.filter((d) => d.como === "sono" || d.como === "muda");
  const pisaA = (d) =>
    oidas
      .filter((o) => o !== d && o.hasta !== null && d.hasta !== null && o.desde < d.hasta - 0.05 && d.desde < o.hasta - 0.05)
      .map((o) => o.clave);
  const preguntasDeLaMusica = registro.filter((d) => d.clave === "inicio.ara.pasaje.musica");
  const respuesta = registro.find((d) => d.clave === "inicio.tripulacion.pasaje.cerca.musica");
  const pisadasDeLaMusica = [...preguntasDeLaMusica, ...(respuesta ? [respuesta] : [])].flatMap(pisaA);
  comprobar(
    "Ara pregunta por qué ponen música una vez, con la de llegada ya sonando, y la tripulante contesta en persona sin pisar a nadie",
    preguntasDeLaMusica.length === 1 &&
      !!musica.empieza &&
      preguntasDeLaMusica[0].desde > musica.empieza.t &&
      preguntaDeLaMusica?.suena === "canarias" &&
      !!respuesta &&
      respuesta.desde >= (preguntasDeLaMusica[0].hasta ?? Infinity) &&
      pisadasDeLaMusica.length === 0,
    preguntasDeLaMusica.length
      ? `${preguntasDeLaMusica.length} vez, a los ${preguntasDeLaMusica[0].desde.toFixed(0)} s (música desde los ${musica.empieza?.t.toFixed(0) ?? "—"} s; al preguntar suena ${preguntaDeLaMusica?.suena ?? "nada"}, ${preguntaDeLaMusica?.tramo ?? "—"} a ${preguntaDeLaMusica?.pies ?? "—"} ft) · contesta a los ${respuesta?.desde.toFixed(0) ?? "—"} s · pisa: ${pisadasDeLaMusica.join(", ") || "nada"}`
      : "no preguntó",
  );
  // ── Lo que se reconoce al llegar: la ladera de Mazo (punto 314) ──
  /*
   * Ara la cuenta en la final, y solo con la ladera a la vista por su cristal
   * en todas las muestras mientras habla —en la imagen, por el cristal, sin
   * nube—, con la cara contra él mirando hacia allí; acaba antes de que se
   * corte a la pista para ver tocar. Y el nombre lo dice la comandante en
   * tierra, una vez y sin pisar a nadie; si Ara no la vio, nadie la nombra.
   */
  const mazoDicho = registro.find((d) => d.clave === "inicio.ara.pasaje.mazo");
  const mazoCaminos = registro.find((d) => d.clave === "inicio.ara.pasaje.mazoCaminos");
  const mazoBici = registro.find((d) => d.clave === "inicio.ara.pasaje.mazoBici");
  const mazoNombrado = nombrados.find((n) => n.clave === "inicio.ara.pasaje.mazo");
  const yaCasi = registro.find((d) => d.clave === "inicio.ara.pasaje.yaCasi");
  const mazoMal = mazo.muestras.filter(
    (x) =>
      !(
        x.enLaImagen &&
        x.cristal === true &&
        x.ojoEnNube < 0.35 &&
        (x.nube ?? Infinity) < 150 &&
        x.plano === "asomado-paisaje" &&
        ["final", "recogida"].includes(x.tramo) &&
        !x.enTierra
      ),
  );
  const primeraDeMazo = mazo.muestras[0];
  const ultimaDeMazo = mazo.muestras[mazo.muestras.length - 1];
  comprobar(
    "lo de Mazo lo dice Ara en la final, solo con la ladera a la vista por su cristal y la cara contra él, y acaba antes de ver tocar",
    !!mazoDicho &&
      !!mazoCaminos &&
      !!mazoBici &&
      !!mazoNombrado?.ok &&
      mazoNombrado.como === "asomado" &&
      mazoNombrado.plano === "asomado-paisaje" &&
      mazo.muestras.length >= 3 &&
      mazoMal.length === 0 &&
      !!yaCasi &&
      yaCasi.desde >= (mazoBici.hasta ?? Infinity),
    mazoDicho
      ? `a los ${mazoDicho.desde.toFixed(0)} s, ${mazoNombrado?.como ?? "—"} · ${mazo.muestras.length} muestras, ${mazoMal.length} malas` +
          (primeraDeMazo ? ` · de ${primeraDeMazo.pies} ft a ${primeraDeMazo.km?.toFixed(1)} km hasta ${ultimaDeMazo.pies} ft a ${ultimaDeMazo.km?.toFixed(1)} km` : "") +
          ` · «ya casi» a los ${yaCasi?.desde.toFixed(0) ?? "—"} s, lo de Mazo acaba a los ${mazoBici?.hasta?.toFixed(0) ?? "—"} s` +
          (mazoMal.length ? ` · la primera mala: ${JSON.stringify(mazoMal[0])}` : "")
      : "no se dijo",
  );
  const nombreDeMazo = registro.filter((d) => d.clave === "inicio.mama.pasaje.mazo");
  const toco = tramos.find((x) => x.tramo === "frenando")?.t ?? Infinity;
  const alNombrar = nombreDeMazo[0] ? llegada.filter((x) => x.t <= nombreDeMazo[0].desde).pop() : null;
  comprobar(
    "y el nombre, Villa de Mazo, lo dice la comandante en tierra y no en la final: una vez, rodando con la pista libre y sin pisar a nadie",
    mazoDicho
      ? nombreDeMazo.length === 1 &&
          nombreDeMazo[0].desde > toco &&
          ["al-puesto", "aparcado"].includes(alNombrar?.tramo) &&
          pisaA(nombreDeMazo[0]).length === 0
      : nombreDeMazo.length === 0,
    nombreDeMazo.length
      ? `a los ${nombreDeMazo[0].desde.toFixed(0)} s (tocó a los ${toco.toFixed(0)} s), ${alNombrar?.tramo ?? "—"}/${alNombrar?.fase ?? "—"} a ${alNombrar?.lado?.toFixed(0) ?? "—"} m del eje · plano ${alNombrar?.plano ?? "—"} · pisa: ${pisaA(nombreDeMazo[0]).join(", ") || "nada"}`
      : mazoDicho
        ? "no lo dijo"
        : "Ara no vio Mazo, y nadie la nombra",
  );
  // ── Lo que se oye cambiar: el gas de los motores y los oídos ──
  /*
   * **Cada cambio de gas que se cuenta pasó de verdad, y se oye** (punto
   * 297): la tripulación apunta cada cambio de potencia con su hora, que es
   * la de la escena; lo que dice Ara va detrás, a menos de cuarenta y cinco
   * segundos, y el gas con el que suena el motor —el de la mezcla— cambió de
   * verdad hacia donde lo dice: más bajito, o más fuerte.
   */
  const potencias = t?.potencias ?? [];
  const gasEn = (s) => oido.filter((x) => x.t <= s).at(-1)?.gas ?? null;
  const altitudEn = (s) => altitudes.filter((x) => x.t <= s).at(-1)?.altitud ?? null;
  const LO_QUE_NOTA = [
    { clave: "inicio.ara.pasaje.menosGas", potencia: "subida", baja: true },
    { clave: "inicio.ara.pasaje.ralenti", potencia: "ralenti", baja: true },
    { clave: "inicio.ara.pasaje.masGas", potencia: "aproximacion", baja: false },
  ];
  const notados = LO_QUE_NOTA.map((n) => {
    const dicha = registro.find((d) => d.clave === n.clave);
    const cambio = potencias.find((p) => p.potencia === n.potencia);
    // Antes del cambio, y pasado lo que tardan los motores en llegar —de dos a siete segundos—.
    const antes = cambio ? gasEn(cambio.desde - 1) : null;
    const despues = dicha && cambio ? gasEn(Math.max(dicha.desde, cambio.desde + 8)) : null;
    const ok =
      !!dicha &&
      !!cambio &&
      dicha.desde > cambio.desde &&
      dicha.desde - cambio.desde < 45 &&
      antes !== null &&
      despues !== null &&
      (n.baja ? antes - despues >= 0.15 : despues - antes >= 0.1);
    return { ...n, dicha, cambio, antes, despues, ok };
  });
  comprobar(
    "cada cambio de gas que cuenta Ara pasó de verdad un poco antes, y se oye: el motor suena más bajito o más fuerte",
    notados.every((n) => n.ok) && registro.filter((d) => LO_QUE_NOTA.some((n) => n.clave === d.clave)).length === LO_QUE_NOTA.length,
    notados
      .map(
        (n) =>
          `${n.clave.split(".").pop()}: ${n.cambio ? `cambio a los ${n.cambio.desde.toFixed(0)} s` : "sin cambio"}, ${n.dicha ? `dicho a los ${n.dicha.desde.toFixed(0)} s` : "no dicho"}, gas ${n.antes?.toFixed(2) ?? "?"}→${n.despues?.toFixed(2) ?? "?"}${n.ok ? "" : " ✗"}`,
      )
      .join(" · "),
  );
  const explicaSubida = registro.find((d) => d.clave === "inicio.mama.pasaje.menosGas");
  const explicaAproximacion = registro.find((d) => d.clave === "inicio.mama.pasaje.masGas");
  const reversa = registro.find((d) => d.clave === "inicio.mama.pasaje.reversa");
  // El del ralentí —para bajar no se apagan los motores—, lo primero después de los oídos, salvo lo señalado.
  const bostezoDeLaBajada = registro.find((d) => d.clave === "inicio.ara.pasaje.bostezo");
  const explicaRalenti = registro.find((d) => d.clave === "inicio.mama.pasaje.bajando");
  const antesDelRalenti =
    bostezoDeLaBajada && explicaRalenti
      ? registro
          .filter((d) => d.desde > bostezoDeLaBajada.desde && d.desde < explicaRalenti.desde - 5)
          .map((d) => d.clave)
          .filter((c) => !/^(ventanilla|inicio\.ara\.pasaje\.(teide|garajonay|orotava|loVeo|preguntaBajar)$)/.test(c))
          // Y lo que dice Ara de lo que se toca por la ventanilla, que es como lo señalado: lo que se ve ahora.
          .filter((c) => !(e?.toques ?? []).some((q) => q.dijo.includes(c) && c.startsWith("inicio.ara.")))
      : null;
  comprobar(
    "y lo explica la comandante en el primer rato tranquilo: el de subida pasados los diez mil pies, el del ralentí tras los oídos, el de la aproximación en tierra, tras la reversa",
    !!explicaRalenti &&
      antesDelRalenti?.length === 0 &&
      (altitudEn(explicaRalenti.desde) ?? 0) >= 3048 &&
      !!explicaSubida &&
      (altitudEn(explicaSubida.desde) ?? 0) >= 3048 - 30 &&
      !!explicaAproximacion &&
      !!reversa &&
      explicaAproximacion.desde > reversa.desde &&
      registro.filter((d) => d.clave === "inicio.mama.pasaje.menosGas" || d.clave === "inicio.mama.pasaje.masGas").length === 2,
    `subida: ${explicaSubida ? `a los ${explicaSubida.desde.toFixed(0)} s, a ${Math.round((altitudEn(explicaSubida.desde) ?? 0) / 0.3048)} ft` : "no"} · ralentí: ${explicaRalenti ? `a los ${explicaRalenti.desde.toFixed(0)} s, a ${Math.round((altitudEn(explicaRalenti.desde) ?? 0) / 0.3048)} ft${antesDelRalenti?.length ? `, detrás de ${antesDelRalenti.join(", ")}` : ""}` : "no"} · aproximación: ${explicaAproximacion ? `a los ${explicaAproximacion.desde.toFixed(0)} s, tras la reversa ${reversa ? (explicaAproximacion.desde > reversa.desde) : "?"}` : "no"}`,
  );
  const plops = ["inicio.tripulacion.pasaje.cerca.plop1", "inicio.tripulacion.pasaje.cerca.plop2"].map((c) => registro.filter((d) => d.clave === c));
  const plopDeAra = registro.find((d) => d.clave === "inicio.ara.pasaje.plop");
  comprobar(
    "el plop de los oídos se explica una vez, la tripulante en persona; y al bajar Ara ya sabe que es al revés",
    !!plopDeAra &&
      plops.every((x) => x.length === 1 && x[0].desde > plopDeAra.desde) &&
      registro.some((d) => d.clave === "inicio.ara.pasaje.oidosAlReves") &&
      !registro.some((d) => d.clave === "inicio.ara.pasaje.oidos"),
    `plop de Ara a los ${plopDeAra?.desde?.toFixed(0) ?? "?"} s · explicado ${plops.map((x) => `${x.length} vez (a los ${x[0]?.desde?.toFixed(0) ?? "?"} s)`).join(" y ")} · al bajar: ${registro.some((d) => d.clave === "inicio.ara.pasaje.oidosAlReves") ? "al revés" : "pregunta"}`,
  );
  /*
   * **Y cuánto calla la bajada**, sin la siesta: lo que suma el silencio entre
   * frases mientras la tripulación baja, y cuánto de eso tiene la música de
   * llegada debajo. Se apunta, no se mide contra nada: es para saber.
   */
  {
    const bajada = tramos.find((x) => x.tramo === "bajada");
    const final = tramos.find((x) => x.tramo === "final");
    if (bajada && final) {
      let callado = 0;
      for (let k = 1; k < registro.length; k++) {
        const desde = Math.max(bajada.t, registro[k - 1].hasta ?? registro[k - 1].desde);
        const hasta = Math.min(final.t, registro[k].desde);
        if (hasta > desde) callado += hasta - desde;
      }
      const conMusica = musica.empieza ? Math.max(0, final.t - Math.max(bajada.t, musica.empieza.t)) : 0;
      console.log(
        `  la bajada dura ${(final.t - bajada.t).toFixed(0)} s: ${callado.toFixed(0)} s sin que hable nadie; la música de llegada, desde ${musica.empieza ? `los ${musica.empieza.t.toFixed(0)} s` : "—"}, cubre ${conMusica.toFixed(0)} s de bajada`,
      );
    }
  }
  // ── Lo que se nombra, a la vista; la foto con su voz; el meneo, el techo, el tren y el señalero ──
  for (const n of nombrados)
    console.log(
      `  ${n.ok ? "·" : "✗"} ${n.sitio} (${n.clave}) a los ${n.desde.toFixed(0)} s: ${n.como} por ${n.lado ?? "—"} · plano ${n.plano} · ` +
        (n.medido
          ? `en la imagen ${n.medido.x.toFixed(2)},${n.medido.y.toFixed(2)}${n.medido.delante ? "" : " detrás"} · cristal ${n.medido.porElCristal} · ojo en nube ${n.medido.ojoEnNube.toFixed(2)} · nube por medio ${n.medido.nubeEnMedio.toFixed(0)} m (${(n.medido.nubeSinDesvanecer ?? 0).toFixed(0)} m sin el desvanecido) · a ${(n.medido.distancia / 1000).toFixed(1)} km`
          : "sin punto"),
    );
  comprobar(
    "lo que se nombra del paisaje está a la vista cuando se nombra: en la imagen, por el cristal y sin nube por medio",
    nombrados.length >= 3 && nombrados.every((n) => n.ok),
    `${nombrados.filter((n) => n.ok).length} de ${nombrados.length}: ${nombrados.map((n) => `${n.sitio}${n.ok ? "" : " ✗"}`).join(", ")}`,
  );
  // ── La lámina grande de lo que se explica (punto 305) ──
  /*
   * Un cuarto del ancho. En las tomas de cerca del ala y del tren, las llena
   * el avión de punta a raíz: ahí manda no taparlo, y la lámina se queda en lo
   * que deja libre, que el 19-10-2026 midió entre un 19 y un 22 %. El suelo
   * ahí es no bajar de la ventanita de antes, 240 px de 1280: si baja de eso,
   * lo grande no ha servido de nada.
   */
  const minimo = minimoDeLaLamina;
  /*
   * **El suelo se mide en superficie, no solo de ancho** (punto 311): el cuarto
   * del ancho se puso con los dibujos, de 3:2, y los esquemas con ilustración
   * son de 4:3, más altos. A igual superficie que una de 3:2 de un cuarto del
   * ancho, una de 4:3 mide un 94 % de ese ancho: no es más pequeña, es más alta.
   */
  const anchoMinimo = (l) => anchoMinimoDeLaLamina(l.plano, l.proporcion);
  const dibujosVistos = [...laminas].filter(([s]) => s.startsWith("dibujo:"));
  const pequenos = dibujosVistos.filter(([, l]) => l.ancho < anchoMinimo(l));
  comprobar(
    "lo que se explica sale en grande: cada dibujo, de un cuarto del ancho como poco (y nunca menos que la ventanita de antes con el ala o el tren de cerca)",
    dibujosVistos.length >= 5 && pequenos.length === 0 && [...laminas.values()].every((l) => l.donde === "grande"),
    [...laminas].map(([s, l]) => `${s.replace(/^(dibujo|ilustracion):/, "")} ${(l.ancho * 100).toFixed(1)} %${l.proporcion < 1.4 ? " (4:3)" : ""}${l.plano && l.plano !== "ventanilla" ? ` (${l.plano})` : ""}`).join(", "),
  );
  /*
   * **Y cada dibujo que ya tiene ilustración, con ella** (punto 311): en todas
   * las muestras con la lámina puesta, su fichero y nunca el dibujo de código.
   * Lo grande y lo que no tapa lo miran las de al lado, con todas las demás.
   */
  const esquemasVistos = [...conSuIlustracion];
  const conDibujoDeCodigo = esquemasVistos.filter(([clave, vistos]) => [...vistos].some((f) => !esSuIlustracion(clave, f)));
  comprobar(
    "los esquemas salen con su ilustración, no con el dibujo de código",
    esquemasVistos.length >= 4 && conDibujoDeCodigo.length === 0,
    `${esquemasVistos.map(([c, vistos]) => `${c}${[...vistos].every((f) => esSuIlustracion(c, f)) ? "" : ` ✗ (${[...vistos].join(", ")})`}`).join(", ") || "ninguno"}` +
      ` · torre de «Luz verde»: ${ventanitas.has("ilustracion:torre-radio") ? "salió" : "no salió"}`,
  );
  comprobar(
    "y no tapa lo nombrado, ni la tarjeta de quien habla ni los botones",
    laminaPisa.size === 0 && laminaConNombrado.size > 0,
    `${laminaPisa.size ? [...laminaPisa].join(" · ") : "nada pisado"} · lo nombrado a la vista con la lámina puesta: ${[...laminaConNombrado].join(", ") || "nunca"}`,
  );
  const olvidados = e?.saltados ?? [];
  comprobar(
    "y la isla de llegada se dice cuando se ve, no metido en la nube",
    nombrados.some((n) => n.clave === "inicio.ara.pasaje.isla" && n.ok) && !olvidados.includes("isla"),
    nombrados.filter((n) => n.sitio === "isla-de-llegada").map((n) => `${n.como} a los ${n.desde.toFixed(0)} s`).join(", ") || "no se dijo",
  );
  comprobar(
    "la foto de una historia sale solo con su voz sonando, y Ara no contesta a lo que no se oyó",
    fotosMudas.size === 0 &&
      registro
        .filter((d) => d.clave === "inicio.ara.pasaje.garajonay")
        .every((d) => registro.some((h) => h.clave === "ventanilla.historia" && h.como === "sono" && h.hasta !== null && h.hasta <= d.desde)),
    fotosMudas.size ? [...fotosMudas].join(" · ") : `${fotosConVoz} muestras de foto, todas con su voz`,
  );
  comprobar(
    "dentro de la nube el avión se menea y se cuenta en el momento: Ara, la comandante y Ara",
    (meneoEnLaNube ?? 0) >= 0.35 &&
      ["inicio.ara.pasaje.meneo", "inicio.mama.pasaje.meneo", "inicio.ara.pasaje.meneoBien"].every((c) => claves.includes(c)),
    `en la nube al empezar: ${meneoEnLaNube === null ? "no se dijo" : meneoEnLaNube.toFixed(2)}`,
  );
  const techo = claves.indexOf("inicio.ara.pasaje.bajoLasNubes");
  comprobar(
    "al salir por debajo de las nubes se cuenta el techo, con los números de hoy y la visibilidad",
    techo >= 0 && ["inicio.tripulacion.pasaje.cerca.techo", "inicio.ara.pasaje.techo"].some((c) => claves.slice(techo).includes(c)),
    claves.slice(techo, techo + 4).join(" → ") || "no se dijo",
  );
  comprobar(
    "el Teide se presenta antes de volar más alto que él",
    claves.includes("inicio.mama.pasaje.altoRapido") &&
      (claves.indexOf("inicio.mama.pasaje.teide") >= 0
        ? claves.indexOf("inicio.mama.pasaje.teide") < claves.indexOf("inicio.mama.pasaje.altoRapido")
        : registro.some((d) => d.clave === "ventanilla" && d.desde < registro.find((x) => x.clave === "inicio.mama.pasaje.altoRapido").desde)),
    `presentación en ${claves.indexOf("inicio.mama.pasaje.teide")} · más alto que el Teide en ${claves.indexOf("inicio.mama.pasaje.altoRapido")}`,
  );
  comprobar(
    "el tren se ve desde abajo al salir, y el señalero desde el suelo hasta parar el avión",
    vistos.has("fuera-tren") && vistos.has("fuera-senalero"),
    `vistos: ${[...vistos].filter((p) => p === "fuera-tren" || p === "fuera-senalero").join(", ") || "ninguno"}`,
  );
  // ── La llegada a La Palma (punto 300): la vuelta en la pista ──
  {
    const GRADO = Math.PI / 180;
    const rodando = llegada.filter((x) => x.tramo === "al-puesto");
    // Lo que de verdad hizo el avión: empezar a girar cerca del eje, y volver por la pista.
    const k = rodando.findIndex((x) => x.vuelta !== null && x.vuelta > 35 * GRADO && x.lado < 45);
    const giro = k >= 0 ? rodando[k] : null;
    // Lo que se muestrea va a saltos con el juego acelerado: el giro empezó después de la muestra anterior.
    const antesDelGiro = k > 0 ? rodando[k - 1].t : giro?.t ?? null;
    const remonta = rodando.find((x) => x.vuelta !== null && x.vuelta > 150 * GRADO && x.lado < 25) ?? null;
    const kDeja = giro ? llegada.findIndex((x) => x.t > giro.t && x.fase === "a-plataforma") : -1;
    const deja = kDeja >= 0 ? llegada[kDeja] : null;
    const antesDeDejar = kDeja > 0 ? llegada[kDeja - 1].t : deja?.t ?? null;
    const nota = registro.find((d) => d.clave === "inicio.ara.pasaje.vueltaEnPista");
    const explica = registro.find((d) => d.clave === "inicio.mama.pasaje.vueltaEnPista");
    const permiso = registro.find((d) => d.clave === "inicio.mama.pasaje.permisoDeVuelta");
    // Lo que se aparta del eje girando, en la pista: hasta dejarla.
    const girando = rodando.filter((x) => x.vuelta !== null && x.vuelta > 35 * GRADO && (!deja || x.t < deja.t));
    const maxLado = Math.max(0, ...girando.map((x) => x.lado));
    console.log(
      `  la vuelta en la pista: ${giro ? `empieza a girar a los ${giro.t.toFixed(0)} s (muestra anterior ${antesDelGiro?.toFixed(0)} s)` : "no gira"} · ${remonta ? `remonta a los ${remonta.t.toFixed(0)} s` : "no remonta"} · deja la pista a los ${deja?.t?.toFixed(0) ?? "—"} s · Ara a los ${nota?.desde?.toFixed(0) ?? "—"} s · la comandante a los ${explica?.desde?.toFixed(0) ?? "—"} y ${permiso?.desde?.toFixed(0) ?? "—"} s`,
    );
    comprobar(
      "la vuelta en la pista: Ara la nota cuando el avión de verdad gira, con el avión por fuera, y la comandante la explica al dejar la pista",
      remonta
        ? !!giro &&
            !!nota &&
            nota.desde >= (antesDelGiro ?? Infinity) - 0.5 &&
            !!deja &&
            nota.desde < deja.t &&
            vistos.has("fuera-raqueta") &&
            ventanitas.has("dibujo:vuelta-en-pista") &&
            !!explica &&
            !!permiso &&
            explica.desde >= (antesDeDejar ?? Infinity) - 0.5 &&
            explica.desde > nota.desde &&
            permiso.desde > explica.desde &&
            [nota, explica, permiso].every((d) => registro.filter((x) => x.clave === d.clave).length === 1)
        : !nota && !explica && !permiso,
      remonta
        ? `gira a los ${giro?.t?.toFixed(0)} s, se aparta ${maxLado.toFixed(0)} m del eje girando · Ara a los ${nota?.desde?.toFixed(0) ?? "—"} s · fuera-raqueta ${vistos.has("fuera-raqueta")} · deja la pista a los ${deja?.t?.toFixed(0) ?? "—"} s · la comandante a los ${explica?.desde?.toFixed(0) ?? "—"} s`
        : `sin vuelta en la pista: ${nota || explica ? "¡y se contó!" : "y no se cuenta"}`,
    );
  }
  // ── Los que se levantan antes de tiempo (punto 303): Ara en su asiento hasta que se apaga la luz ──
  {
    const despego = tramos.find((x) => x.tramo === "carrera")?.t ?? 0;
    const kLuz = llegada.findIndex((x) => x.t > despego && (x.tramo === "apagado" || x.tramo === "aparcado") && !x.cartel);
    const luz = kLuz >= 0 ? llegada[kLuz] : null;
    const antesDeLaLuz = kLuz > 0 ? llegada[kLuz - 1].t : null;
    const encendidaRodando = llegada.filter((x) => x.tramo === "al-puesto").every((x) => x.cartel);
    const dicha = (c) => registro.find((d) => d.clave === c);
    const seLevantan = dicha("inicio.ara.pasaje.seLevantan");
    const todavia = dicha("inicio.ara.pasaje.cinturonQuieto");
    const suelta = dicha("inicio.ara.pasaje.luzApagada");
    const hebillasAntes = gente.filter((g) => g.que === "hebilla" && luz && g.t <= luz.t);
    const levantanAntes = gente.filter((g) => g.que === "levantarse" && luz && g.t <= luz.t);
    const despues = gente.filter((g) => luz && g.t > luz.t);
    console.log(
      `  el puesto: la luz se apaga a los ${luz?.t?.toFixed(0) ?? "—"} s (${luz?.tramo ?? "—"}) · ${hebillasAntes.length} hebillas y ${levantanAntes.length} de pie antes, la primera a los ${hebillasAntes[0]?.t?.toFixed(0) ?? "—"} s · ${despues.length} ruidos de la gente después · Ara: «se levantan» a los ${seLevantan?.desde?.toFixed(0) ?? "—"} s, «todavía no» a los ${todavia?.desde?.toFixed(0) ?? "—"} s, se suelta a los ${suelta?.desde?.toFixed(0) ?? "—"} s`,
    );
    comprobar(
      "Ara no se levanta ni se suelta antes de que se apague la luz: la oye a la gente y espera, y se suelta con el ding",
      !!luz &&
        encendidaRodando &&
        !!seLevantan &&
        !!todavia &&
        !!suelta &&
        hebillasAntes.length >= 2 &&
        hebillasAntes[0].t <= seLevantan.desde &&
        todavia.desde > seLevantan.desde &&
        (todavia.hasta ?? Infinity) <= luz.t + 0.5 &&
        suelta.desde >= (antesDeLaLuz ?? Infinity) &&
        suelta.desde >= luz.t - 0.5 &&
        despues.some((g) => g.que === "hebilla") &&
        registro.filter((d) => d.clave === "inicio.ara.pasaje.cinturonQuieto").length === 1,
      `luz apagada a los ${luz?.t?.toFixed(0) ?? "—"} s · encendida rodando ${encendidaRodando} · hebillas antes ${hebillasAntes.length} · «todavía no» ${todavia?.desde?.toFixed(0) ?? "—"}–${todavia?.hasta?.toFixed(0) ?? "—"} s · se suelta ${suelta?.desde?.toFixed(0) ?? "—"} s`,
    );
    /*
     * ── El baño (punto 293): la luz manda, y cuando se apaga, se puede ──
     *
     * Ara cuenta en el embarque que fue antes de subir; lo pide rodando, con
     * la luz encendida, y no se levanta. Si va, es con la luz apagada —medida
     * en el cartel de la pantalla, de que se va a que vuelve—, y vuelve antes
     * de que se encienda. Si no hubo rato, espera a aterrizar con la luz
     * encendida.
     */
    {
      const cartelEn = (s) => luces.filter((x) => x.t <= s).at(-1)?.cartel ?? true;
      const encendidaEntre = (a, b) => cartelEn(a) || luces.some((x) => x.t > a && x.t < b && x.cartel);
      const antes = dicha("inicio.ara.pasaje.banoAntes");
      const pregunta = dicha("inicio.ara.pasaje.bano");
      const promete = dicha("inicio.tripulacion.pasaje.cerca.banoLuz");
      const seVa = dicha("inicio.tripulacion.pasaje.cerca.banoAhora");
      const vuelve = dicha("inicio.ara.pasaje.banoVuelta");
      const aTiempo = dicha("inicio.tripulacion.pasaje.cerca.banoATiempo");
      const espera = dicha("inicio.ara.pasaje.banoEspero");
      const fue = !!seVa && !!vuelve;
      const sale = seVa ? Math.max(seVa.desde, seVa.hasta ?? seVa.desde) : null;
      console.log(
        `  la luz del cinturón: ${luces.map((x) => `${x.cartel ? "encendida" : "apagada"} a los ${x.t.toFixed(0)} s (${x.tramo ?? "—"})`).join(" · ")}`,
      );
      comprobar(
        "la luz manda (punto 293): Ara fue al baño antes de subir, lo pide rodando con la luz encendida y no se levanta; si va, es con la luz apagada, y vuelve antes de que se encienda",
        !!antes &&
          !!pregunta &&
          !!promete &&
          antes.desde < (dicha("inicio.tripulacion.pasaje.cinturon")?.desde ?? 0) &&
          cartelEn(pregunta.desde) &&
          cartelEn(promete.desde) &&
          (fue
            ? !encendidaEntre(sale, vuelve.desde) && e?.fueAlBano === true && !espera && !!aTiempo && cartelEn(aTiempo.desde)
            : !!espera && cartelEn(espera.desde) && e?.fueAlBano === false),
        fue
          ? `se va a los ${sale.toFixed(0)} s y vuelve a los ${vuelve.desde.toFixed(0)} s, con la luz ${encendidaEntre(sale, vuelve.desde) ? "¡encendida!" : "apagada"} · «a tiempo» a los ${aTiempo?.desde?.toFixed(0) ?? "—"} s`
          : `no fue: espera a aterrizar, a los ${espera?.desde?.toFixed(0) ?? "—"} s, con la luz ${espera && cartelEn(espera.desde) ? "encendida" : "¿apagada?"}`,
      );
    }
    // ── Y lo que es la tripulación: una vez, sin pisar a nadie ──
    const oficio = ["inicio.tripulacion.pasaje.cerca.oficio1", "inicio.tripulacion.pasaje.cerca.oficio2", "inicio.ara.pasaje.uniforme"].map((c) =>
      registro.filter((d) => d.clave === c),
    );
    const pisa = oficio.flat().some((d) => registro.some((x) => x !== d && x.desde < (d.hasta ?? Infinity) - 1e-6 && (x.hasta ?? Infinity) > d.desde + 1e-6));
    const tramoDe = (s) => [...tramos].reverse().find((x) => x.t <= s)?.tramo ?? "?";
    const delPuesto = ["gracias", "maleteros", "seria"].map((c) => dicha(`inicio.tripulacion.pasaje.cerca.${c}`));
    comprobar(
      "lo que sabe hacer la tripulante sale una vez y no pisa a nadie; y en el puesto, las gracias, los compartimentos y su cara seria",
      oficio.every((x) => x.length === 1) &&
        !pisa &&
        delPuesto.every((d) => !!d && !!luz && d.desde > luz.t) &&
        ventanitas.has("dibujo:tripulacion") &&
        ventanitas.has("dibujo:maletero"),
      `${oficio.map((x) => `${x[0]?.clave.split(".").pop() ?? "?"} ×${x.length}${x[0] ? ` a los ${x[0].desde.toFixed(0)} s (${tramoDe(x[0].desde)})` : ""}`).join(" · ")} · pisa: ${pisa} · en el puesto: ${delPuesto.map((d) => d?.desde?.toFixed(0) ?? "—").join(", ")} s`,
    );
  }
  if (e) console.log(`  la escena duró ${e.segundos.toFixed(0)} s de reloj del juego`);
  comprobar("sin errores", errores.length === 0, errores[0] ?? "limpio");
  await ctx.close();
}

/**
 * **La siesta de Ara, de cerca** (punto 304): desde el bostezo, el fundido a
 * medio camino, Ara soñando con el mapa en la ventanita a mitad de la siesta y
 * el despertar con el mapa todavía puesto, cada uno con su captura; y
 * mientras duerme, qué ilustraciones salen y en qué orden, si el
 * avión sigue su ruta —lo que se aparta del tramo del plan— y si recorre lo
 * que da su velocidad por el suelo en el tiempo de vuelo que pasa, que es lo
 * que distingue volar deprisa de saltar.
 */
async function mirarLaSiesta(page) {
  const leerSiesta = () =>
    page.evaluate(() => {
      const j = globalThis.__oga.inicio();
      const l = j.lecturaDeLinea;
      return {
        durmiendo: !!j.estado?.durmiendo,
        segundos: j.estado?.segundos ?? 0,
        siesta: j.siesta,
        ruta: j.ruta,
        mapa: j.ventanita?.sitio === "dibujo:ruta" && !!j.ventanita?.donde,
        x: l?.x ?? null,
        z: l?.z ?? null,
        rumbo: l?.rumbo ?? null,
        tramo: l?.tramo ?? null,
        falta: l?.faltaParaTocar ?? null,
        suelo: l?.porElSuelo ?? 0,
      };
    });
  const r = { pared: null, vuelo: null, lado: 0, muestras: 0, recorrido: null, islas: [], avionAntes: null, avionDespues: null, vistas: [], conElMapa: 0, km: null, atras: null };
  // El bostezo, que se oye o se lee; y Ara cierra los ojos.
  await page.waitForFunction(() => globalThis.__oga.inicio().estado?.durmiendo, null, { timeout: 40_000 }).catch(() => {});
  let a = await leerSiesta();
  if (!a.durmiendo) return r;
  const empieza = Date.now();
  await page
    .waitForFunction(() => (globalThis.__oga.inicio().siesta?.opacidad ?? 0) > 0.35, null, { timeout: 5000, polling: 16 })
    .catch(() => {});
  await foto(page, "siesta-fundido");
  a = await leerSiesta();
  const desde = a;
  let antes = a;
  let previsto = 0;
  let conFoto = false;
  while (a.durmiendo && Date.now() - empieza < 60_000) {
    if (a.siesta) r.vistas = a.siesta.vistas;
    if (a.ruta) {
      r.islas = a.ruta.islas;
      r.avionAntes ??= a.ruta.avion;
      r.avionDespues = a.ruta.avion;
    }
    // Lo que se aparta del tramo del plan que se vuela.
    if (a.tramo && a.x !== null) {
      const { desde: d, hasta: h } = a.tramo;
      const dx = h.x - d.x;
      const dz = h.z - d.z;
      r.lado = Math.max(r.lado, Math.abs(dx * (a.z - d.z) - dz * (a.x - d.x)) / (Math.hypot(dx, dz) || 1));
      r.muestras++;
      if (a.mapa) r.conElMapa++;
    }
    previsto += ((a.suelo + antes.suelo) / 2) * (a.segundos - antes.segundos);
    // El sueño, con el mapa en la ventanita: pasado el fundido de una ilustración a la otra.
    if (!conFoto && a.siesta?.ilustracion === "ara-sonando" && a.mapa && a.segundos - desde.segundos > 15) {
      await pausa(500);
      await foto(page, "siesta-sonando");
      conFoto = true;
    }
    antes = a;
    await pausa(120);
    a = await leerSiesta();
  }
  r.vuelo = antes.segundos - desde.segundos;
  r.recorrido = desde.falta !== null && antes.falta !== null && previsto > 0 ? (desde.falta - antes.falta) / previsto : null;
  // Despierta: la pantalla se va, y lo que se pasó con ella puesta es lo que dura.
  await page
    .waitForFunction(() => (globalThis.__oga.inicio().siesta?.opacidad ?? 0) <= 0.001, null, { timeout: 10_000, polling: 16 })
    .catch(() => {});
  r.pared = (Date.now() - empieza) / 1000;
  /*
   * **Y lo que se avanzó durmiendo**, por la ruta, y dónde quedó lo que se veía
   * al dormirse: el sitio del avión al cerrar los ojos, cuántos km por detrás
   * del de al abrirlos, mirando hacia donde se va.
   */
  const luego = await leerSiesta();
  if (desde.falta !== null && luego.falta !== null) r.km = (desde.falta - luego.falta) / 1000;
  if (desde.x !== null && luego.x !== null && luego.rumbo !== null)
    r.atras = -(((desde.x - luego.x) * Math.sin(luego.rumbo) - (desde.z - luego.z) * Math.cos(luego.rumbo)) / 1000);
  // Y Ara, con el mapa en la ventanita mientras dice que se durmió.
  await page
    .waitForFunction(
      () => {
        const j = globalThis.__oga.inicio();
        return j.estado?.linea?.clave === "inicio.ara.pasaje.despertarse" && j.ventanita?.sitio === "dibujo:ruta" && !!j.ventanita?.donde;
      },
      null,
      { timeout: 20_000 },
    )
    .catch(() => {});
  await pausa(700);
  await foto(page, "siesta-despertar");
  return r;
}

/**
 * **El kit en el vuelo, con el ratón** (24-10-2026): se abre la mochilita y se
 * elige la luz verde, que va primero porque es la que tiene que acabar antes
 * de los diez mil pies. La juega el bucle del vuelo, como quien hace caso a lo
 * que brilla, y mide sus fotogramas en cuanto hay avioncitos en el circuito;
 * lo de después, en `armarEnElVuelo`.
 */
async function abrirLaLuzEnElVuelo(page) {
  const kitDe = () => page.evaluate(() => globalThis.__oga.inicio().kit);
  const centro = (r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  let k = await kitDe();
  if (!k?.boton) return;
  let c = centro(k.boton);
  await page.mouse.click(c.x, c.y);
  await page.waitForFunction(() => !!globalThis.__oga.inicio().kit?.juegos?.luz, null, { timeout: 10_000 }).catch(() => {});
  k = await kitDe();
  if (!k?.juegos?.luz) return;
  c = centro(k.juegos.luz);
  await page.mouse.click(c.x, c.y);
  await pausa(1500);
  await foto(page, "kit-luz-en-vuelo");
}

/**
 * **Armá tu avión con lo que queda**, un paso por vuelta del bucle del vuelo y
 * sin pararlo, que lo nombrado del paisaje se mide al nombrarse: el avión
 * entero en un `await` tenía el bucle parado medio minuto, y lo nombrado en ese
 * rato se medía tarde. Acabada la luz verde y con su canción ida, se vuelve a
 * elegir y se elige el avión; y después, una pieza cada dos
 * segundos y medio como poco, arrastrada a su hueco y solo con nadie
 * hablando, que la megafonía manda y a Ara se la escucha. Se apunta lo que se pone, y lo que entró entre dos
 * lecturas pausadas, que tiene que ser nada. Si no da tiempo a acabarlo, la
 * tripulante lo recoge igual.
 */
async function armarEnElVuelo(page, e, a, torre, altitud) {
  const k = e.kit;
  if (!k?.abierto || k.recogido) return;
  const centro = (r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  const j = k.juego;
  if (!a.elegidoEn) {
    if (!torre.fin || k.pausado) return;
    /*
     * Con la canción ida —o si en veinte segundos no llegó a sonar—, de vuelta
     * a elegir, como quien ya oyó su premio: sin esperar a que el kit vuelva
     * solo, que espera a que nadie hable y se come el rato del avión.
     */
    if (j?.juego === "luz") {
      if (torre.empieza ? !k.cancion : e.segundos - torre.fin.t > 20) await page.click(".kit__atras", { force: true }).catch(() => {});
      return;
    }
    if (j !== null) return;
    const boton = await page.evaluate(() => globalThis.__oga.inicio().kit?.juegos?.avion ?? null);
    if (!boton) return;
    const c = centro(boton);
    await page.mouse.click(c.x, c.y);
    a.elegidoEn = { t: e.segundos, altitud };
    return;
  }
  if (j?.juego !== "avion") return;
  // El rato de vuelo desde la lectura anterior: para contar cuánto se pudo jugar de verdad.
  const dt = a.tAnt === null ? 0 : e.segundos - a.tAnt;
  a.tAnt = e.segundos;
  a.fases.add(j.fase);
  a.despegados = Math.max(a.despegados, j.despegados ?? 0);
  // Lo puesto desde la lectura anterior: lo nuevo de este avión, o todo lo del siguiente.
  const antes = a.antes;
  const nuevas = !antes || antes.nivel !== j.nivel ? j.puestas : j.puestas.slice(antes.n);
  a.puestas.push(...nuevas);
  if (antes?.pausado && k.pausado) a.conPausa += nuevas.length;
  a.antes = { nivel: j.nivel, n: j.puestas.length, pausado: k.pausado };
  if (k.pausado) {
    a.pausado++;
    return;
  }
  if (["piezas", "luces"].includes(j.fase) && !e.hablando) a.libre += dt;
  /*
   * Y como quien escucha a Ara: la siguiente pieza, con nadie hablando. Con
   * una pieza cada dos segundos y medio aunque hablara alguien, lo que se dice
   * siempre —las luces, la noche, el despegue— y la primera pieza de cada
   * avión se encadenaban en la cola, y en la primera pasada del 24-10-2026 la
   * tripulante no encontró hueco para pedirlo en los mil pies que le da la red.
   */
  if (!["piezas", "luces"].includes(j.fase) || e.hablando || Date.now() - a.ultimo < 2500) return;
  // Con la pantalla de ahora: la tarjeta puede haber movido el panel.
  const piezas = await page.evaluate(() => globalThis.__oga.inicio().kit?.piezas ?? {});
  const [p] = Object.values(piezas);
  if (!p) return;
  const de = centro(p.en);
  const al = centro(p.sitio);
  await page.mouse.move(de.x, de.y);
  await page.mouse.down();
  await page.mouse.move(al.x, al.y, { steps: 12 });
  await page.mouse.up();
  a.ultimo = Date.now();
  a.arrastres++;
  if (a.arrastres === 1) await foto(page, "kit-avion-en-vuelo");
  if (a.arrastres === 4) await foto(page, "kit-avion-a-medias-en-vuelo");
}

/**
 * **Los fotogramas con la luz verde abierta**, en vuelo y con el reloj a ×1
 * —lo que ve quien juega—: seis segundos con el juego delante y seis con el
 * kit cerrado, para comparar, y se vuelve a abrir donde estaba. Regla 6: el
 * juego va encima del vuelo, que sigue corriendo. Se llama con los
 * avioncitos ya en el circuito, que la primera ronda espera a que Ara acabe
 * de explicar.
 */
async function medirLaLuzEnVuelo(page) {
  const fotogramas = () =>
    page.evaluate(
      () =>
        new Promise((ok) => {
          let n = 0;
          let lentos = 0;
          let antes = performance.now();
          const t0 = antes;
          const paso = (t) => {
            n++;
            if (t - antes > 20) lentos++;
            antes = t;
            if (t - t0 < 6000) requestAnimationFrame(paso);
            else ok({ fps: n / ((t - t0) / 1000), lentos });
          };
          requestAnimationFrame(paso);
        }),
    );
  await page.evaluate(() => globalThis.__oga.acelerar(1));
  const r = await renderer(page);
  const conLuz = await fotogramas();
  const aviones = await page.evaluate(() => globalThis.__oga.inicio().estado.kit.juego?.aviones?.length ?? 0);
  await page.click(".kit__cerrar", { force: true }).catch(() => {});
  await pausa(500);
  const sinKit = await fotogramas();
  const k = await page.evaluate(() => globalThis.__oga.inicio().kit);
  if (k?.boton) await page.mouse.click(k.boton.x + k.boton.width / 2, k.boton.y + k.boton.height / 2);
  // Y se sigue a ×1, jugando la torre: el vuelo vuelve a ir deprisa cuando se recoge el kit.
  comprobar(
    "la luz verde abierta en vuelo no le quita fotogramas al vuelo",
    conLuz.fps >= sinKit.fps - 6,
    `con la luz verde (${aviones} aviones): ${conLuz.fps.toFixed(1)} fps, ${conLuz.lentos} de más de 20 ms · con el kit cerrado: ${sinKit.fps.toFixed(1)} fps, ${sinKit.lentos} lentos · ${r}`,
  );
}

/**
 * **El kit con el dedo, en cada pantalla**: el teléfono apaisado, la tablet
 * del aula y el portátil con ratón. Se da el kit ya —sin volar media hora—,
 * se abre, se mira que cabe sin tapar la tarjeta ni los botones, y se juegan
 * los dos: un avión de Armá tu avión, con las piezas y las luces
 * **arrastradas** a su hueco con el dedo, hasta que despega; y la torre.
 *
 * **Y el kit de prueba de la dirección** (24-10-2026, ver `kitDePrueba` en
 * `game.ts`): el teléfono lo da con la sonda de desarrollo, `darElKit`, y la
 * tablet y el portátil con lo que usa Enrique para probarlo sin volar,
 * `?inicio=3&kit` —y el portátil con `&nivel=5`, el JAZ 90—: que llega en el
 * puesto sin tocar nada, que se empieza por el avión pedido y que el nivel no
 * se guarda.
 */
async function elKitConElDedo() {
  const PANTALLAS = [
    ["telefono", { ...devices["Pixel 7 landscape"], hasTouch: true, isMobile: true }, { url: "?inicio=3", nivel: 0 }],
    ["tablet", { viewport: { width: 1024, height: 600 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1.5 }, { url: "?inicio=3&kit", nivel: 0 }],
    ["portatil", { viewport: { width: 1280, height: 800 } }, { url: "?inicio=3&kit&nivel=5", nivel: 4 }],
  ];
  for (const [nombre, opciones, prueba] of PANTALLAS) {
    const ctx = await navegador.newContext({ ...opciones, locale: "es-PY" });
    const page = await ctx.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
    const dedo = !!opciones.hasTouch;
    const cdp = dedo ? await ctx.newCDPSession(page) : null;
    const centro = (r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
    const tocar = async (r) => {
      const c = centro(r);
      if (dedo) await page.touchscreen.tap(c.x, c.y);
      else await page.mouse.click(c.x, c.y);
    };
    /** Arrastrar de un sitio a otro: con el dedo, toques de verdad; si no, el ratón. */
    const arrastrar = async (de, a) => {
      const pasos = 10;
      if (dedo) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: de.x, y: de.y }] });
        for (let k = 1; k <= pasos; k++) {
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: de.x + ((a.x - de.x) * k) / pasos, y: de.y + ((a.y - de.y) * k) / pasos }],
          });
          await pausa(20);
        }
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      } else {
        await page.mouse.move(de.x, de.y);
        await page.mouse.down();
        await page.mouse.move(a.x, a.y, { steps: pasos });
        await page.mouse.up();
      }
    };
    const kitDe = () => page.evaluate(() => globalThis.__oga.inicio().kit);
    const estado = () => page.evaluate(() => globalThis.__oga.inicio().estado.kit);
    try {
      await page.goto(`${BASE}/${prueba.url}`);
      await page.waitForFunction(() => !!globalThis.__oga?.inicio?.()?.estado, null, { timeout: 180_000 });
      await page.keyboard.press("ShiftLeft");
      await page.waitForFunction(() => !!document.querySelector("#inicio .inicio__tarjeta"), null, { timeout: 60_000 });
      const dePrueba = prueba.url.includes("kit");
      if (!dePrueba) await page.evaluate(() => globalThis.__oga.darElKit());
      await page.waitForFunction(() => !!globalThis.__oga.inicio().kit?.boton, null, { timeout: 10_000 });
      /** Si quedó guardado por qué avión de Armá tu avión se va: con el kit de prueba, nunca. */
      const nivelGuardado = () => page.evaluate(() => Object.values(localStorage).some((v) => String(v).includes("kitNivelDelAvion")));
      const enElPuesto = await leer(page);
      let k = await kitDe();
      await foto(page, `kit-mochilita-${nombre}`);
      await tocar(k.boton);
      await page.waitForFunction(() => !!globalThis.__oga.inicio().kit?.juegos?.avion, null, { timeout: 10_000 });
      await pausa(500);
      // Que cabe, y no tapa la tarjeta ni ningún botón del HUD que se vea.
      const solapes = await page.evaluate(() => {
        const panel = document.querySelector(".kit__panel").getBoundingClientRect();
        const tocan = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
        const fuera = panel.left < 0 || panel.top < 0 || panel.right > innerWidth || panel.bottom > innerHeight;
        const otros = [...document.querySelectorAll("#inicio .inicio__tarjeta, .hud button, .hud [data-hud='cinturon'], .volumen")].filter((el) => {
          if (el.closest("[hidden]")) return false;
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.05) return false;
          const r = el.getBoundingClientRect();
          return r.width > 2 && r.height > 2 && tocan(panel, r);
        });
        return { fuera, otros: otros.map((el) => el.getAttribute("data-hud") ?? el.className) };
      });
      k = await kitDe();
      const minimo = Math.min(...Object.values(k.juegos).map((r) => Math.min(r.width, r.height)));
      comprobar(
        `${nombre}: el kit cabe entero, sin tapar la tarjeta ni los botones, y los juegos se tocan bien`,
        !solapes.fuera && solapes.otros.length === 0 && minimo >= 88,
        `fuera ${solapes.fuera} · tapa: ${solapes.otros.join(", ") || "nada"} · juegos de ${minimo.toFixed(0)} px`,
      );
      await foto(page, `kit-elegir-${nombre}`);
      // ── Armá tu avión, arrastrando: el primero entero, con sus luces, hasta que despega ──
      await tocar(k.juegos.avion);
      await page.waitForFunction(() => Object.keys(globalThis.__oga.inicio().kit?.piezas ?? {}).length > 0, null, { timeout: 10_000 });
      await pausa(500);
      k = await kitDe();
      const menor = Math.min(...Object.values(k.piezas).map((x) => Math.max(x.en.width, x.en.height)));
      const primero = await estado();
      // Primero el motor al hueco de otra pieza, la que lo tiene más lejos: vuelve a la bandeja con calma y el suyo brilla.
      const lejos = (p) => Math.hypot(centro(k.piezas[p].sitio).x - centro(k.piezas.motor.sitio).x, centro(k.piezas[p].sitio).y - centro(k.piezas.motor.sitio).y);
      const [otra] = Object.keys(k.piezas).filter((p) => p !== "motor").sort((a, b) => lejos(b) - lejos(a));
      await arrastrar(centro(k.piezas.motor.en), centro(k.piezas[otra].sitio));
      await pausa(600);
      const tras = await estado();
      const ayuda = tras.juego?.puestas?.length === 0 && tras.juego?.ilumina === "motor";
      /*
       * Armado, el avión se tumba para enseñarse desde arriba, y mientras gira
       * no hay nada que llevar: se espera a que esté quieto, como quien mira
       * cómo gira, y se sigue con las luces. La foto del armado, en cuanto
       * empieza a girar, que antes de tumbarse se queda un momento de perfil.
       */
      for (let i = 0; i < 12; i++) {
        await page.waitForFunction(() => globalThis.__oga.inicio().estado.kit.juego?.fase !== "vuelta", null, { timeout: 10_000 }).catch(() => {});
        k = await kitDe();
        const [p] = Object.values(k.piezas ?? {});
        if (!p) break;
        await arrastrar(centro(p.en), centro(p.sitio));
        if ((await estado()).juego?.fase === "vuelta") await foto(page, `kit-avion-armado-${nombre}`);
        await pausa(600);
        if (i === 2) await foto(page, `kit-avion-a-medias-${nombre}`);
        const e = await estado();
        if (e.juego?.fase === "luces" && e.juego.puestas.length === NIVELES_DEL_BANCO[e.juego.nivel]) await foto(page, `kit-avion-desde-arriba-${nombre}`);
      }
      const armado = await estado();
      await pausa(1500);
      await foto(page, `kit-avion-noche-${nombre}`);
      const despego = await page
        .waitForFunction(() => (globalThis.__oga.inicio().estado.kit.juego?.despegados ?? 0) > 0, null, { timeout: 20_000 })
        .then(() => true)
        .catch(() => false);
      const siguiente = await estado();
      comprobar(
        `${nombre}: se arma el ${armado.juego?.tipo ?? "avión"} ${dedo ? "con el dedo, arrastrando" : "con el ratón"}, con sus luces, y despega; equivocarse ayuda`,
        ["noche", "despegue"].includes(armado.juego?.fase) && despego && siguiente.juego?.nivel === prueba.nivel + 1 && siguiente.hechos.includes("avion") && ayuda && menor >= 36,
        `puestas: ${(armado.juego?.puestas ?? []).join(", ")} · fase ${armado.juego?.fase} · despegó ${despego}, y viene el ${siguiente.juego?.tipo} · ayuda al equivocarse: ${ayuda} · pieza más chica ${menor.toFixed(0)} px`,
      );
      if (dePrueba) {
        const guardado = await nivelGuardado();
        comprobar(
          `${nombre}: con ${prueba.url} el kit está en la mano en el puesto, sin sonda, se empieza por el avión pedido y el nivel no se guarda`,
          enElPuesto.enTierra && enElPuesto.inicio?.tripulacion?.tramo === "puerta" && primero.juego?.nivel === prueba.nivel && !guardado,
          `en tierra ${enElPuesto.enTierra}, ${enElPuesto.inicio?.tripulacion?.tramo ?? "—"} · empieza por el ${primero.juego?.tipo ?? "—"} (nivel ${primero.juego?.nivel ?? "—"}) · guardado: ${guardado}`,
        );
      }
      // ── Luz verde, con el dedo, en un peldaño por pantalla ──
      await jugarLaLuz(page, nombre, tocar);
      // ── La canción: suena al ganar la torre, se agacha si alguien habla y se va al guardar el kit ──
      const cancion = () => page.evaluate(() => globalThis.__oga.cancion());
      const empezo = await page
        .waitForFunction(() => !!globalThis.__oga.cancion()?.audio?.suena, null, { timeout: 30_000 })
        .then(() => true)
        .catch(() => false);
      // Veinte segundos de canción, a ver quién habla encima; y después se guarda el kit, con ella sonando.
      const lecturas = [];
      for (let k2 = 0; empezo && k2 < 120; k2++) {
        const c = await cancion();
        const e2 = await estado();
        if (!c?.audio?.suena) break;
        lecturas.push({ bus: c.audio.bus, agachado: c.audio.agachado, fundido: c.audio.fundido, megafonia: !!e2.pausado });
        if ((c.audio.va ?? 0) > 20) break;
        await pausa(200);
      }
      await page.click(".kit__cerrar", { force: true });
      await pausa(500);
      const yendose = (await cancion())?.audio;
      await pausa(2200);
      const ida = (await cancion())?.audio;
      const agachadas = lecturas.filter((x) => x.agachado && (x.fundido ?? 0) > 0.9);
      comprobar(
        `${nombre}: al ganar la torre suena la canción, se agacha si alguien habla y se va con un fundido al guardar el kit`,
        empezo &&
          agachadas.some((x) => x.bus < 10 ** (-15 / 20)) &&
          !yendose?.suena &&
          !!yendose?.seVa &&
          yendose.seVa.fundido < 0.95 &&
          !ida?.suena,
        `suena ${empezo} · ${lecturas.length} lecturas, agachada en ${agachadas.length}${agachadas.some((x) => x.megafonia) ? " (con la megafonía)" : ""}, la más baja ${agachadas.length ? (20 * Math.log10(Math.min(...agachadas.map((x) => x.bus)))).toFixed(1) : "—"} dB · al guardar: fundido ${yendose?.seVa?.fundido?.toFixed(2) ?? "—"}, después ${ida?.suena ?? "nada"}`,
      );
      // ── Y se deja cuando se quiera ──
      const cerrado = await estado();
      k = await kitDe();
      comprobar(
        `${nombre}: se guarda cuando se quiera, y la mochilita vuelve`,
        !cerrado.abierto && !!k.boton,
        `abierto ${cerrado.abierto} · mochilita ${!!k.boton}`,
      );
      if (errores.length) comprobar(`${nombre}: sin errores`, false, errores[0]);
    } catch (err) {
      comprobar(`${nombre}: el kit se juega`, false, String(err).slice(0, 160));
    } finally {
      await ctx.close();
    }
  }
}

/** Las piezas de cada avión de Armá tu avión, por nivel: ver `NIVELES` en `flight/kit-de-viaje.ts`. */
const NIVELES_DEL_BANCO = [5, 7, 6, 6, 6, 6];

/** El peldaño de la luz verde en cada pantalla: así se juegan los tres de la escalera que cambian algo. */
const PELDANO_DE_LA_LUZ = { telefono: "dibujo", tablet: "cifra", portatil: "cabina" };

/**
 * **Luz verde, con el dedo**: se elige, se juega a cuatro veces el reloj —las
 * rondas enteras, sin esperar los tres minutos— haciendo caso a lo que brilla,
 * apuntando antes al avión con un toque, y se mira lo que se ve: que la roja
 * deja al avión dando vueltas y se celebra, que el avión alabea en el
 * circuito y no en base ni en final —lo que miden sus alas en la pantalla—,
 * que de noche contesta con los faros y que se acaba.
 */
async function jugarLaLuz(page, nombre, tocar) {
  const peldano = PELDANO_DE_LA_LUZ[nombre] ?? "dibujo";
  const kitDe = () => page.evaluate(() => globalThis.__oga.inicio().kit);
  const luz = () => page.evaluate(() => globalThis.__oga.inicio().estado.kit.juego);
  await page.click(".kit__atras", { force: true });
  await page.waitForFunction(() => !!globalThis.__oga.inicio().kit?.juegos?.luz, null, { timeout: 10_000 });
  await page.evaluate((p) => globalThis.__oga.juegoDeLaTorre({ ritmo: 4, peldano: p }), peldano);
  let k = await kitDe();
  const lado = Math.min(...Object.values(k.juegos).map((r) => Math.min(r.width, r.height)));
  await tocar(k.juegos.luz);
  await page.waitForFunction(() => Object.keys(globalThis.__oga.inicio().kit?.luz?.luces ?? {}).length >= 2, null, { timeout: 10_000 });
  // Lo que se mira mientras se juega: las alas en la pantalla, la roja y lo que pasa después.
  const alas = { alas: 1, sigue: 1, faros: 0 };
  let roja = null;
  let rojaSigue = null;
  let fotos = 0;
  const fotosDe = new Set();
  const t0 = Date.now();
  let e = await luz();
  let menorLuz = Infinity;
  let menorAvion = Infinity;
  while (!e?.terminado && Date.now() - t0 < 150_000) {
    // Lo que miden las alas de cada avión que contesta, y de qué manera contesta.
    const medidas = await page.evaluate(() =>
      [...document.querySelectorAll(".luz-avion")].map((g) => ({
        id: Number(g.getAttribute("data-luz-avion")),
        k: Number(/scale\(1 ([0-9.]+)\)/.exec(g.querySelector(".luz-avion__alas")?.getAttribute("transform") ?? "")?.[1] ?? 1),
        faros: g.classList.contains("luz-avion--faros-apagados"),
      })),
    );
    e = await luz();
    for (const a of e?.aviones ?? []) {
      const m = medidas.find((x) => x.id === a.id);
      if (!m || !a.acuse) continue;
      if (a.acuse.tipo === "alas") alas.alas = Math.min(alas.alas, m.k);
      if (a.acuse.tipo === "sigue") alas.sigue = Math.min(alas.sigue, m.k);
      if (a.acuse.tipo === "faros" && m.faros) alas.faros++;
    }
    // La roja: el avión al que se le dio no toca la pista, pasa por encima y sube: otra vuelta.
    if (roja && rojaSigue === null) {
      const a = (e?.aviones ?? []).find((x) => x.id === roja.id);
      if (!a || a.tramo === "pista" || a.tramo === "rodaje") rojaSigue = false;
      else if (a.tramo === "subida") rojaSigue = true;
    }
    k = await kitDe();
    for (const r of Object.values(k.luz?.luces ?? {})) menorLuz = Math.min(menorLuz, r.width);
    for (const r of Object.values(k.luz?.aviones ?? {})) menorAvion = Math.min(menorAvion, r.width);
    if (e?.ayuda && k.luz?.luces?.[e.ayuda]) {
      // Primero se apunta al que pide, con un toque, y después la luz.
      const pide = e.aviones.find((a) => a.pide);
      if (pide && k.luz.aviones[pide.id]) await tocar(k.luz.aviones[pide.id]);
      // De noche, a ×1: los faros se apagan dos veces en menos de dos segundos, y a ×4 no se ven.
      if (e.noche) await page.evaluate(() => globalThis.__oga.juegoDeLaTorre({ ritmo: 1 }));
      await tocar(k.luz.luces[e.ayuda]);
      if (e.noche)
        await page
          .waitForFunction(() => !!document.querySelector(".luz-avion--faros-apagados"), null, { timeout: 4000, polling: "raf" })
          .then(() => alas.faros++)
          .catch(() => {});
      if (e.ayuda === "roja" && !roja && pide) roja = { id: pide.id, cuando: Date.now() };
      await pausa(300);
      const ahora = await luz();
      if (fotos < 2 && ahora?.haz) {
        fotos++;
        await foto(page, `kit-luz-${fotos}-${nombre}-${peldano}`);
      }
      // Y las rondas que solo salen arriba: el camión en la pista y la de noche.
      if (ahora?.camion && !fotosDe.has("camion")) {
        fotosDe.add("camion");
        await foto(page, `kit-luz-camion-${nombre}-${peldano}`);
      }
      if (ahora?.noche && ahora.haz && !fotosDe.has("noche")) {
        fotosDe.add("noche");
        await foto(page, `kit-luz-noche-${nombre}-${peldano}`);
      }
    } else await pausa(150);
  }
  await pausa(600);
  await foto(page, `kit-luz-hecho-${nombre}-${peldano}`);
  e = await luz();
  /*
   * Y lo que Ara tenía que contar, hasta el «¡aterrizaron todos!»: a ×4 los
   * avioncitos van más deprisa que lo que se dice, y lo dicho va a la cola.
   */
  await page
    .waitForFunction(
      () => (globalThis.__oga.inicio().registro ?? []).some((d) => d.clave === "inicio.ara.pasaje.kit.luz.fin" && (d.como === "sono" || d.como === "muda")),
      null,
      { timeout: 60_000 },
    )
    .catch(() => {});
  const registro = await page.evaluate(() => globalThis.__oga.inicio().registro ?? []);
  const dijo = (c) => registro.some((d) => d.clave === `inicio.ara.pasaje.kit.luz.${c}`);
  const c = e?.contestaciones ?? [];
  const enBaseOFinal = c.filter((x) => x.tramo === "base" || x.tramo === "final");
  comprobar(
    `${nombre}: luz verde (${peldano}) se gana haciendo caso a lo que brilla, apuntando con el dedo, y se toca bien`,
    e?.terminado === true && lado >= 88 && menorLuz >= 40 && menorAvion >= 40,
    `rondas ${e?.ronda}/${e?.rondas} · aterrizados ${e?.aterrizados} · en ${((Date.now() - t0) / 1000).toFixed(0)} s a ×4 · juegos de ${lado.toFixed(0)} px, luces de ${menorLuz.toFixed(0)} px, aviones de ${menorAvion.toFixed(0)} px`,
  );
  comprobar(
    `${nombre}: la roja manda al circuito —el avión sigue volando, no aterriza— y se celebra`,
    !!roja && rojaSigue === true && (e?.rojas ?? 0) >= 1 && dijo("roja"),
    `roja ${!!roja} · sigue volando ${rojaSigue} · rojas ${e?.rojas} · ${dijo("roja") ? "se dijo" : "no se dijo"} la celebración`,
  );
  comprobar(
    `${nombre}: el avión alabea en el circuito y no en base ni en final${peldano === "cabina" ? "; de noche, los faros" : ""}`,
    enBaseOFinal.length > 0 &&
      enBaseOFinal.every((x) => x.tipo !== "alas") &&
      alas.alas < 0.8 &&
      alas.sigue > 0.99 &&
      (peldano !== "cabina" || (alas.faros > 0 && c.some((x) => x.tipo === "faros"))),
    `contestaciones: ${c.map((x) => `${x.tipo}@${x.tramo}`).join(", ")} · alas en pantalla al alabear ${alas.alas.toFixed(2)}, sin alabear ${alas.sigue.toFixed(2)}${peldano === "cabina" ? ` · faros apagados ${alas.faros} lecturas` : ""}`,
  );
  if (peldano !== "dibujo")
    comprobar(
      `${nombre}: arriba, los destellos: rojos con el camión en la pista y verdes al irse`,
      dijo("destellosRojos") && dijo("destellosVerdes"),
      `destellos rojos ${dijo("destellosRojos")} · verdes ${dijo("destellosVerdes")}`,
    );
  await page.evaluate(() => globalThis.__oga.juegoDeLaTorre({ ritmo: 1 }));
}

/**
 * **Y desde el hangar**: su ficha, la tercera, al lado de las dos de Jazlyn,
 * abre la escena de pasaje. Como en el banco de la segunda escena, se esconde
 * el pack de Ara para que un piloto nuevo vaya al hangar y no a la primera
 * experiencia.
 */
async function desdeElHangar() {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-PY" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.route("**/data/voces/ara/manifiesto.json", (r) => r.fulfill({ status: 404, body: "" }));
  try {
    await page.goto(`${BASE}/?hora=12`);
    await page.click("[data-nuevo]", { timeout: 120_000 });
    await page.click("[data-crear]");
    await page.waitForSelector('[data-pantalla="que"]', { timeout: 120_000 });
    await page.click('[data-pantalla="que"]');
    await page.waitForSelector("[data-inicio-modo]", { timeout: 20_000 });
    const fichas = await page.evaluate(() =>
      [...document.querySelectorAll("[data-inicio-modo]")].map((b) => ({
        cual: b.getAttribute("data-inicio-modo"),
        nombre: b.querySelector(".ficha__nombre")?.textContent?.trim(),
        alto: Math.round(b.getBoundingClientRect().height),
      })),
    );
    comprobar(
      "hangar: la ficha de viajar con Jazlyn, al lado de las otras dos",
      fichas.length === 3 &&
        fichas.map((f) => f.cual).join() === "despegar,aterrizar,pasaje" &&
        fichas.every((f) => f.alto >= 44),
      fichas.map((f) => `${f.cual}: «${f.nombre}» ${f.alto} px`).join(" · "),
    );
    // La ficha, a la vista: el foto se hace sobre el hangar, que no lleva lienzo del vuelo.
    if (FOTOS) await page.screenshot({ path: `${FOTOS}/inicio-3-hangar.png` });
    await page.click('[data-inicio-modo="pasaje"]');
    const escena = await page
      .waitForFunction(() => globalThis.__oga?.inicio?.()?.estado && globalThis.__oga.inicio().escena, null, {
        timeout: 180_000,
      })
      .then((h) => h.jsonValue())
      .catch(() => null);
    const dentro = await page.evaluate(() => ({
      enTierra: globalThis.__oga?.estado?.().onGround ?? null,
      avion: globalThis.__oga?.avion?.().id ?? null,
      campo: globalThis.__oga?.campoDeAhora?.() ?? null,
    }));
    comprobar(
      "hangar: su ficha abre la escena de pasaje, en tierra y con el JAZ 90",
      escena === "pasaje" && dentro.enTierra === true && dentro.avion === "jaz-90",
      `${escena ?? "nada"} · en tierra: ${dentro.enTierra} · ${dentro.avion ?? "?"} · ${dentro.campo ?? ""}${errores.length ? ` · ${errores[0]}` : ""}`,
    );
  } catch (e) {
    comprobar("hangar: su ficha abre la escena de pasaje", false, String(e).slice(0, 140));
  } finally {
    await ctx.close();
  }
}

/**
 * **Y en un teléfono apaisado, con el dedo**: la tarjeta entera en la pantalla,
 * sin los mandos de pilotar, y la ventanilla debajo.
 */
async function enElTelefono() {
  const ctx = await navegador.newContext({ ...devices["Pixel 7 landscape"], hasTouch: true, isMobile: true, locale: "es-PY" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  try {
    await page.goto(`${BASE}/?inicio=3`);
    await page.waitForFunction(() => !!globalThis.__oga?.inicio?.()?.estado, null, { timeout: 180_000 });
    // Hasta que la escena hable y dibuje qué mirar.
    await page.waitForFunction(() => !!document.querySelector("#inicio [data-mirar]"), null, { timeout: 60_000 }).catch(() => {});
    const v = await leer(page);
    const caja = await page.evaluate(() => {
      const r = document.querySelector("#inicio .inicio__tarjeta")?.getBoundingClientRect();
      return r ? { l: r.left, t: r.top, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight } : null;
    });
    comprobar(
      "teléfono apaisado: la tarjeta cabe entera, sin mandos de pilotar",
      !!caja && caja.l >= 0 && caja.t >= 0 && caja.r <= caja.w && caja.b <= caja.h * 0.6 && !v.mandos && !v.relojes,
      caja
        ? `tarjeta ${Math.round(caja.l)},${Math.round(caja.t)}–${Math.round(caja.r)},${Math.round(caja.b)} en ${caja.w}×${caja.h} · mandos ${v.mandos} · relojes ${v.relojes}${errores.length ? ` · ${errores[0]}` : ""}`
        : "sin tarjeta",
    );
    await foto(page, "telefono");
    /*
     * **Y la lámina de lo que se explica, también en el teléfono** (punto 305):
     * en el pasaje no hay pulgares que dejar libres, así que cabe y sale —la
     * del embarque, la primera—, de un cuarto del ancho como poco y sin
     * pisar la tarjeta ni los botones.
     */
    const lamina = await page
      .waitForFunction(
        () => {
          const j = globalThis.__oga.inicio();
          return j.ventanita?.donde && j.ventanita.caja ? j.ventanita : null;
        },
        null,
        { timeout: 40_000 },
      )
      .then((h) => h.jsonValue())
      .catch(() => null);
    await pausa(1200);
    const conLamina = await leer(page);
    const pisa = lamina ? conLamina.noSeTapa.filter((o) => sePisan(lamina.caja, o)).map((o) => o.que) : [];
    const ancho = lamina ? (lamina.caja.right - lamina.caja.left) / conLamina.pantalla.ancho : 0;
    comprobar(
      "teléfono apaisado: la lámina de lo que se explica sale, grande y sin pisar la tarjeta ni los botones",
      !!lamina && lamina.donde === "grande" && ancho >= 0.25 && pisa.length === 0,
      lamina
        ? `${lamina.sitio} ${lamina.donde} de ${Math.round(ancho * 100)} % en ${conLamina.pantalla.ancho}×${conLamina.pantalla.alto}${pisa.length ? ` · pisa ${pisa.join(", ")}` : ""}`
        : `no salió · ${JSON.stringify((await leer(page)).inicio?.ventanita ?? null)}`,
    );
    if (lamina) await foto(page, "telefono-lamina");
    /*
     * **Y el cuaderno de viaje, en el teléfono apaisado**: puesto a la vista
     * con unos cuantos sellos y sus huecos, que quepa entero en la tarjeta y
     * en la pantalla, con el botón de volver, y cada sello del tamaño de
     * mirarlo. Ver `ui/sellos-del-viaje.ts`.
     */
    await page.evaluate(() => globalThis.__oga.verElCuadernoDeViaje(["motor", "ala", "nubes", "teide", "palma"], ["palma"]));
    await pausa(3500);
    const cuaderno = await page.evaluate(() => {
      const caja = (sel) => {
        const r = document.querySelector(sel)?.getBoundingClientRect();
        return r ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null;
      };
      return {
        tarjeta: caja("#inicio .inicio__tarjeta"),
        viaje: caja("#inicio .viaje"),
        boton: caja("#inicio [data-inicio='seguir']"),
        sitios: [...document.querySelectorAll("#inicio .viaje__sitio")].map((x) => x.getBoundingClientRect().width),
        w: innerWidth,
        h: innerHeight,
      };
    });
    const dentro = (a, b) => !!a && !!b && a.l >= b.l - 0.5 && a.t >= b.t - 0.5 && a.r <= b.r + 0.5 && a.b <= b.b + 0.5;
    const pantalla = { l: 0, t: 0, r: cuaderno.w, b: cuaderno.h };
    comprobar(
      "teléfono apaisado: el cuaderno de viaje cabe entero en la tarjeta y en la pantalla, con el botón, y cada sello se ve",
      dentro(cuaderno.tarjeta, pantalla) &&
        dentro(cuaderno.viaje, cuaderno.tarjeta) &&
        dentro(cuaderno.boton, pantalla) &&
        cuaderno.sitios.length === 8 &&
        cuaderno.sitios.every((w) => w >= 36),
      `tarjeta ${JSON.stringify(cuaderno.tarjeta)} · cuaderno ${JSON.stringify(cuaderno.viaje)} · botón ${JSON.stringify(cuaderno.boton)} · sellos de ${Math.min(...cuaderno.sitios).toFixed(0)} px en ${cuaderno.w}×${cuaderno.h}`,
    );
    await foto(page, "telefono-cuaderno");
  } catch (e) {
    comprobar("teléfono apaisado: la escena se abre", false, String(e).slice(0, 140));
  } finally {
    await ctx.close();
  }
}

/**
 * **La lámina y el kit, forzado y mirado en cada fotograma.** El vuelo mira
 * cuatro veces por segundo, y lo que se le escapaba duraba menos: la tarjeta
 * crecía con una frase de tres líneas, el panel del kit bajaba con ella y la
 * lámina se quedaba encima hasta su siguiente vistazo —216 ms, un píxel—.
 * Aquí se fuerza: la lámina puesta, el kit que se abre y la tarjeta que crece
 * y encoge —y con ella el panel, que baja y sube—. Y se mira la caja a la que
 * va la lámina, como en el vuelo, después de cada fotograma del juego.
 */
async function laLaminaYElKit() {
  /*
   * **Y en una pantalla donde el caso pasa siempre**: la de 1280 × 1024, la
   * de cinco por cuatro de tantos colegios.
   *
   * En 1280 × 800 el panel del kit va a lo ancho, 780 px, y la tarjeta que
   * crece lo empuja hacia abajo: lo único que puede pisar es la franja de
   * debajo. Esa franja mide 105 px con la tarjeta de dos líneas —160 px de
   * alto; la de cuando se escribió esto medía 148— y una lámina necesita 116
   * como poco (`VENTANA.minimo`, de 3:2): la lámina se iba a un lado, adonde
   * el panel no llega, y el banco daba «el panel bajó sobre la lámina 0
   * veces», sin un solo fotograma pisado. Que cupiera o no dependía de
   * cuántas líneas tuviera la frase que la escena estaba diciendo. En 1024 de
   * alto la franja mide más de trescientos y la lámina más grande va ahí,
   * abajo del todo; y para que el panel llegue a ella, la tarjeta también
   * crece de más —ver los empujones—. `OGA_DETALLE` dice dónde estuvo cada
   * una.
   */
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 1024 }, locale: "es-PY" });
  const page = await ctx.newPage();
  const nombre = "la lámina se aparta del panel del kit en el mismo fotograma: al abrirse y cada vez que la tarjeta lo empuja";
  try {
    await page.goto(`${BASE}/?inicio=3`);
    await page.waitForFunction(() => !!globalThis.__oga?.inicio?.()?.estado, null, { timeout: 180_000 });
    await page.keyboard.press("ShiftLeft");
    await page.waitForFunction(() => !!document.querySelector("#inicio .inicio__tarjeta"), null, { timeout: 60_000 });
    // La del vuelo, la de la tripulante contando su oficio. Si la escena pone la suya encima —la del embarque—, vale igual: lo que se mira es que se aparte.
    await page.evaluate(() => globalThis.__oga.juegoParaTrazas().hud.historia.mostrarDibujo("tripulacion"));
    await page.waitForFunction(() => globalThis.__oga.inicio().ventanita?.donde === "grande", null, { timeout: 10_000 });
    await page.evaluate(() => {
      const sePisan = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const m = (globalThis.__laminaYKit = { marcos: 0, juntos: 0, pisadas: [], empujones: 0, antes: null });
      const mirar = () => {
        const v = globalThis.__oga.inicio().ventanita;
        const panel = document.querySelector(".kit__panel");
        if (!v?.caja || v.donde !== "grande" || !panel || panel.closest("[hidden]")) return void (m.antes = null);
        const r = panel.getBoundingClientRect();
        if (r.width <= 2 || r.height <= 2) return;
        m.juntos++;
        const p = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        const firma = `${Math.round(v.caja.left)},${Math.round(v.caja.top)}-${Math.round(v.caja.right)},${Math.round(v.caja.bottom)} | ${Math.round(p.left)},${Math.round(p.top)}-${Math.round(p.right)},${Math.round(p.bottom)}`;
        if ((m.vistas ??= []).at(-1) !== firma && m.vistas.length < 40) m.vistas.push(firma);
        // El caso que se busca: el panel se mueve encima de donde estaba la lámina.
        if (m.antes && (m.antes.panel.top !== p.top || m.antes.panel.right !== p.right) && sePisan(m.antes.caja, p)) m.empujones++;
        if (sePisan(v.caja, p)) m.pisadas.push({ panel: p, lamina: v.caja });
        m.antes = { panel: p, caja: v.caja };
      };
      const bucle = () => {
        m.marcos++;
        setTimeout(mirar, 0);
        requestAnimationFrame(bucle);
      };
      requestAnimationFrame(bucle);
    });
    await page.evaluate(() => globalThis.__oga.darElKit());
    await page.waitForFunction(() => !!globalThis.__oga.inicio().kit?.boton, null, { timeout: 10_000 });
    const k = await page.evaluate(() => globalThis.__oga.inicio().kit);
    await page.mouse.click(k.boton.x + k.boton.width / 2, k.boton.y + k.boton.height / 2);
    await pausa(800);
    /*
     * La tarjeta, más alta y más baja, como con las frases largas y cortas: el
     * panel va debajo. Y antes, dos empujones de más, de 160 y 240 px, que no
     * los da ninguna frase: la lámina se pone lo más abajo que cabe, y con los
     * de una frase el panel no bajaba hasta ella. Primero, que la escena pone
     * la suya al rato y la quita al acabar la frase.
     */
    for (const crece of [160, 0, 240, 0, 20, 45, 70, 35, 0, 90, 0, 60, 0]) {
      await page.evaluate((px) => {
        document.querySelector("#inicio .inicio__tarjeta").style.paddingBottom = px ? `${14 + px}px` : "";
      }, crece);
      await pausa(700);
    }
    const m = await page.evaluate(() => globalThis.__laminaYKit);
    const v = await page.evaluate(() => globalThis.__oga.inicio().ventanita);
    comprobar(
      nombre,
      m.juntos > 60 && m.empujones >= 1 && m.pisadas.length === 0,
      `${m.juntos} fotogramas con las dos · el panel bajó sobre la lámina ${m.empujones} veces · pisada en ${m.pisadas.length}` +
        (m.pisadas[0] ? ` (panel ${JSON.stringify(m.pisadas[0].panel)}, lámina ${JSON.stringify(m.pisadas[0].lamina)})` : "") +
        ` · al final ${v?.sitio ?? "sin lámina"} ${v?.donde ?? ""}` +
        (process.env.OGA_DETALLE ? ` · lámina | panel: ${(m.vistas ?? []).join(" → ")} · último: ${JSON.stringify(v?.ultimo ?? null)}` : ""),
    );
  } catch (e) {
    comprobar(nombre, false, String(e).slice(0, 140));
  } finally {
    await ctx.close();
  }
}

/**
 * **Los esquemas, uno a uno, sin volar** (punto 311). En un vuelo no salen
 * todos —lo alto o los telescopios dependen de lo que se vea y de lo que dé
 * tiempo a contar—, así que aquí se pone cada uno en la escena, en el
 * portátil: tiene que salir su ilustración y no el dibujo, en grande —de un
 * cuarto del ancho como poco—, entera —con la proporción del fichero— y sin
 * pisar la tarjeta ni los botones. Y la torre de «Luz verde», igual.
 */
async function losEsquemasUnoAUno() {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-PY" });
  const page = await ctx.newPage();
  const nombre = "cada esquema, puesto en la escena, sale con su ilustración, en grande, entera y sin pisar nada";
  try {
    await page.goto(`${BASE}/?inicio=3`);
    await page.waitForFunction(() => !!globalThis.__oga?.inicio?.()?.estado, null, { timeout: 180_000 });
    await page.keyboard.press("ShiftLeft");
    await page.waitForFunction(() => !!document.querySelector("#inicio .inicio__tarjeta"), null, { timeout: 60_000 });
    // La primera de la escena, la del embarque, se deja poner antes: así no viene después a pisar las de aquí.
    await page.waitForFunction(() => globalThis.__oga.inicio().ventanita?.donde === "grande", null, { timeout: 30_000 }).catch(() => {});
    const malos = [];
    const vistos = [];
    const pedidos = [...Object.keys(CON_ILUSTRACION).map((c) => ({ sitio: `dibujo:${c}`, clave: c })), { sitio: "ilustracion:torre-radio", clave: null }];
    for (const { sitio, clave } of pedidos) {
      let v = null;
      for (let vez = 0; vez < 2 && !v; vez++) {
        await page.evaluate(
          ({ sitio, clave }) => {
            const h = globalThis.__oga.juegoParaTrazas().hud.historia;
            if (clave) h.mostrarDibujo(clave);
            else h.mostrarIlustracion(sitio.replace(/^ilustracion:/, ""));
          },
          { sitio, clave },
        );
        v = await page
          .waitForFunction((s) => { const j = globalThis.__oga.inicio().ventanita; return j?.sitio === s && j.donde ? j : null; }, sitio, { timeout: 10_000 })
          .then((h) => h.jsonValue())
          .catch(() => null);
      }
      if (!v) {
        malos.push(`${sitio} no salió`);
        continue;
      }
      /*
       * **Y su tamaño, el asentado**, como en el vuelo, que se queda con el
       * mayor mientras está puesta. Se medía a los 900 ms, y la escena sigue
       * corriendo debajo: el maletero salía cuando Ara volvía la cabeza del
       * motor a la ventanilla, y con el cristal a medio camino la lámina se
       * colocaba al 22 %; en su vistazo siguiente crecía al 32, como las que
       * vinieron detrás en la misma toma. Medido con la toma de cada uno: ver
       * `ASIENTA_LA_LAMINA`. Y se espera solo lo que haga falta —los 900 ms
       * de antes, y más únicamente si todavía no llega—, que la escena sigue
       * su guion debajo y la torre de «Luz verde», que va detrás, tiene que
       * salir antes de que hable la comandante.
       */
      let mayor = { ancho: 0, plano: null, proporcion: 1.5 };
      for (const desde = Date.now(); Date.now() - desde < ASIENTA_LA_LAMINA; ) {
        await pausa(300);
        if (Date.now() - desde >= 900 && mayor.ancho >= anchoMinimoDeLaLamina(mayor.plano, mayor.proporcion)) break;
        const j = await page.evaluate(() => {
          const i = globalThis.__oga.inicio();
          return { v: i.ventanita, plano: i.planoVisto ?? null, ancho: innerWidth };
        });
        if (j.v?.sitio !== sitio || !j.v.caja) continue;
        v = j.v;
        const a = (v.caja.right - v.caja.left) / j.ancho;
        const proporcion = (v.caja.right - v.caja.left - 12) / Math.max(1, v.caja.bottom - v.caja.top - 12);
        if (a > mayor.ancho) mayor = { ancho: a, plano: j.plano, proporcion };
      }
      const l = await leer(page);
      const img = await page.evaluate(() => {
        const f = document.querySelector('[data-hud="historia-foto"]');
        const r = f?.getBoundingClientRect();
        return f ? { w: f.naturalWidth, h: f.naturalHeight, rw: r.width, rh: r.height, src: f.currentSrc || f.src } : null;
      });
      const ancho = Math.max(mayor.ancho, (v.caja.right - v.caja.left) / l.pantalla.ancho);
      const pisa = l.noSeTapa.filter((o) => sePisan(v.caja, o)).map((o) => o.que);
      const bueno = clave ? esSuIlustracion(clave, v.fichero) : /ilustraciones\/torre-radio[-.][^/]*webp/.test(v.fichero ?? "");
      // Entera: la imagen se ve con la proporción de su fichero, sin recortar ni deformar.
      const entera = !!img && img.w > 0 && Math.abs(img.rw / img.rh - img.w / img.h) < 0.03;
      vistos.push(`${clave ?? "torre"} ${Math.round(ancho * 100)} %${mayor.plano && mayor.plano !== "ventanilla" ? ` (${mayor.plano})` : ""}`);
      if (!bueno) malos.push(`${sitio}: ${v.fichero ?? "el dibujo de código"}`);
      if (v.donde !== "grande" || ancho < anchoMinimoDeLaLamina(mayor.plano, mayor.proporcion))
        malos.push(`${sitio}: ${v.donde} de ${Math.round(ancho * 100)} %${mayor.plano ? ` (${mayor.plano})` : ""}`);
      if (!entera) malos.push(`${sitio}: no entera (${JSON.stringify(img)})`);
      if (pisa.length) malos.push(`${sitio} pisa ${pisa.join(", ")}`);
      if (clave === "oido" || clave === "mascara" || clave === "alto" || !clave) await foto(page, `esquema-${clave ?? "torre"}`);
    }
    comprobar(nombre, malos.length === 0, `${vistos.join(", ")}${malos.length ? ` · ✗ ${malos.join(" · ")}` : ""}`);
    /*
     * **Y la torre, como sale de verdad**: con «Luz verde» abierto, cuando Ara
     * cuenta que lo normal es la radio; al lado del panel, si cabe sin pisarlo.
     */
    const torreConKit = "y la torre sale con «Luz verde» abierto, al lado del panel, cuando Ara cuenta lo de la radio";
    await page.evaluate(() => globalThis.__oga.juegoParaTrazas().hud.historia.quitar());
    await page.evaluate(() => globalThis.__oga.darElKit());
    await page.waitForFunction(() => !!globalThis.__oga.inicio().kit?.boton, null, { timeout: 10_000 });
    let k = await page.evaluate(() => globalThis.__oga.inicio().kit);
    await page.mouse.click(k.boton.x + k.boton.width / 2, k.boton.y + k.boton.height / 2);
    await page.waitForFunction(() => !!globalThis.__oga.inicio().kit?.juegos?.luz, null, { timeout: 10_000 });
    k = await page.evaluate(() => globalThis.__oga.inicio().kit);
    await page.mouse.click(k.juegos.luz.x + k.juegos.luz.width / 2, k.juegos.luz.y + k.juegos.luz.height / 2);
    const torre = await page
      .waitForFunction(() => { const j = globalThis.__oga.inicio().ventanita; return j?.sitio === "ilustracion:torre-radio" && j.donde ? j : null; }, null, { timeout: 40_000 })
      .then((h) => h.jsonValue())
      .catch(() => null);
    const conKit = await leer(page);
    const pisaKit = torre ? conKit.noSeTapa.filter((o) => sePisan(torre.caja, o)).map((o) => o.que) : [];
    comprobar(
      torreConKit,
      !!torre && torre.donde === "grande" && pisaKit.length === 0,
      torre
        ? `${torre.donde} de ${Math.round(((torre.caja.right - torre.caja.left) / conKit.pantalla.ancho) * 100)} %${pisaKit.length ? ` · pisa ${pisaKit.join(", ")}` : ""}`
        : `no salió · ${JSON.stringify(conKit.inicio?.ventanita?.ultimo ?? null)} · dice «${conKit.dice.slice(0, 60)}»`,
    );
    if (torre) await pausa(800).then(() => foto(page, "esquema-torre-con-el-kit"));
  } catch (e) {
    comprobar(nombre, false, String(e).slice(0, 140));
  } finally {
    await ctx.close();
  }
}

try {
  if (process.env.OGA_SOLO_LAMINA) await laLaminaYElKit();
  else if (process.env.OGA_SOLO_ESQUEMAS) await losEsquemasUnoAUno();
  else {
    if (!process.env.OGA_SIN_HANGAR) await desdeElHangar();
    await enElTelefono();
    if (!process.env.OGA_SIN_KIT) await elKitConElDedo();
    if (!process.env.OGA_SIN_KIT) await laLaminaYElKit();
    await losEsquemasUnoAUno();
    if (!process.env.OGA_SOLO_KIT) await elVuelo();
  }
} finally {
  await navegador.close();
  await server.close();
}

const bien = resultados.filter((r) => r.ok).length;
console.log("");
for (const r of resultados) console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}${r.detalle ? `  —  ${r.detalle}` : ""}`);
console.log(`\n  ${bien} de ${resultados.length}\n`);
process.exit(bien === resultados.length ? 0 : 1);

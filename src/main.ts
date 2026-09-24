/**
 * Punto de entrada.
 *
 * Solo busca los nodos del DOM, elige idioma y arranca. Toda la lógica está
 * en `game.ts`: si este fichero crece, algo se ha puesto en el sitio
 * equivocado.
 */

// La hoja de estilos se enlaza desde index.html y no se importa aquí: así el
// HUD ya está maquetado antes de que el navegador termine de leer el módulo,
// en vez de aparecer sin estilo durante un instante.
import { Game } from "./game";
import { destinosDe, SCENARIOS, type Scenario } from "./world/scenarios";
import {
  leccionPorId,
  leccionRecordada,
  recordarLeccion,
  type Leccion,
} from "./flight/lecciones";
import { conRelieve } from "./world/relieve";
import { cargarOrtofoto } from "./world/ortofoto";
import { mundoElegido } from "./ui/mundo";
import { cargarCiudad } from "./world/ciudades";
import { conViento } from "./world/scenarios";
import { leerMetar, pedirMetar, vientoDeCasa, type Meteo } from "./world/meteo";

/**
 * De dónde sale el tiempo de esta partida.
 *
 * Por orden: lo que se pida a mano en la dirección, lo que diga el METAR de
 * verdad, y si no, el tiempo de casa.
 *
 * `?viento=290/14` pone el viento a mano —del 290 a catorce nudos— y sirve para
 * probar una cabecera concreta sin esperar a que el tiempo cambie. Se hizo
 * primero eso y no un panel porque **el panel hay que diseñarlo para quien no
 * lee**, y eso es otro trabajo; esto ya deja ensayar cualquier situación hoy.
 *
 * `?metar=...` acepta un METAR entero, por si se quiere reproducir un día
 * concreto.
 */
async function tiempoPedido(esc: Scenario): Promise<Meteo> {
  const q = new URLSearchParams(location.search);

  // El tiempo de este sitio cuando no hay METAR: su viento dominante. Ver
  // `vientoDeCasa`, que es de donde sale la cabecera en uso.
  const deCasa = vientoDeCasa(esc.vientoDominante);

  const crudo = q.get("metar");
  if (crudo) return { ...(leerMetar(crudo) ?? deCasa), fuente: "mano" };

  const viento = q.get("viento");
  if (viento) {
    const m = /^(\d{1,3})\/(\d{1,3})$/.exec(viento);
    if (m) {
      const kt = Number(m[2]);
      return {
        ...deCasa,
        vientoDe: kt === 0 ? null : Number(m[1]) % 360,
        vientoKt: kt,
        fuente: "mano",
      };
    }
  }

  // El identificador OACI es el `id` del aeródromo: así se llama el fichero y
  // así lo llama el METAR.
  const icao = esc.aerodrome?.id;
  if (!icao) return deCasa;
  // El proxy se configura al construir; sin él no se pide nada. Ver
  // `workers/meteo.js`, que es el que hace falta y son diez líneas.
  const proxy = q.get("meteo") ?? import.meta.env.VITE_METEO ?? null;
  return pedirMetar(icao, proxy, deCasa);
}
import { detectLocale, setLocale, t } from "./i18n";
import { abrirHangar } from "./ui/hangar";
import type { Mission } from "./missions/types";
import { MISSIONS } from "./content/missions";
import { rememberTier, rememberedTier } from "./flight/tiers";
import { AIRCRAFT, type AircraftConfig } from "./flight/aircraft";
import { campoDe, destinosParaEsteAvion, elQueQuepa } from "./flight/cabe";
import { guardarAlSalir, leerTexto, ponerTexto } from "./datos/guardado";
import { elegirPiloto } from "./ui/pantalla-pilotos";

/*
 * **Y el juego avisa de que ha empezado**, para el vigilante de `index.html`:
 * si esto no llega a ejecutarse —un módulo que no bajó—, él recarga o enseña
 * el botón de volver a cargar. Y el reintento se olvida, que ya salió bien.
 */
(globalThis as { __ogaVivo?: boolean }).__ogaVivo = true;
try {
  sessionStorage.removeItem("oga-veve:reintento");
} catch {
  // Sin almacenamiento se juega igual.
}

setLocale(detectLocale());

/**
 * **Las migas del arranque**, solo en desarrollo.
 *
 * El juego se quedó sin arrancar en el banco una vez de cada veinte y pico
 * —Guaraní primero, luego La Palma—, con la consola callada y **ninguna
 * petición de red abierta**: lo que esperaba no era la red. Razonándolo no se
 * encontró, así que cada etapa del arranque deja aquí su nombre y su hora, y
 * el banco, si no arranca, dice hasta dónde llegó.
 */
const migas: string[] = [];
if (import.meta.env.DEV)
  (globalThis as { __arranque?: string[] }).__arranque = migas;
function miga(que: string): void {
  if (import.meta.env.DEV)
    migas.push(`${que} ${(performance.now() / 1000).toFixed(1)} s`);
}
/** Una carga del arranque, que apunta su miga al terminar. */
function conMiga<T>(que: string, promesa: Promise<T>): Promise<T> {
  return promesa.then((v) => {
    miga(que);
    return v;
  });
}
miga("inicio");

const canvas = document.querySelector<HTMLCanvasElement>("#lienzo");
const hudRoot = document.querySelector<HTMLElement>("#hud");
const creditsRoot = document.querySelector<HTMLElement>("#creditos");
const touchRoot = document.querySelector<HTMLElement>("#tactil");

if (!canvas || !hudRoot || !creditsRoot || !touchRoot) {
  throw new Error("Falta algún nodo del documento; revisa index.html");
}

/**
 * Qué escenario se abre.
 *
 * Normalmente lo elige quien juega, en el hangar. `?escenario=tenerife-norte`
 * en la dirección se lo salta y entra directo, que es como se prueba un
 * aeródromo nuevo sin dar dos clics cada vez.
 */
const params = new URLSearchParams(location.search);
const pedido = params.get("escenario");
const directo = pedido ? SCENARIOS.find((s) => s.id === pedido) : undefined;

let escenario = directo;
// `?tramo=guyrami` entra directo en ese peldaño; lo resuelve `rememberedTier`,
// que es a quien pregunta también el juego.
let tramo = rememberedTier();
// `?leccion=aterrizaje` salta el hangar y va directo, que es lo que permite
// comprobarlas desde fuera sin pulsar cuatro fichas.
let leccion: Leccion = params.get("leccion")
  ? leccionPorId(params.get("leccion"))
  : leccionRecordada();
/*
 * La misión, si se eligió una en el hangar. No se recuerda de una partida a
 * otra a propósito: una misión se acaba, y volver a entrar y encontrártela
 * puesta otra vez sería empezar por donde ya estuviste.
 */
let mision: Mission | null = null;
/*
 * **Y `?mision=a-anaga` la pone sin pasar por el hangar.**
 *
 * Es lo mismo que `?escenario=`, `?leccion=` y `?tramo=`, y por el mismo
 * motivo: sin esto, el panel de «qué hay que hacer» solo existe detrás de
 * cuatro clics en el hangar, así que ningún banco podía abrirlo — y un panel
 * sin banco es exactamente lo que ya pasó con el plano y con el tiempo, que
 * estuvieron meses sin encierro del foco y sin Escape sin que nadie lo dijera.
 * Ver `ui/paneles.ts`.
 */
const misionPedida = params.get("mision");
if (misionPedida) {
  mision = MISSIONS.find((m) => m.id === misionPedida) ?? null;
}
/**
 * Con qué avión se vuela, y se recuerda entre partidas.
 *
 * Como el peldaño y la lección: quien eligió el biplano ayer no quiere volver
 * a buscarlo hoy. Y con respaldo, porque lo guardado puede ser de una versión
 * en la que ese avión se llamaba de otra forma — pasó al renombrar la flota.
 *
 * `?avion=jaz-25` lo fija desde la dirección, igual que `?escenario=` fija el
 * aeródromo. Hace falta para mirar un avión concreto sin dar cuatro clics —y
 * los bancos no pueden dar clics en el hangar cuando entran directos.
 */
let avion: AircraftConfig =
  AIRCRAFT.find((a) => a.id === params.get("avion")) ?? AIRCRAFT[0]!;

/*
 * **Primero quién vuela, y después dónde.**
 *
 * En una tablet de aula lo primero no es el aeropuerto: es reconocer tu avión
 * entre los doce aparcados. Y va antes que el hangar porque todo lo que se
 * elige ahí —el escenario, el peldaño, la lección— **se guarda por perfil**:
 * elegirlo después sería guardárselo al piloto equivocado.
 *
 * Con la dirección puesta —`?escenario=`— no se pregunta: eso es un banco de
 * pruebas o un enlace directo, y ahí interrumpir sería estorbar.
 */
if (!escenario) {
  const pilotosRoot = document.querySelector<HTMLElement>("#pilotos");
  if (pilotosRoot) await elegirPiloto(pilotosRoot);
  /*
   * Y lo recordado se lee **después** de saber quién vuela.
   *
   * El escenario, el peldaño y la lección se guardan por perfil, así que
   * leerlos antes es leer los del piloto anterior: el segundo niño del aula
   * entraba en el aeropuerto y el peldaño del primero.
   */
  tramo = rememberedTier();
  if (!params.get("leccion")) leccion = leccionRecordada();
  /*
   * Y el avión, por el mismo motivo que el peldaño: se guarda por perfil, así
   * que leerlo antes de saber quién vuela es darle al segundo niño del aula el
   * avión del primero. Con respaldo, porque lo guardado puede ser de una
   * versión en la que ese avión se llamaba de otra forma — pasó al renombrar
   * la flota.
   */
  avion = AIRCRAFT.find((a) => a.id === leerTexto("aeronave")) ?? AIRCRAFT[0]!;
}

const recordado =
  SCENARIOS.find((s) => {
    try {
      return s.id === leerTexto("escenario");
    } catch {
      return false;
    }
  }) ?? SCENARIOS[0]!;

if (!escenario) {
  const hangarRoot = document.querySelector<HTMLElement>("#hangar");
  if (!hangarRoot) throw new Error("Falta #hangar; revisa index.html");
  const elegido = await abrirHangar(hangarRoot, {
    scenario: recordado,
    tier: tramo,
    leccion,
    aircraft: avion,
  });
  escenario = elegido.scenario;
  tramo = elegido.tier;
  leccion = elegido.leccion;
  mision = elegido.mision;
  avion = elegido.aircraft;
  rememberTier(tramo);
  ponerTexto("aeronave", avion.id);
  recordarLeccion(leccion);
}

/*
 * **Y que el avión quepa en el campo, se haya pasado por el hangar o no.**
 *
 * La regla vive en `cabe.ts` y el hangar la aplica al elegir. Pero el hangar
 * **no siempre se abre**: con `?escenario=` en la dirección se va derecho a
 * volar, y entonces el avión sale de la dirección o del perfil guardado sin
 * que nadie vuelva a mirar dónde va a aterrizar.
 *
 * Contado jugando: «despegar y aterrizar en La Gomera con un 747, no sé si eso
 * puede ser real, pero aquí se hace». Y no lo es: esa pista mide mil
 * doscientos cincuenta metros y ese avión necesita mil cuatrocientos
 * veinticuatro para rotar.
 *
 * No es una manía de exactitud. Un simulador donde un fuselaje ancho opera en
 * la pista de una isla pequeña enseña, sin decirlo, que el tamaño de la pista
 * da igual — y es de lo poco que no da igual. Ver `elQueQuepa`.
 */
{
  const cabe = elQueQuepa(avion, campoDe(escenario), AIRCRAFT);
  if (cabe !== avion) {
    // Y se dice en la consola, que es donde mira quien juega con la dirección
    // a mano. Callarlo sería cambiarle el avión a alguien sin avisar.
    console.info(
      `Óga Veve · ${avion.name} no cabe en ${escenario.id}: se vuela ${cabe.name}.`,
    );
    avion = cabe;
  }
}

/*
 * El relieve, la ciudad y el tiempo van a la vez.
 *
 * Son tres cosas que no dependen unas de otras y encadenarlas triplicaba la
 * espera del arranque. El tiempo además puede no llegar nunca —no hay red, el
 * proxy no está puesto— y eso no puede dejar a nadie sin volar: `pedirMetar`
 * devuelve el tiempo de casa y el juego ni se entera.
 */
/**
 * El escenario al que lleva esta ruta, si lleva a alguno.
 *
 * El identificador se saca a una constante antes de buscarlo, y no es manía:
 * `escenario` es una variable que el hangar reasigna, y TypeScript no se fía
 * de lo que valga dentro de una función que la capture. Con el valor ya
 * copiado, la búsqueda es una búsqueda.
 */
/**
 * Los escenarios a los que lleva esta ruta.
 *
 * Son varios desde que El Hierro ve dos islas con pista —La Gomera a 70 km y
 * La Palma a 91— y se preguntó lo evidente: «¿y el aeropuerto de La Palma?».
 * Cada uno cuesta su relieve y su fotografía, y los dos se piden en la misma
 * tanda que todo lo demás: encadenarlos sumaría su espera a la del arranque.
 *
 * Los identificadores se copian a una constante antes de buscarlos, y no es
 * manía: `escenario` es una variable que el hangar reasigna, y TypeScript no
 * se fía de lo que valga dentro de una función que la capture.
 */
const aDondeSeVa = destinosDe(escenario);
/*
 * **Y los que no valgan para este avión no son destinos.**
 *
 * La regla estaba escrita en `cabe.ts` desde el día que se escribió —«si un
 * avión no cabe en una pista, no se ofrece»— y se aplicaba a **la mitad del
 * vuelo**: al campo del que se sale y a ninguno más. Desde Los Rodeos con el
 * de fuselaje ancho, el juego cargaba La Gomera (1.498 m), El Hierro (1.256)
 * y La Palma (2.119), las pintaba en la carta y ponía rumbo a ellas — y ese
 * avión necesita 2.562 para pararse. No hay pilotaje que arregle eso.
 *
 * Con el filtro, desde Los Rodeos el 747 tiene Tenerife Sur y Gran Canaria, y
 * la avioneta las cinco. Que es exactamente lo que pasa de verdad: a La Gomera
 * va el turbohélice y no el reactor grande, y por el mismo motivo.
 *
 * Y sale gratis en arranque: cada destino que se descarta es su relieve y su
 * ortofoto que no se bajan.
 */
const todosLosDestinos = aDondeSeVa
  .map((id) => SCENARIOS.find((e) => e.id === id))
  .filter((e): e is Scenario => e !== undefined);
const destinosDeHoy = destinosParaEsteAvion(avion, todosLosDestinos);
for (const fuera of todosLosDestinos.filter((e) => !destinosDeHoy.includes(e)))
  // Se dice, que cambiarle los destinos a alguien sin avisar es lo mismo que
  // cambiarle el avión sin avisar. Ver `elQueQuepa` arriba.
  console.info(
    `Óga Veve · ${avion.name} no cabe en ${fuera.id}: hoy no es un destino.`,
  );

const [
  conMapa,
  ciudad,
  meteo,
  ortofoto,
  ortofotoFina,
  ortofotoMedia,
  vecinos,
  fotosVecinas,
  ortofotoHorizonte,
] = await Promise.all([
  conMiga("relieve", conRelieve(escenario)),
  conMiga("ciudad", cargarCiudad(escenario.id)),
  conMiga("tiempo", tiempoPedido(escenario)),
  /*
   * La ortofoto, si el escenario la tiene y se juega el mundo de la foto.
   *
   * Va aquí con los demás y no dentro del juego porque es lo mismo que el
   * relieve y la ciudad: un fichero que hay que tener antes de construir el
   * mundo, y encadenarlo triplicaría la espera del arranque.
   */
  conMiga(
    "foto lejos",
    mundoElegido() === "foto"
      ? cargarOrtofoto(escenario.id, "lejos")
      : Promise.resolve(undefined),
  ),
  /*
   * Y la fina del aeródromo, que puede no existir: hay proveedores que no
   * tienen más detalle que dar —Sentinel-2 se acaba a ocho metros por píxel—
   * y entonces solo hay una capa y no pasa nada.
   */
  conMiga(
    "foto cerca",
    mundoElegido() === "foto"
      ? cargarOrtofoto(escenario.id, "cerca")
      : Promise.resolve(undefined),
  ),
  /*
   * **Y la de en medio: la franja por la que de verdad se vuela.**
   *
   * Entre el borde del mapa fino —nueve kilómetros— y el del mundo, el
   * detalle caía de ocho metros por píxel a ciento treinta y cuatro de
   * golpe. Tenerife mide ochenta kilómetros: casi todo lo que se mira desde
   * el aire estaba en la capa basta. Ver `ENCUADRES.medio` en
   * `scripts/ortofoto-publica.mjs`.
   */
  conMiga(
    "foto medio",
    mundoElegido() === "foto"
      ? cargarOrtofoto(escenario.id, "medio")
      : Promise.resolve(undefined),
  ),
  /*
   * Y el aeropuerto de destino, si esta ruta lleva a otro.
   *
   * Con su relieve, porque allí se va a aterrizar y el suelo que se pisa sale
   * de ahí. Va en esta misma tanda por el motivo de siempre: encadenarlo
   * detrás sumaría su espera a la del arranque, y son otros trescientos
   * kilobytes.
   */
  conMiga("relieve vecinos", Promise.all(destinosDeHoy.map((d) => conRelieve(d)))),
  /*
   * Y su fotografía, para que la isla de enfrente no salga de polígonos.
   *
   * La de lejos y no la fina: el vecino se mira desde el aire y de lejos
   * durante casi todo el vuelo, y la fina cubre seis kilómetros alrededor de
   * su pista. Cuando el aterrizaje allí sea un aterrizaje de verdad, la fina
   * también.
   */
  conMiga(
    "foto vecinos",
    Promise.all(
      destinosDeHoy.map((d) =>
        mundoElegido() === "foto"
          ? cargarOrtofoto(d.id, "lejos")
          : Promise.resolve(undefined),
      ),
    ),
  ),
  /*
   * Y la del horizonte: el anillo lejano entero, a setenta metros por píxel.
   *
   * Es la que quita la llanura de color plano que empezaba donde acababa la
   * foto de dieciocho kilómetros. Ciento cincuenta kilobytes por isla.
   */
  conMiga(
    "foto horizonte",
    mundoElegido() === "foto"
      ? cargarOrtofoto(escenario.id, "horizonte")
      : Promise.resolve(undefined),
  ),
]);
miga("cargas");
/**
 * **Y donde la foto ya enseña la ciudad, la ciudad es la foto.**
 *
 * Las casas de la rejilla se sortearon para cuando no había fotografía: «el
 * aeródromo flotaba en un bosque de ciento noventa kilómetros cuadrados, sin
 * una casa ni una carretera». Encima de una ortofoto a dos metros por píxel
 * hacen lo contrario de lo que se pretendía — se ven las dos ciudades, la de la
 * foto y la nuestra, y la nuestra no coincide con nada—. Se dijo jugando: «no
 * me gusta volar sobre Maincraft… encima tú le metes edificios inventados».
 *
 * Comparado en la misma aproximación a Los Rodeos, con las cajas y sin ellas:
 * sin ellas la isla se lee como una isla y con ellas como bloques esparcidos
 * sobre una alfombra. El sorteo no está mal hecho; es que su trabajo ya lo hace
 * la foto.
 *
 * Así que la regla mira el dato y no el gusto: **si el píxel de la foto es más
 * fino que una casa, no se sortea nada**. Con Sentinel-2 a ocho metros y medio
 * sí se sortea, porque ahí la foto da color y uso del suelo pero no dice dónde
 * hay un edificio.
 *
 * Y lo que queda sólido en la ciudad son los edificios **de verdad** del
 * aeródromo —terminal, hangares, torre—, que salen de OpenStreetMap y están
 * donde están. Chocar con uno inventado es peor que no chocar con ninguno.
 */
const FINA_DE_VERDAD = 4;
const laFotoYaEnsenaLaCiudad =
  (ortofotoFina ?? ortofoto) !== undefined &&
  ((ortofotoFina ?? ortofoto)!.ficha.metrosPorPixel ?? Infinity) <=
    FINA_DE_VERDAD;
escenario = conViento(
  ciudad && !laFotoYaEnsenaLaCiudad ? { ...conMapa, ciudad } : conMapa,
  meteo,
);

try {
  ponerTexto("escenario", escenario.id);
} catch {
  // Sin almacenamiento se juega igual, solo que no se recuerda.
}

miga("antes del juego");
// Y la ortofoto al terreno, si la hay. Ver `Terrain.ponerOrtofoto`.
const game = new Game({
  canvas,
  hudRoot,
  creditsRoot,
  touchRoot,
  scenario: escenario,
  leccion,
  mision,
  aircraft: avion,
  ortofoto,
  ortofotoFina,
  ortofotoMedia,
  /*
   * Y la rejilla de ciudad **siempre**, aunque la foto ya la enseñe: de día
   * sobra y de noche es lo único que hay. Ver `luzDeCiudad` en `game.ts`.
   */
  luzDeCiudad: ciudad,
  vecinos,
  fotosVecinas,
  ortofotoHorizonte,
});
miga("juego creado");
/*
 * **Y el parte se le da al juego, no solo al escenario.**
 *
 * `conViento` mete el viento en el escenario, y con eso el motor de vuelo se
 * entera. Pero el parte trae más cosas —la presión, la temperatura— y ésas se
 * quedaban en esta línea sin llegar a ninguna parte: el altímetro arrancaba
 * siempre en 1013 aunque el METAR del día dijera 1003. Ver
 * `flight/altimetro.ts`.
 */
game.ponerTiempo(meteo);
game.start();

/*
 * **Se para cuando nadie mira, y «nadie mira» son dos cosas distintas.**
 *
 * Estaba solo `visibilitychange`, que salta al ocultar la pestaña. Pero
 * cambiar a otra ventana en la misma pantalla —abrir el correo, escribir en
 * otro sitio— **no oculta la pestaña**: salta `blur` y nada más. Así que el
 * juego seguía corriendo a pleno rendimiento con el avión rodando y nadie a
 * los mandos. «Solté la tecla, cambié de pantalla para escribir, volví al
 * juego y la avioneta estaba sobrevolando el Padre Anchieta.»
 *
 * El teclado ya se suelta solo al perder el foco —eso estaba—, pero soltar las
 * teclas no para un avión: el gas es un mando que se queda donde lo dejas, que
 * es lo que hace un gas de verdad. Lo que hay que parar es el reloj.
 */
const mirando = (): boolean => !document.hidden && document.hasFocus();
const atender = (): void => {
  /*
   * **Y una pausa pedida no la levanta volver a la pestaña.**
   *
   * Son dos cosas distintas que hasta hoy se confundían: el juego se para
   * solo cuando nadie mira, y arranca solo al volver a mirar. Pero si alguien
   * le dio a la pausa, volver a la ventana no puede devolverle un avión en
   * movimiento: lo paró él y lo levanta él.
   */
  if (!mirando()) return game.stop();
  if (!game.pausado) return game.start();
  /*
   * Y si está quieto porque hay algo abierto encima, el bucle sigue parado
   * pero el sonido despierta: quien vuelve a la ventana con un panel abierto
   * está eligiendo algo. Ver `Game.quedarQuieto`.
   */
  game.despertarElSonido();
};
/*
 * Y una puerta para los bancos de pruebas, solo en desarrollo.
 *
 * Una pestaña abierta por un guion nunca tiene el foco, así que `atender` la
 * para en cuanto arranca y el banco mide un avión congelado. Costó una tarde
 * entenderlo. Con esto, quien prueba puede decir «sigue, que sí estoy
 * mirando».
 */
if (import.meta.env.DEV) {
  (globalThis as { __ogaEmpezar?: () => void }).__ogaEmpezar = () =>
    game.start();
}

document.addEventListener("visibilitychange", atender);
window.addEventListener("blur", atender);
window.addEventListener("focus", atender);

/*
 * Y lo pendiente de guardar se escribe antes de que la pestaña se vaya.
 *
 * El guardado tiene un freno de un cuarto de segundo para no escribir sesenta
 * veces por segundo en el hilo que dibuja, y ese freno tiene un precio: un
 * cambio hecho en el último instante se perdería. En una tablet de aula el
 * último instante es lo normal —se cambia de aplicación y ya está—, y lo que
 * se pierde es justo el vuelo que se acaba de terminar. Ver `datos/guardado.ts`.
 */
guardarAlSalir();

/*
 * Y el service worker, que es lo que hace que esto funcione sin conexión.
 *
 * Solo en lo publicado: en desarrollo estorbaría —serviría ficheros viejos
 * mientras se edita— y los bancos de pruebas corren contra el servidor de
 * desarrollo, así que ahí ni existe.
 *
 * Falla en silencio a propósito. Un navegador sin service workers, una
 * ventana privada o un servidor sin HTTPS son razones para no tener el juego
 * sin conexión, no para no tener juego. Ver `scripts/hacer-sw.mjs`.
 */
/*
 * **Y en desarrollo se echa al que hubiera, que no basta con no registrarlo.**
 *
 * Un service worker vive atado al **origen, puerto incluido**, y no a lo que
 * lo puso ahí. Así que basta con haber abierto una vez una compilación de
 * producción en `localhost:5173` para que su worker se quede mandando en ese
 * puerto: después sirve su caché a cualquier cosa que se levante ahí, incluido
 * el servidor de desarrollo, y lo hace sobre todo **cuando el servidor se
 * cae** — que es cuando parece que todo sigue bien.
 *
 * Eso costó una tarde: al reiniciar la máquina se cayó vite, la pestaña siguió
 * funcionando con la caché de semanas atrás, y lo que se vio en pantalla era
 * un juego viejo que ya no existía en el disco. Dicho por quien lo sufrió:
 * «se cayó y lo que quedaba siguió funcionando con algún tipo de caché».
 *
 * No registrar en desarrollo no impide nada de esto: el que ya está puesto no
 * se va solo. Hay que echarlo.
 */
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  void navigator.serviceWorker
    .getRegistrations()
    .then((puestos) => Promise.all(puestos.map((r) => r.unregister())))
    .catch(() => {});
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const registrar = (): void => {
    /*
     * **Y se le pide con el nombre de esta compilación detrás.**
     *
     * `sw.js` se llama igual en todas las versiones, así que una caché por
     * delante —la del navegador o la del CDN— puede servir el de ayer durante
     * horas, y con él un armazón que precachea ficheros con nombres que ya no
     * existen. Medido en producción: `cache-control: max-age=53257` y ocho
     * horas de antigüedad, con el `index.html` pidiendo `index-CxRfK_OS.js`
     * mientras el `sw.js` publicado listaba `index-WRFM5t_5.js`. El resultado
     * es el peor de todos: se despliega, el servidor lo tiene, y **quien
     * juega sigue en la versión de anteayer por mucho que recargue**, porque
     * lo que le sirve el trabajador de servicio no pasa por la red.
     *
     * El nombre de este propio módulo lleva la huella de la compilación, así
     * que sirve de versión sin tener que inventarse ninguna: cada compilación
     * pide una dirección que ninguna caché ha visto nunca. La consulta no
     * cambia el ámbito del trabajador —eso lo fija la ruta— así que esto no
     * es un truco con efectos: es pedir el fichero de hoy.
     *
     * Y `updateViaCache: "none"`, que es lo mismo por el otro lado: cuando el
     * navegador vaya a comprobar si hay uno nuevo, que no se conteste solo
     * con lo que tiene guardado.
     */
    const huella = new URL(import.meta.url).pathname.split("/").pop() ?? "";
    void navigator.serviceWorker
      .register(`./sw.js?v=${encodeURIComponent(huella)}`, {
        updateViaCache: "none",
      })
      .then((registro) => avisarDeLaVersionNueva(registro))
      .catch(() => {});
  };
  /*
   * **Y se mira si la página ya cargó, en vez de esperar a que cargue.**
   *
   * Esto colgaba de `window.addEventListener("load", …)` y no se registraba
   * nunca. El motivo: este fichero es un módulo con `await` de primer nivel
   * —espera al relieve, a la ciudad, al tiempo y a las dos ortofotos— así que
   * para cuando llega aquí, el evento `load` **ya pasó hace rato** y el oyente
   * se queda esperando algo que no va a volver a ocurrir.
   *
   * Lo cazó el banco: cero cachés, cero piezas, el juego sin red en blanco.
   */
  if (document.readyState === "complete") registrar();
  else window.addEventListener("load", registrar);
}

/**
 * Y avisar de que hay una versión nueva esperando.
 *
 * **Esto es la otra mitad de una decisión que estaba a medias.** El trabajador
 * de servicio no se salta la espera a propósito —cambiar los ficheros por
 * debajo de una pestaña que está volando deja al avión sin lo que pida
 * después— y eso está bien. Lo que faltaba es que alguien lo dijera: quien
 * tiene la pestaña abierta se queda en la versión de ayer sin enterarse, y
 * entonces vuelve a contar un fallo que ya está arreglado.
 *
 * Costó caro y por eso está escrito: el tirador del cuadro de mandos se
 * arregló, se desplegó y se midió funcionando, y seguía sin funcionar —porque
 * lo que corría en esa pestaña era el juego de antes—.
 *
 * Así que se avisa y se ofrece. No se cambia nada por las bravas: se enciende
 * un botón pequeño en una esquina, y si lo tocan, entonces sí. Ver el mensaje
 * `estrenar` en `scripts/plantilla-sw.js`.
 */
function avisarDeLaVersionNueva(registro: ServiceWorkerRegistration): void {
  const enseñar = (esperando: ServiceWorker): void => {
    if (document.querySelector(".version-nueva")) return;
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "version-nueva";
    boton.innerHTML =
      `<svg viewBox="0 0 24 24" aria-hidden="true">` +
      `<path d="M20 12a8 8 0 1 1-2.3-5.6" fill="none" stroke="currentColor"` +
      ` stroke-width="2.2" stroke-linecap="round"/>` +
      `<path d="M20 3.5V9h-5.5" fill="none" stroke="currentColor"` +
      ` stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` +
      `</svg><span>${t("version.nueva")}</span>`;
    boton.addEventListener("click", () => {
      /*
       * Primero se le dice que se estrene y **después se recarga**, cuando el
       * navegador avisa de que hay otro al mando. Recargar antes vuelve a
       * pedirle las piezas al de siempre, o sea a la versión vieja otra vez,
       * que es la forma más fácil de que esto parezca que no hace nada.
       */
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => location.reload(),
        { once: true },
      );
      esperando.postMessage("estrenar");
    });
    document.body.appendChild(boton);
  };

  // El que ya estaba esperando cuando se abrió la página.
  if (registro.waiting && navigator.serviceWorker.controller)
    enseñar(registro.waiting);

  /*
   * **Y se pregunta cada tanto, que si no nadie pregunta.**
   *
   * Esto solo miraba al registrarse, o sea una vez por carga de página. Quien
   * deja la pestaña abierta —que es exactamente lo que hace quien está
   * probando— se queda en la versión de hace horas y **vuelve a contar fallos
   * que ya están arreglados**: pasó una tarde entera con las luces de
   * posición, con capturas de un juego que ya no existía.
   *
   * Dos minutos es un compromiso cómodo: es una petición condicional de unos
   * pocos cientos de bytes, y el navegador contesta 304 casi siempre. Y al
   * volver a la pestaña también, que es cuando se mira.
   */
  const preguntar = (): void => void registro.update().catch(() => {});
  setInterval(preguntar, 120_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") preguntar();
  });

  // Y el que llegue mientras se juega.
  registro.addEventListener("updatefound", () => {
    const nuevo = registro.installing;
    if (!nuevo) return;
    nuevo.addEventListener("statechange", () => {
      if (nuevo.state === "installed" && navigator.serviceWorker.controller)
        enseñar(nuevo);
    });
  });
}

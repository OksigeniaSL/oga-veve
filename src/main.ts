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
import { SCENARIOS, type Scenario } from "./world/scenarios";
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
import {
  leerMetar,
  pedirMetar,
  TIEMPO_DE_CASA,
  type Meteo,
} from "./world/meteo";

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

  const crudo = q.get("metar");
  if (crudo) return { ...(leerMetar(crudo) ?? TIEMPO_DE_CASA), fuente: "mano" };

  const viento = q.get("viento");
  if (viento) {
    const m = /^(\d{1,3})\/(\d{1,3})$/.exec(viento);
    if (m) {
      const kt = Number(m[2]);
      return {
        ...TIEMPO_DE_CASA,
        vientoDe: kt === 0 ? null : Number(m[1]) % 360,
        vientoKt: kt,
        fuente: "mano",
      };
    }
  }

  // El identificador OACI es el `id` del aeródromo: así se llama el fichero y
  // así lo llama el METAR.
  const icao = esc.aerodrome?.id;
  if (!icao) return TIEMPO_DE_CASA;
  // El proxy se configura al construir; sin él no se pide nada. Ver
  // `workers/meteo.js`, que es el que hace falta y son diez líneas.
  const proxy = q.get("meteo") ?? import.meta.env.VITE_METEO ?? null;
  return pedirMetar(icao, proxy);
}
import { detectLocale, setLocale } from "./i18n";
import { abrirHangar } from "./ui/hangar";
import type { Mission } from "./missions/types";
import { rememberTier, rememberedTier } from "./flight/tiers";

setLocale(detectLocale());

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

const recordado =
  SCENARIOS.find((s) => {
    try {
      return s.id === localStorage.getItem("oga-veve:escenario");
    } catch {
      return false;
    }
  }) ?? SCENARIOS[0]!;

let escenario = directo;
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

if (!escenario) {
  const hangarRoot = document.querySelector<HTMLElement>("#hangar");
  if (!hangarRoot) throw new Error("Falta #hangar; revisa index.html");
  const elegido = await abrirHangar(hangarRoot, {
    scenario: recordado,
    tier: tramo,
    leccion,
  });
  escenario = elegido.scenario;
  tramo = elegido.tier;
  leccion = elegido.leccion;
  mision = elegido.mision;
  rememberTier(tramo);
  recordarLeccion(leccion);
}

/*
 * El relieve, la ciudad y el tiempo van a la vez.
 *
 * Son tres cosas que no dependen unas de otras y encadenarlas triplicaba la
 * espera del arranque. El tiempo además puede no llegar nunca —no hay red, el
 * proxy no está puesto— y eso no puede dejar a nadie sin volar: `pedirMetar`
 * devuelve el tiempo de casa y el juego ni se entera.
 */
const [conMapa, ciudad, meteo, ortofoto] = await Promise.all([
  conRelieve(escenario),
  cargarCiudad(escenario.id),
  tiempoPedido(escenario),
  /*
   * La ortofoto, si el escenario la tiene y se juega el mundo de la foto.
   *
   * Va aquí con los demás y no dentro del juego porque es lo mismo que el
   * relieve y la ciudad: un fichero que hay que tener antes de construir el
   * mundo, y encadenarlo triplicaría la espera del arranque.
   */
  mundoElegido() === "foto"
    ? cargarOrtofoto(escenario.id, "lejos")
    : Promise.resolve(undefined),
]);
escenario = conViento(ciudad ? { ...conMapa, ciudad } : conMapa, meteo);

try {
  localStorage.setItem("oga-veve:escenario", escenario.id);
} catch {
  // Sin almacenamiento se juega igual, solo que no se recuerda.
}

// Y la ortofoto al terreno, si la hay. Ver `Terrain.ponerOrtofoto`.
const game = new Game({
  canvas,
  hudRoot,
  creditsRoot,
  touchRoot,
  scenario: escenario,
  leccion,
  mision,
});
if (ortofoto) game.ponerOrtofoto(ortofoto);
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
  if (mirando()) game.start();
  else game.stop();
};
document.addEventListener("visibilitychange", atender);
window.addEventListener("blur", atender);
window.addEventListener("focus", atender);

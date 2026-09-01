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
import { Game } from './game';
import { SCENARIOS } from './world/scenarios';
import { conRelieve } from './world/relieve';
import { cargarCiudad } from './world/ciudades';
import { detectLocale, setLocale } from './i18n';
import { abrirHangar } from './ui/hangar';
import { rememberTier, rememberedTier } from './flight/tiers';

setLocale(detectLocale());

const canvas = document.querySelector<HTMLCanvasElement>('#lienzo');
const hudRoot = document.querySelector<HTMLElement>('#hud');
const creditsRoot = document.querySelector<HTMLElement>('#creditos');
const touchRoot = document.querySelector<HTMLElement>('#tactil');

if (!canvas || !hudRoot || !creditsRoot || !touchRoot) {
  throw new Error('Falta algún nodo del documento; revisa index.html');
}

/**
 * Qué escenario se abre.
 *
 * Normalmente lo elige quien juega, en el hangar. `?escenario=tenerife-norte`
 * en la dirección se lo salta y entra directo, que es como se prueba un
 * aeródromo nuevo sin dar dos clics cada vez.
 */
const pedido = new URLSearchParams(location.search).get('escenario');
const directo = pedido ? SCENARIOS.find((s) => s.id === pedido) : undefined;

const recordado =
  SCENARIOS.find((s) => {
    try {
      return s.id === localStorage.getItem('oga-veve:escenario');
    } catch {
      return false;
    }
  }) ?? SCENARIOS[0]!;

let escenario = directo;
let tramo = rememberedTier();

if (!escenario) {
  const hangarRoot = document.querySelector<HTMLElement>('#hangar');
  if (!hangarRoot) throw new Error('Falta #hangar; revisa index.html');
  const elegido = await abrirHangar(hangarRoot, { scenario: recordado, tier: tramo });
  escenario = elegido.scenario;
  tramo = elegido.tier;
  rememberTier(tramo);
}

// El relieve y la ciudad van a la vez: son dos ficheros que no dependen el
// uno del otro y encadenarlos duplicaba la espera del arranque.
const [conMapa, ciudad] = await Promise.all([
  conRelieve(escenario),
  cargarCiudad(escenario.id),
]);
escenario = ciudad ? { ...conMapa, ciudad } : conMapa;

try {
  localStorage.setItem('oga-veve:escenario', escenario.id);
} catch {
  // Sin almacenamiento se juega igual, solo que no se recuerda.
}

const game = new Game({ canvas, hudRoot, creditsRoot, touchRoot, scenario: escenario });
game.start();

// Al ocultar la pestaña se para el bucle: no tiene sentido gastar batería
// simulando un avión que nadie mira, y evita el salto de tiempo al volver.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.stop();
  else game.start();
});

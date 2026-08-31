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
import { detectLocale, setLocale } from './i18n';

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
 * Por ahora se elige con `?escenario=pettirossi` en la dirección, o se
 * recuerda el último. El selector de verdad —con su hangar y su mapa— va en
 * la concha del juego; esto es lo que permite probar Silvio Pettirossi hoy
 * sin esperar a que exista.
 */
const pedido =
  new URLSearchParams(location.search).get('escenario') ??
  localStorage.getItem('oga-veve:escenario') ??
  undefined;
const escenario = pedido ? SCENARIOS.find((s) => s.id === pedido) : undefined;
if (escenario) {
  try {
    localStorage.setItem('oga-veve:escenario', escenario.id);
  } catch {
    // Sin almacenamiento se juega igual, solo que no se recuerda.
  }
}

const game = new Game({ canvas, hudRoot, creditsRoot, touchRoot, scenario: escenario });
game.start();

// Al ocultar la pestaña se para el bucle: no tiene sentido gastar batería
// simulando un avión que nadie mira, y evita el salto de tiempo al volver.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.stop();
  else game.start();
});

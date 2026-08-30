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
import { detectLocale, setLocale } from './i18n';

setLocale(detectLocale());

const canvas = document.querySelector<HTMLCanvasElement>('#lienzo');
const hudRoot = document.querySelector<HTMLElement>('#hud');
const creditsRoot = document.querySelector<HTMLElement>('#creditos');
const touchRoot = document.querySelector<HTMLElement>('#tactil');

if (!canvas || !hudRoot || !creditsRoot || !touchRoot) {
  throw new Error('Falta algún nodo del documento; revisa index.html');
}

const game = new Game({ canvas, hudRoot, creditsRoot, touchRoot });
game.start();

// Al ocultar la pestaña se para el bucle: no tiene sentido gastar batería
// simulando un avión que nadie mira, y evita el salto de tiempo al volver.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.stop();
  else game.start();
});

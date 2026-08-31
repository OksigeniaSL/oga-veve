/**
 * La pantalla de teclas.
 *
 * Hace dos cosas y la segunda importa más que la primera.
 *
 * La primera es dejar cambiar las teclas, porque de fábrica las flechas y el
 * motor caen todos en la mitad derecha del teclado y hay que volar con las
 * dos manos amontonadas. En una cabina de verdad una mano lleva el mando y la
 * otra el motor, cada una en su lado.
 *
 * La segunda es que **es la lista de lo que existe**. Quien lo probó llevaba
 * semanas sin saber que la B frenaba, y no por despiste: no había forma de
 * enterarse. Un mando que no se anuncia no existe. Por eso esta pantalla
 * enseña todas las acciones aunque nadie vaya a cambiar ninguna, y por eso
 * dice qué hace cada una con palabras y no solo la tecla.
 */

import { ACCIONES, ORDEN, nombreDeTecla, type Accion, type Keymap } from '../flight/keymap';
import { t } from '../i18n';

export class KeyScreen {
  private readonly root: HTMLElement;
  private readonly keymap: Keymap;
  private previousFocus: HTMLElement | null = null;

  /** Qué acción está esperando una tecla nueva, si alguna. */
  private capturando: Accion | null = null;

  constructor(root: HTMLElement, keymap: Keymap) {
    this.root = root;
    this.keymap = keymap;
    this.root.hidden = true;

    this.root.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target === this.root) return this.hide();
      const accion = target.dataset.accion as Accion | undefined;
      if (accion) this.capture(accion);
      if (target.dataset.todo === 'restaurar') {
        this.keymap.restoreAll();
        this.capturando = null;
        this.render();
      }
      if (target.dataset.cerrar !== undefined) this.hide();
    });

    // La captura se hace aquí y en fase de captura, para llegar antes que el
    // juego: mientras se espera una tecla, esa tecla no debe volar el avión.
    window.addEventListener('keydown', this.onKeyDown, true);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (this.root.hidden) return;

    if (event.key === 'Escape') {
      event.stopPropagation();
      if (this.capturando) {
        this.capturando = null;
        this.render();
      } else {
        this.hide();
      }
      return;
    }

    if (!this.capturando) return;

    event.preventDefault();
    event.stopPropagation();
    // Se guarda el carácter cuando la tecla lo tiene y el código cuando no.
    // Es lo que hace que una tecla asignada en un teclado español siga
    // significando lo mismo, en vez de nombrar una posición del americano.
    const tecla = event.key.length === 1 ? event.key : event.code;
    this.keymap.assign(this.capturando, tecla);
    this.capturando = null;
    this.render();
  };

  toggle(): void {
    if (this.root.hidden) this.show();
    else this.hide();
  }

  show(): void {
    this.previousFocus = document.activeElement as HTMLElement | null;
    this.root.hidden = false;
    this.render();
    this.root.querySelector<HTMLElement>('button')?.focus();
  }

  hide(): void {
    this.capturando = null;
    this.root.hidden = true;
    this.previousFocus?.focus();
  }

  private capture(accion: Accion): void {
    this.capturando = accion;
    this.render();
  }

  private render(): void {
    const filas = ORDEN.map((accion) => {
      const esperando = this.capturando === accion;
      const teclas = this.keymap
        .keys(accion)
        .map(nombreDeTecla)
        // Sin repetidos: las dos mayúsculas o los dos controles se ven como
        // una sola tecla, que es como los ve quien está mirando el teclado.
        .filter((nombre, i, todas) => todas.indexOf(nombre) === i)
        .join(' · ');
      return `
        <tr>
          <th scope="row">${t(ACCIONES[accion].label)}</th>
          <td>
            <button class="teclas__tecla${esperando ? ' teclas__tecla--esperando' : ''}"
                    type="button" data-accion="${accion}">
              ${esperando ? t('teclas.pulsa') : teclas}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    this.root.innerHTML = `
      <div class="creditos__panel teclas__panel" role="dialog" aria-modal="true" aria-label="${t('teclas.title')}">
        <h2>${t('teclas.title')}</h2>
        <p class="teclas__pista">${t('teclas.hint')}</p>
        <table class="teclas__tabla"><tbody>${filas}</tbody></table>
        <div class="teclas__pie">
          <button type="button" data-todo="restaurar">${t('teclas.restore')}</button>
          <button type="button" data-cerrar>${t('teclas.close')}</button>
        </div>
      </div>
    `;
  }
}

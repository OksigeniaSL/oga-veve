/**
 * Pantalla de créditos.
 *
 * No es un trámite: es donde consta que esto es gratis para la educación
 * paraguaya, y esa promesa tiene que estar donde la vea cualquiera que abra
 * el juego, no solo en un fichero del repositorio. Ver LICENSE-CONTENIDO.md.
 */

import { t } from '../i18n';

export class CreditsScreen {
  private readonly root: HTMLElement;
  /** Dónde estaba el foco antes de abrir, para devolverlo al cerrar. */
  private previousFocus: HTMLElement | null = null;

  constructor(root: HTMLElement, flightModelName: string) {
    this.root = root;
    root.innerHTML = `
      <div class="creditos__panel" role="dialog" aria-modal="true">
        <h2>${t('credits.title')}</h2>
        <p><strong>Óga Veve</strong> — ${t('app.tagline')}</p>
        <p>${t('credits.madeBy')}</p>
        <p class="creditos__destacado">${t('credits.educational')}</p>
        <p>${t('credits.terrain')}</p>
        <p>${t('credits.engine', { model: flightModelName })}</p>
        <p>${t('credits.licence')}</p>
        <button class="creditos__cerrar" type="button">${t('credits.close')}</button>
      </div>
    `;
    root.querySelector('button')?.addEventListener('click', () => this.hide());
    root.addEventListener('click', (event) => {
      if (event.target === root) this.hide();
    });

    // Escape cierra. El diálogo se declaraba modal y no se podía salir con
    // teclado, que es exactamente lo que exige el criterio 2.1.2 de WCAG:
    // si se puede entrar con el teclado, se tiene que poder salir.
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        this.hide();
      }
    });
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  toggle(): void {
    if (this.root.hidden) this.show();
    else this.hide();
  }

  /**
   * Abre y **lleva el foco dentro**. Sin esto, quien navega con teclado abría
   * un diálogo modal y seguía tabulando por detrás, sobre el juego, sin
   * enterarse de que había algo abierto.
   */
  show(): void {
    this.previousFocus = document.activeElement as HTMLElement | null;
    this.root.hidden = false;
    this.root.querySelector<HTMLElement>('button')?.focus();
  }

  hide(): void {
    this.root.hidden = true;
    // Y devuelve el foco a donde estaba: criterio 2.4.3.
    this.previousFocus?.focus();
    this.previousFocus = null;
  }
}

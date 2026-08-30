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
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  toggle(): void {
    this.root.hidden = !this.root.hidden;
  }

  hide(): void {
    this.root.hidden = true;
  }
}

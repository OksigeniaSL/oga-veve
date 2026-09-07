/**
 * Pantalla de créditos.
 *
 * No es un trámite: es donde consta que esto es gratis para la educación
 * paraguaya, y esa promesa tiene que estar donde la vea cualquiera que abra
 * el juego, no solo en un fichero del repositorio. Ver LICENSE-CONTENIDO.md.
 */

import { t } from "../i18n";
import { Encierro } from "./panel";

export class CreditsScreen {
  private readonly root: HTMLElement;
  /**
   * El encierro: el foco no se sale y Escape cierra desde donde sea.
   *
   * Lleva también lo de devolver el foco a donde estaba. Ver `ui/panel.ts`,
   * que existe porque esto estaba escrito tres veces y mal las tres.
   */
  private readonly encierro: Encierro;

  constructor(root: HTMLElement, flightModelName: string) {
    this.root = root;
    root.innerHTML = `
      <div class="creditos__panel" role="dialog" aria-modal="true">
        <h2>${t("credits.title")}</h2>
        <p><strong>Óga Veve</strong> — ${t("app.tagline")}</p>
        <p>${t("credits.madeBy")}</p>
        <p class="creditos__destacado">${t("credits.educational")}</p>
        <p>${t("credits.terrain")}</p>
        <!--
          Y la del IGN, que es igual de obligatoria: los escenarios españoles
          vuelan sobre el MDT05 del PNOA-LiDAR y su licencia pide atribución.
          Ver scripts/ign-a-relieve.mjs y CREDITOS.md.
        -->
        <p>${t("credits.terrainEs")}</p>
        <p>${t("credits.engine", { model: flightModelName })}</p>
        <p>${t("credits.licence")}</p>
        <!--
          La dedicatoria va la última y separada, porque no es un crédito de
          procedencia: es la única línea de esta pantalla que no está aquí
          por obligación legal.
        -->
        <p class="creditos__dedicatoria">${t("credits.dedication")}</p>
        <button class="creditos__cerrar" type="button">${t("credits.close")}</button>
      </div>
    `;
    this.encierro = new Encierro(root, () => this.hide());
    root.querySelector("button")?.addEventListener("click", () => this.hide());
    root.addEventListener("click", (event) => {
      if (event.target === root) this.hide();
    });

    // Escape y el tabulador los lleva el encierro, y los lleva en `window`:
    // colgados de esta caja solo funcionaban mientras el foco siguiera dentro,
    // que era justo lo que fallaba. Criterios 2.1.2 y 2.4.3.
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
    this.root.hidden = false;
    this.encierro.abrir();
  }

  hide(): void {
    this.root.hidden = true;
    this.encierro.soltar();
  }
}

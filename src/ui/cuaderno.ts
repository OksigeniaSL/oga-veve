/**
 * La página del cuaderno de vuelo: lo que llevas hecho y el grado que sale.
 *
 * Es lo que un niño le enseña a su padre, y por eso está pensada para eso: la
 * hombrera con sus galones ocupando media pantalla, el grado con su nombre, y
 * debajo las cuentas — horas, despegues, aterrizajes, frustradas, aeródromos—.
 * Nada de porcentajes ni de barras de progreso: **cosas hechas**.
 *
 * Y una línea al final con lo que falta para el siguiente grado, dicha en
 * cosas que se pueden hacer esta tarde: «te faltan dos aterrizajes» se cumple
 * hoy; «llevas un 68 %» no le dice a nadie qué hacer ahora.
 */

import { t } from "../i18n";
import {
  barrasDe,
  grado,
  loQueFalta,
  type Cuaderno,
  type Grado,
} from "../flight/cuaderno";

/** Las horas, como se dicen en un cuaderno de vuelo: horas y minutos. */
function horasDe(segundos: number): string {
  const m = Math.floor(segundos / 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}
import { Encierro } from "./panel";
import { manga as dibujarManga } from "./manga";

/**
 * Alto del lienzo de la manga en el cuaderno.
 *
 * Dos más que en el HUD, que es aire por debajo del puño: aquí la manga se
 * mira de cerca y pegada al borde queda apretada.
 */
const CUADERNO_ALTO = 34;

export class CuadernoScreen {
  private readonly root: HTMLElement;
  /** Foco atrapado y Escape que cierra desde donde sea. Ver `ui/panel.ts`. */
  private readonly encierro: Encierro;
  private cuaderno: Cuaderno;

  constructor(root: HTMLElement, cuaderno: Cuaderno) {
    this.root = root;
    this.cuaderno = cuaderno;
    this.encierro = new Encierro(root, () => this.hide());
    this.pintar();
    root.addEventListener("click", (e) => {
      if (e.target === root) this.hide();
      if ((e.target as HTMLElement)?.dataset?.cerrar !== undefined) this.hide();
    });
  }

  /** Se le pasa el cuaderno cada vez que cambia algo digno de apuntarse. */
  ponerCuaderno(c: Cuaderno): void {
    this.cuaderno = c;
    if (!this.root.hidden) this.pintar();
  }

  private pintar(): void {
    const c = this.cuaderno;
    const g: Grado = grado(c);
    const falta = loQueFalta(c);
    const cuenta = (clave: string, valor: string): string => `
      <div class="cuaderno__dato">
        <span class="cuaderno__cifra">${valor}</span>
        <span class="cuaderno__glosa">${t(clave as never)}</span>
      </div>`;
    this.root.innerHTML = `
      <div class="cuaderno__panel" role="dialog" aria-modal="true">
        <div class="cuaderno__manga">${dibujarManga(barrasDe(g), CUADERNO_ALTO, t("galon.manga"))}</div>
        <h2 class="cuaderno__grado">${t(`grado.${g}` as never)}</h2>
        <div class="cuaderno__datos">
          ${cuenta("cuaderno.horas", horasDe(c.segundos))}
          ${cuenta("cuaderno.despegues", String(c.despegues))}
          ${cuenta("cuaderno.aterrizajes", String(c.aterrizajes))}
          ${cuenta("cuaderno.frustradas", String(c.frustradas))}
          ${cuenta("cuaderno.aerodromos", String(c.aerodromos.length))}
        </div>
        ${
          falta
            ? `<p class="cuaderno__falta">${t("cuaderno.falta", {
                grado: t(`grado.${falta.grado}` as never),
              })} ${[
                falta.falta.aterrizajes
                  ? `${falta.falta.aterrizajes} × ${t("cuaderno.aterrizajes")}`
                  : "",
                falta.falta.aerodromos
                  ? `${falta.falta.aerodromos} × ${t("cuaderno.aerodromos")}`
                  : "",
                falta.falta.frustradas
                  ? `${falta.falta.frustradas} × ${t("cuaderno.frustradas")}`
                  : "",
              ]
                .filter(Boolean)
                .join(" · ")}</p>`
            : `<p class="cuaderno__falta">${t("cuaderno.completo")}</p>`
        }
        <button class="creditos__cerrar" type="button" data-cerrar>
          ${t("credits.close")}
        </button>
      </div>
    `;
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  toggle(): void {
    if (this.root.hidden) this.show();
    else this.hide();
  }

  show(): void {
    this.pintar();
    this.root.hidden = false;
    this.encierro.abrir();
  }

  hide(): void {
    this.root.hidden = true;
    this.encierro.soltar();
  }
}

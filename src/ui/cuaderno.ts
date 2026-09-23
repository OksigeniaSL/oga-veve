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
 *
 * ## Y debajo, los vuelos
 *
 * Un total no es un recuerdo: dice que hubo veinte aterrizajes y no dice
 * **cuál fue el tuyo**. Eso lo guardaba `flight/bitacora.ts` desde que se
 * escribió —fecha, campo, duración, galones y la traza del vuelo entero— y
 * **no se enseñaba en ninguna parte**: una funcionalidad terminada, con sus
 * topes medidos y sus 82,2 KB de presupuesto, esperando a que alguien la
 * enchufara.
 *
 * Se enchufa aquí, y como tarjetas con el dibujo delante: a los cuatro años
 * «lo que hice el sábado» no es una fila de una tabla, es **el dibujo de por
 * dónde fui**. `plano()` ya sabe pintar un aeródromo con una traza encima y
 * ya encuadra para que el vuelo entero quepa; no había que inventar nada.
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
import { Panel } from "./panel";
import { armarPanel, CERRAR } from "./concha";
import { manga as dibujarManga } from "./manga";
import { leerBitacora, type Vuelo } from "../flight/bitacora";
import { plano } from "./hangar";
import { SCENARIOS } from "../world/scenarios";

/**
 * Alto del lienzo de la manga en el cuaderno.
 *
 * Dos más que en el HUD, que es aire por debajo del puño: aquí la manga se
 * mira de cerca y pegada al borde queda apretada.
 */
const CUADERNO_ALTO = 34;

/**
 * Cuántos vuelos se enseñan.
 *
 * Seis. La bitácora guarda sesenta —ver `CUANTOS_VUELOS`— y pintarlos todos
 * haría de esta página una lista para leer, que es justo lo contrario de lo
 * que es: una cosa que se le enseña a alguien. Seis caben en dos filas sin
 * desplazar la página en una tablet, y son los que uno recuerda.
 */
const CUANTOS_SE_VEN = 6;

/** La duración de un vuelo, en minutos, que es como se cuenta uno corto. */
function duracionDe(segundos: number): string {
  const m = Math.round(segundos / 60);
  return m < 60 ? `${m}′` : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * La tarjeta de un vuelo.
 *
 * **Sin una sola palabra obligatoria.** El dibujo dice dónde y por dónde; la
 * cifra, cuánto duró; y las rayitas, qué galones salieron de ahí. Quien no lee
 * reconoce su vuelo por la forma de la raya —un circuito es un óvalo, una ida
 * y vuelta es un palo— y eso es lo que hace que quiera enseñarlo.
 *
 * La fecha va en el `title` y no pintada: es el único dato de los cuatro que
 * no le dice nada a quien no lee, y ocuparía el sitio del que sí.
 */
function tarjetaDeVuelo(v: Vuelo): string {
  const esc = SCENARIOS.find((e) => e.id === v.escenario);
  if (!esc) return "";
  const cuando = new Date(v.fecha);
  return `
    <li class="bitacora__vuelo" title="${cuando.toLocaleDateString()}">
      <div class="bitacora__plano">${plano(esc, esc.size, v.traza)}</div>
      <div class="bitacora__pie">
        <span class="bitacora__duracion">${duracionDe(v.segundos)}</span>
        ${
          v.galones.length
            ? `<span class="bitacora__galones" aria-hidden="true">${"▮".repeat(
                Math.min(4, v.galones.length),
              )}</span>`
            : ""
        }
      </div>
    </li>`;
}

export class CuadernoScreen {
  private readonly root: HTMLElement;
  /** Foco atrapado y Escape que cierra desde donde sea. Ver `ui/panel.ts`. */
  private readonly panel: Panel;
  private cuaderno: Cuaderno;

  constructor(root: HTMLElement, cuaderno: Cuaderno) {
    this.root = root;
    this.cuaderno = cuaderno;
    this.panel = new Panel(root, () => this.hide());
    this.pintar();
    root.addEventListener("click", (e) => {
      if (e.target === root) this.hide();
      /*
       * **Y el de cerrar se llama `data-accion="cerrar"`, como en todos.**
       *
       * Esto miraba `data-cerrar`, que es una de las cuatro maneras que había
       * antes de que los paneles tuvieran una anatomía común. El botón se
       * dibuja desde entonces con la nueva —hay hasta una prueba que lo
       * exige— así que aquí quedó escuchando un atributo que ya no existe: el
       * clic sonaba, porque suena al pulsar cualquier cosa, y el panel no se
       * cerraba. Contado jugando: «el botón naranja cerrar no cierra, pero sí
       * se oye una notificación; hay que hacer clic por fuera para salir».
       *
       * Y con `closest`, no con `e.target`: lo que se pulsa puede ser el texto
       * de dentro del botón, y entonces el `target` es el texto y no el botón.
       * Es la misma forma que ya usan los otros paneles. Ver `concha.ts`.
       */
      if ((e.target as HTMLElement)?.closest?.('[data-accion="cerrar"]'))
        this.hide();
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
    this.root.innerHTML = armarPanel({
      titulo: t("cuaderno.title"),
      panel: "cuaderno",
      clase: "cuaderno__panel",
      acciones: [CERRAR()],
      cuerpo: `
        <div class="cuaderno__manga">${dibujarManga(barrasDe(g), CUADERNO_ALTO, t("galon.manga"))}</div>
        <h3 class="cuaderno__grado">${t(`grado.${g}` as never)}</h3>
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
        ${this.losVuelos()}
      `,
    });
  }

  /**
   * Los últimos vuelos, si hay alguno.
   *
   * Con la bitácora vacía no se pinta un hueco ni un «todavía no has volado»:
   * simplemente no está. Una sección vacía en la página que uno enseña es
   * peor que ninguna — dice que falta algo.
   */
  private losVuelos(): string {
    const vuelos = leerBitacora().slice(0, CUANTOS_SE_VEN);
    if (!vuelos.length) return "";
    return `
      <h3 class="cuaderno__grado cuaderno__grado--vuelos">${t("cuaderno.vuelos")}</h3>
      <ul class="bitacora">${vuelos.map(tarjetaDeVuelo).join("")}</ul>`;
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
    this.panel.abrir();
  }

  hide(): void {
    this.panel.cerrar();
  }
}

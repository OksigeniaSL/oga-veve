/**
 * Lo que hace que un panel encima del vuelo sea de verdad un panel.
 *
 * Los tres —créditos, teclas y cuaderno— se declaran `aria-modal="true"`, que
 * es una promesa concreta: **lo de detrás no existe mientras esto está
 * abierto**. Un lector de pantalla se la cree y deja de anunciar el HUD.
 *
 * Medido con `scripts/verificar-acceso.mjs`, el teclado hacía otra cosa: seis
 * tabuladores dentro de los créditos y el foco estaba en el botón del sonido,
 * detrás del panel, invisible bajo el velo. Quien navega así acaba pulsando
 * mandos del vuelo creyendo que sigue leyendo los créditos —criterio 2.4.3—.
 *
 * Y Escape solo cerraba si el foco seguía dentro, porque el oyente colgaba de
 * la caja del panel. En cuanto el tabulador se escapaba —o sea, casi siempre—
 * la única salida era el ratón. Criterio 2.1.2: si se entra con el teclado, se
 * tiene que poder salir con el teclado.
 *
 * Esto arregla las dos cosas en un sitio, porque eran el mismo fallo escrito
 * tres veces.
 */

/** Lo que se puede enfocar dentro de un panel, en el orden en que se tabula. */
const ENFOCABLES =
  // `summary` va en la lista y no es un detalle: es el que abre «cambiar las
  // teclas», y sin él el encierro saltaba por encima y esa pantalla no se
  // podía abrir con el teclado.
  'button, summary, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * A quién le toca el foco, dando la vuelta por los extremos.
 *
 * Está aparte y sin tocar el DOM porque es la única parte de esto que se puede
 * comprobar sin navegador: lo demás es enfocar y escuchar.
 *
 * Devuelve `null` cuando el foco ya está en medio de la lista y el navegador
 * puede seguir solo. Solo hace falta intervenir **en los extremos**, que es
 * donde el tabulador se saldría del panel.
 */
export function aQuienLeToca<T>(
  enfocables: readonly T[],
  actual: T | null,
  haciaAtras: boolean,
): T | null {
  if (enfocables.length === 0) return null;
  const primero = enfocables[0]!;
  const ultimo = enfocables[enfocables.length - 1]!;
  const donde = actual === null ? -1 : enfocables.indexOf(actual);
  // Fuera de la lista: el foco ya se había escapado, así que vuelve a entrar.
  if (donde < 0) return haciaAtras ? ultimo : primero;
  if (haciaAtras && actual === primero) return ultimo;
  if (!haciaAtras && actual === ultimo) return primero;
  return null;
}

/**
 * Mantiene el foco dentro de un panel mientras está abierto.
 *
 * Se abre y se suelta con el panel. Escucha en `window` y no en la caja del
 * panel a propósito: si el foco se ha escapado —y el objetivo es que no, pero
 * un fallo nuestro no puede dejar a nadie encerrado— Escape tiene que seguir
 * funcionando.
 */
/**
 * La pila de paneles abiertos, y por qué hace falta.
 *
 * Los ajustes se abren **encima** del menú de pausa, así que hay dos paneles
 * abiertos a la vez y los dos escuchan el teclado en `window`. Sin pila
 * ganaba el que se hubiera registrado antes: Escape cerraba el menú de pausa
 * de debajo y dejaba los ajustes flotando sobre el vuelo. Medido con el
 * banco.
 *
 * Con pila, solo manda el de arriba —el último que se abrió—, que es lo que
 * espera cualquiera: Escape cierra lo que estás mirando.
 */
const pila: Encierro[] = [];

export class Encierro {
  private readonly root: HTMLElement;
  private readonly cerrar: () => void;
  /**
   * Si Escape lo lleva el encierro.
   *
   * La pantalla de teclas dice que no, y con razón: allí Escape hace **dos
   * cosas** —cancela la captura de una tecla nueva, o cierra— y esa decisión
   * no se puede tomar desde aquí. El tabulador sí lo lleva el encierro.
   */
  private readonly conEscape: boolean;
  private previo: HTMLElement | null = null;
  private puesto = false;

  constructor(root: HTMLElement, cerrar: () => void, conEscape = true) {
    this.root = root;
    this.cerrar = cerrar;
    this.conEscape = conEscape;
  }

  /** Guarda dónde estaba el foco, lo mete dentro y monta la vigilancia. */
  abrir(): void {
    this.previo = document.activeElement as HTMLElement | null;
    if (!this.puesto) {
      window.addEventListener("keydown", this.alPulsar, true);
      this.puesto = true;
    }
    // El último que se abre es el que manda. Ver `pila`.
    const donde = pila.indexOf(this);
    if (donde >= 0) pila.splice(donde, 1);
    pila.push(this);
    this.enfocarElPrimero();
  }

  /** Desmonta la vigilancia y devuelve el foco a donde estaba: criterio 2.4.3. */
  soltar(): void {
    const donde = pila.indexOf(this);
    if (donde >= 0) pila.splice(donde, 1);
    if (this.puesto) {
      window.removeEventListener("keydown", this.alPulsar, true);
      this.puesto = false;
    }
    this.previo?.focus?.();
    this.previo = null;
  }

  private enfocarElPrimero(): void {
    const dentro = this.dentro();
    (dentro[0] ?? this.root).focus?.();
  }

  private dentro(): HTMLElement[] {
    return [...this.root.querySelectorAll<HTMLElement>(ENFOCABLES)].filter(
      (e) => !e.hasAttribute("disabled") && e.offsetParent !== null,
    );
  }

  private alPulsar = (e: KeyboardEvent): void => {
    if (this.root.hidden) return;
    // Y si hay otro panel encima, manda él. Ver `pila`.
    if (pila[pila.length - 1] !== this) return;
    /*
     * Si el panel ya se ha ocupado de esta tecla, aquí no se toca.
     *
     * Es lo que deja asignar el tabulador como mando en la pantalla de
     * teclas: quien captura la tecla la marca como atendida, y el encierro
     * no le mueve el foco por debajo.
     */
    if (e.defaultPrevented) return;
    if (this.conEscape && e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      this.cerrar();
      return;
    }
    if (e.key !== "Tab") return;
    const enfocables = this.dentro();
    const actual = document.activeElement as HTMLElement | null;
    const toca = aQuienLeToca(enfocables, actual, e.shiftKey);
    if (!toca) return;
    e.preventDefault();
    toca.focus();
  };
}

/**
 * Un panel que se abre encima del vuelo.
 *
 * El encierro de arriba resuelve el foco y Escape, pero hay que acordarse de
 * montarlo — y **dos no se acordaron**: el plano y el tiempo se abrían y se
 * cerraban a mano, sin `role="dialog"`, sin atrapar el tabulador y sin
 * Escape. No es una teoría: es lo que midió `verificar-acceso` el día que se
 * le enseñaron, porque antes ni siquiera los abría — que es la peor forma de
 * pasar.
 *
 * El hangar y la pantalla de pilotos no entran aquí y no es un olvido: son
 * pantallas **de entrada**, no paneles encima del vuelo. Ahí Escape no tiene a
 * dónde volver y `dialog` diría algo que no es.
 *
 * Lo que se medía en el plano, abierto:
 *
 * - el tabulador se iba **detrás del velo** a los mandos del vuelo: al gas, al
 *   hangar, a los créditos;
 * - y Escape no lo cerraba. Peor: la tecla llegaba al juego, que la usa para
 *   la pausa, así que salía el menú de pausa **encima** del plano abierto.
 *
 * Así que la caja y el encierro van juntos. Abrir es enseñar y encerrar;
 * cerrar es esconder y soltar. Quien quiera un panel nuevo hereda las dos
 * cosas sin tener que acordarse de ninguna. Ver #70.
 */
export class Panel {
  private readonly caja: HTMLElement;
  private readonly encierro: Encierro;

  constructor(caja: HTMLElement, cerrar: () => void, conEscape = true) {
    this.caja = caja;
    /*
     * Se declara aquí y no en la plantilla de cada panel a propósito: es la
     * promesa que hace el encierro —«lo de detrás no existe»— y las dos tienen
     * que ir siempre juntas, o el lector de pantalla dice una cosa y el
     * teclado hace otra.
     */
    caja.setAttribute("role", "dialog");
    caja.setAttribute("aria-modal", "true");
    this.encierro = new Encierro(caja, cerrar, conEscape);
  }

  get abierto(): boolean {
    return !this.caja.hidden;
  }

  abrir(): void {
    if (this.abierto) return;
    this.caja.hidden = false;
    this.encierro.abrir();
  }

  cerrar(): void {
    if (!this.abierto) return;
    this.caja.hidden = true;
    this.encierro.soltar();
  }

  alternar(): void {
    if (this.abierto) this.cerrar();
    else this.abrir();
  }
}

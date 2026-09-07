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
    this.enfocarElPrimero();
  }

  /** Desmonta la vigilancia y devuelve el foco a donde estaba: criterio 2.4.3. */
  soltar(): void {
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

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
/**
 * Todos los paneles que existen, y a quién avisar cuando alguno se abre.
 *
 * Es lo que hace cumplible la tercera exigencia de #70: «un panel abierto
 * pausa el vuelo o lo deja en vuelo recto; nunca se cae el avión mientras
 * alguien está eligiendo gorra». Eso no se puede resolver panel a panel —son
 * ocho sitios y el octavo se olvida—, así que lo resuelve la clase: quien abre
 * cualquier panel congela el vuelo sin saber que lo hace.
 *
 * Se **recuenta** en vez de llevar un contador que sube y baja. Un contador
 * se descuadra en cuanto alguien esconde una caja por su cuenta —el banco de
 * accesibilidad lo hace, para poder medir el panel siguiente— y un contador
 * descuadrado deja el vuelo congelado para siempre. Recontar mirando quién
 * está abierto no se puede descuadrar.
 */
const todos = new Set<Panel>();
let habia = false;

/**
 * Lo que la concha necesita del juego, y es lo único que necesita.
 *
 * Son dos cosas y las dos son suyas: enterarse de que hay algo abierto —para
 * congelar el vuelo— y poder sonar. Van juntas en una interfaz en vez de en
 * dos funciones sueltas porque las cumple el mismo —`Game`— y así no se puede
 * montar media concha.
 */
export interface LaConcha {
  /** Hay algún panel abierto, o ya no hay ninguno. */
  alAbrirseOCerrarse(hayAlguno: boolean): void;
  /** Acusa recibo de lo que acaba de hacer quien está delante. */
  suena(que: SonidoDeConcha): void;
}

/**
 * Lo que suena la concha, y por qué son cuatro y no uno.
 *
 * #70 los pide por su nombre —«sonido al abrir, al moverse por las opciones y
 * al confirmar»— y son lo que separa un menú de consola de un formulario. Para
 * quien no lee son más que un adorno: con el dedo o con el tabulador, el
 * sonido es la única confirmación de que el aparato se ha enterado.
 */
export type SonidoDeConcha = "abrir" | "cerrar" | "mover" | "elegir";

let concha: LaConcha | null = null;

/** Quién lleva la concha. Lo monta `Game`. */
export function laConchaLaLleva(quien: LaConcha): void {
  concha = quien;
  habia = false;
  recontar();
}

function recontar(): void {
  const hay = [...todos].some((p) => p.abierto);
  if (hay === habia) return;
  habia = hay;
  concha?.alAbrirseOCerrarse(hay);
}

export class Panel {
  private readonly caja: HTMLElement;
  private readonly encierro: Encierro;

  constructor(caja: HTMLElement, cerrar: () => void, conEscape = true) {
    this.caja = caja;
    /*
     * La promesa que hace el encierro —«lo de detrás no existe»— se declara
     * junto a él, o el lector de pantalla dice una cosa y el teclado hace
     * otra.
     *
     * Salvo que el panel ya la traiga puesta más adentro, que es lo normal:
     * casi todos son un velo a pantalla completa con la caja de verdad
     * dentro, y el diálogo es la caja, no el velo. Poner otro fuera anidaría
     * dos diálogos, que es decir dos veces lo mismo y peor.
     */
    if (!caja.querySelector('[role="dialog"]')) {
      caja.setAttribute("role", "dialog");
      caja.setAttribute("aria-modal", "true");
    }
    this.encierro = new Encierro(caja, cerrar, conEscape);
    todos.add(this);
    /*
     * **Y suena al recorrerlo y al elegir.**
     *
     * Se escucha aquí, en la caja, y no panel por panel: son ocho paneles con
     * sus botones, sus tiradores y sus casillas, y ponerle el sonido a cada
     * uno son ocho sitios que mantener y el noveno que se olvida. `focusin` y
     * `click` suben desde cualquier cosa de dentro, así que un panel nuevo
     * suena sin escribir una línea.
     *
     * `focusin` y no `focus` porque `focus` no burbujea: colgado de la caja no
     * llegaría nunca.
     */
    caja.addEventListener("focusin", () => {
      // Menos el primero, que es el que coloca el foco al abrir: ya sonó
      // `abrir`, y dos motivos pegados suenan a error.
      if (this.recienAbierto) {
        this.recienAbierto = false;
        return;
      }
      concha?.suena("mover");
    });
    caja.addEventListener("click", (e) => {
      const que = (e.target as HTMLElement | null)?.closest?.(
        "button, summary, input, select",
      );
      if (!que) return;
      /*
       * Y si lo que se pulsó cerraba el panel, lo que suena es el cierre y no
       * la elección: son el mismo gesto contado dos veces. Se mira **después**
       * de que el clic haya hecho lo suyo, que es la única forma de saberlo.
       */
      setTimeout(() => {
        if (this.abierto) concha?.suena("elegir");
      }, 0);
    });
  }

  /** Si el foco todavía no se ha movido desde que se abrió. */
  private recienAbierto = false;

  get abierto(): boolean {
    return !this.caja.hidden;
  }

  abrir(): void {
    if (this.abierto) return;
    this.recienAbierto = true;
    this.caja.hidden = false;
    this.encierro.abrir();
    concha?.suena("abrir");
    recontar();
  }

  cerrar(): void {
    if (!this.abierto) return;
    this.caja.hidden = true;
    this.encierro.soltar();
    concha?.suena("cerrar");
    recontar();
  }

  alternar(): void {
    if (this.abierto) this.cerrar();
    else this.abrir();
  }
}

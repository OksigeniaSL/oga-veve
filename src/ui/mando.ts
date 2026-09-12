/**
 * Recorrer un panel **con el mando**, sin soltarlo.
 *
 * #70 lo pide con un motivo concreto: «quien vuela con joystick no debería
 * tener que soltarlo para elegir una misión». Y hay un motivo más, que el
 * issue no dice porque se da por supuesto: el mando es el aparato de quien
 * juega en el salón, en una tele, a dos metros. Ahí no hay ratón ni teclado, y
 * un menú que solo se recorre con el dedo es un menú al que no se llega.
 *
 * Lo que hace es mover el foco del navegador, no inventarse una selección
 * propia. Así el mando, el tabulador, las flechas y el dedo recorren **lo
 * mismo**, y todo lo que ya está resuelto —el aro del foco, el orden, lo que
 * anuncia el lector de pantalla— vale igual para los cuatro. Un menú con su
 * propio cursor, paralelo al foco, sería dos menús que se contradicen.
 *
 * ## Los botones, y por qué esos
 *
 * La cruceta y la palanca izquierda mueven; el botón de abajo elige; el de la
 * derecha vuelve. Es la disposición de cualquier consola desde hace treinta
 * años, y lo importante no es cuál es sino que **no se enseña**: quien coge un
 * mando ya la sabe.
 *
 * ## Y repite si se mantiene
 *
 * Un paso por pulsación deja una lista de veinte teclas —la pantalla de
 * mandos tiene veintiséis— a veintiséis pulsaciones. Se mantiene y anda, con
 * una espera antes del segundo paso para que sostener no sea desbordar.
 */

/** El botón de abajo: elegir. En un mando de los de siempre, la A. */
const ELEGIR = 0;
/** El de la derecha: volver. La B. */
const VOLVER = 1;
/** La cruceta: arriba, abajo, izquierda, derecha. */
const CRUZ = { arriba: 12, abajo: 13, izquierda: 14, derecha: 15 } as const;
/** Cuánto hay que empujar la palanca para que cuente como un paso. */
const EMPUJON = 0.6;

/** Lo que tarda en repetir el primer paso, en segundos. */
export const ANTES_DE_REPETIR = 0.4;
/** Y cada cuánto repite a partir de ahí. */
export const CADA_CUANTO_REPITE = 0.14;

/**
 * Si un mando que se mantiene pulsado tiene que dar otro paso.
 *
 * Aparte y pura porque es la única parte de esto que se puede comprobar sin
 * un mando enchufado, y porque es donde está el único número que se nota al
 * usarlo: si repite demasiado pronto, sostener medio segundo se lleva media
 * lista por delante.
 *
 * @param sostenido cuánto lleva pulsado, en segundos
 * @param pasosDados cuántos pasos ha dado ya esta pulsación
 */
export function tocaOtroPaso(sostenido: number, pasosDados: number): boolean {
  // El primero va al pulsar, sin esperar nada: lo contrario es un mando lento.
  if (pasosDados === 0) return true;
  return sostenido >= ANTES_DE_REPETIR + (pasosDados - 1) * CADA_CUANTO_REPITE;
}

/** Lo que se le puede pedir a un panel desde el mando. */
export interface Navegable {
  /** Lo que se puede enfocar dentro, en el orden en que se recorre. */
  mandos(): HTMLElement[];
  /** Cerrarlo, que es lo que hace el botón de volver. */
  cerrar(): void;
}

/** Cada una de las cuatro cosas que el mando puede pedir. */
export type Peticion = "siguiente" | "anterior" | "elegir" | "volver";

const TODAS: readonly Peticion[] = [
  "siguiente",
  "anterior",
  "elegir",
  "volver",
];

/** Qué se está pidiendo ahora mismo, mirando un mando de verdad. */
export function loQueSePide(pad: Gamepad): Record<Peticion, boolean> {
  const boton = (i: number): boolean => pad.buttons[i]?.pressed ?? false;
  const eje = pad.axes[1] ?? 0;
  return {
    siguiente: boton(CRUZ.abajo) || boton(CRUZ.derecha) || eje > EMPUJON,
    anterior: boton(CRUZ.arriba) || boton(CRUZ.izquierda) || eje < -EMPUJON,
    elegir: boton(ELEGIR),
    volver: boton(VOLVER),
  };
}

/**
 * A quién le toca el foco al dar un paso, dando la vuelta por los extremos.
 *
 * Es pariente de `aQuienLeToca` de `panel.ts` y no la misma: aquella devuelve
 * `null` en medio de la lista, porque ahí el tabulador sabe seguir solo. El
 * mando no: aquí no hay navegador que mueva nada, así que siempre hay
 * respuesta.
 */
export function elDeAlLado<T>(
  enfocables: readonly T[],
  actual: T | null,
  haciaAtras: boolean,
): T | null {
  if (enfocables.length === 0) return null;
  const donde = actual === null ? -1 : enfocables.indexOf(actual);
  // Fuera de la lista: el foco se había escapado, así que vuelve a entrar por
  // el extremo que toca.
  if (donde < 0)
    return haciaAtras ? enfocables[enfocables.length - 1]! : enfocables[0]!;
  const paso = haciaAtras ? -1 : 1;
  const n = enfocables.length;
  return enfocables[(donde + paso + n) % n]!;
}

/**
 * Vigila el mando mientras haya un panel abierto.
 *
 * Se le pasa el panel de arriba, o `null` cuando ya no hay ninguno. Monta su
 * propio bucle y no el del juego a propósito: con un panel abierto el vuelo
 * está **congelado** y su bucle parado, que es justo cuando esto hace falta.
 */
export class VigilanteDelMando {
  private panel: Navegable | null = null;
  private cuadro: number | null = null;
  /** Desde cuándo se sostiene cada cosa, y cuántos pasos lleva dados. */
  private sostenidas = new Map<Peticion, { desde: number; pasos: number }>();

  atiendeA(panel: Navegable | null): void {
    this.panel = panel;
    this.sostenidas.clear();
    if (panel) this.arrancar();
    else this.parar();
  }

  private arrancar(): void {
    if (this.cuadro !== null) return;
    const paso = (t: number): void => {
      this.cuadro = requestAnimationFrame(paso);
      this.mirar(t / 1000);
    };
    this.cuadro = requestAnimationFrame(paso);
  }

  private parar(): void {
    if (this.cuadro === null) return;
    cancelAnimationFrame(this.cuadro);
    this.cuadro = null;
  }

  private mirar(ahora: number): void {
    const panel = this.panel;
    if (!panel) return;
    const pads = navigator.getGamepads?.() ?? [];
    const pad = Array.from(pads).find(
      (p): p is Gamepad => p !== null && p.connected,
    );
    if (!pad) {
      this.sostenidas.clear();
      return;
    }
    const pide = loQueSePide(pad);
    for (const que of TODAS) {
      if (!pide[que]) {
        this.sostenidas.delete(que);
        continue;
      }
      const lleva = this.sostenidas.get(que) ?? { desde: ahora, pasos: 0 };
      if (!tocaOtroPaso(ahora - lleva.desde, lleva.pasos)) {
        this.sostenidas.set(que, lleva);
        continue;
      }
      this.sostenidas.set(que, { desde: lleva.desde, pasos: lleva.pasos + 1 });
      this.hacer(que, panel, lleva.pasos);
    }
  }

  private hacer(que: Peticion, panel: Navegable, pasosDados: number): void {
    // Elegir y volver no se repiten sosteniendo: una pulsación, una vez. Un
    // botón de elegir que se repite manda el mismo mando veinte veces.
    if ((que === "elegir" || que === "volver") && pasosDados > 0) return;
    if (que === "volver") return panel.cerrar();
    if (que === "elegir") {
      (document.activeElement as HTMLElement | null)?.click?.();
      return;
    }
    const mandos = panel.mandos();
    const actual = document.activeElement as HTMLElement | null;
    elDeAlLado(
      mandos,
      mandos.includes(actual!) ? actual : null,
      que === "anterior",
    )?.focus();
  }
}

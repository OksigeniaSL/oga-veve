/**
 * **Un toque en una pieza del cuadro abre su explicación**, sin quitarle el
 * dedo a nadie.
 *
 * El cuadro plano deja pasar el dedo al mundo —`pointer-events: none` en
 * `.cuadro`—, y es a propósito: encima de él se arrastra para mirar alrededor,
 * y en la cabina se tocan los mandos dibujados. Si las piezas del cuadro se
 * quedaran con el dedo para explicarse, arrastrar empezando encima de la
 * altitud dejaría de girar la cabeza. Así que aquí no se le quita el dedo a
 * nadie: **se escucha en la ventana, sin capturar ni cancelar nada**, y solo
 * cuando el gesto fue un toque —sin moverse y corto— se mira qué pieza había
 * debajo.
 *
 * - **Encima del mundo** —el dedo cayó en el lienzo, a través del cuadro—, se
 *   busca la pieza por su caja en la pantalla: la más pequeña que contenga el
 *   punto, que es la más concreta. El rombo del tráfico gana a la pantalla de
 *   navegación que lo lleva dentro.
 * - **Encima de algo que recoge el dedo** —las losas del teléfono, la pantalla
 *   grande—, la pieza es la que está debajo del dedo, y quien tenía otra cosa
 *   que hacer con ese toque la deja pasar con `[data-explica]` en su `salvo`.
 *   Ver `alPulsarDentro` en `pulsar.ts`.
 * - **Encima de un mando** —un botón, la palanca, el gas, la rueda de la
 *   ventanilla ALT—, nada. Los mandos del vuelo y los botones del HUD son
 *   suyos.
 *
 * Y los símbolos pequeños se tocan con el dedo y no con la punta de un lápiz:
 * un rombo de diez píxeles se busca como si midiera `DEDO`.
 */

import { abrirExplicacion } from "./explicaciones";

/** Lo que se mueve un dedo antes de dejar de ser un toque, px. Como `dedo-que-mira`. */
const UMBRAL = 10;
/** Y lo que dura como mucho, ms: apoyarse a mirar no es tocar. */
const TOQUE = 700;
/**
 * Lo que mide como poco una pieza para el dedo, px de pantalla. Cuarenta y
 * cuatro es lo que pide cualquier guía de tacto, y el rombo del TCAS mide
 * diez en un portátil y seis en un teléfono.
 */
const DEDO = 44;
/** Y para el ratón, que apunta mejor. */
const PUNTERO = 18;

/** Lo que es un mando: el toque es suyo. */
const MANDO =
  "button:not([data-explica]), a, input, select, textarea, summary, " +
  "[data-mcp-rueda], [data-mcp-alt], [role='button'], [role='slider']";

interface Bajada {
  readonly x: number;
  readonly y: number;
  readonly cuando: number;
}

/**
 * La pieza con explicación que hay en ese punto de la pantalla, por su caja,
 * o `null`. Aparte para que se entienda: es la parte que decide.
 */
export function piezaEn(
  piezas: Iterable<Element>,
  x: number,
  y: number,
  margen: number,
): Element | null {
  let mejor: Element | null = null;
  let area = Infinity;
  for (const el of piezas) {
    if (!seVe(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    // Lo pequeño, del tamaño del dedo, centrado donde está.
    const w = Math.max(r.width, margen);
    const h = Math.max(r.height, margen);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    if (Math.abs(x - cx) > w / 2 || Math.abs(y - cy) > h / 2) continue;
    const a = r.width * r.height;
    if (a < area) {
      area = a;
      mejor = el;
    }
  }
  return mejor;
}

/**
 * Si la pieza se ve de verdad: ni escondida por su `visibility` —que en SVG
 * deja la caja puesta—, ni dentro del cuadro recogido, que está recortado
 * fuera de la pantalla salvo el asa.
 */
function seVe(el: Element): boolean {
  if (el.closest(".cuadro--bajado")) return false;
  try {
    return getComputedStyle(el).visibility !== "hidden";
  } catch {
    return true;
  }
}

/**
 * **Pone a escuchar los toques.** `raiz` es donde viven las piezas: el HUD.
 * Devuelve con qué dejar de escuchar.
 */
export function escucharLosToquesQueExplican(raiz: HTMLElement): () => void {
  const bajadas = new Map<number, Bajada>();

  const abajo = (e: PointerEvent): void => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    bajadas.set(e.pointerId, { x: e.clientX, y: e.clientY, cuando: performance.now() });
  };

  const arriba = (e: PointerEvent): void => {
    const b = bajadas.get(e.pointerId);
    bajadas.delete(e.pointerId);
    if (!b) return;
    if (Math.hypot(e.clientX - b.x, e.clientY - b.y) > UMBRAL) return;
    if (performance.now() - b.cuando > TOQUE) return;
    const id = queSeExplica(e);
    if (id) abrirExplicacion(id);
  };

  const queSeExplica = (e: PointerEvent): string | null => {
    const donde = e.target instanceof Element ? e.target : null;
    if (!donde) return null;
    // Lo que tiene debajo el dedo, si recoge toques y lleva explicación.
    const directa = donde.closest("[data-explica]");
    if (directa && raiz.contains(directa) && seVe(directa))
      return directa.getAttribute("data-explica");
    if (donde.closest(MANDO)) return null;
    /*
     * **Y a través del cuadro**, solo si el dedo cayó en el mundo: el lienzo.
     * Encima de cualquier otra cosa —un panel, la barra de arriba, la
     * palanca— el toque es de esa cosa.
     */
    if (!(donde instanceof HTMLCanvasElement)) return null;
    const margen = e.pointerType === "mouse" ? PUNTERO : DEDO;
    const pieza = piezaEn(
      raiz.querySelectorAll(".cuadro [data-explica]"),
      e.clientX,
      e.clientY,
      margen,
    );
    return pieza?.getAttribute("data-explica") ?? null;
  };

  const perdido = (e: PointerEvent): void => {
    bajadas.delete(e.pointerId);
  };

  /*
   * En captura y pasivo: se oye antes que nadie y no se toca nada. Si un
   * mando se queda el dedo con `setPointerCapture`, el `pointerup` llega
   * igual a la ventana, con el mando de destino, y `MANDO` lo descarta.
   */
  const opciones = { capture: true, passive: true } as const;
  window.addEventListener("pointerdown", abajo, opciones);
  window.addEventListener("pointerup", arriba, opciones);
  window.addEventListener("pointercancel", perdido, opciones);
  return () => {
    window.removeEventListener("pointerdown", abajo, opciones);
    window.removeEventListener("pointerup", arriba, opciones);
    window.removeEventListener("pointercancel", perdido, opciones);
  };
}

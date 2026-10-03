/**
 * **Un botón que responde a su propio dedo**, aunque otro dedo esté llevando
 * la palanca.
 *
 * Contado con el teléfono en las dos manos: «tocar los flaps o el tren
 * obliga a soltar el joystick, no se puede hacer si el joystick está siendo
 * usado, así que no se puede manipular con dos manos». Los botones escuchaban
 * `click`, y el navegador no da un `click` a un segundo dedo: con uno ya
 * apoyado, el toque del otro lo toma por un gesto de dos dedos —pellizcar,
 * hacer zoom— y el clic no llega nunca. Con el pulgar en la palanca, los
 * flaps no bajaban.
 *
 * Lo que sí llega siempre es lo de cada dedo por separado: `pointerdown` y
 * `pointerup`, con su número de dedo. Así que aquí se apunta qué dedo bajó en
 * qué botón y **el botón se pulsa cuando ese mismo dedo se levanta encima de
 * él** — como el freno, al que ya se le enseñó lo mismo: solo lo suelta el
 * dedo que lo pisó. Al soltar y no al apretar, que es como va cualquier
 * botón: apretando se puede rectificar arrastrando el dedo fuera.
 *
 * El `click` de siempre se sigue escuchando, para lo que no es un dedo ni un
 * ratón —la tecla Intro o el espacio con el botón enfocado, y los bancos que
 * llaman a `click()`—, y se descarta el que llega detrás de una pulsación ya
 * atendida, para no pulsar dos veces.
 */

interface Pulsacion {
  readonly boton: Element;
  readonly accion: () => void;
  readonly caja: DOMRect;
}

/** Los dedos que están encima de un botón, por su número. */
const pulsando = new Map<number, Pulsacion>();
/** El último botón pulsado por dedo, y cuándo: su `click` ya está atendido. */
let atendido: { boton: Element; cuando: number } | null = null;

/** Lo que tarda como mucho el `click` en llegar detrás del `pointerup`, ms. */
const LLEGA_EL_CLICK = 800;
/** Lo que se perdona al levantar el dedo justo en el borde del botón, px. */
const HOLGURA = 8;

let escuchando = false;

function escucharLaVentana(): void {
  if (escuchando || typeof window === "undefined") return;
  escuchando = true;
  window.addEventListener(
    "pointerup",
    (e) => {
      const p = pulsando.get(e.pointerId);
      if (!p) return;
      pulsando.delete(e.pointerId);
      const c = p.caja;
      const dentro =
        e.clientX >= c.left - HOLGURA &&
        e.clientX <= c.right + HOLGURA &&
        e.clientY >= c.top - HOLGURA &&
        e.clientY <= c.bottom + HOLGURA;
      if (!dentro) return;
      atendido = { boton: p.boton, cuando: performance.now() };
      p.accion();
    },
    true,
  );
  window.addEventListener(
    "pointercancel",
    (e) => {
      pulsando.delete(e.pointerId);
    },
    true,
  );
}

function apuntar(e: PointerEvent, boton: Element, accion: () => void): void {
  // Con el ratón, solo el botón de la izquierda: el derecho abre su menú.
  if (e.pointerType === "mouse" && e.button !== 0) return;
  pulsando.set(e.pointerId, { boton, accion, caja: boton.getBoundingClientRect() });
}

function yaAtendido(boton: Element): boolean {
  const a = atendido;
  if (!a || a.boton !== boton) return false;
  atendido = null;
  return performance.now() - a.cuando < LLEGA_EL_CLICK;
}

/** **Pulsar este botón con su propio dedo.** Ver la cabecera. */
export function alPulsar(boton: HTMLElement, accion: () => void): void {
  escucharLaVentana();
  boton.addEventListener("pointerdown", (e) => apuntar(e, boton, accion));
  boton.addEventListener("click", () => {
    if (!yaAtendido(boton)) accion();
  });
}

/**
 * **Lo mismo, por delegación**: para botones que se rehacen al repintar, en
 * los que la escucha tiene que vivir en algo que no se rehace. `accion`
 * recibe el elemento que casa con `selector`.
 *
 * `salvo` deja fuera lo que, estando dentro del botón, es otro mando: la
 * ventanilla ALT dentro de su losa del teléfono es una rueda, y girarla no es
 * pedir la pantalla grande.
 */
export function alPulsarDentro(
  raiz: HTMLElement,
  selector: string,
  accion: (boton: Element) => void,
  salvo?: string,
): void {
  escucharLaVentana();
  const elBoton = (e: Event): Element | null => {
    const donde = e.target as Element | null;
    if (salvo && donde?.closest?.(salvo)) return null;
    const boton = donde?.closest?.(selector) ?? null;
    return boton && raiz.contains(boton) ? boton : null;
  };
  raiz.addEventListener("pointerdown", (e) => {
    const boton = elBoton(e);
    if (boton) apuntar(e, boton, () => accion(boton));
  });
  raiz.addEventListener("click", (e) => {
    const boton = elBoton(e);
    if (boton && !yaAtendido(boton)) accion(boton);
  });
}

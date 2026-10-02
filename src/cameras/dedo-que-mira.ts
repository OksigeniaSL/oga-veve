/**
 * **El dedo que mira**: arrastrar el paisaje sin soltar los mandos.
 *
 * Se escucha en el lienzo y solo en el lienzo. Lo que hay encima —la palanca,
 * el gas, el timón, los botones— recibe sus propios toques, y un toque que cae
 * en uno de ellos nunca llega aquí: el navegador manda cada dedo a lo que tiene
 * debajo, y los mandos se lo quedan con `setPointerCapture`. Así que con el
 * pulgar en la palanca, **el segundo dedo que cae en el paisaje es de la
 * mirada**, y el pulgar sigue volando. Es el contrato con `flight/input.ts`, y
 * cabe en una frase: lo que cae en el lienzo es de la mirada; lo que cae en un
 * mando, del mando. Si algún día un mando quiere quedarse con un dedo que cae
 * en el lienzo —una palanca que aparece donde se pone el pulgar—, lo dice con
 * `preventDefault` en su `pointerdown` y aquí se respeta.
 *
 * Y **tocar no es arrastrar**. En la cabina, un toque en el paisaje puede ser
 * un toque a un mando dibujado —el motor, los flaps—, que se dispara al
 * soltar. Hasta que el dedo no se ha movido `UMBRAL` píxeles es un toque; a
 * partir de ahí es mirar, y al soltar ya no pulsa nada. Sin esto, mirar a la
 * izquierda desde la cabina terminaba apagando el motor si el dedo se
 * levantaba encima de la llave.
 */

/**
 * Cuánto se mueve un dedo antes de que deje de ser un toque, en píxeles.
 *
 * Diez: una yema que se apoya se desliza tres o cuatro sin querer, y un toque
 * con temblor no puede convertirse en un giro de cámara. Diez ya es querer.
 */
export const UMBRAL = 10;

/** Lo que pasa con el dedo, contado a quien lo usa. */
export interface Gestos {
  /** Se arrastró: tantos píxeles a la derecha y hacia abajo. */
  alArrastrar(dx: number, dy: number): void;
  /** Se soltó después de arrastrar. */
  alSoltar(): void;
  /** Fue un toque, sin arrastrar: lo de siempre. */
  alTocar(e: PointerEvent): void;
  /** El ratón pasa por encima sin apretar: para alumbrar los mandos. */
  alPasar?(e: PointerEvent): void;
}

/** Si un desplazamiento ya es arrastrar. Aparte para poder probarlo. */
export function yaEsArrastre(dx: number, dy: number): boolean {
  return dx * dx + dy * dy >= UMBRAL * UMBRAL;
}

/**
 * Pone a escuchar el lienzo. Devuelve con qué dejar de escuchar.
 *
 * Un dedo a la vez: el primero que cae en el paisaje mira y los demás no
 * hacen nada, que dos dedos girando la misma cabeza se pelearían.
 */
export function escucharLaMirada(lienzo: HTMLElement, gestos: Gestos): () => void {
  let activo: number | null = null;
  let desdeX = 0;
  let desdeY = 0;
  let ultimoX = 0;
  let ultimoY = 0;
  let arrastrando = false;

  const abajo = (e: PointerEvent): void => {
    if (e.defaultPrevented || activo !== null) return;
    // Con ratón, solo el botón de siempre: el derecho es del navegador.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    activo = e.pointerId;
    desdeX = ultimoX = e.clientX;
    desdeY = ultimoY = e.clientY;
    arrastrando = false;
    try {
      lienzo.setPointerCapture(e.pointerId);
    } catch {
      // Un puntero que ya no existe: se sigue igual, sin captura.
    }
  };

  const mueve = (e: PointerEvent): void => {
    if (e.pointerId !== activo) {
      if (activo === null) gestos.alPasar?.(e);
      return;
    }
    if (!arrastrando) {
      if (!yaEsArrastre(e.clientX - desdeX, e.clientY - desdeY)) return;
      arrastrando = true;
      // Desde donde cayó el dedo: el paisaje tiene que seguirlo desde ahí,
      // no desde donde se pasó la raya.
      ultimoX = desdeX;
      ultimoY = desdeY;
    }
    gestos.alArrastrar(e.clientX - ultimoX, e.clientY - ultimoY);
    ultimoX = e.clientX;
    ultimoY = e.clientY;
  };

  const arriba = (e: PointerEvent): void => {
    if (e.pointerId !== activo) return;
    activo = null;
    if (arrastrando) gestos.alSoltar();
    else gestos.alTocar(e);
    arrastrando = false;
  };

  /*
   * Un dedo que se pierde —el sistema se lo queda para un gesto suyo, la
   * pestaña se va— no es un toque: no pulsa nada. Pero si estaba mirando, la
   * cabeza tiene que volver igual; si no, se quedaría girada para siempre.
   */
  const perdido = (e: PointerEvent): void => {
    if (e.pointerId !== activo) return;
    activo = null;
    if (arrastrando) gestos.alSoltar();
    arrastrando = false;
  };

  lienzo.addEventListener("pointerdown", abajo);
  lienzo.addEventListener("pointermove", mueve);
  lienzo.addEventListener("pointerup", arriba);
  lienzo.addEventListener("pointercancel", perdido);
  lienzo.addEventListener("lostpointercapture", perdido);
  return () => {
    lienzo.removeEventListener("pointerdown", abajo);
    lienzo.removeEventListener("pointermove", mueve);
    lienzo.removeEventListener("pointerup", arriba);
    lienzo.removeEventListener("pointercancel", perdido);
    lienzo.removeEventListener("lostpointercapture", perdido);
  };
}

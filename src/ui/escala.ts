/**
 * De píxeles de pantalla a píxeles del HUD.
 *
 * En un teléfono apaisado el HUD se dibuja reducido —ver `zoom` en la regla de
 * pantallas bajas de `style.css`—, y eso parte las medidas en dos clases.
 * `getBoundingClientRect` devuelve píxeles **de pantalla**, ya reducidos; las
 * variables CSS que el HUD escribe con esas medidas se aplican **dentro** de
 * la capa reducida, donde vuelven a reducirse. Con una escala de 0,6 la
 * columna de mandos se apartaba el sesenta por ciento de lo que ocupaba el
 * rincón, y la tarjeta de aviso caía encima de los botones de arriba.
 *
 * `offsetWidth` y `offsetHeight` no pasan por aquí: esos ya vienen en los
 * píxeles del propio elemento.
 */
export function aPxDelHud(raiz: Element, pxDePantalla: number): number {
  return pxDePantalla / escalaDe(raiz);
}

/** La escala efectiva con la que se dibuja `raiz`; 1 si no hay ninguna. */
export function escalaDe(raiz: Element): number {
  const z = Number.parseFloat(getComputedStyle(raiz).zoom);
  return Number.isFinite(z) && z > 0 ? z : 1;
}

/**
 * Dónde empieza el rincón de avisos por la izquierda, en píxeles del HUD, o
 * nada si está vacío.
 *
 * Lo usa la lámpara de la torre para centrarse **en el hueco que queda a la
 * izquierda del rincón** y no en la pantalla entera: en una tablet de 1024 o
 * en un teléfono el rincón llega hasta el centro, y la lámpara tapaba la
 * tarjeta de la orden —«hold here» encima de «esperá a la luz»—.
 */
export function escribirRincon(raiz: HTMLElement): void {
  const rincon = raiz.querySelector(".rincon");
  if (!rincon) return;
  const c = rincon.getBoundingClientRect();
  raiz.style.setProperty(
    "--rincon-alto",
    `${Math.round(aPxDelHud(raiz, c.height))}px`,
  );
  if (c.width > 2)
    raiz.style.setProperty(
      "--rincon-izquierda",
      `${Math.round(aPxDelHud(raiz, c.left))}px`,
    );
  else raiz.style.removeProperty("--rincon-izquierda");
}

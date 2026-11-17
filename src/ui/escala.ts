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
  /*
   * **Y lo que ocupa sin la frase de la tarjeta**, para la columna de mandos,
   * que va debajo del rincón donde hay alto. La columna se toca y no se mueve
   * por lo que se lee (ADR 0030, H28f): con la frase más larga de la tarjeta,
   * 234 letras, la columna bajaba hasta detrás del cuadro. Ahora se coloca
   * con la tarjeta en su dibujo; si la frase no cabe, el reparto la recoge
   * (`ui/reparto.ts`).
   */
  const senal = rincon.querySelector<HTMLElement>(".senal");
  let sobra = 0;
  if (senal && !senal.hidden && senal.offsetHeight > 0) {
    const cs = getComputedStyle(senal);
    const px = (v: string): number => Number.parseFloat(v) || 0;
    const sinFrase =
      Math.max(
        ...[".senal__dibujo", ".senal__tecla", ".senal__letra"].map(
          (s) => senal.querySelector<HTMLElement>(s)?.offsetHeight ?? 0,
        ),
      ) +
      px(cs.paddingTop) +
      px(cs.paddingBottom) +
      px(cs.borderTopWidth) +
      px(cs.borderBottomWidth);
    sobra = Math.max(0, senal.offsetHeight - sinFrase);
  }
  raiz.style.setProperty(
    "--rincon-alto-mandos",
    `${Math.round(aPxDelHud(raiz, c.height) - sobra)}px`,
  );
  if (c.width > 2)
    raiz.style.setProperty(
      "--rincon-izquierda",
      `${Math.round(aPxDelHud(raiz, c.left))}px`,
    );
  else raiz.style.removeProperty("--rincon-izquierda");
  /*
   * **Y dónde acaba por la derecha la columna de la izquierda**, para la
   * cabina, donde el rincón vive a ese lado con el tutor debajo: el subtítulo
   * empieza a su lado y no encima de la tarjeta de la orden ni de la tecla
   * que toca. Lo más a la derecha de los dos que se vea.
   */
  const tutor = raiz.querySelector('[data-hud="tutor"]')?.getBoundingClientRect();
  const derecha = Math.max(
    c.width > 2 ? c.right : 0,
    tutor && tutor.width > 2 ? tutor.right : 0,
  );
  if (derecha > 0)
    raiz.style.setProperty(
      "--rincon-derecha",
      `${Math.round(aPxDelHud(raiz, derecha))}px`,
    );
  else raiz.style.removeProperty("--rincon-derecha");
}

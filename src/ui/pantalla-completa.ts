/**
 * **La pantalla entera para volar.**
 *
 * En un teléfono apaisado la barra de direcciones del navegador se come un
 * tercio del alto: de 412 píxeles quedaban 330, y en esos 330 tenían que caber
 * la palanca, el gas, el timón, el cuadro y el avión. Visto en el teléfono de
 * Enrique, con la dirección de la web ocupando la franja de arriba entera.
 *
 * Así que se pide la pantalla completa **al primer toque**. No al cargar,
 * porque el navegador no lo deja —hace falta un gesto de quien juega, y con
 * razón: una página que se adueña de la pantalla sin que nadie lo pida es
 * justo lo que no se quiere—; y no con un botón que haya que encontrar,
 * porque quien tiene cuatro años no va a buscarlo. El primer toque ya es el
 * gesto: elegir el piloto, el avión o el campo.
 *
 * **Y se sale fácil**: con el gesto de volver del propio teléfono, que es lo
 * que hace cualquier juego, y con el botón de las cuatro esquinas del menú,
 * que también vuelve a entrar. Si se sale, no se vuelve a pedir sola: salir
 * es una decisión y se respeta.
 *
 * ## iPhone, no
 *
 * Safari en el iPhone no deja que una página se ponga a pantalla completa:
 * la API solo existe allí para los vídeos. Lo que sí funciona es **añadirla a
 * la pantalla de inicio**, que la abre sin barra ninguna —eso lo dan el
 * manifiesto y `apple-mobile-web-app-capable` de `index.html`— y
 * `viewport-fit=cover`, que deja dibujar debajo de la muesca con los márgenes
 * seguros que la hoja ya respeta. Por eso el botón no sale donde no hay API:
 * un botón que no hace nada es peor que no tenerlo.
 */

type DocumentoConPrefijo = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type RaizConPrefijo = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

/** Si este navegador deja poner la página a pantalla completa. */
export function hayPantallaCompleta(): boolean {
  const d = document as DocumentoConPrefijo;
  return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
}

/** Si ahora mismo se está a pantalla completa. */
export function enPantallaCompleta(): boolean {
  const d = document as DocumentoConPrefijo;
  return !!(d.fullscreenElement ?? d.webkitFullscreenElement);
}

/**
 * Si se abrió como aplicación instalada, desde el icono de la pantalla de
 * inicio. Ahí ya no hay barra que quitar, y pedir la pantalla completa encima
 * le quitaría además la de estado sin motivo.
 */
export function comoAplicacion(): boolean {
  const instalada =
    typeof matchMedia === "function" &&
    matchMedia("(display-mode: fullscreen), (display-mode: standalone)")
      .matches;
  return (
    instalada || (navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * Si tiene sentido ofrecerla: hay API y no se está ya como aplicación.
 * Decide si el botón del menú existe.
 */
export function seOfrecePantallaCompleta(): boolean {
  return hayPantallaCompleta() && !comoAplicacion();
}

export async function entrarEnPantallaCompleta(): Promise<void> {
  const raiz = document.documentElement as RaizConPrefijo;
  try {
    if (raiz.requestFullscreen)
      await raiz.requestFullscreen({ navigationUI: "hide" });
    else await raiz.webkitRequestFullscreen?.();
  } catch {
    // Denegada o sin gesto: se juega igual, con la barra puesta.
    return;
  }
  /*
   * **Y apaisada, clavada.** Solo se puede con la pantalla completa puesta
   * —fuera de ella el navegador lo rechaza— y es lo que ya pide el
   * manifiesto para la aplicación instalada. Sin esto, un teléfono con el
   * giro automático puesto se da la vuelta cada vez que el niño lo inclina
   * para virar, que es justo lo que hace al virar.
   */
  const orientacion = screen.orientation as
    | (ScreenOrientation & { lock?: (o: string) => Promise<void> })
    | undefined;
  await orientacion?.lock?.("landscape").catch(() => {});
}

export async function salirDePantallaCompleta(): Promise<void> {
  const d = document as DocumentoConPrefijo;
  try {
    if (d.exitFullscreen) await d.exitFullscreen();
    else await d.webkitExitFullscreen?.();
  } catch {
    // Ya estaba fuera.
  }
}

export function alternarPantallaCompleta(): void {
  void (enPantallaCompleta()
    ? salirDePantallaCompleta()
    : entrarEnPantallaCompleta());
}

/** Avisa al entrar y al salir, se haga desde el juego o desde el teléfono. */
export function alCambiarPantallaCompleta(fn: () => void): void {
  document.addEventListener("fullscreenchange", fn);
  document.addEventListener("webkitfullscreenchange", fn);
}

/**
 * Pide la pantalla completa en el primer toque con el dedo, una sola vez.
 *
 * `pointerup` y no `pointerdown`: con el dedo, el navegador solo cuenta como
 * gesto de quien juega el levantarlo. Y en captura, para verlo antes que
 * cualquier mando que lo detenga.
 *
 * Nada con ratón —en el portátil la ventana es de quien la usa— y nada
 * cuando el navegador lo maneja un programa: los bancos miden una pantalla
 * de tamaño fijo, y que se les agrande a mitad de medida falsea lo medido.
 */
export function pedirAlPrimerToque(): void {
  if (typeof window === "undefined") return;
  if (navigator.webdriver) return;
  if (!matchMedia("(pointer: coarse)").matches) return;
  if (!seOfrecePantallaCompleta()) return;
  const alTocar = (e: PointerEvent): void => {
    if (e.pointerType === "mouse") return;
    window.removeEventListener("pointerup", alTocar, true);
    if (!enPantallaCompleta()) void entrarEnPantallaCompleta();
  };
  window.addEventListener("pointerup", alTocar, true);
}

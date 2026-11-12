/**
 * **`:has()` en un navegador que no lo sabe: una clase que dice lo mismo.**
 *
 * La hoja de estilos pregunta con `:has()` cosas como «¿está puesto el panel
 * del final?» para esconder los mandos de pulgar, que si no tapan «Otro
 * vuelo». Firefox 98 —el de una pizarra de aula con Android 8— no conoce
 * `:has()` y tira la regla entera, con lo que el botón de volver a jugar se
 * quedaba debajo de la barra del timón.
 *
 * Así que cada `:has(X)` de `style.css` va escrito como
 * `:is(:has(X), .clase)`: el navegador moderno usa el `:has()` y el viejo, que
 * dentro de `:is()` se salta lo que no entiende y se queda con lo demás, usa
 * la clase. Y esa clase la pone esto, **solo** donde `:has()` falta, mirando
 * el DOM como lo miraría el selector.
 *
 * La lista es la única fuente: `navegador-viejo.test.ts` exige que cada
 * `:has()` de la hoja vaya con su clase de aquí, y al revés.
 */

export interface Espejo {
  /** Quién lleva la clase: el sujeto del `:has()`. */
  readonly en: string;
  /** Lo que va dentro del `:has()`, tal cual. */
  readonly si: string;
  /** La clase que lo dice sin `:has()`. */
  readonly clase: string;
}

export const ESPEJOS: readonly Espejo[] = [
  { en: ".hud", si: ".cuadro--bajado", clase: "hay-cuadro-bajado" },
  { en: ".hud", si: '.tablero[data-visera="mcp"]', clase: "hay-mcp-en-la-visera" },
  { en: ".hud", si: '.hud__abajo > [data-hud="hint"]:not(:empty)', clase: "hay-subtitulo" },
  { en: ".hud", si: ".rincon .senal:not([hidden])", clase: "hay-senal-en-el-rincon" },
  { en: ".hud", si: ".radio:not([hidden])", clase: "hay-radio" },
  { en: ".hud", si: ".cuadro--grande", clase: "hay-cuadro-grande" },
  { en: "body", si: '[data-hud="fin"]:not([hidden])', clase: "hay-fin" },
  { en: "body", si: ".hud--menu", clase: "hay-menu" },
  { en: ":root", si: ".hud.hud--menu", clase: "hay-menu-abierto" },
  { en: ".fin__manga", si: ".hoja", clase: "hay-hoja" },
  { en: ".motor__tecla", si: "svg", clase: "hay-dibujo" },
  { en: ".pilotos__panel", si: ".pilotos__muestra", clase: "hay-muestra" },
  { en: ".senal", si: ".senal__texto:not(:empty)", clase: "hay-texto" },
  { en: ".tarjeta.motor", si: ".motor__reversa:not([hidden])", clase: "hay-reversa" },
  { en: ".explicacion", si: ".explica--figura", clase: "hay-figura" },
  { en: ".tav__por-dentro", si: "span", clase: "hay-texto" },
];

/** Si el navegador entiende `:has()`. */
export function sabeDeHas(): boolean {
  return (
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("selector(:has(*))")
  );
}

/** Pone y quita las clases de una vez, mirando todo el documento. */
export function reflejar(doc: Document = document): void {
  for (const { en, si, clase } of ESPEJOS)
    for (const el of doc.querySelectorAll(en)) el.classList.toggle(clase, el.querySelector(si) !== null);
}

/**
 * Arranca el espejo si hace falta; si no, no hace nada. Devuelve cómo pararlo.
 *
 * Se repasa la lista una vez por fotograma como mucho, cuando algo ha
 * cambiado: el HUD cambia texto cada fotograma, y lo que se pague aquí solo lo
 * paga el navegador viejo.
 */
export function espejoDeHas(doc: Document = document): () => void {
  if (sabeDeHas() || typeof MutationObserver === "undefined") return () => {};
  reflejar(doc);
  let pedido = false;
  const vigia = new MutationObserver(() => {
    if (pedido) return;
    pedido = true;
    requestAnimationFrame(() => {
      pedido = false;
      reflejar(doc);
    });
  });
  vigia.observe(doc.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class", "hidden", "data-visera", "data-hud"],
  });
  return () => vigia.disconnect();
}

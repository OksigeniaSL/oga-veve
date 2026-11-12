/**
 * **Las unidades de contenedor, medidas a mano donde el navegador no las sabe.**
 *
 * La carta del hangar, su ficha y el plano se miden contra su propia caja con
 * `cqw` y `cqh`, que Firefox 98 —el de una pizarra de aula con Android 8— no
 * conoce. Allí la carta se estiraba a lo que midiera su caja y el sello de la
 * ficha se quedaba sin lado.
 *
 * Aquí se mide cada contenedor y se le ponen `--cqw` y `--cqh`, la centésima
 * parte de su ancho y de su alto, como las unidades de verdad. Las reglas de
 * reserva viven en `style.css`, dentro de `@supports not (container-type:
 * size)`, junto a las que usan las unidades: así solo las lee el navegador
 * que las necesita, y en cualquier otro esto no hace nada.
 */

/** Los que son contenedor en `style.css` y tienen reglas con `cq` que dependen de ellos. */
export const CONTENEDORES_MEDIDOS = [".mapa", ".pais", ".ficha-carta"] as const;

/** Si el navegador entiende las consultas de contenedor. */
export function sabeDeContenedores(): boolean {
  return typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("container-type: size");
}

/** Pone a medir los contenedores, si hace falta. Devuelve cómo pararlo. */
export function medirContenedoresSiFalta(raiz: ParentNode & Node = document): () => void {
  if (sabeDeContenedores() || typeof ResizeObserver === "undefined") return () => {};
  const medida = new ResizeObserver((entradas) => {
    for (const e of entradas) {
      // La caja de dentro, sin el relleno: la misma que miden `cqw` y `cqh`.
      const { width, height } = e.contentRect;
      const el = e.target as HTMLElement;
      el.style.setProperty("--cqw", `${width / 100}px`);
      el.style.setProperty("--cqh", `${height / 100}px`);
    }
  });
  const vistos = new WeakSet<Element>();
  const selector = CONTENEDORES_MEDIDOS.join(", ");
  const buscar = (): void => {
    for (const el of raiz.querySelectorAll(selector)) {
      if (vistos.has(el)) continue;
      vistos.add(el);
      medida.observe(el);
    }
  };
  buscar();
  // Los contenedores aparecen al abrir el hangar o el plano. Solo se busca
  // cuando entra un elemento, y una vez por fotograma: el HUD cambia texto
  // sesenta veces por segundo y eso no puede costar nada.
  let pedido = false;
  const vigia = new MutationObserver((cambios) => {
    if (pedido) return;
    for (const c of cambios)
      for (const n of c.addedNodes)
        if (n.nodeType === 1) {
          pedido = true;
          requestAnimationFrame(() => {
            pedido = false;
            buscar();
          });
          return;
        }
  });
  vigia.observe(raiz, { childList: true, subtree: true });
  return () => {
    vigia.disconnect();
    medida.disconnect();
  };
}

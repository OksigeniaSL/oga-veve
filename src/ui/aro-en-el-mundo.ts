/**
 * **El aro que señala algo del mundo mientras la instructora lo nombra.**
 *
 * Lo del cuadro se señala haciéndolo latir en su sitio; lo de fuera no tiene
 * sitio en el HUD, así que se le pone encima, en la pantalla, un aro con una
 * flecha que baja hacia él: el dedo de quien va sentado al lado. Lo primero
 * que lo lleva es el PAPI —«hasta ver dos blancas y dos rojas en las cuatro
 * luces de al lado de la pista»—, que desde fuera y a una milla son cuatro
 * puntos en un paisaje entero. Ver `flight/lo-que-se-nombra.ts`.
 *
 * Es un dibujo y nada más: sin palabras, para los cuatro peldaños, y sin
 * recoger dedos. Va fuera del HUD a propósito: el HUD se encoge con `zoom` en
 * las pantallas bajas, y esto se coloca en píxeles de la pantalla, que es
 * donde cae lo que señala.
 */
export class AroEnElMundo {
  private el: HTMLElement | null = null;
  private puesto = false;

  /**
   * Lo pone sobre ese punto de la pantalla, en píxeles CSS, o lo quita con
   * `null`. Se llama cada fotograma mientras dura lo señalado: se mueve con
   * `transform`, que no recoloca nada más de la página.
   */
  poner(donde: { readonly x: number; readonly y: number } | null): void {
    if (!donde) {
      if (this.puesto && this.el) this.el.hidden = true;
      this.puesto = false;
      return;
    }
    const el = this.elemento();
    if (!el) return;
    el.style.transform = `translate(${donde.x.toFixed(1)}px, ${donde.y.toFixed(1)}px)`;
    if (!this.puesto) el.hidden = false;
    this.puesto = true;
  }

  /** Si está a la vista. Para el banco. */
  get aLaVista(): boolean {
    return this.puesto;
  }

  /** Dónde está, en píxeles CSS, o `null`. Para el banco. */
  get donde(): { x: number; y: number } | null {
    if (!this.puesto || !this.el) return null;
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(this.el.style.transform);
    return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
  }

  dispose(): void {
    this.el?.remove();
    this.el = null;
    this.puesto = false;
  }

  private elemento(): HTMLElement | null {
    if (this.el) return this.el;
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.className = "aro-del-mundo";
    el.setAttribute("aria-hidden", "true");
    el.hidden = true;
    el.innerHTML = `<span class="aro-del-mundo__aro"></span>
      <svg class="aro-del-mundo__flecha" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 22 L4 12 L9 12 L9 2 L15 2 L15 12 L20 12 Z" />
      </svg>`;
    document.body.appendChild(el);
    this.el = el;
    return el;
  }
}

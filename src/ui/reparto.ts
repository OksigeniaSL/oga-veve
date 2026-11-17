/**
 * **Lo que se lee, donde no pise lo que se toca** (ADR 0030, enmienda H28f).
 *
 * Cinco encargos seguidos (H28b a H28e) arreglaron dónde va lo que se lee
 * cuando no cabe todo, y cada uno dejó al lado otro solape que su
 * comprobación no medía: el asa del cuadro, la pantalla en grande, la cabina
 * de pie, la radio de la barra. Cada arreglo era una variable CSS más
 * (`--columna-izquierda`, `--lee-derecha`, `--torre-alto`…) que apartaba una
 * pieza de otra pieza concreta, y el día que salía un botón nuevo nadie se
 * apartaba de él.
 *
 * Así que la regla va aquí, una vez, y vale para lo que se añada mañana:
 *
 * - **Lo que se toca sale de la página**, no de una lista: todo lo que es un
 *   botón, un campo o lleva la marca de lo que se toca (`LO_QUE_SE_TOCA`).
 * - **La hoja dice dónde quiere ir cada cosa que se lee**, y esto comprueba
 *   que ahí no pisa nada. Si pisa, se coloca **por prioridad** —el aviso, la
 *   lámpara de la torre, la tarjeta de la orden, el subtítulo, el tutor y la
 *   radio—: primero se estrecha en el hueco libre de su fila, luego se busca
 *   otra fila libre (la de una pieza que va detrás, o debajo de lo que ya está
 *   puesto), y si no cabe en ninguna **espera**, como en un avión cuando no
 *   hay sitio para todo: uno a la vez, por orden. Lo que espera no se pierde:
 *   el subtítulo no corre su reloj mientras espera (`Hud.subtituloEsperando`).
 * - **El aviso no espera nunca**: si no tiene sitio libre se queda en el suyo,
 *   que es lo más importante de la pantalla.
 *
 * Por qué midiendo y no con más CSS: lo que hay que esquivar depende de lo que
 * esté encendido en cada momento —el freno sale al tocar suelo, la barra se
 * parte en filas, el cuadro se pone en grande— y en la hoja cada combinación
 * era una regla. Y por qué no cuesta (regla 6): no corre en cada fotograma,
 * solo cuando cambia algo de lo que se lee o de lo que se toca, y entonces
 * son unas decenas de cajas y una o dos maquetaciones.
 */

/** Una caja en píxeles de pantalla. */
export interface Caja {
  readonly izq: number;
  readonly arr: number;
  readonly der: number;
  readonly aba: number;
}

/**
 * **Lo que se toca**, sacado de la página: botones y campos, las losas del
 * teléfono, la rueda y la ventanilla del MCP, los mandos de la radio, las
 * piezas del cuadro que se explican al tocarlas, las palancas de pulgar
 * (`data-touch`) y lo que lleva la marca `data-tocable` —las tarjetas del gas
 * y del freno, el volumen—, que se tocan y no son un `<button>`. Lo que se
 * añada mañana con una de estas formas entra solo. `npm run carteles` mide con
 * la misma regla, escrita allí aparte.
 */
export const LO_QUE_SE_TOCA =
  'button:not(:disabled), [role="button"], a[href], input, select, textarea, ' +
  "[data-tocable], [data-touch], [data-tel-grande], [data-mcp-rueda], [data-mcp-alt], [data-radio-mando], " +
  "[data-explica]:not([data-explica-fondo])";

/** Cómo se comporta cada cosa que se lee cuando choca. */
export interface PiezaQueSeLee {
  readonly que: string;
  readonly sel: string;
  /** Si se puede estrechar y cambiar de fila. Las que viven en una caja de la
      hoja —la tarjeta en el rincón, el tutor, la radio en la barra— no. */
  readonly mueve: boolean;
  /** Si puede esperar. El aviso no. */
  readonly espera: boolean;
  /** Si está encendida, más allá de verse: el aviso nace con opacidad cero y
      sube en 160 ms, y en el fotograma en que sale ya hay que contarlo. */
  readonly encendida?: (el: HTMLElement) => boolean;
  /** Lo que se recoge antes de esperar, si lo tiene: la tarjeta de la orden
      se queda con su dibujo y deja la frase, que el dibujo es lo esencial
      (regla 2) y la frase la dice también la instructora. */
  readonly recoge?: string;
}

/** La clase de lo que se ha recogido para caber. */
export const RECOGIDA = "lee-recogida";

/** Por prioridad, la primera la que más manda. */
export const LO_QUE_SE_LEE: readonly PiezaQueSeLee[] = [
  {
    que: "aviso",
    sel: '[data-hud="warning"]',
    mueve: true,
    espera: false,
    encendida: (el) => el.classList.contains("aviso-hud--visible"),
  },
  { que: "torre", sel: '[data-hud="torre"]', mueve: true, espera: true },
  { que: "senal", sel: '[data-hud="senal"]', mueve: false, espera: true, recoge: RECOGIDA },
  { que: "subtitulo", sel: '[data-hud="hint"]', mueve: true, espera: true },
  { que: "tutor", sel: '[data-hud="tutor"]', mueve: false, espera: true },
  { que: "radio", sel: '[data-hud="radio"]', mueve: false, espera: true },
];

/** Lo que se deja entre dos cosas: la separación de uso de las filas. */
export const RESPIRO = 6;

/** Si dos cajas se pisan, con un píxel de tolerancia por el redondeo. */
export function pisa(a: Caja, b: Caja): boolean {
  return (
    Math.min(a.der, b.der) - Math.max(a.izq, b.izq) > 1 &&
    Math.min(a.aba, b.aba) - Math.max(a.arr, b.arr) > 1
  );
}

/**
 * Los tramos libres entre `izq` y `der` en la banda de `arr` a `aba`: lo que
 * queda al quitar lo ocupado que cae en esa banda, con su respiro.
 */
export function tramosLibres(
  izq: number,
  der: number,
  arr: number,
  aba: number,
  ocupado: readonly Caja[],
  respiro = RESPIRO,
): Array<[number, number]> {
  const cortes = ocupado
    .filter((o) => Math.min(aba, o.aba) - Math.max(arr, o.arr) > 1)
    .map((o): [number, number] => [o.izq - respiro, o.der + respiro])
    .sort((a, b) => a[0] - b[0]);
  const tramos: Array<[number, number]> = [];
  let desde = izq;
  for (const [i, d] of cortes) {
    if (i > desde) tramos.push([desde, Math.min(i, der)]);
    desde = Math.max(desde, d);
    if (desde >= der) break;
  }
  if (desde < der) tramos.push([desde, der]);
  return tramos.filter(([i, d]) => d - i > 1);
}

/** Una pieza que se lee, medida donde la pone la hoja. */
export interface Colocable {
  /** Donde la pone la hoja. */
  readonly natural: Caja;
  /** Hasta dónde llegan sus dos bordes, en píxeles de pantalla: lo más ancha
      que puede ser. */
  readonly hueco: readonly [number, number];
  /** Si crece hacia abajo desde su borde de arriba o hacia arriba desde el de
      abajo. */
  readonly ancla: "arriba" | "abajo";
  /** Los sitios de las que van detrás de ella, que puede ocupar: si no cabe
      en el suyo, la que manda más se pone en el de la que manda menos. */
  readonly sitios: readonly number[];
  readonly mueve: boolean;
}

/** Una prueba: los dos bordes y la fila (el borde de arriba o el de abajo). */
export interface Prueba {
  readonly izq: number;
  readonly der: number;
  readonly fila: number;
}

/**
 * **Dónde va una pieza**, con lo que ya está puesto: su sitio si ahí no pisa
 * nada; si no, estrechada en el tramo libre de su fila; si no, en otra fila
 * —el sitio de una que va detrás o debajo de lo ya puesto—, estrechada lo que
 * haga falta. Nunca más estrecha que la mitad de su hueco ni que lo que mide
 * entera, que una frase en un palillo no se lee. `probar` la pone donde se le
 * dice y devuelve lo que ocupa así, que la altura depende del ancho.
 *
 * Devuelve la caja donde queda, o `null` si no cabe en ninguna: espera.
 */
export function colocar(
  p: Colocable,
  ocupado: readonly Caja[],
  limites: Caja,
  probar: (prueba: Prueba) => Caja,
): Caja | null {
  const libre = (c: Caja): boolean =>
    !ocupado.some((o) => pisa(c, o)) &&
    c.izq >= limites.izq - 1 &&
    c.der <= limites.der + 1 &&
    c.arr >= limites.arr - 1 &&
    c.aba <= limites.aba + 1;
  if (libre(p.natural)) return p.natural;
  if (!p.mueve) return null;
  const anchoEntero = p.natural.der - p.natural.izq;
  const minimo = Math.min(anchoEntero, (p.hueco[1] - p.hueco[0]) / 2);
  const centro = (p.natural.izq + p.natural.der) / 2;
  const arriba = p.ancla === "arriba";
  const filaNatural = arriba ? p.natural.arr : p.natural.aba;
  // Primero su sitio; luego el de las que van detrás, que es un sitio que la
  // hoja ya pensó para leer; y luego debajo (o encima) de lo que ya está.
  const orden = (fs: readonly number[]): number[] =>
    fs
      .filter((f) => (arriba ? f >= limites.arr && f < limites.aba : f <= limites.aba && f > limites.arr))
      .sort((a, b) => (arriba ? a - b : b - a));
  // Debajo de lo ya puesto solo hacia donde crece —hacia abajo desde la
  // barra, hacia arriba desde el cuadro—: al otro lado está aquello en lo que
  // se apoya, y el aviso del cuadro se metía en él.
  const haciaDondeCrece = ocupado
    .map((o) => (arriba ? o.aba + RESPIRO : o.arr - RESPIRO))
    .filter((f) => (arriba ? f > filaNatural : f < filaNatural));
  const filas: number[] = [];
  for (const f of [filaNatural, ...orden(p.sitios), ...orden(haciaDondeCrece)])
    if (!filas.some((g) => Math.abs(g - f) <= 1)) filas.push(f);
  for (const fila of filas) {
    let alto = p.natural.aba - p.natural.arr;
    // La altura depende del ancho y el ancho de lo que hay en la banda: dos
    // vueltas bastan, porque estrechar solo hace crecer.
    for (let vuelta = 0; vuelta < 3; vuelta++) {
      const [arr, aba] = arriba ? [fila, fila + alto] : [fila - alto, fila];
      const tramos = tramosLibres(p.hueco[0], p.hueco[1], arr, aba, ocupado).filter(
        ([i, d]) => d - i >= minimo,
      );
      const tramo =
        tramos.find(([i, d]) => i <= centro && centro <= d) ??
        tramos.sort((a, b) => b[1] - b[0] - (a[1] - a[0]))[0];
      if (!tramo) break;
      const caja = probar({ izq: tramo[0], der: tramo[1], fila });
      if (libre(caja)) return caja;
      const nuevo = caja.aba - caja.arr;
      if (nuevo <= alto + 1) break;
      alto = nuevo;
    }
  }
  return null;
}

/** La clase de lo que espera: escondido sin dejar su sitio. */
export const ESPERA = "lee-espera";

const PROPIEDADES = ["left", "right", "top", "bottom"] as const;

function cajaDe(r: DOMRect): Caja {
  return { izq: r.left, arr: r.top, der: r.right, aba: r.bottom };
}

/**
 * **Lo que se ve de algo que se toca**: su caja recortada por los `<svg>` que
 * lo contienen y por la pantalla. La caja de un grupo de SVG es la de todo su
 * dibujo, también lo recortado: la cinta de velocidad lleva escritas todas las
 * velocidades, y su caja subía por encima del cuadro hasta la fila del aviso,
 * que se quedaba sin sitio donde no había nada. `null` si no se ve nada.
 */
export function cajaQueSeVe(el: Element): Caja | null {
  const r = el.getBoundingClientRect();
  let c: Caja = {
    izq: Math.max(0, r.left),
    arr: Math.max(0, r.top),
    der: Math.min(innerWidth, r.right),
    aba: Math.min(innerHeight, r.bottom),
  };
  for (let svg = el.parentElement?.closest("svg"); svg; svg = svg.parentElement?.closest("svg")) {
    const s = svg.getBoundingClientRect();
    c = {
      izq: Math.max(c.izq, s.left),
      arr: Math.max(c.arr, s.top),
      der: Math.min(c.der, s.right),
      aba: Math.min(c.aba, s.bottom),
    };
  }
  return c.der - c.izq > 2 && c.aba - c.arr > 2 ? c : null;
}

/** Si se ve, sin contar la opacidad: el aviso que sale aún está en cero. */
function seVe(el: Element): boolean {
  if (el.closest("[hidden]")) return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 2 || r.height <= 2) return false;
  if (r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) return false;
  const cs = getComputedStyle(el);
  return cs.display !== "none" && cs.visibility !== "hidden";
}

/** Si el borde de arriba lo pone la hoja o es `auto`, que dice hacia dónde crece. */
function anclaDe(el: HTMLElement): "arriba" | "abajo" {
  const mapa = (el as HTMLElement & { computedStyleMap?: () => StylePropertyMapReadOnly })
    .computedStyleMap?.();
  const top = mapa?.get("top")?.toString();
  return top === "auto" ? "abajo" : "arriba";
}

/**
 * **Coloca lo que se lee**: lo mide donde lo pone la hoja, mide lo que se
 * toca, y en orden de prioridad deja cada cosa en su sitio, la cambia de sitio
 * o la deja esperando. Escribe en línea solo lo que mueve, y lo borra en la
 * vuelta siguiente para volver a medir lo que quiere la hoja.
 *
 * Devuelve lo que ha decidido, para quien quiera mirarlo.
 */
export function repartirLoQueSeLee(raiz: HTMLElement): Record<string, string> {
  const escala = Number.parseFloat(getComputedStyle(raiz).zoom) || 1;
  const piezas = LO_QUE_SE_LEE.map((d) => ({
    d,
    el: raiz.querySelector<HTMLElement>(d.sel) ?? document.querySelector<HTMLElement>(d.sel),
  })).filter((x): x is { d: PiezaQueSeLee; el: HTMLElement } => !!x.el);
  // La hoja manda primero: fuera lo que se escribió la vez anterior.
  for (const { el } of piezas) {
    el.classList.remove(ESPERA, RECOGIDA);
    if (el.dataset.reparto) {
      for (const p of PROPIEDADES) el.style.removeProperty(p);
      delete el.dataset.reparto;
    }
  }
  const vivas = piezas.filter(({ d, el }) => seVe(el) && (d.encendida?.(el) ?? true));
  const leidas = vivas.map(({ el }) => el);
  const tocables = [...document.querySelectorAll<HTMLElement>(LO_QUE_SE_TOCA)]
    .filter(
      (el) =>
        !leidas.some((l) => l.contains(el) || el.contains(l)) &&
        seVe(el) &&
        // Lo que no se ve —transparente o escondido por quien lo contiene—
        // no es un mando que se tape.
        (el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true),
    )
    .map(cajaQueSeVe)
    .filter((c): c is Caja => !!c);
  const naturales = new Map(vivas.map(({ el }) => [el, cajaDe(el.getBoundingClientRect())]));
  const limites: Caja = { izq: 0, arr: 0, der: innerWidth, aba: innerHeight };
  const ocupado: Caja[] = [...tocables];
  const hecho: Record<string, string> = {};
  vivas.forEach(({ d, el }, i) => {
    const natural = naturales.get(el);
    if (!natural) return;
    const cs = getComputedStyle(el);
    const px = (v: string): number => Number.parseFloat(v) || 0;
    const ancla = anclaDe(el);
    // El bloque que la contiene, en píxeles de pantalla: lo que hay de su
    // caja a cada borde, menos lo que la hoja le pone de distancia y margen.
    const cbIzq = natural.izq - (px(cs.left) + px(cs.marginLeft)) * escala;
    const cbDer = natural.der + (px(cs.right) + px(cs.marginRight)) * escala;
    const cbArr = natural.arr - (px(cs.top) + px(cs.marginTop)) * escala;
    const cbAba = natural.aba + (px(cs.bottom) + px(cs.marginBottom)) * escala;
    const hueco: [number, number] = [cbIzq + px(cs.left) * escala, cbDer - px(cs.right) * escala];
    // Los sitios de las que van detrás y se mueven, en la misma columna.
    const sitios = vivas
      .slice(i + 1)
      .filter((o) => o.d.mueve && anclaDe(o.el) === ancla)
      .map((o) => naturales.get(o.el))
      .filter((c): c is Caja => !!c && Math.min(c.der, hueco[1]) - Math.max(c.izq, hueco[0]) > 1)
      .map((c) => (ancla === "arriba" ? c.arr : c.aba));
    const probar = ({ izq, der, fila }: Prueba): Caja => {
      el.dataset.reparto = "1";
      el.style.left = `${(izq - cbIzq) / escala}px`;
      el.style.right = `${(cbDer - der) / escala}px`;
      if (ancla === "arriba") {
        el.style.top = `${(fila - cbArr - px(cs.marginTop) * escala) / escala}px`;
        el.style.bottom = "auto";
      } else {
        el.style.bottom = `${(cbAba - fila - px(cs.marginBottom) * escala) / escala}px`;
        el.style.top = "auto";
      }
      return cajaDe(el.getBoundingClientRect());
    };
    const sitio = colocar(
      { natural, hueco, ancla, sitios, mueve: d.mueve },
      ocupado,
      limites,
      probar,
    );
    if (sitio) {
      if (sitio === natural && el.dataset.reparto) {
        for (const p of PROPIEDADES) el.style.removeProperty(p);
        delete el.dataset.reparto;
      }
      ocupado.push(sitio);
      hecho[d.que] = sitio === natural ? "en su sitio" : "movida";
      return;
    }
    if (el.dataset.reparto) {
      for (const p of PROPIEDADES) el.style.removeProperty(p);
      delete el.dataset.reparto;
    }
    if (d.recoge) {
      el.classList.add(d.recoge);
      const recogida = cajaDe(el.getBoundingClientRect());
      if (!ocupado.some((o) => pisa(recogida, o))) {
        ocupado.push(recogida);
        hecho[d.que] = "recogida";
        return;
      }
      el.classList.remove(d.recoge);
    }
    if (d.espera) {
      el.classList.add(ESPERA);
      hecho[d.que] = "espera";
    } else {
      // El aviso: en su sitio aunque pise, y lo demás se aparta de él.
      ocupado.push(natural);
      hecho[d.que] = "en su sitio, sin hueco";
    }
  });
  return hecho;
}

/**
 * **Cuándo se vuelve a repartir**: cuando cambia algo de lo que se lee —se
 * enciende, se apaga, cambia de texto o de clase— o la raíz del HUD cambia de
 * clase (la cabina, el aviso, la pantalla en grande), y cuando quien mide el
 * HUD avisa de que algo de lo que se toca ha cambiado de tamaño. Una vez por
 * fotograma como mucho, y solo si ha cambiado lo que se mira: el juego vuelve
 * a poner las mismas clases en cada fotograma, y eso no es un cambio.
 */
export class Repartidor {
  private observador: MutationObserver | null = null;
  private pedido = 0;
  private forzar = false;
  private firma = "";
  private readonly alCambiarDeTamano = (): void => this.pedir(true);

  constructor(private readonly raiz: HTMLElement) {}

  vigilar(): void {
    this.soltar();
    if (typeof MutationObserver === "undefined" || typeof requestAnimationFrame === "undefined")
      return;
    this.observador = new MutationObserver(() => this.pedir(false));
    this.observador.observe(this.raiz, { attributes: true, attributeFilter: ["class"] });
    for (const d of LO_QUE_SE_LEE) {
      const el = this.raiz.querySelector(d.sel);
      if (el)
        this.observador.observe(el, {
          attributes: true,
          attributeFilter: ["class", "hidden"],
          childList: true,
          characterData: true,
          subtree: true,
        });
    }
    addEventListener("resize", this.alCambiarDeTamano);
    this.pedir(true);
  }

  soltar(): void {
    this.observador?.disconnect();
    this.observador = null;
    removeEventListener("resize", this.alCambiarDeTamano);
    if (this.pedido) cancelAnimationFrame(this.pedido);
    this.pedido = 0;
  }

  /** Que se reparta ya, con lo que haya. */
  ahora(): void {
    this.firma = this.firmaDeAhora();
    this.forzar = false;
    repartirLoQueSeLee(this.raiz);
  }

  /** Que se reparta en el fotograma que viene; `forzar` aunque no cambie la firma. */
  pedir(forzar: boolean): void {
    this.forzar ||= forzar;
    if (this.pedido || typeof requestAnimationFrame === "undefined") return;
    this.pedido = requestAnimationFrame(() => {
      this.pedido = 0;
      const firma = this.firmaDeAhora();
      if (!this.forzar && firma === this.firma) return;
      this.forzar = false;
      this.firma = firma;
      repartirLoQueSeLee(this.raiz);
    });
  }

  /** Lo que se mira para saber si ha cambiado algo, sin maquetar. */
  private firmaDeAhora(): string {
    const partes = [this.raiz.className, `${innerWidth}x${innerHeight}`];
    for (const d of LO_QUE_SE_LEE) {
      const el = this.raiz.querySelector<HTMLElement>(d.sel);
      if (!el) continue;
      const cls = el.className.replace(ESPERA, "").replace(RECOGIDA, "");
      partes.push(`${el.hidden ? 0 : 1}${cls}${el.textContent ?? ""}`);
    }
    return partes.join("|");
  }
}

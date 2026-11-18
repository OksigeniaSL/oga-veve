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
 * - **Y desde el asiento, lo que el avión enseña cuenta como lo que se toca**
 *   (H31a): la brújula del parabrisas cuelga en lo más alto, que es donde va
 *   lo que se lee, y en el teléfono la tarjeta de la orden le llegaba encima.
 *   El juego dice dónde cae en la pantalla (`Hud.ponerLaBrujula`) y aquí se
 *   esquiva como un botón más.
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
  /** Si vive en el hilo de una caja de la hoja —la radio, en la barra— y,
      cuando pisa, se lleva entera a donde quepa con `translate`, sin dejar su
      hueco: lo que va a su lado en la barra se toca y no se mueve por ella. */
  readonly traslada?: boolean;
  /** Si, cuando pisa algo a su derecha, **se estrecha en su sitio** antes de
      recogerse —el mismo borde de la izquierda y la misma fila, con la frase
      en una línea más—: la tarjeta de la orden, que vive en su rincón y no se
      mueve, y recogida perdía la frase entera por unos píxeles (H31a). Ver
      `hastaDondeEnSuSitio`. */
  readonly estrechaEnSuSitio?: boolean;
  /** Lo que es seguridad y no puede quedarse esperando: la lámpara. Lo que
      cede alto (`LO_QUE_CEDE`) se encoge para hacerle sitio, y si hacia donde
      crece no cabe, busca fila al otro lado (`Colocable.alOtroLado`). */
  readonly pideSitio?: boolean;
  /** Lo que cambia de texto solo y sin cambiar de tamaño —el cronómetro, cada
      segundo, con cifras tabulares—: la firma no mira su texto, que si no
      habría un reparto por segundo para nada. Ver `Repartidor.firmaDeAhora`. */
  readonly cuentaSola?: boolean;
}

/**
 * **Lo que se toca y cede alto** a lo que no puede esperar: la pantalla en
 * grande del teléfono, que llena todo lo que hay entre la barra y los
 * pulgares. Con ella puesta no queda fila para la lámpara, y la lámpara es
 * seguridad: mientras está encendida, la pantalla se queda lo que ella mide
 * más baja, como ya se queda una fila más baja con el aviso
 * (`--fila-del-aviso` en la hoja). Lo mide el reparto y lo escribe en
 * `variable`, en píxeles del HUD; la hoja se lo quita a su alto.
 */
export interface LoQueCede {
  readonly que: string;
  readonly sel: string;
  readonly variable: string;
}

export const LO_QUE_CEDE: readonly LoQueCede[] = [
  {
    que: "pantalla en grande",
    sel: '.cuadro.cuadro--grande > [data-hud="tablero"]',
    variable: "--cede-el-grande",
  },
];

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
  {
    que: "torre",
    sel: '[data-hud="torre"]',
    mueve: true,
    espera: true,
    pideSitio: true,
    recoge: RECOGIDA,
  },
  {
    que: "senal",
    sel: '[data-hud="senal"]',
    mueve: false,
    espera: true,
    estrechaEnSuSitio: true,
    recoge: RECOGIDA,
  },
  /*
   * **El cronómetro de la estima**, detrás de la tarjeta de la orden y en su
   * misma caja del rincón: no se mueve, y si pisa algo que se toca, espera.
   * El reloj del ejercicio sigue corriendo en el juego mientras espera, y al
   * salir enseña lo que queda de verdad. Ver `ui/cronometro.ts`.
   */
  { que: "cronometro", sel: '[data-hud="cronometro"]', mueve: false, espera: true, cuentaSola: true },
  { que: "subtitulo", sel: '[data-hud="hint"]', mueve: true, espera: true },
  { que: "tutor", sel: '[data-hud="tutor"]', mueve: false, espera: true },
  { que: "radio", sel: '[data-hud="radio"]', mueve: false, espera: true, traslada: true },
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
  /** Si, cuando hacia donde crece no cabe, se busca también al otro lado:
      lo que no puede esperar (la lámpara). Ver `colocar`. */
  readonly alOtroLado?: boolean;
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
  /*
   * **Y al otro lado, lo que no puede esperar** (H28g). La lámpara, con el
   * aviso encendido, va en el sitio del subtítulo, y en las tablets con el
   * dedo el aviso sube con el cuadro y le quita esa fila: hacia abajo está el
   * cuadro y la lámpara esperaba, con la franja de debajo de la barra libre.
   * Se busca ahí, la fila más cerca de la suya primero, justo debajo de lo
   * que hay encima: así no se mete en aquello en lo que se apoya.
   */
  const alOtroLado = p.alOtroLado
    ? ocupado
        .map((o) => (arriba ? o.aba + RESPIRO : o.arr - RESPIRO))
        .filter((f) =>
          arriba ? f < filaNatural && f >= limites.arr : f > filaNatural && f <= limites.aba,
        )
        .sort((a, b) => (arriba ? b - a : a - b))
    : [];
  const filas: number[] = [];
  for (const f of [filaNatural, ...orden(p.sitios), ...orden(haciaDondeCrece), ...alOtroLado])
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

/**
 * **Hasta dónde puede llegar una pieza estrechada en su sitio**, en píxeles de
 * pantalla: hasta lo primero que pisa a su derecha, con su respiro. `null` si
 * estrecharla no basta —algo la pisa por la izquierda, o se quedaría en menos
 * de la mitad de lo que mide entera, que una frase en un palillo no se lee—
 * o si no pisa nada. Ver `PiezaQueSeLee.estrechaEnSuSitio`.
 */
export function hastaDondeEnSuSitio(natural: Caja, ocupado: readonly Caja[]): number | null {
  const pisan = ocupado.filter((o) => pisa(natural, o));
  if (!pisan.length || pisan.some((o) => o.izq - RESPIRO <= natural.izq)) return null;
  const hasta = Math.min(...pisan.map((o) => o.izq - RESPIRO));
  return hasta - natural.izq >= (natural.der - natural.izq) / 2 ? hasta : null;
}

/**
 * **Dónde se lleva entera una pieza que no se estrecha** —la radio, que vive
 * en la barra—: la misma caja, con el mismo ancho y el mismo alto, en el
 * primer sitio libre de su fila, de la de una que va detrás o de una de
 * debajo de lo ya puesto, lo más cerca de donde la pone la hoja. Sin
 * `probar`: trasladar no cambia su maqueta, así que la caja se sabe.
 *
 * Devuelve la caja donde queda, o `null` si no cabe en ninguna: espera.
 */
export function trasladar(
  natural: Caja,
  ancla: "arriba" | "abajo",
  sitios: readonly number[],
  ocupado: readonly Caja[],
  limites: Caja,
): Caja | null {
  const ancho = natural.der - natural.izq;
  const alto = natural.aba - natural.arr;
  const arriba = ancla === "arriba";
  const filaNatural = arriba ? natural.arr : natural.aba;
  const dentro = (f: number): boolean =>
    arriba ? f >= limites.arr && f + alto <= limites.aba : f <= limites.aba && f - alto >= limites.arr;
  const haciaDondeCrece = ocupado
    .map((o) => (arriba ? o.aba + RESPIRO : o.arr - RESPIRO))
    .filter((f) => (arriba ? f > filaNatural : f < filaNatural))
    .sort((a, b) => (arriba ? a - b : b - a));
  const filas: number[] = [];
  for (const f of [filaNatural, ...sitios, ...haciaDondeCrece])
    if (dentro(f) && !filas.some((g) => Math.abs(g - f) <= 1)) filas.push(f);
  for (const fila of filas) {
    const [arr, aba] = arriba ? [fila, fila + alto] : [fila - alto, fila];
    const tramos = tramosLibres(limites.izq, limites.der, arr, aba, ocupado).filter(
      ([i, d]) => d - i >= ancho,
    );
    // El tramo más cerca de donde la quiere la hoja, y dentro de él, lo más
    // cerca de ahí.
    let mejor: Caja | null = null;
    for (const [i, d] of tramos) {
      const izq = Math.min(Math.max(natural.izq, i), d - ancho);
      const c: Caja = { izq, der: izq + ancho, arr, aba };
      if (ocupado.some((o) => pisa(c, o))) continue;
      if (!mejor || Math.abs(izq - natural.izq) < Math.abs(mejor.izq - natural.izq)) mejor = c;
    }
    if (mejor) return mejor;
  }
  return null;
}

/** La clase de lo que espera: escondido sin dejar su sitio. */
export const ESPERA = "lee-espera";

const PROPIEDADES = ["left", "right", "top", "bottom", "translate", "max-width"] as const;

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
export function cajaQueSeVe(el: Element, svgs?: Map<Element, DOMRect>): Caja | null {
  const r = el.getBoundingClientRect();
  let c: Caja = {
    izq: Math.max(0, r.left),
    arr: Math.max(0, r.top),
    der: Math.min(innerWidth, r.right),
    aba: Math.min(innerHeight, r.bottom),
  };
  for (let svg = el.parentElement?.closest("svg"); svg; svg = svg.parentElement?.closest("svg")) {
    // Las piezas que se explican del cuadro son decenas dentro del mismo
    // dibujo: su caja se mide una vez por reparto.
    let s = svgs?.get(svg);
    if (!s) {
      s = svg.getBoundingClientRect();
      svgs?.set(svg, s);
    }
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
 * **Lo que cede alto, antes de medir lo demás**: lo que miden de alto las
 * piezas encendidas que piden sitio (la lámpara), con su respiro, a cada cosa
 * de `LO_QUE_CEDE` que esté a la vista; nada si no hay ninguna. Se escribe
 * solo si cambia, que escribirlo obliga a maquetar otra vez.
 */
function cederAlto(
  raiz: HTMLElement,
  vivas: ReadonlyArray<{ d: PiezaQueSeLee; el: HTMLElement }>,
  escala: number,
): void {
  for (const c of LO_QUE_CEDE) {
    const el = raiz.querySelector(c.sel);
    const yaCede = raiz.style.getPropertyValue(c.variable);
    if (!el && !yaCede) continue;
    let alto = 0;
    if (el && seVe(el))
      for (const { d, el: pieza } of vivas)
        if (d.pideSitio) alto += pieza.getBoundingClientRect().height + RESPIRO;
    const valor = alto > 0 ? `${Math.round(alto / escala)}px` : "";
    if (valor === yaCede) continue;
    if (valor) raiz.style.setProperty(c.variable, valor);
    else raiz.style.removeProperty(c.variable);
  }
}

/**
 * **Coloca lo que se lee**: lo mide donde lo pone la hoja, mide lo que se
 * toca, y en orden de prioridad deja cada cosa en su sitio, la cambia de sitio
 * o la deja esperando. Escribe en línea solo lo que mueve, y lo borra en la
 * vuelta siguiente para volver a medir lo que quiere la hoja.
 *
 * Devuelve lo que ha decidido, para quien quiera mirarlo. `delAvion` es lo que
 * el avión enseña y no se tapa, en píxeles de pantalla: la brújula del
 * parabrisas desde el asiento (H31a). Se esquiva como lo que se toca.
 */
export function repartirLoQueSeLee(
  raiz: HTMLElement,
  delAvion: readonly Caja[] = [],
): Record<string, string> {
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
  cederAlto(raiz, vivas, escala);
  const leidas = vivas.map(({ el }) => el);
  /*
   * Lo que se toca, de lo más barato a lo más caro (regla 6: esto corre en la
   * tablet de gama media): primero lo que no pide estilo —escondido con
   * `hidden`, o dentro de lo que se lee—; luego si se ve, con
   * `checkVisibility`, que ya mira `display`, `visibility` y la opacidad de
   * quien lo contiene; y solo entonces su caja, una vez. Lo que no se ve
   * —transparente o escondido por quien lo contiene— no es un mando que se
   * tape.
   */
  const svgs = new Map<Element, DOMRect>();
  const tocables: Caja[] = [];
  for (const el of document.querySelectorAll<HTMLElement>(LO_QUE_SE_TOCA)) {
    if (el.closest("[hidden]")) continue;
    if (leidas.some((l) => l.contains(el) || el.contains(l))) continue;
    // Firefox 98 no lo tiene: ahí, la cuenta a mano.
    const visible = el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true });
    if (visible === false || (visible === undefined && !seVe(el))) continue;
    const c = cajaQueSeVe(el, svgs);
    if (c) tocables.push(c);
  }
  const naturales = new Map(vivas.map(({ el }) => [el, cajaDe(el.getBoundingClientRect())]));
  // Lo que se traslada vive en el hilo de su caja, sin bordes propios: crece
  // hacia abajo, como la barra en la que va.
  const anclas = new Map(vivas.map(({ d, el }) => [el, d.traslada ? "arriba" : anclaDe(el)]));
  const limites: Caja = { izq: 0, arr: 0, der: innerWidth, aba: innerHeight };
  const ocupado: Caja[] = [...tocables, ...delAvion];
  const hecho: Record<string, string> = {};
  vivas.forEach(({ d, el }, i) => {
    const natural = naturales.get(el);
    if (!natural) return;
    const cs = getComputedStyle(el);
    const px = (v: string): number => Number.parseFloat(v) || 0;
    const ancla = anclas.get(el) ?? "arriba";
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
      .filter((o) => o.d.mueve && anclas.get(o.el) === ancla)
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
    if (d.traslada) {
      const libre = !ocupado.some((o) => pisa(natural, o));
      const llevada = libre ? natural : trasladar(natural, ancla, sitios, ocupado, limites);
      if (llevada) {
        if (llevada !== natural) {
          el.dataset.reparto = "1";
          el.style.translate = `${(llevada.izq - natural.izq) / escala}px ${(llevada.arr - natural.arr) / escala}px`;
        }
        ocupado.push(llevada);
        hecho[d.que] = llevada === natural ? "en su sitio" : "trasladada";
        return;
      }
    }
    const sitio = d.traslada
      ? null
      : colocar(
          { natural, hueco, ancla, sitios, mueve: d.mueve, alOtroLado: d.pideSitio },
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
    if (d.estrechaEnSuSitio) {
      /*
       * Estrechada, la frase va en una línea más y la tarjeta crece hacia
       * abajo: si así pisa otra cosa, se vuelve a mirar hasta dónde con lo que
       * mide ahora. Dos vueltas bastan, que estrechar solo hace crecer.
       */
      let caja = natural;
      for (let vuelta = 0; vuelta < 2; vuelta++) {
        const hasta = hastaDondeEnSuSitio(caja, ocupado);
        if (hasta === null) break;
        el.dataset.reparto = "1";
        el.style.maxWidth = `${(hasta - natural.izq) / escala}px`;
        caja = cajaDe(el.getBoundingClientRect());
        if (!ocupado.some((o) => pisa(caja, o)) && caja.aba <= limites.aba + 1) {
          ocupado.push(caja);
          hecho[d.que] = "estrechada";
          return;
        }
      }
      if (el.dataset.reparto) {
        for (const p of PROPIEDADES) el.style.removeProperty(p);
        delete el.dataset.reparto;
      }
    }
    if (d.recoge) {
      /*
       * Recogida, se vuelve a buscar sitio con lo que mide así: la lámpara sin
       * la frase de la orden es la luz y la fila de aviones, una línea, y cabe
       * en la franja que deja el aviso cuando entera no cabía (H28g).
       */
      el.classList.add(d.recoge);
      const recogida = cajaDe(el.getBoundingClientRect());
      const sitioRecogida = colocar(
        { natural: recogida, hueco, ancla, sitios, mueve: d.mueve, alOtroLado: d.pideSitio },
        ocupado,
        limites,
        probar,
      );
      if (sitioRecogida) {
        if (sitioRecogida === recogida && el.dataset.reparto) {
          for (const p of PROPIEDADES) el.style.removeProperty(p);
          delete el.dataset.reparto;
        }
        ocupado.push(sitioRecogida);
        hecho[d.que] = "recogida";
        return;
      }
      if (el.dataset.reparto) {
        for (const p of PROPIEDADES) el.style.removeProperty(p);
        delete el.dataset.reparto;
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
  /** Lo que el avión enseña y no se tapa: ver `ponerLoDelAvion`. */
  private delAvion: readonly Caja[] = [];
  private readonly alCambiarDeTamano = (): void => this.pedir(true);
  /**
   * **Lo que se lleva**, para que un banco lo mida con la CPU frenada (regla
   * 6): los fotogramas en que se miró la firma, las veces que se repartió y
   * los milisegundos de las dos cosas. Dos lecturas del reloj por fotograma.
   *
   * Con `separar`, que solo pone el banco, antes de repartir se hace la
   * maqueta que el juego dejó pendiente y se cuenta aparte (`msMaqueta`): esa
   * la paga el navegador igual al pintar, y lo que es del reparto es lo demás.
   */
  readonly gasto = {
    miradas: 0,
    repartos: 0,
    ms: 0,
    msReparto: 0,
    msMaqueta: 0,
    maximo: 0,
    separar: false,
  };

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

  /** Que se reparta ya, con lo que haya. Devuelve lo que se ha decidido. */
  ahora(): Record<string, string> {
    this.firma = this.firmaDeAhora();
    this.forzar = false;
    return repartirLoQueSeLee(this.raiz, this.delAvion);
  }

  /**
   * **Lo que el avión enseña desde el asiento y no se tapa**, en píxeles de
   * pantalla —la brújula del parabrisas—, o nada. Se reparte otra vez solo si
   * cambia: lo pone el juego dos veces por segundo (H31a).
   */
  ponerLoDelAvion(cajas: readonly Caja[]): void {
    const clave = (cs: readonly Caja[]): string =>
      cs.map((c) => `${Math.round(c.izq)},${Math.round(c.arr)},${Math.round(c.der)},${Math.round(c.aba)}`).join("|");
    if (clave(cajas) === clave(this.delAvion)) return;
    this.delAvion = cajas;
    this.pedir(true);
  }

  /** Que se reparta en el fotograma que viene; `forzar` aunque no cambie la firma. */
  pedir(forzar: boolean): void {
    this.forzar ||= forzar;
    if (this.pedido || typeof requestAnimationFrame === "undefined") return;
    this.pedido = requestAnimationFrame(() => {
      this.pedido = 0;
      const t0 = performance.now();
      const firma = this.firmaDeAhora();
      const g = this.gasto;
      g.miradas++;
      if (this.forzar || firma !== this.firma) {
        this.forzar = false;
        this.firma = firma;
        if (g.separar) {
          const tm = performance.now();
          this.raiz.getBoundingClientRect();
          g.msMaqueta += performance.now() - tm;
        }
        const t1 = performance.now();
        repartirLoQueSeLee(this.raiz, this.delAvion);
        const ms = performance.now() - t1;
        g.repartos++;
        g.msReparto += ms;
        g.maximo = Math.max(g.maximo, ms);
      }
      g.ms += performance.now() - t0;
    });
  }

  /** Lo que se mira para saber si ha cambiado algo, sin maquetar. */
  private firmaDeAhora(): string {
    /*
     * Sin el tamaño de la ventana: leer `innerWidth` con la página por
     * maquetar obliga a maquetar en el acto, y esto se mira en cada
     * fotograma. Medido en la tablet (CPU ×4), era casi todo lo que costaba
     * (ADR 0030, H28g). Un cambio de tamaño ya pide reparto por su cuenta
     * (`resize`, y el `ResizeObserver` de la barra).
     */
    const partes = [this.raiz.className];
    for (const d of LO_QUE_SE_LEE) {
      const el = this.raiz.querySelector<HTMLElement>(d.sel);
      if (!el) continue;
      const cls = el.className.replace(ESPERA, "").replace(RECOGIDA, "");
      partes.push(`${el.hidden ? 0 : 1}${cls}${d.cuentaSola ? "" : (el.textContent ?? "")}`);
    }
    return partes.join("|");
  }
}

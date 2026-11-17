/**
 * **La carta se toca** (#72): tocar un elemento de la carta y que diga qué es,
 * por rótulo y por voz.
 *
 * Una carta de verdad no se aprende leyendo su leyenda, sino preguntando «¿y
 * esto qué es?» a quien la sabe leer. Aquí no se le puede preguntar a nadie,
 * pero se puede tocar: la pista, una radioayuda, el círculo de la MSA, un
 * punto del perfil, los mínimos o la frustrada. Lo tocado se ilumina, sale su
 * rótulo —**el nombre aeronáutico tal cual**, «VOR», «MAPt», «OCA (OCH)», y
 * debajo una glosa corta en el idioma del juego (regla 3)— y la instructora lo
 * explica en una frase, como a quien lo ve por primera vez.
 *
 * ## Lo mismo en las tres hojas
 *
 * La ficha del campo y la carta de aproximación, que son HTML y SVG del
 * hangar, y el plano en vuelo, que es un lienzo. Las dos primeras marcan lo
 * que se toca con `data-toca` —ver `atributosDe`— y lo encuentra
 * `tocadoEn`; el plano sabe dónde pintó cada cosa y pregunta aquí lo demás.
 * Qué es cada tipo, cómo se rotula y qué se dice está **en una sola tabla**,
 * `TOCABLES`, para que la prueba pueda mirar que no falta nada.
 *
 * ## Por peldaños, como todo
 *
 * Solo existe lo que dibuja el calco del peldaño (`calcosDe`): en Guyrami, la
 * pista, el campo, el norte y tu avión; las radioayudas, las frecuencias y la
 * carta de aproximación, en el calco de la radio. Y lo que se enseña al
 * tocarlo sigue la escalera de comunicación: **la voz y el brillo en los
 * cuatro**; el rótulo con su glosa desde Tukã; y la frase entera escrita
 * desde Taguato, que es el gemelo de la voz para quien juega sin sonido.
 *
 * ## Con el dedo, y sin robarle el gesto a nadie
 *
 * Se atiende al `click`, que el navegador no da si el dedo arrastró: rodar la
 * ficha o la carta de aproximación sigue rodando. Y la diana mide 44 px como
 * mínimo aunque el símbolo mida 14: si debajo del dedo no hay nada, se mira
 * alrededor, a 11 y a 22 px, y gana lo más cercano. Nada de esto toca el
 * DOM de la carta: el rótulo y el brillo van encima, sin pisar los toques.
 *
 * ## La frecuencia, y la radio que no hay
 *
 * Tocar una frecuencia la explica, y **la pondría en la radio** si el avión
 * tuviera una que se sintoniza. El juego no la tiene: la torre que se oye es
 * la del campo en el que se está, y la dependencia cambia sola (ver
 * `flight/dependencia.ts`). No se inventa una: queda el gancho,
 * `ponerRadioDeLaCarta`, para el día que exista.
 */

import { calcosDe, canalesDe, type Peldano } from "../../flight/escalera";
import { t, type TranslationKey } from "../../i18n";
import type { ClaseDeEstacion, Estacion } from "../../world/radioayudas-publicadas";
import { cajaDeRadioayuda } from "./radioayudas";

/** Los tipos de cosa que se tocan en una carta. Uno por tipo, no uno por radioayuda. */
export type Tocable =
  | "pista"
  | "calle"
  | "plataforma"
  | "aerodromo"
  | "avion"
  | "norte"
  | "vor"
  | "dme"
  | "ndb"
  | "ils"
  | "twr"
  | "atis"
  | "app"
  | "gnd"
  | "afis"
  | "frecuencia"
  | "msa"
  | "taa"
  | "if"
  | "faf"
  | "mapt"
  | "minimos"
  | "frustrada";

/** De qué calco es: el territorio va en los cuatro peldaños; la radio, en el de cabina. */
type CalcoDe = "territorio" | "radio";

interface ComoEs {
  readonly calco: CalcoDe;
  /**
   * El rótulo aeronáutico de serie, **sin traducir**, si el elemento no trae
   * el suyo: «RWY», «VOR», «OCA (OCH)». Tu avión no lleva ninguno.
   */
  readonly rotulo: string | null;
  /**
   * **En qué radio se pone su frecuencia**, si tiene una: la de hablar (COM),
   * la de navegar (NAV) o la del NDB (ADF), que en un avión son tres cajas.
   */
  readonly radio?: "com" | "nav" | "adf";
}

/**
 * **Lo que hay que saber de cada tipo.** La glosa y la frase salen de su
 * nombre: `carta.toca.<tipo>.corta` y `carta.toca.<tipo>`.
 */
export const TOCABLES: Readonly<Record<Tocable, ComoEs>> = {
  pista: { calco: "territorio", rotulo: "RWY" },
  calle: { calco: "territorio", rotulo: "TWY" },
  plataforma: { calco: "territorio", rotulo: "APRON" },
  aerodromo: { calco: "territorio", rotulo: "AD" },
  avion: { calco: "territorio", rotulo: null },
  norte: { calco: "territorio", rotulo: "N" },
  vor: { calco: "radio", rotulo: "VOR", radio: "nav" },
  // Un DME suelto no tiene frecuencia que poner: se elige por el VOR o el ILS de al lado.
  dme: { calco: "radio", rotulo: "DME" },
  ndb: { calco: "radio", rotulo: "NDB", radio: "adf" },
  ils: { calco: "radio", rotulo: "ILS", radio: "nav" },
  twr: { calco: "radio", rotulo: "TWR", radio: "com" },
  atis: { calco: "radio", rotulo: "ATIS", radio: "com" },
  app: { calco: "radio", rotulo: "APP", radio: "com" },
  gnd: { calco: "radio", rotulo: "GND", radio: "com" },
  afis: { calco: "radio", rotulo: "AFIS", radio: "com" },
  frecuencia: { calco: "radio", rotulo: null, radio: "com" },
  msa: { calco: "radio", rotulo: "MSA" },
  taa: { calco: "radio", rotulo: "TAA" },
  if: { calco: "radio", rotulo: "IF" },
  faf: { calco: "radio", rotulo: "FAF" },
  mapt: { calco: "radio", rotulo: "MAPt" },
  minimos: { calco: "radio", rotulo: "OCA (OCH)" },
  frustrada: { calco: "radio", rotulo: "MISSED APCH" },
};

export const TIPOS_TOCABLES = Object.keys(TOCABLES) as Tocable[];

export const esTocable = (s: string | null | undefined): s is Tocable =>
  !!s && Object.prototype.hasOwnProperty.call(TOCABLES, s);

/** La clave de la frase que dice la instructora. */
export const fraseDe = (tipo: Tocable): TranslationKey => `carta.toca.${tipo}` as TranslationKey;
/** La clave de la glosa corta que va debajo del rótulo. */
export const glosaDe = (tipo: Tocable): TranslationKey => `carta.toca.${tipo}.corta` as TranslationKey;

/** **Si en este peldaño existe**: lo que no dibuja su calco no se toca. */
export function seTocaEn(tipo: Tocable, peldano: Peldano): boolean {
  return TOCABLES[tipo].calco === "territorio" || calcosDe(peldano).radio;
}

/** La radioayuda de un símbolo, por su clase: un VOR/DME es un VOR con su cuadrado. */
export function tocableDeEstacion(clase: ClaseDeEstacion): Tocable {
  return clase === "VOR" || clase === "VOR/DME" ? "vor" : clase === "DME" ? "dme" : clase === "NDB" ? "ndb" : "ils";
}

/**
 * **Las marcas de una estación**, con su rótulo como en su caja —«VOR/DME
 * TFN 117.700», «ILS 12 INOR 108.700»— y su frecuencia en megahercios, la
 * del NDB también.
 */
export function marcaDeEstacion(e: Estacion): string {
  const { titulo } = cajaDeRadioayuda(e);
  const cifra = e.cifra ? Number(e.cifra) : NaN;
  const mhz = Number.isFinite(cifra) ? (e.unidad === "kHz" ? cifra / 1000 : cifra) : undefined;
  return atributosDe(tocableDeEstacion(e.clase), e.clase === "ILS" ? titulo : `${e.clase} ${titulo}`, { mhz });
}

/** El servicio de una frecuencia, como lo escribe el AIP, en su tipo. SMC es la rodadura de ENAIRE. */
export function tocableDeServicio(servicio: string): Tocable {
  const s = servicio.toUpperCase();
  return s === "TWR"
    ? "twr"
    : s === "ATIS"
      ? "atis"
      : s === "APP"
        ? "app"
        : s === "GND" || s === "SMC"
          ? "gnd"
          : s === "AFIS"
            ? "afis"
            : "frecuencia";
}

/** El punto del perfil por su rótulo de la carta: el FAP de una de precisión es su FAF. */
export function tocableDePunto(rotulo: string | undefined): Tocable | null {
  return rotulo === "IF" ? "if" : rotulo === "FAF" || rotulo === "FAP" ? "faf" : rotulo === "MAPT" || rotulo === "MAPt" ? "mapt" : null;
}

const escapar = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * **Los atributos que marcan algo como tocable**, para el marcado de la
 * ficha y de la carta de aproximación. `rotulo` es el que lleva ese elemento
 * en la carta —«RWY 12», «TFN 117.700»—, si no basta el de serie.
 */
export function atributosDe(tipo: Tocable, rotulo?: string | null, extra?: { readonly mhz?: number }): string {
  return `data-toca="${tipo}"${rotulo ? ` data-rotulo="${escapar(rotulo)}"` : ""}${extra?.mhz ? ` data-mhz="${extra.mhz}"` : ""}`;
}

/** **Lo que se enseña al tocarlo, ya decidido**: lo que se pinta y lo que se dice. */
export interface ComoSeDice {
  readonly tipo: Tocable;
  /** El rótulo aeronáutico, o `null` si en este peldaño no hay letras. */
  readonly rotulo: string | null;
  /** La glosa corta, traducida, o `null`. */
  readonly glosa: string | null;
  /** La frase entera escrita, desde el peldaño de las cifras, o `null`. */
  readonly texto: string | null;
  /** Para el lector de pantalla, que no pasa por la escalera: va siempre. */
  readonly nombre: string;
  /** Lo que dice la instructora, en los cuatro peldaños. */
  readonly voz: { readonly clave: TranslationKey; readonly texto: string };
}

/**
 * **Cómo se cuenta lo tocado en este peldaño.** Como `comoSeEnsena` en
 * `ui/explicaciones.ts`: el rótulo y la glosa desde que hay letras, la frase
 * entera desde las cifras, y la voz siempre.
 */
export function comoSeDice(tipo: Tocable, peldano: Peldano, rotuloPropio?: string | null): ComoSeDice {
  const c = canalesDe(peldano);
  const rotulo = rotuloPropio || TOCABLES[tipo].rotulo;
  const glosa = t(glosaDe(tipo));
  const texto = t(fraseDe(tipo));
  return {
    tipo,
    rotulo: c.texto ? rotulo : null,
    glosa: c.texto ? glosa : null,
    texto: c.texto && !c.corto ? texto : null,
    nombre: rotulo ? `${rotulo} · ${glosa}` : glosa,
    voz: { clave: fraseDe(tipo), texto },
  };
}

// ── La frecuencia y la radio ────────────────────────────────────────────

/** Una frecuencia tocada en la carta. */
export interface FrecuenciaTocada {
  readonly tipo: Tocable;
  /** En qué radio va. Ver `ComoEs.radio`. */
  readonly radio: "com" | "nav" | "adf";
  /** En megahercios también la del NDB, que se publica en kilohercios: 376 kHz son 0,376. */
  readonly mhz: number;
  /** Como va escrita: «TWR 118.700». */
  readonly rotulo: string;
}

/**
 * **El gancho de la radio**: quien tenga una radio que se sintoniza la
 * enchufa aquí. Hoy no la enchufa nadie, porque el juego no tiene ninguna.
 */
export interface RadioDeLaCarta {
  /** Si el avión de ahora lleva una radio donde va esta frecuencia. */
  lleva(f: FrecuenciaTocada): boolean;
  /** La pone, y dice si quedó puesta. Lo que se ve y se oye al ponerla es cosa de la radio. */
  poner(f: FrecuenciaTocada): boolean;
}

let radio: RadioDeLaCarta | null = null;

/** Enchufa la radio, o la quita con `null`. */
export function ponerRadioDeLaCarta(r: RadioDeLaCarta | null): void {
  radio = r;
}

/**
 * **Tocar una frecuencia la pone en la radio**, si el peldaño tiene radio y
 * el avión la lleva. Devuelve si quedó puesta; sin radio enchufada, nunca.
 */
export function sintonizar(f: FrecuenciaTocada, peldano: Peldano): boolean {
  if (!TOCABLES[f.tipo].radio || !calcosDe(peldano).radio || !radio) return false;
  if (!radio.lleva(f)) return false;
  return radio.poner(f);
}

// ── En la página: qué hay debajo del dedo ──────────────────────────────

/** Lo que tiene que encoger lo de debajo para ganarle a lo de encima: a la cuarta parte. */
const MUCHO_MAS_CHICO = 0.25;

/** Hasta dónde se mira alrededor del dedo, px: la mitad de una diana de 44. */
export const DIANA = 22;

/** Los anillos donde se mira si debajo del dedo no hay nada: a 11 y a 22 px, ocho rumbos cada uno. */
const ALREDEDOR: readonly (readonly [number, number])[] = [DIANA / 2, DIANA].flatMap((r) =>
  Array.from({ length: 8 }, (_, i) => [Math.cos((i * Math.PI) / 4) * r, Math.sin((i * Math.PI) / 4) * r] as const),
);

/**
 * **Lo tocable que hay debajo del dedo**, dentro de `dentro`, o `null`.
 *
 * Lo pregunta al navegador con `elementsFromPoint`, que sabe la forma de cada
 * trazo del SVG —el de una pista en diagonal no es su caja—, y si en el punto
 * no hay nada, alrededor. Así la diana es de 44 px sin poner dianas
 * invisibles en la carta. Lo que no está en este peldaño no lleva marca.
 */
export function tocadoEn(dentro: Element, x: number, y: number): HTMLElement | SVGElement | null {
  const doc = dentro.ownerDocument;
  if (!doc || typeof doc.elementFromPoint !== "function") return null;
  /*
   * Lo de la hoja de encima, que es lo que se ve: con la carta de
   * aproximación abierta la ficha sigue debajo, y no se toca a través de
   * ella. Y de lo que hay en ese punto, lo de encima salvo que debajo asome
   * algo mucho más chico: el VOR de Los Rodeos está en la punta de la pista,
   * medio tapado por ella, y quien lo toca quiere el VOR.
   */
  const mirar = (px: number, py: number): HTMLElement | SVGElement | null => {
    const arriba = doc.elementFromPoint(px, py);
    if (!arriba || !dentro.contains(arriba)) return null;
    // Un botón o una etiqueta que hacen otra cosa mandan sobre lo de debajo.
    if (arriba.closest("button, label, a, input")) return null;
    const hoja = arriba.closest(".iac, .ficha-carta__hoja") ?? dentro;
    let mejor: HTMLElement | SVGElement | null = null;
    let area = Infinity;
    for (const el of doc.elementsFromPoint(px, py)) {
      if (!hoja.contains(el)) continue;
      const marcado = el.closest<HTMLElement | SVGElement>("[data-toca]");
      if (!marcado || !hoja.contains(marcado) || marcado === mejor) continue;
      const r = marcado.getBoundingClientRect();
      const a = r.width * r.height;
      if (!mejor || a < area * MUCHO_MAS_CHICO) {
        mejor = marcado;
        area = a;
      }
    }
    return mejor;
  };
  const aqui = mirar(x, y);
  if (aqui) return aqui;
  for (const [dx, dy] of ALREDEDOR) {
    const cerca = mirar(x + dx, y + dy);
    if (cerca) return cerca;
  }
  return null;
}

/** La frecuencia de lo tocado, si tiene una que se pone en una radio. */
export function frecuenciaDe(marca: { tipo: Tocable; rotulo: string | null; mhz: number | null }): FrecuenciaTocada | null {
  const radio = TOCABLES[marca.tipo].radio;
  if (!radio || !marca.mhz) return null;
  return { tipo: marca.tipo, radio, mhz: marca.mhz, rotulo: marca.rotulo ?? TOCABLES[marca.tipo].rotulo ?? "" };
}

/** Lo que lleva escrito un elemento marcado: su tipo, su rótulo y su frecuencia. */
export function leerMarca(el: Element): { tipo: Tocable; rotulo: string | null; mhz: number | null } | null {
  const tipo = el.getAttribute("data-toca");
  if (!esTocable(tipo)) return null;
  const mhz = Number(el.getAttribute("data-mhz"));
  return { tipo, rotulo: el.getAttribute("data-rotulo"), mhz: Number.isFinite(mhz) && mhz > 0 ? mhz : null };
}

// ── Lo que se pinta encima ─────────────────────────────────────────────

/** Cuánto se queda el rótulo a la vista si nadie toca otra cosa, ms. */
export const DURA_EL_ROTULO = 7000;

const relojes = new WeakMap<Element, ReturnType<typeof setTimeout>>();

/**
 * **El rótulo de lo tocado**, en una franja del ancho de su hoja —el texto
 * ocupa su caja, no una columna estrecha—, encima o debajo de lo tocado según
 * dónde haya sitio, y sin recibir toques: el siguiente toque pasa a la carta.
 * En Guyrami no lleva letra: solo el brillo, y la voz.
 *
 * `hoja` es donde va la franja; `donde`, la caja de lo tocado en la página.
 */
export function ensenarRotulo(hoja: HTMLElement, como: ComoSeDice, donde: DOMRect | null, puesta = false): void {
  let franja = hoja.querySelector<HTMLElement>(":scope > .toque-rotulo");
  if (!franja) {
    franja = hoja.ownerDocument.createElement("div");
    franja.className = "toque-rotulo";
    franja.setAttribute("role", "status");
    franja.setAttribute("aria-live", "polite");
    hoja.appendChild(franja);
  }
  const conLetra = como.rotulo !== null || como.glosa !== null;
  franja.hidden = !conLetra;
  franja.classList.toggle("toque-rotulo--puesta", puesta);
  const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  franja.innerHTML = conLetra
    ? `<span class="toque-rotulo__cabeza">${como.rotulo ? `<b>${esc(como.rotulo)}</b>` : ""}${como.glosa ? `<span>${esc(como.glosa)}</span>` : ""}${
        puesta ? `<i>${esc(t("carta.toca.puesta"))}</i>` : ""
      }</span>${como.texto ? `<span class="toque-rotulo__texto">${esc(como.texto)}</span>` : ""}`
    : "";
  if (!conLetra) franja.setAttribute("aria-label", como.nombre);
  else franja.removeAttribute("aria-label");
  /*
   * Encima de lo tocado si cabe, y si no, debajo: la franja no tapa lo que
   * se está explicando.
   */
  const caja = hoja.getBoundingClientRect();
  franja.style.top = "";
  franja.style.bottom = "6px";
  if (donde && conLetra) {
    const alto = franja.offsetHeight + 12;
    const arriba = donde.top - caja.top;
    const abajo = caja.bottom - donde.bottom;
    /*
     * Donde quepa entera sin tapar lo tocado; si no cabe ni encima ni
     * debajo, pegada al borde del lado con más sitio, que tapa lo menos.
     */
    if (arriba >= alto) franja.style.bottom = `${caja.bottom - donde.top + 6}px`;
    else if (abajo >= alto) {
      franja.style.bottom = "";
      franja.style.top = `${donde.bottom - caja.top + 6}px`;
    } else if (arriba > abajo) {
      franja.style.bottom = "";
      franja.style.top = "6px";
    }
  }
  const antes = relojes.get(hoja);
  if (antes) clearTimeout(antes);
  relojes.set(
    hoja,
    setTimeout(() => quitarRotulo(hoja), DURA_EL_ROTULO),
  );
}

/** Quita el rótulo y el brillo de una hoja. */
export function quitarRotulo(hoja: HTMLElement): void {
  const franja = hoja.querySelector<HTMLElement>(":scope > .toque-rotulo");
  if (franja) {
    franja.hidden = true;
    franja.innerHTML = "";
  }
  for (const el of hoja.querySelectorAll(".toque-tocado")) el.classList.remove("toque-tocado");
  hoja.querySelector<HTMLElement>(":scope .toque-aro")?.remove();
}

/** **El brillo de lo tocado**: el elemento mismo, iluminado, que es lo que se explica. */
export function iluminar(hoja: HTMLElement, el: Element): void {
  for (const otro of hoja.querySelectorAll(".toque-tocado")) if (otro !== el) otro.classList.remove("toque-tocado");
  el.classList.add("toque-tocado");
}

/**
 * **Toca en una hoja de HTML** —la ficha del campo o la carta de
 * aproximación—: busca lo tocado, lo ilumina, pone su rótulo y devuelve qué
 * decir y qué frecuencia era, o `null` si no había nada que se toque.
 */
export function tocarEnLaHoja(
  hoja: HTMLElement,
  x: number,
  y: number,
  peldano: Peldano,
): { como: ComoSeDice; frecuencia: FrecuenciaTocada | null; puesta: boolean } | null {
  const el = tocadoEn(hoja, x, y);
  const marca = el ? leerMarca(el) : null;
  if (!el || !marca || !seTocaEn(marca.tipo, peldano)) return null;
  const como = comoSeDice(marca.tipo, peldano, marca.rotulo);
  const frecuencia = frecuenciaDe(marca);
  const puesta = frecuencia ? sintonizar(frecuencia, peldano) : false;
  iluminar(hoja, el);
  ensenarRotulo(hoja, como, el.getBoundingClientRect(), puesta);
  return { como, frecuencia, puesta };
}

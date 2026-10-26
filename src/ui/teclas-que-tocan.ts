/**
 * **Las teclas que tocan, dibujadas**: la tecla que pide el paso, entre sus
 * vecinas y encendida, en un lado de la pantalla. Qué tecla y cuándo lo decide
 * `flight/teclas-que-tocan.ts`; esto la dibuja con el mando que se tenga en la
 * mano, que es lo que ya hace el modo inicio —`ui/inicio.ts`—, y de ahí sale
 * el dibujo de cada tecla: se reutiliza, no se copia.
 *
 * - **Con teclado**, la tecla con las de sus lados, como están en el teclado:
 *   las flechas en su cruz invertida —la de subir arriba y las otras tres
 *   debajo—, el gas con su pareja, el menos y el más, y una letra con la de su
 *   izquierda y la de su derecha en la misma fila. **Juntas a propósito**:
 *   una tecla suelta en medio de la nada no dice en qué parte del teclado
 *   buscarla, y el teclado entero no dice cuál.
 * - **Con un mando de consola o un joystick**, el mando con el botón o la
 *   palanca que toca encendidos: los flaps en los gatillos de arriba, el tren
 *   en la Y; en el HOTAS, los botones de la base de gases.
 * - **Con el dedo**, el mando de la pantalla dibujado y **un dedo encima del
 *   de verdad**, como en el modo inicio: el botón de los flaps, el del tren,
 *   la palanca o el gas.
 *
 * Y debajo, pequeño, **«ya me lo aprendí»**, que la retira para siempre en ese
 * perfil. Es un botón de una yema, aunque se vea pequeño: lo pequeño es el
 * dibujo, no lo que se toca.
 *
 * Las funciones de dibujo devuelven texto y no tocan el DOM, para poder
 * probarlas sin navegador. `PistaDeTeclas` es lo único que lo toca.
 */

import type { Accion } from "../flight/keymap";
import { nombreDeTecla } from "../flight/keymap";
import type { Mando } from "../flight/mandos-fisicos";
import type { Gesto } from "../flight/inicio";
import type { TeclaQueToca } from "../flight/teclas-que-tocan";
import { ACCION_DE } from "../flight/teclas-que-tocan";
import { t } from "../i18n";
import { dibujoDelGesto, lasFlechas, MANO_QUE_SENALA, tecla, type ConQueTeclas } from "./inicio";
import { motorMas, motorMenos } from "./pictogramas";
import { DIBUJOS } from "./senal";

/**
 * **Las filas del teclado**, por código de tecla, como están en cualquier
 * teclado de ordenador: es la posición física y no la letra, así que vale
 * igual para el español, el americano o el francés. De aquí salen las vecinas
 * de una tecla.
 */
const FILAS_DEL_TECLADO: readonly (readonly string[])[] = [
  ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0"],
  ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP"],
  ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL"],
  ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM"],
];

/**
 * **Las vecinas de una tecla en su fila**: la de la izquierda, ella y la de la
 * derecha —dos si está en una punta—. Si la tecla no está en las filas de
 * letras y números —la barra, el punto—, va sola.
 */
export function vecinasDe(codigo: string): readonly string[] {
  for (const fila of FILAS_DEL_TECLADO) {
    const i = fila.indexOf(codigo);
    if (i < 0) continue;
    return fila.slice(Math.max(0, i - 1), Math.min(fila.length, i + 2));
  }
  return [codigo];
}

/** El dibujo de lo que hace cada tecla, en la que se enciende. */
function glifoDe(que: TeclaQueToca, o: ConQueTeclas): string {
  switch (que) {
    case "flaps":
      return DIBUJOS.flaps;
    case "tren":
      return DIBUJOS.tren;
    case "aerofrenos":
      return DIBUJOS.aerofrenos;
    case "masGas":
      return motorMas(o.chorro);
    case "menosGas":
      return motorMenos(o.chorro);
    default:
      return "";
  }
}

/** Con teclado: la tecla con sus vecinas, la buena encendida. Ver la cabecera. */
function conTeclado(que: TeclaQueToca, o: ConQueTeclas): string {
  const letra = (a: Accion): string => nombreDeTecla(o.teclaDe(a));
  if (que === "subir") return lasFlechas("arriba", o);
  if (que === "bajar") return lasFlechas("abajo", o);
  if (que === "masGas" || que === "menosGas")
    return `
      <span class="inicio__fila">
        ${tecla(motorMenos(o.chorro), letra("throttleDown"), que === "menosGas")}
        ${tecla(motorMas(o.chorro), letra("throttleUp"), que === "masGas")}
      </span>`;
  const suya = o.teclaDe(ACCION_DE[que]);
  return `
    <span class="inicio__fila">
      ${vecinasDe(suya)
        .map((k) => (k === suya ? tecla(glifoDe(que, o), nombreDeTecla(k), true) : tecla("", nombreDeTecla(k), false)))
        .join("")}
    </span>`;
}

/** El gesto del modo inicio que corresponde a cada tecla, si lo hay. */
const GESTO: Partial<Record<TeclaQueToca, Gesto>> = {
  subir: "subir",
  bajar: "bajar",
  masGas: "gas",
  menosGas: "menosGas",
};

/**
 * **El mando de consola con el botón que toca**: los gatillos de arriba para
 * los flaps —el derecho los saca una muesca—, la Y para el tren y la X para
 * los aerofrenos. Es el reparto de `flight/mandos-fisicos.ts`, y el cuerpo es
 * el mismo dibujo del modo inicio, más sencillo.
 */
function consolaConBoton(que: "flaps" | "tren" | "aerofrenos"): string {
  const activo = (si: boolean): string => (si ? " dib__parte--activa" : "");
  const late = (si: boolean): string => (si ? "dib__late" : "");
  return `
    <svg class="dib dib--consola" viewBox="0 -24 240 174" aria-hidden="true">
      <path class="dib__parte dib__gatillo" d="M44 32 q4-20 26-22 h14 q8 0 8 10 v8 Z" />
      <g class="${late(que === "flaps")}">
        <path class="dib__parte dib__gatillo${activo(que === "flaps")}" d="M196 32 q-4-20 -26-22 h-14 q-8 0 -8 10 v8 Z" />
      </g>
      <path class="dib__cuerpo" d="M64 26 h112 c26 0 40 14 46 40 l10 46 c4 20-18 32-32 18 l-22-24 h-116
        l-22 24 c-14 14-36 2-32-18 l10-46 c6-26 20-40 46-40 Z" />
      <circle class="dib__hueco" cx="72" cy="62" r="21" />
      <circle class="dib__parte" cx="72" cy="62" r="13" />
      <path class="dib__hueco" d="M90 96 h8 v-8 h8 v8 h8 v8 h-8 v8 h-8 v-8 h-8 Z" />
      <circle class="dib__hueco" cx="150" cy="102" r="17" />
      <circle class="dib__parte" cx="150" cy="102" r="10" />
      <g class="${late(que === "tren")}"><circle class="dib__boton${activo(que === "tren")}" cx="184" cy="48" r="7" /></g>
      <circle class="dib__boton" cx="198" cy="62" r="7" />
      <g class="${late(que === "aerofrenos")}"><circle class="dib__boton${activo(que === "aerofrenos")}" cx="170" cy="62" r="7" /></g>
      <circle class="dib__boton" cx="184" cy="76" r="7" />
    </svg>`;
}

/**
 * **El HOTAS con el botón que toca**: los flaps en el 6 de la base de gases
 * —una muesca abajo—, el tren en el 7 y los aerofrenos en el botón del
 * pulgar. Ver `flight/mandos-fisicos.ts`.
 */
function joystickConBoton(que: "flaps" | "tren" | "aerofrenos"): string {
  const activo = (si: boolean): string => (si ? "dib__parte dib__parte--activa" : "dib__hueco");
  const late = (si: boolean): string => (si ? "dib__late" : "");
  return `
    <svg class="dib dib--joystick" viewBox="0 0 240 150" aria-hidden="true">
      <rect class="dib__cuerpo" x="14" y="98" width="88" height="40" rx="10" />
      <rect class="dib__hueco" x="52" y="34" width="14" height="74" rx="7" />
      <rect class="dib__parte" x="36" y="86" width="46" height="24" rx="9" />
      <rect class="dib__hueco" x="20" y="116" width="12" height="12" rx="3" />
      <g class="${late(que === "flaps")}"><rect class="${activo(que === "flaps")}" x="36" y="116" width="12" height="12" rx="3" /></g>
      <g class="${late(que === "tren")}"><rect class="${activo(que === "tren")}" x="52" y="116" width="12" height="12" rx="3" /></g>
      <ellipse class="dib__cuerpo" cx="170" cy="126" rx="50" ry="17" />
      <rect class="dib__parte" x="158" y="28" width="24" height="98" rx="11" />
      <g class="${late(que === "aerofrenos")}"><rect class="${activo(que === "aerofrenos")}" x="162" y="34" width="16" height="12" rx="4" /></g>
    </svg>`;
}

/** Con el dedo, el botón de la pantalla dibujado, con un dedo que lo toca. */
function botonConDedo(que: "flaps" | "tren" | "aerofrenos"): string {
  return `
    <span class="ttq__boton">
      ${DIBUJOS[que]}
      <svg class="inicio__toque" viewBox="-24 -6 48 52" aria-hidden="true">${MANO_QUE_SENALA}</svg>
    </span>`;
}

/**
 * **El dibujo de la tecla que toca**, con el mando que se tiene en la mano.
 * Lleva qué tecla y con qué mando en sus atributos, que es como lo encuentran
 * las pruebas y el banco.
 */
export function dibujoDeLaTecla(que: TeclaQueToca, mando: Mando, o: ConQueTeclas): string {
  const gesto = GESTO[que];
  let dibujo: string;
  if (mando === "teclado") dibujo = `<span class="inicio__mando inicio__mando--teclado">${conTeclado(que, o)}</span>`;
  else if (gesto) dibujo = dibujoDelGesto(gesto, mando, 0, o);
  else {
    const boton = que as "flaps" | "tren" | "aerofrenos";
    dibujo = `<span class="inicio__mando inicio__mando--${mando}">${
      mando === "consola"
        ? consolaConBoton(boton)
        : mando === "joystick"
          ? joystickConBoton(boton)
          : botonConDedo(boton)
    }</span>`;
  }
  return `<span class="ttq__dibujo" data-tecla="${que}" data-mando="${mando}">${dibujo}</span>`;
}

/**
 * **A qué mando de la pantalla señala el dedo de encima**, con el dedo: la
 * palanca para subir y bajar, el gas para el gas y los botones de flaps, tren
 * y aerofrenos para lo suyo. Sin dedo, a ninguno.
 */
export function mandoSenalado(que: TeclaQueToca, mando: Mando): string | null {
  if (mando !== "dedo") return null;
  switch (que) {
    case "subir":
    case "bajar":
      return '#tactil [data-touch="stick"]';
    case "masGas":
    case "menosGas":
      return '#tactil [data-touch="throttle"]';
    case "flaps":
      return '[data-hud="flaps-touch"]';
    case "tren":
      return '[data-hud="tren-touch"]';
    case "aerofrenos":
      return '[data-hud="aerofrenos-touch"]';
  }
}

/** Lo que el juego le da a la pista en cada fotograma. */
export interface VistaDeLaTecla {
  readonly tecla: TeclaQueToca;
  readonly mando: Mando;
  readonly teclas: ConQueTeclas;
  /**
   * El peldaño de la escalera de comunicación, de 1 a 4: el «ya me lo
   * aprendí» lleva su visto en los cuatro, una palabra desde el segundo y la
   * frase desde el tercero. Ver `flight/escalera.ts`.
   */
  readonly peldano: 1 | 2 | 3 | 4;
}

/**
 * **La pista de la tecla, en pantalla**: la tarjeta del lado, el «ya me lo
 * aprendí» y, con el dedo, el dedo encima del mando de verdad.
 */
export class PistaDeTeclas {
  private readonly hueco: HTMLElement;
  private readonly dedo: HTMLElement;
  private pintado = "";
  private senalado: string | null = null;
  private buscando = 0;

  constructor(
    private readonly raiz: HTMLElement,
    aprender: (que: TeclaQueToca) => void,
  ) {
    raiz.innerHTML = `
      <div class="ttq" data-hud="teclas-que-tocan" role="group" aria-label="${t("teclas.queTocan")}" hidden>
        <div class="ttq__hueco"></div>
        <button class="ttq__aprendida" type="button" data-hud="ya-me-lo-aprendi"
                aria-label="${t("teclas.yaMeLoAprendi")}" title="${t("teclas.yaMeLoAprendi")}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          <span class="ttq__aprendida-texto">${t("teclas.yaMeLoAprendi")}</span>
        </button>
      </div>
      <div class="inicio__dedo ttq__dedo" hidden aria-hidden="true">
        <svg viewBox="-24 -6 48 52">${MANO_QUE_SENALA}</svg>
      </div>`;
    this.hueco = raiz.querySelector<HTMLElement>(".ttq__hueco")!;
    this.dedo = raiz.querySelector<HTMLElement>(".ttq__dedo")!;
    raiz.querySelector<HTMLElement>('[data-hud="ya-me-lo-aprendi"]')!.addEventListener("click", () => {
      const que = this.raiz.dataset.tecla as TeclaQueToca | undefined;
      if (que) aprender(que);
    });
    window.addEventListener("resize", () => {
      this.colocarElDedo();
      this.colocarLaTarjeta();
    });
  }

  /** La tarjeta entera, para medirla. */
  get tarjeta(): HTMLElement {
    return this.raiz.querySelector<HTMLElement>(".ttq")!;
  }

  pintar(v: VistaDeLaTecla | null): void {
    const clave = v ? `${v.tecla}|${v.mando}|${v.teclas.chorro}|${v.teclas.teclaDe(ACCION_DE[v.tecla])}` : "";
    if (v && String(v.peldano) !== this.raiz.dataset.peldano) {
      this.raiz.dataset.peldano = String(v.peldano);
      const texto = this.raiz.querySelector<HTMLElement>(".ttq__aprendida-texto");
      if (texto) texto.textContent = t(v.peldano === 2 ? "teclas.yaLaSe" : "teclas.yaMeLoAprendi");
    }
    if (clave !== this.pintado) {
      this.pintado = clave;
      this.tarjeta.hidden = !v;
      this.raiz.dataset.tecla = v?.tecla ?? "";
      this.hueco.innerHTML = v ? dibujoDeLaTecla(v.tecla, v.mando, v.teclas) : "";
      this.senalado = v ? mandoSenalado(v.tecla, v.mando) : null;
      const dir =
        v?.tecla === "subir" || v?.tecla === "masGas"
          ? "arriba"
          : v?.tecla === "bajar" || v?.tecla === "menosGas"
            ? "abajo"
            : "toca";
      this.dedo.className = `inicio__dedo ttq__dedo inicio__dedo--${dir}`;
      this.colocarElDedo();
      this.colocarLaTarjeta();
    } else if (v && ++this.buscando % 30 === 0) {
      /*
       * Y de vez en cuando se vuelve a mirar: el botón puede tardar un
       * fotograma en salir, y el cuadro se sube y se baja con su tirador.
       */
      if (this.senalado && this.dedo.hidden) this.colocarElDedo();
      this.colocarLaTarjeta();
    }
  }

  /**
   * **La tarjeta entre lo que hay a su izquierda**: debajo de la columna de
   * botones de arriba y encima de lo primero que encuentre debajo —el cuadro,
   * la palanca del dedo, el volumen—. Si no cabe, se encoge: lo que no puede
   * hacer es tapar un instrumento o un mando. Es la regla del cuadro, que se
   * encoge antes que empujar nada (ver `ui/familia.ts`).
   */
  private colocarLaTarjeta(): void {
    const tarjeta = this.tarjeta;
    if (tarjeta.hidden) return;
    tarjeta.style.left = "";
    tarjeta.style.top = "0px";
    tarjeta.style.transform = "none";
    const caja = tarjeta.getBoundingClientRect();
    const visibles = (sel: string, desde: number): DOMRect[] =>
      [...document.querySelectorAll<HTMLElement>(sel)]
        .filter((e) => !e.closest("[hidden]") && getComputedStyle(e).display !== "none")
        .map((e) => e.getBoundingClientRect())
        .filter(
          (r) =>
            r.width > 2 && r.height > 2 && r.left < desde + caja.width + 8 && r.right > desde - 8,
        );
    /*
     * **Dos sitios, y el que deje la tarjeta más grande**: pegada al borde,
     * debajo de la columna de botones, o a la derecha de esa columna, debajo
     * de la barra de arriba. En la tablet cabe en el primero; en un teléfono
     * apaisado, entre la columna y la palanca quedan cuarenta píxeles, y al
     * lado de la columna, el cielo entero.
     */
    const columna = document.querySelector<HTMLElement>(".hud__vistas")?.getBoundingClientRect();
    const sitios = [caja.left, ...(columna && columna.width > 2 ? [columna.right + 8] : [])];
    let mejor = { izquierda: caja.left, top: 16, escala: 0 };
    /*
     * Lo que empieza en el tercio de arriba de la pantalla es techo —la
     * columna, la barra, los pictogramas del teléfono, la radio— y lo demás,
     * suelo: el cuadro, la palanca, el volumen, el aviso.
     */
    const obstaculos =
      ".hud__vistas, .hud__arriba > *, [data-hud='radio'], [data-hud='torre'], [data-hud='pictos'], [data-hud='senal'], " +
      "[data-hud='tablero'], [data-hud='cuadro-tel'], [data-hud='cuadro-tirador'], #tactil .pad, [data-hud='volumen-caja'], [data-hud='warning']";
    for (const izquierda of sitios) {
      const todos = visibles(obstaculos, izquierda);
      const techo = innerHeight * 0.35;
      const arriba = Math.max(16, ...todos.filter((r) => r.top < techo).map((r) => r.bottom + 8));
      const abajo = Math.min(
        innerHeight - 8,
        ...todos.filter((r) => r.top >= techo && r.bottom > arriba).map((r) => r.top - 8),
      );
      const cabe = Math.max(0, abajo - arriba);
      const escala = Math.max(0.55, Math.min(1, cabe / caja.height));
      // Por poco, el de siempre: que no salte de sitio por un píxel.
      if (escala > mejor.escala + 0.05) {
        const top = arriba + Math.max(0, (cabe - caja.height * escala) / 2);
        mejor = { izquierda, top, escala };
      }
    }
    if (mejor.izquierda !== caja.left) tarjeta.style.left = `${Math.round(mejor.izquierda)}px`;
    tarjeta.style.top = `${Math.round(mejor.top)}px`;
    tarjeta.style.transform = mejor.escala < 1 ? `scale(${mejor.escala.toFixed(3)})` : "none";
    tarjeta.style.transformOrigin = "top left";
  }

  /**
   * **El dedo de encima, sobre el mando de verdad.** Se mide al cambiar la
   * tecla o la pantalla, no en cada fotograma: leer un tamaño obliga al
   * navegador a rehacer la página.
   */
  private colocarElDedo(): void {
    const pad = this.senalado ? document.querySelector<HTMLElement>(this.senalado) : null;
    const r = pad?.getBoundingClientRect();
    const visible =
      !!r &&
      r.width > 4 &&
      r.height > 4 &&
      !pad!.closest("[hidden]") &&
      getComputedStyle(pad!).visibility !== "hidden";
    this.dedo.hidden = !visible;
    document.querySelectorAll(".ttq--senalado").forEach((e) => e.classList.remove("ttq--senalado"));
    if (!visible || !r) return;
    pad!.classList.add("ttq--senalado");
    const recorrido = Math.min(r.width, r.height) * 0.28;
    this.dedo.style.left = `${r.left + r.width / 2}px`;
    this.dedo.style.top = `${r.top + r.height / 2}px`;
    this.dedo.style.setProperty("--recorrido", `${recorrido.toFixed(0)}px`);
  }
}

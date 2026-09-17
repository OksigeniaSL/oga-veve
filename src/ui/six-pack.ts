/**
 * Los seis instrumentos clásicos, para el último peldaño.
 *
 * La disposición es la real, la que lleva cualquier avión ligero del mundo
 * desde los años cincuenta, y eso es la mitad del valor: lo que se aprende
 * aquí **es** una cabina de verdad.
 *
 *   anemómetro    horizonte artificial   altímetro
 *   bastón-bola   direccional            variómetro
 *
 * En SVG dentro del DOM, no en tres dimensiones dentro de una cabina. En una
 * tablet de seiscientos píxeles de alto, seis esferas metidas en una cabina
 * quedan a cuarenta píxeles: preciosas e ilegibles. Y en el DOM se conserva
 * la accesibilidad, que es lo que esta casa vende.
 *
 * Por qué agujas y no cifras, ya que las cifras son más precisas: **una
 * aguja enseña tendencia**. De un vistazo se ve no solo cuánto sino hacia
 * dónde va, y eso es exactamente por lo que un avión de verdad las lleva
 * después de setenta años de poder poner números.
 *
 * ## Y por qué esto ya no es el cuadro entero
 *
 * Las seis esferas son **la familia de pistón**, no la cabina de los seis
 * aviones. Un turbohélice de línea y un reactor no llevan relojes, y ponérselos
 * era enseñar una cabina que no existe: «que cada aeronave parezca lo que es,
 * que un 747 no parezca un juguete». Ver `familia.ts` para el reparto y
 * `tablero.ts` para quien coloca esto dentro del cuadro.
 *
 * Lo que **no** cambia entre familias es dónde está cada cosa: en una avioneta
 * son seis esferas y en un Boeing son seis regiones de una pantalla, en las
 * mismas posiciones relativas. Ese parecido es el hallazgo que se lleva quien
 * aprende aquí, y la retícula entera está hecha para protegerlo.
 */

import type { FlightState } from "../flight/model";
import { cuadroDe, type Cuadro } from "./cuadro";
import { BANDA, cajaDe } from "./familia";
import { PYKASU } from "../flight/aircraft";

/** Lo que se dejan entre sí dos esferas vecinas, en píxeles del cuadro. */
const SEPARA = 16;

/** Recorrido de una aguja de esfera completa, en grados. */
const SWEEP = 300;
const SWEEP_START = -150;

export class SixPack {
  private root: HTMLElement | null = null;
  private readonly needles = new Map<string, SVGElement>();
  /**
   * Las escalas del avión que se vuela.
   *
   * **No son las mismas para todos**, y creerlo era un fallo con consecuencia:
   * con el fondo de escala de la avioneta, el anemómetro del avión de fuselaje
   * ancho se clavaba en el tope nada más despegar. Ver `cuadro.ts`.
   *
   * Empieza con las del entrenador porque el juego empieza con él, y el HUD la
   * cambia en cuanto se cambia de aeronave.
   */
  private cuadro: Cuadro = cuadroDe(PYKASU);

  /**
   * El grupo de las seis esferas, ya colocado dentro del cuadro.
   *
   * Devuelve un `<g>` de SVG y no una fila de cajas HTML: **el cuadro entero
   * es un solo dibujo que se escala de una pieza**, y por eso ya no hay forma
   * de que se descentre. Cuando eran cajas, cada avión colocaba las suyas como
   * podía y el resultado era el «esto no está centrado ni aunque venga Cristo
   * y me lo diga».
   *
   * Dónde cae cada esfera **sale del reparto**, no de seis números escritos
   * aquí. Es la misma cuenta que comprueba `familia.test.ts`, y hacerla dos
   * veces es la forma segura de que un día digan cosas distintas: la columna
   * del medio tiene que caer clavada en el centro de la pantalla, porque el
   * horizonte es el ancla de todo el cuadro.
   */
  static grupo(c: Cuadro): string {
    const caja = cajaDe("esferas", "seispack");
    // Tres columnas de esferas con su separación: el diámetro sale de ahí.
    const diametro = (caja.ancho - SEPARA * 2) / 3;
    const radio = diametro / 2;
    const columnas = [0, 1, 2].map(
      (k) => caja.x + radio + k * (diametro + SEPARA),
    );
    const filas = [0, 1].map((k) => BANDA.y + radio + k * (diametro + SEPARA));
    const sitio = (i: number) => ({
      x: columnas[i % 3]!,
      y: filas[Math.floor(i / 3)]!,
      radio,
    });
    const esferas: Array<[string, string, string, string]> = [
      ["asi", "IAS", asiFace(c), '<g data-needle="asi">' + needle(38) + "</g>"],
      ["ai", "ATT", aiFace(), ""],
      [
        "alt",
        "ALT",
        altFace(),
        '<g data-needle="alt-thousands">' +
          needle(24) +
          '</g><g data-needle="alt-hundreds">' +
          needle(40) +
          "</g>",
      ],
      ["tc", "T/C", tcFace(), ""],
      [
        "dg",
        "HDG",
        '<g data-needle="dg-card">' + dgCard() + "</g>",
        dgAircraft(),
      ],
      ["vsi", "V/S", vsiFace(), '<g data-needle="vsi">' + needle(38) + "</g>"],
    ];
    return `<g data-hud="sixpack">${esferas
      .map(([id, rotulo, face, overlay], i) =>
        dial(id, rotulo, face, overlay, sitio(i)),
      )
      .join("")}</g>`;
  }

  /** Con qué avión se vuela ahora. Se llama antes de `bind`. */
  ponerCuadro(c: Cuadro): void {
    this.cuadro = c;
  }

  bind(root: HTMLElement): void {
    this.root = root.querySelector('[data-hud="sixpack"]');
    this.needles.clear();
    if (!this.root) return;
    for (const element of this.root.querySelectorAll<SVGElement>(
      "[data-needle]",
    )) {
      this.needles.set(element.dataset.needle!, element);
    }
  }

  get present(): boolean {
    return this.root !== null;
  }

  /**
   * @param knots velocidad indicada
   * @param feet altitud
   * @param fpm velocidad vertical en pies por minuto
   */
  update(
    state: FlightState,
    knots: number,
    feet: number,
    fpm: number,
    bank: number,
    pitch: number,
  ): void {
    if (!this.root) return;

    this.rotate(
      "asi",
      SWEEP_START + clamp01(knots / this.cuadro.asiMax) * SWEEP,
    );

    // Altímetro de dos agujas, como el de verdad: la larga da una vuelta
    // cada mil pies y la corta marca los miles.
    this.rotate("alt-hundreds", ((feet % 1000) / 1000) * 360);
    this.rotate("alt-thousands", ((feet % 10000) / 10000) * 360);

    // Variómetro: cero a las nueve en punto, subida arriba, bajada abajo.
    this.rotate("vsi", (clamp(fpm / this.cuadro.vsiMax, -1, 1) * SWEEP) / 2);

    // Direccional: la rosa gira al revés que el avión, porque lo que se
    // mueve es el mundo.
    this.rotate("dg-card", (-state.heading * 180) / Math.PI);

    // Horizonte artificial: el disco gira contra el alabeo y sube o baja con
    // el cabeceo, así que representa el mundo y no la máquina.
    const horizon = this.root.querySelector<SVGElement>("[data-ai-disc]");
    if (horizon) {
      horizon.setAttribute(
        "transform",
        `rotate(${(-bank * 180) / Math.PI} 50 50) translate(0 ${((pitch * 180) / Math.PI) * 0.9})`,
      );
    }

    // Bastón y bola: el avioncito se inclina y la bola se va al exterior del
    // viraje si no está coordinado. Centrar la bola es «dar pie».
    const plane = this.root.querySelector<SVGElement>("[data-tc-plane]");
    if (plane)
      plane.setAttribute(
        "transform",
        `rotate(${(bank * 180) / Math.PI} 50 44)`,
      );
    const ball = this.root.querySelector<SVGElement>("[data-tc-ball]");
    if (ball)
      ball.setAttribute("cx", String(50 + clamp(state.beta * 9, -1, 1) * 11));
  }

  private rotate(name: string, degrees: number): void {
    this.needles
      .get(name)
      ?.setAttribute("transform", `rotate(${degrees} 50 50)`);
  }
}

// ── Piezas del dibujo ──────────────────────────────────────────────────

function dial(
  id: string,
  label: string,
  face: string,
  overlay: string,
  donde: { x: number; y: number; radio: number },
): string {
  /*
   * El dibujo vive en un cuadrado de cien y se escala a lo que mida la esfera.
   * Así las medidas de dentro siguen siendo las de siempre y no hay que
   * retocar ni una aguja al cambiar el reparto.
   */
  const escala = donde.radio / 50;
  return `
    <g class="esfera" data-dial="${id}"
       transform="translate(${donde.x - donde.radio} ${donde.y - donde.radio}) scale(${escala})">
      ${empotrada()}
      ${face}
      ${overlay}
      <circle cx="50" cy="50" r="3.4" class="esfera__buje" />
      ${reflejo()}
      <text x="50" y="86" data-desde="3" class="esfera__rotulo">${label}</text>
    </g>
  `;
}

/**
 * El anillo mecanizado, los tornillos y el filo de luz.
 *
 * Es lo que convierte una esfera dibujada en una esfera **empotrada**. Un
 * instrumento de verdad va metido en un agujero del salpicadero con un aro
 * alrededor y cuatro tornillos, y cuando eso falta el panel entero parece una
 * pegatina sobre una losa negra — que es justo lo que se dijo de este.
 */
function empotrada(): string {
  const tornillos = [
    [50, 6],
    [94, 50],
    [50, 94],
    [6, 50],
  ]
    .map(
      ([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="1.5" class="esfera__tornillo" />`,
    )
    .join("");
  return `
    <circle data-fondo="esfera" cx="50" cy="50" r="49" class="esfera__caja" />
    <circle cx="50" cy="50" r="45" class="esfera__filo" />
    <circle cx="50" cy="50" r="43" class="esfera__fondo" />
    ${tornillos}
  `;
}

/**
 * El reflejo del cristal. **Fijo, siempre el mismo.**
 *
 * Un brillo que se mueve sin que se mueva el sol delata el truco al instante;
 * uno quieto, arriba a la izquierda, es lo que hace que se vea que hay un
 * cristal delante. Es de las pocas cosas del cuadro que no cambian nunca, y
 * esa es la gracia.
 */
function reflejo(): string {
  return `<path class="esfera__reflejo"
    d="M14 36 A43 43 0 0 1 64 9 A54 54 0 0 0 14 36 Z" />`;
}

/** Aguja apuntando hacia arriba desde el centro. */
function needle(length: number): string {
  return `<path class="esfera__aguja" d="M50 50 L47.6 ${50 - length * 0.75} L50 ${50 - length} L52.4 ${50 - length * 0.75} Z" />`;
}

/** Marcas de una esfera de recorrido completo, con sus números. */
function ticks(count: number, labelEvery: number, scale: number): string {
  let out = "";
  for (let i = 0; i <= count; i++) {
    const angle = ((SWEEP_START + (i / count) * SWEEP) * Math.PI) / 180;
    const long = i % labelEvery === 0;
    const r1 = long ? 33 : 37;
    const sin = Math.sin(angle);
    const cos = -Math.cos(angle);
    out += `<line x1="${50 + sin * r1}" y1="${50 + cos * r1}" x2="${50 + sin * 41}" y2="${50 + cos * 41}" class="esfera__marca${long ? " esfera__marca--larga" : ""}" />`;
    if (long) {
      out += `<text x="${50 + sin * 26}" y="${50 + cos * 26 + 2.6}" data-desde="3" class="esfera__cifra">${Math.round((i / count) * scale)}</text>`;
    }
  }
  return out;
}

function asiFace(c: Cuadro): string {
  /*
   * Arcos de color como los de verdad, y **con las velocidades de este avión**:
   * verde de la pérdida al crucero, ámbar hasta la de nunca pasar, rojo de ahí
   * al final. Estaban en fracciones fijas de la esfera —0,16 a 0,62 y así—, que
   * es pintar el arco de un avión en la esfera de otro.
   */
  const { verde, ambar, rojo } = c.arcos;
  return `
    <path class="esfera__arco esfera__arco--verde" d="${arcPath(verde[0], verde[1])}" />
    <path class="esfera__arco esfera__arco--ambar" d="${arcPath(ambar[0], ambar[1])}" />
    <path class="esfera__arco esfera__arco--rojo" d="${arcPath(rojo[0], rojo[1])}" />
    ${ticks(8, 1, c.asiMax)}
  `;
}

function altFace(): string {
  return ticks(10, 1, 10);
}

function vsiFace(): string {
  let out = "";
  for (let i = -4; i <= 4; i++) {
    const angle = ((i / 4) * (SWEEP / 2) * Math.PI) / 180;
    const sin = Math.sin(angle);
    const cos = -Math.cos(angle);
    // El variómetro tiene el cero a la izquierda: se gira un cuarto.
    const x = 50 + cos * 37;
    const y = 50 - sin * 37;
    out += `<circle cx="${x}" cy="${y}" r="${i % 2 === 0 ? 1.8 : 1}" class="esfera__marca--punto" />`;
  }
  return out;
}

function aiFace(): string {
  return `
    <clipPath id="ai-recorte"><circle cx="50" cy="50" r="43" /></clipPath>
    <g clip-path="url(#ai-recorte)">
      <g data-ai-disc>
        <rect x="-60" y="-60" width="220" height="110" class="ai__cielo" />
        <rect x="-60" y="50" width="220" height="160" class="ai__tierra" />
        <line x1="-60" y1="50" x2="160" y2="50" class="ai__horizonte" />
      </g>
    </g>
    <path class="ai__avion" d="M28 50 L42 50 M58 50 L72 50 M50 50 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" />
    <!--
      La pérdida: un aro rojo alrededor del horizonte, que es donde mira quien
      ya está en apuros. Lo lleva igual el avión de línea y esta avioneta, con
      el mismo color y en el mismo sitio, porque **rojo quiere decir «actuá
      ya»** y no significa ninguna otra cosa en todo el juego.
    -->
    <circle data-cristal="perdida" cx="50" cy="50" r="41" class="cr__alerta cr__alerta--esfera"
            visibility="hidden" />
  `;
}

function tcFace(): string {
  return `
    <g data-tc-plane>
      <line x1="24" y1="44" x2="76" y2="44" class="tc__ala" />
      <line x1="50" y1="38" x2="50" y2="44" class="tc__deriva" />
    </g>
    <rect x="34" y="66" width="32" height="13" rx="6.5" class="tc__tubo" />
    <circle data-tc-ball cx="50" cy="72.5" r="4.4" class="tc__bola" />
  `;
}

function dgCard(): string {
  let out = '<circle cx="50" cy="50" r="43" class="dg__rosa" />';
  const marks: Array<[number, string]> = [
    [0, "N"],
    [90, "E"],
    [180, "S"],
    // W, no O: en una rosa de compás de verdad pone West, y la regla 3 del
    // AGENTS.md dice que la aeronáutica se aprende en su idioma.
    [270, "W"],
  ];
  for (const [degrees, letter] of marks) {
    const angle = (degrees * Math.PI) / 180;
    const sin = Math.sin(angle);
    const cos = -Math.cos(angle);
    out += `<text x="${50 + sin * 30}" y="${50 + cos * 30 + 3}" data-desde="3" class="esfera__cifra esfera__cifra--rumbo">${letter}</text>`;
  }
  for (let i = 0; i < 36; i++) {
    const angle = (i * 10 * Math.PI) / 180;
    const sin = Math.sin(angle);
    const cos = -Math.cos(angle);
    const r1 = i % 3 === 0 ? 36 : 39;
    out += `<line x1="${50 + sin * r1}" y1="${50 + cos * r1}" x2="${50 + sin * 42}" y2="${50 + cos * 42}" class="esfera__marca" />`;
  }
  return out;
}

/** Silueta fija del avión: en el direccional el que se mueve es el mundo. */
function dgAircraft(): string {
  return `<path class="dg__avion" d="M50 34 L50 62 M40 50 L60 50 M45 60 L55 60" />`;
}

/** Trazo de arco entre dos fracciones del recorrido de la esfera. */
function arcPath(from: number, to: number): string {
  const a1 = ((SWEEP_START + from * SWEEP) * Math.PI) / 180;
  const a2 = ((SWEEP_START + to * SWEEP) * Math.PI) / 180;
  const r = 39;
  const x1 = 50 + Math.sin(a1) * r;
  const y1 = 50 - Math.cos(a1) * r;
  const x2 = 50 + Math.sin(a2) * r;
  const y2 = 50 - Math.cos(a2) * r;
  const large = (to - from) * SWEEP > 180 ? 1 : 0;
  return `M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

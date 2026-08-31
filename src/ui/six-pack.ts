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
 */

import type { FlightState } from '../flight/model';

/** Recorrido de una aguja de esfera completa, en grados. */
const SWEEP = 300;
const SWEEP_START = -150;

/** Escalas de fondo de escala. */
const ASI_MAX_KT = 160;
const VSI_MAX_FPM = 2000;

export class SixPack {
  private root: HTMLElement | null = null;
  private readonly needles = new Map<string, SVGElement>();

  /** Devuelve el marcado completo, para que el HUD lo inserte. */
  static markup(): string {
    return `
      <div class="seispack" data-hud="sixpack" role="group" aria-label="Instrumentos">
        ${dial('asi', 'IAS', asiFace(), '<g data-needle="asi">' + needle(38) + '</g>')}
        ${dial('ai', 'ATT', aiFace(), '')}
        ${dial('alt', 'ALT', altFace(), '<g data-needle="alt-thousands">' + needle(24) + '</g><g data-needle="alt-hundreds">' + needle(40) + '</g>')}
        ${dial('tc', 'T/C', tcFace(), '')}
        ${dial('dg', 'HDG', '<g data-needle="dg-card">' + dgCard() + '</g>', dgAircraft())}
        ${dial('vsi', 'V/S', vsiFace(), '<g data-needle="vsi">' + needle(38) + '</g>')}
      </div>
    `;
  }

  bind(root: HTMLElement): void {
    this.root = root.querySelector('[data-hud="sixpack"]');
    this.needles.clear();
    if (!this.root) return;
    for (const element of this.root.querySelectorAll<SVGElement>('[data-needle]')) {
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
  update(state: FlightState, knots: number, feet: number, fpm: number, bank: number, pitch: number): void {
    if (!this.root) return;

    this.rotate('asi', SWEEP_START + clamp01(knots / ASI_MAX_KT) * SWEEP);

    // Altímetro de dos agujas, como el de verdad: la larga da una vuelta
    // cada mil pies y la corta marca los miles.
    this.rotate('alt-hundreds', ((feet % 1000) / 1000) * 360);
    this.rotate('alt-thousands', ((feet % 10000) / 10000) * 360);

    // Variómetro: cero a las nueve en punto, subida arriba, bajada abajo.
    this.rotate('vsi', (clamp(fpm / VSI_MAX_FPM, -1, 1) * SWEEP) / 2);

    // Direccional: la rosa gira al revés que el avión, porque lo que se
    // mueve es el mundo.
    this.rotate('dg-card', (-state.heading * 180) / Math.PI);

    // Horizonte artificial: el disco gira contra el alabeo y sube o baja con
    // el cabeceo, así que representa el mundo y no la máquina.
    const horizon = this.root.querySelector<SVGElement>('[data-ai-disc]');
    if (horizon) {
      horizon.setAttribute(
        'transform',
        `rotate(${(-bank * 180) / Math.PI} 50 50) translate(0 ${(pitch * 180) / Math.PI * 0.9})`,
      );
    }

    // Bastón y bola: el avioncito se inclina y la bola se va al exterior del
    // viraje si no está coordinado. Centrar la bola es «dar pie».
    const plane = this.root.querySelector<SVGElement>('[data-tc-plane]');
    if (plane) plane.setAttribute('transform', `rotate(${(bank * 180) / Math.PI} 50 44)`);
    const ball = this.root.querySelector<SVGElement>('[data-tc-ball]');
    if (ball) ball.setAttribute('cx', String(50 + clamp(state.beta * 9, -1, 1) * 11));
  }

  private rotate(name: string, degrees: number): void {
    this.needles.get(name)?.setAttribute('transform', `rotate(${degrees} 50 50)`);
  }
}

// ── Piezas del dibujo ──────────────────────────────────────────────────

function dial(id: string, label: string, face: string, overlay: string): string {
  return `
    <div class="esfera" data-dial="${id}">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="48" class="esfera__caja" />
        <circle cx="50" cy="50" r="43" class="esfera__fondo" />
        ${face}
        ${overlay}
        <circle cx="50" cy="50" r="3.4" class="esfera__buje" />
      </svg>
      <span class="esfera__rotulo">${label}</span>
    </div>
  `;
}

/** Aguja apuntando hacia arriba desde el centro. */
function needle(length: number): string {
  return `<path class="esfera__aguja" d="M50 50 L47.6 ${50 - length * 0.75} L50 ${50 - length} L52.4 ${50 - length * 0.75} Z" />`;
}

/** Marcas de una esfera de recorrido completo, con sus números. */
function ticks(count: number, labelEvery: number, scale: number): string {
  let out = '';
  for (let i = 0; i <= count; i++) {
    const angle = ((SWEEP_START + (i / count) * SWEEP) * Math.PI) / 180;
    const long = i % labelEvery === 0;
    const r1 = long ? 33 : 37;
    const sin = Math.sin(angle);
    const cos = -Math.cos(angle);
    out += `<line x1="${50 + sin * r1}" y1="${50 + cos * r1}" x2="${50 + sin * 41}" y2="${50 + cos * 41}" class="esfera__marca${long ? ' esfera__marca--larga' : ''}" />`;
    if (long) {
      out += `<text x="${50 + sin * 26}" y="${50 + cos * 26 + 2.6}" class="esfera__cifra">${Math.round((i / count) * scale)}</text>`;
    }
  }
  return out;
}

function asiFace(): string {
  // Arcos de color como los de verdad: verde el rango normal, amarillo el de
  // precaución y rojo el que no se pasa.
  return `
    <path class="esfera__arco esfera__arco--verde" d="${arcPath(0.16, 0.62)}" />
    <path class="esfera__arco esfera__arco--ambar" d="${arcPath(0.62, 0.84)}" />
    <path class="esfera__arco esfera__arco--rojo" d="${arcPath(0.84, 0.92)}" />
    ${ticks(8, 1, ASI_MAX_KT)}
  `;
}

function altFace(): string {
  return ticks(10, 1, 10);
}

function vsiFace(): string {
  let out = '';
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
    [0, 'N'],
    [90, 'E'],
    [180, 'S'],
    [270, 'O'],
  ];
  for (const [degrees, letter] of marks) {
    const angle = (degrees * Math.PI) / 180;
    const sin = Math.sin(angle);
    const cos = -Math.cos(angle);
    out += `<text x="${50 + sin * 30}" y="${50 + cos * 30 + 3}" class="esfera__cifra esfera__cifra--rumbo">${letter}</text>`;
  }
  for (let i = 0; i < 36; i++) {
    const angle = ((i * 10) * Math.PI) / 180;
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

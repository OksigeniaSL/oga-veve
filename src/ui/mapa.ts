/**
 * El mapa: dónde estoy.
 *
 * Nació de una pregunta muy concreta de quien lo probó: «estoy buscando el río
 * Paraguay, el que pasa por debajo del puente del Chaco, pero estoy
 * desorientado». Y es que en el aire, a quinientos metros y sin instrumentos —
 * en Guyrami no hay ni brújula—, no hay absolutamente nada que diga por dónde
 * se va.
 *
 * **Un mapa es lo más legible que existe para quien no lee.** No hace falta una
 * sola palabra: el asfalto es gris, la ciudad es beis, el monte es verde, la
 * pista es una barra blanca y tú eres una flecha naranja. Un niño de cuatro
 * años sabe leer un mapa mucho antes que una frase.
 *
 * ## Cómo está hecho
 *
 * Dos lienzos. El de abajo se pinta **una sola vez** —relieve, agua, ciudad,
 * carreteras y pista— porque nada de eso se mueve; el de arriba lleva solo la
 * flecha y se repinta cada fotograma. Repintar el mundo entero sesenta veces
 * por segundo para mover un triángulo costaba más que el juego.
 *
 * El norte va arriba y no gira con el avión. Un mapa que gira es más cómodo de
 * seguir y **mucho peor para aprenderse un sitio**, que es de lo que se trata:
 * el río está al oeste siempre, no «a la izquierda ahora mismo».
 */

import type { Scenario } from '../world/scenarios';
import { puntoDePista } from '../world/rumbo';

/** Lado del lienzo, en píxeles. */
const LADO = 300;

/** Cuántas muestras de relieve se pintan por lado. */
const MUESTRAS = 150;

export class Mapa {
  private caja: HTMLElement | null = null;
  private fondo: HTMLCanvasElement | null = null;
  private encima: HTMLCanvasElement | null = null;
  private abierto = false;
  private pintado = false;
  private escenario: Scenario | null = null;
  private cota: ((x: number, z: number) => number) | null = null;

  static markup(): string {
    return `
      <div class="mapa" data-hud="mapa" hidden>
        <canvas class="mapa__fondo" data-hud="mapa-fondo" width="${LADO}" height="${LADO}"></canvas>
        <canvas class="mapa__encima" data-hud="mapa-encima" width="${LADO}" height="${LADO}"></canvas>
      </div>
    `;
  }

  /** El botón que lo abre, para la barra de arriba. */
  static boton(etiqueta: string): string {
    return `
      <button class="sonido teclas-boton" type="button" data-hud="mapa-boton" aria-label="${etiqueta}">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2.6 6.2 L9 3.6 v14.2 l-6.4 2.6 Z" />
          <path d="M9 3.6 L15 6.2 v14.2 L9 17.8 Z" />
          <path d="M15 6.2 L21.4 3.6 v14.2 L15 20.4 Z" />
        </svg>
      </button>
    `;
  }

  bind(raiz: HTMLElement, escenario: Scenario, cota: (x: number, z: number) => number): void {
    this.escenario = escenario;
    this.cota = cota;
    this.caja = raiz.querySelector('[data-hud="mapa"]');
    this.fondo = raiz.querySelector('[data-hud="mapa-fondo"]');
    this.encima = raiz.querySelector('[data-hud="mapa-encima"]');
    raiz.querySelector('[data-hud="mapa-boton"]')?.addEventListener('click', () => this.alternar());
  }

  alternar(): void {
    if (!this.caja) return;
    this.abierto = !this.abierto;
    this.caja.hidden = !this.abierto;
    if (this.abierto && !this.pintado) {
      this.pintarFondo();
      this.pintado = true;
    }
  }

  get visible(): boolean {
    return this.abierto;
  }

  /** Mueve la flecha. Se llama cada fotograma, así que no pinta el mundo. */
  update(x: number, z: number, rumboRad: number): void {
    if (!this.abierto || !this.encima || !this.escenario) return;
    const g = this.encima.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, LADO, LADO);

    const escala = LADO / this.escenario.size;
    const px = LADO / 2 + x * escala;
    const py = LADO / 2 + z * escala;

    g.save();
    g.translate(px, py);
    // El rumbo del avión y el norte del mapa son el mismo cero: arriba.
    g.rotate(rumboRad);
    g.fillStyle = '#e8762c';
    g.strokeStyle = '#2a2622';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(0, -9);
    g.lineTo(6.5, 8);
    g.lineTo(0, 4.5);
    g.lineTo(-6.5, 8);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }

  private pintarFondo(): void {
    const esc = this.escenario;
    const cota = this.cota;
    if (!this.fondo || !esc || !cota) return;
    const g = this.fondo.getContext('2d');
    if (!g) return;

    const escala = LADO / esc.size;
    const paso = esc.size / MUESTRAS;
    const px = LADO / MUESTRAS;

    // ── El relieve ──────────────────────────────────────────────────────
    //
    // Con la misma paleta que el terreno del juego, que es lo que hace que el
    // mapa y lo que se ve por la ventanilla sean el mismo sitio. Una paleta
    // de mapa distinta obliga a traducir, y traducir es justo lo que no puede
    // hacer quien no lee.
    for (let fila = 0; fila < MUESTRAS; fila++) {
      for (let col = 0; col < MUESTRAS; col++) {
        const x = -esc.size / 2 + (col + 0.5) * paso;
        const z = -esc.size / 2 + (fila + 0.5) * paso;
        const h = cota(x, z);
        g.fillStyle = h <= esc.waterLevel ? colorHex(esc.water) : colorDeCota(esc, h);
        g.fillRect(col * px, fila * px, px + 1, px + 1);
      }
    }

    // ── La ciudad ───────────────────────────────────────────────────────
    const ciudad = esc.ciudad;
    if (ciudad) {
      const lado = ciudad.rejilla.lado;
      const cp = LADO / lado;
      for (let fila = 0; fila < lado; fila++) {
        for (let col = 0; col < lado; col++) {
          const c = ciudad.rejilla.clase[fila * lado + col]!;
          if (!c) continue;
          const d = ciudad.rejilla.densidad[fila * lado + col]! / 255;
          g.globalAlpha = 0.3 + d * 0.55;
          g.fillStyle = c === 3 ? '#8e8577' : c === 2 ? '#9aa09a' : '#c3b394';
          // El fichero tiene la Y al norte; el lienzo, la Y hacia abajo.
          g.fillRect(col * cp, LADO - (fila + 1) * cp, cp + 1, cp + 1);
        }
      }
      g.globalAlpha = 1;

      // ── Las carreteras ────────────────────────────────────────────────
      g.strokeStyle = '#5a5a5e';
      g.lineCap = 'round';
      for (const via of ciudad.vias) {
        g.lineWidth = via.nivel <= 1 ? 1.8 : via.nivel === 2 ? 1.3 : 0.8;
        g.beginPath();
        via.puntos.forEach((p, i) => {
          const qx = LADO / 2 + p[0]! * escala;
          const qy = LADO / 2 - p[1]! * escala;
          if (i) g.lineTo(qx, qy);
          else g.moveTo(qx, qy);
        });
        g.stroke();
      }
    }

    // ── La pista, que es lo que hay que encontrar ───────────────────────
    //
    // Se dibuja la última y en blanco: cuando uno mira este mapa es porque no
    // sabe dónde está, y lo que busca casi siempre es por dónde se vuelve.
    const media = esc.runway.length / 2;
    const a = puntoDePista(esc.runway, media);
    const b = puntoDePista(esc.runway, -media);
    g.strokeStyle = '#1d1b19';
    g.lineWidth = 5;
    g.lineCap = 'butt';
    g.beginPath();
    g.moveTo(LADO / 2 + a[0] * escala, LADO / 2 + a[1] * escala);
    g.lineTo(LADO / 2 + b[0] * escala, LADO / 2 + b[1] * escala);
    g.stroke();
    g.strokeStyle = '#f4efe6';
    g.lineWidth = 2.6;
    g.stroke();
  }
}

const colorHex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

/** El color que le toca a una cota, con las mismas bandas que el terreno. */
function colorDeCota(esc: Scenario, h: number): string {
  let color = esc.fill;
  for (const banda of esc.bands) if (h >= banda.from) color = banda.colour;
  return colorHex(color);
}

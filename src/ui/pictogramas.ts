/**
 * Los instrumentos del primer peldaño, para quien no lee.
 *
 * Antes eran arcos con aguja, y un arco con aguja **sigue siendo un
 * instrumento**: hay que saber que la aguja a la izquierda es poco y a la
 * derecha es mucho, y eso ya es una convención que hay que aprender. A los
 * cuatro años no se tiene.
 *
 * Así que aquí no hay agujas. Hay tres cosas que se leen sin que nadie las
 * explique:
 *
 * - **Velocidad**: una tortuga a un lado, un pájaro al otro, y el avioncito
 *   moviéndose entre los dos. Cerca de la tortuga es despacio.
 * - **Altura**: un cerro abajo y el avión subiendo por la tarjeta. Su
 *   posición *es* la altura, sin traducir nada.
 * - **Motor**: una hélice que gira, y gira más deprisa cuanto más gas hay.
 *
 * Ninguna necesita número, ni palabra, ni saber qué significa una aguja. Y
 * las tres se entienden igual en Coronel Oviedo que en Canarias.
 *
 * La idea de la tortuga vino de las maquetas de diseño; el resto es la misma
 * regla de siempre: si hace falta explicarlo, no vale para este peldaño.
 */

/** Silueta de tortuga: caparazón, cabeza y patas. Despacio. */
const TORTUGA = `
  <path d="M3 13 h2.2 v2 H3.4 Z M9.4 13 h2.2 v2 H9.6 Z" />
  <path d="M2.2 12.6 a5.6 4.4 0 0 1 11.2 0 Z" />
  <path d="M13.6 9.4 a1.9 1.9 0 1 1 0 3.2 h-1.2 v-3.2 Z" />
`;

/** Silueta de pájaro en vuelo, alas abiertas. Deprisa. */
const PAJARO = `
  <path d="M1 11.4 C4 7.6 6.4 6.6 8 9.6 C9.6 6.6 12 7.6 15 11.4
           C12 9.8 9.8 10.4 8 12.6 C6.2 10.4 4 9.8 1 11.4 Z" />
`;

/** Cerro con su falda, para la tarjeta de altura. */
const CERRO = `
  <path d="M0 34 L9 20 L15 26 L24 12 L34 34 Z" />
`;

/** El avioncito que se mueve. Visto desde detrás: alas y deriva. */
const AVION = `
  <path d="M8 5.2 v3.4 M1.6 8.2 h12.8 M5.4 10.4 h5.2" />
`;

export class Pictogramas {
  private root: HTMLElement | null = null;
  private speedMark: SVGElement | null = null;
  private altPlane: SVGElement | null = null;
  private propeller: SVGElement | null = null;

  /** Giro acumulado de la hélice, en grados. */
  private spin = 0;

  static markup(): string {
    return `
      <div class="pictos" data-hud="pictos">
        <!--
          Velocidad. La tortuga y el pájaro están fijos en los extremos y el
          avioncito recorre el trecho entre los dos. No hay escala ni número:
          la posición es la respuesta.
        -->
        <div class="picto">
          <svg viewBox="0 0 100 34" aria-hidden="true">
            <g class="picto__bicho" transform="translate(2 12)">${TORTUGA}</g>
            <g class="picto__bicho" transform="translate(82 12)">${PAJARO}</g>
            <line class="picto__via" x1="20" y1="19" x2="80" y2="19" />
            <g class="picto__avion" data-picto="speed" transform="translate(20 11)">${AVION}</g>
          </svg>
        </div>

        <!--
          Altura. El cerro está abajo y el avión sube por la tarjeta. Es el
          único instrumento del juego que no traduce nada: lo que se ve es
          literalmente lo que pasa.
        -->
        <div class="picto">
          <svg viewBox="0 0 34 34" aria-hidden="true">
            <g class="picto__cerro">${CERRO}</g>
            <g class="picto__avion" data-picto="altitude" transform="translate(9 22)">${AVION}</g>
          </svg>
        </div>

        <!--
          Motor. Gira, y gira más deprisa con más gas. No hay nada que
          interpretar: se ve la velocidad, no se lee.
        -->
        <div class="picto">
          <svg viewBox="0 0 34 34" aria-hidden="true">
            <g class="picto__helice" data-picto="prop">
              <ellipse cx="17" cy="7.5" rx="2.6" ry="7.5" />
              <ellipse cx="17" cy="26.5" rx="2.6" ry="7.5" />
              <ellipse cx="7.5" cy="17" rx="7.5" ry="2.6" />
              <ellipse cx="26.5" cy="17" rx="7.5" ry="2.6" />
            </g>
            <circle class="picto__buje" cx="17" cy="17" r="3.2" />
          </svg>
        </div>
      </div>
    `;
  }

  bind(root: HTMLElement): void {
    this.root = root.querySelector('[data-hud="pictos"]');
    this.speedMark = this.pick('speed');
    this.altPlane = this.pick('altitude');
    this.propeller = this.pick('prop');
  }

  get present(): boolean {
    return this.root !== null;
  }

  /**
   * @param speed fracción de la velocidad de crucero, 0 a 1
   * @param height fracción de la altura que se considera «alto», 0 a 1
   * @param throttle 0 a 1
   * @param dt segundos desde el fotograma anterior
   */
  update(speed: number, height: number, throttle: number, dt: number): void {
    if (!this.root) return;

    this.speedMark?.setAttribute('transform', `translate(${20 + clamp01(speed) * 60} 11)`);

    // El avión sube por la tarjeta. Se queda a media pieza del borde de
    // arriba para que no parezca que se sale, y apoyado en el cerro abajo.
    this.altPlane?.setAttribute('transform', `translate(9 ${22 - clamp01(height) * 19})`);

    // La hélice gira de verdad. A ralentí se mueve despacio y se distingue;
    // a tope se convierte en un disco, que es exactamente lo que hace una
    // hélice real y de paso enseña por qué no se pasa por delante.
    // El centro del giro va dentro del propio `rotate`, y **solo ahí**. Con
    // un `transform-origin` además, el navegador desplaza dos veces y las
    // palas se salen del encuadre: quedaba el buje solo, girando nada.
    this.spin = (this.spin + (60 + throttle * 900) * dt) % 360;
    this.propeller?.setAttribute('transform', `rotate(${this.spin} 17 17)`);
  }

  private pick(name: string): SVGElement | null {
    return this.root?.querySelector<SVGElement>(`[data-picto="${name}"]`) ?? null;
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

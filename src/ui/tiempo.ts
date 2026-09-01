/**
 * El panel del tiempo: mover el viento con el dedo.
 *
 * > «Estaría bien que el panel de juego permitiera modificar eso y que el
 * > jugador ensaye diversas misiones y estados de clima artificialmente»
 *
 * Ya se podía, pero escribiendo `?viento=290/14` en la barra del navegador, y
 * eso aquí no vale: **hay que escribirlo**, que es justo lo que no se puede
 * pedir. Esto es lo mismo con el dedo.
 *
 * ## Por qué el viento es el mando que más enseña
 *
 * Porque **cambia el aeropuerto entero**. Se arrastra la flecha ciento ochenta
 * grados y la cabecera en uso se da la vuelta: otro puesto de estacionamiento,
 * otra ruta de rodaje, otra aproximación, otro número pintado en el asfalto. Es
 * la lección de por qué una pista tiene dos números, contada sin una palabra y
 * en un segundo.
 *
 * Por eso cambiar el viento **reinicia el vuelo**. No es una limitación: es lo
 * que es. Cambiar de cabecera es empezar otro vuelo, igual que cambiar de
 * aeropuerto.
 *
 * ## Y la manga es el instrumento
 *
 * El panel no enseña ni un número. Lo que se mira para saber cuánto viento hay
 * es la manga del aeropuerto, que se mueve a la vez que la flecha. Esa relación
 * —arrastro esto, se mueve aquello— es la que enseña a leer una manga, y no
 * hay forma de contarla con letras.
 */

import { t } from '../i18n';
import type { Meteo } from '../world/meteo';

/** Lo más fuerte que se puede pedir, en nudos. Treinta ya es incómodo. */
const MAXIMO_KT = 30;
const RADIO = 92;

export class PanelDelTiempo {
  private raiz: HTMLElement | null = null;
  private caja: HTMLElement | null = null;
  private rosa: SVGSVGElement | null = null;
  private abierto = false;
  private meteo: Meteo | null = null;
  private alCambiar: ((m: Meteo) => void) | null = null;
  private pidiendoDeVerdad: (() => void) | null = null;

  static boton(etiqueta: string): string {
    return `
      <button class="sonido teclas-boton" type="button" data-hud="tiempo-boton" aria-label="${etiqueta}">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.4 17.4 a4.4 4.4 0 0 1 0.5-8.8 a5.8 5.8 0 0 1 11.1 1.5
                   a3.7 3.7 0 0 1-0.6 7.3 Z" />
          <path d="M4 21.2 h6.4 M13 21.2 h7" />
        </svg>
      </button>
    `;
  }

  static markup(): string {
    return `
      <div class="tiempo" data-hud="tiempo" hidden role="group"
           aria-label="${t('tiempo.title')}">
        <div class="tiempo__caja">
        <svg class="tiempo__rosa" data-hud="tiempo-rosa" viewBox="-110 -110 220 220"
             role="application" aria-label="${t('tiempo.viento')}">
          <circle class="rosa__fondo" cx="0" cy="0" r="${RADIO}" />
          <circle class="rosa__anillo" cx="0" cy="0" r="${RADIO * 0.55}" />
          <!--
            Los cuatro rumbos, dibujados y no escritos. La N de norte es una
            letra, y aquí las letras no cuentan: el norte es la punta gorda.
          -->
          <path class="rosa__norte" d="M0 -${RADIO + 12} L7 -${RADIO - 2} L-7 -${RADIO - 2} Z" />
          <g class="rosa__cruz">
            <path d="M0 -${RADIO} v10 M0 ${RADIO} v-10 M-${RADIO} 0 h10 M${RADIO} 0 h-10" />
          </g>
          <!-- La flecha del viento: de dónde viene, apuntando al centro. -->
          <g class="rosa__viento" data-hud="tiempo-flecha">
            <path class="rosa__caña" d="M0 0 V-60" />
            <path class="rosa__punta" d="M0 -6 L9 -22 L-9 -22 Z" />
            <circle class="rosa__tirador" cx="0" cy="-60" r="13" />
          </g>
        </svg>
        <!--
          **El sol se arrastra por un círculo**, no por una barra ni por un
          reloj. El círculo es el cielo: arriba es mediodía, abajo medianoche, y
          la raya del medio es el horizonte. Eso lo entiende alguien de cuatro
          años porque es literalmente lo que ve todos los días — un reloj, no.
        -->
        <svg class="tiempo__sol" data-hud="tiempo-sol" viewBox="-110 -110 220 220"
             role="application" aria-label="${t('tiempo.hora')}">
          <path class="sol__noche" d="M-92 0 A92 92 0 0 0 92 0 Z" />
          <circle class="sol__orbita" cx="0" cy="0" r="92" />
          <path class="sol__horizonte" d="M-104 0 H104" />
          <g data-hud="tiempo-astro">
            <circle class="sol__halo" cx="0" cy="-92" r="26" />
            <circle class="sol__disco" cx="0" cy="-92" r="14" />
          </g>
        </svg>

        <div class="tiempo__botones">
          <button class="tiempo__boton" type="button" data-hud="tiempo-calma"
                  aria-label="${t('tiempo.calma')}">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 9.5 h13 a3 3 0 1 0-3-3" />
              <path d="M3 14.5 h15 a3.2 3.2 0 1 1-3.2 3.2" />
            </svg>
          </button>
          <button class="tiempo__boton" type="button" data-hud="tiempo-real"
                  aria-label="${t('tiempo.real')}">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.4 12a8.4 8.4 0 1 1-2.9-6.3" />
              <path d="M20.8 3.6 v5.2 h-5.2" />
            </svg>
          </button>
        </div>
        </div>
      </div>
    `;
  }

  bind(raiz: HTMLElement): void {
    this.raiz = raiz;
    this.caja = raiz.querySelector('[data-hud="tiempo"]');
    this.rosa = raiz.querySelector('[data-hud="tiempo-rosa"]');
    raiz.querySelector('[data-hud="tiempo-boton"]')?.addEventListener('click', () => this.alternar());
    // Tocando el fondo se cierra, igual que el mapa.
    this.caja?.addEventListener('pointerdown', (e) => {
      if (e.target === this.caja) this.cerrar();
    });
    raiz
      .querySelector('[data-hud="tiempo-calma"]')
      ?.addEventListener('click', () => this.aplicar(null, 0));
    raiz
      .querySelector('[data-hud="tiempo-real"]')
      ?.addEventListener('click', () => this.pidiendoDeVerdad?.());

    // Arrastrar en cualquier parte de la rosa, no solo en el tirador: un dedo
    // de cuatro años no acierta un círculo de trece píxeles.
    const mover = (e: PointerEvent): void => {
      if (!this.rosa) return;
      const r = this.rosa.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 220 - 110;
      const y = ((e.clientY - r.top) / r.height) * 220 - 110;
      const largo = Math.hypot(x, y);
      // Del centro no sale dirección ninguna, y eso es exactamente la calma.
      if (largo < 12) return this.aplicar(null, 0);
      const de = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
      const kt = Math.min(MAXIMO_KT, Math.round((largo / RADIO) * MAXIMO_KT));
      this.aplicar(Math.round(de), Math.max(1, kt));
    };
    this.rosa?.addEventListener('pointerdown', (e) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      mover(e);
    });
    this.rosa?.addEventListener('pointermove', (e) => {
      if (e.buttons) mover(e);
    });

    // El sol, igual: se agarra en cualquier parte del círculo.
    const arco = raiz.querySelector<SVGSVGElement>('[data-hud="tiempo-sol"]');
    const moverSol = (e: PointerEvent): void => {
      if (!arco) return;
      const r = arco.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 220 - 110;
      const y = ((e.clientY - r.top) / r.height) * 220 - 110;
      // Arriba es mediodía y se avanza hacia el oeste, que es como va el sol.
      const angulo = (Math.atan2(x, -y) * 180) / Math.PI;
      this.ponerHora(((angulo / 360) * 24 + 12 + 24) % 24);
    };
    arco?.addEventListener('pointerdown', (e) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      moverSol(e);
    });
    arco?.addEventListener('pointermove', (e) => {
      if (e.buttons) moverSol(e);
    });
  }

  private horaActual = 16;
  private alCambiarHora: ((h: number) => void) | null = null;

  /** Quién se entera de que ha cambiado la hora. */
  onHora(handler: (h: number) => void): void {
    this.alCambiarHora = handler;
  }

  /** Pone la hora sin avisar: es pintar, no cambiar. */
  ponerHoraSinAvisar(hora: number): void {
    this.horaActual = hora;
    this.pintarSol();
  }

  private ponerHora(hora: number): void {
    if (Math.abs(hora - this.horaActual) < 0.02) return;
    this.horaActual = hora;
    this.pintarSol();
    this.alCambiarHora?.(hora);
  }

  private pintarSol(): void {
    const astro = this.raiz?.querySelector<SVGGElement>('[data-hud="tiempo-astro"]');
    if (!astro) return;
    astro.setAttribute('transform', `rotate(${((this.horaActual - 12) / 24) * 360})`);
    // De noche el sol se apaga y queda la luna, que es el mismo disco más
    // pequeño y frío. Una luna aparte serían dos cosas que mantener sincronizadas.
    const deNoche = this.horaActual < 6 || this.horaActual > 18;
    astro.classList.toggle('sol--luna', deNoche);
  }

  /** Quién se entera de que ha cambiado el tiempo. */
  onCambio(handler: (m: Meteo) => void): void {
    this.alCambiar = handler;
  }

  /** Y quién vuelve a pedir el parte de verdad. */
  onDeVerdad(handler: () => void): void {
    this.pidiendoDeVerdad = handler;
  }

  /** Pone el tiempo que hay, sin avisar a nadie: es pintar, no cambiar. */
  poner(meteo: Meteo): void {
    this.meteo = meteo;
    this.pintar();
  }

  private alAbrir: (() => void) | null = null;

  /** A quién avisar al abrirse, para que se aparte. */
  onAbrir(handler: () => void): void {
    this.alAbrir = handler;
  }

  cerrar(): void {
    if (!this.caja || !this.abierto) return;
    this.abierto = false;
    this.caja.hidden = true;
  }

  alternar(): void {
    if (!this.caja) return;
    this.abierto = !this.abierto;
    this.caja.hidden = !this.abierto;
    if (this.abierto) this.alAbrir?.();
  }

  get visible(): boolean {
    return this.abierto;
  }

  get presente(): boolean {
    return this.raiz !== null && this.caja !== null;
  }

  private aplicar(de: number | null, kt: number): void {
    if (!this.meteo) return;
    if (this.meteo.vientoDe === de && this.meteo.vientoKt === kt) return;
    this.meteo = { ...this.meteo, vientoDe: de, vientoKt: kt, fuente: 'mano' };
    this.pintar();
    this.alCambiar?.(this.meteo);
  }

  private pintar(): void {
    const flecha = this.raiz?.querySelector<SVGGElement>('[data-hud="tiempo-flecha"]');
    if (!flecha || !this.meteo) return;
    const { vientoDe, vientoKt } = this.meteo;
    if (vientoDe === null || vientoKt === 0) {
      flecha.style.opacity = '0';
      return;
    }
    flecha.style.opacity = '1';
    // La caña se estira con la fuerza: la flecha larga es viento fuerte, y eso
    // se entiende sin que nadie lo explique.
    const largo = 26 + (Math.min(MAXIMO_KT, vientoKt) / MAXIMO_KT) * (RADIO - 26);
    flecha.setAttribute('transform', `rotate(${vientoDe})`);
    flecha.querySelector('.rosa__caña')?.setAttribute('d', `M0 0 V-${largo.toFixed(1)}`);
    flecha.querySelector('.rosa__tirador')?.setAttribute('cy', `-${largo.toFixed(1)}`);
  }
}
